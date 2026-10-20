// Hangman opponent: it picks its own secret word and guesses the player's word.
const WORD_BANK = [
    'شمس', 'قمر', 'نجمة', 'بحر', 'جبل', 'نهر', 'صحراء', 'بستان',
    'سماء', 'أرض', 'هواء', 'ماء', 'نار', 'تراب', 'حجر', 'شجرة',
    'وردة', 'زهرة', 'عصفور', 'قطة', 'كلب', 'أسد', 'نمر', 'فيل',
    'جمل', 'حصان', 'سمكة', 'طائر', 'حمامة', 'ببغاء', 'مدرسة', 'سيارة',
    'مكتبة', 'حديقة', 'مفتاح', 'منزل', 'قارب', 'تفاحة', 'برتقالة', 'موزة',
];

const ARABIC_FREQ = ['ا','ل','م','ن','ي','ه','و','ر','ت','ع','س','ك','ب','ف','د','ق','ج','ح','ز','ط','ص','خ','ث','ذ','غ','ض','ش','ظ','ة','أ','إ','آ'];
const ENGLISH_FREQ = ['E','T','A','O','I','N','S','H','R','D','L','U','C','M','F','W','Y','G','P','B','V','K','X','J','Q','Z'];

export default class WordAI {
    constructor(mockConn) {
        this.conn = mockConn;
        this.guessedLetters = [];
        this.guessIndex = 0;
        this.currentWord = '';
        this.humanWord = '';
        this.guessTimer = null;
        this.gameActive = false;
        setTimeout(() => this.conn._sendToPlayer({ type: 'global_ready' }), 800);
    }

    onMessage(msg) {
        if (msg.type === 'human_word') {
            this.stopThinking();
            this.humanWord = msg.word || '';
            this.currentWord = WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
            this.guessedLetters = [];
            this.guessIndex = 0;
            this.gameActive = true;
            this.conn._sendToPlayer({ type: 'ai_word', word: this.currentWord });
        } else if (msg.type === 'guess' && msg.player === 'host' && this.gameActive) {
            this.stopThinking();
            this.guessTimer = setTimeout(() => this.makeGuess(), 850 + Math.random() * 450);
        } else if (msg.type === 'game_finished') {
            this.gameActive = false;
            this.stopThinking();
        } else if (msg.type === 'restart') {
            this.gameActive = false;
            this.stopThinking();
            this.guessedLetters = [];
            this.guessIndex = 0;
            this.currentWord = '';
            this.humanWord = '';
        }
    }

    makeGuess() {
        if (!this.gameActive || !this.humanWord) return;
        const frequency = /[A-Za-z]/.test(this.humanWord) ? ENGLISH_FREQ : ARABIC_FREQ;
        while (this.guessIndex < frequency.length) {
            const letter = frequency[this.guessIndex++];
            if (this.guessedLetters.includes(letter)) continue;
            this.guessedLetters.push(letter);
            this.conn._sendToPlayer({ type: 'guess', player: 'guest', letter });
            return;
        }
    }

    stopThinking() {
        if (this.guessTimer) clearTimeout(this.guessTimer);
        this.guessTimer = null;
    }

    close() {
        this.gameActive = false;
        this.stopThinking();
    }
}
