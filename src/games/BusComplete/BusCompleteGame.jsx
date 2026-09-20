import React, { useState, useRef, useEffect, useCallback } from 'react';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import PlayerGameHeader from '../../components/PlayerGameHeader';
import ConnectionPauseOverlay from '../../components/ConnectionPauseOverlay';
import EmotesOverlay from '../../components/EmotesOverlay';
import Logo from '../../components/Logo';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import User from 'lucide-react/dist/esm/icons/user';
import Heart from 'lucide-react/dist/esm/icons/heart';
import Package from 'lucide-react/dist/esm/icons/package';
import Feather from 'lucide-react/dist/esm/icons/feather';
import Leaf from 'lucide-react/dist/esm/icons/leaf';
import Globe from 'lucide-react/dist/esm/icons/globe';
import Star from 'lucide-react/dist/esm/icons/star';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Check from 'lucide-react/dist/esm/icons/check';
import X from 'lucide-react/dist/esm/icons/x';
import { playSound, playHaptic } from '../../lib/audioEngine';
import useProfile from '../../hooks/useProfile';
import { IconBusComplete } from '../../components/icons/GameIcons';

/**
 * BusCompleteGame (أتوبيس كومبليت)
 */

// All 28 Arabic letters
const ARABIC_LETTERS = [
    'أ','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص',
    'ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','ه','و','ي'
];

const ENGLISH_LETTERS = [
    'A','B','C','D','E','F','G','H','I','J','K','L','M',
    'N','O','P','Q','R','S','T','U','V','W','X','Y','Z'
];

const CATEGORIES = [
    { key: 'boy',     label: 'اسم ولد',            Icon: User },
    { key: 'girl',    label: 'اسم بنت',            Icon: Heart },
    { key: 'thing',   label: 'جماد',               Icon: Package },
    { key: 'animal',  label: 'حيوان',              Icon: Feather },
    { key: 'plant',   label: 'نبات أو أكلة أو فاكهة', Icon: Leaf },
    { key: 'country', label: 'بلد',                Icon: Globe },
    { key: 'celeb',   label: 'شخصية مشهورة',       Icon: Star },
];

const EMPTY_ANSWERS = () => Object.fromEntries(CATEGORIES.map(c => [c.key, '']));

const randomLetter = (exclude = '', mode = 'ar') => {
    const letters = mode === 'en' ? ENGLISH_LETTERS : ARABIC_LETTERS;
    let l;
    do { l = letters[Math.floor(Math.random() * letters.length)]; }
    while (l === exclude && letters.length > 1);
    return l;
};

