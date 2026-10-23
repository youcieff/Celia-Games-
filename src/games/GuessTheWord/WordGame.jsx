import React, { useState, useRef, useEffect } from 'react';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import ConnectionPauseOverlay from '../../components/ConnectionPauseOverlay';
import PlayerGameHeader from '../../components/PlayerGameHeader';
import VirtualKeyboard from './VirtualKeyboard';
import Visualizer from './Visualizer';
import Logo from '../../components/Logo';
import useProfile from '../../hooks/useProfile';
import { playSound } from '../../lib/audioEngine';
import { triggerVictoryEffects, triggerDefeatEffects } from '../../lib/effectsEngine';
import { AvatarDisplay } from '../../components/icons/AvatarIcons';
import EmotesOverlay, { ChatTriggerButton } from '../../components/EmotesOverlay';
import { IconWordGame, IconTrophy } from '../../components/icons/GameIcons';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Play from 'lucide-react/dist/esm/icons/play';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';

function SecretSetup({ title, subtitle, onStart }) {
    const [secretWord, setSecretWord] = useState('');
    const [isHidden, setIsHidden] = useState(false);
    const [error, setError] = useState('');

    const handleStart = () => {
        const word = secretWord.trim();
        if (!word) { setError('لازم تكتب كلمة سرية الأول!'); return; }
        if (!/^[\u0600-\u06FFa-zA-Z\s]+$/.test(word)) {
            setError('الكلمة لازم تكون حروف عربية أو إنجليزية فقط!');
            return;
        }
        setError('');
        onStart(word.toUpperCase());
    };

    return (
        <div className="glass-card rounded-3xl p-6 w-full max-w-sm mx-auto mt-10">
            <h2 className="text-2xl font-black mb-1 text-center">{title}</h2>
            <p className="opacity-50 text-sm text-center mb-6">{subtitle}</p>

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
                {error && <p className="text-red-400 text-sm font-bold text-center">{error}</p>}
            </div>

            <button
                onClick={handleStart}
                className="glow-button w-full h-14 rounded-2xl font-black text-lg flex items-center justify-center gap-2 mt-6"
            >
                <Play size={20} /> تأكيد
            </button>
        </div>
    );
}

