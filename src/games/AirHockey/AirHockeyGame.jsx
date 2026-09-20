import React, { useEffect, useRef, useState, useCallback } from 'react';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import PlayerGameHeader from '../../components/PlayerGameHeader';
import ConnectionPauseOverlay from '../../components/ConnectionPauseOverlay';
import EmotesOverlay from '../../components/EmotesOverlay';
import Logo from '../../components/Logo';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Palette from 'lucide-react/dist/esm/icons/palette';
import Flame from 'lucide-react/dist/esm/icons/flame';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import { playSound, playHaptic } from '../../lib/audioEngine';
import useProfile from '../../hooks/useProfile';
import { triggerVictoryEffects, triggerDefeatEffects } from '../../lib/effectsEngine';
import { AvatarDisplay } from '../../components/icons/AvatarIcons';

const WIN_SCORE = 7;
const TABLE_W = 380;
const TABLE_H = 640;
const PUCK_R = 15;
const PADDLE_R = 34;
const GOAL_W = 140;

const THEMES = {
    'cyber-blue': {
        id: 'cyber-blue',
        name: 'سايبر نيون ⚡',
        bg1: '#07152b',
        bg2: '#040d1a',
        lines: '#38bdf8',
        puckGlow: '#38bdf8',
        puckInner: '#e0f2fe',
        puckOuter: '#0284c7',
        myBase0: '#e0f2fe',
        myBase1: '#38bdf8',
        myBase2: '#0284c7',
        myBase3: '#0c4a6e',
        myHandleGrip: '#0369a1',
        borderClass: 'border-sky-400/50',
        shadowClass: 'shadow-[0_0_40px_rgba(56,189,248,0.25)]',
        colorBadge: 'border-sky-500/40 text-sky-300 bg-sky-500/15',
        accent: '#38bdf8'
    },
    'inferno': {
        id: 'inferno',
        name: 'بركان ناري 🔥',
        bg1: '#260a03',
        bg2: '#100301',
        lines: '#f97316',
        puckGlow: '#f97316',
        puckInner: '#ffedd5',
        puckOuter: '#c2410c',
        myBase0: '#ffedd5',
        myBase1: '#fb923c',
        myBase2: '#ea580c',
        myBase3: '#7c2d12',
        myHandleGrip: '#9a3412',
        borderClass: 'border-orange-500/50',
        shadowClass: 'shadow-[0_0_40px_rgba(249,115,22,0.25)]',
        colorBadge: 'border-orange-500/40 text-orange-300 bg-orange-500/15',
        accent: '#f97316'
    },
    'emerald': {
        id: 'emerald',
        name: 'زمرد وذهب 💎',
        bg1: '#021f14',
        bg2: '#010c08',
        lines: '#10b981',
        puckGlow: '#10b981',
        puckInner: '#d1fae5',
        puckOuter: '#047857',
        myBase0: '#fef08a',
        myBase1: '#eab308',
        myBase2: '#ca8a04',
        myBase3: '#713f12',
        myHandleGrip: '#854d0e',
        borderClass: 'border-emerald-500/50',
        shadowClass: 'shadow-[0_0_40px_rgba(16,185,129,0.25)]',
        colorBadge: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/15',
        accent: '#10b981'
    }
};

// Individual paddle colors for Connect 4 style selection
const PADDLE_COLORS = [
    { id: 'blue',   hex: '#38bdf8', glow: '#38bdf8', main: '#0ea5e9', dark: '#0c4a6e', knob: '#bae6fd', label: 'أزرق 🔵' },
    { id: 'red',    hex: '#f43f5e', glow: '#f43f5e', main: '#e11d48', dark: '#4c0519', knob: '#fecdd3', label: 'أحمر 🔴' },
    { id: 'green',  hex: '#10b981', glow: '#10b981', main: '#059669', dark: '#064e3b', knob: '#a7f3d0', label: 'أخضر 🟢' },
    { id: 'yellow', hex: '#eab308', glow: '#eab308', main: '#ca8a04', dark: '#713f12', knob: '#fef08a', label: 'أصفر 🟡' },
    { id: 'purple', hex: '#a855f7', glow: '#a855f7', main: '#9333ea', dark: '#3b0764', knob: '#e9d5ff', label: 'بنفسجي 🟣' },
    { id: 'pink',   hex: '#ec4899', glow: '#ec4899', main: '#db2777', dark: '#831843', knob: '#fbcfe8', label: 'وردي 🩷' },
    { id: 'cyan',   hex: '#06b6d4', glow: '#06b6d4', main: '#0891b2', dark: '#164e63', knob: '#cffafe', label: 'سماوي 🩵' },
    { id: 'orange', hex: '#f97316', glow: '#f97316', main: '#ea580c', dark: '#7c2d12', knob: '#fed7aa', label: 'برتقالي 🟠' },
];

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// Physics constants — authentic arcade air hockey glide and rail bounces
const FRICTION = 0.994;        // True low-friction air cushion glide across the table
const WALL_BOUNCE = 0.90;      // Crisp, resilient rail bounces without sudden momentum loss
const PADDLE_BOUNCE = 1.05;    // Energetic, punchy hits
const MAX_SPEED = 14;          // Exciting yet controllable speed

