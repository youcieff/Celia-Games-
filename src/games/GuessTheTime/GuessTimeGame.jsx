import React, { useState, useRef, useEffect, useCallback } from 'react';
import P2PConnectionManager from '../../components/P2PConnectionManager';
import PlayerGameHeader from '../../components/PlayerGameHeader';
import ConnectionPauseOverlay from '../../components/ConnectionPauseOverlay';
import EmotesOverlay from '../../components/EmotesOverlay';
import Logo from '../../components/Logo';
import { IconGuessTime } from '../../components/icons/GameIcons';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Timer from 'lucide-react/dist/esm/icons/timer';
import Users from 'lucide-react/dist/esm/icons/users';
import Trophy from 'lucide-react/dist/esm/icons/trophy';
import { RPSChoiceButton, RPSTieNotice } from '../../components/RPSChoiceButton';
import { playSound, playHaptic } from '../../lib/audioEngine';
import useProfile from '../../hooks/useProfile';
import { triggerVictoryEffects, triggerDefeatEffects, triggerDrawEffects } from '../../lib/effectsEngine';

const TARGET_TIMES = [3, 5, 10]; // seconds
const TURN_RPS_OPTIONS = [
    { id: 'rock', label: 'حجر' },
    { id: 'paper', label: 'ورقة' },
    { id: 'scissors', label: 'مقص' }
];
const RPS_BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
const TURN_COUNTDOWN_MS = 3000;

function pad(n) {
    return String(Math.floor(n)).padStart(2, '0');
}

function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const cent = Math.floor((ms % 1000) / 10);
    return `${pad(s)}.${String(cent).padStart(2, '0')}`;
}

