/**
 * Gem Kingdom — worlds.js
 * 10 Worlds × 10 Levels = 100 Level Definitions
 * Each world introduces new obstacles & mechanics progressively
 * Level 4 = mini-boss, Level 9 = world boss in every world
 *
 * Obstacle Types (from config.js):
 *   0=NONE 1=ICE_1 2=ICE_2 3=CHAIN 4=STONE 5=DARK
 *   6=LOCK 7=BOMB_TIMER 8=PORTAL 9=CONVEYOR_UP 10=CONVEYOR_DOWN
 *   11=CAGE 12=SHADOW 13=MOSS
 */

// Helper: generate obstacle positions in patterns
function rect(type, r1, c1, r2, c2, hp) {
  const obs = [];
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      obs.push({ type, row: r, col: c, hp: hp || undefined });
    }
  }
  return obs;
}

function border(type, rows, cols, hp) {
  const obs = [];
  for (let c = 0; c < cols; c++) { obs.push({ type, row: 0, col: c, hp }); obs.push({ type, row: rows - 1, col: c, hp }); }
  for (let r = 1; r < rows - 1; r++) { obs.push({ type, row: r, col: 0, hp }); obs.push({ type, row: r, col: cols - 1, hp }); }
  return obs;
}

function checkerboard(type, r1, c1, r2, c2, hp) {
  const obs = [];
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      if ((r + c) % 2 === 0) obs.push({ type, row: r, col: c, hp });
    }
  }
  return obs;
}

function cross(type, centerR, centerC, size, hp) {
  const obs = [];
  for (let i = -size; i <= size; i++) {
    obs.push({ type, row: centerR + i, col: centerC, hp });
    if (i !== 0) obs.push({ type, row: centerR, col: centerC + i, hp });
  }
  return obs;
}

function corners(type, rows, cols, size, hp) {
  const obs = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      obs.push({ type, row: r, col: c, hp });
      obs.push({ type, row: r, col: cols - 1 - c, hp });
      obs.push({ type, row: rows - 1 - r, col: c, hp });
      obs.push({ type, row: rows - 1 - r, col: cols - 1 - c, hp });
    }
  }
  return obs;
}

function diamond(type, centerR, centerC, size, hp) {
  const obs = [];
  for (let r = -size; r <= size; r++) {
    const w = size - Math.abs(r);
    for (let c = -w; c <= w; c++) {
      obs.push({ type, row: centerR + r, col: centerC + c, hp });
    }
  }
  return obs;
}

// ===== WORLD 0: FRUIT FOREST 🍎 (Tutorial) =====
const world0 = [
  // Level 0-0: Pure basics — just match!
  {
    rows: 7, cols: 7, gemCount: 5, moves: 30,
    starThresholds: [300, 600, 1000],
    objectives: [{ type: 'score', target: 300 }],
    obstacles: [],
  },
  // Level 0-1: Slightly harder score
  {
    rows: 7, cols: 7, gemCount: 5, moves: 28,
    starThresholds: [500, 1000, 1800],
    objectives: [{ type: 'score', target: 500 }],
    obstacles: [],
  },
  // Level 0-2: Collect specific gem type
  {
    rows: 7, cols: 7, gemCount: 5, moves: 25,
    starThresholds: [400, 900, 1500],
    objectives: [{ type: 'collect', target: 15, gem: 0 }],
    obstacles: [],
  },
  // Level 0-3: First ICE introduction
  {
    rows: 7, cols: 7, gemCount: 5, moves: 25,
    starThresholds: [600, 1200, 2000],
    objectives: [{ type: 'breakIce', target: 6 }],
    obstacles: [
      { type: 1, row: 2, col: 2 }, { type: 1, row: 2, col: 4 },
      { type: 1, row: 4, col: 2 }, { type: 1, row: 4, col: 4 },
      { type: 1, row: 3, col: 1 }, { type: 1, row: 3, col: 5 },
    ],
  },
  // Level 0-4: MINI BOSS
  {
    rows: 7, cols: 7, gemCount: 5, moves: 30,
    starThresholds: [800, 1500, 2500],
    objectives: [{ type: 'boss', target: 1 }],
    obstacles: [
      { type: 1, row: 1, col: 3 }, { type: 1, row: 5, col: 3 },
    ],
    isMiniBoss: true,
  },
  // Level 0-5: Two objectives
  {
    rows: 7, cols: 7, gemCount: 6, moves: 25,
    starThresholds: [700, 1400, 2200],
    objectives: [
      { type: 'score', target: 700 },
      { type: 'collect', target: 12, gem: 1 },
    ],
    obstacles: [],
  },
  // Level 0-6: More ice
  {
    rows: 8, cols: 7, gemCount: 5, moves: 25,
    starThresholds: [900, 1800, 2800],
    objectives: [{ type: 'breakIce', target: 10 }],
    obstacles: [
      ...rect(1, 1, 1, 1, 5),
      ...rect(1, 5, 1, 5, 5),
    ],
  },
  // Level 0-7: Create specials
  {
    rows: 8, cols: 7, gemCount: 5, moves: 22,
    starThresholds: [1000, 2000, 3000],
    objectives: [{ type: 'useSpecial', target: 3 }],
    obstacles: [
      { type: 1, row: 3, col: 3 }, { type: 1, row: 4, col: 3 },
    ],
  },
  // Level 0-8: Combo challenge
  {
    rows: 8, cols: 8, gemCount: 5, moves: 25,
    starThresholds: [1200, 2500, 4000],
    objectives: [
      { type: 'cascade', target: 3 },
      { type: 'score', target: 1200 },
    ],
    obstacles: [
      { type: 1, row: 0, col: 0 }, { type: 1, row: 0, col: 7 },
      { type: 1, row: 7, col: 0 }, { type: 1, row: 7, col: 7 },
    ],
  },
  // Level 0-9: WORLD BOSS
  {
    rows: 8, cols: 8, gemCount: 5, moves: 35,
    starThresholds: [1500, 3000, 5000],
    objectives: [{ type: 'boss', target: 1 }],
    obstacles: [
      ...rect(1, 0, 2, 0, 5),
      ...rect(1, 7, 2, 7, 5),
    ],
    isBoss: true,
  },
];

