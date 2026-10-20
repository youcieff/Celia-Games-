import { PACKS } from '../games/WhoAmI/packs';
import { WHOAMI_QUESTIONS } from './whoAmIQuestions';
import { isValidWhoAmITransfer, resolveWhoAmIAnswer, shouldAIUseInterrupt } from '../games/WhoAmI/turnRules';

const AI_PLAYER = 'p2';
const QUESTION_LIMIT = 3;
const HINT_LABELS = {
    gender: 'النوع', hairColor: 'لون الشعر', hairLength: 'طول الشعر', glasses: 'النظارة', hat: 'القبعة',
    facialHair: 'اللحية أو الشارب', earrings: 'الحلق', ageGroup: 'العمر', skinTone: 'لون البشرة',
    smiling: 'الابتسامة', habitat: 'الموطن', hasFur: 'الفرو', hasWings: 'الأجنحة', legsCount: 'عدد الأرجل',
    size: 'الحجم', diet: 'نوع الغذاء', isPet: 'حيوان أليف', temperature: 'درجة الحرارة', taste: 'الطعم',
    course: 'نوع الوجبة', origin: 'الأصل', mainIngredient: 'المكوّن الأساسي', eatenWithHand: 'طريقة الأكل'
};
const HINT_VALUES = {
    true: 'نعم', false: 'لا', male: 'رجل', female: 'امرأة', black: 'أسود', brown: 'بني', blonde: 'أشقر',
    red: 'أحمر', gray: 'رمادي', none: 'بدون', long: 'طويل', short: 'قصير', young: 'شاب', adult: 'بالغ',
    elderly: 'كبير في السن', light: 'فاتح', medium: 'متوسط', dark: 'داكن', land: 'بري', water: 'مائي', air: 'هوائي',
    large: 'كبير', small: 'صغير', meat: 'لحوم', plants: 'نباتات', hot: 'ساخن', cold: 'بارد', sweet: 'حلو',
    savory: 'حادق', main: 'وجبة رئيسية', snack: 'وجبة خفيفة', dessert: 'حلوى', drink: 'مشروب', egyptian: 'مصري',
    international: 'عالمي', rice: 'أرز', dough: 'عجين', dairy: 'ألبان', vegetable: 'خضروات', fruit: 'فاكهة',
    sugar: 'سكر', '0': 'بلا أرجل', '2': 'رجلان', '4': 'أربع أرجل', '6': 'ست أرجل', '8': 'ثماني أرجل'
};

const clean = value => String(value || '')
    .toLocaleLowerCase('ar')
    .normalize('NFD')
    .replace(/[\u064B-\u065F\u0670\u0640]/gu, '')
    .replace(/[؟?!.,،\s]+/gu, '');
const normalizeQuestion = value => clean(value)
    .replace(/[أإآ]/gu, 'ا')
    .replace(/ى/gu, 'ي')
    .replace(/ة/gu, 'ه')
    .replace(/^(وهل|هل|هو|هي)/u, '');

export default class WhoAmIAI {
    constructor(conn) {
        this.conn = conn;
        this.packId = null;
        this.packCards = [];
        this.gameMode = 'rules';
        this.conditionId = null;
        this.mySecretIds = [];
        this.opponentSecretCount = 1;
        this.guessedOpponentSecretIds = new Set();
        this.possibleCards = [];
        this.possibleSecretSets = [];
        this.askedQuestions = new Set();
        this.seenPlayerQuestionIds = new Set();
        this.pendingPlayerQuestionId = null;
        this.pendingAIQuestion = null;
        this.pendingGuessId = null;
        this.pendingGuessAttemptId = null;
        this.guessSequence = 0;
        this.questionsAsked = 0;
        this.questionsThisTurn = 0;
        this.playerQuestionsThisTurn = 0;
        this.playerQuestionsAsked = 0;
        this.hintUsed = false;
        this.playerHintUsed = false;
        this.interruptUsed = { p1: false, p2: false };
        this.currentTurn = null;
        this.pendingRpsFirstPlayer = null;
        this.turnToken = 0;
        this.random = Math.random;

        setTimeout(() => {
            this.conn?._sendToPlayer?.({
                type: 'global_ready',
                profile: { nickname: 'الذكاء الاصطناعي', avatar: 'robot', isAI: true }
            });
        }, 100);
    }

