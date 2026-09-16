// AI for Domino Game
// Plays intelligently: draws from boneyard when blocked, prefers doubles and high pips, passes only when empty boneyard

export default class DominoAI {
    constructor(mockConn) {
        this.conn = mockConn;
        this.hand = [];
        this.boneyardCount = 14;
        this.boardChain = [];
        this.isMyTurn = false;
        this.thinkTimer = null;

        setTimeout(() => this.conn._sendToPlayer({
            type: 'global_ready',
            profile: { nickname: 'سلطان الدومينو (AI) 🎲', avatar: 'robot' }
        }), 500);
    }

    onMessage(msg) {
        if (!msg || !msg.type) return;

        switch (msg.type) {
            case 'init_dominoes':
                this.hand = [...(msg.peerHand || [])];
                this.boardChain = [];
                this.boneyardCount = msg.boneyardCount !== undefined ? msg.boneyardCount : 14;
                this.isMyTurn = msg.startTurn === 'peer';
                if (this.isMyTurn) this._scheduleMove();
                break;

            case 'play_tile': {
                this.boardChain = msg.newChain || [];
                this.isMyTurn = true;
                if (msg.remainingOppCount === 0) return; // game over
                this._scheduleMove();
                break;
            }

            case 'draw_response': {
                if (msg.tile) {
                    this.hand.push(msg.tile);
                    this.boneyardCount = msg.boneyardCount !== undefined ? msg.boneyardCount : Math.max(0, this.boneyardCount - 1);
                    // Check if AI can make a move now, or needs to draw again
                    const playable = this._playableTiles();
                    if (playable.length > 0) {
                        this._scheduleMove(700);
                    } else if (this.boneyardCount > 0) {
                        // Keep drawing after a realistic short delay
                        this.thinkTimer = setTimeout(() => {
                            this.conn._sendToPlayer({ type: 'draw_request' });
                        }, 600);
                    } else {
                        // Empty boneyard and no moves -> must pass
                        this.thinkTimer = setTimeout(() => {
                            this.isMyTurn = false;
                            this.conn._sendToPlayer({
                                type: 'pass_turn',
                                oppTiles: this.hand,
                                remainingTilesSum: this.hand.reduce((acc, t) => acc + t.sum, 0)
                            });
                        }, 700);
                    }
                } else {
                    this.boneyardCount = 0;
                    this.isMyTurn = false;
                    this.conn._sendToPlayer({
                        type: 'pass_turn',
                        oppTiles: this.hand,
                        remainingTilesSum: this.hand.reduce((acc, t) => acc + t.sum, 0)
                    });
                }
                break;
            }

            case 'opponent_drew': {
                this.boneyardCount = Math.max(0, this.boneyardCount - 1);
                break;
            }

            case 'pass_turn': {
                // opponent passed, now it's my turn
                this.isMyTurn = true;
                this._scheduleMove();
                break;
            }

            case 'rematch_request':
                this.conn._sendToPlayer({ type: 'rematch_accept' });
                break;

            default:
                break;
        }
    }

    _getChainEnds() {
        if (!this.boardChain || this.boardChain.length === 0) return { left: null, right: null };
        return {
            left: this.boardChain[0].left,
            right: this.boardChain[this.boardChain.length - 1].right
        };
    }

    _canPlay(tile) {
        if (this.boardChain.length === 0) return true;
        const { left, right } = this._getChainEnds();
        return tile.top === left || tile.bottom === left || tile.top === right || tile.bottom === right;
    }

    _playableTiles() {
        return this.hand.filter(t => this._canPlay(t));
    }

    _scheduleMove(customDelay) {
        if (this.thinkTimer) clearTimeout(this.thinkTimer);
        const delay = customDelay !== undefined ? customDelay : (900 + Math.random() * 1200);
        this.thinkTimer = setTimeout(() => this._makeMove(), delay);
    }

    _makeMove() {
        if (!this.isMyTurn) return;

        const playable = this._playableTiles();

        if (playable.length === 0) {
            // Need to draw from boneyard if available
            if (this.boneyardCount > 0) {
                this.conn._sendToPlayer({ type: 'draw_request' });
                return;
            }
            // No tiles left in boneyard: pass turn
            this.isMyTurn = false;
            this.conn._sendToPlayer({
                type: 'pass_turn',
                oppTiles: this.hand,
                remainingTilesSum: this.hand.reduce((acc, t) => acc + t.sum, 0)
            });
            return;
        }

        // Pick best tile: prefer doubles, then highest pip sum
        const tile = playable.reduce((best, t) => {
            if (t.isDouble && !best.isDouble) return t;
            if (!t.isDouble && best.isDouble) return best;
            return t.sum > best.sum ? t : best;
        });

        const { left, right } = this._getChainEnds();
        const newHand = this.hand.filter(t => t.id !== tile.id);
        this.hand = newHand;

        let side, nodeLeft, nodeRight;

        if (this.boardChain.length === 0) {
            side = 'right';
            nodeLeft = tile.top;
            nodeRight = tile.bottom;
        } else {
            const canLeft = tile.top === left || tile.bottom === left;
            if (canLeft) {
                side = 'left';
                nodeLeft = tile.top === left ? tile.bottom : tile.top;
                nodeRight = left;
            } else {
                side = 'right';
                nodeLeft = right;
                nodeRight = tile.top === right ? tile.bottom : tile.top;
            }
        }

        const newChainNode = {
            id: tile.id,
            left: nodeLeft,
            right: nodeRight,
            top: tile.top,
            bottom: tile.bottom,
            isDouble: tile.isDouble
        };

        const newChain = side === 'left'
            ? [newChainNode, ...this.boardChain]
            : [...this.boardChain, newChainNode];

        this.boardChain = newChain;
        this.isMyTurn = false;

        this.conn._sendToPlayer({
            type: 'play_tile',
            tile,
            side,
            newChain,
            remainingOppCount: newHand.length,
            remainingTilesSum: newHand.reduce((acc, t) => acc + t.sum, 0)
        });
    }

    close() {
        if (this.thinkTimer) clearTimeout(this.thinkTimer);
    }
}
