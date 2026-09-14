import React from 'react';
import { useTheme } from '../context/ThemeContext';
import logoImg from '../assets/logo.png';

export default function Logo({ size = 'large' }) {
    const { theme } = useTheme();
    const isSmall = size === 'small';

    const imageStyle = theme === 'girly'
        ? { filter: 'drop-shadow(0 0 14px rgba(255, 61, 138, 0.55))' }
        : { filter: 'drop-shadow(0 0 14px rgba(46, 107, 255, 0.55))' };

    return (
        <div className="flex items-center gap-3 font-black tracking-tight select-none shrink-0">
            <div
                className={`flex items-center justify-center ${
                    isSmall
                        ? 'w-12 h-12 sm:w-14 sm:h-14 rounded-2xl'
                        : 'w-16 h-16 sm:w-20 sm:h-20 rounded-3xl'
                } shrink-0 overflow-hidden shadow-xl transition-all duration-300 hover:scale-105 border border-white/20 bg-white/5 p-0.5`}
                style={imageStyle}
            >
                <img
                    src={logoImg}
                    alt="Celia Games Logo"
                    className="w-full h-full object-contain"
                />
            </div>
            {!isSmall && (
                <span
                    className="gradient-text text-base sm:text-lg leading-none font-black tracking-tight drop-shadow-md whitespace-nowrap"
                >
                    ألعاب سيليا
                </span>
            )}
        </div>
    );
}
