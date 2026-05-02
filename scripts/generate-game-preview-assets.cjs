#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

let GIFEncoder;

try {
  GIFEncoder = require("gif-encoder-2");
} catch (error) {
  console.error("Missing dependencies for GIF generation. Install with: npm i --no-save gif-encoder-2");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const root = process.cwd();
const outDir = path.join(root, "client", "public", "games", "previews");

const games = [
  {
    key: "math-challenge",
    titleAr: "تحدي الرياضيات",
    titleEn: "Math Challenge",
    emoji: "🔢",
    accent: "#00bcd4",
    bgA: "#0c4a6e",
    bgB: "#2563eb",
    shape: "hex",
  },
  {
    key: "memory-match",
    titleAr: "مملكة الذاكرة",
    titleEn: "Memory Kingdom",
    emoji: "🧠",
    accent: "#7c3aed",
    bgA: "#312e81",
    bgB: "#0ea5e9",
    shape: "circle",
  },
  {
    key: "gem-kingdom",
    titleAr: "مملكة الجواهر",
    titleEn: "Gem Kingdom",
    emoji: "💎",
    accent: "#ec4899",
    bgA: "#1e1b4b",
    bgB: "#6d28d9",
    shape: "diamond",
  },
  {
    key: "snake-3d",
    titleAr: "مغامرة الفواكه",
    titleEn: "Fruit Adventure",
    emoji: "🐍",
    accent: "#22c55e",
    bgA: "#14532d",
    bgB: "#15803d",
    shape: "wave",
  },
  {
    key: "cat-kingdom",
    titleAr: "مملكة القطة",
    titleEn: "Cat Kingdom",
    emoji: "🐱",
    accent: "#f59e0b",
    bgA: "#7c2d12",
    bgB: "#ea580c",
    shape: "paw",
  },
  {
    key: "ice-kingdom",
    titleAr: "مملكة الجليد",
    titleEn: "Ice Kingdom",
    emoji: "❄️",
    accent: "#38bdf8",
    bgA: "#0f172a",
    bgB: "#0369a1",
    shape: "snow",
  },
];

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function hexToRgb(hex) {
  const clean = String(hex || "").replace("#", "").trim();
  if (clean.length !== 6) return { r: 0, g: 0, b: 0 };
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16),
  };
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function blendRgb(base, tint, alpha) {
  return {
    r: lerp(base.r, tint.r, alpha),
    g: lerp(base.g, tint.g, alpha),
    b: lerp(base.b, tint.b, alpha),
  };
}

function inRoundedRect(x, y, rx, ry, rw, rh, radius) {
  if (x < rx || x > rx + rw || y < ry || y > ry + rh) return false;

  const left = rx + radius;
  const right = rx + rw - radius;
  const top = ry + radius;
  const bottom = ry + rh - radius;

  if (x >= left && x <= right) return true;
  if (y >= top && y <= bottom) return true;

  const corners = [
    { cx: left, cy: top },
    { cx: right, cy: top },
    { cx: left, cy: bottom },
    { cx: right, cy: bottom },
  ];

  return corners.some((corner) => {
    const dx = x - corner.cx;
    const dy = y - corner.cy;
    return dx * dx + dy * dy <= radius * radius;
  });
}

function inHexagon(x, y, cx, cy, radius) {
  const dx = Math.abs(x - cx);
  const dy = Math.abs(y - cy);
  return dy <= radius * 0.88 && dx <= radius * 0.95 - dy * 0.55;
}

function inDiamond(x, y, cx, cy, radius) {
  return Math.abs(x - cx) + Math.abs(y - cy) <= radius;
}

function inCircle(x, y, cx, cy, radius) {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function inWaveBlob(x, y, cx, cy, radius, phase) {
  const dx = x - cx;
  const dy = y - cy;
  const wave = Math.sin((dx + phase) * 0.12) * 8;
  return Math.abs(dx) <= radius && Math.abs(dy - wave) <= radius * 0.55;
}

function inPaw(x, y, cx, cy, radius) {
  return (
    inCircle(x, y, cx, cy + 10, radius * 0.42) ||
    inCircle(x, y, cx - radius * 0.5, cy - radius * 0.32, radius * 0.2) ||
    inCircle(x, y, cx - radius * 0.16, cy - radius * 0.46, radius * 0.2) ||
    inCircle(x, y, cx + radius * 0.16, cy - radius * 0.46, radius * 0.2) ||
    inCircle(x, y, cx + radius * 0.5, cy - radius * 0.32, radius * 0.2)
  );
}

function inSnow(x, y, cx, cy, radius) {
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > radius) return false;

  const arm = Math.abs(dx) < 3 || Math.abs(dy) < 3;
  const diagA = Math.abs(dx - dy) < 3;
  const diagB = Math.abs(dx + dy) < 3;
  return arm || diagA || diagB;
}

function shapeMask(shape, x, y, cx, cy, radius, frame) {
  switch (shape) {
    case "hex":
      return inHexagon(x, y, cx, cy, radius);
    case "circle":
      return inCircle(x, y, cx, cy, radius);
    case "diamond":
      return inDiamond(x, y, cx, cy, radius);
    case "wave":
      return inWaveBlob(x, y, cx, cy, radius, frame * 3);
    case "paw":
      return inPaw(x, y, cx, cy, radius);
    case "snow":
      return inSnow(x, y, cx, cy, radius);
    default:
      return false;
  }
}

