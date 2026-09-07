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
        <div className="flex items-center font-black tracking-tight select-none">

            {/* Logo Image in its natural spot (on the right in RTL layout) */}
            <div
                className={`flex items-center justify-center ${isSmall ? 'w-14 h-14' : 'w-20 h-20'} shrink-0 rounded-[22%] overflow-hidden shadow-2xl transition-all hover:scale-105 z-10`}
                style={imageStyle}
            >
                <img
                    src={logoImg}
                    alt="Celia Games Logo"
                    className="w-full h-full object-cover scale-[1.05] rounded-[22%]"
                />
            </div>

            {/* Absolute Text centered perfectly on screen horizontally, without forced vertical positioning so it aligns perfectly with header */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center pt-1" style={{ position: 'absolute' }}>
                <span
                    className={`whitespace-nowrap gradient-text ${isSmall ? 'text-xs' : 'text-base'} leading-none font-bold opacity-90 drop-shadow-[0_0_8px_var(--primary-color)]`}
                >
                    ألعاب سيليا
                </span>
            </div>

        </div>
    );
}
