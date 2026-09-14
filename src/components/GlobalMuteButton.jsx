import React, { useState, useEffect } from 'react';
import Volume2 from 'lucide-react/dist/esm/icons/volume-2';
import VolumeX from 'lucide-react/dist/esm/icons/volume-x';
import { getMuted, toggleMute, playSound, playHaptic } from '../lib/audioEngine';

export default function GlobalMuteButton({ className = '' }) {
    const [muted, setMutedState] = useState(() => getMuted());

    useEffect(() => {
        const interval = setInterval(() => {
            if (getMuted() !== muted) {
                setMutedState(getMuted());
            }
        }, 800);
        return () => clearInterval(interval);
    }, [muted]);

    const handleToggleMute = (e) => {
        e?.stopPropagation();
        const next = toggleMute();
        setMutedState(next);
        playHaptic(15);
        if (!next) playSound('click');
    };

    return (
        <button
            onClick={handleToggleMute}
            className={`glass-card w-10 h-10 flex items-center justify-center rounded-2xl hover:scale-105 active:scale-95 transition-all select-none shrink-0 border border-white/10 ${
                muted ? 'border-rose-500/30 text-rose-400 bg-rose-500/10 shadow-[0_0_10px_rgba(244,63,94,0.2)]' : 'text-emerald-400 hover:text-emerald-300'
            } ${className}`}
            title={muted ? 'تفعيل الصوت' : 'كتم الصوت'}
            aria-label={muted ? 'تفعيل الصوت' : 'كتم الصوت'}
        >
            {muted ? <VolumeX size={19} className="text-rose-400" /> : <Volume2 size={19} className="text-emerald-400" />}
        </button>
    );
}