export default function GuessTimeGame({ setView }) {
    const connRef = useRef(null);
    const isHostRef = useRef(false);
    const hasHostSelectedModeRef = useRef(false);
    const gameSnapshotRef = useRef(null);
    const persistSnapshotRef = useRef(null);
    const persistWriteRef = useRef(Promise.resolve());
    const pausedByDisconnectRef = useRef(false);
    const guessBySeatRef = useRef({ host: '', peer: '' });
    const [myProfile, , awardMatchResult] = useProfile({ gameId: 'guess-time', gameTitle: 'خمن الوقت' });
    const [oppProfile, setOppProfile] = useState(null);
    const [isPeerDisconnected, setIsPeerDisconnected] = useState(false);

    // lobby → picking-mode → picking-target | picking-roles → ...
    const [gameState, setGameState] = useState('lobby');
    const gameStateRef = useRef(gameState);
    gameStateRef.current = gameState;
    const [gameMode, setGameMode] = useState('target'); // target | roles | turns

    // Target Mode States
    const [targetMs, setTargetMs] = useState(5000);
    const [customTarget, setCustomTarget] = useState('');

    // Roles Mode States
    const [myRole, setMyRole] = useState(null); // 'hider' or 'guesser'
    const [hiderFinished, setHiderFinished] = useState(false);
    const [guesserFinished, setGuesserFinished] = useState(false);
    const [guessValue, setGuessValue] = useState('');

    // Stopwatch
    const [elapsed, setElapsed] = useState(0);
    const [isHolding, setIsHolding] = useState(false);
    const [showTimer, setShowTimer] = useState(true);
    const [myResult, setMyResult] = useState(null);
    const [oppResult, setOppResult] = useState(null);
    const [bothDone, setBothDone] = useState(false);

    const [countdown, setCountdown] = useState(null);
    const [scores, setScores] = useState({ me: 0, opp: 0 });

    // Shared-time turns mode: the clock pauses between turns and accumulates
    // until the active player lets it reach the chosen limit.
    const [turnRpsChoice, setTurnRpsChoice] = useState(null);
    const [turnOppRpsChoice, setTurnOppRpsChoice] = useState(null);
    const [turnRpsWinner, setTurnRpsWinner] = useState(null);
    const [turnActiveSeat, setTurnActiveSeat] = useState(null);
    const [turnCountdown, setTurnCountdown] = useState(null);
    const [turnElapsed, setTurnElapsed] = useState(0);
    const [turnClockRunning, setTurnClockRunning] = useState(false);
    const [turnAwaitingNext, setTurnAwaitingNext] = useState(false);
    const [turnLastStop, setTurnLastStop] = useState(null);
    const [turnNotice, setTurnNotice] = useState('');
    const [turnRoundResult, setTurnRoundResult] = useState(null);

    const holdStartRef = useRef(null);
    const intervalRef = useRef(null);
    const countdownIntervalRef = useRef(null);
    const countdownValueRef = useRef(null);
    const targetCountdownPausedRef = useRef(false);
    const myResultRef = useRef(null);
    const scoresRef = useRef(scores);
    scoresRef.current = scores;
    const turnRpsChoiceRef = useRef(null);
    const turnOppRpsChoiceRef = useRef(null);
    const turnRpsResolvedRef = useRef(false);
    const turnActiveSeatRef = useRef(null);
    const turnIdRef = useRef(null);
    const turnElapsedBaseRef = useRef(0);
    const turnAwaitingNextRef = useRef(false);
    const turnSettledRef = useRef(false);
    const turnAttemptHandledRef = useRef(false);
    const turnTargetMsRef = useRef(5000);
    const turnClockRunningRef = useRef(false);
    const turnClockOwnerRef = useRef(null);
    const turnClockStartedAtRef = useRef(0);
    const turnClockElapsedRef = useRef(0);
    const turnClockSyncAtRef = useRef(0);
    const turnClockIntervalRef = useRef(null);
    const turnTimeoutRef = useRef(null);
    const turnCountdownIntervalRef = useRef(null);
    const turnIntermissionRef = useRef(null);
    const turnScoresRef = useRef({ host: 0, peer: 0 });
    const turnMatchRecordedRef = useRef(false);
    const matchRecordedRef = useRef(false);

    const BLIND_DELAY = 1000;

    const clearHoldInterval = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    const clearTurnTimers = () => {
        if (turnClockIntervalRef.current) clearInterval(turnClockIntervalRef.current);
        if (turnTimeoutRef.current) clearTimeout(turnTimeoutRef.current);
        if (turnCountdownIntervalRef.current) clearInterval(turnCountdownIntervalRef.current);
        if (turnIntermissionRef.current) clearTimeout(turnIntermissionRef.current);
        turnClockIntervalRef.current = null;
        turnTimeoutRef.current = null;
        turnCountdownIntervalRef.current = null;
        turnIntermissionRef.current = null;
        turnClockRunningRef.current = false;
    };

    const resetTurnRound = () => {
        clearTurnTimers();
        turnRpsChoiceRef.current = null;
        turnOppRpsChoiceRef.current = null;
        turnRpsResolvedRef.current = false;
        turnActiveSeatRef.current = null;
        turnIdRef.current = null;
        turnElapsedBaseRef.current = 0;
        turnAwaitingNextRef.current = false;
        turnSettledRef.current = false;
        turnAttemptHandledRef.current = false;
        turnMatchRecordedRef.current = false;
        turnClockOwnerRef.current = null;
        turnClockElapsedRef.current = 0;
        turnClockSyncAtRef.current = 0;
        setTurnRpsChoice(null);
        setTurnOppRpsChoice(null);
        setTurnRpsWinner(null);
        setTurnActiveSeat(null);
        setTurnCountdown(null);
        setTurnElapsed(0);
        setTurnClockRunning(false);
        setTurnAwaitingNext(false);
        setTurnLastStop(null);
        setTurnNotice('');
        setTurnRoundResult(null);
    };

    const resetRound = () => {
        clearHoldInterval();
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        countdownValueRef.current = null;
        targetCountdownPausedRef.current = false;
        resetTurnRound();
        setElapsed(0);
        setIsHolding(false);
        setShowTimer(true);
        setMyResult(null);
        setOppResult(null);
        setBothDone(false);
        setHiderFinished(false);
        setGuesserFinished(false);
        setGuessValue('');
        guessBySeatRef.current = { host: '', peer: '' };
        myResultRef.current = null;
        matchRecordedRef.current = false;
    };

    const getGameSnapshot = () => {
        const localSeat = isHostRef.current ? 'host' : 'peer';
        let phase = gameState;
        if (phase === 'waiting-settings') {
            phase = hasHostSelectedModeRef.current
                ? (gameMode === 'roles' ? 'picking-roles' : 'picking-target')
                : 'picking-mode';
        }

        const activeElapsed = isHolding && holdStartRef.current
            ? Math.max(0, Date.now() - holdStartRef.current)
            : elapsed;
        let sharedElapsed = turnElapsedBaseRef.current;
        if (turnClockRunningRef.current) {
            const now = performance.now();
            sharedElapsed = turnClockOwnerRef.current === localSeat
                ? turnElapsedBaseRef.current + Math.max(0, now - turnClockStartedAtRef.current)
                : turnClockElapsedRef.current + Math.max(0, now - turnClockSyncAtRef.current);
        }

        return {
            version: 1,
            savedAt: Date.now(),
            phase,
            gameMode,
            targetMs,
            scores: localSeat === 'host'
                ? { host: scores.me, peer: scores.opp }
                : { host: scores.opp, peer: scores.me },
            roles: localSeat === 'host'
                ? { host: myRole, peer: myRole ? (myRole === 'hider' ? 'guesser' : 'hider') : null }
                : { host: myRole ? (myRole === 'hider' ? 'guesser' : 'hider') : null, peer: myRole },
            target: {
                players: {
                    [localSeat]: {
                        elapsed: activeElapsed,
                        isHolding,
                        showTimer,
                        guessValue: guessBySeatRef.current[localSeat] || ''
                    }
                },
                hostResult: localSeat === 'host' ? myResult : oppResult,
                peerResult: localSeat === 'peer' ? myResult : oppResult,
                bothDone,
                hiderFinished,
                guesserFinished,
                guesses: { ...guessBySeatRef.current }
            },
            turn: {
                rpsChoices: localSeat === 'host'
                    ? { host: turnRpsChoiceRef.current, peer: turnOppRpsChoiceRef.current }
                    : { host: turnOppRpsChoiceRef.current, peer: turnRpsChoiceRef.current },
                rpsWinner: turnRpsWinner,
                activeSeat: turnActiveSeatRef.current,
                turnId: turnIdRef.current,
                elapsed: Math.min(turnTargetMsRef.current, Math.max(0, sharedElapsed)),
                clockRunning: turnClockRunningRef.current,
                clockOwner: turnClockOwnerRef.current,
                awaitingNext: turnAwaitingNextRef.current,
                lastStop: ['host', 'peer'].includes(turnLastStop) ? turnLastStop : null,
                notice: turnNotice,
                roundResult: turnRoundResult,
                scores: { ...turnScoresRef.current },
                targetMs: turnTargetMsRef.current
            }
        };
    };

    const persistSnapshot = () => {
        if (!connRef.current || gameState === 'lobby') return null;
        const snapshot = getGameSnapshot();
        gameSnapshotRef.current = snapshot;
        persistWriteRef.current = connRef.current.savePlayerState?.(snapshot, isHostRef.current ? 'host' : 'peer') || Promise.resolve();
        return snapshot;
    };
    persistSnapshotRef.current = persistSnapshot;

    const restoreGameSnapshot = (snapshot) => {
        if (!snapshot || snapshot.version !== 1) return false;
        gameSnapshotRef.current = snapshot;
        clearHoldInterval();
        clearTurnTimers();

        const localSeat = isHostRef.current ? 'host' : 'peer';
        const peerSeat = localSeat === 'host' ? 'peer' : 'host';
        const phase = snapshot.phase || 'picking-mode';
        const target = snapshot.target || {};
        const localTarget = target.players?.[localSeat] || target;
        const turn = snapshot.turn || {};
        const savedScores = snapshot.scores || {};
        const savedRole = snapshot.roles?.[localSeat] || null;
        const restoredState = phase === 'picking-mode'
            ? (isHostRef.current ? 'picking-mode' : 'waiting-settings')
            : phase === 'picking-target' || phase === 'picking-roles'
                ? (isHostRef.current ? phase : 'waiting-settings')
                : phase === 'countdown'
                    ? 'playing-target'
                    : phase === 'turn-countdown'
                        ? 'playing-turns'
                        : phase;

        hasHostSelectedModeRef.current = phase !== 'picking-mode';
        setGameMode(snapshot.gameMode || 'target');
        setTargetMs(Number(snapshot.targetMs) || 5000);
        setScores(localSeat === 'host'
            ? { me: Number(savedScores.host) || 0, opp: Number(savedScores.peer) || 0 }
            : { me: Number(savedScores.peer) || 0, opp: Number(savedScores.host) || 0 });
        setMyRole(savedRole);
        setGameState(restoredState);

        const savedElapsed = Math.max(0, Number(localTarget.elapsed) || 0);
        const localResult = target[`${localSeat}Result`] ?? null;
        const opponentResult = target[`${peerSeat}Result`] ?? null;
        myResultRef.current = localResult;
        setElapsed(savedElapsed);
        setShowTimer(localTarget.showTimer !== false);
        setMyResult(localResult);
        setOppResult(opponentResult);
        setBothDone(Boolean(target.bothDone));
        setIsHolding(Boolean(localTarget.isHolding) && localResult === null);
        setHiderFinished(Boolean(target.hiderFinished));
        setGuesserFinished(Boolean(target.guesserFinished));
        guessBySeatRef.current = {
            host: target.guesses?.host || target.players?.host?.guessValue || '',
            peer: target.guesses?.peer || target.players?.peer?.guessValue || ''
        };
        setGuessValue(guessBySeatRef.current[localSeat] || '');
        if (localTarget.isHolding && localResult === null) {
            holdStartRef.current = Date.now() - savedElapsed;
            intervalRef.current = setInterval(() => setElapsed(Date.now() - holdStartRef.current), 30);
        } else {
            holdStartRef.current = null;
        }

        const choices = turn.rpsChoices || {};
        turnRpsChoiceRef.current = choices[localSeat] || null;
        turnOppRpsChoiceRef.current = choices[peerSeat] || null;
        turnRpsResolvedRef.current = Boolean(turn.rpsWinner);
        turnActiveSeatRef.current = turn.activeSeat || null;
        turnIdRef.current = turn.turnId || null;
        turnElapsedBaseRef.current = Math.max(0, Number(turn.elapsed) || 0);
        turnClockElapsedRef.current = turnElapsedBaseRef.current;
        turnAwaitingNextRef.current = Boolean(turn.awaitingNext);
        turnSettledRef.current = Boolean(turn.roundResult);
        turnAttemptHandledRef.current = false;
        turnClockOwnerRef.current = turn.clockOwner || null;
        turnClockRunningRef.current = false;
        turnClockSyncAtRef.current = 0;
        turnTargetMsRef.current = Math.max(1, Number(turn.targetMs || snapshot.targetMs) || 5000);
        turnScoresRef.current = {
            host: Number(turn.scores?.host ?? savedScores.host) || 0,
            peer: Number(turn.scores?.peer ?? savedScores.peer) || 0
        };
        setTurnRpsChoice(turnRpsChoiceRef.current);
        setTurnOppRpsChoice(turnOppRpsChoiceRef.current);
        setTurnRpsWinner(turn.rpsWinner || null);
        setTurnActiveSeat(turnActiveSeatRef.current);
        setTurnCountdown(null);
        setTurnElapsed(turnElapsedBaseRef.current);
        setTurnClockRunning(false);
        setTurnAwaitingNext(Boolean(turn.awaitingNext));
        setTurnLastStop(['host', 'peer'].includes(turn.lastStop) ? turn.lastStop : null);
        setTurnNotice(turn.clockRunning ? 'الاتصال انقطع؛ الوقت محفوظ. ابدأوا من نفس النقطة.' : (turn.notice || ''));
        setTurnRoundResult(turn.roundResult || null);
        pausedByDisconnectRef.current = false;
        return true;
    };

    const handleGameStart = (conn, hostMode, oppProf, savedState) => {
        isHostRef.current = hostMode;
        connRef.current = conn;
        if (oppProf) setOppProfile(oppProf);
        conn.on('data', onData);
        const restored = restoreGameSnapshot(savedState);
        if (!restored) {
            hasHostSelectedModeRef.current = false;
            if (savedState?.scores) setScores(savedState.scores);
            setGameState(hostMode ? 'picking-mode' : 'waiting-settings');
        }

        const handlePeerDisconnect = () => {
            setIsPeerDisconnected(true);
            if (gameStateRef.current === 'countdown' && countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
                targetCountdownPausedRef.current = true;
            }
            const current = gameSnapshotRef.current;
            const localSeat = isHostRef.current ? 'host' : 'peer';
            if (current?.target?.players?.[localSeat]?.isHolding && holdStartRef.current) {
                const frozenElapsed = Math.max(0, Date.now() - holdStartRef.current);
                clearHoldInterval();
                holdStartRef.current = Date.now() - frozenElapsed;
                setElapsed(frozenElapsed);
                pausedByDisconnectRef.current = true;
            }

            if (turnClockRunningRef.current) {
                const now = performance.now();
                const frozenElapsed = turnClockOwnerRef.current === (isHostRef.current ? 'host' : 'peer')
                    ? turnElapsedBaseRef.current + Math.max(0, now - turnClockStartedAtRef.current)
                    : turnClockElapsedRef.current + Math.max(0, now - turnClockSyncAtRef.current);
                clearTurnTimers();
                turnElapsedBaseRef.current = Math.min(turnTargetMsRef.current, frozenElapsed);
                turnClockElapsedRef.current = turnElapsedBaseRef.current;
                setTurnElapsed(turnElapsedBaseRef.current);
                setTurnClockRunning(false);
                setTurnNotice('انقطع اتصال الخصم؛ الوقت محفوظ عند نفس النقطة. استأنفوا بعد رجوعه.');
                pausedByDisconnectRef.current = true;
            }
            setTimeout(() => persistSnapshotRef.current?.(), 0);
        };

        const handlePeerReconnect = () => {
            setIsPeerDisconnected(false);
            if (targetCountdownPausedRef.current) {
                targetCountdownPausedRef.current = false;
                runTargetCountdown(countdownValueRef.current || 1);
            }
            const localSeat = isHostRef.current ? 'host' : 'peer';
            const localTarget = gameSnapshotRef.current?.target?.players?.[localSeat];
            if (pausedByDisconnectRef.current && localTarget?.isHolding && holdStartRef.current) {
                holdStartRef.current = Date.now() - Math.max(0, Number(localTarget.elapsed) || 0);
                clearHoldInterval();
                intervalRef.current = setInterval(() => setElapsed(Date.now() - holdStartRef.current), 30);
            }
            pausedByDisconnectRef.current = false;
            setTimeout(() => {
                const state = persistSnapshotRef.current?.() || gameSnapshotRef.current;
                Promise.resolve(persistWriteRef.current)
                    .then(() => conn.getState?.())
                    .then(sharedState => conn.send({ type: 'state_sync', state: sharedState || state }))
                    .catch(() => { if (state) conn.send({ type: 'state_sync', state }); });
            }, 0);
        };
        conn.on('peer-disconnect', handlePeerDisconnect);
        conn.on('peer-reconnect', handlePeerReconnect);
    };

    const onData = useCallback((msg) => {
        switch (msg.type) {
            case 'mode_selected':
                if (!isHostRef.current && ['target', 'roles', 'turns'].includes(msg.mode)) {
                    hasHostSelectedModeRef.current = true;
                    setGameMode(msg.mode);
                }
                break;
            case 'start_target_mode':
                hasHostSelectedModeRef.current = true;
                setGameMode('target');
                setTargetMs(msg.targetMs);
                startCountdown();
                break;
            case 'start_roles_mode':
                hasHostSelectedModeRef.current = true;
                setGameMode('roles');
                setMyRole(msg.hostIsHider ? 'guesser' : 'hider'); // Opposite of host
                resetRound();
                setGameState('playing-roles');
                playSound('ding');
                break;
            case 'start_turn_mode':
                enterTurnMode(msg.targetMs);
                break;
            case 'turn_rps_choice':
                receiveTurnRpsChoice(msg);
                break;
            case 'turn_rps_tie':
                resetTurnRpsChoices();
                setTurnNotice('تعادل! العبوا حجر ورقة مقص مرة تانية.');
                break;
            case 'turn_rps_result':
                setTurnRpsWinner(msg.firstPlayer);
                turnRpsChoiceRef.current = isHostRef.current ? msg.hostChoice : msg.peerChoice;
                turnOppRpsChoiceRef.current = isHostRef.current ? msg.peerChoice : msg.hostChoice;
                setTurnRpsChoice(isHostRef.current ? msg.hostChoice : msg.peerChoice);
                setTurnOppRpsChoice(isHostRef.current ? msg.peerChoice : msg.hostChoice);
                break;
            case 'turn_countdown':
                installTurnCountdown(msg.seat, msg.turnId, msg.delayMs, msg.elapsedBase);
                break;
            case 'turn_clock_started':
                if (msg.seat === (isHostRef.current ? 'peer' : 'host')) syncTurnClockStarted(msg);
                break;
            case 'turn_finished':
                if (isHostRef.current && msg.seat === 'peer') processTurnFinished(msg);
                break;
            case 'turn_progress':
                if (msg.turnId && msg.turnId !== turnIdRef.current) break;
                clearTurnTimers();
                turnClockRunningRef.current = false;
                setTurnClockRunning(false);
                if (msg.seat !== (isHostRef.current ? 'host' : 'peer')) playSound('stopwatch_stop');
                turnElapsedBaseRef.current = Math.max(0, Number(msg.elapsed) || 0);
                turnClockElapsedRef.current = turnElapsedBaseRef.current;
                setTurnLastStop(['host', 'peer'].includes(msg.seat) ? msg.seat : null);
                turnAwaitingNextRef.current = true;
                setTurnAwaitingNext(true);
                setTurnNotice(msg.notice || 'الدور التالي بعد لحظات');
                break;
            case 'turn_round_result':
                receiveTurnRoundResult(msg);
                break;
            case 'hider_started':
                playSound('stopwatch_start');
                playHaptic(20);
                const st = Date.now();
                holdStartRef.current = st;
                setIsHolding(true);
                setElapsed(0);
                setShowTimer(true);
                setTimeout(() => setShowTimer(false), BLIND_DELAY);
                intervalRef.current = setInterval(() => {
                    setElapsed(Date.now() - st);
                }, 30);
                break;
            case 'hider_done':
                clearHoldInterval();
                playSound('stopwatch_stop');
                playHaptic([30, 20, 50]);
                setOppResult(msg.elapsed);
                setElapsed(msg.elapsed);
                setIsHolding(false);
                setShowTimer(true);
                setHiderFinished(true);
                break;
            case 'guesser_done':
                setOppResult(msg.guessMs);
                setGuesserFinished(true);
                break;
            case 'guess_draft':
                if (['host', 'peer'].includes(msg.seat) && msg.seat !== (isHostRef.current ? 'host' : 'peer')) {
                    guessBySeatRef.current[msg.seat] = String(msg.value || '').slice(0, 8);
                    setTimeout(() => persistSnapshotRef.current?.(), 0);
                }
                break;
            case 'opp_started':
                playSound('stopwatch_start');
                break;
            case 'opp_result':
                setOppResult(msg.elapsed);
                playSound('stopwatch_stop');
                break;
            case 'restart':
                doRestart();
                break;
            case 'state_sync':
                if (msg.state?.version === 1) restoreGameSnapshot(msg.state);
                else if (msg.state?.scores) setScores(msg.state.scores);
                break;
            default: break;
        }
    }, []); // eslint-disable-line

    const startCountdown = () => {
        setGameState('countdown');
        resetRound();
        runTargetCountdown(3);
    };

    const runTargetCountdown = (startFrom) => {
        let c = Math.max(1, Number(startFrom) || 1);
        countdownValueRef.current = c;
        setCountdown(c);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = setInterval(() => {
            c--;
            countdownValueRef.current = c;
            if (c <= 0) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
                setCountdown(null);
                setGameState('playing-target');
                playSound('ding');
            } else {
                setCountdown(c);
                playSound('click');
            }
        }, 1000);
    };

    // ── Host Configuration ───────────────────────────────────────────────
    const handleSelectMode = (mode) => {
        playSound('click');
        hasHostSelectedModeRef.current = true;
        setGameMode(mode);
        setGameState(mode === 'roles' ? 'picking-roles' : 'picking-target');
        connRef.current?.send({ type: 'mode_selected', mode });
    };

    const handlePickTarget = (ms) => {
        playSound('click');
        playHaptic(15);
        setTargetMs(ms);
        if (gameMode === 'turns') {
            connRef.current?.send({ type: 'start_turn_mode', targetMs: ms });
            enterTurnMode(ms);
            return;
        }
        connRef.current?.send({ type: 'start_target_mode', targetMs: ms });
        startCountdown();
    };

    const handleCustomTarget = () => {
        const val = parseFloat(customTarget);
        if (!isNaN(val) && val > 0 && val <= 60) {
            handlePickTarget(val * 1000);
        } else {
            playSound('lose');
        }
    };

    const enterTurnMode = (ms) => {
        resetRound();
        const safeTarget = Number.isFinite(ms) && ms > 0 ? ms : 5000;
        turnTargetMsRef.current = safeTarget;
        turnScoresRef.current = isHostRef.current
            ? { host: scoresRef.current.me, peer: scoresRef.current.opp }
            : { host: scoresRef.current.opp, peer: scoresRef.current.me };
        setTargetMs(safeTarget);
        setGameMode('turns');
        setGameState('turn-rps');
        playSound('ding');
    };

    const resetTurnRpsChoices = () => {
        turnRpsChoiceRef.current = null;
        turnOppRpsChoiceRef.current = null;
        turnRpsResolvedRef.current = false;
        setTurnRpsChoice(null);
        setTurnOppRpsChoice(null);
        setTurnRpsWinner(null);
        playSound('click');
    };

    const handleTurnRpsChoice = (choice) => {
        if (gameState !== 'turn-rps' || turnRpsChoiceRef.current) return;
        turnRpsChoiceRef.current = choice;
        setTurnRpsChoice(choice);
        setTurnNotice('');
        connRef.current?.send({ type: 'turn_rps_choice', seat: isHostRef.current ? 'host' : 'peer', choice });
        playSound('tap');
        playHaptic(20);
        if (isHostRef.current && turnOppRpsChoiceRef.current) resolveTurnRps();
    };

    const receiveTurnRpsChoice = (msg) => {
        const localSeat = isHostRef.current ? 'host' : 'peer';
        if (msg.seat === localSeat || !['rock', 'paper', 'scissors'].includes(msg.choice)) return;
        turnOppRpsChoiceRef.current = msg.choice;
        setTurnOppRpsChoice(msg.choice);
        setTurnNotice('');
        if (isHostRef.current && turnRpsChoiceRef.current) resolveTurnRps();
    };

    const resolveTurnRps = () => {
        if (!isHostRef.current || turnRpsResolvedRef.current || !turnRpsChoiceRef.current || !turnOppRpsChoiceRef.current) return;
        turnRpsResolvedRef.current = true;
        const hostChoice = turnRpsChoiceRef.current;
        const peerChoice = turnOppRpsChoiceRef.current;
        if (hostChoice === peerChoice) {
            connRef.current?.send({ type: 'turn_rps_tie' });
            resetTurnRpsChoices();
            setTurnNotice('تعادل! العبوا حجر ورقة مقص مرة تانية.');
            return;
        }

        const firstPlayer = RPS_BEATS[hostChoice] === peerChoice ? 'host' : 'peer';
        setTurnRpsWinner(firstPlayer);
        connRef.current?.send({ type: 'turn_rps_result', firstPlayer, hostChoice, peerChoice });
        playSound('win');
        beginTurnCountdown(firstPlayer);
    };

    const installTurnCountdown = (seat, turnId, delayMs = TURN_COUNTDOWN_MS, elapsedBase = turnElapsedBaseRef.current) => {
        if (!['host', 'peer'].includes(seat) || !turnId) return;
        if (turnClockIntervalRef.current) clearInterval(turnClockIntervalRef.current);
        if (turnTimeoutRef.current) clearTimeout(turnTimeoutRef.current);
        if (turnCountdownIntervalRef.current) clearInterval(turnCountdownIntervalRef.current);
        turnClockIntervalRef.current = null;
        turnTimeoutRef.current = null;
        turnSettledRef.current = false;
        turnAttemptHandledRef.current = false;
        turnActiveSeatRef.current = seat;
        turnIdRef.current = turnId;
        turnClockRunningRef.current = false;
        turnClockOwnerRef.current = null;
        const safeElapsedBase = Math.max(0, Number(elapsedBase) || 0);
        turnElapsedBaseRef.current = safeElapsedBase;
        turnClockElapsedRef.current = safeElapsedBase;
        turnClockSyncAtRef.current = 0;
        setTurnActiveSeat(seat);
        setTurnElapsed(safeElapsedBase);
        setTurnClockRunning(false);
        turnAwaitingNextRef.current = false;
        setTurnAwaitingNext(false);
        setTurnNotice('');

        const deadline = Date.now() + Math.max(0, Number(delayMs) || 0);
        const updateCountdown = () => {
            const remaining = deadline - Date.now();
            setTurnCountdown(Math.max(0, Math.ceil(remaining / 1000)));
            if (remaining <= 0) {
                clearInterval(turnCountdownIntervalRef.current);
                turnCountdownIntervalRef.current = null;
                setTurnCountdown(null);
                setGameState('playing-turns');
            }
        };
        setGameState('turn-countdown');
        updateCountdown();
        turnCountdownIntervalRef.current = setInterval(updateCountdown, 100);
    };

    const beginTurnCountdown = (seat) => {
        if (!isHostRef.current) return;
        if (turnIntermissionRef.current) clearTimeout(turnIntermissionRef.current);
        const turnId = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 7);
        const message = {
            type: 'turn_countdown',
            seat,
            turnId,
            delayMs: TURN_COUNTDOWN_MS,
            elapsedBase: turnElapsedBaseRef.current
        };
        installTurnCountdown(seat, turnId, message.delayMs, message.elapsedBase);
        connRef.current?.send(message);
    };

    const syncTurnClockStarted = (msg) => {
        const localSeat = isHostRef.current ? 'host' : 'peer';
        if (msg.seat !== turnActiveSeatRef.current || msg.turnId !== turnIdRef.current || turnSettledRef.current) return;
        if (turnClockIntervalRef.current) clearInterval(turnClockIntervalRef.current);
        if (turnTimeoutRef.current) clearTimeout(turnTimeoutRef.current);
        const elapsedBase = Math.max(0, Number(msg.elapsedBase ?? turnElapsedBaseRef.current) || 0);
        turnElapsedBaseRef.current = elapsedBase;
        turnClockOwnerRef.current = msg.seat;
        turnClockRunningRef.current = true;
        turnClockStartedAtRef.current = performance.now();
        turnClockElapsedRef.current = elapsedBase;
        turnClockSyncAtRef.current = performance.now();
        setTurnLastStop(null);
        setTurnElapsed(elapsedBase);
        setTurnClockRunning(true);
        setTurnNotice('');
        playSound('stopwatch_start');
        playHaptic(20);

        const updateClock = () => {
            if (!turnClockRunningRef.current || turnIdRef.current !== msg.turnId) return;
            const now = performance.now();
            const isLocalOwner = msg.seat === localSeat;
            const elapsedMs = Math.min(turnTargetMsRef.current, isLocalOwner
                ? elapsedBase + now - turnClockStartedAtRef.current
                : turnClockElapsedRef.current + Math.max(0, now - turnClockSyncAtRef.current));
            setTurnElapsed(elapsedMs);

            if (isLocalOwner) {
                if (elapsedMs >= turnTargetMsRef.current) {
                    completeTurnAttempt(msg.seat, msg.turnId, turnTargetMsRef.current, true);
                    return;
                }
            }
        };
        turnClockIntervalRef.current = setInterval(updateClock, 30);
        if (msg.seat === localSeat) {
            turnTimeoutRef.current = setTimeout(() => {
                completeTurnAttempt(msg.seat, msg.turnId, turnTargetMsRef.current, true);
            }, Math.max(0, turnTargetMsRef.current - elapsedBase));
        }
    };

    const startTurnClock = () => {
        const localSeat = isHostRef.current ? 'host' : 'peer';
        if (gameState !== 'playing-turns' || turnActiveSeatRef.current !== localSeat || turnClockRunningRef.current || turnAwaitingNextRef.current) return;
        const message = {
            type: 'turn_clock_started',
            seat: localSeat,
            turnId: turnIdRef.current,
            elapsedBase: turnElapsedBaseRef.current
        };
        syncTurnClockStarted(message);
        connRef.current?.send(message);
    };

    const completeTurnAttempt = (seat, turnId, elapsed, forcedLoss = false) => {
        if (!turnClockRunningRef.current || turnId !== turnIdRef.current || seat !== turnClockOwnerRef.current) return;
        const finalElapsed = forcedLoss
            ? turnTargetMsRef.current
            : Math.max(turnElapsedBaseRef.current, Number(elapsed) || 0);
        const overLimit = forcedLoss || finalElapsed >= turnTargetMsRef.current;
        turnClockRunningRef.current = false;
        if (turnClockIntervalRef.current) clearInterval(turnClockIntervalRef.current);
        if (turnTimeoutRef.current) clearTimeout(turnTimeoutRef.current);
        turnClockIntervalRef.current = null;
        turnTimeoutRef.current = null;
        setTurnClockRunning(false);
        if (overLimit) setTurnLastStop(null);
        turnAwaitingNextRef.current = !overLimit;
        setTurnAwaitingNext(!overLimit);
        setTurnElapsed(finalElapsed);
        if (!overLimit) setTurnLastStop(seat);
        setTurnNotice(overLimit ? 'عدّيتوا الوقت المحدد؛ بنعلن النتيجة...' : 'وقفت قبل الحد؛ الدور التالي بعد لحظات');
        playSound('stopwatch_stop');
        playHaptic([30, 20, 50]);

        const message = { type: 'turn_finished', seat, turnId, elapsed: finalElapsed, overLimit };
        if (isHostRef.current) processTurnFinished(message);
        else connRef.current?.send(message);
    };

    const stopTurnClock = () => {
        const localSeat = isHostRef.current ? 'host' : 'peer';
        if (gameState !== 'playing-turns' || !turnClockRunningRef.current || turnClockOwnerRef.current !== localSeat) return;
        const elapsedMs = turnElapsedBaseRef.current + performance.now() - turnClockStartedAtRef.current;
        completeTurnAttempt(localSeat, turnIdRef.current, elapsedMs, elapsedMs >= turnTargetMsRef.current);
    };

    const finishTurnRound = (winnerSeat, details = {}) => {
        if (!isHostRef.current || turnSettledRef.current) return;
        turnSettledRef.current = true;
        clearTurnTimers();
        const nextScores = { ...turnScoresRef.current };
        if (winnerSeat === 'host' || winnerSeat === 'peer') nextScores[winnerSeat] += 1;
        turnScoresRef.current = nextScores;
        setScores(isHostRef.current
            ? { me: nextScores.host, opp: nextScores.peer }
            : { me: nextScores.peer, opp: nextScores.host });

        const result = {
            winnerSeat,
            reason: details.reason || 'timeout',
            elapsed: Math.max(0, Number(details.elapsed) || 0),
            loserSeat: details.loserSeat || null,
            targetMs: turnTargetMsRef.current,
            hostScore: nextScores.host,
            peerScore: nextScores.peer
        };
        setTurnRoundResult(result);
        setTurnLastStop(null);
        setTurnActiveSeat(null);
        turnActiveSeatRef.current = null;
        turnAwaitingNextRef.current = false;
        setTurnAwaitingNext(false);
        setGameState('result-turns');
        connRef.current?.send({ type: 'turn_round_result', ...result });

        const localSeat = isHostRef.current ? 'host' : 'peer';
        if (!turnMatchRecordedRef.current) {
            turnMatchRecordedRef.current = true;
            awardMatchResult(winnerSeat === 'draw' ? 'draw' : winnerSeat === localSeat ? 'win' : 'loss', {
                gameId: 'guess-time',
                gameTitle: 'خمن الوقت',
                oppName: oppProfile?.nickname || 'الخصم',
                oppAvatar: oppProfile?.avatar || 'cool'
            });
        }
        if (details.loserSeat && details.loserSeat !== localSeat) playSound('stopwatch_stop');
        if (winnerSeat === 'draw') {
            playSound('ding');
            triggerDrawEffects();
        } else if (winnerSeat === localSeat) {
            playSound('win');
            triggerVictoryEffects();
            if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100]);
        } else {
            playSound('lose');
            triggerDefeatEffects();
        }
    };

    const processTurnFinished = (msg) => {
        if (!isHostRef.current || turnSettledRef.current || turnAttemptHandledRef.current || msg.turnId !== turnIdRef.current || msg.seat !== turnActiveSeatRef.current) return;
        turnAttemptHandledRef.current = true;
        clearTurnTimers();
        setTurnClockRunning(false);
        const elapsedMs = Math.min(turnTargetMsRef.current, Math.max(turnElapsedBaseRef.current, Number(msg.elapsed) || 0));
        turnElapsedBaseRef.current = elapsedMs;
        turnClockElapsedRef.current = elapsedMs;
        setTurnElapsed(elapsedMs);

        if (msg.overLimit || elapsedMs >= turnTargetMsRef.current) {
            finishTurnRound(msg.seat === 'host' ? 'peer' : 'host', {
                reason: 'timeout',
                elapsed: elapsedMs,
                loserSeat: msg.seat
            });
            return;
        }

        const nextSeat = msg.seat === 'host' ? 'peer' : 'host';
        if (msg.seat !== 'host') playSound('stopwatch_stop');
        const notice = 'تم إيقاف المؤقت؛ الدور التالي سيكمل من نفس الوقت';
        setTurnLastStop(msg.seat);
        turnAwaitingNextRef.current = true;
        setTurnAwaitingNext(true);
        setTurnNotice(notice);
        connRef.current?.send({ type: 'turn_progress', seat: msg.seat, turnId: turnIdRef.current, elapsed: elapsedMs, notice });
        turnIntermissionRef.current = setTimeout(() => beginTurnCountdown(nextSeat), 1200);
    };

    const receiveTurnRoundResult = (msg) => {
        clearTurnTimers();
        turnElapsedBaseRef.current = Math.max(0, Number(msg.elapsed) || 0);
        turnScoresRef.current = { host: msg.hostScore, peer: msg.peerScore };
        setTurnRoundResult(msg);
        setTurnLastStop(null);
        setTurnActiveSeat(null);
        turnActiveSeatRef.current = null;
        setTurnClockRunning(false);
        turnAwaitingNextRef.current = false;
        setTurnAwaitingNext(false);
        setTurnElapsed(turnElapsedBaseRef.current);
        setScores(isHostRef.current
            ? { me: msg.hostScore, opp: msg.peerScore }
            : { me: msg.peerScore, opp: msg.hostScore });
        setGameState('result-turns');
        const localSeat = isHostRef.current ? 'host' : 'peer';
        if (!turnMatchRecordedRef.current) {
            turnMatchRecordedRef.current = true;
            awardMatchResult(msg.winnerSeat === 'draw' ? 'draw' : msg.winnerSeat === localSeat ? 'win' : 'loss', {
                gameId: 'guess-time',
                gameTitle: 'خمن الوقت',
                oppName: oppProfile?.nickname || 'الخصم',
                oppAvatar: oppProfile?.avatar || 'cool'
            });
        }
        if (msg.loserSeat && msg.loserSeat !== localSeat) playSound('stopwatch_stop');
        if (msg.winnerSeat === 'draw') triggerDrawEffects();
        else if (msg.winnerSeat === localSeat) triggerVictoryEffects();
        else triggerDefeatEffects();
    };

    const handlePickRole = (hostIsHider) => {
        playSound('click');
        playHaptic(15);
        setMyRole(hostIsHider ? 'hider' : 'guesser');
        connRef.current?.send({ type: 'start_roles_mode', hostIsHider });
        resetRound();
        setGameState('playing-roles');
        playSound('ding');
    };

    // ── Stopwatch Logic (Target Mode) ────────────────────────────────────
    const handleHoldStart = () => {
        if (myResultRef.current !== null) return;
        playSound('stopwatch_start');
        playHaptic(20);
        holdStartRef.current = Date.now();
        setIsHolding(true);
        setElapsed(0);
        setShowTimer(true);
        setTimeout(() => setShowTimer(false), BLIND_DELAY);

        intervalRef.current = setInterval(() => {
            setElapsed(Date.now() - holdStartRef.current);
        }, 30);
        connRef.current?.send({ type: 'opp_started' });
    };

    const handleHoldEnd = () => {
        if (!isHolding || myResultRef.current !== null) return;
        clearHoldInterval();
        const finalElapsed = Date.now() - holdStartRef.current;
        myResultRef.current = finalElapsed;
        setElapsed(finalElapsed);
        setIsHolding(false);
        setShowTimer(true);
        setMyResult(finalElapsed);
        playSound('stopwatch_stop');
        playHaptic([30, 20, 50]);
        connRef.current?.send({ type: 'opp_result', elapsed: finalElapsed });
    };

    // ── Stopwatch Logic (Roles Mode - Hider) ─────────────────────────────
    const handleToggleHider = () => {
        if (!isHolding) {
            // Start
            playSound('stopwatch_start');
            playHaptic(20);
            holdStartRef.current = Date.now();
            setIsHolding(true);
            setElapsed(0);
            setShowTimer(true);
            setTimeout(() => setShowTimer(false), BLIND_DELAY);
            intervalRef.current = setInterval(() => {
                setElapsed(Date.now() - holdStartRef.current);
            }, 30);
            connRef.current?.send({ type: 'hider_started' });
        } else {
            // Stop
            clearHoldInterval();
            const finalElapsed = Date.now() - holdStartRef.current;
            myResultRef.current = finalElapsed;
            setElapsed(finalElapsed);
            setIsHolding(false);
            setShowTimer(true);
            setMyResult(finalElapsed);
            setHiderFinished(true);
            playSound('stopwatch_stop');
            playHaptic([30, 20, 50]);
            connRef.current?.send({ type: 'hider_done', elapsed: finalElapsed });
        }
    };

    // ── Guess Logic (Roles Mode - Guesser) ───────────────────────────────
    const handleGuessSubmit = () => {
        const val = parseFloat(guessValue);
        if (!isNaN(val) && val > 0) {
            const guessMs = val * 1000;
            setMyResult(guessMs);
            setGuesserFinished(true);
            playSound('click');
            connRef.current?.send({ type: 'guesser_done', guessMs });
        }
    };

    // ── Result Evaluation ────────────────────────────────────────────────
    useEffect(() => {
        if (gameMode === 'target') {
            if (myResult !== null && oppResult !== null && !bothDone) {
                setBothDone(true);
                const myDiff = Math.abs(myResult - targetMs);
                const oppDiff = Math.abs(oppResult - targetMs);
                if (myDiff < oppDiff) {
                    playSound('win');
                    playHaptic([50, 50, 100]);
                    setScores(s => ({ ...s, me: s.me + 1 }));
                    triggerVictoryEffects();
                    if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100, 50, 200]);
                } else if (oppDiff < myDiff) {
                    setScores(s => ({ ...s, opp: s.opp + 1 }));
                    playSound('lose');
                    triggerDefeatEffects();
                } else {
                    playSound('ding');
                    triggerDrawEffects();
                }
                if (!matchRecordedRef.current) {
                    matchRecordedRef.current = true;
                    awardMatchResult(myDiff < oppDiff ? 'win' : oppDiff < myDiff ? 'loss' : 'draw', {
                        gameId: 'guess-time',
                        gameTitle: 'خمن الوقت',
                        oppName: oppProfile?.nickname || 'الخصم',
                        oppAvatar: oppProfile?.avatar || 'cool'
                    });
                }
                setGameState('result-target');
            }
        } else if (gameMode === 'roles') {
            if (hiderFinished && guesserFinished && myResult !== null && oppResult !== null && !bothDone) {
                setBothDone(true);
                const actual = myRole === 'hider' ? myResult : oppResult;
                const guess = myRole === 'guesser' ? myResult : oppResult;
                const diff = Math.abs(actual - guess);
                
                // Guesser gets point if within 1 second
                if (diff <= 1000) {
                    playSound('win');
                    playHaptic([50, 50, 100]);
                    if (myRole === 'guesser') setScores(s => ({ ...s, me: s.me + 1 }));
                    else setScores(s => ({ ...s, opp: s.opp + 1 }));
                } else {
                    playSound('lose');
                    if (myRole === 'hider') setScores(s => ({ ...s, me: s.me + 1 }));
                    else setScores(s => ({ ...s, opp: s.opp + 1 }));
                }

                const guesserWonLocally = diff <= 1000;
                const iWonLocally = (myRole === 'guesser' && guesserWonLocally) || (myRole === 'hider' && !guesserWonLocally);
                if (!matchRecordedRef.current) {
                    matchRecordedRef.current = true;
                    awardMatchResult(iWonLocally ? 'win' : 'loss', {
                        gameId: 'guess-time',
                        gameTitle: 'خمن الوقت',
                        oppName: oppProfile?.nickname || 'الخصم',
                        oppAvatar: oppProfile?.avatar || 'cool'
                    });
                }
                if (iWonLocally) {
                    triggerVictoryEffects();
                    if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100, 50, 200]);
                } else {
                    triggerDefeatEffects();
                }
                setGameState('result-roles');
            }
        }
    }, [myResult, oppResult, bothDone, gameMode, hiderFinished, guesserFinished]); // eslint-disable-line

    useEffect(() => {
        if (gameState === 'lobby') return undefined;
        const save = () => persistSnapshotRef.current?.();
        save();
        const timerIsActive = isHolding || turnClockRunning;
        const interval = timerIsActive ? setInterval(save, 1000) : null;
        const saveOnExit = () => save();
        window.addEventListener('pagehide', saveOnExit);
        window.addEventListener('beforeunload', saveOnExit);
        return () => {
            if (interval) clearInterval(interval);
            window.removeEventListener('pagehide', saveOnExit);
            window.removeEventListener('beforeunload', saveOnExit);
        };
    }, [gameState, gameMode, targetMs, scores, myRole, hiderFinished, guesserFinished, guessValue, isHolding,
        showTimer, myResult, oppResult, bothDone, turnRpsChoice, turnOppRpsChoice, turnRpsWinner, turnActiveSeat,
        turnClockRunning, turnAwaitingNext, turnLastStop, turnNotice, turnRoundResult]);

    const doRestart = useCallback(() => {
        resetRound();
        hasHostSelectedModeRef.current = false;
        setGameState(isHostRef.current ? 'picking-mode' : 'waiting-settings');
    }, []); // eslint-disable-line

    const handleRestart = useCallback(() => {
        playSound('click');
        connRef.current?.send({ type: 'restart' });
        doRestart();
    }, [doRestart]);

    // Auto-restart after 5 seconds on result screens
    useEffect(() => {
        if (isHostRef.current && !isPeerDisconnected && (gameState === 'result-target' || gameState === 'result-roles' || gameState === 'result-turns')) {
            const timer = setTimeout(() => {
                connRef.current?.send({ type: 'restart' });
                doRestart();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [gameState, isPeerDisconnected, doRestart]);

    useEffect(() => () => {
        clearHoldInterval();
        clearTurnTimers();
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }, []); // eslint-disable-line


    const localSeat = isHostRef.current ? 'host' : 'peer';
    const safePlayerName = turnLastStop
        ? (turnLastStop === localSeat ? 'أنت' : (oppProfile?.nickname || 'الخصم'))
        : '';
    const isMyTurn = gameState === 'playing-turns' || gameState === 'playing-target' || gameState === 'playing-roles'
        ? (gameState !== 'playing-turns' || turnActiveSeat === localSeat)
        : gameState === 'turn-countdown' && turnActiveSeat === localSeat;

    return (
        <>
            <div className="animated-bg"><div className="bg-orb-3" /></div>
            <div className="min-h-dvh max-w-md mx-auto px-4 flex flex-col safe-area-pt overflow-x-hidden overflow-y-auto pb-6">

                {gameState !== 'lobby' ? (
                    <PlayerGameHeader
                        title="خمن الوقت"
                        gameId="guess-time"
                        gameEmoji=""
                        isMyTurn={isMyTurn}
                        oppProfile={oppProfile}
                        myScore={scores.me}
                        oppScore={scores.opp}
                        onLeave={() => { connRef.current?.close(); setView('hub'); }}
                    />
                ) : (
                    <div className="grid grid-cols-3 items-center py-4 mb-4">
                        <div><Logo size="small" /></div>
                        <div className="flex justify-center">
                            <div className="flex items-center gap-2 glass-card px-3.5 py-1.5 rounded-2xl border border-white/10 shrink-0">
                                <IconGuessTime size={18} className="text-[var(--accent)]" />
                                <span className="text-xs font-black gradient-text">خمن الوقت</span>
                            </div>
                        </div>
                        <div className="flex justify-end"><button onClick={() => setView('hub')} className="glass-card px-4 py-2 rounded-2xl text-xs font-bold hover:scale-105 transition-transform">الرئيسية</button></div>
                    </div>
                )}

                {gameState === 'lobby' && (
                    <div className="flex-1 flex pb-16 safe-area-pb">
                        <P2PConnectionManager gameIdPrefix="celia-time" onGameStart={handleGameStart} />
                    </div>
                )}

                {/* Host Mode Selection */}
                {gameState === 'picking-mode' && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in px-2">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center border border-white/10 shadow-2xl">
                            <h2 className="text-2xl font-black mb-6">اختار نظام اللعب</h2>
                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={() => handleSelectMode('target')}
                                    className="glass-card rounded-2xl p-5 flex flex-col items-center gap-2 hover:border-emerald-400/50 hover:bg-white/5 transition-all"
                                >
                                    <Timer size={32} className="text-emerald-400" />
                                    <span className="font-black text-lg">تحدي الهدف</span>
                                    <span className="text-xs opacity-60 font-bold">أنتم الاتنين تحاولوا تقفوا عند نفس الوقت</span>
                                </button>
                                <button
                                    onClick={() => handleSelectMode('roles')}
                                    className="glass-card rounded-2xl p-5 flex flex-col items-center gap-2 hover:border-amber-400/50 hover:bg-white/5 transition-all"
                                >
                                    <Users size={32} className="text-amber-400" />
                                    <span className="font-black text-lg">تحدي الأدوار</span>
                                    <span className="text-xs opacity-60 font-bold">واحد يشغل ويوقف الساعة، والتاني يخمن الوقت</span>
                                </button>
                                <button
                                    onClick={() => handleSelectMode('turns')}
                                    className="glass-card rounded-2xl p-5 flex flex-col items-center gap-2 hover:border-sky-400/50 hover:bg-white/5 transition-all"
                                >
                                    <Timer size={32} className="text-sky-400" />
                                    <span className="font-black text-lg">تحدي الوقت بالتبادل</span>
                                    <span className="text-xs opacity-60 font-bold">عداد مشترك؛ كل لاعب يكمل من وقت اللي قبله</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Host Target Selection */}
                {gameState === 'picking-target' && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in px-2">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center border border-emerald-400/30">
                            <h2 className="text-2xl font-black mb-2">{gameMode === 'turns' ? 'اختار حد الوقت المشترك' : 'اختار الوقت المستهدف'}</h2>
                            {gameMode === 'turns' && <p className="text-sm opacity-60 font-bold mb-5">الوقت بيتجمع بين دوركم؛ اللي يعدّي الحد يخسر</p>}
                            <div className="grid grid-cols-3 gap-3 mb-6">
                                {TARGET_TIMES.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => handlePickTarget(s * 1000)}
                                        className="glass-card rounded-2xl py-4 flex flex-col items-center hover:border-emerald-400/50 transition-all"
                                    >
                                        <span className="text-3xl font-black text-emerald-400">{s}</span>
                                        <span className="text-xs opacity-60">ثانية</span>
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={customTarget}
                                    onChange={e => setCustomTarget(e.target.value)}
                                    placeholder="أو اكتب ثواني مخصصة"
                                    className="glass-input flex-1 rounded-xl px-4 font-bold text-center"
                                />
                                <button
                                    onClick={handleCustomTarget}
                                    className="glow-button px-4 rounded-xl font-bold text-sm"
                                >
                                    ابدأ
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Host Roles Selection */}
                {gameState === 'picking-roles' && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in px-2">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center border border-amber-400/30">
                            <h2 className="text-2xl font-black mb-6">توزيع الأدوار</h2>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => handlePickRole(true)}
                                    className="glass-card rounded-2xl p-4 flex flex-col items-center hover:border-amber-400/50 transition-all"
                                >
                                    <span className="font-black text-amber-400">أنا هشغل الساعة ⏱️</span>
                                    <span className="text-xs opacity-60">والخصم هيخمن</span>
                                </button>
                                <button
                                    onClick={() => handlePickRole(false)}
                                    className="glass-card rounded-2xl p-4 flex flex-col items-center hover:border-emerald-400/50 transition-all"
                                >
                                    <span className="font-black text-emerald-400">الخصم يشغل الساعة ⏱️</span>
                                    <span className="text-xs opacity-60">وأنا هخمن</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Guest Waiting */}
                {gameState === 'waiting-settings' && (
                    <div className="flex-1 flex items-center justify-center animate-fade-in">
                        <div className="glass-card rounded-3xl p-8 w-full max-w-sm text-center border border-white/10">
                            <div className="w-16 h-16 rounded-full bg-white/10 text-emerald-400 mx-auto flex items-center justify-center mb-4 animate-spin">
                                <Timer size={36} />
                            </div>
                            <h2 className="text-2xl font-black mb-2">في الانتظار...</h2>
                            <p className="opacity-60 text-sm font-bold">المضيف بيختار إعدادات اللعبة</p>
                        </div>
                    </div>
                )}

                {/* Target Mode Countdown */}
                {gameState === 'countdown' && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in gap-4">
                        <p className="opacity-60 font-bold">الهدف: <span className="text-white font-black">{targetMs / 1000} ثانية</span></p>
                        <div className="text-[120px] font-black leading-none text-emerald-400 animate-pop-in drop-shadow-[0_0_40px_rgba(52,211,153,0.5)]">
                            {countdown}
                        </div>
                    </div>
                )}

                {gameState === 'turn-rps' && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in gap-5 px-2">
                        <div className="glass-card rounded-3xl p-6 w-full max-w-sm text-center border border-sky-400/20">
                            <h2 className="text-2xl font-black mb-2">مين هيبدأ؟</h2>
                            <p className="opacity-65 text-sm font-bold">الحد المشترك: {formatTime(targetMs)} — اختاروا حجر ورقة مقص</p>
                            <div className="grid grid-cols-3 gap-3 mt-6">
                                {TURN_RPS_OPTIONS.map(option => (
                                    <RPSChoiceButton
                                        key={option.id}
                                        choice={option.id}
                                        label={option.label}
                                        disabled={Boolean(turnRpsChoice)}
                                        onClick={() => handleTurnRpsChoice(option.id)}
                                        selected={turnRpsChoice === option.id}
                                        iconSize={34}
                                        selectedClassName="border-amber-300/70 bg-amber-300/10 text-amber-100 shadow-[0_0_24px_rgba(252,211,77,0.12)]"
                                        idleClassName="glass-card border-white/10 text-white/90 hover:-translate-y-0.5 hover:border-sky-300/45"
                                        selectedIconClassName="text-amber-200"
                                    />
                                ))}
                            </div>
                            {turnNotice.startsWith('تعادل') ? (
                                <RPSTieNotice className="mt-5" />
                            ) : (
                                <p className="mt-5 text-sm font-bold text-amber-300" aria-live="polite">
                                    {turnRpsWinner
                                        ? (turnRpsWinner === localSeat ? 'أنت تبدأ!' : 'الخصم هيبدأ')
                                        : turnRpsChoice ? 'اختيارك اتسجل — مستنيين اختيار الخصم...' : turnNotice || 'اختاروا في نفس الوقت'}
                                </p>
                            )}
                            {turnOppRpsChoice && <p className="mt-1 text-xs opacity-60">اختيار الخصم اتسجل</p>}
                        </div>
                    </div>
                )}

                {gameState === 'turn-countdown' && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in gap-4">
                        <p className="opacity-70 font-bold">{turnActiveSeat === localSeat ? 'دورك' : 'دور الخصم'} · الحد {formatTime(targetMs)}</p>
                        {turnLastStop && (
                            <div className="rounded-2xl border border-emerald-400/60 bg-emerald-400/10 px-6 py-3 text-center shadow-[0_0_32px_rgba(16,185,129,0.3)]">
                                <p className="text-2xl font-black tracking-widest text-emerald-300">SAFE</p>
                                <p className="mt-1 text-sm font-bold text-emerald-100">اللاعب الذي حقق SAFE: {safePlayerName}</p>
                            </div>
                        )}
                        <div className="text-[100px] font-black leading-none text-amber-400 animate-pop-in">{turnCountdown ?? 3}</div>
                        <p className="opacity-60 text-sm font-bold">استعدوا — العداد المشترك مستمر من حيث توقف</p>
                    </div>
                )}

                {gameState === 'playing-turns' && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in gap-5 px-2">
                        <div className={'glass-card rounded-3xl p-6 w-full max-w-sm text-center border transition-all ' + (turnLastStop && !turnClockRunning ? 'border-emerald-400/60 shadow-[0_0_36px_rgba(16,185,129,0.28)]' : 'border-sky-400/20')}>
                            <p className="text-sm font-bold opacity-65">
                                {turnClockRunning
                                    ? 'العداد شغال — الوقت مخفي'
                                    : turnAwaitingNext
                                        ? 'تم حفظ الوقت — بننقل الدور'
                                        : turnActiveSeat === localSeat
                                            ? 'دورك — شغّل العداد لما تكون جاهز'
                                            : 'دور الخصم — مستني يبدأ'}
                            </p>
                            {turnLastStop && !turnClockRunning ? (
                                <div className="my-5 rounded-2xl border border-emerald-400/60 bg-emerald-400/10 py-4 shadow-[0_0_32px_rgba(16,185,129,0.3)] animate-fade-in">
                                    <p className="text-5xl font-black tracking-[0.18em] text-emerald-300 drop-shadow-[0_0_18px_rgba(52,211,153,0.75)]">SAFE</p>
                                    <p className="mt-2 text-sm font-bold text-emerald-100">اللاعب الذي حقق SAFE: {safePlayerName}</p>
                                </div>
                            ) : (
                                <div className={'my-5 mx-auto w-24 h-24 rounded-full flex items-center justify-center border bg-white/[0.03] ' + (turnClockRunning ? 'border-amber-300/50 text-amber-300 animate-pulse shadow-[0_0_28px_rgba(252,211,77,0.18)]' : 'border-sky-300/20 text-sky-300/70')}>
                                    <Timer size={48} strokeWidth={1.8} />
                                </div>
                            )}
                            <p className="text-xs opacity-60 font-bold">حد الجولة: {formatTime(targetMs)}</p>
                            <button
                                onClick={turnClockRunning ? stopTurnClock : startTurnClock}
                                disabled={turnAwaitingNext || turnActiveSeat !== localSeat || (turnClockRunning && turnClockOwnerRef.current !== localSeat)}
                                className={'mt-6 w-full h-14 rounded-2xl font-black text-lg transition-all disabled:opacity-40 ' + (turnClockRunning ? 'bg-rose-500 text-white hover:bg-rose-400' : 'glow-button')}
                            >
                                {turnAwaitingNext
                                    ? 'جاري نقل الدور...'
                                    : turnClockRunning
                                        ? (turnClockOwnerRef.current === localSeat ? 'أوقف وسلّم الدور' : 'العداد شغال عند الخصم')
                                        : turnActiveSeat === localSeat ? 'ابدأ دورك' : 'في انتظار الخصم'}
                            </button>
                            {turnNotice && !turnLastStop && <p className="mt-4 text-sm font-bold text-amber-300" aria-live="polite">{turnNotice}</p>}
                        </div>
                    </div>
                )}

                {/* Playing Target Mode */}
                {gameState === 'playing-target' && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in gap-6">
                        <div className="glass-card rounded-2xl px-6 py-3 text-center border border-emerald-400/20">
                            <p className="text-xs opacity-60 font-bold">الهدف</p>
                            <p className="text-4xl font-black text-emerald-400">{formatTime(targetMs)}</p>
                        </div>

                        <div className="glass-card rounded-3xl w-64 h-32 flex items-center justify-center border border-white/10 shadow-2xl">
                            {showTimer ? (
                                <span className={`text-5xl font-black tracking-widest ${isHolding ? 'text-emerald-400' : 'text-white'}`}>
                                    {formatTime(elapsed)}
                                </span>
                            ) : (
                                <span className="text-3xl opacity-40 font-black tracking-widest font-mono">--.--</span>
                            )}
                        </div>

                        {myResult === null ? (
                            <button
                                onPointerDown={handleHoldStart}
                                onPointerUp={handleHoldEnd}
                                onPointerLeave={handleHoldEnd}
                                className={`w-48 h-48 rounded-full font-black text-xl transition-all select-none ${isHolding ? 'scale-95 shadow-[0_0_60px_rgba(52,211,153,0.4)] border-emerald-400' : 'hover:scale-105 border-white/20'}`}
                                style={{ background: isHolding ? 'radial-gradient(circle, #10b981, #064e3b)' : 'rgba(255,255,255,0.05)', borderWidth: 3 }}
                            >
                                {isHolding ? 'اترك الآن!' : 'امسك الشاشة!'}
                            </button>
                        ) : (
                            <div className="glass-card rounded-3xl px-8 py-5 text-center animate-pop-in">
                                <p className="opacity-60 text-sm font-bold">وقفت على</p>
                                <p className="text-4xl font-black text-emerald-400">{formatTime(myResult)}</p>
                                <p className="opacity-50 text-xs mt-2 animate-pulse">في انتظار الخصم...</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Playing Roles Mode */}
                {gameState === 'playing-roles' && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in gap-6">
                        
                        {/* Hider View */}
                        {myRole === 'hider' && (
                            <>
                                <div className="glass-card rounded-3xl w-64 h-32 flex items-center justify-center border border-amber-400/20 shadow-2xl">
                                    {showTimer ? (
                                        <span className="text-5xl font-black tracking-widest text-amber-400">
                                            {formatTime(elapsed)}
                                        </span>
                                    ) : (
                                        <span className="text-2xl opacity-40 font-black">الساعة شغالة...</span>
                                    )}
                                </div>
                                {!hiderFinished ? (
                                    <button
                                        onClick={handleToggleHider}
                                        className="w-48 h-48 rounded-full font-black text-2xl transition-all shadow-[0_8px_32px_rgba(0,0,0,0.4)] active:scale-95"
                                        style={{
                                            background: isHolding ? '#f43f5e' : '#10b981',
                                            boxShadow: isHolding ? '0 0 40px rgba(244,63,94,0.5)' : '0 0 40px rgba(16,185,129,0.3)'
                                        }}
                                    >
                                        {isHolding ? 'وقّف الساعة' : 'ابدأ الحساب'}
                                    </button>
                                ) : (
                                    <div className="glass-card rounded-3xl px-8 py-5 text-center animate-pop-in">
                                        <p className="opacity-60 text-sm font-bold">الوقت الفعلي</p>
                                        <p className="text-4xl font-black text-amber-400">{formatTime(myResult)}</p>
                                        <p className="opacity-50 text-xs mt-2 animate-pulse">الخصم بيخمن دلوقتي...</p>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Guesser View */}
                        {myRole === 'guesser' && (
                            <>
                                {!hiderFinished ? (
                                    !isHolding ? (
                                        <div className="glass-card rounded-3xl px-8 py-10 text-center border border-white/10 animate-pulse">
                                            <Timer size={48} className="mx-auto mb-4 opacity-50" />
                                            <h2 className="text-xl font-black mb-2">في انتظار الخصم...</h2>
                                            <p className="opacity-50 text-sm font-bold">ركز معاه عشان تخمن هو وقف بعد كام ثانية...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="glass-card rounded-3xl w-64 h-32 flex items-center justify-center border border-sky-400/20 shadow-2xl">
                                                {showTimer ? (
                                                    <span className="text-5xl font-black tracking-widest text-sky-400">
                                                        {formatTime(elapsed)}
                                                    </span>
                                                ) : (
                                                    <span className="text-2xl opacity-40 font-black">الساعة شغالة...</span>
                                                )}
                                            </div>
                                            <div className="glass-card rounded-3xl px-8 py-10 text-center border border-sky-400/20 animate-pulse mt-4">
                                                <h2 className="text-xl font-black mb-2 text-sky-400">الخصم بيحسب الوقت</h2>
                                                <p className="opacity-70 text-sm font-bold">ركز في الصوت والعداد...</p>
                                            </div>
                                        </>
                                    )
                                ) : !guesserFinished ? (
                                    <div className="glass-card rounded-3xl p-6 text-center border border-sky-400/30 animate-pop-in">
                                        <h2 className="text-xl font-black mb-4">الخصم وقّف الساعة!</h2>
                                        <p className="opacity-60 text-sm mb-4">تفتكر الوقت كام؟ (بالثواني)</p>
                                        <input
                                            type="number"
                                            value={guessValue}
                                            onChange={e => {
                                                const value = e.target.value;
                                                guessBySeatRef.current[localSeat] = value;
                                                setGuessValue(value);
                                                connRef.current?.send({ type: 'guess_draft', seat: localSeat, value });
                                            }}
                                            className="w-32 text-center text-3xl font-black bg-white/5 border border-white/10 rounded-2xl py-3 mb-4 outline-none focus:border-sky-400"
                                            placeholder="0.0"
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleGuessSubmit}
                                            className="glow-button w-full h-12 rounded-xl text-sm font-black"
                                        >
                                            تأكيد التخمين
                                        </button>
                                    </div>
                                ) : (
                                    <div className="glass-card rounded-3xl px-8 py-5 text-center animate-pop-in">
                                        <p className="opacity-60 text-sm font-bold">تخمينك</p>
                                        <p className="text-4xl font-black text-sky-400">{formatTime(myResult)}</p>
                                        <p className="opacity-50 text-xs mt-2">في انتظار النتيجة...</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Target Result */}
                {gameState === 'result-target' && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in gap-5 px-2">
                        {(() => {
                            const myDiff = Math.abs(myResult - targetMs);
                            const oppDiff = Math.abs(oppResult - targetMs);
                            const winner = myDiff < oppDiff ? 'me' : (oppDiff < myDiff ? 'opp' : 'draw');
                            return (
                                <>
                                    <div className={`glass-card rounded-3xl p-6 w-full max-w-sm text-center border shadow-2xl animate-pop-in ${winner === 'me' ? 'border-emerald-400/50' : winner === 'opp' ? 'border-rose-400/50' : 'border-amber-400/50'}`}>
                                        <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-3 bg-white/10">
                                            {winner === 'me' ? (
                                                <Trophy size={36} className="text-yellow-400" />
                                            ) : winner === 'opp' ? (
                                                <Timer size={36} className="text-rose-400" />
                                            ) : (
                                                <Timer size={36} className="text-amber-400" />
                                            )}
                                        </div>
                                        <h2 className={`text-3xl font-black ${winner === 'me' ? 'text-emerald-400' : winner === 'opp' ? 'text-rose-400' : 'text-amber-400'}`}>
                                            {winner === 'me' ? 'كسبت!' : winner === 'opp' ? 'خسرت!' : 'تعادل!'}
                                        </h2>
                                        <p className="opacity-60 text-xs mt-1 font-bold">الهدف: {formatTime(targetMs)}</p>
                                    </div>
                                    <div className="glass-card rounded-3xl p-5 w-full max-w-sm border border-white/10">
                                        <div className="flex gap-3">
                                            <div className={`flex-1 rounded-2xl p-4 text-center ${winner === 'me' ? 'bg-emerald-500/20' : 'glass-card'}`}>
                                                <p className="text-xs opacity-60 font-bold">أنت</p>
                                                <p className="text-2xl font-black">{formatTime(myResult)}</p>
                                                <p className="text-[10px] mt-1 text-emerald-400">فرق {formatTime(myDiff)}</p>
                                            </div>
                                            <div className={`flex-1 rounded-2xl p-4 text-center ${winner === 'opp' ? 'bg-rose-500/20' : 'glass-card'}`}>
                                                <p className="text-xs opacity-60 font-bold">{oppProfile?.nickname}</p>
                                                <p className="text-2xl font-black">{formatTime(oppResult)}</p>
                                                <p className="text-[10px] mt-1 text-rose-400">فرق {formatTime(oppDiff)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                        <button onClick={handleRestart} className="glow-button w-full max-w-sm h-14 rounded-2xl font-black flex items-center justify-center gap-2"><RotateCcw size={18} /> العبوا تاني</button>
                    </div>
                )}

                {/* Roles Result */}
                {gameState === 'result-roles' && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in gap-5 px-2">
                        {(() => {
                            const actual = myRole === 'hider' ? myResult : oppResult;
                            const guess = myRole === 'guesser' ? myResult : oppResult;
                            const diff = Math.abs(actual - guess);
                            const guesserWon = diff <= 1000;
                            const iWon = (myRole === 'guesser' && guesserWon) || (myRole === 'hider' && !guesserWon);

                            return (
                                <>
                                    <div className={`glass-card rounded-3xl p-6 w-full max-w-sm text-center border shadow-2xl animate-pop-in ${iWon ? 'border-emerald-400/50' : 'border-rose-400/50'}`}>
                                        <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-3 bg-white/10">
                                            {iWon ? (
                                                <Trophy size={36} className="text-yellow-400" />
                                            ) : (
                                                <Timer size={36} className="text-rose-400" />
                                            )}
                                        </div>
                                        <h2 className={`text-3xl font-black ${iWon ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {iWon ? 'كسبت!' : 'خسرت!'}
                                        </h2>
                                        <p className="opacity-60 text-xs mt-2 font-bold">
                                            المخمن {guesserWon ? 'نجح (الفرق أقل من ثانية)' : 'فشل (الفرق كبير)'}
                                        </p>
                                    </div>
                                    <div className="glass-card rounded-3xl p-5 w-full max-w-sm border border-white/10">
                                        <div className="flex gap-3">
                                            <div className="flex-1 rounded-2xl p-4 text-center glass-card">
                                                <p className="text-xs opacity-60 font-bold">الوقت الفعلي</p>
                                                <p className="text-2xl font-black text-amber-400">{formatTime(actual)}</p>
                                            </div>
                                            <div className="flex-1 rounded-2xl p-4 text-center glass-card">
                                                <p className="text-xs opacity-60 font-bold">التخمين</p>
                                                <p className="text-2xl font-black text-sky-400">{formatTime(guess)}</p>
                                            </div>
                                        </div>
                                        <p className="text-center text-xs mt-3 opacity-60 font-bold">الفرق: {formatTime(diff)}</p>
                                    </div>
                                </>
                            );
                        })()}
                        <button onClick={handleRestart} className="glow-button w-full max-w-sm h-14 rounded-2xl font-black flex items-center justify-center gap-2"><RotateCcw size={18} /> العبوا تاني</button>
                    </div>
                )}

                {gameState === 'result-turns' && turnRoundResult && (
                    <div className="flex-1 flex flex-col items-center justify-center animate-fade-in gap-5 px-2">
                        <div className={'glass-card rounded-3xl p-6 w-full max-w-sm text-center border shadow-2xl animate-pop-in ' + (turnRoundResult.winnerSeat === localSeat ? 'border-emerald-400/50' : 'border-rose-400/50')}>
                            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-3 bg-white/10">
                                <Trophy size={36} className={turnRoundResult.winnerSeat === localSeat ? 'text-yellow-400' : 'text-rose-400'} />
                            </div>
                            <h2 className={'text-3xl font-black ' + (turnRoundResult.winnerSeat === localSeat ? 'text-emerald-400' : 'text-rose-400')}>
                                {turnRoundResult.winnerSeat === localSeat ? 'كسبت!' : 'خسرت!'}
                            </h2>
                            <p className="opacity-70 text-sm mt-2 font-bold">{turnRoundResult.loserSeat === localSeat ? 'عدّيت حد الوقت المشترك' : 'الخصم عدّى حد الوقت المشترك'}</p>
                            <p className="mt-4 text-sm font-bold opacity-70">الحد المشترك: {formatTime(turnRoundResult.targetMs)}</p>
                        </div>
                        <button onClick={handleRestart} className="glow-button w-full max-w-sm h-14 rounded-2xl font-black flex items-center justify-center gap-2"><RotateCcw size={18} /> العبوا تاني</button>
                    </div>
                )}
            </div>

            {gameState !== 'lobby' && connRef.current && <EmotesOverlay conn={connRef.current} oppProfile={oppProfile} showStandaloneButton={false} />}
            {gameState !== 'lobby' && (
                <ConnectionPauseOverlay
                    conn={connRef.current}
                    opponentName={oppProfile?.nickname}
                    onLeave={() => { connRef.current?.close(); setView('hub'); }}
                />
            )}
        </>
    );
}
