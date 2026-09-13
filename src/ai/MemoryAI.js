// AI for Memory Match.
// Remembers flipped cards and makes strategic, human-like matching moves.

export default class MemoryAI {
    constructor(mockConn) {
        this.conn = mockConn;
        this.deck = [];
        this.memory = {};         // index -> cardId
        this.matched = new Set(); // indexes already matched
        this.isMyTurn = false;
        this.activeFlips = [];
        this.turnTimer = null;

        setTimeout(() => this.conn._sendToPlayer({
            type: 'global_ready',
            profile: { nickname: 'الذكاء الاصطناعي 🤖', avatar: '🤖' }
        }), 600);
    }

    onMessage(msg) {
        if (msg.type === 'start') {
            this.deck = msg.deck || [];
            this.memory = {};
            this.matched = new Set();
            this.activeFlips = [];
            this.isMyTurn = false;
            if (this.turnTimer) clearTimeout(this.turnTimer);
        } else if (msg.type === 'flip') {
            // Player flipped a card
            const idx = msg.index;
            if (this.deck[idx]) {
                const card = this.deck[idx];
                this.memory[idx] = card.cardId || card.id;
            }

            this.activeFlips.push(idx);
            if (this.activeFlips.length >= 2) {
                const [i1, i2] = this.activeFlips.slice(-2);
                if (this.deck[i1] && this.deck[i2] && (this.deck[i1].cardId === this.deck[i2].cardId)) {
                    this.matched.add(i1);
                    this.matched.add(i2);
                    this.deck[i1].isMatched = true;
                    this.deck[i2].isMatched = true;
                }
                this.activeFlips = [];
            }
        } else if (msg.type === 'your_turn') {
            if (msg.matchedIndices) {
                msg.matchedIndices.forEach(i => {
                    this.matched.add(i);
                    if (this.deck[i]) this.deck[i].isMatched = true;
                });
            }
            this.isMyTurn = true;
            this.scheduleTurn(900 + Math.random() * 400);
        } else if (msg.type === 'restart') {
            this.deck = [];
            this.memory = {};
            this.matched = new Set();
            this.activeFlips = [];
            this.isMyTurn = false;
            if (this.turnTimer) clearTimeout(this.turnTimer);
        }
    }

    scheduleTurn(delay = 900) {
        if (this.turnTimer) clearTimeout(this.turnTimer);
        this.turnTimer = setTimeout(() => {
            this.takeTurn();
        }, delay);
    }

    takeTurn() {
        if (!this.isMyTurn || !this.deck.length) return;

        const available = this.deck
            .map((c, i) => (!c.isMatched && !this.matched.has(i) ? i : null))
            .filter(v => v !== null);

        if (available.length < 2) return;

        let first = null;
        let second = null;

        // 1. Look for an already known pair in memory
        const knownPairs = {};
        for (const [idxStr, cardId] of Object.entries(this.memory)) {
            const idx = Number(idxStr);
            if (!available.includes(idx)) continue;
            if (!knownPairs[cardId]) knownPairs[cardId] = [];
            knownPairs[cardId].push(idx);
        }

        for (const [, indices] of Object.entries(knownPairs)) {
            if (indices.length >= 2) {
                first = indices[0];
                second = indices[1];
                break;
            }
        }

        // 2. If no complete pair is in memory:
        // Pick an unknown card first
        if (first === null) {
            const unknownCards = available.filter(i => this.memory[i] === undefined);
            const pool = unknownCards.length > 0 ? unknownCards : available;
            first = pool[Math.floor(Math.random() * pool.length)];

            // Memorize first card
            const firstCard = this.deck[first];
            const firstCardId = firstCard?.cardId || firstCard?.id;
            if (firstCardId) {
                this.memory[first] = firstCardId;
            }

            // Now check if the match for `first` is already in memory!
            const matchIndex = Object.entries(this.memory).find(([idxStr, cid]) => {
                const i = Number(idxStr);
                return cid === firstCardId && i !== first && available.includes(i);
            });

            if (matchIndex) {
                second = Number(matchIndex[0]);
            } else {
                // Pick another unknown/random card
                const remaining = available.filter(i => i !== first);
                const unknownRemaining = remaining.filter(i => this.memory[i] === undefined);
                const secondPool = unknownRemaining.length > 0 ? unknownRemaining : remaining;
                second = secondPool[Math.floor(Math.random() * secondPool.length)];
            }
        }

        if (first === null || second === null || first === second) return;

        // Memorize second card as well
        const secondCard = this.deck[second];
        const secondCardId = secondCard?.cardId || secondCard?.id;
        if (secondCardId) {
            this.memory[second] = secondCardId;
        }

        this.isMyTurn = false;

        // Send first flip
        this.conn._sendToPlayer({ type: 'flip', index: first });

        // Send second flip after animation delay
        setTimeout(() => {
            this.conn._sendToPlayer({ type: 'flip', index: second });

            // If matched, record it locally
            if (firstCardId && secondCardId && firstCardId === secondCardId) {
                this.matched.add(first);
                this.matched.add(second);
                if (this.deck[first]) this.deck[first].isMatched = true;
                if (this.deck[second]) this.deck[second].isMatched = true;
            }
        }, 750);
    }

    close() {
        if (this.turnTimer) clearTimeout(this.turnTimer);
    }
}
