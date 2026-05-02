/* ═══════════════════════════════════════════════════════════════
   Cat Kingdom — Intelligence / DDA Module
   Dynamic Difficulty Adjustment + Skill Tracking
   Pattern: matches gem-kingdom-modules/intelligence.js
   ═══════════════════════════════════════════════════════════════ */

import { LANG } from './i18n.js';

const STORAGE_KEY = 'catk_intelligence';

/* ══════════════════════════════
   Default state
   ══════════════════════════════ */
function defaultDDA() {
  return {
    totalGames: 0,
    wins: 0,
    losses: 0,
    winStreak: 0,
    loseStreak: 0,
    maxWinStreak: 0,
    subjectStats: {},
    smoothedSkill: 0.5,
    overallAccuracy: 0,
    overallAvgTime: 0,
    totalCorrect: 0,
    totalQuestions: 0,
    totalTimeSec: 0,
    history: [],          // last 20 results: { subject, accuracy, avgTime, passed }
    lastModifier: 0,
    sessionsPlayed: 0,
    firstPlayDate: null,
  };
}

/* ══════════════════════════════
   Load / Save
   ══════════════════════════════ */
export function loadDDA() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultDDA(), ...JSON.parse(raw) };
  } catch (e) {}
  return defaultDDA();
}

export function saveDDA(dda) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(dda)); } catch (e) {}
}

/* ══════════════════════════════
   Update after level complete
   ══════════════════════════════ */
export function updateDDA(dda, subject, passed, correct, total, timeUsedSec) {
  dda.totalGames++;
  dda.sessionsPlayed++;
  dda.totalCorrect += correct;
  dda.totalQuestions += total;
  dda.totalTimeSec += timeUsedSec;

  if (!dda.firstPlayDate) dda.firstPlayDate = Date.now();

  // Accuracy
  const accuracy = total > 0 ? correct / total : 0;
  const avgTime = total > 0 ? timeUsedSec / total : 10;
  dda.overallAccuracy = dda.totalQuestions > 0 ? dda.totalCorrect / dda.totalQuestions : 0;
  dda.overallAvgTime = dda.totalQuestions > 0 ? dda.totalTimeSec / dda.totalQuestions : 10;

  // Win/loss
  if (passed) {
    dda.wins++;
    dda.winStreak++;
    dda.loseStreak = 0;
    if (dda.winStreak > dda.maxWinStreak) dda.maxWinStreak = dda.winStreak;
  } else {
    dda.losses++;
    dda.loseStreak++;
    dda.winStreak = 0;
  }

  // Subject stats
  if (!dda.subjectStats[subject]) {
    dda.subjectStats[subject] = { correct: 0, total: 0, totalTime: 0, attempts: 0, wins: 0 };
  }
  const ss = dda.subjectStats[subject];
  ss.correct += correct;
  ss.total += total;
  ss.totalTime += timeUsedSec;
  ss.attempts++;
  if (passed) ss.wins++;

  // Smoothed skill (exponential moving average)
  const alpha = 0.2;
  const performanceScore = accuracy * 0.6 + Math.max(0, 1 - avgTime / 15) * 0.4;
  dda.smoothedSkill = dda.smoothedSkill * (1 - alpha) + performanceScore * alpha;
  dda.smoothedSkill = Math.max(0, Math.min(1, dda.smoothedSkill));

  // History (keep last 20)
  dda.history.push({ subject, accuracy, avgTime, passed, timestamp: Date.now() });
  if (dda.history.length > 20) dda.history.shift();

  saveDDA(dda);
  return dda;
}

/* ══════════════════════════════
   Get Difficulty Modifier
   Returns adjustments for the next level
   ══════════════════════════════ */
export function getDDAModifier(dda, subject) {
  const result = {
    questionAdjust: 0,   // +/- questions count
    timeAdjust: 0,       // +/- seconds per question
    hintAvailable: false,
    difficultyLabel: 'normal',
  };

  // Global skill check
  const skill = dda.smoothedSkill;
  const winRate = dda.totalGames > 0 ? dda.wins / dda.totalGames : 0.5;

  // Subject-specific check
  const ss = dda.subjectStats[subject];
  const subjectAccuracy = ss && ss.total > 0 ? ss.correct / ss.total : 0.5;

  // ── Increase difficulty if performing well ──
  if (skill > 0.8 && dda.winStreak >= 3) {
    result.questionAdjust = +2;
    result.timeAdjust = -2;
    result.difficultyLabel = 'hard';
  } else if (skill > 0.65 && winRate > 0.7) {
    result.questionAdjust = +1;
    result.timeAdjust = -1;
    result.difficultyLabel = 'medium-hard';
  }
  // ── Decrease difficulty if struggling ──
  else if (skill < 0.3 || dda.loseStreak >= 3) {
    result.questionAdjust = -2;
    result.timeAdjust = +4;
    result.hintAvailable = true;
    result.difficultyLabel = 'easy';
  } else if (skill < 0.45 || dda.loseStreak >= 2) {
    result.questionAdjust = -1;
    result.timeAdjust = +2;
    result.hintAvailable = true;
    result.difficultyLabel = 'medium-easy';
  }
  // ── Subject-specific easing ──
  else if (subjectAccuracy < 0.4 && ss && ss.attempts >= 2) {
    result.timeAdjust = +3;
    result.hintAvailable = true;
    result.difficultyLabel = 'subject-help';
  }

  dda.lastModifier = result.questionAdjust;

  // Map to question difficulty tier (1=easy, 2=normal, 3=hard)
  const diffMap = { 'easy': 1, 'medium-easy': 1, 'normal': 2, 'medium-hard': 3, 'hard': 3, 'subject-help': 1 };
  result.difficulty = diffMap[result.difficultyLabel] || 2;

  return result;
}

