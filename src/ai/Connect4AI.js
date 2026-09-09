export default class Connect4AI {
    constructor(mockConn) {
        this.conn = mockConn;
        this.ROWS = 6;
        this.COLS = 7;
        this.board = Array(this.ROWS).fill(null).map(() => Array(this.COLS).fill(null));
        this.isAiTurn = false;
        
        // AI simulates 'global_ready' for lobby
        setTimeout(() => {
            this.conn._sendToPlayer({ type: 'global_ready' });
        }, 800);
    }

    onMessage(msg) {
        if (msg.type === 'start') {
            this.board = Array(this.ROWS).fill(null).map(() => Array(this.COLS).fill(null));
            
            // Connect4 game starts immediately without symbol selection.
            // Guest AI waits unless config says guest starts.
            if (!msg.config.hostPlaysFirst) {
                this.isAiTurn = true;
                this.makeMove();
            }
        } else if (msg.type === 'play') {
            // Player dropped a coin. Record it as 'opp'.
            this.dropCoin(this.board, msg.colIdx, 'opp');
            this.isAiTurn = true;
            this.makeMove();
        } else if (msg.type === 'restart') {
            this.board = Array(this.ROWS).fill(null).map(() => Array(this.COLS).fill(null));
            // Just wait for 'start' or 'play' based on logic
        }
    }

    dropCoin(board, col, player) {
        for (let r = this.ROWS - 1; r >= 0; r--) {
            if (!board[r][col]) {
                board[r][col] = player;
                return r;
            }
        }
        return -1; // Should not happen if column is checked before
    }

    getValidLocations(board) {
        const validLocations = [];
        for (let c = 0; c < this.COLS; c++) {
            if (board[0][c] === null) {
                validLocations.push(c);
            }
        }
        return validLocations;
    }

    checkWin(board, piece) {
        // Check horizontal
        for (let c = 0; c < this.COLS - 3; c++) {
            for (let r = 0; r < this.ROWS; r++) {
                if (board[r][c] === piece && board[r][c+1] === piece && board[r][c+2] === piece && board[r][c+3] === piece) {
                    return true;
                }
            }
        }
        // Check vertical
        for (let c = 0; c < this.COLS; c++) {
            for (let r = 0; r < this.ROWS - 3; r++) {
                if (board[r][c] === piece && board[r+1][c] === piece && board[r+2][c] === piece && board[r+3][c] === piece) {
                    return true;
                }
            }
        }
        // Check positive diagonal
        for (let c = 0; c < this.COLS - 3; c++) {
            for (let r = 0; r < this.ROWS - 3; r++) {
                if (board[r][c] === piece && board[r+1][c+1] === piece && board[r+2][c+2] === piece && board[r+3][c+3] === piece) {
                    return true;
                }
            }
        }
        // Check negative diagonal
        for (let c = 0; c < this.COLS - 3; c++) {
            for (let r = 3; r < this.ROWS; r++) {
                if (board[r][c] === piece && board[r-1][c+1] === piece && board[r-2][c+2] === piece && board[r-3][c+3] === piece) {
                    return true;
                }
            }
        }
        return false;
    }

    evaluateWindow(window, piece) {
        let score = 0;
        const oppPiece = piece === 'host' ? 'opp' : 'host';
        let pieceCount = window.filter(c => c === piece).length;
        let emptyCount = window.filter(c => c === null).length;
        let oppCount = window.filter(c => c === oppPiece).length;

        if (pieceCount === 4) score += 100;
        else if (pieceCount === 3 && emptyCount === 1) score += 5;
        else if (pieceCount === 2 && emptyCount === 2) score += 2;

        if (oppCount === 3 && emptyCount === 1) score -= 4;

        return score;
    }

    scorePosition(board, piece) {
        let score = 0;

        // Score center column (heuristic preference)
        const centerCol = [];
        for (let r = 0; r < this.ROWS; r++) centerCol.push(board[r][Math.floor(this.COLS/2)]);
        const centerCount = centerCol.filter(c => c === piece).length;
        score += centerCount * 3;

        // Horizontal
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS - 3; c++) {
                const window = [board[r][c], board[r][c+1], board[r][c+2], board[r][c+3]];
                score += this.evaluateWindow(window, piece);
            }
        }

        // Vertical
        for (let c = 0; c < this.COLS; c++) {
            for (let r = 0; r < this.ROWS - 3; r++) {
                const window = [board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]];
                score += this.evaluateWindow(window, piece);
            }
        }

        // Positive Diagonal
        for (let r = 0; r < this.ROWS - 3; r++) {
            for (let c = 0; c < this.COLS - 3; c++) {
                const window = [board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]];
                score += this.evaluateWindow(window, piece);
            }
        }

        // Negative Diagonal
        for (let r = 0; r < this.ROWS - 3; r++) {
            for (let c = 0; c < this.COLS - 3; c++) {
                const window = [board[r+3][c], board[r+2][c+1], board[r+1][c+2], board[r][c+3]];
                score += this.evaluateWindow(window, piece);
            }
        }

        return score;
    }

    isTerminalNode(board) {
        return this.checkWin(board, 'host') || this.checkWin(board, 'opp') || this.getValidLocations(board).length === 0;
    }

    minimax(board, depth, alpha, beta, maximizingPlayer) {
        const validLocations = this.getValidLocations(board);
        const isTerminal = this.isTerminalNode(board);
        
        if (depth === 0 || isTerminal) {
            if (isTerminal) {
                if (this.checkWin(board, 'host')) return { score: 10000000000 };
                else if (this.checkWin(board, 'opp')) return { score: -10000000000 };
                else return { score: 0 }; // Draw
            } else {
                return { score: this.scorePosition(board, 'host') };
            }
        }

        if (maximizingPlayer) {
            let value = -Infinity;
            let bestCol = validLocations[Math.floor(Math.random() * validLocations.length)];
            for (let col of validLocations) {
                let boardCopy = board.map(r => [...r]);
                this.dropCoin(boardCopy, col, 'host');
                let newScore = this.minimax(boardCopy, depth - 1, alpha, beta, false).score;
                if (newScore > value) {
                    value = newScore;
                    bestCol = col;
                }
                alpha = Math.max(alpha, value);
                if (alpha >= beta) break;
            }
            return { col: bestCol, score: value };
        } else {
            let value = Infinity;
            let bestCol = validLocations[Math.floor(Math.random() * validLocations.length)];
            for (let col of validLocations) {
                let boardCopy = board.map(r => [...r]);
                this.dropCoin(boardCopy, col, 'opp');
                let newScore = this.minimax(boardCopy, depth - 1, alpha, beta, true).score;
                if (newScore < value) {
                    value = newScore;
                    bestCol = col;
                }
                beta = Math.min(beta, value);
                if (alpha >= beta) break;
            }
            return { col: bestCol, score: value };
        }
    }

    makeMove() {
        if (!this.isAiTurn) return;
        if (this.getValidLocations(this.board).length === 0) return;
        if (this.checkWin(this.board, 'opp') || this.checkWin(this.board, 'host')) return;

        // Introduce random slight sub-optimality to make it medium difficulty (15% chance to ignore minimax and pick valid random)
        let col;
        const validLocations = this.getValidLocations(this.board);

        if (Math.random() < 0.15) {
            col = validLocations[Math.floor(Math.random() * validLocations.length)];
        } else {
            // Depth 4 allows decent anticipation without lagging
            // Note: AI is playing as 'host' internally if we map it like that, 
            // Wait, AI connects as Guest. Player is 'host' in Connect4Game.jsx
            // To Connect4Game.jsx, AI moves are received via msg.colIdx and processed as !isHostRef.current.
            // AI is effectively 'opp' from AI's perspective? No, if AI is Guest, the player drops 'host', AI drops 'opp'.
            // In minimax: AI is 'opp', Player is 'host'.
            // maximizingPlayer = true means we want to maximize 'host'? No, if AI is 'opp', we want to MINIMIZE!
            // Wait, the root call must be false (since we want to minimize 'host' score = maximize 'opp' score).
            // Let's call minimax trying to MINIMIZE if AI plays as 'opp'.
            let result = this.minimax(this.board, 4, -Infinity, Infinity, false);
            col = result.col;
            if (col === undefined || col === null) {
                 col = validLocations[0];
            }
        }

        this.dropCoin(this.board, col, 'opp'); // AI drops as 'opp'
        this.isAiTurn = false;

        this.conn._sendToPlayer({ type: 'play', colIdx: col });
    }

    close() {}
}