    resetRound({ chooseSecrets = true } = {}) {
        this.turnToken += 1;
        this.conditionId = null;
        this.mySecretIds = [];
        this.opponentSecretCount = 1;
        this.guessedOpponentSecretIds.clear();
        this.possibleCards = [...this.packCards];
        this.possibleSecretSets = [];
        if (this.gameMode === 'free') {
            this.possibleSecretSets = this.buildSecretSets(this.opponentSecretCount);
        }
        this.askedQuestions.clear();
        this.seenPlayerQuestionIds.clear();
        this.pendingPlayerQuestionId = null;
        this.pendingAIQuestion = null;
        this.pendingGuessId = null;
        this.pendingGuessAttemptId = null;
        this.questionsAsked = 0;
        this.questionsThisTurn = 0;
        this.playerQuestionsThisTurn = 0;
        this.playerQuestionsAsked = 0;
        this.hintUsed = false;
        this.playerHintUsed = false;
        this.interruptUsed = { p1: false, p2: false };
        this.currentTurn = null;
        this.pendingRpsFirstPlayer = null;
        if (chooseSecrets) this.chooseSecrets();
    }

    chooseSecrets() {
        const count = this.gameMode === 'free' ? (this.random() < 0.5 ? 1 : 2) : 1;
        const pool = [...this.packCards];
        this.mySecretIds = [];
        while (pool.length && this.mySecretIds.length < count) {
            const index = Math.floor(this.random() * pool.length);
            this.mySecretIds.push(pool.splice(index, 1)[0].id);
        }
        if (this.mySecretIds.length === count) {
            this.conn?._sendToPlayer?.({ type: 'secret_ready', count: this.mySecretIds.length });
        }
    }

    buildSecretSets(count) {
        if (count === 1) return this.packCards.map(card => [card]);
        const sets = [];
        for (let first = 0; first < this.packCards.length; first += 1) {
            for (let second = first + 1; second < this.packCards.length; second += 1) {
                sets.push([this.packCards[first], this.packCards[second]]);
            }
        }
        return sets;
    }

