// ===== Gem Kingdom 💎 — Core Game Controller =====
// State machine, game loop, input handlers, screen management, postMessage
// Central orchestrator — wires all modules together

import {
  LANG, DIR, SUPPORTED_LANGS, LANGUAGE_LABELS, BOARD, TIMING, SCORING, XP, SPECIAL, OBSTACLE,
  WORLD_GEMS, WORLD_GRADIENTS, WORLD_ACCENTS, WORLD_NAMES, WORLD_ICONS, WORLD_MASCOTS,
  WORLD_MASCOT_NAMES, ACHIEVEMENTS, KEYS, STORAGE_PREFIX,
  t, loadProgress, saveProgress, createDefaultProgress,
} from './config.js';

import {
  initGrid, swapGems, areAdjacent, findMatches, getSpecials,
  processMatches, applyGravity, spawnNewGems, hasValidMoves,
  shuffleGrid, findBestMove, tickBombTimers, calcComboMultiplier,
  calcStars, createObjectiveTracker, updateObjectives, objectivesComplete,
  getPowerCombo, getPowerComboClearPositions, getSpecialClearPositions,
  nextId, createGem, shuffle,
  moveConveyors, spreadShadows, spreadMoss, checkCagedItems,
} from './engine.js';

import {
  setupCanvas, calcLayout, detectPerformance, getPerf,
  drawBackground, drawGrid, drawHUD, drawParticles, drawTransition, drawBossOverlay,
  updateParticles, updateTweens, updateBackground, updateTransition,
  addTween, hasTweens, clearTweens, clearParticles,
  initBackground, spawnBurst, spawnEmojiBurst, spawnStarBurst,
  spawnComboText, spawnSpecialActivation, spawnLevelCompleteEffects, spawnBossDefeatEffects,
  spawnRocketTrail, drawSwipeLine, startFadeOut, isTransitioning,
  setColorBlindMode, setGemStyle, setBoardTheme,
} from './ui.js';

// ===== REPORTS =====
let REPORTS = null;

async function loadReports() {
  try {
    const mod = await import('./reports.js');
    REPORTS = mod;
  } catch (e) { recordModuleLoadFailure('reports.js', e); }
}

