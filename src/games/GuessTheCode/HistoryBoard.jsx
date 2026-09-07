import React from 'react';

export default function HistoryBoard({ guesses }) {
    return (
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 px-1 min-h-0" dir="ltr">
            {guesses.length === 0 && (
                <div className="h-full flex items-center justify-center opacity-30 font-bold py-10">
                    لسه مفيش محاولات...
                </div>
            )}

            {guesses.map((guessObj, i) => (
                <div key={i} className="history-row flex justify-between items-center animate-pop-in">
                    <span className="font-bold text-xs opacity-40 px-2 tabular-nums">#{String(i + 1).padStart(2, '0')}</span>
                    <div className="flex gap-2">
                        {guessObj.code.map((digit, idx) => {
                            const color = guessObj.result[idx];
                            const bgClass = color === 'green'
                                ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]'
                                : color === 'yellow'
                                    ? 'bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.5)]'
                                    : 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]';

                            return (
                                <div key={idx} className={`w-12 h-14 flex items-center justify-center text-xl font-black rounded-xl text-white ${bgClass} transition-all duration-300`}>
                                    {digit}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
