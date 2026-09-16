/**
 * GameIcons.jsx — Custom SVG icon library for Celia Games
 *
 * All icons: Line-style, stroke-width 1.5, viewBox 24×24
 * Color: currentColor (inherits from parent, driven by --card-accent / --accent)
 * No emoji. No generic icon libraries.
 */

import React from 'react';

const iconProps = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.5",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

/* ── Game Icons ──────────────────────────────────────────── */

/** خمن الكود — 4 colored dots + question mark */
export function IconCodeGame({ size = 24, className = '' }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      {/* 4 dots in a row */}
      <circle cx="5"  cy="14" r="2.2" />
      <circle cx="10" cy="14" r="2.2" />
      <circle cx="15" cy="14" r="2.2" />
      <circle cx="20" cy="14" r="2.2" />
      {/* Question mark above */}
      <path d="M12 4 C12 4 14 4 14 6 C14 8 12 8.5 12 10" />
      <circle cx="12" cy="11.8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** خمن الكلمة — speech bubble with blank lines */
export function IconWordGame({ size = 24, className = '' }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      {/* Bubble */}
      <path d="M4 5 Q4 3 6 3 H18 Q20 3 20 5 V14 Q20 16 18 16 H9 L5 20 V16 H6 Q4 16 4 14 Z" />
      {/* Letter blanks */}
      <line x1="7.5" y1="9" x2="9.5"  y2="9" strokeWidth="2" />
      <line x1="11"  y1="9" x2="13"   y2="9" strokeWidth="2" />
      <line x1="14.5" y1="9" x2="16.5" y2="9" strokeWidth="2" />
    </svg>
  );
}

/** إكس أو — 3×3 grid, clean and simple */
export function IconXOGame({ size = 24, className = '' }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      {/* Vertical lines */}
      <line x1="9"  y1="3" x2="9"  y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
      {/* Horizontal lines */}
      <line x1="3" y1="9"  x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
    </svg>
  );
}

/** Big XO — nested grids (9 mini boards) */
export function IconBigXOGame({ size = 24, className = '' }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      {/* Outer thick grid */}
      <line x1="9"  y1="2" x2="9"  y2="22" strokeWidth="2.2" />
      <line x1="15" y1="2" x2="15" y2="22" strokeWidth="2.2" />
      <line x1="2"  y1="9" x2="22" y2="9"  strokeWidth="2.2" />
      <line x1="2"  y1="15" x2="22" y2="15" strokeWidth="2.2" />
      {/* Inner thin grid — top-left cell */}
      <line x1="4.5" y1="3" x2="4.5" y2="8"   strokeWidth="0.7" />
      <line x1="6.5" y1="3" x2="6.5" y2="8"   strokeWidth="0.7" />
      <line x1="3"   y1="4.5" x2="8" y2="4.5" strokeWidth="0.7" />
      <line x1="3"   y1="6.5" x2="8" y2="6.5" strokeWidth="0.7" />
    </svg>
  );
}

/** Connect 4 — 4 columns with stacked circles */
export function IconConnect4({ size = 24, className = '' }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      {/* Frame */}
      <rect x="2" y="5" width="20" height="16" rx="2" />
      {/* Column dividers */}
      <line x1="7"  y1="5" x2="7"  y2="21" />
      <line x1="12" y1="5" x2="12" y2="21" />
      <line x1="17" y1="5" x2="17" y2="21" />
      {/* Filled circles (coins) in different heights */}
      <circle cx="4.5"  cy="18" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="9.5"  cy="18" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="9.5"  cy="14" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="18" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="14" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
      {/* Winning 4 — horizontal highlight */}
      <circle cx="4.5"  cy="14" r="1" strokeWidth="1" />
      <circle cx="9.5"  cy="10" r="1" strokeWidth="1" />
    </svg>
  );
}

/** Memory Match — two cards with flip effect */
export function IconMemoryGame({ size = 24, className = '' }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      {/* Back card */}
      <rect x="9" y="4" width="13" height="17" rx="2.5" opacity="0.45" />
      {/* Front card */}
      <rect x="2" y="4" width="13" height="17" rx="2.5" />
      {/* Question mark on front */}
      <path d="M8 9 C8 9 10 9 10 11 C10 13 8 13.5 8 15" strokeWidth="1.3" />
      <circle cx="8" cy="16.5" r="0.5" fill="currentColor" stroke="none" />
      {/* Star on back */}
      <path d="M16.5 7 L17 9 L19 9 L17.5 10 L18 12 L16.5 11 L15 12 L15.5 10 L14 9 L16 9 Z"
            opacity="0.4" strokeWidth="0.8" />
    </svg>
  );
}

