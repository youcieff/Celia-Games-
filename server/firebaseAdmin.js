import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { getMessaging } from 'firebase-admin/messaging';

const DEFAULT_DATABASE_URL = 'https://celia-games-9ed83-default-rtdb.europe-west1.firebasedatabase.app';

function readServiceAccount() {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured');

    const account = JSON.parse(raw);
    if (account.private_key) account.private_key = account.private_key.replace(/\\n/g, '\n');
    return account;
}

function getFirebaseAdminApp() {
    const existing = getApps()[0];
    if (existing) return existing;

    return initializeApp({
        credential: cert(readServiceAccount()),
        databaseURL: process.env.FIREBASE_DATABASE_URL || DEFAULT_DATABASE_URL
    });
}

export function getAdminAuth() {
    return getAuth(getFirebaseAdminApp());
}

export function getAdminDatabase() {
    return getDatabase(getFirebaseAdminApp());
}

export function getAdminMessaging() {
    return getMessaging(getFirebaseAdminApp());
}

export function normalizeUsername(value) {
    const username = String(value || '')
        .normalize('NFKC')
        .trim()
        .replace(/\s+/gu, ' ')
        .toLocaleLowerCase('ar');
    const length = [...username].length;

    if (length < 3 || length > 20 || !/^[\p{L}\p{N}_ -]+$/u.test(username)) {
        const error = new Error('اسم المستخدم لازم يكون من 3 إلى 20 حرفًا أو رقمًا');
        error.status = 400;
        throw error;
    }
    return username;
}

export function usernameDatabaseKey(username) {
    return Buffer.from(normalizeUsername(username), 'utf8').toString('base64url');
}

export function normalizePin(value) {
    const pin = String(value || '').replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
    if (!/^\d{6,8}$/.test(pin)) {
        const error = new Error('الـ PIN لازم يكون من 6 إلى 8 أرقام');
        error.status = 400;
        throw error;
    }
    return pin;
}

export function normalizeNickname(value, fallback) {
    const nickname = String(value || fallback || '').trim().slice(0, 24);
    return nickname || 'لاعب';
}

export function sanitizeProfile(input = {}, username, uid) {
    const asCount = value => Math.max(0, Math.min(1_000_000, Math.floor(Number(value) || 0)));
    const allowedAvatars = new Set(['cool', 'lion', 'queen', 'panda', 'cherry', 'rose', 'robot', 'alien', 'rocket', 'star', 'tiger', 'fire']);
    const avatar = String(input.avatar || 'cool');
    const nickname = normalizeNickname(input.nickname, username);
    const nicknameAliases = [];
    const seenAliases = new Set([nickname.normalize('NFKC').toLocaleLowerCase('ar')]);
    for (const value of Array.isArray(input.nicknameAliases) ? input.nicknameAliases.slice(-20) : []) {
        const alias = String(value || '').trim().slice(0, 24);
        const key = alias.normalize('NFKC').toLocaleLowerCase('ar');
        if (!alias || seenAliases.has(key)) continue;
        seenAliases.add(key);
        nicknameAliases.push(alias);
    }

    return {
        uid,
        playerId: uid,
        username,
        nickname,
        nicknameAliases,
        avatar: allowedAvatars.has(avatar) ? avatar : 'cool',
        xp: asCount(input.xp),
        wins: asCount(input.wins),
        gamesPlayed: asCount(input.gamesPlayed)
    };
}

export function sanitizeHistory(value) {
    if (!Array.isArray(value)) return [];
    return value.slice(0, 25).map((item, index) => ({
        id: String(item?.id || `m_${Date.now()}_${index}`).slice(0, 80),
        gameId: String(item?.gameId || '').slice(0, 60),
        gameTitle: String(item?.gameTitle || 'لعبة').slice(0, 80),
        oppName: String(item?.oppName || 'خصم').slice(0, 40),
        oppAvatar: String(item?.oppAvatar || 'cool').slice(0, 40),
        ...(typeof item?.oppId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(item.oppId) ? { oppId: item.oppId } : {}),
        ...(typeof item?.oppUid === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(item.oppUid) ? { oppUid: item.oppUid } : {}),
        ...(Array.isArray(item?.oppAliases) ? { oppAliases: [...new Set(item.oppAliases.map(alias => String(alias || '').trim().slice(0, 24)).filter(Boolean))].slice(-20) } : {}),
        isWin: Boolean(item?.isWin),
        outcome: ['win', 'loss', 'draw'].includes(item?.outcome) ? item.outcome : (item?.isWin ? 'win' : 'loss'),
        myScore: Math.max(0, Math.min(1_000_000, Math.floor(Number(item?.myScore) || 0))),
        oppScore: Math.max(0, Math.min(1_000_000, Math.floor(Number(item?.oppScore) || 0))),
        isAI: Boolean(item?.isAI),
        xpEarned: Math.max(0, Math.min(1000, Math.floor(Number(item?.xpEarned) || 0))),
        timestamp: Math.max(0, Math.min(Date.now() + 60_000, Number(item?.timestamp) || Date.now()))
    }));
}

export function sendJson(res, status, body) {
    res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(body));
}

export async function verifyBearerToken(req) {
    const authorization = String(req.headers.authorization || '');
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) {
        const error = new Error('سجّل الدخول إلى حسابك أولًا');
        error.status = 401;
        throw error;
    }
    try {
        return await getAdminAuth().verifyIdToken(match[1], true);
    } catch {
        const error = new Error('جلسة الحساب انتهت؛ سجّل الدخول مرة أخرى');
        error.status = 401;
        throw error;
    }
}
