import React, { useState, useEffect } from 'react';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Volume2 from 'lucide-react/dist/esm/icons/volume-2';
import VolumeX from 'lucide-react/dist/esm/icons/volume-x';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import useProfile from '../hooks/useProfile';
import { toggleMute, getMuted, playSound } from '../lib/audioEngine';
import { AvatarDisplay } from './icons/AvatarIcons';
import { GameIcon, IconTarget, IconHourglass } from './icons/GameIcons';
import Logo from './Logo';

export default function PlayerGameHeader({
    title = 'اللعبة',
    gameEmoji = null,
    gameId = null,
    isMyTurn = true,
    simultaneous = false,
    oppProfile = null,
    onLeave,
    myScore = null,
    oppScore = null,
    statusText = null
}) {
    const [myProfile] = useProfile();
    const [muted, setMutedState] = useState(() => getMuted());
    const [hasUnread, setHasUnread] = useState(false);

    useEffect(() => {
        const handleUnread = () => setHasUnread(true);
        const handleOpened = () => setHasUnread(false);
        window.addEventListener('game-chat-unread', handleUnread);
        window.addEventListener('game-chat-opened', handleOpened);
        return () => {
            window.removeEventListener('game-chat-unread', handleUnread);
            window.removeEventListener('game-chat-opened', handleOpened);
        };
    }, []);

    const handleToggleMute = () => {
        const next = toggleMute();
        setMutedState(next);
        if (!next) playSound('click');
    };

    const opp = oppProfile || { nickname: 'الخصم', avatar: 'alien' };

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

                <div className="flex items-center gap-2 glass-card px-3.5 py-1.5 rounded-2xl border border-white/10 shrink-0">
                    {gameId ? (
                        <GameIcon gameId={gameId} size={18} className="text-[var(--accent)]" />
                    ) : gameEmoji && typeof gameEmoji === 'string' && gameEmoji.length > 2 ? (
                        <GameIcon gameId={gameEmoji} size={18} className="text-[var(--accent)]" />
                    ) : null}
                    <span className="text-xs font-black gradient-text">{title}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        onClick={() => {
                            setHasUnread(false);
                            window.dispatchEvent(new CustomEvent('toggle-game-chat'));
                        }}
                        className="glass-card w-10 h-10 flex items-center justify-center rounded-2xl hover:scale-105 active:scale-95 transition-all text-[var(--accent)] relative"
                        title="المحادثة والتفاعلات"
                    >
                        <MessageCircle size={18} />
                        {hasUnread && (
                            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
                            </span>
                        )}
                    </button>

                    <button
                        onClick={handleToggleMute}
                        className="glass-card w-10 h-10 flex items-center justify-center rounded-2xl hover:scale-105 active:scale-95 transition-all text-white/80 hover:text-white"
                        title={muted ? 'تفعيل الصوت' : 'كتم الصوت'}
                    >
                        {muted ? <VolumeX size={18} className="text-rose-400" /> : <Volume2 size={18} className="text-[var(--accent)]" />}
                    </button>
                </div>
            </div>

            {/* Players Duel Cards Bar */}
            <div className="grid grid-cols-2 gap-2 w-full">
                {/* My Card */}
                <div
                    className={`glass-card p-2.5 rounded-2xl flex items-center gap-2.5 transition-all duration-300 relative overflow-hidden
                    ${(simultaneous || isMyTurn) ? 'border-2 border-[var(--accent)] bg-[var(--accent-soft)] shadow-[0_0_20px_var(--accent-glow)]' : 'border border-white/5 opacity-75'}`}
                >
                    <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10">
                            <AvatarDisplay avatarId={myProfile.avatar} size={28} />
                        </div>
                        {(simultaneous || isMyTurn) && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--accent)]" />
                            </span>
                        )}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-black truncate">{myProfile.nickname || 'أنت'}</span>
                            {myScore !== null && (
                                <span className="text-xs font-black text-[var(--accent)] font-mono bg-[var(--accent-soft)] px-1.5 py-0.5 rounded-md">
                                    {myScore}
                                </span>
                            )}
                        </div>
                        <span className={`text-[10px] font-bold leading-tight mt-0.5 flex items-center gap-1 ${
                            (simultaneous || isMyTurn) ? 'text-[var(--accent)] font-black' : 'opacity-40'
                        }`}>
                            {simultaneous ? (
                                <><IconTarget size={11} className="shrink-0" /><span>بتكتب الآن</span></>
                            ) : isMyTurn ? (
                                <><IconTarget size={11} className="shrink-0" /><span>دورك الآن</span></>
                            ) : (
                                <span>في الانتظار</span>
                            )}
                        </span>
                    </div>
                </div>

                {/* Opponent Card */}
                <div
                    className={`glass-card p-2.5 rounded-2xl flex items-center gap-2.5 transition-all duration-300 relative overflow-hidden
                    ${(simultaneous || !isMyTurn) ? 'border-2 border-sky-400/80 bg-sky-500/10 shadow-[0_0_20px_rgba(56,189,248,0.25)]' : 'border border-white/5 opacity-75'}`}
                >
                    <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10">
                            <AvatarDisplay avatarId={opp.avatar} size={28} />
                        </div>
                        {(simultaneous || !isMyTurn) && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500" />
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
                        <span className={`text-[10px] font-bold leading-tight mt-0.5 flex items-center gap-1 ${
                            (simultaneous || !isMyTurn) ? 'text-sky-400 font-black' : 'opacity-40'
                        }`}>
                            {simultaneous ? (
                                <><IconTarget size={11} className="shrink-0" /><span>بيكتب الآن</span></>
                            ) : !isMyTurn ? (
                                <><IconHourglass size={11} className="shrink-0" /><span>دور {opp.nickname || 'الخصم'}</span></>
                            ) : (
                                <span>مستعد</span>
                            )}
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
