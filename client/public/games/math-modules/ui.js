// ===== Emoji Kingdom v3 — UI Module =====
// Audio/Music with mute, Animations, Particles, World theme system, Performance mode, Tooltips

// ===== Sound Mute System =====
let soundMuted = false;
const MUTE_KEY = 'classify_math_muted';

export function initMuteState(savedMute) {
  try {
    if (savedMute != null) { soundMuted = !!savedMute; return; }
    const stored = localStorage.getItem(MUTE_KEY);
    if (stored != null) soundMuted = stored === 'true';
  } catch(e) {}
}

export function toggleMute() {
  soundMuted = !soundMuted;
  try { localStorage.setItem(MUTE_KEY, soundMuted ? 'true' : 'false'); } catch(e) {}
  if (soundMuted) stopMusic();
  return soundMuted;
}

export function isMuted() { return soundMuted; }

// ===== Performance Mode =====
let lowPerfMode = false;
export function isLowPerf() { return lowPerfMode; }
export function setLowPerf(v) { lowPerfMode = v; }
export function detectPerformance() {
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) lowPerfMode = true;
  if (navigator.deviceMemory && navigator.deviceMemory <= 2) lowPerfMode = true;
}

export function getParticleCount(base) {
  return lowPerfMode ? Math.max(1, Math.floor(base / 3)) : base;
}

// ===== World Theme System =====
export function applyWorldTheme(worldGradient, worldAccent, gameEl, doneEl) {
  if (gameEl) {
    gameEl.style.background = worldGradient;
    gameEl.style.setProperty('--accent', worldAccent);
  }
  if (doneEl) doneEl.style.background = worldGradient;
}

// ===== Audio System — Childlike Joyful Sounds =====
let audioCtx = null;
let musicNodes = [];
let musicPlaying = false;
let melodyTimer = null;

function ctx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// --- Core tone with envelope (xylophone/bell character) ---
function tone(freq, dur, type, vol, attack) {
  if (soundMuted) return;
  try {
    const c = ctx();
    const o = c.createOscillator();
    const g = c.createGain();
    const atk = attack || 0.005;
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, c.currentTime);
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.linearRampToValueAtTime(vol || 0.08, c.currentTime + atk);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + (dur || 0.15));
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + (dur || 0.15) + 0.01);
  } catch(e) {}
}

// --- Bell tone: sine fundamental + quieter octave harmonic (xylophone feel) ---
function bell(freq, dur, vol) {
  if (soundMuted) return;
  tone(freq, dur || 0.25, 'sine', vol || 0.09, 0.003);
  tone(freq * 2, (dur || 0.25) * 0.6, 'sine', (vol || 0.09) * 0.3, 0.003);
  tone(freq * 3, (dur || 0.25) * 0.35, 'triangle', (vol || 0.09) * 0.12, 0.003);
}

// --- Sparkle: quick high shimmer ---
function sparkle(freq, vol) {
  if (soundMuted) return;
  tone(freq, 0.08, 'sine', vol || 0.06, 0.002);
  tone(freq * 1.5, 0.06, 'sine', (vol || 0.06) * 0.4, 0.002);
}

// C major pentatonic notes (childlike, universally happy)
const PENTA = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760];

// ===== SFX: Correct Answer — cheerful rising xylophone ding =====
export function sfxCorrect() {
  bell(784, 0.15, 0.11);
  setTimeout(() => bell(988, 0.18, 0.12), 70);
  setTimeout(() => sparkle(1568, 0.05), 130);
}

// ===== SFX: Wrong Answer — gentle soft boop (encouraging, not harsh) =====
export function sfxWrong() {
  tone(330, 0.18, 'sine', 0.07, 0.01);
  setTimeout(() => tone(262, 0.2, 'triangle', 0.05, 0.01), 80);
}

// ===== SFX: Level Complete — joyful ascending xylophone cascade =====
export function sfxComplete() {
  const notes = [523, 659, 784, 988, 1175, 1319, 1568];
  notes.forEach((f, i) => setTimeout(() => bell(f, 0.22, 0.1), i * 90));
  setTimeout(() => sparkle(2093, 0.06), notes.length * 90);
}

// ===== SFX: Star Earned — magical sparkle chime =====
export function sfxStar() {
  [880, 1175, 1568].forEach((f, i) =>
    setTimeout(() => { bell(f, 0.2, 0.1); sparkle(f * 2, 0.04); }, i * 130));
}

// ===== SFX: Timer Tick — soft woodblock tap =====
export function sfxTick() {
  tone(880, 0.025, 'triangle', 0.04, 0.001);
}

