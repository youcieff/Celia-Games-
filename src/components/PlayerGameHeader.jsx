import React, { useState, useEffect } from 'react';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Volume2 from 'lucide-react/dist/esm/icons/volume-2';
import VolumeX from 'lucide-react/dist/esm/icons/volume-x';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import X from 'lucide-react/dist/esm/icons/x';
import useProfile from '../hooks/useProfile';
import { toggleMute, getMuted, playSound } from '../lib/audioEngine';
import { AvatarDisplay } from './icons/AvatarIcons';
import { EmoteDisplay } from './icons/EmoteIcons';
import { GameIcon, IconTarget, IconHourglass } from './icons/GameIcons';

const GAME_TITLES = {
    'taboo-game': 'الكلمة الممنوعة',
    'whoami-online': 'أنا مين؟',
    'whoami-local': 'أنا مين؟',
    'celia-whoami': 'أنا مين؟',
    'quick-draw': 'الرسم السريع',
    'domino': 'الدومينو',
    'domino-game': 'الدومينو',
    'rps-arena': 'حجرة ورقة مقص ⚡',
    'trivia-duel': 'تحدي المعلومات',
    'code-game': 'خمن الكود',
    'word-game': 'خمن الكلمة',
    'xo-game': 'إكس أو',
    'big-xo-game': 'إكس أو المطورة',
    'connect-4': 'أربعة في صف',
    'memory-game': 'الذاكرة البصرية',
    'celia-mem': 'الذاكرة البصرية',
    'dots-boxes': 'نقاط ومربعات',
    'sea-battle': 'حرب السفن',
    'guess-time': 'خمن الوقت',
    'bus-complete': 'أتوبيس كومبليت',
    'bus': 'أتوبيس كومبليت',
    'air-hockey': 'الهوكي الهوائي',
    'snake-arena': 'ثعبان النيون',
    'brick-breaker': 'تدمير الكتل',
    'celia-brick': 'تدمير الكتل',
    'math-duel': 'سرعة الحساب',
    'celia-math': 'سرعة الحساب',
    'speed-sudoku': 'سودوكو السرعة',
    'celia-sudoku': 'سودوكو السرعة'
};

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
    statusText = null,
    backTitle = 'مغادرة اللعبة',
    showChatButton = true,
    turnsActive = true
}) {
    const [myProfile] = useProfile();
    const [muted, setMutedState] = useState(() => getMuted());
    const [hasUnread, setHasUnread] = useState(false);
    const [chatNotice, setChatNotice] = useState(null);
    const [emoteNotice, setEmoteNotice] = useState(null);

    useEffect(() => {
        const handleUnread = () => setHasUnread(true);
        const handleOpened = () => setHasUnread(false);
        let noticeTimer;
        let emoteTimer;
        const handleChatNotice = (event) => {
            if (!event.detail?.text) return;
            setChatNotice(event.detail);
            window.clearTimeout(noticeTimer);
            noticeTimer = window.setTimeout(() => setChatNotice(null), 5000);
        };
        const handleEmoteNotice = (event) => {
            if (!event.detail?.emoteKey) return;
            setEmoteNotice(event.detail);
            window.clearTimeout(emoteTimer);
            emoteTimer = window.setTimeout(() => setEmoteNotice(null), 2800);
        };
        window.addEventListener('game-chat-unread', handleUnread);
        window.addEventListener('game-chat-opened', handleOpened);
        window.addEventListener('game-chat-notice', handleChatNotice);
        window.addEventListener('game-emote-notice', handleEmoteNotice);

        return () => {
            window.removeEventListener('game-chat-unread', handleUnread);
            window.removeEventListener('game-chat-opened', handleOpened);
            window.removeEventListener('game-chat-notice', handleChatNotice);
            window.removeEventListener('game-emote-notice', handleEmoteNotice);
            window.clearTimeout(noticeTimer);
            window.clearTimeout(emoteTimer);
        };
    }, []);

    const displayTitle = gameId && GAME_TITLES[gameId] ? GAME_TITLES[gameId] : title;

    const handleToggleMute = () => {
        const next = toggleMute();
        setMutedState(next);
        if (!next) playSound('click');
    };

    const opp = oppProfile || { nickname: 'الخصم', avatar: 'alien' };

    return (
        <div className="game-topbar w-full max-w-lg mx-auto px-3 py-2 flex flex-col gap-2 relative z-20">
            {/* Top Bar: Leave button, Game Title, Mute Toggle */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onLeave}
                    className="glass-card w-11 h-11 flex items-center justify-center rounded-2xl hover:scale-105 active:scale-95 transition-all text-white/80 hover:text-white"
                    title={backTitle}
                >
                    <ArrowRight size={18} />
                </button>

                <div className="flex items-center gap-2 glass-card px-3.5 py-1.5 rounded-2xl border border-white/10 shrink-0">
                    {gameId ? (
                        <GameIcon gameId={gameId} size={18} className="text-[var(--accent)]" />
                    ) : gameEmoji && typeof gameEmoji === 'string' && gameEmoji.length > 2 ? (
                        <GameIcon gameId={gameEmoji} size={18} className="text-[var(--accent)]" />
                    ) : null}
                    <span className="game-screen-heading text-xs font-black gradient-text">{displayTitle}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {showChatButton && <button
                        onClick={() => {
                            setHasUnread(false);
                            setChatNotice(null);
                            window.dispatchEvent(new CustomEvent('toggle-game-chat'));
                        }}
                        className="glass-card w-11 h-11 flex items-center justify-center rounded-2xl hover:scale-105 active:scale-95 transition-all text-[var(--accent)] relative"
                        title="المحادثة والتفاعلات"
                    >
                        <MessageCircle size={18} />
                        {hasUnread && (
                            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
                            </span>
                        )}
                    </button>}

                    <button
                        onClick={handleToggleMute}
                        className="glass-card w-11 h-11 flex items-center justify-center rounded-2xl hover:scale-105 active:scale-95 transition-all text-white/80 hover:text-white"
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
                    ${(turnsActive && (simultaneous || isMyTurn)) ? 'border-2 border-[var(--accent)] bg-[var(--accent-soft)] shadow-[0_0_20px_var(--accent-glow)]' : 'border border-white/5 opacity-75'}`}
                >
                    {/* Score Badge */}
                    {myScore !== null && (
                        <span className="game-score-value text-sm font-black text-[var(--accent)] font-mono bg-[var(--accent-soft)] px-2 py-1 rounded-xl shrink-0 min-w-[28px] text-center">
                            {myScore}
                        </span>
                    )}
                    {/* Avatar */}
                    <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10">
                            <AvatarDisplay avatarId={myProfile.avatar} size={28} />
                        </div>
                    </div>
                    {/* Name + Status */}
                    <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs font-black truncate">{myProfile.nickname || 'أنت'}</span>
                        <span className={`text-[10px] font-bold leading-tight mt-0.5 flex items-center gap-1 ${
                            (turnsActive && (simultaneous || isMyTurn)) ? 'text-[var(--accent)] font-black' : 'opacity-40'
                        }`}>
                            {!turnsActive ? (
                                <span>إعداد الجولة</span>
                            ) : simultaneous ? (
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
                    ${(turnsActive && (simultaneous || !isMyTurn)) ? 'border-2 border-sky-400/80 bg-sky-500/10 shadow-[0_0_20px_rgba(56,189,248,0.25)]' : 'border border-white/5 opacity-75'}`}
                >
                    {/* Name + Status */}
                    <div className="flex flex-col min-w-0 flex-1 items-end text-right">
                        <span className="text-xs font-black truncate">{opp.nickname || 'الخصم'}</span>
                        <span className={`text-[10px] font-bold leading-tight mt-0.5 flex items-center gap-1 ${
                            (turnsActive && (simultaneous || !isMyTurn)) ? 'text-sky-400 font-black' : 'opacity-40'
                        }`}>
                            {!turnsActive ? (
                                <span>إعداد الجولة</span>
                            ) : simultaneous ? (
                                <><span>بيكتب الآن</span><IconTarget size={11} className="shrink-0" /></>
                            ) : !isMyTurn ? (
                                <><span>دوره الآن</span><IconHourglass size={11} className="shrink-0" /></>
                            ) : (
                                <span>مستعد</span>
                            )}
                        </span>
                    </div>
                    {/* Avatar */}
                    <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10">
                            <AvatarDisplay avatarId={opp.avatar} size={28} />
                        </div>
                    </div>
                    {/* Score Badge */}
                    {oppScore !== null && (
                        <span className="game-score-value text-sm font-black text-sky-400 font-mono bg-sky-400/10 px-2 py-1 rounded-xl shrink-0 min-w-[28px] text-center">
                            {oppScore}
                        </span>
                    )}
                </div>
            </div>

            {showChatButton && emoteNotice && (
                <div
                    role="status"
                    className={`flex items-center gap-2.5 rounded-2xl border px-3 py-2 shadow-lg animate-pop-in ${
                        emoteNotice.isMine
                            ? 'border-[var(--accent)]/25 bg-[var(--accent-soft)]'
                            : 'themed-opponent-bubble'
                    }`}
                >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/25">
                        <EmoteDisplay emoteId={emoteNotice.emoteKey} size={30} />
                    </div>
                    <div className="min-w-0 flex-1 text-right">
                        <p className="text-[10px] font-black text-white">{emoteNotice.sender}</p>
                        <p className="text-[10px] font-bold text-white/55">بعت تفاعل</p>
                    </div>
                    <div className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent)] animate-pulse" />
                </div>
            )}

            {showChatButton && chatNotice && (
                <div
                    role="status"
                    className={`flex items-start gap-2.5 rounded-2xl border px-3 py-2.5 shadow-lg animate-pop-in ${
                        chatNotice.isMine
                            ? 'border-[var(--accent)]/30 bg-[var(--accent-soft)]'
                            : 'themed-opponent-bubble'
                    }`}
                >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/35">
                        <AvatarDisplay avatarId={chatNotice.avatar} size={23} />
                    </div>
                    <div className="min-w-0 flex-1 text-right">
                        <p className={`mb-0.5 text-[10px] font-black ${chatNotice.isMine ? 'text-[var(--accent)]' : 'text-[var(--accent-secondary)]'}`}>
                            {chatNotice.sender}
                        </p>
                        <p className="break-words text-xs font-bold leading-snug text-white" dir="auto">
                            {chatNotice.text}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setChatNotice(null)}
                        aria-label="إغلاق الرسالة"
                        className="game-topbar-close mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-white/45 transition hover:bg-white/10 hover:text-white"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Optional Status Banner */}
            {statusText && (
                <div className="text-center text-[11px] font-bold opacity-75 -mt-1">
                    {statusText}
                </div>
            )}
        </div>
    );
}