// ===== WORLD 1: OCEAN DEEP 🐠 (Ice focus) =====
const world1 = [
  {
    rows: 7, cols: 7, gemCount: 5, moves: 28,
    starThresholds: [500, 1000, 1800],
    objectives: [{ type: 'breakIce', target: 8 }],
    obstacles: [
      ...rect(1, 2, 2, 4, 4),
    ],
  },
  {
    rows: 7, cols: 7, gemCount: 6, moves: 25,
    starThresholds: [700, 1400, 2200],
    objectives: [{ type: 'breakIce', target: 10 }, { type: 'score', target: 700 }],
    obstacles: [
      ...rect(2, 1, 1, 1, 5), // ICE_2
      ...rect(1, 5, 1, 5, 5),
    ],
  },
  {
    rows: 8, cols: 7, gemCount: 5, moves: 25,
    starThresholds: [800, 1600, 2600],
    objectives: [{ type: 'collect', target: 20, gem: 2 }],
    obstacles: [
      ...checkerboard(1, 0, 0, 2, 6),
    ],
  },
  {
    rows: 8, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [1000, 2000, 3200],
    objectives: [{ type: 'breakIce', target: 16 }],
    obstacles: [
      ...rect(2, 2, 2, 5, 5),
    ],
  },
  // Mini boss
  {
    rows: 8, cols: 8, gemCount: 5, moves: 30,
    starThresholds: [1200, 2400, 3800],
    objectives: [{ type: 'boss', target: 1 }],
    obstacles: [
      ...rect(2, 0, 0, 0, 7),
      ...rect(1, 7, 0, 7, 7),
    ],
    isMiniBoss: true,
  },
  {
    rows: 8, cols: 8, gemCount: 6, moves: 22,
    starThresholds: [1000, 2000, 3500],
    objectives: [
      { type: 'breakIce', target: 12 },
      { type: 'useSpecial', target: 4 },
    ],
    obstacles: [
      ...diamond(2, 3, 3, 2),
    ],
  },
  {
    rows: 8, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [1200, 2500, 4000],
    objectives: [{ type: 'score', target: 2500 }],
    obstacles: [
      ...border(1, 8, 8),
    ],
  },
  {
    rows: 8, cols: 8, gemCount: 5, moves: 22,
    starThresholds: [1500, 3000, 4500],
    objectives: [
      { type: 'breakIce', target: 20 },
      { type: 'cascade', target: 4 },
    ],
    obstacles: [
      ...rect(2, 1, 1, 6, 6),
    ],
  },
  {
    rows: 9, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [1800, 3500, 5500],
    objectives: [
      { type: 'breakIce', target: 24 },
      { type: 'score', target: 3000 },
    ],
    obstacles: [
      ...rect(2, 0, 0, 2, 7),
      ...rect(1, 6, 0, 8, 7),
    ],
  },
  // World boss
  {
    rows: 9, cols: 8, gemCount: 6, moves: 35,
    starThresholds: [2000, 4000, 6500],
    objectives: [{ type: 'boss', target: 1 }],
    obstacles: [
      ...rect(2, 0, 1, 1, 6),
      ...diamond(1, 5, 4, 2),
    ],
    isBoss: true,
  },
];

// ===== WORLD 2: COLOR VALLEY 🌈 (Chains introduced) =====
const world2 = [
  {
    rows: 7, cols: 7, gemCount: 6, moves: 28,
    starThresholds: [600, 1200, 2000],
    objectives: [{ type: 'score', target: 600 }],
    obstacles: [
      { type: 3, row: 3, col: 1 }, { type: 3, row: 3, col: 5 },
      { type: 3, row: 1, col: 3 }, { type: 3, row: 5, col: 3 },
    ],
  },
  {
    rows: 8, cols: 7, gemCount: 6, moves: 25,
    starThresholds: [800, 1600, 2600],
    objectives: [
      { type: 'collect', target: 18, gem: 3 },
      { type: 'score', target: 800 },
    ],
    obstacles: [
      ...rect(3, 2, 1, 2, 5),
      ...rect(3, 5, 1, 5, 5),
    ],
  },
  {
    rows: 8, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [1000, 2000, 3200],
    objectives: [{ type: 'breakIce', target: 8 }],
    obstacles: [
      ...rect(1, 0, 0, 0, 3), ...rect(3, 0, 4, 0, 7),
      ...rect(3, 7, 0, 7, 3), ...rect(1, 7, 4, 7, 7),
    ],
  },
  {
    rows: 8, cols: 8, gemCount: 6, moves: 22,
    starThresholds: [1200, 2400, 3800],
    objectives: [
      { type: 'useSpecial', target: 5 },
      { type: 'score', target: 2000 },
    ],
    obstacles: [
      ...cross(3, 3, 3, 2),
    ],
  },
  // Mini boss
  {
    rows: 8, cols: 8, gemCount: 6, moves: 30,
    starThresholds: [1500, 3000, 4800],
    objectives: [{ type: 'boss', target: 1 }],
    obstacles: [
      ...rect(3, 1, 1, 1, 6),
      ...rect(1, 6, 1, 6, 6),
    ],
    isMiniBoss: true,
  },
  {
    rows: 8, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [1400, 2800, 4500],
    objectives: [
      { type: 'collect', target: 25, gem: 0 },
      { type: 'collect', target: 25, gem: 1 },
    ],
    obstacles: [
      ...checkerboard(3, 1, 1, 6, 6),
    ],
  },
  {
    rows: 8, cols: 8, gemCount: 5, moves: 22,
    starThresholds: [1600, 3200, 5000],
    objectives: [
      { type: 'breakIce', target: 12 },
      { type: 'cascade', target: 5 },
    ],
    obstacles: [
      ...rect(2, 0, 2, 2, 5),
      ...rect(3, 5, 2, 7, 5),
    ],
  },
  {
    rows: 9, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [1800, 3600, 5500],
    objectives: [{ type: 'score', target: 3600 }],
    obstacles: [
      ...rect(3, 0, 0, 0, 7),
      ...diamond(3, 4, 4, 2),
      ...rect(3, 8, 0, 8, 7),
    ],
  },
  {
    rows: 9, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [2000, 4000, 6000],
    objectives: [
      { type: 'breakIce', target: 15 },
      { type: 'useSpecial', target: 6 },
    ],
    obstacles: [
      ...rect(2, 1, 0, 3, 3),
      ...rect(3, 1, 4, 3, 7),
      ...rect(3, 5, 0, 7, 3),
      ...rect(2, 5, 4, 7, 7),
    ],
  },
  // World boss
  {
    rows: 9, cols: 8, gemCount: 6, moves: 35,
    starThresholds: [2500, 5000, 7500],
    objectives: [{ type: 'boss', target: 1 }],
    obstacles: [
      ...border(3, 9, 8),
      ...rect(2, 3, 3, 5, 4),
    ],
    isBoss: true,
  },
];

