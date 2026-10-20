import React from 'react';
import { RULE_CARDS } from './ruleCards';

export default function RuleCardReveal({ isHost, ruleId, onRollRule, onConfirm, hasRolled, canReroll, isRerolling }) {
    
    // Guest view
    if (!isHost && !ruleId) {
        return (
            <div className="flex flex-col items-center justify-center flex-1 p-6 animate-fade-in text-center">
                <div className="text-6xl mb-6 animate-spin-slow">⏳</div>
                <h2 className="text-2xl font-black text-white drop-shadow-md mb-2">في انتظار الهوست...</h2>
                <p className="text-white/60 text-sm">الهوست بيحدد شروط اللعبة</p>
            </div>
        );
    }

    const rule = ruleId ? RULE_CARDS.find(r => r.id === ruleId) : null;

    return (
        <div className="flex flex-col items-center flex-1 p-4 w-full max-w-md mx-auto justify-center min-h-[400px]">
            <h2 className="text-2xl font-black text-white drop-shadow-md mb-8 text-center">شروط اللعبة 📜</h2>
            
            {ruleId && rule ? (
                <div className={`w-full border-2 rounded-[24px] p-6 mb-8 text-center animate-pop-in relative overflow-hidden transition-all duration-500
                    ${rule.isFree ? 'shadow-[0_0_20px_rgba(52,211,153,0.3)]' : 'shadow-[0_0_30px_var(--accent-glow)]'}`}
                     style={{ 
                         background: 'var(--glass-bg)', 
                         borderColor: rule.isFree ? 'rgba(52,211,153,0.5)' : 'var(--accent)' 
                     }}>
                    {/* Decorative element */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                    
                    <div className="text-5xl mb-4 relative z-10">{rule.isFree ? '🕊️' : '⚖️'}</div>
                    <p className="text-white font-bold text-xl leading-relaxed relative z-10">
                        {rule.text}
                    </p>
                </div>
            ) : (
                <div className="w-full border border-dashed rounded-[24px] p-10 mb-8 flex items-center justify-center transition-all duration-300"
                     style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
                    <span className="opacity-50 font-bold" style={{ color: 'var(--text-color)' }}>مفيش شرط اتحدد لسه</span>
                </div>
            )}

            {isHost && (
                <div className="w-full flex flex-col gap-3">
                    {!hasRolled ? (
                        <button
                            onClick={onRollRule}
                            className="w-full py-4 rounded-2xl bg-[var(--accent)] text-white font-black text-lg transition-transform hover:scale-105 active:scale-95 shadow-[0_0_20px_var(--accent-glow)]"
                        >
                            اسحب شرط عشوائي 🎲
                        </button>
                    ) : (
                        <>
                            {canReroll && (
                                <button
                                    onClick={onRollRule}
                                    disabled={isRerolling}
                                    className="w-full py-3 rounded-2xl font-bold transition-all border hover:scale-105 active:scale-95"
                                    style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-color)' }}
                                >
                                    {isRerolling ? 'بيسحب...' : 'غيّر الشرط (اتلعب قبل كده) 🔄'}
                                </button>
                            )}
                            <button
                                onClick={onConfirm}
                                className="w-full py-4 rounded-2xl font-black text-lg transition-transform hover:scale-105 active:scale-95 shadow-[0_0_20px_var(--accent-glow)] text-[var(--bg-base)]"
                                style={{ background: 'var(--accent)' }}
                            >
                                يلا نبدأ 🚀
                            </button>
                        </>
                    )}
                    {!hasRolled && (
                        <button
                            onClick={onConfirm}
                            className="w-full py-3 rounded-2xl font-bold transition-all mt-2 hover:scale-105 active:scale-95"
                            style={{ background: 'var(--glass-bg)', color: 'var(--text-color)' }}
                        >
                            العب بدون شرط
                        </button>
                    )}
                </div>
            )}
            
            {!isHost && ruleId && (
                <div className="text-center animate-pulse">
                    <p className="text-white/60">الهوست بيقرر يبدأ ولا يغير الشرط...</p>
                </div>
            )}
        </div>
    );
}
