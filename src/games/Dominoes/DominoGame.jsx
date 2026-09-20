import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import PlayerGameHeader from '../../components/PlayerGameHeader';
import ConnectionPauseOverlay from '../../components/ConnectionPauseOverlay';
import EmotesOverlay from '../../components/EmotesOverlay';
import Logo from '../../components/Logo';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Layers from 'lucide-react/dist/esm/icons/layers';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import Play from 'lucide-react/dist/esm/icons/play';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import { playSound, playHaptic } from '../../lib/audioEngine';
import useProfile from '../../hooks/useProfile';
import { triggerVictoryEffects, triggerDefeatEffects, triggerDrawEffects } from '../../lib/effectsEngine';

const TARGET_SCORE = 151; // Official 151 points match target

// Generate standard 28 domino tiles [0..6, 0..6]
function generateAllTiles() {
    const tiles = [];
    let id = 1;
    for (let i = 0; i <= 6; i++) {
        for (let j = i; j <= 6; j++) {
            tiles.push({ id: id++, top: i, bottom: j, sum: i + j, isDouble: i === j });
        }
    }
    return tiles;
}

function shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

// Authentic Domino Pips calculator for a 28x28 square half-face
function getPipOffsets(count, isVertical) {
    const D = 7;
    const D3 = 7.5;

    switch (count) {
        case 0: return [];
        case 1: return [[0, 0]];
        case 2: return [[-D, -D], [D, D]];
        case 3: return [[-D, -D], [0, 0], [D, D]];
        case 4: return [[-D, -D], [D, -D], [-D, D], [D, D]];
        case 5: return [[-D, -D], [D, -D], [0, 0], [-D, D], [D, D]];
        case 6:
            if (isVertical) {
                return [
                    [-D, -D3], [-D, 0], [-D, D3],
                    [D, -D3],  [D, 0],  [D, D3]
                ];
            } else {
                return [
                    [-D3, -D], [0, -D], [D3, -D],
                    [-D3, D],  [0, D],  [D3, D]
                ];
            }
        default: return [];
    }
}

// ── Serpentine (Snake) Table Layout Algorithm ────────────────────────────────
function calculateSerpentineLayout(boardChain, rootId) {
    if (!boardChain || boardChain.length === 0) {
        return { tiles: [], viewBox: '-180 -110 360 220', openEnds: [] };
    }

    const TILE_L = 52;
    const TILE_S = 26;
    const GAP = 2;
    const MAX_X = 160;

    let rootIdx = boardChain.findIndex(t => t.id === rootId);
    if (rootIdx === -1) rootIdx = 0;

    const positioned = [];

    // 1. Root tile
    const rootTile = boardChain[rootIdx];
    const rootIsVert = rootTile.isDouble;
    const rw = rootIsVert ? TILE_S : TILE_L;
    const rh = rootIsVert ? TILE_L : TILE_S;

    positioned[rootIdx] = {
        ...rootTile,
        x: 0,
        y: 0,
        w: rw,
        h: rh,
        isVertical: rootIsVert,
        half1: rootTile.left,
        half2: rootTile.right
    };

    // 2. Right Branch
    let curX = rootIsVert ? TILE_S / 2 : TILE_L / 2;
    let curY = 0;
    let dir = 'RIGHT';

    for (let i = rootIdx + 1; i < boardChain.length; i++) {
        const tile = boardChain[i];
        const isDouble = tile.isDouble;

        if (dir === 'RIGHT') {
            if (curX + TILE_L > MAX_X) {
                const w = TILE_S;
                const h = TILE_L;
                const posX = curX + w / 2 + GAP;
                const posY = curY + h / 2 + GAP;
                positioned[i] = {
                    ...tile,
                    x: posX,
                    y: posY,
                    w, h,
                    isVertical: true,
                    half1: tile.left,
                    half2: tile.right
                };
                curX = posX;
                curY = posY + h / 2;
                dir = 'LEFT';
            } else {
                const w = isDouble ? TILE_S : TILE_L;
                const h = isDouble ? TILE_L : TILE_S;
                const posX = curX + w / 2 + GAP;
                const posY = curY;
                positioned[i] = {
                    ...tile,
                    x: posX,
                    y: posY,
                    w, h,
                    isVertical: isDouble,
                    half1: tile.left,
                    half2: tile.right
                };
                curX += w + GAP;
            }
        } else if (dir === 'LEFT') {
            if (curX - TILE_L < -MAX_X) {
                const w = TILE_S;
                const h = TILE_L;
                const posX = curX - w / 2 - GAP;
                const posY = curY + h / 2 + GAP;
                positioned[i] = {
                    ...tile,
                    x: posX,
                    y: posY,
                    w, h,
                    isVertical: true,
                    half1: tile.left,
                    half2: tile.right
                };
                curX = posX;
                curY = posY + h / 2;
                dir = 'RIGHT';
            } else {
                const w = isDouble ? TILE_S : TILE_L;
                const h = isDouble ? TILE_L : TILE_S;
                const posX = curX - w / 2 - GAP;
                const posY = curY;
                positioned[i] = {
                    ...tile,
                    x: posX,
                    y: posY,
                    w, h,
                    isVertical: isDouble,
                    half1: tile.right,
                    half2: tile.left
                };
                curX -= (w + GAP);
            }
        }
    }

    // 3. Left Branch
    curX = rootIsVert ? -TILE_S / 2 : -TILE_L / 2;
    curY = 0;
    dir = 'LEFT';

    for (let i = rootIdx - 1; i >= 0; i--) {
        const tile = boardChain[i];
        const isDouble = tile.isDouble;

        if (dir === 'LEFT') {
            if (curX - TILE_L < -MAX_X) {
                const w = TILE_S;
                const h = TILE_L;
                const posX = curX - w / 2 - GAP;
                const posY = curY - h / 2 - GAP;
                positioned[i] = {
                    ...tile,
                    x: posX,
                    y: posY,
                    w, h,
                    isVertical: true,
                    half1: tile.left,
                    half2: tile.right
                };
                curX = posX;
                curY = posY - h / 2;
                dir = 'RIGHT';
            } else {
                const w = isDouble ? TILE_S : TILE_L;
                const h = isDouble ? TILE_L : TILE_S;
                const posX = curX - w / 2 - GAP;
                const posY = curY;
                positioned[i] = {
                    ...tile,
                    x: posX,
                    y: posY,
                    w, h,
                    isVertical: isDouble,
                    half1: tile.left,
                    half2: tile.right
                };
                curX -= (w + GAP);
            }
        } else if (dir === 'RIGHT') {
            if (curX + TILE_L > MAX_X) {
                const w = TILE_S;
                const h = TILE_L;
                const posX = curX + w / 2 + GAP;
                const posY = curY - h / 2 - GAP;
                positioned[i] = {
                    ...tile,
                    x: posX,
                    y: posY,
                    w, h,
                    isVertical: true,
                    half1: tile.left,
                    half2: tile.right
                };
                curX = posX;
                curY = posY - h / 2;
                dir = 'LEFT';
            } else {
                const w = isDouble ? TILE_S : TILE_L;
                const h = isDouble ? TILE_L : TILE_S;
                const posX = curX + w / 2 + GAP;
                const posY = curY;
                positioned[i] = {
                    ...tile,
                    x: posX,
                    y: posY,
                    w, h,
                    isVertical: isDouble,
                    half1: tile.right,
                    half2: tile.left
                };
                curX += (w + GAP);
            }
        }
    }

    const validTiles = positioned.filter(Boolean);
    const PAD = 28;
    const minX = Math.min(...validTiles.map(t => t.x - t.w / 2)) - PAD;
    const maxX = Math.max(...validTiles.map(t => t.x + t.w / 2)) + PAD;
    const minY = Math.min(...validTiles.map(t => t.y - t.h / 2)) - PAD;
    const maxY = Math.max(...validTiles.map(t => t.y + t.h / 2)) + PAD;

    const width = Math.max(340, maxX - minX);
    const height = Math.max(200, maxY - minY);
    const viewBox = `${minX} ${minY} ${width} ${height}`;

    return { tiles: validTiles, viewBox };
}

