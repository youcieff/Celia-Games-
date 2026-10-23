import { auth } from './firebase';

async function socialRequest(body) {
    const user = auth.currentUser;
    if (!user) throw new Error('سجّل الدخول بحسابك عشان تستخدم الأصدقاء والدعوات');
    const token = await user.getIdToken();
    const response = await fetch('/api/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'تعذر الاتصال بالخادم');
    return result;
}

export async function loadSocialData() {
    const user = auth.currentUser;
    if (!user) throw new Error('سجّل الدخول بحسابك عشان تستخدم الأصدقاء والدعوات');
    const token = await user.getIdToken();
    const response = await fetch('/api/social', { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'تعذر تحميل الأصدقاء');
    return {
        friends: Array.isArray(result.friends) ? result.friends : [],
        requests: Array.isArray(result.requests) ? result.requests : [],
        invites: Array.isArray(result.invites) ? result.invites : []
    };
}

export const sendFriendRequest = username => socialRequest({ action: 'send_friend_request', username });
export const acceptFriendRequest = fromUid => socialRequest({ action: 'accept_friend_request', fromUid });
export const rejectFriendRequest = fromUid => socialRequest({ action: 'reject_friend_request', fromUid });
export const removeFriend = friendUid => socialRequest({ action: 'remove_friend', friendUid });
export const dismissGameInvite = inviteId => socialRequest({ action: 'dismiss_invite', inviteId });
export const sendGameInvite = (friendUid, gameId, roomPrefix, roomCode) => socialRequest({
    action: 'send_game_invite',
    friendUid,
    gameId,
    roomPrefix,
    roomCode
});
