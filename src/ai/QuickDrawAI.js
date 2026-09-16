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
                profile: { nickname: 'الفنان الذكي (AI) 🎨', avatar: 'robot' }
            });
        }, 500);
    }

    onMessage(msg) {
        if (!msg || !msg.type) return;

        switch (msg.type) {
            // ── AI requested to draw ───────────────────────────────────────
            case 'ai_start_drawing': {
                this._clearAll();
                const wordChoices = getRandomWords(1);
                const chosen = wordChoices[0] || { word: 'شمس', category: 'طبيعة', emoji: '☀️' };

                // AI draws for 3-5 seconds then sends the finished drawing
                const drawDelay = 3000 + Math.random() * 2000;
                this.drawTimer = setTimeout(() => {
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
                break;
            }

            // ── AI received player's drawing ──────────────────────────────
            case 'drawing_sent': {
                // AI is guessing now AFTER the player finished drawing and sent it
                this._clearAll();
                const actualWord = msg.word;
                if (!actualWord) break;

                // 55% chance AI successfully figures out the drawing
                const willGuessCorrectly = Math.random() < 0.55;

                if (willGuessCorrectly) {
                    // AI takes 6-12 seconds to "think", then guesses the correct word
                    const delay = 6000 + Math.random() * 6000;
                    this.guessTimer = setTimeout(() => {
                        this.conn._sendToPlayer({
                            type: 'chat_guess',
                            guess: actualWord,
                            isCorrect: true
                        });
                        this.conn._sendToPlayer({
                            type: 'correct_guess',
                            pts: 1
                        });
                    }, delay);
                } else {
                    // AI does NOT know the drawing! It makes wrong guesses (0 points!)
                    const otherWords = DRAW_WORDS.filter(w => w.word !== actualWord);
                    const wrong1 = otherWords[Math.floor(Math.random() * otherWords.length)]?.word || 'قمر';
                    const wrong2 = otherWords[Math.floor(Math.random() * otherWords.length)]?.word || 'طائر';

                    // First wrong guess after 5-8 seconds (0 points)
                    const firstDelay = 5000 + Math.random() * 3000;
                    this.guessTimer = setTimeout(() => {
                        this.conn._sendToPlayer({
                            type: 'chat_guess',
                            guess: wrong1,
                            isCorrect: false
                        });

                        // Optional second wrong guess after another 8 seconds (still 0 points!)
                        this.guessTimer = setTimeout(() => {
                            this.conn._sendToPlayer({
                                type: 'chat_guess',
                                guess: wrong2,
                                isCorrect: false
                            });
                            // AI failed to guess! No points are EVER awarded!
                        }, 8000);
                    }, firstDelay);
                }
                break;
            }

            case 'correct_guess':
            case 'time_up_sync':
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
        if (this.guessTimer) {
            clearTimeout(this.guessTimer);
            this.guessTimer = null;
        }
        if (this.drawTimer) {
            clearTimeout(this.drawTimer);
            this.drawTimer = null;
        }
    }

    close() {
        this._clearAll();
    }
}
