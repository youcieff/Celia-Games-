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

function findExistingPlayerKey(dict, profile, nickname) {
  const playerId = getPlayerId(profile);
  const entries = Object.entries(dict);
  if (playerId) {
    const identityMatch = entries.find(([, player]) => getPlayerId(player) === playerId);
    if (identityMatch) return identityMatch[0];
  }

  const exactNameMatch = entries.find(([, player]) => cleanName(player.nickname) === cleanName(nickname)
    && (!getPlayerId(player) || getPlayerId(player) === playerId));
  if (exactNameMatch) return exactNameMatch[0];

  const knownAliases = new Set((profile.nicknameAliases || []).map(cleanName));
  const previousNameMatch = entries.find(([, player]) =>
    knownAliases.has(cleanName(player.nickname))
    || (player.aliases || []).some(alias => knownAliases.has(cleanName(alias)))
  );
  if (previousNameMatch) return previousNameMatch[0];

  // Older entries were keyed only by nickname. If exactly one legacy player
  // uses this avatar, attach the new stable ID to that existing record.
  if (playerId && profile.avatar) {
    const sameAvatarLegacy = entries.filter(([, player]) => !getPlayerId(player) && player.avatar === profile.avatar);
    if (sameAvatarLegacy.length === 1) return sameAvatarLegacy[0][0];
  }
  return null;
}

function saveIdentifiedPlayer(dict, oldKey, profile, nickname) {
  const key = getIdentityKey(profile, nickname);
  const existing = oldKey ? dict[oldKey] : null;
  const aliases = new Set(existing?.aliases || []);
  if (existing?.nickname && cleanName(existing.nickname) !== cleanName(nickname)) aliases.add(existing.nickname);
  (profile.nicknameAliases || []).forEach(alias => aliases.add(alias));
  const player = {
    ...existing,
    id: key,
    playerId: getPlayerId(profile) || existing?.playerId || null,
    nickname,
    avatar: profile.avatar || existing?.avatar || 'cool',
    aliases: [...aliases].filter(alias => cleanName(alias) !== cleanName(nickname)).slice(-8),
    wins: Number(existing?.wins) || 0,
    xp: Number(existing?.xp) || 0
  };
  if (oldKey && oldKey !== key) delete dict[oldKey];
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
    const oldKey = findExistingPlayerKey(dict, profile, nickname);
    if (!oldKey) return;
    saveIdentifiedPlayer(dict, oldKey, profile, nickname);
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
    const oldKey = findExistingPlayerKey(dict, oppProfile, nick);
    const isOpponentWin = oppScore > myScore;
    const existing = saveIdentifiedPlayer(dict, oldKey, oppProfile, nick);
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
