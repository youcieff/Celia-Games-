import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import {
    getAdminAuth,
    getAdminDatabase,
    normalizeNickname,
    normalizePin,
    normalizeUsername,
    sanitizeHistory,
    sanitizeProfile,
    sendJson,
    usernameDatabaseKey,
    verifyBearerToken
} from '../server/firebaseAdmin.js';

const PIN_BYTES = 64;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 8;

function sanitizeStreak(value = {}) {
    return {
        currentStreak: Math.max(0, Math.min(1_000_000, Math.floor(Number(value.currentStreak) || 0))),
        maxStreak: Math.max(0, Math.min(1_000_000, Math.floor(Number(value.maxStreak) || 0)))
    };
}

function toAccountProfile(profile) {
    if (!profile) return null;
    return {
        uid: profile.uid,
        playerId: profile.uid,
        username: profile.username,
        nickname: profile.nickname,
        nicknameAliases: Array.isArray(profile.nicknameAliases) ? profile.nicknameAliases.slice(-20) : [],
        avatar: profile.avatar,
        xp: profile.xp || 0,
        wins: profile.wins || 0,
        gamesPlayed: profile.gamesPlayed || 0,
        currentStreak: profile.currentStreak || 0,
        maxStreak: profile.maxStreak || 0,
        createdAt: profile.createdAt || 0,
        lastSeenAt: profile.lastSeenAt || 0
    };
}

function toPublicProfile(profile) {
    const safe = toAccountProfile(profile);
    return safe && {
        uid: safe.uid,
        username: safe.username,
        nickname: safe.nickname,
        avatar: safe.avatar,
        xp: safe.xp,
        wins: safe.wins,
        gamesPlayed: safe.gamesPlayed,
        createdAt: safe.createdAt,
        lastSeenAt: safe.lastSeenAt
    };
}

async function logMissingAccountProfile(database, uid, username, action, diagnostics = {}) {
    let usernameIndexFound = false;
    let usernameIndexMatchesUid = null;
    let publicProfileFound = false;
    let accountSecretFound = false;
    if (typeof username === 'string' && username.trim()) {
        try {
            const usernameKey = usernameDatabaseKey(normalizeUsername(username));
            const indexedUid = (await database.ref(`usernameIndex/${usernameKey}`).get()).val();
            usernameIndexFound = typeof indexedUid === 'string';
            usernameIndexMatchesUid = indexedUid === uid;
        } catch {
            // Best effort only; never log a username or other user supplied value.
        }
    }
    try {
        const [publicProfile, accountSecret] = await Promise.all([
            database.ref(`publicProfiles/${uid}`).get(),
            database.ref(`accountSecrets/${uid}`).get()
        ]);
        publicProfileFound = publicProfile.exists();
        accountSecretFound = accountSecret.exists();
    } catch {
        // Keep diagnostics best effort and limited to existence flags.
    }
    console.warn('[account-api] authenticated profile is missing', {
        action,
        uidHash: createHash('sha256').update(uid).digest('hex').slice(0, 12),
        usernameIndexFound,
        usernameIndexMatchesUid,
        publicProfileFound,
        accountSecretFound,
        recoveryReason: diagnostics.recoveryReason || 'unknown',
        recoveryProfileAvailable: Boolean(diagnostics.recoveryProfileAvailable),
        transactionCommitted: Boolean(diagnostics.transactionCommitted),
        transactionProfileExists: Boolean(diagnostics.transactionProfileExists)
    });
}

async function readRestorableAccountProfile(database, uid, incoming) {
    if (typeof incoming.username !== 'string' || !incoming.username.trim()) {
        return { profile: null, reason: 'username_missing' };
    }
    let username;
    try {
        username = normalizeUsername(incoming.username);
    } catch {
        return { profile: null, reason: 'username_invalid' };
    }
    const usernameKey = usernameDatabaseKey(username);
    const [indexSnapshot, publicSnapshot, historySnapshot, streakSnapshot] = await Promise.all([
        database.ref(`usernameIndex/${usernameKey}`).get(),
        database.ref(`publicProfiles/${uid}`).get(),
        database.ref(`matchHistory/${uid}`).get(),
        database.ref(`winStreaks/${uid}`).get()
    ]);
    if (indexSnapshot.val() !== uid) return { profile: null, reason: 'username_index_mismatch' };
    if (!publicSnapshot.exists()) return { profile: null, reason: 'public_profile_missing' };

    const publicProfile = publicSnapshot.val() || {};
    const history = Array.isArray(historySnapshot.val()) ? historySnapshot.val() : [];
    const streak = streakSnapshot.val() || {};
    const restoredProfile = sanitizeProfile({
        ...publicProfile,
        nicknameAliases: [
            ...(Array.isArray(publicProfile.nicknameAliases) ? publicProfile.nicknameAliases : []),
            ...(Array.isArray(incoming.nicknameAliases) ? incoming.nicknameAliases : []),
            publicProfile.nickname
        ]
    }, username, uid);
    const profile = {
        ...restoredProfile,
        createdAt: Math.max(0, Number(publicProfile.createdAt) || Date.now()),
        lastSeenAt: Math.max(0, Number(publicProfile.lastSeenAt) || 0),
        usernameKey,
        recentMatchIds: history.map(match => match?.id).filter(id => typeof id === 'string').slice(-500),
        currentStreak: Math.max(0, Number(streak.currentStreak) || 0),
        maxStreak: Math.max(0, Number(streak.maxStreak) || 0)
    };
    return { profile, reason: 'ready' };
}

