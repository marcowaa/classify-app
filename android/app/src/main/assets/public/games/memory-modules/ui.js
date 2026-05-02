// ═══════════════════════════════════════════════════════════════
// Memory Match Pro — ui.js
// Sound Engine, World Music, Particles, Background, Card Rendering
// ═══════════════════════════════════════════════════════════════

import { MECH, t } from './config.js';

// ===== PERFORMANCE MODE =====
let lowPerfMode = false;
export function isLowPerf() { return lowPerfMode; }
export function detectPerformance() {
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) lowPerfMode = true;
  if (navigator.deviceMemory && navigator.deviceMemory <= 2) lowPerfMode = true;
}
export function getParticleCount(base) {
  return lowPerfMode ? Math.max(1, Math.floor(base / 3)) : base;
}

// ===== AUDIO ENGINE (Childlike Joyful Sounds) =====
let audioCtx = null;
function ctx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

let _getMuted = () => false;
export function setSoundMuteGetter(fn) { _getMuted = fn; }

// Core tone with optional stereo panning
function tone(f, d, tp, v, atk, panX) {
  if (_getMuted()) return;
  try {
    const c = ctx(), o = c.createOscillator(), g = c.createGain();
    const a = atk || .005;
    o.type = tp || 'sine';
    o.frequency.setValueAtTime(f, c.currentTime);
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(v || .08, c.currentTime + a);
    g.gain.exponentialRampToValueAtTime(.001, c.currentTime + (d || .15));
    o.connect(g);
    // Spatial panning
    if (panX !== undefined && c.createStereoPanner) {
      const pan = c.createStereoPanner();
      pan.pan.setValueAtTime(Math.max(-1, Math.min(1, panX)), c.currentTime);
      g.connect(pan); pan.connect(c.destination);
    } else { g.connect(c.destination); }
    o.start(); o.stop(c.currentTime + (d || .15) + .01);
  } catch (e) {}
}

function bell(f, d, v, panX) {
  if (_getMuted()) return;
  tone(f, d || .25, 'sine', v || .09, .003, panX);
  tone(f * 2, (d || .25) * .6, 'sine', (v || .09) * .3, .003, panX);
  tone(f * 3, (d || .25) * .35, 'triangle', (v || .09) * .12, .003, panX);
}

function sparkle(f, v, panX) {
  if (_getMuted()) return;
  tone(f, .08, 'sine', v || .06, .002, panX);
  tone(f * 1.5, .06, 'sine', (v || .06) * .4, .002, panX);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

let matchVariant = 0;
let noMatchVariant = 0;

// ===== CORE SFX =====
export function sfxFlip(panX) { bell(659, .1, .07, panX); sparkle(1319, .03, panX); }
export function sfxMatch(panX) {
  const variants = [
    [784, 988, 1175],
    [740, 988, 1319],
    [659, 880, 1175],
  ];
  matchVariant = (matchVariant + 1) % variants.length;
  const motif = variants[matchVariant];
  motif.forEach((f, i) => setTimeout(() => bell(f, .14 + i * .03, .1 + i * .01, panX), i * 70));
  setTimeout(() => {
    sparkle(motif[motif.length - 1] * 1.33, .05, panX);
    sparkle(motif[motif.length - 1] * 1.7, .03, panX);
  }, motif.length * 70);
}
export function sfxNoMatch() {
  const variants = [
    [392, 349, 392],
    [370, 330, 349],
    [440, 392, 370],
  ];
  noMatchVariant = (noMatchVariant + 1) % variants.length;
  const motif = variants[noMatchVariant];
  tone(motif[0], .11, 'sine', .045, .01);
  setTimeout(() => tone(motif[1], .12, 'triangle', .04, .01), 70);
  setTimeout(() => tone(motif[2], .1, 'sine', .03, .01), 145);
}
export function sfxComplete() {
  const n = [523, 659, 784, 988, 1175, 1319, 1568];
  n.forEach((f, i) => setTimeout(() => bell(f, .22, .1), i * 90));
  setTimeout(() => sparkle(2093, .06), n.length * 90);
}
export function sfxStar() {
  [880, 1175, 1568].forEach((f, i) => setTimeout(() => {
    bell(f, .2, .1); sparkle(f * 2, .04);
  }, i * 130));
}
export function sfxCoin() {
  tone(1319, .06, 'sine', .09, .002);
  setTimeout(() => tone(1760, .08, 'sine', .1, .002), 50);
  setTimeout(() => sparkle(2637, .04), 90);
}
export function sfxBadge() {
  [880, 1047, 1319, 1568, 1760].forEach((f, i) => setTimeout(() => bell(f, .18, .1), i * 90));
}

// ===== PHASE B: NEW SFX =====
const PENTA = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760];

