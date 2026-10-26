import { onDisconnect, onValue, push, ref, remove, set } from 'firebase/database';
import { db } from './firebase';
import { updatePresenceActivity } from './socialClient';

const activePresence = new Map();
let sessionId = '';
const ACTIVITY_TTL_MS = 75_000;

function getSessionId() {
    if (sessionId) return sessionId;
    try {
        sessionId = sessionStorage.getItem('celia_presence_session_id') || '';
        if (!sessionId) {
            sessionId = globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
            sessionStorage.setItem('celia_presence_session_id', sessionId);
        }
    } catch {
        sessionId = globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    }
    return sessionId;
}

export function startPresence(uid) {
    if (!uid) return () => {};
    const existingStop = activePresence.get(uid);
    if (existingStop) return existingStop;

    const connectionRef = push(ref(db, `presence/${uid}/connections`));
    let cancelled = false;
    let isRegistering = false;
    let generation = 0;
    let pendingOperation = Promise.resolve();
    let cleanupPromise = null;
    let unsubscribe = () => {};

    const stop = () => {
        if (cleanupPromise) return cleanupPromise;
        cancelled = true;
        unsubscribe();
        if (activePresence.get(uid) === stop) activePresence.delete(uid);
        const cleanupWork = (async () => {
            await pendingOperation.catch(() => {});
            await onDisconnect(connectionRef).cancel().catch(() => {});
            await remove(connectionRef).catch(() => {});
            await updatePresenceActivity('online', '', getSessionId()).catch(() => {});
        })();
        cleanupPromise = Promise.race([cleanupWork, new Promise(resolve => setTimeout(resolve, 1_000))]);
        return cleanupPromise;
    };

    unsubscribe = onValue(ref(db, '.info/connected'), snapshot => {
        if (!snapshot.val()) {
            generation += 1;
            isRegistering = false;
            return;
        }
        if (cancelled || isRegistering) return;

        isRegistering = true;
        const currentGeneration = generation;
        pendingOperation = onDisconnect(connectionRef).remove()
            .then(() => {
                if (cancelled || generation !== currentGeneration) return;
                return set(connectionRef, Date.now());
            })
            .catch(error => {
                isRegistering = false;
                console.warn('Could not publish friend presence', error);
            });
    }, error => {
        console.warn('Could not monitor friend presence connection', error);
    });

    activePresence.set(uid, stop);
    return stop;
}

export function setPresenceActivity(uid, status = 'online', gameId = '') {
    if (!uid) return Promise.resolve(false);
    return updatePresenceActivity(status === 'playing' ? 'playing' : 'online', gameId, getSessionId())
        .then(() => true)
        .catch(error => {
            console.warn('Could not update friend activity', error?.message || 'unknown error');
            return false;
        });
}

export function stopPresence(uid) {
    return activePresence.get(uid)?.() || Promise.resolve();
}

export function subscribeFriendPresence(friendUids, callback) {
    const latestByUid = new Map();
    const publish = uid => {
        const presence = latestByUid.get(uid) || {};
        const connectionCount = Object.keys(presence.connections || {}).length;
        const online = connectionCount > 0;
        const now = Date.now();
        const playingActivity = Object.values(presence.activities || {}).find(activity => (
            activity?.status === 'playing' && now - Number(activity.updatedAt || 0) < ACTIVITY_TTL_MS
        ));
        callback(uid, { online, playing: online && Boolean(playingActivity), gameId: playingActivity?.gameId || '' });
    };
    const unsubscribers = friendUids.map(uid => onValue(
        ref(db, `presence/${uid}`),
        snapshot => {
            latestByUid.set(uid, snapshot.val() || {});
            publish(uid);
        },
        () => {
            latestByUid.set(uid, {});
            publish(uid);
        }
    ));
    const freshnessTimer = setInterval(() => friendUids.forEach(publish), 15_000);
    return () => {
        clearInterval(freshnessTimer);
        unsubscribers.forEach(unsubscribe => unsubscribe());
    };
}