async function checkLoginRateLimit(database, usernameKey) {
    const attemptRef = database.ref(`accountRateLimits/${usernameKey}`);
    const now = Date.now();
    const transaction = await attemptRef.transaction(current => {
        const previous = current && typeof current === 'object' ? current : {};
        const inWindow = now - Number(previous.windowStartedAt || 0) < LOGIN_WINDOW_MS;
        const attempts = inWindow ? Number(previous.attempts || 0) : 0;
        if (Number(previous.blockedUntil || 0) > now) return previous;
        const nextAttempts = attempts + 1;
        return {
            windowStartedAt: inWindow ? previous.windowStartedAt : now,
            attempts: nextAttempts,
            blockedUntil: nextAttempts >= MAX_LOGIN_ATTEMPTS ? now + LOGIN_WINDOW_MS : 0
        };
    }, undefined, false);

    const current = transaction.snapshot.val();
    if (Number(current?.blockedUntil || 0) > now) {
        const seconds = Math.ceil((current.blockedUntil - now) / 1000);
        const error = new Error(`محاولات كثيرة. جرّب بعد ${seconds} ثانية`);
        error.status = 429;
        throw error;
    }
}

async function clearLoginRateLimit(database, usernameKey) {
    await database.ref(`accountRateLimits/${usernameKey}`).remove();
}

async function issueToken(uid) {
    return getAdminAuth().createCustomToken(uid);
}

async function login(username, rawPin) {
    const normalized = normalizeUsername(username);
    const usernameKey = usernameDatabaseKey(normalized);
    const pin = normalizePin(rawPin);
    const database = getAdminDatabase();
    await checkLoginRateLimit(database, usernameKey);

    const uidSnapshot = await database.ref(`usernameIndex/${usernameKey}`).get();
    const uid = uidSnapshot.val();
    const genericError = new Error('اسم المستخدم أو PIN غير صحيح');
    genericError.status = 401;
    if (typeof uid !== 'string') throw genericError;

    const [secretSnapshot, profileSnapshot, historySnapshot, streakSnapshot] = await Promise.all([
        database.ref(`accountSecrets/${uid}`).get(),
        database.ref(`users/${uid}`).get(),
        database.ref(`matchHistory/${uid}`).get(),
        database.ref(`winStreaks/${uid}`).get()
    ]);
    const secret = secretSnapshot.val();
    if (!secret?.salt || !secret?.pinHash) throw genericError;

    const actualHash = scryptSync(pin, Buffer.from(secret.salt, 'hex'), PIN_BYTES);
    const expectedHash = Buffer.from(secret.pinHash, 'hex');
    if (actualHash.length !== expectedHash.length || !timingSafeEqual(actualHash, expectedHash)) throw genericError;

    await clearLoginRateLimit(database, usernameKey);
    const existingProfile = profileSnapshot.val();
    if (!existingProfile) throw genericError;
    const lastSeenAt = Math.max(Date.now(), (Number(existingProfile.lastSeenAt) || 0) + 1);
    await database.ref().update({
        [`users/${uid}/lastSeenAt`]: lastSeenAt,
        [`publicProfiles/${uid}/lastSeenAt`]: lastSeenAt
    });
    const profile = { ...existingProfile, lastSeenAt };

    return {
        token: await issueToken(uid),
        profile: toAccountProfile(profile),
        history: historySnapshot.val() || [],
        streak: streakSnapshot.val() || { currentStreak: 0, maxStreak: 0 }
    };
}

