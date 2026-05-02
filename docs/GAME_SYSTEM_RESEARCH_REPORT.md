# 🎮 CLASSIFY GAME SYSTEM — COMPLETE RESEARCH REPORT

**Generated:** Research scan of full codebase  
**Scope:** Every game-related file, route, schema, module, and asset  
**Purpose:** Comprehensive game development memory bank with raw data  

---

## TABLE OF CONTENTS

1. [Game Registry & Database Schema](#1-game-registry--database-schema)
2. [Game Listing & Iframe System](#2-game-listing--iframe-system)
3. [HTML/Vanilla JS Games](#3-htmlvanilla-js-games)
4. [React Games](#4-react-games)
5. [Server Routes](#5-server-routes)
6. [Capacitor / Mobile](#6-capacitor--mobile)
7. [Assets & File Structure](#7-assets--file-structure)
8. [Server-Side Logic](#8-server-side-logic)
9. [Known Bugs & Fixes](#9-known-bugs--fixes)
10. [Swipe Gesture Patterns](#10-swipe-gesture-patterns)

---

## 1. GAME REGISTRY & DATABASE SCHEMA

**File:** `shared/schema.ts` (2335 lines)

### `flashGames` Table (line ~432)

```typescript
export const flashGames = pgTable("flash_games", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  embedUrl: varchar("embed_url", { length: 500 }).notNull(),
  thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
  category: varchar("category", { length: 50 }).default("general"),
  minAge: integer("min_age"),
  maxAge: integer("max_age"),
  pointsPerPlay: integer("points_per_play").default(5),
  maxPlaysPerDay: integer("max_plays_per_day").default(0), // 0 = unlimited
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### `childGameAssignments` Table (line ~451)

```typescript
export const childGameAssignments = pgTable("child_game_assignments", {
  id: serial("id").primaryKey(),
  childId: integer("child_id").references(() => children.id, { onDelete: "cascade" }),
  gameId: integer("game_id").references(() => flashGames.id, { onDelete: "cascade" }),
  maxPlaysPerDay: integer("max_plays_per_day"),
  isActive: boolean("is_active").default(true),
  assignedBy: integer("assigned_by").references(() => parents.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  unique: unique().on(t.childId, t.gameId),
}));
```

### `gamePlayHistory` Table (line ~464)

```typescript
export const gamePlayHistory = pgTable("game_play_history", {
  id: serial("id").primaryKey(),
  childId: integer("child_id").references(() => children.id, { onDelete: "cascade" }),
  gameId: integer("game_id").references(() => flashGames.id, { onDelete: "cascade" }),
  pointsEarned: integer("points_earned").default(0),
  score: integer("score"),
  totalQuestions: integer("total_questions"),
  playedAt: timestamp("played_at").defaultNow(),
});
```

### Related Tables

- **`childGrowthTrees`** (line ~184): Tracks `gamesPlayed` counter, incremented via `recordGrowthEvent("game_played", 3)` on each game completion
- **`pointsHistory`** / **`pointsLedger`**: Track point transactions from game rewards
- **`children`**: Has `totalPoints` field updated by `applyPointsDelta()`

---

## 2. GAME LISTING & IFRAME SYSTEM

### ChildGames.tsx — The Game Hub

**File:** `client/src/pages/ChildGames.tsx` (477 lines)

#### Data Fetching
- Fetches games: `GET /api/games` with optional `Authorization: Bearer ${childToken}` header
- Fetches child info: `GET /api/child/info`
- Both via TanStack Query with `staleTime: 5 * 60 * 1000`

#### Game Rendering
- Games displayed in a responsive grid with thumbnail, title, category badge
- Category filtering: "all", "math", "puzzle", "general", etc.
- Each game card shows: thumbnail (or emoji fallback), title, points per play, category chip
- Daily play tracking: shows remaining plays, disables game when limit reached

#### Iframe Loading
- Internal games: `src={game.embedUrl}?lang=${i18n.language}` (language passthrough)
- External games: Same src but with `sandbox="allow-scripts allow-same-origin allow-popups"`
- Iframe overlays game list with back button

#### postMessage Protocol (CRITICAL)
```typescript
// Listener in ChildGames.tsx — validates origin
window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;  // SECURITY CHECK
  
  if (event.data?.type === 'GAME_COMPLETE') {
    // { type: 'GAME_COMPLETE', score: number, total: number }
    // score clamped: Math.max(0, Math.min(10000, score))
    // POST /api/child/complete-game { gameId, score, totalQuestions: total }
  }
  
  if (event.data?.type === 'SHARE_ACHIEVEMENT') {
    // { type: 'SHARE_ACHIEVEMENT', game, level, score, stars, text }
    // POST /api/child/posts with achievement text
  }
});
```

#### Completion Flow
1. Game sends `GAME_COMPLETE` via postMessage
2. ChildGames.tsx validates origin
3. POSTs to `/api/child/complete-game` with `{ gameId, score, totalQuestions }`
4. Server responds with `{ pointsEarned, newTotalPoints }`
5. Reward animation shown for 3 seconds
6. Daily play counter updated

#### Wrapping
- Entire page wrapped in `<ChildAppWrapper>` (auth guard, push notifications, permissions)
- Uses `<MandatoryTaskModal>` for sponsored tasks
- Uses `<GrowthTree>` component

### ChildAppWrapper.tsx

**File:** `client/src/components/ChildAppWrapper.tsx` (82 lines)

- Auth guard: Checks `childToken` in localStorage, redirects to `/child-link` if missing
- Validates token via `GET /api/child/info` (TanStack Query, `staleTime: 30000`)
- On 401: clears all child storage, redirects to login
- First-time setup: Shows `<ChildPermissionsSetup>` if `child_permissions_setup_complete` not set
- Wraps children with: `<ChildWebPushRegistrar>`, `<ChildMobilePushRegistrar>`, `<NotificationCenter>`, `<ChildTaskNotificationManager>`

---

## 3. HTML/VANILLA JS GAMES

### 3A. Memory Kingdom (مملكة الذاكرة)

**Main File:** `client/public/games/memory-match.html` (799 lines)  
**Module Files:** `client/public/games/memory-modules/` (4 files)

| File | Lines | Purpose |
|------|-------|---------|
| `config.js` | 546 | Constants, i18n (AR/EN/PT), shop items, power-ups, badges, XP table |
| `worlds.js` | 412 | 10 worlds, boss catalog, 100 procedural levels, helpers |
| `ui.js` | 590 | Web Audio SFX/music, particle system, background animation, screen mgmt, card rendering |
| `core.js` | 2191 | Game state, DDA engine, all 11 mechanics, boss system, endgame, shop, badges, reports |

#### Architecture
- Single HTML file with inline CSS + modular ES6 JS
- Imports modules from `./memory-modules/` using `<script type="module">`
- No build step, no external dependencies
- All button events wired in JS (no inline `onclick`) — clean event architecture
- Web Audio API for all sound (no audio files)

#### Screens
- `world-screen` → `lvl-screen` → `game-screen` → `done-screen`
- Additional: `shop-screen`, `badge-screen`, `report-screen`
- Screen transitions via `.fade-in` CSS class

#### Language System
- Reads `?lang=` from URL params, defaults to `'ar'`
- Full i18n for Arabic, English, Portuguese
- Sets `document.documentElement.dir` for RTL support

#### Persistent State (localStorage)
All keys prefixed `classify_memPro_*`:
| Key | Content |
|-----|---------|
| `classify_memPro_progress` | stars (per level idx), scores, worldsBeaten, unlocked count |
| `classify_memPro_wallet` | coins, owned theme IDs, equipped theme, totalEarned |
| `classify_memPro_badges` | unlocked badge IDs, dates |
| `classify_memPro_dda` | Legacy profile: skill, gamesPlayed, totalStars, avgMoveRatio |
| `classify_memPro_ddav2` | Per-mechanic skills (0-100), sessionHistory, avgResponseMs, totalSessions |
| `classify_memPro_powers` | peek:3, freeze:2, hint:3, shield:2, shuffle:2 (initial values) |
| `classify_memPro_xp` | total XP, level (1-10) |
| `classify_memPro_streak` | current, best, lastDate |
| `classify_memPro_prestige` | level count |
| `classify_memPro_mute` | boolean |
| `classify_memPro_stats` | gamesPlayed, fastestTime, mechsPlayed[], puUsed count |

- Migrates from old `classify_memory_*` keys automatically

#### 10 Worlds (`worlds.js`)

| # | World | Emoji | Mechanics Progression | Boss |
|---|-------|-------|----------------------|------|
| 0 | Nature/Dream Forest | 🌿 | classic→timed→moving→masked→fog→triple→chain→bomb→rainbow→BOSS | shadow (🦊, HP:3) |
| 1 | Ocean Depths | 🌊 | classic→timed→moving→masked→fog→triple→chain→bomb→rainbow→BOSS | kraken (🦑, HP:4) |
| 2 | Magic Kitchen | 🍕 | classic→timed→moving→masked→fog→triple→chain→bomb→rainbow→BOSS | ghost (👻, HP:4) |
| 3 | Space Journey | 🚀 | classic→timed→moving→masked→fog→triple→chain→bomb→rainbow→BOSS | alien (👾, HP:5) |
| 4 | Music City | 🎵 | classic→timed→moving→masked→fog→triple→chain→bomb→rainbow→BOSS | storm (🌪️, HP:5) |
| 5 | Adventure Land | ⚔️ | classic→timed→moving→masked→fog→triple→chain→bomb→rainbow→BOSS | dragon (🐉, HP:6) |
| 6 | Tech World | 💻 | classic→timed→moving→masked→fog→triple→chain→bomb→rainbow→BOSS | glitch (🤖, HP:6) |
| 7 | Color Island | 🎨 | classic→timed→moving→masked→fog→triple→chain→bomb→rainbow→BOSS | ice (❄️, HP:7) |
| 8 | Castle of Secrets | 🏰 | classic→timed→moving→masked→fog→triple→chain→bomb→rainbow→BOSS | trickster (🎭, HP:7) |
| 9 | Memory Championship | 👑 | classic→timed→moving→masked→fog→triple→chain→bomb→rainbow→BOSS | king (👑, HP:8) |

- **Unlock chain:** Each world requires stars from previous (World 1 needs World 0 stars ≥10)
- **100 procedurally generated levels** (10 per world) with globalIdx, gridCols/Rows, pairs, mechanic, bossType, card colors
- **Grid sizes:** Progress from 3×2 (6 cards) to 8×7 (56 cards) across 11 difficulty levels

#### 11 Game Mechanics (`config.js` + `core.js`)

| Mechanic | ID | Description |
|----------|----|-------------|
| CLASSIC | `classic` | Standard memory match pairs |
| TIMED | `timed` | All cards revealed briefly, then must match from memory |
| MOVING | `moving` | Unmatched cards shuffle positions every N moves (DDA-adjusted: easy=4, hard=2) |
| MASKED | `masked` | X% of cards show decoy symbol first (900ms), then reveal real symbol |
| FOG | `fog` | X% of cards covered with fog overlay — must tap to clear before flipping |
| TRIPLE | `triple` | Match 3 cards instead of 2, uses separate grid sizes (3×2 to 6×6) |
| BOSS | `boss` | All mechanics combined + boss HP + timed countdown + periodic boss attacks |
| MIRROR | `mirror` | Unmatched card positions are reversed every N moves |
| CHAIN | `chain` | Must match pairs in a specific predefined order |
| BOMB | `bomb` | Some cards have countdown bombs; explode = reshuffle to new positions |
| RAINBOW | `rainbow` | Wild cards that match anything |

#### DDA System v2 (`core.js` lines 1300-1600)

**Per-mechanic skill profiles (0-100):**
- Stored per mechanic type in `ddaV2.mechSkills`
- Session rolling window of last 20 moves
- Exponential Moving Average for response time
- Three tiers: `easy` (<35), `normal` (35-70), `hard` (>70)

**Adaptive parameters based on skill:**
| Parameter | Easy (<35) | Normal | Hard (>70) |
|-----------|------------|--------|------------|
| fogPct | 0.25 | 0.38 | 0.50 |
| maskPct | 0.20 | 0.32 | 0.45 |
| bombCountBase | 9 | 7 | 5 |
| rainbowCount | 4 | 3 | 2 |
| peekDuration | 2200ms | 1600ms | 1200ms |
| bossCd | 160s | 120s | 90s |
| hintDelay | 3000ms | 5500ms | 8000ms |

**Progressive 3-Level Hint System:**
1. Level 1: Gentle glow — highlight ONE card faintly for 3s
2. Level 2: Highlight pair — both cards glow stronger for 4s
3. Level 3: Quick peek — briefly flip both cards face-up for 1.2s

**Skill adjustment:**
- On match: gain 2 + speed bonus (fast match < 2s) + streak bonus → capped at 100
- On mismatch: lose 1.5× penalty multiplier (higher penalty for high-skill players) → min 0
- End of level: blend 60% current + 40% performance score per mechanic

#### Boss System (`core.js` lines 700-1100, `worlds.js`)

**10 Unique Bosses (BOSS_CATALOG):**

| Boss | Emoji | World | HP | Phases | Abilities |
|------|-------|-------|----|--------|-----------|
| shadow | 🦊 | 0 | 3 | 2 | hideEdge, fogZone |
| kraken | 🦑 | 1 | 4 | 2 | inkWrap, fogZone, shuffleAll |
| ghost | 👻 | 2 | 4 | 2 | swapSymbols, fogZone, hideEdge |
| alien | 👾 | 3 | 5 | 3 | fogZone, shuffleAll, swapSymbols |
| storm | 🌪️ | 4 | 5 | 3 | shuffleAll, fogZone, burnCard |
| dragon | 🐉 | 5 | 6 | 3 | burnCard, fogZone, shuffleAll |
| glitch | 🤖 | 6 | 6 | 3 | reverseFlip, swapSymbols, freezeCards |
| ice | ❄️ | 7 | 7 | 3 | freezeCards, fogZone, shuffleAll |
| trickster | 🎭 | 8 | 7 | 3 | swapSymbols, reverseFlip, burnCard |
| king | 👑 | 9 | 8 | 4 | hideEdge, inkWrap, shuffleAll, burnCard |

**8 Boss Abilities:**

| Ability | Effect | Duration |
|---------|--------|----------|
| hideEdge | Hides 2-4 border cards temporarily | 2s |
| inkWrap | Covers 20% of unmatched cards with ink overlay | 3s |
| swapSymbols | Swaps symbols of 2 unmatched cards | Permanent |
| fogZone | Adds fog to 3-5 adjacent cards (seed + neighbors) | Until cleared |
| shuffleAll | Shuffles ALL unmatched card positions | Permanent |
| burnCard | Un-matches a previously matched pair (must re-match!) | Permanent |
| reverseFlip | Briefly reveals 3-4 cards then re-hides (confusion) | 600ms |
| freezeCards | Locks 2-3 cards, can't flip for 3 moves | 3 moves |

**Phase system:** Abilities change at HP thresholds with decreasing cooldowns.

#### Economy System (`core.js`)

**Coins:**
- Base: 3★=50, 2★=25, 1★=10
- Bonuses: first-time +20, boss +15, non-classic +5, per-world +2×worldIndex
- Multipliers: prestige (+10% per level), streak (config-based per day)

**XP Engine:**
- Base: 3★=30, 2★=15, 1★=8
- Bonus: +1.5 per world index
- Multipliers: prestige (+5% per level), streak (config-based)
- 10 XP levels (0→3600 XP), titles from "🐣 Novice" to "👑 Legend"

**Shop:** 8 card themes (default free → royal 500 coins), each with custom card face/back colors  
**Power-ups:** 5 types (peek, freeze, hint, shield, shuffle) with price  
**Streak:** Daily streak tracking with coin bonus + XP multiplier (up to 7+ days = 2.0x)  
**Prestige:** Requires 80 levels completed; resets progress, keeps wallet/badges/XP; +10% coins, +5% XP per prestige level

#### Badges (30 Achievements) (`config.js` + `core.js`)

Categories: levels completed, stars earned, perfect 3★ counts, world completion, speed records, total coins, themes owned, streak days, mechanic mastery (skill ≥90), all mechanics tried, power-ups used, prestige level

Each badge shows: progress bar when locked, date when unlocked, popup celebration with confetti

#### Scientific Parent Report (`core.js` lines 1850-2020)

**6 Cognitive Dimensions computed from gameplay:**
| Dimension | Calculation |
|-----------|------------|
| Spatial Memory | 40% moving + 30% mirror + 30% classic skill |
| Working Memory | 35% chain + 30% triple + 35% masked skill |
| Focus & Attention | 30% bomb + 30% fog + 40% boss skill |
| Adaptability | (mechsPlayed/10)×60 + avgSkill×0.4 |
| Processing Speed | 100 - (avgResponseMs - 1000)/60, clamped 10-100 |
| Persistence | bestStreak×8 + gamesPlayed×0.5, capped at 100 |

**Overall Score:** Average of all 6 dimensions  
**Skill Labels:** Beginner / Developing / Competent / Proficient / Expert  
**Recommendations:** Targeted per dimension (e.g., "Practice fog & bomb levels to improve focus")  
**Mechanic Skills Breakdown:** Per-mechanic skill bars  
**Session Data:** Avg response time, fastest level, best streak, perfect levels, power-ups used, XP level, prestige

#### postMessage to Parent (`core.js` lines 2120-2140)

```javascript
window.parent.postMessage({
  type: 'GAME_COMPLETE',
  score: sc,           // 0-100 calculated score
  total: 100,
  timeElapsed: dur,    // seconds
  moves: moves,
  level: currentLevel + 1,
  world: currentWorld + 1,
  stars: stars,        // 0-3
  isBoss: lvl.isBoss,
  bossDefeated: bossState?.defeated
}, '*');
```

```javascript
// Share achievement
window.parent.postMessage({
  type: 'SHARE_ACHIEVEMENT',
  game: 'memory',
  level: lvl,
  score: progress.scores[currentLevel] || 0,
  stars: stars,
  text: shareText
}, '*');
```

**Note:** Uses wildcard origin `'*'` — differs from ChildGames.tsx which validates `window.location.origin`.

---

### 3B. Math Challenge (مملكة الأرقام — Emoji Kingdom)

**Main File:** `client/public/games/math-challenge.html` (2001 lines)  
**Module Files:** `client/public/games/math-modules/` (9 files)

| File | Lines | Purpose |
|------|-------|---------|
| `config.js` | 358 | Question types, emoji pool, i18n (AR/EN/PT), achievements (25) |
| `core.js` | 244 | Progress management, XP/level, lives, combo, scoring |
| `worlds.js` | 483 | 10 worlds, procedural level generation, unlock logic, prestige, daily/weekly challenges |
| `ui.js` | 347 | Web Audio SFX/music, particles, animations, performance detection |
| `boss.js` | 200 | 50 unique boss types (5 per world), boss state machine |
| `intelligence.js` | 247 | DDA: per-type skill profiles, session tracker, weighted type selection |
| `economy.js` | ~200 | Coins, boosters, daily login, achievements |
| `engagement.js` | ~150 | Emotion feedback, near miss, micro-challenge badges |
| `reports.js` | 198 | Parent reports: overview, worlds, skills, engagement, grade estimation |

#### Architecture
- Single HTML file with inline CSS (royal 3D visual system) + inline script bootstrapping modules
- Uses `onclick` attributes (unlike memory-match which uses JS event wiring)
- Imports from `./math-modules/` using `<script type="module">`
- No build step, no external dependencies
- Web Audio API for all sound

#### Screens
- `world-screen` → `lvl-screen` → `game-screen` → `done-screen`
- Modals: `lvlup-modal`, `shop-modal`, `nolives-modal`, `ach-modal`, `report-modal`

#### Persistent State (localStorage)
- Key: `classify_math_v3` (migrates from v2 / v1)
- Structure:
```javascript
{
  version: 3,
  worlds: { [worldId]: { levelReached, scores: {}, stars: {} } },
  totalXP: 0, playerLevel: 1,
  coins: 50, // starting coins
  lives: 5,  // max 5, regen 1 every 10 min
  livesAt: timestamp,
  boosters: { hammer: 1, shuffle: 1, extraTime: 1, hint: 3 },
  badges: [], dailyChallenge: {},
  skillData: { avgResponseTime, accuracyRate, highestStreak, totalGamesPlayed, smoothedSkill, typeProfiles: {} },
  prestige: {}, loginStreak: {},
  achievementsUnlocked: [],
  bossesBeaten: 0, perfectGames: 0, worldsCleared: 0, totalPrestige: 0
}
```

#### 10 Worlds (`worlds.js`)

| # | World | Emoji | Age | Operations | Question Types | Unlock |
|---|-------|-------|-----|-----------|---------------|--------|
| 0 | Forest | 🌿 | 4-6 | count, add | visualCount, classic, compare, doubles | Free |
| 1 | Orchard | 🍎 | 5-7 | add | classic, visualCount, missingNumber, ordering | 15★ forest |
| 2 | Ocean | 🌊 | 5-8 | add, sub | classic, missingNumber, compare, estimation | 15★ orchard |
| 3 | Volcano | 🔥 | 7-10 | multiply | classic, trueFalse, missingNumber, speedRound | 15★ ocean |
| 4 | Electric | ⚡ | 8-11 | mul, div | classic, missingNumber, placeValue, estimation | 15★ volcano |
| 5 | Castle | 🏰 | 8-12 | fractions | fractionVisual, classic, compare, missingNumber | 15★ electric |
| 6 | Space | 🌌 | 9-12 | decimals | classic, trueFalse, missingNumber, sequence | 15★ castle |
| 7 | Puzzle | 🧩 | 6-14 | patterns | sequence, classic, ordering, trueFalse | 25★ ocean |
| 8 | Geometry | 🏗️ | 9-14 | geometry | geometry, classic, missingNumber, trueFalse | 25★ electric |
| 9 | Algebra | 👑 | 11-15 | algebra | algebra, classic, missingNumber, trueFalse | 20★ space |

- Procedural level generation via `generateLevelConfig(worldId, levelIndex, skillData, progress)`
- Boss every 10 levels per world (5 boss types per world)
- Timer starts at different levels per world, decays per tier
- Op progression within worlds (e.g., Forest: count→add→add+sub as levels advance)

#### 15 Question Types (`config.js`)

`classic`, `visualCount`, `compare`, `trueFalse`, `missingNumber`, `placeValue`, `sequence`, `fractionVisual`, `geometry`, `algebra`, `wordProblem`, `speedRound`, `estimation`, `doubles`, `ordering`

- Each with full Arabic/English/Portuguese translations

#### 50 Boss Types (`boss.js`)

5 bosses per world, each with: emoji, 2-3 phases, 10-15 HP, labeled name

| World | Boss Types |
|-------|-----------|
| Forest | dragon_baby, slime_king, mushroom_giant, tree_monster, root_dragon |
| Orchard | apple_wizard, fruit_ninja, seed_giant, harvest_boss, orchard_dragon |
| Ocean | kraken, coral_king, wave_master, deep_serpent, trident_boss |
| Volcano | lava_dragon, fire_elemental, magma_golem, volcano_king, eruption_lord |
| Electric | thunder_bot, circuit_breaker, spark_master, voltage_king, storm_lord |
| Castle | knight_boss, shield_guardian, castle_dragon, throne_keeper, king_paladin |
| Space | alien_emperor, nebula_dragon, void_walker, star_destroyer, galaxy_king |
| Puzzle | puzzle_master, pattern_phantom, maze_runner, logic_king, enigma_lord |
| Geometry | triangle_titan, circle_sage, cube_king, prism_dragon, architect_boss |
| Algebra | equation_dragon, variable_phantom, formula_wizard, x_lord, math_emperor |

Boss combat: `hitBoss()` reduces HP, phase transitions at thresholds (colors: green→yellow→red), `bossAttack()` reduces player HP (5 max), defeated when HP=0

#### DDA (Dynamic Difficulty Adjustment) — `intelligence.js`

**Per-Question-Type Skill Profiles:**
- Accuracy: Exponential Moving Average with adaptive alpha (more weight to recent for beginners)
- Average response time tracked per type
- Mastery score (0-100): 60% accuracy + 30% speed + 10% experience

**Session Tracker (rolling window of 8):**
- Frustration detection: low accuracy + slow + consecutive wrong
- Boredom detection: high accuracy + fast + consecutive right
- Flow state: accuracy 60-90% with low frustration and boredom

**Difficulty offset:** -2 to +2, auto-adjusts. Affects:
- `adjustRange()`: Modifies number range based on skill + session offset
- `adjustTimer()`: Modifies timer per-question based on skill + session offset
- `getQuestionDifficulty()`: Per-question easy/medium/hard with session awareness

**Weighted Type Selection (Zone of Proximal Development):**
- Sweet spot mastery: 30-65 (highest weight)
- Staleness bonus for types not seen recently
- Variety guard: prevents 3-in-a-row same type

#### Economy (`economy.js`)

- **Coins per level:** stars × 10, +25 perfect bonus, ×2 daily challenge
- **Boosters:** hammer (50🪙), shuffle (30🪙), extraTime (20🪙), hint (40🪙) — 1.10× price escalation per purchase
- **Daily login:** Streak-based bonus (5 + 2/day, cap 50), tracks consecutive days
- **Lives system:** Max 5, regenerate 1 every 10 minutes, `getLives()` auto-regenerates on check
- **25 Achievements** (config.js): totalStars, playerLevel, bossesBeaten, highStreak, perfectGames, dailyStreak, worldsCleared, totalPrestige, gamesPlayed — each awards coins

#### Engagement (`engagement.js`)

- **Emotion feedback:** Streak messages at 3/5/8/10 ("Amazing! 🔥", "Incredible! ⚡", "Math Genius! 🧠", "Legendary! 👑")
- **Encouragement after streak break:** "No worries, keep going! 💪"
- **Near miss detection:** "one answer away from star" and "time ran out on last question"
- **Micro-challenges per level:** fast answers (<5s) → ⚡ badge, perfect answers (<3s) → ✨ badge, no hint usage → 🧠 badge

#### Parent Reports (`reports.js`)

| Report | Content |
|--------|---------|
| Overview | playerLevel, totalXP, totalStars, coins, gamesPlayed, highestStreak, smoothedSkill, accuracyRate, avgResponseTime, bossesBeaten, perfectGames, achievements, dailyStreak, prestige |
| Per-World | Stars, levels, mastery, prestige, avgStars per world |
| Skill Analysis | Per question type: mastery, accuracy, avgTime, attempts, strength classification (strong/developing/needs_practice) |
| Strength/Weakness | Top 3 strengths + top 3 weaknesses by mastery score |
| Engagement | Daily streak, login streak, challenges, next achievement progress |
| Grade Estimate | Weighted age mapping from world progress × skill mastery → KG through 10th grade with confidence score |

**Report delivery:** `sendReportToParent()` generates full report via `Reports.generateFullReport(progress)` and sends via `window.parent.postMessage(report, '*')` with `type: 'MATH_PROGRESS_REPORT'`

#### postMessage to Parent (`math-challenge.html` line 1580)

```javascript
window.parent.postMessage({
  type: 'GAME_COMPLETE',
  score: Math.round(totalCorrect / totalQ * 100), // 0-100 percentage
  total: 100,
  timeElapsed: elapsed,
  level: currentLevelIndex >= 0 ? currentLevelIndex + 1 : 0,
  world: currentWorld,
  stars: stars
}, '*');
```

```javascript
// Share achievement
window.parent.postMessage({
  type: 'SHARE_ACHIEVEMENT',
  game: 'math',
  world: currentWorld,
  level: currentLevelIndex,
  score: totalScore,
  stars: starsCount,
  text: shareText
}, '*');
```

#### Audio System (`ui.js`)

Both games share identical Web Audio API architecture:
- AudioContext created on demand, handles suspended state
- Performance detection: `navigator.hardwareConcurrency` ≤2 or `deviceMemory` ≤2 → low-perf mode (reduced particles)
- SFX: tone generator (sine/square/triangle waves), bell (with decay), sparkle (noise burst)
- Game-specific SFX: sfxCorrect (rising xylophone), sfxWrong (gentle boop), sfxComplete (ascending cascade), sfxStar, sfxTick, sfxLevelUp (fanfare), sfxBossHit, sfxBossAttack, sfxComboUp (pitch scales with streak)
- Adaptive music: Pentatonic melody system (C pentatonic, BPM 100), drone loop (root + fifth), intensity scales with combo

**Memory-specific audio additions:**
- Per-world pentatonic scales with unique BPM (70-120)
- sfxFlip (stereo pan based on card position), sfxMatch, sfxNoMatch, sfxBomb, sfxMirror, sfxChain, sfxChainFail, sfxRainbow, sfxPowerUp, sfxWhoosh
- World-specific background music with root+fifth drones

---

## 4. REACT GAMES

### 4A. Match3 Puzzle Game (لعبة المجوهرات)

**Files:**

| File | Lines | Purpose |
|------|-------|---------|
| `client/src/games/match3/types.ts` | 111 | Type definitions for gems, specials, levels, visuals |
| `client/src/games/match3/levels.ts` | 150 | 10 level definitions |
| `client/src/games/match3/engine.ts` | 361 | Pure logic engine (no rendering) |
| `client/src/games/match3/Match3Game.tsx` | 892 | Canvas-rendered game component |
| `client/src/pages/Match3Page.tsx` | 208 | Level select + game wrapper |

#### Types (`types.ts`)

**6 Gem Types:** Ruby, Emerald, Sapphire, Topaz, Amethyst, Diamond  
**5 Special Types:** None, RocketH, RocketV, Bomb, Rainbow  

```typescript
// Gem styles with unique shapes and colors
const GEM_STYLES = {
  [GemType.Ruby]:     { shape: 'circle',   bg: '#FF4757', glow: '#FF6B81', light: '#FF8A9B' },
  [GemType.Emerald]:  { shape: 'diamond',  bg: '#2ED573', glow: '#7BED9F', light: '#A5F0C5' },
  [GemType.Sapphire]: { shape: 'square',   bg: '#1E90FF', glow: '#54A0FF', light: '#82B8FF' },
  [GemType.Topaz]:    { shape: 'triangle', bg: '#FFD700', glow: '#FECA57', light: '#FFE680' },
  [GemType.Amethyst]: { shape: 'hex',      bg: '#A55EEA', glow: '#C97EFF', light: '#DCA0FF' },
  [GemType.Diamond]:  { shape: 'star',     bg: '#FF6348', glow: '#FF7F50', light: '#FFA07A' },
};
```

**Level structure:**
```typescript
interface LevelData {
  id: number;
  name: string;           // Arabic name
  rows: number;           // All 8
  cols: number;           // All 8
  moves: number;          // 25→14 decreasing
  gems: GemType[];        // BASIC(4) → ALL(6)
  objectives: LevelObjective[];  // score or collect
  stars: [number, number, number]; // 3 thresholds
}
```

#### Levels (`levels.ts`)

10 levels, all 8×8 grid. Progressive difficulty:

| Level | Moves | Gems | Objectives | Star Thresholds |
|-------|-------|------|-----------|-----------------|
| 1 | 25 | 4 (BASIC) | Score 800 | 800/1500/2500 |
| 2 | 22 | 4 | Score 1200 | 1200/2500/4000 |
| 3 | 20 | 4 | Collect 12 Ruby | 1500/3000/5000 |
| 4 | 20 | 5 | Score 2000 | 2000/4000/7000 |
| 5 | 18 | 5 | Collect 15 Emerald | 2500/5000/8000 |
| 6 | 18 | 5 | Score 3000, Collect 10 Sapphire | 3000/6000/10000 |
| 7 | 16 | 6 (ALL) | Score 4000 | 4000/8000/13000 |
| 8 | 16 | 6 | Collect 20 Topaz | 5000/10000/16000 |
| 9 | 14 | 6 | Score 5000, Collect 15 Amethyst | 6000/12000/19000 |
| 10 | 14 | 6 | Score 7000 | 8000/15000/22000 |

All names in Arabic (e.g., "بداية المغامرة", "تحدي الجواهر", etc.)

#### Engine (`engine.ts`) — Pure Logic, No Rendering

Key functions:
- `initGrid(level)`: Creates 8×8 grid with no pre-existing matches
- `swapGems(grid, a, b)`: Swap two adjacent gems
- `findMatches(grid)`: Find all horizontal + vertical matches ≥3
- `getSpecials(matches, grid, swapPos)`: Determine specials from matches:
  - L/T intersection → **Bomb** (highest priority)
  - Match 5+ → **Rainbow**
  - Match 4 → **Rocket** (H if vertical match, V if horizontal)
- `specialClearPositions(gem, grid, targetType)`: Calculate positions cleared by special activation:
  - RocketH: entire row
  - RocketV: entire column
  - Bomb: 3×3 area
  - Rainbow: all gems of target type
- `processMatches(grid, matches, swapPos)`: Remove gems, create specials, chain-activate specials being removed
- `applyGravity(grid, level)`: Fill empty cells from above, generate new gems
- `hasValidMoves(grid)`: Check if any valid swap exists (brute force all adjacent pairs)
- `calcScore(matches, combo)`: 3-match=100, 4-match=300, 5+=500+(len-5)×200, ×(1+combo×0.5)
- `calcStars(score, thresholds)`: 1/2/3 star rating
- `updateObjectives(objectives, removed, grid, prevGrid)`: Track collect objectives
- `objectivesComplete(objectives, score)`: Check if all objectives met

#### Match3Game.tsx — Canvas-Rendered Game (892 lines)

**Rendering:** Full canvas with `requestAnimationFrame` game loop at ~60fps  
**Animation system:** Tween-based with easing functions:
- `easeOutQuad`: Standard deceleration
- `easeOutBack`: Overshoot + settle (for spawning)
- `easeOutBounce`: Bounce effect (for falling gems)

**Animation phases:**
```
Idle → Swapping → (match found?) → Removing → Falling → Checking → (cascade?) → Idle
                 → (no match) → SwapBack → Idle
```

**Timing constants:**
- SWAP_MS: Swap animation duration
- REMOVE_MS: Gem removal animation
- FALL_MS: Gravity fall per row
- SPAWN_MS: New gem spawn animation

**Visual features:**
- Dark gradient background (#1a0a2e → #16213e → #0a1628)
- Gem shapes: circle, diamond, square, triangle, hex, star — drawn procedurally
- Radial gradient fills with highlight ellipse
- Glow shadows per gem type
- Special gem indicators: colored rings, directional arrows (rockets), dashed ring (bomb), animated conic gradient (rainbow)
- Particle system: colored circles with gravity
- Score popups: float up with fade
- Screen shake on big combos (≥2 combo or ≥6 gems removed)
- Star progress bar on canvas with gold gradient
- HUD overlay (React): back button, level name, moves counter, score, combo indicator
- Objectives bar at bottom

**Input handling:**
- Touch: `onTouchStart/Move/End` on canvas
- Mouse: `onMouseDown/Move/Up` on canvas
- Control methods:
  1. Swipe: drag >30% of cell size determines direction → swap adjascent
  2. Tap-tap: select first gem, tap adjacent gem to swap
- Position calculation: `pixelToGrid()` converts canvas coordinates to grid row/col

**Win/Lose:**
- Win: All objectives complete → "أحسنت!" overlay with stars, calls `onComplete(stars, score)`
- Lose: Moves exhausted → "انتهت الحركات" overlay with retry button

#### Match3Page.tsx — Level Select (208 lines)

- Level grid with star display, sequential unlock (need ≥1 star on previous)
- localStorage persistence key: `match3-progress`
- How-to-play expandable section
- Stats: total stars, levels completed
- Navigation: back to `/child-games`
- Completion: sends `onComplete(stars, score)` → no postMessage to parent (self-contained progress)

### 4B. React Memory Game (Simple Version)

**Files:**

| File | Lines | Purpose |
|------|-------|---------|
| `client/src/games/memory/types.ts` | 57 | Type definitions |
| `client/src/games/memory/memoryUtils.ts` | 84 | Deck creation, scoring |
| `client/src/games/memory/useMemoryGame.ts` | 162 | React hook for game logic |
| `client/src/games/memory/MemoryGame.tsx` | ~140 | React component |
| `client/src/games/memory/memoryGame.css` | 295 | Styles with 3D card flip |
| `client/src/games/memory/index.ts` | 4 | Barrel exports |
| `client/src/pages/MemoryMatchPage.tsx` | 31 | Page wrapper with postMessage |

This is a **simplified React version** of the memory game (compared to the full HTML version):
- Fixed 4×4 grid, 8 pairs
- 16 emoji symbols (🍎🐶🌟🎨🚀🌈🐱🎵🦋🌻🐠🎯🧩📚🔔🏆)
- Fisher-Yates shuffle for deck creation
- Scoring: max 100, -3 per extra move beyond pairs count, -0.5 per second beyond 30s grace, min 10
- 800ms flip delay
- CSS 3D card flip transforms with perspective
- i18n-aware, RTL support
- Purple gradient background with glassmorphism stats
- Idle hint animation

#### MemoryMatchPage.tsx — postMessage Wrapper (31 lines)

```tsx
// Wrapper posts GAME_COMPLETE when game finishes
const handleComplete = (result: GameResult) => {
  window.parent.postMessage({
    type: 'GAME_COMPLETE',
    score: result.score,
    total: result.maxScore,
    duration: result.duration,
    moves: result.moves,
  }, '*');  // ⚠️ Wildcard origin
};
```

**SECURITY NOTE:** Uses `'*'` wildcard origin, while ChildGames.tsx validates `window.location.origin`

---

## 5. SERVER ROUTES

### Game Listing — `GET /api/games` (`server/routes/child.ts` line ~860)

```typescript
// Returns all active games
// If child has JWT + has assignments → filtered to assigned games only
// If child has JWT + no assignments → returns all (backwards compatible)
router.get("/api/games", optionalAuth, async (req, res) => {
  const activeGames = await db.select().from(flashGames).where(eq(flashGames.isActive, true));
  
  if (req.user?.childId) {
    const assignments = await db.select()
      .from(childGameAssignments)
      .where(and(
        eq(childGameAssignments.childId, req.user.childId),
        eq(childGameAssignments.isActive, true)
      ));
    
    if (assignments.length > 0) {
      // Filter to assigned games only
      const assignedIds = new Set(assignments.map(a => a.gameId));
      return res.json({ success: true, data: activeGames.filter(g => assignedIds.has(g.id)) });
    }
  }
  
  res.json({ success: true, data: activeGames });
});
```

### Game Completion — `POST /api/child/complete-game` (`server/routes/child.ts` line ~897)

```typescript
router.post("/api/child/complete-game", childAuth, async (req, res) => {
  // Validates: gameId exists, game is active
  // Daily limit check: child assignment override > game default maxPlaysPerDay
  // Today's play count check
  
  // Points calculation:
  const pct = score / totalQuestions;
  let points;
  if (pct <= 0)    points = 0;
  else if (pct < 0.5) points = Math.round(game.pointsPerPlay * 0.3);
  else if (pct < 0.8) points = Math.round(game.pointsPerPlay * 0.7);
  else              points = game.pointsPerPlay; // full points
  
  // In transaction:
  // 1. applyPointsDelta(childId, points, "game_play", ...)
  // 2. Insert gamePlayHistory record
  // 3. recordGrowthEvent("game_played", 3) → increments gamesPlayed
  
  res.json({ success: true, data: { pointsEarned, newTotalPoints } });
});
```

### Admin Game CRUD (`server/routes/admin.ts` lines 2640-2920)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/games` | GET | All games (including inactive) |
| `/api/admin/games` | POST | Create game (duplicate embedUrl → 409) |
| `/api/admin/games/:id` | PUT | Partial update any field |
| `/api/admin/games/:id` | DELETE | Hard delete |
| `/api/admin/games/:id/toggle` | PATCH | Toggle isActive |
| `/api/admin/games/upload` | POST | Upload .html/.htm (10MB max) to `uploads/games/` |
| `/api/admin/games/bulk-toggle` | PATCH | Batch activate/deactivate by IDs array |
| `/api/admin/games/bulk-delete` | DELETE | Batch delete by IDs array |

All admin endpoints log audit trail (CREATE_GAME, UPDATE_GAME, DELETE_GAME).

### Parent Game Management (`server/routes/parent.ts` lines 3080-3300)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/parent/children/:childId/games` | GET | All active games + per-child status (isAssigned, assignmentActive, maxPlaysPerDay, todayPlays, todayPoints, totalPlays, totalPoints) |
| `/api/parent/children/:childId/games` | PUT | Bulk replace all assignments (delete all, insert new from gameIds array) |
| `/api/parent/children/:childId/games/:gameId` | PATCH | Update single assignment (maxPlaysPerDay, isActive). Creates if not exists |
| `/api/parent/children/:childId/game-stats` | GET | Today stats, all-time stats, recent 10 plays (joined with game title/thumbnail), growth tree data, assigned count |

All parent endpoints validate parent-child ownership first.

### Auto-Seed (`server/routes/index.ts` line ~40)

```typescript
async function seedDefaultGames() {
  // Creates 2 built-in games on server start:
  const defaults = [
    {
      title: "تحدي الرياضيات 🧮",
      embedUrl: "/games/math-challenge.html",
      category: "math", minAge: 5, maxAge: 14,
      pointsPerPlay: 10, maxPlaysPerDay: 5,
    },
    {
      title: "مملكة الذاكرة 🧠",
      embedUrl: "/games/memory-match.html",
      category: "puzzle", minAge: 4, maxAge: 14,
      pointsPerPlay: 10, maxPlaysPerDay: 0, // unlimited
    },
  ];
  // Deduplication: keeps first per embedUrl, deletes duplicates, updates title/description
  // Cleans legacy URLs: "/memory-match", "/math-challenge"
}
```

**⚠️ DATA DISCREPANCY:** Server auto-seed uses 10 pts/play, but standalone seed scripts (`scripts/seed-math-game.ts`, `scripts/seed-memory-game.ts`) use 5 pts/play. Also different age ranges and titles between them.

---

## 6. CAPACITOR / MOBILE

**File:** `capacitor.config.json`

```json
{
  "appId": "com.classify.app",
  "appName": "Classify",
  "webDir": "dist/public",
  "server": {
    "url": "https://classi-fy.com",
    "androidScheme": "https",
    "iosScheme": "https"
  },
  "android": {
    "backgroundColor": "#667eea",
    "overrideUserAgent": "Classify-Android/1.2.0",
    "webContentsDebuggingEnabled": false
  },
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 2000,
      "backgroundColor": "#667eea"
    },
    "PushNotifications": {}
  }
}
```

### Mobile Game Implications

- Games run inside WebView pointing at `classi-fy.com`
- HTML games load via iframe within the WebView — **double-nested web context**
- No game-specific Capacitor plugins configured
- No offline game support (server URL required)
- `overrideUserAgent` could be used for game-specific mobile detection
- Push notifications via `ChildMobilePushRegistrar` component in ChildAppWrapper
- No haptic feedback plugin configured (games use `navigator.vibrate()` which works on Android WebView)

### Android Build
- `android/` directory with Gradle build files
- `keystore.properties` for signing
- Google Play AAB present: `classify-googleplay.aab`

---

## 7. ASSETS & FILE STRUCTURE

### Game Files Location

```
client/public/games/
├── math-challenge.html           (2001 lines)
├── math-modules/
│   ├── config.js                 (358 lines)
│   ├── core.js                   (244 lines)
│   ├── worlds.js                 (483 lines)
│   ├── ui.js                     (347 lines)
│   ├── boss.js                   (200 lines)
│   ├── intelligence.js           (247 lines)
│   ├── economy.js                (~200 lines)
│   ├── engagement.js             (~150 lines)
│   └── reports.js                (198 lines)
├── memory-match.html             (799 lines)
└── memory-modules/
    ├── config.js                 (546 lines)
    ├── worlds.js                 (412 lines)
    ├── ui.js                     (590 lines)
    └── core.js                   (2191 lines)
```

### React Game Files

```
client/src/games/
├── match3/
│   ├── types.ts                  (111 lines)
│   ├── levels.ts                 (150 lines)
│   ├── engine.ts                 (361 lines)
│   └── Match3Game.tsx            (892 lines)
├── memory/
│   ├── types.ts                  (57 lines)
│   ├── memoryUtils.ts            (84 lines)
│   ├── useMemoryGame.ts          (162 lines)
│   ├── MemoryGame.tsx            (~140 lines)
│   ├── memoryGame.css            (295 lines)
│   └── index.ts                  (4 lines)

client/src/pages/
├── Match3Page.tsx                (208 lines)
├── MemoryMatchPage.tsx           (31 lines)
└── ChildGames.tsx                (477 lines)
```

### Game Uploads Directory

- `uploads/games/` — Admin-uploaded HTML game files via `/api/admin/games/upload`
- Multer config: `.html/.htm` only, 10MB max
- Files served as static assets

### Total Lines of Game Code

| Category | Files | Lines |
|----------|-------|-------|
| Memory HTML Game | 5 files | ~4,538 |
| Math HTML Game | 10 files | ~4,438 |
| Match3 React Game | 5 files | ~1,722 |
| Memory React Game | 7 files | ~773 |
| Game Hub / Pages | 3 files | ~716 |
| Server Routes (game portions) | 3 files | ~500 |
| **TOTAL** | **33 files** | **~12,687** |

### No External Assets

All games use:
- Emoji for all visual elements (2000+ emoji pool in memory game)
- Web Audio API for all sound (no audio files)
- CSS shapes and gradients (no images/sprites)
- Canvas drawing for Match3 gems
- Zero external dependencies or CDN resources

---

## 8. SERVER-SIDE LOGIC

### Points System

**Point calculation on game completion** (`child.ts`):

```
score/total ratio → points earned
≤0              → 0 points
<0.5            → 30% of pointsPerPlay
<0.8            → 70% of pointsPerPlay
≥0.8            → 100% of pointsPerPlay
```

**`applyPointsDelta()`** — Transactional point update:
1. Updates `children.totalPoints`
2. Inserts into `pointsHistory` (audit trail)
3. Updates `pointsLedger` (running balance)

### Daily Play Limits

Priority chain for `maxPlaysPerDay`:
1. Child-specific assignment: `childGameAssignments.maxPlaysPerDay`
2. Game default: `flashGames.maxPlaysPerDay`
3. 0 = unlimited

Count check: `SELECT COUNT(*) FROM gamePlayHistory WHERE childId = ? AND gameId = ? AND playedAt >= today`

### Growth Tree Integration

On each game completion: `recordGrowthEvent("game_played", 3)` → increments `childGrowthTrees.gamesPlayed` by 3

### Game Play History

Every completion is recorded in `gamePlayHistory`:
- childId, gameId, pointsEarned, score, totalQuestions, playedAt
- Used for: daily limit checks, parent stats, analytics

### Admin Game Upload Flow

1. Admin uploads `.html` file via `/api/admin/games/upload`
2. File saved to `uploads/games/{timestamp}-{filename}` via Multer
3. Returns URL path: `/uploads/games/{filename}`
4. Admin creates game entry with returned URL as `embedUrl`
5. Game is now playable by children via iframe

### Data Flow — Complete Game Lifecycle

```
1. Server boot → seedDefaultGames() creates math + memory entries
2. Parent → /api/parent/children/:id/games → assigns games to child
3. Child opens /child-games → GET /api/games (filtered by assignments)
4. Child taps game → iframe loads embedUrl?lang=ar
5. Game runs entirely client-side (localStorage for game progress)
6. Game completion → window.parent.postMessage({ type: 'GAME_COMPLETE', score, total })
7. ChildGames.tsx receives message → validates origin → POST /api/child/complete-game
8. Server: validates game, checks daily limit, calculates points, records history
9. Response: { pointsEarned, newTotalPoints }
10. ChildGames.tsx: shows reward animation, updates daily count
```

---

## 9. KNOWN BUGS & FIXES

### Bug 1: Memory Match Canvas 0×0 Dimensions

**Problem:** `initBg()` was called before the game screen was visible, resulting in canvas with 0×0 dimensions.

**Fix (visible in `core.js` `startLevel()`):**
```javascript
// Show screen FIRST, then init background in next frame
showScreen('game-screen');
requestAnimationFrame(() => {
  initBg(currentGroup);
});
```

### Bug 2: ResizeObserver Race Condition for Card Grid

**Problem:** Card grid rendered before container had final dimensions.

**Fix (visible in `core.js` `startLevel()`):**
```javascript
// Clear grid first
g.innerHTML = '';
// Use ResizeObserver with validation
const ro = new ResizeObserver((entries) => {
  const r = entries[0].contentRect;
  if (r.width > 50 && r.height > 50) {
    ro.disconnect();  // Only use first valid measurement
    renderCards(/*...*/);
  }
});
ro.observe(g);
// 600ms fallback in case ResizeObserver never fires valid dimensions
setTimeout(() => {
  ro.disconnect();
  renderCards(/*...*/);
}, 600);
```

### Bug 3: Duplicate Game Entries

**Problem:** Auto-seed could create duplicate games on repeated server restarts.

**Fix (visible in `server/routes/index.ts` `seedDefaultGames()`):**
- Checks existing games by `embedUrl`
- Keeps first per embedUrl, deletes duplicates
- Cleans legacy URLs (`/memory-match`, `/math-challenge`) that don't start with `/games/`

### Bug 4: Seed Script vs Auto-Seed Discrepancy

**Status:** UNRESOLVED

Three different sources set different values for the same games:
| Source | pointsPerPlay | Age Range | Title |
|--------|--------------|-----------|-------|
| Auto-seed (index.ts) | 10 | 5-14 / 4-14 | "تحدي الرياضيات 🧮" / "مملكة الذاكرة 🧠" |
| seed-math-game.ts | 5 | 6-14 | "تحدي الرياضيات 🧮" |
| seed-memory-game.ts | 5 | 4-12 | "لعبة الذاكرة 🧠" |

Auto-seed runs on every server start and may overwrite values set by seed scripts.

### Bug 5: postMessage Origin Security Mismatch

**Status:** UNRESOLVED

| Component | Origin Validation |
|-----------|------------------|
| ChildGames.tsx (listener) | ✅ `event.origin !== window.location.origin` |
| memory-match.html (sender) | ❌ `window.parent.postMessage(..., '*')` |
| math-challenge.html (sender) | ❌ `window.parent.postMessage(..., '*')` |
| MemoryMatchPage.tsx (sender) | ❌ `window.parent.postMessage(..., '*')` |

The listener validates, but senders use wildcard. This works but is not best practice. Since games and host are same-origin for built-in games this is low risk, but external games could potentially send fake `GAME_COMPLETE` messages if `sandbox` doesn't block it.

### Bug 6: Match3 No postMessage to Parent

**Status:** BY DESIGN (likely)

Match3Page.tsx manages its own localStorage progress (`match3-progress`) but does NOT send `GAME_COMPLETE` to the parent iframe. The `onComplete(stars, score)` callback only updates local state. This means:
- Match3 game completions are NOT recorded in the server's `gamePlayHistory`
- No points are awarded for Match3 games
- Parent game-stats page won't show Match3 activity

This appears to be because Match3 is navigated to via React Router (`/match3`) rather than loaded as an iframe game.

---

## 10. SWIPE GESTURE PATTERNS

### Swipe-Back Navigation (`App.tsx`)

**File:** `client/src/App.tsx` (530 lines)

```typescript
const GAME_ROUTES = ["/child-games", "/match3", "/memory-match"];

function useSwipeBackGesture() {
  // Horizontal swipe detection
  // Threshold: >70px horizontal movement
  // Triggers: window.history.back()
  // DISABLED on: GAME_ROUTES (the 3 game paths)
  // SKIPS: interactive elements (buttons, inputs, canvas, etc.)
}
```

**Why disabled on game routes:**
- `/child-games`: Contains iframe which has its own touch handling
- `/match3`: Canvas-based game with swipe-to-swap mechanics
- `/memory-match`: Card flip mechanics that conflict with swipe-back

### Match3 Swipe Input (`Match3Game.tsx`)

```typescript
// Canvas touch/mouse handlers
const handlePointerDown = (e) => {
  // Records touch start position + grid position
  touchRef.current = { x, y, pos: gridPos };
};

const handlePointerMove = (e) => {
  // Calculates delta from start
  // Threshold: >30% of cell size
  // Determines direction: horizontal vs vertical (larger delta wins)
  // Executes swap in that direction
  // Single swipe = one game action
};
```

### Memory Game Touch Handling

HTML Memory game (`core.js`): Card clicks handled via DOM event listeners on card buttons.  
React Memory game (`MemoryGame.tsx`): Standard React onClick handlers on card divs.  
Neither uses custom swipe gestures — tap only.

### Math Challenge Touch Handling

`math-challenge.html`: Standard button clicks + optional numpad for advanced questions. No custom swipe gestures.

### Gesture Conflict Resolution

The system resolves gesture conflicts through route-based disabling:
1. App-level `useSwipeBackGesture()` checks current path against `GAME_ROUTES`
2. If on a game route → gesture hook returns early, no swipe detection
3. Games handle their own touch events independently
4. Canvas games (Match3) consume touch events via `touch-none` CSS class on canvas element

---

## APPENDIX A: COMPLETE FILE INDEX

| File | Lines | Category |
|------|-------|----------|
| `shared/schema.ts` | 2335 | Schema (games: lines 432-480) |
| `server/routes/index.ts` | 182 | Auto-seed |
| `server/routes/child.ts` | ~1010+ | Game API (lines 860-1010) |
| `server/routes/admin.ts` | ~2920+ | Admin CRUD (lines 2640-2920) |
| `server/routes/parent.ts` | ~3300+ | Parent mgmt (lines 3080-3300) |
| `client/src/App.tsx` | 530 | Routing + swipe gesture |
| `client/src/pages/ChildGames.tsx` | 477 | Game hub + iframe |
| `client/src/pages/Match3Page.tsx` | 208 | Match3 level select |
| `client/src/pages/MemoryMatchPage.tsx` | 31 | Memory wrapper |
| `client/src/components/ChildAppWrapper.tsx` | 82 | Auth wrapper |
| `client/src/games/match3/types.ts` | 111 | Match3 types |
| `client/src/games/match3/levels.ts` | 150 | 10 levels |
| `client/src/games/match3/engine.ts` | 361 | Pure logic |
| `client/src/games/match3/Match3Game.tsx` | 892 | Canvas game |
| `client/src/games/memory/types.ts` | 57 | Memory types |
| `client/src/games/memory/memoryUtils.ts` | 84 | Utilities |
| `client/src/games/memory/useMemoryGame.ts` | 162 | React hook |
| `client/src/games/memory/MemoryGame.tsx` | ~140 | Component |
| `client/src/games/memory/memoryGame.css` | 295 | Styles |
| `client/src/games/memory/index.ts` | 4 | Barrel |
| `client/public/games/memory-match.html` | 799 | Memory main |
| `client/public/games/memory-modules/config.js` | 546 | Config/i18n |
| `client/public/games/memory-modules/worlds.js` | 412 | Worlds/levels |
| `client/public/games/memory-modules/ui.js` | 590 | Audio/visual |
| `client/public/games/memory-modules/core.js` | 2191 | Game logic |
| `client/public/games/math-challenge.html` | 2001 | Math main |
| `client/public/games/math-modules/config.js` | 358 | Config/i18n |
| `client/public/games/math-modules/core.js` | 244 | Progress/scoring |
| `client/public/games/math-modules/worlds.js` | 483 | 10 worlds |
| `client/public/games/math-modules/ui.js` | 347 | Audio/visual |
| `client/public/games/math-modules/boss.js` | 200 | 50 bosses |
| `client/public/games/math-modules/intelligence.js` | 247 | DDA system |
| `client/public/games/math-modules/economy.js` | ~200 | Economy |
| `client/public/games/math-modules/engagement.js` | ~150 | Engagement |
| `client/public/games/math-modules/reports.js` | 198 | Parent reports |
| `scripts/seed-math-game.ts` | ~50 | Seed script |
| `scripts/seed-memory-game.ts` | ~50 | Seed script |
| `capacitor.config.json` | ~30 | Mobile config |

## APPENDIX B: COMMUNICATION PROTOCOL SUMMARY

```
┌─────────────────────────────────────────────────────────────┐
│  ChildGames.tsx (React Parent)                              │
│                                                              │
│  Listens for postMessage (validates origin)                  │
│  ┌──────────────────────────────────────────────────┐       │
│  │ iframe src={embedUrl}?lang=ar                     │       │
│  │                                                    │       │
│  │  HTML Games post:                                  │       │
│  │  ┌─ GAME_COMPLETE ──────────────────────────────┐ │       │
│  │  │ { type, score, total, timeElapsed, level,    │ │       │
│  │  │   world, stars, [isBoss, bossDefeated,       │ │       │
│  │  │   moves] }                                    │ │       │
│  │  └──────────────────────────────────────────────┘ │       │
│  │  ┌─ SHARE_ACHIEVEMENT ─────────────────────────┐ │       │
│  │  │ { type, game, world, level, score, stars,    │ │       │
│  │  │   text }                                      │ │       │
│  │  └──────────────────────────────────────────────┘ │       │
│  │  ┌─ MATH_PROGRESS_REPORT ─────────────────────┐ │       │
│  │  │ { type, timestamp, overview, worlds, skills, │ │       │
│  │  │   strengthWeakness, engagement, gradeEstimate}│ │       │
│  │  └──────────────────────────────────────────────┘ │       │
│  └──────────────────────────────────────────────────┘       │
│                                                              │
│  On GAME_COMPLETE → POST /api/child/complete-game            │
│  On SHARE_ACHIEVEMENT → POST /api/child/posts                │
└─────────────────────────────────────────────────────────────┘
```

## APPENDIX C: STORAGE KEY REFERENCE

### Server-Side (PostgreSQL)
- `flash_games` — Game registry
- `child_game_assignments` — Per-child game access
- `game_play_history` — Play records + scores
- `child_growth_trees` — `gamesPlayed` counter

### Client-Side (localStorage)

| Key | Game | Type |
|-----|------|------|
| `classify_memPro_progress` | Memory HTML | Stars, scores, worldsBeaten |
| `classify_memPro_wallet` | Memory HTML | Coins, themes, equipped |
| `classify_memPro_badges` | Memory HTML | 30 badge unlock status |
| `classify_memPro_dda` | Memory HTML | Legacy DDA profile |
| `classify_memPro_ddav2` | Memory HTML | Per-mechanic skill profiles |
| `classify_memPro_powers` | Memory HTML | Power-up inventory |
| `classify_memPro_xp` | Memory HTML | XP and level |
| `classify_memPro_streak` | Memory HTML | Daily streak |
| `classify_memPro_prestige` | Memory HTML | Prestige level |
| `classify_memPro_mute` | Memory HTML | Sound preference |
| `classify_memPro_stats` | Memory HTML | Aggregate game stats |
| `classify_math_v3` | Math HTML | All math progress (single key) |
| `match3-progress` | Match3 React | Level stars and scores |
| `childToken` | Auth | JWT for child API access |
| `childId` | Auth | Child ID |
| `child_permissions_setup_complete` | App | First-time setup flag |

---

*End of research report. All data sourced directly from codebase files with exact line references.*
