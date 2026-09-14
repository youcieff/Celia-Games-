import React from 'react';
import { useTheme } from '../context/ThemeContext';
import logoImg from '../assets/logo.png';

export default function Logo({ size = 'large' }) {
    const { theme } = useTheme();
    const isSmall = size === 'small';

    const imageStyle = theme === 'girly'
        ? { filter: 'drop-shadow(0 0 10px rgba(255, 61, 138, 0.45))' }
        : { filter: 'drop-shadow(0 0 10px rgba(46, 107, 255, 0.45))' };

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
            {!isSmall && (
                <span
                    className="gradient-text text-sm sm:text-base leading-none font-black tracking-tight drop-shadow-sm whitespace-nowrap"
                >
                    ألعاب سيليا
                </span>
            )}
        </div>
    );
}
