/* ═══════════════════════════════════════════════════════════════
   Ice Kingdom Academy — Core Engine 🎮
   State machine, daily bonus, power-ups, gameplay, postMessage
   ═══════════════════════════════════════════════════════════════ */

import { t, LANG, applyDir } from './i18n.js';
import { initAudio, toggleMute, isMuted, sfxCorrect, sfxWrong, sfxClick, sfxLevelUp, sfxWorldComplete, sfxBossAppear, sfxBossHit, sfxStar, sfxCountdown, sfxPenguinHappy, sfxPenguinSad, sfxIceCrack, sfxCoinCollect, sfxDailyBonus, sfxPowerUp, sfxFreeze, startAmbient, stopAmbient } from './audio.js';
import { WORLDS, getWorld, getLevelConfig, calcStars, DAILY_BONUS, POWER_UPS } from './worlds.js';
import { getQuestions } from './questions.js';
import { initRenderer, startParticles, stopParticles, burstAt, shake, flashCorrect, flashWrong, coinRain, revealStars, animateXPBar, frozenReveal, penguinBounce, updateTimerRing } from './renderer.js';
import { loadPenguin, getPenguin, getPenguinEmoji, addXP, reactCorrect, reactWrong, reactWorldComplete, feedPenguin, renderPenguinWidget, getAvailableSkins, buySkin, setSkin, getLevel as getPenguinLevel, getXP as getPenguinXP, getXPNeeded } from './penguin.js';
import { createTracker, trackAnswer, getStreakMessage, getNearMissMessage, checkMicroBadges, getSessionSummary, getMilestoneMessage, getComebackMessage } from './engagement.js';
import { loadDDA, saveDDA, updateDDA, getDDAModifier, getSkillLabel } from './intelligence.js';
import { getWorldIntro, markIntroSeen, isIntroSeen, getFunFact, getEncouragement } from './story.js';
import { generateReport, renderReportHTML } from './reports.js';

const STORAGE_KEY = 'icek_progress';
const $ = id => document.getElementById(id);
const LEVELS_PER_WORLD = 10;
const LEVELS_PER_LANE = 10;
const LANE_THEME_ROTATION = [
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
  const theme = LANE_THEME_ROTATION[(laneIndex - 1) % LANE_THEME_ROTATION.length];
  return {
    laneIndex,
    laneSlot,
    laneId: `${theme.id}-${laneIndex}`,
    laneIcon: theme.icon,
  };
}

function ensureProgressShape() {
  if (!state.progress || typeof state.progress !== 'object') {
    state.progress = defaultProgress();
  }
  if (!state.progress.worlds || typeof state.progress.worlds !== 'object') {
    state.progress.worlds = {};
  }
  if (!state.progress.powerUps || typeof state.progress.powerUps !== 'object') {
    state.progress.powerUps = { hint: 0, freeze: 0, double: 0, life: 0, shield: 0 };
  }
  if (!state.progress.dailyBonus || typeof state.progress.dailyBonus !== 'object') {
    state.progress.dailyBonus = { lastDate: null, streak: 0, totalClaimed: 0 };
  }
  if (!state.progress.laneRewards || typeof state.progress.laneRewards !== 'object') {
    state.progress.laneRewards = {};
  }
  if (!Number.isFinite(state.progress.laneRewardTotal)) {
    state.progress.laneRewardTotal = 0;
  }
}

/* ─── Game State ──────────────────── */
let state = {
  screen: 'menu',
  progress: null,
  currentWorld: 0,
  currentLevel: 0,
  questions: [],
  questionIdx: 0,
  correct: 0,
  total: 0,
  timer: null,
  timeLeft: 0,
  timeTotal: 0,
  coins: 0,
  tracker: null,
  powerUps: { hint: 0, freeze: 0, double: 0, life: 0, shield: 0 },
  doubleActive: false,
  frozen: false,
  shieldActive: false,
  lives: 3,
  startTime: 0,
  dda: null,
};

/* ─── Progress Persistence ──────── */
function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.progress = raw ? JSON.parse(raw) : defaultProgress();
  } catch { state.progress = defaultProgress(); }
  ensureProgressShape();
  state.coins = state.progress.coins || 0;
  state.powerUps = state.progress.powerUps || { hint: 0, freeze: 0, double: 0, life: 0, shield: 0 };
}

function defaultProgress() {
  return {
    worlds: {},
    coins: 0,
    totalCoins: 0,
    powerUps: { hint: 0, freeze: 0, double: 0, life: 0, shield: 0 },
    dailyBonus: { lastDate: null, streak: 0, totalClaimed: 0 },
    laneRewards: {},
    laneRewardTotal: 0,
    lastPlayDate: null,
    gamesPlayed: 0,
  };
}