function createSessionId() {
  return `gem_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function resolveParentPostMessageOrigin() {
  const fallbackOrigin = window.location.origin || 'https://classi-fy.com';
  const allowedHosts = new Set([
    'classi-fy.com',
    'www.classi-fy.com',
    'localhost',
    '127.0.0.1',
  ]);

  try {
    const ref = String(document.referrer || '').trim();
    if (!ref) return fallbackOrigin;
    const parsed = new URL(ref);
    if (allowedHosts.has(parsed.hostname)) {
      return parsed.origin;
    }
  } catch {
    // Ignore invalid referrers and fall back to same origin.
  }

  return fallbackOrigin;
}

const PARENT_POSTMESSAGE_ORIGIN = resolveParentPostMessageOrigin();

function trackTelemetry(event, payload = {}) {
  try {
    window.parent.postMessage({
      type: 'GAME_TELEMETRY',
      game: 'gem',
      event,
      ts: Date.now(),
      sessionId: S.telemetrySessionId,
      world: S.currentWorld + 1,
      level: S.currentLevel + 1,
      screen: S.screen,
      payload,
    }, PARENT_POSTMESSAGE_ORIGIN);
  } catch { /* ignore */ }
}

function recordModuleLoadFailure(moduleName, error) {
  if (!S.moduleErrors.includes(moduleName)) S.moduleErrors.push(moduleName);
  console.error(`[Gem Kingdom] Failed to load ${moduleName}`, error);
  trackTelemetry('module_load_failed', { module: moduleName });
  try {
    window.parent.postMessage({
      type: 'GAME_MODULE_LOAD_FAILED',
      game: 'gem',
      module: moduleName,
    }, PARENT_POSTMESSAGE_ORIGIN);
  } catch { /* ignore */ }
}

function getTuneProfileFromQuery() {
  try {
    const tune = new URLSearchParams(window.location.search).get('tune');
    if (tune === 'performance' || tune === 'easy' || tune === 'balanced') return tune;
  } catch { /* ignore */ }
  return 'balanced';
}

// ===== STATE =====
const S = {
  screen: 'world', // 'world', 'level', 'game', 'done', 'shop', 'achieve', 'stats'
  prevScreen: 'world',
  progress: null,
  currentWorld: 0,
  currentLevel: 0,
  winStreak: 0,
  // Game state
  grid: null,
  rows: 8,
  cols: 8,
  gemCount: 7,
  phase: 'idle', // 'idle','selecting','swapping','removing','falling','checking','gameover','paused','boss_attack'
  selected: null,
  score: 0,
  movesLeft: 0,
  combo: 0,
  maxCombo: 0,
  totalGemsRemoved: 0,
  specialsUsed: 0,
  objectiveTracker: [],
  levelDef: null,
  // Boss
  boss: null,
  playerHP: 5,
  // Input
  touchStart: null,
  isDragging: false,
  swipeFrom: null,
  swipeTo: null,
  // Hint
  hintTimer: 0,
  hintMove: null,
  hintUsed: false,
  // Layout
  cellSize: 0,
  offsetX: 0,
  offsetY: 0,
  canvasW: 0,
  canvasH: 0,
  // Timing
  time: 0,
  dt: 0,
  lastTime: 0,
  // Level results
  stars: 0,
  coinsEarned: 0,
  badges: [],
  // Booster state
  activeBooster: null,
  // Animation queue
  animQueue: [],
  processing: false,
  // Muted
  muted: false,
  // Level start time
  levelStartTime: 0,
  // Undo state
  undoState: null,
  // Color-blind mode
  colorBlindMode: false,
  // Daily challenge
  isDailyChallenge: false,
  dailyChallengeTarget: 0,
  moduleErrors: [],
  telemetrySessionId: null,
  initStartedAt: 0,
  levelCompletionMarked: false,
  qosFrameDrops: 0,
  qosLongFrames: 0,
  qosWindowStartedAt: 0,
  lastQosEmitAt: 0,
  tuneProfile: 'balanced',
  laneReward: null,
};

const LEVELS_PER_WORLD = 10;
const LEVELS_PER_LANE = 10;
const LANE_ROTATION = [
  { id: 'focus', icon: '🎯' },
  { id: 'speed', icon: '⚡' },
  { id: 'logic', icon: '🧠' },
  { id: 'marathon', icon: '🏔️' },
];

function getLaneInfo(worldIdx, levelIdx) {
  const linearLevel = (worldIdx * LEVELS_PER_WORLD) + (levelIdx + 1);
  const laneIndex = Math.floor((linearLevel - 1) / LEVELS_PER_LANE) + 1;
  const laneSlot = ((linearLevel - 1) % LEVELS_PER_LANE) + 1;
  const laneTheme = LANE_ROTATION[(laneIndex - 1) % LANE_ROTATION.length];
  return {
    laneIndex,
    laneSlot,
    laneId: `lane-${laneIndex}`,
    laneIcon: laneTheme.icon,
  };
}

function ensureLaneProgress(progress) {
  if (!progress || typeof progress !== 'object') return;
  if (!progress.laneRewards || typeof progress.laneRewards !== 'object') {
    progress.laneRewards = {};
  }
  if (!Number.isFinite(progress.laneRewardTotal)) {
    progress.laneRewardTotal = 0;
  }
}

function trackLevelAbandoned(reason) {
  if (S.screen !== 'game') return;
  if (!S.levelStartTime || S.levelCompletionMarked) return;
  const elapsedSec = Math.max(0, Math.round((Date.now() - S.levelStartTime) / 1000));
  trackTelemetry('level_abandoned', {
    reason,
    score: S.score,
    movesLeft: S.movesLeft,
    elapsedSec,
  });
}

// ===== WORLDS / LEVELS =====
let WORLDS = null; // loaded dynamically

async function loadWorlds() {
  if (WORLDS) return WORLDS;
  try {
    const mod = await import('./worlds.js');
    WORLDS = mod.WORLDS;
  } catch (e) {
    recordModuleLoadFailure('worlds.js', e);
    WORLDS = generatePlaceholderWorlds();
  }
  return WORLDS;
}

function generatePlaceholderWorlds() {
  const worlds = [];
  for (let w = 0; w < 10; w++) {
    const levels = [];
    for (let l = 0; l < 10; l++) {
      levels.push({
        rows: 8, cols: 8, gemCount: Math.min(5 + Math.floor(w / 2), 7),
        moves: Math.max(25 - w, 15),
        starThresholds: [500 + w * 200 + l * 100, 1000 + w * 300 + l * 150, 2000 + w * 400 + l * 200],
        objectives: [{ type: 'score', target: 500 + w * 200 + l * 100 }],
        obstacles: [],
        isBoss: l === 9,
        isMiniBoss: l === 4,
      });
    }
    worlds.push(levels);
  }
  return worlds;
}

// ===== BOSS SYSTEM =====
let BOSSES = null;

async function loadBoss(worldIdx, levelIdx) {
  if (!BOSSES) {
    try {
      const mod = await import('./boss.js');
      BOSSES = mod;
    } catch (e) {
      recordModuleLoadFailure('boss.js', e);
      return null;
    }
  }
  return BOSSES.createBoss(worldIdx, levelIdx);
}

// ===== AUDIO =====
let AUDIO = null;

async function loadAudio() {
  if (AUDIO) return AUDIO;
  try {
    const mod = await import('./audio.js');
    AUDIO = mod;
    return AUDIO;
  } catch (e) {
    recordModuleLoadFailure('audio.js', e);
    return null;
  }
}

function playSound(name) {
  if (S.muted || !AUDIO) return;
  try { AUDIO.play(name); } catch (e) { /* silent */ }
}

// ===== INTELLIGENCE =====
let INTEL = null;

async function loadIntelligence() {
  try {
    const mod = await import('./intelligence.js');
    INTEL = mod;
  } catch (e) { recordModuleLoadFailure('intelligence.js', e); }
}

// ===== STORY =====
let STORY = null;

async function loadStory() {
  try {
    const mod = await import('./story.js');
    STORY = mod;
  } catch (e) { recordModuleLoadFailure('story.js', e); }
}

// ===== ECONOMY =====
let ECONOMY = null;

async function loadEconomy() {
  try {
    const mod = await import('./economy.js');
    ECONOMY = mod;
  } catch (e) { recordModuleLoadFailure('economy.js', e); }
}

// ===== ENGAGEMENT =====
let ENGAGE = null;

async function loadEngagement() {
  try {
    const mod = await import('./engagement.js');
    ENGAGE = mod;
  } catch (e) { recordModuleLoadFailure('engagement.js', e); }
}

// ===== INIT =====
export async function initGame() {
  S.initStartedAt = performance.now();
  S.tuneProfile = getTuneProfileFromQuery();
  S.telemetrySessionId = createSessionId();
  trackTelemetry('session_started', { lang: LANG, tune: S.tuneProfile });

  detectPerformance();

  // Show loading indicator
  const loadingEl = document.getElementById('loading-overlay');
  if (loadingEl) loadingEl.style.display = '';

  S.progress = loadProgress();
  ensureLaneProgress(S.progress);
  S.muted = localStorage.getItem(KEYS.MUTED) === 'true';

  // Legacy cleanup: daily resume snapshot was never restored.
  if (S.progress && S.progress._dailyResume) {
    delete S.progress._dailyResume;
    saveProgress(S.progress);
  }

  // Set direction
  document.documentElement.lang = LANG;
  document.documentElement.dir = DIR;

  // Load optional modules in parallel
  await Promise.allSettled([loadWorlds(), loadAudio(), loadIntelligence(), loadStory(), loadEconomy(), loadEngagement(), loadReports()]);
  trackTelemetry('modules_loaded', {
    hadModuleErrors: S.moduleErrors.length > 0,
    failedModules: S.moduleErrors.slice(),
  });

  // Hide loading indicator
  if (loadingEl) loadingEl.style.display = 'none';

  setupEventListeners();
  showScreen('world');
  trackTelemetry('game_ready', {
    perf: getPerf(),
    initMs: Math.max(0, Math.round(performance.now() - S.initStartedAt)),
    tune: S.tuneProfile,
  });

  // Start render loop
  S.lastTime = performance.now();
  requestAnimationFrame(gameLoop);

  // Auto-save on tab hide / app switch
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && S.progress) {
      trackLevelAbandoned('app_hidden');
      S.progress.lastPlayTimestamp = Date.now();
      saveProgress(S.progress);
    }
  });

  // Periodic auto-save every 60 seconds during active play
  setInterval(() => {
    if (S.screen === 'game' && S.progress) {
      S.progress.lastPlayTimestamp = Date.now();
      saveProgress(S.progress);
    }
  }, 60_000);

  // Check daily reward
  checkDailyReward();

  // Comeback message
  if (ENGAGE && S.progress.lastPlayTimestamp) {
    const hoursSince = (Date.now() - S.progress.lastPlayTimestamp) / 3600000;
    const comebackMsg = ENGAGE.getComebackMessage(hoursSince);
    if (comebackMsg) {
      const toast = qs('#comeback-toast');
      if (toast) {
        toast.querySelector('.comeback-text').textContent = comebackMsg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 5000);
      }
    }
  }
}

// ===== GAME LOOP =====
const FRAME_BUDGET_MS = 16; // Target 60fps
let _frameDropCount = 0;
let _reducedEffects = false;

function gameLoop(now) {
  const frameStart = performance.now();
  S.dt = Math.min((now - S.lastTime) / 1000, 0.1); // cap at 100ms
  S.lastTime = now;
  S.time += S.dt;

  if (S.screen === 'game') {
    updateGame();
    renderGame();
  }

  // Frame budget check — auto-reduce effects on slow devices
  const frameTime = performance.now() - frameStart;
  if (frameTime > FRAME_BUDGET_MS) {
    _frameDropCount++;
    S.qosFrameDrops++;
    if (frameTime > FRAME_BUDGET_MS * 2) S.qosLongFrames++;
    if (_frameDropCount > 30 && !_reducedEffects) {
      _reducedEffects = true;
      // Switch to low-quality mode automatically if supported
      detectPerformance();
      trackTelemetry('qos_effects_reduced', {
        perf: getPerf(),
        frameTimeMs: Math.round(frameTime),
      });
    }
  } else {
    if (_frameDropCount > 0) _frameDropCount--;
  }

  if (S.screen === 'game' && S.lastQosEmitAt > 0 && now - S.lastQosEmitAt >= 10000) {
    const windowSec = Math.max(1, Math.round((Date.now() - S.qosWindowStartedAt) / 1000));
    trackTelemetry('qos_heartbeat', {
      perf: getPerf(),
      reducedEffects: _reducedEffects,
      frameDropsWindow: S.qosFrameDrops,
      longFramesWindow: S.qosLongFrames,
      windowSec,
    });
    S.lastQosEmitAt = now;
    S.qosWindowStartedAt = Date.now();
    S.qosFrameDrops = 0;
    S.qosLongFrames = 0;
  }

  requestAnimationFrame(gameLoop);
}

// ===== UPDATE =====
function updateGame() {
  updateTweens(S.dt);
  updateParticles(S.dt);
  updateTransition(S.dt);

  // Background
  const bgCanvas = document.getElementById('bg-canvas');
  if (bgCanvas) updateBackground(S.dt, bgCanvas);

  // Hint timer (uses DDA hintDelay if available)
  if (S.phase === 'idle' && !S.hintMove) {
    S.hintTimer += S.dt;
    const hintDelay = (S._hintDelay || 5000) / 1000;
    if (S.hintTimer >= hintDelay) {
      S.hintMove = findBestMove(S.grid, S.rows, S.cols);
      S.hintTimer = 0;
      if (S.hintMove) {
        S.hintUsed = true;
        S._hintsUsedCount = (S._hintsUsedCount || 0) + 1;
      }
    }
  }

  // Process animation queue
  if (!S.processing && S.animQueue.length > 0) {
    const next = S.animQueue.shift();
    next();
  }
}

// ===== RENDER =====
function renderGame() {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  ctx.clearRect(0, 0, w, h);

  if (S.grid) {
    drawGrid(ctx, S.grid, S.rows, S.cols, S.offsetX, S.offsetY, S.cellSize, S.currentWorld, S.time);
  }

  // HUD overlays
  drawHUD(ctx, {
    hintMove: S.hintMove,
    selected: S.selected,
    cellSize: S.cellSize,
    offsetX: S.offsetX,
    offsetY: S.offsetY,
    time: S.time,
  }, w);

  // Swipe line
  if (S.isDragging && S.swipeFrom && S.swipeTo) {
    drawSwipeLine(ctx, S.swipeFrom.x, S.swipeFrom.y, S.swipeTo.x, S.swipeTo.y);
  }

  // Boss
  if (S.boss) {
    drawBossOverlay(ctx, S.boss, w, S.offsetY, S.time);
  }

  drawParticles(ctx);
  drawTransition(ctx, w, h);
}

// ===== RENDER BACKGROUND =====
function renderBackground() {
  const bgCanvas = document.getElementById('bg-canvas');
  if (!bgCanvas) return;
  const { ctx, width, height } = setupCanvas(bgCanvas);
  drawBackground(ctx, bgCanvas, S.currentWorld);
}

const FIT_SCREEN_MAP = {
  done: { screenId: 'done-screen', fitId: 'done-fit', minScale: 0.72 },
  shop: { screenId: 'shop-screen', fitId: 'shop-fit', minScale: 0.74 },
  achieve: { screenId: 'achieve-screen', fitId: 'achieve-fit', minScale: 0.74 },
  stats: { screenId: 'stats-screen', fitId: 'stats-fit', minScale: 0.74 },
  settings: { screenId: 'settings-screen', fitId: 'settings-fit', minScale: 0.74 },
  album: { screenId: 'album-screen', fitId: 'album-fit', minScale: 0.74 },
};

function fitScreenContent(screenName) {
  const conf = FIT_SCREEN_MAP[screenName];
  if (!conf) return;

  const screenEl = document.getElementById(conf.screenId);
  const fitEl = document.getElementById(conf.fitId);
  if (!screenEl || !fitEl || !screenEl.classList.contains('active')) return;

  fitEl.style.transform = 'scale(1)';

  const availableW = Math.max(1, screenEl.clientWidth - 6);
  const availableH = Math.max(1, screenEl.clientHeight - 6);
  const contentW = Math.max(1, fitEl.scrollWidth);
  const contentH = Math.max(1, fitEl.scrollHeight);

  const scale = Math.min(1, availableW / contentW, availableH / contentH);
  const appliedScale = Math.max(conf.minScale, scale);

  fitEl.style.transform = `scale(${appliedScale})`;
}

function scheduleFit(screenName) {
  if (!FIT_SCREEN_MAP[screenName]) return;
  requestAnimationFrame(() => fitScreenContent(screenName));
  setTimeout(() => fitScreenContent(screenName), 60);
}

// ===== SCREEN MANAGEMENT =====
function showScreen(name) {
  S.prevScreen = S.screen;
  S.screen = name;
  trackTelemetry('screen_view', { from: S.prevScreen, to: name });

  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active', 'fade-in');
  });

  const screenMap = {
    world: 'world-screen',
    level: 'lvl-screen',
    game: 'game-screen',
    done: 'done-screen',
    shop: 'shop-screen',
    achieve: 'achieve-screen',
    stats: 'stats-screen',
    settings: 'settings-screen',
    album: 'album-screen',
  };

  const el = document.getElementById(screenMap[name]);
  if (el) {
    el.classList.add('active', 'fade-in');
  }

  // Render screen content
  switch (name) {
    case 'world': renderWorldScreen(); break;
    case 'level': renderLevelScreen(); break;
    case 'game': startLevel(); break;
    case 'done': renderDoneScreen(); break;
    case 'shop': renderShopScreen(); break;
    case 'achieve': renderAchieveScreen(); break;
    case 'stats': renderStatsScreen(); { const sb = qs('#report-send'); if (sb) { sb.textContent = t('reportSend'); sb.classList.remove('sent'); } } break;
    case 'settings': renderSettingsScreen(); break;
    case 'album': renderAlbumScreen(); break;
  }

  scheduleFit(name);
}

// ===== WORLD SELECT =====
function renderWorldScreen() {
  const p = S.progress;
  const names = WORLD_NAMES[LANG] || WORLD_NAMES.en;

  // Update HUD
  qs('#ws-coins span').textContent = p.coins;
  qs('#ws-gems span').textContent = p.premiumGems;
  qs('#ws-level span').textContent = `Lv.${p.playerLevel}`;
  qs('#mute-btn').textContent = S.muted ? '🔇' : '🔊';

  // XP bar
  const xpForLevel = Math.floor(XP.LEVEL_UP_BASE * Math.pow(XP.LEVEL_UP_SCALE, p.playerLevel - 1));
  const xpInLevel = p.totalXP % xpForLevel;
  qs('#ws-xp-fill').style.width = `${(xpInLevel / xpForLevel) * 100}%`;
  qs('#ws-xp-label').textContent = `${xpInLevel}/${xpForLevel} XP`;

  qs('#ws-title').textContent = t('title');
  qs('#ws-sub').textContent = t('subtitle');

  // World grid
  const grid = qs('#world-grid');
  grid.innerHTML = '';

  for (let w = 0; w < 10; w++) {
    const worldStars = getWorldStars(w);
    const totalPossible = 30; // 10 levels × 3 stars
    const prevStars = w === 0 ? Infinity : getWorldStars(w - 1);
    const isUnlocked = w === 0 || prevStars >= 15; // Need 15 stars from prev world
    const card = document.createElement('div');
    card.className = `wc ${isUnlocked ? '' : 'locked'}`;
    card.style.background = WORLD_GRADIENTS[w];
    card.innerHTML = `
      <div class="wc-mascot">${WORLD_MASCOTS[w]}</div>
      <div class="wc-icon">${WORLD_ICONS[w]}</div>
      <div class="wc-name">${names[w]}</div>
      <div class="wc-stars">⭐ ${worldStars}/${totalPossible}</div>
      ${!isUnlocked ? `<div class="wc-lock">
        <div class="wc-lock-icon">🔒</div>
        <div class="wc-lock-text">${t('unlockReq', { n: 15, w: names[w-1] || '' })}</div>
      </div>` : ''}
    `;

    if (isUnlocked) {
      card.addEventListener('click', () => {
        S.currentWorld = w;
        showScreen('level');
        playSound('tap');
      });
    }

    grid.appendChild(card);
  }
}

// ===== LEVEL SELECT =====
function renderLevelScreen() {
  const w = S.currentWorld;
  const names = WORLD_NAMES[LANG] || WORLD_NAMES.en;
  const worldLaneStart = getLaneInfo(w, 0);
  const worldLaneEnd = getLaneInfo(w, 9);

  // Set background
  const el = qs('#lvl-screen');
  el.style.background = WORLD_GRADIENTS[w];

  qs('#lvl-title').textContent = `${WORLD_ICONS[w]} ${names[w]}`;
  qs('#lvl-mascot').textContent = `${WORLD_MASCOTS[w]} • ${worldLaneStart.laneIcon}L${worldLaneStart.laneIndex}→${worldLaneEnd.laneIcon}L${worldLaneEnd.laneIndex}`;

  // XP bar
  const p = S.progress;
  const xpForLevel = Math.floor(XP.LEVEL_UP_BASE * Math.pow(XP.LEVEL_UP_SCALE, p.playerLevel - 1));
  const xpInLevel = p.totalXP % xpForLevel;
  qs('#lvl-xp-fill').style.width = `${(xpInLevel / xpForLevel) * 100}%`;
  qs('#lvl-xp-label').textContent = `${xpInLevel}/${xpForLevel} XP`;

  const grid = qs('#lvl-grid');
  grid.innerHTML = '';

  const worldLevels = WORLDS?.[w] || [];
  const worldProgress = p.worlds[w] || {};

  for (let l = 0; l < 10; l++) {
    const level = worldLevels[l];
    const laneInfo = getLaneInfo(w, l);
    const stars = worldProgress.stars?.[l] ?? 0;
    const prevStars = l === 0 ? 1 : (worldProgress.stars?.[l-1] ?? 0);
    const isUnlocked = l === 0 || prevStars > 0;
    const isBoss = level?.isBoss;
    const isMiniBoss = level?.isMiniBoss;

    const card = document.createElement('div');
    const isImprovable = isUnlocked && stars > 0 && stars < 3;
    card.className = `lc ${isUnlocked ? '' : 'locked'} ${isBoss ? 'boss' : ''} ${isMiniBoss ? 'mini-boss' : ''} ${isUnlocked && stars === 0 ? 'current' : ''} ${isImprovable ? 'improvable' : ''}`;

    const gemPool = WORLD_GEMS[w];
    const levelEmoji = isBoss ? '👿' : isMiniBoss ? '😈' : (gemPool[l % gemPool.length] || '💎');
    const starStr = stars > 0 ? '⭐'.repeat(stars) + '☆'.repeat(3 - stars) : '';

    card.innerHTML = `
      <div class="lc-num">${l + 1}</div>
      <div class="lc-emoji">${levelEmoji}</div>
      <div class="lc-lane">${laneInfo.laneIcon}L${laneInfo.laneIndex}.${laneInfo.laneSlot}</div>
      <div class="lc-stars">${starStr || (isUnlocked ? '' : '')}</div>
      ${!isUnlocked ? `<div class="lc-lock">🔒</div>` : ''}
      ${isBoss ? `<div class="lc-boss-icon">👑</div>` : ''}
      ${isMiniBoss ? `<div class="lc-boss-icon">⚔️</div>` : ''}
    `;

    if (isUnlocked) {
      card.addEventListener('click', () => {
        S.currentLevel = l;
        showScreen('game');
        playSound('tap');
      });
    }

    grid.appendChild(card);
  }
}

// ===== START LEVEL =====
async function startLevel() {
  const w = S.currentWorld;
  const l = S.currentLevel;
  const worldLevels = WORLDS?.[w];
  const levelDef = worldLevels?.[l] || { rows: 8, cols: 8, gemCount: 6, moves: 25, starThresholds: [500, 1000, 2000], objectives: [{ type: 'score', target: 500 }], obstacles: [] };

  S.levelDef = levelDef;
  if (S.tuneProfile === 'easy') {
    S.levelDef = {
      ...S.levelDef,
      moves: Math.max((S.levelDef.moves || 20) + 4, S.levelDef.moves || 20),
      gemCount: Math.max(5, (S.levelDef.gemCount || 6) - 1),
    };
  }

  if (S.tuneProfile === 'performance') {
    _reducedEffects = true;
  }

  S.rows = levelDef.rows;
  S.cols = levelDef.cols;
  S.gemCount = S.levelDef.gemCount;
  S.movesLeft = S.levelDef.moves;
  S.score = 0;
  S.combo = 0;
  S.maxCombo = 0;
  S.totalGemsRemoved = 0;
  S.specialsUsed = 0;
  S.selected = null;
  S.phase = 'idle';
  S.hintTimer = 0;
  S.hintMove = null;
  S.hintUsed = false;
  S.stars = 0;
  S.coinsEarned = 0;
  S.badges = [];
  S.activeBooster = null;
  S.animQueue = [];
  S.processing = false;
  S.playerHP = 5;
  S.levelStartTime = Date.now();
  S.levelCompletionMarked = false;
  S.laneReward = null;
  S.qosFrameDrops = 0;
  S.qosLongFrames = 0;
  S.qosWindowStartedAt = Date.now();
  S.lastQosEmitAt = performance.now();
  trackTelemetry('level_started', {
    world: w + 1,
    level: l + 1,
    isDailyChallenge: !!S.isDailyChallenge,
    tune: S.tuneProfile,
  });
  S.undoState = null;
  S.undoStack = [];
  S.colorBlindMode = S.progress.settings?.colorBlind || false;
  setColorBlindMode(S.colorBlindMode);
  setGemStyle(S.progress.settings?.gemStyle || 'classic');
  setBoardTheme(S.progress.settings?.theme || 'classic');
  if (!S.isDailyChallenge) S.dailyChallengeTarget = 0;

  clearTweens();
  clearParticles();

  // Init grid
  S.grid = initGrid(S.rows, S.cols, S.gemCount, levelDef.obstacles || []);
  S.objectiveTracker = createObjectiveTracker(levelDef.objectives || []);

  // Boss?
  S.boss = null;
  if (levelDef.isBoss || levelDef.isMiniBoss) {
    S.boss = await loadBoss(w, l);
    if (!S.boss) {
      // Fallback boss
      S.boss = {
        active: true, defeated: false,
        emoji: levelDef.isBoss ? '🐲' : '😈',
        name: levelDef.isBoss ? t('worldBoss') : t('miniBoss'),
        hp: levelDef.isBoss ? 300 : 100,
        maxHP: levelDef.isBoss ? 300 : 100,
        phase: 1, maxPhase: levelDef.isBoss ? 3 : 1,
        attackInterval: 4, attackTimer: 4,
        isAttacking: false,
      };
    }
  }

  // Setup canvas
  const gameScreen = qs('#game-screen');
  gameScreen.style.background = WORLD_GRADIENTS[w];

  setupGameCanvas();
  initBackground(document.getElementById('bg-canvas'), w);
  renderBackground();

  // Update HUD
  updateGameHUD();

  // Boss bar
  updateBossBar();

  // Render objectives
  renderObjectives();

  // Render boosters
  renderBoosters();

  const shouldShowTutorial = (w === 0 && l === 0);

  // Story intro?
  let storyShown = false;
  if (STORY && l === 0) {
    const dialog = STORY.getWorldIntro(w);
    if (dialog) {
      storyShown = true;
      showStoryDialog(dialog, () => {
        if (shouldShowTutorial) {
          setTimeout(() => showTutorial(), 400);
        }
      });
    }
  }

  // DDA adjustment
  S._hintsUsedCount = 0;
  if (INTEL) {
    const adj = INTEL.getLevelAdjustment(S.progress, w, l);
    if (adj) {
      S.movesLeft += adj.extraMoves || 0;
      S.spawnBias = adj.spawnBias || 0;
      S._hintDelay = adj.hintDelay || 5000;
    }
  } else {
    S.spawnBias = 0;
    S._hintDelay = 5000;
  }

  // Show tutorial for first-time players on World 0 Level 0
  if (shouldShowTutorial && !storyShown) {
    setTimeout(() => showTutorial(), 500);
  }

  // Reset undo button
  const undoBtn = qs('#g-undo');
  if (undoBtn) undoBtn.classList.add('disabled');

  trackTelemetry('level_ready', {
    rows: S.rows,
    cols: S.cols,
    gemCount: S.gemCount,
    moves: S.movesLeft,
    hasBoss: !!S.boss,
  });
}

function setupGameCanvas() {
  const canvas = document.getElementById('game-canvas');
  const wrap = canvas.parentElement;
  const rect = wrap.getBoundingClientRect();

  // Size canvas to available space
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  S.canvasW = rect.width;
  S.canvasH = rect.height;
  // Cache canvas rect for pointer events (avoid repeated reflow)
  S._cachedCanvasRect = canvas.getBoundingClientRect();

  // Calc layout
  const layout = calcLayout(rect.width, rect.height, S.rows, S.cols);
  S.cellSize = layout.cellSize;
  S.offsetX = layout.offsetX;
  S.offsetY = layout.offsetY;

  // Set bg canvas size
  const bgCanvas = document.getElementById('bg-canvas');
  if (bgCanvas) {
    bgCanvas.style.width = '100%';
    bgCanvas.style.height = '100%';
    bgCanvas.width = rect.width * dpr;
    bgCanvas.height = rect.height * dpr;
    const bgCtx = bgCanvas.getContext('2d');
    bgCtx.scale(dpr, dpr);
  }
}

// ===== GAME HUD =====
function updateGameHUD() {
  const names = WORLD_NAMES[LANG] || WORLD_NAMES.en;
  const laneInfo = getLaneInfo(S.currentWorld, S.currentLevel);

  qs('#g-title').textContent = `${WORLD_ICONS[S.currentWorld]} ${names[S.currentWorld]}`;
  qs('#g-level').textContent = `${t('level')} ${S.currentLevel + 1} • ${laneInfo.laneIcon}L${laneInfo.laneIndex}.${laneInfo.laneSlot}`;
  qs('#g-score').textContent = S.score;
  qs('#g-score-label').textContent = t('score');
  qs('#g-moves').textContent = S.movesLeft;
  qs('#g-moves-label').textContent = t('moves');

  // Danger state
  const movesEl = qs('#g-moves');
  if (S.movesLeft <= 3) movesEl.classList.add('danger');
  else movesEl.classList.remove('danger');

  // Combo
  const comboEl = qs('#g-combo');
  if (S.combo >= 2) {
    comboEl.textContent = `🔥 ${t('combo')} ×${S.combo}`;
    comboEl.style.display = '';
  } else {
    comboEl.style.display = 'none';
  }

  // Objectives
  renderObjectives();
}

function renderObjectives() {
  const el = qs('#g-obj');
  el.innerHTML = '';
  for (const obj of S.objectiveTracker) {
    const done = obj.current >= obj.target;
    const item = document.createElement('div');
    item.className = `g-obj-item ${done ? 'done' : ''}`;
    item.textContent = getObjectiveText(obj) + ` ${obj.current}/${obj.target}`;
    el.appendChild(item);
  }
}

function getObjectiveText(obj) {
  switch (obj.type) {
    case 'score': return '🎯';
    case 'collect': return obj.gem || '💎';
    case 'breakIce': return '❄️';
    case 'freeCaged': return '🔓';
    case 'lightTiles': return '💡';
    case 'cascade': return '🔥';
    case 'useSpecial': return '🌟';
    case 'clearBottom': return '⬇️';
    case 'defuse': return '💣';
    case 'boss': return '⚔️';
    default: return '🎯';
  }
}

function updateBossBar() {
  const bar = qs('#boss-bar');
  if (!S.boss || !S.boss.active) {
    bar.classList.remove('active');
    return;
  }
  bar.classList.add('active');
  qs('#boss-emoji').textContent = S.boss.emoji;
  qs('#boss-name').textContent = S.boss.name;
  qs('#boss-phase').textContent = S.boss.maxPhase > 1 ? t('bossPhase', { n: S.boss.phase }) : '';
  qs('#boss-hp-fill').style.width = `${(S.boss.hp / S.boss.maxHP) * 100}%`;

  // Player hearts
  const hpEl = qs('#player-hp');
  hpEl.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const heart = document.createElement('span');
    heart.className = `player-heart ${i >= S.playerHP ? 'lost' : ''}`;
    heart.textContent = '❤️';
    hpEl.appendChild(heart);
  }
}

function renderBoosters() {
  const el = qs('#g-boosters');
  el.innerHTML = '';
  const boosters = [
    { key: 'hammer', emoji: '🔨', name: t('boosterHammer') },
    { key: 'shuffle', emoji: '🔀', name: t('boosterShuffle') },
    { key: 'extraMoves', emoji: '➕', name: t('boosterMoves') },
  ];

  for (const b of boosters) {
    const count = S.progress.boosters[b.key] || 0;
    const btn = document.createElement('button');
    btn.className = `g-booster ${count === 0 ? 'empty' : ''}`;
    btn.innerHTML = `${b.emoji}${count > 0 ? `<span class="count">${count}</span>` : ''}`;
    btn.title = b.name;
    if (count > 0) {
      btn.addEventListener('click', () => useBooster(b.key));
    }
    el.appendChild(btn);
  }
}

// ===== INPUT HANDLERS =====
function setupEventListeners() {
  // World screen buttons
  qs('#btn-shop').addEventListener('click', () => showScreen('shop'));
  qs('#btn-achieve').addEventListener('click', () => showScreen('achieve'));
  qs('#btn-stats').addEventListener('click', () => showScreen('stats'));
  qs('#btn-daily').addEventListener('click', () => showDailyReward());
  qs('#btn-settings')?.addEventListener('click', () => showScreen('settings'));
  qs('#btn-album')?.addEventListener('click', () => showScreen('album'));
  qs('#mute-btn').addEventListener('click', toggleMute);

  // Level back
  qs('#lvl-back').addEventListener('click', () => { showScreen('world'); playSound('tap'); });

  // Game back
  qs('#g-back').addEventListener('click', () => {
    trackLevelAbandoned('back_button');
    showScreen('level');
    playSound('tap');
  });

  // Undo button
  qs('#g-undo')?.addEventListener('click', () => {
    if (S.undoStack && S.undoStack.length > 0 && S.phase === 'idle') {
      undoLastMove();
      playSound('tap');
    }
  });

  // Navigation backs
  qs('#shop-back').addEventListener('click', () => showScreen('world'));
  qs('#ach-back').addEventListener('click', () => showScreen('world'));
  qs('#stats-back').addEventListener('click', () => showScreen('world'));
  qs('#settings-back')?.addEventListener('click', () => showScreen('world'));
  qs('#album-back')?.addEventListener('click', () => showScreen('world'));
  qs('#report-send').addEventListener('click', () => {
    if (REPORTS) {
      try {
        const report = REPORTS.generateFullReport(S.progress);
        window.parent.postMessage(report, PARENT_POSTMESSAGE_ORIGIN);
      } catch(e) {}
    }
    const btn = qs('#report-send');
    btn.textContent = t('reportSent');
    btn.classList.add('sent');
  });

  // Game canvas input
  const canvas = document.getElementById('game-canvas');

  canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
  canvas.addEventListener('pointermove', onPointerMove, { passive: false });
  canvas.addEventListener('pointerup', onPointerUp, { passive: false });
  canvas.addEventListener('pointercancel', onPointerUp, { passive: false });

  // Prevent context menu on game
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // Resize
  window.addEventListener('resize', () => {
    if (S.screen === 'game') setupGameCanvas();
    scheduleFit(S.screen);
  });

  // Keyboard accessibility for game grid
  S._kbCursor = { row: 0, col: 0 };
  S._kbSelected = null;
  document.addEventListener('keydown', (e) => {
    if (S.screen !== 'game' || S.phase !== 'idle') return;
    const c = S._kbCursor;
    let handled = true;
    switch (e.key) {
      case 'ArrowUp':    c.row = Math.max(0, c.row - 1); break;
      case 'ArrowDown':  c.row = Math.min(S.rows - 1, c.row + 1); break;
      case 'ArrowLeft':  c.col = Math.max(0, c.col - 1); break;
      case 'ArrowRight': c.col = Math.min(S.cols - 1, c.col + 1); break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!S._kbSelected) {
          S._kbSelected = { row: c.row, col: c.col };
          const gem = S.grid[c.row]?.[c.col];
          if (gem) gem._selected = true;
        } else {
          const from = S._kbSelected;
          const to = { row: c.row, col: c.col };
          // Deselect old
          const oldGem = S.grid[from.row]?.[from.col];
          if (oldGem) oldGem._selected = false;
          S._kbSelected = null;
          if (areAdjacent(from, to)) {
            trySwap(from, to);
          }
        }
        break;
      case 'Escape':
        if (S._kbSelected) {
          const gem = S.grid[S._kbSelected.row]?.[S._kbSelected.col];
          if (gem) gem._selected = false;
          S._kbSelected = null;
        }
        break;
      default:
        handled = false;
    }
    if (handled) e.preventDefault();
  });
}

function getGridPos(clientX, clientY) {
  const canvas = document.getElementById('game-canvas');
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const col = Math.floor((x - S.offsetX) / S.cellSize);
  const row = Math.floor((y - S.offsetY) / S.cellSize);
  if (row >= 0 && row < S.rows && col >= 0 && col < S.cols) {
    return { row, col, x, y };
  }
  return null;
}

function onPointerDown(e) {
  if (S.phase !== 'idle' || isTransitioning()) return;
  // Prevent multi-touch: only track one pointer at a time
  if (S._activePointerId != null) return;
  S._activePointerId = e.pointerId;
  e.preventDefault();

  const pos = getGridPos(e.clientX, e.clientY);
  if (!pos) return;

  // Booster mode
  if (S.activeBooster) {
    applyBooster(S.activeBooster, pos.row, pos.col);
    S.activeBooster = null;
    S._activePointerId = null;
    return;
  }

  S.touchStart = pos;
  S.isDragging = true;
  S.swipeFrom = { x: pos.x, y: pos.y };
  S.swipeTo = { x: pos.x, y: pos.y };

  // Selection
  const gem = S.grid[pos.row]?.[pos.col];
  if (!gem) return;

  if (S.selected) {
    // Try swap
    if (areAdjacent(S.selected, pos)) {
      trySwap(S.selected, pos);
      S.selected = null;
    } else {
      S.selected = { row: pos.row, col: pos.col };
    }
  } else {
    S.selected = { row: pos.row, col: pos.col };
  }

  S.hintMove = null;
  S.hintTimer = 0;
}

function onPointerMove(e) {
  if (!S.isDragging || S.phase !== 'idle') return;
  if (e.pointerId !== S._activePointerId) return;
  e.preventDefault();

  const pos = getGridPos(e.clientX, e.clientY);
  if (pos) S.swipeTo = { x: pos.x, y: pos.y };

  if (!S.touchStart) return;

  const canvasRect = S._cachedCanvasRect || document.getElementById('game-canvas').getBoundingClientRect();
  const dx = e.clientX - (S.touchStart.x + canvasRect.left);
  const dy = e.clientY - (S.touchStart.y + canvasRect.top);
  // Wait for actual swipe (at least half cell)
  // Use raw pixel delta
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const threshold = S.cellSize * 0.3;

  if (absDx > threshold || absDy > threshold) {
    let dir;
    if (absDx > absDy) dir = dx > 0 ? { row: 0, col: 1 } : { row: 0, col: -1 };
    else dir = dy > 0 ? { row: 1, col: 0 } : { row: -1, col: 0 };

    // Swap with swipe heuristic
    const target = {
      row: S.touchStart.row + dir.row,
      col: S.touchStart.col + dir.col,
    };
    if (target.row >= 0 && target.row < S.rows && target.col >= 0 && target.col < S.cols) {
      trySwap(S.touchStart, target);
      S.selected = null;
    }
    S.isDragging = false;
    S.touchStart = null;
  }
}

function onPointerUp(e) {
  if (e.pointerId !== S._activePointerId) return;
  S.isDragging = false;
  S.touchStart = null;
  S._activePointerId = null;
}

// ===== SWAP & MATCH =====
async function trySwap(a, b) {
  if (S.phase !== 'idle') return;
  S.phase = 'swapping';
  S.hintMove = null;

  // Save state for undo before the swap
  saveUndoState();

  // Haptic feedback on swap
  triggerHaptic('light');

  const gemA = S.grid[a.row][a.col];
  const gemB = S.grid[b.row][b.col];
  if (!gemA || !gemB) { S.phase = 'idle'; return; }

  // Check for power combo (two specials swapped)
  const comboType = (gemA.special !== SPECIAL.NONE && gemB.special !== SPECIAL.NONE)
    ? getPowerCombo(gemA.special, gemB.special) : null;

  // Animate swap
  await animateSwap(a, b);

  if (comboType) {
    // Power combo!
    playSound('powerCombo');
    S.movesLeft--;
    spawnSpecialActivation(
      S.offsetX + b.col * S.cellSize + S.cellSize / 2,
      S.offsetY + b.row * S.cellSize + S.cellSize / 2,
      gemB.special
    );
    const clearPos = getPowerComboClearPositions(comboType, b.row, b.col, S.grid, S.rows, S.cols);
    await clearPositions(clearPos, true);
    S.progress.totalPowerCombos++;
    await cascadeLoop();
    return;
  }

  // Rainbow + normal gem: target that gem's type
  if (gemA.special === SPECIAL.RAINBOW && gemB.special === SPECIAL.NONE) {
    gemA._rainbowTarget = gemB.type;
  } else if (gemB.special === SPECIAL.RAINBOW && gemA.special === SPECIAL.NONE) {
    gemB._rainbowTarget = gemA.type;
  }

  // Check for matches after swap
  const { matched } = findMatches(S.grid, S.rows, S.cols);
  if (matched.size > 0) {
    playSound('match');
    S.movesLeft--;
    S.combo = 0;
    await cascadeLoop();
  } else {
    // Swap back
    playSound('badSwap');
    await animateSwap(b, a);
    S.phase = 'idle';
  }
}

function animateSwap(a, b) {
  return new Promise(resolve => {
    const gemA = S.grid[a.row][a.col];
    const gemB = S.grid[b.row][b.col];
    if (!gemA || !gemB) { resolve(); return; }

    const axPx = S.offsetX + a.col * S.cellSize;
    const ayPx = S.offsetY + a.row * S.cellSize;
    const bxPx = S.offsetX + b.col * S.cellSize;
    const byPx = S.offsetY + b.row * S.cellSize;

    gemA._drawX = axPx;
    gemA._drawY = ayPx;
    gemB._drawX = bxPx;
    gemB._drawY = byPx;

    swapGems(S.grid, a, b);

    let done = 0;
    const onDone = () => { done++; if (done >= 2) resolve(); };

    addTween(gemA, { _drawX: bxPx, _drawY: byPx }, TIMING.SWAP / 1000, 'easeOut', onDone);
    addTween(gemB, { _drawX: axPx, _drawY: ayPx }, TIMING.SWAP / 1000, 'easeOut', onDone);
  });
}

// ===== CASCADE LOOP =====
async function cascadeLoop() {
  S.phase = 'checking';
  let hadMatches = true;

  while (hadMatches) {
    // Process matches
    const result = processMatches(S.grid, S.rows, S.cols);
    if (!result) {
      hadMatches = false;
      break;
    }

    S.combo++;
    S.maxCombo = Math.max(S.maxCombo, S.combo);
    const multiplier = calcComboMultiplier(S.combo);
    const roundScore = Math.floor(result.score * multiplier);
    S.score += roundScore;
    S.totalGemsRemoved += result.removedPositions.size;

    // Track specials
    for (const ca of result.chainActivated) S.specialsUsed++;

    // Spawn particles for removed gems
    for (const key of result.removedPositions) {
      const [r, c] = key.split(',').map(Number);
      const px = S.offsetX + c * S.cellSize + S.cellSize / 2;
      const py = S.offsetY + r * S.cellSize + S.cellSize / 2;
      const accent = WORLD_ACCENTS[S.currentWorld];
      spawnBurst(px, py, 4, { color: accent, size: 4, life: 0.4, speed: 2 });
    }

    // Obstacle-specific sounds
    if (result.obstaclesHit.length > 0) {
      const played = new Set();
      for (const oh of result.obstaclesHit) {
        let snd = null;
        if (oh.type === OBSTACLE.ICE_1 || oh.type === OBSTACLE.ICE_2) snd = 'iceBreak';
        else if (oh.type === OBSTACLE.STONE) snd = 'stoneBreak';
        else if (oh.type === OBSTACLE.CHAIN) snd = 'chainBreak';
        if (snd && !played.has(snd)) { playSound(snd); played.add(snd); }
      }
      S.progress.totalObstaclesBroken = (S.progress.totalObstaclesBroken || 0) + result.obstaclesHit.filter(o => o.destroyed).length;
      S.progress.totalIceBreak = (S.progress.totalIceBreak || 0) + result.obstaclesHit.filter(o => (o.type === OBSTACLE.ICE_1 || o.type === OBSTACLE.ICE_2) && o.destroyed).length;
    }

    // Combo text
    if (S.combo >= 2) {
      // Haptic feedback on combo
      triggerHaptic(S.combo >= 5 ? 'heavy' : 'medium');
      const midKey = [...result.removedPositions][Math.floor(result.removedPositions.size / 2)];
      if (midKey) {
        const [mr, mc] = midKey.split(',').map(Number);
        spawnComboText(
          S.offsetX + mc * S.cellSize + S.cellSize / 2,
          S.offsetY + mr * S.cellSize,
          `${S.combo}x`
        );
      }
      playSound(S.combo >= 5 ? 'megaCombo' : 'combo');

      // Cascade visual effects — screen shake & flash for big combos
      if (!_reducedEffects) {
        // Screen shake — intensity scales with combo
        const shakeIntensity = Math.min(S.combo * 2, 12);
        const canvas = qs('#game-canvas');
        if (canvas) {
          const origTransform = canvas.style.transform || '';
          let shakeFrames = 0;
          const shakeAnim = () => {
            if (shakeFrames >= 6) { canvas.style.transform = origTransform; return; }
            const dx = (Math.random() - 0.5) * shakeIntensity;
            const dy = (Math.random() - 0.5) * shakeIntensity;
            canvas.style.transform = `translate(${dx}px,${dy}px)`;
            shakeFrames++;
            requestAnimationFrame(shakeAnim);
          };
          requestAnimationFrame(shakeAnim);
        }
        // Screen flash for combo >= 4
        if (S.combo >= 4) {
          const flash = document.createElement('div');
          flash.style.cssText = `position:fixed;inset:0;background:${S.combo >= 8 ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.2)'};pointer-events:none;z-index:9999;transition:opacity 0.3s`;
          document.body.appendChild(flash);
          requestAnimationFrame(() => { flash.style.opacity = '0'; });
          setTimeout(() => flash.remove(), 350);
        }
        // Burst of extra particles for big cascades (5+)
        if (S.combo >= 5) {
          for (let i = 0; i < S.combo * 3; i++) {
            const px = S.offsetX + Math.random() * (S.cols * S.cellSize);
            const py = S.offsetY + Math.random() * (S.rows * S.cellSize);
            spawnBurst(px, py, 2, { color: WORLD_ACCENTS[S.currentWorld], size: 5, life: 0.6, speed: 3 });
          }
        }
      }

      // Streak engagement message
      if (ENGAGE && S.combo >= 2) {
        const streakMsg = ENGAGE.getStreakMessage(S.combo);
        if (streakMsg) {
          const st = qs('#streak-toast');
          if (st) { st.textContent = streakMsg; st.classList.add('show'); clearTimeout(st._timer); st._timer = setTimeout(() => st.classList.remove('show'), 1800); }
        }
      }
    }

    // Special creations particles
    for (const sp of result.specialsCreated) {
      const px = S.offsetX + sp.col * S.cellSize + S.cellSize / 2;
      const py = S.offsetY + sp.row * S.cellSize + S.cellSize / 2;
      spawnSpecialActivation(px, py, sp.special);
      playSound('specialCreate');

      // Track special gem usage for achievements
      if (sp.special === SPECIAL.BOMB)      S.progress.totalBombsUsed = (S.progress.totalBombsUsed || 0) + 1;
      if (sp.special === SPECIAL.RAINBOW)   S.progress.totalRainbowsUsed = (S.progress.totalRainbowsUsed || 0) + 1;
      if (sp.special === SPECIAL.NOVA)      S.progress.totalNovasUsed = (S.progress.totalNovasUsed || 0) + 1;
      if (sp.special === SPECIAL.LIGHTNING) S.progress.totalLightningsUsed = (S.progress.totalLightningsUsed || 0) + 1;
    }

    // Animate removal
    await animateRemoval(result.removedPositions);

    // Update objectives
    updateObjectives(S.objectiveTracker, {
      score: S.score,
      removedTypes: [...result.removedPositions].map(k => {
        const [r, c] = k.split(',').map(Number);
        return S.grid[r]?.[c]?.type;
      }).filter(t => t !== undefined),
      obstaclesHit: result.obstaclesHit,
      combo: S.combo,
      specialsUsed: result.chainActivated.length,
    });

    // Boss damage
    if (S.boss && S.boss.active && !S.boss.defeated) {
      const damage = roundScore * 0.3;
      S.boss.hp -= damage;
      if (S.boss.hp <= 0) {
        S.boss.hp = 0;
        S.boss.defeated = true;
        playSound('bossDefeat');
        spawnBossDefeatEffects(S.canvasW / 2, S.offsetY - 40);
        updateObjectives(S.objectiveTracker, { bossDefeated: true });
      }
      updateBossBar();
    }

    // Gravity
    const falls = applyGravity(S.grid, S.rows, S.cols);
    const spawns = spawnNewGems(S.grid, S.rows, S.cols, S.gemCount, S.spawnBias);

    // Animate falls
    await animateFalls(falls, spawns);

    // Conveyor belt mechanics
    const conveyed = moveConveyors(S.grid, S.rows, S.cols);
    if (conveyed.length > 0) setupGemDrawPositions();

    // Shadow spreading (30% chance per adjacent cell)
    spreadShadows(S.grid, S.rows, S.cols);

    // Moss spreading (15% chance, slower than shadow)
    spreadMoss(S.grid, S.rows, S.cols);

    // Free caged gems that reached the bottom row
    const freed = checkCagedItems(S.grid, S.rows, S.cols);
    if (freed > 0) {
      updateObjectives(S.objectiveTracker, { cagesFreed: freed });
    }

    // Update HUD
    updateGameHUD();

    // Small delay between cascades
    await delay(50);
  }

  // Boss attack phase
  if (S.boss && S.boss.active && !S.boss.defeated) {
    S.boss.attackTimer -= 1;
    if (S.boss.attackTimer <= 0) {
      await bossAttack();
      S.boss.attackTimer = S.boss.attackInterval;
    }
  }

  // Bomb timer tick
  const exploded = tickBombTimers(S.grid, S.rows, S.cols);
  if (exploded.length > 0) {
    // Bomb exploded — lose a life if not defused
    S.playerHP -= exploded.length;
    updateBossBar();
    for (const exp of exploded) {
      const px = S.offsetX + exp.col * S.cellSize + S.cellSize / 2;
      const py = S.offsetY + exp.row * S.cellSize + S.cellSize / 2;
      spawnBurst(px, py, 10, { color: '#ff4444', type: 'sparkle', size: 8, life: 0.6, speed: 5 });
    }
    playSound('explosion');
  }

  // Check valid moves
  if (!hasValidMoves(S.grid, S.rows, S.cols)) {
    playSound('shuffle');
    // Show shuffle message
    spawnComboText(S.canvasW / 2, S.canvasH / 2, t('shuffling'));
    await delay(500);
    shuffleGrid(S.grid, S.rows, S.cols);
    setupGemDrawPositions();
  }

  // Check game over conditions
  if (S.movesLeft <= 0 || S.playerHP <= 0) {
    await endLevel();
  } else if (objectivesComplete(S.objectiveTracker)) {
    await endLevel();
  } else {
    S.phase = 'idle';
    S.combo = 0;
  }
}

