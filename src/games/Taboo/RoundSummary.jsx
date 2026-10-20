import React from 'react';
import { resultLabel } from './tabooLogic';
import Trophy from 'lucide-react/dist/esm/icons/trophy';

const statusClass = {
    correct: 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100',
    skipped: 'border-amber-300/20 bg-amber-400/10 text-amber-100',
    forbidden: 'border-rose-300/20 bg-rose-400/10 text-rose-100',
    exhausted: 'border-slate-300/15 bg-white/5 text-white/70',
    timeout: 'border-slate-300/15 bg-white/5 text-white/70'
};

export default function RoundSummary({ roundNumber, words, scores, names, onContinue, isHost, isFinal }) {
    const p1Label = names.p1 || 'اللاعب الأول';
    const p2Label = names.p2 || 'اللاعب الثاني';
    return (
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pb-8 pt-3">
            <section className="glass-card rounded-3xl border border-[var(--accent)]/25 p-5 text-center">
                <Trophy size={34} className="mx-auto mb-2 text-[var(--accent)]" />
                <h1 className="text-2xl font-black">ملخص الراوند {roundNumber}</h1>
                <p className="mt-1 text-xs font-bold text-white/55">الواصف هو صاحب نقاط الكلمات الصحيحة في الراوند ده.</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                    {[[p1Label, scores.p1], [p2Label, scores.p2]].map(([name, score]) => (
                        <div key={name} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                            <p className="truncate text-xs font-black text-white/65">{name}</p>
                            <p className="mt-1 text-2xl font-black text-[var(--accent)]">{score}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mt-4 flex-1">
                <h2 className="mb-2 text-sm font-black">كل الكلمات اللي ظهرت في الراوند</h2>
                {words.length ? (
                    <div className="space-y-2">
                        {words.map((entry, index) => (
                            <article key={`${entry.wordId || entry.id}-${index}`} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-black text-[var(--accent)]">{entry.word}</p>
                                        <p className="mt-1 text-[10px] font-bold text-white/40">{entry.categoryName || 'كلمة من الفئات المختارة'}</p>
                                    </div>
                                    <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black ${statusClass[entry.status] || 'border-white/10 bg-white/5 text-white/60'}`}>
                                        {resultLabel(entry.status)}
                                    </span>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {(entry.taboo || []).map((term) => <span key={term} className="rounded-full bg-rose-400/10 px-2 py-1 text-[10px] font-bold text-rose-100/75">{term}</span>)}
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center text-sm text-white/50">مفيش كلمات ظهرت في الراوند ده.</p>
                )}
            </section>

            <div className="mt-4">
                {isHost ? (
                    <button type="button" onClick={onContinue} className="glow-button h-14 w-full rounded-2xl text-base font-black">
                        {isFinal ? 'عرض النتيجة النهائية' : 'ابدأ الراوند التالي'}
                    </button>
                ) : (
                    <p className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-center text-xs font-black text-white/55">في انتظار اللاعب المضيف يكمل...</p>
                )}
            </div>
        </main>
    );
}
