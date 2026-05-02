/* ═══════════════════════════════════════════════════════════════
   Ice Kingdom Academy — Engagement System
   Streaks, micro-badges, session summaries, milestones
   Standard 6 exports + tracker for platform integration
   ═══════════════════════════════════════════════════════════════ */

import { t, LANG } from './i18n.js';

/* ─── Badges ──────────────────────── */
const BADGES = [
  { id: 'first_step',    emoji: '🐾', check: s => s.totalAnswered >= 1 },
  { id: 'ice_breaker',   emoji: '🧊', check: s => s.streak >= 3 },
  { id: 'snow_explorer', emoji: '❄️', check: s => s.totalCorrect >= 10 },
  { id: 'frost_fighter', emoji: '⚔️', check: s => s.streak >= 5 },
  { id: 'penguin_friend',emoji: '🐧', check: s => s.totalAnswered >= 25 },
  { id: 'glacier_master',emoji: '🏔️', check: s => s.streak >= 7 },
  { id: 'polar_hero',    emoji: '🦸', check: s => s.totalCorrect >= 50 },
  { id: 'ice_scholar',   emoji: '📚', check: s => s.perfectLevels >= 1 },
  { id: 'blizzard_boss', emoji: '🌨️', check: s => s.bossesDefeated >= 1 },
  { id: 'aurora_legend', emoji: '🌌', check: s => s.worldsCompleted >= 3 },
  { id: 'crystal_king',  emoji: '💎', check: s => s.totalCorrect >= 100 },
  { id: 'ice_champion',  emoji: '🏆', check: s => s.worldsCompleted >= 10 },
];

const BADGE_NAMES = {
  first_step:     () => LANG === 'en' ? 'First Step'     : LANG === 'pt' ? 'Primeiro Passo'  : 'الخطوة الأولى',
  ice_breaker:    () => LANG === 'en' ? 'Ice Breaker'    : LANG === 'pt' ? 'Quebra-gelo'      : 'كاسر الجليد',
  snow_explorer:  () => LANG === 'en' ? 'Snow Explorer'  : LANG === 'pt' ? 'Explorador de Neve': 'مستكشف الثلج',
  frost_fighter:  () => LANG === 'en' ? 'Frost Fighter'  : LANG === 'pt' ? 'Lutador de Gelo'  : 'محارب الصقيع',
  penguin_friend: () => LANG === 'en' ? 'Penguin Friend' : LANG === 'pt' ? 'Amigo Pinguim'    : 'صديق البطريق',
  glacier_master: () => LANG === 'en' ? 'Glacier Master' : LANG === 'pt' ? 'Mestre Glacial'   : 'سيد الجليد',
  polar_hero:     () => LANG === 'en' ? 'Polar Hero'     : LANG === 'pt' ? 'Herói Polar'      : 'بطل القطب',
  ice_scholar:    () => LANG === 'en' ? 'Ice Scholar'    : LANG === 'pt' ? 'Estudioso do Gelo' : 'عالم الجليد',
  blizzard_boss:  () => LANG === 'en' ? 'Blizzard Boss'  : LANG === 'pt' ? 'Chefe da Nevasca'  : 'رئيس العاصفة',
  aurora_legend:  () => LANG === 'en' ? 'Aurora Legend'   : LANG === 'pt' ? 'Lenda da Aurora'   : 'أسطورة الشفق',
  crystal_king:   () => LANG === 'en' ? 'Crystal King'    : LANG === 'pt' ? 'Rei de Cristal'    : 'ملك الكريستال',
  ice_champion:   () => LANG === 'en' ? 'Ice Champion'    : LANG === 'pt' ? 'Campeão do Gelo'   : 'بطل الجليد',
};

/* ─── Tracker ──────────────────────── */
export function createTracker() {
  return {
    totalAnswered: 0,
    totalCorrect: 0,
    streak: 0,
    maxStreak: 0,
    perfectLevels: 0,
    bossesDefeated: 0,
    worldsCompleted: 0,
    sessionCorrect: 0,
    sessionTotal: 0,
    sessionStart: Date.now(),
    history: [],
    earnedBadges: [],
  };
}

export function trackAnswer(tracker, correct, questionData) {
  tracker.totalAnswered++;
  tracker.sessionTotal++;
  if (correct) {
    tracker.totalCorrect++;
    tracker.sessionCorrect++;
    tracker.streak++;
    if (tracker.streak > tracker.maxStreak) tracker.maxStreak = tracker.streak;
  } else {
    tracker.streak = 0;
  }
  tracker.history.push({ correct, time: Date.now(), q: questionData?.q || '' });
  return tracker;
}

/* ─── Standard 6 Exports ──────────── */

/** 1. Streak encouragement */
export function getStreakMessage(tracker) {
  const s = tracker.streak;
  if (s >= 10) return t.streak10 || (LANG === 'en' ? '🔥 UNSTOPPABLE! 10 in a row!' : LANG === 'pt' ? '🔥 IMPARÁVEL! 10 seguidos!' : '🔥 لا يُوقَف! ١٠ متتالية!');
  if (s >= 7)  return t.streak7  || (LANG === 'en' ? '🌟 AMAZING! 7 streak!'        : LANG === 'pt' ? '🌟 INCRÍVEL! 7 seguidos!'   : '🌟 مذهل! ٧ متتالية!');
  if (s >= 5)  return t.streak5  || (LANG === 'en' ? '❄️ ICE COLD! 5 streak!'       : LANG === 'pt' ? '❄️ GELADO! 5 seguidos!'     : '❄️ جليدي! ٥ متتالية!');
  if (s >= 3)  return t.streak3  || (LANG === 'en' ? '🐧 Nice! 3 in a row!'         : LANG === 'pt' ? '🐧 Legal! 3 seguidos!'      : '🐧 أحسنت! ٣ متتالية!');
  if (s >= 2)  return t.streak2  || (LANG === 'en' ? '⭐ Keep going!'               : LANG === 'pt' ? '⭐ Continue!'               : '⭐ استمر!');
  return '';
}

