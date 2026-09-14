import React from 'react';
import { useTheme } from '../context/ThemeContext';
import logoImg from '../assets/logo.png';

export default function Logo({ size = 'large', className = '' }) {
    const { theme } = useTheme();
    const isSmall = size === 'small';

    const glowStyle = theme === 'girly'
        ? { filter: 'drop-shadow(0 0 16px rgba(255, 61, 138, 0.6)) drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }
        : { filter: 'drop-shadow(0 0 16px rgba(56, 189, 248, 0.6)) drop-shadow(0 4px 12px rgba(0,0,0,0.5))' };

    return (
        <div className={`flex items-center gap-2 select-none shrink-0 ${className}`}>
            <div
                className={`relative flex items-center justify-center transition-all duration-300 hover:scale-105 ${
                    isSmall
                        ? 'w-16 h-16 sm:w-20 sm:h-20'
                        : 'w-24 h-24 sm:w-28 sm:h-28'
                } shrink-0`}
                style={glowStyle}
            >
                <img
                    src={logoImg}
                    alt="Celia Games Logo"
                    className="w-full h-full object-contain rounded-2xl"
                />
            </div>
            {!isSmall && (
                <span
                    className="gradient-text text-xl sm:text-2xl font-black tracking-tight drop-shadow-md whitespace-nowrap"
                >
                    ألعاب سيليا
                </span>
            )}
        </div>
    );
}