function setupGemDrawPositions() {
  for (let r = 0; r < S.rows; r++) {
    for (let c = 0; c < S.cols; c++) {
      const gem = S.grid[r][c];
      if (gem) {
        gem._drawX = S.offsetX + c * S.cellSize;
        gem._drawY = S.offsetY + r * S.cellSize;
      }
    }
  }
}

// ===== ANIMATIONS =====
function animateRemoval(removedSet) {
  return new Promise(resolve => {
    let pending = removedSet.size;
    if (pending === 0) { resolve(); return; }

    for (const key of removedSet) {
      const [r, c] = key.split(',').map(Number);
      const gem = S.grid[r]?.[c];
      if (!gem) { pending--; if (pending <= 0) resolve(); continue; }

      gem._scale = 1;
      gem._alpha = 1;
      addTween(gem, { _scale: 0, _alpha: 0 }, TIMING.REMOVE / 1000, 'easeIn', () => {
        pending--;
        if (pending <= 0) resolve();
      });
    }
  });
}

function animateFalls(falls, spawns) {
  return new Promise(resolve => {
    let pending = falls.length + spawns.length;
    if (pending === 0) { resolve(); return; }

    for (const f of falls) {
      const gem = S.grid[f.toRow][f.toCol];
      if (!gem) { pending--; continue; }
      const targetY = S.offsetY + f.toRow * S.cellSize;
      gem._drawX = S.offsetX + f.toCol * S.cellSize;
      gem._drawY = S.offsetY + f.fromRow * S.cellSize;
      gem._scale = 1;
      gem._alpha = 1;
      const dist = Math.abs(f.toRow - f.fromRow);
      addTween(gem, { _drawY: targetY }, (TIMING.FALL * dist) / 1000, 'bounce', () => {
        pending--;
        if (pending <= 0) resolve();
      });
    }

    for (const s of spawns) {
      const gem = s.gem;
      const targetY = S.offsetY + s.row * S.cellSize;
      gem._drawX = S.offsetX + s.col * S.cellSize;
      gem._drawY = S.offsetY + (s.fallFrom) * S.cellSize;
      gem._scale = 1;
      gem._alpha = 1;
      const dist = Math.abs(s.row - s.fallFrom);
      addTween(gem, { _drawY: targetY }, (TIMING.FALL * dist) / 1000, 'bounce', () => {
        pending--;
        if (pending <= 0) resolve();
      });
    }
  });
}

