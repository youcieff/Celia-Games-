import React, { useState, useEffect, useRef } from 'react';
import { playSound, playHaptic } from '../lib/audioEngine';
import { EMOTES, EmoteDisplay } from './icons/EmoteIcons';
import { AvatarDisplay } from './icons/AvatarIcons';
import useProfile from '../hooks/useProfile';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import Send from 'lucide-react/dist/esm/icons/send';
import X from 'lucide-react/dist/esm/icons/x';
import Smile from 'lucide-react/dist/esm/icons/smile';

const QUICK_PHRASES = [
    'عاش يا بطل! 👏',
    'حظك حلو المره دي 😉',
    'ركز معايا بقى! 🔥',
    'لعبة جامدة والله! 🎯',
    'جولة كمان؟ 🔄',
    'استنى ثانية ⏳',
    'هكسبك المرة دي! 🏆',
    'شكراً على اللعبة! 🤝',
    'بتفكر في إيه؟ 🤔',
    'سرّع شوية يا كابتن! ⚡'
];

const AI_REPLIES = [
    'شكراً يا فنان! ركز في دورك بقى 😉',
    'الذكاء الاصطناعي في كامل تركيزه! 🤖',
    'تحدي قوي والله، عاش! 🎯',
    'هنشوف مين هيكسب في الآخر! 🏆',
    'متحمس جداً للجولة دي! 🔥',
    'حركتك ذكية، بس استنى حركتي! 🧠'
];

/**
 * Reusable ChatTriggerButton that can be placed in any game header bar next to Mute
 */
export function ChatTriggerButton({ onClick, hasUnread = false, className = '' }) {
    return (
        <button
            onClick={onClick}
            className={`glass-card w-10 h-10 flex items-center justify-center rounded-2xl hover:scale-105 active:scale-95 transition-all text-[var(--accent)] relative border border-white/10 shrink-0 ${className}`}
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
    );
}

