# Game UI + Infinite Levels Roadmap

Last updated: 2026-03-15

## Progress Update (Implemented)
- Memory Kingdom now has an endless engine after the base campaign.
- Base campaign remains unchanged (first 100 handcrafted levels).
- Endless challenge lanes are active in generation:
   - Focus lane
   - Speed lane
   - Memory lane
   - Boss marathon lane
- Endless progression is currently pre-generated with a high cap for stable runtime behavior.
- Lane progression rewards are now active:
   - Milestone tiers per lane grant extra coins.
   - Milestone tiers also grant extra hint power-ups.
   - Reward claiming is persisted per lane.

## Progress Update (Cross-Game Rollout)
- Safe-area handling is now normalized across all game entry screens:
   - Math Challenge
   - Snake 3D
   - Cat Kingdom
   - Ice Kingdom
   - (Memory/Gem already had previous safe-area upgrades)
- Compact-on-short-height tuning is now active for Math Challenge gameplay HUD/cards to reduce visual crowding.
- Adaptive child-reactive companion audio is now added to Math Challenge:
   - Positive momentum cues (happy/wow) on correct/combo flow.
   - Gentle wrong/alert cues with anti-spam cooldown.
- Adaptive child-reactive companion audio is now added to Snake 3D:
   - Supportive cues for combo growth.
   - Gentle warning cues on collisions/critical states.
   - Alert cue for rare-fruit events.

## Progress Update (Math Endless Lanes)
- Math Challenge lane system is now active over endless progression:
   - Every 10 levels form one lane.
   - Lane themes rotate (focus, speed, logic, marathon) and affect difficulty/reward multipliers.
   - Level cards and in-game title now show lane marker + lane slot.
- Lane completion rewards are now persisted per world:
   - First clear of each lane grants bonus coins and hint boosters.
   - Milestone lanes (every 5th lane) grant larger rewards.
- Story quiz trigger is now lane-aware (end-of-lane), not locked to only the first 10 levels.

## Progress Update (Snake Endless Lanes)
- Snake 3D endless mode now has lane progression over fruit milestones:
   - Every 15 fruits advances one lane.
   - Lane theme rotates and is shown in HUD and stage card summary.
- Lane rewards are now persisted (claimed once per lane):
   - Bonus score and extra lives on lane completion.
   - Milestone lanes (every 5th lane) grant larger rewards.
- Endless progress metadata is persisted for replay value:
   - Best endless fruits reached.
   - Claimed lane count and cumulative lane rewards.

## Progress Update (Ice Kingdom Lanes)
- Ice Kingdom campaign now surfaces lane progression across the 100-level journey:
   - Every 10 linear levels form one lane.
   - Level select and gameplay HUD now show lane marker and lane slot.
- Lane completion rewards are now persisted (claimed once per lane):
   - End-of-lane completion grants bonus coins and hint power-ups.
   - Milestone lanes (every 5th lane) grant larger rewards.
- Lane reward totals are persisted to support long-session progression tracking.

## Progress Update (Cat Kingdom Lanes)
- Cat Kingdom campaign now includes lane progression across the 100-level path:
   - Every 10 linear levels form one lane.
   - Level select and gameplay HUD now display lane marker + slot.
- Lane rewards are now persisted and claim-once per lane:
   - Lane completion grants bonus coins and hint power-ups.
   - Milestone lanes (every 5th lane) grant larger rewards.
- Lane reward metadata is now persisted for long-term replay progression.

## Progress Update (Gem Kingdom Lanes)
- Gem Kingdom progression now shows lane mapping across the full 100-level campaign:
   - Every 10 linear levels form one lane.
   - Level select and in-game HUD now show lane marker + slot.
- Lane rewards are now persisted and claim-once per lane completion:
   - Lane completion grants bonus coins and hint boosters.
   - Milestone lanes (every 5th lane) grant larger rewards.
- Lane reward totals and claimed-lane metadata are now persisted in game progress.

## Selected First Game
- Game: Memory Kingdom (`/games/memory-match.html`)
- Why first:
  - Already has strong architecture and mechanics (`memory-modules`).
  - Highest leverage for long-term replay (can scale procedural level generation quickly).
  - Contains known complexity where overlap/clipping issues are most likely.

## What Was Analyzed
- Host/iframe shell:
  - `client/src/pages/ChildGames.tsx`
- Game entry + CSS + screen structure:
  - `client/public/games/memory-match.html`
