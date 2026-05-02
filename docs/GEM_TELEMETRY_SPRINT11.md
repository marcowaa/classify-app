# Gem Kingdom Telemetry (Sprint 11)

Sprint 11 adds anti-repetition behavior for `Priority Insight`.

## Problem
The same recurring-cause recommendation could appear every session with identical phrasing.

## Solution
Implemented cooldown + phrasing rotation in `ChildGames.tsx`.

### Cooldown
- State key: `child_games_gem_priority_insight_state`
- If the same top recurring cause appears again within cooldown window, `Priority Insight` is suppressed.
- Cooldown window: `45 minutes`

### Message rotation
- Each recurring cause now has multiple recommendation variants.
- When cooldown allows re-show for the same cause, variant index rotates.

### Persistence
- When a priority insight is shown, metadata is persisted:
  - `key`
  - `shownAt`
  - `variantIndex`

## Scope
- Client-side only
- No API/backend changes
- Builds on Sprint 10 recurring-cause priority logic
