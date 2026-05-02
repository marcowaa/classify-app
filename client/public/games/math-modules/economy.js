// ===== Emoji Kingdom — Economy Module =====
// Coins, Boosters, Hints, Shop, Daily Login, Achievement Rewards, Streak Bonuses

import { ACHIEVEMENTS } from './config.js';

export const BOOSTER_TYPES = {
  hammer:    { icon: '🔨', basePrice: 50,  escalation: 1.10 },
  shuffle:   { icon: '🔄', basePrice: 30,  escalation: 1.10 },
  extraTime: { icon: '⏱️', basePrice: 20,  escalation: 1.10 },
  hint:      { icon: '💡', basePrice: 40,  escalation: 1.10 },
};

export function addCoins(p, amount) {
  p.coins = (p.coins || 0) + Math.round(amount);
}

export function getCoins(p) {
  return p.coins || 0;
}

export function getBoosterCount(p, type) {
  return (p.boosters && p.boosters[type]) || 0;
}

export function useBooster(p, type) {
  if (!p.boosters) p.boosters = {};
  const count = p.boosters[type] || 0;
  if (count <= 0) return false;
  p.boosters[type] = count - 1;
  return true;
}

export function getBoosterPrice(p, type) {
  const bt = BOOSTER_TYPES[type];
  if (!bt) return 999;
  const purchases = (p.purchaseCounts && p.purchaseCounts[type]) || 0;
  return Math.round(bt.basePrice * Math.pow(bt.escalation, purchases));
}

export function buyBooster(p, type) {
  const price = getBoosterPrice(p, type);
  if ((p.coins || 0) < price) return { success: false, reason: 'notEnough' };
  p.coins -= price;
  if (!p.boosters) p.boosters = {};
  p.boosters[type] = (p.boosters[type] || 0) + 1;
  if (!p.purchaseCounts) p.purchaseCounts = {};
  p.purchaseCounts[type] = (p.purchaseCounts[type] || 0) + 1;
  return { success: true, newCount: p.boosters[type], newCoins: p.coins };
}

export function getShopItems(p) {
  return Object.keys(BOOSTER_TYPES).map(type => ({
    type,
    icon: BOOSTER_TYPES[type].icon,
    price: getBoosterPrice(p, type),
    owned: getBoosterCount(p, type),
    canAfford: (p.coins || 0) >= getBoosterPrice(p, type),
  }));
}

// ===== DAILY LOGIN BONUS =====
// Returns { awarded, coins, streak } or null if already claimed today.
export function checkDailyLogin(p) {
  const today = new Date().toDateString();
  if (!p.loginStreak) p.loginStreak = { lastDate: null, count: 0 };

  if (p.loginStreak.lastDate === today) return null; // already claimed

  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (p.loginStreak.lastDate === yesterday) {
    p.loginStreak.count++;
  } else {
    p.loginStreak.count = 1;
  }
  p.loginStreak.lastDate = today;

  // Bonus scales with streak: base 5, +2 per streak day, cap 50
  const bonus = Math.min(50, 5 + (p.loginStreak.count - 1) * 2);
  addCoins(p, bonus);

  return { awarded: true, coins: bonus, streak: p.loginStreak.count };
}

export function getDailyStreak(p) {
  if (!p.loginStreak) return 0;
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (p.loginStreak.lastDate === today || p.loginStreak.lastDate === yesterday) {
    return p.loginStreak.count;
  }
  return 0; // streak broken
}

// ===== STREAK-BASED END-GAME BONUS =====
// Extra coins for daily challenge streaks
export function getDailyStreakBonus(dailyStreak) {
  if (dailyStreak >= 30) return 30;
  if (dailyStreak >= 14) return 20;
  if (dailyStreak >=  7) return 12;
  if (dailyStreak >=  3) return 5;
  return 0;
}

// ===== ACHIEVEMENT EVALUATOR =====
export function getAchievementStats(p) {
  const starsAll = Object.values(p.worlds || {}).reduce((s, w) =>
    s + Object.values(w.stars || {}).reduce((a, v) => a + (v || 0), 0), 0);

  return {
    totalStars:     starsAll,
    playerLevel:    p.playerLevel || 1,
    bossesBeaten:   p.bossesBeaten || 0,
    highStreak:     (p.skillData && p.skillData.highestStreak) || 0,
    perfectGames:   p.perfectGames || 0,
    dailyStreak:    getDailyStreak(p),
    worldsCleared:  p.worldsCleared || 0,
    totalPrestige:  p.totalPrestige || 0,
    gamesPlayed:    (p.skillData && p.skillData.totalGamesPlayed) || 0,
  };
}

/**
 * Evaluate achievements and award coins for newly unlocked ones.
 * Returns array of newly unlocked achievement objects.
 */
export function evaluateAchievements(p) {
  if (!p.achievementsUnlocked) p.achievementsUnlocked = [];
  const stats = getAchievementStats(p);
  const newlyUnlocked = [];

  for (const ach of ACHIEVEMENTS) {
    if (p.achievementsUnlocked.includes(ach.id)) continue;
    const val = stats[ach.type] || 0;
    if (val >= ach.goal) {
      p.achievementsUnlocked.push(ach.id);
      addCoins(p, ach.coins);
      newlyUnlocked.push(ach);
    }
  }

  return newlyUnlocked;
}

/** Get all achievements with progress info */
export function getAllAchievements(p) {
  if (!p.achievementsUnlocked) p.achievementsUnlocked = [];
  const stats = getAchievementStats(p);
  return ACHIEVEMENTS.map(ach => ({
    ...ach,
    unlocked: p.achievementsUnlocked.includes(ach.id),
    current: Math.min(stats[ach.type] || 0, ach.goal),
  }));
}
