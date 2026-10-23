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
import Play from 'lucide-react/dist/esm/icons/play';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';

/* ─── game catalogue ─────────────────────────────────────────────────────── */
const GAMES = [
    {
        id: 'whoami-online',
        title: 'أنا مين؟',
        desc: 'اكتشف الشخصية السرية بالأسئلة',
        isNew: true,
        exclusive: true,
        online: true,
        accentVar: 'var(--game-1-accent)',
    },
    {
        id: 'taboo-game',
        title: 'الكلمة الممنوعة',
        desc: 'اشرحها من غير ما تقول الكلمة أو ممنوعاتها',
        isNew: true,
        exclusive: true,
        exclusiveTier: 'secondary',
        online: true,
        accentVar: 'var(--game-2-accent)',
    },
    {
        id: 'snake-arena',
        title: 'ثعبان النيون',
        desc: 'حلبة الثعبان تنافس 1v1',
        isNew: true,
        online: true,
        accentVar: 'var(--game-3-accent)',
    },
    {
        id: 'brick-breaker',
        title: 'تدمير الكتل',
        desc: 'تدمير المكعبات بمؤثرات نيون',
        isNew: true,
        online: true,
        accentVar: 'var(--game-4-accent)',
    },
    {
        id: 'math-duel',
        title: 'سرعة الحساب',
        desc: 'تحدي حسابات ذهنية 1v1',
        isNew: true,
        online: true,
        accentVar: 'var(--game-5-accent)',
    },
    {
        id: 'guess-time',
        title: '\u062e\u0645\u0646 \u0627\u0644\u0648\u0642\u062a',
        desc: '\u0648\u0642\u0651\u0641 \u0627\u0644\u0633\u0627\u0639\u0629 \u0641\u064a \u0627\u0644\u0644\u062d\u0638\u0629 \u0627\u0644\u0645\u0636\u0628\u0648\u0637\u0629',
        isNew: true,
        badgeLabel: '\u0645\u0648\u062f \u062c\u062f\u064a\u062f',
        badgeKind: 'mode',
        online: true,
        accentVar: 'var(--game-20-accent)',
    },
    {
        id: 'speed-sudoku',
        title: 'سودوكو السرعة',
        desc: 'حل السودوكو قبل خصمك',
        isNew: true,
        online: true,
        accentVar: 'var(--game-6-accent)',
    },
    {
        id: 'quick-draw',
        title: 'ارسم وخمّن',
        desc: 'ارسم الكلمة وخلّي صاحبك يخمّن',
        isNew: false,
        online: true,
        accentVar: 'var(--game-7-accent)',
    },
    {
        id: 'air-hockey',
        title: 'الهوكي الهوائي',
        desc: 'هوكي لحظي — أول ٧ أهداف يفوز',
        isNew: false,
        online: true,
        accentVar: 'var(--game-8-accent)',
    },
    {
        id: 'domino-game',
        title: 'الدومينو الكلاسيكية',
        desc: 'عظام الدومينو — قفل ودومينو',
        isNew: false,
        online: true,
        accentVar: 'var(--game-9-accent)',
    },
    {
        id: 'rps-arena',
        title: 'حجرة ورقة مقص',
        desc: 'بطاقات قوة وتكتيك — أول ٥ يفوز',
        isNew: false,
        online: true,
        accentVar: 'var(--game-10-accent)',
    },
    {
        id: 'trivia-duel',
        title: 'تحدي المعلومات',
        desc: '١٠ أسئلة بسرعة — من أذكى؟',
        isNew: false,
        online: true,
        accentVar: 'var(--game-11-accent)',
    },
    {
        id: 'code-game',
        title: 'خمن الكود',
        desc: 'كود سري وردود فعل دقيقة',
        online: true,
        accentVar: 'var(--game-12-accent)',
    },
    {
        id: 'word-game',
        title: 'خمن الكلمة',
        desc: 'حرف حرف لحد ما تخمنها',
        online: false,
        accentVar: 'var(--game-13-accent)',
    },
    {
        id: 'xo-game',
        title: 'إكس أو',
        desc: 'الكلاسيك السريع',
        online: true,
        accentVar: 'var(--game-14-accent)',
    },
    {
        id: 'big-xo-game',
        title: 'Big XO',
        desc: '٩ إكس أو في شبكة واحدة',
        online: true,
        accentVar: 'var(--game-15-accent)',
    },
    {
        id: 'connect-4',
        title: 'Connect 4',
        desc: 'رص ٤ في صف رأسي أو أفقي',
        online: true,
        accentVar: 'var(--game-16-accent)',
    },
    {
        id: 'memory-game',
        title: 'Memory Match',
        desc: 'تطابق الورق وقوة الذاكرة',
        online: true,
        accentVar: 'var(--game-17-accent)',
    },
    {
        id: 'dots-boxes',
        title: 'Dots & Boxes',
        desc: 'قفل المربعات واكسب النقاط',
        online: true,
        accentVar: 'var(--game-18-accent)',
    },
    {
        id: 'sea-battle',
        title: 'حرب السفن',
        desc: 'حرب السفن الاستراتيجية',
        online: true,
        accentVar: 'var(--game-19-accent)',
    },
    {
        id: 'bus-complete',
        title: 'أتوبيس كومبليت',
        desc: 'اسم حيوان نبات جماد بلاد',
        online: true,
        accentVar: 'var(--game-21-accent)',
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

/* ─── word game modal / sub-selector ─────────────────────────────────────── */
function WordGameSelector({ onSelect, onClose }) {
    return (
        <div className="safe-area-overlay fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
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

function TabooGameSelector({ onSelect, onClose }) {
    return (
        <div className="safe-area-overlay fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <div className="glass-card relative w-full max-w-sm rounded-3xl border border-white/20 p-5 text-center shadow-2xl">
                <button onClick={onClose} aria-label="إغلاق" className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20">
                    <X size={16} />
                </button>
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent)]">
                    <GameIcon gameId="taboo-game" size={25} />
                </div>
                <h3 className="mb-1 text-base font-black text-white">الكلمة الممنوعة</h3>
                <p className="mb-4 text-xs text-white/50">اختاروا اللعب عن بُعد بالدردشة أو سوا من غير دردشة:</p>
                <div className="flex flex-col gap-2.5">
                    <button onClick={() => onSelect('taboo-online')} className="glass-card group flex items-center gap-3 rounded-2xl border border-white/10 px-3 py-3 text-right transition hover:border-[var(--accent)] active:scale-[0.99]">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] transition group-hover:scale-110"><MessageCircle size={20} /></span>
                        <span><span className="block text-sm font-black">عن بُعد · بالدردشة</span><span className="mt-0.5 block text-[10px] font-medium text-white/45">كل لاعب على جهازه</span></span>
                    </button>
                    <button onClick={() => onSelect('taboo-local')} className="glass-card group flex items-center gap-3 rounded-2xl border border-white/10 px-3 py-3 text-right transition hover:border-[var(--accent)] active:scale-[0.99]">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] transition group-hover:scale-110"><IconPhone size={20} /></span>
                        <span><span className="block text-sm font-black">سوا · جهاز واحد</span><span className="mt-0.5 block text-[10px] font-medium text-white/45">أوفلاين تمامًا · بدون شات</span></span>
                    </button>
                    <button onClick={() => onSelect('taboo-together')} className="glass-card group flex items-center gap-3 rounded-2xl border border-white/10 px-3 py-3 text-right transition hover:border-[var(--accent)] active:scale-[0.99]">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] transition group-hover:scale-110"><IconWifi size={20} /></span>
                        <span><span className="block text-sm font-black">سوا · جهازين</span><span className="mt-0.5 block text-[10px] font-medium text-white/45">اتصال إنترنت لمزامنة اللعب · بدون شات</span></span>
                    </button>
                </div>
            </div>
        </div>
    );
}

