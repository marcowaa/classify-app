# Task Creation Backend Enhancements

This document primarily describes backend enhancements for parent task creation performance and reliability.
It also includes an end-to-end onboarding journey reference (Section 5) to document how age-based routing and trial classification flow in production.

## 1) Smart Idempotency for Task Creation

Supported endpoints:
- `POST /api/parent/create-task`
- `POST /api/parent/create-task-from-template`
- `POST /api/parent/create-and-send-task`
- `POST /api/parent/send-template-task`

How to use:
- Send header `Idempotency-Key: <unique-client-key>`.
- On rapid retries with identical payload, backend returns existing task instead of creating a duplicate.
- Response includes:
  - `idempotentReplay: true`
  - `replayWindowMs`

Replay semantics:
- If `Idempotency-Key` is sent, backend uses a persistent DB ledger (`task_create_idempotency`) for strong replay safety.
- If the same key is reused with different payload, backend returns `409`.
- If an identical request is in-flight with the same key, backend returns `409` until the first request completes.
- If no key is sent, fallback replay protection still uses a short payload-based replay window.

Replay window fallback (no key):
- Controlled by `TASK_CREATE_IDEMPOTENCY_WINDOW_MS` (default `45000` ms).

## 2) Bulk Task Creation API

Endpoint:
- `POST /api/parent/create-tasks/bulk`

Request body:
```json
{
  "mode": "all_or_nothing",
  "tasks": [
    {
      "childId": "<child-id>",
      "subjectId": "<optional-subject-id>",
      "question": "...",
      "answers": [
        { "text": "A", "isCorrect": true },
        { "text": "B", "isCorrect": false }
      ],
      "pointsReward": 10,
      "imageUrl": "",
      "gifUrl": ""
    }
  ]
}
```

Supported `mode` values:
- `all_or_nothing` (default): behaves atomically for validated tasks; any blocking validation error aborts the whole request.
- `partial`: valid tasks are created, invalid tasks are returned in `rejected[]` with reason codes/messages.

Limits and guarantees:
- Min 1 task, max 20 tasks per request.
- At least 2 non-empty answers are required for each task.
- Exactly one correct answer per task is required.
- Question content must include either:
  - non-empty `question` text, or
  - media URL (`imageUrl` or `gifUrl`) for media-only prompts.
- Parent-child ownership validated.
- Daily per-child task limit validated before charge.
- Wallet deduction is atomic for the whole bulk operation.
- On insufficient balance, no tasks are created.

### Media-aware answer payloads

Answer objects can now be text-only, media-only, or mixed.

Valid examples:
```json
{ "id": "a1", "text": "", "isCorrect": true, "media": { "url": "https://.../answer-audio.mp3", "mimeType": "audio/mpeg" } }
```

```json
{ "id": "a2", "text": "Choice B", "isCorrect": false }
```

Invalid example (rejected):
```json
{ "id": "a3", "text": "", "isCorrect": false }
```

### Direct-send route behavior (`POST /api/parent/create-and-send-task`)

- Supports media-only questions via `taskMedia.url` even when `question` is blank.
- When media-only question is used, backend stores fallback question text to preserve DB constraints.
- If `saveAsTemplate=true`, non-empty `question` text is still required.

### Library assignment behavior (`POST /api/parent/task-library/:id/use`)

- Custom payload now accepts media-aware answers and `taskMedia.url` for question media overrides.
- Route enforces:
  - at least two non-empty answers,
  - exactly one correct answer,
  - question text or question media before assignment.

Success response:
```json
{
  "success": true,
  "data": {
    "mode": "partial",
    "createdCount": 3,
    "rejectedCount": 1,
    "rejected": [
      {
        "index": 2,
        "code": "RATE_LIMITED",
        "message": "Daily task limit exceeded for child ...",
        "childId": "..."
      }
    ],
    "totalReward": 30,
    "taskIds": ["...", "...", "..."]
  },
  "message": "Tasks created successfully"
}
```

## 3) Backend Metrics (No UI Changes)

Metrics are emitted to `parent_audit_logs` using `entity = "task_metric"`.

Actions emitted:
- `TASK_CREATE_SINGLE`
- `TASK_CREATE_TEMPLATE`
- `TASK_CREATE_SEND`
- `TASK_CREATE_SEND_TEMPLATE`
- `TASK_CREATE_BULK`
- Replay actions:
  - `TASK_CREATE_REPLAY_SINGLE`
  - `TASK_CREATE_REPLAY_BULK`
  - `TASK_CREATE_REPLAY_TEMPLATE`
  - `TASK_CREATE_REPLAY_SEND`
  - `TASK_CREATE_REPLAY_SEND_TEMPLATE`

Common metric fields:
- `endpoint`
- `durationMs`
- `childId`
- `subjectId` / `templateId` when available
- `pointsReward` when available
- For bulk: `createdCount`, `totalReward`, `uniqueChildren`, `avgTaskLatencyMs`

## 4) Admin Metrics Endpoint

Endpoint:
- `GET /api/admin/metrics/task-creation`

Auth:
- Admin token (`adminMiddleware` protected)

Output:
- `last24h` and `last7d` rollups from `parent_audit_logs` with `entity = "task_metric"`
- Includes:
  - `events`
  - `singleCreates`
  - `bulkCreates`
  - `replaySingle`
  - `replayBulk`
  - `createdTasks`
  - `rejectedTasks`
  - `totalReward`
  - `avgDurationMs`
  - `p95DurationMs`

## 5) User Journey (4 Steps Only)

From `/age-gate`, routing is now decided by the admin-configured age threshold (`parentThresholdAge`).

Admin control source of truth:
- Admin updates threshold via `PUT /api/admin/settings/age-policy`.
- Public app consumes it via `GET /api/public/mobile-app-settings` (`mobileApp.parentThresholdAge`).

Input sync behavior on `/age-gate`:
- Moving the age slider auto-updates date of birth.
- Changing date of birth recalculates age.

### Child Journey (4 steps)
1. Select age and birth date in `/age-gate`, then press Enter.
2. Navigate to Parent Auth with child trial context: `/parent-auth?mode=register&classification=child-trial`.
3. On register (age below threshold), backend creates `CHILD_TRIAL` and returns child trial session payload (`childToken`, `trialChildToken`, link/QR metadata).
4. Child lands in child experience (`/child-games` or `/child-profile` depending on flow).

### Parent Journey (4 steps)
1. Select age and birth date in `/age-gate`, then press Enter.
2. Navigate to Parent Auth with parent trial context: `/parent-auth?mode=register&classification=parent-trial`.
3. On register/login (age at or above threshold), backend continues parent flow as `PARENT_TRIAL`; optional trial-child linking runs automatically if `trialChildToken` exists.
4. Parent lands in `/parent-dashboard` (or `/parent-store?trialIntent=1` when trial purchase intent redirect is active).
