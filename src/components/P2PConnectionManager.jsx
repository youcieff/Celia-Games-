import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../lib/firebase';
import { ref, set, onValue, push, onChildAdded, remove, get, onDisconnect } from 'firebase/database';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Check from 'lucide-react/dist/esm/icons/check';
import createAIConn from '../ai/createAIConn';
import { 
    IconCopy, IconJoin, IconChip, IconHourglass,
    IconBusComplete, IconConnect4, IconDotsBoxes, IconCodeGame, 
    IconGuessTime, IconWordGame, IconMemoryGame, IconSeaBattle, 
    IconXOGame, IconTriviaDuel, IconBigXOGame, IconRPSArena, 
    IconAirHockey, IconQuickDraw, IconDominoGame 
} from './icons/GameIcons';

const genId = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    for(let i=0; i<4; i++) res += chars[Math.floor(Math.random() * chars.length)];
    return res;
};

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
    'celia-domino': { name: 'الدومينو', Icon: IconDominoGame }
};


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

    const inviteUrl = typeof window !== 'undefined' ? `${window.location.origin}/?game=${gameIdPrefix}&room=${myId}` : '';

    const handleCopy = () => {
        try {
            navigator.clipboard.writeText(inviteUrl);
        } catch (e) {
            navigator.clipboard.writeText(myId);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleWhatsAppShare = () => {
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

        const targetRoom = `rooms/${gameIdPrefix}-${codeToJoin.trim().toUpperCase()}`;
        const statusRef = ref(db, `${targetRoom}/status`);

        try {
            const snap = await get(statusRef);
            if (!snap.exists() || snap.val() === 'closed') {
                setErrorMsg('الغرفة دي مش موجودة أو اتقفلت. اتأكد من الكود أو خلي صاحبك يعمل غرفة جديدة.');
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
            setErrorMsg('فشل الاتصال. تأكد من اتصال الإنترنت.');
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

                {/* Actions: Copy Link & WhatsApp Share */}
                <div className="flex gap-2 w-full mt-1">
                    <button
                        onClick={handleCopy}
                        className={`lobby-copy-btn flex-[1.2] ${copied ? 'lobby-copy-btn--done' : ''}`}
                    >
                        {copied ? (
                            <><Check size={15} /> تم نسخ الرابط</>
                        ) : (
                            <><IconCopy size={15} /> نسخ الرابط</>
                        )}
                    </button>
                    <button
                        onClick={handleWhatsAppShare}
                        className="h-11 px-3.5 rounded-2xl flex items-center justify-center gap-1.5 font-black text-xs border border-emerald-400/40 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] active:scale-95 shrink-0"
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
