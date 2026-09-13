import React, { useState, useRef, useEffect, useCallback } from 'react';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import PlayerGameHeader from '../../components/PlayerGameHeader';
import ConnectionPauseOverlay from '../../components/ConnectionPauseOverlay';
import EmotesOverlay from '../../components/EmotesOverlay';
import Logo from '../../components/Logo';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import { playSound, playHaptic } from '../../lib/audioEngine';
import useProfile from '../../hooks/useProfile';

/**
 * BusCompleteGame (أتوبيس كومبليت)
 *
 * Flow:
 *  - Host picks a random Arabic letter (or guest agrees)
 *  - Both fill 5 categories starting with that letter
 *  - First to finish presses "أتوبيس!" — opponent gets 10s grace period
 *  - Review phase: each answer shown side-by-side, each player scores their own
 *  - Points: unique = 10, duplicate = 5, wrong/empty = 0
 */

const ARABIC_LETTERS = [
    'أ','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص',
    'ط','ع','غ','ف','ق','ك','ل','م','ن','ه','و','ي'
];

const CATEGORIES = [
    { key: 'boy',     label: 'اسم ولد',            emoji: '👦' },
    { key: 'girl',    label: 'اسم بنت',            emoji: '👧' },
    { key: 'thing',   label: 'جماد',               emoji: '📦' },
    { key: 'animal',  label: 'حيوان',              emoji: '🦁' },
    { key: 'plant',   label: 'نبات أو أكلة أو فاكهة', emoji: '🍎' },
    { key: 'country', label: 'بلد',                emoji: '🌍' },
    { key: 'celeb',   label: 'شخصية مشهورة',       emoji: '🌟' },
];

const EMPTY_ANSWERS = () => Object.fromEntries(CATEGORIES.map(c => [c.key, '']));

const randomLetter = () => ARABIC_LETTERS[Math.floor(Math.random() * ARABIC_LETTERS.length)];

