/**
 * EmoteIcons.jsx — Custom SVG emote faces for Celia Games
 *
 * Same shapes/emotions as the original emoji set, but illustrated as
 * proper SVG faces with character — not platform emoji.
 * 8 emotes: Cool, Angry, Laughing, Mind-blown, Thumbs-up, Thumbs-down, Broken heart, Party
 */

import React from 'react';

const face = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 40 40",
  fill: "none",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

/* Helper — face circle */
const Face = ({ color = '#FFCD6B', stroke = '#B86000', children }) => (
  <>
    <circle cx="20" cy="20" r="17" fill={color} stroke={stroke} strokeWidth="1.2" />
    {children}
  </>
);

/* ── 1. Cool / Sunglasses ── */
export function EmoteCool({ size = 32 }) {
  return (
    <svg {...face} width={size} height={size}>
      <Face color="#FFCD6B">
        {/* Sunglasses */}
        <rect x="6"  y="14" width="11" height="7" rx="3" fill="#1a1a2e" stroke="#fff" strokeWidth="0.8" />
        <rect x="19" y="14" width="11" height="7" rx="3" fill="#1a1a2e" stroke="#fff" strokeWidth="0.8" />
        <line x1="4" y1="17" x2="6"  y2="17" stroke="#1a1a2e" strokeWidth="1.2" />
        <line x1="30" y1="17" x2="32" y2="17" stroke="#1a1a2e" strokeWidth="1.2" />
        <line x1="17" y1="17.5" x2="19" y2="17.5" stroke="#1a1a2e" strokeWidth="1" />
        {/* Shine on lenses */}
        <line x1="8" y1="15.5" x2="11" y2="17.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
        <line x1="21" y1="15.5" x2="24" y2="17.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
        {/* Smirk */}
        <path d="M15 27 Q20 31 25 27" stroke="#B86000" strokeWidth="1.5" />
      </Face>
    </svg>
  );
}

/* ── 2. Angry ── */
export function EmoteAngry({ size = 32 }) {
  return (
    <svg {...face} width={size} height={size}>
      <Face color="#FF5A5A" stroke="#CC0000">
        {/* Angry brows */}
        <path d="M8  13 Q12 11 16 14" stroke="#CC0000" strokeWidth="2" />
        <path d="M24 14 Q28 11 32 13" stroke="#CC0000" strokeWidth="2" />
        {/* Eyes */}
        <ellipse cx="13" cy="18" rx="3.5" ry="4" fill="white" />
        <ellipse cx="27" cy="18" rx="3.5" ry="4" fill="white" />
        <circle cx="13" cy="18" r="2" fill="#1a0a0a" />
        <circle cx="27" cy="18" r="2" fill="#1a0a0a" />
        {/* Frown */}
        <path d="M14 29 Q20 25 26 29" stroke="#CC0000" strokeWidth="1.8" />
        {/* Vein */}
        <path d="M5 8 Q7 5 9 8 Q7 9 5 8 Z" stroke="#CC0000" strokeWidth="0.8" fill="rgba(204,0,0,0.3)" />
      </Face>
    </svg>
  );
}

/* ── 3. Laughing ── */
export function EmoteLaugh({ size = 32 }) {
  return (
    <svg {...face} width={size} height={size}>
      <Face>
        {/* Squinty eyes */}
        <path d="M9  17 Q13 14 17 17" stroke="#B86000" strokeWidth="1.8" />
        <path d="M23 17 Q27 14 31 17" stroke="#B86000" strokeWidth="1.8" />
        {/* Open mouth */}
        <path d="M11 24 Q20 34 29 24" stroke="#B86000" strokeWidth="1.2" fill="#B86000" />
        <path d="M11 24 Q20 32 29 24" fill="#CC5500" />
        {/* Teeth */}
        <line x1="15" y1="24" x2="15" y2="27" stroke="white" strokeWidth="1" />
        <line x1="18" y1="24" x2="18" y2="27.5" stroke="white" strokeWidth="1" />
        <line x1="21" y1="24" x2="21" y2="27.5" stroke="white" strokeWidth="1" />
        <line x1="24" y1="24" x2="24" y2="27" stroke="white" strokeWidth="1" />
        {/* Tear of laughter */}
        <path d="M8 18 Q6 22 8 24 Q10 22 8 18 Z" fill="#7AB8FF" opacity="0.8" />
      </Face>
    </svg>
  );
}

