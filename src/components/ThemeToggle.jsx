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
            className="theme-button hub-theme-toggle h-10 px-3 rounded-2xl flex items-center gap-1.5 transition-all duration-300 select-none shrink-0 border active:scale-95 text-xs font-black"
            title={isGirly ? 'التبديل إلى مود ولادي' : 'التبديل إلى مود بناتي'}
            aria-label="تبديل الثيم"
        >
            {isGirly ? (
                <>
                    <Heart size={14} className="fill-current text-[var(--accent)] shrink-0" />
                    <span>بناتي</span>
                </>
            ) : (
                <>
                    <Shield size={14} className="text-[var(--accent-secondary)] shrink-0" />
                    <span>ولادي</span>
                </>
            )}
        </button>
    );
}
