import React, { useState } from 'react';
import useProfile from '../hooks/useProfile';
import { playSound, playHaptic } from '../lib/audioEngine';
import { AVATARS, AvatarDisplay } from './icons/AvatarIcons';
import { IconEdit } from './icons/GameIcons';

export default function ProfileWidget() {
    const [profile, updateProfile] = useProfile();
    const [isOpen, setIsOpen] = useState(false);
    const [tempNick, setTempNick] = useState('');

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
            <div
                className="glass-card h-11 px-3 rounded-2xl flex items-center gap-2 cursor-pointer hover:bg-white/10 transition-all select-none shrink-0 border border-white/10 shadow-sm group"
                onClick={handleOpen}
            >
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 overflow-hidden bg-white/5 border border-white/10">
                    <AvatarDisplay avatarId={profile.avatar} size={24} />
                </div>
                <span className="font-black text-xs tracking-wide opacity-90 max-w-[70px] sm:max-w-[85px] truncate whitespace-nowrap">
                    {profile.nickname}
                </span>
                <IconEdit size={13} className="opacity-40 group-hover:opacity-80 transition-opacity shrink-0" />
            </div>

            {isOpen && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="glass-card rounded-3xl p-6 w-full max-w-sm flex flex-col gap-5 animate-pop-in border border-white/10 shadow-2xl">
                        <h2 className="text-xl font-black text-center gradient-text">تعديل الملف الشخصي</h2>

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
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-center font-bold text-[var(--accent)] transition-all focus:border-[var(--accent)] focus:bg-white/5 outline-none"
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