/* ── 4. Mind-blown ── */
export function EmoteMindBlown({ size = 32 }) {
  return (
    <svg {...face} width={size} height={size}>
      <Face color="#FFB830">
        {/* Explosion rays */}
        {[0,45,90,135,180,225,270,315].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = 20 + Math.cos(rad) * 17;
          const y1 = 20 + Math.sin(rad) * 17;
          const x2 = 20 + Math.cos(rad) * 21;
          const y2 = 20 + Math.sin(rad) * 21;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FF6B00" strokeWidth="1.5" />;
        })}
        {/* Wide eyes */}
        <circle cx="13" cy="18" r="4.5" fill="white" stroke="#B86000" strokeWidth="0.8" />
        <circle cx="27" cy="18" r="4.5" fill="white" stroke="#B86000" strokeWidth="0.8" />
        <circle cx="13" cy="18" r="2.5" fill="#1a0a00" />
        <circle cx="27" cy="18" r="2.5" fill="#1a0a00" />
        <circle cx="14" cy="17" r="1" fill="white" />
        <circle cx="28" cy="17" r="1" fill="white" />
        {/* Open O mouth */}
        <ellipse cx="20" cy="28" rx="5" ry="4" fill="#CC5500" stroke="#B86000" strokeWidth="0.8" />
      </Face>
    </svg>
  );
}

/* ── 5. Thumbs Up ── */
export function EmoteThumbsUp({ size = 32 }) {
  return (
    <svg {...face} width={size} height={size}>
      <Face color="#7BDE7B" stroke="#2D8A2D">
        {/* Happy eyes */}
        <path d="M11 17 Q14 14 17 17" stroke="#2D8A2D" strokeWidth="1.8" />
        <path d="M23 17 Q26 14 29 17" stroke="#2D8A2D" strokeWidth="1.8" />
        {/* Smile */}
        <path d="M13 25 Q20 31 27 25" stroke="#2D8A2D" strokeWidth="1.8" />
        {/* Thumb */}
        <path d="M29 10 L32 14 Q35 18 33 22 Q31 26 28 24 L25 23 L24 18 Q24 12 29 10 Z"
              fill="#FFCD6B" stroke="#B86000" strokeWidth="1" />
        <line x1="29" y1="16" x2="33" y2="15" stroke="#B86000" strokeWidth="0.7" />
        <line x1="28.5" y1="18" x2="33" y2="18" stroke="#B86000" strokeWidth="0.7" />
        <line x1="28" y1="20" x2="32.5" y2="20.5" stroke="#B86000" strokeWidth="0.7" />
      </Face>
    </svg>
  );
}

/* ── 6. Thumbs Down ── */
export function EmoteThumbsDown({ size = 32 }) {
  return (
    <svg {...face} width={size} height={size}>
      <Face color="#FF9E9E" stroke="#CC3333">
        {/* Sad eyes */}
        <path d="M11 16 Q14 19 17 16" stroke="#CC3333" strokeWidth="1.8" />
        <path d="M23 16 Q26 19 29 16" stroke="#CC3333" strokeWidth="1.8" />
        {/* Frown */}
        <path d="M13 27 Q20 22 27 27" stroke="#CC3333" strokeWidth="1.8" />
        {/* Thumb down */}
        <path d="M29 30 L32 26 Q35 22 33 18 Q31 14 28 16 L25 17 L24 22 Q24 28 29 30 Z"
              fill="#FFCD6B" stroke="#B86000" strokeWidth="1" />
        <line x1="29" y1="24" x2="33" y2="25" stroke="#B86000" strokeWidth="0.7" />
        <line x1="28.5" y1="22" x2="33" y2="22" stroke="#B86000" strokeWidth="0.7" />
        <line x1="28" y1="20" x2="32.5" y2="19.5" stroke="#B86000" strokeWidth="0.7" />
      </Face>
    </svg>
  );
}

