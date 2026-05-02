/**
 * Gem Kingdom — audio.js
 * Web Audio API synthesized sounds — no external files needed
 * Provides: play(name), muteAll(), unmuteAll()
 */

let ctx = null;
let masterGain = null;
let muted = false;

function getCtx() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      masterGain.gain.value = 0.4;
    } catch (e) {
      console.warn('Web Audio not supported');
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// ===== BASIC SYNTH HELPERS =====
function tone(freq, dur, type = 'sine', vol = 0.3, delay = 0) {
  const c = getCtx();
  if (!c || muted) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, c.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(c.currentTime + delay);
  osc.stop(c.currentTime + delay + dur);
}

function noise(dur, vol = 0.1, delay = 0) {
  const c = getCtx();
  if (!c || muted) return;
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * vol;
  const src = c.createBufferSource();
  const gain = c.createGain();
  src.buffer = buf;
  gain.gain.setValueAtTime(vol, c.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
  src.connect(gain);
  gain.connect(masterGain);
  src.start(c.currentTime + delay);
}

function chord(freqs, dur, type = 'sine', vol = 0.15, delay = 0) {
  for (const f of freqs) tone(f, dur, type, vol, delay);
}

function arpeggio(freqs, noteDur, gap, type = 'sine', vol = 0.2) {
  freqs.forEach((f, i) => tone(f, noteDur, type, vol * (1 - i * 0.05), i * gap));
}

function sweep(startFreq, endFreq, dur, type = 'sine', vol = 0.2) {
  const c = getCtx();
  if (!c || muted) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(endFreq, c.currentTime + dur);
  gain.gain.setValueAtTime(vol, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + dur);
}

// ===== SOUND EFFECTS =====
const sounds = {
  tap() {
    tone(800, 0.08, 'sine', 0.15);
  },

  match() {
    tone(523, 0.1, 'sine', 0.2);
    tone(659, 0.1, 'sine', 0.2, 0.05);
    tone(784, 0.15, 'sine', 0.2, 0.1);
  },

  badSwap() {
    tone(200, 0.15, 'square', 0.12);
    tone(150, 0.15, 'square', 0.12, 0.08);
  },

  combo() {
    arpeggio([523, 659, 784, 1047], 0.12, 0.06, 'sine', 0.2);
  },

  megaCombo() {
    arpeggio([523, 659, 784, 1047, 1319], 0.15, 0.05, 'triangle', 0.25);
    noise(0.2, 0.05, 0.2);
  },

  powerCombo() {
    sweep(200, 2000, 0.3, 'sawtooth', 0.15);
    chord([523, 784, 1047], 0.4, 'sine', 0.12, 0.15);
    noise(0.15, 0.08, 0.1);
  },

  specialCreate() {
    sweep(400, 1200, 0.2, 'triangle', 0.2);
    tone(1200, 0.15, 'sine', 0.15, 0.15);
  },

  hammer() {
    tone(150, 0.08, 'square', 0.25);
    noise(0.12, 0.15);
    tone(100, 0.2, 'sawtooth', 0.1, 0.05);
  },

  shuffle() {
    for (let i = 0; i < 6; i++) {
      tone(300 + Math.random() * 400, 0.06, 'sine', 0.1, i * 0.04);
    }
  },

  powerup() {
    arpeggio([262, 330, 392, 523, 659], 0.1, 0.06, 'triangle', 0.2);
  },

  buy() {
    tone(440, 0.08, 'sine', 0.15);
    tone(554, 0.08, 'sine', 0.15, 0.06);
    tone(659, 0.12, 'sine', 0.2, 0.12);
  },

  error() {
    tone(200, 0.2, 'sawtooth', 0.12);
    tone(180, 0.25, 'sawtooth', 0.1, 0.1);
  },

  coins() {
    for (let i = 0; i < 4; i++) {
      tone(1200 + i * 200, 0.08, 'sine', 0.12, i * 0.07);
    }
  },

  explosion() {
    noise(0.4, 0.2);
    tone(80, 0.3, 'sawtooth', 0.15);
    sweep(200, 50, 0.3, 'square', 0.1);
  },

  iceBreak() {
    noise(0.15, 0.1);
    tone(800, 0.1, 'sine', 0.12);
    tone(1200, 0.08, 'sine', 0.1, 0.05);
  },

  chainBreak() {
    tone(300, 0.05, 'square', 0.15);
    tone(450, 0.05, 'square', 0.15, 0.04);
    noise(0.1, 0.08, 0.02);
  },

  bossHit() {
    tone(200, 0.12, 'sawtooth', 0.2);
    noise(0.08, 0.12);
    tone(150, 0.1, 'square', 0.15, 0.05);
  },

  bossRoar() {
    sweep(400, 80, 0.5, 'sawtooth', 0.2);
    noise(0.3, 0.1, 0.1);
    tone(60, 0.4, 'square', 0.15, 0.2);
  },

  bossAttack() {
    sweep(600, 150, 0.3, 'sawtooth', 0.15);
    noise(0.2, 0.12, 0.1);
  },

  bossDefeat() {
    arpeggio([392, 523, 659, 784, 1047], 0.2, 0.1, 'triangle', 0.2);
    noise(0.3, 0.08, 0.3);
    chord([523, 659, 784], 0.5, 'sine', 0.15, 0.5);
  },

  levelComplete() {
    arpeggio([523, 659, 784, 1047], 0.15, 0.1, 'sine', 0.2);
    chord([523, 784, 1047], 0.4, 'triangle', 0.12, 0.4);
  },

  perfect() {
    arpeggio([523, 659, 784, 1047, 1319, 1568], 0.15, 0.08, 'sine', 0.2);
    chord([523, 784, 1047, 1568], 0.5, 'triangle', 0.12, 0.5);
    noise(0.1, 0.03, 0.4);
  },

  levelFail() {
    tone(400, 0.2, 'sine', 0.15);
    tone(350, 0.2, 'sine', 0.15, 0.15);
    tone(300, 0.3, 'sine', 0.15, 0.3);
    tone(250, 0.5, 'sine', 0.12, 0.45);
  },

  star() {
    sweep(600, 1400, 0.2, 'sine', 0.15);
    tone(1400, 0.15, 'triangle', 0.12, 0.15);
  },

  levelUp() {
    arpeggio([392, 494, 587, 784], 0.12, 0.08, 'triangle', 0.2);
    chord([392, 587, 784], 0.3, 'sine', 0.1, 0.3);
  },

  achievement() {
    arpeggio([659, 784, 1047, 1319], 0.15, 0.1, 'sine', 0.2);
    chord([659, 1047, 1319], 0.4, 'triangle', 0.15, 0.4);
    noise(0.08, 0.03, 0.3);
  },

  hint() {
    tone(880, 0.08, 'sine', 0.1);
    tone(1100, 0.08, 'sine', 0.1, 0.08);
  },

  stoneBreak() {
    noise(0.2, 0.15);
    tone(120, 0.15, 'square', 0.12);
    tone(80, 0.2, 'sawtooth', 0.1, 0.1);
  },

  portal() {
    sweep(400, 800, 0.15, 'sine', 0.12);
    sweep(800, 400, 0.15, 'sine', 0.12, 0.12);
  },

  conveyor() {
    tone(300, 0.08, 'sine', 0.08);
    tone(350, 0.08, 'sine', 0.08, 0.04);
    tone(400, 0.08, 'sine', 0.08, 0.08);
  },

  shadowSpread() {
    sweep(300, 100, 0.3, 'sawtooth', 0.08);
    noise(0.15, 0.05, 0.1);
  },

  quiz() {
    chord([523, 659, 784], 0.2, 'triangle', 0.15);
  },

  quizCorrect() {
    tone(523, 0.08, 'sine', 0.15);
    tone(784, 0.12, 'sine', 0.18, 0.06);
  },

  quizWrong() {
    tone(300, 0.15, 'sawtooth', 0.12);
    tone(250, 0.2, 'sawtooth', 0.1, 0.1);
  },

  dailyReward() {
    arpeggio([440, 554, 659, 880], 0.12, 0.08, 'triangle', 0.18);
    noise(0.05, 0.03, 0.3);
  },

  streak() {
    for (let i = 0; i < 5; i++) {
      tone(600 + i * 150, 0.08, 'sine', 0.12, i * 0.05);
    }
  },

  // Celebration sounds
  worldComplete() {
    // Grand triumphal fanfare
    chord([523, 659, 784], 0.3, 'triangle', 0.15);
    arpeggio([784, 1047, 1319, 1568], 0.2, 0.12, 'sine', 0.2, 0.3);
    chord([1047, 1319, 1568], 0.6, 'sine', 0.12, 0.7);
    noise(0.15, 0.04, 0.5);
  },

  threeStar() {
    // Sparkling 3-star celebration
    arpeggio([659, 784, 1047, 1319, 1568], 0.12, 0.06, 'sine', 0.18);
    sweep(800, 2000, 0.3, 'sine', 0.1, 0.3);
    chord([1047, 1319, 1568], 0.4, 'triangle', 0.12, 0.4);
  },

  newRecord() {
    // New high score jingle
    arpeggio([523, 659, 784, 1047, 1319], 0.1, 0.07, 'triangle', 0.2);
    chord([784, 1047, 1319], 0.3, 'sine', 0.15, 0.4);
    arpeggio([1319, 1568, 1760], 0.12, 0.08, 'sine', 0.15, 0.6);
  },

  dailyChallengeWin() {
    // Victory flourish for daily challenge
    chord([392, 523, 659], 0.2, 'triangle', 0.15);
    arpeggio([659, 784, 1047, 1319], 0.15, 0.08, 'sine', 0.2, 0.2);
    noise(0.1, 0.04, 0.5);
    chord([784, 1047, 1319], 0.5, 'sine', 0.12, 0.5);
  },
};

// ===== BGM SYSTEM =====
let bgmGain = null;
let bgmPlaying = false;
let bgmInterval = null;

const BGM_PATTERNS = [
  // World 0: Bright cheerful melody
  { tempo: 140, notes: [523, 587, 659, 784, 659, 587, 523, 494], type: 'sine' },
  // World 1: Oceanic flowing
  { tempo: 120, notes: [392, 440, 523, 587, 523, 440, 392, 349], type: 'sine' },
  // World 2: Colorful upbeat
  { tempo: 150, notes: [659, 784, 880, 784, 659, 587, 523, 587], type: 'triangle' },
  // World 3: Safari rhythm
  { tempo: 130, notes: [440, 523, 440, 349, 392, 440, 523, 392], type: 'triangle' },
  // World 4: Space ambient
  { tempo: 100, notes: [262, 330, 392, 440, 523, 440, 392, 330], type: 'sine' },
  // World 5: Musical bounce
  { tempo: 160, notes: [523, 659, 784, 1047, 784, 659, 523, 440], type: 'square' },
  // World 6: Candy sweet
  { tempo: 145, notes: [784, 880, 1047, 880, 784, 659, 784, 880], type: 'sine' },
  // World 7: Lab mysterious
  { tempo: 110, notes: [330, 349, 392, 440, 466, 440, 392, 349], type: 'sawtooth' },
  // World 8: Library calm
  { tempo: 105, notes: [262, 294, 330, 349, 392, 349, 330, 294], type: 'sine' },
  // World 9: Palace grand
  { tempo: 135, notes: [523, 659, 784, 1047, 1319, 1047, 784, 659], type: 'triangle' },
];

function startBGM(worldIdx) {
  stopBGM();
  if (muted) return;
  const c = getCtx();
  if (!c) return;

  const pattern = BGM_PATTERNS[worldIdx] || BGM_PATTERNS[0];
  bgmGain = c.createGain();
  bgmGain.gain.value = 0.06;
  bgmGain.connect(masterGain);

  let noteIdx = 0;
  const noteLen = 60 / pattern.tempo;

  function playNote() {
    if (muted || !bgmPlaying) return;
    const freq = pattern.notes[noteIdx % pattern.notes.length];
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = pattern.type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.1, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + noteLen * 0.9);
    osc.connect(g);
    g.connect(bgmGain);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + noteLen * 0.95);
    noteIdx++;
  }

  bgmPlaying = true;
  playNote();
  bgmInterval = setInterval(playNote, noteLen * 1000);
}

function stopBGM() {
  bgmPlaying = false;
  if (bgmInterval) { clearInterval(bgmInterval); bgmInterval = null; }
  if (bgmGain) { try { bgmGain.disconnect(); } catch (e) {} bgmGain = null; }
}

// ===== PUBLIC API =====
export function play(name) {
  if (muted) return;
  try {
    if (sounds[name]) sounds[name]();
  } catch (e) { /* silent */ }
}

export function playBGM(worldIdx) {
  startBGM(worldIdx);
}

export function stopMusic() {
  stopBGM();
}

export function muteAll() {
  muted = true;
  stopBGM();
  if (masterGain) masterGain.gain.value = 0;
}

export function unmuteAll() {
  muted = false;
  if (masterGain) masterGain.gain.value = 0.4;
}

export function setVolume(v) {
  if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v));
}
