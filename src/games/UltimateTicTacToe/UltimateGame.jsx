import React, { useState, useEffect, useRef } from 'react';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import Logo from '../../components/Logo';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Wifi from 'lucide-react/dist/esm/icons/wifi';

// Helper to check winning states on a 3x3 array (Classic XO)
const checkWin = (squares) => {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    for (let i = 0; i < lines.length; i++) {
        const [a, b, c] = lines[i];
        if (squares[a] && squares[a] !== 'draw' && squares[a] === squares[b] && squares[a] === squares[c]) {
            return squares[a];
        }
    }
    // Draw condition: no nulls left and no winner
    if (!squares.includes(null)) return 'draw';
    return null;
};

export default function UltimateGame({ setView }) {
    // ── WebRTC Refs & States ──
    const connRef = useRef(null);
    const isHostRef = useRef(false);

    const [gameState, setGameState] = useState('lobby');

    // ── Ultimate Tic-Tac-Toe Rules State (Free Play initially, then restricted) ──
    const [boards, setBoards] = useState(Array.from({ length: 9 }, () => Array(9).fill(null)));
    const [bigBoard, setBigBoard] = useState(Array(9).fill(null));
    const [activeBoardIdx, setActiveBoardIdx] = useState(null); // Which mini-board the next player MUST play in

    // Custom Symbol selection
    const [hostSymbol, setHostSymbol] = useState('X');
    const [xIsNext, setXIsNext] = useState(true); // X always goes first

    const stateRef = useRef({ boards, bigBoard, xIsNext, activeBoardIdx });
    useEffect(() => {
        stateRef.current = { boards, bigBoard, xIsNext, activeBoardIdx };
    }, [boards, bigBoard, xIsNext, activeBoardIdx]);

    // Derived properties
    const isHost = isHostRef.current;
    const mySymbol = isHost ? hostSymbol : (hostSymbol === 'X' ? 'O' : 'X');
    const isMyTurn = (mySymbol === 'X' && xIsNext) || (mySymbol === 'O' && !xIsNext);
    const overallWinner = checkWin(bigBoard);

    const handleGameStart = (conn, hostMode) => {
        isHostRef.current = hostMode;
        connRef.current = conn;
        conn.on('data', onData);
        setGameState(hostMode ? 'choosing-symbol' : 'waiting-start');
    };

    const onData = (msg) => {
        if (msg.type === 'play') {
            applyMove(msg.boardIdx, msg.cellIdx, msg.symbol);
        } else if (msg.type === 'start') {
            setHostSymbol(msg.hostSymbol);
            setGameState('playing');
        } else if (msg.type === 'restart') {
            const cur = stateRef.current;
            if (checkWin(cur.bigBoard) === null) return; // Ignore if we already restarted locally
            doRestart();
        }
    };

    // Core logic: Apply a move and enforce Ultimate Tic-Tac-Toe rules
    const applyMove = (boardIdx, cellIdx, symbol) => {
        const current = stateRef.current;

        // 1. Update mini board
        const newBoards = current.boards.map(arr => [...arr]);
        newBoards[boardIdx][cellIdx] = symbol;
        setBoards(newBoards);

        // 2. Check if this mini board is now won
        const newBigBoard = [...current.bigBoard];
        let miniWinner = current.bigBoard[boardIdx];

        if (!miniWinner) {
            miniWinner = checkWin(newBoards[boardIdx]);
            if (miniWinner) {
                newBigBoard[boardIdx] = miniWinner;
            }
            setBigBoard(newBigBoard);
        }

        // 3. Update active board for the next player
        // The cell played (cellIdx) determines the next required board.
        // If the target board is already won/drawn, the next player can play anywhere.
        const targetBoardWinner = checkWin(newBoards[cellIdx]); // Check its live state just in case
        const targetBoardResolved = targetBoardWinner || newBigBoard[cellIdx] !== null;

        setActiveBoardIdx(targetBoardResolved ? null : cellIdx);

        // 4. Flip turn
        setXIsNext(!current.xIsNext);
    };

    const handleClick = (boardIdx, cellIdx) => {
        if (gameState !== 'playing' || !isMyTurn || overallWinner) return;

        // Validation: 
        // Is the Big Board already won there?
        if (bigBoard[boardIdx] !== null) return;
        // Is the cell already taken?
        if (boards[boardIdx][cellIdx] !== null) return;

        // Ultimate XO Rule constraint
        if (activeBoardIdx !== null && activeBoardIdx !== boardIdx) return;

        // Apply locally
        applyMove(boardIdx, cellIdx, mySymbol);

        // Network
        connRef.current?.send({ type: 'play', boardIdx, cellIdx, symbol: mySymbol });
    };

    const handleChooseSymbol = (choice) => {
        setHostSymbol(choice);
        setGameState('playing');
        connRef.current?.send({ type: 'start', hostSymbol: choice });
    };

    const doRestart = () => {
        setBoards(Array.from({ length: 9 }, () => Array(9).fill(null)));
        setBigBoard(Array(9).fill(null));
        setXIsNext(true);
        setActiveBoardIdx(null);
        setGameState(isHost ? 'choosing-symbol' : 'waiting-start');
    };

    const handleRestart = () => {
        doRestart();
        connRef.current?.send({ type: 'restart' });
    };

    return (
        <>
            <div className="animated-bg"><div className="bg-orb-3" style={{ background: 'var(--accent-glow)' }} /></div>
            <div className="min-h-dvh max-w-lg mx-auto flex flex-col safe-area-pt overflow-x-hidden overflow-y-auto pb-6">

                {/* Nav */}
                <div className="px-4 flex justify-between items-center py-4 mb-2 relative">
                    <div className="flex items-center gap-3 z-10">
                        <Logo size="small" />
                        <button
                            onClick={() => { connRef.current?.close(); setView('hub'); }}
                            className="glass-card w-11 h-11 flex items-center justify-center rounded-2xl hover:scale-105 transition-transform"
                        >
                            <ArrowRight size={20} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 glass-card px-3 py-1.5 rounded-[1.25rem] text-xs font-bold leading-tight text-center z-10">
                        {gameState !== 'lobby' ? (
                            <div className="flex items-center gap-3">
                                <span className="flex flex-col items-end">
                                    <span className="text-[12px] font-black gradient-text leading-none mb-1">إكس أو الكبير 💥</span>
                                    <span className="text-[9px] opacity-70 leading-none">أنت ({mySymbol})</span>
                                </span>
                                <div className="w-px h-5 bg-white/20"></div>
                                <span className="flex flex-col items-center justify-center text-emerald-400">
                                    <Wifi size={12} />
                                    <span className="text-[8px] mt-0.5 font-black">متصل</span>
                                </span>
                            </div>
                        ) : (
                            <span className="text-[11px] font-black gradient-text">إكس أو الكبير 💥</span>
                        )}
                    </div>
                </div>

                {/* Lobby */}
                {gameState === 'lobby' && (
                    <div className="flex-1 flex pb-16 safe-area-pb px-4">
                        <P2PConnectionManager gameIdPrefix="celia-uxo" onGameStart={handleGameStart} />
                    </div>
                )}

                {/* Screen: Choosing Symbol (Host) */}
                {gameState === 'choosing-symbol' && (
                    <div className="flex-1 flex flex-col items-center justify-center -mt-10 px-4">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center animate-pop-in">
                            <h2 className="text-2xl font-black mb-3">🎮 اختار تلعب بإيه؟</h2>
                            <p className="opacity-60 text-sm mb-6 font-bold">دايماً X بيلعب الأول</p>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => handleChooseSymbol('X')}
                                    className="glass-card glass-card-hover rounded-2xl py-6 flex flex-col items-center gap-2 border border-transparent hover:border-emerald-400/50"
                                >
                                    <span className="text-5xl font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]">X</span>
                                    <span className="text-sm font-bold opacity-70 mt-2">العب الأول</span>
                                </button>
                                <button
                                    onClick={() => handleChooseSymbol('O')}
                                    className="glass-card glass-card-hover rounded-2xl py-6 flex flex-col items-center gap-2 border border-transparent hover:border-pink-400/50"
                                >
                                    <span className="text-5xl font-black text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.6)]">O</span>
                                    <span className="text-sm font-bold opacity-70 mt-2">خلي الخصم يبدأ</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Screen: Waiting (Client) */}
                {gameState === 'waiting-start' && (
                    <div className="flex-1 flex items-center justify-center -mt-10 px-4">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center animate-pulse-glow">
                            <h2 className="text-2xl font-black mb-2">في الانتظار... ⏳</h2>
                            <p className="opacity-60 text-sm font-bold">الطرف التاني بيختار X ولا O</p>
                        </div>
                    </div>
                )}

                {/* Game */}
                {gameState === 'playing' && (
                    <div className="flex-1 flex flex-col items-center pb-6">

                        {/* Status */}
                        <div className="mb-4">
                            {!overallWinner ? (
                                <div className={`glass-card rounded-2xl py-2 px-6 transition-all ${isMyTurn ? 'animate-pulse-glow shadow-[0_0_15px_var(--primary-color)]' : ''}`}>
                                    <p className="font-black text-sm text-center leading-relaxed" style={{ color: isMyTurn ? 'var(--primary-color)' : 'inherit' }}>
                                        {isMyTurn ? `🎯 دورك تلعب بـ (${mySymbol})!` : '⏳ دور الطرف التاني...'} <br />
                                        <span className="text-xs opacity-70 text-white">العب جوا المربع المنور</span>
                                    </p>
                                </div>
                            ) : (
                                <div className="glass-card rounded-2xl py-4 px-8 text-center animate-pop-in">
                                    <p className={`font-black text-2xl ${overallWinner === mySymbol ? 'text-emerald-400' : (overallWinner === 'draw' ? 'text-yellow-400' : 'text-red-400')}`}>
                                        {overallWinner === 'draw' ? '⚖️ تعادل!' : overallWinner === mySymbol ? '🎉 أنت البطل!' : '💔 خسرت التحدي!'}
                                    </p>
                                    <button onClick={handleRestart} className="mt-4 glow-button w-full h-12 rounded-xl text-sm font-black flex items-center justify-center gap-2">
                                        <RotateCcw size={18} /> العب جديد
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* BIG BOARD */}
                        <div className={`glass-card p-1.5 rounded-2xl flex-shrink-0 bg-opacity-20 grid grid-cols-3 grid-rows-3 gap-1 w-[95%] aspect-square
              ${overallWinner ? 'opacity-70 pointer-events-none grayscale-[30%]' : ''}`}
                            dir="ltr"
                        >
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((boardIdx) => {

                                const miniWinner = bigBoard[boardIdx];
                                const isActiveBoard = activeBoardIdx === null || activeBoardIdx === boardIdx;
                                const canPlayHere = isMyTurn && !overallWinner && !miniWinner && isActiveBoard;

                                return (
                                    <div
                                        key={boardIdx}
                                        className={`min-h-0 min-w-0 w-full h-full relative grid grid-cols-3 grid-rows-3 gap-0.5 sm:gap-1 p-1 rounded-xl transition-all duration-300
                      ${!miniWinner ? 'bg-black bg-opacity-20' : 'bg-black bg-opacity-40'}
                      ${isActiveBoard && !miniWinner && !overallWinner ? 'ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)] scale-[1.02] z-10' : 'opacity-60 scale-95'}
                    `}
                                    >

                                        {/* Big Winner Overlay (takes over the whole mini board when won/drawn) */}
                                        {miniWinner && (
                                            <div className={`absolute inset-0 z-20 flex items-center justify-center rounded-xl animate-pop-in bg-black bg-opacity-60 backdrop-blur-[2px]
                        ${miniWinner === 'X' ? 'text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)]' :
                                                    miniWinner === 'O' ? 'text-pink-400 shadow-[0_0_20px_rgba(244,114,182,0.3)]' : 'text-yellow-400'}
                      `}>
                                                <span className="text-6xl font-black">{miniWinner === 'draw' ? '-' : miniWinner}</span>
                                            </div>
                                        )}

                                        {/* Mini board cells */}
                                        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((cellIdx) => {
                                            const val = boards[boardIdx][cellIdx];
                                            return (
                                                <button
                                                    key={cellIdx}
                                                    onClick={() => handleClick(boardIdx, cellIdx)}
                                                    disabled={!canPlayHere || val}
                                                    className={`w-full h-full flex items-center justify-center p-0 m-0 min-h-0 min-w-0 text-[18px] sm:text-xl font-black rounded-[4px] border border-white border-opacity-10 bg-white bg-opacity-5 transition-colors shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]
                            ${canPlayHere && !val ? 'hover:bg-white hover:bg-opacity-20 hover:scale-105 active:scale-95' : ''}
                            ${val === 'X' ? 'text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.8)]' : val === 'O' ? 'text-pink-400 drop-shadow-[0_0_4px_rgba(244,114,182,0.8)]' : ''}
                          `}
                                                >
                                                    {val}
                                                </button>
                                            );
                                        })}

                                    </div>
                                );
                            })}
                        </div>

                    </div>
                )}
            </div>
        </>
    );
}