export default function EmotesOverlay({ conn, oppProfile = null, showStandaloneButton = false, buttonPosition = 'top-left' }) {
    const [myProfile] = useProfile();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('emotes'); // 'emotes' | 'messages'
    const [inputText, setInputText] = useState('');
    const [floatingItems, setFloatingItems] = useState([]);
    const [hasUnread, setHasUnread] = useState(false);
    const itemId = useRef(0);
    const inputRef = useRef(null);

    // Listen for custom toggle events dispatched from header buttons
    useEffect(() => {
        const handleToggle = () => {
            setIsOpen(prev => {
                const next = !prev;
                if (next) setHasUnread(false);
                return next;
            });
        };
        window.addEventListener('toggle-game-chat', handleToggle);
        return () => window.removeEventListener('toggle-game-chat', handleToggle);
    }, []);

    // Listen for incoming messages/emotes on connection
    useEffect(() => {
        if (!conn) return;

        const handleData = (msg) => {
            if (msg.type === 'emote') {
                triggerEmote(msg.emoteId || msg.emoji, false, msg.sender || oppProfile?.nickname, msg.avatar || oppProfile?.avatar);
            } else if (msg.type === 'chat') {
                triggerChat(msg.text, false, msg.sender || oppProfile?.nickname, msg.avatar || oppProfile?.avatar);
            }
        };

        conn.on('data', handleData);
        return () => conn.off('data', handleData);
    }, [conn, oppProfile]);

    const triggerEmote = (emoteKey, isMine, senderName, senderAvatar) => {
        const id = itemId.current++;
        const resolvedSender = isMine
            ? (myProfile.nickname || 'أنت')
            : (senderName || oppProfile?.nickname || 'الخصم');
        const resolvedAvatar = isMine
            ? myProfile.avatar
            : (senderAvatar || oppProfile?.avatar || 'alien');

        setFloatingItems(prev => [...prev, {
            id,
            type: 'emote',
            emoteKey,
            isMine,
            sender: resolvedSender,
            avatar: resolvedAvatar
        }]);

        playSound('pop');
        if (!isMine) {
            playHaptic(20);
            if (!isOpen) {
                setHasUnread(true);
                window.dispatchEvent(new CustomEvent('game-chat-unread'));
            }
        }

        setTimeout(() => {
            setFloatingItems(prev => prev.filter(e => e.id !== id));
        }, 3200);
    };

    const triggerChat = (text, isMine, senderName, senderAvatar) => {
        const id = itemId.current++;
        const resolvedSender = isMine
            ? (myProfile.nickname || 'أنت')
            : (senderName || oppProfile?.nickname || 'الخصم');
        const resolvedAvatar = isMine
            ? myProfile.avatar
            : (senderAvatar || oppProfile?.avatar || 'alien');

        setFloatingItems(prev => [...prev, {
            id,
            type: 'chat',
            text,
            isMine,
            sender: resolvedSender,
            avatar: resolvedAvatar
        }]);

        playSound('pop');
        if (!isMine) {
            playHaptic(25);
            if (!isOpen) {
                setHasUnread(true);
                window.dispatchEvent(new CustomEvent('game-chat-unread'));
            }
        }

        setTimeout(() => {
            setFloatingItems(prev => prev.filter(e => e.id !== id));
        }, 3800);
    };

    const handleSendEmote = (emoteKey) => {
        triggerEmote(emoteKey, true);
        conn?.send({
            type: 'emote',
            emoteId: emoteKey,
            sender: myProfile.nickname || 'أنت',
            avatar: myProfile.avatar
        });
        setIsOpen(false);

        // Offline AI reply reaction
        simulateAIReply('emote');
    };

    const handleSendChat = (text) => {
        const clean = (text || inputText).trim();
        if (!clean) return;

        triggerChat(clean, true);
        conn?.send({
            type: 'chat',
            text: clean,
            sender: myProfile.nickname || 'أنت',
            avatar: myProfile.avatar
        });
        setInputText('');
        setIsOpen(false);

        // Offline AI reply reaction
        simulateAIReply('chat');
    };

    const simulateAIReply = (kind) => {
        // Check if playing against AI (nickname or conn marker)
        const isAI = (oppProfile?.nickname || '').includes('الذكاء') || (oppProfile?.avatar === 'robot');
        if (!isAI) return;

        setTimeout(() => {
            if (kind === 'emote') {
                const randomEmote = EMOTES[Math.floor(Math.random() * EMOTES.length)].id;
                triggerEmote(randomEmote, false, 'الذكاء الاصطناعي', 'robot');
            } else {
                const randomMsg = AI_REPLIES[Math.floor(Math.random() * AI_REPLIES.length)];
                triggerChat(randomMsg, false, 'الذكاء الاصطناعي', 'robot');
            }
        }, 1000 + Math.random() * 500);
    };

    return (
        <>
            {/* ── Floating Notification Bubbles Layer (Pointer-events-none) ── */}
            <div className="fixed inset-0 pointer-events-none z-[110] overflow-hidden flex flex-col justify-end p-4">
                <div className="flex flex-col gap-2.5 max-w-sm mx-auto w-full mb-28">
                    {floatingItems.map(item => (
                        <div
                            key={item.id}
                            className={`flex items-end gap-2 transition-all animate-pop-in duration-300 ${
                                item.isMine ? 'justify-end' : 'justify-start'
                            }`}
                        >
                            {/* Opponent Avatar */}
                            {!item.isMine && (
                                <div className="w-8 h-8 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center overflow-hidden shadow-lg shrink-0">
                                    <AvatarDisplay avatarId={item.avatar} size={22} />
                                </div>
                            )}

                            {/* Bubble Content */}
                            {item.type === 'emote' ? (
                                <div className="glass-card p-2 rounded-2xl border border-white/15 shadow-2xl bg-black/70 backdrop-blur-xl animate-bounce-short">
                                    <EmoteDisplay emoteId={item.emoteKey} size={42} />
                                </div>
                            ) : (
                                <div className={`glass-card px-3.5 py-2 rounded-2xl border shadow-xl backdrop-blur-xl max-w-[230px] ${
                                    item.isMine
                                        ? 'bg-[var(--accent-soft)] border-[var(--accent)] text-white'
                                        : 'bg-black/75 border-sky-400/40 text-white'
                                }`}>
                                    <p className="text-[10px] font-black opacity-60 mb-0.5 leading-none">{item.sender}</p>
                                    <p className="text-xs font-bold leading-snug break-words">{item.text}</p>
                                </div>
                            )}

                            {/* My Avatar */}
                            {item.isMine && (
                                <div className="w-8 h-8 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center overflow-hidden shadow-lg shrink-0">
                                    <AvatarDisplay avatarId={item.avatar} size={22} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>



            {/* ── Chat & Emotes Modal / Sheet ── */}
            {isOpen && (
                <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in pointer-events-auto"
                     onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
                    <div className="glass-card w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl border border-white/15 shadow-2xl bg-black/85 backdrop-blur-2xl p-4 animate-slide-up flex flex-col gap-3.5 max-h-[80vh]">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2">
                                <MessageCircle size={18} className="text-[var(--accent)]" />
                                <h3 className="text-sm font-black">المحادثة والتفاعلات</h3>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all opacity-70 hover:opacity-100"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Tabs Switcher */}
                        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                            <button
                                onClick={() => setActiveTab('emotes')}
                                className={`flex-1 py-1.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                                    activeTab === 'emotes' ? 'bg-[var(--accent)] text-white shadow-md' : 'opacity-60 hover:opacity-100'
                                }`}
                            >
                                <Smile size={14} />
                                <span>التفاعلات</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('messages')}
                                className={`flex-1 py-1.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                                    activeTab === 'messages' ? 'bg-[var(--accent)] text-white shadow-md' : 'opacity-60 hover:opacity-100'
                                }`}
                            >
                                <MessageCircle size={14} />
                                <span>الرسائل</span>
                            </button>
                        </div>

                        {/* Tab Content: Emotes */}
                        {activeTab === 'emotes' && (
                            <div className="grid grid-cols-4 gap-2.5 py-1">
                                {EMOTES.map(item => {
                                    const Component = item.Component;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => handleSendEmote(item.id)}
                                            className="h-14 flex flex-col items-center justify-center rounded-2xl hover:scale-110 active:scale-95 transition-all bg-white/5 hover:bg-white/15 border border-white/5"
                                            title={item.label}
                                        >
                                            <Component size={34} />
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Tab Content: Messages */}
                        {activeTab === 'messages' && (
                            <div className="flex flex-col gap-3">
                                {/* Custom text input */}
                                <form
                                    onSubmit={(e) => { e.preventDefault(); handleSendChat(inputText); }}
                                    className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-2xl p-1.5 focus-within:border-[var(--accent)] transition-colors"
                                >
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        maxLength={50}
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        placeholder="اكتب رسالة سريعة..."
                                        className="flex-1 bg-transparent px-2.5 py-1.5 text-xs font-bold outline-none text-white placeholder:text-white/30"
                                        dir="auto"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!inputText.trim()}
                                        className="w-9 h-9 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all shrink-0"
                                    >
                                        <Send size={15} />
                                    </button>
                                </form>

                                {/* Quick Phrases Chips */}
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] font-black opacity-40 px-1">عبارات سريعة بنقرة واحدة:</span>
                                    <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                                        {QUICK_PHRASES.map((phrase, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleSendChat(phrase)}
                                                className="text-right px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/5 text-[11px] font-bold active:scale-95 transition-all truncate hover:border-white/20"
                                            >
                                                {phrase}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
