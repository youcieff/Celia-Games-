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
            className="theme-button h-11 px-3.5 rounded-2xl flex items-center gap-1.5 font-black text-xs transition-all duration-300 shadow-md select-none shrink-0 border border-white/10"
            title={isGirly ? 'التبديل إلى مود ولادي' : 'التبديل إلى مود بناتي'}
            aria-label="تبديل الثيم"
        >
            {isGirly ? (
                <>
                    <Heart size={14} className="fill-current animate-pulse-slow shrink-0" />
                    <span className="whitespace-nowrap leading-none">بناتي</span>
                </>
            ) : (
                <>
                    <Shield size={14} className="fill-current shrink-0" />
                    <span className="whitespace-nowrap leading-none">ولادي</span>
                </>
            )}
        </button>
    );
}
