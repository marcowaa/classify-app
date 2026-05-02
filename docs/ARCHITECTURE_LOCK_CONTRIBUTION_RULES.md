# Architecture Lock and Contribution Rules

Last updated: 2026-03-20

## Lock Objective

Prevent architectural drift in routing, decisioning, and policy enforcement.

## Mandatory Rules

1. No new route without inventory update.
2. No policy change without contract update.
3. No onboarding/conversion changes without critical-flow test updates.
4. No guard weakening without explicit security approval.

## Mandatory Checklist for New Route

1. Added to docs/ROUTE_INVENTORY_FRONTEND.md or docs/API_INVENTORY_BACKEND.md.
2. Added to docs/ROUTE_AND_CHANNEL_MATRIX.md with channel classification.
3. Guard type declared (public/auth/admin/domain guard).
4. Response envelope validated against API contract.
5. Tests updated (unit/contract and critical-flow where relevant).

## Mandatory Checklist for New Policy

1. Policy source-of-truth declared.
2. Decision precedence impact documented.
3. Backward compatibility behavior documented.
4. Rollout strategy defined in controlled migration plan.
5. Rollback switch confirmed.

## PR Gate

A PR touching routes, auth, onboarding, campaigns, or monetization must include:

1. Route inventory diff snippet.
2. Matrix impact statement.
3. Contract impact statement.
4. Critical-flow gate run result.
