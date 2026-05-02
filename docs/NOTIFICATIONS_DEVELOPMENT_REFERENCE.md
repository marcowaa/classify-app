# Notifications Development Reference (Classify)

This file is the mandatory reference before any notifications-related change.
Goal: keep notifications fast, strong, and smart across in-app, web push, and mobile push.

## 1) Non-negotiable Principles

1. Delivery reliability first:
- Never send critical notifications only inline in request handlers.
- Use outbox events for push fan-out and retries.
- Keep idempotent behavior (dedupe key + retry-safe processing).

2. Smart urgency:
- `blocking` and `urgent` notifications must have strong presentation defaults.
- Use sound + vibration for high urgency unless user preference blocks it.

3. Multi-channel strategy:
- Always persist in-app notification.
- Add push channels for urgent classes (web/mobile).
- Respect user quiet hours and muted types for parent web push.

4. Performance and UX:
- Avoid duplicate burst spam for same event in a short window.
- Keep deterministic ordering in list endpoints.

5. Security and privacy:
- Do not expose sensitive metadata in push body.
- Keep sensitive data in server-side notification metadata only.

## 2) Notification Strength Matrix

- Blocking:
  - Style: fullscreen
  - Sound: on
  - Vibration: on
  - Channels: in_app + web_push + mobile_push

- Urgent:
  - Style: modal
  - Sound: on
  - Vibration: on
  - Channels: in_app + web_push + mobile_push

- Warning:
  - Style: banner
  - Sound: on
  - Vibration: off
  - Channels: in_app + web_push

- Normal:
  - Style: toast
  - Sound: off
  - Vibration: off
  - Channels: in_app

## 3) Dedupe Rules

- For each created notification, compute `dedupeKey` from:
  - recipientType + recipientId + type + relatedId + normalized title/message + semantic category.
- Skip insertion if equivalent notification exists in last window:
  - blocking/urgent: 45 sec
  - warning: 90 sec
  - normal: 120 sec

## 4) Outbox Event Contract

Use `outbox_events` to process async push sending.

Event type: `GENERIC_PUSH_NOTIFY`
Payload:
- recipientType: child | parent | admin | teacher
- recipientId
- type
- title
- message
- priority
- soundAlert
- vibration
- relatedId
- url
- metadata

Worker behavior:
- Send to active web/mobile subscriptions.
- Disable invalid subscriptions (404/410 for web, NotRegistered/InvalidRegistration for mobile).
- Retry transient failures with capped exponential-ish backoff.

## 5) Parent Preference Compliance

Before parent web push sending:
- Check `webPushEnabled`.
- Skip if type is in `mutedTypes`.
- Skip during quiet hours.

## 6) Mobile Push Strength Requirements

FCM payload should include:
- High priority for urgent/blocking.
- Android notification channel id by priority.
- Sound default for urgent/blocking.
- APNS priority/sound mapping for iOS.

## 7) API and Data Stability

- Keep response contract:
  - success: `{ "success": true, "data": ... }`
  - error: `{ "success": false, "error": "...", "message": "..." }`
- Preserve deterministic ordering in notification lists:
  - `createdAt desc, id desc`

## 7.1) Admin Broadcast Delivery Rules

- Endpoint: `POST /api/admin/send-notification`
- Payload supports both `message` and `body` (alias).
- `priority` is normalized to `0..10` before channel decision.
- Broadcast channel envelope is explicit and deduplicated:
  - Always includes `in_app`.
  - `web_push` is included only when `sendWebPush=true` and VAPID is configured.
  - `mobile_push` follows campaign decision profile.
  - `email` must not be auto-included for admin broadcast unless a dedicated opt-in is added.
- Do not enqueue legacy admin-only web push events in parallel with generic outbox for the same broadcast.
  - Use one delivery path to avoid duplicate user pushes.

## 8) Implementation Checklist (Use Every Time)

1. Read this file before coding.
2. Map target notification types to matrix level.
3. Ensure dedupe key coverage for new flow.
4. Ensure push path uses outbox (not only sync call).
5. Verify quiet hours and muted types for parent push.
6. Validate: TypeScript, build, tests, health.
7. Document any new type-level policy changes in this file.

## 9) Current Baseline (2026-03-16)

Implemented baseline to enforce:
- Strong profile defaults by priority/type.
- Dedupe window checks before insert.
- Generic push fan-out via outbox worker.
- Deterministic ordering and metadata visibility in admin notifications.

## 11) Task Notifications Hardening (2026-03-29)

- Global task notification defaults are now production-strong by default:
  - `levelDefault = 3` (urgent modal behavior)
  - channels default: `inApp=true`, `webPush=true`, `mobilePush=true`, `parentEscalation=false`
- Task assigned push fan-out now starts at level `>= 3` (not only level 4), so urgent task notifications reach web/mobile devices earlier.
- Quiet-hours are now enforced in task-assigned worker policy resolution:
  - non-blocking levels are muted during quiet hours for push/in-app channels
  - level 4 blocking notifications can bypass quiet-hours mute
- Metadata now includes `quietHoursMuted` for traceability when channel suppression is applied.

## 10) Firebase & Push Readiness Gate

Before release, run:

- Generate and persist VAPID keys automatically: `npm run notifications:vapid:write`
- Write FCM v1 env values from local service-account JSON: `npm run notifications:fcm:write`
- `notifications:fcm:write` auto-discovers service account via `GOOGLE_APPLICATION_CREDENTIALS` or secure default paths.
- `npm run check-notifications`
- `npm run check-notifications:strict` (for CI or hard gate)
- Optional iOS hard-gate: `npm run check-notifications:strict -- --require-ios`

Readiness gate validates:

- Web Push VAPID env vars: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- FCM readiness (either):
  - legacy: `FCM_SERVER_KEY`
  - v1: `FCM_PROJECT_ID` or `FIREBASE_PROJECT_ID` + service account via `FCM_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS`
- Android native file: `android/app/google-services.json`
- iOS native file: `GoogleService-Info.plist` under `ios/` (required only with `--require-ios` or `NOTIFICATIONS_REQUIRE_IOS=true`)

If strict mode fails, do not mark notifications as production-ready.