/** Dots & Boxes — dot grid with partial lines forming a box */
export function IconDotsBoxes({ size = 24, className = '' }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      {/* Dots — 2×2 grid */}
      <circle cx="6"  cy="6"  r="1.8" fill="currentColor" stroke="none" />
      <circle cx="18" cy="6"  r="1.8" fill="currentColor" stroke="none" />
      <circle cx="6"  cy="18" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="18" cy="18" r="1.8" fill="currentColor" stroke="none" />
      {/* Middle row dots */}
      <circle cx="12" cy="6"  r="1.2" fill="currentColor" stroke="none" opacity="0.45" />
      <circle cx="12" cy="18" r="1.2" fill="currentColor" stroke="none" opacity="0.45" />
      <circle cx="6"  cy="12" r="1.2" fill="currentColor" stroke="none" opacity="0.45" />
      <circle cx="18" cy="12" r="1.2" fill="currentColor" stroke="none" opacity="0.45" />
      {/* Box lines — completing a box */}
      <line x1="7.8"  y1="6"  x2="10.2" y2="6" />
      <line x1="13.8" y1="6"  x2="16.2" y2="6" />
      <line x1="6"    y1="7.8" x2="6"   y2="10.2" />
      <line x1="6"    y1="13.8" x2="6"  y2="16.2" />
      <line x1="7.8"  y1="18" x2="10.2" y2="18" />
      <line x1="13.8" y1="18" x2="16.2" y2="18" />
      <line x1="18"   y1="7.8" x2="18"  y2="10.2" />
      <line x1="18"   y1="13.8" x2="18" y2="16.2" />
      {/* Filled center box */}
      <rect x="7" y="7" width="10" height="10" rx="0.5"
            fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/** Sea Battle — simplified ship on a horizon line */
export function IconSeaBattle({ size = 24, className = '' }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      {/* Waves */}
      <path d="M2 19 Q5.5 16.5 9 19 Q12.5 21.5 16 19 Q19.5 16.5 22 19" />
      {/* Hull */}
      <path d="M5 15 L5 13 L19 13 L19 15 Q17 17.5 12 17.5 Q7 17.5 5 15 Z" />
      {/* Cabin/superstructure */}
      <rect x="9" y="9" width="6" height="4" rx="1" />
      {/* Mast */}
      <line x1="12" y1="5" x2="12" y2="9" />
      {/* Flag */}
      <path d="M12 5 L15 6.5 L12 8" fill="currentColor" opacity="0.5" strokeWidth="0.8" />
    </svg>
  );
}

/** خمن الوقت — minimal stopwatch */
export function IconGuessTime({ size = 24, className = '' }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      {/* Crown/button */}
      <line x1="9.5"  y1="3" x2="14.5" y2="3" strokeWidth="2" />
      <line x1="12"   y1="3" x2="12"   y2="5.5" />
      {/* Side buttons */}
      <line x1="6"  y1="6.5" x2="4.5" y2="5" />
      {/* Circle */}
      <circle cx="12" cy="14" r="8.5" />
      {/* Hands */}
      <line x1="12" y1="14" x2="12"   y2="9.5" strokeWidth="1.8" />
      <line x1="12" y1="14" x2="16.5" y2="16"  strokeWidth="1.4" />
      {/* Center dot */}
      <circle cx="12" cy="14" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** أتوبيس كومبليت — simplified bus with windows */
export function IconBusComplete({ size = 24, className = '' }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      {/* Body */}
      <rect x="2" y="7" width="20" height="11" rx="3" />
      {/* Windows */}
      <rect x="4.5" y="9.5" width="4" height="3.5" rx="1" />
      <rect x="10"  y="9.5" width="4" height="3.5" rx="1" />
      <rect x="15.5" y="9.5" width="3" height="3.5" rx="1" />
      {/* Door */}
      <line x1="15.5" y1="13" x2="15.5" y2="18" strokeWidth="0.8" />
      {/* Wheels */}
      <circle cx="7"  cy="19" r="2" />
      <circle cx="17" cy="19" r="2" />
      {/* Wheel fill */}
      <circle cx="7"  cy="19" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="17" cy="19" r="0.8" fill="currentColor" stroke="none" />
      {/* Text line on front */}
      <line x1="2"  y1="10.5" x2="2" y2="14.5" strokeWidth="0.8" opacity="0.4" />
    </svg>
  );
}

/* ── UI Icons ────────────────────────────────────────────── */

