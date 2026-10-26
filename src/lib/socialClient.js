import { auth } from './firebase';
import { getReadableNetworkError, isNetworkError } from './networkErrors';

const SOCIAL_CACHE_PREFIX = 'celia_social_cache:';

function readCachedSocialData(uid) {
    try {
        const cached = JSON.parse(localStorage.getItem(`${SOCIAL_CACHE_PREFIX}${uid}`) || 'null');
        if (!cached || cached.uid !== uid) return null;
        return {
            friends: Array.isArray(cached.friends) ? cached.friends : [],
            requests: Array.isArray(cached.requests) ? cached.requests : [],
            invites: Array.isArray(cached.invites) ? cached.invites : [],
            cachedAt: Number(cached.cachedAt) || 0
        };
    } catch {
        return null;
    }
}

function cacheSocialData(uid, data) {
    try {
        localStorage.setItem(`${SOCIAL_CACHE_PREFIX}${uid}`, JSON.stringify({
            uid,
            friends: data.friends,
            requests: data.requests,
            invites: data.invites,
            cachedAt: Date.now()
        }));
    } catch (error) {
        console.warn('Could not cache social data on this device', error);
    }
}

async function socialRequest(body) {
    const user = auth.currentUser;
    if (!user) throw new Error('سجّل الدخول بحسابك عشان تستخدم الأصدقاء والدعوات');
    try {
        const token = await user.getIdToken();
        const response = await fetch('/api/social', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(body)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'تعذر الاتصال بالخادم');
        return result;
    } catch (error) {
        throw new Error(getReadableNetworkError(error, 'تعذر تنفيذ الطلب. حاول مرة أخرى.'));
    }
}

export async function loadSocialData() {
    const user = auth.currentUser;
    if (!user) throw new Error('سجّل الدخول بحسابك عشان تستخدم الأصدقاء والدعوات');
    const cached = readCachedSocialData(user.uid);
    try {
        const token = await user.getIdToken();
        const response = await fetch('/api/social', { headers: { Authorization: `Bearer ${token}` } });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'تعذر تحميل الأصدقاء');
        const data = {
            friends: Array.isArray(result.friends) ? result.friends : [],
            requests: Array.isArray(result.requests) ? result.requests : [],
            invites: Array.isArray(result.invites) ? result.invites : []
        };
        cacheSocialData(user.uid, data);
        return { ...data, fromCache: false, cachedAt: Date.now() };
    } catch (error) {
        if (cached && isNetworkError(error)) return { ...cached, fromCache: true };
        throw new Error(getReadableNetworkError(error, 'تعذر تحميل الأصدقاء. حاول مرة أخرى.'));
    }
}

export const sendFriendRequest = username => socialRequest({ action: 'send_friend_request', username });
export const acceptFriendRequest = fromUid => socialRequest({ action: 'accept_friend_request', fromUid });
export const rejectFriendRequest = fromUid => socialRequest({ action: 'reject_friend_request', fromUid });
export const removeFriend = friendUid => socialRequest({ action: 'remove_friend', friendUid });
export const dismissGameInvite = inviteId => socialRequest({ action: 'dismiss_invite', inviteId });
export const updatePresenceActivity = (status, gameId, sessionId) => socialRequest({
    action: 'set_presence_activity',
    status,
    gameId,
    sessionId
});
export const sendGameInvite = (friendUid, gameId, roomPrefix, roomCode) => socialRequest({
    action: 'send_game_invite',
    friendUid,
    gameId,
    roomPrefix,
    roomCode
});
