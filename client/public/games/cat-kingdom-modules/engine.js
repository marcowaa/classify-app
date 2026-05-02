/* ═══════════════════════════════════════════════════════════════
   Cat Kingdom — Core Engine
   State machine, game loop, progress, postMessage
   ═══════════════════════════════════════════════════════════════ */

import { LANG, t, L, applyDir } from './i18n.js';
import { WORLDS, getLevelConfig, calcStars, getWorld } from './worlds.js';
import { getQuestions } from './questions.js';
import { initAudio, sfxCorrect, sfxWrong, sfxMeow, sfxLevelUp, sfxWorldComplete, sfxBossAppear, sfxBossHit, sfxStar, sfxClick, sfxCountdown, sfxEat, sfxPurr, sfxPurchase, toggleMute, isMuted, setVolume, getVolume, startAmbient, stopAmbient, sfxCorrectWorld } from './audio.js';
import { initRenderer, startParticles, stopParticles, burst, shake, pulseGlow, floatIn, animateStars, animateXP, updateTimerRing, bossEntrance, worldTransition, applyWorldTheme } from './renderer.js';
import { loadCat, saveCat, getCatEmoji, addXP, feedCat, playCat, applyTimeDecay, getCatLevel, SKINS, buySkin, equipSkin, STATES as CAT_STATES } from './cat.js';
import { getStreakMessage, getNearMissMessage, checkNearMiss, checkMicroBadges, createTracker, trackAnswer, getSessionSummary, getMilestoneMessage, getComebackMessage, recordBadges, getAllBadgesDefs } from './engagement.js';
import { shouldShowTutorial, markTutorialComplete, getTutorialSteps, renderTutorialStep } from './tutorial.js';
import { loadChallenge, saveChallenge, canPlayChallenge, getChallengeQuestions, completeChallenge, getChallengeInfo } from './challenge.js';
import { renderProfileHTML } from './profile.js';
import { loadDDA, saveDDA, updateDDA, getDDAModifier, getSkillLabel, getTrendLabel, getWeakestSubject, getStrongestSubject, getPerformanceTrend } from './intelligence.js';
import { getWorldIntro, markIntroSeen, getFunFact, getEncouragement, hasSeenIntro, getWorldIntroForced } from './story.js';
import { generateReport, renderReportHTML } from './reports.js';
import { loadEconomy, saveEconomy, buyPowerup, usePowerup, isPowerupActive, clearActivePowerups, applyHint, getShopItems, POWERUPS, getPowerupCount } from './economy.js';
import { loadDaily, saveDaily, canClaimDaily, claimDaily, getStreakInfo, getCalendarData } from './daily.js';
import { addWrongAnswer, loadWrongHistory } from './utils.js';

const PROGRESS_KEY = 'catk_progress';
const LEVELS_PER_WORLD = 10;
const LEVELS_PER_LANE = 10;
const LANE_ROTATION = [
  { id: 'focus', icon: '🎯' },
  { id: 'speed', icon: '⚡' },
  { id: 'logic', icon: '🧠' },
  { id: 'marathon', icon: '🏔️' },
];

function getLinearLevelIndex(worldId, levelNum) {
  return ((worldId - 1) * LEVELS_PER_WORLD) + levelNum;
}

function getLaneInfo(worldId, levelNum) {
  const linearIdx = getLinearLevelIndex(worldId, levelNum);
  const laneIndex = Math.floor((linearIdx - 1) / LEVELS_PER_LANE) + 1;
  const laneSlot = ((linearIdx - 1) % LEVELS_PER_LANE) + 1;
  const theme = LANE_ROTATION[(laneIndex - 1) % LANE_ROTATION.length];
  return {
    laneIndex,
    laneSlot,
    laneId: `${theme.id}-${laneIndex}`,
    laneIcon: theme.icon,
  };
}

function ensureProgressShape() {
  if (!progress || typeof progress !== 'object') {
    progress = defaultProgress();
  }
  if (!progress.worlds || typeof progress.worlds !== 'object') {
    progress.worlds = {};
  }
  if (!progress.laneRewards || typeof progress.laneRewards !== 'object') {
    progress.laneRewards = {};
  }
  if (!Number.isFinite(progress.laneRewardTotal)) {
    progress.laneRewardTotal = 0;
  }
}

/* ── State ── */
let state = {
  screen: 'menu',
  currentWorld: 1,
  currentLevel: 1,
  questions: [],
  qIndex: 0,
  score: 0,
  streak: 0,
  maxStreak: 0,
  lives: 3,
  timer: 0,
  timerInterval: null,
  totalTime: 0,
  timeUsed: 0,
  xp: 0,
  totalXP: 0,
  cat: null,
  tracker: null,
  startTime: 0,
  dda: null,
  economy: null,
  daily: null,
  challenge: null,
  freezeActive: false,
  freezeTimeout: null,
  hintUsedThisQ: false,
  doubleScoreActive: false,
  shieldActive: false,
  _bossHP: null,
  _wrongAnswers: [],
  _isChallengeMode: false,
  _isPaused: false,
  _isPracticeMode: false,
};

let _answerLocked = false;

let progress = null;

/* ── B5: Initialize game state ── */
function initGameState(questions, timePerQ, isChallenge) {
  state.questions = questions;
  state.qIndex = 0;
  state.score = 0;
  state.streak = 0;
  state.maxStreak = 0;
  state.lives = 3;
  state.totalTime = questions.length * timePerQ;
  state.timeUsed = 0;
  state.timer = timePerQ;
  state.tracker = createTracker();
  state.startTime = Date.now();
  state.hintUsedThisQ = false;
  state.freezeActive = false;
  state._adjustedTimePerQ = timePerQ;
  state._isChallengeMode = isChallenge;
  state._bossHP = null;
  state._wrongAnswers = [];
  state._isPaused = false;
  state._isPracticeMode = false;
}

/* ═══════════════════════════════════════════
   Progress Management
   ═══════════════════════════════════════════ */
function defaultProgress() {
  return {
    worlds: {},        // { "1": { levels: { "1": { stars: 2, best: 85 }, ... }, completed: false } }
    totalStars: 0,
    totalXP: 0,
    levelsCleared: 0,
    coins: 0,
    lastPlayed: Date.now(),
    dailyStreak: 0,
    lastDaily: null,
    laneRewards: {},
    laneRewardTotal: 0,
  };
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) {
      const loaded = { ...defaultProgress(), ...JSON.parse(raw) };
      if (!loaded.laneRewards || typeof loaded.laneRewards !== 'object') loaded.laneRewards = {};
      if (!Number.isFinite(loaded.laneRewardTotal)) loaded.laneRewardTotal = 0;
      return loaded;
    }
  } catch(e) {}
  return defaultProgress();
}

function saveProgress() {
  ensureProgressShape();
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch(e) {}
}

function isWorldUnlocked(worldId) {
  if (worldId === 1) return true;
  const prev = progress.worlds[worldId - 1];
  if (!prev) return false;
  // Need at least 7 levels completed in previous world
  const cleared = Object.values(prev.levels || {}).filter(l => l.stars > 0).length;
  return cleared >= 7;
}

function isLevelUnlocked(worldId, levelNum) {
  if (levelNum === 1) return isWorldUnlocked(worldId);
  const wData = progress.worlds[worldId];
  if (!wData) return false;
  const prevLevel = wData.levels?.[levelNum - 1];
  return prevLevel && prevLevel.stars > 0;
}

function getLevelData(worldId, levelNum) {
  return progress.worlds[worldId]?.levels?.[levelNum] || null;
}

function setLevelResult(worldId, levelNum, stars, score) {
  if (!progress.worlds[worldId]) {
    progress.worlds[worldId] = { levels: {}, completed: false };
  }
  const existing = progress.worlds[worldId].levels[levelNum];
  const isNew = !existing || existing.stars === 0;
  const improved = existing && stars > existing.stars;

  if (!existing || stars > existing.stars) {
    progress.worlds[worldId].levels[levelNum] = { stars, best: score };
  } else if (existing && score > existing.best) {
    progress.worlds[worldId].levels[levelNum].best = score;
  }

  if (isNew && stars > 0) {
    progress.levelsCleared++;
    progress.totalStars += stars;
  } else if (improved) {
    progress.totalStars += (stars - existing.stars);
  }

  // Check world completion
  const cleared = Object.values(progress.worlds[worldId].levels).filter(l => l.stars > 0).length;
  if (cleared >= 10) progress.worlds[worldId].completed = true;

  saveProgress();
  return { isNew, improved };
}

/* ═══════════════════════════════════════════
   Screen Management
   ═══════════════════════════════════════════ */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id + '-screen');
  if (el) el.classList.add('active');
  state.screen = id;
}

/* ═══════════════════════════════════════════
   Menu Screen
   ═══════════════════════════════════════════ */
function renderMenu() {
  const catEmoji = getCatEmoji(state.cat);
  const hasProgress = progress.levelsCleared > 0;

  document.getElementById('menu-cat-emoji').textContent = catEmoji;
  document.getElementById('menu-title').textContent = t.title;
  document.getElementById('menu-subtitle').textContent = t.subtitle;

  const btnPlay = document.getElementById('btn-play');
  btnPlay.textContent = hasProgress ? t.resume : t.play;

  document.getElementById('btn-mute').textContent = isMuted() ? '🔇' : '🔊';

  // Comeback message
  const hours = (Date.now() - (progress.lastPlayed || Date.now())) / (1000 * 60 * 60);
  const comeback = getComebackMessage(hours);
  const msgEl = document.getElementById('comeback-msg');
  if (comeback && msgEl) {
    msgEl.textContent = comeback;
    msgEl.style.display = 'block';
  } else if (msgEl) {
    msgEl.style.display = 'none';
  }

  // Cat stats
  const statsEl = document.getElementById('menu-cat-stats');
  if (statsEl) {
    const streakInfo = getStreakInfo(state.daily);
    const skillLabel = getSkillLabel(state.dda);
    const trendLabel = getTrendLabel(state.dda);
    statsEl.innerHTML = `❤️${state.cat.happiness} 🍖${100-state.cat.hunger} ⚡${state.cat.energy} 📊${skillLabel}`;
    const total100 = 100;
    const pct = Math.min(100, Math.round((progress.levelsCleared / total100) * 100));
    statsEl.innerHTML += `<div style="margin-top:6px;height:5px;background:rgba(255,255,255,.1);border-radius:6px;overflow:hidden"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#43e97b,#38f9d7);border-radius:6px"></div></div><div style="font-size:10px;color:#888;margin-top:2px">${pct}% ${L('مكتمل','complete','completo')}</div>`;
  }

  // Daily streak in menu
  const dailyEl = document.getElementById('menu-daily-info');
  if (dailyEl) {
    const info = getStreakInfo(state.daily);
    dailyEl.textContent = `${info.statusEmoji} ${info.currentStreak} ${t.day} ${info.statusText}`;
    dailyEl.style.display = 'block';
  }

  // Cat decay notification
  const catNotifyEl = document.getElementById('menu-cat-notify');
  if (catNotifyEl) {
    let notify = '';
    if (state.cat.hunger > 70) notify = LANG === 'ar' ? '🍖 قطتك جائعة!' : LANG === 'pt' ? '🍖 Seu gato está com fome!' : '🍖 Your cat is hungry!';
    else if (state.cat.happiness < 30) notify = LANG === 'ar' ? '😢 قطتك حزينة!' : LANG === 'pt' ? '😢 Seu gato está triste!' : '😢 Your cat is sad!';
    else if (state.cat.energy < 20) notify = LANG === 'ar' ? '😴 قطتك متعبة!' : LANG === 'pt' ? '😴 Seu gato está cansado!' : '😴 Your cat is tired!';
    catNotifyEl.textContent = notify;
    catNotifyEl.style.display = notify ? 'block' : 'none';
    if (notify) {
      catNotifyEl.onclick = () => { sfxClick(); renderCatCareScreen(); };
    }
  }

  // Smart recommendation — suggest weakest subject
  const recEl = document.getElementById('menu-recommendation');
  if (recEl) {
    const weakest = getWeakestSubject(state.dda);
    if (weakest) {
      const wIdx = WORLDS.findIndex(w => w.subject === weakest);
      if (wIdx >= 0) {
        const w = WORLDS[wIdx];
        recEl.innerHTML = `<span style="cursor:pointer">💡 ${LANG === 'ar' ? 'تدرب على' : LANG === 'pt' ? 'Pratique' : 'Practice'} ${t['w' + w.id]} ${w.emoji}</span>`;
        recEl.style.display = 'block';
        recEl.onclick = () => {
          sfxClick();
          state.currentWorld = w.id;
          worldTransition(() => renderLevelSelect());
        };
      } else {
        recEl.style.display = 'none';
      }
    } else {
      recEl.style.display = 'none';
    }
  }

  // C7: Update practice button visibility
  const btnPractice = document.getElementById('btn-practice');
  if (btnPractice) {
    btnPractice.style.display = loadWrongHistory().length > 0 ? 'block' : 'none';
  }

  showScreen('menu');
}

