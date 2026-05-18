# Phase 0 — Metrics/Telemetry Baseline (Auth correctness only, no behavior change)

## Hard constraints (Phase 0)
- No client/server refactors or auth behavior changes.
- Baseline defines **what to measure** and **where to instrument** using existing call sites:
  - `client/src/lib/oauthSessionManager.ts` (OAuth redeem trace)
  - `client/src/hooks/usePersistentSession.ts` + `client/src/hooks/useAutoLogin.ts` (trusted-device refresh)
  - `client/src/hooks/useChildAuth.ts` (401-driven cleanup + logout)
  - `client/src/hooks/useParentSSE.ts` (SSE reconnect loop/backoff)
  - `server/routes/parent.ts` `GET /api/parent/events` (401 response paths)
  - `server/routes/child.ts` `GET /api/child/events` (token-in-query + jwt.verify + 401 paths)
  - `server/index.ts` existing `/metrics` currently snapshots **OAuth-only** counters.

## Metric definitions (baseline contract)

### 1) redeem success rate (by provider + flowType)
- **Metric name**: `auth_oauth_redeem_success_rate`
- **Type**: ratio / percent
- **Dimensions**:
  - `provider` (google/facebook/etc from trace)
  - `flowType` (from `OAuthStartResult.kind`: `native-google` | `web-popup-opened` | `legacy-redirect`)
- **Numerator**: number of successful `/api/auth/oauth/redeem-nonce` (client trace event `redeem_success`)
- **Denominator**: number of attempts (client trace event `redeem_start` with matching `traceId`)
- **Existing evidence**:
  - `client/src/lib/oauthSessionManager.ts`: `traceLog("redeem_success"...)` and `traceLog("redeem_failure"...)`

### 2) `/api/auth/me` consistency rate
- **Metric name**: `auth_me_consistency_rate`
- **Type**: ratio / percent
- **Dimensions**: `clientSessionChannel` (`child|parent|family-pin|none`), `role`
- **Definition**: requests that return “authenticated user expected” / “authenticated user observed”
- **Important Phase 0 note**:
  - Evidence-based search in `server/` found **no implementation** of `/api/auth/me`.
  - **Baseline fallback measurement** (do not change behavior): use `/api/parent/info` and `/api/child/info` as the “observed truth” boundary.
- **Implementation target**:
  - Add client measurement wrapper around parent/child info fetch success/401 (Phase 1 instrumentation only).

### 3) token fallback usage rate (legacy-only)
- **Metric name**: `auth_token_legacy_fallback_usage_rate`
- **Type**: ratio / percent
- **Dimensions**:
  - `provider`
  - `fallback` = `legacy-redirect` (from `OAuthStartResult.kind`)
- **Definition**: how often tokens arrive via the “legacy redirect” path vs other paths.
- **Existing evidence**:
  - `client/src/lib/oauthSessionManager.ts`: `kind === "legacy-redirect"` uses `/api/auth/oauth/<provider>?mode=...`

### 4) WS reconnect rate (and reconnect attempts count)
In this codebase SSE via `EventSource` is used (same failure modes as WS transport).
- **Metric name**: `auth_realtime_reconnect_rate`
- **Type**: ratio / count
- **Dimensions**:
  - `stream` = `parent` | `child`
  - `transport` = `EventSource`
- **Numerator**: number of reconnect attempts within time window
- **Denominator**: number of initial connects within time window
- **Existing evidence**:
  - `client/src/hooks/useParentSSE.ts`: exponential backoff on `es.onerror`
  - `client/src/components/*NotificationBell*.tsx`: other reconnection patterns (EventSource + reconnectDelay)
- **Reconnect attempt count**:
  - Count each `connect()` invocation after an error (Phase 0 instrumentation requirement).

