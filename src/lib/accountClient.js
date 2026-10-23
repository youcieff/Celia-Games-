import { onAuthStateChanged, signInWithCustomToken, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { ensureProfileIdentity } from './profileIdentity';

const PROFILE_KEY = 'celia_games_profile';
const PLAYER_ID_KEY = 'celia_player_id';
const HISTORY_KEY = 'celia_match_history';
const STREAK_KEY = 'celia_win_streak';
const ACCOUNT_KEY = 'celia_account_session';
const GUEST_BACKUP_KEY = 'celia_guest_backup';
const PENDING_MATCHES_KEY = 'celia_pending_account_matches';
const PENDING_PROFILE_KEY = 'celia_pending_account_profile';

function readJson(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
    } catch {
        return fallback;
    }
}

export function getLocalAccountSnapshot(profile) {
    return {
        profile: profile || readJson(PROFILE_KEY, {}),
        history: readJson(HISTORY_KEY, []),
        streak: readJson(STREAK_KEY, { currentStreak: 0, maxStreak: 0 })
    };
}

export function applyAccountSnapshot(snapshot) {
    if (!snapshot?.profile) return;
    const profile = { ...snapshot.profile, playerId: snapshot.profile.uid || snapshot.profile.playerId };
    const currentProfile = readJson(PROFILE_KEY, null);
    if (currentProfile?.uid === profile.uid && Number(currentProfile.lastSeenAt) > Number(profile.lastSeenAt)) return;
    try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
        if (profile.playerId) localStorage.setItem(PLAYER_ID_KEY, profile.playerId);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(Array.isArray(snapshot.history) ? snapshot.history : []));
        localStorage.setItem(STREAK_KEY, JSON.stringify(snapshot.streak || { currentStreak: 0, maxStreak: 0 }));
        localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ username: profile.username, uid: profile.uid }));
    } catch (error) {
        console.warn('Could not persist the account snapshot on this device', error);
    }
    window.dispatchEvent(new CustomEvent('celia-account-profile-updated', { detail: profile }));
}

export function getSavedAccount() {
    return readJson(ACCOUNT_KEY, null);
}

async function postAccount(body, token) {
    const response = await fetch('/api/account', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'تعذر الاتصال بالخادم');
    return result;
}

async function establishSession(result) {
    const currentProfile = readJson(PROFILE_KEY, null);
    const currentAccount = getSavedAccount();
    const guestBackup = readJson(GUEST_BACKUP_KEY, null);
    const hasCloudProfile = Boolean(currentProfile?.uid || currentAccount?.uid);
    if (!guestBackup && !hasCloudProfile) {
        try {
            localStorage.setItem(GUEST_BACKUP_KEY, JSON.stringify(getLocalAccountSnapshot(currentProfile)));
        } catch (error) {
            console.warn('Could not preserve the guest profile before account sign-in', error);
        }
    }
    await signInWithCustomToken(auth, result.token);
    applyAccountSnapshot(result);
}

export async function createAccount(username, pin, profile) {
    const result = await postAccount({ action: 'register', username, pin, ...getLocalAccountSnapshot(profile) });
    await establishSession(result);
    return result.profile;
}

export async function loginToAccount(username, pin) {
    const result = await postAccount({ action: 'login', username, pin });
    await establishSession(result);
    return result.profile;
}

let scheduledSyncTimer = null;
let queuedSyncProfile = null;
let queuedSyncPromise = null;
let resolveQueuedSync = null;
let pendingMatchRetryTimer = null;

export function syncAccountSnapshot(profile) {
    const user = auth.currentUser;
    if (!user) return Promise.resolve();
    try {
        localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify({ uid: user.uid, profile }));
    } catch { }
    queuedSyncProfile = profile;
    if (!queuedSyncPromise) {
        queuedSyncPromise = new Promise((resolve, reject) => {
            resolveQueuedSync = { resolve, reject };
        });
    }
    clearTimeout(scheduledSyncTimer);
    scheduledSyncTimer = setTimeout(async () => {
        const completion = resolveQueuedSync;
        const profileToSync = queuedSyncProfile;
        queuedSyncPromise = null;
        resolveQueuedSync = null;
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return completion?.resolve();
            const token = await currentUser.getIdToken();
            const result = await postAccount({ action: 'sync', profile: profileToSync }, token);
            applyAccountSnapshot(result);
            const pendingProfile = readJson(PENDING_PROFILE_KEY, null);
            if (pendingProfile?.uid === currentUser.uid) localStorage.removeItem(PENDING_PROFILE_KEY);
            completion?.resolve(result.profile);
        } catch (error) {
            completion?.reject(error);
        }
    }, 350);
    return queuedSyncPromise;
}

