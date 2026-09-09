import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { ref, set, onValue, push, onChildAdded, remove, get } from 'firebase/database';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Plus from 'lucide-react/dist/esm/icons/plus';
import LinkIcon from 'lucide-react/dist/esm/icons/link';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Play from 'lucide-react/dist/esm/icons/play';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Bot from 'lucide-react/dist/esm/icons/bot';
import createAIConn from '../ai/createAIConn';

const genId = () => Math.random().toString(36).substring(2, 6).toUpperCase();

// Creates a virtual "connection" object that mimics PeerJS API using Firebase
function createFirebaseConn(roomPath, isHost) {
    const listeners = { data: [] };
    const outbox = isHost ? 'h2g' : 'g2h';
    const inbox = isHost ? 'g2h' : 'h2g';

    // Listen for incoming messages
    const inboxRef = ref(db, `${roomPath}/${inbox}`);
    const unsubscribe = onChildAdded(inboxRef, (snapshot) => {
        const msg = snapshot.val();
        if (msg) listeners.data.forEach(cb => cb(msg));
    });

    return {
        send(data) {
            push(ref(db, `${roomPath}/${outbox}`), data);
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
            // Mark room as closed; cleanup old room data
            set(ref(db, `${roomPath}/status`), 'closed');
        },
        _unsubscribe: unsubscribe,
    };
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
                // Listen for guest's global_ready via messages
                conn.on('data', (d) => {
                    if (d?.type === 'global_ready') setOppReady(true);
                });
                setLobbyState('connected');
            }
        });

        // Cleanup room on unmount
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

            // Signal guest has arrived
            await set(ref(db, `${targetRoom}/guestReady`), true);

            isHostRef.current = false;
            const conn = createFirebaseConn(targetRoom, false);
            connRef.current = conn;

            // Listen for host's global_ready
            conn.on('data', (d) => {
                if (d?.type === 'global_ready') setOppReady(true);
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
        connRef.current?.send({ type: 'global_ready' });
    };

    // Both ready → start game
    useEffect(() => {
        if (myReady && oppReady && connRef.current) {
            const timeout = setTimeout(() => {
                isHandedOffRef.current = true;
                onGameStart(connRef.current, isHostRef.current);
            }, 600);
            return () => clearTimeout(timeout);
        }
    }, [myReady, oppReady, onGameStart]);

    const handleCopy = () => {
        navigator.clipboard.writeText(myId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // RENDER: Connected lobby
    if (lobbyState === 'connected') {
        return (
            <div className="flex flex-col items-center justify-center w-full max-w-sm mx-auto h-full px-4 mb-10">
                <div className="glass-card rounded-3xl p-8 w-full text-center">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full mx-auto flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                        <span className="text-3xl">🤝</span>
                    </div>
                    <h2 className="text-2xl font-black mb-2 text-emerald-400">تم الاتصال بنجاح!</h2>
                    <p className="opacity-60 text-sm font-bold mb-8">هل أنت جاهز لبدء اللعب؟</p>

                    <button
                        onClick={handleReadyClick}
                        disabled={myReady}
                        className={`w-full h-14 rounded-2xl text-lg font-black flex items-center justify-center gap-2 transition-all duration-300
                                   ${myReady ? 'bg-white/10 text-emerald-400 ring-2 ring-emerald-400 scale-[0.98]' : 'glow-button'}`}
                    >
                        {myReady ? 'في انتظار الخصم... ⏳' : <><Play size={20} /> بدء اللعب الآن</>}
                    </button>

                    <div className="mt-8 flex justify-between px-2 text-xs font-bold bg-black/20 py-3 rounded-full">
                        <span className={`flex items-center gap-1 ${myReady ? 'text-emerald-400' : 'opacity-40'}`}>
                            <div className={`w-2 h-2 rounded-full ${myReady ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-white/40'}`}></div> أنت
                        </span>
                        <span className={`flex items-center gap-1 ${oppReady ? 'text-emerald-400' : 'opacity-40'}`}>
                            <div className={`w-2 h-2 rounded-full ${oppReady ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-white/40'}`}></div> الخصم
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-sm mx-auto gap-5">
            {/* Create Room */}
            <div className="glass-card rounded-3xl p-6 w-full text-center">
                <h2 className="text-xl font-black mb-1 flex items-center justify-center gap-2">
                    <Plus size={20} /> إنشاء غرفة جديدة
                </h2>
                <p className="opacity-50 text-xs mb-4">ابعت الكود ده للطرف التاني وتأكد انه دخله</p>

                <div className="flex items-center gap-2 glass-card rounded-2xl p-3 mb-2">
                    <span className="font-mono text-2xl tracking-widest font-black flex-1">{myId}</span>
                    <button onClick={handleCopy} className="opacity-60 hover:opacity-100 transition-opacity p-2">
                        <Copy size={20} className={copied ? "text-emerald-400" : ""} />
                    </button>
                </div>

                {copied && <p className="text-xs text-emerald-400 font-bold animate-pop-in">✓ تم النسخ!</p>}
            </div>

            <div className="flex items-center gap-4 w-full">
                <div className="h-px flex-1" style={{ background: 'var(--glass-border)' }}></div>
                <span className="opacity-40 text-sm font-bold">أو</span>
                <div className="h-px flex-1" style={{ background: 'var(--glass-border)' }}></div>
            </div>

            {/* Join Room */}
            <div className="glass-card rounded-3xl p-6 w-full text-center">
                <h2 className="text-xl font-black mb-1 flex items-center justify-center gap-2">
                    <LinkIcon size={20} /> دخول لغرفة
                </h2>
                <p className="opacity-50 text-xs mb-4">اكتب كود الغرفة اللي ظهرت للخصم</p>

                <input
                    type="text"
                    value={joinId}
                    onChange={(e) => { setJoinId(e.target.value.toUpperCase()); setErrorMsg(''); }}
                    placeholder="XXXX"
                    className={`glass-input w-full rounded-2xl px-4 py-4 text-center font-mono tracking-widest font-black text-xl mb-4 uppercase ${errorMsg ? 'border-2 border-red-500/50' : ''}`}
                    dir="ltr"
                    maxLength={4}
                    onKeyDown={(e) => e.key === 'Enter' && !isConnecting && handleJoin()}
                    disabled={isConnecting}
                />

                {isConnecting && (
                    <div className="flex items-center justify-center gap-2 text-sm font-bold opacity-70 mb-4">
                        <Loader2 className="animate-spin" size={16} /> جاري الاتصال...
                    </div>
                )}

                {errorMsg && (
                    <div className="mb-4 animate-pop-in">
                        <p className="text-xs font-bold text-red-400 mb-3">{errorMsg}</p>
                        <button
                            onClick={() => setErrorMsg('')}
                            className="glass-card rounded-xl px-4 py-2 text-xs font-black flex items-center gap-2 mx-auto hover:opacity-80 transition-opacity"
                        >
                            <RefreshCw size={14} /> حاول تاني
                        </button>
                    </div>
                )}

                <button
                    onClick={handleJoin}
                    disabled={!joinId || isConnecting}
                    className="glow-button w-full h-14 rounded-2xl font-black text-lg flex items-center justify-center gap-2 disabled:opacity-40"
                >
                    {isConnecting ? <Loader2 className="animate-spin" size={22} /> : '🚀 انضمام الآن'}
                </button>
            </div>

            {/* Play vs AI — available for all games */}
            {gameIdPrefix && (
                <>
                    <div className="flex items-center gap-4 w-full">
                        <div className="h-px flex-1" style={{ background: 'var(--glass-border)' }}></div>
                        <span className="opacity-40 text-sm font-bold">أو العب اوفلاين</span>
                        <div className="h-px flex-1" style={{ background: 'var(--glass-border)' }}></div>
                    </div>

                    <div className="glass-card rounded-3xl p-6 w-full text-center">
                        <button
                            onClick={() => {
                                setIsConnecting(true);
                                setTimeout(() => {
                                    onGameStart(createAIConn(gameIdPrefix), true); // player is host against AI
                                }, 800);
                            }}
                            disabled={isConnecting}
                            className="bg-white/10 w-full h-14 rounded-2xl font-black text-lg flex items-center justify-center gap-2 mb-2 hover:bg-emerald-400 hover:text-black transition-colors"
                        >
                            <Bot size={22} /> العب ضد الذكاء الاصطناعي
                        </button>
                        <p className="opacity-50 text-[10px] font-bold">متوسط الصعوبة • لا يحتاج إنترنت</p>
                    </div>
                </>
            )}
        </div>
    );
}
