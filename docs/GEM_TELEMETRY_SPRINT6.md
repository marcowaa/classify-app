# Gem Kingdom Telemetry (Sprint 6)

Sprint 6 extends adaptive thresholds to QoS performance signals.

## Delta from Sprint 5
Previously adaptive mode covered:
- abandon rate
- completion rate
- win rate
- startup latency

Now adaptive mode also covers:
- `frameDropsWarn`
- `longFramesWarn`

## History Model Update
Session history entries now persist additional fields:
- `avgLevelFrameDrops`
- `avgLongFramesWindow`

Storage key remains:
- `child_games_gem_session_health_history`

## Adaptive QoS Derivation
Using last up to 20 sessions (same tune preferred when enough samples):
- `frameDropsWarn = clamp(P75(avgLevelFrameDrops) + 6, 10, 60)`
- `longFramesWarn = clamp(P75(avgLongFramesWindow) + 3, 4, 20)`

Fallback defaults remain:
- `frameDropsWarn = 25`
- `longFramesWarn = 8`

## UI Delta
Gem Insights adaptive status now also shows active QoS limits when adaptive mode is ON:
- `QoS limits: Drops>X | Long>Y`
