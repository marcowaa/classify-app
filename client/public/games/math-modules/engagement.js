// ===== Emoji Kingdom — Engagement Module =====
// Emotion Feedback, Near Miss, Micro-Badges, Session Summary, Milestones, Comeback

import { LANG, t } from './config.js';

// ===== Emotion-Driven Feedback =====
export function getStreakMessage(streak) {
  if (streak >= 10) return t('streak10');
  if (streak >= 8)  return t('streak8');
  if (streak >= 5)  return t('streak5');
  if (streak >= 3)  return t('streak3');
  return '';
}

export function getWrongAfterStreakMessage(prevStreak) {
  if (prevStreak >= 3) return t('wrongAfterStreak');
  return '';
}

export function getBossLevelMessage() {
  return t('bossMsg');
}

// ===== Near Miss System =====
const NEAR_MISS_MESSAGES = {
  ar: [
    'قريب جداً! حاول مرة أخرى 🔥',
    'كان بإمكانك! لا تستسلم 💪',
    'بقيت خطوة واحدة! استمر 🌟',
    'تقريباً! أنت قادر على ذلك ⭐',
    'لقد اقتربت كثيراً! مرة أخرى 🚀',
  ],
  en: [
    'So close! Try again 🔥',
    'You almost had it! Don\'t give up 💪',
    'One step away! Keep going 🌟',
    'Nearly there! You can do it ⭐',
    'You were so close! One more try 🚀',
  ],
  pt: [
    'Tão perto! Tente de novo 🔥',
    'Quase conseguiu! Não desista 💪',
    'Faltou um passo! Continue 🌟',
    'Quase lá! Você consegue ⭐',
    'Estava tão perto! Mais uma vez 🚀',
  ],
};

export function checkNearMiss(correctCount, requiredForStar, totalQuestions, timeLeft, isLastQuestion) {
  if (correctCount === requiredForStar - 1) return { isNearMiss: true, type: 'oneAway' };
  if (isLastQuestion && timeLeft <= 0 && correctCount >= requiredForStar - 1) return { isNearMiss: true, type: 'timeUp' };
  return { isNearMiss: false, type: null };
}

