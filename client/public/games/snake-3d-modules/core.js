// ═══════════════════════════════════════════════════════
// 🐍 Snake 3D — Core Engine (V3 Fruit Adventure)
// Game state, loops, collisions, combo, power-ups, walls
// ═══════════════════════════════════════════════════════

import {
  GRID_COLS, GRID_ROWS, LEVEL_CONFIG, TOTAL_LEVELS,
  FRUIT_TYPES, POWER_UP_TYPES, POWER_UP_SPAWN_INTERVAL,
  POWER_UP_LIFETIME, ENVIRONMENTS, SNAKE_SKINS, SNAKE_SHAPES,
  MILESTONE_INTERVAL, t, LANG, DIR
} from './config.js';

import {
  getStaticWalls, getMovingWallGroups, getThornPositions,
  pickFruit, findEmptyCell, regenerateEndlessWalls, THORN_TOGGLE_MS
} from './levels.js';

import * as UI from './ui.js';

// ─── Saved Progress ─────────────────────────────────
const SAVE_KEY = 'snake3d_fruit_progress';
let progress = {
  unlockedLevel: 0,
  skinIdx: 0,
  controlMode: 'both',
  bestScores: new Array(TOTAL_LEVELS).fill(0),
  bestStars: new Array(TOTAL_LEVELS).fill(0),
  badges: [],
  totalFruitsEver: 0,
  bestEndlessFruits: 0,
  endlessLaneRewards: {},
  endlessRewardTotal: 0,
};

const ENDLESS_LANE_FRUITS = 15;
const ENDLESS_LANE_THEMES = [
  { id: 'focus', icon: '🎯', color: '#56f08e' },
  { id: 'speed', icon: '⚡', color: '#ffd200' },
  { id: 'logic', icon: '🧠', color: '#4facfe' },
  { id: 'marathon', icon: '🏃', color: '#fa71cd' },
];

function ensureProgressShape() {
  if (!progress.bestScores || progress.bestScores.length !== TOTAL_LEVELS) {
    progress.bestScores = new Array(TOTAL_LEVELS).fill(0);
  }
  if (!progress.bestStars || progress.bestStars.length !== TOTAL_LEVELS) {
    progress.bestStars = new Array(TOTAL_LEVELS).fill(0);
  }
  if (!progress.badges) progress.badges = [];
  if (!progress.endlessLaneRewards || typeof progress.endlessLaneRewards !== 'object') {
    progress.endlessLaneRewards = {};
  }
  if (!Number.isFinite(progress.bestEndlessFruits)) progress.bestEndlessFruits = 0;
  if (!Number.isFinite(progress.endlessRewardTotal)) progress.endlessRewardTotal = 0;
}

function getLaneThemeByIndex(laneIdx) {
  return ENDLESS_LANE_THEMES[laneIdx % ENDLESS_LANE_THEMES.length];
}

function getClaimedLaneCount() {
  return Object.keys(progress.endlessLaneRewards || {}).length;
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      Object.assign(progress, saved);
    }
  } catch (e) {}
  ensureProgressShape();
}

function saveProgress() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
  } catch (e) {}
}

// ─── Badge System ───────────────────────────────────
const BADGE_DEFS = [
  { id: 'firstFruit',  check: () => progress.totalFruitsEver >= 1,          label: () => t.badgeFirstFruit },
  { id: 'combo5',      check: () => state.bestCombo >= 5,                    label: () => t.badgeCombo5 },
  { id: 'combo10',     check: () => state.bestCombo >= 10,                   label: () => t.badgeCombo10 },
  { id: 'pts100',      check: () => state.score >= 100,                      label: () => t.badge100pts },
  { id: 'pts500',      check: () => state.score >= 500,                      label: () => t.badge500pts },
  { id: 'pts1000',     check: () => state.score >= 1000,                     label: () => t.badge1000pts },
  { id: 'noDeaths',    check: () => state.deaths === 0 && state.fruitsEaten >= 5, label: () => t.badgeNoDeaths },
  { id: 'stars3',      check: () => progress.bestStars.some(s => s >= 3),    label: () => t.badge3Stars },
  { id: 'allLevels',   check: () => progress.unlockedLevel >= TOTAL_LEVELS - 1, label: () => t.badgeAllLevels },
  { id: 'endless50',   check: () => state.levelIdx === TOTAL_LEVELS - 1 && state.fruitsEaten >= 50, label: () => t.badgeEndless50 },
];

function checkBadges() {
  if (!progress.badges) progress.badges = [];
  for (const b of BADGE_DEFS) {
    if (progress.badges.includes(b.id)) continue;
    try {
      if (b.check()) {
        progress.badges.push(b.id);
        UI.playBadge();
        UI.showToast(`🏅 ${b.label()}`, '#ffd200', 2500);
        UI.spawnStarBurst(Math.floor(GRID_COLS / 2), Math.floor(GRID_ROWS / 2));
        saveProgress();
      }
    } catch (e) {}
  }
}

// ─── Game State ─────────────────────────────────────
let state = {};
let gameTickInterval = null;
let renderRAF = null;
let tick = 0;
let lastTime = 0;
let currentScreen = 'menu';

function resetState(levelIdx) {
  const cfg = LEVEL_CONFIG[levelIdx];
  state = {
    levelIdx,
    score: 0,
    lives: cfg.lives,
    fruitsEaten: 0,
    deaths: 0,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    snake: (() => {
      const cx = Math.floor(GRID_COLS / 2);
      const cy = Math.floor(GRID_ROWS / 2);
      // Start with 4 segments so it looks like a snake
      return [
        { x: cx, y: cy },
        { x: cx - 1, y: cy },
        { x: cx - 2, y: cy },
        { x: cx - 3, y: cy },
      ];
    })(),
    dir: { x: 1, y: 0 },
    nextDir: null,
    growing: 0,
    fruits: [],
    powerUpsOnBoard: [],
    activeEffects: [],
    walls: [],
    movingGroups: [],
    thorns: [],
    paused: false,
    running: false,
    speed: cfg.speed,
    fruitsForSpeedUp: 0,
    powerUpSpawnTimer: POWER_UP_SPAWN_INTERVAL,
    thornTimer: 0,
    endlessWallTimer: 0,
    endlessEnvCycle: 0,     // tracks environment shifts in endless
    endlessRareTimer: 0,    // timer for rare fruit events
    endlessLaneIdx: 0,
    endlessLaneIcon: ENDLESS_LANE_THEMES[0].icon,
    lastLaneRewarded: -1,
    startTime: Date.now(),
    // Smooth interpolation
    prevSnake: null,
    interpFactor: 1,
    lastTickTime: 0,
  };
}

