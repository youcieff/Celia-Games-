import { createHash } from 'node:crypto';
import {
    getAdminDatabase,
    getAdminMessaging,
    normalizeUsername,
    sendJson,
    usernameDatabaseKey,
    verifyBearerToken
} from '../server/firebaseAdmin.js';

const GAME_TITLES = {
    'celia-code': 'خمن الكود',
    'celia-word': 'خمن الكلمة',
    'celia-xo': 'إكس أو',
    'celia-uxo': 'إكس أو الكبيرة',
    'celia-c4': 'كونكت 4',
    'celia-mem': 'الذاكرة',
    'celia-db': 'النقاط والمربعات',
    'celia-sea': 'معركة البحر',
    'celia-time': 'خمن الوقت',
    'celia-bus': 'باص كامل',
    'celia-trivia': 'تحدي المعلومات',
    'celia-domino': 'الدومينو',
    'celia-rps': 'حلبة حجر ورقة مقص',
    'celia-hockey': 'الهوكي الهوائي',
    'celia-draw': 'ارسم وخمن',
    'celia-snake': 'ساحة الأفعى',
    'celia-brick': 'كاسر الطوب',
    'celia-math': 'تحدي الرياضيات',
    'celia-sudoku': 'سودوكو السرعة',
    'celia-whoami': 'أنا مين',
    'celia-whoami-together': 'أنا مين سوا',
    'celia-taboo': 'الكلمة الممنوعة',
    'celia-taboo-together': 'الكلمة الممنوعة سوا'
};
const SOCIAL_RATE_WINDOW_MS = 60 * 60 * 1000;
const PRESENCE_ACTIVITY_TTL_MS = 75_000;

function notificationTokenKey(token) {
    return createHash('sha256').update(token).digest('hex');
}

async function registerNotificationToken(database, uid, body) {
    const token = String(body.token || '').trim();
    if (token.length < 20 || token.length > 4096 || /\s/.test(token)) throw fail(400, 'ØªØ¹Ø°Ø± ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ù„Ù‡Ø°Ø§ Ø§Ù„Ø¬Ù‡Ø§Ø²');
    const key = notificationTokenKey(token);
    await database.ref(`notificationTokens/${uid}/${key}`).set({ token, updatedAt: Date.now() });
    return { ok: true };
}

async function removeNotificationToken(database, uid, body) {
    const token = String(body.token || '').trim();
    if (token.length < 20 || token.length > 4096 || /\s/.test(token)) return { ok: true };
    await database.ref(`notificationTokens/${uid}/${notificationTokenKey(token)}`).remove();
    return { ok: true };
}

