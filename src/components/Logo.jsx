import React from 'react';
import logoImg from '../assets/logo.png';
import { useTheme } from '../context/ThemeContext';

export default function Logo({ size = 'large', showText = null, className = '' }) {
    const { theme } = useTheme();
    const logoFilter = theme === 'girly'
        ? 'drop-shadow(0 0 5px rgba(201, 121, 162, .16)) drop-shadow(0 3px 8px rgba(0, 0, 0, .4))'
        : 'drop-shadow(0 0 5px rgba(165, 68, 63, .15)) drop-shadow(0 3px 8px rgba(0, 0, 0, .4))';
    const isMini = size === 'mini';
    const isSmall = size === 'small';
    const shouldShowText = showText !== null ? showText : (size === 'large');

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
                style={inlineDim}
            >
                <img
                    src={logoImg}
                    alt="Celia Games Logo"
                    className="w-full h-full object-contain rounded-xl"
                    style={{ filter: logoFilter, transition: 'filter .5s ease' }}
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