// ─── Screen Management ──────────────────────────────
const screens = ['menu-screen', 'controls-screen', 'stages-screen', 'game-screen', 'results-screen'];

function showScreen(name) {
  currentScreen = name;
  screens.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('active', id === name + '-screen');
  });
}

// ─── Populate Stages ────────────────────────────────
function populateStages() {
  const grid = document.getElementById('stages-grid');
  if (!grid) return;
  grid.innerHTML = '';

  for (let i = 0; i < TOTAL_LEVELS; i++) {
    const cfg = LEVEL_CONFIG[i];
    const env = ENVIRONMENTS[cfg.envIdx];
    const locked = i > progress.unlockedLevel;
    const stars = progress.bestStars[i] || 0;
    const best = progress.bestScores[i] || 0;

    const bestEndlessLane = Math.floor((progress.bestEndlessFruits || 0) / ENDLESS_LANE_FRUITS);
    const endlessTheme = getLaneThemeByIndex(bestEndlessLane);
    const claimedLaneCount = getClaimedLaneCount();

    const card = document.createElement('div');
    card.className = 'stage-card' + (locked ? ' locked' : '');
    card.style.borderColor = locked ? '#333' : env.accent;
    card.style.background = locked ? '#1a1a1a' : `linear-gradient(135deg, ${env.bg}, ${env.grid})`;

    card.innerHTML = `
      <div class="stage-emoji">${locked ? '🔒' : env.emoji}</div>
      <div class="stage-num">${i + 1}</div>
      <div class="stage-name">${t.levelNames[i]}</div>
      <div class="stage-stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      ${best > 0 ? `<div class="stage-best">${t.best}: ${best}</div>` : ''}
      ${i === TOTAL_LEVELS - 1 ? `<div class="stage-endless">${endlessTheme.icon} L${bestEndlessLane + 1}</div><div class="stage-best">🏁 ${claimedLaneCount}</div>` : ''}
    `;

    if (!locked) {
      card.addEventListener('click', () => {
        UI.playClick();
        startLevel(i);
      });
      card.addEventListener('touchend', (e) => {
        e.preventDefault();
        UI.playClick();
        startLevel(i);
      });
    }
    grid.appendChild(card);
  }

  // Skin selector
  populateSkins();

  // Badge display
  populateBadges();
}

