// AI for GuessTheCode. AI picks a random secret code, then guesses strategically.
// Mastermind-like AI: eliminates impossible codes based on feedback.

const ARABIC_DIGITS = ['0','1','2','3','4','5','6','7','8','9'];

function generateCode(length) {
    return Array.from({length}, () => ARABIC_DIGITS[Math.floor(Math.random() * 10)]).join('');
}

function evaluate(guess, secret) {
    const result = Array(guess.length).fill('grey');
    const secretArr = secret.split('');
    const guessArr = guess.split('');
    const usedSecret = Array(secret.length).fill(false);
    const usedGuess = Array(guess.length).fill(false);

    // Green pass
    for (let i = 0; i < guess.length; i++) {
        if (guessArr[i] === secretArr[i]) {
            result[i] = 'green';
            usedSecret[i] = true;
            usedGuess[i] = true;
        }
    }
    // Yellow pass
    for (let i = 0; i < guess.length; i++) {
        if (usedGuess[i]) continue;
        for (let j = 0; j < secret.length; j++) {
            if (!usedSecret[j] && guessArr[i] === secretArr[j]) {
                result[i] = 'yellow';
                usedSecret[j] = true;
                break;
            }
        }
    }
    return result;
}

export default class CodeAI {
    constructor(mockConn) {
        this.conn = mockConn;
        this.secret = '';
        this.codeLength = 4;
        this.possibleCodes = [];
        this.guessHistory = [];

        setTimeout(() => this.conn._sendToPlayer({ type: 'global_ready' }), 800);
    }

    generateAllCodes(length) {
        const total = Math.pow(10, length);
        const codes = [];
        for (let i = 0; i < total; i++) {
            codes.push(String(i).padStart(length, '0'));
        }
        return codes;
    }

    onMessage(msg) {
        if (msg.type === 'code_length') {
            this.codeLength = msg.length;
            this.secret = generateCode(this.codeLength);
            this.possibleCodes = this.generateAllCodes(this.codeLength);
            this.guessHistory = [];
            // Tell host AI's secret is set
            setTimeout(() => {
                this.conn._sendToPlayer({ type: 'secret_ready' });
            }, 800);
        } else if (msg.type === 'secret_ready') {
            // Host is ready, and since AI is guest, it goes first.
            setTimeout(() => this.makeGuess(), 1500);
        } else if (msg.type === 'guess') {
            // Player is guessing AI's secret
            const result = evaluate(msg.code, this.secret);
            const won = result.every(r => r === 'green');
            this.conn._sendToPlayer({ type: 'guess_result', code: msg.code, result });
            // After evaluating player's guess, AI takes its turn
            if (!won) {
                setTimeout(() => this.makeGuess(), 1200 + Math.random() * 800);
            }
        } else if (msg.type === 'guess_result') {
            // AI receives result of its own guess — filter possible codes
            const lastGuess = this.guessHistory[this.guessHistory.length - 1];
            if (lastGuess) {
                this.possibleCodes = this.possibleCodes.filter(code =>
                    JSON.stringify(evaluate(lastGuess, code)) === JSON.stringify(msg.result)
                );
            }
        } else if (msg.type === 'restart') {
            this.secret = '';
            this.possibleCodes = [];
            this.guessHistory = [];
        }
    }

    makeGuess() {
        if (this.possibleCodes.length === 0) return;

        // Pick a random possible code (medium = not full minimax, just random from remaining)
        const guess = this.possibleCodes[Math.floor(Math.random() * this.possibleCodes.length)];
        this.guessHistory.push(guess);

        this.conn._sendToPlayer({ type: 'guess', code: guess });
    }

    close() {}
}
