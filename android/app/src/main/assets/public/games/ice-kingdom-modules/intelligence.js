/* ═══════════════════════════════════════════════════════════════
   Ice Kingdom Academy — Intelligence / DDA Module 🧠
   Dynamic Difficulty Adjustment with per-subject tracking
   EMA smoothing (α=0.2), skill levels, performance trends
   ═══════════════════════════════════════════════════════════════ */

const STORAGE_KEY = 'icek_intelligence';
const ALPHA = 0.2; // EMA smoothing factor

/* ─── Subjects matching worlds.js ─── */
const SUBJECTS = [
  'colors_shapes', 'animals_nature', 'weather_seasons', 'numbers',
  'addition', 'subtraction', 'geography', 'science', 'dinosaurs', 'mixed'
];

/* ─── Default DDA State ─── */
function defaultDDA() {
  const subjectStats = {};
  SUBJECTS.forEach(s => {
    subjectStats[s] = { performance: 0.5, gamesPlayed: 0, totalCorrect: 0, totalAnswered: 0, avgTimeSec: 0 };
  });
  return {
    subjectStats,
    overallPerformance: 0.5,
    history: [],          // last 20 results [{subject, performance, timestamp}]
    totalGames: 0,
  };
}

/* ─── Load / Save ─── */
export function loadDDA() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultDDA();
    const data = JSON.parse(raw);
    // Ensure all subjects exist (forward-compat)
    SUBJECTS.forEach(s => {
      if (!data.subjectStats[s]) {
        data.subjectStats[s] = { performance: 0.5, gamesPlayed: 0, totalCorrect: 0, totalAnswered: 0, avgTimeSec: 0 };
      }
    });
    if (!data.history) data.history = [];
    if (!data.totalGames) data.totalGames = 0;
    return data;
  } catch { return defaultDDA(); }
}

export function saveDDA(dda) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(dda)); } catch {}
}

/* ─── Update DDA after a level ─── */
export function updateDDA(dda, subject, passed, correct, total, timeUsedSec) {
  const ss = dda.subjectStats[subject] || dda.subjectStats.mixed;

  const accuracy = total > 0 ? correct / total : 0;
  const expectedTime = total * 12; // rough expected total time
  const speedFactor = expectedTime > 0 ? Math.min(1, 1 - (timeUsedSec / expectedTime) + 0.5) : 0.5;
  const sessionPerf = accuracy * 0.6 + speedFactor * 0.4;

  // EMA update
  ss.performance = ss.gamesPlayed === 0
    ? sessionPerf
    : ss.performance * (1 - ALPHA) + sessionPerf * ALPHA;

  ss.gamesPlayed++;
  ss.totalCorrect += correct;
  ss.totalAnswered += total;
  ss.avgTimeSec = ss.avgTimeSec === 0
    ? timeUsedSec
    : ss.avgTimeSec * 0.7 + timeUsedSec * 0.3;

  // Overall performance (weighted average of all played subjects)
  let totalWeight = 0, weightedSum = 0;
  SUBJECTS.forEach(s => {
    const st = dda.subjectStats[s];
    if (st.gamesPlayed > 0) {
      totalWeight += st.gamesPlayed;
      weightedSum += st.performance * st.gamesPlayed;
    }
  });
  dda.overallPerformance = totalWeight > 0 ? weightedSum / totalWeight : 0.5;

  // History (last 20)
  dda.history.push({ subject, performance: sessionPerf, timestamp: Date.now() });
  if (dda.history.length > 20) dda.history.shift();

  dda.totalGames++;
  saveDDA(dda);
  return dda;
}

/* ─── Get DDA Modifier for a subject ─── */
export function getDDAModifier(dda, subject) {
  const ss = dda.subjectStats[subject] || dda.subjectStats.mixed;
  const perf = ss.performance;

  if (ss.gamesPlayed < 2) {
    return { questionAdjust: 0, timeAdjust: 0, hintAvailable: false, difficultyLabel: 'normal' };
  }

  if (perf >= 0.85) {
    return { questionAdjust: 2, timeAdjust: -3, hintAvailable: false, difficultyLabel: 'hard' };
  }
  if (perf >= 0.7) {
    return { questionAdjust: 1, timeAdjust: -1, hintAvailable: false, difficultyLabel: 'normal' };
  }
  if (perf >= 0.5) {
    return { questionAdjust: 0, timeAdjust: 0, hintAvailable: true, difficultyLabel: 'normal' };
  }
  if (perf >= 0.35) {
    return { questionAdjust: -1, timeAdjust: 2, hintAvailable: true, difficultyLabel: 'easy' };
  }
  return { questionAdjust: -2, timeAdjust: 3, hintAvailable: true, difficultyLabel: 'easy' };
}

/* ─── Subject Strength Analysis ─── */
export function getSubjectStrength(dda) {
  return SUBJECTS
    .filter(s => dda.subjectStats[s].gamesPlayed > 0)
    .map(s => ({ subject: s, performance: dda.subjectStats[s].performance, games: dda.subjectStats[s].gamesPlayed }))
    .sort((a, b) => b.performance - a.performance);
}

export function getWeakestSubject(dda) {
  const played = getSubjectStrength(dda);
  return played.length > 0 ? played[played.length - 1] : null;
}

export function getStrongestSubject(dda) {
  const played = getSubjectStrength(dda);
  return played.length > 0 ? played[0] : null;
}

/* ─── Skill Level ─── */
export function getSkillLevel(dda) {
  const p = dda.overallPerformance;
  if (dda.totalGames < 3) return 0;
  if (p >= 0.9) return 4;  // Master
  if (p >= 0.75) return 3; // Expert
  if (p >= 0.6) return 2;  // Advanced
  if (p >= 0.4) return 1;  // Intermediate
  return 0;                 // Beginner
}

export function getSkillLabel(dda, lang) {
  const level = getSkillLevel(dda);
  const labels = {
    ar: ['مبتدئ', 'متوسط', 'متقدم', 'خبير', 'محترف'],
    en: ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Master'],
    pt: ['Iniciante', 'Intermediário', 'Avançado', 'Especialista', 'Mestre'],
  };
  return (labels[lang] || labels.en)[level];
}

/* ─── Performance Trend ─── */
export function getPerformanceTrend(dda) {
  if (dda.history.length < 4) return 0;
  const recent = dda.history.slice(-4);
  const older = dda.history.slice(-8, -4);
  if (older.length === 0) return 0;
  const recentAvg = recent.reduce((s, h) => s + h.performance, 0) / recent.length;
  const olderAvg = older.reduce((s, h) => s + h.performance, 0) / older.length;
  const diff = recentAvg - olderAvg;
  if (diff > 0.05) return 1;   // improving
  if (diff < -0.05) return -1; // declining
  return 0;                     // stable
}

export function getTrendLabel(dda, lang) {
  const trend = getPerformanceTrend(dda);
  const labels = {
    ar: ['📉 يحتاج تحسين', '📊 مستقر', '📈 يتحسن'],
    en: ['📉 Needs work', '📊 Stable', '📈 Improving'],
    pt: ['📉 Precisa melhorar', '📊 Estável', '📈 Melhorando'],
  };
  return (labels[lang] || labels.en)[trend + 1];
}