function readPendingMatches() {
    const matches = readJson(PENDING_MATCHES_KEY, []);
    return Array.isArray(matches) ? matches : [];
}

function savePendingMatches(matches) {
    try {
        localStorage.setItem(PENDING_MATCHES_KEY, JSON.stringify(matches.slice(-500)));
    } catch (error) {
        console.warn('Could not save pending account matches', error);
    }
}

export async function flushPendingAccountMatches() {
    const user = auth.currentUser;
    if (!user) return false;
    const pending = readPendingMatches();
    const forUser = pending.filter(item => item.uid === user.uid);
    try {
        for (const item of forUser) {
            const token = await user.getIdToken();
            const result = await postAccount({ action: 'record_match', match: item.match, outcome: item.outcome, xp: item.xp }, token);
            applyAccountSnapshot(result);
            const latest = readPendingMatches().filter(candidate => !(candidate.uid === item.uid && candidate.match?.id === item.match?.id));
            savePendingMatches(latest);
        }
        clearTimeout(pendingMatchRetryTimer);
    } catch (error) {
        clearTimeout(pendingMatchRetryTimer);
        pendingMatchRetryTimer = setTimeout(() => {
            void flushPendingAccountMatches().catch(retryError => console.warn('Pending account matches will retry later', retryError));
        }, 15_000);
        throw error;
    }
    return true;
}

export async function flushPendingAccountProfile() {
    const user = auth.currentUser;
    if (!user) return false;
    const pending = readJson(PENDING_PROFILE_KEY, null);
    if (!pending?.profile || pending.uid !== user.uid) return false;
    const token = await user.getIdToken();
    const result = await postAccount({ action: 'sync', profile: pending.profile }, token);
    applyAccountSnapshot(result);
    const currentPending = readJson(PENDING_PROFILE_KEY, null);
    if (currentPending?.uid === user.uid) localStorage.removeItem(PENDING_PROFILE_KEY);
    return true;
}

export async function recordAccountMatch(match, outcome, xp) {
    const user = auth.currentUser;
    if (!user) return false;
    const pending = readPendingMatches();
    if (!pending.some(item => item.uid === user.uid && item.match?.id === match?.id)) {
        pending.push({ uid: user.uid, match, outcome, xp });
        savePendingMatches(pending);
    }
    return flushPendingAccountMatches();
}

export async function refreshAccountSnapshot() {
    const user = auth.currentUser;
    if (!user) return null;
    const token = await user.getIdToken();
    const response = await fetch('/api/account', { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'تعذر تحميل الحساب');
    applyAccountSnapshot(result);
    return result.profile;
}

export async function logoutAccount() {
    await signOut(auth);
    localStorage.removeItem(ACCOUNT_KEY);
    const guestSnapshot = readJson(GUEST_BACKUP_KEY, null);
    localStorage.removeItem(GUEST_BACKUP_KEY);

    const savedGuestProfile = guestSnapshot?.profile;
    let guestProfile = savedGuestProfile && typeof savedGuestProfile === 'object' && !Array.isArray(savedGuestProfile)
        ? { ...savedGuestProfile }
        : null;
    if (!guestProfile) {
        guestProfile = {
            nickname: 'لاعب عظيم',
            avatar: 'cool',
            xp: 0,
            wins: 0,
            gamesPlayed: 0
        };
    }
    delete guestProfile.uid;
    if (!guestProfile.playerId) localStorage.removeItem(PLAYER_ID_KEY);
    guestProfile = ensureProfileIdentity(guestProfile);
    try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(guestProfile));
        if (guestProfile.playerId) localStorage.setItem(PLAYER_ID_KEY, guestProfile.playerId);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(Array.isArray(guestSnapshot?.history) ? guestSnapshot.history : []));
        localStorage.setItem(STREAK_KEY, JSON.stringify(guestSnapshot?.streak || { currentStreak: 0, maxStreak: 0 }));
    } catch (error) {
        console.warn('Could not restore the guest profile after sign-out', error);
    }
    window.dispatchEvent(new CustomEvent('celia-local-profile-updated', { detail: guestProfile }));
    window.dispatchEvent(new CustomEvent('celia-account-profile-updated', { detail: guestProfile }));
}

export function subscribeToAccount(callback) {
    return onAuthStateChanged(auth, user => {
        callback(user);
        if (user) {
            void flushPendingAccountProfile().catch(error => console.warn('Pending account profile will retry later', error));
            void flushPendingAccountMatches().catch(error => console.warn('Pending account matches will retry later', error));
        }
    });
}

if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        void flushPendingAccountProfile().catch(error => console.warn('Pending account profile will retry later', error));
        void flushPendingAccountMatches().catch(error => console.warn('Pending account matches will retry later', error));
    });
}