// ===== WORLD 3: ANIMAL SAFARI 🦁 (Stone walls introduced) =====
const world3 = [
  {
    rows: 8, cols: 8, gemCount: 6, moves: 28,
    starThresholds: [800, 1600, 2600],
    objectives: [{ type: 'score', target: 800 }],
    obstacles: [
      { type: 4, row: 3, col: 3, hp: 2 }, { type: 4, row: 3, col: 4, hp: 2 },
      { type: 4, row: 4, col: 3, hp: 2 }, { type: 4, row: 4, col: 4, hp: 2 },
    ],
  },
  {
    rows: 8, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [1000, 2000, 3200],
    objectives: [
      { type: 'score', target: 1000 },
      { type: 'collect', target: 20, gem: 4 },
    ],
    obstacles: [
      { type: 4, row: 0, col: 3, hp: 3 }, { type: 4, row: 0, col: 4, hp: 3 },
      { type: 4, row: 7, col: 3, hp: 3 }, { type: 4, row: 7, col: 4, hp: 3 },
      ...rect(1, 3, 1, 4, 2),
    ],
  },
  {
    rows: 8, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [1200, 2400, 3800],
    objectives: [{ type: 'breakIce', target: 12 }],
    obstacles: [
      { type: 4, row: 3, col: 0, hp: 3 }, { type: 4, row: 4, col: 0, hp: 3 },
      { type: 4, row: 3, col: 7, hp: 3 }, { type: 4, row: 4, col: 7, hp: 3 },
      ...rect(2, 1, 2, 2, 5),
      ...rect(1, 5, 2, 6, 5),
    ],
  },
  {
    rows: 8, cols: 8, gemCount: 6, moves: 22,
    starThresholds: [1500, 3000, 4500],
    objectives: [
      { type: 'useSpecial', target: 6 },
      { type: 'cascade', target: 4 },
    ],
    obstacles: [
      { type: 4, row: 2, col: 2, hp: 4 }, { type: 4, row: 2, col: 5, hp: 4 },
      { type: 4, row: 5, col: 2, hp: 4 }, { type: 4, row: 5, col: 5, hp: 4 },
      ...rect(3, 3, 3, 4, 4),
    ],
  },
  // Mini boss
  {
    rows: 8, cols: 8, gemCount: 6, moves: 30,
    starThresholds: [1800, 3600, 5500],
    objectives: [{ type: 'boss', target: 1 }],
    obstacles: [
      { type: 4, row: 0, col: 0, hp: 5 }, { type: 4, row: 0, col: 7, hp: 5 },
      { type: 4, row: 7, col: 0, hp: 5 }, { type: 4, row: 7, col: 7, hp: 5 },
      ...rect(1, 3, 2, 4, 5),
    ],
    isMiniBoss: true,
  },
  {
    rows: 8, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [1600, 3200, 5000],
    objectives: [
      { type: 'score', target: 3200 },
      { type: 'breakIce', target: 16 },
    ],
    obstacles: [
      // Stone wall in center
      { type: 4, row: 3, col: 2, hp: 3 }, { type: 4, row: 3, col: 5, hp: 3 },
      { type: 4, row: 4, col: 2, hp: 3 }, { type: 4, row: 4, col: 5, hp: 3 },
      ...rect(2, 1, 1, 2, 6),
      ...rect(1, 5, 1, 6, 6),
    ],
  },
  {
    rows: 9, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [2000, 4000, 6000],
    objectives: [
      { type: 'collect', target: 30, gem: 2 },
      { type: 'useSpecial', target: 5 },
    ],
    obstacles: [
      // Horizontal stone walls
      ...rect(4, 2, 0, 2, 7, 2),
      ...rect(4, 6, 0, 6, 7, 2),
      ...rect(3, 4, 2, 4, 5),
    ],
  },
  {
    rows: 9, cols: 8, gemCount: 5, moves: 22,
    starThresholds: [2200, 4400, 6500],
    objectives: [
      { type: 'breakIce', target: 20 },
      { type: 'cascade', target: 6 },
    ],
    obstacles: [
      ...rect(4, 0, 3, 0, 4, 3),
      ...rect(4, 8, 3, 8, 4, 3),
      ...rect(2, 2, 1, 6, 6),
    ],
  },
  {
    rows: 9, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [2500, 5000, 7500],
    objectives: [
      { type: 'score', target: 5000 },
      { type: 'breakIce', target: 18 },
      { type: 'useSpecial', target: 7 },
    ],
    obstacles: [
      ...corners(4, 9, 8, 2, 3),
      ...rect(2, 3, 2, 5, 5),
    ],
  },
  // World boss
  {
    rows: 9, cols: 8, gemCount: 6, moves: 35,
    starThresholds: [3000, 6000, 9000],
    objectives: [{ type: 'boss', target: 1 }],
    obstacles: [
      ...rect(4, 0, 0, 0, 7, 4),
      ...rect(4, 8, 0, 8, 7, 4),
      ...rect(3, 4, 0, 4, 7),
    ],
    isBoss: true,
  },
];

