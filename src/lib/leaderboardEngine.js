/**
 * leaderboardEngine.js — Authentic player rankings (NO fake/seed data)
 * Tracks ONLY real players who play on this device or in 1v1 matches.
 */

const KNOWN_PLAYERS_KEY = 'celia_known_players';

const cleanName = (value) => String(value || '').trim().toLocaleLowerCase('ar');
const getPlayerId = (profile) => profile?.playerId || profile?.profileId || null;
const getIdentityKey = (profile, nickname) => getPlayerId(profile)
  ? `profile:${getPlayerId(profile)}`
  : `name:${cleanName(nickname)}`;

function isAIProfile(profile, nickname) {
  return profile?.isAI || nickname === 'الذكاء الاصطناعي' || nickname === 'AI';
}

function findExistingPlayerKeys(dict, profile, nickname) {
  const playerId = getPlayerId(profile);
  const entries = Object.entries(dict);
  const knownAliases = new Set((profile.nicknameAliases || []).map(cleanName));
  const identityMatches = entries.filter(([, player]) => playerId && getPlayerId(player) === playerId);
  const linkedMatches = entries.filter(([, player]) => {
    const id = getPlayerId(player);
    const sameName = cleanName(player.nickname) === cleanName(nickname);
    const aliasMatch = knownAliases.has(cleanName(player.nickname))
      || (player.aliases || []).some(alias => knownAliases.has(cleanName(alias)));
    return (sameName && (!id || id === playerId)) || aliasMatch;
  });

  if (identityMatches.length) {
    const matches = new Set(identityMatches.map(([key]) => key));
    const legacyMatches = linkedMatches.filter(([, player]) => !getPlayerId(player));
    if (legacyMatches.length === 1) matches.add(legacyMatches[0][0]);
    // A previous device may have recorded the same account under its guest ID.
    // Migrate that record only when the saved name history points to exactly
    // one other identity, so shared nicknames cannot collapse different users.
    const otherIdentities = linkedMatches.filter(([, player]) => {
      const id = getPlayerId(player);
      return id && id !== playerId;
    });
    if (otherIdentities.length === 1) matches.add(otherIdentities[0][0]);
    return [...matches];
  }

  // Without a stable identity match, only adopt an unambiguous name-history
  // record. A popular old nickname must never merge several real players.
  if (linkedMatches.length === 1) return [linkedMatches[0][0]];
  const legacyMatches = linkedMatches.filter(([, player]) => !getPlayerId(player));
  if (legacyMatches.length === 1) return [legacyMatches[0][0]];

  // Older entries were keyed only by nickname. If exactly one legacy player
  // uses this avatar, attach the new stable ID to that existing record.
  if (linkedMatches.length === 0 && playerId && profile.avatar) {
    const sameAvatarLegacy = entries.filter(([, player]) => !getPlayerId(player) && player.avatar === profile.avatar);
    if (sameAvatarLegacy.length === 1) return [sameAvatarLegacy[0][0]];
  }
  return [];
}

function saveIdentifiedPlayer(dict, oldKeys, profile, nickname) {
  const key = getIdentityKey(profile, nickname);
  const existingPlayers = oldKeys.map(oldKey => dict[oldKey]).filter(Boolean);
  const aliases = new Set(existingPlayers.flatMap(player => [player.nickname, ...(player.aliases || [])]).filter(Boolean));
  (profile.nicknameAliases || []).forEach(alias => aliases.add(alias));
  const wins = existingPlayers.reduce((sum, player) => sum + (Number(player.wins) || 0), 0);
  const xp = existingPlayers.reduce((sum, player) => sum + (Number(player.xp) || 0), 0);
  const lastPlayed = Math.max(0, ...existingPlayers.map(player => Number(player.lastPlayed) || 0));
  const player = {
    id: key,
    playerId: getPlayerId(profile) || existingPlayers.find(existing => existing.playerId)?.playerId || null,
    nickname,
    avatar: profile.avatar || existingPlayers[0]?.avatar || 'cool',
    aliases: [...aliases].filter(alias => cleanName(alias) !== cleanName(nickname)).slice(-20),
    wins,
    xp,
    ...(lastPlayed ? { lastPlayed } : {})
  };
  oldKeys.forEach(oldKey => {
    if (oldKey !== key) delete dict[oldKey];
  });
  dict[key] = player;
  return player;
}

