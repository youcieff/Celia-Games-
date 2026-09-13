import React, { useState } from 'react';
import useProfile from '../hooks/useProfile';
import { playSound, playHaptic } from '../lib/audioEngine';
import Edit3 from 'lucide-react/dist/esm/icons/edit-3';

const AVATARS = ['😎', '🦁', '👸', '🐼', '🍒', '🌹', '🤖', '👽', '🚀', '⭐', '🐯', '🔥'];

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
                className="glass-card px-4 py-2 rounded-2xl flex items-center justify-between gap-4 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={handleOpen}
            >
                <div className="flex items-center gap-2">
                    <span className="text-2xl drop-shadow-md">{profile.avatar}</span>
                    <span className="font-bold text-sm tracking-wide opacity-90">{profile.nickname}</span>
                </div>
                <Edit3 size={14} className="opacity-50" />
            </div>

            {isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-card rounded-3xl p-6 w-full max-w-sm flex flex-col gap-6 animate-pop-in border border-white/10">
                        <h2 className="text-xl font-black text-center gradient-text">تعديل الملف الشخصي</h2>

                        <div>
                            <label className="text-xs font-bold opacity-60 mb-2 block">اختر الشخصية</label>
                            <div className="grid grid-cols-4 gap-2">
                                {AVATARS.map(av => (
                                    <button
                                        key={av}
                                        onClick={() => { updateProfile({ avatar: av }); playSound('pop'); playHaptic(10); }}
                                        className={`h-12 text-2xl flex items-center justify-center rounded-xl transition-all ${profile.avatar === av ? 'bg-emerald-500/20 border-2 border-emerald-400' : 'glass-card hover:bg-white/10'}`}
                                    >
                                        {av}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold opacity-60 mb-2 block">الاسم المستعار</label>
                            <input
                                type="text"
                                value={tempNick}
                                onChange={(e) => setTempNick(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-center font-bold text-[var(--primary-color)] transition-all focus:border-[var(--primary-color)] focus:bg-white/5 outline-none"
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
