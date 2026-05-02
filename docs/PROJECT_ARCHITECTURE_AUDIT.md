# Project Architecture Audit (Iteration 1)

## Scope
This audit covers full project mapping and a deep first-pass review of the highest-risk backend modules by size and complexity.

## Project Map

### Root Structure
- `client/`: React + Vite frontend application.
- `server/`: Express API backend and services.
- `shared/`: Drizzle schema and shared types/contracts.
- `tests/`: Jest unit tests.
- `migrations/`: DB migration output from Drizzle.
- `scripts/`: deployment, environment and maintenance scripts.
- `android/`, `ios/`, `appsflutter/`: mobile wrappers/clients.
- `nginx/`, `docker-compose.yml`, `Dockerfile`: deployment runtime setup.

### Backend Route Modules (`server/routes`)
- Core: `auth.ts`, `parent.ts`, `child.ts`, `admin.ts`, `store.ts`, `payments.ts`.
- Domain extensions: `library.ts`, `school.ts`, `teacher.ts`, `marketplace.ts`, `follow.ts`, `referrals.ts`, `symbols.ts`, `ads.ts`, `parent-linking.ts`.
- Admin extensions: `admin.settings.ts`, `admin-activity.ts`, `admin-analytics.ts`, `admin-gifts.ts`, `admin-notification-settings.ts`, `admin-task-notification-settings.ts`.

### Frontend Modules
- Routing shell: `client/src/App.tsx`.
- App bootstrap: `client/src/main.tsx`.
- Domain pages: `client/src/pages/*` (50+ pages).
- UI components: `client/src/components/*`.
- Admin UI: `client/src/components/admin/*`.

### Test Suite
- Existing tests: `tests/apiResponse.test.ts`, `tests/sseManager.test.ts`, `tests/validators.test.ts`.
- Added in this iteration: `tests/legalPages.test.ts`.

## Architecture Overview
- Style: modular monolith.
- API: Express route modules mounted from `server/routes/index.ts`.
- Data access: Drizzle ORM with PostgreSQL using centralized connection in `server/storage.ts`.
- Frontend state: TanStack Query + React state/context.
- Build: `vite build` (frontend) + `esbuild` (backend) from `package.json`.
- Runtime: Node process (`dist/index.js`) with static hosting and API in same app.

## Design Patterns In Use
- Modular route registration (`registerXRoutes(app)`).
- Shared schema contract (`shared/schema.ts`) as single source of DB structure.
- Helper-based API response contract (`successResponse`, `errorResponse`).
- Background worker pattern (task/media/subscription workers on startup).

## Dependencies and Integrations
- Core: Express, Drizzle ORM, PostgreSQL driver (`pg`), JWT, bcrypt.
- Frontend: React 18, Vite, Tailwind, Radix UI, Framer Motion.
- Payments: Stripe.
- Messaging: Resend/Twilio stack and push notifications.
- Mobile packaging: Capacitor.

## Critical Modules and Risk Ranking
Ranking based on route file size and `any`-usage density:
1. `server/routes/admin.ts` (~6525 LOC, highest complexity)
2. `server/routes/parent.ts` (~5202 LOC)
3. `server/routes/child.ts` (~4685 LOC)
4. `server/routes/auth.ts` (~3107 LOC)

## Findings (Iteration 1)

### F1: Legal pages mapping duplicated across endpoints
- Location: `server/routes/admin.ts` legal section.
- Risk: behavior drift and mistakes when adding/changing legal page types.
- Status: fixed in this iteration.

### F2: Non-standard API error payload for SSE auth failures
- Location: `server/routes/parent.ts` (`/api/parent/events`).
- Risk: client-side parsing inconsistency vs expected API contract.
- Status: fixed in this iteration.

### F3: Documentation/API mismatch for family endpoints
- Docs mention `/api/family/*`, while code uses `/api/parent/*` and `/api/child/*`.
- Risk: onboarding confusion and integration errors.
- Status: identified; planned for compatibility aliases in next iteration.

## Implemented Changes (Iteration 1)
- Added `server/utils/legalPages.ts` as single source of truth for legal-page type mapping.
- Refactored legal endpoints in `server/routes/admin.ts` to use shared utility.
- Standardized SSE unauthorized responses in `server/routes/parent.ts` to use `errorResponse(ErrorCode.UNAUTHORIZED, ...)`.
- Added unit tests: `tests/legalPages.test.ts`.

