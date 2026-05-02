# 🎮 Classify Games — Agent Memory Bank

**Purpose:** This document is the AI agent's persistent memory for building games in Classify.  
**Authority:** This file is LAW for game development. Read it BEFORE touching any game code.  
**Last Updated:** 2026-02-21  

## 🛡️ ADMIN GAMES PANEL RELIABILITY NOTES (2026-03-18)

1. Do NOT auto-delete admin-added games at server startup.
2. Builtin seeding should only ensure builtin games exist/update, never remove non-builtin rows.
3. Admin games API must validate and normalize:
  - `embedUrl` as internal path (`/...`) or absolute `http/https` URL.
  - numeric ranges (`pointsPerPlay`, `maxPlaysPerDay`, age bounds).
  - `minAge <= maxAge`.
4. Updating a game must reject duplicate `embedUrl` values across other records.
5. Admin UI should normalize URL input before create/update requests.
6. Child games feed (`GET /api/games`) must sanitize malformed legacy `embedUrl` values (for example `/gamess/...` or `:/games/...`) before policy filtering/serving.

---

## 📐 ARCHITECTURE OVERVIEW

### Two Game Types in Classify

| Type | Location | Language | Loaded Via | Routing |
|------|----------|----------|------------|---------|
| **HTML/Vanilla JS** | `client/public/games/` | Plain JS (ES modules) | iframe in ChildGames.tsx | Served as static files |
| **React** | `client/src/games/` | TypeScript + React | Direct route in App.tsx | Lazy-loaded component |

**PRIMARY TYPE:** HTML/Vanilla JS games in iframe. This is the standard for ALL new games.  
**React games** (Match3, React Memory) are legacy — do NOT create new React games.

### Why HTML/Vanilla JS?
1. **Isolation** — game crashes don't affect the parent app
2. **Performance** — no React overhead, direct DOM/Canvas manipulation
3. **Independence** — games work standalone for testing
4. **Mobile** — Capacitor WebView loads iframe smoothly
5. **Scoring** — postMessage protocol sends scores back to parent

---

## 📂 FILE STRUCTURE (MANDATORY PATTERN)

Every new HTML game MUST follow this structure:

```
client/public/games/
├── {game-name}.html          ← Entry point (CSS + HTML structure + module loader)
└── {game-name}-modules/      ← JS modules (ES module imports)
    ├── config.js              ← Constants, i18n strings, emoji/asset pools
    ├── core.js                ← Game state, logic engine, main loop, DDA
    ├── ui.js                  ← Rendering, animations, sound (Web Audio API)
    ├── worlds.js              ← Level definitions, world configs, progression
    ├── story.js               ← [standard] World intros, fun facts, quizzes (3 langs)
    ├── engagement.js          ← [standard] Micro-badges, streaks, session summary, milestones
    └── [optional modules]     ← boss.js, economy.js, reports.js, intelligence.js, etc.
```

### Naming Convention
- HTML file: kebab-case → `word-puzzle.html`
- Module folder: same name + `-modules` → `word-puzzle-modules/`
- JS files: camelCase or lowercase → `core.js`, `worldConfig.js`

---

## 🌐 HTML ENTRY FILE TEMPLATE

Every game HTML file MUST include:

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>اسم اللعبة - English Name</title>
<style>
/* ALL CSS goes inline in the HTML - no external CSS files */
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;user-select:none;-webkit-tap-highlight-color:transparent}

/* Screen management */
.screen{display:none;width:100%;height:100%;position:absolute;top:0;left:0;z-index:1;opacity:0;transition:opacity .25s ease}
.screen.active{display:flex;opacity:1}
.screen.fade-in{animation:screenFadeIn .3s ease forwards}
@keyframes screenFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

/* ... game-specific CSS ... */
</style>
</head>
<body>
<!-- Screens: world-screen, lvl-screen, game-screen, done-screen, etc. -->
<div id="world-screen" class="screen active">...</div>
<div id="lvl-screen" class="screen">...</div>
<div id="game-screen" class="screen">...</div>
<div id="done-screen" class="screen">...</div>

