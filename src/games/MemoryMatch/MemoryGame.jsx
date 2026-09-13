import React, { useState, useEffect, useRef } from 'react';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import Logo from '../../components/Logo';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import { playSound, playHaptic } from '../../lib/audioEngine';
import EmotesOverlay from '../../components/EmotesOverlay';
import PlayerGameHeader from '../../components/PlayerGameHeader';
import ConnectionPauseOverlay from '../../components/ConnectionPauseOverlay';
import useProfile from '../../hooks/useProfile';

// Premium realistic themes with rich multi-layered visuals and dynamic changing capability
export const REALISTIC_THEMES = {
    random: {
        name: '🎲 تشكيلة متجددة دايماً',
        desc: 'تتغير الرموز والأشكال تلقائياً في كل جولة'
    },
    gems: {
        name: '💎 الكنوز والجواهر الملكية',
        desc: 'ألماس وياقوت وذهب ملكي لامع',
        cards: [
            { id: 'sapphire', symbol: '💎', title: 'ياقوت أزرق', gradient: 'from-blue-600/40 to-indigo-950/80', border: 'border-blue-400' },
            { id: 'crown', symbol: '👑', title: 'تاج الملوك', gradient: 'from-amber-500/40 to-yellow-950/80', border: 'border-amber-400' },
            { id: 'gold', symbol: '✨', title: 'سبيكة ذهب', gradient: 'from-yellow-500/40 to-amber-950/80', border: 'border-yellow-400' },
            { id: 'ring', symbol: '💍', title: 'خاتم الزمرد', gradient: 'from-emerald-500/40 to-teal-950/80', border: 'border-emerald-400' },
            { id: 'crystal', symbol: '🔮', title: 'بلورة سحرية', gradient: 'from-purple-600/40 to-fuchsia-950/80', border: 'border-purple-400' },
            { id: 'trophy', symbol: '🏆', title: 'كأس البطولة', gradient: 'from-amber-600/40 to-orange-950/80', border: 'border-amber-400' },
            { id: 'star', symbol: '⭐', title: 'نجم أسطوري', gradient: 'from-yellow-400/40 to-amber-950/80', border: 'border-yellow-400' },
            { id: 'key', symbol: '🗝️', title: 'مفتاح الكنز', gradient: 'from-orange-500/40 to-stone-950/80', border: 'border-orange-400' }
        ]
    },
    cosmos: {
        name: '🪐 رحلة الفضاء والمجرات',
        desc: 'كواكب ومركبات فضاء ثلاثية الأبعاد',
        cards: [
            { id: 'saturn', symbol: '🪐', title: 'كوكب زحل', gradient: 'from-amber-600/40 to-purple-950/80', border: 'border-amber-400' },
            { id: 'rocket', symbol: '🚀', title: 'صاروخ فضائي', gradient: 'from-rose-600/40 to-orange-950/80', border: 'border-rose-400' },
            { id: 'astronaut', symbol: '👨‍🚀', title: 'رائد فضاء', gradient: 'from-sky-600/40 to-indigo-950/80', border: 'border-sky-400' },
            { id: 'galaxy', symbol: '🌌', title: 'مجرة حلزونية', gradient: 'from-purple-700/40 to-pink-950/80', border: 'border-purple-400' },
            { id: 'comet', symbol: '☄️', title: 'نيزك مشتعل', gradient: 'from-orange-600/40 to-red-950/80', border: 'border-orange-400' },
            { id: 'ufo', symbol: '🛸', title: 'مركبة فضائية', gradient: 'from-emerald-600/40 to-teal-950/80', border: 'border-emerald-400' },
            { id: 'moon', symbol: '🌕', title: 'قمر كامل', gradient: 'from-slate-500/40 to-blue-950/80', border: 'border-slate-300' },
            { id: 'telescope', symbol: '🔭', title: 'مرصد كوني', gradient: 'from-indigo-600/40 to-slate-950/80', border: 'border-indigo-400' }
        ]
    },
    safari: {
        name: '🦁 سفاري البرية الملكية',
        desc: 'حيوانات واقعية بتفاصيل ثلاثية الأبعاد',
        cards: [
            { id: 'lion', symbol: '🦁', title: 'الأسد الذهبي', gradient: 'from-amber-600/40 to-yellow-950/80', border: 'border-amber-400' },
            { id: 'tiger', symbol: '🐯', title: 'النمر المفترس', gradient: 'from-orange-600/40 to-amber-950/80', border: 'border-orange-400' },
            { id: 'eagle', symbol: '🦅', title: 'النسر الملكي', gradient: 'from-stone-600/40 to-amber-950/80', border: 'border-stone-400' },
            { id: 'wolf', symbol: '🐺', title: 'الذئب الفضي', gradient: 'from-cyan-700/40 to-slate-950/80', border: 'border-cyan-400' },
            { id: 'dolphin', symbol: '🐬', title: 'دولفين المحيط', gradient: 'from-sky-600/40 to-blue-950/80', border: 'border-sky-400' },
            { id: 'panda', symbol: '🐼', title: 'الباندا العملاق', gradient: 'from-emerald-700/40 to-stone-950/80', border: 'border-emerald-400' },
            { id: 'fox', symbol: '🦊', title: 'الثعلب الأحمر', gradient: 'from-red-600/40 to-orange-950/80', border: 'border-red-400' },
            { id: 'owl', symbol: '🦉', title: 'بومة الحكمة', gradient: 'from-indigo-600/40 to-violet-950/80', border: 'border-indigo-400' }
        ]
    },
    gourmet: {
        name: '🍓 المذاق وفنون الطهي',
        desc: 'حلويات وفواكه استوائية شهية وجذابة',
        cards: [
            { id: 'pizza', symbol: '🍕', title: 'بيتزا إيطالية', gradient: 'from-amber-600/40 to-red-950/80', border: 'border-amber-400' },
            { id: 'burger', symbol: '🍔', title: 'برجر الشيف', gradient: 'from-orange-600/40 to-yellow-950/80', border: 'border-orange-400' },
            { id: 'sushi', symbol: '🍣', title: 'سوشي فاخر', gradient: 'from-rose-600/40 to-pink-950/80', border: 'border-rose-400' },
            { id: 'donut', symbol: '🍩', title: 'دونات الكراميل', gradient: 'from-pink-600/40 to-purple-950/80', border: 'border-pink-400' },
            { id: 'strawberry', symbol: '🍓', title: 'فراولة طازجة', gradient: 'from-red-600/40 to-rose-950/80', border: 'border-red-400' },
            { id: 'avocado', symbol: '🥑', title: 'أفوكادو صحي', gradient: 'from-lime-600/40 to-emerald-950/80', border: 'border-lime-400' },
            { id: 'pancakes', symbol: '🥞', title: 'بان كيك بالعسل', gradient: 'from-amber-500/40 to-yellow-950/80', border: 'border-amber-400' },
            { id: 'icecream', symbol: '🍦', title: 'آيس كريم مثلج', gradient: 'from-cyan-600/40 to-blue-950/80', border: 'border-cyan-400' }
        ]
    },
    mythic: {
        name: '⚡ الأساطير وقوى الطبيعة',
        desc: 'دروع وسيوف وسحر المحاربين القدامى',
        cards: [
            { id: 'lightning', symbol: '⚡', title: 'صاعقة البرق', gradient: 'from-yellow-500/40 to-amber-950/80', border: 'border-yellow-400' },
            { id: 'shield', symbol: '🛡️', title: 'درع الفايكنج', gradient: 'from-blue-600/40 to-slate-950/80', border: 'border-blue-400' },
            { id: 'sword', symbol: '⚔️', title: 'السيف الأسطوري', gradient: 'from-rose-600/40 to-stone-950/80', border: 'border-rose-400' },
            { id: 'bow', symbol: '🏹', title: 'قوس الرماية', gradient: 'from-emerald-600/40 to-teal-950/80', border: 'border-emerald-400' },
            { id: 'potion', symbol: '🧪', title: 'إكسير القوة', gradient: 'from-purple-600/40 to-indigo-950/80', border: 'border-purple-400' },
            { id: 'dragon', symbol: '🐲', title: 'التنين المجنح', gradient: 'from-emerald-600/40 to-lime-950/80', border: 'border-emerald-400' },
            { id: 'axe', symbol: '🪓', title: 'فأس المعركة', gradient: 'from-stone-600/40 to-amber-950/80', border: 'border-stone-400' },
            { id: 'feather', symbol: '🪶', title: 'ريشة العنقاء', gradient: 'from-orange-600/40 to-red-950/80', border: 'border-orange-400' }
        ]
    }
};

