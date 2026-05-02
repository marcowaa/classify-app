// ═══════════════════════════════════════════════════════════════
// Memory Match Pro — worlds.js
// 10 Worlds, 100 Levels, World Map, Level Generation
// ═══════════════════════════════════════════════════════════════

import { POOL, GRID_TABLE, GRID_TABLE_TRIPLE, MECH, t, FRONT_ICONS } from './config.js';

export const LEVELS_PER_WORLD = 10;
export const BASE_WORLD_COUNT = 10;
export const BASE_LEVEL_COUNT = BASE_WORLD_COUNT * LEVELS_PER_WORLD;
export const ENDLESS_LEVEL_CAP = 2000;

const ENDLESS_LANES = [
  {
    key: 'focus',
    icon: '🎯',
    mechanics: [MECH.FOG, MECH.CHAIN, MECH.MASKED, MECH.BOMB],
    categories: ['school', 'tool', 'building', 'tech'],
    diffBias: 1,
  },
  {
    key: 'speed',
    icon: '⚡',
    mechanics: [MECH.TIMED, MECH.MOVING, MECH.RAINBOW, MECH.BOMB],
    categories: ['vehicle', 'weather', 'space', 'wild'],
    diffBias: 0,
  },
  {
    key: 'memory',
    icon: '🧠',
    mechanics: [MECH.CLASSIC, MECH.TRIPLE, MECH.MIRROR, MECH.RAINBOW],
    categories: ['mix', 'sea', 'food', 'fashion'],
    diffBias: -1,
  },
  {
    key: 'bossMarathon',
    icon: '👑',
    mechanics: [MECH.CHAIN, MECH.MIRROR, MECH.BOMB, MECH.MOVING],
    categories: ['fantasy', 'wild', 'space', 'tech'],
    diffBias: 2,
  },
];

