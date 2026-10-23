import React, { useState, useRef, useEffect } from 'react';
import Logo from '../../components/Logo';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import PlayerGameHeader from '../../components/PlayerGameHeader';
import ConnectionPauseOverlay from '../../components/ConnectionPauseOverlay';
import EmotesOverlay from '../../components/EmotesOverlay';
import { playSound, playHaptic } from '../../lib/audioEngine';
import useProfile from '../../hooks/useProfile';
import { triggerVictoryEffects, triggerDefeatEffects, triggerDrawEffects } from '../../lib/effectsEngine';
import { GameIcon } from '../../components/icons/GameIcons';
import './BrickBreakerGame.css';

// --- Constants & Physics ---
const GAME_WIDTH = 300;
const GAME_HEIGHT = 500;
const PADDLE_WIDTH = 104;
const PADDLE_HEIGHT = 10;
const BALL_R = 7;
const P1_Y = 480;
const P2_Y = 20;

const BRICK_COLS = 8;
const BRICK_ROWS = 6;
const BRICK_W = 32;
const BRICK_H = 12;
const BRICK_PADDING = 4;
const BRICKS_OFFSET_Y = 200; // Center area
const BRICKS_OFFSET_X = (GAME_WIDTH - (BRICK_COLS * (BRICK_W + BRICK_PADDING))) / 2 + (BRICK_PADDING / 2);

const MATCH_SECONDS = 120;
const WAITING_FOR_SERVE = Number.MAX_SAFE_INTEGER;
const TICK_RATE = 1000 / 60; // 60fps
const POWER_UPS = [
    { type: 'multiball', emoji: '⚾', label: 'كرات إضافية' },
    { type: 'paddle', emoji: '↔️', label: 'منصة أطول' },
    { type: 'laser', emoji: '🔦', label: 'ليزر' },
    { type: 'sticky', emoji: '🧲', label: 'كرة لاصقة' },
];
const DROP_CHANCE = 0.18;
const FORMATION_NAMES = ['حائط', 'ممرات', 'متعرج', 'أركان'];

function formatClock(seconds) {
    const safeSeconds = Math.max(0, Number(seconds) || 0);
    return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

function generateBricks(wave = 1) {
    const bricks = [];
    const colors = ['#f43f5e', '#a855f7', '#3b82f6', '#10b981', '#f59e0b'];
    const rows = Math.min(BRICK_ROWS + Math.floor((wave - 1) / 3), 8);
    const reinforcedLayers = wave >= 4 ? 2 : wave >= 2 ? 1 : 0;
    const formation = (wave - 1) % 4;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
            const gate = (r * 2 + wave) % BRICK_COLS;
            const isCorner = (r < 2 || r >= rows - 2) && (c < 2 || c >= BRICK_COLS - 2);
            const isCell = formation === 1
                ? c !== gate
                : formation === 2
                    ? (r + c + wave) % 2 === 0 || c === 3 || c === 4
                    : formation === 3
                        ? !isCorner || (r + c) % 2 === 0
                        : true;
            if (!isCell) continue;

            const isBonus = wave >= 2 && (r * BRICK_COLS + c + wave) % 17 === 0;
            const isExplosive = wave >= 2 && !isBonus && (r * 7 + c * 3 + wave) % 23 === 0;
            const reinforced = !isBonus && !isExplosive && reinforcedLayers > 0 && (r < reinforcedLayers || r >= rows - reinforcedLayers);
            bricks.push({
                id: `w${wave}-r${r}c${c}`,
                row: r,
                col: c,
                x: BRICKS_OFFSET_X + c * (BRICK_W + BRICK_PADDING),
                y: BRICKS_OFFSET_Y + r * (BRICK_H + BRICK_PADDING),
                active: true,
                hp: reinforced ? 2 : 1,
                type: isBonus ? 'bonus' : isExplosive ? 'explosive' : reinforced ? 'reinforced' : 'normal',
                color: isBonus ? '#f472b6' : isExplosive ? '#fb923c' : reinforced ? '#f59e0b' : colors[r % colors.length]
            });
        }
    }
    return bricks;
}

function predictLandingX(ball, targetY) {
    if (!ball || !Number.isFinite(ball.vx) || !Number.isFinite(ball.vy) || ball.vy === 0) return ball?.x || GAME_WIDTH / 2;
    const frames = (targetY - ball.y) / ball.vy;
    if (frames <= 0) return ball.x;
    const minX = BALL_R;
    const span = GAME_WIDTH - BALL_R * 2;
    const period = span * 2;
    const folded = ((ball.x - minX + ball.vx * frames) % period + period) % period;
    return minX + (folded <= span ? folded : period - folded);
}

function resolveBrickCollision(ball, brick) {
    const centerX = brick.x + BRICK_W / 2;
    const centerY = brick.y + BRICK_H / 2;
    const previousX = ball.x - ball.vx;
    const previousY = ball.y - ball.vy;
    const overlapX = BALL_R + BRICK_W / 2 - Math.abs(ball.x - centerX);
    const overlapY = BALL_R + BRICK_H / 2 - Math.abs(ball.y - centerY);
    const crossedVerticalFace = previousY + BALL_R <= brick.y || previousY - BALL_R >= brick.y + BRICK_H;
    const crossedHorizontalFace = previousX + BALL_R <= brick.x || previousX - BALL_R >= brick.x + BRICK_W;
    const hitVerticalFace = crossedVerticalFace
        ? !crossedHorizontalFace || overlapY <= overlapX
        : !crossedHorizontalFace && overlapY <= overlapX;

    if (hitVerticalFace) {
        const fromTop = previousY <= centerY;
        ball.y = fromTop ? brick.y - BALL_R : brick.y + BRICK_H + BALL_R;
        if ((fromTop && ball.vy > 0) || (!fromTop && ball.vy < 0)) ball.vy *= -1;
    } else {
        const fromLeft = previousX <= centerX;
        ball.x = fromLeft ? brick.x - BALL_R : brick.x + BRICK_W + BALL_R;
        if ((fromLeft && ball.vx > 0) || (!fromLeft && ball.vx < 0)) ball.vx *= -1;
    }
}

function getAIPaddleTarget(ball, bricks, paddleWidth) {
    const paddleY = P2_Y + PADDLE_HEIGHT + BALL_R;
    const interceptX = predictLandingX(ball, paddleY);
    if (ball.stuckTo || ball.vy >= 0) return interceptX;

    let targetBrick = null;
    let targetPriority = Infinity;
    let targetDistance = Infinity;
    const columnCounts = Array(BRICK_COLS).fill(0);

    for (const brick of bricks) {
        if (!brick.active) continue;
        columnCounts[brick.col] += 1;
        const priority = brick.type === 'explosive' ? 0 : brick.type === 'bonus' ? 1 : Infinity;
        const distance = Math.abs(brick.x + BRICK_W / 2 - interceptX) + brick.row * 0.4;
        if (priority < targetPriority || (priority === targetPriority && distance < targetDistance)) {
            targetBrick = brick;
            targetPriority = priority;
            targetDistance = distance;
        }
    }

    if (!targetBrick) {
        let bestColumn = 0;
        for (let col = 1; col < BRICK_COLS; col++) {
            if (columnCounts[col] > columnCounts[bestColumn]) bestColumn = col;
        }
        targetBrick = bricks.find(brick => brick.active && brick.col === bestColumn);
    }
    if (!targetBrick) return interceptX;

    const targetY = targetBrick.y + BRICK_H / 2;
    const travelFrames = Math.max(1, (targetY - paddleY) / Math.max(2.8, Math.abs(ball.vy)));
    const desiredVx = Math.max(-2.1, Math.min(2.1, (targetBrick.x + BRICK_W / 2 - interceptX) / travelFrames));
    const desiredContactOffset = (desiredVx / 3) * (paddleWidth / 2);
    return Math.max(paddleWidth / 2, Math.min(GAME_WIDTH - paddleWidth / 2, interceptX - desiredContactOffset));
}

