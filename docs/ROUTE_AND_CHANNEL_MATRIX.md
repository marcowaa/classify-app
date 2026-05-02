# Route and Channel Matrix

Last updated: 2026-03-20

## Scope

This matrix is the final routing/channel reference for the 7-phase architecture plan.

Inputs:
- docs/ROUTE_INVENTORY_FRONTEND.md
- docs/API_INVENTORY_BACKEND.md
- client/src/App.tsx
- server/routes/index.ts
- server/routes/middleware.ts

## Matrix

| Channel | Frontend Entry Routes | API Prefix | Auth Type | Primary Guard | Conversion Notes |
|---|---|---|---|---|---|
| Decision | /, /age-gate, /register | /api/auth/* | none -> parent/child | inline auth decisions | Chooses parent trial vs child trial vs normal auth |
| Parent | /parent-*, /wallet, /notifications, /task-* | /api/parent/*, /api/store/*, /api/marketplace/* | parent JWT | authMiddleware + requireLinkedChildForParentMonetization (purchase paths) | Trial parent can browse, monetization blocked until child link |
| Child | /child-*, /trial-games | /api/child/* | child JWT | authMiddleware child-only split | Trial child can play and explore before linking |
| Admin | /admin, /admin-dashboard, /admin/purchases | /api/admin/* | admin JWT | adminMiddleware | Policy source of truth (age/trial/settings) |
| Public | legal/static pages, school/library profiles | /api/health and selected /api/public/* | none | none or inline checks | No session-required behavior |
| Partner | /library/*, /school/*, /teacher/* | mixed partner endpoints under /api/admin + specialized routers | role-specific | inline + admin enforcement | Separate business channels from parent/child |

## Routing Decision Contract

1. Entry through /age-gate is mandatory for cold sessions.
2. Age threshold from admin policy determines parent-trial vs child-trial branch.
3. Child-trial path starts with /api/auth/start-child-trial and stores child token.
4. Parent trial path forwards to parent auth/register with classification context.
5. Checkout APIs must reject parent monetization when no linked child exists.

## Ownership

- Frontend route owner: client/src/App.tsx and route wrappers.
- Decision owner: client/src/pages/AgeGate.tsx + server/routes/auth.ts.
- Guard owner: server/routes/middleware.ts.
- Admin policy owner: server/routes/admin.ts and admin settings UI.
