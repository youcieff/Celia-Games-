const PROFILE_STORAGE_KEY = 'celia_games_profile';
const PROFILE_ID_STORAGE_KEY = 'celia_player_id';

function createPlayerId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `player-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function ensureProfileIdentity(profile = {}) {
    if (typeof window === 'undefined') return profile;

    try {
        const playerId = profile.playerId
            || localStorage.getItem(PROFILE_ID_STORAGE_KEY)
            || createPlayerId();
        const normalized = { ...profile, playerId };
        localStorage.setItem(PROFILE_ID_STORAGE_KEY, playerId);
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalized));
        return normalized;
    } catch {
        return profile.playerId ? profile : { ...profile, playerId: createPlayerId() };
    }
}
