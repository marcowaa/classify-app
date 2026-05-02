/* ═══════════════════════════════════════════════════════════════
   Cat Kingdom — Cat Pet System
   States, stats, skins, animations
   ═══════════════════════════════════════════════════════════════ */

import { LANG, t, L } from './i18n.js';

const STORAGE_KEY = 'catk_cat';

/* ── Cat Skins ── */
export const SKINS = [
  { id: 'default',  emoji: '🐱', name: () => L('القطة','Default Cat','Gato Padrão'), cost: 0, unlocked: true },
  { id: 'orange',   emoji: '🐈', name: () => L('قط برتقالي','Orange Tabby','Gato Laranja'), cost: 100, unlocked: false },
  { id: 'black',    emoji: '🐈‍⬛', name: () => L('قط أسود','Black Cat','Gato Preto'), cost: 150, unlocked: false },
  { id: 'lion',     emoji: '🦁', name: () => L('شبل أسد','Lion Cub','Filhote de Leão'), cost: 300, unlocked: false },
  { id: 'tiger',    emoji: '🐯', name: () => L('شبل نمر','Tiger Cub','Filhote de Tigre'), cost: 300, unlocked: false },
  { id: 'panda',    emoji: '🐼', name: () => L('باندا','Panda','Panda'), cost: 400, unlocked: false },
  { id: 'fox',      emoji: '🦊', name: () => L('ثعلب','Fox','Raposa'), cost: 250, unlocked: false },
  { id: 'rabbit',   emoji: '🐰', name: () => L('أرنب','Rabbit','Coelho'), cost: 200, unlocked: false },
  { id: 'bear',     emoji: '🐻', name: () => L('شبل دب','Bear Cub','Filhote de Urso'), cost: 350, unlocked: false },
  { id: 'koala',    emoji: '🐨', name: () => L('كوالا','Koala','Coala'), cost: 350, unlocked: false },
  { id: 'unicorn',  emoji: '🦄', name: () => L('وحيد القرن','Unicorn','Unicórnio'), cost: 500, unlocked: false },
  { id: 'dragon',   emoji: '🐲', name: () => L('تنين','Dragon','Dragão'), cost: 600, unlocked: false },
  { id: 'alien',    emoji: '👽', name: () => L('قط فضائي','Alien Cat','Gato Alienígena'), cost: 700, unlocked: false },
  { id: 'robot',    emoji: '🤖', name: () => L('قط آلي','Robot Cat','Gato Robô'), cost: 800, unlocked: false },
  { id: 'crown',    emoji: '👑', name: () => L('القط الملكي','Royal Cat','Gato Real'), cost: 1000, unlocked: false },
];

/* ── Cat States (animations via CSS class) ── */
export const STATES = {
  idle:      { emoji: '😺', anim: 'catIdle',     msg: '' },
  happy:     { emoji: '😸', anim: 'catBounce',   msg: () => t.catHappy },
  eating:    { emoji: '😻', anim: 'catEat',      msg: '' },
  sad:       { emoji: '😿', anim: 'catSad',      msg: () => t.catSad },
  sleeping:  { emoji: '😴', anim: 'catSleep',    msg: () => t.catSleepy },
  surprised: { emoji: '🙀', anim: 'catSurprise', msg: () => t.catExcited },
  loving:    { emoji: '😻', anim: 'catLove',     msg: () => t.catHappy },
  proud:     { emoji: '😺', anim: 'catProud',    msg: () => t.catProud },
  worried:   { emoji: '😾', anim: 'catSad',      msg: '' },
};

/* ── Default cat data ── */
function defaultCat() {
  return {
    skinId: 'default',
    happiness: 70,
    hunger: 50,
    energy: 80,
    intelligence: 0,
    xp: 0,
    totalXP: 0,
    level: 1,
    state: 'idle',
    unlockedSkins: ['default'],
    equippedSkin: 'default',
    lastFed: Date.now(),
    lastPlayed: Date.now(),
  };
}

/* ── Load / Save ── */
export function loadCat() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return { ...defaultCat(), ...data };
    }
  } catch(e) {}
  return defaultCat();
}

