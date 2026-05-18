# Phase 0 — Auth Dependency Audit (B) + Risk Ranking

> Scope (per your Phase 0 hard stop): **Audit only**. No refactor, no behavior changes.

## Legend
- **classification**: authoritative | derived | compat-only | dead | migration blocker
- **risk rank**: high | medium | low
- **migration sequencing dependency**: what must exist/land before the next phase’s strictness can be enabled

---

## Auth Dependency Audit Table

| dependency name | file/function | auth mechanism referenced (token/cookie/ws/refresh/guard/etc) | classification (authoritative/derived/compat-only/dead/migration blocker) | risk rank (high/medium/low) | migration sequencing dependency | rollback impact | observability requirements (metrics/logs) | hidden failure modes (ghost auth / reconnect loops / stale persisted state / silent cookie failure / refresh chains) |
|---|---|---|---|---|---|---|---|---|
| UI session channel is purely localStorage-driven | `client/src/lib/sessionPriority.ts` (`resolveSessionChannel`, `resolveBrowserSessionChannel`) | **token** (localStorage `token`, `childToken`) | **migration blocker** (UI truth != server truth) | **high** | Phase 1 must add/verify server-side `/api/auth/me` (or equivalent) as truth boundary | Low (client routing revert is easy) | Metrics: `ui_session_channel_resolved_total{channel}`. Logs: debug trace when channel changes (`localStorage` keys present/absent). | **ghost auth** (token exists but server rejects); **stale persisted state** (tabs/devices keep old token until a failing call) |
| Parent/Child routing does not consult `/me` | `client/src/App.tsx` (`GuardedHomeRoute`, routes to `/parent-dashboard` vs `/child-*`) | **guard** (client-only) | **migration blocker** | **high** | Implement `/api/auth/me` (or equivalent) + integrate into routing/guards in Phase 1 | Medium (routing logic changed later) | Metrics: `route_access_granted_total{channel,route}` and `route_guard_block_total`. Logs: route decision + sessionChannel. | **ghost auth**: UI enters authenticated area while server still returns 401/403 |
| OAuth redeem writes access token to localStorage | `client/src/lib/oauthSessionManager.ts` (`redeemNonceForCurrentAttempt`) | **token** via `/api/auth/oauth/redeem-nonce` + localStorage cache (`token`, `classify-auth-token`) | **compat-only** (cache) | **high** | Server truth endpoint `/api/auth/me` to validate cached token; define refresh/revoke flow correctness | Low (remove cache can be staged) | Metrics: `oauth_redeem_success_total{provider,flowKind}` from client trace logs; log redeem_failure reasons (missing_token/nonce invalid). | **stale persisted state** if redeem succeeds but token later revoked; **refresh chains** if device refresh relies on same identity without invalidation |
| Authorization header is injected from localStorage | `client/src/lib/apiClient.ts` (`getAuthToken`, `buildHeaders`) | **token** (localStorage) → `Authorization: Bearer <JWT>` | **derived** (mechanism) | **high** | Phase 1 must ensure auth errors propagate to a single “auth state reducer” | Low | Metrics: `api_401_total{route,tokenSource(parent/child/admin),clientSessionChannel}`. Logs: include status code and whether retry attempted. | **ghost auth** persists until a 401 triggers cleanup (currently scattered) |
| Device-trust refresh (cookie-based) for long sessions | `client/src/hooks/usePersistentSession.ts` (`usePersistentSession`, `tryRefresh`) | **refresh** + **cookie** (`/api/auth/device/refresh`, `credentials: include`, `deviceTrusted`, `deviceId`) | **authoritative** (for continuity) but **client-trust** controls | **medium** | Ensure logout and revoke also clear `deviceTrusted` + server-side trustedDevices invalidation semantics are verified | Medium | Metrics: `device_refresh_attempt_total`, `device_refresh_success_total`, `device_refresh_401_total`. Logs: reason for failure (res status). | **silent cookie failure** (sameSite/secure mismatch); **refresh retry chains** (focus/interval retries) |
| Auto-login runs trusted-device refresh if token absent | `client/src/hooks/useAutoLogin.ts` (`tryAutoLogin`) | **refresh** + **cookie** | **authoritative** (continuity) | **medium** | Ensure cookie write/read works across native/web views | Medium | Metrics: `auto_login_refresh_attempt_total`, `auto_login_refresh_failure_total{status}` | **stale persisted state** if `deviceTrusted` remains but refresh returns 401/403 and cleanup is incomplete |
| Child auth fetch wrapper does strict 401-based logout | `client/src/hooks/useChildAuth.ts` (`authFetch`, `handleAuthError`, `logout`) | **guard** + **token** (localStorage `childToken`) | **authoritative** (401 cleanup) for child | **medium** | Ensure parent side has equivalent cleanup (currently unclear) | Low | Metrics: `child_auth_unauthorized_total`, `child_logout_called_total`, and time-to-navigation | **ghost auth** across tabs if only one tab triggers 401 cleanup; **stale persisted state** |
| Parent SSE uses token in query param + reconnect backoff | `client/src/hooks/useParentSSE.ts` (EventSource connect/onerror) | **ws/sse** via `EventSource /api/parent/events?token=...` + reconnect loop | **derived** (SSE transport) | **high** | Add server-side 401 behavior that closes stream predictably + client stops reconnect on auth error | Low-Med | Metrics: `sse_parent_connect_total`, `sse_parent_reconnect_total`, `sse_parent_onerror_total`. Logs: error status (if available) and whether token present. | **reconnect loops** when token expired; **ghost auth** (UI authenticated but stream never stays connected) |
| Parent SSE token verification and 401 response | `server/routes/parent.ts` (`app.get("/api/parent/events")`) | **token** in query `token` or header `authorization`, verified via `jwt.verify` | **authoritative** (auth boundary) | **high** | Phase 1 must define how client distinguishes auth errors vs transient network errors | Low | Metrics: `sse_parent_unauthorized_total`, `sse_parent_token_missing_total`, `sse_parent_stream_connected_total` | **ghost auth** if client doesn’t clear tokens on 401; **silent failure** if client can’t see 401 from EventSource |
| Child SSE token verification (publicly reachable SSE auth) | `server/routes/child.ts` (`app.get("/api/child/events", sseConnectLimiter, ...)`) | **token** in query `token` OR header `authorization`, verified via `jwt.verify` | **authoritative** | **high** | Phase 1 must align client reconnect logic with auth-failure stop conditions | Low | Metrics: `sse_child_unauthorized_total`, `sse_child_token_missing_total` | **reconnect loops** (EventSource keeps retrying on persistent 401); **ghost auth** |
| Child SSE connect limiter | `server/routes/child.ts` (`sseConnectLimiter`) | **rate limiting** for SSE connections | **compat-only** | **medium** | Ensure limiter metrics are observable before strictness increases | Low | Metrics: `sse_child_connect_limited_total` | **silent failure** if rate limited without telemetry; may look like ghost auth/reconnect storms |
| Missing server truth endpoint `/api/auth/me` (no implementation found) | Server: **not found** by literal search in `server/` | **me** endpoint expected by consumers | **migration blocker** | **high** | Implement `/api/auth/me` (or replace with a verified mechanism) before any strict Phase 1 auth correctness | High | Metrics: `me_endpoint_missing_total` (should become 0 post-fix); client route guard consistency metrics | **ghost auth** (UI relies solely on localStorage), **multi-tab inconsistency** |
| Missing server logout endpoint `/api/auth/logout` (no handler found; swagger-only) | Swagger has doc for `/auth/logout` but no route logic found in `server/routes` | **logout** expected to revoke/clear state | **migration blocker** | **high** | Implement actual POST handler + ensure it clears both access path and trusted-device cookie/revokes sessions as needed | High | Metrics: `logout_called_total`, `logout_success_total`, `logout_failure_total`. Logs: who logged out, which identity, and revoke actions | **stale persisted state** (logout doesn’t fully propagate); **ghost auth** (UI removed token but server sessions still valid) |
| Trusted devices refresh endpoint exists and rotates cookie | `server/routes/auth.ts` (`POST /api/auth/device/refresh`) | **refresh** (httpOnly `device_refresh` cookie rotation) | **authoritative** | **medium** | Logout/revoke must invalidate trusted device + clear cookie to stop future refresh | Medium | Metrics: `device_refresh_success_total`, `device_refresh_401_total`, `device_refresh_cookie_written_total`. | **refresh chains** and **silent cookie failure** (cookie not sent due to `sameSite=strict` assumptions) |
| Auth JWT validation middleware | `server/src/middleware/auth.ts` (`authMiddleware`) | **guard**: `Authorization: Bearer` → `jwt.verify` | **authoritative** | **high** | Keep stable contract; if changing, ensure all transports (SSE query, web, native) are updated | Medium | Metrics: `auth_verify_success_total`, `auth_verify_401_total{errorType}`. Logs: token error type (expired/invalid). | **ghost auth** from client-only routing; **silent unauthorized** if EventSource can’t surface status |

