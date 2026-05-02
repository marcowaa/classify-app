/* ─── Match-3 Royal Puzzle — Game Board Component ─── */
/* Canvas-rendered game with animations & particles   */

import { useRef, useEffect, useCallback, useState } from 'react';
import {
  Gem, GemType, SpecialType, Pos, MatchGroup,
  GemVisual, Particle, ScorePopup,
  GEM_STYLES, SPECIAL_COLORS,
  type LevelData, type LevelObjective,
} from './types';
import * as E from './engine';

/* ─── Constants ─── */
const BOARD_PAD = 6;
const CELL_PAD  = 2;
const SWAP_MS   = 180;
const REMOVE_MS = 220;
const FALL_MS   = 100; // per cell distance
const SPAWN_MS  = 180;
const BG_COLOR  = '#1a1a2e'; // deep royal dark blue
const BOARD_BG  = '#FFFFFF';
const CELL_LIGHT = '#F0F4FF';
const CELL_DARK  = '#E2E8F0';
const GEM_FILL_RATIO = 0.88; // gems fill 88% of cell

/* ─── Floating Background Emoji ─── */
const BG_EMOJIS = ['💎', '⭐', '✨', '🌟', '💫', '🔮', '👑', '🏆'];
interface FloatingEmoji {
  x: number; y: number; vx: number; vy: number;
  emoji: string; size: number; opacity: number; rotation: number; rotSpeed: number;
}

/* ─── Celebration Confetti ─── */
const CONFETTI_COLORS = ['#FF1744', '#FFAB00', '#00E676', '#2979FF', '#D500F9', '#1DE9B6',
  '#FF6D00', '#FFD600', '#76FF03', '#448AFF', '#E040FB', '#64FFDA'];
interface Confetti {
  x: number; y: number; vx: number; vy: number;
  size: number; color: string; rotation: number; rotSpeed: number;
  life: number; shape: 'rect' | 'circle' | 'star';
}

