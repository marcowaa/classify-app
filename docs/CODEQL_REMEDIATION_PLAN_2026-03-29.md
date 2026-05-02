# CodeQL Remediation Plan (2026-03-29)

## Execution Status (2026-03-29)

- Wave 1 implementation started and applied.
- Upload proxy authority migrated from `x-upload-url` to server-issued object-path intent resolution.
- Updated proxy callers in parent/teacher/school/library/task-form flows to send `x-upload-object-path`.
- Added upload proxy rate limiter and applied it across parent/teacher/school/library proxy routes.
- Verification gate passed in this workspace run:
  - `npx tsc --noEmit`
  - `npm run build`
  - `npm run test -- --runInBand`
  - `curl.exe -s -i http://127.0.0.1:5000/api/health` -> `HTTP/1.1 200 OK` and `{"status":"ok"}`

## Execution Status (2026-03-30)

- Wave 3 hardening batch applied.
- Tightened canonical host redirect matching and path normalization in `server/index.ts`.
- Added browser-cookie CSRF origin/referer validation for mutating methods in `server/index.ts`.
- Hardened redirect sinks in OAuth and store return handlers:
  - `server/routes/auth.ts`
  - `server/routes/store.ts`
- Added `publicPageLimiter` and wired it to SPA fallback handlers in:
  - `server/static.ts`
  - `server/vite.ts`
- Env dashboard session storage now keeps hashed token keys, with dedicated login-attempt throttling in `server/env-dashboard.ts`.
- Secondary middleware hardening in `server/src/middleware/security.ts` (frameguard + production COEP policy).
- Verification gate passed after this batch:
  - `npx tsc --noEmit`
  - `npm run build`
  - `npm run test -- --runInBand`
  - `curl.exe -s -i http://127.0.0.1:5000/api/health` -> `HTTP/1.1 200 OK` and `{"status":"ok"}`

## Scope Baseline (from attached alert export)

- Total unique alerts: 425
- Critical: 5
- High: 420
- Top rules by count:
  - Missing rate limiting: 384
  - DOM text reinterpreted as HTML: 19
  - Clear text storage of sensitive information: 8
  - Server-side request forgery: 5
  - Inefficient regular expression: 3
  - Incomplete URL substring sanitization: 2
  - Insecure configuration of Helmet security middleware: 2
  - Client-side cross-site scripting: 1
  - Incomplete URL scheme check: 1
- Highest alert concentration by file:
  - server/routes/admin.ts: 116
  - server/routes/parent.ts: 113
  - server/routes/teacher.ts: 53
  - server/routes/school.ts: 36
  - server/routes/child.ts: 35

## Root-Cause Summary

1. SSRF alerts remain on upload proxy endpoints because tainted header input still reaches `fetch(...)` sinks, even after host/origin guard checks.
2. Missing rate limiting is widespread due many write/mutation routes lacking explicit per-route or per-router limiter middleware.
3. Helmet and URL sanitization findings are from duplicated and partially permissive security policy configuration.
4. DOM/XSS findings are concentrated in UI components and legacy third-party script bundles.
5. Sensitive data storage findings are concentrated in localStorage and OAuth temporary state handling.

## Non-Breaking Production Constraints

1. Do not remove or rename public API routes.
2. Do not change request/response contract shape for existing endpoints.
3. Introduce stricter controls behind safe defaults and feature flags where needed.
4. Roll out rate limits with conservative thresholds first, then tighten after telemetry.
5. Preserve upload, auth, and dashboard user journeys with integration tests before and after each wave.

## Execution Plan

## Wave 0: Control and Observability (same day)

1. Add a dedicated security metrics board: limiter hits, blocked SSRF attempts, CSP violations.
2. Add per-wave branch and release tags for quick rollback.
3. Snapshot route health and key flows (auth, uploads, checkout, school/teacher/child actions).

## Wave 1: Critical SSRF Closure (1-2 days)

