# Mobile Release Matrix - APK/AAB Readiness (2026-03-21)

## Purpose
Turn the request for "100% APK/AAB readiness" into measurable, testable release gates.

## Critical Packaging Rule (Very Important)
- Build AAB/APK only when the release includes native Android changes.
- Do not rebuild AAB/APK for web/backend-only changes.
- For web/backend-only changes, deploy server/web and run post-deploy validation.

## Verified Today (Build Pipeline)
Status: PASS

1. TypeScript check: `npx tsc --noEmit`
2. Web/server production build: `npm run build`
3. Test suite: 14/14 suites, 50/50 tests
4. Android AAB build: `android/gradlew.bat bundleRelease`
5. Android APK build: `android/gradlew.bat assembleRelease`

Generated artifacts:
- android/app/build/outputs/bundle/release/app-release.aab
- android/app/build/outputs/apk/release/app-release.apk

## Runtime Preconditions
- Backend API must be reachable by the app URL configured in capacitor.config.json.
- Database must be reachable by backend at runtime.
- Health endpoint must return 200 in target environment.

## Device/OS Matrix (Required)
Run all critical scenarios on at least one device from each row.

| Priority | Android API | Android Version | Device Class | Minimum Count |
|---|---:|---|---|---:|
| P0 | 23 | 6.0 | Low-end phone (2-3 GB RAM) | 1 |
| P0 | 26 | 8.0 | Mid phone | 1 |
| P0 | 29 | 10 | Mid phone | 1 |
| P0 | 31 | 12 | Mid/High phone | 1 |
| P0 | 34 | 14 | High phone | 1 |
| P1 | 35 | 15 | New flagship | 1 |
| P1 | 30-35 | 11-15 | 7-inch tablet | 1 |

## Critical Scenarios (Must Pass)

### A) App Launch and Session
1. Cold start to first interactive screen within acceptable time.
2. Resume from background without white screen or frozen UI.
3. Force-close then reopen preserves expected auth/session behavior.

### B) Navigation and Back Behavior
1. Hardware back closes open dialogs first.
2. Hardware back navigates history when history exists.
3. On root route: double-back exits app, first back shows exit hint.
4. Swipe-back works on non-game routes only.
5. Swipe-back does NOT break gameplay on game routes.

### C) Touch and Input
1. Tap targets respond reliably on all primary pages.
2. Form fields focus and keyboard behavior remain stable.
3. No accidental navigation from horizontal gestures inside games.

### D) Trial/Parent/Child Route Safety
1. Trial users never reach dead-end screens.
2. Restricted trial routes redirect to registration flow with clear message.
3. Parent/child token states do not cross-leak routes.

### E) Network and Recovery
1. Offline entry shows guarded state, no crash loop.
2. Reconnect restores data loading.
3. Slow network (3G profile) keeps navigation functional.

## Go/No-Go Criteria
Release is GO only when all conditions are true:
1. All pipeline checks pass (already PASS today).
2. 0 blocker defects in P0 matrix rows.
3. 0 crashes in critical scenarios.
4. Back/swipe behavior is consistent with route policy.
5. Trial route guard behavior matches expected redirects.

Release is NO-GO if any of the following occurs:
1. Crash, freeze, or blank screen in any P0 row.
2. Hardware back exits unexpectedly away from root.
3. Swipe gesture breaks game interactions.
4. Dead-end route appears for trial account.

## Execution Log Template
Use this table while executing on real devices.

| Date | Tester | Device | API | Build | Scenario Group | Result | Notes | Defect ID |
|---|---|---|---:|---|---|---|---|---|
| YYYY-MM-DD | Name | Model | 34 | 2.1.16 (31) | B) Back Behavior | PASS/FAIL | details | BUG-XXX |

## Notes
- Static checks and successful packaging are necessary but not sufficient for claiming "100%".
- "100%" requires completion of the device/OS matrix above on real devices or a trusted device cloud.

## Current Status Snapshot (2026-03-21)
- Build and packaging readiness: PASS
- Automated regression readiness: PASS (tests green)
- Runtime local health validation: BLOCKED by local DB availability
- Real-device matrix coverage: NOT STARTED

Next required action:
1. Execute P0 device/API rows and record results in MOBILE_RELEASE_EXECUTION_LOG_2026-03-21.md.