/* ── 7. Broken Heart ── */
export function EmoteBrokenHeart({ size = 32 }) {
  return (
    <svg {...face} width={size} height={size}>
      <Face color="#C8C8E8" stroke="#6060A0">
        {/* Sad eyes */}
        <path d="M10 15 Q13 18 16 15" stroke="#6060A0" strokeWidth="1.5" />
        <path d="M24 15 Q27 18 30 15" stroke="#6060A0" strokeWidth="1.5" />
        {/* Teardrop */}
        <path d="M12 20 Q10 24 12 26 Q14 24 12 20 Z" fill="#7AB8FF" opacity="0.7" />
        {/* Broken heart */}
        <path d="M13 26 Q8 21 8 17 Q8 12 13 12 Q16 12 18 15 L20 13 L22 17 Q24 12 27 12 Q32 12 32 17 Q32 21 27 26 L20 34 Z"
              fill="#FF6BAE" stroke="#CC0066" strokeWidth="0.8" />
        {/* Break line */}
        <path d="M18 15 L16 20 L20 20 L18 25" stroke="white" strokeWidth="1.2" />
        {/* Frown */}
        <path d="M13 29 Q20 25 27 29" stroke="#6060A0" strokeWidth="1.5" />
      </Face>
    </svg>
  );
}

/* ── 8. Party / Celebration ── */
export function EmoteParty({ size = 32 }) {
  return (
    <svg {...face} width={size} height={size}>
      <Face color="#FFCD6B">
        {/* Party hat */}
        <path d="M8 15 L20 2 L32 15 Z" fill="#FF3D8A" stroke="#CC0066" strokeWidth="0.8" />
        <line x1="14" y1="8.5" x2="20" y2="2" stroke="white" strokeWidth="1" opacity="0.5" />
        <circle cx="20" cy="2" r="2" fill="white" />
        {/* Confetti */}
        <rect x="3"  y="5"  width="3" height="3" rx="0.5" fill="#FF3D8A" transform="rotate(20 5 7)" />
        <rect x="32" y="7"  width="2.5" height="2.5" rx="0.5" fill="#4C8DFF" transform="rotate(-15 33 8)" />
        <rect x="5"  y="20" width="2" height="2" rx="0.5" fill="#FFD700" transform="rotate(35 6 21)" />
        <rect x="33" y="20" width="2" height="2" rx="0.5" fill="#00E5A0" transform="rotate(-25 34 21)" />
        {/* Happy eyes */}
        <path d="M11 20 Q14 17 17 20" stroke="#B86000" strokeWidth="2" />
        <path d="M23 20 Q26 17 29 20" stroke="#B86000" strokeWidth="2" />
        {/* Wide smile */}
        <path d="M12 26 Q20 33 28 26" stroke="#B86000" strokeWidth="1.5" fill="#CC5500" />
        <line x1="16" y1="26" x2="16" y2="29" stroke="white" strokeWidth="1" />
        <line x1="20" y1="26" x2="20" y2="30" stroke="white" strokeWidth="1" />
        <line x1="24" y1="26" x2="24" y2="29" stroke="white" strokeWidth="1" />
      </Face>
    </svg>
  );
}

/* ── Emote catalogue ── */
export const EMOTES = [
  { id: 'cool',       label: 'كول',        Component: EmoteCool },
  { id: 'angry',      label: 'غاضب',       Component: EmoteAngry },
  { id: 'laugh',      label: 'ضحك',        Component: EmoteLaugh },
  { id: 'mindblown',  label: 'مجنون',      Component: EmoteMindBlown },
  { id: 'thumbsup',   label: 'تمام',       Component: EmoteThumbsUp },
  { id: 'thumbsdown', label: 'بالعكس',    Component: EmoteThumbsDown },
  { id: 'brokenheart',label: 'قلب مكسور', Component: EmoteBrokenHeart },
  { id: 'party',      label: 'احتفال',     Component: EmoteParty },
];

const EMOJI_TO_EMOTE_ID = {
  '😎': 'cool',
  '😡': 'angry',
  '😂': 'laugh',
  '🤯': 'mindblown',
  '👍': 'thumbsup',
  '👎': 'thumbsdown',
  '💔': 'brokenheart',
  '🎉': 'party',
};

/** Renders a single emote by ID */
export function EmoteDisplay({ emoteId, size = 32 }) {
  const resolvedId = EMOJI_TO_EMOTE_ID[emoteId] || emoteId;
  const found = EMOTES.find(e => e.id === resolvedId);
  if (!found) return null;
  const { Component } = found;
  return <Component size={size} />;
}
