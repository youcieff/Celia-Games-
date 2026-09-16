/**
 * leaderboardEngine.js — Authentic player rankings (NO fake/seed data)
 * Tracks ONLY real players who play on this device or in 1v1 matches.
 */

const KNOWN_PLAYERS_KEY = 'celia_known_players';

export function recordRealPlayer(oppProfile, oppScore = 0, myScore = 0) {
  if (!oppProfile || !oppProfile.nickname) return;
  const nick = oppProfile.nickname.trim();
  if (nick === 'الذكاء الاصطناعي' || nick === 'AI') return; // Don't add AI as human player

  try {
    const raw = localStorage.getItem(KNOWN_PLAYERS_KEY);
    const dict = raw ? JSON.parse(raw) : {};

    const isOpponentWin = oppScore > myScore;
    const existing = dict[nick] || {
      id: 'player_' + Date.now(),
      nickname: nick,
      avatar: oppProfile.avatar || 'cool',
      wins: 0,
      xp: 0
    };

    existing.avatar = oppProfile.avatar || existing.avatar;
    if (isOpponentWin) existing.wins += 1;
    existing.xp += isOpponentWin ? 30 : 10;
    existing.lastPlayed = Date.now();

    dict[nick] = existing;
    localStorage.setItem(KNOWN_PLAYERS_KEY, JSON.stringify(dict));
  } catch (e) {
    console.error('Failed to record real player profile', e);
  }
}

export function getGlobalLeaderboard(myProfile = {}) {
  const me = {
    id: 'me',
    nickname: myProfile.nickname || 'أنت',
    avatar: myProfile.avatar || 'cool',
    wins: myProfile.wins || 0,
    xp: myProfile.xp || 0,
    isMe: true
  };

  let realPlayers = [];
  try {
    const raw = localStorage.getItem(KNOWN_PLAYERS_KEY);
    if (raw) {
      const dict = JSON.parse(raw);
      // Filter out self if name matches
      realPlayers = Object.values(dict).filter(p => p.nickname !== me.nickname);
    }
  } catch (e) {}

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
