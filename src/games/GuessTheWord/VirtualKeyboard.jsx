import React, { useState } from 'react';

const ARABIC_LETTERS = [
    'ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'د',
    'ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط', 'ذ',
    'ئ', 'ء', 'ؤ', 'ر', 'لا', 'ى', 'ة', 'و', 'ز', 'ظ'
];

const ENGLISH_ROWS = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

export default function VirtualKeyboard({ onLetterPress, guessedLetters, disabled }) {
    const [lang, setLang] = useState('ar');

    return (
        <div className="pb-4 w-full px-1 safe-area-pb">
            {/* Language toggle */}
            <div className="flex justify-center mb-3">
                <div className="glass-card rounded-full p-1 flex gap-1">
                    <button
                        onClick={() => setLang('ar')}
                        className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${lang === 'ar' ? 'bg-[var(--primary-color)] text-white shadow-[0_0_10px_var(--primary-glow)]' : 'opacity-50'}`}
                    >
                        عربي
                    </button>
                    <button
                        onClick={() => setLang('en')}
                        className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${lang === 'en' ? 'bg-[var(--primary-color)] text-white shadow-[0_0_10px_var(--primary-glow)]' : 'opacity-50'}`}
                    >
                        English
                    </button>
                </div>
            </div>

            {/* Arabic layout */}
            {lang === 'ar' && (
                <div className="flex flex-wrap justify-center gap-[6px]">
                    {ARABIC_LETTERS.map(letter => {
                        const isGuessed = guessedLetters.includes(letter);
                        return (
                            <button
                                key={letter}
                                disabled={isGuessed || disabled}
                                onClick={() => onLetterPress(letter)}
                                className="key-btn w-[38px] h-[44px] text-base rounded-xl"
                            >
                                {letter}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* English layout */}
            {lang === 'en' && (
                <div className="flex flex-col gap-1.5 items-center">
                    {ENGLISH_ROWS.map((row, ri) => (
                        <div key={ri} className="flex gap-1.5">
                            {row.map(letter => {
                                const isGuessed = guessedLetters.includes(letter);
                                return (
                                    <button
                                        key={letter}
                                        disabled={isGuessed || disabled}
                                        onClick={() => onLetterPress(letter)}
                                        className="key-btn w-[34px] h-[44px] text-sm uppercase rounded-xl"
                                    >
                                        {letter.toUpperCase()}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
