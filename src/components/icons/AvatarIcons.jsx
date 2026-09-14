/**
 * AvatarIcons.jsx — 12 custom SVG avatar illustrations for Celia Games
 *
 * Style: Duotone Line-style — outline (currentColor) + filled accent shapes
 * Each avatar has a unique "bg color" hint (used as the circular background tint)
 * No emoji. Each is a real illustrated character icon.
 */

import React from 'react';

const baseProps = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 40 40",
  fill: "none",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

/* ── 1. Panda ── */
export function AvatarPanda({ size = 36 }) {
  return (
    <svg {...baseProps} width={size} height={size}>
      {/* Face */}
      <circle cx="20" cy="21" r="12" fill="white" stroke="#1a1a2e" strokeWidth="1.2" />
      {/* Ears */}
      <circle cx="10" cy="11" r="5" fill="#1a1a2e" />
      <circle cx="30" cy="11" r="5" fill="#1a1a2e" />
      <circle cx="10" cy="11" r="2.5" fill="#3a3a5c" />
      <circle cx="30" cy="11" r="2.5" fill="#3a3a5c" />
      {/* Eye patches */}
      <ellipse cx="15.5" cy="20" rx="4" ry="3.5" fill="#1a1a2e" />
      <ellipse cx="24.5" cy="20" rx="4" ry="3.5" fill="#1a1a2e" />
      {/* Eyes */}
      <circle cx="15.5" cy="20" r="1.8" fill="white" />
      <circle cx="24.5" cy="20" r="1.8" fill="white" />
      <circle cx="16"   cy="19.5" r="0.9" fill="#0a0a1a" />
      <circle cx="25"   cy="19.5" r="0.9" fill="#0a0a1a" />
      {/* Nose + mouth */}
      <ellipse cx="20" cy="24.5" rx="2" ry="1.2" fill="#1a1a2e" />
      <path d="M18 26.5 Q20 28 22 26.5" stroke="#1a1a2e" strokeWidth="1" fill="none" />
    </svg>
  );
}

/* ── 2. Queen / Crown ── */
export function AvatarQueen({ size = 36 }) {
  return (
    <svg {...baseProps} width={size} height={size}>
      {/* Face */}
      <circle cx="20" cy="24" r="10" fill="#FFF0F5" stroke="#C4006A" strokeWidth="1.2" />
      {/* Crown */}
      <path d="M8 18 L11 10 L15 15 L20 7 L25 15 L29 10 L32 18 Z"
            fill="#FFD700" stroke="#B8860B" strokeWidth="0.8" />
      <circle cx="20" cy="7"  r="2" fill="#FF3D8A" />
      <circle cx="11" cy="10" r="1.5" fill="#FF3D8A" />
      <circle cx="29" cy="10" r="1.5" fill="#FF3D8A" />
      {/* Eyes */}
      <ellipse cx="16.5" cy="23" rx="2.5" ry="2.8" fill="white" stroke="#C4006A" strokeWidth="0.8" />
      <ellipse cx="23.5" cy="23" rx="2.5" ry="2.8" fill="white" stroke="#C4006A" strokeWidth="0.8" />
      <circle cx="17" cy="23" r="1.3" fill="#1a0a10" />
      <circle cx="24" cy="23" r="1.3" fill="#1a0a10" />
      {/* Smile */}
      <path d="M16 28 Q20 31 24 28" stroke="#C4006A" strokeWidth="1.2" fill="none" />
    </svg>
  );
}

