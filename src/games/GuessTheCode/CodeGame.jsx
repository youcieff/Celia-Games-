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
import GlobalMuteButton from '../../components/GlobalMuteButton';
import useProfile from '../../hooks/useProfile';
import { triggerVictoryEffects, triggerDefeatEffects } from '../../lib/effectsEngine';
import { AvatarDisplay } from '../../components/icons/AvatarIcons';
import EmotesOverlay, { ChatTriggerButton } from '../../components/EmotesOverlay';
import { IconCodeGame, IconTarget, IconHourglass, IconTrophy } from '../../components/icons/GameIcons';

export default function CodeGame({ setView }) {
    // ── stable refs (no stale closures) ──────────────────────────────
    const connRef = useRef(null);
    const isHostRef = useRef(false);
    const secretRef = useRef('');
    const turnRef = useRef(false);
    const oppReadyRef = useRef(false);
    const codeLengthRef = useRef(4); // shared with both players

    // ── ui state ────────────────────────────────────────────────────
    const [myProfile] = useProfile();
    const [oppProfile, setOppProfile] = useState(null);
    const opp = oppProfile || { nickname: 'الخصم', avatar: 'alien' };

    const [gameState, setGameState] = useState('lobby');
    // lobby | length-select | setting-secret | waiting-start | playing | won | lost
    const [codeLength, setCodeLength] = useState(4);
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [myGuesses, setMyGuesses] = useState([]);
    const [input, setInput] = useState('');

    // Tracking opponent's progress on YOUR secret code
    const oppConfirmedRef = useRef([]);
    const [oppConfirmed, setOppConfirmed] = useState([]);

    const handleGameStart = (conn, hostMode, oppProf) => {
        connRef.current = conn;
        isHostRef.current = hostMode;
        if (oppProf) setOppProfile(oppProf);
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
        if (msg.type === 'global_ready' && msg.profile) {
            setOppProfile(msg.profile);
        }
        switch (msg.type) {
            case 'code_length': {
                const len = msg.length;
                codeLengthRef.current = len;
                setCodeLength(len);
                oppConfirmedRef.current = Array(len).fill(false);
                setOppConfirmed(oppConfirmedRef.current);
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

                const newOppConfirmed = [...oppConfirmedRef.current];
                result.forEach((r, idx) => {
                    if (r === 'green') newOppConfirmed[idx] = true;
                });
                oppConfirmedRef.current = newOppConfirmed;
                setOppConfirmed(newOppConfirmed);

                connRef.current.send({ type: 'guess_result', code: msg.code, result });
                if (result.every(r => r === 'green')) {
                    setGameState('lost');
                    triggerDefeatEffects();
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
                    triggerVictoryEffects();
                    if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100, 50, 200]);
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
        oppConfirmedRef.current = Array(len).fill(false);
        setOppConfirmed(oppConfirmedRef.current);
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
        oppConfirmedRef.current = Array(codeLengthRef.current).fill(false);
        setOppConfirmed(oppConfirmedRef.current);
        setMyGuesses([]);
        setInput('');
        turnRef.current = !isHostRef.current;
        setIsMyTurn(!isHostRef.current);
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

                {/* Header: Lobby with Logo vs In-Game Header */}
                {gameState === 'lobby' ? (
                    <div className="px-4 grid grid-cols-3 items-center py-4 mb-2 w-full">
                        <div><Logo size="small" /></div>
                        <div className="flex justify-center"><span className="text-sm font-black opacity-70">خمن الكود</span></div>
                        <div className="flex justify-end"><button onClick={() => { connRef.current?.close(); setView('hub'); }} className="glass-card px-4 py-2 rounded-2xl text-xs font-bold hover:scale-105 active:scale-95 transition-transform text-white/90">الرئيسية</button></div>
                    </div>
                ) : (
                    <header className="px-2 py-3 flex items-center justify-between gap-2 w-full z-20">
                        <button
                            onClick={() => { connRef.current?.close(); setView('hub'); }}
                            className="glass-card w-10 h-10 flex items-center justify-center rounded-2xl hover:scale-105 active:scale-95 transition-all text-white/80 shrink-0"
                            title="الرجوع للرئيسية"
                        >
                            <ArrowRight size={18} />
                        </button>

                        <div className="flex items-center gap-2 glass-card px-3.5 py-1.5 rounded-2xl border border-white/10 shrink-0">
                            <Logo size="mini" />
                            <IconCodeGame size={18} className="text-[var(--accent)]" />
                            <span className="text-xs font-black gradient-text">خمن الكود</span>
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold mr-1">
                                <Wifi size={11} />
                                <span>{codeLength} أرقام</span>
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            {['setting-secret', 'waiting-start', 'playing', 'won', 'lost'].includes(gameState) && (
                                <ChatTriggerButton onClick={() => window.dispatchEvent(new CustomEvent('toggle-game-chat'))} />
                            )}
                            <GlobalMuteButton className="w-10 h-10 !rounded-2xl shrink-0" />
                        </div>
                    </header>
                )}

                {/* ── Lobby ── */}
                {gameState === 'lobby' && (
                    <div className="flex-1 flex pb-16 safe-area-pb">
                        <P2PConnectionManager gameIdPrefix="celia-code" onGameStart={handleGameStart} />
                    </div>
                )}

                {/* ── Host: Choose Code Length ── */}
                {/* ── Host: Choose Code Length ── */}
                {gameState === 'length-select' && (
                    <div className="flex-1 flex flex-col items-center justify-center -mt-6">
                        <div className="glass-card rounded-3xl p-7 w-full max-w-sm text-center animate-pop-in border border-white/10 shadow-2xl">
                            <h2 className="text-xl font-black mb-2 gradient-text">طول الكود</h2>
                            <p className="opacity-60 text-xs mb-6 font-bold">اختار كم رقم في الكود السري؟</p>
                            <div className="grid grid-cols-2 gap-3">
                                {[3, 4].map(len => (
                                    <button
                                        key={len}
                                        onClick={() => handleSelectLength(len)}
                                        className="glass-card glass-card-hover rounded-2xl py-6 flex flex-col items-center gap-1.5 border border-white/10 hover:border-[var(--accent)] transition-all"
                                    >
                                        <span className="text-4xl font-black gradient-text">{len}</span>
                                        <span className="text-xs font-bold opacity-70">{len === 3 ? 'مستوى سهل' : 'مستوى تحدي'}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Client: Waiting for host to choose length ── */}
                {gameState === 'waiting-length' && (
                    <div className="flex-1 flex items-center justify-center -mt-6">
                        <div className="glass-card rounded-3xl p-8 text-center animate-pulse-glow border border-white/10">
                            <IconHourglass size={36} className="text-[var(--accent)] mx-auto mb-3" />
                            <h2 className="text-xl font-black mb-2 gradient-text">في الانتظار...</h2>
                            <p className="opacity-60 font-bold text-xs">الخصم يقوم باختيار طول الكود السري</p>
                        </div>
                    </div>
                )}

                {/* ── Game Screens ── */}
                {!['lobby', 'length-select', 'waiting-length'].includes(gameState) && (
                    <div className="flex-1 flex flex-col gap-3">

                        {/* Status card */}
                        {gameState === 'setting-secret' && (
                            <div className="glass-card rounded-2xl p-4 border border-white/10">
                                <p className="font-black text-sm mb-1 text-[var(--accent)] flex items-center gap-1.5">
                                    <Lock size={15} />
                                    <span>الخطوة 1 — ضع كودك السري</span>
                                </p>
                                <p className="text-xs opacity-65 leading-relaxed">
                                    اختر {codeLength} أرقام سرية — سيحاول الطرف الآخر تخمينها.<br />
                                    <span className="text-amber-400 font-bold text-[11px]">بعد الضغط على زر التأكيد لن يظهر لك ثانية!</span>
                                </p>
                            </div>
                        )}

                        {gameState === 'waiting-start' && (
                            <div className="glass-card rounded-2xl p-5 text-center animate-pulse-glow border border-white/10">
                                <CheckCircle2 className="mx-auto mb-2 text-emerald-400" size={32} />
                                <p className="font-black text-sm mb-1">كودك السري جاهز!</p>
                                <p className="text-xs opacity-60">في انتظار الخصم لتحديد كوده...</p>
                            </div>
                        )}

                        {gameState === 'playing' && (
                            <div className={`glass-card rounded-2xl py-2.5 px-4 transition-all border border-white/10 ${isMyTurn ? 'animate-pulse-glow' : ''}`}>
                                <div className="font-black text-xs flex items-center justify-between gap-2" style={{ color: isMyTurn ? 'var(--accent)' : 'inherit' }}>
                                    {isMyTurn ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden border border-white/20 shrink-0">
                                                <AvatarDisplay avatarId={myProfile.avatar} size={18} />
                                            </div>
                                            <span>دورك تخمّن كود {opp.nickname || 'الخصم'}!</span>
                                            <IconTarget size={14} className="shrink-0 text-[var(--accent)]" />
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden border border-white/20 shrink-0">
                                                <AvatarDisplay avatarId={opp.avatar} size={18} />
                                            </div>
                                            <span className="opacity-80">دور {opp.nickname || 'الخصم'} يخمن كودك...</span>
                                            <IconHourglass size={14} className="opacity-60 shrink-0" />
                                        </div>
                                    )}
                                </div>
                                {isMyTurn && <p className="text-[10px] opacity-50 mt-1">ادخل {codeLength} أرقام ثم اضغط زر التأكيد</p>}
                            </div>
                        )}

                        {(gameState === 'won' || gameState === 'lost') && (
                            <div className="glass-card rounded-2xl py-3.5 px-4 text-center animate-pop-in border border-white/10 shadow-2xl">
                                <p className={`font-black text-xl flex items-center justify-center gap-2 ${gameState === 'won' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    <IconTrophy size={20} className={gameState === 'won' ? 'text-amber-400' : 'text-rose-400'} />
                                    <span>
                                        {gameState === 'won' ? 'أنت الفائز البطل!' : 'انتهت اللعبة!'}
                                    </span>
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
                            <div className="flex justify-center gap-3 my-2 flex-wrap" dir="ltr">
                                {Array.from({ length: codeLength }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`digit-cell ${codeLength <= 4 ? 'w-[72px] h-[80px]' : 'w-[52px] h-[64px]'} flex items-center justify-center text-3xl font-black rounded-2xl ${input[i] ? 'filled' : ''}`}
                                    >
                                        {gameState === 'setting-secret'
                                            ? (input[i] ? <Lock size={22} className="opacity-40" /> : '')
                                            : (isMyTurn
                                                ? (input[i] || '')
                                                : (oppConfirmed[i]
                                                    ? <span className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]">{secretRef.current[i]}</span>
                                                    : <Lock size={24} className="opacity-20 text-red-500" />))}
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
            {['setting-secret', 'waiting-start', 'playing', 'won', 'lost'].includes(gameState) && (
                <EmotesOverlay conn={connRef.current} oppProfile={opp} showStandaloneButton={false} />
            )}
        </>
    );
}