function readKnownPlayers() {
  try {
    return JSON.parse(localStorage.getItem(KNOWN_PLAYERS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function identifyRealPlayer(profile) {
  if (!profile?.nickname) return;
  const nickname = profile.nickname.trim();
  if (isAIProfile(profile, nickname)) return;

  try {
    const dict = readKnownPlayers();
    const oldKeys = findExistingPlayerKeys(dict, profile, nickname);
    if (!oldKeys.length) return;
    saveIdentifiedPlayer(dict, oldKeys, profile, nickname);
    localStorage.setItem(KNOWN_PLAYERS_KEY, JSON.stringify(dict));
  } catch (e) {
    console.error('Failed to identify real player profile', e);
  }
}

export function recordRealPlayer(oppProfile, oppScore = 0, myScore = 0) {
  if (!oppProfile || !oppProfile.nickname) return;
  const nick = oppProfile.nickname.trim();
  if (isAIProfile(oppProfile, nick)) return;

  try {
    const dict = readKnownPlayers();
    const oldKeys = findExistingPlayerKeys(dict, oppProfile, nick);
    const isOpponentWin = oppScore > myScore;
    const existing = saveIdentifiedPlayer(dict, oldKeys, oppProfile, nick);
    if (isOpponentWin) existing.wins += 1;
    existing.xp += isOpponentWin ? 30 : 10;
    existing.lastPlayed = Date.now();
    localStorage.setItem(KNOWN_PLAYERS_KEY, JSON.stringify(dict));
  } catch (e) {
    console.error('Failed to record real player profile', e);
  }
}

export function getGlobalLeaderboard(myProfile = {}) {
  const me = {
    id: 'me',
    playerId: getPlayerId(myProfile),
    nickname: myProfile.nickname || 'أنت',
    avatar: myProfile.avatar || 'cool',
    wins: myProfile.wins || 0,
    xp: myProfile.xp || 0,
    isMe: true
  };

  const ownNames = new Set([me.nickname, ...(myProfile.nicknameAliases || [])].map(cleanName));
  const uniquePlayers = new Map();
  const knownPlayers = Object.values(readKnownPlayers());
  const namesLinkedToStableIds = new Set();
  knownPlayers.forEach(player => {
    if (!getPlayerId(player)) return;
    [player.nickname, ...(player.aliases || [])].forEach(name => namesLinkedToStableIds.add(cleanName(name)));
  });
  knownPlayers.forEach(player => {
    const id = getPlayerId(player);
    const names = [player.nickname, ...(player.aliases || [])].map(cleanName);
    if ((me.playerId && id === me.playerId) || names.some(name => ownNames.has(name))) return;
    if (!id && namesLinkedToStableIds.has(cleanName(player.nickname))) return;
    const key = id ? `profile:${id}` : `name:${cleanName(player.nickname)}`;
    const previous = uniquePlayers.get(key);
    if (!previous || (player.xp || 0) > (previous.xp || 0)) uniquePlayers.set(key, player);
  });
  const realPlayers = [...uniquePlayers.values()];

  // Combine ONLY user and real opponents actually played against!
  const all = [me, ...realPlayers];

  // Sort descending by Wins & XP
  all.sort((a, b) => (b.wins || 0) - (a.wins || 0) || (b.xp || 0) - (a.xp || 0));

  // Assign ranks
  return all.map((player, idx) => ({
    ...player,
    rank: idx + 1
  }));
}