/* ── 3. Lion ── */
export function AvatarLion({ size = 36 }) {
  return (
    <svg {...baseProps} width={size} height={size}>
      {/* Mane */}
      <circle cx="20" cy="22" r="14" fill="#E8840A" opacity="0.9" />
      {/* Face */}
      <circle cx="20" cy="22" r="9" fill="#FFCD6B" stroke="#B86000" strokeWidth="1" />
      {/* Ears */}
      <path d="M12 13 Q9 8 13 10 Z" fill="#E8840A" />
      <path d="M28 13 Q31 8 27 10 Z" fill="#E8840A" />
      {/* Eyes */}
      <ellipse cx="16.5" cy="20.5" rx="2.2" ry="2.5" fill="white" />
      <ellipse cx="23.5" cy="20.5" rx="2.2" ry="2.5" fill="white" />
      <circle cx="17"   cy="20.5" r="1.2" fill="#3D1C00" />
      <circle cx="24"   cy="20.5" r="1.2" fill="#3D1C00" />
      {/* Nose */}
      <path d="M18 24 L20 23 L22 24 L20 25.5 Z" fill="#B86000" />
      {/* Whiskers */}
      <line x1="10" y1="25" x2="16" y2="24.5" stroke="#B86000" strokeWidth="0.7" />
      <line x1="10" y1="27" x2="16" y2="26"   stroke="#B86000" strokeWidth="0.7" />
      <line x1="24" y1="24.5" x2="30" y2="25" stroke="#B86000" strokeWidth="0.7" />
      <line x1="24" y1="26"   x2="30" y2="27" stroke="#B86000" strokeWidth="0.7" />
    </svg>
  );
}

/* ── 4. Cool / Sunglasses ── */
export function AvatarCool({ size = 36 }) {
  return (
    <svg {...baseProps} width={size} height={size}>
      {/* Face */}
      <circle cx="20" cy="22" r="12" fill="#2D1B69" stroke="#7B5FFF" strokeWidth="1.2" />
      {/* Hair */}
      <path d="M9 18 Q10 8 20 8 Q30 8 31 18" fill="#1A0D40" />
      {/* Sunglasses frame */}
      <rect x="8"  y="17" width="9" height="6" rx="2.5" fill="#0a0a1a" stroke="#7B5FFF" strokeWidth="1" />
      <rect x="19" y="17" width="9" height="6" rx="2.5" fill="#0a0a1a" stroke="#7B5FFF" strokeWidth="1" />
      <line x1="17" y1="20" x2="19" y2="20" stroke="#7B5FFF" strokeWidth="1" />
      {/* Lens shine */}
      <line x1="10" y1="18.5" x2="12" y2="20" stroke="#7B5FFF" strokeWidth="0.7" opacity="0.5" />
      <line x1="21" y1="18.5" x2="23" y2="20" stroke="#7B5FFF" strokeWidth="0.7" opacity="0.5" />
      {/* Smile */}
      <path d="M15 27 Q20 30.5 25 27" stroke="#7B5FFF" strokeWidth="1.2" fill="none" />
    </svg>
  );
}

/* ── 5. Alien ── */
export function AvatarAlien({ size = 36 }) {
  return (
    <svg {...baseProps} width={size} height={size}>
      {/* Head — large oval */}
      <ellipse cx="20" cy="20" rx="13" ry="16" fill="#00C878" stroke="#00A060" strokeWidth="1.2" />
      {/* Big eyes */}
      <ellipse cx="15" cy="19" rx="4.5" ry="5.5" fill="#001A10" stroke="#00E5A0" strokeWidth="0.8" />
      <ellipse cx="25" cy="19" rx="4.5" ry="5.5" fill="#001A10" stroke="#00E5A0" strokeWidth="0.8" />
      {/* Eye shine */}
      <ellipse cx="16" cy="17" rx="1.5" ry="2" fill="#00E5A0" opacity="0.6" />
      <ellipse cx="26" cy="17" rx="1.5" ry="2" fill="#00E5A0" opacity="0.6" />
      {/* Mouth — thin line */}
      <path d="M16 29 Q20 31 24 29" stroke="#00A060" strokeWidth="1" fill="none" />
      {/* Antenna */}
      <line x1="20" y1="4" x2="20" y2="8" stroke="#00A060" strokeWidth="1.2" />
      <circle cx="20" cy="3.5" r="1.5" fill="#00E5A0" />
    </svg>
  );
}