/** Chip icon — for AI mode (instead of 🤖) */
export function IconChip({ size = 20, className = '' }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      {/* Chip body */}
      <rect x="7" y="7" width="10" height="10" rx="2" />
      {/* Grid lines */}
      <line x1="10" y1="7"  x2="10" y2="17" strokeWidth="0.8" />
      <line x1="14" y1="7"  x2="14" y2="17" strokeWidth="0.8" />
      <line x1="7"  y1="10" x2="17" y2="10" strokeWidth="0.8" />
      <line x1="7"  y1="14" x2="17" y2="14" strokeWidth="0.8" />
      {/* Pins — top */}
      <line x1="10" y1="4" x2="10" y2="7" />
      <line x1="14" y1="4" x2="14" y2="7" />
      {/* Pins — bottom */}
      <line x1="10" y1="17" x2="10" y2="20" />
      <line x1="14" y1="17" x2="14" y2="20" />
      {/* Pins — left */}
      <line x1="4" y1="10" x2="7" y2="10" />
      <line x1="4" y1="14" x2="7" y2="14" />
      {/* Pins — right */}
      <line x1="17" y1="10" x2="20" y2="10" />
      <line x1="17" y1="14" x2="20" y2="14" />
    </svg>
  );
}

/** Arrow-right for "join" / navigation (instead of 🚀) */
export function IconJoin({ size = 20, className = '' }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      <path d="M5 12 H19" />
      <path d="M13 6 L19 12 L13 18" />
    </svg>
  );
}

/** Copy icon (instead of 📋) */
export function IconCopy({ size = 18, className = '' }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      <rect x="8" y="2" width="11" height="14" rx="2" />
      <path d="M5 6 H4 Q2 6 2 8 V19 Q2 21 4 21 H14 Q16 21 16 19 V18" />
    </svg>
  );
}

/** Share/link icon (instead of 🔗) */
export function IconShare({ size = 18, className = '' }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      <path d="M4 12 L4 19 Q4 21 6 21 H18 Q20 21 20 19 V12" />
      <polyline points="12,3 12,15" />
      <polyline points="8,7 12,3 16,7" />
    </svg>
  );
}

/** Phone/offline icon (instead of 📱) */
export function IconPhone({ size = 20, className = '' }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      <rect x="5" y="2" width="14" height="20" rx="3" />
      <line x1="9" y1="5" x2="15" y2="5" />
      <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** WiFi/online icon (instead of 🌐) */
export function IconWifi({ size = 20, className = '' }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      <path d="M2 8.5 Q12 1 22 8.5" />
      <path d="M5.5 12 Q12 7 18.5 12" />
      <path d="M9 15.5 Q12 13 15 15.5" />
      <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Crosshair/target — turn indicator (instead of 🎯) */
export function IconTarget({ size = 18, className = '' }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2"  y1="12" x2="5"  y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
    </svg>
  );
}

/** Hourglass — waiting indicator (instead of ⏳) */
export function IconHourglass({ size = 18, className = '' }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      <path d="M5 2 H19" />
      <path d="M5 22 H19" />
      <path d="M5 2 Q5 12 12 12 Q19 12 19 22 L5 22 Q5 12 12 12 Q19 12 19 2 Z" />
    </svg>
  );
}

/** Edit/pen icon (instead of ✏️) */
export function IconEdit({ size = 18, className = '' }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      <path d="M11 4 H4 Q2 4 2 6 V20 Q2 22 4 22 H18 Q20 22 20 20 V13" />
      <path d="M18.5 2.5 Q20 1 21.5 2.5 Q23 4 21.5 5.5 L11 16 L7 17 L8 13 Z" />
    </svg>
  );
}

/** Online status dot pulse wrapper */
export function IconOnlineDot({ className = '' }) {
  return (
    <span className={`relative inline-flex h-2 w-2 ${className}`}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
    </span>
  );
}

/** Heart icon — SVG heart for footer/lives (instead of ❤️) */
export function IconHeart({ size = 16, className = '', filled = false }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}
         fill={filled ? "currentColor" : "none"}>
      <path d="M12 21 C12 21 3 14 3 8 Q3 4 6 3 Q9 2 12 6 Q15 2 18 3 Q21 4 21 8 Q21 14 12 21 Z" />
    </svg>
  );
}

/** Trophy — win screen */
export function IconTrophy({ size = 40, className = '' }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      <path d="M8 2 H16 V11 Q16 17 12 18 Q8 17 8 11 Z" />
      <path d="M3 4 H8 Q8 10 5 11 Q3 10 3 7 Z" opacity="0.6" />
      <path d="M16 4 H21 Q21 10 19 11 Q16 10 16 7" opacity="0.6" />
      <line x1="12" y1="18" x2="12" y2="21" />
      <line x1="8"  y1="21" x2="16" y2="21" />
    </svg>
  );
}