// ===== WORLD 4: SPACE STATION 🚀 (Dark tiles introduced) =====
const world4 = [
  {
    rows: 8, cols: 8, gemCount: 6, moves: 28,
    starThresholds: [1000, 2000, 3200],
    objectives: [{ type: 'lightTiles', target: 6 }],
    obstacles: [
      { type: 5, row: 2, col: 2 }, { type: 5, row: 2, col: 5 },
      { type: 5, row: 5, col: 2 }, { type: 5, row: 5, col: 5 },
      { type: 5, row: 3, col: 3 }, { type: 5, row: 4, col: 4 },
    ],
  },
  {
    rows: 8, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [1200, 2400, 3800],
    objectives: [
      { type: 'lightTiles', target: 10 },
      { type: 'score', target: 1200 },
    ],
    obstacles: [
      ...checkerboard(5, 1, 1, 6, 6),
    ],
  },
  {
    rows: 8, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [1400, 2800, 4200],
    objectives: [
      { type: 'breakIce', target: 8 },
      { type: 'lightTiles', target: 8 },
    ],
    obstacles: [
      ...rect(5, 0, 0, 2, 3),
      ...rect(1, 0, 4, 2, 7),
      ...rect(1, 5, 0, 7, 3),
      ...rect(5, 5, 4, 7, 7),
    ],
  },
  {
    rows: 8, cols: 8, gemCount: 6, moves: 22,
    starThresholds: [1800, 3600, 5500],
    objectives: [
      { type: 'lightTiles', target: 14 },
      { type: 'useSpecial', target: 5 },
    ],
    obstacles: [
      ...rect(5, 1, 1, 6, 6),
      { type: 4, row: 3, col: 0, hp: 3 }, { type: 4, row: 4, col: 7, hp: 3 },
    ],
  },
  // Mini boss
  {
    rows: 8, cols: 8, gemCount: 6, moves: 30,
    starThresholds: [2000, 4000, 6000],
    objectives: [{ type: 'boss', target: 1 }],
    obstacles: [
      ...rect(5, 0, 0, 1, 7),
      ...rect(5, 6, 0, 7, 7),
      ...rect(3, 3, 2, 4, 5),
    ],
    isMiniBoss: true,
  },
  {
    rows: 8, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [1800, 3600, 5500],
    objectives: [
      { type: 'collect', target: 25, gem: 5 },
      { type: 'lightTiles', target: 12 },
    ],
    obstacles: [
      ...diamond(5, 3, 3, 2),
      ...rect(4, 0, 0, 0, 1, 3), ...rect(4, 0, 6, 0, 7, 3),
    ],
  },
  {
    rows: 9, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [2200, 4400, 6500],
    objectives: [
      { type: 'score', target: 4400 },
      { type: 'lightTiles', target: 16 },
    ],
    obstacles: [
      ...rect(5, 0, 0, 2, 7),
      ...rect(5, 6, 0, 8, 7),
      ...rect(4, 4, 3, 4, 4, 4),
    ],
  },
  {
    rows: 9, cols: 8, gemCount: 5, moves: 22,
    starThresholds: [2500, 5000, 7500],
    objectives: [
      { type: 'breakIce', target: 12 },
      { type: 'lightTiles', target: 18 },
      { type: 'cascade', target: 5 },
    ],
    obstacles: [
      ...checkerboard(5, 0, 0, 8, 7),
      ...rect(2, 4, 2, 4, 5),
    ],
  },
  {
    rows: 9, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [3000, 6000, 9000],
    objectives: [
      { type: 'lightTiles', target: 22 },
      { type: 'useSpecial', target: 8 },
    ],
    obstacles: [
      ...rect(5, 0, 0, 8, 7),
    ],
  },
  // World boss
  {
    rows: 9, cols: 8, gemCount: 6, moves: 35,
    starThresholds: [3500, 7000, 10000],
    objectives: [{ type: 'boss', target: 1 }],
    obstacles: [
      ...rect(5, 0, 0, 3, 7),
      ...corners(4, 9, 8, 2, 4),
      ...rect(3, 5, 2, 7, 5),
    ],
    isBoss: true,
  },
];