export function sfxComboUp(streak) {
  const idx = Math.min(streak, PENTA.length - 1);
  const base = PENTA[idx];
  const shape = pick([
    [base, base * 1.25],
    [base * 0.95, base * 1.2],
    [base, base * 1.15],
  ]);
  bell(shape[0], .12, .08);
  setTimeout(() => sparkle(shape[1], .04), 50);
}

export function sfxEncourage() {
  const motif = pick([
    [523, 659],
    [587, 740],
    [494, 659],
  ]);
  tone(motif[0], .08, 'sine', .04, .01);
  setTimeout(() => tone(motif[1], .1, 'sine', .05, .01), 80);
}

export function sfxCompanionMood(mood, intensity) {
  const k = Math.max(0.6, Math.min(1.35, intensity || 1));
  if (mood === 'happy') {
    const motif = pick([[659, 784], [740, 880], [698, 831]]);
    tone(motif[0], .07, 'sine', .035 * k, .01);
    setTimeout(() => tone(motif[1], .08, 'sine', .04 * k, .01), 70);
    return;
  }
  if (mood === 'wow') {
    const motif = pick([[784, 988, 1175], [740, 988, 1319], [880, 1047, 1319]]);
    motif.forEach((f, i) => setTimeout(() => bell(f, .11, .055 * k), i * 65));
    return;
  }
  if (mood === 'wrong') {
    const motif = pick([[392, 440], [370, 415], [349, 392]]);
    tone(motif[0], .08, 'triangle', .03, .01);
    setTimeout(() => tone(motif[1], .09, 'sine', .035, .01), 80);
    return;
  }
  if (mood === 'alert') {
    tone(220, .08, 'triangle', .04, .01);
    setTimeout(() => tone(196, .08, 'sine', .03, .01), 60);
  }
}

export function sfxBossHit() {
  tone(180, .12, 'triangle', .12, .003);
  setTimeout(() => tone(260, .1, 'sine', .09, .005), 50);
  setTimeout(() => sparkle(880, .06), 100);
}

export function sfxBossAttack() {
  tone(160, .25, 'triangle', .1, .01);
  setTimeout(() => tone(100, .2, 'sine', .08, .01), 100);
  setTimeout(() => tone(80, .15, 'triangle', .05, .01), 200);
}

export function sfxTap() {
  tone(660, .04, 'sine', .05, .002);
}

export function sfxTick() {
  tone(880, .025, 'triangle', .04, .001);
}

export function sfxLevelUp() {
  const fanfare = [523, 659, 784, 1047, 784, 1047, 1319, 1568];
  fanfare.forEach((f, i) => setTimeout(() => bell(f, .25, .12), i * 110));
  setTimeout(() => { sparkle(2093, .06); sparkle(2349, .05); }, fanfare.length * 110);
}

export function sfxWhoosh() {
  if (_getMuted()) return;
  try {
    const c = ctx(), o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(600, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(200, c.currentTime + .15);
    g.gain.setValueAtTime(.04, c.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .18);
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + .2);
  } catch (e) {}
}

// ===== PHASE C: MECHANIC & POWER-UP SFX =====
export function sfxBomb() {
  tone(100, .3, 'triangle', .14, .005);
  setTimeout(() => tone(60, .4, 'sine', .1, .01), 80);
  setTimeout(() => { sparkle(440, .04); sparkle(330, .03); }, 180);
}

export function sfxMirror() {
  [880, 660, 880, 1100].forEach((f, i) => setTimeout(() => tone(f, .08, 'sine', .05, .003), i * 60));
}

export function sfxChain() {
  bell(1047, .12, .09);
  setTimeout(() => sparkle(1568, .04), 60);
}

export function sfxChainFail() {
  tone(220, .15, 'triangle', .07, .005);
  setTimeout(() => tone(196, .18, 'sine', .05, .005), 70);
}

export function sfxRainbow() {
  const notes = [523, 659, 784, 988, 1175];
  notes.forEach((f, i) => setTimeout(() => { sparkle(f, .06); sparkle(f * 1.5, .03); }, i * 50));
}

