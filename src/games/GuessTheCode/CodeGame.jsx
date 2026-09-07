import React, { useState, useRef } from 'react';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import CodeKeypad from './CodeKeypad';
import HistoryBoard from './HistoryBoard';
import Logo from '../../components/Logo';
import Scratchpad from '../../components/Scratchpad';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Lock from 'lucide-react/dist/esm/icons/lock';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Wifi from 'lucide-react/dist/esm/icons/wifi';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';

export default function CodeGame({ setView }) {
    // ── stable refs (no stale closures) ──────────────────────────────
    const connRef = useRef(null);
    const isHostRef = useRef(false);
    const secretRef = useRef('');
    const turnRef = useRef(false);
    const oppReadyRef = useRef(false);
    const codeLengthRef = useRef(4); // shared with both players

    // ── ui state ────────────────────────────────────────────────────
    const [gameState, setGameState] = useState('lobby');
    // lobby | length-select | setting-secret | waiting-start | playing | won | lost
    const [codeLength, setCodeLength] = useState(4);
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [myGuesses, setMyGuesses] = useState([]);
    const [input, setInput] = useState('');

    const handleGameStart = (conn, hostMode) => {
        connRef.current = conn;
        isHostRef.current = hostMode;
        conn.on('data', onData);

        // Host sets code length, client waits for it
        turnRef.current = !hostMode;
        setIsMyTurn(!hostMode);

        if (hostMode) {
            setGameState('length-select');
        } else {
            setGameState('waiting-length');
        }
    };

    // ── network message handler ─────────────────────────────────────
    const onData = (msg) => {
        switch (msg.type) {
            case 'code_length': {
                const len = msg.length;
                codeLengthRef.current = len;
                setCodeLength(len);
                setGameState('setting-secret');
                break;
            }
            case 'secret_ready': {
                oppReadyRef.current = true;
                if (secretRef.current) startPlaying();
                break;
            }
            case 'guess': {
                const result = evaluate(msg.code, secretRef.current);
                connRef.current.send({ type: 'guess_result', code: msg.code, result });
                if (result.every(r => r === 'green')) {
                    setGameState('lost');
                } else {
                    turnRef.current = true;
                    setIsMyTurn(true);
                }
                break;
            }
            case 'guess_result': {
                const { code, result } = msg;
                setMyGuesses(prev => [...prev, { code: code.split(''), result }]);
                if (result.every(r => r === 'green')) {
                    setGameState('won');
                }
                break;
            }
            case 'restart':
                resetAll();
                break;
            default: break;
        }
    };

    // ── host selects code length ────────────────────────────────────
    const handleSelectLength = (len) => {
        codeLengthRef.current = len;
        setCodeLength(len);
        connRef.current?.send({ type: 'code_length', length: len });
        setGameState('setting-secret');
    };

    // ── evaluate guess ───────────────────────────────────────────────
    const evaluate = (guess, secret) => {
        const len = codeLengthRef.current;
        const g = guess.split(''), s = secret.split('');
        const res = new Array(len).fill('red');
        const used = new Array(len).fill(false);
        // pass 1: exact
        for (let i = 0; i < len; i++) {
            if (g[i] === s[i]) { res[i] = 'green'; used[i] = true; }
        }
        // pass 2: misplaced
        for (let i = 0; i < len; i++) {
            if (res[i] !== 'green') {
                const j = s.findIndex((ch, k) => ch === g[i] && !used[k]);
                if (j !== -1) { res[i] = 'yellow'; used[j] = true; }
            }
        }
        return res;
    };

    const startPlaying = () => setGameState('playing');

    // ── keypad handlers ──────────────────────────────────────────────
    const onNumber = (n) => {
        if (input.length < codeLengthRef.current) setInput(p => p + n);
    };
    const onDelete = () => setInput(p => p.slice(0, -1));

    const onSubmit = () => {
        if (input.length !== codeLengthRef.current) return;

        if (gameState === 'setting-secret') {
            secretRef.current = input;
            setInput('');
            connRef.current.send({ type: 'secret_ready' });
            if (oppReadyRef.current) {
                startPlaying();
            } else {
                setGameState('waiting-start');
            }
        } else if (gameState === 'playing' && turnRef.current) {
            connRef.current.send({ type: 'guess', code: input });
            turnRef.current = false;
            setIsMyTurn(false);
            setInput('');
        }
    };

    // ── reset ────────────────────────────────────────────────────────
    const resetAll = () => {
        secretRef.current = '';
        oppReadyRef.current = false;
        setMyGuesses([]);
        setInput('');
        if (isHostRef.current) {
            setGameState('length-select');
        } else {
            setGameState('waiting-length');
        }
    };

    const onRestart = () => {
        resetAll();
        connRef.current?.send({ type: 'restart' });
    };

    // ── render ───────────────────────────────────────────────────────
    return (
        <>
            <div className="animated-bg"><div className="bg-orb-3" /></div>

            <div className="min-h-dvh max-w-md mx-auto px-4 flex flex-col safe-area-pt overflow-x-hidden overflow-y-auto">

                {/* ── Navbar ── */}
                <div className="flex justify-between items-center py-4 relative">
                    <div className="flex items-center gap-3 z-10">
                        <Logo size="small" />
                        <button
                            onClick={() => { connRef.current?.close(); setView('hub'); }}
                            className="glass-card w-11 h-11 flex items-center justify-center rounded-2xl hover:scale-105 transition-transform"
                        >
                            <ArrowRight size={20} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 glass-card px-3 py-1.5 rounded-2xl text-xs font-bold text-center">
                        {gameState !== 'lobby' ? (
                            <div className="flex items-center gap-3">
                                <span className="flex flex-col items-end">
                                    <span className="text-[12px] font-black gradient-text leading-none mb-1">خمن الكود 🔐</span>
                                    <span className="text-[9px] opacity-70 leading-none">{codeLength} أرقام</span>
                                </span>
                                <div className="w-px h-5 bg-white/20"></div>
                                <span className="flex flex-col items-center justify-center text-emerald-400">
                                    <Wifi size={12} />
                                    <span className="text-[8px] mt-0.5 font-black">متصل</span>
                                </span>
                            </div>
                        ) : (
                            <span className="text-[11px] font-black gradient-text">خمن الكود 🔐</span>
                        )}
                    </div>
                </div>

                {/* ── Lobby ── */}
                {gameState === 'lobby' && (
                    <div className="flex-1 flex pb-16 safe-area-pb">
                        <P2PConnectionManager gameIdPrefix="celia-code" onGameStart={handleGameStart} />
                    </div>
                )}

                {/* ── Host: Choose Code Length ── */}
                {gameState === 'length-select' && (
                    <div className="flex-1 flex flex-col items-center justify-center -mt-10">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center animate-pop-in">
                            <h2 className="text-2xl font-black mb-2">🔐 طول الكود</h2>
                            <p className="opacity-60 text-sm mb-8 font-bold">اختار كام رقم في الكود السري؟</p>
                            <div className="grid grid-cols-2 gap-4">
                                {[3, 4].map(len => (
                                    <button
                                        key={len}
                                        onClick={() => handleSelectLength(len)}
                                        className="glass-card glass-card-hover rounded-2xl py-8 flex flex-col items-center gap-2 border border-transparent hover:border-[var(--primary-color)]/50 transition-all"
                                    >
                                        <span className="text-5xl font-black gradient-text">{len}</span>
                                        <span className="text-sm font-bold opacity-70">{len === 3 ? 'سهل 😊' : 'صعب 💀'}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Client: Waiting for host to choose length ── */}
                {gameState === 'waiting-length' && (
                    <div className="flex-1 flex items-center justify-center -mt-10">
                        <div className="glass-card rounded-3xl p-10 text-center animate-pulse-glow">
                            <h2 className="text-2xl font-black mb-2">⏳ في الانتظار...</h2>
                            <p className="opacity-60 font-bold text-sm">الخصم بيختار طول الكود السري</p>
                        </div>
                    </div>
                )}

                {/* ── Game Screens ── */}
                {!['lobby', 'length-select', 'waiting-length'].includes(gameState) && (
                    <div className="flex-1 flex flex-col gap-3">

                        {/* Status card */}
                        {gameState === 'setting-secret' && (
                            <div className="glass-card rounded-2xl p-4">
                                <p className="font-black text-base mb-1" style={{ color: 'var(--primary-color)' }}>
                                    🔐 الخطوة 1 — ضع كودك السري
                                </p>
                                <p className="text-xs opacity-60 leading-relaxed">
                                    اختر {codeLength} أرقام سرية — الطرف التاني هيحاول يخمنها.<br />
                                    <span className="text-yellow-400 font-bold">بعد الضغط ✅ مش هتشوفه تاني!</span>
                                </p>
                            </div>
                        )}

                        {gameState === 'waiting-start' && (
                            <div className="glass-card rounded-2xl p-5 text-center animate-pulse-glow">
                                <CheckCircle2 className="mx-auto mb-2 text-emerald-400" size={36} />
                                <p className="font-black text-base mb-1">✅ كودك السري جاهز!</p>
                                <p className="text-xs opacity-60">في انتظار الخصم يضع كوده...</p>
                            </div>
                        )}

                        {gameState === 'playing' && (
                            <div className={`glass-card rounded-2xl py-3 px-4 transition-all ${isMyTurn ? 'animate-pulse-glow' : ''}`}>
                                <p className="font-black text-sm" style={{ color: isMyTurn ? 'var(--primary-color)' : 'inherit' }}>
                                    {isMyTurn ? '🎯 الخطوة 2 — خمّن كود الخصم!' : '⏳ الخصم بيخمن كودك...'}
                                </p>
                                {isMyTurn && <p className="text-[11px] opacity-50 mt-0.5">ادخل {codeLength} أرقام واضغط ✅</p>}
                            </div>
                        )}

                        {(gameState === 'won' || gameState === 'lost') && (
                            <div className="glass-card rounded-2xl py-3 px-4 text-center animate-pop-in">
                                <p className={`font-black text-2xl ${gameState === 'won' ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {gameState === 'won' ? '🎉 كسبت التحدي!' : '💔 خسرت التحدي!'}
                                </p>
                            </div>
                        )}

                        {/* History board */}
                        {(['playing', 'won', 'lost'].includes(gameState)) && (
                            <div className="flex-1 min-h-0">
                                <HistoryBoard guesses={myGuesses} codeLength={codeLength} />
                            </div>
                        )}

                        {gameState === 'waiting-start' && <div className="flex-1" />}

                        {/* Scratchpad (while waiting) */}
                        {gameState === 'playing' && !isMyTurn && <Scratchpad />}

                        {/* Digit cells */}
                        {(['setting-secret', 'playing'].includes(gameState)) && (
                            <div className="flex justify-center gap-3 my-2 flex-wrap">
                                {Array.from({ length: codeLength }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`digit-cell ${codeLength <= 4 ? 'w-[72px] h-[80px]' : 'w-[52px] h-[64px]'} flex items-center justify-center text-3xl font-black rounded-2xl ${input[i] ? 'filled' : ''}`}
                                    >
                                        {gameState === 'setting-secret'
                                            ? (input[i] ? <Lock size={22} className="opacity-40" /> : '')
                                            : (input[i] || '')}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Bottom action */}
                        <div className="mt-auto pb-2">
                            {(['won', 'lost'].includes(gameState)) && (
                                <button onClick={onRestart} className="glow-button w-full h-14 rounded-2xl text-lg font-black flex items-center justify-center gap-2">
                                    <RotateCcw size={20} /> العبوا تاني
                                </button>
                            )}

                            {(['setting-secret', 'playing'].includes(gameState)) && (
                                <CodeKeypad
                                    onNumber={onNumber}
                                    onDelete={onDelete}
                                    onSubmit={onSubmit}
                                    disabled={gameState === 'playing' && !isMyTurn}
                                    submitDisabled={input.length !== codeLength || (gameState === 'playing' && !isMyTurn)}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
