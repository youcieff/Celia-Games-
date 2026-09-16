import React, { useState, useRef, useEffect, useCallback } from 'react';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import PlayerGameHeader from '../../components/PlayerGameHeader';
import ConnectionPauseOverlay from '../../components/ConnectionPauseOverlay';
import EmotesOverlay from '../../components/EmotesOverlay';
import Logo from '../../components/Logo';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Send from 'lucide-react/dist/esm/icons/send';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Palette from 'lucide-react/dist/esm/icons/palette';
import HelpCircle from 'lucide-react/dist/esm/icons/help-circle';
import { playSound, playHaptic } from '../../lib/audioEngine';
import useProfile from '../../hooks/useProfile';
import { getRandomWords } from './drawWords';

const DRAW_TIME_SEC = 60;  // 1 minute to draw
const GUESS_TIME_SEC = 60; // 1 minute to guess
const WIN_SCORE = 5;      // First to 5 points wins the match!

const COLORS = ['#ffffff', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#000000'];
const SIZES = [3, 7, 14, 24];

function normalizeArabic(text) {
    if (!text) return '';
    return text
        .trim()
        .toLowerCase()
        .replace(/[\u064B-\u065F\u0670]/g, '') // remove tashkeel
        .replace(/[إأآا]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[^\w\u0600-\u06FF]/g, '')
        .replace(/\s+/g, '');
}

export default function QuickDrawGame({ setView }) {
    const connRef = useRef(null);
    const isHostRef = useRef(false);
    const [myProfile, , awardMatchResult] = useProfile();
    const [oppProfile, setOppProfile] = useState(null);

    // gameState: lobby | role_select | word_choice | drawing | waiting_for_drawing | guessing | waiting_for_guess | round_over | gameover
    const [gameState, setGameState] = useState('lobby');
    const [myScore, setMyScore] = useState(0);
    const [oppScore, setOppScore] = useState(0);
    const [round, setRound] = useState(0);
    const [firstDrawerRole, setFirstDrawerRole] = useState('me'); // 'me' | 'opp'
    const [isDrawer, setIsDrawer] = useState(false);
    const [currentWord, setCurrentWord] = useState(null);
    const [wordChoices, setWordChoices] = useState([]);
    const [timeLeft, setTimeLeft] = useState(DRAW_TIME_SEC);
    const [guessInput, setGuessInput] = useState('');
    const [roundMsg, setRoundMsg] = useState('');
    const [winner, setWinner] = useState(null);
    const [chatGuesses, setChatGuesses] = useState([]);
    const [brushColor, setBrushColor] = useState('#ffffff');
    const [brushSize, setBrushSize] = useState(1);
    const [guessAttemptsLeft, setGuessAttemptsLeft] = useState(3);
    const guessAttemptsRef = useRef(3);

    const canvasRef = useRef(null);
    const isDrawing = useRef(false);
    const lastPos = useRef(null);
    const timerRef = useRef(null);
    const myScoreRef = useRef(0);
    const oppScoreRef = useRef(0);
    const roundRef = useRef(0);
    const currentWordRef = useRef(null);

    const handleGameStart = (conn, hostMode, oppProf) => {
        isHostRef.current = hostMode;
        connRef.current = conn;
        if (oppProf) setOppProfile(oppProf);
        conn.on('data', onData);

        if (hostMode) {
            // Host chooses who draws first
            setGameState('role_select');
        } else {
            // Peer waits for host's role selection
            setGameState('role_select');
        }
    };

    const chooseFirstDrawer = (choice) => {
        // choice: 'me' | 'opp'
        setFirstDrawerRole(choice);
        const peerDrawerRole = choice === 'me' ? 'opp' : 'me';

        connRef.current?.send({
            type: 'init_roles',
            firstDrawerRole: peerDrawerRole
        });

        startRound(0, choice);
    };

    const startRound = (roundIdx, firstRole) => {
        const role = firstRole !== undefined ? firstRole : firstDrawerRole;
        // Alternate every round: even round = role, odd round = opposite role
        const imDrawer = roundIdx % 2 === 0 ? (role === 'me') : (role === 'opp');

        roundRef.current = roundIdx;
        setRound(roundIdx);
        setIsDrawer(imDrawer);
        setGuessInput('');
        setChatGuesses([]);
        setGuessAttemptsLeft(3);
        guessAttemptsRef.current = 3;
        clearCanvas();

        if (imDrawer) {
            // I am drawing: pick word first
            const choices = getRandomWords(3);
            setWordChoices(choices);
            setCurrentWord(null);
            currentWordRef.current = null;
            setTimeLeft(DRAW_TIME_SEC);
            setGameState('word_choice');
        } else {
            // I am guessing: wait for drawer to finish and send drawing
            setCurrentWord(null);
            currentWordRef.current = null;
            setTimeLeft(DRAW_TIME_SEC);
            setGameState('waiting_for_drawing');

            // If opponent is AI, prompt AI to start drawing
            if (connRef.current?.isAI) {
                connRef.current.send({ type: 'ai_start_drawing' });
            }
        }
    };

    const startDrawTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleSendDrawing();
                    return 0;
                }
                if (prev <= 5) {
                    playSound('tick');
                    playHaptic(10);
                }
                return prev - 1;
            });
        }, 1000);
    };

    const startGuessTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleGuessTimeUp();
                    return 0;
                }
                if (prev <= 5) {
                    playSound('tick');
                    playHaptic(10);
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleGuessTimeUp = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        connRef.current?.send({ type: 'time_up_sync' });
        const word = currentWordRef.current?.word || '';
        showRoundOver(`انتهى الوقت! الكلمة كانت: "${word}"`);
    };

    const handleWordChoice = (wordObj) => {
        setCurrentWord(wordObj);
        currentWordRef.current = wordObj;
        setWordChoices([]);
        setTimeLeft(DRAW_TIME_SEC);
        setGameState('drawing');

        // Notify guesser of category and letter count hint
        connRef.current?.send({
            type: 'drawer_started',
            wordLength: wordObj.word.length,
            category: wordObj.category
        });

        startDrawTimer();
        playSound('ding');
    };

    // Drawer manually sends the drawing or time runs out
    const handleSendDrawing = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const imageData = canvas.toDataURL('image/png');
        const word = currentWordRef.current;

        connRef.current?.send({
            type: 'drawing_sent',
            imageData,
            word: word?.word,
            wordLength: word?.word?.length,
            category: word?.category
        });

        playSound('pop');
        setTimeLeft(GUESS_TIME_SEC);
        setGameState('waiting_for_guess');
        startDrawerWaitingTimer();
    };

    const startDrawerWaitingTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    connRef.current?.send({ type: 'time_up_sync' });
                    const word = currentWordRef.current?.word || '';
                    showRoundOver(`انتهى وقت التخمين دون إجابة صحيحة! الكلمة كانت: "${word}" (0 نقطة)`);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const onData = useCallback((msg) => {
        if (!msg || !msg.type) return;

        switch (msg.type) {
            case 'init_roles': {
                setFirstDrawerRole(msg.firstDrawerRole);
                startRound(0, msg.firstDrawerRole);
                break;
            }

            case 'drawer_started': {
                setCurrentWord({
                    hint: `${msg.category} — ${msg.wordLength} حروف`,
                    category: msg.category,
                    wordLength: msg.wordLength
                });
                break;
            }

            case 'drawing_sent': {
                // Guesser receives the finished drawing!
                setCurrentWord({
                    word: msg.word,
                    category: msg.category,
                    wordLength: msg.wordLength,
                    hint: `${msg.category} — ${msg.wordLength} حروف`
                });
                currentWordRef.current = { word: msg.word, category: msg.category };

                // Draw image on canvas
                const img = new Image();
                img.onload = () => {
                    const canvas = canvasRef.current;
                    if (!canvas) return;
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                };
                img.src = msg.imageData;

                setTimeLeft(GUESS_TIME_SEC);
                setGameState('guessing');
                startGuessTimer();
                playSound('ding');
                break;
            }

            case 'chat_guess': {
                setChatGuesses(prev => [
                    ...prev.slice(-4),
                    {
                        sender: oppProfile?.nickname || 'الخصم',
                        text: msg.guess,
                        isCorrect: msg.isCorrect
                    }
                ]);
                playSound(msg.isCorrect ? 'win' : 'tap');
                break;
            }

            case 'correct_guess': {
                // Opponent guessed correctly — opponent gets 1 point!
                if (timerRef.current) clearInterval(timerRef.current);
                const pts = msg.pts || 1;
                const newOppScore = oppScoreRef.current + pts;
                oppScoreRef.current = newOppScore;
                setOppScore(newOppScore);

                playSound('win');
                playHaptic(50);
                showRoundOver(`الخصم خمّن الكلمة بنجاح! +${pts} نقطة`);
                break;
            }

            case 'time_up_sync': {
                if (timerRef.current) clearInterval(timerRef.current);
                const word = currentWordRef.current?.word || '';
                showRoundOver(`انتهى وقت التخمين دون إجابة صحيحة! الكلمة كانت: "${word}" (0 نقطة)`);
                break;
            }

            case 'guesser_out_of_attempts': {
                // Opponent used all 3 guesses — end round for drawer side too
                if (timerRef.current) clearInterval(timerRef.current);
                const word = msg.word || '';
                showRoundOver(`❌ الخصم نفدت محاولاته الثلاث! الكلمة كانت: "${word}" (0 نقطة للتخمين)`);
                break;
            }

            case 'next_round': {
                startRound(msg.roundIdx);
                break;
            }

            case 'rematch': {
                myScoreRef.current = 0;
                oppScoreRef.current = 0;
                setMyScore(0);
                setOppScore(0);
                if (isHostRef.current) {
                    setGameState('role_select');
                } else {
                    setGameState('role_select');
                }
                break;
            }

            default:
                break;
        }
    }, [oppProfile]);

    const handleGuessSubmit = () => {
        if (!guessInput.trim() || !currentWordRef.current || gameState !== 'guessing') return;
        if (guessAttemptsRef.current <= 0) return;

        const rawGuess = guessInput.trim();
        const guessNorm = normalizeArabic(rawGuess);
        const actualNorm = normalizeArabic(currentWordRef.current?.word);
        const isCorrect = Boolean(actualNorm && guessNorm.length > 0 && guessNorm === actualNorm);

        // Add guess to chat
        setChatGuesses(prev => [
            ...prev.slice(-4),
            { sender: 'أنت', text: rawGuess, isCorrect }
        ]);

        connRef.current?.send({
            type: 'chat_guess',
            guess: rawGuess,
            isCorrect
        });

        if (isCorrect) {
            // Correct guess: I earn 1 point!
            if (timerRef.current) clearInterval(timerRef.current);
            playSound('win');
            playHaptic(50);

            const newMyScore = myScoreRef.current + 1;
            myScoreRef.current = newMyScore;
            setMyScore(newMyScore);

            connRef.current?.send({ type: 'correct_guess', pts: 1 });
            showRoundOver(`🎉 أحسنت! تخمين صحيح للكلمة "${currentWordRef.current?.word}" ✅ (+1 نقطة)`);
        } else {
            // Wrong guess — consume an attempt
            playSound('lose');
            playHaptic(20);

            const newAttempts = guessAttemptsRef.current - 1;
            guessAttemptsRef.current = newAttempts;
            setGuessAttemptsLeft(newAttempts);

            if (newAttempts <= 0) {
                // All attempts exhausted — end round immediately, no point for guesser
                if (timerRef.current) clearInterval(timerRef.current);
                connRef.current?.send({ type: 'guesser_out_of_attempts', word: currentWordRef.current?.word });
                showRoundOver(`❌ نفدت المحاولات الثلاث! الكلمة كانت: "${currentWordRef.current?.word}" (0 نقطة)`);
            }
        }

        setGuessInput('');
    };

    const showRoundOver = (msg) => {
        setRoundMsg(msg);
        setGameState('round_over');

        setTimeout(() => {
            const nextTurn = roundRef.current + 1;
            const myCurrent = myScoreRef.current;
            const oppCurrent = oppScoreRef.current;

            // In each round, both players get an opportunity to draw and guess:
            // Turn 0 (Player A draws, B guesses) + Turn 1 (Player B draws, A guesses) -> completes Round 1
            const isRoundComplete = nextTurn % 2 === 0;

            if (isRoundComplete && (myCurrent >= WIN_SCORE || oppCurrent >= WIN_SCORE)) {
                if (myCurrent !== oppCurrent) {
                    const w = myCurrent > oppCurrent ? 'me' : 'opp';
                    setWinner(w);
                    setGameState('gameover');
                    if (w === 'me') { awardMatchResult(true); playSound('win'); }
                    else if (w === 'opp') { awardMatchResult(false); playSound('lose'); }
                    return;
                }
                // If tied at 5+ points: continue to next round to break the tie
            }

            if (isHostRef.current) {
                connRef.current?.send({ type: 'next_round', roundIdx: nextTurn });
            }
            startRound(nextTurn);
        }, 2800);
    };

    // ── Canvas Interaction ───────────────────────────────────────────────────
    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const getPos = (e, canvas) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * (canvas.width / rect.width),
            y: (clientY - rect.top) * (canvas.height / rect.height)
        };
    };

    const startDraw = useCallback((e) => {
        if (!isDrawer || gameState !== 'drawing') return;
        e.preventDefault();
        isDrawing.current = true;
        const canvas = canvasRef.current;
        lastPos.current = getPos(e, canvas);
    }, [isDrawer, gameState]);

    const doDraw = useCallback((e) => {
        if (!isDrawing.current || !isDrawer || gameState !== 'drawing') return;
        e.preventDefault();
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const pos = getPos(e, canvas);
        const from = lastPos.current;
        if (!from) return;

        ctx.strokeStyle = brushColor;
        ctx.lineWidth = SIZES[brushSize];
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();

        lastPos.current = pos;
    }, [isDrawer, gameState, brushColor, brushSize]);

    const endDraw = useCallback(() => {
        isDrawing.current = false;
        lastPos.current = null;
    }, []);

    const handleRematch = () => {
        connRef.current?.send({ type: 'rematch' });
        myScoreRef.current = 0;
        oppScoreRef.current = 0;
        setMyScore(0);
        setOppScore(0);
        setGameState('role_select');
    };

    if (gameState === 'lobby') {
        return (
            <>
                <div className="animated-bg"><div className="bg-orb-1" /><div className="bg-orb-2" /></div>
                <div className="min-h-dvh max-w-lg mx-auto px-4 flex flex-col safe-area-pt overflow-x-hidden overflow-y-auto pb-6">
                    <div className="flex justify-between items-center py-4 mb-2">
                        <Logo size="small" />
                        <button
                            onClick={() => { connRef.current?.close?.(); setView('hub'); }}
                            className="glass-card px-4 py-2 rounded-2xl text-xs font-bold hover:scale-105 active:scale-95 transition-transform text-white/90"
                        >
                            الرئيسية
                        </button>
                    </div>

                    <div className="flex-1 flex pb-16 safe-area-pb">
                        <P2PConnectionManager
                            gameIdPrefix="celia-draw"
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
                title="ارسم وخمن"
                gameId="quick-draw"
                isMyTurn={isDrawer}
                oppProfile={oppProfile}
                myScore={myScore}
                oppScore={oppScore}
                statusText={`الجولة ${Math.floor(round / 2) + 1} (الهدف: ${WIN_SCORE} نقاط)`}
                onLeave={() => { connRef.current?.close?.(); setView('hub'); }}
            />

            {/* Role Select Modal at match start */}
            {gameState === 'role_select' && (
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="glass-card max-w-md w-full p-6 rounded-3xl border-2 border-white/15 text-center shadow-2xl animate-pop-in">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-3xl">
                            🎨
                        </div>
                        <h2 className="text-xl font-black text-white mb-2">اختر من يبدأ بالرسم</h2>
                        <p className="text-xs text-slate-300 mb-6">
                            الرسام لديه دقيقة واحدة للرسم ويمكنه إرسال الرسمة في أي وقت، ثم يحصل المخمن على دقيقة للتخمين!
                        </p>

                        {isHostRef.current ? (
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => chooseFirstDrawer('me')}
                                    className="p-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <span>🎨 أنا سأبدأ بالرسم أولاً (الخصم يخمن)</span>
                                </button>
                                <button
                                    onClick={() => chooseFirstDrawer('opp')}
                                    className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <span>🤖 الخصم يبدأ بالرسم (أنا أخمن أولاً)</span>
                                </button>
                            </div>
                        ) : (
                            <div className="p-4 glass-card rounded-2xl border border-white/10 text-amber-300 text-sm font-bold animate-pulse">
                                ⌛ بانتظار مضيف الغرفة لتحديد دور البداية...
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Word Selection (Drawer role) */}
            {gameState === 'word_choice' && isDrawer && (
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="glass-card max-w-md w-full p-6 rounded-3xl border-2 border-white/15 text-center shadow-2xl animate-pop-in">
                        <span className="text-3xl">🎨</span>
                        <h2 className="text-lg font-black text-white mt-2 mb-1">دورك في الرسم!</h2>
                        <p className="text-xs text-slate-300 mb-6">اختر كلمة واحدة لترسمها للخصم:</p>

                        <div className="flex flex-col gap-3">
                            {wordChoices.map((w, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleWordChoice(w)}
                                    className="p-4 rounded-2xl glass-card border border-white/15 hover:border-amber-400 hover:bg-amber-500/10 flex items-center justify-between transition-all duration-200 active:scale-95 text-right"
                                >
                                    <div>
                                        <div className="text-base font-black text-white">{w.word}</div>
                                        <div className="text-xs text-slate-400">{w.category} ({w.word.length} حروف)</div>
                                    </div>
                                    <span className="text-2xl">{w.emoji || '🖌️'}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Waiting for Drawer to finish */}
            {gameState === 'waiting_for_drawing' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-20 h-20 rounded-full glass-card border-2 border-amber-500/40 flex items-center justify-center text-4xl mb-4 animate-bounce">
                        🎨
                    </div>
                    <h2 className="text-lg font-black text-white mb-2">الخصم يقوم بالرسم الآن...</h2>
                    <p className="text-xs text-slate-400 max-w-xs mb-4">
                        سيتم إرسال الرسمة إليك فور إنهائها لتبدأ دقيقة التخمين!
                    </p>
                    {currentWord?.hint && (
                        <div className="glass-card px-4 py-2 rounded-xl text-xs font-black text-amber-300 border border-amber-500/30">
                            تلميح: {currentWord.hint}
                        </div>
                    )}
                </div>
            )}

            {/* Waiting for Guesser (Drawer waiting) */}
            {gameState === 'waiting_for_guess' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-20 h-20 rounded-full glass-card border-2 border-emerald-500/40 flex items-center justify-center text-4xl mb-4 animate-pulse">
                        🚀
                    </div>
                    <h2 className="text-lg font-black text-white mb-2">تم إرسال الرسمة بنجاح!</h2>
                    <p className="text-xs text-slate-400 max-w-xs mb-3">
                        الخصم يشاهد رسمتك الآن ويحاول تخمين الكلمة...
                    </p>

                    <div className={`text-xs font-mono font-black px-4 py-1.5 rounded-full border mb-4
                        ${timeLeft <= 10 ? 'text-rose-400 border-rose-500/40 bg-rose-500/10 animate-pulse' : 'text-amber-400 border-amber-500/40 bg-amber-500/10'}`}
                    >
                        ⏱️ متبقي للتخمين: {timeLeft} ثانية
                    </div>

                    {/* Live chat guesses */}
                    <div className="w-full max-w-sm glass-card p-3 rounded-2xl border border-white/10 flex flex-col gap-2">
                        <span className="text-xs font-bold text-slate-400">تخمينات الخصم:</span>
                        {chatGuesses.length === 0 ? (
                            <span className="text-xs text-slate-500 py-2">بانتظار تخمين الخصم...</span>
                        ) : (
                            chatGuesses.map((g, i) => (
                                <div key={i} className={`text-xs px-3 py-1.5 rounded-lg flex items-center justify-between ${g.isCorrect ? 'bg-emerald-500/20 text-emerald-300 font-black' : 'bg-rose-500/10 text-rose-300 font-bold'}`}>
                                    <span>{g.text}</span>
                                    <span>{g.isCorrect ? '✅ صحيح (+1)' : '❌ غير صحيح (0)'}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Drawing Canvas (Drawer Active) or Guessing Canvas (Guesser Active) */}
            {(gameState === 'drawing' || gameState === 'guessing') && (
                <div className="flex-1 flex flex-col justify-between p-3 max-w-md w-full mx-auto overflow-hidden">
                    {/* Top Info Bar */}
                    <div className="flex items-center justify-between glass-card px-4 py-2 rounded-2xl border border-white/10">
                        {isDrawer ? (
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400">ارسم:</span>
                                <span className="text-xs font-black text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20">
                                    {currentWord?.word}
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <HelpCircle size={14} className="text-sky-400" />
                                <span className="text-xs font-bold text-slate-300">
                                    {currentWord?.hint || 'خمّن الرسمة!'}
                                </span>
                            </div>
                        )}

                        <div className={`text-xs font-mono font-black px-3 py-1 rounded-full border
                            ${timeLeft <= 10 ? 'text-rose-400 border-rose-500/40 bg-rose-500/10 animate-pulse' : 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'}`}
                        >
                            ⏱️ {timeLeft} ثانية
                        </div>
                    </div>

                    {/* Canvas Area */}
                    <div className="relative my-2 rounded-2xl overflow-hidden border-2 border-white/15 shadow-2xl bg-slate-900">
                        <canvas
                            ref={canvasRef}
                            width={600}
                            height={450}
                            className={`w-full aspect-[4/3] block bg-slate-950 ${isDrawer ? 'cursor-crosshair touch-none' : 'cursor-default'}`}
                            onMouseDown={startDraw}
                            onMouseMove={doDraw}
                            onMouseUp={endDraw}
                            onMouseLeave={endDraw}
                            onTouchStart={startDraw}
                            onTouchMove={doDraw}
                            onTouchEnd={endDraw}
                        />
                    </div>

                    {/* Drawer Tools Palette */}
                    {isDrawer && (
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between glass-card p-2 rounded-2xl border border-white/10">
                                {/* Colors */}
                                <div className="flex items-center gap-1.5 overflow-x-auto">
                                    {COLORS.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setBrushColor(c)}
                                            style={{ backgroundColor: c }}
                                            className={`w-6 h-6 rounded-full border border-white/30 transition-transform ${brushColor === c ? 'scale-125 ring-2 ring-amber-400' : 'hover:scale-110'}`}
                                        />
                                    ))}
                                </div>

                                {/* Brush sizes & clear */}
                                <div className="flex items-center gap-2 shrink-0">
                                    {SIZES.map((s, idx) => (
                                        <button
                                            key={s}
                                            onClick={() => setBrushSize(idx)}
                                            className={`w-6 h-6 rounded-lg flex items-center justify-center glass-card border transition-all ${brushSize === idx ? 'border-amber-400 bg-amber-500/20 text-amber-300' : 'border-white/10 text-slate-400'}`}
                                        >
                                            <span style={{ width: s / 2, height: s / 2 }} className="rounded-full bg-current block" />
                                        </button>
                                    ))}
                                    <button
                                        onClick={clearCanvas}
                                        className="w-7 h-7 rounded-lg glass-card flex items-center justify-center text-rose-400 hover:bg-rose-500/20 border border-white/10"
                                        title="مسح اللوحة"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Send Drawing Button (Outside Canvas) */}
                            <button
                                onClick={handleSendDrawing}
                                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer mt-0.5"
                            >
                                <Send size={16} /> إرسال الرسمة للخصم 🚀
                            </button>
                        </div>
                    )}

                    {/* Guesser Input Bar & Chat */}
                    {!isDrawer && gameState === 'guessing' && (
                        <div className="flex flex-col gap-2">
                            {/* Attempts indicator + Guesses Log */}
                            <div className="flex items-center justify-between px-2 py-1 rounded-xl bg-white/5 border border-white/10">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-300">المحاولات المتبقية:</span>
                                    <div className="flex items-center gap-1.5">
                                        {[1, 2, 3].map((num) => (
                                            <span
                                                key={num}
                                                className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                                                    num <= guessAttemptsLeft
                                                        ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)] ring-1 ring-amber-300'
                                                        : 'bg-white/10 ring-1 ring-white/20 scale-75 opacity-40'
                                                }`}
                                                title={`محاولة ${num}`}
                                            />
                                        ))}
                                        <span className="text-xs font-black text-amber-300 mr-1">
                                            ({guessAttemptsLeft} من 3)
                                        </span>
                                    </div>
                                </div>
                                {guessAttemptsLeft === 1 && (
                                    <span className="text-[11px] font-black text-rose-400 animate-pulse bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                                        ⚠️ آخر فرصة!
                                    </span>
                                )}
                            </div>

                            {/* Guesses Log */}
                            {chatGuesses.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto py-1">
                                    {chatGuesses.map((g, i) => (
                                        <div
                                            key={i}
                                            className={`text-xs px-3 py-1 rounded-full border shrink-0 ${g.isCorrect ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}
                                        >
                                            {g.sender}: {g.text}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Guess input */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={guessInput}
                                    onChange={(e) => setGuessInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleGuessSubmit()}
                                    placeholder={guessAttemptsLeft > 0 ? "اكتب تخمينك هنا..." : "انتهت المحاولات"}
                                    disabled={guessAttemptsLeft <= 0}
                                    className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-4 py-2.5 text-white text-sm outline-none focus:border-amber-400 focus:bg-white/15 transition-all disabled:opacity-50"
                                />
                                <button
                                    onClick={handleGuessSubmit}
                                    disabled={guessAttemptsLeft <= 0}
                                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Send size={15} /> تخمين
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Round Over Banner */}
            {gameState === 'round_over' && (
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="glass-card max-w-sm w-full p-6 rounded-3xl border-2 border-white/15 text-center shadow-2xl animate-pop-in">
                        <span className="text-4xl mb-3 block">🔔</span>
                        <h2 className="text-lg font-black text-white mb-4">{roundMsg}</h2>
                        <div className="glass-card p-3 rounded-2xl border border-white/10 text-xs text-amber-300 font-bold">
                            النتيجة الحالية: {myScore} – {oppScore}
                        </div>
                    </div>
                </div>
            )}

            {/* Game Over Modal */}
            {gameState === 'gameover' && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="glass-card max-w-sm w-full p-6 rounded-3xl border-2 border-white/15 text-center shadow-2xl">
                        <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center shadow-lg
                            ${winner === 'me' ? 'bg-emerald-500 text-white shadow-emerald-500/30' : winner === 'opp' ? 'bg-rose-500 text-white shadow-rose-500/30' : 'bg-amber-500 text-white shadow-amber-500/30'}`}
                        >
                            <Trophy size={36} />
                        </div>

                        <h2 className="text-xl font-black text-white mb-2">
                            {winner === 'me' ? '🎉 فنان ذكي وفوز مستحق!' : winner === 'opp' ? 'حظ أوفر في المباراة القادمة' : '🤝 تعادل رائع!'}
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
