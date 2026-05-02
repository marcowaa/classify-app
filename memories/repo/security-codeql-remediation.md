# Security CodeQL Remediation

- 2026-03-29: SSRF hardening pass started for CodeQL critical alerts.
- Added shared guard `server/utils/urlGuards.ts` with strict upload proxy origin validation (`resolveSafeUploadProxyTarget`) and private-host detection (`isPrivateOrLocalHost`).
- Applied upload proxy guard to: parent, teacher, school, library, and media-uploads routes.
- Admin game URL validation no longer performs external fetch probing; now enforces iframe policy + blocks private/local hosts.
- Reduced regex-risk surface by replacing auth email regex checks with deterministic validator and replacing trailing-slash regex in `paymentService`.
- Verification after changes: `npx tsc --noEmit`, `npm run build`, `npm run test -- --runInBand`, health `{"status":"ok"}` (with expected local DB connection-refused noise on background workers).
- 2026-03-29: Parsed full alert export file (`c:\Users\cex\Downloads\مهم.txt`, 2124 lines, 425 unique alerts) and created execution plan `docs/CODEQL_REMEDIATION_PLAN_2026-03-29.md` with phased non-breaking remediation strategy.
- 2026-03-29 (Wave 1 implementation): Replaced header-driven proxy authority (`x-upload-url`) with server-issued object-path intent mapping in `server/services/uploadService.ts`; proxy routes now resolve target URL from trusted in-memory intent keyed by actor+objectPath.
- Added `uploadProxyLimiter` and applied it to parent/teacher/school/library upload proxy endpoints (including `server/routes/media-uploads.ts`) to close high-priority missing-rate-limit findings around upload sinks.
- 2026-03-29: Remediated new Dependabot alerts by updating `cat-game/package-lock.json` via `npm audit fix` (rollup 4.60.0, picomatch 4.0.4, micromatch nested picomatch 2.3.2; `npm audit` now 0 vulnerabilities) and upgrading vulnerable NuGet libs in `ice-age-game-master/packages.config` (bootstrap 3.4.1, jQuery 3.7.1, jQuery.UI.Combined 1.13.2, Moment.js 2.29.4).
- 2026-03-30 (Wave 3 hardening batch): tightened canonical host redirects in `server/index.ts` (strict host equality + safe relative path normalization), added browser-cookie CSRF origin/referer guard for mutating methods, enabled `x-powered-by` disable, and switched Helmet frameguard to sameorigin.
- 2026-03-30: added trusted-redirect normalization in OAuth/store flows (`server/routes/auth.ts`, `server/routes/store.ts`) before `res.redirect(...)`.
- 2026-03-30: added `publicPageLimiter` and applied it to SPA wildcard fallbacks in `server/static.ts` and `server/vite.ts`.
- 2026-03-30: env dashboard sessions are now stored by SHA-256 token hash and login attempts are throttled per IP (`server/env-dashboard.ts`).
- 2026-03-30 verification gate: `npx tsc --noEmit`, `npm run build`, `npm run test -- --runInBand`, `curl.exe -s -i http://127.0.0.1:5000/api/health` -> `HTTP/1.1 200 OK` + `{"status":"ok"}`.
