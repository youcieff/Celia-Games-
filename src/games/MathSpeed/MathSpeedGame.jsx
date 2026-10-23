import React, { useState, useRef, useEffect } from 'react';
import Logo from '../../components/Logo';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import PlayerGameHeader from '../../components/PlayerGameHeader';
import ConnectionPauseOverlay from '../../components/ConnectionPauseOverlay';
import EmotesOverlay from '../../components/EmotesOverlay';
import { playSound } from '../../lib/audioEngine';
import useProfile from '../../hooks/useProfile';
import { triggerVictoryEffects, triggerDefeatEffects } from '../../lib/effectsEngine';
import { GameIcon } from '../../components/icons/GameIcons';

const WIN_SCORE = 10;
const ROUND_TIME_MS = 7000; // give players time to read and solve each question
const LATE_ANSWER_GRACE_MS = 900;

function shuffleOptions(values) {
    const shuffled = [...values];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const other = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
    }
    return shuffled;
}

function generateQuestion(difficulty = 0) {
    const ops = difficulty >= 2 ? ['+', '-', '*', '/'] : ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let num1, num2, answer;
    const growth = Math.max(1, difficulty + 1);

    if (op === '+') {
        num1 = Math.floor(Math.random() * (20 * growth)) + 1;
        num2 = Math.floor(Math.random() * (20 * growth)) + 1;
        answer = num1 + num2;
    } else if (op === '-') {
        num1 = Math.floor(Math.random() * (20 * growth + 1)) + 10;
        num2 = Math.floor(Math.random() * num1) + 1; // Ensure positive result
        answer = num1 - num2;
    } else if (op === '*') {
        const factorMax = Math.min(15, 9 + difficulty * 2);
        num1 = Math.floor(Math.random() * (factorMax - 1)) + 2;
        num2 = Math.floor(Math.random() * (factorMax - 1)) + 2;
        answer = num1 * num2;
    } else {
        answer = Math.floor(Math.random() * (6 + difficulty * 2)) + 2;
        num2 = Math.floor(Math.random() * (8 + difficulty * 2)) + 2;
        num1 = answer * num2;
    }

    const options = new Set([answer]);
    while(options.size < 4) {
        let offset = Math.floor(Math.random() * 7) - 3;
        if (offset === 0) offset = 10;
        const fake = answer + offset;
        if (fake >= 0) options.add(fake);
    }

    const shuffled = shuffleOptions(options);

    return {
        text: `${num1} ${op} ${num2}`,
        answer,
        options: shuffled,
        difficulty
    };
}