    onMessage(data) {
        switch (data?.type) {
            case 'pack_selected': {
                this.packId = data.packId;
                const pack = PACKS.find(item => item.id === this.packId);
                this.packCards = pack?.cards || [];
                this.resetRound({ chooseSecrets: false });
                break;
            }
            case 'pack_confirmed':
                break;
            case 'game_mode':
                if (!['rules', 'free'].includes(data.mode)) break;
                this.gameMode = data.mode;
                this.resetRound();
                break;
            case 'whoami_condition_selected':
                this.conditionId = data.conditionId || null;
                break;
            case 'secret_ready':
                this.opponentSecretCount = Math.min(2, Math.max(1, Number(data.count) || 1));
                if (this.gameMode === 'free') this.possibleSecretSets = this.buildSecretSets(this.opponentSecretCount);
                break;
            case 'rps_choice':
                this.sendRpsChoice();
                break;
            case 'rps_result':
                if (data.winner === 'draw') {
                    this.currentTurn = null;
                    this.pendingRpsFirstPlayer = null;
                    this.turnToken += 1;
                } else if (data.firstPlayer) {
                    this.pendingRpsFirstPlayer = data.firstPlayer;
                }
                break;
            case 'game_started': {
                const firstPlayer = data.firstPlayer || this.pendingRpsFirstPlayer;
                if (['p1', 'p2'].includes(firstPlayer)) {
                    this.pendingRpsFirstPlayer = null;
                    this.setTurn(firstPlayer);
                }
                break;
            }
            case 'whoami_question':
                this.answerPlayerQuestion(data);
                break;
            case 'whoami_answer':
                this.receiveAnswer(data);
                break;
            case 'whoami_pass':
                if (isValidWhoAmITransfer({ from: data.from, nextPlayer: data.nextPlayer, currentTurn: this.currentTurn })) {
                    this.setTurn(data.nextPlayer);
                }
                break;
            case 'whoami_timeout': {
                const aiAnsweredTimeout = Boolean(data.questionId)
                    && data.questionId === this.pendingPlayerQuestionId
                    && data.from === AI_PLAYER
                    && data.nextPlayer === 'p1';
                const playerAnsweredTimeout = Boolean(data.questionId)
                    && data.questionId === this.pendingAIQuestion?.id
                    && data.from === 'p1'
                    && data.nextPlayer === AI_PLAYER;
                const validTurnTimeout = !data.questionId
                    && isValidWhoAmITransfer({ from: data.from, nextPlayer: data.nextPlayer, currentTurn: this.currentTurn });
                if (aiAnsweredTimeout || validTurnTimeout) this.setTurn(data.nextPlayer);
                else if (playerAnsweredTimeout) {
                    this.pendingAIQuestion = null;
                    this.setTurn(AI_PLAYER);
                }
                break;
            }
            case 'whoami_interrupt':
                if (this.conditionId === 'interrupt_once' && ['p1', 'p2'].includes(data.playerId) && data.playerId !== this.currentTurn && !this.interruptUsed[data.playerId]) {
                    this.interruptUsed[data.playerId] = true;
                    this.setTurn(data.playerId);
                }
                break;
            case 'whoami_hint_request':
                this.sendHint(data.playerId);
                break;
            case 'whoami_hint_result':
                this.applyHint(data);
                break;
            case 'chat':
                this.replyToChat(data.text);
                break;
            case 'guess_made':
                this.checkPlayerGuess(data.cardId, data);
                break;
            case 'guess_result':
                this.receiveGuessResult(data);
                break;
            case 'game_over':
                this.turnToken += 1;
                this.currentTurn = null;
                break;
            case 'rematch_request':
                this.resetRound();
                break;
            default:
                break;
        }
    }

    sendRpsChoice() {
        const choices = ['rock', 'paper', 'scissors'];
        const choice = choices[Math.floor(this.random() * choices.length)];
        setTimeout(() => this.conn?._sendToPlayer?.({ type: 'rps_choice', choice }), 250);
    }

    setTurn(playerId) {
        if (!['p1', 'p2'].includes(playerId)) return;
        this.currentTurn = playerId;
        this.pendingAIQuestion = null;
        this.pendingPlayerQuestionId = null;
        this.pendingGuessId = null;
        this.pendingGuessAttemptId = null;
        this.questionsThisTurn = 0;
        this.playerQuestionsThisTurn = 0;
        this.turnToken += 1;
        if (playerId === AI_PLAYER) this.scheduleTurn();
    }

    scheduleTurn(delay = 500) {
        const token = ++this.turnToken;
        setTimeout(() => {
            if (token !== this.turnToken || this.currentTurn !== AI_PLAYER) return;
            this.takeTurn();
        }, delay);
    }