// ===== 10 WORLDS =====
export const WORLDS = [
  {
    id:0, emoji:'🌿', group:0,
    gradient:'linear-gradient(135deg,#86efac,#22c55e)',
    accent:'#16a34a',
    bgAnim:'float',
    categories:['farm','bug','flower','weather'],
    // Mechanics progression within world: levels 0-8 regular, 9=boss
    mechanics:['classic','classic','classic','classic','timed','timed','timed','timed','timed'],
    bossType:'shadow',
    // Grid difficulty range: startDiff to startDiff + steps
    startDiff:0,
    unlockReq:null,
    cardColors:[
      {cf1:'#16a34a',cf2:'#15803d'},{cf1:'#22c55e',cf2:'#16a34a'},
      {cf1:'#65a30d',cf2:'#4d7c0f'},{cf1:'#059669',cf2:'#047857'},
    ],
  },
  {
    id:1, emoji:'🌊', group:1,
    gradient:'linear-gradient(135deg,#67e8f9,#0891b2)',
    accent:'#0891b2',
    bgAnim:'rise',
    categories:['sea','sea','sea','sea'],
    mechanics:['classic','classic','timed','timed','moving','moving','moving','moving','moving'],
    bossType:'kraken',
    startDiff:1,
    unlockReq:{world:0, starsNeeded:10},
    cardColors:[
      {cf1:'#0891b2',cf2:'#0e7490'},{cf1:'#06b6d4',cf2:'#0891b2'},
      {cf1:'#2563eb',cf2:'#1d4ed8'},{cf1:'#0d9488',cf2:'#0f766e'},
    ],
  },
  {
    id:2, emoji:'🍕', group:2,
    gradient:'linear-gradient(135deg,#fdba74,#ea580c)',
    accent:'#ea580c',
    bgAnim:'twinkle',
    categories:['food','veggie','fruit','candy'],
    mechanics:['timed','timed','timed','masked','masked','masked','masked','masked','masked'],
    bossType:'ghost',
    startDiff:1,
    unlockReq:{world:1, starsNeeded:10},
    cardColors:[
      {cf1:'#ea580c',cf2:'#c2410c'},{cf1:'#ef4444',cf2:'#dc2626'},
      {cf1:'#d97706',cf2:'#b45309'},{cf1:'#f59e0b',cf2:'#d97706'},
    ],
  },
  {
    id:3, emoji:'🚀', group:3,
    gradient:'linear-gradient(135deg,#c4b5fd,#7c3aed)',
    accent:'#7c3aed',
    bgAnim:'shoot',
    categories:['space','weather','vehicle','space'],
    mechanics:['moving','moving','moving','fog','fog','fog','fog','fog','fog'],
    bossType:'alien',
    startDiff:2,
    unlockReq:{world:2, starsNeeded:10},
    cardColors:[
      {cf1:'#7c3aed',cf2:'#6d28d9'},{cf1:'#9333ea',cf2:'#7e22ce'},
      {cf1:'#6366f1',cf2:'#4f46e5'},{cf1:'#8b5cf6',cf2:'#7c3aed'},
    ],
  },
  {
    id:4, emoji:'🎵', group:4,
    gradient:'linear-gradient(135deg,#f9a8d4,#ec4899)',
    accent:'#ec4899',
    bgAnim:'twinkle',
    categories:['music','music','music','music'],
    mechanics:['masked','masked','masked','triple','triple','triple','triple','triple','triple'],
    bossType:'storm',
    startDiff:3,
    unlockReq:{world:3, starsNeeded:10},
    cardColors:[
      {cf1:'#ec4899',cf2:'#be185d'},{cf1:'#db2777',cf2:'#be185d'},
      {cf1:'#f472b6',cf2:'#ec4899'},{cf1:'#d946ef',cf2:'#a855f7'},
    ],
  },
  {
    id:5, emoji:'⚔️', group:5,
    gradient:'linear-gradient(135deg,#fde68a,#d97706)',
    accent:'#d97706',
    bgAnim:'shoot',
    categories:['wild','bird','wild','fantasy'],
    mechanics:['fog','fog','chain','chain','chain','moving','chain','chain','moving'],
    bossType:'dragon',
    startDiff:3,
    unlockReq:{world:4, starsNeeded:10},
    cardColors:[
      {cf1:'#d97706',cf2:'#b45309'},{cf1:'#ca8a04',cf2:'#a16207'},
      {cf1:'#b45309',cf2:'#92400e'},{cf1:'#ea580c',cf2:'#c2410c'},
    ],
  },
  {
    id:6, emoji:'💻', group:6,
    gradient:'linear-gradient(135deg,#e9d5ff,#a855f7)',
    accent:'#a855f7',
    bgAnim:'fall',
    categories:['tech','school','tech','tool'],
    mechanics:['triple','triple','bomb','bomb','fog','bomb','bomb','triple','bomb'],
    bossType:'glitch',
    startDiff:4,
    unlockReq:{world:5, starsNeeded:10},
    cardColors:[
      {cf1:'#a855f7',cf2:'#7e22ce'},{cf1:'#6366f1',cf2:'#4f46e5'},
      {cf1:'#818cf8',cf2:'#6366f1'},{cf1:'#c084fc',cf2:'#a855f7'},
    ],
  },
  {
    id:7, emoji:'🎨', group:7,
    gradient:'linear-gradient(135deg,#f0abfc,#a855f7)',
    accent:'#d946ef',
    bgAnim:'twinkle',
    categories:['fashion','flower','building','candy'],
    mechanics:['mirror','mirror','rainbow','rainbow','triple','rainbow','mirror','rainbow','mirror'],
    bossType:'ice',
    startDiff:5,
    unlockReq:{world:6, starsNeeded:10},
    cardColors:[
      {cf1:'#d946ef',cf2:'#a855f7'},{cf1:'#ec4899',cf2:'#db2777'},
      {cf1:'#f472b6',cf2:'#ec4899'},{cf1:'#c084fc',cf2:'#9333ea'},
    ],
  },
  {
    id:8, emoji:'🏰', group:8,
    gradient:'linear-gradient(135deg,#a8a29e,#57534e)',
    accent:'#78716c',
    bgAnim:'shoot',
    categories:['fantasy','building','tool','school'],
    mechanics:['bomb','chain','mirror','rainbow','bomb','chain','mirror','rainbow','bomb'],
    startDiff:5,
    unlockReq:{world:7, starsNeeded:10},
    cardColors:[
      {cf1:'#57534e',cf2:'#44403c'},{cf1:'#78716c',cf2:'#57534e'},
      {cf1:'#a8a29e',cf2:'#78716c'},{cf1:'#6b7280',cf2:'#4b5563'},
    ],
  },
  {
    id:9, emoji:'👑', group:9,
    gradient:'linear-gradient(135deg,#fbbf24,#b45309)',
    accent:'#f59e0b',
    bgAnim:'shoot',
    categories:['mix','mix','mix','mix'],
    mechanics:['chain','mirror','bomb','rainbow','chain','mirror','bomb','rainbow','chain'],
    startDiff:6,
    unlockReq:{world:8, starsNeeded:12},
    cardColors:[
      {cf1:'#b45309',cf2:'#92400e'},{cf1:'#d97706',cf2:'#b45309'},
      {cf1:'#f59e0b',cf2:'#d97706'},{cf1:'#fbbf24',cf2:'#f59e0b'},
    ],
  },
];

