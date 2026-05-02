# Frontend Routing Blueprint

Last updated: 2026-03-20

## Official Module Split

| Module | Route Prefixes | Primary Pages | Guard/Entry |
|---|---|---|---|
| onboarding | /, /age-gate, /register, /download | home, age gate, redirects | cold session to decision flow |
| parent-auth | /parent-auth, /otp, /forgot-password, /auth/oauth-callback | auth and OTP | parent identity bootstrap |
| parent-app | /parent-dashboard, /parent-store, /parent-inventory, /parent-profile, /wallet, /notifications, /subjects, /parent-tasks, /task-marketplace, /task-cart | parent runtime | parent token + purchase constraints |
| child-app | /child-*, /trial-games | games, tasks, profile, rewards | child token or trial child token |
| admin-app | /admin, /admin-dashboard, /admin/purchases | admin auth and control panel | admin role |
| legal-public | /privacy, /terms, /legal, /cookie-policy, /about, /contact | static/public docs | no auth |
| partner | /library/*, /school/*, /teacher/* | partner portals and profiles | partner-specific logic |

## Route Composition Rules

1. New routes must be assigned to exactly one module.
2. Decision routes cannot include side effects unrelated to session bootstrap.
3. Parent and child modules cannot share mutable storage keys.
4. Trial routes must remain explicit and testable.

## Shared Concerns

- Error boundaries wrap all top-level routes.
- Game routes disable swipe-back logic.
- Trial exploration analytics can read route transitions only.

## Mandatory Review Checklist

1. Route added to docs/ROUTE_INVENTORY_FRONTEND.md.
2. Route added to docs/ROUTE_AND_CHANNEL_MATRIX.md.
3. Module ownership documented in PR description.
4. Critical flow tests updated when route affects onboarding or conversion.
