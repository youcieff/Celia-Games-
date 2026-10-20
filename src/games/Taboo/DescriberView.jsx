import React, { useState } from 'react';
import Check from 'lucide-react/dist/esm/icons/check';
import SkipForward from 'lucide-react/dist/esm/icons/skip-forward';
import Ban from 'lucide-react/dist/esm/icons/ban';
import Send from 'lucide-react/dist/esm/icons/send';
import { ROUND_SECONDS } from './tabooLogic';

function Timer({ seconds }) {
    const danger = seconds <= 10;
    const progress = Math.max(0, Math.min(1, seconds / ROUND_SECONDS));
    const displayTime = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    return (
        <div className={`relative mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 font-mono text-2xl font-black tabular-nums transition sm:text-3xl ${danger ? 'border-rose-400 text-rose-300 shadow-[0_0_28px_rgba(244,63,94,0.3)] animate-pulse' : 'border-[var(--accent)] text-white shadow-[0_0_24px_var(--accent-glow)]'}`}>
            <svg className="absolute inset-[-5px] h-[calc(100%+10px)] w-[calc(100%+10px)] -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth="4" />
                <circle cx="50" cy="50" r="46" fill="none" stroke={danger ? '#fb7185' : 'var(--accent)'} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${progress * 289} 289`} />
            </svg>
            <span>{displayTime}</span>
        </div>
    );
}

export function RoundTimer({ seconds }) {
    return <Timer seconds={seconds} />;
}

export default function DescriberView({
    card, seconds, roundNumber, score, online, verbal = false, verbalReady = false, clue, attempts, skipsLeft,
    notice, onSendClue, onStartVerbalClue, onResolve, disabled
}) {
    const [draft, setDraft] = useState('');
    const [localError, setLocalError] = useState('');

    const sendClue = () => {
        const text = draft.trim();
        if (!text) return;
        const error = onSendClue(text);
        if (error) {
            setLocalError(error);
            return;
        }
        setLocalError('');
        setDraft('');
    };

    return (
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-32 pt-2">
            <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                <div className="text-right">
                    <p className="text-[10px] font-black text-white/50">الراوند {roundNumber} · إنت الواصف</p>
                    <p className="mt-0.5 text-xs font-black text-[var(--accent)]">نقاطك: {score}</p>
                </div>
                <RoundTimer seconds={seconds} />
                <div className="text-left">
                    <p className="text-[10px] font-black text-white/50">التخطي المتبقي</p>
                    <p className="mt-0.5 text-xs font-black text-white">{skipsLeft}</p>
                </div>
            </div>

            {card ? (
                <section className="glass-card rounded-3xl border border-[var(--accent)]/30 p-5 text-center shadow-[0_0_32px_var(--accent-soft)]">
                    <p className="text-[11px] font-black text-white/45">اشرح الكلمة من غير ما تقولها</p>
                    <h1 className="mt-2 text-4xl font-black tracking-wide text-[var(--accent)] sm:text-5xl">{card.word}</h1>
                    <p className="mt-5 text-xs font-black text-white/55">الكلمات الممنوعة</p>
                    <div className="mt-2 flex flex-wrap justify-center gap-2">
                        {card.taboo.map((word) => (
                            <span key={word} className="rounded-full border border-rose-300/25 bg-rose-400/10 px-3 py-1.5 text-sm font-black text-rose-100">{word}</span>
                        ))}
                    </div>
                </section>
            ) : (
                <section className="glass-card rounded-3xl border border-white/10 p-6 text-center">
                    <h1 className="text-xl font-black">استهلكتوا كلمات الفئة في المباراة</h1>
                    <p className="mt-2 text-sm leading-6 text-white/55">هنحافظ على عدم تكرار الكروت. كمّلوا الراوند والنتيجة هتتحسب عادي.</p>
                </section>
            )}

            {verbal && card && (
                <section className="mt-3 rounded-2xl border border-sky-300/20 bg-sky-400/5 p-3 text-center">
                    <p className="text-xs font-bold text-white/65">الخمّان يقول تخمينه بصوت؛ اضغط «صح» لو جاوب، أو «تخطي» لو مش عارف توصفها.</p>
                    <button
                        type="button"
                        onClick={onStartVerbalClue}
                        disabled={disabled || verbalReady}
                        className="mt-2 h-10 w-full rounded-xl bg-sky-300 px-3 text-xs font-black text-slate-950 disabled:opacity-50"
                    >
                        {verbalReady ? 'بدأت الشرح — الخصم بيخمّن' : 'ابدأ الوصف'}
                    </button>
                </section>
            )}

            {online && card && (
                <section className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <div className="mb-2 flex items-center justify-between text-[10px] font-black text-white/45">
                        <span>آخر وصف وصل للخمّان</span>
                        <span>محاولات الخمّان: {attempts}/3</span>
                    </div>
                    <p className="min-h-6 text-right text-sm font-bold text-white/85" dir="auto">{clue || 'اكتب وصفًا آمنًا ثم أرسله.'}</p>
                </section>
            )}

            {(notice || localError) && (
                <p role="alert" className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-center text-xs font-black text-amber-100">
                    {localError || notice}
                </p>
            )}

            {online && card && (
                <div className="mt-3">
                    <textarea
                        value={draft}
                        onChange={(event) => { setDraft(event.target.value); setLocalError(''); }}
                        onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendClue(); } }}
                        placeholder="اكتب وصفك هنا من غير الكلمة أو الممنوعات..."
                        aria-label="اكتب وصفًا للكلمة"
                        className="glass-input min-h-24 w-full resize-y rounded-2xl px-4 py-3 text-sm font-bold leading-6"
                        dir="auto"
                        maxLength={220}
                        disabled={disabled}
                    />
                    <button type="button" onClick={sendClue} disabled={disabled || !draft.trim()} className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-black text-slate-950 transition active:scale-[0.98] disabled:opacity-40">
                        <Send size={16} /> ابعت الوصف
                    </button>
                </div>
            )}

            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-slate-950/90 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 backdrop-blur-xl">
            <div className={`mx-auto grid w-full max-w-lg gap-2 ${verbal ? 'grid-cols-2' : online ? 'grid-cols-1' : 'grid-cols-3'}`}>
                    {!online && <button type="button" onClick={() => onResolve('correct')} disabled={disabled || !card} className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-2 text-xs font-black text-slate-950 transition active:scale-95 disabled:opacity-35">
                        <Check size={16} /> صح · +1
                    </button>}
                    <button type="button" onClick={() => onResolve('skipped')} disabled={disabled || !card || skipsLeft <= 0} className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-amber-300/30 bg-amber-400/10 px-2 text-xs font-black text-amber-100 transition active:scale-95 disabled:opacity-35">
                        <SkipForward size={16} /> تخطي
                    </button>
                    {!online && !verbal && <button type="button" onClick={() => onResolve('forbidden')} disabled={disabled || !card} className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-rose-300/30 bg-rose-500/15 px-2 text-[10px] font-black text-rose-100 transition active:scale-95 disabled:opacity-35 sm:text-xs">
                        <Ban size={16} /> ممنوعة · −1
                    </button>}
                </div>
            </div>
        </main>
    );
}
