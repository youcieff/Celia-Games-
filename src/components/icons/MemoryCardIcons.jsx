import React from 'react';

// Handcrafted clean SVG vector icons for Memory Match cards
export function MemoryCardIcon({ id, size = 36, className = "" }) {
    switch (id) {
        // GEMS
        case 'sapphire':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <path d="M6 3h12l4 6-10 12L2 9z" fill="currentColor" fillOpacity="0.25" />
                    <path d="M2 9h20M10 3l-2 6 4 12 4-12-2-6" />
                </svg>
            );
        case 'crown':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" fill="currentColor" fillOpacity="0.25" />
                    <circle cx="5" cy="4" r="1" fill="currentColor" />
                    <circle cx="12" cy="4" r="1" fill="currentColor" />
                    <circle cx="19" cy="4" r="1" fill="currentColor" />
                </svg>
            );
        case 'gold':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <path d="M4 17l4-10h8l4 10H4z" fill="currentColor" fillOpacity="0.25" />
                    <path d="M7 11h10M9 7l-2 10M15 7l2 10" />
                </svg>
            );
        case 'ring':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <circle cx="12" cy="14" r="7" fill="currentColor" fillOpacity="0.2" />
                    <path d="M9 5l3-2 3 2-3 2z" fill="currentColor" />
                </svg>
            );
        case 'crystal':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <circle cx="12" cy="11" r="7" fill="currentColor" fillOpacity="0.2" />
                    <path d="M6 21h12M9 18l-1 3M15 18l1 3M10 8l2-2 2 2" />
                </svg>
            );
        case 'trophy':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2M6 3h12v7a6 6 0 0 1-12 0V3z" fill="currentColor" fillOpacity="0.25" />
                    <path d="M12 16v5M8 21h8" />
                </svg>
            );
        case 'star':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" fillOpacity="0.25" />
                </svg>
            );
        case 'key':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <circle cx="7.5" cy="15.5" r="4.5" fill="currentColor" fillOpacity="0.25" />
                    <path d="m11 12 8-8M16 4l3 3M14 6l2 2" />
                </svg>
            );

        // COSMOS
        case 'saturn':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <circle cx="12" cy="12" r="6" fill="currentColor" fillOpacity="0.25" />
                    <ellipse cx="12" cy="12" rx="10" ry="3" transform="rotate(-25 12 12)" />
                </svg>
            );
        case 'rocket':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" fill="currentColor" fillOpacity="0.25" />
                </svg>
            );
        case 'astronaut':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <rect x="5" y="4" width="14" height="13" rx="6" fill="currentColor" fillOpacity="0.2" />
                    <circle cx="12" cy="10" r="3.5" fill="currentColor" fillOpacity="0.4" />
                    <path d="M8 20h8M12 17v3M3 10h2M19 10h2" />
                </svg>
            );
        case 'galaxy':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <circle cx="12" cy="12" r="2.5" fill="currentColor" />
                    <path d="M12 2a10 10 0 0 1 10 10c0 3-1.5 5-3.5 5S15 15 15 12s2-4 2-6M12 22a10 10 0 0 1-10-10c0-3 1.5-5 3.5-5S9 9 9 12s-2 4-2 6" />
                </svg>
            );
        case 'comet':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <circle cx="6" cy="18" r="4" fill="currentColor" fillOpacity="0.3" />
                    <path d="M9 15L21 3M6 14L18 2M10 18L22 6" />
                </svg>
            );
        case 'ufo':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <ellipse cx="12" cy="12" rx="9" ry="4" fill="currentColor" fillOpacity="0.25" />
                    <path d="M8 11a4 4 0 0 1 8 0" />
                    <path d="M8 16l-2 4M16 16l2 4M12 16v4" />
                </svg>
            );
        case 'moon':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" fillOpacity="0.25" />
                </svg>
            );
        case 'telescope':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <path d="m14 3 6 4-11 11-6-4z" fill="currentColor" fillOpacity="0.25" />
                    <path d="m8 15-4 6M10 16l4 5" />
                </svg>
            );

        // SAFARI
        case 'lion':
        case 'tiger':
        case 'wolf':
        case 'fox':
        case 'panda':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <circle cx="12" cy="13" r="7" fill="currentColor" fillOpacity="0.2" />
                    <path d="M6 7a2 2 0 1 1 3-2M18 7a2 2 0 1 0-3-2M9 12h.01M15 12h.01M10 15a2 2 0 0 0 4 0" />
                </svg>
            );
        case 'eagle':
        case 'owl':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <circle cx="12" cy="12" r="8" fill="currentColor" fillOpacity="0.2" />
                    <circle cx="9" cy="10" r="1.5" fill="currentColor" />
                    <circle cx="15" cy="10" r="1.5" fill="currentColor" />
                    <path d="M12 11l-1.5 3h3L12 11zM6 7l2 1M18 7l-2 1" />
                </svg>
            );
        case 'dolphin':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <path d="M3 17c4-1 6-4 8-8 3-6 8-5 10-5-2 5-6 9-11 10-3 1-5 4-7 3z" fill="currentColor" fillOpacity="0.25" />
                    <path d="M14 8l3-3M6 16l-3 4" />
                </svg>
            );

        // GOURMET
        case 'pizza':
        case 'pancakes':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <path d="M12 2l9 17a12 12 0 0 1-18 0z" fill="currentColor" fillOpacity="0.2" />
                    <circle cx="12" cy="11" r="1.5" fill="currentColor" />
                    <circle cx="9" cy="15" r="1.5" fill="currentColor" />
                    <circle cx="15" cy="15" r="1.5" fill="currentColor" />
                </svg>
            );
        case 'burger':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <path d="M4 11a8 8 0 0 1 16 0H4z" fill="currentColor" fillOpacity="0.3" />
                    <rect x="3" y="13" width="18" height="2" rx="1" fill="currentColor" />
                    <path d="M4 17h16a2 2 0 0 1-2 3H6a2 2 0 0 1-2-3z" fill="currentColor" fillOpacity="0.3" />
                </svg>
            );
        case 'sushi':
        case 'donut':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <circle cx="12" cy="12" r="8" fill="currentColor" fillOpacity="0.2" />
                    <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.5" />
                </svg>
            );
        case 'strawberry':
        case 'avocado':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <path d="M12 21c-4.5 0-7-4-7-8a7 7 0 0 1 14 0c0 4-2.5 8-7 8z" fill="currentColor" fillOpacity="0.25" />
                    <path d="M12 3v3M9 4l3 2 3-2" />
                </svg>
            );
        case 'icecream':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <path d="M8 11l4 10 4-10z" fill="currentColor" fillOpacity="0.2" />
                    <circle cx="12" cy="8" r="5" fill="currentColor" fillOpacity="0.3" />
                </svg>
            );

        // MYTHIC
        case 'lightning':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" fillOpacity="0.25" />
                </svg>
            );
        case 'shield':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor" fillOpacity="0.25" />
                </svg>
            );
        case 'sword':
        case 'axe':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l2 2M16 16l4 4M19 13l2 2" />
                </svg>
            );
        case 'bow':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <path d="M4 20C4 11 11 4 20 4M4 20l16-16M9 15l-4 4M15 9l4-4" />
                </svg>
            );
        case 'potion':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <path d="M9 3h6M10 3v4l-5 8a3 3 0 0 0 2.5 4.5h9a3 3 0 0 0 2.5-4.5l-5-8V3" fill="currentColor" fillOpacity="0.25" />
                </svg>
            );
        case 'dragon':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <path d="M4 14c3-6 8-8 14-8-1 4-4 7-9 8M8 18c4-2 8-1 12-4" fill="currentColor" fillOpacity="0.2" />
                    <circle cx="16" cy="7" r="1.5" fill="currentColor" />
                </svg>
            );
        case 'feather':
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5zM16 8L2 22M17.5 15H9" fill="currentColor" fillOpacity="0.2" />
                </svg>
            );

        default:
            return (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" fillOpacity="0.25" />
                </svg>
            );
    }
}
