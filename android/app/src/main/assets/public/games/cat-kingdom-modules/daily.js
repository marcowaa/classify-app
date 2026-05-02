/* ═══════════════════════════════════════════════════════════════
   Cat Kingdom — Daily Rewards Module
   Login streak, daily bonus, calendar tracking
   ═══════════════════════════════════════════════════════════════ */

import { LANG, L } from './i18n.js';
import { todayStr, yesterdayStr } from './utils.js';

const DAILY_KEY = 'catk_daily';

/* ══════════════════════════════
   Reward Tiers
   ══════════════════════════════ */
const DAILY_REWARDS = [
  { day: 1,  coins: 10,  emoji: '🎁', bonus: null },
  { day: 2,  coins: 15,  emoji: '🎁', bonus: null },
  { day: 3,  coins: 20,  emoji: '🎁', bonus: null },
  { day: 4,  coins: 25,  emoji: '🎁', bonus: null },
  { day: 5,  coins: 40,  emoji: '🎊', bonus: 'hint' },         // + free hint
  { day: 6,  coins: 30,  emoji: '🎁', bonus: null },
  { day: 7,  coins: 50,  emoji: '🏆', bonus: 'freeze' },       // + free freeze
  { day: 10, coins: 60,  emoji: '⭐', bonus: 'extraLife' },     // + free extra life
  { day: 14, coins: 80,  emoji: '🌟', bonus: 'doubleScore' },   // + free double score
  { day: 21, coins: 100, emoji: '💎', bonus: 'shield' },        // + free shield
  { day: 30, coins: 150, emoji: '👑', bonus: 'hint' },          // crown reward
];

/**
 * Get the reward config for a given streak day
 */
function getRewardForDay(day) {
  // Find the highest matching tier
  let reward = DAILY_REWARDS[0];
  for (const r of DAILY_REWARDS) {
    if (day >= r.day) reward = r;
  }
  // Scale coins linearly for days beyond defined tiers
  if (day > 30) {
    return { day, coins: 20 + Math.floor(day / 7) * 10, emoji: '🎁', bonus: null };
  }
  return { ...reward, day };
}

/* ══════════════════════════════
   State
   ══════════════════════════════ */
function defaultDaily() {
  return {
    streak: 0,
    maxStreak: 0,
    lastClaimDate: null,   // 'YYYY-MM-DD'
    totalClaimed: 0,
    totalCoinsEarned: 0,
    claimHistory: [],      // last 30 days: ['YYYY-MM-DD', ...]
  };
}

export function loadDaily() {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (raw) return { ...defaultDaily(), ...JSON.parse(raw) };
  } catch (e) {}
  return defaultDaily();
}

export function saveDaily(daily) {
  try { localStorage.setItem(DAILY_KEY, JSON.stringify(daily)); } catch (e) {}
}

/* ══════════════════════════════
   Check & Claim
   ══════════════════════════════ */

/**
 * Check if daily reward is available
 */
export function canClaimDaily(daily) {
  return daily.lastClaimDate !== todayStr();
}

/**
 * Claim daily reward
 * Returns { claimed, coins, streak, bonus, message } or null if already claimed
 */
export function claimDaily(daily, addCoins, addPowerup) {
  const today = todayStr();
  if (daily.lastClaimDate === today) return null;

  // Check streak
  if (daily.lastClaimDate === yesterdayStr()) {
    daily.streak++;
  } else if (daily.lastClaimDate === null) {
    daily.streak = 1;
  } else {
    // Streak broken
    daily.streak = 1;
  }

  if (daily.streak > daily.maxStreak) daily.maxStreak = daily.streak;

  daily.lastClaimDate = today;
  daily.totalClaimed++;

  // Keep last 30 claim dates
  daily.claimHistory.push(today);
  if (daily.claimHistory.length > 30) daily.claimHistory.shift();

  // Get reward
  const reward = getRewardForDay(daily.streak);
  daily.totalCoinsEarned += reward.coins;

  // Apply coins
  if (addCoins) addCoins(reward.coins);

  // Apply bonus power-up
  if (reward.bonus && addPowerup) {
    addPowerup(reward.bonus);
  }

  saveDaily(daily);

  // Build message
  let msg;
  if (daily.streak >= 7) {
    msg = L(
      `🔥 سلسلة ${daily.streak} أيام! حصلت على ${reward.coins} عملة${reward.bonus ? ' + مكافأة إضافية!' : '!'}`,
      `🔥 ${daily.streak}-day streak! Got ${reward.coins} coins${reward.bonus ? ' + bonus item!' : '!'}`,
      `🔥 Sequência de ${daily.streak} dias! Ganhou ${reward.coins} moedas${reward.bonus ? ' + item bônus!' : '!'}`
    );
  } else {
    msg = L(
      `${reward.emoji} مكافأة يومية: ${reward.coins} عملة! (${daily.streak} أيام متتالية)`,
      `${reward.emoji} Daily reward: ${reward.coins} coins! (${daily.streak}-day streak)`,
      `${reward.emoji} Recompensa diária: ${reward.coins} moedas! (sequência de ${daily.streak} dias)`
    );
  }

  return {
    claimed: true,
    coins: reward.coins,
    streak: daily.streak,
    bonus: reward.bonus,
    emoji: reward.emoji,
    message: msg,
  };
}

/* ══════════════════════════════
   Get streak status info for display
   ══════════════════════════════ */
export function getStreakInfo(daily) {
  const nextReward = getRewardForDay(daily.streak + 1);
  const claimed = !canClaimDaily(daily);

  return {
    currentStreak: daily.streak,
    maxStreak: daily.maxStreak,
    claimed,
    nextCoins: nextReward.coins,
    nextBonus: nextReward.bonus,
    nextEmoji: nextReward.emoji,
    statusEmoji: daily.streak >= 14 ? '🔥' : daily.streak >= 7 ? '⭐' : daily.streak >= 3 ? '💪' : '🌱',
    statusText: claimed
      ? L('✅ تم الاستلام اليوم', '✅ Claimed today', '✅ Resgatado hoje')
      : L('🎁 مكافأتك جاهزة!', '🎁 Reward ready!', '🎁 Recompensa pronta!'),
  };
}

/* ══════════════════════════════
   Calendar View Data (last 30 days)
   ══════════════════════════════ */
export function getCalendarData(daily) {
  const days = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const claimed = daily.claimHistory.includes(dateStr);
    const isToday = dateStr === todayStr();

    days.push({
      date: dateStr,
      day: d.getDate(),
      claimed,
      isToday,
      emoji: claimed ? '✅' : isToday && canClaimDaily(daily) ? '🎁' : '⬜',
    });
  }

  return days;
}

/**
 * Reset daily data (for testing)
 */
export function resetDaily() {
  localStorage.removeItem(DAILY_KEY);
}
