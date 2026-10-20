import React, { useState } from 'react';
import Send from 'lucide-react/dist/esm/icons/send';
import { RoundTimer } from './DescriberView';

export default function GuesserView({ seconds, roundNumber, score, clue, verbal = false, clueReady = false, attempts, guessHistory, feedback, pending, onGuess }) {
    const [draft, setDraft] = useState('');
    const hasClue = verbal ? clueReady : Boolean(clue);
    const submit = () => {
        const value = draft.trim();
        if (!value || pending || attempts >= 3) return;
        onGuess(value);
        setDraft('');
    };

    return (
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-8 pt-3">
            <div className="mb-5 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="text-right">
                    <p className="text-[10px] font-black text-white/50">الراوند {roundNumber} · إنت الخمّان</p>
                    <p className="mt-1 text-xs font-black text-[var(--accent)]">نقاطك: {score}</p>
                </div>
                <RoundTimer seconds={seconds} />
            </div>

            <section className="glass-card flex min-h-40 flex-1 flex-col justify-center rounded-3xl border border-sky-300/20 p-5">
                <p className="mb-3 text-center text-[10px] font-black text-white/45">{verbal ? 'وصف الواصف بصوت مسموع' : 'وصف الواصف'}</p>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center text-base font-bold leading-7 text-white" dir="auto">
                    {verbal
                        ? clueReady ? 'اسمع الوصف، وقول تخمينك للواصف بصوتك.' : 'في انتظار الواصف يبدأ الشرح بصوت مسموع...'
                        : clue || 'في انتظار الوصف من اللاعب الآخر...'}
                </div>
                {feedback && <p role="status" className="mt-3 text-center text-sm font-black text-[var(--accent)]">{feedback}</p>}
            </section>

            {!verbal && <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="mb-2 flex items-center justify-between text-xs font-black">
                    <span className="text-white/60">محاولاتك</span>
                    <span className={attempts >= 3 ? 'text-rose-300' : 'text-sky-300'}>{Math.min(attempts, 3)}/3</span>
                </div>
                <div className="mb-3 flex gap-2" dir="ltr">
                    {[0, 1, 2].map((index) => (
                        <span key={index} className={`flex min-h-10 flex-1 items-center justify-center overflow-hidden rounded-xl border px-2 text-center text-[10px] font-black ${index < attempts ? 'border-sky-300/30 bg-sky-400/10 text-sky-100' : 'border-white/10 bg-white/[0.03] text-white/20'}`} dir="auto">
                            {guessHistory[index] || `محاولة ${index + 1}`}
                        </span>
                    ))}
                </div>
                <form onSubmit={(event) => { event.preventDefault(); submit(); }} className="flex gap-2">
                    <input
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder="اكتب تخمينك..."
                        aria-label="اكتب تخمينك"
                        className="glass-input min-w-0 flex-1 rounded-xl px-3 py-3 text-sm font-black"
                        dir="auto"
                        maxLength={80}
                        disabled={pending || attempts >= 3 || !hasClue}
                    />
                    <button type="submit" disabled={pending || attempts >= 3 || !hasClue || !draft.trim()} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-slate-950 transition active:scale-95 disabled:opacity-35" aria-label="إرسال التخمين">
                        <Send size={18} />
                    </button>
                </form>
                <p className="mt-2 text-center text-[10px] font-bold text-white/45">لو خلصت ٣ محاولات، الكلمة هتتخطى تلقائيًا.</p>
            </div>}
        </main>
    );
}
