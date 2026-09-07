import React from 'react';
import ThemeToggle from './ThemeToggle';
import Logo from './Logo';
import Gamepad2 from 'lucide-react/dist/esm/icons/gamepad-2';
import Brain from 'lucide-react/dist/esm/icons/brain';

export default function Hub({ setView }) {
    return (
        <>
            {/* Animated Background */}
            <div className="animated-bg"><div className="bg-orb-3"></div></div>

            <div className="min-h-dvh flex flex-col items-center px-5 pt-safe safe-area-pt">
                {/* Header */}
                <header className="w-full max-w-md flex justify-between items-center py-5">
                    <Logo />
                    <ThemeToggle />
                </header>

                {/* Tagline */}
                <div className="text-center mb-8 mt-2">
                    <p className="opacity-60 text-sm font-medium">اختار اللعبة وابدأ التحدي 🏆</p>
                </div>

                {/* Games */}
                <main className="w-full max-w-md flex flex-col gap-5 flex-1">

                    {/* Guess The Code */}
                    <button
                        onClick={() => setView('code-game')}
                        className="glass-card glass-card-hover rounded-3xl p-6 text-right w-full"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-14 h-14 rounded-2xl glass-card flex items-center justify-center shrink-0" style={{ boxShadow: '0 0 20px var(--primary-glow)' }}>
                                <Gamepad2 className="w-7 h-7" style={{ color: 'var(--primary-color)' }} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black mb-0.5">خمن الكود</h3>
                                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                                    ● أونلاين — جهازين
                                </span>
                            </div>
                        </div>
                        <p className="text-sm opacity-60 leading-relaxed">
                            كل لاعب يحط كود سري، وتتحدوا في التخمين مع ردود فعل ملونة فورية.
                        </p>
                    </button>

                    {/* Guess The Word */}
                    <div className="glass-card rounded-3xl p-6 text-right w-full">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-14 h-14 rounded-2xl glass-card flex items-center justify-center shrink-0" style={{ boxShadow: '0 0 20px var(--primary-glow)' }}>
                                <Brain className="w-7 h-7" style={{ color: 'var(--accent-color)' }} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black mb-0.5">خمن الكلمة</h3>
                                <span className="text-xs font-bold opacity-60">اختار طريقة اللعب</span>
                            </div>
                        </div>
                        <p className="text-sm opacity-60 leading-relaxed mb-5">
                            اللاعب الأول يكتب كلمة سرية، والتاني يحاول يخمنها قبل ما الفرص تخلص.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setView('word-game-local')}
                                className="glass-card glass-card-hover rounded-2xl py-3 px-4 flex flex-col items-center gap-1"
                            >
                                <span className="text-lg">📱</span>
                                <span className="text-sm font-black">أوفلاين</span>
                                <span className="text-[11px] opacity-50">جهاز واحد</span>
                            </button>
                            <button
                                onClick={() => setView('word-game-online')}
                                className="glass-card glass-card-hover rounded-2xl py-3 px-4 flex flex-col items-center gap-1"
                            >
                                <span className="text-lg">🌐</span>
                                <span className="text-sm font-black">أونلاين</span>
                                <span className="text-[11px] opacity-50">جهازين</span>
                            </button>
                        </div>
                    </div>

                    {/* Grid for XOs */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Classic XO */}
                        <button
                            onClick={() => setView('xo-game')}
                            className="glass-card glass-card-hover rounded-3xl p-5 text-center flex flex-col items-center"
                        >
                            <div className="text-4xl font-black mb-3">
                                <span className="text-emerald-400">X</span>
                                <span className="text-pink-400">O</span>
                            </div>
                            <h3 className="text-xl font-black mb-1">إكس أو</h3>
                            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">أونلاين</span>
                        </button>

                        {/* Big XO */}
                        <button
                            onClick={() => setView('big-xo-game')}
                            className="glass-card glass-card-hover rounded-3xl p-5 text-center flex flex-col items-center"
                        >
                            <div className="text-4xl font-black mb-3 grid grid-cols-3 gap-0.5 leading-none">
                                {[...Array(9)].map((_, i) => <div key={i} className="w-2 h-2 rounded-sm bg-[var(--primary-color)]"></div>)}
                            </div>
                            <h3 className="text-xl font-black mb-1">Big XO</h3>
                            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">أونلاين</span>
                        </button>
                    </div>

                    {/* Additional Games Grid */}
                    <div className="mt-4">
                        <button
                            onClick={() => setView('connect-4')}
                            className="glass-card glass-card-hover rounded-3xl p-5 text-center w-full flex flex-col items-center"
                        >
                            <div className="flex gap-1 mb-3">
                                <div className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                                <div className="w-4 h-4 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]"></div>
                                <div className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                                <div className="w-4 h-4 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]"></div>
                            </div>
                            <h3 className="text-xl font-black mb-1">Connect 4</h3>
                            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">أربعة في الرص - أونلاين</span>
                        </button>
                    </div>

                    {/* Memory Match Game */}
                    <div className="mt-4">
                        <button
                            onClick={() => setView('memory-game')}
                            className="glass-card glass-card-hover rounded-3xl p-5 text-center w-full flex flex-col items-center"
                        >
                            <div className="grid grid-cols-2 gap-1.5 mb-3">
                                <div className="w-5 h-6 rounded-md bg-[var(--primary-color)] flex items-center justify-center opacity-80 shadow-[0_0_8px_var(--primary-glow)]">🃏</div>
                                <div className="w-5 h-6 rounded-md bg-white/10 flex items-center justify-center border border-white/20"></div>
                                <div className="w-5 h-6 rounded-md bg-white/10 flex items-center justify-center border border-white/20"></div>
                                <div className="w-5 h-6 rounded-md bg-[var(--primary-color)] flex items-center justify-center opacity-80 shadow-[0_0_8px_var(--primary-glow)]">🃏</div>
                            </div>
                            <h3 className="text-xl font-black mb-1">Memory Match</h3>
                            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">لعبة الذاكرة - أونلاين</span>
                        </button>
                    </div>

                    {/* Dots and Boxes Game */}
                    <div className="mt-4">
                        <button
                            onClick={() => setView('dots-boxes')}
                            className="glass-card glass-card-hover rounded-3xl p-5 text-center w-full flex flex-col items-center"
                        >
                            <div className="grid grid-cols-2 gap-1 mb-3">
                                <div className="w-5 h-5 rounded-[4px] border-2 border-[var(--primary-color)] shadow-[0_0_8px_var(--primary-glow)] bg-[var(--primary-color)]/20"></div>
                                <div className="w-5 h-5 rounded-[4px] border-2 border-white/20"></div>
                                <div className="w-5 h-5 rounded-[4px] border-2 border-white/20"></div>
                                <div className="w-5 h-5 rounded-[4px] border-2 border-[var(--accent-color)] shadow-[0_0_8px_var(--primary-glow)] bg-[var(--accent-color)]/20"></div>
                            </div>
                            <h3 className="text-xl font-black mb-1">Dots & Boxes</h3>
                            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">أكمل المربع - أونلاين</span>
                        </button>
                    </div>

                    {/* Sea Battle Game */}
                    <div className="mt-4">
                        <button
                            onClick={() => setView('sea-battle')}
                            className="glass-card glass-card-hover rounded-3xl p-5 text-center w-full flex flex-col items-center"
                        >
                            <div className="flex gap-2 mb-3">
                                <div className="w-6 h-6 rounded-md bg-blue-500/20 border border-blue-400/50 shadow-[0_0_8px_rgba(59,130,246,0.6)] flex items-center justify-center">🚢</div>
                                <div className="w-6 h-6 rounded-md bg-rose-500/20 border border-rose-400/50 shadow-[0_0_10px_rgba(244,63,94,0.8)] flex items-center justify-center">💥</div>
                            </div>
                            <h3 className="text-xl font-black mb-1">Sea Battle</h3>
                            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">حرب السفن - أونلاين</span>
                        </button>
                    </div>

                </main>

                <footer className="py-6 opacity-30 text-xs font-semibold">
                    ألعاب سيليا — صُنع بكل ❤️
                </footer>
            </div>
        </>
    );
}
