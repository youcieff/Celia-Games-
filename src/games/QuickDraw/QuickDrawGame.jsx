import React, { useState, useRef, useEffect, useCallback } from 'react';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import PlayerGameHeader from '../../components/PlayerGameHeader';
import ConnectionPauseOverlay from '../../components/ConnectionPauseOverlay';
import EmotesOverlay from '../../components/EmotesOverlay';
import Logo from '../../components/Logo';
import { IconQuickDraw } from '../../components/icons/GameIcons';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Eraser from 'lucide-react/dist/esm/icons/eraser';
import Undo2 from 'lucide-react/dist/esm/icons/undo-2';
import Send from 'lucide-react/dist/esm/icons/send';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import HelpCircle from 'lucide-react/dist/esm/icons/help-circle';
import Paintbrush from 'lucide-react/dist/esm/icons/paintbrush';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Droplets from 'lucide-react/dist/esm/icons/droplets';
import { playSound, playHaptic } from '../../lib/audioEngine';
import useProfile from '../../hooks/useProfile';
import { triggerVictoryEffects, triggerDefeatEffects } from '../../lib/effectsEngine';

const DRAW_TIME_SEC = 60;
const GUESS_TIME_SEC = 60;
const WIN_SCORE = 5;
const CANVAS_W = 800;
const CANVAS_H = 800;

// ── 50+ Premium Colors ────────────────────────────────────────────────────────
const COLOR_PALETTE = [
    // Row 1: Neutrals
    ['#ffffff', '#e2e8f0', '#94a3b8', '#64748b', '#334155', '#1e293b', '#0f172a', '#000000'],
    // Row 2: Warm
    ['#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e'],
    // Row 3: Reds/Pinks
    ['#fee2e2', '#fca5a5', '#f87171', '#f43f5e', '#e11d48', '#be123c', '#ec4899', '#db2777'],
    // Row 4: Greens
    ['#d1fae5', '#6ee7b7', '#34d399', '#10b981', '#22c55e', '#16a34a', '#15803d', '#166534'],
    // Row 5: Blues/Cyans
    ['#dbeafe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#06b6d4', '#0891b2', '#0e7490'],
    // Row 6: Purples/Indigo
    ['#ede9fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#4f46e5', '#4338ca'],
    // Row 7: Neons
    ['#f0fdf4', '#bbf7d0', '#86efac', '#4ade80', '#facc15', '#fb923c', '#f97316', '#ef4444'],
];

const SIZES = [
    { label: 'S',  px: 4 },
    { label: 'M',  px: 10 },
    { label: 'L',  px: 20 },
    { label: 'XL', px: 35 },
    { label: '2X', px: 50 },
];

// ── Tools ──────────────────────────────────────────────────────────────────────
const TOOL_PEN    = 'pen';
const TOOL_ERASER = 'eraser';
const TOOL_FILL   = 'fill';

function normalizeArabic(text) {
    if (!text) return '';
    return text
        .trim()
        .toLowerCase()
        .replace(/[\u064B-\u065F\u0670]/g, '')
        .replace(/[إأآا]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[^\w\u0600-\u06FF]/g, '')
        .replace(/\s+/g, '');
}

// ── Flood Fill ─────────────────────────────────────────────────────────────────
function hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return [r,g,b,255];
}
function floodFill(ctx, startX, startY, fillColor) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const idx = (startY * w + startX) * 4;
    const target = [data[idx], data[idx+1], data[idx+2], data[idx+3]];
    const fill = hexToRgb(fillColor);
    if (target.every((v,i) => v === fill[i])) return;
    const stack = [[startX, startY]];
    const visited = new Uint8Array(w * h);
    while (stack.length) {
        const [cx, cy] = stack.pop();
        if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
        const si = cy * w + cx;
        if (visited[si]) continue;
        const pi = si * 4;
        if (data[pi]!==target[0]||data[pi+1]!==target[1]||data[pi+2]!==target[2]||data[pi+3]!==target[3]) continue;
        visited[si] = 1;
        data[pi]=fill[0]; data[pi+1]=fill[1]; data[pi+2]=fill[2]; data[pi+3]=fill[3];
        stack.push([cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]);
    }
    ctx.putImageData(imageData, 0, 0);
}

