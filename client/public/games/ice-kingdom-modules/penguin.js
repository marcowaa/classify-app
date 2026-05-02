/* ═══════════════════════════════════════════════════════════════
   Ice Kingdom Academy — Penguin Pet System 🐧
   15 skins, leveling, states, stats, persistence
   ═══════════════════════════════════════════════════════════════ */

import { t } from './i18n.js';

const STORAGE_KEY = 'icek_penguin';

/* ─── Skins ──────────────────────── */
export const SKINS = [
  { id: 'penguin',    emoji: '🐧', cost: 0,   level: 1,  label: () => t.penguinSkins?.[0]  || 'Penguin' },
  { id: 'emperor',    emoji: '🐧', cost: 50,  level: 2,  label: () => t.penguinSkins?.[1]  || 'Emperor' },
  { id: 'rockhopper', emoji: '🐧', cost: 80,  level: 3,  label: () => t.penguinSkins?.[2]  || 'Rockhopper' },
  { id: 'fairy',      emoji: '🧊', cost: 100, level: 4,  label: () => t.penguinSkins?.[3]  || 'Fairy' },
  { id: 'polar_bear', emoji: '🐻‍❄️', cost: 120, level: 5, label: () => t.penguinSkins?.[4]  || 'Polar Bear' },
  { id: 'seal',       emoji: '🦭', cost: 150, level: 6,  label: () => t.penguinSkins?.[5]  || 'Seal' },
  { id: 'walrus',     emoji: '🦭', cost: 180, level: 7,  label: () => t.penguinSkins?.[6]  || 'Walrus' },
  { id: 'arctic_fox', emoji: '🦊', cost: 200, level: 8,  label: () => t.penguinSkins?.[7]  || 'Arctic Fox' },
  { id: 'snowy_owl',  emoji: '🦉', cost: 250, level: 9,  label: () => t.penguinSkins?.[8]  || 'Snowy Owl' },
  { id: 'narwhal',    emoji: '🐳', cost: 300, level: 10, label: () => t.penguinSkins?.[9]  || 'Narwhal' },
  { id: 'orca',       emoji: '🐋', cost: 350, level: 12, label: () => t.penguinSkins?.[10] || 'Orca' },
  { id: 'mammoth',    emoji: '🦣', cost: 400, level: 14, label: () => t.penguinSkins?.[11] || 'Mammoth' },
  { id: 'yeti',       emoji: '👹', cost: 500, level: 16, label: () => t.penguinSkins?.[12] || 'Yeti' },
  { id: 'ice_dragon', emoji: '🐉', cost: 750, level: 18, label: () => t.penguinSkins?.[13] || 'Ice Dragon' },
  { id: 'crystal',    emoji: '💎', cost: 1000,level: 20, label: () => t.penguinSkins?.[14] || 'Crystal' },
];

/* ─── States ──────────────────────── */
const STATES = {
  idle:    { anim: '', msg: () => t.penguinIdle    || '...' },
  happy:   { anim: 'icek-penguin-bounce', msg: () => t.penguinHappy   || '😊' },
  excited: { anim: 'icek-penguin-bounce', msg: () => t.penguinExcited || '🎉' },
  sad:     { anim: 'icek-penguin-sad',    msg: () => t.penguinSad     || '😢' },
  sleep:   { anim: '',                    msg: () => t.penguinSleep   || '💤' },
  hungry:  { anim: 'icek-penguin-sad',    msg: () => t.penguinHungry  || '🍽️' },
  dance:   { anim: 'icek-penguin-dance',  msg: () => t.penguinDance   || '💃' },
  study:   { anim: '',                    msg: () => t.penguinStudy   || '📚' },
};

/* ─── XP Curve ──────────────────────── */
function xpForLevel(lvl) { return Math.floor(50 * Math.pow(1.5, lvl - 1)); }

/* ─── Default Data ──────────────────── */
function defaultPenguin() {
  return {
    name: '',
    skin: 'penguin',
    level: 1,
    xp: 0,
    totalXp: 0,
    state: 'idle',
    stats: { happiness: 80, energy: 100, hunger: 80, knowledge: 0 },
    unlockedSkins: ['penguin'],
    lastFed: Date.now(),
  };
}

/* ─── State ──────────────────────── */
let data = null;

export function loadPenguin() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    data = raw ? { ...defaultPenguin(), ...JSON.parse(raw) } : defaultPenguin();
  } catch { data = defaultPenguin(); }
  decayStats();
  return data;
}

