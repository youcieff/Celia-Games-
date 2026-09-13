/**
 * Procedural Web Audio API Engine for Celia Games
 * Generates 0-latency realistic sound effects without any external assets.
 */

let audioCtx = null;
const MUTE_KEY = 'celia_games_muted';
let isMuted = false;

try {
    isMuted = localStorage.getItem(MUTE_KEY) === 'true';
} catch (e) { }

export function getMuted() {
    return isMuted;
}

export function toggleMute() {
    isMuted = !isMuted;
    try {
        localStorage.setItem(MUTE_KEY, isMuted ? 'true' : 'false');
    } catch (e) { }
    return isMuted;
}

export function setMuted(val) {
    isMuted = !!val;
    try {
        localStorage.setItem(MUTE_KEY, isMuted ? 'true' : 'false');
    } catch (e) { }
}

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

/**
 * Play procedural sound effect by name
 */
export function playSound(type) {
    if (isMuted) return;

    try {
        const ctx = initAudio();
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        switch (type) {
            case 'click':
            case 'tap':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(650, t);
                osc.frequency.exponentialRampToValueAtTime(120, t + 0.08);
                gain.gain.setValueAtTime(0.25, t);
                gain.gain.exponentialRampToValueAtTime(0.005, t + 0.08);
                osc.start(t);
                osc.stop(t + 0.08);
                break;

            case 'pop':
                osc.type = 'square';
                osc.frequency.setValueAtTime(320, t);
                gain.gain.setValueAtTime(0.18, t);
                gain.gain.exponentialRampToValueAtTime(0.005, t + 0.06);
                osc.start(t);
                osc.stop(t + 0.06);
                break;

            case 'splash': {
                // Realistic water splash: layered filtered noise + resonant fluid bubble drop
                const splashLen = 0.45;
                const bufferSize = Math.floor(ctx.sampleRate * splashLen);
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = (Math.random() * 2 - 1);
                }
                const noise = ctx.createBufferSource();
                noise.buffer = buffer;

                const bandpass = ctx.createBiquadFilter();
                bandpass.type = 'bandpass';
                bandpass.frequency.setValueAtTime(1400, t);
                bandpass.frequency.exponentialRampToValueAtTime(250, t + splashLen);
                bandpass.Q.setValueAtTime(3.5, t);

                const noiseGain = ctx.createGain();
                noiseGain.gain.setValueAtTime(0.6, t);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, t + splashLen);

                noise.connect(bandpass);
                bandpass.connect(noiseGain);
                noiseGain.connect(ctx.destination);

                // Water bubble thump
                const bubble = ctx.createOscillator();
                const bubbleGain = ctx.createGain();
                bubble.type = 'sine';
                bubble.frequency.setValueAtTime(450, t);
                bubble.frequency.exponentialRampToValueAtTime(110, t + 0.18);
                bubbleGain.gain.setValueAtTime(0.4, t);
                bubbleGain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
                bubble.connect(bubbleGain);
                bubbleGain.connect(ctx.destination);

                noise.start(t);
                noise.stop(t + splashLen);
                bubble.start(t);
                bubble.stop(t + 0.18);
                return;
            }

            case 'explosion': {
                // Cinematic deep explosion: sub-bass thump + filtered roaring noise
                const dur = 0.7;
                const bufferSize = Math.floor(ctx.sampleRate * dur);
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                const noise = ctx.createBufferSource();
                noise.buffer = buffer;

                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(900, t);
                filter.frequency.exponentialRampToValueAtTime(80, t + dur);

                const expGain = ctx.createGain();
                expGain.gain.setValueAtTime(0.85, t);
                expGain.gain.exponentialRampToValueAtTime(0.01, t + dur);

                noise.connect(filter);
                filter.connect(expGain);
                expGain.connect(ctx.destination);

                // Sub punch
                const sub = ctx.createOscillator();
                const subGain = ctx.createGain();
                sub.type = 'triangle';
                sub.frequency.setValueAtTime(130, t);
                sub.frequency.exponentialRampToValueAtTime(35, t + 0.35);
                subGain.gain.setValueAtTime(0.9, t);
                subGain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

                sub.connect(subGain);
                subGain.connect(ctx.destination);

                noise.start(t);
                noise.stop(t + dur);
                sub.start(t);
                sub.stop(t + 0.35);
                return;
            }

            case 'whoosh': {
                // Smooth card flip whoosh
                const dur = 0.16;
                const bufferSize = Math.floor(ctx.sampleRate * dur);
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                const noise = ctx.createBufferSource();
                noise.buffer = buffer;
                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(500, t);
                filter.frequency.linearRampToValueAtTime(2000, t + dur * 0.5);
                filter.frequency.linearRampToValueAtTime(400, t + dur);
                const whooshGain = ctx.createGain();
                whooshGain.gain.setValueAtTime(0.3, t);
                whooshGain.gain.exponentialRampToValueAtTime(0.01, t + dur);
                noise.connect(filter);
                filter.connect(whooshGain);
                whooshGain.connect(ctx.destination);
                noise.start(t);
                noise.stop(t + dur);
                return;
            }

            case 'chime':
            case 'match': {
                // Rich harmonic sparkle for card match
                [1046.5, 1318.5, 1567.98].forEach((freq, i) => { // C6, E6, G6
                    const o = ctx.createOscillator();
                    const g = ctx.createGain();
                    o.type = 'sine';
                    o.frequency.setValueAtTime(freq, t + i * 0.06);
                    g.gain.setValueAtTime(0.25, t + i * 0.06);
                    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.45);
                    o.connect(g);
                    g.connect(ctx.destination);
                    o.start(t + i * 0.06);
                    o.stop(t + i * 0.06 + 0.45);
                });
                return;
            }

            case 'win': {
                // Triumphant victory fanfare
                const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
                notes.forEach((freq, i) => {
                    const o = ctx.createOscillator();
                    const g = ctx.createGain();
                    o.type = 'triangle';
                    o.frequency.setValueAtTime(freq, t + i * 0.1);
                    g.gain.setValueAtTime(0.35, t + i * 0.1);
                    g.gain.linearRampToValueAtTime(0, t + i * 0.1 + 0.5);
                    o.connect(g);
                    g.connect(ctx.destination);
                    o.start(t + i * 0.1);
                    o.stop(t + i * 0.1 + 0.5);
                });
                return;
            }

            case 'lose': {
                // Descending loss cadence
                const notes = [392.0, 349.23, 311.13, 261.63]; // G4, F4, Eb4, C4
                notes.forEach((freq, i) => {
                    const o = ctx.createOscillator();
                    const g = ctx.createGain();
                    o.type = 'sawtooth';
                    o.frequency.setValueAtTime(freq, t + i * 0.14);
                    g.gain.setValueAtTime(0.25, t + i * 0.14);
                    g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.14 + 0.4);
                    o.connect(g);
                    g.connect(ctx.destination);
                    o.start(t + i * 0.14);
                    o.stop(t + i * 0.14 + 0.4);
                });
                return;
            }

            case 'ding': {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, t);
                gain.gain.setValueAtTime(0.3, t);
                gain.gain.exponentialRampToValueAtTime(0.005, t + 0.35);
                osc.start(t);
                osc.stop(t + 0.35);
                break;
            }

            case 'stopwatch_start': {
                osc.type = 'square';
                osc.frequency.setValueAtTime(800, t);
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
                osc.start(t);
                osc.stop(t + 0.1);
                break;
            }

            case 'stopwatch_stop': {
                // Double blip
                osc.type = 'square';
                osc.frequency.setValueAtTime(800, t);
                osc.frequency.setValueAtTime(0, t + 0.05); // gap
                osc.frequency.setValueAtTime(1000, t + 0.1);
                
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.setValueAtTime(0, t + 0.05);
                gain.gain.setValueAtTime(0.1, t + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
                
                osc.start(t);
                osc.stop(t + 0.2);
                break;
            }

            case 'type': {
                // Short, low-volume click for typing
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(500 + Math.random() * 200, t);
                gain.gain.setValueAtTime(0.05, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
                osc.start(t);
                osc.stop(t + 0.04);
                break;
            }

            default:
                break;
        }
    } catch (e) {
        console.warn('Audio Engine error:', e);
    }
}

/**
 * Triggers device vibration if supported by the browser.
 * @param {number|number[]} pattern - duration in ms, or array of durations [vibrate, pause, vibrate]
 */
export function playHaptic(pattern = 50) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
            navigator.vibrate(pattern);
        } catch (e) {
            console.warn('Haptic feedback error:', e);
        }
    }
}