// ===== CLEAR POSITIONS (for specials/combos) =====
async function clearPositions(positions, isCombo = false) {
  const keys = new Set(positions.map(p => `${p.row},${p.col}`));
  const toRemove = [];

  for (const p of positions) {
    const gem = S.grid[p.row]?.[p.col];
    if (!gem) continue;

    // Cascade chain: activated specials→clear more
    if (gem.special !== SPECIAL.NONE && !isCombo) {
      const chainPos = getSpecialClearPositions(gem.special, p.row, p.col, S.grid, S.rows, S.cols);
      for (const cp of chainPos) keys.add(`${cp.row},${cp.col}`);
    }

    toRemove.push(p);
  }

  const score = toRemove.length * SCORING.MATCH_3 * 0.5;
  S.score += Math.floor(score);

  // Animate
  await animateRemoval(keys);

  // Remove from grid
  for (const key of keys) {
    const [r, c] = key.split(',').map(Number);
    if (S.grid[r]?.[c]?.obstacle !== OBSTACLE.STONE) {
      S.grid[r][c] = null;
    }
  }
}

// ===== BOSS ATTACK =====
async function bossAttack() {
  if (!S.boss || S.boss.defeated) return;

  S.boss.isAttacking = true;

  // Show boss taunt
  let taunt = t('bossAttack');
  if (BOSSES) {
    const bossT = BOSSES.getBossTaunt(S.boss);
    if (bossT) taunt = bossT;
  }
  spawnComboText(S.canvasW / 2, S.canvasH / 3, taunt);
  playSound('bossAttack');
  await delay(600);

  // Get phase-aware attack from boss module
  const attackInstructions = BOSSES ? BOSSES.getBossAttack(S.boss) : [];

  // Gather empty cells
  const empties = [];
  for (let r = 0; r < S.rows; r++) {
    for (let c = 0; c < S.cols; c++) {
      if (S.grid[r][c] && S.grid[r][c].obstacle === OBSTACLE.NONE) empties.push({ row: r, col: c });
    }
  }
  shuffle(empties);

  if (attackInstructions.length > 0) {
    // Apply each attack instruction from boss module
    let idx = 0;
    for (const instr of attackInstructions) {
      if (instr.type === 'shuffle') {
        // Boss shuffles the board
        playSound('shuffle');
        spawnComboText(S.canvasW / 2, S.canvasH / 2, t('shuffling'));
        shuffleGrid(S.grid, S.rows, S.cols);
        setupGemDrawPositions();
        continue;
      }
      // Place obstacles on empty cells
      const count = Math.min(instr.count, empties.length - idx);
      for (let i = 0; i < count && idx < empties.length; i++, idx++) {
        const { row, col } = empties[idx];
        S.grid[row][col].obstacle = instr.obstacle;
        S.grid[row][col].obstacleHP = instr.hp;
        const px = S.offsetX + col * S.cellSize + S.cellSize / 2;
        const py = S.offsetY + row * S.cellSize + S.cellSize / 2;
        const colors = { 1: '#88ccff', 3: '#ffaa33', 4: '#999', 6: '#333', 11: '#ff4444', 12: '#ffd700', 13: '#6633cc', 5: '#aa8855' };
        const color = colors[instr.obstacle] || '#88ccff';
        spawnBurst(px, py, 6, { color, type: 'sparkle', size: 6, life: 0.5, speed: 3 });
      }
    }
  } else {
    // Fallback: basic ICE_1 attack if boss module unavailable
    const attacks = Math.min(3, empties.length);
    for (let i = 0; i < attacks; i++) {
      const { row, col } = empties[i];
      S.grid[row][col].obstacle = OBSTACLE.ICE_1;
      S.grid[row][col].obstacleHP = 1;
      const px = S.offsetX + col * S.cellSize + S.cellSize / 2;
      const py = S.offsetY + row * S.cellSize + S.cellSize / 2;
      spawnBurst(px, py, 6, { color: '#88ccff', type: 'sparkle', size: 6, life: 0.5, speed: 3 });
    }
  }

  S.boss.isAttacking = false;
}