export default function QuickDrawGame({ setView }) {
    const connRef = useRef(null);
    const isHostRef = useRef(false);
    const [myProfile, , awardMatchResult] = useProfile();
    const [oppProfile, setOppProfile] = useState(null);

    const [gameState, setGameState] = useState('lobby');
    const [myScore, setMyScore] = useState(0);
    const [oppScore, setOppScore] = useState(0);
    const [round, setRound] = useState(0);
    const [firstDrawerRole, setFirstDrawerRole] = useState('me');
    const firstDrawerRoleRef = useRef('me');
    const [isDrawer, setIsDrawer] = useState(false);
    const [currentWord, setCurrentWord] = useState(null);
    const [timeLeft, setTimeLeft] = useState(DRAW_TIME_SEC);
    const [guessInput, setGuessInput] = useState('');
    const [roundMsg, setRoundMsg] = useState('');
    const [winner, setWinner] = useState(null);
    const [chatGuesses, setChatGuesses] = useState([]);
    const [guessAttemptsLeft, setGuessAttemptsLeft] = useState(3);
    const guessAttemptsRef = useRef(3);
    const [customWordInput, setCustomWordInput] = useState('');
    const [receivedImageUrl, setReceivedImageUrl] = useState(null);

    // Drawing tools state
    const [activeTool, setActiveTool] = useState(TOOL_PEN);
    const [brushColor, setBrushColor] = useState('#1e293b');
    const [brushSizeIdx, setBrushSizeIdx] = useState(2); // default M=10px
    const [recentColors, setRecentColors] = useState(['#1e293b','#f43f5e','#3b82f6','#22c55e','#fbbf24']);
    const [showCustomColor, setShowCustomColor] = useState(false);

    const canvasRef = useRef(null);
    const isDrawing = useRef(false);
    const lastPos = useRef(null);
    const timerRef = useRef(null);
    const myScoreRef = useRef(0);
    const oppScoreRef = useRef(0);
    const roundRef = useRef(0);
    const currentWordRef = useRef(null);
    const onDataRef = useRef(null);
    const canvasHistoryRef = useRef([]);
    const activeToolRef = useRef(TOOL_PEN);
    const brushColorRef = useRef('#1e293b');
    const brushSizeIdxRef = useRef(2);

    // Keep refs in sync
    useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);
    useEffect(() => { brushColorRef.current = brushColor; }, [brushColor]);
    useEffect(() => { brushSizeIdxRef.current = brushSizeIdx; }, [brushSizeIdx]);

    // ── Canvas Init ────────────────────────────────────────────────────────────
    const initCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        canvasHistoryRef.current = [];
    }, []);

    useEffect(() => {
        if (gameState === 'drawing') {
            initCanvas();
        }
    }, [gameState, initCanvas]);

    // ── Save history snapshot ─────────────────────────────────────────────────
    const saveSnapshot = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
        canvasHistoryRef.current.push(snap);
        if (canvasHistoryRef.current.length > 20) canvasHistoryRef.current.shift();
    }, []);

    // ── Game Handlers ─────────────────────────────────────────────────────────
    const handleGameStart = (conn, hostMode, oppProf) => {
        isHostRef.current = hostMode;
        connRef.current = conn;
        if (oppProf) setOppProfile(oppProf);
        conn.on('data', (msg) => { if (onDataRef.current) onDataRef.current(msg); });
        if (hostMode) setGameState('role_select');
        else setGameState('role_select');
    };

    const chooseFirstDrawer = (choice) => {
        setFirstDrawerRole(choice);
        firstDrawerRoleRef.current = choice;
        const peerRole = choice === 'me' ? 'opp' : 'me';
        connRef.current?.send({ type: 'init_roles', firstDrawerRole: peerRole });
        startRound(0, choice);
    };

    const startRound = (roundIdx, firstRole) => {
        const role = firstRole !== undefined ? firstRole : firstDrawerRoleRef.current;
        const imDrawer = roundIdx % 2 === 0 ? (role === 'me') : (role === 'opp');
        roundRef.current = roundIdx;
        setRound(roundIdx);
        setIsDrawer(imDrawer);
        setGuessInput('');
        setChatGuesses([]);
        setGuessAttemptsLeft(3);
        guessAttemptsRef.current = 3;
        setCustomWordInput('');
        setReceivedImageUrl(null);
        setActiveTool(TOOL_PEN);
        canvasHistoryRef.current = [];

        if (imDrawer) {
            setCurrentWord(null);
            currentWordRef.current = null;
            setTimeLeft(DRAW_TIME_SEC);
            setGameState('word_choice');
        } else {
            setCurrentWord(null);
            currentWordRef.current = null;
            setTimeLeft(DRAW_TIME_SEC);
            setGameState('waiting_for_drawing');
            if (connRef.current?.isAI) connRef.current.send({ type: 'ai_start_drawing' });
        }
    };

    const startDrawTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) { clearInterval(timerRef.current); handleSendDrawing(); return 0; }
                if (prev <= 5) { playSound('tick'); playHaptic(10); }
                return prev - 1;
            });
        }, 1000);
    };

    const startGuessTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) { clearInterval(timerRef.current); handleGuessTimeUp(); return 0; }
                if (prev <= 5) { playSound('tick'); playHaptic(10); }
                return prev - 1;
            });
        }, 1000);
    };

    const handleGuessTimeUp = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        connRef.current?.send({ type: 'time_up_sync' });
        showRoundOver(`انتهى الوقت! الكلمة كانت: "${currentWordRef.current?.word || ''}"`);
    };

    const handleWordChoice = (wordObj) => {
        setCurrentWord(wordObj);
        currentWordRef.current = wordObj;
        setTimeLeft(DRAW_TIME_SEC);
        setGameState('drawing');
        connRef.current?.send({ type: 'drawer_started', wordLength: wordObj.word.length, category: wordObj.category });
        startDrawTimer();
        playSound('ding');
    };

    const handleSendDrawing = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        const canvas = canvasRef.current;
        if (!canvas) return;
        // Flatten to white background for JPEG
        const tmp = document.createElement('canvas');
        tmp.width = canvas.width; tmp.height = canvas.height;
        const tCtx = tmp.getContext('2d');
        tCtx.fillStyle = '#ffffff';
        tCtx.fillRect(0, 0, tmp.width, tmp.height);
        tCtx.drawImage(canvas, 0, 0);
        const imageData = tmp.toDataURL('image/jpeg', 0.75);
        const word = currentWordRef.current;
        connRef.current?.send({ type: 'drawing_sent', imageData, word: word?.word, wordLength: word?.word?.length, category: word?.category });
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
                    showRoundOver(`انتهى وقت التخمين! الكلمة كانت: "${currentWordRef.current?.word || ''}" (0 نقطة)`);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // ── Immediate win check after every score change ───────────────────────────
    const checkWinImmediate = (myNew, oppNew) => {
        if (myNew >= WIN_SCORE || oppNew >= WIN_SCORE) {
            if (myNew !== oppNew) {
                const w = myNew > oppNew ? 'me' : 'opp';
                setWinner(w);
                if (timerRef.current) clearInterval(timerRef.current);
                setGameState('gameover');
                if (w === 'me') { awardMatchResult(true); playSound('win'); triggerVictoryEffects(); if (window.navigator.vibrate) window.navigator.vibrate([100,50,100,50,200]); }
                else { awardMatchResult(false); playSound('lose'); triggerDefeatEffects(); }
                return true;
            }
        }
        return false;
    };

    const onData = useCallback((msg) => {
        if (!msg || !msg.type) return;
        switch (msg.type) {
            case 'init_roles': {
                setFirstDrawerRole(msg.firstDrawerRole);
                firstDrawerRoleRef.current = msg.firstDrawerRole;
                startRound(0, msg.firstDrawerRole);
                break;
            }
            case 'drawer_started': {
                setCurrentWord({ hint: `${msg.category} — ${msg.wordLength} حروف`, category: msg.category, wordLength: msg.wordLength });
                break;
            }
            case 'drawing_sent': {
                setIsDrawer(false);
                setCurrentWord({ word: msg.word, category: msg.category, wordLength: msg.wordLength, hint: `${msg.category} — ${msg.wordLength} حروف` });
                currentWordRef.current = { word: msg.word, category: msg.category };
                setReceivedImageUrl(msg.imageData || null);
                setTimeLeft(GUESS_TIME_SEC);
                setGameState('guessing');
                startGuessTimer();
                playSound('ding');
                break;
            }
            case 'chat_guess': {
                setChatGuesses(prev => [...prev.slice(-4), { sender: oppProfile?.nickname || 'الخصم', text: msg.guess, isCorrect: msg.isCorrect }]);
                playSound(msg.isCorrect ? 'win' : 'tap');
                break;
            }
            case 'correct_guess': {
                if (timerRef.current) clearInterval(timerRef.current);
                const pts = msg.pts || 1;
                const newOpp = oppScoreRef.current + pts;
                oppScoreRef.current = newOpp;
                setOppScore(newOpp);
                playSound('win');
                playHaptic(50);
                if (!checkWinImmediate(myScoreRef.current, newOpp)) {
                    showRoundOver(`الخصم خمّن الكلمة بنجاح! +${pts} نقطة`);
                }
                break;
            }
            case 'time_up_sync': {
                if (timerRef.current) clearInterval(timerRef.current);
                showRoundOver(`انتهى وقت التخمين! الكلمة كانت: "${currentWordRef.current?.word || ''}" (0 نقطة)`);
                break;
            }
            case 'guesser_out_of_attempts': {
                if (timerRef.current) clearInterval(timerRef.current);
                showRoundOver(`❌ الخصم نفدت محاولاته! الكلمة كانت: "${msg.word || ''}" (0 نقطة)`);
                break;
            }
            case 'next_round': { startRound(msg.roundIdx); break; }
            case 'rematch': {
                myScoreRef.current = 0; oppScoreRef.current = 0;
                setMyScore(0); setOppScore(0);
                setGameState('role_select');
                break;
            }
            default: break;
        }
    }, [oppProfile]);

    onDataRef.current = onData;

    // ── Guess Submit ──────────────────────────────────────────────────────────
    const handleGuessSubmit = () => {
        if (!guessInput.trim() || !currentWordRef.current || gameState !== 'guessing') return;
        if (guessAttemptsRef.current <= 0) return;

        const rawGuess = guessInput.trim();
        const isCorrect = Boolean(normalizeArabic(currentWordRef.current?.word) === normalizeArabic(rawGuess));

        setChatGuesses(prev => [...prev.slice(-4), { sender: 'أنت', text: rawGuess, isCorrect }]);
        connRef.current?.send({ type: 'chat_guess', guess: rawGuess, isCorrect });

        if (isCorrect) {
            if (timerRef.current) clearInterval(timerRef.current);
            playSound('win'); playHaptic(50);
            const newMy = myScoreRef.current + 1;
            myScoreRef.current = newMy;
            setMyScore(newMy);
            connRef.current?.send({ type: 'correct_guess', pts: 1 });
            if (!checkWinImmediate(newMy, oppScoreRef.current)) {
                showRoundOver(`🎉 تخمين صحيح! "${currentWordRef.current?.word}" ✅ (+1 نقطة)`);
            }
        } else {
            playSound('lose'); playHaptic(20);
            const newAttempts = guessAttemptsRef.current - 1;
            guessAttemptsRef.current = newAttempts;
            setGuessAttemptsLeft(newAttempts);
            if (newAttempts <= 0) {
                if (timerRef.current) clearInterval(timerRef.current);
                connRef.current?.send({ type: 'guesser_out_of_attempts', word: currentWordRef.current?.word });
                showRoundOver(`❌ نفدت المحاولات! الكلمة كانت: "${currentWordRef.current?.word}" (0 نقطة)`);
            }
        }
        setGuessInput('');
    };

    // ── Round Over ────────────────────────────────────────────────────────────
    const showRoundOver = (msg) => {
        setRoundMsg(msg);
        setGameState('round_over');
        setTimeout(() => {
            const nextTurn = roundRef.current + 1;
            if (isHostRef.current) connRef.current?.send({ type: 'next_round', roundIdx: nextTurn });
            startRound(nextTurn);
        }, 3000);
    };

    // ── Canvas Drawing ────────────────────────────────────────────────────────
    const getPos = (e, canvas) => {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches ? e.touches[0] : e;
        return {
            x: (touch.clientX - rect.left) * (canvas.width / rect.width),
            y: (touch.clientY - rect.top) * (canvas.height / rect.height)
        };
    };

    const pickColor = useCallback((color) => {
        setBrushColor(color);
        brushColorRef.current = color;
        setActiveTool(TOOL_PEN);
        activeToolRef.current = TOOL_PEN;
        setRecentColors(prev => {
            const filtered = prev.filter(c => c !== color);
            return [color, ...filtered].slice(0, 5);
        });
    }, []);

    const startDraw = useCallback((e) => {
        if (!isDrawer || gameState !== 'drawing') return;
        e.preventDefault();
        const canvas = canvasRef.current;
        const pos = getPos(e, canvas);

        if (activeToolRef.current === TOOL_FILL) {
            const ctx = canvas.getContext('2d');
            saveSnapshot();
            floodFill(ctx, Math.round(pos.x), Math.round(pos.y), brushColorRef.current);
            return;
        }

        isDrawing.current = true;
        lastPos.current = pos;

        // Draw a dot at touch point
        const ctx = canvas.getContext('2d');
        const size = SIZES[brushSizeIdxRef.current].px;
        if (activeToolRef.current === TOOL_ERASER) {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, size / 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,1)';
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, size / 2, 0, Math.PI * 2);
            ctx.fillStyle = brushColorRef.current;
            ctx.fill();
        }
    }, [isDrawer, gameState, saveSnapshot]);

    const doDraw = useCallback((e) => {
        if (!isDrawing.current || !isDrawer || gameState !== 'drawing') return;
        e.preventDefault();
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const pos = getPos(e, canvas);
        const from = lastPos.current;
        if (!from) { lastPos.current = pos; return; }

        const size = SIZES[brushSizeIdxRef.current].px;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = size;

        if (activeToolRef.current === TOOL_ERASER) {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = brushColorRef.current;
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        }

        lastPos.current = pos;
    }, [isDrawer, gameState]);

    const endDraw = useCallback(() => {
        if (isDrawing.current) {
            saveSnapshot();
        }
        isDrawing.current = false;
        lastPos.current = null;
    }, [saveSnapshot]);

    const handleUndo = () => {
        const canvas = canvasRef.current;
        if (!canvas || canvasHistoryRef.current.length === 0) return;
        canvasHistoryRef.current.pop();
        const ctx = canvas.getContext('2d');
        if (canvasHistoryRef.current.length > 0) {
            ctx.putImageData(canvasHistoryRef.current[canvasHistoryRef.current.length - 1], 0, 0);
        } else {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        playSound('pop');
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        saveSnapshot();
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        playSound('tick');
    };

    const handleRematch = () => {
        connRef.current?.send({ type: 'rematch' });
        myScoreRef.current = 0; oppScoreRef.current = 0;
        setMyScore(0); setOppScore(0);
        setReceivedImageUrl(null);
        setActiveTool(TOOL_PEN);
        canvasHistoryRef.current = [];
        setGameState('role_select');
    };

    // ── Lobby ─────────────────────────────────────────────────────────────────
    if (gameState === 'lobby') {
        return (
            <>
                <div className="animated-bg"><div className="bg-orb-1" /><div className="bg-orb-2" /></div>
                <div className="min-h-dvh max-w-lg mx-auto px-4 flex flex-col safe-area-pt overflow-x-hidden overflow-y-auto pb-6">
                    <div className="grid grid-cols-3 items-center py-4 mb-2">
                        <div><Logo size="small" /></div>
                        <div className="flex justify-center">
                            <div className="flex items-center gap-2 glass-card px-3.5 py-1.5 rounded-2xl border border-white/10 shrink-0">
                                <IconQuickDraw size={18} className="text-[var(--accent)]" />
                                <span className="text-xs font-black gradient-text">الرسم السريع</span>
                            </div>
                        </div>
                        <div className="flex justify-end"><button onClick={() => { connRef.current?.close?.(); setView('hub'); }} className="glass-card px-4 py-2 rounded-2xl text-xs font-bold hover:scale-105 active:scale-95 transition-transform text-white/90">الرئيسية</button></div>
                    </div>
                    <div className="text-center mb-6">
                        <div className="text-5xl mb-3">🎨</div>
                        <h1 className="text-3xl font-black text-white mb-1">الرسم السريع</h1>
                        <p className="text-sm text-slate-400">ارسم والخصم يخمّن — أول لاعب يوصل {WIN_SCORE} نقاط يكسب!</p>
                    </div>
                    <P2PConnectionManager onGameStart={handleGameStart} gameName="quickdraw" />
                </div>
            </>
        );
    }

    // ── Role Select (Host only) ────────────────────────────────────────────────
    if (gameState === 'role_select') {
        return (
            <div className="min-h-dvh max-w-lg mx-auto px-4 flex flex-col items-center justify-center gap-6 safe-area-pt">
                <div className="animated-bg"><div className="bg-orb-1" /><div className="bg-orb-2" /></div>
                {isHostRef.current ? (
                    <div className="glass-card p-8 rounded-3xl border border-white/15 text-center max-w-sm w-full">
                        <div className="text-4xl mb-4">🎲</div>
                        <h2 className="text-xl font-black text-white mb-2">من يبدأ الرسم؟</h2>
                        <p className="text-xs text-slate-400 mb-6">اختر من سيكون الرسام في الجولة الأولى</p>
                        <div className="flex gap-3">
                            <button onClick={() => chooseFirstDrawer('me')} className="flex-1 py-4 bg-gradient-to-br from-amber-500 to-orange-600 text-slate-900 font-black rounded-2xl text-sm shadow-lg active:scale-95 transition-transform">أنا أرسم أولاً 🖊️</button>
                            <button onClick={() => chooseFirstDrawer('opp')} className="flex-1 py-4 bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black rounded-2xl text-sm shadow-lg active:scale-95 transition-transform">الخصم يرسم أولاً 🎯</button>
                        </div>
                    </div>
                ) : (
                    <div className="glass-card p-8 rounded-3xl border border-white/15 text-center max-w-sm w-full">
                        <div className="text-4xl mb-4 animate-spin-slow">⏳</div>
                        <h2 className="text-xl font-black text-white mb-2">بانتظار المضيف...</h2>
                        <p className="text-xs text-slate-400">المضيف يختار من يبدأ الرسم</p>
                    </div>
                )}
            </div>
        );
    }

    // ── Main Game UI ──────────────────────────────────────────────────────────
    return (
        <div className="min-h-dvh max-w-lg mx-auto flex flex-col safe-area-pt overflow-hidden">
            <div className="animated-bg"><div className="bg-orb-1" /><div className="bg-orb-2" /></div>

            <PlayerGameHeader
                myProfile={myProfile}
                oppProfile={oppProfile}
                myScore={myScore}
                oppScore={oppScore}
                statusText={`الهدف: ${WIN_SCORE} نقاط | جولة ${Math.floor(round / 2) + 1}`}
                onLeave={() => { connRef.current?.close?.(); setView('hub'); }}
            />

            {/* Word Choice */}
            {gameState === 'word_choice' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6">
                    <div className="glass-card p-8 rounded-3xl border border-amber-500/30 max-w-sm w-full text-center">
                        <div className="text-4xl mb-4">✏️</div>
                        <h2 className="text-lg font-black text-white mb-1">دورك في الرسم!</h2>
                        <p className="text-xs text-slate-300 mb-5">اكتب الكلمة التي تريد رسمها:</p>
                        <input
                            type="text"
                            value={customWordInput}
                            onChange={e => setCustomWordInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && customWordInput.trim() && handleWordChoice({ word: customWordInput.trim(), category: 'مخصص' })}
                            placeholder="مثال: تفاحة، شجرة، قطة..."
                            dir="rtl"
                            maxLength={25}
                            autoFocus
                            className="w-full bg-white/5 border border-white/20 p-4 rounded-2xl text-center font-black text-xl text-white outline-none focus:border-amber-400 focus:bg-white/10 transition-all mb-3"
                        />
                        {customWordInput.trim().length > 0 && (
                            <p className="text-xs text-amber-300 font-bold mb-3">{customWordInput.trim().length} حرف</p>
                        )}
                        <button
                            onClick={() => { const w = customWordInput.trim(); if (w) handleWordChoice({ word: w, category: 'مخصص' }); }}
                            disabled={!customWordInput.trim()}
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 font-black text-lg transition-transform active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-lg"
                        >
                            ابدأ الرسم 🖊️
                        </button>
                    </div>
                </div>
            )}

            {/* Waiting for drawing */}
            {gameState === 'waiting_for_drawing' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-24 h-24 rounded-full glass-card border-2 border-amber-500/40 flex items-center justify-center text-5xl mb-5 animate-bounce">🎨</div>
                    <h2 className="text-xl font-black text-white mb-2">الخصم يرسم الآن...</h2>
                    <p className="text-xs text-slate-400 max-w-xs">سيتم إرسال الرسمة إليك فور إنهائها لتبدأ دقيقة التخمين!</p>
                    {currentWord?.hint && (
                        <div className="mt-4 glass-card px-4 py-2 rounded-xl text-xs font-black text-amber-300 border border-amber-500/30">
                            تلميح: {currentWord.hint}
                        </div>
                    )}
                </div>
            )}

            {/* Drawer waiting for guess */}
            {gameState === 'waiting_for_guess' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-24 h-24 rounded-full glass-card border-2 border-emerald-500/40 flex items-center justify-center text-5xl mb-5 animate-pulse">🚀</div>
                    <h2 className="text-xl font-black text-white mb-2">تم إرسال الرسمة!</h2>
                    <p className="text-xs text-slate-400 max-w-xs mb-4">الخصم يشاهد رسمتك ويحاول تخمين الكلمة...</p>
                    <div className={`text-sm font-mono font-black px-5 py-2 rounded-full border mb-5 ${timeLeft <= 10 ? 'text-rose-400 border-rose-500/40 bg-rose-500/10 animate-pulse' : 'text-amber-400 border-amber-500/40 bg-amber-500/10'}`}>
                        ⏱️ {timeLeft} ثانية
                    </div>
                    <div className="w-full max-w-sm glass-card p-3 rounded-2xl border border-white/10 flex flex-col gap-2">
                        <span className="text-xs font-bold text-slate-400">تخمينات الخصم:</span>
                        {chatGuesses.length === 0 ? (
                            <span className="text-xs text-slate-500 py-2">بانتظار تخمين الخصم...</span>
                        ) : chatGuesses.map((g, i) => (
                            <div key={i} className={`text-xs px-3 py-1.5 rounded-lg flex items-center justify-between ${g.isCorrect ? 'bg-emerald-500/20 text-emerald-300 font-black' : 'bg-rose-500/10 text-rose-300'}`}>
                                <span>{g.text}</span>
                                <span>{g.isCorrect ? '✅ صحيح (+1)' : '❌'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Drawing / Guessing View ──────────────────────────────────────── */}
            {(gameState === 'drawing' || gameState === 'guessing') && (
                <div className="flex-1 flex flex-col p-2 gap-2 overflow-hidden">

                    {/* Top Bar */}
                    <div className="flex items-center justify-between glass-card px-3 py-2 rounded-2xl border border-white/10 shrink-0">
                        {isDrawer ? (
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400">ارسم:</span>
                                <span className="text-xs font-black text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">{currentWord?.word}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <HelpCircle size={14} className="text-sky-400" />
                                <span className="text-xs font-bold text-slate-300">{currentWord?.hint || 'خمّن الرسمة!'}</span>
                            </div>
                        )}
                        <div className={`text-xs font-mono font-black px-3 py-1 rounded-full border ${timeLeft <= 10 ? 'text-rose-400 border-rose-500/40 bg-rose-500/10 animate-pulse' : 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'}`}>
                            ⏱️ {timeLeft}s
                        </div>
                    </div>

                    {/* Canvas Container */}
                    <div className="flex-1 min-h-0 w-full flex items-center justify-center">
                        <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-white shrink-0"
                             style={{ maxWidth: 'min(100%, 62vh)' }}>
                            {isDrawer ? (
                                <canvas
                                    ref={canvasRef}
                                    width={CANVAS_W}
                                    height={CANVAS_H}
                                    className={`w-full h-full block touch-none ${activeTool === TOOL_FILL ? 'cursor-cell' : activeTool === TOOL_ERASER ? 'cursor-grab' : 'cursor-crosshair'}`}
                                    style={{ background: 'white' }}
                                    onMouseDown={startDraw}
                                    onMouseMove={doDraw}
                                    onMouseUp={endDraw}
                                    onMouseLeave={endDraw}
                                    onTouchStart={startDraw}
                                    onTouchMove={doDraw}
                                    onTouchEnd={endDraw}
                                />
                            ) : receivedImageUrl ? (
                                <img src={receivedImageUrl} alt="الرسمة" className="w-full h-full object-cover bg-white" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-400 bg-white">
                                    <span className="text-4xl animate-pulse">🎨</span>
                                    <span className="text-sm font-bold">جاري إرسال الرسمة...</span>
                                </div>
                            )}

                            {/* Active tool indicator badge */}
                            {isDrawer && (
                                <div className="absolute top-2 right-2 pointer-events-none">
                                    <div className="glass-card px-2 py-1 rounded-lg text-[10px] font-black border border-slate-200/50 shadow-md bg-white/80 backdrop-blur-md"
                                         style={{ color: activeTool === TOOL_PEN ? brushColor : activeTool === TOOL_ERASER ? '#3b82f6' : '#16a34a' }}>
                                        {activeTool === TOOL_PEN ? '🖊 قلم' : activeTool === TOOL_ERASER ? '⬜ ممحاة' : '🪣 تعبئة'} | {SIZES[brushSizeIdx].px}px
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── DRAWER TOOLS PALETTE ────────────────────────────────────── */}
                    {isDrawer && (
                        <div className="flex flex-col gap-2 shrink-0">

                            {/* Row 1: Recent Colors + Custom Picker */}
                            <div className="glass-card px-3 py-2 rounded-xl border border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
                                    <span className="text-[10px] font-black text-slate-400 shrink-0 uppercase">آخر الألوان</span>
                                    {recentColors.map((c, i) => (
                                        <button key={i} onClick={() => pickColor(c)}
                                            style={{ backgroundColor: c }}
                                            className={`w-6 h-6 rounded-full border-2 transition-all shrink-0 ${brushColor === c && activeTool === TOOL_PEN ? 'scale-125 border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]' : 'border-white/30 hover:scale-110'}`}
                                        />
                                    ))}
                                </div>
                                <div className="w-px h-5 bg-white/10 mx-2 shrink-0" />
                                {/* Custom color picker */}
                                <label className="relative w-8 h-8 rounded-full border-2 border-dashed border-white/40 hover:border-amber-400 cursor-pointer overflow-hidden flex items-center justify-center shrink-0 transition-all hover:scale-110 bg-white/5">
                                    <span className="text-base drop-shadow-md">🎨</span>
                                    <input type="color" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                        onChange={e => pickColor(e.target.value)} />
                                </label>
                            </div>

                            {/* Row 2: Full Color Palette Grid (Scrollable) */}
                            <div className="glass-card p-2 rounded-xl border border-white/10 max-h-[110px] overflow-y-auto custom-scrollbar">
                                {COLOR_PALETTE.map((row, ri) => (
                                    <div key={ri} className="flex gap-1 mb-1 last:mb-0">
                                        {row.map(c => (
                                            <button key={c} onClick={() => pickColor(c)}
                                                style={{ backgroundColor: c }}
                                                className={`flex-1 h-6 rounded-md border transition-all ${brushColor === c && activeTool === TOOL_PEN ? 'border-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)] z-10' : 'border-white/10 hover:border-white/40 opacity-90 hover:opacity-100'}`}
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>

                            {/* Row 3: Tools & Actions (Icons only on mobile) */}
                            <div className="flex items-center justify-between glass-card px-2 py-2 rounded-xl border border-white/10 w-full overflow-hidden">
                                {/* Tool buttons */}
                                <div className="flex gap-1">
                                    <button onClick={() => { setActiveTool(TOOL_PEN); activeToolRef.current = TOOL_PEN; }}
                                        className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${activeTool === TOOL_PEN ? 'bg-amber-500/30 border border-amber-400 text-amber-300 shadow-md' : 'border border-transparent text-slate-400 hover:bg-white/5'}`}>
                                        <Paintbrush size={16} /> <span className="hidden sm:inline">قلم</span>
                                    </button>
                                    <button onClick={() => { setActiveTool(TOOL_ERASER); activeToolRef.current = TOOL_ERASER; }}
                                        className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${activeTool === TOOL_ERASER ? 'bg-sky-500/30 border border-sky-400 text-sky-300 shadow-md' : 'border border-transparent text-slate-400 hover:bg-white/5'}`}>
                                        <Eraser size={16} /> <span className="hidden sm:inline">ممحاة</span>
                                    </button>
                                    <button onClick={() => { setActiveTool(TOOL_FILL); activeToolRef.current = TOOL_FILL; }}
                                        className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${activeTool === TOOL_FILL ? 'bg-emerald-500/30 border border-emerald-400 text-emerald-300 shadow-md' : 'border border-transparent text-slate-400 hover:bg-white/5'}`}>
                                        <Droplets size={16} /> <span className="hidden sm:inline">تعبئة</span>
                                    </button>
                                </div>

                                <div className="w-px h-6 bg-white/10 shrink-0" />

                                {/* Undo / Clear */}
                                <div className="flex gap-1">
                                    <button onClick={handleUndo} className="p-2 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-300 hover:bg-white/5 transition-all" title="تراجع">
                                        <Undo2 size={18} />
                                    </button>
                                    <button onClick={clearCanvas} className="p-2 rounded-lg flex items-center justify-center text-rose-400 hover:bg-rose-500/20 transition-all" title="مسح الكل">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Row 4: Size selector & Send Button */}
                            <div className="flex items-center gap-2">
                                <div className="flex-1 flex items-center justify-around glass-card px-2 py-2 rounded-xl border border-white/10">
                                    {SIZES.map((s, idx) => (
                                        <button key={idx} onClick={() => { setBrushSizeIdx(idx); brushSizeIdxRef.current = idx; }}
                                            className={`flex items-center justify-center rounded-full transition-all flex-shrink-0 ${brushSizeIdx === idx ? 'bg-white/20 border border-white/50 shadow-inner' : 'border border-transparent hover:bg-white/10'}`}
                                            style={{ width: 34, height: 34 }}>
                                            <span className="rounded-full block bg-white" style={{ width: Math.max(3, s.px * 0.45), height: Math.max(3, s.px * 0.45), maxWidth: 24, maxHeight: 24 }} />
                                        </button>
                                    ))}
                                </div>
                                <button onClick={handleSendDrawing}
                                    className="px-6 py-3 h-[50px] bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm rounded-xl shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shrink-0">
                                    <Send size={18} /> <span className="hidden sm:inline">إرسال</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── GUESSER UI ─────────────────────────────────────────────── */}
                    {!isDrawer && gameState === 'guessing' && (
                        <div className="flex flex-col gap-2 shrink-0">
                            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-300">المحاولات:</span>
                                    {[1,2,3].map(n => (
                                        <span key={n} className={`w-3.5 h-3.5 rounded-full transition-all ${n <= guessAttemptsLeft ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]' : 'bg-white/10 scale-75 opacity-40'}`} />
                                    ))}
                                    <span className="text-xs font-black text-amber-300">({guessAttemptsLeft}/3)</span>
                                </div>
                                {guessAttemptsLeft === 1 && <span className="text-[11px] font-black text-rose-400 animate-pulse bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">⚠️ آخر فرصة!</span>}
                            </div>

                            {chatGuesses.length > 0 && (
                                <div className="flex gap-1.5 overflow-x-auto py-0.5">
                                    {chatGuesses.map((g, i) => (
                                        <div key={i} className={`text-xs px-3 py-1 rounded-full border shrink-0 ${g.isCorrect ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
                                            {g.text}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <input type="text" value={guessInput}
                                    onChange={e => setGuessInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleGuessSubmit()}
                                    placeholder={guessAttemptsLeft > 0 ? 'اكتب تخمينك هنا...' : 'انتهت المحاولات'}
                                    disabled={guessAttemptsLeft <= 0}
                                    dir="rtl"
                                    autoFocus
                                    className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-4 py-2.5 text-white text-sm outline-none focus:border-amber-400 focus:bg-white/15 transition-all disabled:opacity-50"
                                />
                                <button onClick={handleGuessSubmit} disabled={guessAttemptsLeft <= 0 || !guessInput.trim()}
                                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center gap-1.5">
                                    <Send size={14} /> تخمين
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Round Over */}
            {gameState === 'round_over' && (
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="glass-card max-w-sm w-full p-6 rounded-3xl border-2 border-white/15 text-center shadow-2xl animate-pop-in">
                        <span className="text-4xl mb-3 block">🔔</span>
                        <h2 className="text-lg font-black text-white mb-4">{roundMsg}</h2>
                        <div className="glass-card p-3 rounded-2xl border border-white/10 text-xs text-amber-300 font-bold">
                            النتيجة: {myScore} – {oppScore}
                        </div>
                    </div>
                </div>
            )}

            {/* Game Over */}
            {gameState === 'gameover' && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="glass-card max-w-sm w-full p-8 rounded-3xl border-2 border-white/15 text-center shadow-2xl">
                        <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center shadow-lg ${winner === 'me' ? 'bg-emerald-500 text-white shadow-emerald-500/40' : winner === 'opp' ? 'bg-rose-500 text-white shadow-rose-500/40' : 'bg-amber-500 text-white shadow-amber-500/40'}`}>
                            <Trophy size={40} />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2">
                            {winner === 'me' ? '🎉 فنان ذكي وفوز مستحق!' : winner === 'opp' ? '😤 حظ أوفر المرة القادمة' : '🤝 تعادل رائع!'}
                        </h2>
                        <div className="glass-card py-3 px-8 rounded-xl text-2xl font-black text-amber-400 mb-6 inline-block border border-amber-500/30">
                            {myScore} – {oppScore}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={handleRematch} className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95">
                                <RotateCcw size={16} /> إعادة
                            </button>
                            <button onClick={() => setView('hub')} className="flex-1 py-3 glass-card text-slate-300 hover:text-white font-bold text-sm rounded-2xl border border-white/10 transition-transform active:scale-95">
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
