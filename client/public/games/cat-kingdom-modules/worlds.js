/* ═══════════════════════════════════════════════════════════════
   Cat Kingdom — Worlds & Levels Configuration
   10 worlds × 10 levels = 100 levels
   ═══════════════════════════════════════════════════════════════ */

export const WORLDS = [
  {
    id: 1,
    emoji: '🌲',
    bg: 'linear-gradient(135deg,#1a472a,#2d5016,#0f3d0a)',
    accent: '#43e97b',
    particleColor: '#43e97b',
    particleType: 'leaf',
    subject: 'colors_shapes',
  },
  {
    id: 2,
    emoji: '🌊',
    bg: 'linear-gradient(135deg,#0a2647,#144272,#205295)',
    accent: '#00b4d8',
    particleColor: '#90e0ef',
    particleType: 'bubble',
    subject: 'numbers',
  },
  {
    id: 3,
    emoji: '🌋',
    bg: 'linear-gradient(135deg,#3d0c02,#7b2d00,#b85c1e)',
    accent: '#ff6b35',
    particleColor: '#ffba08',
    particleType: 'fire',
    subject: 'addition',
  },
  {
    id: 4,
    emoji: '❄️',
    bg: 'linear-gradient(135deg,#caf0f8,#a2d2ff,#bde0fe)',
    accent: '#48cae4',
    particleColor: '#ffffff',
    particleType: 'snow',
    subject: 'subtraction',
  },
  {
    id: 5,
    emoji: '🚀',
    bg: 'linear-gradient(135deg,#0b0033,#1a0044,#10002b)',
    accent: '#c77dff',
    particleColor: '#e0aaff',
    particleType: 'star',
    subject: 'arabic_letters',
  },
  {
    id: 6,
    emoji: '🏜️',
    bg: 'linear-gradient(135deg,#c2956a,#a67c52,#dbb892)',
    accent: '#f4a261',
    particleColor: '#e9c46a',
    particleType: 'sand',
    subject: 'english_letters',
  },
  {
    id: 7,
    emoji: '🌸',
    bg: 'linear-gradient(135deg,#ffc8dd,#ffafcc,#ff8fab)',
    accent: '#ff69b4',
    particleColor: '#ffc8dd',
    particleType: 'petal',
    subject: 'words',
  },
  {
    id: 8,
    emoji: '⚙️',
    bg: 'linear-gradient(135deg,#2d3436,#636e72,#4a5568)',
    accent: '#00cec9',
    particleColor: '#81ecec',
    particleType: 'spark',
    subject: 'advanced_math',
  },
  {
    id: 9,
    emoji: '🔮',
    bg: 'linear-gradient(135deg,#2d1b69,#512da8,#7c4dff)',
    accent: '#b388ff',
    particleColor: '#ea80fc',
    particleType: 'magic',
    subject: 'patterns',
  },
  {
    id: 10,
    emoji: '👑',
    bg: 'linear-gradient(135deg,#bf953f,#b38728,#fbf5b7,#aa771c)',
    accent: '#ffd700',
    particleColor: '#fff8dc',
    particleType: 'confetti',
    subject: 'mixed',
  },
];

/* ── level config generator ── */
export function getLevelConfig(worldId, levelNum) {
  const isBoss = levelNum === 10;
  const base = 3 + Math.floor(worldId * 0.5);
  const questions = isBoss ? base + 5 : base + Math.floor(levelNum * 0.4);
  const timePerQ = Math.max(8, 20 - worldId - Math.floor(levelNum / 3));
  const passScore = isBoss ? 0.8 : 0.6;

  return {
    worldId,
    levelNum,
    isBoss,
    totalQuestions: Math.min(questions, 15),
    timePerQuestion: timePerQ,
    passScore,
    xpReward: isBoss ? 50 + worldId * 10 : 10 + worldId * 2 + levelNum,
    maxStars: 3,
    starThresholds: [passScore, 0.8, 1.0],
  };
}

/* ── star calculation ── */
export function calcStars(correct, total, timeUsed, timeAllowed) {
  const acc = total > 0 ? correct / total : 0;
  const timePct = timeAllowed > 0 ? Math.max(0, 1 - timeUsed / timeAllowed) : 0;
  const score = acc * 0.7 + timePct * 0.3;
  if (score >= 0.95) return 3;
  if (score >= 0.75) return 2;
  if (score >= 0.5) return 1;
  return 0;
}

/* ── get world by id ── */
export function getWorld(id) {
  return WORLDS.find(w => w.id === id) || WORLDS[0];
}
