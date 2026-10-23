import { useState, useRef, useEffect } from 'react';
import Logo from '../../components/Logo';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import ConnectionPauseOverlay from '../../components/ConnectionPauseOverlay';
import EmotesOverlay, { ChatTriggerButton, GameNotifications } from '../../components/EmotesOverlay';
import { playSound } from '../../lib/audioEngine';
import useProfile from '../../hooks/useProfile';
import { triggerVictoryEffects, triggerDefeatEffects } from '../../lib/effectsEngine';
import { GameIcon } from '../../components/icons/GameIcons';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import Undo2 from 'lucide-react/dist/esm/icons/undo-2';
import Eraser from 'lucide-react/dist/esm/icons/eraser';
import Pencil from 'lucide-react/dist/esm/icons/pencil';
import Lightbulb from 'lucide-react/dist/esm/icons/lightbulb';
import './SpeedSudokuGame.css';

// Hardcoded fully solved 9x9 boards
const SOLVED_BOARDS = [
    [
        [4,3,5, 2,6,9, 7,8,1],
        [6,8,2, 5,7,1, 4,9,3],
        [1,9,7, 8,3,4, 5,6,2],
        
        [8,2,6, 1,9,5, 3,4,7],
        [3,7,4, 6,8,2, 9,1,5],
        [9,5,1, 7,4,3, 6,2,8],
        
        [5,1,9, 3,2,6, 8,7,4],
        [2,4,8, 9,5,7, 1,3,6],
        [7,6,3, 4,1,8, 2,5,9]
    ],
    [
        [1,5,2, 4,8,9, 3,7,6],
        [7,3,9, 2,5,6, 8,4,1],
        [4,6,8, 3,7,1, 2,9,5],
        
        [3,8,7, 1,2,4, 6,5,9],
        [5,9,1, 7,6,3, 4,2,8],
        [2,4,6, 8,9,5, 7,1,3],
        
        [9,1,4, 6,3,7, 5,8,2],
        [6,2,5, 9,4,8, 1,3,7],
        [8,7,3, 5,1,2, 9,6,4]
    ],
    [
        [5,3,4, 6,7,8, 9,1,2],
        [6,7,2, 1,9,5, 3,4,8],
        [1,9,8, 3,4,2, 5,6,7],
        
        [8,5,9, 7,6,1, 4,2,3],
        [4,2,6, 8,5,3, 7,9,1],
        [7,1,3, 9,2,4, 8,5,6],
        
        [9,6,1, 5,3,7, 2,8,4],
        [2,8,7, 4,1,9, 6,3,5],
        [3,4,5, 2,8,6, 1,7,9]
    ]
];

const CELLS_TO_REMOVE = 32; // Enough empty cells to make the race feel like Sudoku
const ROUND_POINT = 1;

const shuffle = (items) => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
};

// Count solutions only up to two. This keeps generated race boards fair and
// prevents the hidden answer from disagreeing with another valid Sudoku.
function countSolutions(board, limit = 2) {
    const rows = Array(9).fill(0);
    const cols = Array(9).fill(0);
    const boxes = Array(9).fill(0);
    const bitFor = (value) => 1 << (value - 1);

    for (let r = 0; r < 9; r += 1) {
        for (let c = 0; c < 9; c += 1) {
            const value = board[r][c];
            if (!value) continue;
            const bit = bitFor(value);
            const box = Math.floor(r / 3) * 3 + Math.floor(c / 3);
            if ((rows[r] & bit) || (cols[c] & bit) || (boxes[box] & bit)) return 0;
            rows[r] |= bit;
            cols[c] |= bit;
            boxes[box] |= bit;
        }
    }

    let solutions = 0;
    const search = () => {
        if (solutions >= limit) return;
        let best = null;
        let bestMask = 0;
        let bestCount = 10;

        for (let r = 0; r < 9; r += 1) {
            for (let c = 0; c < 9; c += 1) {
                if (board[r][c]) continue;
                const box = Math.floor(r / 3) * 3 + Math.floor(c / 3);
                const used = rows[r] | cols[c] | boxes[box];
                let mask = 0;
                let count = 0;
                for (let digit = 1; digit <= 9; digit += 1) {
                    const bit = bitFor(digit);
                    if (!(used & bit)) { mask |= bit; count += 1; }
                }
                if (!count) return;
                if (count < bestCount) {
                    best = { r, c, box };
                    bestMask = mask;
                    bestCount = count;
                    if (count === 1) break;
                }
            }
            if (bestCount === 1) break;
        }

        if (!best) { solutions += 1; return; }
        for (let digit = 1; digit <= 9; digit += 1) {
            const bit = bitFor(digit);
            if (!(bestMask & bit)) continue;
            board[best.r][best.c] = digit;
            rows[best.r] |= bit;
            cols[best.c] |= bit;
            boxes[best.box] |= bit;
            search();
            board[best.r][best.c] = 0;
            rows[best.r] ^= bit;
            cols[best.c] ^= bit;
            boxes[best.box] ^= bit;
            if (solutions >= limit) return;
        }
    };

    search();
    return solutions;
}

function makeUniquePuzzle(solution) {
    const puzzle = solution.map((row) => [...row]);
    let removed = 0;
    for (const index of shuffle(Array.from({ length: 81 }, (_, i) => i))) {
        if (removed === CELLS_TO_REMOVE) break;
        const r = Math.floor(index / 9);
        const c = index % 9;
        const value = puzzle[r][c];
        puzzle[r][c] = 0;
        if (countSolutions(puzzle) === 1) removed += 1;
        else puzzle[r][c] = value;
    }
    return puzzle;
}

function generatePuzzle() {
    const solution = SOLVED_BOARDS[Math.floor(Math.random() * SOLVED_BOARDS.length)];
    const puzzle = makeUniquePuzzle(solution);
    const grid = [];
    
    // Copy
    for (let r = 0; r < 9; r++) {
        const row = [];
        for (let c = 0; c < 9; c++) {
            row.push({
                val: solution[r][c],
                initial: puzzle[r][c] !== 0,
                draftVal: null,
                filledBy: null, // 'p1' or 'p2'
                notes: [],
            });
        }
        grid.push(row);
    }
    
    return grid;
}