function saveProgress() {
  if (!state.progress) return;
  ensureProgressShape();
  state.progress.coins = state.coins;
  state.progress.powerUps = state.powerUps;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
}

function getWorldProgress(wid) {
  if (!state.progress.worlds[wid]) state.progress.worlds[wid] = { levels: {}, completed: false };
  return state.progress.worlds[wid];
}

function getLevelStars(wid, lvl) {
  return getWorldProgress(wid).levels[lvl]?.stars || 0;
}

function setLevelStars(wid, lvl, stars) {
  const wp = getWorldProgress(wid);
  if (!wp.levels[lvl] || wp.levels[lvl].stars < stars) {
    wp.levels[lvl] = { stars, completed: true };
  }
  saveProgress();
}

function isWorldUnlocked(wid) {
  if (wid === 1) return true;
  const prev = getWorldProgress(wid - 1);
  return prev.completed || Object.keys(prev.levels).length >= 5;
}

function isLevelUnlocked(wid, lvl) {
  if (lvl === 1) return true;
  return getLevelStars(wid, lvl - 1) > 0;
}

/* ─── Daily Bonus ──────────────────── */
function checkDailyBonus() {
  const today = new Date().toDateString();
  const db = state.progress.dailyBonus;
  if (db.lastDate === today) return null; // already claimed

  const yesterday = new Date(Date.now() - 86400000).toDateString();
  let streak = db.lastDate === yesterday ? db.streak + 1 : 1;
  if (streak > DAILY_BONUS.maxStreak) streak = DAILY_BONUS.maxStreak;

  const bonus = DAILY_BONUS.baseCoins + (streak * DAILY_BONUS.streakMultiplier);
  const streakBonusExtra = DAILY_BONUS.streakBonus.find(s => s.day === streak);
  const totalBonus = bonus + (streakBonusExtra?.bonus || 0);

  return { streak, bonus: totalBonus, streakDay: streak };
}

function claimDailyBonus(bonusInfo) {
  const today = new Date().toDateString();
  state.progress.dailyBonus.lastDate = today;
  state.progress.dailyBonus.streak = bonusInfo.streak;
  state.progress.dailyBonus.totalClaimed++;
  state.coins += bonusInfo.bonus;
  state.progress.totalCoins += bonusInfo.bonus;
  saveProgress();
}

/* ─── Power-Ups ──────────────────── */
function buyPowerUp(type) {
  const cost = POWER_UPS[type]?.cost;
  if (!cost || state.coins < cost) return false;
  state.coins -= cost;
  state.powerUps[type] = (state.powerUps[type] || 0) + 1;
  saveProgress();
  return true;
}

function usePowerUp(type) {
  if (!state.powerUps[type] || state.powerUps[type] <= 0) return false;
  state.powerUps[type]--;
  saveProgress();
  return true;
}

/* ─── Screens ──────────────────────── */
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = $(`screen-${name}`);
  if (el) { el.classList.add('active'); frozenReveal(el); }
  state.screen = name;
}

/* ─── Menu Screen ──────────────────── */
function renderMenu() {
  const menuEl = $('screen-menu');
  const penguin = getPenguinEmoji();
  const bonus = checkDailyBonus();
  const skillLabel = state.dda ? getSkillLabel(state.dda) : '';
  
  menuEl.innerHTML = `
    <div class="icek-menu">
      <div class="icek-logo">
        <div class="icek-logo-emoji">${penguin}</div>
        <h1 class="icek-title">${t.title}</h1>
        <p class="icek-subtitle">${t.subtitle}</p>
        ${skillLabel ? `<div class="icek-skill-badge">${t.skillLevel}: ${skillLabel}</div>` : ''}
      </div>
      <div class="icek-coins-display">🪙 ${state.coins}</div>
      ${bonus ? `<button class="icek-btn icek-btn-bonus" id="btnDailyBonus">🎁 ${t.dailyBonus}</button>` : ''}
      <button class="icek-btn icek-btn-play" id="btnPlay">▶ ${t.play}</button>
      <div class="icek-menu-row">
        <button class="icek-btn icek-btn-sm" id="btnStore">🏪 ${t.store}</button>
        <button class="icek-btn icek-btn-sm" id="btnPenguin">${penguin} ${t.penguin}</button>
        <button class="icek-btn icek-btn-sm" id="btnReport">📊 ${t.viewReport}</button>
        <button class="icek-btn icek-btn-sm" id="btnMute">${isMuted() ? '🔇' : '🔊'}</button>
      </div>
    </div>
  `;

  $('btnPlay')?.addEventListener('click', () => { sfxClick(); showWorldMap(); });
  $('btnStore')?.addEventListener('click', () => { sfxClick(); showStore(); });
  $('btnPenguin')?.addEventListener('click', () => { sfxClick(); showPenguinScreen(); });
  $('btnReport')?.addEventListener('click', () => { sfxClick(); showReportScreen(); });
  $('btnMute')?.addEventListener('click', () => { toggleMute(); sfxClick(); renderMenu(); });
  $('btnDailyBonus')?.addEventListener('click', () => { sfxClick(); showDailyBonus(bonus); });

  showScreen('menu');
  startParticles('snow', '#ffffff');
}

