/* ═══════════════════════════════════════════════════════════════
   Ice Kingdom Academy — Renderer & Particle System
   Ice-themed visual effects, animations, particles, transitions
   ═══════════════════════════════════════════════════════════════ */

let canvas, ctx, W, H;
let particles = [];
let animId = null;
let currentType = 'snow';
let currentColor = '#ffffff';

/* ─── Setup ──────────────────────── */
export function initRenderer(canvasEl) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
}

function resize() {
  if (!canvas) return;
  W = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
  H = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
}

/* ─── Particle Factories ──────────── */
function makeSnow() {
  return { x: Math.random() * W, y: -10, r: Math.random() * 3 + 1, speed: Math.random() * 1.5 + 0.5, drift: Math.random() * 0.5 - 0.25, opacity: Math.random() * 0.5 + 0.5, wobble: Math.random() * Math.PI * 2 };
}
function makeBubble() {
  return { x: Math.random() * W, y: H + 10, r: Math.random() * 6 + 2, speed: Math.random() * 1.2 + 0.5, drift: Math.random() * 0.4 - 0.2, opacity: Math.random() * 0.4 + 0.2, wobble: Math.random() * Math.PI * 2 };
}
function makeStorm() {
  return { x: Math.random() * W, y: -10, r: Math.random() * 2 + 0.5, speed: Math.random() * 4 + 3, angle: Math.PI / 6, opacity: Math.random() * 0.7 + 0.3, len: Math.random() * 12 + 6 };
}
function makeCrystal() {
  return { x: Math.random() * W, y: Math.random() * H, r: Math.random() * 4 + 2, speed: Math.random() * 0.3 + 0.1, opacity: Math.random() * 0.6 + 0.2, rotation: Math.random() * Math.PI * 2, rotSpeed: Math.random() * 0.02 - 0.01, pulse: 0, pulseSpeed: Math.random() * 0.03 + 0.01 };
}
function makeIce() {
  return { x: Math.random() * W, y: -10, r: Math.random() * 5 + 2, speed: Math.random() * 1 + 0.3, drift: Math.random() * 0.3 - 0.15, opacity: Math.random() * 0.5 + 0.3, rotation: Math.random() * Math.PI * 2, sides: Math.floor(Math.random() * 3) + 4 };
}
function makeWave() {
  return { x: -20, y: H * 0.6 + Math.random() * H * 0.3, r: Math.random() * 4 + 2, speed: Math.random() * 1.5 + 0.5, opacity: Math.random() * 0.4 + 0.2, wave: Math.random() * Math.PI * 2, amp: Math.random() * 20 + 10 };
}
function makeLeaf() {
  return { x: Math.random() * W, y: -10, r: Math.random() * 5 + 3, speed: Math.random() * 1 + 0.5, drift: Math.random() * 1 - 0.5, rotation: Math.random() * Math.PI * 2, rotSpeed: Math.random() * 0.04 - 0.02, opacity: Math.random() * 0.6 + 0.4 };
}
function makeSpark() {
  return { x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2 + 1, speed: 0, opacity: Math.random(), pulse: Math.random() * Math.PI * 2, pulseSpeed: Math.random() * 0.08 + 0.02, twinkle: Math.random() };
}
function makeFire() {
  return { x: W / 2 + (Math.random() - 0.5) * W * 0.6, y: H + 5, r: Math.random() * 4 + 2, speed: Math.random() * 2 + 1, drift: Math.random() * 0.8 - 0.4, opacity: Math.random() * 0.7 + 0.3, life: 1, decay: Math.random() * 0.01 + 0.005 };
}
function makeMagic() {
  return { x: Math.random() * W, y: Math.random() * H, r: Math.random() * 3 + 1, speed: Math.random() * 0.5 + 0.2, angle: Math.random() * Math.PI * 2, opacity: Math.random() * 0.8 + 0.2, trail: [], trailMax: 5 };
}

const MAKERS = { snow: makeSnow, bubble: makeBubble, storm: makeStorm, crystal: makeCrystal, ice: makeIce, wave: makeWave, leaf: makeLeaf, spark: makeSpark, fire: makeFire, magic: makeMagic };

