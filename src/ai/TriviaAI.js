// AI for Trivia Duel (تحدي المعلومات والسرعة)
// Simulates realistic human knowledge and answering speeds (1.5 to 5.5 seconds)

export default class TriviaAI {
    constructor(mockConn) {
        this.conn = mockConn;
        this.questions = [];
        this.currentQIdx = 0;
        this.timer = null;

        setTimeout(() => this.conn._sendToPlayer({
            type: 'global_ready',
            profile: { nickname: 'عبقري المعلومات (AI)', avatar: 'robot' }
        }), 600);
    }

    onMessage(msg) {
        if (!msg || !msg.type) return;

        switch (msg.type) {
            case 'start_match':
                this.questions = msg.questions || [];
                this.currentQIdx = 0;
                this._clearTimer();
                this._scheduleAnswer(0);
                break;

            case 'next_question':
                this.currentQIdx = msg.questionIdx;
                this._clearTimer();
                this._scheduleAnswer(msg.questionIdx);
                break;

            case 'rematch':
                this._clearTimer();
                this.conn._sendToPlayer({ type: 'rematch_accept' });
                break;

            default:
                break;
        }
    }

    _scheduleAnswer(qIdx) {
        const q = this.questions[qIdx];
        if (!q) return;

        // Human-like response delay: 1.8s to 5.8s
        const delay = 1800 + Math.random() * 4000;

        this.timer = setTimeout(() => {
            // 80% accuracy
            const isSmart = Math.random() < 0.82;
            let chosenIdx = q.correctIndex;
            if (!isSmart) {
                const wrongIndices = [0, 1, 2, 3].filter(i => i !== q.correctIndex);
                chosenIdx = wrongIndices[Math.floor(Math.random() * wrongIndices.length)];
            }

            this.conn._sendToPlayer({
                type: 'answer',
                questionIdx: qIdx,
                selectedIdx: chosenIdx,
                elapsedMs: delay
            });
        }, delay);
    }

    _clearTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    close() {
        this._clearTimer();
    }
}