    takeTurn() {
        if (this.currentTurn !== AI_PLAYER || !this.packCards.length) return;

        // Use the single hint only after the AI has asked at least one question.
        if (this.conditionId === 'single_hint' && this.questionsAsked > 0 && !this.hintUsed) {
            this.hintUsed = true;
            this.conn?._sendToPlayer?.({ type: 'whoami_hint_request', playerId: AI_PLAYER });
            this.scheduleTurn(1200);
            return;
        }

        const alreadyGuessed = this.guessedOpponentSecretIds;
        let candidates = this.gameMode === 'free'
            ? this.getFreeCandidates()
            : this.possibleCards.filter(card => !alreadyGuessed.has(card.id));
        if (!candidates.length) candidates = this.packCards.filter(card => !alreadyGuessed.has(card.id));
        if (!candidates.length) return;

        // Make a guess when the remaining set is small enough to create pressure.
        const shouldGuess = candidates.length === 1 || (candidates.length <= 3 && this.random() < 0.34);
        if (shouldGuess) {
            const card = candidates[Math.floor(this.random() * candidates.length)];
            this.pendingGuessId = card.id;
            this.pendingGuessAttemptId = `ai-guess-${++this.guessSequence}`;
            this.pendingAIQuestion = null;
            this.conn?._sendToPlayer?.({ type: 'guess_made', cardId: card.id, guessId: this.pendingGuessAttemptId, from: AI_PLAYER });
            return;
        }

        if (this.conditionId === 'three_questions' && this.questionsAsked >= QUESTION_LIMIT) {
            this.passTurn();
            return;
        }

        const question = this.chooseQuestion(candidates);
        if (!question) {
            const card = candidates[Math.floor(this.random() * candidates.length)];
            this.pendingGuessId = card.id;
            this.pendingGuessAttemptId = `ai-guess-${++this.guessSequence}`;
            this.conn?._sendToPlayer?.({ type: 'guess_made', cardId: card.id, guessId: this.pendingGuessAttemptId, from: AI_PLAYER });
            return;
        }

        this.askedQuestions.add(this.questionKey(question));
        this.askedQuestions.add(`text:${normalizeQuestion(question.text)}`);
        const questionId = `ai-question-${Date.now()}-${Math.floor(this.random() * 1e6)}`;
        this.pendingAIQuestion = { ...question, id: questionId };
        this.questionsAsked += 1;
        this.conn?._sendToPlayer?.({
            type: 'whoami_question',
            id: questionId,
            text: question.text,
            from: AI_PLAYER
        });
    }

    chooseQuestion(candidates) {
        const pack = PACKS.find(item => item.id === this.packId);
        const templates = WHOAMI_QUESTIONS[pack?.scope] || WHOAMI_QUESTIONS.people || [];
        let available = this.conditionId === 'no_repeat'
            ? templates.filter(question =>
                !this.askedQuestions.has(this.questionKey(question)) &&
                !this.askedQuestions.has(`text:${normalizeQuestion(question.text)}`)
            )
            : [...templates];
        if (!available.length && this.gameMode === 'free' && this.conditionId === 'no_repeat') {
            this.askedQuestions.clear();
            available = templates;
        }
        if (!available.length) return null;

        // Pick the question that splits the remaining possibilities most evenly.
        return available.reduce((best, question) => {
            if (this.gameMode === 'free') {
                const knownIds = [...this.guessedOpponentSecretIds];
                const sets = this.possibleSecretSets.filter(secretSet => knownIds.every(id => secretSet.some(card => card.id === id)));
                const yesCount = sets.reduce((count, secretSet) => count + (secretSet.some(card => card.attrs?.[question.attr] === question.val) ? 1 : 0), 0);
                const score = Math.abs(sets.length - 2 * yesCount);
                return !best || score < best.score ? { question, score } : best;
            }
            const yesCount = candidates.reduce((count, card) => count + (card.attrs?.[question.attr] === question.val ? 1 : 0), 0);
            const score = Math.abs(candidates.length - 2 * yesCount);
            return !best || score < best.score ? { question, score } : best;
        }, null)?.question || available[0];
    }

    getFreeCandidates() {
        const knownIds = [...this.guessedOpponentSecretIds];
        const viableSets = this.possibleSecretSets.filter(secretSet => knownIds.every(id => secretSet.some(card => card.id === id)));
        const candidates = new Map();
        for (const secretSet of viableSets) {
            for (const card of secretSet) {
                if (!this.guessedOpponentSecretIds.has(card.id)) candidates.set(card.id, card);
            }
        }
        return [...candidates.values()];
    }

    questionKey(question) {
        return `attr:${question.attr}:${String(question.val)}`;
    }