- Level/world generation:
  - `client/public/games/memory-modules/worlds.js`
- Runtime/game loop + layout rendering:
  - `client/public/games/memory-modules/core.js`
  - `client/public/games/memory-modules/ui.js`
- Server integration:
  - `server/routes/index.ts`
  - `server/routes/child.ts`
- Project game memory:
  - `docs/GAMES_MEMORY.md`

## UI Problems Found (Memory Kingdom)
1. Safe-area not handled in game viewport.
   - `memory-match.html` uses full-screen + `overflow:hidden`, but no CSS for `env(safe-area-inset-*)`.
   - Risk: top/bottom controls clipped under notches/home indicators on some phones.

2. Many fixed overlays compete in same visual layer.
   - Popups/toasts use high z-index (`999`, `9999`, `10000`, etc.).
   - Risk: CTA buttons or crucial HUD elements can be obscured during boss/popups.

3. Header stats can become cramped on narrow widths.
   - `g-hdr` packs title + 3 stat tiles in one row.
   - Risk: text truncation and touch targets shrinking under ~360px width.

4. Footer buttons may visually crowd gameplay area on short-height devices.
   - Game layout uses fixed header/info/footer + central grid.
   - Risk: grid shrinks too much and button rows feel clipped/tight.

5. Parent overlay header in iframe mode is feature-rich but dense.
   - `ChildGames.tsx` game modal top bar includes title + points chip + clarity toggle + close.
   - Risk: top control congestion on small phones in landscape.

## UI Upgrade Proposal (Memory Kingdom v2)
1. Add mobile-safe viewport tokens in game CSS.
   - Introduce:
     - `--safe-top: env(safe-area-inset-top, 0px)`
     - `--safe-bottom: env(safe-area-inset-bottom, 0px)`
   - Apply to game header/footer paddings.

2. Convert game HUD to two adaptive rows.
   - Row A: title + level badge + timer.
   - Row B: moves/pairs + mechanic badge + power buttons.
   - Trigger compact mode under width threshold.

3. Replace absolute popup stacking with managed overlay slots.
   - Slot tiers:
     - `overlay-toast` (non-blocking)
     - `overlay-modal` (blocking)
     - `overlay-celebration` (temporary, non-interactive)
   - Prevent multiple blocking overlays at once.

4. Create touch-first control sizing.
   - Minimum tap area: 44x44.
   - Consistent icon sizes by role.
   - Bottom CTA spacing with safe-bottom padding.

5. Add clipping guard tests.
   - Runtime checks for key controls visibility in 4 common viewport sizes.
   - Fail-safe class switch to compact layout when overlap detected.

## Infinite Levels Strategy (All Games)
Current Memory structure: 10 worlds x 10 levels = 100 levels.

Target: effectively unbounded progression (years of content) while preserving progression quality.

### Core Model
1. Keep handcrafted base worlds (current 100) as foundation.
2. Add procedural "Seasons" after base completion:
   - Season N produces level packs dynamically from templates.
   - Difficulty and mechanics are generated from skill profile + historical performance.
3. Introduce "Challenge Lanes":
   - Focus lane (accuracy)
   - Speed lane (reaction)
   - Memory lane (working memory)
   - Boss marathon lane

### Generation Inputs
- Mechanic pool
- Grid complexity tables
- Timer policies
- Interference modifiers (fog/mirror/bomb/etc.)
- Player profile (DDA v2 metrics)

### Progression Rules
- Level IDs become composite (season, lane, index).
- Star economy remains 0..3 per level but season rewards scale.
- Weekly meta-objectives unlock cosmetic and mastery badges.

### Retention Layer
- Daily rotating playlists
- Weekly boss gauntlets
- Monthly mastery arc with new badge tiers
- Long streak and comeback balancing

## Rollout Plan (Game by Game)
1. Memory Kingdom (current phase)
   - Phase A: UI anti-overlap refactor + compact HUD mode.
   - Phase B: Season engine v1 (extra 300 generated levels).
   - Phase C: Full infinite seasons.

2. Gem Kingdom
   - Apply same anti-overlap framework + season engine adapter.

3. Cat Kingdom / Ice Kingdom / Snake 3D
   - Standardize HUD and modal layering.
   - Expand level systems with template generators.

## Implementation Start Criteria (Memory)
- No clipping on small phone viewports.
- No hidden actionable buttons during popups.
- Boss overlays cannot mask core controls.
- Game remains stable in iframe and reports completion via postMessage.
