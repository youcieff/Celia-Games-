export default class SeaBattleAI {
    constructor(mockConn) {
        this.conn = mockConn;
        this.SIZE = 8;
        this.TOTAL_HEALTH = 11;
        this.ships = [];
        this.myGrid = Array.from({ length: this.SIZE }, () => Array(this.SIZE).fill(null));
        this.targetGrid = Array.from({ length: this.SIZE }, () => Array(this.SIZE).fill(null));
        this.hitsOnMe = 0;
        this.isAiTurn = false;
        
        // AI modes for shooting
        this.targetQueue = []; // cells to try next after a hit

        setTimeout(() => {
            this.conn._sendToPlayer({
                type: 'global_ready',
                profile: { nickname: 'الذكاء الاصطناعي 🤖', avatar: '🤖' }
            });
        }, 600);
    }

    placeShipsRandomly() {
        const shipsToPlace = [
            { size: 4 },
            { size: 3 },
            { size: 2 },
            { size: 2 },
        ];

        this.ships = [];
        this.myGrid = Array.from({ length: this.SIZE }, () => Array(this.SIZE).fill(null));

        for (const shipInfo of shipsToPlace) {
            let placed = false;
            while (!placed) {
                const vertical = Math.random() > 0.5;
                const r = Math.floor(Math.random() * (vertical ? this.SIZE - shipInfo.size : this.SIZE));
                const c = Math.floor(Math.random() * (!vertical ? this.SIZE - shipInfo.size : this.SIZE));

                let collision = false;
                for (let i = 0; i < shipInfo.size; i++) {
                    const sr = vertical ? r + i : r;
                    const sc = vertical ? c : c + i;
                    if (this.myGrid[sr][sc] !== null) collision = true;
                }

                if (!collision) {
                    for (let i = 0; i < shipInfo.size; i++) {
                        const sr = vertical ? r + i : r;
                        const sc = vertical ? c : c + i;
                        this.myGrid[sr][sc] = 'ship';
                    }
                    this.ships.push({ r, c, size: shipInfo.size, vertical });
                    placed = true;
                }
            }
        }
    }

    onMessage(msg) {
        if (msg.type === 'ready') {
            // Player is ready! AI sets up immediately and says ready too.
            this.placeShipsRandomly();
            setTimeout(() => {
                this.conn._sendToPlayer({ type: 'ready' });
            }, 600);
        } else if (msg.type === 'ready-ack') {
            // Acknowledge
        } else if (msg.type === 'shot') {
            // Player (Host) shot at us (Guest)
            const { r, c } = msg;
            let isHit = false;

            if (this.myGrid[r][c] === 'ship') {
                isHit = true;
                this.myGrid[r][c] = 'hit';
                this.hitsOnMe++;
            } else {
                this.myGrid[r][c] = 'miss';
            }

            // Tell player result with explicit nextTurn
            this.conn._sendToPlayer({
                type: 'shot-result',
                r,
                c,
                result: isHit ? 'hit' : 'miss',
                nextTurn: 'guest' // AI turn next
            });

            // Now it's our turn
            if (this.hitsOnMe < this.TOTAL_HEALTH) {
                this.isAiTurn = true;
                setTimeout(() => this.makeMove(), 1100); 
            }
        } else if (msg.type === 'shot-result') {
            // Player tells us result of our shot
            const { r, c, result } = msg;
            this.targetGrid[r][c] = result;

            if (result === 'hit') {
                // Add adjacent cells to targetQueue (Target Mode)
                const adj = [[r-1, c], [r+1, c], [r, c-1], [r, c+1]];
                for (const [nr, nc] of adj) {
                    if (nr >= 0 && nr < this.SIZE && nc >= 0 && nc < this.SIZE && this.targetGrid[nr][nc] === null) {
                        this.targetQueue.push({r: nr, c: nc});
                    }
                }
            }
        } else if (msg.type === 'restart') {
            this.hitsOnMe = 0;
            this.targetQueue = [];
            this.targetGrid = Array.from({ length: this.SIZE }, () => Array(this.SIZE).fill(null));
        }
    }

    makeMove() {
        if (!this.isAiTurn) return;

        let r = -1;
        let c = -1;

        // Target mode
        while (this.targetQueue.length > 0) {
            const potential = this.targetQueue.shift();
            if (this.targetGrid[potential.r][potential.c] === null) {
                r = potential.r;
                c = potential.c;
                break;
            }
        }

        // Hunt mode
        if (r === -1) {
            let validMoves = [];
            for (let i = 0; i < this.SIZE; i++) {
                for (let j = 0; j < this.SIZE; j++) {
                    if (this.targetGrid[i][j] === null) validMoves.push({r: i, c: j});
                }
            }
            if (validMoves.length === 0) return;

            let huntingMoves = validMoves.filter(m => (m.r + m.c) % 2 === 0);
            if (huntingMoves.length === 0) huntingMoves = validMoves;

            const idx = Math.floor(Math.random() * huntingMoves.length);
            r = huntingMoves[idx].r;
            c = huntingMoves[idx].c;
        }

        this.targetGrid[r][c] = 'pending';
        this.isAiTurn = false;
        
        this.conn._sendToPlayer({
            type: 'shot',
            r,
            c,
            shooter: 'guest'
        });
    }

    close() {}
}