### 4.1) SSE auth-stop (stop reconnect on persistent auth failure)
EventSource browsers often only surface `onerror` without HTTP status, so Phase 0 must instrument auth-failure classification on the client using token presence + timing correlation.
- **Metric name**: `sse_auth_stop_total`
- **Type**: count
- **Dimensions**:
  - `stream` = `parent` | `child`
  - `authFailureClass` = `tokenMissing` | `tokenInvalidOrExpired` | `unknown`
  - `stopReason` = `unauthorized_detected` | `manual_logout_cleanup` | `evicted_by_server` | `other`
- **Stop detection (Phase 0 approach)**:
  - `tokenMissing`: localStorage token/childToken absent when `onerror` fires
  - `tokenInvalidOrExpired`: token present AND repeated reconnects exceed `N` attempts within `T` (correlate with first `onerror` timestamps)
  - `manual_logout_cleanup`: stop occurs within `[0..30s]` of logout cleanup completion
  - `evicted_by_server`: stop occurs after reconnect loop short-circuit where server closes stream due to `MAX_SSE_CLIENTS_PER_USER` (best-effort: detect via short-lived connections + immediate close)
- **Phase 0 requirement**:
  - Implement instrumentation in `client/src/hooks/useParentSSE.ts` and wherever `EventSource` is created for child notifications.

### 4.2) SSE server eviction disconnects (per-user max connections)
- **Metric name**: `sse_eviction_disconnect_total`
- **Type**: count
- **Dimensions**:
  - `stream` = `parent` | `child`
  - `userType` = `parent` | `child`
- **Definition**:
  - Server ends the oldest SSE stream when `MAX_SSE_CLIENTS_PER_USER` is exceeded (`res.end()` in `server/utils/sseManager.ts`).
- **Phase 0 note**:
  - Server-side metric does not exist today; treat as “instrumentation target”:
    - Option A (server): emit a metric when evicting `oldestClient`
    - Option B (client fallback): classify as eviction if connection lifetimes are consistently short while no auth cleanup occurred.

### 4.3) SSE unauthorized / missing-token connect attempts
- **Metric name**: `sse_unauth_or_token_missing_connect_total`
- **Type**: count
- **Dimensions**:
  - `stream` = `parent` | `child`
  - `tokenPresentAtConnect` = `0` | `1`
  - `tokenSource` = `localStorage` | `other`
- **Definition**:
  - Count `EventSource` creation/connect attempts when token is absent/present.
- **Correlation goal**:
  - Quantify how much reconnect-loop noise is due to token absence vs invalid token vs network.

### 5) ghost auth rate (me=false while UI thinks authenticated)
- **Metric name**: `auth_ghost_rate`
- **Type**: ratio / percent
- **Dimensions**:
  - `expectedChannel` (derived from localStorage `token/childToken`)
  - `observedTruth` (401 from `/api/parent/info` or `/api/child/info` used as truth boundary)
- **Definition**:
  - UI believes authenticated because session channel resolves to `parent`/`child`
  - but observed API returns 401/403 for the corresponding info endpoint
- **Phase 0 evidence**:
  - `client/src/lib/sessionPriority.ts` decides channel solely from localStorage keys.
  - `server/routes/parent.ts` and `server/routes/child.ts` return 401 for missing/invalid token on SSE endpoints; similar 401 patterns exist on info endpoints.

### 6) logout propagation latency (event → me unauth confirmation)
- **Metric name**: `auth_logout_propagation_latency_ms`
- **Type**: distribution (p50/p90/p99)
- **Dimensions**:
  - `role` (parent/child/admin)
  - `transport` (HTTP)
- **Definition**:
  - Start: when client calls logout endpoint (`useChildAuth.logout` calls `/api/child/logout`)
  - Stop: first subsequent “truth check” returning unauth (401 on `/api/parent/info` or `/api/child/info` used as truth proxy)
- **Important Phase 0 note**:
  - `/api/auth/logout` handler implementation evidence is missing; treat it as “unknown/Swagger-only”.
  - For baseline, measure child logout (`/api/child/logout`) and trusted-device invalidation effects.

