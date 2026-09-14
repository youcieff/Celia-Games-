import React, { useState, useEffect, useRef } from 'react';
import { playSound, playHaptic } from '../lib/audioEngine';
import { EMOTES, EmoteDisplay } from './icons/EmoteIcons';

export default function EmotesOverlay({ conn }) {
    const [isOpen, setIsOpen] = useState(false);
    const [floatingEmotes, setFloatingEmotes] = useState([]);
    const emoteId = useRef(0);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!conn) return;

        const handleData = (msg) => {
            if (msg.type === 'emote') {
                triggerEmote(msg.emoteId || msg.emoji, false);
            }
        };

        conn.on('data', handleData);
        return () => conn.off('data', handleData);
    }, [conn]);

    const triggerEmote = (emoteKey, isMine) => {
        const id = emoteId.current++;
        setFloatingEmotes(prev => [...prev, { id, emoteKey, isMine }]);
        playSound('pop');
        if (!isMine) playHaptic(20);

        setTimeout(() => {
            setFloatingEmotes(prev => prev.filter(e => e.id !== id));
        }, 3000);
    };

    const sendEmote = (emoteKey) => {
        triggerEmote(emoteKey, true);
        conn?.send({ type: 'emote', emoteId: emoteKey });
        setIsOpen(false);
    };

    return (
        <div className="absolute inset-0 pointer-events-none z-[100] overflow-hidden" ref={containerRef}>

            {/* Floating Emotes Layer */}
            {floatingEmotes.map(emote => (
                <div
                    key={emote.id}
                    className="absolute animate-float-up pointer-events-none transition-transform"
                    style={{
                        left: emote.isMine ? '75%' : '15%',
                        bottom: '22%',
                        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))'
                    }}
                >
                    <EmoteDisplay emoteId={emote.emoteKey} size={54} />
                </div>
            ))}

            {/* Emote Button & Menu */}
            {conn && (
                <div className="absolute bottom-20 right-4 sm:bottom-24 sm:right-6 pointer-events-auto flex flex-col items-end gap-2">
                    {isOpen && (
                        <div className="glass-card p-3 rounded-3xl grid grid-cols-4 gap-2 mb-2 animate-pop-in origin-bottom-right border border-white/10 shadow-2xl backdrop-blur-xl bg-black/60">
                            {EMOTES.map(item => {
                                const Component = item.Component;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => sendEmote(item.id)}
                                        className="w-11 h-11 flex items-center justify-center rounded-2xl hover:scale-115 active:scale-95 transition-transform hover:bg-white/10"
                                        title={item.label}
                                    >
                                        <Component size={32} />
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="w-12 h-12 rounded-full glass-card flex items-center justify-center text-[var(--accent)] hover:scale-110 active:scale-95 transition-all shadow-[0_0_16px_var(--accent-glow)] border border-white/10 hover:border-[var(--accent)]"
                        title="إرسال تفاعل"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}