/* ═══════════════════════════════════════════
   World Map Screen
   ═══════════════════════════════════════════ */
function renderWorldMap() {
  const grid = document.getElementById('world-grid');
  grid.innerHTML = '';

  WORLDS.forEach(w => {
    const unlocked = isWorldUnlocked(w.id);
    const wData = progress.worlds[w.id];
    const cleared = wData ? Object.values(wData.levels || {}).filter(l => l.stars > 0).length : 0;
    const totalStars = wData ? Object.values(wData.levels || {}).reduce((sum, l) => sum + (l.stars || 0), 0) : 0;

    const card = document.createElement('div');
    card.className = 'world-card' + (unlocked ? '' : ' locked');
    card.style.background = unlocked ? w.bg : 'rgba(255,255,255,0.05)';
    const seenStory = hasSeenIntro('w' + w.id);

    card.innerHTML = `
      <div class="wc-emoji">${w.emoji}</div>
      <div class="wc-name">${t['w' + w.id]}</div>
      <div class="wc-subject">${t['ws' + w.id]}</div>
      <div class="wc-progress">${unlocked ? cleared + '/10' : '🔒'}</div>
      ${totalStars > 0 ? `<div class="wc-stars">⭐${totalStars}</div>` : ''}
      ${unlocked && seenStory ? `<div class="wc-rewatch" data-world="${w.id}" style="font-size:10px;color:rgba(255,255,255,.5);margin-top:2px;cursor:pointer">📖 ${LANG === 'ar' ? 'القصة' : 'Story'}</div>` : ''}
    `;

    if (unlocked) {
      card.addEventListener('click', (e) => {
        // Don't navigate if re-watch button was clicked
        if (e.target.classList.contains('wc-rewatch')) return;
        sfxClick();
        state.currentWorld = w.id;
        renderLevelSelect();
      });
    }

    // Re-watch story handler
    if (unlocked && seenStory) {
      const rewatchBtn = card.querySelector('.wc-rewatch');
      if (rewatchBtn) {
        rewatchBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          sfxClick();
          const intro = getWorldIntroForced('w' + w.id);
          if (intro) {
            renderStoryIntro(intro, () => renderWorldMap());
          }
        });
      }
    }

    grid.appendChild(card);
    if (unlocked) floatIn(card, w.id * 80);
  });

  // Top bar
  const topStars = document.getElementById('wm-total-stars');
  if (topStars) topStars.textContent = '⭐ ' + (progress.totalStars || 0);
  const topCoins = document.getElementById('wm-coins');
  if (topCoins) topCoins.textContent = '🪙 ' + (progress.coins || 0);

  showScreen('worldMap');
}

/* ═══════════════════════════════════════════
   Level Select Screen
   ═══════════════════════════════════════════ */
function renderLevelSelect() {
  const world = getWorld(state.currentWorld);
  const grid = document.getElementById('level-grid');
  grid.innerHTML = '';
  const worldLaneStart = getLaneInfo(world.id, 1);
  const worldLaneEnd = getLaneInfo(world.id, 10);

  document.getElementById('ls-world-name').textContent = world.emoji + ' ' + t['w' + world.id];
  document.getElementById('ls-subject').textContent = `${t['ws' + world.id]} • ${worldLaneStart.laneIcon}${worldLaneStart.laneIndex}→${worldLaneEnd.laneIcon}${worldLaneEnd.laneIndex}`;

  for (let lv = 1; lv <= 10; lv++) {
    const unlocked = isLevelUnlocked(world.id, lv);
    const data = getLevelData(world.id, lv);
    const isBoss = lv === 10;
    const laneInfo = getLaneInfo(world.id, lv);

    const card = document.createElement('div');
    card.className = 'level-card' + (unlocked ? '' : ' locked') + (isBoss ? ' boss-card' : '');

    const starStr = data ? '⭐'.repeat(data.stars) + '☆'.repeat(3 - data.stars) : '☆☆☆';

    card.innerHTML = `
      <div class="lc-num">${isBoss ? '👹' : lv}</div>
      <div class="lc-label">${isBoss ? t.bossAlert : t.level + ' ' + lv} • ${laneInfo.laneIcon}${laneInfo.laneIndex}.${laneInfo.laneSlot}</div>
      <div class="lc-stars">${unlocked ? starStr : '🔒'}</div>
      ${data?.best ? `<div class="lc-best">${data.best}%</div>` : ''}
    `;

    if (unlocked) {
      card.addEventListener('click', () => {
        sfxClick();
        state.currentLevel = lv;
        startLevel();
      });
    }

    grid.appendChild(card);
    if (unlocked) floatIn(card, lv * 60);
  }

  showScreen('levelSelect');
}

/* ═══════════════════════════════════════════
   Start Level (Gameplay)
   ═══════════════════════════════════════════ */
function startLevel() {
  const world = getWorld(state.currentWorld);
  const config = getLevelConfig(state.currentWorld, state.currentLevel);

  // ── DDA: adjust difficulty ──
  const ddaMod = getDDAModifier(state.dda, world.subject);
  const adjustedQCount = Math.max(3, config.totalQuestions + ddaMod.questionAdjust);
  const adjustedTimePerQ = Math.max(4, config.timePerQuestion + ddaMod.timeAdjust);

  // B5: Centralized state init
  initGameState(getQuestions(world.subject, adjustedQCount, ddaMod.difficulty), adjustedTimePerQ, false);
  state.shieldActive = isPowerupActive(state.economy, 'shield');
  state.doubleScoreActive = isPowerupActive(state.economy, 'doubleScore');
  state._bossHP = config.isBoss ? { current: state.questions.length, max: state.questions.length } : null;

  applyWorldTheme(world);
  startParticles(world.particleType, world.particleColor);
  startAmbient(world.id);

  // ── Story: show world intro on first visit ──
  const intro = getWorldIntro('w' + state.currentWorld);
  if (intro && state.currentLevel === 1) {
    renderStoryIntro(intro, () => {
      markIntroSeen('w' + state.currentWorld);
      if (config.isBoss) {
        sfxBossAppear();
        renderBossIntro(world, config);
      } else {
        renderGameplay();
      }
    });
    return;
  }

  if (config.isBoss) {
    sfxBossAppear();
    renderBossIntro(world, config);
  } else {
    renderGameplay();
  }
}

/* ── Boss Intro ── */
function renderBossIntro(world, config) {
  const intro = document.getElementById('bossIntro-screen');
  if (intro) {
    const bossEmoji = document.getElementById('boss-emoji');
    const bossName = document.getElementById('boss-name');
    bossEmoji.textContent = world.emoji;
    bossName.textContent = t['b' + world.id];

    // Use bossEntrance() visual effect instead of manual CSS
    showScreen('bossIntro');
    bossEntrance(bossEmoji);
    burst(window.innerWidth / 2, window.innerHeight / 3, '🔥', 10);
    shake(intro);

    setTimeout(() => {
      renderGameplay();
    }, 2500);
  } else {
    renderGameplay();
  }
}

/* ═══════════════════════════════════════════
   Gameplay Screen
   ═══════════════════════════════════════════ */
function renderGameplay() {
  showScreen('gameplay');
  const laneInfo = getLaneInfo(state.currentWorld, state.currentLevel);

  // HUD — challenge mode shows challenge title, normal mode shows world/level
  if (state._isChallengeMode) {
    document.getElementById('hud-world').textContent = LANG === 'ar' ? '🎯 التحدي' : LANG === 'pt' ? '🎯 Desafio' : '🎯 Challenge';
    document.getElementById('hud-level').textContent = '';
  } else {
    const config = getLevelConfig(state.currentWorld, state.currentLevel);
    document.getElementById('hud-world').textContent = t['w' + state.currentWorld];
    document.getElementById('hud-level').textContent = `${(config.isBoss ? '👹 ' : '') + t.level + ' ' + state.currentLevel} • ${laneInfo.laneIcon}${laneInfo.laneIndex}.${laneInfo.laneSlot}`;
  }
  updateHUD();

  // Power-up HUD
  renderPowerupHUD();

  renderQuestion();
  startTimer();
}

function updateHUD() {
  document.getElementById('hud-score').textContent = state.score;
  document.getElementById('hud-streak').textContent = state.streak > 1 ? '🔥' + state.streak : '';
  document.getElementById('hud-lives').textContent = '❤️'.repeat(state.lives) + '🖤'.repeat(Math.max(0, 3 - state.lives));

  // Cat mini
  const catMini = document.getElementById('hud-cat');
  if (catMini) catMini.textContent = getCatEmoji(state.cat);
}

