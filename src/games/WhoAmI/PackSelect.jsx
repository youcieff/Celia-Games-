import React from 'react';
import { PACKS } from './packs';

export default function PackSelect({ isHost, onPackSelect, selectedPackId }) {
    if (!isHost) {
        const pack = PACKS.find(p => p.id === selectedPackId);
        return (
            <div className="flex flex-col items-center justify-center flex-1 p-6 animate-fade-in text-center">
                <div className="text-6xl mb-6 animate-spin-slow">⏳</div>
                <h2 className="text-2xl font-black text-white drop-shadow-md mb-2">في انتظار الهوست...</h2>
                <p className="text-white/60 text-sm">
                    {pack ? `الهوست اختار "${pack.name}"` : 'الهوست بيختار مجموعة الكروت'}
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center flex-1 p-4 animate-fade-in w-full max-w-md mx-auto">
            <h2 className="text-2xl font-black text-white drop-shadow-md mb-6">اختار المجموعة 🎴</h2>
            <div className="w-full flex flex-col gap-3">
                {PACKS.map(pack => {
                    const isSelected = selectedPackId === pack.id;
                    return (
                        <button
                            key={pack.id}
                            onClick={() => onPackSelect(pack.id)}
                            className={`p-4 rounded-2xl flex items-center justify-between transition-all duration-300 border-2
                                ${isSelected 
                                    ? 'bg-[var(--accent)] border-[var(--accent)] shadow-[0_0_20px_var(--accent-glow)] scale-105' 
                                    : 'hover:scale-105'}`}
                            style={{
                                background: isSelected ? 'var(--accent)' : 'var(--glass-bg)',
                                borderColor: isSelected ? 'var(--accent)' : 'var(--glass-border)',
                            }}
                        >
                            <span className="text-lg font-bold text-white">{pack.name}</span>
                            <span className="text-sm font-medium opacity-80 text-white">
                                {pack.cards.length} كارت
                            </span>
                        </button>
                    );
                })}
            </div>
            
            {selectedPackId && (
                <button
                    onClick={() => onPackSelect('CONFIRM')}
                    className="w-full mt-8 py-3.5 rounded-2xl font-black text-lg transition-transform hover:scale-105 active:scale-95 shadow-[0_0_20px_var(--accent-glow)] text-[var(--bg-base)]"
                    style={{ background: 'var(--accent)' }}
                >
                    تأكيد الاختيار
                </button>
            )}
        </div>
    );
}
