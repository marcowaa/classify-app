# Gem Kingdom Telemetry (Sprint 13)

Sprint 13 makes `Priority Insight` cooldown adaptive, not just tune-based static.

## Previous State (Sprint 12)
Cooldown was selected by tune profile only:
- easy: 20m
- balanced: 35m
- performance: 55m

## New Adaptive Behavior
Start from tune base cooldown, then adapt using recent recurring-cause stability:

1. Build `recent` window (last 10 sessions)
2. Compute top recurring cause frequency (`dominance = topCount / recent.length`)
3. Inspect volatility via number of unique top causes (`uniqueTopKeys`)

### Adjustment Rules
- If one cause dominates (`dominance >= 0.6`):
  - `+15m` cooldown
- If causes are volatile (`dominance <= 0.35` OR `uniqueTopKeys >= 4`):
  - `-10m` cooldown

### Bounds
Final cooldown is clamped to:
- minimum: `10m`
- maximum: `90m`

## Consistency Update
For same-key suppression checks, the persisted cooldown from last shown insight is now respected (`lastState.cooldownMs`) to avoid inconsistent suppression when profile/cooldown policy changes between sessions.

## Scope
- Client-side only
- No API/backend changes
- Extends Sprint 12 policy
