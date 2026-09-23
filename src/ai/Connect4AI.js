// High-efficiency & high-accuracy Connect 4 AI
// Player is 'host', AI is 'opp'

export default class Connect4AI {
    constructor(mockConn) {
        this.conn = mockConn;
        this.ROWS = 6;
        this.COLS = 7;
        this.board = Array.from({ length: this.ROWS }, () => Array(this.COLS).fill(null));
        this.isAiTurn = false;
        this.moveTimer = null;

        setTimeout(() => {
            this.conn._sendToPlayer({
                type: 'global_ready',
                profile: { nickname: 'الذكاء الاصطناعي', avatar: 'robot' }
            });
        }, 600);
    }

    onMessage(msg) {
        if (msg.type === 'start') {
            this._resetBoard();
            const hostStarts = msg.config?.hostPlaysFirst !== false;
            this.isAiTurn = !hostStarts;
            if (this.isAiTurn) {
                this.scheduleMove(800);
            }
        } else if (msg.type === 'play') {
            // Player (host) dropped a coin
            this.dropCoin(this.board, msg.colIdx, 'host');
            this.isAiTurn = true;
            this.scheduleMove(500 + Math.random() * 300);
        } else if (msg.type === 'restart') {
            this._resetBoard();
            this.isAiTurn = false;
        }
    }

    _resetBoard() {
        if (this.moveTimer) clearTimeout(this.moveTimer);
        this.board = Array.from({ length: this.ROWS }, () => Array(this.COLS).fill(null));
    }

    scheduleMove(delay = 600) {
        if (this.moveTimer) clearTimeout(this.moveTimer);
        this.moveTimer = setTimeout(() => {
            this.makeMove();
        }, delay);
    }

    dropCoin(board, col, player) {
        for (let r = this.ROWS - 1; r >= 0; r--) {
            if (board[r][col] === null) {
                board[r][col] = player;
                return r;
            }
        }
        return -1;
    }

    undoCoin(board, col) {
        for (let r = 0; r < this.ROWS; r++) {
            if (board[r][col] !== null) {
                board[r][col] = null;
                return;
            }
        }
    }

    getValidLocations(board) {
        const valid = [];
        const order = [3, 2, 4, 1, 5, 0, 6];
        for (const c of order) {
            if (board[0][c] === null) {
                valid.push(c);
            }
        }
        return valid;
    }

