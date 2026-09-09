export default class TicTacToeAI {
    constructor(mockConn) {
        this.conn = mockConn;
        this.board = Array(9).fill(null);
        this.aiSymbol = 'O'; // default, will be overridden by 'start' msg
        this.isAiTurn = false;
        
        // As a guest, the AI sends a fake 'global_ready' immediately so the lobby transitions smoothly
        setTimeout(() => {
            this.conn._sendToPlayer({ type: 'global_ready' });
        }, 800);
    }

    onMessage(msg) {
        if (msg.type === 'global_ready') {
            // Player is ready. We do nothing, we already replied.
        } else if (msg.type === 'start') {
            this.board = Array(9).fill(null);
            this.aiSymbol = msg.hostSymbol === 'X' ? 'O' : 'X';
            
            this.isAiTurn = (this.aiSymbol === 'X' && msg.xIsNext) || (this.aiSymbol === 'O' && !msg.xIsNext);
            
            if (this.isAiTurn) {
                this.makeMove();
            }
        } else if (msg.type === 'play') {
            // Player made a move
            this.board[msg.index] = msg.symbol;
            this.isAiTurn = true; // It's our turn now
            this.makeMove();
        } else if (msg.type === 'restart') {
            this.board = Array(9).fill(null);
            // In TicTacToe, on restart, Host gets to reconsider their role and sends a new 'start' message.
            // AI just waits.
        }
    }

    makeMove() {
        // Double check no one has won
        if (this.checkWin(this.board)) return;

        // Medium difficulty: 30% chance for a random valid move, 70% chance for the best move
        let moveIndex;
        const availableMoves = this.board.map((c, i) => c === null ? i : null).filter(val => val !== null);
        
        if (availableMoves.length === 0) return; // Board full

        if (Math.random() < 0.3) {
            moveIndex = availableMoves[Math.floor(Math.random() * availableMoves.length)];
        } else {
            moveIndex = this.getBestMove();
        }

        // Apply locally
        this.board[moveIndex] = this.aiSymbol;
        this.isAiTurn = false;

        // Send to player
        this.conn._sendToPlayer({ type: 'play', index: moveIndex, symbol: this.aiSymbol });
    }

    getBestMove() {
        let bestScore = -Infinity;
        let move = -1;
        const available = this.board.map((c, i) => c === null ? i : null).filter(val => val !== null);

        for (let i = 0; i < available.length; i++) {
            const m = available[i];
            this.board[m] = this.aiSymbol;
            let score = this.minimax(this.board, 0, false);
            this.board[m] = null;
            if (score > bestScore) {
                bestScore = score;
                move = m;
            }
        }
        return move !== -1 ? move : available[0];
    }

    minimax(board, depth, isMaximizing) {
        const winner = this.checkWin(board);
        if (winner === this.aiSymbol) return 10 - depth;
        if (winner && winner !== 'draw') return -10 + depth;
        if (winner === 'draw') return 0;

        if (isMaximizing) {
            let bestScore = -Infinity;
            for (let i = 0; i < 9; i++) {
                if (!board[i]) {
                    board[i] = this.aiSymbol;
                    let score = this.minimax(board, depth + 1, false);
                    board[i] = null;
                    bestScore = Math.max(score, bestScore);
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            const oppSymbol = this.aiSymbol === 'X' ? 'O' : 'X';
            for (let i = 0; i < 9; i++) {
                if (!board[i]) {
                    board[i] = oppSymbol;
                    let score = this.minimax(board, depth + 1, true);
                    board[i] = null;
                    bestScore = Math.min(score, bestScore);
                }
            }
            return bestScore;
        }
    }

    checkWin(squares) {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
        for (let i = 0; i < lines.length; i++) {
            const [a, b, c] = lines[i];
            if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
                return squares[a];
            }
        }
        if (!squares.includes(null)) return 'draw';
        return null;
    }

    close() {}
}
