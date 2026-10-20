import React from 'react';
import CardPortrait from './CardPortrait';

export default function CardBoard({ pack, closedCards, onToggleCard, myTurn }) {
    const isPeoplePack = pack?.scope === 'people';

    return (
        <div className="min-h-0 min-w-0 flex-1 w-full touch-pan-y overscroll-y-contain overflow-y-auto custom-scrollbar px-2 py-1.5">
            {isPeoplePack && (
                <div className="mx-auto mb-2 flex max-w-4xl items-center justify-center gap-2 text-[10px] font-black sm:gap-3 sm:text-xs">
                    <span className="flex items-center gap-1.5 rounded-full border border-sky-300/20 bg-sky-400/10 px-2.5 py-1 text-sky-200">
                        <span className="h-2 w-2 rounded-sm bg-sky-400" /> الأولاد
                    </span>
                    <span className="flex items-center gap-1.5 rounded-full border border-pink-300/20 bg-pink-400/10 px-2.5 py-1 text-pink-200">
                        <span className="h-2 w-2 rounded-sm bg-pink-400" /> البنات
                    </span>
                    <span className="hidden text-white/40 sm:inline">اضغط البطاقة لتقليبها</span>
                </div>
            )}

            <div
                className={`mx-auto max-w-6xl rounded-[1.2rem] border p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.25)] sm:rounded-[1.6rem] sm:p-2.5 ${
                    isPeoplePack ? 'border-sky-300/20' : 'border-white/10'
                }`}
                style={{
                    background: isPeoplePack
                        ? 'linear-gradient(135deg, rgba(56,189,248,0.10), rgba(113,62,151,0.18) 48%, rgba(244,114,182,0.10))'
                        : 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))'
                }}
            >
            <div className="grid grid-cols-3 gap-2 min-[480px]:grid-cols-4 sm:gap-2.5 md:grid-cols-5 lg:grid-cols-6 lg:gap-3">
                {pack.cards.map(card => {
                    const isClosed = closedCards.has(card.id);
                    const isGirl = card.attrs?.gender === 'female';
                    const cardAspect = isPeoplePack ? 'aspect-[4/5]' : 'aspect-square';
                    const tileColor = isPeoplePack
                        ? (isGirl ? '#f472b6' : '#38bdf8')
                        : pack.scope === 'animals' ? '#86efac' : '#fbbf24';

                    return (
                        <button
                            key={card.id}
                            onClick={() => onToggleCard(card.id)}
                            disabled={!myTurn}
                            aria-pressed={isClosed}
                            aria-label={`${card.name}${isClosed ? '، مستبعدة' : ''}`}
                            title={isClosed ? `إظهار ${card.name} مرة أخرى` : `استبعاد ${card.name}`}
                            className={`relative isolate ${cardAspect} w-full overflow-hidden rounded-[1rem] transition-[box-shadow,transform] duration-300 [perspective:900px]
                                ${myTurn ? 'cursor-pointer hover:-translate-y-0.5 active:scale-[0.98]' : 'cursor-default'}
                                ${isClosed ? 'shadow-inner' : 'shadow-lg hover:shadow-xl'}`}
                            style={{
                                background: `${tileColor}20`,
                                border: `1px solid ${tileColor}70`,
                                boxShadow: isClosed ? `inset 0 0 18px ${tileColor}22` : `0 8px 20px ${tileColor}15`
                            }}
                        >
                            <div
                                className="absolute inset-1 flex flex-col overflow-hidden rounded-[0.75rem]"
                                style={{
                                    background: `linear-gradient(160deg, ${tileColor}25, rgba(14,5,24,0.95) 52%, ${tileColor}20)`,
                                    opacity: isClosed ? 1 : 0,
                                    transition: 'opacity 180ms ease 260ms'
                                }}
                            >
                                <div className="flex flex-1 items-center justify-center text-3xl font-black" style={{ color: tileColor }}>×</div>
                                <span className="pb-3 text-center text-[9px] font-black" style={{ color: `${tileColor}cc` }}>مستبعدة</span>
                            </div>

                            <div
                                className="absolute inset-1 flex flex-col overflow-hidden rounded-[0.75rem] border-2 bg-slate-950/80"
                                style={{
                                    borderColor: tileColor,
                                    transform: isClosed ? 'rotateX(76deg)' : 'rotateX(0deg)',
                                    transformOrigin: 'top center',
                                    backfaceVisibility: 'hidden',
                                    opacity: isClosed ? 0.55 : 1,
                                    transition: 'transform 520ms cubic-bezier(0.2, 0.75, 0.25, 1), opacity 300ms ease'
                                }}
                            >
                                <CardPortrait pack={pack} card={card} fit={isPeoplePack ? 'cover' : 'contain'} className="relative min-h-0 w-full flex-1" />
                                <div
                                    className="flex min-h-8 w-full shrink-0 items-center justify-center px-1 py-1 text-center text-[11px] font-black leading-tight sm:text-xs"
                                    style={{ background: `linear-gradient(90deg, ${tileColor}35, rgba(8,4,15,0.98))`, color: '#fff' }}
                                >
                                    {card.name}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
            </div>
        </div>
    );
}