    answerPlayerQuestion(data) {
        if (data?.from !== 'p1' || this.currentTurn !== 'p1' || this.pendingPlayerQuestionId) return;
        if (data.id && this.seenPlayerQuestionIds.has(data.id)) return;
        if (data.id) this.seenPlayerQuestionIds.add(data.id);
        this.pendingPlayerQuestionId = data.id || null;
        if (this.conditionId === 'three_questions' && this.playerQuestionsAsked >= QUESTION_LIMIT) {
            this.conn?._sendToPlayer?.({
                type: 'whoami_answer', answer: 'no', unsupported: true, limit: true,
                asker: data.from, from: AI_PLAYER, questionId: data.id
            });
            this.pendingPlayerQuestionId = null;
            return;
        }
        const questionKey = `text:${normalizeQuestion(data.text)}`;
        if (this.conditionId === 'no_repeat' && this.askedQuestions.has(questionKey)) {
            this.conn?._sendToPlayer?.({
                type: 'whoami_answer', answer: 'no', unsupported: true, duplicate: true,
                asker: data.from, from: AI_PLAYER, questionId: data.id
            });
            this.pendingPlayerQuestionId = null;
            return;
        }
        this.askedQuestions.add(`text:${normalizeQuestion(data.text)}`);
        const pack = PACKS.find(item => item.id === this.packId);
        const templates = WHOAMI_QUESTIONS[pack?.scope] || [];
        const sameTemplate = templates.find(item => normalizeQuestion(item.text) === normalizeQuestion(data.text));
        if (sameTemplate) this.askedQuestions.add(this.questionKey(sameTemplate));
        let answer;
        if (this.gameMode === 'free') {
            const answers = this.mySecretIds.map(secretId => this.answerQuestionFromText(data.text, secretId));
            answer = answers.some(value => value === true) ? true : answers.length && answers.every(value => value === false) ? false : null;
        } else {
            answer = this.answerQuestionFromText(data.text);
        }
        this.playerQuestionsAsked += 1;
        setTimeout(() => {
            if (this.currentTurn !== 'p1' || (data.id && this.pendingPlayerQuestionId !== data.id)) return;
            this.pendingPlayerQuestionId = null;
            const transition = resolveWhoAmIAnswer({
                asker: data.from,
                answer: answer === true ? 'yes' : 'no',
                conditionId: this.conditionId,
                unsupported: answer === null
            });
            const nextPlayer = transition?.nextPlayer || data.from;
            this.conn?._sendToPlayer?.({
                type: 'whoami_answer',
                answer: answer === true ? 'yes' : 'no',
                unsupported: answer === null,
                asker: data.from,
                from: AI_PLAYER,
                questionId: data.id,
                nextPlayer
            });
            this.setTurn(nextPlayer);
            if (answer === true && nextPlayer === 'p1') {
                this.playerQuestionsThisTurn += 1;
                if (shouldAIUseInterrupt({
                    conditionId: this.conditionId,
                    answer,
                    alreadyUsed: this.interruptUsed[AI_PLAYER],
                    remainingCandidates: this.possibleCards.length
                })) {
                    setTimeout(() => {
                        if (this.currentTurn !== 'p1' || this.pendingPlayerQuestionId) return;
                        this.interruptUsed[AI_PLAYER] = true;
                        this.conn?._sendToPlayer?.({ type: 'whoami_interrupt', playerId: AI_PLAYER });
                        this.setTurn(AI_PLAYER);
                    }, 140);
                }
            }
        }, 320);
    }