// ── Arabic Normalization & Accurate Validation ──────────────────────────────
const normalizeArabic = (s) => {
    if (!s) return '';
    return s
        .trim()
        .replace(/[إأآٱ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[\u064B-\u065F]/g, ''); // strip Arabic tashkeel / diacritics
};

export const isValidAnswer = (word, targetLetter, mode = 'ar') => {
    if (!word || typeof word !== 'string') return { valid: false, reason: 'فارغ' };
    const trimmed = word.trim();

    // 1. Length check: Minimum 2 characters (rejects single letter entries)
    if (trimmed.length < 2) {
        return { valid: false, reason: 'أقصر من حرفين' };
    }

    if (mode === 'en') {
        const englishOnlyRegex = /^[A-Za-z\s\-]+$/;
        if (!englishOnlyRegex.test(trimmed)) {
            return { valid: false, reason: 'حروف غير إنجليزية' };
        }
        
        // Diversity check
        const cleanLetters = trimmed.replace(/[\s\-]/g, '');
        if (cleanLetters.length < 2) return { valid: false, reason: 'أقصر من حرفين' };
        const uniqueChars = new Set(cleanLetters.toUpperCase().split(''));
        if (uniqueChars.size < 2) return { valid: false, reason: 'حروف مكررة' };

        // Starts with target letter
        if (trimmed.toUpperCase().startsWith(targetLetter.toUpperCase())) {
            return { valid: true };
        }
        return { valid: false, reason: `لا يبدأ بحرف "${targetLetter}"` };
    }

    // 2. Arabic characters only (no numbers, punctuation, english letters)
    const arabicOnlyRegex = /^[\u0600-\u06FF\s\-]+$/;
    if (!arabicOnlyRegex.test(trimmed)) {
        return { valid: false, reason: 'حروف غير عربية' };
    }

    // 3. Diversity check: cannot be just the same letter repeated (e.g. "اا", "ببب", "ووو")
    const cleanLetters = trimmed.replace(/[\s\-]/g, '');
    if (cleanLetters.length < 2) {
        return { valid: false, reason: 'أقصر من حرفين' };
    }
    const uniqueChars = new Set(cleanLetters.split(''));
    if (uniqueChars.size < 2) {
        return { valid: false, reason: 'حروف مكررة' };
    }

    // 4. Starts with target letter (allowing for 'ال' prefix)
    const normLetter = normalizeArabic(targetLetter);
    const normWord   = normalizeArabic(trimmed);

    // Direct match
    if (normWord.startsWith(normLetter)) {
        return { valid: true };
    }

    // Match after "ال" (e.g. "البرازيل" for letter ب, "الأسد" for letter أ)
    if (normWord.startsWith('ال') && normWord.length >= 3) {
        const afterAl = normWord.slice(2);
        if (afterAl.startsWith(normLetter)) {
            return { valid: true };
        }
    }

    return { valid: false, reason: `لا يبدأ بحرف "${targetLetter}"` };
};

const areWordsSame = (word1, word2, mode = 'ar') => {
    if (!word1 || !word2) return false;
    if (mode === 'en') {
        const w1 = word1.trim().toUpperCase();
        const w2 = word2.trim().toUpperCase();
        return w1.length > 0 && w1 === w2;
    }
    const w1 = normalizeArabic(word1).replace(/^ال/, '').replace(/[\s\-]/g, '');
    const w2 = normalizeArabic(word2).replace(/^ال/, '').replace(/[\s\-]/g, '');
    return w1.length > 0 && w1 === w2;
};

// ── Scoring Logic ──────────────────────────────────────────────────────────
const calcRoundScores = (myAnswers, oppAnswers, letter, manualOverrides = {}, mode = 'ar') => {
    let myScore = 0, oppScore = 0;
    const breakdown = {};

    CATEGORIES.forEach(cat => {
        const mine   = (myAnswers?.[cat.key]  || '').trim();
        const theirs = (oppAnswers?.[cat.key] || '').trim();

        const myVal  = isValidAnswer(mine, letter, mode);
        const oppVal = isValidAnswer(theirs, letter, mode);

        let mineValid   = myVal.valid;
        let theirsValid = oppVal.valid;

        // Apply manual override if player toggled validity in review screen
        if (manualOverrides[`mine_${cat.key}`] !== undefined) {
            mineValid = manualOverrides[`mine_${cat.key}`];
        }
        if (manualOverrides[`opp_${cat.key}`] !== undefined) {
            theirsValid = manualOverrides[`opp_${cat.key}`];
        }

        const isDup = mineValid && theirsValid && areWordsSame(mine, theirs, mode);

        let myPts = 0, oppPts = 0;
        if (isDup) {
            myPts  = 5;
            oppPts = 5;
        } else {
            if (mineValid)   myPts  = 10;
            if (theirsValid) oppPts = 10;
        }

        myScore  += myPts;
        oppScore += oppPts;

        breakdown[cat.key] = {
            isDup,
            mineValid,
            theirsValid,
            mineReason: myVal.reason,
            oppReason:  oppVal.reason,
            myPts,
            oppPts
        };
    });

    return { myScore, oppScore, breakdown };
};

export default function BusCompleteGame({ setView }) {
    const connRef       = useRef(null);
    const isHostRef     = useRef(false);
    const [myProfile]   = useProfile();
    const [oppProfile, setOppProfile] = useState(null);

    // States: lobby → setup → waiting-letter | picking-letter → reveal → playing → review → scoreboard
    const [gameState, setGameState] = useState('lobby');
    const [letter, setLetter]       = useState('');
    const [mode, setMode]           = useState('ar'); // 'ar' | 'en'
    const [myAnswers, setMyAnswers] = useState(EMPTY_ANSWERS());
    const [oppAnswers, setOppAnswers] = useState(null);
    const [busCallerName, setBusCallerName] = useState('');
    const [inputsLocked, setInputsLocked]   = useState(false);

    // Scores & Round State
    const [myRoundScore,  setMyRoundScore]  = useState(0);
    const [oppRoundScore, setOppRoundScore] = useState(0);
    const [breakdown, setBreakdown]         = useState({});
    const [scores, setScores]               = useState({ me: 0, opp: 0 });
    const [round, setRound]                 = useState(1);
    const [manualOverrides, setManualOverrides] = useState({});

    // Refs for real-time consistency
    const scoresRef          = useRef({ me: 0, opp: 0 });
    const roundRef           = useRef(1);
    const myAnswersRef       = useRef(EMPTY_ANSWERS());
    const inputsLockedRef    = useRef(false);
    const oppAnswersRef      = useRef(null);
    const currentLetterRef   = useRef('');
    const modeRef            = useRef('ar');
    const scoredRoundKeyRef  = useRef('');
    const usedLettersRef     = useRef([]);
    const onDataRef          = useRef(null);

    // Keep refs in sync with state
    useEffect(() => {
        scoresRef.current = scores;
    }, [scores]);

    useEffect(() => {
        roundRef.current = round;
    }, [round]);

    // ── helpers ───────────────────────────────────────────────────────────
    const updateMyAnswer = (key, value) => {
        if (inputsLockedRef.current) return;
        playSound('type');
        const updated = { ...myAnswersRef.current, [key]: value };
        myAnswersRef.current = updated;
        setMyAnswers(updated);
    };

    const resetRound = () => {
        const empty = EMPTY_ANSWERS();
        setMyAnswers(empty);
        myAnswersRef.current = empty;
        setOppAnswers(null);
        oppAnswersRef.current = null;
        setBusCallerName('');
        setInputsLocked(false);
        inputsLockedRef.current = false;
        setMyRoundScore(0);
        setOppRoundScore(0);
        setBreakdown({});
        setManualOverrides({});
    };

    // ── pick & send a new letter (host only) ─────────────────────────────
    const pickAndSendLetter = (excludeLetter = '', targetRound = null, startMode = null) => {
        const gameMode = startMode || modeRef.current;
        const l = randomLetter(excludeLetter, gameMode);
        usedLettersRef.current.push(l);
        currentLetterRef.current = l;
        setLetter(l);
        resetRound();
        const nextR = targetRound || roundRef.current;
        connRef.current?.send({
            type: 'start_round',
            letter: l,
            mode: gameMode,
            scores: { host: scoresRef.current.me, guest: scoresRef.current.opp },
            round: nextR
        });
        setGameState('reveal');
        setTimeout(() => setGameState('playing'), 2500);
        playSound('ding');
    };

    // ── Reroll letter (host only, before inputs are locked) ──────────────
    const handleRerollLetter = () => {
        if (!isHostRef.current) return;
        playSound('click');
        playHaptic(20);
        pickAndSendLetter(currentLetterRef.current);
    };

    // ── network ───────────────────────────────────────────────────────────
    const handleGameStart = (conn, hostMode, oppProf) => {
        isHostRef.current = hostMode;
        connRef.current   = conn;
        if (oppProf) setOppProfile(oppProf);
        conn.on('data', (msg) => {
            if (onDataRef.current) onDataRef.current(msg);
        });
        if (hostMode) {
            setGameState('setup');
        } else {
            setGameState('waiting-letter');
        }
    };

    const onData = useCallback((msg) => {
        if (!msg || !msg.type) return;

        switch (msg.type) {
            case 'start_round':
                currentLetterRef.current = msg.letter;
                setLetter(msg.letter);
                if (msg.mode) {
                    setMode(msg.mode);
                    modeRef.current = msg.mode;
                }
                resetRound();
                if (msg.scores) {
                    const syncedScores = {
                        me: msg.scores.guest,
                        opp: msg.scores.host
                    };
                    scoresRef.current = syncedScores;
                    setScores(syncedScores);
                }
                if (msg.round) {
                    roundRef.current = msg.round;
                    setRound(msg.round);
                }
                setGameState('reveal');
                playSound('ding');
                playHaptic(20);
                setTimeout(() => setGameState('playing'), 2500);
                break;

            case 'bus': {
                const callerName = msg.caller;
                setBusCallerName(callerName);
                inputsLockedRef.current = true;
                setInputsLocked(true);
                playSound('lose');
                playHaptic([40, 40, 80]);

                if (msg.answers) {
                    oppAnswersRef.current = msg.answers;
                    setOppAnswers(msg.answers);
                }

                // Send our current answers immediately so both can review
                connRef.current?.send({ type: 'answers', answers: myAnswersRef.current });

                if (msg.answers || oppAnswersRef.current) {
                    setGameState('review');
                }
                break;
            }

            case 'answers':
                oppAnswersRef.current = msg.answers;
                setOppAnswers(msg.answers);
                if (inputsLockedRef.current) {
                    setGameState('review');
                }
                break;

            case 'sync_round_scores':
                if (msg.scores) {
                    const syncedScores = {
                        me: msg.scores.guest,
                        opp: msg.scores.host
                    };
                    scoresRef.current = syncedScores;
                    setScores(syncedScores);
                }
                if (msg.round) {
                    roundRef.current = msg.round;
                    setRound(msg.round);
                }
                if (msg.myRoundScore !== undefined && msg.oppRoundScore !== undefined) {
                    // Host's opp is Guest's my
                    setMyRoundScore(msg.oppRoundScore);
                    setOppRoundScore(msg.myRoundScore);
                }
                break;

            case 'override_validity':
                if (msg.catKey) {
                    setManualOverrides(prev => {
                        const updated = {
                            ...prev,
                            [`${msg.target}_${msg.catKey}`]: msg.newVal
                        };
                        return updated;
                    });
                }
                break;

            case 'go_to_scoreboard':
                setGameState('scoreboard');
                break;

            case 'restart':
                doRestart(false);
                break;

            default: break;
        }
    }, []); // eslint-disable-line

    onDataRef.current = onData;

    // ── Setup (Host) ──────────────────────────────────────────────────────
    const handleSetupComplete = (selectedMode) => {
        setMode(selectedMode);
        modeRef.current = selectedMode;
        pickAndSendLetter('', 1, selectedMode);
    };

    // ── bus! ──────────────────────────────────────────────────────────────
    const handleCallBus = () => {
        if (inputsLockedRef.current) return;
        playSound('win');
        playHaptic([50, 30, 80]);
        inputsLockedRef.current = true;
        setInputsLocked(true);
        const myName = myProfile?.nickname || 'أنت';
        setBusCallerName(myName);

        connRef.current?.send({ type: 'bus', caller: myName, answers: myAnswersRef.current });
        connRef.current?.send({ type: 'answers', answers: myAnswersRef.current });

        if (oppAnswersRef.current) {
            setGameState('review');
        }
    };

    // ── Auto-Score calculation & cumulative score update when entering review ──
    useEffect(() => {
        if (gameState === 'review' && oppAnswers && currentLetterRef.current) {
            const roundKey = `${currentLetterRef.current}_${round}`;
            const result = calcRoundScores(myAnswers, oppAnswers, currentLetterRef.current, manualOverrides, modeRef.current);
            setMyRoundScore(result.myScore);
            setOppRoundScore(result.oppScore);
            setBreakdown(result.breakdown);

            // Accumulate cumulative score once per round
            if (scoredRoundKeyRef.current !== roundKey) {
                scoredRoundKeyRef.current = roundKey;

                setScores(prev => {
                    const newScores = {
                        me:  prev.me  + result.myScore,
                        opp: prev.opp + result.oppScore
                    };
                    scoresRef.current = newScores;

                    // If host, sync authoritative scores to guest
                    if (isHostRef.current) {
                        connRef.current?.send({
                            type: 'sync_round_scores',
                            scores: { host: newScores.me, guest: newScores.opp },
                            round,
                            myRoundScore: result.myScore,
                            oppRoundScore: result.oppScore
                        });
                    }
                    return newScores;
                });
            }
        }
    }, [gameState, oppAnswers, round, manualOverrides, myAnswers]);

    // ── Manual toggle for disputed answers ────────────────────────────────
    const handleToggleValidity = (target, catKey) => {
        playSound('click');
        const key = `${target}_${catKey}`;
        const currentVal = breakdown[catKey]?.[target === 'mine' ? 'mineValid' : 'theirsValid'];
        const newVal = !currentVal;

        setManualOverrides(prev => ({
            ...prev,
            [key]: newVal
        }));

        // Notify opponent (our 'mine' is their 'opp', our 'opp' is their 'mine')
        connRef.current?.send({
            type: 'override_validity',
            catKey,
            target: target === 'mine' ? 'opp' : 'mine',
            newVal
        });
    };

    // ── go to scoreboard (synced for both players) ────────────────────────
    const handleGoToScoreboard = () => {
        playSound('click');
        connRef.current?.send({ type: 'go_to_scoreboard' });
        setGameState('scoreboard');
    };

    // ── start new round (host only, from scoreboard) ─────────────────────
    const handleStartNewRound = () => {
        playSound('click');
        playHaptic(15);
        const nextRound = round + 1;
        setRound(nextRound);
        roundRef.current = nextRound;
        pickAndSendLetter(currentLetterRef.current, nextRound);
    };

    // ── restart ───────────────────────────────────────────────────────────
    const handleRestart = () => {
        playSound('click');
        connRef.current?.send({ type: 'restart' });
        doRestart(true);
    };

    const doRestart = (isInitiator) => {
        resetRound();
        setRound(1);
        roundRef.current = 1;
        scoresRef.current = { me: 0, opp: 0 };
        setScores({ me: 0, opp: 0 });
        scoredRoundKeyRef.current = '';
        usedLettersRef.current = [];

        if (isHostRef.current && isInitiator) {
            setGameState('setup');
        } else if (!isHostRef.current && !isInitiator) {
            setGameState('waiting-letter');
        } else if (isHostRef.current && !isInitiator) {
            setGameState('setup');
        } else {
            setGameState('waiting-letter');
        }
    };

    // ── render ────────────────────────────────────────────────────────────
    return (
        <>
            <div className="animated-bg"><div className="bg-orb-3" /></div>
            <div className="min-h-dvh max-w-md mx-auto px-4 flex flex-col safe-area-pt overflow-x-hidden overflow-y-auto pb-6">

                {/* Header */}
                {gameState !== 'lobby' ? (
                    <PlayerGameHeader
                        title="أتوبيس كومبليت"
                        gameId="bus"
                        simultaneous={gameState === 'playing' || gameState === 'review' || gameState === 'reveal'}
                        isMyTurn={false}
                        oppProfile={oppProfile}
                        myScore={scores.me}
                        oppScore={scores.opp}
                        statusText={
                            gameState === 'playing' ? 'اكتب بسرعة قبل ما حد يقول أتوبيس!' :
                            gameState === 'review' ? 'مراجعة وتصحيح الإجابات' :
                            gameState === 'scoreboard' ? `الجولة ${round} — إجمالي النقاط` : null
                        }
                        onLeave={() => { connRef.current?.close(); setView('hub'); }}
                    />
                ) : (
                    <div className="grid grid-cols-3 items-center py-4 mb-4">
                        <div><Logo size="small" /></div>
                        <div className="flex justify-center"><span className="text-sm font-black opacity-70">أتوبيس كومبليت</span></div>
                        <div className="flex justify-end"><button onClick={() => setView('hub')} className="glass-card px-4 py-2 rounded-2xl text-xs font-bold hover:scale-105 transition-transform">الرئيسية</button></div>
                    </div>
                )}

                {/* Lobby */}
                {gameState === 'lobby' && (
                    <div className="flex-1 flex pb-16 safe-area-pb">
                        <P2PConnectionManager gameIdPrefix="celia-bus" onGameStart={handleGameStart} />
                    </div>
                )}

                {/* Host Setup */}
                {gameState === 'setup' && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in gap-4 px-4">
                        <div className="glass-card p-8 rounded-3xl text-center w-full max-w-sm">
                            <h2 className="text-2xl font-black mb-6">اختر اللغة</h2>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => handleSetupComplete('ar')}
                                    className="flex-1 p-4 rounded-2xl glow-button font-black border border-white/20"
                                >
                                    عربي
                                </button>
                                <button
                                    onClick={() => handleSetupComplete('en')}
                                    className="flex-1 p-4 rounded-2xl bg-white/10 hover:bg-white/20 font-black border border-white/20 transition-all"
                                >
                                    English
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Guest Waiting for letter */}
                {gameState === 'waiting-letter' && (
                    <div className="flex-1 flex items-center justify-center animate-fade-in">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center border border-emerald-400/30 shadow-2xl">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-4">
                                <IconBusComplete size={36} />
                            </div>
                            <h2 className="text-2xl font-black mb-2">في انتظار الحرف...</h2>
                            <p className="opacity-60 text-sm font-bold">
                                {oppProfile?.nickname || 'المضيف'} بيختار الحرف
                            </p>
                        </div>
                    </div>
                )}

                {/* Letter Reveal Splash */}
                {gameState === 'reveal' && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in gap-4">
                        <p className="opacity-60 font-bold text-sm">الحرف المختار هو...</p>
                        <div
                            key={letter}
                            className="text-[140px] font-black leading-none animate-pop-in"
                            style={{ color: 'var(--primary-color)', textShadow: '0 0 60px var(--primary-glow)' }}
                        >
                            {letter}
                        </div>
                        {/* Reroll button — host only, during reveal */}
                        {isHostRef.current && (
                            <button
                                onClick={handleRerollLetter}
                                className="glass-card flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-amber-400 border border-amber-400/30 hover:scale-105 active:scale-95 transition-all"
                            >
                                <RefreshCw size={15} />
                                تغيير الحرف
                            </button>
                        )}
                        <p className="opacity-50 text-sm font-bold animate-pulse">جهّز نفسك للكتابة معاً!</p>
                    </div>
                )}

                {/* Playing */}
                {gameState === 'playing' && (
                    <div className="flex-1 flex flex-col animate-fade-in gap-4">

                        {/* Letter display + reroll (host only) */}
                        <div className="flex items-center justify-between gap-3">
                            <div className="glass-card rounded-2xl px-5 py-2 flex items-center gap-3 flex-1 border border-white/5">
                                <span className="text-xs opacity-60 font-bold">الحرف:</span>
                                <span className="text-4xl font-black" style={{ color: 'var(--primary-color)' }}>{letter}</span>
                            </div>

                            {/* Reroll: host only, before inputs are locked */}
                            {isHostRef.current && !inputsLocked && (
                                <button
                                    onClick={handleRerollLetter}
                                    className="glass-card w-11 h-11 flex items-center justify-center rounded-2xl text-amber-400 border border-amber-400/30 hover:scale-105 active:scale-95 transition-all shrink-0"
                                    title="تغيير الحرف"
                                >
                                    <RefreshCw size={16} />
                                </button>
                            )}

                            {inputsLocked && (
                                <div className="glass-card rounded-2xl px-4 py-2 text-xs font-black text-amber-400 animate-pulse border border-amber-400/30">
                                    جاري التصحيح...
                                </div>
                            )}
                        </div>

                        {busCallerName && (
                            <div className="glass-card rounded-2xl p-3 text-center border border-amber-400/40 animate-pop-in">
                                <p className="text-amber-400 font-black text-sm">
                                    {busCallerName} قال أتوبيس كومبليت!
                                </p>
                            </div>
                        )}

                        {/* Category inputs */}
                        <div className="flex flex-col gap-2.5">
                            {CATEGORIES.map(cat => {
                                const currentWord = myAnswers[cat.key] || '';
                                const validation = isValidAnswer(currentWord, letter);
                                return (
                                    <div key={cat.key} className="glass-card rounded-2xl p-3 flex items-center gap-3 border border-white/5">
                                        <div className="w-10 h-10 rounded-xl glass-card flex items-center justify-center shrink-0 text-emerald-400">
                                            {cat.Icon && <cat.Icon size={18} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] opacity-50 font-bold mb-1">{cat.label}</p>
                                            <input
                                                type="text"
                                                value={currentWord}
                                                onChange={e => updateMyAnswer(cat.key, e.target.value)}
                                                disabled={inputsLocked}
                                                placeholder={mode === 'en' ? `Write a ${cat.key} starting with "${letter}"` : `اكتب ${cat.label} بحرف "${letter}"`}
                                                dir={mode === 'en' ? 'ltr' : 'rtl'}
                                                className="w-full bg-transparent outline-none font-bold text-sm placeholder:opacity-30 disabled:opacity-40"
                                                maxLength={30}
                                            />
                                        </div>
                                        {currentWord && (
                                            validation.valid
                                                ? <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                                                : <AlertTriangle size={16} className="text-amber-400 shrink-0" title={validation.reason} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Bus button */}
                        {!inputsLocked && (
                            <button
                                onClick={handleCallBus}
                                className="mt-2 h-16 rounded-2xl font-black text-lg w-full flex items-center justify-center gap-2 transition-all active:scale-95 hover:scale-102"
                                style={{
                                    background: 'linear-gradient(135deg, #16a34a, #166534)',
                                    boxShadow: '0 8px 32px rgba(22,163,74,0.4)',
                                    border: '2px solid rgba(74,222,128,0.4)',
                                }}
                            >
                                <span className="flex items-center gap-2">
                                    <IconBusComplete size={22} />
                                    أتوبيس كومبليت!
                                </span>
                            </button>
                        )}

                        {/* Waiting for opponent answers after bus */}
                        {inputsLocked && !oppAnswers && (
                            <div className="text-center opacity-50 text-sm font-bold animate-pulse mt-2">
                                في انتظار استلام إجابات {oppProfile?.nickname || 'الخصم'}...
                            </div>
                        )}
                    </div>
                )}

                {/* Review Phase */}
                {gameState === 'review' && oppAnswers && (
                    <div className="flex-1 flex flex-col animate-fade-in gap-4">
                        <div className="text-center">
                            <h2 className="text-xl font-black">مراجعة وتصحيح الإجابات</h2>
                            <p className="text-xs opacity-60 font-bold">الحرف: <span style={{ color: 'var(--primary-color)' }}>{letter}</span></p>
                        </div>

                        {/* Answers table */}
                        <div className="flex flex-col gap-2">
                            {/* Header row */}
                            <div className="grid grid-cols-3 gap-2 px-2 text-xs font-black opacity-60">
                                <span className="text-center">الفئة</span>
                                <span className="text-center">أنت</span>
                                <span className="text-center">{oppProfile?.nickname || 'الخصم'}</span>
                            </div>

                            {CATEGORIES.map(cat => {
                                const mine   = (myAnswers[cat.key]  || '').trim();
                                const theirs = (oppAnswers[cat.key] || '').trim();
                                const bd     = breakdown[cat.key] || {};
                                const isDup  = bd.isDup;

                                return (
                                    <div
                                        key={cat.key}
                                        className={`glass-card rounded-2xl p-3 grid grid-cols-3 gap-2 items-center border transition-colors ${
                                            isDup ? 'border-amber-400/40 bg-amber-500/10' : 'border-white/5'
                                        }`}
                                    >
                                        {/* Category Icon & Label */}
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="text-emerald-400">
                                                {cat.Icon && <cat.Icon size={18} />}
                                            </div>
                                            <span className="text-[10px] opacity-60 font-bold">{cat.label}</span>
                                        </div>

                                        {/* My answer with tap-to-toggle option */}
                                        <div className="text-center flex flex-col items-center justify-center">
                                            <p className={`text-sm font-bold ${
                                                bd.mineValid ? 'text-emerald-400' : mine ? 'text-rose-400 line-through opacity-70' : 'opacity-30'
                                            }`}>
                                                {mine || '—'}
                                            </p>
                                            {mine ? (
                                                <button
                                                    onClick={() => handleToggleValidity('mine', cat.key)}
                                                    className={`mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all ${
                                                        bd.mineValid
                                                            ? isDup ? 'bg-amber-400/20 text-amber-400' : 'bg-emerald-400/20 text-emerald-400'
                                                            : 'bg-rose-500/20 text-rose-400'
                                                    }`}
                                                    title="اضغط للتعديل اليدوي إن أردت"
                                                >
                                                    {bd.mineValid ? (
                                                        <><Check size={10} /> {bd.myPts} نقطة</>
                                                    ) : (
                                                        <><X size={10} /> {bd.mineReason || '0 نقطة'}</>
                                                    )}
                                                </button>
                                            ) : (
                                                <span className="text-[10px] opacity-40">0 نقطة</span>
                                            )}
                                        </div>

                                        {/* Opponent answer with tap-to-toggle option */}
                                        <div className="text-center flex flex-col items-center justify-center">
                                            <p className={`text-sm font-bold ${
                                                bd.theirsValid ? 'text-sky-400' : theirs ? 'text-rose-400 line-through opacity-70' : 'opacity-30'
                                            }`}>
                                                {theirs || '—'}
                                            </p>
                                            {theirs ? (
                                                <button
                                                    onClick={() => handleToggleValidity('opp', cat.key)}
                                                    className={`mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all ${
                                                        bd.theirsValid
                                                            ? isDup ? 'bg-amber-400/20 text-amber-400' : 'bg-sky-400/20 text-sky-400'
                                                            : 'bg-rose-500/20 text-rose-400'
                                                    }`}
                                                    title="اضغط للتعديل اليدوي إن أردت"
                                                >
                                                    {bd.theirsValid ? (
                                                        <><Check size={10} /> {bd.oppPts} نقطة</>
                                                    ) : (
                                                        <><X size={10} /> {bd.oppReason || '0 نقطة'}</>
                                                    )}
                                                </button>
                                            ) : (
                                                <span className="text-[10px] opacity-40">0 نقطة</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-3 justify-center text-[10px] font-bold opacity-60 flex-wrap">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> كلمة مختلفة = 10</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> إجابة متطابقة = 5</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" /> خطأ أو أقصر من حرفين = 0</span>
                        </div>

                        {/* Round totals */}
                        <div className="glass-card rounded-2xl p-4 grid grid-cols-2 gap-4 border border-white/10 text-center">
                            <div>
                                <p className="text-xs opacity-60 font-bold mb-1">نقاط الجولة لك</p>
                                <p className="text-4xl font-black text-emerald-400">{myRoundScore}</p>
                            </div>
                            <div>
                                <p className="text-xs opacity-60 font-bold mb-1">نقاط {oppProfile?.nickname || 'الخصم'}</p>
                                <p className="text-4xl font-black text-sky-400">{oppRoundScore}</p>
                            </div>
                        </div>

                        <button
                            onClick={handleGoToScoreboard}
                            className="glow-button w-full h-14 rounded-2xl text-base font-black"
                        >
                            لوحة النتائج
                        </button>
                    </div>
                )}

                {/* Scoreboard */}
                {gameState === 'scoreboard' && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in gap-5 px-2">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center border border-white/10 shadow-2xl">
                            <h2 className="text-2xl font-black mb-1">لوحة النتائج</h2>
                            <p className="opacity-60 text-xs mb-6">الجولة {round} — إجمالي النقاط التراكمي</p>
                            <div className="flex gap-4 justify-center mb-6">
                                <div className={`flex-1 rounded-2xl p-5 ${scores.me > scores.opp ? 'bg-emerald-500/20 border border-emerald-400/40' : 'glass-card'}`}>
                                    <p className="text-xs opacity-60 font-bold mb-1">أنت</p>
                                    <p className="text-5xl font-black text-emerald-400">{scores.me}</p>
                                </div>
                                <div className={`flex-1 rounded-2xl p-5 ${scores.opp > scores.me ? 'bg-sky-500/20 border border-sky-400/40' : 'glass-card'}`}>
                                    <p className="text-xs opacity-60 font-bold mb-1">{oppProfile?.nickname || 'الخصم'}</p>
                                    <p className="text-5xl font-black text-sky-400">{scores.opp}</p>
                                </div>
                            </div>
                            {scores.me === scores.opp ? (
                                <p className="text-xs font-black text-amber-400">تعادل في مجموع النقاط!</p>
                            ) : scores.me > scores.opp ? (
                                <p className="text-xs font-black text-emerald-400">أنت متقدم في النتيجة!</p>
                            ) : (
                                <p className="text-xs font-black text-sky-400">{oppProfile?.nickname || 'الخصم'} متقدم في النتيجة!</p>
                            )}
                        </div>
                        <div className="flex gap-3 w-full max-w-sm">
                            <button
                                onClick={handleRestart}
                                className="glass-card flex-1 h-14 rounded-2xl font-bold flex items-center justify-center gap-2 text-xs"
                            >
                                <RotateCcw size={16} /> إعادة الكل
                            </button>
                            {isHostRef.current ? (
                                <button
                                    onClick={handleStartNewRound}
                                    className="glow-button flex-[2] h-14 rounded-2xl font-black flex items-center justify-center gap-2"
                                >
                                    <RefreshCw size={16} />
                                    جولة جديدة
                                </button>
                            ) : (
                                <div className="flex-[2] h-14 glass-card rounded-2xl flex items-center justify-center text-xs opacity-60 font-bold border border-white/5">
                                    في انتظار المضيف لبدء الجولة...
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>

            <ConnectionPauseOverlay
                conn={connRef.current}
                onLeave={() => { connRef.current?.close(); setView('hub'); }}
            />
            {(gameState === 'playing' || gameState === 'review') && (
                <EmotesOverlay conn={connRef.current} oppProfile={oppProfile} showStandaloneButton={false} />
            )}
        </>
    );
}
