import React from 'react';
import { useTheme } from '../context/ThemeContext';
import Heart from 'lucide-react/dist/esm/icons/heart';
import Shield from 'lucide-react/dist/esm/icons/shield';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    const isGirly = theme === 'girly';

    return (
        <button
            onClick={toggleTheme}
            className={`h-10 px-3 rounded-2xl flex items-center gap-1.5 transition-all duration-300 shadow-md select-none shrink-0 border active:scale-95 text-xs font-black ${
                isGirly
                    ? 'border-pink-400/30 bg-pink-500/15 text-pink-300 hover:bg-pink-500/25 shadow-[0_0_15px_rgba(244,114,182,0.25)]'
                    : 'border-sky-400/30 bg-sky-500/15 text-sky-300 hover:bg-sky-500/25 shadow-[0_0_15px_rgba(56,189,248,0.25)]'
            }`}
            title={isGirly ? 'التبديل إلى مود ولادي' : 'التبديل إلى مود بناتي'}
            aria-label="تبديل الثيم"
        >
            {isGirly ? (
                <>
                    <Heart size={14} className="fill-current text-pink-400 animate-pulse-slow shrink-0" />
                    <span>بناتي</span>
                </>
            ) : (
                <>
                    <Shield size={14} className="fill-current text-sky-400 shrink-0" />
                    <span>ولادي</span>
                </>
            )}
        </button>
    );
}