const THEME_KEYS = ['gems', 'cosmos', 'safari', 'gourmet', 'mythic'];

const shuffleArray = (array) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
};

const generateDeck = (themeKey) => {
    let activeKey = themeKey;
    if (activeKey === 'random' || !REALISTIC_THEMES[activeKey]) {
        activeKey = THEME_KEYS[Math.floor(Math.random() * THEME_KEYS.length)];
    }
    const cardDefs = REALISTIC_THEMES[activeKey].cards;
    const deck = [...cardDefs, ...cardDefs].map((card, idx) => ({
        id: idx,
        cardId: card.id,
        symbol: card.symbol,
        title: card.title,
        gradient: card.gradient,
        border: card.border,
        themeKey: activeKey,
        isFlipped: false,
        isMatched: false
    }));
    return { deck: shuffleArray(deck), activeKey };
};

export default function MemoryGame({ setView }) {
    const connRef = useRef(null);
    const isHostRef = useRef(false);

    const [myProfile] = useProfile();
    const [oppProfile, setOppProfile] = useState(null);

    const [gameState, setGameState] = useState('lobby'); // lobby, setup, waiting-start, playing
    const [theme, setTheme] = useState('random');
    const [activeThemeName, setActiveThemeName] = useState('');
    const [cards, setCards] = useState([]);

    // Turn & logic
    const [hostTurn, setHostTurn] = useState(true);
    const [flippedIndices, setFlippedIndices] = useState([]);
    const [scores, setScores] = useState({ host: 0, client: 0 });
    const [isProcessing, setIsProcessing] = useState(false);

    const stateRef = useRef({ cards, flippedIndices, hostTurn, isProcessing, gameState });
    useEffect(() => {
        stateRef.current = { cards, flippedIndices, hostTurn, isProcessing, gameState };
    }, [cards, flippedIndices, hostTurn, isProcessing, gameState]);

    const isHost = isHostRef.current;
    const isMyTurn = isHost ? hostTurn : !hostTurn;

    const totalPairs = cards.length / 2;
    const isGameOver = totalPairs > 0 && (scores.host + scores.client === totalPairs);

    let overallWinner = null;
    if (isGameOver) {
        if (scores.host === scores.client) overallWinner = 'draw';
        else if (scores.host > scores.client) overallWinner = isHost ? 'me' : 'opp';
        else overallWinner = isHost ? 'opp' : 'me';
    }

    const handleGameStart = (conn, hostMode, oppProf) => {
        isHostRef.current = hostMode;
        connRef.current = conn;
        if (oppProf) setOppProfile(oppProf);
        conn.on('data', onData);
        setGameState(hostMode ? 'setup' : 'waiting-start');
    };

    const onData = (msg) => {
        if (msg.type === 'start') {
            setTheme(msg.theme);
            setActiveThemeName(REALISTIC_THEMES[msg.activeKey]?.name || 'تشكيلة سينمائية');
            setCards(msg.deck);
            setHostTurn(true);
            setScores({ host: 0, client: 0 });
            setGameState('playing');
            playSound('ding');
        } else if (msg.type === 'flip') {
            applyFlip(msg.index);
        } else if (msg.type === 'restart') {
            doRestart();
        }
    };

    const handleStartGame = () => {
        const { deck, activeKey } = generateDeck(theme);
        setCards(deck);
        setActiveThemeName(REALISTIC_THEMES[activeKey]?.name || 'تشكيلة سينمائية');
        setHostTurn(true);
        setScores({ host: 0, client: 0 });
        setGameState('playing');
        playSound('ding');
        connRef.current?.send({ type: 'start', theme, activeKey, deck });
    };

    const applyFlip = (index) => {
        const cur = stateRef.current;
        const newCards = [...cur.cards];
        newCards[index] = { ...newCards[index], isFlipped: true };
        setCards(newCards);

        playSound('whoosh');
        playHaptic(15);

        const newFlipped = [...cur.flippedIndices, index];
        setFlippedIndices(newFlipped);

        if (newFlipped.length === 2) {
            setIsProcessing(true);
            const [idx1, idx2] = newFlipped;
            const match = newCards[idx1].cardId === newCards[idx2].cardId;

            setTimeout(() => {
                setFlippedIndices([]);
                setIsProcessing(false);

                if (match) {
                    playSound('match');
                    playHaptic([60, 40, 80]);

                    const matchedCards = [...newCards];
                    matchedCards[idx1].isMatched = true;
                    matchedCards[idx2].isMatched = true;
                    setCards(matchedCards);

                    const scorer = cur.hostTurn ? 'host' : 'client';
                    setScores(prev => ({
                        ...prev,
                        [scorer]: prev[scorer] + 1
                    }));

                    // If it's the AI's turn (host=false) and we're the host, signal AI to keep playing
                    if (isHostRef.current && !cur.hostTurn) {
                        connRef.current?.send({ type: 'your_turn', matchedIndices: [idx1, idx2] });
                    }
                } else {
                    const resetCards = [...newCards];
                    resetCards[idx1].isFlipped = false;
                    resetCards[idx2].isFlipped = false;
                    setCards(resetCards);

                    const newHostTurn = !cur.hostTurn;
                    setHostTurn(newHostTurn);

                    // If turn flips to guest (AI) and we are the host, signal AI to play
                    if (isHostRef.current && !newHostTurn) {
                        connRef.current?.send({ type: 'your_turn' });
                    }
                }
            }, 900);
        }
    };

    const handleCardClick = (index) => {
        const cur = stateRef.current;
        if (gameState !== 'playing' || !isMyTurn || cur.isProcessing || isGameOver) return;
        if (cur.cards[index].isFlipped || cur.cards[index].isMatched) return;

        applyFlip(index);
        connRef.current?.send({ type: 'flip', index });
    };

    const doRestart = () => {
        setCards([]);
        setScores({ host: 0, client: 0 });
        setFlippedIndices([]);
        setIsProcessing(false);
        setGameState(isHostRef.current ? 'setup' : 'waiting-start');
    };

    const handleRestart = () => {
        doRestart();
        connRef.current?.send({ type: 'restart' });
    };

    return (
        <>
            <style>{`
                .mem-scene { perspective: 1200px; }
                .mem-card-3d {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    transform-style: preserve-3d;
                    transition: transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .mem-card-3d.flipped {
                    transform: rotateY(180deg);
                }
                .mem-face {
                    position: absolute;
                    inset: 0;
                    backface-visibility: hidden;
                    border-radius: 1.25rem;
                }
                .mem-back-face {
                    transform: rotateY(180deg);
                }
                .mem-matched-pulse {
                    animation: matchGlow 1.5s infinite alternate ease-in-out;
                }
                @keyframes matchGlow {
                    0% { box-shadow: 0 0 10px rgba(52, 211, 153, 0.4); }
                    100% { box-shadow: 0 0 25px rgba(52, 211, 153, 0.9); }
                }
            `}</style>

            <div className="animated-bg"><div className="bg-orb-3" style={{ background: 'var(--accent-glow)' }} /></div>
            <div className="min-h-dvh max-w-lg mx-auto flex flex-col safe-area-pt overflow-x-hidden overflow-y-auto pb-6">

                {/* Header */}
                {gameState !== 'lobby' ? (
                    <PlayerGameHeader
                        title="تطابق الذاكرة 🃏"
                        gameEmoji="🃏"
                        isMyTurn={isMyTurn}
                        oppProfile={oppProfile}
                        myScore={isHost ? scores.host : scores.client}
                        oppScore={isHost ? scores.client : scores.host}
                        statusText={activeThemeName ? `الثيم: ${activeThemeName}` : null}
                        onLeave={() => { connRef.current?.close(); setView('hub'); }}
                    />
                ) : (
                    <div className="px-4 flex justify-between items-center py-4 mb-2">
                        <Logo size="small" />
                        <button
                            onClick={() => setView('hub')}
                            className="glass-card px-4 py-2 rounded-2xl text-xs font-bold hover:scale-105 transition-transform"
                        >
                            الرئيسية
                        </button>
                    </div>
                )}

                {/* Lobby Screen */}
                {gameState === 'lobby' && (
                    <div className="flex-1 flex pb-16 safe-area-pb px-4">
                        <P2PConnectionManager gameIdPrefix="celia-mem" onGameStart={handleGameStart} />
                    </div>
                )}

                {/* Setup Screen (Host selects theme or dynamic random) */}
                {gameState === 'setup' && (
                    <div className="flex-1 flex flex-col items-center justify-center px-4 animate-fade-in">
                        <div className="glass-card rounded-3xl p-6 w-full max-w-sm border border-white/10 shadow-2xl">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <Sparkles size={20} className="text-amber-400" />
                                <h2 className="text-xl font-black text-center gradient-text">اختر عالم البطاقات</h2>
                            </div>
                            <p className="opacity-60 text-xs mb-5 text-center font-bold">
                                رسومات ثلاثية الأبعاد عالية الدقة تتجدد تلقائياً
                            </p>

                            <div className="flex flex-col gap-2.5 mb-6">
                                {Object.keys(REALISTIC_THEMES).map(k => (
                                    <button
                                        key={k}
                                        onClick={() => {
                                            setTheme(k);
                                            playSound('click');
                                            playHaptic(10);
                                        }}
                                        className={`glass-card p-3 rounded-2xl font-bold flex items-center justify-between transition-all text-right
                                            ${theme === k
                                                ? 'border-2 border-emerald-400 bg-emerald-500/15 shadow-[0_0_20px_rgba(52,211,153,0.3)] scale-[1.02]'
                                                : 'opacity-70 hover:opacity-100 hover:bg-white/5'}`}
                                    >
                                        <div>
                                            <div className="text-sm font-black">{REALISTIC_THEMES[k].name}</div>
                                            <div className="text-[10px] opacity-60 mt-0.5">{REALISTIC_THEMES[k].desc}</div>
                                        </div>
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${theme === k ? 'border-emerald-400 bg-emerald-400' : 'border-white/30'}`}>
                                            {theme === k && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleStartGame}
                                className="glow-button w-full h-14 rounded-2xl text-base font-black flex items-center justify-center gap-2"
                            >
                                🕹️ ابدأ اللعبة الآن
                            </button>
                        </div>
                    </div>
                )}

                {/* Waiting Screen (Guest) */}
                {gameState === 'waiting-start' && (
                    <div className="flex-1 flex items-center justify-center px-4 animate-fade-in">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center border border-emerald-400/30 shadow-2xl">
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full mx-auto flex items-center justify-center mb-3 animate-bounce">
                                <span className="text-3xl">🎴</span>
                            </div>
                            <h2 className="text-xl font-black mb-1">في الانتظار... ⏳</h2>
                            <p className="opacity-60 text-xs font-bold mb-4">
                                {oppProfile?.nickname || 'المضيف'} يختار عالم البطاقات ويخلطها الآن!
                            </p>
                        </div>
                    </div>
                )}

                {/* Playing Screen */}
                {gameState === 'playing' && (
                    <div className="flex-1 flex flex-col items-center px-4 animate-fade-in">

                        {/* Status Message */}
                        <div className="text-center mb-3">
                            {!isGameOver ? (
                                <div className={`glass-card rounded-2xl py-2 px-6 inline-block transition-all ${isMyTurn ? 'border-2 border-emerald-400/60 bg-emerald-500/10 animate-pulse' : 'border border-white/5'}`}>
                                    <p className={`font-black text-xs ${isMyTurn ? 'text-emerald-400' : 'opacity-70'}`}>
                                        {isMyTurn ? '🎯 دورك، اقلب كرتين متطابقين!' : '⏳ دور الخصم يقلب الكروت...'}
                                    </p>
                                </div>
                            ) : (
                                <div className="glass-card rounded-2xl py-2.5 px-6 text-center animate-pop-in">
                                    <p className={`font-black text-xl mb-0.5 ${overallWinner === 'me' ? 'text-emerald-400' : (overallWinner === 'draw' ? 'text-amber-400' : 'text-rose-400')}`}>
                                        {overallWinner === 'draw' ? '⚖️ تعادل ذكي!' : overallWinner === 'me' ? '👑 انتصرت في التحدي!' : '💔 فاز الخصم، حاول تاني!'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 4x4 Grid of 3D Cards */}
                        <div className="grid grid-cols-4 gap-2.5 w-[96%] aspect-square max-w-md mx-auto mem-scene" dir="ltr">
                            {cards.map((card, index) => {
                                const isFlipped = card.isFlipped || card.isMatched;

                                return (
                                    <div
                                        key={index}
                                        onClick={() => handleCardClick(index)}
                                        className={`relative w-full h-full cursor-pointer select-none ${card.isMatched ? 'pointer-events-none' : ''}`}
                                    >
                                        <div className={`mem-card-3d ${isFlipped ? 'flipped' : ''}`}>

                                            {/* Card Back Face: Luxury Obsidian Foil */}
                                            <div className="mem-face glass-card border border-white/15 overflow-hidden flex items-center justify-center p-1 shadow-lg hover:border-emerald-400/50 hover:scale-[1.02] transition-all bg-gradient-to-br from-[#0c1b33] via-[#081224] to-[#040914]">
                                                {/* Guilloche border design */}
                                                <div className="w-full h-full rounded-xl border border-amber-400/20 flex flex-col items-center justify-center relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-black/60">
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent rotate-45 pointer-events-none" />
                                                    <span className="text-xl drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse">
                                                        ⚜️
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Card Front Face: High-Fidelity 3D Realistic Card */}
                                            <div className={`mem-face mem-back-face glass-card overflow-hidden flex flex-col items-center justify-center p-1 shadow-2xl border-2 transition-all
                                                ${card.border} bg-gradient-to-b ${card.gradient}
                                                ${card.isMatched ? 'mem-matched-pulse border-emerald-400' : ''}
                                            `}>
                                                <div className="w-full h-full rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
                                                    {/* Specular Glint */}
                                                    <div className="absolute top-0 right-0 left-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none rounded-t-xl" />

                                                    {/* Emoji Symbol */}
                                                    <span className="text-3xl sm:text-4xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] filter hover:scale-110 transition-transform">
                                                        {card.symbol}
                                                    </span>

                                                    {/* Arabic Title */}
                                                    <span className="text-[9px] font-black mt-1 text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] tracking-tight text-center px-0.5 line-clamp-1">
                                                        {card.title}
                                                    </span>

                                                    {/* Matched Star Badge */}
                                                    {card.isMatched && (
                                                        <div className="absolute top-1 right-1 text-[8px] bg-emerald-500 text-black font-black px-1 rounded-full shadow-md animate-pop-in">
                                                            ✓
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Restart Action */}
                        {isGameOver && (
                            <button
                                onClick={handleRestart}
                                className="mt-5 glow-button w-[95%] h-14 rounded-2xl text-base font-black flex items-center justify-center gap-2 animate-pop-in shadow-2xl"
                            >
                                <RotateCcw size={18} /> جولة جديدة متجددة 🎴
                            </button>
                        )}

                    </div>
                )}

            </div>

            {/* Auto-Reconnect & Pause */}
            <ConnectionPauseOverlay
                conn={connRef.current}
                onLeave={() => { connRef.current?.close(); setView('hub'); }}
            />

            {/* Emotes Overlay */}
            {gameState === 'playing' && <EmotesOverlay conn={connRef.current} />}
        </>
    );
}
