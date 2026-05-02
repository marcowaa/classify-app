/* ═══════════════════════════════════════════════════════════════
   Ice Kingdom Academy — Audio System (Web Audio API)
   Ice-themed SFX, ambient tones per world — zero downloads
   ═══════════════════════════════════════════════════════════════ */

let ctx = null;
let muted = localStorage.getItem('icek_mute') === '1';
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
  localStorage.setItem('icek_mute', muted ? '1' : '0');
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
  o.frequency.value = freq;
  g.gain.value = 0;
  o.connect(g);
  g.connect(masterGain);
  const t = c.currentTime + delay;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur, vol = 0.1) {
  const c = ensureCtx();
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * vol;
  const src = c.createBufferSource();
  const g = c.createGain();
  src.buffer = buf;
  src.connect(g);
  g.connect(masterGain);
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  src.start();
}

/* ── SFX ── */
export function sfxCorrect() { osc(523, 'sine', 0.12); osc(659, 'sine', 0.12, 0.08); osc(784, 'sine', 0.15, 0.16); }
export function sfxWrong() { osc(200, 'sawtooth', 0.2, 0, 0.15); osc(160, 'sawtooth', 0.25, 0.1, 0.12); }
export function sfxClick() { osc(800, 'sine', 0.05, 0, 0.15); }
export function sfxLevelUp() { osc(440, 'sine', 0.1); osc(554, 'sine', 0.1, 0.1); osc(659, 'sine', 0.1, 0.2); osc(880, 'sine', 0.2, 0.3); }
export function sfxWorldComplete() { [523,659,784,1047].forEach((f,i) => osc(f, 'sine', 0.2, i*0.12)); }
export function sfxBossAppear() { osc(100, 'sawtooth', 0.4, 0, 0.2); osc(80, 'sawtooth', 0.5, 0.2, 0.2); noise(0.3, 0.08); }
export function sfxBossHit() { osc(300, 'square', 0.08); osc(500, 'sine', 0.08, 0.06); }
export function sfxStar() { osc(880, 'sine', 0.08); osc(1100, 'sine', 0.1, 0.06); osc(1320, 'sine', 0.12, 0.12); }
export function sfxCountdown() { osc(600, 'sine', 0.08, 0, 0.2); }
export function sfxPenguinHappy() { osc(700, 'sine', 0.06); osc(900, 'sine', 0.08, 0.06); osc(1100, 'sine', 0.06, 0.12); }
export function sfxPenguinSad() { osc(400, 'sine', 0.15); osc(300, 'sine', 0.2, 0.12); }
export function sfxIceCrack() { noise(0.15, 0.12); osc(200, 'sawtooth', 0.1, 0.05, 0.1); }
export function sfxCoinCollect() { osc(988, 'sine', 0.06); osc(1318, 'sine', 0.08, 0.05); }
export function sfxDailyBonus() { [523,659,784,988,1047].forEach((f,i) => osc(f, 'sine', 0.15, i*0.1, 0.25)); }
export function sfxPowerUp() { osc(440, 'sine', 0.08); osc(660, 'sine', 0.08, 0.06); osc(880, 'triangle', 0.12, 0.12); }
export function sfxFreeze() { osc(1200, 'sine', 0.3, 0, 0.15); osc(800, 'sine', 0.4, 0.1, 0.1); noise(0.2, 0.05); }

/* ── Ambient tones per world ── */
const AMBIENT_TONES = {
  1: { freq: 180, type: 'sine', mod: 0.5 },    // Snow Village — gentle wind
  2: { freq: 220, type: 'sine', mod: 0.8 },     // Penguin Island — ocean calm
  3: { freq: 120, type: 'sawtooth', mod: 1.2 },  // Storm Valley — deep rumble
  4: { freq: 280, type: 'triangle', mod: 0.4 },  // Mountain Peaks — high air
  5: { freq: 150, type: 'sine', mod: 0.6 },      // Ice Cave — echo
  6: { freq: 200, type: 'sine', mod: 0.9 },      // Polar Ocean — waves
  7: { freq: 250, type: 'triangle', mod: 0.5 },   // World Map — exploration
  8: { freq: 300, type: 'square', mod: 0.3 },     // Science Lab — electronic
  9: { freq: 100, type: 'sawtooth', mod: 1.5 },   // Dinosaur Era — primal
  10:{ freq: 350, type: 'sine', mod: 0.7 },       // Planet Challenge — cosmic
};

let ambientOsc = null, ambientGain = null, ambientLfo = null;

export function startAmbient(worldId) {
  stopAmbient();
  const c = ensureCtx();
  const tone = AMBIENT_TONES[worldId] || AMBIENT_TONES[1];

  ambientOsc = c.createOscillator();
  ambientGain = c.createGain();
  ambientLfo = c.createOscillator();
  const lfoGain = c.createGain();

  ambientOsc.type = tone.type;
  ambientOsc.frequency.value = tone.freq;
  ambientGain.gain.value = 0.06;

  ambientLfo.type = 'sine';
  ambientLfo.frequency.value = tone.mod;
  lfoGain.gain.value = 15;

  ambientLfo.connect(lfoGain);
  lfoGain.connect(ambientOsc.frequency);
  ambientOsc.connect(ambientGain);
  ambientGain.connect(masterGain);

  ambientOsc.start();
  ambientLfo.start();
}

export function stopAmbient() {
  try { ambientOsc?.stop(); } catch(e) {}
  try { ambientLfo?.stop(); } catch(e) {}
  ambientOsc = null; ambientGain = null; ambientLfo = null;
}
