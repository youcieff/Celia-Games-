import React from 'react';
import { useTheme } from '../context/ThemeContext';
import logoImg from '../assets/logo.png';

export default function Logo({ size = 'large' }) {
    const { theme } = useTheme();
    const isSmall = size === 'small';

    const imageStyle = theme === 'dark'
        ? { filter: 'drop-shadow(0 0 15px rgba(56, 189, 248, 0.5))' }
        : { filter: 'drop-shadow(0 0 8px rgba(0, 0, 0, 0.3))' };

    return (
        <div className="flex items-center gap-2 font-black tracking-tight select-none shrink-0">
            <div
                className={`flex items-center justify-center ${isSmall ? 'w-10 h-10' : 'w-14 h-14'} shrink-0 rounded-[22%] overflow-hidden shadow-2xl transition-all hover:scale-105`}
                style={imageStyle}
            >
                <img
                    src={logoImg}
                    alt="Celia Games Logo"
                    className="w-full h-full object-cover scale-[1.05] rounded-[22%]"
                />
            </div>
            <span
                className={`gradient-text ${isSmall ? 'text-sm' : 'text-base'} leading-none font-bold opacity-90 drop-shadow-[0_0_8px_var(--primary-color)] whitespace-nowrap`}
            >
                ألعاب سيليا
            </span>
        </div>
    );
}
