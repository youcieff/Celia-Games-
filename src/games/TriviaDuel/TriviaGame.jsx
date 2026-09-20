import React, { useState, useEffect, useRef } from 'react';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import PlayerGameHeader from '../../components/PlayerGameHeader';
import ConnectionPauseOverlay from '../../components/ConnectionPauseOverlay';
import EmotesOverlay from '../../components/EmotesOverlay';
import Logo from '../../components/Logo';
import { IconTriviaDuel } from '../../components/icons/GameIcons';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Check from 'lucide-react/dist/esm/icons/check';
import X from 'lucide-react/dist/esm/icons/x';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Zap from 'lucide-react/dist/esm/icons/zap';
import { playSound, playHaptic } from '../../lib/audioEngine';
import useProfile from '../../hooks/useProfile';
import { getRandomTriviaQuiz } from './triviaQuestions';
import { triggerVictoryEffects, triggerDefeatEffects, triggerDrawEffects } from '../../lib/effectsEngine';

const QUESTION_TIME_SEC = 10;
const OPTION_LABELS = ['أ', 'ب', 'ج', 'د'];

export default function TriviaGame({ setView }) {
    const connRef = useRef(null);
    const isHostRef = useRef(false);
    const [myProfile, , awardMatchResult] = useProfile();
    const [oppProfile, setOppProfile] = useState(null);

    // States: 'lobby' | 'playing' | 'revealing' | 'gameover'
    const [gameState, setGameState] = useState('lobby');
    const [questions, setQuestions] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_SEC);

    // Player states for current question
    const [myAnswer, setMyAnswer] = useState(null); // index or null
    const [oppAnswer, setOppAnswer] = useState(null);
    const [myScore, setMyScore] = useState(0);
    const [oppScore, setOppScore] = useState(0);

    const timerRef = useRef(null);
    const startTimeRef = useRef(Date.now());
    const myScoreRef = useRef(0);
    const oppScoreRef = useRef(0);

    // ── Start Match ───────────────────────────────────────────────────────────
    const handleGameStart = (conn, hostMode, oppProf) => {
        isHostRef.current = hostMode;
        connRef.current = conn;
        if (oppProf) setOppProfile(oppProf);
        conn.on('data', onData);

        if (hostMode) {
            const quiz = getRandomTriviaQuiz(10);
            setQuestions(quiz);
            conn.send({ type: 'start_match', questions: quiz });
            startQuiz(quiz);
        }
    };

    const startQuiz = (quiz) => {
        setQuestions(quiz);
        setCurrentIdx(0);
        setMyScore(0);
        setOppScore(0);
        myScoreRef.current = 0;
        oppScoreRef.current = 0;
        loadQuestion(0);
    };

    const loadQuestion = (idx) => {
        setMyAnswer(null);
        setOppAnswer(null);
        setTimeLeft(QUESTION_TIME_SEC);
        setGameState('playing');
        startTimeRef.current = Date.now();
        playSound('ding');

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleTimeUp();
                    return 0;
                }
                if (prev <= 4) {
                    playSound('tick');
                    playHaptic(10);
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleTimeUp = () => {
        revealQuestion();
    };

    const onData = (msg) => {
        if (!msg || !msg.type) return;

        switch (msg.type) {
            case 'start_match':
                setQuestions(msg.questions);
                startQuiz(msg.questions);
                break;

            case 'answer':
                setOppAnswer({
                    idx: msg.selectedIdx,
                    elapsedMs: msg.elapsedMs
                });
                break;

            case 'next_question':
                setCurrentIdx(msg.questionIdx);
                loadQuestion(msg.questionIdx);
                break;

            case 'rematch':
                if (isHostRef.current) {
                    const quiz = getRandomTriviaQuiz(10);
                    connRef.current?.send({ type: 'start_match', questions: quiz });
                    startQuiz(quiz);
                }
                break;

            case 'rematch_accept':
                // AI accepted rematch
                if (isHostRef.current) {
                    const quiz = getRandomTriviaQuiz(10);
                    connRef.current?.send({ type: 'start_match', questions: quiz });
                    startQuiz(quiz);
                }
                break;

            default: break;
        }
    };

    // ── Handle My Answer ──────────────────────────────────────────────────────
    const handleSelectOption = (idx) => {
        if (myAnswer !== null || gameState !== 'playing') return;

        const elapsedMs = Date.now() - startTimeRef.current;
        setMyAnswer({ idx, elapsedMs });
        playSound('pop');
        playHaptic(15);

        connRef.current?.send({
            type: 'answer',
            questionIdx: currentIdx,
            selectedIdx: idx,
            elapsedMs
        });
    };

    // When both answered, trigger reveal immediately
    useEffect(() => {
        if (gameState === 'playing' && myAnswer !== null && oppAnswer !== null) {
            if (timerRef.current) clearInterval(timerRef.current);
            revealQuestion();
        }
    }, [myAnswer, oppAnswer, gameState]);

    const revealQuestion = () => {
        setGameState('revealing');
        const q = questions[currentIdx];
        if (!q) return;

        // Calculate points
        let myPoints = 0;
        let oppPoints = 0;

        if (myAnswer && myAnswer.idx === q.correctIndex) {
            myPoints = 1;
            playSound('win');
            playHaptic([50, 40, 80]);
        } else {
            playSound('lose');
        }

        if (oppAnswer && oppAnswer.idx === q.correctIndex) {
            oppPoints = 1;
        }

        myScoreRef.current += myPoints;
        oppScoreRef.current += oppPoints;
        setMyScore(myScoreRef.current);
        setOppScore(oppScoreRef.current);

        // Advance to next question or end game after 2.6s
        setTimeout(() => {
            const nextIdx = currentIdx + 1;
            if (nextIdx < questions.length) {
                if (isHostRef.current) {
                    connRef.current?.send({ type: 'next_question', questionIdx: nextIdx });
                    setCurrentIdx(nextIdx);
                    loadQuestion(nextIdx);
                }
            } else {
                setGameState('gameover');
                
                const didIWin = myScoreRef.current > oppScoreRef.current;
                const isDraw = myScoreRef.current === oppScoreRef.current;

                if (didIWin) {
                    triggerVictoryEffects();
                    if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100, 50, 200]);
                } else if (isDraw) {
                    triggerDrawEffects();
                } else {
                    triggerDefeatEffects();
                }
                
                awardMatchResult?.(didIWin);
            }
        }, 2600);
    };

    // ── Rematch ───────────────────────────────────────────────────────────────
    const handleRematch = () => {
        playSound('click');
        if (isHostRef.current) {
            const quiz = getRandomTriviaQuiz(10);
            connRef.current?.send({ type: 'start_match', questions: quiz });
            startQuiz(quiz);
        } else {
            connRef.current?.send({ type: 'rematch' });
        }
    };

    const currentQ = questions[currentIdx] || null;

    return (
        <>
            <div className="animated-bg"><div className="bg-orb-3" /></div>
            <div className="min-h-dvh max-w-md mx-auto px-4 flex flex-col safe-area-pt overflow-x-hidden overflow-y-auto pb-6">

                {/* Header */}
                {gameState !== 'lobby' ? (
                    <PlayerGameHeader
                        title="تحدي المعلومات"
                        gameId="trivia-duel"
                        simultaneous={true}
                        isMyTurn={false}
                        oppProfile={oppProfile}
                        myScore={myScore}
                        oppScore={oppScore}
                        statusText={gameState === 'playing' ? `السؤال ${currentIdx + 1} من ${questions.length}` : null}
                        onLeave={() => { connRef.current?.close(); setView('hub'); }}
                    />
                ) : (
                    <div className="grid grid-cols-3 items-center py-4 mb-4">
                        <div><Logo size="small" /></div>
                        <div className="flex justify-center">
                            <div className="flex items-center gap-2 glass-card px-3.5 py-1.5 rounded-2xl border border-white/10 shrink-0">
                                <IconTriviaDuel size={18} className="text-[var(--accent)]" />
                                <span className="text-xs font-black gradient-text">حرب المعلومات</span>
                            </div>
                        </div>
                        <div className="flex justify-end"><button onClick={() => setView('hub')} className="glass-card px-4 py-2 rounded-2xl text-xs font-bold hover:scale-105 transition-transform">الرئيسية</button></div>
                    </div>
                )}

                {/* Lobby */}
                {gameState === 'lobby' && (
                    <div className="flex-1 flex pb-16 safe-area-pb">
                        <P2PConnectionManager gameIdPrefix="celia-trivia" onGameStart={handleGameStart} />
                    </div>
                )}

                {/* Playing / Revealing Screen */}
                {(gameState === 'playing' || gameState === 'revealing') && currentQ && (
                    <div className="flex-1 flex flex-col justify-between py-2 animate-fade-in gap-4">

                        {/* Question Header & Category */}
                        <div className="flex items-center justify-between">
                            <span className="glass-card px-3 py-1 rounded-full text-xs font-bold border border-amber-400/30 text-amber-300 shadow-sm flex items-center gap-1.5">
                                <Zap size={13} className="text-amber-400" />
                                {currentQ.category}
                            </span>

                            {/* Circular Timer */}
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-sm border-2 transition-all ${
                                timeLeft <= 3 ? 'border-rose-500 bg-rose-500/20 text-rose-400 animate-ping' :
                                timeLeft <= 6 ? 'border-amber-400 bg-amber-400/20 text-amber-300' :
                                'border-emerald-400 bg-emerald-400/20 text-emerald-300'
                            }`}>
                                {timeLeft}
                            </div>
                        </div>

                        {/* Question Text Card */}
                        <div className="glass-card rounded-3xl p-6 text-center border border-white/10 shadow-xl flex items-center justify-center min-h-[120px]">
                            <h2 className="text-lg sm:text-xl font-black leading-relaxed text-white">
                                {currentQ.question}
                            </h2>
                        </div>

                        {/* 4 Choices Grid */}
                        <div className="grid grid-cols-1 gap-2.5">
                            {currentQ.options.map((opt, i) => {
                                const isCorrect = currentQ.correctIndex === i;
                                const isMyChoice = myAnswer?.idx === i;
                                const isOppChoice = oppAnswer?.idx === i;

                                let btnStyle = 'glass-card border-white/10 hover:border-white/30 text-white';

                                if (gameState === 'revealing') {
                                    if (isCorrect) {
                                        btnStyle = 'border-2 border-emerald-400 bg-emerald-500/30 text-emerald-200 shadow-[0_0_20px_rgba(52,211,153,0.4)] scale-[1.02]';
                                    } else if (isMyChoice) {
                                        btnStyle = 'border-2 border-rose-500 bg-rose-500/30 text-rose-200';
                                    } else {
                                        btnStyle = 'opacity-40 border-white/5';
                                    }
                                } else if (isMyChoice) {
                                    btnStyle = 'border-2 border-[var(--accent)] bg-[var(--accent-soft)] shadow-md text-[var(--accent)]';
                                }

                                return (
                                    <button
                                        key={i}
                                        onClick={() => handleSelectOption(i)}
                                        disabled={myAnswer !== null || gameState !== 'playing'}
                                        className={`w-full min-h-14 py-3 px-4 rounded-2xl flex items-center justify-between transition-all duration-300 font-black text-sm select-none active:scale-98 relative overflow-hidden ${btnStyle}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">
                                                {OPTION_LABELS[i]}
                                            </span>
                                            <span className="text-right">{opt}</span>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            {/* Reveal Icons */}
                                            {gameState === 'revealing' && isCorrect && (
                                                <div className="w-7 h-7 rounded-full bg-emerald-500 text-black flex items-center justify-center animate-pop-in">
                                                    <Check size={16} strokeWidth={3} />
                                                </div>
                                            )}
                                            {gameState === 'revealing' && isMyChoice && !isCorrect && (
                                                <div className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center animate-pop-in">
                                                    <X size={16} strokeWidth={3} />
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Status message */}
                        <div className="text-center text-xs font-bold opacity-60 min-h-[20px]">
                            {gameState === 'playing' && myAnswer && !oppAnswer && 'في انتظار إجابة الخصم...'}
                            {gameState === 'playing' && !myAnswer && 'اختر الإجابة الصحيحة! كل سؤال بنقطة واحدة.'}
                            {gameState === 'revealing' && 'إظهار النتيجة...'}
                        </div>
                    </div>
                )}

                {/* Game Over Screen */}
                {gameState === 'gameover' && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in gap-6 px-2">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center border border-white/15 shadow-2xl relative overflow-hidden">
                            <div className="w-20 h-20 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(245,158,11,0.4)]">
                                <Trophy size={42} />
                            </div>

                            <h2 className="text-2xl font-black mb-1">
                                {myScore > oppScore ? '🎉 مبروك! انتصرت في التحدي!' : myScore === oppScore ? '🤝 تعادل ذكي بينكم!' : '👏 حاول تاني، فاز الخصم!'}
                            </h2>
                            <p className="opacity-60 text-xs font-bold mb-6">نتيجة تحدي المعلومات النهائي</p>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className={`rounded-2xl p-4 ${myScore >= oppScore ? 'bg-emerald-500/20 border border-emerald-400/50' : 'glass-card'}`}>
                                    <p className="text-xs opacity-60 font-bold mb-1">أنت</p>
                                    <p className="text-4xl font-black text-emerald-400">{myScore}</p>
                                </div>
                                <div className={`rounded-2xl p-4 ${oppScore > myScore ? 'bg-sky-500/20 border border-sky-400/50' : 'glass-card'}`}>
                                    <p className="text-xs opacity-60 font-bold mb-1">{oppProfile?.nickname || 'الخصم'}</p>
                                    <p className="text-4xl font-black text-sky-400">{oppScore}</p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setView('hub')}
                                    className="glass-card flex-1 h-13 rounded-2xl font-bold text-xs"
                                >
                                    الرئيسية
                                </button>
                                <button
                                    onClick={handleRematch}
                                    className="glow-button flex-[2] h-13 rounded-2xl font-black text-sm flex items-center justify-center gap-2"
                                >
                                    <RotateCcw size={16} />
                                    تحدي تاني!
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            <ConnectionPauseOverlay conn={connRef.current} onLeave={() => { connRef.current?.close(); setView('hub'); }} />
            {(gameState === 'playing' || gameState === 'revealing') && (
                <EmotesOverlay conn={connRef.current} oppProfile={oppProfile} showStandaloneButton={false} />
            )}
        </>
    );
}
