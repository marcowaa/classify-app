# Smart Garden Plan (Reference)

## Goal
Transform the current garden card into a richer farm-like gameplay loop with Classify-specific visual identity.

## Scope Of This Execution (Completed)
This file tracks delivery packages that have been implemented end-to-end in code.

### Package A: Smart Garden V1 Foundation

Status: Completed

1. Expanded plot capacity from fixed 4 to dynamic backend-driven slots.
2. Set default garden capacity to 12 plots for a farm-like progression feel.
3. Reworked frontend to render plots dynamically from server state length.
4. Upgraded slot validation logic in API routes to use one source of truth for plot limits.
5. Added smart recommendation tile in garden rewards ribbon to guide next action.
6. Updated in-card counters to show dynamic plot totals instead of hardcoded values.
7. Improved farm background visual distribution so plots fill lower green space more naturally.

### Package B/C: Economy + Daily Live Ops Core

Status: Completed (Core)

1. Added passive growth simulation on garden state fetch with daily event multipliers.
2. Added daily rotating garden events (calm day, rain day, harvest day).
3. Added daily quest state model for plant/care/harvest actions.
4. Added new API endpoints for daily data and daily reward claiming.
5. Wired quest progress updates directly into plant, tool-use, and harvest actions.
6. Applied daily multipliers to tool growth points and harvest rewards.
7. Added in-card daily UI panel with quest progress, event info, and claim-all action.
8. Synced garden daily query invalidation with garden actions for live UI consistency.

### Package C.1: Weekly Milestones Layer

Status: Completed

1. Added weekly quest state persistence keyed by local week start.
2. Added weekly quest progress tracking for plant/care/harvest actions.
3. Added weekly API endpoints for read + claim reward.
4. Added weekly claim reward points flow with transaction-safe balance update.
5. Added Weekly panel to garden UI with per-quest progress bars and claim action.
6. Synced weekly query invalidation after garden actions and claim operations.

### Package C.2: Child Login Reward Loop

Status: Completed

1. Added child login reward API state endpoint with 7-day reward table.
2. Added child login claim endpoint with streak continuity/reset logic.
3. Added transaction-safe points credit for login reward claims.
4. Added global child login modal in app wrapper (not limited to one game).
5. Connected modal messaging to daily/weekly garden progression loop.
6. Added i18n keys for all app locales used by child login reward modal.
7. Added weekly streak bonus layer (every 7 consecutive login claims).
8. Added weekly bonus visibility in child login reward modal.
9. Added celebratory burst animation when weekly bonus is unlocked.
10. Added internal analytics event logging on login reward claims and weekly bonus unlocks.

## Delivered Architecture Changes

### Backend
- Garden slot count is now configurable through a single constant in child routes.
- Slot index validation is centralized via helper function.
- Garden state normalization/persistence now adapts to target slot count.

### Frontend
- Plot theme state auto-syncs with current plot count.
- Selected plot index is clamped safely when slot count changes.
- Planting grid columns are generated dynamically.
- Smart hint chooses next recommended action based on current garden status.

## Future Packages (Planned, not part of completed scope)

### Package D: Economy Deepening
- Crop classes with growth-time profiles.
- Inventory tray with batch harvest/sell.
- Time-based yield multipliers.

### Package E: Social Safe Layer
- Safe farm visits and assist actions.
- Seasonal leaderboard without pay-to-win loops.

## Notes
- Keep this file as a permanent planning reference.
- Do not delete. Update status/sections as development advances.
