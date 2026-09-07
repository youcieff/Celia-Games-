import React, { useState, useEffect, useRef } from 'react';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import Logo from '../../components/Logo';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Wifi from 'lucide-react/dist/esm/icons/wifi';

const ROWS = 4; // number of boxes vertically
const COLS = 4; // number of boxes horizontally

const COLORS = [
    { id: 'red', hex: '#ef4444', glow: 'rgba(239, 68, 68, 0.8)' },
    { id: 'blue', hex: '#3b82f6', glow: 'rgba(59, 130, 246, 0.8)' },
    { id: 'emerald', hex: '#10b981', glow: 'rgba(16, 185, 129, 0.8)' },
    { id: 'pink', hex: '#ec4899', glow: 'rgba(236, 72, 153, 0.8)' },
    { id: 'yellow', hex: '#eab308', glow: 'rgba(234, 179, 8, 0.8)' },
];

export default function DotsBoxesGame({ setView }) {
    const connRef = useRef(null);
    const isHostRef = useRef(false);

    const [gameState, setGameState] = useState('lobby');

    // Game Logic Arrays
    // hLines: 5 rows (0 to 4), 4 cols (0 to 3)
    const [hLines, setHLines] = useState(Array.from({ length: ROWS + 1 }, () => Array(COLS).fill(null)));
    // vLines: 4 rows (0 to 3), 5 cols (0 to 4)
    const [vLines, setVLines] = useState(Array.from({ length: ROWS }, () => Array(COLS + 1).fill(null)));
    // boxes: 4 rows (0 to 3), 4 cols (0 to 3)
    const [boxes, setBoxes] = useState(Array.from({ length: ROWS }, () => Array(COLS).fill(null)));

    // Setup Customization
    const [hostColor, setHostColor] = useState(COLORS[1].id);
    const [oppColor, setOppColor] = useState(COLORS[0].id);
    const [clientConfig, setClientConfig] = useState(null);

    const [hostTurn, setHostTurn] = useState(true);
    const [scores, setScores] = useState({ host: 0, opp: 0 });

    const stateRef = useRef({ hLines, vLines, boxes, hostTurn, scores });
    useEffect(() => {
        stateRef.current = { hLines, vLines, boxes, hostTurn, scores };
    }, [hLines, vLines, boxes, hostTurn, scores]);

    // Derived properties
    const isHost = isHostRef.current;
    const myColorId = isHost ? hostColor : (clientConfig?.oppColor || 'red');
    const isMyTurn = isHost ? hostTurn : !hostTurn;

    const totalPossible = ROWS * COLS;
    const currentTotal = scores.host + scores.opp;
    const isGameOver = currentTotal === totalPossible && totalPossible > 0;

    let overallWinner = null;
    if (isGameOver) {
        if (scores.host === scores.opp) overallWinner = 'draw';
        else if (scores.host > scores.opp) overallWinner = isHost ? 'me' : 'opp';
        else overallWinner = isHost ? 'opp' : 'me';
    }

    const handleGameStart = (conn, hostMode) => {
        isHostRef.current = hostMode;
        connRef.current = conn;
        conn.on('data', onData);
        setGameState(hostMode ? 'setup' : 'waiting-start');
    };

    const onData = (msg) => {
        if (msg.type === 'start') {
            setClientConfig(msg.config);
            setGameState('playing');
            setHostTurn(true);
        } else if (msg.type === 'play') {
            applyMove(msg.lineType, msg.r, msg.c, !isHostRef.current);
        } else if (msg.type === 'restart') {
            doRestart();
        }
    };

    const handleStartGame = () => {
        const config = { hostColor, oppColor };
        setClientConfig(config);
        setGameState('playing');
        setHostTurn(true); // Host always starts
        connRef.current?.send({ type: 'start', config });
    };

    const applyMove = (lineType, r, c, byHost) => {
        const cur = stateRef.current;
        const symbol = byHost ? 'host' : 'opp';

        // Copy states
        const newH = cur.hLines.map(arr => [...arr]);
        const newV = cur.vLines.map(arr => [...arr]);
        const newBoxes = cur.boxes.map(arr => [...arr]);
        let newHostScore = cur.scores.host;
        let newOppScore = cur.scores.opp;
        let newHostTurn = cur.hostTurn;

        // Apply line
        if (lineType === 'h') newH[r][c] = symbol;
        else newV[r][c] = symbol;

        // Check boxes
        let boxGained = false;

        for (let br = 0; br < ROWS; br++) {
            for (let bc = 0; bc < COLS; bc++) {
                if (!newBoxes[br][bc]) {
                    // Check all 4 lines
                    if (newH[br][bc] && newH[br + 1][bc] && newV[br][bc] && newV[br][bc + 1]) {
                        newBoxes[br][bc] = symbol;
                        boxGained = true;
                        if (byHost) newHostScore++;
                        else newOppScore++;
                    }
                }
            }
        }

        // Turn logic
        if (!boxGained) {
            newHostTurn = !newHostTurn;
        }

        // SYNCHRONOUSLY UPDATE STATEREF SO FAST MOVES DON'T CLOBBER
        stateRef.current = {
            hLines: newH,
            vLines: newV,
            boxes: newBoxes,
            hostTurn: newHostTurn,
            scores: { host: newHostScore, opp: newOppScore }
        };

        setHLines(newH);
        setVLines(newV);
        setBoxes(newBoxes);
        setScores({ host: newHostScore, opp: newOppScore });
        setHostTurn(newHostTurn);
    };

    const handleLineClick = (lineType, r, c) => {
        // Read strictly from synchronous stateRef to avoid rapid double-click race conditions
        const cur = stateRef.current;
        const curIsMyTurn = isHost ? cur.hostTurn : !cur.hostTurn;

        if (gameState !== 'playing' || !curIsMyTurn || isGameOver) return;

        // Check if taken
        if (lineType === 'h' && cur.hLines[r][c]) return;
        if (lineType === 'v' && cur.vLines[r][c]) return;

        applyMove(lineType, r, c, isHost);
        connRef.current?.send({ type: 'play', lineType, r, c });
    };

    const doRestart = () => {
        setHLines(Array.from({ length: ROWS + 1 }, () => Array(COLS).fill(null)));
        setVLines(Array.from({ length: ROWS }, () => Array(COLS + 1).fill(null)));
        setBoxes(Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
        setScores({ host: 0, opp: 0 });
        setHostTurn(true);
        setGameState(isHostRef.current ? 'setup' : 'waiting-start');
    };

    const handleRestart = () => {
        doRestart();
        connRef.current?.send({ type: 'restart' });
    };

    const getColorObj = (type) => {
        const id = type === 'host' ? (isHost ? hostColor : clientConfig?.hostColor) :
            (isHost ? oppColor : clientConfig?.oppColor);
        return COLORS.find(c => c.id === id) || COLORS[0];
    };
    const myColorObj = COLORS.find(c => c.id === myColorId);

    // Render Grid Helpers
    const DOT_SIZE = 12; // px

    return (
        <>
            <div className="animated-bg"><div className="bg-orb-3" /></div>
            <div className="min-h-dvh max-w-lg mx-auto flex flex-col safe-area-pt overflow-hidden overflow-y-auto">

                {/* Nav */}
                <div className="px-4 flex justify-between items-center py-4 mb-2 relative">
                    <div className="flex items-center gap-3 z-10">
                        <Logo size="small" />
                        <button onClick={() => { connRef.current?.close(); setView('hub'); }} className="glass-card w-11 h-11 flex items-center justify-center rounded-2xl hover:scale-105 transition-transform"><ArrowRight size={20} /></button>
                    </div>
                    
                    <div className="flex items-center gap-2 glass-card px-3 py-1.5 rounded-[1.25rem] text-xs font-bold text-center z-10">
                        {gameState !== 'lobby' ? (
                            <div className="flex items-center gap-3">
                                <span className="flex flex-col items-end">
                                    <span className="text-[12px] font-black gradient-text leading-none mb-1">نقاط ومربعات 🟦</span>
                                    <span className="text-[9px] opacity-70 leading-none">أنت
                                    <span className="inline-block w-2.5 h-2.5 rounded-full mr-1 align-middle" style={{ backgroundColor: myColorObj?.hex }}></span>
                                </span>
                                </span>
                                <div className="w-px h-5 bg-white/20"></div>
                                <span className="flex flex-col items-center justify-center text-emerald-400">
                                    <Wifi size={12} />
                                    <span className="text-[8px] mt-0.5 font-black">متصل</span>
                                </span>
                            </div>
                        ) : (
                            <span className="text-[11px] font-black gradient-text">نقاط ومربعات 🟦</span>
                        )}
                    </div>
                </div>

                {/* Lobby */}
                {gameState === 'lobby' && <div className="flex-1 flex pb-16 px-4"><P2PConnectionManager gameIdPrefix="celia-db" onGameStart={handleGameStart} /></div>}

                {/* Setup Screen (Host) */}
                {gameState === 'setup' && (
                    <div className="flex-1 flex flex-col items-center justify-center -mt-10 px-4">
                        <div className="glass-card rounded-3xl p-6 w-full max-w-sm">
                            <h2 className="text-2xl font-black mb-6 text-center">🎨 الألوان المفضلة</h2>

                            <div className="mb-6">
                                <p className="text-sm font-bold opacity-70 mb-2">لونك أنت:</p>
                                <div className="flex gap-3 justify-center">
                                    {COLORS.map(c => (
                                        <button key={'h' + c.id} onClick={() => { setHostColor(c.id); if (c.id === oppColor) setOppColor(COLORS.find(x => x.id !== c.id).id); }}
                                            className={`w-10 h-10 rounded-full transition-transform ${hostColor === c.id ? 'scale-125 ring-2 ring-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                                            style={{ backgroundColor: c.hex, boxShadow: hostColor === c.id ? `0 0 15px ${c.glow}` : 'none' }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="mb-8">
                                <p className="text-sm font-bold opacity-70 mb-2">لون الخصم:</p>
                                <div className="flex gap-3 justify-center">
                                    {COLORS.map(c => (
                                        <button key={'o' + c.id} disabled={c.id === hostColor} onClick={() => setOppColor(c.id)}
                                            className={`w-10 h-10 rounded-full transition-transform ${oppColor === c.id ? 'scale-125 ring-2 ring-white shadow-lg' : 'opacity-40 hover:opacity-100 disabled:opacity-10 disabled:cursor-not-allowed'}`}
                                            style={{ backgroundColor: c.hex, boxShadow: oppColor === c.id ? `0 0 15px ${c.glow}` : 'none' }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <button onClick={handleStartGame} className="glow-button w-full h-14 rounded-2xl text-lg font-black flex items-center justify-center">🕹️ ابدأ التحدي</button>
                        </div>
                    </div>
                )}

                {/* Waiting Screen (Client) */}
                {gameState === 'waiting-start' && (
                    <div className="flex-1 flex items-center justify-center -mt-10 px-4">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center animate-pulse-glow">
                            <h2 className="text-2xl font-black mb-2">في الانتظار... ⏳</h2>
                            <p className="opacity-60 text-sm font-bold">الطرف التاني بيظبط الإعدادات</p>
                        </div>
                    </div>
                )}

                {/* Game Screen */}
                {gameState === 'playing' && (
                    <div className="flex-1 flex flex-col items-center pb-6">

                        {/* Status Information */}
                        <div className="w-[95%] flex justify-between items-center glass-card rounded-3xl p-4 mb-6">
                            {/* My Score */}
                            <div className="flex flex-col items-center">
                                <span className="text-xs font-bold opacity-60">أنت</span>
                                <span className="text-2xl font-black drop-shadow-md" style={{ color: myColorObj?.hex }}>
                                    {isHost ? scores.host : scores.opp}
                                </span>
                            </div>

                            {/* Turn indicator */}
                            <div className="flex flex-col items-center justify-center">
                                {!isGameOver ? (
                                    <span className={`text-sm font-black px-5 py-2 rounded-full transition-all ${isMyTurn ? 'bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'opacity-40'}`}
                                        style={isMyTurn ? { backgroundColor: myColorObj?.hex, boxShadow: `0 0 15px ${myColorObj?.glow}` } : {}}>
                                        {isMyTurn ? '🎯 دورك تلعب ضلعة!' : '⏳ دور الخصم...'}
                                    </span>
                                ) : (
                                    <span className="text-sm font-black px-4 py-2 bg-white/20 rounded-full animate-pulse-glow text-white">
                                        {overallWinner === 'draw' ? '⚖️ تعادل' : overallWinner === 'me' ? '🎉 أنت البطل!' : '💔 خسرت!'}
                                    </span>
                                )}
                            </div>

                            {/* Opp Score */}
                            <div className="flex flex-col items-center">
                                <span className="text-xs font-bold opacity-60">الخصم</span>
                                <span className="text-2xl font-black opacity-80" style={{ color: getColorObj(isHost ? 'opp' : 'host').hex }}>
                                    {isHost ? scores.opp : scores.host}
                                </span>
                            </div>
                        </div>

                        {/* Grid Rendering */}
                        <div className="w-[95%] aspect-square relative touch-none select-none">

                            {/* Background Glass container for the entire grid to look clean */}
                            <div className="absolute inset-[-20px] bg-white/[0.03] rounded-3xl border border-white/[0.05] shadow-2xl pointer-events-none" />

                            {/* 1. Draw Boxes (Background logic) */}
                            {boxes.map((rowArr, r) =>
                                rowArr.map((boxHolder, c) => {
                                    const bColor = boxHolder ? getColorObj(boxHolder) : null;
                                    return (
                                        <div key={`box-${r}-${c}`}
                                            className="absolute pointer-events-none flex items-center justify-center p-1.5"
                                            style={{
                                                top: `${(r / ROWS) * 100}%`,
                                                left: `${(c / COLS) * 100}%`,
                                                width: `${100 / COLS}%`,
                                                height: `${100 / ROWS}%`,
                                            }}>
                                            <div className={`w-full h-full rounded-[6px] transition-all duration-300 ${boxHolder ? 'animate-pop-in' : ''}`}
                                                style={{
                                                    backgroundColor: bColor ? bColor.hex : 'transparent',
                                                    opacity: boxHolder ? 0.3 : 0,
                                                    boxShadow: boxHolder ? `inset 0 0 15px ${bColor.glow}, 0 0 10px ${bColor.glow}` : 'none'
                                                }}
                                            />
                                        </div>
                                    );
                                })
                            )}

                            {/* 2. Draw Horizontal Lines (Clickable) */}
                            {hLines.map((rowArr, r) =>
                                rowArr.map((lineHolder, c) => {
                                    const lColor = lineHolder ? getColorObj(lineHolder) : null;
                                    const canClick = isMyTurn && !lineHolder && !isGameOver;

                                    return (
                                        <div key={`hline-${r}-${c}`}
                                            onClick={() => handleLineClick('h', r, c)}
                                            className={`absolute flex items-center justify-center -translate-y-1/2 z-10 
                                     ${canClick ? 'cursor-pointer group' : ''}`}
                                            style={{
                                                top: `${(r / ROWS) * 100}%`,
                                                left: `${(c / COLS) * 100}%`,
                                                width: `${100 / COLS}%`,
                                                height: '24px', // generous tap target
                                            }}>
                                            <div className={`w-[90%] h-[6px] rounded-full transition-all duration-200
                                       ${lineHolder ? 'opacity-100 scale-100' : 'opacity-10 scale-50 group-hover:opacity-40 group-hover:scale-100 group-hover:bg-white'} 
                                      `}
                                                style={lineHolder ? { backgroundColor: lColor.hex, boxShadow: `0 0 10px ${lColor.glow}` } : { backgroundColor: 'var(--text-color)' }}
                                            />
                                        </div>
                                    );
                                })
                            )}

                            {/* 3. Draw Vertical Lines (Clickable) */}
                            {vLines.map((rowArr, r) =>
                                rowArr.map((lineHolder, c) => {
                                    const lColor = lineHolder ? getColorObj(lineHolder) : null;
                                    const canClick = isMyTurn && !lineHolder && !isGameOver;

                                    return (
                                        <div key={`vline-${r}-${c}`}
                                            onClick={() => handleLineClick('v', r, c)}
                                            className={`absolute flex items-center justify-center -translate-x-1/2 z-10
                                     ${canClick ? 'cursor-pointer group' : ''}`}
                                            style={{
                                                top: `${(r / ROWS) * 100}%`,
                                                left: `${(c / COLS) * 100}%`,
                                                width: '24px', // tap target
                                                height: `${100 / ROWS}%`,
                                            }}>
                                            <div className={`w-[6px] h-[90%] rounded-full transition-all duration-200
                                       ${lineHolder ? 'opacity-100 scale-100' : 'opacity-10 scale-50 group-hover:opacity-40 group-hover:scale-100 group-hover:bg-white'} 
                                      `}
                                                style={lineHolder ? { backgroundColor: lColor.hex, boxShadow: `0 0 10px ${lColor.glow}` } : { backgroundColor: 'var(--text-color)' }}
                                            />
                                        </div>
                                    );
                                })
                            )}

                            {/* 4. Draw Intersection Dots (Over everything) pointer-events-none */}
                            {Array.from({ length: ROWS + 1 }).map((_, r) =>
                                Array.from({ length: COLS + 1 }).map((_, c) => (
                                    <div key={`dot-${r}-${c}`} className="absolute bg-[var(--text-color)] rounded-full -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none shadow-[0_0_8px_rgba(255,255,255,0.3)] opacity-60"
                                        style={{
                                            top: `${(r / ROWS) * 100}%`,
                                            left: `${(c / COLS) * 100}%`,
                                            width: `${DOT_SIZE}px`,
                                            height: `${DOT_SIZE}px`,
                                        }}
                                    />
                                ))
                            )}

                        </div>

                        {/* After Game finishes */}
                        {isGameOver && (
                            <button onClick={handleRestart} className="mt-12 mb-4 glow-button bg-white/10 w-[90%] max-w-[380px] h-14 rounded-2xl text-lg font-black flex items-center justify-center gap-2 animate-pop-in">
                                <RotateCcw size={20} /> العبوا من جديد!
                            </button>
                        )}

                    </div>
                )}
            </div>
        </>
    );
}
