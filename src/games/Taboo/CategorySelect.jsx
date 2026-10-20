import React from 'react';
import { CATEGORIES } from './tabooLogic';
import { IconTaboo } from '../../components/icons/GameIcons';

export default function CategorySelect({ isHost, selectedIds, onToggle, onStart }) {
    if (!isHost) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center px-5 text-center">
                <div className="glass-card max-w-sm rounded-3xl border border-white/10 p-8">
                    <IconTaboo size={42} className="mx-auto mb-4 text-[var(--accent)]" />
                    <h2 className="text-xl font-black">في انتظار اختيار الفئات</h2>
                    <p className="mt-2 text-sm leading-6 text-white/60">مضيف الغرفة هيختار فئة واحدة أو أكتر، وبعدها تبدأوا أول راوند.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-8 pt-3">
            <div className="mb-5 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent)]">
                    <IconTaboo size={29} />
                </div>
                <h2 className="text-2xl font-black">اختاروا فئات الكلمات</h2>
                <p className="mt-2 text-sm text-white/60">اختار فئة واحدة أو أكتر. الكلمات مش هتتكرر في نفس المباراة.</p>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {CATEGORIES.map((category, index) => {
                    const selected = selectedIds.includes(category.id);
                    const accent = ['#38bdf8', '#f472b6', '#fbbf24', '#a78bfa', '#34d399'][index % 5];
                    return (
                        <button
                            key={category.id}
                            type="button"
                            onClick={() => onToggle(category.id)}
                            aria-pressed={selected}
                            className={`glass-card flex items-center gap-3 rounded-2xl border px-4 py-3 text-right transition active:scale-[0.98] ${selected ? 'bg-white/[0.08]' : 'opacity-75 hover:opacity-100'}`}
                            style={{ borderColor: selected ? `${accent}99` : 'var(--glass-border)', boxShadow: selected ? `0 0 20px ${accent}20` : 'none' }}
                        >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-black" style={{ color: accent, background: `${accent}1c` }}>
                                {category.name === 'حيوانات' ? '🐾' : category.name === 'مهن' ? '🧰' : category.name === 'أكلات' ? '🍽️' : category.name === 'أماكن' ? '🗺️' : '🧩'}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-black text-white">{category.name}</span>
                                <span className="mt-0.5 block text-[11px] font-bold text-white/45">{category.words.length} كلمة</span>
                            </span>
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-black ${selected ? 'border-transparent text-slate-950' : 'border-white/20 text-transparent'}`} style={selected ? { background: accent } : undefined}>
                                ✓
                            </span>
                        </button>
                    );
                })}
            </div>

            <button
                type="button"
                onClick={onStart}
                disabled={!selectedIds.length}
                className="glow-button mt-5 h-14 w-full rounded-2xl text-base font-black transition disabled:cursor-not-allowed disabled:opacity-40"
            >
                ابدأوا المباراة · ٦ راوندات
            </button>
        </div>
    );
}
