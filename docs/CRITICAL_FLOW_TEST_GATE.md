# Critical Flow Test Gate

Last updated: 2026-03-20

## Gate Objective

Block merges when onboarding and conversion-critical contracts regress.

## Required Gates

1. TypeScript gate: npx tsc --noEmit
2. Build gate: npm run build
3. Full tests: npm run test -- --runInBand
4. Critical contract tests: npm run test:critical-flow
5. Health check: curl.exe -s http://127.0.0.1:5000/api/health

## Contract Test Scope (implemented)

- onboarding route contract:
  - age gate exists
  - parent auth exists
  - trial route exists
  - child-trial start endpoint exists
- onboarding critical scenarios contract:
  - child-trial bootstrap persists child and trial tokens
  - parent/child classification branching remains in age gate
  - purchase lock phrase for unlinked parent remains enforced
- governance contract:
  - linked-child monetization guard exists
  - guard is applied in parent/store/marketplace route groups
  - canonical response envelope markers remain present

## E2E Critical Scenarios (mandatory manual/automation target)

1. cold visitor -> age gate -> child trial -> trial games.
2. cold visitor -> age gate -> parent auth/register -> parent dashboard.
3. parent trial purchase attempt without linked child -> blocked with contract error.
4. link child after trial -> purchase path unlocks.
5. social login path preserves classification decision.

## Failure Policy

1. Any failed gate blocks deploy.
2. Hotfix bypass requires explicit emergency approval and rollback plan.
3. Failed critical-flow gate requires updating route matrix and governance spec before retry.