// ===== WORLD 5: MUSIC HALL 🎵 (Bomb timers introduced) =====
const world5 = [
  {
    rows: 8, cols: 8, gemCount: 6, moves: 28,
    starThresholds: [1200, 2400, 3800],
    objectives: [{ type: 'defuse', target: 3 }],
    obstacles: [
      { type: 7, row: 2, col: 2 }, { type: 7, row: 2, col: 5 },
      { type: 7, row: 5, col: 3 },
    ],
  },
  {
    rows: 8, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [1500, 3000, 4500],
    objectives: [
      { type: 'defuse', target: 5 },
      { type: 'score', target: 1500 },
    ],
    obstacles: [
      { type: 7, row: 1, col: 1 }, { type: 7, row: 1, col: 6 },
      { type: 7, row: 3, col: 3 }, { type: 7, row: 4, col: 4 },
      { type: 7, row: 6, col: 2 },
    ],
  },
  {
    rows: 8, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [1800, 3600, 5500],
    objectives: [
      { type: 'breakIce', target: 10 },
      { type: 'defuse', target: 4 },
    ],
    obstacles: [
      ...rect(1, 2, 2, 5, 5),
      { type: 7, row: 0, col: 0 }, { type: 7, row: 0, col: 7 },
      { type: 7, row: 7, col: 0 }, { type: 7, row: 7, col: 7 },
    ],
  },
  {
    rows: 8, cols: 8, gemCount: 6, moves: 22,
    starThresholds: [2000, 4000, 6000],
    objectives: [
      { type: 'defuse', target: 6 },
      { type: 'useSpecial', target: 5 },
    ],
    obstacles: [
      { type: 7, row: 1, col: 2 }, { type: 7, row: 1, col: 5 },
      { type: 7, row: 3, col: 1 }, { type: 7, row: 3, col: 6 },
      { type: 7, row: 5, col: 2 }, { type: 7, row: 5, col: 5 },
      ...rect(3, 3, 3, 4, 4),
    ],
  },
  // Mini boss
  {
    rows: 8, cols: 8, gemCount: 6, moves: 30,
    starThresholds: [2500, 5000, 7500],
    objectives: [{ type: 'boss', target: 1 }],
    obstacles: [
      { type: 7, row: 0, col: 3 }, { type: 7, row: 0, col: 4 },
      { type: 7, row: 7, col: 3 }, { type: 7, row: 7, col: 4 },
      ...rect(5, 2, 2, 5, 5),
    ],
    isMiniBoss: true,
  },
  {
    rows: 9, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [2200, 4400, 6500],
    objectives: [
      { type: 'defuse', target: 8 },
      { type: 'lightTiles', target: 10 },
    ],
    obstacles: [
      { type: 7, row: 0, col: 0 }, { type: 7, row: 0, col: 7 },
      { type: 7, row: 2, col: 3 }, { type: 7, row: 2, col: 4 },
      { type: 7, row: 4, col: 1 }, { type: 7, row: 4, col: 6 },
      { type: 7, row: 6, col: 3 }, { type: 7, row: 6, col: 4 },
      ...rect(5, 3, 2, 5, 5),
    ],
  },
  {
    rows: 9, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [2500, 5000, 7800],
    objectives: [
      { type: 'score', target: 5000 },
      { type: 'defuse', target: 6 },
      { type: 'cascade', target: 5 },
    ],
    obstacles: [
      { type: 7, row: 1, col: 1 }, { type: 7, row: 1, col: 6 },
      { type: 7, row: 4, col: 0 }, { type: 7, row: 4, col: 7 },
      { type: 7, row: 7, col: 2 }, { type: 7, row: 7, col: 5 },
      ...rect(4, 3, 3, 5, 4, 3),
    ],
  },
  {
    rows: 9, cols: 8, gemCount: 5, moves: 22,
    starThresholds: [3000, 6000, 9000],
    objectives: [
      { type: 'defuse', target: 10 },
      { type: 'breakIce', target: 12 },
    ],
    obstacles: [
      ...checkerboard(7, 0, 0, 2, 7),
      ...rect(2, 6, 0, 8, 7),
      ...checkerboard(7, 6, 0, 8, 7),
    ],
  },
  {
    rows: 9, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [3500, 7000, 10000],
    objectives: [
      { type: 'defuse', target: 8 },
      { type: 'lightTiles', target: 15 },
      { type: 'useSpecial', target: 8 },
    ],
    obstacles: [
      ...diamond(7, 4, 3, 2),
      ...rect(5, 0, 0, 1, 7),
      ...rect(5, 7, 0, 8, 7),
    ],
  },
  // World boss
  {
    rows: 9, cols: 8, gemCount: 6, moves: 35,
    starThresholds: [4000, 8000, 12000],
    objectives: [{ type: 'boss', target: 1 }],
    obstacles: [
      ...border(7, 9, 8),
      ...rect(5, 3, 2, 5, 5),
      ...rect(4, 4, 3, 4, 4, 5),
    ],
    isBoss: true,
  },
];

// ===== WORLD 6: CANDY LAND 🍬 (Portals & Conveyors) =====
const world6 = [
  {
    rows: 8, cols: 8, gemCount: 6, moves: 28,
    starThresholds: [1400, 2800, 4200],
    objectives: [{ type: 'score', target: 1400 }],
    obstacles: [
      { type: 8, row: 2, col: 2 }, { type: 8, row: 5, col: 5 },
      { type: 9, row: 3, col: 3 }, { type: 10, row: 4, col: 4 },
    ],
  },
  {
    rows: 8, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [1800, 3600, 5500],
    objectives: [
      { type: 'collect', target: 25, gem: 0 },
      { type: 'score', target: 1800 },
    ],
    obstacles: [
      { type: 9, row: 0, col: 2 }, { type: 9, row: 0, col: 5 },
      { type: 10, row: 7, col: 2 }, { type: 10, row: 7, col: 5 },
      { type: 8, row: 3, col: 0 }, { type: 8, row: 3, col: 7 },
    ],
  },
  {
    rows: 8, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [2000, 4000, 6000],
    objectives: [
      { type: 'breakIce', target: 10 },
      { type: 'clearBottom', target: 8 },
    ],
    obstacles: [
      ...rect(9, 0, 0, 0, 7),
      ...rect(10, 7, 0, 7, 7),
      ...rect(1, 3, 2, 4, 5),
    ],
  },
  {
    rows: 8, cols: 8, gemCount: 6, moves: 22,
    starThresholds: [2400, 4800, 7000],
    objectives: [
      { type: 'useSpecial', target: 6 },
      { type: 'cascade', target: 5 },
    ],
    obstacles: [
      { type: 8, row: 0, col: 0 }, { type: 8, row: 0, col: 7 },
      { type: 8, row: 7, col: 0 }, { type: 8, row: 7, col: 7 },
      { type: 9, row: 2, col: 3 }, { type: 9, row: 2, col: 4 },
      { type: 10, row: 5, col: 3 }, { type: 10, row: 5, col: 4 },
      ...rect(3, 3, 2, 4, 5),
    ],
  },
  // Mini boss
  {
    rows: 8, cols: 8, gemCount: 6, moves: 30,
    starThresholds: [2800, 5500, 8500],
    objectives: [{ type: 'boss', target: 1 }],
    obstacles: [
      ...rect(9, 0, 0, 0, 7),
      ...rect(10, 7, 0, 7, 7),
      ...rect(8, 3, 0, 3, 7),
      ...rect(5, 1, 2, 2, 5),
    ],
    isMiniBoss: true,
  },
  {
    rows: 9, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [2500, 5000, 7500],
    objectives: [
      { type: 'score', target: 5000 },
      { type: 'defuse', target: 4 },
    ],
    obstacles: [
      { type: 8, row: 1, col: 1 }, { type: 8, row: 1, col: 6 },
      { type: 8, row: 7, col: 1 }, { type: 8, row: 7, col: 6 },
      { type: 7, row: 3, col: 0 }, { type: 7, row: 3, col: 7 },
      { type: 7, row: 5, col: 0 }, { type: 7, row: 5, col: 7 },
      ...rect(9, 0, 3, 0, 4),
      ...rect(10, 8, 3, 8, 4),
    ],
  },
  {
    rows: 9, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [3000, 6000, 9000],
    objectives: [
      { type: 'lightTiles', target: 16 },
      { type: 'clearBottom', target: 10 },
    ],
    obstacles: [
      ...rect(5, 2, 0, 4, 7),
      ...rect(9, 0, 2, 0, 5),
      ...rect(10, 8, 2, 8, 5),
    ],
  },
  {
    rows: 9, cols: 8, gemCount: 5, moves: 22,
    starThresholds: [3500, 7000, 10000],
    objectives: [
      { type: 'breakIce', target: 16 },
      { type: 'cascade', target: 6 },
      { type: 'useSpecial', target: 7 },
    ],
    obstacles: [
      ...rect(2, 0, 0, 2, 7),
      ...rect(8, 4, 0, 4, 7),
      ...rect(1, 6, 0, 8, 7),
    ],
  },
  {
    rows: 9, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [4000, 8000, 12000],
    objectives: [
      { type: 'score', target: 8000 },
      { type: 'defuse', target: 6 },
      { type: 'lightTiles', target: 14 },
    ],
    obstacles: [
      ...diamond(8, 4, 3, 2),
      ...rect(5, 0, 0, 1, 7),
      ...rect(5, 7, 0, 8, 7),
      { type: 7, row: 4, col: 0 }, { type: 7, row: 4, col: 7 },
      { type: 7, row: 2, col: 3 }, { type: 7, row: 2, col: 4 },
      { type: 7, row: 6, col: 3 }, { type: 7, row: 6, col: 4 },
    ],
  },
  // World boss
  {
    rows: 9, cols: 8, gemCount: 6, moves: 35,
    starThresholds: [4500, 9000, 13000],
    objectives: [{ type: 'boss', target: 1 }],
    obstacles: [
      ...rect(9, 0, 0, 0, 7),
      ...rect(10, 8, 0, 8, 7),
      ...border(8, 9, 8),
      ...rect(4, 4, 3, 4, 4, 5),
    ],
    isBoss: true,
  },
];

