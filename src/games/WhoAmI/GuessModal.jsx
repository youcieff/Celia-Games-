import React, { useState } from 'react';
import Target from 'lucide-react/dist/esm/icons/target';
import CardPortrait from './CardPortrait';

export default function GuessModal({ pack, closedCards, onGuess, onClose }) {
    const [selectedId, setSelectedId] = useState(null);
    
    // Only show cards that are NOT closed
    const availableCards = pack.cards.filter(c => !closedCards.has(c.id));

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-lg flex items-center justify-center p-4 animate-fade-in">
            <div className="glass-card border rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
                 style={{ background: 'var(--bg-mid)', borderColor: 'var(--glass-border)' }}>
                <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--glass-border)' }}>
                    <h3 className="flex items-center gap-2 text-xl font-black text-white"><Target size={21} className="text-[var(--accent)]" /> خمن الكارت</h3>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                        style={{ background: 'var(--glass-bg)' }}
                    >
                        ✕
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3 max-w-6xl mx-auto w-full">
                        {availableCards.map(card => (
                            <div
                                key={card.id}
                                className={`relative rounded-2xl transition-all flex flex-col items-stretch justify-start overflow-hidden group bg-black/85
                                    ${selectedId === card.id 
                                        ? 'scale-105 shadow-[0_0_15px_var(--accent-glow)]' 
                                        : 'hover:scale-105'}`}
                                style={{
                                    border: `1px solid ${selectedId === card.id ? 'var(--accent)' : 'var(--glass-border)'}`
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setSelectedId(card.id)}
                                    aria-pressed={selectedId === card.id}
                                    aria-label={`اختيار ${card.name} للتخمين`}
                                    className="flex w-full flex-col items-stretch justify-start text-right"
                                >
                                    <CardPortrait pack={pack} card={card} className="relative w-full aspect-[3/2] shrink-0 transition-transform duration-300 group-hover:scale-[1.03]" />
                                    <div className={`relative z-[1] flex min-h-8 w-full shrink-0 items-center justify-center px-1.5 py-1 text-center text-[10px] sm:text-[11px] font-black leading-tight transition-colors duration-300 bg-black/85
                                        ${selectedId === card.id ? 'text-[var(--accent)]' : 'text-white'}`}>
                                        {card.name}
                                    </div>
                                </button>
                            </div>
                        ))}
                    </div>
                    {availableCards.length === 0 && (
                        <div className="text-center text-white/50 py-10">
                            مفيش كروت مفتوحة عشان تخمنها!
                        </div>
                    )}
                </div>
                
                <div className="p-4 border-t" style={{ borderColor: 'var(--glass-border)', background: 'var(--bg-base)' }}>
                    <button
                        onClick={() => {
                            if (selectedId) onGuess(selectedId);
                        }}
                        disabled={!selectedId}
                        className={`w-full py-4 rounded-2xl font-black text-lg transition-transform 
                            ${selectedId 
                                ? 'hover:scale-105 active:scale-95 shadow-[0_0_20px_var(--accent-glow)] text-[var(--bg-base)]' 
                                : 'opacity-30 cursor-not-allowed text-white/50'}`}
                        style={{ background: selectedId ? 'var(--accent)' : 'var(--glass-bg)' }}
                    >
                        تأكيد التخمين
                    </button>
                    <p className="text-center text-rose-400 text-xs font-bold mt-3">
                        تخمين غلط = الكارت هيتقفل والدور هيروح للخصم!
                    </p>
                </div>
            </div>
        </div>
    );
}
