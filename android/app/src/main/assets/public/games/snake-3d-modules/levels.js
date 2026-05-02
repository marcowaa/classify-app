// ═══════════════════════════════════════════════════════
// 🐍 Snake 3D — Levels (V3 Fruit Adventure)
// Wall patterns, fruit spawning, moving walls, thorns
// ═══════════════════════════════════════════════════════

import { GRID_COLS, GRID_ROWS, FRUIT_TYPES, LEVEL_CONFIG } from './config.js';

// ─── Safe Zone (snake start area) ───────────────────
const SAFE_MIN = 4, SAFE_MAX = 9;
function isSafe(x, y) {
  return x >= SAFE_MIN && x <= SAFE_MAX && y >= SAFE_MIN && y <= SAFE_MAX;
}

// ─── Static Wall Patterns per Level ─────────────────
const WALL_PATTERNS = [
  // L1: no walls
  [],
  // L2: no walls
  [],
  // L3: simple wall pairs (8 cells)
  [
    {x:3,y:3},{x:4,y:3},{x:9,y:3},{x:10,y:3},
    {x:3,y:10},{x:4,y:10},{x:9,y:10},{x:10,y:10},
  ],
  // L4: border segments + pillars (14 cells)
  [
    {x:0,y:6},{x:0,y:7},{x:13,y:6},{x:13,y:7},
    {x:6,y:0},{x:7,y:0},{x:6,y:13},{x:7,y:13},
    {x:3,y:3},{x:10,y:3},{x:3,y:10},{x:10,y:10},
    {x:3,y:6},{x:10,y:7},
  ],
  // L5: corridors (18 cells)
  [
    {x:2,y:2},{x:3,y:2},{x:10,y:2},{x:11,y:2},
    {x:2,y:3},{x:11,y:3},
    {x:2,y:10},{x:11,y:10},
    {x:2,y:11},{x:3,y:11},{x:10,y:11},{x:11,y:11},
    {x:1,y:6},{x:1,y:7},{x:12,y:6},{x:12,y:7},
    {x:6,y:1},{x:7,y:12},
  ],
  // L6: L-shapes + narrows (22 cells)
  [
    {x:1,y:1},{x:2,y:1},{x:1,y:2},
    {x:11,y:1},{x:12,y:1},{x:12,y:2},
    {x:1,y:11},{x:1,y:12},{x:2,y:12},
    {x:12,y:11},{x:11,y:12},{x:12,y:12},
    {x:3,y:6},{x:3,y:7},{x:10,y:6},{x:10,y:7},
    {x:6,y:3},{x:7,y:3},{x:6,y:10},{x:7,y:10},
    {x:0,y:4},{x:13,y:9},
  ],
  // L7: dense walls (26 cells)
  [
    {x:1,y:2},{x:2,y:2},{x:3,y:2},
    {x:10,y:2},{x:11,y:2},{x:12,y:2},
    {x:1,y:11},{x:2,y:11},{x:3,y:11},
    {x:10,y:11},{x:11,y:11},{x:12,y:11},
    {x:2,y:5},{x:2,y:6},{x:11,y:7},{x:11,y:8},
    {x:0,y:4},{x:0,y:9},{x:13,y:4},{x:13,y:9},
    {x:4,y:0},{x:9,y:0},{x:4,y:13},{x:9,y:13},
    {x:3,y:7},{x:10,y:6},
  ],
  // L8: maze (30 cells)
  [
    {x:1,y:1},{x:2,y:1},{x:11,y:1},{x:12,y:1},
    {x:1,y:12},{x:2,y:12},{x:11,y:12},{x:12,y:12},
    {x:1,y:4},{x:1,y:5},{x:12,y:4},{x:12,y:5},
    {x:1,y:8},{x:1,y:9},{x:12,y:8},{x:12,y:9},
    {x:4,y:1},{x:4,y:2},{x:9,y:1},{x:9,y:2},
    {x:4,y:11},{x:4,y:12},{x:9,y:11},{x:9,y:12},
    {x:3,y:3},{x:10,y:3},{x:3,y:10},{x:10,y:10},
    {x:0,y:7},{x:13,y:6},
  ],
  // L9: endless — moderate (20 cells, regenerated)
  [
    {x:2,y:2},{x:11,y:2},{x:2,y:11},{x:11,y:11},
    {x:1,y:6},{x:1,y:7},{x:12,y:6},{x:12,y:7},
    {x:6,y:1},{x:7,y:1},{x:6,y:12},{x:7,y:12},
    {x:3,y:4},{x:10,y:4},{x:3,y:9},{x:10,y:9},
    {x:0,y:3},{x:13,y:3},{x:0,y:10},{x:13,y:10},
  ],
];