/* ── 6. Robot ── */
export function AvatarRobot({ size = 36 }) {
  return (
    <svg {...baseProps} width={size} height={size}>
      {/* Head */}
      <rect x="8" y="10" width="24" height="22" rx="4" fill="#1E2A3A" stroke="#4C8DFF" strokeWidth="1.2" />
      {/* Antenna */}
      <line x1="20" y1="5" x2="20" y2="10" stroke="#4C8DFF" strokeWidth="1.5" />
      <circle cx="20" cy="4" r="2" fill="#4C8DFF" />
      {/* Eyes — rectangular LED */}
      <rect x="10.5" y="15" width="7" height="5" rx="1.5" fill="#4C8DFF" opacity="0.9" />
      <rect x="22.5" y="15" width="7" height="5" rx="1.5" fill="#4C8DFF" opacity="0.9" />
      {/* Eye inner */}
      <rect x="13" y="16.5" width="2.5" height="2" rx="0.5" fill="white" opacity="0.8" />
      <rect x="25" y="16.5" width="2.5" height="2" rx="0.5" fill="white" opacity="0.8" />
      {/* Mouth — LED strip */}
      <rect x="11" y="24" width="18" height="3" rx="1.5" fill="#4C8DFF" opacity="0.4" />
      <rect x="12" y="24.5" width="3" height="2" rx="0.5" fill="#4C8DFF" />
      <rect x="16.5" y="24.5" width="3" height="2" rx="0.5" fill="#4C8DFF" />
      <rect x="21" y="24.5" width="3" height="2" rx="0.5" fill="#4C8DFF" />
      {/* Side bolts */}
      <circle cx="8"  cy="20" r="2" fill="#0B1B3A" stroke="#4C8DFF" strokeWidth="1" />
      <circle cx="32" cy="20" r="2" fill="#0B1B3A" stroke="#4C8DFF" strokeWidth="1" />
    </svg>
  );
}

/* ── 7. Rose ── */
export function AvatarRose({ size = 36 }) {
  return (
    <svg {...baseProps} width={size} height={size}>
      {/* Stem */}
      <path d="M20 36 L20 22" stroke="#2D6A2D" strokeWidth="1.5" />
      <path d="M20 30 Q16 28 15 25" stroke="#2D6A2D" strokeWidth="1" />
      {/* Petals — outer */}
      <ellipse cx="20" cy="14" rx="5" ry="7" fill="#FF3D8A" opacity="0.7" transform="rotate(0  20 14)" />
      <ellipse cx="20" cy="14" rx="5" ry="7" fill="#FF3D8A" opacity="0.7" transform="rotate(72  20 14)" />
      <ellipse cx="20" cy="14" rx="5" ry="7" fill="#FF3D8A" opacity="0.7" transform="rotate(144 20 14)" />
      <ellipse cx="20" cy="14" rx="5" ry="7" fill="#FF3D8A" opacity="0.7" transform="rotate(216 20 14)" />
      <ellipse cx="20" cy="14" rx="5" ry="7" fill="#FF3D8A" opacity="0.7" transform="rotate(288 20 14)" />
      {/* Center */}
      <circle cx="20" cy="14" r="5" fill="#C4006A" />
      <circle cx="20" cy="14" r="2.5" fill="#FF6BAE" />
    </svg>
  );
}

/* ── 8. Cherry ── */
export function AvatarCherry({ size = 36 }) {
  return (
    <svg {...baseProps} width={size} height={size}>
      {/* Stems */}
      <path d="M15 22 Q14 12 20 8 Q26 12 25 22" stroke="#2D6A2D" strokeWidth="1.3" fill="none" />
      {/* Leaf */}
      <path d="M20 9 Q24 6 25 10 Q22 11 20 9 Z" fill="#2D6A2D" />
      {/* Cherry 1 */}
      <circle cx="13" cy="25" r="7" fill="#CC1A1A" stroke="#8B0000" strokeWidth="1" />
      {/* Cherry 2 */}
      <circle cx="27" cy="25" r="7" fill="#CC1A1A" stroke="#8B0000" strokeWidth="1" />
      {/* Shine on each cherry */}
      <ellipse cx="11" cy="22.5" rx="2" ry="1.5" fill="rgba(255,255,255,0.35)" />
      <ellipse cx="25" cy="22.5" rx="2" ry="1.5" fill="rgba(255,255,255,0.35)" />
    </svg>
  );
}