export default function AirHockeyGame({ setView }) {
    const connRef = useRef(null);
    const isHostRef = useRef(false);
    const [myProfile, , awardMatchResult] = useProfile();
    const [oppProfile, setOppProfile] = useState(null);

    const [gameState, setGameState] = useState('lobby');
    const [myScore, setMyScore] = useState(0);
    const [oppScore, setOppScore] = useState(0);
    const [winner, setWinner] = useState(null);
    const [goalBanner, setGoalBanner] = useState(null);

    // Custom Themes, AI Difficulty, and Paddle Colors
    const [theme, setTheme] = useState('cyber-blue');
    const themeRef = useRef('cyber-blue');
    themeRef.current = theme;

    const [hostColor, setHostColor] = useState('blue');
    const [oppColor, setOppColor] = useState('red');

    const getPaddleColorConfig = (myId, oppId) => {
        const myCol = PADDLE_COLORS.find(c => c.id === myId) || PADDLE_COLORS[0];
        const oppCol = PADDLE_COLORS.find(c => c.id === oppId) || PADDLE_COLORS[1];
        return {
            myGlow: myCol.glow,
            myMain: myCol.main,
            myDark: myCol.dark,
            myKnob: myCol.knob,
            oppGlow: oppCol.glow,
            oppMain: oppCol.main,
            oppDark: oppCol.dark,
            oppKnob: oppCol.knob,
            myHex: myCol.hex,
            oppHex: oppCol.hex,
            myLabel: myCol.label,
            oppLabel: oppCol.label
        };
    };

    const paddleColorsRef = useRef(getPaddleColorConfig('blue', 'red'));
    const idleCounterRef = useRef(0);

    const applyPaddleColors = (myId, oppId) => {
        paddleColorsRef.current = getPaddleColorConfig(myId, oppId);
    };

    const [aiDifficulty, setAiDifficulty] = useState('medium');
    const [isAI, setIsAI] = useState(false);

    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const scaleRef = useRef(1);
    const dprRef = useRef(1);
    const rafRef = useRef(null);
    const gameActiveRef = useRef(false);
    const isFreezeRef = useRef(false);

    // Physics state refs
    const puckRef = useRef({ x: TABLE_W / 2, y: TABLE_H / 2, vx: 0, vy: 0 });
    const myPaddleRef = useRef({ x: TABLE_W / 2, y: TABLE_H - 95 });
    const oppPaddleRef = useRef({ x: TABLE_W / 2, y: 95 });
    const myScoreRef = useRef(0);
    const oppScoreRef = useRef(0);
    const isDraggingRef = useRef(false);

    // Dynamic Velocity Tracking for realistic smash & slap shots
    const myPaddleVelRef = useRef({
        vx: 0,
        vy: 0,
        lastX: TABLE_W / 2,
        lastY: TABLE_H - 95,
        lastTime: performance.now()
    });
    const oppPaddleVelRef = useRef({ vx: 0, vy: 0 });

    // Particles & Speed Trail
    const particlesRef = useRef([]);
    const puckTrailRef = useRef([]);
    const goalFlashRef = useRef(0);

    // Throttle P2P sends — SEPARATE refs so puck_sync is never blocked by paddle_move
    const lastSendRef = useRef(0);       // for paddle_move throttle
    const lastPuckSyncRef = useRef(0);   // for puck_sync throttle (independent!)

    // Smooth interpolation: store received position as target, lerp each frame
    const oppPaddleTargetRef = useRef({ x: TABLE_W / 2, y: 95 });

    const changeDifficulty = (level) => {
        setAiDifficulty(level);
        playSound('pop');
        if (connRef.current?.isAI) {
            connRef.current.send({ type: 'set_difficulty', level });
        }
    };

    const cycleTheme = () => {
        const keys = Object.keys(THEMES);
        const nextIdx = (keys.indexOf(theme) + 1) % keys.length;
        const nextTheme = keys[nextIdx];
        setTheme(nextTheme);
        playSound('whoosh');
        connRef.current?.send({ type: 'set_theme', theme: nextTheme });
    };

    const handleGameStart = (conn, hostMode, oppProf) => {
        isHostRef.current = hostMode;
        connRef.current = conn;
        const isAIPlayer = !!conn.isAI;
        setIsAI(isAIPlayer);
        if (oppProf) setOppProfile(oppProf);
        conn.on('data', onData);
        if (isAIPlayer) {
            conn.send({ type: 'set_difficulty', level: aiDifficulty });
            setGameState('setup');
        } else {
            setGameState(hostMode ? 'setup' : 'waiting-start');
        }
    };

    const handleStartGame = () => {
        const config = {
            hostColor,
            oppColor,
            theme,
        };
        // Host sends config to peer then launches
        connRef.current?.send({ type: 'start', config });
        applyPaddleColors(hostColor, oppColor);
        launchGame();
    };

    const launchGame = () => {
        setMyScore(0);
        setOppScore(0);
        myScoreRef.current = 0;
        oppScoreRef.current = 0;
        setWinner(null);
        setGoalBanner(null);
        particlesRef.current = [];
        puckTrailRef.current = [];
        goalFlashRef.current = 0;
        setGameState('playing');
        playSound('hockey_hit');
        resetToServe(null);
    };

    // Serve Reset Mechanic: Places the puck calmly in front of the conceded player's goal with 0 velocity
    const resetToServe = (concededBy) => {
        isFreezeRef.current = true;
        puckTrailRef.current = [];

        // Reset both paddles to defensive line in front of their goals
        myPaddleRef.current = { x: TABLE_W / 2, y: TABLE_H - 95 };
        oppPaddleRef.current = { x: TABLE_W / 2, y: 95 };
        myPaddleVelRef.current = { vx: 0, vy: 0, lastX: TABLE_W / 2, lastY: TABLE_H - 95, lastTime: performance.now() };
        oppPaddleVelRef.current = { vx: 0, vy: 0 };

        let spawnX = TABLE_W / 2;
        let spawnY = TABLE_H / 2;
        let text = '';
        let color = '';

        if (concededBy === 'me') {
            // Player conceded: puck appears in front of player's goal (Player serves)
            spawnY = TABLE_H - 175;
            text = 'ضربة البداية لك 🏒 استعد للعب';
            color = 'text-sky-300 border-sky-500/60 bg-sky-950/90 shadow-[0_0_30px_rgba(56,189,248,0.3)]';
        } else if (concededBy === 'opp') {
            // Opponent conceded: puck appears in front of opponent's goal (Opponent serves)
            spawnY = 175;
            text = 'ضربة البداية للخصم 🏒';
            color = 'text-rose-300 border-rose-500/60 bg-rose-950/90 shadow-[0_0_30px_rgba(244,63,94,0.3)]';
        } else {
            // Match kickoff — spawn in player's half so they can serve first
            spawnY = TABLE_H - 175;
            text = 'ضربة البداية 🏒 استعدوا';
            color = 'text-amber-300 border-amber-500/60 bg-amber-950/90 shadow-[0_0_30px_rgba(245,158,11,0.3)]';
        }

        puckRef.current = {
            x: spawnX,
            y: spawnY,
            vx: 0,
            vy: 0
        };

        setGoalBanner({ text, color });

        // Inform peer / AI
        connRef.current?.send({
            type: 'serve_reset',
            puckX: spawnX,
            puckY: spawnY,
            concededBy
        });

        // 1.3 second calm pause so both players can position themselves without rush
        setTimeout(() => {
            setGoalBanner(null);
            isFreezeRef.current = false;
        }, 1300);
    };

    const onData = useCallback((msg) => {
        if (!msg || !msg.type) return;

        switch (msg.type) {
            case 'paddle_move': {
                // Store as target — game loop interpolates towards it for buttery smoothness
                oppPaddleTargetRef.current = {
                    x: TABLE_W - msg.x,
                    y: TABLE_H - msg.y
                };
                if (msg.vx !== undefined && msg.vy !== undefined) {
                    oppPaddleVelRef.current = { vx: -msg.vx, vy: -msg.vy };
                }
                break;
            }

            case 'puck_sync': {
                if (!isHostRef.current) {
                    puckRef.current = {
                        x: TABLE_W - msg.x,
                        y: TABLE_H - msg.y,
                        vx: -msg.vx,
                        vy: -msg.vy
                    };
                }
                break;
            }

            case 'serve_reset': {
                puckRef.current = {
                    x: TABLE_W - msg.puckX,
                    y: TABLE_H - msg.puckY,
                    vx: 0,
                    vy: 0
                };
                myPaddleRef.current = { x: TABLE_W / 2, y: TABLE_H - 95 };
                oppPaddleRef.current = { x: TABLE_W / 2, y: 95 };
                isFreezeRef.current = true;
                const isMyServe = msg.concededBy === (isHostRef.current ? 'opp' : 'me');
                setGoalBanner({
                    text: isMyServe ? 'ضربة البداية لك 🏒 استعد للعب' : 'ضربة البداية للخصم 🏒',
                    color: isMyServe
                        ? 'text-sky-300 border-sky-500/60 bg-sky-950/90 shadow-[0_0_30px_rgba(56,189,248,0.3)]'
                        : 'text-rose-300 border-rose-500/60 bg-rose-950/90 shadow-[0_0_30px_rgba(244,63,94,0.3)]'
                });
                setTimeout(() => {
                    setGoalBanner(null);
                    isFreezeRef.current = false;
                }, 1300);
                break;
            }

            case 'set_theme': {
                if (msg.theme && THEMES[msg.theme]) {
                    setTheme(msg.theme);
                }
                break;
            }

            case 'profile_update': {
                if (msg.profile) {
                    setOppProfile(prev => ({ ...(prev || {}), ...msg.profile }));
                }
                break;
            }

            case 'start': {
                const cfg = msg.config || {};
                if (cfg.theme && THEMES[cfg.theme]) setTheme(cfg.theme);
                // Peer receives host config: Peer's paddle is oppColor, opponent's paddle is hostColor
                const pMy = cfg.oppColor || 'red';
                const pOpp = cfg.hostColor || 'blue';
                applyPaddleColors(pMy, pOpp);
                launchGame();
                break;
            }

            case 'restart':
            case 'rematch_req': {
                setGameState(isHostRef.current ? 'setup' : 'waiting-start');
                break;
            }

            case 'goal': {
                if (msg.scorer === 'host') {
                    if (isHostRef.current) {
                        handleGoal('me');
                    } else {
                        handleGoal('opp');
                    }
                } else {
                    if (isHostRef.current) {
                        handleGoal('opp');
                    } else {
                        handleGoal('me');
                    }
                }
                break;
            }

            case 'rematch':
                launchGame();
                break;

            default:
                break;
        }
    }, []);

    const createImpactSparks = (x, y, color = '#38bdf8', count = 12) => {
        for (let i = 0; i < count; i++) {
            const spd = Math.random() * 3.5 + 1.2;
            const ang = Math.random() * Math.PI * 2;
            particlesRef.current.push({
                x,
                y,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                radius: Math.random() * 2 + 1,
                life: 1.0,
                decay: 0.04 + Math.random() * 0.03,
                color
            });
        }
    };

    const handleGoal = (scorer) => {
        playSound('hockey_goal');
        playHaptic(75);
        goalFlashRef.current = 1.0;

        let newMy = myScoreRef.current;
        let newOpp = oppScoreRef.current;

        if (scorer === 'me') {
            newMy++;
            myScoreRef.current = newMy;
            createImpactSparks(TABLE_W / 2, 20, '#10b981', 30);
        } else {
            newOpp++;
            oppScoreRef.current = newOpp;
            createImpactSparks(TABLE_W / 2, TABLE_H - 20, '#f43f5e', 30);
        }

        setMyScore(newMy);
        setOppScore(newOpp);

        if (newMy >= WIN_SCORE || newOpp >= WIN_SCORE) {
            const w = newMy >= WIN_SCORE ? 'me' : 'opp';
            setWinner(w);
            setGameState('gameover');
            gameActiveRef.current = false;
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (w === 'me') {
                awardMatchResult(true);
                triggerVictoryEffects();
                if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100, 50, 200]);
            } else {
                awardMatchResult(false);
                triggerDefeatEffects();
            }
        } else {
            // When goal is scored, player who was scored against gets the serve!
            resetToServe(scorer === 'me' ? 'opp' : 'me');
        }
    };

    // Sub-stepped physics for rock-solid collision detection without tunneling
    const updatePhysicsStep = () => {
        if (isFreezeRef.current) return;

        const p = puckRef.current;
        const myPad = myPaddleRef.current;
        const oppPad = oppPaddleRef.current;

        // Move puck
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= FRICTION;
        p.vy *= FRICTION;

        // Clamp max velocity to comfortable human reaction speed
        const curSpd = Math.hypot(p.vx, p.vy);
        if (curSpd > MAX_SPEED) {
            p.vx = (p.vx / curSpd) * MAX_SPEED;
            p.vy = (p.vy / curSpd) * MAX_SPEED;
        }

        // Left / right walls
        if (p.x - PUCK_R < 0) {
            p.x = PUCK_R;
            p.vx = Math.abs(p.vx) * WALL_BOUNCE;
            playSound('hockey_wall');
            createImpactSparks(p.x, p.y, '#38bdf8', 6);
        }
        if (p.x + PUCK_R > TABLE_W) {
            p.x = TABLE_W - PUCK_R;
            p.vx = -Math.abs(p.vx) * WALL_BOUNCE;
            playSound('hockey_wall');
            createImpactSparks(p.x, p.y, '#38bdf8', 6);
        }

        // Goal zones
        const goalLeft = (TABLE_W - GOAL_W) / 2;
        const goalRight = goalLeft + GOAL_W;

        // Top wall / opponent goal (host scores)
        if (p.y - PUCK_R < 0) {
            if (p.x > goalLeft && p.x < goalRight) {
                connRef.current?.send({ type: 'goal', scorer: 'host' });
                handleGoal('me');
                return;
            } else {
                p.y = PUCK_R;
                p.vy = Math.abs(p.vy) * WALL_BOUNCE;
                playSound('hockey_wall');
                createImpactSparks(p.x, p.y, '#f43f5e', 8);
            }
        }

        // Bottom wall / my goal (opponent scores)
        if (p.y + PUCK_R > TABLE_H) {
            if (p.x > goalLeft && p.x < goalRight) {
                connRef.current?.send({ type: 'goal', scorer: 'peer' });
                handleGoal('opp');
                return;
            } else {
                p.y = TABLE_H - PUCK_R;
                p.vy = -Math.abs(p.vy) * WALL_BOUNCE;
                playSound('hockey_wall');
                createImpactSparks(p.x, p.y, '#10b981', 8);
            }
        }

        // Paddle collision: My Paddle (bottom striker)
        const dxMy = p.x - myPad.x;
        const dyMy = p.y - myPad.y;
        const distMy = Math.hypot(dxMy, dyMy);
        if (distMy < PUCK_R + PADDLE_R) {
            const nx = dxMy / (distMy || 1);
            const ny = dyMy / (distMy || 1);
            const overlap = PUCK_R + PADDLE_R - distMy;
            p.x += nx * overlap;
            p.y += ny * overlap;

            const dot = p.vx * nx + p.vy * ny;
            if (dot < 0) {
                p.vx = (p.vx - 2 * dot * nx) * PADDLE_BOUNCE;
                p.vy = (p.vy - 2 * dot * ny) * PADDLE_BOUNCE;
            }

            // Dynamic paddle impulse — controlled and skill-based, not random
            const swingX = clamp(myPaddleVelRef.current.vx * 0.32, -5, 5);
            const swingY = clamp(myPaddleVelRef.current.vy * 0.32, -5, 5);
            p.vx = clamp(p.vx + swingX + nx * 2.0, -MAX_SPEED, MAX_SPEED);
            p.vy = clamp(p.vy + swingY + ny * 2.0, -MAX_SPEED, MAX_SPEED);

            // Minimum departure speed — low enough that soft touches stay soft
            const curSpdMy = Math.hypot(p.vx, p.vy);
            if (curSpdMy < 3.5) {
                const boost = 3.5 / (curSpdMy || 1);
                p.vx *= boost;
                p.vy *= boost;
            }

            if (curSpdMy > 10 || Math.hypot(swingX, swingY) > 3.5) {
                playSound('hockey_slap');
                playHaptic(35);
            } else {
                playSound('hockey_hit');
                playHaptic(16);
            }
            createImpactSparks(p.x, p.y, '#38bdf8', 12);
        }

        // Paddle collision: Opponent Paddle (top striker)
        const dxOpp = p.x - oppPad.x;
        const dyOpp = p.y - oppPad.y;
        const distOpp = Math.hypot(dxOpp, dyOpp);
        if (distOpp < PUCK_R + PADDLE_R) {
            const nx = dxOpp / (distOpp || 1);
            const ny = dyOpp / (distOpp || 1);
            const overlap = PUCK_R + PADDLE_R - distOpp;
            p.x += nx * overlap;
            p.y += ny * overlap;

            const dot = p.vx * nx + p.vy * ny;
            if (dot < 0) {
                p.vx = (p.vx - 2 * dot * nx) * PADDLE_BOUNCE;
                p.vy = (p.vy - 2 * dot * ny) * PADDLE_BOUNCE;
            }

            const swingX = clamp(oppPaddleVelRef.current.vx * 0.32, -5, 5);
            const swingY = clamp(oppPaddleVelRef.current.vy * 0.32, -5, 5);
            p.vx = clamp(p.vx + swingX + nx * 2.0, -MAX_SPEED, MAX_SPEED);
            p.vy = clamp(p.vy + swingY + ny * 2.0, -MAX_SPEED, MAX_SPEED);

            const curSpdOpp = Math.hypot(p.vx, p.vy);
            if (curSpdOpp < 3.5) {
                const boost = 3.5 / (curSpdOpp || 1);
                p.vx *= boost;
                p.vy *= boost;
            }

            if (curSpdOpp > 10 || Math.hypot(swingX, swingY) > 4.0) {
                playSound('hockey_slap');
            } else {
                playSound('hockey_hit');
            }
            createImpactSparks(p.x, p.y, '#f43f5e', 12);
        }
    };

    // Main 60FPS Game Loop
    const gameLoop = useCallback(() => {
        if (!gameActiveRef.current) return;
        rafRef.current = requestAnimationFrame(gameLoop);

        const p = puckRef.current;

        // Sub-stepping for host
        if (isHostRef.current) {
            updatePhysicsStep();
            updatePhysicsStep();

            // Sync puck to AI/peer every 20ms — uses its own dedicated ref, never blocked by paddle sends
            const now = Date.now();
            if (now - lastPuckSyncRef.current > 20 && connRef.current) {
                lastPuckSyncRef.current = now;
                connRef.current.send({
                    type: 'puck_sync',
                    x: p.x,
                    y: p.y,
                    vx: p.vx,
                    vy: p.vy
                });
            }
        } else {
            // Peer smooth dead-reckoning (only when not frozen during serve)
            if (!isFreezeRef.current) {
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= FRICTION;
                p.vy *= FRICTION;
            }
        }

        // Record speed trail
        const speed = Math.hypot(p.vx, p.vy);
        if (speed > 5) {
            puckTrailRef.current.push({ x: p.x, y: p.y, alpha: 0.7 });
            if (puckTrailRef.current.length > 8) puckTrailRef.current.shift();
        } else if (puckTrailRef.current.length > 0) {
            puckTrailRef.current.shift();
        }

        // Update particles
        particlesRef.current.forEach(pt => {
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.life -= pt.decay;
        });
        particlesRef.current = particlesRef.current.filter(pt => pt.life > 0);

        if (goalFlashRef.current > 0) {
            goalFlashRef.current = Math.max(0, goalFlashRef.current - 0.04);
        }

        // Lerp opponent paddle towards target — silky smooth regardless of P2P jitter
        const LERP = 0.35;
        const oTarget = oppPaddleTargetRef.current;
        const oCur = oppPaddleRef.current;
        oppPaddleRef.current = {
            x: oCur.x + (oTarget.x - oCur.x) * LERP,
            y: oCur.y + (oTarget.y - oCur.y) * LERP
        };

        // Render frame
        drawFrame();
    }, []);

    const drawFrame = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const scale = scaleRef.current;
        const dpr = dprRef.current;
        const curTheme = THEMES[themeRef.current] || THEMES['cyber-blue'];

        ctx.save();
        ctx.scale(scale * dpr, scale * dpr);
        ctx.clearRect(0, 0, TABLE_W, TABLE_H);

        // ── 1. Cyber Ice Surface Gradient ──
        const bgGrad = ctx.createLinearGradient(0, 0, 0, TABLE_H);
        bgGrad.addColorStop(0, curTheme.bg2);
        bgGrad.addColorStop(0.3, curTheme.bg1);
        bgGrad.addColorStop(0.5, curTheme.bg2);
        bgGrad.addColorStop(0.7, curTheme.bg1);
        bgGrad.addColorStop(1, curTheme.bg2);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, TABLE_W, TABLE_H);

        // ── 2. Air Cushion Perforation Micro-Grid ──
        ctx.fillStyle = `${curTheme.lines}10`;
        for (let gx = 25; gx < TABLE_W; gx += 28) {
            for (let gy = 25; gy < TABLE_H; gy += 28) {
                ctx.beginPath();
                ctx.arc(gx, gy, 1.2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // ── 3. Outer Neon Bumper Rail Border ──
        ctx.strokeStyle = `${curTheme.lines}55`;
        ctx.lineWidth = 3;
        ctx.strokeRect(3, 3, TABLE_W - 6, TABLE_H - 6);

        // Inner glowing border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
        ctx.lineWidth = 1;
        ctx.strokeRect(8, 8, TABLE_W - 16, TABLE_H - 16);

        // ── 4. Under-Ice Digital LED Scores (Opponent Top & Player Bottom) ──
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Opponent's In-Ice Giant Score
        ctx.fillStyle = 'rgba(244, 63, 94, 0.18)';
        ctx.font = '900 86px monospace, sans-serif';
        ctx.fillText(String(oppScoreRef.current), TABLE_W / 2, TABLE_H * 0.28);

        // Player's In-Ice Giant Score
        ctx.fillStyle = `${curTheme.lines}25`;
        ctx.font = '900 86px monospace, sans-serif';
        ctx.fillText(String(myScoreRef.current), TABLE_W / 2, TABLE_H * 0.72);

        // Goal target pips (7 dots) on both sides under ice
        for (let i = 0; i < WIN_SCORE; i++) {
            // Opponent goal dots (Top)
            ctx.beginPath();
            ctx.arc(TABLE_W / 2 - 45 + i * 15, TABLE_H * 0.38, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = i < oppScoreRef.current ? '#f43f5e' : 'rgba(244, 63, 94, 0.2)';
            ctx.fill();

            // Player goal dots (Bottom)
            ctx.beginPath();
            ctx.arc(TABLE_W / 2 - 45 + i * 15, TABLE_H * 0.62, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = i < myScoreRef.current ? curTheme.lines : `${curTheme.lines}30`;
            ctx.fill();
        }
        ctx.restore();

        // ── 5. Center Line & Face-off Circle ──
        ctx.setLineDash([10, 6]);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(8, TABLE_H / 2);
        ctx.lineTo(TABLE_W - 8, TABLE_H / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Faceoff outer circle
        ctx.strokeStyle = `${curTheme.lines}77`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(TABLE_W / 2, TABLE_H / 2, 56, 0, Math.PI * 2);
        ctx.stroke();

        // Faceoff center glowing dot
        ctx.fillStyle = curTheme.lines;
        ctx.beginPath();
        ctx.arc(TABLE_W / 2, TABLE_H / 2, 5, 0, Math.PI * 2);
        ctx.fill();

        // ── 6. Goal Creases & Laser Gates ──
        const goalLeft = (TABLE_W - GOAL_W) / 2;
        const goalRight = goalLeft + GOAL_W;

        // Top Goal (Opponent / Red laser gate)
        const topGoalGrad = ctx.createLinearGradient(0, 0, 0, 24);
        topGoalGrad.addColorStop(0, 'rgba(244, 63, 94, 0.5)');
        topGoalGrad.addColorStop(1, 'rgba(244, 63, 94, 0.02)');
        ctx.fillStyle = topGoalGrad;
        ctx.fillRect(goalLeft, 0, GOAL_W, 24);

        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(goalLeft, 0);
        ctx.lineTo(goalRight, 0);
        ctx.stroke();

        // Top Goal arc crease
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(TABLE_W / 2, 0, 80, 0, Math.PI);
        ctx.stroke();

        // Bottom Goal (Player / Themed laser gate)
        const botGoalGrad = ctx.createLinearGradient(0, TABLE_H, 0, TABLE_H - 24);
        botGoalGrad.addColorStop(0, `${curTheme.lines}88`);
        botGoalGrad.addColorStop(1, `${curTheme.lines}05`);
        ctx.fillStyle = botGoalGrad;
        ctx.fillRect(goalLeft, TABLE_H - 24, GOAL_W, 24);

        ctx.strokeStyle = curTheme.lines;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(goalLeft, TABLE_H);
        ctx.lineTo(goalRight, TABLE_H);
        ctx.stroke();

        // Bottom Goal arc crease
        ctx.strokeStyle = `${curTheme.lines}55`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(TABLE_W / 2, TABLE_H, 80, Math.PI, 0);
        ctx.stroke();

        // ── 7. Goal Flash Explosion Ring ──
        if (goalFlashRef.current > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${goalFlashRef.current * 0.3})`;
            ctx.fillRect(0, 0, TABLE_W, TABLE_H);
        }

        // ── 8. Speed Trails ──
        puckTrailRef.current.forEach((t, i) => {
            const frac = (i + 1) / puckTrailRef.current.length;
            ctx.fillStyle = `${curTheme.lines}${Math.floor(frac * 90).toString(16).padStart(2, '0')}`;
            ctx.beginPath();
            ctx.arc(t.x, t.y, PUCK_R * frac * 0.8, 0, Math.PI * 2);
            ctx.fill();
        });

        // ── 9. Collision Particles ──
        particlesRef.current.forEach(pt => {
            ctx.fillStyle = pt.color;
            ctx.globalAlpha = pt.life;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        });

        // ── 10. Opponent Striker Mallet (dynamic color from host selection) ──
        const opp = oppPaddleRef.current;
        const pc = paddleColorsRef.current;
        ctx.shadowColor = pc.oppGlow;
        ctx.shadowBlur = 14;

        const oppBaseGrad = ctx.createRadialGradient(opp.x - 5, opp.y - 5, 4, opp.x, opp.y, PADDLE_R);
        oppBaseGrad.addColorStop(0, pc.oppKnob);
        oppBaseGrad.addColorStop(0.4, pc.oppGlow);
        oppBaseGrad.addColorStop(0.85, pc.oppMain);
        oppBaseGrad.addColorStop(1, pc.oppDark);
        ctx.fillStyle = oppBaseGrad;
        ctx.beginPath();
        ctx.arc(opp.x, opp.y, PADDLE_R, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = pc.oppKnob;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = pc.oppDark;
        ctx.beginPath();
        ctx.arc(opp.x, opp.y, 16, 0, Math.PI * 2);
        ctx.fill();

        const oppKnobGrad = ctx.createRadialGradient(opp.x - 3, opp.y - 3, 2, opp.x, opp.y, 10);
        oppKnobGrad.addColorStop(0, '#ffffff');
        oppKnobGrad.addColorStop(0.5, pc.oppGlow);
        oppKnobGrad.addColorStop(1, pc.oppMain);
        ctx.fillStyle = oppKnobGrad;
        ctx.beginPath();
        ctx.arc(opp.x, opp.y, 10, 0, Math.PI * 2);
        ctx.fill();

        // ── 11. Player Striker Mallet (dynamic color from host selection) ──
        const my = myPaddleRef.current;
        ctx.shadowColor = pc.myGlow;
        ctx.shadowBlur = 14;

        const myBaseGrad = ctx.createRadialGradient(my.x - 5, my.y - 5, 4, my.x, my.y, PADDLE_R);
        myBaseGrad.addColorStop(0, pc.myKnob);
        myBaseGrad.addColorStop(0.35, pc.myGlow);
        myBaseGrad.addColorStop(0.8, pc.myMain);
        myBaseGrad.addColorStop(1, pc.myDark);
        ctx.fillStyle = myBaseGrad;
        ctx.beginPath();
        ctx.arc(my.x, my.y, PADDLE_R, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = pc.myKnob;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = pc.myDark;
        ctx.beginPath();
        ctx.arc(my.x, my.y, 16, 0, Math.PI * 2);
        ctx.fill();

        const myKnobGrad = ctx.createRadialGradient(my.x - 3, my.y - 3, 2, my.x, my.y, 10);
        myKnobGrad.addColorStop(0, '#ffffff');
        myKnobGrad.addColorStop(0.5, pc.myGlow);
        myKnobGrad.addColorStop(1, pc.myMain);
        ctx.fillStyle = myKnobGrad;
        ctx.beginPath();
        ctx.arc(my.x, my.y, 10, 0, Math.PI * 2);
        ctx.fill();

        // ── 12. High-Tech Neon Energy Puck ──
        const pk = puckRef.current;
        ctx.shadowColor = curTheme.puckGlow;
        ctx.shadowBlur = 16;

        const puckGrad = ctx.createRadialGradient(pk.x - 4, pk.y - 4, 2, pk.x, pk.y, PUCK_R);
        puckGrad.addColorStop(0, '#ffffff');
        puckGrad.addColorStop(0.45, curTheme.puckInner);
        puckGrad.addColorStop(0.8, curTheme.lines);
        puckGrad.addColorStop(1, curTheme.puckOuter);
        ctx.fillStyle = puckGrad;
        ctx.beginPath();
        ctx.arc(pk.x, pk.y, PUCK_R, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Puck center emblem
        ctx.fillStyle = '#0369a1';
        ctx.beginPath();
        ctx.arc(pk.x, pk.y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    };

    // Pointer Event Handlers with dynamic velocity calculation for smash shots
    const updateMyPaddlePosition = useCallback((clientX, clientY) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const s = scaleRef.current;
        const rawX = (clientX - rect.left) / s;
        const rawY = (clientY - rect.top) / s;

        // Player can reach up to and across center line (no deadzone)
        const newX = clamp(rawX, PADDLE_R + 5, TABLE_W - PADDLE_R - 5);
        const newY = clamp(rawY, TABLE_H / 2 - 8, TABLE_H - PADDLE_R - 5);

        // Track velocity with calm scaling
        const now = performance.now();
        const dt = Math.max(10, now - myPaddleVelRef.current.lastTime);
        const vx = ((newX - myPaddleVelRef.current.lastX) / dt) * 10;
        const vy = ((newY - myPaddleVelRef.current.lastY) / dt) * 10;

        myPaddleVelRef.current = {
            vx: clamp(vx, -8, 8),
            vy: clamp(vy, -8, 8),
            lastX: newX,
            lastY: newY,
            lastTime: now
        };

        myPaddleRef.current = { x: newX, y: newY };

        // Send to opponent
        const sendNow = Date.now();
        if (sendNow - lastSendRef.current > 25 && connRef.current) {
            lastSendRef.current = sendNow;
            connRef.current.send({
                type: 'paddle_move',
                x: newX,
                y: newY,
                vx: myPaddleVelRef.current.vx,
                vy: myPaddleVelRef.current.vy
            });
        }
    }, []);

    const onPointerDown = (e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        isDraggingRef.current = true;
        updateMyPaddlePosition(e.clientX, e.clientY);
    };

    const onPointerMove = (e) => {
        if (isDraggingRef.current || e.pointerType === 'mouse') {
            updateMyPaddlePosition(e.clientX, e.clientY);
        }
    };

    const onPointerUp = (e) => {
        isDraggingRef.current = false;
        myPaddleVelRef.current.vx = 0;
        myPaddleVelRef.current.vy = 0;
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        } catch (_) {}
    };

    useEffect(() => {
        if (gameState !== 'playing') {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            gameActiveRef.current = false;
            return;
        }

        const updateScale = () => {
            if (!containerRef.current || !canvasRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const availW = Math.max(260, rect.width - 24);
            const availH = Math.max(340, rect.height - 24);
            const scale = Math.min(availW / TABLE_W, availH / TABLE_H, 1.2);
            scaleRef.current = scale > 0 ? scale : 0.8;

            const dpr = window.devicePixelRatio || 1;
            dprRef.current = dpr;

            if (canvasRef.current) {
                canvasRef.current.width = Math.round(TABLE_W * scaleRef.current * dpr);
                canvasRef.current.height = Math.round(TABLE_H * scaleRef.current * dpr);
                canvasRef.current.style.width = `${TABLE_W * scaleRef.current}px`;
                canvasRef.current.style.height = `${TABLE_H * scaleRef.current}px`;
            }
        };

        updateScale();
        const timer = setTimeout(updateScale, 50);
        window.addEventListener('resize', updateScale);

        // Start animation loop
        gameActiveRef.current = true;
        rafRef.current = requestAnimationFrame(gameLoop);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updateScale);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            gameActiveRef.current = false;
        };
    }, [gameState, gameLoop]);

    const handleRematch = () => {
        if (isHostRef.current) {
            setGameState('setup');
            connRef.current?.send({ type: 'restart' });
        } else {
            connRef.current?.send({ type: 'rematch_req' });
            setGameState('waiting-start');
        }
    };

    if (gameState === 'lobby') {
        return (
            <>
                <div className="animated-bg"><div className="bg-orb-1" /><div className="bg-orb-2" /></div>
                <div className="min-h-dvh max-w-lg mx-auto px-4 flex flex-col safe-area-pt overflow-x-hidden overflow-y-auto pb-6">
                    <div className="flex justify-between items-center py-4 mb-2">
                        <Logo size="small" />
                        <button
                            onClick={() => { gameActiveRef.current = false; connRef.current?.close?.(); setView('hub'); }}
                            className="glass-card px-4 py-2 rounded-2xl text-xs font-bold hover:scale-105 active:scale-95 transition-transform text-white/90"
                        >
                            الرئيسية
                        </button>
                    </div>

                    <div className="flex-1 flex pb-16 safe-area-pb">
                        <P2PConnectionManager
                            gameIdPrefix="celia-hockey"
                            onGameStart={handleGameStart}
                        />
                    </div>
                </div>
            </>
        );
    }

    if (gameState === 'setup') {
        return (
            <>
                <div className="animated-bg"><div className="bg-orb-1" /><div className="bg-orb-2" /></div>
                <div className="min-h-dvh max-w-lg mx-auto px-4 flex flex-col safe-area-pt overflow-x-hidden overflow-y-auto pb-8">
                    <div className="flex justify-between items-center py-4 mb-2">
                        <Logo size="small" />
                        <button
                            onClick={() => { gameActiveRef.current = false; connRef.current?.close?.(); setView('hub'); }}
                            className="glass-card px-4 py-2 rounded-2xl text-xs font-bold hover:scale-105 active:scale-95 transition-transform text-white/90"
                        >
                            الرئيسية
                        </button>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center my-auto px-2">
                        <div className="glass-card rounded-3xl p-6 w-full max-w-sm border border-white/10 shadow-2xl animate-pop-in">
                            <h2 className="text-xl font-black mb-1 text-center gradient-text">إعدادات المباراة 🏒</h2>
                            <p className="text-[11px] text-center text-white/60 font-bold mb-5">اختار ألوان المضارب ومظهر الحلبة قبل الانطلاق</p>

                            {/* Host Color */}
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-black text-white/90">لون مضربك (أنت):</p>
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full border border-white/10 bg-white/5" style={{ color: PADDLE_COLORS.find(c => c.id === hostColor)?.hex }}>
                                        {PADDLE_COLORS.find(c => c.id === hostColor)?.label}
                                    </span>
                                </div>
                                <div className="flex gap-2.5 justify-center flex-wrap">
                                    {PADDLE_COLORS.map(c => (
                                        <button
                                            key={'h_' + c.id}
                                            onClick={() => {
                                                setHostColor(c.id);
                                                if (c.id === oppColor) {
                                                    const alt = PADDLE_COLORS.find(x => x.id !== c.id);
                                                    if (alt) setOppColor(alt.id);
                                                }
                                                playSound('pop');
                                            }}
                                            className={`w-9 h-9 rounded-full transition-all flex items-center justify-center ${
                                                hostColor === c.id ? 'scale-115 ring-2 ring-white shadow-lg' : 'opacity-40 hover:opacity-100'
                                            }`}
                                            style={{
                                                backgroundColor: c.hex,
                                                boxShadow: hostColor === c.id ? `0 0 16px ${c.glow}` : 'none'
                                            }}
                                            title={c.label}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Opponent Color */}
                            <div className="mb-5">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-black text-white/90">لون مضرب الخصم:</p>
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full border border-white/10 bg-white/5" style={{ color: PADDLE_COLORS.find(c => c.id === oppColor)?.hex }}>
                                        {PADDLE_COLORS.find(c => c.id === oppColor)?.label}
                                    </span>
                                </div>
                                <div className="flex gap-2.5 justify-center flex-wrap">
                                    {PADDLE_COLORS.map(c => (
                                        <button
                                            key={'o_' + c.id}
                                            disabled={c.id === hostColor}
                                            onClick={() => {
                                                setOppColor(c.id);
                                                playSound('pop');
                                            }}
                                            className={`w-9 h-9 rounded-full transition-all flex items-center justify-center ${
                                                oppColor === c.id
                                                    ? 'scale-115 ring-2 ring-white shadow-lg'
                                                    : 'opacity-40 hover:opacity-100 disabled:opacity-10 disabled:cursor-not-allowed'
                                            }`}
                                            style={{
                                                backgroundColor: c.hex,
                                                boxShadow: oppColor === c.id ? `0 0 16px ${c.glow}` : 'none'
                                            }}
                                            title={c.label}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Arena Theme */}
                            <div className="mb-4">
                                <p className="text-xs font-black text-white/90 mb-2">مظهر الحلبة:</p>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {Object.values(THEMES).map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => { setTheme(t.id); playSound('whoosh'); }}
                                            className={`py-2 px-1 rounded-xl text-[10px] font-black border transition-all ${
                                                theme === t.id ? t.colorBadge + ' scale-102 ring-1 ring-white/30' : 'border-white/10 text-white/50 hover:text-white/80 bg-white/5'
                                            }`}
                                        >
                                            {t.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* AI Difficulty if vs AI */}
                            {isAI && (
                                <div className="mb-6">
                                    <p className="text-xs font-black text-white/90 mb-2">مستوى الذكاء الاصطناعي:</p>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {[
                                            { id: 'easy', label: 'سهل 🟢', color: 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50' },
                                            { id: 'medium', label: 'متوسط 🟡', color: 'bg-amber-500/25 text-amber-300 border-amber-500/50' },
                                            { id: 'hard', label: 'محترف 🔴', color: 'bg-rose-500/25 text-rose-300 border-rose-500/50' }
                                        ].map(lvl => (
                                            <button
                                                key={lvl.id}
                                                onClick={() => changeDifficulty(lvl.id)}
                                                className={`py-2 px-1 rounded-xl text-[11px] font-black border transition-all ${
                                                    aiDifficulty === lvl.id ? lvl.color + ' scale-102 ring-1 ring-white/30' : 'border-white/10 text-white/50 hover:text-white/80 bg-white/5'
                                                }`}
                                            >
                                                {lvl.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Start Button */}
                            <button
                                onClick={handleStartGame}
                                className="glow-button w-full h-12 rounded-2xl text-base font-black flex items-center justify-center gap-2 mt-2 shadow-xl hover:scale-102 active:scale-98 transition-transform"
                            >
                                <span>ابدأ اللعبة 🏒</span>
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    if (gameState === 'waiting-start') {
        return (
            <>
                <div className="animated-bg"><div className="bg-orb-1" /><div className="bg-orb-2" /></div>
                <div className="min-h-dvh max-w-lg mx-auto px-4 flex flex-col safe-area-pt">
                    <div className="flex justify-between items-center py-4 mb-2">
                        <Logo size="small" />
                        <button
                            onClick={() => { gameActiveRef.current = false; connRef.current?.close?.(); setView('hub'); }}
                            className="glass-card px-4 py-2 rounded-2xl text-xs font-bold hover:scale-105 active:scale-95 transition-transform text-white/90"
                        >
                            الرئيسية
                        </button>
                    </div>

                    <div className="flex-1 flex items-center justify-center -mt-8 px-4">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center animate-pulse-glow border border-white/10 shadow-2xl">
                            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                                <Sparkles size={28} className="animate-spin" style={{ animationDuration: '4s' }} />
                            </div>
                            <h2 className="text-xl font-black mb-2 gradient-text">في الانتظار...</h2>
                            <p className="opacity-70 text-xs font-bold leading-relaxed text-white/80">
                                الطرف الآخر (المضيف) يقوم باختيار الألوان وإعدادات المباراة
                            </p>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <div className="min-h-dvh w-full flex flex-col safe-area-pt overflow-hidden relative select-none">
            <div className="animated-bg"><div className="bg-orb-1" /><div className="bg-orb-2" /></div>

            <PlayerGameHeader
                title="الهوكي الهوائي السريع"
                gameId="air-hockey"
                isMyTurn={true}
                oppProfile={oppProfile}
                myScore={myScore}
                oppScore={oppScore}
                statusText={`الهدف: ${WIN_SCORE} أهداف`}
                onLeave={() => { gameActiveRef.current = false; connRef.current?.close?.(); setView('hub'); }}
            />

            {/* Permanent Live Cyber Scoreboard HUD (Visible throughout the game until someone wins) */}
            <div className="w-full max-w-md mx-auto px-3 pt-1 flex items-center justify-between gap-2 z-10">
                {/* Opponent Card (Left in RTL or Right) */}
                <div className="glass-card flex-1 py-1.5 px-3 rounded-2xl border border-rose-500/30 bg-rose-950/25 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0 overflow-hidden">
                            <AvatarDisplay avatarId={oppProfile?.avatar || 'robot'} size={18} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[11px] font-black text-rose-200 truncate">{oppProfile?.nickname || 'الخصم'}</span>
                            {/* Score progress dots */}
                            <div className="flex gap-1 mt-0.5">
                                {Array.from({ length: WIN_SCORE }).map((_, i) => (
                                    <span
                                        key={i}
                                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i < oppScore ? 'bg-rose-500 shadow-[0_0_6px_#f43f5e]' : 'bg-white/15'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    <span className="text-xl font-black text-rose-400 font-mono tracking-tight mr-1">{oppScore}</span>
                </div>

                {/* Target Score Badge */}
                <div className="glass-card px-2.5 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col items-center shrink-0">
                    <div className="flex items-center gap-1 text-[9px] font-black text-amber-300">
                        <Zap size={10} className="text-amber-400" />
                        <span>الهدف</span>
                    </div>
                    <span className="text-xs font-black text-amber-400 font-mono">{WIN_SCORE}</span>
                </div>

                {/* My Card */}
                <div className="glass-card flex-1 py-1.5 px-3 rounded-2xl border border-sky-500/30 bg-sky-950/25 flex items-center justify-between shadow-lg">
                    <span className="text-xl font-black text-sky-400 font-mono tracking-tight ml-1">{myScore}</span>
                    <div className="flex items-center gap-2 min-w-0 flex-row-reverse text-left">
                        <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center shrink-0 overflow-hidden">
                            <AvatarDisplay avatarId={myProfile.avatar} size={18} />
                        </div>
                        <div className="flex flex-col min-w-0 items-end">
                            <span className="text-[11px] font-black text-sky-200 truncate">{myProfile.nickname || 'أنت'}</span>
                            {/* Score progress dots */}
                            <div className="flex gap-1 mt-0.5">
                                {Array.from({ length: WIN_SCORE }).map((_, i) => (
                                    <span
                                        key={i}
                                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i < myScore ? 'bg-sky-400 shadow-[0_0_6px_#38bdf8]' : 'bg-white/15'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Live Controls Bar (AI Difficulty & Theme Switcher) */}
            <div className="w-full max-w-md mx-auto px-3 py-1 flex items-center justify-between gap-2 z-10">
                {isAI ? (
                    <div className="glass-card px-2 py-1 rounded-xl border border-white/10 flex items-center gap-1">
                        <span className="text-[10px] text-white/60 font-bold ml-1">الصعوبة:</span>
                        {[
                            { id: 'easy', label: 'سهل', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
                            { id: 'medium', label: 'متوسط', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
                            { id: 'hard', label: 'محترف', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' }
                        ].map(lvl => (
                            <button
                                key={lvl.id}
                                onClick={() => changeDifficulty(lvl.id)}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all border ${aiDifficulty === lvl.id ? lvl.color : 'border-transparent text-white/50 hover:text-white/80'}`}
                            >
                                {lvl.label}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="text-[10px] font-bold text-white/60 px-2 py-1 flex items-center gap-1.5">
                        <Sparkles size={12} className="text-sky-400" />
                        <span>مباراة أونلاين حية</span>
                    </div>
                )}

                <button
                    onClick={cycleTheme}
                    className={`glass-card px-2.5 py-1 rounded-xl border text-[10px] font-black flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 ${THEMES[theme]?.colorBadge || 'border-sky-500/40 text-sky-300'}`}
                    title="تغيير مظهر الحلبة"
                >
                    <Palette size={12} />
                    <span>{THEMES[theme]?.name}</span>
                </button>
            </div>

            {/* Arena Canvas Area */}
            {gameState === 'playing' && (
                <div
                    ref={containerRef}
                    className="flex-1 w-full max-w-md mx-auto flex items-center justify-center p-2 overflow-hidden relative"
                >
                    <canvas
                        ref={canvasRef}
                        className={`rounded-3xl border-2 ${THEMES[theme]?.borderClass || 'border-sky-400/50'} ${THEMES[theme]?.shadowClass || ''} touch-none cursor-pointer bg-slate-950 block transition-colors duration-500`}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={onPointerUp}
                    />

                    {/* Goal Announcement Banner */}
                    {goalBanner && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-pop-in">
                            <div className={`px-7 py-3.5 rounded-3xl border-2 font-black text-lg shadow-2xl backdrop-blur-xl ${goalBanner.color}`}>
                                {goalBanner.text}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Game Over Modal */}
            {gameState === 'gameover' && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="glass-card max-w-sm w-full p-6 rounded-3xl border-2 border-white/20 text-center shadow-2xl animate-pop-in">
                        <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center shadow-2xl
                            ${winner === 'me' ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-emerald-500/40 animate-bounce' : 'bg-gradient-to-tr from-rose-600 to-rose-400 text-white shadow-rose-500/40'}`}
                        >
                            <Trophy size={42} />
                        </div>

                        <h2 className="text-2xl font-black text-white mb-1">
                            {winner === 'me' ? '👑 فوز ساحق بالبطولة!' : 'حظ أوفر في الجولة القادمة'}
                        </h2>

                        <p className="text-xs text-slate-300 mb-4">
                            {winner === 'me' ? `وصلت إلى ${WIN_SCORE} أهداف أولاً وتوجت بطلاً!` : `الخصم وصل إلى ${WIN_SCORE} أهداف أولاً!`}
                        </p>

                        <div className="glass-card py-3 px-8 rounded-2xl text-2xl font-black text-amber-400 mb-6 inline-block border border-amber-500/40 shadow-inner">
                            {myScore} – {oppScore}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleRematch}
                                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                            >
                                <RotateCcw size={16} /> إعادة المباراة
                            </button>
                            <button
                                onClick={() => setView('hub')}
                                className="flex-1 py-3 glass-card text-slate-300 hover:text-white font-black text-sm rounded-2xl border border-white/10 transition-transform active:scale-95"
                            >
                                القائمة
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConnectionPauseOverlay conn={connRef.current} />
            <EmotesOverlay conn={connRef.current} />
        </div>
    );
}