function generateFrame(game, frame, width, height) {
  const bgA = hexToRgb(game.bgA);
  const bgB = hexToRgb(game.bgB);
  const accent = hexToRgb(game.accent);
  const white = { r: 255, g: 255, b: 255 };

  const panelX = 18;
  const panelY = Math.round(height * 0.67);
  const panelW = width - 36;
  const panelH = Math.round(height * 0.28);
  const panelRadius = 16;

  const shapeCx = Math.round(width * 0.74 + Math.sin(frame / 4) * 10);
  const shapeCy = Math.round(height * 0.26 + Math.cos(frame / 6) * 7);
  const shapeRadius = 42;

  const glowCx = Math.round(width * 0.22 + frame * 6);
  const glowCy = Math.round(height * 0.15);

  const pixels = new Uint8Array(width * height * 4);
  let p = 0;

  for (let y = 0; y < height; y += 1) {
    const ry = y / Math.max(1, height - 1);

    for (let x = 0; x < width; x += 1) {
      const rx = x / Math.max(1, width - 1);
      const baseMix = Math.min(1, Math.max(0, (rx * 0.6) + (ry * 0.8)));
      let rgb = {
        r: lerp(bgA.r, bgB.r, baseMix),
        g: lerp(bgA.g, bgB.g, baseMix),
        b: lerp(bgA.b, bgB.b, baseMix),
      };

      // Moving glow.
      const glowDx = x - glowCx;
      const glowDy = y - glowCy;
      const glowDist = Math.sqrt(glowDx * glowDx + glowDy * glowDy);
      if (glowDist < 170) {
        const alpha = (1 - glowDist / 170) * 0.32;
        rgb = blendRgb(rgb, white, alpha);
      }

      // Faux 3D floor stripes.
      if (y > height * 0.58) {
        const stripe = ((x + frame * 8) % 46) < 2 || ((y + frame * 3) % 24) < 2;
        if (stripe) {
          rgb = blendRgb(rgb, white, 0.12);
        }
      }

      // Floating tiles.
      const tile = ((x + frame * 4) % 88 < 26) && ((y + frame * 2) % 72 < 20) && y > height * 0.46;
      if (tile) {
        rgb = blendRgb(rgb, accent, 0.08);
      }

      // Main animated shape.
      if (shapeMask(game.shape, x, y, shapeCx, shapeCy, shapeRadius, frame)) {
        rgb = blendRgb(rgb, accent, 0.72);
      }

      // Bottom info plate.
      if (inRoundedRect(x, y, panelX, panelY, panelW, panelH, panelRadius)) {
        rgb = blendRgb(rgb, { r: 5, g: 8, b: 18 }, 0.52);
      }

      // Accent line in plate.
      if (y > panelY + 10 && y < panelY + 14 && x > panelX + 18 && x < panelX + panelW - 18) {
        rgb = blendRgb(rgb, accent, 0.45);
      }

      pixels[p++] = clampByte(rgb.r);
      pixels[p++] = clampByte(rgb.g);
      pixels[p++] = clampByte(rgb.b);
      pixels[p++] = 255;
    }
  }

  return pixels;
}

function createPosterSvg(game) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="640" height="400" viewBox="0 0 640 400" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="640" y2="400" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${game.bgA}"/>
      <stop offset="1" stop-color="${game.bgB}"/>
    </linearGradient>
    <radialGradient id="orb" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(120 74) rotate(23) scale(280 180)">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="640" height="400" rx="34" fill="url(#bg)"/>
  <rect width="640" height="400" rx="34" fill="url(#orb)"/>
  <rect x="26" y="270" width="588" height="108" rx="24" fill="#000" fill-opacity="0.35"/>
  <circle cx="522" cy="95" r="58" fill="${game.accent}" fill-opacity="0.4"/>
  <text x="64" y="130" font-size="78">${game.emoji}</text>
  <text x="64" y="317" fill="#ffffff" font-family="Segoe UI, Tahoma, sans-serif" font-size="34" font-weight="800">${game.titleAr}</text>
  <text x="64" y="354" fill="#DBEAFE" font-family="Segoe UI, Tahoma, sans-serif" font-size="26" font-weight="700">${game.titleEn}</text>
</svg>`;
}

function generateGif(game) {
  const width = 480;
  const height = 300;
  const frames = 28;

  const encoder = new GIFEncoder(width, height, "neuquant", true);
  const outPath = path.join(outDir, `${game.key}.gif`);
  const stream = encoder.createReadStream().pipe(fs.createWriteStream(outPath));

  encoder.start();
  encoder.setRepeat(0);
  encoder.setDelay(85);
  encoder.setQuality(12);

  for (let frame = 0; frame < frames; frame += 1) {
    const frameData = generateFrame(game, frame, width, height);
    encoder.addFrame(frameData);
  }

  encoder.finish();

  return new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

async function main() {
  ensureDir(outDir);

  for (const game of games) {
    const svgPath = path.join(outDir, `${game.key}.svg`);
    fs.writeFileSync(svgPath, createPosterSvg(game), "utf8");
    await generateGif(game);
    console.log(`generated: ${game.key}.svg + ${game.key}.gif`);
  }

  console.log("Game preview assets generated successfully.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
