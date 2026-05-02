# Gem Kingdom Telemetry (Sprint 4)

Sprint 4 completes two practical execution items:
- Session trend tracking (cross-session mini history)
- Live tuning profile controls (applied from host to Gem runtime)

## 1) Session Trend Tracking
In `ChildGames`, session health snapshots are now persisted to local storage:
- Key: `child_games_gem_session_health_history`
- Retention: last 20 sessions
- Stored fields:
  - `sessionId`
  - `ts`
  - `qualityScore`
  - `completionRate`
  - `winRate`
  - `abandonRate`
  - `startupMs`
  - `tune`

The Gem Insights panel renders a mini bar trend chart from the latest history.

## 2) Live Tuning Profiles
In Gem Insights (`ChildGames`), users can apply one of:
- `Balanced`
- `Performance`
- `Easy`

Host behavior:
- Current profile is persisted in local storage key `child_games_gem_tune_profile`.
- Profile is passed to Gem iframe via query parameter:
  - `tune=balanced|performance|easy`

Gem runtime behavior (`core.js`):
- Parses tuning from query string at startup.
- Includes tune profile in telemetry payloads (`session_started`, `game_ready`, `level_started`).
- Applies profile at level start:
  - `easy`: +4 moves and reduced gem variety floor to support completion
  - `performance`: enables reduced effects mode
  - `balanced`: default behavior

## Scope
- No API contract changes.
- Changes are confined to game host UI and Gem runtime tuning hooks.