/* ── 9. Fire ── */
export function AvatarFire({ size = 36 }) {
  return (
    <svg {...baseProps} width={size} height={size}>
      {/* Outer flame */}
      <path d="M20 3 C24 8 30 14 28 22 C26 30 14 32 12 22 C10 14 16 18 14 11 C17 16 18 19 20 19 C18 15 16 8 20 3 Z"
            fill="#FF6B00" stroke="#FF3D00" strokeWidth="0.8" />
      {/* Inner flame */}
      <path d="M20 12 C22 16 24 20 22 24 C20 28 17 27 17 24 C15 20 18 19 17 16 C18 19 20 20 20 21 C19 18 18 14 20 12 Z"
            fill="#FFD700" />
      {/* Core */}
      <ellipse cx="20" cy="24" rx="3" ry="2.5" fill="#FF9500" />
    </svg>
  );
}

/* ── 10. Tiger ── */
export function AvatarTiger({ size = 36 }) {
  return (
    <svg {...baseProps} width={size} height={size}>
      {/* Face */}
      <circle cx="20" cy="22" r="12" fill="#FF9500" stroke="#B86000" strokeWidth="1" />
      {/* Ears */}
      <path d="M9 13 Q7 5 13 9 Z"  fill="#FF9500" stroke="#B86000" strokeWidth="0.8" />
      <path d="M31 13 Q33 5 27 9 Z" fill="#FF9500" stroke="#B86000" strokeWidth="0.8" />
      <path d="M10 12 Q9 7.5 12.5 10 Z" fill="#FFC06A" />
      <path d="M30 12 Q31 7.5 27.5 10 Z" fill="#FFC06A" />
      {/* Stripes */}
      <path d="M14 11 Q15 14 14 17" stroke="#1a0a00" strokeWidth="1.5" fill="none" />
      <path d="M26 11 Q25 14 26 17" stroke="#1a0a00" strokeWidth="1.5" fill="none" />
      <path d="M17 9  Q18 12 17 14" stroke="#1a0a00" strokeWidth="1" fill="none" />
      <path d="M23 9  Q22 12 23 14" stroke="#1a0a00" strokeWidth="1" fill="none" />
      {/* Eyes */}
      <ellipse cx="16" cy="21" rx="2.5" ry="3" fill="#FFD700" />
      <ellipse cx="24" cy="21" rx="2.5" ry="3" fill="#FFD700" />
      <ellipse cx="16" cy="21" rx="1"   ry="2.2" fill="#1a0a00" />
      <ellipse cx="24" cy="21" rx="1"   ry="2.2" fill="#1a0a00" />
      {/* Nose + mouth */}
      <path d="M18 25 L20 24 L22 25 L20 26.5 Z" fill="#B86000" />
      <path d="M18 26.5 Q17 28 15 28" stroke="#B86000" strokeWidth="0.9" fill="none" />
      <path d="M22 26.5 Q23 28 25 28" stroke="#B86000" strokeWidth="0.9" fill="none" />
      {/* Whiskers */}
      <line x1="9" y1="25" x2="16" y2="25"  stroke="#B86000" strokeWidth="0.7" />
      <line x1="24" y1="25" x2="31" y2="25" stroke="#B86000" strokeWidth="0.7" />
    </svg>
  );
}

/* ── 11. Star ── */
export function AvatarStar({ size = 36 }) {
  return (
    <svg {...baseProps} width={size} height={size}>
      {/* Glow ring */}
      <circle cx="20" cy="20" r="16" fill="#FFD700" opacity="0.12" />
      {/* Star body */}
      <path d="M20 4 L23.5 14.5 L35 14.5 L25.5 21 L29 32 L20 25.5 L11 32 L14.5 21 L5 14.5 L16.5 14.5 Z"
            fill="#FFD700" stroke="#B8860B" strokeWidth="1" />
      {/* Inner star */}
      <path d="M20 10 L22 16.5 L29 16.5 L23.5 20.5 L25.5 27 L20 23 L14.5 27 L16.5 20.5 L11 16.5 L18 16.5 Z"
            fill="#FFE44D" opacity="0.6" />
      {/* Shine */}
      <ellipse cx="16" cy="13" rx="2.5" ry="1.5" fill="white" opacity="0.4" transform="rotate(-20 16 13)" />
    </svg>
  );
}