export function sfxPowerUp() {
  bell(784, .15, .1);
  setTimeout(() => bell(988, .15, .1), 80);
  setTimeout(() => bell(1175, .2, .12), 160);
  setTimeout(() => sparkle(1568, .05), 240);
}

// ===== WORLD-SPECIFIC AMBIENT MUSIC =====
const WORLD_SCALES = [
  [262, 294, 330, 392, 440],    // W0 Nature: C Pentatonic (cheerful, pastoral)
  [220, 262, 294, 349, 392],    // W1 Ocean: A Min Pentatonic (flowing, calm)
  [294, 330, 370, 440, 494],    // W2 City: D Major (bright, upbeat)
  [330, 392, 440, 494, 587],    // W3 Adventure: E Pentatonic (heroic, bold)
  [349, 392, 466, 523, 587],    // W4 Tech: F Scale (futuristic, digital)
  [392, 440, 523, 587, 659],    // W5 Desert: G Pentatonic (warm, exotic)
  [262, 311, 349, 415, 466],    // W6 Fantasy: C Minor (mysterious, magical)
  [523, 587, 659, 784, 880],    // W7 Candy: C High (playful, bouncy)
  [196, 233, 262, 311, 349],    // W8 Arctic: G Low (cool, serene)
  [440, 523, 587, 659, 784],    // W9 Royal: A Pentatonic (majestic, grand)
];

const WORLD_BPM = [90, 72, 110, 100, 95, 80, 85, 120, 70, 105];
const WORLD_DRONE = [131, 110, 147, 165, 175, 196, 131, 262, 98, 220];

let musicPlaying = false, musicNodes = [], melodyTimer = null, melodyStep = 0;
let currentMusicWorld = -1, melodyBaseGain = null;

function fadeGain(gn, target, dur) {
  try {
    const c = ctx();
    gn.gain.cancelScheduledValues(c.currentTime);
    gn.gain.setValueAtTime(gn.gain.value, c.currentTime);
    gn.gain.linearRampToValueAtTime(target, c.currentTime + dur);
  } catch (e) {}
}

function createDrone(freq, type, vol) {
  try {
    const c = ctx(), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, c.currentTime);
    g.gain.setValueAtTime(0, c.currentTime);
    o.connect(g); g.connect(c.destination); o.start();
    return { osc: o, gain: g };
  } catch (e) { return null; }
}

export function startMusic(worldGroup) {
  if (musicPlaying || lowPerfMode || _getMuted()) return;
  if (worldGroup < 0 || worldGroup > 9) return;
  musicPlaying = true; currentMusicWorld = worldGroup; melodyStep = 0;

  // Root drone — very quiet
  const rootFreq = WORLD_DRONE[worldGroup] || 131;
  const drone = createDrone(rootFreq, 'sine');
  if (drone) { melodyBaseGain = drone.gain; fadeGain(drone.gain, .018, 1.5); musicNodes.push(drone); }
  // Fifth drone for warmth
  const fifth = createDrone(rootFreq * 1.5, 'triangle');
  if (fifth) { fadeGain(fifth.gain, .008, 2); musicNodes.push(fifth); }

  // Pentatonic melody tick
  const scale = WORLD_SCALES[worldGroup] || WORLD_SCALES[0];
  const interval = 60000 / (WORLD_BPM[worldGroup] || 90);
  melodyTimer = setInterval(() => {
    if (_getMuted() || !musicPlaying) return;
    const note = scale[melodyStep % scale.length];
    tone(note, .3, 'sine', .025, .01);
    // Every 5th step: high shimmer
    if (melodyStep % 5 === 4) tone(note * 2, .15, 'sine', .012, .01);
    // Every 8th step: bass pulse
    if (melodyStep % 8 === 0) tone(rootFreq, .4, 'triangle', .015, .02);
    melodyStep++;
  }, interval);
}

export function stopMusic() {
  musicPlaying = false; currentMusicWorld = -1;
  clearInterval(melodyTimer); melodyTimer = null;
  musicNodes.forEach(n => { try { if (n && n.osc) n.osc.stop(); } catch (e) {} });
  musicNodes = []; melodyBaseGain = null;
}

export function updateMusicIntensity(combo) {
  if (!musicPlaying || !melodyBaseGain) return;
  const vol = .018 + Math.min(combo, 10) * .002;
  fadeGain(melodyBaseGain, vol, .5);
}

