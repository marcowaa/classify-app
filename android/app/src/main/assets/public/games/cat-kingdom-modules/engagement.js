/* ═══════════════════════════════════════════════════════════════
   Cat Kingdom — Engagement Module
   Standard 6 exports + tracker + badges
   Pattern: matches math-modules/engagement.js
   ═══════════════════════════════════════════════════════════════ */

import { LANG, t } from './i18n.js';

/* ═════════════════════════════
   1. Streak Messages
   ═════════════════════════════ */
export function getStreakMessage(streak) {
  if (streak >= 10) return t.streak10;
  if (streak >= 7)  return t.streak7;
  if (streak >= 5)  return t.streak5;
  if (streak >= 3)  return t.streak3;
  if (streak >= 2)  return t.streak2;
  return '';
}

/* ═════════════════════════════
   2. Near Miss
   ═════════════════════════════ */
const NEAR_MISS = {
  ar: ['قريب جداً! حاول مرة أخرى 🔥','كان بإمكانك! لا تستسلم 💪','بقيت خطوة واحدة! استمر 🌟','تقريباً! أنت قادر ⭐','اقتربت كثيراً! مرة أخرى 🚀'],
  en: ['So close! Try again 🔥','Almost had it! Don\'t give up 💪','One step away! Keep going 🌟','Nearly there! You can do it ⭐','So close! One more try 🚀'],
  pt: ['Tão perto! Tente de novo 🔥','Quase conseguiu! Não desista 💪','Faltou um passo! Continue 🌟','Quase lá! Você consegue ⭐','Estava tão perto! Mais uma vez 🚀'],
};