/* ── 12. Rocket ── */
export function AvatarRocket({ size = 36 }) {
  return (
    <svg {...baseProps} width={size} height={size}>
      {/* Flame */}
      <path d="M16 32 Q18 28 20 30 Q22 28 24 32 Q21 36 20 34 Q19 36 16 32 Z"
            fill="#FF6B00" opacity="0.9" />
      {/* Body */}
      <path d="M13 28 L13 18 Q13 8 20 5 Q27 8 27 18 L27 28 Z"
            fill="#2E6BFF" stroke="#1A3A8F" strokeWidth="1" />
      {/* Nose cone */}
      <path d="M13 18 Q13 8 20 5 Q27 8 27 18" fill="#4C8DFF" />
      {/* Wings */}
      <path d="M13 28 Q8 26 8 32 L13 30 Z"  fill="#1A3A8F" />
      <path d="M27 28 Q32 26 32 32 L27 30 Z" fill="#1A3A8F" />
      {/* Window */}
      <circle cx="20" cy="18" r="4" fill="white" stroke="#1A3A8F" strokeWidth="1" />
      <circle cx="20" cy="18" r="2.5" fill="#A0C8FF" />
      <circle cx="19" cy="17" r="1" fill="white" opacity="0.6" />
    </svg>
  );
}

/* ── Avatar catalogue (ordered to match original emoji order) ── */
export const AVATARS = [
  { id: 'cool',   label: 'كول',    Component: AvatarCool,   bg: 'rgba(123,95,255,0.15)' },
  { id: 'lion',   label: 'أسد',    Component: AvatarLion,   bg: 'rgba(232,132,10,0.15)' },
  { id: 'queen',  label: 'ملكة',   Component: AvatarQueen,  bg: 'rgba(255,61,138,0.15)' },
  { id: 'panda',  label: 'باندا',  Component: AvatarPanda,  bg: 'rgba(100,100,160,0.15)' },
  { id: 'cherry', label: 'كريز',   Component: AvatarCherry, bg: 'rgba(204,26,26,0.12)' },
  { id: 'rose',   label: 'وردة',   Component: AvatarRose,   bg: 'rgba(255,61,138,0.1)' },
  { id: 'robot',  label: 'روبوت',  Component: AvatarRobot,  bg: 'rgba(76,141,255,0.12)' },
  { id: 'alien',  label: 'فضائي',  Component: AvatarAlien,  bg: 'rgba(0,200,120,0.12)' },
  { id: 'rocket', label: 'صاروخ',  Component: AvatarRocket, bg: 'rgba(46,107,255,0.15)' },
  { id: 'star',   label: 'نجمة',   Component: AvatarStar,   bg: 'rgba(255,215,0,0.12)' },
  { id: 'tiger',  label: 'نمر',    Component: AvatarTiger,  bg: 'rgba(255,149,0,0.12)' },
  { id: 'fire',   label: 'نار',    Component: AvatarFire,   bg: 'rgba(255,107,0,0.15)' },
];

const EMOJI_TO_ID = {
  '😎': 'cool',
  '🦁': 'lion',
  '👸': 'queen',
  '🐼': 'panda',
  '🍒': 'cherry',
  '🌹': 'rose',
  '🤖': 'robot',
  '👽': 'alien',
  '🚀': 'rocket',
  '⭐': 'star',
  '🐯': 'tiger',
  '🔥': 'fire',
};

/** Display component — renders the avatar for a given avatarId */
export function AvatarDisplay({ avatarId, size = 36 }) {
  const resolvedId = EMOJI_TO_ID[avatarId] || avatarId;
  const found = AVATARS.find(a => a.id === resolvedId);
  if (!found) {
    // Fallback: first avatar
    const Fallback = AVATARS[0].Component;
    return <Fallback size={size} />;
  }
  const { Component } = found;
  return <Component size={size} />;
}