<script type="module">
import { initGame } from './{game-name}-modules/core.js';
initGame();
</script>
</body>
</html>
```

### Critical CSS Rules
- `html,body` → `width:100%;height:100%;overflow:hidden` (fills iframe)
- `user-select:none` (prevents text selection during gameplay)
- `-webkit-tap-highlight-color:transparent` (no tap highlights on mobile)
- `maximum-scale=1,user-scalable=no` (prevents zoom on mobile)

---

## 📡 POSTMESSAGE PROTOCOL (MANDATORY)

### Game → Parent Communication

Games MUST send these messages to the parent (ChildGames.tsx):

#### 1. GAME_COMPLETE (Required)
```javascript
window.parent.postMessage({
  type: 'GAME_COMPLETE',
  score: scaledScore,    // Number: 0-100 (percentage scaled)
  total: 100,            // Always 100 (percentage-based)
  timeElapsed: seconds,  // Optional: time in seconds
  level: levelNumber,    // Optional: 1-based level number
  world: worldNumber,    // Optional: world/group number
  stars: starCount,      // Optional: 0-3 stars earned
}, '*');
```

#### 2. SHARE_ACHIEVEMENT (Optional)
```javascript
window.parent.postMessage({
  type: 'SHARE_ACHIEVEMENT',
  game: 'game-id',       // Short identifier
  level: levelNumber,
  score: scoreValue,
  stars: starCount,
  text: 'Shareable text with emoji'
}, '*');
```

### Score Scaling Rule
The server expects `score` as a percentage (0-100) with `total: 100`.  
Points are calculated server-side based on performance tiers:

| Score % | Points Earned |
|---------|---------------|
| 0%      | 0 points      |
| 1-49%   | 30% of pointsPerPlay |
| 50-79%  | 70% of pointsPerPlay |
| 80-100% | 100% of pointsPerPlay |

**Server endpoint:** `POST /api/child/complete-game`  
**File:** `server/routes/child.ts` line 897  

### Receiving Parameters from Parent
Games receive the language via URL query parameter:
```javascript
// The iframe src is: /games/{game}.html?lang=ar
const LANG = new URLSearchParams(location.search).get('lang') || 'ar';
```

---

## 🌍 i18n PATTERN (MANDATORY)

Every game MUST support 3 languages: **Arabic (ar)**, **English (en)**, **Portuguese (pt)**

```javascript
// In config.js
export const LANG = new URLSearchParams(location.search).get('lang') || 'ar';

const STRINGS = {
  ar: {
    title: 'اسم اللعبة',
    play: 'العب',
    score: 'النتيجة',
    time: 'الوقت',
    level: 'المستوى',
    world: 'العالم',
    back: 'رجوع',
    next: 'التالي',
    replay: 'إعادة',
    share: 'مشاركة',
    mute: 'كتم',
    unmute: 'صوت',
    stars: 'نجوم',
    locked: 'مقفل',
    // ... game-specific strings
  },
  en: { /* ... */ },
  pt: { /* ... */ },
};

export const t = STRINGS[LANG] || STRINGS.ar;
```

### RTL Handling
- HTML tag: `<html lang="ar" dir="rtl">` (default)
- CSS: Use `direction` and logical properties when needed
- Dynamic: Switch based on `LANG` value at runtime
- The game adapts display direction based on language

---

## 🔊 AUDIO SYSTEM (Web Audio API)

**CRITICAL:** NO external audio files. ALL sound is synthesized via Web Audio API.

```javascript
// Standard audio context initialization
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx;
function ensureAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// Sound effect pattern (oscillator-based)
export function sfxFlip() {
  if (isMuted) return;
  const ctx = ensureAudio();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(800, ctx.currentTime);
  o.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.08);
  g.gain.setValueAtTime(0.15, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  o.connect(g).connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime + 0.12);
}

// Background music pattern (looping oscillators)
export function startMusic(worldIndex) {
  // Create multiple oscillators with world-specific frequencies
  // Use setInterval or requestAnimationFrame for note progression
}
```

### Mute System
```javascript
let isMuted = localStorage.getItem('{STORAGE_PREFIX}_muted') === '1';

export function toggleMute() {
  isMuted = !isMuted;
  localStorage.setItem('{STORAGE_PREFIX}_muted', isMuted ? '1' : '0');
  if (isMuted) stopMusic();
  // Update mute button UI
}
```

---

## 🎨 VISUAL SYSTEM (Emoji + Canvas)

### Assets: ZERO External Files
- **Characters/Objects:** Emoji only (no images, no SVGs, no sprites)
- **Backgrounds:** Canvas 2D API (gradients, floating particles)
- **Animations:** CSS transitions + requestAnimationFrame
- **Fonts:** System fonts only (`'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`)