function WhoAmIGameSelector({ onSelect, onClose }) {
    return (
        <div className="safe-area-overlay fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <div className="glass-card relative w-full max-w-sm rounded-3xl border border-white/20 p-5 text-center shadow-2xl">
                <button onClick={onClose} aria-label="إغلاق" className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20">
                    <X size={16} />
                </button>
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent)]">
                    <GameIcon gameId="whoami-online" size={25} />
                </div>
                <h3 className="mb-1 text-base font-black text-white">أنا مين؟</h3>
                <p className="mb-4 text-xs text-white/50">اختاروا طريقة اللعب:</p>
                <div className="flex flex-col gap-2.5">
                    <button onClick={() => onSelect('whoami-online')} className="glass-card group flex items-center gap-3 rounded-2xl border border-white/10 px-3 py-3 text-right transition hover:border-[var(--accent)] active:scale-[0.99]">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] transition group-hover:scale-110"><MessageCircle size={20} /></span>
                        <span><span className="block text-sm font-black">عن بُعد</span><span className="mt-0.5 block text-[10px] font-medium text-white/45">كل لاعب على جهازه</span></span>
                    </button>
                    <button onClick={() => onSelect('whoami-together')} className="glass-card group flex items-center gap-3 rounded-2xl border border-white/10 px-3 py-3 text-right transition hover:border-[var(--accent)] active:scale-[0.99]">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] transition group-hover:scale-110"><IconWifi size={20} /></span>
                        <span><span className="block text-sm font-black">سوا · جهازين</span><span className="mt-0.5 block text-[10px] font-medium text-white/45">اللعب متزامن بين الجهازين</span></span>
                    </button>
                </div>
            </div>
        </div>
    );
}

function getGameBadgeLabel(game) {
    return game.badgeLabel || (game.exclusive
        ? '\u062d\u0635\u0631\u064a'
        : '\u0648\u0635\u0644 \u062d\u062f\u064a\u062b\u064b\u0627');
}

function HubGameCard({ game, onClick, index = 0, rail = false, featuredKind = '' }) {
    const badgeKind = game.badgeKind || (game.exclusive ? 'exclusive' : 'new');

    return (
        <button
            type="button"
            onClick={() => onClick(game)}
            style={{ '--card-accent': game.accentVar, animationDelay: `${index * 20}ms` }}
            className={`hub-game-card ${rail ? 'hub-game-card--rail' : 'w-full'} ${featuredKind ? `hub-game-card--featured-${featuredKind}` : ''} text-right group cursor-pointer ${game.exclusive ? 'exclusive-card' : ''} ${game.exclusiveTier === 'secondary' ? 'exclusive-card--secondary' : ''}`}
        >
            <div className="hub-card-top">
                {game.exclusive || game.isNew ? (
                    <span className={`hub-card-label ${game.exclusive ? 'exclusive-chip' : 'plain-chip'} hub-card-label--${badgeKind}`}>
                        <Sparkles size={10} />
                        <span>{getGameBadgeLabel(game)}</span>
                    </span>
                ) : <span className="hub-card-label-placeholder" aria-hidden="true" />}

                <span className="hub-online-badge">
                    <span className="hub-online-pip" />
                    <span>{game.online ? '1v1' : 'أوفلاين'}</span>
                </span>
            </div>

            <div className="hub-card-main">
                <div className="hub-game-icon" style={{ '--card-accent': game.accentVar }}>
                    <GameIcon gameId={game.id} size={23} />
                </div>
                <div className="hub-card-copy">
                    <h3>{game.title}</h3>
                    <p>{game.desc}</p>
                </div>
            </div>

            <div className="hub-card-footer">
                <span>العب الآن</span>
                <span className="hub-card-play"><Play size={11} className="fill-current" /></span>
            </div>
        </button>
    );
}