export const WORLD_MAP = Object.fromEntries(WORLDS.map(w => [w.id, w]));

// ===== BOSS CATALOG (10 unique bosses with phased abilities) =====
export const BOSS_CATALOG = {
  shadow: {
    emoji:'🦊', hp:3, idx:0,
    phases:[ // abilities at different HP thresholds
      { hpAbove:2, ability:'hideEdge',   cooldown:3 },
      { hpAbove:0, ability:'hideEdge',   cooldown:2 },
    ],
    intro:'bossIntro', defeat:'bossDefeat',
    color:'#16a34a', aura:'rgba(34,197,94,.3)',
  },
  kraken: {
    emoji:'🦑', hp:4, idx:1,
    phases:[
      { hpAbove:2, ability:'inkWrap',    cooldown:4 },
      { hpAbove:0, ability:'inkWrap',    cooldown:2 },
    ],
    intro:'bossIntro', defeat:'bossDefeat',
    color:'#0891b2', aura:'rgba(6,182,212,.3)',
  },
  ghost: {
    emoji:'👻', hp:4, idx:2,
    phases:[
      { hpAbove:2, ability:'swapSymbols',cooldown:4 },
      { hpAbove:0, ability:'swapSymbols',cooldown:3 },
    ],
    intro:'bossIntro', defeat:'bossDefeat',
    color:'#a8a29e', aura:'rgba(168,162,158,.3)',
  },
  alien: {
    emoji:'👾', hp:5, idx:3,
    phases:[
      { hpAbove:3, ability:'fogZone',    cooldown:4 },
      { hpAbove:1, ability:'fogZone',    cooldown:3 },
      { hpAbove:0, ability:'shuffleAll', cooldown:3 },
    ],
    intro:'bossIntro', defeat:'bossDefeat',
    color:'#7c3aed', aura:'rgba(124,58,237,.3)',
  },
  storm: {
    emoji:'🌪️', hp:5, idx:4,
    phases:[
      { hpAbove:3, ability:'shuffleAll', cooldown:4 },
      { hpAbove:1, ability:'shuffleAll', cooldown:2 },
      { hpAbove:0, ability:'fogZone',    cooldown:2 },
    ],
    intro:'bossIntro', defeat:'bossDefeat',
    color:'#ec4899', aura:'rgba(236,72,153,.3)',
  },
  dragon: {
    emoji:'🐉', hp:6, idx:5,
    phases:[
      { hpAbove:4, ability:'burnCard',   cooldown:4 },
      { hpAbove:2, ability:'burnCard',   cooldown:3 },
      { hpAbove:0, ability:'shuffleAll', cooldown:2 },
    ],
    intro:'bossIntro', defeat:'bossDefeat',
    color:'#d97706', aura:'rgba(217,119,6,.3)',
  },
  glitch: {
    emoji:'🤖', hp:6, idx:6,
    phases:[
      { hpAbove:4, ability:'reverseFlip',cooldown:4 },
      { hpAbove:2, ability:'reverseFlip',cooldown:3 },
      { hpAbove:0, ability:'swapSymbols',cooldown:2 },
    ],
    intro:'bossIntro', defeat:'bossDefeat',
    color:'#a855f7', aura:'rgba(168,85,247,.3)',
  },
  ice: {
    emoji:'❄️', hp:7, idx:7,
    phases:[
      { hpAbove:5, ability:'freezeCards',cooldown:4 },
      { hpAbove:3, ability:'freezeCards',cooldown:3 },
      { hpAbove:0, ability:'inkWrap',    cooldown:2 },
    ],
    intro:'bossIntro', defeat:'bossDefeat',
    color:'#0ea5e9', aura:'rgba(14,165,233,.3)',
  },
  trickster: {
    emoji:'🎭', hp:7, idx:8,
    phases:[
      { hpAbove:5, ability:'swapSymbols',cooldown:4 },
      { hpAbove:3, ability:'hideEdge',   cooldown:3 },
      { hpAbove:1, ability:'reverseFlip',cooldown:2 },
      { hpAbove:0, ability:'shuffleAll', cooldown:2 },
    ],
    intro:'bossIntro', defeat:'bossDefeat',
    color:'#6b7280', aura:'rgba(107,114,128,.3)',
  },
  king: {
    emoji:'👑', hp:8, idx:9,
    phases:[
      { hpAbove:6, ability:'fogZone',    cooldown:4 },
      { hpAbove:4, ability:'burnCard',   cooldown:3 },
      { hpAbove:2, ability:'freezeCards',cooldown:2 },
      { hpAbove:0, ability:'shuffleAll', cooldown:2 },
    ],
    intro:'bossIntro', defeat:'bossDefeat',
    color:'#b45309', aura:'rgba(180,83,9,.3)',
  },
};

