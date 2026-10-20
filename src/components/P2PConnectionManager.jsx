import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../lib/firebase';
import { ref, set, onValue, push, onChildAdded, remove, get, onDisconnect, runTransaction } from 'firebase/database';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Check from 'lucide-react/dist/esm/icons/check';
import createAIConn from '../ai/createAIConn';
import { 
    IconCopy, IconJoin, IconChip, IconHourglass,
    IconBusComplete, IconConnect4, IconDotsBoxes, IconCodeGame, 
    IconGuessTime, IconWordGame, IconMemoryGame, IconSeaBattle, 
    IconXOGame, IconTriviaDuel, IconBigXOGame, IconRPSArena, 
    IconAirHockey, IconQuickDraw, IconDominoGame, IconWhoAmI, IconTaboo
} from './icons/GameIcons';

const genId = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    for(let i=0; i<4; i++) res += chars[Math.floor(Math.random() * chars.length)];
    return res;
};

// Creates a virtual "connection" object that mimics PeerJS API using Firebase
function createFirebaseConn(roomPath, isHost, roomCode, gameIdPrefix, clientId, ignoreHistory = false) {
    const listeners = { data: [], 'peer-disconnect': [], 'peer-reconnect': [], 'peer-online': [] };
    const outbox = isHost ? 'h2g' : 'g2h';
    const inbox = isHost ? 'g2h' : 'h2g';
    const myRole = isHost ? 'host' : 'guest';
    const oppRole = isHost ? 'guest' : 'host';

    // Save room info for potential rejoin
    if (roomCode) {
        try {
            sessionStorage.setItem(`celia_last_room:${gameIdPrefix}`, roomCode);
            sessionStorage.setItem(`celia_last_room_role:${gameIdPrefix}`, myRole);
            sessionStorage.setItem('celia_last_room', roomCode); // migrate older builds
            sessionStorage.setItem('celia_last_game', gameIdPrefix);
        } catch(e) {}
        set(ref(db, `${roomPath}/profiles/${myRole}`), readLocalProfile()).catch(() => {});
    }

    // Presence & connection health monitoring
    const myPresenceRef = ref(db, `${roomPath}/presence/${myRole}`);
    const oppPresenceRef = ref(db, `${roomPath}/presence/${oppRole}`);
    const connectedRef = ref(db, '.info/connected');

    let unsubConnected = onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
            try {
                onDisconnect(myPresenceRef).set('offline');
                set(myPresenceRef, 'online');
            } catch (e) { }
        }
    });

    let hasEverConnected = false;
    let hasPresenceSnapshot = false;
    let previousPresence = null;
    let closed = false;
    let unsubOppPresence = onValue(oppPresenceRef, (snap) => {
        const val = snap.val();
        if (val === 'online') {
            if (!hasPresenceSnapshot || previousPresence !== 'online') {
                listeners['peer-online']?.forEach(cb => cb());
            }
            if (hasPresenceSnapshot && previousPresence !== 'online' && hasEverConnected) {
                listeners['peer-reconnect']?.forEach(cb => cb());
            }
            hasEverConnected = true;
        } else if (val === 'offline' && hasEverConnected) {
            listeners['peer-disconnect']?.forEach(cb => cb());
        }
        previousPresence = val;
        hasPresenceSnapshot = true;
    });

    // Listen for incoming messages
    const inboxRef = ref(db, `${roomPath}/${inbox}`);
    let unsubscribe = () => {};
    const attachInbox = (lastExistingKey = null) => {
        if (closed) return;
        unsubscribe = onChildAdded(inboxRef, (snapshot) => {
            // Firebase replays the whole inbox to a new listener. On a room rejoin,
            // discard old turns/readiness, but retain snapshots that can restore a game
            // when the active peer sent one as soon as it noticed the reconnection.
            const msg = snapshot.val();
            if (ignoreHistory && lastExistingKey && snapshot.key <= lastExistingKey && msg?.type !== 'state_sync') return;
            if (msg) listeners.data?.forEach(cb => cb(msg));
        });
    };
    if (ignoreHistory) {
        get(inboxRef).then((snap) => {
            const keys = Object.keys(snap.val() || {}).sort();
            attachInbox(keys.at(-1) || null);
        }).catch(() => attachInbox());
    } else {
        attachInbox();
    }

    return {
        send(data) {
            if (closed) return;
            try {
                push(ref(db, `${roomPath}/${outbox}`), data);
            } catch (e) {
                console.error('Firebase send error:', e);
            }
        },
        on(event, handler) {
            if (!listeners[event]) listeners[event] = [];
            if (!listeners[event].includes(handler)) listeners[event].push(handler);
        },
        off(event, handler) {
            if (listeners[event]) {
                listeners[event] = listeners[event].filter(h => h !== handler);
            }
        },
        // Save game state to Firebase (host calls after every move so rejoiners can restore)
        saveState(state) {
            try { set(ref(db, `${roomPath}/gameState`), state); } catch (e) {}
        },
        // Get saved game state (called after rejoin to restore mid-game position)
        async getState() {
            try {
                const snap = await get(ref(db, `${roomPath}/gameState`));
                return snap.val() || null;
            } catch (e) { return null; }
        },
        async isPeerOnline() {
            try {
                const snap = await get(oppPresenceRef);
                return snap.val() === 'online';
            } catch (e) { return false; }
        },
        async getOpponentProfile() {
            try {
                const snap = await get(ref(db, `${roomPath}/profiles/${oppRole}`));
                return snap.val() || null;
            } catch (e) { return null; }
        },
        close() {
            if (closed) return;
            closed = true;
            try {
                set(myPresenceRef, 'offline');
                set(ref(db, `${roomPath}/status`), 'closed');
                if (roomCode) {
                    try {
                        if (sessionStorage.getItem(`celia_last_room:${gameIdPrefix}`) === roomCode) {
                            sessionStorage.removeItem(`celia_last_room:${gameIdPrefix}`);
                            sessionStorage.removeItem(`celia_last_room_role:${gameIdPrefix}`);
                        }
                        if (sessionStorage.getItem('celia_last_room') === roomCode) {
                            sessionStorage.removeItem('celia_last_room');
                            sessionStorage.removeItem('celia_last_game');
                        }
                    } catch(e) {}
                    if (clientId) {
                        const claimRef = ref(db, `${roomPath}/rejoinClaims/${myRole}`);
                        runTransaction(claimRef, (entry) => {
                            const owner = typeof entry === 'string' ? entry : entry?.clientId;
                            return owner === clientId ? null : entry;
                        }).catch(() => {});
                    }
                }
                unsubConnected();
                unsubOppPresence();
                unsubscribe();
                Object.keys(listeners).forEach((event) => { listeners[event] = []; });
            } catch (e) { }
        },
        _unsubscribe() { unsubscribe(); },
    };
}