export default function BusCompleteGame({ setView }) {
    const connRef = useRef(null);
    const isHostRef = useRef(false);
    const [myProfile] = useProfile();
    const [oppProfile, setOppProfile] = useState(null);

    // States: lobby → waiting-letter | picking-letter → playing → grace → review → scoreboard
    const [gameState, setGameState] = useState('lobby');
    const [letter, setLetter] = useState('');
    const [myAnswers, setMyAnswers] = useState(EMPTY_ANSWERS());
    const [oppAnswers, setOppAnswers] = useState(null);
    const [busCallerName, setBusCallerName] = useState('');
    const [graceTimer, setGraceTimer] = useState(null);
    const [graceLeft, setGraceLeft] = useState(10);
    const [inputsLocked, setInputsLocked] = useState(false);

    // Scores per round and totals
    const [myRoundScore, setMyRoundScore] = useState(0);
    const [oppRoundScore, setOppRoundScore] = useState(0);
    const [scores, setScores] = useState({ me: 0, opp: 0 });
    const [round, setRound] = useState(1);

    const graceIntervalRef = useRef(null);
    const myAnswersRef = useRef(EMPTY_ANSWERS());
    const inputsLockedRef = useRef(false);
    const oppAnswersRef = useRef(null);

    // ── helpers ───────────────────────────────────────────────────────────
    const updateMyAnswer = (key, value) => {
        if (inputsLockedRef.current) return;
        playSound('type');
        const updated = { ...myAnswersRef.current, [key]: value };
        myAnswersRef.current = updated;
        setMyAnswers(updated);
    };

    const resetRound = () => {
        clearGrace();
        const empty = EMPTY_ANSWERS();
        setMyAnswers(empty);
        myAnswersRef.current = empty;
        setOppAnswers(null);
        oppAnswersRef.current = null;
        setBusCallerName('');
        setGraceLeft(10);
        setInputsLocked(false);
        inputsLockedRef.current = false;
        setMyRoundScore(0);
        setOppRoundScore(0);
    };

    const clearGrace = () => {
        if (graceIntervalRef.current) {
            clearInterval(graceIntervalRef.current);
            graceIntervalRef.current = null;
        }
        setGraceTimer(null);
    };

    // ── network ───────────────────────────────────────────────────────────
    const handleGameStart = (conn, hostMode, oppProf) => {
        isHostRef.current = hostMode;
        connRef.current = conn;
        if (oppProf) setOppProfile(oppProf);
        conn.on('data', onData);
        if (hostMode) {
            // Auto-pick letter and send to both immediately
            const l = randomLetter();
            setLetter(l);
            setTimeout(() => {
                conn.send({ type: 'start_round', letter: l });
                resetRound();
                setGameState('reveal');
                // After 2.5s reveal, start playing
                setTimeout(() => setGameState('playing'), 2500);
                playSound('ding');
            }, 800);
        } else {
            setGameState('waiting-letter');
        }
    };

    const onData = useCallback((msg) => {
        switch (msg.type) {
            case 'start_round':
                setLetter(msg.letter);
                resetRound();
                setGameState('reveal');
                playSound('ding');
                playHaptic(20);
                // After 2.5s reveal, start playing
                setTimeout(() => setGameState('playing'), 2500);
                break;
            case 'bus': {
                // Opponent called bus. Lock our inputs and start grace.
                const callerName = msg.caller;
                setBusCallerName(callerName);
                inputsLockedRef.current = true;
                setInputsLocked(true);
                startGrace();
                break;
            }
            case 'answers':
                oppAnswersRef.current = msg.answers;
                setOppAnswers(msg.answers);
                // If we already sent ours, move to review
                if (myAnswersRef.current && inputsLockedRef.current) {
                    setGameState('review');
                }
                break;
            case 'restart':
                doRestart(false);
                break;
            default: break;
        }
    }, []); // eslint-disable-line

    // ── start new round (host only, from scoreboard) ───────────────────────
    const handleStartNewRound = () => {
        playSound('click');
        playHaptic(15);
        const l = randomLetter();
        setLetter(l);
        resetRound();
        connRef.current?.send({ type: 'start_round', letter: l });
        setGameState('reveal');
        setTimeout(() => setGameState('playing'), 2500);
        playSound('ding');
    };

    // ── bus! ──────────────────────────────────────────────────────────────
    const handleCallBus = () => {
        if (inputsLockedRef.current) return;
        playSound('win');
        playHaptic([50, 30, 80]);
        inputsLockedRef.current = true;
        setInputsLocked(true);
        const myName = myProfile?.nickname || 'أنت';
        setBusCallerName(myName);
        connRef.current?.send({ type: 'bus', caller: myName });
        // Send our answers immediately
        connRef.current?.send({ type: 'answers', answers: myAnswersRef.current });
        // Wait a moment then check if we have opp's answers
        setTimeout(() => {
            if (oppAnswersRef.current) {
                setGameState('review');
            }
            // else wait for their answers message
        }, 500);
    };

    // Grace period for the opponent
    const startGrace = () => {
        let left = 10;
        setGraceLeft(left);
        graceIntervalRef.current = setInterval(() => {
            left--;
            setGraceLeft(left);
            if (left <= 0) {
                clearGrace();
                finishGrace();
            }
        }, 1000);
    };

    const finishGrace = () => {
        // Send our current answers regardless
        connRef.current?.send({ type: 'answers', answers: myAnswersRef.current });
        inputsLockedRef.current = true;
        setInputsLocked(true);
        if (oppAnswersRef.current) {
            setGameState('review');
        }
    };

    // ── scoring ───────────────────────────────────────────────────────────
    const calcScores = () => {
        if (!oppAnswers) return;
        let myScore = 0, oppScore = 0;
        CATEGORIES.forEach(cat => {
            const mine = (myAnswers[cat.key] || '').trim().toLowerCase();
            const theirs = (oppAnswers[cat.key] || '').trim().toLowerCase();
            if (mine && theirs && mine === theirs) {
                myScore += 5; oppScore += 5;
            } else {
                if (mine) myScore += 10;
                if (theirs) oppScore += 10;
            }
        });
        setMyRoundScore(myScore);
        setOppRoundScore(oppScore);
        return { myScore, oppScore };
    };

    const handleGoToScoreboard = () => {
        playSound('click');
        const s = calcScores();
        setScores(prev => ({
            me: prev.me + (s?.myScore || myRoundScore),
            opp: prev.opp + (s?.oppScore || oppRoundScore),
        }));
        setRound(r => r + 1);
        setGameState('scoreboard');
    };

    // Auto-calc when entering review
    useEffect(() => {
        if (gameState === 'review' && oppAnswers) {
            calcScores();
        }
    }, [gameState, oppAnswers]); // eslint-disable-line

    // ── restart ───────────────────────────────────────────────────────────
    const handleRestart = () => {
        playSound('click');
        connRef.current?.send({ type: 'restart' });
        doRestart(true);
    };

    const doRestart = () => {
        resetRound();
        setRound(1);
        setScores({ me: 0, opp: 0 });
        if (isHostRef.current) {
            const l = randomLetter();
            setLetter(l);
            setTimeout(() => {
                connRef.current?.send({ type: 'start_round', letter: l });
                resetRound();
                setGameState('reveal');
                setTimeout(() => setGameState('playing'), 2500);
                playSound('ding');
            }, 600);
        } else {
            setGameState('waiting-letter');
        }
    };

    // ── render ────────────────────────────────────────────────────────────
    return (
        <>
            <div className="animated-bg"><div className="bg-orb-3" /></div>
            <div className="min-h-dvh max-w-md mx-auto px-4 flex flex-col safe-area-pt overflow-x-hidden overflow-y-auto pb-6">

                {/* Header */}
                {gameState !== 'lobby' ? (
                    <PlayerGameHeader
                        title="أتوبيس كومبليت 🚌"
                        gameEmoji="🚌"
                        isMyTurn={gameState === 'playing' && !inputsLocked}
                        oppProfile={oppProfile}
                        myScore={scores.me}
                        oppScore={scores.opp}
                        onLeave={() => { connRef.current?.close(); setView('hub'); }}
                    />
                ) : (
                    <div className="flex justify-between items-center py-4 mb-4">
                        <Logo size="small" />
                        <button onClick={() => setView('hub')} className="glass-card px-4 py-2 rounded-2xl text-xs font-bold hover:scale-105 transition-transform">
                            الرئيسية
                        </button>
                    </div>
                )}

                {/* Lobby */}
                {gameState === 'lobby' && (
                    <div className="flex-1 flex pb-16 safe-area-pb">
                        <P2PConnectionManager gameIdPrefix="celia-bus" onGameStart={handleGameStart} />
                    </div>
                )}

                {/* Guest Waiting for letter */}
                {gameState === 'waiting-letter' && (
                    <div className="flex-1 flex items-center justify-center animate-fade-in">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center border border-emerald-400/30">
                            <div className="text-5xl mb-4 animate-pulse">🚌</div>
                            <h2 className="text-2xl font-black mb-2">في الانتظار...</h2>
                            <p className="opacity-60 text-sm font-bold">
                                {oppProfile?.nickname || 'المضيف'} بيختار الحرف
                            </p>
                        </div>
                    </div>
                )}

                {/* Letter Reveal Splash */}
                {gameState === 'reveal' && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in gap-4">
                        <p className="opacity-60 font-bold text-sm">الحرف هو...</p>
                        <div
                            key={letter}
                            className="text-[140px] font-black leading-none animate-pop-in"
                            style={{ color: 'var(--primary-color)', textShadow: '0 0 60px var(--primary-glow)' }}
                        >
                            {letter}
                        </div>
                        <p className="opacity-50 text-sm font-bold animate-pulse">ابدأ الكتابة... 🚀</p>
                    </div>
                )}

                {/* Playing */}
                {gameState === 'playing' && (

                    <div className="flex-1 flex flex-col animate-fade-in gap-4">
                        {/* Letter display */}
                        <div className="flex items-center justify-between">
                            <div className="glass-card rounded-2xl px-5 py-2 flex items-center gap-3">
                                <span className="text-xs opacity-60 font-bold">الحرف:</span>
                                <span className="text-4xl font-black" style={{ color: 'var(--primary-color)' }}>{letter}</span>
                            </div>
                            {inputsLocked && busCallerName && (
                                <div className="glass-card rounded-2xl px-4 py-2 text-xs font-black text-amber-400 animate-pulse">
                                    ⏳ {graceLeft}s
                                </div>
                            )}
                        </div>

                        {busCallerName && (
                            <div className="glass-card rounded-2xl p-3 text-center border border-amber-400/40 animate-pop-in">
                                <p className="text-amber-400 font-black text-sm">
                                    🚌 {busCallerName} قال أتوبيس! {inputsLocked && !isHostRef.current ? `(${graceLeft}s)` : ''}
                                </p>
                            </div>
                        )}

                        {/* Category inputs */}
                        <div className="flex flex-col gap-3">
                            {CATEGORIES.map(cat => (
                                <div key={cat.key} className="glass-card rounded-2xl p-3 flex items-center gap-3 border border-white/5">
                                    <div className="w-10 h-10 rounded-xl glass-card flex items-center justify-center shrink-0 text-lg">
                                        {cat.emoji}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[11px] opacity-50 font-bold mb-1">{cat.label}</p>
                                        <input
                                            type="text"
                                            value={myAnswers[cat.key]}
                                            onChange={e => updateMyAnswer(cat.key, e.target.value)}
                                            disabled={inputsLocked}
                                            placeholder={`اكتب ${cat.label} بحرف "${letter}"`}
                                            dir="rtl"
                                            className="w-full bg-transparent outline-none font-bold text-sm placeholder:opacity-30 disabled:opacity-40"
                                            maxLength={30}
                                        />
                                    </div>
                                    {myAnswers[cat.key] && (
                                        <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Bus button */}
                        {!inputsLocked && (
                            <button
                                onClick={handleCallBus}
                                className="mt-2 h-16 rounded-2xl font-black text-lg w-full flex items-center justify-center gap-2 transition-all active:scale-95 hover:scale-102"
                                style={{
                                    background: 'linear-gradient(135deg, #16a34a, #166534)',
                                    boxShadow: '0 8px 32px rgba(22,163,74,0.4)',
                                    border: '2px solid rgba(74,222,128,0.4)',
                                }}
                            >
                                🚌 أتوبيس كومبليت!
                            </button>
                        )}

                        {inputsLocked && !oppAnswers && (
                            <div className="text-center opacity-50 text-sm font-bold animate-pulse mt-2">
                                في انتظار إجابات الخصم...
                            </div>
                        )}
                    </div>
                )}

                {/* Review Phase */}
                {gameState === 'review' && oppAnswers && (
                    <div className="flex-1 flex flex-col animate-fade-in gap-4">
                        <div className="text-center">
                            <h2 className="text-xl font-black">مراجعة الإجابات</h2>
                            <p className="text-xs opacity-60 font-bold">الحرف: <span style={{ color: 'var(--primary-color)' }}>{letter}</span></p>
                        </div>

                        {/* Answers table */}
                        <div className="flex flex-col gap-2">
                            {/* Header row */}
                            <div className="grid grid-cols-3 gap-2 px-2 text-xs font-black opacity-60">
                                <span className="text-center">الفئة</span>
                                <span className="text-center">أنت</span>
                                <span className="text-center">{oppProfile?.nickname || 'الخصم'}</span>
                            </div>

                            {CATEGORIES.map(cat => {
                                const mine = (myAnswers[cat.key] || '').trim();
                                const theirs = (oppAnswers[cat.key] || '').trim();
                                const isDup = mine && theirs && mine.toLowerCase() === theirs.toLowerCase();
                                return (
                                    <div key={cat.key} className={`glass-card rounded-2xl p-3 grid grid-cols-3 gap-2 items-center border ${isDup ? 'border-amber-400/40 bg-amber-500/10' : 'border-white/5'}`}>
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-lg">{cat.emoji}</span>
                                            <span className="text-[10px] opacity-60 font-bold">{cat.label}</span>
                                        </div>
                                        <div className="text-center">
                                            <p className={`text-sm font-bold ${mine ? 'text-emerald-400' : 'opacity-30'}`}>
                                                {mine || '—'}
                                            </p>
                                            <p className="text-[10px] opacity-50">
                                                {!mine ? '0 نقطة' : isDup ? '5 نقاط' : '10 نقاط'}
                                            </p>
                                        </div>
                                        <div className="text-center">
                                            <p className={`text-sm font-bold ${theirs ? 'text-sky-400' : 'opacity-30'}`}>
                                                {theirs || '—'}
                                            </p>
                                            <p className="text-[10px] opacity-50">
                                                {!theirs ? '0 نقطة' : isDup ? '5 نقاط' : '10 نقاط'}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Round totals */}
                        <div className="glass-card rounded-2xl p-4 grid grid-cols-2 gap-4 border border-white/10 text-center">
                            <div>
                                <p className="text-xs opacity-60 font-bold mb-1">نقاطك</p>
                                <p className="text-4xl font-black text-emerald-400">{myRoundScore}</p>
                            </div>
                            <div>
                                <p className="text-xs opacity-60 font-bold mb-1">{oppProfile?.nickname || 'الخصم'}</p>
                                <p className="text-4xl font-black text-sky-400">{oppRoundScore}</p>
                            </div>
                        </div>

                        <button
                            onClick={handleGoToScoreboard}
                            className="glow-button w-full h-14 rounded-2xl text-base font-black"
                        >
                            السبورة 📊
                        </button>
                    </div>
                )}

                {/* Scoreboard */}
                {gameState === 'scoreboard' && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in gap-5 px-2">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center border border-white/10 shadow-2xl">
                            <h2 className="text-2xl font-black mb-1">السبورة 📊</h2>
                            <p className="opacity-60 text-xs mb-6">الجولة {round - 1}</p>
                            <div className="flex gap-6 justify-center mb-6">
                                <div className={`flex-1 rounded-2xl p-5 ${scores.me > scores.opp ? 'bg-emerald-500/20 border border-emerald-400/40' : 'glass-card'}`}>
                                    <p className="text-xs opacity-60 font-bold mb-1">أنت</p>
                                    <p className="text-5xl font-black">{scores.me}</p>
                                </div>
                                <div className={`flex-1 rounded-2xl p-5 ${scores.opp > scores.me ? 'bg-emerald-500/20 border border-emerald-400/40' : 'glass-card'}`}>
                                    <p className="text-xs opacity-60 font-bold mb-1">{oppProfile?.nickname || 'الخصم'}</p>
                                    <p className="text-5xl font-black">{scores.opp}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 w-full max-w-sm">
                            <button
                                onClick={handleRestart}
                                className="glass-card flex-1 h-14 rounded-2xl font-bold flex items-center justify-center gap-2"
                            >
                                <RotateCcw size={16} /> إعادة الكل
                            </button>
                            {isHostRef.current && (
                                <button
                                    onClick={handleStartNewRound}
                                    className="glow-button flex-[2] h-14 rounded-2xl font-black flex items-center justify-center gap-2"
                                >
                                    🚌 جولة جديدة
                                </button>
                            )}
                            {!isHostRef.current && (
                                <div className="flex-[2] h-14 glass-card rounded-2xl flex items-center justify-center text-xs opacity-60 font-bold">
                                    انتظر المضيف...
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>

            <ConnectionPauseOverlay
                conn={connRef.current}
                onLeave={() => { connRef.current?.close(); setView('hub'); }}
            />
            {(gameState === 'playing' || gameState === 'review') && (
                <EmotesOverlay conn={connRef.current} />
            )}
        </>
    );
}