/* ─── Drawing Functions ──────────── */
function drawSnow(p) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${p.opacity})`;
  ctx.fill();
}
function drawBubble(p) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${hexToRgb(currentColor)},${p.opacity})`;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${p.opacity * 0.8})`;
  ctx.fill();
}
function drawStorm(p) {
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(p.angle) * p.len, p.y + Math.sin(p.angle) * p.len);
  ctx.strokeStyle = `rgba(200,220,255,${p.opacity})`;
  ctx.lineWidth = p.r;
  ctx.stroke();
}
function drawCrystal(p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  const glow = Math.sin(p.pulse) * 0.3 + 0.7;
  ctx.fillStyle = `rgba(${hexToRgb(currentColor)},${p.opacity * glow})`;
  const s = p.r;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * s, Math.sin(a) * s);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function drawIce(p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  ctx.fillStyle = `rgba(${hexToRgb(currentColor)},${p.opacity})`;
  ctx.beginPath();
  for (let i = 0; i < p.sides; i++) {
    const a = (Math.PI * 2 / p.sides) * i - Math.PI / 2;
    ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * p.r, Math.sin(a) * p.r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function drawWave(p) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${hexToRgb(currentColor)},${p.opacity})`;
  ctx.fill();
}
function drawLeaf(p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  ctx.fillStyle = `rgba(${hexToRgb(currentColor)},${p.opacity})`;
  ctx.beginPath();
  ctx.ellipse(0, 0, p.r, p.r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(0,0,0,0.1)`;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-p.r, 0);
  ctx.lineTo(p.r, 0);
  ctx.stroke();
  ctx.restore();
}
function drawSpark(p) {
  const glow = Math.sin(p.pulse) * 0.5 + 0.5;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r * glow + 0.5, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,${Math.floor(200 + glow * 55)},${p.opacity * glow})`;
  ctx.fill();
}
function drawFire(p) {
  const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
  gradient.addColorStop(0, `rgba(255,200,50,${p.opacity * p.life})`);
  gradient.addColorStop(1, `rgba(255,80,0,${p.opacity * p.life * 0.3})`);
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
}
function drawMagic(p) {
  for (let i = 0; i < p.trail.length; i++) {
    const t = p.trail[i];
    const a = (i + 1) / p.trail.length * p.opacity * 0.5;
    ctx.beginPath();
    ctx.arc(t.x, t.y, p.r * (i / p.trail.length), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${hexToRgb(currentColor)},${a})`;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${hexToRgb(currentColor)},${p.opacity})`;
  ctx.fill();
}

const DRAWERS = { snow: drawSnow, bubble: drawBubble, storm: drawStorm, crystal: drawCrystal, ice: drawIce, wave: drawWave, leaf: drawLeaf, spark: drawSpark, fire: drawFire, magic: drawMagic };

/* ─── Update Functions ──────────── */
function updateSnow(p) { p.wobble += 0.02; p.x += p.drift + Math.sin(p.wobble) * 0.3; p.y += p.speed; return p.y < H + 10; }
function updateBubble(p) { p.wobble += 0.03; p.x += p.drift + Math.sin(p.wobble) * 0.5; p.y -= p.speed; return p.y > -20; }
function updateStorm(p) { p.x += Math.cos(p.angle) * p.speed; p.y += Math.sin(p.angle) * p.speed + p.speed; return p.y < H + 20 && p.x < W + 20; }
function updateCrystal(p) { p.rotation += p.rotSpeed; p.pulse += p.pulseSpeed; p.y += Math.sin(p.pulse) * 0.3; return true; }
function updateIce(p) { p.y += p.speed; p.x += p.drift; p.rotation += 0.005; return p.y < H + 10; }
function updateWave(p) { p.wave += 0.03; p.x += p.speed; p.y += Math.sin(p.wave) * p.amp * 0.02; return p.x < W + 20; }
function updateLeaf(p) { p.y += p.speed; p.x += p.drift + Math.sin(p.y * 0.02) * 0.5; p.rotation += p.rotSpeed; return p.y < H + 10; }
function updateSpark(p) { p.pulse += p.pulseSpeed; return true; }
function updateFire(p) { p.y -= p.speed; p.x += p.drift; p.life -= p.decay; p.r *= 0.998; return p.life > 0; }
function updateMagic(p) { p.trail.push({x: p.x, y: p.y}); if (p.trail.length > p.trailMax) p.trail.shift(); p.angle += 0.02; p.x += Math.cos(p.angle) * p.speed; p.y += Math.sin(p.angle) * p.speed; if (p.x < 0) p.x = W; if (p.x > W) p.x = 0; if (p.y < 0) p.y = H; if (p.y > H) p.y = 0; return true; }

const UPDATERS = { snow: updateSnow, bubble: updateBubble, storm: updateStorm, crystal: updateCrystal, ice: updateIce, wave: updateWave, leaf: updateLeaf, spark: updateSpark, fire: updateFire, magic: updateMagic };

/* ─── Particle Counts ──────────── */
const COUNTS = { snow: 60, bubble: 30, storm: 40, crystal: 20, ice: 35, wave: 25, leaf: 30, spark: 40, fire: 35, magic: 20 };

/* ─── Helpers ──────────── */
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) || 200;
  const g = parseInt(h.substring(2, 4), 16) || 220;
  const b = parseInt(h.substring(4, 6), 16) || 255;
  return `${r},${g},${b}`;
}

