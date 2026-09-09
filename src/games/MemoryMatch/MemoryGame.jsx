import React, { useState, useEffect, useRef } from 'react';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import Logo from '../../components/Logo';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Wifi from 'lucide-react/dist/esm/icons/wifi';
import Ghost from 'lucide-react/dist/esm/icons/ghost';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Flame from 'lucide-react/dist/esm/icons/flame';
import Crown from 'lucide-react/dist/esm/icons/crown';
import Diamond from 'lucide-react/dist/esm/icons/diamond';
import Heart from 'lucide-react/dist/esm/icons/heart';
import Star from 'lucide-react/dist/esm/icons/star';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Cat from 'lucide-react/dist/esm/icons/cat';
import Dog from 'lucide-react/dist/esm/icons/dog';
import Bird from 'lucide-react/dist/esm/icons/bird';
import Fish from 'lucide-react/dist/esm/icons/fish';
import Rabbit from 'lucide-react/dist/esm/icons/rabbit';
import Bug from 'lucide-react/dist/esm/icons/bug';
import Snail from 'lucide-react/dist/esm/icons/snail';
import Turtle from 'lucide-react/dist/esm/icons/turtle';
import Cpu from 'lucide-react/dist/esm/icons/cpu';
import Monitor from 'lucide-react/dist/esm/icons/monitor';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import Keyboard from 'lucide-react/dist/esm/icons/keyboard';
import Mouse from 'lucide-react/dist/esm/icons/mouse';
import Gamepad2 from 'lucide-react/dist/esm/icons/gamepad-2';
import Headphones from 'lucide-react/dist/esm/icons/headphones';
import Speaker from 'lucide-react/dist/esm/icons/speaker';

// Premium Icon Themes
const THEMES = {
    mystic: [Ghost, Zap, Flame, Crown, Diamond, Heart, Star, Sparkles],
    animals: [Cat, Dog, Bird, Fish, Rabbit, Bug, Snail, Turtle],
    tech: [Cpu, Monitor, Smartphone, Keyboard, Mouse, Gamepad2, Headphones, Speaker]
};

const THEME_NAMES = {
    mystic: '✨ السحر والغموض',
    animals: '🐾 الحيوانات الأليفة',
    tech: '💻 التكنولوجيا'
};

const shuffleArray = (array) => {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
};

const generateDeck = (themeKey) => {
    const icons = THEMES[themeKey];
    const deck = [...icons, ...icons].map((Icon, idx) => ({
        id: idx,
        iconName: Icon.displayName || Icon.name || idx.toString(),
        iconIndex: icons.indexOf(Icon),
        isFlipped: false,
        isMatched: false
    }));
    return shuffleArray(deck);
};