function populateBadges() {
  let container = document.getElementById('badge-container');
  if (!container) {
    const stagesScreen = document.getElementById('stages-screen');
    if (!stagesScreen) return;
    container = document.createElement('div');
    container.id = 'badge-container';
    container.style.cssText = 'margin-top:12px;padding:8px;background:rgba(0,0,0,0.3);border-radius:12px;text-align:center;';
    stagesScreen.appendChild(container);
  }
  if (!progress.badges) progress.badges = [];
  const earned = progress.badges.length;
  const total = BADGE_DEFS.length;
  container.innerHTML = `
    <div style="color:#ffd200;font-weight:bold;font-size:14px;margin-bottom:6px;">${t.badges || 'Badges'} (${earned}/${total})</div>
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:6px;">
      ${BADGE_DEFS.map(b => {
        const has = progress.badges.includes(b.id);
        return `<div style="
          padding:4px 8px;border-radius:8px;font-size:11px;
          background:${has ? 'rgba(255,210,0,0.2)' : 'rgba(60,60,60,0.5)'};
          color:${has ? '#ffd200' : '#666'};
          border:1px solid ${has ? 'rgba(255,210,0,0.4)' : 'rgba(60,60,60,0.3)'};
        ">${has ? b.label() : '❓'}</div>`;
      }).join('')}
    </div>
  `;
}

function populateSkins() {
  const container = document.getElementById('skin-selector');
  if (!container) return;
  container.innerHTML = `<div class="skin-label">${t.skinSelect}</div><div class="skin-list" id="skin-list"></div>`;
  const list = document.getElementById('skin-list');

  SNAKE_SKINS.forEach((skin, i) => {
    const locked = i > progress.unlockedLevel;
    const btn = document.createElement('div');
    btn.className = 'skin-btn' + (i === progress.skinIdx ? ' selected' : '') + (locked ? ' locked' : '');
    btn.style.background = locked ? '#333' : skin.head;
    btn.innerHTML = locked ? '🔒' : skin.emoji;
    if (!locked) {
      btn.addEventListener('click', () => {
        progress.skinIdx = i;
        saveProgress();
        populateSkins();
        UI.playClick();
      });
    }
    list.appendChild(btn);
  });
}

// ─── Start Level ────────────────────────────────────
function startLevel(levelIdx) {
  resetState(levelIdx);

  const cfg = LEVEL_CONFIG[levelIdx];

  // Setup walls
  if (cfg.hasWalls) {
    state.walls = getStaticWalls(levelIdx);
  }
  if (cfg.movingWalls) {
    state.movingGroups = getMovingWallGroups(levelIdx);
  }
  if (cfg.hasThorns) {
    state.thorns = getThornPositions(levelIdx);
  }

  // Spawn initial fruits
  for (let i = 0; i < cfg.maxFruits; i++) {
    spawnFruit();
  }

  // Init environment background particles
  UI.initBgParticles(cfg.envIdx);

  // Set weather for this environment
  const env = ENVIRONMENTS[cfg.envIdx];
  UI.setWeather(env.weather || 'none');

  // Reset camera to center
  UI.resetCamera();

  showScreen('game');
  state.running = true;

  // Show teaching tip for this level
  const tip = t.levelTips && t.levelTips[levelIdx];
  if (tip) UI.showTip(tip, 3500);

  // Update dpad visibility
  const dpad = document.getElementById('dpad');
  if (dpad) {
    dpad.style.display = (progress.controlMode === 'swipe') ? 'none' : 'grid';
  }

  // Start game loop
  startGameLoop();
}

function startGameLoop() {
  stopGameLoop();
  tick = 0;
  lastTime = performance.now();
  state.running = true;

  gameTickInterval = setInterval(gameTick, state.speed);
  renderRAF = requestAnimationFrame(renderLoop);
}

function stopGameLoop() {
  if (gameTickInterval) { clearInterval(gameTickInterval); gameTickInterval = null; }
  if (renderRAF) { cancelAnimationFrame(renderRAF); renderRAF = null; }
  state.running = false;
}

function restartTickInterval() {
  if (gameTickInterval) clearInterval(gameTickInterval);
  gameTickInterval = setInterval(gameTick, state.speed);
}

// ─── Fruit Spawning ────────────────────────────────
function spawnFruit() {
  const cfg = LEVEL_CONFIG[state.levelIdx];
  if (state.fruits.length >= cfg.maxFruits) return;

  const fruit = pickFruit(state.levelIdx);
  const occupied = [
    ...state.snake,
    ...state.fruits,
    ...state.powerUpsOnBoard,
  ];
  const wallCells = getAllWallCells();
  const pos = findEmptyCell(occupied, wallCells);
  if (!pos) return;

  fruit.x = pos.x;
  fruit.y = pos.y;
  if (fruit.temp) {
    fruit.spawnTime = Date.now();
    fruit.remaining = fruit.lifetime;
    UI.playRareSpawn(); // alert sound for rare fruit
  }
  state.fruits.push(fruit);
}

function getAllWallCells() {
  const cells = [...state.walls];
  for (const g of state.movingGroups) {
    cells.push(...g.cells);
  }
  for (const t of state.thorns) {
    if (t.active) cells.push(t);
  }
  return cells;
}

// ─── Power-Up Spawning ─────────────────────────────
function spawnPowerUp() {
  const cfg = LEVEL_CONFIG[state.levelIdx];
  if (cfg.powerUps.length === 0 || state.powerUpsOnBoard.length > 0) return;

  const puId = cfg.powerUps[Math.floor(Math.random() * cfg.powerUps.length)];
  const puType = POWER_UP_TYPES.find(p => p.id === puId);
  if (!puType) return;

  const occupied = [
    ...state.snake,
    ...state.fruits,
    ...state.powerUpsOnBoard,
  ];
  const wallCells = getAllWallCells();
  const pos = findEmptyCell(occupied, wallCells);
  if (!pos) return;

  state.powerUpsOnBoard.push({
    ...puType,
    x: pos.x,
    y: pos.y,
    spawnTime: Date.now(),
    lifetime: POWER_UP_LIFETIME,
  });
}

// ─── Game Tick ──────────────────────────────────────
function gameTick() {
  if (state.paused || !state.running) return;

  // Save previous snake for interpolation
  state.prevSnake = state.snake.map(s => ({ x: s.x, y: s.y }));
  state.lastTickTime = performance.now();
  state.interpFactor = 0;

  // Apply queued direction
  if (state.nextDir) {
    const nd = state.nextDir;
    // Prevent 180° turn
    if (!(nd.x === -state.dir.x && nd.y === -state.dir.y)) {
      state.dir = nd;
    }
    state.nextDir = null;
  }

  // Check ghost mode
  const isGhost = state.activeEffects.some(e => e.id === 'ghost' && e.active);

  // Move snake
  const head = state.snake[0];
  let nx = head.x + state.dir.x;
  let ny = head.y + state.dir.y;

  // Wrap at edges
  if (nx < 0) nx = GRID_COLS - 1;
  if (nx >= GRID_COLS) nx = 0;
  if (ny < 0) ny = GRID_ROWS - 1;
  if (ny >= GRID_ROWS) ny = 0;

  const newHead = { x: nx, y: ny };

  // Wall collisions (skip if ghost)
  if (!isGhost) {
    // Check wall collision (static walls)
    if (state.walls.some(w => w.x === nx && w.y === ny)) {
      handleCollision();
      return;
    }

    // Check moving wall collision
    for (const g of state.movingGroups) {
      if (g.cells.some(c => c.x === nx && c.y === ny)) {
        handleCollision();
        return;
      }
    }

    // Check thorn collision
    for (const th of state.thorns) {
      if (th.active && th.x === nx && th.y === ny) {
        handleCollision();
        return;
      }
    }
  }

  // Check self collision (skip if ghost, skip tail if growing)
  if (!isGhost) {
    const bodyToCheck = state.growing > 0 ? state.snake : state.snake.slice(0, -1);
    if (bodyToCheck.some(s => s.x === nx && s.y === ny)) {
      handleCollision();
      return;
    }
  }

  // Move
  state.snake.unshift(newHead);
  if (state.growing > 0) {
    state.growing--;
  } else {
    state.snake.pop();
  }

  // Check fruit collision
  const fruitIdx = state.fruits.findIndex(f => f.x === nx && f.y === ny);
  if (fruitIdx >= 0) {
    eatFruit(fruitIdx);
  }

  // Check power-up collision
  const puIdx = state.powerUpsOnBoard.findIndex(p => p.x === nx && p.y === ny);
  if (puIdx >= 0) {
    activatePowerUp(puIdx);
  }

  tick++;
}

// ─── Handle Collision (wall/self) ───────────────────
function handleCollision() {
  // Check shield
  const shield = state.activeEffects.find(e => e.id === 'shield' && e.active);
  if (shield) {
    shield.active = false;
    UI.playShieldHit();
    UI.flash('#4facfe', 150);
    UI.showToast(t.shield, '#4facfe');
    return;
  }

  state.lives--;
  state.deaths++;
  state.combo = 0;
  state.comboTimer = 0;
  UI.playDeath();
  UI.playCompanionCue(state.lives <= 1 ? 'alert' : 'wrong', 1 + Math.min(state.deaths, 4) * 0.12);
  UI.shake(8, 300);
  UI.flash('#ff0000', 200);
  UI.spawnDeathExplosion(state.snake);

  if (state.lives <= 0) {
    gameOver();
  } else {
    // Reset snake position with 4 segments
    const cx = Math.floor(GRID_COLS / 2);
    const cy = Math.floor(GRID_ROWS / 2);
    state.snake = [
      { x: cx, y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy },
      { x: cx - 3, y: cy },
    ];
    state.prevSnake = null;
    state.dir = { x: 1, y: 0 };
    state.nextDir = null;
    state.growing = 0;
  }
}

// ─── Eat Fruit ──────────────────────────────────────
function eatFruit(idx) {
  const fruit = state.fruits.splice(idx, 1)[0];
  const cfg = LEVEL_CONFIG[state.levelIdx];

  // Combo
  if (cfg.comboMax > 1) {
    state.combo++;
    state.comboTimer = cfg.comboWindow;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    if (state.combo > 1) {
      UI.playCombo(state.combo);
      UI.playCompanionCue(state.combo >= 5 ? 'wow' : 'happy', 1 + Math.min(state.combo, 8) * 0.08);
      UI.showToast(`${t.combo} ×${Math.min(state.combo, cfg.comboMax)}!`, ENVIRONMENTS[cfg.envIdx].glow);
    }
  }

  // Score with multiplier
  let multiplier = Math.min(state.combo || 1, cfg.comboMax);
  // Score multiplier effect
  const multiEffect = state.activeEffects.find(e => e.id === 'multi' && e.active);
  if (multiEffect) multiplier *= 2;

  state.score += fruit.points * multiplier;
  state.fruitsEaten++;
  state.growing++;

  // Score fly animation
  const flyText = multiplier > 1 ? `+${fruit.points * multiplier} ×${multiplier}` : `+${fruit.points}`;
  const flyColor = multiplier > 1 ? '#ffd200' : fruit.color;
  UI.spawnScoreFly(fruit.x, fruit.y, flyText, flyColor);

  // Sound + particles (fruit-specific)
  if (fruit.temp) {
    UI.playEatFruit(fruit.id);
    UI.spawnStarBurst(fruit.x, fruit.y);
    UI.flash(fruit.color, 150);
  } else {
    UI.playEatFruit(fruit.id);
    const multiActive = state.activeEffects.some(e => e.id === 'multi' && e.active);
    if (multiActive) {
      UI.spawnRainbowParticles(fruit.x, fruit.y, 18);
    } else {
      UI.spawnParticles(fruit.x, fruit.y, fruit.color, 10);
    }
  }

  // Speed increase
  state.fruitsForSpeedUp++;
  if (cfg.speedUp > 0 && state.fruitsForSpeedUp >= 4) {
    state.fruitsForSpeedUp = 0;
    const speedEffect = state.activeEffects.find(e => e.id === 'speed' && e.active);
    state.speed = Math.max(80, state.speed - cfg.speedUp);
    if (!speedEffect) restartTickInterval();
  }

  // Milestone celebration
  if (state.fruitsEaten > 0 && state.fruitsEaten % MILESTONE_INTERVAL === 0) {
    UI.playMilestone();
    UI.spawnStarBurst(state.snake[0].x, state.snake[0].y);
    UI.showToast(`${t.milestone} ${state.fruitsEaten} ${t.fruits}! 🎉`, '#ffd200', 2000);
    UI.flash('#ffd200', 200);
  }

  // Check level complete
  if (cfg.fruitGoal > 0 && state.fruitsEaten >= cfg.fruitGoal) {
    levelComplete();
    return;
  }

  // Respawn fruit after delay
  setTimeout(() => {
    if (state.running) spawnFruit();
  }, 500);

  // Endless wall regeneration every 25 fruits
  if (state.levelIdx === TOTAL_LEVELS - 1 && state.fruitsEaten > 0 && state.fruitsEaten % 25 === 0) {
    state.walls = regenerateEndlessWalls();
    UI.showToast('🧱 !!', '#ff6b6b', 1500);
    UI.shake(4, 200);
  }

  // Track total fruits & check badges
  progress.totalFruitsEver = (progress.totalFruitsEver || 0) + 1;
  checkBadges();
}

// ─── Activate Power-Up ─────────────────────────────
function activatePowerUp(idx) {
  const pu = state.powerUpsOnBoard.splice(idx, 1)[0];
  UI.playPowerUp();
  UI.spawnParticles(pu.x, pu.y, pu.color, 15);

  // Instant-use power-ups (no duration)
  if (pu.id === 'dash') {
    // Dash: move 3 tiles forward instantly
    UI.playDash();
    for (let d = 0; d < 3; d++) {
      const head = state.snake[0];
      let nx = head.x + state.dir.x;
      let ny = head.y + state.dir.y;
      if (nx < 0) nx = GRID_COLS - 1;
      if (nx >= GRID_COLS) nx = 0;
      if (ny < 0) ny = GRID_ROWS - 1;
      if (ny >= GRID_ROWS) ny = 0;
      // Don't dash into walls
      if (state.walls.some(w => w.x === nx && w.y === ny)) break;
      state.snake.unshift({ x: nx, y: ny });
      state.growing++;
      // Check fruit during dash
      const fi = state.fruits.findIndex(f => f.x === nx && f.y === ny);
      if (fi >= 0) eatFruit(fi);
    }
    UI.flash('#ff9a76', 150);
    const descKey = pu.desc;
    UI.showToast(t[descKey] || pu.emoji, pu.color);
    return;
  }

  if (pu.id === 'shrink') {
    // Shrink: remove 3 tail segments
    UI.playShrink();
    const removeCount = Math.min(3, state.snake.length - 1);
    for (let i = 0; i < removeCount; i++) {
      if (state.snake.length > 1) {
        const removed = state.snake.pop();
        UI.spawnParticles(removed.x, removed.y, '#ff6b6b', 5);
      }
    }
    UI.flash('#ff6b6b', 150);
    const descKey = pu.desc;
    UI.showToast(t[descKey] || pu.emoji, pu.color);
    return;
  }

  // Duration-based power-ups
  const existing = state.activeEffects.find(e => e.id === pu.id);
  if (existing && existing.active) {
    // Extend duration
    existing.remaining += pu.duration;
  } else {
    state.activeEffects.push({
      id: pu.id,
      emoji: pu.emoji,
      color: pu.color,
      duration: pu.duration,
      remaining: pu.duration,
      active: true,
    });
  }

  // Speed boost effect
  if (pu.id === 'speed') {
    state.speed = Math.max(60, Math.floor(state.speed * 0.65));
    restartTickInterval();
  }

  // Freeze: stop moving walls and thorns
  if (pu.id === 'freeze') {
    UI.playFreeze();
    UI.flash('#a0e9ff', 200);
  }

  // Ghost mode
  if (pu.id === 'ghost') {
    UI.playGhost();
  }

  // Magnet
  if (pu.id === 'magnet') {
    UI.playMagnet();
  }

  const descKey = pu.desc;
  UI.showToast(t[descKey] || pu.emoji, pu.color);
  UI.flash(pu.color, 150);
}

// ─── Update Effects, Walls, Combo (called in render) ────
function updateTimers(dt) {
  // Combo timer
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) {
      state.combo = 0;
      state.comboTimer = 0;
    }
  }

  // Active effects
  for (const e of state.activeEffects) {
    if (!e.active) continue;
    e.remaining -= dt;
    if (e.remaining <= 0) {
      e.active = false;
      // Restore speed if speed boost expired
      if (e.id === 'speed') {
        const cfg = LEVEL_CONFIG[state.levelIdx];
        state.speed = cfg.speed - (cfg.speedUp * Math.floor(state.fruitsEaten / 4));
        state.speed = Math.max(80, state.speed);
        restartTickInterval();
      }
    }
  }

  // Temporary fruit expiration
  for (let i = state.fruits.length - 1; i >= 0; i--) {
    const f = state.fruits[i];
    if (f.temp) {
      f.remaining = f.lifetime - (Date.now() - f.spawnTime);
      if (f.remaining <= 0) {
        state.fruits.splice(i, 1);
        setTimeout(() => { if (state.running) spawnFruit(); }, 1000);
      }
    }
  }

  // Power-up expiration on board
  for (let i = state.powerUpsOnBoard.length - 1; i >= 0; i--) {
    const p = state.powerUpsOnBoard[i];
    if (Date.now() - p.spawnTime > p.lifetime) {
      state.powerUpsOnBoard.splice(i, 1);
    }
  }

  // Power-up spawn timer
  state.powerUpSpawnTimer -= dt;
  if (state.powerUpSpawnTimer <= 0) {
    state.powerUpSpawnTimer = POWER_UP_SPAWN_INTERVAL;
    spawnPowerUp();
  }

  // Moving walls (frozen if freeze effect active)
  const isFrozen = state.activeEffects.some(e => e.id === 'freeze' && e.active);
  if (!isFrozen) {
    for (const g of state.movingGroups) {
      g._timer += dt;
      if (g._timer >= g.speed) {
        g._timer = 0;
        // Move cells
        for (const c of g.cells) {
          if (g.axis === 'x') c.x += g.dir;
          else c.y += g.dir;
        }
        // Check bounds and reverse
        const outOfBounds = g.cells.some(c => {
          const val = g.axis === 'x' ? c.x : c.y;
          return val <= g.min || val >= g.max;
        });
        if (outOfBounds) g.dir *= -1;
      }
    }
  }

  // Thorns toggle (frozen if freeze effect active)
  if (state.thorns.length > 0 && !isFrozen) {
    state.thornTimer += dt;
    if (state.thornTimer >= THORN_TOGGLE_MS) {
      state.thornTimer = 0;
      for (const th of state.thorns) {
        th.active = !th.active;
      }
    }
  }

  // ─── Magnet Effect: attract fruits toward snake ──
  const hasMagnet = state.activeEffects.some(e => e.id === 'magnet' && e.active);
  if (hasMagnet && state.snake.length > 0) {
    const head = state.snake[0];
    const magnetRange = 4; // grid cells
    for (let i = state.fruits.length - 1; i >= 0; i--) {
      const f = state.fruits[i];
      const dx = head.x - f.x;
      const dy = head.y - f.y;
      const dist = Math.abs(dx) + Math.abs(dy); // Manhattan distance
      if (dist > 0 && dist <= magnetRange) {
        // Move fruit one step toward head
        if (Math.abs(dx) >= Math.abs(dy)) {
          f.x += Math.sign(dx);
        } else {
          f.y += Math.sign(dy);
        }
        // Check if fruit reached head
        if (f.x === head.x && f.y === head.y) {
          eatFruit(i);
        }
      }
    }
  }

  // ─── Endless Mode Dynamics ──────────────────────
  if (state.levelIdx === TOTAL_LEVELS - 1) {
    const laneNow = Math.floor(state.fruitsEaten / ENDLESS_LANE_FRUITS);
    const laneTheme = getLaneThemeByIndex(laneNow);
    state.endlessLaneIdx = laneNow;
    state.endlessLaneIcon = laneTheme.icon;

    // Environment cycling every 15 fruits
    const targetEnv = laneNow % ENVIRONMENTS.length;
    if (targetEnv !== state.endlessEnvCycle && state.fruitsEaten > 0) {
      state.endlessEnvCycle = targetEnv;
      LEVEL_CONFIG[state.levelIdx].envIdx = targetEnv;
      UI.flash(ENVIRONMENTS[targetEnv].glow, 300);
      UI.showToast(`${laneTheme.icon} L${laneNow + 1} • ${ENVIRONMENTS[targetEnv].emoji}`, ENVIRONMENTS[targetEnv].accent, 1800);
    }

    // Lane completion rewards (persisted once per lane)
    if (state.fruitsEaten > 0 && state.fruitsEaten % ENDLESS_LANE_FRUITS === 0) {
      const completedLane = laneNow - 1;
      if (completedLane >= 0 && state.lastLaneRewarded !== completedLane) {
        state.lastLaneRewarded = completedLane;
        const rewardKey = String(completedLane);
        const alreadyClaimed = !!progress.endlessLaneRewards[rewardKey];
        if (!alreadyClaimed) {
          const laneDoneTheme = getLaneThemeByIndex(completedLane);
          const isMilestoneLane = (completedLane + 1) % 5 === 0;
          const scoreBonus = isMilestoneLane ? 250 : 120;
          const lifeBonus = isMilestoneLane ? 2 : 1;
          const cfg = LEVEL_CONFIG[state.levelIdx];

          state.score += scoreBonus;
          state.lives = Math.min((cfg.lives || 3) + 3, state.lives + lifeBonus);

          progress.endlessLaneRewards[rewardKey] = {
            claimedAt: Date.now(),
            scoreBonus,
            lifeBonus,
            milestone: isMilestoneLane,
          };
          progress.endlessRewardTotal = (progress.endlessRewardTotal || 0) + scoreBonus;
          saveProgress();

          UI.playMilestone();
          UI.playCompanionCue('wow', isMilestoneLane ? 1.25 : 1.08);
          UI.showToast(`${laneDoneTheme.icon} L${completedLane + 1} +${scoreBonus}⭐ +${lifeBonus}❤️`, laneDoneTheme.color, 2200);
          UI.spawnStarBurst(state.snake[0].x, state.snake[0].y);
        }
      }
    }

    // Rare fruit event every 45 seconds
    state.endlessRareTimer += dt;
    if (state.endlessRareTimer >= 45000) {
      state.endlessRareTimer = 0;
      // Spawn a burst of 2 rare fruits
      for (let r = 0; r < 2; r++) {
        setTimeout(() => { if (state.running) spawnFruit(); }, r * 300);
      }
      UI.showToast('🌟 Rare Fruit Event! 🌟', '#ffd200', 2000);
      UI.playRareSpawn();
      UI.playCompanionCue('alert', 1.1);
    }
  }
}

// ─── Render Loop ────────────────────────────────────
function renderLoop(now) {
  if (currentScreen !== 'game') return;
  renderRAF = requestAnimationFrame(renderLoop);

  const dt = now - lastTime;
  lastTime = now;

  if (state.running && !state.paused) {
    updateTimers(dt);
  }

  // Smooth interpolation factor (0→1 between ticks)
  if (state.lastTickTime > 0 && state.speed > 0) {
    state.interpFactor = Math.min(1, (performance.now() - state.lastTickTime) / state.speed);
  } else {
    state.interpFactor = 1;
  }

  // Build interpolated snake for smooth rendering
  let renderSnake = state.snake;
  if (state.prevSnake && state.interpFactor < 1 && state.running && !state.paused) {
    const t_interp = state.interpFactor;
    renderSnake = state.snake.map((seg, i) => {
      if (i < state.prevSnake.length) {
        const prev = state.prevSnake[i];
        // Handle wrap-around (don't interpolate if distance > half grid)
        let dx = seg.x - prev.x;
        let dy = seg.y - prev.y;
        if (Math.abs(dx) > GRID_COLS / 2) dx = 0;
        if (Math.abs(dy) > GRID_ROWS / 2) dy = 0;
        return {
          x: prev.x + dx * t_interp,
          y: prev.y + dy * t_interp,
        };
      }
      return seg;
    });
  }

  const cfg = LEVEL_CONFIG[state.levelIdx];
  const envIdx = cfg.envIdx;
  const env = ENVIRONMENTS[envIdx];

  // Update camera to follow snake head
  if (renderSnake.length > 0) {
    UI.setCameraTarget(renderSnake[0].x, renderSnake[0].y);
  }
  UI.updateCamera(dt);

  UI.applyScreenEffects();
  UI.clearCanvas(envIdx, tick);

  // Arena edge border
  UI.drawArenaEdge(envIdx);

  UI.drawGrid(envIdx);

  // Walls
  if (state.walls.length) UI.drawWalls(state.walls, envIdx);
  if (state.movingGroups.length) UI.drawMovingWalls(state.movingGroups, envIdx);
  if (state.thorns.length) UI.drawThorns(state.thorns, envIdx, tick);

  // Fruits
  UI.drawFruits(state.fruits, tick);

  // Power-ups
  UI.drawPowerUps(state.powerUpsOnBoard, tick);

  // Snake with shape and effects
  const hasShield = state.activeEffects.some(e => e.id === 'shield' && e.active);
  const hasSpeed = state.activeEffects.some(e => e.id === 'speed' && e.active);
  const hasMulti = state.activeEffects.some(e => e.id === 'multi' && e.active);
  const hasGhost = state.activeEffects.some(e => e.id === 'ghost' && e.active);
  const hasMagnet = state.activeEffects.some(e => e.id === 'magnet' && e.active);
  const hasFreezeVis = state.activeEffects.some(e => e.id === 'freeze' && e.active);

  // Get snake shape for current level
  const snakeShape = SNAKE_SHAPES[state.levelIdx] || 'default';

  // Rainbow trail at combo ×5+
  if (state.combo >= 5) UI.drawRainbowTrail(renderSnake, tick);
  if (hasSpeed) UI.drawSpeedTrail(renderSnake, tick);

  // Magnet field visual
  if (hasMagnet && renderSnake.length > 0) UI.drawMagnetField(renderSnake[0], tick);

  // Ghost overlay (before snake so it's behind)
  if (hasGhost) UI.drawGhostOverlay(renderSnake, tick);

  UI.drawSnake(renderSnake, progress.skinIdx, hasShield, tick, snakeShape);
  if (hasMulti && renderSnake.length > 0) UI.drawMultiAura(renderSnake[0], tick);

  // Freeze overlay
  if (hasFreezeVis) UI.drawFreezeOverlay(tick);

  // Weather
  if (env.weather && env.weather !== 'none') {
    UI.setWeather(env.weather);
  } else {
    UI.setWeather('none');
  }
  UI.updateWeather();

  // HUD
  UI.drawHUD(state, envIdx);

  // Combo meter
  UI.drawComboMeter(state.combo, state.comboTimer, cfg.comboMax, cfg.comboWindow, envIdx);

  // Active effects
  UI.drawActiveEffects(state.activeEffects);

  // Mini-map
  const allWalls = [...state.walls];
  for (const g of state.movingGroups) allWalls.push(...g.cells);
  UI.drawMiniMap(renderSnake, state.fruits, allWalls, state.powerUpsOnBoard, envIdx);

  // Particles, toasts, flash, score flies, tips, confetti
  UI.updateParticles();
  UI.updateScoreFlies();
  UI.updateConfetti();
  UI.drawToasts();
  UI.drawTip(dt);
  UI.drawScreenFlash();

  // Pause overlay
  if (state.paused) {
    const { W, H } = UI.getCanvasSize();
    const cx = document.getElementById('game-canvas');
    const w = cx ? cx.width : W;
    const h = cx ? cx.height : H;
    const ctx2d = cx.getContext('2d');
    ctx2d.fillStyle = 'rgba(0,0,0,0.5)';
    ctx2d.fillRect(0, 0, w, h);
    ctx2d.font = 'bold 28px Nunito, sans-serif';
    ctx2d.fillStyle = '#fff';
    ctx2d.textAlign = 'center';
    ctx2d.fillText(t.pause, w / 2, h / 2 - 15);
    ctx2d.font = '18px Nunito, sans-serif';
    ctx2d.fillStyle = '#aaa';
    ctx2d.fillText(t.resume, w / 2, h / 2 + 15);
  }

  tick++;
}

// ─── Level Complete ─────────────────────────────────
function levelComplete() {
  stopGameLoop();
  const cfg = LEVEL_CONFIG[state.levelIdx];
  const stars = calculateStars();

  // Big celebration!
  UI.playLevelUp();
  UI.spawnStarBurst(state.snake[0].x, state.snake[0].y);
  UI.spawnConfetti(stars >= 3 ? 80 : stars >= 2 ? 50 : 30);
  UI.playConfetti();
  UI.flash('#ffd200', 300);
  // Multiple star bursts for 3 stars
  if (stars >= 3) {
    setTimeout(() => UI.spawnStarBurst(3, 3), 200);
    setTimeout(() => UI.spawnStarBurst(10, 3), 400);
  }

  // Check badges after level complete
  checkBadges();

  // Update progress
  if (stars > (progress.bestStars[state.levelIdx] || 0)) {
    progress.bestStars[state.levelIdx] = stars;
  }
  if (state.score > (progress.bestScores[state.levelIdx] || 0)) {
    progress.bestScores[state.levelIdx] = state.score;
  }
  if (state.levelIdx + 1 > progress.unlockedLevel && state.levelIdx + 1 < TOTAL_LEVELS) {
    progress.unlockedLevel = state.levelIdx + 1;
  }
  saveProgress();

  // PostMessage
  try {
    window.parent.postMessage({
      type: 'GAME_COMPLETE',
      score: state.score,
      total: 100,
      stage: state.levelIdx + 1,
      stars,
    }, '*');
    window.parent.postMessage({
      type: 'SHARE_ACHIEVEMENT',
      game: 'snake3d',
      level: state.levelIdx + 1,
      score: state.score,
      stars,
    }, '*');
  } catch (e) {}

  setTimeout(() => showResults(stars, true), 600);
}

// ─── Game Over ──────────────────────────────────────
function gameOver() {
  stopGameLoop();
  const stars = calculateStars();

  UI.playGameOver();

  // Save if improved
  if (state.score > (progress.bestScores[state.levelIdx] || 0)) {
    progress.bestScores[state.levelIdx] = state.score;
  }
  if (stars > (progress.bestStars[state.levelIdx] || 0)) {
    progress.bestStars[state.levelIdx] = stars;
  }
  if (state.levelIdx === TOTAL_LEVELS - 1) {
    progress.bestEndlessFruits = Math.max(progress.bestEndlessFruits || 0, state.fruitsEaten || 0);
  }
  saveProgress();

  try {
    window.parent.postMessage({
      type: 'GAME_COMPLETE',
      score: state.score,
      total: 100,
      stage: state.levelIdx + 1,
      stars,
    }, '*');
    window.parent.postMessage({
      type: 'SHARE_ACHIEVEMENT',
      game: 'snake3d',
      level: state.levelIdx + 1,
      score: state.score,
      stars,
    }, '*');
  } catch (e) {}

  setTimeout(() => showResults(stars, false), 600);
}

// ─── Calculate Stars ────────────────────────────────
function calculateStars() {
  const cfg = LEVEL_CONFIG[state.levelIdx];

  // Endless mode: score-based
  if (cfg.fruitGoal === 0) {
    if (state.score >= 1000) return 3;
    if (state.score >= 500) return 2;
    if (state.score >= 200) return 1;
    return 0;
  }

  // Normal levels: death-based
  if (state.fruitsEaten < cfg.fruitGoal) return 0;
  if (state.deaths === 0) return 3;
  if (state.deaths <= 1) return 2;
  return 1;
}

// ─── Show Results Screen ────────────────────────────
function showResults(stars, completed) {
  showScreen('results');

  const cfg = LEVEL_CONFIG[state.levelIdx];
  const env = ENVIRONMENTS[cfg.envIdx];
  const prevBest = progress.bestScores[state.levelIdx] || 0;
  const isNewRecord = state.score > prevBest && prevBest > 0;

  const titleEl = document.getElementById('results-title');
  const starsEl = document.getElementById('results-stars');
  const scoreEl = document.getElementById('results-score');
  const detailsEl = document.getElementById('results-details');
  const nextBtn = document.getElementById('btn-next');

  if (titleEl) {
    if (isNewRecord) {
      titleEl.textContent = '🏆 ' + (completed ? t.great : t.good) + ' 🏆';
    } else {
      titleEl.textContent = completed ? t.great : t.gameOver;
    }
    titleEl.style.color = completed ? env.glow : '#ff6b6b';
  }
  if (starsEl) {
    starsEl.textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
  }
  if (scoreEl) {
    scoreEl.textContent = `${t.totalScore}: ${state.score}`;
    if (isNewRecord) {
      scoreEl.innerHTML += `<div style="color:#ffd200;font-size:12px;margin-top:4px;">🎉 New Record! (${t.best}: ${prevBest})</div>`;
    }
  }
  if (detailsEl) {
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const accuracy = state.fruitsEaten > 0
      ? Math.round((state.fruitsEaten / (state.fruitsEaten + state.deaths)) * 100)
      : 0;

    // Earned badges this round
    const earnedBadges = (progress.badges || []).filter(id =>
      BADGE_DEFS.find(b => b.id === id)
    ).slice(-3); // Show last 3

    detailsEl.innerHTML = `
      <div>${t.fruitsEaten}: ${state.fruitsEaten} ${cfg.fruitGoal > 0 ? '/ ' + cfg.fruitGoal : ''}</div>
      <div>${t.deaths}: ${state.deaths}</div>
      <div>${t.bestCombo}: ×${state.bestCombo}</div>
      <div>${t.accuracy || 'Accuracy'}: ${accuracy}%</div>
      <div>${t.time}: ${mins}:${secs.toString().padStart(2, '0')}</div>
      ${earnedBadges.length > 0 ? `<div style="margin-top:6px;color:#ffd200;font-size:11px;">${t.badges || 'Badges'}: ${earnedBadges.map(id => {
        const b = BADGE_DEFS.find(d => d.id === id);
        return b ? b.label() : '';
      }).join(' ')}</div>` : ''}
    `;
  }

  // Next button visibility
  if (nextBtn) {
    const canNext = completed && state.levelIdx + 1 < TOTAL_LEVELS;
    nextBtn.style.display = canNext ? 'inline-block' : 'none';
  }
}

// ─── Direction Control ──────────────────────────────
function setDirection(dir) {
  const map = {
    up:    { x: 0, y: -1 },
    down:  { x: 0, y: 1 },
    left:  { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  if (map[dir]) {
    state.nextDir = map[dir];
  }
}

// ─── Controls Setup ─────────────────────────────────
function setupControls(canvas) {
  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (currentScreen !== 'game') return;
    switch (e.key) {
      case 'ArrowUp':    e.preventDefault(); setDirection('up'); break;
      case 'ArrowDown':  e.preventDefault(); setDirection('down'); break;
      case 'ArrowLeft':  e.preventDefault(); setDirection('left'); break;
      case 'ArrowRight': e.preventDefault(); setDirection('right'); break;
      case ' ':
      case 'Escape':
        e.preventDefault();
        togglePause();
        break;
    }
  });

  // D-Pad buttons
  document.querySelectorAll('.dpad-btn').forEach(btn => {
    const handler = (e) => {
      e.preventDefault();
      if (currentScreen !== 'game') return;
      setDirection(btn.dataset.dir);
    };
    btn.addEventListener('touchstart', handler, { passive: false });
    btn.addEventListener('mousedown', handler);
  });

  // Touch swipe on canvas
  let touchStartX = 0, touchStartY = 0;
  canvas.addEventListener('touchstart', (e) => {
    if (progress.controlMode === 'dpad') return;
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }, { passive: true });

  canvas.addEventListener('touchend', (e) => {
    if (progress.controlMode === 'dpad') return;
    if (currentScreen !== 'game') return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    const MIN_SWIPE = 25;

    if (Math.abs(dx) < MIN_SWIPE && Math.abs(dy) < MIN_SWIPE) {
      togglePause();
      return;
    }

    // Rotate swipe 45° for isometric alignment
    const isoX = dx + dy;   // maps to grid x axis (↘ / ↖)
    const isoY = dx - dy;   // maps to grid y axis (↗ / ↙)

    if (Math.abs(isoY) > Math.abs(isoX)) {
      setDirection(isoY > 0 ? 'up' : 'down');    // ↗ or ↙
    } else {
      setDirection(isoX > 0 ? 'right' : 'left'); // ↘ or ↖
    }
  }, { passive: true });
}

function togglePause() {
  if (!state.running && !state.paused) return;
  state.paused = !state.paused;
  if (state.paused) {
    clearInterval(gameTickInterval);
    gameTickInterval = null;
  } else {
    lastTime = performance.now();
    gameTickInterval = setInterval(gameTick, state.speed);
  }
}

// ─── Button Handlers ────────────────────────────────
function setupButtons() {
  // Menu → Controls or Stages
  const playBtn = document.getElementById('btn-play');
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      UI.playClick();
      showScreen('controls');
      setupControlSelect();
    });
  }

  // Control select
  const confirmBtn = document.getElementById('btn-confirm-controls');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      UI.playClick();
      showScreen('stages');
      populateStages();
    });
  }

  // Stages back
  const stagesBackBtn = document.getElementById('btn-stages-back');
  if (stagesBackBtn) {
    stagesBackBtn.addEventListener('click', () => {
      UI.playClick();
      showScreen('menu');
    });
  }

  // Pause button
  const pauseBtn = document.getElementById('btn-pause');
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      togglePause();
    });
  }

  // Results buttons
  const replayBtn = document.getElementById('btn-replay');
  if (replayBtn) {
    replayBtn.addEventListener('click', () => {
      UI.playClick();
      startLevel(state.levelIdx);
    });
  }

  const nextBtn = document.getElementById('btn-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      UI.playClick();
      if (state.levelIdx + 1 < TOTAL_LEVELS) {
        startLevel(state.levelIdx + 1);
      }
    });
  }

  const menuBtn = document.getElementById('btn-menu');
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      UI.playClick();
      showScreen('stages');
      populateStages();
    });
  }
}

function setupControlSelect() {
  const options = document.querySelectorAll('.control-option');
  options.forEach(opt => {
    opt.classList.toggle('selected', opt.dataset.mode === progress.controlMode);
    opt.addEventListener('click', () => {
      progress.controlMode = opt.dataset.mode;
      saveProgress();
      options.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      UI.playClick();
    });
  });
}

// ─── Init ───────────────────────────────────────────
export function init(canvas) {
  loadProgress();
  UI.initCanvas(canvas);
  setupControls(canvas);
  setupButtons();

  // Set UI direction
  document.body.dir = DIR;
  document.body.setAttribute('data-lang', LANG);

  // Set title
  const titleEl = document.getElementById('game-title');
  if (titleEl) titleEl.textContent = t.title;

  const subtitleEl = document.getElementById('game-subtitle');
  if (subtitleEl) subtitleEl.textContent = t.subtitle;

  const playBtn = document.getElementById('btn-play');
  if (playBtn) playBtn.textContent = t.play;

  showScreen('menu');
}
