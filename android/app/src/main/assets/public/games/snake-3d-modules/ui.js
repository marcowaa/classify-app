// ═══════════════════════════════════════════════════════
// 🐍 Snake 3D — UI Renderer (V3 Fruit Adventure)
// Canvas rendering, particles, sounds, effects
// ═══════════════════════════════════════════════════════

import {
  GRID_COLS, GRID_ROWS, TILE_W, TILE_H, BLOCK_HEIGHT,
  ENVIRONMENTS, LEVEL_CONFIG, FRUIT_TYPES, POWER_UP_TYPES,
  SNAKE_SKINS, t, LANG
} from './config.js';

// ─── Canvas Setup ───────────────────────────────────
let canvas, ctx, W, H, originX, originY;

// ─── Camera System ──────────────────────────────────
let cameraTargetX = 0, cameraTargetY = 0;
let cameraX = 0, cameraY = 0;
let cameraEnabled = true;
const CAMERA_LERP = 0.08; // smooth follow speed

export function setCameraTarget(gridX, gridY) {
  // Calculate where origin should be so that grid position is centered
  cameraTargetX = W / 2 - (gridX - gridY) * (TILE_W / 2);
  cameraTargetY = H / 2 - (gridX + gridY) * (TILE_H / 2);
}

export function updateCamera(dt) {
  if (!cameraEnabled) return;
  const lerpFactor = Math.min(1, CAMERA_LERP * (dt / 16));
  cameraX += (cameraTargetX - cameraX) * lerpFactor;
  cameraY += (cameraTargetY - cameraY) * lerpFactor;
  originX = cameraX;
  originY = cameraY;
}

export function resetCamera() {
  // Center camera on grid center
  const cx = GRID_COLS / 2, cy = GRID_ROWS / 2;
  cameraTargetX = W / 2 - (cx - cy) * (TILE_W / 2);
  cameraTargetY = H / 2 - (cx + cy) * (TILE_H / 2);
  cameraX = cameraTargetX;
  cameraY = cameraTargetY;
  originX = cameraX;
  originY = cameraY;
}

export function initCanvas(c) {
  canvas = c;
  ctx = canvas.getContext('2d');
  resize();
  resetCamera();
  window.addEventListener('resize', () => { resize(); resetCamera(); });
}

function resize() {
  const container = canvas.parentElement;
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  W = canvas.width;
  H = canvas.height;
}

export function getCanvasSize() { return { W, H }; }

// ─── Isometric Projection ───────────────────────────
export function toIso(x, y, z = 0) {
  return {
    sx: originX + (x - y) * (TILE_W / 2),
    sy: originY + (x + y) * (TILE_H / 2) - z * BLOCK_HEIGHT,
  };
}

// ─── Color Utilities ────────────────────────────────
function hexToRgb(color) {
  if (typeof color === 'string') {
    // Handle rgb(...) / rgba(...) strings
    const rgbMatch = color.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (rgbMatch) return [+rgbMatch[1], +rgbMatch[2], +rgbMatch[3]];
  }
  const n = parseInt(String(color).replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function lighten(hex, amt = 30) {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.min(255, r + amt)},${Math.min(255, g + amt)},${Math.min(255, b + amt)})`;
}

function darken(hex, amt = 30) {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.max(0, r - amt)},${Math.max(0, g - amt)},${Math.max(0, b - amt)})`;
}

// ─── Draw Block (Isometric 3D) ──────────────────────
function drawBlock(x, y, topColor, sideColor, z = 0, h = BLOCK_HEIGHT) {
  const p = toIso(x, y, z);
  const tw = TILE_W / 2, th = TILE_H / 2;

  // Top face
  ctx.fillStyle = topColor;
  ctx.beginPath();
  ctx.moveTo(p.sx, p.sy);
  ctx.lineTo(p.sx + tw, p.sy + th);
  ctx.lineTo(p.sx, p.sy + TILE_H);
  ctx.lineTo(p.sx - tw, p.sy + th);
  ctx.closePath();
  ctx.fill();

  // Right face
  ctx.fillStyle = sideColor;
  ctx.beginPath();
  ctx.moveTo(p.sx + tw, p.sy + th);
  ctx.lineTo(p.sx + tw, p.sy + th + h);
  ctx.lineTo(p.sx, p.sy + TILE_H + h);
  ctx.lineTo(p.sx, p.sy + TILE_H);
  ctx.closePath();
  ctx.fill();

  // Left face
  ctx.fillStyle = darken(sideColor, 15);
  ctx.beginPath();
  ctx.moveTo(p.sx - tw, p.sy + th);
  ctx.lineTo(p.sx - tw, p.sy + th + h);
  ctx.lineTo(p.sx, p.sy + TILE_H + h);
  ctx.lineTo(p.sx, p.sy + TILE_H);
  ctx.closePath();
  ctx.fill();
}