async function deliverPushNotification(database, uid, { title, body, type, notificationId, url = '/' }) {
    try {
        const snapshot = await database.ref(`notificationTokens/${uid}`).get();
        const tokens = Object.values(snapshot.val() || {})
            .map(value => String(value?.token || ''))
            .filter(token => token.length >= 20 && token.length <= 4096)
            .slice(-30);
        if (!tokens.length) return;

        const messaging = getAdminMessaging();
        await Promise.all(tokens.map(async token => {
            try {
                await messaging.send({
                    token,
                    data: {
                        title: String(title || 'إشعار جديد').slice(0, 80),
                        body: String(body || '').slice(0, 180),
                        type: String(type || 'social').slice(0, 30),
                        notificationId: String(notificationId || '').slice(0, 120),
                        url: String(url || '/').slice(0, 500)
                    },
                    webpush: { headers: { TTL: '86400' } }
                });
            } catch (error) {
                if (['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(error.code)) {
                    await database.ref(`notificationTokens/${uid}/${notificationTokenKey(token)}`).remove().catch(() => {});
                } else {
                    console.warn('[social-api] push delivery failed', { code: String(error.code || '').slice(0, 80) });
                }
            }
        }));
    } catch (error) {
        console.warn('[social-api] push delivery unavailable', { code: String(error.code || '').slice(0, 80) });
    }
}

async function applyRateLimit(database, uid, action, maximum) {
    const now = Date.now();
    const ref = database.ref(`socialRateLimits/${uid}/${action}`);
    const result = await ref.transaction(current => {
        const previous = current && typeof current === 'object' ? current : {};
        const inWindow = now - Number(previous.windowStartedAt || 0) < SOCIAL_RATE_WINDOW_MS;
        if (Number(previous.blockedUntil || 0) > now) return previous;
        const attempts = (inWindow ? Number(previous.attempts || 0) : 0) + 1;
        return {
            windowStartedAt: inWindow ? previous.windowStartedAt : now,
            attempts,
            blockedUntil: attempts > maximum ? now + SOCIAL_RATE_WINDOW_MS : 0
        };
    }, undefined, false);
    const current = result.snapshot.val();
    if (Number(current?.blockedUntil || 0) > now) throw fail(429, 'طلبات كتير في وقت قصير؛ جرّب تاني بعد شوية');
}

function fail(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function publicProfile(uid, value = {}) {
    return {
        uid,
        username: String(value.username || '').slice(0, 20),
        nickname: String(value.nickname || value.username || 'لاعب').slice(0, 24),
        avatar: String(value.avatar || 'cool').slice(0, 24),
        xp: Math.max(0, Number(value.xp) || 0),
        wins: Math.max(0, Number(value.wins) || 0),
        gamesPlayed: Math.max(0, Number(value.gamesPlayed) || 0)
    };
}

async function getSocialData(database, uid) {
    const [friendsSnapshot, requestsSnapshot, invitesSnapshot] = await Promise.all([
        database.ref(`friends/${uid}`).get(),
        database.ref(`friendRequests/${uid}`).get(),
        database.ref(`gameInvites/${uid}`).get()
    ]);
    const friendIds = Object.keys(friendsSnapshot.val() || {});
    const [friendSnapshots, requestSnapshots] = await Promise.all([
        Promise.all(friendIds.map(friendUid => database.ref(`publicProfiles/${friendUid}`).get())),
        Promise.all(Object.keys(requestsSnapshot.val() || {}).map(fromUid => database.ref(`publicProfiles/${fromUid}`).get()))
    ]);
    const friends = friendIds.map((friendUid, index) => publicProfile(friendUid, friendSnapshots[index].val() || {}));
    const requests = Object.keys(requestsSnapshot.val() || {}).map((fromUid, index) => ({
        ...publicProfile(fromUid, requestSnapshots[index].val() || {}),
        createdAt: Number(requestsSnapshot.val()[fromUid]?.createdAt) || 0
    }));
    const invites = Object.entries(invitesSnapshot.val() || {})
        .map(([id, invite]) => ({ id, ...(invite || {}) }))
        .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));

    return { friends, requests, invites };
}

async function sendFriendRequest(database, uid, body) {
    await applyRateLimit(database, uid, 'friendRequests', 30);
    const username = normalizeUsername(body.username);
    const usernameKey = usernameDatabaseKey(username);
    const targetSnapshot = await database.ref(`usernameIndex/${usernameKey}`).get();
    const targetUid = targetSnapshot.val();
    if (typeof targetUid !== 'string') throw fail(404, 'مش لاقيين حساب بالاسم ده');
    if (targetUid === uid) throw fail(400, 'مش ممكن تبعت طلب صداقة لنفسك');

    const [alreadyFriends, incoming, targetProfile, senderProfile] = await Promise.all([
        database.ref(`friends/${uid}/${targetUid}`).get(),
        database.ref(`friendRequests/${uid}/${targetUid}`).get(),
        database.ref(`publicProfiles/${targetUid}`).get(),
        database.ref(`publicProfiles/${uid}`).get()
    ]);
    if (alreadyFriends.val()) throw fail(409, 'أنتم أصدقاء بالفعل');
    if (incoming.exists()) throw fail(409, 'الشخص ده باعتلك طلب صداقة؛ اقبله من طلباتك');

    const requestRef = database.ref(`friendRequests/${targetUid}/${uid}`);
    const result = await requestRef.transaction(current => current == null ? {
        ...publicProfile(uid, senderProfile.val() || {}),
        createdAt: Date.now()
    } : undefined, undefined, false);
    if (!result.committed) throw fail(409, 'طلب الصداقة اتبعت قبل كده');
    await database.ref(`outgoingFriendRequests/${uid}/${targetUid}`).set(Date.now());
    const createdAt = Number(result.snapshot.val()?.createdAt) || Date.now();
    await deliverPushNotification(database, targetUid, {
        title: 'طلب صداقة جديد',
        body: `${publicProfile(uid, senderProfile.val() || {}).nickname} بعتلك طلب صداقة`,
        type: 'friend-request',
        notificationId: `celia-friend-request-${uid}:${createdAt}`,
        url: '/?openNotifications=1'
    });
    return { ok: true, target: publicProfile(targetUid, targetProfile.val() || {}) };
}

