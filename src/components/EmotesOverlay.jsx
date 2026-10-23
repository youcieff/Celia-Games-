import React, { useState, useEffect, useRef } from 'react';
import { playSound, playHaptic } from '../lib/audioEngine';
import { EMOTES, EmoteDisplay } from './icons/EmoteIcons';
import { AvatarDisplay } from './icons/AvatarIcons';
import useProfile from '../hooks/useProfile';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import Send from 'lucide-react/dist/esm/icons/send';
import X from 'lucide-react/dist/esm/icons/x';
import Smile from 'lucide-react/dist/esm/icons/smile';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';

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
    const [localUnread, setLocalUnread] = useState(false);
    useEffect(() => {
        const handleUnread = () => setLocalUnread(true);
        const handleOpened = () => setLocalUnread(false);
        window.addEventListener('game-chat-unread', handleUnread);
        window.addEventListener('game-chat-opened', handleOpened);
        return () => {
            window.removeEventListener('game-chat-unread', handleUnread);
            window.removeEventListener('game-chat-opened', handleOpened);
        };
    }, []);

    return (
        <button
            onClick={onClick}
            className={`glass-card w-10 h-10 flex items-center justify-center rounded-2xl hover:scale-105 active:scale-95 transition-all text-[var(--accent)] relative border border-white/10 shrink-0 ${className}`}
            title="المحادثة والتفاعلات"
        >
            <MessageCircle size={18} />
            {(hasUnread || localUnread) && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
                </span>
            )}
        </button>
    );
}

