// AI for Memory Match. Remembers all flipped cards (eidetic memory) but waits like a human.
// Medium difficulty = 60% chance to use memory, 40% picks randomly.
export default class MemoryAI {
    constructor(mockConn) {
        this.conn = mockConn;
        this.deck = [];           // Full deck received from host
        this.memory = {};         // index -> cardId/symbol that AI has "seen"
        this.matched = new Set(); // Already matched indexes
        this.firstFlipped = null;
        this.isMyTurn = false;

        setTimeout(() => this.conn._sendToPlayer({
            type: 'global_ready',
            profile: { nickname: 'الذكاء الاصطناعي 🤖', avatar: '🤖' }
        }), 600);
    }

    onMessage(msg) {
        if (msg.type === 'start') {
            this.deck = msg.deck;
            this.memory = {};
            this.matched = new Set();
            this.firstFlipped = null;
            this.isMyTurn = false;
        } else if (msg.type === 'flip') {
            // Player flipped a card — AI observes it (memorize it)
            if (this.deck[msg.index]) {
                const card = this.deck[msg.index];
                this.memory[msg.index] = card.cardId || card.symbol || card.emoji;
            }
        } else if (msg.type === 'restart') {
            this.deck = [];
            this.memory = {};
            this.matched = new Set();
            this.firstFlipped = null;
            this.isMyTurn = false;
        } else if (msg.type === 'your_turn') {
            // Game signals AI to play
            // Update matched cards if provided
            if (msg.matchedIndices) {
                msg.matchedIndices.forEach(i => {
                    this.matched.add(i);
                    if (this.deck[i]) this.deck[i].isMatched = true;
                });
            }
            this.isMyTurn = true;
            setTimeout(() => this.takeTurn(), 1000 + Math.random() * 700);
        }
    }

    takeTurn() {
        if (!this.isMyTurn || !this.deck.length) return;
        const available = this.deck
            .map((c, i) => (!c.isMatched && !this.matched.has(i) ? i : null))
            .filter(v => v !== null);
        if (available.length < 2) return;

        let first = null, second = null;

        // Try memory-based match (60% chance for medium difficulty)
        if (Math.random() < 0.6) {
            const knownPairs = {};
            for (const [idx, val] of Object.entries(this.memory)) {
                const i = Number(idx);
                if (this.matched.has(i) || !available.includes(i)) continue;
                if (!knownPairs[val]) knownPairs[val] = [];
                knownPairs[val].push(i);
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

        if (first === null || second === null) return;

        // Memorize what we flip
        if (this.deck[first]) {
            const c1 = this.deck[first];
            this.memory[first] = c1.cardId || c1.symbol || c1.emoji;
        }
        if (this.deck[second]) {
            const c2 = this.deck[second];
            this.memory[second] = c2.cardId || c2.symbol || c2.emoji;
        }

        // Check if it's a known match (AI will get another turn)
        const firstVal = this.memory[first];
        const secondVal = this.memory[second];
        const willMatch = firstVal && secondVal && firstVal === secondVal;

        this.isMyTurn = false;
        // Send both flips with a delay between them
        this.conn._sendToPlayer({ type: 'flip', index: first });
        setTimeout(() => {
            this.conn._sendToPlayer({ type: 'flip', index: second });

            // If AI matched a pair, it should get another turn — but only the game/host
            // will signal this via your_turn message, so we just wait
            if (willMatch) {
                this.matched.add(first);
                this.matched.add(second);
                if (this.deck[first]) this.deck[first].isMatched = true;
                if (this.deck[second]) this.deck[second].isMatched = true;
            }
        }, 800);
    }

    close() {}
}
