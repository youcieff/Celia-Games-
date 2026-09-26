import React, { useState, useRef, useCallback, useEffect } from 'react';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import PlayerGameHeader from '../../components/PlayerGameHeader';
import ConnectionPauseOverlay from '../../components/ConnectionPauseOverlay';
import EmotesOverlay from '../../components/EmotesOverlay';
import Logo from '../../components/Logo';
import { IconRPSArena } from '../../components/icons/GameIcons';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Shield from 'lucide-react/dist/esm/icons/shield';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Snowflake from 'lucide-react/dist/esm/icons/snowflake';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import { playSound, playHaptic } from '../../lib/audioEngine';
import useProfile from '../../hooks/useProfile';
import { triggerVictoryEffects, triggerDefeatEffects } from '../../lib/effectsEngine';

const CHOICES = [
    { id: 'rock', label: 'حجر', emoji: '🪨', color: 'from-amber-600 to-amber-800 border-amber-500/40' },
    { id: 'paper', label: 'ورقة', emoji: '📄', color: 'from-blue-600 to-blue-800 border-blue-500/40' },
    { id: 'scissors', label: 'مقص', emoji: '✂️', color: 'from-rose-600 to-rose-800 border-rose-500/40' }
];

const CHOICE_EMOJIS = { rock: '🪨', paper: '📄', scissors: '✂️' };
const CHOICE_LABELS = { rock: 'حجر', paper: 'ورقة', scissors: 'مقص' };
const WIN_SCORE = 5;