/* ─── Easing Functions ─── */
const easeOutQuad  = (t: number) => 1 - (1 - t) * (1 - t);
const easeOutBack  = (t: number) => { const s = 1.7; return (t -= 1) * t * ((s + 1) * t + s) + 1; };
const easeOutBounce = (t: number) => {
  if (t < 1 / 2.75) return 7.5625 * t * t;
  if (t < 2 / 2.75) { t -= 1.5 / 2.75; return 7.5625 * t * t + 0.75; }
  if (t < 2.5 / 2.75) { t -= 2.25 / 2.75; return 7.5625 * t * t + 0.9375; }
  t -= 2.625 / 2.75; return 7.5625 * t * t + 0.984375;
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ─── Animation Phase ─── */
enum Phase { Idle, Swapping, SwapBack, Removing, Falling, Checking, GameOver }

/* ─── Tween ─── */
interface Tween {
  gemId: number;
  prop: 'x' | 'y' | 'scale' | 'opacity';
  from: number; to: number;
  start: number; dur: number;
  ease: (t: number) => number;
}

/* ─── Props ─── */
interface Props {
  level: LevelData;
  onBack: () => void;
  onComplete: (stars: number, score: number) => void;
}

/* ─── Helper: pixel position from grid coords ─── */
function cellCenter(row: number, col: number, cellSize: number, offsetX: number, offsetY: number) {
  return {
    x: offsetX + col * cellSize + cellSize / 2,
    y: offsetY + row * cellSize + cellSize / 2,
  };
}

/* ─── Helper: grid coords from pixel ─── */
function pixelToGrid(
  px: number, py: number, cellSize: number, offsetX: number, offsetY: number, rows: number, cols: number,
): Pos | null {
  const col = Math.floor((px - offsetX) / cellSize);
  const row = Math.floor((py - offsetY) / cellSize);
  if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
  return { row, col };
}

/* ─── Drawing Helpers ─── */
function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawGemShape(ctx: CanvasRenderingContext2D, shape: string, cx: number, cy: number, r: number) {
  ctx.beginPath();
  switch (shape) {
    case 'circle':
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      break;
    case 'diamond':
      ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy);
      ctx.closePath();
      break;
    case 'square':
      drawRoundRect(ctx, cx - r * 0.75, cy - r * 0.75, r * 1.5, r * 1.5, r * 0.2);
      break;
    case 'triangle':
      ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.9, cy + r * 0.7);
      ctx.lineTo(cx - r * 0.9, cy + r * 0.7); ctx.closePath();
      break;
    case 'hex': {
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case 'star': {
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? r : r * 0.45;
        const px = cx + rad * Math.cos(a), py = cy + rad * Math.sin(a);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
  }
}

/* ═══════════════════════════════════════════════
   ███  MAIN COMPONENT
   ═══════════════════════════════════════════════ */

export default function Match3Game({ level, onBack, onComplete }: Props) {
  /* ── React state (for HUD) ── */
  const [score, setScore]         = useState(0);
  const [movesLeft, setMovesLeft] = useState(level.moves);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [objectives, setObjectives] = useState<(LevelObjective & { current: number })[]>(
    () => level.objectives.map(o => ({ ...o, current: 0 })),
  );
  const [combo, setCombo] = useState(0);
  const [stars, setStars] = useState(0);

  /* ── Refs for game loop ── */
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const gridRef      = useRef<(Gem | null)[][]>([]);
  const visualsRef   = useRef<Map<number, GemVisual>>(new Map());
  const tweensRef    = useRef<Tween[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const popupsRef    = useRef<ScorePopup[]>([]);
  const phaseRef     = useRef<Phase>(Phase.Idle);
  const selectedRef  = useRef<Pos | null>(null);
  const swapRef      = useRef<[Pos, Pos] | null>(null);
  const comboRef     = useRef(0);
  const scoreRef     = useRef(0);
  const movesRef     = useRef(level.moves);
  const objRef       = useRef(level.objectives.map(o => ({ ...o, current: 0 })));
  const cellSizeRef  = useRef(0);
  const boardXRef    = useRef(0);
  const boardYRef    = useRef(0);
  const shakeRef     = useRef({ x: 0, y: 0, t: 0 });
  const touchRef     = useRef<{ x: number; y: number; pos: Pos | null } | null>(null);
  const dprRef       = useRef(1);
  const endedRef     = useRef(false);
  const bgEmojisRef  = useRef<FloatingEmoji[]>([]);
  const confettiRef  = useRef<Confetti[]>([]);
  const celebrateRef = useRef(false);
  const idleTimeRef  = useRef(0);
  const [muted, setMuted] = useState(false);
  const mutedRef     = useRef(false);
  const audioCtxRef  = useRef<AudioContext | null>(null);

  /* ── Helpers ── */
  const addTween = useCallback((
    gemId: number, prop: Tween['prop'],
    from: number, to: number, dur: number, ease: (t: number) => number, delay = 0,
  ) => {
    tweensRef.current.push({ gemId, prop, from, to, start: performance.now() + delay, dur, ease });
  }, []);

  const spawnParticles = useCallback((x: number, y: number, color: string, count = 8) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 1.5 + Math.random() * 2.5;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        color,
        life: 1,
        maxLife: 1,
      });
    }
  }, []);

  const addPopup = useCallback((x: number, y: number, text: string, color: string) => {
    popupsRef.current.push({ x, y, text, color, life: 1, maxLife: 1 });
  }, []);

  /* ── Web Audio Sound System ── */
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const playTone = useCallback((freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15) => {
    if (mutedRef.current) return;
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + dur);
    } catch { /* silent fail */ }
  }, [getAudioCtx]);

  const playSwapSound = useCallback(() => {
    playTone(440, 0.12, 'sine', 0.12);
    setTimeout(() => playTone(554, 0.1, 'sine', 0.1), 40);
  }, [playTone]);

  const playMatchSound = useCallback((combo: number) => {
    const base = 523 + combo * 80;
    playTone(base, 0.15, 'triangle', 0.12);
    setTimeout(() => playTone(base * 1.25, 0.12, 'triangle', 0.1), 60);
    setTimeout(() => playTone(base * 1.5, 0.1, 'triangle', 0.08), 120);
  }, [playTone]);

  const playSpecialSound = useCallback(() => {
    playTone(880, 0.2, 'square', 0.08);
    setTimeout(() => playTone(1100, 0.15, 'square', 0.06), 80);
    setTimeout(() => playTone(1320, 0.25, 'sine', 0.1), 160);
  }, [playTone]);

  const playWinSound = useCallback(() => {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => setTimeout(() => playTone(n, 0.3, 'sine', 0.12), i * 120));
  }, [playTone]);

  const playLoseSound = useCallback(() => {
    playTone(392, 0.3, 'sine', 0.1);
    setTimeout(() => playTone(349, 0.3, 'sine', 0.1), 200);
    setTimeout(() => playTone(330, 0.5, 'sine', 0.08), 400);
  }, [playTone]);

  const playSelectSound = useCallback(() => {
    playTone(660, 0.08, 'sine', 0.1);
  }, [playTone]);

  const getVisual = useCallback((gem: Gem): GemVisual => {
    let v = visualsRef.current.get(gem.id);
    if (!v) {
      const cs = cellSizeRef.current;
      const { x, y } = cellCenter(gem.row, gem.col, cs, boardXRef.current, boardYRef.current);
      v = { x, y, scale: 1, opacity: 1 };
      visualsRef.current.set(gem.id, v);
    }
    return v;
  }, []);

  /* ── Initialisation ── */
  useEffect(() => {
    E.resetIdCounter();
    const grid = E.initGrid(level);
    gridRef.current = grid;
    visualsRef.current.clear();
    celebrateRef.current = false;
    confettiRef.current = [];

    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;

    // Initialize floating background emojis
    const floaters: FloatingEmoji[] = [];
    for (let i = 0; i < 20; i++) {
      floaters.push({
        x: Math.random() * 500,
        y: Math.random() * 900,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.2 - Math.random() * 0.4,
        emoji: BG_EMOJIS[Math.floor(Math.random() * BG_EMOJIS.length)],
        size: 10 + Math.random() * 16,
        opacity: 0.08 + Math.random() * 0.12,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02,
      });
    }
    bgEmojisRef.current = floaters;

    const resize = () => {
      const w = Math.min(window.innerWidth, 500);
      const h = window.innerHeight;
      canvas.style.width  = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width  = w * dpr;
      canvas.height = h * dpr;

      const boardW = w - BOARD_PAD * 2;
      const cs = Math.floor(boardW / level.cols);
      cellSizeRef.current = cs;
      boardXRef.current = Math.floor((w - cs * level.cols) / 2);
      boardYRef.current = 100; // space for HUD

      // init visuals for all gems
      for (let r = 0; r < level.rows; r++)
        for (let c = 0; c < level.cols; c++) {
          const gem = grid[r][c];
          if (gem) {
            const { x, y } = cellCenter(r, c, cs, boardXRef.current, boardYRef.current);
            visualsRef.current.set(gem.id, { x, y, scale: 1, opacity: 1 });
          }
        }
    };
    resize();
    window.addEventListener('resize', resize);

    /* ── Game Loop ── */
    let raf = 0;
    const loop = () => {
      const now = performance.now();
      update(now);
      render(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  /* ═══════════════════════════════════
     UPDATE LOOP
     ═══════════════════════════════════ */
  const update = useCallback((now: number) => {
    // Apply tweens
    const tweens = tweensRef.current;
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      if (now < tw.start) continue;
      const elapsed = now - tw.start;
      const t = Math.min(1, elapsed / tw.dur);
      const v = visualsRef.current.get(tw.gemId);
      if (v) (v as any)[tw.prop] = lerp(tw.from, tw.to, tw.ease(t));
      if (t >= 1) tweens.splice(i, 1);
    }

    // Update particles
    const parts = particlesRef.current;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.08; // gravity
      p.life -= 0.02;
      if (p.life <= 0) parts.splice(i, 1);
    }

    // Update popups
    const pops = popupsRef.current;
    for (let i = pops.length - 1; i >= 0; i--) {
      pops[i].y -= 0.8;
      pops[i].life -= 0.018;
      if (pops[i].life <= 0) pops.splice(i, 1);
    }

    // Update floating background emojis
    const canvas = canvasRef.current;
    const cW = canvas ? canvas.width / dprRef.current : 500;
    const cH = canvas ? canvas.height / dprRef.current : 900;
    for (const fe of bgEmojisRef.current) {
      fe.x += fe.vx;
      fe.y += fe.vy;
      fe.rotation += fe.rotSpeed;
      if (fe.y < -30) { fe.y = cH + 30; fe.x = Math.random() * cW; }
      if (fe.x < -30) fe.x = cW + 30;
      if (fe.x > cW + 30) fe.x = -30;
    }

    // Update confetti (celebration)
    const conf = confettiRef.current;
    for (let i = conf.length - 1; i >= 0; i--) {
      const c = conf[i];
      c.x += c.vx; c.y += c.vy;
      c.vy += 0.12;
      c.vx *= 0.99;
      c.rotation += c.rotSpeed;
      c.life -= 0.008;
      if (c.life <= 0) conf.splice(i, 1);
    }

    // Idle time tracking (for breathing animation)
    if (phaseRef.current === Phase.Idle) {
      idleTimeRef.current += 16;
    } else {
      idleTimeRef.current = 0;
    }

    // Shake decay
    const shk = shakeRef.current;
    if (shk.t > 0) {
      shk.t -= 0.05;
      shk.x = (Math.random() - 0.5) * shk.t * 6;
      shk.y = (Math.random() - 0.5) * shk.t * 6;
    } else {
      shk.x = 0; shk.y = 0;
    }

    // Phase transitions
    const allDone = tweens.length === 0;
    const phase = phaseRef.current;
    const grid = gridRef.current as (Gem | null)[][];

    if (phase === Phase.Swapping && allDone) {
      const matches = E.findMatches(grid);
      if (matches.length === 0) {
        // Swap back
        const [a, b] = swapRef.current!;
        E.swapGems(grid as Gem[][], a, b);
        animateSwap(a, b);
        phaseRef.current = Phase.SwapBack;
      } else {
        comboRef.current = 0;
        startRemoval(matches);
      }
    }

    if (phase === Phase.SwapBack && allDone) {
      selectedRef.current = null;
      phaseRef.current = Phase.Idle;
    }

    if (phase === Phase.Removing && allDone) {
      startFall();
    }

    if (phase === Phase.Falling && allDone) {
      phaseRef.current = Phase.Checking;
    }

    if (phase === Phase.Checking) {
      const matches = E.findMatches(grid);
      if (matches.length > 0) {
        comboRef.current++;
        startRemoval(matches);
      } else {
        // Turn complete
        movesRef.current--;
        setMovesLeft(movesRef.current);
        setObjectives([...objRef.current]);

        const sc = scoreRef.current;
        const st = E.calcStars(sc, level.stars);
        setStars(st);

        if (E.objectivesComplete(objRef.current, sc)) {
          phaseRef.current = Phase.GameOver;
          if (!endedRef.current) {
            endedRef.current = true;
            setGameState('won');
            celebrateRef.current = true;
            spawnCelebration();
            playWinSound();
            setTimeout(() => onComplete(st, sc), 600);
          }
        } else if (movesRef.current <= 0) {
          phaseRef.current = Phase.GameOver;
          if (!endedRef.current) {
            endedRef.current = true;
            setGameState('lost');
            playLoseSound();
          }
        } else {
          phaseRef.current = Phase.Idle;
          selectedRef.current = null;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  /* ── Spawn Celebration Confetti ── */
  const spawnCelebration = useCallback(() => {
    const canvas = canvasRef.current;
    const cW = canvas ? canvas.width / dprRef.current : 500;
    for (let i = 0; i < 80; i++) {
      const shapes: Confetti['shape'][] = ['rect', 'circle', 'star'];
      confettiRef.current.push({
        x: Math.random() * cW,
        y: -20 - Math.random() * 100,
        vx: (Math.random() - 0.5) * 6,
        vy: 2 + Math.random() * 4,
        size: 4 + Math.random() * 6,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        life: 1,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
      });
    }
  }, []);

  /* ── Start Removal Phase ── */
  const startRemoval = useCallback((matches: MatchGroup[]) => {
    phaseRef.current = Phase.Removing;
    const grid = gridRef.current as (Gem | null)[][];
    const cs = cellSizeRef.current;
    const bx = boardXRef.current, by = boardYRef.current;

    // Save gem types before processing
    const prevTypes = new Map<string, GemType>();
    for (let r = 0; r < level.rows; r++)
      for (let c = 0; c < level.cols; c++) {
        const g = grid[r][c];
        if (g) prevTypes.set(`${r},${c}`, g.type);
      }

    const swapPos = swapRef.current ? swapRef.current[0] : undefined;
    const { removed, specials } = E.processMatches(grid, matches, swapPos);

    // Score
    const pts = E.calcScore(matches, comboRef.current);
    scoreRef.current += pts;
    setScore(scoreRef.current);
    setCombo(comboRef.current);

    // Update objectives
    E.updateObjectives(objRef.current, removed, grid, prevTypes);

    // Animate removal + particles
    for (const key of removed) {
      const [r, c] = key.split(',').map(Number);
      const isSpecialSpot = specials.some(s => s.pos.row === r && s.pos.col === c);
      const { x, y } = cellCenter(r, c, cs, bx, by);

      // Find the gem visual (may already be null in grid)
      const gemType = prevTypes.get(key);
      const style = gemType !== undefined ? GEM_STYLES[gemType] : null;

      if (!isSpecialSpot) {
        // Find visual by scanning all visuals for this position
        for (const [id, vis] of visualsRef.current) {
          if (Math.abs(vis.x - x) < cs && Math.abs(vis.y - y) < cs) {
            addTween(id, 'scale', vis.scale, 0, REMOVE_MS, easeOutQuad);
            addTween(id, 'opacity', 1, 0, REMOVE_MS, easeOutQuad);
          }
        }
      }

      if (style) spawnParticles(x, y, style.bg, 16);
    }

    // Play match sound
    playMatchSound(comboRef.current);
    if (specials.length > 0) playSpecialSound();

    // Score popup
    if (removed.size > 0) {
      const first = [...removed][0].split(',').map(Number);
      const { x, y } = cellCenter(first[0], first[1], cs, bx, by);
      addPopup(x, y, `+${pts}`, comboRef.current > 0 ? '#FFD700' : '#FFFFFF');
    }

    // Shake on big combos
    if (comboRef.current >= 2 || removed.size >= 6) {
      shakeRef.current.t = Math.min(1, 0.3 + comboRef.current * 0.15);
    }

    // Animate new specials spawning
    for (const s of specials) {
      const newGem = grid[s.pos.row]![s.pos.col]!;
      const vis = getVisual(newGem);
      vis.scale = 0;
      addTween(newGem.id, 'scale', 0, 1, SPAWN_MS, easeOutBack, REMOVE_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, addTween, spawnParticles, addPopup, getVisual]);

  /* ── Start Fall Phase ── */
  const startFall = useCallback(() => {
    phaseRef.current = Phase.Falling;
    const grid = gridRef.current as (Gem | null)[][];
    const cs = cellSizeRef.current;
    const bx = boardXRef.current, by = boardYRef.current;

    // Clean up old visuals for removed gems
    const activeIds = new Set<number>();
    for (let r = 0; r < level.rows; r++)
      for (let c = 0; c < level.cols; c++) {
        const g = grid[r][c];
        if (g) activeIds.add(g.id);
      }
    for (const id of visualsRef.current.keys()) {
      if (!activeIds.has(id)) visualsRef.current.delete(id);
    }

    const falls = E.applyGravity(grid, level);

    for (const f of falls) {
      const vis = getVisual(f.gem);
      const fromY = by + f.fromRow * cs + cs / 2;
      const toY   = by + f.toRow * cs + cs / 2;
      const toX   = bx + f.col * cs + cs / 2;
      vis.x = toX;
      vis.y = fromY;
      const dist = Math.abs(f.toRow - f.fromRow);
      const dur = FALL_MS * dist;

      addTween(f.gem.id, 'y', fromY, toY, dur, easeOutBounce);

      if (f.isNew) {
        vis.scale = 0.5; vis.opacity = 0;
        addTween(f.gem.id, 'scale', 0.5, 1, SPAWN_MS, easeOutBack, dur * 0.3);
        addTween(f.gem.id, 'opacity', 0, 1, SPAWN_MS * 0.6, easeOutQuad, dur * 0.2);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, addTween, getVisual]);

  /* ── Animate Swap ── */
  const animateSwap = useCallback((a: Pos, b: Pos) => {
    const cs = cellSizeRef.current;
    const bx = boardXRef.current, by = boardYRef.current;
    const grid = gridRef.current as Gem[][];

    const gemA = grid[a.row][a.col];
    const gemB = grid[b.row][b.col];
    const posA = cellCenter(a.row, a.col, cs, bx, by);
    const posB = cellCenter(b.row, b.col, cs, bx, by);

    const visA = getVisual(gemA);
    const visB = getVisual(gemB);

    addTween(gemA.id, 'x', visA.x, posA.x, SWAP_MS, easeOutQuad);
    addTween(gemA.id, 'y', visA.y, posA.y, SWAP_MS, easeOutQuad);
    addTween(gemB.id, 'x', visB.x, posB.x, SWAP_MS, easeOutQuad);
    addTween(gemB.id, 'y', visB.y, posB.y, SWAP_MS, easeOutQuad);
  }, [addTween, getVisual]);

  /* ═══════════════════════════════════
     RENDER LOOP
     ═══════════════════════════════════ */
  const render = useCallback((now: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = dprRef.current;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const cs = cellSizeRef.current;
    const bx = boardXRef.current;
    const by = boardYRef.current;
    const shk = shakeRef.current;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Background — deep royal gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#1a1a2e');
    bgGrad.addColorStop(0.4, '#16213e');
    bgGrad.addColorStop(0.7, '#0f3460');
    bgGrad.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Floating background emojis
    for (const fe of bgEmojisRef.current) {
      ctx.save();
      ctx.globalAlpha = fe.opacity;
      ctx.translate(fe.x, fe.y);
      ctx.rotate(fe.rotation);
      ctx.font = `${fe.size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fe.emoji, 0, 0);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(shk.x, shk.y);

    // Board background — solid white with shadow
    const boardW = cs * level.cols;
    const boardH = cs * level.rows;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = BOARD_BG;
    drawRoundRect(ctx, bx - 4, by - 4, boardW + 8, boardH + 8, 14);
    ctx.fill();
    ctx.restore();

    // Board border — golden
    ctx.strokeStyle = 'rgba(255,215,0,0.4)';
    ctx.lineWidth = 2;
    drawRoundRect(ctx, bx - 4, by - 4, boardW + 8, boardH + 8, 14);
    ctx.stroke();

    // Checkerboard cells
    for (let r = 0; r < level.rows; r++) {
      for (let c = 0; c < level.cols; c++) {
        const isLight = (r + c) % 2 === 0;
        ctx.fillStyle = isLight ? CELL_LIGHT : CELL_DARK;
        const cx = bx + c * cs;
        const cy = by + r * cs;
        // Rounded corners for edge cells
        const rad = 0;
        if (r === 0 && c === 0) {
          drawRoundRect(ctx, cx, cy, cs, cs, 10); ctx.fill();
        } else if (r === 0 && c === level.cols - 1) {
          drawRoundRect(ctx, cx, cy, cs, cs, 10); ctx.fill();
        } else if (r === level.rows - 1 && c === 0) {
          drawRoundRect(ctx, cx, cy, cs, cs, 10); ctx.fill();
        } else if (r === level.rows - 1 && c === level.cols - 1) {
          drawRoundRect(ctx, cx, cy, cs, cs, 10); ctx.fill();
        } else {
          ctx.fillRect(cx, cy, cs, cs);
        }
      }
    }

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 0.5;
    for (let r = 1; r < level.rows; r++) {
      ctx.beginPath();
      ctx.moveTo(bx, by + r * cs);
      ctx.lineTo(bx + boardW, by + r * cs);
      ctx.stroke();
    }
    for (let c = 1; c < level.cols; c++) {
      ctx.beginPath();
      ctx.moveTo(bx + c * cs, by);
      ctx.lineTo(bx + c * cs, by + boardH);
      ctx.stroke();
    }

    // Selected cell highlight — golden glow
    const sel = selectedRef.current;
    if (sel) {
      const pulse = 0.5 + Math.sin(now / 200) * 0.2;
      ctx.save();
      ctx.shadowColor = 'rgba(255,215,0,0.6)';
      ctx.shadowBlur = 12;
      ctx.fillStyle = `rgba(255,215,0,${0.15 + pulse * 0.1})`;
      drawRoundRect(ctx, bx + sel.col * cs + 1, by + sel.row * cs + 1, cs - 2, cs - 2, 6);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,215,0,${0.6 + pulse * 0.3})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }

    // Idle breathing animation factor
    const breatheScale = phaseRef.current === Phase.Idle && idleTimeRef.current > 500
      ? 1 + Math.sin(now / 800) * 0.03 : 1;

    // Draw gems
    const grid = gridRef.current;
    for (let r = 0; r < level.rows; r++) {
      for (let c = 0; c < level.cols; c++) {
        const gem = grid[r]?.[c];
        if (!gem) continue;
        const vis = visualsRef.current.get(gem.id);
        if (!vis || vis.opacity <= 0.01) continue;

        const style = GEM_STYLES[gem.type];
        const baseSz = (cs - CELL_PAD * 2) * GEM_FILL_RATIO * vis.scale * breatheScale;
        if (baseSz <= 0) continue;
        // Shape-specific size compensation
        let sz = baseSz;
        if (style.shape === 'star') sz *= 1.05;
        if (style.shape === 'triangle') sz *= 1.08;

        ctx.save();
        ctx.globalAlpha = vis.opacity;
        ctx.translate(vis.x, vis.y);

        // Dark border (drawn slightly larger behind the gem)
        ctx.shadowColor = style.glow;
        ctx.shadowBlur = 10 * vis.scale;
        ctx.fillStyle = style.darkBg;
        drawGemShape(ctx, style.shape, 0, 0, sz + 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Main gem with gradient
        const grad = ctx.createRadialGradient(-sz * 0.2, -sz * 0.25, sz * 0.1, 0, 0, sz);
        grad.addColorStop(0, style.light);
        grad.addColorStop(0.5, style.bg);
        grad.addColorStop(1, style.darkBg);
        ctx.fillStyle = grad;
        drawGemShape(ctx, style.shape, 0, 0, sz);
        ctx.fill();

        // White outline for pop
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1.5;
        drawGemShape(ctx, style.shape, 0, 0, sz);
        ctx.stroke();

        // Glossy highlight
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.ellipse(-sz * 0.1, -sz * 0.28, sz * 0.45, sz * 0.18, -0.15, 0, Math.PI * 2);
        ctx.fill();

        // Emoji on gem
        ctx.font = `${sz * 0.6}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = vis.opacity * 0.85;
        ctx.fillText(style.emoji, 0, 1);
        ctx.globalAlpha = vis.opacity;

        // Shimmer / sparkle effect (subtle moving highlight)
        const shimmerPhase = (now / 1500 + r * 0.3 + c * 0.3) % 1;
        if (shimmerPhase < 0.3 && phaseRef.current === Phase.Idle) {
          const shimmerX = -sz + shimmerPhase * sz * 6.67;
          ctx.save();
          ctx.beginPath();
          drawGemShape(ctx, style.shape, 0, 0, sz);
          ctx.clip();
          const shimGrad = ctx.createLinearGradient(shimmerX - sz * 0.4, 0, shimmerX + sz * 0.4, 0);
          shimGrad.addColorStop(0, 'rgba(255,255,255,0)');
          shimGrad.addColorStop(0.5, 'rgba(255,255,255,0.25)');
          shimGrad.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = shimGrad;
          ctx.fillRect(-sz, -sz, sz * 2, sz * 2);
          ctx.restore();
        }

        // Special indicator
        if (gem.special !== SpecialType.None) {
          ctx.strokeStyle = SPECIAL_COLORS[gem.special];
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, sz + 4, 0, Math.PI * 2);
          ctx.stroke();

          if (gem.special === SpecialType.RocketH) {
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.moveTo(-sz * 0.6, 0); ctx.lineTo(-sz * 0.2, -sz * 0.25);
            ctx.lineTo(-sz * 0.2, sz * 0.25); ctx.closePath(); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(sz * 0.6, 0); ctx.lineTo(sz * 0.2, -sz * 0.25);
            ctx.lineTo(sz * 0.2, sz * 0.25); ctx.closePath(); ctx.fill();
          } else if (gem.special === SpecialType.RocketV) {
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.moveTo(0, -sz * 0.6); ctx.lineTo(-sz * 0.25, -sz * 0.2);
            ctx.lineTo(sz * 0.25, -sz * 0.2); ctx.closePath(); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(0, sz * 0.6); ctx.lineTo(-sz * 0.25, sz * 0.2);
            ctx.lineTo(sz * 0.25, sz * 0.2); ctx.closePath(); ctx.fill();
          } else if (gem.special === SpecialType.Bomb) {
            ctx.strokeStyle = '#FF6348';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath(); ctx.arc(0, 0, sz + 7, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
          } else if (gem.special === SpecialType.Rainbow) {
            const t = (now % 2000) / 2000;
            const rainbow = ctx.createConicGradient(t * Math.PI * 2, 0, 0);
            rainbow.addColorStop(0, '#FF0000'); rainbow.addColorStop(0.17, '#FF8800');
            rainbow.addColorStop(0.33, '#FFFF00'); rainbow.addColorStop(0.5, '#00FF00');
            rainbow.addColorStop(0.67, '#0088FF'); rainbow.addColorStop(0.83, '#8800FF');
            rainbow.addColorStop(1, '#FF0000');
            ctx.strokeStyle = rainbow;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(0, 0, sz + 5, 0, Math.PI * 2); ctx.stroke();
          }
        }

        ctx.restore();
      }
    }

    // Particles — larger + more vibrant
    for (const p of particlesRef.current) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      const sz = p.size * (0.5 + 0.5 * (p.life / p.maxLife));
      ctx.beginPath();
      ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
      ctx.fill();
      // Add glow to particles
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;

    // Score popups — with glow
    for (const pop of popupsRef.current) {
      ctx.globalAlpha = Math.max(0, pop.life);
      ctx.fillStyle = pop.color;
      ctx.font = `bold ${18 + (1 - pop.life) * 10}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = pop.color;
      ctx.shadowBlur = 8;
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;

    ctx.restore(); // shake transform

    // Confetti (celebration overlay — drawn after shake restore so it's stable)
    if (confettiRef.current.length > 0) {
      for (const c of confettiRef.current) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, c.life);
        ctx.translate(c.x, c.y);
        ctx.rotate(c.rotation);
        ctx.fillStyle = c.color;
        if (c.shape === 'rect') {
          ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
        } else if (c.shape === 'circle') {
          ctx.beginPath(); ctx.arc(0, 0, c.size / 2, 0, Math.PI * 2); ctx.fill();
        } else {
          // star shape
          ctx.beginPath();
          for (let i = 0; i < 10; i++) {
            const a = (Math.PI / 5) * i - Math.PI / 2;
            const rad = i % 2 === 0 ? c.size / 2 : c.size / 4;
            i === 0 ? ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad)
                     : ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
          }
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    // HUD on canvas — Star progress bar
    const barX = bx, barY = by - 28, barW = boardW, barH = 8;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    drawRoundRect(ctx, barX, barY, barW, barH, 4); ctx.fill();

    const sc = scoreRef.current;
    const maxStar = level.stars[2];
    const fill = Math.min(1, sc / maxStar);
    const starGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    starGrad.addColorStop(0, '#FFD700'); starGrad.addColorStop(1, '#FFA502');
    ctx.fillStyle = starGrad;
    drawRoundRect(ctx, barX, barY, barW * fill, barH, 4); ctx.fill();

    // Star markers
    for (let i = 0; i < 3; i++) {
      const sx = barX + (level.stars[i] / maxStar) * barW;
      const earned = sc >= level.stars[i];
      ctx.fillStyle = earned ? '#FFD700' : 'rgba(255,255,255,0.3)';
      ctx.font = `${earned ? 16 : 12}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('⭐', sx, barY - 4);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  /* ═══════════════════════════════════
     INPUT HANDLERS
     ═══════════════════════════════════ */
  const getCanvasPos = useCallback((e: React.TouchEvent | React.MouseEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : (e as React.MouseEvent).clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const handlePointerDown = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (phaseRef.current !== Phase.Idle) return;
    const pos = getCanvasPos(e);
    if (!pos) return;
    const gridPos = pixelToGrid(pos.x, pos.y, cellSizeRef.current, boardXRef.current, boardYRef.current, level.rows, level.cols);
    touchRef.current = { x: pos.x, y: pos.y, pos: gridPos };
  }, [getCanvasPos, level]);

  const handlePointerMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!touchRef.current || phaseRef.current !== Phase.Idle) return;
    const pos = getCanvasPos(e);
    if (!pos || !touchRef.current.pos) return;
    const dx = pos.x - touchRef.current.x;
    const dy = pos.y - touchRef.current.y;
    const threshold = cellSizeRef.current * 0.3;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

    // Determine swipe direction
    const from = touchRef.current.pos;
    let to: Pos;
    if (Math.abs(dx) > Math.abs(dy)) {
      to = { row: from.row, col: from.col + (dx > 0 ? 1 : -1) };
    } else {
      to = { row: from.row + (dy > 0 ? 1 : -1), col: from.col };
    }

    touchRef.current = null;
    if (to.row < 0 || to.row >= level.rows || to.col < 0 || to.col >= level.cols) return;
    doSwap(from, to);
  }, [getCanvasPos, level]);

  const handlePointerUp = useCallback(() => {
    if (!touchRef.current || phaseRef.current !== Phase.Idle) { touchRef.current = null; return; }
    const tapped = touchRef.current.pos;
    touchRef.current = null;
    if (!tapped) return;

    if (selectedRef.current) {
      if (E.areAdjacent(selectedRef.current, tapped)) {
        doSwap(selectedRef.current, tapped);
      } else {
        selectedRef.current = tapped;
        playSelectSound();
      }
    } else {
      selectedRef.current = tapped;
      playSelectSound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSwap = useCallback((a: Pos, b: Pos) => {
    if (phaseRef.current !== Phase.Idle) return;
    const grid = gridRef.current as Gem[][];
    selectedRef.current = null;
    swapRef.current = [a, b];
    E.swapGems(grid, a, b);
    animateSwap(a, b);
    phaseRef.current = Phase.Swapping;
    playSwapSound();
  }, [animateSwap, playSwapSound]);

  /* ═══════════════════════════════════
     JSX RENDER
     ═══════════════════════════════════ */
  const starIcons = [0, 1, 2].map(i => (
    <span key={i} className={`text-xl ${stars > i ? 'text-yellow-300' : 'text-white/40'}`}>⭐</span>
  ));

  return (
    <div className="relative w-full h-screen overflow-hidden select-none" style={{ background: BG_COLOR }}>
      {/* HUD Overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 px-3 pt-3 pb-1 flex items-center justify-between text-white"
        style={{ background: 'linear-gradient(180deg, rgba(15,52,96,0.95) 0%, transparent 100%)' }}>
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-lg backdrop-blur-sm"
        >
          ←
        </button>

        <div className="flex flex-col items-center">
          <span className="text-[10px] text-yellow-300/90 font-medium">المستوى {level.id}</span>
          <span className="text-sm font-bold bg-gradient-to-r from-yellow-200 to-amber-300 bg-clip-text text-transparent">{level.name}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setMuted(m => !m); mutedRef.current = !mutedRef.current; }}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-sm backdrop-blur-sm"
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-yellow-300/90">الحركات</span>
            <span className={`text-lg font-bold ${movesLeft <= 3 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
              {movesLeft}
            </span>
          </div>
        </div>
      </div>

      {/* Score + Stars */}
      <div className="absolute top-[52px] left-0 right-0 z-10 px-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-1">{starIcons}</div>
        <div className="text-sm font-bold text-yellow-300 drop-shadow-lg">{score.toLocaleString()}</div>
        {combo > 0 && (
          <span className="text-xs bg-gradient-to-r from-orange-500 to-red-500 px-2.5 py-0.5 rounded-full animate-bounce shadow-lg shadow-orange-500/30 font-bold">
            x{combo + 1} 🔥
          </span>
        )}
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="touch-none w-full h-full"
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
      />

      {/* Objectives bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-4 py-3 flex items-center justify-center gap-4"
        style={{ background: 'linear-gradient(0deg, rgba(15,52,96,0.95) 0%, transparent 100%)' }}>
        {objectives.map((obj, i) => {
          const done = obj.type === 'score'
            ? score >= obj.target
            : obj.current >= obj.target;
          return (
            <div key={i} className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full border backdrop-blur-sm ${done ? 'border-yellow-400 text-yellow-200 bg-yellow-500/25 shadow-lg shadow-yellow-500/20' : 'border-white/25 text-white/80 bg-white/10'}`}>
              {obj.type === 'collect' && obj.gemType !== undefined && (
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: GEM_STYLES[obj.gemType].bg }} />
              )}
              {obj.type === 'score' ? (
                <span>{score.toLocaleString()}/{obj.target.toLocaleString()}</span>
              ) : (
                <span>{obj.current}/{obj.target}</span>
              )}
              {done && <span>✓</span>}
            </div>
          );
        })}
      </div>

      {/* Win / Lose Overlay */}
      {gameState !== 'playing' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 animate-in fade-in duration-300">
          <div className={`mx-6 p-8 rounded-3xl text-center shadow-2xl ${
            gameState === 'won'
              ? 'bg-gradient-to-b from-[#0f3460] to-[#16213e] border-2 border-yellow-400/50 shadow-yellow-500/30'
              : 'bg-gradient-to-b from-gray-700 to-gray-800 border border-red-500/30'
          }`}>
            <div className="text-5xl mb-4">{gameState === 'won' ? '🎉👑🎉' : '😔'}</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {gameState === 'won' ? 'أحسنت! 🏆' : 'انتهت الحركات'}
            </h2>
            {gameState === 'won' && (
              <div className="flex items-center justify-center gap-1 mb-4">
                {starIcons}
              </div>
            )}
            <p className="text-blue-100 mb-1">النقاط: {score.toLocaleString()}</p>
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={onBack}
                className="px-6 py-3 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold transition-colors backdrop-blur-sm"
              >
                القائمة
              </button>
              {gameState === 'lost' && (
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold transition-colors shadow-lg"
                >
                  حاول مرة أخرى
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
