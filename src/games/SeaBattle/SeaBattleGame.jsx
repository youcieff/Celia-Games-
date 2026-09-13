import React, { useState, useEffect, useRef } from 'react';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import Logo from '../../components/Logo';
import Target from 'lucide-react/dist/esm/icons/target';
import Anchor from 'lucide-react/dist/esm/icons/anchor';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Film from 'lucide-react/dist/esm/icons/film';
import { playSound, playHaptic } from '../../lib/audioEngine';
import EmotesOverlay from '../../components/EmotesOverlay';
import PlayerGameHeader from '../../components/PlayerGameHeader';
import ConnectionPauseOverlay from '../../components/ConnectionPauseOverlay';
import MatchRecapModal from '../../components/MatchRecapModal';
import useProfile from '../../hooks/useProfile';

const SIZE = 8;
const TOTAL_HEALTH = 11;

export default function SeaBattleGame({ setView }) {
    const connRef = useRef(null);
    const isHostRef = useRef(false);

    const [myProfile] = useProfile();
    const [oppProfile, setOppProfile] = useState(null);

    const [gameState, setGameState] = useState('lobby'); // lobby, setup, waiting-ready, playing, finished

    // Setup State
    const [placedShips, setPlacedShips] = useState([]); // array of cells: { r, c }

    // Game State
    const [myGrid, setMyGrid] = useState(Array.from({ length: SIZE }, () => Array(SIZE).fill(null)));
    const [targetGrid, setTargetGrid] = useState(Array.from({ length: SIZE }, () => Array(SIZE).fill(null)));
    
    // Authoritative turn state: 'host' | 'guest'
    const [currentTurn, setCurrentTurn] = useState('host');
    const [oppReady, setOppReady] = useState(false);

    // Stats
    const [hitsOnMe, setHitsOnMe] = useState(0);
    const [hitsOnOpp, setHitsOnOpp] = useState(0);

    // Match Replay & History
    const [moveHistory, setMoveHistory] = useState([]);
    const [showRecap, setShowRecap] = useState(false);

    // Pending shot watchdog ref
    const pendingShotRef = useRef(null);

    // Refs for safe access in event listeners
    const stateRef = useRef({
        placedShips,
        myGrid,
        targetGrid,
        currentTurn,
        hitsOnMe,
        hitsOnOpp,
        gameState,
        oppReady
    });

    useEffect(() => {
        stateRef.current = {
            placedShips,
            myGrid,
            targetGrid,
            currentTurn,
            hitsOnMe,
            hitsOnOpp,
            gameState,
            oppReady
        };
    }, [placedShips, myGrid, targetGrid, currentTurn, hitsOnMe, hitsOnOpp, gameState, oppReady]);

    const isHost = isHostRef.current;
    const isMyTurn = (isHost && currentTurn === 'host') || (!isHost && currentTurn === 'guest');

    let overallWinner = null;
    if (hitsOnMe >= TOTAL_HEALTH) overallWinner = 'opp';
    if (hitsOnOpp >= TOTAL_HEALTH) overallWinner = 'me';

    // Handle game finish
    useEffect(() => {
        if (gameState === 'playing') {
            if (hitsOnMe >= TOTAL_HEALTH) {
                playSound('lose');
                setGameState('finished');
            } else if (hitsOnOpp >= TOTAL_HEALTH) {
                playSound('win');
                playHaptic([100, 50, 100, 50, 200]);
                setGameState('finished');
            }
        }
    }, [hitsOnMe, hitsOnOpp, gameState]);

    const handleGameStart = (conn, hostMode, oppProf) => {
        isHostRef.current = hostMode;
        connRef.current = conn;
        if (oppProf) setOppProfile(oppProf);
        conn.on('data', onData);
        setGameState('setup');
    };

    const onData = (msg) => {
        const cur = stateRef.current;

        if (msg.type === 'ready') {
            setOppReady(true);
            // ALWAYS ACKNOWLEDGE READY to prevent opponent staying in waiting-ready
            connRef.current?.send({ type: 'ready-ack' });
            if (cur.gameState === 'waiting-ready') {
                setGameState('playing');
                playSound('ding');
            }
        } else if (msg.type === 'ready-ack') {
            setOppReady(true);
            if (cur.gameState === 'waiting-ready') {
                setGameState('playing');
                playSound('ding');
            }
        } else if (msg.type === 'shot') {
            const { r, c, shooter } = msg;

            // Check if it hits any of my ships
            const isHit = cur.placedShips.some(s => s.r === r && s.c === c);

            // Update my grid
            setMyGrid(prev => {
                const newGrid = prev.map(arr => [...arr]);
                newGrid[r][c] = isHit ? 'hit' : 'miss';
                return newGrid;
            });

            if (isHit) {
                setHitsOnMe(prev => prev + 1);
                playSound('explosion');
                playHaptic(100);
            } else {
                playSound('splash');
                playHaptic(20);
            }

            // Record in history for recap
            setMoveHistory(prev => [...prev, { r, c, shooter: 'opp', result: isHit ? 'hit' : 'miss' }]);

            // Next turn is explicitly passed
            const nextTurn = shooter === 'host' ? 'guest' : 'host';
            setCurrentTurn(nextTurn);

            // Reply back with result and authoritative next turn
            connRef.current?.send({
                type: 'shot-result',
                r,
                c,
                result: isHit ? 'hit' : 'miss',
                nextTurn
            });

        } else if (msg.type === 'shot-result') {
            const { r, c, result, nextTurn } = msg;

            // Clear pending shot lock
            pendingShotRef.current = null;

            // Update target grid
            setTargetGrid(prev => {
                const newTarget = prev.map(arr => [...arr]);
                newTarget[r][c] = result;
                return newTarget;
            });

            if (result === 'hit') {
                setHitsOnOpp(prev => prev + 1);
                playSound('explosion');
                playHaptic(50);
            } else {
                playSound('splash');
            }

            // Record in history for recap
            setMoveHistory(prev => [...prev, { r, c, shooter: 'me', result }]);

            // Update turn explicitly
            if (nextTurn) {
                setCurrentTurn(nextTurn);
            }

        } else if (msg.type === 'sync') {
            // Heartbeat sync from host
            if (!isHostRef.current) {
                if (msg.currentTurn && msg.currentTurn !== cur.currentTurn) {
                    setCurrentTurn(msg.currentTurn);
                }
            }
        } else if (msg.type === 'restart') {
            doRestart();
        }
    };

    // Heartbeat: Retry sending ready while waiting
    useEffect(() => {
        let interval;
        if (gameState === 'waiting-ready' && !oppReady) {
            interval = setInterval(() => {
                connRef.current?.send({ type: 'ready' });
            }, 1000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [gameState, oppReady]);

    // Shot watchdog: resend if lost in transit (timeout > 2.5s)
    useEffect(() => {
        const interval = setInterval(() => {
            if (gameState === 'playing' && pendingShotRef.current) {
                const elapsed = Date.now() - pendingShotRef.current.time;
                if (elapsed > 2500) {
                    connRef.current?.send({
                        type: 'shot',
                        r: pendingShotRef.current.r,
                        c: pendingShotRef.current.c,
                        shooter: isHost ? 'host' : 'guest'
                    });
                    pendingShotRef.current.time = Date.now();
                }
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [gameState, isHost]);

    // Host heartbeat sync every 3.5s
    useEffect(() => {
        let interval;
        if (gameState === 'playing' && isHost) {
            interval = setInterval(() => {
                connRef.current?.send({
                    type: 'sync',
                    currentTurn: stateRef.current.currentTurn,
                    hitsOnHost: stateRef.current.hitsOnMe,
                    hitsOnGuest: stateRef.current.hitsOnOpp
                });
            }, 3500);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [gameState, isHost]);

    const handleToggleCell = (r, c) => {
        if (gameState !== 'setup') return;
        const exists = placedShips.find(cell => cell.r === r && cell.c === c);

        if (exists) {
            setPlacedShips(prev => prev.filter(cell => cell.r !== r || cell.c !== c));
            playSound('tap');
            playHaptic(10);
        } else {
            if (placedShips.length < TOTAL_HEALTH) {
                setPlacedShips(prev => [...prev, { r, c }]);
                playSound('pop');
                playHaptic(15);
            }
        }
    };

    const handleDragCell = (r, c) => {
        if (gameState !== 'setup') return;
        const exists = placedShips.find(cell => cell.r === r && cell.c === c);
        if (!exists && placedShips.length < TOTAL_HEALTH) {
            setPlacedShips(prev => [...prev, { r, c }]);
            playSound('pop');
            playHaptic(10);
        }
    };

    const handleUndoShip = () => {
        if (placedShips.length === 0) return;
        setPlacedShips(prev => prev.slice(0, -1));
        playSound('tap');
    };

    const handleReady = () => {
        setGameState('waiting-ready');
        connRef.current?.send({ type: 'ready' });
        playSound('ding');
        if (oppReady) {
            setGameState('playing');
        }
    };

    const handleShoot = (r, c) => {
        if (gameState !== 'playing' || !isMyTurn || overallWinner || pendingShotRef.current) return;
        if (targetGrid[r][c] !== null) return; // already shot

        playSound('click');
        playHaptic(15);

        // Mark as pending locally so user cannot double-click
        pendingShotRef.current = { r, c, time: Date.now() };

        setTargetGrid(prev => {
            const newTarget = prev.map(arr => [...arr]);
            newTarget[r][c] = 'pending';
            return newTarget;
        });

        connRef.current?.send({
            type: 'shot',
            r,
            c,
            shooter: isHost ? 'host' : 'guest'
        });
    };

    const doRestart = () => {
        pendingShotRef.current = null;
        setPlacedShips([]);
        setMyGrid(Array.from({ length: SIZE }, () => Array(SIZE).fill(null)));
        setTargetGrid(Array.from({ length: SIZE }, () => Array(SIZE).fill(null)));
        setCurrentTurn('host');
        setOppReady(false);
        setHitsOnMe(0);
        setHitsOnOpp(0);
        setMoveHistory([]);
        setShowRecap(false);
        setGameState('setup');
    };

    const handleRestart = () => {
        doRestart();
        connRef.current?.send({ type: 'restart' });
    };

    const renderMyGridPreview = () => {
        const visualGrid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
        placedShips.forEach(cell => {
            if (visualGrid[cell.r]) visualGrid[cell.r][cell.c] = true;
        });

        return (
            <div className="w-[120px] aspect-square bg-[#0a192f]/50 border border-emerald-400/30 rounded-xl relative overflow-hidden flex flex-col p-1 gap-px mb-2">
                {visualGrid.map((rowArr, r) => (
                    <div key={r} className="flex-1 flex gap-px">
                        {rowArr.map((cell, c) => {
                            const status = myGrid[r][c];
                            let cellClass = 'bg-emerald-400/10';
                            if (status === 'hit') {
                                cellClass = 'bg-rose-600 shadow-[0_0_10px_rgba(225,29,72,0.8)] relative';
                            } else if (cell) {
                                cellClass = 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]';
                            } else if (status === 'miss') {
                                cellClass = 'bg-white/40';
                            }

                            return (
                                <div key={c} className={`flex-1 rounded-[2px] overflow-hidden flex items-center justify-center ${cellClass}`}>
                                    {status === 'hit' && <span className="text-[8px] leading-none animate-pulse">🔥</span>}
                                </div>
                            );
                        })}
                    </div>
                ))}
                {myGrid.flat().some(x => x) && (
                    <div className="absolute inset-0 flex items-center justify-center font-bold text-xs opacity-50 bg-black/40 pointer-events-none">
                        أسطولك
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <div className="animated-bg"><div className="bg-orb-3" style={{ background: 'var(--accent-glow)' }} /></div>
            <div className="min-h-dvh max-w-lg mx-auto flex flex-col safe-area-pt overflow-x-hidden overflow-y-auto pb-4">

                {/* Player Cards Header during playing & finished */}
                {gameState !== 'lobby' && (
                    <PlayerGameHeader
                        title="حرب السفن ⚓"
                        gameEmoji="⚓"
                        isMyTurn={isMyTurn}
                        oppProfile={oppProfile}
                        myScore={hitsOnOpp}
                        oppScore={hitsOnMe}
                        onLeave={() => { connRef.current?.close(); setView('hub'); }}
                    />
                )}

                {/* Lobby Header */}
                {gameState === 'lobby' && (
                    <div className="px-4 flex justify-between items-center py-4 mb-2">
                        <Logo size="small" />
                        <button
                            onClick={() => setView('hub')}
                            className="glass-card px-4 py-2 rounded-2xl text-xs font-bold hover:scale-105 transition-transform"
                        >
                            الرئيسية
                        </button>
                    </div>
                )}

                {/* Lobby Screen */}
                {gameState === 'lobby' && (
                    <div className="flex-1 flex pb-16 safe-area-pb px-4">
                        <P2PConnectionManager gameIdPrefix="celia-sea" onGameStart={handleGameStart} />
                    </div>
                )}

                {/* Ship Setup Screen */}
                {gameState === 'setup' && (
                    <div className="flex-1 flex flex-col items-center px-4 pb-4 animate-fade-in">
                        <h2 className="text-xl font-black mb-1">🚢 توزيع الأسطول البحري</h2>
                        <p className="opacity-60 text-[11px] font-bold mb-3">
                            {placedShips.length < TOTAL_HEALTH
                                ? `اضغط أو اسحب لتحديد ${TOTAL_HEALTH - placedShips.length} مربعات للأسطول`
                                : 'تمام! الأسطول جاهز كلياً ✅'}
                        </p>

                        {/* Setup Grid Preview */}
                        <div
                            className="w-[95%] aspect-square bg-[#0a192f]/60 border-2 border-emerald-400/30 rounded-3xl relative overflow-hidden p-2 grid grid-cols-8 gap-1 shadow-2xl mb-4 touch-none"
                            onPointerDown={(e) => {
                                // Prevent default to avoid double firing of click events on mobile
                                e.preventDefault();
                                e.target.releasePointerCapture(e.pointerId); // allow elementFromPoint to work during move
                                const el = document.elementFromPoint(e.clientX, e.clientY);
                                const r = parseInt(el?.dataset?.row);
                                const c = parseInt(el?.dataset?.col);
                                if (!isNaN(r) && !isNaN(c)) { handleToggleCell(r, c); }
                            }}
                            onPointerMove={(e) => {
                                // e.buttons === 1 checks if the primary button/finger is held down
                                if (e.buttons === 1) {
                                    e.preventDefault();
                                    const el = document.elementFromPoint(e.clientX, e.clientY);
                                    const r = parseInt(el?.dataset?.row);
                                    const c = parseInt(el?.dataset?.col);
                                    if (!isNaN(r) && !isNaN(c)) { handleDragCell(r, c); }
                                }
                            }}
                        >
                            <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-400/60 animate-pulse pointer-events-none shadow-[0_0_10px_#34d399]" />

                            {Array.from({ length: SIZE }).map((_, r) =>
                                Array.from({ length: SIZE }).map((_, c) => {
                                    const isShip = placedShips.some(ship => ship.r === r && ship.c === c);

                                    return (
                                        <div
                                            key={`c-${r}-${c}`}
                                            data-row={r}
                                            data-col={c}
                                            className={`flex items-center justify-center rounded-lg transition-all duration-150 pointer-events-auto
                                                ${isShip ? 'bg-emerald-500 shadow-[0_0_12px_rgba(52,211,153,0.8)] scale-[0.96] border border-emerald-300' : 'bg-emerald-400/10 hover:bg-emerald-400/20'}
                                            `}
                                        >
                                            {isShip && <span className="text-[10px] pointer-events-none">⚓</span>}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="flex gap-3 w-[95%]">
                            <button
                                onClick={handleUndoShip}
                                disabled={placedShips.length === 0}
                                className="glass-card flex-1 h-14 rounded-2xl text-xs font-bold flex items-center justify-center disabled:opacity-30 text-rose-400 gap-1.5"
                            >
                                <RotateCcw size={15} /> مسح الأخير
                            </button>
                            <button
                                onClick={handleReady}
                                disabled={placedShips.length < TOTAL_HEALTH}
                                className="glow-button flex-[2] h-14 rounded-2xl text-sm font-black flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                ⚔️ جاهز للمعركة ({placedShips.length}/{TOTAL_HEALTH})
                            </button>
                        </div>
                    </div>
                )}

                {/* Waiting for Opponent Setup */}
                {gameState === 'waiting-ready' && (
                    <div className="flex-1 flex items-center justify-center px-4 animate-fade-in">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center border border-emerald-400/30 shadow-[0_0_30px_rgba(52,211,153,0.15)]">
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full mx-auto flex items-center justify-center mb-3 animate-spin">
                                <span className="text-3xl">🧭</span>
                            </div>
                            <h2 className="text-xl font-black mb-1">في الانتظار... ⏳</h2>
                            <p className="opacity-60 text-xs font-bold mb-4">
                                {oppProfile?.nickname || 'الخصم'} بيوزع أسطوله البحري الآن!
                            </p>
                            <div className="h-1 w-24 bg-emerald-400/40 rounded-full mx-auto animate-pulse" />
                        </div>
                    </div>
                )}

                {/* Playing & Finished Screen */}
                {(gameState === 'playing' || gameState === 'finished') && (
                    <div className="flex-1 flex flex-col items-center px-4 animate-fade-in">

                        {/* Status Bar */}
                        {!overallWinner && (
                            <div className={`mb-2 w-[95%] text-center px-4 py-2.5 rounded-2xl text-sm font-black transition-all ${isMyTurn
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 shadow-[0_0_15px_rgba(52,211,153,0.2)] animate-pulse'
                                : 'glass-card text-white/50 border border-white/5'
                                }`}>
                                {isMyTurn ? '🎯 دورك، اضرب رادار الخصم!' : '⏳ انتظر ضربة الخصم...'}
                            </div>
                        )}

                        {/* Target Grid (Radar) */}
                        <div className="w-full flex flex-col items-center mb-3 relative">
                            <div className="w-[95%] aspect-square bg-[#071326]/90 border-2 border-sky-400/30 rounded-3xl p-2 grid grid-cols-8 gap-1 shadow-2xl relative">

                                {/* Victory / Defeat Overlay */}
                                {overallWinner && (
                                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 rounded-3xl backdrop-blur-md animate-pop-in p-4">
                                        <div className="text-center flex flex-col items-center gap-3">
                                            <div className="text-4xl animate-bounce">
                                                {overallWinner === 'me' ? '👑' : '💥'}
                                            </div>
                                            <div className={`text-3xl font-black ${overallWinner === 'me' ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.8)]' : 'text-rose-500 drop-shadow-[0_0_20px_rgba(243,33,33,0.8)]'}`}>
                                                {overallWinner === 'me' ? 'انتصار ساحق!' : 'أغرقوا أسطولنا!'}
                                            </div>
                                            <p className="text-xs font-bold opacity-75">
                                                {overallWinner === 'me' ? 'دمرت كل سفن الخصم بنجاح' : 'حاول مرة أخرى في جولة جديدة'}
                                            </p>

                                            <div className="flex gap-2 mt-2 w-full">
                                                <button
                                                    onClick={() => setShowRecap(true)}
                                                    className="glass-card flex-1 py-3 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-white/10"
                                                >
                                                    <Film size={14} className="text-amber-400" /> إعادة الجولة
                                                </button>
                                                <button
                                                    onClick={handleRestart}
                                                    className="glow-button flex-1 py-3 px-4 rounded-xl text-xs font-black"
                                                >
                                                    العب تاني
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {Array.from({ length: SIZE }).map((_, r) =>
                                    Array.from({ length: SIZE }).map((_, c) => {
                                        const val = targetGrid[r][c];
                                        const canShoot = isMyTurn && !overallWinner && val === null && !pendingShotRef.current;

                                        return (
                                            <div
                                                key={`t-${r}-${c}`}
                                                onClick={() => canShoot && handleShoot(r, c)}
                                                className={`relative rounded-lg flex items-center justify-center transition-all duration-200 
                                                    ${val === null ? 'bg-sky-400/10' : ''}
                                                    ${canShoot ? 'cursor-pointer hover:bg-rose-500/30 hover:scale-105 active:scale-95' : ''}
                                                    ${val === 'hit' ? 'bg-rose-600/30 border border-rose-500/60 shadow-[0_0_10px_rgba(244,63,94,0.4)]' : ''}
                                                    ${val === 'miss' ? 'bg-white/10 border border-white/20' : ''}
                                                    ${val === 'pending' ? 'bg-amber-400/30 animate-pulse border border-amber-400/60' : ''}
                                                `}
                                            >
                                                {val === 'hit' && (
                                                    <div className="w-[85%] h-[85%] rounded-full bg-rose-600 shadow-[0_0_12px_rgba(225,29,72,1)] flex items-center justify-center animate-pop-in text-[10px]">
                                                        💥
                                                    </div>
                                                )}
                                                {val === 'miss' && (
                                                    <div className="w-[45%] h-[45%] rounded-full bg-white/50 shadow-[0_0_6px_rgba(255,255,255,0.4)] animate-pop-in" />
                                                )}
                                                {val === 'pending' && (
                                                    <span className="text-[10px] animate-spin">🎯</span>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* My Fleet Thumbnail */}
                        <div className="flex flex-col items-center opacity-90">
                            <h3 className="text-[10px] font-bold opacity-60 mb-1 flex items-center gap-1">
                                <Anchor size={10} /> أسطولك الخاص
                            </h3>
                            {renderMyGridPreview()}
                        </div>
                    </div>
                )}
            </div>

            {/* Connection Pause Overlay (10s Auto-Reconnect) */}
            <ConnectionPauseOverlay
                conn={connRef.current}
                onLeave={() => { connRef.current?.close(); setView('hub'); }}
            />

            {/* Emotes Overlay */}
            {gameState === 'playing' && <EmotesOverlay conn={connRef.current} />}

            {/* Match Replay Modal */}
            <MatchRecapModal
                isOpen={showRecap}
                onClose={() => setShowRecap(false)}
                onRestart={handleRestart}
                gameType="sea"
                history={moveHistory}
                winner={overallWinner}
                myProfile={myProfile}
                oppProfile={oppProfile}
            />
        </>
    );
}