function buildBaseLevel(world, worldIdx, localIdx) {
  const isBoss = (localIdx === LEVELS_PER_WORLD - 1);
  const mechanic = isBoss ? MECH.BOSS : world.mechanics[localIdx];
  const isTriple = mechanic === MECH.TRIPLE;

  const diffStep = Math.min(
    isTriple ? GRID_TABLE_TRIPLE.length - 1 : GRID_TABLE.length - 1,
    world.startDiff + Math.floor(localIdx * 0.8)
  );

  const grid = isTriple
    ? GRID_TABLE_TRIPLE[Math.min(diffStep, GRID_TABLE_TRIPLE.length - 1)]
    : GRID_TABLE[diffStep];

  const cat = world.categories[localIdx % world.categories.length];
  const colors = world.cardColors[localIdx % world.cardColors.length];
  const globalIdx = worldIdx * LEVELS_PER_WORLD + localIdx;

  return {
    globalIdx,
    world: worldIdx,
    localIdx,
    cat,
    gridCols: grid.cols,
    gridRows: grid.rows,
    pairs: isTriple ? grid.sets : grid.pairs,
    mechanic,
    isBoss,
    bossType: isBoss ? world.bossType : null,
    cf1: colors.cf1,
    cf2: colors.cf2,
    season: 0,
    lane: 0,
  };
}

function buildEndlessLevel(globalIdx) {
  const endlessIdx = globalIdx - BASE_LEVEL_COUNT;
  const season = Math.floor(endlessIdx / LEVELS_PER_WORLD) + 1;
  const withinSeason = endlessIdx % LEVELS_PER_WORLD;
  const isBoss = withinSeason === LEVELS_PER_WORLD - 1;

  const world = WORLDS[WORLDS.length - 1];
  const lane = ENDLESS_LANES[(withinSeason + season - 1) % ENDLESS_LANES.length];
  const bossCycle = ['king', 'trickster', 'glitch', 'dragon', 'ice', 'alien', 'storm', 'shadow', 'kraken', 'ghost'];

  const mechanic = isBoss ? MECH.BOSS : lane.mechanics[(endlessIdx + season) % lane.mechanics.length];
  const isTriple = mechanic === MECH.TRIPLE;
  const seasonalBoost = Math.floor((season - 1) / 2);
  const diffStep = Math.min(
    isTriple ? GRID_TABLE_TRIPLE.length - 1 : GRID_TABLE.length - 1,
    Math.max(0, 4 + seasonalBoost + lane.diffBias + Math.floor(withinSeason * 0.35))
  );
  const grid = isTriple
    ? GRID_TABLE_TRIPLE[Math.min(diffStep, GRID_TABLE_TRIPLE.length - 1)]
    : GRID_TABLE[diffStep];
  const colors = world.cardColors[(season + withinSeason) % world.cardColors.length];

  return {
    globalIdx,
    world: world.id,
    localIdx: LEVELS_PER_WORLD + endlessIdx,
    cat: lane.categories[(season + withinSeason) % lane.categories.length],
    gridCols: grid.cols,
    gridRows: grid.rows,
    pairs: isTriple ? grid.sets : grid.pairs,
    mechanic,
    isBoss,
    bossType: isBoss ? bossCycle[(season - 1) % bossCycle.length] : null,
    cf1: colors.cf1,
    cf2: colors.cf2,
    season,
    lane: withinSeason,
    laneKey: lane.key,
    laneIcon: lane.icon,
  };
}

