import React, { useState, useRef, useEffect, useCallback } from 'react';
import Logo from '../../components/Logo';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import PlayerGameHeader from '../../components/PlayerGameHeader';
import ConnectionPauseOverlay from '../../components/ConnectionPauseOverlay';
import EmotesOverlay from '../../components/EmotesOverlay';
import { playSound, playHaptic } from '../../lib/audioEngine';
import useProfile from '../../hooks/useProfile';
import { triggerVictoryEffects, triggerDefeatEffects } from '../../lib/effectsEngine';
import { GameIcon } from '../../components/icons/GameIcons';
import './SnakeArenaGame.css';

// --- Constants ---
const GRID_SIZE = 21; // 21x21 grid
const TICK_RATE = 190;
const BOOSTED_TICK_RATE = 145;
const WIN_SCORE = 5;
const POWER_UP_TYPES = [
    { type: 'speed', emoji: '⚡', label: 'سرعة' },
    { type: 'freeze', emoji: '❄️', label: 'تجميد' },
    { type: 'shrink', emoji: '✂️', label: 'تقليص' },
    { type: 'shield', emoji: '🛡️', label: 'درع' },
];

const randomPowerUpDelay = () => 8000 + Math.random() * 4000;

const INITIAL_P1 = [
    { x: 3, y: 10 },
    { x: 2, y: 10 },
    { x: 1, y: 10 },
];
const INITIAL_P2 = [
    { x: 17, y: 12 },
    { x: 17, y: 13 },
    { x: 17, y: 14 },
];

const SNAKE_DIRECTIONS = [
    { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }
];

const cellKey = ({ x, y }) => y * GRID_SIZE + x;
const isReverseDirection = (a, b) => Boolean(a && b && a.x === -b.x && a.y === -b.y);
const isInsideBoard = ({ x, y }) => x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;

function reachableArea(start, blocked) {
    const startKey = cellKey(start);
    if (!isInsideBoard(start) || blocked.has(startKey)) return 0;
    const queue = [start];
    const visited = new Set([startKey]);
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const cell = queue[cursor];
        for (const direction of SNAKE_DIRECTIONS) {
            const next = { x: cell.x + direction.x, y: cell.y + direction.y };
            const key = cellKey(next);
            if (!isInsideBoard(next) || blocked.has(key) || visited.has(key)) continue;
            visited.add(key);
            queue.push(next);
        }
    }
    return visited.size;
}

function pathDistance(start, target, blocked) {
    if (!target) return Infinity;
    const queue = [{ ...start, distance: 0 }];
    const visited = new Set([cellKey(start)]);
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const cell = queue[cursor];
        if (cell.x === target.x && cell.y === target.y) return cell.distance;
        for (const direction of SNAKE_DIRECTIONS) {
            const next = { x: cell.x + direction.x, y: cell.y + direction.y };
            const key = cellKey(next);
            if (!isInsideBoard(next) || blocked.has(key) || visited.has(key)) continue;
            visited.add(key);
            queue.push({ ...next, distance: cell.distance + 1 });
        }
    }
    return Infinity;
}

