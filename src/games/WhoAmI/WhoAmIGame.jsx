import React, { useCallback, useState, useEffect, useRef } from 'react';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import PlayerGameHeader from '../../components/PlayerGameHeader';
import ConnectionPauseOverlay from '../../components/ConnectionPauseOverlay';
import Logo from '../../components/Logo';
import { GameIcon } from '../../components/icons/GameIcons';
import EmotesOverlay from '../../components/EmotesOverlay';
import PackSelect from './PackSelect';
import SecretCardPick from './SecretCardPick';
import MatchModeSelect from './MatchModeSelect';
import MatchRulesBriefing from './MatchRulesBriefing';
import CardBoard from './CardBoard';
import GuessModal from './GuessModal';
import CardPortrait from './CardPortrait';
import { getMatchCondition } from './matchConditions';
import { isValidWhoAmITransfer, otherWhoAmIPlayer, resolveWhoAmIAnswer } from './turnRules';

import { PACKS } from './packs';
import { playSound } from '../../lib/audioEngine';
import { recordMatch } from '../../lib/statsEngine';
import { recordRealPlayer } from '../../lib/leaderboardEngine';

const QUESTION_LIMIT = 3;
const TURN_SECONDS = 30;
const playWhoAmISound = (type, options = {}) => playSound(type, {
    ...options,
    dedupeKey: options.dedupeKey || `whoami-${type}`,
    dedupeMs: Math.max(70, Number(options.dedupeMs) || 0)
});
const RPS_BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
const RPS_OPTIONS = [
    { id: 'rock', label: 'حجر', icon: '✊' },
    { id: 'paper', label: 'ورقة', icon: '✋' },
    { id: 'scissors', label: 'مقص', icon: '✌️' }
];
const QUESTION_ATTRIBUTES = {
    gender: 'النوع', hairColor: 'لون الشعر', hairLength: 'طول الشعر', glasses: 'النظارة',
    hat: 'القبعة', facialHair: 'اللحية أو الشارب', earrings: 'الحلق', ageGroup: 'العمر',
    skinTone: 'لون البشرة', smiling: 'الابتسامة', habitat: 'الموطن', class: 'الفئة',
    diet: 'نوع الغذاء', hasFur: 'الفرو', hasWings: 'الأجنحة', legsCount: 'عدد الأرجل',
    size: 'الحجم', isPet: 'حيوان أليف', temperature: 'درجة الحرارة', taste: 'الطعم',
    course: 'نوع الوجبة', origin: 'الأصل', mainIngredient: 'المكوّن الأساسي', eatenWithHand: 'طريقة الأكل', category: 'النوع'
};
const QUESTION_VALUES = {
    true: 'نعم', false: 'لا', male: 'رجل', female: 'امرأة', black: 'أسود', brown: 'بني',
    blonde: 'أشقر', red: 'أحمر', gray: 'رمادي', none: 'بدون', long: 'طويل', short: 'قصير',
    young: 'شاب', adult: 'بالغ', elderly: 'كبير في السن', light: 'فاتح', medium: 'متوسط',
    dark: 'داكن', land: 'بري', water: 'مائي', air: 'يعيش في الهواء', aquatic: 'مائي', bird: 'طائر',
    hot: 'ساخن', cold: 'بارد', large: 'كبير', small: 'صغير',
    meat: 'لحوم', plants: 'نباتات', main: 'وجبة رئيسية', snack: 'وجبة خفيفة', dessert: 'حلوى', drink: 'مشروب',
    sweet: 'حلو', savory: 'حادق', egyptian: 'مصري', international: 'عالمي', rice: 'أرز', dough: 'عجين',
    dairy: 'ألبان', vegetable: 'خضروات', fruit: 'فاكهة', sugar: 'سكر', '0': 'بلا أرجل', '2': 'رجلان',
    '4': 'أربع أرجل', '6': 'ست أرجل', '8': 'ثماني أرجل', beard: 'لحية', mustache: 'شارب'
};

const normalizeQuestion = (question) => String(question || '')
    .normalize('NFD')
    .replace(/[\u064B-\u065F\u0670\u0640]/gu, '')
    .toLocaleLowerCase('ar')
    .replace(/[أإآ]/gu, 'ا')
    .replace(/ى/gu, 'ي')
    .replace(/ة/gu, 'ه')
    .replace(/^(وهل|هل|هو|هي)/u, '')
    .replace(/[؟?!.,،\s]+/gu, '');

function getSecretHint(card) {
    const attrs = Object.entries(card?.attrs || {}).filter(([, value]) => value !== undefined && value !== null && value !== 'none');
    if (!attrs.length) return { text: 'بطاقتك السرية ما زالت مخفية.' };
    const [key, value] = attrs[Math.floor(Math.random() * attrs.length)];
    const label = QUESTION_ATTRIBUTES[key] || key;
    const answer = QUESTION_VALUES[String(value)] || String(value);
    return { text: `تلميح عن بطاقة الخصم: ${label} — ${answer}`, attr: key, value };
}