async function register(body) {
    const normalized = normalizeUsername(body.username);
    const usernameKey = usernameDatabaseKey(normalized);
    const pin = normalizePin(body.pin);
    const database = getAdminDatabase();
    const uid = randomUUID().replaceAll('-', '');
    const usernameRef = database.ref(`usernameIndex/${usernameKey}`);
    const reservation = await usernameRef.transaction(current => current == null ? uid : undefined, undefined, false);
    if (!reservation.committed) {
        const error = new Error('الاسم مستخدم بالفعل. اختار اسمًا تانيًا أو سجّل الدخول');
        error.status = 409;
        throw error;
    }

    const salt = randomBytes(16);
    const pinHash = scryptSync(pin, salt, PIN_BYTES).toString('hex');
    const sourceProfile = body.profile && typeof body.profile === 'object' ? body.profile : {};
    const profile = {
        ...sanitizeProfile(sourceProfile, normalized, uid),
        createdAt: Date.now(),
        lastSeenAt: Date.now(),
        usernameKey,
        recentMatchIds: []
    };
    const history = sanitizeHistory(body.history);
    const streak = sanitizeStreak(body.streak);
    profile.currentStreak = streak.currentStreak;
    profile.maxStreak = streak.maxStreak;
    let authUserCreated = false;

    try {
        await getAdminAuth().createUser({ uid, displayName: profile.nickname });
        authUserCreated = true;
        await database.ref().update({
            [`users/${uid}`]: profile,
            [`publicProfiles/${uid}`]: toPublicProfile(profile),
            [`accountSecrets/${uid}`]: { salt: salt.toString('hex'), pinHash },
            [`matchHistory/${uid}`]: history.length ? history : null,
            [`winStreaks/${uid}`]: streak
        });
    } catch (error) {
        await usernameRef.transaction(current => current === uid ? null : current, undefined, false).catch(() => {});
        if (authUserCreated) await getAdminAuth().deleteUser(uid).catch(() => {});
        throw error;
    }

    return {
        token: await issueToken(uid),
        profile: toAccountProfile(profile),
        history,
        streak
    };
}

async function syncAccount(req, body) {
    const identity = await verifyBearerToken(req);
    const database = getAdminDatabase();
    const userRef = database.ref(`users/${identity.uid}`);
    const incoming = body.profile && typeof body.profile === 'object' ? body.profile : {};
    let registrationNickname = '';
    try {
        registrationNickname = String((await getAdminAuth().getUser(identity.uid)).displayName || '').trim();
    } catch {
        // The profile update remains available if the Auth display name cannot be read.
    }
    const incomingProfile = {
        ...incoming,
        nicknameAliases: [
            ...(Array.isArray(incoming.nicknameAliases) ? incoming.nicknameAliases : []),
            registrationNickname
        ]
    };
    const recovery = await readRestorableAccountProfile(database, identity.uid, incomingProfile);
    const updateProfile = current => {
        const source = current || recovery.profile;
        if (!source) return;
        const safeIncoming = sanitizeProfile(incomingProfile, source.username, identity.uid);
        const nextNickname = normalizeNickname(incomingProfile.nickname, source.username);
        const previousNickname = normalizeNickname(source.nickname, source.username);
        const nicknameAliases = sanitizeProfile({
            nickname: nextNickname,
            nicknameAliases: [
                ...(Array.isArray(source.nicknameAliases) ? source.nicknameAliases : []),
                ...(safeIncoming.nicknameAliases || []),
                previousNickname
            ]
        }, source.username, identity.uid).nicknameAliases;
        return {
            ...source,
            nickname: nextNickname,
            nicknameAliases,
            avatar: safeIncoming.avatar,
            lastSeenAt: Math.max(Date.now(), (Number(source.lastSeenAt) || 0) + 1)
        };
    };
    const transaction = await userRef.transaction(updateProfile, undefined, false);
    const profile = transaction.snapshot.val();
    if (!transaction.committed || !profile) {
        await logMissingAccountProfile(database, identity.uid, incoming.username, 'sync', {
            recoveryReason: recovery.reason,
            recoveryProfileAvailable: Boolean(recovery.profile),
            transactionCommitted: transaction.committed,
            transactionProfileExists: Boolean(profile)
        });
        const error = new Error('الحساب غير موجود');
        error.status = 404;
        throw error;
    }
    const [historySnapshot, streakSnapshot] = await Promise.all([
        database.ref(`matchHistory/${identity.uid}`).get(),
        database.ref(`winStreaks/${identity.uid}`).get()
    ]);
    const history = historySnapshot.val() || [];
    const streak = streakSnapshot.val() || { currentStreak: profile.currentStreak || 0, maxStreak: profile.maxStreak || 0 };
    await database.ref(`publicProfiles/${identity.uid}`).set(toPublicProfile(profile));
    return { profile: toAccountProfile(profile), history, streak };
}