function save() {
  if (data) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ─── Stats Decay ──────────────────── */
function decayStats() {
  if (!data) return;
  const hours = (Date.now() - (data.lastFed || Date.now())) / 3600000;
  if (hours > 1) {
    data.stats.happiness = Math.max(20, data.stats.happiness - Math.floor(hours * 2));
    data.stats.energy = Math.max(10, data.stats.energy - Math.floor(hours * 3));
    data.stats.hunger = Math.max(10, data.stats.hunger - Math.floor(hours * 4));
  }
  updateState();
  save();
}

function updateState() {
  if (!data) return;
  const s = data.stats;
  if (s.hunger < 30) data.state = 'hungry';
  else if (s.energy < 20) data.state = 'sleep';
  else if (s.happiness > 80) data.state = 'happy';
  else data.state = 'idle';
}

/* ─── Public API ──────────────────── */
export function getPenguin() { return data; }

export function getPenguinEmoji() {
  if (!data) return '🐧';
  const skin = SKINS.find(s => s.id === data.skin);
  return skin ? skin.emoji : '🐧';
}

export function getPenguinState() {
  if (!data) return STATES.idle;
  return STATES[data.state] || STATES.idle;
}

export function getLevel() { return data?.level || 1; }
export function getXP() { return data?.xp || 0; }
export function getXPNeeded() { return xpForLevel(data?.level || 1); }

export function addXP(amount) {
  if (!data) return { leveledUp: false };
  data.xp += amount;
  data.totalXp += amount;
  data.stats.knowledge += Math.floor(amount / 5);
  let leveledUp = false;
  while (data.xp >= xpForLevel(data.level)) {
    data.xp -= xpForLevel(data.level);
    data.level++;
    leveledUp = true;
  }
  if (leveledUp) data.state = 'excited';
  save();
  return { leveledUp, newLevel: data.level };
}

export function feedPenguin() {
  if (!data) return;
  data.stats.hunger = Math.min(100, data.stats.hunger + 30);
  data.stats.happiness = Math.min(100, data.stats.happiness + 10);
  data.stats.energy = Math.min(100, data.stats.energy + 15);
  data.lastFed = Date.now();
  data.state = 'happy';
  save();
}

export function playWithPenguin() {
  if (!data) return;
  data.stats.happiness = Math.min(100, data.stats.happiness + 20);
  data.stats.energy = Math.max(0, data.stats.energy - 10);
  data.state = 'dance';
  save();
  setTimeout(() => { if (data) { updateState(); save(); } }, 3000);
}

export function setSkin(skinId) {
  if (!data) return false;
  if (!data.unlockedSkins.includes(skinId)) return false;
  data.skin = skinId;
  save();
  return true;
}

export function buySkin(skinId, coins) {
  if (!data) return { success: false, reason: 'no_data' };
  const skin = SKINS.find(s => s.id === skinId);
  if (!skin) return { success: false, reason: 'not_found' };
  if (data.unlockedSkins.includes(skinId)) return { success: false, reason: 'already_owned' };
  if (data.level < skin.level) return { success: false, reason: 'level_low' };
  if (coins < skin.cost) return { success: false, reason: 'no_coins' };
  data.unlockedSkins.push(skinId);
  data.skin = skinId;
  save();
  return { success: true, cost: skin.cost };
}

export function getAvailableSkins() {
  if (!data) return [];
  return SKINS.map(s => ({
    ...s,
    label: s.label(),
    owned: data.unlockedSkins.includes(s.id),
    canBuy: !data.unlockedSkins.includes(s.id) && data.level >= s.level,
    active: data.skin === s.id,
  }));
}

export function setName(name) {
  if (!data) return;
  data.name = name.slice(0, 20);
  save();
}

export function getPenguinName() { return data?.name || ''; }

/* ─── Mood Reactions ──────────────── */
export function reactCorrect() {
  if (!data) return;
  data.stats.happiness = Math.min(100, data.stats.happiness + 3);
  data.state = 'happy';
  save();
}

export function reactWrong() {
  if (!data) return;
  data.stats.happiness = Math.max(20, data.stats.happiness - 2);
  data.state = 'sad';
  save();
  setTimeout(() => { if (data) { updateState(); save(); } }, 2000);
}

export function reactWorldComplete() {
  if (!data) return;
  data.stats.happiness = 100;
  data.stats.energy = Math.min(100, data.stats.energy + 20);
  data.state = 'dance';
  save();
}

/* ─── Render Penguin Widget ──────── */
export function renderPenguinWidget(container) {
  if (!data) loadPenguin();
  const st = getPenguinState();
  const emoji = getPenguinEmoji();
  const name = data.name || t.penguin || '🐧';
  const xpNeeded = xpForLevel(data.level);
  const xpPct = Math.floor((data.xp / xpNeeded) * 100);

  container.innerHTML = `
    <div class="icek-penguin-widget" id="penguinWidget">
      <div class="icek-penguin-avatar ${st.anim}" id="penguinAvatar">
        <span class="icek-penguin-emoji">${emoji}</span>
        <div class="icek-penguin-msg">${st.msg()}</div>
      </div>
      <div class="icek-penguin-info">
        <div class="icek-penguin-name">${name} <small>Lv.${data.level}</small></div>
        <div class="icek-penguin-xp-bar">
          <div class="icek-penguin-xp-fill" style="width:${xpPct}%"></div>
        </div>
        <div class="icek-penguin-stats">
          <span title="Happiness">😊${data.stats.happiness}</span>
          <span title="Energy">⚡${data.stats.energy}</span>
          <span title="Hunger">🍽️${data.stats.hunger}</span>
        </div>
      </div>
    </div>
  `;
}
