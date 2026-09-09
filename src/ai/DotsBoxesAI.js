// AI for Dots & Boxes. Greedy strategy: takes a box if possible, else picks the safest edge.
export default class DotsBoxesAI {
    constructor(mockConn) {
        this.conn = mockConn;
        this.ROWS = 6;
        this.COLS = 6;
        this.hLines = Array.from({length: this.ROWS+1}, () => Array(this.COLS).fill(null));
        this.vLines = Array.from({length: this.ROWS}, () => Array(this.COLS+1).fill(null));
        this.boxes = Array.from({length: this.ROWS}, () => Array(this.COLS).fill(null));
        this.isMyTurn = false;

        setTimeout(() => this.conn._sendToPlayer({ type: 'global_ready' }), 800);
    }

    onMessage(msg) {
        if (msg.type === 'start') {
            this._reset();
            // host starts in Dots & Boxes
            this.isMyTurn = false;
        } else if (msg.type === 'play') {
            this._applyLine(msg.lineType, msg.r, msg.c, 'opp'); // player = 'opp' for AI
            const captured = this._checkCaptures('opp');
            if (!captured) {
                // No box captured by player, it's AI's turn
                this.isMyTurn = true;
                setTimeout(() => this.makeMove(), 800 + Math.random() * 600);
            }
        } else if (msg.type === 'restart') {
            this._reset();
            this.isMyTurn = false;
        }
    }

    _reset() {
        this.hLines = Array.from({length: this.ROWS+1}, () => Array(this.COLS).fill(null));
        this.vLines = Array.from({length: this.ROWS}, () => Array(this.COLS+1).fill(null));
        this.boxes = Array.from({length: this.ROWS}, () => Array(this.COLS).fill(null));
    }

    _applyLine(type, r, c, owner) {
        if (type === 'h') this.hLines[r][c] = owner;
        else this.vLines[r][c] = owner;
    }

    _checkCaptures(owner) {
        let captured = false;
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                if (!this.boxes[r][c] &&
                    this.hLines[r][c] && this.hLines[r+1][c] &&
                    this.vLines[r][c] && this.vLines[r][c+1]) {
                    this.boxes[r][c] = owner;
                    captured = true;
                }
            }
        }
        return captured;
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
        for (let r = 0; r <= this.ROWS; r++)
            for (let c = 0; c < this.COLS; c++)
                if (!this.hLines[r][c]) moves.push({ type: 'h', r, c });
        for (let r = 0; r < this.ROWS; r++)
            for (let c = 0; c <= this.COLS; c++)
                if (!this.vLines[r][c]) moves.push({ type: 'v', r, c });
        return moves;
    }

    makeMove() {
        if (!this.isMyTurn) return;
        const allMoves = this._getAllMoves();
        if (allMoves.length === 0) return;

        // GREEDY: Try to complete a box first
        for (const move of allMoves) {
            // Simulate
            this._applyLine(move.type, move.r, move.c, 'host');
            const captured = this._checkCaptures('host');
            if (captured) {
                this.isMyTurn = false;
                this.conn._sendToPlayer({ type: 'play', lineType: move.type, r: move.r, c: move.c });
                // After a capture, AI plays again
                setTimeout(() => {
                    this.isMyTurn = true;
                    this.makeMove();
                }, 900);
                return;
            }
            // Undo
            if (move.type === 'h') this.hLines[move.r][move.c] = null;
            else this.vLines[move.r][move.c] = null;
            for (let r = 0; r < this.ROWS; r++)
                for (let c = 0; c < this.COLS; c++)
                    if (this.boxes[r][c] === 'host') this.boxes[r][c] = null;
        }

        // No capture available: pick a "safe" move (prefer boxes with 0 or 1 edges)
        const safe = allMoves.filter(m => {
            // Estimate how many edges the neighbouring boxes would have
            const affected = this._getAffectedBoxes(m.type, m.r, m.c);
            return affected.every(([br, bc]) => this._countEdges(br, bc) < 2);
        });
        const pool = safe.length > 0 ? safe : allMoves;
        const move = pool[Math.floor(Math.random() * pool.length)];

        this._applyLine(move.type, move.r, move.c, 'host');
        this._checkCaptures('host');
        this.isMyTurn = false;
        this.conn._sendToPlayer({ type: 'play', lineType: move.type, r: move.r, c: move.c });
    }

    _getAffectedBoxes(type, r, c) {
        const boxes = [];
        if (type === 'h') {
            if (r > 0) boxes.push([r-1, c]);
            if (r < this.ROWS) boxes.push([r, c]);
        } else {
            if (c > 0) boxes.push([r, c-1]);
            if (c < this.COLS) boxes.push([r, c]);
        }
        return boxes.filter(([br, bc]) => br >= 0 && br < this.ROWS && bc >= 0 && bc < this.COLS);
    }

    close() {}
}