    receiveAnswer(data) {
        if (data?.asker !== AI_PLAYER || (data?.from && data.from !== 'p1') || !this.pendingAIQuestion || (this.pendingAIQuestion.id && data.questionId !== this.pendingAIQuestion.id)) return;
        if (data.unsupported) {
            this.pendingAIQuestion = null;
            if (this.currentTurn === AI_PLAYER) this.setTurn('p1');
            return;
        }
        const answerYes = data.answer === 'yes';
        const question = this.pendingAIQuestion;
        this.pendingAIQuestion = null;
        if (this.gameMode === 'free') {
            const knownIds = [...this.guessedOpponentSecretIds];
            this.possibleSecretSets = this.possibleSecretSets.filter(secretSet => {
                if (!knownIds.every(id => secretSet.some(card => card.id === id))) return false;
                const atLeastOneMatches = secretSet.some(card => card.attrs?.[question.attr] === question.val);
                return answerYes ? atLeastOneMatches : !atLeastOneMatches;
            });
            this.possibleCards = this.getFreeCandidates();
        } else {
            this.possibleCards = this.possibleCards.filter(card =>
                (card.attrs?.[question.attr] === question.val) === answerYes
            );
        }

        if (answerYes) {
            this.questionsThisTurn += 1;
            if (this.conditionId === 'yes_continue') {
                this.scheduleTurn(420);
                return;
            }
            if (this.possibleCards.length === 1) {
                this.pendingGuessId = this.possibleCards[0].id;
                this.pendingGuessAttemptId = `ai-guess-${++this.guessSequence}`;
                this.conn?._sendToPlayer?.({ type: 'guess_made', cardId: this.pendingGuessId, guessId: this.pendingGuessAttemptId, from: AI_PLAYER });
                return;
            }
        } else {
            const transition = resolveWhoAmIAnswer({
                asker: AI_PLAYER,
                answer: 'no',
                conditionId: this.conditionId
            });
            if (transition?.nextPlayer !== AI_PLAYER) {
                const nextPlayer = transition?.nextPlayer || 'p1';
                this.setTurn(nextPlayer);
                if (nextPlayer === 'p1' && shouldAIUseInterrupt({
                    conditionId: this.conditionId,
                    answer: false,
                    alreadyUsed: this.interruptUsed[AI_PLAYER],
                    remainingCandidates: this.possibleCards.length
                })) {
                    setTimeout(() => {
                        if (this.currentTurn !== 'p1' || this.pendingAIQuestion) return;
                        this.interruptUsed[AI_PLAYER] = true;
                        this.conn?._sendToPlayer?.({ type: 'whoami_interrupt', playerId: AI_PLAYER });
                        this.setTurn(AI_PLAYER);
                    }, 140);
                }
                return;
            }
        }
        // The AI's candidate filtering above is its deduction after "no".
        // It then explicitly passes whenever the selected rule leaves the turn with it.
        this.passTurn();
    }

    passTurn() {
        this.currentTurn = 'p1';
        this.pendingAIQuestion = null;
        this.questionsThisTurn = 0;
        this.turnToken += 1;
        this.conn?._sendToPlayer?.({ type: 'whoami_pass', from: AI_PLAYER, nextPlayer: 'p1' });
    }

    checkPlayerGuess(cardId, data = {}) {
        if (this.currentTurn !== 'p1' || data?.from !== 'p1' || !this.packCards.some(card => card.id === cardId)) return;
        const turnToken = this.turnToken;
        const correct = this.mySecretIds.includes(cardId);
        setTimeout(() => {
            if (turnToken !== this.turnToken || this.currentTurn !== 'p1') return;
            this.conn?._sendToPlayer?.({ type: 'guess_result', correct, secretCard: correct ? cardId : undefined, guessId: data.guessId, from: AI_PLAYER });
            if (!correct) this.setTurn(AI_PLAYER);
        }, 300);
    }

    receiveGuessResult(data) {
        if (!this.pendingGuessId || data?.from !== 'p1' || data?.guessId !== this.pendingGuessAttemptId) return;
        if (data.correct) {
            if (data.secretCard) this.guessedOpponentSecretIds.add(data.secretCard);
            if (this.gameMode === 'free' && this.guessedOpponentSecretIds.size < this.opponentSecretCount) {
                const knownIds = [...this.guessedOpponentSecretIds];
                this.possibleSecretSets = this.possibleSecretSets.filter(secretSet => knownIds.every(id => secretSet.some(card => card.id === id)));
                this.pendingGuessId = null;
                this.pendingGuessAttemptId = null;
                this.scheduleTurn(420);
            } else if (this.gameMode === 'rules') {
                this.currentTurn = null;
                this.conn?._sendToPlayer?.({ type: 'secret_reveal', secretCardIds: this.mySecretIds });
            } else if (this.gameMode === 'free') {
                this.currentTurn = null;
                this.conn?._sendToPlayer?.({ type: 'secret_reveal', secretCardIds: this.mySecretIds });
            }
        } else {
            const failedGuess = this.pendingGuessId;
            this.pendingGuessId = null;
            this.pendingGuessAttemptId = null;
            if (this.gameMode === 'free') {
                this.possibleSecretSets = this.possibleSecretSets.filter(secretSet => !secretSet.some(card => card.id === failedGuess));
                this.possibleCards = this.getFreeCandidates();
            } else {
                this.possibleCards = this.possibleCards.filter(card => card.id !== failedGuess);
            }
            this.setTurn('p1');
        }
    }

