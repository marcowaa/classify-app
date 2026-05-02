# Deep DB Analysis & Maintenance Plan (2026-03-21)

## Scope Covered
- Schema inventory from `shared/schema.ts`
- Migration inventory from `migrations/`
- Backend query usage patterns from `server/routes/*` and `server/services/*`
- Hardening gaps and operational maintenance readiness

## What Was Missing / Risky
1. Status integrity constraints were not enforced at DB level for several workflow tables.
2. High-traffic request tables had incomplete composite indexes for real query patterns.
3. No single automated audit path to compare expected schema tables vs actual DB tables.
4. No single-command hardening apply path that works consistently on Windows without `psql`.

## Fixes Implemented
1. Added migration: `migrations/20260321__db_hardening_and_maintenance.sql`
   - Adds safety constraints:
     - `child_login_requests.status` allowed values check
     - `parent_link_requests.status` allowed values check
     - `parent_parent_sync.sync_status` allowed values check
     - `sessions.expires_at > created_at`
     - `otp_codes.attempts >= 0`
   - Adds performance indexes for heavy paths:
     - child login request flows
     - parent link request flows
     - linking code lookups
     - OTP request throttling lookups
     - active session/device lifecycle queries
   - Runs `ANALYZE` on key hot tables

2. Added deep audit tool: `scripts/db-audit.cjs`
   - Compares expected tables from `shared/schema.ts` against live DB
   - Detects missing-table and extra-table drift
   - Detects foreign keys without left-prefix supporting indexes
   - Reports hygiene counters for expired active sessions/devices and pending-expired OTP/login requests
   - Outputs machine-readable report to `DataAnalysisExpert/db-audit-report.json`

3. Added hardening apply tool: `scripts/db-apply-hardening.cjs`
   - Applies new hardening migration using `pg` (no `psql` dependency)

4. Updated npm scripts:
   - `db:audit`
   - `db:hardening`

## How To Run (when DB is reachable)
1. `npm run db:hardening`
2. `npm run db:audit`

## Expected Outcome
- Better query performance on login/linking/request-heavy endpoints
- Stronger data integrity at DB layer
- Ongoing drift detection between code schema and live database
- Faster incident response through hygiene metrics

## Known Environment Blocker During This Session
- Local DB connection unavailable in this environment (`ECONNREFUSED`), so live audit execution was not possible here.
