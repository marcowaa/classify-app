// ===== Emoji Kingdom — Reports Module =====
// Parent-facing progress reports: stats extraction, skill analysis,
// per-world breakdown, engagement metrics, trend detection

import { WORLDS, WORLD_MAP, getTotalStars, getWorldCompletion, getPrestigeLevel } from './worlds.js';
import { getAchievementStats, getAllAchievements, getDailyStreak } from './economy.js';
import { getTypeMastery, ensureTypeProfiles } from './intelligence.js';
import { getPlayerLevel } from './core.js';
import { QUESTION_TYPES } from './config.js';

// ═══════════════════════════════════════════════════
//  1. OVERVIEW STATS
// ═══════════════════════════════════════════════════
export function getOverviewReport(progress) {
  const sd = progress.skillData || {};
  const achStats = getAchievementStats(progress);
  const allAch = getAllAchievements(progress);
  const unlockedCount = allAch.filter(a => a.unlocked).length;

  return {
    playerLevel: getPlayerLevel(progress),
    totalXP: progress.totalXP || 0,
    totalStars: achStats.totalStars,
    totalCoins: progress.coins || 0,
    gamesPlayed: sd.totalGamesPlayed || 0,
    highestStreak: sd.highestStreak || 0,
    smoothedSkill: Math.round(sd.smoothedSkill || 50),
    accuracyRate: Math.round((sd.accuracyRate || 0.5) * 100),
    avgResponseTime: Math.round((sd.avgResponseTime || 8) * 10) / 10,
    bossesBeaten: progress.bossesBeaten || 0,
    perfectGames: progress.perfectGames || 0,
    achievementsUnlocked: unlockedCount,
    achievementsTotal: allAch.length,
    dailyStreak: getDailyStreak(progress),
    totalPrestige: progress.totalPrestige || 0,
  };
}

// ═══════════════════════════════════════════════════
//  2. PER-WORLD BREAKDOWN
// ═══════════════════════════════════════════════════
export function getWorldsReport(progress) {
  return WORLDS.map(w => {
    const wp = progress.worlds[w.id] || {};
    const completion = getWorldCompletion(wp);
    const prestige = getPrestigeLevel(progress, w.id);
    const levelsPlayed = Object.keys(wp.scores || {}).length;
    const avgStars = levelsPlayed > 0
      ? Math.round(Object.values(wp.stars || {}).reduce((s, v) => s + v, 0) / levelsPlayed * 10) / 10
      : 0;
    return {
      id: w.id,
      icon: w.icon,
      emoji: w.emoji,
      order: w.order,
      stars: completion.stars,
      levels: completion.levels,
      mastery: completion.mastery,
      prestige,
      levelsPlayed,
      avgStars,
      ageRange: w.ageRange,
    };
  });
}

// ═══════════════════════════════════════════════════
//  3. SKILL ANALYSIS (per question type)
// ═══════════════════════════════════════════════════
export function getSkillReport(progress) {
  const sd = progress.skillData || {};
  const profiles = ensureTypeProfiles(sd);
  const types = Object.keys(QUESTION_TYPES);

  const result = [];
  for (const tid of types) {
    const tp = profiles[tid];
    const mastery = getTypeMastery(sd, tid);
    const attempts = tp ? tp.attempts : 0;
    if (attempts === 0) continue; // skip never-seen types

    result.push({
      typeId: tid,
      mastery,
      accuracy: tp ? Math.round(tp.accuracy * 100) : 50,
      avgTime: tp ? Math.round(tp.avgTime * 10) / 10 : 8,
      attempts,
      streak: tp ? tp.streak : 0,
      strength: mastery >= 70 ? 'strong' : mastery >= 40 ? 'developing' : 'needs_practice',
    });
  }

  // Sort: weakest first
  result.sort((a, b) => a.mastery - b.mastery);
  return result;
}

/** Get top 3 strengths and top 3 weaknesses */
export function getStrengthWeakness(progress) {
  const skills = getSkillReport(progress);
  if (skills.length === 0) return { strengths: [], weaknesses: [] };

  const sorted = [...skills].sort((a, b) => b.mastery - a.mastery);
  return {
    strengths: sorted.slice(0, 3).filter(s => s.mastery >= 50),
    weaknesses: sorted.slice(-3).reverse().filter(s => s.mastery < 70),
  };
}

// ═══════════════════════════════════════════════════
//  4. ENGAGEMENT METRICS
// ═══════════════════════════════════════════════════
export function getEngagementReport(progress) {
  const sd = progress.skillData || {};
  const achAll = getAllAchievements(progress);
  const nextAch = achAll.find(a => !a.unlocked);

  return {
    dailyStreak: getDailyStreak(progress),
    loginStreak: progress.loginStreak || { lastDate: null, count: 0 },
    weeklyCompleted: progress.weeklyCompleted || false,
    dailyChallengeCompleted: progress.dailyChallengeCompleted || false,
    totalPrestige: progress.totalPrestige || 0,
    gamesPlayed: sd.totalGamesPlayed || 0,
    nextAchievement: nextAch ? {
      id: nextAch.id,
      icon: nextAch.icon,
      current: nextAch.current,
      goal: nextAch.goal,
      progress: Math.round((nextAch.current / nextAch.goal) * 100),
    } : null,
  };
}

// ═══════════════════════════════════════════════════
//  5. GRADE-LEVEL ESTIMATE
// ═══════════════════════════════════════════════════
/**
 * Estimate child's effective math grade level based on world progress
 * and skill mastery. Returns { grade, label, confidence }
 */
export function estimateGradeLevel(progress) {
  const worldsReport = getWorldsReport(progress);
  const skillReport = getSkillReport(progress);

  // Weight each world by its age range midpoint
  let weightedSum = 0;
  let weightTotal = 0;

  for (const wr of worldsReport) {
    if (wr.levelsPlayed === 0) continue;
    const ageMid = (wr.ageRange[0] + wr.ageRange[1]) / 2;
    const weight = wr.levelsPlayed * (wr.avgStars / 3);
    weightedSum += ageMid * weight;
    weightTotal += weight;
  }

  // Skill bonus: higher DDA skill pushes estimate up
  const sd = progress.skillData || {};
  const skill = sd.smoothedSkill || 50;
  const skillBonus = (skill - 50) / 50; // -1 to +1

  let effectiveAge = weightTotal > 0 ? (weightedSum / weightTotal) + skillBonus : 5;
  effectiveAge = Math.max(4, Math.min(15, effectiveAge));

  // Age → grade mapping (approx)
  const grade = Math.max(0, Math.round(effectiveAge - 5)); // age 5 = grade 0 (KG)
  const confidence = Math.min(100, Math.round(weightTotal * 5));

  const labels = {
    0: 'KG', 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th',
    6: '6th', 7: '7th', 8: '8th', 9: '9th', 10: '10th',
  };

  return {
    grade,
    label: labels[grade] || grade + 'th',
    effectiveAge: Math.round(effectiveAge * 10) / 10,
    confidence,
  };
}

// ═══════════════════════════════════════════════════
//  6. FULL COMBINED REPORT (for postMessage)
// ═══════════════════════════════════════════════════
export function generateFullReport(progress) {
  return {
    type: 'MATH_PROGRESS_REPORT',
    timestamp: Date.now(),
    overview: getOverviewReport(progress),
    worlds: getWorldsReport(progress),
    skills: getSkillReport(progress),
    strengthWeakness: getStrengthWeakness(progress),
    engagement: getEngagementReport(progress),
    gradeEstimate: estimateGradeLevel(progress),
  };
}
