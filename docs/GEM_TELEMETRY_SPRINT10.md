# Gem Kingdom Telemetry (Sprint 10)

Sprint 10 converts recurring-cause trend into an automatic priority recommendation.

## New Behavior
Inside `gemSessionHealth`:
- Reads recent session history (`last 10`)
- Counts recurring penalty keys from `topPenalties`
- If top recurring cause appears `>= 3` times:
  - Generates `priorityInsight` recommendation
  - Prepends it to recommendation list

## UI Addition
Gem Insights now renders:
- `Priority Insight` banner

This surfaces the most strategic next action based on repeated degradation causes rather than only current-session metrics.

## Scope
- Client-side only
- No API/backend changes
- Works on top of Sprint 9 stored explainability history
