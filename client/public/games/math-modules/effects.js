/**
 * Math Challenge — Particle Effects System
 * Canvas-based confetti, fireworks, and star particles
 */

const c = document.createElement('canvas');
c.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999';
document.body.appendChild(c);
const ctx = c.getContext('2d');
let P = [], raf = null;

function resize() { c.width = innerWidth; c.height = innerHeight; }
addEventListener('resize', resize);
resize();

export function spawnConfetti(x, y, n) {
  n = n || 40;
  const cols = ['#FF6B6B','#4ECDC4','#45B7D1','#FFEAA7','#DDA0DD','#FF69B4','#98D8C8','#F7DC6F','#BB8FCE','#85C1E9','#F8C471','#82E0AA'];
  for (let i = 0; i < n; i++) {
    P.push({
      x: x || Math.random() * c.width, y: y || c.height * 0.3,
      vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 16 - 3,
      w: Math.random() * 10 + 4, h: Math.random() * 6 + 3,
      color: cols[Math.floor(Math.random() * cols.length)],
      rot: Math.random() * 360, rs: (Math.random() - 0.5) * 15,
      g: 0.25 + Math.random() * 0.2, life: 1, d: 0.006 + Math.random() * 0.007
    });
  }
  if (!raf) loop();
}

export function spawnFirework(x, y) {
  const cols = ['#FFD700','#FF4500','#00FF7F','#1E90FF','#FF69B4','#FFA500','#E74C3C','#2ECC71','#9B59B6','#F39C12'];
  const col = cols[Math.floor(Math.random() * cols.length)];
  for (let i = 0; i < 50; i++) {
    const a = (i / 50) * Math.PI * 2, sp = 2 + Math.random() * 6;
    P.push({
      t: 'fw', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      r: 1.5 + Math.random() * 3, color: col, life: 1, d: 0.012 + Math.random() * 0.012, g: 0.06
    });
  }
  if (!raf) loop();
}

export function spawn3DStars(x, y, n) {
  const em = ['⭐','🌟','✨','💫','🎆','💎','🏆','🎉','🎊','👑'];
  for (let i = 0; i < (n || 8); i++) {
    P.push({
      t: 'em', x: x + (Math.random() - 0.5) * 100, y,
      vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 10 - 3,
      em: em[Math.floor(Math.random() * em.length)],
      sz: 18 + Math.random() * 24, life: 1, d: 0.009, g: 0.12, rot: 0, rs: (Math.random() - 0.5) * 10
    });
  }
  if (!raf) loop();
}

export function royalCelebration(stars) {
  stars = stars || 1;
  for (let w = 0; w < Math.min(stars + 1, 4); w++)
    setTimeout(() => {
      spawnConfetti(c.width * (0.2 + Math.random() * 0.6), c.height * (0.2 + Math.random() * 0.2), 25 + stars * 10);
    }, w * 350);
  for (let f = 0; f < Math.min(stars, 3); f++)
    setTimeout(() => {
      spawnFirework(c.width * (0.15 + Math.random() * 0.7), c.height * (0.1 + Math.random() * 0.25));
    }, 200 + f * 600);
  setTimeout(() => spawn3DStars(c.width / 2, c.height * 0.45, stars * 4), 100);
}

function loop() {
  ctx.clearRect(0, 0, c.width, c.height);
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    p.life -= p.d;
    if (p.life <= 0) { P.splice(i, 1); continue; }
    p.vy += (p.g || 0.2); p.x += p.vx; p.y += p.vy; p.rot = (p.rot || 0) + (p.rs || 0);
    ctx.save(); ctx.globalAlpha = Math.min(1, p.life * 1.5);
    ctx.translate(p.x, p.y); ctx.rotate((p.rot || 0) * Math.PI / 180);
    if (p.t === 'fw') {
      ctx.beginPath(); ctx.arc(0, 0, p.r * p.life, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill();
      ctx.globalAlpha = p.life * 0.3; ctx.beginPath(); ctx.arc(-p.vx * 0.5, -p.vy * 0.5, p.r * p.life * 0.6, 0, Math.PI * 2); ctx.fill();
    } else if (p.t === 'em') {
      ctx.font = p.sz + 'px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.em, 0, 0);
    } else {
      ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    }
    ctx.restore();
  }
  raf = P.length > 0 ? requestAnimationFrame(loop) : null;
}
