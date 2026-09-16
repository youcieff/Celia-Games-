import React, { useState } from 'react';
import useProfile, { getLevelInfo } from '../hooks/useProfile';
import { playSound, playHaptic } from '../lib/audioEngine';
import { AVATARS, AvatarDisplay } from './icons/AvatarIcons';
import { BADGES_LIST, getMatchHistory, getWinStreakStats, formatMatchTime } from '../lib/statsEngine';
import User from 'lucide-react/dist/esm/icons/user';
import Swords from 'lucide-react/dist/esm/icons/swords';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import X from 'lucide-react/dist/esm/icons/x';
import Flame from 'lucide-react/dist/esm/icons/flame';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import Lock from 'lucide-react/dist/esm/icons/lock';

export default function ProfileWidget() {
    const [profile, updateProfile] = useProfile();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'history' | 'badges'
    const [tempNick, setTempNick] = useState('');

    const levelInfo = getLevelInfo(profile.xp || 0);
    const streakStats = getWinStreakStats();
    const history = getMatchHistory();

    const handleOpen = () => {
        setTempNick(profile.nickname);
        setIsOpen(true);
        playSound('click');
        playHaptic(10);
    };

    const handleSave = () => {
        if (tempNick.trim()) {
            updateProfile({ nickname: tempNick.trim() });
        }
        setIsOpen(false);
        playSound('pop');
    };

    const statsData = {
        wins: profile.wins || 0,
        gamesPlayed: profile.gamesPlayed || 0,
        maxStreak: streakStats.maxStreak || 0,
        currentStreak: streakStats.currentStreak || 0
    };

    const unlockedBadgesCount = BADGES_LIST.filter(b => b.check(statsData)).length;

    return (
        <>
            <button
                type="button"
                className="glass-card h-10 px-3 rounded-2xl flex items-center gap-2 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all select-none shrink-0 border border-white/10 shadow-sm max-w-[145px] overflow-hidden active:scale-95 group"
                onClick={handleOpen}
                title="الملف الشخصي والمستوى"
            >
                <div className="w-6 h-6 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 shrink-0 group-hover:scale-105 transition-transform">
                    <AvatarDisplay avatarId={profile.avatar} size={18} />
                </div>
                <div className="flex flex-col items-start min-w-0 overflow-hidden flex-1">
                    <span className="text-xs font-black text-white/90 leading-tight block truncate w-full">
                        {profile.nickname || 'أنت'}
                    </span>
                    <span className="text-[9px] font-bold text-[var(--accent)] leading-none opacity-90 block truncate w-full">
                        {levelInfo.title}
                    </span>
                </div>
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[120] flex items-center justify-center p-3 animate-fade-in">
                    <div className="glass-card rounded-3xl p-5 w-full max-w-md flex flex-col gap-4 animate-pop-in border border-white/10 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        
                        {/* Header & Close */}
                        <div className="flex items-center justify-between pb-1 border-b border-white/10">
                            <h2 className="text-base font-black gradient-text">مركز الإنجازات والملف</h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-7 h-7 rounded-full glass-card flex items-center justify-center text-white/70 hover:text-white"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl glass-card border border-white/10 text-xs font-black">
                            <button
                                onClick={() => { setActiveTab('profile'); playSound('click'); }}
                                className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                                    activeTab === 'profile' ? 'bg-[var(--accent)] text-slate-950 shadow-md font-black' : 'text-white/60 hover:text-white'
                                }`}
                            >
                                <User size={14} />
                                <span>الشخصية</span>
                            </button>
                            <button
                                onClick={() => { setActiveTab('history'); playSound('click'); }}
                                className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all relative ${
                                    activeTab === 'history' ? 'bg-[var(--accent)] text-slate-950 shadow-md font-black' : 'text-white/60 hover:text-white'
                                }`}
                            >
                                <Swords size={14} />
                                <span>المعارك</span>
                                {history.length > 0 && (
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-1.5 right-1.5 animate-pulse" />
                                )}
                            </button>
                            <button
                                onClick={() => { setActiveTab('badges'); playSound('click'); }}
                                className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                                    activeTab === 'badges' ? 'bg-[var(--accent)] text-slate-950 shadow-md font-black' : 'text-white/60 hover:text-white'
                                }`}
                            >
                                <Trophy size={14} />
                                <span>الأوسمة ({unlockedBadgesCount})</span>
                            </button>
                        </div>

                        {/* ── TAB 1: Profile & Avatar ── */}
                        {activeTab === 'profile' && (
                            <div className="flex flex-col gap-4 animate-fade-in">
                                {/* Level & XP Progression Card */}
                                <div className="glass-card rounded-2xl p-3 border border-white/10 flex flex-col gap-2.5 bg-gradient-to-r from-white/[0.04] to-transparent">
                                    <div className="flex items-center justify-between text-xs font-bold">
                                        <span className="text-amber-400 font-black flex items-center gap-1">
                                            المستوى {levelInfo.level}: {levelInfo.title}
                                        </span>
                                        <span className="opacity-60 text-[11px]">{levelInfo.progressXP} / {levelInfo.nextLevelXP} XP</span>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${levelInfo.progressPercent}%`,
                                                background: 'linear-gradient(90deg, var(--accent), #10b981)'
                                            }}
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                                        <div className="p-1.5 rounded-xl bg-white/5 border border-white/10">
                                            <span className="text-[10px] text-white/50 block font-bold">🏆 انتصارات</span>
                                            <span className="text-xs font-black text-amber-300">{statsData.wins}</span>
                                        </div>
                                        <div className="p-1.5 rounded-xl bg-white/5 border border-white/10">
                                            <span className="text-[10px] text-white/50 block font-bold">🎮 مبارايات</span>
                                            <span className="text-xs font-black text-sky-300">{statsData.gamesPlayed}</span>
                                        </div>
                                        <div className="p-1.5 rounded-xl bg-white/5 border border-white/10">
                                            <span className="text-[10px] text-white/50 block font-bold">🔥 أعلى سلسلة</span>
                                            <span className="text-xs font-black text-rose-300">{statsData.maxStreak}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold opacity-60 mb-2 block">اختر شخصيتك الرمزية</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {AVATARS.map(av => {
                                            const isSelected = profile.avatar === av.id;
                                            const Component = av.Component;
                                            return (
                                                <button
                                                    key={av.id}
                                                    type="button"
                                                    onClick={() => { updateProfile({ avatar: av.id }); playSound('pop'); playHaptic(10); }}
                                                    className={`h-14 flex flex-col items-center justify-center gap-1 rounded-2xl transition-all ${
                                                        isSelected 
                                                            ? 'border-2 border-[var(--accent)] bg-[var(--accent-soft)] shadow-md shadow-[var(--accent-glow)] scale-105' 
                                                            : 'glass-card hover:bg-white/10'
                                                    }`}
                                                    style={{ backgroundColor: isSelected ? undefined : av.bg }}
                                                >
                                                    <Component size={24} />
                                                    <span className="text-[9px] font-bold opacity-70 leading-none">{av.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold opacity-60 mb-1.5 block">اسمك المستعار في اللعب</label>
                                    <input
                                        type="text"
                                        value={tempNick}
                                        onChange={(e) => setTempNick(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-center font-bold text-[var(--accent)] transition-all focus:border-[var(--accent)] focus:bg-white/5 outline-none text-sm"
                                        maxLength={15}
                                        placeholder="اكتب اسمك..."
                                        dir="auto"
                                    />
                                </div>

                                <button onClick={handleSave} className="glow-button w-full h-11 rounded-xl text-xs font-black">
                                    حفظ التغييرات
                                </button>
                            </div>
                        )}

                        {/* ── TAB 2: Match History ── */}
                        {activeTab === 'history' && (
                            <div className="flex flex-col gap-2.5 animate-fade-in max-h-[360px] overflow-y-auto pr-1">
                                {history.length === 0 ? (
                                    <div className="glass-card p-6 text-center rounded-2xl border border-white/10 my-4">
                                        <Swords size={32} className="mx-auto text-white/30 mb-2" />
                                        <p className="text-xs font-bold text-white/70 mb-1">لا يوجد معارك مسجلة بعد</p>
                                        <p className="text-[10px] text-white/40">العب مباراة واحدة وسوف تظهر نتائجها هنا فوراً!</p>
                                    </div>
                                ) : (
                                    history.map(item => (
                                        <div
                                            key={item.id}
                                            className="glass-card p-2.5 rounded-2xl border border-white/10 flex items-center justify-between gap-2 text-right bg-white/[0.02]"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-xs ${
                                                    item.isWin ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                                }`}>
                                                    {item.isWin ? '🏆' : '💀'}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs font-black text-white truncate">{item.gameTitle || 'لعبة'}</span>
                                                        <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full ${
                                                            item.isWin ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                                                        }`}>
                                                            {item.isWin ? 'فوز' : 'خسارة'}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-white/50 font-bold truncate">
                                                        ضد: {item.oppName} ({item.myScore} - {item.oppScore})
                                                    </span>
                                                </div>
                                            </div>

                                            <span className="text-[9px] font-bold text-white/40 shrink-0">
                                                {formatMatchTime(item.timestamp)}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* ── TAB 3: Badges & Achievements ── */}
                        {activeTab === 'badges' && (
                            <div className="grid grid-cols-2 gap-2.5 animate-fade-in max-h-[360px] overflow-y-auto pr-1">
                                {BADGES_LIST.map(badge => {
                                    const isUnlocked = badge.check(statsData);
                                    return (
                                        <div
                                            key={badge.id}
                                            className={`p-3 rounded-2xl border text-right flex flex-col justify-between transition-all ${
                                                isUnlocked
                                                    ? 'glass-card border-amber-400/40 bg-gradient-to-br from-amber-500/10 to-transparent shadow-sm'
                                                    : 'bg-white/[0.02] border-white/5 opacity-55'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-2xl drop-shadow-sm">{badge.icon}</span>
                                                {isUnlocked ? (
                                                    <span className="text-emerald-400 flex items-center gap-0.5 text-[9px] font-black bg-emerald-500/15 px-1.5 py-0.5 rounded-full border border-emerald-500/30">
                                                        <CheckCircle2 size={10} /> تم الفتح
                                                    </span>
                                                ) : (
                                                    <span className="text-white/40 flex items-center gap-0.5 text-[9px] font-bold bg-white/5 px-1.5 py-0.5 rounded-full">
                                                        <Lock size={10} /> مغلق
                                                    </span>
                                                )}
                                            </div>

                                            <div>
                                                <h4 className="text-xs font-black text-white mb-0.5">{badge.title}</h4>
                                                <p className="text-[9px] text-white/50 leading-tight font-medium">{badge.desc}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                    </div>
                </div>
            )}
        </>
    );
}
