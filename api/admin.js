import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import {
    getAdminAuth,
    getAdminDatabase,
    sendJson
} from '../server/firebaseAdmin.js';

const COOKIE_NAME = 'celia_admin_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const ADMIN_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_ADMIN_ATTEMPTS = 6;

function signature(payload) {
    const secret = process.env.CELIA_ADMIN_SESSION_SECRET;
    if (!secret || secret.length < 32) throw new Error('CELIA_ADMIN_SESSION_SECRET must contain at least 32 characters');
    return createHmac('sha256', secret).update(payload).digest('base64url');
}

function buildCookie(value, maxAge) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    return `${COOKIE_NAME}=${value}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=${maxAge}${secure}`;
}

function cookieValue(req) {
    const cookies = String(req.headers.cookie || '').split(';');
    const entry = cookies.map(value => value.trim()).find(value => value.startsWith(`${COOKIE_NAME}=`));
    return entry ? decodeURIComponent(entry.slice(COOKIE_NAME.length + 1)) : '';
}

function isAdmin(req) {
    const [expiresAt, suppliedSignature] = cookieValue(req).split('.');
    if (!expiresAt || !suppliedSignature || Number(expiresAt) < Date.now()) return false;
    const expected = Buffer.from(signature(expiresAt));
    const supplied = Buffer.from(suppliedSignature);
    return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

function requireAdmin(req, res) {
    if (isAdmin(req)) return true;
    sendJson(res, 401, { error: 'سجّل دخول الإدارة الأول' });
    return false;
}

async function checkAdminLoginLimit(req) {
    const ipAddress = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    const clientKey = createHash('sha256').update(ipAddress).digest('hex').slice(0, 32);
    const ref = getAdminDatabase().ref(`adminLoginLimits/${clientKey}`);
    const now = Date.now();
    const result = await ref.transaction(current => {
        const previous = current && typeof current === 'object' ? current : {};
        const inWindow = now - Number(previous.windowStartedAt || 0) < ADMIN_LOGIN_WINDOW_MS;
        if (Number(previous.blockedUntil || 0) > now) return previous;
        const attempts = (inWindow ? Number(previous.attempts || 0) : 0) + 1;
        return {
            windowStartedAt: inWindow ? previous.windowStartedAt : now,
            attempts,
            blockedUntil: attempts >= MAX_ADMIN_ATTEMPTS ? now + ADMIN_LOGIN_WINDOW_MS : 0
        };
    }, undefined, false);
    const current = result.snapshot.val();
    if (Number(current?.blockedUntil || 0) > now) {
        const error = new Error('محاولات كثيرة. جرّب بعد 15 دقيقة');
        error.status = 429;
        throw error;
    }
}

function safeUser(uid, profile) {
    return {
        uid,
        username: profile.username || '',
        nickname: profile.nickname || '',
        avatar: profile.avatar || 'cool',
        xp: Number(profile.xp) || 0,
        wins: Number(profile.wins) || 0,
        gamesPlayed: Number(profile.gamesPlayed) || 0,
        createdAt: Number(profile.createdAt) || 0,
        lastSeenAt: Number(profile.lastSeenAt) || 0
    };
}

async function listUsers() {
    const snapshot = await getAdminDatabase().ref('users').get();
    const users = snapshot.val() || {};
    return Object.entries(users)
        .map(([uid, profile]) => safeUser(uid, profile || {}))
        .sort((a, b) => b.lastSeenAt - a.lastSeenAt);
}

async function getUserDetails(uid) {
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(uid)) {
        const error = new Error('معرّف المستخدم غير صالح');
        error.status = 400;
        throw error;
    }
    const database = getAdminDatabase();
    const [profileSnapshot, historySnapshot, streakSnapshot] = await Promise.all([
        database.ref(`users/${uid}`).get(),
        database.ref(`matchHistory/${uid}`).get(),
        database.ref(`winStreaks/${uid}`).get()
    ]);
    if (!profileSnapshot.exists()) {
        const error = new Error('المستخدم غير موجود');
        error.status = 404;
        throw error;
    }
    const profile = profileSnapshot.val();
    return {
        user: safeUser(uid, profile),
        history: Array.isArray(historySnapshot.val()) ? historySnapshot.val() : [],
        streak: streakSnapshot.val() || { currentStreak: 0, maxStreak: 0 }
    };
}