/* ─── Digit display for the room code ─────────────────────────────────────── */
function CodeDigit({ char }) {
    return (
        <span className="lobby-digit">{char}</span>
    );
}

async function copyTextToClipboard(value) {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(value);
            return true;
        }
    } catch {
        // Use the textarea fallback below when clipboard permission is unavailable.
    }

    const field = document.createElement('textarea');
    field.value = value;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.left = '-9999px';
    document.body.appendChild(field);
    field.select();
    let copied = false;
    try {
        copied = document.execCommand('copy');
    } catch {
        copied = false;
    }
    field.remove();
    return copied;
}

function readLocalProfile() {
    let profile = { nickname: 'لاعب عظيم', avatar: 'cool' };
    try {
        const stored = localStorage.getItem('celia_games_profile');
        if (stored) profile = JSON.parse(stored);
    } catch (e) { }
    return profile;
}

async function claimRejoinRole(roomPath, preferredRole, clientId) {
    const presenceRef = ref(db, `${roomPath}/presence`);
    const presenceSnap = await get(presenceRef).catch(() => null);
    const presence = presenceSnap?.val() || {};
    let wantedRole = preferredRole === 'host' || preferredRole === 'guest' ? preferredRole : null;
    if (!wantedRole && presence.host === 'online' && presence.guest !== 'online') wantedRole = 'guest';
    if (!wantedRole && presence.guest === 'online' && presence.host !== 'online') wantedRole = 'host';

    const claimsRef = ref(db, `${roomPath}/rejoinClaims`);
    const result = await runTransaction(claimsRef, (current) => {
        const claims = current && typeof current === 'object' ? current : {};
        const ownerOf = (entry) => typeof entry === 'string' ? entry : entry?.clientId;
        const stale = (role) => {
            const entry = claims[role];
            if (!entry || presence[role] === 'online') return false;
            const claimedAt = typeof entry === 'object' ? Number(entry.claimedAt) : 0;
            return !claimedAt || Date.now() - claimedAt > 30_000;
        };
        const existingRole = ownerOf(claims.host) === clientId ? 'host'
            : ownerOf(claims.guest) === clientId ? 'guest' : null;
        if (existingRole) {
            return { ...claims, [existingRole]: { clientId, claimedAt: Date.now() } };
        }

        let role = wantedRole && (!ownerOf(claims[wantedRole]) || stale(wantedRole)) ? wantedRole : null;
        if (!role) role = !ownerOf(claims.host) || stale('host') ? 'host'
            : (!ownerOf(claims.guest) || stale('guest') ? 'guest' : null);
        if (!role) return;
        return { ...claims, [role]: { clientId, claimedAt: Date.now() } };
    }, { applyLocally: false });

    if (!result.committed) throw new Error('No free rejoin role');
    const claims = result.snapshot.val() || {};
    const ownerOf = (entry) => typeof entry === 'string' ? entry : entry?.clientId;
    if (ownerOf(claims.host) === clientId) return 'host';
    if (ownerOf(claims.guest) === clientId) return 'guest';
    throw new Error('Could not claim a rejoin role');
}

