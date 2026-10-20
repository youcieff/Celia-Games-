import React from 'react';

const MODES = [
    {
        id: 'rules',
        title: 'مباراة بشرط واحد',
        description: 'شخصية واحدة لكل لاعب، وتختاروا شرطًا إضافيًا واحدًا للجولة.',
        badge: 'اختاروا شرطًا',
        accent: '#fbbf24'
    },
    {
        id: 'free',
        title: 'المود الحر',
        description: 'كل لاعب يختار كارتًا واحدًا أو كارتين ويحاول معرفة كروت خصمه بلا قيود.',
        badge: 'كارت أو كارتان',
        accent: '#38bdf8'
    }
];

export default function MatchModeSelect({ isHost, onSelect }) {
    if (!isHost) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <div className="glass-card rounded-3xl border border-white/10 p-8">
                    <div className="mb-3 text-4xl">⏳</div>
                    <h2 className="text-xl font-black">في انتظار اختيار المود</h2>
                    <p className="mt-2 text-sm text-white/60">المضيف يختار مباراة بشرط واحد أو المود الحر.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-6">
            <div className="mb-2 text-center">
                <h2 className="text-2xl font-black">اختاروا طريقة اللعب</h2>
                <p className="mt-2 text-sm text-white/60">حجر ورقة مقص هيحدد أول لاعب يسأل في المودين.</p>
            </div>
            <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-2">
                {MODES.map((mode) => (
                    <button
                        key={mode.id}
                        onClick={() => onSelect(mode.id)}
                        className="glass-card rounded-3xl border p-5 text-right transition hover:-translate-y-1 hover:bg-white/10 active:scale-[0.98]"
                        style={{ borderColor: `${mode.accent}66`, boxShadow: `0 10px 30px ${mode.accent}18` }}
                    >
                        <span className="rounded-full px-3 py-1 text-xs font-black" style={{ background: `${mode.accent}22`, color: mode.accent }}>{mode.badge}</span>
                        <h3 className="mt-4 text-xl font-black">{mode.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-white/65">{mode.description}</p>
                    </button>
                ))}
            </div>
        </div>
    );
}