function cloneGrid(grid) {
    return grid.map((row) => row.map((cell) => ({ ...cell })));
}

function toPublicGrid(grid) {
    return grid.map((row) => row.map((cell) => ({
        ...cell,
        // Never send the answer for an empty square to the remote player.
        val: cell.initial || cell.filledBy ? cell.val : 0,
    })));
}

function sudokuConflict(grid, row, col, value) {
    const visibleValue = (cell) => cell.initial || cell.filledBy || cell.draftVal ? (cell.initial || cell.filledBy ? cell.val : cell.draftVal) : 0;
    for (let index = 0; index < 9; index += 1) {
        if (index !== col && visibleValue(grid[row][index]) === value) return true;
        if (index !== row && visibleValue(grid[index][col]) === value) return true;
    }
    const rowStart = Math.floor(row / 3) * 3;
    const colStart = Math.floor(col / 3) * 3;
    for (let r = rowStart; r < rowStart + 3; r += 1) {
        for (let c = colStart; c < colStart + 3; c += 1) {
            if ((r !== row || c !== col) && visibleValue(grid[r][c]) === value) return true;
        }
    }
    return false;
}

function sudokuCandidates(grid, row, col) {
    const used = new Set();
    for (let index = 0; index < 9; index += 1) {
        const rowCell = grid[row][index];
        const colCell = grid[index][col];
        if (rowCell.initial || rowCell.filledBy) used.add(rowCell.val);
        if (colCell.initial || colCell.filledBy) used.add(colCell.val);
    }
    const rowStart = Math.floor(row / 3) * 3;
    const colStart = Math.floor(col / 3) * 3;
    for (let r = rowStart; r < rowStart + 3; r += 1) {
        for (let c = colStart; c < colStart + 3; c += 1) {
            const cell = grid[r][c];
            if (cell.initial || cell.filledBy) used.add(cell.val);
        }
    }
    return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((digit) => !used.has(digit));
}