export function saveCat(cat) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cat)); } catch(e) {}
}

/* ── Cat level from XP ── */
export function getCatLevel(totalXP) {
  // Each level requires more XP: level * 100
  let level = 1;
  let xpNeeded = 100;
  let remaining = totalXP;
  while (remaining >= xpNeeded) {
    remaining -= xpNeeded;
    level++;
    xpNeeded = level * 100;
  }
  return { level, currentXP: remaining, xpForNext: xpNeeded };
}

/* ── Add XP (from completing levels) ── */
export function addXP(cat, amount) {
  cat.totalXP += amount;
  const { level, currentXP, xpForNext } = getCatLevel(cat.totalXP);
  const leveledUp = level > cat.level;
  cat.level = level;
  cat.xp = currentXP;
  cat.intelligence = Math.min(100, cat.intelligence + Math.floor(amount / 5));
  return { leveledUp, newLevel: level, currentXP, xpForNext };
}

/* ── Feed cat (increase happiness/hunger when answering correctly) ── */
export function feedCat(cat) {
  cat.hunger = Math.max(0, cat.hunger - 10);
  cat.happiness = Math.min(100, cat.happiness + 5);
  cat.lastFed = Date.now();
  saveCat(cat);
}

/* ── Play with cat (after level complete) ── */
export function playCat(cat) {
  cat.happiness = Math.min(100, cat.happiness + 15);
  cat.energy = Math.max(0, cat.energy - 5);
  cat.lastPlayed = Date.now();
  saveCat(cat);
}

/* ── Determine cat state from stats ── */
export function updateCatState(cat) {
  if (cat.energy < 20) cat.state = 'sleeping';
  else if (cat.hunger > 80) cat.state = 'sad';
  else if (cat.happiness > 80) cat.state = 'happy';
  else if (cat.happiness < 30) cat.state = 'sad';
  else cat.state = 'idle';
  return cat.state;
}

/* ── Time decay (hunger increases over time) ── */
export function applyTimeDecay(cat) {
  const now = Date.now();
  const hoursSinceFed = (now - (cat.lastFed || now)) / (1000 * 60 * 60);
  if (hoursSinceFed > 1) {
    cat.hunger = Math.min(100, cat.hunger + Math.floor(hoursSinceFed * 5));
    cat.happiness = Math.max(0, cat.happiness - Math.floor(hoursSinceFed * 3));
    cat.energy = Math.min(100, cat.energy + Math.floor(hoursSinceFed * 10)); // rests while away
  }
  updateCatState(cat);
  saveCat(cat);
}

/* ── Get current skin emoji ── */
export function getCatEmoji(cat) {
  const skin = SKINS.find(s => s.id === cat.equippedSkin);
  return skin ? skin.emoji : '🐱';
}

/* ── Buy skin ── */
export function buySkin(cat, skinId, currency) {
  const skin = SKINS.find(s => s.id === skinId);
  if (!skin) return { success: false, reason: 'not_found' };
  if (cat.unlockedSkins.includes(skinId)) return { success: false, reason: 'owned' };
  if (currency < skin.cost) return { success: false, reason: 'not_enough' };

  cat.unlockedSkins.push(skinId);
  return { success: true, cost: skin.cost };
}

/* ── Equip skin ── */
export function equipSkin(cat, skinId) {
  if (!cat.unlockedSkins.includes(skinId)) return false;
  cat.equippedSkin = skinId;
  saveCat(cat);
  return true;
}

/* ── Get cat display HTML ── */
export function renderCatWidget(cat) {
  const emoji = getCatEmoji(cat);
  const stateData = STATES[cat.state] || STATES.idle;
  return `
    <div class="cat-widget ${stateData.anim}">
      <div class="cat-emoji">${emoji}</div>
      <div class="cat-face">${stateData.emoji}</div>
      <div class="cat-stats-mini">
        <span>❤️ ${cat.happiness}</span>
        <span>🍖 ${100 - cat.hunger}</span>
        <span>⚡ ${cat.energy}</span>
        <span>🧠 ${cat.intelligence}</span>
      </div>
    </div>
  `;
}