// ===== WORLD 7: ELEMENT LAB 🧪 (Shadow & Lock) =====
const world7 = [
  {
    rows: 8, cols: 8, gemCount: 6, moves: 28,
    starThresholds: [1600, 3200, 5000],
    objectives: [{ type: 'score', target: 1600 }],
    obstacles: [
      { type: 12, row: 2, col: 2 }, { type: 12, row: 2, col: 5 },
      { type: 12, row: 5, col: 2 }, { type: 12, row: 5, col: 5 },
      { type: 6, row: 3, col: 3 }, { type: 6, row: 4, col: 4 },
    ],
  },
  {
    rows: 8, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [2000, 4000, 6000],
    objectives: [
      { type: 'score', target: 2000 },
      { type: 'collect', target: 20, gem: 3 },
    ],
    obstacles: [
      ...rect(6, 2, 2, 5, 5),
      { type: 12, row: 0, col: 3 }, { type: 12, row: 0, col: 4 },
      { type: 12, row: 7, col: 3 }, { type: 12, row: 7, col: 4 },
    ],
  },
  {
    rows: 8, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [2400, 4800, 7200],
    objectives: [
      { type: 'breakIce', target: 12 },
      { type: 'lightTiles', target: 8 },
    ],
    obstacles: [
      ...rect(12, 0, 0, 1, 7),
      ...rect(2, 3, 2, 4, 5),
      ...rect(6, 6, 2, 7, 5),
    ],
  },
  {
    rows: 8, cols: 8, gemCount: 6, moves: 22,
    starThresholds: [2800, 5500, 8500],
    objectives: [
      { type: 'useSpecial', target: 7 },
      { type: 'defuse', target: 4 },
    ],
    obstacles: [
      ...checkerboard(12, 0, 0, 7, 7),
      { type: 7, row: 3, col: 3 }, { type: 7, row: 3, col: 4 },
      { type: 7, row: 4, col: 3 }, { type: 7, row: 4, col: 4 },
    ],
  },
  // Mini boss
  {
    rows: 8, cols: 8, gemCount: 6, moves: 30,
    starThresholds: [3000, 6000, 9000],
    objectives: [{ type: 'boss', target: 1 }],
    obstacles: [
      ...rect(12, 0, 0, 2, 7),
      ...rect(6, 5, 0, 7, 7),
      ...rect(4, 3, 3, 4, 4, 4),
    ],
    isMiniBoss: true,
  },
  {
    rows: 9, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [2800, 5500, 8500],
    objectives: [
      { type: 'lightTiles', target: 14 },
      { type: 'breakIce', target: 14 },
    ],
    obstacles: [
      ...rect(5, 0, 0, 2, 3), ...rect(12, 0, 4, 2, 7),
      ...rect(2, 6, 0, 8, 3), ...rect(6, 6, 4, 8, 7),
    ],
  },
  {
    rows: 9, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [3200, 6500, 9500],
    objectives: [
      { type: 'score', target: 6500 },
      { type: 'defuse', target: 6 },
      { type: 'cascade', target: 6 },
    ],
    obstacles: [
      ...diamond(12, 4, 3, 3),
      { type: 7, row: 0, col: 0 }, { type: 7, row: 0, col: 7 },
      { type: 7, row: 4, col: 0 }, { type: 7, row: 4, col: 7 },
      { type: 7, row: 8, col: 0 }, { type: 7, row: 8, col: 7 },
    ],
  },
  {
    rows: 9, cols: 8, gemCount: 5, moves: 22,
    starThresholds: [3800, 7500, 11000],
    objectives: [
      { type: 'breakIce', target: 18 },
      { type: 'lightTiles', target: 18 },
      { type: 'useSpecial', target: 8 },
    ],
    obstacles: [
      ...rect(2, 0, 0, 2, 7),
      ...rect(5, 3, 0, 5, 7),
      ...rect(6, 6, 0, 8, 7),
    ],
  },
  {
    rows: 9, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [4500, 9000, 13000],
    objectives: [
      { type: 'score', target: 9000 },
      { type: 'defuse', target: 8 },
      { type: 'lightTiles', target: 20 },
    ],
    obstacles: [
      ...rect(12, 0, 0, 8, 7),
      ...rect(4, 4, 2, 4, 5, 4),
      { type: 7, row: 2, col: 1 }, { type: 7, row: 2, col: 6 },
      { type: 7, row: 4, col: 0 }, { type: 7, row: 4, col: 7 },
      { type: 7, row: 6, col: 1 }, { type: 7, row: 6, col: 6 },
      ...rect(7, 0, 3, 0, 4),
      ...rect(7, 8, 3, 8, 4),
    ],
  },
  // World boss
  {
    rows: 9, cols: 8, gemCount: 6, moves: 35,
    starThresholds: [5000, 10000, 15000],
    objectives: [{ type: 'boss', target: 1 }],
    obstacles: [
      ...rect(12, 0, 0, 2, 7),
      ...rect(6, 6, 0, 8, 7),
      ...rect(4, 4, 0, 4, 7, 5),
      { type: 7, row: 3, col: 2 }, { type: 7, row: 3, col: 5 },
      { type: 7, row: 5, col: 2 }, { type: 7, row: 5, col: 5 },
    ],
    isBoss: true,
  },
];