    sendHint(playerId) {
        if (playerId !== 'p1' || this.conditionId !== 'single_hint' || this.currentTurn !== 'p1' || this.playerHintUsed) return;
        this.playerHintUsed = true;
        const card = this.packCards.find(item => item.id === this.mySecretIds[0]);
        const entries = Object.entries(card?.attrs || {}).filter(([, value]) => value !== undefined && value !== null && value !== 'none');
        const [key, value] = entries[Math.floor(this.random() * entries.length)] || [];
        const valueText = HINT_VALUES[String(value)] || String(value);
        this.conn?._sendToPlayer?.({
            type: 'whoami_hint_result',
            playerId,
            text: key ? `تلميح عن بطاقتي: ${HINT_LABELS[key] || key} — ${valueText}` : 'بطاقتي من هذه المجموعة.',
            attr: key,
            value
        });
    }

    applyHint(data) {
        if (this.conditionId !== 'single_hint' || data?.playerId !== AI_PLAYER || !data.attr || data.value === undefined) return;
        if (this.gameMode === 'rules') {
            this.possibleCards = this.possibleCards.filter(card => card.attrs?.[data.attr] === data.value);
        } else {
            this.possibleSecretSets = this.possibleSecretSets.filter(secretSet => secretSet.some(card => card.attrs?.[data.attr] === data.value));
            this.possibleCards = this.getFreeCandidates();
        }
        if (this.currentTurn === AI_PLAYER) this.scheduleTurn(240);
    }

    replyToChat(text) {
        const message = String(text || '').trim();
        if (!message) return;
        const normalized = clean(message);
        const reply = normalized.includes('سلام')
            ? 'وعليكم السلام! جاهز نلعب 😄'
            : normalized.includes('شكرا')
                ? 'العفو! كمّل اللعب واسألني من خانة السؤال 😉'
                : 'أنا معاك! استخدم خانة السؤال عشان أجاوبك وتتحسب الإجابة في اللعبة.';
        setTimeout(() => this.conn?._sendToPlayer?.({ type: 'chat', text: reply }), 300);
    }

