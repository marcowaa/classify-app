/**
 * Memory Kingdom — engagement.js
 * Micro-badges, streak messages, near-miss detection,
 * session summary, milestones, comeback messages
 * All in 3 languages (ar/en/pt)
 *
 * Exports: checkMicroBadges(stats), getNearMissMessage(), getStreakMessage(streak),
 *          getSessionSummary(session), getMilestoneMessage(current, previous), getComebackMessage(hours)
 */

import { LANG } from './config.js';

const lang = () => LANG === 'ar' ? 'ar' : LANG === 'pt' ? 'pt' : 'en';

// ===== 12 MICRO-BADGES =====
const MICRO_BADGES = [
  {
    id: 'perfect_memory',
    icon: '🏆',
    text: { ar: 'ذاكرة مثالية', en: 'Perfect Memory', pt: 'Memória Perfeita' },
    condition: (s) => s.mismatches === 0 && s.pairsMatched >= 3,
  },
  {
    id: 'speed_match',
    icon: '⚡',
    text: { ar: 'مطابقة خاطفة', en: 'Speed Match', pt: 'Combinação Relâmpago' },
    condition: (s) => s.totalTimeSec > 0 && s.totalTimeSec <= 30 && s.pairsMatched >= 4,
  },
  {
    id: 'combo_master',
    icon: '🔥',
    text: { ar: 'خبير التتابع', en: 'Combo Master', pt: 'Mestre do Combo' },
    condition: (s) => (s.maxCombo || 0) >= 5,
  },
  {
    id: 'mechanic_pro',
    icon: '🌀',
    text: { ar: 'محترف الآلية', en: 'Mechanic Pro', pt: 'Profissional Mecânico' },
    condition: (s) => s.advancedMechanic === true,
  },
  {
    id: 'boss_conqueror',
    icon: '👑',
    text: { ar: 'قاهر الزعماء', en: 'Boss Conqueror', pt: 'Conquistador de Chefes' },
    condition: (s) => s.bossDefeated === true,
  },
  {
    id: 'power_user',
    icon: '⚡',
    text: { ar: 'مستخدم القدرات', en: 'Power User', pt: 'Usuário de Poderes' },
    condition: (s) => (s.powerUpsUsed || 0) >= 1,
  },
  {
    id: 'no_hint_hero',
    icon: '🧠',
    text: { ar: 'بطل بلا تلميح', en: 'No Hint Hero', pt: 'Herói Sem Dica' },
    condition: (s) => !s.usedHint && s.pairsMatched >= 4,
  },
  {
    id: 'efficient_player',
    icon: '🎯',
    text: { ar: 'لاعب كفء', en: 'Efficient Player', pt: 'Jogador Eficiente' },
    condition: (s) => s.pairsMatched > 0 && s.moves <= s.pairsMatched * 2 + 2,
  },
  {
    id: 'three_star',
    icon: '⭐',
    text: { ar: 'ثلاث نجوم', en: 'Three Stars', pt: 'Três Estrelas' },
    condition: (s) => s.stars === 3,
  },
  {
    id: 'explorer',
    icon: '🗺️',
    text: { ar: 'مستكشف', en: 'Explorer', pt: 'Explorador' },
    condition: (s) => (s.worldsVisited || 0) >= 3,
  },
  {
    id: 'coin_collector',
    icon: '💰',
    text: { ar: 'جامع العملات', en: 'Coin Collector', pt: 'Coletor de Moedas' },
    condition: (s) => (s.coinsEarned || 0) >= 50,
  },
  {
    id: 'daily_dedication',
    icon: '📅',
    text: { ar: 'مثابر يومي', en: 'Daily Dedication', pt: 'Dedicação Diária' },
    condition: (s) => (s.dailyStreak || 0) >= 3,
  },
];

export function checkMicroBadges(stats) {
  const l = lang();
  const earned = [];
  for (const b of MICRO_BADGES) {
    if (b.condition(stats)) {
      earned.push({ id: b.id, icon: b.icon, label: b.text[l] });
    }
  }
  return earned;
}

