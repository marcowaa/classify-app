# Gem Kingdom Telemetry (Sprint 1)

This document defines the initial telemetry events emitted by `gem-kingdom` and collected in `ChildGames`.

## Transport
- Source: `client/public/games/gem-kingdom-modules/core.js`
- Channel: `window.parent.postMessage`
- Message type: `GAME_TELEMETRY`
- Consumer: `client/src/pages/ChildGames.tsx`
- Buffer key: `sessionStorage['child_games_telemetry_buffer']`
- Buffer size: last 300 events

## Envelope
```json
{
  "type": "GAME_TELEMETRY",
  "game": "gem",
  "event": "event_name",
  "ts": 0,
  "sessionId": "gem_...",
  "world": 1,
  "level": 1,
  "screen": "world",
  "payload": {}
}
```

## Implemented Events
- `session_started`
- `modules_loaded`
- `module_load_failed`
- `game_ready`
- `screen_view`
- `level_started`
- `level_ready`
- `level_completed`
- `tutorial_started`
- `tutorial_step_advanced`
- `tutorial_completed`
- `story_dialog_shown`
- `story_dialog_closed`

## Notes
- Telemetry is non-blocking and wrapped in try/catch.
- Gameplay behavior is unchanged by telemetry emission.
- Parent-side buffering is session-scoped and resets with tab/session lifecycle.
