import React, { useState } from 'react';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Volume2 from 'lucide-react/dist/esm/icons/volume-2';
import VolumeX from 'lucide-react/dist/esm/icons/volume-x';
import Wifi from 'lucide-react/dist/esm/icons/wifi';
import useProfile from '../hooks/useProfile';
import { toggleMute, getMuted, playSound } from '../lib/audioEngine';

export default function PlayerGameHeader({
    title = 'اللعبة',
    gameEmoji = '🎮',
    isMyTurn = true,
    oppProfile = null,
    onLeave,
    myScore = null,
    oppScore = null,
    statusText = null
}) {
    const [myProfile] = useProfile();
    const [muted, setMutedState] = useState(() => getMuted());

    const handleToggleMute = () => {
        const next = toggleMute();
        setMutedState(next);
        if (!next) playSound('click');
    };

    const opp = oppProfile || { nickname: 'الخصم', avatar: '👤' };

    return (
        <div className="w-full max-w-lg mx-auto px-3 py-2 flex flex-col gap-2 relative z-20">
            {/* Top Bar: Leave button, Game Title, Mute Toggle */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onLeave}
                    className="glass-card w-10 h-10 flex items-center justify-center rounded-2xl hover:scale-105 active:scale-95 transition-all text-white/80 hover:text-white"
                    title="مغادرة اللعبة"
                >
                    <ArrowRight size={18} />
                </button>

                <div className="flex items-center gap-2 glass-card px-3 py-1 rounded-2xl">
                    <span className="text-sm">{gameEmoji}</span>
                    <span className="text-xs font-black gradient-text tracking-wide">{title}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"></span>
                </div>

                <button
                    onClick={handleToggleMute}
                    className="glass-card w-10 h-10 flex items-center justify-center rounded-2xl hover:scale-105 active:scale-95 transition-all text-white/80 hover:text-white"
                    title={muted ? 'تفعيل الصوت' : 'كتم الصوت'}
                >
                    {muted ? <VolumeX size={18} className="text-rose-400" /> : <Volume2 size={18} className="text-emerald-400" />}
                </button>
            </div>

            {/* Players Duel Cards Bar */}
            <div className="grid grid-cols-2 gap-2 w-full">
                {/* My Card */}
                <div
                    className={`glass-card p-2.5 rounded-2xl flex items-center gap-2.5 transition-all duration-300 relative overflow-hidden
                    ${isMyTurn ? 'border-2 border-emerald-400/80 bg-emerald-500/10 shadow-[0_0_20px_rgba(52,211,153,0.25)]' : 'border border-white/5 opacity-80'}`}
                >
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-xl shadow-inner border border-white/10">
                            {myProfile.avatar || '😎'}
                        </div>
                        {isMyTurn && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                        )}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-black truncate">{myProfile.nickname || 'أنت'}</span>
                            {myScore !== null && (
                                <span className="text-xs font-black text-emerald-400 font-mono bg-emerald-400/10 px-1.5 py-0.5 rounded-md">
                                    {myScore}
                                </span>
                            )}
                        </div>
                        <span className={`text-[10px] font-bold leading-tight mt-0.5 ${isMyTurn ? 'text-emerald-400 font-black' : 'opacity-40'}`}>
                            {isMyTurn ? '🎯 دورك الآن' : 'في الانتظار'}
                        </span>
                    </div>
                </div>

                {/* Opponent Card */}
                <div
                    className={`glass-card p-2.5 rounded-2xl flex items-center gap-2.5 transition-all duration-300 relative overflow-hidden
                    ${!isMyTurn ? 'border-2 border-sky-400/80 bg-sky-500/10 shadow-[0_0_20px_rgba(56,189,248,0.25)]' : 'border border-white/5 opacity-80'}`}
                >
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-xl shadow-inner border border-white/10">
                            {opp.avatar || '👤'}
                        </div>
                        {!isMyTurn && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                            </span>
                        )}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-black truncate">{opp.nickname || 'الخصم'}</span>
                            {oppScore !== null && (
                                <span className="text-xs font-black text-sky-400 font-mono bg-sky-400/10 px-1.5 py-0.5 rounded-md">
                                    {oppScore}
                                </span>
                            )}
                        </div>
                        <span className={`text-[10px] font-bold leading-tight mt-0.5 ${!isMyTurn ? 'text-sky-400 font-black' : 'opacity-40'}`}>
                            {!isMyTurn ? '⏳ دور الخصم' : 'مستعد'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Optional Status Banner */}
            {statusText && (
                <div className="text-center text-[11px] font-bold opacity-75 -mt-1">
                    {statusText}
                </div>
            )}
        </div>
    );
}
