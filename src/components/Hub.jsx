import React, { useState, useMemo } from 'react';
import ThemeToggle from './ThemeToggle';
import Logo from './Logo';
import ProfileWidget from './ProfileWidget';
import GlobalMuteButton from './GlobalMuteButton';
import { playSound, playHaptic } from '../lib/audioEngine';
import { GameIcon, IconPhone, IconWifi, IconHeart } from './icons/GameIcons';
import Search from 'lucide-react/dist/esm/icons/search';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import List from 'lucide-react/dist/esm/icons/list';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import X from 'lucide-react/dist/esm/icons/x';
import Flame from 'lucide-react/dist/esm/icons/flame';

/* ─── game catalogue ─────────────────────────────────────────────────────── */
const GAMES = [
    {
        id: 'quick-draw',
        title: 'ارسم وخمّن',
        desc: 'ارسم الكلمة وخلّي صاحبك يخمّن',
        category: 'words',
        isNew: true,
        online: true,
        accentVar: 'var(--game-9-accent)',
    },
    {
        id: 'air-hockey',
        title: 'الهوكي الهوائي',
        desc: 'هوكي لحظي — أول ٧ أهداف يفوز',
        category: 'action',
        isNew: true,
        online: true,
        accentVar: 'var(--game-8-accent)',
    },
    {
        id: 'domino-game',
        title: 'الدومينو الكلاسيكية',
        desc: 'عظام الدومينو — قفل ودومينو',
        category: 'classics',
        isNew: true,
        online: true,
        accentVar: 'var(--game-4-accent)',
    },
    {
        id: 'rps-arena',
        title: 'حجرة ورقة مقص ⚡',
        desc: 'بطاقات قوة وتكتيك — أول ٥ يفوز',
        category: 'action',
        isNew: true,
        online: true,
        accentVar: 'var(--game-6-accent)',
    },
    {
        id: 'trivia-duel',
        title: 'تحدي المعلومات',
        desc: '١٠ أسئلة بسرعة — من أذكى؟',
        category: 'words',
        isNew: true,
        online: true,
        accentVar: 'var(--game-1-accent)',
    },
    {
        id: 'code-game',
        title: 'خمن الكود',
        desc: 'كود سري وردود فعل دقيقة',
        category: 'strategy',
        online: true,
        accentVar: 'var(--game-1-accent)',
    },
    {
        id: 'word-game',
        title: 'خمن الكلمة',
        desc: 'حرف حرف لحد ما تخمنها',
        category: 'words',
        online: false,
        accentVar: 'var(--game-2-accent)',
    },
    {
        id: 'xo-game',
        title: 'إكس أو',
        desc: 'الكلاسيك السريع',
        category: 'classics',
        online: true,
        accentVar: 'var(--game-3-accent)',
    },
    {
        id: 'big-xo-game',
        title: 'Big XO',
        desc: '٩ إكس أو في شبكة واحدة',
        category: 'strategy',
        online: true,
        accentVar: 'var(--game-4-accent)',
    },
    {
        id: 'connect-4',
        title: 'Connect 4',
        desc: 'رص ٤ في صف رأسي أو أفقي',
        category: 'strategy',
        online: true,
        accentVar: 'var(--game-5-accent)',
    },
    {
        id: 'memory-game',
        title: 'Memory Match',
        desc: 'تطابق الورق وقوة الذاكرة',
        category: 'classics',
        online: true,
        accentVar: 'var(--game-6-accent)',
    },
    {
        id: 'dots-boxes',
        title: 'Dots & Boxes',
        desc: 'قفل المربعات واكسب النقاط',
        category: 'strategy',
        online: true,
        accentVar: 'var(--game-7-accent)',
    },
    {
        id: 'sea-battle',
        title: 'Sea Battle',
        desc: 'حرب السفن الاستراتيجية',
        category: 'strategy',
        online: true,
        accentVar: 'var(--game-8-accent)',
    },
    {
        id: 'guess-time',
        title: 'خمن الوقت',
        desc: 'وقّف الساعة في اللحظة المضبوطة',
        category: 'action',
        online: true,
        accentVar: 'var(--game-9-accent)',
    },
    {
        id: 'bus-complete',
        title: 'أتوبيس كومبليت',
        desc: 'اسم حيوان نبات جماد بلاد',
        category: 'words',
        online: true,
        accentVar: 'var(--game-10-accent)',
    },
];