function getRoomConnectionError(error, action = 'join') {
    const details = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
    if (details.includes('permission_denied') || details.includes('permission denied')) {
        return 'الإنترنت شغال، لكن خدمة غرف اللعب رفضت الاتصال. إعدادات الغرف محتاجة مراجعة.';
    }
    if (details.includes('network') || details.includes('unavailable') || details.includes('disconnected')
        || details.includes('timeout') || details.includes('timed out') || details.includes('failed to fetch')) {
        return 'مش قادر أوصل لخادم الغرف حاليًا. اتأكد إن اتصال Firebase مسموح وجرب تاني.';
    }
    if (details.includes('no free rejoin role')) {
        return 'الغرفة ممتلئة أو رجوع اللاعبين لها قيد التنفيذ. جرّب بعد لحظات.';
    }
    return action === 'create'
        ? 'تعذر إنشاء غرفة اللعب. جرّب تاني، ولو استمرت المشكلة راجع إعدادات قاعدة بيانات Firebase.'
        : 'تعذر الانضمام للغرفة. راجع الكود ومود اللعبة، ثم حاول مرة أخرى.';
}

async function getWhoAmIModeMismatch(code, currentPrefix) {
    const prefixes = ['celia-whoami', 'celia-whoami-together'];
    if (!prefixes.includes(currentPrefix)) return null;
    const otherPrefix = prefixes.find(prefix => prefix !== currentPrefix);
    try {
        const snapshot = await get(ref(db, `rooms/${otherPrefix}-${code}/status`));
        if (!snapshot.exists() || snapshot.val() === 'closed') return null;
        return otherPrefix === 'celia-whoami'
            ? 'الكود ده لمود «عن بُعد بالدردشة». اختاروا نفس المود عندكم أو استخدموا كود الغرفة الصحيح.'
            : 'الكود ده لمود «سوا بدون دردشة». اختاروا نفس المود عندكم أو استخدموا كود الغرفة الصحيح.';
    } catch {
        return null;
    }
}

const gameInfoMap = {
    'celia-bus': { name: 'أتوبيس كومبليت', Icon: IconBusComplete },
    'celia-c4': { name: 'أربعة في صف', Icon: IconConnect4 },
    'celia-db': { name: 'النقاط والصناديق', Icon: IconDotsBoxes },
    'celia-code': { name: 'خمن الكود', Icon: IconCodeGame },
    'celia-time': { name: 'خمن الوقت', Icon: IconGuessTime },
    'celia-word': { name: 'خمن الكلمة', Icon: IconWordGame },
    'celia-mem': { name: 'الذاكرة البصرية', Icon: IconMemoryGame },
    'celia-sea': { name: 'حرب الغواصات', Icon: IconSeaBattle },
    'celia-xo': { name: 'تيك تاك تو', Icon: IconXOGame },
    'celia-trivia': { name: 'حرب المعلومات', Icon: IconTriviaDuel },
    'celia-uxo': { name: 'إكس أو المطورة', Icon: IconBigXOGame },
    'celia-rps': { name: 'حجر ورقة مقص', Icon: IconRPSArena },
    'celia-hockey': { name: 'الهوكي الهوائي', Icon: IconAirHockey },
    'celia-draw': { name: 'الرسم السريع', Icon: IconQuickDraw },
    'celia-domino': { name: 'الدومينو', Icon: IconDominoGame },
    'celia-brick': { name: 'كسار الطوب', Icon: IconAirHockey },
    'celia-math': { name: 'حرب الحساب', Icon: IconGuessTime },
    'celia-sudoku': { name: 'سودوكو', Icon: IconCodeGame },
    'celia-whoami': { name: 'أنا مين', Icon: IconWhoAmI },
    'celia-whoami-together': { name: 'أنا مين · سوا', Icon: IconWhoAmI },
    'celia-taboo': { name: 'الكلمة الممنوعة', Icon: IconTaboo },
    'celia-taboo-together': { name: 'الكلمة الممنوعة · سوا', Icon: IconTaboo }
};


