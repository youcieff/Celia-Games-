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
import { IconDotsBoxes, IconTarget, IconHourglass, IconTrophy } from '../../components/icons/GameIcons';
import { playSound, playHaptic } from '../../lib/audioEngine';
import { recordMatch } from '../../lib/statsEngine';

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

    const [myProfile] = useProfile();
    const [oppProfile, setOppProfile] = useState(null);

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
    const opp = oppProfile || { nickname: 'الخصم', avatar: 'alien' };

    const totalPossible = ROWS * COLS;
    const currentTotal = scores.host + scores.opp;
    const isGameOver = currentTotal === totalPossible && totalPossible > 0;

    let overallWinner = null;
    if (isGameOver) {
        if (scores.host === scores.opp) overallWinner = 'draw';
        else if (scores.host > scores.opp) overallWinner = isHost ? 'me' : 'opp';
        else overallWinner = isHost ? 'opp' : 'me';
    }

    const recordedRef = useRef(false);

    useEffect(() => {
        if (isGameOver) {
            if (overallWinner === 'draw') {
                triggerDrawEffects();
                playSound('draw');
            } else if (overallWinner === 'me') {
                triggerVictoryEffects();
                playSound('win');
                if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100, 50, 200]);
            } else {
                triggerDefeatEffects();
                playSound('lose');
            }

            // Record match for leaderboard (once)
            if (!recordedRef.current) {
                recordedRef.current = true;
                const myFinalScore = isHostRef.current ? stateRef.current.scores.host : stateRef.current.scores.opp;
                const oppFinalScore = isHostRef.current ? stateRef.current.scores.opp : stateRef.current.scores.host;
                recordMatch({
                    gameId: 'dots-boxes',
                    gameTitle: 'النقاط والصناديق',
                    oppName: oppProfile?.nickname || 'الخصم',
                    oppAvatar: oppProfile?.avatar || 'alien',
                    isWin: overallWinner === 'me',
                    myScore: myFinalScore,
                    oppScore: oppFinalScore,
                    isAI: false,
                });
            }
        }
    }, [isGameOver, overallWinner]);

    const handleGameStart = (conn, hostMode, oppProf) => {
        isHostRef.current = hostMode;
        connRef.current = conn;
        if (oppProf) setOppProfile(oppProf);
        conn.on('data', onData);
        setGameState(hostMode ? 'setup' : 'waiting-start');
    };

    const onData = (msg) => {
        if (msg.type === 'global_ready' && msg.profile) {
            setOppProfile(msg.profile);
        } else if (msg.type === 'start') {
            setClientConfig(msg.config);
            setGameState('playing');
            setHostTurn(true);
        } else if (msg.type === 'play') {
            applyMove(msg.lineType, msg.r, msg.c, !isHostRef.current);
        } else if (msg.type === 'restart') {
            if (stateRef.current.gameState === 'playing') return; // already restarted
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

        // Play sounds
        if (boxGained) {
            playSound('capture');
            playHaptic([20, 10, 30]);
        } else {
            playSound('click');
            playHaptic(10);
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
        recordedRef.current = false;
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
                                <IconDotsBoxes size={18} className="text-[var(--accent)]" />
                                <span className="text-xs font-black gradient-text">النقاط والصناديق</span>
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
                            <IconDotsBoxes size={18} className="text-[var(--accent)]" />
                            <span className="text-xs font-black gradient-text">نقاط ومربعات</span>
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
                {gameState === 'lobby' && (
                    <div className="flex-1 flex pb-16 safe-area-pb px-4">
                        <P2PConnectionManager gameIdPrefix="celia-db" onGameStart={handleGameStart} />
                    </div>
                )}

                {/* Setup Screen (Host) */}
                {gameState === 'setup' && (
                    <div className="flex-1 flex flex-col items-center justify-center -mt-6 px-4">
                        <div className="glass-card rounded-3xl p-6 w-full max-w-sm border border-white/10 shadow-2xl">
                            <h2 className="text-xl font-black mb-6 text-center gradient-text">الألوان المفضلة</h2>

                            <div className="mb-5">
                                <p className="text-xs font-bold opacity-70 mb-2.5">لونك أنت:</p>
                                <div className="flex gap-3 justify-center">
                                    {COLORS.map(c => (
                                        <button
                                            key={'h' + c.id}
                                            onClick={() => { setHostColor(c.id); if (c.id === oppColor) setOppColor(COLORS.find(x => x.id !== c.id).id); }}
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
                                        <button
                                            key={'o' + c.id}
                                            disabled={c.id === hostColor}
                                            onClick={() => setOppColor(c.id)}
                                            className={`w-10 h-10 rounded-full transition-transform ${oppColor === c.id ? 'scale-120 ring-2 ring-white shadow-lg' : 'opacity-40 hover:opacity-100 disabled:opacity-10 disabled:cursor-not-allowed'}`}
                                            style={{ backgroundColor: c.hex, boxShadow: oppColor === c.id ? `0 0 15px ${c.glow}` : 'none' }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <button onClick={handleStartGame} className="glow-button w-full h-12 rounded-2xl text-base font-black flex items-center justify-center">
                                ابدأ التحدي
                            </button>
                        </div>
                    </div>
                )}

                {/* Waiting Screen (Client) */}
                {gameState === 'waiting-start' && (
                    <div className="flex-1 flex items-center justify-center -mt-6 px-4">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center animate-pulse-glow border border-white/10">
                            <h2 className="text-xl font-black mb-2 gradient-text">في الانتظار...</h2>
                            <p className="opacity-60 text-xs font-bold">الطرف الآخر يقوم بضبط الإعدادات</p>
                        </div>
                    </div>
                )}

                {/* Game Screen */}
                {gameState === 'playing' && (
                    <div className="flex-1 flex flex-col items-center pb-6 px-3">

                        {/* Status Information Duel Bar */}
                        <div className="w-full max-w-[370px] flex justify-between items-center glass-card rounded-2xl p-3 mb-4 border border-white/10 gap-2">
                            {/* My Score */}
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden border-2 shrink-0" style={{ borderColor: myColorObj?.hex }}>
                                    <AvatarDisplay avatarId={myProfile.avatar} size={22} />
                                </div>
                                <div className="flex flex-col text-right min-w-0">
                                    <span className="text-[10px] font-black truncate max-w-[55px]">{myProfile.nickname || 'أنت'}</span>
                                    <span className="text-xl font-black drop-shadow-md font-mono leading-none" style={{ color: myColorObj?.hex }}>
                                        {isHost ? scores.host : scores.opp}
                                    </span>
                                </div>
                            </div>

                            {/* Turn indicator */}
                            <div className="flex flex-col items-center justify-center shrink-0">
                                {!isGameOver ? (
                                    <span
                                        className={`text-xs font-black px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${isMyTurn ? 'bg-white/20 text-white shadow-md' : 'opacity-70 text-white/90'
                                            }`}
                                        style={isMyTurn ? { backgroundColor: myColorObj?.hex, boxShadow: `0 0 16px ${myColorObj?.glow}` } : {}}
                                    >
                                        {isMyTurn ? (
                                            <>
                                                <IconTarget size={13} className="shrink-0" />
                                                <span>دورك الآن</span>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-4 h-4 rounded-full overflow-hidden shrink-0 flex items-center justify-center">
                                                    <AvatarDisplay avatarId={opp.avatar} size={14} />
                                                </div>
                                                <span className="truncate max-w-[80px]">دور {opp.nickname || 'الخصم'}...</span>
                                            </>
                                        )}
                                    </span>
                                ) : (
                                    <span className="text-xs font-black px-3.5 py-1.5 bg-white/20 rounded-full animate-pulse-glow text-white flex items-center gap-1.5">
                                        <IconTrophy size={14} className="text-amber-400" />
                                        <span>
                                            {overallWinner === 'draw' ? 'تعادل رائع!' : overallWinner === 'me' ? 'أنت الفائز البطل!' : 'انتهت اللعبة!'}
                                        </span>
                                    </span>
                                )}
                            </div>

                            {/* Opp Score */}
                            <div className="flex items-center gap-2 flex-row-reverse">
                                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden border-2 shrink-0" style={{ borderColor: getColorObj(isHost ? 'opp' : 'host').hex }}>
                                    <AvatarDisplay avatarId={opp.avatar} size={22} />
                                </div>
                                <div className="flex flex-col text-left min-w-0">
                                    <span className="text-[10px] font-black truncate max-w-[55px]">{opp.nickname || 'الخصم'}</span>
                                    <span className="text-xl font-black opacity-80 font-mono leading-none" style={{ color: getColorObj(isHost ? 'opp' : 'host').hex }}>
                                        {isHost ? scores.opp : scores.host}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Grid Arena Card — Clean & Clear Mobile Structure */}
                        <div className="w-full max-w-[370px] flex justify-center">
                            <div className="w-full aspect-square relative glass-card p-5 sm:p-6 rounded-3xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)] touch-none select-none flex items-center justify-center bg-black/40">

                                {/* Inner play field */}
                                <div className="w-full h-full relative">

                                    {/* 1. Boxes (captures & subtle guide background) */}
                                    {boxes.map((rowArr, r) =>
                                        rowArr.map((boxHolder, c) => {
                                            const bColor = boxHolder ? getColorObj(boxHolder) : null;
                                            return (
                                                <div
                                                    key={`box-${r}-${c}`}
                                                    className="absolute pointer-events-none flex items-center justify-center p-1"
                                                    style={{
                                                        top: `${(r / ROWS) * 100}%`,
                                                        left: `${(c / COLS) * 100}%`,
                                                        width: `${100 / COLS}%`,
                                                        height: `${100 / ROWS}%`,
                                                    }}
                                                >
                                                    <div
                                                        className={`w-full h-full rounded-xl transition-all duration-500 flex items-center justify-center ${
                                                            boxHolder
                                                                ? 'animate-pop-in scale-100 shadow-lg border-2'
                                                                : 'border border-dashed border-white/10 bg-white/[0.02]'
                                                        }`}
                                                        style={{
                                                            backgroundColor: bColor ? `${bColor.hex}33` : 'rgba(255,255,255,0.015)',
                                                            borderColor: bColor ? bColor.hex : 'rgba(255,255,255,0.08)',
                                                            boxShadow: bColor ? `inset 0 0 16px ${bColor.glow}, 0 0 12px ${bColor.glow}` : 'none'
                                                        }}
                                                    >
                                                        {boxHolder && (
                                                            <div
                                                                className="w-8 h-8 rounded-full flex items-center justify-center animate-scale-in"
                                                                style={{ backgroundColor: `${bColor.hex}40`, color: bColor.hex }}
                                                            >
                                                                <IconTrophy size={16} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}

                                    {/* 2. Horizontal Lines (Clickable) */}
                                    {hLines.map((rowArr, r) =>
                                        rowArr.map((lineHolder, c) => {
                                            const lColor = lineHolder ? getColorObj(lineHolder) : null;
                                            const canClick = isMyTurn && !lineHolder && !isGameOver;

                                            return (
                                                <div
                                                    key={`hline-${r}-${c}`}
                                                    onClick={() => handleLineClick('h', r, c)}
                                                    className={`absolute flex items-center justify-center -translate-y-1/2 z-10 ${canClick ? 'cursor-pointer group' : ''}`}
                                                    style={{
                                                        top: `${(r / ROWS) * 100}%`,
                                                        left: `${(c / COLS) * 100}%`,
                                                        width: `${100 / COLS}%`,
                                                        height: '40px', // generous tap target
                                                    }}
                                                >
                                                    <div
                                                        className={`w-[82%] h-[6px] rounded-full transition-all duration-300 ${lineHolder
                                                                ? 'scale-100 opacity-100'
                                                                : canClick
                                                                    ? 'bg-white/20 group-hover:bg-white/70 group-active:scale-105 group-hover:shadow-[0_0_8px_rgba(255,255,255,0.6)]'
                                                                    : 'bg-white/10'
                                                            }`}
                                                        style={lineHolder ? { backgroundColor: lColor.hex, boxShadow: `0 0 12px ${lColor.glow}, 0 0 4px ${lColor.hex}` } : {}}
                                                    />
                                                </div>
                                            );
                                        })
                                    )}

                                    {/* 3. Vertical Lines (Clickable) */}
                                    {vLines.map((rowArr, r) =>
                                        rowArr.map((lineHolder, c) => {
                                            const lColor = lineHolder ? getColorObj(lineHolder) : null;
                                            const canClick = isMyTurn && !lineHolder && !isGameOver;

                                            return (
                                                <div
                                                    key={`vline-${r}-${c}`}
                                                    onClick={() => handleLineClick('v', r, c)}
                                                    className={`absolute flex items-center justify-center -translate-x-1/2 z-10 ${canClick ? 'cursor-pointer group' : ''}`}
                                                    style={{
                                                        top: `${(r / ROWS) * 100}%`,
                                                        left: `${(c / COLS) * 100}%`,
                                                        width: '40px', // generous tap target
                                                        height: `${100 / ROWS}%`,
                                                    }}
                                                >
                                                    <div
                                                        className={`w-[6px] h-[82%] rounded-full transition-all duration-300 ${lineHolder
                                                                ? 'scale-100 opacity-100'
                                                                : canClick
                                                                    ? 'bg-white/20 group-hover:bg-white/70 group-active:scale-105 group-hover:shadow-[0_0_8px_rgba(255,255,255,0.6)]'
                                                                    : 'bg-white/10'
                                                            }`}
                                                        style={lineHolder ? { backgroundColor: lColor.hex, boxShadow: `0 0 12px ${lColor.glow}, 0 0 4px ${lColor.hex}` } : {}}
                                                    />
                                                </div>
                                            );
                                        })
                                    )}

                                    {/* 4. Intersection Dots (Glowing Pearls) */}
                                    {Array.from({ length: ROWS + 1 }).map((_, r) =>
                                        Array.from({ length: COLS + 1 }).map((_, c) => (
                                            <div
                                                key={`dot-${r}-${c}`}
                                                className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none flex items-center justify-center"
                                                style={{
                                                    top: `${(r / ROWS) * 100}%`,
                                                    left: `${(c / COLS) * 100}%`,
                                                    width: '16px',
                                                    height: '16px',
                                                }}
                                            >
                                                <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] ring-2 ring-[#05070c]" />
                                            </div>
                                        ))
                                    )}

                                </div>
                            </div>
                        </div>

                        {/* After Game finishes */}
                        {isGameOver && (
                            <div className="w-full max-w-[370px] mt-6 mb-4 animate-pop-in">
                                <button onClick={handleRestart} className="glow-button w-full h-12 rounded-2xl text-base font-black flex items-center justify-center gap-2 shadow-xl">
                                    <RotateCcw size={18} /> العبوا من جديد!
                                </button>
                            </div>
                        )}

                    </div>
                )}
            </div>
            {gameState === 'playing' && (
                <EmotesOverlay conn={connRef.current} oppProfile={opp} showStandaloneButton={false} />
            )}
        </>
    );
}
