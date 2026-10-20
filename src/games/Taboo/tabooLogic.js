import wordBank from './wordBank.json';

export const ROUND_SECONDS = 3 * 60;
export const ROUNDS_PER_PLAYER = 3;
export const TOTAL_ROUNDS = ROUNDS_PER_PLAYER * 2;
export const MAX_SKIPS_PER_ROUND = 3;
export const MAX_GUESSES_PER_WORD = 3;
export const PLAYED_WORDS_KEY = 'celia_taboo_played_word_ids_v1';

export const CATEGORIES = wordBank.categories;
export const ALL_CATEGORY_IDS = CATEGORIES.map((category) => category.id);

export const normalizeArabic = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u064B-\u065F\u0670\u0640]/gu, '')
    .toLocaleLowerCase('ar')
    .replace(/[أإآٱ]/gu, 'ا')
    .replace(/ؤ/gu, 'و')
    .replace(/ئ/gu, 'ي')
    .replace(/ى/gu, 'ي')
    .replace(/ة/gu, 'ه')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();

const removeCommonAffixes = (token) => {
    const forms = new Set([token]);
    const prefixes = ['وال', 'بال', 'كال', 'فال', 'لل', 'ال', 'و', 'ف', 'ب', 'ك', 'ل'];
    const suffixes = ['يات', 'ات', 'ون', 'ين', 'ان', 'هما', 'هم', 'هن', 'كم', 'كن', 'نا', 'ها', 'ه', 'ي', 'ة', 'ا'];

    for (const prefix of prefixes) {
        if (token.startsWith(prefix) && token.length - prefix.length >= 3) {
            forms.add(token.slice(prefix.length));
        }
    }

    for (const form of [...forms]) {
        for (const suffix of suffixes) {
            if (form.endsWith(suffix) && form.length - suffix.length >= 3) {
                forms.add(form.slice(0, -suffix.length));
            }
        }
    }
    return [...forms];
};

const tokenForms = (token) => new Set([
    ...removeCommonAffixes(token),
    ...removeCommonAffixes(token).flatMap((form) => removeCommonAffixes(form)),
]);

const tokensMatch = (textToken, termToken) => {
    const termForms = tokenForms(termToken);
    return [...tokenForms(textToken)].some((form) => termForms.has(form));
};

const matchesTerm = (normalizedText, normalizedTerm) => {
    if (!normalizedText || !normalizedTerm) return false;
    const termTokens = normalizedTerm.split(' ').filter(Boolean);
    const textTokens = normalizedText.split(' ').filter(Boolean);
    if (!termTokens.length || termTokens.length > textTokens.length) return false;

    // Match complete normalized words/phrases with Arabic prefixes and suffixes.
    // Avoid fuzzy substring guesses that used to flag unrelated words by accident.
    for (let index = 0; index <= textTokens.length - termTokens.length; index += 1) {
        if (termTokens.every((termToken, offset) => tokensMatch(textTokens[index + offset], termToken))) return true;
    }
    return false;
};

export function findForbiddenTerm(text, card) {
    const normalizedText = normalizeArabic(text);
    const terms = [...(card?.taboo || []), card?.word].filter(Boolean);
    return terms.find((term) => matchesTerm(normalizedText, normalizeArabic(term))) || null;
}

export function isCorrectGuess(guess, word) {
    const answerTokens = normalizeArabic(word).split(' ').filter(Boolean);
    const guessTokens = normalizeArabic(guess).split(' ').filter(Boolean);
    if (answerTokens.length !== guessTokens.length) return false;
    return answerTokens.every((answerToken, index) => {
        const guessToken = guessTokens[index];
        // Accept normal Arabic article usage: "مدرسة" and "المدرسة".
        const withoutArticle = (token) => token.startsWith('ال') && token.length > 3 ? token.slice(2) : token;
        return answerToken === guessToken || withoutArticle(answerToken) === withoutArticle(guessToken);
    });
}

export function getCategoryWords(categoryIds) {
    const selected = new Set(categoryIds || []);
    return CATEGORIES.filter((category) => selected.has(category.id))
        .flatMap((category) => category.words.map((word) => ({ ...word, categoryId: category.id, categoryName: category.name })));
}

export function loadPlayedWordIds() {
    try {
        const value = JSON.parse(localStorage.getItem(PLAYED_WORDS_KEY) || '[]');
        return Array.isArray(value) ? value.filter((id) => typeof id === 'string') : [];
    } catch {
        return [];
    }
}

export function savePlayedWordIds(ids) {
    try {
        localStorage.setItem(PLAYED_WORDS_KEY, JSON.stringify([...new Set(ids)]));
    } catch {
        // The round can still play when storage is disabled; its in-memory deck prevents duplicates.
    }
}

export function mergePlayedWordIds(ids) {
    savePlayedWordIds([...loadPlayedWordIds(), ...(ids || [])]);
}

export function drawNextWord(categoryIds, usedThisMatch) {
    const pool = getCategoryWords(categoryIds);
    const matchUsedRef = usedThisMatch instanceof Set ? usedThisMatch : new Set(usedThisMatch || []);
    const matchUsed = new Set(matchUsedRef);
    const played = new Set(loadPlayedWordIds());
    let eligible = pool.filter((card) => !played.has(card.id) && !matchUsed.has(card.id));
    let cycleReset = false;

    if (!eligible.length && pool.length) {
        // Refill the selected deck after every card has been played. Keep the
        // last card out of the next shuffle so a refill can never repeat it at once.
        const lastCardId = [...matchUsed].at(-1);
        matchUsedRef.clear();
        if (lastCardId) matchUsedRef.add(lastCardId);

        // Reset only the selected categories, preserving history for every other category.
        const allIds = [...played].filter((id) => !pool.some((card) => card.id === id));
        savePlayedWordIds(allIds);
        eligible = pool.filter((card) => !matchUsedRef.has(card.id));
        if (!eligible.length) eligible = pool;
        cycleReset = true;
    }

    if (!eligible.length) {
        return { card: null, cycleReset: false, exhaustedMatch: pool.length > 0 };
    }

    const card = eligible[Math.floor(Math.random() * eligible.length)];
    savePlayedWordIds([...loadPlayedWordIds(), card.id]);
    return { card, cycleReset, exhaustedMatch: false };
}

export function categoryNames(categoryIds) {
    const selected = new Set(categoryIds || []);
    return CATEGORIES.filter((category) => selected.has(category.id)).map((category) => category.name);
}

export function resultLabel(status) {
    return ({
        correct: 'اتخمنت صح',
        skipped: 'اتخطت',
        forbidden: 'اتقالت كلمة ممنوعة',
        exhausted: 'خلصت المحاولات',
        timeout: 'انتهى الوقت قبل ما تتحل'
    })[status] || 'ما اتلعبتش';
}