// ===== WORLD 8: BOOK LIBRARY 📚 (Cage & Moss) =====
const world8 = [
  {
    rows: 8, cols: 8, gemCount: 6, moves: 28,
    starThresholds: [2000, 4000, 6000],
    objectives: [{ type: 'freeCaged', target: 4 }],
    obstacles: [
      { type: 11, row: 6, col: 2 }, { type: 11, row: 6, col: 5 },
      { type: 11, row: 7, col: 3 }, { type: 11, row: 7, col: 4 },
    ],
  },
  {
    rows: 8, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [2400, 4800, 7200],
    objectives: [
      { type: 'freeCaged', target: 6 },
      { type: 'score', target: 2400 },
    ],
    obstacles: [
      ...rect(11, 5, 1, 7, 6),
      ...rect(13, 2, 2, 3, 5),
    ],
  },
  {
    rows: 8, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [2800, 5500, 8500],
    objectives: [
      { type: 'freeCaged', target: 8 },
      { type: 'breakIce', target: 10 },
    ],
    obstacles: [
      ...rect(11, 6, 0, 7, 7),
      ...rect(2, 0, 0, 1, 7),
      ...rect(13, 3, 2, 4, 5),
    ],
  },
  {
    rows: 8, cols: 8, gemCount: 6, moves: 22,
    starThresholds: [3200, 6500, 9500],
    objectives: [
      { type: 'useSpecial', target: 8 },
      { type: 'freeCaged', target: 6 },
      { type: 'defuse', target: 3 },
    ],
    obstacles: [
      ...rect(11, 5, 0, 7, 7),
      { type: 7, row: 2, col: 2 }, { type: 7, row: 2, col: 5 }, { type: 7, row: 4, col: 3 },
      ...rect(13, 3, 1, 3, 6),
    ],
  },
  // Mini boss
  {
    rows: 8, cols: 8, gemCount: 6, moves: 30,
    starThresholds: [3500, 7000, 10000],
    objectives: [{ type: 'boss', target: 1 }],
    obstacles: [
      ...rect(11, 5, 0, 7, 7),
      ...rect(4, 3, 2, 3, 5, 3),
      ...rect(12, 0, 0, 1, 7),
    ],
    isMiniBoss: true,
  },
  {
    rows: 9, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [3200, 6500, 10000],
    objectives: [
      { type: 'freeCaged', target: 10 },
      { type: 'lightTiles', target: 12 },
    ],
    obstacles: [
      ...rect(11, 6, 0, 8, 7),
      ...rect(5, 0, 0, 2, 7),
      ...rect(13, 4, 0, 5, 7),
    ],
  },
  {
    rows: 9, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [3800, 7500, 11500],
    objectives: [
      { type: 'score', target: 7500 },
      { type: 'freeCaged', target: 8 },
      { type: 'cascade', target: 7 },
    ],
    obstacles: [
      ...rect(11, 7, 0, 8, 7),
      ...rect(6, 4, 0, 5, 7),
      ...rect(3, 2, 2, 2, 5),
    ],
  },
  {
    rows: 9, cols: 8, gemCount: 5, moves: 22,
    starThresholds: [4500, 9000, 13000],
    objectives: [
      { type: 'freeCaged', target: 12 },
      { type: 'breakIce', target: 16 },
      { type: 'useSpecial', target: 10 },
    ],
    obstacles: [
      ...rect(11, 6, 0, 8, 7),
      ...rect(2, 0, 0, 2, 7),
      ...rect(13, 3, 0, 5, 7),
    ],
  },
  {
    rows: 9, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [5000, 10000, 15000],
    objectives: [
      { type: 'freeCaged', target: 14 },
      { type: 'defuse', target: 6 },
      { type: 'lightTiles', target: 16 },
    ],
    obstacles: [
      ...rect(11, 6, 0, 8, 7),
      ...checkerboard(7, 0, 0, 2, 7),
      ...rect(5, 3, 0, 5, 7),
    ],
  },
  // World boss
  {
    rows: 9, cols: 8, gemCount: 6, moves: 35,
    starThresholds: [6000, 12000, 18000],
    objectives: [{ type: 'boss', target: 1 }],
    obstacles: [
      ...rect(11, 7, 0, 8, 7),
      ...rect(12, 0, 0, 2, 7),
      ...rect(4, 4, 2, 4, 5, 5),
      ...rect(6, 5, 0, 6, 7),
    ],
    isBoss: true,
  },
];