// The bot plans one move at a time, then scores how much safe space remains.
// It takes apples when a route is available without blindly driving into a pocket.
function chooseAIDirection(head, target, ownSnake, otherSnake, currentDir, otherDir = null, recentCells = [], opponentMoves = true, opponentEats = false) {
    const recent = new Set(recentCells);
    const opponentHead = otherSnake[0];
    const opponentNext = opponentMoves && otherDir && isInsideBoard({ x: opponentHead.x + otherDir.x, y: opponentHead.y + otherDir.y })
        ? { x: opponentHead.x + otherDir.x, y: opponentHead.y + otherDir.y }
        : opponentHead;
    const opponentAfter = opponentMoves ? [opponentNext, ...otherSnake] : otherSnake;
    if (opponentMoves && !opponentEats) opponentAfter.pop();
    const opponentBlocked = new Set([...opponentAfter.slice(1).map(cellKey), ...ownSnake.slice(1, -1).map(cellKey)]);
    const opponentFoodDistance = pathDistance(opponentHead, target, opponentBlocked);
    const candidates = SNAKE_DIRECTIONS.filter((direction) => !isReverseDirection(direction, currentDir));
    const scored = candidates.map((direction) => {
        const nextHead = { x: head.x + direction.x, y: head.y + direction.y };
        if (!isInsideBoard(nextHead)) return { direction, score: -Infinity };

        const eats = Boolean(target && nextHead.x === target.x && nextHead.y === target.y);
        const nextOwnSnake = [nextHead, ...ownSnake];
        if (!eats) nextOwnSnake.pop();
        const hitsOwnBody = ownSnake.slice(0, eats ? undefined : -1).some((cell) => cell.x === nextHead.x && cell.y === nextHead.y);
        const hitsOpponentBody = opponentAfter.some((cell) => cell.x === nextHead.x && cell.y === nextHead.y);
        if (hitsOwnBody || hitsOpponentBody || (nextHead.x === opponentNext.x && nextHead.y === opponentNext.y)) {
            return { direction, score: -Infinity };
        }
        const blocked = new Set([
            ...nextOwnSnake.slice(1).map(cellKey),
            ...opponentAfter.map(cellKey),
        ]);

        // Never choose a move that runs directly into either the opponent's head or
        // its next likely cell. A small buffer also prevents cheap head-to-head trades.
        const enemyDistance = Math.abs(nextHead.x - opponentNext.x) + Math.abs(nextHead.y - opponentNext.y);
        const area = reachableArea(nextHead, blocked);
        const foodDistance = pathDistance(nextHead, target, blocked);
        const minimumSafeArea = Math.max(ownSnake.length + (eats ? 2 : 1), 7);
        let score = Math.min(area, 120) * 0.22;
        if (area < ownSnake.length + 2) score -= 180;
        if (area < minimumSafeArea) score -= (minimumSafeArea - area) * 32;
        if (Number.isFinite(foodDistance)) score += Math.max(0, 95 - foodDistance * 9);
        else score -= 30;
        if (Number.isFinite(opponentFoodDistance) && Number.isFinite(foodDistance)) {
            score += Math.max(-10, Math.min(10, (opponentFoodDistance - foodDistance) * 2));
        }
        if (enemyDistance === 0) score -= 500;
        else if (enemyDistance === 1) score -= 30;
        else if (enemyDistance === 2) score -= 8;
        if (eats) score += 14;
        if (recent.has(cellKey(nextHead))) score -= 7;
        if (direction.x === currentDir.x && direction.y === currentDir.y) score += 2;
        // Tiny tie-breaking noise makes the bot less robotic without affecting safety.
        score += Math.random() * 1.5;
        return { direction, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.score === -Infinity ? currentDir : (scored[0]?.direction || currentDir);
}

export default function SnakeArenaGame({ setView }) {
    const connRef = useRef(null);
    const isHostRef = useRef(false);
    const isAIRef = useRef(false);
    const hasStartedRef = useRef(false);
    const [myProfile, , awardMatchResult] = useProfile({ gameId: 'snake-arena', gameTitle: 'ساحة الأفعى' });
    const [oppProfile, setOppProfile] = useState(null);

    // Game State
    const [gameState, setGameState] = useState('lobby'); // lobby, countdown, playing, round_over, game_over
    const [isHost, setIsHost] = useState(false);
    const [connection, setConnection] = useState(null);
    const [countdown, setCountdown] = useState(3);
    const [myScore, setMyScore] = useState(0);
    const [oppScore, setOppScore] = useState(0);
    const [roundNum, setRoundNum] = useState(1);
    const [p1FruitCount, setP1FruitCount] = useState(0);
    const [p2FruitCount, setP2FruitCount] = useState(0);
    
    // Snake State
    const [p1Snake, setP1Snake] = useState(INITIAL_P1);
    const [p2Snake, setP2Snake] = useState(INITIAL_P2);
    const [p1DirectionUI, setP1DirectionUI] = useState({ x: 1, y: 0 });
    const [p2DirectionUI, setP2DirectionUI] = useState({ x: 0, y: -1 });
    const [apple, setApple] = useState({ x: 10, y: 10 });
    const [powerUp, setPowerUp] = useState(null);
    const [powerEffects, setPowerEffects] = useState({ p1: {}, p2: {} });
    const [powerNotice, setPowerNotice] = useState('');
    const [roundResult, setRoundResult] = useState(null); // 'win', 'lose', 'draw'
    const uiSnapshotRef = useRef({ myScore, oppScore, roundNum, gameState });
    uiSnapshotRef.current = { myScore, oppScore, roundNum, gameState };

    // Refs for Game Loop (Host Only)
    const stateRef = useRef({
        p1Snake: INITIAL_P1,
        p2Snake: INITIAL_P2,
        p1Dir: { x: 1, y: 0 },
        p2Dir: { x: 0, y: -1 },
        nextP1Dir: { x: 1, y: 0 },
        nextP2Dir: { x: 0, y: -1 },
        apple: { x: 10, y: 10 },
        powerUp: null,
        p1FruitCount: 0,
        p2FruitCount: 0,
        aiRecentCells: [],
        nextPowerUpAt: Date.now() + randomPowerUpDelay(),
        p1SpeedUntil: 0,
        p2SpeedUntil: 0,
        p1FrozenUntil: 0,
        p2FrozenUntil: 0,
        p1Shield: false,
        p2Shield: false,
        status: 'lobby' // lobby, playing, round_over
    });
    
    const gameLoopRef = useRef(null);
    const activeTickRateRef = useRef(TICK_RATE);
    const countdownRef = useRef(null);
    const connectionPausedAtRef = useRef(null);
    const lastConnectionSaveAtRef = useRef(0);
    const touchStartRef = useRef(null);

    // --- Core Logic ---

    const spawnApple = (s1, s2, extraBlock = null) => {
        const occupied = new Set([
            ...s1.map(({ x, y }) => `${x},${y}`),
            ...s2.map(({ x, y }) => `${x},${y}`),
            ...(extraBlock ? [`${extraBlock.x},${extraBlock.y}`] : []),
        ]);
        const available = [];
        for (let y = 0; y < GRID_SIZE; y += 1) {
            for (let x = 0; x < GRID_SIZE; x += 1) {
                if (!occupied.has(`${x},${y}`)) available.push({ x, y });
            }
        }
        return available.length ? available[Math.floor(Math.random() * available.length)] : null;
    };

    const hostTick = () => {
        if (stateRef.current.status !== 'playing') return;

        const s = stateRef.current;
        const now = Date.now();

        if (s.powerUp && now >= s.powerUp.expiresAt) s.powerUp = null;
        if (!s.powerUp && now >= s.nextPowerUpAt) {
            const occupied = new Set([
                ...s.p1Snake.map(cell => `${cell.x},${cell.y}`),
                ...s.p2Snake.map(cell => `${cell.x},${cell.y}`),
                `${s.apple.x},${s.apple.y}`,
            ]);
            const emptyCells = [];
            for (let y = 0; y < GRID_SIZE; y++) {
                for (let x = 0; x < GRID_SIZE; x++) {
                    if (!occupied.has(`${x},${y}`)) emptyCells.push({ x, y });
                }
            }
            if (emptyCells.length) {
                const spot = emptyCells[Math.floor(Math.random() * emptyCells.length)];
                const selected = POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)];
                s.powerUp = { ...spot, ...selected, expiresAt: now + 6000 };
            }
            s.nextPowerUpAt = now + randomPowerUpDelay();
        }
        
        // AI Logic for P2 if opponent is AI
        if (isAIRef.current) {
            if (s.apple) {
                const opponentMoves = now >= s.p1FrozenUntil;
                const opponentNext = { x: s.p1Snake[0].x + s.nextP1Dir.x, y: s.p1Snake[0].y + s.nextP1Dir.y };
                const opponentEats = opponentMoves && s.apple && opponentNext.x === s.apple.x && opponentNext.y === s.apple.y;
                s.nextP2Dir = chooseAIDirection(
                    s.p2Snake[0], s.apple, s.p2Snake, s.p1Snake, s.p2Dir, s.nextP1Dir,
                    s.aiRecentCells, opponentMoves, opponentEats,
                );
                if (now >= s.p2FrozenUntil) {
                    const plannedCell = { x: s.p2Snake[0].x + s.nextP2Dir.x, y: s.p2Snake[0].y + s.nextP2Dir.y };
                    s.aiRecentCells = [...s.aiRecentCells, cellKey(plannedCell)].slice(-8);
                }
            }
        }

        s.p1Dir = s.nextP1Dir;
        s.p2Dir = s.nextP2Dir;

        // Power-up speed changes the arena tempo for both players. It never freezes
        // just one snake, which keeps remote play from looking like a network stall.
        let moveP1 = now >= s.p1FrozenUntil;
        let moveP2 = now >= s.p2FrozenUntil;

        // Calculate new heads
        let newP1Head = moveP1 ? { x: s.p1Snake[0].x + s.p1Dir.x, y: s.p1Snake[0].y + s.p1Dir.y } : s.p1Snake[0];
        let newP2Head = moveP2 ? { x: s.p2Snake[0].x + s.p2Dir.x, y: s.p2Snake[0].y + s.p2Dir.y } : s.p2Snake[0];
        const p1Ate = Boolean(moveP1 && s.apple && newP1Head.x === s.apple.x && newP1Head.y === s.apple.y);
        const p2Ate = Boolean(moveP2 && s.apple && newP2Head.x === s.apple.x && newP2Head.y === s.apple.y);

        if (p1Ate) s.p1FruitCount += 1;
        if (p2Ate) s.p2FruitCount += 1;

        let p1Dead = false;
        let p2Dead = false;

        // 1. Check Wall Collisions
        if (moveP1 && (newP1Head.x < 0 || newP1Head.x >= GRID_SIZE || newP1Head.y < 0 || newP1Head.y >= GRID_SIZE)) p1Dead = true;
        if (moveP2 && (newP2Head.x < 0 || newP2Head.x >= GRID_SIZE || newP2Head.y < 0 || newP2Head.y >= GRID_SIZE)) p2Dead = true;

        // 2. Head to Head Collision
        if (newP1Head.x === newP2Head.x && newP1Head.y === newP2Head.y) {
            if (moveP1) p1Dead = true;
            if (moveP2) p2Dead = true;
        }
        if (moveP1 && moveP2 && newP1Head.x === s.p2Snake[0].x && newP1Head.y === s.p2Snake[0].y
            && newP2Head.x === s.p1Snake[0].x && newP2Head.y === s.p1Snake[0].y) {
            p1Dead = true;
            p2Dead = true;
        }

        const collidesWithBody = (head, snake, moves, eats) => {
            const body = moves ? snake.slice(1, eats ? undefined : -1) : snake;
            return body.some((segment) => segment.x === head.x && segment.y === head.y);
        };

        // 3. Body Collisions
        // P1 hits itself or P2
        if (!p1Dead && moveP1) {
            if (collidesWithBody(newP1Head, s.p1Snake, moveP1, p1Ate)) p1Dead = true;
            if (collidesWithBody(newP1Head, s.p2Snake, moveP2, p2Ate)) p1Dead = true;
        }
        // P2 hits itself or P1
        if (!p2Dead && moveP2) {
            if (collidesWithBody(newP2Head, s.p2Snake, moveP2, p2Ate)) p2Dead = true;
            if (collidesWithBody(newP2Head, s.p1Snake, moveP1, p1Ate)) p2Dead = true;
        }

        if (p1Dead && s.p1Shield) {
            s.p1Shield = false;
            p1Dead = false;
            moveP1 = false;
            newP1Head = s.p1Snake[0];
        }
        if (p2Dead && s.p2Shield) {
            s.p2Shield = false;
            p2Dead = false;
            moveP2 = false;
            newP2Head = s.p2Snake[0];
        }

        if (p1Dead || p2Dead) {
            // Round Over
            s.status = 'round_over';
            s.powerUp = null;
            clearInterval(gameLoopRef.current);
            playSound('error');
            
            let result = 'draw';
            if (p1Dead && !p2Dead) result = 'p2_win';
            else if (p2Dead && !p1Dead) result = 'p1_win';

            // Send round over sync
            connRef.current?.send({
                type: 'round_over',
                result: result,
                finalP1: s.p1Snake,
                finalP2: s.p2Snake
            });
            handleRoundOver(result, s.p1Snake, s.p2Snake);
            return;
        }

        // Move snakes
        let nextP1Snake = moveP1 ? [newP1Head, ...s.p1Snake] : s.p1Snake;
        if (moveP1 && !p1Ate) nextP1Snake.pop();
        else if (p1Ate) playSound('pop');

        let nextP2Snake = moveP2 ? [newP2Head, ...s.p2Snake] : s.p2Snake;
        if (moveP2 && !p2Ate) nextP2Snake.pop();
        else if (p2Ate) playSound('pop');

        let collectedPowerUp = null;
        let collectedBy = null;
        if (s.powerUp && moveP1 && newP1Head.x === s.powerUp.x && newP1Head.y === s.powerUp.y) {
            collectedPowerUp = s.powerUp;
            collectedBy = 'p1';
        } else if (s.powerUp && moveP2 && newP2Head.x === s.powerUp.x && newP2Head.y === s.powerUp.y) {
            collectedPowerUp = s.powerUp;
            collectedBy = 'p2';
        }

        if (collectedPowerUp) {
            const target = collectedBy === 'p1' ? 'p2' : 'p1';
            if (collectedPowerUp.type === 'speed') s[`${collectedBy}SpeedUntil`] = now + 5000;
            if (collectedPowerUp.type === 'freeze') s[`${target}FrozenUntil`] = now + 2000;
            if (collectedPowerUp.type === 'shrink') {
                const enemySnake = target === 'p1' ? nextP1Snake : nextP2Snake;
                const shortened = enemySnake.slice(0, Math.max(3, enemySnake.length - 2));
                if (target === 'p1') nextP1Snake = shortened;
                else nextP2Snake = shortened;
            }
            if (collectedPowerUp.type === 'shield') s[`${collectedBy}Shield`] = true;
            s.powerUp = null;
            s.nextPowerUpAt = now + randomPowerUpDelay();
            const collectorIsMe = collectedBy === (isHostRef.current ? 'p1' : 'p2');
            const notice = `${collectorIsMe ? 'أنت' : 'الخصم'} أخذ ${collectedPowerUp.label}`;
            setPowerNotice(notice);
            setTimeout(() => setPowerNotice(''), 2400);
            connRef.current?.send({ type: 'powerup_picked', player: collectedBy, powerType: collectedPowerUp.type, label: collectedPowerUp.label });
            playHaptic(35);
            playSound('success');
        }

        if (p1Ate || p2Ate) {
            s.apple = spawnApple(nextP1Snake, nextP2Snake, s.powerUp);
        }

        s.p1Snake = nextP1Snake;
        s.p2Snake = nextP2Snake;

        // Update local UI
        setP1Snake(s.p1Snake);
        setP2Snake(s.p2Snake);
        setP1DirectionUI(s.p1Dir);
        setP2DirectionUI(s.p2Dir);
        setApple(s.apple);
        setPowerUp(s.powerUp);
        setP1FruitCount(s.p1FruitCount);
        setP2FruitCount(s.p2FruitCount);
        setPowerEffects({
            p1: { speed: now < s.p1SpeedUntil, frozen: now < s.p1FrozenUntil, shield: s.p1Shield },
            p2: { speed: now < s.p2SpeedUntil, frozen: now < s.p2FrozenUntil, shield: s.p2Shield },
        });

        // Broadcast state
        connRef.current?.send({
            type: 'state_sync',
            p1Snake: s.p1Snake,
            p2Snake: s.p2Snake,
            p1Dir: s.p1Dir,
            p2Dir: s.p2Dir,
            apple: s.apple,
            p1FruitCount: s.p1FruitCount,
            p2FruitCount: s.p2FruitCount,
            powerUp: s.powerUp,
            powerEffects: {
                p1: { speed: now < s.p1SpeedUntil, frozen: now < s.p1FrozenUntil, shield: s.p1Shield },
                p2: { speed: now < s.p2SpeedUntil, frozen: now < s.p2FrozenUntil, shield: s.p2Shield },
            }
        });

        if (isHostRef.current && now - lastConnectionSaveAtRef.current >= 1000) {
            lastConnectionSaveAtRef.current = now;
            connRef.current?.saveState?.({
                connectionGame: 'snake-arena',
                gameState: uiSnapshotRef.current.gameState,
                p1Score: uiSnapshotRef.current.myScore,
                p2Score: uiSnapshotRef.current.oppScore,
                round: uiSnapshotRef.current.roundNum,
                state: { ...s },
                savedAt: Date.now()
            });
        }

        const desiredTickRate = now < s.p1SpeedUntil || now < s.p2SpeedUntil ? BOOSTED_TICK_RATE : TICK_RATE;
        if (desiredTickRate !== activeTickRateRef.current) {
            activeTickRateRef.current = desiredTickRate;
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
            if (s.status === 'playing') gameLoopRef.current = setInterval(hostTick, desiredTickRate);
        }
    };

    const handleRoundOver = (result, finalP1, finalP2) => {
        setP1Snake(finalP1);
        setP2Snake(finalP2);
        setPowerUp(null);
        setPowerEffects({ p1: {}, p2: {} });
        setGameState('round_over');
        
        let p1ScoreInc = 0;
        let p2ScoreInc = 0;
        
        if (result === 'p1_win') p1ScoreInc = 1;
        else if (result === 'p2_win') p2ScoreInc = 1;

        setMyScore(prev => prev + (isHostRef.current ? p1ScoreInc : p2ScoreInc));
        setOppScore(prev => prev + (isHostRef.current ? p2ScoreInc : p1ScoreInc));

        if (isHostRef.current) {
            if (result === 'p1_win') setRoundResult('win');
            else if (result === 'p2_win') setRoundResult('lose');
            else setRoundResult('draw');
        } else {
            if (result === 'p1_win') setRoundResult('lose');
            else if (result === 'p2_win') setRoundResult('win');
            else setRoundResult('draw');
        }
    };

    // --- Input Handling ---

    const handleInput = useCallback((dirStr) => {
        if (gameState !== 'playing') return;

        const dirMap = {
            'UP': { x: 0, y: -1 },
            'DOWN': { x: 0, y: 1 },
            'LEFT': { x: -1, y: 0 },
            'RIGHT': { x: 1, y: 0 }
        };
        const newDir = dirMap[dirStr];
        if (!newDir) return;

        if (isHostRef.current) {
            if (isReverseDirection(newDir, stateRef.current.p1Dir) || isReverseDirection(newDir, stateRef.current.nextP1Dir)) return;
            stateRef.current.nextP1Dir = newDir;
        } else {
            if (isReverseDirection(newDir, stateRef.current.p2Dir) || isReverseDirection(newDir, stateRef.current.nextP2Dir)) return;
            stateRef.current.nextP2Dir = newDir;
            connRef.current?.send({ type: 'input_sync', dir: newDir });
        }
    }, [gameState]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (gameState === 'playing' && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }
            switch(e.key) {
                case 'ArrowUp': case 'w': case 'W': handleInput('UP'); break;
                case 'ArrowDown': case 's': case 'S': handleInput('DOWN'); break;
                case 'ArrowLeft': case 'a': case 'A': handleInput('LEFT'); break;
                case 'ArrowRight': case 'd': case 'D': handleInput('RIGHT'); break;
                default: break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState, handleInput]);

    // Swipe handling
    const handleTouchStart = (e) => {
        touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const handleTouchEnd = (e) => {
        if (!touchStartRef.current) return;
        const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        const dx = touchEnd.x - touchStartRef.current.x;
        const dy = touchEnd.y - touchStartRef.current.y;
        
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
            handleInput(dx > 0 ? 'RIGHT' : 'LEFT');
        } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 30) {
            handleInput(dy > 0 ? 'DOWN' : 'UP');
        }
        touchStartRef.current = null;
    };

    // --- Network Handling ---

    const restoreConnectionState = (savedState, hostMode) => {
        if (!savedState || savedState.connectionGame !== 'snake-arena' || !savedState.state) return false;
        const state = { ...savedState.state };
        const pausedFor = Math.max(0, Date.now() - Number(savedState.savedAt || Date.now()));
        state.nextPowerUpAt += pausedFor;
        ['p1SpeedUntil', 'p2SpeedUntil', 'p1FrozenUntil', 'p2FrozenUntil'].forEach((key) => {
            if (state[key] > 0) state[key] += pausedFor;
        });
        if (state.powerUp?.expiresAt) state.powerUp.expiresAt += pausedFor;
        stateRef.current = state;
        setP1Snake(state.p1Snake);
        setP2Snake(state.p2Snake);
        setApple(state.apple);
        setPowerUp(state.powerUp || null);
        setP1FruitCount(state.p1FruitCount || 0);
        setP2FruitCount(state.p2FruitCount || 0);
        setPowerEffects({
            p1: { speed: Date.now() < state.p1SpeedUntil, frozen: Date.now() < state.p1FrozenUntil, shield: state.p1Shield },
            p2: { speed: Date.now() < state.p2SpeedUntil, frozen: Date.now() < state.p2FrozenUntil, shield: state.p2Shield }
        });
        const p1Score = Number(savedState.p1Score) || 0;
        const p2Score = Number(savedState.p2Score) || 0;
        setMyScore(hostMode ? p1Score : p2Score);
        setOppScore(hostMode ? p2Score : p1Score);
        setRoundNum(Number(savedState.round) || 1);
        setGameState(savedState.gameState || 'playing');
        if (hostMode && savedState.gameState === 'playing') {
            state.status = 'playing';
            gameLoopRef.current = setInterval(hostTick, activeTickRateRef.current);
        }
        hasStartedRef.current = true;
        return true;
    };

    const handleGameStart = (conn, hostMode, oppProf, savedState) => {
        isHostRef.current = hostMode;
        setIsHost(hostMode);
        connRef.current = conn;
        setConnection(conn);
        hasStartedRef.current = false;
        if (oppProf) {
            setOppProfile(oppProf);
            isAIRef.current = !!oppProf.isAI;
        }
        conn.on('data', onData);
        const restored = restoreConnectionState(savedState, hostMode);
        if (hostMode) {
            conn.on('peer-reconnect', () => {
                const state = stateRef.current;
                conn.send({
                    type: 'state_sync',
                    p1Snake: state.p1Snake,
                    p2Snake: state.p2Snake,
                    p1Dir: state.p1Dir,
                    p2Dir: state.p2Dir,
                    apple: state.apple,
                    p1FruitCount: state.p1FruitCount,
                    p2FruitCount: state.p2FruitCount,
                    powerUp: state.powerUp,
                    powerEffects: {
                        p1: { speed: Date.now() < state.p1SpeedUntil, frozen: Date.now() < state.p1FrozenUntil, shield: state.p1Shield },
                        p2: { speed: Date.now() < state.p2SpeedUntil, frozen: Date.now() < state.p2FrozenUntil, shield: state.p2Shield }
                    },
                    p1Score: isHostRef.current ? uiSnapshotRef.current.myScore : uiSnapshotRef.current.oppScore,
                    p2Score: isHostRef.current ? uiSnapshotRef.current.oppScore : uiSnapshotRef.current.myScore,
                    round: uiSnapshotRef.current.roundNum,
                    gameState: uiSnapshotRef.current.gameState,
                    status: state.status
                });
            });
        }
        if (!restored) setGameState('starting');
    };

    const onData = (data) => {
        if (data.type === 'start_countdown') {
            if (!isHostRef.current) {
                if (data.p1Snake) setP1Snake(data.p1Snake);
                if (data.p2Snake) setP2Snake(data.p2Snake);
                if (data.apple) setApple(data.apple);
                setP1FruitCount(0);
                setP2FruitCount(0);
                setPowerUp(null);
                setPowerEffects({ p1: {}, p2: {} });
                stateRef.current.p2Dir = { x: 0, y: -1 };
                stateRef.current.nextP2Dir = { x: 0, y: -1 };
                stateRef.current.p1Dir = { x: 1, y: 0 };
                stateRef.current.nextP1Dir = { x: 1, y: 0 };
                setP1DirectionUI(stateRef.current.p1Dir);
                setP2DirectionUI(stateRef.current.p2Dir);
                stateRef.current.p1FruitCount = 0;
                stateRef.current.p2FruitCount = 0;
            }
            setRoundNum(data.round);
            setGameState('countdown');
            startCountdown();
        }
        if (data.type === 'state_sync' && !isHostRef.current) {
            setP1Snake(data.p1Snake);
            setP2Snake(data.p2Snake);
            if (data.p1Dir) {
                stateRef.current.p1Dir = data.p1Dir;
                setP1DirectionUI(data.p1Dir);
            }
            if (data.p2Dir) {
                stateRef.current.p2Dir = data.p2Dir;
                setP2DirectionUI(data.p2Dir);
            }
            if (data.p1Dir) stateRef.current.nextP1Dir = data.p1Dir;
            if (data.p2Dir) stateRef.current.nextP2Dir = data.p2Dir;
            setApple(data.apple);
            setP1FruitCount(data.p1FruitCount || 0);
            setP2FruitCount(data.p2FruitCount || 0);
            setPowerUp(data.powerUp || null);
            setPowerEffects(data.powerEffects || { p1: {}, p2: {} });
            if (data.status) stateRef.current.status = data.status;
            if (data.gameState) setGameState(data.gameState);
            if (Number.isFinite(data.round)) setRoundNum(data.round);
            if (Number.isFinite(data.p1Score)) setOppScore(data.p1Score);
            if (Number.isFinite(data.p2Score)) setMyScore(data.p2Score);
        }
        if (data.type === 'powerup_picked') {
            const localPlayer = isHostRef.current ? 'p1' : 'p2';
            const who = data.player === localPlayer ? 'أنت' : 'الخصم';
            const effect = data.powerType === 'freeze'
                ? `${who} جمّد الخصم`
                : data.powerType === 'shrink'
                    ? `${who} قصّر ذيل الخصم`
                    : `${who} أخذ ${data.label}`;
            setPowerNotice(effect);
            setTimeout(() => setPowerNotice(''), 2400);
        }
        if (data.type === 'input_sync' && isHostRef.current) {
            const newDir = data.dir;
            const isCardinal = SNAKE_DIRECTIONS.some((direction) => direction.x === newDir?.x && direction.y === newDir?.y);
            if (isCardinal && !isReverseDirection(newDir, stateRef.current.p2Dir) && !isReverseDirection(newDir, stateRef.current.nextP2Dir)) {
                stateRef.current.nextP2Dir = newDir;
            }
        }
        if (data.type === 'round_over' && !isHostRef.current) {
            handleRoundOver(data.result, data.finalP1, data.finalP2);
        }
        if (data.type === 'game_over' && !isHostRef.current) {
            setGameState('game_over');
        }
    };

    const startCountdown = () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
        playSound('click');
        let count = 3;
        setCountdown(count);

        countdownRef.current = setInterval(() => {
            count--;
            if (count > 0) {
                playSound('click');
                setCountdown(count);
            } else {
                playSound('success');
                clearInterval(countdownRef.current);
                countdownRef.current = null;
                setGameState('playing');
                if (isHostRef.current) {
                    stateRef.current.status = 'playing';
                    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
                    activeTickRateRef.current = TICK_RATE;
                    gameLoopRef.current = setInterval(hostTick, TICK_RATE);
                }
            }
        }, 800);
    };

    const startRound = () => {
        if (!isHostRef.current) return;
        
        stateRef.current = {
            p1Snake: INITIAL_P1,
            p2Snake: INITIAL_P2,
            p1Dir: { x: 1, y: 0 },
            p2Dir: { x: 0, y: -1 },
            nextP1Dir: { x: 1, y: 0 },
            nextP2Dir: { x: 0, y: -1 },
            apple: spawnApple(INITIAL_P1, INITIAL_P2),
            powerUp: null,
            p1FruitCount: 0,
            p2FruitCount: 0,
            aiRecentCells: [],
            nextPowerUpAt: Date.now() + randomPowerUpDelay(),
            p1SpeedUntil: 0,
            p2SpeedUntil: 0,
            p1FrozenUntil: 0,
            p2FrozenUntil: 0,
            p1Shield: false,
            p2Shield: false,
            status: 'lobby'
        };
        
        setP1Snake(stateRef.current.p1Snake);
        setP2Snake(stateRef.current.p2Snake);
        setP1DirectionUI(stateRef.current.p1Dir);
        setP2DirectionUI(stateRef.current.p2Dir);
        setApple(stateRef.current.apple);
        setPowerUp(null);
        setP1FruitCount(0);
        setP2FruitCount(0);
        setPowerEffects({ p1: {}, p2: {} });
        
        const nextRound = roundNum + 1;
        setRoundNum(nextRound);
        setGameState('countdown');
        
        connRef.current?.send({
            type: 'start_countdown',
            round: nextRound,
            p1Snake: stateRef.current.p1Snake,
            p2Snake: stateRef.current.p2Snake,
            apple: stateRef.current.apple,
        });
        startCountdown();
    };

    // First start
    useEffect(() => {
        if (gameState === 'starting' && isHostRef.current && !hasStartedRef.current) {
            hasStartedRef.current = true;
            stateRef.current.nextPowerUpAt = Date.now() + randomPowerUpDelay();
            // Slight delay before starting first round
            setTimeout(() => {
                connRef.current?.send({ type: 'start_countdown', round: 1 });
                setGameState('countdown');
                startCountdown();
            }, 1000);
        }
    }, [gameState]);

    // Check game over
    useEffect(() => {
        if (gameState === 'round_over') {
            if (myScore >= WIN_SCORE || oppScore >= WIN_SCORE) {
                setGameState('game_over');
                if (isHostRef.current) {
                    connRef.current?.send({ type: 'game_over' });
                }
                if (myScore > oppScore) {
                    triggerVictoryEffects();
                    awardMatchResult('win', 25);
                } else if (oppScore > myScore) {
                    triggerDefeatEffects();
                    awardMatchResult('loss', 5);
                } else {
                    awardMatchResult('draw', 10);
                }
            } else {
                // Auto start next round if host
                if (isHostRef.current) {
                    setTimeout(startRound, 2500);
                }
            }
        }
    }, [gameState, myScore, oppScore]);

    useEffect(() => {
        return () => {
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, []);

    // --- Rendering Helpers ---

    const myPowerEffects = powerEffects[isHost ? 'p1' : 'p2'] || {};
    const oppPowerEffects = powerEffects[isHost ? 'p2' : 'p1'] || {};
    const myFruitCount = isHost ? p1FruitCount : p2FruitCount;
    const oppFruitCount = isHost ? p2FruitCount : p1FruitCount;

    const renderGrid = () => {
        const cells = [];
        const p1Cells = new Map(p1Snake.map((segment, index) => [cellKey(segment), index]));
        const p2Cells = new Map(p2Snake.map((segment, index) => [cellKey(segment), index]));
        const p1Direction = p1DirectionUI;
        const p2Direction = p2DirectionUI;
        const directionArrow = (direction) => direction?.x === 1 ? '›' : direction?.x === -1 ? '‹' : direction?.y === -1 ? '⌃' : '⌄';
        for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                const key = y * GRID_SIZE + x;
                const p1Index = p1Cells.get(key);
                const p2Index = p2Cells.get(key);
                const isP1 = p1Index !== undefined;
                const isP2 = p2Index !== undefined;
                const isP1Head = p1Index === 0;
                const isP2Head = p2Index === 0;
                const isApple = apple?.x === x && apple?.y === y;
                const isPowerUp = powerUp?.x === x && powerUp?.y === y;
                const isMySnake = isHost ? isP1 : isP2;
                const isMyHead = isHost ? isP1Head : isP2Head;
                const isOppSnake = isHost ? isP2 : isP1;
                const isOppHead = isHost ? isP2Head : isP1Head;
                const headDirection = isHost ? (isP1Head ? p1Direction : p2Direction) : (isP2Head ? p2Direction : p1Direction);

                let classes = 'w-full h-full rounded-[3px] transition-all duration-150 flex items-center justify-center leading-none ';
                if (isMyHead) classes += 'bg-gradient-to-br from-white via-[var(--accent)] to-[var(--accent)] shadow-[0_0_13px_var(--accent-glow)] scale-125 z-20 text-slate-950 font-black text-[11px] rounded-md ';
                else if (isMySnake) classes += 'bg-[var(--accent)] opacity-80 shadow-[0_0_7px_var(--accent-glow)] ';
                else if (isOppHead) classes += 'bg-gradient-to-br from-white to-sky-400 shadow-[0_0_13px_rgba(56,189,248,0.9)] scale-125 z-20 text-slate-950 font-black text-[11px] rounded-md ';
                else if (isOppSnake) classes += 'bg-sky-400 opacity-80 shadow-[0_0_7px_rgba(56,189,248,0.45)] ';
                else if (isPowerUp) classes += 'bg-amber-300/20 text-amber-100 shadow-[0_0_14px_rgba(251,191,36,0.9)] rounded-full scale-125 z-20 text-[11px] animate-pulse ';
                else if (isApple) classes += 'bg-rose-500/20 text-rose-100 shadow-[0_0_13px_rgba(244,63,94,0.9)] rounded-full scale-125 z-10 text-[11px] animate-pulse ';
                else classes += 'bg-white/[0.025] ';

                cells.push(
                    <div key={key} className="aspect-square relative p-[1px]">
                        <div className={classes}>
                            {isPowerUp ? powerUp.emoji : isApple ? '✦' : (isMyHead || isOppHead) ? directionArrow(headDirection) : null}
                        </div>
                    </div>
                );
            }
        }
        return cells;
    };

    if (gameState === 'lobby') {
        return (
            <div className="min-h-dvh max-w-md mx-auto px-4 flex flex-col safe-area-pt overflow-x-hidden overflow-y-auto pb-6">
                <div className="grid grid-cols-3 items-center py-4 mb-4">
                    <div><Logo size="small" /></div>
                    <div className="flex justify-center">
                        <div className="flex items-center gap-2 glass-card px-3.5 py-1.5 rounded-2xl border border-white/10 shrink-0">
                            <GameIcon gameId="snake-arena" size={18} className="text-[var(--accent)]" />
                            <span className="text-xs font-black gradient-text">ثعبان النيون</span>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button onClick={() => setView('hub')} className="glass-card px-4 py-2 rounded-2xl text-xs font-bold hover:scale-105 transition-transform">
                            الرئيسية
                        </button>
                    </div>
                </div>
                <div className="flex-1 flex pb-16 safe-area-pb">
                    <P2PConnectionManager gameIdPrefix="celia-snake" onGameStart={handleGameStart} />
                </div>
            </div>
        );
    }

    return (
        <div 
            className="game-fullscreen-shell fixed inset-0 bg-[#0B101A] flex flex-col font-arabic select-none"
        >
            
            <ConnectionPauseOverlay
                conn={connRef.current}
                opponentName={oppProfile?.nickname}
                onConnectionPause={() => {
                    if (connectionPausedAtRef.current === null) connectionPausedAtRef.current = Date.now();
                    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
                    gameLoopRef.current = null;
                }}
                onConnectionResume={() => {
                    if (connectionPausedAtRef.current !== null && isHostRef.current) {
                        const pausedFor = Date.now() - connectionPausedAtRef.current;
                        const state = stateRef.current;
                        state.nextPowerUpAt += pausedFor;
                        ['p1SpeedUntil', 'p2SpeedUntil', 'p1FrozenUntil', 'p2FrozenUntil'].forEach((key) => {
                            if (state[key] > 0) state[key] += pausedFor;
                        });
                        if (state.powerUp?.expiresAt) state.powerUp.expiresAt += pausedFor;
                    }
                    connectionPausedAtRef.current = null;
                    if (isHostRef.current && stateRef.current.status === 'playing' && !gameLoopRef.current) {
                        gameLoopRef.current = setInterval(hostTick, activeTickRateRef.current);
                    }
                }}
                onLeave={() => { connRef.current?.close(); setView('hub'); }}
            />
            <EmotesOverlay conn={connection} />

            <div className="animated-bg"><div className="bg-orb-1" /><div className="bg-orb-2" /></div>

            <PlayerGameHeader
                gameId="snake-arena"
                myProfile={myProfile}
                oppProfile={oppProfile}
                myScore={myScore}
                oppScore={oppScore}
                statusText={`الهدف: ${WIN_SCORE} نقاط | جولة ${roundNum}`}
                onLeave={() => { connRef.current?.close?.(); setView('hub'); }}
            />

            <div className="flex-1 flex flex-col items-center justify-start sm:justify-center overflow-y-auto p-2 sm:p-4 min-h-0 relative z-10 w-full max-w-lg mx-auto">
                <div className="snake-howto mb-2 w-full max-w-[440px] text-center">
                    <strong>كُل التفاح، كبّر ثعبانك، وابقَ آخر لاعب صامد.</strong>
                    <span>اسحب على اللوحة أو استخدم الأسهم / WASD · الرجوع للخلف غير مسموح</span>
                </div>

                <div className="mb-2 grid w-full max-w-[440px] grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-center" dir="rtl">
                    <div className="flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)]/10 px-2 py-1.5">
                        <span className="text-sm font-black text-[var(--accent)]">{myFruitCount}</span>
                        <span className="text-[10px] font-bold text-white/65">تفاحاتك</span>
                    </div>
                    <span className="text-[9px] font-black leading-tight text-white/40">🍎<br />الجولة</span>
                    <div className="flex items-center justify-center gap-2 rounded-lg bg-sky-400/10 px-2 py-1.5">
                        <span className="text-sm font-black text-sky-300">{oppFruitCount}</span>
                        <span className="text-[10px] font-bold text-white/65">الخصم</span>
                    </div>
                </div>

                <div className="snake-power-guide mb-2 w-full max-w-[440px]" aria-label="القوى الخاصة">
                    <span className="snake-power-title">قوى تظهر أثناء الجولة</span>
                    <span title="تسريع إيقاع الملعب"><i>⚡</i> سرعة</span>
                    <span title="تجميد الخصم لثانيتين"><i>❄️</i> تجميد</span>
                    <span title="تقليص ذيل الخصم"><i>✂️</i> تقليص</span>
                    <span title="الحماية من تصادم واحد"><i>🛡️</i> درع</span>
                </div>
                {(myPowerEffects.speed || oppPowerEffects.speed || myPowerEffects.frozen || myPowerEffects.shield || oppPowerEffects.frozen) && (
                    <div className="mb-2 flex flex-wrap justify-center gap-1.5 text-[10px] font-black">
                        {(myPowerEffects.speed || oppPowerEffects.speed) && <span className="rounded-full bg-amber-300/15 px-2.5 py-1 text-amber-200">⚡ إيقاع الملعب سريع</span>}
                        {myPowerEffects.frozen && <span className="rounded-full bg-sky-300/15 px-2.5 py-1 text-sky-200">❄️ أنت متجمّد</span>}
                        {myPowerEffects.shield && <span className="rounded-full bg-emerald-300/15 px-2.5 py-1 text-emerald-200">🛡️ درعك جاهز</span>}
                        {oppPowerEffects.frozen && <span className="rounded-full bg-sky-300/15 px-2.5 py-1 text-sky-200">❄️ الخصم متجمّد</span>}
                    </div>
                )}
                {powerUp && (
                    <div className="mb-2 text-center text-[10px] font-bold text-amber-100 animate-pulse">
                        {powerUp.emoji} قوة {powerUp.label} ظهرت — الحقها قبل ما تختفي!
                    </div>
                )}
                {powerNotice && (
                    <div role="status" className="mb-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-center text-xs font-black text-amber-100 animate-fade-in">
                        {powerNotice}
                    </div>
                )}
                
                {/* Arena */}
                <div
                    className="snake-arena-board aspect-square bg-[#0F172A] rounded-xl border border-white/10 shadow-2xl overflow-hidden p-2 relative shrink-0 touch-none"
                    style={{ width: 'min(90vw, 46svh, 470px)' }}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={() => { touchStartRef.current = null; }}
                >
                    <div 
                        className="w-full h-full grid"
                        dir="ltr"
                        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
                    >
                        {renderGrid()}
                    </div>

                    {/* Overlays */}
                    {gameState === 'starting' && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                            <div className="text-center animate-pulse">
                                <div className="text-4xl mb-2">🐍</div>
                                <div className="text-white font-black">جاري تجهيز الحلبة...</div>
                            </div>
                        </div>
                    )}
                    
                    {gameState === 'countdown' && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                            <div className="text-7xl font-black text-white drop-shadow-[0_0_20px_var(--accent-glow)] animate-bounce">
                                {countdown}
                            </div>
                        </div>
                    )}

                    {gameState === 'round_over' && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center animate-fade-in">
                            <div className="glass-card p-6 rounded-3xl text-center shadow-2xl border border-white/20 scale-110">
                                <div className="text-4xl mb-2">
                                    {roundResult === 'win' ? '🎉' : roundResult === 'lose' ? '💥' : '🤝'}
                                </div>
                                <div className={`text-2xl font-black mb-1 ${
                                    roundResult === 'win' ? 'text-[var(--accent)] drop-shadow-[0_0_10px_var(--accent-glow)]' :
                                    roundResult === 'lose' ? 'text-rose-400' : 'text-white'
                                }`}>
                                    {roundResult === 'win' ? 'جولة ممتازة!' : roundResult === 'lose' ? 'تحطمت!' : 'تعادل!'}
                                </div>
                                <div className="text-sm text-white/60">
                                    جاري تجهيز الجولة القادمة...
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* D-Pad for Mobile */}
                <div className="snake-arena-dpad mt-2 grid grid-cols-3 gap-1.5 w-40 md:hidden" data-snake-dpad dir="ltr" role="group" aria-label="أزرار تحريك الثعبان">
                    <div />
                    <button onClick={() => handleInput('UP')} disabled={gameState !== 'playing'} aria-label="أعلى" className="aspect-square min-h-11 glass-card rounded-xl flex items-center justify-center text-2xl font-black text-white active:text-amber-200 active:bg-white/20 active:scale-95 disabled:opacity-35">↑</button>
                    <div />
                    <button onClick={() => handleInput('LEFT')} disabled={gameState !== 'playing'} aria-label="يسار" className="aspect-square min-h-11 glass-card rounded-xl flex items-center justify-center text-2xl font-black text-white active:text-amber-200 active:bg-white/20 active:scale-95 disabled:opacity-35">←</button>
                    <button onClick={() => handleInput('DOWN')} disabled={gameState !== 'playing'} aria-label="أسفل" className="aspect-square min-h-11 glass-card rounded-xl flex items-center justify-center text-2xl font-black text-white active:text-amber-200 active:bg-white/20 active:scale-95 disabled:opacity-35">↓</button>
                    <button onClick={() => handleInput('RIGHT')} disabled={gameState !== 'playing'} aria-label="يمين" className="aspect-square min-h-11 glass-card rounded-xl flex items-center justify-center text-2xl font-black text-white active:text-amber-200 active:bg-white/20 active:scale-95 disabled:opacity-35">→</button>
                </div>
            </div>

            {/* Game Over Modal */}
            {gameState === 'game_over' && (
                <div className="safe-area-overlay fixed inset-0 z-50 bg-black/80 backdrop-blur-lg flex items-center justify-center p-4 animate-fade-in">
                    <div className="glass-card max-w-sm w-full p-8 rounded-3xl text-center shadow-2xl border border-white/20 relative overflow-hidden">
                        <div className="text-6xl mb-4 animate-bounce drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                            {myScore >= WIN_SCORE ? '🏆' : '💀'}
                        </div>
                        <h2 className={`text-3xl font-black mb-2 ${myScore >= WIN_SCORE ? 'text-amber-400' : 'text-rose-400'}`}>
                            {myScore >= WIN_SCORE ? 'انتصار ساحق!' : 'حظ أوفر!'}
                        </h2>
                        <div className="flex items-center justify-center gap-6 my-6">
                            <div className="text-center">
                                <div className="text-4xl font-black text-[var(--accent)]">{myScore}</div>
                                <div className="text-xs text-white/50 mt-1">أنت</div>
                            </div>
                            <div className="text-2xl font-black text-white/20">-</div>
                            <div className="text-center">
                                <div className="text-4xl font-black text-sky-400">{oppScore}</div>
                                <div className="text-xs text-white/50 mt-1">{oppProfile?.nickname || 'الخصم'}</div>
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => { playSound('click'); setView('hub'); }}
                                className="w-full py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black text-sm transition-all"
                            >
                                العودة للقائمة
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
