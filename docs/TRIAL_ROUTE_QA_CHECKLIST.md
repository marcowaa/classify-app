# Trial Route QA Checklist

Date: 2026-03-21
Scope: Manual regression checklist for trial parent/child route UX
Owner: Product QA / Support

## Usage
- Run this checklist after any route/auth/trial change.
- Mark each item as PASS or FAIL.
- If FAIL: add one-line root cause and link issue/commit.
- For APK/AAB release, execute this checklist together with MOBILE_RELEASE_MATRIX_2026-03-21.md.

## Environment Setup
- Base URL: https://classi-fy.com
- Browser: Chrome (normal + incognito)
- Language: Arabic + English
- Clear storage between persona switches:
  - localStorage
  - sessionStorage

## Parent Trial Scenarios
1. Entry bootstrap
- Steps: /age-gate -> choose age >= parent threshold.
- Expected: Parent trial goes to /parent-dashboard or configured safe parent entry.
- Expected UX: No dead-end page.

2. Wallet restriction
- Steps: open /wallet as parent trial.
- Expected: Redirect to /parent-auth?mode=register&notice=complete-account&from=...
- Expected UX: Visible message that account creation/completion is required.

3. Settings restriction
- Steps: open /settings as parent trial.
- Expected: Redirect to register notice.

4. Notifications restriction
- Steps: open /notifications as parent trial.
- Expected: Redirect to register notice.

5. Tasks restriction
- Steps: open /parent-tasks, /task-marketplace, /task-cart.
- Expected: Redirect to register notice.

6. Public pages allowed
- Steps: open /privacy-policy, /terms, /legal.
- Expected: Page opens normally (no forced redirect).

7. 404 fallback
- Steps: open random route /x-trial-random-miss.
- Expected: NotFound page shows registration call-to-action for trial user.

## Child Trial Scenarios
8. Child safe routes allowed
- Steps: open /child-games, /child-profile, /child-store, /child-discover.
- Expected: Open normally, no dead-end.

9. Parent surface restriction
- Steps: open /parent-dashboard and /parent-store as child trial.
- Expected: Redirect to /parent-auth?mode=register&notice=link-parent&from=...

10. Admin/role surfaces restriction
- Steps: open /admin, /admin-dashboard, /teacher/dashboard, /school/dashboard, /library/dashboard.
- Expected: Redirect to link-parent notice.

11. Trial game continuity
- Steps: /trial-games -> play/close -> continue navigation.
- Expected: No stuck state; clear CTA to account creation/link flow.

12. OAuth callback compatibility
- Steps: open /auth/google/callback?code=test&state=test.
- Expected: Bridge route handles callback path compatibility without 404 dead-end.

## Native Mobile Scenarios (APK/AAB)
13. Hardware back closes dialogs
- Steps: open any modal/dialog then press Android hardware back.
- Expected: Dialog closes first, app does not exit unexpectedly.

14. Hardware back root behavior
- Steps: navigate to root route then press back once, then again within 1.6s.
- Expected: first press shows exit hint, second press exits app.

15. Swipe-back route policy
- Steps: swipe on non-game routes then test swipe inside game routes (/child-games, /trial-games, /match3, /memory-match).
- Expected: swipe-back works on non-game routes only; no gameplay interruption on game routes.

16. Trial redirect policy on mobile
- Steps: repeat Parent Trial + Child Trial scenarios on real Android device.
- Expected: same redirect behavior as web; no dead-end screens.

## Pass/Fail Log
- Run date:
- Build/Commit:
- Parent trial result:
- Child trial result:
- Failed cases:
- Notes:

## Quick Failure Report Template
- Route:
- Persona: Parent trial / Child trial
- Actual behavior:
- Expected behavior:
- Blocking level: High / Medium / Low
- Suggested fix:
