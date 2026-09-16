import React, { useState, useEffect, useRef } from 'react';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import Logo from '../../components/Logo';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Wifi from 'lucide-react/dist/esm/icons/wifi';
import GlobalMuteButton from '../../components/GlobalMuteButton';
import EmotesOverlay, { ChatTriggerButton } from '../../components/EmotesOverlay';
import useProfile from '../../hooks/useProfile';
import { triggerVictoryEffects, triggerDefeatEffects, triggerDrawEffects } from '../../lib/effectsEngine';
import { AvatarDisplay } from '../../components/icons/AvatarIcons';
import { IconBigXOGame, IconTarget, IconHourglass, IconTrophy } from '../../components/icons/GameIcons';

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

    const [myProfile] = useProfile();
    const [oppProfile, setOppProfile] = useState(null);

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
    const opp = oppProfile || { nickname: 'الخصم', avatar: 'alien' };

    useEffect(() => {
        if (overallWinner) {
            if (overallWinner === 'draw') {
                triggerDrawEffects();
            } else if (overallWinner === mySymbol) {
                triggerVictoryEffects();
                // haptic feedback for win
                if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100, 50, 200]);
            } else {
                triggerDefeatEffects();
            }
        }
    }, [overallWinner, mySymbol]);

    const handleGameStart = (conn, hostMode, oppProf) => {
        isHostRef.current = hostMode;
        connRef.current = conn;
        if (oppProf) setOppProfile(oppProf);
        conn.on('data', onData);
        setGameState(hostMode ? 'choosing-symbol' : 'waiting-start');
    };

    const onData = (msg) => {
        if (msg.type === 'global_ready' && msg.profile) {
            setOppProfile(msg.profile);
        } else if (msg.type === 'play') {
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
        setGameState(isHostRef.current ? 'choosing-symbol' : 'waiting-start');
    };

    const handleRestart = () => {
        doRestart();
        connRef.current?.send({ type: 'restart' });
    };

    return (
        <>
            <div className="animated-bg"><div className="bg-orb-3" style={{ background: 'var(--accent-glow)' }} /></div>
            <div className="min-h-dvh max-w-lg mx-auto flex flex-col safe-area-pt overflow-x-hidden overflow-y-auto pb-6">

                {/* Header: Lobby with Logo vs In-Game Header */}
                {gameState === 'lobby' ? (
                    <div className="px-4 flex justify-between items-center py-4 mb-2 w-full">
                        <Logo size="small" />
                        <button
                            onClick={() => { connRef.current?.close(); setView('hub'); }}
                            className="glass-card px-4 py-2 rounded-2xl text-xs font-bold hover:scale-105 active:scale-95 transition-transform text-white/90"
                        >
                            الرئيسية
                        </button>
                    </div>
                ) : (
                    <header className="px-4 py-3 flex items-center justify-between gap-2 w-full z-20">
                        <button
                            onClick={() => { connRef.current?.close(); setView('hub'); }}
                            className="glass-card w-10 h-10 flex items-center justify-center rounded-2xl hover:scale-105 active:scale-95 transition-all text-white/80 shrink-0"
                            title="الرجوع للرئيسية"
                        >
                            <ArrowRight size={18} />
                        </button>

                        <div className="flex items-center gap-2 glass-card px-3.5 py-1.5 rounded-2xl border border-white/10 shrink-0">
                            <Logo size="mini" />
                            <IconBigXOGame size={18} className="text-[var(--accent)]" />
                            <span className="text-xs font-black gradient-text">Big XO</span>
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold mr-1">
                                <Wifi size={11} />
                                <span>متصل ({mySymbol})</span>
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            {gameState === 'playing' && (
                                <ChatTriggerButton onClick={() => window.dispatchEvent(new CustomEvent('toggle-game-chat'))} />
                            )}
                            <GlobalMuteButton className="w-10 h-10 !rounded-2xl shrink-0" />
                        </div>
                    </header>
                )}

                {/* Lobby */}
                {gameState === 'lobby' && (
                    <div className="flex-1 flex pb-16 safe-area-pb px-4">
                        <P2PConnectionManager gameIdPrefix="celia-uxo" onGameStart={handleGameStart} />
                    </div>
                )}

                {/* Screen: Choosing Symbol (Host) */}
                {gameState === 'choosing-symbol' && (
                    <div className="flex-1 flex flex-col items-center justify-center -mt-6 px-4">
                        <div className="glass-card rounded-3xl p-7 w-full max-w-sm text-center animate-pop-in border border-white/10 shadow-2xl">
                            <h2 className="text-xl font-black mb-2 gradient-text">اختار تلعب بإيه؟</h2>
                            <p className="opacity-60 text-xs mb-6 font-bold">دايماً X بيلعب الأول</p>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => handleChooseSymbol('X')}
                                    className="glass-card glass-card-hover rounded-2xl py-6 flex flex-col items-center gap-2 border border-white/10 hover:border-emerald-400/50"
                                >
                                    <span className="text-5xl font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]">X</span>
                                    <span className="text-xs font-bold opacity-70 mt-1">العب الأول</span>
                                </button>
                                <button
                                    onClick={() => handleChooseSymbol('O')}
                                    className="glass-card glass-card-hover rounded-2xl py-6 flex flex-col items-center gap-2 border border-white/10 hover:border-pink-400/50"
                                >
                                    <span className="text-5xl font-black text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.6)]">O</span>
                                    <span className="text-xs font-bold opacity-70 mt-1">الخصم يبدأ</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Screen: Waiting (Client) */}
                {gameState === 'waiting-start' && (
                    <div className="flex-1 flex items-center justify-center -mt-6 px-4">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center animate-pulse-glow border border-white/10">
                            <h2 className="text-xl font-black mb-2 gradient-text">في الانتظار...</h2>
                            <p className="opacity-60 text-xs font-bold">الطرف الآخر يحدد من يبدأ</p>
                        </div>
                    </div>
                )}

                {/* Game */}
                {gameState === 'playing' && (
                    <div className="flex-1 flex flex-col items-center pb-6">

                        {/* Players duel bar */}
                        <div className="grid grid-cols-2 gap-2.5 w-[95%] max-w-[370px] mb-3">
                            <div className={`glass-card p-2 rounded-xl flex items-center gap-2 border transition-all ${isMyTurn ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-white/10 opacity-70'}`}>
                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                                    <AvatarDisplay avatarId={myProfile.avatar} size={22} />
                                </div>
                                <div className="flex flex-col min-w-0 flex-1 text-right">
                                    <span className="text-[11px] font-black truncate">{myProfile.nickname || 'أنت'}</span>
                                    <span className="text-[10px] font-bold text-emerald-400 font-mono">({mySymbol})</span>
                                </div>
                            </div>
                            <div className={`glass-card p-2 rounded-xl flex items-center gap-2 border transition-all ${!isMyTurn ? 'border-sky-400 bg-sky-500/10' : 'border-white/10 opacity-70'}`}>
                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                                    <AvatarDisplay avatarId={opp.avatar} size={22} />
                                </div>
                                <div className="flex flex-col min-w-0 flex-1 text-right">
                                    <span className="text-[11px] font-black truncate">{opp.nickname || 'الخصم'}</span>
                                    <span className="text-[10px] font-bold text-pink-400 font-mono">({mySymbol === 'X' ? 'O' : 'X'})</span>
                                </div>
                            </div>
                        </div>

                        {/* Status */}
                        <div className="mb-4 w-full px-4 text-center">
                            {!overallWinner ? (
                                <div className={`glass-card rounded-2xl py-2 px-5 inline-flex flex-col items-center transition-all border border-white/10 ${isMyTurn ? 'animate-pulse-glow' : ''}`}>
                                    <p className="font-black text-xs text-center flex items-center gap-2" style={{ color: isMyTurn ? 'var(--accent)' : 'inherit' }}>
                                        {isMyTurn ? (
                                            <>
                                                <div className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center overflow-hidden shrink-0 border border-white/20">
                                                    <AvatarDisplay avatarId={myProfile.avatar} size={15} />
                                                </div>
                                                <span>دورك تلعب بـ ({mySymbol})!</span>
                                                <IconTarget size={13} className="shrink-0" />
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center overflow-hidden shrink-0 border border-white/20">
                                                    <AvatarDisplay avatarId={opp.avatar} size={15} />
                                                </div>
                                                <span className="opacity-90">دور {opp.nickname || 'الخصم'}...</span>
                                                <IconHourglass size={13} className="opacity-60 shrink-0" />
                                            </>
                                        )}
                                    </p>
                                    <span className="text-[10px] opacity-60 text-white mt-0.5">العب داخل المربع المضيء</span>
                                </div>
                            ) : (
                                <div className="glass-card rounded-2xl py-4 px-8 text-center animate-pop-in border border-white/10 shadow-2xl">
                                    <p className={`font-black text-xl flex items-center justify-center gap-2 ${overallWinner === mySymbol ? 'text-emerald-400' : (overallWinner === 'draw' ? 'text-yellow-400' : 'text-rose-400')}`}>
                                        <IconTrophy size={20} className="text-amber-400" />
                                        <span>
                                            {overallWinner === 'draw' ? 'تعادل رائع!' : overallWinner === mySymbol ? 'أنت الفائز البطل!' : 'انتهت اللعبة!'}
                                        </span>
                                    </p>
                                    <button onClick={handleRestart} className="mt-3 glow-button w-full h-11 rounded-xl text-sm font-black flex items-center justify-center gap-2">
                                        <RotateCcw size={16} /> العب جديد
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
            {gameState === 'playing' && (
                <EmotesOverlay conn={connRef.current} oppProfile={opp} showStandaloneButton={false} />
            )}
        </>
    );
}