/* ══════════════════════════════
   Subject Analysis
   ══════════════════════════════ */
export function getSubjectStrength(dda, subject) {
  const ss = dda.subjectStats[subject];
  if (!ss || ss.total === 0) return { accuracy: 0, avgTime: 0, level: 'unknown' };

  const accuracy = ss.correct / ss.total;
  const avgTime = ss.totalTime / ss.total;

  let level;
  if (accuracy >= 0.9) level = 'expert';
  else if (accuracy >= 0.75) level = 'strong';
  else if (accuracy >= 0.55) level = 'developing';
  else level = 'needs_practice';

  return { accuracy, avgTime, level, attempts: ss.attempts, winRate: ss.wins / ss.attempts };
}

export function getWeakestSubject(dda) {
  let weakest = null;
  let lowestAcc = 2;
  for (const [subject, ss] of Object.entries(dda.subjectStats)) {
    if (ss.total < 3) continue;
    const acc = ss.correct / ss.total;
    if (acc < lowestAcc) { lowestAcc = acc; weakest = subject; }
  }
  return weakest;
}

export function getStrongestSubject(dda) {
  let strongest = null;
  let highestAcc = -1;
  for (const [subject, ss] of Object.entries(dda.subjectStats)) {
    if (ss.total < 3) continue;
    const acc = ss.correct / ss.total;
    if (acc > highestAcc) { highestAcc = acc; strongest = subject; }
  }
  return strongest;
}

/* ══════════════════════════════
   Skill Level
   ══════════════════════════════ */
export function getSkillLevel(dda) {
  const skill = dda.smoothedSkill;
  if (skill >= 0.85) return 'expert';
  if (skill >= 0.65) return 'advanced';
  if (skill >= 0.4) return 'intermediate';
  return 'beginner';
}

const SKILL_LABELS = {
  ar: { beginner: 'مبتدئ 🌱', intermediate: 'متوسط 📚', advanced: 'متقدم 🌟', expert: 'خبير 👑' },
  en: { beginner: 'Beginner 🌱', intermediate: 'Intermediate 📚', advanced: 'Advanced 🌟', expert: 'Expert 👑' },
  pt: { beginner: 'Iniciante 🌱', intermediate: 'Intermediário 📚', advanced: 'Avançado 🌟', expert: 'Especialista 👑' },
};

export function getSkillLabel(dda) {
  const lang = LANG === 'ar' ? 'ar' : LANG === 'pt' ? 'pt' : 'en';
  return SKILL_LABELS[lang][getSkillLevel(dda)] || SKILL_LABELS.en.intermediate;
}

/* ══════════════════════════════
   Recent Trend (improving / stable / declining)
   ══════════════════════════════ */
export function getPerformanceTrend(dda) {
  if (dda.history.length < 4) return 'stable';
  const recent = dda.history.slice(-5);
  const older = dda.history.slice(-10, -5);
  if (older.length === 0) return 'stable';

  const recentAvg = recent.reduce((s, h) => s + h.accuracy, 0) / recent.length;
  const olderAvg = older.reduce((s, h) => s + h.accuracy, 0) / older.length;

  if (recentAvg > olderAvg + 0.1) return 'improving';
  if (recentAvg < olderAvg - 0.1) return 'declining';
  return 'stable';
}

const TREND_LABELS = {
  ar: { improving: '📈 في تحسّن!', stable: '📊 مستقر', declining: '📉 يحتاج تدريب' },
  en: { improving: '📈 Improving!', stable: '📊 Stable', declining: '📉 Needs practice' },
  pt: { improving: '📈 Melhorando!', stable: '📊 Estável', declining: '📉 Precisa praticar' },
};

export function getTrendLabel(dda) {
  const lang = LANG === 'ar' ? 'ar' : LANG === 'pt' ? 'pt' : 'en';
  return TREND_LABELS[lang][getPerformanceTrend(dda)] || TREND_LABELS.en.stable;
}