1. Replace header-driven upload proxy targeting with server-issued upload intent IDs.
2. Resolve upload target URL server-side from trusted DB/object metadata only.
3. Reject direct URL headers for target selection on proxy routes.
4. Keep endpoint paths unchanged, but internally switch from `x-upload-url` authority to upload intent authority.
5. Add strict method, content-type, and content-length ceilings on proxy routes.

Success criteria:
- 5 Critical SSRF alerts closed.
- Upload flows still pass parent/teacher/school/library smoke tests.

## Wave 2: Missing Rate Limiting Program (2-4 days)

1. Introduce centralized limiter presets by operation type:
   - read-public
   - read-authenticated
   - write-standard
   - write-sensitive
   - financial
   - admin-heavy
2. Apply route-group middleware at router-level first (parent, teacher, school, child, admin, store, referrals, trusted-devices).
3. Keep existing endpoint handlers unchanged and avoid per-handler custom logic unless required.
4. Add allow-list for trusted internal health/ops probes where necessary.
5. Add response headers and structured logs for limiter events.

Success criteria:
- Missing rate limiting alerts drop by at least 80 percent in first pass.
- No measurable increase in 429 for normal traffic paths in staging smoke test.

## Wave 3: Security Middleware Unification (1 day)

1. Consolidate Helmet policy to one authoritative configuration path.
2. Remove conflicting duplicated headers and deprecated patterns.
3. Replace substring URL sanitization logic with URL parser plus allow-list checks.
4. Add tests for canonical host redirect and URL validation edge cases.

Success criteria:
- Helmet and URL sanitization findings closed.
- No redirect loops and no CORS regression.

## Wave 4: DOM/XSS Remediation (2-3 days)

1. Audit and remove dangerous HTML injection paths in app components.
2. Replace unsafe rendering with text nodes or vetted sanitizer policy.
3. Add lint rule and CI check blocking unsafe DOM APIs in app code.
4. For legacy third-party scripts, isolate and exclude generated/vendor bundles from app security query scope where applicable.

Success criteria:
- DOM/XSS findings in first-party client code closed.
- Legacy bundle findings either remediated upstream or formally isolated from first-party threat model.

## Wave 5: Sensitive Storage Hardening (2-3 days)

1. Remove plain sensitive values from localStorage where possible.
2. Move auth/session artifacts to secure cookie/session strategy for web.
3. Keep only minimal non-sensitive metadata in browser storage.
4. Add TTL and purge paths for temporary OTP/auth state.

Success criteria:
- Clear text storage findings reduced to zero for first-party critical data paths.
- Login/session flows remain backward compatible during migration window.

## Wave 6: CodeQL Pipeline Reliability (same day)

1. Fix CodeQL workflow errors first to ensure trusted scan output.
2. Add language-specific query packs and stable build steps.
3. Exclude non-source generated/vendor directories from first-party rule enforcement where justified.
4. Add required status checks on PR branch protection.

Success criteria:
- No CodeQL runtime errors.
- Deterministic scan completion on each PR and main push.

## Verification Gate (run after each wave)

1. `npx tsc --noEmit`
2. `npm run build`
3. `npm run test -- --runInBand`
4. `curl http://127.0.0.1:5000/api/health`
5. Route smoke set:
   - auth register/login/otp
   - upload presign/proxy/finalize
   - parent/teacher/school critical dashboards
   - store checkout preview/confirm

## Rollback Strategy

1. Each wave ships in isolated commit set with tag.
2. If regression is detected, revert only the latest wave commits.
3. Keep compatibility shims for one release cycle for auth/upload changes.

## Delivery Order Recommendation

1. Wave 1 (Critical SSRF)
2. Wave 2 (Rate limiting mass closure)
3. Wave 6 (CodeQL reliability)
4. Wave 3 (Helmet/URL)
5. Wave 4 (DOM/XSS)
6. Wave 5 (Sensitive storage)

This order closes production risk first, then removes scan noise, then hardens the remaining high findings with minimal service disruption.
