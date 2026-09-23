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
import { IconConnect4, IconTarget, IconHourglass, IconTrophy } from '../../components/icons/GameIcons';

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

    const [myProfile] = useProfile();
    const [oppProfile, setOppProfile] = useState(null);

    const [gameState, setGameState] = useState('lobby');

    const [board, setBoard] = useState(Array.from({ length: ROWS }, () => Array(COLS).fill(null)));

    // Customization
    const [hostColor, setHostColor] = useState(COLORS[0].id);
    const [oppColor, setOppColor] = useState(COLORS[1].id);
    const [hostPlaysFirst, setHostPlaysFirst] = useState(true);

    // Network sync props
    const [clientConfig, setClientConfig] = useState(null);
    const [hostTurn, setHostTurn] = useState(true); // Tracks turn, true: host, false: opp

    const [myScore, setMyScore] = useState(0);
    const [oppScore, setOppScore] = useState(0);

    const boardRef = useRef(board);
    const hostTurnRef = useRef(true);
    const myScoreRef = useRef(0);
    const oppScoreRef = useRef(0);

    useEffect(() => {
        boardRef.current = board;
        hostTurnRef.current = hostTurn;
        myScoreRef.current = myScore;
        oppScoreRef.current = oppScore;
    }, [board, hostTurn, myScore, oppScore]);

    // Derived
    const isHost = isHostRef.current;
    const myColorId = isHost ? hostColor : (clientConfig?.oppColor || 'blue');
    const oppColorId = isHost ? oppColor : (clientConfig?.hostColor || 'red');
    const isMyTurn = isHost ? hostTurn : !hostTurn;
    const winData = checkWin(board);

    useEffect(() => {
        if (winData) {
            if (winData.winner === 'draw') {
                triggerDrawEffects();
            } else if (winData.winner === (isHost ? 'host' : 'opp')) {
                triggerVictoryEffects();
                if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100, 50, 200]);
            } else {
                triggerDefeatEffects();
            }
        }
    }, [winData, isHost]);

    const handleGameStart = (conn, hostMode, oppProf, savedState) => {
        isHostRef.current = hostMode;
        connRef.current = conn;
        if (oppProf) setOppProfile(oppProf);
        conn.on('data', onData);

        // Restore mid-game state on rejoin
        if (savedState && savedState.gameState === 'playing') {
            const b = savedState.board || Array.from({ length: ROWS }, () => Array(COLS).fill(null));
            boardRef.current = b;
            setBoard(b);
            hostTurnRef.current = savedState.hostTurn;
            setHostTurn(savedState.hostTurn);
            setHostColor(savedState.hostColor || 'red');
            setOppColor(savedState.oppColor || 'yellow');
            setHostPlaysFirst(savedState.hostPlaysFirst ?? true);
            if (!hostMode) {
                setClientConfig({ hostColor: savedState.hostColor, oppColor: savedState.oppColor, hostPlaysFirst: savedState.hostPlaysFirst });
            }
            const ms = hostMode ? (savedState.myScore || 0) : (savedState.oppScore || 0);
            const os = hostMode ? (savedState.oppScore || 0) : (savedState.myScore || 0);
            myScoreRef.current = ms; oppScoreRef.current = os;
            setMyScore(ms); setOppScore(os);
            setGameState('playing');

            // Host: on peer-reconnect, resend state_sync so guest can restore
            if (hostMode) {
                conn.on('peer-reconnect', () => {
                    conn.send({ type: 'state_sync', state: {
                        gameState: 'playing',
                        board: boardRef.current,
                        hostTurn: hostTurnRef.current,
                        hostColor: savedState.hostColor,
                        oppColor: savedState.oppColor,
                        hostPlaysFirst: savedState.hostPlaysFirst,
                        myScore: myScoreRef.current,
                        oppScore: oppScoreRef.current,
                    }});
                });
            }
        } else {
            setGameState(hostMode ? 'setup' : 'waiting-start');
            // Host: on peer-reconnect, resend state_sync
            if (hostMode) {
                conn.on('peer-reconnect', () => {
                    const currentState = {
                        gameState: 'playing',
                        board: boardRef.current,
                        hostTurn: hostTurnRef.current,
                        hostColor,
                        oppColor,
                        hostPlaysFirst,
                        myScore: myScoreRef.current,
                        oppScore: oppScoreRef.current,
                    };
                    conn.send({ type: 'state_sync', state: currentState });
                });
            }
        }
    };

    const onData = (msg) => {
        if (msg.type === 'global_ready' && msg.profile) {
            setOppProfile(msg.profile);
        } else if (msg.type === 'start') {
            setClientConfig(msg.config);
            setHostTurn(msg.config.hostPlaysFirst);
            setGameState('playing');
        } else if (msg.type === 'play') {
            dropCoin(msg.colIdx, !isHostRef.current);
        } else if (msg.type === 'restart') {
            if (boardRef.current.every(row => row.every(c => !c))) return;
            doRestart();
        } else if (msg.type === 'state_sync' && msg.state) {
            // Guest received state sync from host - restore full game state
            const s = msg.state;
            if (s.gameState === 'playing') {
                const b = s.board || Array.from({ length: ROWS }, () => Array(COLS).fill(null));
                boardRef.current = b;
                setBoard(b);
                hostTurnRef.current = s.hostTurn;
                setHostTurn(s.hostTurn);
                setClientConfig({ hostColor: s.hostColor, oppColor: s.oppColor, hostPlaysFirst: s.hostPlaysFirst });
                // From guest's perspective: host's myScore = oppScore, host's oppScore = myScore
                const myS = s.oppScore || 0;
                const opS = s.myScore || 0;
                myScoreRef.current = myS; oppScoreRef.current = opS;
                setMyScore(myS); setOppScore(opS);
                setGameState('playing');
            }
        }
    };

    const dropCoin = (colIdx, isHostMove) => {
        const newBoard = boardRef.current.map(row => [...row]);
        let droppedRow = -1;

        for (let r = ROWS - 1; r >= 0; r--) {
            if (!newBoard[r][colIdx]) {
                newBoard[r][colIdx] = isHostMove ? 'host' : 'opp';
                droppedRow = r;
                break;
            }
        }

        if (droppedRow !== -1) {
            boardRef.current = newBoard;
            setBoard(newBoard);
            const nextTurn = !hostTurnRef.current;
            hostTurnRef.current = nextTurn;
            setHostTurn(nextTurn);

            // Host saves state after every move for potential rejoin
            if (isHostRef.current) {
                connRef.current?.saveState({
                    gameState: 'playing',
                    board: newBoard,
                    hostTurn: nextTurn,
                    hostColor,
                    oppColor,
                    hostPlaysFirst,
                    myScore: myScoreRef.current,
                    oppScore: oppScoreRef.current,
                });
            }

            setTimeout(() => {
                import('../../lib/audioEngine').then(({ playSound, playHaptic }) => {
                    playSound('pop');
                    playHaptic(20);
                });
            }, 300);
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
        // Save initial state
        connRef.current?.saveState({
            gameState: 'playing',
            board: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
            hostTurn: hostPlaysFirst,
            hostColor, oppColor, hostPlaysFirst,
            myScore: 0, oppScore: 0,
        });
    };

    const doRestart = () => {
        setBoard(Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
        setHostTurn(isHostRef.current ? hostPlaysFirst : (clientConfig?.hostPlaysFirst ?? true));
        setGameState(isHostRef.current ? 'setup' : 'waiting-start');
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
    const oppColorObj = COLORS.find(c => c.id === oppColorId) || COLORS[1];
    const opp = oppProfile || { nickname: 'الخصم', avatar: 'alien' };

    return (
        <>
            <div className="animated-bg"><div className="bg-orb-3" /></div>
            <div className="min-h-dvh max-w-lg mx-auto flex flex-col safe-area-pt overflow-hidden overflow-y-auto">

                {/* Header: Lobby with Logo vs In-Game Header */}
                {gameState === 'lobby' ? (
                    <div className="px-4 grid grid-cols-3 items-center py-4 mb-2 w-full">
                        <div><Logo size="small" /></div>
                        <div className="flex justify-center">
                            <div className="flex items-center gap-2 glass-card px-3.5 py-1.5 rounded-2xl border border-white/10 shrink-0">
                                <IconConnect4 size={18} className="text-[var(--accent)]" />
                                <span className="text-xs font-black gradient-text">أربعة في صف</span>
                            </div>
                        </div>
                        <div className="flex justify-end"><button onClick={() => { connRef.current?.close(); setView('hub'); }} className="glass-card px-4 py-2 rounded-2xl text-xs font-bold hover:scale-105 active:scale-95 transition-transform text-white/90">الرئيسية</button></div>
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
                            <IconConnect4 size={18} className="text-[var(--accent)]" />
                            <span className="text-xs font-black gradient-text">Connect 4</span>
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold mr-1">
                                <Wifi size={11} />
                                <span>متصل</span>
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
                {gameState === 'lobby' && <div className="flex-1 flex pb-16 safe-area-pb px-4"><P2PConnectionManager gameIdPrefix="celia-c4" onGameStart={handleGameStart} /></div>}

                {/* Setup Screen (Host) */}
                {gameState === 'setup' && (
                    <div className="flex-1 flex flex-col items-center justify-center -mt-10 px-4">
                        <div className="glass-card rounded-3xl p-6 w-full max-w-sm border border-white/10 shadow-2xl">
                            <h2 className="text-xl font-black mb-6 text-center gradient-text">اختار الألوان</h2>

                            <div className="mb-5">
                                <p className="text-xs font-bold opacity-70 mb-2.5">لونك أنت:</p>
                                <div className="flex gap-3 justify-center">
                                    {COLORS.map(c => (
                                        <button key={'h' + c.id} onClick={() => { setHostColor(c.id); if (c.id === oppColor) setOppColor(COLORS.find(x => x.id !== c.id).id); }}
                                            className={`w-10 h-10 rounded-full transition-transform ${hostColor === c.id ? 'scale-120 ring-2 ring-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                                            style={{ backgroundColor: c.hex, boxShadow: hostColor === c.id ? `0 0 15px ${c.glow}` : 'none' }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="mb-7">
                                <p className="text-xs font-bold opacity-70 mb-2.5">لون الخصم:</p>
                                <div className="flex gap-3 justify-center">
                                    {COLORS.map(c => (
                                        <button key={'o' + c.id} disabled={c.id === hostColor} onClick={() => setOppColor(c.id)}
                                            className={`w-10 h-10 rounded-full transition-transform ${oppColor === c.id ? 'scale-120 ring-2 ring-white shadow-lg' : 'opacity-40 hover:opacity-100 disabled:opacity-10 disabled:cursor-not-allowed'}`}
                                            style={{ backgroundColor: c.hex, boxShadow: oppColor === c.id ? `0 0 15px ${c.glow}` : 'none' }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2 mb-6 bg-black/20 p-1 rounded-xl">
                                <button onClick={() => setHostPlaysFirst(true)} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-colors ${hostPlaysFirst ? 'bg-white/20' : 'opacity-40'}`}>أنا أبدأ</button>
                                <button onClick={() => setHostPlaysFirst(false)} className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-colors ${!hostPlaysFirst ? 'bg-white/20' : 'opacity-40'}`}>الخصم يبدأ</button>
                            </div>

                            <button onClick={handleStartGame} className="glow-button w-full h-12 rounded-2xl text-base font-black flex items-center justify-center">ابدأ اللعبة</button>
                        </div>
                    </div>
                )}

                {/* Waiting Screen (Client) */}
                {gameState === 'waiting-start' && (
                    <div className="flex-1 flex items-center justify-center -mt-6 px-4">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center animate-pulse-glow border border-white/10">
                            <h2 className="text-xl font-black mb-2 gradient-text">في الانتظار...</h2>
                            <p className="opacity-60 text-xs font-bold">الطرف الآخر يقوم باختيار الألوان</p>
                        </div>
                    </div>
                )}

                {/* Game Screen */}
                {gameState === 'playing' && (
                    <div className="flex-1 flex flex-col items-center pb-6">

                        {/* Status */}
                        <div className="mb-5 w-full px-4 text-center">
                            {!winData ? (
                                <div className={`glass-card rounded-2xl py-2 px-5 inline-flex items-center gap-2.5 transition-all border border-white/10 ${isMyTurn ? 'animate-pulse-glow' : ''}`}
                                    style={{ boxShadow: isMyTurn ? `0 0 15px ${myColorObj?.glow}` : 'none' }}>
                                    {isMyTurn ? (
                                        <>
                                            <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden shrink-0 border border-white/20">
                                                <AvatarDisplay avatarId={myProfile.avatar} size={20} />
                                            </div>
                                            <span className="font-black text-sm">
                                                دورك تلعب {myProfile.nickname ? `(${myProfile.nickname})` : ''}!
                                            </span>
                                            <IconTarget size={14} className="text-[var(--accent)] shrink-0" />
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden shrink-0 border border-white/20">
                                                <AvatarDisplay avatarId={opp.avatar} size={20} />
                                            </div>
                                            <span className="font-black text-sm opacity-90">
                                                دور {opp.nickname || 'الخصم'}...
                                            </span>
                                            <IconHourglass size={14} className="opacity-60 shrink-0" />
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="glass-card rounded-2xl py-4 px-8 text-center animate-pop-in border border-white/10 shadow-2xl">
                                    <p className="font-black text-xl mb-1 flex items-center justify-center gap-2">
                                        <IconTrophy size={20} className="text-amber-400" />
                                        <span>
                                            {winData.winner === 'draw' ? 'تعادل رائع!' :
                                                (winData.winner === (isHost ? 'host' : 'opp')) ? 'أنت الفائز البطل!' : 'انتهت اللعبة!'}
                                        </span>
                                    </p>
                                    <button onClick={handleRestart} className="mt-3 glow-button w-full h-11 rounded-xl text-sm font-black flex items-center justify-center gap-2">
                                        <RotateCcw size={16} /> العبوا من جديد
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Connect 4 Board */}
                        <div className="glass-card p-2 rounded-3xl shadow-2xl relative w-[95%] overflow-hidden" dir="ltr"
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
                                                <div key={`${rIdx}-${cIdx}`} className="aspect-square w-full relative flex items-center justify-center overflow-hidden">
                                                    {/* Board Background (the blue plastic with hole) */}
                                                    <div className="absolute inset-[-1px] bg-sky-600/60 backdrop-blur-md shadow-[inset_0_4px_10px_rgba(0,0,0,0.3)] pointer-events-none z-10"
                                                         style={{ maskImage: 'radial-gradient(circle, transparent 45%, black 46%)', WebkitMaskImage: 'radial-gradient(circle, transparent 45%, black 46%)' }} />

                                                    {/* The Chip (falling behind the board) */}
                                                    <div className={`absolute rounded-full transition-transform transform z-0 w-[85%] h-[85%]
                                          ${cell ? 'scale-100 translate-y-0' : 'scale-100 -translate-y-[600%] opacity-0'}
                                          ${isWinningChip ? 'animate-pulse-glow z-30 ring-4 ring-white' : ''}
                                         `}
                                                        style={{
                                                            transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Bouncy effect
                                                            transitionDuration: '500ms',
                                                            backgroundColor: cObj?.hex,
                                                            opacity: cell ? 1 : 0,
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

                        {/* Players duel cards view */}
                        <div className="grid grid-cols-2 gap-3 w-[95%] mt-6 px-1">
                            {/* My Card */}
                            <div
                                className={`glass-card p-2.5 rounded-2xl flex items-center gap-2.5 transition-all duration-300 relative overflow-hidden border ${
                                    isMyTurn
                                        ? 'border-2 border-[var(--accent)] bg-[var(--accent-soft)] shadow-lg'
                                        : 'border-white/10 opacity-75'
                                }`}
                                style={isMyTurn ? { boxShadow: `0 0 20px ${myColorObj?.glow || 'var(--accent-glow)'}` } : {}}
                            >
                                <div className="relative shrink-0">
                                    <div
                                        className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden border-2"
                                        style={{ borderColor: myColorObj?.hex }}
                                    >
                                        <AvatarDisplay avatarId={myProfile.avatar} size={26} />
                                    </div>
                                    <span
                                        className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border border-black/50 shadow-sm"
                                        style={{ backgroundColor: myColorObj?.hex }}
                                    />
                                </div>
                                <div className="flex flex-col min-w-0 flex-1 text-right">
                                    <span className="text-xs font-black truncate">{myProfile.nickname || 'أنت'}</span>
                                    <span className={`text-[10px] font-bold leading-tight mt-0.5 flex items-center gap-1 ${isMyTurn ? 'text-[var(--accent)] font-black' : 'opacity-40'}`}>
                                        {isMyTurn ? (
                                            <>
                                                <IconTarget size={11} className="shrink-0" />
                                                <span>دورك الآن</span>
                                            </>
                                        ) : (
                                            <span>في الانتظار</span>
                                        )}
                                    </span>
                                </div>
                            </div>

                            {/* Opponent Card */}
                            <div
                                className={`glass-card p-2.5 rounded-2xl flex items-center gap-2.5 transition-all duration-300 relative overflow-hidden border ${
                                    !isMyTurn
                                        ? 'border-2 border-sky-400 bg-sky-500/10 shadow-lg'
                                        : 'border-white/10 opacity-75'
                                }`}
                                style={!isMyTurn ? { boxShadow: `0 0 20px ${oppColorObj?.glow || 'rgba(56,189,248,0.3)'}` } : {}}
                            >
                                <div className="relative shrink-0">
                                    <div
                                        className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden border-2"
                                        style={{ borderColor: oppColorObj?.hex }}
                                    >
                                        <AvatarDisplay avatarId={opp.avatar} size={26} />
                                    </div>
                                    <span
                                        className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border border-black/50 shadow-sm"
                                        style={{ backgroundColor: oppColorObj?.hex }}
                                    />
                                </div>
                                <div className="flex flex-col min-w-0 flex-1 text-right">
                                    <span className="text-xs font-black truncate">{opp.nickname || 'الخصم'}</span>
                                    <span className={`text-[10px] font-bold leading-tight mt-0.5 flex items-center gap-1 ${!isMyTurn ? 'text-sky-400 font-black' : 'opacity-40'}`}>
                                        {!isMyTurn ? (
                                            <>
                                                <IconHourglass size={11} className="shrink-0" />
                                                <span>يفكر الآن...</span>
                                            </>
                                        ) : (
                                            <span>مستعد</span>
                                        )}
                                    </span>
                                </div>
                            </div>
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