    answerQuestionFromText(text, secretCardId = this.mySecretIds[0]) {
        const card = this.packCards.find(item => item.id === secretCardId);
        if (!card) return false;
        const t = clean(text);
        const attrs = card.attrs || {};
        const includes = (...parts) => parts.some(part => t.includes(clean(part)));
        const scope = PACKS.find(item => item.id === this.packId)?.scope;
        const pack = PACKS.find(item => item.id === this.packId);
        const templates = WHOAMI_QUESTIONS[pack?.scope] || [];
        const exactTemplate = templates.find(item => clean(item.text) === t);
        if (exactTemplate) return attrs[exactTemplate.attr] === exactTemplate.val;

        if (includes('بنت', 'ست', 'انثى')) return attrs.gender === 'female';
        if (includes('ولد', 'رجل', 'ذكر')) return attrs.gender === 'male';
        if (includes('نضار')) return attrs.glasses === true;
        if (includes('قبع', 'طاقي', 'كاب')) return attrs.hat === true;
        if (includes('دقن', 'لحي')) return attrs.facialHair === 'beard';
        if (includes('شنب')) return attrs.facialHair === 'mustache';
        if (includes('حلق')) return attrs.earrings === true;
        if (includes('صلع', 'اقرع')) return attrs.hairColor === 'none';
        if (includes('شعر')) {
            if (includes('اسود')) return attrs.hairColor === 'black';
            if (includes('بني')) return attrs.hairColor === 'brown';
            if (includes('اصفر', 'اشقر')) return attrs.hairColor === 'blonde';
            if (includes('احمر')) return attrs.hairColor === 'red';
            if (includes('ابيض', 'رمادي', 'شايب')) return attrs.hairColor === 'gray';
            if (includes('طويل')) return attrs.hairLength === 'long';
            if (includes('قصير')) return attrs.hairLength === 'short';
        }
        if (scope === 'people' && includes('عجوز', 'كبير', 'مسن')) return attrs.ageGroup === 'elderly';
        if (scope === 'people' && includes('شاب', 'صغير', 'طفل')) return attrs.ageGroup === 'young';
        if (includes('اسمر', 'غامق')) return attrs.skinTone === 'dark';
        if ((includes('بشره', 'جلده') || includes('لون الجلد', 'لون البشره')) && includes('فاتح', 'ابيض')) return attrs.skinTone === 'light';
        if ((includes('بشره', 'جلده') || includes('لون الجلد', 'لون البشره')) && includes('غامق', 'اسمر', 'داكن')) return attrs.skinTone === 'dark';
        if (includes('يبتسم', 'بيضحك', 'ابتسام')) return attrs.smiling === true;

        if (includes('يطير', 'طير', 'هواء')) return attrs.habitat === 'air';
        if (includes('بحر', 'ماء', 'ميه')) return attrs.habitat === 'water';
        if (includes('ارض', 'بر')) return attrs.habitat === 'land';
        if (includes('فرو')) return attrs.hasFur === true;
        if (includes('جناح')) return attrs.hasWings === true;
        if (includes('اربع ارجل', '4 ارجل')) return attrs.legsCount === '4';
        if (includes('رجلين', 'رجلان', '2 رجل')) return attrs.legsCount === '2';
        if (includes('6 ارجل')) return attrs.legsCount === '6';
        if (includes('8 ارجل')) return attrs.legsCount === '8';
        if (includes('بدون ارجل', 'مفيش رجل')) return attrs.legsCount === '0';
        if (scope === 'animals' && includes('كبير', 'ضخم')) return attrs.size === 'large';
        if (scope === 'animals' && includes('صغير')) return attrs.size === 'small';
        if (includes('لحم', 'مفترس', 'لاحم')) return attrs.diet === 'meat';
        if (includes('نبات', 'عشب', 'عاشب')) return attrs.diet === 'plants';
        if (includes('اليف', 'يتربى')) return attrs.isPet === true;

        if (includes('سخن', 'ساخن', 'حار')) return attrs.temperature === 'hot';
        if (includes('بارد')) return attrs.temperature === 'cold';
        if (includes('مسكر', 'حلو')) return attrs.taste === 'sweet';
        if (includes('حادق', 'مالح')) return attrs.taste === 'savory';
        if (includes('وجبه رئيسيه', 'رئيسي')) return attrs.course === 'main';
        if (includes('تحليه', 'حلوى')) return attrs.course === 'dessert';
        if (includes('مشروب', 'شرب')) return attrs.course === 'drink';
        if (includes('وجبه خفيفه', 'سناك')) return attrs.course === 'snack';
        if (includes('مصري', 'مصرية', 'مصر')) return attrs.origin === 'egyptian';
        if (includes('رز', 'ارز')) return attrs.mainIngredient === 'rice';
        if (includes('لحم', 'فراخ')) return attrs.mainIngredient === 'meat';
        if (includes('عجين', 'مخبوز', 'دقيق')) return attrs.mainIngredient === 'dough';
        if (includes('لبن', 'حليب', 'جبن')) return attrs.mainIngredient === 'dairy';
        if (includes('خضار', 'نبات')) return attrs.mainIngredient === 'vegetable';
        if (includes('فاكهه', 'مانجو', 'فواكه')) return attrs.mainIngredient === 'fruit';
        if (includes('سكر')) return attrs.mainIngredient === 'sugar';
        if (includes('باليد', 'بالايد', 'ايد')) return attrs.eatenWithHand === true;

        return null;
    }
}