function generateLevels() {
  const levels = [];
  for (let w = 0; w < WORLDS.length; w++) {
    const world = WORLDS[w];
    for (let i = 0; i < LEVELS_PER_WORLD; i++) {
      levels.push(buildBaseLevel(world, w, i));
    }
  }
  for (let i = 0; i < ENDLESS_LEVEL_CAP; i++) {
    levels.push(buildEndlessLevel(BASE_LEVEL_COUNT + i));
  }
  return levels;
}

export const LEVELS = generateLevels();

// ===== LEVEL NAME HELPER =====
export function getLevelName(globalIdx) {
  const lvl = LEVELS[globalIdx];
  if (!lvl) return '';
  if (lvl.globalIdx >= BASE_LEVEL_COUNT) {
    const worldName = getWorldName(lvl.world) || '';
    const laneIcon = lvl.laneIcon || '🧩';
    return worldName + ' • ' + laneIcon + ' #' + (lvl.globalIdx + 1);
  }
  const key = 'lvNamesW' + lvl.world;
  const names = t[key];
  return names ? (names[lvl.localIdx] || '') : '';
}

// ===== WORLD NAME HELPER =====
export function getWorldName(worldIdx) {
  return t.worldNames ? (t.worldNames[worldIdx] || '') : '';
}

// ===== EMOJI PICKER (deduped, shuffled) =====
export function pickEmoji(cat, n) {
  const pool = POOL[cat] || POOL.mix;
  const unique = [...new Set(shuffleArr(pool))];
  return unique.slice(0, n);
}

// ===== FRONT ICON PICKER =====
export function pickFrontIcon(worldIdx) {
  const group = WORLDS[worldIdx] ? WORLDS[worldIdx].group : 0;
  const icons = FRONT_ICONS[group] || FRONT_ICONS[0];
  return icons[Math.floor(Math.random() * icons.length)];
}

// ===== SHUFFLE =====
export function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ===== PROGRESS: Stars count per world =====
export function getWorldStars(progress, worldIdx) {
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const gi = worldIdx * 10 + i;
    sum += (progress.stars[gi] || 0);
  }
  return sum;
}

export function getWorldCompleted(progress, worldIdx) {
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const gi = worldIdx * 10 + i;
    if ((progress.stars[gi] || 0) >= 1) sum++;
  }
  return sum;
}

export function getTotalStars(progress) {
  return Object.values(progress.stars).reduce((s, v) => s + (v || 0), 0);
}

export function isWorldUnlocked(progress, worldIdx) {
  const world = WORLDS[worldIdx];
  if (!world) return false;
  if (!world.unlockReq) return true; // first world always unlocked
  const req = world.unlockReq;
  return getWorldStars(progress, req.world) >= req.starsNeeded;
}

export function isLevelUnlocked(progress, globalIdx) {
  if (globalIdx === 0) return true;
  const lvl = LEVELS[globalIdx];
  if (!lvl) return false;
  if (globalIdx >= BASE_LEVEL_COUNT) {
    return (progress.stars[globalIdx - 1] || 0) >= 1;
  }
  // World must be unlocked
  if (!isWorldUnlocked(progress, lvl.world)) return false;
  // First level of world = always (if world unlocked)
  if (lvl.localIdx === 0) return true;
  // Previous level must have at least 1 star
  const prevGi = globalIdx - 1;
  return (progress.stars[prevGi] || 0) >= 1;
}

// ===== SCORE CALCULATION =====
export function calcScore(moves, pairs, duration, matched, mechanic) {
  matched = matched || pairs;
  const ratio = matched / pairs;
  const perfect = matched;
  const extraMoves = Math.max(0, moves - perfect);
  const movePenalty = extraMoves * 3;
  const graceSec = pairs * 5;
  const extraSec = Math.max(0, duration - graceSec);
  const timePenalty = extraSec * 0.3;
  const mechBonus = mechanic === MECH.CLASSIC ? 0 : mechanic === MECH.BOSS ? 10 : 5;
  return Math.max(0, Math.min(100, Math.round((100 - movePenalty - timePenalty) * ratio + mechBonus)));
}

// ===== FORMAT TIME =====
export function fmtTime(s) {
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
