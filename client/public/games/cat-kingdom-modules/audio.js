/* ═══════════════════════════════════════════════════════════════
   Cat Kingdom — Audio System (Web Audio API)
   Moods, SFX, Ambient — all synthesized, zero downloads
   ═══════════════════════════════════════════════════════════════ */

let ctx = null;
let muted = localStorage.getItem('catk_mute') === '1';
let masterGain = null;

function ensureCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : 0.4;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function initAudio() {
  const handler = () => { ensureCtx(); document.removeEventListener('click', handler); document.removeEventListener('touchstart', handler); };
  document.addEventListener('click', handler, { once: true });
  document.addEventListener('touchstart', handler, { once: true });
}

export function toggleMute() {
  muted = !muted;
  localStorage.setItem('catk_mute', muted ? '1' : '0');
  if (masterGain) masterGain.gain.value = muted ? 0 : 0.4;
  return muted;
}

export function isMuted() { return muted; }

/* ── helpers ── */
function osc(freq, type, dur, delay = 0, vol = 0.3) {
  const c = ensureCtx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + delay);
  g.gain.setValueAtTime(vol, c.currentTime + delay);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
  o.connect(g); g.connect(masterGain);
  o.start(c.currentTime + delay);
  o.stop(c.currentTime + delay + dur + 0.05);
}

function ramp(o, freqs, times) {
  const c = ensureCtx();
  freqs.forEach((f, i) => {
    if (i === 0) o.frequency.setValueAtTime(f, c.currentTime + times[i]);
    else o.frequency.exponentialRampToValueAtTime(f, c.currentTime + times[i]);
  });
}

/* ── SFX ── */
export function sfxCorrect() {
  osc(523, 'sine', 0.15, 0, 0.25);
  osc(659, 'sine', 0.15, 0.1, 0.25);
  osc(784, 'sine', 0.2, 0.2, 0.25);
}

export function sfxCorrectWorld(worldId) {
  const baseFreq = 490 + ((worldId || 1) * 15);
  osc(baseFreq, 'sine', 0.15, 0, 0.25);
  osc(baseFreq + 136, 'sine', 0.15, 0.1, 0.25);
  osc(baseFreq + 261, 'sine', 0.2, 0.2, 0.25);
}

export function sfxWrong() {
  osc(200, 'sawtooth', 0.3, 0, 0.15);
  osc(150, 'sawtooth', 0.3, 0.15, 0.1);
}

export function sfxMeow() {
  const c = ensureCtx();
  const o = c.createOscillator(), g = c.createGain();
  o.type = 'sine'; o.connect(g); g.connect(masterGain);
  ramp(o, [400, 600, 350], [0, 0.1, 0.25]);
  g.gain.setValueAtTime(0.3, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
  o.start(); o.stop(c.currentTime + 0.4);
}

export function sfxPurr() {
  for (let i = 0; i < 6; i++) {
    osc(80 + Math.random() * 20, 'sine', 0.12, i * 0.1, 0.08);
  }
}

export function sfxLevelUp() {
  [523, 587, 659, 698, 784, 880, 988, 1047].forEach((f, i) => {
    osc(f, 'sine', 0.12, i * 0.07, 0.2);
  });
}

export function sfxWorldComplete() {
  const notes = [523, 659, 784, 1047, 784, 1047, 1319, 1568];
  notes.forEach((f, i) => osc(f, 'sine', 0.18, i * 0.1, 0.22));
}

export function sfxBossAppear() {
  osc(120, 'sawtooth', 0.6, 0, 0.2);
  osc(100, 'sawtooth', 0.5, 0.3, 0.15);
  osc(80, 'square', 0.8, 0.5, 0.1);
}

export function sfxBossHit() {
  osc(300, 'square', 0.1, 0, 0.2);
  osc(500, 'sine', 0.15, 0.08, 0.25);
}

export function sfxStar() {
  osc(880, 'sine', 0.1, 0, 0.2);
  osc(1100, 'sine', 0.15, 0.08, 0.2);
  osc(1320, 'sine', 0.2, 0.15, 0.2);
}

export function sfxClick() {
  osc(800, 'sine', 0.05, 0, 0.15);
}

export function sfxCountdown() {
  osc(440, 'sine', 0.08, 0, 0.2);
}

export function sfxEat() {
  osc(350, 'sine', 0.08, 0, 0.2);
  osc(450, 'sine', 0.08, 0.06, 0.2);
  osc(550, 'sine', 0.1, 0.12, 0.2);
}

export function sfxPurchase() {
  osc(660, 'sine', 0.1, 0, 0.2);
  osc(880, 'sine', 0.1, 0.08, 0.2);
  osc(1100, 'triangle', 0.15, 0.15, 0.15);
  osc(440, 'sine', 0.1, 0.25, 0.1);
}

/* ── ambient: simple looping pads ── */
let ambientOsc = null;
let ambientGain = null;

const AMBIENT_TONES = {
  1: { freq: 220, type: 'sine' },     // forest
  2: { freq: 180, type: 'sine' },     // ocean
  3: { freq: 150, type: 'sawtooth' }, // volcano
  4: { freq: 280, type: 'sine' },     // ice
  5: { freq: 200, type: 'triangle' }, // space
  6: { freq: 250, type: 'sine' },     // desert
  7: { freq: 300, type: 'sine' },     // flowers
  8: { freq: 160, type: 'square' },   // machines
  9: { freq: 190, type: 'triangle' }, // enchanted
  10: { freq: 260, type: 'sine' },    // palace
};

export function startAmbient(worldId) {
  stopAmbient();
  const c = ensureCtx();
  const tone = AMBIENT_TONES[worldId] || AMBIENT_TONES[1];
  ambientOsc = c.createOscillator();
  ambientGain = c.createGain();
  ambientOsc.type = tone.type;
  ambientOsc.frequency.value = tone.freq;
  ambientGain.gain.value = 0.03;
  ambientOsc.connect(ambientGain);
  ambientGain.connect(masterGain);
  ambientOsc.start();
}

export function stopAmbient() {
  if (ambientOsc) { try { ambientOsc.stop(); } catch(e) {} ambientOsc = null; }
}

/* ── Volume control ── */
export function setVolume(vol) {
  const v = Math.max(0, Math.min(1, vol));
  if (masterGain) masterGain.gain.value = muted ? 0 : v * 0.6;
  try { localStorage.setItem('catk_volume', String(v)); } catch(e) {}
}

export function getVolume() {
  try {
    const raw = localStorage.getItem('catk_volume');
    if (raw !== null) return parseFloat(raw) || 0.6;
  } catch(e) {}
  return 0.6;
}