### Background Canvas Pattern
```javascript
let bgCanvas, bgCtx, bgParticles = [], bgAnimId;

export function initBg(worldIndex) {
  bgCanvas = document.getElementById('bg-canvas');
  // ⚠️ CRITICAL: Canvas MUST be visible (screen active) before getting dimensions
  // See BUG #1 in Lessons Learned
  bgCtx = bgCanvas.getContext('2d');
  bgCanvas.width = bgCanvas.parentElement.offsetWidth;
  bgCanvas.height = bgCanvas.parentElement.offsetHeight;
  // Create particles based on world theme (emoji float upward)
  bgParticles = Array.from({length: 20}, () => createParticle(worldIndex));
  animateBg();
}

function animateBg() {
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  bgParticles.forEach(p => { /* update & draw */ });
  bgAnimId = requestAnimationFrame(animateBg);
}

export function stopBg() {
  if (bgAnimId) cancelAnimationFrame(bgAnimId);
  bgAnimId = null;
}
```

### Confetti / Celebration Pattern
```javascript
export function spawnConfetti(count = 30) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const p = document.createElement('div');
      p.className = 'particle';
      p.textContent = ['🎉','✨','⭐','🌟','💎'][Math.floor(Math.random() * 5)];
      p.style.cssText = `position:fixed;left:${Math.random()*100}%;top:${Math.random()*60+20}%;font-size:22px;pointer-events:none;z-index:999;animation:particleUp 1.2s ease-out forwards`;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 1200);
    }, i * 50);
  }
}
```

---

## 🧠 SCREEN MANAGEMENT SYSTEM

### Pattern: Single Active Screen
```javascript
// In ui.js
export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active', 'fade-in');
  });
  const target = document.getElementById(id);
  if (target) {
    target.classList.add('active', 'fade-in');
  }
}
```

### Standard Screens
Every game should have these screens:

| Screen ID | Purpose |
|-----------|---------|
| `world-screen` | World/category selection (if multi-world) |
| `lvl-screen` | Level selection within a world |
| `game-screen` | Active gameplay |
| `done-screen` | Level complete (score, stars, next/replay) |

### ⚠️ CRITICAL TIMING RULE
**NEVER** initialize Canvas or measure DOM dimensions BEFORE `showScreen()`.  
The screen's parent has `display:none` → all measurements return 0.

**Correct order:**
```javascript
showScreen('game-screen');                    // 1. Make screen visible
requestAnimationFrame(() => initBg(world));   // 2. THEN init canvas (next frame)
```

---

## 💾 LOCAL STORAGE PATTERN

### Key Naming Convention
```
classify_{gameShortName}_{dataType}
```

Examples: `classify_memPro_progress`, `classify_math_progress`

### Standard Data Structures
```javascript
// Progress
{ unlocked: 0, scores: {}, stars: {} }

// Wallet/Economy
{ coins: 0, purchased: [] }

// Badges
['badge_id_1', 'badge_id_2']

// DDA (Difficulty Adjustment)
{ wins: 0, losses: 0, streak: 0, avgTime: 0 }

// Settings
{ muted: false }
```

### Migration Pattern (Important!)
When upgrading a game, always migrate old localStorage:
```javascript
function migrateOldData() {
  const oldP = localStorage.getItem(KEYS.OLD_PROGRESS);
  const newP = localStorage.getItem(KEYS.PROGRESS);
  if (oldP && !newP) {
    // Map old format to new format
    localStorage.setItem(KEYS.PROGRESS, JSON.stringify(migrated));
    localStorage.removeItem(KEYS.OLD_PROGRESS);
  }
}
```

---

## ⭐ WORLD/LEVEL PROGRESSION SYSTEM

### Standard Structure: 10 Worlds × 10 Levels = 100 Levels

```javascript
// In worlds.js
export const WORLDS = [
  { name: 'World Name', nameAr: 'اسم العالم', icon: '🏰', bg: 'linear-gradient(...)' },
  // ... 10 worlds
];

export const LEVELS = [
  // World 0 (10 levels)
  { world: 0, name: 'Level 1', difficulty: 0, mechanic: 'classic', isBoss: false },
  { world: 0, name: 'Level 2', difficulty: 0, mechanic: 'classic', isBoss: false },
  // ... every 10th level is a boss
  { world: 0, name: 'Boss', difficulty: 3, mechanic: 'boss', isBoss: true },
  // World 1 (10 levels)
  { world: 1, name: 'Level 1', difficulty: 1, mechanic: 'timed', isBoss: false },
  // ...
];
```

