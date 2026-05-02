# Gem Kingdom Telemetry (Sprint 5)

Sprint 5 upgrades session health evaluation from static thresholds to adaptive thresholds based on recent history.

## Adaptive Threshold Engine
Implemented in `ChildGames.tsx` as `gemAdaptiveBaseline`.

### Data Source
- Local storage key: `child_games_gem_session_health_history`
- Input scope:
  - Prefer same tuning profile (`balanced`, `performance`, `easy`) when >= 5 samples
  - Fallback to global history otherwise
- Sample window: last 20 sessions
- Minimum required samples: 5

### Derived Limits
When adaptive mode is enabled:
- `abandonWarn`: P75(abandonRate) + 8, clamped to [20, 55]
- `completionLow`: P25(completionRate) - 8, clamped to [35, 75]
- `winLow`: P25(winRate) - 8, clamped to [30, 70]
- `startupWarnMs`: P75(startupMs) + 500, clamped to [1800, 5000]

Fallback defaults (when insufficient history):
- `abandonWarn = 35`
- `completionLow = 55`
- `winLow = 45`
- `startupWarnMs = 3000`
- frame thresholds remain fixed (`25`, `8`)

## UI Changes
Gem Insights now shows adaptive mode status:
- `Adaptive Thresholds ON (N sessions)`
- `Adaptive Thresholds OFF (insufficient history)`

## Scope
- No backend or API changes.
- Purely client-side scoring and alert logic evolution.