const CATEGORIES = [
    { id: 'all', label: 'الكل', emoji: '🎮' },
    { id: 'new', label: 'أحدث الألعاب', emoji: '🔥' },
    { id: 'action', label: 'سرعة وأكشن', emoji: '⚡' },
    { id: 'words', label: 'كلمات وفنون', emoji: '🎨' },
    { id: 'strategy', label: 'ذكاء وتفكير', emoji: '🧠' },
    { id: 'classics', label: 'كلاسيكيات', emoji: '🎲' }
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

/* ─── word game modal / sub-selector ─────────────────────────────────────── */
function WordGameSelector({ onSelect, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="glass-card max-w-xs w-full p-5 rounded-3xl border border-white/20 text-center shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                >
                    <X size={16} />
                </button>

                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto mb-3 text-2xl">
                    🔤
                </div>
                <h3 className="text-base font-black text-white mb-1">خمن الكلمة</h3>
                <p className="text-xs text-white/50 mb-4">اختر طريقة اللعب المفضلة لديك:</p>

                <div className="grid grid-cols-2 gap-2.5">
                    <button
                        onClick={() => onSelect('word-game-local')}
                        className="glass-card rounded-2xl py-3.5 px-3 flex flex-col items-center gap-1.5 transition-all hover:border-[var(--accent)] active:scale-95 group border border-white/10"
                    >
                        <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)] group-hover:scale-110 transition-transform">
                            <IconPhone size={20} />
                        </div>
                        <span className="text-xs font-black">أوفلاين</span>
                        <span className="text-[10px] opacity-40 font-medium">جهاز واحد</span>
                    </button>
                    <button
                        onClick={() => onSelect('word-game-online')}
                        className="glass-card rounded-2xl py-3.5 px-3 flex flex-col items-center gap-1.5 transition-all hover:border-[var(--accent)] active:scale-95 group border border-white/10"
                    >
                        <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)] group-hover:scale-110 transition-transform">
                            <IconWifi size={20} />
                        </div>
                        <span className="text-xs font-black">أونلاين</span>
                        <span className="text-[10px] opacity-40 font-medium">جهازين</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── main hub ───────────────────────────────────────────────────────────── */