// ===== END LEVEL =====
async function endLevel() {
  S.phase = 'gameover';
  S.levelCompletionMarked = true;
  ensureLaneProgress(S.progress);
  const laneInfo = getLaneInfo(S.currentWorld, S.currentLevel);
  const won = objectivesComplete(S.objectiveTracker);
  const stars = won ? calcStars(S.score, S.levelDef.starThresholds) : 0;
  S.stars = stars;
  let wasNewHighScore = false;

  // Calculate coins via economy.js or fallback
  if (ECONOMY && won) {
    const reward = ECONOMY.calcReward({
      score: S.score,
      stars,
      isBoss: !!S.levelDef.isBoss,
      isMiniBoss: !!S.levelDef.isMiniBoss,
      movesLeft: S.movesLeft,
      totalMoves: S.levelDef.moves,
      usedBoosters: 0,
      winStreak: S.winStreak,
      worldIdx: S.currentWorld,
    });
    S.coinsEarned = reward.total;
  } else {
    const baseCoins = won ? 5 + stars * 3 : 1;
    const bossBonus = S.boss && S.boss.defeated ? 10 : 0;
    S.coinsEarned = baseCoins + bossBonus;
  }

  // Track win streak
  if (won) S.winStreak++;
  else S.winStreak = 0;

  // Snapshot previous stats for milestone detection
  const prevStats = {
    totalStars: getTotalStars(S.progress),
    levelsCompleted: S.progress.levelsCompleted,
    totalCoins: S.progress.totalCoinsEarned,
  };

  // Badges via engagement.js micro-badges
  S.badges = [];
  const elapsed = (Date.now() - S.levelStartTime) / 1000;
  if (ENGAGE) {
    const microStats = {
      specialsCreated: S.specialsUsed,
      maxCombo: S.maxCombo,
      powerCombos: S.progress.totalPowerCombos || 0,
      movesLeftPct: S.levelDef.moves > 0 ? Math.round((S.movesLeft / S.levelDef.moves) * 100) : 0,
      timeSec: elapsed,
      obstaclesCleared: 0,
      badSwaps: 0,
      totalSwaps: S.levelDef.moves - S.movesLeft,
      bossDefeated: S.boss && S.boss.defeated,
      rainbowsCreated: 0,
      score: S.score,
    };
    const microBadges = ENGAGE.checkMicroBadges(microStats);
    for (const mb of microBadges) S.badges.push(`${mb.icon} ${mb.text}`);
  } else {
    // Fallback inline badges
    if (elapsed < 30 && won) S.badges.push(t('badgeFast'));
    if (!S.hintUsed && won) S.badges.push(t('badgeNoHint'));
    if (stars === 3) S.badges.push(t('badgePerfect'));
    if (S.maxCombo >= 5) S.badges.push(t('badgeCombo'));
    if (S.specialsUsed >= 3) S.badges.push(t('badgeSpecial'));
  }

  // Save progress
  if (won) {
    const p = S.progress;
    ensureLaneProgress(p);
    if (!p.worlds[S.currentWorld]) p.worlds[S.currentWorld] = { scores: {}, stars: {} };
    const ws = p.worlds[S.currentWorld];
    ws.scores[S.currentLevel] = Math.max(ws.scores[S.currentLevel] || 0, S.score);
    ws.stars[S.currentLevel] = Math.max(ws.stars[S.currentLevel] || 0, stars);

    p.coins += S.coinsEarned;
    p.totalCoinsEarned += S.coinsEarned;
    p.totalGemsCollected += S.totalGemsRemoved;
    p.totalSpecialsUsed += S.specialsUsed;
    p.maxCombo = Math.max(p.maxCombo, S.maxCombo);
    wasNewHighScore = S.score > (p.highScore || 0);
    p.highScore = Math.max(p.highScore, S.score);
    p.levelsCompleted++;
    if (elapsed < 30) p.speedLevels++;

    // Update local leaderboard
    updateLocalLeaderboard(S.currentWorld, S.score, stars);
    if (S.boss && S.boss.defeated) {
      if (S.levelDef.isBoss) p.bossesDefeated++;
      else p.miniBossesDefeated++;
    }

    // XP
    const xpGain = XP.PER_STAR * stars + XP.PER_LEVEL + (S.boss?.defeated ? XP.PER_BOSS : 0);
    p.totalXP += xpGain;
    while (true) {
      const xpForLevel = Math.floor(XP.LEVEL_UP_BASE * Math.pow(XP.LEVEL_UP_SCALE, p.playerLevel - 1));
      if (p.totalXP < xpForLevel * p.playerLevel) break;
      p.playerLevel++;
    }

    // Lane completion rewards are granted once per lane at slot 10.
    if (laneInfo.laneSlot === LEVELS_PER_LANE && !p.laneRewards[laneInfo.laneId]) {
      const milestoneLane = laneInfo.laneIndex % 5 === 0;
      const laneCoinBonus = milestoneLane ? 140 : 60;
      const laneHintBonus = milestoneLane ? 2 : 1;
      p.laneRewards[laneInfo.laneId] = {
        laneId: laneInfo.laneId,
        laneIndex: laneInfo.laneIndex,
        claimedAt: Date.now(),
        coins: laneCoinBonus,
        hints: laneHintBonus,
      };
      p.laneRewardTotal = (p.laneRewardTotal || 0) + laneCoinBonus;
      p.boosters.hint = (p.boosters.hint || 0) + laneHintBonus;
      S.coinsEarned += laneCoinBonus;
      S.laneReward = {
        icon: laneInfo.laneIcon,
        laneIndex: laneInfo.laneIndex,
        coins: laneCoinBonus,
        hints: laneHintBonus,
        milestone: milestoneLane,
      };
      S.badges.push(`${laneInfo.laneIcon} L${laneInfo.laneIndex} +${laneCoinBonus}🪙 +${laneHintBonus}💡`);
    }

    // Check achievements
    checkAchievements();

    // Update lastPlayTimestamp
    p.lastPlayTimestamp = Date.now();

    saveProgress(p);

    // Daily challenge completion
    if (S.isDailyChallenge && S.score >= S.dailyChallengeTarget) {
      completeDailyChallenge();
    }

    // DDA update
    if (INTEL) {
      INTEL.updateAfterLevel(p, S.score, S.maxCombo, elapsed, S.movesLeft, {
        won: true,
        worldIdx: S.currentWorld,
        levelIdx: S.currentLevel,
        hintsUsed: S._hintsUsedCount || 0,
      });
    }
  } else {
    // DDA update on LOSS too — critical for difficulty adjustment
    if (INTEL) {
      INTEL.updateAfterLevel(S.progress, S.score, S.maxCombo, elapsed, 0, {
        won: false,
        worldIdx: S.currentWorld,
        levelIdx: S.currentLevel,
        hintsUsed: S._hintsUsedCount || 0,
      });
      saveProgress(S.progress);
    }
  }

  // Milestone detection
  if (ENGAGE && won) {
    const curStats = {
      totalStars: getTotalStars(S.progress),
      levelsCompleted: S.progress.levelsCompleted,
      totalCoins: S.progress.totalCoinsEarned,
    };
    const milestones = ENGAGE.getMilestoneMessage(curStats, prevStats);
    if (milestones && milestones.length > 0) {
      const m = milestones[0];
      setTimeout(() => {
        const popup = qs('#milestone-popup');
        if (popup) {
          popup.querySelector('.milestone-icon').textContent = m.icon;
          popup.querySelector('.milestone-text').textContent = m.text;
          popup.classList.add('show');
          setTimeout(() => popup.classList.remove('show'), 4000);
        }
      }, 1200);
    }
  }

  // Story Quiz (on boss defeat or last level of world)
  if (STORY && (S.boss && S.boss.defeated || S.levelDef.isBoss && stars > 0)) {
    const quiz = STORY.getQuiz(S.currentWorld);
    if (quiz) {
      setTimeout(() => showStoryQuiz(quiz), 5500);
    }
  }

  // Effects
  if (won) {
    spawnLevelCompleteEffects(S.canvasW, S.canvasH);
    if (stars === 3) {
      playSound('threeStar');
    } else {
      playSound('levelComplete');
    }
    // New high score celebration
    if (wasNewHighScore) {
      setTimeout(() => playSound('newRecord'), 600);
    }
    // Daily challenge win celebration
    if (S.isDailyChallenge && S.score >= S.dailyChallengeTarget) {
      setTimeout(() => playSound('dailyChallengeWin'), 400);
    }
    // World completion celebration (last level = 9, i.e. index 9)
    if (S.currentLevel === 9) {
      setTimeout(() => playSound('worldComplete'), 300);
    }
  } else {
    playSound('levelFail');
  }

  trackTelemetry('level_completed', {
    won,
    score: S.score,
    stars: S.stars,
    movesLeft: S.movesLeft,
    elapsedSec: elapsed,
    coinsEarned: S.coinsEarned,
    isBossLevel: !!S.levelDef?.isBoss,
    isMiniBossLevel: !!S.levelDef?.isMiniBoss,
  });

  trackTelemetry('level_qos_summary', {
    perf: getPerf(),
    reducedEffects: _reducedEffects,
    totalFrameDrops: S.qosFrameDrops,
    totalLongFrames: S.qosLongFrames,
  });

  await delay(800);
  showScreen('done');

  // PostMessage to parent
  postGameComplete(won);
}

// ===== DONE SCREEN =====
function renderDoneScreen() {
  const won = S.stars > 0;
  qs('#done-emoji').textContent = won ? '🎉' : '😢';

  // Near-miss message for lost games
  let subtitle = '';
  if (!won && ENGAGE) {
    const objPct = S.objectiveTracker.length > 0
      ? Math.round(S.objectiveTracker.reduce((s, o) => s + Math.min(o.current / o.target, 1), 0) / S.objectiveTracker.length * 100)
      : 0;
    const nearMiss = ENGAGE.getNearMissMessage({
      objectivesPct: objPct,
      score: S.score,
      starThresholds: S.levelDef.starThresholds,
    });
    if (nearMiss) subtitle = nearMiss;
  }

  qs('#done-title').textContent = won
    ? (S.stars === 3 ? t('excellent') : S.stars === 2 ? t('great') : t('good'))
    : (subtitle || t('tryAgain'));

  // Stars
  const starsEl = qs('#done-stars');
  starsEl.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const star = document.createElement('span');
    star.className = `done-star ${i < S.stars ? 'earned' : 'empty'}`;
    star.textContent = i < S.stars ? '⭐' : '☆';
    starsEl.appendChild(star);
  }

  qs('#done-score').textContent = `${t('score')}: ${S.score}`;

  // Stats
  const statsEl = qs('#done-stats');
  statsEl.innerHTML = `
    <div class="done-stat"><div class="done-stat-v">${S.maxCombo}</div><div class="done-stat-l">${t('combo')}</div></div>
    <div class="done-stat"><div class="done-stat-v">${S.totalGemsRemoved}</div><div class="done-stat-l">💎</div></div>
    <div class="done-stat"><div class="done-stat-v">${S.specialsUsed}</div><div class="done-stat-l">🌟</div></div>
  `;

  // Badges
  const badgesEl = qs('#done-badges');
  badgesEl.innerHTML = '';
  for (const b of S.badges) {
    const badge = document.createElement('div');
    badge.className = 'done-badge';
    badge.textContent = b;
    badgesEl.appendChild(badge);
  }

  // Win streak message
  if (ENGAGE && S.winStreak >= 2) {
    const streakMsg = ENGAGE.getStreakMessage(S.winStreak);
    if (streakMsg) {
      const streakEl = document.createElement('div');
      streakEl.className = 'done-badge';
      streakEl.style.background = 'rgba(251,191,36,.2)';
      streakEl.style.borderColor = 'rgba(251,191,36,.5)';
      streakEl.textContent = streakMsg;
      badgesEl.appendChild(streakEl);
    }
  }

  // Coins
  qs('#done-coins').innerHTML = `🪙 +${S.coinsEarned}`;

  if (S.laneReward) {
    const laneBonusEl = document.createElement('div');
    laneBonusEl.className = 'done-badge';
    laneBonusEl.style.background = 'rgba(56,249,215,0.18)';
    laneBonusEl.style.borderColor = 'rgba(56,249,215,0.45)';
    laneBonusEl.textContent = `${S.laneReward.icon} L${S.laneReward.laneIndex} +${S.laneReward.coins}🪙 +${S.laneReward.hints}💡`;
    qs('#done-coins').after(laneBonusEl);
  }

  // Daily challenge success message
  if (S.isDailyChallenge && won && S.score >= S.dailyChallengeTarget) {
    const challenge = getDailyChallenge();
    const dcMsg = document.createElement('div');
    dcMsg.style.cssText = 'margin:8px 0;padding:8px 16px;background:rgba(74,222,128,0.2);border:1px solid rgba(74,222,128,0.5);border-radius:10px;color:#4ade80;font-weight:bold;text-align:center';
    dcMsg.textContent = `${t('dailyChallengeCompleted')} ${t('dailyChallengeReward', { n: challenge.reward })}`;
    qs('#done-coins').after(dcMsg);
  }

  // Session Summary (engagement.js)
  const sessionPanel = qs('#d-session');
  if (sessionPanel && ENGAGE) {
    const elapsed = (Date.now() - S.levelStartTime) / 1000;
    const sessionData = {
      levelsPlayed: 1,
      levelsWon: S.stars > 0 ? 1 : 0,
      totalScore: S.score,
      totalCoins: S.coinsEarned,
      totalStars: S.stars,
      timeMinutes: Math.round(elapsed / 60),
      badgesEarned: S.badges.length,
    };
    const summary = ENGAGE.getSessionSummary(sessionData);
    if (summary) {
      let html = `<div class="session-title">${summary.title}</div><div class="session-grid">`;
      for (const st of summary.stats) {
        html += `<div class="session-item"><div class="si-v">${st.icon} ${st.value}</div><div class="si-l">${st.label}</div></div>`;
      }
      html += `</div>`;
      if (summary.message) html += `<div class="session-msg">${summary.message}</div>`;
      sessionPanel.innerHTML = html;
      sessionPanel.style.display = '';
    } else {
      sessionPanel.style.display = 'none';
    }
  } else if (sessionPanel) {
    sessionPanel.style.display = 'none';
  }

  // Did you know + Fact Library
  const dykTitle = qs('#done-dyk-title');
  const dykText = qs('#done-dyk-text');
  const factsBtn = qs('#facts-lib-btn');
  if (STORY) {
    const fact = STORY.getRandomFact(S.currentWorld);
    if (fact) {
      dykTitle.textContent = t('didYouKnow');
      dykText.textContent = fact;
      qs('#done-dyk').style.display = '';
      // Fact Library button
      const allFacts = STORY.getAllFacts(S.currentWorld);
      if (allFacts && allFacts.length > 1 && factsBtn) {
        factsBtn.style.display = '';
        factsBtn.onclick = () => {
          const list = qs('#facts-list');
          list.innerHTML = allFacts.map((f, i) => `<div class="facts-item"><span class="fi-num">${i + 1}.</span>${f}</div>`).join('');
          qs('#facts-overlay').style.display = '';
        };
      } else if (factsBtn) { factsBtn.style.display = 'none'; }
    } else {
      qs('#done-dyk').style.display = 'none';
    }
  } else {
    qs('#done-dyk').style.display = 'none';
  }
  // Close facts overlay
  const factsClose = qs('#facts-close');
  if (factsClose) factsClose.onclick = () => qs('#facts-overlay').style.display = 'none';
  const factsOverlay = qs('#facts-overlay');
  if (factsOverlay) factsOverlay.onclick = e => { if (e.target === factsOverlay) factsOverlay.style.display = 'none'; };

  // Buttons
  const btnsEl = qs('#done-btns');
  btnsEl.innerHTML = '';

  if (won && S.currentLevel < 9 && !S.isDailyChallenge) {
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-primary';
    nextBtn.textContent = t('next');
    nextBtn.addEventListener('click', () => {
      S.currentLevel++;
      showScreen('game');
      playSound('tap');
    });
    btnsEl.appendChild(nextBtn);
  }

  const replayBtn = document.createElement('button');
  replayBtn.className = 'btn btn-success';
  replayBtn.textContent = t('replay');
  replayBtn.addEventListener('click', () => {
    showScreen('game');
    playSound('tap');
  });
  btnsEl.appendChild(replayBtn);

  // Skip level after 5+ failures (non-boss, non-daily)
  if (!won && !S.isDailyChallenge && S.currentLevel < 9) {
    const levelKey = `${S.currentWorld}-${S.currentLevel}`;
    const attempts = S.progress._dda?.levelAttempts?.[levelKey] || 0;
    if (attempts >= 5) {
      const skipBtn = document.createElement('button');
      skipBtn.className = 'btn';
      skipBtn.style.cssText = 'background:rgba(251,191,36,0.2);border:1px solid rgba(251,191,36,0.5);color:#fbbf24';
      skipBtn.textContent = t('skipLevel');
      skipBtn.addEventListener('click', () => {
        // Grant 1 star so level counts as passed
        const p = S.progress;
        if (!p.worlds[S.currentWorld]) p.worlds[S.currentWorld] = { scores: {}, stars: {} };
        p.worlds[S.currentWorld].stars[S.currentLevel] = Math.max(p.worlds[S.currentWorld].stars[S.currentLevel] || 0, 1);
        p.levelsCompleted++;
        saveProgress(p);
        S.currentLevel++;
        showScreen('game');
        playSound('tap');
      });
      btnsEl.appendChild(skipBtn);
    }
  }

  const menuBtn = document.createElement('button');
  menuBtn.className = 'btn';
  menuBtn.textContent = t('back');
  menuBtn.addEventListener('click', () => {
    if (S.isDailyChallenge) {
      S.isDailyChallenge = false;
      S.dailyChallengeTarget = 0;
      showScreen('world');
    } else {
      showScreen('level');
    }
    playSound('tap');
  });
  btnsEl.appendChild(menuBtn);

  // Share
  const shareBtn = document.createElement('button');
  shareBtn.className = 'btn btn-gold';
  shareBtn.textContent = `${t('share')} 📤`;
  shareBtn.addEventListener('click', () => shareResult());
  btnsEl.appendChild(shareBtn);

  // Dismiss handlers for milestone and quiz
  const milestonePopup = qs('#milestone-popup');
  if (milestonePopup) {
    milestonePopup.onclick = () => milestonePopup.classList.remove('show');
  }
  const quizOverlay = qs('#quiz-overlay');
  if (quizOverlay) {
    quizOverlay.onclick = (e) => { if (e.target === quizOverlay) quizOverlay.classList.remove('show'); };
  }
}

