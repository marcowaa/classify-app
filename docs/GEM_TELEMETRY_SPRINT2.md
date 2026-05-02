# Gem Kingdom Telemetry (Sprint 2)

Sprint 2 extends Gem telemetry with funnel and QoS metrics for session-level diagnostics in `ChildGames`.

## New Events
- `level_abandoned`
  - Fired when an active level is exited before completion.
  - Current reasons:
    - `back_button`
    - `app_hidden`
- `qos_heartbeat`
  - Fired every ~10s during active gameplay.
  - Payload includes moving-window quality signals:
    - `frameDropsWindow`
    - `longFramesWindow`
    - `windowSec`
    - `perf`
    - `reducedEffects`
- `qos_effects_reduced`
  - Fired when runtime falls back to reduced effects due to repeated frame-budget pressure.
- `level_qos_summary`
  - Fired at level completion.
  - Payload includes total per-level QoS counters:
    - `totalFrameDrops`
    - `totalLongFrames`
    - `perf`
    - `reducedEffects`

## Updated Event Payloads
- `game_ready` now includes:
  - `initMs` (startup latency from `initGame()` to ready state)

## Consumption in ChildGames
`client/src/pages/ChildGames.tsx` now computes and displays additional session insights when Gem is open:
- `Abandon Rate`
- `Startup (ms)`
- `Avg Heartbeat Drops`
- `Avg Heartbeat Long`
- `Drops Per Level`
- `Long Frames/Level`
- `Effects Reduced` count

## Storage
- Buffer key unchanged: `sessionStorage['child_games_telemetry_buffer']`
- Buffer policy unchanged: keep last 300 events