/* ─── Core Loop ──────────── */
function loop() {
  ctx.clearRect(0, 0, W, H);
  const draw = DRAWERS[currentType] || drawSnow;
  const update = UPDATERS[currentType] || updateSnow;
  
  particles = particles.filter(p => {
    draw(p);
    return update(p);
  });

  const target = COUNTS[currentType] || 40;
  while (particles.length < target) {
    const maker = MAKERS[currentType] || makeSnow;
    particles.push(maker());
  }

  animId = requestAnimationFrame(loop);
}

/* ─── Public API ──────────── */
export function startParticles(type, color) {
  currentType = type || 'snow';
  currentColor = color || '#ffffff';
  particles = [];
  const maker = MAKERS[currentType] || makeSnow;
  const count = COUNTS[currentType] || 40;
  for (let i = 0; i < count; i++) particles.push(maker());
  if (!animId) loop();
}

export function stopParticles() {
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  particles = [];
  if (ctx) ctx.clearRect(0, 0, W, H);
}

/* ─── Burst Effects ──────────── */
export function burstAt(x, y, color, count = 15) {
  const c = color || currentColor;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i;
    const speed = Math.random() * 3 + 2;
    particles.push({
      x, y,
      r: Math.random() * 3 + 1,
      speed,
      drift: Math.cos(angle) * speed,
      opacity: 1,
      _burst: true,
      _vx: Math.cos(angle) * speed,
      _vy: Math.sin(angle) * speed,
      _life: 1,
      _decay: Math.random() * 0.02 + 0.02,
    });
  }
  // Override update for burst particles
  const origUpdate = UPDATERS[currentType];
  UPDATERS[currentType] = function(p) {
    if (p._burst) {
      p.x += p._vx;
      p.y += p._vy;
      p._vy += 0.1; // gravity
      p._life -= p._decay;
      p.opacity = p._life;
      return p._life > 0;
    }
    return origUpdate(p);
  };
}

/* ─── Screen Shake ──────────── */
export function shake(el, dur = 300) {
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.animation = `icek-shake ${dur}ms ease`;
  setTimeout(() => el.style.animation = '', dur);
}

/* ─── Correct / Wrong Flash ──────────── */
export function flashCorrect(el) {
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'icek-flash-correct 0.5s ease';
  setTimeout(() => el.style.animation = '', 500);
}

export function flashWrong(el) {
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'icek-flash-wrong 0.5s ease';
  setTimeout(() => el.style.animation = '', 500);
}

/* ─── Coin Rain Effect ──────────── */
export function coinRain(container, count = 20) {
  for (let i = 0; i < count; i++) {
    const coin = document.createElement('div');
    coin.textContent = '🪙';
    coin.style.cssText = `position:fixed;font-size:24px;z-index:10000;top:-30px;left:${Math.random()*100}%;animation:icek-coin-fall ${1+Math.random()*1.5}s ease-in forwards;animation-delay:${Math.random()*0.5}s;pointer-events:none;`;
    container.appendChild(coin);
    setTimeout(() => coin.remove(), 3000);
  }
}

/* ─── Star Reveal Effect ──────────── */
export function revealStars(container, count, maxDelay = 600) {
  const starEls = container.querySelectorAll('.icek-star');
  starEls.forEach((el, i) => {
    if (i < count) {
      setTimeout(() => {
        el.classList.add('icek-star-earned');
        el.style.animation = 'icek-star-pop 0.5s cubic-bezier(.17,.67,.35,1.5) forwards';
      }, i * (maxDelay / count));
    }
  });
}

/* ─── XP Bar Animation ──────────── */
export function animateXPBar(bar, from, to, max) {
  const start = performance.now();
  const dur = 800;
  function frame(now) {
    const t = Math.min((now - start) / dur, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const val = from + (to - from) * ease;
    bar.style.width = `${(val / max) * 100}%`;
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ─── Frozen Text Effect ──────────── */
export function frozenReveal(el) {
  el.style.opacity = '0';
  el.style.transform = 'scale(0.5)';
  el.style.filter = 'blur(10px)';
  el.style.transition = 'all 0.6s cubic-bezier(.17,.67,.35,1.5)';
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'scale(1)';
    el.style.filter = 'blur(0)';
  });
}

/* ─── Penguin Bounce ──────────── */
export function penguinBounce(el) {
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'icek-penguin-bounce 0.6s ease';
  setTimeout(() => el.style.animation = '', 600);
}

/* ─── Timer Ring ──────────── */
export function updateTimerRing(ringEl, fraction) {
  const circumference = 2 * Math.PI * 22;
  const offset = circumference * (1 - fraction);
  ringEl.style.strokeDasharray = `${circumference}`;
  ringEl.style.strokeDashoffset = `${offset}`;
  if (fraction < 0.25) ringEl.style.stroke = '#ff4444';
  else if (fraction < 0.5) ringEl.style.stroke = '#ffaa00';
  else ringEl.style.stroke = '#44ff88';
}
