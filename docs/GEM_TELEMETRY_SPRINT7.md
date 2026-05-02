# Gem Kingdom Telemetry (Sprint 7)

Sprint 7 introduces adaptive score weighting for session health scoring.

## Goal
Move from fixed penalty impact to context-aware impact based on:
- active tune profile
- recent session history (same tune preferred)
- inferred device constraints

## New Component
In `ChildGames.tsx`:
- `gemAdaptiveWeights` (useMemo)

### Base weights by tune
- `balanced`: neutral
- `performance`: stronger startup/QoS penalties, softer completion/win penalties
- `easy`: stronger completion/win/abandon penalties, softer startup/QoS penalties

### History-aware adjustments
From recent history (up to 20 sessions, minimum 5):
- If average completion is low, increase completion penalty weight
- If average win rate is low, increase win penalty weight
- If device appears consistently constrained (high frame drops/long frames), soften QoS/startup penalty weights

## Scoring Integration
`gemSessionHealth` now applies penalties via weighted helper:
- `penalize(base, weight)`

Weighted areas:
- module failures
- abandon rate
- completion rate
- win rate
- startup latency
- QoS pressure and reduced-effects fallback
- tutorial drop-off

## UI Transparency
Gem Insights now displays:
- `Adaptive Weights: ON/OFF`

## Scope
- Client-side only
- No API/backend changes
- No gameplay rule changes
