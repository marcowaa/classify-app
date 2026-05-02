# Classify Master Plan: UI/UX + SEO/ASO + Agent Coordination

Last updated: 2026-04-04

Program status: ADOPTED
Execution status: ACTIVE
Execution branch: sprint/2026-04-ui-seo-aso

## Adoption Record (2026-04-04)

1. Plan is approved for execution as the single source of truth for UI/UX + SEO/ASO modernization.
2. Specialist input has been collected from UI/UX, bug intelligence, performance, security, backend integration, i18n, and end-to-end execution agents.
3. Phase 0 execution is started with baseline gate verification.

### Phase 0 Baseline Gate Snapshot

1. TypeScript check: PASS (npx tsc --noEmit)
2. Build check: PASS (npm run build)
3. Test suite: PASS (npm run test -- --runInBand)
4. Runtime health: PASS on active production port 2001 (curl http://127.0.0.1:2001/api/health -> status ok)

## 1) Goal

Implement a repo-wide UI/UX modernization and SEO/ASO improvement program with a strict multi-agent coordination model, so no workstream breaks another.

## 2) Participating Agents (Required)

1. Classify UI Design Specialist Agent
2. Classify Bug Intelligence Agent
3. Classify Performance Auditor Agent
4. Classify Security Fix Agent
5. Classify Backend Integration Specialist
6. Classify Games i18n Agent
7. Classify Dev Executor

No PR in this program is allowed to merge without the required approvals listed in Section 8.

## 3) Program Principles

1. One objective per PR (no mixed UI + SEO + ASO in a single PR).
2. Small PRs preferred (target <= 400 changed lines unless generated assets/locales).
3. Contract safety first: keep API envelopes and auth/ownership behavior stable.
4. Locale completeness in same PR (no follow-up translation debt).
5. Security and regression gates are blocking, not advisory.

## 4) Delivery Structure

### 4.1 Branch Model

1. Protected branch: `main`
2. Program integration branch: `sprint/2026-04-ui-seo-aso`
3. Workstream branches:
   - `epic/uiux-*`
   - `epic/seo-*`
   - `epic/aso-*`
4. Agent branches: `agent/<lane>/<ticket-id>-<slug>`
5. Release candidate branch: `rc/2026-04-ui-seo-aso`
6. Emergency branch: `hotfix/<issue-id>`

### 4.2 Merge Flow

1. Agent branch -> Workstream branch (after domain review).
2. Workstream branch -> Program integration branch (after integration review).
3. Program integration branch -> RC (freeze begins).
4. RC -> main only after full validation + signoff matrix.

## 5) Phased Implementation Plan

### Phase 0: Baseline and Instrumentation (2-3 days)

1. Capture baseline UX, CWV, SEO, ASO metrics.
2. Lock acceptance criteria for each route/journey.
3. Create route inventory: public vs private/indexable vs noindex.

### Phase 1: UI/UX Foundation (Week 1)

1. Unify visual hierarchy, spacing, and mobile interaction patterns.
2. Standardize entry funnels and role-first navigation clarity.
3. Fix primary accessibility blockers (focus visibility, labels, keyboard flow).

### Phase 2: Technical SEO and Crawl Quality (Week 2)

1. Canonical/noindex/robots/sitemap consistency on public routes.
2. Ensure private/auth routes are excluded from index flow.
3. Validate metadata quality per high-priority landing routes.

### Phase 3: ASO and Store Conversion (Week 2)

1. Improve store listing copy quality and keyword coverage.
2. Refresh screenshots/creative assets aligned to in-app UX.
3. Keep release metadata and app artifacts in sync.

### Phase 4: Hardening and Release (Week 3)

1. Regression sweep across auth, child/parent boundaries, and payments.
2. Performance hardening (bundle, caching, image strategy).
3. RC freeze, go/no-go signoff, production release.

## 6) KPI Targets

### 6.1 UI/UX and Performance

1. LCP p75: mobile <= 2.5s, desktop <= 1.8s
2. INP p75: mobile <= 200ms, desktop <= 150ms
3. CLS p75: mobile <= 0.10, desktop <= 0.08

### 6.2 SEO

1. 100% of intended public routes have valid canonical.
2. 0 private/auth routes leaking into sitemap/indexable set.
3. 0 critical crawler response errors on `robots.txt`, `sitemap.xml`, `llms.txt`.

### 6.3 ASO

1. Listing text updated for targeted locales.
2. Screenshot set fully refreshed for latest UX.
3. Store metadata matches latest release artifact metadata.

## 7) i18n and RTL Constraints (Blocking)

1. App UI changes must update all 10 app locales in the same PR: `ar`, `en`, `pt`, `es`, `fr`, `de`, `tr`, `ru`, `zh`, `hi`.
2. Any i18n-enabled game change must update all 25 supported game languages.
3. Mandatory RTL validation for `ar` (app) and `ar/fa/ur` (games where applicable).
4. No hardcoded UI copy in changed React views.

## 8) Approval Matrix (Who Must Approve)

### 8.1 UI/UX PRs

1. Required: UI Design + Bug Intelligence + Dev Executor
2. Also required if auth/session touched: Security + Backend

### 8.2 SEO PRs

1. Required: Backend + Bug Intelligence + Dev Executor
2. Also required if metadata in UI changed: UI Design

### 8.3 ASO PRs

1. Required: Dev Executor + Bug Intelligence
2. Also required if in-app copy/screens changed: UI Design + Games i18n

### 8.4 Security-Critical Paths

Any change touching auth/guards/tokens/headers/payments requires mandatory Security approval.

## 9) Merge Blockers (Hard Stop)

1. Any failure in TypeScript/build/tests/health gate.
2. API envelope regression (`success/data/error/message` contract drift).
3. Parent/child authorization boundary regression.
4. Missing locale coverage for changed keys.
5. Private/auth route accidentally indexable.
6. Webhook signature verification or CSRF/CORS safety regression.

## 10) Validation Gate (Every PR)

1. `npx tsc --noEmit`
2. `npm run build`
3. `npm run test -- --runInBand`
4. `curl http://127.0.0.1:5000/api/health`

## 11) Weekly Operating Cadence

1. Daily 15-min sync: cross-agent blockers and dependency alignment.
2. Mid-week integration review: merge safety and KPI trend.
3. End-week release board: approve RC candidate or hold with blockers.

## 12) Anti-Conflict Protocol

1. Before coding: each agent posts a short scope note (routes/files/risks).
2. During work: no direct edits in another agent lane without explicit handoff.
3. Before merge: required approvals from matrix + evidence bundle.
4. After merge: monitor and keep rollback path documented.
