import React, { useState, useEffect, useRef } from 'react';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import Logo from '../../components/Logo';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Wifi from 'lucide-react/dist/esm/icons/wifi';

const ROWS = 6;
const COLS = 7;

// Colors mapping for the premium UI
const COLORS = [
    { id: 'red', hex: '#ef4444', glow: 'rgba(239, 68, 68, 0.6)' },
    { id: 'yellow', hex: '#eab308', glow: 'rgba(234, 179, 8, 0.6)' },
    { id: 'emerald', hex: '#10b981', glow: 'rgba(16, 185, 129, 0.6)' },
    { id: 'blue', hex: '#3b82f6', glow: 'rgba(59, 130, 246, 0.6)' },
    { id: 'pink', hex: '#ec4899', glow: 'rgba(236, 72, 153, 0.6)' },
];

const checkWin = (board) => {
    // Check horizontal
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            if (board[r][c] && board[r][c] === board[r][c + 1] && board[r][c] === board[r][c + 2] && board[r][c] === board[r][c + 3]) {
                return { winner: board[r][c], line: [[r, c], [r, c + 1], [r, c + 2], [r, c + 3]] };
            }
        }
    }
    // Check vertical
    for (let r = 0; r < ROWS - 3; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c] && board[r][c] === board[r + 1][c] && board[r][c] === board[r + 2][c] && board[r][c] === board[r + 3][c]) {
                return { winner: board[r][c], line: [[r, c], [r + 1, c], [r + 2, c], [r + 3, c]] };
            }
        }
    }
    // Check diagonal right
    for (let r = 0; r < ROWS - 3; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            if (board[r][c] && board[r][c] === board[r + 1][c + 1] && board[r][c] === board[r + 2][c + 2] && board[r][c] === board[r + 3][c + 3]) {
                return { winner: board[r][c], line: [[r, c], [r + 1, c + 1], [r + 2, c + 2], [r + 3, c + 3]] };
            }
        }
    }
    // Check diagonal left
    for (let r = 0; r < ROWS - 3; r++) {
        for (let c = 3; c < COLS; c++) {
            if (board[r][c] && board[r][c] === board[r + 1][c - 1] && board[r][c] === board[r + 2][c - 2] && board[r][c] === board[r + 3][c - 3]) {
                return { winner: board[r][c], line: [[r, c], [r + 1, c - 1], [r + 2, c - 2], [r + 3, c - 3]] };
            }
        }
    }
    // Draw
    if (board[0].every(cell => cell !== null)) return { winner: 'draw', line: [] };

    return null;
};

