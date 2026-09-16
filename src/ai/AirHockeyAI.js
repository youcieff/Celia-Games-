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

        setTimeout(() => {
            this.conn._sendToPlayer({
                type: 'global_ready',
                profile: { nickname: 'بطل الهوكي (AI) 🏒', avatar: 'robot' }
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
                        profile: { nickname: 'الذكاء (مبتدئ) 🏒', avatar: 'robot' }
                    });
                } else if (level === 'hard') {
                    this.conn._sendToPlayer({
                        type: 'profile_update',
                        profile: { nickname: 'الأسطورة (محترف) ⚡', avatar: 'robot' }
                    });
                } else {
                    this.conn._sendToPlayer({
                        type: 'profile_update',
                        profile: { nickname: 'بطل الهوكي (متوسط) 🏒', avatar: 'robot' }
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

            if (puck.y <= Y_MIN + 6) {
                // Puck is pinned against or near the top wall/goal line
                // Mallet sweeps into it from the side and drives forward
                targetX = clamp(puck.x, X_MIN, X_MAX);
                targetY = Y_MIN + 10;
            } else if (this.paddleY <= puck.y + 4) {
                // AI paddle is behind the puck — DRIVE FORWARD TO SMASH IT!
                // Add aim angle towards opponent corners on medium/hard
                let aimOffset = 0;
                if (this.difficultyLevel === 'hard') {
                    aimOffset = puck.x < TABLE_W / 2 ? 30 : -30;
                } else if (this.difficultyLevel === 'medium') {
                    aimOffset = puck.x < TABLE_W / 2 ? 15 : -15;
                }

                targetX = clamp(puck.x - aimOffset * 0.2, X_MIN, X_MAX);
                // Drive 30px through the puck to ensure solid collision velocity
                targetY = clamp(puck.y + 30, Y_MIN, Y_MAX);
            } else {
                // Puck slipped behind the AI paddle — quickly flank around it
                const flankSide = puck.x < TABLE_W / 2 ? 55 : -55;
                targetX = clamp(puck.x + flankSide, X_MIN, X_MAX);
                targetY = clamp(puck.y - 25, Y_MIN, Y_MAX);
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
