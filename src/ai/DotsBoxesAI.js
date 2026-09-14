// AI for Dots & Boxes.
// Optimized for 4x4 grid (ROWS=4, COLS=4) matching DotsBoxesGame.jsx
// Captures boxes aggressively, avoids opening boxes for opponent.

export default class DotsBoxesAI {
    constructor(mockConn) {
        this.conn = mockConn;
        this.ROWS = 4;
        this.COLS = 4;
        this.hLines = Array.from({ length: this.ROWS + 1 }, () => Array(this.COLS).fill(null));
        this.vLines = Array.from({ length: this.ROWS }, () => Array(this.COLS + 1).fill(null));
        this.boxes = Array.from({ length: this.ROWS }, () => Array(this.COLS).fill(null));
        this.isMyTurn = false;
        this.moveTimer = null;

        setTimeout(() => this.conn._sendToPlayer({
            type: 'global_ready',
            profile: { nickname: 'الذكاء الاصطناعي', avatar: 'robot' }
        }), 600);
    }

    onMessage(msg) {
        if (msg.type === 'start') {
            this._reset();
            // Host always starts in DotsBoxesGame; AI is guest
            this.isMyTurn = false;
        } else if (msg.type === 'play') {
            // Player moved
            this._applyLine(msg.lineType, msg.r, msg.c, 'host');
            const captured = this._checkCaptures('host');
            if (captured.length === 0) {
                // No box captured by player -> AI's turn
                this.isMyTurn = true;
                this.scheduleMove(700 + Math.random() * 400);
            }
        } else if (msg.type === 'restart') {
            this._reset();
            this.isMyTurn = false;
        }
    }

    _reset() {
        if (this.moveTimer) clearTimeout(this.moveTimer);
        this.hLines = Array.from({ length: this.ROWS + 1 }, () => Array(this.COLS).fill(null));
        this.vLines = Array.from({ length: this.ROWS }, () => Array(this.COLS + 1).fill(null));
        this.boxes = Array.from({ length: this.ROWS }, () => Array(this.COLS).fill(null));
    }

    scheduleMove(delay = 600) {
        if (this.moveTimer) clearTimeout(this.moveTimer);
        this.moveTimer = setTimeout(() => {
            this.makeMove();
        }, delay);
    }

    _applyLine(type, r, c, owner) {
        if (type === 'h') this.hLines[r][c] = owner;
        else this.vLines[r][c] = owner;
    }

    _checkCaptures(owner) {
        const newlyCaptured = [];
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                if (!this.boxes[r][c] &&
                    this.hLines[r][c] && this.hLines[r+1][c] &&
                    this.vLines[r][c] && this.vLines[r][c+1]) {
                    this.boxes[r][c] = owner;
                    newlyCaptured.push({ r, c });
                }
            }
        }
        return newlyCaptured;
    }

    _countEdges(r, c) {
        let count = 0;
        if (this.hLines[r][c]) count++;
        if (this.hLines[r+1][c]) count++;
        if (this.vLines[r][c]) count++;
        if (this.vLines[r][c+1]) count++;
        return count;
    }

    _getAllMoves() {
        const moves = [];
        for (let r = 0; r <= this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                if (!this.hLines[r][c]) moves.push({ type: 'h', r, c });
            }
        }
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c <= this.COLS; c++) {
                if (!this.vLines[r][c]) moves.push({ type: 'v', r, c });
            }
        }
        return moves;
    }

    _getAffectedBoxes(type, r, c) {
        const list = [];
        if (type === 'h') {
            if (r > 0) list.push([r - 1, c]);
            if (r < this.ROWS) list.push([r, c]);
        } else {
            if (c > 0) list.push([r, c - 1]);
            if (c < this.COLS) list.push([r, c]);
        }
        return list.filter(([br, bc]) => br >= 0 && br < this.ROWS && bc >= 0 && bc < this.COLS);
    }

    makeMove() {
        if (!this.isMyTurn) return;
        const allMoves = this._getAllMoves();
        if (allMoves.length === 0) return;

        // 1. GREEDY: Check if any move immediately completes 1 or more boxes
        for (const move of allMoves) {
            this._applyLine(move.type, move.r, move.c, 'opp');
            const newlyCaptured = this._checkCaptures('opp');

            // Undo simulation
            if (move.type === 'h') this.hLines[move.r][move.c] = null;
            else this.vLines[move.r][move.c] = null;
            for (const b of newlyCaptured) {
                this.boxes[b.r][b.c] = null;
            }

            if (newlyCaptured.length > 0) {
                // Apply actual move
                this._applyLine(move.type, move.r, move.c, 'opp');
                this._checkCaptures('opp');
                this.conn._sendToPlayer({ type: 'play', lineType: move.type, r: move.r, c: move.c });

                // Since AI captured, AI gets another turn!
                this.isMyTurn = true;
                this.scheduleMove(700);
                return;
            }
        }

        // 2. SAFE MOVE: Pick a move where no affected box reaches 3 edges (which would give opponent a box)
        const safeMoves = allMoves.filter(m => {
            const affected = this._getAffectedBoxes(m.type, m.r, m.c);
            return affected.every(([br, bc]) => this._countEdges(br, bc) < 2);
        });

        const pool = safeMoves.length > 0 ? safeMoves : allMoves;
        const move = pool[Math.floor(Math.random() * pool.length)];

        this._applyLine(move.type, move.r, move.c, 'opp');
        const captured = this._checkCaptures('opp');

        this.conn._sendToPlayer({ type: 'play', lineType: move.type, r: move.r, c: move.c });

        if (captured.length > 0) {
            this.isMyTurn = true;
            this.scheduleMove(700);
        } else {
            this.isMyTurn = false;
        }
    }

    close() {
        if (this.moveTimer) clearTimeout(this.moveTimer);
    }
}
