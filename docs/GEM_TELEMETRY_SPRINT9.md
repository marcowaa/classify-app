# Gem Kingdom Telemetry (Sprint 9)

Sprint 9 adds root-cause trend tracking on top of explainability output.

## History Extension
Session history entries now persist explainability summary fields:
- `topPenalties` (from current session health model)
  - `key`
  - `label`
  - `applied`

Storage key remains:
- `child_games_gem_session_health_history`

## New Trend View
`ChildGames` now computes recurring root causes from the last 10 sessions:
- Aggregates `topPenalties` by `key`
- Counts frequency
- Shows top 3 recurring causes

## UI Addition
Gem Insights now includes:
- `Recurring Causes (Last 10 Sessions)`

This complements score trend and top current deductions by showing repeated degradation patterns over time.

## Scope
- Client-side only
- No backend/API changes
