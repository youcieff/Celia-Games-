import React, { useState, useEffect, useRef } from 'react';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import Logo from '../../components/Logo';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Wifi from 'lucide-react/dist/esm/icons/wifi';
import Target from 'lucide-react/dist/esm/icons/target';
import Anchor from 'lucide-react/dist/esm/icons/anchor';

const SIZE = 8;
const SHIPS_TO_PLACE = [
    { id: 1, name: 'حاملة طائرات', size: 4 },
    { id: 2, name: 'مدمرة', size: 3 },
    { id: 3, name: 'غواصة', size: 2 },
    { id: 4, name: 'غواصة', size: 2 },
];

export default function SeaBattleGame({ setView }) {
    const connRef = useRef(null);
    const isHostRef = useRef(false);

    const [gameState, setGameState] = useState('lobby'); // lobby, setup, waiting-ready, playing

    // Setup State
    const [placedShips, setPlacedShips] = useState([]); // array of individual cells: { r, c, size: 1, vertical: false }
    const TOTAL_HEALTH = 11;

    // Game State
    const [myGrid, setMyGrid] = useState(Array.from({ length: SIZE }, () => Array(SIZE).fill(null)));
    // targetGrid tracking shots (null, 'hit', 'miss')
    const [targetGrid, setTargetGrid] = useState(Array.from({ length: SIZE }, () => Array(SIZE).fill(null)));
    const [hostTurn, setHostTurn] = useState(true);
    const [oppReady, setOppReady] = useState(false);

    // Stats
    const [hitsOnMe, setHitsOnMe] = useState(0);
    const [hitsOnOpp, setHitsOnOpp] = useState(0);

    // TOTAL_HEALTH is defined above

    const stateRef = useRef({ placedShips, myGrid, targetGrid, hostTurn, hitsOnMe, hitsOnOpp });
    useEffect(() => {
        stateRef.current = { placedShips, myGrid, targetGrid, hostTurn, hitsOnMe, hitsOnOpp };
    }, [placedShips, myGrid, targetGrid, hostTurn, hitsOnMe, hitsOnOpp]);

    const isShootingRef = useRef(false);

    // Derived properties
    const isHost = isHostRef.current;
    const isMyTurn = isHost ? hostTurn : !hostTurn;

    let overallWinner = null;
    if (hitsOnMe >= TOTAL_HEALTH) overallWinner = 'opp';
    if (hitsOnOpp >= TOTAL_HEALTH) overallWinner = 'me';

    const handleGameStart = (conn, hostMode) => {
        isHostRef.current = hostMode;
        connRef.current = conn;
        conn.on('data', onData);
        setGameState('setup');
    };

    const onData = (msg) => {
        const cur = stateRef.current;

        if (msg.type === 'ready') {
            setOppReady(true);
        } else if (msg.type === 'shot') {
            const { r, c } = msg;
            // Check if it hits any of my ships
            let isHit = false;
            cur.placedShips.forEach(ship => {
                for (let i = 0; i < ship.size; i++) {
                    const sr = ship.vertical ? ship.r + i : ship.r;
                    const sc = ship.vertical ? ship.c : ship.c + i;
                    if (sr === r && sc === c) isHit = true;
                }
            });

            // Update my grid safely without stale closure traps
            setMyGrid(prev => {
                const newMyGrid = prev.map(arr => [...arr]);
                newMyGrid[r][c] = isHit ? 'hit' : 'miss';
                return newMyGrid;
            });

            if (isHit) setHitsOnMe(prev => prev + 1);

            // Reply back
            connRef.current?.send({ type: 'shot-result', r, c, result: isHit ? 'hit' : 'miss' });

            // Opponent shot us - reply back and flip turn on our side
            setHostTurn(prev => !prev);

        } else if (msg.type === 'shot-result') {
            const { r, c, result } = msg;

            isShootingRef.current = false; // Unlock for next turn

            // Update my target grid safely
            setTargetGrid(prev => {
                const newTarget = prev.map(arr => [...arr]);
                newTarget[r][c] = result;
                return newTarget;
            });

            if (result === 'hit') setHitsOnOpp(prev => prev + 1);

            // Now flip turn - we got the result
            setHostTurn(prev => !prev);

        } else if (msg.type === 'restart') {
            doRestart();
        }
    };

    useEffect(() => {
        if (gameState === 'waiting-ready' && oppReady) {
            setGameState('playing');
        }
    }, [gameState, oppReady]);

    const handleToggleCell = (r, c) => {
        if (gameState !== 'setup') return;
        const exists = placedShips.find(cell => cell.r === r && cell.c === c);

        if (exists) {
            setPlacedShips(prev => prev.filter(cell => cell.r !== r || cell.c !== c));
        } else {
            if (placedShips.length < TOTAL_HEALTH) {
                setPlacedShips(prev => [...prev, { r, c, size: 1, vertical: false }]);
            }
        }
    };

    const handleDragCell = (r, c) => {
        if (gameState !== 'setup') return;
        const exists = placedShips.find(cell => cell.r === r && cell.c === c);
        if (!exists && placedShips.length < TOTAL_HEALTH) {
            setPlacedShips(prev => [...prev, { r, c, size: 1, vertical: false }]);
        }
    };

    const handleUndoShip = () => {
        if (placedShips.length === 0) return;
        const newArr = [...placedShips];
        newArr.pop();
        setPlacedShips(newArr);
    };


    const handleReady = () => {
        setGameState('waiting-ready');
        connRef.current?.send({ type: 'ready' });
        if (oppReady) {
            setGameState('playing');
        }
    };

    const handleShoot = (r, c) => {
        if (gameState !== 'playing' || !isMyTurn || overallWinner || isShootingRef.current) return;
        if (targetGrid[r][c] !== null) return; // already shot here

        // Mark as pending locally so user can't double-click
        isShootingRef.current = true;
        setTargetGrid(prev => {
            const newTarget = prev.map(arr => [...arr]);
            newTarget[r][c] = 'pending';
            return newTarget;
        });

        connRef.current?.send({ type: 'shot', r, c });
    };

    const hostTurnRefC = () => stateRef.current.hostTurn;

    const doRestart = () => {
        isShootingRef.current = false;
        setPlacedShips([]);
        setMyGrid(Array.from({ length: SIZE }, () => Array(SIZE).fill(null)));
        setTargetGrid(Array.from({ length: SIZE }, () => Array(SIZE).fill(null)));
        setHostTurn(true);
        setOppReady(false);
        setHitsOnMe(0);
        setHitsOnOpp(0);
        setGameState('setup');
    };

    const handleRestart = () => {
        doRestart();
        connRef.current?.send({ type: 'restart' });
    };

    const renderMyGridPreview = () => {
        const visualGrid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
        placedShips.forEach(ship => {
            for (let i = 0; i < ship.size; i++) {
                const r = ship.vertical ? ship.r + i : ship.r;
                const c = ship.vertical ? ship.c : ship.c + i;
                if (visualGrid[r]) visualGrid[r][c] = true;
            }
        });

        return (
            <div className="w-[120px] aspect-square bg-[#0a192f]/50 border border-emerald-400/30 rounded-xl relative overflow-hidden flex flex-col p-1 gap-px mb-4">
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
                {myGrid.flat().some(x => x) && <div className="absolute inset-0 flex items-center justify-center font-bold text-xs opacity-50 bg-black/40">سفنك</div>}
            </div>
        );
    };

    return (
        <>
            <div className="animated-bg"><div className="bg-orb-3" style={{ background: 'var(--accent-glow)' }} /></div>
            <div className="min-h-dvh max-w-lg mx-auto flex flex-col safe-area-pt overflow-x-hidden overflow-y-auto pb-4">

                {/* Nav */}
                <div className="px-4 flex justify-between items-center py-4 mb-2 relative">
                    <div className="flex items-center gap-3 z-10">
                        <Logo size="small" />
                        <button onClick={() => { connRef.current?.close(); setView('hub'); }} className="glass-card w-11 h-11 flex items-center justify-center rounded-2xl hover:scale-105 transition-transform"><ArrowRight size={20} /></button>
                    </div>

                    <div className="flex items-center gap-2 glass-card px-3 py-1.5 rounded-2xl text-xs font-bold text-center z-10">
                        {gameState !== 'lobby' ? (
                            <div className="flex items-center gap-3">
                                <span className="flex flex-col items-end">
                                    <span className="text-[12px] font-black gradient-text leading-none mb-1">حرب السفن ⚓</span>
                                    <span className="text-[9px] opacity-70 leading-none">أنت {isHost ? '(أدميرال)' : '(ضيف)'}</span>
                                </span>
                                <div className="w-px h-5 bg-white/20"></div>
                                <span className="flex flex-col items-center justify-center text-emerald-400">
                                    <Wifi size={12} />
                                    <span className="text-[8px] mt-0.5 font-black">متصل</span>
                                </span>
                            </div>
                        ) : (
                            <span className="text-[11px] font-black gradient-text">حرب السفن ⚓</span>
                        )}
                    </div>
                </div>

                {gameState === 'lobby' && <div className="flex-1 flex pb-16 safe-area-pb px-4"><P2PConnectionManager gameIdPrefix="celia-sea" onGameStart={handleGameStart} /></div>}

                {gameState === 'setup' && (
                    <div className="flex-1 flex flex-col items-center px-4 pb-4">
                        <h2 className="text-xl font-black mb-1">🚢 توزيع الأسطول البحري</h2>
                        <p className="opacity-60 text-[11px] font-bold mb-4">
                            {placedShips.length < TOTAL_HEALTH
                                ? `اضغط أو اسحب لتحديد ${TOTAL_HEALTH - placedShips.length} مربعات للأسطول`
                                : 'تمام! الأسطول جاهز ✅'}
                        </p>

                        {/* Setup Grid Preview */}
                        <div
                            className="w-[95%] aspect-square bg-[#0a192f]/50 border-2 border-emerald-400/20 rounded-2xl relative overflow-hidden p-1.5 grid grid-cols-8 gap-0.5 shadow-2xl mb-6 touch-none"
                            onTouchStart={(e) => {
                                const touch = e.touches[0];
                                const el = document.elementFromPoint(touch.clientX, touch.clientY);
                                const r = parseInt(el?.dataset?.row);
                                const c = parseInt(el?.dataset?.col);
                                if (!isNaN(r) && !isNaN(c)) { handleToggleCell(r, c); }
                            }}
                            onTouchMove={(e) => {
                                e.preventDefault();
                                const touch = e.touches[0];
                                const el = document.elementFromPoint(touch.clientX, touch.clientY);
                                const r = parseInt(el?.dataset?.row);
                                const c = parseInt(el?.dataset?.col);
                                if (!isNaN(r) && !isNaN(c)) { handleDragCell(r, c); }
                            }}
                        >
                            <div className="absolute inset-0 bg-transparent pointer-events-none border border-[rgba(255,255,255,0.05)] rounded-2xl"></div>
                            {/* Radar scanline aesthetic effect */}
                            <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-400/50 animate-pulse pointer-events-none" style={{ boxShadow: '0 0 10px rgba(52,211,153, 0.8)' }}></div>

                            {Array.from({ length: SIZE }).map((_, r) =>
                                Array.from({ length: SIZE }).map((_, c) => {

                                    const isShip = placedShips.some(ship => ship.r === r && ship.c === c);

                                    return (
                                        <div
                                            key={`c-${r}-${c}`}
                                            data-row={r}
                                            data-col={c}
                                            onClick={() => handleToggleCell(r, c)}
                                            onMouseEnter={(e) => {
                                                if (e.buttons === 1) handleDragCell(r, c);
                                            }}
                                            className={`flex items-center justify-center rounded-[4px] cursor-pointer transition-all duration-150 pointer-events-auto
                                      ${isShip ? 'bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.7)] scale-[0.98]' : 'bg-emerald-400/10'}
                                     `}
                                        />
                                    )
                                })
                            )}
                        </div>

                        <div className="flex gap-3 w-[95%]">
                            <button onClick={handleUndoShip} disabled={placedShips.length === 0} className="glass-card flex-1 h-14 rounded-2xl text-sm font-bold flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed text-rose-400"><RotateCcw size={16} className="ml-2" /> مسح الأخير</button>
                            <button onClick={handleReady} disabled={placedShips.length < TOTAL_HEALTH} className="glow-button flex-[2] h-14 rounded-2xl text-sm font-black flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed disabled:grayscale transition-all duration-300">⚔️ جاهز للمعركة</button>
                        </div>

                    </div>
                )}

                {gameState === 'waiting-ready' && (
                    <div className="flex-1 flex items-center justify-center -mt-10 px-4">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center animate-pulse-glow">
                            <h2 className="text-2xl font-black mb-2">في الانتظار... ⏳</h2>
                            <p className="opacity-60 text-sm font-bold">الأدميرال التاني بيوزع أسطوله!</p>
                        </div>
                    </div>
                )}

                {gameState === 'playing' && (
                    <div className="flex-1 flex flex-col items-center px-4">

                        {/* Status Bar - separate block above the grid */}
                        {!overallWinner && (
                            <div className={`mb-2 w-[95%] text-center px-4 py-2.5 rounded-2xl text-base font-black transition-all ${isMyTurn
                                ? 'bg-[var(--primary-color)]/20 text-[var(--primary-color)] shadow-[0_0_15px_var(--primary-glow)]'
                                : 'glass-card text-white/50'
                                }`}>
                                {isMyTurn ? '🎯 دورك، اضرب!' : '⏳ استعد لتلقي ضربة...'}
                            </div>
                        )}

                        {/* Target Grid (Where you shoot) */}
                        <div className="w-full flex flex-col items-center mb-4 relative">
                            <h3 className="text-[11px] font-bold opacity-50 mb-1 flex items-center gap-1"><Target size={12} /> رادار الخصم</h3>

                            <div className="w-[95%] aspect-square bg-[#0a192f]/80 border-2 border-[var(--primary-color)]/30 rounded-3xl p-2 grid grid-cols-8 gap-1 shadow-2xl relative">

                                {overallWinner && (
                                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 rounded-3xl backdrop-blur-sm animate-pop-in">
                                        <div className="text-center">
                                            <div className={`text-4xl font-black mb-2 ${overallWinner === 'me' ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.8)]' : 'text-rose-500 drop-shadow-[0_0_20px_rgba(243,33,33,0.8)]'}`}>
                                                {overallWinner === 'me' ? '🛡️ انتصرنا!' : '💥 أغرقوا أسطولنا!'}
                                            </div>
                                            <button onClick={handleRestart} className="mt-4 glow-button h-10 w-32 mx-auto rounded-xl text-sm font-bold">العب تاني</button>
                                        </div>
                                    </div>
                                )}

                                {Array.from({ length: SIZE }).map((_, r) =>
                                    Array.from({ length: SIZE }).map((_, c) => {
                                        const val = targetGrid[r][c];
                                        const canShoot = isMyTurn && !overallWinner && val === null;

                                        return (
                                            <div key={`t-${r}-${c}`}
                                                onClick={() => canShoot && handleShoot(r, c)}
                                                className={`relative rounded flex items-center justify-center transition-all duration-300 
                                              ${val === null ? 'bg-sky-400/10' : ''}
                                              ${canShoot ? 'cursor-pointer hover:bg-rose-400/30' : ''}
                                              ${val === 'hit' ? 'bg-rose-500/20' : ''}
                                              ${val === 'miss' ? 'bg-white/10' : ''}
                                              ${val === 'pending' ? 'bg-yellow-300/20 animate-pulse' : ''}
                                             `}>
                                                <div className="absolute inset-0 border border-sky-300/10 rounded pointer-events-none"></div>
                                                {val === 'hit' && (
                                                    <div className="w-[80%] h-[80%] rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,1)] flex items-center justify-center animate-pop-in relative text-[10px]">
                                                        🔥
                                                    </div>
                                                )}
                                                {val === 'miss' && (
                                                    <div className="w-[60%] h-[60%] rounded-full bg-white/40 shadow-[0_0_8px_rgba(255,255,255,0.4)] animate-pop-in"></div>
                                                )}
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>

                        {/* My Grid (Thumbnail format) */}
                        <div className="flex flex-col items-center opacity-80 mt-[-10px]">
                            <h3 className="text-[10px] font-bold opacity-50 mb-1 flex items-center gap-1"><Anchor size={10} /> أسطولك</h3>
                            {renderMyGridPreview()}
                            <p className="text-[10px] text-rose-400 font-bold mb-4 bg-rose-500/10 px-3 py-1 rounded-full">السفن المتضررة: {hitsOnMe} / {TOTAL_HEALTH}</p>
                            <p className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-full">سفن الخصم المدمرة: {hitsOnOpp} / {TOTAL_HEALTH}</p>
                        </div>

                    </div>
                )}
            </div>
        </>
    );
}
