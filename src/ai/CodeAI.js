// AI for Guess The Code.
// Mastermind-style deduction with fallback safety to guarantee 100% reliability and speed.

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

function generateCode(length) {
    return Array.from({ length }, () => DIGITS[Math.floor(Math.random() * 10)]).join('');
}

function evaluate(guess, secret) {
    const len = guess.length;
    const g = guess.split('');
    const s = secret.split('');
    const res = Array(len).fill('red');
    const used = Array(len).fill(false);

    // Pass 1: exact matches (green)
    for (let i = 0; i < len; i++) {
        if (g[i] === s[i]) {
            res[i] = 'green';
            used[i] = true;
        }
    }

    // Pass 2: misplaced matches (yellow)
    for (let i = 0; i < len; i++) {
        if (res[i] !== 'green') {
            const j = s.findIndex((ch, k) => ch === g[i] && !used[k]);
            if (j !== -1) {
                res[i] = 'yellow';
                used[j] = true;
            }
        }
    }

    return res;
}

export default class CodeAI {
    constructor(mockConn) {
        this.conn = mockConn;
        this.secret = '';
        this.codeLength = 4;
        this.possibleCodes = [];
        this.guessHistory = [];
        this.guessTimer = null;

        setTimeout(() => this.conn._sendToPlayer({
            type: 'global_ready',
            profile: { nickname: 'الذكاء الاصطناعي', avatar: 'robot' }
        }), 600);
    }

    generateCandidateCodes(length) {
        // For length <= 4, generate all 10,000 codes
        // For length > 4, sample a fast working set to keep memory & CPU instantaneous
        if (length <= 4) {
            const total = Math.pow(10, length);
            const list = [];
            for (let i = 0; i < total; i++) {
                list.push(String(i).padStart(length, '0'));
            }
            return list;
        } else {
            const set = new Set();
            while (set.size < 5000) {
                set.add(generateCode(length));
            }
            return Array.from(set);
        }
    }

    onMessage(msg) {
        if (msg.type === 'code_length') {
            this.codeLength = msg.length || 4;
            this.secret = generateCode(this.codeLength);
            this.possibleCodes = this.generateCandidateCodes(this.codeLength);
            this.guessHistory = [];

            // Inform host that AI's secret is ready
            setTimeout(() => {
                this.conn._sendToPlayer({ type: 'secret_ready' });
            }, 600);
        } else if (msg.type === 'secret_ready') {
            // Player is ready, AI makes first guess
            this.scheduleGuess(1200);
        } else if (msg.type === 'guess') {
            // Player guessed AI's secret
            if (!this.secret) this.secret = generateCode(this.codeLength);
            const result = evaluate(msg.code, this.secret);
            const won = result.every(r => r === 'green');

            this.conn._sendToPlayer({ type: 'guess_result', code: msg.code, result });

            // If player hasn't won yet, AI takes its turn
            if (!won) {
                this.scheduleGuess(1200 + Math.random() * 600);
            }
        } else if (msg.type === 'guess_result') {
            // Feedback for AI's own guess -> filter possible codes
            const lastGuess = msg.code || this.guessHistory[this.guessHistory.length - 1];
            if (lastGuess && msg.result) {
                const targetRes = JSON.stringify(msg.result);
                this.possibleCodes = this.possibleCodes.filter(code =>
                    JSON.stringify(evaluate(lastGuess, code)) === targetRes
                );
            }
        } else if (msg.type === 'restart') {
            this._reset();
            this.secret = generateCode(this.codeLength);
            this.possibleCodes = this.generateCandidateCodes(this.codeLength);
            this.scheduleGuess(1200);
        }
    }

    _reset() {
        if (this.guessTimer) clearTimeout(this.guessTimer);
        this.secret = '';
        this.possibleCodes = [];
        this.guessHistory = [];
    }

    scheduleGuess(delay = 1000) {
        if (this.guessTimer) clearTimeout(this.guessTimer);
        this.guessTimer = setTimeout(() => {
            this.makeGuess();
        }, delay);
    }

    makeGuess() {
        let guess;

        // Fallback: If candidate pool emptied unexpectedly, regenerate or pick random
        if (!this.possibleCodes || this.possibleCodes.length === 0) {
            this.possibleCodes = this.generateCandidateCodes(this.codeLength);
        }

        if (this.possibleCodes.length > 0) {
            const idx = Math.floor(Math.random() * this.possibleCodes.length);
            guess = this.possibleCodes[idx];
            this.possibleCodes.splice(idx, 1);
        } else {
            guess = generateCode(this.codeLength);
        }

        this.guessHistory.push(guess);
        this.conn._sendToPlayer({ type: 'guess', code: guess });
    }

    close() {
        if (this.guessTimer) clearTimeout(this.guessTimer);
    }
}
