# Gem Kingdom Telemetry (Sprint 12)

Sprint 12 makes `Priority Insight` cooldown configurable by tune profile.

## Change
Replaced fixed cooldown with tune-based policy:
- `easy`: 20 minutes
- `balanced`: 35 minutes
- `performance`: 55 minutes

## Implementation
In `ChildGames.tsx`:
- Added `cooldownByTune` map inside priority-insight generation logic.
- Cooldown now resolves from active `gemTuneProfile`.
- Persisted metadata now includes:
  - `cooldownMs`
  - `tune`

## UI Transparency
Priority Insight panel now displays:
- current cooldown duration
- active tune profile used for cooldown policy

## Scope
- Client-side only
- No API/backend changes
- Extends Sprint 11 cooldown + variant rotation logic