// ===== CARD POSITION → PAN VALUE =====
export function cardPanX(cardId) {
  try {
    const el = document.getElementById('grid');
    if (!el) return 0;
    const card = el.querySelector(`[data-id="${cardId}"]`);
    if (!card) return 0;
    const r = card.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    return ((cx / window.innerWidth) - .5) * 1.6; // range -0.8 to +0.8
  } catch (e) { return 0; }
}

// ===== PARTICLE SYSTEM (Royal Match 3D) =====
const particleCanvas = (() => {
  const c = document.createElement('canvas');
  c.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999';
  document.body.appendChild(c);
  return c;
})();
const pCtx = particleCanvas.getContext('2d');
let P = [], pRaf = null;

function pResize() { particleCanvas.width = innerWidth; particleCanvas.height = innerHeight; }
addEventListener('resize', pResize); pResize();

function pLoop() {
  pCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    p.life -= p.d;
    if (p.life <= 0) { P.splice(i, 1); continue; }
    p.vy += (p.g || .2); p.x += p.vx; p.y += p.vy;
    p.rot = (p.rot || 0) + (p.rs || 0);
    pCtx.save();
    pCtx.globalAlpha = Math.min(1, p.life * 1.5);
    pCtx.translate(p.x, p.y);
    pCtx.rotate((p.rot || 0) * Math.PI / 180);
    if (p.t === 'fw') {
      pCtx.beginPath(); pCtx.arc(0, 0, p.r * p.life, 0, Math.PI * 2);
      pCtx.fillStyle = p.color; pCtx.fill();
      pCtx.globalAlpha = p.life * .3;
      pCtx.beginPath(); pCtx.arc(-p.vx * .5, -p.vy * .5, p.r * p.life * .6, 0, Math.PI * 2);
      pCtx.fill();
    } else if (p.t === 'em') {
      pCtx.font = p.sz + 'px serif';
      pCtx.textAlign = 'center'; pCtx.textBaseline = 'middle';
      pCtx.fillText(p.em, 0, 0);
    } else {
      pCtx.fillStyle = p.color;
      pCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    }
    pCtx.restore();
  }
  pRaf = P.length > 0 ? requestAnimationFrame(pLoop) : null;
}

export function spawnConfetti(x, y, n) {
  n = n || 40;
  const cols = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFEAA7', '#DDA0DD', '#FF69B4', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'];
  for (let i = 0; i < n; i++) {
    P.push({
      x: x || Math.random() * particleCanvas.width, y: y || particleCanvas.height * .3,
      vx: (Math.random() - .5) * 14, vy: -Math.random() * 16 - 3,
      w: Math.random() * 10 + 4, h: Math.random() * 6 + 3,
      color: cols[Math.floor(Math.random() * cols.length)],
      rot: Math.random() * 360, rs: (Math.random() - .5) * 15,
      g: .25 + Math.random() * .2, life: 1, d: .006 + Math.random() * .007
    });
  }
  if (!pRaf) pLoop();
}

function spawnFirework(x, y) {
  const cols = ['#FFD700', '#FF4500', '#00FF7F', '#1E90FF', '#FF69B4', '#FFA500', '#E74C3C', '#2ECC71', '#9B59B6', '#F39C12'];
  const col = cols[Math.floor(Math.random() * cols.length)];
  for (let i = 0; i < 50; i++) {
    const a = (i / 50) * Math.PI * 2, sp = 2 + Math.random() * 6;
    P.push({
      t: 'fw', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      r: 1.5 + Math.random() * 3, color: col, life: 1, d: .012 + Math.random() * .012, g: .06
    });
  }
  if (!pRaf) pLoop();
}

function spawn3DStars(x, y, n) {
  const em = ['⭐', '🌟', '✨', '💫', '🎆', '💎', '🏆', '🎉', '🎊', '👑'];
  for (let i = 0; i < (n || 8); i++) {
    P.push({
      t: 'em', x: x + (Math.random() - .5) * 100, y,
      vx: (Math.random() - .5) * 6, vy: -Math.random() * 10 - 3,
      em: em[Math.floor(Math.random() * em.length)],
      sz: 18 + Math.random() * 24, life: 1, d: .009, g: .12, rot: 0, rs: (Math.random() - .5) * 10
    });
  }
  if (!pRaf) pLoop();
}