/** 2. Near-miss encouragement */
export function getNearMissMessage(tracker) {
  if (tracker.streak === 0 && tracker.history.length > 0) {
    const last = tracker.history[tracker.history.length - 1];
    if (!last.correct) {
      const msgs = LANG === 'en'
        ? ['Almost! Try again! 💪', 'So close! You got this! 🧊', 'Don\'t give up! ❄️']
        : LANG === 'pt'
        ? ['Quase! Tente de novo! 💪', 'Tão perto! Você consegue! 🧊', 'Não desista! ❄️']
        : ['قريب جداً! حاول مرة أخرى! 💪', 'كدت تصيب! أنت تقدر! 🧊', 'لا تستسلم! ❄️'];
      return msgs[Math.floor(Math.random() * msgs.length)];
    }
  }
  return '';
}

/** 3. Check and award micro-badges */
export function checkMicroBadges(tracker) {
  const newBadges = [];
  for (const badge of BADGES) {
    if (!tracker.earnedBadges.includes(badge.id) && badge.check(tracker)) {
      tracker.earnedBadges.push(badge.id);
      newBadges.push({
        id: badge.id,
        emoji: badge.emoji,
        name: BADGE_NAMES[badge.id]?.() || badge.id,
      });
    }
  }
  return newBadges;
}

/** 4. Session summary */
export function getSessionSummary(tracker) {
  const elapsed = Math.floor((Date.now() - tracker.sessionStart) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const accuracy = tracker.sessionTotal > 0 ? Math.round((tracker.sessionCorrect / tracker.sessionTotal) * 100) : 0;
  
  return {
    correct: tracker.sessionCorrect,
    total: tracker.sessionTotal,
    accuracy,
    time: `${mins}:${secs.toString().padStart(2, '0')}`,
    maxStreak: tracker.maxStreak,
    badges: tracker.earnedBadges.length,
    message: accuracy >= 90
      ? (LANG === 'en' ? '🏆 Outstanding!' : LANG === 'pt' ? '🏆 Excelente!' : '🏆 ممتاز!')
      : accuracy >= 70
      ? (LANG === 'en' ? '⭐ Great job!' : LANG === 'pt' ? '⭐ Bom trabalho!' : '⭐ عمل رائع!')
      : accuracy >= 50
      ? (LANG === 'en' ? '💪 Good effort!' : LANG === 'pt' ? '💪 Bom esforço!' : '💪 مجهود جيد!')
      : (LANG === 'en' ? '🐧 Keep practicing!' : LANG === 'pt' ? '🐧 Continue praticando!' : '🐧 واصل التدريب!'),
  };
}

/** 5. Milestone messages */
export function getMilestoneMessage(tracker) {
  const tc = tracker.totalCorrect;
  if (tc === 100) return LANG === 'en' ? '💎 100 correct answers! Crystal milestone!' : LANG === 'pt' ? '💎 100 respostas corretas!' : '💎 ١٠٠ إجابة صحيحة! إنجاز كريستالي!';
  if (tc === 50)  return LANG === 'en' ? '🏔️ 50 correct! Mountain climber!'         : LANG === 'pt' ? '🏔️ 50 corretas! Alpinista!'   : '🏔️ ٥٠ صحيحة! متسلق الجبال!';
  if (tc === 25)  return LANG === 'en' ? '❄️ 25 correct! Snow explorer!'             : LANG === 'pt' ? '❄️ 25 corretas! Explorador!'  : '❄️ ٢٥ صحيحة! مستكشف الثلج!';
  if (tc === 10)  return LANG === 'en' ? '🐧 10 correct! Great start!'               : LANG === 'pt' ? '🐧 10 corretas! Bom começo!'  : '🐧 ١٠ صحيحة! بداية رائعة!';
  return '';
}

/** 6. Comeback encouragement */
export function getComebackMessage(daysSinceLastPlay) {
  if (daysSinceLastPlay >= 7) {
    return LANG === 'en' ? '🐧 Your penguin missed you! Welcome back!'
      : LANG === 'pt' ? '🐧 Seu pinguim sentiu falta! Bem-vindo de volta!'
      : '🐧 بطريقك اشتاق لك! مرحباً بعودتك!';
  }
  if (daysSinceLastPlay >= 3) {
    return LANG === 'en' ? '❄️ The ice kingdom awaits! Let\'s explore!'
      : LANG === 'pt' ? '❄️ O reino do gelo espera! Vamos explorar!'
      : '❄️ مملكة الجليد بانتظارك! هيا نستكشف!';
  }
  if (daysSinceLastPlay >= 1) {
    return LANG === 'en' ? '🧊 A new day, a new adventure!'
      : LANG === 'pt' ? '🧊 Um novo dia, uma nova aventura!'
      : '🧊 يوم جديد ومغامرة جديدة!';
  }
  return '';
}