// ─── Draw Emoji on Block ────────────────────────────
function drawEmojiOnBlock(x, y, emoji, z = 0, size = 18) {
  const p = toIso(x, y, z);
  ctx.font = `${size}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, p.sx, p.sy + TILE_H * 0.35);
}

// ─── Clear & Background ────────────────────────────
let bgParticles = [];

export function initBgParticles(envIdx) {
  bgParticles = [];
  const env = ENVIRONMENTS[envIdx];
  const count = (env.id.includes('neon') || env.id === 'space') ? 40 : 15;
  for (let i = 0; i < count; i++) {
    bgParticles.push({
      x: Math.random() * 800,
      y: Math.random() * 800,
      r: Math.random() * 2 + 0.5,
      speed: Math.random() * 0.3 + 0.1,
      alpha: Math.random() * 0.5 + 0.2,
    });
  }
}

export function clearCanvas(envIdx, tick) {
  // Auto-resize if canvas has zero dimensions (parent may have been hidden at init)
  if (W === 0 || H === 0) { resize(); resetCamera(); }
  const env = ENVIRONMENTS[envIdx];
  // Background
  ctx.fillStyle = env.bg;
  ctx.fillRect(0, 0, W, H);

  // Ambient particles
  for (const p of bgParticles) {
    p.y += p.speed;
    if (p.y > H) { p.y = -5; p.x = Math.random() * W; }
    const flicker = 0.5 + 0.5 * Math.sin(tick * 0.03 + p.x);
    ctx.globalAlpha = p.alpha * flicker;
    ctx.fillStyle = env.glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ─── Draw Grid ──────────────────────────────────────
export function drawGrid(envIdx) {
  const env = ENVIRONMENTS[envIdx];
  for (let x = 0; x < GRID_COLS; x++) {
    for (let y = 0; y < GRID_ROWS; y++) {
      const p = toIso(x, y);
      const tw = TILE_W / 2, th = TILE_H / 2;
      ctx.fillStyle = (x + y) % 2 === 0 ? env.grid : lighten(env.grid, 8);
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(p.sx, p.sy);
      ctx.lineTo(p.sx + tw, p.sy + th);
      ctx.lineTo(p.sx, p.sy + TILE_H);
      ctx.lineTo(p.sx - tw, p.sy + th);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

// ─── Draw Snake ─────────────────────────────────────
export function drawSnake(snake, skinIdx, hasShield, tick, shapeType) {
  const skin = SNAKE_SKINS[skinIdx] || SNAKE_SKINS[0];
  const len = snake.length;

  // Draw shadow under snake
  for (let i = len - 1; i >= 0; i--) {
    const seg = snake[i];
    const p = toIso(seg.x, seg.y);
    ctx.globalAlpha = 0.12 - (i / len) * 0.08;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy + TILE_H * 0.7, TILE_W * 0.35, TILE_H * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Dispatch to shape-specific renderer
  if (shapeType && shapeType !== 'default') {
    drawSnakeShape(snake, skin, shapeType, hasShield, tick);
    return;
  }

  // Default body rendering (back to front) with growth-based visual enhancement
  for (let i = len - 1; i > 0; i--) {
    const seg = snake[i];
    const progress = i / len;
    const fade = 0.5 + 0.5 * progress;

    // Alternate body pattern for longer snakes
    if (len > 8 && i % 3 === 0) {
      const patternColor = lighten(skin.body, 15 + 5 * Math.sin(tick * 0.03 + i * 0.5));
      drawBlock(seg.x, seg.y, rgba(patternColor, fade), darken(skin.body, 25));
    } else {
      drawBlock(seg.x, seg.y, rgba(skin.body, fade), darken(skin.body, 20));
    }

    // Growth sparkle on tail tip for long snakes
    if (i === len - 1 && len > 12) {
      const tp = toIso(seg.x, seg.y);
      const sparkle = 0.3 + 0.3 * Math.sin(tick * 0.12);
      ctx.globalAlpha = sparkle;
      ctx.fillStyle = skin.head;
      ctx.beginPath();
      ctx.arc(tp.sx, tp.sy + TILE_H * 0.4, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // Head — slightly larger when snake is big
  const head = snake[0];
  const headHeight = BLOCK_HEIGHT + 4 + (len > 15 ? 2 : 0);
  drawBlock(head.x, head.y, skin.head, darken(skin.head, 25), 0, headHeight);

  // Eyes
  const p = toIso(head.x, head.y);
  ctx.fillStyle = skin.eye;
  ctx.beginPath();
  ctx.arc(p.sx - 4, p.sy + 6, 2.5, 0, Math.PI * 2);
  ctx.arc(p.sx + 4, p.sy + 6, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(p.sx - 4, p.sy + 6, 1.2, 0, Math.PI * 2);
  ctx.arc(p.sx + 4, p.sy + 6, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Shield bubble effect (animated, breathing, with hex pattern)
  if (hasShield) {
    const pulse = 0.3 + 0.15 * Math.sin(tick * 0.06);
    const breathe = 1 + 0.08 * Math.sin(tick * 0.04);
    const radius = TILE_W * 0.65 * breathe;

    // Outer glow
    ctx.globalAlpha = pulse * 0.3;
    const grd = ctx.createRadialGradient(p.sx, p.sy + TILE_H * 0.4, radius * 0.3, p.sx, p.sy + TILE_H * 0.4, radius * 1.3);
    grd.addColorStop(0, 'rgba(79,172,254,0.0)');
    grd.addColorStop(0.6, 'rgba(79,172,254,0.15)');
    grd.addColorStop(1, 'rgba(79,172,254,0.0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(p.sx, p.sy + TILE_H * 0.4, radius * 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Main bubble
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = `rgba(79,172,254,${0.5 + 0.2 * Math.sin(tick * 0.1)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.sx, p.sy + TILE_H * 0.4, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Shine highlight
    ctx.globalAlpha = pulse * 0.6;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(p.sx - radius * 0.25, p.sy + TILE_H * 0.4 - radius * 0.3, radius * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Floating hex dots on bubble surface
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + tick * 0.02;
      const dx = Math.cos(angle) * radius * 0.75;
      const dy = Math.sin(angle) * radius * 0.75;
      ctx.globalAlpha = 0.15 + 0.1 * Math.sin(tick * 0.08 + i);
      ctx.fillStyle = '#4facfe';
      ctx.beginPath();
      ctx.arc(p.sx + dx, p.sy + TILE_H * 0.4 + dy, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }
}

// ─── Snake Shape Renderers ──────────────────────────
// shapeType: 'worm' | 'croc' | 'dragon' | 'electric' | 'royal'
function drawSnakeShape(snake, skin, shapeType, hasShield, tick) {
  const len = snake.length;
  const renderers = {
    worm: drawSnakeWorm,
    croc: drawSnakeCroc,
    dragon: drawSnakeDragon,
    electric: drawSnakeElectric,
    royal: drawSnakeRoyal,
  };
  const renderer = renderers[shapeType] || renderers.worm;
  renderer(snake, skin, hasShield, tick);
}

function drawSnakeWorm(snake, skin, hasShield, tick) {
  const len = snake.length;
  // Smooth rounded worm — draw circles connected by arcs
  for (let i = len - 1; i >= 0; i--) {
    const seg = snake[i];
    const p = toIso(seg.x, seg.y);
    const progress = i / len;
    const radius = TILE_W * (i === 0 ? 0.45 : 0.3 + 0.1 * (1 - progress));
    const bobY = Math.sin(tick * 0.08 + i * 0.6) * 1.5;

    // Body circle with gradient
    const grad = ctx.createRadialGradient(p.sx - 2, p.sy + TILE_H * 0.3 + bobY - 3, 1, p.sx, p.sy + TILE_H * 0.3 + bobY, radius);
    grad.addColorStop(0, lighten(i === 0 ? skin.head : skin.body, 30));
    grad.addColorStop(1, i === 0 ? skin.head : skin.body);
    ctx.fillStyle = grad;
    ctx.globalAlpha = i === 0 ? 1 : (0.6 + 0.4 * (1 - progress));
    ctx.beginPath();
    ctx.arc(p.sx, p.sy + TILE_H * 0.3 + bobY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Segmentation lines for worm texture
    if (i > 0 && i % 2 === 0) {
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = darken(skin.body, 20);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy + TILE_H * 0.3 + bobY, radius * 0.8, -0.3, Math.PI + 0.3);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  // Head eyes
  const head = snake[0];
  const hp = toIso(head.x, head.y);
  ctx.fillStyle = skin.eye;
  ctx.beginPath();
  ctx.arc(hp.sx - 3, hp.sy + 3, 2.5, 0, Math.PI * 2);
  ctx.arc(hp.sx + 3, hp.sy + 3, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(hp.sx - 3, hp.sy + 3, 1, 0, Math.PI * 2);
  ctx.arc(hp.sx + 3, hp.sy + 3, 1, 0, Math.PI * 2);
  ctx.fill();

  if (hasShield) drawShieldBubble(hp, tick);
}

function drawSnakeCroc(snake, skin, hasShield, tick) {
  const len = snake.length;
  // Crocodile — wider rectangular body with scales
  for (let i = len - 1; i >= 0; i--) {
    const seg = snake[i];
    const p = toIso(seg.x, seg.y);
    const progress = i / len;
    const widthMul = i === 0 ? 1.2 : (0.9 - progress * 0.2);

    // Block-style body (wider)
    const blockH = i === 0 ? BLOCK_HEIGHT + 6 : BLOCK_HEIGHT;
    const topColor = i === 0 ? skin.head : (i % 2 === 0 ? skin.body : darken(skin.body, 10));
    drawBlock(seg.x, seg.y, topColor, darken(topColor, 25), 0, blockH);

    // Scale pattern — small triangles on top
    if (i > 0 && i % 2 === 0) {
      ctx.fillStyle = lighten(skin.body, 15);
      ctx.globalAlpha = 0.4;
      const tw = TILE_W / 2, th = TILE_H / 2;
      ctx.beginPath();
      ctx.moveTo(p.sx, p.sy + 2);
      ctx.lineTo(p.sx + 5, p.sy + th);
      ctx.lineTo(p.sx - 5, p.sy + th);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Spiny ridge on back for bigger crocs
    if (len > 6 && i > 0 && i < len - 1 && i % 3 === 0) {
      ctx.fillStyle = darken(skin.body, 30);
      ctx.beginPath();
      ctx.moveTo(p.sx, p.sy - 4);
      ctx.lineTo(p.sx - 3, p.sy + 2);
      ctx.lineTo(p.sx + 3, p.sy + 2);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Crocodile head — wider with snout
  const head = snake[0];
  const hp = toIso(head.x, head.y);
  // Mouth line
  ctx.strokeStyle = darken(skin.head, 30);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hp.sx - 8, hp.sy + TILE_H * 0.5);
  ctx.lineTo(hp.sx + 8, hp.sy + TILE_H * 0.5);
  ctx.stroke();
  // Eyes
  ctx.fillStyle = '#ff0';
  ctx.beginPath();
  ctx.arc(hp.sx - 5, hp.sy + 4, 3, 0, Math.PI * 2);
  ctx.arc(hp.sx + 5, hp.sy + 4, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(hp.sx - 5, hp.sy + 4, 1.5, 0, Math.PI * 2);
  ctx.arc(hp.sx + 5, hp.sy + 4, 1.5, 0, Math.PI * 2);
  ctx.fill();

  if (hasShield) drawShieldBubble(hp, tick);
}

function drawSnakeDragon(snake, skin, hasShield, tick) {
  const len = snake.length;
  // Dragon — spiky body with fire effect
  for (let i = len - 1; i >= 0; i--) {
    const seg = snake[i];
    const p = toIso(seg.x, seg.y);
    const progress = i / len;
    const headHeight = i === 0 ? BLOCK_HEIGHT + 8 : BLOCK_HEIGHT + 2;

    // Fiery body color
    const bodyColor = i === 0 ? skin.head : `hsl(${15 + progress * 30}, 85%, ${45 + progress * 15}%)`;
    drawBlock(seg.x, seg.y, bodyColor, darken(bodyColor, 30), 0, headHeight);

    // Wing-like spikes on sides
    if (i > 0 && i % 2 === 0) {
      const spikeH = 6 + Math.sin(tick * 0.05 + i) * 2;
      ctx.fillStyle = lighten(bodyColor, 20);
      ctx.globalAlpha = 0.7;
      // Left spike
      ctx.beginPath();
      ctx.moveTo(p.sx - TILE_W * 0.35, p.sy + TILE_H * 0.3);
      ctx.lineTo(p.sx - TILE_W * 0.55, p.sy - spikeH);
      ctx.lineTo(p.sx - TILE_W * 0.15, p.sy + TILE_H * 0.2);
      ctx.closePath();
      ctx.fill();
      // Right spike
      ctx.beginPath();
      ctx.moveTo(p.sx + TILE_W * 0.35, p.sy + TILE_H * 0.3);
      ctx.lineTo(p.sx + TILE_W * 0.55, p.sy - spikeH);
      ctx.lineTo(p.sx + TILE_W * 0.15, p.sy + TILE_H * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // Dragon head — horns + glowing eyes
  const head = snake[0];
  const hp = toIso(head.x, head.y);
  // Horns
  ctx.fillStyle = darken(skin.head, 40);
  ctx.beginPath();
  ctx.moveTo(hp.sx - 6, hp.sy);
  ctx.lineTo(hp.sx - 9, hp.sy - 10);
  ctx.lineTo(hp.sx - 2, hp.sy + 2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hp.sx + 6, hp.sy);
  ctx.lineTo(hp.sx + 9, hp.sy - 10);
  ctx.lineTo(hp.sx + 2, hp.sy + 2);
  ctx.closePath();
  ctx.fill();
  // Glowing eyes
  const eyeGlow = 0.7 + 0.3 * Math.sin(tick * 0.1);
  ctx.fillStyle = `rgba(255,100,0,${eyeGlow})`;
  ctx.beginPath();
  ctx.arc(hp.sx - 4, hp.sy + 5, 3, 0, Math.PI * 2);
  ctx.arc(hp.sx + 4, hp.sy + 5, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff0';
  ctx.beginPath();
  ctx.arc(hp.sx - 4, hp.sy + 5, 1.5, 0, Math.PI * 2);
  ctx.arc(hp.sx + 4, hp.sy + 5, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Fire breath particle hint
  if (tick % 4 === 0) {
    const fireX = hp.sx + (Math.random() - 0.5) * 10;
    const fireY = hp.sy + TILE_H * 0.3 + Math.random() * 5;
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = `hsl(${20 + Math.random() * 20}, 100%, 55%)`;
    ctx.beginPath();
    ctx.arc(fireX, fireY, 2 + Math.random() * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (hasShield) drawShieldBubble(hp, tick);
}

function drawSnakeElectric(snake, skin, hasShield, tick) {
  const len = snake.length;
  // Electric — thin body with lightning arcs
  for (let i = len - 1; i >= 0; i--) {
    const seg = snake[i];
    const p = toIso(seg.x, seg.y);
    const progress = i / len;
    const pulse = 0.7 + 0.3 * Math.sin(tick * 0.15 + i * 0.8);

    // Neon glow block
    const blockH = i === 0 ? BLOCK_HEIGHT + 4 : BLOCK_HEIGHT - 2;
    const hue = (tick * 2 + i * 30) % 360;
    const topColor = i === 0 ? skin.head : `hsl(${hue}, 80%, 55%)`;
    drawBlock(seg.x, seg.y, topColor, darken(topColor, 30), 0, blockH);

    // Electric glow halo
    ctx.globalAlpha = pulse * 0.3;
    ctx.fillStyle = `hsl(${hue}, 90%, 70%)`;
    ctx.beginPath();
    ctx.arc(p.sx, p.sy + TILE_H * 0.4, TILE_W * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Lightning arc between segments
    if (i > 0 && i < len - 1) {
      const next = snake[i - 1];
      const np = toIso(next.x, next.y);
      ctx.strokeStyle = `hsla(${hue}, 90%, 70%, ${0.4 + 0.3 * Math.sin(tick * 0.2 + i)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.sx, p.sy + TILE_H * 0.3);
      // Jagged lightning
      const mx = (p.sx + np.sx) / 2 + (Math.random() - 0.5) * 8;
      const my = (p.sy + np.sy) / 2 + (Math.random() - 0.5) * 6;
      ctx.lineTo(mx, my + TILE_H * 0.3);
      ctx.lineTo(np.sx, np.sy + TILE_H * 0.3);
      ctx.stroke();
    }
  }

  // Electric eyes
  const head = snake[0];
  const hp = toIso(head.x, head.y);
  const eyeHue = (tick * 3) % 360;
  ctx.fillStyle = `hsl(${eyeHue}, 100%, 70%)`;
  ctx.beginPath();
  ctx.arc(hp.sx - 4, hp.sy + 5, 3, 0, Math.PI * 2);
  ctx.arc(hp.sx + 4, hp.sy + 5, 3, 0, Math.PI * 2);
  ctx.fill();

  if (hasShield) drawShieldBubble(hp, tick);
}

function drawSnakeRoyal(snake, skin, hasShield, tick) {
  const len = snake.length;
  // Royal — golden with crown and sparkles
  for (let i = len - 1; i >= 0; i--) {
    const seg = snake[i];
    const p = toIso(seg.x, seg.y);
    const progress = i / len;

    // Golden gradient body
    const goldShift = Math.sin(tick * 0.04 + i * 0.3) * 15;
    const topColor = i === 0 ? '#ffd700' : `rgb(${215 + goldShift},${175 + goldShift},${0 + Math.abs(goldShift)})`;
    const blockH = i === 0 ? BLOCK_HEIGHT + 6 : BLOCK_HEIGHT;
    drawBlock(seg.x, seg.y, topColor, darken(topColor, 30), 0, blockH);

    // Sparkle particles floating around
    if (i % 3 === 0) {
      const sparkAngle = tick * 0.06 + i;
      const sr = TILE_W * 0.4 + Math.sin(tick * 0.1 + i) * 3;
      const sx = p.sx + Math.cos(sparkAngle) * sr;
      const sy = p.sy + TILE_H * 0.3 + Math.sin(sparkAngle) * sr * 0.5;
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(tick * 0.15 + i);
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      // Star shape
      const starSize = 2 + Math.sin(tick * 0.1 + i) * 1;
      for (let s = 0; s < 4; s++) {
        const a = (s / 4) * Math.PI * 2 + tick * 0.05;
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(a) * starSize, sy + Math.sin(a) * starSize);
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Jewel accents on body
    if (i > 0 && i % 4 === 0) {
      const jewels = ['#ff4444', '#4facfe', '#43e97b', '#c471f5'];
      ctx.fillStyle = jewels[Math.floor(i / 4) % jewels.length];
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy + TILE_H * 0.3, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // Royal head — crown
  const head = snake[0];
  const hp = toIso(head.x, head.y);
  // Crown
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.moveTo(hp.sx - 8, hp.sy - 2);
  ctx.lineTo(hp.sx - 6, hp.sy - 10);
  ctx.lineTo(hp.sx - 3, hp.sy - 5);
  ctx.lineTo(hp.sx, hp.sy - 12);
  ctx.lineTo(hp.sx + 3, hp.sy - 5);
  ctx.lineTo(hp.sx + 6, hp.sy - 10);
  ctx.lineTo(hp.sx + 8, hp.sy - 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#cc9900';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Crown jewels
  ctx.fillStyle = '#ff0000';
  ctx.beginPath();
  ctx.arc(hp.sx, hp.sy - 8, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4facfe';
  ctx.beginPath();
  ctx.arc(hp.sx - 5, hp.sy - 6, 1.5, 0, Math.PI * 2);
  ctx.arc(hp.sx + 5, hp.sy - 6, 1.5, 0, Math.PI * 2);
  ctx.fill();
  // Royal eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(hp.sx - 4, hp.sy + 5, 3, 0, Math.PI * 2);
  ctx.arc(hp.sx + 4, hp.sy + 5, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a0a4a';
  ctx.beginPath();
  ctx.arc(hp.sx - 4, hp.sy + 5, 1.5, 0, Math.PI * 2);
  ctx.arc(hp.sx + 4, hp.sy + 5, 1.5, 0, Math.PI * 2);
  ctx.fill();

  if (hasShield) drawShieldBubble(hp, tick);
}

// Reusable shield bubble for all shapes
function drawShieldBubble(headPos, tick) {
  const p = headPos;
  const pulse = 0.3 + 0.15 * Math.sin(tick * 0.06);
  const breathe = 1 + 0.08 * Math.sin(tick * 0.04);
  const radius = TILE_W * 0.65 * breathe;
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = `rgba(79,172,254,${0.5 + 0.2 * Math.sin(tick * 0.1)})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.sx, p.sy + TILE_H * 0.4, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = pulse * 0.6;
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.arc(p.sx - radius * 0.25, p.sy + TILE_H * 0.4 - radius * 0.3, radius * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ─── Mini-Map ───────────────────────────────────────
export function drawMiniMap(snake, fruits, walls, powerUps, envIdx) {
  const mapW = 80, mapH = 80;
  const mx = W - mapW - 8;
  const my = H - mapH - 8;
  const cellW = mapW / GRID_COLS;
  const cellH = mapH / GRID_ROWS;

  // Background
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(mx - 2, my - 2, mapW + 4, mapH + 4, 6);
  else ctx.rect(mx - 2, my - 2, mapW + 4, mapH + 4);
  ctx.fill();

  ctx.strokeStyle = ENVIRONMENTS[envIdx].accent;
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(mx - 2, my - 2, mapW + 4, mapH + 4, 6);
  else ctx.rect(mx - 2, my - 2, mapW + 4, mapH + 4);
  ctx.stroke();

  // Walls
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = '#666';
  for (const w of walls) {
    ctx.fillRect(mx + w.x * cellW, my + w.y * cellH, cellW, cellH);
  }

  // Fruits
  for (const f of fruits) {
    ctx.fillStyle = f.color;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(mx + f.x * cellW + cellW / 2, my + f.y * cellH + cellH / 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Power-ups
  for (const p of powerUps) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(mx + p.x * cellW + cellW / 2, my + p.y * cellH + cellH / 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Snake
  ctx.globalAlpha = 0.9;
  for (let i = snake.length - 1; i >= 0; i--) {
    const seg = snake[i];
    ctx.fillStyle = i === 0 ? '#fff' : '#43e97b';
    ctx.fillRect(mx + seg.x * cellW, my + seg.y * cellH, cellW, cellH);
  }

  ctx.globalAlpha = 1;
}

// ─── Death Explosion ────────────────────────────────
export function spawnDeathExplosion(snake) {
  for (let i = 0; i < snake.length; i++) {
    const p = toIso(snake[i].x, snake[i].y);
    const count = i === 0 ? 12 : 4;
    for (let j = 0; j < count; j++) {
      const angle = (j / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = Math.random() * 5 + 2;
      particles.push({
        x: p.sx,
        y: p.sy + TILE_H * 0.4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        r: Math.random() * 4 + 2,
        color: i === 0 ? '#ff4444' : `hsl(${Math.random() * 60}, 80%, 50%)`,
        life: 1,
        decay: Math.random() * 0.015 + 0.008,
      });
    }
  }
}

// ─── Weather System ─────────────────────────────────
let weatherParticles = [];
let activeWeather = 'none'; // 'rain' | 'snow' | 'sand' | 'none'

export function setWeather(type) {
  activeWeather = type;
  weatherParticles = [];
}

export function updateWeather() {
  if (activeWeather === 'none') return;

  // Spawn new particles
  const spawnRate = activeWeather === 'rain' ? 3 : activeWeather === 'snow' ? 1 : 2;
  for (let i = 0; i < spawnRate; i++) {
    const p = {
      x: Math.random() * (W + 100) - 50,
      y: -5 - Math.random() * 20,
    };
    if (activeWeather === 'rain') {
      p.vx = -1.5; p.vy = 8 + Math.random() * 4;
      p.r = 1; p.len = 6 + Math.random() * 4;
      p.color = 'rgba(150,200,255,0.4)';
    } else if (activeWeather === 'snow') {
      p.vx = (Math.random() - 0.5) * 1.5; p.vy = 0.8 + Math.random() * 1;
      p.r = Math.random() * 3 + 1; p.len = 0;
      p.color = 'rgba(255,255,255,0.6)';
      p.wobble = Math.random() * Math.PI * 2;
    } else { // sand
      p.vx = 3 + Math.random() * 2; p.vy = 0.3 + Math.random() * 0.5;
      p.r = Math.random() * 2 + 0.5; p.len = 0;
      p.color = 'rgba(210,180,120,0.5)';
    }
    p.life = 1;
    weatherParticles.push(p);
  }

  // Update & draw
  for (let i = weatherParticles.length - 1; i >= 0; i--) {
    const p = weatherParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    if (activeWeather === 'snow') {
      p.wobble += 0.03;
      p.x += Math.sin(p.wobble) * 0.5;
    }

    if (p.y > H + 10 || p.x > W + 50 || p.x < -50) {
      weatherParticles.splice(i, 1);
      continue;
    }

    ctx.globalAlpha = 0.6;
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;

    if (activeWeather === 'rain') {
      ctx.lineWidth = p.r;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.vx * 0.3, p.y + p.len);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // Cap particle count
  if (weatherParticles.length > 200) weatherParticles.splice(0, weatherParticles.length - 200);
}

// ─── Arena Edge Enhancement ─────────────────────────
export function drawArenaEdge(envIdx) {
  const env = ENVIRONMENTS[envIdx];
  // Draw raised border around the grid
  for (let x = -1; x <= GRID_COLS; x++) {
    drawEdgeBlock(x, -1, env);
    drawEdgeBlock(x, GRID_ROWS, env);
  }
  for (let y = 0; y < GRID_ROWS; y++) {
    drawEdgeBlock(-1, y, env);
    drawEdgeBlock(GRID_COLS, y, env);
  }
}

function drawEdgeBlock(x, y, env) {
  const p = toIso(x, y);
  const tw = TILE_W / 2, th = TILE_H / 2;
  ctx.fillStyle = darken(env.wallColor, 10);
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(p.sx, p.sy);
  ctx.lineTo(p.sx + tw, p.sy + th);
  ctx.lineTo(p.sx, p.sy + TILE_H);
  ctx.lineTo(p.sx - tw, p.sy + th);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ─── Draw Speed Trail ───────────────────────────────
export function drawSpeedTrail(snake, tick) {
  if (snake.length < 2) return;
  for (let i = 1; i < Math.min(snake.length, 8); i++) {
    const seg = snake[i];
    const pos = toIso(seg.x, seg.y);
    const alpha = 0.35 * (1 - i / 8);
    const hue = (tick * 3 + i * 25) % 360;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `hsla(${hue}, 80%, 65%, ${alpha})`;
    ctx.beginPath();
    ctx.arc(pos.sx, pos.sy + TILE_H * 0.4, TILE_W * 0.25 * (1 - i / 10), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ─── Draw Multi Score Aura ──────────────────────────
export function drawMultiAura(head, tick) {
  const pos = toIso(head.x, head.y);
  const colors = ['#ffd200', '#ff6b6b', '#43e97b', '#4facfe', '#c471f5'];
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + tick * 0.05;
    const r = TILE_W * 0.5 + Math.sin(tick * 0.08 + i) * 4;
    const dx = Math.cos(angle) * r;
    const dy = Math.sin(angle) * r * 0.5;
    ctx.globalAlpha = 0.4 + 0.2 * Math.sin(tick * 0.1 + i);
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.arc(pos.sx + dx, pos.sy + TILE_H * 0.4 + dy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ─── Spawn Rainbow Particles ────────────────────────
export function spawnRainbowParticles(x, y, count = 15) {
  const pos = toIso(x, y);
  const hues = [0, 30, 60, 120, 200, 270, 320];
  for (let i = 0; i < count; i++) {
    const h = hues[i % hues.length];
    particles.push({
      x: pos.sx, y: pos.sy + TILE_H * 0.4,
      vx: (Math.random() - 0.5) * 7,
      vy: (Math.random() - 0.9) * 6,
      r: Math.random() * 4 + 2,
      color: `hsl(${h}, 90%, 60%)`,
      life: 1, decay: Math.random() * 0.02 + 0.015,
    });
  }
}

// ─── Confetti System ────────────────────────────────
let confetti = [];

export function spawnConfetti(count = 60) {
  const colors = ['#ff6b6b', '#ffd200', '#43e97b', '#4facfe', '#c471f5', '#ff9a76', '#ffb347', '#ff6ec7'];
  for (let i = 0; i < count; i++) {
    confetti.push({
      x: Math.random() * W,
      y: -10 - Math.random() * 40,
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 2 + 1.5,
      r: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1,
      decay: Math.random() * 0.003 + 0.002,
      spin: Math.random() * Math.PI * 2,
      spinSpeed: (Math.random() - 0.5) * 0.15,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    });
  }
}

export function updateConfetti() {
  for (let i = confetti.length - 1; i >= 0; i--) {
    const c = confetti[i];
    c.x += c.vx;
    c.y += c.vy;
    c.vy += 0.03;
    c.vx *= 0.99;
    c.spin += c.spinSpeed;
    c.life -= c.decay;
    if (c.life <= 0 || c.y > H + 10) { confetti.splice(i, 1); continue; }

    ctx.save();
    ctx.globalAlpha = c.life;
    ctx.translate(c.x, c.y);
    ctx.rotate(c.spin);
    ctx.fillStyle = c.color;
    if (c.shape === 'rect') {
      ctx.fillRect(-c.r / 2, -c.r / 4, c.r, c.r / 2);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, c.r / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// ─── Draw Walls ─────────────────────────────────────
export function drawWalls(walls, envIdx) {
  const env = ENVIRONMENTS[envIdx];
  for (const w of walls) {
    drawBlock(w.x, w.y, env.wallColor, darken(env.wallColor, 20), 0, BLOCK_HEIGHT + 6);
  }
}

// ─── Draw Moving Walls ──────────────────────────────
export function drawMovingWalls(groups, envIdx) {
  const env = ENVIRONMENTS[envIdx];
  const mColor = lighten(env.wallColor, 20);
  for (const g of groups) {
    for (const c of g.cells) {
      drawBlock(c.x, c.y, mColor, darken(mColor, 15), 0, BLOCK_HEIGHT + 4);
      // small glow on top
      const p = toIso(c.x, c.y);
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = env.accent;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy + TILE_H * 0.4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

// ─── Draw Thorns ────────────────────────────────────
export function drawThorns(thorns, envIdx, tick) {
  const env = ENVIRONMENTS[envIdx];
  for (const t of thorns) {
    if (!t.active) continue;
    const pulse = 0.6 + 0.4 * Math.sin(tick * 0.1);
    drawBlock(t.x, t.y, `rgba(220,40,40,${pulse})`, '#8b0000', 0, BLOCK_HEIGHT + 2);
    // spikes indicator
    const p = toIso(t.x, t.y);
    ctx.fillStyle = `rgba(255,100,100,${pulse})`;
    ctx.font = '12px serif';
    ctx.textAlign = 'center';
    ctx.fillText('🌵', p.sx, p.sy + 4);
  }
}

// ─── Draw Fruits ────────────────────────────────────
export function drawFruits(fruits, tick) {
  for (const f of fruits) {
    const bob = Math.sin(tick * 0.06 + f.x * 2 + f.y) * 3;
    const scale = 1 + 0.05 * Math.sin(tick * 0.1 + f.x);

    // Glow for rare fruits with sparkle trail
    if (f.temp) {
      const p = toIso(f.x, f.y);
      const gAlpha = 0.3 + 0.2 * Math.sin(tick * 0.08);
      ctx.globalAlpha = gAlpha;
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy + TILE_H * 0.4, TILE_W * 0.5 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Sparkle ring around rare fruit
      for (let s = 0; s < 4; s++) {
        const angle = (s / 4) * Math.PI * 2 + tick * 0.04;
        const sr = TILE_W * 0.45;
        const sx = p.sx + Math.cos(angle) * sr;
        const sy = p.sy + TILE_H * 0.4 + Math.sin(angle) * sr * 0.5;
        ctx.globalAlpha = 0.4 + 0.3 * Math.sin(tick * 0.12 + s);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Blinking when about to expire
      if (f.remaining && f.remaining < 2000) {
        if (Math.floor(tick / 5) % 2 === 0) continue;
      }
    }

    drawBlock(f.x, f.y, lighten(f.color, 40), f.color, bob * 0.05, BLOCK_HEIGHT - 4);
    drawEmojiOnBlock(f.x, f.y, f.emoji, bob * 0.05, Math.round(16 * scale));
  }
}

// ─── Draw Power-Ups ─────────────────────────────────
export function drawPowerUps(powerUps, tick) {
  for (const p of powerUps) {
    const bob = Math.sin(tick * 0.07 + p.x * 3) * 4;
    const pulse = 0.6 + 0.4 * Math.sin(tick * 0.1);

    // Glow circle with rotating ring
    const pos = toIso(p.x, p.y);
    ctx.globalAlpha = pulse * 0.4;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(pos.sx, pos.sy + TILE_H * 0.4, TILE_W * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Rotating dots around power-up
    ctx.globalAlpha = pulse * 0.6;
    for (let d = 0; d < 3; d++) {
      const angle = (d / 3) * Math.PI * 2 + tick * 0.06;
      const dx = Math.cos(angle) * TILE_W * 0.4;
      const dy = Math.sin(angle) * TILE_W * 0.2;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(pos.sx + dx, pos.sy + TILE_H * 0.4 + dy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    drawBlock(p.x, p.y, lighten(p.color, 50), p.color, bob * 0.05, BLOCK_HEIGHT - 2);
    drawEmojiOnBlock(p.x, p.y, p.emoji, bob * 0.05, 16);
  }
}

// ─── Draw HUD ───────────────────────────────────────
export function drawHUD(state, envIdx) {
  const env = ENVIRONMENTS[envIdx];
  const cfg = LEVEL_CONFIG[state.levelIdx];

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Score
  ctx.font = 'bold 20px Nunito, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(`${t.score}: ${state.score}`, W / 2, 8);

  // Lives
  ctx.font = '16px Nunito, sans-serif';
  const livesStr = '❤️'.repeat(state.lives) + '🖤'.repeat(Math.max(0, cfg.lives - state.lives));
  ctx.fillText(livesStr, W / 2, 32);

  // Level name
  ctx.font = '12px Nunito, sans-serif';
  ctx.fillStyle = env.accent;
  const lvlName = t.levelNames[state.levelIdx] || '';
  ctx.textAlign = 'left';
  ctx.fillText(`${t.level} ${state.levelIdx + 1}: ${lvlName}`, 10, 8);

  // Fruit progress
  if (cfg.fruitGoal > 0) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ccc';
    ctx.fillText(`${t.fruits}: ${state.fruitsEaten}/${cfg.fruitGoal}`, W - 10, 8);
  } else {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ccc';
    const laneIdx = Math.max(0, Number(state.endlessLaneIdx) || 0);
    const laneIcon = state.endlessLaneIcon || '♾️';
    ctx.fillText(`${t.endless} ${laneIcon} L${laneIdx + 1}`, W - 10, 8);
  }

  ctx.textAlign = 'center';
}

// ─── Draw Combo Meter ───────────────────────────────
export function drawComboMeter(combo, comboTimer, comboMax, comboWindow, envIdx) {
  if (comboMax <= 1 || combo < 1) return;
  const env = ENVIRONMENTS[envIdx];

  const barW = 140, barH = 10;
  const bx = W / 2 - barW / 2;
  const by = 52;

  // Timer bar background
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.roundRect(bx, by, barW, barH, 5);
  ctx.fill();

  // Timer bar fill
  const fill = comboWindow > 0 ? Math.max(0, comboTimer / comboWindow) : 0;
  if (fill > 0) {
    const grad = ctx.createLinearGradient(bx, by, bx + barW * fill, by);
    if (combo >= 5) {
      // Rainbow gradient for high combos
      grad.addColorStop(0, '#ff6b6b');
      grad.addColorStop(0.25, '#ffd200');
      grad.addColorStop(0.5, '#43e97b');
      grad.addColorStop(0.75, '#4facfe');
      grad.addColorStop(1, '#c471f5');
    } else {
      grad.addColorStop(0, env.accent);
      grad.addColorStop(1, env.glow);
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(bx, by, barW * fill, barH, 5);
    ctx.fill();
  }

  // Combo text
  if (combo > 1) {
    ctx.font = 'bold 16px Nunito, sans-serif';
    const comboGlow = combo >= 5 ? '#ffd200' : env.glow;
    ctx.fillStyle = comboGlow;
    ctx.textAlign = 'center';
    ctx.fillText(`${t.combo} ×${combo}`, W / 2, by + barH + 4);
    if (combo >= 8) {
      ctx.fillText('🌟🔥🌟', W / 2, by + barH + 22);
    } else if (combo >= 5) {
      ctx.fillText('🔥🔥', W / 2, by + barH + 22);
    } else if (combo >= 3) {
      ctx.fillText('🔥', W / 2 + 55, by + barH + 4);
    }
  }
}

// ─── Draw Active Effects ────────────────────────────
export function drawActiveEffects(activeEffects) {
  let yOff = 0;
  const x = 10, baseY = 80;

  for (const e of activeEffects) {
    if (!e.active) continue;
    const pct = e.remaining / e.duration;

    ctx.globalAlpha = 0.8;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.roundRect(x, baseY + yOff, 100, 16, 4);
    ctx.fill();

    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.roundRect(x, baseY + yOff, 100 * pct, 16, 4);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.font = '11px Nunito, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(`${e.emoji} ${Math.ceil(e.remaining / 1000)}s`, x + 4, baseY + yOff + 12);

    yOff += 20;
  }
}

// ─── Particle System ────────────────────────────────
let particles = [];
let scoreFlies = [];

export function spawnParticles(x, y, color, count = 12) {
  const pos = toIso(x, y);
  for (let i = 0; i < count; i++) {
    particles.push({
      x: pos.sx,
      y: pos.sy + TILE_H * 0.4,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.8) * 5,
      r: Math.random() * 4 + 2,
      color,
      life: 1,
      decay: Math.random() * 0.03 + 0.02,
    });
  }
}

export function spawnStarBurst(x, y) {
  const pos = toIso(x, y);
  const colors = ['#ffd200', '#ff6b6b', '#4facfe', '#43e97b', '#c471f5'];
  for (let i = 0; i < 25; i++) {
    const angle = (i / 25) * Math.PI * 2;
    const speed = Math.random() * 5 + 3;
    particles.push({
      x: pos.sx,
      y: pos.sy + TILE_H * 0.4,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: Math.random() * 5 + 2,
      color: colors[i % colors.length],
      life: 1,
      decay: Math.random() * 0.015 + 0.01,
    });
  }
}

export function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15;
    p.life -= p.decay;
    if (p.life <= 0) { particles.splice(i, 1); continue; }

    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ─── Rainbow Trail (combo ×5+) ──────────────────────
export function drawRainbowTrail(snake, tick) {
  if (snake.length < 2) return;
  const trailLen = Math.min(snake.length, 12);
  for (let i = 1; i < trailLen; i++) {
    const seg = snake[i];
    const pos = toIso(seg.x, seg.y);
    const hue = (tick * 4 + i * 30) % 360;
    const alpha = 0.5 * (1 - i / trailLen);
    const size = TILE_W * 0.3 * (1 - i / (trailLen + 2));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `hsl(${hue}, 90%, 60%)`;
    ctx.beginPath();
    ctx.arc(pos.sx, pos.sy + TILE_H * 0.4, size, 0, Math.PI * 2);
    ctx.fill();
    // Sparkle dots
    if (i % 2 === 0) {
      const sparkAngle = tick * 0.1 + i;
      const sx = pos.sx + Math.cos(sparkAngle) * size * 1.5;
      const sy = pos.sy + TILE_H * 0.4 + Math.sin(sparkAngle) * size;
      ctx.globalAlpha = alpha * 0.7;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// ─── Score Fly Animation ────────────────────────────
export function spawnScoreFly(x, y, text, color = '#ffd200') {
  const pos = toIso(x, y);
  scoreFlies.push({
    x: pos.sx, y: pos.sy,
    text, color,
    life: 1, decay: 0.018,
  });
}

export function updateScoreFlies() {
  for (let i = scoreFlies.length - 1; i >= 0; i--) {
    const f = scoreFlies[i];
    f.y -= 1.2;
    f.life -= f.decay;
    if (f.life <= 0) { scoreFlies.splice(i, 1); continue; }
    ctx.globalAlpha = f.life;
    ctx.font = 'bold 16px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.fillText(f.text, f.x + 1, f.y + 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

// ─── Screen Effects ─────────────────────────────────
let flashAlpha = 0, flashColor = '#fff';
let shakeX = 0, shakeY = 0, shakeDur = 0;
let tipTimer = 0, tipText = '';

export function showTip(text, duration = 3000) {
  tipText = text;
  tipTimer = duration;
}

export function drawTip(dt) {
  if (tipTimer <= 0 || !tipText) return;
  tipTimer -= dt;
  const alpha = tipTimer < 500 ? tipTimer / 500 : (tipTimer > 2500 ? (3000 - tipTimer) / 500 : 1);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha)) * 0.9;
  ctx.font = 'bold 13px Nunito, sans-serif';

  // Background pill
  const tw = ctx.measureText(tipText).width;
  const pw = Math.max(tw + 40, 200);
  const px = W / 2 - pw / 2;
  const py = H - 60;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.beginPath();
  if (ctx.roundRect) { ctx.roundRect(px, py, pw, 36, 12); } else { ctx.rect(px, py, pw, 36); }
  ctx.fill();

  // Border accent
  ctx.strokeStyle = 'rgba(255,210,0,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (ctx.roundRect) { ctx.roundRect(px, py, pw, 36, 12); } else { ctx.rect(px, py, pw, 36); }
  ctx.stroke();

  // Tip text
  ctx.fillStyle = '#ffd200';
  ctx.textAlign = 'center';
  ctx.fillText(`💡 ${tipText}`, W / 2, py + 22);

  ctx.restore();
}

export function flash(color = '#fff', duration = 200) {
  flashAlpha = 1;
  flashColor = color;
  setTimeout(() => { flashAlpha = 0; }, duration);
}

export function shake(intensity = 6, duration = 200) {
  shakeDur = duration;
  const start = Date.now();
  (function shakeFrame() {
    const elapsed = Date.now() - start;
    if (elapsed > duration) { shakeX = 0; shakeY = 0; return; }
    const prog = 1 - elapsed / duration;
    shakeX = (Math.random() - 0.5) * intensity * prog;
    shakeY = (Math.random() - 0.5) * intensity * prog;
    requestAnimationFrame(shakeFrame);
  })();
}

export function applyScreenEffects() {
  if (shakeX || shakeY) {
    ctx.translate(shakeX, shakeY);
  }
}

export function drawScreenFlash() {
  if (flashAlpha > 0) {
    ctx.globalAlpha = flashAlpha * 0.3;
    ctx.fillStyle = flashColor;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    flashAlpha *= 0.85;
  }
}

// ─── Toast ──────────────────────────────────────────
let toasts = [];

export function showToast(text, color = '#fff', duration = 1500) {
  toasts.push({ text, color, start: Date.now(), duration, y: H * 0.35 });
}

export function drawToasts() {
  const now = Date.now();
  toasts = toasts.filter(t => now - t.start < t.duration);
  for (const t of toasts) {
    const prog = (now - t.start) / t.duration;
    const yOff = -prog * 40;
    ctx.globalAlpha = 1 - prog;
    ctx.font = 'bold 22px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.fillText(t.text, W / 2 + 1, t.y + yOff + 1);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, W / 2, t.y + yOff);
    ctx.globalAlpha = 1;
  }
}

// ─── Sound System (Web Audio) ───────────────────────
let audioCtx;
function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, dur = 0.1, type = 'square', vol = 0.12) {
  try {
    const a = getAudio();
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, a.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
    osc.connect(gain).connect(a.destination);
    osc.start(); osc.stop(a.currentTime + dur);
  } catch (e) {}
}

// ─── Fruit-Specific Sounds ──────────────────────────
export function playEatApple()  { playTone(523, 0.06, 'square', 0.09); setTimeout(() => playTone(659, 0.06, 'square', 0.07), 50); }
export function playEatOrange() { playTone(587, 0.07, 'triangle', 0.09); setTimeout(() => playTone(740, 0.06, 'triangle', 0.07), 55); }
export function playEatGrape()  { [660,700,740].forEach((f,i) => setTimeout(() => playTone(f, 0.04, 'square', 0.07), i * 35)); }
export function playEatStraw()  { playTone(784, 0.06, 'sine', 0.1); setTimeout(() => playTone(988, 0.08, 'sine', 0.08), 50); }
export function playEatStar()   { [880,988,1100,1320].forEach((f,i) => setTimeout(() => playTone(f, 0.08, 'sine', 0.08), i * 55)); }
export function playEatGem()    { [1047,1175,1319,1480,1568].forEach((f,i) => setTimeout(() => playTone(f, 0.06, 'sine', 0.07), i * 45)); }

const FRUIT_SOUND_MAP = { apple: playEatApple, orange: playEatOrange, grape: playEatGrape, straw: playEatStraw, star: playEatStar, gem: playEatGem };
export function playEatFruit(fruitId) { (FRUIT_SOUND_MAP[fruitId] || playEatApple)(); }

// ─── Combo Escalation Sounds ────────────────────────
export function playCombo(level) {
  const base = 600 + (level || 1) * 60;
  const count = Math.min(level || 2, 6);
  for (let i = 0; i < count; i++) {
    setTimeout(() => playTone(base + i * 80, 0.05, 'triangle', 0.07), i * 40);
  }
  // Big combo fanfare at 5+
  if (level >= 5) {
    setTimeout(() => {
      [1047,1175,1319,1568].forEach((f,i) => setTimeout(() => playTone(f, 0.08, 'sine', 0.06), i * 50));
    }, count * 40 + 50);
  }
}

let companionCueLastAt = 0;
export function playCompanionCue(mood = 'happy', intensity = 1) {
  const now = Date.now();
  if (now - companionCueLastAt < 420) return;
  companionCueLastAt = now;

  const gain = Math.max(0.7, Math.min(1.8, Number(intensity) || 1));
  if (mood === 'wrong') {
    playTone(300, 0.09, 'sine', 0.05 * gain);
    setTimeout(() => playTone(250, 0.11, 'triangle', 0.045 * gain), 80);
    return;
  }
  if (mood === 'alert') {
    playTone(500, 0.06, 'triangle', 0.055 * gain);
    setTimeout(() => playTone(620, 0.06, 'triangle', 0.05 * gain), 70);
    setTimeout(() => playTone(500, 0.06, 'triangle', 0.045 * gain), 140);
    return;
  }
  if (mood === 'wow') {
    [980, 1220, 1480].forEach((f, i) => setTimeout(() => playTone(f, 0.07, 'sine', 0.055 * gain), i * 65));
    return;
  }

  // happy
  playTone(740, 0.06, 'sine', 0.05 * gain);
  setTimeout(() => playTone(960, 0.07, 'sine', 0.045 * gain), 60);
}

// ─── Gentle Death Sounds (kid-friendly) ─────────────
export function playDeath()    { playTone(350, 0.12, 'sine', 0.1); setTimeout(() => playTone(280, 0.15, 'sine', 0.08), 100); }
export function playGameOver() { [400,370,340,300,260].forEach((f,i) => setTimeout(() => playTone(f, 0.12, 'sine', 0.08), i * 100)); }

// ─── Other Sounds ───────────────────────────────────
export function playLevelUp()  { [523,659,784,988,1047,1319].forEach((f,i) => setTimeout(() => playTone(f, 0.1, 'sine', 0.09), i * 80)); }
export function playClick()    { playTone(500, 0.04, 'sine', 0.07); }
export function playPowerUp()  { playTone(600, 0.07, 'sine', 0.1); setTimeout(() => playTone(800, 0.07, 'sine', 0.08), 50); setTimeout(() => playTone(1000, 0.09, 'sine', 0.06), 100); }
export function playMilestone(){ [523,659,784,880,1047,1319].forEach((f,i) => setTimeout(() => playTone(f, 0.08, 'triangle', 0.07), i * 65)); }
export function playShieldHit(){ playTone(500, 0.08, 'triangle', 0.09); setTimeout(() => playTone(700, 0.08, 'sine', 0.07), 70); }
export function playShieldPop(){ [800,600,400,300].forEach((f,i) => setTimeout(() => playTone(f, 0.06, 'sine', 0.06), i * 40)); }
export function playBadge()    { [784,988,1175,1319,1568].forEach((f,i) => setTimeout(() => playTone(f, 0.1, 'sine', 0.08), i * 90)); }
export function playConfetti() { for(let i=0;i<8;i++) setTimeout(() => playTone(800+Math.random()*600,0.04,'sine',0.04), i*30); }
export function playRareSpawn(){ playTone(1200, 0.08, 'sine', 0.07); setTimeout(() => playTone(1400, 0.1, 'sine', 0.06), 80); setTimeout(() => playTone(1200, 0.06, 'sine', 0.05), 160); }
export function playDash()     { playTone(900, 0.04, 'sawtooth', 0.08); setTimeout(() => playTone(1200, 0.06, 'sawtooth', 0.06), 30); }
export function playFreeze()   { [1200,1100,1000,900].forEach((f,i) => setTimeout(() => playTone(f, 0.08, 'sine', 0.06), i * 50)); }
export function playGhost()    { playTone(400, 0.15, 'sine', 0.06); setTimeout(() => playTone(500, 0.15, 'sine', 0.05), 100); }
export function playMagnet()   { [600,700,800,900,1000].forEach((f,i) => setTimeout(() => playTone(f, 0.04, 'triangle', 0.06), i * 30)); }
export function playShrink()   { [800,700,600,500].forEach((f,i) => setTimeout(() => playTone(f, 0.05, 'square', 0.05), i * 40)); }

// ─── Ghost Mode Visual ─────────────────────────────
export function drawGhostOverlay(snake, tick) {
  for (let i = 0; i < snake.length; i++) {
    const seg = snake[i];
    const p = toIso(seg.x, seg.y);
    const phase = Math.sin(tick * 0.08 + i * 0.5) * 0.15;
    ctx.globalAlpha = 0.15 + phase;
    ctx.fillStyle = `hsl(${200 + Math.sin(tick * 0.03 + i) * 30}, 60%, 70%)`;
    ctx.beginPath();
    ctx.arc(p.sx, p.sy + TILE_H * 0.4, TILE_W * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ─── Magnet Field Visual ────────────────────────────
export function drawMagnetField(head, tick) {
  const p = toIso(head.x, head.y);
  const radius = TILE_W * 3;
  const grad = ctx.createRadialGradient(p.sx, p.sy + TILE_H * 0.4, 0, p.sx, p.sy + TILE_H * 0.4, radius);
  grad.addColorStop(0, 'rgba(255,100,100,0.08)');
  grad.addColorStop(0.5, 'rgba(255,50,50,0.03)');
  grad.addColorStop(1, 'rgba(255,0,0,0.0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(p.sx, p.sy + TILE_H * 0.4, radius, 0, Math.PI * 2);
  ctx.fill();

  // Magnetic field lines
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + tick * 0.03;
    const r = radius * (0.3 + 0.3 * Math.sin(tick * 0.05 + i));
    const dx = Math.cos(angle) * r;
    const dy = Math.sin(angle) * r * 0.5;
    ctx.globalAlpha = 0.2 + 0.1 * Math.sin(tick * 0.1 + i);
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(p.sx + dx, p.sy + TILE_H * 0.4 + dy, 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ─── Freeze Visual ──────────────────────────────────
export function drawFreezeOverlay(tick) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, `rgba(150,220,255,${0.05 + 0.02 * Math.sin(tick * 0.03)})`);
  grad.addColorStop(0.5, 'rgba(150,220,255,0.0)');
  grad.addColorStop(1, `rgba(150,220,255,${0.03 + 0.02 * Math.sin(tick * 0.03 + 1)})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}