export function getNearMissMessage() {
  const lang = LANG === 'ar' ? 'ar' : LANG === 'pt' ? 'pt' : 'en';
  const msgs = NEAR_MISS[lang];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

export function checkNearMiss(correct, required, total) {
  if (correct === required - 1) return { isNearMiss: true, type: 'oneAway' };
  return { isNearMiss: false, type: null };
}

/* ═════════════════════════════
   3. Micro-Badges (12)
   ═════════════════════════════ */
const MICRO_BADGES = [
  { id:'fast',         icon:'⚡', text:{ar:'سريع البرق',en:'Lightning Fast',pt:'Raio Veloz'},         condition: s => s.fastAnswers >= 3 },
  { id:'nohint',       icon:'🧠', text:{ar:'بلا تلميح',en:'No Hints',pt:'Sem Dicas'},                condition: s => !s.usedHint && s.totalQuestions >= 5 },
  { id:'perfect',      icon:'✨', text:{ar:'مثالي',en:'Perfect',pt:'Perfeito'},                       condition: s => s.totalCorrect === s.totalQuestions && s.totalQuestions >= 5 },
  { id:'combo_king',   icon:'👑', text:{ar:'ملك التتابع',en:'Combo King',pt:'Rei do Combo'},          condition: s => s.maxConsecutive >= 5 },
  { id:'boss_slayer',  icon:'⚔️', text:{ar:'صائد الزعماء',en:'Boss Slayer',pt:'Caçador de Chefes'},   condition: s => s.bossDefeated === true },
  { id:'speed_demon',  icon:'🏎️', text:{ar:'شيطان السرعة',en:'Speed Demon',pt:'Demônio da Velocidade'}, condition: s => s.totalQuestions >= 5 && avgTime(s) < 3 },
  { id:'zero_error',   icon:'🛡️', text:{ar:'بدون أخطاء',en:'Zero Errors',pt:'Zero Erros'},           condition: s => s.totalCorrect === s.totalQuestions && s.totalQuestions >= 5 },
  { id:'explorer',     icon:'🗺️', text:{ar:'مستكشف',en:'Explorer',pt:'Explorador'},                  condition: s => (s.worldsVisited || 0) >= 3 },
  { id:'marathon',     icon:'🏃', text:{ar:'ماراثون',en:'Marathon',pt:'Maratona'},                    condition: s => s.totalQuestions >= 10 },
  { id:'coin_harvest', icon:'💰', text:{ar:'حاصد العملات',en:'Coin Harvest',pt:'Colheita de Moedas'}, condition: s => (s.coinsEarned || 0) >= 50 },
  { id:'streak_fire',  icon:'🔥', text:{ar:'خبير السلاسل',en:'Streak Master',pt:'Mestre da Sequência'}, condition: s => (s.dailyStreak || 0) >= 3 },
  { id:'time_master',  icon:'⏱️', text:{ar:'سيد الوقت',en:'Time Master',pt:'Mestre do Tempo'},       condition: s => s.timeRemainPct >= 0.5 },
];

function avgTime(s) {
  if (!s.questionTimes || s.questionTimes.length === 0) return 10;
  return s.questionTimes.reduce((a,b) => a+b, 0) / s.questionTimes.length;
}

export function checkMicroBadges(stats) {
  const lang = LANG === 'ar' ? 'ar' : LANG === 'pt' ? 'pt' : 'en';
  const earned = [];
  for (const b of MICRO_BADGES) {
    if (b.condition(stats)) {
      earned.push({ id: b.id, icon: b.icon, label: b.text[lang] });
    }
  }
  return earned;
}

/* ═════════════════════════════
   Tracker (create per level)
   ═════════════════════════════ */
export function createTracker() {
  return {
    fastAnswers: 0,
    fastConsecutive: 0,
    maxConsecutive: 0,
    totalCorrect: 0,
    totalQuestions: 0,
    questionTimes: [],
    usedHint: false,
    bossDefeated: false,
    coinsEarned: 0,
    worldsVisited: 0,
    dailyStreak: 0,
    timeRemainPct: 0,
  };
}

export function trackAnswer(tracker, correct, responseTime) {
  tracker.totalQuestions++;
  if (correct) {
    tracker.totalCorrect++;
    tracker.fastConsecutive++;
    if (tracker.fastConsecutive > tracker.maxConsecutive) tracker.maxConsecutive = tracker.fastConsecutive;
    if (responseTime < 3) tracker.fastAnswers++;
  } else {
    tracker.fastConsecutive = 0;
  }
  tracker.questionTimes.push(responseTime);
}

/* ═════════════════════════════
   4. Session Summary
   ═════════════════════════════ */
const SUMMARY_LABELS = {
  ar: { title:'📊 ملخص الجلسة', questions:'الأسئلة', correct:'إجابات صحيحة', accuracy:'الدقة', avgTime:'متوسط الوقت', bestStreak:'أفضل تتابع', badges:'شارات',
    msgPerfect:'أداء مثالي! 🏆', msgGreat:'أداء رائع! 🌟', msgGood:'أداء جيد! 💪', msgKeep:'لا تيأس! 🔥' },
  en: { title:'📊 Session Summary', questions:'Questions', correct:'Correct', accuracy:'Accuracy', avgTime:'Avg Time', bestStreak:'Best Streak', badges:'Badges',
    msgPerfect:'Perfect! 🏆', msgGreat:'Amazing! 🌟', msgGood:'Good going! 💪', msgKeep:'Keep trying! 🔥' },
  pt: { title:'📊 Resumo da Sessão', questions:'Questões', correct:'Corretas', accuracy:'Precisão', avgTime:'Tempo Médio', bestStreak:'Melhor Sequência', badges:'Distintivos',
    msgPerfect:'Perfeito! 🏆', msgGreat:'Incrível! 🌟', msgGood:'Bom trabalho! 💪', msgKeep:'Continue! 🔥' },
};

export function getSessionSummary(session) {
  const lang = LANG === 'ar' ? 'ar' : LANG === 'pt' ? 'pt' : 'en';
  const L = SUMMARY_LABELS[lang];
  const acc = session.totalQuestions > 0 ? Math.round((session.totalCorrect / session.totalQuestions) * 100) : 0;
  const avg = avgTime(session);

  let message;
  if (acc === 100) message = L.msgPerfect;
  else if (acc >= 80) message = L.msgGreat;
  else if (acc >= 50) message = L.msgGood;
  else message = L.msgKeep;

  return {
    title: L.title,
    stats: [
      { label: L.questions, value: session.totalQuestions },
      { label: L.correct, value: session.totalCorrect },
      { label: L.accuracy, value: acc + '%' },
      { label: L.avgTime, value: avg.toFixed(1) + 's' },
      { label: L.bestStreak, value: session.maxConsecutive || 0 },
      { label: L.badges, value: (session._earnedBadges || []).length },
    ],
    message,
  };
}

/* ═════════════════════════════
   5. Milestones
   ═════════════════════════════ */
const MILESTONES = [
  { type:'totalStars', threshold:10 }, { type:'totalStars', threshold:50 },
  { type:'totalStars', threshold:100 }, { type:'totalStars', threshold:200 },
  { type:'levelsCleared', threshold:10 }, { type:'levelsCleared', threshold:25 },
  { type:'levelsCleared', threshold:50 }, { type:'levelsCleared', threshold:100 },
];

const MILESTONE_TEXT = {
  ar: {
    totalStars: { 10:'جمعت 10 نجوم! ⭐', 50:'50 نجمة! 🌟', 100:'100 نجمة! 💫', 200:'200 نجمة! 👑' },
    levelsCleared: { 10:'أكملت 10 مستويات! 🎯', 25:'25 مستوى! 🚀', 50:'50 مستوى! 🐉', 100:'100 مستوى! 🏆' },
  },
  en: {
    totalStars: { 10:'10 stars! ⭐', 50:'50 stars! 🌟', 100:'100 stars! 💫', 200:'200 stars! 👑' },
    levelsCleared: { 10:'10 levels! 🎯', 25:'25 levels! 🚀', 50:'50 levels! 🐉', 100:'100 levels! 🏆' },
  },
  pt: {
    totalStars: { 10:'10 estrelas! ⭐', 50:'50 estrelas! 🌟', 100:'100 estrelas! 💫', 200:'200 estrelas! 👑' },
    levelsCleared: { 10:'10 níveis! 🎯', 25:'25 níveis! 🚀', 50:'50 níveis! 🐉', 100:'100 níveis! 🏆' },
  },
};

export function getMilestoneMessage(current, previous) {
  const lang = LANG === 'ar' ? 'ar' : LANG === 'pt' ? 'pt' : 'en';
  const texts = MILESTONE_TEXT[lang];
  for (const m of MILESTONES) {
    const cur = current[m.type] || 0;
    const prev = previous[m.type] || 0;
    if (cur >= m.threshold && prev < m.threshold) {
      const txt = texts[m.type]?.[m.threshold];
      if (txt) return txt;
    }
  }
  return null;
}

/* ═════════════════════════════
   6. Comeback Messages
   ═════════════════════════════ */
const COMEBACK = {
  ar: { short:'مرحباً بعودتك! 🎮', medium:'اشتقنا لك! 🧮', long:'عدت أخيراً! المملكة بحاجة لبطلها! 👑' },
  en: { short:'Welcome back! 🎮', medium:'We missed you! 🧮', long:'You\'re back! The kingdom needs its hero! 👑' },
  pt: { short:'Bem-vindo de volta! 🎮', medium:'Sentimos sua falta! 🧮', long:'Voltou! O reino precisa do herói! 👑' },
};

export function getComebackMessage(hoursSinceLastPlay) {
  const lang = LANG === 'ar' ? 'ar' : LANG === 'pt' ? 'pt' : 'en';
  const c = COMEBACK[lang];
  if (hoursSinceLastPlay > 72) return c.long;
  if (hoursSinceLastPlay > 24) return c.medium;
  if (hoursSinceLastPlay > 4) return c.short;
  return null;
}

/* ═════════════════════════════
   7. Persistent Badge Storage
   ═════════════════════════════ */
const BADGES_KEY = 'catk_badges';

export function loadBadges() {
  try {
    const raw = localStorage.getItem(BADGES_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return { earned: [], history: [] };
}

export function saveBadges(data) {
  try { localStorage.setItem(BADGES_KEY, JSON.stringify(data)); } catch(e) {}
}

export function recordBadges(newBadges) {
  const data = loadBadges();
  for (const b of newBadges) {
    if (!data.earned.includes(b.id)) {
      data.earned.push(b.id);
      data.history.push({ id: b.id, date: new Date().toISOString() });
    }
  }
  saveBadges(data);
  return data;
}

export function getAllBadgesDefs() {
  const lang = LANG === 'ar' ? 'ar' : LANG === 'pt' ? 'pt' : 'en';
  const data = loadBadges();
  return MICRO_BADGES.map(b => ({
    id: b.id,
    icon: b.icon,
    label: b.text[lang],
    earned: data.earned.includes(b.id),
  }));
}