// ===== STORY QUIZ =====
function showStoryQuiz(quiz) {
  const overlay = qs('#quiz-overlay');
  if (!overlay) return;
  const card = overlay.querySelector('.quiz-card');
  if (!card) return;

  card.querySelector('.quiz-question').textContent = quiz.q;
  const answersEl = card.querySelector('.quiz-answers');
  const resultEl = card.querySelector('.quiz-result');
  resultEl.textContent = '';
  answersEl.innerHTML = '';

  quiz.a.forEach((ans, i) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-answer-btn';
    btn.textContent = ans;
    btn.addEventListener('click', () => {
      // Disable all buttons
      answersEl.querySelectorAll('.quiz-answer-btn').forEach(b => b.disabled = true);
      if (i === quiz.correct) {
        btn.classList.add('correct');
        resultEl.textContent = t('quizCorrectMsg', {n: 10});
        S.progress.coins += 10;
        S.progress.totalQuizCorrect = (S.progress.totalQuizCorrect || 0) + 1;
        saveProgress(S.progress);
        playSound('achievement');
      } else {
        btn.classList.add('wrong');
        answersEl.children[quiz.correct]?.classList.add('correct');
        resultEl.textContent = t('quizWrongMsg');
        playSound('error');
      }
      setTimeout(() => overlay.classList.remove('show'), 2500);
    });
    answersEl.appendChild(btn);
  });

  overlay.classList.add('show');
}

// ===== SHOP =====
function renderShopScreen() {
  const p = S.progress;
  qs('#shop-title').textContent = `🛍️ ${t('shop')}`;
  qs('#shop-coins').textContent = `🪙 ${p.coins}`;

  // Boosters
  qs('#shop-boosters-title').textContent = '🎒 ' + t('selectBooster');
  const boosterGrid = qs('#shop-boosters');
  boosterGrid.innerHTML = '';

  const boosters = [
    { key: 'hammer', emoji: '🔨', name: t('boosterHammer'), price: 30 },
    { key: 'shuffle', emoji: '🔀', name: t('boosterShuffle'), price: 20 },
    { key: 'extraMoves', emoji: '➕', name: t('boosterMoves'), price: 40 },
    { key: 'hint', emoji: '💡', name: t('boosterHint'), price: 15 },
    { key: 'bomb', emoji: '💣', name: t('boosterBomb'), price: 50 },
    { key: 'rocket', emoji: '🚀', name: t('boosterRocket'), price: 60 },
    { key: 'freeze', emoji: '🧊', name: t('boosterFreeze'), price: 45 },
    { key: 'multi', emoji: '✖️', name: t('boosterMulti'), price: 55 },
  ];

  for (const b of boosters) {
    const count = p.boosters[b.key] || 0;
    const item = document.createElement('div');
    item.className = 'shop-item';
    item.innerHTML = `
      <div class="shop-item-icon">${b.emoji}</div>
      <div class="shop-item-name">${b.name}</div>
      <div class="shop-item-price">🪙 ${b.price}</div>
      <div class="shop-item-count">x${count}</div>
    `;
    item.addEventListener('click', () => buyBooster(b.key, b.price));
    boosterGrid.appendChild(item);
  }

  // Themes
  qs('#shop-themes-title').textContent = '🎨 ' + t('themes');
  const themeGrid = qs('#shop-themes');
  themeGrid.innerHTML = '';
  const themes = [
    { key: 'classic', name: 'Classic', price: 0, emoji: '💎' },
    { key: 'neon', name: 'Neon', price: 100, emoji: '🌈' },
    { key: 'royal', name: 'Royal', price: 200, emoji: '👑' },
    { key: 'nature', name: 'Nature', price: 150, emoji: '🌿' },
  ];

  for (const th of themes) {
    const owned = th.price === 0 || p.settings.theme === th.key || (p.purchaseCounts?.[th.key] ?? 0) > 0;
    const item = document.createElement('div');
    item.className = `shop-item ${owned ? 'owned' : ''}`;
    item.innerHTML = `
      <div class="shop-item-icon">${th.emoji}</div>
      <div class="shop-item-name">${th.name}</div>
      <div class="shop-item-price">${owned ? t('owned') : `🪙 ${th.price}`}</div>
    `;
    if (!owned) {
      item.addEventListener('click', () => buyTheme(th.key, th.price));
    }
    themeGrid.appendChild(item);
  }
}

function buyBooster(key, price) {
  const p = S.progress;
  if (p.coins < price) {
    playSound('error');
    return;
  }
  p.coins -= price;
  p.boosters[key] = (p.boosters[key] || 0) + 1;
  saveProgress(p);
  renderShopScreen();
  playSound('buy');
}

function buyTheme(key, price) {
  const p = S.progress;
  if (p.coins < price) {
    playSound('error');
    return;
  }
  p.coins -= price;
  p.purchaseCounts[key] = 1;
  p.settings.theme = key;
  p.totalThemesBought++;
  setBoardTheme(key);
  saveProgress(p);
  renderShopScreen();
  playSound('buy');
}

// ===== BOOSTER USE =====
function useBooster(key) {
  if (S.phase !== 'idle') return;
  const count = S.progress.boosters[key] || 0;
  if (count <= 0) return;

  switch (key) {
    case 'hammer':
      S.activeBooster = 'hammer';
      break;
    case 'shuffle':
      S.progress.boosters.shuffle--;
      saveProgress(S.progress);
      shuffleGrid(S.grid, S.rows, S.cols);
      setupGemDrawPositions();
      playSound('shuffle');
      renderBoosters();
      break;
    case 'extraMoves':
      S.progress.boosters.extraMoves--;
      S.movesLeft += 5;
      saveProgress(S.progress);
      updateGameHUD();
      playSound('powerup');
      renderBoosters();
      break;
  }
}

function applyBooster(booster, row, col) {
  if (booster === 'hammer') {
    const gem = S.grid[row]?.[col];
    if (!gem) return;
    S.progress.boosters.hammer--;
    saveProgress(S.progress);

    // Remove gem + particles
    const px = S.offsetX + col * S.cellSize + S.cellSize / 2;
    const py = S.offsetY + row * S.cellSize + S.cellSize / 2;
    spawnBurst(px, py, 8, { color: '#ff6b6b', type: 'star', size: 6, life: 0.5, speed: 4 });
    S.grid[row][col] = null;
    playSound('hammer');

    // Gravity + cascade
    const falls = applyGravity(S.grid, S.rows, S.cols);
    const spawns = spawnNewGems(S.grid, S.rows, S.cols, S.gemCount, S.spawnBias);
    animateFalls(falls, spawns).then(() => cascadeLoop());
    renderBoosters();
  }
}

// ===== ACHIEVEMENTS =====
function renderAchieveScreen() {
  const p = S.progress;
  qs('#ach-title').textContent = `🏆 ${t('achievements')}`;
  const grid = qs('#ach-grid');
  grid.innerHTML = '';

  for (const ach of ACHIEVEMENTS) {
    const unlocked = p.achievementsUnlocked.includes(ach.id);
    const current = getAchievementProgress(p, ach);
    const pct = Math.min((current / ach.goal) * 100, 100);

    const item = document.createElement('div');
    item.className = `ach-item ${unlocked ? 'unlocked' : ''}`;
    item.innerHTML = `
      <div class="ach-icon">${ach.icon}</div>
      <div class="ach-info">
        <div class="ach-name">${ach.names?.[LANG] || ach.nameEn}</div>
        <div class="ach-progress"><div class="ach-progress-fill" style="width:${pct}%"></div></div>
      </div>
      <div class="ach-reward">${unlocked ? '✅' : `🪙${ach.coins}`}</div>
    `;
    grid.appendChild(item);
  }
}

function getAchievementProgress(p, ach) {
  switch (ach.type) {
    case 'levelsCompleted': return p.levelsCompleted;
    case 'gemsCollected': return p.totalGemsCollected;
    case 'maxCombo': return p.maxCombo;
    case 'specialsUsed': return p.totalSpecialsUsed;
    case 'bombsUsed': return p.totalBombsUsed;
    case 'rainbowsUsed': return p.totalRainbowsUsed;
    case 'novasUsed': return p.totalNovasUsed;
    case 'lightningsUsed': return p.totalLightningsUsed;
    case 'totalStars': return getTotalStars(p);
    case 'worldsUnlocked': return getUnlockedWorlds(p);
    case 'bossesDefeated': return p.bossesDefeated;
    case 'miniBossesDefeated': return p.miniBossesDefeated;
    case 'worldsNoHints': return p.worldsNoHints;
    case 'speedLevels': return p.speedLevels;
    case 'perfectWorlds': return p.perfectWorlds;
    case 'dailyStreak': return p.loginStreak?.count || 0;
    case 'powerCombos': return p.totalPowerCombos;
    case 'boardClears': return p.totalBoardClears;
    case 'highScore': return p.highScore;
    case 'obstaclesBroken': return p.totalObstaclesBroken;
    case 'chainsBreak': return p.totalChainsBreak;
    case 'iceBreak': return p.totalIceBreak;
    case 'totalCoins': return p.totalCoinsEarned;
    case 'dailyChallenges': return p.totalDailyChallenges;
    case 'quizCorrect': return p.totalQuizCorrect;
    case 'themesBought': return p.totalThemesBought;
    case 'completionPct': return getCompletionPct(p);
    default: return 0;
  }
}

function checkAchievements() {
  const p = S.progress;
  let newUnlocks = [];

  for (const ach of ACHIEVEMENTS) {
    if (p.achievementsUnlocked.includes(ach.id)) continue;
    const current = getAchievementProgress(p, ach);
    if (current >= ach.goal) {
      p.achievementsUnlocked.push(ach.id);
      p.coins += ach.coins;
      p.totalXP += XP.PER_ACHIEVEMENT;
      newUnlocks.push(ach);
    }
  }

  if (newUnlocks.length > 0) {
    // Show achievement notification after level
    setTimeout(() => {
      for (const ach of newUnlocks) {
        showAchievementNotification(ach);
      }
    }, 1500);
  }
}

function showAchievementNotification(ach) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h2>${t('newAchievement')}</h2>
      <div style="font-size:48px;margin:8px 0">${ach.icon}</div>
      <p style="font-size:18px;font-weight:800">${ach.names?.[LANG] || ach.nameEn}</p>
      <p>🪙 +${ach.coins}</p>
      <button class="btn btn-primary" id="ach-dismiss">${t('excellent')}</button>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#ach-dismiss').addEventListener('click', () => {
    overlay.remove();
    playSound('tap');
  });
  playSound('achievement');
}

