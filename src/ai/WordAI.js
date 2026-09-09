// AI for GuessTheWord (Hangman). AI writes a word from its list, and guesses by letter frequency.
// Medium: uses English/Arabic word banks, guesses by letter frequency order.

const WORD_BANK = [
    'شمس', 'قمر', 'نجمة', 'بحر', 'جبل', 'نهر', 'صحراء', 'بستان',
    'سماء', 'ارض', 'هواء', 'ماء', 'نار', 'تراب', 'حجر', 'شجرة',
    'وردة', 'زهرة', 'عصفور', 'قطة', 'كلب', 'اسد', 'نمر', 'فيل',
    'جمل', 'حصان', 'سمكة', 'طائر', 'حمامة', 'ببغاء'
];

// Arabic letter frequency (most common first) for hangman guessing
const ARABIC_FREQ = ['ا','ل','م','ن','ي','ه','و','ر','ت','ع','س','ك','ب','ف','د','ق','ج','ح','ز','ط','ص','خ','ث','ذ','غ','ض','ش','ظ','ة','أ','إ','ء'];

export default class WordAI {
    constructor(mockConn) {
        this.conn = mockConn;
        this.guessedLetters = [];
        this.guessIndex = 0; // pointer into ARABIC_FREQ
        this.isMyTurnToWrite = false;
        this.currentWord = '';

        setTimeout(() => this.conn._sendToPlayer({ type: 'global_ready' }), 800);
    }

    onMessage(msg) {
        if (msg.type === 'roles_set') {
            this.isMyTurnToWrite = msg.guestWrites;
            this.guessedLetters = [];
            this.guessIndex = 0;

            if (this.isMyTurnToWrite) {
                // AI picks a word and sends start_game
                this.currentWord = WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
                setTimeout(() => {
                    this.conn._sendToPlayer({ type: 'start_game', word: this.currentWord, hint: '' });
                }, 1000);
            }
        } else if (msg.type === 'start_game') {
            // Player wrote a word. AI needs to guess it.
            this.guessedLetters = [];
            this.guessIndex = 0;
            if (!this.isMyTurnToWrite) {
                setTimeout(() => this.makeGuess(), 1500);
            }
        } else if (msg.type === 'guess') {
            // Player is guessing our word — we just track (game handles evaluation)
            this.guessedLetters.push(msg.letter);
        } else if (msg.type === 'restart') {
            this.guessedLetters = [];
            this.guessIndex = 0;
        }
    }

    makeGuess() {
        // Pick the next unguessed letter from frequency list
        while (this.guessIndex < ARABIC_FREQ.length) {
            const letter = ARABIC_FREQ[this.guessIndex];
            this.guessIndex++;
            if (!this.guessedLetters.includes(letter)) {
                this.guessedLetters.push(letter);
                this.conn._sendToPlayer({ type: 'guess', letter, wordContext: '' });

                // Schedule next guess after a delay (simulate thinking)
                setTimeout(() => this.makeGuess(), 2000 + Math.random() * 1000);
                return;
            }
        }
    }

    close() {}
}