export default function Connect4Game({ setView }) {
    const connRef = useRef(null);
    const isHostRef = useRef(false);

    const [gameState, setGameState] = useState('lobby');

    const [board, setBoard] = useState(Array.from({ length: ROWS }, () => Array(COLS).fill(null)));

    // Customization
    const [hostColor, setHostColor] = useState(COLORS[0].id);
    const [oppColor, setOppColor] = useState(COLORS[1].id);
    const [hostPlaysFirst, setHostPlaysFirst] = useState(true);

    // Network sync props
    const [clientConfig, setClientConfig] = useState(null);
    const [hostTurn, setHostTurn] = useState(true); // Tracks turn, true: host, false: opp

    const boardRef = useRef(board);
    const hostTurnRef = useRef(true);

    useEffect(() => {
        boardRef.current = board;
        hostTurnRef.current = hostTurn;
    }, [board, hostTurn]);

    // Derived
    const isHost = isHostRef.current;
    const myColorId = isHost ? hostColor : (clientConfig?.oppColor || 'blue');
    const oppColorId = isHost ? oppColor : (clientConfig?.hostColor || 'red');
    const isMyTurn = isHost ? hostTurn : !hostTurn;
    const winData = checkWin(board);

    const handleGameStart = (conn, hostMode) => {
        isHostRef.current = hostMode;
        connRef.current = conn;
        conn.on('data', onData);
        setGameState(hostMode ? 'setup' : 'waiting-start');
    };

    const onData = (msg) => {
        if (msg.type === 'start') {
            setClientConfig(msg.config);
            setHostTurn(msg.config.hostPlaysFirst);
            setGameState('playing');
        } else if (msg.type === 'play') {
            dropCoin(msg.colIdx, !isHostRef.current);
        } else if (msg.type === 'restart') {
            if (boardRef.current.every(row => row.every(c => !c))) return; // already restarted
            doRestart();
        }
    };

    const dropCoin = (colIdx, isHostMove) => {
        const newBoard = boardRef.current.map(row => [...row]);
        let droppedRow = -1;

        // Find lowest empty slot
        for (let r = ROWS - 1; r >= 0; r--) {
            if (!newBoard[r][colIdx]) {
                newBoard[r][colIdx] = isHostMove ? 'host' : 'opp';
                droppedRow = r;
                break;
            }
        }

        if (droppedRow !== -1) {
            setBoard(newBoard);
            setHostTurn(!hostTurnRef.current);
        }
    };

    const handleColClick = (colIdx) => {
        if (gameState !== 'playing' || !isMyTurn || winData) return;
        if (board[0][colIdx] !== null) return; // Col full

        dropCoin(colIdx, isHost);
        connRef.current?.send({ type: 'play', colIdx });
    };

    const handleStartGame = () => {
        const config = { hostColor, oppColor, hostPlaysFirst };
        setHostTurn(hostPlaysFirst);
        setGameState('playing');
        connRef.current?.send({ type: 'start', config });
    };

    const doRestart = () => {
        setBoard(Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
        setHostTurn(isHost ? hostPlaysFirst : (clientConfig?.hostPlaysFirst ?? true));
        setGameState(isHost ? 'setup' : 'waiting-start');
    };

    const handleRestart = () => {
        doRestart();
        connRef.current?.send({ type: 'restart' });
    };

    const getColorObj = (type) => {
        const id = type === 'host' ? (isHost ? hostColor : clientConfig?.hostColor) : (isHost ? oppColor : clientConfig?.oppColor);
        return COLORS.find(c => c.id === id) || COLORS[0];
    };
    const myColorObj = COLORS.find(c => c.id === myColorId);

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
                                    <span className="text-[12px] font-black gradient-text leading-none mb-1">أربعة بالصف 🔴</span>
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
                            <span className="text-[11px] font-black gradient-text">أربعة بالصف 🔴</span>
                        )}
                    </div>
                </div>

                {/* Lobby */}
                {gameState === 'lobby' && <div className="flex-1 flex pb-16 safe-area-pb px-4"><P2PConnectionManager gameIdPrefix="celia-c4" onGameStart={handleGameStart} /></div>}

                {/* Setup Screen (Host) */}
                {gameState === 'setup' && (
                    <div className="flex-1 flex flex-col items-center justify-center -mt-10 px-4">
                        <div className="glass-card rounded-3xl p-6 w-full max-w-sm">
                            <h2 className="text-2xl font-black mb-6 text-center">🎨 اختار الألوان</h2>

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

                            <div className="flex gap-2 mb-6 bg-black/20 p-1 rounded-xl">
                                <button onClick={() => setHostPlaysFirst(true)} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-colors ${hostPlaysFirst ? 'bg-white/20' : 'opacity-40'}`}>أنا أبدأ</button>
                                <button onClick={() => setHostPlaysFirst(false)} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-colors ${!hostPlaysFirst ? 'bg-white/20' : 'opacity-40'}`}>الخصم يبدأ</button>
                            </div>

                            <button onClick={handleStartGame} className="glow-button w-full h-14 rounded-2xl text-lg font-black flex items-center justify-center">🎮 ابدأ المستطيل الأخضر</button>
                        </div>
                    </div>
                )}

                {/* Waiting Screen (Client) */}
                {gameState === 'waiting-start' && (
                    <div className="flex-1 flex items-center justify-center -mt-10 px-4">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center animate-pulse-glow">
                            <h2 className="text-2xl font-black mb-2">في الانتظار... ⏳</h2>
                            <p className="opacity-60 text-sm font-bold">الطرف التاني بيختار الألوان</p>
                        </div>
                    </div>
                )}

                {/* Game Screen */}
                {gameState === 'playing' && (
                    <div className="flex-1 flex flex-col items-center pb-6">

                        {/* Status */}
                        <div className="mb-6 w-full px-4 text-center">
                            {!winData ? (
                                <div className={`glass-card rounded-2xl py-3 px-6 inline-block transition-all ${isMyTurn ? 'animate-pulse-glow' : ''}`}
                                    style={{ boxShadow: isMyTurn ? `0 0 15px ${myColorObj?.glow}` : 'none' }}>
                                    <p className="font-black text-base">
                                        {isMyTurn ? '🎯 دورك تلعب ع الرص!' : '⏳ دور الطرف التاني...'}
                                    </p>
                                </div>
                            ) : (
                                <div className="glass-card rounded-2xl py-4 px-8 text-center animate-pop-in">
                                    <p className="font-black text-2xl mb-1">
                                        {winData.winner === 'draw' ? '⚖️ تعادل!' :
                                            (winData.winner === (isHost ? 'host' : 'opp')) ? '🎉 أنت البطل!' : '💔 خسرت التحدي!'}
                                    </p>
                                    <button onClick={handleRestart} className="mt-4 glow-button bg-white/10 w-full h-12 rounded-xl text-sm font-black flex items-center justify-center gap-2">
                                        <RotateCcw size={18} /> العبوا تاني
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Connect 4 Board */}
                        <div className="glass-card p-2 rounded-3xl shadow-2xl relative w-[95%]" dir="ltr"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>

                            <div className="grid grid-cols-7 gap-1 md:gap-2 relative z-10 w-full aspect-[7/6]">

                                {/* Background layout: Generate 7 columns that act as buttons */}
                                {Array.from({ length: COLS }).map((_, cIdx) => (
                                    <div key={cIdx} className="h-full flex flex-col gap-1 md:gap-2 group outline-none" onClick={() => handleColClick(cIdx)}>
                                        {/* Hover column effect */}
                                        <div className={`absolute top-0 bottom-0 w-[calc(100%/7)] -ml-1 ${isMyTurn && !winData ? 'group-hover:bg-white/10 cursor-pointer pointer-events-none' : 'pointer-events-none'}`}
                                            style={{ left: `calc(${cIdx} * (100% / 7))` }} />

                                        {Array.from({ length: ROWS }).map((_, rIdx) => {
                                            const cell = board[rIdx][cIdx];
                                            const isWinningChip = winData?.winner !== 'draw' && winData?.line?.some(([r, c]) => r === rIdx && c === cIdx);
                                            const cObj = cell ? getColorObj(cell) : null;

                                            return (
                                                <div key={`${rIdx}-${cIdx}`} className="w-full flex-1 relative flex items-center justify-center overflow-hidden">
                                                    {/* Board Grid Cutout Trick using CSS shapes or simple borders */}
                                                    <div className="absolute inset-0 rounded-full border-4 md:border-[6px] border-[var(--bg-color)] z-20 pointer-events-none" />
                                                    <div className="absolute inset-[-10px] bg-sky-600/30 backdrop-blur-md z-10 pointer-events-none"
                                                        style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 10% 10%, 10% 90%, 90% 90%, 90% 10%, 10% 10%)' /* basic inverse hole approximation, but border overlay is better */ }} />

                                                    {/* Chip */}
                                                    <div className={`absolute rounded-full transition-all duration-300 transform w-[90%] h-[90%] z-0
                                          ${cell ? 'scale-100 opacity-100 translate-y-0' : 'scale-50 opacity-0 -translate-y-[200px]'}
                                          ${isWinningChip ? 'animate-pulse-glow z-30 ring-4 ring-white' : ''}
                                         `}
                                                        style={{
                                                            backgroundColor: cObj?.hex,
                                                            boxShadow: isWinningChip ? `0 0 20px ${cObj?.glow}` : `inset -3px -3px 8px rgba(0,0,0,0.4), inset 3px 3px 8px rgba(255,255,255,0.4)`
                                                        }}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Turn indicators inside players view */}
                        <div className="flex justify-between w-[95%] mt-6 px-2 opacity-70">
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full mb-1 shadow-lg" style={{ backgroundColor: myColorObj?.hex }} />
                                <span className="text-xs font-bold">أنت</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full mb-1 shadow-lg border border-white/20" style={{ backgroundColor: getColorObj(isHost ? 'opp' : 'host').hex }} />
                                <span className="text-xs font-bold">الخصم</span>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </>
    );
}