// ===== STATS / REPORT =====
function renderStatsScreen() {
  const p = S.progress;
  qs('#stats-title').textContent = `📊 ${t('stats')}`;
  const content = qs('#stats-content');

  const totalStars = getTotalStars(p);

  // Use reports.js for enhanced skill analysis if available
  let skillHTML = '';
  if (REPORTS) {
    try {
      const skills = REPORTS.getSkillAnalysis(p);
      if (skills && skills.length > 0) {
        for (const sk of skills) {
          skillHTML += renderSkillBar(sk.name, sk.rating);
        }
      }
    } catch (e) { /* fallback below */ }
  }
  if (!skillHTML) {
    skillHTML = `
      ${renderSkillBar(t('skillPlanning'), p.skillData.smoothedSkill || 50)}
      ${renderSkillBar(t('skillPattern'), Math.min((p.totalGemsCollected / 500) * 100, 100))}
      ${renderSkillBar(t('skillSpeed'), Math.min((100 - (p.skillData.avgResponseTime || 8)) * 10, 100))}
      ${renderSkillBar(t('skillProblem'), Math.min((p.maxCombo / 10) * 100, 100))}
    `;
  }

  // World breakdown from reports.js
  let worldHTML = '';
  if (REPORTS) {
    try {
      const breakdown = REPORTS.getWorldBreakdown(p);
      if (breakdown && breakdown.length > 0) {
        const names = WORLD_NAMES[LANG] || WORLD_NAMES.en;
        worldHTML = `<div class="stats-card" style="margin-top:8px"><h3>🌍 ${t('worlds')}</h3>`;
        for (const wb of breakdown) {
          const pct = wb.starsPct || 0;
          const lockIcon = wb.isUnlocked ? '' : '🔒 ';
          worldHTML += `<div class="stats-row"><span class="stats-label">${wb.icon} ${lockIcon}${wb.name}</span><span class="stats-value">${wb.status} ⭐${wb.stars}/30</span></div>`;
          // Per-level star details for unlocked worlds with progress
          if (wb.isUnlocked && wb.levelsComplete > 0) {
            let levelDetail = '<div style="padding:0 12px 4px;font-size:0.8em;opacity:0.8">';
            for (let l = 0; l < 10; l++) {
              const s = p?.worlds?.[wb.worldIdx]?.stars?.[l] || 0;
              levelDetail += `<span style="margin-right:6px">${l + 1}:${'⭐'.repeat(s)}${'☆'.repeat(3 - s)}</span>`;
            }
            levelDetail += '</div>';
            worldHTML += levelDetail;
          }
        }
        worldHTML += `</div>`;
      }
    } catch (e) { /* skip */ }
  }

  // Leaderboard — top personal records per world
  let leaderHTML = '';
  const lb = getLocalLeaderboard();
  if (lb.length > 0) {
    const names = WORLD_NAMES[LANG] || WORLD_NAMES.en;
    leaderHTML = `<div class="stats-card" style="margin-top:8px"><h3>🏅 ${t('highScore')}</h3>`;
    for (const entry of lb) {
      leaderHTML += `<div class="stats-row"><span class="stats-label">${WORLD_ICONS[entry.world] || '💎'} ${names[entry.world] || 'W' + (entry.world + 1)}</span><span class="stats-value">${entry.score} ${'⭐'.repeat(entry.stars)}</span></div>`;
    }
    leaderHTML += `</div>`;
  }

  content.innerHTML = `
    <div class="stats-card">
      <h3>📊 ${t('report')}</h3>
      <div class="stats-row"><span class="stats-label">${t('level')}</span><span class="stats-value">Lv.${p.playerLevel}</span></div>
      <div class="stats-row"><span class="stats-label">⭐ ${t('stars')}</span><span class="stats-value">${totalStars}/300</span></div>
      <div class="stats-row"><span class="stats-label">🎯 ${t('level')}</span><span class="stats-value">${p.levelsCompleted}</span></div>
      <div class="stats-row"><span class="stats-label">💎 ${t('totalGems')}</span><span class="stats-value">${p.totalGemsCollected}</span></div>
      <div class="stats-row"><span class="stats-label">🏆 ${t('highScore')}</span><span class="stats-value">${p.highScore}</span></div>
      <div class="stats-row"><span class="stats-label">🔥 ${t('maxCombo')}</span><span class="stats-value">${p.maxCombo}</span></div>
      <div class="stats-row"><span class="stats-label">⚔️ ${t('bosses')}</span><span class="stats-value">${p.bossesDefeated}</span></div>
      <div class="stats-row"><span class="stats-label">🪙 ${t('coins')}</span><span class="stats-value">${p.totalCoinsEarned}</span></div>
    </div>
    <div class="stats-card" style="margin-top:8px">
      <h3>🧠 ${t('skillAnalysis')}</h3>
      ${skillHTML}
    </div>
    ${worldHTML}
    ${leaderHTML}
  `;
}

function renderSkillBar(name, pct) {
  pct = Math.max(0, Math.min(100, pct));
  const cls = pct >= 70 ? 'strong' : pct >= 40 ? 'developing' : 'weak';
  const label = pct >= 70 ? t('strong') : pct >= 40 ? t('developing') : t('needsPractice');
  return `
    <div class="stats-row">
      <span class="stats-label">${name}</span>
      <div class="skill-bar"><div class="skill-fill ${cls}" style="width:${pct}%"></div></div>
      <span class="stats-value">${label}</span>
    </div>
  `;
}

// ===== LOCAL LEADERBOARD =====
const LEADERBOARD_KEY = `${STORAGE_PREFIX}_leaderboard`;

function getLocalLeaderboard() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function updateLocalLeaderboard(worldIdx, score, stars) {
  const lb = getLocalLeaderboard();
  const existing = lb.find(e => e.world === worldIdx);
  if (existing) {
    if (score > existing.score) {
      existing.score = score;
      existing.stars = stars;
      existing.date = new Date().toISOString().slice(0, 10);
    }
  } else {
    lb.push({ world: worldIdx, score, stars, date: new Date().toISOString().slice(0, 10) });
  }
  // Sort by score descending
  lb.sort((a, b) => b.score - a.score);
  try { localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(lb)); } catch { /* ignore */ }
}

// ===== DAILY REWARD =====
function checkDailyReward() {
  const p = S.progress;
  const today = new Date().toDateString();
  if (p.loginStreak?.lastDate === today) return; // Already claimed

  // Show daily popup after a short delay
  setTimeout(() => showDailyReward(), 1000);
}

