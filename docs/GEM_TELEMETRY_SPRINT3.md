# Gem Kingdom Telemetry (Sprint 3)

Sprint 3 adds decision-oriented insight on top of telemetry metrics in `ChildGames`.

## What Was Added
- Session health scoring (0-100) for current Gem session.
- Rule-based alert classification:
  - `critical`
  - `warning`
  - `info`
- Automatic actionable recommendations generated from current session metrics.

## Inputs Used
Rules evaluate Sprint 1 and Sprint 2 metrics from `gemTelemetryInsights`, including:
- `moduleLoadFailed`
- `abandonRate`
- `completionRate`
- `winRate`
- `startupMs`
- `avgLevelFrameDrops`
- `avgLongFramesWindow`
- `qosReducedEffectsCount`
- `tutorialStarted` / `tutorialCompleted`

## UI Output
Inside Gem Insights panel (`ChildGames` modal footer), Sprint 3 now shows:
- `Session Health` badge with quality score
- Alert chips with severity coloring
- Top 3 recommendations for immediate tuning priorities

## Scope
- No gameplay rules changed in Gem itself.
- Sprint 3 is a consumer-layer enhancement (analysis + presentation).