const POWER_CARDS = [
    { id: 'shield', label: 'درع الحماية', desc: 'يحول الخسارة لتعادل', emoji: '🛡️', icon: Shield, color: 'text-sky-400 border-sky-500/40 bg-sky-500/10' },
    { id: 'double', label: 'مضاعفة النقاط', desc: 'تكسب نقطتين بدل نقطة', emoji: '⚡', icon: Zap, color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
    { id: 'freeze', label: 'تجميد الخصم', desc: 'يخفي بطاقتك وتأثيرها', emoji: '❄️', icon: Snowflake, color: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10' },
];

function beats(a, b) {
    return (a === 'rock' && b === 'scissors') ||
        (a === 'paper' && b === 'rock') ||
        (a === 'scissors' && b === 'paper');
}

export default function RPSArenaGame({ setView }) {
    const connRef = useRef(null);
    const isHostRef = useRef(false);
    const [myProfile, , awardMatchResult] = useProfile();
    const [oppProfile, setOppProfile] = useState(null);

    const [gameState, setGameState] = useState('lobby'); // lobby | playing | revealing | gameover
    const [myScore, setMyScore] = useState(0);
    const [oppScore, setOppScore] = useState(0);
    const [myChoice, setMyChoice] = useState(null);
    const [oppChoice, setOppChoice] = useState(null);
    const [roundResult, setRoundResult] = useState(null); // 'win'|'lose'|'draw'
    const [myPowers, setMyPowers] = useState({ shield: true, double: true, freeze: true });
    const [activePower, setActivePower] = useState(null);
    const [winner, setWinner] = useState(null);
    const [roundNum, setRoundNum] = useState(1);
    const [showReveal, setShowReveal] = useState(false);
    const [roundNotice, setRoundNotice] = useState(null);

    const myChoiceRef = useRef(null);
    const oppChoiceRef = useRef(null);
    const activePowerRef = useRef(null);
    const myScoreRef = useRef(0);
    const oppScoreRef = useRef(0);
    const isResolvingRef = useRef(false);

    const saveGameState = () => {
        if (!isHostRef.current || !connRef.current) return;
        connRef.current.saveState({
            gameState, hostScore: myScoreRef.current, oppScore: oppScoreRef.current, roundNum
        });
    };

    useEffect(() => {
        saveGameState();
    }, [gameState, myScore, oppScore, roundNum]);

    const handleGameStart = (conn, hostMode, oppProf, savedState) => {
        isHostRef.current = hostMode;
        connRef.current = conn;
        if (oppProf) setOppProfile(oppProf);
        conn.on('data', onData);

        if (savedState && savedState.gameState) {
            setGameState(savedState.gameState);
            setMyScore(hostMode ? savedState.hostScore : savedState.oppScore);
            setOppScore(hostMode ? savedState.oppScore : savedState.hostScore);
            myScoreRef.current = hostMode ? savedState.hostScore : savedState.oppScore;
            oppScoreRef.current = hostMode ? savedState.oppScore : savedState.hostScore;
            setRoundNum(savedState.roundNum || 1);

            if (hostMode) {
                conn.on('peer-reconnect', () => {
                    conn.send({ type: 'state_sync', state: {
                        gameState: savedState.gameState, hostScore: myScoreRef.current, oppScore: oppScoreRef.current, roundNum: savedState.roundNum
                    }});
                });
            }
            return;
        }

        if (hostMode) {
            conn.on('peer-reconnect', () => {
                conn.send({ type: 'state_sync', state: {
                    gameState, hostScore: myScoreRef.current, oppScore: oppScoreRef.current, roundNum
                }});
            });
        }

        startNewGame();
    };

    const startNewGame = () => {
        setMyScore(0);
        setOppScore(0);
        myScoreRef.current = 0;
        oppScoreRef.current = 0;
        setMyChoice(null);
        setOppChoice(null);
        myChoiceRef.current = null;
        oppChoiceRef.current = null;
        isResolvingRef.current = false;
        setRoundResult(null);
        setWinner(null);
        setRoundNum(1);
        setShowReveal(false);
        setMyPowers({ shield: true, double: true, freeze: true });
        setActivePower(null);
        activePowerRef.current = null;
        setRoundNotice(null);
        setGameState('playing');
        playSound('ding');
    };

    const onData = useCallback((msg) => {
        if (!msg || !msg.type) return;

        switch (msg.type) {
            case 'rps_choice': {
                const theirChoice = msg.choice;
                const theirPower = msg.power || null;

                oppChoiceRef.current = { choice: theirChoice, power: theirPower };
                setOppChoice(theirChoice);

                // If my choice was already made, resolve round immediately
                if (myChoiceRef.current && !isResolvingRef.current) {
                    resolveRound(myChoiceRef.current, theirChoice, theirPower);
                }
                break;
            }

            case 'rps_start':
                startNewGame();
                break;

            case 'rematch_request':
                connRef.current?.send({ type: 'rps_start' });
                startNewGame();
                break;

            default:
                break;
        }
    }, []);

    const togglePower = (powerId) => {
        if (!myPowers[powerId] || myChoice) return;
        const next = activePower === powerId ? null : powerId;
        setActivePower(next);
        activePowerRef.current = next;
        playSound('click');
        playHaptic(25);
    };

    const handleChoiceSelect = (choiceId) => {
        if (gameState !== 'playing' || myChoice) return;
        const chosenPower = activePowerRef.current;
        myChoiceRef.current = choiceId;
        setMyChoice(choiceId);

        if (chosenPower) {
            setMyPowers(prev => ({ ...prev, [chosenPower]: false }));
        }

        playSound('tap');
        playHaptic(20);

        connRef.current?.send({
            type: 'rps_choice',
            choice: choiceId,
            power: chosenPower
        });

        // Check if opponent already sent their choice
        if (oppChoiceRef.current && !isResolvingRef.current) {
            resolveRound(choiceId, oppChoiceRef.current.choice, oppChoiceRef.current.power);
        }
    };

    const resolveRound = (myC, oppC, oppPow) => {
        isResolvingRef.current = true;
        setShowReveal(true);
        setGameState('revealing');
        playSound('ding');

        let myPow = activePowerRef.current;
        let myWins = beats(myC, oppC);
        let oppWins = beats(oppC, myC);
        let isDraw = myC === oppC;
        let notice = null;

        // Apply Freeze immediately to negate opponent's power
        if (myPow === 'freeze') oppPow = null;
        if (oppPow === 'freeze') myPow = null;

        // Shield: convert loss to draw
        if (!isDraw && !myWins && myPow === 'shield') {
            isDraw = true;
            oppWins = false;
            notice = '🛡️ درع الحماية أنقذك من الخسارة! (تعادل)';
        }
        if (!isDraw && !oppWins && oppPow === 'shield') {
            isDraw = true;
            myWins = false;
            notice = '🛡️ درع الخصم صد فوزك! (تعادل)';
        }

        let myPoints = myWins ? 1 : 0;
        let oppPoints = oppWins ? 1 : 0;

        // Double points
        if (myWins && myPow === 'double') {
            myPoints = 2;
            notice = '⚡ مضاعفة النقاط! كسبت +2 نقطة!';
        }
        if (oppWins && oppPow === 'double') {
            oppPoints = 2;
            notice = '⚡ الخصم ضاعف نقاطه وكسب +2 نقطة!';
        }

        if (oppPow === 'freeze') {
            notice = notice ? `${notice} | ❄️ الخصم استخدم التجميد` : '❄️ الخصم استخدم بطاقة التجميد!';
        }

        setRoundNotice(notice);

        const newMyScore = myScoreRef.current + myPoints;
        const newOppScore = oppScoreRef.current + oppPoints;
        myScoreRef.current = newMyScore;
        oppScoreRef.current = newOppScore;

        setMyScore(newMyScore);
        setOppScore(newOppScore);
        setRoundResult(myWins ? 'win' : isDraw ? 'draw' : 'lose');

        if (myWins) {
            playSound('win');
            playHaptic(40);
        } else if (isDraw) {
            playSound('tick');
        } else {
            playSound('lose');
        }

        // Check for match winner
        setTimeout(() => {
            if (newMyScore >= WIN_SCORE || newOppScore >= WIN_SCORE) {
                const w = newMyScore >= WIN_SCORE ? 'me' : 'opp';
                setWinner(w);
                setGameState('gameover');
                if (w === 'me') {
                    playSound('win');
                    awardMatchResult(true);
                    triggerVictoryEffects();
                    if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100, 50, 200]);
                } else {
                    playSound('lose');
                    awardMatchResult(false);
                    triggerDefeatEffects();
                }
            } else {
                // Next round reset
                setTimeout(() => {
                    setMyChoice(null);
                    setOppChoice(null);
                    myChoiceRef.current = null;
                    oppChoiceRef.current = null;
                    isResolvingRef.current = false;
                    setRoundResult(null);
                    setShowReveal(false);
                    setActivePower(null);
                    activePowerRef.current = null;
                    setRoundNotice(null);
                    setRoundNum(prev => prev + 1);
                    setGameState('playing');
                }, 1200);
            }
        }, 1800);
    };

    const handleRematch = () => {
        if (isHostRef.current) {
            connRef.current?.send({ type: 'rps_start' });
            startNewGame();
        } else {
            connRef.current?.send({ type: 'rematch_request' });
        }
    };

    if (gameState === 'lobby') {
        return (
            <>
                <div className="animated-bg"><div className="bg-orb-1" /><div className="bg-orb-2" /></div>
                <div className="min-h-dvh max-w-lg mx-auto px-4 flex flex-col safe-area-pt overflow-x-hidden overflow-y-auto pb-6">
                    <div className="grid grid-cols-3 items-center py-4 mb-2">
                        <div><Logo size="small" /></div>
                        <div className="flex justify-center">
                            <div className="flex items-center gap-2 glass-card px-3.5 py-1.5 rounded-2xl border border-white/10 shrink-0">
                                <IconRPSArena size={18} className="text-[var(--accent)]" />
                                <span className="text-xs font-black gradient-text">حجرة ورقة مقص</span>
                            </div>
                        </div>
                        <div className="flex justify-end"><button onClick={() => { connRef.current?.close?.(); setView('hub'); }} className="glass-card px-4 py-2 rounded-2xl text-xs font-bold hover:scale-105 active:scale-95 transition-transform text-white/90">الرئيسية</button></div>
                    </div>

                    <div className="flex-1 flex pb-16 safe-area-pb">
                        <P2PConnectionManager
                            gameIdPrefix="celia-rps"
                            onGameStart={handleGameStart}
                        />
                    </div>
                </div>
            </>
        );
    }

    return (
        <div className="min-h-dvh w-full flex flex-col safe-area-pt overflow-hidden relative select-none">
            <div className="animated-bg"><div className="bg-orb-1" /><div className="bg-orb-2" /></div>
            
            <PlayerGameHeader
                title="حجرة ورقة مقص"
                gameId="rps-arena"
                isMyTurn={!myChoice}
                oppProfile={oppProfile}
                myScore={myScore}
                oppScore={oppScore}
                statusText={`الجولة ${roundNum} | الفوز عند ${WIN_SCORE}`}
                onLeave={() => { connRef.current?.close?.(); setView('hub'); }}
            />

            {/* Arena Central Display */}
            <div className="flex-1 flex flex-col justify-between p-4 max-w-lg w-full mx-auto overflow-hidden">
                {/* Notice banner */}
                <div className="min-h-[32px] flex items-center justify-center">
                    {roundNotice && (
                        <div className="glass-card px-4 py-1.5 rounded-full text-xs font-bold text-amber-300 border border-amber-500/30 animate-pop-in text-center">
                            {roundNotice}
                        </div>
                    )}
                </div>

                {/* Duel Reveal Zone */}
                <div className="grid grid-cols-2 gap-4 my-auto items-center">
                    {/* Opponent Card Reveal */}
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">حركة الخصم</span>
                        <div className={`w-28 h-36 rounded-3xl glass-card border-2 flex flex-col items-center justify-center shadow-xl transition-all duration-300
                            ${showReveal && oppChoice
                                ? 'border-rose-500/50 bg-rose-500/10 scale-105'
                                : oppChoice
                                    ? 'border-amber-400/50 bg-amber-500/10 animate-pulse'
                                    : 'border-white/10'}`}
                        >
                            {showReveal && oppChoice ? (
                                <>
                                    <span className="text-5xl animate-pop-in">{CHOICE_EMOJIS[oppChoice]}</span>
                                    <span className="text-xs font-black text-rose-300 mt-2">{CHOICE_LABELS[oppChoice]}</span>
                                </>
                            ) : oppChoice ? (
                                <span className="text-xs font-bold text-amber-300 animate-pulse">جاهز! 🔒</span>
                            ) : (
                                <span className="text-xs font-bold text-slate-500">يفكر... ⌛</span>
                            )}
                        </div>
                    </div>

                    {/* My Card Reveal */}
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">حركتك</span>
                        <div className={`w-28 h-36 rounded-3xl glass-card border-2 flex flex-col items-center justify-center shadow-xl transition-all duration-300
                            ${myChoice
                                ? 'border-emerald-500/60 bg-emerald-500/10 scale-105'
                                : 'border-white/10'}`}
                        >
                            {myChoice ? (
                                <>
                                    <span className="text-5xl animate-pop-in">{CHOICE_EMOJIS[myChoice]}</span>
                                    <span className="text-xs font-black text-emerald-300 mt-2">{CHOICE_LABELS[myChoice]}</span>
                                </>
                            ) : (
                                <span className="text-xs font-bold text-slate-500">اختر أدناه 👇</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Round Result Banner */}
                {roundResult && (
                    <div className="text-center py-2 animate-pop-in">
                        <span className={`text-sm font-black px-6 py-2 rounded-full border shadow-lg
                            ${roundResult === 'win' ? 'text-emerald-400 bg-emerald-950/80 border-emerald-500/50' : roundResult === 'lose' ? 'text-rose-400 bg-rose-950/80 border-rose-500/50' : 'text-amber-400 bg-amber-950/80 border-amber-500/50'}`}
                        >
                            {roundResult === 'win' ? '🎉 فزت بالجولة!' : roundResult === 'lose' ? '💥 خسرت الجولة!' : '🤝 تعادل!'}
                        </span>
                    </div>
                )}

                {/* Power Cards Selector */}
                <div className="flex items-center justify-center gap-2 py-2">
                    {POWER_CARDS.map(p => {
                        const available = myPowers[p.id];
                        const isActive = activePower === p.id;
                        return (
                            <button
                                key={p.id}
                                disabled={!available || Boolean(myChoice)}
                                onClick={() => togglePower(p.id)}
                                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5
                                    ${isActive ? 'ring-2 ring-amber-400 scale-105 ' + p.color : available && !myChoice ? 'glass-card hover:scale-105 border-white/10 text-slate-300' : 'opacity-30 grayscale cursor-not-allowed border-transparent'}`}
                            >
                                <span>{p.emoji}</span>
                                <span>{p.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Main 3 Choices (Rock, Paper, Scissors) */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                    {CHOICES.map(c => (
                        <button
                            key={c.id}
                            disabled={Boolean(myChoice) || gameState !== 'playing'}
                            onClick={() => handleChoiceSelect(c.id)}
                            className={`p-4 rounded-3xl border-2 flex flex-col items-center justify-center gap-2 transition-all duration-200 active:scale-95 shadow-xl
                                ${myChoice === c.id ? 'ring-2 ring-emerald-400 scale-105 bg-gradient-to-b ' + c.color : !myChoice && gameState === 'playing' ? 'glass-card hover:scale-105 hover:-translate-y-1 bg-gradient-to-b ' + c.color : 'opacity-40 grayscale cursor-not-allowed border-white/10'}`}
                        >
                            <span className="text-4xl">{c.emoji}</span>
                            <span className="text-xs font-black text-white">{c.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Game Over Modal */}
            {gameState === 'gameover' && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="glass-card max-w-sm w-full p-6 rounded-3xl border-2 border-white/15 text-center shadow-2xl">
                        <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center shadow-lg
                            ${winner === 'me' ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-rose-500 text-white shadow-rose-500/30'}`}
                        >
                            <Trophy size={36} />
                        </div>

                        <h2 className="text-xl font-black text-white mb-2">
                            {winner === 'me' ? '🎉 فوز ساحق بالبطولة!' : 'حظ أوفر في الجولة القادمة'}
                        </h2>

                        <div className="glass-card py-2 px-6 rounded-xl text-lg font-black text-amber-400 mb-6 inline-block border border-amber-500/30">
                            {myScore} – {oppScore}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleRematch}
                                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                            >
                                <RotateCcw size={16} /> إعادة
                            </button>
                            <button
                                onClick={() => setView('hub')}
                                className="flex-1 py-3 glass-card text-slate-300 hover:text-white font-bold text-sm rounded-2xl border border-white/10 transition-transform active:scale-95"
                            >
                                القائمة
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConnectionPauseOverlay conn={connRef.current} />
            <EmotesOverlay conn={connRef.current} />
        </div>
    );
}