export function royalCelebration(stars) {
  stars = stars || 1;
  const cw = particleCanvas.width, ch = particleCanvas.height;
  for (let w = 0; w < Math.min(stars + 1, 4); w++)
    setTimeout(() => spawnConfetti(cw * (.2 + Math.random() * .6), ch * (.2 + Math.random() * .2), 25 + stars * 10), w * 350);
  for (let f = 0; f < Math.min(stars, 3); f++)
    setTimeout(() => spawnFirework(cw * (.15 + Math.random() * .7), ch * (.1 + Math.random() * .25)), 200 + f * 600);
  setTimeout(() => spawn3DStars(cw / 2, ch * .45, stars * 4), 100);
}

export function spawnMatchParticles(id1, id2) {
  try {
    [id1, id2].forEach(id => {
      const el = document.getElementById('grid').querySelector(`[data-id="${id}"]`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      for (let i = 0; i < 4; i++) {
        const p = document.createElement('div'); p.className = 'particle';
        p.textContent = ['⭐', '✨', '🌟', '💫', '💎', '🎉'][Math.floor(Math.random() * 6)];
        p.style.left = (cx - 10 + Math.random() * 20) + 'px';
        p.style.top = (cy - 10 + Math.random() * 20) + 'px';
        p.style.fontSize = '18px';
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 1200);
      }
    });
  } catch (e) {}
}

export function spawnCoinFly(n) {
  const count = Math.min(n > 30 ? 8 : n > 15 ? 5 : 3, 8);
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const el = document.createElement('div'); el.className = 'coin-fly'; el.textContent = '🪙';
      el.style.left = (innerWidth * .3 + Math.random() * innerWidth * .4) + 'px';
      el.style.top = (innerHeight * .45 + Math.random() * 40) + 'px';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1300);
    }, i * 120);
  }
}

// ===== DYNAMIC BACKGROUND ANIMATION =====
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas ? bgCanvas.getContext('2d') : null;
let bgParts = [], bgGrp = -1, bgRaf = null, bgActive = false;

const BG_FX = [
  // 0: Nature
  { e: ['🍃', '🌿', '🦋', '🐝', '🌸', '☘️', '🌻', '🍀', '🌺', '🐞'], n: 22, sp: .35, t: 'float' },
  // 1: Ocean
  { e: ['🫧', '💧', '🐟', '🐠', '🐚', '🌊', '🪸', '🐬', '🐡', '🦈'], n: 26, sp: .5, t: 'rise' },
  // 2: City/Food
  { e: ['✨', '⭐', '🌟', '💫', '🎆', '🎇', '🎪', '🎠', '🎡', '🎢'], n: 20, sp: .25, t: 'twinkle' },
  // 3: Adventure
  { e: ['⭐', '💫', '☄️', '✨', '🌟', '🔥', '💥', '🌠', '🏹', '⚔️'], n: 14, sp: 1.2, t: 'shoot' },
  // 4: Tech
  { e: ['⚡', '💎', '🔮', '💠', '🤖', '⚙️', '📡', '💾', '🔬', '💻'], n: 32, sp: .45, t: 'fall' },
  // 5: Desert/Sand
  { e: ['🏜️', '🌵', '🐫', '☀️', '🦂', '🪨', '🏺', '⛺', '🌾', '🦎'], n: 18, sp: .3, t: 'float' },
  // 6: Fantasy/Magic
  { e: ['🧙', '🦄', '🐉', '🔮', '✨', '🏰', '⚗️', '🌙', '👑', '💫'], n: 22, sp: .35, t: 'twinkle' },
  // 7: Candy/Sweet
  { e: ['🍬', '🍭', '🧁', '🎂', '🍰', '🍩', '🍪', '🍫', '🍮', '🍡'], n: 24, sp: .4, t: 'fall' },
  // 8: Arctic/Ice
  { e: ['❄️', '⛄', '🌨️', '🐧', '🦭', '🐻‍❄️', '🏔️', '🧊', '💎', '🌬️'], n: 20, sp: .35, t: 'fall' },
  // 9: Royal/Final
  { e: ['👑', '💎', '🏆', '🎖️', '⭐', '🌟', '🔱', '💫', '🎉', '✨'], n: 28, sp: .4, t: 'rise' },
];

function bgResize() {
  if (!bgCanvas) return;
  const p = bgCanvas.parentElement;
  if (p) { bgCanvas.width = p.clientWidth; bgCanvas.height = p.clientHeight; }
}