/* ── Render current question ── */
function renderQuestion() {
  if (state.qIndex >= state.questions.length) {
    if (state._isChallengeMode) { endChallengeLevel(); return; }
    endLevel();
    return;
  }

  state.hintUsedThisQ = false;
  _answerLocked = false;
  const q = state.questions[state.qIndex];
  const config = getLevelConfig(state.currentWorld, state.currentLevel);

  document.getElementById('q-counter').textContent = `${t.question} ${state.qIndex + 1} ${t.of} ${state.questions.length}`;
  document.getElementById('q-emoji').textContent = q.emoji;
  document.getElementById('q-text').textContent = q.q;

  // C1: Boss HP bar
  const bossHPContainer = document.getElementById('boss-hp-bar');
  if (bossHPContainer && state._bossHP) {
    const hpPct = Math.round((state._bossHP.current / state._bossHP.max) * 100);
    bossHPContainer.style.display = 'block';
    bossHPContainer.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;justify-content:center;margin-bottom:4px">
        <span style="font-size:16px">👹</span>
        <div style="flex:1;max-width:200px;height:8px;background:rgba(255,255,255,.1);border-radius:6px;overflow:hidden">
          <div style="height:100%;width:${hpPct}%;background:linear-gradient(90deg,#f5576c,#ff6b6b);border-radius:6px;transition:width .4s"></div>
        </div>
        <span style="font-size:11px;color:#f5576c;font-weight:700">${state._bossHP.current}/${state._bossHP.max}</span>
      </div>`;
  } else if (bossHPContainer) {
    bossHPContainer.style.display = 'none';
  }

  // Progress bar
  const pct = ((state.qIndex) / state.questions.length) * 100;
  document.getElementById('q-progress-fill').style.width = pct + '%';

  // Options
  const optContainer = document.getElementById('q-options');
  optContainer.innerHTML = '';

  q.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'opt-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => handleAnswer(idx, btn));
    optContainer.appendChild(btn);
    floatIn(btn, idx * 80);
  });

  // Reset timer
  state.timer = state._adjustedTimePerQ || config.timePerQuestion;
  const timerEl = document.getElementById('q-timer');
  if (timerEl) timerEl.textContent = state.timer;
  // B6: Timer ring visual
  const timerWrap = document.querySelector('.q-timer-wrap');
  if (timerWrap) updateTimerRing(timerWrap, 1);

  state.startTime = Date.now();
}

/* ── Handle answer ── */
function handleAnswer(selectedIdx, btnEl) {
  if (_answerLocked) return;
  _answerLocked = true;

  const q = state.questions[state.qIndex];
  const correct = selectedIdx === q.answer;
  const responseTime = (Date.now() - state.startTime) / 1000;

  // Disable all buttons
  document.querySelectorAll('.opt-btn').forEach(b => b.disabled = true);

  // Track
  trackAnswer(state.tracker, correct, responseTime);

  if (correct) {
    btnEl.classList.add('correct');
    // A7: pulseGlow on correct answer
    pulseGlow(btnEl);
    state.score++;
    state.streak++;
    if (state.streak > state.maxStreak) state.maxStreak = state.streak;
    if (!state._isChallengeMode) sfxCorrectWorld(state.currentWorld); else sfxCorrect();
    feedCat(state.cat);

    // C1: Boss HP decrement
    if (state._bossHP) {
      state._bossHP.current = Math.max(0, state._bossHP.current - 1);
      sfxBossHit();
    }

    // Burst effect at button position
    const rect = btnEl.getBoundingClientRect();
    burst(rect.left + rect.width / 2, rect.top, '✨', 6);

    // Streak message
    const streakMsg = getStreakMessage(state.streak);
    if (streakMsg) showToast(streakMsg);

    // Streak celebration
    if (state.streak === 5 || state.streak === 10 || state.streak === 15) {
      burst(window.innerWidth / 2, window.innerHeight / 3, '🔥', 10 + state.streak);
      sfxStar();
      // C6: Haptic celebration
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
    }

    // Cat reaction
    state.cat.state = 'happy';
  } else {
    btnEl.classList.add('wrong');
    state.streak = 0;
    sfxWrong();
    state.cat.state = 'sad';

    // C6: Haptic wrong answer
    if (navigator.vibrate) navigator.vibrate(80);

    // C2: Track wrong answers for review
    state._wrongAnswers.push({
      q: q.q,
      emoji: q.emoji,
      options: [...q.options],
      answer: q.answer,
      selected: q.options[selectedIdx],
      correct: q.options[q.answer],
    });
    // C7: Persistent wrong answer history for Smart Practice
    addWrongAnswer({ q: q.q, emoji: q.emoji, options: [...q.options], answer: q.answer });

    // Shield power-up: absorb first mistake
    if (state.shieldActive) {
      state.shieldActive = false;
      showToast('🛡️ ' + (LANG === 'ar' ? 'الدرع حماك!' : LANG === 'pt' ? 'O escudo te protegeu!' : 'Shield protected you!'));
    } else {
      state.lives--;
    }

    // Show correct answer
    const opts = document.querySelectorAll('.opt-btn');
    if (opts[q.answer]) opts[q.answer].classList.add('correct');

    // Shake
    shake(document.getElementById('gameplay-screen'));
  }

  // Update HUD
  updateHUD();

  // Check lives
  if (state.lives <= 0) {
    setTimeout(() => state._isChallengeMode ? endChallengeLevel() : endLevel(), 800);
    return;
  }

  // C8: Cat mood HUD reaction
  const catMini = document.getElementById('hud-cat');
  if (catMini) {
    catMini.classList.remove('cat-mood-pop', 'cat-mood-shake');
    void catMini.offsetWidth;
    catMini.classList.add(correct ? 'cat-mood-pop' : 'cat-mood-shake');
  }

  // Next question with C4 transition
  setTimeout(() => {
    state.qIndex++;
    const qArea = document.querySelector('.q-area');
    if (qArea) {
      qArea.classList.add('q-transitioning');
      setTimeout(() => { renderQuestion(); qArea.classList.remove('q-transitioning'); }, 200);
    } else {
      renderQuestion();
    }
  }, correct ? 600 : 1200);
}

/* ── Timer ── */
function startTimer() {
  clearInterval(state.timerInterval);
  const totalTimePerQ = state._adjustedTimePerQ || 15;
  state.timerInterval = setInterval(() => {
    state.timer--;
    state.timeUsed++;

    const timerEl = document.getElementById('q-timer');
    if (timerEl) {
      timerEl.textContent = state.timer;
      if (state.timer <= 3) {
        sfxCountdown();
        timerEl.classList.add('timer-warning');
        // Interactive cat — worried when time runs low
        state.cat.state = 'worried';
        const catMini = document.getElementById('hud-cat');
        if (catMini) { catMini.style.animation = 'shake .3s'; setTimeout(() => catMini.style.animation = '', 300); }
      } else {
        timerEl.classList.remove('timer-warning');
      }
    }

    // B6: Timer ring visual update
    const timerWrap = document.querySelector('.q-timer-wrap');
    if (timerWrap) updateTimerRing(timerWrap, Math.max(0, state.timer / totalTimePerQ));

    if (state.timer <= 0) {
      // Time up for this question — treat as wrong
      state.lives--;
      state.streak = 0;
      sfxWrong();
      // C6: Haptic on time-up
      if (navigator.vibrate) navigator.vibrate(120);
      // C2: Track as wrong
      const q = state.questions[state.qIndex];
      if (q) {
        state._wrongAnswers.push({ q: q.q, emoji: q.emoji, options: [...q.options], answer: q.answer, selected: L('انتهى الوقت', 'Time up', 'Tempo esgotado'), correct: q.options[q.answer] });
        addWrongAnswer({ q: q.q, emoji: q.emoji, options: [...q.options], answer: q.answer });
      }
      updateHUD();

      if (state.lives <= 0) {
        if (state._isChallengeMode) endChallengeLevel();
        else endLevel();
      } else {
        state.qIndex++;
        state.timer = totalTimePerQ;
        renderQuestion();
      }
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(state.timerInterval);
}

/* ── C3: Pause / Resume ── */
function pauseGame() {
  if (state._isPaused || state.screen !== 'gameplay') return;
  state._isPaused = true;
  clearInterval(state.timerInterval);
  const overlay = document.getElementById('pause-overlay');
  if (overlay) overlay.style.display = 'flex';
}

function resumeGame() {
  if (!state._isPaused) return;
  state._isPaused = false;
  const overlay = document.getElementById('pause-overlay');
  if (overlay) overlay.style.display = 'none';
  startTimer();
}

function quitGame() {
  state._isPaused = false;
  const overlay = document.getElementById('pause-overlay');
  if (overlay) overlay.style.display = 'none';
  stopTimer();
  stopParticles();
  stopAmbient();
  state._isChallengeMode = false;
  state._isPracticeMode = false;
  worldTransition(() => renderMenu());
}

/* ═══════════════════════════════════════════
   End Level
   ═══════════════════════════════════════════ */
function endLevel() {
  stopTimer();
  ensureProgressShape();
  if (state.freezeTimeout) { clearTimeout(state.freezeTimeout); state.freezeTimeout = null; }
  state.freezeActive = false;
  stopParticles();
  stopAmbient();

  const config = getLevelConfig(state.currentWorld, state.currentLevel);
  const world = getWorld(state.currentWorld);
  const total = state.questions.length;
  const scorePct = Math.round((state.score / total) * 100);
  const stars = calcStars(state.score, total, state.timeUsed, state.totalTime);
  const passed = stars > 0;
  const laneInfo = getLaneInfo(state.currentWorld, state.currentLevel);

  // ── DDA: update intelligence ──
  state.dda = updateDDA(state.dda, world.subject, passed, state.score, total, state.timeUsed);

  // ── Economy: clear active power-ups ──
  clearActivePowerups(state.economy);

  // XP
  const isDoubled = state.doubleScoreActive;
  let xpGained = 0;
  let laneRewardCoins = 0;
  let laneRewardHints = 0;
  let laneRewardMessage = '';
  if (passed) {
    xpGained = config.xpReward;
    // Double score power-up — applies to both XP and coins
    if (isDoubled) xpGained *= 2;
    state.doubleScoreActive = false;
    const xpResult = addXP(state.cat, xpGained);
    progress.totalXP += xpGained;

    // Coins
    let coinsGained = stars * 10 + (config.isBoss ? 50 : 0);
    if (isDoubled) coinsGained *= 2;
    progress.coins += coinsGained;
    state.tracker.coinsEarned = coinsGained;

    // Lane completion rewards are claim-once at each lane end.
    if (laneInfo.laneSlot === LEVELS_PER_LANE && !progress.laneRewards[laneInfo.laneId]) {
      const isMilestoneLane = laneInfo.laneIndex % 5 === 0;
      laneRewardCoins = isMilestoneLane ? 140 : 60;
      laneRewardHints = isMilestoneLane ? 2 : 1;
      progress.laneRewards[laneInfo.laneId] = {
        laneId: laneInfo.laneId,
        laneIndex: laneInfo.laneIndex,
        claimedAt: Date.now(),
        coins: laneRewardCoins,
        hints: laneRewardHints,
      };
      progress.laneRewardTotal = (progress.laneRewardTotal || 0) + laneRewardCoins;
      progress.coins += laneRewardCoins;
      state.economy.inventory.hint = (state.economy.inventory.hint || 0) + laneRewardHints;
      saveEconomy(state.economy);
      laneRewardMessage = isMilestoneLane
        ? L(
            `🏁 ممر ${laneInfo.laneIndex} الكبير: +${laneRewardCoins} 🪙 و +${laneRewardHints} 💡`,
            `🏁 Lane ${laneInfo.laneIndex} milestone: +${laneRewardCoins} 🪙 and +${laneRewardHints} 💡`,
            `🏁 Marco da faixa ${laneInfo.laneIndex}: +${laneRewardCoins} 🪙 e +${laneRewardHints} 💡`
          )
        : L(
            `🏁 ممر ${laneInfo.laneIndex}: +${laneRewardCoins} 🪙 و +${laneRewardHints} 💡`,
            `🏁 Lane ${laneInfo.laneIndex}: +${laneRewardCoins} 🪙 and +${laneRewardHints} 💡`,
            `🏁 Faixa ${laneInfo.laneIndex}: +${laneRewardCoins} 🪙 e +${laneRewardHints} 💡`
          );
      showToast(laneRewardMessage);
    }
  }

  // World completion detection
  const wDataPre = progress.worlds[state.currentWorld];
  const clearedPre = wDataPre ? Object.values(wDataPre.levels || {}).filter(l => l.stars > 0).length : 0;

  // Save level result
  const prevProgress = { ...progress };
  if (passed) {
    setLevelResult(state.currentWorld, state.currentLevel, stars, scorePct);
  }

  const wDataPost = progress.worlds[state.currentWorld];
  const clearedPost = wDataPost ? Object.values(wDataPost.levels || {}).filter(l => l.stars > 0).length : 0;
  const worldJustCompleted = clearedPre < 10 && clearedPost >= 10;

  // Bonus coins for world completion
  if (worldJustCompleted) {
    progress.coins += 100;
  }

  progress.lastPlayed = Date.now();
  saveProgress();

  // Play with cat
  if (passed) {
    playCat(state.cat);
    state.cat.state = stars === 3 ? 'proud' : 'happy';
  } else {
    state.cat.state = 'sad';
  }
  saveCat(state.cat);

  // Badges — fill tracker context before checking
  state.tracker.timeRemainPct = state.totalTime > 0 ? Math.max(0, 1 - state.timeUsed / state.totalTime) : 0;
  state.tracker.worldsVisited = Object.keys(progress.worlds || {}).length;
  state.tracker.dailyStreak = state.daily?.streak || 0;
  if (config.isBoss && passed) state.tracker.bossDefeated = true;
  const badges = checkMicroBadges(state.tracker);
  state.tracker._earnedBadges = badges;
  if (badges.length > 0) {
    recordBadges(badges);
    // C3: Badge celebration toasts
    badges.forEach((b, i) => {
      setTimeout(() => {
        showToast(`${b.icon} ${b.label}`);
        burst(window.innerWidth / 2, window.innerHeight / 2, b.icon, 6);
      }, 2000 + i * 1000);
    });
  }

  // A8: Session summary
  const sessionSummary = getSessionSummary(state.tracker);

  // Milestone
  const milestone = getMilestoneMessage(progress, prevProgress);

  // Near miss
  const nearMiss = !passed ? checkNearMiss(state.score, Math.ceil(total * config.passScore), total) : { isNearMiss: false };

  // Render results
  renderResults({
    passed,
    stars,
    scorePct,
    correct: state.score,
    total,
    maxStreak: state.maxStreak,
    xpGained,
    coinsGained: passed ? (state.tracker.coinsEarned || 0) : 0,
    badges,
    milestone,
    nearMiss,
    isBoss: config.isBoss,
    funFact: getFunFact(world.subject),
    encouragement: passed ? getEncouragement() : null,
    worldJustCompleted: worldJustCompleted || false,
    isChallenge: false,
    laneRewardCoins,
    laneRewardHints,
    laneRewardMessage,
    wrongAnswers: state._wrongAnswers || [],
    sessionSummary,
  });

  // PostMessage to parent — B7: error boundary, C10: enhanced data
  if (passed) {
    try {
      window.parent.postMessage({
        type: 'GAME_COMPLETE',
        score: scorePct,
        total: 100,
        level: state.currentLevel,
        world: state.currentWorld,
        stars: stars,
        timeElapsed: state.timeUsed,
        subject: world.subject,
        badges: badges.map(b => b.id),
        skill: Math.round(state.dda.smoothedSkill * 100),
        streak: state.maxStreak,
        worldCompleted: worldJustCompleted || false,
        coinsEarned: state.tracker.coinsEarned || 0,
        xpEarned: xpGained,
        correctCount: state.score,
        totalQuestions: total,
        wrongCount: (state._wrongAnswers || []).length,
        catLevel: getCatLevel(state.cat.totalXP).level,
      }, '*');
    } catch (_) { /* B7: silently ignore postMessage errors */ }
  }
}

/* ═══════════════════════════════════════════
   Results Screen
   ═══════════════════════════════════════════ */
function renderResults(data) {
  showScreen('results');

  const titleEl = document.getElementById('results-title');
  if (data.isChallenge) {
    titleEl.textContent = data.passed
      ? L('🎯 نجحت في التحدي!', '🎯 Challenge Passed!', '🎯 Desafio Concluído!')
      : L('🎯 حاول مرة أخرى', '🎯 Try Again', '🎯 Tente Novamente');
  } else {
    titleEl.textContent = data.passed
      ? (data.isBoss ? t.bossDefeated : t.levelComplete)
      : (data.isBoss ? t.bossFailed : t.wrong);
  }

  // Stars
  animateStars(document.getElementById('results-stars'), data.stars);

  // Score
  document.getElementById('results-score').textContent = `${t.score}: ${data.scorePct}%`;

  // Details
  const detailsEl = document.getElementById('results-details');
  let detailsHTML = `
    ${t.correct}: ${data.correct}/${data.total}<br>
    ${t.streak}: ${data.maxStreak}<br>
    ${t.xp}: +${data.xpGained}<br>
    ${data.coinsGained ? `🪙 +${data.coinsGained}<br>` : ''}
    ${data.laneRewardCoins ? `🏁 +${data.laneRewardCoins} 🪙${data.laneRewardHints ? ` · +${data.laneRewardHints} 💡` : ''}<br>` : ''}
    ${data.badges.length > 0 ? data.badges.map(b => `${b.icon} ${b.label}`).join(' · ') : ''}
    ${data.encouragement ? `<br><span style="color:#43e97b">${data.encouragement}</span>` : ''}
    ${data.funFact ? `<br><br><span style="color:#fbbf24;font-size:12px">${data.funFact}</span>` : ''}
  `;

  if (data.laneRewardMessage) {
    detailsHTML += `<br><span style="color:#38f9d7">${data.laneRewardMessage}</span>`;
  }

  // Challenge reward info
  if (data.isChallenge && data.passed && data.challengeReward > 0) {
    detailsHTML += `<br><span style="color:#fbbf24;font-weight:700">🪙 +${data.challengeReward}</span>`;
  }

  // A8: Session summary
  if (data.sessionSummary) {
    const ss = data.sessionSummary;
    detailsHTML += `<div style="margin-top:10px;padding:8px;border-radius:10px;background:rgba(255,255,255,.06);font-size:12px">
      <div style="font-weight:700;margin-bottom:4px">${ss.title}</div>
      <div style="color:#aaa">${ss.message}</div>
    </div>`;
  }

  // C6: Enhanced world completion celebration
  if (data.worldJustCompleted) {
    detailsHTML += `<div style="text-align:center;margin-top:12px;padding:14px;border-radius:14px;background:linear-gradient(135deg,rgba(251,191,36,.12),rgba(67,233,123,.12));border:1px solid rgba(251,191,36,.25)">
      <div style="font-size:28px">🏆🎉🌟</div>
      <div style="font-size:15px;font-weight:900;color:#fbbf24;margin-top:6px">${L('أكملت العالم!', 'World Complete!', 'Mundo Completo!')}</div>
      <div style="font-size:13px;color:#43e97b;margin-top:4px">+100 🪙</div>
    </div>`;
  }

  detailsEl.innerHTML = detailsHTML;

  // C10: XP progress bar animation
  if (data.xpGained > 0) {
    const { level, currentXP, xpForNext } = getCatLevel(state.cat.totalXP);
    const xpBar = document.createElement('div');
    xpBar.style.cssText = 'margin-top:8px;height:6px;background:rgba(255,255,255,.1);border-radius:6px;overflow:hidden;max-width:200px;margin-inline:auto';
    const fill = document.createElement('div');
    fill.style.cssText = 'height:100%;background:linear-gradient(90deg,#43e97b,#38f9d7);border-radius:6px;width:0%';
    xpBar.appendChild(fill);
    detailsEl.appendChild(xpBar);
    const fromXP = Math.max(0, currentXP - data.xpGained);
    setTimeout(() => animateXP(fill, fromXP, currentXP, xpForNext), 500);
  }

  // Cat
  const catEl = document.getElementById('results-cat');
  if (catEl) {
    catEl.textContent = getCatEmoji(state.cat);
    const catMsg = document.getElementById('results-cat-msg');
    if (catMsg) catMsg.textContent = data.passed ? t.catProud : t.catSad;
  }

  // Milestone toast
  if (data.milestone) {
    setTimeout(() => showToast(data.milestone), 1000);
  }

  // Near miss
  if (data.nearMiss?.isNearMiss) {
    setTimeout(() => showToast(getNearMissMessage()), 800);
  }

  // Sound
  if (data.passed) {
    if (data.worldJustCompleted) {
      sfxWorldComplete();
      burst(window.innerWidth / 2, window.innerHeight / 4, '🎉', 15);
      burst(window.innerWidth / 3, window.innerHeight / 3, '🌟', 10);
      burst(window.innerWidth * 2 / 3, window.innerHeight / 3, '👑', 10);
      setTimeout(() => showToast(L('🎉 أكملت العالم! +100 عملة!', '🎉 World complete! +100 coins!', '🎉 Mundo completo! +100 moedas!')), 500);
    } else if (data.isBoss) {
      sfxWorldComplete();
    } else if (data.isChallenge) {
      sfxStar();
    } else {
      sfxLevelUp();
    }
  } else {
    sfxMeow();
  }

  // Buttons
  const nextBtn = document.getElementById('btn-next');
  const retryBtn = document.getElementById('btn-retry');
  const homeBtn = document.getElementById('btn-home');

  if (nextBtn) {
    if (data.isChallenge) {
      nextBtn.style.display = data.passed ? '' : 'none';
      nextBtn.onclick = () => { sfxClick(); renderChallengeScreen(); };
    } else {
      nextBtn.style.display = data.passed ? '' : 'none';
      nextBtn.onclick = () => {
        sfxClick();
        if (state.currentLevel >= 10) {
          worldTransition(() => renderWorldMap());
        } else {
          state.currentLevel++;
          worldTransition(() => startLevel());
        }
      };
    }
  }

  if (retryBtn) {
    retryBtn.onclick = () => {
      sfxClick();
      if (data.isChallenge) startChallengeLevel();
      else startLevel();
    };
  }

  if (homeBtn) {
    homeBtn.onclick = () => {
      sfxClick();
      worldTransition(() => renderMenu());
    };
  }

  // A2/B4: Remove previously appended dynamic buttons
  const resultsBtns = document.querySelector('.results-btns');
  if (resultsBtns) {
    resultsBtns.querySelectorAll('.btn-dynamic').forEach(b => b.remove());
  }

  // C2: Review mistakes button
  const wrongAnswers = data.wrongAnswers || state._wrongAnswers || [];
  if (wrongAnswers.length > 0) {
    const reviewBtn = document.createElement('button');
    reviewBtn.className = 'btn btn-small btn-gold btn-dynamic';
    reviewBtn.textContent = L('🔍 راجع أخطاءك', '🔍 Review Mistakes', '🔍 Revisar Erros');
    reviewBtn.style.marginTop = '8px';
    reviewBtn.addEventListener('click', () => {
      sfxClick();
      showReviewOverlay(wrongAnswers);
    });
    document.querySelector('.results-btns')?.appendChild(reviewBtn);
  }
}

/* ═══════════════════════════════════════════
   Review Mistakes Overlay (C2)
   ═══════════════════════════════════════════ */
function showReviewOverlay(wrongAnswers) {
  let overlay = document.getElementById('review-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'review-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.92);display:flex;flex-direction:column;align-items:center;padding:20px;overflow-y:auto';
    document.body.appendChild(overlay);
  }
  let html = `<div style="max-width:400px;width:100%">
    <div style="text-align:center;margin-bottom:16px">
      <div style="font-size:28px;font-weight:900">${L('🔍 مراجعة الأخطاء', '🔍 Review Mistakes', '🔍 Revisar Erros')}</div>
      <div style="font-size:13px;color:#aaa;margin-top:4px">${wrongAnswers.length} ${L('أخطاء', 'mistakes', 'erros')}</div>
    </div>`;
  wrongAnswers.forEach((w, i) => {
    html += `<div style="padding:14px;border-radius:14px;background:rgba(255,255,255,.06);margin-bottom:10px;border-left:3px solid #f5576c">
      <div style="font-size:14px;font-weight:700;margin-bottom:6px">${w.emoji || '❓'} ${w.q}</div>
      <div style="font-size:12px;margin-bottom:3px"><span style="color:#f5576c">✗</span> ${L('إجابتك', 'Your answer', 'Sua resposta')}: <span style="color:#f5576c;font-weight:700">${w.selected}</span></div>
      <div style="font-size:12px"><span style="color:#43e97b">✓</span> ${L('الصحيح', 'Correct', 'Correto')}: <span style="color:#43e97b;font-weight:700">${w.correct}</span></div>
    </div>`;
  });
  html += `<button class="btn btn-primary" style="width:100%;margin-top:8px" id="btn-close-review">${L('✅ فهمت', '✅ Got it', '✅ Entendi')}</button></div>`;
  overlay.innerHTML = html;
  overlay.style.display = 'flex';
  document.getElementById('btn-close-review').addEventListener('click', () => {
    sfxClick();
    overlay.style.display = 'none';
  });
}

/* ═══════════════════════════════════════════
   Story Intro Screen
   ═══════════════════════════════════════════ */
function renderStoryIntro(intro, onContinue) {
  const overlay = document.getElementById('storyIntro-screen');
  if (!overlay) { onContinue(); return; }

  document.getElementById('story-emoji').textContent = intro.emoji;
  document.getElementById('story-title').textContent = intro.title;
  document.getElementById('story-text').textContent = intro.story;
  document.getElementById('story-tip').textContent = intro.tip;

  const btn = document.getElementById('btn-story-go');
  btn.textContent = t.play;
  btn.onclick = () => {
    sfxClick();
    onContinue();
  };

  showScreen('storyIntro');
}

/* ═══════════════════════════════════════════
   Daily Reward Popup
   ═══════════════════════════════════════════ */
function checkDailyReward() {
  if (!canClaimDaily(state.daily)) return;

  const result = claimDaily(
    state.daily,
    (coins) => { progress.coins += coins; saveProgress(); },
    (powerupId) => {
      state.economy.inventory[powerupId] = (state.economy.inventory[powerupId] || 0) + 1;
      saveEconomy(state.economy);
    }
  );

  if (result) {
    sfxStar();
    burst(window.innerWidth / 2, window.innerHeight / 2, result.emoji, 10);
    showToast(result.message);
    // Update coins display
    const coinsEl = document.getElementById('wm-coins');
    if (coinsEl) coinsEl.textContent = '🪙 ' + progress.coins;
  }
}

/* ═══════════════════════════════════════════
   Reports Screen
   ═══════════════════════════════════════════ */
function renderReportsScreen() {
  const container = document.getElementById('reports-content');
  if (!container) return;

  const report = generateReport(state.dda);
  container.innerHTML = renderReportHTML(report);

  showScreen('reports');
}

/* ═══════════════════════════════════════════
   Power-up HUD (in gameplay)
   ═══════════════════════════════════════════ */
function renderPowerupHUD() {
  const hud = document.getElementById('powerup-hud');
  if (!hud) return;

  const items = ['hint', 'freeze', 'extraLife', 'shield', 'doubleScore'];
  hud.innerHTML = '';

  items.forEach(id => {
    const pu = POWERUPS[id];
    const count = getPowerupCount(state.economy, id);
    if (count <= 0) return;

    const btn = document.createElement('button');
    btn.className = 'btn-icon powerup-btn';
    btn.style.cssText = 'font-size:16px;position:relative;';
    btn.title = pu.name();
    btn.textContent = pu.emoji;

    // Count badge
    const badge = document.createElement('span');
    badge.style.cssText = 'position:absolute;top:-4px;right:-4px;background:#f5576c;color:#fff;border-radius:50%;width:16px;height:16px;font-size:10px;display:flex;align-items:center;justify-content:center;font-weight:700;';
    badge.textContent = count;
    btn.appendChild(badge);

    btn.addEventListener('click', () => {
      if (id === 'hint' && !state.hintUsedThisQ) {
        if (usePowerup(state.economy, 'hint')) {
          state.hintUsedThisQ = true;
          const q = state.questions[state.qIndex];
          const hideIndices = applyHint(q.options, q.answer);
          const opts = document.querySelectorAll('.opt-btn');
          hideIndices.forEach(i => {
            if (opts[i]) { opts[i].style.opacity = '0.2'; opts[i].disabled = true; }
          });
          sfxClick();
          showToast('💡 ' + pu.name());
          renderPowerupHUD();
        }
      } else if (id === 'freeze' && !state.freezeActive) {
        if (usePowerup(state.economy, 'freeze')) {
          state.freezeActive = true;
          clearInterval(state.timerInterval);
          sfxClick();
          showToast('❄️ ' + pu.name());
          // Resume timer after 10 seconds
          state.freezeTimeout = setTimeout(() => {
            state.freezeActive = false;
            startTimer();
          }, 10000);
          renderPowerupHUD();
        }
      } else if (id === 'extraLife') {
        if (state.lives < 3 && usePowerup(state.economy, 'extraLife')) {
          state.lives++;
          updateHUD();
          sfxClick();
          showToast('❤️ ' + pu.name());
          renderPowerupHUD();
        } else if (state.lives >= 3) {
          showToast(LANG === 'ar' ? '❤️ حيواتك كاملة!' : LANG === 'pt' ? '❤️ Vidas cheias!' : '❤️ Lives full!');
        }
      } else if (id === 'shield') {
        if (!state.shieldActive && usePowerup(state.economy, 'shield')) {
          state.shieldActive = true;
          sfxClick();
          showToast('🛡️ ' + pu.name());
          renderPowerupHUD();
        }
      } else if (id === 'doubleScore') {
        if (!state.doubleScoreActive && usePowerup(state.economy, 'doubleScore')) {
          state.doubleScoreActive = true;
          sfxClick();
          showToast('✨ ' + pu.name());
          renderPowerupHUD();
        }
      }
    });

    hud.appendChild(btn);
  });
}

/* ═══════════════════════════════════════════
   Store Screen (Cat Skins + Power-ups)
   ═══════════════════════════════════════════ */
let _storeBusy = false;
function renderStore() {
  const grid = document.getElementById('store-grid');
  if (!grid) return;
  grid.innerHTML = '';

  document.getElementById('store-coins').textContent = '🪙 ' + progress.coins;

  // ── Tab toggle ──
  const tabContainer = document.getElementById('store-tabs');
  const activeTab = tabContainer?.dataset.active || 'skins';

  // ── Skins tab ──
  if (activeTab === 'skins') {
    SKINS.forEach(skin => {
      const owned = state.cat.unlockedSkins.includes(skin.id);
      const equipped = state.cat.equippedSkin === skin.id;

      const card = document.createElement('div');
      card.className = 'store-card' + (equipped ? ' equipped' : '');
      card.innerHTML = `
        <div class="sc-emoji">${skin.emoji}</div>
        <div class="sc-name">${typeof skin.name === 'function' ? skin.name() : skin.name}</div>
        <div class="sc-price">${owned ? (equipped ? t.equipped : t.owned) : '🪙' + skin.cost}</div>
      `;

      card.addEventListener('click', () => {
        if (_storeBusy || equipped) return;
        _storeBusy = true; setTimeout(() => _storeBusy = false, 500);
        if (owned) {
          equipSkin(state.cat, skin.id);
          sfxPurr();
          renderStore();
        } else {
          const result = buySkin(state.cat, skin.id, progress.coins);
          if (result.success) {
            progress.coins -= result.cost;
            saveProgress();
            saveCat(state.cat);
            equipSkin(state.cat, skin.id);
            sfxPurchase();
            burst(window.innerWidth / 2, window.innerHeight / 2, '✨', 12);
            renderStore();
          } else {
            showToast(t.notEnough);
            sfxWrong();
          }
        }
      });

      grid.appendChild(card);
    });
  }

  // ── Power-ups tab ──
  if (activeTab === 'powerups') {
    const items = getShopItems(state.economy);
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'store-card';
      card.innerHTML = `
        <div class="sc-emoji">${item.emoji}</div>
        <div class="sc-name">${item.name}</div>
        <div style="font-size:10px;color:rgba(255,255,255,.5);margin:2px 0">${item.desc}</div>
        <div class="sc-price">${item.canBuy ? '🪙' + item.cost : ''}</div>
        <div style="font-size:11px;color:#aaa">${item.owned}/${item.maxStack}</div>
      `;

      if (item.canBuy) {
        card.addEventListener('click', () => {
          if (_storeBusy) return;
          _storeBusy = true; setTimeout(() => _storeBusy = false, 500);
          const result = buyPowerup(
            state.economy,
            item.id,
            () => progress.coins,
            (cost) => { progress.coins -= cost; saveProgress(); }
          );
          if (result.success) {
            sfxPurchase();
            burst(window.innerWidth / 2, window.innerHeight / 2, item.emoji, 6);
            showToast(result.message);
          } else {
            showToast(result.message);
            sfxWrong();
          }
          renderStore();
        });
      }

      grid.appendChild(card);
    });
  }

  showScreen('store');
}

/* ── C9: Challenge Calendar ── */
function renderChallengeCalendar() {
  const cal = getCalendarData(state.challenge);
  if (!cal || cal.length === 0) return '';
  const dayLabels = LANG === 'ar' ? ['أح','إث','ث','أر','خ','ج','س'] : ['Su','Mo','Tu','We','Th','Fr','Sa'];
  let html = `<div style="margin-top:16px;padding:12px;border-radius:14px;background:rgba(255,255,255,.06)">
    <div style="font-size:13px;font-weight:700;margin-bottom:8px;text-align:center">${L('📅 التقويم','📅 Calendar','📅 Calendário')}</div>
    <div class="calendar-grid">`;
  dayLabels.forEach(d => { html += `<div class="calendar-cell" style="font-weight:700;color:#fbbf24;background:transparent;border:none;font-size:9px">${d}</div>`; });
  // Pad first week
  const firstDay = new Date(cal[0].date).getDay();
  for (let p = 0; p < firstDay; p++) html += '<div class="calendar-cell" style="background:transparent;border:none"></div>';
  cal.forEach(day => {
    const cls = `calendar-cell${day.claimed ? ' claimed' : ''}${day.isToday ? ' today' : ''}`;
    html += `<div class="${cls}">${day.emoji}</div>`;
  });
  html += '</div></div>';
  return html;
}

/* ═══════════════════════════════════════════
   Challenge Screen
   ═══════════════════════════════════════════ */
function renderChallengeScreen() {
  const container = document.getElementById('challenge-content');
  if (!container) return;
  state.challenge = loadChallenge();
  const info = getChallengeInfo(state.challenge);

  container.innerHTML = `
    <div style="text-align:center;padding:20px;">
      <div style="font-size:48px;margin-bottom:12px">🎯</div>
      <h2 style="color:#fff;margin:0">${LANG === 'ar' ? 'التحدي اليومي' : LANG === 'pt' ? 'Desafio Diário' : 'Daily Challenge'}</h2>
      <p style="color:#ffd740;margin:8px 0">${info.statusText}</p>
      <div style="display:flex;justify-content:center;gap:16px;margin:16px 0">
        <div style="text-align:center"><div style="font-size:20px;color:#fff;font-weight:700">${info.streak}</div><div style="font-size:11px;color:#ccc">🔥 ${LANG === 'ar' ? 'متتالية' : 'Streak'}</div></div>
        <div style="text-align:center"><div style="font-size:20px;color:#fff;font-weight:700">${info.totalCompleted}</div><div style="font-size:11px;color:#ccc">✅ ${LANG === 'ar' ? 'مكتمل' : 'Done'}</div></div>
        <div style="text-align:center"><div style="font-size:20px;color:#fff;font-weight:700">${info.bestScore}%</div><div style="font-size:11px;color:#ccc">🏆 ${LANG === 'ar' ? 'أفضل' : 'Best'}</div></div>
      </div>
      ${info.available
        ? `<button id="btn-start-challenge" class="btn-primary" style="margin-top:12px">${LANG === 'ar' ? 'ابدأ التحدي!' : LANG === 'pt' ? 'Começar!' : 'Start!'}</button>`
        : `<p style="color:#43e97b;margin-top:16px">✅ ${LANG === 'ar' ? 'أكملت تحدي اليوم! عد غداً' : LANG === 'pt' ? 'Desafio de hoje feito! Volte amanhã' : 'Today\'s challenge done! Come back tomorrow'}</p>`
      }
      ${renderChallengeCalendar()}
    </div>`;

  if (info.available) {
    document.getElementById('btn-start-challenge').addEventListener('click', () => {
      sfxClick();
      startChallengeLevel();
    });
  }

  showScreen('challenge');
}

function startChallengeLevel() {
  const questions = getChallengeQuestions();
  // C5: DDA-adaptive challenge difficulty
  const ddaMod = getDDAModifier(state.dda, 'mixed');
  const baseTime = 12;
  const adjustedTime = Math.max(6, Math.min(18, baseTime + (ddaMod.timeAdjust || 0)));

  // B5: Centralized state init
  initGameState(questions, adjustedTime, true);
  state.shieldActive = false;
  state.doubleScoreActive = false;

  renderGameplay();
}

function endChallengeLevel() {
  stopTimer();
  if (state.freezeTimeout) { clearTimeout(state.freezeTimeout); state.freezeTimeout = null; }
  state.freezeActive = false;
  stopParticles();
  stopAmbient();
  state._isChallengeMode = false;

  // A4: Economy cleanup
  clearActivePowerups(state.economy);

  const total = state.questions.length;
  const scorePct = Math.round((state.score / total) * 100);
  const result = completeChallenge(state.challenge, state.score, total);

  // A3: DDA update
  state.dda = updateDDA(state.dda, 'mixed', result.passed, state.score, total, state.timeUsed);

  // A5: XP & cat update
  let xpGained = 0;
  if (result.passed) {
    xpGained = 20 + (state.challenge.streak || 0) * 5;
    if (state.doubleScoreActive) xpGained *= 2;
    addXP(state.cat, xpGained);
    progress.totalXP += xpGained;
    playCat(state.cat);
    state.cat.state = 'happy';
  } else {
    state.cat.state = 'sad';
  }
  state.doubleScoreActive = false;
  state.shieldActive = false;
  saveCat(state.cat);

  if (result.passed && result.reward > 0) {
    progress.coins += result.reward;
  }
  progress.lastPlayed = Date.now();
  saveProgress();

  // Badges
  state.tracker.timeRemainPct = state.totalTime > 0 ? Math.max(0, 1 - state.timeUsed / state.totalTime) : 0;
  state.tracker.worldsVisited = Object.keys(progress.worlds || {}).length;
  state.tracker.dailyStreak = state.daily?.streak || 0;
  const badges = checkMicroBadges(state.tracker);
  state.tracker._earnedBadges = badges;
  if (badges.length > 0) recordBadges(badges);

  // A6: Show proper results screen instead of just toast
  renderResults({
    passed: result.passed,
    stars: result.passed ? (scorePct >= 95 ? 3 : scorePct >= 75 ? 2 : 1) : 0,
    scorePct,
    correct: state.score,
    total,
    maxStreak: state.maxStreak,
    xpGained,
    badges,
    milestone: null,
    nearMiss: !result.passed ? checkNearMiss(state.score, Math.ceil(total * 0.6), total) : { isNearMiss: false },
    isBoss: false,
    funFact: getFunFact('mixed'),
    encouragement: result.passed ? getEncouragement() : null,
    worldJustCompleted: false,
    isChallenge: true,
    challengeReward: result.reward || 0,
  });
}

/* ═══════════════════════════════════════════
   Profile Screen
   ═══════════════════════════════════════════ */
function renderProfileScreen() {
  const container = document.getElementById('profile-content');
  if (!container) return;

  state.challenge = loadChallenge();
  const ddaMod = getDDAModifier(state.dda, '');
  ddaMod.trend = getPerformanceTrend(state.dda);
  const html = renderProfileHTML(progress, state.cat, ddaMod, state.daily, state.challenge);
  container.innerHTML = html;

  showScreen('profile');
}

/* ═══════════════════════════════════════════
   Settings Screen
   ═══════════════════════════════════════════ */
function renderSettingsScreen() {
  const container = document.getElementById('settings-content');
  if (!container) return;

  const muteLabel = isMuted()
    ? (LANG === 'ar' ? '🔇 الصوت مغلق' : LANG === 'pt' ? '🔇 Som Desligado' : '🔇 Sound Off')
    : (LANG === 'ar' ? '🔊 الصوت مفعل' : LANG === 'pt' ? '🔊 Som Ligado' : '🔊 Sound On');

  const currentVol = Math.round(getVolume() * 100);

  container.innerHTML = `
    <div style="text-align:center;padding:20px;direction:${LANG==='ar'?'rtl':'ltr'}">
      <div style="font-size:48px;margin-bottom:12px">⚙️</div>
      <h2 style="color:#fff;margin:0 0 20px">${t.settings}</h2>

      <button id="settings-mute" class="btn-secondary" style="width:100%;max-width:260px;margin:8px auto;display:block">${muteLabel}</button>

      <div style="width:100%;max-width:260px;margin:12px auto;background:rgba(255,255,255,.08);border-radius:12px;padding:12px">
        <label style="color:#ccc;font-size:13px;display:block;margin-bottom:8px">
          🔊 ${LANG === 'ar' ? 'مستوى الصوت' : LANG === 'pt' ? 'Volume' : 'Volume'}: <span id="vol-label">${currentVol}%</span>
        </label>
        <input type="range" id="settings-volume" min="0" max="100" value="${currentVol}" style="width:100%;accent-color:var(--accent)">
      </div>

      <button id="settings-reset-tutorial" class="btn-secondary" style="width:100%;max-width:260px;margin:8px auto;display:block">
        ${LANG === 'ar' ? '📖 إعادة الشرح' : LANG === 'pt' ? '📖 Refazer Tutorial' : '📖 Replay Tutorial'}
      </button>

      <div style="width:100%;max-width:260px;margin:16px auto;background:rgba(255,255,255,.08);border-radius:12px;padding:12px">
        <label style="color:#ccc;font-size:13px;display:block;margin-bottom:8px">
          💾 ${LANG === 'ar' ? 'النسخ الاحتياطي' : LANG === 'pt' ? 'Backup' : 'Backup'}
        </label>
        <div style="display:flex;gap:6px;margin-bottom:6px">
          <button id="settings-export" class="btn-secondary" style="flex:1;font-size:11px;padding:8px">
            📤 ${LANG === 'ar' ? 'تصدير' : LANG === 'pt' ? 'Exportar' : 'Export'}
          </button>
          <button id="settings-import" class="btn-secondary" style="flex:1;font-size:11px;padding:8px">
            📥 ${LANG === 'ar' ? 'استيراد' : LANG === 'pt' ? 'Importar' : 'Import'}
          </button>
        </div>
        <textarea id="settings-data-area" style="width:100%;height:50px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#fff;font-size:9px;padding:6px;resize:none;display:none" placeholder="${LANG === 'ar' ? 'البيانات...' : 'Data...'}"></textarea>
      </div>

      <div style="margin-top:24px;padding-top:16px;border-top:1px solid rgba(255,255,255,.1)">
        <p style="color:#999;font-size:11px;margin:4px 0">Cat Kingdom v6.0</p>
        <p style="color:#666;font-size:10px;margin:2px 0">Classify Educational Platform</p>
      </div>
    </div>`;

  document.getElementById('settings-mute').addEventListener('click', () => {
    const m = toggleMute();
    document.getElementById('btn-mute').textContent = m ? '🔇' : '🔊';
    renderSettingsScreen();
  });

  document.getElementById('settings-volume').addEventListener('input', (e) => {
    const vol = parseInt(e.target.value) / 100;
    setVolume(vol);
    const label = document.getElementById('vol-label');
    if (label) label.textContent = e.target.value + '%';
  });

  document.getElementById('settings-reset-tutorial').addEventListener('click', () => {
    sfxClick();
    try { localStorage.removeItem('catk_tutorial'); } catch(e) {}
    showToast(LANG === 'ar' ? '✅ تم إعادة التعليمات' : '✅ Tutorial reset');
  });

  // Export progress
  document.getElementById('settings-export').addEventListener('click', () => {
    sfxClick();
    const keys = ['catk_progress','catk_intelligence','catk_story','catk_economy','catk_daily','catk_cat','catk_badges','catk_tutorial','catk_challenge','catk_mute','catk_volume'];
    const data = {};
    keys.forEach(k => { try { const v = localStorage.getItem(k); if (v !== null) data[k] = v; } catch(e) {} });
    const json = JSON.stringify(data);
    const area = document.getElementById('settings-data-area');
    if (area) { area.value = json; area.style.display = 'block'; area.select(); }
    try { navigator.clipboard.writeText(json); } catch(e) {}
    showToast(LANG === 'ar' ? '📤 تم نسخ البيانات!' : '📤 Copied!');
  });

  // Import progress
  document.getElementById('settings-import').addEventListener('click', () => {
    sfxClick();
    const area = document.getElementById('settings-data-area');
    if (!area) return;
    if (!area.value.trim()) {
      area.style.display = 'block';
      area.value = '';
      area.focus();
      showToast(LANG === 'ar' ? '📥 الصق البيانات أولاً' : '📥 Paste data first');
      return;
    }
    try {
      const imported = JSON.parse(area.value.trim());
      for (const [k, v] of Object.entries(imported)) {
        if (k.startsWith('catk_')) localStorage.setItem(k, v);
      }
      progress = loadProgress();
      state.cat = loadCat();
      state.dda = loadDDA();
      state.economy = loadEconomy();
      state.daily = loadDaily();
      state.challenge = loadChallenge();
      showToast(LANG === 'ar' ? '✅ تم الاستيراد!' : '✅ Imported!');
      renderMenu();
    } catch(e) {
      showToast(LANG === 'ar' ? '❌ بيانات غير صالحة' : '❌ Invalid data');
    }
  });

  showScreen('settings');
}

/* ═══════════════════════════════════════════
   Tutorial Overlay
   ═══════════════════════════════════════════ */
function showTutorialOverlay() {
  const steps = getTutorialSteps();
  let current = 0;
  const overlay = document.getElementById('tutorial-overlay');
  if (!overlay) return;

  function renderStep() {
    overlay.innerHTML = renderTutorialStep(steps[current], current, steps.length);
    overlay.style.display = 'flex';

    overlay.querySelector('.btn-tutorial-next')?.addEventListener('click', () => {
      current++;
      if (current >= steps.length) { closeTutorial(); return; }
      renderStep();
    });
    overlay.querySelector('.btn-tutorial-skip')?.addEventListener('click', closeTutorial);
  }

  function closeTutorial() {
    overlay.style.display = 'none';
    overlay.innerHTML = '';
    markTutorialComplete();
  }

  renderStep();
}

/* ═══════════════════════════════════════════
   Achievements Screen
   ═══════════════════════════════════════════ */
function renderAchievementsScreen() {
  const el = document.getElementById('achievements-content');
  if (!el) return;
  const badges = getAllBadgesDefs();
  const earnedCount = badges.filter(b => b.earned).length;
  const title = L('🏆 غرفة الجوائز', '🏆 Trophy Room', '🏆 Sala de Troféus');
  const subtitle = L(`${earnedCount} من ${badges.length} شارة`, `${earnedCount} of ${badges.length} badges`, `${earnedCount} de ${badges.length} distintivos`);

  let html = `<div style="text-align:center;margin-bottom:16px">
    <div style="font-size:28px;font-weight:900">${title}</div>
    <div style="font-size:14px;color:#aaa;margin-top:4px">${subtitle}</div>
    <div style="margin-top:8px;height:6px;background:rgba(255,255,255,.1);border-radius:6px;overflow:hidden">
      <div style="height:100%;width:${Math.round(earnedCount/badges.length*100)}%;background:linear-gradient(90deg,#fbbf24,#f59e0b);border-radius:6px;transition:width .5s"></div>
    </div>
  </div>`;

  // C5: Badge progress map
  const badgeProgress = {
    explorer: { cur: Object.keys(progress.worlds || {}).length, max: 3 },
    grinder: { cur: progress.levelsCleared || 0, max: 20 },
    champion: { cur: progress.totalStars || 0, max: 100 },
    dailyFan: { cur: state.daily?.streak || 0, max: 3 },
    collector: { cur: state.cat?.unlockedSkins?.length || 1, max: 5 },
  };

  html += `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">`;
  for (const b of badges) {
    const bg = b.earned ? 'rgba(251,191,36,.15)' : 'rgba(255,255,255,.04)';
    const border = b.earned ? '#fbbf24' : 'rgba(255,255,255,.1)';
    const opacity = b.earned ? '1' : '.4';
    const prog = !b.earned && badgeProgress[b.id];
    const progHTML = prog ? `<div style="margin-top:3px;height:3px;background:rgba(255,255,255,.1);border-radius:3px;overflow:hidden"><div style="height:100%;width:${Math.min(100,Math.round(prog.cur/prog.max*100))}%;background:#fbbf24;border-radius:3px"></div></div><div style="font-size:8px;color:#666;margin-top:1px">${prog.cur}/${prog.max}</div>` : '';
    html += `<div style="padding:14px 8px;border-radius:14px;border:2px solid ${border};background:${bg};text-align:center;opacity:${opacity}">
      <div style="font-size:28px">${b.icon}</div>
      <div style="font-size:11px;font-weight:700;margin-top:4px;color:${b.earned ? '#fbbf24' : '#888'}">${b.label}</div>
      ${b.earned ? `<div style="font-size:10px;color:#43e97b;margin-top:2px">✅</div>` : `<div style="font-size:10px;color:#666;margin-top:2px">🔒</div>${progHTML}`}
    </div>`;
  }
  html += `</div>`;

  // Stats summary
  const totalStars = Object.values(progress.worlds || {}).reduce((s, w) => s + Object.values(w.levels || {}).reduce((ss, l) => ss + (l.stars || 0), 0), 0);
  html += `<div style="margin-top:16px;padding:12px;border-radius:12px;background:rgba(255,255,255,.06);text-align:center">
    <div style="font-size:14px;font-weight:700;margin-bottom:8px">${L('📊 الإحصائيات', '📊 Stats', '📊 Estatísticas')}</div>
    <div style="display:flex;justify-content:space-around;font-size:13px;color:#ccc">
      <span>⭐ ${totalStars}</span>
      <span>🎮 ${progress.levelsCleared || 0}</span>
      <span>🪙 ${progress.coins || 0}</span>
      <span>🏆 ${earnedCount}</span>
    </div>
  </div>`;

  el.innerHTML = html;
  showScreen('achievements');
}

/* ═══════════════════════════════════════════
   Cat Care Screen
   ═══════════════════════════════════════════ */
function renderCatCareScreen() {
  const el = document.getElementById('catcare-content');
  if (!el) return;
  const cat = state.cat;
  const emoji = getCatEmoji(cat);
  const stateData = CAT_STATES[cat.state] || CAT_STATES.idle;
  const { level, currentXP, xpForNext } = getCatLevel(cat.totalXP);

  const makeBar = (label, value, color) => `
    <div style="margin:6px 0">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#aaa;margin-bottom:3px">
        <span>${label}</span><span>${value}%</span>
      </div>
      <div style="height:8px;background:rgba(255,255,255,.1);border-radius:6px;overflow:hidden">
        <div style="height:100%;width:${value}%;background:${color};border-radius:6px;transition:width .4s"></div>
      </div>
    </div>`;

  let html = `<div style="text-align:center;margin-bottom:12px">
    <div style="font-size:28px;font-weight:900">${L('🐱 رعاية القطة', '🐱 Cat Care', '🐱 Cuidar do Gato')}</div>
  </div>`;

  // Cat display
  html += `<div style="text-align:center;padding:20px;border-radius:18px;background:rgba(255,255,255,.06);margin-bottom:12px">
    <div style="font-size:64px;animation:catBounce 1.5s infinite">${emoji}</div>
    <div style="font-size:24px;margin-top:4px">${stateData.emoji}</div>
    <div style="font-size:14px;color:#fbbf24;font-weight:700;margin-top:4px">${L('المستوى', 'Level', 'Nível')} ${level}</div>
    <div style="font-size:11px;color:#aaa;margin-top:2px">XP: ${currentXP}/${xpForNext}</div>
    <div style="height:6px;background:rgba(255,255,255,.1);border-radius:6px;overflow:hidden;margin-top:6px;max-width:200px;margin-inline:auto">
      <div style="height:100%;width:${Math.round(currentXP/xpForNext*100)}%;background:linear-gradient(90deg,#43e97b,#38f9d7);border-radius:6px"></div>
    </div>
  </div>`;

  // Stats bars
  html += `<div style="padding:14px;border-radius:14px;background:rgba(255,255,255,.06);margin-bottom:12px">
    ${makeBar(L('❤️ السعادة', '❤️ Happiness', '❤️ Felicidade'), cat.happiness, '#f5576c')}
    ${makeBar(L('🍖 الشبع', '🍖 Fullness', '🍖 Saciedade'), 100 - cat.hunger, '#fbbf24')}
    ${makeBar(L('⚡ الطاقة', '⚡ Energy', '⚡ Energia'), cat.energy, '#4facfe')}
    ${makeBar(L('🧠 الذكاء', '🧠 Intelligence', '🧠 Inteligência'), cat.intelligence, '#43e97b')}
  </div>`;

  // Action buttons
  html += `<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:12px">
    <button class="btn btn-small btn-primary" id="btn-feed-cat">${L('🍖 أطعم (5🪙)', '🍖 Feed (5🪙)', '🍖 Alimentar (5🪙)')}</button>
    <button class="btn btn-small btn-secondary" id="btn-play-cat">${L('🎾 العب (5🪙)', '🎾 Play (5🪙)', '🎾 Brincar (5🪙)')}</button>
  </div>`;

  // Equipped skin info
  const skin = SKINS.find(s => s.id === cat.equippedSkin) || SKINS[0];
  html += `<div style="padding:12px;border-radius:12px;background:rgba(255,255,255,.06);text-align:center">
    <div style="font-size:13px;color:#aaa;margin-bottom:4px">${L('🎨 الشكل الحالي', '🎨 Current Skin', '🎨 Skin Atual')}</div>
    <div style="font-size:36px">${skin.emoji}</div>
    <div style="font-size:12px;font-weight:700;color:#fbbf24">${skin.name()}</div>
    <div style="font-size:11px;color:#888;margin-top:4px">${L('الأشكال المفتوحة', 'Skins Unlocked', 'Skins Desbloqueadas')}: ${cat.unlockedSkins.length}/${SKINS.length}</div>
  </div>`;

  el.innerHTML = html;

  // Wire action buttons
  const btnFeed = document.getElementById('btn-feed-cat');
  if (btnFeed) btnFeed.addEventListener('click', () => {
    if (progress.coins < 5) { showToast(t.notEnough); sfxWrong(); return; }
    progress.coins -= 5; saveProgress();
    feedCat(state.cat);
    sfxEat();
    showToast(L('🍖 تم الإطعام! (-5 🪙)', '🍖 Fed! (-5 🪙)', '🍖 Alimentado! (-5 🪙)'));
    renderCatCareScreen();
  });
  const btnPlayCat = document.getElementById('btn-play-cat');
  if (btnPlayCat) btnPlayCat.addEventListener('click', () => {
    if (progress.coins < 5) { showToast(t.notEnough); sfxWrong(); return; }
    progress.coins -= 5; saveProgress();
    playCat(state.cat);
    sfxPurr();
    showToast(L('🎾 لعبت مع القطة! (-5 🪙)', '🎾 Played! (-5 🪙)', '🎾 Brincou! (-5 🪙)'));
    renderCatCareScreen();
  });

  showScreen('catcare');
}

/* ═══════════════════════════════════════════
   Leaderboard Screen (Local — per world)
   ═══════════════════════════════════════════ */
function renderLeaderboardScreen() {
  const el = document.getElementById('leaderboard-content');
  if (!el) return;

  let html = `<div style="text-align:center;margin-bottom:16px">
    <div style="font-size:28px;font-weight:900">${L('🏅 لوحة المتصدرين', '🏅 Leaderboard', '🏅 Placar')}</div>
    <div style="font-size:13px;color:#aaa;margin-top:4px">${L('أفضل أداء في كل عالم', 'Best performance per world', 'Melhor desempenho por mundo')}</div>
  </div>`;

  // Build per-world rankings
  const worldStats = [];
  for (const w of WORLDS) {
    const wData = progress.worlds[w.id];
    if (!wData) continue;
    const levels = wData.levels || {};
    const totalStars = Object.values(levels).reduce((s, l) => s + (l.stars || 0), 0);
    const totalScore = Object.values(levels).reduce((s, l) => s + (l.best || 0), 0);
    const cleared = Object.values(levels).filter(l => l.stars > 0).length;
    if (cleared === 0) continue;
    worldStats.push({ world: w, totalStars, totalScore, cleared });
  }

  // Sort by total stars then total score
  worldStats.sort((a, b) => b.totalStars - a.totalStars || b.totalScore - a.totalScore);

  if (worldStats.length === 0) {
    html += `<div style="text-align:center;padding:30px;color:#888">${L('لا توجد بيانات بعد — العب لتظهر نتائجك!','No data yet — play to see your results!','Sem dados — jogue para ver resultados!')}</div>`;
  } else {
    const medals = ['🥇','🥈','🥉'];
    worldStats.forEach((ws, idx) => {
      const medal = medals[idx] || `#${idx + 1}`;
      html += `<div style="display:flex;align-items:center;gap:10px;padding:12px;border-radius:14px;background:rgba(255,255,255,.06);margin-bottom:8px;border:1px solid ${idx < 3 ? 'rgba(251,191,36,.3)' : 'rgba(255,255,255,.08)'}">
        <div style="font-size:24px;min-width:36px;text-align:center">${medal}</div>
        <div style="font-size:28px">${ws.world.emoji}</div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700">${t['w' + ws.world.id]}</div>
          <div style="font-size:11px;color:#aaa">${ws.cleared}/10 ${L('مستويات','levels','níveis')}</div>
        </div>
        <div style="text-align:${LANG === 'ar' ? 'left' : 'right'}">
          <div style="font-size:14px;font-weight:700;color:#fbbf24">⭐ ${ws.totalStars}</div>
          <div style="font-size:11px;color:#43e97b">${ws.totalScore} ${L('نقطة','pts','pts')}</div>
        </div>
      </div>`;
    });
  }

  // Per-world best levels
  for (const ws of worldStats.slice(0, 3)) {
    const levels = progress.worlds[ws.world.id]?.levels || {};
    const bestLevels = Object.entries(levels)
      .filter(([, l]) => l.stars > 0)
      .sort(([, a], [, b]) => (b.best || 0) - (a.best || 0))
      .slice(0, 3);

    if (bestLevels.length > 0) {
      html += `<div style="margin-top:12px;padding:10px;border-radius:12px;background:rgba(255,255,255,.04)">
        <div style="font-size:13px;font-weight:700;margin-bottom:6px">${ws.world.emoji} ${L('أفضل المستويات','Top Levels','Melhores Níveis')}</div>`;
      for (const [lvl, data] of bestLevels) {
        html += `<div style="display:flex;justify-content:space-between;font-size:12px;color:#ccc;padding:3px 0">
          <span>${L('المستوى','Level','Nível')} ${lvl}</span>
          <span>${'⭐'.repeat(data.stars || 0)} — ${data.best || 0} ${L('نقطة','pts','pts')}</span>
        </div>`;
      }
      html += `</div>`;
    }
  }

  el.innerHTML = html;
  showScreen('leaderboard');
}

/* ═══════════════════════════════════════════
   C7: Smart Practice Mode
   ═══════════════════════════════════════════ */
function startPracticeMode() {
  const history = loadWrongHistory();
  if (history.length === 0) {
    showToast(L('لا أخطاء بعد! العب أولاً', 'No mistakes yet! Play first', 'Sem erros ainda! Jogue primeiro'));
    return;
  }
  // Deduplicate by question text, keep latest
  const seen = new Map();
  history.forEach(w => { if (w.options && w.answer != null) seen.set(w.q, w); });
  const unique = [...seen.values()];
  if (unique.length === 0) {
    showToast(L('لا أسئلة كافية', 'Not enough questions', 'Perguntas insuficientes'));
    return;
  }
  const practiceQs = unique.slice(-5).map(w => ({
    q: w.q,
    emoji: w.emoji || '📝',
    options: w.options,
    answer: w.answer,
  }));

  initGameState(practiceQs, 20, false);
  state.shieldActive = false;
  state.doubleScoreActive = false;
  state._isPracticeMode = true;
  renderGameplay();
}

/* ═══════════════════════════════════════════
   Toast
   ═══════════════════════════════════════════ */
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

/* ═══════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════ */
export function init() {
  applyDir();
  initAudio();
  initRenderer();

  // Load data
  progress = loadProgress();
  ensureProgressShape();
  state.cat = loadCat();
  state.dda = loadDDA();
  state.economy = loadEconomy();
  state.daily = loadDaily();
  state.challenge = loadChallenge();
  applyTimeDecay(state.cat);

  // Daily reward check
  checkDailyReward();

  // Wire up menu buttons
  document.getElementById('btn-play').addEventListener('click', () => {
    sfxClick();
    worldTransition(() => renderWorldMap());
  });

  document.getElementById('btn-mute').addEventListener('click', () => {
    const m = toggleMute();
    document.getElementById('btn-mute').textContent = m ? '🔇' : '🔊';
  });

  const btnStore = document.getElementById('btn-store');
  if (btnStore) {
    btnStore.addEventListener('click', () => {
      sfxClick();
      const tabContainer = document.getElementById('store-tabs');
      if (tabContainer) tabContainer.dataset.active = 'skins';
      renderStore();
    });
  }

  // Report button
  const btnReport = document.getElementById('btn-report');
  if (btnReport) {
    btnReport.addEventListener('click', () => {
      sfxClick();
      renderReportsScreen();
    });
  }

  // Store tab buttons
  const btnTabSkins = document.getElementById('tab-skins');
  const btnTabPowerups = document.getElementById('tab-powerups');
  if (btnTabSkins) {
    btnTabSkins.addEventListener('click', () => {
      const tc = document.getElementById('store-tabs');
      if (tc) tc.dataset.active = 'skins';
      btnTabSkins.classList.add('active');
      if (btnTabPowerups) btnTabPowerups.classList.remove('active');
      renderStore();
    });
  }
  if (btnTabPowerups) {
    btnTabPowerups.addEventListener('click', () => {
      const tc = document.getElementById('store-tabs');
      if (tc) tc.dataset.active = 'powerups';
      btnTabPowerups.classList.add('active');
      if (btnTabSkins) btnTabSkins.classList.remove('active');
      renderStore();
    });
  }

  // Back buttons
  document.querySelectorAll('[data-action="back-menu"]').forEach(b => {
    b.addEventListener('click', () => { sfxClick(); renderMenu(); });
  });
  document.querySelectorAll('[data-action="back-worldmap"]').forEach(b => {
    b.addEventListener('click', () => { sfxClick(); renderWorldMap(); });
  });
  document.querySelectorAll('[data-action="back-levels"]').forEach(b => {
    b.addEventListener('click', () => { sfxClick(); renderLevelSelect(); });
  });

  // Challenge button
  const btnChallenge = document.getElementById('btn-challenge');
  if (btnChallenge) {
    btnChallenge.addEventListener('click', () => { sfxClick(); renderChallengeScreen(); });
  }

  // Profile button
  const btnProfile = document.getElementById('btn-profile');
  if (btnProfile) {
    btnProfile.addEventListener('click', () => { sfxClick(); renderProfileScreen(); });
  }

  // Settings button (menu)
  const btnSettings = document.getElementById('btn-settings');
  if (btnSettings) {
    btnSettings.addEventListener('click', () => { sfxClick(); renderSettingsScreen(); });
  }

  // Achievements button
  const btnAchievements = document.getElementById('btn-achievements');
  if (btnAchievements) {
    btnAchievements.addEventListener('click', () => { sfxClick(); renderAchievementsScreen(); });
  }

  // Cat care button
  const btnCatcare = document.getElementById('btn-catcare');
  if (btnCatcare) {
    btnCatcare.addEventListener('click', () => { sfxClick(); renderCatCareScreen(); });
  }

  // Leaderboard button
  const btnLeaderboard = document.getElementById('btn-leaderboard');
  if (btnLeaderboard) {
    btnLeaderboard.addEventListener('click', () => { sfxClick(); renderLeaderboardScreen(); });
  }

  // C3: Pause button
  const btnPause = document.getElementById('btn-pause');
  if (btnPause) btnPause.addEventListener('click', () => pauseGame());
  const btnResume = document.getElementById('btn-resume');
  if (btnResume) btnResume.addEventListener('click', () => { sfxClick(); resumeGame(); });
  const btnQuitGame = document.getElementById('btn-quit-game');
  if (btnQuitGame) btnQuitGame.addEventListener('click', () => { sfxClick(); quitGame(); });

  // C7: Practice button
  const btnPractice = document.getElementById('btn-practice');
  if (btnPractice) {
    const hasHistory = loadWrongHistory().length > 0;
    btnPractice.style.display = hasHistory ? 'block' : 'none';
    btnPractice.textContent = L('📝 تدريب على الأخطاء', '📝 Practice Mistakes', '📝 Praticar Erros');
    btnPractice.addEventListener('click', () => { sfxClick(); startPracticeMode(); });
  }

  // Tutorial on first launch
  if (shouldShowTutorial()) {
    setTimeout(() => showTutorialOverlay(), 600);
  }

  // Render menu
  renderMenu();
}