// ── Standalone Hand Domino Tile View ─────────────────────────────────────────
function HandDominoTile({ tile, isSelected, isPlayable, onClick, disabled }) {
    if (!tile) return null;
    const { top, bottom } = tile;
    const topPips = getPipOffsets(top, true);
    const botPips = getPipOffsets(bottom, true);

    return (
        <button
            type="button"
            onClick={!disabled && onClick ? onClick : undefined}
            disabled={disabled}
            className={`shrink-0 rounded-xl transition-all duration-200 relative select-none
                ${isSelected ? 'ring-2 ring-amber-400 -translate-y-3 scale-105 shadow-[0_10px_25px_rgba(245,158,11,0.5)] z-10' : ''}
                ${isPlayable && !disabled && !isSelected ? 'ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)] -translate-y-1.5 hover:scale-105' : ''}
                ${disabled ? 'opacity-35 grayscale cursor-not-allowed' : onClick ? 'cursor-pointer' : 'cursor-default'}`}
            style={{ width: '36px', height: '68px' }}
        >
            <svg viewBox="0 0 36 68" className="w-full h-full block filter drop-shadow-md">
                <defs>
                    <linearGradient id={`ivory-h-${tile.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="50%" stopColor="#fbf9f4" />
                        <stop offset="100%" stopColor="#ebe4d4" />
                    </linearGradient>
                </defs>

                <rect x="1" y="1" width="34" height="66" rx="5" fill={`url(#ivory-h-${tile.id})`} stroke="#d6cfc0" strokeWidth="1" />
                <rect x="2.5" y="2.5" width="31" height="63" rx="4" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.8" />

                <line x1="4" y1="34" x2="32" y2="34" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round" />
                <circle cx="18" cy="34" r="2.2" fill="#ca8a04" stroke="#854d0e" strokeWidth="0.6" />
                <circle cx="17.4" cy="33.4" r="0.7" fill="#fef08a" />

                <g transform="translate(18, 17)">
                    {topPips.map(([dx, dy], i) => (
                        <g key={i}>
                            <circle cx={dx} cy={dy} r="2.5" fill="#111827" />
                            <circle cx={dx - 0.5} cy={dy - 0.5} r="0.8" fill="#4b5563" opacity="0.6" />
                        </g>
                    ))}
                </g>

                <g transform="translate(18, 51)">
                    {botPips.map(([dx, dy], i) => (
                        <g key={i}>
                            <circle cx={dx} cy={dy} r="2.5" fill="#111827" />
                            <circle cx={dx - 0.5} cy={dy - 0.5} r="0.8" fill="#4b5563" opacity="0.6" />
                        </g>
                    ))}
                </g>
            </svg>
        </button>
    );
}

export default function DominoGame({ setView }) {
    const connRef = useRef(null);
    const isHostRef = useRef(false);
    const [myProfile, , awardMatchResult] = useProfile();
    const [oppProfile, setOppProfile] = useState(null);

    // Match States: 'lobby' | 'playing' | 'round_over' | 'gameover'
    const [gameState, setGameState] = useState('lobby');

    // 151 Cumulative Match Scores
    const [myMatchScore, setMyMatchScore] = useState(0);
    const [oppMatchScore, setOppMatchScore] = useState(0);
    const [roundNum, setRoundNum] = useState(1);

    // Current Round States
    const [myHand, setMyHand] = useState([]);
    const [oppHandCount, setOppHandCount] = useState(7);
    const [boneyard, setBoneyard] = useState([]);
    const [boardChain, setBoardChain] = useState([]);
    const [currentTurn, setCurrentTurn] = useState('host');
    const [selectedTile, setSelectedTile] = useState(null);

    // Round / Match Results
    const [roundWinner, setRoundWinner] = useState(null);
    const [roundPointsEarned, setRoundPointsEarned] = useState(0);
    const [roundOverReason, setRoundOverReason] = useState(null);
    const [matchWinner, setMatchWinner] = useState(null);

    const rootTileIdRef = useRef(null);
    const consecutivePassesRef = useRef(0);
    const myHandRef = useRef([]);
    myHandRef.current = myHand;
    const peerHandRef = useRef([]);
    const myMatchScoreRef = useRef(0);
    const oppMatchScoreRef = useRef(0);
    const roundNumRef = useRef(1);

    const isMyTurn = (isHostRef.current && currentTurn === 'host') || (!isHostRef.current && currentTurn === 'peer');

    const getChainEnds = useCallback(() => {
        if (boardChain.length === 0) return { left: null, right: null };
        const left = boardChain[0].left;
        const right = boardChain[boardChain.length - 1].right;
        return { left, right };
    }, [boardChain]);

    const canPlayTile = useCallback((tile) => {
        if (boardChain.length === 0) return true;
        const { left, right } = getChainEnds();
        return (
            tile.top === left || tile.bottom === left ||
            tile.top === right || tile.bottom === right
        );
    }, [boardChain, getChainEnds]);

    const hasAnyValidMove = useCallback(() => {
        return myHand.some(t => canPlayTile(t));
    }, [myHand, canPlayTile]);

    const handleGameStart = (conn, hostMode, oppProf) => {
        isHostRef.current = hostMode;
        connRef.current = conn;
        if (oppProf) setOppProfile(oppProf);
        conn.on('data', onData);

        if (hostMode) {
            startFreshMatch(conn);
        }
    };

    const startFreshMatch = (connInstance) => {
        myMatchScoreRef.current = 0;
        oppMatchScoreRef.current = 0;
        roundNumRef.current = 1;
        setMyMatchScore(0);
        setOppMatchScore(0);
        setRoundNum(1);
        setMatchWinner(null);
        startNewRound(connInstance);
    };

    const startNewRound = (connInstance) => {
        const conn = connInstance || connRef.current;
        const deck = shuffle(generateAllTiles());
        const hostHand = deck.slice(0, 7);
        const peerHand = deck.slice(7, 14);
        const bank = deck.slice(14);

        let startTurn = 'host';
        let highestDoubleHost = -1;
        let highestDoublePeer = -1;

        hostHand.forEach(t => { if (t.isDouble && t.top > highestDoubleHost) highestDoubleHost = t.top; });
        peerHand.forEach(t => { if (t.isDouble && t.top > highestDoublePeer) highestDoublePeer = t.top; });

        if (highestDoublePeer > highestDoubleHost) {
            startTurn = 'peer';
        } else if (highestDoubleHost === -1 && highestDoublePeer === -1) {
            const maxSumH = Math.max(...hostHand.map(t => t.sum));
            const maxSumP = Math.max(...peerHand.map(t => t.sum));
            if (maxSumP > maxSumH) startTurn = 'peer';
        }

        rootTileIdRef.current = null;
        consecutivePassesRef.current = 0;
        peerHandRef.current = peerHand;
        setMyHand(hostHand);
        setOppHandCount(7);
        setBoneyard(bank);
        setBoardChain([]);
        setCurrentTurn(startTurn);
        setSelectedTile(null);
        setRoundOverReason(null);
        setRoundWinner(null);
        setRoundPointsEarned(0);
        setGameState('playing');

        playSound('ding');

        if (conn) {
            const setupMsg = {
                type: 'init_dominoes',
                peerHand: peerHand,
                hostHandCount: 7,
                boneyardCount: bank.length,
                startTurn: startTurn,
                roundNum: roundNumRef.current,
                hostScore: myMatchScoreRef.current,
                peerScore: oppMatchScoreRef.current
            };
            conn.send(setupMsg);

            // Handshake: keep sending setup until ack is received
            if (isHostRef.current) {
                if (conn.setupInterval) clearInterval(conn.setupInterval);
                conn.setupInterval = setInterval(() => {
                    if (connRef.current) {
                        connRef.current.send(setupMsg);
                    }
                }, 2000);
            }
        }
    };

    const onData = (msg) => {
        if (!msg || !msg.type) return;

        switch (msg.type) {
            case 'dominoes_ack':
                if (connRef.current?.setupInterval) {
                    clearInterval(connRef.current.setupInterval);
                    connRef.current.setupInterval = null;
                }
                break;

            case 'init_dominoes':
                connRef.current?.send({ type: 'dominoes_ack' });
                rootTileIdRef.current = null;
                consecutivePassesRef.current = 0;
                setMyHand(msg.peerHand);
                setOppHandCount(msg.hostHandCount);
                setBoneyard(Array(msg.boneyardCount).fill({}));
                setBoardChain([]);
                setCurrentTurn(msg.startTurn);
                setSelectedTile(null);
                setRoundOverReason(null);
                setRoundWinner(null);
                setRoundPointsEarned(0);
                if (msg.roundNum) {
                    setRoundNum(msg.roundNum);
                    roundNumRef.current = msg.roundNum;
                }
                if (msg.peerScore !== undefined && msg.hostScore !== undefined) {
                    setMyMatchScore(msg.peerScore);
                    setOppMatchScore(msg.hostScore);
                    myMatchScoreRef.current = msg.peerScore;
                    oppMatchScoreRef.current = msg.hostScore;
                }
                setGameState('playing');
                playSound('ding');
                break;

            case 'play_tile': {
                consecutivePassesRef.current = 0;
                const { tile, newChain } = msg;
                if (!rootTileIdRef.current && newChain && newChain.length === 1) {
                    rootTileIdRef.current = newChain[0].id;
                }
                setBoardChain(newChain);
                setOppHandCount(prev => Math.max(0, prev - 1));
                if (isHostRef.current && tile) {
                    peerHandRef.current = peerHandRef.current.filter(t => t.id !== tile.id);
                }
                playSound('tap');
                playHaptic(20);

                if (msg.remainingOppCount === 0) {
                    const myRemainingSum = myHandRef.current.reduce((acc, t) => acc + (t.sum ?? (t.top + t.bottom)), 0);
                    endRound('opp', 'domino', myRemainingSum);
                    return;
                }

                setCurrentTurn(isHostRef.current ? 'host' : 'peer');
                break;
            }

            case 'draw_request': {
                if (isHostRef.current) {
                    setBoneyard(prevBank => {
                        if (prevBank.length === 0) return prevBank;
                        const drawn = prevBank[0];
                        const remaining = prevBank.slice(1);
                        peerHandRef.current = [...peerHandRef.current, drawn];
                        connRef.current?.send({
                            type: 'draw_response',
                            tile: drawn,
                            boneyardCount: remaining.length
                        });
                        return remaining;
                    });
                    setOppHandCount(prev => prev + 1);
                    playSound('pop');
                }
                break;
            }

            case 'draw_response': {
                if (msg.tile) {
                    setMyHand(prev => [...prev, msg.tile]);
                    setBoneyard(Array(msg.boneyardCount).fill({}));
                    playSound('pop');
                }
                break;
            }

            case 'opponent_drew': {
                setOppHandCount(prev => prev + 1);
                setBoneyard(prev => prev.slice(1));
                playSound('pop');
                break;
            }

            case 'pass_turn': {
                playSound('tick');
                consecutivePassesRef.current += 1;

                if (consecutivePassesRef.current >= 2) {
                    handleBlockedGame(msg.oppTiles);
                } else {
                    setCurrentTurn(isHostRef.current ? 'host' : 'peer');
                }
                break;
            }

            case 'round_end': {
                // Peer receives round end from host
                const { winnerKey, reason, roundPoints, myScore, oppScore } = msg;
                setRoundWinner(winnerKey);
                setRoundOverReason(reason);
                setRoundPointsEarned(roundPoints);
                setMyMatchScore(myScore);
                setOppMatchScore(oppScore);
                myMatchScoreRef.current = myScore;
                oppMatchScoreRef.current = oppScore;
                setGameState('round_over');
                playSound(winnerKey === 'me' ? 'win' : 'lose');
                break;
            }

            case 'match_over': {
                const { winnerKey, myScore, oppScore } = msg;
                setMatchWinner(winnerKey);
                setMyMatchScore(myScore);
                setOppMatchScore(oppScore);
                setGameState('gameover');
                awardMatchResult(winnerKey === 'me');
                
                if (winnerKey === 'draw') {
                    triggerDrawEffects();
                } else if (winnerKey === 'me') {
                    triggerVictoryEffects();
                    if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100, 50, 200]);
                } else {
                    triggerDefeatEffects();
                }

                break;
            }

            case 'rematch_request': {
                if (isHostRef.current) {
                    startFreshMatch();
                } else {
                    connRef.current?.send({ type: 'rematch_accept' });
                }
                break;
            }

            case 'rematch_accept': {
                if (isHostRef.current) {
                    startFreshMatch();
                }
                break;
            }

            case 'next_round_request': {
                if (isHostRef.current) {
                    roundNumRef.current += 1;
                    setRoundNum(prev => prev + 1);
                    startNewRound();
                }
                break;
            }

            default:
                break;
        }
    };

    const handleTileClick = (tile) => {
        if (!isMyTurn || gameState !== 'playing') return;

        if (boardChain.length === 0) {
            executePlay(tile, 'right', tile.top, tile.bottom);
            return;
        }

        const { left, right } = getChainEnds();
        const canLeft = tile.top === left || tile.bottom === left;
        const canRight = tile.top === right || tile.bottom === right;

        if (!canLeft && !canRight) {
            playSound('lose');
            playHaptic(40);
            return;
        }

        if (canLeft && canRight && left !== right) {
            setSelectedTile(tile);
            playSound('click');
        } else if (canLeft) {
            const newLeftVal = tile.top === left ? tile.bottom : tile.top;
            executePlay(tile, 'left', newLeftVal, left);
        } else {
            const newRightVal = tile.top === right ? tile.bottom : tile.top;
            executePlay(tile, 'right', right, newRightVal);
        }
    };

    const choosePlacementSide = (side) => {
        if (!selectedTile) return;
        const { left, right } = getChainEnds();
        if (side === 'left') {
            const newLeftVal = selectedTile.top === left ? selectedTile.bottom : selectedTile.top;
            executePlay(selectedTile, 'left', newLeftVal, left);
        } else {
            const newRightVal = selectedTile.top === right ? selectedTile.bottom : selectedTile.top;
            executePlay(selectedTile, 'right', right, newRightVal);
        }
        setSelectedTile(null);
    };

    const executePlay = (tile, side, nodeLeft, nodeRight) => {
        playSound('tap');
        playHaptic(25);
        consecutivePassesRef.current = 0;

        const newChainNode = {
            id: tile.id,
            left: nodeLeft,
            right: nodeRight,
            top: tile.top,
            bottom: tile.bottom,
            isDouble: tile.isDouble
        };

        if (!rootTileIdRef.current) {
            rootTileIdRef.current = tile.id;
        }

        const newChain = side === 'left' ? [newChainNode, ...boardChain] : [...boardChain, newChainNode];
        const newHand = myHand.filter(t => t.id !== tile.id);

        setBoardChain(newChain);
        setMyHand(newHand);
        setSelectedTile(null);

        connRef.current?.send({
            type: 'play_tile',
            tile: tile,
            side: side,
            newChain: newChain,
            remainingOppCount: newHand.length,
            remainingTilesSum: newHand.reduce((acc, t) => acc + t.sum, 0)
        });

        if (newHand.length === 0) {
            let oppRemainingSum = 0;
            if (isHostRef.current && peerHandRef.current.length > 0) {
                oppRemainingSum = peerHandRef.current.reduce((acc, t) => acc + (t.sum ?? (t.top + t.bottom)), 0);
            } else {
                oppRemainingSum = Math.max(12, oppHandCount * 5);
            }
            endRound('me', 'domino', oppRemainingSum);
            return;
        }

        const nextTurn = isHostRef.current ? 'peer' : 'host';
        setCurrentTurn(nextTurn);
    };

    const handleDraw = () => {
        if (!isMyTurn || gameState !== 'playing' || boneyard.length === 0) return;

        if (isHostRef.current) {
            const drawn = boneyard[0];
            const remaining = boneyard.slice(1);
            setMyHand(prev => [...prev, drawn]);
            setBoneyard(remaining);
            playSound('pop');
            playHaptic(15);
            connRef.current?.send({ type: 'opponent_drew' });
        } else {
            connRef.current?.send({ type: 'draw_request' });
        }
    };

    const handlePass = () => {
        if (!isMyTurn || gameState !== 'playing') return;
        playSound('tick');
        consecutivePassesRef.current += 1;

        connRef.current?.send({
            type: 'pass_turn',
            oppTiles: myHand,
            remainingTilesSum: myHand.reduce((acc, t) => acc + t.sum, 0)
        });

        if (consecutivePassesRef.current >= 2) {
            handleBlockedGame([]);
        } else {
            const nextTurn = isHostRef.current ? 'peer' : 'host';
            setCurrentTurn(nextTurn);
        }
    };

    // ── 151 Scoring Logic: Blocked Game (القفلة) ──────────────────────────────
    const handleBlockedGame = (oppTiles) => {
        const mySum = myHandRef.current.reduce((acc, t) => acc + (t.sum ?? (t.top + t.bottom)), 0);
        let oppSum = 0;
        if (oppTiles && oppTiles.length > 0) {
            oppSum = oppTiles.reduce((acc, t) => acc + (t.sum ?? (t.top + t.bottom)), 0);
        } else if (isHostRef.current && peerHandRef.current.length > 0) {
            oppSum = peerHandRef.current.reduce((acc, t) => acc + (t.sum ?? (t.top + t.bottom)), 0);
        }

        let winnerKey = 'draw';
        let diffPoints = 0;

        if (mySum < oppSum) {
            winnerKey = 'me';
            diffPoints = oppSum - mySum;
        } else if (oppSum < mySum) {
            winnerKey = 'opp';
            diffPoints = mySum - oppSum;
        }

        endRound(winnerKey, 'blocked', diffPoints);
    };

    // ── 151 Scoring Logic: End Round & Accumulate Toward 151 ───────────────────
    const endRound = (winnerKey, reason, bonusPoints) => {
        let earnedPoints = 0;

        if (reason === 'domino') {
            if (winnerKey === 'me') {
                // I won with domino: points = sum of opponent's remaining tiles
                earnedPoints = bonusPoints > 0 ? bonusPoints : 14;
            } else {
                // Opponent won with domino: points = sum of my remaining tiles
                const myRemaining = myHandRef.current.reduce((acc, t) => acc + (t.sum ?? (t.top + t.bottom)), 0);
                earnedPoints = myRemaining > 0 ? myRemaining : 14;
            }
        } else {
            // Blocked: points = difference of sums
            earnedPoints = bonusPoints || 0;
        }

        let newMy = myMatchScoreRef.current;
        let newOpp = oppMatchScoreRef.current;

        if (winnerKey === 'me') {
            newMy += earnedPoints;
            myMatchScoreRef.current = newMy;
            setMyMatchScore(newMy);
        } else if (winnerKey === 'opp') {
            newOpp += earnedPoints;
            oppMatchScoreRef.current = newOpp;
            setOppMatchScore(newOpp);
        }

        setRoundWinner(winnerKey);
        setRoundPointsEarned(earnedPoints);
        setRoundOverReason(reason);

        // Check if 151 Target is reached
        if (newMy >= TARGET_SCORE || newOpp >= TARGET_SCORE) {
            const finalWinner = newMy >= TARGET_SCORE ? 'me' : 'opp';
            setMatchWinner(finalWinner);
            setGameState('gameover');
            awardMatchResult(finalWinner === 'me');
            
            if (finalWinner === 'me') {
                triggerVictoryEffects();
                if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100, 50, 200]);
            } else {
                triggerDefeatEffects();
            }

            connRef.current?.send({
                type: 'match_over',
                winnerKey: finalWinner === 'me' ? 'opp' : 'me',
                myScore: newOpp,
                oppScore: newMy
            });
        } else {
            // Match continues! Show round recap
            setGameState('round_over');
            playSound(winnerKey === 'me' ? 'win' : winnerKey === 'opp' ? 'lose' : 'draw');

            connRef.current?.send({
                type: 'round_end',
                winnerKey: winnerKey === 'me' ? 'opp' : winnerKey === 'opp' ? 'me' : 'draw',
                reason,
                roundPoints: earnedPoints,
                myScore: newOpp,
                oppScore: newMy
            });
        }
    };

    const handleNextRound = () => {
        roundNumRef.current += 1;
        setRoundNum(prev => prev + 1);
        if (isHostRef.current) {
            startNewRound();
        } else {
            connRef.current?.send({ type: 'next_round_request' });
        }
    };

    const handleRematch = () => {
        if (isHostRef.current) {
            startFreshMatch();
        } else {
            connRef.current?.send({ type: 'rematch_request' });
        }
    };

    // Calculate Serpentine Layout for the Table (Fit-to-Screen) & Ghost Preview Spots
    const { tiles: tableTiles, viewBox, ghostLeft, ghostRight } = useMemo(() => {
        const base = calculateSerpentineLayout(boardChain, rootTileIdRef.current);
        if (!selectedTile || boardChain.length === 0) {
            return { tiles: base.tiles, viewBox: base.viewBox, ghostLeft: null, ghostRight: null };
        }

        const { left, right } = getChainEnds();
        const newLeftVal = selectedTile.top === left ? selectedTile.bottom : selectedTile.top;
        const simLeftNode = {
            id: 'ghost-left',
            left: newLeftVal,
            right: left,
            top: selectedTile.top,
            bottom: selectedTile.bottom,
            isDouble: selectedTile.isDouble
        };
        const resLeft = calculateSerpentineLayout([simLeftNode, ...boardChain], rootTileIdRef.current);
        const gLeft = resLeft.tiles.find(t => t.id === 'ghost-left');

        const newRightVal = selectedTile.top === right ? selectedTile.bottom : selectedTile.top;
        const simRightNode = {
            id: 'ghost-right',
            left: right,
            right: newRightVal,
            top: selectedTile.top,
            bottom: selectedTile.bottom,
            isDouble: selectedTile.isDouble
        };
        const resRight = calculateSerpentineLayout([...boardChain, simRightNode], rootTileIdRef.current);
        const gRight = resRight.tiles.find(t => t.id === 'ghost-right');

        const allTiles = [...base.tiles];
        if (gLeft) allTiles.push(gLeft);
        if (gRight) allTiles.push(gRight);

        const PAD = 32;
        const minX = Math.min(...allTiles.map(t => t.x - t.w / 2)) - PAD;
        const maxX = Math.max(...allTiles.map(t => t.x + t.w / 2)) + PAD;
        const minY = Math.min(...allTiles.map(t => t.y - t.h / 2)) - PAD;
        const maxY = Math.max(...allTiles.map(t => t.y + t.h / 2)) + PAD;
        const width = Math.max(340, maxX - minX);
        const height = Math.max(200, maxY - minY);

        return {
            tiles: base.tiles,
            viewBox: `${minX} ${minY} ${width} ${height}`,
            ghostLeft: gLeft,
            ghostRight: gRight
        };
    }, [boardChain, selectedTile, getChainEnds]);

    if (gameState === 'lobby') {
        return (
            <>
                <div className="animated-bg"><div className="bg-orb-1" /><div className="bg-orb-2" /></div>
                <div className="min-h-dvh max-w-lg mx-auto px-4 flex flex-col safe-area-pt overflow-x-hidden overflow-y-auto pb-6">
                    <div className="flex justify-between items-center py-4 mb-2">
                        <Logo size="small" />
                        <button
                            onClick={() => { connRef.current?.close?.(); setView('hub'); }}
                            className="glass-card px-4 py-2 rounded-2xl text-xs font-bold hover:scale-105 active:scale-95 transition-transform text-white/90"
                        >
                            الرئيسية
                        </button>
                    </div>

                    <div className="flex-1 flex pb-16 safe-area-pb">
                        <P2PConnectionManager
                            gameIdPrefix="celia-domino"
                            onGameStart={handleGameStart}
                        />
                    </div>
                </div>
            </>
        );
    }

    return (
        <div className="min-h-dvh w-full flex flex-col safe-area-pt overflow-hidden relative select-none">
            <div className="animated-bg"><div className="bg-orb-1" /><div className="bg-orb-2" /></div>

            <PlayerGameHeader
                title="الدومينو 151"
                gameId="domino-game"
                isMyTurn={isMyTurn}
                oppProfile={oppProfile}
                myScore={myMatchScore}
                oppScore={oppMatchScore}
                statusText={`الهدف: ${TARGET_SCORE} نقطة | الجولة ${roundNum}`}
                onLeave={() => { connRef.current?.close?.(); setView('hub'); }}
            />

            {/* Active Game Layout */}
            {gameState !== 'playing' && gameState !== 'round_over' && gameState !== 'gameover' ? null : (
                <div className="flex-1 flex flex-col justify-between p-3 gap-2 overflow-hidden max-w-xl w-full mx-auto">
                    {/* Top Status & 151 Progress Bars */}
                    <div className="glass-card px-4 py-2 rounded-2xl border border-white/10 flex items-center justify-between gap-3">
                        {/* Opponent score progress */}
                        <div className="flex-1 flex flex-col gap-1">
                            <div className="flex justify-between text-[11px] font-black">
                                <span className="text-slate-300 truncate">{oppProfile?.nickname || 'الخصم'}</span>
                                <span className="text-rose-400 font-mono">{oppMatchScore} / {TARGET_SCORE}</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-rose-500 to-rose-400 transition-all duration-500 rounded-full"
                                    style={{ width: `${Math.min(100, (oppMatchScore / TARGET_SCORE) * 100)}%` }}
                                />
                            </div>
                        </div>

                        <span className="text-xs font-black text-amber-400 opacity-60">VS</span>

                        {/* My score progress */}
                        <div className="flex-1 flex flex-col gap-1">
                            <div className="flex justify-between text-[11px] font-black">
                                <span className="text-slate-300 truncate">أنت</span>
                                <span className="text-emerald-400 font-mono">{myMatchScore} / {TARGET_SCORE}</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
                                    style={{ width: `${Math.min(100, (myMatchScore / TARGET_SCORE) * 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Opponent Dominoes Count Indicator */}
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400">عظام الخصم:</span>
                            <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                {oppHandCount}
                            </span>
                        </div>
                        <div className="flex gap-1 overflow-x-auto py-0.5">
                            {Array.from({ length: Math.min(oppHandCount, 12) }).map((_, i) => (
                                <div
                                    key={i}
                                    className="w-3.5 h-6 rounded-md bg-gradient-to-b from-stone-800 via-stone-900 to-black border border-stone-700 shadow-sm shrink-0"
                                />
                            ))}
                        </div>
                    </div>

                    {/* Luxury Emerald Felt Domino Table (100% Fit-to-Screen, NO SCROLLBARS, NO ARROWS) */}
                    <div className="relative flex-1 min-h-[290px] sm:min-h-[350px] rounded-3xl bg-gradient-to-b from-emerald-950/90 via-slate-950 to-emerald-950/90 border-2 border-emerald-500/30 shadow-[inset_0_0_60px_rgba(16,185,129,0.18),0_12px_36px_rgba(0,0,0,0.6)] flex items-center justify-center overflow-hidden p-2">
                        {boardChain.length === 0 ? (
                            <div className="w-full text-center text-emerald-300/70 text-sm font-bold flex flex-col items-center gap-2 pointer-events-none">
                                <span className="text-4xl animate-bounce">🎲</span>
                                <span>العب أول عظمة لبدء الجولة!</span>
                            </div>
                        ) : (
                            <svg
                                viewBox={viewBox}
                                preserveAspectRatio="xMidYMid meet"
                                className="w-full h-full block select-none pointer-events-none"
                            >
                                <defs>
                                    <linearGradient id="ivory-table-tile" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#ffffff" />
                                        <stop offset="50%" stopColor="#fbf9f4" />
                                        <stop offset="100%" stopColor="#ebe4d4" />
                                    </linearGradient>
                                    <radialGradient id="brass-table-pin" cx="40%" cy="35%" r="65%">
                                        <stop offset="0%" stopColor="#fef08a" />
                                        <stop offset="40%" stopColor="#eab308" />
                                        <stop offset="80%" stopColor="#ca8a04" />
                                        <stop offset="100%" stopColor="#854d0e" />
                                    </radialGradient>
                                    <filter id="tile-shadow" x="-30%" y="-30%" width="160%" height="160%">
                                        <feDropShadow dx="0" dy="3.5" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.5" />
                                    </filter>
                                </defs>

                                {tableTiles.map((t) => {
                                    const isVert = t.isVertical;
                                    const half1Pips = getPipOffsets(t.half1, isVert);
                                    const half2Pips = getPipOffsets(t.half2, isVert);
                                    const h1Offset = isVert ? [0, -t.h / 4] : [-t.w / 4, 0];
                                    const h2Offset = isVert ? [0, t.h / 4] : [t.w / 4, 0];

                                    return (
                                        <g key={t.id} transform={`translate(${t.x}, ${t.y})`}>
                                            <rect
                                                x={-t.w / 2}
                                                y={-t.h / 2}
                                                width={t.w}
                                                height={t.h}
                                                rx="5"
                                                fill="url(#ivory-table-tile)"
                                                stroke="#d6cfc0"
                                                strokeWidth="1"
                                                filter="url(#tile-shadow)"
                                            />
                                            <rect
                                                x={-t.w / 2 + 1.2}
                                                y={-t.h / 2 + 1.2}
                                                width={t.w - 2.4}
                                                height={t.h - 2.4}
                                                rx="4"
                                                fill="none"
                                                stroke="rgba(255,255,255,0.75)"
                                                strokeWidth="0.8"
                                            />

                                            {isVert ? (
                                                <line x1={-t.w / 2 + 3} y1="0" x2={t.w / 2 - 3} y2="0" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round" />
                                            ) : (
                                                <line x1="0" y1={-t.h / 2 + 3} x2="0" y2={t.h / 2 - 3} stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round" />
                                            )}

                                            <circle cx="0" cy="0" r="2.2" fill="url(#brass-table-pin)" stroke="#854d0e" strokeWidth="0.5" />
                                            <circle cx="-0.6" cy="-0.6" r="0.7" fill="#fef08a" opacity="0.9" />

                                            <g transform={`translate(${h1Offset[0]}, ${h1Offset[1]})`}>
                                                {half1Pips.map(([dx, dy], i) => (
                                                    <g key={i}>
                                                        <circle cx={dx} cy={dy} r="2.4" fill="#111827" />
                                                        <circle cx={dx - 0.5} cy={dy - 0.5} r="0.8" fill="#4b5563" opacity="0.55" />
                                                    </g>
                                                ))}
                                            </g>

                                            <g transform={`translate(${h2Offset[0]}, ${h2Offset[1]})`}>
                                                {half2Pips.map(([dx, dy], i) => (
                                                    <g key={i}>
                                                        <circle cx={dx} cy={dy} r="2.4" fill="#111827" />
                                                        <circle cx={dx - 0.5} cy={dy - 0.5} r="0.8" fill="#4b5563" opacity="0.55" />
                                                    </g>
                                                ))}
                                            </g>
                                        </g>
                                    );
                                })}

                                {/* Interactive Ghost Spot 1 (First matching end) */}
                                {ghostLeft && (
                                    <g
                                        transform={`translate(${ghostLeft.x}, ${ghostLeft.y})`}
                                        onClick={() => choosePlacementSide('left')}
                                        className="pointer-events-auto cursor-pointer group"
                                    >
                                        {/* Outer pulsing ring */}
                                        <rect
                                            x={-ghostLeft.w / 2 - 4}
                                            y={-ghostLeft.h / 2 - 4}
                                            width={ghostLeft.w + 8}
                                            height={ghostLeft.h + 8}
                                            rx="8"
                                            fill="rgba(16, 185, 129, 0.25)"
                                            stroke="#10b981"
                                            strokeWidth="2"
                                            strokeDasharray="5 3"
                                            className="animate-pulse"
                                        />
                                        {/* Ghost Domino Body */}
                                        <rect
                                            x={-ghostLeft.w / 2}
                                            y={-ghostLeft.h / 2}
                                            width={ghostLeft.w}
                                            height={ghostLeft.h}
                                            rx="5"
                                            fill="rgba(255, 255, 255, 0.92)"
                                            stroke="#10b981"
                                            strokeWidth="1.8"
                                            className="transition-transform group-hover:scale-105"
                                        />
                                        {/* Divider */}
                                        {ghostLeft.isVertical ? (
                                            <line x1={-ghostLeft.w / 2 + 3} y1="0" x2={ghostLeft.w / 2 - 3} y2="0" stroke="#9ca3af" strokeWidth="1" />
                                        ) : (
                                            <line x1="0" y1={-ghostLeft.h / 2 + 3} x2="0" y2={ghostLeft.h / 2 - 3} stroke="#9ca3af" strokeWidth="1" />
                                        )}
                                        {/* Half 1 Pips */}
                                        <g transform={`translate(${ghostLeft.isVertical ? 0 : -ghostLeft.w / 4}, ${ghostLeft.isVertical ? -ghostLeft.h / 4 : 0})`}>
                                            {getPipOffsets(ghostLeft.half1, ghostLeft.isVertical).map(([dx, dy], i) => (
                                                <circle key={i} cx={dx} cy={dy} r="2.2" fill="#047857" />
                                            ))}
                                        </g>
                                        {/* Half 2 Pips */}
                                        <g transform={`translate(${ghostLeft.isVertical ? 0 : ghostLeft.w / 4}, ${ghostLeft.isVertical ? ghostLeft.h / 4 : 0})`}>
                                            {getPipOffsets(ghostLeft.half2, ghostLeft.isVertical).map(([dx, dy], i) => (
                                                <circle key={i} cx={dx} cy={dy} r="2.2" fill="#047857" />
                                            ))}
                                        </g>
                                        {/* Badge Tag: المكان 1 */}
                                        <g transform={`translate(0, ${-ghostLeft.h / 2 - 10})`}>
                                            <rect x="-26" y="-8" width="52" height="16" rx="8" fill="#059669" stroke="#34d399" strokeWidth="1" />
                                            <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
                                                المكان 1
                                            </text>
                                        </g>
                                    </g>
                                )}

                                {/* Interactive Ghost Spot 2 (Second matching end) */}
                                {ghostRight && (
                                    <g
                                        transform={`translate(${ghostRight.x}, ${ghostRight.y})`}
                                        onClick={() => choosePlacementSide('right')}
                                        className="pointer-events-auto cursor-pointer group"
                                    >
                                        {/* Outer pulsing ring */}
                                        <rect
                                            x={-ghostRight.w / 2 - 4}
                                            y={-ghostRight.h / 2 - 4}
                                            width={ghostRight.w + 8}
                                            height={ghostRight.h + 8}
                                            rx="8"
                                            fill="rgba(59, 130, 246, 0.25)"
                                            stroke="#3b82f6"
                                            strokeWidth="2"
                                            strokeDasharray="5 3"
                                            className="animate-pulse"
                                        />
                                        {/* Ghost Domino Body */}
                                        <rect
                                            x={-ghostRight.w / 2}
                                            y={-ghostRight.h / 2}
                                            width={ghostRight.w}
                                            height={ghostRight.h}
                                            rx="5"
                                            fill="rgba(255, 255, 255, 0.92)"
                                            stroke="#3b82f6"
                                            strokeWidth="1.8"
                                            className="transition-transform group-hover:scale-105"
                                        />
                                        {/* Divider */}
                                        {ghostRight.isVertical ? (
                                            <line x1={-ghostRight.w / 2 + 3} y1="0" x2={ghostRight.w / 2 - 3} y2="0" stroke="#9ca3af" strokeWidth="1" />
                                        ) : (
                                            <line x1="0" y1={-ghostRight.h / 2 + 3} x2="0" y2={ghostRight.h / 2 - 3} stroke="#9ca3af" strokeWidth="1" />
                                        )}
                                        {/* Half 1 Pips */}
                                        <g transform={`translate(${ghostRight.isVertical ? 0 : -ghostRight.w / 4}, ${ghostRight.isVertical ? -ghostRight.h / 4 : 0})`}>
                                            {getPipOffsets(ghostRight.half1, ghostRight.isVertical).map(([dx, dy], i) => (
                                                <circle key={i} cx={dx} cy={dy} r="2.2" fill="#1d4ed8" />
                                            ))}
                                        </g>
                                        {/* Half 2 Pips */}
                                        <g transform={`translate(${ghostRight.isVertical ? 0 : ghostRight.w / 4}, ${ghostRight.isVertical ? ghostRight.h / 4 : 0})`}>
                                            {getPipOffsets(ghostRight.half2, ghostRight.isVertical).map(([dx, dy], i) => (
                                                <circle key={i} cx={dx} cy={dy} r="2.2" fill="#1d4ed8" />
                                            ))}
                                        </g>
                                        {/* Badge Tag: المكان 2 */}
                                        <g transform={`translate(0, ${-ghostRight.h / 2 - 10})`}>
                                            <rect x="-26" y="-8" width="52" height="16" rx="8" fill="#2563eb" stroke="#60a5fa" strokeWidth="1" />
                                            <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
                                                المكان 2
                                            </text>
                                        </g>
                                    </g>
                                )}
                            </svg>
                        )}
                    </div>

                    {/* Placement Selection Banner if tile can be placed on both ends */}
                    {selectedTile && (
                        <div className="glass-card p-3 rounded-2xl border-2 border-emerald-500/50 bg-emerald-950/60 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 animate-pop-in shadow-2xl">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                                <span className="text-xs font-bold text-emerald-200">
                                    العظمة تناسب مكانين! اضغط على المكان المطلوب في الطاولة أو اختر:
                                </span>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                <button
                                    onClick={() => choosePlacementSide('left')}
                                    className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 border border-emerald-400/40"
                                >
                                    <span className="w-2 h-2 rounded-full bg-emerald-300" />
                                    <span>المكان 1 (مع الرقم {getChainEnds().left})</span>
                                </button>
                                <button
                                    onClick={() => choosePlacementSide('right')}
                                    className="flex-1 sm:flex-none px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 border border-blue-400/40"
                                >
                                    <span className="w-2 h-2 rounded-full bg-blue-300" />
                                    <span>المكان 2 (مع الرقم {getChainEnds().right})</span>
                                </button>
                                <button
                                    onClick={() => setSelectedTile(null)}
                                    className="px-3 py-2 bg-white/10 hover:bg-white/20 text-slate-300 font-bold text-xs rounded-xl transition-all active:scale-95"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Turn Actions & Bank Status Bar */}
                    <div className="flex items-center justify-between px-1 py-1">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 glass-card px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 border border-white/10">
                                <Layers size={14} className="text-amber-400" />
                                <span>البنك: {boneyard.length}</span>
                            </div>

                            {isMyTurn && !hasAnyValidMove() && boneyard.length > 0 && (
                                <button
                                    onClick={handleDraw}
                                    className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-pulse active:scale-95 transition-all"
                                >
                                    اسحب من البنك ➕
                                </button>
                            )}

                            {isMyTurn && !hasAnyValidMove() && boneyard.length === 0 && (
                                <button
                                    onClick={handlePass}
                                    className="px-4 py-1.5 bg-rose-500/20 border border-rose-500 text-rose-300 hover:bg-rose-500/30 font-black text-xs rounded-xl active:scale-95 transition-all"
                                >
                                    تمرير الدور (باص) ⏭️
                                </button>
                            )}
                        </div>

                        <div className={`text-xs font-bold px-3 py-1 rounded-full ${isMyTurn ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 animate-pulse' : 'text-slate-400'}`}>
                            {isMyTurn ? '✨ دورك الآن!' : '⌛ بانتظار الخصم...'}
                        </div>
                    </div>

                    {/* Player Hand Tray */}
                    <div className="glass-card p-3 rounded-3xl border border-white/15 shadow-2xl flex items-center justify-center gap-2 overflow-x-auto min-h-[94px]">
                        {myHand.map((tile) => {
                            const playable = isMyTurn && canPlayTile(tile);
                            return (
                                <HandDominoTile
                                    key={tile.id}
                                    tile={tile}
                                    isSelected={selectedTile?.id === tile.id}
                                    isPlayable={playable}
                                    disabled={isMyTurn && !playable}
                                    onClick={() => handleTileClick(tile)}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Round Over Recap Modal (Accumulating towards 151) ── */}
            {gameState === 'round_over' && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="glass-card max-w-sm w-full p-6 rounded-3xl border-2 border-white/15 text-center shadow-2xl animate-pop-in">
                        <div className={`w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center shadow-lg
                            ${roundWinner === 'me' ? 'bg-emerald-500 text-white shadow-emerald-500/30' : roundWinner === 'opp' ? 'bg-rose-500 text-white shadow-rose-500/30' : 'bg-amber-500 text-white shadow-amber-500/30'}`}
                        >
                            {roundWinner === 'draw' ? <AlertCircle size={36} /> : <Trophy size={36} />}
                        </div>

                        <h2 className="text-xl font-black text-white mb-1">
                            {roundWinner === 'me' ? '🎉 فزت بهذه الجولة!' : roundWinner === 'opp' ? 'الخصم فاز بالجولة' : 'تعادل في القفلة!'}
                        </h2>

                        <p className="text-xs text-slate-300 mb-3">
                            {roundOverReason === 'domino'
                                ? 'دومينو! تم لعب جميع العظام.'
                                : 'قفلة الدومينو! احتساب فارق النقاط بين اللاعبين.'}
                        </p>

                        <div className="glass-card py-2 px-4 rounded-xl text-sm font-black text-amber-400 mb-4 inline-block border border-amber-500/30">
                            نقاط الجولة: +{roundPointsEarned} نقطة
                        </div>

                        {/* Cumulative Scores toward 151 */}
                        <div className="glass-card p-3 rounded-2xl border border-white/10 mb-5 text-right flex flex-col gap-2">
                            <span className="text-xs font-bold text-slate-400 text-center block">
                                النتيجة التراكمية (الهدف {TARGET_SCORE} نقطة)
                            </span>
                            <div className="flex justify-between items-center text-xs font-black">
                                <span>أنت:</span>
                                <span className="text-emerald-400 font-mono text-sm">{myMatchScore} / {TARGET_SCORE}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-black">
                                <span>{oppProfile?.nickname || 'الخصم'}:</span>
                                <span className="text-rose-400 font-mono text-sm">{oppMatchScore} / {TARGET_SCORE}</span>
                            </div>
                        </div>

                        <button
                            onClick={handleNextRound}
                            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                        >
                            <Play size={16} fill="currentColor" /> بدء الجولة التالية ({roundNum + 1})
                        </button>
                    </div>
                </div>
            )}

            {/* ── Final 151 Match Game Over Modal ── */}
            {gameState === 'gameover' && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-lg flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="glass-card max-w-sm w-full p-6 rounded-3xl border-2 border-white/20 text-center shadow-2xl animate-pop-in">
                        <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center shadow-2xl
                            ${matchWinner === 'me' ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-emerald-500/40 animate-bounce' : 'bg-gradient-to-tr from-rose-600 to-rose-400 text-white shadow-rose-500/40'}`}
                        >
                            <Trophy size={44} />
                        </div>

                        <h2 className="text-2xl font-black text-white mb-2">
                            {matchWinner === 'me' ? '👑 بطل الدومينو 151!' : 'حظ أوفر في المباراة القادمة'}
                        </h2>

                        <p className="text-xs text-slate-300 mb-4">
                            تم الوصول للهدف ({TARGET_SCORE} نقطة) بعد {roundNum} جولات حماسية!
                        </p>

                        <div className="glass-card py-3 px-6 rounded-2xl text-xl font-black text-amber-400 mb-6 inline-block border border-amber-500/40 shadow-inner">
                            {myMatchScore} – {oppMatchScore}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleRematch}
                                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                            >
                                <RotateCcw size={16} /> مباراة جديدة
                            </button>
                            <button
                                onClick={() => setView('hub')}
                                className="flex-1 py-3 glass-card text-slate-300 hover:text-white font-bold text-sm rounded-2xl border border-white/10 transition-transform active:scale-95"
                            >
                                القائمة
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConnectionPauseOverlay conn={connRef.current} />
            <EmotesOverlay conn={connRef.current} showStandaloneButton={false} />
        </div>
    );
}
