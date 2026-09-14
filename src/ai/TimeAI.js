// AI for Guess The Time (خمن الوقت)
// Handles Target Mode and Roles Mode (Hider / Guesser) with realistic human timing.

export default class TimeAI {
    constructor(mockConn) {
        this.conn = mockConn;
        this.timers = [];
        this.gameMode = 'target';
        this.myRole = 'guesser';
        this.targetMs = 5000;

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

                // Send result around the time the AI would have released the button
                // 3000ms countdown + aiElapsed
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
                        this.conn._sendToPlayer({
                            type: 'hider_done',
                            elapsed: secretDuration
                        });
                    }, 800 + secretDuration));
                }
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
