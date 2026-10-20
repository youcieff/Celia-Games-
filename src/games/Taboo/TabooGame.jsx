import React, { useCallback, useEffect, useRef, useState } from 'react';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import PlayerGameHeader from '../../components/PlayerGameHeader';
import EmotesOverlay from '../../components/EmotesOverlay';
import Logo from '../../components/Logo';
import useProfile from '../../hooks/useProfile';
import { triggerDrawEffects, triggerVictoryEffects, triggerDefeatEffects } from '../../lib/effectsEngine';
import { GameIcon } from '../../components/icons/GameIcons';
import CategorySelect from './CategorySelect';
import DescriberView from './DescriberView';
import GuesserView from './GuesserView';
import RoundSummary from './RoundSummary';
import {
    ALL_CATEGORY_IDS, MAX_GUESSES_PER_WORD, MAX_SKIPS_PER_ROUND, ROUND_SECONDS,
    TOTAL_ROUNDS, categoryNames, drawNextWord, findForbiddenTerm, isCorrectGuess,
    mergePlayedWordIds
} from './tabooLogic';

const initialScores = () => ({ p1: 0, p2: 0 });

export default function TabooGame({ setView, mode = 'online' }) {
    const isOnline = mode !== 'local';
    const withChat = mode === 'online';
    const [myProfile] = useProfile();
    const [oppProfile, setOppProfile] = useState(null);
    const [isHost, setIsHost] = useState(false);
    const connRef = useRef(null);
    const dataHandlerRef = useRef(null);
    const finishRoundRef = useRef(null);

    const [gameState, setGameState] = useState(isOnline ? 'lobby' : 'category_select');
    const gameStateRef = useRef(gameState);
    const [selectedCategories, setSelectedCategories] = useState([...ALL_CATEGORY_IDS]);
    const categoriesRef = useRef([...ALL_CATEGORY_IDS]);
    const [roundNumber, setRoundNumber] = useState(1);
    const roundNumberRef = useRef(1);
    const [describerId, setDescriberId] = useState('p1');
    const describerRef = useRef('p1');
    const [scores, setScores] = useState(initialScores);
    const scoresRef = useRef(initialScores());
    const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
    const deadlineRef = useRef(null);
    const lastTimerSentRef = useRef(ROUND_SECONDS);
    const roundEndedRef = useRef(false);

    const [currentCard, setCurrentCard] = useState(null);
    const currentCardRef = useRef(null);
    const roundWordsRef = useRef([]);
    const matchUsedIdsRef = useRef(new Set());
    const [currentClue, setCurrentClue] = useState('');
    const currentClueRef = useRef('');
    const [verbalClueReady, setVerbalClueReady] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const attemptsRef = useRef(0);
    const [guessHistory, setGuessHistory] = useState([]);
    const [guessPending, setGuessPending] = useState(false);
    const [guessFeedback, setGuessFeedback] = useState('');
    const [skipCount, setSkipCount] = useState(0);
    const skipCountRef = useRef(0);
    const [notice, setNotice] = useState('');
    const [summary, setSummary] = useState(null);
    const [winner, setWinner] = useState(null);
    const currentSequenceRef = useRef(0);
    const playerId = isOnline ? (isHost ? 'p1' : 'p2') : null;

    const transition = (nextState) => {
        gameStateRef.current = nextState;
        setGameState(nextState);
    };

    const updateScores = (nextOrUpdate) => {
        const next = typeof nextOrUpdate === 'function' ? nextOrUpdate(scoresRef.current) : nextOrUpdate;
        scoresRef.current = next;
        setScores(next);
        return next;
    };

    const setCard = (card) => {
        currentCardRef.current = card;
        setCurrentCard(card);
    };

    const setClue = (text) => {
        currentClueRef.current = text;
        setCurrentClue(text);
    };

    const setCategories = (ids) => {
        const valid = [...new Set((ids || []).filter((id) => ALL_CATEGORY_IDS.includes(id)))];
        const next = valid.length ? valid : [...ALL_CATEGORY_IDS];
        categoriesRef.current = next;
        setSelectedCategories(next);
    };

    const setRoundWordsSafe = (words) => {
        roundWordsRef.current = words;
    };

    const currentPlayerId = isOnline ? playerId : null;
    const isDescriber = !isOnline || currentPlayerId === describerRef.current;
    const nextDescriber = (number) => number % 2 === 1 ? 'p1' : 'p2';

    const resetRound = (number, nextDescriberId) => {
        roundEndedRef.current = false;
        roundNumberRef.current = number;
        setRoundNumber(number);
        describerRef.current = nextDescriberId;
        setDescriberId(nextDescriberId);
        currentSequenceRef.current = 0;
        attemptsRef.current = 0;
        setAttempts(0);
        setGuessHistory([]);
        setGuessPending(false);
        setGuessFeedback('');
        setClue('');
        setVerbalClueReady(false);
        setCard(null);
        setRoundWordsSafe([]);
        skipCountRef.current = 0;
        setSkipCount(0);
        setNotice('');
        setSummary(null);
    };

    const startMatch = () => {
        if (!selectedCategories.length) return;
        const ids = [...selectedCategories];
        categoriesRef.current = ids;
        setCategories(ids);
        scoresRef.current = initialScores();
        setScores(initialScores());
        matchUsedIdsRef.current = new Set();
        resetRound(1, 'p1');
        if (isOnline) connRef.current?.send({ type: 'categories_selected', categoryIds: ids });
        transition('round_intro');
    };

    const handleGameStart = useCallback((conn, hostMode, opponent) => {
        connRef.current = conn;
        setIsHost(Boolean(hostMode));
        setOppProfile(opponent || null);
        conn.on('data', (message) => dataHandlerRef.current?.(message));
        transition('category_select');
    }, []);

    const dealNextWord = (resolvedStatus = null, nextScores = scoresRef.current) => {
        currentSequenceRef.current += 1;
        const result = drawNextWord(categoriesRef.current, matchUsedIdsRef.current);
        let nextNotice = '';

        if (result.cycleReset) {
            const names = categoryNames(categoriesRef.current).join('، ');
            nextNotice = `لعبتوا كل كلمات ${names}؛ اتخلط البنك من جديد وكملوا اللعب 🔄`;
        } else if (result.exhaustedMatch) {
            nextNotice = 'استهلكتوا كل الكلمات المختارة في المباراة؛ الكروت مش هتتكرر.';
        }

        if (result.card) {
            matchUsedIdsRef.current.add(result.card.id);
            const dealtCard = {
                ...result.card,
                roundOccurrenceId: `${roundNumberRef.current}-${currentSequenceRef.current}`
            };
            const nextWords = [...roundWordsRef.current, { ...dealtCard, status: 'pending' }];
            setRoundWordsSafe(nextWords);
            setCard(dealtCard);
        } else {
            setCard(null);
        }

        attemptsRef.current = 0;
        setAttempts(0);
        setGuessHistory([]);
        setClue('');
        setVerbalClueReady(false);
        setGuessPending(false);
        setGuessFeedback('');
        setNotice(nextNotice);

        if (isOnline) {
            connRef.current?.send({
                type: 'word_next',
                sequence: currentSequenceRef.current,
                status: resolvedStatus,
                scores: nextScores,
                skipsUsed: skipCountRef.current,
                notice: nextNotice,
                noWords: !result.card
            });
        }
    };

    const startRound = (number = roundNumberRef.current, descId = describerRef.current) => {
        if (isOnline && !isHost) return;
        const startedAt = Date.now() + 700;
        resetRound(number, descId);
        deadlineRef.current = startedAt + ROUND_SECONDS * 1000;
        lastTimerSentRef.current = ROUND_SECONDS;
        setSecondsLeft(ROUND_SECONDS);
        transition('playing');
        if (isOnline) {
            connRef.current?.send({ type: 'round_start', roundNumber: number, describerId: descId, startedAt });
        }
        if (!isOnline || playerId === descId) dealNextWord(null, scoresRef.current);
    };

    const setWordStatus = (card, status) => {
        if (!card) return roundWordsRef.current;
        const words = roundWordsRef.current.map((entry) => entry.roundOccurrenceId === card.roundOccurrenceId ? { ...entry, status } : entry);
        setRoundWordsSafe(words);
        return words;
    };

    const resolveCurrentWord = (status) => {
        const card = currentCardRef.current;
        if (!card || roundEndedRef.current || gameStateRef.current !== 'playing') return;
        const delta = status === 'correct' ? 1 : status === 'forbidden' ? -1 : 0;
        const nextScores = delta ? updateScores((previous) => ({
            ...previous,
            [describerRef.current]: previous[describerRef.current] + delta
        })) : scoresRef.current;
        setWordStatus(card, status);
        if (status === 'skipped') {
            skipCountRef.current += 1;
            setSkipCount(skipCountRef.current);
        }
        setCard(null);
        dealNextWord(status, nextScores);
    };

    const finishRound = () => {
        if (roundEndedRef.current || gameStateRef.current !== 'playing') return;
        roundEndedRef.current = true;
        const activeCard = currentCardRef.current;
        const finishedWords = activeCard ? setWordStatus(activeCard, 'timeout') : roundWordsRef.current;
        setCard(null);
        const resolvedWords = finishedWords.map((entry) => ({
            ...entry,
            wordId: entry.id,
            status: entry.status === 'pending' ? 'timeout' : entry.status
        }));
        const usedWordIds = resolvedWords.map((entry) => entry.wordId);
        const result = {
            roundNumber: roundNumberRef.current,
            resolvedWords,
            finalScores: scoresRef.current,
            usedWordIds
        };
        setSummary(result);
        setSecondsLeft(0);
        transition('round_summary');
        if (isOnline) connRef.current?.send({ type: 'round_end', ...result });
    };
    finishRoundRef.current = finishRound;

    const handleClue = (text) => {
        const card = currentCardRef.current;
        if (!card || !text.trim()) return null;
        const forbidden = findForbiddenTerm(text, card);
        if (forbidden) return 'فيه كلمة ممنوعة في وصفك — عدّل الوصف قبل ما تبعته.';
        setClue(text.trim());
        setNotice('');
        connRef.current?.send({ type: 'clue_sent', text: text.trim(), sequence: currentSequenceRef.current });
        return null;
    };

    const startVerbalClue = () => {
        if (!isOnline || withChat || !isDescriber || !currentCardRef.current
            || gameStateRef.current !== 'playing' || verbalClueReady) return;
        setVerbalClueReady(true);
        connRef.current?.send({ type: 'verbal_clue_ready', sequence: currentSequenceRef.current });
    };

    const handleGuess = (text) => {
        if (!withChat || !text.trim() || guessPending || attemptsRef.current >= MAX_GUESSES_PER_WORD) return;
        const nextAttempt = attemptsRef.current + 1;
        attemptsRef.current = nextAttempt;
        setAttempts(nextAttempt);
        setGuessHistory((previous) => [...previous, text.trim()].slice(0, MAX_GUESSES_PER_WORD));
        setGuessPending(true);
        setGuessFeedback('جاري فحص التخمين...');
        connRef.current?.send({
            type: 'guess_attempt',
            text: text.trim(),
            attemptNumber: nextAttempt,
            sequence: currentSequenceRef.current
        });
    };

    const advanceAfterOnlineGuess = (message) => {
        if (!isOnline || !withChat || !isDescriber || gameStateRef.current !== 'playing' || roundEndedRef.current) return;
        const card = currentCardRef.current;
        if (!card || message.sequence !== currentSequenceRef.current) return;
        if (message.attemptNumber !== attemptsRef.current + 1 || message.attemptNumber > MAX_GUESSES_PER_WORD) return;

        attemptsRef.current = message.attemptNumber;
        setAttempts(message.attemptNumber);
        const correct = isCorrectGuess(message.text, card.word);
        const nextScores = correct
            ? updateScores((previous) => ({ ...previous, [describerRef.current]: previous[describerRef.current] + 1 }))
            : scoresRef.current;
        const attemptsLeft = MAX_GUESSES_PER_WORD - message.attemptNumber;
        connRef.current?.send({ type: 'guess_result', correct, attemptsLeft, attemptNumber: message.attemptNumber, sequence: currentSequenceRef.current });

        if (correct) {
            setWordStatus(card, 'correct');
            setCard(null);
            dealNextWord('correct', nextScores);
        } else if (attemptsLeft === 0) {
            setWordStatus(card, 'exhausted');
            setCard(null);
            dealNextWord('exhausted', nextScores);
        }
    };

    const onData = (message) => {
        if (!message || typeof message.type !== 'string') return;
        switch (message.type) {
            case 'categories_selected': {
                if (isHost) break;
                setCategories(message.categoryIds);
                scoresRef.current = initialScores();
                setScores(initialScores());
                matchUsedIdsRef.current = new Set();
                resetRound(1, 'p1');
                transition('round_intro');
                break;
            }
            case 'round_start': {
                const number = Math.min(TOTAL_ROUNDS, Math.max(1, Number(message.roundNumber) || 1));
                const descId = nextDescriber(number);
                resetRound(number, descId);
                const startedAt = Number(message.startedAt) || Date.now();
                deadlineRef.current = startedAt + ROUND_SECONDS * 1000;
                lastTimerSentRef.current = ROUND_SECONDS;
                setSecondsLeft(ROUND_SECONDS);
                transition('playing');
                if (playerId === descId) dealNextWord(null, scoresRef.current);
                break;
            }
            case 'timer_update':
                if (playerId !== describerRef.current && gameStateRef.current === 'playing') {
                    setSecondsLeft(Math.min(ROUND_SECONDS, Math.max(0, Number(message.secondsLeft) || 0)));
                }
                break;
            case 'clue_sent':
                if (withChat && playerId !== describerRef.current && gameStateRef.current === 'playing' && message.sequence === currentSequenceRef.current) {
                    setClue(String(message.text || '').slice(0, 220));
                    setVerbalClueReady(false);
                    setNotice('');
                }
                break;
            case 'verbal_clue_ready':
                if (!withChat && playerId !== describerRef.current && gameStateRef.current === 'playing'
                    && message.sequence === currentSequenceRef.current) {
                    setVerbalClueReady(true);
                    setGuessFeedback('');
                }
                break;
            case 'guess_attempt':
                advanceAfterOnlineGuess(message);
                break;
            case 'guess_result':
                if (playerId !== describerRef.current && message.sequence === currentSequenceRef.current) {
                    setGuessPending(false);
                    if (message.correct) {
                        setGuessFeedback('صح! نقطة للواصف 🎉');
                    } else {
                        setGuessFeedback(message.attemptsLeft > 0 ? `مش هي — باقي ${message.attemptsLeft} محاولات` : 'خلصت المحاولات، الكلمة هتتخطى.');
                    }
                }
                break;
            case 'word_next':
                if (playerId !== describerRef.current && gameStateRef.current === 'playing') {
                    currentSequenceRef.current = Number(message.sequence) || currentSequenceRef.current + 1;
                    if (message.scores && Number.isFinite(message.scores.p1) && Number.isFinite(message.scores.p2)) updateScores(message.scores);
                    attemptsRef.current = 0;
                    setAttempts(0);
                    setGuessHistory([]);
                    setGuessPending(false);
                    setClue('');
                    setVerbalClueReady(false);
                    const statusText = ({ correct: 'اتخمنت صح — نقطة للواصف!', skipped: 'الكلمة اتخطت.', forbidden: 'اتسجلت كلمة ممنوعة.', exhausted: 'خلصت المحاولات.' })[message.status] || '';
                    setGuessFeedback(message.noWords ? 'مفيش كلمات جديدة متاحة في المباراة.' : statusText);
                    setNotice(message.notice || '');
                }
                break;
            case 'round_end': {
                if (playerId === describerRef.current) break;
                const words = Array.isArray(message.resolvedWords) ? message.resolvedWords : [];
                const used = Array.isArray(message.usedWordIds) ? message.usedWordIds : words.map((word) => word.wordId || word.id).filter(Boolean);
                mergePlayedWordIds(used);
                used.forEach((id) => matchUsedIdsRef.current.add(id));
                const finalScores = message.finalScores || scoresRef.current;
                updateScores(finalScores);
                const roundSummary = { roundNumber: message.roundNumber || roundNumberRef.current, resolvedWords: words, finalScores, usedWordIds: used };
                setSummary(roundSummary);
                setCard(null);
                setClue('');
                setSecondsLeft(0);
                roundEndedRef.current = true;
                transition('round_summary');
                break;
            }
            case 'next_round': {
                const number = Math.min(TOTAL_ROUNDS, Math.max(1, Number(message.roundNumber) || 1));
                resetRound(number, nextDescriber(number));
                transition('round_intro');
                break;
            }
            case 'game_over':
                updateScores(message.finalScores || scoresRef.current);
                decideWinner(message.finalScores || scoresRef.current);
                break;
            case 'restart':
                scoresRef.current = initialScores();
                setScores(initialScores());
                matchUsedIdsRef.current = new Set();
                resetRound(1, 'p1');
                transition('round_intro');
                break;
            default:
                break;
        }
    };
    dataHandlerRef.current = onData;

    const startFromCategorySelect = () => {
        if (isOnline && !isHost) return;
        startMatch();
    };

    const startCurrentRound = () => startRound(roundNumberRef.current, describerRef.current);

    const continueAfterSummary = () => {
        if (isOnline && !isHost) return;
        if (roundNumberRef.current >= TOTAL_ROUNDS) {
            const finalScores = scoresRef.current;
            decideWinner(finalScores);
            if (isOnline) connRef.current?.send({ type: 'game_over', finalScores });
            return;
        }
        const nextRoundNumber = roundNumberRef.current + 1;
        const descId = nextDescriber(nextRoundNumber);
        resetRound(nextRoundNumber, descId);
        transition('round_intro');
        if (isOnline) connRef.current?.send({ type: 'next_round', roundNumber: nextRoundNumber, describerId: descId });
    };

    const decideWinner = (finalScores) => {
        const result = finalScores.p1 === finalScores.p2 ? 'draw' : finalScores.p1 > finalScores.p2 ? 'p1' : 'p2';
        setWinner(result);
        if (result === 'draw') triggerDrawEffects();
        else if (!isOnline || result === playerId) triggerVictoryEffects();
        else triggerDefeatEffects();
        transition('final_result');
    };

    const restartMatch = () => {
        if (isOnline && !isHost) return;
        scoresRef.current = initialScores();
        setScores(initialScores());
        matchUsedIdsRef.current = new Set();
        resetRound(1, 'p1');
        transition('round_intro');
        if (isOnline) connRef.current?.send({ type: 'restart' });
    };

    useEffect(() => {
        if (gameState !== 'playing') return undefined;
        if (isOnline && playerId !== describerRef.current) return undefined;

        const timer = window.setInterval(() => {
            const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
            setSecondsLeft(remaining);
            if (isOnline && remaining !== lastTimerSentRef.current) {
                lastTimerSentRef.current = remaining;
                connRef.current?.send({ type: 'timer_update', secondsLeft: remaining, roundNumber: roundNumberRef.current });
            }
            if (remaining <= 0) finishRoundRef.current?.();
        }, 150);
        return () => window.clearInterval(timer);
    }, [gameState, isOnline, playerId, describerId]);

    useEffect(() => () => {
        connRef.current?.close?.();
    }, []);

    const leaveGame = () => {
        connRef.current?.close?.();
        connRef.current = null;
        setView('hub');
    };

    const names = {
        p1: isOnline ? (isHost ? myProfile?.nickname : oppProfile?.nickname) || 'اللاعب الأول' : 'اللاعب الأول',
        p2: isOnline ? (isHost ? oppProfile?.nickname : myProfile?.nickname) || 'اللاعب الثاني' : 'اللاعب الثاني'
    };

    if (gameState === 'lobby') {
        return (
            <div className="min-h-dvh w-full max-w-lg mx-auto px-4 flex flex-col safe-area-pt overflow-x-hidden overflow-y-auto pb-6">
                <div className="grid grid-cols-3 items-center py-4 mb-4">
                    <div><Logo size="small" /></div>
                    <div className="flex justify-center">
                        <div className="flex items-center gap-2 glass-card px-3.5 py-1.5 rounded-2xl border border-white/10 shrink-0">
                            <GameIcon gameId="taboo-game" size={18} className="text-[var(--accent)]" />
                            <span className="text-xs font-black gradient-text">الكلمة الممنوعة</span>
                        </div>
                    </div>
                    <div className="flex justify-end"><button onClick={leaveGame} className="glass-card px-4 py-2 rounded-2xl text-xs font-bold">الرئيسية</button></div>
                </div>
                <div className="flex flex-1 pb-16 safe-area-pb">
                    <P2PConnectionManager gameIdPrefix={withChat ? 'celia-taboo' : 'celia-taboo-together'} onGameStart={handleGameStart} allowAI={false} />
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex min-h-dvh w-full flex-col overflow-x-hidden safe-area-pt">
            <div className="animated-bg"><div className="bg-orb-3" /></div>
            <PlayerGameHeader
                title="الكلمة الممنوعة"
                gameId="taboo-game"
                isMyTurn={isDescriber}
                oppProfile={isOnline ? oppProfile : { nickname: 'اللاعب الثاني', avatar: 'girl' }}
                myScore={isOnline ? scores[playerId] : scores.p1}
                oppScore={isOnline ? scores[playerId === 'p1' ? 'p2' : 'p1'] : scores.p2}
                showChatButton={withChat}
                onLeave={leaveGame}
            />

            {withChat && isOnline && connRef.current && (
                <EmotesOverlay conn={connRef.current} oppProfile={oppProfile} showStandaloneButton={false} />
            )}

            {gameState === 'category_select' && (
                <CategorySelect
                    isHost={!isOnline || isHost}
                    selectedIds={selectedCategories}
                    onToggle={(id) => {
                        const next = selectedCategories.includes(id)
                            ? selectedCategories.filter((item) => item !== id)
                            : [...selectedCategories, id];
                        if (next.length) setCategories(next);
                    }}
                    onStart={startFromCategorySelect}
                />
            )}

            {gameState === 'round_intro' && (
                <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 pb-10 text-center">
                    <div className="glass-card w-full rounded-3xl border border-[var(--accent)]/25 p-7 shadow-[0_0_32px_var(--accent-soft)]">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-3xl">
                            {isDescriber ? '🗣️' : '🤔'}
                        </div>
                        <p className="text-xs font-black text-white/45">الراوند {roundNumber} من {TOTAL_ROUNDS}</p>
                        <h1 className="mt-2 text-2xl font-black">{isOnline ? (isDescriber ? 'إنت الواصف' : 'إنت هتخمن') : `${names[describerRef.current]} هو الواصف`}</h1>
                        <p className="mt-3 text-sm leading-6 text-white/60">
                            {isOnline
                                ? withChat
                                    ? isDescriber ? 'هتشوف الكلمة والممنوعات. اكتب وصفًا من غير ما تستخدم أي كلمة منهم.' : 'اقرأ وصف خصمك وخمّن الكلمة. قدامك ٣ محاولات لكل كلمة.'
                                    : isDescriber ? 'هتشوف الكلمة والممنوعات. اشرحها بصوتك؛ لو الخمّان جاوب صح اضغط «صح»، ولو مش عارف توصفها اضغط «تخطي».' : 'اسمع الوصف وقول تخمينك بصوت. الواصف هينتقل للكلمة التالية لما يسمع الإجابة الصح. مفيش شات بينكم.'
                                : `سلّم الجهاز لـ${names[describerRef.current]} بس. اشرح الكلمة بصوتك من غير ما تقول أي كلمة ممنوعة.`}
                        </p>
                        {isOnline && !isHost ? (
                            <p className="mt-5 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs font-black text-white/55">مضيف الغرفة هيبدأ التوقيت بعد ما يكون الطرفين جاهزين.</p>
                        ) : (
                            <button type="button" onClick={startCurrentRound} className="glow-button mt-6 h-14 w-full rounded-2xl text-base font-black">ابدأ الراوند · ٣ دقائق</button>
                        )}
                    </div>
                </main>
            )}

            {gameState === 'playing' && isDescriber && (
                <DescriberView
                    card={currentCard}
                    seconds={secondsLeft}
                    roundNumber={roundNumber}
                    score={scores[describerRef.current]}
                    online={withChat}
                    verbal={isOnline && !withChat}
                    verbalReady={verbalClueReady}
                    clue={currentClue}
                    attempts={attempts}
                    skipsLeft={Math.max(0, MAX_SKIPS_PER_ROUND - skipCount)}
                    notice={notice}
                    onSendClue={handleClue}
                    onStartVerbalClue={startVerbalClue}
                    onResolve={resolveCurrentWord}
                    disabled={roundEndedRef.current}
                />
            )}

            {gameState === 'playing' && isOnline && !isDescriber && (
                <GuesserView
                    seconds={secondsLeft}
                    roundNumber={roundNumber}
                    score={scores[playerId]}
                    clue={currentClue}
                    attempts={attempts}
                    guessHistory={guessHistory}
                    feedback={guessFeedback}
                    pending={guessPending}
                    verbal={!withChat}
                    clueReady={verbalClueReady}
                    onGuess={handleGuess}
                />
            )}

            {gameState === 'round_summary' && summary && (
                <RoundSummary
                    roundNumber={summary.roundNumber}
                    words={summary.resolvedWords || []}
                    scores={scores}
                    names={names}
                    onContinue={continueAfterSummary}
                    isHost={!isOnline || isHost}
                    isFinal={summary.roundNumber >= TOTAL_ROUNDS}
                />
            )}

            {gameState === 'final_result' && (
                <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 pb-8 text-center">
                    <section className="glass-card w-full rounded-3xl border border-[var(--accent)]/25 p-7 shadow-[0_0_40px_var(--accent-soft)]">
                        <div className="mb-3 text-5xl">{winner === 'draw' ? '🤝' : '🏆'}</div>
                        <h1 className="text-2xl font-black">{winner === 'draw' ? 'تعادل!' : `الفائز: ${names[winner]}`}</h1>
                        <p className="mt-2 text-xs font-bold text-white/50">النتيجة النهائية بعد {TOTAL_ROUNDS} راوندات</p>
                        <div className="mt-5 grid grid-cols-2 gap-3">
                            {[[names.p1, scores.p1], [names.p2, scores.p2]].map(([name, score]) => (
                                <div key={name} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                    <p className="truncate text-xs font-black text-white/60">{name}</p>
                                    <p className="mt-1 text-3xl font-black text-[var(--accent)]">{score}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 grid grid-cols-2 gap-2">
                            <button type="button" onClick={restartMatch} disabled={isOnline && !isHost} className="glow-button h-12 rounded-xl text-sm font-black disabled:opacity-35">العبوا تاني</button>
                            <button type="button" onClick={leaveGame} className="rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-black">القائمة الرئيسية</button>
                        </div>
                    </section>
                </main>
            )}
        </div>
    );
}
