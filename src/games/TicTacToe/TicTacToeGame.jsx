import React, { useState, useEffect, useRef } from 'react';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import Logo from '../../components/Logo';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Wifi from 'lucide-react/dist/esm/icons/wifi';

// Helper to check winning states
const calculateWinner = (squares) => {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
        [0, 4, 8], [2, 4, 6]             // diagonals
    ];
    for (let i = 0; i < lines.length; i++) {
        const [a, b, c] = lines[i];
        if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
            return { winner: squares[a], line: lines[i] };
        }
    }
    if (!squares.includes(null)) return { winner: 'draw', line: [] };
    return null;
};

export default function TicTacToeGame({ setView }) {
    // ── WebRTC Refs & States ─────────────────────────────────────────
    const connRef = useRef(null);
    const isHostRef = useRef(false);

    const [gameState, setGameState] = useState('lobby'); // lobby, choosing-symbol, waiting-start, playing, finished

    // Game state
    const [board, setBoard] = useState(Array(9).fill(null));
    const [hostSymbol, setHostSymbol] = useState('X');
    const [xIsNext, setXIsNext] = useState(true); // X always goes first

    // We use ref for board/xIsNext to avoid stale closures in network callback
    const boardRef = useRef(Array(9).fill(null));
    const xIsNextRef = useRef(true);

    useEffect(() => {
        boardRef.current = board;
        xIsNextRef.current = xIsNext;
    }, [board, xIsNext]);

    // Derived properties
    const isHost = isHostRef.current;
    const mySymbol = isHost ? hostSymbol : (hostSymbol === 'X' ? 'O' : 'X');
    const isMyTurn = (mySymbol === 'X' && xIsNext) || (mySymbol === 'O' && !xIsNext);
    const winData = calculateWinner(board);

    const handleGameStart = (conn, hostMode) => {
        isHostRef.current = hostMode;
        connRef.current = conn;
        conn.on('data', onData);
        setGameState(hostMode ? 'choosing-symbol' : 'waiting-start');
    };

    const onData = (msg) => {
        if (msg.type === 'play') {
            const newBoard = [...boardRef.current];
            newBoard[msg.index] = msg.symbol;
            setBoard(newBoard);
            setXIsNext(!xIsNextRef.current);
        } else if (msg.type === 'start') {
            setHostSymbol(msg.hostSymbol);
            setGameState('playing');
        } else if (msg.type === 'restart') {
            doRestart();
        }
    };

    const handleClick = (index) => {
        if (gameState !== 'playing' || !isMyTurn || board[index] || winData) return;

        // Apply move locally
        const newBoard = [...board];
        newBoard[index] = mySymbol;
        setBoard(newBoard);
        setXIsNext(!xIsNext);

        // Send to peer
        connRef.current?.send({ type: 'play', index, symbol: mySymbol });
    };

    const handleChooseSymbol = (choice) => {
        setHostSymbol(choice);
        setGameState('playing');
        connRef.current?.send({ type: 'start', hostSymbol: choice });
    };

    const doRestart = () => {
        setBoard(Array(9).fill(null));
        setXIsNext(true);
        setGameState(isHost ? 'choosing-symbol' : 'waiting-start');
    };

    const handleRestart = () => {
        doRestart();
        connRef.current?.send({ type: 'restart' });
    };

    // Rendering helpers
    const getCellClass = (index) => {
        let base = "digit-cell w-full aspect-square flex items-center justify-center text-5xl font-black rounded-2xl cursor-pointer hover:border-[var(--primary-color)] transition-all ";
        if (board[index] === 'X') base += "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)] ";
        if (board[index] === 'O') base += "text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.6)] ";
        if (winData && winData.line.includes(index) && winData.winner !== 'draw') {
            base += "bg-[var(--primary-color)]/20 shadow-[0_0_20px_var(--primary-glow)] border-[var(--primary-color)] ";
        }
        return base;
    };

    return (
        <>
            <div className="animated-bg"><div className="bg-orb-3" /></div>
            <div className="min-h-dvh max-w-md mx-auto px-4 flex flex-col safe-area-pt overflow-x-hidden overflow-y-auto pb-6">

                {/* Nav */}
                <div className="flex justify-between items-center py-4 mb-4 relative">
                    <div className="flex items-center gap-3 z-10">
                        <Logo size="small" />
                        <button
                            onClick={() => { connRef.current?.close(); setView('hub'); }}
                            className="glass-card w-11 h-11 flex items-center justify-center rounded-2xl hover:scale-105 transition-transform"
                        >
                            <ArrowRight size={20} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 glass-card px-3 py-1.5 rounded-[1.25rem] text-xs font-bold leading-tight text-center">
                        {gameState !== 'lobby' ? (
                            <div className="flex items-center gap-3">
                                <span className="flex flex-col items-end">
                                    <span className="text-[12px] font-black gradient-text leading-none mb-1">إكس أو 🎮</span>
                                    <span className="text-[9px] opacity-70 leading-none">أنت ({mySymbol})</span>
                                </span>
                                <div className="w-px h-5 bg-white/20"></div>
                                <span className="flex flex-col items-center justify-center text-emerald-400">
                                    <Wifi size={12} />
                                    <span className="text-[8px] mt-0.5 font-black">متصل</span>
                                </span>
                            </div>
                        ) : (
                            <span className="text-[11px] font-black gradient-text">إكس أو 🎮</span>
                        )}
                    </div>
                </div>

                {/* Lobby */}
                {gameState === 'lobby' && (
                    <div className="flex-1 flex pb-16">
                        <P2PConnectionManager gameIdPrefix="celia-xo" onGameStart={handleGameStart} />
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
                    <div className="flex-1 flex flex-col">

                        {/* Status Info */}
                        <div className="text-center mb-8">
                            {!winData ? (
                                <div className={`glass-card rounded-2xl py-3 px-6 inline-block transition-all ${isMyTurn ? 'animate-pulse-glow border-[var(--primary-color)]' : ''}`}>
                                    <p className="font-black text-lg" style={{ color: isMyTurn ? 'var(--primary-color)' : 'inherit' }}>
                                        {isMyTurn ? `🎯 دورك تلعب بـ (${mySymbol})!` : '⏳ دور الطرف التاني...'}
                                    </p>
                                </div>
                            ) : (
                                <div className="glass-card rounded-2xl py-3 px-6 text-center animate-pop-in">
                                    <p className={`font-black text-3xl mb-1 ${winData.winner === mySymbol ? 'text-emerald-400' : (winData.winner === 'draw' ? 'text-yellow-400' : 'text-red-400')}`}>
                                        {winData.winner === 'draw' ? '⚖️ تعادل!' : winData.winner === mySymbol ? '🎉 كسبت التحدي!' : '💔 خسرت التحدي!'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Board */}
                        <div className="grid grid-cols-3 gap-3 w-full max-w-sm mx-auto p-4 glass-card rounded-3xl" dir="ltr">
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
                                <button
                                    key={index}
                                    onClick={() => handleClick(index)}
                                    disabled={!isMyTurn || board[index] || winData}
                                    className={getCellClass(index)}
                                >
                                    <span className={board[index] ? 'animate-pop-in' : ''}>
                                        {board[index]}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="mt-auto pb-4 safe-area-pb pt-10">
                            {winData && (
                                <button onClick={handleRestart} className="glow-button w-full h-14 rounded-2xl text-lg font-black flex items-center justify-center gap-2 animate-pop-in">
                                    <RotateCcw size={20} /> العبوا تاني
                                </button>
                            )}
                        </div>

                    </div>
                )}

            </div>
        </>
    );
}
