/* ═══════════════════════════════════════════════════════════════
   Ice Kingdom Academy — Worlds Configuration
   10 worlds with ice/arctic themes, level configs, star calc
   ═══════════════════════════════════════════════════════════════ */

export const WORLDS = [
  { id: 1,  emoji: '🧊', bg: 'linear-gradient(135deg,#e0f7fa,#b2ebf2,#80deea)', accent: '#00bcd4', particleColor: '#80deea', particleType: 'snow',    subject: 'colors_shapes' },
  { id: 2,  emoji: '🐧', bg: 'linear-gradient(135deg,#e1f5fe,#b3e5fc,#81d4fa)', accent: '#039be5', particleColor: '#81d4fa', particleType: 'bubble',  subject: 'animals_nature' },
  { id: 3,  emoji: '🌨️', bg: 'linear-gradient(135deg,#263238,#37474f,#455a64)', accent: '#78909c', particleColor: '#90a4ae', particleType: 'storm',   subject: 'weather_seasons' },
  { id: 4,  emoji: '🏔️', bg: 'linear-gradient(135deg,#e8eaf6,#c5cae9,#9fa8da)', accent: '#5c6bc0', particleColor: '#9fa8da', particleType: 'crystal', subject: 'numbers' },
  { id: 5,  emoji: '❄️', bg: 'linear-gradient(135deg,#e3f2fd,#bbdefb,#90caf9)', accent: '#42a5f5', particleColor: '#90caf9', particleType: 'ice',     subject: 'addition' },
  { id: 6,  emoji: '🌊', bg: 'linear-gradient(135deg,#006064,#00838f,#0097a7)', accent: '#00bfa5', particleColor: '#4dd0e1', particleType: 'wave',    subject: 'subtraction' },
  { id: 7,  emoji: '🌍', bg: 'linear-gradient(135deg,#1b5e20,#2e7d32,#388e3c)', accent: '#66bb6a', particleColor: '#a5d6a7', particleType: 'leaf',    subject: 'geography' },
  { id: 8,  emoji: '🔬', bg: 'linear-gradient(135deg,#4a148c,#6a1b9a,#7b1fa2)', accent: '#ce93d8', particleColor: '#e1bee7', particleType: 'spark',   subject: 'science' },
  { id: 9,  emoji: '🦕', bg: 'linear-gradient(135deg,#3e2723,#4e342e,#5d4037)', accent: '#a1887f', particleColor: '#bcaaa4', particleType: 'fire',    subject: 'dinosaurs' },
  { id: 10, emoji: '🌌', bg: 'linear-gradient(135deg,#0d0d2b,#1a1a4e,#2c2c6c)', accent: '#7c4dff', particleColor: '#b388ff', particleType: 'magic',   subject: 'mixed' },
];

export function getWorld(id) {
  return WORLDS.find(w => w.id === id) || WORLDS[0];
}

/* ── Level configuration ── */
export function getLevelConfig(worldId, levelNum) {
  const isBoss = levelNum === 10;
  const difficulty = Math.min(worldId, 10);

  // Progressive difficulty
  const baseQuestions = isBoss ? 12 : 7 + Math.floor(levelNum / 3);
  const baseTime = isBoss ? 12 : Math.max(8, 18 - difficulty - Math.floor(levelNum / 4));

  return {
    totalQuestions: Math.min(baseQuestions, 15),
    timePerQuestion: baseTime,
    passScore: isBoss ? 0.75 : 0.6,
    xpReward: (isBoss ? 50 : 15) + difficulty * 3 + levelNum * 2,
    coinReward: isBoss ? 50 : 10 + levelNum * 2,
    isBoss,
    starThresholds: { three: 0.9, two: 0.7, one: 0.5 },
  };
}

/* ── Star calculation ── */
export function calcStars(correct, total, timeUsed, timeAllowed) {
  const pct = correct / total;
  const timePct = timeAllowed > 0 ? 1 - (timeUsed / timeAllowed) : 0.5;
  const combined = pct * 0.7 + Math.max(0, timePct) * 0.3;

  if (combined >= 0.9) return 3;
  if (combined >= 0.7) return 2;
  if (combined >= 0.5) return 1;
  return 0;
}

/* ── Daily bonus config ── */
export const DAILY_BONUS = {
  baseCoins: 25,
  streakMultiplier: 5,   // +5 coins per streak day
  maxStreak: 30,
  streakBonus: [0, 25, 30, 35, 40, 50, 55, 60, 70, 80, 100], // bonus at streak milestones
};

/* ── Power-up costs ── */
export const POWER_UPS = {
  hint:   { cost: 15, icon: '💡', effect: 'remove_wrong' },
  freeze: { cost: 20, icon: '⏸️', effect: 'freeze_timer' },
  double: { cost: 25, icon: '×2', effect: 'double_score' },
  life:   { cost: 30, icon: '❤️', effect: 'extra_life' },
  shield: { cost: 35, icon: '🛡️', effect: 'absorb_mistake' },
};