export default function BrickBreakerGame({ setView }) {
    const connRef = useRef(null);
    const isHostRef = useRef(false);
    const isAIRef = useRef(false);
    const hasStartedRef = useRef(false);
    const [myProfile, , awardMatchResult] = useProfile({ gameId: 'brick-breaker', gameTitle: 'كاسر الطوب' });
    const [oppProfile, setOppProfile] = useState(null);

    // React State
    const [gameState, setGameState] = useState('lobby'); // lobby, playing, game_over
    const gameStateRef = useRef('lobby');
    const setGameStateSafe = (s) => { gameStateRef.current = s; setGameState(s); };
    const [myScore, setMyScore] = useState(0);
    const [oppScore, setOppScore] = useState(0);
    const [myCombo, setMyCombo] = useState(0);
    const [oppCombo, setOppCombo] = useState(0);
    const [timeLeft, setTimeLeft] = useState(MATCH_SECONDS);
    const [wave, setWave] = useState(1);
    const matchDeadlineRef = useRef(0);
    
    const [ball, setBall] = useState({ x: 150, y: 250, vx: 0, vy: 0 });
    const [opponentBall, setOpponentBall] = useState({ x: 150, y: 250, vx: 0, vy: 0 });
    const [p1X, setP1X] = useState(150); // Center
    const [p2X, setP2X] = useState(150);
    const guestPaddleXRef = useRef(150);
    const [bricks, setBricks] = useState([]);
    const [extraBalls, setExtraBalls] = useState([]);
    const [powerDrops, setPowerDrops] = useState([]);
    const [powerEffects, setPowerEffects] = useState({ p1: {}, p2: {} });
    const [laserBeams, setLaserBeams] = useState([]);
    const [powerNotice, setPowerNotice] = useState('');
    
    // Physics State (Host Only)
    const stateRef = useRef({
        ball: { x: 150, y: 250, vx: 0, vy: 0 },
        p2Ball: { x: 150, y: 250, vx: 0, vy: 0 },
        p1X: 150,
        p2X: 150,
        bricks: [],
        extraBalls: [],
        powerDrops: [],
        p1WideUntil: 0,
        p2WideUntil: 0,
        p1LaserUntil: 0,
        p2LaserUntil: 0,
        p1StickyUntil: 0,
        p2StickyUntil: 0,
        p1LaserReadyAt: 0,
        p2LaserReadyAt: 0,
        laserBeams: [],
        lastTouch: 'p1',
        myScore: 0,
        oppScore: 0,
        p1Combo: 0,
        p2Combo: 0,
        timeLeft: MATCH_SECONDS,
        wave: 1
    });
    
    const gameLoopRef = useRef(null);
    const syncLoopRef = useRef(null);
    const connectionPausedAtRef = useRef(null);
    const lastConnectionSaveAtRef = useRef(0);
    const containerRef = useRef(null);
    const lastRenderAtRef = useRef(0);
    const lastPaddleSyncAtRef = useRef(0);
    const pendingPaddleXRef = useRef(null);
    const paddleSyncTimerRef = useRef(null);
    const aiBallWatchRef = useRef({ x: 150, y: 250, lastMovedAt: 0 });

    // --- Host Game Loop ---

    const resetBall = (serveTo, waitForPlayerStart = false) => {
        const s = stateRef.current;
        const paddleX = serveTo === 'p1' ? s.p1X : s.p2X;
        const newBall = {
            x: paddleX,
            y: serveTo === 'p1' ? P1_Y - 16 : P2_Y + PADDLE_HEIGHT + 16,
            vx: 0,
            vy: 0,
            stuckTo: serveTo,
            stuckUntil: waitForPlayerStart ? WAITING_FOR_SERVE : serveTo === 'p2' && isAIRef.current ? Date.now() + 350 : WAITING_FOR_SERVE,
            stuckStartX: paddleX
        };
        if (serveTo === 'p1') {
            s.ball = newBall;
            setBall({ ...newBall });
        } else {
            s.p2Ball = newBall;
            setOpponentBall({ ...newBall });
        }
        s.lastTouch = serveTo;
    };

    const awardPoints = (player, points) => {
        if (player === 'p1') {
            stateRef.current.myScore += points;
            setMyScore(stateRef.current.myScore);
        } else {
            stateRef.current.oppScore += points;
            setOppScore(stateRef.current.oppScore);
        }
    };

    const damageBrick = (brick, owner, chainDepth = 0) => {
        if (!brick?.active) return false;
        brick.hp = Math.max(0, (brick.hp || 1) - 1);
        if (brick.hp > 0) {
            brick.color = '#fb923c';
            return false;
        }

        brick.active = false;
        const s = stateRef.current;
        const comboKey = owner === 'p1' ? 'p1Combo' : 'p2Combo';
        s[comboKey] += 1;
        const multiplier = Math.min(4, 1 + Math.floor((s[comboKey] - 1) / 3));
        if (owner === 'p1') setMyCombo(s.p1Combo);
        else setOppCombo(s.p2Combo);
        awardPoints(owner, (brick.type === 'bonus' ? 25 : 10) * multiplier);

        // Keep chain reactions bounded, with inactive blocks preventing repeats.
        if (brick.type === 'explosive' && chainDepth < 2) {
            for (const neighbor of s.bricks) {
                if (neighbor.active && Math.abs(neighbor.row - brick.row) <= 1 && Math.abs(neighbor.col - brick.col) <= 1) {
                    damageBrick(neighbor, owner, chainDepth + 1);
                }
            }
        }

        if (Math.random() < DROP_CHANCE && stateRef.current.powerDrops.length < 3) {
            const power = POWER_UPS[Math.floor(Math.random() * POWER_UPS.length)];
            stateRef.current.powerDrops.push({
                id: `${brick.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                x: brick.x + BRICK_W / 2,
                y: brick.y + BRICK_H / 2,
                toward: owner,
                ...power,
            });
        }
        return true;
    };

    const hostTick = () => {
        if (gameStateRef.current !== 'playing') return;
        const s = stateRef.current;
        const b = s.ball;
        const now = Date.now();
        s.laserBeams = s.laserBeams.filter(beam => beam.expiresAt > now);

        if (b.stuckTo) {
            const stuckPlayer = b.stuckTo;
            const paddleX = stuckPlayer === 'p1' ? s.p1X : s.p2X;
            b.x = paddleX;
            b.y = stuckPlayer === 'p1' ? P1_Y - BALL_R - 1 : P2_Y + PADDLE_HEIGHT + BALL_R + 1;
            if (now < b.stuckUntil) {
                // Keep the serve still, but continue simulating the opponent's ball.
                b.vx = 0;
                b.vy = 0;
            } else {
                const aim = Math.max(-3, Math.min(3, (paddleX - b.stuckStartX) * 0.12));
                b.vx = aim || (Math.random() > 0.5 ? 1 : -1);
                b.vy = stuckPlayer === 'p1' ? -2.8 : 2.8;
                b.stuckTo = null;
                b.stuckUntil = 0;
                s.lastTouch = stuckPlayer;
            }
        }

        const p1Width = now < s.p1WideUntil ? Math.min(PADDLE_WIDTH * 1.55, GAME_WIDTH * 0.82) : PADDLE_WIDTH;
        const p2Width = now < s.p2WideUntil ? Math.min(PADDLE_WIDTH * 1.55, GAME_WIDTH * 0.82) : PADDLE_WIDTH;

        // AI Logic for P2
        if (isAIRef.current) {
            if (!Number.isFinite(s.p2X)) s.p2X = GAME_WIDTH / 2;
            const targetX = getAIPaddleTarget(s.p2Ball, s.bricks, p2Width);
            const diff = targetX - s.p2X;
            const maxSpeed = 2.75 + Math.min(1.7, (s.wave - 1) * 0.18) + (s.oppScore < s.myScore ? 0.2 : 0);
            if (Math.abs(diff) > maxSpeed) {
                s.p2X += Math.sign(diff) * maxSpeed;
            } else {
                s.p2X = targetX;
            }
            // Clamp
            if (s.p2X < p2Width / 2) s.p2X = p2Width / 2;
            if (s.p2X > GAME_WIDTH - p2Width / 2) s.p2X = GAME_WIDTH - p2Width / 2;
        }

        // Move Ball
        b.x += b.vx;
        b.y += b.vy;

        let soundToPlay = null;

        // Wall collisions (Left/Right)
        if (b.x - BALL_R <= 0) {
            b.x = BALL_R;
            b.vx = Math.abs(b.vx);
            soundToPlay = 'tap';
        } else if (b.x + BALL_R >= GAME_WIDTH) {
            b.x = GAME_WIDTH - BALL_R;
            b.vx = -Math.abs(b.vx);
            soundToPlay = 'tap';
        }

        // Paddle 1 Collision (Bottom)
        if (
            b.vy > 0 &&
            b.y + BALL_R >= P1_Y &&
            b.y - BALL_R <= P1_Y + PADDLE_HEIGHT &&
            b.x >= s.p1X - p1Width / 2 &&
            b.x <= s.p1X + p1Width / 2
        ) {
            b.y = P1_Y - BALL_R;
            s.lastTouch = 'p1';
            if (s.p1StickyUntil > now) {
                b.stuckTo = 'p1';
                b.stuckUntil = now + 900;
                b.stuckStartX = s.p1X;
                b.vx = 0;
                b.vy = 0;
                s.p1StickyUntil = 0;
            } else {
                b.vy = -Math.max(2.8, Math.abs(b.vy) * 1.01);
                const hitPoint = (b.x - s.p1X) / (p1Width / 2);
                b.vx = hitPoint * 3;
                if (b.vy < -5) b.vy = -5;
            }
            soundToPlay = 'pop';
        }

        // The opponent's paddle belongs to its own ball. This ball bounces off
        // the far top wall instead of being shared between both players.
        if (b.vy < 0 && b.y - BALL_R <= P2_Y + PADDLE_HEIGHT) {
            b.y = P2_Y + PADDLE_HEIGHT + BALL_R;
            b.vy = Math.abs(b.vy);
            soundToPlay = 'tap';
        }

        // Brick Collisions
        let brickHit = false;
        let activeCount = 0;
        for (let i = 0; i < s.bricks.length; i++) {
            const br = s.bricks[i];
            if (!br.active) continue;
            activeCount++;
            
            // Simple AABB check
            if (
                b.x + BALL_R > br.x &&
                b.x - BALL_R < br.x + BRICK_W &&
                b.y + BALL_R > br.y &&
                b.y - BALL_R < br.y + BRICK_H
            ) {
                brickHit = true;
                
                resolveBrickCollision(b, br);
                
                damageBrick(br, 'p1');
                break; // Only hit one brick per frame
            }
        }

        if (brickHit) soundToPlay = 'tap';

        // All bricks cleared?
        if (activeCount === 0 && !brickHit) {
            s.wave += 1;
            setWave(s.wave);
            s.bricks = generateBricks(s.wave);
            resetBall('p1');
            resetBall('p2');
        }

        // Out of Bounds (Scoring)
        if (b.y > GAME_HEIGHT + 20) {
            // Passed P1, so P2 scores
            s.oppScore += 5;
            setOppScore(s.oppScore);
            s.p1Combo = 0;
            setMyCombo(0);
            playSound('error');
            resetBall('p1');
        }

        // Opponent owns a separate ball, so the AI/friend can play the rally too.
        const p2b = s.p2Ball;
        let moveP2Ball = true;
        if (p2b.stuckTo) {
            p2b.x = s.p2X;
            p2b.y = P2_Y + PADDLE_HEIGHT + BALL_R + 1;
            if (isAIRef.current && p2b.stuckUntil === WAITING_FOR_SERVE) p2b.stuckUntil = now + 350;
            if (now < p2b.stuckUntil) {
                moveP2Ball = false;
            } else {
                const aim = Math.max(-3, Math.min(3, (s.p2X - p2b.stuckStartX) * 0.12));
                p2b.vx = aim || (Math.random() > 0.5 ? 1 : -1);
                p2b.vy = 2.8;
                p2b.stuckTo = null;
                p2b.stuckUntil = 0;
                s.lastTouch = 'p2';
            }
        }

        if (moveP2Ball) {
            p2b.x += p2b.vx;
            p2b.y += p2b.vy;

            if (p2b.x - BALL_R <= 0) {
                p2b.x = BALL_R;
                p2b.vx = Math.abs(p2b.vx);
            } else if (p2b.x + BALL_R >= GAME_WIDTH) {
                p2b.x = GAME_WIDTH - BALL_R;
                p2b.vx = -Math.abs(p2b.vx);
            }

            // The AI's own paddle returns its ball toward the shared brick field.
            if (
                p2b.vy < 0 &&
                p2b.y - BALL_R <= P2_Y + PADDLE_HEIGHT &&
                p2b.y + BALL_R >= P2_Y &&
                p2b.x >= s.p2X - p2Width / 2 &&
                p2b.x <= s.p2X + p2Width / 2
            ) {
                p2b.y = P2_Y + PADDLE_HEIGHT + BALL_R;
                s.lastTouch = 'p2';
                if (s.p2StickyUntil > now) {
                    p2b.stuckTo = 'p2';
                    p2b.stuckUntil = now + (isAIRef.current ? 320 : 900);
                    p2b.stuckStartX = s.p2X;
                    p2b.vx = 0;
                    p2b.vy = 0;
                    s.p2StickyUntil = 0;
                } else {
                    p2b.vy = Math.max(2.8, Math.abs(p2b.vy) * 1.01);
                    p2b.vx = ((p2b.x - s.p2X) / (p2Width / 2)) * 3;
                    p2b.vy = Math.min(p2b.vy, 5);
                }
                soundToPlay = 'pop';
            } else if (p2b.vy > 0 && p2b.y + BALL_R >= P1_Y) {
                // Closed far wall for the opponent's rally; only its own paddle can miss.
                p2b.y = P1_Y - BALL_R;
                p2b.vy = -Math.abs(p2b.vy);
            }

            for (const br of s.bricks) {
                if (!br.active) continue;
                if (
                    p2b.x + BALL_R > br.x &&
                    p2b.x - BALL_R < br.x + BRICK_W &&
                    p2b.y + BALL_R > br.y &&
                    p2b.y - BALL_R < br.y + BRICK_H
                ) {
                    resolveBrickCollision(p2b, br);
                    s.lastTouch = 'p2';
                    damageBrick(br, 'p2');
                    soundToPlay = 'tap';
                    break;
                }
            }

            if (p2b.y < -20) {
                s.myScore += 5;
                setMyScore(s.myScore);
                s.p2Combo = 0;
                setOppCombo(0);
                playSound('success');
                resetBall('p2');
            }
        }

        if (isAIRef.current) {
            const aiBall = s.p2Ball;
            const watch = aiBallWatchRef.current;
            const validBall = Number.isFinite(aiBall.x) && Number.isFinite(aiBall.y)
                && Number.isFinite(aiBall.vx) && Number.isFinite(aiBall.vy);
            if (!validBall) {
                resetBall('p2');
                aiBallWatchRef.current = { x: s.p2Ball.x, y: s.p2Ball.y, lastMovedAt: now };
            } else if (aiBall.stuckTo) {
                aiBallWatchRef.current = { x: aiBall.x, y: aiBall.y, lastMovedAt: now };
            } else if (Math.abs(aiBall.x - watch.x) + Math.abs(aiBall.y - watch.y) >= 0.25) {
                aiBallWatchRef.current = { x: aiBall.x, y: aiBall.y, lastMovedAt: now };
            } else if (now - watch.lastMovedAt > 1100) {
                resetBall('p2');
                aiBallWatchRef.current = { x: s.p2Ball.x, y: s.p2Ball.y, lastMovedAt: now };
            }
        }

        // Falling rewards travel toward the player whose shot broke the brick.
        const remainingDrops = [];
        for (const drop of s.powerDrops) {
            const direction = drop.toward === 'p1' ? 1 : -1;
            drop.y += direction * 1.7;
            const reachedPaddle = drop.toward === 'p1'
                ? drop.y >= P1_Y - 12
                : drop.y <= P2_Y + PADDLE_HEIGHT + 12;
            const paddleX = drop.toward === 'p1' ? s.p1X : s.p2X;
            const paddleWidth = drop.toward === 'p1' ? p1Width : p2Width;
            if (reachedPaddle && Math.abs(drop.x - paddleX) <= paddleWidth / 2 + 8) {
                const owner = drop.toward;
                if (drop.type === 'multiball') {
                    const ownerBall = owner === 'p1' ? s.ball : s.p2Ball;
                    const baseVx = ownerBall.vx || 1;
                    const baseVy = ownerBall.vy || (owner === 'p1' ? -2 : 2);
                    const spawnedBalls = [
                        { x: ownerBall.x, y: ownerBall.y, vx: baseVx - 1.15, vy: baseVy, lastTouch: owner },
                        { x: ownerBall.x, y: ownerBall.y, vx: baseVx + 1.15, vy: baseVy, lastTouch: owner }
                    ].slice(0, Math.max(0, 4 - s.extraBalls.length));
                    s.extraBalls.push(...spawnedBalls);
                } else if (drop.type === 'paddle') {
                    s[`${owner}WideUntil`] = now + 8000;
                } else if (drop.type === 'laser') {
                    s[`${owner}LaserUntil`] = now + 6500;
                    s[`${owner}LaserReadyAt`] = now;
                } else if (drop.type === 'sticky') {
                    s[`${owner}StickyUntil`] = now + 8000;
                }
                const localPlayer = isHostRef.current ? 'p1' : 'p2';
                const notice = `${owner === localPlayer ? 'أنت' : 'الخصم'} أخذ ${drop.label}`;
                setPowerNotice(notice);
                setTimeout(() => setPowerNotice(''), 2400);
                connRef.current?.send({ type: 'powerup_caught', owner, powerType: drop.type, label: drop.label });
                playHaptic(30);
                playSound('success');
                continue;
            }
            if (drop.y > -16 && drop.y < GAME_HEIGHT + 16) remainingDrops.push(drop);
        }
        s.powerDrops = remainingDrops;

        // Additional balls use the same walls, paddles, and bricks as the main ball.
        const liveExtraBalls = [];
        for (const extra of s.extraBalls) {
            extra.x += extra.vx;
            extra.y += extra.vy;
            if (extra.x - BALL_R <= 0) { extra.x = BALL_R; extra.vx = Math.abs(extra.vx); }
            else if (extra.x + BALL_R >= GAME_WIDTH) { extra.x = GAME_WIDTH - BALL_R; extra.vx = -Math.abs(extra.vx); }

            if (extra.vy > 0 && extra.y + BALL_R >= P1_Y && extra.x >= s.p1X - p1Width / 2 && extra.x <= s.p1X + p1Width / 2) {
                extra.y = P1_Y - BALL_R;
                extra.vy = -Math.max(2, Math.abs(extra.vy));
                extra.vx = ((extra.x - s.p1X) / (p1Width / 2)) * 3;
                extra.lastTouch = 'p1';
            } else if (extra.vy < 0 && extra.y - BALL_R <= P2_Y + PADDLE_HEIGHT && extra.x >= s.p2X - p2Width / 2 && extra.x <= s.p2X + p2Width / 2) {
                extra.y = P2_Y + PADDLE_HEIGHT + BALL_R;
                extra.vy = Math.max(2, Math.abs(extra.vy));
                extra.vx = ((extra.x - s.p2X) / (p2Width / 2)) * 3;
                extra.lastTouch = 'p2';
            }

            for (const br of s.bricks) {
                if (!br.active) continue;
                if (extra.x + BALL_R > br.x && extra.x - BALL_R < br.x + BRICK_W && extra.y + BALL_R > br.y && extra.y - BALL_R < br.y + BRICK_H) {
                    resolveBrickCollision(extra, br);
                    damageBrick(br, extra.lastTouch || s.lastTouch);
                    break;
                }
            }
            if (extra.y > -18 && extra.y < GAME_HEIGHT + 18) liveExtraBalls.push(extra);
        }
        s.extraBalls = liveExtraBalls;

        // The laser automatically clears a brick in front of its owner's paddle every 350ms.
        for (const owner of ['p1', 'p2']) {
            if (now >= s[`${owner}LaserUntil`] || now < s[`${owner}LaserReadyAt`]) continue;
            const x = s[`${owner}X`];
            const target = s.bricks
                .filter(br => br.active && Math.abs(br.x + BRICK_W / 2 - x) <= 7 && (owner === 'p1' ? br.y < P1_Y : br.y + BRICK_H > P2_Y))
                .sort((a, b) => owner === 'p1' ? b.y - a.y : a.y - b.y)[0];
            s[`${owner}LaserReadyAt`] = now + 350;
            if (!target) continue;
            damageBrick(target, owner);
            s.laserBeams.push({
                id: `${owner}-${now}`,
                x,
                yStart: owner === 'p1' ? P1_Y : P2_Y + PADDLE_HEIGHT,
                yEnd: target.y + BRICK_H / 2,
                expiresAt: now + 140,
            });
        }

        if (soundToPlay) playSound(soundToPlay);

        const secondsRemaining = matchDeadlineRef.current
            ? Math.max(0, Math.ceil((matchDeadlineRef.current - now) / 1000))
            : MATCH_SECONDS;
        if (secondsRemaining !== s.timeLeft) {
            s.timeLeft = secondsRemaining;
            setTimeLeft(secondsRemaining);
        }

        // The match ends on the visible clock, so neither player can win unexpectedly on one brick.
        if (secondsRemaining <= 0) {
            endGame(s.myScore, s.oppScore);
            return;
        }

        // Keep simulation at 60 Hz, but limit React/Firebase paint traffic to 30 Hz.
        if (now - lastRenderAtRef.current < 1000 / 30) return;
        lastRenderAtRef.current = now;

        // Sync local visual state for host (network loop uses the same 30 Hz cadence).
        setBall({ ...s.ball });
        setOpponentBall({ ...s.p2Ball });
        setP2X(s.p2X);
        setBricks([...s.bricks]);
        setExtraBalls([...s.extraBalls]);
        setPowerDrops([...s.powerDrops]);
        setLaserBeams([...s.laserBeams]);
        setPowerEffects({
            p1: { paddle: now < s.p1WideUntil, laser: now < s.p1LaserUntil, sticky: now < s.p1StickyUntil },
            p2: { paddle: now < s.p2WideUntil, laser: now < s.p2LaserUntil, sticky: now < s.p2StickyUntil },
        });
    };

    const endGame = (hScore, gScore) => {
        setGameStateSafe('game_over');
        clearInterval(gameLoopRef.current);
        clearInterval(syncLoopRef.current);
        
        connRef.current?.send({
            type: 'game_over',
            finalHostScore: hScore,
            finalGuestScore: gScore,
            finalWave: stateRef.current.wave
        });

        if (hScore === gScore) {
            triggerDrawEffects();
            awardMatchResult('draw', 10);
        } else if (hScore > gScore) {
            triggerVictoryEffects();
            awardMatchResult('win', 30);
        } else {
            triggerDefeatEffects();
            awardMatchResult('loss', 5);
        }
    };

    // Broadcast state from host to guest
    const syncState = () => {
        if (gameStateRef.current !== 'playing') return;
        const now = Date.now();
        connRef.current?.send({
            type: 'state_sync',
            ball: stateRef.current.ball,
            p2Ball: stateRef.current.p2Ball,
            p1X: stateRef.current.p1X,
            p2X: stateRef.current.p2X, // Also send P2 back in case of slight desync
            bricks: stateRef.current.bricks,
            wave: stateRef.current.wave,
            timeLeft: stateRef.current.timeLeft,
            extraBalls: stateRef.current.extraBalls,
            powerDrops: stateRef.current.powerDrops,
            powerEffects: {
                p1: { paddle: Date.now() < stateRef.current.p1WideUntil, laser: Date.now() < stateRef.current.p1LaserUntil, sticky: Date.now() < stateRef.current.p1StickyUntil },
                p2: { paddle: Date.now() < stateRef.current.p2WideUntil, laser: Date.now() < stateRef.current.p2LaserUntil, sticky: Date.now() < stateRef.current.p2StickyUntil },
            },
            laserBeams: stateRef.current.laserBeams,
            myScore: stateRef.current.myScore, // Host's score
            oppScore: stateRef.current.oppScore,
            p1Combo: stateRef.current.p1Combo,
            p2Combo: stateRef.current.p2Combo
        });
        if (now - lastConnectionSaveAtRef.current >= 1000) {
            lastConnectionSaveAtRef.current = now;
            connRef.current?.saveState?.({
                connectionGame: 'brick-breaker',
                gameState: gameStateRef.current,
                hostScore: stateRef.current.myScore,
                guestScore: stateRef.current.oppScore,
                matchDeadline: matchDeadlineRef.current,
                state: { ...stateRef.current },
                savedAt: now
            });
        }
    };

    // --- Input Handling ---

    const flushGuestPaddleSync = () => {
        paddleSyncTimerRef.current = null;
        const x = pendingPaddleXRef.current;
        if (!Number.isFinite(x) || isHostRef.current || gameStateRef.current !== 'playing') return;
        lastPaddleSyncAtRef.current = performance.now();
        connRef.current?.send({ type: 'paddle_sync', x });
    };

    const queueGuestPaddleSync = (x) => {
        pendingPaddleXRef.current = x;
        const wait = 40 - (performance.now() - lastPaddleSyncAtRef.current);
        if (wait <= 0) {
            if (paddleSyncTimerRef.current) clearTimeout(paddleSyncTimerRef.current);
            flushGuestPaddleSync();
        } else if (!paddleSyncTimerRef.current) {
            paddleSyncTimerRef.current = setTimeout(flushGuestPaddleSync, wait);
        }
    };

    const handlePointerMove = (e) => {
        if (gameState !== 'playing' || !containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        // Calculate X relative to the game container
        let clientX = e.touches ? e.touches[0].clientX : e.clientX;
        let x = clientX - rect.left;
        
        // Scale to logical GAME_WIDTH
        let logicalX = (x / rect.width) * GAME_WIDTH;
        
        // Clamp
        const p1Width = Date.now() < stateRef.current.p1WideUntil ? Math.min(PADDLE_WIDTH * 1.55, GAME_WIDTH * 0.82) : PADDLE_WIDTH;
        const p2Width = Date.now() < stateRef.current.p2WideUntil ? Math.min(PADDLE_WIDTH * 1.55, GAME_WIDTH * 0.82) : PADDLE_WIDTH;
        const paddleWidth = isHostRef.current ? p1Width : p2Width;
        if (logicalX < paddleWidth / 2) logicalX = paddleWidth / 2;
        if (logicalX > GAME_WIDTH - paddleWidth / 2) logicalX = GAME_WIDTH - paddleWidth / 2;

        if (isHostRef.current) {
            stateRef.current.p1X = logicalX;
            setP1X(logicalX);
        } else {
            const worldX = GAME_WIDTH - logicalX;
            // Guest sends paddle position
            guestPaddleXRef.current = worldX;
            setP2X(worldX); // the guest view is rotated, so map back to game coordinates
            queueGuestPaddleSync(worldX);
        }
    };

    const handleBoardPointerDown = (e) => {
        handlePointerMove(e);
        if (gameStateRef.current !== 'playing') return;
        if (isHostRef.current) {
            const now = Date.now();
            const ownBall = stateRef.current.ball;
            if (ownBall.stuckTo === 'p1') {
                if (!matchDeadlineRef.current) matchDeadlineRef.current = now + MATCH_SECONDS * 1000;
                ownBall.stuckUntil = now + 90;
            }
            const aiBall = stateRef.current.p2Ball;
            if (isAIRef.current && aiBall.stuckTo === 'p2' && aiBall.stuckUntil === WAITING_FOR_SERVE) {
                aiBall.stuckUntil = now + 700;
            }
        } else {
            connRef.current?.send({ type: 'launch_ball' });
        }
    };

    // Keyboard fallback for desktop
    useEffect(() => {
        if (gameState !== 'playing') return;
        const speed = 25;
        const handleKeyDown = (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (isHostRef.current) {
                    const now = Date.now();
                    const ownBall = stateRef.current.ball;
                    if (ownBall.stuckTo === 'p1') {
                        if (!matchDeadlineRef.current) matchDeadlineRef.current = now + MATCH_SECONDS * 1000;
                        ownBall.stuckUntil = now + 90;
                    }
                    const aiBall = stateRef.current.p2Ball;
                    if (isAIRef.current && aiBall.stuckTo === 'p2' && aiBall.stuckUntil === WAITING_FOR_SERVE) {
                        aiBall.stuckUntil = now + 700;
                    }
                } else {
                    connRef.current?.send({ type: 'launch_ball' });
                }
                return;
            }
            let targetX = null;
            if (isHostRef.current) {
                if (e.key === 'ArrowLeft' || e.key === 'a') targetX = Math.max(PADDLE_WIDTH/2, stateRef.current.p1X - speed);
                if (e.key === 'ArrowRight' || e.key === 'd') targetX = Math.min(GAME_WIDTH - PADDLE_WIDTH/2, stateRef.current.p1X + speed);
                if (targetX !== null) {
                    stateRef.current.p1X = targetX;
                    setP1X(targetX);
                }
            } else {
                // Keyboard input in this branch is always the guest's inverted view.
                const screenDirection = -1;
                const width = Date.now() < stateRef.current.p2WideUntil ? Math.min(PADDLE_WIDTH * 1.55, GAME_WIDTH * 0.82) : PADDLE_WIDTH;
                let newX = guestPaddleXRef.current;
                if (e.key === 'ArrowLeft' || e.key === 'a') newX -= speed * screenDirection;
                if (e.key === 'ArrowRight' || e.key === 'd') newX += speed * screenDirection;
                newX = Math.max(width / 2, Math.min(GAME_WIDTH - width / 2, newX));
                guestPaddleXRef.current = newX;
                setP2X(newX);
                queueGuestPaddleSync(newX);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState]);

    // --- Network Handling ---

    const restoreConnectionState = (savedState) => {
        if (!savedState || savedState.connectionGame !== 'brick-breaker' || !savedState.state) return false;
        const pausedFor = Math.max(0, Date.now() - Number(savedState.savedAt || Date.now()));
        const restored = { ...savedState.state };
        if (savedState.matchDeadline) matchDeadlineRef.current = Number(savedState.matchDeadline) + pausedFor;
        ['p1WideUntil', 'p2WideUntil', 'p1LaserUntil', 'p2LaserUntil', 'p1StickyUntil', 'p2StickyUntil', 'p1LaserReadyAt', 'p2LaserReadyAt'].forEach((key) => {
            if (restored[key] > 0) restored[key] += pausedFor;
        });
        restored.laserBeams = (restored.laserBeams || []).map((beam) => ({ ...beam, expiresAt: beam.expiresAt + pausedFor }));
        stateRef.current = restored;
        setBall(restored.ball);
        setOpponentBall(restored.p2Ball);
        setP1X(restored.p1X);
        setP2X(restored.p2X);
        guestPaddleXRef.current = restored.p2X;
        setBricks(restored.bricks || []);
        setExtraBalls(restored.extraBalls || []);
        setPowerDrops(restored.powerDrops || []);
        setLaserBeams(restored.laserBeams || []);
        setPowerEffects({
            p1: { paddle: Date.now() < restored.p1WideUntil, laser: Date.now() < restored.p1LaserUntil, sticky: Date.now() < restored.p1StickyUntil },
            p2: { paddle: Date.now() < restored.p2WideUntil, laser: Date.now() < restored.p2LaserUntil, sticky: Date.now() < restored.p2StickyUntil }
        });
        setWave(Number(restored.wave) || 1);
        setTimeLeft(Number(restored.timeLeft) || MATCH_SECONDS);
        setMyScore(Number(savedState.hostScore) || 0);
        setOppScore(Number(savedState.guestScore) || 0);
        setMyCombo(Number(restored.p1Combo) || 0);
        setOppCombo(Number(restored.p2Combo) || 0);
        setGameStateSafe(savedState.gameState || 'playing');
        if (isHostRef.current && savedState.gameState === 'playing') {
            gameLoopRef.current = setInterval(hostTick, TICK_RATE);
            syncLoopRef.current = setInterval(syncState, 1000 / 30);
        }
        hasStartedRef.current = true;
        return true;
    };

    const handleGameStart = (conn, hostMode, oppProf, savedState) => {
        isHostRef.current = hostMode;
        connRef.current = conn;
        hasStartedRef.current = false;
        if (oppProf) {
            setOppProfile(oppProf);
            isAIRef.current = !!oppProf.isAI;
        }
        conn.on('data', onData);
        if (hostMode) conn.on('peer-reconnect', syncState);
        if (!hostMode || !restoreConnectionState(savedState)) setGameStateSafe('starting');
    };

    const onData = (data) => {
        if (data.type === 'launch_ball' && isHostRef.current && !isAIRef.current) {
            const guestBall = stateRef.current.p2Ball;
            if (guestBall.stuckTo === 'p2') {
                const now = Date.now();
                if (!matchDeadlineRef.current) matchDeadlineRef.current = now + MATCH_SECONDS * 1000;
                guestBall.stuckUntil = now + 90;
            }
        }
        if (data.type === 'start') {
            setGameStateSafe('playing');
            setBricks(data.bricks);
            setWave(Number(data.wave) || 1);
            setTimeLeft(Number(data.timeLeft) || MATCH_SECONDS);
            if (data.ball) setBall(data.ball);
            if (data.p2Ball) setOpponentBall(data.p2Ball);
        }
        if (data.type === 'state_sync' && !isHostRef.current) {
            // Guest receives state
            setGameStateSafe('playing');
            setBall(data.ball);
            setOpponentBall(data.p2Ball || data.ball);
            if (Number.isFinite(data.timeLeft)) setTimeLeft(data.timeLeft);
            if (Number.isFinite(data.wave)) setWave(data.wave);
            setP1X(data.p1X); // Host's paddle
            // Keep the host-clamped position for subsequent keyboard movement.
            if (Number.isFinite(data.p2X)) guestPaddleXRef.current = data.p2X;
            setBricks(data.bricks);
            setExtraBalls(data.extraBalls || []);
            setPowerDrops(data.powerDrops || []);
            setPowerEffects(data.powerEffects || { p1: {}, p2: {} });
            setMyCombo(Number(data.p2Combo) || 0);
            setOppCombo(Number(data.p1Combo) || 0);
            stateRef.current.p1WideUntil = data.powerEffects?.p1?.paddle ? Number.MAX_SAFE_INTEGER : 0;
            stateRef.current.p2WideUntil = data.powerEffects?.p2?.paddle ? Number.MAX_SAFE_INTEGER : 0;
            setLaserBeams(data.laserBeams || []);
            setOppScore(data.myScore); // Host's score is my oppScore
            setMyScore(data.oppScore); // Host's oppScore is my myScore
        }
        if (data.type === 'powerup_caught') {
            const localPlayer = isHostRef.current ? 'p1' : 'p2';
            const who = data.owner === localPlayer ? 'أنت' : 'الخصم';
            setPowerNotice(`${who} أخذ ${data.label}`);
            setTimeout(() => setPowerNotice(''), 2400);
        }
        if (data.type === 'paddle_sync' && isHostRef.current) {
            // Host receives guest paddle
            if (Number.isFinite(data.x)) {
                const width = Date.now() < stateRef.current.p2WideUntil ? Math.min(PADDLE_WIDTH * 1.55, GAME_WIDTH * 0.82) : PADDLE_WIDTH;
                const x = Math.max(width / 2, Math.min(GAME_WIDTH - width / 2, data.x));
                stateRef.current.p2X = x;
                setP2X(x);
            }
        }
        if (data.type === 'game_over' && !isHostRef.current) {
            setGameStateSafe('game_over');
            setOppScore(data.finalHostScore);
            setMyScore(data.finalGuestScore);
            if (Number.isFinite(data.finalWave)) setWave(data.finalWave);
            
            if (data.finalGuestScore === data.finalHostScore) {
                triggerDrawEffects();
                awardMatchResult('draw', 10);
            } else if (data.finalGuestScore > data.finalHostScore) {
                triggerVictoryEffects();
                awardMatchResult('win', 30);
            } else {
                triggerDefeatEffects();
                awardMatchResult('loss', 5);
            }
        }
    };

    // First start
    useEffect(() => {
        if (gameState === 'starting' && isHostRef.current && !hasStartedRef.current) {
            hasStartedRef.current = true;
            setTimeout(() => {
                const initialBricks = generateBricks(1);
                stateRef.current.bricks = initialBricks;
                stateRef.current.wave = 1;
                stateRef.current.timeLeft = MATCH_SECONDS;
                matchDeadlineRef.current = 0;
                setWave(1);
                setTimeLeft(MATCH_SECONDS);
                stateRef.current.extraBalls = [];
                stateRef.current.powerDrops = [];
                stateRef.current.p1WideUntil = 0;
                stateRef.current.p2WideUntil = 0;
                stateRef.current.p1LaserUntil = 0;
                stateRef.current.p2LaserUntil = 0;
                stateRef.current.p1StickyUntil = 0;
                stateRef.current.p2StickyUntil = 0;
                stateRef.current.laserBeams = [];
                stateRef.current.myScore = 0;
                stateRef.current.oppScore = 0;
                stateRef.current.p1Combo = 0;
                stateRef.current.p2Combo = 0;
                lastRenderAtRef.current = 0;
                setMyScore(0);
                setOppScore(0);
                setMyCombo(0);
                setOppCombo(0);
                setExtraBalls([]);
                setPowerDrops([]);
                setPowerEffects({ p1: {}, p2: {} });
                setLaserBeams([]);
                resetBall('p1');
                // The AI owns its serve and must start its rally automatically;
                // human opponents still wait for their own launch input.
                resetBall('p2');
                
                setGameStateSafe('playing');
                connRef.current?.send({
                    type: 'start',
                    bricks: initialBricks,
                    wave: 1,
                    timeLeft: MATCH_SECONDS,
                    ball: stateRef.current.ball,
                    p2Ball: stateRef.current.p2Ball,
                });
                
                // Start loops
                gameLoopRef.current = setInterval(hostTick, TICK_RATE);
                syncLoopRef.current = setInterval(syncState, 1000 / 30); // Sync at 30Hz
            }, 1000);
        }
    }, [gameState]);

    useEffect(() => {
        return () => {
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
            if (syncLoopRef.current) clearInterval(syncLoopRef.current);
            if (paddleSyncTimerRef.current) clearTimeout(paddleSyncTimerRef.current);
        };
    }, []);

    // --- Render ---
    // If we are guest, we render p1 (host) at top and p2 (guest) at bottom?
    // Wait, it's easier to always render P1 at bottom and P2 at top, regardless of who is who.
    // BUT we want the local player to ALWAYS be at the bottom for UX!
    
    // Let's invert coordinates if we are the guest!
    const isGuest = !isHostRef.current;
    
    const invertY = (y) => isGuest ? GAME_HEIGHT - y : y;
    const invertX = (x) => isGuest ? GAME_WIDTH - x : x;

    const myPaddleX = isGuest ? invertX(p2X) : p1X;
    const oppPaddleX = isGuest ? invertX(p1X) : p2X;
    const myBall = isGuest ? opponentBall : ball;
    const opponentMainBall = isGuest ? ball : opponentBall;
    const renderBallX = isGuest ? invertX(myBall.x) : myBall.x;
    const renderBallY = isGuest ? invertY(myBall.y) : myBall.y;
    const renderOpponentBallX = isGuest ? invertX(opponentMainBall.x) : opponentMainBall.x;
    const renderOpponentBallY = isGuest ? invertY(opponentMainBall.y) : opponentMainBall.y;
    const myLogicalPlayer = isGuest ? 'p2' : 'p1';
    const opponentLogicalPlayer = isGuest ? 'p1' : 'p2';
    const waitingToServe = myBall?.stuckTo === myLogicalPlayer;
    const didWinMatch = myScore > oppScore;
    const isMatchDraw = myScore === oppScore;
    const activeBrickCount = bricks.reduce((count, brick) => count + (brick.active ? 1 : 0), 0);
    const myPaddleWidth = powerEffects[myLogicalPlayer]?.paddle ? Math.min(PADDLE_WIDTH * 1.55, GAME_WIDTH * 0.82) : PADDLE_WIDTH;
    const opponentPaddleWidth = powerEffects[opponentLogicalPlayer]?.paddle ? Math.min(PADDLE_WIDTH * 1.55, GAME_WIDTH * 0.82) : PADDLE_WIDTH;

    if (gameState === 'lobby') {
        return (
            <div className="min-h-dvh max-w-md mx-auto px-4 flex flex-col safe-area-pt overflow-x-hidden overflow-y-auto pb-6">
                <div className="grid grid-cols-3 items-center py-4 mb-4">
                    <div><Logo size="small" /></div>
                    <div className="flex justify-center">
                        <div className="flex items-center gap-2 glass-card px-3.5 py-1.5 rounded-2xl border border-white/10 shrink-0">
                            <GameIcon gameId="brick-breaker" size={18} className="text-[var(--accent)]" />
                            <span className="text-xs font-black gradient-text">تدمير الكتل</span>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button onClick={() => setView('hub')} className="glass-card px-4 py-2 rounded-2xl text-xs font-bold hover:scale-105 transition-transform">
                            الرئيسية
                        </button>
                    </div>
                </div>
                <div className="mb-4 w-full rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] px-4 py-3 text-right">
                    <h2 className="mb-2 text-sm font-black text-amber-200">العبها في ٣ خطوات</h2>
                    <ol className="space-y-1 text-xs leading-5 text-white/85">
                        <li>١. حرّك المضرب يمين وشمال عشان تلحق كرتك.</li>
                        <li>٢. المس/انقر الساحة أو اضغط Space لإطلاق الكرة؛ حرّك المضرب قبلها لاختيار زاويتها.</li>
                        <li>٣. بعد أول إطلاق، معاك دقيقتين: كل كتلة مكسورة = ١٠ نقاط، وأعلى مجموع يكسب.</li>
                    </ol>
                    <p className="mt-2 text-[10px] leading-5 text-white/70">كل لاعب له مضرب وكرة بلون مختلف، والكتل مشتركة. الكتل الذهبية في الموجات المتقدمة تحتاج ضربتين.</p>
                    <p className="mt-1 text-[10px] leading-5 text-white/70">التشكيلة تتغير كل موجة: الوردية تمنح ٢٥ نقطة، والبرتقالية تفجر الكتل المجاورة. كل ٣ كتل متتالية ترفع مضاعف نقاطك حتى ×٤.</p>
                    <p className="mt-2 text-[10px] leading-5 text-white/60">لو كرتك عدّت المضرب، خصمك ياخد ٥ نقاط. العب ضد الذكاء الاصطناعي أو اعمل غرفة لصديقك.</p>
                </div>
                <div className="flex-1 flex pb-16 safe-area-pb">
                    <P2PConnectionManager gameIdPrefix="celia-brick" onGameStart={handleGameStart} />
                </div>
            </div>
        );
    }

    return (
        <div className="game-fullscreen-shell fixed inset-0 h-[100dvh] overflow-hidden overscroll-none bg-[#060913] flex flex-col font-arabic select-none">
            <ConnectionPauseOverlay
                conn={connRef.current}
                opponentName={oppProfile?.nickname}
                onConnectionPause={() => {
                    if (connectionPausedAtRef.current === null) connectionPausedAtRef.current = Date.now();
                    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
                    if (syncLoopRef.current) clearInterval(syncLoopRef.current);
                    gameLoopRef.current = null;
                    syncLoopRef.current = null;
                }}
                onConnectionResume={() => {
                    if (connectionPausedAtRef.current !== null && isHostRef.current) {
                        const pausedFor = Date.now() - connectionPausedAtRef.current;
                        if (matchDeadlineRef.current) matchDeadlineRef.current += pausedFor;
                        ['p1WideUntil', 'p2WideUntil', 'p1LaserUntil', 'p2LaserUntil', 'p1StickyUntil', 'p2StickyUntil', 'p1LaserReadyAt', 'p2LaserReadyAt'].forEach((key) => {
                            if (stateRef.current[key] > 0) stateRef.current[key] += pausedFor;
                        });
                        stateRef.current.laserBeams = stateRef.current.laserBeams.map((beam) => ({ ...beam, expiresAt: beam.expiresAt + pausedFor }));
                    }
                    connectionPausedAtRef.current = null;
                    if (isHostRef.current && gameStateRef.current === 'playing') {
                        if (!gameLoopRef.current) gameLoopRef.current = setInterval(hostTick, TICK_RATE);
                        if (!syncLoopRef.current) syncLoopRef.current = setInterval(syncState, 1000 / 30);
                    }
                }}
                onLeave={() => { connRef.current?.close(); setView('hub'); }}
            />
            <EmotesOverlay conn={connRef.current} />

            <PlayerGameHeader
                gameId="brick-breaker"
                myProfile={myProfile}
                oppProfile={oppProfile}
                myScore={myScore}
                oppScore={oppScore}
                statusText={`الموجة ${wave}`}
                onLeave={() => { connRef.current?.close?.(); setView('hub'); }}
            />

            <div className="brick-breaker-play-area flex flex-1 min-h-0 w-full flex-col items-center justify-center gap-1.5 overflow-hidden px-2 pb-[env(safe-area-inset-bottom)] relative z-10">
                <div className="w-full max-w-md rounded-xl border border-white/10 bg-slate-900/75 px-2.5 py-1.5">
                    <div className="flex items-center justify-between gap-2 text-[10px] font-black sm:text-xs">
                        <span className="text-amber-200">موجة {wave} · {FORMATION_NAMES[(wave - 1) % FORMATION_NAMES.length]}</span>
                        <span className="text-white/70">باقي {activeBrickCount} كتلة</span>
                        <span className={timeLeft <= 20 ? 'text-rose-300 animate-pulse' : 'text-white'}>{formatClock(timeLeft)}</span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="الوقت المتبقي" aria-valuemin={0} aria-valuemax={MATCH_SECONDS} aria-valuenow={timeLeft}>
                        <div className={`h-full rounded-full transition-[width] duration-300 ${timeLeft <= 20 ? 'bg-rose-400' : 'bg-amber-300'}`} style={{ width: `${(timeLeft / MATCH_SECONDS) * 100}%` }} />
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[9px] font-bold text-white/65">
                        <span>⭐ وردية +٢٥</span><span>💥 تفجير</span><span>🟡 ضربتان</span>
                        <span className="text-cyan-200">أنت ×{Math.min(4, 1 + Math.floor(Math.max(0, myCombo - 1) / 3))}</span>
                        <span className="text-sky-200">الخصم ×{Math.min(4, 1 + Math.floor(Math.max(0, oppCombo - 1) / 3))}</span>
                    </div>
                </div>
                {(powerEffects[myLogicalPlayer]?.paddle || powerEffects[myLogicalPlayer]?.laser || powerEffects[myLogicalPlayer]?.sticky || powerNotice) && (
                    <div className="flex min-h-5 flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[9px] font-black" aria-live="polite">
                        {powerNotice && <span className="text-amber-100">{powerNotice}</span>}
                        {powerEffects[myLogicalPlayer]?.paddle && <span className="text-amber-200">↔️ مضرب أطول</span>}
                        {powerEffects[myLogicalPlayer]?.laser && <span className="text-rose-200">🔦 ليزر</span>}
                        {powerEffects[myLogicalPlayer]?.sticky && <span className="text-sky-200">🧲 كرة لاصقة</span>}
                    </div>
                )}
                <div 
                    ref={containerRef}
                    onPointerMove={handlePointerMove}
                    onPointerDown={handleBoardPointerDown}
                    className="brick-breaker-court w-full max-w-md aspect-[3/5] shrink-0 rounded-3xl border-2 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden relative cursor-crosshair touch-none"
                >
                    {/* Background Grid */}
                    <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)]" style={{ backgroundSize: '20px 20px' }}></div>
                    
                    {/* Center Line */}
                    <div className="absolute left-0 right-0 top-1/2 h-0 border-b border-dashed border-white/20"></div>

                    {gameState === 'playing' && waitingToServe && (
                        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-slate-950/30 px-6 text-center">
                            <div className="rounded-2xl border border-white/15 bg-slate-950/85 px-5 py-4 shadow-xl backdrop-blur-sm">
                                <div className="text-lg font-black text-white">المس/انقر الساحة لإطلاق كرتك</div>
                                <div className="mt-1 text-xs font-bold text-white/65">حرّك المضرب قبلها لو عايز تغيّر زاوية الكرة</div>
                            </div>
                        </div>
                    )}

                    {/* Entities scaled relative to 300x500 container */}
                    
                    {/* Bricks */}
                    {bricks.map((br) => {
                        if (!br.active) return null;
                        const rx = isGuest ? invertX(br.x + BRICK_W) : br.x;
                        const ry = isGuest ? invertY(br.y + BRICK_H) : br.y;
                        return (
                            <div 
                                key={br.id}
                                className={`brick-tile absolute rounded-sm shadow-lg transition-transform duration-75 ${br.hp > 1 ? 'ring-1 ring-amber-100/90' : ''} ${br.type === 'explosive' ? 'brick-tile-explosive' : ''}`}
                                style={{
                                    left: `${(rx / GAME_WIDTH) * 100}%`,
                                    top: `${(ry / GAME_HEIGHT) * 100}%`,
                                    width: `${(BRICK_W / GAME_WIDTH) * 100}%`,
                                    height: `${(BRICK_H / GAME_HEIGHT) * 100}%`,
                                    backgroundColor: br.color,
                                    boxShadow: `0 0 10px ${br.color}80`
                                }}
                            >
                                {br.type === 'bonus' && <span className="flex h-full items-center justify-center text-[8px] font-black text-white">★</span>}
                                {br.type === 'explosive' && <span className="flex h-full items-center justify-center text-[8px] font-black text-slate-950">✹</span>}
                                {br.type === 'reinforced' && <span className="flex h-full items-center justify-center text-[7px] font-black text-slate-950">{br.hp}</span>}
                            </div>
                        );
                    })}

                    {powerDrops.map(drop => {
                        const x = isGuest ? invertX(drop.x) : drop.x;
                        const y = isGuest ? invertY(drop.y) : drop.y;
                        return (
                            <div
                                key={drop.id}
                                className="absolute z-10 grid place-items-center rounded-full border border-amber-100/70 bg-amber-300 text-xs shadow-[0_0_16px_rgba(251,191,36,0.8)] animate-pulse"
                                title={drop.label}
                                style={{
                                    left: `${((x - 9) / GAME_WIDTH) * 100}%`,
                                    top: `${((y - 9) / GAME_HEIGHT) * 100}%`,
                                    width: `${(18 / GAME_WIDTH) * 100}%`,
                                    height: `${(18 / GAME_HEIGHT) * 100}%`,
                                }}
                            >
                                {drop.emoji}
                            </div>
                        );
                    })}

                    {laserBeams.filter(beam => beam.expiresAt > Date.now()).map(beam => {
                        const x = isGuest ? invertX(beam.x) : beam.x;
                        const startY = isGuest ? invertY(beam.yStart) : beam.yStart;
                        const endY = isGuest ? invertY(beam.yEnd) : beam.yEnd;
                        return (
                            <div
                                key={beam.id}
                                className="absolute z-10 rounded-full bg-rose-300 shadow-[0_0_14px_5px_rgba(251,113,133,0.8)]"
                                style={{
                                    left: `${((x - 1.5) / GAME_WIDTH) * 100}%`,
                                    top: `${(Math.min(startY, endY) / GAME_HEIGHT) * 100}%`,
                                    width: `${(3 / GAME_WIDTH) * 100}%`,
                                    height: `${(Math.abs(startY - endY) / GAME_HEIGHT) * 100}%`,
                                }}
                            />
                        );
                    })}

                    {/* Opponent Paddle (Top) */}
                    <div 
                        className="absolute bg-sky-400 rounded-full shadow-[0_0_15px_rgba(56,189,248,0.8)]"
                        style={{
                            left: `${((oppPaddleX - opponentPaddleWidth/2) / GAME_WIDTH) * 100}%`,
                            top: `${((isGuest ? invertY(P1_Y) : P2_Y) / GAME_HEIGHT) * 100}%`,
                            width: `${(opponentPaddleWidth / GAME_WIDTH) * 100}%`,
                            height: `${(PADDLE_HEIGHT / GAME_HEIGHT) * 100}%`,
                        }}
                    />

                    {/* My Paddle (Bottom) */}
                    <div 
                        className="absolute bg-[var(--accent)] rounded-full shadow-[0_0_15px_var(--accent-glow)]"
                        style={{
                            left: `${((myPaddleX - myPaddleWidth/2) / GAME_WIDTH) * 100}%`,
                            top: `${((isGuest ? invertY(P2_Y) : P1_Y) / GAME_HEIGHT) * 100}%`,
                            width: `${(myPaddleWidth / GAME_WIDTH) * 100}%`,
                            height: `${(PADDLE_HEIGHT / GAME_HEIGHT) * 100}%`,
                        }}
                    />

                    {/* Your ball */}
                    <div 
                        className={`absolute z-[6] rounded-full border-2 border-white transition-[left,top] duration-[50ms] ease-linear will-change-[left,top] ${isGuest ? 'bg-gradient-to-br from-white to-sky-300 shadow-[0_0_18px_rgba(56,189,248,0.95)]' : 'bg-gradient-to-br from-white to-[var(--accent)] shadow-[0_0_18px_var(--accent-glow)]'}`}
                        style={{
                            left: `${((renderBallX - BALL_R) / GAME_WIDTH) * 100}%`,
                            top: `${((renderBallY - BALL_R) / GAME_HEIGHT) * 100}%`,
                            width: `${((BALL_R * 2) / GAME_WIDTH) * 100}%`,
                            height: `${((BALL_R * 2) / GAME_HEIGHT) * 100}%`,
                        }}
                    />

                    {/* Opponent's separate ball */}
                    <div
                        className={`absolute z-[6] rounded-full border-2 border-white transition-[left,top] duration-[50ms] ease-linear will-change-[left,top] ${isGuest ? 'bg-gradient-to-br from-white to-[var(--accent)] shadow-[0_0_18px_var(--accent-glow)]' : 'bg-gradient-to-br from-white to-sky-300 shadow-[0_0_18px_rgba(56,189,248,0.95)]'}`}
                        style={{
                            left: `${((renderOpponentBallX - BALL_R) / GAME_WIDTH) * 100}%`,
                            top: `${((renderOpponentBallY - BALL_R) / GAME_HEIGHT) * 100}%`,
                            width: `${((BALL_R * 2) / GAME_WIDTH) * 100}%`,
                            height: `${((BALL_R * 2) / GAME_HEIGHT) * 100}%`,
                        }}
                    />

                    {extraBalls.map((extra, index) => {
                        const x = isGuest ? invertX(extra.x) : extra.x;
                        const y = isGuest ? invertY(extra.y) : extra.y;
                        return (
                            <div
                                key={`extra-${index}`}
                                className="absolute z-[5] rounded-full bg-amber-100 shadow-[0_0_12px_rgba(251,191,36,0.9)]"
                                style={{
                                    left: `${((x - BALL_R) / GAME_WIDTH) * 100}%`,
                                    top: `${((y - BALL_R) / GAME_HEIGHT) * 100}%`,
                                    width: `${((BALL_R * 2) / GAME_WIDTH) * 100}%`,
                                    height: `${((BALL_R * 2) / GAME_HEIGHT) * 100}%`,
                                }}
                            />
                        );
                    })}
                    
                    {/* Overlays */}
                    {gameState === 'starting' && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center z-20">
                            <div className="text-4xl mb-4 animate-bounce">🧱</div>
                            <div className="text-white font-black text-lg">جاري تجهيز الساحة...</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Game Over Modal */}
            {gameState === 'game_over' && (
                <div className="safe-area-overlay fixed inset-0 z-50 bg-black/80 backdrop-blur-lg flex items-center justify-center p-4 animate-fade-in">
                    <div className="glass-card max-w-sm w-full p-8 rounded-3xl text-center shadow-2xl border border-white/20 relative overflow-hidden">
                        <div className="text-6xl mb-4 animate-bounce">
                            {isMatchDraw ? '🤝' : didWinMatch ? '🏆' : '🎮'}
                        </div>
                        <h2 className="text-3xl font-black mb-2 text-amber-300">انتهى الوقت</h2>
                        <p className={`text-sm font-black ${isMatchDraw ? 'text-white/70' : didWinMatch ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {isMatchDraw ? 'تعادل — نفس النقاط' : didWinMatch ? 'أنت كسبت بالمجموع الأعلى' : 'الخصم كسب هذه المباراة'}
                        </p>
                        <p className="mt-2 text-[11px] font-bold text-white/45">مباراة دقيقتين · وصلت للموجة {wave}</p>
                        
                        <div className="flex items-center justify-center gap-6 my-6">
                            <div className="text-center">
                                <div className="text-4xl font-black text-[var(--accent)]">{myScore}</div>
                                <div className="text-xs text-white/50 mt-1">نقاطك</div>
                            </div>
                            <div className="text-2xl font-black text-white/20">-</div>
                            <div className="text-center">
                                <div className="text-4xl font-black text-sky-400">{oppScore}</div>
                                <div className="text-xs text-white/50 mt-1">{oppProfile?.nickname || 'الخصم'}</div>
                            </div>
                        </div>
                        
                        <button
                            onClick={() => { playSound('click'); setView('hub'); }}
                            className="w-full py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black text-sm transition-all mt-4"
                        >
                            العودة للقائمة
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
