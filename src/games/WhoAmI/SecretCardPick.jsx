import React, { useEffect, useState } from 'react';
import CardPortrait from './CardPortrait';

export default function SecretCardPick({ pack, onSelect, selectedIds = [], chooseCount = 1, allowOneOrTwo = false, isReady = false, oppSecretReady, opponentSecretCount = 1 }) {
    const [draftIds, setDraftIds] = useState(selectedIds);
    const selectionLimit = allowOneOrTwo ? 2 : chooseCount;
    const validDraft = allowOneOrTwo ? draftIds.length >= 1 && draftIds.length <= 2 : draftIds.length === chooseCount;

    useEffect(() => {
        if (!isReady) setDraftIds(selectedIds);
    }, [selectedIds, isReady]);

    const toggleCard = (cardId) => {
        setDraftIds(current => {
            if (current.includes(cardId)) return current.filter(id => id !== cardId);
            if (current.length >= selectionLimit) return [...current.slice(1), cardId];
            return [...current, cardId];
        });
    };

    if (isReady) {
        return (
            <div className="flex flex-col items-center justify-center flex-1 p-6 animate-fade-in text-center">
                <div className="text-6xl mb-6">🤫</div>
                <h2 className="text-2xl font-black text-white drop-shadow-md mb-2">اختيارك السري محفوظ</h2>
                <p className="text-white/70 text-sm">{selectedIds.length === 1 ? 'اخترت بطاقة سرية واحدة.' : 'اخترت بطاقتين سريتين.'}</p>
                <p className="mt-2 text-xs text-white/45">تم حفظ اختيارك. في انتظار اختيار الخصم…</p>
                {oppSecretReady && <p className="font-bold mt-4 animate-pulse" style={{ color: 'var(--accent)' }}>الخصم اختار {opponentSecretCount === 1 ? 'كارتًا واحدًا' : 'كارتين'}!</p>}
            </div>
        );
    }

    if (!pack) return null;

    return (
        <div className="flex flex-col flex-1 p-4 w-full max-w-7xl mx-auto overflow-hidden">
            <div className="text-center mb-4">
                <h2 className="text-2xl font-black text-white drop-shadow-md">اختار بطاقتك السرية 🕵️</h2>
                <p className="text-white/60 text-sm mt-1">
                    {allowOneOrTwo ? 'اختار كارت واحد أو كارتين، وبعدها أكّد اختيارك.' : 'اختار كارتًا واحدًا، ثم أكّد اختيارك.'}
                </p>
            </div>

            <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3 max-w-6xl mx-auto w-full">
                    {pack.cards.map(card => {
                        const selectedOrder = draftIds.indexOf(card.id);
                        const selected = selectedOrder !== -1;
                        return (
                            <button
                                key={card.id}
                                onClick={() => toggleCard(card.id)}
                                aria-pressed={selected}
                                aria-label={selected ? `البطاقة ${selectedOrder + 1} المحددة: ${card.name}` : `اختر ${card.name}`}
                                className={`rounded-2xl transition-all flex flex-col items-stretch justify-start relative overflow-hidden group border bg-black/85 ${selected ? 'z-[1] scale-[1.02] ring-4 ring-[var(--accent)] shadow-2xl' : 'border-white/15 shadow-lg'} hover:-translate-y-1 active:scale-95`}
                                style={selected ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 2px var(--accent), 0 0 24px color-mix(in srgb, var(--accent) 55%, transparent)' } : undefined}
                            >
                                <CardPortrait pack={pack} card={card} className="relative w-full aspect-[3/2] shrink-0 transition-transform duration-300 group-hover:scale-[1.03]" />
                                <div className={`relative z-[1] flex min-h-9 w-full shrink-0 items-center justify-center px-1.5 py-1 text-center text-[10px] sm:text-[11px] font-black leading-tight ${selected ? 'bg-[var(--accent)] text-[var(--bg-base)]' : 'bg-black/85 text-white'}`}>
                                    {selected ? `✓ ${selectedOrder + 1} · ${card.name}` : card.name}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex w-full max-w-md items-center gap-3 border-t border-white/10 pt-3">
                <span className="flex-1 text-sm font-bold text-white/60">
                    {allowOneOrTwo ? `البطاقات المختارة: ${draftIds.length} من 2` : `البطاقة المختارة: ${draftIds.length}/${chooseCount}`}
                </span>
                <button
                    onClick={() => onSelect(draftIds)}
                    disabled={!validDraft}
                    className="rounded-2xl px-5 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-35"
                    style={{ background: 'var(--accent)', color: 'var(--bg-base)' }}
                >
                    {allowOneOrTwo ? `تأكيد ${draftIds.length === 1 ? 'كارت واحد' : 'كارتين'}` : 'تأكيد الاختيار'}
                </button>
            </div>
        </div>
    );
}
