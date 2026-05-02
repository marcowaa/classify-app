# UI/UX + SEO/ASO Phase 0 Execution Status

Date: 2026-04-04
Branch: sprint/2026-04-ui-seo-aso
Plan reference: docs/UI_UX_SEO_ASO_AGENT_COORDINATION_PLAN_2026-04.md

## Execution Decision

The program is now in execution mode. This file is the operational status board for Phase 0 baseline, coordination, and signoff readiness.

## Baseline Gate Evidence

1. TypeScript
- Command: npx tsc --noEmit
- Result: PASS

2. Production Build
- Command: npm run build
- Result: PASS
- Noted optimization signal: main entry bundle and multiple chunks exceed the warning threshold and are queued for Phase 1/4 performance work.

3. Test Suite
- Command: npm run test -- --runInBand
- Result: PASS (17/17 suites, 69/69 tests)

4. Runtime Health
- Command: curl http://127.0.0.1:2001/api/health
- Result: PASS (status ok, database healthy)

## Phase 0 Workboard

### Track A: Governance and Coordination

1. Formal adoption in master plan
- Owner agent: Classify Dev Executor
- Status: DONE

2. Branch activation for execution
- Owner agent: Classify Dev Executor
- Status: DONE

3. Signoff matrix enforcement setup for upcoming PRs
- Owner agent: Classify Dev Executor + Classify Bug Intelligence Agent
- Status: IN PROGRESS

### Track B: UX and Accessibility Baseline

1. Top-priority route shortlist lock (home, age-gate, parent-auth, child-link, download, trial-games)
- Owner agent: Classify UI Design Specialist Agent
- Status: IN PROGRESS

2. Accessibility baseline checklist lock (focus, keyboard, labels, contrast, modal trapping)
- Owner agent: Classify UI Design Specialist Agent
- Status: IN PROGRESS

### Track C: SEO/ASO Baseline

1. Public route indexability baseline and canonical map freeze
- Owner agent: Classify Backend Integration Specialist + Classify Bug Intelligence Agent
- Status: DONE

2. ASO artifact and listing parity baseline (copy/screenshots/release metadata)
- Owner agent: Classify Dev Executor
- Status: DONE

### Track C Execution Note (2026-04-04)

1. Implemented strict route-indexing boundary in runtime SEO hook:
- File: client/src/hooks/useSEO.tsx
- Change: indexable routes are now explicit whitelist, all non-whitelisted routes now emit `noindex, nofollow, noarchive` for `robots`, `googlebot`, and `bingbot`.

2. Implemented canonical normalization and route alias consistency:
- File: client/src/hooks/useSEO.tsx
- Change: canonical path now strips query/hash, normalizes trailing slash, and applies alias mapping for legacy paths.

3. Aligned crawler artifacts with index boundary:
- Files: client/public/sitemap.xml, client/public/llms.txt
- Change: auth entry removed from sitemap index set and llms public page list updated to classify auth entry as noindex.

4. Validation evidence after SEO changes:
- `npx tsc --noEmit`: PASS
- `npm run build`: PASS (chunk-size warnings only)
- `npm run test -- --runInBand`: PASS (17/17 suites, 69/69 tests)
- `curl http://127.0.0.1:2001/api/health`: PASS (status ok, database healthy)

5. Final SEO title consistency fix:
- File: client/src/App.tsx
- Change: removed branding-side `document.title` override so route-level titles from `useSEO` remain authoritative.

6. Browser verification (runtime):
- `/parent-auth?mode=login`: title `دخول ولي الأمر | Classify`, robots/googlebot/bingbot = `noindex, nofollow, noarchive`, canonical = `https://classi-fy.com/parent-auth`.
- `/download?utm_source=test`: route title applied (download-specific), robots = `index, follow...`, canonical = `https://classi-fy.com/download`.

### Track C Execution Note (2026-04-04, ASO PR-1)

1. Unified ASO source payload for distribution metadata:
- New file: `client/public/apps/release-content.json`
- Includes shared copy keys, listing copy, screenshot set, and channel URLs.

2. Synced release metadata payload with ASO section:
- Files: `client/public/apps/latest-release.json`, `dist/public/apps/latest-release.json`
- Change: both now include `aso` block for copy/screenshots/channel parity.

3. Wired download surfaces to release metadata:
- Files: `client/src/pages/DownloadApp.tsx`, `client/src/pages/Home.tsx`
- Change: download links, screenshot source, and copy-key selection now resolve from `latest-release.json` with safe fallbacks.

4. Made publish pipeline preserve ASO parity on every Android release:
- Files: `scripts/publish-android-release.ps1`, `scripts/publish-android-release.sh`
- Change: publish scripts now merge `release-content.json` into generated `latest-release.json` and archive metadata.

5. Strengthened release verification checks for ASO consistency:
- File: `scripts/check-mobile-release-assets.cjs`
- Change: validates required `aso.copyKeys`, screenshot file existence, and `channels.*.latestUrl` parity with `files.*.latestUrl`.

6. Validation evidence after ASO PR-1 changes:
- `npx tsc --noEmit`: PASS
- `npm run build`: PASS
- `npm run test -- --runInBand`: PASS (17/17 suites, 69/69 tests)
- `curl http://127.0.0.1:2001/api/health`: PASS (status ok, database healthy)
- `npm run release:verify-mobile-assets`: PASS

7. Browser runtime verification snapshot:
- URL: `/download`
- APK href: `/apps/classify-app-latest.apk`
- AAB href: `/apps/classify-googleplay-latest.aab`
- Screenshot cards rendered from unified set: 5

### Track D: Security and Boundary Guardrails

1. Security no-break checklist lock for auth, tokens, child/parent boundaries, and webhook paths
- Owner agent: Classify Security Fix Agent
- Status: DONE

2. Merge blockers publication and enforcement
- Owner agent: Classify Security Fix Agent + Classify Backend Integration Specialist
- Status: IN PROGRESS

### Track E: Localization and RTL

1. App locales parity enforcement for all changed keys (10 locales)
- Owner agent: Classify UI Design Specialist Agent + Classify Games i18n Agent
- Status: IN PROGRESS

2. Game locale coverage and RTL verification protocol (25 locales where i18n-enabled)
- Owner agent: Classify Games i18n Agent
- Status: IN PROGRESS

## Signoff Register for Next Merge Window

1. UI/UX: Pending first implementation PR
2. Bugs and regression: Pending first implementation PR
3. Performance: Pending first implementation PR
4. Security: Guardrails approved, implementation signoff pending per PR
5. Backend integration: Pending first implementation PR
6. Games i18n: Pending first implementation PR
7. End-to-end executor: Program execution approved

## Next 72-Hour Execution Targets

1. Open and complete the first UI foundation PR with accessibility-first changes on high-impact public routes.
2. Open and complete the first SEO consistency PR for canonical/noindex/route indexing boundaries.
3. Open and complete the first ASO consistency PR for listing and screenshot alignment.
4. Re-run full validation gate and update this board after each merged PR.
