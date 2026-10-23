import { onDisconnect, onValue, push, ref, remove, set } from 'firebase/database';
import { db } from './firebase';

const activePresence = new Map();

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

    const stop = () => {
        if (cleanupPromise) return cleanupPromise;
        cancelled = true;
        unsubscribe();
        if (activePresence.get(uid) === stop) activePresence.delete(uid);
        const cleanupWork = (async () => {
            await pendingOperation.catch(() => {});
            await onDisconnect(connectionRef).cancel().catch(() => {});
            await remove(connectionRef).catch(() => {});
        })();
        // Do not block sign-out if the browser has already lost its database connection.
        cleanupPromise = Promise.race([
            cleanupWork,
            new Promise(resolve => setTimeout(resolve, 1_000))
        ]);
        return cleanupPromise;
    };

    const unsubscribe = onValue(ref(db, '.info/connected'), snapshot => {
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

export function stopPresence(uid) {
    return activePresence.get(uid)?.() || Promise.resolve();
}

export function subscribeFriendPresence(friendUids, callback) {
    const unsubscribers = friendUids.map(uid => onValue(
        ref(db, `presence/${uid}/connections`),
        snapshot => callback(uid, snapshot.exists()),
        () => callback(uid, false)
    ));
    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
}
