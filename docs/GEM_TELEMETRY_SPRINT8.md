# Gem Kingdom Telemetry (Sprint 8)

Sprint 8 adds explainability for session-health scoring.

## What Was Added
In `ChildGames.tsx`, `gemSessionHealth` now records weighted deduction details for each triggered factor.

### New explainability data
- `topPenalties` (top 3 applied deductions), each item includes:
  - `label`
  - `applied` deduction points
  - `weight`
  - `value` (observed metric value)

### UI output
Gem Insights now includes a panel:
- `Top Score Deductions`

This gives immediate visibility into why `qualityScore` dropped in the current session.

## Scope
- Client-only change
- No backend/API changes
- No gameplay logic changes
