/**
 * statsEngine.js — Handles match recording, win streaks, and achievements/badges
 */

const HISTORY_KEY = 'celia_match_history';
const STREAK_KEY = 'celia_win_streak';

export const BADGES_LIST = [
  {
    id: 'first_win',
    title: 'الضربة الأولى ⚡',
    desc: 'احصل على أول فوز في أي لعبة',
    icon: '⚡',
    check: (stats) => (stats.wins || 0) >= 1
  },
  {
    id: 'streak_3',
    title: 'شرارة الفوز 🔥',
    desc: 'حقّق 3 انتصارات متتالية',
    icon: '🔥',
    check: (stats) => (stats.maxStreak || 0) >= 3
  },
  {
    id: 'streak_5',
    title: 'سلسلة نارية 💥',
    desc: 'حقّق 5 انتصارات متتالية دون هزيمة',
    icon: '💥',
    check: (stats) => (stats.maxStreak || 0) >= 5
  },
  {
    id: 'veteran_10',
    title: 'مقاتل مخضرم ⚔️',
    desc: 'العب 10 مبارايات متكاملة',
    icon: '⚔️',
    check: (stats) => (stats.gamesPlayed || 0) >= 10
  },
  {
    id: 'champion_20',
    title: 'بطل سيليا 🏆',
    desc: 'احصل على 20 انتصار إجمالي',
    icon: '🏆',
    check: (stats) => (stats.wins || 0) >= 20
  },
  {
    id: 'legend_50',
    title: 'الأسطورة 👑',
    desc: 'احصل على 50 انتصار إجمالي',
    icon: '👑',
    check: (stats) => (stats.wins || 0) >= 50
  }
];

export function getWinStreakStats() {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { currentStreak: 0, maxStreak: 0 };
    return JSON.parse(raw);
  } catch {
    return { currentStreak: 0, maxStreak: 0 };
  }
}

export function recordMatch({ gameId, gameTitle, oppName = 'الذكاء الاصطناعي', oppAvatar = 'bot', isWin, myScore = 0, oppScore = 0, isAI = false }) {
  try {
    // 1. Update streak
    const streakStats = getWinStreakStats();
    let currentStreak = isWin ? (streakStats.currentStreak || 0) + 1 : 0;
    let maxStreak = Math.max(streakStats.maxStreak || 0, currentStreak);
    localStorage.setItem(STREAK_KEY, JSON.stringify({ currentStreak, maxStreak }));

    // 2. Add match item
    const matches = getMatchHistory();
    const newMatch = {
      id: 'm_' + Date.now(),
      gameId,
      gameTitle,
      oppName: oppName || (isAI ? 'الذكاء الاصطناعي 🤖' : 'خصم مجهول'),
      oppAvatar,
      isWin,
      myScore,
      oppScore,
      isAI,
      timestamp: Date.now()
    };
    
    // Keep max 25 matches
    const updatedMatches = [newMatch, ...matches].slice(0, 25);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedMatches));

    return { currentStreak, maxStreak };
  } catch (e) {
    console.error('Failed to record match', e);
    return { currentStreak: 0, maxStreak: 0 };
  }
}

export function getMatchHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function formatMatchTime(timestamp) {
  if (!timestamp) return 'منذ فترة';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'الآن';
  if (diffSec < 3600) return `منذ ${Math.floor(diffSec / 60)} دقيقة`;
  if (diffSec < 86400) return `منذ ${Math.floor(diffSec / 3600)} ساعة`;
  return `منذ ${Math.floor(diffSec / 86400)} يوم`;
}
