import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function Visualizer({ mistakes, maxMistakes = 7, isOpponent }) {
    const { theme } = useTheme();

    const parts = [
        <line key="0" x1="10" y1="250" x2="150" y2="250" strokeWidth="12" className="stroke-[var(--accent)]" strokeLinecap="round"/>,
        <line key="1" x1="50" y1="250" x2="50" y2="20" strokeWidth="12" className="stroke-[var(--accent)]" strokeLinecap="round"/>,
        <line key="2" x1="44" y1="20" x2="150" y2="20" strokeWidth="12" className="stroke-[var(--accent)]" strokeLinecap="round"/>,
        <line key="3" x1="150" y1="20" x2="150" y2="50" strokeWidth="8" className="stroke-[var(--accent)]" strokeLinecap="round"/>,
        <circle key="4" cx="150" cy="80" r="30" strokeWidth="8" className="stroke-white fill-transparent" />,
        <line key="5" x1="150" y1="110" x2="150" y2="180" strokeWidth="8" className="stroke-white" strokeLinecap="round"/>,
        <g key="6">
            <line x1="150" y1="130" x2="110" y2="160" strokeWidth="8" className="stroke-white" strokeLinecap="round"/>
            <line x1="150" y1="130" x2="190" y2="160" strokeWidth="8" className="stroke-white" strokeLinecap="round"/>
        </g>,
        <g key="7">
            <line x1="150" y1="180" x2="110" y2="220" strokeWidth="8" className="stroke-white" strokeLinecap="round"/>
            <line x1="150" y1="180" x2="190" y2="220" strokeWidth="8" className="stroke-white" strokeLinecap="round"/>
        </g>
    ];

    return (
        <div className="flex flex-col items-center justify-center w-24">
            <svg viewBox="0 0 220 260" className="w-full h-auto drop-shadow-lg">
                {parts.slice(0, mistakes + 1)}
            </svg>
        </div>
    );
}
