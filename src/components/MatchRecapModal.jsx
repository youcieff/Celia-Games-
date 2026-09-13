import React, { useState, useEffect, useRef } from 'react';
import Play from 'lucide-react/dist/esm/icons/play';
import Pause from 'lucide-react/dist/esm/icons/pause';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import FastForward from 'lucide-react/dist/esm/icons/fast-forward';
import X from 'lucide-react/dist/esm/icons/x';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Flame from 'lucide-react/dist/esm/icons/flame';
import { playSound, playHaptic } from '../lib/audioEngine';

export default function MatchRecapModal({
    isOpen,
    onClose,
    onRestart,
    gameType = 'sea', // 'sea' | 'xo'
    history = [],
    winner = 'me',
    myProfile,
    oppProfile
}) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [speed, setSpeed] = useState(350); // ms per step

    const timerRef = useRef(null);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setCurrentStep(0);
            setIsPlaying(true);
        }
    }, [isOpen]);

    // Step playback logic
    useEffect(() => {
        if (!isOpen || !isPlaying) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }

        timerRef.current = setInterval(() => {
            setCurrentStep(prev => {
                if (prev >= history.length) {
                    setIsPlaying(false);
                    return prev;
                }
                const next = prev + 1;
                const move = history[prev];
                if (move) {
                    if (gameType === 'sea') {
                        if (move.result === 'hit') {
                            playSound('explosion');
                            playHaptic(30);
                        } else {
                            playSound('splash');
                        }
                    } else if (gameType === 'xo') {
                        playSound('pop');
                        playHaptic(15);
                    }
                }
                return next;
            });
        }, speed);

        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isOpen, isPlaying, history, speed, gameType]);

    if (!isOpen) return null;

    // Derived states up to current step
    const movesUpToNow = history.slice(0, currentStep);

    // Calculate quick stats
    const totalMoves = history.length;
    let hitCount = 0;
    if (gameType === 'sea') {
        hitCount = history.filter(m => m.result === 'hit').length;
    }

    return (
        <div className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-fade-in">
            <div className="glass-card border border-white/10 rounded-3xl p-5 max-w-md w-full flex flex-col gap-4 shadow-2xl relative">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🎥</span>
                        <div>
                            <h3 className="text-base font-black gradient-text">ملخص الجولة السريع</h3>
                            <p className="text-[10px] opacity-60 font-bold">إعادة عرض حركات المعركة خطوة بخطوة</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full glass-card flex items-center justify-center text-white/70 hover:text-white"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Board Preview: Sea Battle */}
                {gameType === 'sea' && (
                    <div className="flex flex-col items-center">
                        <div className="w-[240px] aspect-square bg-[#071326] border-2 border-sky-400/30 rounded-2xl p-1.5 grid grid-cols-8 gap-0.5 shadow-inner">
                            {Array.from({ length: 8 }).map((_, r) =>
                                Array.from({ length: 8 }).map((_, c) => {
                                    const shot = movesUpToNow.find(m => m.r === r && m.c === c);
                                    const isLatest = movesUpToNow.length > 0 &&
                                        movesUpToNow[movesUpToNow.length - 1].r === r &&
                                        movesUpToNow[movesUpToNow.length - 1].c === c;

                                    return (
                                        <div
                                            key={`${r}-${c}`}
                                            className={`rounded-[3px] flex items-center justify-center text-[10px] relative transition-all duration-200
                                            ${!shot ? 'bg-sky-900/20' : ''}
                                            ${shot?.result === 'hit' ? 'bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.8)] font-black' : ''}
                                            ${shot?.result === 'miss' ? 'bg-white/30' : ''}
                                            ${isLatest ? 'ring-2 ring-yellow-400 scale-110 z-10' : ''}
                                            `}
                                        >
                                            {shot?.result === 'hit' && '💥'}
                                            {shot?.result === 'miss' && <span className="w-1.5 h-1.5 rounded-full bg-white/60" />}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* Board Preview: TicTacToe */}
                {gameType === 'xo' && (
                    <div className="flex flex-col items-center">
                        <div className="w-[200px] aspect-square bg-[#0a192f]/80 border-2 border-emerald-400/30 rounded-2xl p-2 grid grid-cols-3 gap-2 shadow-inner">
                            {Array.from({ length: 9 }).map((_, idx) => {
                                const move = movesUpToNow.find(m => m.index === idx);
                                const isLatest = movesUpToNow.length > 0 &&
                                    movesUpToNow[movesUpToNow.length - 1].index === idx;

                                return (
                                    <div
                                        key={idx}
                                        className={`rounded-xl flex items-center justify-center font-black text-2xl transition-all duration-200
                                        ${!move ? 'bg-white/5' : ''}
                                        ${move?.symbol === 'X' ? 'text-emerald-400 bg-emerald-500/10' : ''}
                                        ${move?.symbol === 'O' ? 'text-sky-400 bg-sky-500/10' : ''}
                                        ${isLatest ? 'ring-2 ring-yellow-400 scale-105' : ''}
                                        `}
                                    >
                                        {move?.symbol}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Scrubber & Step Info */}
                <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-xs font-bold px-1">
                        <span className="opacity-60">
                            الحركة: {currentStep} / {totalMoves}
                        </span>
                        {movesUpToNow.length > 0 && (
                            <span className="text-yellow-400 font-mono text-[11px]">
                                {movesUpToNow[movesUpToNow.length - 1].shooter === 'me'
                                    ? (myProfile?.nickname || 'أنت')
                                    : (oppProfile?.nickname || 'الخصم')}
                                {movesUpToNow[movesUpToNow.length - 1].result === 'hit' ? ' 🔥 ضربة مباشرة!' : ''}
                            </span>
                        )}
                    </div>
                    {/* Progress Bar */}
                    <input
                        type="range"
                        min="0"
                        max={totalMoves}
                        value={currentStep}
                        onChange={(e) => {
                            setCurrentStep(parseInt(e.target.value));
                            setIsPlaying(false);
                        }}
                        className="w-full accent-emerald-400 cursor-pointer h-1.5 rounded-lg bg-black/40"
                    />
                </div>

                {/* Playback Controls */}
                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={() => {
                            setCurrentStep(0);
                            setIsPlaying(true);
                            playSound('click');
                        }}
                        className="glass-card p-2.5 rounded-xl hover:bg-white/10 active:scale-95 transition-all text-xs font-bold flex items-center gap-1"
                        title="إعادة من الأول"
                    >
                        <RotateCcw size={16} />
                    </button>

                    <button
                        onClick={() => {
                            setIsPlaying(!isPlaying);
                            playSound('click');
                        }}
                        className="glow-button px-5 py-2.5 rounded-xl font-black text-sm flex items-center gap-1.5"
                    >
                        {isPlaying ? <><Pause size={16} /> إيقاف مؤقت</> : <><Play size={16} /> تشغيل الملخص</>}
                    </button>

                    <button
                        onClick={() => {
                            setSpeed(prev => (prev === 350 ? 180 : 350));
                            playSound('click');
                        }}
                        className={`glass-card px-3 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1 transition-all ${speed === 180 ? 'text-amber-400 border-amber-400/50' : ''}`}
                        title="سرعة العرض"
                    >
                        <FastForward size={14} /> {speed === 180 ? '2x' : '1x'}
                    </button>
                </div>

                {/* Footer buttons */}
                <div className="pt-2 border-t border-white/10 flex gap-2">
                    <button
                        onClick={onClose}
                        className="glass-card flex-1 py-3 rounded-xl font-bold text-xs hover:bg-white/10 transition-colors"
                    >
                        إغلاق
                    </button>
                    {onRestart && (
                        <button
                            onClick={() => {
                                onClose();
                                onRestart();
                            }}
                            className="glow-button flex-1 py-3 rounded-xl font-black text-xs"
                        >
                            العب تاني 🎮
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
