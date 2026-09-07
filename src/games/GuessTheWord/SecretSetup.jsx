import React, { useState } from 'react';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import Play from 'lucide-react/dist/esm/icons/play';

export default function SecretSetup({ onStart }) {
    const [secretWord, setSecretWord] = useState('');
    const [hint, setHint] = useState('');
    const [isHidden, setIsHidden] = useState(false);
    const [error, setError] = useState('');

    const handleStart = () => {
        const word = secretWord.trim();
        if (!word) { setError('لازم تكتب كلمة سرية الأول!'); return; }
        // Accept Arabic OR English letters (and spaces)
        if (!/^[\u0600-\u06FFa-zA-Z\s]+$/.test(word)) {
            setError('الكلمة لازم تكون حروف عربية أو إنجليزية فقط!');
            return;
        }
        setError('');
        onStart(word.toLowerCase(), hint);
    };

    return (
        <div className="glass-card rounded-3xl p-6 w-full max-w-sm">
            <h2 className="text-2xl font-black mb-1 text-center">اللاعب الأول 🤫</h2>
            <p className="opacity-50 text-sm text-center mb-6">اكتب الكلمة السرية ثم سلّم الموبايل</p>
            <p className="opacity-40 text-[11px] text-center mb-4">✅ تقبل كلمات عربي وإنجليزي</p>

            <div className="space-y-4">
                <div className="relative">
                    <input
                        type={isHidden ? 'password' : 'text'}
                        value={secretWord}
                        onChange={(e) => setSecretWord(e.target.value)}
                        placeholder="الكلمة السرية..."
                        className="glass-input w-full rounded-2xl px-5 py-4 pr-14 text-center text-xl font-black"
                        dir="auto"
                    />
                    <button
                        onClick={() => setIsHidden(!isHidden)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-80 transition-opacity p-1"
                    >
                        {isHidden ? <EyeOff size={22} /> : <Eye size={22} />}
                    </button>
                </div>

                <input
                    type="text"
                    value={hint}
                    onChange={(e) => setHint(e.target.value)}
                    placeholder="تلميح اختياري..."
                    className="glass-input w-full rounded-2xl px-5 py-4 text-center"
                    dir="auto"
                />

                {error && (
                    <p className="text-red-400 text-sm font-bold text-center animate-wiggle">{error}</p>
                )}
            </div>

            <button
                onClick={handleStart}
                className="glow-button w-full h-14 rounded-2xl text-lg font-black flex items-center justify-center gap-2 mt-6"
            >
                <Play size={22} /> ابدأ اللعبة
            </button>
        </div>
    );
}