/** Trivia Duel — lightning bolt with question */
export function IconTriviaDuel({ size = 24, className = '' }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      {/* Lightning bolt */}
      <path d="M13 2 L6 13 H12 L11 22 L18 11 H12 Z" />
      {/* Small question mark */}
      <circle cx="20" cy="4" r="3" strokeWidth="1.2" />
      <path d="M20 3 Q20 3 20.5 3.5 Q21 4 20 4.5" strokeWidth="1" />
      <circle cx="20" cy="5.5" r="0.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Domino — two domino tiles in chain */
export function IconDominoGame({ size = 24, className = '' }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      {/* First domino tile */}
      <rect x="2" y="6" width="9" height="13" rx="1.5" />
      <line x1="2" y1="12.5" x2="11" y2="12.5" />
      <circle cx="5.5" cy="9.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="7.5" cy="9.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="6.5" cy="15" r="1.2" fill="currentColor" stroke="none" />
      {/* Second domino tile (rotated 90°) */}
      <rect x="12" y="8" width="10" height="6" rx="1.5" />
      <line x1="17" y1="8" x2="17" y2="14" />
      <circle cx="14.5" cy="11" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="19.5" cy="11" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** RPS Arena — rock fist / paper / scissors combined */
export function IconRPSArena({ size = 24, className = '' }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      {/* Fist (rock) */}
      <path d="M6 16 L6 10 Q6 8 8 8 Q10 8 10 10 L10 13 Q11 11 13 12 Q15 13 13 15 L12 18 Q11 20 9 20 L7 20 Q5 20 6 18 Z" />
      {/* Scissors blades */}
      <path d="M16 6 L21 11" strokeWidth="1.8" />
      <path d="M21 6 L16 11" strokeWidth="1.8" />
      {/* Pivot */}
      <circle cx="18.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" opacity="0.6" />
      {/* Star accent */}
      <path d="M18 16 L19 19 L22 19 L20 21 L21 24 L18 22 L15 24 L16 21 L14 19 L17 19 Z"
            transform="scale(0.6) translate(12, 5)" opacity="0.7" strokeWidth="0.8" />
    </svg>
  );
}

/** Air Hockey — puck + paddle */
export function IconAirHockey({ size = 24, className = '' }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      {/* Table outline */}
      <rect x="2" y="3" width="20" height="18" rx="2" />
      {/* Center line */}
      <line x1="2" y1="12" x2="22" y2="12" strokeWidth="0.8" opacity="0.5" />
      {/* Goals */}
      <line x1="8" y1="3" x2="16" y2="3" strokeWidth="2.5" />
      <line x1="8" y1="21" x2="16" y2="21" strokeWidth="2.5" />
      {/* Paddle (top) */}
      <circle cx="12" cy="7" r="3" />
      <circle cx="12" cy="7" r="1.2" fill="currentColor" stroke="none" opacity="0.5" />
      {/* Puck */}
      <circle cx="12" cy="15" r="2" fill="currentColor" opacity="0.8" stroke="none" />
    </svg>
  );
}

/** Quick Draw — pencil + speech bubble */
export function IconQuickDraw({ size = 24, className = '' }) {
  return (
    <svg {...iconProps} width={size} height={size} className={className}>
      {/* Canvas/paper */}
      <rect x="2" y="4" width="15" height="13" rx="2" />
      {/* Drawing stroke */}
      <path d="M5 13 Q7 9 9 11 Q11 13 13 9" strokeWidth="1.5" />
      {/* Pencil */}
      <path d="M16 13 L20 9 L22 11 L18 15 Z" />
      <line x1="16" y1="13" x2="15" y2="16" />
      <path d="M15 16 L14 17 L17 16 Z" fill="currentColor" stroke="none" opacity="0.6" />
      {/* Question mark bubble */}
      <path d="M14 18 Q14 18 16 18 Q18 18 18 20 Q18 22 16 22 H15 L14 23 V22 Q14 22 14 20 Q14 18 14 18 Z"
            strokeWidth="1.2" />
    </svg>
  );
}

/** The full icon map — used by Hub to pick icon by game ID */
export const GAME_ICON_MAP = {
  'code-game':    IconCodeGame,
  'word-game':    IconWordGame,
  'word-game-local': IconWordGame,
  'word-game-online': IconWordGame,
  'xo-game':      IconXOGame,
  'big-xo-game':  IconBigXOGame,
  'connect-4':    IconConnect4,
  'memory-game':  IconMemoryGame,
  'dots-boxes':   IconDotsBoxes,
  'sea-battle':   IconSeaBattle,
  'guess-time':   IconGuessTime,
  'bus-complete': IconBusComplete,
  'trivia-duel':  IconTriviaDuel,
  'domino-game':  IconDominoGame,
  'rps-arena':    IconRPSArena,
  'air-hockey':   IconAirHockey,
  'quick-draw':   IconQuickDraw,
};

export function GameIcon({ gameId, size = 26, className = '', style = {} }) {
  const Icon = GAME_ICON_MAP[gameId] || IconCodeGame;
  return (
    <div className={`inline-flex items-center justify-center shrink-0 ${className}`} style={style}>
      <Icon size={size} />
    </div>
  );
}
