# Backend Route Governance Spec

Last updated: 2026-03-20

## Route Composition (Canonical)

The canonical registration point is server/routes/index.ts in this order:

1. health endpoint
2. auth routes
3. admin routes and admin submodules
4. parent routes
5. child routes
6. payments/store/referrals/library/school/teacher/follow/marketplace
7. object storage and media
8. symbols
9. routers mounted under /api
10. swagger docs

Any new route group must be added at the correct layer and documented.

## Middleware Order (Canonical)

Global order from server/index.ts:

1. security headers and compression
2. cookie parser
3. static assets and upload mounts
4. body parsing (with raw webhook exception)
5. malformed JSON handler
6. CORS gate
7. API logging
8. canonical host redirect
9. route registration
10. error fallback

Per-route order:

1. validation middleware (if any)
2. auth/admin middleware
3. domain guard (example: linked-child purchase guard)
4. handler

## Guard Contract

| Guard | Purpose | Required On |
|---|---|---|
| authMiddleware | JWT verification + parent/child split | non-admin authenticated APIs |
| adminMiddleware | admin authorization | all admin mutation endpoints |
| requireLinkedChildForParentMonetization | prevent monetization before child link | purchase and checkout actions |

## Endpoint Classification Rules

1. /api/admin/*: admin channel by default.
2. /api/child/*: child channel only.
3. /api/parent/*: parent channel only.
4. /api/auth/*: decision/auth channel.
5. shared /api/* must explicitly document allowed roles.

## Governance for New Endpoints

1. Endpoint must include classification in docs/API_INVENTORY_BACKEND.md.
2. Endpoint must include guard annotation in PR.
3. If endpoint affects onboarding or purchase conversion, update critical-flow tests.
4. No endpoint may bypass API response contract envelope.