// ===== SFX: Level Up — triumphant fanfare =====
export function sfxLevelUp() {
  const fanfare = [523, 659, 784, 1047, 784, 1047, 1319, 1568];
  fanfare.forEach((f, i) => setTimeout(() => bell(f, 0.25, 0.12), i * 110));
  setTimeout(() => {
    sparkle(2093, 0.06); sparkle(2349, 0.05);
  }, fanfare.length * 110);
}

// ===== SFX: Boss Hit — punchy impact with kid-friendly rumble =====
export function sfxBossHit() {
  tone(180, 0.12, 'triangle', 0.12, 0.003);
  setTimeout(() => tone(260, 0.1, 'sine', 0.09, 0.005), 50);
  setTimeout(() => sparkle(880, 0.06), 100);
}

// ===== SFX: Boss Attack — dramatic but playful womp =====
export function sfxBossAttack() {
  tone(160, 0.25, 'triangle', 0.1, 0.01);
  setTimeout(() => tone(100, 0.2, 'sine', 0.08, 0.01), 100);
  setTimeout(() => tone(80, 0.15, 'triangle', 0.05, 0.01), 200);
}

// ===== SFX: Combo Up — rising sparkle per streak =====
export function sfxComboUp(streak) {
  const idx = Math.min(streak, PENTA.length - 1);
  bell(PENTA[idx], 0.12, 0.08);
  setTimeout(() => sparkle(PENTA[idx] * 1.5, 0.04), 50);
}

// ===== SFX: Companion Mood (adaptive, low-noise) =====
let lastCompanionMoodAt = 0;
export function sfxCompanionMood(mood = 'happy', intensity = 1) {
  const now = Date.now();
  if (now - lastCompanionMoodAt < 380) return;
  lastCompanionMoodAt = now;

  const gain = Math.max(0.8, Math.min(1.8, Number(intensity) || 1));
  if (mood === 'wrong') {
    tone(360, 0.12, 'sine', 0.045 * gain, 0.004);
    setTimeout(() => tone(300, 0.16, 'triangle', 0.04 * gain, 0.006), 80);
    return;
  }
  if (mood === 'alert') {
    tone(440, 0.06, 'triangle', 0.055 * gain, 0.002);
    setTimeout(() => tone(520, 0.06, 'triangle', 0.05 * gain, 0.002), 70);
    setTimeout(() => tone(440, 0.06, 'triangle', 0.045 * gain, 0.002), 140);
    return;
  }
  if (mood === 'wow') {
    bell(988, 0.14, 0.07 * gain);
    setTimeout(() => bell(1319, 0.16, 0.075 * gain), 70);
    setTimeout(() => sparkle(1760, 0.05 * gain), 150);
    return;
  }

  // happy (default)
  bell(784, 0.12, 0.06 * gain);
  setTimeout(() => sparkle(1175, 0.04 * gain), 65);
}

// ===== SFX: Coin Collect — bright metallic bling =====
export function sfxCoin() {
  tone(1319, 0.06, 'sine', 0.09, 0.002);
  setTimeout(() => tone(1760, 0.08, 'sine', 0.1, 0.002), 50);
  setTimeout(() => sparkle(2637, 0.04), 90);
}

// ===== SFX: Badge Earned — achievement fanfare =====
export function sfxBadge() {
  [880, 1047, 1319, 1568, 1760].forEach((f, i) =>
    setTimeout(() => bell(f, 0.18, 0.1), i * 90));
}

// ===== SFX: Button / UI tap — soft pop =====
export function sfxTap() {
  tone(660, 0.04, 'sine', 0.05, 0.002);
}

// ===== Adaptive Music — Pentatonic Melody System =====
const MELODY_NOTES = [
  // Gentle C pentatonic loop (base octave)
  [262, 294, 330, 392, 440],
  // Higher octave shimmer layer
  [523, 587, 659, 784, 880],
];
const MELODY_BPM = 100;
let melodyStep = 0;
let melodyBaseOsc = null;
let melodyBaseGain = null;

function createDroneLoop(freq, type, vol) {
  try {
    const c = ctx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    g.gain.setValueAtTime(0, c.currentTime);
    o.connect(g); g.connect(c.destination);
    o.start();
    return { osc: o, gain: g };
  } catch(e) { return null; }
}

