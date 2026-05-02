# Paid Services Unification (Admin-Controlled)

## Purpose
Centralize third-party paid integrations behind one config source that can be enabled/disabled from the admin panel without code edits.

## What Was Added

1. Unified backend config service:
- `server/services/paidServicesConfig.ts`
- Stored in `site_settings` using key: `paid_services_config_v1`
- Default mode for all services: disabled
- All services are initialized as `commented` status

2. Admin APIs:
- `GET /api/admin/paid-services-config`
- `PUT /api/admin/paid-services-config`

3. Public APIs:
- `GET /api/paid-services-config`
- `GET /api/settings` now includes `paidServices` (sanitized, no secrets)

4. Admin UI:
- Added paid services management section in Settings -> API tab
- Supports:
  - enable/disable toggle
  - mode selection (`disabled`, `trial`, `active`)
  - provider key editing
  - service field editing

## Initial Supported Services

- `ably_realtime`
- `pusher_channels`
- `onesignal_push`
- `openai_assistant`

## Actual Connected Service (Implemented)

- `onesignal_push` is now wired into runtime delivery.
- Integration point: generic push worker in `server/services/taskNotificationWorker.ts`.
- When `onesignal_push` is enabled and configured, generic push events mirror delivery to OneSignal using external user IDs:
  - `<recipientId>`
  - `<recipientType>:<recipientId>`

### Required OneSignal Mapping

- Client applications should set OneSignal external user ID using one of the above identifiers.
- Recommended standard: `<recipientType>:<recipientId>` to avoid collisions between user domains.

### Runtime Behavior

- Existing web/mobile push paths remain primary and unchanged.
- OneSignal acts as an optional mirrored paid channel.
- If OneSignal fails, worker retries are preserved through existing outbox retry flow.

## Security Behavior

- Secret fields are never returned in clear text to admin UI reads.
- Existing secret values are preserved when admin leaves secret inputs empty during update.
- Public endpoints return only sanitized state and metadata.

## Operational Notes

- Services remain inactive until explicitly enabled in admin panel.
- Configuration is runtime-driven from database (no redeploy required for toggles).
- This layer is an orchestration/feature-flag layer; provider-specific runtime wiring can be attached incrementally.