async function acceptFriendRequest(database, uid, fromUid) {
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(fromUid) || fromUid === uid) throw fail(400, 'طلب الصداقة غير صالح');
    const requestRef = database.ref(`friendRequests/${uid}/${fromUid}`);
    const request = await requestRef.get();
    if (!request.exists()) throw fail(404, 'طلب الصداقة مش موجود');
    await database.ref().update({
        [`friends/${uid}/${fromUid}`]: true,
        [`friends/${fromUid}/${uid}`]: true,
        [`friendRequests/${uid}/${fromUid}`]: null,
        [`outgoingFriendRequests/${fromUid}/${uid}`]: null
    });
    return { ok: true };
}

async function removeFriend(database, uid, friendUid) {
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(friendUid) || friendUid === uid) throw fail(400, 'الصديق غير صالح');
    await database.ref().update({
        [`friends/${uid}/${friendUid}`]: null,
        [`friends/${friendUid}/${uid}`]: null
    });
    return { ok: true };
}

async function sendGameInvite(database, uid, body) {
    await applyRateLimit(database, uid, 'gameInvites', 20);
    const friendUid = String(body.friendUid || '');
    const gameId = String(body.gameId || '');
    const roomPrefix = String(body.roomPrefix || gameId);
    const roomCode = String(body.roomCode || '').trim().toUpperCase();
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(friendUid) || friendUid === uid) throw fail(400, 'الصديق غير صالح');
    if (!GAME_TITLES[gameId]) throw fail(400, 'اللعبة غير مدعومة للدعوات');
    if (!GAME_TITLES[roomPrefix]) throw fail(400, 'الغرفة غير صالحة');
    if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/.test(roomCode)) throw fail(400, 'كود الغرفة غير صالح');

    const [friendRef, roomSnapshot, guestReadySnapshot, senderSnapshot, friendConnectionsSnapshot, friendActivitiesSnapshot] = await Promise.all([
        database.ref(`friends/${uid}/${friendUid}`).get(),
        database.ref(`rooms/${roomPrefix}-${roomCode}/status`).get(),
        database.ref(`rooms/${roomPrefix}-${roomCode}/guestReady`).get(),
        database.ref(`publicProfiles/${uid}`).get(),
        database.ref(`presence/${friendUid}/connections`).get(),
        database.ref(`presence/${friendUid}/activities`).get()
    ]);
    if (!friendRef.val()) throw fail(403, 'تقدر تدعو أصدقاءك بس');
    if (roomSnapshot.val() !== 'waiting' || guestReadySnapshot.val() === true) throw fail(409, 'الغرفة مش متاحة دلوقتي');
    const friendIsOnline = friendConnectionsSnapshot.exists();
    const now = Date.now();
    const friendIsPlaying = Object.values(friendActivitiesSnapshot.val() || {}).some(activity => (
        activity?.status === 'playing' && now - Number(activity.updatedAt || 0) < PRESENCE_ACTIVITY_TTL_MS
    ));
    if (friendIsOnline && friendIsPlaying) throw fail(409, 'صديقك بيلعب دلوقتي، جرّب تعزمه بعد ما يخلص');

    const inviteRef = database.ref(`gameInvites/${friendUid}`).push();
    const invite = {
        fromUid: uid,
        fromUsername: senderSnapshot.val()?.username || '',
        fromNickname: senderSnapshot.val()?.nickname || 'صديقك',
        fromAvatar: senderSnapshot.val()?.avatar || 'cool',
        gameId,
        gameTitle: GAME_TITLES[gameId],
        roomCode,
        createdAt: Date.now()
    };
    await database.ref().update({
        [`gameInvites/${friendUid}/${inviteRef.key}`]: invite,
        [`outgoingGameInvites/${uid}/${inviteRef.key}`]: { toUid: friendUid, createdAt: invite.createdAt }
    });
    const url = `/?${new URLSearchParams({ game: invite.gameId, room: invite.roomCode, invite: inviteRef.key }).toString()}`;
    await deliverPushNotification(database, friendUid, {
        title: 'دعوة لعب جديدة',
        body: `${invite.fromNickname} دعاك إلى ${invite.gameTitle}`,
        type: 'game-invite',
        notificationId: `celia-game-invite-${inviteRef.key}`,
        url
    });
    return { ok: true };
}

