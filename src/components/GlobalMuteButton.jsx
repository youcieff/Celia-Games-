import React, { useState, useEffect } from 'react';
import Volume2 from 'lucide-react/dist/esm/icons/volume-2';
import VolumeX from 'lucide-react/dist/esm/icons/volume-x';
import { getMuted, toggleMute, playSound } from '../lib/audioEngine';

export default function GlobalMuteButton() {
    const [muted, setMutedState] = useState(() => getMuted());

    useEffect(() => {
        const interval = setInterval(() => {
            if (getMuted() !== muted) {
                setMutedState(getMuted());
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [muted]);

    const handleToggleMute = () => {
        const next = toggleMute();
        setMutedState(next);
        if (!next) playSound('click');
    };

    return (
        <button
            onClick={handleToggleMute}
            className="fixed bottom-6 left-6 z-[9999] glass-card w-12 h-12 flex items-center justify-center rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all text-white/80 hover:text-white"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
            title={muted ? 'تفعيل الصوت' : 'كتم الصوت'}
        >
            {muted ? <VolumeX size={20} className="text-rose-400" /> : <Volume2 size={20} className="text-emerald-400" />}
        </button>
    );
}
