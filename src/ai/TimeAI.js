// AI for Guess The Time (خمن الوقت)
// Handles Target Mode and Roles Mode (Hider / Guesser) with realistic human timing.

export default class TimeAI {
    constructor(mockConn) {
        this.conn = mockConn;
        this.timers = [];
        this.gameMode = 'target';
        this.myRole = 'guesser';
        this.targetMs = 5000;
        this.turnMode = false;
        this.turnElapsedBase = 0;
        this.turnRpsChoice = null;

        setTimeout(() => {
            this.conn._sendToPlayer({
                type: 'global_ready',
                profile: { nickname: 'الذكاء الاصطناعي', avatar: 'robot' }
            });
        }, 500);
    }

    _addTimer(timer) {
        this.timers.push(timer);
        return timer;
    }

    _clearTimers() {
        this.timers.forEach(t => clearTimeout(t));
        this.timers = [];
        (this.intervals || []).forEach(t => clearInterval(t));
        this.intervals = [];
    }

    _addInterval(timer) {
        if (!this.intervals) this.intervals = [];
        this.intervals.push(timer);
        return timer;
    }

    _chooseTurnRps() {
        if (this.turnRpsChoice) return;
        const choices = ['rock', 'paper', 'scissors'];
        this.turnRpsChoice = choices[Math.floor(Math.random() * choices.length)];
        this.conn._sendToPlayer({ type: 'turn_rps_choice', seat: 'peer', choice: this.turnRpsChoice });
    }

    _startAiTurn(msg) {
        if (!this.turnMode || msg.seat !== 'peer') return;
        this._clearTimers();
        const turnId = msg.turnId;
        const base = Math.max(0, Number(msg.elapsedBase) || this.turnElapsedBase || 0);
        const target = Math.max(1, Number(this.targetMs) || 5000);
        const remaining = Math.max(0, target - base);
        const willLose = remaining <= 120 || Math.random() < 0.16;
        const safeDuration = Math.max(60, Math.min(remaining - 120, 450 + Math.random() * 1000));
        const duration = willLose ? remaining : safeDuration;

        this.turnElapsedBase = base;
        this._addTimer(setTimeout(() => {
            const startedAt = performance.now();
            this.conn._sendToPlayer({
                type: 'turn_clock_started',
                seat: 'peer',
                turnId,
                elapsedBase: base
            });

            const stop = () => {
                const elapsed = base + performance.now() - startedAt;
                const overLimit = willLose || elapsed >= target;
                this._clearTimers();
                this.turnElapsedBase = overLimit ? target : elapsed;
                this.conn._sendToPlayer({
                    type: 'turn_finished',
                    seat: 'peer',
                    turnId,
                    elapsed: overLimit ? target : elapsed,
                    overLimit
                });
            };

            this._addInterval(setInterval(() => {
                const elapsed = base + performance.now() - startedAt;
                this.conn._sendToPlayer({ type: 'turn_clock_tick', seat: 'peer', turnId, elapsed });
                if (elapsed >= duration) stop();
            }, 80));
        }, Math.max(0, Number(msg.delayMs) || 0) + 250));
    }

    onMessage(msg) {
        if (!msg || !msg.type) return;

        switch (msg.type) {
            case 'start_target_mode': {
                this._clearTimers();
                this.gameMode = 'target';
                this.targetMs = msg.targetMs || 5000;

                // Target Mode:
                // Host has a 3-second countdown (3000ms), then starts holding stopwatch.
                // AI simulates holding with realistic human variance (±40ms to ±250ms).
                const variance = (Math.random() - 0.48) * Math.min(500, Math.max(80, this.targetMs * 0.06));
                const aiElapsed = Math.max(200, Math.round(this.targetMs + variance));

                // Start and stop notifications keep the player's audio feedback
                // in sync with the AI's simulated attempt.
                this._addTimer(setTimeout(() => {
                    this.conn._sendToPlayer({ type: 'opp_started' });
                }, 3000));
                this._addTimer(setTimeout(() => {
                    this.conn._sendToPlayer({
                        type: 'opp_result',
                        elapsed: aiElapsed
                    });
                }, 3000 + aiElapsed));
                break;
            }

            case 'start_roles_mode': {
                this._clearTimers();
                this.gameMode = 'roles';
                // If hostIsHider is true, host hides and AI guesses
                // If hostIsHider is false, host guesses and AI hides
                this.myRole = msg.hostIsHider ? 'guesser' : 'hider';

                if (this.myRole === 'hider') {
                    // AI is Hider:
                    // AI waits 800ms, then starts "hiding" a time between 3.0s and 7.5s.
                    const secretDuration = Math.round(3000 + Math.random() * 4500);
                    this._addTimer(setTimeout(() => {
                        this.conn._sendToPlayer({ type: 'hider_started' });
                        this._addTimer(setTimeout(() => {
                            this.conn._sendToPlayer({
                                type: 'hider_done',
                                elapsed: secretDuration
                            });
                        }, secretDuration));
                    }, 800));
                }
                break;
            }

            case 'start_turn_mode': {
                this._clearTimers();
                this.gameMode = 'turns';
                this.turnMode = true;
                this.targetMs = Math.max(1, Number(msg.targetMs) || 5000);
                this.turnElapsedBase = 0;
                this.turnRpsChoice = null;
                this._addTimer(setTimeout(() => this._chooseTurnRps(), 450 + Math.random() * 550));
                break;
            }

            case 'turn_rps_choice': {
                if (this.turnMode && msg.seat === 'host' && !this.turnRpsChoice) {
                    this._addTimer(setTimeout(() => this._chooseTurnRps(), 250 + Math.random() * 400));
                }
                break;
            }

            case 'turn_rps_tie': {
                if (this.turnMode) {
                    this.turnRpsChoice = null;
                    this._addTimer(setTimeout(() => this._chooseTurnRps(), 350 + Math.random() * 450));
                }
                break;
            }

            case 'turn_countdown': {
                if (this.turnMode && msg.seat === 'peer') this._startAiTurn(msg);
                else if (this.turnMode) this.turnElapsedBase = Math.max(0, Number(msg.elapsedBase) || this.turnElapsedBase);
                break;
            }

            case 'turn_progress': {
                if (this.turnMode) this.turnElapsedBase = Math.max(0, Number(msg.elapsed) || 0);
                break;
            }

            case 'hider_done': {
                // Host was Hider, finished hiding their time. AI is Guesser.
                if (this.gameMode === 'roles' && this.myRole === 'guesser') {
                    const actualElapsed = msg.elapsed || 4000;
                    // AI "thinks" for 1.2 to 2.2 seconds, then submits a smart guess.
                    // Guesser wins if within 1000ms. AI has good human skill (~65% chance within 1s).
                    const error = (Math.random() - 0.5) * (Math.random() < 0.65 ? 900 : 1800);
                    const guessMs = Math.max(500, Math.round((actualElapsed + error) / 50) * 50);

                    this._addTimer(setTimeout(() => {
                        this.conn._sendToPlayer({
                            type: 'guesser_done',
                            guessMs
                        });
                    }, 1200 + Math.random() * 800));
                }
                break;
            }

            case 'restart': {
                this._clearTimers();
                this.turnMode = false;
                this.turnRpsChoice = null;
                break;
            }

            default:
                break;
        }
    }

    close() {
        this._clearTimers();
    }
}