    checkWin(board, piece) {
        // Horizontal
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS - 3; c++) {
                if (board[r][c] === piece && board[r][c+1] === piece && board[r][c+2] === piece && board[r][c+3] === piece) {
                    return true;
                }
            }
        }
        // Vertical
        for (let c = 0; c < this.COLS; c++) {
            for (let r = 0; r < this.ROWS - 3; r++) {
                if (board[r][c] === piece && board[r+1][c] === piece && board[r+2][c] === piece && board[r+3][c] === piece) {
                    return true;
                }
            }
        }
        // Positive diagonal (/)
        for (let r = 3; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS - 3; c++) {
                if (board[r][c] === piece && board[r-1][c+1] === piece && board[r-2][c+2] === piece && board[r-3][c+3] === piece) {
                    return true;
                }
            }
        }
        // Negative diagonal (\)
        for (let r = 0; r < this.ROWS - 3; r++) {
            for (let c = 0; c < this.COLS - 3; c++) {
                if (board[r][c] === piece && board[r+1][c+1] === piece && board[r+2][c+2] === piece && board[r+3][c+3] === piece) {
                    return true;
                }
            }
        }
        return false;
    }

    evaluateWindow(window, piece) {
        let score = 0;
        const oppPiece = piece === 'opp' ? 'host' : 'opp';
        const pieceCount = window.filter(c => c === piece).length;
        const emptyCount = window.filter(c => c === null).length;
        const oppCount = window.filter(c => c === oppPiece).length;

        if (pieceCount === 4) score += 10000;
        else if (pieceCount === 3 && emptyCount === 1) score += 100;
        else if (pieceCount === 2 && emptyCount === 2) score += 10;

        if (oppCount === 3 && emptyCount === 1) score -= 120;
        else if (oppCount === 2 && emptyCount === 2) score -= 15;

        return score;
    }

    scorePosition(board, piece) {
        let score = 0;

        // Center column control bonus
        const centerCol = [];
        for (let r = 0; r < this.ROWS; r++) centerCol.push(board[r][3]);
        const centerCount = centerCol.filter(c => c === piece).length;
        score += centerCount * 12;

        // Horizontal
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS - 3; c++) {
                score += this.evaluateWindow([board[r][c], board[r][c+1], board[r][c+2], board[r][c+3]], piece);
            }
        }

        // Vertical
        for (let c = 0; c < this.COLS; c++) {
            for (let r = 0; r < this.ROWS - 3; r++) {
                score += this.evaluateWindow([board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]], piece);
            }
        }

        // Positive Diagonal
        for (let r = 3; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS - 3; c++) {
                score += this.evaluateWindow([board[r][c], board[r-1][c+1], board[r-2][c+2], board[r-3][c+3]], piece);
            }
        }

        // Negative Diagonal
        for (let r = 0; r < this.ROWS - 3; r++) {
            for (let c = 0; c < this.COLS - 3; c++) {
                score += this.evaluateWindow([board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]], piece);
            }
        }

        return score;
    }

    minimax(board, depth, alpha, beta, isMaximizing) {
        const valid = this.getValidLocations(board);
        const aiWins = this.checkWin(board, 'opp');
        const hostWins = this.checkWin(board, 'host');

        if (aiWins) return { score: 1000000 + depth * 1000 };
        if (hostWins) return { score: -1000000 - depth * 1000 };
        if (valid.length === 0) return { score: 0 };
        if (depth === 0) return { score: this.scorePosition(board, 'opp') };

        if (isMaximizing) {
            let maxScore = -Infinity;
            let bestCol = valid[0];
            for (const col of valid) {
                this.dropCoin(board, col, 'opp');
                const result = this.minimax(board, depth - 1, alpha, beta, false);
                this.undoCoin(board, col);
                if (result.score > maxScore) {
                    maxScore = result.score;
                    bestCol = col;
                }
                alpha = Math.max(alpha, maxScore);
                if (alpha >= beta) break;
            }
            return { col: bestCol, score: maxScore };
        } else {
            let minScore = Infinity;
            let bestCol = valid[0];
            for (const col of valid) {
                this.dropCoin(board, col, 'host');
                const result = this.minimax(board, depth - 1, alpha, beta, true);
                this.undoCoin(board, col);
                if (result.score < minScore) {
                    minScore = result.score;
                    bestCol = col;
                }
                beta = Math.min(beta, minScore);
                if (alpha >= beta) break;
            }
            return { col: bestCol, score: minScore };
        }
    }

    makeMove() {
        if (!this.isAiTurn) return;
        const valid = this.getValidLocations(this.board);
        if (valid.length === 0) return;
        if (this.checkWin(this.board, 'host') || this.checkWin(this.board, 'opp')) return;

        let chosenCol = null;

        // 1. Check for immediate winning move for AI ('opp')
        for (const col of valid) {
            this.dropCoin(this.board, col, 'opp');
            if (this.checkWin(this.board, 'opp')) {
                chosenCol = col;
                this.undoCoin(this.board, col);
                break;
            }
            this.undoCoin(this.board, col);
        }

        // 2. Check for immediate block of human player ('host')
        if (chosenCol === null) {
            for (const col of valid) {
                this.dropCoin(this.board, col, 'host');
                if (this.checkWin(this.board, 'host')) {
                    chosenCol = col;
                    this.undoCoin(this.board, col);
                    break;
                }
                this.undoCoin(this.board, col);
            }
        }

        // 3. Minimax (depth 2) - medium difficulty with occasional randomness
        if (chosenCol === null) {
            // 25% chance of a random move to make it feel more human and beatable
            if (Math.random() < 0.25) {
                chosenCol = valid[Math.floor(Math.random() * valid.length)];
            } else {
                const res = this.minimax(this.board, 2, -Infinity, Infinity, true);
                chosenCol = res.col !== undefined && valid.includes(res.col) ? res.col : valid[0];
            }
        }

        // Apply AI move
        this.dropCoin(this.board, chosenCol, 'opp');
        this.isAiTurn = false;

        this.conn._sendToPlayer({ type: 'play', colIdx: chosenCol });
    }

    close() {
        if (this.moveTimer) clearTimeout(this.moveTimer);
    }
}