function showDailyReward() {
  const p = S.progress;
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  let streak = p.loginStreak?.count || 0;
  if (p.loginStreak?.lastDate === yesterday) streak++;
  else if (p.loginStreak?.lastDate !== today) streak = 1;

  // Use economy.js rewards if available, otherwise fallback
  const economyRewards = ECONOMY ? [20, 30, 40, 50, 75, 100, 200] : [5, 10, 15, 20, 30, 40, 60];
  const isJackpotDay = (streak - 1) % 7 === 6;
  const rewards = economyRewards;
  const dayIdx = Math.min(streak - 1, 6);
  const alreadyClaimed = p.loginStreak?.lastDate === today;

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h2>${t('dailyReward')}</h2>
      <p>${t('streak')}: ${streak} ${t('day')}</p>
      <div class="daily-grid">
        ${rewards.map((r, i) => `
          <div class="daily-day ${i === dayIdx && !alreadyClaimed ? 'today' : ''} ${i < dayIdx ? 'claimed' : ''}">
            <div>${t('day')} ${i + 1}</div>
            <div class="daily-reward-val">🪙${r}</div>
          </div>
        `).join('')}
      </div>
      ${alreadyClaimed
        ? `<p>${t('claimed')}</p>`
        : `<button class="btn btn-gold" id="daily-claim">${t('claim')} 🪙${rewards[dayIdx]}</button>`
      }
      <button class="btn btn-sm" id="daily-close" style="margin-top:8px">${t('cancel') || t('back')}</button>
    </div>
  `;
  document.body.appendChild(overlay);

  let closed = false;
  let decisionTaken = false;

  const closeDailyOverlay = () => {
    if (closed) return;
    closed = true;
    overlay.remove();
  };

  const armCloseOnNextTouch = () => {
    if (decisionTaken) return;
    decisionTaken = true;

    const modalEl = overlay.querySelector('.modal');
    if (modalEl) {
      const hintEl = document.createElement('p');
      hintEl.style.marginTop = '8px';
      hintEl.style.fontWeight = '700';
      hintEl.style.color = 'rgba(255,255,255,0.9)';
      hintEl.textContent = t('tapToContinue');
      modalEl.appendChild(hintEl);
    }

    const closeOnTouch = () => {
      closeDailyOverlay();
      document.removeEventListener('pointerdown', closeOnTouch, true);
      document.removeEventListener('touchstart', closeOnTouch, true);
    };

    // Wait for the next gesture (not the same click that made the decision).
    setTimeout(() => {
      if (closed) return;
      document.addEventListener('pointerdown', closeOnTouch, true);
      document.addEventListener('touchstart', closeOnTouch, true);
    }, 0);
  };

  // Add daily challenge section
  showDailyChallengeInReward(overlay);

  if (!alreadyClaimed) {
    overlay.querySelector('#daily-claim')?.addEventListener('click', () => {
      p.loginStreak = { lastDate: today, count: streak };
      p.coins += rewards[dayIdx];
      p.totalCoinsEarned += rewards[dayIdx];
      saveProgress(p);
      playSound('coins');
      armCloseOnNextTouch();
      if (S.screen === 'world') renderWorldScreen();
    });
  }

  overlay.querySelector('#daily-close').addEventListener('click', () => {
    closeDailyOverlay();
  });

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeDailyOverlay();
    }
  });
}

// ===== DAILY CHALLENGE =====
function getDailyChallenge() {
  // Deterministic challenge based on today's date
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const worldIdx = seed % 10;
  const targetScore = 1500 + (seed % 5) * 500; // 1500-3500
  const moves = 20 + (seed % 3) * 5; // 20-30
  const gemCount = 5 + (seed % 2); // 5-6
  const reward = 50 + (seed % 4) * 25; // 50-125
  return { worldIdx, targetScore, moves, gemCount, reward, seed };
}

function isDailyChallengeCompleted() {
  const p = S.progress;
  const today = new Date().toDateString();
  return p.lastDailyChallengeDate === today;
}

function showDailyChallengeInReward(overlay) {
  const challenge = getDailyChallenge();
  const completed = isDailyChallengeCompleted();
  const worldName = (WORLD_NAMES?.[LANG] || WORLD_NAMES.en)[challenge.worldIdx] || '';
  const worldIcon = WORLD_ICONS?.[challenge.worldIdx] || '💎';

  const section = document.createElement('div');
  section.style.cssText = 'margin-top:12px;padding:10px;background:rgba(255,255,255,0.1);border-radius:12px;text-align:center';
  section.innerHTML = `
    <h3>${worldIcon} ${t('dailyChallenge')}</h3>
    <p style="font-size:0.85em;opacity:0.8">${worldName} — ${t('targetScore', { n: challenge.targetScore })}</p>
    <p style="font-size:0.8em;opacity:0.7">${challenge.moves} ${t('moves')} | ${t('dailyChallengeReward', { n: challenge.reward })}</p>
    ${completed
      ? `<p style="color:#4ade80;font-weight:bold">${t('dailyChallengeCompleted')}</p>`
      : `<button class="btn btn-gold" id="daily-challenge-play" style="margin-top:6px">${t('dailyChallengePlay')} 🎮</button>`
    }
  `;
  overlay.querySelector('.modal').appendChild(section);

  if (!completed) {
    section.querySelector('#daily-challenge-play').addEventListener('click', () => {
      overlay.remove();
      startDailyChallenge(challenge);
    });
  }

  // Daily challenge history (last 7 entries)
  const history = S.progress.dailyChallengeHistory || [];
  if (history.length > 0) {
    const histSection = document.createElement('div');
    histSection.style.cssText = 'margin-top:8px;text-align:center';
    const recent = history.slice(-7).reverse();
    let histHTML = `<h4 style="font-size:0.85em;margin:4px 0">${t('dailyChallenge')} — ${t('stats')}</h4>`;
    histHTML += '<div style="display:flex;flex-direction:column;gap:3px;font-size:0.75em">';
    for (const entry of recent) {
      const wIcon = WORLD_ICONS?.[entry.world] || '💎';
      const pct = Math.min(Math.round((entry.score / entry.target) * 100), 999);
      const starStr = '⭐'.repeat(entry.stars || 0);
      histHTML += `<div style="display:flex;justify-content:space-between;align-items:center;padding:2px 6px;background:rgba(255,255,255,0.05);border-radius:6px">
        <span>${entry.date}</span>
        <span>${wIcon} ${pct}% ${starStr}</span>
      </div>`;
    }
    histHTML += '</div>';
    histSection.innerHTML = histHTML;
    section.appendChild(histSection);
  }
}

async function startDailyChallenge(challenge) {
  S.isDailyChallenge = true;
  S.dailyChallengeTarget = challenge.targetScore;
  S.currentWorld = challenge.worldIdx;
  S.currentLevel = 0;

  // Override level def for the challenge
  S.levelDef = {
    rows: 8, cols: 8,
    gemCount: challenge.gemCount,
    moves: challenge.moves,
    starThresholds: [challenge.targetScore * 0.5, challenge.targetScore, challenge.targetScore * 1.5],
    objectives: [{ type: 'score', target: challenge.targetScore }],
    obstacles: [],
  };

  S.rows = 8;
  S.cols = 8;
  S.gemCount = challenge.gemCount;
  S.movesLeft = challenge.moves;
  S.score = 0;
  S.combo = 0;
  S.maxCombo = 0;
  S.totalGemsRemoved = 0;
  S.specialsUsed = 0;
  S.selected = null;
  S.phase = 'idle';
  S.hintTimer = 0;
  S.hintMove = null;
  S.hintUsed = false;
  S.stars = 0;
  S.coinsEarned = 0;
  S.badges = [];
  S.activeBooster = null;
  S.animQueue = [];
  S.processing = false;
  S.playerHP = 5;
  S.levelStartTime = Date.now();
  S.levelCompletionMarked = false;
  S.qosFrameDrops = 0;
  S.qosLongFrames = 0;
  S.qosWindowStartedAt = Date.now();
  S.lastQosEmitAt = performance.now();
  S.undoState = null;
  S.undoStack = [];
  S.boss = null;
  S.colorBlindMode = S.progress.settings?.colorBlind || false;
  setColorBlindMode(S.colorBlindMode);

  clearTweens();
  clearParticles();

  S.grid = initGrid(8, 8, challenge.gemCount, []);
  S.objectiveTracker = createObjectiveTracker([{ type: 'score', target: challenge.targetScore }]);

  const layout = calcLayout(8, 8);
  S.cellSize = layout.cellSize;
  S.offsetX = layout.offsetX;
  S.offsetY = layout.offsetY;

  initBackground(document.getElementById('bg-canvas'), challenge.worldIdx);
  showScreen('game');

  // Show challenge start message
  const banner = document.createElement('div');
  banner.style.cssText = 'position:fixed;top:20%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.85);color:#fff;padding:16px 28px;border-radius:16px;font-size:1.2em;z-index:10000;text-align:center;animation:fadeIn 0.3s';
  banner.textContent = `🏆 ${t('dailyChallenge')} — ${t('targetScore', { n: challenge.targetScore })}`;
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 2000);
}

function completeDailyChallenge() {
  const challenge = getDailyChallenge();
  const p = S.progress;
  p.totalDailyChallenges = (p.totalDailyChallenges || 0) + 1;
  p.lastDailyChallengeDate = new Date().toDateString();
  p.coins += challenge.reward;
  p.totalCoinsEarned += challenge.reward;

  // Save to daily challenge history
  if (!p.dailyChallengeHistory) p.dailyChallengeHistory = [];
  p.dailyChallengeHistory.push({
    date: new Date().toISOString().slice(0, 10),
    seed: challenge.seed,
    world: challenge.worldIdx,
    score: S.score,
    target: challenge.targetScore,
    stars: S.stars || 0,
    reward: challenge.reward,
    maxCombo: S.maxCombo,
  });
  // Keep last 30 entries
  if (p.dailyChallengeHistory.length > 30) {
    p.dailyChallengeHistory = p.dailyChallengeHistory.slice(-30);
  }

  saveProgress(p);
  S.isDailyChallenge = false;
  S.dailyChallengeTarget = 0;
}

// ===== UNDO SYSTEM (multi-level, up to 3) =====
const MAX_UNDO = 3;

function saveUndoState() {
  // Deep copy the grid and relevant state for undo
  const gridCopy = [];
  for (let r = 0; r < S.rows; r++) {
    gridCopy[r] = [];
    for (let c = 0; c < S.cols; c++) {
      if (S.grid[r][c]) {
        gridCopy[r][c] = { ...S.grid[r][c] };
      } else {
        gridCopy[r][c] = null;
      }
    }
  }
  if (!S.undoStack) S.undoStack = [];
  S.undoStack.push({
    grid: gridCopy,
    score: S.score,
    movesLeft: S.movesLeft,
    combo: S.combo,
    maxCombo: S.maxCombo,
    totalGemsRemoved: S.totalGemsRemoved,
    specialsUsed: S.specialsUsed,
    objectiveTracker: JSON.parse(JSON.stringify(S.objectiveTracker)),
    boss: S.boss ? { ...S.boss } : null,
    playerHP: S.playerHP,
  });
  // Limit stack size
  while (S.undoStack.length > MAX_UNDO) S.undoStack.shift();
  S.undoState = S.undoStack[S.undoStack.length - 1]; // compat
  const undoBtn = qs('#g-undo');
  if (undoBtn) {
    undoBtn.classList.remove('disabled');
    undoBtn.title = `${S.undoStack.length}/${MAX_UNDO}`;
  }
}

function undoLastMove() {
  if (!S.undoStack || S.undoStack.length === 0) return;
  const u = S.undoStack.pop();
  // Capture old positions for undo animation
  const oldPositions = {};
  for (let r = 0; r < S.rows; r++) {
    for (let c = 0; c < S.cols; c++) {
      const gem = S.grid[r]?.[c];
      if (gem) oldPositions[gem.id] = { x: gem._drawX, y: gem._drawY };
    }
  }
  S.grid = u.grid;
  S.score = u.score;
  S.movesLeft = u.movesLeft;
  S.combo = u.combo;
  S.maxCombo = u.maxCombo;
  S.totalGemsRemoved = u.totalGemsRemoved;
  S.specialsUsed = u.specialsUsed;
  S.objectiveTracker = u.objectiveTracker;
  if (u.boss) S.boss = u.boss;
  S.playerHP = u.playerHP;
  S.undoState = S.undoStack.length > 0 ? S.undoStack[S.undoStack.length - 1] : null;
  S.phase = 'idle';
  setupGemDrawPositions();
  // Animate gems sliding to restored positions
  for (let r = 0; r < S.rows; r++) {
    for (let c = 0; c < S.cols; c++) {
      const gem = S.grid[r]?.[c];
      if (gem) {
        const old = oldPositions[gem.id];
        const targetX = gem._drawX;
        const targetY = gem._drawY;
        if (old) {
          gem._drawX = old.x;
          gem._drawY = old.y;
        }
        addTween(gem, '_drawX', gem._drawX, targetX, 200, 'easeOut');
        addTween(gem, '_drawY', gem._drawY, targetY, 200, 'easeOut');
      }
    }
  }
  updateGameHUD();
  const undoBtn = qs('#g-undo');
  if (undoBtn) {
    if (S.undoStack.length === 0) undoBtn.classList.add('disabled');
    undoBtn.title = `${S.undoStack.length}/${MAX_UNDO}`;
  }
  // Haptic feedback
  triggerHaptic('light');
}

// ===== HAPTIC FEEDBACK =====
function triggerHaptic(type) {
  if (!navigator.vibrate) return;
  switch (type) {
    case 'light': navigator.vibrate(10); break;
    case 'medium': navigator.vibrate(25); break;
    case 'heavy': navigator.vibrate([30, 10, 30]); break;
    case 'success': navigator.vibrate([15, 50, 15]); break;
    case 'error': navigator.vibrate([50, 20, 50]); break;
  }
}

// ===== SETTINGS SCREEN =====
function renderSettingsScreen() {
  const p = S.progress;
  qs('#settings-title').textContent = `⚙️ ${t('settings')}`;
  const content = qs('#settings-content');

  const isColorBlind = p.settings.colorBlind || false;
  S.colorBlindMode = isColorBlind;
  setColorBlindMode(isColorBlind);

  content.innerHTML = `
    <div class="settings-card">
      <h3>🔊 ${t('volume')}</h3>
      <div class="settings-row">
        <span class="settings-label">${S.muted ? t('mute') : t('unmute')}</span>
        <button class="settings-toggle ${S.muted ? '' : 'on'}" id="set-sound">&nbsp;</button>
      </div>
    </div>
    <div class="settings-card" style="margin-top:8px">
      <h3>♿ ${t('colorBlind')}</h3>
      <div class="settings-row">
        <span class="settings-label">${t('colorBlind')}</span>
        <button class="settings-toggle ${isColorBlind ? 'on' : ''}" id="set-colorblind">&nbsp;</button>
      </div>
    </div>
    <div class="settings-card" style="margin-top:8px">
      <h3>🌐 ${t('language')}</h3>
      <div class="settings-row">
        <span class="settings-label">${t('language')}</span>
        <select id="set-language" class="settings-label" style="background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);border-radius:8px;padding:6px;color:#fff;min-width:170px">
          ${SUPPORTED_LANGS.map((lang) => `<option value="${lang}" ${lang === LANG ? 'selected' : ''} style="color:#111">${LANGUAGE_LABELS[lang] || lang}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="settings-card settings-danger" style="margin-top:12px">
      <button class="btn btn-danger btn-sm" id="set-reset">🗑️ ${t('resetData')}</button>
    </div>
  `;

  // Sound toggle
  content.querySelector('#set-sound')?.addEventListener('click', () => {
    toggleMute();
    renderSettingsScreen();
  });

  // Color-blind toggle
  content.querySelector('#set-colorblind')?.addEventListener('click', () => {
    p.settings.colorBlind = !p.settings.colorBlind;
    S.colorBlindMode = p.settings.colorBlind;
    setColorBlindMode(S.colorBlindMode);
    saveProgress(p);
    renderSettingsScreen();
  });

  // Language selector: persist via URL query param used by config LANG.
  content.querySelector('#set-language')?.addEventListener('change', (ev) => {
    const nextLang = ev.target.value;
    const url = new URL(window.location.href);
    url.searchParams.set('lang', nextLang);
    window.location.href = url.toString();
  });

  // Reset data
  content.querySelector('#set-reset')?.addEventListener('click', () => {
    if (confirm(t('resetConfirm'))) {
      const fresh = createDefaultProgress();
      S.progress = fresh;
      saveProgress(fresh);
      showScreen('world');
    }
  });
}

// ===== FACTS ALBUM =====
function renderAlbumScreen() {
  qs('#album-title').textContent = `📚 ${t('factsAlbum')}`;
  const grid = qs('#album-grid');
  grid.innerHTML = '';

  if (!STORY) {
    grid.innerHTML = `<div class="album-empty">${t('noFacts')}</div>`;
    return;
  }

  const names = WORLD_NAMES[LANG] || WORLD_NAMES.en;

  let hasAnyFacts = false;
  for (let w = 0; w < 10; w++) {
    let facts = [];
    try {
      facts = STORY.getFacts ? STORY.getFacts(w) : [];
    } catch (e) { facts = []; }

    // Only show worlds where the player has discovered facts (has any stars)
    const wStars = getWorldStars(w);
    if (wStars === 0 && facts.length === 0) continue;

    const discoveredFacts = facts.slice(0, Math.ceil(wStars / 3)); // Reveal facts based on stars earned
    if (discoveredFacts.length === 0) continue;
    hasAnyFacts = true;

    const worldDiv = document.createElement('div');
    worldDiv.className = 'album-world';
    worldDiv.innerHTML = `
      <div class="album-world-header">${WORLD_ICONS[w]} ${names[w]} <span class="toggle">▶</span></div>
      <div class="album-facts" id="album-facts-${w}">
        ${discoveredFacts.map((f, i) => `<div class="album-fact">${i + 1}. ${f}</div>`).join('')}
      </div>
    `;

    const header = worldDiv.querySelector('.album-world-header');
    header.addEventListener('click', () => {
      header.classList.toggle('open');
      const factsDiv = worldDiv.querySelector('.album-facts');
      factsDiv.classList.toggle('open');
    });

    grid.appendChild(worldDiv);
  }

  if (!hasAnyFacts) {
    grid.innerHTML = `<div class="album-empty">${t('noFacts')}</div>`;
  }
}

// ===== INTERACTIVE TUTORIAL =====
const TUTORIAL_STEPS = [
  { target: '#game-canvas', text: 'tutStep1', pos: 'bottom' },
  { target: '#g-score',     text: 'tutStep2', pos: 'bottom' },
  { target: '#g-moves',     text: 'tutStep3', pos: 'bottom' },
  { target: '#g-obj',       text: 'tutStep4', pos: 'top' },
  { target: '#g-boosters',  text: 'tutStep5', pos: 'top' },
];

function showTutorial() {
  // Only for first-time players
  if (S.progress.tutorialComplete) return;

  trackTelemetry('tutorial_started', { world: S.currentWorld + 1, level: S.currentLevel + 1 });

  let step = 0;
  const overlay = qs('#tutorial-overlay');
  if (!overlay) return;
  overlay.style.display = '';

  function renderStep() {
    if (step >= TUTORIAL_STEPS.length) {
      // Tutorial complete
      overlay.style.display = 'none';
      overlay.innerHTML = '';
      S.progress.tutorialComplete = true;
      saveProgress(S.progress);
      trackTelemetry('tutorial_completed', {});
      return;
    }

    const s = TUTORIAL_STEPS[step];
    const target = qs(s.target);
    if (!target) { step++; renderStep(); return; }

    const rect = target.getBoundingClientRect();
    const tutTexts = {
      tutStep1: t('tutStep1'),
      tutStep2: t('tutStep2'),
      tutStep3: t('tutStep3'),
      tutStep4: t('tutStep4'),
      tutStep5: t('tutStep5'),
    };

    overlay.innerHTML = `
      <div class="tutorial-mask"></div>
      <div class="tutorial-highlight" style="left:${rect.left - 4}px;top:${rect.top - 4}px;width:${rect.width + 8}px;height:${rect.height + 8}px"></div>
      <div class="tutorial-tooltip" style="left:${Math.max(10, Math.min(rect.left, window.innerWidth - 290))}px;${s.pos === 'bottom' ? `top:${rect.bottom + 16}px` : `bottom:${window.innerHeight - rect.top + 16}px`}">
        <div class="tutorial-tooltip-step">${step + 1}/${TUTORIAL_STEPS.length}</div>
        <div class="tutorial-tooltip-text">${tutTexts[s.text] || ''}</div>
        <button class="btn btn-sm btn-primary" id="tut-next">${step === TUTORIAL_STEPS.length - 1 ? t('play') : t('next')}</button>
      </div>
    `;

    overlay.querySelector('#tut-next')?.addEventListener('click', () => {
      trackTelemetry('tutorial_step_advanced', { step: step + 1, action: 'next' });
      step++;
      renderStep();
    });

    overlay.querySelector('.tutorial-mask')?.addEventListener('click', () => {
      trackTelemetry('tutorial_step_advanced', { step: step + 1, action: 'mask_click' });
      step++;
      renderStep();
    });
  }

  renderStep();
}

// ===== STORY DIALOG =====
function showStoryDialog(dialog, onClose = null) {
  if (!dialog || !dialog.lines || dialog.lines.length === 0) return;

  trackTelemetry('story_dialog_shown', { lines: dialog.lines.length });

  let lineIdx = 0;
  const overlay = document.createElement('div');
  overlay.className = 'story-overlay';
  let closed = false;
  let closeReason = 'completed';

  function closeDialog() {
    if (closed) return;
    closed = true;
    overlay.remove();
    trackTelemetry('story_dialog_closed', { reason: closeReason });
    if (typeof onClose === 'function') onClose();
  }

  function renderLine() {
    const line = dialog.lines[lineIdx];
    overlay.innerHTML = `
      <div class="story-box">
        <div class="story-mascot">${dialog.mascot || WORLD_MASCOTS[S.currentWorld]}</div>
        <div class="story-name">${dialog.name || ''}</div>
        <div class="story-text">${line}</div>
        <div class="story-btns">
          <button class="btn btn-sm" id="story-skip">${t('storySkip')}</button>
          <button class="btn btn-primary btn-sm" id="story-next">${lineIdx < dialog.lines.length - 1 ? t('storyNext') : t('play')}</button>
        </div>
      </div>
    `;

    overlay.querySelector('#story-skip').addEventListener('click', () => {
      closeReason = 'skip';
      closeDialog();
    });

    overlay.querySelector('#story-next').addEventListener('click', () => {
      lineIdx++;
      if (lineIdx >= dialog.lines.length) {
        closeDialog();
      } else {
        renderLine();
      }
      playSound('tap');
    });
  }

  renderLine();
  document.body.appendChild(overlay);
}

// ===== SHARE =====
function shareResult() {
  const worldName = (WORLD_NAMES[LANG] || WORLD_NAMES.en)[S.currentWorld] || '';
  const text = t('shareResult', {
    score: S.score,
    world: worldName,
    level: S.currentLevel + 1,
    stars: '⭐'.repeat(Math.max(0, S.stars)),
  });

  // Use native Web Share API if available
  if (navigator.share) {
    navigator.share({
      title: t('shareTitle'),
      text,
    }).catch(() => { /* user cancelled or error — ignore */ });
  }

  // Always postMessage to parent for in-app sharing
  window.parent.postMessage({
    type: 'SHARE_ACHIEVEMENT',
    game: 'gem',
    world: S.currentWorld + 1,
    level: S.currentLevel + 1,
    score: S.score,
    stars: S.stars,
  }, PARENT_POSTMESSAGE_ORIGIN);
}

// ===== POST MESSAGE =====
function postGameComplete(won) {
  const scaledScore = Math.round(S.score > 0 ? Math.min(S.score, 100) : 0);
  const msg = {
    type: 'GAME_COMPLETE',
    score: scaledScore,
    total: 100,
    stars: S.stars,
    won,
    timeElapsed: Math.floor((Date.now() - S.levelStartTime) / 1000),
    level: S.currentLevel + 1,
    world: S.currentWorld + 1,
    maxCombo: S.maxCombo,
  };

  // Attach compact report for parent dashboard
  if (REPORTS) {
    try {
      msg.report = REPORTS.createCompactReport(S.progress);
    } catch (e) { /* skip */ }
  }

  window.parent.postMessage(msg, PARENT_POSTMESSAGE_ORIGIN);
}

// ===== MUTE =====
function toggleMute() {
  S.muted = !S.muted;
  localStorage.setItem(KEYS.MUTED, S.muted.toString());
  qs('#mute-btn').textContent = S.muted ? '🔇' : '🔊';
  if (AUDIO) {
    if (S.muted) AUDIO.muteAll();
    else AUDIO.unmuteAll();
  }
}

// ===== HELPERS =====
function qs(sel) { return document.querySelector(sel); }

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function getWorldStars(w) {
  const ws = S.progress.worlds[w];
  if (!ws?.stars) return 0;
  return Object.values(ws.stars).reduce((a, b) => a + b, 0);
}

function getTotalStars(p) {
  let total = 0;
  for (const w of Object.values(p.worlds)) {
    if (w.stars) total += Object.values(w.stars).reduce((a, b) => a + b, 0);
  }
  return total;
}

function getUnlockedWorlds(p) {
  let count = 1; // world 0 always unlocked
  for (let w = 1; w < 10; w++) {
    if (getWorldStars(w - 1) >= 15) count++;
    else break;
  }
  return count;
}

function getCompletionPct(p) {
  const totalLevels = 100;
  return Math.floor((p.levelsCompleted / totalLevels) * 100);
}