export default function MemoryGame({ setView }) {
    const connRef = useRef(null);
    const isHostRef = useRef(false);

    const [gameState, setGameState] = useState('lobby');

    const [theme, setTheme] = useState('mystic');
    const [cards, setCards] = useState([]);

    // Game Logic
    // hostTurn logic: true = host relies, false = client relies
    const [hostTurn, setHostTurn] = useState(true);
    const [flippedIndices, setFlippedIndices] = useState([]);
    const [scores, setScores] = useState({ host: 0, client: 0 });
    const [isProcessing, setIsProcessing] = useState(false); // Locks board during animation

    const stateRef = useRef({ cards, flippedIndices, hostTurn, isProcessing });
    useEffect(() => {
        stateRef.current = { cards, flippedIndices, hostTurn, isProcessing };
    }, [cards, flippedIndices, hostTurn, isProcessing]);

    // Derived properties
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

    const handleGameStart = (conn, hostMode) => {
        isHostRef.current = hostMode;
        connRef.current = conn;
        conn.on('data', onData);
        setGameState(hostMode ? 'setup' : 'waiting-start');
    };

    const onData = (msg) => {
        const cur = stateRef.current;

        if (msg.type === 'start') {
            setTheme(msg.theme);
            setCards(msg.deck);
            setHostTurn(true);
            setScores({ host: 0, client: 0 });
            setGameState('playing');
        } else if (msg.type === 'flip') {
            applyFlip(msg.index);
        } else if (msg.type === 'restart') {
            if (stateRef.current.gameState === 'playing') return; // already restarted
            doRestart();
        }
    };

    const handleStartGame = () => {
        const deck = generateDeck(theme);
        setCards(deck);
        setHostTurn(true);
        setScores({ host: 0, client: 0 });
        setGameState('playing');
        connRef.current?.send({ type: 'start', theme, deck });
    };

    const applyFlip = (index) => {
        const { cards, flippedIndices, hostTurn } = stateRef.current;

        // Optimistic UI Flip
        const newCards = [...cards];
        newCards[index] = { ...newCards[index], isFlipped: true };
        setCards(newCards);

        const newFlipped = [...flippedIndices, index];
        setFlippedIndices(newFlipped);

        // If memory match logic is full
        if (newFlipped.length === 2) {
            setIsProcessing(true); // Lock clicks
            const [idx1, idx2] = newFlipped;

            const matchStatus = newCards[idx1].iconIndex === newCards[idx2].iconIndex;

            setTimeout(() => {
                setFlippedIndices([]);
                setIsProcessing(false);

                if (matchStatus) {
                    // Matched
                    const matchedCards = [...newCards];
                    matchedCards[idx1].isMatched = true;
                    matchedCards[idx2].isMatched = true;
                    setCards(matchedCards);
                    setScores(prev => ({
                        ...prev,
                        [hostTurn ? 'host' : 'client']: prev[hostTurn ? 'host' : 'client'] + 1
                    }));
                    // the player gets another turn, so hostTurn remains the same
                } else {
                    // Not matched, flip back
                    const unflippedCards = [...newCards];
                    unflippedCards[idx1].isFlipped = false;
                    unflippedCards[idx2].isFlipped = false;
                    setCards(unflippedCards);

                    // Next turn
                    setHostTurn(!hostTurn);
                }
            }, 1000);
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
        setGameState(isHost ? 'setup' : 'waiting-start');
    };

    const handleRestart = () => {
        doRestart();
        connRef.current?.send({ type: 'restart' });
    };

    // Utility to get the dynamic Icon component safely
    const renderIcon = (themeKey, iconIndex) => {
        const IconComponent = THEMES[themeKey][iconIndex];
        return IconComponent ? <IconComponent size={32} strokeWidth={2.5} /> : null;
    };

    return (
        <>
            {/* Dynamic styles injected inline for perfect 3D performance scoped to this component */}
            <style>{`
        .mem-card { perspective: 1000px; }
        .mem-inner { 
          position: relative; w-full h-full; transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275); transform-style: preserve-3d; 
        }
        .mem-card.flipped .mem-inner { transform: rotateY(180deg); }
        .mem-front, .mem-back {
          position: absolute; width: 100%; height: 100%; backface-visibility: hidden; border-radius: 1rem;
          display: flex; align-items: center; justify-content: center;
        }
        .mem-front { background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.1); }
        .mem-back { 
          background: rgba(255,255,255,0.15); transform: rotateY(180deg); border: 2px solid var(--primary-color);
          box-shadow: 0 0 15px var(--primary-glow); color: var(--primary-color);
        }
        .mem-matched { opacity: 0.5; transform: scale(0.95); transition: all 0.5s; box-shadow: none; border-color: transparent }
      `}</style>

            <div className="animated-bg"><div className="bg-orb-3" style={{ background: 'var(--accent-glow)' }} /></div>
            <div className="min-h-dvh max-w-lg mx-auto flex flex-col safe-area-pt overflow-hidden overflow-y-auto pb-8 safe-area-pb">

                {/* Nav */}
                <div className="px-4 flex justify-between items-center py-4 mb-2 relative">
                    <div className="flex items-center gap-3 z-10">
                        <Logo size="small" />
                        <button onClick={() => { connRef.current?.close(); setView('hub'); }} className="glass-card w-11 h-11 flex items-center justify-center rounded-2xl hover:scale-105 transition-transform"><ArrowRight size={20} /></button>
                    </div>

                    <div className="flex items-center gap-2 glass-card px-3 py-1.5 rounded-2xl text-xs font-bold text-center z-10">
                        {gameState !== 'lobby' ? (
                            <div className="flex items-center gap-3">
                                <span className="flex flex-col items-end">
                                    <span className="text-[12px] font-black gradient-text leading-none mb-1">ميموري 🃏</span>
                                    <span className="text-[9px] opacity-70 leading-none">أنت {isHost ? '(الهوست)' : '(الضيف)'}</span>
                                </span>
                                <div className="w-px h-5 bg-white/20"></div>
                                <span className="flex flex-col items-center justify-center text-emerald-400">
                                    <Wifi size={12} />
                                    <span className="text-[8px] mt-0.5 font-black">متصل</span>
                                </span>
                            </div>
                        ) : (
                            <span className="text-[11px] font-black gradient-text">ميموري 🃏</span>
                        )}
                    </div>
                </div>

                {/* Screens */}
                {gameState === 'lobby' && <div className="flex-1 flex pb-16 safe-area-pb px-4"><P2PConnectionManager gameIdPrefix="celia-mem" onGameStart={handleGameStart} /></div>}

                {gameState === 'setup' && (
                    <div className="flex-1 flex flex-col items-center justify-center px-4 -mt-10">
                        <div className="glass-card rounded-3xl p-6 w-full max-w-sm">
                            <h2 className="text-2xl font-black mb-6 text-center">🎴 اختار ستايل الكروت</h2>

                            <div className="flex flex-col gap-3 mb-6">
                                {Object.keys(THEMES).map(k => (
                                    <button key={k} onClick={() => setTheme(k)} className={`glass-card p-4 rounded-xl font-bold flex items-center justify-between transition-all ${theme === k ? 'ring-2 ring-[var(--primary-color)] scale-105 shadow-[0_0_15px_var(--primary-glow)]' : 'opacity-60'}`}>
                                        <span>{THEME_NAMES[k]}</span>
                                        <span className="opacity-50 text-xs">8 أزواج</span>
                                    </button>
                                ))}
                            </div>

                            <div className="mb-6 p-4 rounded-xl bg-black/20 text-xs opacity-70 font-bold leading-relaxed text-center">
                                اجمع أزواج من الكروت المتشابهة وحقق أعلى سكور. كل زوج تلاقيه هيديلك نقطة، وتلعب كمان دور!
                            </div>

                            <button onClick={handleStartGame} className="glow-button w-full h-14 rounded-2xl text-lg font-black">🕹️ ابدأ اللعب</button>
                        </div>
                    </div>
                )}

                {gameState === 'waiting-start' && (
                    <div className="flex-1 flex items-center justify-center -mt-10 px-4">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center animate-pulse-glow">
                            <h2 className="text-2xl font-black mb-2">في الانتظار... ⏳</h2>
                            <p className="opacity-60 text-sm font-bold">الطرف التاني بيخلط الكروت عشان نبدأ!</p>
                        </div>
                    </div>
                )}

                {gameState === 'playing' && (
                    <div className="flex-1 flex flex-col items-center px-4">

                        {/* Status Bar */}
                        <div className="w-full flex justify-between items-center glass-card rounded-2xl p-4 mb-4">
                            {/* My Score */}
                            <div className="flex flex-col items-center">
                                <span className="text-xs font-bold opacity-60">أنت</span>
                                <span className="text-2xl font-black text-[var(--primary-color)] drop-shadow-[0_0_8px_var(--primary-glow)]">{isHost ? scores.host : scores.client}</span>
                            </div>

                            {/* Turn indicator */}
                            <div className="flex flex-col items-center justify-center">
                                {!isGameOver ? (
                                    <span className={`text-sm font-black px-4 py-2 rounded-full transition-all ${isMyTurn ? 'bg-[var(--primary-color)]/20 text-[var(--primary-color)] shadow-[0_0_15px_var(--primary-glow)]' : 'opacity-50 blur-[0.5px]'}`}>
                                        {isMyTurn ? '🎯 دورك' : 'دور الخصم...'}
                                    </span>
                                ) : (
                                    <span className="text-sm font-black px-4 py-2 bg-yellow-400/20 text-yellow-400 rounded-full animate-pulse-glow">
                                        {overallWinner === 'draw' ? 'تعادل' : overallWinner === 'me' ? 'أنت الفائز! 🎉' : 'خسرت 💔'}
                                    </span>
                                )}
                            </div>

                            {/* Opp Score */}
                            <div className="flex flex-col items-center">
                                <span className="text-xs font-bold opacity-60">الخصم</span>
                                <span className="text-2xl font-black text-[var(--accent-color)]">{isHost ? scores.client : scores.host}</span>
                            </div>
                        </div>

                        {/* Grid 4x4 */}
                        <div className={`grid grid-cols-4 gap-2 w-[95%] aspect-square transition-all ${!isMyTurn && !isGameOver ? 'opacity-90' : ''}`} dir="ltr">
                            {cards.map((card, index) => (
                                <div
                                    key={index}
                                    onClick={() => handleCardClick(index)}
                                    className={`mem-card w-full h-full cursor-pointer ${card.isFlipped ? 'flipped' : ''}`}
                                >
                                    <div className={`mem-inner w-full h-full ${card.isMatched ? 'mem-matched' : ''}`}>

                                        <div className="mem-front hover:bg-white/10 transition-colors">
                                            {/* Premium clean back face - gradient glow only */}
                                            <div className="w-full h-full rounded-2xl relative overflow-hidden"
                                                style={{
                                                    background: 'linear-gradient(135deg, rgba(var(--primary-rgb, 56,189,248), 0.15) 0%, rgba(var(--accent-rgb, 168,85,247), 0.1) 100%)',
                                                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
                                                }}>
                                                {/* Subtle corner shine */}
                                                <div className="absolute top-0 left-0 w-1/2 h-1/2 rounded-full opacity-20"
                                                    style={{ background: 'radial-gradient(circle at 30% 30%, white, transparent 70%)' }} />
                                                {/* Center glow dot */}
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-3 h-3 rounded-full opacity-30"
                                                        style={{ background: 'var(--primary-color)', boxShadow: '0 0 12px 4px var(--primary-color)' }} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mem-back drop-shadow-[0_0_8px_var(--primary-glow)]">
                                            {renderIcon(theme, card.iconIndex)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {isGameOver && (
                            <button onClick={handleRestart} className="mt-6 glow-button w-[95%] h-14 rounded-2xl text-lg font-black flex items-center justify-center gap-2 animate-pop-in">
                                <RotateCcw size={20} /> لعبة جديدة
                            </button>
                        )}

                    </div>
                )}
            </div>
        </>
    );
}
