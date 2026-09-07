import { useRef } from 'react';
import React, { useState, useEffect } from 'react';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import SecretSetup from './SecretSetup';
import VirtualKeyboard from './VirtualKeyboard';
import Visualizer from './Visualizer';
import Logo from '../../components/Logo';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';

export default function WordGame({ setView, mode }) {
    const isOnline = mode === 'online';

    const connRef = useRef(null);
    const isHostRef = useRef(false);
    const [isMyTurnToWrite, setIsMyTurnToWrite] = useState(false);

    // lobby | role-select | role-waiting | setup | waiting | playing | won | lost
    const [gameState, setGameState] = useState(isOnline ? 'lobby' : 'role-select');
    const [secretWord, setSecretWord] = useState('');
    const [hint, setHint] = useState('');
    const [guessedLetters, setGuessedLetters] = useState([]);
    const [lives, setLives] = useState(6);
    const [isHintRevealed, setIsHintRevealed] = useState(false);

    const handleGameStart = (conn, hostMode) => {
        connRef.current = conn;
        isHostRef.current = hostMode;
        if (hostMode) {
            setGameState('role-select');
        } else {
            setGameState('role-waiting');
        }
    };

    const handleOfflineRoleSelect = (iAmWriter) => {
        setIsMyTurnToWrite(iAmWriter);
        setGameState(iAmWriter ? 'setup' : 'waiting-offline');
    };

    const handleOnlineRoleSelect = (hostWrites) => {
        setIsMyTurnToWrite(hostWrites);
        setGameState(hostWrites ? 'setup' : 'waiting');
        if (connRef.current) {
            connRef.current.send({ type: 'roles_set', guestWrites: hostWrites });
        }
    };

    useEffect(() => {
        const conn = connRef.current;
        if (!conn) return;
        const handler = (data) => {
            if (data.type === 'roles_set') {
                const guestWrites = data.guestWrites;
                setIsMyTurnToWrite(guestWrites);
                setGameState(guestWrites ? 'setup' : 'waiting');
            } else if (data.type === 'start_game') {
                setSecretWord(data.word);
                setHint(data.hint);
                setGameState('playing');
            } else if (data.type === 'guess') {
                makeGuessOnState(data.letter, data.wordContext);
            } else if (data.type === 'restart') {
                const newTurn = data.youWillWrite;
                setIsMyTurnToWrite(newTurn);
                resetGame(newTurn);
            } else if (data.type === 'reveal_hint') {
                setIsHintRevealed(true);
            }
        };
        conn.on('data', handler);
        return () => conn.off('data', handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connRef.current]);

    const handleStartHost = (word, providedHint) => {
        setSecretWord(word);
        setHint(providedHint);
        setGameState('playing');
        if (isOnline && connRef.current) connRef.current.send({ type: 'start_game', word, hint: providedHint });
    };

    const makeGuessOnState = (letter, wordParam) => {
        const currentWord = secretWord || wordParam;
        if (!guessedLetters.includes(letter)) {
            if (!currentWord.includes(letter)) {
                setLives(l => l - 1);
            }
            setGuessedLetters(prev => [...prev, letter]);
        }
    };

    const handleKeyboardPress = (letter) => {
        if (gameState !== 'playing' || (isOnline && isMyTurnToWrite)) return;
        makeGuessOnState(letter, secretWord);
        if (isOnline && connRef.current) connRef.current.send({ type: 'guess', letter, wordContext: secretWord });
    };

    const handleRevealHint = () => {
        setIsHintRevealed(true);
        if (isOnline && !isMyTurnToWrite && connRef.current) connRef.current.send({ type: 'reveal_hint' });
    };

    useEffect(() => {
        if (gameState !== 'playing' || !secretWord) return;
        const isWin = secretWord.split('').every(char => char === ' ' || guessedLetters.includes(char));
        if (isWin) setGameState('won');
        else if (lives <= 0) setGameState('lost');
    }, [guessedLetters, lives, gameState, secretWord]);

    const resetGame = (newMyTurnToWrite) => {
        setGuessedLetters([]);
        setLives(6);
        setSecretWord('');
        setHint('');
        setIsHintRevealed(false);
        setGameState(isOnline ? (newMyTurnToWrite ? 'setup' : 'waiting') : 'role-select');
    };

    const handleRestartAction = () => {
        const newMyTurnToWrite = isOnline ? !isMyTurnToWrite : true;
        setIsMyTurnToWrite(newMyTurnToWrite);
        resetGame(newMyTurnToWrite);
        if (isOnline && connRef.current) {
            connRef.current.send({ type: 'restart', youWillWrite: !newMyTurnToWrite });
        }
    };

    return (
        <>
            <div className="animated-bg"><div className="bg-orb-3"></div></div>
            <div className="min-h-dvh max-w-md mx-auto px-4 flex flex-col safe-area-pt overflow-x-hidden overflow-y-auto">
                {/* Nav */}
                <div className="flex justify-between items-center py-4 relative">
                    <div className="flex items-center gap-3 z-10">
                        <Logo size="small" />
                        <button
                            onClick={() => { if (connRef.current) connRef.current.close(); setView('hub'); }}
                            className="glass-card w-11 h-11 flex items-center justify-center rounded-2xl hover:scale-105 transition-transform"
                        >
                            <ArrowRight size={20} />
                        </button>
                    </div>

                    <div className="glass-card px-3 py-1.5 rounded-full text-xs font-bold text-center leading-tight">
                        <span className="block">خمن الكلمة</span>
                        {isOnline && !['lobby', 'role-select', 'role-waiting'].includes(gameState) && (
                            <span style={{ color: 'var(--primary-color)', fontSize: '10px' }}>
                                {isMyTurnToWrite ? '(الكاتب)' : '(المخمن)'}
                            </span>
                        )}
                        {!isOnline && !['role-select', 'waiting-offline'].includes(gameState) && (
                            <span style={{ color: 'var(--accent-color)', fontSize: '10px' }}>موبايل واحد</span>
                        )}
                    </div>
                </div>

                {/* Lobby */}
                {isOnline && gameState === 'lobby' && (
                    <div className="flex-1 flex pb-20 safe-area-pb">
                        <P2PConnectionManager gameIdPrefix="celia-word" onGameStart={handleGameStart} />
                    </div>
                )}

                {/* Role Selection */}
                {gameState === 'role-select' && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center animate-pop-in">
                            <div className="text-5xl mb-3">✍️</div>
                            <h2 className="text-2xl font-black mb-2">مين يكتب؟</h2>
                            <p className="opacity-60 text-sm mb-8 font-bold">
                                {isOnline ? 'اختار مين هيفكر في كلمة ومين هيخمن' : 'اختار مين هيكتب الكلمة السرية'}
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => isOnline ? handleOnlineRoleSelect(true) : handleOfflineRoleSelect(true)}
                                    className="glass-card glass-card-hover rounded-2xl py-6 flex flex-col items-center gap-2 border border-transparent hover:border-[var(--primary-color)] transition-all"
                                >
                                    <span className="text-4xl">✍️</span>
                                    <span className="text-sm font-black gradient-text">
                                        {isOnline ? 'أنا (الهوست) أكتب' : 'اللاعب الأول يكتب'}
                                    </span>
                                </button>
                                <button
                                    onClick={() => isOnline ? handleOnlineRoleSelect(false) : handleOfflineRoleSelect(false)}
                                    className="glass-card glass-card-hover rounded-2xl py-6 flex flex-col items-center gap-2 border border-transparent hover:border-[var(--primary-color)] transition-all"
                                >
                                    <span className="text-4xl">🔍</span>
                                    <span className="text-sm font-black gradient-text">
                                        {isOnline ? 'الضيف يكتب' : 'اللاعب التاني يكتب'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Guest waiting for host to assign roles */}
                {isOnline && gameState === 'role-waiting' && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="glass-card rounded-3xl p-10 text-center animate-pulse-glow">
                            <div className="text-5xl mb-4">⏳</div>
                            <h2 className="text-2xl font-black mb-3">الهوست بيختار الأدوار...</h2>
                            <p className="opacity-60 font-bold">انتظر لحظة!</p>
                        </div>
                    </div>
                )}

                {/* Offline waiting screen */}
                {!isOnline && gameState === 'waiting-offline' && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="glass-card rounded-3xl p-10 text-center animate-pop-in">
                            <div className="text-5xl mb-4">🤫</div>
                            <h2 className="text-2xl font-black mb-3">اللاعب التاني يكتب الكلمة</h2>
                            <p className="opacity-60 mb-6 font-bold">اللى هيخمن يبعد شوية من الشاشة!</p>
                            <button
                                onClick={() => { setIsMyTurnToWrite(true); setGameState('setup'); }}
                                className="glow-button w-full h-14 rounded-2xl text-lg font-black"
                            >
                                جاهز ✅
                            </button>
                        </div>
                    </div>
                )}

                {/* Waiting (Online) */}
                {isOnline && gameState === 'waiting' && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="glass-card rounded-3xl p-10 text-center animate-pulse-glow">
                            <h2 className="text-2xl font-black mb-3">في الانتظار... ⏳</h2>
                            <p className="opacity-60">اللاعب التاني بيكتب الكلمة السرية.</p>
                        </div>
                    </div>
                )}

                {/* Secret Setup */}
                {gameState === 'setup' && (
                    <div className="flex-1 flex items-center justify-center">
                        <SecretSetup onStart={handleStartHost} />
                    </div>
                )}

                {/* Playing / Won / Lost */}
                {(gameState === 'playing' || gameState === 'won' || gameState === 'lost') && (
                    <div className="flex-1 flex flex-col">
                        <Visualizer lives={lives} maxLives={6} />

                        <div className="text-center mb-4 h-14 flex items-center justify-center">
                            {hint && lives <= 2 && gameState === 'playing' && !isHintRevealed && (
                                <button
                                    onClick={handleRevealHint}
                                    disabled={isOnline && isMyTurnToWrite}
                                    className="glow-button px-6 py-3 rounded-full text-sm font-black disabled:opacity-40 animate-pulse-glow"
                                >
                                    {(isOnline && isMyTurnToWrite) ? 'الطرف التاني يقدر يفتح التلميح دلوقتي' : '💡 محتاج تلميح؟'}
                                </button>
                            )}
                            {isHintRevealed && hint && (
                                <div className="glass-card rounded-2xl py-2 px-6 animate-pop-in">
                                    <span className="opacity-50 text-xs block">تلميح</span>
                                    <span className="font-black">{hint}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap justify-center gap-2 mx-auto w-full max-w-sm mb-4" dir="rtl">
                            {secretWord.split('').map((char, index) => {
                                if (char === ' ') return <div key={index} className="w-4 h-12" />;
                                const isRevealed = guessedLetters.includes(char) || gameState !== 'playing' || (isOnline && isMyTurnToWrite);
                                const isMissed = gameState === 'lost' && !guessedLetters.includes(char);
                                const showChar = isOnline
                                    ? ((isRevealed && !isMyTurnToWrite) || isMyTurnToWrite)
                                    : isRevealed;

                                return (
                                    <div
                                        key={index}
                                        className={`letter-tile w-11 h-12 flex items-center justify-center text-xl font-black rounded-xl transition-all duration-400
                      ${isRevealed ? 'revealed' : ''} ${isMissed ? 'wrong' : ''}
                    `}
                                    >
                                        {showChar ? (
                                            <span className={isMyTurnToWrite && !guessedLetters.includes(char) && gameState === 'playing' ? 'opacity-20' : ''}>
                                                {char}
                                            </span>
                                        ) : ''}
                                    </div>
                                );
                            })}
                        </div>

                        {gameState === 'playing' && (
                            <div className="mt-auto pb-6">
                                <VirtualKeyboard
                                    onLetterPress={handleKeyboardPress}
                                    guessedLetters={guessedLetters}
                                    disabled={isOnline && isMyTurnToWrite}
                                />
                            </div>
                        )}

                        {(gameState === 'won' || gameState === 'lost') && (
                            <div className="flex-1 flex items-center justify-center pb-10">
                                <div className="glass-card rounded-3xl p-8 text-center w-full animate-pop-in"
                                    style={{ boxShadow: gameState === 'won' ? '0 0 40px rgba(52,211,153,0.25)' : '0 0 40px rgba(239,68,68,0.2)' }}>
                                    <h2 className={`text-5xl font-black mb-3 ${gameState === 'won' ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.8)]' : 'text-rose-400 drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]'}`}>
                                        {gameState === 'won' ? '🎉 كسبت!' : '💔 خسرت!'}
                                    </h2>
                                    <p className="opacity-60 mb-6 font-bold text-sm">الكلمة كانت: <span style={{ color: 'var(--primary-color)' }} className="text-base font-black">{secretWord}</span></p>
                                    <button onClick={handleRestartAction} className="glow-button w-full h-14 rounded-2xl text-lg font-black flex items-center justify-center gap-2">
                                        <RotateCcw size={20} /> العبوا دور جديد
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
