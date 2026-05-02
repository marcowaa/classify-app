# Execution Charter - 30 Days

Date: 2026-03-22
Scope: Reliability, release quality, security posture, OTP governance, and mobile release confidence.

## Objective
Move the project from "working" to "reliable, scalable, and auditable" with measurable gates.

## KPI Targets

| KPI | Target | Current Snapshot |
|---|---|---|
| API availability | >= 99.9% monthly | Pending formal SLI instrumentation |
| Crash-loop incidents | 0 | Reduced risk after DB resilience patch; monitoring policy pending |
| MTTR | < 30 min | No formal incident timer yet |
| Deploy success without rollback | >= 95% | Pending release scoreboard |
| Mandatory quality gates pass rate | 100% per release | Core checks currently pass locally |
| Mobile P0 matrix completion | 100% | Pending real-device execution |

## Work Plan Board (Single Source of Truth)

Status legend:
- DONE = completed and validated
- IN_PROGRESS = started but needs remaining actions
- TODO = not started
- BLOCKED = cannot proceed due to dependency

| ID | Work Item | Owner | Week | Status | Evidence |
|---|---|---|---|---|---|
| W1-1 | Reliability baseline and DB disconnect hardening | Backend | 1 | DONE | [server/index.ts](server/index.ts), [server/storage.ts](server/storage.ts) |
| W1-2 | Startup migration policy: disable auto schema push by default | DevOps | 1 | DONE | [scripts/docker-entrypoint.sh](scripts/docker-entrypoint.sh), [docker-compose.yml](docker-compose.yml), [.env.production.example](.env.production.example) |
| W1-3 | Hostinger operations runbook | DevOps | 1 | DONE | [docs/HOSTINGER_DOCKER_OPERATIONS_RUNBOOK.md](docs/HOSTINGER_DOCKER_OPERATIONS_RUNBOOK.md) |
| W1-4 | Hostinger apply script and execution steps | DevOps | 1 | DONE | [scripts/hostinger-apply-runtime-hardening.sh](scripts/hostinger-apply-runtime-hardening.sh), [docs/HOSTINGER_RUNTIME_APPLY_STEPS.md](docs/HOSTINGER_RUNTIME_APPLY_STEPS.md) |
| W1-5 | SLO/SLI definition and alert routing | DevOps | 1 | TODO | Not yet implemented in repo |
| W2-1 | OTP source-of-truth unification (admin + env + user) | Backend | 2 | IN_PROGRESS | [server/routes/auth.ts](server/routes/auth.ts), [server/sms-otp.ts](server/sms-otp.ts) |
| W2-2 | Security secrets audit and rotation policy | Security | 2 | TODO | Policy file not created yet |
| W2-3 | Release gate policy in CI | DevOps | 2 | TODO | No CI workflow gate file updated yet |
| W3-1 | Mobile P0 device matrix execution | QA | 3 | IN_PROGRESS | [docs/MOBILE_RELEASE_MATRIX_2026-03-21.md](docs/MOBILE_RELEASE_MATRIX_2026-03-21.md), [docs/MOBILE_RELEASE_EXECUTION_LOG_2026-03-21.md](docs/MOBILE_RELEASE_EXECUTION_LOG_2026-03-21.md) |
| W3-2 | Critical E2E scenarios for auth/trial/payment/back behavior | QA + Backend | 3 | TODO | Not yet added |
| W4-1 | Game day incident drill (DB restart + recovery) | DevOps | 4 | TODO | Drill output not documented yet |
| W4-2 | Rollback drill and final readiness report | DevOps + PM | 4 | TODO | Pending |

## Execution Performed Now (This Session)

| Check | Command/Task | Result | Notes |
|---|---|---|---|
| TypeScript | Agent Fixed: TypeScript Check | PASS | Task completed without compile errors |
| Production build | Agent Fixed: Build Production | PASS | Build output generated under dist |
| Test suite | Agent Fixed: Run Tests InBand | PASS | 14/14 suites, 50/50 tests |
| Health endpoint | Agent Fixed: Health Check | FAIL | Exit code 1 from task in current local runtime context |

## Done vs Not Done Summary

DONE now:
- DB resilience patch and transient recovery behavior.
- Startup migration pressure reduction with default no-auto-push.
- Hostinger runbook and hostinger apply script.
- Core compile/build/test checks are passing.

NOT DONE yet:
- Formal SLO/SLI instrumentation and alert routing.
- CI-enforced release quality gate.
- Secrets lifecycle policy + rotation evidence.
- Real-device mobile P0 matrix completion.
- Incident drill + rollback drill reports.

## Next 3 Actions

1. Add SLO/SLI document and alert ownership matrix in docs.
2. Add CI pipeline gate to require typecheck/build/test and health smoke before release approval.
3. Execute and fill mobile real-device matrix rows in execution log.
