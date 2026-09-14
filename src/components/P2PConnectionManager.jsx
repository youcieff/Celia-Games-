import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { ref, set, onValue, push, onChildAdded, remove, get, onDisconnect } from 'firebase/database';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Check from 'lucide-react/dist/esm/icons/check';
import createAIConn from '../ai/createAIConn';
import { IconCopy, IconJoin, IconChip, IconHourglass } from './icons/GameIcons';

const genId = () => Math.random().toString(36).substring(2, 6).toUpperCase();

// Creates a virtual "connection" object that mimics PeerJS API using Firebase
function createFirebaseConn(roomPath, isHost) {
    const listeners = { data: [], 'peer-disconnect': [], 'peer-reconnect': [] };
    const outbox = isHost ? 'h2g' : 'g2h';
    const inbox = isHost ? 'g2h' : 'h2g';
    const myRole = isHost ? 'host' : 'guest';
    const oppRole = isHost ? 'guest' : 'host';

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
    let unsubOppPresence = onValue(oppPresenceRef, (snap) => {
        const val = snap.val();
        if (val === 'online') {
            if (hasEverConnected) {
                listeners['peer-reconnect']?.forEach(cb => cb());
            }
            hasEverConnected = true;
        } else if (val === 'offline' && hasEverConnected) {
            listeners['peer-disconnect']?.forEach(cb => cb());
        }
    });

    // Listen for incoming messages
    const inboxRef = ref(db, `${roomPath}/${inbox}`);
    const unsubscribe = onChildAdded(inboxRef, (snapshot) => {
        const msg = snapshot.val();
        if (msg) listeners.data?.forEach(cb => cb(msg));
    });

    return {
        send(data) {
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
        close() {
            try {
                set(myPresenceRef, 'offline');
                set(ref(db, `${roomPath}/status`), 'closed');
                unsubConnected();
                unsubOppPresence();
            } catch (e) { }
        },
        _unsubscribe: unsubscribe,
    };
}

/* ─── Digit display for the room code ─────────────────────────────────────── */
function CodeDigit({ char }) {
    return (
        <span className="lobby-digit">{char}</span>
    );
}

export default function P2PConnectionManager({ gameIdPrefix, onGameStart }) {
    const [myId] = useState(() => genId());
    const [joinId, setJoinId] = useState('');
    const [copied, setCopied] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const [lobbyState, setLobbyState] = useState('lobby'); // 'lobby' | 'connected'
    const [myReady, setMyReady] = useState(false);
    const [oppReady, setOppReady] = useState(false);
    const [oppProfile, setOppProfile] = useState(null);

    const connRef = useRef(null);
    const isHostRef = useRef(false);
    const isHandedOffRef = useRef(false);
    const roomPath = `rooms/${gameIdPrefix}-${myId}`;

    // HOST: write room to Firebase and wait for guest
    useEffect(() => {
        const hostRoomRef = ref(db, `${roomPath}/status`);
        set(hostRoomRef, 'waiting');

        // Listen for guest joining
        const unsubStatus = onValue(ref(db, `${roomPath}/guestReady`), (snap) => {
            if (snap.val() === true && !isHandedOffRef.current) {
                isHostRef.current = true;
                const conn = createFirebaseConn(roomPath, true);
                connRef.current = conn;
                conn.on('data', (d) => {
                    if (d?.type === 'global_ready') {
                        setOppReady(true);
                        if (d.profile) setOppProfile(d.profile);
                    }
                });
                setLobbyState('connected');
            }
        });

        return () => {
            unsubStatus();
            if (!isHandedOffRef.current) {
                remove(ref(db, roomPath));
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
                setErrorMsg('الغرفة دي مش موجودة. تأكد من الكود وإن الخصم فاتح اللعبة.');
                setIsConnecting(false);
                return;
            }

            await set(ref(db, `${targetRoom}/guestReady`), true);

            isHostRef.current = false;
            const conn = createFirebaseConn(targetRoom, false);
            connRef.current = conn;

            conn.on('data', (d) => {
                if (d?.type === 'global_ready') {
                    setOppReady(true);
                    if (d.profile) setOppProfile(d.profile);
                }
            });

            setIsConnecting(false);
            setLobbyState('connected');
        } catch {
            setErrorMsg('فشل الاتصال. تأكد من إنترنت وجرب تاني.');
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
            const timeout = setTimeout(() => {
                isHandedOffRef.current = true;
                onGameStart(connRef.current, isHostRef.current, oppProfile);
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

    const handleCopy = () => {
        navigator.clipboard.writeText(myId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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

    // ── LOBBY STATE ────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col items-center justify-start w-full max-w-sm mx-auto gap-4 pt-2">

            {/* ── Your room code ── */}
            <div className="lobby-ticket w-full">
                {/* Ticket header */}
                <div className="lobby-ticket-header">
                    <span className="text-[10px] font-black tracking-widest uppercase opacity-50">كود غرفتك</span>
                    <span className="lobby-ticket-dot" />
                    <span className="text-[10px] font-black opacity-30">شارك مع صديقك</span>
                </div>

                {/* Code display */}
                <div className="lobby-code-row">
                    {myId.split('').map((ch, i) => (
                        <CodeDigit key={i} char={ch} />
                    ))}
                </div>

                {/* Ticket perforated bottom */}
                <div className="lobby-ticket-perforation" />

                {/* Copy button */}
                <button
                    onClick={handleCopy}
                    className={`lobby-copy-btn ${copied ? 'lobby-copy-btn--done' : ''}`}
                >
                    {copied ? (
                        <><Check size={15} /> تم النسخ</>
                    ) : (
                        <><IconCopy size={15} /> انسخ الكود</>
                    )}
                </button>
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
            {gameIdPrefix && (
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
                                onGameStart(createAIConn(gameIdPrefix), true, { nickname: 'الذكاء الاصطناعي', avatar: 'robot' });
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