export function GameNotifications({ className = '' }) {
    const [notice, setNotice] = useState(null);
    const timerRef = useRef(null);

    useEffect(() => {
        const showNotice = (type, event) => {
            const detail = event.detail;
            if (type === 'chat' ? !detail?.text : !detail?.emoteKey) return;
            setNotice({ ...detail, type });
            window.clearTimeout(timerRef.current);
            timerRef.current = window.setTimeout(() => setNotice(null), type === 'chat' ? 5200 : 3400);
        };
        const handleChat = event => showNotice('chat', event);
        const handleEmote = event => showNotice('emote', event);
        window.addEventListener('game-chat-notice', handleChat);
        window.addEventListener('game-emote-notice', handleEmote);
        return () => {
            window.removeEventListener('game-chat-notice', handleChat);
            window.removeEventListener('game-emote-notice', handleEmote);
            window.clearTimeout(timerRef.current);
        };
    }, []);

    if (!notice) return null;

    const isChat = notice.type === 'chat';
    return (
        <div
            role="status"
            aria-live="polite"
            className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 shadow-xl animate-pop-in ${className}`}
            style={{
                background: isChat
                    ? 'linear-gradient(135deg, #17202d 0%, #10151e 100%)'
                    : 'linear-gradient(135deg, #201a2d 0%, #14131c 100%)',
                borderColor: isChat ? 'color-mix(in srgb, var(--accent) 45%, #283243)' : 'rgba(192, 132, 252, 0.38)'
            }}
        >
            {isChat ? (
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/35">
                    <AvatarDisplay avatarId={notice.avatar} size={29} />
                    <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full border border-[#17202d] bg-[var(--accent)] text-white">
                        <MessageCircle size={9} aria-hidden="true" />
                    </span>
                </div>
            ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-purple-300/20 bg-purple-400/10">
                    <EmoteDisplay emoteId={notice.emoteKey} size={29} />
                </div>
            )}
            <div className="min-w-0 flex-1 text-right">
                <div className="mb-0.5 flex items-center gap-1.5">
                    {isChat ? <MessageCircle size={12} className="text-[var(--accent)]" /> : <Sparkles size={12} className="text-purple-300" />}
                    <p className="truncate text-[10px] font-black text-white/90">
                        {isChat ? (notice.isMine ? 'رسالتك' : `رسالة من ${notice.sender || 'الخصم'}`) : (notice.isMine ? 'تفاعلك' : `تفاعل من ${notice.sender || 'الخصم'}`)}
                    </p>
                </div>
                {isChat ? (
                    <p className="break-words text-xs font-bold leading-snug text-white" dir="auto">{notice.text}</p>
                ) : (
                    <p className="text-[10px] font-bold text-white/55">تفاعل سريع في اللعبة</p>
                )}
            </div>
            <button
                type="button"
                onClick={() => { window.clearTimeout(timerRef.current); setNotice(null); }}
                aria-label="إغلاق الإشعار"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/45 transition hover:bg-white/10 hover:text-white"
            >
                <X size={14} />
            </button>
        </div>
    );
}

export default function EmotesOverlay({
    conn,
    oppProfile = null,
    showStandaloneButton = false,
    buttonPosition = 'top-left',
    simulateAIReplies = true,
    initialTab = 'messages',
    keepChatOpenOnSend = true,
    pendingGameQuestion = null,
    canAnswerGameQuestion = false,
    onAnswerGameQuestion = null
}) {
    const [myProfile] = useProfile();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(initialTab); // 'emotes' | 'messages'
    const [inputText, setInputText] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [hasUnread, setHasUnread] = useState(false);
    const itemId = useRef(0);
    const inputRef = useRef(null);
    const chatEndRef = useRef(null);
    const isOpenRef = useRef(isOpen);

    useEffect(() => {
        isOpenRef.current = isOpen;
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && activeTab === 'messages') {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [chatHistory, isOpen, activeTab]);

    // Listen for custom toggle events dispatched from header buttons
    useEffect(() => {
        const handleToggle = () => {
            setIsOpen(prev => {
                const next = !prev;
                if (next) {
                    setHasUnread(false);
                    window.dispatchEvent(new CustomEvent('game-chat-opened'));
                }
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
            } else if (msg.type === 'whoami_question') {
                triggerChat(msg.text, false, oppProfile?.nickname, oppProfile?.avatar, { gameQuestion: true, questionId: msg.id, silentSound: true });
            } else if (msg.type === 'whoami_answer') {
                const answerText = msg.unsupported
                    ? 'الذكاء الاصطناعي لم يفهم السؤال؛ اسأل عن صفة واضحة.'
                    : `الإجابة: ${msg.answer === 'yes' ? 'أيوه' : 'لأ'}`;
                triggerChat(answerText, false, oppProfile?.nickname, oppProfile?.avatar, { gameAnswer: true, questionId: msg.questionId, silentSound: true });
            }
        };

        conn.on('data', handleData);
        return () => conn.off('data', handleData);
    }, [conn, oppProfile]);

    useEffect(() => {
        const handleWhoAmIMessage = (event) => {
            const message = event.detail;
            if (!message?.text) return;
            triggerChat(message.text, true, undefined, undefined, {
                gameQuestion: message.kind === 'question',
                gameAnswer: message.kind === 'answer',
                questionId: message.questionId,
                silentSound: true
            });
        };
        window.addEventListener('whoami-game-chat', handleWhoAmIMessage);
        return () => window.removeEventListener('whoami-game-chat', handleWhoAmIMessage);
    }, [myProfile]);

    const triggerEmote = (emoteKey, isMine, senderName, senderAvatar) => {
        const resolvedSender = isMine
            ? (myProfile.nickname || 'أنت')
            : (senderName || oppProfile?.nickname || 'الخصم');
        const resolvedAvatar = isMine
            ? myProfile.avatar
            : (senderAvatar || oppProfile?.avatar || 'alien');

        window.dispatchEvent(new CustomEvent('game-emote-notice', {
            detail: { emoteKey, isMine, sender: resolvedSender, avatar: resolvedAvatar }
        }));

        playSound('pop');
        if (!isMine) {
            playHaptic(20);
            if (!isOpenRef.current) {
                setHasUnread(true);
                window.dispatchEvent(new CustomEvent('game-chat-unread'));
            }
        }

    };

    const triggerChat = (text, isMine, senderName, senderAvatar, metadata = {}) => {
        const { silentSound = false, ...messageMetadata } = metadata;
        const id = itemId.current++;
        const resolvedSender = isMine
            ? (myProfile.nickname || 'أنت')
            : (senderName || oppProfile?.nickname || 'الخصم');
        const resolvedAvatar = isMine
            ? myProfile.avatar
            : (senderAvatar || oppProfile?.avatar || 'alien');

        const message = {
            id,
            text,
            isMine,
            sender: resolvedSender,
            avatar: resolvedAvatar,
            sentAt: Date.now(),
            ...messageMetadata
        };
        setChatHistory(prev => [...prev.slice(-39), message]);
        if (isOpenRef.current) setActiveTab('messages');

        // If the chat is closed, show a short notice in the shared header.
        // When it is open, the full conversation is already visible there.
        if (!isOpenRef.current || !keepChatOpenOnSend) {
            window.dispatchEvent(new CustomEvent('game-chat-notice', { detail: message }));
        }

        if (!silentSound) playSound('pop');
        if (!isMine) {
            playHaptic(25);
            if (!isOpenRef.current) {
                setHasUnread(true);
                window.dispatchEvent(new CustomEvent('game-chat-unread'));
            }
        }
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
        if (simulateAIReplies) simulateAIReply('emote');
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
        if (!keepChatOpenOnSend) setIsOpen(false);

        // Offline AI reply reaction
        if (simulateAIReplies) simulateAIReply('chat');
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
            {/* ── Chat & Emotes Modal / Sheet ── */}
            {isOpen && (
                <div className="safe-area-bottom-sheet fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-[#07090e]/90 p-0 backdrop-blur-md animate-fade-in pointer-events-auto sm:p-4"
                     onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
                    <div
                        className="flex max-h-[min(84dvh,760px)] w-full flex-col gap-4 overflow-hidden rounded-t-3xl border border-white/10 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.7)] animate-slide-up sm:max-h-[82vh] sm:max-w-md sm:rounded-3xl"
                        style={{ background: 'linear-gradient(180deg, #171c26 0%, #10141c 48%, #0d1118 100%)', backdropFilter: 'none' }}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
                            <div className="flex items-center gap-2">
                                <span className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/10 text-[var(--accent)]">
                                    <MessageCircle size={19} />
                                </span>
                                <div>
                                    <h3 className="text-sm font-black text-white">المحادثة والتفاعلات</h3>
                                    <p className="mt-0.5 text-[10px] font-bold text-white/45">رسائلكم وتفاعلاتكم في مكان واحد</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                aria-label="إغلاق المحادثة"
                                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/65 transition hover:bg-white/10 hover:text-white active:scale-90"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Tabs Switcher */}
                        <div className="flex rounded-xl border border-white/10 bg-[#0a0d13] p-1">
                            <button
                                onClick={() => setActiveTab('emotes')}
                                className={`flex-1 rounded-lg py-2 text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                                    activeTab === 'emotes' ? 'bg-[#252b36] text-white shadow-inner' : 'text-white/50 hover:text-white/85'
                                }`}
                            >
                                <Smile size={14} />
                                <span>التفاعلات</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('messages')}
                                className={`flex-1 rounded-lg py-2 text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                                    activeTab === 'messages' ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/15' : 'text-white/50 hover:text-white/85'
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
                                            className="h-16 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#1b212c] transition hover:-translate-y-0.5 hover:border-purple-300/30 hover:bg-[#252332] active:scale-95"
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
                            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
                                <div
                                    role="log"
                                    aria-live="polite"
                                    className="flex min-h-32 flex-1 flex-col gap-2.5 overflow-y-auto rounded-2xl border border-white/10 bg-[#090c12] p-3 custom-scrollbar"
                                >
                                    {chatHistory.length === 0 ? (
                                        <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center text-white/45">
                                            <span className="mb-1 grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-[#151a23] text-white/45"><MessageCircle size={20} /></span>
                                            <p className="text-xs font-black text-white/65">المحادثة لسه فاضية</p>
                                            <p className="text-[10px] font-bold">اكتب رسالة وابدأ الكلام</p>
                                        </div>
                                    ) : chatHistory.map(message => (
                                        <div key={message.id} className={`flex ${message.isMine ? 'justify-end' : 'justify-start'}`}>
                                            <div
                                                className={`max-w-[88%] rounded-2xl border px-3.5 py-2.5 text-white shadow-md ${message.isMine ? 'rounded-br-md border-[var(--accent)]/35' : 'rounded-bl-md border-sky-300/20'}`}
                                                style={{ background: message.isMine ? 'color-mix(in srgb, var(--accent) 20%, #111720)' : '#19222e' }}
                                            >
                                                <p className={`mb-1 flex items-center gap-1.5 text-[9px] font-black ${message.isMine ? 'text-[var(--accent)]' : 'text-sky-300'}`}>
                                                    {message.isMine ? 'أنت' : message.sender}
                                                    <span className="font-medium text-white/35">· {new Date(message.sentAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </p>
                                                <p className="break-words text-[13px] font-bold leading-relaxed" dir="auto">{message.text}</p>
                                                {message.gameQuestion && canAnswerGameQuestion && pendingGameQuestion?.id === message.questionId && (
                                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                                        <button type="button" onClick={() => onAnswerGameQuestion?.('yes')} className="rounded-lg bg-emerald-500 px-3 py-2 text-[11px] font-black text-slate-950">أيوه</button>
                                                        <button type="button" onClick={() => onAnswerGameQuestion?.('no')} className="rounded-lg bg-rose-500 px-3 py-2 text-[11px] font-black text-white">لأ</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Custom text input */}
                                <form
                                    onSubmit={(e) => { e.preventDefault(); handleSendChat(inputText); }}
                                    className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#080b11] p-1.5 transition-colors focus-within:border-[var(--accent)]/65"
                                >
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        maxLength={50}
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        placeholder={oppProfile?.isAI || oppProfile?.avatar === 'robot' ? 'اسألني عن بطاقتي...' : 'اكتب رسالتك...'}
                                        className="flex-1 bg-transparent px-3 py-2 text-sm font-bold outline-none text-white placeholder:text-white/35"
                                        dir="auto"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!inputText.trim()}
                                        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20 transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                                    >
                                        <Send size={15} />
                                    </button>
                                </form>

                                {/* Quick Phrases Chips */}
                                <div className="flex flex-col gap-1.5">
                                    <span className="px-1 text-[10px] font-black text-white/45">عبارات سريعة</span>
                                    <div className="grid max-h-28 grid-cols-2 gap-1.5 overflow-y-auto pr-1">
                                        {QUICK_PHRASES.map((phrase, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleSendChat(phrase)}
                                                className="truncate rounded-xl border border-white/10 bg-[#171d27] px-2.5 py-2 text-right text-[11px] font-bold text-white/75 transition hover:border-white/20 hover:bg-[#222a36] hover:text-white active:scale-[0.98]"
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
