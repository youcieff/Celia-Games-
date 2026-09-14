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
            className="theme-button w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-md select-none shrink-0 border border-white/15"
            title={isGirly ? 'التبديل إلى مود ولادي' : 'التبديل إلى مود بناتي'}
            aria-label="تبديل الثيم"
        >
            {isGirly
                ? <Heart size={16} className="fill-current animate-pulse-slow" />
                : <Shield size={16} className="fill-current" />
            }
        </button>
    );
}