function mkBgP(fx, init) {
  const w = bgCanvas.width || innerWidth, h = bgCanvas.height || innerHeight;
  const p = {
    x: Math.random() * w,
    y: init ? Math.random() * h : (fx.t === 'fall' || fx.t === 'shoot' ? -30 : h + 30),
    e: fx.e[Math.floor(Math.random() * fx.e.length)],
    sz: 10 + Math.random() * 16,
    sp: fx.sp * (0.4 + Math.random() * 0.8),
    op: 0.12 + Math.random() * 0.35,
    ph: Math.random() * Math.PI * 2,
    dr: (Math.random() - 0.5) * 0.25,
    rot: 0, rs: (Math.random() - 0.5) * 0.5
  };
  if (fx.t === 'shoot') { p.vx = -0.8 - Math.random() * 1.5; p.vy = 0.4 + Math.random() * 1.2; }
  return p;
}

function bgLoop() {
  if (!bgActive || !bgCtx) { bgRaf = null; return; }
  const w = bgCanvas.width, h = bgCanvas.height;
  bgCtx.clearRect(0, 0, w, h);
  const fx = BG_FX[bgGrp];
  if (!fx) { bgRaf = requestAnimationFrame(bgLoop); return; }

  for (let i = 0; i < bgParts.length; i++) {
    const p = bgParts[i];
    p.ph += 0.015; p.rot += p.rs;
    if (fx.t === 'float') {
      p.y -= p.sp; p.x += Math.sin(p.ph) * 0.4 + p.dr;
      if (p.y < -40) { Object.assign(p, mkBgP(fx, false)); p.y = h + 30; }
    } else if (fx.t === 'rise') {
      p.y -= p.sp; p.x += Math.sin(p.ph) * 0.55; p.sz += Math.sin(p.ph * 2) * 0.03;
      if (p.y < -40) { Object.assign(p, mkBgP(fx, false)); p.y = h + 30; }
    } else if (fx.t === 'twinkle') {
      p.op = 0.08 + Math.abs(Math.sin(p.ph)) * 0.45;
      p.sz = 10 + Math.sin(p.ph * 1.3) * 5; p.y -= p.sp * 0.15;
      if (p.y < -40) { Object.assign(p, mkBgP(fx, false)); p.y = h + 30; p.x = Math.random() * w; }
    } else if (fx.t === 'shoot') {
      p.x += p.vx; p.y += p.vy;
      if (p.x < -50 || p.y > h + 50) { Object.assign(p, mkBgP(fx, false)); p.y = -30; p.x = Math.random() * w; }
    } else if (fx.t === 'fall') {
      p.y += p.sp; p.op = 0.08 + Math.abs(Math.sin(p.ph)) * 0.3;
      if (p.y > h + 40) { Object.assign(p, mkBgP(fx, false)); p.y = -30; p.x = Math.random() * w; }
    }
    bgCtx.save();
    bgCtx.globalAlpha = p.op;
    bgCtx.translate(p.x, p.y); bgCtx.rotate(p.rot * Math.PI / 180);
    bgCtx.font = Math.round(p.sz) + 'px serif';
    bgCtx.textAlign = 'center'; bgCtx.textBaseline = 'middle';
    bgCtx.fillText(p.e, 0, 0);
    bgCtx.restore();
  }
  bgRaf = requestAnimationFrame(bgLoop);
}

export function initBg(g) {
  bgGrp = g; bgParts = []; bgActive = true;
  bgResize();
  const fx = BG_FX[g];
  if (fx) { for (let i = 0; i < fx.n; i++) bgParts.push(mkBgP(fx, true)); }
  if (!bgRaf) bgLoop();
}

export function stopBg() {
  bgActive = false; bgGrp = -1;
  if (bgCanvas && bgCanvas.width && bgCtx) bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
}

addEventListener('resize', () => {
  bgResize();
  if (bgActive && bgGrp >= 0) {
    const fx = BG_FX[bgGrp];
    if (fx) { bgParts = []; for (let i = 0; i < fx.n; i++) bgParts.push(mkBgP(fx, true)); }
  }
});

// ===== SCREEN MANAGEMENT =====
export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active', 'fade-in'); });
  const el = document.getElementById(id);
  if (el) { el.classList.add('active', 'fade-in'); }
}