export default function WhoAmIGame({ setView, mode }) {
    const [conn, setConn] = useState(null);
    const connRef = useRef(null);
    const [myProfile, setMyProfile] = useState(null);
    const [oppProfile, setOppProfile] = useState(null);
    const [isHost, setIsHost] = useState(false);
    const isHostRef = useRef(isHost);
    const [isAI, setIsAI] = useState(false);
    const isAIRef = useRef(isAI);
    
    const [gameState, setGameState] = useState('lobby'); 
    const gameStateRef = useRef(gameState);
    const [selectedPackId, setSelectedPackId] = useState(null);
    const selectedPackIdRef = useRef(selectedPackId);
    const [mySecretIds, setMySecretIds] = useState([]);
    const mySecretId = mySecretIds[0] || null;
    const [oppSecretReady, setOppSecretReady] = useState(false);
    const [opponentSecretCount, setOpponentSecretCount] = useState(1);
    
    const [turn, setTurn] = useState('p1');
    const [gameMode, setGameMode] = useState('rules');
    const [selectedConditionId, setSelectedConditionId] = useState(null);
    const [rpsChoice, setRpsChoice] = useState(null);
    const [opponentRpsChoice, setOpponentRpsChoice] = useState(null);
    const [rpsMessage, setRpsMessage] = useState('');
    const [rpsFirstPlayer, setRpsFirstPlayer] = useState(null);
    const [rulesAcknowledged, setRulesAcknowledged] = useState(false);
    const [opponentRulesAcknowledged, setOpponentRulesAcknowledged] = useState(false);
    const [turnPhase, setTurnPhase] = useState('ask');
    const [questionText, setQuestionText] = useState('');
    const [pendingQuestion, setPendingQuestion] = useState(null);
    const [hasAskedAnyQuestion, setHasAskedAnyQuestion] = useState(false);
    const [noAnswerActionOnly, setNoAnswerActionOnly] = useState(false);
    const [lastAnswer, setLastAnswer] = useState(null);
    const [questionsThisTurn, setQuestionsThisTurn] = useState(0);
    const questionsThisTurnRef = useRef(0);
    const [myQuestionsAsked, setMyQuestionsAsked] = useState(0);
    const [turnDeadline, setTurnDeadline] = useState(null);
    const [secondsLeft, setSecondsLeft] = useState(30);
    const [hintUsed, setHintUsed] = useState(false);
    const [hintText, setHintText] = useState('');
    const [myInterruptUsed, setMyInterruptUsed] = useState(false);
    const [opponentInterruptUsed, setOpponentInterruptUsed] = useState(false);
    const [myClosedCards, setMyClosedCards] = useState(new Set());
    const [oppClosedCount, setOppClosedCount] = useState(0);
    
    const [winner, setWinner] = useState(null);
    const [opponentSecretId, setOpponentSecretId] = useState(null);
    const [opponentSecretIds, setOpponentSecretIds] = useState([]);
    const [guessedOpponentSecretIds, setGuessedOpponentSecretIds] = useState([]);
    const [guessedMySecretIds, setGuessedMySecretIds] = useState([]);
    const [guessFeedback, setGuessFeedback] = useState('');
    const [myScore, setMyScore] = useState(0);
    const [oppScore, setOppScore] = useState(0);

    const [showGuessModal, setShowGuessModal] = useState(false);
    const [showBoardModal, setShowBoardModal] = useState(false);
    const [previewCard, setPreviewCard] = useState(null);
    const [isGuessPending, setIsGuessPending] = useState(false);
    const useGameChat = mode === 'online';
    const isTogetherMode = mode === 'together';
    // Both online modes run on two devices, so expose the same chat controls
    // and listener to the host and the joining player.
    const showChat = mode === 'online' || mode === 'together';
    
    const lastGuessRef = useRef(null);
    const guessAttemptIdRef = useRef(null);
    const guessPendingRef = useRef(false);
    const rpsChoiceRef = useRef(null);
    const opponentRpsChoiceRef = useRef(null);
    const rpsResolvedRef = useRef(false);
    const rpsStartedRef = useRef(false);
    const rpsFirstPlayerRef = useRef(null);
    const rpsResultTimerRef = useRef(null);
    const rpsResolverRef = useRef(null);
    const questionReceiveRef = useRef(null);
    const questionAnswerHandlerRef = useRef(null);
    const timeoutHandlerRef = useRef(null);
    const passHandlerRef = useRef(null);
    const interruptHandlerRef = useRef(null);
    const interruptResultHandlerRef = useRef(null);
    const hintRequestHandlerRef = useRef(null);
    const beginTurnRef = useRef(null);
    const turnRef = useRef(turn);
    const turnRevisionRef = useRef(0);
    const turnPhaseRef = useRef(turnPhase);
    const pendingQuestionRef = useRef(pendingQuestion);
    const gameModeRef = useRef(gameMode);
    const selectedConditionRef = useRef(selectedConditionId);
    const lastAnswerRef = useRef(lastAnswer);
    const noAnswerActionOnlyRef = useRef(noAnswerActionOnly);
    const hasAskedAnyQuestionRef = useRef(hasAskedAnyQuestion);
    const hintUsedRef = useRef(hintUsed);
    const turnDeadlineRef = useRef(turnDeadline);
    const myQuestionsAskedRef = useRef(myQuestionsAsked);
    const myClosedCardsRef = useRef(myClosedCards);
    const mySecretIdsRef = useRef(mySecretIds);
    const opponentSecretCountRef = useRef(opponentSecretCount);
    const guessedOpponentSecretIdsRef = useRef(guessedOpponentSecretIds);
    const guessedMySecretIdsRef = useRef(guessedMySecretIds);
    const askedQuestionsRef = useRef(new Set());
    const receivedQuestionIdsRef = useRef(new Set());
    const opponentQuestionsAskedRef = useRef(0);
    const resolvedQuestionIdsRef = useRef(new Set());
    const answeredQuestionIdsRef = useRef(new Set());
    const myInterruptUsedRef = useRef(false);
    const opponentInterruptUsedRef = useRef(false);
    const interruptRequestRef = useRef(null);
    const opponentHintUsedRef = useRef(false);
    const timeoutTokenRef = useRef(0);
    const timeoutHandledRef = useRef(false);
    const endGameRef = useRef(null);
    const opponentGuessRef = useRef(null);
    const hasEndedRef = useRef(false);
    const gameOverRevealSentRef = useRef(false);
    const feedbackTimerRef = useRef(null);
    const backStepRef = useRef(null);
    const messageSequenceRef = useRef(0);
    const messageSessionRef = useRef(`${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
    const pendingMessagesRef = useRef(new Map());
    const receivedMessageIdsRef = useRef(new Set());
    const stageRevisionRef = useRef(0);
    const acknowledgedStageRevisionRef = useRef(0);
    const appliedStageRevisionRef = useRef(0);
    const stageSyncHandlerRef = useRef(null);

    const sendWhoAmIMessage = useCallback((message) => {
        const activeConnection = connRef.current;
        if (!activeConnection || !message) return;
        if (activeConnection.isAI) {
            activeConnection.send(message);
            return;
        }

        const messageId = `${messageSessionRef.current}-${++messageSequenceRef.current}`;
        const packet = { ...message, __whoamiEventId: messageId };
        const pending = { connection: activeConnection, attempts: 0, timer: null };
        const transmit = () => {
            if (pendingMessagesRef.current.get(messageId) !== pending) return;
            if (connRef.current !== activeConnection) {
                pendingMessagesRef.current.delete(messageId);
                return;
            }
            pending.attempts += 1;
            try {
                activeConnection.send(packet);
            } catch (error) {
                console.warn('Who Am I message retry failed:', error);
            }
            if (pending.attempts >= 30) {
                pendingMessagesRef.current.delete(messageId);
                return;
            }
            pending.timer = setTimeout(transmit, pending.attempts < 8 ? 650 : 1800);
        };

        pendingMessagesRef.current.set(messageId, pending);
        transmit();
    }, []);

    const clearPendingWhoAmIMessages = () => {
        pendingMessagesRef.current.forEach(pending => clearTimeout(pending.timer));
        pendingMessagesRef.current.clear();
    };

    useEffect(() => () => clearPendingWhoAmIMessages(), []);

    gameStateRef.current = gameState;
    selectedPackIdRef.current = selectedPackId;
    turnRef.current = turn;
    turnPhaseRef.current = turnPhase;
    pendingQuestionRef.current = pendingQuestion;
    gameModeRef.current = gameMode;
    selectedConditionRef.current = selectedConditionId;
    lastAnswerRef.current = lastAnswer;
    noAnswerActionOnlyRef.current = noAnswerActionOnly;
    hasAskedAnyQuestionRef.current = hasAskedAnyQuestion;
    hintUsedRef.current = hintUsed;
    turnDeadlineRef.current = turnDeadline;
    myQuestionsAskedRef.current = myQuestionsAsked;
    myClosedCardsRef.current = myClosedCards;
    isHostRef.current = isHost;
    isAIRef.current = isAI;
    mySecretIdsRef.current = mySecretIds;
    opponentSecretCountRef.current = opponentSecretCount;
    guessedOpponentSecretIdsRef.current = guessedOpponentSecretIds;
    guessedMySecretIdsRef.current = guessedMySecretIds;

    const currentPack = PACKS.find(p => p.id === selectedPackId);
    const myPlayerId = isHost ? 'p1' : 'p2';
    const myPlayerIdRef = useRef(myPlayerId);
    myPlayerIdRef.current = myPlayerId;
    const isMyTurn = turn === myPlayerId;
    const updateGameState = (nextState) => {
        gameStateRef.current = nextState;
        setGameState(nextState);
    };
    const updateTurn = (playerId) => {
        turnRef.current = playerId;
        setTurn(playerId);
    };
    const updateClosedCards = (nextValue) => {
        const previous = myClosedCardsRef.current;
        const next = typeof nextValue === 'function' ? nextValue(previous) : nextValue;
        myClosedCardsRef.current = next;
        setMyClosedCards(next);
        return next;
    };
    const updateTurnPhase = (phase) => {
        turnPhaseRef.current = phase;
        setTurnPhase(phase);
    };
    const updatePendingQuestion = (question) => {
        pendingQuestionRef.current = question;
        setPendingQuestion(question);
    };
    const updateLastAnswer = (answer) => {
        lastAnswerRef.current = answer;
        setLastAnswer(answer);
    };
    const updateNoAnswerActionOnly = (value) => {
        noAnswerActionOnlyRef.current = value;
        setNoAnswerActionOnly(value);
    };
    const updateHasAskedAnyQuestion = (value) => {
        hasAskedAnyQuestionRef.current = value;
        setHasAskedAnyQuestion(value);
    };
    const updateHintUsed = (value) => {
        hintUsedRef.current = value;
        setHintUsed(value);
    };
    const updateTurnDeadline = (deadline) => {
        turnDeadlineRef.current = deadline;
        setTurnDeadline(deadline);
    };
    const isTurnDeadlineExpired = () => selectedConditionRef.current === 'turn_timer'
        && turnDeadlineRef.current != null
        && Date.now() >= turnDeadlineRef.current;
    const canActOnCurrentTurn = () => turnRef.current === myPlayerIdRef.current
        && gameStateRef.current === 'playing'
        && !pendingQuestionRef.current
        && turnPhaseRef.current !== 'answer'
        && !guessPendingRef.current
        && !timeoutHandledRef.current
        && !isTurnDeadlineExpired();
    const currentAnswerPolicy = () => lastAnswerRef.current
        ? resolveWhoAmIAnswer({
            asker: myPlayerIdRef.current,
            answer: lastAnswerRef.current,
            conditionId: selectedConditionRef.current
        })
        : null;
    const canEliminateNow = () => canActOnCurrentTurn()
        && (currentAnswerPolicy()?.canEliminate ?? selectedConditionRef.current !== 'yes_elimination');
    const canAskNow = () => canActOnCurrentTurn()
        && !noAnswerActionOnlyRef.current
        && (currentAnswerPolicy()?.canAskAgain ?? true);
    const rpsWinnerName = rpsFirstPlayer === myPlayerId
        ? myProfile?.nickname || 'أنت'
        : oppProfile?.nickname || (isAI ? 'الذكاء الاصطناعي' : 'الخصم');

    useEffect(() => { connRef.current = conn; }, [conn]);

    const resetRoundUi = () => {
        hasEndedRef.current = false;
        gameOverRevealSentRef.current = false;
        setShowGuessModal(false);
        setShowBoardModal(false);
        setPreviewCard(null);
        setMySecretIds([]);
        setOppSecretReady(false);
        setOpponentSecretCount(1);
        opponentSecretCountRef.current = 1;
        setOpponentSecretId(null);
        setOpponentSecretIds([]);
        setMyClosedCards(new Set());
        myClosedCardsRef.current = new Set();
        setOppClosedCount(0);
        setGuessedOpponentSecretIds([]);
        setGuessedMySecretIds([]);
        guessedOpponentSecretIdsRef.current = [];
        guessedMySecretIdsRef.current = [];
        updatePendingQuestion(null);
        updateHasAskedAnyQuestion(false);
        updateNoAnswerActionOnly(false);
        updateLastAnswer(null);
        questionsThisTurnRef.current = 0;
        setQuestionsThisTurn(0);
        askedQuestionsRef.current = new Set();
        receivedQuestionIdsRef.current = new Set();
        resolvedQuestionIdsRef.current = new Set();
        answeredQuestionIdsRef.current = new Set();
        setMyQuestionsAsked(0);
        myQuestionsAskedRef.current = 0;
        opponentQuestionsAskedRef.current = 0;
        updateHintUsed(false);
        setHintText('');
        setMyInterruptUsed(false);
        setOpponentInterruptUsed(false);
        myInterruptUsedRef.current = false;
        opponentInterruptUsedRef.current = false;
        interruptRequestRef.current = null;
        opponentHintUsedRef.current = false;
        updateTurnDeadline(null);
        updateTurnPhase('ask');
        turnRevisionRef.current = 0;
        updateTurn('p1');
        timeoutHandledRef.current = false;
        timeoutTokenRef.current += 1;
        lastGuessRef.current = null;
        guessAttemptIdRef.current = null;
        guessPendingRef.current = false;
        setIsGuessPending(false);
        setWinner(null);
        setGuessFeedback('');
        rpsChoiceRef.current = null;
        opponentRpsChoiceRef.current = null;
        rpsResolvedRef.current = false;
        rpsStartedRef.current = false;
        rpsFirstPlayerRef.current = null;
        if (rpsResultTimerRef.current) clearTimeout(rpsResultTimerRef.current);
        rpsResultTimerRef.current = null;
        setRpsFirstPlayer(null);
        setRulesAcknowledged(false);
        setOpponentRulesAcknowledged(false);
        setSelectedConditionId(null);
        selectedConditionRef.current = null;
        setRpsChoice(null);
        setOpponentRpsChoice(null);
    };

    const handleGameStart = (connection, hostStatus, profile, _savedState) => {
        // Handle AI mode: P2PConnectionManager passes AI profile as 3rd arg, no 4th arg
        const isAIGame = profile?.isAI || connection?.isAI || false;
        clearPendingWhoAmIMessages();
        receivedMessageIdsRef.current.clear();
        stageRevisionRef.current = 0;
        acknowledgedStageRevisionRef.current = 0;
        appliedStageRevisionRef.current = 0;
        connRef.current = connection;
        isHostRef.current = hostStatus;
        isAIRef.current = isAIGame;
        myPlayerIdRef.current = hostStatus ? 'p1' : 'p2';
        
        let myProf = { nickname: 'لاعب', avatar: 'cool' };
        try {
            const stored = localStorage.getItem('celia_games_profile');
            if (stored) myProf = JSON.parse(stored);
        } catch { }
        let oppProf = profile;
        
        if (isAIGame && !profile) {
            // AI mode: 3rd arg is AI profile, get real player profile from localStorage
            oppProf = profile; // AI profile is the opponent
            try {
                const stored = localStorage.getItem('celia_games_profile');
                myProf = stored ? JSON.parse(stored) : { nickname: 'لاعب', avatar: 'cool' };
            } catch {
                myProf = { nickname: 'لاعب', avatar: 'cool' };
            }
        }

        setConn(connection);
        setIsHost(hostStatus);
        setMyProfile(myProf);
        setOppProfile(oppProf);
        setIsAI(isAIGame);
        
        updateGameState('pack_select');

        connection.on('data', (data) => {
            if (data?.type === 'whoami_transport_ack' && data.messageId) {
                const pending = pendingMessagesRef.current.get(data.messageId);
                if (pending) {
                    clearTimeout(pending.timer);
                    pendingMessagesRef.current.delete(data.messageId);
                }
                return;
            }
            if (data?.__whoamiEventId) {
                try {
                    connection.send({ type: 'whoami_transport_ack', messageId: data.__whoamiEventId });
                } catch { }
                if (receivedMessageIdsRef.current.has(data.__whoamiEventId)) return;
                receivedMessageIdsRef.current.add(data.__whoamiEventId);
                if (receivedMessageIdsRef.current.size > 512) {
                    const oldestIds = [...receivedMessageIdsRef.current].slice(0, 128);
                    oldestIds.forEach(id => receivedMessageIdsRef.current.delete(id));
                }
            }
            if (data?.type === 'whoami_stage_ack') {
                if (isHostRef.current && Number(data.revision) === stageRevisionRef.current) {
                    acknowledgedStageRevisionRef.current = Number(data.revision);
                }
                return;
            }
            if (data?.type === 'whoami_stage_sync') {
                stageSyncHandlerRef.current?.(data);
                sendWhoAmIMessage({ type: 'whoami_stage_ack', revision: data.revision });
                return;
            }
            switch(data.type) {
                case 'rejoin_hello':
                    // This game does not persist a full private snapshot yet. Bring a
                    // still-open peer back to the shared setup screen instead of leaving
                    // one player on the old board while the returning player waits.
                    backStepRef.current?.('pack_select', true);
                    selectedPackIdRef.current = null;
                    setSelectedPackId(null);
                    break;
                case 'pack_selected':
                    if (data.packId !== selectedPackIdRef.current) {
                        selectedPackIdRef.current = data.packId;
                        setSelectedPackId(data.packId);
                    }
                    break;
                case 'pack_confirmed':
                    if (isHostRef.current || gameStateRef.current !== 'pack_select' || !selectedPackIdRef.current) break;
                    updateGameState('mode_setup');
                    playWhoAmISound('ready');
                    break;
                case 'game_mode':
                    if (isHostRef.current || gameStateRef.current !== 'mode_setup') break;
                    if (data.mode === 'rules' || data.mode === 'free') {
                        resetRoundUi();
                        gameModeRef.current = data.mode;
                        setGameMode(data.mode);
                        updateGameState('secret_setup');
                    }
                    break;
                case 'whoami_condition_selected':
                    if (!isHostRef.current && ['secret_setup', 'rules_intro'].includes(gameStateRef.current) && getMatchCondition(data.conditionId)) {
                        selectedConditionRef.current = data.conditionId;
                        setSelectedConditionId(data.conditionId);
                        setRulesAcknowledged(false);
                        setOpponentRulesAcknowledged(false);
                        rpsStartedRef.current = false;
                    }
                    break;
                case 'secret_ready': {
                    setOppSecretReady(true);
                    const count = Number(data.count ?? data.secretCardIds?.length ?? 1);
                    const safeCount = Math.min(2, Math.max(1, Number.isFinite(count) ? count : 1));
                    opponentSecretCountRef.current = safeCount;
                    setOpponentSecretCount(safeCount);
                    break;
                }
                case 'whoami_rules_ack':
                    if (data.playerId !== myPlayerIdRef.current && (data.conditionId ?? null) === selectedConditionRef.current) setOpponentRulesAcknowledged(true);
                    break;
                case 'rps_start':
                    if (!isHostRef.current && gameStateRef.current === 'rules_intro') enterRpsSetup();
                    break;
                case 'game_started':
                    if (isHostRef.current || gameStateRef.current !== 'rps_result' || !['p1', 'p2'].includes(data.firstPlayer)) break;
                    hasEndedRef.current = false;
                    setOpponentSecretId(null);
                    setGuessFeedback('');
                    rpsFirstPlayerRef.current = data.firstPlayer || rpsFirstPlayerRef.current || 'p1';
                    setRpsFirstPlayer(rpsFirstPlayerRef.current);
                    beginTurnRef.current?.(rpsFirstPlayerRef.current);
                    updateGameState('playing');
                    playWhoAmISound('start');
                    break;
                case 'rps_choice':
                    if (gameStateRef.current !== 'rps_setup' || !['rock', 'paper', 'scissors'].includes(data.choice)) break;
                    opponentRpsChoiceRef.current = data.choice;
                    setOpponentRpsChoice(data.choice);
                    rpsResolverRef.current?.();
                    break;
                case 'rps_result':
                    if (gameStateRef.current !== 'rps_setup') break;
                    if (data.winner === 'draw') {
                        rpsChoiceRef.current = null;
                        opponentRpsChoiceRef.current = null;
                        rpsResolvedRef.current = false;
                        setRpsChoice(null);
                        setOpponentRpsChoice(null);
                        setRpsMessage('تعادل! العبوا حجر ورقة مقص مرة أخرى.');
                    } else if (data.firstPlayer) {
                        rpsFirstPlayerRef.current = data.firstPlayer;
                        setRpsFirstPlayer(data.firstPlayer);
                        setRpsMessage(data.firstPlayer === myPlayerIdRef.current
                            ? (isTogetherMode ? 'كسبت حجر ورقة مقص — أنت هتبدأ.' : 'كسبت حجر ورقة مقص — أنت هتبدأ بالسؤال.')
                            : (isTogetherMode ? 'الخصم كسب حجر ورقة مقص — هو هيبدأ.' : 'الخصم كسب حجر ورقة مقص — هو هيبدأ بالسؤال.'));
                        updateGameState('rps_result');
                        playWhoAmISound('ready');
                    }
                    break;
                case 'whoami_question':
                    questionReceiveRef.current?.(data);
                    break;
                case 'whoami_answer':
                    questionAnswerHandlerRef.current?.(data);
                    break;
                case 'whoami_timeout':
                    timeoutHandlerRef.current?.(data);
                    break;
                case 'whoami_pass':
                    passHandlerRef.current?.(data);
                    break;
                case 'whoami_interrupt':
                    interruptHandlerRef.current?.(data);
                    break;
                case 'whoami_interrupt_result':
                    interruptResultHandlerRef.current?.(data);
                    break;
                case 'whoami_hint_request':
                    hintRequestHandlerRef.current?.(data);
                    break;
                case 'whoami_hint_result':
                    if (gameStateRef.current === 'playing' && selectedConditionRef.current === 'single_hint'
                        && data.playerId === myPlayerIdRef.current && hintUsedRef.current) {
                        setHintText(data.text || 'وصل التلميح.');
                    }
                    break;
                case 'closed_count':
                    setOppClosedCount(data.count);
                    break;
                case 'guess_made':
                    opponentGuessRef.current?.(data.cardId, data);
                    break;
                case 'guess_result':
                    if (!guessPendingRef.current || typeof data?.correct !== 'boolean'
                        || (data.correct && data.secretCard !== lastGuessRef.current)
                        || data?.from !== otherWhoAmIPlayer(myPlayerIdRef.current)
                        || !guessAttemptIdRef.current || data?.guessId !== guessAttemptIdRef.current
                        || (Number.isSafeInteger(data?.turnRevision) && data.turnRevision !== turnRevisionRef.current)) break;
                    guessPendingRef.current = false;
                    setIsGuessPending(false);
                    guessAttemptIdRef.current = null;
                    if (data.correct) {
                        lastGuessRef.current = null;
                        const revealedIds = [...new Set([...guessedOpponentSecretIdsRef.current, data.secretCard].filter(Boolean))];
                        guessedOpponentSecretIdsRef.current = revealedIds;
                        setGuessedOpponentSecretIds(revealedIds);
                        if (data.secretCard) {
                            setOpponentSecretId(data.secretCard);
                            setOpponentSecretIds(previous => [...new Set([...previous, data.secretCard])]);
                        }
                        setGuessFeedback('');
                        if (gameModeRef.current !== 'free' || revealedIds.length >= opponentSecretCountRef.current) {
                            endGameRef.current?.(myPlayerIdRef.current, revealedIds);
                        } else {
                            beginTurnRef.current?.(myPlayerIdRef.current, { resetQuestions: false, answer: 'yes' });
                        }
                    } else {
                        playWhoAmISound('error');
                        setGuessFeedback('تخمينك غلط — اتقفلت البطاقة، ودور الخصم الآن.');
                        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
                        feedbackTimerRef.current = setTimeout(() => setGuessFeedback(''), 2600);
                        if (lastGuessRef.current) {
                            const failedCardId = lastGuessRef.current;
                            updateClosedCards(prev => prev.has(failedCardId) ? prev : new Set([...prev, failedCardId]));
                        }
                        lastGuessRef.current = null;
                            beginTurnRef.current?.(otherWhoAmIPlayer(myPlayerIdRef.current));
                    }
                    break;
                case 'game_over':
                    if (!['playing', 'game_over'].includes(gameStateRef.current)) break;
                    // Both players can enter the result screen from the same correct guess.
                    // Still accept the peer's reveal if it arrives after our local transition.
                    {
                        const revealedIds = Array.isArray(data.secretCardIds)
                            ? data.secretCardIds.filter(Boolean)
                            : data.secretCard ? [data.secretCard] : [];
                        if (revealedIds.length) {
                            setOpponentSecretIds(revealedIds);
                            setOpponentSecretId(revealedIds[0]);
                        }
                    }
                    if (gameStateRef.current === 'playing') {
                        endGameRef.current?.(data.winnerId, data.winningCard, true);
                    }
                    if (!gameOverRevealSentRef.current && mySecretIdsRef.current.length) {
                        gameOverRevealSentRef.current = true;
                        sendWhoAmIMessage({
                            type: 'secret_reveal',
                            secretCard: mySecretIdsRef.current[0],
                            secretCardIds: mySecretIdsRef.current
                        });
                    }
                    break;
                case 'secret_reveal':
                    if (!['playing', 'game_over'].includes(gameStateRef.current)) break;
                    if (data.secretCardIds) {
                        setOpponentSecretIds(data.secretCardIds);
                        setOpponentSecretId(data.secretCardIds[0] || null);
                    } else if (data.secretCard) {
                        setOpponentSecretIds([data.secretCard]);
                        setOpponentSecretId(data.secretCard);
                    }
                    break;
                case 'back_step':
                    backStepRef.current?.(data.toState, true);
                    break;
                case 'rematch_request':
                    if (gameStateRef.current === 'game_over') handleRematch();
                    break;
                default:
                    break;
            }
        });
    };

    const handlePackSelect = (id) => {
        if (!isHostRef.current || gameStateRef.current !== 'pack_select') return;
        if (id === 'CONFIRM' && selectedPackIdRef.current) {
            sendWhoAmIMessage({ type: 'pack_confirmed' });
            updateGameState('mode_setup');
            playWhoAmISound('ready');
        } else {
            if (selectedPackIdRef.current === id) return;
            selectedPackIdRef.current = id;
            setSelectedPackId(id);
            sendWhoAmIMessage({ type: 'pack_selected', packId: id });
            playWhoAmISound('tap', { dedupeKey: 'whoami-pack-select', dedupeMs: 160 });
        }
    };

    const selectGameMode = (selectedMode) => {
        if (!isHostRef.current || gameStateRef.current !== 'mode_setup' || !['rules', 'free'].includes(selectedMode)) return;
        resetRoundUi();
        gameModeRef.current = selectedMode;
        setGameMode(selectedMode);
        sendWhoAmIMessage({ type: 'game_mode', mode: selectedMode });
        updateGameState('secret_setup');
        playWhoAmISound('ready');
    };

    const selectMatchCondition = (conditionId) => {
        if (!isHostRef.current || !['secret_setup', 'rules_intro'].includes(gameStateRef.current)
            || gameModeRef.current !== 'rules' || !getMatchCondition(conditionId)) return;
        selectedConditionRef.current = conditionId;
        setSelectedConditionId(conditionId);
        setRulesAcknowledged(false);
        setOpponentRulesAcknowledged(false);
        rpsStartedRef.current = false;
        sendWhoAmIMessage({ type: 'whoami_condition_selected', conditionId });
        playWhoAmISound('tap');
    };

    const handleSecretPick = (selectedIds) => {
        if (gameStateRef.current !== 'secret_setup') return;
        const ids = [...new Set(Array.isArray(selectedIds) ? selectedIds : [selectedIds])];
        const validCount = gameModeRef.current === 'free' ? ids.length >= 1 && ids.length <= 2 : ids.length === 1;
        if (!validCount || !currentPack || ids.some(id => !currentPack.cards.some(card => card.id === id))) return;
        mySecretIdsRef.current = ids;
        setMySecretIds(ids);
        sendWhoAmIMessage({ type: 'secret_ready', count: ids.length });
        playWhoAmISound('tap');
    };

    const enterRpsSetup = useCallback(() => {
        if (rpsResultTimerRef.current) clearTimeout(rpsResultTimerRef.current);
        rpsResultTimerRef.current = null;
        rpsFirstPlayerRef.current = null;
        setRpsFirstPlayer(null);
        rpsChoiceRef.current = null;
        opponentRpsChoiceRef.current = null;
        rpsResolvedRef.current = false;
        setRpsChoice(null);
        setOpponentRpsChoice(null);
        setRpsMessage(isTogetherMode ? 'اختاروا حجر ورقة مقص عشان نحدد مين يبدأ.' : 'اختاروا حجر أو ورقة أو مقص عشان نحدد مين يسأل الأول.');
        updateGameState('rps_setup');
    }, []);

    const applyStageSync = (data) => {
        if (isHostRef.current || !Number.isFinite(Number(data?.revision))) return;
        if (Number(data.revision) <= appliedStageRevisionRef.current) return;
        const allowedStages = new Set(['pack_select', 'mode_setup', 'secret_setup', 'rules_intro', 'rps_setup', 'rps_result']);
        if (!allowedStages.has(data.stage)) return;
        appliedStageRevisionRef.current = Number(data.revision);

        if (PACKS.some(pack => pack.id === data.packId)) {
            selectedPackIdRef.current = data.packId;
            setSelectedPackId(data.packId);
        }
        if (data.gameMode === 'rules' || data.gameMode === 'free') {
            if (gameModeRef.current !== data.gameMode) {
                gameModeRef.current = data.gameMode;
                setGameMode(data.gameMode);
            }
        }
        if (data.conditionId === null || getMatchCondition(data.conditionId)) {
            selectedConditionRef.current = data.conditionId;
            setSelectedConditionId(data.conditionId);
        }
        if (data.stage === 'rps_setup') {
            if (gameStateRef.current !== 'rps_setup') enterRpsSetup();
            return;
        }
        if (data.stage === 'rps_result' && ['p1', 'p2'].includes(data.firstPlayer)) {
            rpsFirstPlayerRef.current = data.firstPlayer;
            setRpsFirstPlayer(data.firstPlayer);
            setRpsMessage(data.firstPlayer === myPlayerIdRef.current
                ? (isTogetherMode ? 'كسبت حجر ورقة مقص — أنت هتبدأ.' : 'كسبت حجر ورقة مقص — أنت هتبدأ بالسؤال.')
                : (isTogetherMode ? 'الخصم كسب حجر ورقة مقص — هو هيبدأ.' : 'الخصم كسب حجر ورقة مقص — هو هيبدأ بالسؤال.'));
        }
        updateGameState(data.stage);
    };
    stageSyncHandlerRef.current = applyStageSync;

    useEffect(() => {
        if (!conn || !isHost || isAI || ['lobby', 'playing', 'game_over'].includes(gameState)) return undefined;

        const revision = ++stageRevisionRef.current;
        acknowledgedStageRevisionRef.current = 0;
        const stageState = {
            type: 'whoami_stage_sync',
            revision,
            stage: gameState,
            packId: selectedPackIdRef.current,
            gameMode,
            conditionId: selectedConditionId,
            firstPlayer: rpsFirstPlayerRef.current
        };
        const syncUntilAcknowledged = () => {
            if (acknowledgedStageRevisionRef.current === revision) return;
            sendWhoAmIMessage(stageState);
        };
        syncUntilAcknowledged();
        const timer = setInterval(syncUntilAcknowledged, 1000);
        return () => clearInterval(timer);
    }, [conn, isHost, isAI, gameState, selectedPackId, gameMode, selectedConditionId, rpsFirstPlayer, sendWhoAmIMessage]);

    useEffect(() => {
        const selectionReady = gameMode === 'free'
            ? mySecretIds.length >= 1 && mySecretIds.length <= 2
            : mySecretIds.length === 1;
        if (gameState === 'secret_setup' && selectionReady && oppSecretReady) {
            rpsStartedRef.current = false;
            setRulesAcknowledged(false);
            setOpponentRulesAcknowledged(false);
            updateGameState('rules_intro');
        }
    }, [gameState, gameMode, mySecretIds, oppSecretReady]);

    useEffect(() => {
        if (gameState !== 'rules_intro' || !isHost || (gameMode === 'rules' && !selectedConditionId) || !rulesAcknowledged || (!isAI && !opponentRulesAcknowledged) || rpsStartedRef.current) return;
        rpsStartedRef.current = true;
        sendWhoAmIMessage({ type: 'rps_start' });
        enterRpsSetup();
    }, [gameState, gameMode, selectedConditionId, isHost, isAI, rulesAcknowledged, opponentRulesAcknowledged, enterRpsSetup]);

    const acknowledgeRules = () => {
        if (gameStateRef.current !== 'rules_intro' || rulesAcknowledged || (gameModeRef.current === 'rules' && !selectedConditionRef.current)) return;
        setRulesAcknowledged(true);
        sendWhoAmIMessage({ type: 'whoami_rules_ack', playerId: myPlayerIdRef.current, conditionId: selectedConditionId });
    };

    const beginRpsResolution = () => {
        if (!isHostRef.current || rpsResolvedRef.current || !rpsChoiceRef.current || !opponentRpsChoiceRef.current) return;
        rpsResolvedRef.current = true;
        const mine = rpsChoiceRef.current;
        const theirs = opponentRpsChoiceRef.current;
        if (mine === theirs) {
            sendWhoAmIMessage({ type: 'rps_result', winner: 'draw' });
            rpsChoiceRef.current = null;
            opponentRpsChoiceRef.current = null;
            rpsResolvedRef.current = false;
            setRpsChoice(null);
            setOpponentRpsChoice(null);
            setRpsMessage('تعادل! العبوا حجر ورقة مقص مرة أخرى.');
            playWhoAmISound('error');
            return;
        }
        const firstPlayer = RPS_BEATS[mine] === theirs ? myPlayerIdRef.current : (myPlayerIdRef.current === 'p1' ? 'p2' : 'p1');
        rpsFirstPlayerRef.current = firstPlayer;
        setRpsFirstPlayer(firstPlayer);
        setRpsMessage(firstPlayer === myPlayerIdRef.current
            ? (isTogetherMode ? 'كسبت حجر ورقة مقص — أنت هتبدأ.' : 'كسبت حجر ورقة مقص — أنت هتبدأ بالسؤال.')
            : (isTogetherMode ? 'الخصم كسب حجر ورقة مقص — هو هيبدأ.' : 'الخصم كسب حجر ورقة مقص — هو هيبدأ بالسؤال.'));
        sendWhoAmIMessage({ type: 'rps_result', firstPlayer });
        updateGameState('rps_result');
        playWhoAmISound('ready');
    };
    rpsResolverRef.current = beginRpsResolution;

    useEffect(() => {
        if (gameState === 'rps_setup' && isHost && rpsChoice && opponentRpsChoice) {
            rpsResolverRef.current?.();
        }
    }, [gameState, isHost, rpsChoice, opponentRpsChoice]);

    const chooseRps = (choice) => {
        if (gameStateRef.current !== 'rps_setup' || rpsChoiceRef.current
            || !['rock', 'paper', 'scissors'].includes(choice)) return;
        rpsChoiceRef.current = choice;
        setRpsChoice(choice);
        sendWhoAmIMessage({ type: 'rps_choice', choice });
        beginRpsResolution();
        playWhoAmISound('tap');
    };

    const beginTurn = (playerId, { resetQuestions = true, answer = null, noAnswerActionOnly = false } = {}) => {
        if (!['p1', 'p2'].includes(playerId) || hasEndedRef.current) return false;
        turnRevisionRef.current += 1;
        updateTurn(playerId);
        guessPendingRef.current = false;
        setIsGuessPending(false);
        lastGuessRef.current = null;
        guessAttemptIdRef.current = null;
        setShowGuessModal(false);
        updateTurnPhase('ask');
        updatePendingQuestion(null);
        updateLastAnswer(answer);
        updateNoAnswerActionOnly(noAnswerActionOnly);
        if (resetQuestions) {
            questionsThisTurnRef.current = 0;
            setQuestionsThisTurn(0);
        }
        updateTurnDeadline(selectedConditionRef.current === 'turn_timer' ? Date.now() + TURN_SECONDS * 1000 : null);
        timeoutHandledRef.current = false;
        timeoutTokenRef.current += 1;
        return true;
    };
    beginTurnRef.current = beginTurn;

    const startGameAfterRps = useCallback(() => {
        if (!isHostRef.current || gameStateRef.current !== 'rps_result' || !rpsFirstPlayerRef.current) return;
        if (rpsResultTimerRef.current) clearTimeout(rpsResultTimerRef.current);
        rpsResultTimerRef.current = null;
        const firstPlayer = rpsFirstPlayerRef.current;
        sendWhoAmIMessage({ type: 'game_started', firstPlayer });
        beginTurnRef.current?.(firstPlayer);
        updateGameState('playing');
        playWhoAmISound('start');
    }, []);

    useEffect(() => {
        if (!isHost || gameState !== 'rps_result' || !rpsFirstPlayer) return undefined;
        const timer = setTimeout(startGameAfterRps, 2800);
        rpsResultTimerRef.current = timer;
        return () => {
            clearTimeout(timer);
            if (rpsResultTimerRef.current === timer) rpsResultTimerRef.current = null;
        };
    }, [isHost, gameState, rpsFirstPlayer, startGameAfterRps]);

    const applyQuestionAnswer = (data) => {
        if (isTogetherMode) return;
        const activeQuestion = pendingQuestionRef.current;
        if (gameStateRef.current !== 'playing' || turnPhaseRef.current !== 'answer' || activeQuestion?.from !== data?.asker) return;
        if (activeQuestion?.id && data?.questionId !== activeQuestion.id) return;
        if (data?.from && data.from !== otherWhoAmIPlayer(activeQuestion.from)) return;
        if (Number.isSafeInteger(data?.turnRevision) && data.turnRevision !== turnRevisionRef.current) return;
        if (!data?.unsupported && (!['p1', 'p2'].includes(data?.asker) || !['yes', 'no'].includes(data?.answer))) return;
        if (data.questionId && resolvedQuestionIdsRef.current.has(data.questionId)) return;
        if (data.questionId) resolvedQuestionIdsRef.current.add(data.questionId);
        turnRevisionRef.current += 1;
        if (data?.unsupported) {
            updatePendingQuestion(null);
            updateTurnPhase('ask');
            updateTurnDeadline(selectedConditionRef.current === 'turn_timer' ? Date.now() + TURN_SECONDS * 1000 : null);
            timeoutHandledRef.current = false;
            timeoutTokenRef.current += 1;
            setGuessFeedback(data.limit
                ? 'وصل الخصم للحد الأقصى من الأسئلة في هذا الشرط.'
                : data.duplicate
                    ? 'السؤال اتسأل قبل كده؛ جرّب سؤالًا مختلفًا.'
                    : 'الذكاء الاصطناعي لم يفهم السؤال؛ اسأل عن صفة واضحة في البطاقة.');
            if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
            feedbackTimerRef.current = setTimeout(() => setGuessFeedback(''), 2800);
            return;
        }
        const answer = data?.answer === 'yes' ? 'yes' : 'no';
        const asker = data?.asker;
        
        updatePendingQuestion(null);
        updateLastAnswer(answer);
        const transition = resolveWhoAmIAnswer({
            asker,
            answer,
            conditionId: selectedConditionRef.current
        });
        if (!transition) return;
        const nextPlayer = transition.nextPlayer;
        const askerKeepsNoAnswerAction = transition.noAnswerActionOnly;
        if (answer === 'yes') {
            const nextCount = questionsThisTurnRef.current + 1;
            questionsThisTurnRef.current = nextCount;
            setQuestionsThisTurn(nextCount);
            updateTurn(asker);
            updateTurnPhase('ask');
            updateTurnDeadline(selectedConditionRef.current === 'turn_timer' ? Date.now() + TURN_SECONDS * 1000 : null);
            updateNoAnswerActionOnly(false);
            timeoutHandledRef.current = false;
            timeoutTokenRef.current += 1;
        } else if (askerKeepsNoAnswerAction) {
            // A "no" ends the question chain, but the asker may still eliminate
            // or guess before explicitly passing the turn.
            beginTurn(asker, { answer, noAnswerActionOnly: transition.noAnswerActionOnly });
        } else {
            beginTurn(nextPlayer, { answer });
        }
        setGuessFeedback(answer === 'yes'
            ? (selectedConditionRef.current === 'yes_continue'
                ? 'الإجابة أيوه — تقدر تستبعد وتكمل السؤال.'
                : 'الإجابة أيوه — دورك للاستبعاد أو التخمين، وبعدها سلّم الدور.')
            : askerKeepsNoAnswerAction
                ? asker === myPlayerIdRef.current
                    ? 'الإجابة لأ — استبعد أو خمّن، وبعدها سلّم الدور.'
                    : 'الإجابة لأ — السائل يستبعد أو يخمّن ثم يسلّم الدور.'
                : selectedConditionRef.current === 'yes_elimination'
                    ? asker === myPlayerIdRef.current
                        ? 'الإجابة لأ — الدور انتقل للخصم من غير استبعاد.'
                        : 'الإجابة لأ — دورك للسؤال أو التخمين؛ الاستبعاد بعد أيوه فقط.'
                : asker === myPlayerIdRef.current
                ? 'الإجابة لأ — الدور انتقل للخصم.'
                : 'الإجابة لأ — دورك الآن. اسأل أو خمّن؛ الاستبعاد متاح بعد أيوه فقط.');
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = setTimeout(() => setGuessFeedback(''), 2400);
        playWhoAmISound(answer === 'yes' ? 'success' : 'tap');
    };
    questionAnswerHandlerRef.current = applyQuestionAnswer;

    const receiveQuestion = (data) => {
        if (isTogetherMode) return;
        if (gameStateRef.current !== 'playing' || !['p1', 'p2'].includes(data?.from) || data.from === myPlayerIdRef.current) return;
        if (turnRef.current !== data.from || turnPhaseRef.current !== 'ask') return;
        if (Number.isSafeInteger(data.turnRevision) && data.turnRevision !== turnRevisionRef.current) return;
        if (data.id && (resolvedQuestionIdsRef.current.has(data.id) || receivedQuestionIdsRef.current.has(data.id))) return;
        if (typeof data.text !== 'string' || (useGameChat && !data.text.trim()) || data.text.length > 120) return;
        const rejectQuestion = (extra) => {
            if (data.id) {
                receivedQuestionIdsRef.current.add(data.id);
                resolvedQuestionIdsRef.current.add(data.id);
            }
            const responseRevision = turnRevisionRef.current + 1;
            turnRevisionRef.current = responseRevision + 1;
            updateTurnDeadline(selectedConditionRef.current === 'turn_timer' ? Date.now() + TURN_SECONDS * 1000 : null);
            timeoutHandledRef.current = false;
            timeoutTokenRef.current += 1;
            sendWhoAmIMessage({
                type: 'whoami_answer', answer: 'no', unsupported: true,
                asker: data.from, questionId: data.id, from: myPlayerIdRef.current,
                turnRevision: responseRevision, ...extra
            });
        };
        const normalized = normalizeQuestion(data.text);
        if (selectedConditionRef.current === 'three_questions' && opponentQuestionsAskedRef.current >= QUESTION_LIMIT) {
            rejectQuestion({ limit: true });
            return;
        }
        if (selectedConditionRef.current === 'no_repeat' && normalized && askedQuestionsRef.current.has(normalized)) {
            setGuessFeedback('السؤال اتسأل قبل كده، فمش هيتكرر.');
            rejectQuestion({ duplicate: true });
            return;
        }
        if (normalized) {
            askedQuestionsRef.current.add(normalized);
        }
        if (data.id) receivedQuestionIdsRef.current.add(data.id);
        turnRevisionRef.current += 1;
        updateHasAskedAnyQuestion(true);
        opponentQuestionsAskedRef.current += 1;
        updatePendingQuestion({ id: data.id, text: data.text, from: data.from });
        updateTurnPhase('answer');
        updateTurnDeadline(selectedConditionRef.current === 'turn_timer' ? Date.now() + TURN_SECONDS * 1000 : null);
        timeoutHandledRef.current = false;
        timeoutTokenRef.current += 1;
        playWhoAmISound('tap');
    };
    questionReceiveRef.current = receiveQuestion;

    const askQuestion = () => {
        if (isTogetherMode) return;
        const text = useGameChat ? questionText.trim() : '';
        if (!canAskNow() || (useGameChat && !text)) return;
        if (selectedConditionRef.current === 'three_questions' && myQuestionsAskedRef.current >= QUESTION_LIMIT) {
            setGuessFeedback('استخدمت أسئلتك الثلاثة المسموحة في المباراة.');
            return;
        }
        const normalized = normalizeQuestion(text);
        if (selectedConditionRef.current === 'no_repeat' && normalized && askedQuestionsRef.current.has(normalized)) {
            setGuessFeedback('السؤال ده اتسأل قبل كده، اختار سؤالًا مختلفًا.');
            return;
        }
        if (normalized) askedQuestionsRef.current.add(normalized);
        updateHasAskedAnyQuestion(true);
        myQuestionsAskedRef.current += 1;
        setMyQuestionsAsked(myQuestionsAskedRef.current);
        const question = {
            type: 'whoami_question',
            id: `question-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            text,
            from: myPlayerIdRef.current,
            turnRevision: turnRevisionRef.current
        };
        turnRevisionRef.current += 1;
        updatePendingQuestion(question);
        updateTurnPhase('answer');
        updateTurnDeadline(selectedConditionRef.current === 'turn_timer' ? Date.now() + TURN_SECONDS * 1000 : null);
        timeoutHandledRef.current = false;
        timeoutTokenRef.current += 1;
        setQuestionText('');
        sendWhoAmIMessage(question);
        if (useGameChat) {
            window.dispatchEvent(new CustomEvent('whoami-game-chat', {
                detail: { kind: 'question', text, questionId: question.id }
            }));
        }
        playWhoAmISound('tap');
    };

    const answerQuestion = (answer) => {
        if (isTogetherMode) return;
        const activeQuestion = pendingQuestionRef.current;
        if (!['yes', 'no'].includes(answer) || turnPhaseRef.current !== 'answer' || !activeQuestion || activeQuestion.from === myPlayerIdRef.current) return;
        if (selectedConditionRef.current === 'turn_timer' && isTurnDeadlineExpired()) {
            if (!timeoutHandledRef.current) {
                timeoutHandledRef.current = true;
                const timeout = {
                    type: 'whoami_timeout', nextPlayer: activeQuestion.from,
                    from: myPlayerIdRef.current, questionId: activeQuestion.id,
                    turnRevision: turnRevisionRef.current
                };
                sendWhoAmIMessage(timeout);
                timeoutHandlerRef.current?.(timeout);
            }
            return;
        }
        if (activeQuestion.id && answeredQuestionIdsRef.current.has(activeQuestion.id)) return;
        if (activeQuestion.id) answeredQuestionIdsRef.current.add(activeQuestion.id);
        const asker = activeQuestion.from;
        const transition = resolveWhoAmIAnswer({
            asker,
            answer,
            conditionId: selectedConditionRef.current
        });
        if (!transition) return;
        const response = {
            type: 'whoami_answer', answer, asker, questionId: activeQuestion.id,
            from: myPlayerIdRef.current, nextPlayer: transition.nextPlayer,
            turnRevision: turnRevisionRef.current
        };
        // Update this screen before sending. The AI/peer can answer immediately
        // and send another turn event back while this handler is still running.
        applyQuestionAnswer(response);
        sendWhoAmIMessage(response);
        if (useGameChat) {
            window.dispatchEvent(new CustomEvent('whoami-game-chat', {
                detail: { kind: 'answer', text: `الإجابة: ${answer === 'yes' ? 'أيوه' : 'لأ'}`, questionId: activeQuestion.id }
            }));
        }
    };

    const timeoutTurn = (data) => {
        if (gameStateRef.current !== 'playing') return;
        const activeQuestion = pendingQuestionRef.current;
        if (Number.isSafeInteger(data?.turnRevision) && data.turnRevision !== turnRevisionRef.current) return;
        if (data?.questionId && (activeQuestion?.id !== data.questionId || turnPhaseRef.current !== 'answer')) return;
        if (data?.questionId && data.from && data.from !== otherWhoAmIPlayer(activeQuestion?.from)) return;
        if (!data?.questionId && data.from && data.from !== turnRef.current) return;
        if (!data?.questionId && turnPhaseRef.current === 'answer') return;
        const nextPlayer = data?.nextPlayer;
        if (!['p1', 'p2'].includes(nextPlayer)) return;
        if (data?.questionId && nextPlayer !== activeQuestion?.from) return;
        if (!data?.questionId && nextPlayer !== otherWhoAmIPlayer(turnRef.current)) return;
        if (data?.questionId && resolvedQuestionIdsRef.current.has(data.questionId)) return;
        if (data?.questionId) resolvedQuestionIdsRef.current.add(data.questionId);
        beginTurn(nextPlayer);
        setGuessFeedback('انتهى الوقت — الدور ينتقل للخصم.');
        playWhoAmISound('error');
    };
    timeoutHandlerRef.current = timeoutTurn;

    const passToPlayer = (data) => {
        const nextPlayer = data?.nextPlayer;
        if (gameStateRef.current !== 'playing' || turnPhaseRef.current === 'answer' || pendingQuestionRef.current
            || guessPendingRef.current
            || (Number.isSafeInteger(data?.turnRevision) && data.turnRevision !== turnRevisionRef.current)
            || !isValidWhoAmITransfer({ from: data?.from, nextPlayer, currentTurn: turnRef.current })) return;
        beginTurn(nextPlayer);
        playWhoAmISound('tap');
    };
    passHandlerRef.current = passToPlayer;

    const interruptTurn = () => {
        if (gameStateRef.current !== 'playing' || turnRef.current === myPlayerIdRef.current
            || turnPhaseRef.current === 'answer' || pendingQuestionRef.current
            || !hasAskedAnyQuestionRef.current || myInterruptUsedRef.current
            || selectedConditionRef.current !== 'interrupt_once') return;
        myInterruptUsedRef.current = true;
        setMyInterruptUsed(true);
        const requestId = `interrupt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        interruptRequestRef.current = { requestId, turnRevision: turnRevisionRef.current };
        const message = {
            type: 'whoami_interrupt', playerId: myPlayerIdRef.current,
            requestId, turnRevision: turnRevisionRef.current
        };
        sendWhoAmIMessage(message);
        if (isAIRef.current) {
            beginTurn(myPlayerIdRef.current);
            setGuessFeedback('تم قطع دور الذكاء الاصطناعي — دورك الآن.');
            playWhoAmISound('ready');
            return;
        }
        setGuessFeedback('طلبت قطع الدور — مستني تأكيد الخصم.');
    };

    const applyInterrupt = (data) => {
        const invalidReason = gameStateRef.current !== 'playing' || selectedConditionRef.current !== 'interrupt_once'
            ? 'الشرط الحالي لا يسمح بقطع الدور.'
            : data?.playerId !== otherWhoAmIPlayer(myPlayerIdRef.current)
                ? 'طلب قطع الدور غير صالح.'
                : turnRef.current === data.playerId || turnPhaseRef.current === 'answer' || pendingQuestionRef.current || guessPendingRef.current
                    ? 'السؤال أو التخمين بدأ بالفعل.'
                    : opponentInterruptUsedRef.current || !hasAskedAnyQuestionRef.current
                        ? 'فرصة قطع الدور غير متاحة.'
                        : (Number.isSafeInteger(data?.turnRevision) && data.turnRevision !== turnRevisionRef.current)
                            ? 'الدور تغيّر قبل وصول الطلب.'
                            : '';
        if (invalidReason) {
            if (data?.requestId) sendWhoAmIMessage({
                type: 'whoami_interrupt_result', requestId: data.requestId,
                playerId: data.playerId, accepted: false, reason: invalidReason,
                turnRevision: turnRevisionRef.current
            });
            return;
        }
        opponentInterruptUsedRef.current = true;
        setOpponentInterruptUsed(true);
        beginTurn(data.playerId);
        if (data?.requestId) sendWhoAmIMessage({
            type: 'whoami_interrupt_result', requestId: data.requestId,
            playerId: data.playerId, accepted: true,
            turnRevision: Number.isSafeInteger(data.turnRevision) ? data.turnRevision : turnRevisionRef.current - 1
        });
        setGuessFeedback('تم إيقاف الدور — بدأ دور اللاعب الآخر.');
        playWhoAmISound('ready');
    };
    interruptHandlerRef.current = applyInterrupt;

    const applyInterruptResult = (data) => {
        const pending = interruptRequestRef.current;
        if (!pending || data?.requestId !== pending.requestId) return;
        interruptRequestRef.current = null;
        if (data.accepted === true && data.playerId === myPlayerIdRef.current
            && gameStateRef.current === 'playing' && selectedConditionRef.current === 'interrupt_once'
            && turnRef.current !== myPlayerIdRef.current && turnPhaseRef.current !== 'answer'
            && !pendingQuestionRef.current && !guessPendingRef.current) {
            beginTurn(myPlayerIdRef.current);
            setGuessFeedback('تم قطع الدور — دورك الآن.');
            playWhoAmISound('ready');
            return;
        }
        if (data.accepted !== true) {
            myInterruptUsedRef.current = false;
            setMyInterruptUsed(false);
            setGuessFeedback(data.reason || 'لم يتم قطع الدور؛ استمر اللعب بالدور الحالي.');
        }
    };
    interruptResultHandlerRef.current = applyInterruptResult;

    const requestHint = () => {
        if (!canActOnCurrentTurn() || hintUsedRef.current
            || selectedConditionRef.current !== 'single_hint' || myQuestionsAskedRef.current < 1) return;
        updateHintUsed(true);
        setHintText('جاري تجهيز التلميح...');
        sendWhoAmIMessage({ type: 'whoami_hint_request', playerId: myPlayerIdRef.current });
    };

    const answerHintRequest = (data) => {
        if (gameStateRef.current !== 'playing' || selectedConditionRef.current !== 'single_hint'
            || data?.playerId !== otherWhoAmIPlayer(myPlayerIdRef.current)
            || turnRef.current !== data.playerId || opponentHintUsedRef.current) return;
        opponentHintUsedRef.current = true;
        const secretCard = currentPack?.cards.find(card => card.id === mySecretId);
        const hint = getSecretHint(secretCard);
        sendWhoAmIMessage({ type: 'whoami_hint_result', playerId: data.playerId, ...hint });
    };
    hintRequestHandlerRef.current = answerHintRequest;

    useEffect(() => {
        if (gameState !== 'playing' || !turnDeadline || selectedConditionId !== 'turn_timer') {
            setSecondsLeft(TURN_SECONDS);
            return undefined;
        }
        const update = () => {
            const remaining = Math.max(0, Math.ceil((turnDeadline - Date.now()) / 1000));
            setSecondsLeft(previous => previous === remaining ? previous : remaining);
            if (remaining > 0 || timeoutHandledRef.current || guessPendingRef.current) return;
            const activePhase = turnPhaseRef.current;
            const activeQuestion = pendingQuestionRef.current;
            const isAnswerer = activePhase === 'answer' && activeQuestion?.from !== myPlayerIdRef.current;
            const isAITurn = isAIRef.current && isHostRef.current && activePhase !== 'answer' && turnRef.current !== myPlayerIdRef.current;
            const isAIAnswering = isAIRef.current && isHostRef.current && activePhase === 'answer' && activeQuestion?.from === myPlayerIdRef.current;
            const ownsCurrentTimer = isAnswerer || (activePhase !== 'answer' && turnRef.current === myPlayerIdRef.current) || isAITurn || isAIAnswering;
            if (!ownsCurrentTimer) return;
            timeoutHandledRef.current = true;
            const nextPlayer = isAnswerer || isAIAnswering
                ? activeQuestion.from
                : otherWhoAmIPlayer(turnRef.current);
            const timeout = {
                type: 'whoami_timeout',
                nextPlayer,
                from: isAnswerer || isAIAnswering ? otherWhoAmIPlayer(activeQuestion.from) : turnRef.current,
                turnRevision: turnRevisionRef.current,
                ...((isAnswerer || isAIAnswering) && activeQuestion?.id ? { questionId: activeQuestion.id } : {})
            };
            sendWhoAmIMessage(timeout);
            timeoutHandlerRef.current?.(timeout);
        };
        update();
        const interval = setInterval(update, 250);
        return () => clearInterval(interval);
    }, [gameState, selectedConditionId, turnDeadline, turnPhase, pendingQuestion, isMyTurn]);

    const canEliminate = (isTogetherMode ? canActOnCurrentTurn() : canEliminateNow()) && !isGuessPending;
    const canGuess = canActOnCurrentTurn() && !isGuessPending;
    const canAskQuestion = !isTogetherMode && canAskNow();

    const toggleCard = (cardId) => {
        if (!canEliminate || guessedOpponentSecretIdsRef.current.includes(cardId)) return;
        const currentClosedCards = myClosedCardsRef.current;
        if (!currentClosedCards.has(cardId) && currentClosedCards.size >= (currentPack?.cards.length || 0) - 1) {
            setGuessFeedback('سيب بطاقة واحدة مفتوحة على الأقل عشان تقدر تخمّن.');
            if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
            feedbackTimerRef.current = setTimeout(() => setGuessFeedback(''), 2200);
            return;
        }
        const nextClosedCards = updateClosedCards(prev => {
            const next = new Set(prev);
            if (next.has(cardId)) {
                next.delete(cardId);
            } else {
                next.add(cardId);
            }
            return next;
        });
        sendWhoAmIMessage({ type: 'closed_count', count: nextClosedCards.size });
        playWhoAmISound('tap');
    };

    const endTurn = () => {
        if (!canActOnCurrentTurn()) return;
        const nextPlayer = otherWhoAmIPlayer(myPlayerIdRef.current);
        const pass = { type: 'whoami_pass', from: myPlayerIdRef.current, nextPlayer, turnRevision: turnRevisionRef.current };
        sendWhoAmIMessage(pass);
        beginTurn(nextPlayer);
        playWhoAmISound('tap');
    };

    const handleGuess = (guessedCardId) => {
        if (!canActOnCurrentTurn() || !currentPack?.cards.some(card => card.id === guessedCardId)
            || guessedOpponentSecretIdsRef.current.includes(guessedCardId)) return;
        guessPendingRef.current = true;
        setIsGuessPending(true);
        setShowGuessModal(false);
        setGuessFeedback('');
        lastGuessRef.current = guessedCardId;
        const guessId = `${turnRevisionRef.current}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        guessAttemptIdRef.current = guessId;
        const guessRevision = turnRevisionRef.current;
        turnRevisionRef.current += 1;
        // Eliminate the selected card immediately while the opponent checks the guess.
        const nextClosedCards = new Set(myClosedCardsRef.current);
        nextClosedCards.add(guessedCardId);
        updateClosedCards(nextClosedCards);
        sendWhoAmIMessage({ type: 'closed_count', count: nextClosedCards.size });
        sendWhoAmIMessage({ type: 'guess_made', cardId: guessedCardId, guessId, from: myPlayerIdRef.current, turnRevision: guessRevision });
    };

    const handleOpponentGuess = (guessedCardId, data) => {
        if (gameStateRef.current !== 'playing' || turnRef.current === myPlayerIdRef.current
            || (Number.isSafeInteger(data?.turnRevision) && data.turnRevision !== turnRevisionRef.current)
            || (data?.from && data.from !== turnRef.current)
            || !currentPack?.cards.some(card => card.id === guessedCardId)) return;
        turnRevisionRef.current += 1;
        const currentSecrets = mySecretIdsRef.current;
        if (currentSecrets.includes(guessedCardId)) {
            const revealedIds = [...new Set([...guessedMySecretIdsRef.current, guessedCardId])];
            guessedMySecretIdsRef.current = revealedIds;
            setGuessedMySecretIds(revealedIds);
            sendWhoAmIMessage({ type: 'guess_result', correct: true, secretCard: guessedCardId, guessedCount: revealedIds.length, guessId: data?.guessId, from: myPlayerIdRef.current, turnRevision: turnRevisionRef.current });
            if (revealedIds.length >= currentSecrets.length) endGame(isHost ? 'p2' : 'p1', currentSecrets);
            else beginTurn(turnRef.current, { resetQuestions: false, answer: 'yes' });
        } else {
            sendWhoAmIMessage({ type: 'guess_result', correct: false, guessId: data?.guessId, from: myPlayerIdRef.current, turnRevision: turnRevisionRef.current });
            playWhoAmISound('error');
            setGuessFeedback('الخصم خمن غلط — دورك الآن!');
            if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
            feedbackTimerRef.current = setTimeout(() => setGuessFeedback(''), 2600);
            beginTurn(myPlayerId);
        }
    };
    opponentGuessRef.current = handleOpponentGuess;

    const endGame = (winPlayerId, wCard, isFromOpponent = false) => {
        if (hasEndedRef.current) return;
        guessPendingRef.current = false;
        setIsGuessPending(false);
        hasEndedRef.current = true;
        setWinner(winPlayerId);
        setGuessFeedback('');
        setShowBoardModal(false);
        setPreviewCard(null);
        updateGameState('game_over');
        
        if (!isFromOpponent) {
            gameOverRevealSentRef.current = true;
            sendWhoAmIMessage({
                type: 'game_over',
                winnerId: winPlayerId,
                winningCard: wCard,
                secretCard: mySecretId,
                secretCardIds: mySecretIdsRef.current
            });
        }

        const isWin = winPlayerId === myPlayerId;
        if (isWin) {
            setMyScore(s => s + 1);
            playWhoAmISound('win');
        } else {
            setOppScore(s => s + 1);
            playWhoAmISound('error');
        }

        if (!isAI && oppProfile) {
            recordRealPlayer(oppProfile, isWin ? 0 : 1, isWin ? 1 : 0);
            recordMatch({
                gameId: 'celia-whoami',
                gameTitle: 'أنا مين؟',
                oppName: oppProfile.nickname,
                oppAvatar: oppProfile.avatar,
                isWin,
                isAI: false
            });
        } else if (isAI) {
            recordMatch({
                gameId: 'celia-whoami',
                gameTitle: 'أنا مين؟',
                oppName: 'الذكاء الاصطناعي',
                oppAvatar: 'bot',
                isWin,
                isAI: true
            });
        }
    };

    // Keep endGame current for the connection event listener without re-registering it.
    useEffect(() => {
        endGameRef.current = endGame;
    });

    const requestRematch = () => {
        sendWhoAmIMessage({ type: 'rematch_request' });
        handleRematch();
    };

    const handleRematch = () => {
        resetRoundUi();
        updateGameState('secret_setup');
        playWhoAmISound('ready');
    };

    const handleBackStep = (requestedState, fromPeer = false) => {
        const previousState = {
            pack_select: 'lobby',
            mode_setup: 'pack_select',
            secret_setup: 'mode_setup',
            rules_intro: 'secret_setup',
            rps_setup: 'rules_intro',
            rps_result: 'rps_setup',
            playing: 'rps_setup',
        }[gameStateRef.current];
        const targetState = requestedState || previousState;
        if (!targetState || !['lobby', 'pack_select', 'mode_setup', 'secret_setup', 'rules_intro', 'rps_setup'].includes(targetState)) return;

        if (!fromPeer) sendWhoAmIMessage({ type: 'back_step', toState: targetState });

        setShowGuessModal(false);
        setShowBoardModal(false);
        setPreviewCard(null);
        hasEndedRef.current = false;
        setWinner(null);
        setOpponentSecretId(null);
        setGuessFeedback('');
        lastGuessRef.current = null;
        guessAttemptIdRef.current = null;
        guessPendingRef.current = false;
        setIsGuessPending(false);
        interruptRequestRef.current = null;
        myInterruptUsedRef.current = false;
        opponentInterruptUsedRef.current = false;
        setMyInterruptUsed(false);
        setOpponentInterruptUsed(false);
        setMyClosedCards(new Set());
        myClosedCardsRef.current = new Set();
        setOppClosedCount(0);
        turnRevisionRef.current = 0;
        questionsThisTurnRef.current = 0;
        updateTurn('p1');
        updateHasAskedAnyQuestion(false);
        updateNoAnswerActionOnly(false);
        if (targetState === 'rps_setup') {
            if (rpsResultTimerRef.current) clearTimeout(rpsResultTimerRef.current);
            rpsResultTimerRef.current = null;
            rpsFirstPlayerRef.current = null;
            setRpsFirstPlayer(null);
            updatePendingQuestion(null);
            updateTurnPhase('ask');
            updateTurnDeadline(null);
            timeoutHandledRef.current = false;
            setRpsMessage(isTogetherMode ? 'اختاروا حجر ورقة مقص عشان نحدد مين يبدأ.' : 'اختاروا حجر أو ورقة أو مقص عشان نحدد مين يسأل الأول.');
            rpsChoiceRef.current = null;
            opponentRpsChoiceRef.current = null;
            rpsResolvedRef.current = false;
            setRpsChoice(null);
            setOpponentRpsChoice(null);
        } else if (targetState === 'rules_intro') {
            rpsStartedRef.current = false;
            setRulesAcknowledged(false);
            setOpponentRulesAcknowledged(false);
        }

        if (targetState === 'lobby') {
            connRef.current?.close?.();
            connRef.current?._unsubscribe?.();
            connRef.current = null;
            setConn(null);
            setMyProfile(null);
            setOppProfile(null);
            setIsHost(false);
            setIsAI(false);
            selectedPackIdRef.current = null;
            setSelectedPackId(null);
            setMySecretIds([]);
            setOppSecretReady(false);
            setOpponentSecretCount(1);
            opponentSecretCountRef.current = 1;
            setMyQuestionsAsked(0);
            opponentQuestionsAskedRef.current = 0;
            setMyScore(0);
            setOppScore(0);
        } else if (targetState === 'pack_select') {
            setMySecretIds([]);
            setOppSecretReady(false);
            setOpponentSecretCount(1);
            opponentSecretCountRef.current = 1;
            askedQuestionsRef.current = new Set();
            receivedQuestionIdsRef.current = new Set();
            resolvedQuestionIdsRef.current = new Set();
            answeredQuestionIdsRef.current = new Set();
            turnRevisionRef.current = 0;
            questionsThisTurnRef.current = 0;
        } else if (targetState === 'secret_setup') {
            setMySecretIds([]);
            setOppSecretReady(false);
            setOpponentSecretCount(1);
            opponentSecretCountRef.current = 1;
            setSelectedConditionId(null);
            selectedConditionRef.current = null;
            setRulesAcknowledged(false);
            setOpponentRulesAcknowledged(false);
        }

        updateGameState(targetState);
        playWhoAmISound('tap');
    };
    backStepRef.current = handleBackStep;

    const mySecretCardObjs = mySecretIds.map(id => currentPack?.cards.find(card => card.id === id)).filter(Boolean);
    const revealedOpponentIds = opponentSecretIds.length ? opponentSecretIds : (opponentSecretId ? [opponentSecretId] : []);
    const opponentSecretCardObjs = revealedOpponentIds.map(id => currentPack?.cards.find(card => card.id === id)).filter(Boolean);
    const totalCards = currentPack?.cards.length || 0;

    useEffect(() => () => {
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        if (rpsResultTimerRef.current) clearTimeout(rpsResultTimerRef.current);
    }, []);

    return (
        <div className="fixed inset-0 flex h-[100dvh] flex-col overflow-hidden font-arabic select-none" style={{ background: 'var(--bg-base)' }}>
            <ConnectionPauseOverlay />
            {showChat && (
                <EmotesOverlay
                    conn={conn}
                    oppProfile={oppProfile}
                    simulateAIReplies={isAI}
                    initialTab="messages"
                    keepChatOpenOnSend
                />
            )}

            {gameState !== 'lobby' ? (
                <PlayerGameHeader
                    title="أنا مين؟"
                    gameId="whoami-online"
                    myProfile={myProfile}
                    oppProfile={oppProfile}
                    myScore={myScore}
                    oppScore={oppScore}
                    turnsActive={gameState === 'playing'}
                    isMyTurn={turnPhase === 'answer' ? pendingQuestion?.from !== myPlayerId : isMyTurn}
                    onLeave={() => backStepRef.current?.()}
                    backTitle="رجوع خطوة"
                    showChatButton={showChat}
                />
            ) : (
                    <div className="mx-auto mb-3 grid w-full max-w-sm shrink-0 grid-cols-3 items-center px-4 py-3 z-10">
                    <div className="shrink-0"><Logo size="small" /></div>
                    <div className="flex justify-center">
                        <div className="flex items-center gap-2 glass-card px-3.5 py-1.5 rounded-2xl border border-white/10 shrink-0">
                            <GameIcon gameId="whoami-online" size={18} className="text-[var(--accent)]" />
                            <span className="text-xs font-black gradient-text">أنا مين؟</span>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button onClick={() => setView('hub')} className="glass-card px-4 py-2 rounded-2xl text-xs font-bold hover:scale-105 transition-transform shrink-0">
                            الرئيسية
                        </button>
                    </div>
                </div>
            )}

            {gameState === 'lobby' && (
                <div className="flex-1 flex flex-col pb-16 safe-area-pb">
                    <div className="mx-auto mb-2 w-full max-w-md px-4">
                        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center">
                            <p className="text-xs font-black text-white">{useGameChat ? 'عن بُعد · بالدردشة' : isTogetherMode ? 'سوا · بالدردشة الاختيارية' : 'اللعب مع الذكاء الاصطناعي'}</p>
                            <p className="mt-1 text-[10px] font-medium text-white/45">{useGameChat ? 'اتصال بين جهازين مع أيقونة دردشة صغيرة' : isTogetherMode ? 'اتصال بين جهازين؛ الدردشة متاحة من الأيقونة فقط' : 'الدردشة متاحة من الأيقونة الصغيرة'}</p>
                        </div>
                    </div>
                    <div className="min-h-0 flex-1">
                        <P2PConnectionManager
                            // Keep both WhoAmI modes on the original Firebase room path
                            // (the configured RTDB rules already allow this namespace).
                            // The invite query still carries the mode so guests open the
                            // matching remote/chat or together/no-chat experience.
                            gameIdPrefix="celia-whoami"
                            inviteGameId={mode === 'together' ? 'celia-whoami-together' : 'celia-whoami'}
                            onGameStart={handleGameStart}
                        />
                    </div>
                </div>
            )}

            {/* Pack Select */}
            {gameState === 'pack_select' && (
                <PackSelect 
                    isHost={isHost} 
                    onPackSelect={handlePackSelect} 
                    selectedPackId={selectedPackId} 
                />
            )}

            {/* Secret Card Pick */}
            {gameState === 'secret_setup' && (
                <SecretCardPick 
                    pack={currentPack} 
                    onSelect={handleSecretPick} 
                    selectedIds={mySecretIds}
                    chooseCount={gameMode === 'free' ? 2 : 1}
                    allowOneOrTwo={gameMode === 'free'}
                    isReady={gameMode === 'free' ? mySecretIds.length >= 1 && mySecretIds.length <= 2 : mySecretIds.length === 1}
                    oppSecretReady={oppSecretReady} 
                    opponentSecretCount={opponentSecretCount}
                />
            )}

            {gameState === 'mode_setup' && (
                <MatchModeSelect isHost={isHost} onSelect={selectGameMode} />
            )}

            {gameState === 'rules_intro' && (
                <MatchRulesBriefing
                    gameMode={gameMode}
                    isHost={isHost}
                    selectedConditionId={selectedConditionId}
                    isReady={rulesAcknowledged}
                    opponentReady={opponentRulesAcknowledged}
                    mySecretCount={mySecretIds.length}
                    opponentSecretCount={opponentSecretCount}
                    verbalMode={isTogetherMode}
                    onSelectCondition={selectMatchCondition}
                    onReady={acknowledgeRules}
                />
            )}

            {gameState === 'rps_setup' && (
                <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4 text-center">
                    <div>
                        <div className="mb-2 text-5xl">✊ ✋ ✌️</div>
                        <h2 className="text-2xl font-black">حجر ورقة مقص</h2>
                        <p className="mt-2 text-sm text-white/60">{isTogetherMode ? 'الفائز يبدأ الدور. لو تعادلتوا، العبوا مرة ثانية.' : 'الفائز يبدأ بالسؤال. لو تعادلتوا، العبوا مرة ثانية.'}</p>
                    </div>
                    <div className="grid w-full max-w-md grid-cols-3 gap-3">
                        {RPS_OPTIONS.map(option => (
                            <button
                                key={option.id}
                                onClick={() => chooseRps(option.id)}
                                disabled={Boolean(rpsChoice)}
                                className={`glass-card rounded-2xl border p-4 transition hover:-translate-y-1 disabled:opacity-60 ${rpsChoice === option.id ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-white/10'}`}
                            >
                                <span className="block text-4xl">{option.icon}</span>
                                <span className="mt-2 block text-sm font-black">{option.label}</span>
                            </button>
                        ))}
                    </div>
                    <div className="text-sm font-bold text-white/65">{rpsChoice ? 'اختيارك اتسجل، في انتظار الخصم...' : rpsMessage}</div>
                    {opponentRpsChoice && <div className="text-xs text-sky-300">الخصم اختار، النتيجة لحظات...</div>}
                </div>
            )}

            {gameState === 'rps_result' && rpsFirstPlayer && (
                <div className="flex flex-1 flex-col items-center justify-center px-4 text-center animate-fade-in">
                    <section className="glass-card w-full max-w-md rounded-3xl border border-[var(--accent)]/35 p-7 shadow-[0_0_32px_var(--accent-soft)]">
                        <div className="mb-3 text-5xl" aria-hidden="true">🏆</div>
                        <p className="text-xs font-black text-white/55">نتيجة حجر ورقة مقص</p>
                        <h2 className="mt-2 text-3xl font-black text-[var(--accent)]">{rpsWinnerName} فاز!</h2>
                        <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/[0.08] px-4 py-3">
                            <p className="text-base font-black text-emerald-100">{rpsWinnerName} {isTogetherMode ? 'هيبدأ الدور' : 'هيبدأ بالسؤال'}</p>
                            <p className="mt-1 text-xs text-white/60">دي نتيجة الجولة، وبعدها ندخل لوحة اللعب.</p>
                        </div>
                        <p className="mt-4 text-xs font-bold text-white/50">هنبدأ اللعب بعد لحظات...</p>
                    </section>
                </div>
            )}

            {/* Playing */}
            {gameState === 'playing' && (
                <div className="flex min-h-0 flex-1 flex-col w-full overflow-hidden animate-fade-in">

                    <div className="shrink-0 px-2 pt-1.5">
                        <div className="flex min-w-0 items-center gap-2 rounded-xl border px-2 py-1.5" style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent-border)' }}>
                            {mySecretCardObjs.map(card => (
                                <button
                                    key={card.id}
                                    type="button"
                                    onClick={() => setPreviewCard(card)}
                                    aria-label={`تكبير بطاقة ${card.name}`}
                                    title={`عرض ${card.name} بحجم أكبر`}
                                    className="shrink-0 rounded-lg transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                                >
                                    <CardPortrait pack={currentPack} card={card} className="relative h-9 w-9 rounded-lg border border-white/15" />
                                </button>
                            ))}
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[10px] font-bold opacity-55">بطاقتك السرية عند خصمك</p>
                                <p className="truncate text-xs font-black" style={{ color: 'var(--accent)' }}>{mySecretCardObjs.map(card => card.name).join('، ') || '—'}</p>
                            </div>
                            <div className="shrink-0 text-left">
                                <p className="text-[9px] font-bold opacity-55">أغلق خصمك</p>
                                <p className="text-xs font-black" style={{ color: 'var(--accent)' }}>{oppClosedCount}/{totalCards}</p>
                            </div>
                        </div>
                        <div className="mt-1 flex min-h-6 flex-wrap items-center justify-center gap-1.5 text-[10px] font-black">
                            {gameMode === 'free' && <span className="rounded-full border border-sky-300/20 bg-sky-400/10 px-2 py-0.5 text-sky-200">مود حر · {guessedOpponentSecretIds.length}/{opponentSecretCount} كروت مكتشفة</span>}
                            {selectedConditionId && <span className="rounded-full border border-[var(--accent)]/20 bg-[var(--accent-soft)] px-2 py-0.5 text-white/75">الشرط: {getMatchCondition(selectedConditionId)?.title}</span>}
                            {selectedConditionId === 'three_questions' && <span className="rounded-full bg-amber-300/10 px-2 py-0.5 text-amber-200">أسئلتك {Math.min(myQuestionsAsked, QUESTION_LIMIT)}/{QUESTION_LIMIT}</span>}
                            {selectedConditionId === 'turn_timer' && <span className={`rounded-full px-2 py-0.5 ${secondsLeft <= 8 ? 'bg-rose-400/15 text-rose-200' : 'bg-amber-300/10 text-amber-200'}`}>الوقت {secondsLeft}ث</span>}
                        </div>
                    </div>

                    {/* ─── Turn Indicator ─── */}
                    <div aria-live="polite" className={`mx-2 mt-1 shrink-0 rounded-lg border px-2 py-1.5 text-center text-xs font-black ${isMyTurn ? 'text-[var(--bg-base)]' : 'text-white/70'}`}
                    style={{ background: isMyTurn ? 'var(--accent)' : 'var(--glass-bg)', borderColor: isMyTurn ? 'transparent' : 'var(--glass-border)' }}>
                        {isTogetherMode
                            ? (isMyTurn ? 'دورك — استبعد أو خمّن، وبعدها سلّم الدور' : 'دور الخصم')
                            : pendingQuestion && pendingQuestion.from === myPlayerId
                            ? '💬 في انتظار إجابة الخصم...'
                            : pendingQuestion && pendingQuestion.from !== myPlayerId
                                ? '💬 أجب عن سؤال الخصم'
                                : isMyTurn && noAnswerActionOnly
                                    ? 'الإجابة لأ — استبعد أو خمّن ثم سلّم الدور'
                                : isMyTurn && selectedConditionId === 'interrupt_once' && lastAnswer === 'no'
                                    ? 'الإجابة لأ — استبعد أو خمّن ثم سلّم الدور'
                                : isMyTurn && selectedConditionId === 'yes_elimination' && lastAnswer === 'no'
                                    ? 'الإجابة لأ — اسأل أو خمّن؛ الاستبعاد بعد أيوه فقط'
                                : isMyTurn && selectedConditionId === 'yes_continue' && lastAnswer === 'yes'
                                    ? 'الإجابة أيوه — كمّل السؤال أو استبعد أو خمّن'
                                : isMyTurn && selectedConditionId === 'interrupt_once' && lastAnswer === 'yes'
                                    ? 'الإجابة أيوه — استبعد أو خمّن ثم سلّم الدور'
                                    : isMyTurn && lastAnswer === 'yes'
                                        ? 'الإجابة أيوه — استبعد أو خمّن ثم سلّم الدور'
                                        : isMyTurn ? 'دورك — اسأل أو خمّن' : 'دور الخصم'}
                    </div>

                    {!isTogetherMode && pendingQuestion && turnPhase === 'answer' && (
                        <div className="mx-2 mt-1 flex shrink-0 items-center gap-2 rounded-xl border border-sky-300/25 bg-sky-400/10 px-2.5 py-2" role="group" aria-label="الرد على سؤال الخصم">
                            <div className="min-w-0 flex-1 text-right">
                                <p className="text-[9px] font-black text-sky-200">{useGameChat ? 'سؤال الخصم' : 'الخصم بيسألك'}</p>
                                <p className="line-clamp-2 text-xs font-black text-white" dir="auto">
                                    {useGameChat ? pendingQuestion.text : 'اسمع السؤال بصوت خصمك، وبعدها اختار الإجابة.'}
                                </p>
                            </div>
                            {pendingQuestion.from !== myPlayerId ? (
                                <div className="grid w-[116px] shrink-0 grid-cols-2 gap-1.5">
                                    <button type="button" onClick={() => answerQuestion('yes')} className="rounded-lg bg-emerald-500 py-2 text-xs font-black text-slate-950">نعم</button>
                                    <button type="button" onClick={() => answerQuestion('no')} className="rounded-lg bg-rose-500 py-2 text-xs font-black text-white">لا</button>
                                </div>
                            ) : <span className="shrink-0 text-[10px] font-bold text-white/55">في انتظار الإجابة</span>}
                        </div>
                    )}

                    {guessFeedback && (
                        <div
                            role="status"
                            className="mx-2 mt-1 shrink-0 truncate rounded-lg border px-2 py-1 text-center text-[10px] font-black"
                            style={{ background: 'rgba(251,54,64,0.12)', borderColor: 'rgba(251,54,64,0.35)', color: '#ff8b91' }}
                        >
                            {guessFeedback}
                        </div>
                    )}

                    {!isTogetherMode && turnPhase !== 'answer' && isMyTurn && (
                        <div className="mx-2 mt-1 shrink-0 rounded-xl border border-white/10 bg-black/15 p-1.5">
                            {canAskQuestion ? (
                                useGameChat ? (
                                    <div className="flex gap-1.5">
                                        <input
                                            value={questionText}
                                            onChange={event => setQuestionText(event.target.value)}
                                            onKeyDown={event => { if (event.key === 'Enter') askQuestion(); }}
                                            placeholder="اكتب سؤالك..."
                                            maxLength={120}
                                            disabled={selectedConditionId === 'three_questions' && myQuestionsAsked >= QUESTION_LIMIT}
                                            className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2.5 text-sm text-white outline-none focus:border-[var(--accent)]"
                                        />
                                        <button onClick={askQuestion} disabled={!questionText.trim() || (selectedConditionId === 'three_questions' && myQuestionsAsked >= QUESTION_LIMIT)} className="h-9 rounded-lg px-4 text-xs font-black disabled:opacity-35" style={{ background: 'var(--accent)', color: 'var(--bg-base)' }}>اسأل</button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={askQuestion}
                                        disabled={selectedConditionId === 'three_questions' && myQuestionsAsked >= QUESTION_LIMIT}
                                        className="h-9 w-full rounded-lg px-4 text-xs font-black disabled:opacity-35"
                                        style={{ background: 'var(--accent)', color: 'var(--bg-base)' }}
                                    >
                                        هسأل
                                    </button>
                                )
                            ) : (
                                <p className="py-1 text-center text-[10px] font-bold text-emerald-100">
                                    {noAnswerActionOnly ? 'استبعد بطاقاتك أو خمّن، وبعدها سلّم الدور.' : 'استبعد أو خمّن، وبعدها سلّم الدور.'}
                                </p>
                            )}
                            {selectedConditionId === 'yes_elimination' && lastAnswer !== 'yes' && (
                                <p className="mt-1 text-center text-[9px] font-bold text-amber-200">الاستبعاد بعد إجابة أيوه فقط.</p>
                            )}
                            <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
                                {selectedConditionId === 'single_hint' && myQuestionsAsked > 0 && !hintUsed && (
                                    <button onClick={requestHint} className="rounded-full border border-amber-300/30 px-2.5 py-1 text-[9px] font-black text-amber-200">التلميح الوحيد</button>
                                )}
                                {hintText && <span className="max-w-full truncate rounded-full bg-amber-300/10 px-2.5 py-1 text-[9px] font-black text-amber-100">{hintText}</span>}
                            </div>
                        </div>
                    )}
                    {!isMyTurn && turnPhase !== 'answer' && selectedConditionId === 'interrupt_once' && hasAskedAnyQuestion && !myInterruptUsed && (
                        <button onClick={interruptTurn} className="mx-2 mt-1 shrink-0 rounded-lg border border-fuchsia-300/30 bg-fuchsia-400/10 px-3 py-2 text-[10px] font-black text-fuchsia-100">أوقف الدور وخد فرصتك مرة واحدة</button>
                    )}

                    {/* ─── Card Board ─── */}
                    <CardBoard 
                        pack={currentPack} 
                        closedCards={myClosedCards} 
                        onToggleCard={toggleCard} 
                        onPreviewCard={setPreviewCard}
                        myTurn={canEliminate}
                    />

                    {/* ─── Bottom Action Bar ─── */}
                    <div className="shrink-0 border-t px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]" style={{ borderColor: 'var(--glass-border)', background: 'var(--bg-base)' }}>
                        <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowBoardModal(true)}
                            className="flex-1 rounded-xl border py-2.5 text-xs font-black transition active:scale-95"
                            style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-color)' }}
                        >
                            🗂️ عرض اللوحة
                        </button>
                        <button
                            onClick={() => setShowGuessModal(true)}
                            disabled={!canGuess}
                            className={`flex-1 rounded-xl py-2.5 text-sm font-black transition-all duration-300 ${
                                canGuess
                                    ? 'active:scale-95 shadow-[0_0_15px_var(--accent-glow)] text-[var(--bg-base)]'
                                    : 'opacity-30 cursor-not-allowed text-white/50'
                            }`}
                            style={{
                                background: canGuess ? 'var(--accent)' : 'var(--glass-bg)',
                            }}
                        >
                            تخمين 🎯
                        </button>
                        
                        <button
                            onClick={endTurn}
                            disabled={!canGuess}
                            className={`flex-1 rounded-xl py-2.5 text-sm font-black transition-all duration-300 border ${
                                canGuess ? 'active:scale-95 text-white' : 'opacity-30 cursor-not-allowed text-white/50'
                            }`}
                            style={{
                                background: canGuess ? 'var(--glass-bg)' : 'transparent',
                                borderColor: 'var(--glass-border)',
                            }}
                        >
                            سلّم الدور ⏳
                        </button>

                        </div>
                    </div>
                </div>
            )}

            {showBoardModal && ['playing', 'game_over'].includes(gameState) && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-2 backdrop-blur-md sm:p-5"
                    onClick={() => setShowBoardModal(false)}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="whoami-board-title"
                        className="flex h-[94dvh] max-h-[920px] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border shadow-2xl"
                        style={{ background: 'var(--bg-base)', borderColor: 'var(--glass-border)' }}
                        onClick={event => event.stopPropagation()}
                    >
                        <header className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--glass-border)' }}>
                            <div>
                                <h2 id="whoami-board-title" className="text-base font-black">{gameState === 'game_over' ? 'اللوحة كاملة' : 'عرض اللوحة'}</h2>
                                <p className="mt-0.5 text-xs opacity-55">اضغط على أيقونة العين لعرض خصائص البطاقة — العرض فقط</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowBoardModal(false)}
                                aria-label="إغلاق اللوحة"
                                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border text-xl"
                                style={{ borderColor: 'var(--glass-border)', background: 'var(--glass-bg)' }}
                            >
                                ×
                            </button>
                        </header>
                        <CardBoard
                            pack={currentPack}
                            closedCards={myClosedCards}
                            onPreviewCard={setPreviewCard}
                            myTurn={false}
                            viewOnly
                        />
                    </section>
                </div>
            )}

            {previewCard && (
                <div
                    className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
                    onClick={() => setPreviewCard(null)}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="whoami-card-preview-title"
                        className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-3xl border p-4 shadow-2xl custom-scrollbar sm:p-5"
                        style={{ background: 'var(--bg-base)', borderColor: 'var(--glass-border)' }}
                        onClick={event => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setPreviewCard(null)}
                            aria-label="إغلاق البطاقة"
                            className="absolute left-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border bg-black/60 text-xl text-white"
                            style={{ borderColor: 'var(--glass-border)' }}
                        >
                            ×
                        </button>
                        <div className="mx-auto w-full max-w-[18rem] overflow-hidden rounded-2xl border shadow-xl" style={{ borderColor: 'var(--glass-border)' }}>
                            <CardPortrait pack={currentPack} card={previewCard} fit="contain" className="relative aspect-[4/5] w-full" />
                        </div>
                        <h2 id="whoami-card-preview-title" className="mt-4 text-center text-2xl font-black" style={{ color: 'var(--accent)' }}>
                            {previewCard.name}
                        </h2>
                        {Object.entries(previewCard.attrs || {}).length > 0 && (
                            <div className="mt-4 grid grid-cols-2 gap-2">
                                {Object.entries(previewCard.attrs).map(([key, value]) => (
                                    <div key={key} className="min-w-0 rounded-xl border px-3 py-2" style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
                                        <p className="truncate text-[10px] font-bold opacity-55">{QUESTION_ATTRIBUTES[key] || key}</p>
                                        <p className="mt-0.5 truncate text-sm font-black">
                                            {QUESTION_VALUES[String(value)] ?? String(value)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            )}

            {/* ─── Game Over Modal ─── */}
            {gameState === 'game_over' && (
                <div className="fixed inset-0 z-50 backdrop-blur-lg flex items-center justify-center p-4 animate-fade-in" style={{ background: 'rgba(0,0,0,0.8)' }}>
                    <div className="glass-card max-w-sm w-full max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl border custom-scrollbar" style={{ borderColor: 'var(--glass-border)' }}>
                        
                        {/* Header */}
                        <div
                            className="p-6 text-center"
                            style={{ background: winner === myPlayerId ? 'var(--accent-soft)' : 'rgba(251,54,64,0.1)' }}
                        >
                            <div className="text-5xl mb-2">
                                {winner === myPlayerId ? '🏆' : '💀'}
                            </div>
                            <h2 className="text-2xl font-black" style={{ color: winner === myPlayerId ? 'var(--accent)' : '#FB3640' }}>
                                {winner === myPlayerId ? 'كشفت السر!' : 'اكتشفوك!'}
                            </h2>
                            <p className="text-sm opacity-60 mt-1">
                                {winner === myPlayerId ? 'أنت عرفت بطاقة خصمك' : 'خصمك عرف بطاقتك السرية'}
                            </p>
                        </div>

                        {/* Reveal both secret cards */}
                        <div className="p-5">
                            <div className="grid grid-cols-2 gap-3 mb-5">
                                <div className="min-w-0 rounded-2xl border p-2.5" style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
                                    <p className="mb-2 truncate text-center text-[11px] font-black opacity-65">شخصية خصمك</p>
                                    {opponentSecretCardObjs.length ? (
                                        <div className={`grid ${opponentSecretCardObjs.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                                            {opponentSecretCardObjs.map(card => (
                                                <div key={card.id} className="min-w-0">
                                                    <CardPortrait pack={currentPack} card={card} fit="contain" className="relative aspect-square w-full rounded-xl border border-white/10" />
                                                    <p className="mt-2 truncate text-center text-xs font-black" style={{ color: 'var(--accent)' }}>{card.name}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="grid aspect-square place-items-center rounded-xl bg-white/5 px-2 text-center text-[11px] font-bold opacity-50">
                                            جاري كشف البطاقة...
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 rounded-2xl border p-2.5" style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
                                    <p className="mb-2 truncate text-center text-[11px] font-black opacity-65">شخصيتك السرية</p>
                                    {mySecretCardObjs.length ? (
                                        <div className={`grid ${mySecretCardObjs.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                                            {mySecretCardObjs.map(card => (
                                                <div key={card.id} className="min-w-0">
                                                    <CardPortrait pack={currentPack} card={card} fit="contain" className="relative aspect-square w-full rounded-xl border border-white/10" />
                                                    <p className="mt-2 truncate text-center text-xs font-black" style={{ color: 'var(--accent)' }}>{card.name}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="grid aspect-square place-items-center rounded-xl bg-white/5 px-2 text-center text-[11px] font-bold opacity-50">—</div>
                                    )}
                                </div>
                            </div>

                            {/* Score */}
                            <div className="grid grid-cols-2 gap-2 mb-5">
                                <div className="rounded-xl p-3 text-center border" style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
                                    <p className="text-xs opacity-50 mb-1">أنت</p>
                                    <p className="text-2xl font-black" style={{ color: 'var(--accent)' }}>{myScore}</p>
                                </div>
                                <div className="rounded-xl p-3 text-center border" style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
                                    <p className="text-xs opacity-50 mb-1">{oppProfile?.nickname || 'الخصم'}</p>
                                    <p className="text-2xl font-black" style={{ color: '#FB3640' }}>{oppScore}</p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => { playWhoAmISound('click'); setShowBoardModal(true); }}
                                className="mb-3 w-full rounded-2xl border py-3 text-sm font-black transition active:scale-95"
                                style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-color)' }}
                            >
                                🗂️ عرض اللوحة كاملة بدون استبعاد
                            </button>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={requestRematch}
                                    className="flex-1 py-3.5 rounded-2xl font-black text-sm transition-all active:scale-95"
                                    style={{ background: 'var(--accent)', color: 'var(--bg-base)' }}
                                >
                                    إعادة اللعب 🔄
                                </button>
                                <button
                                    onClick={() => { playWhoAmISound('click'); setView('hub'); }}
                                    className="flex-1 py-3.5 rounded-2xl font-black text-sm border transition-all active:scale-95"
                                    style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)', color: 'var(--text-color)' }}
                                >
                                    الخروج 🚪
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Guess Modal */}
            {showGuessModal && canGuess && (
                <GuessModal 
                    pack={currentPack}
                    closedCards={myClosedCards}
                    onGuess={handleGuess}
                    onClose={() => setShowGuessModal(false)}
                />
            )}
        </div>
    );
}