export default function P2PConnectionManager({ gameIdPrefix, inviteGameId = gameIdPrefix, onGameStart, allowAI = true }) {
    const [myId] = useState(() => genId());
    const roomCodeStorageKey = `celia_last_room:${gameIdPrefix}`;
    const roomRoleStorageKey = `celia_last_room_role:${gameIdPrefix}`;
    const [joinId, setJoinId] = useState('');
    const [copied, setCopied] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [roomCreated, setRoomCreated] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [rejoinCode, setRejoinCode] = useState(() => {
        try {
            const scoped = sessionStorage.getItem(`celia_last_room:${gameIdPrefix}`);
            if (scoped) return scoped;
            // Older builds used one unscoped key. Keep it available for its original game.
            if (sessionStorage.getItem('celia_last_game') === gameIdPrefix) return sessionStorage.getItem('celia_last_room') || null;
            return sessionStorage.getItem('celia_last_game') ? null : sessionStorage.getItem('celia_last_room') || null;
        } catch(e) { return null; }
    });
    const [rejoinRole, setRejoinRole] = useState(() => {
        try { return sessionStorage.getItem(`celia_last_room_role:${gameIdPrefix}`) || null; } catch(e) { return null; }
    });
    const [clientId] = useState(() => {
        try {
            let id = sessionStorage.getItem('celia_rejoin_client_id');
            if (!id) {
                id = `${genId()}${Date.now().toString(36)}`;
                sessionStorage.setItem('celia_rejoin_client_id', id);
            }
            return id;
        } catch(e) { return `${genId()}${Date.now().toString(36)}`; }
    });

    const [lobbyState, setLobbyState] = useState('lobby'); // 'lobby' | 'connected'
    const [myReady, setMyReady] = useState(false);
    const [oppReady, setOppReady] = useState(false);
    const [oppProfile, setOppProfile] = useState(null);
    const oppProfileRef = useRef(null);

    const connRef = useRef(null);
    const isHostRef = useRef(false);
    const isHandedOffRef = useRef(false);
    const oppReadyRef = useRef(false);
    const isRejoinRef = useRef(false);
    const savedStateRef = useRef(null);
    const roomPath = `rooms/${gameIdPrefix}-${myId}`;

    const updateOpponentProfile = (profile) => {
        if (!profile) return;
        oppProfileRef.current = profile;
        setOppProfile(profile);
    };

    const attachLobbyData = (conn, isRejoin = false) => {
        conn.on('data', (d) => {
            if (d?.type === 'global_ready' || d?.type === 'rejoin_hello') {
                oppReadyRef.current = true;
                setOppReady(true);
                updateOpponentProfile(d.profile);
            }
            if (isRejoin && d?.type === 'state_sync' && d.state) savedStateRef.current = d.state;
        });
    };

    const startRejoinedGame = async () => {
        const conn = connRef.current;
        if (!isRejoinRef.current || !conn || isHandedOffRef.current) return false;
        if (!(await conn.isPeerOnline())) return false;
        isHandedOffRef.current = true;
        if (!oppProfileRef.current) updateOpponentProfile(await conn.getOpponentProfile());
        let stateToRestore = savedStateRef.current;
        if (!stateToRestore) {
            const persistedState = await conn.getState();
            stateToRestore = savedStateRef.current || persistedState;
        }
        onGameStart(conn, isHostRef.current, oppProfileRef.current, stateToRestore);
        return true;
    };

    // HOST: write room to Firebase and wait for guest
    useEffect(() => {
        const hostRoomRef = ref(db, `${roomPath}/status`);
        let cancelled = false;
        let unsubStatus = () => {};
        setRoomCreated(false);

        const initializeRoom = async () => {
            try {
                await set(hostRoomRef, 'waiting');
                if (cancelled) return;
                setRoomCreated(true);
                unsubStatus = onValue(ref(db, `${roomPath}/guestReady`), (snap) => {
                    if (snap.val() === true && !isHandedOffRef.current) {
                        isHostRef.current = true;
                        // Wait briefly so guest's Firebase listeners are ready before we connect
                        setTimeout(() => {
                            if (cancelled || isHandedOffRef.current) return;
                            const conn = createFirebaseConn(roomPath, true, myId, gameIdPrefix, clientId);
                            connRef.current = conn;
                            attachLobbyData(conn);
                            setLobbyState('connected');
                        }, 300);
                    }
                }, (error) => {
                    console.warn('Firebase room listener failed:', error?.code || error?.message || 'unknown error');
                    if (!cancelled) {
                        setRoomCreated(false);
                        setErrorMsg(getRoomConnectionError(error, 'create'));
                    }
                });
            } catch (error) {
                console.warn('Firebase room creation failed:', error?.code || error?.message || 'unknown error');
                if (!cancelled) {
                    setRoomCreated(false);
                    setErrorMsg(getRoomConnectionError(error, 'create'));
                }
            }
        };
        void initializeRoom();

        return () => {
            cancelled = true;
            unsubStatus();
            if (!isHandedOffRef.current) {
                remove(ref(db, roomPath)).catch(() => {});
            }
        };
    }, [rejoinCode, roomPath, myId, gameIdPrefix, clientId]);

    // GUEST: join a room
    const handleJoin = async () => {
        if (!joinId || joinId.length < 4) return;
        setIsConnecting(true);
        setErrorMsg('');

        const targetRoom = `rooms/${gameIdPrefix}-${joinId.trim().toUpperCase()}`;
        const statusRef = ref(db, `${targetRoom}/status`);

        try {
            const snap = await get(statusRef);
            if (!snap.exists() || snap.val() === 'closed') {
                const modeMismatchMessage = await getWhoAmIModeMismatch(joinId.trim().toUpperCase(), gameIdPrefix);
                setErrorMsg(modeMismatchMessage || 'الغرفة دي مش موجودة. تأكد من الكود وإن الخصم فاتح نفس مود اللعبة.');
                setIsConnecting(false);
                return;
            }

            await set(ref(db, `${targetRoom}/guestReady`), true);

            isHostRef.current = false;
            const conn = createFirebaseConn(targetRoom, false, joinId.trim().toUpperCase(), gameIdPrefix, clientId);
            connRef.current = conn;
            attachLobbyData(conn);

            setIsConnecting(false);
            setLobbyState('connected');
        } catch (error) {
            console.warn('Firebase room join failed:', error?.code || error?.message || 'unknown error');
            setErrorMsg(getRoomConnectionError(error));
            setIsConnecting(false);
        }
    };

    const handleReadyClick = () => {
        setMyReady(true);
        let prof = { nickname: 'لاعب عظيم', avatar: 'cool' };
        try {
            const stored = localStorage.getItem('celia_games_profile');
            if (stored) prof = JSON.parse(stored);
        } catch (e) { }
        connRef.current?.send({ type: 'global_ready', profile: prof });
    };

    // Both ready → start game
    useEffect(() => {
        if (myReady && oppReady && connRef.current) {
            const timeout = setTimeout(async () => {
                if (isHandedOffRef.current) return;
                isHandedOffRef.current = true;
                // On rejoin, fetch saved state and pass it to the game
                let stateToRestore = savedStateRef.current;
                if (isRejoinRef.current && !stateToRestore) {
                    stateToRestore = await connRef.current.getState();
                }
                onGameStart(connRef.current, isHostRef.current, oppProfile, stateToRestore);
            }, 600);
            return () => clearTimeout(timeout);
        }
    }, [myReady, oppReady, onGameStart, oppProfile]);

    // Robust sync: retry sending global_ready until oppReady is received
    useEffect(() => {
        let interval;
        if (myReady && !oppReady) {
            let prof = { nickname: 'لاعب عظيم', avatar: 'cool' };
            try {
                const stored = localStorage.getItem('celia_games_profile');
                if (stored) prof = JSON.parse(stored);
            } catch (e) { }
            interval = setInterval(() => {
                connRef.current?.send({ type: 'global_ready', profile: prof });
            }, 1000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [myReady, oppReady]);

    const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}/?game=${inviteGameId}&room=${myId}` : '';

    const handleCopy = async () => {
        if (!roomCreated) return;
        setCopied(await copyTextToClipboard(inviteUrl));
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyCode = async () => {
        if (!roomCreated) return;
        setCopiedCode(await copyTextToClipboard(myId));
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const handleWhatsAppShare = () => {
        if (!roomCreated) return;
        const text = `تعال اتحداك في ألعاب سيليا! 🎮🔥\nاضغط على الرابط وادخل الجولة معايا فوراً:\n${inviteUrl}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    };

    // Auto-join from URL / sessionStorage
    useEffect(() => {
        try {
            const autoCode = sessionStorage.getItem('celia_autojoin_room');
            if (autoCode && autoCode.length >= 4) {
                sessionStorage.removeItem('celia_autojoin_room');
                setJoinId(autoCode.toUpperCase());
                setTimeout(() => {
                    handleJoinWithId(autoCode.toUpperCase());
                }, 400);
            }
        } catch (e) { }
    }, []);

    const handleJoinWithId = async (codeToJoin) => {
        if (!codeToJoin || codeToJoin.length < 4) return;
        setIsConnecting(true);
        setErrorMsg('');

        const normalizedCode = codeToJoin.trim().toUpperCase();
        const targetRoom = `rooms/${gameIdPrefix}-${normalizedCode}`;
        const statusRef = ref(db, `${targetRoom}/status`);

        try {
            const snap = await get(statusRef);
            if (!snap.exists() || snap.val() === 'closed') {
                const modeMismatchMessage = await getWhoAmIModeMismatch(normalizedCode, gameIdPrefix);
                setErrorMsg(modeMismatchMessage || 'الغرفة دي مش موجودة أو اتقفلت. اتأكد من الكود أو خلي صاحبك يعمل غرفة جديدة.');
                // Clear invalid rejoin code
                setRejoinCode(null);
                setRejoinRole(null);
                try {
                    sessionStorage.removeItem(roomCodeStorageKey);
                    sessionStorage.removeItem(roomRoleStorageKey);
                    if (sessionStorage.getItem('celia_last_room') === normalizedCode) {
                        sessionStorage.removeItem('celia_last_room');
                        sessionStorage.removeItem('celia_last_game');
                    }
                } catch(e) {}
                setIsConnecting(false);
                return;
            }

            const isRejoin = normalizedCode === rejoinCode;
            isRejoinRef.current = isRejoin;
            let joinRole = 'guest';
            if (isRejoin) {
                joinRole = await claimRejoinRole(targetRoom, rejoinRole, clientId);
                setRejoinRole(joinRole);
                try { sessionStorage.setItem(roomRoleStorageKey, joinRole); } catch(e) {}
                if (targetRoom !== roomPath) await remove(ref(db, roomPath));
            }

            if (joinRole === 'guest') await set(ref(db, `${targetRoom}/guestReady`), true);

            isHostRef.current = joinRole === 'host';
            const conn = createFirebaseConn(targetRoom, joinRole === 'host', normalizedCode, gameIdPrefix, clientId, isRejoin);
            connRef.current = conn;
            attachLobbyData(conn, isRejoin);

            setIsConnecting(false);
            setLobbyState('connected');
            if (isRejoin) {
                conn.send({ type: 'rejoin_hello', profile: readLocalProfile() });
                conn.on('peer-online', () => { void startRejoinedGame(); });
                setTimeout(() => { void startRejoinedGame(); }, 0);
            }
        } catch (error) {
            console.warn('Firebase room rejoin failed:', error?.code || error?.message || 'unknown error');
            setErrorMsg(getRoomConnectionError(error));
            setIsConnecting(false);
        }
    };

    // ── CONNECTED STATE ────────────────────────────────────────────────────────
    if (lobbyState === 'connected') {
        return (
            <div className="flex flex-col items-center justify-center w-full max-w-sm mx-auto h-full px-4 mb-10">
                <div className="lobby-connected-card">
                    {/* Animated rings */}
                    <div className="lobby-rings">
                        <span /><span /><span />
                    </div>

                    <div className="relative z-10 text-center">
                        {/* Connected icon */}
                        <div className="lobby-connected-icon mx-auto mb-5">
                            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                                <circle cx="18" cy="18" r="17" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" className="opacity-30" />
                                <path d="M8 18 Q18 8 28 18 Q18 28 8 18Z" fill="currentColor" opacity="0.15" />
                                <circle cx="18" cy="18" r="5" fill="currentColor" />
                                <circle cx="8" cy="18" r="3" fill="currentColor" opacity="0.6" />
                                <circle cx="28" cy="18" r="3" fill="currentColor" opacity="0.6" />
                                <line x1="11" y1="18" x2="15" y2="18" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
                                <line x1="21" y1="18" x2="25" y2="18" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
                            </svg>
                        </div>

                        <h2 className="text-xl font-black mb-1" style={{ color: 'var(--accent)' }}>الاتصال شغّال!</h2>
                        <p className="text-xs opacity-50 font-bold mb-8">اضغط جاهز لما تكون مستعد تبدأ</p>

                        <button
                            onClick={handleReadyClick}
                            disabled={myReady}
                            className={`w-full h-14 rounded-2xl text-base font-black flex items-center justify-center gap-2.5 transition-all duration-300 ${myReady
                                ? 'bg-white/5 border border-white/10 text-white/40'
                                : 'glow-button'
                                }`}
                        >
                            {myReady ? (
                                <span className="flex items-center gap-2">
                                    <IconHourglass size={18} className="animate-spin opacity-60" />
                                    في انتظار الخصم...
                                </span>
                            ) : (
                                <>
                                    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                                        <path d="M3 9l5 5 7-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                    </svg>
                                    جاهز — ابدأ اللعبة
                                </>
                            )}
                        </button>

                        {/* Readiness indicators */}
                        <div className="mt-6 grid grid-cols-2 gap-3">
                            {[
                                { label: 'أنت', ready: myReady },
                                { label: 'الخصم', ready: oppReady },
                            ].map(({ label, ready }) => (
                                <div key={label} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-black transition-all duration-500 ${ready
                                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                                    : 'border-white/8 bg-white/3 text-white/30'
                                    }`}>
                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ready ? 'bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]' : 'bg-white/20'}`} />
                                    {label}
                                    {ready && <span className="mr-auto text-[10px] opacity-70">✓</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-start w-full max-w-sm mx-auto gap-4 pt-2">

            {/* ── Rejoin previous room ── */}
            {rejoinCode && (
                <div className="w-full glass-card rounded-2xl border border-amber-500/40 bg-amber-500/8 px-4 py-3 flex items-center gap-3 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                    <span className="text-2xl shrink-0">⚡</span>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-amber-300">لقيت غرفة قديمة!</p>
                        <p className="text-[10px] opacity-60 font-bold">كود: <span className="font-mono text-amber-400">{rejoinCode}</span></p>
                    </div>
                    <button
                        onClick={() => handleJoinWithId(rejoinCode)}
                        disabled={isConnecting}
                        className="shrink-0 px-3 py-2 rounded-xl bg-amber-500 text-slate-900 font-black text-xs hover:bg-amber-400 transition-all active:scale-95 disabled:opacity-50"
                    >
                        ارجع!
                    </button>
                    <button
                        onClick={() => {
                            setRejoinCode(null);
                            setRejoinRole(null);
                            try {
                                sessionStorage.removeItem(roomCodeStorageKey);
                                sessionStorage.removeItem(roomRoleStorageKey);
                                if (sessionStorage.getItem('celia_last_game') === gameIdPrefix) {
                                    sessionStorage.removeItem('celia_last_room');
                                    sessionStorage.removeItem('celia_last_game');
                                }
                            } catch(e) {}
                        }}
                        className="shrink-0 text-white/30 hover:text-white/60 text-sm font-bold transition-colors"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* ── Your room code ── */}
            <div className="lobby-ticket w-full">
                {/* Ticket header */}
                <div className="lobby-ticket-header">
                    <span className="text-[10px] font-black tracking-widest uppercase opacity-50">كود غرفتك</span>
                    <span className="lobby-ticket-dot" />
                    <span className="text-[10px] font-black opacity-30">{roomCreated ? 'شارك مع صديقك' : 'جارٍ تجهيز الغرفة…'}</span>
                </div>

                {/* Code display */}
                <div className="lobby-code-row">
                    <div className="flex items-center gap-2">
                        {myId.split('').map((ch, i) => (
                            <CodeDigit key={i} char={ch} />
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={handleCopyCode}
                        aria-label={copiedCode ? 'تم نسخ كود الغرفة' : 'نسخ كود الغرفة'}
                        title={copiedCode ? 'تم نسخ كود الغرفة' : 'نسخ كود الغرفة'}
                        disabled={!roomCreated}
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition active:scale-95 disabled:cursor-wait disabled:opacity-35 ${copiedCode ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300' : 'border-white/10 bg-white/5 text-white/70 hover:border-[var(--accent)]/50 hover:text-[var(--accent)]'}`}
                    >
                        {copiedCode ? <Check size={18} /> : <IconCopy size={18} />}
                    </button>
                </div>

                {/* Ticket perforated bottom */}
                <div className="lobby-ticket-perforation" />

                {/* Actions: Copy Link & WhatsApp Share */}
                <div className="flex gap-2 w-full mt-1">
                    <button
                        onClick={handleCopy}
                        disabled={!roomCreated}
                        className={`lobby-copy-btn flex-[1.2] disabled:cursor-wait disabled:opacity-35 ${copied ? 'lobby-copy-btn--done' : ''}`}
                    >
                        {copied ? (
                            <><Check size={15} /> تم نسخ الرابط</>
                        ) : (
                            <><IconCopy size={15} /> نسخ الرابط</>
                        )}
                    </button>
                    <button
                        onClick={handleWhatsAppShare}
                        disabled={!roomCreated}
                        className="h-11 px-3.5 rounded-2xl flex items-center justify-center gap-1.5 font-black text-xs border border-emerald-400/40 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] active:scale-95 shrink-0 disabled:cursor-wait disabled:opacity-35"
                        title="مشاركة مباشرة عبر واتساب"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 7.33C9.33 7.33 9.04 7.41 8.78 7.69C8.53 7.97 7.82 8.63 7.82 10C7.82 11.36 8.81 12.67 8.95 12.86C9.09 13.05 10.89 15.83 13.65 17.03C14.31 17.31 14.82 17.48 15.22 17.61C15.89 17.82 16.5 17.79 16.98 17.72C17.52 17.64 18.64 17.04 18.88 16.38C19.11 15.71 19.11 15.14 19.04 15.02C18.97 14.9 18.78 14.83 18.49 14.69C18.2 14.55 16.78 13.85 16.52 13.75C16.26 13.66 16.07 13.61 15.88 13.9C15.68 14.18 15.12 14.83 14.95 15.02C14.78 15.22 14.61 15.24 14.32 15.1C14.03 14.96 13.1 14.65 12 13.67C11.14 12.91 10.56 11.97 10.4 11.68C10.23 11.4 10.38 11.24 10.53 11.1C10.66 10.97 10.82 10.76 10.97 10.59C11.11 10.42 11.16 10.29 11.26 10.1C11.36 9.9 11.31 9.73 11.23 9.59C11.16 9.45 10.57 8.01 10.33 7.42C10.09 6.85 9.85 6.93 9.68 6.92C9.51 6.92 9.33 6.92 9.53 7.33Z" />
                        </svg>
                        واتساب
                    </button>
                </div>
            </div>

            {/* ── Divider ── */}
            <div className="flex items-center gap-3 w-full">
                <div className="h-px flex-1 bg-white/8" />
                <span className="text-[11px] font-black opacity-30 tracking-wide">أو انضم لغرفة</span>
                <div className="h-px flex-1 bg-white/8" />
            </div>

            {/* ── Join room ── */}
            <div className="w-full">
                <div className={`lobby-join-field ${errorMsg ? 'lobby-join-field--error' : ''}`}>
                    <IconJoin size={18} className="shrink-0 opacity-40" />
                    <input
                        type="text"
                        value={joinId}
                        onChange={(e) => { setJoinId(e.target.value.toUpperCase()); setErrorMsg(''); }}
                        placeholder="XXXX"
                        className="lobby-join-input"
                        dir="ltr"
                        maxLength={4}
                        onKeyDown={(e) => e.key === 'Enter' && !isConnecting && handleJoin()}
                        disabled={isConnecting}
                    />
                    {joinId.length > 0 && (
                        <span className="text-[10px] font-black opacity-30">{joinId.length}/4</span>
                    )}
                </div>

                {errorMsg && (
                    <div className="mt-2 flex items-start gap-2 animate-pop-in">
                        <p className="text-[11px] font-bold text-red-400 flex-1">{errorMsg}</p>
                        <button onClick={() => setErrorMsg('')}>
                            <RefreshCw size={13} className="text-red-400 opacity-70" />
                        </button>
                    </div>
                )}

                <button
                    onClick={handleJoin}
                    disabled={!joinId || isConnecting || joinId.length < 4}
                    className="glow-button w-full h-13 rounded-2xl font-black text-base flex items-center justify-center gap-2 mt-3 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ minHeight: '52px' }}
                >
                    {isConnecting ? (
                        <><Loader2 className="animate-spin" size={20} /> جاري الاتصال...</>
                    ) : (
                        <>
                            <IconJoin size={19} />
                            انضم للغرفة
                        </>
                    )}
                </button>
            </div>

            {/* ── Play vs AI ── */}
            {gameIdPrefix && allowAI && (
                <>
                    <div className="flex items-center gap-3 w-full">
                        <div className="h-px flex-1 bg-white/8" />
                        <span className="text-[11px] font-black opacity-25 tracking-wide">أو العب أوفلاين</span>
                        <div className="h-px flex-1 bg-white/8" />
                    </div>

                    <button
                        onClick={() => {
                            setIsConnecting(true);
                            setTimeout(() => {
                                onGameStart(createAIConn(gameIdPrefix), true, { nickname: 'الذكاء الاصطناعي', avatar: 'robot', isAI: true });
                            }, 600);
                        }}
                        disabled={isConnecting}
                        className="lobby-ai-btn w-full"
                    >
                        <div className="lobby-ai-icon">
                            <IconChip size={20} />
                        </div>
                        <div className="text-right flex-1">
                            <p className="text-sm font-black">ضد الذكاء الاصطناعي</p>
                            <p className="text-[10px] opacity-40 font-bold">لا يحتاج إنترنت · متوسط الصعوبة</p>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-30 shrink-0">
                            <path d="M10 8L6 4M10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                </>
            )}
        </div>
    );
}