### 7) multi-tab inconsistency count (me differs across tabs within window)
- **Metric name**: `auth_multitab_inconsistency_count`
- **Type**: count
- **Dimensions**:
  - `inconsistencyType`: token-present-but-API-401 mismatch / cleared-but-API-still-authorized
- **Definition**:
  - Within `windowMs=5m`, count occurrences where different browser tabs report different auth states:
    - Tab A: session channel says authenticated
    - Tab B: observed truth says unauth (or vice versa)
- **Existing evidence**:
  - No centralized BroadcastChannel rollout found in Phase 0 audit.
  - localStorage writes happen in multiple flows (OAuth redeem, auto-login, child logout cleanup).

### 8) refresh retry loops (if refresh endpoints exist)
- **Metric name**: `auth_refresh_retry_loop_total`
- **Type**: count
- **Dimensions**:
  - `refreshType`: `device/refresh` (trusted-device cookie refresh)
  - `stage`: `attempt` | `success` | `401` | `403`
- **Definition**:
  - Consecutive refresh attempts within `windowMs=15m` above threshold (e.g., >3 failures)
- **Existing evidence**:
  - `client/src/hooks/usePersistentSession.ts`: runs on focus/visibilitychange + interval
  - `client/src/hooks/useAutoLogin.ts`: single auto refresh attempt

### 9) stale persisted auth recovery rate
- **Metric name**: `auth_stale_persisted_recovery_rate`
- **Type**: ratio / percent
- **Dimensions**:
  - `recoveryMethod`: `deviceRefresh` | `oauthRedeem` | `manualReauth` (based on client triggers)
- **Definition**:
  - Starting from a period where observed truth is 401 but persisted state still exists
  - recovered within `windowMs=10m` (e.g., refresh succeeds or user re-logins)
- **Existing evidence**:
  - trusted-device refresh writes `localStorage.setItem("token", payload.token)` on success.

---

## Server metrics baseline (what exists today)
- `server/index.ts` `/metrics` and `/api/metrics` currently export:
  - OAuth counters snapshot: `oauth_start_total`, `oauth_callback_success_total`, `oauth_invalid_state_total`, `oauth_pkce_missing_total`, `oauth_lock_conflict_total`
- **No auth/me/logout/401/refresh/SSE reconnect counters are exported** in current snapshot.

---

## Client instrumentation points (Phase 0 “must measure” list)
### OAuth redeem/callback
- `oauthSessionManager.ts`:
  - `redeem_start`, `redeem_success`, `redeem_failure` (provider, traceId)
  - capture `flowType` = `startOAuth().kind`

### /parent/info and /child/info consistency checks
- (Even without `/api/auth/me`) add measurement around existing info fetches:
  - if response 401/403 ⇒ observed truth unauth
  - correlate with expected channel from localStorage

### WS/SSE
- `useParentSSE.ts`:
  - count `connect()` attempts
  - count backoff delay steps (`retryDelay` changes)
- `EventSource`-based notification components:
  - same reconnect attempt counter (component-level)

### Logout
- `useChildAuth.ts`:
  - measure call time for `/api/child/logout`
  - measure cleanup completion time (localStorage deletions + navigation)

### Trusted-device refresh
- `usePersistentSession.ts`:
  - measure refresh attempt start/end + result
- `useAutoLogin.ts`:
  - measure refresh attempt result

---

## Measurement gaps / risk flags (Phase 0)
- Missing server `/api/auth/me` endpoint implementation evidence: cannot measure directly “me consistency” without Phase 1 change or fallback truth proxies.
- Missing server logout endpoint evidence for `/api/auth/logout`: baseline uses child logout and trusted-device refresh invalidation effects.
- EventSource 401 behavior does not surface cleanly in browsers; reconnect loops may mask auth failures unless we explicitly log token-present + onerror timing in client code.
