/**
 * Gem Kingdom — economy.js
 * Economy management: coin rewards, XP formulas, shop pricing,
 * star-to-coin conversion, daily bonus multipliers
 *
 * Exports: calcReward, calcXP, getShopItems, getDailyMultiplier, formatCoins
 */

import { SCORING, XP as XP_CONFIG, LANG } from './config.js';

// ===== COIN REWARD FORMULAS =====

const BASE_COIN_PER_STAR = 10;    // 1 star = 10 coins
const BOSS_BONUS = 50;            // Extra coins for beating a boss
const MINI_BOSS_BONUS = 25;
const PERFECT_BONUS = 30;         // 3-star bonus
const NO_BOOSTER_BONUS = 15;      // Completed without boosters
const STREAK_COIN_BONUS = 5;      // Per consecutive win

/**
 * Calculate coin reward for a completed level
 * @param {Object} params - {score, stars, isBoss, isMiniBoss, movesLeft, totalMoves, usedBoosters, winStreak, worldIdx}
 * @returns {Object} {total, breakdown: [{reason, amount}]}
 */
export function calcReward(params) {
  const {
    score = 0,
    stars = 0,
    isBoss = false,
    isMiniBoss = false,
    movesLeft = 0,
    totalMoves = 25,
    usedBoosters = 0,
    winStreak = 0,
    worldIdx = 0,
  } = params;

  const breakdown = [];

  // Base: coins per star
  const starCoins = stars * BASE_COIN_PER_STAR;
  breakdown.push({ reason: 'stars', amount: starCoins });

  // Score bonus: 1 coin per 200 score
  const scoreCoins = Math.floor(score / 200);
  if (scoreCoins > 0) breakdown.push({ reason: 'score', amount: scoreCoins });

  // Boss bonus
  if (isBoss) {
    breakdown.push({ reason: 'boss', amount: BOSS_BONUS });
  } else if (isMiniBoss) {
    breakdown.push({ reason: 'mini_boss', amount: MINI_BOSS_BONUS });
  }

  // Perfect (3 stars)
  if (stars >= 3) {
    breakdown.push({ reason: 'perfect', amount: PERFECT_BONUS });
  }

  // Efficiency bonus: moves saved
  const movesPct = totalMoves > 0 ? movesLeft / totalMoves : 0;
  if (movesPct > 0.3) {
    const effCoins = Math.floor(movesPct * 20);
    breakdown.push({ reason: 'efficiency', amount: effCoins });
  }

  // No boosters used
  if (usedBoosters === 0) {
    breakdown.push({ reason: 'no_booster', amount: NO_BOOSTER_BONUS });
  }

  // Win streak bonus
  if (winStreak > 1) {
    const streakCoins = Math.min(winStreak, 10) * STREAK_COIN_BONUS;
    breakdown.push({ reason: 'streak', amount: streakCoins });
  }

  // World difficulty multiplier (harder worlds = more coins)
  const worldMult = 1 + worldIdx * 0.1; // World 0 = 1.0, World 9 = 1.9

  const subtotal = breakdown.reduce((s, b) => s + b.amount, 0);
  const total = Math.round(subtotal * worldMult);

  return { total, breakdown, worldMultiplier: worldMult };
}

// ===== XP FORMULAS =====

const XP_PER_LEVEL = 100;           // Base XP per level
const XP_STAR_MULT = [0, 0.5, 0.8, 1.0]; // 0,1,2,3 stars

/**
 * Calculate XP earned for a completed level
 * @param {Object} params - {stars, worldIdx, isBoss, score}
 * @returns {number} XP earned
 */
export function calcXP(params) {
  const { stars = 0, worldIdx = 0, isBoss = false, score = 0 } = params;

  let xp = XP_PER_LEVEL * (XP_STAR_MULT[stars] || 0);

  // World bonus
  xp *= 1 + worldIdx * 0.05;

  // Boss bonus
  if (isBoss) xp *= 1.5;

  // Score bonus
  xp += Math.floor(score / 500);

  return Math.round(xp);
}

/**
 * Get level and XP thresholds for current player level
 * @param {number} totalXP - Total XP earned
 * @returns {Object} {level, currentXP, nextLevelXP, progress}
 */
export function getPlayerLevel(totalXP) {
  let level = 1;
  let xpNeeded = 200; // XP to reach level 2
  let xpAccum = 0;

  while (xpAccum + xpNeeded <= totalXP && level < 99) {
    xpAccum += xpNeeded;
    level++;
    xpNeeded = Math.round(xpNeeded * 1.15); // 15% increase per level
  }

  const currentXP = totalXP - xpAccum;
  return {
    level,
    currentXP,
    nextLevelXP: xpNeeded,
    progress: Math.round((currentXP / xpNeeded) * 100),
  };
}

// ===== SHOP ITEMS & PRICING =====

