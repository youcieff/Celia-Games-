// AI for Quick Draw (ارسم وخمن)
// Guesser: Waits strictly until 'drawing_sent' is received before making any guesses.
// Drawer: Waits for 'ai_start_drawing', creates a drawing on canvas, and sends 'drawing_sent'.

import { DRAW_WORDS, getRandomWords } from '../games/QuickDraw/drawWords.js';

export default class QuickDrawAI {
    constructor(mockConn) {
        this.conn = mockConn;
        this.guessTimer = null;
        this.drawTimer = null;

        setTimeout(() => {
            this.conn._sendToPlayer({
                type: 'global_ready',
                profile: { nickname: 'الذكاء الاصطناعي 🤖', avatar: 'robot' }
            });
        }, 500);
        this.timers = [];
    }

    onMessage(msg) {
        if (!msg || !msg.type) return;

        switch (msg.type) {
            // ── AI requested to draw ───────────────────────────────────────
            case 'ai_start_drawing': {
                this._clearAll();
                const wordChoices = getRandomWords(1);
                const chosen = wordChoices[0] || { word: 'شمس', category: 'طبيعة', emoji: '☀️' };

                // AI draws for 3-4 seconds then sends the finished drawing
                const drawDelay = 3000 + Math.random() * 1500;
                const t = setTimeout(() => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 600;
                    canvas.height = 450;
                    const ctx = canvas.getContext('2d');

                    // Dark luxury canvas background
                    ctx.fillStyle = '#0f172a';
                    ctx.fillRect(0, 0, 600, 450);

                    // Inner border
                    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                    ctx.lineWidth = 4;
                    ctx.strokeRect(10, 10, 580, 430);

                    // Draw stylized artistic representation
                    ctx.fillStyle = '#38bdf8';
                    ctx.font = 'bold 96px Arial, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(chosen.emoji || '🎨', 300, 200);

                    ctx.fillStyle = '#94a3b8';
                    ctx.font = 'bold 24px Arial, sans-serif';
                    ctx.fillText(`تصنيف: ${chosen.category || 'عام'} (${chosen.word.length} حروف)`, 300, 320);

                    const imageData = canvas.toDataURL('image/png');

                    this.conn._sendToPlayer({
                        type: 'drawing_sent',
                        imageData,
                        word: chosen.word,
                        wordLength: chosen.word.length,
                        category: chosen.category
                    });
                }, drawDelay);
                this.timers.push(t);
                break;
            }

            // ── AI received player's drawing (AI is guessing) ─────────────
            case 'drawing_sent': {
                this._clearAll();
                const actualWord = msg.word;
                if (!actualWord) break;

                const willGuessCorrectly = Math.random() < 0.55;
                const otherWords = DRAW_WORDS.filter(w => w.word !== actualWord);
                const getWrong = () => otherWords[Math.floor(Math.random() * otherWords.length)]?.word || 'قمر';

                if (willGuessCorrectly) {
                    // Decide if AI guesses correctly on 1st try (40%) or 2nd try (60%)
                    const correctOnFirst = Math.random() < 0.4;
                    if (correctOnFirst) {
                        const t = setTimeout(() => {
                            this.conn._sendToPlayer({
                                type: 'chat_guess',
                                guess: actualWord,
                                isCorrect: true
                            });
                            this.conn._sendToPlayer({
                                type: 'correct_guess',
                                pts: 1
                            });
                        }, 4000 + Math.random() * 3000);
                        this.timers.push(t);
                    } else {
                        // 1 wrong guess first, then correct guess
                        const wrong1 = getWrong();
                        const t1 = setTimeout(() => {
                            this.conn._sendToPlayer({
                                type: 'chat_guess',
                                guess: wrong1,
                                isCorrect: false
                            });
                            const t2 = setTimeout(() => {
                                this.conn._sendToPlayer({
                                    type: 'chat_guess',
                                    guess: actualWord,
                                    isCorrect: true
                                });
                                this.conn._sendToPlayer({
                                    type: 'correct_guess',
                                    pts: 1
                                });
                            }, 3500 + Math.random() * 2500);
                            this.timers.push(t2);
                        }, 3000 + Math.random() * 2500);
                        this.timers.push(t1);
                    }
                } else {
                    // AI fails: makes 3 wrong guesses, then immediately sends guesser_out_of_attempts!
                    const wrong1 = getWrong();
                    let wrong2 = getWrong();
                    while (wrong2 === wrong1) wrong2 = getWrong();
                    let wrong3 = getWrong();
                    while (wrong3 === wrong1 || wrong3 === wrong2) wrong3 = getWrong();

                    // 1st wrong guess
                    const t1 = setTimeout(() => {
                        this.conn._sendToPlayer({
                            type: 'chat_guess',
                            guess: wrong1,
                            isCorrect: false
                        });

                        // 2nd wrong guess
                        const t2 = setTimeout(() => {
                            this.conn._sendToPlayer({
                                type: 'chat_guess',
                                guess: wrong2,
                                isCorrect: false
                            });

                            // 3rd wrong guess -> immediately end round
                            const t3 = setTimeout(() => {
                                this.conn._sendToPlayer({
                                    type: 'chat_guess',
                                    guess: wrong3,
                                    isCorrect: false
                                });
                                this.conn._sendToPlayer({
                                    type: 'guesser_out_of_attempts',
                                    word: actualWord
                                });
                            }, 3000 + Math.random() * 2000);
                            this.timers.push(t3);
                        }, 3000 + Math.random() * 2000);
                        this.timers.push(t2);
                    }, 3000 + Math.random() * 2000);
                    this.timers.push(t1);
                }
                break;
            }

            case 'correct_guess':
            case 'time_up_sync':
            case 'guesser_out_of_attempts':
            case 'next_round': {
                this._clearAll();
                break;
            }

            case 'rematch': {
                this._clearAll();
                this.conn._sendToPlayer({ type: 'rematch' });
                break;
            }

            default:
                break;
        }
    }

    _clearAll() {
        if (this.timers && this.timers.length > 0) {
            this.timers.forEach(t => clearTimeout(t));
            this.timers = [];
        }
    }

    close() {
        this._clearAll();
    }
}