export function startMusic() {
  if (musicPlaying || lowPerfMode || soundMuted) return;
  musicPlaying = true;
  melodyStep = 0;

  // Warm pad drone — very quiet root note
  const drone = createDroneLoop(131, 'sine', 0.02);
  if (drone) {
    melodyBaseOsc = drone.osc;
    melodyBaseGain = drone.gain;
    fadeGain(drone.gain, 0.018, 1.5);
    musicNodes.push(drone);
  }
  // Fifth drone for warmth
  const fifth = createDroneLoop(196, 'triangle', 0.01);
  if (fifth) {
    fadeGain(fifth.gain, 0.008, 2);
    musicNodes.push(fifth);
  }

  // Start pentatonic melody tick
  const interval = 60000 / MELODY_BPM;
  melodyTimer = setInterval(() => {
    if (soundMuted || !musicPlaying) return;
    const notes = MELODY_NOTES[0];
    const note = notes[melodyStep % notes.length];
    // Gentle bell melody note
    tone(note, 0.3, 'sine', 0.025, 0.01);
    // Every 5th step: add high shimmer
    if (melodyStep % 5 === 4) {
      const hiNote = MELODY_NOTES[1][melodyStep % MELODY_NOTES[1].length];
      tone(hiNote, 0.15, 'sine', 0.012, 0.01);
    }
    melodyStep++;
  }, interval);
}

export function stopMusic() {
  musicPlaying = false;
  clearInterval(melodyTimer); melodyTimer = null;
  musicNodes.forEach(n => { try { if (n && n.osc) n.osc.stop(); } catch(e) {} });
  musicNodes = [];
  melodyBaseOsc = null; melodyBaseGain = null;
}

export function updateMusicLayers(streak, isBoss) {
  if (!musicPlaying) return;
  // At higher streaks, add warm shimmer to drone
  if (melodyBaseGain) {
    const vol = 0.018 + Math.min(streak, 10) * 0.002;
    fadeGain(melodyBaseGain, vol, 0.5);
  }
}

function fadeGain(gainNode, targetVol, dur) {
  try {
    const c = ctx();
    gainNode.gain.cancelScheduledValues(c.currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, c.currentTime);
    gainNode.gain.linearRampToValueAtTime(targetVol, c.currentTime + dur);
  } catch(e) {}
}

// ===== Particles =====
export function spawnParticles(x, y, count, particleChar) {
  const n = getParticleCount(count);
  const chars = particleChar ? [particleChar] : ['⭐', '✨', '🌟'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.textContent = chars[Math.floor(Math.random() * chars.length)];
    p.style.left = (x + (Math.random() - 0.5) * 60) + 'px';
    p.style.top = y + 'px';
    p.style.fontSize = '22px';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1300);
  }
}

export function spawnCelebration(count) {
  const n = getParticleCount(count);
  const chars = ['⭐', '✨', '🏆', '🎉', '💎', '👑'];
  for (let i = 0; i < n; i++) {
    setTimeout(() => {
      const p = document.createElement('div');
      p.className = 'particle';
      p.textContent = chars[Math.floor(Math.random() * chars.length)];
      p.style.left = (Math.random() * innerWidth) + 'px';
      p.style.top = (innerHeight * 0.5 + Math.random() * 100) + 'px';
      p.style.fontSize = '24px';
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 1300);
    }, i * 70);
  }
}

// ===== Animations =====
export function bounceElement(el) {
  if (!el || lowPerfMode) return;
  el.style.animation = 'none';
  el.offsetHeight; // trigger reflow
  el.style.animation = 'emojiBounce 0.4s ease';
}

export function shakeElement(el) {
  if (!el) return;
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'screenShake 0.4s ease';
}

export function vibrate(ms) {
  try { if (navigator.vibrate) navigator.vibrate(ms || 100); } catch(e) {}
}

// ===== Contextual Tooltips =====
export function shouldShowTooltip(progress, feature) {
  return !(progress.tutorialShown && progress.tutorialShown[feature]);
}

export function markTooltipShown(progress, feature) {
  if (!progress.tutorialShown) progress.tutorialShown = {};
  progress.tutorialShown[feature] = true;
}

export function showTooltip(text, targetEl, duration) {
  const tt = document.createElement('div');
  tt.className = 'tooltip-popup';
  tt.textContent = text;
  document.body.appendChild(tt);
  if (targetEl) {
    const rect = targetEl.getBoundingClientRect();
    tt.style.left = (rect.left + rect.width / 2) + 'px';
    tt.style.top = (rect.top - 10) + 'px';
  } else {
    tt.style.left = '50%';
    tt.style.top = '30%';
  }
  setTimeout(() => {
    tt.style.opacity = '0';
    setTimeout(() => tt.remove(), 400);
  }, duration || 3000);
  return tt;
}

// Auto-detect on load
detectPerformance();
