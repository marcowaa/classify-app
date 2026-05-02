# Structured Usability Test Cycles (Persona x Locale)

## Purpose
Define repeatable usability cycles by persona and locale to continuously validate UX quality.

## Personas
- Parent
- Teacher
- School
- Library

## Locales (App)
- ar
- en
- pt
- es
- fr
- de
- tr
- ru
- zh
- hi

## Cycle Structure
Each cycle runs with this sequence:
1. Plan: select persona + locale + target funnel.
2. Execute: run scripted tasks with timing and error capture.
3. Score: compute completion rate, time-to-first-value, and recovery success.
4. Decide: classify findings into P0/P1/P2 and assign owners.
5. Verify: re-run only affected paths after fixes.

## Mandatory Tasks Per Persona
- Parent:
  - Sign in and reach dashboard.
  - Link child pathway discovery.
  - Complete one monetization guard-safe purchase path.
- Teacher:
  - Create first task.
  - Publish first post.
  - Check wallet and withdrawal request visibility.
- School:
  - Add teacher.
  - Publish post.
  - Review student/enrollment surfaces.
- Library:
  - Add product.
  - Review first order lifecycle.
  - Visit finance and withdrawal surfaces.

## Metrics
- Funnel completion rate (target >= 90%)
- Time to first value (target <= 180 seconds)
- Error-free step rate (target >= 95%)
- Recovery success rate after error (target >= 85%)

## Test Matrix Template
| Cycle ID | Persona | Locale | Scenario | Completion % | TTFV (sec) | Error-Free % | Recovery % | Status |
|---|---|---|---|---:|---:|---:|---:|---|
| CYCLE-001 | Parent | ar | Link child + guarded purchase path |  |  |  |  | Planned |
| CYCLE-002 | Teacher | en | First task + first post |  |  |  |  | Planned |
| CYCLE-003 | School | pt | Add teacher + review students |  |  |  |  | Planned |
| CYCLE-004 | Library | es | Add product + first order review |  |  |  |  | Planned |

## Exit Criteria Per Cycle
- All mandatory persona tasks executed in selected locale
- Metrics captured and stored
- Findings triaged and ownership assigned
- Follow-up verification completed

## Evidence Links
- Role parity standards: docs/UX_ROLE_PARITY_SCORECARD.md
- UX audit plan: docs/UX_FULL_AUDIT_REPORT_2026-03-22.md