/* ─── Daily Bonus Screen ──────────── */
function showDailyBonus(bonus) {
  const el = $('screen-dailybonus');
  el.innerHTML = `
    <div class="icek-daily-bonus">
      <h2>🎁 ${t.dailyBonus}</h2>
      <div class="icek-bonus-penguin">${getPenguinEmoji()}</div>
      <div class="icek-bonus-amount">
        <span class="icek-bonus-coins">🪙 +${bonus.bonus}</span>
      </div>
      <p class="icek-bonus-streak">${t.dailyStreak}: ${bonus.streak} ${t.days}</p>
      <button class="icek-btn icek-btn-bonus-claim" id="btnClaimBonus">${t.claim || 'Claim!'}</button>
    </div>
  `;

  $('btnClaimBonus').addEventListener('click', () => {
    sfxDailyBonus(); sfxCoinCollect();
    claimDailyBonus(bonus);
    coinRain(el, 25);
    setTimeout(() => renderMenu(), 2000);
  });

  showScreen('dailybonus');
}

/* ─── World Map ──────────────────── */
function showWorldMap() {
  const el = $('screen-worldmap');
  let html = `<div class="icek-world-map">
    <div class="icek-world-header">
      <button class="icek-btn-back" id="btnBackMenu">←</button>
      <h2>${t.worldMap || 'World Map'}</h2>
      <div class="icek-coins-display">🪙 ${state.coins}</div>
    </div>
    <div class="icek-worlds-grid">`;

  WORLDS.forEach(w => {
    const unlocked = isWorldUnlocked(w.id);
    const wp = getWorldProgress(w.id);
    const totalStars = Object.values(wp.levels || {}).reduce((s, l) => s + (l.stars || 0), 0);
    const levelsCompleted = Object.keys(wp.levels || {}).length;
    html += `
      <div class="icek-world-card ${unlocked ? '' : 'locked'}" data-world="${w.id}" style="background:${unlocked ? w.bg : '#555'}">
        <div class="icek-world-emoji">${w.emoji}</div>
        <div class="icek-world-name">${t['w' + w.id]}</div>
        <div class="icek-world-progress">⭐${totalStars}/30 | ${levelsCompleted}/10</div>
        ${!unlocked ? '<div class="icek-world-lock">🔒</div>' : ''}
      </div>`;
  });

  html += `</div></div>`;
  el.innerHTML = html;

  $('btnBackMenu').addEventListener('click', () => { sfxClick(); renderMenu(); });
  el.querySelectorAll('.icek-world-card:not(.locked)').forEach(card => {
    card.addEventListener('click', () => {
      sfxClick();
      state.currentWorld = parseInt(card.dataset.world);
      // Show story intro on first visit
      if (!isIntroSeen(state.currentWorld)) {
        showStoryIntro(state.currentWorld);
      } else {
        showLevelSelect();
      }
    });
  });

  showScreen('worldmap');
  stopParticles();
}

/* ─── Level Select ──────────────────── */
function showLevelSelect() {
  const el = $('screen-levels');
  const w = getWorld(state.currentWorld);
  const worldStartLane = getLaneInfo(w.id, 1);
  const worldEndLane = getLaneInfo(w.id, 10);
  let html = `<div class="icek-level-select" style="background:${w.bg}">
    <div class="icek-level-header">
      <button class="icek-btn-back" id="btnBackWorld">←</button>
      <h2>${w.emoji} ${t['w' + w.id]}</h2>
      <div class="icek-coins-display">🪙 ${state.coins}</div>
    </div>
    <p class="icek-level-subject">${t['ws' + w.id]}</p>
    <p class="icek-level-subject">${worldStartLane.laneIcon} L${worldStartLane.laneIndex} → ${worldEndLane.laneIcon} L${worldEndLane.laneIndex}</p>
    <div class="icek-levels-grid">`;

  for (let i = 1; i <= 10; i++) {
    const unlocked = isLevelUnlocked(w.id, i);
    const stars = getLevelStars(w.id, i);
    const isBoss = i === 10;
    const laneInfo = getLaneInfo(w.id, i);
    html += `
      <div class="icek-level-btn ${unlocked ? '' : 'locked'} ${isBoss ? 'boss' : ''}" data-level="${i}">
        <div class="icek-level-num">${isBoss ? '👑' : i}</div>
        <div class="icek-level-stars">${laneInfo.laneIcon} L${laneInfo.laneIndex}.${laneInfo.laneSlot}</div>
        <div class="icek-level-stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
        ${!unlocked ? '<div class="icek-level-lock">🔒</div>' : ''}
      </div>`;
  }

  html += `</div></div>`;
  el.innerHTML = html;

  $('btnBackWorld').addEventListener('click', () => { sfxClick(); showWorldMap(); });
  el.querySelectorAll('.icek-level-btn:not(.locked)').forEach(btn => {
    btn.addEventListener('click', () => {
      sfxClick();
      state.currentLevel = parseInt(btn.dataset.level);
      if (state.currentLevel === 10) showBossIntro();
      else startLevel();
    });
  });

  showScreen('levels');
  startParticles(w.particleType, w.particleColor);
  startAmbient(w.id);
}

