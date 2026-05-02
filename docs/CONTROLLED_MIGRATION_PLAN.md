# Controlled Migration Plan

Last updated: 2026-03-20

## Goal

Migrate routing/decision architecture safely with feature flags, dual path, canary, and rollback.

## Feature Flags

| Flag | Default | Purpose | Owner |
|---|---|---|---|
| FF_DECISION_V2 | false | enable new age-based decision orchestration | backend/auth |
| FF_PARENT_MONETIZATION_STRICT | true | enforce linked-child purchase guard everywhere | backend/commerce |
| FF_ONBOARDING_ROUTE_MATRIX_AUDIT | false | log matrix mismatches in non-prod | platform |
| FF_CAMPAIGN_CHANNEL_ENVELOPE_V2 | false | new campaign metadata envelope | notifications |

Runtime controls implemented in code:
- FF_DECISION_CANARY_PERCENT (0..100)
- FF_DECISION_CANARY_ADMINS (comma-separated admin IDs)
- FF_ROUTE_DUAL_PATH_TELEMETRY (on/off)

## Dual Path Strategy

1. Keep existing path as V1.
2. Introduce V2 handlers behind flags.
3. Mirror telemetry for both paths where possible.
4. Compare output parity before flipping default.

Implementation status:
- Campaign and admin broadcast delivery decisions now run through unified resolver with v1/v2 selection and telemetry metadata.

## Canary Strategy

1. Enable flags for internal admin accounts only.
2. Expand to 5% parent cohort.
3. Expand to 25% after 24h error-free window.
4. Expand to 100% when conversion and error metrics remain stable.

## Rollback Strategy

1. Immediate: disable all V2 flags.
2. Short-term: route traffic to V1 handlers only.
3. Recovery: replay queued notifications/campaign jobs as needed.
4. Postmortem: update matrix/contracts/tests in one corrective PR.

## Readiness Checklist

1. docs/ROUTE_AND_CHANNEL_MATRIX.md updated.
2. docs/DECISION_CHANNELS_CONTRACT.md updated.
3. npm run test:critical-flow is green.
4. Deployment rollback command and owner assigned.
