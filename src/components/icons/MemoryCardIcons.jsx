import React from 'react';

/**
 * High-fidelity, colorful vector illustrations for Memory Match cards.
 * Purely visual (no text required) so cards are instantly distinguishable at a glance.
 */
export function MemoryCardIcon({ id, size = 44, className = "" }) {
    switch (id) {
        // ═════════════════════════════════════════════════════════════════════
        // GEMS & TREASURES (الكنوز والجواهر)
        // ═════════════════════════════════════════════════════════════════════
        case 'sapphire':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    <polygon points="14,8 34,8 44,20 24,42 4,20" fill="url(#sapphire-grad)" stroke="#60a5fa" strokeWidth="2" strokeLinejoin="round" />
                    <polygon points="14,8 34,8 24,20" fill="#93c5fd" fillOpacity="0.6" />
                    <polygon points="4,20 14,8 24,20" fill="#3b82f6" fillOpacity="0.8" />
                    <polygon points="44,20 34,8 24,20" fill="#2563eb" fillOpacity="0.9" />
                    <polygon points="4,20 24,20 24,42" fill="#1d4ed8" />
                    <polygon points="44,20 24,20 24,42" fill="#1e40af" />
                    <circle cx="20" cy="14" r="2" fill="#ffffff" />
                    <circle cx="28" cy="24" r="1.5" fill="#ffffff" />
                    <defs>
                        <linearGradient id="sapphire-grad" x1="24" y1="8" x2="24" y2="42" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#60a5fa" />
                            <stop offset="1" stopColor="#1e3a8a" />
                        </linearGradient>
                    </defs>
                </svg>
            );

        case 'crown':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    <path d="M6 38h36v4H6z" fill="#f59e0b" stroke="#fbbf24" strokeWidth="1.5" rx="1" />
                    <path d="M6 38l4-22 10 10 4-14 4 14 10-10 4 22H6z" fill="url(#crown-grad)" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" />
                    <circle cx="6" cy="16" r="3.5" fill="#ef4444" stroke="#fef08a" strokeWidth="1.5" />
                    <circle cx="24" cy="12" r="4" fill="#3b82f6" stroke="#fef08a" strokeWidth="1.5" />
                    <circle cx="42" cy="16" r="3.5" fill="#ef4444" stroke="#fef08a" strokeWidth="1.5" />
                    <circle cx="16" cy="38" r="2" fill="#10b981" />
                    <circle cx="24" cy="38" r="2" fill="#ec4899" />
                    <circle cx="32" cy="38" r="2" fill="#10b981" />
                    <defs>
                        <linearGradient id="crown-grad" x1="24" y1="12" x2="24" y2="38" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#fde047" />
                            <stop offset="1" stopColor="#d97706" />
                        </linearGradient>
                    </defs>
                </svg>
            );

        case 'gold':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    {/* Bottom bar */}
                    <polygon points="6,34 14,24 34,24 42,34" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
                    <polygon points="6,34 42,34 40,40 4,40" fill="#b45309" />
                    {/* Top bar */}
                    <polygon points="12,22 18,12 36,12 42,22" fill="#fde047" stroke="#fbbf24" strokeWidth="1.5" />
                    <polygon points="12,22 42,22 38,28 8,28" fill="#f59e0b" />
                    <line x1="20" y1="16" x2="34" y2="16" stroke="#fef08a" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="38" cy="15" r="1.5" fill="#ffffff" />
                </svg>
            );

        case 'ring':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    <circle cx="24" cy="28" r="14" stroke="#fbbf24" strokeWidth="4" fill="none" />
                    <circle cx="24" cy="28" r="12" stroke="#f59e0b" strokeWidth="1.5" fill="none" />
                    {/* Gem mount */}
                    <polygon points="18,14 30,14 27,10 21,10" fill="#d97706" />
                    {/* Gem */}
                    <polygon points="16,10 32,10 36,5 24,2 12,5" fill="#a7f3d0" stroke="#34d399" strokeWidth="1.5" />
                    <polygon points="16,10 32,10 24,14" fill="#10b981" />
                    <circle cx="24" cy="6" r="2" fill="#ffffff" />
                </svg>
            );

        case 'crystal':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    {/* Pedestal */}
                    <path d="M16 42h16M20 36h8M22 36v6M26 36v6" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
                    {/* Orb */}
                    <circle cx="24" cy="22" r="15" fill="url(#crystal-grad)" stroke="#c084fc" strokeWidth="2" />
                    <ellipse cx="20" cy="16" rx="6" ry="3" fill="#ffffff" fillOpacity="0.6" transform="rotate(-25 20 16)" />
                    <circle cx="28" cy="26" r="2.5" fill="#f0abfc" fillOpacity="0.8" />
                    <circle cx="17" cy="27" r="1.5" fill="#f0abfc" fillOpacity="0.8" />
                    <defs>
                        <radialGradient id="crystal-grad" cx="40%" cy="35%" r="65%">
                            <stop stopColor="#f0abfc" />
                            <stop offset="0.6" stopColor="#a855f7" />
                            <stop offset="1" stopColor="#4c1d95" />
                        </radialGradient>
                    </defs>
                </svg>
            );

        case 'trophy':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    <path d="M12 8h24v16a12 12 0 0 1-24 0V8z" fill="url(#trophy-grad)" stroke="#f59e0b" strokeWidth="2" />
                    <path d="M12 12H6a4 4 0 0 0-4 4v2a6 6 0 0 0 6 6h4" stroke="#f59e0b" strokeWidth="2" fill="none" />
                    <path d="M36 12h6a4 4 0 0 1 4 4v2a6 6 0 0 1-6 6h-4" stroke="#f59e0b" strokeWidth="2" fill="none" />
                    <path d="M24 36v5M14 43h20" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                    <polygon points="24,14 26,19 31,19 27,22 29,27 24,24 19,27 21,22 17,19 22,19" fill="#fef08a" />
                    <defs>
                        <linearGradient id="trophy-grad" x1="24" y1="8" x2="24" y2="36" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#fde047" />
                            <stop offset="1" stopColor="#d97706" />
                        </linearGradient>
                    </defs>
                </svg>
            );

        case 'star':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    <polygon points="24,3 27,17 41,12 31,23 45,28 31,33 41,44 27,39 24,47 21,39 7,44 17,33 3,28 17,23 7,12 21,17"
                        fill="url(#star-grad)" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round" />
                    <circle cx="24" cy="26" r="5" fill="#fef08a" />
                    <defs>
                        <radialGradient id="star-grad" cx="50%" cy="50%" r="50%">
                            <stop stopColor="#fef08a" />
                            <stop offset="0.7" stopColor="#f59e0b" />
                            <stop offset="1" stopColor="#b45309" />
                        </radialGradient>
                    </defs>
                </svg>
            );

        case 'key':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    <circle cx="16" cy="18" r="10" stroke="#fbbf24" strokeWidth="4" fill="url(#key-grad)" />
                    <circle cx="16" cy="18" r="4" fill="#1e1b4b" />
                    <path d="M24 24l16 16M34 34l3-3M38 38l3-3M41 41l3-3" stroke="#fbbf24" strokeWidth="4" strokeLinecap="round" />
                    <defs>
                        <linearGradient id="key-grad" x1="10" y1="10" x2="22" y2="24" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#fde047" />
                            <stop offset="1" stopColor="#d97706" />
                        </linearGradient>
                    </defs>
                </svg>
            );

        // ═════════════════════════════════════════════════════════════════════
        // COSMOS & SPACE (رحلة الفضاء والمجرات)
        // ═════════════════════════════════════════════════════════════════════
        case 'saturn':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    <circle cx="24" cy="24" r="13" fill="url(#saturn-grad)" stroke="#f59e0b" strokeWidth="1" />
                    <ellipse cx="24" cy="24" rx="22" ry="7" stroke="#fde047" strokeWidth="3" fill="none" transform="rotate(-25 24 24)" />
                    <ellipse cx="24" cy="24" rx="19" ry="5.5" stroke="#fb923c" strokeWidth="1.5" fill="none" transform="rotate(-25 24 24)" />
                    <defs>
                        <linearGradient id="saturn-grad" x1="16" y1="14" x2="32" y2="34" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#fef08a" />
                            <stop offset="0.5" stopColor="#f59e0b" />
                            <stop offset="1" stopColor="#78350f" />
                        </linearGradient>
                    </defs>
                </svg>
            );

        case 'rocket':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    {/* Flame */}
                    <path d="M12 36c-2 4-2 7 2 8s4-4 2-8z" fill="#ef4444" />
                    <path d="M13 37c-1 3-1 5 1 6s3-3 1-6z" fill="#facc15" />
                    {/* Body */}
                    <path d="M14 34l8-8 12-18c3-4 8-4 8 0s-1 10-6 16l-8 8-14 2z" fill="url(#rocket-grad)" stroke="#cbd5e1" strokeWidth="1.5" />
                    {/* Fins */}
                    <polygon points="15,33 9,37 13,29" fill="#dc2626" />
                    <polygon points="29,19 37,23 33,15" fill="#dc2626" />
                    {/* Window */}
                    <circle cx="28" cy="18" r="4" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                    <defs>
                        <linearGradient id="rocket-grad" x1="14" y1="34" x2="36" y2="12" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#f8fafc" />
                            <stop offset="1" stopColor="#94a3b8" />
                        </linearGradient>
                    </defs>
                </svg>
            );

        case 'astronaut':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    {/* Helmet */}
                    <rect x="10" y="8" width="28" height="28" rx="14" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
                    {/* Visor */}
                    <rect x="14" y="14" width="20" height="15" rx="7" fill="url(#visor-grad)" stroke="#0284c7" strokeWidth="1.5" />
                    <ellipse cx="20" cy="18" rx="4" ry="2" fill="#ffffff" fillOpacity="0.6" />
                    {/* Mic */}
                    <circle cx="13" cy="27" r="2.5" fill="#64748b" />
                    {/* Collar */}
                    <path d="M16 36h16v6H16z" fill="#94a3b8" rx="2" />
                    <defs>
                        <linearGradient id="visor-grad" x1="24" y1="14" x2="24" y2="29" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#38bdf8" />
                            <stop offset="0.6" stopColor="#0284c7" />
                            <stop offset="1" stopColor="#082f49" />
                        </linearGradient>
                    </defs>
                </svg>
            );

        case 'galaxy':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    <circle cx="24" cy="24" r="5" fill="#fbcfe8" />
                    <circle cx="24" cy="24" r="2.5" fill="#ffffff" />
                    <path d="M24 4c8 0 16 6 16 14s-7 13-14 13-14-5-14-11 5-9 10-9 8 3 8 7-3 5-6 5" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M24 44c-8 0-16-6-16-14s7-13 14-13 14 5 14 11-5 9-10 9-8-3-8-7 3-5 6-5" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="34" cy="10" r="1" fill="#ffffff" />
                    <circle cx="12" cy="38" r="1.2" fill="#ffffff" />
                    <circle cx="38" cy="34" r="1" fill="#ffffff" />
                </svg>
            );

        case 'comet':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    {/* Trail */}
                    <path d="M16 32L38 8M14 38L42 14M22 36L44 18" stroke="url(#comet-trail)" strokeWidth="3" strokeLinecap="round" />
                    {/* Head */}
                    <circle cx="14" cy="34" r="8" fill="url(#comet-head)" />
                    <circle cx="13" cy="33" r="5" fill="#fef08a" />
                    <circle cx="11" cy="32" r="2.5" fill="#ffffff" />
                    <defs>
                        <linearGradient id="comet-head" x1="14" y1="26" x2="14" y2="42" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#f97316" />
                            <stop offset="1" stopColor="#dc2626" />
                        </linearGradient>
                        <linearGradient id="comet-trail" x1="14" y1="36" x2="44" y2="10" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#f59e0b" />
                            <stop offset="1" stopColor="#ef4444" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                </svg>
            );

        case 'ufo':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    {/* Light Beam */}
                    <polygon points="18,28 30,28 38,44 10,44" fill="#22c55e" fillOpacity="0.25" />
                    {/* Glass Cockpit */}
                    <ellipse cx="24" cy="20" rx="10" ry="8" fill="#38bdf8" fillOpacity="0.8" stroke="#bae6fd" strokeWidth="1.5" />
                    <circle cx="21" cy="17" r="2" fill="#ffffff" />
                    {/* Saucer Body */}
                    <ellipse cx="24" cy="26" rx="20" ry="6" fill="#64748b" stroke="#94a3b8" strokeWidth="2" />
                    {/* Glowing lights */}
                    <circle cx="12" cy="27" r="1.5" fill="#eab308" />
                    <circle cx="20" cy="29" r="1.5" fill="#22c55e" />
                    <circle cx="28" cy="29" r="1.5" fill="#eab308" />
                    <circle cx="36" cy="27" r="1.5" fill="#22c55e" />
                </svg>
            );

        case 'moon':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    <path d="M38 27A17 17 0 1 1 20 6a14 14 0 0 0 18 21z" fill="url(#moon-grad)" stroke="#fde047" strokeWidth="1.5" />
                    <circle cx="20" cy="22" r="2" fill="#ca8a04" fillOpacity="0.4" />
                    <circle cx="26" cy="30" r="2.5" fill="#ca8a04" fillOpacity="0.4" />
                    <circle cx="16" cy="30" r="1.5" fill="#ca8a04" fillOpacity="0.4" />
                    <polygon points="34,10 36,13 39,13 36,15 37,18 34,16 31,18 32,15 29,13 32,13" fill="#fef08a" />
                    <defs>
                        <linearGradient id="moon-grad" x1="12" y1="10" x2="34" y2="36" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#fef08a" />
                            <stop offset="1" stopColor="#eab308" />
                        </linearGradient>
                    </defs>
                </svg>
            );

        case 'telescope':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    {/* Tripod */}
                    <line x1="22" y1="28" x2="10" y2="44" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="24" y1="28" x2="24" y2="44" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="26" y1="28" x2="38" y2="44" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
                    {/* Tube */}
                    <polygon points="12,32 38,12 42,16 16,36" fill="url(#tele-grad)" stroke="#38bdf8" strokeWidth="1.5" />
                    <rect x="36" y="8" width="6" height="8" rx="2" fill="#0284c7" transform="rotate(-38 36 8)" />
                    <circle cx="24" cy="26" r="3" fill="#e2e8f0" />
                    <defs>
                        <linearGradient id="tele-grad" x1="14" y1="34" x2="40" y2="14" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#0369a1" />
                            <stop offset="1" stopColor="#38bdf8" />
                        </linearGradient>
                    </defs>
                </svg>
            );

        // ═════════════════════════════════════════════════════════════════════
        // SAFARI & WILDLIFE (سفاري البرية الملكية)
        // ═════════════════════════════════════════════════════════════════════
        case 'lion':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    {/* Mane */}
                    <circle cx="24" cy="24" r="19" fill="#d97706" />
                    <path d="M24 3l4 6 7-2 1 7 7 2-2 7 6 4-5 5 4 7-7 2-1 7-7-2-4 6-4-6-7 2-1-7-7-2 2-7-6-4 5-5-4-7 7-2 1-7 7 2z" fill="#b45309" />
                    {/* Face */}
                    <circle cx="24" cy="25" r="11" fill="#fde047" />
                    {/* Ears */}
                    <circle cx="16" cy="16" r="3" fill="#b45309" />
                    <circle cx="32" cy="16" r="3" fill="#b45309" />
                    {/* Eyes */}
                    <circle cx="19" cy="23" r="2" fill="#1e1b4b" />
                    <circle cx="29" cy="23" r="2" fill="#1e1b4b" />
                    {/* Muzzle */}
                    <ellipse cx="24" cy="29" rx="4" ry="3" fill="#ffffff" />
                    <polygon points="22,27 26,27 24,30" fill="#78350f" />
                </svg>
            );

        case 'tiger':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    {/* Face */}
                    <circle cx="24" cy="24" r="17" fill="#ea580c" />
                    {/* Ears */}
                    <circle cx="12" cy="12" r="4.5" fill="#9a3412" />
                    <circle cx="12" cy="12" r="2" fill="#ffffff" />
                    <circle cx="36" cy="12" r="4.5" fill="#9a3412" />
                    <circle cx="36" cy="12" r="2" fill="#ffffff" />
                    {/* Stripes */}
                    <polygon points="24,9 22,14 26,14" fill="#18181b" />
                    <polygon points="10,21 17,23 10,25" fill="#18181b" />
                    <polygon points="38,21 31,23 38,25" fill="#18181b" />
                    {/* Eyes */}
                    <circle cx="17" cy="22" r="2.5" fill="#fde047" />
                    <circle cx="17" cy="22" r="1.2" fill="#000000" />
                    <circle cx="31" cy="22" r="2.5" fill="#fde047" />
                    <circle cx="31" cy="22" r="1.2" fill="#000000" />
                    {/* Muzzle */}
                    <ellipse cx="24" cy="30" rx="6" ry="4" fill="#ffffff" />
                    <polygon points="22,28 26,28 24,31" fill="#18181b" />
                </svg>
            );

        case 'eagle':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    {/* Head */}
                    <circle cx="22" cy="24" r="15" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                    {/* Crown feathers */}
                    <path d="M10 20l4-6M8 26l6-2" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                    {/* Eye */}
                    <circle cx="24" cy="20" r="3.5" fill="#eab308" />
                    <circle cx="24" cy="20" r="1.8" fill="#000000" />
                    {/* Beak */}
                    <path d="M30 20c6 0 12 3 12 9-4 0-8-1-12-3z" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
                </svg>
            );

        case 'wolf':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    {/* Wolf silhouette */}
                    <path d="M14 38c0-8 6-12 10-18l6-12 3 8 8 4-8 4-2 14z" fill="#94a3b8" stroke="#475569" strokeWidth="1.5" />
                    <polygon points="24,14 30,8 27,18" fill="#cbd5e1" />
                    <circle cx="28" cy="20" r="2" fill="#facc15" />
                    {/* Moon glow */}
                    <circle cx="18" cy="18" r="12" fill="#38bdf8" fillOpacity="0.2" />
                </svg>
            );

        case 'dolphin':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    {/* Wave */}
                    <path d="M4 38c8-4 16 0 24-4s12-2 16 0" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
                    {/* Dolphin */}
                    <path d="M8 32c4-8 14-18 24-16 6 1 10 7 10 7s-8-2-12 2c-5 5-10 11-18 10z" fill="url(#dolphin-grad)" stroke="#0284c7" strokeWidth="1.5" />
                    {/* Dorsal Fin */}
                    <polygon points="26,14 30,6 32,14" fill="#0284c7" />
                    {/* Tail */}
                    <polygon points="8,32 4,28 6,36" fill="#0369a1" />
                    <circle cx="36" cy="20" r="1.5" fill="#ffffff" />
                    <defs>
                        <linearGradient id="dolphin-grad" x1="12" y1="16" x2="38" y2="30" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#38bdf8" />
                            <stop offset="1" stopColor="#0369a1" />
                        </linearGradient>
                    </defs>
                </svg>
            );

        case 'panda':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    {/* Ears */}
                    <circle cx="11" cy="13" r="6" fill="#18181b" />
                    <circle cx="37" cy="13" r="6" fill="#18181b" />
                    {/* Head */}
                    <circle cx="24" cy="25" r="17" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
                    {/* Eye Patches */}
                    <ellipse cx="17" cy="23" rx="4.5" ry="6" fill="#18181b" transform="rotate(-15 17 23)" />
                    <ellipse cx="31" cy="23" rx="4.5" ry="6" fill="#18181b" transform="rotate(15 31 23)" />
                    <circle cx="17" cy="23" r="1.8" fill="#ffffff" />
                    <circle cx="31" cy="23" r="1.8" fill="#ffffff" />
                    {/* Nose */}
                    <ellipse cx="24" cy="30" rx="3" ry="2" fill="#18181b" />
                    <path d="M22 33q2 2 4 0" stroke="#18181b" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
            );

        case 'fox':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    {/* Ears */}
                    <polygon points="10,24 8,8 22,16" fill="#ea580c" />
                    <polygon points="12,20 11,11 18,16" fill="#ffffff" />
                    <polygon points="38,24 40,8 26,16" fill="#ea580c" />
                    <polygon points="36,20 37,11 30,16" fill="#ffffff" />
                    {/* Head */}
                    <polygon points="6,24 42,24 24,40" fill="#f97316" />
                    {/* White Cheeks */}
                    <polygon points="6,24 24,40 18,24" fill="#ffffff" />
                    <polygon points="42,24 24,40 30,24" fill="#ffffff" />
                    {/* Eyes */}
                    <circle cx="16" cy="24" r="2.5" fill="#18181b" />
                    <circle cx="32" cy="24" r="2.5" fill="#18181b" />
                    {/* Nose */}
                    <circle cx="24" cy="38" r="2.5" fill="#18181b" />
                </svg>
            );

        case 'owl':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    {/* Head */}
                    <circle cx="24" cy="25" r="17" fill="#78350f" />
                    {/* Ear Tufts */}
                    <polygon points="10,14 14,4 20,12" fill="#92400e" />
                    <polygon points="38,14 34,4 28,12" fill="#92400e" />
                    {/* Big Eyes */}
                    <circle cx="17" cy="24" r="7" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />
                    <circle cx="17" cy="24" r="3.5" fill="#18181b" />
                    <circle cx="16" cy="22" r="1.2" fill="#ffffff" />
                    <circle cx="31" cy="24" r="7" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />
                    <circle cx="31" cy="24" r="3.5" fill="#18181b" />
                    <circle cx="30" cy="22" r="1.2" fill="#ffffff" />
                    {/* Beak */}
                    <polygon points="22,26 26,26 24,32" fill="#ea580c" />
                </svg>
            );

        // ═════════════════════════════════════════════════════════════════════
        // GOURMET & DELICACIES (المذاق وفنون الطهي)
        // ═════════════════════════════════════════════════════════════════════
        case 'pizza':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    {/* Crust */}
                    <path d="M6 10c12-5 24-5 36 0" stroke="#d97706" strokeWidth="5" strokeLinecap="round" />
                    {/* Slice cheese */}
                    <polygon points="7,12 41,12 24,44" fill="url(#cheese-grad)" stroke="#f59e0b" strokeWidth="1" />
                    {/* Pepperoni slices */}
                    <circle cx="24" cy="20" r="3.5" fill="#dc2626" stroke="#991b1b" strokeWidth="1" />
                    <circle cx="18" cy="28" r="3" fill="#dc2626" stroke="#991b1b" strokeWidth="1" />
                    <circle cx="29" cy="29" r="3" fill="#dc2626" stroke="#991b1b" strokeWidth="1" />
                    {/* Basil herb flakes */}
                    <circle cx="22" cy="14" r="1.2" fill="#15803d" />
                    <circle cx="31" cy="20" r="1.2" fill="#15803d" />
                    <circle cx="24" cy="36" r="1" fill="#15803d" />
                    <defs>
                        <linearGradient id="cheese-grad" x1="24" y1="12" x2="24" y2="44" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#fef08a" />
                            <stop offset="1" stopColor="#eab308" />
                        </linearGradient>
                    </defs>
                </svg>
            );

        case 'burger':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    {/* Top Bun */}
                    <path d="M8 20a16 16 0 0 1 32 0H8z" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
                    <circle cx="18" cy="14" r="1" fill="#fef08a" />
                    <circle cx="24" cy="11" r="1" fill="#fef08a" />
                    <circle cx="30" cy="14" r="1" fill="#fef08a" />
                    {/* Lettuce */}
                    <path d="M6 22q4-3 8 0t8 0t8 0t8 0" stroke="#22c55e" strokeWidth="3.5" strokeLinecap="round" />
                    {/* Tomato */}
                    <rect x="8" y="24" width="32" height="3" rx="1.5" fill="#ef4444" />
                    {/* Cheese slice */}
                    <polygon points="8,28 40,28 36,32 12,30" fill="#fde047" />
                    {/* Beef Patty */}
                    <rect x="6" y="30" width="36" height="5" rx="2.5" fill="#78350f" stroke="#451a03" strokeWidth="1" />
                    {/* Bottom Bun */}
                    <rect x="8" y="36" width="32" height="6" rx="3" fill="#d97706" />
                </svg>
            );

        case 'sushi':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    {/* Rice Block */}
                    <rect x="8" y="24" width="32" height="14" rx="7" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                    {/* Salmon Topping */}
                    <rect x="6" y="16" width="36" height="12" rx="6" fill="#fb7185" stroke="#e11d48" strokeWidth="1.5" />
                    <line x1="14" y1="18" x2="18" y2="26" stroke="#ffe4e6" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="22" y1="18" x2="26" y2="26" stroke="#ffe4e6" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="30" y1="18" x2="34" y2="26" stroke="#ffe4e6" strokeWidth="1.5" strokeLinecap="round" />
                    {/* Seaweed Nori Wrap Band */}
                    <rect x="21" y="15" width="6" height="24" rx="2" fill="#14532d" stroke="#052e16" strokeWidth="1" />
                </svg>
            );

        case 'donut':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    {/* Donut Dough */}
                    <circle cx="24" cy="24" r="18" fill="#d97706" stroke="#b45309" strokeWidth="1.5" />
                    {/* Pink Glaze */}
                    <circle cx="24" cy="24" r="16" fill="#f472b6" />
                    {/* Center Hole */}
                    <circle cx="24" cy="24" r="6" fill="#0f172a" stroke="#d97706" strokeWidth="2" />
                    {/* Sprinkles */}
                    <rect x="14" y="14" width="4" height="1.5" rx="0.7" fill="#38bdf8" transform="rotate(30 14 14)" />
                    <rect x="28" y="12" width="4" height="1.5" rx="0.7" fill="#facc15" transform="rotate(-20 28 12)" />
                    <rect x="33" y="24" width="4" height="1.5" rx="0.7" fill="#4ade80" transform="rotate(45 33 24)" />
                    <rect x="12" y="28" width="4" height="1.5" rx="0.7" fill="#facc15" transform="rotate(-35 12 28)" />
                    <rect x="24" y="34" width="4" height="1.5" rx="0.7" fill="#38bdf8" transform="rotate(10 24 34)" />
                </svg>
            );

        case 'strawberry':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    {/* Leaves */}
                    <path d="M24 12l-6-6 4 6-6 1 6 3-2 4 6-3 4 5 1-6 5 2-4-5 5-2-7-1 3-4z" fill="#16a34a" />
                    {/* Berry */}
                    <path d="M24 44c-12 0-16-14-16-24a16 16 0 0 1 32 0c0 10-4 24-16 24z" fill="url(#berry-grad)" stroke="#b91c1c" strokeWidth="1.5" />
                    {/* Seeds */}
                    <circle cx="18" cy="24" r="1" fill="#fef08a" />
                    <circle cx="24" cy="22" r="1" fill="#fef08a" />
                    <circle cx="30" cy="24" r="1" fill="#fef08a" />
                    <circle cx="21" cy="30" r="1" fill="#fef08a" />
                    <circle cx="27" cy="30" r="1" fill="#fef08a" />
                    <circle cx="24" cy="37" r="1" fill="#fef08a" />
                    <defs>
                        <linearGradient id="berry-grad" x1="24" y1="14" x2="24" y2="44" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#ef4444" />
                            <stop offset="1" stopColor="#991b1b" />
                        </linearGradient>
                    </defs>
                </svg>
            );

        case 'avocado':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    {/* Skin */}
                    <path d="M24 4C17 4 10 16 10 28a14 14 0 0 0 28 0c0-12-7-24-14-24z" fill="#14532d" stroke="#052e16" strokeWidth="1.5" />
                    {/* Light Green Flesh */}
                    <path d="M24 8C19 8 13 18 13 28a11 11 0 0 0 22 0c0-10-6-20-11-20z" fill="#bef264" />
                    {/* Brown Seed Pit */}
                    <circle cx="24" cy="30" r="7" fill="#78350f" stroke="#451a03" strokeWidth="1.5" />
                    <ellipse cx="22" cy="28" rx="2" ry="3" fill="#a16207" fillOpacity="0.6" transform="rotate(-30 22 28)" />
                </svg>
            );

        case 'pancakes':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    {/* Bottom pancake */}
                    <ellipse cx="24" cy="36" rx="18" ry="6" fill="#d97706" stroke="#b45309" strokeWidth="1" />
                    {/* Middle pancake */}
                    <ellipse cx="24" cy="29" rx="17" ry="5.5" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
                    {/* Top pancake */}
                    <ellipse cx="24" cy="22" rx="16" ry="5" fill="#fde047" stroke="#f59e0b" strokeWidth="1" />
                    {/* Butter Cube */}
                    <polygon points="21,14 27,14 29,17 23,17" fill="#fef08a" />
                    <polygon points="21,14 23,17 23,20 21,17" fill="#fde047" />
                    <polygon points="27,14 29,17 29,20 27,17" fill="#facc15" />
                    {/* Syrup Drip */}
                    <path d="M20 22q2 6 2 9t4-9" fill="#b45309" />
                </svg>
            );

        case 'icecream':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    {/* Waffle Cone */}
                    <polygon points="14,24 34,24 24,46" fill="#d97706" stroke="#b45309" strokeWidth="1.5" />
                    <line x1="18" y1="28" x2="28" y2="38" stroke="#92400e" strokeWidth="1" />
                    <line x1="30" y1="28" x2="20" y2="38" stroke="#92400e" strokeWidth="1" />
                    {/* Bottom Scoop */}
                    <circle cx="24" cy="22" r="10" fill="#38bdf8" stroke="#0284c7" strokeWidth="1" />
                    {/* Top Scoop */}
                    <circle cx="24" cy="14" r="8" fill="#f472b6" stroke="#db2777" strokeWidth="1" />
                    {/* Cherry on top */}
                    <circle cx="24" cy="6" r="3" fill="#dc2626" />
                    <path d="M25 4q4-3 6 0" stroke="#15803d" strokeWidth="1.5" fill="none" />
                </svg>
            );

        // ═════════════════════════════════════════════════════════════════════
        // MYTHIC & HEROES (الأساطير وقوى الطبيعة)
        // ═════════════════════════════════════════════════════════════════════
        case 'lightning':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    <polygon points="26,3 10,25 24,25 20,45 38,20 24,20" fill="url(#bolt-grad)" stroke="#ca8a04" strokeWidth="1.5" strokeLinejoin="round" />
                    <polygon points="25,7 15,23 24,23 22,37 34,21 24,21" fill="#ffffff" fillOpacity="0.5" />
                    <defs>
                        <linearGradient id="bolt-grad" x1="24" y1="3" x2="24" y2="45" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#fef08a" />
                            <stop offset="0.5" stopColor="#eab308" />
                            <stop offset="1" stopColor="#ca8a04" />
                        </linearGradient>
                    </defs>
                </svg>
            );

        case 'shield':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    <path d="M24 6l16 6v14c0 10-8 16-16 18-8-2-16-8-16-18V12l16-6z" fill="url(#shield-grad)" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" />
                    {/* Golden Cross */}
                    <rect x="22" y="12" width="4" height="24" rx="1" fill="#fde047" />
                    <rect x="14" y="20" width="20" height="4" rx="1" fill="#fde047" />
                    <circle cx="24" cy="22" r="3" fill="#ef4444" />
                    <defs>
                        <linearGradient id="shield-grad" x1="8" y1="6" x2="40" y2="44" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#1e3a8a" />
                            <stop offset="1" stopColor="#0f172a" />
                        </linearGradient>
                    </defs>
                </svg>
            );

        case 'sword':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    {/* Blade */}
                    <polygon points="24,4 27,10 27,32 24,36 21,32 21,10" fill="url(#blade-grad)" stroke="#cbd5e1" strokeWidth="1.5" />
                    <line x1="24" y1="8" x2="24" y2="34" stroke="#94a3b8" strokeWidth="1" />
                    {/* Guard */}
                    <rect x="14" y="34" width="20" height="3.5" rx="1.5" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
                    {/* Grip & Pommel */}
                    <rect x="22" y="37.5" width="4" height="6" fill="#78350f" />
                    <circle cx="24" cy="45" r="2.5" fill="#f59e0b" />
                    <defs>
                        <linearGradient id="blade-grad" x1="21" y1="4" x2="27" y2="36" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#f8fafc" />
                            <stop offset="1" stopColor="#94a3b8" />
                        </linearGradient>
                    </defs>
                </svg>
            );

        case 'bow':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    {/* Curved Limbs */}
                    <path d="M12 40C6 24 16 10 32 6" stroke="#b45309" strokeWidth="4" strokeLinecap="round" fill="none" />
                    {/* String */}
                    <line x1="12" y1="40" x2="32" y2="6" stroke="#e2e8f0" strokeWidth="1.5" />
                    {/* Arrow */}
                    <line x1="14" y1="34" x2="38" y2="10" stroke="#f59e0b" strokeWidth="2.5" />
                    <polygon points="40,8 34,10 38,14" fill="#ef4444" />
                    <polygon points="12,36 16,38 10,40" fill="#22c55e" />
                </svg>
            );

        case 'potion':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    {/* Cork */}
                    <rect x="20" y="4" width="8" height="4" rx="1" fill="#b45309" />
                    {/* Neck */}
                    <rect x="21" y="8" width="6" height="8" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
                    {/* Round Flask */}
                    <circle cx="24" cy="29" r="15" fill="url(#potion-grad)" stroke="#e2e8f0" strokeWidth="2" />
                    <ellipse cx="20" cy="24" rx="4" ry="2" fill="#ffffff" fillOpacity="0.6" transform="rotate(-30 20 24)" />
                    {/* Bubbles */}
                    <circle cx="26" cy="34" r="2" fill="#ffffff" fillOpacity="0.8" />
                    <circle cx="21" cy="32" r="1.5" fill="#ffffff" fillOpacity="0.8" />
                    <circle cx="28" cy="26" r="1.2" fill="#ffffff" fillOpacity="0.8" />
                    <defs>
                        <radialGradient id="potion-grad" cx="40%" cy="40%" r="60%">
                            <stop stopColor="#e879f9" />
                            <stop offset="0.6" stopColor="#a855f7" />
                            <stop offset="1" stopColor="#581c87" />
                        </radialGradient>
                    </defs>
                </svg>
            );

        case 'dragon':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    {/* Horns */}
                    <path d="M18 12c-4-6-10-8-14-8 2 6 6 10 10 12z" fill="#f59e0b" />
                    <path d="M26 10c0-6-4-8-8-8 1 5 4 8 8 8z" fill="#f59e0b" />
                    {/* Head */}
                    <path d="M14 20l14-6 12 12-6 8-14-2-8 6z" fill="#15803d" stroke="#166534" strokeWidth="1.5" />
                    {/* Eye */}
                    <circle cx="24" cy="20" r="2.5" fill="#facc15" />
                    <circle cx="24" cy="20" r="1" fill="#000000" />
                    {/* Fire breath */}
                    <path d="M38 26c4-1 8 1 8 3-2 3-8 1-8-3z" fill="#ef4444" />
                </svg>
            );

        case 'axe':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    {/* Shaft */}
                    <line x1="12" y1="42" x2="34" y2="8" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
                    {/* Left Blade */}
                    <path d="M26 16c-6-6-16-6-18 4 6 2 14 0 16-4z" fill="#94a3b8" stroke="#475569" strokeWidth="1.5" />
                    {/* Right Blade */}
                    <path d="M30 14c6-6 16-6 18 4-6 2-14 0-16-4z" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
                    {/* Center Ring */}
                    <circle cx="28" cy="15" r="3" fill="#f59e0b" />
                </svg>
            );

        case 'feather':
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    {/* Quill line */}
                    <path d="M10 42c8-8 20-22 28-34" stroke="#fef08a" strokeWidth="2.5" strokeLinecap="round" />
                    {/* Plume vanes */}
                    <path d="M38 8c-12 2-26 12-28 34 6-2 16-12 20-24z" fill="url(#feather-grad)" />
                    <path d="M38 8c-2 10-8 20-18 24 6-2 12-8 16-16z" fill="#f97316" />
                    <defs>
                        <linearGradient id="feather-grad" x1="10" y1="42" x2="38" y2="8" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#ef4444" />
                            <stop offset="0.6" stopColor="#f97316" />
                            <stop offset="1" stopColor="#fde047" />
                        </linearGradient>
                    </defs>
                </svg>
            );

        default:
            return (
                <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}>
                    <polygon points="24,6 30,18 43,20 33,29 36,42 24,35 12,42 15,29 5,20 18,18" fill="#f59e0b" />
                </svg>
            );
    }
}