---

## Notes / Evidence Summary (Phase 0 audit)
- **`/api/auth/me`**: no literal occurrences found in `server/` (likely missing).
- **`/api/auth/logout`**: swagger documents the path, but no route handler implementation found under `server/routes` by evidence-based searches.
- **SSE reconnect**: parent SSE client uses exponential backoff on `es.onerror` without auth-stop differentiation (high risk for reconnect loops on expired tokens).

---

## Blocking Prerequisites Before Phase 1

### Why this section exists
Phase 1 flips auth authority behavior (cookie-write / eventual cookie-preferred reads). If canonical auth truth endpoints aren’t present, you can get **ghost auth** and **reconnect/auth convergence failures** even if login “works”.

### Blocking Prerequisites (must be satisfied before enabling Phase 1 flags)

| Blocker | Why it blocks Phase 1 |
|---|---|
| Missing canonical `GET /api/auth/me` (or equivalent) | No deterministic “auth truth” boundary for the frontend. UI and reconnect managers can’t reliably stop on unauth, enabling ghost-auth. |
| Missing canonical `POST /api/auth/logout` (or equivalent revoke/logout contract) | No deterministic authority revocation/cleanup lifecycle. Logout propagation can be incomplete, causing stale sessions and auth-state desync across tabs/transports. |
| Unknown auth authority chain (who currently sets truth) | Without a verified contract, any cookie-authoritative migration risks reintroducing token/localStorage authority via hidden fallbacks. |

### Minimum viable contracts required
1) `/api/auth/me` response contract
- Deterministic unauth semantics: 401/403 with a consistent error payload shape
- Stable identity/role payload used by UI guards/telemetry
- Telemetry hooks: auth-me success/unauth should be measurable

2) `/api/auth/logout` revoke contract
- Deterministic cleanup semantics: access invalidation + logout propagation observable by clients
- Guarantees for reconnect managers: unauth must be detectable within a bounded latency window