export default function Hub({ setView }) {
    const [wordModalOpen, setWordModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

    const go = (viewName) => {
        playSound('click');
        playHaptic(15);
        setView(viewName);
    };

    const handleCardClick = (game) => {
        if (game.id === 'word-game') {
            playSound('click');
            setWordModalOpen(true);
        } else {
            go(game.id);
        }
    };

    // Filter games by category & search query
    const filteredGames = useMemo(() => {
        return GAMES.filter(game => {
            // Category match
            if (selectedCategory === 'new' && !game.isNew) return false;
            if (selectedCategory !== 'all' && selectedCategory !== 'new' && game.category !== selectedCategory) {
                return false;
            }
            // Search query match
            if (searchQuery.trim()) {
                const q = searchQuery.trim().toLowerCase();
                const matchTitle = game.title.toLowerCase().includes(q);
                const matchDesc = game.desc.toLowerCase().includes(q);
                return matchTitle || matchDesc;
            }
            return true;
        });
    }, [selectedCategory, searchQuery]);

    // Featured games spotlight (top new games)
    const featuredGames = useMemo(() => GAMES.filter(g => g.isNew), []);

    return (
        <>
            {/* Background */}
            <div className="animated-bg">
                <div className="bg-orb-3" />
                <div className="animated-bg-noise" />
            </div>

            <div className="min-h-dvh flex flex-col items-center px-4 safe-area-pt">

                {/* ── Top Header Navigation Bar ── */}
                <header className="w-full max-w-lg flex items-center justify-between py-3 mb-2 px-1">
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
                <section className="w-full max-w-lg flex flex-col items-center text-center my-2 animate-fade-in">
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-none mb-1 drop-shadow-[0_0_30px_var(--accent-glow)]">
                        ألعاب <span className="gradient-text">سيليا</span>
                    </h1>

                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-black tracking-wider text-white/50 uppercase">
                            صالة الألعاب الذكية
                        </span>
                        <span className="w-1 h-1 rounded-full bg-white/30" />
                        <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                            <Sparkles size={11} /> {GAMES.length} لعبة
                        </span>
                    </div>
                </section>

                {/* ── Search & View Mode Controls ── */}
                <div className="w-full max-w-lg flex items-center gap-2 my-2.5">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="ابحث عن لعبة..."
                            className="w-full glass-card pl-9 pr-9 py-2.5 rounded-2xl text-xs font-bold text-white placeholder:text-white/40 border border-white/10 focus:border-[var(--accent)] outline-none transition-all"
                        />
                        <Search size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-0.5"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* View Switcher (Grid / List) */}
                    <div className="glass-card p-1 rounded-2xl border border-white/10 flex items-center gap-1 shrink-0">
                        <button
                            onClick={() => { playSound('click'); setViewMode('grid'); }}
                            className={`p-1.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white/20 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}
                            title="عرض شبكي"
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            onClick={() => { playSound('click'); setViewMode('list'); }}
                            className={`p-1.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white/20 text-white shadow-sm' : 'text-white/40 hover:text-white'}`}
                            title="عرض قائمة"
                        >
                            <List size={16} />
                        </button>
                    </div>
                </div>

                {/* ── Category Filter Pills ── */}
                <div className="w-full max-w-lg flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
                    {CATEGORIES.map(cat => {
                        const isActive = selectedCategory === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => { playSound('click'); setSelectedCategory(cat.id); }}
                                className={`px-3 py-1.5 rounded-2xl text-xs font-black transition-all flex items-center gap-1 shrink-0 active:scale-95
                                    ${isActive
                                        ? 'bg-[var(--accent)] text-slate-950 shadow-[0_0_15px_var(--accent-glow)] scale-105'
                                        : 'glass-card border border-white/10 text-white/70 hover:text-white hover:border-white/20'}`}
                            >
                                <span>{cat.emoji}</span>
                                <span>{cat.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* ── Featured New Games Horizontal Spotlight (Shown when viewing 'all' and not searching) ── */}
                {selectedCategory === 'all' && !searchQuery && (
                    <div className="w-full max-w-lg mb-4">
                        <div className="flex items-center justify-between px-1 mb-2">
                            <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                                <Flame size={14} className="text-amber-400 fill-amber-400" />
                                <span>أحدث الألعاب المضافة</span>
                            </div>
                            <span className="text-[10px] font-bold text-white/40">اسحب للمزيد ◀</span>
                        </div>

                        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
                            {featuredGames.map(game => (
                                <button
                                    key={game.id}
                                    onClick={() => handleCardClick(game)}
                                    style={{ '--card-accent': game.accentVar }}
                                    className="shrink-0 w-36 glass-card p-3 rounded-3xl border border-white/15 hover:border-[var(--card-accent)] hover:shadow-[0_8px_25px_color-mix(in_srgb,var(--card-accent)_35%,transparent)] transition-all duration-300 active:scale-95 flex flex-col items-center text-center relative group"
                                >
                                    <span className="absolute top-2 right-2 text-[8px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                        جديد ✨
                                    </span>
                                    <div
                                        className="w-11 h-11 rounded-2xl flex items-center justify-center mb-2 mt-1 transition-transform group-hover:scale-110 shadow-md"
                                        style={{
                                            background: 'color-mix(in srgb, var(--card-accent) 18%, rgba(255,255,255,0.05))',
                                            border: '1px solid color-mix(in srgb, var(--card-accent) 30%, rgba(255,255,255,0.1))',
                                            boxShadow: '0 0 16px color-mix(in srgb, var(--card-accent) 25%, transparent)'
                                        }}
                                    >
                                        <GameIcon gameId={game.id} size={22} className="text-[var(--card-accent)]" />
                                    </div>
                                    <span className="text-xs font-black text-white group-hover:text-[var(--card-accent)] transition-colors truncate w-full">
                                        {game.title}
                                    </span>
                                    <span className="text-[9px] text-white/40 truncate w-full font-medium mt-0.5">
                                        {game.desc}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Main Games Container ── */}
                <main className="w-full max-w-lg flex-1 pb-24">
                    {filteredGames.length === 0 ? (
                        <div className="glass-card p-8 rounded-3xl text-center border border-white/10 my-8">
                            <span className="text-3xl mb-2 block">🔍</span>
                            <h3 className="text-sm font-bold text-white mb-1">لم يتم العثور على ألعاب</h3>
                            <p className="text-xs text-white/40">جرّب البحث بكلمة أخرى أو تغيير التصنيف</p>
                        </div>
                    ) : viewMode === 'grid' ? (
                        /* ── Modern 2-Column Responsive Grid View ── */
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {filteredGames.map((game, idx) => (
                                <button
                                    key={game.id}
                                    onClick={() => handleCardClick(game)}
                                    style={{
                                        '--card-accent': game.accentVar,
                                        animationDelay: `${idx * 25}ms`,
                                    }}
                                    className="group relative flex flex-col items-center text-center p-3.5 rounded-3xl glass-card border border-white/10 hover:border-[var(--card-accent)] hover:shadow-[0_8px_30px_color-mix(in_srgb,var(--card-accent)_35%,transparent)] transition-all duration-300 active:scale-95 overflow-hidden"
                                >
                                    {/* Shimmer on hover */}
                                    <span className="game-card-shimmer" />

                                    {/* Top badges: New + Online */}
                                    <div className="w-full flex items-center justify-between mb-1">
                                        <div>
                                            {game.online && <OnlinePip accentVar={game.accentVar} />}
                                        </div>
                                        {game.isNew && (
                                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                جديد ✨
                                            </span>
                                        )}
                                    </div>

                                    {/* Game Icon Box with glow */}
                                    <div
                                        className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center my-1.5 transition-transform duration-300 group-hover:scale-110 shadow-lg relative"
                                        style={{
                                            background: 'color-mix(in srgb, var(--card-accent) 16%, rgba(255,255,255,0.04))',
                                            border: '1px solid color-mix(in srgb, var(--card-accent) 30%, rgba(255,255,255,0.1))',
                                            boxShadow: '0 0 20px color-mix(in srgb, var(--card-accent) 28%, transparent)'
                                        }}
                                    >
                                        <GameIcon gameId={game.id} size={26} className="text-[var(--card-accent)]" />
                                    </div>

                                    {/* Game Title */}
                                    <p className="text-xs sm:text-sm font-black text-white group-hover:text-[var(--card-accent)] transition-colors truncate w-full mt-1">
                                        {game.title}
                                    </p>

                                    {/* Game Description */}
                                    <p className="text-[10px] text-white/50 truncate w-full font-medium mt-0.5">
                                        {game.desc}
                                    </p>
                                </button>
                            ))}
                        </div>
                    ) : (
                        /* ── Detailed List View ── */
                        <div className="flex flex-col gap-2">
                            {filteredGames.map((game, idx) => (
                                <button
                                    key={game.id}
                                    onClick={() => handleCardClick(game)}
                                    className="game-card group"
                                    style={{
                                        '--card-accent': game.accentVar,
                                        animationDelay: `${idx * 25}ms`,
                                    }}
                                >
                                    <span className="game-card-shimmer" />

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

                                    <div className="game-card-body">
                                        <div className="flex items-center gap-2">
                                            <p className="game-card-title">{game.title}</p>
                                            {game.isNew && (
                                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                    جديد
                                                </span>
                                            )}
                                        </div>
                                        <p className="game-card-desc">{game.desc}</p>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {game.online && <OnlinePip accentVar={game.accentVar} />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </main>

                {/* Word game modal */}
                {wordModalOpen && (
                    <WordGameSelector
                        onSelect={(viewName) => {
                            setWordModalOpen(false);
                            go(viewName);
                        }}
                        onClose={() => setWordModalOpen(false)}
                    />
                )}

                <footer className="py-5 text-[11px] font-bold opacity-25 tracking-widest flex items-center gap-1.5">
                    <span>ألعاب سيليا — صُنع بكل</span>
                    <IconHeart size={14} filled className="text-rose-500 animate-pulse-slow" />
                </footer>
            </div>
        </>
    );
}
