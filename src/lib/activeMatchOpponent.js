const ACTIVE_OPPONENT_KEY = 'celia_active_match_opponent';

export function setActiveMatchOpponent(profile) {
  if (typeof window === 'undefined') return;
  try {
    const safeProfile = profile && typeof profile === 'object' ? {
      uid: typeof profile.uid === 'string' ? profile.uid.slice(0, 128) : null,
      playerId: typeof profile.playerId === 'string' ? profile.playerId.slice(0, 128) : null,
      profileId: typeof profile.profileId === 'string' ? profile.profileId.slice(0, 128) : null,
      nickname: String(profile.nickname || '').trim().slice(0, 24),
      nicknameAliases: Array.isArray(profile.nicknameAliases)
        ? [...new Set(profile.nicknameAliases.map(alias => String(alias || '').trim().slice(0, 24)).filter(Boolean))].slice(-20)
        : [],
      avatar: String(profile.avatar || 'cool').slice(0, 40),
      isAI: Boolean(profile.isAI)
    } : null;
    if (!safeProfile?.nickname) {
      sessionStorage.removeItem(ACTIVE_OPPONENT_KEY);
      return;
    }
    sessionStorage.setItem(ACTIVE_OPPONENT_KEY, JSON.stringify(safeProfile));
  } catch { }
}

export function consumeActiveMatchOpponent() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = sessionStorage.getItem(ACTIVE_OPPONENT_KEY);
    sessionStorage.removeItem(ACTIVE_OPPONENT_KEY);
    const profile = stored ? JSON.parse(stored) : null;
    return profile && typeof profile.nickname === 'string' ? profile : null;
  } catch {
    return null;
  }
}