async function deleteUser(uid) {
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(uid)) {
        const error = new Error('معرّف المستخدم غير صالح');
        error.status = 400;
        throw error;
    }

    const database = getAdminDatabase();
    const [profileSnapshot, friends, requests, outgoingRequests, invites, outgoingInvites] = await Promise.all([
        database.ref(`users/${uid}`).get(),
        database.ref(`friends/${uid}`).get(),
        database.ref(`friendRequests/${uid}`).get(),
        database.ref(`outgoingFriendRequests/${uid}`).get(),
        database.ref(`gameInvites/${uid}`).get(),
        database.ref(`outgoingGameInvites/${uid}`).get()
    ]);
    if (!profileSnapshot.exists()) {
        const error = new Error('المستخدم غير موجود');
        error.status = 404;
        throw error;
    }
    const profile = profileSnapshot.val();
    const updates = {
        [`users/${uid}`]: null,
        [`publicProfiles/${uid}`]: null,
        [`accountSecrets/${uid}`]: null,
        [`matchHistory/${uid}`]: null,
        [`winStreaks/${uid}`]: null,
        [`friends/${uid}`]: null,
        [`friendRequests/${uid}`]: null,
        [`outgoingFriendRequests/${uid}`]: null,
        [`gameInvites/${uid}`]: null,
        [`outgoingGameInvites/${uid}`]: null
    };
    Object.keys(friends.val() || {}).forEach(friendUid => { updates[`friends/${friendUid}/${uid}`] = null; });
    Object.keys(requests.val() || {}).forEach(fromUid => { updates[`outgoingFriendRequests/${fromUid}/${uid}`] = null; });
    Object.keys(outgoingRequests.val() || {}).forEach(targetUid => { updates[`friendRequests/${targetUid}/${uid}`] = null; });
    Object.entries(invites.val() || {}).forEach(([inviteId, invite]) => {
        if (invite?.fromUid) updates[`outgoingGameInvites/${invite.fromUid}/${inviteId}`] = null;
    });
    Object.entries(outgoingInvites.val() || {}).forEach(([inviteId, invite]) => {
        if (invite?.toUid) updates[`gameInvites/${invite.toUid}/${inviteId}`] = null;
    });
    if (profile.usernameKey) {
        updates[`usernameIndex/${profile.usernameKey}`] = null;
        updates[`accountRateLimits/${profile.usernameKey}`] = null;
    }
    await getAdminAuth().deleteUser(uid).catch(error => {
        if (error.code !== 'auth/user-not-found') throw error;
    });
    await database.ref().update(updates);
}

export default async function handler(req, res) {
    try {
        if (req.method === 'POST') {
            const body = req.body && typeof req.body === 'object' ? req.body : {};
            if (body.action === 'logout') {
                res.setHeader('Set-Cookie', buildCookie('', 0));
                return sendJson(res, 200, { ok: true });
            }
            if (body.action !== 'login') return sendJson(res, 400, { error: 'طلب غير صالح' });
            if (!process.env.CELIA_ADMIN_SESSION_SECRET || process.env.CELIA_ADMIN_SESSION_SECRET.length < 32) {
                return sendJson(res, 503, { error: 'إعداد جلسة الإدارة ناقص على الخادم' });
            }
            const expectedPassword = process.env.CELIA_ADMIN_PASSWORD;
            if (!expectedPassword) return sendJson(res, 503, { error: 'إعداد كلمة مرور الإدارة ناقص على الخادم' });
            await checkAdminLoginLimit(req);
            const supplied = Buffer.from(String(body.password || ''));
            const expected = Buffer.from(expectedPassword);
            const valid = supplied.length === expected.length && timingSafeEqual(supplied, expected);
            if (!valid) return sendJson(res, 401, { error: 'كلمة المرور غير صحيحة' });
            const ipAddress = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
            const clientKey = createHash('sha256').update(ipAddress).digest('hex').slice(0, 32);
            await getAdminDatabase().ref(`adminLoginLimits/${clientKey}`).remove();

            const expiresAt = String(Date.now() + SESSION_TTL_MS);
            res.setHeader('Set-Cookie', buildCookie(`${expiresAt}.${signature(expiresAt)}`, SESSION_TTL_MS / 1000));
            return sendJson(res, 200, { ok: true });
        }

        if (!requireAdmin(req, res)) return;
        if (req.method === 'GET') {
            const uid = String(req.query?.uid || '');
            if (uid) return sendJson(res, 200, await getUserDetails(uid));
            return sendJson(res, 200, { users: await listUsers() });
        }
        if (req.method === 'DELETE') {
            const body = req.body && typeof req.body === 'object' ? req.body : {};
            await deleteUser(String(body.uid || ''));
            return sendJson(res, 200, { ok: true });
        }
        if (req.method === 'OPTIONS') return res.status(204).end();
        return sendJson(res, 405, { error: 'طريقة الطلب غير مدعومة' });
    } catch (error) {
        const status = Number(error.status) || (/FIREBASE_SERVICE_ACCOUNT_JSON|CELIA_ADMIN_SESSION_SECRET/.test(error.message || '') ? 503 : 500);
        return sendJson(res, status, { error: status >= 500 ? 'تعذر إتمام الطلب؛ راجع إعدادات الخادم' : error.message });
    }
}