export function getNearMissMessage() {
  const lang = LANG === 'ar' ? 'ar' : LANG === 'pt' ? 'pt' : 'en';
  const msgs = NEAR_MISS_MESSAGES[lang];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

// ===== Micro-Challenges (Mini Badges) — 12 badges =====
const MICRO_BADGES = [
  {
    id: 'fast',
    icon: '⚡',
    text: { ar: 'سريع البرق', en: 'Lightning Fast', pt: 'Raio Veloz' },
    condition: (s) => s.fastAnswers >= 3,
  },
  {
    id: 'nohint',
    icon: '🧠',
    text: { ar: 'بلا تلميح', en: 'No Hints Used', pt: 'Sem Dicas' },
    condition: (s) => !s.usedHint && s.totalQuestions >= 5,
  },
  {
    id: 'perfect',
    icon: '✨',
    text: { ar: 'مثالي', en: 'Perfect', pt: 'Perfeito' },
    condition: (s) => s.perfectAnswers >= 5,
  },
  {
    id: 'combo_king',
    icon: '👑',
    text: { ar: 'ملك التتابع', en: 'Combo King', pt: 'Rei do Combo' },
    condition: (s) => s.maxConsecutive >= 5,
  },
  {
    id: 'boss_slayer',
    icon: '⚔️',
    text: { ar: 'صائد الزعماء', en: 'Boss Slayer', pt: 'Caçador de Chefes' },
    condition: (s) => s.bossDefeated === true,
  },
  {
    id: 'speed_demon',
    icon: '🏎️',
    text: { ar: 'شيطان السرعة', en: 'Speed Demon', pt: 'Demônio da Velocidade' },
    condition: (s) => s.totalQuestions >= 5 && getAvgTime(s) < 3,
  },
  {
    id: 'zero_penalty',
    icon: '🛡️',
    text: { ar: 'بدون أخطاء', en: 'Zero Errors', pt: 'Zero Erros' },
    condition: (s) => s.totalCorrect === s.totalQuestions && s.totalQuestions >= 5,
  },
  {
    id: 'world_explorer',
    icon: '🗺️',
    text: { ar: 'مستكشف', en: 'World Explorer', pt: 'Explorador' },
    condition: (s) => (s.questionTypesUsed || 0) >= 3,
  },
  {
    id: 'math_marathon',
    icon: '🏃',
    text: { ar: 'ماراثون الرياضيات', en: 'Math Marathon', pt: 'Maratona Matemática' },
    condition: (s) => s.totalQuestions >= 10,
  },
  {
    id: 'coin_harvest',
    icon: '💰',
    text: { ar: 'حاصد العملات', en: 'Coin Harvest', pt: 'Colheita de Moedas' },
    condition: (s) => (s.coinsEarned || 0) >= 50,
  },
  {
    id: 'streak_master',
    icon: '🔥',
    text: { ar: 'خبير السلاسل', en: 'Streak Master', pt: 'Mestre da Sequência' },
    condition: (s) => (s.dailyStreak || 0) >= 3,
  },
  {
    id: 'time_master',
    icon: '⏱️',
    text: { ar: 'سيد الوقت', en: 'Time Master', pt: 'Mestre do Tempo' },
    condition: (s) => s.timeRemainPct >= 0.5,
  },
];

function getAvgTime(s) {
  if (!s.questionTimes || s.questionTimes.length === 0) return 10;
  return s.questionTimes.reduce((a, b) => a + b, 0) / s.questionTimes.length;
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

// Tracker for a single level play
export function createChallengeTracker() {
  return {
    fastAnswers: 0,
    fastConsecutive: 0,
    maxConsecutive: 0,
    perfectAnswers: 0,
    usedHint: false,
    totalCorrect: 0,
    totalQuestions: 0,
    questionTimes: [],
    questionTypesUsed: 0,
    coinsEarned: 0,
    bossDefeated: false,
    dailyStreak: 0,
    timeRemainPct: 0,
    _typeSet: new Set(),
  };
}

export function trackAnswer(tracker, correct, responseTime, usedHintThisQ, questionType) {
  tracker.totalQuestions++;
  if (questionType) {
    tracker._typeSet.add(questionType);
    tracker.questionTypesUsed = tracker._typeSet.size;
  }
  if (correct) {
    tracker.totalCorrect++;
    tracker.fastConsecutive++;
    if (tracker.fastConsecutive > tracker.maxConsecutive) {
      tracker.maxConsecutive = tracker.fastConsecutive;
    }
    if (responseTime < 5) {
      tracker.fastAnswers++;
    }
    if (responseTime < 3) tracker.perfectAnswers++;
  } else {
    tracker.fastConsecutive = 0;
  }
  if (usedHintThisQ) tracker.usedHint = true;
  tracker.questionTimes.push(responseTime);
}

export function evaluateBadges(tracker) {
  return checkMicroBadges(tracker);
}

export function saveBadges(progress, newBadges) {
  if (!progress.badges) progress.badges = [];
  for (const b of newBadges) {
    if (!progress.badges.includes(b.id)) {
      progress.badges.push(b.id);
    }
  }
}

export function getAvgResponseTime(tracker) {
  if (tracker.questionTimes.length === 0) return 10;
  return tracker.questionTimes.reduce((a, b) => a + b, 0) / tracker.questionTimes.length;
}

// ===== SESSION SUMMARY =====
const SESSION_LABELS = {
  ar: {
    title: '📊 ملخص الجلسة',
    questionsLabel: 'الأسئلة',
    correctLabel: 'إجابات صحيحة',
    accuracyLabel: 'الدقة',
    avgTimeLabel: 'متوسط الوقت',
    bestStreakLabel: 'أفضل تتابع',
    coinsLabel: 'عملات مكتسبة',
    badgesLabel: 'شارات',
    msgPerfect: 'أداء مثالي! أنت عبقري رياضيات! 🏆',
    msgGreat: 'أداء رائع! استمر بهذا المستوى! 🌟',
    msgGood: 'أداء جيد! تدرب أكثر لتصبح أفضل! 💪',
    msgKeepGoing: 'لا تيأس! كل محاولة تجعلك أقوى! 🔥',
  },
  en: {
    title: '📊 Session Summary',
    questionsLabel: 'Questions',
    correctLabel: 'Correct Answers',
    accuracyLabel: 'Accuracy',
    avgTimeLabel: 'Avg Response',
    bestStreakLabel: 'Best Streak',
    coinsLabel: 'Coins Earned',
    badgesLabel: 'Badges',
    msgPerfect: 'Perfect performance! You are a math genius! 🏆',
    msgGreat: 'Amazing work! Keep up this level! 🌟',
    msgGood: 'Good going! Practice more to get better! 💪',
    msgKeepGoing: 'Don\'t give up! Every try makes you stronger! 🔥',
  },
  pt: {
    title: '📊 Resumo da Sessão',
    questionsLabel: 'Questões',
    correctLabel: 'Respostas Certas',
    accuracyLabel: 'Precisão',
    avgTimeLabel: 'Tempo Médio',
    bestStreakLabel: 'Melhor Sequência',
    coinsLabel: 'Moedas Ganhas',
    badgesLabel: 'Distintivos',
    msgPerfect: 'Performance perfeita! Você é um gênio! 🏆',
    msgGreat: 'Trabalho incrível! Continue assim! 🌟',
    msgGood: 'Bom trabalho! Pratique mais para melhorar! 💪',
    msgKeepGoing: 'Não desista! Cada tentativa te torna mais forte! 🔥',
  },
};

export function getSessionSummary(session) {
  const lang = LANG === 'ar' ? 'ar' : LANG === 'pt' ? 'pt' : 'en';
  const L = SESSION_LABELS[lang];
  const accuracy = session.totalQuestions > 0
    ? Math.round((session.totalCorrect / session.totalQuestions) * 100) : 0;
  const avgTime = getAvgTime(session);

  let message;
  if (accuracy === 100) message = L.msgPerfect;
  else if (accuracy >= 80) message = L.msgGreat;
  else if (accuracy >= 50) message = L.msgGood;
  else message = L.msgKeepGoing;

  return {
    title: L.title,
    stats: [
      { label: L.questionsLabel, value: session.totalQuestions },
      { label: L.correctLabel, value: session.totalCorrect },
      { label: L.accuracyLabel, value: accuracy + '%' },
      { label: L.avgTimeLabel, value: avgTime.toFixed(1) + 's' },
      { label: L.bestStreakLabel, value: session.maxConsecutive || 0 },
      { label: L.coinsLabel, value: session.coinsEarned || 0 },
      { label: L.badgesLabel, value: (session._earnedBadges || []).length },
    ],
    message,
  };
}

// ===== MILESTONES =====
const MILESTONES = [
  { type: 'totalStars',    threshold: 10   },
  { type: 'totalStars',    threshold: 50   },
  { type: 'totalStars',    threshold: 100  },
  { type: 'totalStars',    threshold: 200  },
  { type: 'totalStars',    threshold: 300  },
  { type: 'levelsCleared', threshold: 10   },
  { type: 'levelsCleared', threshold: 25   },
  { type: 'levelsCleared', threshold: 50   },
  { type: 'levelsCleared', threshold: 100  },
  { type: 'coins',         threshold: 1000 },
  { type: 'coins',         threshold: 5000 },
];

const MILESTONE_TEXT = {
  ar: {
    totalStars:    { 10:'جمعت 10 نجوم! ⭐', 50:'50 نجمة! مذهل! 🌟', 100:'100 نجمة! أسطوري! 💫', 200:'200 نجمة! خارق! 🏅', 300:'300 نجمة! ملك النجوم! 👑' },
    levelsCleared: { 10:'أكملت 10 مستويات! 🎯', 25:'25 مستوى! مغامر حقيقي! 🚀', 50:'50 مستوى! تنين الرياضيات! 🐉', 100:'100 مستوى! أسطورة! 🏆' },
    coins:         { 1000:'1000 عملة! 💰', 5000:'5000 عملة! ثروة! 🤑' },
  },
  en: {
    totalStars:    { 10:'Collected 10 stars! ⭐', 50:'50 stars! Amazing! 🌟', 100:'100 stars! Legendary! 💫', 200:'200 stars! Superhero! 🏅', 300:'300 stars! Star King! 👑' },
    levelsCleared: { 10:'10 levels cleared! 🎯', 25:'25 levels! True adventurer! 🚀', 50:'50 levels! Math Dragon! 🐉', 100:'100 levels! Legend! 🏆' },
    coins:         { 1000:'1000 coins! 💰', 5000:'5000 coins! Rich! 🤑' },
  },
  pt: {
    totalStars:    { 10:'10 estrelas! ⭐', 50:'50 estrelas! Incrível! 🌟', 100:'100 estrelas! Lendário! 💫', 200:'200 estrelas! Super-herói! 🏅', 300:'300 estrelas! Rei! 👑' },
    levelsCleared: { 10:'10 níveis! 🎯', 25:'25 níveis! Aventureiro! 🚀', 50:'50 níveis! Dragão! 🐉', 100:'100 níveis! Lenda! 🏆' },
    coins:         { 1000:'1000 moedas! 💰', 5000:'5000 moedas! Rico! 🤑' },
  },
};

export function getMilestoneMessage(current, previous) {
  const lang = LANG === 'ar' ? 'ar' : LANG === 'pt' ? 'pt' : 'en';
  const texts = MILESTONE_TEXT[lang];
  for (const m of MILESTONES) {
    const cur = current[m.type] || 0;
    const prev = previous[m.type] || 0;
    if (cur >= m.threshold && prev < m.threshold) {
      const t = texts[m.type]?.[m.threshold];
      if (t) return t;
    }
  }
  return null;
}

// ===== COMEBACK MESSAGES =====
const COMEBACK = {
  ar: {
    short:  'مرحباً بعودتك! هيا نكمل المغامرة! 🎮',
    medium: 'اشتقنا لك! الرياضيات بانتظارك! 🧮',
    long:   'عدت أخيراً! مملكة الأرقام بحاجة لبطلها! 👑',
  },
  en: {
    short:  'Welcome back! Let\'s continue the adventure! 🎮',
    medium: 'We missed you! Math awaits! 🧮',
    long:   'You\'re finally back! The kingdom needs its hero! 👑',
  },
  pt: {
    short:  'Bem-vindo de volta! Vamos continuar! 🎮',
    medium: 'Sentimos sua falta! A matemática espera! 🧮',
    long:   'Finalmente voltou! O reino precisa do herói! 👑',
  },
};

export function getComebackMessage(hoursSinceLastPlay) {
  const lang = LANG === 'ar' ? 'ar' : LANG === 'pt' ? 'pt' : 'en';
  const c = COMEBACK[lang];
  if (hoursSinceLastPlay > 72) return c.long;
  if (hoursSinceLastPlay > 24) return c.medium;
  if (hoursSinceLastPlay > 4) return c.short;
  return null;
}
