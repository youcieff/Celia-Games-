import React, { useState, useRef, useEffect, useCallback } from 'react';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import PlayerGameHeader from '../../components/PlayerGameHeader';
import ConnectionPauseOverlay from '../../components/ConnectionPauseOverlay';
import EmotesOverlay from '../../components/EmotesOverlay';
import Logo from '../../components/Logo';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Timer from 'lucide-react/dist/esm/icons/timer';
import Users from 'lucide-react/dist/esm/icons/users';
import Edit3 from 'lucide-react/dist/esm/icons/edit-3';
import { playSound, playHaptic } from '../../lib/audioEngine';
import useProfile from '../../hooks/useProfile';

const TARGET_TIMES = [3, 5, 10]; // seconds

function pad(n) {
    return String(Math.floor(n)).padStart(2, '0');
}

function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const cent = Math.floor((ms % 1000) / 10);
    return `${pad(s)}.${String(cent).padStart(2, '0')}`;
}

export default function GuessTimeGame({ setView }) {
    const connRef = useRef(null);
    const isHostRef = useRef(false);
    const [myProfile] = useProfile();
    const [oppProfile, setOppProfile] = useState(null);

    // lobby → picking-mode → picking-target | picking-roles → ...
    const [gameState, setGameState] = useState('lobby');
    const [gameMode, setGameMode] = useState('target'); // 'target' or 'roles'

    // Target Mode States
    const [targetMs, setTargetMs] = useState(5000);
    const [customTarget, setCustomTarget] = useState('');

    // Roles Mode States
    const [myRole, setMyRole] = useState(null); // 'hider' or 'guesser'
    const [hiderFinished, setHiderFinished] = useState(false);
    const [guesserFinished, setGuesserFinished] = useState(false);
    const [guessValue, setGuessValue] = useState('');

    // Stopwatch
    const [elapsed, setElapsed] = useState(0);
    const [isHolding, setIsHolding] = useState(false);
    const [showTimer, setShowTimer] = useState(true);
    const [myResult, setMyResult] = useState(null);
    const [oppResult, setOppResult] = useState(null);
    const [bothDone, setBothDone] = useState(false);

    const [countdown, setCountdown] = useState(null);
    const [scores, setScores] = useState({ me: 0, opp: 0 });

    const holdStartRef = useRef(null);
    const intervalRef = useRef(null);
    const myResultRef = useRef(null);

    const BLIND_DELAY = 1000;

    const clearHoldInterval = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    const resetRound = () => {
        clearHoldInterval();
        setElapsed(0);
        setIsHolding(false);
        setShowTimer(true);
        setMyResult(null);
        setOppResult(null);
        setBothDone(false);
        setHiderFinished(false);
        setGuesserFinished(false);
        setGuessValue('');
        myResultRef.current = null;
    };

    const handleGameStart = (conn, hostMode, oppProf) => {
        isHostRef.current = hostMode;
        connRef.current = conn;
        if (oppProf) setOppProfile(oppProf);
        conn.on('data', onData);
        setGameState(hostMode ? 'picking-mode' : 'waiting-settings');
    };

    const onData = useCallback((msg) => {
        switch (msg.type) {
            case 'start_target_mode':
                setGameMode('target');
                setTargetMs(msg.targetMs);
                startCountdown();
                break;
            case 'start_roles_mode':
                setGameMode('roles');
                setMyRole(msg.hostIsHider ? 'guesser' : 'hider'); // Opposite of host
                resetRound();
                setGameState('playing-roles');
                playSound('ding');
                break;
            case 'hider_done':
                setOppResult(msg.elapsed);
                setHiderFinished(true);
                break;
            case 'guesser_done':
                setOppResult(msg.guessMs);
                setGuesserFinished(true);
                break;
            case 'opp_result':
                setOppResult(msg.elapsed);
                break;
            case 'restart':
                doRestart();
                break;
            default: break;
        }
    }, []); // eslint-disable-line

    const startCountdown = () => {
        setGameState('countdown');
        resetRound();
        let c = 3;
        setCountdown(c);
        const iv = setInterval(() => {
            c--;
            if (c <= 0) {
                clearInterval(iv);
                setCountdown(null);
                setGameState('playing-target');
                playSound('ding');
            } else {
                setCountdown(c);
                playSound('click');
            }
        }, 1000);
    };

    // ── Host Configuration ───────────────────────────────────────────────
    const handleSelectMode = (mode) => {
        playSound('click');
        setGameMode(mode);
        setGameState(mode === 'target' ? 'picking-target' : 'picking-roles');
    };

    const handlePickTarget = (ms) => {
        playSound('click');
        playHaptic(15);
        setTargetMs(ms);
        connRef.current?.send({ type: 'start_target_mode', targetMs: ms });
        startCountdown();
    };

    const handleCustomTarget = () => {
        const val = parseFloat(customTarget);
        if (!isNaN(val) && val > 0 && val <= 60) {
            handlePickTarget(val * 1000);
        } else {
            playSound('lose');
        }
    };

    const handlePickRole = (hostIsHider) => {
        playSound('click');
        playHaptic(15);
        setMyRole(hostIsHider ? 'hider' : 'guesser');
        connRef.current?.send({ type: 'start_roles_mode', hostIsHider });
        resetRound();
        setGameState('playing-roles');
        playSound('ding');
    };

    // ── Stopwatch Logic (Target Mode) ────────────────────────────────────
    const handleHoldStart = () => {
        if (myResultRef.current !== null) return;
        playSound('stopwatch_start');
        playHaptic(20);
        holdStartRef.current = Date.now();
        setIsHolding(true);
        setElapsed(0);
        setShowTimer(true);
        setTimeout(() => setShowTimer(false), BLIND_DELAY);

        intervalRef.current = setInterval(() => {
            setElapsed(Date.now() - holdStartRef.current);
        }, 30);
    };

    const handleHoldEnd = () => {
        if (!isHolding || myResultRef.current !== null) return;
        clearHoldInterval();
        const finalElapsed = Date.now() - holdStartRef.current;
        myResultRef.current = finalElapsed;
        setElapsed(finalElapsed);
        setIsHolding(false);
        setShowTimer(true);
        setMyResult(finalElapsed);
        playSound('stopwatch_stop');
        playHaptic([30, 20, 50]);
        connRef.current?.send({ type: 'opp_result', elapsed: finalElapsed });
    };

    // ── Stopwatch Logic (Roles Mode - Hider) ─────────────────────────────
    const handleToggleHider = () => {
        if (!isHolding) {
            // Start
            playSound('stopwatch_start');
            playHaptic(20);
            holdStartRef.current = Date.now();
            setIsHolding(true);
            setElapsed(0);
            setShowTimer(true);
            setTimeout(() => setShowTimer(false), BLIND_DELAY);
            intervalRef.current = setInterval(() => {
                setElapsed(Date.now() - holdStartRef.current);
            }, 30);
        } else {
            // Stop
            clearHoldInterval();
            const finalElapsed = Date.now() - holdStartRef.current;
            myResultRef.current = finalElapsed;
            setElapsed(finalElapsed);
            setIsHolding(false);
            setShowTimer(true);
            setMyResult(finalElapsed);
            setHiderFinished(true);
            playSound('stopwatch_stop');
            playHaptic([30, 20, 50]);
            connRef.current?.send({ type: 'hider_done', elapsed: finalElapsed });
        }
    };

    // ── Guess Logic (Roles Mode - Guesser) ───────────────────────────────
    const handleGuessSubmit = () => {
        const val = parseFloat(guessValue);
        if (!isNaN(val) && val > 0) {
            const guessMs = val * 1000;
            setMyResult(guessMs);
            setGuesserFinished(true);
            playSound('click');
            connRef.current?.send({ type: 'guesser_done', guessMs });
        }
    };

    // ── Result Evaluation ────────────────────────────────────────────────
    useEffect(() => {
        if (gameMode === 'target') {
            if (myResult !== null && oppResult !== null && !bothDone) {
                setBothDone(true);
                const myDiff = Math.abs(myResult - targetMs);
                const oppDiff = Math.abs(oppResult - targetMs);
                if (myDiff < oppDiff) {
                    playSound('win');
                    playHaptic([50, 50, 100]);
                    setScores(s => ({ ...s, me: s.me + 1 }));
                } else if (oppDiff < myDiff) {
                    playSound('lose');
                } else {
                    playSound('ding');
                }
                setGameState('result-target');
            }
        } else if (gameMode === 'roles') {
            if (hiderFinished && guesserFinished && myResult !== null && oppResult !== null && !bothDone) {
                setBothDone(true);
                const actual = myRole === 'hider' ? myResult : oppResult;
                const guess = myRole === 'guesser' ? myResult : oppResult;
                const diff = Math.abs(actual - guess);
                
                // Guesser gets point if within 1 second
                if (diff <= 1000) {
                    playSound('win');
                    playHaptic([50, 50, 100]);
                    if (myRole === 'guesser') setScores(s => ({ ...s, me: s.me + 1 }));
                    else setScores(s => ({ ...s, opp: s.opp + 1 }));
                } else {
                    playSound('lose');
                    if (myRole === 'hider') setScores(s => ({ ...s, me: s.me + 1 }));
                    else setScores(s => ({ ...s, opp: s.opp + 1 }));
                }
                setGameState('result-roles');
            }
        }
    }, [myResult, oppResult, bothDone, gameMode, hiderFinished, guesserFinished]); // eslint-disable-line

    const doRestart = () => {
        resetRound();
        setGameState(isHostRef.current ? 'picking-mode' : 'waiting-settings');
    };

    const handleRestart = () => {
        playSound('click');
        connRef.current?.send({ type: 'restart' });
        doRestart();
    };

    const isMyTurn = gameState.startsWith('playing');

    return (
        <>
            <div className="animated-bg"><div className="bg-orb-3" /></div>
            <div className="min-h-dvh max-w-md mx-auto px-4 flex flex-col safe-area-pt overflow-x-hidden overflow-y-auto pb-6">

                {gameState !== 'lobby' ? (
                    <PlayerGameHeader
                        title="خمن الوقت ⏱️"
                        gameEmoji="⏱️"
                        isMyTurn={isMyTurn}
                        oppProfile={oppProfile}
                        myScore={scores.me}
                        oppScore={scores.opp}
                        onLeave={() => { connRef.current?.close(); setView('hub'); }}
                    />
                ) : (
                    <div className="flex justify-between items-center py-4 mb-4">
                        <Logo size="small" />
                        <button onClick={() => setView('hub')} className="glass-card px-4 py-2 rounded-2xl text-xs font-bold hover:scale-105 transition-transform">الرئيسية</button>
                    </div>
                )}

                {gameState === 'lobby' && (
                    <div className="flex-1 flex pb-16 safe-area-pb">
                        <P2PConnectionManager gameIdPrefix="celia-time" onGameStart={handleGameStart} />
                    </div>
                )}

                {/* Host Mode Selection */}
                {gameState === 'picking-mode' && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in px-2">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center border border-white/10 shadow-2xl">
                            <h2 className="text-2xl font-black mb-6">اختار نظام اللعب</h2>
                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={() => handleSelectMode('target')}
                                    className="glass-card rounded-2xl p-5 flex flex-col items-center gap-2 hover:border-emerald-400/50 hover:bg-white/5 transition-all"
                                >
                                    <Timer size={32} className="text-emerald-400" />
                                    <span className="font-black text-lg">تحدي الهدف</span>
                                    <span className="text-xs opacity-60 font-bold">أنتم الاتنين تحاولوا تقفوا عند نفس الوقت</span>
                                </button>
                                <button
                                    onClick={() => handleSelectMode('roles')}
                                    className="glass-card rounded-2xl p-5 flex flex-col items-center gap-2 hover:border-amber-400/50 hover:bg-white/5 transition-all"
                                >
                                    <Users size={32} className="text-amber-400" />
                                    <span className="font-black text-lg">تحدي الأدوار</span>
                                    <span className="text-xs opacity-60 font-bold">واحد يشغل ويوقف الساعة، والتاني يخمن الوقت</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Host Target Selection */}
                {gameState === 'picking-target' && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in px-2">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center border border-emerald-400/30">
                            <h2 className="text-2xl font-black mb-4">اختار الوقت المستهدف</h2>
                            <div className="grid grid-cols-3 gap-3 mb-6">
                                {TARGET_TIMES.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => handlePickTarget(s * 1000)}
                                        className="glass-card rounded-2xl py-4 flex flex-col items-center hover:border-emerald-400/50 transition-all"
                                    >
                                        <span className="text-3xl font-black text-emerald-400">{s}</span>
                                        <span className="text-xs opacity-60">ثانية</span>
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={customTarget}
                                    onChange={e => setCustomTarget(e.target.value)}
                                    placeholder="أو اكتب ثواني مخصصة"
                                    className="glass-input flex-1 rounded-xl px-4 font-bold text-center"
                                />
                                <button
                                    onClick={handleCustomTarget}
                                    className="glow-button px-4 rounded-xl font-bold text-sm"
                                >
                                    ابدأ
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Host Roles Selection */}
                {gameState === 'picking-roles' && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in px-2">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center border border-amber-400/30">
                            <h2 className="text-2xl font-black mb-6">توزيع الأدوار</h2>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => handlePickRole(true)}
                                    className="glass-card rounded-2xl p-4 flex flex-col items-center hover:border-amber-400/50 transition-all"
                                >
                                    <span className="font-black text-amber-400">أنا هشغل الساعة ⏱️</span>
                                    <span className="text-xs opacity-60">والخصم هيخمن</span>
                                </button>
                                <button
                                    onClick={() => handlePickRole(false)}
                                    className="glass-card rounded-2xl p-4 flex flex-col items-center hover:border-emerald-400/50 transition-all"
                                >
                                    <span className="font-black text-emerald-400">الخصم يشغل الساعة ⏱️</span>
                                    <span className="text-xs opacity-60">وأنا هخمن</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Guest Waiting */}
                {gameState === 'waiting-settings' && (
                    <div className="flex-1 flex items-center justify-center animate-fade-in">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center border border-white/10">
                            <div className="text-5xl mb-4 animate-pulse">⚙️</div>
                            <h2 className="text-2xl font-black mb-2">في الانتظار...</h2>
                            <p className="opacity-60 text-sm font-bold">المضيف بيختار إعدادات اللعبة</p>
                        </div>
                    </div>
                )}

                {/* Target Mode Countdown */}
                {gameState === 'countdown' && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in gap-4">
                        <p className="opacity-60 font-bold">الهدف: <span className="text-white font-black">{targetMs / 1000} ثانية</span></p>
                        <div className="text-[120px] font-black leading-none text-emerald-400 animate-pop-in drop-shadow-[0_0_40px_rgba(52,211,153,0.5)]">
                            {countdown}
                        </div>
                    </div>
                )}

                {/* Playing Target Mode */}
                {gameState === 'playing-target' && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in gap-6">
                        <div className="glass-card rounded-2xl px-6 py-3 text-center border border-emerald-400/20">
                            <p className="text-xs opacity-60 font-bold">الهدف</p>
                            <p className="text-4xl font-black text-emerald-400">{formatTime(targetMs)}</p>
                        </div>

                        <div className="glass-card rounded-3xl w-64 h-32 flex items-center justify-center border border-white/10 shadow-2xl">
                            {showTimer ? (
                                <span className={`text-5xl font-black tracking-widest ${isHolding ? 'text-emerald-400' : 'text-white'}`}>
                                    {formatTime(elapsed)}
                                </span>
                            ) : (
                                <span className="text-2xl opacity-40 font-black">❓ ❓ . ❓ ❓</span>
                            )}
                        </div>

                        {myResult === null ? (
                            <button
                                onPointerDown={handleHoldStart}
                                onPointerUp={handleHoldEnd}
                                onPointerLeave={handleHoldEnd}
                                className={`w-48 h-48 rounded-full font-black text-xl transition-all select-none ${isHolding ? 'scale-95 shadow-[0_0_60px_rgba(52,211,153,0.4)] border-emerald-400' : 'hover:scale-105 border-white/20'}`}
                                style={{ background: isHolding ? 'radial-gradient(circle, #10b981, #064e3b)' : 'rgba(255,255,255,0.05)', borderWidth: 3 }}
                            >
                                {isHolding ? '🛑 اترك!' : '▶ امسك!'}
                            </button>
                        ) : (
                            <div className="glass-card rounded-3xl px-8 py-5 text-center animate-pop-in">
                                <p className="opacity-60 text-sm font-bold">وقفت على</p>
                                <p className="text-4xl font-black text-emerald-400">{formatTime(myResult)}</p>
                                <p className="opacity-50 text-xs mt-2 animate-pulse">في انتظار الخصم...</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Playing Roles Mode */}
                {gameState === 'playing-roles' && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in gap-6">
                        
                        {/* Hider View */}
                        {myRole === 'hider' && (
                            <>
                                <div className="glass-card rounded-3xl w-64 h-32 flex items-center justify-center border border-amber-400/20 shadow-2xl">
                                    {showTimer ? (
                                        <span className="text-5xl font-black tracking-widest text-amber-400">
                                            {formatTime(elapsed)}
                                        </span>
                                    ) : (
                                        <span className="text-2xl opacity-40 font-black">الساعة شغالة...</span>
                                    )}
                                </div>
                                {!hiderFinished ? (
                                    <button
                                        onClick={handleToggleHider}
                                        className="w-48 h-48 rounded-full font-black text-2xl transition-all shadow-[0_8px_32px_rgba(0,0,0,0.4)] active:scale-95"
                                        style={{
                                            background: isHolding ? '#f43f5e' : '#10b981',
                                            boxShadow: isHolding ? '0 0 40px rgba(244,63,94,0.5)' : '0 0 40px rgba(16,185,129,0.3)'
                                        }}
                                    >
                                        {isHolding ? '🛑 وقّف' : '▶ ابدأ'}
                                    </button>
                                ) : (
                                    <div className="glass-card rounded-3xl px-8 py-5 text-center animate-pop-in">
                                        <p className="opacity-60 text-sm font-bold">الوقت الفعلي</p>
                                        <p className="text-4xl font-black text-amber-400">{formatTime(myResult)}</p>
                                        <p className="opacity-50 text-xs mt-2 animate-pulse">الخصم بيخمن دلوقتي...</p>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Guesser View */}
                        {myRole === 'guesser' && (
                            <>
                                {!hiderFinished ? (
                                    <div className="glass-card rounded-3xl px-8 py-10 text-center border border-white/10 animate-pulse">
                                        <Timer size={48} className="mx-auto mb-4 opacity-50" />
                                        <h2 className="text-xl font-black mb-2">الخصم بيحسب الوقت</h2>
                                        <p className="opacity-50 text-sm font-bold">ركز معاه عشان تخمن هو وقف بعد كام ثانية...</p>
                                    </div>
                                ) : !guesserFinished ? (
                                    <div className="glass-card rounded-3xl p-6 text-center border border-sky-400/30 animate-pop-in">
                                        <h2 className="text-xl font-black mb-4">الخصم وقّف الساعة!</h2>
                                        <p className="opacity-60 text-sm mb-4">تفتكر الوقت كام؟ (بالثواني)</p>
                                        <input
                                            type="number"
                                            value={guessValue}
                                            onChange={e => setGuessValue(e.target.value)}
                                            className="w-32 text-center text-3xl font-black bg-white/5 border border-white/10 rounded-2xl py-3 mb-4 outline-none focus:border-sky-400"
                                            placeholder="0.0"
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleGuessSubmit}
                                            className="glow-button w-full h-12 rounded-xl text-sm font-black"
                                        >
                                            تأكيد التخمين
                                        </button>
                                    </div>
                                ) : (
                                    <div className="glass-card rounded-3xl px-8 py-5 text-center animate-pop-in">
                                        <p className="opacity-60 text-sm font-bold">تخمينك</p>
                                        <p className="text-4xl font-black text-sky-400">{formatTime(myResult)}</p>
                                        <p className="opacity-50 text-xs mt-2">في انتظار النتيجة...</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Target Result */}
                {gameState === 'result-target' && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in gap-5 px-2">
                        {(() => {
                            const myDiff = Math.abs(myResult - targetMs);
                            const oppDiff = Math.abs(oppResult - targetMs);
                            const winner = myDiff < oppDiff ? 'me' : (oppDiff < myDiff ? 'opp' : 'draw');
                            return (
                                <>
                                    <div className={`glass-card rounded-3xl p-6 w-full max-w-sm text-center border shadow-2xl animate-pop-in ${winner === 'me' ? 'border-emerald-400/50' : winner === 'opp' ? 'border-rose-400/50' : 'border-amber-400/50'}`}>
                                        <div className="text-5xl mb-2">{winner === 'me' ? '🎉' : winner === 'opp' ? '💔' : '⚖️'}</div>
                                        <h2 className={`text-3xl font-black ${winner === 'me' ? 'text-emerald-400' : winner === 'opp' ? 'text-rose-400' : 'text-amber-400'}`}>
                                            {winner === 'me' ? 'كسبت!' : winner === 'opp' ? 'خسرت!' : 'تعادل!'}
                                        </h2>
                                        <p className="opacity-60 text-xs mt-1 font-bold">الهدف: {formatTime(targetMs)}</p>
                                    </div>
                                    <div className="glass-card rounded-3xl p-5 w-full max-w-sm border border-white/10">
                                        <div className="flex gap-3">
                                            <div className={`flex-1 rounded-2xl p-4 text-center ${winner === 'me' ? 'bg-emerald-500/20' : 'glass-card'}`}>
                                                <p className="text-xs opacity-60 font-bold">أنت</p>
                                                <p className="text-2xl font-black">{formatTime(myResult)}</p>
                                                <p className="text-[10px] mt-1 text-emerald-400">فرق {formatTime(myDiff)}</p>
                                            </div>
                                            <div className={`flex-1 rounded-2xl p-4 text-center ${winner === 'opp' ? 'bg-rose-500/20' : 'glass-card'}`}>
                                                <p className="text-xs opacity-60 font-bold">{oppProfile?.nickname}</p>
                                                <p className="text-2xl font-black">{formatTime(oppResult)}</p>
                                                <p className="text-[10px] mt-1 text-rose-400">فرق {formatTime(oppDiff)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                        <button onClick={handleRestart} className="glow-button w-full max-w-sm h-14 rounded-2xl font-black flex items-center justify-center gap-2"><RotateCcw size={18} /> العبوا تاني</button>
                    </div>
                )}

                {/* Roles Result */}
                {gameState === 'result-roles' && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in gap-5 px-2">
                        {(() => {
                            const actual = myRole === 'hider' ? myResult : oppResult;
                            const guess = myRole === 'guesser' ? myResult : oppResult;
                            const diff = Math.abs(actual - guess);
                            const guesserWon = diff <= 1000;
                            const iWon = (myRole === 'guesser' && guesserWon) || (myRole === 'hider' && !guesserWon);

                            return (
                                <>
                                    <div className={`glass-card rounded-3xl p-6 w-full max-w-sm text-center border shadow-2xl animate-pop-in ${iWon ? 'border-emerald-400/50' : 'border-rose-400/50'}`}>
                                        <div className="text-5xl mb-2">{iWon ? '🎉' : '💔'}</div>
                                        <h2 className={`text-3xl font-black ${iWon ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {iWon ? 'كسبت!' : 'خسرت!'}
                                        </h2>
                                        <p className="opacity-60 text-xs mt-2 font-bold">
                                            المخمن {guesserWon ? 'نجح (الفرق أقل من ثانية)' : 'فشل (الفرق كبير)'}
                                        </p>
                                    </div>
                                    <div className="glass-card rounded-3xl p-5 w-full max-w-sm border border-white/10">
                                        <div className="flex gap-3">
                                            <div className="flex-1 rounded-2xl p-4 text-center glass-card">
                                                <p className="text-xs opacity-60 font-bold">الوقت الفعلي</p>
                                                <p className="text-2xl font-black text-amber-400">{formatTime(actual)}</p>
                                            </div>
                                            <div className="flex-1 rounded-2xl p-4 text-center glass-card">
                                                <p className="text-xs opacity-60 font-bold">التخمين</p>
                                                <p className="text-2xl font-black text-sky-400">{formatTime(guess)}</p>
                                            </div>
                                        </div>
                                        <p className="text-center text-xs mt-3 opacity-60 font-bold">الفرق: {formatTime(diff)}</p>
                                    </div>
                                </>
                            );
                        })()}
                        <button onClick={handleRestart} className="glow-button w-full max-w-sm h-14 rounded-2xl font-black flex items-center justify-center gap-2"><RotateCcw size={18} /> العبوا تاني</button>
                    </div>
                )}
            </div>

            <ConnectionPauseOverlay conn={connRef.current} onLeave={() => { connRef.current?.close(); setView('hub'); }} />
            {gameState.startsWith('playing') && <EmotesOverlay conn={connRef.current} />}
        </>
    );
}
