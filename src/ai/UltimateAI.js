// AI for Ultimate Tic-Tac-Toe. Acts as the guest (X = host, O = AI by default).
const checkWin = (squares) => {
    const lines = [
        [0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]
    ];
    for (const [a,b,c] of lines) {
        if (squares[a] && squares[a] !== 'draw' && squares[a] === squares[b] && squares[a] === squares[c]) return squares[a];
    }
    if (!squares.includes(null)) return 'draw';
    return null;
};

export default class UltimateAI {
    constructor(mockConn) {
        this.conn = mockConn;
        this.boards = Array.from({length: 9}, () => Array(9).fill(null));
        this.bigBoard = Array(9).fill(null);
        this.activeBoardIdx = null;
        this.aiSymbol = 'O';
        this.xIsNext = true;

        setTimeout(() => this.conn._sendToPlayer({ type: 'global_ready' }), 800);
    }

    onMessage(msg) {
        if (msg.type === 'start') {
            this.boards = Array.from({length: 9}, () => Array(9).fill(null));
            this.bigBoard = Array(9).fill(null);
            this.activeBoardIdx = null;
            this.aiSymbol = msg.hostSymbol === 'X' ? 'O' : 'X';
            this.xIsNext = true;
            
            const isAiTurn = (this.aiSymbol === 'X' && this.xIsNext) || (this.aiSymbol === 'O' && !this.xIsNext);
            if (isAiTurn) {
                setTimeout(() => this.makeMove(), 1000);
            }
        } else if (msg.type === 'play') {
            this.boards[msg.boardIdx][msg.cellIdx] = msg.symbol;
            const miniWin = checkWin(this.boards[msg.boardIdx]);
            if (miniWin) this.bigBoard[msg.boardIdx] = miniWin;
            this.activeBoardIdx = checkWin(this.boards[msg.cellIdx]) ? null : msg.cellIdx;
            this.xIsNext = !this.xIsNext;
            setTimeout(() => this.makeMove(), 700 + Math.random() * 500);
        } else if (msg.type === 'restart') {
            this.boards = Array.from({length: 9}, () => Array(9).fill(null));
            this.bigBoard = Array(9).fill(null);
            this.activeBoardIdx = null;
            this.xIsNext = true;
        }
    }

    makeMove() {
        if (checkWin(this.bigBoard)) return;

        let boardsToPlay = this.activeBoardIdx !== null && !this.bigBoard[this.activeBoardIdx]
            ? [this.activeBoardIdx]
            : this.bigBoard.map((v, i) => (!v ? i : null)).filter(v => v !== null);

        if (boardsToPlay.length === 0) return;

        // Pick a board with available cells (prefer boards that can win)
        let bIdx = boardsToPlay[Math.floor(Math.random() * boardsToPlay.length)];
        const available = this.boards[bIdx].map((v, i) => (!v ? i : null)).filter(v => v !== null);
        if (available.length === 0) return;

        const cIdx = available[Math.floor(Math.random() * available.length)];

        // Apply move locally
        this.boards[bIdx][cIdx] = this.aiSymbol;
        const miniWin = checkWin(this.boards[bIdx]);
        if (miniWin) this.bigBoard[bIdx] = miniWin;
        this.activeBoardIdx = checkWin(this.boards[cIdx]) ? null : cIdx;
        this.xIsNext = !this.xIsNext;

        this.conn._sendToPlayer({ type: 'play', boardIdx: bIdx, cellIdx: cIdx, symbol: this.aiSymbol });
    }

    close() {}
}
