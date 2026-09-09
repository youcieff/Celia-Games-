// AI for Memory Match. Remembers all flipped cards (eidetic memory) but waits like a human.
// Medium difficulty = 60% chance to use memory, 40% picks randomly.
export default class MemoryAI {
    constructor(mockConn) {
        this.conn = mockConn;
        this.deck = [];           // Full deck received from host
        this.memory = {};         // index -> emoji value that AI has "seen"
        this.matched = new Set(); // Already matched indexes
        this.firstFlipped = null;
        this.isMyTurn = false;

        setTimeout(() => this.conn._sendToPlayer({ type: 'global_ready' }), 800);
    }

    onMessage(msg) {
        if (msg.type === 'start') {
            this.deck = msg.deck;
            this.memory = {};
            this.matched = new Set();
            this.firstFlipped = null;
            // Host always goes first in Memory Match (hostTurn = true initially)
            this.isMyTurn = false;
        } else if (msg.type === 'flip') {
            // Player flipped a card — AI observes it (memorize it)
            if (this.deck[msg.index]) {
                this.memory[msg.index] = this.deck[msg.index].emoji;
            }
        } else if (msg.type === 'restart') {
            this.deck = [];
            this.memory = {};
            this.matched = new Set();
            this.firstFlipped = null;
            this.isMyTurn = false;
        } else if (msg.type === 'your_turn') {
            // Game signals AI to play
            this.isMyTurn = true;
            setTimeout(() => this.takeTurn(), 1000 + Math.random() * 700);
        }
    }

    takeTurn() {
        if (!this.isMyTurn || !this.deck.length) return;
        const available = this.deck
            .map((c, i) => (!c.matched ? i : null))
            .filter(v => v !== null);
        if (available.length < 2) return;

        let first, second = null;

        // Try memory-based match (60% chance for medium difficulty)
        if (Math.random() < 0.6) {
            const knownPairs = {};
            for (const [idx, emoji] of Object.entries(this.memory)) {
                if (this.matched.has(Number(idx))) continue;
                if (!knownPairs[emoji]) knownPairs[emoji] = [];
                knownPairs[emoji].push(Number(idx));
            }
            for (const [, idxs] of Object.entries(knownPairs)) {
                if (idxs.length >= 2) {
                    first = idxs[0];
                    second = idxs[1];
                    break;
                }
            }
        }

        // Fallback: random
        if (first === null) {
            const shuffled = [...available].sort(() => Math.random() - 0.5);
            first = shuffled[0];
            second = shuffled.find(i => i !== first) ?? shuffled[1];
        }

        // Memorize what we flip
        if (this.deck[first]) this.memory[first] = this.deck[first].emoji;
        if (this.deck[second]) this.memory[second] = this.deck[second].emoji;

        this.isMyTurn = false;
        // Send both flips with a delay between them
        this.conn._sendToPlayer({ type: 'flip', index: first });
        setTimeout(() => {
            this.conn._sendToPlayer({ type: 'flip', index: second });
        }, 800);
    }

    close() {}
}
