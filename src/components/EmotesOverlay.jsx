import React, { useState, useEffect, useRef } from 'react';
import { playSound, playHaptic } from '../lib/audioEngine';

const EMOTES = ['😎', '😡', '😂', '🤯', '👍', '👎', '💔', '🎉'];

export default function EmotesOverlay({ conn }) {
    const [isOpen, setIsOpen] = useState(false);
    const [floatingEmotes, setFloatingEmotes] = useState([]);
    const emoteId = useRef(0);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!conn) return;

        const handleData = (msg) => {
            if (msg.type === 'emote') {
                triggerEmote(msg.emoji, false);
            }
        };

        conn.on('data', handleData);
        return () => conn.off('data', handleData);
    }, [conn]);

    const triggerEmote = (emoji, isMine) => {
        const id = emoteId.current++;
        setFloatingEmotes(prev => [...prev, { id, emoji, isMine }]);
        playSound('pop');
        if (!isMine) playHaptic(20);

        setTimeout(() => {
            setFloatingEmotes(prev => prev.filter(e => e.id !== id));
        }, 3000);
    };

    const sendEmote = (emoji) => {
        triggerEmote(emoji, true);
        conn?.send({ type: 'emote', emoji });
        setIsOpen(false);
    };

    return (
        <div className="absolute inset-0 pointer-events-none z-[100] overflow-hidden" ref={containerRef}>

            {/* Floating Emotes Layer */}
            {floatingEmotes.map(emote => (
                <div
                    key={emote.id}
                    className="absolute text-5xl animate-float-up pointer-events-none"
                    style={{
                        left: emote.isMine ? '80%' : '10%',
                        bottom: '20%',
                        filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))'
                    }}
                >
                    {emote.emoji}
                </div>
            ))}

            {/* Emote Button & Menu */}
            {conn && (
                <div className="absolute bottom-6 right-4 pointer-events-auto flex flex-col items-end gap-2">
                    {isOpen && (
                        <div className="glass-card p-3 rounded-2xl grid grid-cols-4 gap-2 mb-2 animate-pop-in origin-bottom-right">
                            {EMOTES.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => sendEmote(emoji)}
                                    className="w-10 h-10 text-2xl flex items-center justify-center hover:scale-125 transition-transform"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="w-12 h-12 rounded-full glass-card flex items-center justify-center text-2xl hover:scale-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                    >
                        💬
                    </button>
                </div>
            )}
        </div>
    );
}
