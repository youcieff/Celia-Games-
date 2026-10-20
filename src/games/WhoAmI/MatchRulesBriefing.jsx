import React from 'react';
import Check from 'lucide-react/dist/esm/icons/check';
import Hourglass from 'lucide-react/dist/esm/icons/hourglass';
import { MATCH_CONDITIONS, getMatchCondition } from './matchConditions';

export default function MatchRulesBriefing({
    gameMode,
    isHost,
    selectedConditionId,
    isReady,
    opponentReady,
    opponentSecretCount = 1,
    mySecretCount = 1,
    onSelectCondition,
    onReady
}) {
    const freeMode = gameMode === 'free';
    const selectedCondition = getMatchCondition(selectedConditionId);
    const canAcknowledge = freeMode || Boolean(selectedCondition);

    return (
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center overflow-y-auto px-4 py-5">
            <section className="glass-card rounded-3xl border border-[var(--accent)]/25 p-5 shadow-[0_0_30px_var(--accent-soft)] sm:p-6">
                <div className="text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                        {freeMode ? <Check size={25} /> : <Hourglass size={25} />}
                    </div>
                    <p className="text-[10px] font-black tracking-wide text-[var(--accent)]">قبل بداية الجولة</p>
                    <h1 className="mt-1 text-2xl font-black text-white">
                        {freeMode ? 'المود الحر' : 'اختاروا شرط المباراة'}
                    </h1>
                    <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-white/65">
                        {freeMode
                            ? `كل لاعب يختار كارتًا واحدًا أو كارتين. اختيارك ${mySecretCount === 1 ? 'كارت واحد' : 'كارتين'}، والمطلوب تكتشف ${opponentSecretCount === 1 ? 'كارت الخصم' : 'كارتَي الخصم'}. المود الحر بدون شروط إضافية.`
                            : 'المباراة لها شرط إضافي واحد فقط. المضيف يختار شرطًا واحدًا، وهو وحده اللي يتطبق طول الجولة؛ باقي الشروط لا تعمل.'}
                    </p>
                </div>

                {freeMode ? (
                    <div className="mt-5 rounded-2xl border border-sky-300/20 bg-sky-400/[0.07] p-4 text-center">
                        <p className="text-sm font-black text-sky-100">حجر ورقة مقص يحدد مين يبدأ</p>
                        <p className="mt-1 text-xs leading-5 text-white/55">بعد اختيار شخصية الخصم، كل إجابة لأ تنقل الدور. التخمين الخطأ يقفل البطاقة وينقل الدور.</p>
                    </div>
                ) : (
                    <div className="mt-5">
                        {isHost ? (
                            <div className="grid gap-2 sm:grid-cols-2">
                                {MATCH_CONDITIONS.map(condition => {
                                    const selected = selectedConditionId === condition.id;
                                    return (
                                        <button
                                            key={condition.id}
                                            type="button"
                                            onClick={() => onSelectCondition?.(condition.id)}
                                            aria-pressed={selected}
                                            className={`rounded-2xl border p-3 text-right transition ${selected ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-[0_0_16px_var(--accent-soft)]' : 'border-white/10 bg-black/15 hover:border-white/25 hover:bg-white/5'}`}
                                        >
                                            <span className="flex items-center justify-between gap-2">
                                                <span className="text-sm font-black text-white">{condition.title}</span>
                                                {selected && <Check size={17} className="shrink-0 text-[var(--accent)]" />}
                                            </span>
                                            <span className="mt-1 block text-xs leading-5 text-white/60">{condition.description}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : selectedCondition ? (
                            <div className="rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] p-4 text-center">
                                <p className="text-[10px] font-black text-white/55">الشرط الوحيد في الجولة</p>
                                <p className="mt-1 text-lg font-black text-white">{selectedCondition.title}</p>
                                <p className="mt-1 text-sm leading-6 text-white/65">{selectedCondition.description}</p>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-white/10 bg-black/15 p-4 text-center text-sm font-bold text-white/60">
                                في انتظار المضيف يختار شرطًا واحدًا...
                            </div>
                        )}
                        <div className="mt-3 rounded-2xl border border-sky-300/20 bg-sky-400/[0.06] p-3 text-center">
                            <p className="text-sm font-black text-sky-100">حجر ورقة مقص ثابت في كل المودات</p>
                            <p className="mt-1 text-xs text-white/55">الفائز يبدأ بالسؤال. لو حصل تعادل، تلعبوا مرة ثانية.</p>
                        </div>
                    </div>
                )}

                <button
                    type="button"
                    onClick={onReady}
                    disabled={isReady || !canAcknowledge}
                    className="glow-button mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black disabled:cursor-default disabled:opacity-65"
                >
                    {isReady ? <><Hourglass size={16} /> تم التأكيد، في انتظار الخصم</> : 'تمام، جاهز لحجر ورقة مقص'}
                </button>
                {opponentReady && !isReady && (
                    <p className="mt-2 text-center text-xs font-bold text-emerald-300">الخصم أكد اختياره وجاهز.</p>
                )}
                {isReady && opponentReady && (
                    <p className="mt-2 text-center text-xs font-bold text-emerald-300">كلكم جاهزين؛ نبدأ حجر ورقة مقص الآن.</p>
                )}
            </section>
        </main>
    );
}