export default function SpeedSudokuGame({ setView }) {
    const connRef = useRef(null);
    const isHostRef = useRef(false);
    const isAIRef = useRef(false);
    const hasStartedRef = useRef(false); // prevent double-start
    const [myProfile, , awardMatchResult] = useProfile({ gameId: 'speed-sudoku', gameTitle: 'سودوكو السرعة' });
    const [oppProfile, setOppProfile] = useState(null);

    // State
    const [gameState, setGameState] = useState('lobby'); // lobby, playing, game_over
    const [connectionPaused, setConnectionPaused] = useState(false);
    const [grid, setGrid] = useState(null);
    const [myScore, setMyScore] = useState(0);
    const [oppScore, setOppScore] = useState(0);
    const [myProgress, setMyProgress] = useState(0);
    const [oppProgress, setOppProgress] = useState(0);
    const [winner, setWinner] = useState(null);
    const [aiHasStarted, setAiHasStarted] = useState(false);
    const [rematchPending, setRematchPending] = useState(false);
    
    const [selectedCell, setSelectedCell] = useState(null); // {r, c}
    const [errorCell, setErrorCell] = useState(null); // {r, c} for red flash
    const [guessFeedback, setGuessFeedback] = useState(null);
    const [guessPending, setGuessPending] = useState(false);
    const [myMistakes, setMyMistakes] = useState(0);
    const [oppMistakes, setOppMistakes] = useState(0);
    const [myHintsUsed, setMyHintsUsed] = useState(false);
    const [toolMode, setToolMode] = useState('number');
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [canUndo, setCanUndo] = useState(false);
    const roundStartedAtRef = useRef(0);
    const pausedElapsedSecondsRef = useRef(null);

    // Host Refs
    const stateRef = useRef({
        grids: { p1: null, p2: null },
        p1Score: 0,
        p2Score: 0,
        p1Progress: 0,
        p2Progress: 0,
        p1Mistakes: 0,
        p2Mistakes: 0,
        hintsUsed: { p1: false, p2: false },
        history: { p1: [], p2: [] },
        remaining: { p1: CELLS_TO_REMOVE, p2: CELLS_TO_REMOVE },
        finished: false,
    });
    const aiIntervalRef = useRef(null);
    const feedbackTimerRef = useRef(null);
    const aiStartedRef = useRef(false);

    const getPlayerSnapshot = () => ({
        grid, myScore, oppScore, myProgress, oppProgress, myMistakes, oppMistakes,
        myHintsUsed, canUndo, elapsedSeconds, gameState, winner
    });

    const restoreConnectionState = (savedState, seat = (isHostRef.current ? 'host' : 'peer')) => {
        if (!savedState || savedState.connectionGame !== 'speed-sudoku') return false;
        const snapshot = savedState.connectionPlayers?.[seat]?.playerSnapshot || savedState.playerSnapshot;
        if (savedState.sharedState) stateRef.current = savedState.sharedState;
        if (!snapshot) return false;
        setGrid(snapshot.grid ? cloneGrid(snapshot.grid) : null);
        setMyScore(Number(snapshot.myScore) || 0);
        setOppScore(Number(snapshot.oppScore) || 0);
        setMyProgress(Number(snapshot.myProgress) || 0);
        setOppProgress(Number(snapshot.oppProgress) || 0);
        setMyMistakes(Number(snapshot.myMistakes) || 0);
        setOppMistakes(Number(snapshot.oppMistakes) || 0);
        setMyHintsUsed(Boolean(snapshot.myHintsUsed));
        setCanUndo(Boolean(snapshot.canUndo));
        setElapsedSeconds(Number(snapshot.elapsedSeconds) || 0);
        setWinner(snapshot.winner || null);
        setGameState(snapshot.gameState || savedState.gameState || 'playing');
        roundStartedAtRef.current = Date.now() - (Number(snapshot.elapsedSeconds) || 0) * 1000;
        return true;
    };

    useEffect(() => {
        if (!connRef.current || gameState === 'lobby') return;
        const seat = isHostRef.current ? 'host' : 'peer';
        connRef.current.savePlayerState?.({ playerSnapshot: getPlayerSnapshot() }, seat);
        if (isHostRef.current) {
            connRef.current.saveState?.({
                connectionGame: 'speed-sudoku',
                gameState,
                sharedState: { ...stateRef.current, gameState, elapsedSeconds }
            });
        }
    }, [grid, myScore, oppScore, myProgress, oppProgress, myMistakes, oppMistakes, myHintsUsed, canUndo, elapsedSeconds, gameState, winner]);

    // --- Host Logic ---

    const startMatchHost = () => {
        if (aiIntervalRef.current) clearTimeout(aiIntervalRef.current);
        const sharedPuzzle = generatePuzzle();
        const p1Grid = cloneGrid(sharedPuzzle);
        const p2Grid = cloneGrid(sharedPuzzle);
        const p1Score = stateRef.current.p1Score;
        const p2Score = stateRef.current.p2Score;
        stateRef.current = {
            grids: { p1: p1Grid, p2: p2Grid },
            p1Score,
            p2Score,
            p1Progress: 0,
            p2Progress: 0,
            p1Mistakes: 0,
            p2Mistakes: 0,
            hintsUsed: { p1: false, p2: false },
            history: { p1: [], p2: [] },
            remaining: { p1: CELLS_TO_REMOVE, p2: CELLS_TO_REMOVE },
            finished: false,
        };
        aiStartedRef.current = false;
        setAiHasStarted(false);
        setWinner(null);
        setGrid(p1Grid);
        setMyScore(p1Score);
        setOppScore(p2Score);
        setMyProgress(0);
        setOppProgress(0);
        setMyMistakes(0);
        setOppMistakes(0);
        setMyHintsUsed(false);
        setCanUndo(false);
        setToolMode('number');
        setElapsedSeconds(0);
        roundStartedAtRef.current = Date.now();
        setSelectedCell(null);
        setErrorCell(null);
        setGuessFeedback(null);
        setGuessPending(false);
        setRematchPending(false);
        setGameState('playing');

        connRef.current?.send({ type: 'start_match', grid: toPublicGrid(p2Grid), p1Score, p2Score });
        // The computer starts at the same time as the player, not after their first move.
        startAITimer();
    };

    const showGuessFeedback = (message, kind) => {
        setGuessFeedback({ message, kind });
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = setTimeout(() => setGuessFeedback(null), 1200);
    };

    const playerProgress = (s, player) => player === 'p1' ? s.p1Progress : s.p2Progress;
    const setPlayerProgress = (s, player, value) => {
        if (player === 'p1') s.p1Progress = value;
        else s.p2Progress = value;
    };

    const sendPlayerGrid = (player, type = 'cell_edit_update') => {
        const s = stateRef.current;
        const playerGrid = s.grids[player];
        if (player === 'p1') setGrid(cloneGrid(playerGrid));
        connRef.current?.send({
            type, player, grid: player === 'p2' ? toPublicGrid(playerGrid) : undefined,
            p1Progress: s.p1Progress, p2Progress: s.p2Progress,
            canUndo: s.history[player].length > 0,
            p1Mistakes: s.p1Mistakes, p2Mistakes: s.p2Mistakes,
            hintsUsed: s.hintsUsed,
        });
        if (player === 'p1') setCanUndo(s.history.p1.length > 0);
    };

    const processGuessHost = (player, r, c, val) => {
        const s = stateRef.current;
        if (s.finished) return;
        const playerGrid = s.grids[player];
        if (!playerGrid || !Number.isInteger(r) || !Number.isInteger(c) || !Number.isInteger(val) || r < 0 || r > 8 || c < 0 || c > 8 || val < 1 || val > 9) return;
        const cell = playerGrid[r][c];
        if (cell.initial || cell.filledBy) return;

        const conflict = sudokuConflict(playerGrid, r, c, val);
        if (cell.val !== val || conflict) {
            if (player === 'p1') {
                s.p1Mistakes += 1;
                setMyMistakes(s.p1Mistakes);
                flashError(r, c);
                showGuessFeedback(conflict ? 'الرقم موجود بالفعل في الصف أو العمود أو المربع' : 'رقم غير صحيح، جرّب مرة أخرى', 'error');
                playSound('error');
            } else {
                s.p2Mistakes += 1;
                setOppMistakes(s.p2Mistakes);
            }
            connRef.current?.send({
                type: 'wrong_guess', player, r, c, conflict,
                p1Score: s.p1Score, p2Score: s.p2Score,
                p1Mistakes: s.p1Mistakes, p2Mistakes: s.p2Mistakes,
            });
            return;
        }

        s.history[player].push({ r, c, cell: { ...cell, notes: [...(cell.notes || [])] } });
        if (s.history[player].length > 100) s.history[player].shift();
        cell.filledBy = player;
        cell.draftVal = null;
        cell.notes = [];
        s.remaining[player] = Math.max(0, s.remaining[player] - 1);
        setPlayerProgress(s, player, playerProgress(s, player) + 1);

        if (player === 'p1') {
            setMyProgress(s.p1Progress);
            setSelectedCell(prev => prev?.r === r && prev?.c === c ? null : prev);
            setCanUndo(s.history.p1.length > 0);
            showGuessFeedback('صحيح! كمل اللغز عشان تكسب نقطة الجولة', 'success');
        } else setOppProgress(s.p2Progress);

        connRef.current?.send({
            type: 'state_update', player, r, c, filledBy: player,
            grid: player === 'p2' ? toPublicGrid(playerGrid) : undefined,
            p1Score: s.p1Score, p2Score: s.p2Score,
            p1Progress: s.p1Progress, p2Progress: s.p2Progress,
            p1Mistakes: s.p1Mistakes, p2Mistakes: s.p2Mistakes,
            p1Remaining: s.remaining.p1, p2Remaining: s.remaining.p2,
            canUndo: s.history[player].length > 0,
        });
        if (player === 'p1') setGrid(cloneGrid(playerGrid));
        playSound('pop');
        if (s.remaining[player] === 0) endGameHost(player);
    };

    const processCellEditHost = (player, action, r, c, val) => {
        const s = stateRef.current;
        if (s.finished || !Number.isInteger(r) || !Number.isInteger(c) || r < 0 || r > 8 || c < 0 || c > 8) return;
        const cell = s.grids[player]?.[r]?.[c];
        if (!cell || cell.initial || (cell.filledBy && cell.filledBy !== player)) return;
        s.history[player].push({ r, c, cell: { ...cell, notes: [...(cell.notes || [])] } });
        if (s.history[player].length > 100) s.history[player].shift();
        if (action === 'pencil' && Number.isInteger(val) && val >= 1 && val <= 9 && !cell.filledBy) {
            const notes = cell.notes || [];
            cell.notes = notes.includes(val) ? notes.filter((n) => n !== val) : [...notes, val].sort();
        } else if (action === 'erase') {
            if (cell.filledBy === player) {
                cell.filledBy = null;
                s.remaining[player] += 1;
                setPlayerProgress(s, player, Math.max(0, playerProgress(s, player) - 1));
            }
            cell.draftVal = null;
            cell.notes = [];
        } else {
            s.history[player].pop();
            return;
        }
        sendPlayerGrid(player);
        setMyProgress(s.p1Progress);
        setOppProgress(s.p2Progress);
        setMyMistakes(s.p1Mistakes);
        setOppMistakes(s.p2Mistakes);
    };

    const processUndoHost = (player) => {
        const s = stateRef.current;
        if (s.finished) return;
        const previous = s.history[player]?.pop();
        if (!previous) return;
        const cell = s.grids[player][previous.r][previous.c];
        const wasFilled = cell.filledBy === player;
        const shouldBeFilled = previous.cell.filledBy === player;
        if (wasFilled !== shouldBeFilled) {
            const delta = shouldBeFilled ? 1 : -1;
            s.remaining[player] = Math.max(0, s.remaining[player] - delta);
            setPlayerProgress(s, player, Math.max(0, playerProgress(s, player) + delta));
        }
        cell.filledBy = shouldBeFilled ? player : null;
        cell.draftVal = previous.cell.draftVal || null;
        cell.notes = [...(previous.cell.notes || [])];
        sendPlayerGrid(player);
        setMyProgress(s.p1Progress);
        setOppProgress(s.p2Progress);
    };

    const processHintHost = (player, requestedCell) => {
        const s = stateRef.current;
        if (s.finished || s.hintsUsed[player]) return;
        const playerGrid = s.grids[player];
        const emptyCells = [];
        for (let r = 0; r < 9; r += 1) for (let c = 0; c < 9; c += 1) {
            if (!playerGrid[r][c].initial && !playerGrid[r][c].filledBy) emptyCells.push({ r, c });
        }
        const requested = requestedCell && emptyCells.find(({ r, c }) => r === requestedCell.r && c === requestedCell.c);
        const target = requested || emptyCells[Math.floor(Math.random() * emptyCells.length)];
        if (!target) return;
        const { r, c } = target;
        const cell = playerGrid[r][c];
        s.history[player].push({ r, c, cell: { ...cell, notes: [...(cell.notes || [])] } });
        cell.filledBy = player;
        cell.notes = [];
        s.hintsUsed[player] = true;
        s.remaining[player] = Math.max(0, s.remaining[player] - 1);
        setPlayerProgress(s, player, playerProgress(s, player) + 1);
        if (player === 'p1') {
            setMyHintsUsed(true);
            setMyProgress(s.p1Progress);
            setCanUndo(s.history.p1.length > 0);
            setGrid(cloneGrid(playerGrid));
            showGuessFeedback('استخدمت التلميح: خانة واحدة اتملت صح', 'success');
        } else setOppProgress(s.p2Progress);
        connRef.current?.send({
            type: 'state_update', player, r, c, filledBy: player,
            grid: player === 'p2' ? toPublicGrid(playerGrid) : undefined,
            p1Score: s.p1Score, p2Score: s.p2Score,
            p1Progress: s.p1Progress, p2Progress: s.p2Progress,
            p1Mistakes: s.p1Mistakes, p2Mistakes: s.p2Mistakes,
            hintsUsed: s.hintsUsed, canUndo: s.history[player].length > 0,
        });
        playSound('pop');
        if (s.remaining[player] === 0) endGameHost(player);
    };

    const endGameHost = (winnerPlayer) => {
        const s = stateRef.current;
        if (s.finished) return;
        s.finished = true;
        if (winnerPlayer === 'p1') {
            s.p1Score += ROUND_POINT;
            setMyScore(s.p1Score);
            triggerVictoryEffects();
            awardMatchResult('win', 25);
        } else if (winnerPlayer === 'p2') {
            s.p2Score += ROUND_POINT;
            setOppScore(s.p2Score);
            triggerDefeatEffects();
            awardMatchResult('loss', 5);
        }
        setWinner(winnerPlayer);
        setGameState('game_over');
        if (aiIntervalRef.current) clearTimeout(aiIntervalRef.current);
        connRef.current?.send({
            type: 'game_over', winner: winnerPlayer,
            p1Score: s.p1Score, p2Score: s.p2Score,
            p1Progress: s.p1Progress, p2Progress: s.p2Progress,
            p1Mistakes: s.p1Mistakes, p2Mistakes: s.p2Mistakes,
            p1Remaining: s.remaining.p1, p2Remaining: s.remaining.p2,
        });
    };

    const startAITimer = () => {
        if (!isAIRef.current || aiStartedRef.current) return;
        aiStartedRef.current = true;
        setAiHasStarted(true);
        if (aiIntervalRef.current) clearTimeout(aiIntervalRef.current);
        const makeAIMove = () => {
            const s = stateRef.current;
            const aiGrid = s.grids.p2;
            if (!aiGrid || s.finished || s.remaining.p2 <= 0) return;

            const empties = [];
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (!aiGrid[r][c].initial && !aiGrid[r][c].filledBy) {
                        const candidates = sudokuCandidates(aiGrid, r, c);
                        if (candidates.length) empties.push({ r, c, candidates });
                    }
                }
            }
            if (!empties.length) return;

            // Solve the most constrained cell first with the same candidate rules
            // a human can see, instead of filling random empty squares.
            const fewestCandidates = Math.min(...empties.map(({ candidates }) => candidates.length));
            const bestCells = empties.filter(({ candidates }) => candidates.length === fewestCandidates);
            const target = bestCells[Math.floor(Math.random() * bestCells.length)];
            const answer = aiGrid[target.r][target.c].val;
            const playerLead = s.p1Progress - s.p2Progress;
            const mistakeChance = playerLead >= 5 ? 0.035 : 0.075;
            const wrongCandidates = target.candidates.filter((candidate) => candidate !== answer);
            const shouldMiss = target.candidates.length > 1 && wrongCandidates.length > 0 && Math.random() < mistakeChance;
            const guess = shouldMiss
                ? wrongCandidates[Math.floor(Math.random() * wrongCandidates.length)]
                : answer;
            processGuessHost('p2', target.r, target.c, guess);
            if (s.finished || s.remaining.p2 <= 0) return;
            const nextDelay = playerLead >= 5 ? 1100 : playerLead >= 2 ? 1500 : 1900;
            aiIntervalRef.current = setTimeout(makeAIMove, nextDelay);
        };
        aiIntervalRef.current = setTimeout(makeAIMove, 1000);
    };

    // --- Guest / Shared Logic ---

    const handleNumberClick = (val) => {
        if (gameState !== 'playing' || !selectedCell || guessPending) return;
        const { r, c } = selectedCell;
        const selected = grid?.[r]?.[c];
        if (!selected || selected.initial || selected.filledBy) return;
        if (toolMode === 'pencil') {
            if (isHostRef.current) processCellEditHost('p1', 'pencil', r, c, val);
            else {
                setGuessPending(true);
                connRef.current?.send({ type: 'cell_edit', action: 'pencil', r, c, val });
            }
            return;
        }
        if (isHostRef.current) {
            startAITimer();
            processGuessHost('p1', r, c, val);
        } else {
            setGuessPending(true);
            connRef.current?.send({ type: 'guess', r, c, val });
        }
    };

    const handleBoardAction = (action) => {
        if (gameState !== 'playing' || guessPending) return;
        if (action === 'undo' && !canUndo) return;
        if (action === 'hint' && myHintsUsed) return;
        const r = selectedCell?.r ?? null;
        const c = selectedCell?.c ?? null;
        if (action === 'hint' && r === null && grid) {
            outer: for (let row = 0; row < 9; row += 1) {
                for (let col = 0; col < 9; col += 1) {
                    if (!grid[row][col].initial && !grid[row][col].filledBy) {
                        setSelectedCell({ r: row, c: col });
                        break outer;
                    }
                }
            }
        }
        const target = action === 'hint' && r === null
            ? (() => {
                for (let row = 0; row < 9; row += 1) for (let col = 0; col < 9; col += 1) {
                    if (!grid[row][col].initial && !grid[row][col].filledBy) return { r: row, c: col };
                }
                return null;
            })()
            : (r === null ? null : { r, c });
        if (isHostRef.current) {
            if (action === 'undo') processUndoHost('p1');
            if (action === 'erase' && target) processCellEditHost('p1', 'erase', target.r, target.c);
            if (action === 'hint') processHintHost('p1', target);
        } else {
            setGuessPending(true);
            if (action === 'undo') connRef.current?.send({ type: 'undo' });
            if (action === 'erase' && target) connRef.current?.send({ type: 'cell_edit', action: 'erase', r: target.r, c: target.c });
            if (action === 'hint') connRef.current?.send({ type: 'hint', cell: target });
        }
    };

    const flashError = (r, c) => {
        setErrorCell({ r, c });
        setTimeout(() => setErrorCell(null), 500);
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
        if (restoreConnectionState(savedState)) {
            if (hostMode) {
                conn.on('peer-reconnect', () => {
                    conn.getState?.().then((latest) => {
                        if (latest?.connectionGame !== 'speed-sudoku') return;
                        conn.send({
                            type: 'state_sync',
                            state: {
                                connectionGame: 'speed-sudoku',
                                gameState: latest.gameState,
                                sharedState: latest.sharedState,
                                playerSnapshot: latest.connectionPlayers?.peer?.playerSnapshot
                            }
                        });
                    });
                });
            }
        } else {
            setGameState('starting');
        }
    };

    const requestRematch = () => {
        playSound('click');
        if (isHostRef.current) {
            startMatchHost();
        } else {
            setRematchPending(true);
            connRef.current?.send({ type: 'rematch_request' });
        }
    };

    const onData = (data) => {
        if (data.type === 'state_sync' && !isHostRef.current && data.state?.connectionGame === 'speed-sudoku') {
            restoreConnectionState(data.state, 'peer');
            return;
        }
        if (data.type === 'start_match' && !isHostRef.current) {
            setGrid(data.grid);
            setOppScore(data.p1Score ?? 0);
            setMyScore(data.p2Score ?? 0);
            setMyProgress(0);
            setOppProgress(0);
            setMyMistakes(0);
            setOppMistakes(0);
            setMyHintsUsed(false);
            setCanUndo(false);
            setToolMode('number');
            setElapsedSeconds(0);
            roundStartedAtRef.current = Date.now();
            setSelectedCell(null);
            setErrorCell(null);
            setGuessFeedback(null);
            setGuessPending(false);
            setRematchPending(false);
            setWinner(null);
            setGameState('playing');
        }

        if (data.type === 'rematch_request' && isHostRef.current) {
            startMatchHost();
        }
        
        if (data.type === 'guess' && isHostRef.current) {
            processGuessHost('p2', data.r, data.c, data.val);
        }

        if (data.type === 'cell_edit' && isHostRef.current) {
            processCellEditHost('p2', data.action, data.r, data.c, data.val);
        }

        if (data.type === 'undo' && isHostRef.current) processUndoHost('p2');
        if (data.type === 'hint' && isHostRef.current) processHintHost('p2', data.cell);
        
        if (data.type === 'state_update' && !isHostRef.current) {
            if (data.player === 'p2') setGuessPending(false);
            if (data.player === 'p2') {
                if (data.grid) setGrid(cloneGrid(data.grid));
                else setGrid(prev => {
                    if (!prev) return prev;
                    return prev.map((row, r) => r !== data.r ? row : row.map((cell, c) => (
                        c === data.c ? { ...cell, filledBy: data.filledBy, draftVal: null } : cell
                    )));
                });
            }
            setOppScore(data.p1Score); // Host's score
            setMyScore(data.p2Score);  // Guest's score
            setOppProgress(data.p1Progress ?? data.p1Score ?? 0);
            setMyProgress(data.p2Progress ?? data.p2Score ?? 0);
            setOppMistakes(data.p1Mistakes ?? 0);
            setMyMistakes(data.p2Mistakes ?? 0);
            if (data.hintsUsed) setMyHintsUsed(!!data.hintsUsed.p2);
            if (data.player === 'p2') setCanUndo(!!data.canUndo);
            playSound('pop');
            if (data.player === 'p2') showGuessFeedback('إجابة صحيحة! كمل اللغز عشان تكسب نقطة الجولة', 'success');
            
            if (data.player === 'p2') {
                setSelectedCell(prev => prev && prev.r === data.r && prev.c === data.c ? null : prev);
            }
        }
        
        if (data.type === 'wrong_guess' && !isHostRef.current) {
            if (data.player === 'p2') setGuessPending(false);
            if (data.player === 'p2') {
                flashError(data.r, data.c);
                showGuessFeedback(data.conflict ? 'الرقم موجود بالفعل في الصف أو العمود أو المربع' : 'رقم غير صحيح، جرّب مرة أخرى', 'error');
            }
            playSound('error');
            setMyMistakes(data.p2Mistakes ?? 0);
            setOppMistakes(data.p1Mistakes ?? 0);
        }

        if (data.type === 'cell_edit_update' && !isHostRef.current) {
            if (data.player === 'p2') {
                setGuessPending(false);
                if (data.grid) setGrid(cloneGrid(data.grid));
                setCanUndo(!!data.canUndo);
                setMyMistakes(data.p2Mistakes ?? 0);
                setOppMistakes(data.p1Mistakes ?? 0);
                setMyHintsUsed(!!data.hintsUsed?.p2);
            }
            setMyProgress(data.p2Progress ?? 0);
            setOppProgress(data.p1Progress ?? 0);
        }
        
        if (data.type === 'game_over' && !isHostRef.current) {
            setGuessPending(false);
            setGameState('game_over');
            setMyScore(data.p2Score);
            setOppScore(data.p1Score);
            setMyProgress(data.p2Progress ?? 0);
            setOppProgress(data.p1Progress ?? 0);
            setMyMistakes(data.p2Mistakes ?? 0);
            setOppMistakes(data.p1Mistakes ?? 0);
            setWinner(data.winner);
            if (data.winner === 'p2') {
                triggerVictoryEffects();
                awardMatchResult('win', 25);
            } else if (data.winner === 'p1') {
                triggerDefeatEffects();
                awardMatchResult('loss', 5);
            } else {
                awardMatchResult('draw', 10);
            }
        }
    };

    useEffect(() => {
        if (gameState === 'starting' && isHostRef.current && !hasStartedRef.current) {
            hasStartedRef.current = true;
            setTimeout(startMatchHost, 1000);
        }
    }, [gameState]);

    useEffect(() => {
        return () => {
            if (aiIntervalRef.current) clearTimeout(aiIntervalRef.current);
            if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        };
    }, []);

    useEffect(() => {
        if (gameState !== 'playing' || connectionPaused) return undefined;
        const updateClock = () => setElapsedSeconds(Math.floor((Date.now() - roundStartedAtRef.current) / 1000));
        updateClock();
        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
    }, [gameState, connectionPaused]);

    const pauseForConnection = () => {
        if (gameState === 'playing' && pausedElapsedSecondsRef.current === null) {
            pausedElapsedSecondsRef.current = elapsedSeconds;
        }
        setConnectionPaused(true);
    };

    const resumeAfterConnection = () => {
        if (pausedElapsedSecondsRef.current !== null) {
            roundStartedAtRef.current = Date.now() - pausedElapsedSecondsRef.current * 1000;
            pausedElapsedSecondsRef.current = null;
        }
        setConnectionPaused(false);
    };

    const shareGame = async () => {
        const shareData = { title: 'سودوكو السرعة', text: 'تعال نافسني في حل السودوكو', url: window.location.href };
        try {
            if (navigator.share) await navigator.share(shareData);
            else if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(shareData.url);
                showGuessFeedback('تم نسخ رابط اللعبة', 'success');
            }
        } catch { /* closed share sheet */ }
    };

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (gameState !== 'playing' || !selectedCell) return;
            const num = parseInt(e.key, 10);
            if (num >= 1 && num <= 9) {
                e.preventDefault();
                handleNumberClick(num);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
        }, [gameState, selectedCell, guessPending, toolMode, grid]);

    // --- Render ---

    const localPlayer = isHostRef.current ? 'p1' : 'p2';
    const didIWin = winner === localPlayer;
    const selectedGridCell = selectedCell ? grid?.[selectedCell.r]?.[selectedCell.c] : null;
    const selectedCellOpen = !!selectedGridCell && !selectedGridCell.initial && !selectedGridCell.filledBy;
    const selectedCellCanErase = !!selectedGridCell && !selectedGridCell.initial && (!selectedGridCell.filledBy || selectedGridCell.filledBy === localPlayer) && (selectedGridCell.filledBy === localPlayer || selectedGridCell.draftVal || selectedGridCell.notes?.length);

    if (gameState === 'lobby') {
        return (
            <div className="min-h-dvh max-w-md mx-auto px-4 flex flex-col safe-area-pt overflow-x-hidden overflow-y-auto pb-6">
                <div className="grid grid-cols-3 items-center py-4 mb-4">
                    <div><Logo size="small" /></div>
                    <div className="flex justify-center">
                        <div className="flex items-center gap-2 glass-card px-3.5 py-1.5 rounded-2xl border border-white/10 shrink-0">
                            <GameIcon gameId="speed-sudoku" size={18} className="text-[var(--accent)]" />
                            <span className="text-xs font-black gradient-text">سودوكو السرعة</span>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button onClick={() => setView('hub')} className="glass-card px-4 py-2 rounded-2xl text-xs font-bold hover:scale-105 transition-transform">
                            الرئيسية
                        </button>
                    </div>
                </div>
                <div className="sudoku-lobby-info mb-4 w-full rounded-2xl border px-4 py-3 text-right">
                    <h2 className="mb-1 text-sm font-black">طريقة اللعب</h2>
                    <p className="text-xs leading-6 text-white/80">كل لاعب بيحل نفس اللغز على لوحة مستقلة. اختار خانة فاضية واتأكد إن الرقم مناسب للصف والعمود والمربع ٣×٣. الإجابة الغلط تتحسب خطأ من غير ما تكتب في اللوحة، وأول لاعب يكمل الحل الصحيح يكسب نقطة الجولة.</p>
                    <p className="mt-1 text-[10px] leading-5 text-white/60">ضد الكمبيوتر: اضغط «ضد الذكاء الاصطناعي». مع صديق: أنشئ غرفة وابعث الكود له، أو ادخل بكوده.</p>
                </div>
                <div className="flex-1 flex pb-16 safe-area-pb">
                    <P2PConnectionManager gameIdPrefix="celia-sudoku" onGameStart={handleGameStart} />
                </div>
            </div>
        );
    }

    return (
        <div className="sudoku-app fixed inset-0 z-20 flex flex-col font-arabic select-none">
            <ConnectionPauseOverlay conn={connRef.current} opponentName={oppProfile?.nickname} onConnectionPause={pauseForConnection} onConnectionResume={resumeAfterConnection} onLeave={() => { connRef.current?.close(); setView('hub'); }} />
            <EmotesOverlay conn={connRef.current} />
            <header className="sudoku-topbar">
                <button className="sudoku-icon-button" aria-label="العودة للقائمة" onClick={() => { connRef.current?.close?.(); setView('hub'); }}><ArrowLeft size={21} /></button>
                <div className="sudoku-title"><span className="sudoku-title-icon"><GameIcon gameId="speed-sudoku" size={20} /></span><div><strong>سودوكو السرعة</strong><span>سباق حلّ اللغز</span></div></div>
                {gameState === 'playing' && <ChatTriggerButton onClick={() => window.dispatchEvent(new CustomEvent('toggle-game-chat'))} />}
                <button className="sudoku-icon-button" aria-label="مشاركة اللعبة" onClick={shareGame}><Share2 size={19} /></button>
            </header>
            {gameState === 'playing' && <GameNotifications className="mx-auto max-w-2xl px-4" />}
            {gameState === 'starting' ? (
                <main className="sudoku-wait"><div className="sudoku-wait-card"><div className="sudoku-spinner" /><strong>بنجهّز لوحة السودوكو</strong><span>هنبدأ أول ما خصمك يبقى جاهز</span></div></main>
            ) : (gameState === 'playing' || gameState === 'game_over') && grid ? (
                <main className="sudoku-main">
                    <section className="sudoku-scoreboard" aria-label="نتيجة الجولة">
                        <div className="sudoku-player-card is-me"><div className="sudoku-player-copy"><span>أنت</span><strong>{myScore} <small>نقطة</small></strong></div><div className="sudoku-player-progress"><div><span>تقدمك</span><b>{myProgress}/{CELLS_TO_REMOVE}</b></div><div className="sudoku-progress-track"><i style={{ width: String(Math.round((myProgress / CELLS_TO_REMOVE) * 100)) + '%' }} /></div></div></div>
                        <div className="sudoku-vs-mark">VS</div>
                        <div className="sudoku-player-card is-opponent"><div className="sudoku-player-copy"><span>{oppProfile?.nickname || 'الخصم'}</span><strong>{oppScore} <small>نقطة</small></strong></div><div className="sudoku-player-progress"><div><span>تقدمه</span><b>{oppProgress}/{CELLS_TO_REMOVE} · أخطاء {oppMistakes}</b></div><div className="sudoku-progress-track"><i style={{ width: String(Math.round((oppProgress / CELLS_TO_REMOVE) * 100)) + '%' }} /></div></div></div>
                    </section>
                    <section className="sudoku-puzzle-panel">
                        <div className="sudoku-puzzle-heading"><div><h1>حلّوا نفس اللغز</h1><p>كل لاعب له لوحة مستقلة — أول حل صحيح يكسب نقطة</p></div>{isAIRef.current && <span className="sudoku-ai-pill">{aiHasStarted ? 'الذكاء الاصطناعي بيلعب' : 'الذكاء الاصطناعي جاهز'}</span>}</div>
                        <div className="sudoku-stats-row"><div className="sudoku-stat"><span>الأخطاء</span><strong className={myMistakes ? 'has-mistakes' : ''}>{myMistakes}</strong></div><span className="sudoku-difficulty">متوسط</span><div className="sudoku-stat sudoku-time"><span>الوقت</span><strong>{String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:{String(elapsedSeconds % 60).padStart(2, '0')}</strong></div></div>
                        <div className="sudoku-board" role="grid" aria-label="لوحة سودوكو 9 في 9" dir="ltr">
                            {grid.map((row, r) => row.map((cell, c) => {
                                const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                                const isRelated = selectedCell && (selectedCell.r === r || selectedCell.c === c || (Math.floor(selectedCell.r / 3) === Math.floor(r / 3) && Math.floor(selectedCell.c / 3) === Math.floor(c / 3)));
                                const shown = cell.initial || cell.filledBy ? cell.val : cell.draftVal;
                                const selectedValue = selectedCell ? grid[selectedCell.r]?.[selectedCell.c] : null;
                                const sameDigit = shown && selectedValue && shown === (selectedValue.initial || selectedValue.filledBy ? selectedValue.val : selectedValue.draftVal);
                                const myFill = !cell.initial && cell.filledBy && cell.filledBy === localPlayer;
                                const valueClass = cell.initial ? 'is-given' : myFill ? 'is-entered' : cell.filledBy ? 'is-rival-entry' : cell.draftVal ? 'is-pencil-entry' : '';
                                const cellClass = ['sudoku-cell', isRelated ? 'is-related' : '', sameDigit ? 'is-same-digit' : '', isSelected ? 'is-selected' : '', errorCell?.r === r && errorCell?.c === c ? 'is-error' : '', valueClass].filter(Boolean).join(' ');
                                return <button type="button" role="gridcell" key={r + '-' + c} aria-label={'صف ' + (r + 1) + ' عمود ' + (c + 1) + (shown ? '، الرقم ' + shown : '، فارغة')} aria-selected={!!isSelected} className={cellClass} style={{ borderRight: c === 8 ? 0 : c % 3 === 2 ? '2px solid var(--sdk-grid-major)' : '1px solid var(--sdk-grid-line)', borderBottom: r === 8 ? 0 : r % 3 === 2 ? '2px solid var(--sdk-grid-major)' : '1px solid var(--sdk-grid-line)' }} onClick={() => { if (gameState !== 'playing' || guessPending) return; setSelectedCell({ r, c }); }}>
                                    {shown ? <span>{shown}</span> : cell.notes?.length > 0 ? <span className="sudoku-notes">{[1,2,3,4,5,6,7,8,9].map((n) => <i key={n}>{cell.notes.includes(n) ? n : ''}</i>)}</span> : null}
                                </button>;
                            }))}
                        </div>
                        <div className="sudoku-tools" aria-label="أدوات السودوكو">
                            <button type="button" disabled={!canUndo || gameState !== 'playing' || guessPending} onClick={() => handleBoardAction('undo')} className="sudoku-tool"><Undo2 size={20} /><span>تراجع</span></button>
                            <button type="button" disabled={!selectedCellCanErase || gameState !== 'playing' || guessPending} onClick={() => handleBoardAction('erase')} className="sudoku-tool"><Eraser size={20} /><span>مسح</span></button>
                            <button type="button" aria-pressed={toolMode === 'pencil'} disabled={!selectedCellOpen || gameState !== 'playing' || guessPending} onClick={() => setToolMode(toolMode === 'pencil' ? 'number' : 'pencil')} className={'sudoku-tool ' + (toolMode === 'pencil' ? 'is-active' : '')}><Pencil size={19} /><span>قلم</span></button>
                            <button type="button" disabled={myHintsUsed || gameState !== 'playing' || guessPending || myProgress >= CELLS_TO_REMOVE} onClick={() => handleBoardAction('hint')} className="sudoku-tool sudoku-hint-tool"><Lightbulb size={20} /><span>{myHintsUsed ? 'انتهى التلميح' : 'تلميح واحد'}</span></button>
                        </div>
                        <div className="sudoku-numberpad" aria-label="اختيار رقم">
                            {[1,2,3,4,5,6,7,8,9].map((num) => {
                                const remaining = 9 - grid.reduce((count, row) => count + row.filter((cell) => (cell.initial || cell.filledBy) && cell.val === num).length, 0);
                                return <button type="button" key={num} disabled={!selectedCellOpen || gameState !== 'playing' || guessPending || remaining === 0} onClick={() => handleNumberClick(num)} className={'sudoku-number ' + (remaining === 0 ? 'is-complete' : '')}><strong>{num}</strong><small>{remaining}</small></button>;
                            })}
                        </div>
                        <div className={'sudoku-feedback ' + (guessFeedback?.kind === 'error' ? 'is-error' : '')} aria-live="polite">{guessPending ? 'بنراجع اختيارك…' : guessFeedback?.message || (toolMode === 'pencil' ? 'القلم شغّال — اختار الأرقام اللي عايز تدوّنها' : 'اختار خانة فاضية ثم اضغط الرقم المناسب')}</div>
                    </section>
                </main>
            ) : null}
            {gameState === 'game_over' && (
                <div className="sudoku-result-backdrop"><section className="sudoku-result-card" role="dialog" aria-modal="true">
                    <div className={'sudoku-result-icon ' + (didIWin ? 'winner' : '')}>{didIWin ? '🏆' : '🧩'}</div>
                    <span className="sudoku-result-eyebrow">{didIWin ? 'نقطة الجولة ليك' : 'الخصم كسب نقطة الجولة'}</span><h2>{didIWin ? 'حلّيت السودوكو الأول!' : 'الخصم خلّص اللغز قبلك'}</h2><p>الأول اللي يكمل اللغز كامل وصحيح يكسب نقطة واحدة.</p>
                    <div className="sudoku-result-score"><div><strong>{myScore}</strong><span>أنت</span></div><b>—</b><div><strong>{oppScore}</strong><span>{oppProfile?.nickname || 'الخصم'}</span></div></div>
                    <div className="sudoku-result-actions"><button type="button" onClick={requestRematch} disabled={rematchPending} className="sudoku-primary-button">{rematchPending ? 'بنجهّز جولة جديدة…' : 'العب جولة جديدة'}</button><button type="button" onClick={() => { connRef.current?.close?.(); setView('hub'); }} className="sudoku-secondary-button">العودة للألعاب</button></div>
                </section></div>
            )}
        </div>
    );
}