/* ─── Boss Intro ──────────────────── */
function showBossIntro() {
  const el = $('screen-boss');
  const w = getWorld(state.currentWorld);
  sfxBossAppear();
  el.innerHTML = `
    <div class="icek-boss-intro" style="background:${w.bg}">
      <div class="icek-boss-emoji">👑</div>
      <h2>${t['b' + w.id]}</h2>
      <p>${t.bossChallenge || 'Boss Challenge!'}</p>
      <div class="icek-boss-rules">
        <span>❓ 15 ${t.questions || 'questions'}</span>
        <span>⏱️ 8s</span>
        <span>⭐ 85%</span>
      </div>
      <button class="icek-btn icek-btn-play" id="btnStartBoss">⚔️ ${t.fight || 'Fight!'}</button>
    </div>
  `;

  $('btnStartBoss').addEventListener('click', () => { sfxClick(); startLevel(); });
  showScreen('boss');
}

/* ─── Gameplay ──────────────────── */
function startLevel() {
  const w = getWorld(state.currentWorld);
  const cfg = getLevelConfig(state.currentWorld, state.currentLevel);

  // Apply DDA adjustments
  const ddaMod = state.dda ? getDDAModifier(state.dda, w.subject) : null;
  if (ddaMod) {
    cfg.totalQuestions = Math.max(5, Math.min(18, cfg.totalQuestions + ddaMod.questionAdjust));
    cfg.timePerQuestion = Math.max(5, Math.min(25, cfg.timePerQuestion + ddaMod.timeAdjust));
  }

  state.questions = getQuestions(w.subject, cfg.totalQuestions);
  state.questionIdx = 0;
  state.correct = 0;
  state.total = cfg.totalQuestions;
  state.lives = 3;
  state.doubleActive = false;
  state.frozen = false;
  state.shieldActive = false;
  state.startTime = Date.now();
  state.tracker = createTracker();

  renderGameplay(cfg);
  showScreen('gameplay');
  startAmbient(w.id);
}

function renderGameplay(cfg) {
  const el = $('screen-gameplay');
  const laneInfo = getLaneInfo(state.currentWorld, state.currentLevel);
  el.innerHTML = `
    <div class="icek-gameplay">
      <div class="icek-game-hud">
        <div class="icek-hud-left">
          <button class="icek-btn-back icek-btn-sm" id="btnQuit">✕</button>
          <span class="icek-hud-level">${t['w' + state.currentWorld]} L${state.currentLevel} • ${laneInfo.laneIcon} L${laneInfo.laneIndex}.${laneInfo.laneSlot}</span>
        </div>
        <div class="icek-hud-center">
          <svg class="icek-timer-ring" viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="22" fill="none" stroke="#333" stroke-width="3"/>
            <circle cx="25" cy="25" r="22" fill="none" stroke="#44ff88" stroke-width="3" id="timerRingCircle"
              stroke-dasharray="${2 * Math.PI * 22}" stroke-dashoffset="0" stroke-linecap="round"
              transform="rotate(-90 25 25)" style="transition:stroke 0.3s"/>
          </svg>
          <span class="icek-timer-text" id="timerText"></span>
        </div>
        <div class="icek-hud-right">
          <span id="hudScore">0/${state.total}</span>
          <span id="hudLives">${'❤️'.repeat(state.lives)}</span>
        </div>
      </div>
      <div class="icek-power-bar" id="powerBar"></div>
      <div class="icek-question-area" id="questionArea"></div>
      <div class="icek-penguin-mini" id="penguinMini">${getPenguinEmoji()}</div>
      <div class="icek-streak-msg" id="streakMsg"></div>
    </div>
  `;

  $('btnQuit')?.addEventListener('click', () => { sfxClick(); clearTimer(); showLevelSelect(); });
  renderPowerBar();
  showQuestion(cfg);
}

