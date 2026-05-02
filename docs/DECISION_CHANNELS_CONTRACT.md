# Decision Channels Contract

Last updated: 2026-03-20

## Purpose

Define one architectural contract for decision channels across:
- sessions
- notifications
- campaigns

## Session Contract

### Token classes

| Token Type | Producer | Consumer Routes | Forbidden Routes |
|---|---|---|---|
| parent | /api/auth/login, /api/auth/register | /api/parent/*, eligible shared APIs | /api/child/* |
| child | child onboarding/link flows | /api/child/*, child discovery | /api/parent/* |
| admin | /api/admin/login | /api/admin/* | parent/child privileged mutations |

### Enforcement rules

1. authMiddleware must block child tokens on /api/parent.
2. authMiddleware must block non-child tokens on /api/child.
3. adminMiddleware must be explicit for /api/admin management operations.
4. Frontend session precedence contract is centralized: childToken > token > familyCode.

## Notification Contract

### Channels

| Channel | Trigger Type | Delivery Mode | Priority |
|---|---|---|---|
| product-offer | purchase/reward flow | in-app + optional push | normal/high |
| operational | system status, policy changes | in-app | normal |
| campaign | admin ad/campaign dispatch | in-app + push/email depending config | low/normal/high |

### Required metadata

Every notification payload must include:
- channelKey
- audienceType (parent/child/admin/mixed)
- severity (low/normal/high)
- eventTime
- sourceRoute

## Campaign Contract

### Inputs

- admin campaign configuration
- audience filters
- frequency/cadence
- channel bindings

### Output guarantees

1. Campaign execution must be idempotent per delivery window.
2. Failed deliveries must be replayable from DLQ endpoints.
3. Campaign audience selection must not cross auth boundaries.
4. Campaign delivery profile selection must go through unified decision resolver (v1/v2 + canary + telemetry metadata).

## Decision Precedence

1. Security guard decisions.
2. Policy decisions (age/trial/social-login prompts).
3. Notification and campaign enrichment.
4. UX hinting and non-blocking prompts.

## Backward Compatibility

1. Keep current API success/error envelope unchanged.
2. Keep legacy route aliases until migration gate closes.
3. Add new channels as additive keys only.
