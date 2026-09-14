// AI for Ultimate Tic-Tac-Toe.
// Prevents deadlocks, plays intelligently by winning mini-boards, blocking opponent wins,
// and steering opponent away from advantageous mini-boards.

const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

const checkWin = (squares) => {
    for (const [a, b, c] of WIN_LINES) {
        if (squares[a] && squares[a] !== 'draw' && squares[a] === squares[b] && squares[a] === squares[c]) {
            return squares[a];
        }
    }
    if (!squares.includes(null)) return 'draw';
    return null;
};

export default class UltimateAI {
    constructor(mockConn) {
        this.conn = mockConn;
        this.boards = Array.from({ length: 9 }, () => Array(9).fill(null));
        this.bigBoard = Array(9).fill(null);
        this.activeBoardIdx = null;
        this.aiSymbol = 'O';
        this.xIsNext = true;
        this.moveTimer = null;

        setTimeout(() => this.conn._sendToPlayer({
            type: 'global_ready',
            profile: { nickname: 'الذكاء الاصطناعي', avatar: 'robot' }
        }), 600);
    }

    onMessage(msg) {
        if (msg.type === 'start') {
            this._reset();
            this.aiSymbol = msg.hostSymbol === 'X' ? 'O' : 'X';
            this.xIsNext = true;

            const isAiTurn = (this.aiSymbol === 'X' && this.xIsNext) || (this.aiSymbol === 'O' && !this.xIsNext);
            if (isAiTurn) {
                this.scheduleMove(800);
            }
        } else if (msg.type === 'play') {
            this.boards[msg.boardIdx][msg.cellIdx] = msg.symbol;
            const miniWin = checkWin(this.boards[msg.boardIdx]);
            if (miniWin) this.bigBoard[msg.boardIdx] = miniWin;

            // Target board is resolved if checkWin returns non-null or already in bigBoard
            const targetBoardWinner = checkWin(this.boards[msg.cellIdx]);
            const targetResolved = targetBoardWinner !== null || this.bigBoard[msg.cellIdx] !== null;
            this.activeBoardIdx = targetResolved ? null : msg.cellIdx;

            this.xIsNext = !this.xIsNext;
            this.scheduleMove(600 + Math.random() * 400);
        } else if (msg.type === 'restart') {
            this._reset();
        }
    }

    _reset() {
        if (this.moveTimer) clearTimeout(this.moveTimer);
        this.boards = Array.from({ length: 9 }, () => Array(9).fill(null));
        this.bigBoard = Array(9).fill(null);
        this.activeBoardIdx = null;
        this.xIsNext = true;
    }

    scheduleMove(delay = 600) {
        if (this.moveTimer) clearTimeout(this.moveTimer);
        this.moveTimer = setTimeout(() => {
            this.makeMove();
        }, delay);
    }

    _findWinningMove(board, symbol) {
        for (let i = 0; i < 9; i++) {
            if (board[i] === null) {
                board[i] = symbol;
                const win = checkWin(board);
                board[i] = null;
                if (win === symbol) return i;
            }
        }
        return null;
    }

    makeMove() {
        if (checkWin(this.bigBoard)) return;

        // Determine playable boards
        let candidateBoards = [];
        if (this.activeBoardIdx !== null && !this.bigBoard[this.activeBoardIdx]) {
            if (this.boards[this.activeBoardIdx].some(c => c === null)) {
                candidateBoards = [this.activeBoardIdx];
            }
        }

        // If target board has no available moves or was null, pick from any unfinished board
        if (candidateBoards.length === 0) {
            candidateBoards = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(b =>
                !this.bigBoard[b] && this.boards[b].some(c => c === null)
            );
        }

        // Final fallback: any board with at least one empty cell
        if (candidateBoards.length === 0) {
            candidateBoards = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(b =>
                this.boards[b].some(c => c === null)
            );
        }

        if (candidateBoards.length === 0) return; // No moves left anywhere

        const oppSymbol = this.aiSymbol === 'X' ? 'O' : 'X';
        let bestBoard = candidateBoards[0];
        let bestCell = null;

        // 1. Can AI win the ENTIRE game on the big board?
        for (const b of candidateBoards) {
            const winCell = this._findWinningMove(this.boards[b], this.aiSymbol);
            if (winCell !== null) {
                this.bigBoard[b] = this.aiSymbol;
                const gameWin = checkWin(this.bigBoard);
                this.bigBoard[b] = null;
                if (gameWin === this.aiSymbol) {
                    bestBoard = b;
                    bestCell = winCell;
                    break;
                }
            }
        }

        // 2. Can AI win any mini-board?
        if (bestCell === null) {
            for (const b of candidateBoards) {
                const winCell = this._findWinningMove(this.boards[b], this.aiSymbol);
                if (winCell !== null) {
                    bestBoard = b;
                    bestCell = winCell;
                    break;
                }
            }
        }

        // 3. Can AI block opponent from winning a mini-board?
        if (bestCell === null) {
            for (const b of candidateBoards) {
                const blockCell = this._findWinningMove(this.boards[b], oppSymbol);
                if (blockCell !== null) {
                    bestBoard = b;
                    bestCell = blockCell;
                    break;
                }
            }
        }

        // 4. Strategic move: prefer center cell (4), then corners (0, 2, 6, 8), then edges
        if (bestCell === null) {
            // Pick board closest to center
            const boardPreference = [4, 0, 2, 6, 8, 1, 3, 5, 7];
            bestBoard = candidateBoards.sort((a, b) => boardPreference.indexOf(a) - boardPreference.indexOf(b))[0];

            const available = this.boards[bestBoard]
                .map((v, i) => (v === null ? i : null))
                .filter(v => v !== null);

            const cellPreference = [4, 0, 2, 6, 8, 1, 3, 5, 7];
            // Filter out cells that would send opponent to an already-won board or a board opponent can win
            const safeCells = available.filter(c => {
                if (this.bigBoard[c] !== null) return false;
                return this._findWinningMove(this.boards[c], oppSymbol) === null;
            });

            const choices = safeCells.length > 0 ? safeCells : available;
            bestCell = choices.sort((a, b) => cellPreference.indexOf(a) - cellPreference.indexOf(b))[0];
        }

        // Apply move locally
        this.boards[bestBoard][bestCell] = this.aiSymbol;
        const miniWin = checkWin(this.boards[bestBoard]);
        if (miniWin) this.bigBoard[bestBoard] = miniWin;

        const targetBoardWinner = checkWin(this.boards[bestCell]);
        const targetResolved = targetBoardWinner !== null || this.bigBoard[bestCell] !== null;
        this.activeBoardIdx = targetResolved ? null : bestCell;

        this.xIsNext = !this.xIsNext;

        this.conn._sendToPlayer({
            type: 'play',
            boardIdx: bestBoard,
            cellIdx: bestCell,
            symbol: this.aiSymbol
        });
    }

    close() {
        if (this.moveTimer) clearTimeout(this.moveTimer);
    }
}
