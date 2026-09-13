import React, { useState, useEffect, useRef } from 'react';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import Logo from '../../components/Logo';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Film from 'lucide-react/dist/esm/icons/film';
import { playSound, playHaptic } from '../../lib/audioEngine';
import EmotesOverlay from '../../components/EmotesOverlay';
import PlayerGameHeader from '../../components/PlayerGameHeader';
import ConnectionPauseOverlay from '../../components/ConnectionPauseOverlay';
import MatchRecapModal from '../../components/MatchRecapModal';
import useProfile from '../../hooks/useProfile';

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
    const connRef = useRef(null);
    const isHostRef = useRef(false);

    const [myProfile] = useProfile();
    const [oppProfile, setOppProfile] = useState(null);

    const [gameState, setGameState] = useState('lobby'); // lobby, choosing-symbol, choosing-starts, waiting-start, playing

    // Game state
    const [board, setBoard] = useState(Array(9).fill(null));
    const [hostSymbolConfig, setHostSymbolConfig] = useState('X');
    const [hostSymbol, setHostSymbol] = useState('X');
    const [xIsNext, setXIsNext] = useState(true);

    // History for Match Recap
    const [moveHistory, setMoveHistory] = useState([]);
    const [showRecap, setShowRecap] = useState(false);

    // Score stats
    const [scores, setScores] = useState({ me: 0, opp: 0 });

    const boardRef = useRef(Array(9).fill(null));
    const xIsNextRef = useRef(true);

    useEffect(() => {
        boardRef.current = board;
        xIsNextRef.current = xIsNext;
    }, [board, xIsNext]);

    const isHost = isHostRef.current;
    const mySymbol = isHost ? hostSymbol : (hostSymbol === 'X' ? 'O' : 'X');
    const isMyTurn = (mySymbol === 'X' && xIsNext) || (mySymbol === 'O' && !xIsNext);
    const winData = calculateWinner(board);

    const handleGameStart = (conn, hostMode, oppProf) => {
        isHostRef.current = hostMode;
        connRef.current = conn;
        if (oppProf) setOppProfile(oppProf);
        conn.on('data', onData);
        setGameState(hostMode ? 'choosing-symbol' : 'waiting-start');
    };

    const onData = (msg) => {
        if (msg.type === 'play') {
            const newBoard = [...boardRef.current];
            newBoard[msg.index] = msg.symbol;

            playSound('pop');
            playHaptic(25);

            setMoveHistory(prev => [...prev, { index: msg.index, symbol: msg.symbol, player: 'opp' }]);

            setBoard(newBoard);
            setXIsNext(!xIsNextRef.current);

            const win = calculateWinner(newBoard);
            if (win) {
                if (win.winner === 'draw') {
                    playSound('ding');
                } else if (win.winner === mySymbol) {
                    playSound('win');
                    playHaptic([50, 50, 100]);
                    setScores(s => ({ ...s, me: s.me + 1 }));
                } else {
                    playSound('lose');
                    setScores(s => ({ ...s, opp: s.opp + 1 }));
                }
            }
        } else if (msg.type === 'start') {
            setHostSymbol(msg.hostSymbol);
            setXIsNext(msg.xIsNext);
            setGameState('playing');
            playSound('ding');
        } else if (msg.type === 'restart') {
            if (boardRef.current.every(cell => cell === null)) return;
            doRestart();
        }
    };

    const handleClick = (index) => {
        if (gameState !== 'playing' || !isMyTurn || board[index] || winData) return;

        playSound('click');
        playHaptic(15);

        const newBoard = [...board];
        newBoard[index] = mySymbol;

        setMoveHistory(prev => [...prev, { index, symbol: mySymbol, player: 'me' }]);

        setBoard(newBoard);
        setXIsNext(!xIsNext);

        const win = calculateWinner(newBoard);
        if (win) {
            if (win.winner === 'draw') {
                playSound('ding');
            } else if (win.winner === mySymbol) {
                playSound('win');
                playHaptic([50, 50, 100]);
                setScores(s => ({ ...s, me: s.me + 1 }));
            } else {
                playSound('lose');
                setScores(s => ({ ...s, opp: s.opp + 1 }));
            }
        }

        connRef.current?.send({ type: 'play', index, symbol: mySymbol });
    };

    const handleChooseSymbol = (choice) => {
        setHostSymbolConfig(choice);
        playSound('click');
        setGameState('choosing-starts');
    };

    const handleChooseStarts = (hostStarts) => {
        setHostSymbol(hostSymbolConfig);
        const newXIsNext = hostSymbolConfig === 'X' ? hostStarts : !hostStarts;
        setXIsNext(newXIsNext);
        playSound('ding');
        setGameState('playing');
        connRef.current?.send({ type: 'start', hostSymbol: hostSymbolConfig, xIsNext: newXIsNext });
    };

    const doRestart = () => {
        setBoard(Array(9).fill(null));
        setMoveHistory([]);
        setShowRecap(false);
        setGameState(isHostRef.current ? 'choosing-symbol' : 'waiting-start');
    };

    const handleRestart = () => {
        doRestart();
        connRef.current?.send({ type: 'restart' });
    };

    const getCellClass = (index) => {
        let base = "digit-cell w-full aspect-square flex items-center justify-center text-5xl font-black rounded-2xl cursor-pointer hover:border-emerald-400 transition-all ";
        if (board[index] === 'X') base += "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)] ";
        if (board[index] === 'O') base += "text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.6)] ";
        if (winData && winData.line.includes(index) && winData.winner !== 'draw') {
            base += "bg-emerald-500/20 shadow-[0_0_20px_rgba(52,211,153,0.4)] border-2 border-emerald-400 animate-pulse ";
        }
        return base;
    };

    return (
        <>
            <div className="animated-bg"><div className="bg-orb-3" /></div>
            <div className="min-h-dvh max-w-md mx-auto px-4 flex flex-col safe-area-pt overflow-x-hidden overflow-y-auto pb-6">

                {/* Header with Player Cards */}
                {gameState !== 'lobby' ? (
                    <PlayerGameHeader
                        title="إكس أو 🎮"
                        gameEmoji="🎮"
                        isMyTurn={isMyTurn}
                        oppProfile={oppProfile}
                        myScore={scores.me}
                        oppScore={scores.opp}
                        onLeave={() => { connRef.current?.close(); setView('hub'); }}
                    />
                ) : (
                    <div className="flex justify-between items-center py-4 mb-4">
                        <Logo size="small" />
                        <button
                            onClick={() => setView('hub')}
                            className="glass-card px-4 py-2 rounded-2xl text-xs font-bold hover:scale-105 transition-transform"
                        >
                            الرئيسية
                        </button>
                    </div>
                )}

                {/* Lobby */}
                {gameState === 'lobby' && (
                    <div className="flex-1 flex pb-16 safe-area-pb">
                        <P2PConnectionManager gameIdPrefix="celia-xo" onGameStart={handleGameStart} />
                    </div>
                )}

                {/* Choosing Symbol (Host) */}
                {gameState === 'choosing-symbol' && (
                    <div className="flex-1 flex flex-col items-center justify-center -mt-6 px-4 animate-fade-in">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center border border-white/10 shadow-2xl">
                            <h2 className="text-2xl font-black mb-1">🎮 اختار تلعب بإيه؟</h2>
                            <p className="opacity-60 text-xs mb-6 font-bold">المرحلة 1 من 2</p>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => handleChooseSymbol('X')}
                                    className="glass-card rounded-2xl h-28 flex flex-col items-center justify-center gap-2 border border-transparent hover:border-emerald-400/50 hover:scale-105 active:scale-95 transition-all"
                                >
                                    <span className="text-6xl leading-none font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]">X</span>
                                </button>
                                <button
                                    onClick={() => handleChooseSymbol('O')}
                                    className="glass-card rounded-2xl h-28 flex flex-col items-center justify-center gap-2 border border-transparent hover:border-pink-400/50 hover:scale-105 active:scale-95 transition-all"
                                >
                                    <span className="text-6xl leading-none font-black text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.6)]">O</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Choosing Starts (Host) */}
                {gameState === 'choosing-starts' && (
                    <div className="flex-1 flex flex-col items-center justify-center -mt-6 px-4 animate-fade-in">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center border border-white/10 shadow-2xl">
                            <h2 className="text-2xl font-black mb-1">مين هيبدأ الدور؟</h2>
                            <p className="opacity-60 text-xs mb-6 font-bold">المرحلة 2 من 2</p>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => handleChooseStarts(true)}
                                    className="glass-card rounded-2xl py-4 font-black flex items-center justify-center gap-2 border border-transparent hover:border-emerald-400/50 hover:scale-105 active:scale-95 transition-all"
                                >
                                    أبدأ أنا الأول 🙋‍♂️
                                </button>
                                <button
                                    onClick={() => handleChooseStarts(false)}
                                    className="glass-card rounded-2xl py-4 font-black flex items-center justify-center gap-2 border border-transparent hover:border-emerald-400/50 hover:scale-105 active:scale-95 transition-all"
                                >
                                    الخصم يبدأ 🤝
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Waiting Screen (Guest) */}
                {gameState === 'waiting-start' && (
                    <div className="flex-1 flex items-center justify-center -mt-6 px-4 animate-fade-in">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center border border-emerald-400/30">
                            <h2 className="text-2xl font-black mb-2">في الانتظار... ⏳</h2>
                            <p className="opacity-60 text-sm font-bold">
                                {oppProfile?.nickname || 'المضيف'} بيظبط إعدادات اللعبة الآن
                            </p>
                        </div>
                    </div>
                )}

                {/* Game Playing */}
                {gameState === 'playing' && (
                    <div className="flex-1 flex flex-col animate-fade-in">

                        {/* Status Bar */}
                        <div className="text-center mb-6">
                            {!winData ? (
                                <div className={`glass-card rounded-2xl py-2.5 px-6 inline-block transition-all ${isMyTurn ? 'border-2 border-emerald-400/60 bg-emerald-500/10 animate-pulse' : 'border border-white/5'}`}>
                                    <p className={`font-black text-sm ${isMyTurn ? 'text-emerald-400' : 'opacity-70'}`}>
                                        {isMyTurn ? `🎯 دورك تلعب بـ (${mySymbol})!` : '⏳ انتظر دور الخصم...'}
                                    </p>
                                </div>
                            ) : (
                                <div className="glass-card rounded-2xl py-3 px-6 text-center animate-pop-in">
                                    <p className={`font-black text-2xl mb-1 ${winData.winner === mySymbol ? 'text-emerald-400' : (winData.winner === 'draw' ? 'text-amber-400' : 'text-rose-400')}`}>
                                        {winData.winner === 'draw' ? '⚖️ تعادل ممتاز!' : winData.winner === mySymbol ? '🎉 كسبت التحدي!' : '💔 خسرت التحدي!'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Board */}
                        <div className="grid grid-cols-3 gap-3 w-full max-w-sm mx-auto p-4 glass-card rounded-3xl border border-white/10 shadow-2xl" dir="ltr">
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

                        {/* Post-game Actions */}
                        <div className="mt-auto pb-4 safe-area-pb pt-6">
                            {winData && (
                                <div className="flex gap-2 animate-pop-in">
                                    <button
                                        onClick={() => setShowRecap(true)}
                                        className="glass-card flex-1 h-14 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-white/10"
                                    >
                                        <Film size={16} className="text-amber-400" /> إعادة الجولة
                                    </button>
                                    <button
                                        onClick={handleRestart}
                                        className="glow-button flex-[2] h-14 rounded-2xl text-base font-black flex items-center justify-center gap-2"
                                    >
                                        <RotateCcw size={18} /> العبوا تاني
                                    </button>
                                </div>
                            )}
                        </div>

                    </div>
                )}

            </div>

            {/* Connection Pause Overlay */}
            <ConnectionPauseOverlay
                conn={connRef.current}
                onLeave={() => { connRef.current?.close(); setView('hub'); }}
            />

            {/* Emotes Layer */}
            {gameState === 'playing' && <EmotesOverlay conn={connRef.current} />}

            {/* Match Recap Modal */}
            <MatchRecapModal
                isOpen={showRecap}
                onClose={() => setShowRecap(false)}
                onRestart={handleRestart}
                gameType="xo"
                history={moveHistory}
                winner={winData ? (winData.winner === mySymbol ? 'me' : (winData.winner === 'draw' ? 'draw' : 'opp')) : 'me'}
                myProfile={myProfile}
                oppProfile={oppProfile}
            />
        </>
    );
}