## Validation Results
- `npx tsc --noEmit`: passed.
- `npm run test`: passed (all suites).

## CI/CD Recommendations
1. Keep current CI build workflow and remove `continue-on-error` for lint/typecheck after debt is reduced.
2. Add dedicated API contract tests job for key endpoints.
3. Add deployment workflow for Azure App Service (staging + production environments, secrets in GitHub Environments).
4. Add post-deploy smoke checks: `/api/health`, static assets, and auth endpoint sanity.

## Next Module Review Plan (Iteration 2)
1. Deep review `server/routes/child.ts` and `server/routes/auth.ts`.
2. Introduce compatibility layer for `/api/family/children` while preserving existing routes.
3. Add integration tests for auth/session and parent-child ownership checks.

## Iteration 2 Update

### Module Reviewed
- `server/routes/child.ts` (high-risk module, 4.6k+ LOC)

### Findings
- Multiple endpoints still used non-standard JSON error payloads (`{ message: ... }`) instead of the unified API contract helper.
- One authorization branch returned `ErrorCode.UNAUTHORIZED` with HTTP 403, which is semantically inconsistent (`FORBIDDEN` is correct for authenticated-but-not-allowed access).
- Parent annual report access check returned ad-hoc payload and missed the dedicated ownership error code.

### Implemented Fixes
- Standardized `/api/child/progress` to use:
	- `successResponse(...)` for success payloads
	- `errorResponse(ErrorCode.NOT_FOUND, ...)` for missing child
	- `errorResponse(ErrorCode.INTERNAL_SERVER_ERROR, ...)` for server failures
- Standardized parent annual report access failure (`/api/parent/children/:childId/annual-report`) to:
	- `errorResponse(ErrorCode.PARENT_CHILD_MISMATCH, "Access denied")`
- Corrected friendship removal authorization error code:
	- from `ErrorCode.UNAUTHORIZED` to `ErrorCode.FORBIDDEN` on HTTP 403.

### Test Enhancements
- Added coverage in `tests/apiResponse.test.ts`:
	- `FORBIDDEN -> 403` mapping assertion.

### Validation
- `npx tsc --noEmit`: passed.
- `npm run test`: passed (43 tests, all green).

### Next Planned Iteration
1. Add compatibility aliases for `/api/family/children` contract.
2. Add targeted integration tests for parent-child ownership gates.
3. Start splitting large route files by feature slices (first candidate: legal + notifications subrouters in admin/child modules).

## Iteration 3 Update

### Module Reviewed
- `server/routes/parent.ts`

### Implemented Fixes
- Added backward-compatibility alias endpoint:
	- `GET /api/family/children` (same behavior as `GET /api/parent/children`).
- Alias preserves current auth and response contract (`successResponse` / `errorResponse`) while reducing integration mismatch with published API docs.

### Validation
- `npx tsc --noEmit`: passed.
- `npm run build`: passed.
- `npm run test`: passed (43 tests).
- `curl http://localhost:5000/api/health`: `{"status":"ok"}`.

### Remaining Gap
- Compatibility for `POST|PUT|DELETE /api/family/children` is still pending and should be added in a dedicated iteration to avoid introducing behavior drift in child lifecycle flows.

## Iteration 4 Update

### Module Reviewed
- `server/routes/parent.ts`

### Implemented Fixes
- Added full family-API compatibility layer:
	- `POST /api/family/children` (create child + link parent-child + initialize growth tree)
	- `PUT /api/family/children/:id` (update child with strict parent ownership check)
	- `DELETE /api/family/children/:id` (delete child with strict parent ownership check)
- All new endpoints return standardized API contract responses via `successResponse` / `errorResponse`.
- Ownership violations return `PARENT_CHILD_MISMATCH` with HTTP 403.

### Validation
- `npx tsc --noEmit`: passed.
- `npm run build`: passed.
- `npm run test`: passed (43 tests).
- `curl http://localhost:5000/api/health`: `{"status":"ok"}`.

### Status
- Family endpoint compatibility (`GET|POST|PUT|DELETE /api/family/children`) is now complete.
