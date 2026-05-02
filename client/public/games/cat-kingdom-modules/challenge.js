/* ═══════════════════════════════════════════════════════════════
   Cat Kingdom — Daily Challenge Module
   5 mixed questions per day with special rewards
   ═══════════════════════════════════════════════════════════════ */

import { LANG, L } from './i18n.js';
import { getQuestions } from './questions.js';
import { todayStr, yesterdayStr } from './utils.js';

const CHALLENGE_KEY = 'catk_challenge';

/* ══════════════════════════════
   State
   ══════════════════════════════ */
function defaultChallenge() {
  return {
    lastDate: null,
    completed: false,
    totalCompleted: 0,
    bestScore: 0,
    currentStreak: 0,
    maxStreak: 0,
  };
}

export function loadChallenge() {
  try {
    const raw = localStorage.getItem(CHALLENGE_KEY);
    if (raw) return { ...defaultChallenge(), ...JSON.parse(raw) };
  } catch(e) {}
  return defaultChallenge();
}

export function saveChallenge(ch) {
  try { localStorage.setItem(CHALLENGE_KEY, JSON.stringify(ch)); } catch(e) {}
}

/* ══════════════════════════════
   Challenge Logic
   ══════════════════════════════ */
export function canPlayChallenge(ch) {
  // Allow retry if today's challenge was failed
  if (ch.lastDate === todayStr() && ch.completed) return false;
  return true;
}

export function getChallengeQuestions() {
  return getQuestions('mixed', 5);
}

export function completeChallenge(ch, score, total) {
  const today = todayStr();
  const pct = Math.round((score / total) * 100);
  const passed = pct >= 60;

  if (ch.lastDate === yesterdayStr()) {
    ch.currentStreak = passed ? ch.currentStreak + 1 : 0;
  } else {
    ch.currentStreak = passed ? 1 : 0;
  }

  ch.lastDate = today;
  ch.completed = passed;
  if (passed) ch.totalCompleted++;
  if (pct > ch.bestScore) ch.bestScore = pct;
  if (ch.currentStreak > ch.maxStreak) ch.maxStreak = ch.currentStreak;

  saveChallenge(ch);

  const reward = passed ? 25 + ch.currentStreak * 5 : 0;

  return {
    passed,
    score: pct,
    reward,
    streak: ch.currentStreak,
    message: passed
      ? L(`🏆 أحسنت! حصلت على ${reward} عملة!`, `🏆 Great! You earned ${reward} coins!`, `🏆 Ótimo! Ganhou ${reward} moedas!`)
      : L('😢 حاول مرة أخرى!', '😢 Try again!', '😢 Tente novamente!'),
  };
}

/* ══════════════════════════════
   Display Info
   ══════════════════════════════ */
export function getChallengeInfo(ch) {
  const available = canPlayChallenge(ch);
  return {
    available,
    streak: ch.currentStreak,
    maxStreak: ch.maxStreak,
    totalCompleted: ch.totalCompleted,
    bestScore: ch.bestScore,
    statusText: available
      ? L('🎯 تحدي اليوم جاهز!', '🎯 Today\'s challenge ready!', '🎯 Desafio de hoje pronto!')
      : L('✅ أكملت تحدي اليوم', '✅ Today\'s challenge done', '✅ Desafio de hoje feito'),
  };
}
