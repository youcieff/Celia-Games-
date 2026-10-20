const PLAYERS = new Set(['p1', 'p2']);

export function otherWhoAmIPlayer(playerId) {
    if (!PLAYERS.has(playerId)) return null;
    return playerId === 'p1' ? 'p2' : 'p1';
}

/** One canonical answer policy shared by the UI and the AI opponent. */
export function resolveWhoAmIAnswer({ asker, answer, conditionId, unsupported = false }) {
    if (!PLAYERS.has(asker) || !['yes', 'no'].includes(answer)) return null;
    if (unsupported) {
        return { nextPlayer: asker, noAnswerActionOnly: false, canEliminate: false, canAskAgain: true };
    }

    if (answer === 'yes') {
        return {
            nextPlayer: asker,
            noAnswerActionOnly: false,
            canEliminate: true,
            canAskAgain: conditionId === 'yes_continue'
        };
    }

    if (conditionId === 'yes_elimination') {
        return {
            nextPlayer: otherWhoAmIPlayer(asker),
            noAnswerActionOnly: false,
            canEliminate: false,
            canAskAgain: true
        };
    }

    return { nextPlayer: asker, noAnswerActionOnly: true, canEliminate: true, canAskAgain: false };
}

export function isValidWhoAmITransfer({ from, nextPlayer, currentTurn }) {
    if (!PLAYERS.has(nextPlayer)) return false;
    if (!PLAYERS.has(from)) return nextPlayer !== currentTurn; // compatibility with older clients
    return currentTurn === from && nextPlayer === otherWhoAmIPlayer(from);
}

export function shouldAIUseInterrupt({ conditionId, answer, alreadyUsed, remainingCandidates }) {
    // A once-per-game interruption may follow either answer when the AI can act strategically.
    return conditionId === 'interrupt_once'
        && (answer === true || answer === false)
        && !alreadyUsed
        && remainingCandidates <= 5;
}