export default function WordGame({ setView, mode }) {
    const isOnline = mode === 'online';
    const connRef = useRef(null);
    const isHostRef = useRef(false);
    const isAIRef = useRef(false);
    const p1WordRef = useRef('');
    const p2WordRef = useRef('');
    const dataHandlerRef = useRef(null);
    const matchRecordedRef = useRef(false);

    const [myProfile, , awardMatchResult] = useProfile({ gameId: 'guess-word', gameTitle: 'خمن الكلمة' });
    const [oppProfile, setOppProfile] = useState(null);
    const opp = oppProfile || { nickname: 'الخصم', avatar: 'alien' };

    // States: lobby | setup | setup_wait | playing | game_over
    const [gameState, setGameState] = useState(isOnline ? 'lobby' : 'setup_p1');
    const [turn, setTurn] = useState('host');

    const [p1Word, setP1Word] = useState(''); // Word P1 sets for P2
    const [p2Word, setP2Word] = useState(''); // Word P2 sets for P1

    const [p1GuessedLetters, setP1GuessedLetters] = useState([]);
    const [p2GuessedLetters, setP2GuessedLetters] = useState([]);
    const [p1Mistakes, setP1Mistakes] = useState(0);
    const [p2Mistakes, setP2Mistakes] = useState(0);

    const [winner, setWinner] = useState(null);
    const maxMistakes = 7;

    const getConnectionSnapshot = () => ({
        connectionGame: 'guess-word', gameState, p1Word: p1WordRef.current || p1Word,
        p2Word: p2WordRef.current || p2Word, p1GuessedLetters, p2GuessedLetters,
        p1Mistakes, p2Mistakes, turn, winner
    });

    const restoreConnectionSnapshot = (snapshot) => {
        if (!snapshot || snapshot.connectionGame !== 'guess-word') return false;
        p1WordRef.current = snapshot.p1Word || '';
        p2WordRef.current = snapshot.p2Word || '';
        setP1Word(p1WordRef.current);
        setP2Word(p2WordRef.current);
        setP1GuessedLetters(snapshot.p1GuessedLetters || []);
        setP2GuessedLetters(snapshot.p2GuessedLetters || []);
        setP1Mistakes(Number(snapshot.p1Mistakes) || 0);
        setP2Mistakes(Number(snapshot.p2Mistakes) || 0);
        setTurn(snapshot.turn || 'host');
        setWinner(snapshot.winner || null);
        setGameState(snapshot.gameState || 'setup');
        return true;
    };

    const handleGameStart = (conn, hostMode, oppProf, savedState) => {
        connRef.current = conn;
        isHostRef.current = hostMode;
        isAIRef.current = !!oppProf?.isAI;
        if (oppProf) setOppProfile(oppProf);
        conn.on('data', data => dataHandlerRef.current?.(data));
        if (restoreConnectionSnapshot(savedState)) {
            if (hostMode) {
                conn.on('peer-reconnect', () => {
                    conn.getState?.().then((latest) => {
                        const state = latest?.connectionGame === 'guess-word' ? latest : null;
                        if (state) conn.send({ type: 'state_sync', state });
                    });
                });
            }
        } else {
            setGameState('setup');
        }
    };

    const onData = (data) => {
        if (data.type === 'state_sync' && data.state?.connectionGame === 'guess-word') {
            restoreConnectionSnapshot(data.state);
        } else if (data.type === 'human_word' && isHostRef.current && isAIRef.current) {
            p1WordRef.current = data.word;
            setP1Word(data.word);
        } else if (data.type === 'ai_word' && isAIRef.current) {
            p2WordRef.current = data.word;
            setP2Word(data.word);
            setP1GuessedLetters([]);
            setP2GuessedLetters([]);
            setP1Mistakes(0);
            setP2Mistakes(0);
            setTurn('host');
            setWinner(null);
            setGameState('playing');
        } else if (data.type === 'word_set') {
            if (isHostRef.current) {
                p2WordRef.current = data.word;
                setP2Word(data.word);
                if (p1WordRef.current) {
                    startGame(p1WordRef.current, data.word);
                }
            } else {
                p1WordRef.current = data.word;
                setP1Word(data.word);
            }
        } else if (data.type === 'start_game') {
            p1WordRef.current = data.p1Word;
            p2WordRef.current = data.p2Word;
            setP1Word(data.p1Word);
            setP2Word(data.p2Word);
            setP1GuessedLetters([]);
            setP2GuessedLetters([]);
            setP1Mistakes(0);
            setP2Mistakes(0);
            setTurn('host');
            setWinner(null);
            setGameState('playing');
        } else if (data.type === 'guess') {
            applyGuess(data.player, data.letter);
        } else if (data.type === 'restart') {
            resetGame();
        }
    };

    useEffect(() => {
        if (!isOnline || !connRef.current || gameState === 'lobby' || isAIRef.current) return;
        const snapshot = getConnectionSnapshot();
        const seat = isHostRef.current ? 'host' : 'peer';
        connRef.current.savePlayerState?.({ playerSnapshot: snapshot }, seat);
        if (isHostRef.current) connRef.current.saveState?.(snapshot);
    }, [isOnline, gameState, p1Word, p2Word, p1GuessedLetters, p2GuessedLetters, p1Mistakes, p2Mistakes, turn, winner]);

    const startGame = (w1, w2) => {
        p1WordRef.current = w1;
        p2WordRef.current = w2;
        setP1Word(w1);
        setP2Word(w2);
        setGameState('playing');
        if (isHostRef.current && isOnline && connRef.current) {
            connRef.current.send({ type: 'start_game', p1Word: w1, p2Word: w2 });
        }
    };

    const handleWordSubmit = (word) => {
        playSound('click');
        if (isOnline) {
            if (isAIRef.current) {
                p1WordRef.current = word;
                setP1Word(word);
                setGameState('setup_wait');
                connRef.current?.send({ type: 'human_word', word });
                return;
            }

            if (isHostRef.current) {
                p1WordRef.current = word;
                setP1Word(word);
            } else {
                p2WordRef.current = word;
                setP2Word(word);
            }
            setGameState('setup_wait');
            
            if (connRef.current) {
                connRef.current.send({ type: 'word_set', word });
            }
            // The host owns the handshake and starts only after both words arrived.
            if (isHostRef.current && p2WordRef.current) startGame(word, p2WordRef.current);
        } else {
            if (gameState === 'setup_p1') {
                p1WordRef.current = word;
                setP1Word(word);
                setGameState('setup_p2');
            } else {
                p2WordRef.current = word;
                setP2Word(word);
                setGameState('playing');
            }
        }
    };

    const applyGuess = (player, letter) => {
        if (!letter) return;
        playSound('tap');
        if (player === 'host') {
            setP1GuessedLetters(prev => [...prev, letter]);
            if (!p2WordRef.current.includes(letter)) setP1Mistakes(m => m + 1);
        } else {
            setP2GuessedLetters(prev => [...prev, letter]);
            if (!p1WordRef.current.includes(letter)) setP2Mistakes(m => m + 1);
        }
        setTurn(player === 'host' ? 'guest' : 'host');
    };

    const handleLetterGuess = (letter) => {
        const isMyTurn = isOnline ? (isHostRef.current ? turn === 'host' : turn === 'guest') : true;
        if (!isMyTurn || gameState !== 'playing') return;

        const activePlayer = isOnline ? (isHostRef.current ? 'host' : 'guest') : turn;
        
        // Prevent duplicate guess
        const letters = activePlayer === 'host' ? p1GuessedLetters : p2GuessedLetters;
        if (letters.includes(letter)) return;

        applyGuess(activePlayer, letter);
        
        if (isOnline && connRef.current) {
            connRef.current.send({ type: 'guess', player: activePlayer, letter });
        }
    };

    // Win/Lose Condition checking
    useEffect(() => {
        if (gameState !== 'playing') return;

        const hostWon = p2Word && p2Word.split('').every(c => c === ' ' || p1GuessedLetters.includes(c));
        const guestWon = p1Word && p1Word.split('').every(c => c === ' ' || p2GuessedLetters.includes(c));
        const hostLost = p1Mistakes >= maxMistakes;
        const guestLost = p2Mistakes >= maxMistakes;

        let curWinner = null;

        if (hostWon && guestWon) curWinner = 'draw';
        else if (hostWon) curWinner = 'host';
        else if (guestWon) curWinner = 'guest';
        else if (hostLost && guestLost) curWinner = 'draw';
        else if (hostLost) curWinner = 'guest';
        else if (guestLost) curWinner = 'host';

        if (curWinner) {
            setWinner(curWinner);
            setGameState('game_over');

            if (isOnline && !matchRecordedRef.current) {
                matchRecordedRef.current = true;
                const localPlayer = isHostRef.current ? 'host' : 'guest';
                const outcome = curWinner === 'draw' ? 'draw' : curWinner === localPlayer ? 'win' : 'loss';
                awardMatchResult(outcome, {
                    gameId: 'guess-word',
                    gameTitle: 'خمن الكلمة',
                    oppName: opp.nickname,
                    oppAvatar: opp.avatar,
                    isAI: isAIRef.current
                });
            }
            
            if (isOnline) {
                const iWon = (isHostRef.current && curWinner === 'host') || (!isHostRef.current && curWinner === 'guest');
                const isDraw = curWinner === 'draw';
                if (iWon) triggerVictoryEffects();
                else if (!isDraw) triggerDefeatEffects();
            } else {
                triggerVictoryEffects(); // Offline always victory effect
            }
        }
    }, [p1GuessedLetters, p2GuessedLetters, p1Mistakes, p2Mistakes, p1Word, p2Word, gameState]);

    const resetGame = () => {
        matchRecordedRef.current = false;
        p1WordRef.current = '';
        p2WordRef.current = '';
        setP1Word('');
        setP2Word('');
        setP1GuessedLetters([]);
        setP2GuessedLetters([]);
        setP1Mistakes(0);
        setP2Mistakes(0);
        setTurn('host');
        setWinner(null);
        setGameState(isOnline ? 'setup' : 'setup_p1');
    };

    const handleRestart = () => {
        resetGame();
        if (isOnline && connRef.current) {
            connRef.current.send({ type: 'restart' });
        }
    };

    dataHandlerRef.current = onData;

    useEffect(() => {
        if (isOnline && isAIRef.current && gameState === 'game_over') {
            connRef.current?.send({ type: 'game_finished' });
        }
    }, [gameState, isOnline]);

    const getWordOutcome = (player) => {
        if (gameState !== 'game_over') return 'active';
        if (winner === 'draw') return 'draw';
        return winner === player ? 'winner' : 'loser';
    };

    const renderWord = (word, guessed, isMuted, outcome = 'active') => {
        const revealedTileClass = {
            winner: 'border-emerald-300 bg-emerald-500/25 text-emerald-50 shadow-[0_0_16px_rgba(16,185,129,0.35)]',
            loser: 'border-rose-300 bg-rose-500/25 text-rose-50 shadow-[0_0_16px_rgba(244,63,94,0.28)]',
            draw: 'border-amber-200 bg-amber-400/20 text-amber-50 shadow-[0_0_14px_rgba(251,191,36,0.2)]',
            active: 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-[0_0_15px_var(--accent-glow)]'
        }[outcome];

        return (
            <div className="flex flex-wrap justify-center gap-2 mx-auto w-full mb-4 mt-2" dir="rtl">
                {word.split('').map((char, index) => {
                    if (char === ' ') return <div key={index} className="w-4 h-10" />;
                    const isRevealed = guessed.includes(char) || gameState === 'game_over';
                    return (
                        <div
                            key={index}
                            className={`w-10 h-10 flex items-center justify-center text-lg font-black rounded-lg border transition-all duration-300
                                ${isRevealed ? revealedTileClass : 'glass-card border-white/10 text-transparent'}
                            `}
                        >
                            {isRevealed ? char : ''}
                        </div>
                    );
                })}
            </div>
        );
    };

    if (gameState === 'lobby') {
        return (
            <div className="min-h-dvh max-w-md mx-auto px-4 flex flex-col safe-area-pt overflow-x-hidden overflow-y-auto pb-6">
                <div className="grid grid-cols-3 items-center py-4 mb-4">
                    <div><Logo size="small" /></div>
                    <div className="flex justify-center">
                        <div className="flex items-center gap-2 glass-card px-3.5 py-1.5 rounded-2xl border border-white/10 shrink-0">
                            <IconWordGame size={18} className="text-[var(--accent)]" />
                            <span className="text-xs font-black gradient-text">خمن الكلمة</span>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button onClick={() => setView('hub')} className="glass-card px-4 py-2 rounded-2xl text-xs font-bold hover:scale-105 transition-transform">
                            الرئيسية
                        </button>
                    </div>
                </div>
                <div className="flex-1 flex pb-16 safe-area-pb">
                    <P2PConnectionManager gameIdPrefix="celia-word" onGameStart={handleGameStart} />
                </div>
            </div>
        );
    }

    const hostProfile = isHostRef.current ? myProfile : opp;
    const guestProfile = isHostRef.current ? opp : myProfile;
    const p1Name = isOnline ? hostProfile.nickname : 'اللاعب الأول';
    const p2Name = isOnline ? guestProfile.nickname : 'اللاعب الثاني';

    const p1Letters = isOnline ? (isHostRef.current ? p1GuessedLetters : p2GuessedLetters) : p1GuessedLetters;
    
    return (
        <>
            <div className="animated-bg"><div className="bg-orb-3"></div></div>
            <div className="min-h-dvh max-w-md mx-auto px-4 flex flex-col safe-area-pt overflow-x-hidden overflow-y-auto pb-6">
                
                <PlayerGameHeader 
                    onLeave={() => setView('hub')} 
                    title="خمن الكلمة"
                    gameId="word-game"
                />

                {gameState === 'setup_p1' && (
                    <SecretSetup title="اللاعب الأول" subtitle="اكتب كلمة سرية ليخمنها اللاعب الثاني" onStart={handleWordSubmit} />
                )}
                {gameState === 'setup_p2' && (
                    <SecretSetup title="اللاعب الثاني" subtitle="اكتب كلمة سرية ليخمنها اللاعب الأول" onStart={handleWordSubmit} />
                )}
                {gameState === 'setup' && (
                    <SecretSetup
                        title={isAIRef.current ? 'اكتب كلمة للذكاء الاصطناعي' : 'كلمتك السرية'}
                        subtitle={isAIRef.current ? 'الكمبيوتر هيختار كلمة تلقائيًا، وأنت اكتب كلمة يحاول هو يخمنها' : 'اكتب كلمة ليخمنها الخصم'}
                        onStart={handleWordSubmit}
                    />
                )}
                {gameState === 'setup_wait' && (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="glass-card rounded-3xl p-8 text-center w-full max-w-xs animate-pulse">
                            <h2 className="text-xl font-black mb-2">{isAIRef.current ? 'جاري اختيار كلمة الخصم...' : 'في انتظار الخصم...'}</h2>
                            <p className="opacity-60 text-sm">{isAIRef.current ? 'كلمتك محفوظة، والكمبيوتر بيجهز كلمته' : 'تم حفظ كلمتك، ننتظر كلمة الخصم'}</p>
                        </div>
                    </div>
                )}

                {(gameState === 'playing' || gameState === 'game_over') && (
                    <div className="flex-1 flex flex-col mt-4">
                        <div className="flex flex-col gap-4 mb-4">
                            
                            {/* Host (P1) Box - Guessing P2's word */}
                            <div className={`glass-card p-3 rounded-2xl border transition-all ${turn === 'host' && gameState === 'playing' ? 'border-[var(--accent)] shadow-[0_0_20px_var(--accent-glow)]' : 'border-white/10'}`}>
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <AvatarDisplay avatarId={isOnline ? hostProfile.avatar : 'boy'} size={24} />
                                        <span className="text-sm font-black">{p1Name}</span>
                                    </div>
                                    <span className="text-xs opacity-60">
                                        {p1GuessedLetters.filter(l => p2Word.includes(l)).length} من {Array.from(new Set(p2Word.replace(/\s/g, ''))).length} حروف
                                    </span>
                                </div>
                                <div className="flex gap-4 items-center">
                                    <div className="flex-1">
                                        <div className="text-xs opacity-60 text-center mb-1">{isAIRef.current ? 'كلمة الكمبيوتر' : `كلمة ${p2Name}`}</div>
                                        {gameState === 'game_over' && (
                                            <div className={`text-center text-[10px] font-black ${getWordOutcome('host') === 'winner' ? 'text-emerald-300' : getWordOutcome('host') === 'loser' ? 'text-rose-300' : 'text-amber-200'}`}>
                                                {getWordOutcome('host') === 'winner' ? 'فاز بهذه الكلمة' : getWordOutcome('host') === 'loser' ? 'لم يحل الكلمة' : 'تعادل'}
                                            </div>
                                        )}
                                        {renderWord(p2Word, p1GuessedLetters, false, getWordOutcome('host'))}
                                    </div>
                                    <Visualizer mistakes={p1Mistakes} maxMistakes={maxMistakes} isOpponent={!isHostRef.current && isOnline} />
                                </div>
                            </div>

                            {/* Guest (P2) Box - Guessing P1's word */}
                            <div className={`glass-card p-3 rounded-2xl border transition-all ${turn === 'guest' && gameState === 'playing' ? 'border-[var(--accent)] shadow-[0_0_20px_var(--accent-glow)]' : 'border-white/10'}`}>
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <AvatarDisplay avatarId={isOnline ? guestProfile.avatar : 'girl'} size={24} />
                                        <span className="text-sm font-black">{p2Name}</span>
                                    </div>
                                    <span className="text-xs opacity-60">
                                        {p2GuessedLetters.filter(l => p1Word.includes(l)).length} من {Array.from(new Set(p1Word.replace(/\s/g, ''))).length} حروف
                                    </span>
                                </div>
                                <div className="flex gap-4 items-center">
                                    <div className="flex-1">
                                        <div className="text-xs opacity-60 text-center mb-1">كلمة {p1Name}</div>
                                        {gameState === 'game_over' && (
                                            <div className={`text-center text-[10px] font-black ${getWordOutcome('guest') === 'winner' ? 'text-emerald-300' : getWordOutcome('guest') === 'loser' ? 'text-rose-300' : 'text-amber-200'}`}>
                                                {getWordOutcome('guest') === 'winner' ? 'فاز بهذه الكلمة' : getWordOutcome('guest') === 'loser' ? 'لم يحل الكلمة' : 'تعادل'}
                                            </div>
                                        )}
                                        {renderWord(p1Word, p2GuessedLetters, false, getWordOutcome('guest'))}
                                    </div>
                                    <Visualizer mistakes={p2Mistakes} maxMistakes={maxMistakes} isOpponent={isHostRef.current && isOnline} />
                                </div>
                            </div>
                        </div>

                        {gameState === 'playing' && (
                            <div className="mt-auto">
                                <div className="text-center mb-3 text-sm font-bold text-[var(--accent)]">
                                    {isOnline ? (
                                        (isHostRef.current ? turn === 'host' : turn === 'guest') ? 'دورك - اختار حرف' : 'دور الخصم...'
                                    ) : (
                                        `دور ${turn === 'host' ? p1Name : p2Name} - اختار حرف`
                                    )}
                                </div>
                                <VirtualKeyboard 
                                    onLetterPress={handleLetterGuess}
                                    guessedLetters={isOnline ? (isHostRef.current ? p1GuessedLetters : p2GuessedLetters) : (turn === 'host' ? p1GuessedLetters : p2GuessedLetters)}
                                    disabled={isOnline ? (isHostRef.current ? turn !== 'host' : turn !== 'guest') : false}
                                />
                            </div>
                        )}

                        {gameState === 'game_over' && (
                            <div className="mt-auto glass-card rounded-3xl p-6 text-center w-full animate-pop-in border border-[var(--accent)] shadow-[0_0_40px_var(--accent-glow)]">
                                <IconTrophy size={40} className="mx-auto mb-3 text-[var(--accent)]" />
                                <h2 className="text-2xl font-black mb-2 text-white">
                                    {winner === 'draw' ? 'تعادل!' : `الفائز: ${winner === 'host' ? p1Name : p2Name}`}
                                </h2>
                                <button onClick={handleRestart} className="glow-button w-full h-12 rounded-2xl text-base font-black flex items-center justify-center gap-2 mt-4">
                                    <RotateCcw size={18} /> العب مرة أخرى
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {isOnline && connRef.current && <EmotesOverlay conn={connRef.current} oppProfile={opp} showStandaloneButton={false} />}
            {isOnline && gameState !== 'lobby' && (
                <ConnectionPauseOverlay conn={connRef.current} opponentName={opp?.nickname} onLeave={() => { connRef.current?.close(); setView('hub'); }} />
            )}
        </>
    );
}
