import React, { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Plus from 'lucide-react/dist/esm/icons/plus';
import LinkIcon from 'lucide-react/dist/esm/icons/link';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import Play from 'lucide-react/dist/esm/icons/play';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';

const genId = () => Math.random().toString(36).substring(2, 6).toUpperCase();
const JOIN_TIMEOUT_MS = 60000;  // 60 seconds total timeout
const RETRY_INTERVAL_MS = 8000; // retry every 8 seconds

export default function P2PConnectionManager({ gameIdPrefix, onGameStart }) {
    const [myId, setMyId] = useState(null);
    const [joinId, setJoinId] = useState('');
    const [copied, setCopied] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [retryCount, setRetryCount] = useState(0);
    const [countdown, setCountdown] = useState(0);

    const [lobbyState, setLobbyState] = useState('lobby');
    const [myReady, setMyReady] = useState(false);
    const [oppReady, setOppReady] = useState(false);

    const peerRef = useRef(null);
    const connRef = useRef(null);
    const isHostRef = useRef(false);
    const readyHandlerRef = useRef(null);
    const isHandedOffRef = useRef(false);
    const retryTimerRef = useRef(null);
    const deadlineTimerRef = useRef(null);
    const countdownIntervalRef = useRef(null);
    const isDoneRef = useRef(false);

    useEffect(() => {
        const id = genId();
        let peer = null;

        const initTimeout = setTimeout(() => {
            peer = new Peer(`${gameIdPrefix}-${id}`, {
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        { urls: 'stun:stun2.l.google.com:19302' },
                    ],
                },
            });

            peer.on('open', (assignedId) => {
                setMyId(assignedId.replace(`${gameIdPrefix}-`, ''));
            });

            peer.on('disconnected', () => {
                setTimeout(() => {
                    if (peer && !peer.destroyed) peer.reconnect();
                }, 2000);
            });

            peer.on('connection', (conn) => {
                conn.on('open', () => {
                    isHostRef.current = true;
                    connRef.current = conn;
                    setLobbyState('connected');
                    wireReadyHandler(conn);
                });
            });

            peer.on('error', (err) => {
                if (err.type === 'peer-unavailable') {
                    // Don't immediately show error – retry logic will handle it
                    if (!isDoneRef.current) {
                        triggerRetry();
                    }
                } else if (err.type === 'network' || err.type === 'server-error') {
                    // Reconnect on network errors
                    setTimeout(() => {
                        if (peer && !peer.destroyed) peer.reconnect();
                    }, 2000);
                }
            });

            peerRef.current = peer;
        }, 100);

        return () => {
            clearTimeout(initTimeout);
            clearAllTimers();
            if (peer && !isHandedOffRef.current) {
                peer.destroy();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameIdPrefix]);

    const clearAllTimers = () => {
        clearTimeout(retryTimerRef.current);
        clearTimeout(deadlineTimerRef.current);
        clearInterval(countdownIntervalRef.current);
    };

    const wireReadyHandler = (conn) => {
        const handler = (d) => {
            if (d && d.type === 'global_ready') {
                setOppReady(true);
            }
        };
        readyHandlerRef.current = handler;
        conn.on('data', handler);
    };

    const attemptConnect = useCallback((currentJoinId, attempt) => {
        if (isDoneRef.current) return;

        setRetryCount(attempt);
        setErrorMsg('');

        if (peerRef.current && peerRef.current.disconnected && !peerRef.current.destroyed) {
            peerRef.current.reconnect();
        }

        if (!peerRef.current || peerRef.current.destroyed) return;

        const conn = peerRef.current.connect(`${gameIdPrefix}-${currentJoinId.trim()}`, { reliable: true });

        conn.on('open', () => {
            if (isDoneRef.current) return;
            isDoneRef.current = true;
            clearAllTimers();
            isHostRef.current = false;
            connRef.current = conn;
            setLobbyState('connected');
            setIsConnecting(false);
            setCountdown(0);
            wireReadyHandler(conn);
        });

        conn.on('error', () => {
            // Let the peer 'peer-unavailable' error handle retries
        });
    }, [gameIdPrefix]);

    const triggerRetry = useCallback(() => {
        if (isDoneRef.current) return;
        // Schedule next attempt
        retryTimerRef.current = setTimeout(() => {
            setRetryCount(prev => {
                const next = prev + 1;
                attemptConnect(joinId, next);
                return next;
            });
        }, RETRY_INTERVAL_MS);
    }, [attemptConnect, joinId]);

    const handleJoin = () => {
        if (!joinId || joinId.length < 4) return;
        setIsConnecting(true);
        setErrorMsg('');
        isDoneRef.current = false;
        clearAllTimers();

        // Start countdown timer
        const startTime = Date.now();
        setCountdown(JOIN_TIMEOUT_MS / 1000);
        countdownIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, Math.ceil((JOIN_TIMEOUT_MS - elapsed) / 1000));
            setCountdown(remaining);
        }, 1000);

        // Hard deadline after 60 seconds
        deadlineTimerRef.current = setTimeout(() => {
            if (!isDoneRef.current) {
                isDoneRef.current = true;
                clearAllTimers();
                setErrorMsg('انتهى الوقت. تأكد من الكود وإن الخصم فاتح اللعبة.');
                setIsConnecting(false);
                setCountdown(0);
            }
        }, JOIN_TIMEOUT_MS);

        attemptConnect(joinId, 0);
    };

    const handleRetry = () => {
        isDoneRef.current = false;
        clearAllTimers();
        setRetryCount(0);
        setCountdown(0);
        setIsConnecting(false);
        setErrorMsg('');
    };

    const handleReadyClick = () => {
        setMyReady(true);
        if (connRef.current) {
            connRef.current.send({ type: 'global_ready' });
        }
    };

    useEffect(() => {
        if (myReady && oppReady && connRef.current) {
            const timeout = setTimeout(() => {
                const conn = connRef.current;
                if (readyHandlerRef.current) {
                    conn.off('data', readyHandlerRef.current);
                    readyHandlerRef.current = null;
                }
                isHandedOffRef.current = true;
                onGameStart(conn, isHostRef.current);
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
                <div className="glass-card rounded-3xl p-8 w-full text-center animate-scale-in">
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

                {myId ? (
                    <div className="flex items-center gap-2 glass-card rounded-2xl p-3 mb-2">
                        <span className="font-mono text-2xl tracking-widest font-black flex-1">{myId}</span>
                        <button onClick={handleCopy} className="opacity-60 hover:opacity-100 transition-opacity p-2">
                            <Copy size={20} className={copied ? "text-emerald-400" : ""} />
                        </button>
                    </div>
                ) : (
                    <div className="flex justify-center py-3">
                        <Loader2 className="animate-spin opacity-40" size={28} />
                    </div>
                )}

                {copied && (
                    <p className="text-xs text-emerald-400 font-bold animate-pop-in">✓ تم النسخ!</p>
                )}
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
                    onChange={(e) => {
                        setJoinId(e.target.value.toUpperCase());
                        setErrorMsg('');
                    }}
                    placeholder="XXXX"
                    className={`glass-input w-full rounded-2xl px-4 py-4 text-center font-mono tracking-widest font-black text-xl mb-4 uppercase ${errorMsg ? 'border-2 border-red-500/50' : ''}`}
                    dir="ltr"
                    maxLength={4}
                    onKeyDown={(e) => e.key === 'Enter' && !isConnecting && handleJoin()}
                    disabled={isConnecting}
                />

                {isConnecting && (
                    <div className="mb-4">
                        <div className="flex items-center justify-center gap-2 text-sm font-bold opacity-80 mb-2">
                            <Loader2 className="animate-spin" size={16} />
                            {retryCount === 0 ? 'جاري الاتصال...' : `محاولة رقم ${retryCount + 1}...`}
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1.5 mb-1">
                            <div
                                className="h-1.5 rounded-full transition-all duration-1000"
                                style={{
                                    width: `${(countdown / (JOIN_TIMEOUT_MS / 1000)) * 100}%`,
                                    background: countdown > 20 ? 'var(--primary-color)' : countdown > 10 ? '#f59e0b' : '#ef4444'
                                }}
                            />
                        </div>
                        <p className="text-[10px] opacity-50">{countdown} ثانية متبقية</p>
                    </div>
                )}

                {errorMsg && (
                    <div className="mb-4 animate-pop-in">
                        <p className="text-xs font-bold text-red-400 mb-3">{errorMsg}</p>
                        <button
                            onClick={handleRetry}
                            className="glass-card rounded-xl px-4 py-2 text-xs font-black flex items-center gap-2 mx-auto hover:opacity-80 transition-opacity"
                        >
                            <RefreshCw size={14} /> حاول تاني
                        </button>
                    </div>
                )}

                <button
                    onClick={isConnecting ? undefined : handleJoin}
                    disabled={!joinId || isConnecting}
                    className="glow-button w-full h-14 rounded-2xl font-black text-lg flex items-center justify-center gap-2 disabled:opacity-40"
                >
                    {isConnecting ? <Loader2 className="animate-spin" size={22} /> : '🚀 انضمام الآن'}
                </button>
            </div>
        </div>
    );
}
