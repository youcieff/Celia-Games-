import { useRef } from 'react';
import React, { useState, useEffect } from 'react';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import SecretSetup from './SecretSetup';
import VirtualKeyboard from './VirtualKeyboard';
import Visualizer from './Visualizer';
import Logo from '../../components/Logo';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import GlobalMuteButton from '../../components/GlobalMuteButton';
import useProfile from '../../hooks/useProfile';
import { AvatarDisplay } from '../../components/icons/AvatarIcons';
import EmotesOverlay, { ChatTriggerButton } from '../../components/EmotesOverlay';
import { IconWordGame, IconEdit, IconTrophy, IconHourglass } from '../../components/icons/GameIcons';

export default function WordGame({ setView, mode }) {
    const isOnline = mode === 'online';

    const connRef = useRef(null);
    const isHostRef = useRef(false);
    const [isMyTurnToWrite, setIsMyTurnToWrite] = useState(false);

    const [myProfile] = useProfile();
    const [oppProfile, setOppProfile] = useState(null);
    const opp = oppProfile || { nickname: 'الخصم', avatar: 'alien' };

    // lobby | role-select | role-waiting | setup | waiting | playing | won | lost
    const [gameState, setGameState] = useState(isOnline ? 'lobby' : 'role-select');
    const [secretWord, setSecretWord] = useState('');
    const [hint, setHint] = useState('');
    const [guessedLetters, setGuessedLetters] = useState([]);
    const [lives, setLives] = useState(6);
    const [isHintRevealed, setIsHintRevealed] = useState(false);

    const handleGameStart = (conn, hostMode, oppProf) => {
        connRef.current = conn;
        isHostRef.current = hostMode;
        if (oppProf) setOppProfile(oppProf);
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
            connRef.current.send({ type: 'roles_set', guestWrites: !hostWrites });
        }
    };

    useEffect(() => {
        const conn = connRef.current;
        if (!conn) return;
        const handler = (data) => {
            if (data.type === 'global_ready' && data.profile) {
                setOppProfile(data.profile);
            } else if (data.type === 'roles_set') {
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
                {/* Clean 3-Column Top Bar */}
                <header className="px-2 py-3 flex items-center justify-between gap-2 w-full z-20">
                    <button
                        onClick={() => { if (connRef.current) connRef.current.close(); setView('hub'); }}
                        className="glass-card w-10 h-10 flex items-center justify-center rounded-2xl hover:scale-105 active:scale-95 transition-all text-white/80 shrink-0"
                        title="الرجوع للرئيسية"
                    >
                        <ArrowRight size={18} />
                    </button>

                    <div className="flex items-center gap-2 glass-card px-3.5 py-1.5 rounded-2xl border border-white/10 shrink-0">
                        <IconWordGame size={18} className="text-[var(--accent)]" />
                        <span className="text-xs font-black gradient-text">خمن الكلمة</span>
                        {isOnline && !['lobby', 'role-select', 'role-waiting'].includes(gameState) && (
                            <span className="text-[10px] text-[var(--accent)] font-bold">
                                {isMyTurnToWrite ? '(الكاتب)' : '(المخمن)'}
                            </span>
                        )}
                        {!isOnline && !['role-select', 'waiting-offline'].includes(gameState) && (
                            <span className="text-[10px] opacity-60 font-bold">موبايل واحد</span>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        {isOnline && !['lobby', 'role-select', 'role-waiting'].includes(gameState) && (
                            <ChatTriggerButton onClick={() => window.dispatchEvent(new CustomEvent('toggle-game-chat'))} />
                        )}
                        <GlobalMuteButton className="w-10 h-10 !rounded-2xl shrink-0" />
                    </div>
                </header>

                {/* Lobby */}
                {isOnline && gameState === 'lobby' && (
                    <div className="flex-1 flex pb-20 safe-area-pb">
                        <P2PConnectionManager gameIdPrefix="celia-word" onGameStart={handleGameStart} />
                    </div>
                )}

                {/* Role Selection */}
                {gameState === 'role-select' && (
                    <div className="flex-1 flex items-center justify-center -mt-6">
                        <div className="glass-card rounded-3xl p-7 w-full max-w-sm text-center animate-pop-in border border-white/10 shadow-2xl">
                            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] mx-auto flex items-center justify-center mb-3">
                                <IconEdit size={24} />
                            </div>
                            <h2 className="text-xl font-black mb-2 gradient-text">مين يكتب؟</h2>
                            <p className="opacity-60 text-xs mb-6 font-bold">
                                {isOnline ? 'اختار مين هيفكر في كلمة ومين هيخمن' : 'اختار مين هيكتب الكلمة السرية'}
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => isOnline ? handleOnlineRoleSelect(true) : handleOfflineRoleSelect(true)}
                                    className="glass-card glass-card-hover rounded-2xl py-5 flex flex-col items-center gap-2 border border-white/10 hover:border-[var(--accent)] transition-all"
                                >
                                    <IconEdit size={26} className="text-[var(--accent)]" />
                                    <span className="text-xs font-black gradient-text">
                                        {isOnline ? 'أنا (الهوست) أكتب' : 'اللاعب الأول يكتب'}
                                    </span>
                                </button>
                                <button
                                    onClick={() => isOnline ? handleOnlineRoleSelect(false) : handleOfflineRoleSelect(false)}
                                    className="glass-card glass-card-hover rounded-2xl py-5 flex flex-col items-center gap-2 border border-white/10 hover:border-[var(--accent)] transition-all"
                                >
                                    <IconWordGame size={26} className="text-[var(--accent)]" />
                                    <span className="text-xs font-black gradient-text">
                                        {isOnline ? 'الطرف الآخر يكتب' : 'اللاعب الثاني يكتب'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Guest waiting for host to assign roles */}
                {isOnline && gameState === 'role-waiting' && (
                    <div className="flex-1 flex items-center justify-center -mt-6">
                        <div className="glass-card rounded-3xl p-8 text-center animate-pulse-glow border border-white/10">
                            <IconHourglass size={36} className="text-[var(--accent)] mx-auto mb-3" />
                            <h2 className="text-xl font-black mb-2 gradient-text">الهوست يحدد الأدوار...</h2>
                            <p className="opacity-60 text-xs font-bold">لحظات قليلة ونبدأ!</p>
                        </div>
                    </div>
                )}

                {/* Offline waiting screen */}
                {!isOnline && gameState === 'waiting-offline' && (
                    <div className="flex-1 flex items-center justify-center -mt-6">
                        <div className="glass-card rounded-3xl p-8 text-center animate-pop-in border border-white/10">
                            <h2 className="text-xl font-black mb-2 gradient-text">اللاعب الثاني يكتب الكلمة</h2>
                            <p className="opacity-60 text-xs mb-6 font-bold">الطرف المخمن يبعد عن الشاشة قليلاً</p>
                            <button
                                onClick={() => { setIsMyTurnToWrite(true); setGameState('setup'); }}
                                className="glow-button w-full h-12 rounded-2xl text-base font-black"
                            >
                                جاهز للبدء
                            </button>
                        </div>
                    </div>
                )}

                {/* Waiting (Online) */}
                {isOnline && gameState === 'waiting' && (
                    <div className="flex-1 flex items-center justify-center -mt-6">
                        <div className="glass-card rounded-3xl p-8 text-center animate-pulse-glow border border-white/10">
                            <IconHourglass size={36} className="text-[var(--accent)] mx-auto mb-3" />
                            <h2 className="text-xl font-black mb-2 gradient-text">في الانتظار...</h2>
                            <p className="opacity-60 text-xs">الطرف الآخر يقوم بكتابة الكلمة السرية.</p>
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
                        {/* Duel bar for Word Game */}
                        {isOnline && (
                            <div className="grid grid-cols-2 gap-2 w-full max-w-sm mx-auto mb-2 px-1">
                                <div className={`glass-card p-2 rounded-xl flex items-center gap-2 border transition-all ${!isMyTurnToWrite ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-white/10 opacity-70'}`}>
                                    <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                                        <AvatarDisplay avatarId={myProfile.avatar} size={18} />
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1 text-right">
                                        <span className="text-[10px] font-black truncate">{myProfile.nickname || 'أنت'}</span>
                                        <span className="text-[9px] font-bold text-emerald-400">{isMyTurnToWrite ? 'الكاتب' : 'المخمن (دورك)'}</span>
                                    </div>
                                </div>
                                <div className={`glass-card p-2 rounded-xl flex items-center gap-2 border transition-all ${isMyTurnToWrite ? 'border-sky-400 bg-sky-500/10' : 'border-white/10 opacity-70'}`}>
                                    <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                                        <AvatarDisplay avatarId={opp.avatar} size={18} />
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1 text-right">
                                        <span className="text-[10px] font-black truncate">{opp.nickname || 'الخصم'}</span>
                                        <span className="text-[9px] font-bold text-sky-400">{!isMyTurnToWrite ? 'الكاتب' : 'المخمن'}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <Visualizer lives={lives} maxLives={6} />

                        <div className="text-center mb-4 h-14 flex items-center justify-center">
                            {hint && lives <= 2 && gameState === 'playing' && !isHintRevealed && (
                                <button
                                    onClick={handleRevealHint}
                                    disabled={isOnline && isMyTurnToWrite}
                                    className="glow-button px-6 py-3 rounded-full text-sm font-black disabled:opacity-40 animate-pulse-glow"
                                >
                                    {(isOnline && isMyTurnToWrite) ? 'الطرف التاني يقدر يفتح التلميح دلوقتي' : 'محتاج تلميح؟'}
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
                                <div className="glass-card rounded-3xl p-8 text-center w-full animate-pop-in border border-white/10 shadow-2xl"
                                    style={{ boxShadow: gameState === 'won' ? '0 0 40px rgba(52,211,153,0.25)' : '0 0 40px rgba(239,68,68,0.2)' }}>
                                    <div className="flex items-center justify-center gap-2 mb-3">
                                        <IconTrophy size={32} className={gameState === 'won' ? 'text-amber-400' : 'text-rose-400'} />
                                    </div>
                                    <h2 className={`text-2xl font-black mb-3 ${gameState === 'won' ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.8)]' : 'text-rose-400 drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]'}`}>
                                        {gameState === 'won' ? 'أنت الفائز البطل!' : 'انتهت اللعبة!'}
                                    </h2>
                                    <p className="opacity-60 mb-6 font-bold text-sm">الكلمة كانت: <span style={{ color: 'var(--accent)' }} className="text-base font-black">{secretWord}</span></p>
                                    <button onClick={handleRestartAction} className="glow-button w-full h-12 rounded-2xl text-base font-black flex items-center justify-center gap-2">
                                        <RotateCcw size={18} /> العبوا دور جديد
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            {isOnline && ['playing', 'won', 'lost'].includes(gameState) && (
                <EmotesOverlay conn={connRef.current} oppProfile={opp} showStandaloneButton={false} />
            )}
        </>
    );
}
