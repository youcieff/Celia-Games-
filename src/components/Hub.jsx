import React from 'react';
import ThemeToggle from './ThemeToggle';
import Logo from './Logo';
import ProfileWidget from './ProfileWidget';
import GlobalMuteButton from './GlobalMuteButton';
import { playSound, playHaptic } from '../lib/audioEngine';
import { GameIcon, IconPhone, IconWifi, IconHeart } from './icons/GameIcons';

/* ─── game catalogue ─────────────────────────────────────────────────────── */
const GAMES = [
    {
        id: 'code-game',
        title: 'خمن الكود',
        desc: 'كود سري وردود فعل دقيقة',
        badge: 'أونلاين',
        accentVar: 'var(--game-1-accent)',
    },
    {
        id: 'word-game',
        title: 'خمن الكلمة',
        desc: 'حرف حرف لحد ما تخمنها',
        badge: null,
        accentVar: 'var(--game-2-accent)',
    },
    {
        id: 'xo-game',
        title: 'إكس أو',
        desc: 'الكلاسيك السريع',
        badge: 'أونلاين',
        accentVar: 'var(--game-3-accent)',
    },
    {
        id: 'big-xo-game',
        title: 'Big XO',
        desc: '٩ إكس أو في شبكة واحدة',
        badge: 'أونلاين',
        accentVar: 'var(--game-4-accent)',
    },
    {
        id: 'connect-4',
        title: 'Connect 4',
        desc: 'رص ٤ في صف رأسي أو أفقي',
        badge: 'أونلاين',
        accentVar: 'var(--game-5-accent)',
    },
    {
        id: 'memory-game',
        title: 'Memory Match',
        desc: 'تطابق الورق وقوة الذاكرة',
        badge: 'أونلاين',
        accentVar: 'var(--game-6-accent)',
    },
    {
        id: 'dots-boxes',
        title: 'Dots & Boxes',
        desc: 'قفل المربعات واكسب النقاط',
        badge: 'أونلاين',
        accentVar: 'var(--game-7-accent)',
    },
    {
        id: 'sea-battle',
        title: 'Sea Battle',
        desc: 'حرب السفن الاستراتيجية',
        badge: 'أونلاين',
        accentVar: 'var(--game-8-accent)',
    },
    {
        id: 'guess-time',
        title: 'خمن الوقت',
        desc: 'وقّف الساعة في اللحظة المضبوطة',
        badge: 'أونلاين',
        accentVar: 'var(--game-9-accent)',
    },
    {
        id: 'bus-complete',
        title: 'أتوبيس كومبليت',
        desc: 'اسم حيوان نبات جماد بلاد',
        badge: 'أونلاين',
        accentVar: 'var(--game-10-accent)',
    },
];

/* ─── word game sub-selector ─────────────────────────────────────────────── */
function WordGameSelector({ onSelect }) {
    return (
        <div className="grid grid-cols-2 gap-2 mt-3">
            <button
                onClick={() => onSelect('word-game-local')}
                className="glass-card rounded-2xl py-3 px-4 flex flex-col items-center gap-1.5 transition-all hover:border-[var(--accent)] active:scale-95 group"
            >
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)] group-hover:scale-110 transition-transform">
                    <IconPhone size={22} />
                </div>
                <span className="text-sm font-black">أوفلاين</span>
                <span className="text-[10px] opacity-40 font-medium">جهاز واحد</span>
            </button>
            <button
                onClick={() => onSelect('word-game-online')}
                className="glass-card rounded-2xl py-3 px-4 flex flex-col items-center gap-1.5 transition-all hover:border-[var(--accent)] active:scale-95 group"
            >
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)] group-hover:scale-110 transition-transform">
                    <IconWifi size={22} />
                </div>
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
                <header className="w-full max-w-md flex justify-between items-center py-3 mb-1">
                    <Logo />
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <ProfileWidget />
                        <ThemeToggle />
                        <GlobalMuteButton />
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
                                className="game-card group"
                                style={{ '--card-accent': game.accentVar }}
                            >
                                {/* shimmer layer */}
                                <span className="game-card-shimmer" />

                                {/* icon */}
                                <div
                                    className="game-card-icon flex items-center justify-center radial-glow"
                                    style={{ 
                                        boxShadow: `0 0 20px color-mix(in srgb, ${game.accentVar} 30%, transparent)`,
                                    }}
                                >
                                    <GameIcon 
                                        gameId={game.id} 
                                        size={26} 
                                        className="text-[var(--card-accent)] transition-transform duration-300 group-hover:scale-110" 
                                    />
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
                                            color: game.accentVar,
                                            borderColor: `color-mix(in srgb, ${game.accentVar} 35%, transparent)`,
                                            background: `color-mix(in srgb, ${game.accentVar} 12%, transparent)`,
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

                <footer className="py-5 text-[11px] font-bold opacity-30 tracking-widest flex items-center gap-1.5">
                    <span>ألعاب سيليا — صُنع بكل</span>
                    <IconHeart size={14} filled className="text-rose-500 animate-pulse-slow" />
                </footer>
            </div>
        </>
    );
}