// ===== NEAR-MISS MESSAGES =====
const NEAR_MISS_MESSAGES = {
  ar: [
    'قريب جداً! حاول مرة أخرى 🔥',
    'كنت على وشك النجاح! لا تستسلم 💪',
    'بقيت خطوة واحدة! استمر 🌟',
    'تقريباً! ذاكرتك تتحسن ⭐',
    'لقد اقتربت كثيراً! مرة أخرى 🚀',
  ],
  en: [
    'So close! Try again 🔥',
    'You almost had it! Don\'t give up 💪',
    'One step away! Keep going 🌟',
    'Nearly there! Your memory is improving ⭐',
    'You were so close! One more try 🚀',
  ],
  pt: [
    'Tão perto! Tente de novo 🔥',
    'Quase conseguiu! Não desista 💪',
    'Faltou um passo! Continue 🌟',
    'Quase lá! Sua memória está melhorando ⭐',
    'Estava tão perto! Mais uma vez 🚀',
  ],
};

export function getNearMissMessage() {
  const l = lang();
  const msgs = NEAR_MISS_MESSAGES[l];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

// ===== STREAK MESSAGES =====
const STREAK_MESSAGES = {
  ar: { 2: 'ممتاز! 🔥', 3: 'رائع! 💪', 5: 'مذهل! ⚡', 7: 'عبقري الذاكرة! 🧠', 10: 'أسطوري! 👑' },
  en: { 2: 'Nice! 🔥', 3: 'Amazing! 💪', 5: 'Incredible! ⚡', 7: 'Memory Genius! 🧠', 10: 'Legendary! 👑' },
  pt: { 2: 'Legal! 🔥', 3: 'Incrível! 💪', 5: 'Fantástico! ⚡', 7: 'Gênio da Memória! 🧠', 10: 'Lendário! 👑' },
};

export function getStreakMessage(streak) {
  const l = lang();
  const msgs = STREAK_MESSAGES[l];
  const thresholds = [10, 7, 5, 3, 2];
  for (const t of thresholds) {
    if (streak >= t) return msgs[t];
  }
  return '';
}

// ===== SESSION SUMMARY =====
const SESSION_LABELS = {
  ar: {
    title: '📊 ملخص الجلسة',
    levelsLabel: 'المستويات',
    starsLabel: 'النجوم',
    pairsLabel: 'الأزواج المطابقة',
    movesLabel: 'المحاولات',
    timeLabel: 'الوقت الإجمالي',
    comboLabel: 'أفضل تتابع',
    coinsLabel: 'عملات مكتسبة',
    badgesLabel: 'شارات',
    msgPerfect: 'أداء خارق! ذاكرتك لا تُقهر! 🏆',
    msgGreat: 'رائع! ذاكرتك تتحسن بشكل ملحوظ! 🌟',
    msgGood: 'جيد! استمر بالتدريب لتصبح بطلاً! 💪',
    msgKeepGoing: 'لا تيأس! كل محاولة تقوي دماغك! 🔥',
  },
  en: {
    title: '📊 Session Summary',
    levelsLabel: 'Levels',
    starsLabel: 'Stars',
    pairsLabel: 'Pairs Matched',
    movesLabel: 'Total Moves',
    timeLabel: 'Total Time',
    comboLabel: 'Best Combo',
    coinsLabel: 'Coins Earned',
    badgesLabel: 'Badges',
    msgPerfect: 'Superhuman performance! Unbeatable memory! 🏆',
    msgGreat: 'Amazing! Your memory is noticeably improving! 🌟',
    msgGood: 'Good job! Keep practicing to become a champion! 💪',
    msgKeepGoing: 'Don\'t give up! Every try strengthens your brain! 🔥',
  },
  pt: {
    title: '📊 Resumo da Sessão',
    levelsLabel: 'Níveis',
    starsLabel: 'Estrelas',
    pairsLabel: 'Pares Combinados',
    movesLabel: 'Jogadas Totais',
    timeLabel: 'Tempo Total',
    comboLabel: 'Melhor Combo',
    coinsLabel: 'Moedas Ganhas',
    badgesLabel: 'Distintivos',
    msgPerfect: 'Performance sobre-humana! Memória imbatível! 🏆',
    msgGreat: 'Incrível! Sua memória está melhorando visivelmente! 🌟',
    msgGood: 'Bom trabalho! Continue praticando para ser campeão! 💪',
    msgKeepGoing: 'Não desista! Cada tentativa fortalece seu cérebro! 🔥',
  },
};

export function getSessionSummary(session) {
  const l = lang();
  const L = SESSION_LABELS[l];
  const accuracy = session.moves > 0
    ? Math.round((session.pairsMatched * 2 / session.moves) * 100) : 0;

  let message;
  if (accuracy >= 95 && session.stars >= 3) message = L.msgPerfect;
  else if (accuracy >= 70) message = L.msgGreat;
  else if (accuracy >= 40) message = L.msgGood;
  else message = L.msgKeepGoing;

  const totalSec = session.totalTimeSec || 0;
  const timeStr = totalSec >= 60
    ? Math.floor(totalSec / 60) + 'm ' + (totalSec % 60) + 's'
    : totalSec + 's';

  return {
    title: L.title,
    stats: [
      { label: L.levelsLabel, value: session.levelsPlayed || 1 },
      { label: L.starsLabel, value: session.stars || 0 },
      { label: L.pairsLabel, value: session.pairsMatched || 0 },
      { label: L.movesLabel, value: session.moves || 0 },
      { label: L.timeLabel, value: timeStr },
      { label: L.comboLabel, value: session.maxCombo || 0 },
      { label: L.coinsLabel, value: session.coinsEarned || 0 },
      { label: L.badgesLabel, value: (session._earnedBadges || []).length },
    ],
    message,
  };
}

// ===== MILESTONES =====
const MILESTONES = [
  { type: 'totalStars',    threshold: 10   },
  { type: 'totalStars',    threshold: 30   },
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
    totalStars:    { 10:'جمعت 10 نجوم! ⭐', 30:'30 نجمة! مذهل! 🌟', 100:'100 نجمة! أسطوري! 💫', 200:'200 نجمة! خارق! 🏅', 300:'300 نجمة! ملك الذاكرة! 👑' },
    levelsCleared: { 10:'أكملت 10 مستويات! 🎯', 25:'25 مستوى! مغامر حقيقي! 🚀', 50:'50 مستوى! عبقري ذاكرة! 🧠', 100:'100 مستوى! أسطورة! 🏆' },
    coins:         { 1000:'1000 عملة! 💰', 5000:'5000 عملة! ثروة! 🤑' },
  },
  en: {
    totalStars:    { 10:'Collected 10 stars! ⭐', 30:'30 stars! Amazing! 🌟', 100:'100 stars! Legendary! 💫', 200:'200 stars! Superhero! 🏅', 300:'300 stars! Memory King! 👑' },
    levelsCleared: { 10:'10 levels cleared! 🎯', 25:'25 levels! True adventurer! 🚀', 50:'50 levels! Memory genius! 🧠', 100:'100 levels! Legend! 🏆' },
    coins:         { 1000:'1000 coins! 💰', 5000:'5000 coins! Rich! 🤑' },
  },
  pt: {
    totalStars:    { 10:'10 estrelas! ⭐', 30:'30 estrelas! Incrível! 🌟', 100:'100 estrelas! Lendário! 💫', 200:'200 estrelas! Super-herói! 🏅', 300:'300 estrelas! Rei da Memória! 👑' },
    levelsCleared: { 10:'10 níveis! 🎯', 25:'25 níveis! Aventureiro! 🚀', 50:'50 níveis! Gênio da memória! 🧠', 100:'100 níveis! Lenda! 🏆' },
    coins:         { 1000:'1000 moedas! 💰', 5000:'5000 moedas! Rico! 🤑' },
  },
};

export function getMilestoneMessage(current, previous) {
  const l = lang();
  const texts = MILESTONE_TEXT[l];
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
    short:  'مرحباً بعودتك! هيا نتحدى الذاكرة! 🎮',
    medium: 'اشتقنا لك! مملكة الذاكرة بانتظارك! 🧠',
    long:   'عدت أخيراً! المملكة بحاجة لبطلها! 👑',
  },
  en: {
    short:  'Welcome back! Let\'s challenge your memory! 🎮',
    medium: 'We missed you! Memory Kingdom awaits! 🧠',
    long:   'You\'re finally back! The kingdom needs its champion! 👑',
  },
  pt: {
    short:  'Bem-vindo de volta! Vamos desafiar a memória! 🎮',
    medium: 'Sentimos falta! Reino da Memória espera! 🧠',
    long:   'Finalmente voltou! O reino precisa do campeão! 👑',
  },
};

export function getComebackMessage(hoursSinceLastPlay) {
  const l = lang();
  const c = COMEBACK[l];
  if (hoursSinceLastPlay > 72) return c.long;
  if (hoursSinceLastPlay > 24) return c.medium;
  if (hoursSinceLastPlay > 4) return c.short;
  return null;
}
