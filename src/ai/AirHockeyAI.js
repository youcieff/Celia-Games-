// AI for Air Hockey — intelligent, decisive arcade opponent with zero hesitation and no deadzones.

const TABLE_W = 380;
const TABLE_H = 640;
const PADDLE_R = 34;
const PUCK_R = 15;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export default class AirHockeyAI {
    constructor(mockConn) {
        this.conn = mockConn;
        this.paddleX = TABLE_W / 2;
        this.paddleY = 90;
        this.vx = 0;
        this.vy = 0;
        this.puck = { x: TABLE_W / 2, y: TABLE_H / 2, vx: 0, vy: 0 };
        this.interval = null;
        this.difficultyLevel = 'medium';
        this.isServingWait = false;
        // Tracks how many ticks we've been "stuck behind" puck — escape after threshold
        this._stuckTicks = 0;
        this._flankDir = 1; // +1 right, -1 left

        setTimeout(() => {
            this.conn._sendToPlayer({
                type: 'global_ready',
                profile: { nickname: 'الذكاء الاصطناعي 🤖', avatar: 'robot' }
            });
        }, 500);

        // 60Hz AI loop
        this.interval = setInterval(() => this._tick(), 16);
    }

    onMessage(msg) {
        if (!msg || !msg.type) return;

        switch (msg.type) {
            case 'set_difficulty': {
                const level = msg.level || 'medium';
                this.difficultyLevel = level;
                if (level === 'easy') {
                    this.conn._sendToPlayer({
                        type: 'profile_update',
                        profile: { nickname: 'الذكاء الاصطناعي 🤖', avatar: 'robot' }
                    });
                } else if (level === 'hard') {
                    this.conn._sendToPlayer({
                        type: 'profile_update',
                        profile: { nickname: 'الذكاء الاصطناعي 🤖', avatar: 'robot' }
                    });
                } else {
                    this.conn._sendToPlayer({
                        type: 'profile_update',
                        profile: { nickname: 'الذكاء الاصطناعي 🤖', avatar: 'robot' }
                    });
                }
                break;
            }
            case 'puck_sync': {
                this.puck = { x: msg.x, y: msg.y, vx: msg.vx, vy: msg.vy };
                break;
            }
            case 'serve_reset':
            case 'goal':
            case 'rematch': {
                this.paddleX = TABLE_W / 2;
                this.paddleY = 90;
                this.vx = 0;
                this.vy = 0;
                this.isServingWait = true;
                setTimeout(() => { this.isServingWait = false; }, 1400);
                break;
            }
            default:
                break;
        }
    }

    _tick() {
        if (this.isServingWait) {
            this.paddleX = TABLE_W / 2;
            this.paddleY = 90;
            this.vx = 0;
            this.vy = 0;
            this._send();
            return;
        }

        const puck = this.puck;

        // ── Physical Movement Bounds ──
        const X_MIN = PADDLE_R + 2;
        const X_MAX = TABLE_W - PADDLE_R - 2;
        const Y_MIN = PADDLE_R + 6;
        // Reach right down to center line so no neutral gap exists
        const Y_MAX = TABLE_H / 2 - 8;
        const HOME_X = TABLE_W / 2;
        const HOME_Y = 85;

        // ── Predict future puck trajectory with side-rail rebounds ──
        const predictionSteps = this.difficultyLevel === 'hard' ? 9
                              : this.difficultyLevel === 'easy' ? 4 : 7;

        let px = puck.x + puck.vx * predictionSteps;
        for (let i = 0; i < 3; i++) {
            if (px < PUCK_R) {
                px = 2 * PUCK_R - px;
            } else if (px > TABLE_W - PUCK_R) {
                px = 2 * (TABLE_W - PUCK_R) - px;
            } else {
                break;
            }
        }
        px = clamp(px, PUCK_R, TABLE_W - PUCK_R);

        if (this.difficultyLevel === 'easy') {
            px += (Math.random() - 0.5) * 35;
        }

        let targetX = HOME_X;
        let targetY = HOME_Y;

        const puckInAIHalf = puck.y <= TABLE_H / 2 + 10;
        const puckApproachingAI = puck.vy < -0.7;

        if (puckInAIHalf) {
            // ══════════════════════════════════════════════════════════
            // ── AI HALF: Puck is in AI's court — must attack & clear! ──
            // ══════════════════════════════════════════════════════════

            const paddleOnTopOfPuck =
                Math.abs(this.paddleX - puck.x) < PADDLE_R + PUCK_R + 5 &&
                Math.abs(this.paddleY - puck.y) < PADDLE_R + PUCK_R + 5;

            const puckBehindPaddle = puck.y < this.paddleY - 5; // puck above paddle (closer to AI goal)

            if (puck.y <= Y_MIN + 12) {
                // Puck pinned near top wall — wiggle and sweep horizontally to dislodge it!
                this._stuckTicks++;
                const sweepPhase = Math.floor(this._stuckTicks / 15) % 2 === 0;

                if (puck.x > TABLE_W / 2) {
                    // Top-right corner
                    targetX = sweepPhase ? X_MAX : Math.max(X_MIN, puck.x - 80);
                    targetY = puck.y + 36; // Brush from below
                } else {
                    // Top-left corner
                    targetX = sweepPhase ? X_MIN : Math.min(X_MAX, puck.x + 80);
                    targetY = puck.y + 36;
                }


            } else if (puckBehindPaddle || (paddleOnTopOfPuck && puck.vy >= -0.5)) {
                // ── ESCAPE: Puck is behind/under us — pressing on it causes freeze!
                // Flank sideways AWAY from the puck first, then re-engage from front.
                this._stuckTicks++;

                // After 8 ticks stuck, flip flank direction to avoid wall loop
                if (this._stuckTicks === 1) {
                    // Pick flank direction: go to whichever side has more room
                    const roomRight = X_MAX - puck.x;
                    const roomLeft  = puck.x - X_MIN;
                    this._flankDir = roomRight > roomLeft ? 1 : -1;
                } else if (this._stuckTicks > 20) {
                    this._flankDir *= -1;
                    this._stuckTicks = 0;
                }

                // Move sideways out of collision zone, then pull back above the puck
                const flankDist = PADDLE_R * 2 + 25;
                targetX = clamp(puck.x + this._flankDir * flankDist, X_MIN, X_MAX);
                // Retreat slightly above puck so we have clear approach angle
                targetY = clamp(puck.y - PADDLE_R - 10, Y_MIN, Y_MAX);

            } else {
                // ── NORMAL ATTACK: paddle is in front of puck — charge through it!
                this._stuckTicks = 0;
                let aimOffset = 0;
                if (this.difficultyLevel === 'hard') {
                    aimOffset = puck.x < TABLE_W / 2 ? 30 : -30;
                } else if (this.difficultyLevel === 'medium') {
                    aimOffset = puck.x < TABLE_W / 2 ? 15 : -15;
                }
                targetX = clamp(puck.x - aimOffset * 0.2, X_MIN, X_MAX);
                targetY = clamp(puck.y + 35, Y_MIN, Y_MAX);
            }

        } else {
            // ══════════════════════════════════════════════════════════
            // ── PLAYER HALF: Puck is in player's court ──
            // ══════════════════════════════════════════════════════════

            if (puckApproachingAI) {
                // Puck is shot toward AI half — move to intercept position
                targetX = clamp(px, X_MIN, X_MAX);
                // Advance forward to meet the puck aggressively
                const interceptDepth = this.difficultyLevel === 'hard' ? 140 : 110;
                targetY = clamp(interceptDepth, Y_MIN, Y_MAX);
            } else {
                // Puck is drifting away or idle in player's court — hold defensive post
                const defenseX = HOME_X + (puck.x - HOME_X) * 0.40;
                targetX = clamp(defenseX, TABLE_W / 2 - 55, TABLE_W / 2 + 55);
                targetY = HOME_Y;
            }
        }

        // ── Physics-based Striker Movement ──
        const maxSpeed = this.difficultyLevel === 'hard' ? 12.5
                       : this.difficultyLevel === 'easy' ? 6.5 : 9.5;

        const dx = targetX - this.paddleX;
        const dy = targetY - this.paddleY;
        const dist = Math.hypot(dx, dy);

        if (dist > 0.5) {
            const speed = Math.min(dist * 0.55, maxSpeed);
            this.vx = (dx / dist) * speed;
            this.vy = (dy / dist) * speed;
            this.paddleX += this.vx;
            this.paddleY += this.vy;
        } else {
            this.vx = 0;
            this.vy = 0;
            this.paddleX = targetX;
            this.paddleY = targetY;
        }

        // Hard clamping to AI half
        this.paddleX = clamp(this.paddleX, X_MIN, X_MAX);
        this.paddleY = clamp(this.paddleY, Y_MIN, Y_MAX);

        this._send();
    }

    _send() {
        this.conn._sendToPlayer({
            type: 'paddle_move',
            x: TABLE_W - this.paddleX,
            y: TABLE_H - this.paddleY,
            vx: -this.vx,
            vy: -this.vy
        });
    }

    close() {
        if (this.interval) clearInterval(this.interval);
    }
}
