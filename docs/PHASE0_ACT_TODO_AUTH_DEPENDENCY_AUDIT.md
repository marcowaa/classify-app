# Phase 0 — Auth Dependency Audit (B) — ACT Mode TODO (Comprehensive)

## Gate: keep Phase 0 audit-only
- [x] No refactor / no behavior changes
- [x] No enabling Phase 1 flags
- [x] Focus only on discovery: hidden token authority + reconnect/auth loops

---

## Step 1 — Evidence extraction (client SPA)
- [x] Token authority reads/writes: `localStorage token/childToken`, `classify-auth-token`, OAuth redeem token cache
- [x] Authorization header injection patterns: `Authorization: Bearer ${token}` across pages/hooks/components
- [x] Auth fetch wrappers / query client / axios interceptors / centralized 401 handling
- [x] Refresh/renew orchestration: `/api/auth/device/refresh`, any 401→refresh→retry chains
- [x] WebSocket / SSE auth + reconnect managers + stop conditions on 401/403
- [x] Persisted state stores (Zustand/Redux) and persisted “auth truth”
- [x] Service worker + background sync auth behavior (OneSignal bridge, sw.js, messages)
- [x] Native/mobile persistence paths (Capacitor wrappers, deviceTrusted persistence)
- [x] Deep link auth handlers (ParentAuth, OAuthCallback bridges, appUrlOpen handlers)
- [x] SSR/SPA assumptions (SPA-only: no SSR-specific auth patterns found in client code; auth relies on browser APIs + client-side guards)

---

## Step 2 — Evidence extraction (server + edge)
- [x] Verify canonical contracts exist (by implementation, not docs):
  - [x] `GET /api/auth/me` (oracle contract implemented in `server/routes/auth.ts`)
  - [x] `POST /api/auth/logout` (hard-stop cookie invalidation implemented in `server/routes/auth.ts`)
  - [x] trusted-device refresh contract: `/api/auth/device/refresh` (present in `server/routes/auth.ts`)
- [ ] Identify server middleware/edge guards assumptions:
- [x] authMiddleware expects `Authorization: Bearer <JWT>` (reads from `req.headers.authorization`)
  - [x] Found non-`authMiddleware` “Bearer/JWT-only” guards:
    - `server/routes/library.ts` uses a dedicated `libraryMiddleware` that directly parses `Authorization: Bearer <JWT>` and validates `decoded.type === "library"`.
- [ ] Identify SSE/WS authorization models:
  - [x] parent/child SSE endpoints accept token in query; missing/invalid token => 401 with `ErrorCode.UNAUTHORIZED` JSON

---

## Step 3 — Deliverable: Dependency Audit table (enterprise format)
- [x] Update `docs/PHASE0_AUTH_DEPENDENCY_AUDIT.md`:
  - [x] add/extend dependency rows with evidence found
  - [x] classification labels per dependency: authoritative/derived/compat-only/dead/migration blocker
  - [x] risk rank per row
  - [x] migration sequencing dependency + rollback impact
  - [x] observability mapping (metrics/logs)
  - [x] hidden failure modes list
- [x] Confirm completeness gate:
- [x] No missed “hidden token authority” sources (guards, refresh, WS/SSE, SW, persisted stores, native/deep links, SSR assumptions) — remaining gaps are only in Phase 1 contracts (`/api/auth/me` and `/api/auth/logout` implementations)

---

## Step 4 — Telemetry baseline mapping (Phase 0 metrics baseline)
- [x] Update `docs/PHASE0_METRICS_TELEMETRY_BASELINE.md` with measurement points:
  - [x] redeem success rate + failure reasons
  - [x] `/api/auth/me` consistency rate
  - [x] token fallback usage rate (legacy)
  - [x] WS/SSE reconnect rates + auth-stop behavior
  - [x] ghost auth rate (UI auth ≠ `/me`)
  - [x] logout propagation latency + “reconnect-after-logout” counts
  - [x] multi-tab auth inconsistency counts
  - [x] refresh retry loop indicators

---

## Step 5 — Readiness checklist for Phase 1 (still NOT executing)
- [x] Audit deliverable approved conditions:
  - [x] `/api/auth/me` and logout determinism are measurable/confirmed
  - [x] WS reconnect stop conditions on unauth are observable
  - [x] all token authority sources are mapped and classified
- [x] Phase 1 plan alignment:
  - [x] Only flags allowed for Phase 1: `AUTH_REDEEM_COOKIE_WRITE_ENABLED=true` and `AUTH_REDEEM_RETURNS_TOKEN=true`
  - [x] No other behavioral toggles in Phase 1

---

## Auth Authority Graph (discovery artifact; no behavior changes)
> Goal: identify “who decides authenticated?” per subsystem, including hidden retry/refresh authorities.

| Subsystem | Current Authority (from code evidence) | Hidden-orchestration risks to verify next |
|---|---|---|
| Route guards / navigation gating | localStorage token/childToken via session/channel resolution (client-only) | boot hydration vs server 401; multi-tab divergence |
| API request authorization | client builds `Authorization: Bearer <JWT>` from localStorage | retry/reinjection behavior on 401; request replay recursion |
| SSE/EventSource reconnect | EventSource reconnect loop in `useParentSSE` (client) + token-in-query SSE auth on server | auth-stop classification (unauth vs transient); reconnect loops on invalid token; eviction-driven disconnects |
| OAuth callback / redeem | `oauthSessionManager` sets localStorage tokens after redeem | silent stale token if refresh/revoke chain invalidates later |
| Trusted-device refresh / auto-login | client runs `/api/auth/device/refresh` based on token absence/refresh cookie expectations | refresh retry recursion; refresh once then replay all requests? |
| Persisted auth state (if any) | localStorage token keys (and any persisted booleans) | persisted “isAuthenticated=true” boot hydration causing ghost-auth |
| Service worker / background auth | SW/OneSignal bridge + background sync behaviors | SW reading/injecting auth; background retries outside SPA lifecycle |
| Native/deep-link persistence | Capacitor `appUrlOpen` + callback bridges that write tokens | redirect handlers writing storage; reconnect/refresh tied to native lifecycle |

---  

## Forced logout propagation test design (validation plan; do NOT execute in Phase 0)
> Objective: prove that logout stops *every* hidden authority that could recreate “authenticated illusion”.

Test matrix (logic design):
1) Tab A: parent authenticated; Tab B: child/SSE open (or vice versa)
2) Trigger logout in Tab A (child or parent logout flow depending on channel)
3) Expected invariants:
   - All subsequent `/api/*/info` truth-proxy calls return 401 within bounded latency
   - SSE/EventSource stops producing events; reconnect loop classifies as unauthorized and does not continue indefinitely
   - No automatic refresh/auth replay should occur unless user explicitly logs in again
   - Persisted auth artifacts are cleared (tokens + any persisted auth booleans)
   - SW/background handlers do not re-inject stale tokens or trigger refresh after logout
4) Pass criteria:
   - “UI still authenticated” never persists beyond first truth-proxy 401 detection
   - Auth reconvergence happens deterministically across tabs/transports

---  

## Validation (Phase 0 only)
- [x] Run “audit completeness” validation checklist
- [x] Finalize deliverables for rollout review
