import React from 'react';
import ThemeToggle from './ThemeToggle';
import Logo from './Logo';
import ProfileWidget from './ProfileWidget';
import { playSound, playHaptic } from '../lib/audioEngine';

/* ─── game catalogue ─────────────────────────────────────────────────────── */
const GAMES = [
    {
        id: 'code-game',
        emoji: '🔐',
        title: 'خمن الكود',
        desc: 'كود سري وردود فعل ملونة',
        badge: 'أونلاين',
        accent: '#00e5a0',
    },
    {
        id: 'word-game',          // special — has sub-modes
        emoji: '🧠',
        title: 'خمن الكلمة',
        desc: 'حرف حرف لحد ما تخمنها',
        badge: null,              // handled separately
        accent: '#818cf8',
    },
    {
        id: 'xo-game',
        emoji: '✖️⭕',
        title: 'إكس أو',
        desc: 'الكلاسيك',
        badge: 'أونلاين',
        accent: '#f472b6',
    },
    {
        id: 'big-xo-game',
        emoji: '🎯',
        title: 'Big XO',
        desc: '٩ إكس أو في واحدة',
        badge: 'أونلاين',
        accent: '#a78bfa',
    },
    {
        id: 'connect-4',
        emoji: '🟡',
        title: 'Connect 4',
        desc: 'رص ٤ في صف',
        badge: 'أونلاين',
        accent: '#fbbf24',
    },
    {
        id: 'memory-game',
        emoji: '🃏',
        title: 'Memory Match',
        desc: 'تطابق الورق',
        badge: 'أونلاين',
        accent: '#34d399',
    },
    {
        id: 'dots-boxes',
        emoji: '⬜',
        title: 'Dots & Boxes',
        desc: 'أكمل المربع',
        badge: 'أونلاين',
        accent: '#60a5fa',
    },
    {
        id: 'sea-battle',
        emoji: '🚢',
        title: 'Sea Battle',
        desc: 'حرب السفن',
        badge: 'أونلاين',
        accent: '#38bdf8',
    },
    {
        id: 'guess-time',
        emoji: '⏱️',
        title: 'خمن الوقت',
        desc: 'وقّف الساعة في اللحظة',
        badge: 'أونلاين',
        accent: '#fb923c',
    },
    {
        id: 'bus-complete',
        emoji: '🚌',
        title: 'أتوبيس كومبليت',
        desc: 'اسم حيوان نبات جماد بلد',
        badge: 'أونلاين',
        accent: '#4ade80',
    },
];

/* ─── word game sub-selector ─────────────────────────────────────────────── */
function WordGameSelector({ onSelect }) {
    return (
        <div className="grid grid-cols-2 gap-2 mt-3">
            <button
                onClick={() => onSelect('word-game-local')}
                className="glass-card rounded-2xl py-3 px-4 flex flex-col items-center gap-1 transition-all hover:border-[var(--primary-color)] active:scale-95"
            >
                <span className="text-2xl">📱</span>
                <span className="text-sm font-black">أوفلاين</span>
                <span className="text-[10px] opacity-40 font-medium">جهاز واحد</span>
            </button>
            <button
                onClick={() => onSelect('word-game-online')}
                className="glass-card rounded-2xl py-3 px-4 flex flex-col items-center gap-1 transition-all hover:border-[var(--primary-color)] active:scale-95"
            >
                <span className="text-2xl">🌐</span>
                <span className="text-sm font-black">أونلاين</span>
                <span className="text-[10px] opacity-40 font-medium">جهازين</span>
            </button>
        </div>
    );
}

/* ─── main hub ───────────────────────────────────────────────────────────── */
export default function Hub({ setView }) {
    const [wordExpanded, setWordExpanded] = React.useState(false);

    const go = (viewName) => {
        playSound('click');
        playHaptic(15);
        setView(viewName);
    };

    const handleCardClick = (game) => {
        if (game.id === 'word-game') {
            playSound('click');
            setWordExpanded(v => !v);
        } else {
            go(game.id);
        }
    };

    return (
        <>
            {/* Background */}
            <div className="animated-bg">
                <div className="bg-orb-3" />
                <div className="animated-bg-noise" />
            </div>

            <div className="min-h-dvh flex flex-col items-center px-4 safe-area-pt">

                {/* ── Header ── */}
                <header className="w-full max-w-md flex justify-between items-center py-4 mb-1">
                    <Logo />
                    <div className="flex items-center gap-2">
                        <ProfileWidget />
                        <ThemeToggle />
                    </div>
                </header>

                {/* ── Hero Tagline ── */}
                <div className="w-full max-w-md mb-6">
                    <p className="text-xs font-bold opacity-40 tracking-widest uppercase">
                        اختار اللعبة وابدأ التحدي
                    </p>
                </div>

                {/* ── Games List ── */}
                <main className="w-full max-w-md flex flex-col gap-3 flex-1 pb-24">

                    {GAMES.map((game) => (
                        <div key={game.id}>
                            <button
                                onClick={() => handleCardClick(game)}
                                className="game-card"
                                style={{ '--card-accent': game.accent }}
                            >
                                {/* shimmer layer */}
                                <span className="game-card-shimmer" />

                                {/* icon */}
                                <div
                                    className="game-card-icon flex items-center justify-center"
                                    style={{ 
                                        boxShadow: `0 0 20px ${game.accent}55`,
                                        fontSize: game.id === 'xo-game' ? '1.1rem' : '1.5rem',
                                        letterSpacing: game.id === 'xo-game' ? '-2px' : 'normal'
                                    }}
                                >
                                    {game.emoji}
                                </div>

                                {/* text */}
                                <div className="game-card-body">
                                    <p className="game-card-title">{game.title}</p>
                                    <p className="game-card-desc">{game.desc}</p>
                                </div>

                                {/* badge / arrow */}
                                {game.badge && (
                                    <span
                                        className="game-card-badge"
                                        style={{
                                            color: game.accent,
                                            borderColor: `${game.accent}55`,
                                            background: `${game.accent}14`,
                                        }}
                                    >
                                        {game.badge}
                                    </span>
                                )}
                                {game.id === 'word-game' && (
                                    <span className="text-white/30 text-sm font-black ml-1 transition-transform"
                                        style={{ transform: wordExpanded ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>
                                        ›
                                    </span>
                                )}
                            </button>

                            {/* word game sub-menu */}
                            {game.id === 'word-game' && wordExpanded && (
                                <div className="mt-2 animate-fade-in">
                                    <WordGameSelector onSelect={go} />
                                </div>
                            )}
                        </div>
                    ))}

                </main>

                <footer className="py-5 text-[11px] font-bold opacity-20 tracking-widest">
                    ألعاب سيليا — صُنع بكل ❤️
                </footer>
            </div>
        </>
    );
}
