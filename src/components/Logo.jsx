import React from 'react';
import { useTheme } from '../context/ThemeContext';
import logoImg from '../assets/logo.png';

export default function Logo({ size = 'large', showText = null, className = '' }) {
    const { theme } = useTheme();
    const isMini = size === 'mini';
    const isSmall = size === 'small';
    const shouldShowText = showText !== null ? showText : (size === 'large');

    const glowStyle = theme === 'girly'
        ? { filter: 'drop-shadow(0 0 12px rgba(255, 61, 138, 0.6)) drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }
        : { filter: 'drop-shadow(0 0 12px rgba(56, 189, 248, 0.6)) drop-shadow(0 2px 8px rgba(0,0,0,0.4))' };

    let sizeClasses = 'w-24 h-24 sm:w-28 sm:h-28';
    if (isMini) {
        sizeClasses = 'w-7 h-7 sm:w-8 sm:h-8';
    } else if (isSmall) {
        sizeClasses = 'w-14 h-14 sm:w-16 sm:h-16';
    } else if (typeof size === 'number') {
        sizeClasses = '';
    }

    const inlineDim = typeof size === 'number' ? { width: size, height: size } : {};

    return (
        <div className={`flex items-center gap-2 select-none shrink-0 ${className}`}>
            <div
                className={`relative flex items-center justify-center transition-all duration-300 hover:scale-105 shrink-0 ${sizeClasses}`}
                style={{ ...glowStyle, ...inlineDim }}
            >
                <img
                    src={logoImg}
                    alt="Celia Games Logo"
                    className="w-full h-full object-contain rounded-xl"
                />
            </div>
            {shouldShowText && (
                <span
                    className="gradient-text text-xl sm:text-2xl font-black tracking-tight drop-shadow-md whitespace-nowrap"
                >
                    ألعاب سيليا
                </span>
            )}
        </div>
    );
}
