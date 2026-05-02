// ===== Emoji Kingdom v3 — Core Systems =====
// World-based progress, XP/Level, Lives, Combo/Streak, Scoring

const STORAGE_KEY = 'classify_math_v3';
const V2_KEY = 'classify_math_v2';
const OLD_KEY = 'classify_math_progress';
const XP_PER_LEVEL = 1000;
const MAX_LIVES = 5;
const REGEN_MS = 10 * 60 * 1000; // 10 min per life

const WORLD_IDS = ['forest','orchard','ocean','volcano','electric','castle','space','puzzle','geometry','algebra'];

// ===== Progress =====
export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p.version === 3) return p;
    }
  } catch(e) {}
  // Migrate from v2 flat system
  const base = defaultProgress();
  try {
    const v2 = JSON.parse(localStorage.getItem(V2_KEY));
    if (v2) {
      // Carry over global stats
      base.totalXP = v2.totalXP || 0;
      base.playerLevel = v2.playerLevel || 1;
      base.coins = v2.coins || 0;
      base.lives = v2.lives != null ? v2.lives : MAX_LIVES;
      base.livesTimestamp = v2.livesTimestamp || Date.now();
      if (v2.boosters) base.boosters = { ...base.boosters, ...v2.boosters };
      if (v2.badges) base.badges = v2.badges;
      if (v2.skillData) base.skillData = { ...base.skillData, ...v2.skillData };
      if (v2.tutorialShown) base.tutorialShown = v2.tutorialShown;
      if (v2.purchaseCounts) base.purchaseCounts = v2.purchaseCounts;
      base.dailyChallengeDate = v2.dailyChallengeDate || null;
      base.dailyChallengeCompleted = v2.dailyChallengeCompleted || false;
      // Map old flat levels to forest world
      const oldUnlocked = v2.unlocked || 1;
      const oldStars = v2.stars || {};
      const oldScores = v2.scores || {};
      base.worlds.forest.levelReached = Math.min(oldUnlocked, 30);
      for (const [k, v] of Object.entries(oldStars)) base.worlds.forest.stars[k] = v;
      for (const [k, v] of Object.entries(oldScores)) base.worlds.forest.scores[k] = v;
      // If they had many levels, unlock orchard
      if (oldUnlocked > 10) {
        base.worlds.orchard.levelReached = Math.max(1, oldUnlocked - 10);
      }
    }
  } catch(e) {}
  // Also try very old key
  try {
    const old = JSON.parse(localStorage.getItem(OLD_KEY));
    if (old && old.unlocked && base.worlds.forest.levelReached === 0) {
      base.worlds.forest.levelReached = old.unlocked || 1;
      if (old.stars) for (const [k, v] of Object.entries(old.stars)) base.worlds.forest.stars[k] = v;
      if (old.scores) for (const [k, v] of Object.entries(old.scores)) base.worlds.forest.scores[k] = v;
    }
  } catch(e) {}
  saveProgress(base);
  return base;
}

function defaultWorldProgress() {
  return { levelReached: 0, scores: {}, stars: {} };
}

function defaultProgress() {
  const worlds = {};
  for (const id of WORLD_IDS) worlds[id] = defaultWorldProgress();
  worlds.forest.levelReached = 1; // first world starts unlocked with level 1
  return {
    version: 3,
    worlds,
    totalXP: 0,
    playerLevel: 1,
    coins: 0,
    lives: MAX_LIVES,
    livesTimestamp: Date.now(),
    boosters: { hammer: 1, shuffle: 1, extraTime: 1, hint: 3 },
    badges: [],
    dailyChallengeDate: null,
    dailyChallengeCompleted: false,
    skillData: {
      avgResponseTime: 8,
      accuracyRate: 0.5,
      highestStreak: 0,
      totalGamesPlayed: 0,
      smoothedSkill: 50,
      typeProfiles: {}
    },
    tutorialShown: {},
    purchaseCounts: { hammer: 0, shuffle: 0, extraTime: 0, hint: 0 },
    soundMuted: false,
    // Phase E: deep progression
    bossesBeaten: 0,
    perfectGames: 0,
    worldsCleared: 0,
    totalPrestige: 0,
    prestige: {},
    achievementsUnlocked: [],
    loginStreak: { lastDate: null, count: 0 },
    weeklyDate: null,
    weeklyCompleted: false,
  };
}

export function saveProgress(p) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch(e) {}
}