// ─── Moving Wall Groups per Level ───────────────────
const MOVING_WALL_CONFIGS = [
  null, null, null,  // L1-3
  // L4: 1 group
  [
    { cells: [{x:6,y:4},{x:7,y:4}], axis: 'y', min: 2, max: 4, speed: 4500, dir: 1 },
  ],
  // L5: 2 groups
  [
    { cells: [{x:5,y:3}], axis: 'x', min: 4, max: 8, speed: 4000, dir: 1 },
    { cells: [{x:8,y:10}], axis: 'x', min: 5, max: 9, speed: 4000, dir: -1 },
  ],
  // L6: 3 groups
  [
    { cells: [{x:5,y:2}], axis: 'x', min: 4, max: 9, speed: 3500, dir: 1 },
    { cells: [{x:8,y:11}], axis: 'x', min: 4, max: 9, speed: 3500, dir: -1 },
    { cells: [{x:6,y:6},{x:7,y:7}], axis: 'y', min: 4, max: 9, speed: 4000, dir: 1 },
  ],
  // L7: 3 groups (faster)
  [
    { cells: [{x:5,y:4}], axis: 'x', min: 4, max: 9, speed: 3000, dir: 1 },
    { cells: [{x:8,y:9}], axis: 'x', min: 4, max: 9, speed: 3000, dir: -1 },
    { cells: [{x:6,y:5}], axis: 'y', min: 3, max: 10, speed: 2800, dir: 1 },
  ],
  // L8: 4 groups
  [
    { cells: [{x:6,y:3}], axis: 'x', min: 3, max: 10, speed: 2500, dir: 1 },
    { cells: [{x:7,y:10}], axis: 'x', min: 3, max: 10, speed: 2500, dir: -1 },
    { cells: [{x:3,y:6}], axis: 'y', min: 3, max: 10, speed: 2800, dir: 1 },
    { cells: [{x:10,y:7}], axis: 'y', min: 3, max: 10, speed: 2800, dir: -1 },
  ],
  // L9: 3 groups
  [
    { cells: [{x:5,y:3}], axis: 'x', min: 3, max: 10, speed: 3000, dir: 1 },
    { cells: [{x:8,y:10}], axis: 'x', min: 3, max: 10, speed: 3000, dir: -1 },
    { cells: [{x:4,y:6}], axis: 'y', min: 3, max: 10, speed: 3200, dir: 1 },
  ],
];

// ─── Thorn Positions (L7+) ─────────────────────────
const THORN_CONFIGS = [
  null, null, null, null, null, null,  // L1-6
  // L7: 4 thorns
  [ {x:4,y:4},{x:9,y:4},{x:4,y:9},{x:9,y:9} ],
  // L8: 6 thorns
  [ {x:3,y:5},{x:10,y:5},{x:3,y:8},{x:10,y:8},{x:6,y:3},{x:7,y:10} ],
  // L9: 6 thorns
  [ {x:4,y:3},{x:9,y:3},{x:4,y:10},{x:9,y:10},{x:2,y:6},{x:11,y:7} ],
];
export const THORN_TOGGLE_MS = 3000;

// ─── Public API ─────────────────────────────────────

/** Get static wall positions for a level (0-indexed). */
export function getStaticWalls(levelIdx) {
  return (WALL_PATTERNS[levelIdx] || []).map(w => ({ ...w }));
}

/** Get moving wall group configs for a level (deep copy). */
export function getMovingWallGroups(levelIdx) {
  const cfg = MOVING_WALL_CONFIGS[levelIdx];
  if (!cfg) return [];
  return cfg.map(g => ({
    cells: g.cells.map(c => ({ ...c })),
    axis: g.axis,
    min: g.min,
    max: g.max,
    speed: g.speed,
    dir: g.dir,
    _offset: 0,
    _timer: 0,
  }));
}

/** Get thorn positions for a level (deep copy). */
export function getThornPositions(levelIdx) {
  const cfg = THORN_CONFIGS[levelIdx];
  if (!cfg) return [];
  return cfg.map(t => ({ ...t, active: true }));
}

/** Pick a random fruit type from the level's available fruits (weighted). */
export function pickFruit(levelIdx) {
  const lvl = LEVEL_CONFIG[levelIdx];
  const available = FRUIT_TYPES.filter(f => lvl.fruits.includes(f.id));
  const totalW = available.reduce((s, f) => s + f.weight, 0);
  let r = Math.random() * totalW;
  for (const f of available) {
    r -= f.weight;
    if (r <= 0) return { ...f };
  }
  return { ...available[0] };
}

/** Find a random empty cell that avoids walls, snake, and other occupied cells. */
export function findEmptyCell(occupied, walls) {
  const occ = new Set([...occupied, ...walls].map(p => `${p.x},${p.y}`));
  const candidates = [];
  for (let x = 0; x < GRID_COLS; x++) {
    for (let y = 0; y < GRID_ROWS; y++) {
      if (!occ.has(`${x},${y}`)) candidates.push({ x, y });
    }
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/** Regenerate walls for endless mode (shuffle some wall positions). */
export function regenerateEndlessWalls() {
  const walls = [];
  const count = 16 + Math.floor(Math.random() * 6);
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = Math.floor(Math.random() * GRID_COLS);
      y = Math.floor(Math.random() * GRID_ROWS);
    } while (isSafe(x, y) || walls.some(w => w.x === x && w.y === y));
    walls.push({ x, y });
  }
  return walls;
}