### Unlock Logic
```javascript
export function isWorldUnlocked(worldIndex, progress) {
  if (worldIndex === 0) return true;
  // Need X stars from previous world to unlock next
  const prevWorldStars = getWorldStars(worldIndex - 1, progress);
  return prevWorldStars >= WORLD_UNLOCK_THRESHOLD;
}

export function isLevelUnlocked(globalIndex, progress) {
  if (globalIndex === 0) return true;
  // Previous level must have at least 1 star
  return (progress.stars[globalIndex - 1] || 0) >= 1;
}
```

### Star Calculation
```javascript
export function calcScore(time, moves, pairs, mechanic) {
  // Performance-based: time + moves + difficulty
  // Returns: { score: 0-100, stars: 0-3 }
  // Stars: ≤40% = 1⭐, ≤70% = 2⭐, >70% = 3⭐
}
```

---

## 🎯 DDA (Dynamic Difficulty Adjustment)

### Implementation Pattern
```javascript
// Track player performance
let ddaState = loadDDA();

function updateDDA(won, time, moves) {
  ddaState.totalGames++;
  if (won) { ddaState.wins++; ddaState.streak++; }
  else { ddaState.losses++; ddaState.streak = 0; }
  ddaState.avgTime = rollingAvg(ddaState.avgTime, time);
  saveDDA(ddaState);
}

function getDDAModifier() {
  const ratio = ddaState.wins / Math.max(1, ddaState.totalGames);
  if (ratio > 0.85 && ddaState.streak >= 3) return +1;  // Harder
  if (ratio < 0.4) return -1;  // Easier
  return 0;  // Stay
}
```

### What DDA Adjusts
- Grid size / card count
- Time limit
- Number of distractors
- Hint frequency
- Enemy/boss difficulty

---

## 🏗️ SERVER INTEGRATION

### Database Tables (shared/schema.ts)

#### `flash_games` — Game Registry
```typescript
flashGames = pgTable("flash_games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  embedUrl: text("embed_url").notNull(),        // "/games/{name}.html"
  thumbnailUrl: text("thumbnail_url"),
  category: varchar("category", { length: 50 }).default("general"),
  minAge: integer("min_age"),
  maxAge: integer("max_age"),
  pointsPerPlay: integer("points_per_play").default(5),
  maxPlaysPerDay: integer("max_plays_per_day").default(0), // 0 = unlimited
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
```

#### `game_play_history` — Play Records
```typescript
gamePlayHistory = pgTable("game_play_history", {
  id: varchar("id").primaryKey(),
  childId: varchar("child_id").references(() => children.id, { onDelete: "cascade" }),
  gameId: varchar("game_id").references(() => flashGames.id, { onDelete: "cascade" }),
  pointsEarned: integer("points_earned").default(0),
  score: integer("score"),
  totalQuestions: integer("total_questions"),
  playedAt: timestamp("played_at").defaultNow(),
});
```

#### `child_game_assignments` — Per-Child Limits
```typescript
childGameAssignments = pgTable("child_game_assignments", {
  id: varchar("id").primaryKey(),
  childId: varchar("child_id").references(() => children.id),
  gameId: varchar("game_id").references(() => flashGames.id),
  maxPlaysPerDay: integer("max_plays_per_day").default(0), // Override game default
  isActive: boolean("is_active").default(true),
  assignedBy: varchar("assigned_by"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### Seed Pattern (server/routes/index.ts)
New games MUST be added to `seedDefaultGames()`:
```typescript
const builtinGames = [
  {
    title: "اسم اللعبة - English Name 🎮",
    description: "وصف...",
    embedUrl: "/games/{game-name}.html",
    category: "puzzle|math|language|science|general",
    minAge: 4,
    maxAge: 14,
    pointsPerPlay: 10,
    maxPlaysPerDay: 0,  // 0 = unlimited
  },
];
```

### Growth Tree Integration
After game completion, the server updates the child's growth tree:
```typescript
recordGrowthEvent(childId, "game_played", 3, { gameId, title: game.title });
```

---

## 🛡️ SWIPE GESTURE PROTECTION

Games are exempt from the swipe-back navigation gesture.  
**File:** `client/src/App.tsx`

```typescript
const GAME_ROUTES = ["/child-games", "/match3", "/memory-match"];