export default function MathSpeedGame({ setView }) {
    const connRef = useRef(null);
    const isHostRef = useRef(false);
    const isAIRef = useRef(false);
    const hasStartedRef = useRef(false);
    const [myProfile, , awardMatchResult] = useProfile({ gameId: 'math-speed', gameTitle: 'تحدي الرياضيات' });
    const [oppProfile, setOppProfile] = useState(null);

    // State
    const [gameState, setGameState] = useState('lobby'); // lobby, countdown, playing, round_over, game_over
    const [myScore, setMyScore] = useState(0);
    const [oppScore, setOppScore] = useState(0);
    const scoreRef = useRef({ my: 0, opp: 0 });
    
    const [question, setQuestion] = useState(null);
    const [timeLeft, setTimeLeft] = useState(100); // percentage 100 to 0
    const [myAnswer, setMyAnswer] = useState(null);
    const [oppAnswer, setOppAnswer] = useState(null);
    const answerStartedAtRef = useRef(0);
    const roundCounterRef = useRef(0);
    const selectOptionRef = useRef(null);
    
    const [roundResult, setRoundResult] = useState(null); // 'win', 'lose', 'draw'
    const [myCombo, setMyCombo] = useState(0);
    const [oppCombo, setOppCombo] = useState(0);
    const [difficultyLevel, setDifficultyLevel] = useState(0);
    const [roundPoints, setRoundPoints] = useState(0);

    // Host Refs
    const roundRef = useRef({
        isActive: false,
        q: null,
        p1Answer: null,
        p2Answer: null,
        p1Time: 0,
        p2Time: 0,
        startTime: 0
    });
    const streakRef = useRef({ p1: 0, p2: 0, difficulty: 0 });
    
    const timerRef = useRef(null);
    const roundTimeoutRef = useRef(null);
    const aiAnswerTimeoutRef = useRef(null);
    const nextRoundTimeoutRef = useRef(null);
    const connectionPausedAtRef = useRef(null);
    const connectionSnapshotRef = useRef(null);

    const buildConnectionSnapshot = () => {
        const round = roundRef.current;
        const hostScore = isHostRef.current ? scoreRef.current.my : scoreRef.current.opp;
        const guestScore = isHostRef.current ? scoreRef.current.opp : scoreRef.current.my;
        const effectiveNow = connectionPausedAtRef.current ?? performance.now();
        const elapsedMs = gameState === 'playing' && round.isActive
            ? Math.max(0, effectiveNow - round.startTime)
            : 0;
        return {
            connectionGame: 'math-speed',
            gameState,
            question: round.q || (question ? { ...question } : null),
            roundId: round.id || roundCounterRef.current,
            elapsedMs: Math.min(ROUND_TIME_MS, elapsedMs),
            hostScore,
            guestScore,
            hostCombo: streakRef.current.p1,
            guestCombo: streakRef.current.p2,
            difficulty: streakRef.current.difficulty,
            hostAnswer: round.p1Answer,
            guestAnswer: round.p2Answer,
            hostTime: round.p1Time,
            guestTime: round.p2Time,
            roundPoints,
            roundResult,
            timeLeft,
            savedAt: Date.now()
        };
    };

    connectionSnapshotRef.current = buildConnectionSnapshot();

    const restoreConnectionSnapshot = (snapshot) => {
        if (!snapshot || snapshot.connectionGame !== 'math-speed') return false;
        const hostScore = Number(snapshot.hostScore) || 0;
        const guestScore = Number(snapshot.guestScore) || 0;
        scoreRef.current = isHostRef.current
            ? { my: hostScore, opp: guestScore }
            : { my: guestScore, opp: hostScore };
        setMyScore(scoreRef.current.my);
        setOppScore(scoreRef.current.opp);
        setMyCombo(isHostRef.current ? snapshot.hostCombo || 0 : snapshot.guestCombo || 0);
        setOppCombo(isHostRef.current ? snapshot.guestCombo || 0 : snapshot.hostCombo || 0);
        streakRef.current = { p1: snapshot.hostCombo || 0, p2: snapshot.guestCombo || 0, difficulty: snapshot.difficulty || 0 };
        roundCounterRef.current = Number(snapshot.roundId) || 0;
        const restoredQuestion = !isHostRef.current && snapshot.gameState === 'playing' && snapshot.question
            ? { text: snapshot.question.text, options: snapshot.question.options, difficulty: snapshot.question.difficulty }
            : snapshot.question;
        setQuestion(restoredQuestion || null);
        setDifficultyLevel(Number(snapshot.question?.difficulty ?? snapshot.difficulty) || 0);
        setRoundPoints(Number(snapshot.roundPoints) || 0);
        setRoundResult(snapshot.roundResult || null);
        setMyAnswer(isHostRef.current ? snapshot.hostAnswer : snapshot.guestAnswer);
        setOppAnswer(isHostRef.current ? snapshot.guestAnswer : null);
        setTimeLeft(Number(snapshot.timeLeft) || 0);
        const isPlaying = snapshot.gameState === 'playing' && snapshot.question;
        const elapsedMs = Math.max(0, Math.min(ROUND_TIME_MS, Number(snapshot.elapsedMs) || 0));
        roundRef.current = {
            id: roundCounterRef.current,
            isActive: Boolean(isPlaying && isHostRef.current),
            q: isHostRef.current ? snapshot.question || null : restoredQuestion || null,
            p1Answer: snapshot.hostAnswer ?? null,
            p2Answer: snapshot.guestAnswer ?? null,
            p1Time: Number(snapshot.hostTime) || 0,
            p2Time: Number(snapshot.guestTime) || 0,
            startTime: performance.now() - elapsedMs
        };
        answerStartedAtRef.current = performance.now() - elapsedMs;
        hasStartedRef.current = snapshot.gameState !== 'starting';
        setGameState(snapshot.gameState || 'starting');

        if (isPlaying) {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                const elapsed = performance.now() - answerStartedAtRef.current;
                const pct = Math.max(0, 100 - (elapsed / ROUND_TIME_MS) * 100);
                setTimeLeft(pct);
                if (pct <= 0) clearInterval(timerRef.current);
            }, 30);
            if (isHostRef.current) {
                if (roundTimeoutRef.current) clearTimeout(roundTimeoutRef.current);
                roundTimeoutRef.current = setTimeout(evaluateRoundHost, Math.max(0, ROUND_TIME_MS + LATE_ANSWER_GRACE_MS - elapsedMs));
            }
        }
        return true;
    };

    useEffect(() => {
        if (!connRef.current || !isHostRef.current || gameState === 'lobby') return undefined;
        const save = () => connRef.current?.saveState?.(connectionSnapshotRef.current);
        save();
        const interval = gameState === 'playing' ? setInterval(save, 500) : null;
        return () => { if (interval) clearInterval(interval); };
    }, [gameState, question, myScore, oppScore, myAnswer, oppAnswer, myCombo, oppCombo, roundPoints, roundResult]);

    // --- Host Logic ---

    const startRoundHost = () => {
        if (gameState === 'game_over') return;
        if (aiAnswerTimeoutRef.current) clearTimeout(aiAnswerTimeoutRef.current);
        if (nextRoundTimeoutRef.current) clearTimeout(nextRoundTimeoutRef.current);
        
        const q = generateQuestion(streakRef.current.difficulty);
        const roundId = ++roundCounterRef.current;
        roundRef.current = {
            id: roundId,
            isActive: true,
            q: q,
            p1Answer: null,
            p2Answer: null,
            p1Time: 0,
            p2Time: 0,
            startTime: performance.now()
        };
        answerStartedAtRef.current = roundRef.current.startTime;

        setQuestion(q);
        setDifficultyLevel(q.difficulty);
        setMyAnswer(null);
        setOppAnswer(null);
        setRoundPoints(0);
        setGameState('playing');
        setTimeLeft(100);

        const publicQuestion = { text: q.text, options: q.options, difficulty: q.difficulty };
        connRef.current?.send({ type: 'round_start', question: publicQuestion, roundId });

        // Start UI Timer
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            const elapsed = performance.now() - roundRef.current.startTime;
            const pct = Math.max(0, 100 - (elapsed / ROUND_TIME_MS) * 100);
            setTimeLeft(pct);
            if (pct <= 0) clearInterval(timerRef.current);
        }, 30);

        // Round Timeout
        if (roundTimeoutRef.current) clearTimeout(roundTimeoutRef.current);
        roundTimeoutRef.current = setTimeout(() => {
            evaluateRoundHost();
        }, ROUND_TIME_MS + LATE_ANSWER_GRACE_MS);

        // AI Logic
        if (isAIRef.current) {
            const playerStreak = streakRef.current.p1;
            const aiDelay = Math.max(2200, 3800 - q.difficulty * 320 - Math.min(playerStreak, 4) * 120) + Math.random() * 1400;
            aiAnswerTimeoutRef.current = setTimeout(() => {
                if (!roundRef.current.isActive) return;
                const accuracy = Math.min(0.88, 0.68 + q.difficulty * 0.05 + Math.min(playerStreak, 4) * 0.025);
                const isCorrect = Math.random() < accuracy;
                let aiGuess;
                if (isCorrect) {
                    aiGuess = q.answer;
                } else {
                    const wrongs = q.options.filter(o => o !== q.answer);
                    aiGuess = wrongs[Math.floor(Math.random() * wrongs.length)];
                }
                handleAnswerHost('p2', aiGuess);
            }, aiDelay);
        }
    };

    const handleAnswerHost = (player, answerValue, submittedElapsed = null, submittedRoundId = null) => {
        const r = roundRef.current;
        if (!r.isActive || (submittedRoundId !== null && submittedRoundId !== r.id)) return;
        if (!r.q?.options?.includes(answerValue)) return;

        const hostElapsed = performance.now() - r.startTime;
        const timeTaken = player === 'p2' && Number.isFinite(submittedElapsed)
            ? Math.max(0, Math.min(ROUND_TIME_MS, submittedElapsed))
            : hostElapsed;
        if (timeTaken > ROUND_TIME_MS) return;
        
        if (player === 'p1' && r.p1Answer === null) {
            r.p1Answer = answerValue;
            r.p1Time = timeTaken;
        } else if (player === 'p2' && r.p2Answer === null) {
            r.p2Answer = answerValue;
            r.p2Time = timeTaken;
            setOppAnswer(answerValue);
        }

        // If both answered, evaluate immediately
        if (r.p1Answer !== null && r.p2Answer !== null) {
            clearTimeout(roundTimeoutRef.current);
            evaluateRoundHost();
        }
    };

    const evaluateRoundHost = () => {
        const r = roundRef.current;
        if (!r.isActive) return;
        r.isActive = false;
        clearInterval(timerRef.current);
        clearTimeout(roundTimeoutRef.current);
        clearTimeout(aiAnswerTimeoutRef.current);

        const correct = r.q.answer;
        const p1Correct = r.p1Answer === correct;
        const p2Correct = r.p2Answer === correct;

        let winner = 'draw';
        
        if (p1Correct && p2Correct) {
            // Treat sub-frame ties equally instead of giving the host the point.
            const timeDifference = r.p1Time - r.p2Time;
            winner = Math.abs(timeDifference) <= 1 ? 'draw' : timeDifference < 0 ? 'p1' : 'p2';
        } else if (p1Correct) {
            winner = 'p1';
        } else if (p2Correct) {
            winner = 'p2';
        }

        const p1Multiplier = Math.min(5, Math.floor(streakRef.current.p1 / 3) + 1);
        const p2Multiplier = Math.min(5, Math.floor(streakRef.current.p2 / 3) + 1);
        const p1ScoreInc = winner === 'p1' ? p1Multiplier : 0;
        const p2ScoreInc = winner === 'p2' ? p2Multiplier : 0;

        streakRef.current.p1 = p1Correct ? streakRef.current.p1 + 1 : 0;
        streakRef.current.p2 = p2Correct ? streakRef.current.p2 + 1 : 0;
        streakRef.current.difficulty = Math.min(3, Math.max(streakRef.current.p1, streakRef.current.p2));
        const localPoints = isHostRef.current ? p1ScoreInc : p2ScoreInc;
        setRoundPoints(localPoints);
        setMyCombo(isHostRef.current ? streakRef.current.p1 : streakRef.current.p2);
        setOppCombo(isHostRef.current ? streakRef.current.p2 : streakRef.current.p1);
        setDifficultyLevel(streakRef.current.difficulty);

        const nextScores = {
            my: scoreRef.current.my + p1ScoreInc,
            opp: scoreRef.current.opp + p2ScoreInc
        };
        scoreRef.current = nextScores;
        setMyScore(nextScores.my);
        setOppScore(nextScores.opp);
        
        let localRes = 'draw';
        if (winner === 'p1') localRes = 'win';
        if (winner === 'p2') localRes = 'lose';
        
        setRoundResult(localRes);
        setGameState('round_over');
        playSound(localRes === 'win' ? 'success' : 'error');

        connRef.current?.send({
            type: 'round_end',
            winner: winner, // 'p1', 'p2', or 'draw'
            p1Answer: r.p1Answer,
            p2Answer: r.p2Answer,
            correctAnswer: correct,
            p1Points: p1ScoreInc,
            p2Points: p2ScoreInc,
            p1Combo: streakRef.current.p1,
            p2Combo: streakRef.current.p2,
            difficulty: streakRef.current.difficulty
        });

        // Check overall game over
        nextRoundTimeoutRef.current = setTimeout(() => {
            const currentMyScore = scoreRef.current.my;
            const currentOppScore = scoreRef.current.opp;
            
            if (currentMyScore >= WIN_SCORE || currentOppScore >= WIN_SCORE) {
                setGameState('game_over');
                connRef.current?.send({ type: 'game_over', finalHost: currentMyScore, finalGuest: currentOppScore });
                
                if (currentMyScore > currentOppScore) {
                    triggerVictoryEffects();
                    awardMatchResult('win', 20);
                } else if (currentOppScore > currentMyScore) {
                    triggerDefeatEffects();
                    awardMatchResult('loss', 5);
                } else {
                    awardMatchResult('draw', 10);
                }
            } else {
                startRoundHost();
            }
        }, 2000);
    };

    // --- Guest & Shared UI Logic ---

    const selectOption = (opt) => {
        const elapsed = performance.now() - answerStartedAtRef.current;
        if (connectionPausedAtRef.current !== null || gameState !== 'playing' || myAnswer !== null || timeLeft <= 0 || elapsed > ROUND_TIME_MS) return;
        
        playSound('tap');
        setMyAnswer(opt);
        
        if (isHostRef.current) {
            handleAnswerHost('p1', opt);
        } else {
            connRef.current?.send({
                type: 'answer', value: opt,
                roundId: roundCounterRef.current,
                elapsedMs: elapsed,
            });
        }
    };

    useEffect(() => {
        selectOptionRef.current = selectOption;
    });

    useEffect(() => {
        if (gameState !== 'playing' || !question) return undefined;
        const handleAnswerShortcut = (event) => {
            if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
            const choiceIndex = Number(event.key) - 1;
            if (!Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex >= question.options.length) return;
            event.preventDefault();
            selectOptionRef.current?.(question.options[choiceIndex]);
        };
        window.addEventListener('keydown', handleAnswerShortcut);
        return () => window.removeEventListener('keydown', handleAnswerShortcut);
    }, [gameState, question]);

    const handleGameStart = (conn, hostMode, oppProf, savedState) => {
        isHostRef.current = hostMode;
        connRef.current = conn;
        hasStartedRef.current = false;
        if (oppProf) {
            setOppProfile(oppProf);
            isAIRef.current = !!oppProf.isAI;
        }
        conn.on('data', onData);
        if (restoreConnectionSnapshot(savedState)) {
            if (hostMode) conn.on('peer-reconnect', () => {
                const snapshot = connectionSnapshotRef.current;
                if (snapshot?.connectionGame === 'math-speed') conn.send({ type: 'state_sync', state: snapshot });
            });
        } else {
            setGameState('starting');
        }
    };

    const nextMultiplier = Math.min(5, Math.floor(myCombo / 3) + 1);
    const secondsRemaining = Math.max(0, Math.ceil((timeLeft / 100) * (ROUND_TIME_MS / 1000)));

    const onData = (data) => {
        if (data.type === 'state_sync' && data.state?.connectionGame === 'math-speed') {
            restoreConnectionSnapshot(data.state);
            return;
        }
        if (data.type === 'round_start' && !isHostRef.current) {
            setQuestion(data.question);
            roundCounterRef.current = data.roundId;
            answerStartedAtRef.current = performance.now();
            setDifficultyLevel(data.question.difficulty || 0);
            setRoundPoints(0);
            setMyAnswer(null);
            setOppAnswer(null);
            setGameState('playing');
            setTimeLeft(100);
            
            const startT = answerStartedAtRef.current;
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                const elapsed = performance.now() - startT;
                const pct = Math.max(0, 100 - (elapsed / ROUND_TIME_MS) * 100);
                setTimeLeft(pct);
                if (pct <= 0) clearInterval(timerRef.current);
            }, 30);
        }
        
        if (data.type === 'answer' && isHostRef.current) {
            handleAnswerHost('p2', data.value, data.elapsedMs, data.roundId);
        }

        if (data.type === 'round_end' && !isHostRef.current) {
            clearInterval(timerRef.current);
            setTimeLeft(0);
            setOppAnswer(data.p1Answer); // Host's answer
            setQuestion((current) => current ? { ...current, answer: data.correctAnswer } : current);
            
            let localRes = 'draw';
            if (data.winner === 'p2') {
                localRes = 'win';
                const points = data.p2Points ?? 1;
                scoreRef.current.my += points;
                setMyScore(scoreRef.current.my);
                setRoundPoints(points);
            } else if (data.winner === 'p1') {
                localRes = 'lose';
                const points = data.p1Points ?? 1;
                scoreRef.current.opp += points;
                setOppScore(scoreRef.current.opp);
            }

            setMyCombo(data.p2Combo || 0);
            setOppCombo(data.p1Combo || 0);
            setDifficultyLevel(data.difficulty || 0);
            
            setRoundResult(localRes);
            setGameState('round_over');
            playSound(localRes === 'win' ? 'success' : 'error');
        }

        if (data.type === 'game_over' && !isHostRef.current) {
            setGameState('game_over');
            scoreRef.current = { my: data.finalGuest, opp: data.finalHost };
            setMyScore(data.finalGuest);
            setOppScore(data.finalHost);
            if (data.finalGuest > data.finalHost) {
                triggerVictoryEffects();
                awardMatchResult('win', 20);
            } else if (data.finalHost > data.finalGuest) {
                triggerDefeatEffects();
                awardMatchResult('loss', 5);
            } else {
                awardMatchResult('draw', 10);
            }
        }
    };

    const pauseForConnection = () => {
        if (connectionPausedAtRef.current !== null) return;
        connectionPausedAtRef.current = performance.now();
        if (timerRef.current) clearInterval(timerRef.current);
        if (roundTimeoutRef.current) clearTimeout(roundTimeoutRef.current);
        timerRef.current = null;
        roundTimeoutRef.current = null;
    };

    const resumeAfterConnection = () => {
        if (connectionPausedAtRef.current === null) return;
        const pausedFor = Math.max(0, performance.now() - connectionPausedAtRef.current);
        connectionPausedAtRef.current = null;
        if (gameState !== 'playing' || !question) return;

        if (isHostRef.current && roundRef.current.isActive) {
            roundRef.current.startTime += pausedFor;
            answerStartedAtRef.current += pausedFor;
        } else {
            answerStartedAtRef.current += pausedFor;
        }

        const startTime = isHostRef.current && roundRef.current.isActive
            ? roundRef.current.startTime
            : answerStartedAtRef.current;
        timerRef.current = setInterval(() => {
            const elapsed = performance.now() - startTime;
            const pct = Math.max(0, 100 - (elapsed / ROUND_TIME_MS) * 100);
            setTimeLeft(pct);
            if (pct <= 0) clearInterval(timerRef.current);
        }, 30);

        if (isHostRef.current && roundRef.current.isActive) {
            const elapsed = performance.now() - roundRef.current.startTime;
            roundTimeoutRef.current = setTimeout(evaluateRoundHost, Math.max(0, ROUND_TIME_MS + LATE_ANSWER_GRACE_MS - elapsed));
        }
    };

    useEffect(() => {
        if (gameState === 'starting' && isHostRef.current && !hasStartedRef.current) {
            hasStartedRef.current = true;
            setTimeout(startRoundHost, 1500);
        }
    }, [gameState]);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (roundTimeoutRef.current) clearTimeout(roundTimeoutRef.current);
            if (aiAnswerTimeoutRef.current) clearTimeout(aiAnswerTimeoutRef.current);
            if (nextRoundTimeoutRef.current) clearTimeout(nextRoundTimeoutRef.current);
        };
    }, []);

    // --- Render ---

    if (gameState === 'lobby') {
        return (
            <div className="min-h-dvh max-w-md mx-auto px-4 flex flex-col safe-area-pt overflow-x-hidden overflow-y-auto pb-6">
                <div className="grid grid-cols-3 items-center py-4 mb-4">
                    <div><Logo size="small" /></div>
                    <div className="flex justify-center">
                        <div className="flex items-center gap-2 glass-card px-3.5 py-1.5 rounded-2xl border border-white/10 shrink-0">
                            <GameIcon gameId="math-duel" size={18} className="text-[var(--accent)]" />
                            <span className="text-xs font-black gradient-text">سرعة الحساب</span>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button onClick={() => setView('hub')} className="glass-card px-4 py-2 rounded-2xl text-xs font-bold hover:scale-105 transition-transform">
                            الرئيسية
                        </button>
                    </div>
                </div>
                <div className="flex-1 flex pb-16 safe-area-pb">
                    <P2PConnectionManager gameIdPrefix="celia-math" onGameStart={handleGameStart} />
                </div>
            </div>
        );
    }

    return (
        <div className="game-fullscreen-shell fixed inset-0 bg-[#0B0C10] flex flex-col font-arabic select-none">
            <ConnectionPauseOverlay conn={connRef.current} opponentName={oppProfile?.nickname} onConnectionPause={pauseForConnection} onConnectionResume={resumeAfterConnection} onLeave={() => { connRef.current?.close(); setView('hub'); }} />
            <EmotesOverlay conn={connRef.current} />

            <div className="animated-bg opacity-30"><div className="bg-orb-1" /><div className="bg-orb-2" /></div>

            <PlayerGameHeader
                gameId="math-duel"
                myProfile={myProfile}
                oppProfile={oppProfile}
                myScore={myScore}
                oppScore={oppScore}
                statusText={`${ROUND_TIME_MS / 1000} ثوانٍ للسؤال · الهدف ${WIN_SCORE} نقاط`}
                onLeave={() => { connRef.current?.close?.(); setView('hub'); }}
            />

            <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-4 min-h-0 relative z-10 w-full max-w-xl mx-auto">
                {(gameState === 'playing' || gameState === 'round_over') && (
                    <div className="mb-3 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-center text-[11px] font-bold text-white/70 sm:text-xs">
                        جاوب قبل انتهاء الوقت · استخدم أزرار الإجابة أو الأرقام ١–٤ من لوحة المفاتيح
                    </div>
                )}
                
                {gameState === 'starting' && (
                    <div className="text-center animate-pulse">
                        <div className="text-6xl mb-4 text-emerald-400">🔢</div>
                        <div className="text-white text-xl font-black">جاري تجهيز العقل الإلكتروني...</div>
                    </div>
                )}

                {(gameState === 'playing' || gameState === 'round_over') && question && (
                    <div className="w-full flex flex-col items-center">
                        <div className="mb-4 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2.5 shadow-lg sm:mb-5">
                            <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-black sm:text-xs">
                                <span className="text-white/60">الوقت المتبقي</span>
                                <strong className={secondsRemaining <= 2 ? 'text-rose-300 tabular-nums' : 'text-amber-200 tabular-nums'}>{secondsRemaining} ث</strong>
                                <span className="text-white/50">جولة {roundCounterRef.current}</span>
                            </div>
                            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="الوقت المتبقي للإجابة" aria-valuemin={0} aria-valuemax={7} aria-valuenow={secondsRemaining}>
                                <div
                                    className={`h-full rounded-full transition-[width] ease-linear ${timeLeft > 50 ? 'bg-gradient-to-r from-emerald-400 to-cyan-300' : timeLeft > 20 ? 'bg-gradient-to-r from-amber-300 to-orange-400' : 'bg-gradient-to-r from-rose-400 to-red-500'}`}
                                    style={{ width: `${timeLeft}%`, transitionDuration: '30ms' }}
                                />
                            </div>
                        </div>

                        <div className="mb-6 grid w-full grid-cols-3 gap-2 text-center text-[10px] font-black sm:text-xs">
                            <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-2 py-2">
                                <span className="block text-white/50">سلسلتك</span>
                                <span className="text-[var(--accent)]">{myCombo} صح · ×{nextMultiplier} للنقطة القادمة</span>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/25 px-2 py-2">
                                <span className="block text-white/50">صعوبة الجولة القادمة</span>
                                <span className="text-white">{difficultyLevel + 1} / 4</span>
                            </div>
                            <div className="rounded-xl border border-sky-300/15 bg-sky-300/[0.06] px-2 py-2">
                                <span className="block text-white/50">سلسلة الخصم</span>
                                <span className="text-sky-300">{oppCombo} صح</span>
                            </div>
                        </div>

                        <div className="mb-5 flex min-h-[150px] w-full flex-col items-center justify-center rounded-[28px] border border-[var(--accent)]/25 bg-gradient-to-br from-[var(--accent)]/15 via-slate-900/90 to-sky-950/50 px-4 py-5 shadow-[0_16px_46px_rgba(0,0,0,0.32)] sm:mb-6 sm:min-h-[190px]">
                            <span className="mb-3 text-[10px] font-black uppercase tracking-[.2em] text-white/45">احسب الناتج</span>
                            <div className="flex max-w-full items-center justify-center gap-3 break-words text-center text-[clamp(2.8rem,10vw,5.5rem)] font-black leading-none text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.26)] dir-ltr sm:gap-5">
                                <span>{question.text.replace('*', '×').replace('/', '÷')}</span><span className="text-[var(--accent)]">= ?</span>
                            </div>
                        </div>

                        {/* Options */}
                        <div className="grid w-full grid-cols-2 gap-3 sm:gap-4" role="group" aria-label="اختيارات الإجابة">
                            {question.options.map((opt, i) => {
                                let stateClass = "bg-white/5 border-white/10 hover:bg-white/10 text-white"; // default
                                
                                if (gameState === 'playing') {
                                    if (myAnswer === opt) stateClass = "bg-[var(--accent)] border-[var(--accent)] text-white scale-95 opacity-80";
                                } else if (gameState === 'round_over') {
                                    if (opt === question.answer) {
                                        stateClass = "bg-emerald-500 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.6)] text-white scale-105 z-10";
                                    } else if (myAnswer === opt) {
                                        stateClass = "bg-rose-500 border-rose-400 text-white opacity-60 scale-95";
                                    } else {
                                        stateClass = "bg-white/5 border-white/10 text-white/30";
                                    }
                                }

                                return (
                                    <button
                                        key={i}
                                        onClick={() => selectOption(opt)}
                                        disabled={gameState !== 'playing' || myAnswer !== null || timeLeft <= 0}
                                        aria-label={`الاختيار ${i + 1}: ${opt}`}
                                        aria-pressed={myAnswer === opt}
                                        aria-keyshortcuts={String(i + 1)}
                                        className={`group relative flex min-h-[68px] items-center justify-center gap-3 rounded-2xl border-2 text-3xl font-black shadow-lg transition-all duration-200 active:scale-[.97] disabled:cursor-default sm:min-h-[84px] sm:text-4xl ${stateClass}`}
                                    >
                                        <span className="absolute left-3 top-2 grid h-5 w-5 place-items-center rounded-md bg-black/15 text-[10px] font-black text-white/55">{i + 1}</span>
                                        <span>{opt}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {gameState === 'round_over' && (
                            <div className="mt-4 grid w-full grid-cols-2 gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-center text-xs font-bold">
                                <span className="text-[var(--accent)]">إجابتك: {myAnswer ?? '—'}</span>
                                <span className="text-sky-300">إجابة الخصم: {oppAnswer ?? '—'}</span>
                            </div>
                        )}
                        
                        {gameState === 'round_over' && <div className="mt-4 text-center text-xl font-black sm:text-2xl">
                            {roundResult === 'win' ? <span className="text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]">أسرع وأصح! +{roundPoints}</span> :
                             roundResult === 'lose' ? <span className="text-rose-400">بطيء أو خطأ!</span> :
                             <span className="text-amber-400">تعادل! لا نقاط</span>}
                        </div>}
                    </div>
                )}

            </main>

            {/* Game Over Modal */}
            {gameState === 'game_over' && (
                <div className="safe-area-overlay fixed inset-0 z-50 bg-black/80 backdrop-blur-lg flex items-center justify-center p-4 animate-fade-in">
                    <div className="glass-card max-w-sm w-full p-8 rounded-3xl text-center shadow-2xl border border-white/20 relative overflow-hidden">
                        <div className="text-6xl mb-4 animate-bounce">
                            {myScore >= WIN_SCORE ? '👑' : '🤖'}
                        </div>
                        <h2 className={`text-3xl font-black mb-2 ${myScore >= WIN_SCORE ? 'text-amber-400' : 'text-rose-400'}`}>
                            {myScore >= WIN_SCORE ? 'عبقري رياضيات!' : 'تم تدميرك!'}
                        </h2>
                        
                        <div className="flex items-center justify-center gap-6 my-6">
                            <div className="text-center">
                                <div className="text-4xl font-black text-[var(--accent)]">{myScore}</div>
                                <div className="text-xs text-white/50 mt-1">أنت</div>
                            </div>
                            <div className="text-2xl font-black text-white/20">-</div>
                            <div className="text-center">
                                <div className="text-4xl font-black text-sky-400">{oppScore}</div>
                                <div className="text-xs text-white/50 mt-1">{oppProfile?.nickname || 'الخصم'}</div>
                            </div>
                        </div>
                        
                        <button
                            onClick={() => { playSound('click'); setView('hub'); }}
                            className="w-full py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black text-sm transition-all"
                        >
                            العودة للقائمة
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