function renderPowerBar() {
  const bar = $('powerBar');
  if (!bar) return;
  const ddaMod = state.dda ? getDDAModifier(state.dda, getWorld(state.currentWorld)?.subject) : null;
  const diffLabel = ddaMod ? ddaMod.difficultyLabel : '';
  bar.innerHTML = `
    ${diffLabel ? `<span class="icek-dda-label">${t.difficulty}: ${diffLabel}</span>` : ''}
    <button class="icek-power-btn" data-power="hint" title="${t.powerHint || 'Hint'}">💡 ${state.powerUps.hint}</button>
    <button class="icek-power-btn" data-power="freeze" title="${t.powerFreeze || 'Freeze'}">🧊 ${state.powerUps.freeze}</button>
    <button class="icek-power-btn" data-power="double" title="${t.powerDouble || 'Double'}">✖️2 ${state.powerUps.double}</button>
    <button class="icek-power-btn" data-power="life" title="${t.powerLife || 'Life'}">❤️ ${state.powerUps.life}</button>
    <button class="icek-power-btn" data-power="shield" title="${t.powerShield || 'Shield'}">🛡️ ${state.powerUps.shield}</button>
    ${state.shieldActive ? `<span class="icek-shield-indicator">🛡️</span>` : ''}
  `;
  bar.querySelectorAll('.icek-power-btn').forEach(btn => {
    btn.addEventListener('click', () => handlePowerUp(btn.dataset.power));
  });
}

function handlePowerUp(type) {
  if (!usePowerUp(type)) return;
  sfxPowerUp();

  switch (type) {
    case 'hint': {
      const q = state.questions[state.questionIdx];
      const btns = document.querySelectorAll('.icek-option-btn');
      let removed = 0;
      btns.forEach(btn => {
        if (parseInt(btn.dataset.idx) !== q.answer && removed < 2) {
          btn.style.opacity = '0.2';
          btn.disabled = true;
          removed++;
        }
      });
      break;
    }
    case 'freeze': {
      state.frozen = true;
      sfxFreeze();
      const timerText = $('timerText');
      if (timerText) timerText.style.color = '#00ddff';
      setTimeout(() => { state.frozen = false; if (timerText) timerText.style.color = ''; }, 5000);
      break;
    }
    case 'double':
      state.doubleActive = true;
      break;
    case 'life':
      state.lives = Math.min(5, state.lives + 1);
      $('hudLives').textContent = '❤️'.repeat(state.lives);
      break;
    case 'shield':
      state.shieldActive = true;
      showMilestoneToast(t.shieldActive || 'Shield Active! 🛡️');
      break;
  }
  renderPowerBar();
}

function showQuestion(cfg) {
  if (state.questionIdx >= state.questions.length) {
    endLevel(cfg);
    return;
  }

  const q = state.questions[state.questionIdx];
  const area = $('questionArea');
  const isTF = q.type === 'tf';

  area.innerHTML = `
    <div class="icek-question">
      <div class="icek-q-emoji">${q.emoji}</div>
      <div class="icek-q-text">${q.q}</div>
      <div class="icek-q-number">${state.questionIdx + 1}/${state.total}</div>
    </div>
    <div class="icek-options ${isTF ? 'icek-options-tf' : ''}">
      ${q.options.map((o, i) => `<button class="icek-option-btn" data-idx="${i}">${o}</button>`).join('')}
    </div>
  `;

  area.querySelectorAll('.icek-option-btn').forEach(btn => {
    btn.addEventListener('click', () => handleAnswer(parseInt(btn.dataset.idx), cfg, btn));
  });

  // Timer
  state.timeLeft = cfg.timePerQuestion;
  state.timeTotal = cfg.timePerQuestion;
  updateTimer();
  startTimer(cfg);
}

function startTimer(cfg) {
  clearTimer();
  state.timer = setInterval(() => {
    if (state.frozen) return;
    state.timeLeft -= 0.1;
    updateTimer();
    if (state.timeLeft <= 3 && state.timeLeft > 0) sfxCountdown();
    if (state.timeLeft <= 0) {
      clearTimer();
      handleTimeout(cfg);
    }
  }, 100);
}

function clearTimer() {
  if (state.timer) { clearInterval(state.timer); state.timer = null; }
}

function updateTimer() {
  const txt = $('timerText');
  const ring = $('timerRingCircle');
  if (txt) txt.textContent = Math.ceil(Math.max(0, state.timeLeft));
  if (ring) updateTimerRing(ring, state.timeLeft / state.timeTotal);
}

function handleTimeout(cfg) {
  state.lives--;
  $('hudLives').textContent = '❤️'.repeat(Math.max(0, state.lives));
  trackAnswer(state.tracker, false, state.questions[state.questionIdx]);
  sfxWrong();
  reactWrong();

  if (state.lives <= 0) {
    endLevel(cfg);
    return;
  }

  state.questionIdx++;
  showQuestion(cfg);
}