async function recordAccountMatch(req, body) {
    const identity = await verifyBearerToken(req);
    if (!body.match || typeof body.match.id !== 'string') {
        const error = new Error('بيانات المباراة غير صالحة');
        error.status = 400;
        throw error;
    }
    const match = sanitizeHistory([body.match])[0];
    if (!match?.id || !/^[A-Za-z0-9_-]{1,80}$/.test(match.id)) {
        const error = new Error('بيانات المباراة غير صالحة');
        error.status = 400;
        throw error;
    }
    const outcome = ['win', 'loss', 'draw'].includes(body.outcome) ? body.outcome : null;
    if (!outcome) {
        const error = new Error('نتيجة المباراة غير صالحة');
        error.status = 400;
        throw error;
    }
    match.isWin = outcome === 'win';
    match.outcome = outcome;
    const xp = Math.max(0, Math.min(1000, Math.floor(Number(body.xp) || 0)));
    const database = getAdminDatabase();
    const userRef = database.ref(`users/${identity.uid}`);
    let duplicate = false;
    const transaction = await userRef.transaction(current => {
        if (!current) return;
        const recentIds = Array.isArray(current.recentMatchIds) ? current.recentMatchIds : [];
        duplicate = recentIds.includes(match.id);
        if (duplicate) return current;
        const currentStreak = outcome === 'win' ? (Number(current.currentStreak) || 0) + 1 : 0;
        return {
            ...current,
            xp: Math.min(1_000_000, (Number(current.xp) || 0) + xp),
            wins: Math.min(1_000_000, (Number(current.wins) || 0) + (outcome === 'win' ? 1 : 0)),
            gamesPlayed: Math.min(1_000_000, (Number(current.gamesPlayed) || 0) + 1),
            currentStreak,
            maxStreak: Math.max(Number(current.maxStreak) || 0, currentStreak),
            recentMatchIds: [...recentIds, match.id].slice(-500),
            lastSeenAt: Math.max(Date.now(), (Number(current.lastSeenAt) || 0) + 1)
        };
    }, undefined, false);
    const profile = transaction.snapshot.val();
    if (!transaction.committed || !profile) {
        const error = new Error('الحساب غير موجود');
        error.status = 404;
        throw error;
    }

    const historyRef = database.ref(`matchHistory/${identity.uid}`);
    let history = [];
    await historyRef.transaction(current => {
        const entries = Array.isArray(current) ? current : [];
        const byId = new Map(entries.map(item => [item.id, item]));
        if (!byId.has(match.id)) byId.set(match.id, match);
        history = [...byId.values()].sort((a, b) => b.timestamp - a.timestamp).slice(0, 25);
        return history;
    }, undefined, false);
    const streak = { currentStreak: profile.currentStreak || 0, maxStreak: profile.maxStreak || 0 };
    await database.ref().update({
        [`publicProfiles/${identity.uid}`]: toPublicProfile(profile),
        [`winStreaks/${identity.uid}`]: streak
    });
    return { profile: toAccountProfile(profile), history, streak };
}

export default async function handler(req, res) {
    try {
        if (req.method === 'GET') {
            const identity = await verifyBearerToken(req);
            const database = getAdminDatabase();
            const [profile, history, streak] = await Promise.all([
                database.ref(`users/${identity.uid}`).get(),
                database.ref(`matchHistory/${identity.uid}`).get(),
                database.ref(`winStreaks/${identity.uid}`).get()
            ]);
            if (!profile.exists()) return sendJson(res, 404, { error: 'الحساب غير موجود' });
            const lastSeenAt = Math.max(Date.now(), (Number(profile.val().lastSeenAt) || 0) + 1);
            await database.ref().update({
                [`users/${identity.uid}/lastSeenAt`]: lastSeenAt,
                [`publicProfiles/${identity.uid}/lastSeenAt`]: lastSeenAt
            });
            const currentProfile = { ...profile.val(), lastSeenAt };
            return sendJson(res, 200, {
                profile: toAccountProfile(currentProfile),
                history: history.val() || [],
                streak: streak.val() || { currentStreak: 0, maxStreak: 0 }
            });
        }

        if (req.method !== 'POST') return sendJson(res, 405, { error: 'طريقة الطلب غير مدعومة' });
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        if (body.action === 'register') return sendJson(res, 201, await register(body));
        if (body.action === 'login') return sendJson(res, 200, await login(body.username, body.pin));
        if (body.action === 'sync') return sendJson(res, 200, await syncAccount(req, body));
        if (body.action === 'record_match') return sendJson(res, 200, await recordAccountMatch(req, body));
        return sendJson(res, 400, { error: 'طلب غير صالح' });
    } catch (error) {
        const status = Number(error.status) || (error.message?.includes('FIREBASE_SERVICE_ACCOUNT_JSON') ? 503 : 500);
        return sendJson(res, status, { error: status >= 500 ? 'تعذر إتمام الطلب؛ راجع إعدادات الخادم' : error.message });
    }
}