async function setPresenceActivity(database, uid, body) {
    await applyRateLimit(database, uid, 'presenceActivity', 240);
    const sessionId = String(body.sessionId || '');
    const status = String(body.status || 'online');
    if (!/^[A-Za-z0-9_-]{12,80}$/.test(sessionId)) throw fail(400, 'جلسة الحضور غير صالحة');
    if (status !== 'playing' && status !== 'online') throw fail(400, 'حالة الحضور غير صالحة');

    const activitiesRef = database.ref(`presence/${uid}/activities`);
    const activitiesSnapshot = await activitiesRef.get();
    const now = Date.now();
    const updates = {};
    for (const [previousSessionId, activity] of Object.entries(activitiesSnapshot.val() || {})) {
        if ((status === 'online' && previousSessionId === sessionId)
            || now - Number(activity?.updatedAt || 0) >= PRESENCE_ACTIVITY_TTL_MS) {
            updates[`presence/${uid}/activities/${previousSessionId}`] = null;
        }
    }
    if (status === 'online') {
        if (Object.keys(updates).length) await database.ref().update(updates);
        return { ok: true };
    }

    const gameId = String(body.gameId || '').slice(0, 48);
    updates[`presence/${uid}/activities/${sessionId}`] = { status: 'playing', gameId, updatedAt: now };
    await database.ref().update(updates);
    return { ok: true };
}

export default async function handler(req, res) {
    try {
        const identity = await verifyBearerToken(req);
        const database = getAdminDatabase();
        if (req.method === 'GET') return sendJson(res, 200, await getSocialData(database, identity.uid));
        if (req.method !== 'POST') return sendJson(res, 405, { error: 'طريقة الطلب غير مدعومة' });

        const body = req.body && typeof req.body === 'object' ? req.body : {};
        if (body.action === 'set_presence_activity') return sendJson(res, 200, await setPresenceActivity(database, identity.uid, body));
        if (body.action === 'register_notification_token') return sendJson(res, 200, await registerNotificationToken(database, identity.uid, body));
        if (body.action === 'remove_notification_token') return sendJson(res, 200, await removeNotificationToken(database, identity.uid, body));
        if (body.action === 'send_friend_request') return sendJson(res, 201, await sendFriendRequest(database, identity.uid, body));
        if (body.action === 'accept_friend_request') return sendJson(res, 200, await acceptFriendRequest(database, identity.uid, String(body.fromUid || '')));
        if (body.action === 'reject_friend_request') {
            const fromUid = String(body.fromUid || '');
            if (!/^[A-Za-z0-9_-]{8,128}$/.test(fromUid)) throw fail(400, 'طلب الصداقة غير صالح');
            await database.ref().update({
                [`friendRequests/${identity.uid}/${fromUid}`]: null,
                [`outgoingFriendRequests/${fromUid}/${identity.uid}`]: null
            });
            return sendJson(res, 200, { ok: true });
        }
        if (body.action === 'remove_friend') return sendJson(res, 200, await removeFriend(database, identity.uid, String(body.friendUid || '')));
        if (body.action === 'send_game_invite') return sendJson(res, 201, await sendGameInvite(database, identity.uid, body));
        if (body.action === 'dismiss_invite') {
            const inviteId = String(body.inviteId || '');
            if (!/^[A-Za-z0-9_-]{8,128}$/.test(inviteId)) throw fail(400, 'الدعوة غير صالحة');
            const inviteSnapshot = await database.ref(`gameInvites/${identity.uid}/${inviteId}`).get();
            const invite = inviteSnapshot.val();
            const updates = { [`gameInvites/${identity.uid}/${inviteId}`]: null };
            if (invite?.fromUid) updates[`outgoingGameInvites/${invite.fromUid}/${inviteId}`] = null;
            await database.ref().update(updates);
            return sendJson(res, 200, { ok: true });
        }
        return sendJson(res, 400, { error: 'طلب غير صالح' });
    } catch (error) {
        const status = Number(error.status) || (error.message?.includes('FIREBASE_SERVICE_ACCOUNT_JSON') ? 503 : 500);
        return sendJson(res, status, { error: status >= 500 ? 'تعذر إتمام الطلب؛ راجع إعدادات الخادم' : error.message });
    }
}