function handleAnswer(idx, cfg, btn) {
  clearTimer();
  const q = state.questions[state.questionIdx];
  const correct = idx === q.answer;

  // Disable all buttons
  document.querySelectorAll('.icek-option-btn').forEach(b => b.disabled = true);

  // Highlight correct/wrong
  btn.classList.add(correct ? 'correct' : 'wrong');
  if (!correct) {
    document.querySelector(`.icek-option-btn[data-idx="${q.answer}"]`)?.classList.add('correct');
  }

  if (correct) {
    const points = state.doubleActive ? 2 : 1;
    state.correct += points;
    state.doubleActive = false;
    sfxCorrect();
    reactCorrect();
    flashCorrect(btn);
    burstAt(btn.getBoundingClientRect().x + btn.offsetWidth / 2, btn.getBoundingClientRect().y, '#44ff88', 10);
    penguinBounce($('penguinMini'));
  } else {
    state.lives--;
    $('hudLives').textContent = '❤️'.repeat(Math.max(0, state.lives));
    sfxWrong();
    reactWrong();
    flashWrong(btn);
    shake($('questionArea'));
  }

  trackAnswer(state.tracker, correct, q);
  $('hudScore').textContent = `${state.correct}/${state.total}`;

  // Streak message
  const streakMsg = getStreakMessage(state.tracker);
  const nearMiss = getNearMissMessage(state.tracker);
  const msg = streakMsg || nearMiss;
  if (msg) {
    const msgEl = $('streakMsg');
    if (msgEl) { msgEl.textContent = msg; msgEl.classList.add('show'); setTimeout(() => msgEl.classList.remove('show'), 1500); }
  }

  // Check badges
  const newBadges = checkMicroBadges(state.tracker);
  if (newBadges.length > 0) showBadgeToast(newBadges[0]);

  // Check milestone
  const milestone = getMilestoneMessage(state.tracker);
  if (milestone) showMilestoneToast(milestone);

  // Next question or end
  setTimeout(() => {
    if (state.lives <= 0) { endLevel(cfg); return; }
    state.questionIdx++;
    showQuestion(cfg);
  }, 800);
}