// ===== WORLD 9: DIAMOND PALACE 💎 (All obstacles — Ultimate challenge) =====
const world9 = [
  {
    rows: 8, cols: 8, gemCount: 6, moves: 28,
    starThresholds: [2500, 5000, 7500],
    objectives: [
      { type: 'score', target: 2500 },
      { type: 'breakIce', target: 8 },
    ],
    obstacles: [
      ...rect(2, 0, 0, 0, 7),
      ...rect(3, 7, 0, 7, 7),
      { type: 4, row: 3, col: 3, hp: 3 }, { type: 4, row: 4, col: 4, hp: 3 },
    ],
  },
  {
    rows: 8, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [3000, 6000, 9000],
    objectives: [
      { type: 'lightTiles', target: 12 },
      { type: 'defuse', target: 4 },
    ],
    obstacles: [
      ...rect(5, 1, 1, 6, 6),
      { type: 7, row: 0, col: 0 }, { type: 7, row: 0, col: 7 },
      { type: 7, row: 7, col: 0 }, { type: 7, row: 7, col: 7 },
      { type: 4, row: 3, col: 0, hp: 4 }, { type: 4, row: 4, col: 7, hp: 4 },
    ],
  },
  {
    rows: 9, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [3500, 7000, 10000],
    objectives: [
      { type: 'breakIce', target: 14 },
      { type: 'freeCaged', target: 6 },
    ],
    obstacles: [
      ...rect(2, 0, 0, 2, 7),
      ...rect(11, 6, 0, 8, 7),
      ...rect(4, 4, 3, 4, 4, 4),
    ],
  },
  {
    rows: 9, cols: 8, gemCount: 6, moves: 22,
    starThresholds: [4000, 8000, 12000],
    objectives: [
      { type: 'useSpecial', target: 10 },
      { type: 'cascade', target: 7 },
      { type: 'score', target: 8000 },
    ],
    obstacles: [
      ...checkerboard(12, 0, 0, 8, 7),
      ...rect(6, 3, 2, 5, 5),
      { type: 7, row: 1, col: 3 }, { type: 7, row: 7, col: 4 },
    ],
  },
  // Mini boss
  {
    rows: 9, cols: 8, gemCount: 6, moves: 30,
    starThresholds: [4500, 9000, 14000],
    objectives: [{ type: 'boss', target: 1 }],
    obstacles: [
      ...rect(2, 0, 0, 1, 7),
      ...rect(5, 2, 0, 3, 7),
      ...rect(6, 5, 0, 6, 7),
      ...rect(11, 7, 0, 8, 7),
      { type: 4, row: 4, col: 3, hp: 5 }, { type: 4, row: 4, col: 4, hp: 5 },
    ],
    isMiniBoss: true,
  },
  {
    rows: 9, cols: 8, gemCount: 7, moves: 25,
    starThresholds: [4000, 8000, 12000],
    objectives: [
      { type: 'breakIce', target: 16 },
      { type: 'lightTiles', target: 14 },
      { type: 'defuse', target: 5 },
    ],
    obstacles: [
      ...rect(2, 0, 0, 1, 7),
      ...rect(5, 3, 0, 4, 7),
      ...rect(12, 6, 0, 7, 7),
      { type: 7, row: 2, col: 1 }, { type: 7, row: 2, col: 6 },
      { type: 7, row: 5, col: 1 }, { type: 7, row: 5, col: 6 },
      { type: 7, row: 8, col: 3 },
    ],
  },
  {
    rows: 9, cols: 8, gemCount: 6, moves: 25,
    starThresholds: [5000, 10000, 15000],
    objectives: [
      { type: 'score', target: 10000 },
      { type: 'freeCaged', target: 10 },
      { type: 'cascade', target: 8 },
    ],
    obstacles: [
      ...rect(11, 7, 0, 8, 7),
      ...diamond(4, 4, 3, 2, 4),
      ...checkerboard(3, 0, 0, 2, 7),
      ...rect(5, 5, 0, 6, 7),
    ],
  },
  {
    rows: 9, cols: 8, gemCount: 6, moves: 22,
    starThresholds: [5500, 11000, 16000],
    objectives: [
      { type: 'breakIce', target: 20 },
      { type: 'freeCaged', target: 12 },
      { type: 'useSpecial', target: 12 },
    ],
    obstacles: [
      ...rect(2, 0, 0, 2, 7),
      ...rect(11, 6, 0, 8, 7),
      ...rect(6, 3, 0, 5, 7),
      { type: 4, row: 4, col: 0, hp: 5 }, { type: 4, row: 4, col: 7, hp: 5 },
    ],
  },
  {
    rows: 9, cols: 8, gemCount: 7, moves: 25,
    starThresholds: [6000, 12000, 18000],
    objectives: [
      { type: 'score', target: 12000 },
      { type: 'lightTiles', target: 22 },
      { type: 'defuse', target: 8 },
      { type: 'freeCaged', target: 10 },
    ],
    obstacles: [
      ...rect(5, 0, 0, 8, 7),
      ...rect(11, 7, 0, 8, 7),
      ...border(7, 9, 8),
      ...rect(4, 4, 3, 4, 4, 5),
    ],
  },
  // FINAL WORLD BOSS
  {
    rows: 9, cols: 8, gemCount: 7, moves: 40,
    starThresholds: [8000, 16000, 25000],
    objectives: [{ type: 'boss', target: 1 }],
    obstacles: [
      ...rect(2, 0, 0, 1, 7),
      ...rect(5, 2, 0, 3, 7),
      ...rect(12, 5, 0, 6, 7),
      ...rect(11, 7, 0, 8, 7),
      ...rect(4, 4, 2, 4, 5, 5),
      { type: 7, row: 0, col: 3 }, { type: 7, row: 0, col: 4 },
      { type: 7, row: 8, col: 3 }, { type: 7, row: 8, col: 4 },
    ],
    isBoss: true,
  },
];

export const WORLDS = [
  world0, world1, world2, world3, world4,
  world5, world6, world7, world8, world9,
];