function useSwipeBackGesture() {
  const [location] = useLocation();
  useEffect(() => {
    const isGamePage = GAME_ROUTES.some((r) => location.startsWith(r));
    if (isGamePage) return; // ← Disabled on game pages
    // ... touch event listeners for swipe-back
  }, [location]);
}
```

**When adding a new React game route:** Add it to `GAME_ROUTES` array.  
**HTML games:** Already protected because they're loaded on `/child-games` route.

---

## 📱 MOBILE / CAPACITOR CONSIDERATIONS

### Capacitor Config (capacitor.config.json)
```json
{
  "appId": "com.classify.app",
  "server": {
    "url": "https://classi-fy.com",  // Live-server mode (APK)
    "cleartext": true
  }
}
```

### Double-nested iframe context
In Capacitor, the structure is:
```
Capacitor WebView → classi-fy.com SPA → iframe → game.html
```
This means:
- `window.parent.postMessage()` reaches the SPA, NOT Capacitor
- `window.top` is the Capacitor WebView (don't need to access it)
- Games should ONLY communicate with `window.parent`

### Viewport Requirements
- `maximum-scale=1,user-scalable=no` — prevents zoom gestures
- `overflow:hidden` on body — prevents scroll bouncing
- All game content MUST fit within the iframe viewport
- Use `clamp()` for responsive sizing: `font-size:clamp(12px,3vmin,20px)`

### Performance
- Use `detectPerformance()` to check device capability
- Reduce particle count on low-end devices
- Use `will-change: transform` sparingly
- Prefer CSS transforms over layout properties

---

## 🚨 BUGS & LESSONS LEARNED

### BUG #1: Canvas 0×0 Dimensions (Memory Match — Fixed 2026-02-21)
**Problem:** `initBg()` called BEFORE `showScreen('game-screen')` → parent has `display:none` → canvas dimensions = 0×0  
**Fix:** Move `initBg()` into `requestAnimationFrame()` callback AFTER `showScreen()`  
**Rule:** ❗ NEVER initialize Canvas/measure DOM before the screen is visible

### BUG #2: ResizeObserver Race Condition (Memory Match — Fixed 2026-02-21)
**Problem:** `resetGame()` reset JS state but never cleared `grid.innerHTML`. On replay, the fallback condition `!g.children.length` was false (old DOM children existed), so cards were never re-rendered.  
**Fix:** Added `g.innerHTML = ''` before rendering + `rendered` boolean flag instead of checking children count  
**Rule:** ❗ ALWAYS clear DOM containers before re-rendering. Use explicit flags, not DOM state checks.

### BUG #3: CSS Animation Timing (Memory Match — Fixed 2026-02-21)
**Problem:** Two competing CSS animations on screen show (`.screen.fade-in` 0.3s + `.screen.active` 0.4s with `scale(.93)`) caused `.grid-wrap` to report dimensions ≤50px during animation period, breaking card grid calculation.  
**Fix:** Increased fallback timeout from 500ms to 600ms, made it unconditional  
**Rule:** ❗ Always account for CSS animation duration when measuring after screen transitions. Use ResizeObserver with a generous fallback timer.

### BUG #4: Swipe-Back Gesture Interference (Fixed 2026-02-21)
**Problem:** Global swipe-back gesture (`useSwipeBackGesture` in App.tsx) triggered `window.history.back()` during horizontal swipes in games  
**Fix:** Added route check — gesture disabled on all game routes  
**Rule:** ❗ New game React routes MUST be added to `GAME_ROUTES` array

### BUG #5: postMessage Wildcard Origin
**Current:** Games use `'*'` as target origin in `postMessage()`  
**Risk:** Any parent page could receive game data  
**Status:** Low risk (games only run in our iframe), but should use specific origin  
**Recommended fix:** `window.parent.postMessage(data, window.location.origin)`

### BUG #6: Match3 Game Doesn't Record Scores
**Current:** React Match3 game has no postMessage or API integration  
**Status:** Known limitation, Match3 is legacy React game  
**Impact:** Playing Match3 doesn't earn points or record history

---

## 📋 NEW GAME CHECKLIST

When building a new game, follow this checklist:

### Phase 1: Setup
- [ ] Create `client/public/games/{game-name}.html`
- [ ] Create `client/public/games/{game-name}-modules/` directory
- [ ] Create `config.js` — constants, i18n (ar/en/pt), emoji pools
- [ ] Create `worlds.js` — level definitions, world configs
- [ ] Create `ui.js` — rendering, audio (Web Audio), animations
- [ ] Create `core.js` — game logic, state management, DDA

### Phase 2: Core Implementation
- [ ] Screen system (world → level → game → done)
- [ ] Card/element rendering with CSS animations
- [ ] Game mechanics with proper state management
- [ ] Scoring system (0-100 scale)
- [ ] Star calculation (1-3 stars)
- [ ] Level progression and unlock logic
- [ ] DDA system (track wins/losses, adjust difficulty)
- [ ] Sound effects (Web Audio oscillators)
- [ ] Background music per world
- [ ] Canvas background with floating emoji particles
- [ ] Mute toggle with localStorage persistence

### Phase 3: Integration
- [ ] `postMessage` → `GAME_COMPLETE` with score/100
- [ ] `postMessage` → `SHARE_ACHIEVEMENT` (optional)
- [ ] Language parameter from URL (`?lang=ar`)
- [ ] Test in iframe context (not just standalone)
- [ ] Add to `seedDefaultGames()` in `server/routes/index.ts`

### Phase 4: Quality
- [ ] Test on mobile viewport (375×667 minimum)
- [ ] Test RTL layout (Arabic)
- [ ] Test LTR layout (English/Portuguese)
- [ ] Verify no external dependencies (emoji only, Web Audio only)
- [ ] Check `overflow:hidden` prevents scroll bounce
- [ ] Test canvas init AFTER screen visible
- [ ] Verify DOM cleanup on replay/restart
- [ ] Test daily limit handling (graceful message)

### Phase 5: Deploy
- [ ] Run `npm run build` (copies static files to dist)
- [ ] Commit with descriptive message
- [ ] Push to main
- [ ] Deploy: `cd /docker/classitest && git pull origin main && docker compose up -d --build app`

---

## 🏗️ EXISTING GAMES REFERENCE

### 1. مملكة الذاكرة — Memory Kingdom 🧠
- **Files:** `memory-match.html` + `memory-modules/{config,core,ui,worlds,story,engagement}.js`
- **Total Code:** ~5,900+ lines across 7 files
- **Structure:** 10 worlds × 10 levels = 100 levels
- **Mechanics:** 11 types (classic, timed, moving, masked, fog, triple, boss, mirror, chain, bomb, rainbow)
- **Features:** Boss system (10 bosses), 30 badges, shop (skins), XP/level, streak, prestige, 5 power-ups, DDA v2, cognitive report
- **Story Module:** World intros (10 worlds × 3 langs), brain/memory fun facts (100 × 3 langs), memory quizzes
- **Engagement Module:** 12 micro-badges, near-miss messages, streak messages, session summary, milestones, comeback messages
- **Emoji Pool:** 2000+ educational emoji in 20 categories
- **Storage Keys:** `classify_memPro_*`
- **Category:** puzzle

### 2. مملكة الأرقام — Math Kingdom 🔢
- **Files:** `math-challenge.html` + `math-modules/{config,core,ui,worlds,boss,economy,engagement,intelligence,reports,story}.js`
- **Total Code:** ~7,800+ lines across 11 files
- **Structure:** 10 worlds × 5 levels + bosses = 50+ levels
- **Question Types:** 15 types (addition, subtraction, multiplication, division, fractions, decimals, percentages, algebra, geometry, comparisons, sequences, time, money, equations, word problems)
- **Features:** Boss battles (50 bosses), lives system, 25 achievements, daily/weekly challenges, grade estimation, scientific report, XP/level, economy
- **Story Module:** World intros (10 worlds × 3 langs), math history fun facts (100 × 3 langs), math quizzes
- **Engagement Module:** 12 micro-badges, near-miss messages (5 per lang), streak/wrong-after-streak messages, session summary, milestones (11 thresholds), comeback messages
- **Storage Keys:** `classify_math_*`
- **Category:** math

### 3. Match3 (React — Legacy) 💎
- **Files:** `client/src/games/match3/{Match3Page.tsx, Match3Game.tsx, engine.ts, levels.ts, types.ts}`
- **Total Code:** ~1,722 lines
- **Route:** `/match3`
- **Rendering:** Canvas 2D
- **Note:** Does NOT send postMessage, no server score recording
- **Status:** Legacy, do not extend

### 4. Memory Game (React — Legacy) 🃏
- **Files:** `client/src/games/memory/{MemoryGame.tsx, useMemoryGame.ts, memoryUtils.ts, types.ts, index.ts, memoryGame.css}`
- **Total Code:** ~773 lines
- **Route:** `/memory-match`
- **Note:** Simplified 4×4 grid, CSS 3D flip. Separate from the HTML Memory Kingdom
- **Status:** Legacy, do not extend

### 5. مملكة القطط — Cat Kingdom 🐱
- **Files:** `cat-kingdom.html` + `cat-kingdom-modules/{config.js, core.js, engine.js, i18n.js, sounds.js, ui.js, worlds.js, cats.js, intelligence.js, story.js, reports.js, economy.js, daily.js}`
- **Total Code:** ~3,300+ lines across 14 files
- **Structure:** 10 worlds × 5 levels = 50 levels (quiz-based)
- **Subjects:** 10 (Math, Science, Arabic, English, Geography, History, Art, Music, Sports, Tech)
- **Features:**
  - Quiz gameplay with 4 answer options, timer, lives system (3 lives)
  - Cat avatar system (12 cats, purchasable with coins)
  - Boss levels (every world's last level)
  - Shop with two tabs: Skins (cat avatars) + Power-ups
  - 5 Power-ups: Hint (removes 2 wrong, 30 coins), Freeze (stops timer 10s, 50 coins), Extra Life (+1 life, 60 coins), Double Score (2x points, 80 coins), Shield (absorbs 1 mistake, 40 coins)
  - Power-up HUD during gameplay (usable via click)
  - DDA v2 (Dynamic Difficulty Adjustment): EMA-smoothed performance tracking per subject, adjusts question count (-2 to +2) and time per question (-3s to +3s)
  - Story module: World intros (10 worlds × 3 langs), fun facts (8+ per subject × 3 langs), encouragement messages
  - Reports module: Parent performance report with subject bars, strengths/weaknesses, badges, recommendations, RTL-aware HTML output
  - Daily login rewards: 11 tier levels (Day 1→150 coins + power-ups), streak tracking, calendar view
  - Skill level display on menu (Beginner/Intermediate/Advanced/Expert/Master)
  - Daily streak info on menu
- **Engagement Module:** Built into engine.js — encouragement messages, fun facts after levels, story intros on first world visit
- **Storage Keys:** `catk_progress`, `catk_cat`, `catk_mute`, `catk_intelligence`, `catk_story`, `catk_economy`, `catk_daily`
- **Category:** general (multi-subject)
- **Module Breakdown:**
  - `config.js` — Constants, subjects, world definitions, coin rewards
  - `core.js` — Question generation for 10 subjects, scoring, star calc
  - `engine.js` — Main game loop, screen management, all integrations (~950 lines)
  - `i18n.js` — Full i18n (ar/en/pt) with ~60 keys including DDA, story, reports, economy, daily
  - `sounds.js` — Web Audio oscillator-based SFX
  - `ui.js` — DOM rendering, confetti, background canvas
  - `worlds.js` — 10 world configs with names, icons, gradients
  - `cats.js` — 12 cat emoji avatars with names, costs, unlock logic
  - `intelligence.js` — DDA engine: EMA smoothing (α=0.2), per-subject tracking, skill levels, performance trends
  - `story.js` — World intros, fun facts, encouragement; uses `catk_story` storage
  - `reports.js` — Generates parent report objects, renders styled HTML with progress bars and badges
  - `economy.js` — 5 power-up definitions, buy/use logic, activation tracking
  - `daily.js` — 11-tier daily rewards, streak system, calendar data generation

### 6. مملكة الجواهر — Gem Kingdom 💎
- **Files:** `gem-kingdom.html` + `gem-kingdom-modules/{config.js, core.js, ui.js, worlds.js, story.js, engagement.js, boss.js, economy.js, intelligence.js, reports.js}`
- **Total Code:** ~8,442 lines across 11 files
- **Structure:** 10 worlds × 10 levels + bosses = 100+ levels
- **Mechanics:** Match-3 puzzle (swap gems, match 3+, special gems, cascades)
- **Features:** Boss battles, 30 badges, shop, power-ups, DDA v2, story module, engagement module, cognitive report
- **Storage Keys:** `classify_gem_*`
- **Category:** puzzle
- **Status:** Tier S — fully featured

### 7. مملكة الثلج — Ice Kingdom 🧊
- **Files:** `ice-kingdom.html` + `ice-kingdom-modules/{config.js, core.js, engine.js, i18n.js, sounds.js, cats.js}`
- **Total Code:** ~2,382 lines across 7 files
- **Structure:** 10 worlds × 5 levels = 50 levels (quiz-based)
- **Features:** Quiz gameplay with winter theme, cat avatars, basic shop
- **Missing:** DDA, story module, reports, economy (power-ups), daily rewards
- **Storage Keys:** `ick_*`
- **Category:** general
- **Status:** Tier A — needs feature expansion (same pattern as Cat Kingdom upgrade)

### 8. الثعبان ثلاثي الأبعاد — Snake 3D 🐍
- **Files:** `snake-3d.html` + `snake-3d-modules/{config.js, core.js, engine.js, i18n.js, sounds.js}`
- **Total Code:** ~3,312 lines across 6 files
- **Structure:** Progressive snake gameplay with educational questions between rounds
- **Features:** 3D-styled snake with CSS transforms, world themes, quiz integration
- **Missing:** DDA, story module, reports, economy, daily rewards, engagement module
- **Storage Keys:** `snake3d_*`
- **Category:** general
- **Status:** Tier A — needs feature expansion

### 9. الشطرنج — Chess ♟️
- **Files:** `chess-game.html` (14,226 lines — Godot WASM export)
- **Total Code:** ~14,226 lines (single file + WASM binary)
- **Structure:** Full chess game via Godot engine compiled to WebAssembly
- **Features:** AI opponent, standard chess rules
- **Note:** Architectural outlier — not modular JS. Limited customization possible.
- **Category:** logic
- **Status:** Tier ? — works but hard to extend due to Godot WASM architecture

---

## 🎯 GAME IDEAS PIPELINE

Future games should target these educational categories:

| Category | Game Concept | Complexity |
|----------|-------------|------------|
| language | Word Puzzle / Spelling Kingdom | High |
| science | Element Explorer / Chemistry Lab | Medium |
| geography | Map Quest / World Explorer | Medium |
| coding | Code Blocks / Logic Puzzle | High |
| art | Drawing Challenge / Color Match | Medium |
| music | Rhythm Game / Note Match | Medium |
| reading | Story Builder / Reading Quest | High |
| logic | Pattern Recognition / Sequence Solver | Medium |

---

## ⚠️ ABSOLUTE RULES (VIOLATIONS = FAILURE)

1. **NO external dependencies** — No CDN links, no npm packages in games, no external images
2. **NO React for new games** — HTML/Vanilla JS in iframe ONLY
3. **ALL assets are emoji** — No image files, no SVG files, no sprite sheets
4. **ALL audio is Web Audio API** — No .mp3, .wav, .ogg files
5. **ALL CSS is inline** — In the HTML `<style>` tag, no external CSS files
6. **postMessage GAME_COMPLETE is mandatory** — Without it, no points are earned
7. **Score MUST be 0-100 scale** — Server expects percentage-based scoring
8. **3 languages minimum** — Arabic, English, Portuguese
9. **Canvas init AFTER screen visible** — Never before `showScreen()`
10. **Clear DOM on replay** — `container.innerHTML = ''` before re-rendering
11. **Test in iframe** — Games must work when loaded inside ChildGames.tsx iframe
12. **Add to seedDefaultGames()** — Or the game won't appear in the game list

---

## 🚨 PRODUCTION API ERROR PREVENTION

### Common Errors Found (2025-06 Audit)

| Error | Root Cause | Fix |
|-------|-----------|-----|
| **500 on check-likes/check-votes** | `sql\`ANY(${array})\`` doesn't work with Drizzle array params | Use `inArray(column, array)` from drizzle-orm |
| **404 on /api/contact-info** | Client called non-existent endpoint | Map to existing `/api/support-settings` with field mapping |
| **500 SQL template errors** | Using raw SQL templates with arrays | Always use Drizzle's `inArray()`, `eq()`, `and()` operators |

### Mandatory Rules

1. **NEVER use `sql\`ANY(${array})\``** — Use `inArray(column, array)` from drizzle-orm instead
2. **ALWAYS verify API routes exist** before calling from client — Check `server/routes/*.ts`
3. **Test all new API calls** with `curl` before deploying
4. **No orphaned client API calls** — Every `fetch("/api/...")` must have a corresponding server route
5. **Array query params** — Use `inArray()` for WHERE IN queries, never raw SQL with arrays
6. **Error handling** — All API routes must return proper `errorResponse()` format, never crash
7. **Drizzle ORM** — Prefer Drizzle query builders over raw SQL templates

### Game Share Notification System

When a child shares a game result (post with `###GAME_SHARE###` content):
- Server auto-notifies: Parents, Followers, Friends
- Notification type: `game_shared`
- Dedup on client: Same game+score share is only posted once, then social sharing buttons shown
- Social share buttons: WhatsApp, Facebook, X (Twitter), Copy Link

---

**This document is the single source of truth for game development in Classify.**  
**Update it when patterns change, bugs are fixed, or new games are built.**