function showBadgeToast(badge) {
  const toast = document.createElement('div');
  toast.className = 'icek-badge-toast';
  toast.innerHTML = `<span>${badge.emoji}</span><span>${badge.name}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 50);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 2500);
}

function showMilestoneToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'icek-milestone-toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 50);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 2500);
}

/* ─── Level End / Results ──────────── */
function endLevel(cfg) {
  clearTimer();
  stopAmbient();

  ensureProgressShape();
  const timeElapsed = Math.floor((Date.now() - state.startTime) / 1000);
  const effectiveCorrect = Math.min(state.correct, state.total);
  const stars = calcStars(effectiveCorrect, state.total, timeElapsed, cfg.timePerQuestion * state.total);
  const passed = stars > 0;
  const isBoss = state.currentLevel === 10;
  const laneInfo = getLaneInfo(state.currentWorld, state.currentLevel);

  // Award coins and XP
  let coinsEarned = 0;
  let xpEarned = 0;
  let laneBonusCoins = 0;
  let laneBonusHints = 0;
  let laneRewardMessage = '';
  if (passed) {
    coinsEarned = cfg.coinReward * stars;
    xpEarned = cfg.xpReward;
    state.coins += coinsEarned;
    sfxLevelUp();
    if (stars === 3) sfxStar();
    if (isBoss) { sfxWorldComplete(); sfxBossHit(); state.tracker.bossesDefeated++; }

    // Save stars
    setLevelStars(state.currentWorld, state.currentLevel, stars);

    // Check if world completed
    if (isBoss && stars > 0) {
      getWorldProgress(state.currentWorld).completed = true;
      state.tracker.worldsCompleted++;
      reactWorldComplete();
    }

    // Perfect level
    if (effectiveCorrect === state.total) state.tracker.perfectLevels++;

    // Lane completion reward (claimed once per lane).
    if (laneInfo.laneSlot === LEVELS_PER_LANE && !state.progress.laneRewards[laneInfo.laneId]) {
      const milestoneLane = laneInfo.laneIndex % 5 === 0;
      laneBonusCoins = milestoneLane ? 140 : 60;
      laneBonusHints = milestoneLane ? 2 : 1;
      state.progress.laneRewards[laneInfo.laneId] = {
        laneIndex: laneInfo.laneIndex,
        laneId: laneInfo.laneId,
        claimedAt: Date.now(),
        coins: laneBonusCoins,
        hints: laneBonusHints,
      };
      state.progress.laneRewardTotal = (state.progress.laneRewardTotal || 0) + laneBonusCoins;
      state.coins += laneBonusCoins;
      state.powerUps.hint = (state.powerUps.hint || 0) + laneBonusHints;
      laneRewardMessage = milestoneLane
        ? `${laneInfo.laneIcon} Lane ${laneInfo.laneIndex} milestone: +${laneBonusCoins} 🪙, +${laneBonusHints} 💡`
        : `${laneInfo.laneIcon} Lane ${laneInfo.laneIndex} complete: +${laneBonusCoins} 🪙, +${laneBonusHints} 💡`;
      showMilestoneToast(laneRewardMessage);
    }

    saveProgress();
  } else {
    sfxPenguinSad();
  }

  // Add XP to penguin
  const xpResult = addXP(xpEarned);

  // PostMessage for platform
  try {
    const score = Math.round((effectiveCorrect / state.total) * 100);
    window.parent.postMessage({
      type: 'GAME_COMPLETE',
      score,
      total: 100,
      level: state.currentLevel,
      world: state.currentWorld,
      stars,
      timeElapsed,
    }, '*');
  } catch (e) { /* iframe error ignored */ }

  // Render results
  const el = $('screen-results');
  const w = getWorld(state.currentWorld);
  const summary = getSessionSummary(state.tracker);

  el.innerHTML = `
    <div class="icek-results" style="background:${w.bg}">
      <div class="icek-results-emoji">${passed ? (isBoss ? '👑' : '🎉') : '😢'}</div>
      <h2>${passed ? (t.levelComplete || 'Level Complete!') : (t.tryAgain || 'Try Again!')}</h2>
      <div class="icek-results-stars">
        ${[1,2,3].map(i => `<span class="icek-star ${i <= stars ? 'icek-star-earned' : ''}">${i <= stars ? '⭐' : '☆'}</span>`).join('')}
      </div>
      <div class="icek-results-stats">
        <div class="icek-stat"><span>${t.correct || 'Correct'}</span><span>${effectiveCorrect}/${state.total}</span></div>
        <div class="icek-stat"><span>${t.accuracy || 'Accuracy'}</span><span>${summary.accuracy}%</span></div>
        <div class="icek-stat"><span>${t.time || 'Time'}</span><span>${summary.time}</span></div>
        <div class="icek-stat"><span>${t.bestStreak || 'Streak'}</span><span>${summary.maxStreak}</span></div>
        ${passed ? `<div class="icek-stat highlight"><span>🪙 ${t.coins}</span><span>+${coinsEarned}</span></div>` : ''}
        ${xpEarned > 0 ? `<div class="icek-stat highlight"><span>⭐ XP</span><span>+${xpEarned}</span></div>` : ''}
      </div>
      ${xpResult.leveledUp ? `<div class="icek-level-up">🎉 ${t.levelUp || 'Level Up!'} → Lv.${xpResult.newLevel}</div>` : ''}
      <div class="icek-results-msg">${summary.message}</div>
      ${laneRewardMessage ? `<div class="icek-results-msg">${laneRewardMessage}</div>` : ''}
      <div class="icek-results-btns">
        ${passed ? `<button class="icek-btn icek-btn-play" id="btnNextLevel">▶ ${t.next || 'Next'}</button>` : ''}
        <button class="icek-btn" id="btnRetry">🔄 ${t.retry || 'Retry'}</button>
        <button class="icek-btn icek-btn-sm" id="btnBackLevels">← ${t.levels || 'Levels'}</button>
      </div>
    </div>
  `;

  if (passed) {
    coinRain(el, coinsEarned > 20 ? 20 : coinsEarned);
    $('btnNextLevel')?.addEventListener('click', () => {
      sfxClick();
      if (state.currentLevel < 10) { state.currentLevel++; startLevel(); }
      else showWorldMap();
    });
  }
  $('btnRetry')?.addEventListener('click', () => { sfxClick(); startLevel(); });
  $('btnBackLevels')?.addEventListener('click', () => { sfxClick(); showLevelSelect(); });

  showScreen('results');
}

/* ─── Store Screen ──────────────────── */
function showStore() {
  const el = $('screen-store');
  const skins = getAvailableSkins();

  el.innerHTML = `
    <div class="icek-store">
      <div class="icek-store-header">
        <button class="icek-btn-back" id="btnBackStore">←</button>
        <h2>🏪 ${t.store}</h2>
        <div class="icek-coins-display">🪙 ${state.coins}</div>
      </div>
      <h3>${t.powerHint || 'Power-Ups'}</h3>
      <div class="icek-store-powerups">
        ${Object.entries(POWER_UPS).map(([key, val]) => `
          <div class="icek-store-item">
            <span class="icek-store-icon">${key === 'hint' ? '💡' : key === 'freeze' ? '🧊' : key === 'double' ? '✖️2' : '❤️'}</span>
            <span>${t['power' + key.charAt(0).toUpperCase() + key.slice(1)] || key}</span>
            <span class="icek-store-owned">${state.powerUps[key] || 0}</span>
            <button class="icek-btn icek-btn-buy" data-buy="power_${key}" ${state.coins < val.cost ? 'disabled' : ''}>🪙 ${val.cost}</button>
          </div>
        `).join('')}
      </div>
      <h3>🐧 ${t.penguinSkins?.[0] || 'Skins'}</h3>
      <div class="icek-store-skins">
        ${skins.map(s => `
          <div class="icek-store-skin ${s.active ? 'active' : ''} ${s.owned ? 'owned' : ''}">
            <span class="icek-skin-emoji">${s.emoji}</span>
            <span>${s.label}</span>
            <span>Lv.${s.level}</span>
            ${s.owned ? (s.active ? '<span class="icek-skin-badge">✓</span>' : `<button class="icek-btn icek-btn-sm" data-use-skin="${s.id}">Use</button>`)
              : s.canBuy ? `<button class="icek-btn icek-btn-buy" data-buy="skin_${s.id}" ${state.coins < s.cost ? 'disabled' : ''}>🪙 ${s.cost}</button>`
              : '<span class="icek-skin-lock">🔒</span>'}
          </div>
        `).join('')}
      </div>
    </div>
  `;

  $('btnBackStore').addEventListener('click', () => { sfxClick(); renderMenu(); });

  // Buy power-ups
  el.querySelectorAll('[data-buy^="power_"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.buy.replace('power_', '');
      if (buyPowerUp(type)) { sfxCoinCollect(); showStore(); }
    });
  });

  // Buy skins
  el.querySelectorAll('[data-buy^="skin_"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const skinId = btn.dataset.buy.replace('skin_', '');
      const result = buySkin(skinId, state.coins);
      if (result.success) { state.coins -= result.cost; saveProgress(); sfxCoinCollect(); showStore(); }
    });
  });

  // Use skins
  el.querySelectorAll('[data-use-skin]').forEach(btn => {
    btn.addEventListener('click', () => {
      setSkin(btn.dataset.useSkin);
      sfxClick();
      showStore();
    });
  });

  showScreen('store');
}

/* ─── Penguin Screen ──────────────── */
function showPenguinScreen() {
  const el = $('screen-penguin');
  const container = document.createElement('div');
  container.className = 'icek-penguin-screen';
  
  const p = getPenguin();
  const xpNeeded = getXPNeeded();
  const xpPct = Math.floor((getPenguinXP() / xpNeeded) * 100);

  el.innerHTML = `
    <div class="icek-penguin-screen">
      <div class="icek-penguin-header">
        <button class="icek-btn-back" id="btnBackPenguin">←</button>
        <h2>🐧 ${t.penguin}</h2>
      </div>
      <div class="icek-penguin-display">
        <div class="icek-penguin-big" id="penguinBig">${getPenguinEmoji()}</div>
        <div class="icek-penguin-level">Lv.${getPenguinLevel()}</div>
        <div class="icek-penguin-xp-bar-big">
          <div class="icek-penguin-xp-fill-big" style="width:${xpPct}%"></div>
          <span>${getPenguinXP()}/${xpNeeded} XP</span>
        </div>
      </div>
      <div class="icek-penguin-stats-big">
        <div class="icek-pstat">😊 ${p.stats.happiness}</div>
        <div class="icek-pstat">⚡ ${p.stats.energy}</div>
        <div class="icek-pstat">🍽️ ${p.stats.hunger}</div>
        <div class="icek-pstat">📚 ${p.stats.knowledge}</div>
      </div>
      <div class="icek-penguin-actions">
        <button class="icek-btn" id="btnFeed">🍽️ ${t.feed || 'Feed'}</button>
        <button class="icek-btn" id="btnPet">💖 ${t.pet || 'Pet'}</button>
      </div>
    </div>
  `;

  $('btnBackPenguin').addEventListener('click', () => { sfxClick(); renderMenu(); });
  $('btnFeed')?.addEventListener('click', () => { feedPenguin(); sfxPenguinHappy(); penguinBounce($('penguinBig')); showPenguinScreen(); });
  $('btnPet')?.addEventListener('click', () => { import('./penguin.js').then(m => m.playWithPenguin()); sfxPenguinHappy(); penguinBounce($('penguinBig')); });

  showScreen('penguin');
}

/* ─── Init ──────────────────────── */
export function init() {
  applyDir();
  initAudio();
  loadPenguin();
  loadProgress();

  const canvas = $('particleCanvas');
  if (canvas) initRenderer(canvas);

  // Check comeback message
  if (state.progress.lastPlayDate) {
    const days = Math.floor((Date.now() - new Date(state.progress.lastPlayDate).getTime()) / 86400000);
    const comeback = getComebackMessage(days);
    if (comeback) {
      setTimeout(() => showMilestoneToast(comeback), 1000);
    }
  }
  state.progress.lastPlayDate = new Date().toISOString();
  state.progress.gamesPlayed++;
  saveProgress();

  renderMenu();
}