const BOOSTERS = [
  { id: 'hammer',    price: 50,  icon: '🔨', nameKey: 'booster_hammer' },
  { id: 'shuffle',   price: 40,  icon: '🔀', nameKey: 'booster_shuffle' },
  { id: 'extraMoves', price: 60, icon: '➕', nameKey: 'booster_extraMoves' },
  { id: 'rainbow',   price: 80,  icon: '🌈', nameKey: 'booster_rainbow' },
  { id: 'bomb',      price: 70,  icon: '💣', nameKey: 'booster_bomb' },
  { id: 'freeze',    price: 55,  icon: '❄️', nameKey: 'booster_freeze' },
  { id: 'hint',      price: 30,  icon: '💡', nameKey: 'booster_hint' },
  { id: 'doubleScore', price: 90, icon: '✖️', nameKey: 'booster_doubleScore' },
];

const THEMES = [
  { id: 'default',  price: 0,    icon: '🎨', nameKey: 'theme_default' },
  { id: 'ocean',    price: 200,  icon: '🌊', nameKey: 'theme_ocean' },
  { id: 'sunset',   price: 200,  icon: '🌅', nameKey: 'theme_sunset' },
  { id: 'forest',   price: 200,  icon: '🌲', nameKey: 'theme_forest' },
  { id: 'galaxy',   price: 300,  icon: '🌌', nameKey: 'theme_galaxy' },
];

/**
 * Get all shop items with current inventory
 * @param {Object} progress - Player progress
 * @returns {Object} {boosters: [], themes: []}
 */
export function getShopItems(progress) {
  const inv = progress?.boosters || {};
  const ownedThemes = progress?.themes || ['default'];

  return {
    boosters: BOOSTERS.map(b => ({
      ...b,
      owned: inv[b.id] || 0,
    })),
    themes: THEMES.map(t => ({
      ...t,
      owned: ownedThemes.includes(t.id),
    })),
  };
}

/**
 * Check if player can afford an item
 * @param {Object} progress - Player progress
 * @param {string} itemId - Booster or theme ID
 * @returns {boolean}
 */
export function canAfford(progress, itemId) {
  const coins = progress?.coins || 0;
  const item = [...BOOSTERS, ...THEMES].find(i => i.id === itemId);
  return item ? coins >= item.price : false;
}

/**
 * Get price for an item
 * @param {string} itemId
 * @returns {number}
 */
export function getPrice(itemId) {
  const item = [...BOOSTERS, ...THEMES].find(i => i.id === itemId);
  return item ? item.price : 0;
}

// ===== DAILY BONUS =====

const DAILY_REWARDS = [
  { day: 1, coins: 20,  icon: '🎁' },
  { day: 2, coins: 30,  icon: '🎁' },
  { day: 3, coins: 40,  icon: '🎁' },
  { day: 4, coins: 50,  icon: '🎁' },
  { day: 5, coins: 75,  icon: '🎁' },
  { day: 6, coins: 100, icon: '🎁' },
  { day: 7, coins: 200, icon: '👑' },  // Weekly jackpot
];

/**
 * Get daily reward info
 * @param {Object} progress - Player progress
 * @returns {Object} {canClaim, reward, dayIndex, streak}
 */
export function getDailyRewardInfo(progress) {
  const lastClaim = progress?.lastDailyReward || 0;
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const hoursSince = (now - lastClaim) / (60 * 60 * 1000);

  const canClaim = hoursSince >= 20; // Allow claiming after ~20h (forgiving)
  const streak = progress?.dailyStreak || 0;
  const dayIndex = streak % DAILY_REWARDS.length;
  const reward = DAILY_REWARDS[dayIndex];

  return { canClaim, reward, dayIndex, streak };
}

/**
 * Get daily multiplier based on streak
 * @param {Object} progress
 * @returns {number} multiplier (1.0 to 1.5)
 */
export function getDailyMultiplier(progress) {
  const streak = progress?.dailyStreak || 0;
  // Cap at 1.5x after 7-day streak
  return Math.min(1.0 + streak * 0.07, 1.5);
}

// ===== UTILITY =====

/**
 * Format coin amount with locale-appropriate separators
 * @param {number} amount
 * @returns {string}
 */
export function formatCoins(amount) {
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M';
  if (amount >= 1000) return (amount / 1000).toFixed(1) + 'K';
  return String(amount);
}

/**
 * Format XP amount
 * @param {number} amount
 * @returns {string}
 */
export function formatXP(amount) {
  if (amount >= 10000) return (amount / 1000).toFixed(1) + 'K';
  return String(amount);
}

/**
 * Calculate star-to-coin conversion rate
 * Stars can be "cashed" in for coins (optional feature)
 * @param {number} stars - Number of stars to convert
 * @param {number} worldIdx - World index for rate
 * @returns {number} coins
 */
export function starsToCoins(stars, worldIdx = 0) {
  const rate = 5 + worldIdx; // 5 coins/star for world 0, 14 for world 9
  return stars * rate;
}
