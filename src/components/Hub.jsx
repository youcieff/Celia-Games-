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
        online: true,
        accentVar: 'var(--game-1-accent)',
    },
    {
        id: 'word-game',
        title: 'خمن الكلمة',
        desc: 'حرف حرف لحد ما تخمنها',
        online: false,
        accentVar: 'var(--game-2-accent)',
    },
    {
        id: 'xo-game',
        title: 'إكس أو',
        desc: 'الكلاسيك السريع',
        online: true,
        accentVar: 'var(--game-3-accent)',
    },
    {
        id: 'big-xo-game',
        title: 'Big XO',
        desc: '٩ إكس أو في شبكة واحدة',
        online: true,
        accentVar: 'var(--game-4-accent)',
    },
    {
        id: 'connect-4',
        title: 'Connect 4',
        desc: 'رص ٤ في صف رأسي أو أفقي',
        online: true,
        accentVar: 'var(--game-5-accent)',
    },
    {
        id: 'memory-game',
        title: 'Memory Match',
        desc: 'تطابق الورق وقوة الذاكرة',
        online: true,
        accentVar: 'var(--game-6-accent)',
    },
    {
        id: 'dots-boxes',
        title: 'Dots & Boxes',
        desc: 'قفل المربعات واكسب النقاط',
        online: true,
        accentVar: 'var(--game-7-accent)',
    },
    {
        id: 'sea-battle',
        title: 'Sea Battle',
        desc: 'حرب السفن الاستراتيجية',
        online: true,
        accentVar: 'var(--game-8-accent)',
    },
    {
        id: 'guess-time',
        title: 'خمن الوقت',
        desc: 'وقّف الساعة في اللحظة المضبوطة',
        online: true,
        accentVar: 'var(--game-9-accent)',
    },
    {
        id: 'bus-complete',
        title: 'أتوبيس كومبليت',
        desc: 'اسم حيوان نبات جماد بلاد',
        online: true,
        accentVar: 'var(--game-10-accent)',
    },
];

/* ─── online dot indicator ───────────────────────────────────────────────── */
function OnlinePip({ accentVar }) {
    return (
        <span
            className="hub-online-pip"
            style={{ '--pip-color': accentVar }}
            title="أونلاين"
        />
    );
}

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

                {/* ── Top Header Navigation Bar ── */}
                <header className="w-full max-w-md flex items-center justify-between py-3 mb-2 px-1">
                    {/* Right: Logo */}
                    <div className="shrink-0">
                        <Logo size="small" />
                    </div>

                    {/* Center: Profile (Avatar + Nickname) */}
                    <div className="flex items-center justify-center">
                        <ProfileWidget />
                    </div>

                    {/* Left: Theme toggle ('ولادي' / 'بناتي') + Mute button */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <ThemeToggle />
                        <GlobalMuteButton />
                    </div>
                </header>

                {/* ── Hero Title & Branding Section ── */}
                <section className="w-full max-w-md flex flex-col items-center text-center my-3 animate-fade-in">
                    {/* Grand Title: ألعاب سيليا */}
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-none mb-1.5 drop-shadow-[0_0_30px_var(--accent-glow)]">
                        ألعاب <span className="gradient-text">سيليا</span>
                    </h1>

                    {/* Subtitle: اختار وابدأ */}
                    <p className="text-xs font-black tracking-[0.25em] text-white/50 mb-3 uppercase">
                        اختار وابدأ
                    </p>

                    {/* Games Count Badge */}
                    <div className="glass-card px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2 shadow-sm text-xs font-bold text-white/80">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                        <span>{GAMES.filter(g => g.online).length} ألعاب أونلاين</span>
                        <span className="opacity-25">|</span>
                        <span className="opacity-60">{GAMES.length} لعبة إجمالاً</span>
                    </div>
                </section>

                {/* ── Games List ── */}
                <main className="w-full max-w-md flex flex-col gap-2.5 flex-1 pb-24">

                    {GAMES.map((game, idx) => (
                        <div key={game.id}>
                            <button
                                onClick={() => handleCardClick(game)}
                                className="game-card group"
                                style={{
                                    '--card-accent': game.accentVar,
                                    animationDelay: `${idx * 35}ms`,
                                }}
                            >
                                {/* shimmer layer */}
                                <span className="game-card-shimmer" />

                                {/* icon */}
                                <div
                                    className="game-card-icon flex items-center justify-center"
                                    style={{
                                        boxShadow: `0 0 20px color-mix(in srgb, ${game.accentVar} 28%, transparent)`,
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

                                {/* online indicator or chevron */}
                                <div className="flex items-center gap-2 shrink-0">
                                    {game.online && <OnlinePip accentVar={game.accentVar} />}
                                    {game.id === 'word-game' && (
                                        <span
                                            className="text-white/25 text-base font-black transition-transform duration-300"
                                            style={{ transform: wordExpanded ? 'rotate(90deg)' : 'none', display: 'inline-block' }}
                                        >
                                            ›
                                        </span>
                                    )}
                                </div>
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

                <footer className="py-5 text-[11px] font-bold opacity-25 tracking-widest flex items-center gap-1.5">
                    <span>ألعاب سيليا — صُنع بكل</span>
                    <IconHeart size={14} filled className="text-rose-500 animate-pulse-slow" />
                </footer>
            </div>
        </>
    );
}
