import React, { useState } from 'react';
import useProfile, { getLevelInfo } from '../hooks/useProfile';
import { playSound, playHaptic } from '../lib/audioEngine';
import { AVATARS, AvatarDisplay } from './icons/AvatarIcons';

export default function ProfileWidget() {
    const [profile, updateProfile] = useProfile();
    const [isOpen, setIsOpen] = useState(false);
    const [tempNick, setTempNick] = useState('');

    const levelInfo = getLevelInfo(profile.xp || 0);

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

    return (
        <>
            <button
                type="button"
                className="glass-card h-10 px-3 rounded-2xl flex items-center gap-2 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all select-none shrink-0 border border-white/10 shadow-sm max-w-[155px] active:scale-95 group"
                onClick={handleOpen}
                title="الملف الشخصي والمستوى"
            >
                <div className="w-6 h-6 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 shrink-0 group-hover:scale-105 transition-transform">
                    <AvatarDisplay avatarId={profile.avatar} size={18} />
                </div>
                <div className="flex flex-col items-start min-w-0">
                    <span className="text-xs font-black truncate text-white/90 leading-tight">
                        {profile.nickname || 'أنت'}
                    </span>
                    <span className="text-[9px] font-bold text-[var(--accent)] leading-none truncate opacity-90">
                        {levelInfo.title}
                    </span>
                </div>
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="glass-card rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4 animate-pop-in border border-white/10 shadow-2xl">
                        <h2 className="text-xl font-black text-center gradient-text">الملف الشخصي والمستوى</h2>

                        {/* Level & XP Progression Card */}
                        <div className="glass-card rounded-2xl p-3 border border-white/10 flex flex-col gap-2 bg-gradient-to-r from-white/[0.04] to-transparent">
                            <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-amber-400 font-black flex items-center gap-1">
                                    المستوى {levelInfo.level}: {levelInfo.title}
                                </span>
                                <span className="opacity-60">{levelInfo.progressXP} / {levelInfo.nextLevelXP} XP</span>
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
                            <div className="flex items-center justify-between text-[10px] opacity-60 font-bold">
                                <span>🏆 الانتصارات: {profile.wins || 0}</span>
                                <span>🎮 المباريات: {profile.gamesPlayed || 0}</span>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold opacity-60 mb-2.5 block">اختر الشخصية</label>
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
                                                    ? 'border-2 border-[var(--accent)] bg-[var(--accent-soft)] shadow-md shadow-[var(--accent-glow)]' 
                                                    : 'glass-card hover:bg-white/10'
                                            }`}
                                            style={{ backgroundColor: isSelected ? undefined : av.bg }}
                                        >
                                            <Component size={26} />
                                            <span className="text-[10px] font-bold opacity-70 leading-none">{av.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold opacity-60 mb-2 block">الاسم المستعار</label>
                            <input
                                type="text"
                                value={tempNick}
                                onChange={(e) => setTempNick(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-center font-bold text-[var(--accent)] transition-all focus:border-[var(--accent)] focus:bg-white/5 outline-none"
                                maxLength={15}
                                placeholder="اكتب اسمك..."
                                dir="auto"
                            />
                        </div>

                        <button onClick={handleSave} className="glow-button w-full h-12 rounded-xl text-sm font-black">
                            حفظ ومتابعة
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