// ===== XP & Player Level =====
export function addXP(p, amount) {
  const oldLvl = getPlayerLevel(p);
  p.totalXP = (p.totalXP || 0) + Math.round(amount);
  const newLvl = getPlayerLevel(p);
  const leveledUp = newLvl > oldLvl;
  if (leveledUp) {
    p.playerLevel = newLvl;
    // Level up rewards
    p.boosters.hint = (p.boosters.hint || 0) + 1;
    p.boosters.hammer = (p.boosters.hammer || 0) + 1;
    p.lives = Math.min(MAX_LIVES, (p.lives || 0) + 1);
  }
  saveProgress(p);
  return { leveledUp, newLevel: newLvl, xpGained: Math.round(amount) };
}

export function getPlayerLevel(p) {
  return Math.floor((p.totalXP || 0) / XP_PER_LEVEL) + 1;
}

export function getLevelXPProgress(p) {
  return (p.totalXP || 0) % XP_PER_LEVEL;
}

export function getXPToNextLevel() {
  return XP_PER_LEVEL;
}

// ===== Lives =====
export function getLives(p) {
  const now = Date.now();
  let lives = p.lives != null ? p.lives : MAX_LIVES;
  const ts = p.livesTimestamp || now;
  if (lives < MAX_LIVES) {
    const elapsed = now - ts;
    const regen = Math.floor(elapsed / REGEN_MS);
    if (regen > 0) {
      lives = Math.min(lives + regen, MAX_LIVES);
      p.lives = lives;
      p.livesTimestamp = ts + regen * REGEN_MS;
      saveProgress(p);
    }
  }
  return lives;
}

export function loseLife(p) {
  const cur = getLives(p);
  if (cur >= MAX_LIVES) p.livesTimestamp = Date.now();
  p.lives = Math.max(cur - 1, 0);
  saveProgress(p);
  return p.lives;
}

export function getTimeToNextLife(p) {
  if (getLives(p) >= MAX_LIVES) return 0;
  const elapsed = Date.now() - (p.livesTimestamp || Date.now());
  return Math.max(0, REGEN_MS - (elapsed % REGEN_MS));
}

export function getMaxLives() { return MAX_LIVES; }

// ===== Combo / Streak =====
export function getComboMultiplier(streak) {
  return 1 + Math.min(streak, 20) * 0.25;
}

// ===== Scoring =====
export function calculateScore(correct, timeRemaining, maxTime, comboMult, usedHint) {
  if (!correct) return 0;
  const base = 100;
  const speed = maxTime > 0 ? (1.0 + (timeRemaining / maxTime) * 0.5) : 1.3;
  let sc = Math.round(base * speed * comboMult);
  if (usedHint) sc = Math.round(sc * 0.7);
  return sc;
}

export function calculateXP(totalScore, totalQ, isPerfect, noHints, isDaily) {
  let xp = Math.round(totalScore / 8);
  if (isPerfect) xp += 50;
  if (noHints) xp += 20;
  if (isDaily) xp *= 2;
  return xp;
}

export function calculateCoins(stars, isPerfect, isDaily) {
  let coins = stars * 10;
  if (isPerfect) coins += 25;
  if (isDaily) coins *= 2;
  return coins;
}

// ===== Level Progress (World-based) =====
export function updateLevelProgress(p, worldId, levelIndex, score, stars) {
  if (!p.worlds[worldId]) p.worlds[worldId] = defaultWorldProgress();
  const wp = p.worlds[worldId];
  const prev = wp.stars[levelIndex] || 0;
  if (stars > prev) wp.stars[levelIndex] = stars;
  const prevSc = wp.scores[levelIndex] || 0;
  if (score > prevSc) wp.scores[levelIndex] = score;
  if (stars >= 1 && levelIndex + 1 >= (wp.levelReached || 0)) {
    wp.levelReached = levelIndex + 2;
  }
  saveProgress(p);
}

export function getWorldProgress(p, worldId) {
  return p.worlds[worldId] || defaultWorldProgress();
}

export function getTotalStarsInWorld(p, worldId) {
  const wp = p.worlds[worldId];
  if (!wp || !wp.stars) return 0;
  return Object.values(wp.stars).reduce((s, v) => s + (v || 0), 0);
}

export function getTotalStarsAll(p) {
  let total = 0;
  for (const id of WORLD_IDS) total += getTotalStarsInWorld(p, id);
  return total;
}

export function getStarsForScore(correct, total) {
  const pct = correct / total;
  if (pct >= 1) return 3;
  if (pct >= 0.8) return 2;
  if (pct >= 0.6) return 1;
  return 0;
}