/* ─── main hub ───────────────────────────────────────────────────────────── */
export default function Hub({ setView }) {
    const [wordModalOpen, setWordModalOpen] = useState(false);
    const [tabooModalOpen, setTabooModalOpen] = useState(false);
    const [whoAmIModalOpen, setWhoAmIModalOpen] = useState(false);
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
        } else if (game.id === 'taboo-game') {
            playSound('click');
            setTabooModalOpen(true);
        } else if (game.id === 'whoami-online') {
            playSound('click');
            setWhoAmIModalOpen(true);
        } else {
            go(game.id);
        }
    };

    // Keep search as the only catalogue filter.
    const filteredGames = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return GAMES;
        return GAMES.filter(game =>
            game.title.toLowerCase().includes(query) ||
            game.desc.toLowerCase().includes(query)
        );
    }, [searchQuery]);
    const latestGames = useMemo(() => GAMES.filter(game => game.isNew && !game.exclusive), []);
    const exclusiveGames = useMemo(() => GAMES.filter(game => game.exclusive), []);
    const showFeaturedShelves = !searchQuery.trim();

    return (
        <>
            {/* Background */}
            <div className="animated-bg">
                <div className="bg-orb-3" />
                <div className="animated-bg-noise" />
            </div>

            <div className="hub-page min-h-dvh flex flex-col items-center px-4 safe-area-pt overflow-x-hidden">

                {/* ── Top Header Navigation Bar ── */}
                <header className="hub-header w-full max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-6xl flex items-center justify-between py-3 mb-2 px-1">
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
                <section className="hub-hero w-full max-w-lg md:max-w-3xl lg:max-w-5xl flex flex-col items-center text-center my-3 animate-fade-in">
                    <h1 className="hub-hero-title text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-none mb-1">
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

                {!showFeaturedShelves ? null : (
                    <div className="hub-featured-sections w-full max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-6xl">
                        {(exclusiveGames.length + latestGames.length) > 0 && (
                            <section className="hub-featured-shelf" aria-labelledby="hub-featured-title">
                                <div className="hub-shelf-heading" style={{ '--shelf-accent': exclusiveGames[0]?.accentVar || latestGames[0]?.accentVar }}>
                                    <span className="hub-shelf-mark"><Sparkles size={15} /></span>
                                    <h2 id="hub-featured-title">الألعاب الحصرية والجديدة</h2>
                                    <span className="hub-shelf-count">{exclusiveGames.length + latestGames.length}</span>
                                </div>
                                <div className="hub-scroll-row">
                                    <div className="hub-scroll-inner py-1">
                                        {[...exclusiveGames, ...latestGames].map((game, idx) => (
                                            <HubGameCard
                                                key={game.id}
                                                game={game}
                                                onClick={handleCardClick}
                                                index={idx}
                                                rail
                                                featuredKind={game.exclusive ? 'exclusive' : 'new'}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>
                )}


                {/* ── Search & View Mode Controls ── */}
                <div className="hub-search-toolbar w-full max-w-lg md:max-w-2xl flex items-center gap-2.5">
                    <div className="hub-search-field relative flex-1">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="ابحث عن لعبة..."
                            className="hub-search-input w-full pl-10 pr-10 text-sm font-bold text-white placeholder:text-white/45 outline-none"
                        />
                        <Search size={16} className="hub-search-icon absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="hub-search-clear absolute left-2.5 top-1/2 -translate-y-1/2"
                                aria-label="مسح البحث"
                                title="مسح البحث"
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

                {/* ── Main Games Container ── */}
                <main className="w-full max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-6xl flex-1 pb-24">
                    {filteredGames.length === 0 ? (
                        <div className="glass-card p-8 rounded-3xl text-center border border-white/10 my-8">
                            <span className="text-3xl mb-2 block">🔍</span>
                            <h3 className="text-sm font-bold text-white mb-1">لم يتم العثور على ألعاب</h3>
                            <p className="text-xs text-white/40">{'\u062c\u0631\u0651\u0628 \u0643\u0644\u0645\u0629 \u0628\u062d\u062b \u0645\u062e\u062a\u0644\u0641\u0629'}</p>
                        </div>
                    ) : viewMode === 'grid' ? (
                        /* ── Grid View: 2 columns on mobile, 3 on tablet, 4 on desktop ── */
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 w-full">
                            {filteredGames.map((game, idx) => (
                                <button
                                    key={game.id}
                                    onClick={() => handleCardClick(game)}
                                    style={{
                                        '--card-accent': game.accentVar,
                                        animationDelay: `${idx * 20}ms`,
                                    }}
                                    className={`hub-game-card w-full text-right group cursor-pointer ${game.exclusive ? 'exclusive-card' : ''} ${game.exclusiveTier === 'secondary' ? 'exclusive-card--secondary' : ''}`}
                                >
                                    <div className="hub-card-top">
                                        {game.exclusive || game.isNew ? (
                                            <span className={`hub-card-label ${game.exclusive ? 'exclusive-chip' : 'plain-chip'} hub-card-label--${game.badgeKind || (game.exclusive ? 'exclusive' : 'new')}`}>
                                                <Sparkles size={10} />
                                                <span>{getGameBadgeLabel(game)}</span>
                                            </span>
                                        ) : <span className="hub-card-label-placeholder" aria-hidden="true" />}

                                        <span className="hub-online-badge">
                                            <span className="hub-online-pip" />
                                            <span>{game.online ? '1v1' : '\u0623\u0648\u0641\u0644\u0627\u064a\u0646'}</span>
                                        </span>
                                    </div>

                                    <div className="hub-card-main">
                                        <div
                                            className="hub-game-icon"
                                            style={{ '--card-accent': game.accentVar }}
                                        >
                                            <GameIcon gameId={game.id} size={23} />
                                        </div>
                                        <div className="hub-card-copy">
                                            <h3>{game.title}</h3>
                                            <p>{game.desc}</p>
                                        </div>
                                    </div>

                                    <div className="hub-card-footer">
                                        <span>{'\u0627\u0644\u0639\u0628 \u0627\u0644\u0622\u0646'}</span>
                                        <span className="hub-card-play"><Play size={11} className="fill-current" /></span>
                                    </div>
                                </button>
                            ))}
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
                                        animationDelay: `${idx * 20}ms`,
                                    }}
                                    className={`spotlight-card w-full p-2.5 sm:p-3 rounded-2xl border text-right transition-all duration-300 active:scale-[0.99] flex items-center justify-between gap-3 group cursor-pointer ${game.exclusive ? 'exclusive-card' : ''} ${game.exclusiveTier === 'secondary' ? 'exclusive-card--secondary' : ''}`}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                                        <div
                                            className="hub-game-icon w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform"
                                            style={{
                                                '--card-accent': game.accentVar,
                                            }}
                                        >
                                            <GameIcon gameId={game.id} size={22} className="text-white" />
                                        </div>

                                        <div className="flex flex-col text-right overflow-hidden flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <h3 className="text-sm font-black text-white transition-colors truncate">
                                                    {game.title}
                                                </h3>
                                                {(game.exclusive || game.isNew) && (
                                                        <span className={`${game.exclusive ? 'exclusive-chip' : 'plain-chip'} hub-card-label--${game.badgeKind || (game.exclusive ? 'exclusive' : 'new')} text-[8px] font-black px-1.5 py-0.2 rounded-full shrink-0`}>
                                                        {getGameBadgeLabel(game)}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-white/50 truncate font-medium mt-0.5">
                                                {game.desc}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="hub-card-cta flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all duration-300 shrink-0">
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

                {tabooModalOpen && (
                    <TabooGameSelector
                        onSelect={(viewName) => {
                            setTabooModalOpen(false);
                            go(viewName);
                        }}
                        onClose={() => setTabooModalOpen(false)}
                    />
                )}

                {whoAmIModalOpen && (
                    <WhoAmIGameSelector
                        onSelect={(viewName) => {
                            setWhoAmIModalOpen(false);
                            go(viewName);
                        }}
                        onClose={() => setWhoAmIModalOpen(false)}
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