// ===== COUNTDOWN DISPLAY =====
export function updateCountdownDisplay(mechanic, levelTimerSec, levelTimerMax, bossCountdownSec) {
  const fill = document.getElementById('cd-fill');
  const text = document.getElementById('cd-text');
  if (!fill || !text) return;
  const max = mechanic === MECH.BOSS ? 120 : levelTimerMax;
  const sec = mechanic === MECH.BOSS ? bossCountdownSec : levelTimerSec;
  const pct = max > 0 ? Math.max(0, (sec / max) * 100) : 100;
  fill.style.width = pct + '%';
  text.textContent = '⏱️ ' + Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  text.className = 'cd-txt' + (sec <= Math.min(20, max * 0.15) ? ' urgent' : '');
}

// ===== CARD RENDERING =====
export function renderCards(cards, gridCols, gridRows, frontIcon, mechanic, fogSet, group, onFlip, onClearFog, bombMap, rainbowSet, chainOrder, chainStep) {
  const g = document.getElementById('grid');
  const wrap = document.querySelector('.grid-wrap');
  const wW = wrap.clientWidth, wH = wrap.clientHeight;
  const maxW = (wW > 50 ? wW : window.innerWidth) - 16;
  const maxH = (wH > 50 ? wH : window.innerHeight * 0.65) - 16;
  const gap = Math.max(4, Math.min(8, maxW * .01));
  const sW = Math.floor((maxW - gap * (gridCols - 1)) / gridCols);
  const sH = Math.floor((maxH - gap * (gridRows - 1)) / gridRows);
  const sz = Math.max(48, Math.min(sW, sH, 200));

  g.style.gridTemplateColumns = `repeat(${gridCols},${sz}px)`;
  g.style.gridTemplateRows = `repeat(${gridRows},${sz}px)`;
  g.style.gap = gap + 'px';
  g.innerHTML = '';

  cards.forEach(card => {
    const isRainbow = rainbowSet && rainbowSet.has(card.id) && !card.matched;
    const btn = document.createElement('button');
    const isLocked = card.flipped || card.matched;
    btn.className = 'card' + (card.flipped ? ' flipped' : '') + (card.matched ? ' matched flipped' : '') + (isRainbow ? ' rainbow-card' : '') + (isLocked ? ' locked' : '');
    if (isLocked) btn.setAttribute('aria-disabled', 'true');
    btn.setAttribute('data-id', card.id);
    btn.setAttribute('aria-label', card.matched ? 'Matched card' : card.flipped ? 'Card ' + (card.id + 1) : 'Card ' + (card.id + 1) + ' face down');
    const fIcon = isRainbow ? '🌈' : frontIcon;
    btn.innerHTML = `<div class="card-inner"><div class="card-front"><span class="icon">${fIcon}</span></div><div class="card-back"><span class="sym">${card.symbol}</span></div></div>`;

    // Fog overlay
    if ((mechanic === MECH.FOG || mechanic === MECH.BOSS) && fogSet.has(card.id) && !card.matched && !card.flipped) {
      const fog = document.createElement('div');
      fog.className = 'fog-ov'; fog.textContent = '🌫️';
      fog.addEventListener('click', (e) => { e.stopPropagation(); onClearFog(card.id); });
      btn.querySelector('.card-inner').appendChild(fog);
    }

    // Bomb overlay
    if (bombMap && bombMap[card.id] !== undefined && bombMap[card.id].active && !card.matched) {
      const bomb = document.createElement('div');
      bomb.className = 'bomb-ov';
      bomb.textContent = '💣' + bombMap[card.id].countdown;
      btn.querySelector('.card-inner').appendChild(bomb);
    }

    btn.style.width = sz + 'px'; btn.style.height = sz + 'px';
    btn.addEventListener('click', () => onFlip(card.id));
    g.appendChild(btn);
  });

  // Chain indicator update
  const chainEl = document.getElementById('chain-indicator');
  if (chainEl) {
    if (chainOrder && chainOrder.length > 0 && chainStep < chainOrder.length) {
      chainEl.style.display = '';
      chainEl.innerHTML = chainOrder.map((sym, i) =>
        `<span class="chain-step${i < chainStep ? ' done' : i === chainStep ? ' current' : ''}">${i < chainStep ? '✅' : sym}</span>`
      ).join('');
    } else {
      chainEl.style.display = 'none';
    }
  }
}
