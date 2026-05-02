# Google Play Production Readiness Audit

Audit date (UTC): 2026-04-19

## Acceptance Status

Pre-Release (Console Submission Pending)

## Compliance Matrix

| Requirement | Status | Evidence | Affected Paths |
|---|---|---|---|
| Digital in-app purchases on Android must use Google Play Billing | Pass (enforced) | Native Android wallet top-up now uses Google Play purchase completion endpoint; manual deposit path is blocked for native Android clients | `server/routes/parent.ts`, `client/src/pages/Wallet.tsx` |
| Real Play Billing client integration (BillingClient) | Pass | Custom Capacitor plugin with BillingClient added and registered; billing dependency and manifest billing permission are present | `android/app/src/main/java/com/classi_fy/twa/GooglePlayBillingPlugin.java`, `android/app/src/main/java/com/classi_fy/twa/MainActivity.java`, `android/app/build.gradle`, `android/app/src/main/AndroidManifest.xml` |
| Verify purchase token on backend before entitlement | Pass | Backend service verifies purchase token with Google Play Developer API before wallet credit | `server/services/payments/googlePlayBillingService.ts`, `server/routes/parent.ts` |
| Grant entitlement only on PURCHASED state | Pass | Completion endpoint rejects non-PURCHASED states and credits wallet only after verified PURCHASED state | `server/routes/parent.ts` |
| Acknowledge/consume purchases within required window | Pass | Backend completion path runs acknowledge and consume for consumables before wallet credit | `server/services/payments/googlePlayBillingService.ts`, `server/routes/parent.ts` |
| Replay/idempotency protection on purchase token | Pass | `google_play_purchases` table stores unique purchase token and crediting state to prevent duplicate credit | `shared/schema.ts`, `server/routes/parent.ts` |
| Target API level requirement | Pass | Android target SDK remains set to 35 | `android/variables.gradle`, `android/app/build.gradle` |
| API contract and endpoint documentation sync | Pass | Parent Google Play wallet endpoints and Android manual-deposit compliance guard documented | `docs/API_ENDPOINTS_REFERENCE.md` |
| Validation pipeline (typecheck/build/tests) | Pass | `npx tsc --noEmit`, `npx vite build`, `npm run test`, and `npm run build` all succeed | Workspace terminal evidence 2026-04-18 |
| Database schema push | Pass with caution | Final `npm run db:push` succeeded against local DB after `DATABASE_URL` set; one earlier run failed with existing relation error (`referrals`) indicating possible historical drift in some environments | `drizzle.config.ts`, `shared/schema.ts` |
| Runtime health gate | Pass | Production boot health endpoint returns HTTP 200 with `{"status":"ok","checks":{"database":"healthy"}}` when required env vars are set | `server/index.ts` |
| Release artifact readiness (.aab) | Pass (signed generated) | New release bundle is generated and signed with new upload key; publish script verification passes and direct `jarsigner` confirms `jar verified` | `android/app/build/outputs/bundle/release/app-release.aab`, `android/keystore/classify-upload-20260419-010409.jks`, `scripts/publish-android-release.ps1` |
| Unsigned release prevention guard | Pass | Build now hard-fails release tasks when `CLASSIFY_SIGNING_*` / `keystore.properties` is missing or invalid; publish scripts now fail if `jarsigner` detects unsigned AAB | `android/app/build.gradle`, `scripts/publish-android-release.ps1`, `scripts/publish-android-release.sh` |
| Release version lock guard | Pass | Publish scripts now block duplicate `versionCode` / release tag reuse unless explicit override flag is provided | `scripts/publish-android-release.ps1`, `scripts/publish-android-release.sh` |
| Artifact integrity provenance | Pass | Publish scripts now emit SHA256 checksums and provenance manifests for latest + archived artifacts | `scripts/publish-android-release.ps1`, `scripts/publish-android-release.sh`, `client/public/apps/latest-release.json` |

## Required Fixes (File-Level)

1. Upload and validate signed AAB in Play Console internal testing track.
2. Complete Play Console declarations and review gates (Data Safety, Content Rating, App Access, privacy/contact fields).
3. Stabilize migration parity across environments:
   - Re-run migration pipeline in staging/production-like DB to confirm no duplicate-object drift (e.g. existing `referrals` table conflicts).

## Cleanup Report

- Added native Google Play billing stack for Android wallet top-up flow and removed Android fallback usage for manual deposit endpoint by policy guard.
- No temporary scripts or debug routes were added in this implementation cycle.

## Validation Results (Current Workspace)

- `npx tsc --noEmit`: PASS (exit 0)
- `npx cap sync android`: PASS (plugins synchronized)
- `npx vite build`: PASS (exit 0, chunk-size warnings only)
- `npm run test`: PASS (17 suites, 69 tests)
- `npm run db:push`: PASS on final run (exit 0, `Changes applied`)
- `npm run build`: PASS (exit 0)
- `GET /api/health`: PASS (HTTP 200, `{"status":"ok","checks":{"database":"healthy"}}`)
- `cd android && .\\gradlew.bat bundleRelease`: PASS (after setting `JAVA_HOME` to Android Studio JBR and `ANDROID_HOME`)
- `scripts/publish-android-release.ps1 -SkipWebBuild -UseKeystoreFallback`: PASS (new signed latest+archive APK/AAB generated)
- `jarsigner -verify android/app/build/outputs/bundle/release/app-release.aab`: PASS (`jar verified`)
- `cd android && .\\gradlew.bat bundleRelease` (without signing vars): FAIL by design with mandatory signing error (expected enforcement)
- Publish script enforcement update: PASS (scripts now stop immediately on unsigned AAB)
- Release version lock update: PASS (scripts reject duplicate release identifiers unless override is explicit)
- Artifact checksum/provenance update: PASS (metadata now includes SHA256 + provenance records)
- `scripts/publish-android-release.ps1` with same version/build/versionCode as latest: FAIL by design with `Release version lock violation`
- `scripts/publish-android-release.ps1 -AllowVersionReuse` with same identifiers: bypasses lock, then fails at signing enforcement if signing credentials are missing (expected behavior)

## Submission Checklist (Go/No-Go)

- [x] Real Play Billing implementation completed (native Android wallet flow)
- [x] Backend verification + PURCHASED-only entitlement completed
- [x] Acknowledge/consume flow implemented and tested in code path
- [x] Non-compliant Android manual wallet top-up path blocked on native Android
- [x] Signed, real `.aab` generated
- [ ] Signed `.aab` upload-validated on Play internal testing track
- [x] `targetSdkVersion` meets current requirement
- [ ] Data Safety / Content Rating / App Access declarations completed in Play Console
- [ ] Internal/Closed test evidence and pre-launch report reviewed
- [x] Runtime health gate passed with production-like environment

Result: Pre-Release (Console Submission Pending) — technical compliance and signed artifact generation are complete; remaining work is Play Console upload validation + declarations.

## Sources (Official)

Access date: 2026-04-18

- https://support.google.com/googleplay/android-developer/answer/10281818
- https://developer.android.com/google/play/billing/integrate
- https://developer.android.com/google/play/requirements/target-sdk
- https://support.google.com/googleplay/android-developer/answer/113469
- https://play.google.com/console/about/guides/releasewithconfidence/
