// AI for RPS Arena with Power Cards

const CHOICES = ['rock', 'paper', 'scissors'];

function beats(a, b) {
    return (a === 'rock' && b === 'scissors') ||
        (a === 'paper' && b === 'rock') ||
        (a === 'scissors' && b === 'paper');
}

export default class RPSArenaAI {
    constructor(mockConn) {
        this.conn = mockConn;
        this.powers = { shield: true, double: true, freeze: true };
        this.myScore = 0;
        this.oppScore = 0;
        this.gameActive = false;
        this.thinkTimer = null;
        this.lastOppChoices = [];

        setTimeout(() => this.conn._sendToPlayer({
            type: 'global_ready',
            profile: { nickname: 'أسطورة المقص (AI)', avatar: 'robot' }
        }), 500);
    }

    onMessage(msg) {
        if (!msg || !msg.type) return;

        switch (msg.type) {
            case 'rps_choice': {
                // Player made their choice – AI now responds
                this._clearTimer();
                const delay = 400 + Math.random() * 1400;
                this.thinkTimer = setTimeout(() => {
                    this._respondToChoice(msg.choice, msg.power);
                }, delay);
                break;
            }

            case 'rps_start':
                this._resetGame();
                break;

            case 'rematch_request':
                this.conn._sendToPlayer({ type: 'rps_start' });
                this._resetGame();
                break;

            default:
                break;
        }
    }

    _resetGame() {
        this.powers = { shield: true, double: true, freeze: true };
        this.myScore = 0;
        this.oppScore = 0;
        this.gameActive = true;
        this.lastOppChoices = [];
    }

    _respondToChoice(oppChoice, oppPower) {
        // Track opponent's pattern
        this.lastOppChoices.push(oppChoice);
        if (this.lastOppChoices.length > 5) this.lastOppChoices.shift();

        // Predict opponent's next move based on pattern
        let aiChoice;
        const rand = Math.random();

        if (rand < 0.65 && this.lastOppChoices.length >= 2) {
            // Pattern-based: counter the most frequent opponent choice
            const freq = {};
            this.lastOppChoices.forEach(c => { freq[c] = (freq[c] || 0) + 1; });
            const mostFreq = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
            // Pick what beats most frequent
            if (mostFreq === 'rock') aiChoice = 'paper';
            else if (mostFreq === 'paper') aiChoice = 'scissors';
            else aiChoice = 'rock';
        } else {
            // Random
            aiChoice = CHOICES[Math.floor(Math.random() * 3)];
        }

        // Decide on power card (use strategically when losing)
        let aiPower = null;
        if (this.oppScore > this.myScore + 1 && this.powers.double) {
            aiPower = 'double';
            this.powers.double = false;
        } else if (this.myScore < 3 && this.powers.freeze && Math.random() < 0.3) {
            aiPower = 'freeze';
            this.powers.freeze = false;
        }

        // Update scores
        let aiWins = beats(aiChoice, oppChoice);
        let oppWins = beats(oppChoice, aiChoice);

        // Apply shields
        if (!aiWins && !oppWins) {
            // draw, no change
        } else if (!aiWins && aiPower === 'shield') {
            aiWins = false; oppWins = false;
        }

        if (aiWins) this.myScore += aiPower === 'double' ? 2 : 1;
        if (oppWins) this.oppScore += oppPower === 'double' ? 2 : 1;

        this.conn._sendToPlayer({
            type: 'rps_choice',
            choice: aiChoice,
            power: aiPower
        });
    }

    _clearTimer() {
        if (this.thinkTimer) {
            clearTimeout(this.thinkTimer);
            this.thinkTimer = null;
        }
    }

    close() {
        this._clearTimer();
    }
}
