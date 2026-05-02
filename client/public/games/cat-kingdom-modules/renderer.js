/* ═══════════════════════════════════════════════════════════════
   Cat Kingdom — Renderer (Particles, Animations, Visual FX)
   Pure CSS + JS — no canvas, no libs
   ═══════════════════════════════════════════════════════════════ */

let particleContainer = null;
let particleInterval = null;

export function initRenderer() {
  particleContainer = document.getElementById('particles');
  if (!particleContainer) {
    particleContainer = document.createElement('div');
    particleContainer.id = 'particles';
    particleContainer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden';
    document.body.appendChild(particleContainer);
  }
}

/* ── Particle shapes by type ── */
const PARTICLE_CHARS = {
  leaf:     ['🍃', '🍂', '🌿', '🍀'],
  bubble:   ['🫧', '○', '◯', '●'],
  fire:     ['🔥', '✨', '💫', '⭐'],
  snow:     ['❄️', '❅', '❆', '✧'],
  star:     ['⭐', '✨', '💫', '🌟'],
  sand:     ['✦', '✧', '·', '•'],
  petal:    ['🌸', '🌺', '🌹', '💮'],
  spark:    ['⚡', '✧', '⚙️', '💡'],
  magic:    ['✨', '💜', '🔮', '💫'],
  confetti: ['🎉', '🎊', '✨', '🌟'],
};

export function startParticles(type, color) {
  stopParticles();
  const chars = PARTICLE_CHARS[type] || PARTICLE_CHARS.star;

  particleInterval = setInterval(() => {
    if (!particleContainer) return;
    if (particleContainer.children.length > 25) return;

    const p = document.createElement('span');
    p.textContent = chars[Math.floor(Math.random() * chars.length)];
    p.style.cssText = `
      position:absolute;
      left:${Math.random()*100}%;
      top:-20px;
      font-size:${12+Math.random()*16}px;
      opacity:${0.3+Math.random()*0.4};
      pointer-events:none;
      animation:particleFall ${3+Math.random()*4}s linear forwards;
      filter:drop-shadow(0 0 4px ${color});
    `;
    particleContainer.appendChild(p);
    setTimeout(() => p.remove(), 7000);
  }, 300);
}

export function stopParticles() {
  if (particleInterval) { clearInterval(particleInterval); particleInterval = null; }
  if (particleContainer) particleContainer.innerHTML = '';
}

/* ── Burst effect (correct answer, level up, etc.) ── */
export function burst(x, y, emoji, count = 8) {
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.textContent = emoji;
    const angle = (Math.PI * 2 / count) * i;
    const dist = 40 + Math.random() * 60;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    el.style.cssText = `
      position:fixed;left:${x}px;top:${y}px;font-size:${16+Math.random()*12}px;
      pointer-events:none;z-index:9999;
      transition:all 0.6s cubic-bezier(.25,.46,.45,.94);
      opacity:1;
    `;
    document.body.appendChild(el);
    requestAnimationFrame(() => {
      el.style.transform = `translate(${dx}px,${dy}px) scale(0.3) rotate(${Math.random()*360}deg)`;
      el.style.opacity = '0';
    });
    setTimeout(() => el.remove(), 700);
  }
}

/* ── Screen shake ── */
export function shake(el, intensity = 5) {
  if (!el) return;
  el.style.transition = 'transform 0.05s';
  let count = 0;
  const iv = setInterval(() => {
    const x = (Math.random() - 0.5) * intensity * 2;
    const y = (Math.random() - 0.5) * intensity * 2;
    el.style.transform = `translate(${x}px,${y}px)`;
    count++;
    if (count > 6) { clearInterval(iv); el.style.transform = ''; }
  }, 50);
}

/* ── Pulse glow ── */
export function pulseGlow(el, color, duration = 600) {
  if (!el) return;
  el.style.transition = `box-shadow ${duration}ms`;
  el.style.boxShadow = `0 0 20px ${color}, 0 0 40px ${color}`;
  setTimeout(() => { el.style.boxShadow = ''; }, duration);
}

/* ── Float in animation ── */
export function floatIn(el, delay = 0) {
  if (!el) return;
  el.style.opacity = '0';
  el.style.transform = 'translateY(30px) scale(0.9)';
  el.style.transition = `opacity 0.4s ${delay}ms, transform 0.4s ${delay}ms cubic-bezier(.34,1.56,.64,1)`;
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0) scale(1)';
  });
}

/* ── Boss entrance ── */
export function bossEntrance(el) {
  if (!el) return;
  el.style.transform = 'scale(0) rotate(-180deg)';
  el.style.transition = 'transform 0.8s cubic-bezier(.34,1.56,.64,1)';
  requestAnimationFrame(() => {
    el.style.transform = 'scale(1) rotate(0deg)';
  });
}

/* ── Stars animation ── */
export function animateStars(container, count) {
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const star = document.createElement('span');
    star.textContent = i < count ? '⭐' : '☆';
    star.style.cssText = `
      font-size:36px;display:inline-block;margin:0 4px;
      opacity:0;transform:scale(0) rotate(-180deg);
      transition:all 0.4s ${200 + i * 200}ms cubic-bezier(.34,1.56,.64,1);
    `;
    container.appendChild(star);
    setTimeout(() => {
      star.style.opacity = '1';
      star.style.transform = 'scale(1) rotate(0deg)';
    }, 50);
  }
}

/* ── XP bar animation ── */
export function animateXP(bar, from, to, max) {
  if (!bar) return;
  const fromPct = Math.min(100, (from / max) * 100);
  const toPct = Math.min(100, (to / max) * 100);
  bar.style.width = fromPct + '%';
  requestAnimationFrame(() => {
    bar.style.transition = 'width 0.8s ease-out';
    bar.style.width = toPct + '%';
  });
}

/* ── Timer ring (for countdown) ── */
export function updateTimerRing(el, pct) {
  if (!el) return;
  const deg = pct * 360;
  const color = pct > 0.5 ? '#43e97b' : pct > 0.25 ? '#fbbf24' : '#f5576c';
  el.style.background = `conic-gradient(${color} ${deg}deg, rgba(255,255,255,0.1) ${deg}deg)`;
}

/* ── World transition ── */
export function worldTransition(callback) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;inset:0;background:#000;z-index:99999;
    opacity:0;transition:opacity 0.4s;
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => { overlay.style.opacity = '1'; });
  setTimeout(() => {
    if (callback) callback();
    setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 400);
    }, 100);
  }, 400);
}

/* ── Apply world theme to body ── */
export function applyWorldTheme(world) {
  document.body.style.background = world.bg;
  document.body.style.setProperty('--accent', world.accent);
  document.body.style.setProperty('--particle-color', world.particleColor);
}
