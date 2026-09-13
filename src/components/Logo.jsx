import React from 'react';
import { useTheme } from '../context/ThemeContext';
import logoImg from '../assets/logo.png';

export default function Logo({ size = 'large' }) {
    const { theme } = useTheme();
    const isSmall = size === 'small';

    const imageStyle = theme === 'dark'
        ? { filter: 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.4))' }
        : { filter: 'drop-shadow(0 0 6px rgba(0, 0, 0, 0.25))' };

    return (
        <div className="flex items-center gap-2.5 font-black tracking-tight select-none shrink-0">
            <div
                className={`flex items-center justify-center ${
                    isSmall ? 'w-10 h-10 rounded-xl' : 'w-11 h-11 rounded-2xl'
                } shrink-0 overflow-hidden shadow-lg transition-transform hover:scale-105 border border-white/15 bg-white/5`}
                style={imageStyle}
            >
                <img
                    src={logoImg}
                    alt="Celia Games Logo"
                    className="w-full h-full object-cover scale-[1.05]"
                />
            </div>
            <span
                className={`gradient-text ${
                    isSmall ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
                } leading-none font-black tracking-tight drop-shadow-sm whitespace-nowrap`}
            >
                ألعاب سيليا
            </span>
        </div>
    );
}
