import React, { useState, useMemo } from 'react';
import ThemeToggle from './ThemeToggle';
import Logo from './Logo';
import ProfileWidget from './ProfileWidget';
import LeaderboardWidget from './LeaderboardWidget';
import GlobalMuteButton from './GlobalMuteButton';
import { playSound, playHaptic } from '../lib/audioEngine';
import { GameIcon, IconPhone, IconWifi, IconHeart } from './icons/GameIcons';
import Search from 'lucide-react/dist/esm/icons/search';
import LayoutGrid from 'lucide-react/dist/esm/icons/layout-grid';
import List from 'lucide-react/dist/esm/icons/list';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import X from 'lucide-react/dist/esm/icons/x';
import Flame from 'lucide-react/dist/esm/icons/flame';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import Play from 'lucide-react/dist/esm/icons/play';
import Users from 'lucide-react/dist/esm/icons/users';

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
        title: 'حرب السفن',
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
    { 
        id: 'all', 
        label: 'الكل', 
        emoji: '🎮', 
        accent: 'from-sky-500 via-blue-500 to-indigo-600',
        glow: 'rgba(56, 189, 248, 0.45)'
    },
    { 
        id: 'new', 
        label: 'أحدث الألعاب', 
        emoji: '🔥', 
        accent: 'from-amber-500 via-orange-500 to-rose-500',
        glow: 'rgba(245, 158, 11, 0.5)'
    },
    { 
        id: 'action', 
        label: 'سرعة وأكشن', 
        emoji: '⚡', 
        accent: 'from-amber-400 via-orange-500 to-yellow-500',
        glow: 'rgba(251, 191, 36, 0.5)'
    },
    { 
        id: 'words', 
        label: 'كلمات وفنون', 
        emoji: '🎨', 
        accent: 'from-pink-500 via-purple-500 to-rose-500',
        glow: 'rgba(236, 72, 153, 0.5)'
    },
    { 
        id: 'strategy', 
        label: 'ذكاء وتفكير', 
        emoji: '🧠', 
        accent: 'from-purple-500 via-indigo-500 to-violet-600',
        glow: 'rgba(168, 85, 247, 0.5)'
    },
    { 
        id: 'classics', 
        label: 'كلاسيكيات', 
        emoji: '🎲', 
        accent: 'from-emerald-400 via-teal-500 to-cyan-600',
        glow: 'rgba(16, 185, 129, 0.5)'
    }
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

    // Dynamic game count per category
    const categoryCounts = useMemo(() => {
        const counts = { all: GAMES.length, new: GAMES.filter(g => g.isNew).length };
        GAMES.forEach(g => {
            if (g.category) {
                counts[g.category] = (counts[g.category] || 0) + 1;
            }
        });
        return counts;
    }, []);

    return (
        <>
            {/* Background */}
            <div className="animated-bg">
                <div className="bg-orb-3" />
                <div className="animated-bg-noise" />
            </div>

            <div className="min-h-dvh flex flex-col items-center px-4 safe-area-pt overflow-x-hidden">

                {/* ── Top Header Navigation Bar ── */}
                <header className="w-full max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-6xl flex items-center justify-between py-3 mb-2 px-1">
                    {/* Right: Logo */}
                    <div className="shrink-0">
                        <Logo size="small" />
                    </div>

                    {/* Center: Profile & Leaderboard */}
                    <div className="flex items-center justify-center gap-1.5">
                        <ProfileWidget />
                        <LeaderboardWidget />
                    </div>

                    {/* Left: Theme toggle ('ولادي' / 'بناتي') + Mute button */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <ThemeToggle />
                        <GlobalMuteButton />
                    </div>
                </header>

                {/* ── Hero Title & Branding Section ── */}
                <section className="w-full max-w-lg md:max-w-3xl lg:max-w-5xl flex flex-col items-center text-center my-3 animate-fade-in">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-none mb-1 drop-shadow-[0_0_30px_var(--accent-glow)]">
                        ألعاب <span className="gradient-text">سيليا</span>
                    </h1>

                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] sm:text-xs font-black tracking-wider text-white/50 uppercase">
                            صالة الألعاب الذكية
                        </span>
                        <span className="w-1 h-1 rounded-full bg-white/30" />
                        <span className="text-[11px] sm:text-xs font-bold text-amber-400 flex items-center gap-1">
                            <Sparkles size={11} /> {GAMES.length} لعبة
                        </span>
                    </div>
                </section>

                {/* ── Search & View Mode Controls ── */}
                <div className="w-full max-w-lg md:max-w-2xl flex items-center gap-2 my-2.5">
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

                {/* ── Category Filter Pills (Aligned with content, wraps centered on desktop) ── */}
                <div className="w-full max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mb-4">
                    <div className="hub-scroll-row hub-scroll-wrap">
                        <div className="hub-scroll-inner py-1 md:justify-center md:flex-wrap">
                            {CATEGORIES.map(cat => {
                                const isActive = selectedCategory === cat.id;
                                const count = categoryCounts[cat.id] || 0;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => { playSound('click'); setSelectedCategory(cat.id); }}
                                        className={`relative px-3.5 py-2 rounded-2xl text-xs font-black transition-all duration-300 flex items-center gap-2 shrink-0 active:scale-95 group cursor-pointer
                                            ${isActive
                                                ? `bg-gradient-to-r ${cat.accent} text-white shadow-[0_4px_16px_${cat.glow}] scale-105 ring-1 ring-white/30 z-10`
                                                : 'glass-card border border-white/10 text-white/75 hover:text-white hover:border-white/20 hover:bg-white/[0.08]'}`}
                                    >
                                        <span className="text-sm drop-shadow-sm transition-transform group-hover:scale-110">{cat.emoji}</span>
                                        <span className="tracking-wide">{cat.label}</span>
                                        <span
                                            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full transition-colors ${
                                                isActive
                                                    ? 'bg-black/30 text-white border border-white/20'
                                                    : 'bg-white/10 text-white/50 group-hover:text-white/80'
                                            }`}
                                        >
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ── Featured New Games Horizontal Spotlight (Shown when viewing 'all' and not searching) ── */}
                {selectedCategory === 'all' && !searchQuery && (
                    <div className="w-full max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mb-6">
                        <div className="flex items-center justify-between px-2 mb-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-[0_0_12px_rgba(245,158,11,0.5)] shrink-0">
                                    <Flame size={15} className="fill-current animate-pulse" />
                                </div>
                                <div className="flex items-baseline gap-1.5 min-w-0">
                                    <h2 className="text-xs sm:text-sm font-black text-white tracking-wide truncate">
                                        أحدث الألعاب المضافة
                                    </h2>
                                    <span className="text-[9px] sm:text-[10px] font-bold text-amber-300 bg-amber-400/15 px-1.5 py-0.5 rounded-full border border-amber-400/30 shrink-0">
                                        {featuredGames.length} ألعاب جديدة
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-bold text-white/50 md:hidden shrink-0">
                                <span>اسحب للتصفح</span>
                                <ChevronLeft size={12} className="text-white/50" />
                            </div>
                        </div>

                        <div className="hub-scroll-row">
                            <div className="hub-scroll-inner py-1">
                                {featuredGames.map(game => (
                                    <button
                                        key={game.id}
                                        onClick={() => handleCardClick(game)}
                                        style={{
                                            '--card-accent': game.accentVar,
                                            background: 'linear-gradient(135deg, color-mix(in srgb, var(--card-accent) 20%, rgba(15, 23, 42, 0.95)) 0%, rgba(15, 23, 42, 0.9) 100%)',
                                            borderColor: 'color-mix(in srgb, var(--card-accent) 35%, rgba(255, 255, 255, 0.12))',
                                            boxShadow: '0 4px 16px -3px color-mix(in srgb, var(--card-accent) 25%, transparent)'
                                        }}
                                        className="spotlight-card shrink-0 w-[155px] sm:w-[170px] md:w-[185px] p-2.5 rounded-2xl border text-right transition-all duration-300 active:scale-95 flex flex-col justify-between group cursor-pointer"
                                    >
                                        {/* Top Badges */}
                                        <div className="flex items-center justify-between w-full mb-1.5">
                                            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/25 to-rose-500/25 border border-amber-400/35 text-amber-300 text-[8px] font-black shadow-sm">
                                                <Sparkles size={8} className="text-amber-300 animate-pulse" />
                                                <span>جديد</span>
                                            </div>

                                            {game.online && (
                                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[8px] font-bold">
                                                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
                                                    <span>1v1</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Center: Icon + Title & Desc */}
                                        <div className="flex items-center gap-2 w-full my-1">
                                            <div
                                                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform duration-300"
                                                style={{
                                                    background: 'color-mix(in srgb, var(--card-accent) 30%, rgba(255,255,255,0.08))',
                                                    border: '1.5px solid color-mix(in srgb, var(--card-accent) 60%, rgba(255,255,255,0.3))',
                                                    boxShadow: '0 0 14px color-mix(in srgb, var(--card-accent) 45%, transparent)'
                                                }}
                                            >
                                                <GameIcon gameId={game.id} size={19} className="text-white" />
                                            </div>

                                            <div className="flex flex-col text-right overflow-hidden flex-1 min-w-0">
                                                <h3 className="text-xs font-black text-white group-hover:text-[var(--card-accent)] transition-colors truncate">
                                                    {game.title}
                                                </h3>
                                                <p className="text-[9px] text-white/50 font-medium truncate mt-0.5">
                                                    {game.desc}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Bottom CTA Action Bar */}
                                        <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-white/10 w-full">
                                            <span className="text-[8px] font-bold text-white/40 flex items-center gap-0.5">
                                                <Users size={10} className="text-white/40" /> {game.online ? '1v1' : 'أوفلاين'}
                                            </span>
                                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/10 group-hover:bg-[var(--card-accent)] group-hover:text-slate-950 text-white font-black text-[9px] transition-all duration-300 shadow-sm">
                                                <span>العب</span>
                                                <Play size={7} className="fill-current" />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Main Games Container ── */}
                <main className="w-full max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-6xl flex-1 pb-24">
                    {filteredGames.length === 0 ? (
                        <div className="glass-card p-8 rounded-3xl text-center border border-white/10 my-8">
                            <span className="text-3xl mb-2 block">🔍</span>
                            <h3 className="text-sm font-bold text-white mb-1">لم يتم العثور على ألعاب</h3>
                            <p className="text-xs text-white/40">جرّب البحث بكلمة أخرى أو تغيير التصنيف</p>
                        </div>
                    ) : viewMode === 'grid' ? (
                        /* ── Grid View: 2 columns on mobile, 3 on tablet, 4 on desktop ── */
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 w-full">
                            {filteredGames.map((game, idx) => {
                                const catObj = CATEGORIES.find(c => c.id === game.category);
                                return (
                                    <button
                                        key={game.id}
                                        onClick={() => handleCardClick(game)}
                                        style={{
                                            '--card-accent': game.accentVar,
                                            background: 'linear-gradient(135deg, color-mix(in srgb, var(--card-accent) 20%, rgba(15, 23, 42, 0.95)) 0%, rgba(15, 23, 42, 0.9) 100%)',
                                            borderColor: 'color-mix(in srgb, var(--card-accent) 35%, rgba(255, 255, 255, 0.12))',
                                            boxShadow: '0 6px 20px -4px color-mix(in srgb, var(--card-accent) 22%, transparent)',
                                            animationDelay: `${idx * 20}ms`,
                                        }}
                                        className="spotlight-card w-full p-2.5 sm:p-3.5 rounded-2xl sm:rounded-3xl border text-right transition-all duration-300 active:scale-[0.97] flex flex-col justify-between group cursor-pointer"
                                    >
                                        {/* Top Badges Row */}
                                        <div className="flex items-center justify-between w-full mb-1.5 sm:mb-2">
                                            {game.isNew ? (
                                                <span className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/25 to-rose-500/25 border border-amber-400/35 text-amber-300 text-[8px] sm:text-[9px] font-black shadow-sm">
                                                    <Sparkles size={9} className="text-amber-300 animate-pulse" />
                                                    <span>جديد</span>
                                                </span>
                                            ) : (
                                                <span className="text-[8px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50 truncate max-w-[65px] sm:max-w-[85px]">
                                                    {catObj ? `${catObj.emoji} ${catObj.label}` : 'لعبة'}
                                                </span>
                                            )}

                                            <span className="text-[8px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-1">
                                                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
                                                <span>{game.online ? '1v1' : 'أوفلاين'}</span>
                                            </span>
                                        </div>

                                        {/* Center: Icon + Title & Desc */}
                                        <div className="flex flex-col items-center text-center my-1 w-full">
                                            <div
                                                className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300 mb-1.5"
                                                style={{
                                                    background: 'color-mix(in srgb, var(--card-accent) 30%, rgba(255,255,255,0.08))',
                                                    border: '1.5px solid color-mix(in srgb, var(--card-accent) 60%, rgba(255,255,255,0.3))',
                                                    boxShadow: '0 0 16px color-mix(in srgb, var(--card-accent) 45%, transparent)'
                                                }}
                                            >
                                                <GameIcon gameId={game.id} size={22} className="text-white" />
                                            </div>

                                            <h3 className="text-xs sm:text-sm font-black text-white group-hover:text-[var(--card-accent)] transition-colors truncate w-full px-0.5">
                                                {game.title}
                                            </h3>
                                            <p className="text-[9px] sm:text-[10px] text-white/50 font-medium truncate w-full px-0.5 mt-0.5">
                                                {game.desc}
                                            </p>
                                        </div>

                                        {/* Bottom Action Button */}
                                        <div className="flex items-center justify-center pt-2 mt-1 border-t border-white/10 w-full">
                                            <div className="w-full flex items-center justify-center gap-1.5 py-1 rounded-xl bg-white/10 group-hover:bg-[var(--card-accent)] group-hover:text-slate-950 text-white font-black text-[10px] sm:text-xs transition-all duration-300 shadow-sm">
                                                <span>العب الآن</span>
                                                <Play size={9} className="fill-current" />
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        /* ── List View: 1 full-width column on mobile (stacked), 2-3 cols desktop ── */
                        <div className="flex flex-col gap-2.5 w-full md:grid md:grid-cols-2 lg:grid-cols-3">
                            {filteredGames.map((game, idx) => (
                                <button
                                    key={game.id}
                                    onClick={() => handleCardClick(game)}
                                    style={{
                                        '--card-accent': game.accentVar,
                                        background: 'linear-gradient(135deg, color-mix(in srgb, var(--card-accent) 15%, rgba(15, 23, 42, 0.95)) 0%, rgba(15, 23, 42, 0.9) 100%)',
                                        borderColor: 'color-mix(in srgb, var(--card-accent) 30%, rgba(255, 255, 255, 0.1))',
                                        animationDelay: `${idx * 20}ms`,
                                    }}
                                    className="spotlight-card w-full p-2.5 sm:p-3 rounded-2xl border text-right transition-all duration-300 active:scale-[0.99] flex items-center justify-between gap-3 group cursor-pointer"
                                >
                                    <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                                        <div
                                            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform"
                                            style={{
                                                background: 'color-mix(in srgb, var(--card-accent) 30%, rgba(255,255,255,0.08))',
                                                border: '1.5px solid color-mix(in srgb, var(--card-accent) 60%, rgba(255,255,255,0.3))',
                                                boxShadow: '0 0 14px color-mix(in srgb, var(--card-accent) 45%, transparent)'
                                            }}
                                        >
                                            <GameIcon gameId={game.id} size={22} className="text-white" />
                                        </div>

                                        <div className="flex flex-col text-right overflow-hidden flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <h3 className="text-sm font-black text-white group-hover:text-[var(--card-accent)] transition-colors truncate">
                                                    {game.title}
                                                </h3>
                                                {game.isNew && (
                                                    <span className="text-[8px] font-black px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                                                        جديد
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-white/50 truncate font-medium mt-0.5">
                                                {game.desc}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 group-hover:bg-[var(--card-accent)] group-hover:text-slate-950 text-white font-black text-xs transition-all duration-300 shrink-0">
                                        <span>العب</span>
                                        <Play size={10} className="fill-current" />
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
