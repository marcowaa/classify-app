# UX Role Parity Standards and Audit Scorecard

## Purpose
This document defines a consistent UX parity standard for the four primary roles in Classify:
- Parent
- Teacher
- School
- Library

Parity means each role can complete first-value actions with clear navigation, stable system feedback, and consistent trust signals.

## Scoring Model
Each category is scored from 0 to 5:
- 0: Missing
- 1: Major gaps
- 2: Partial/inconsistent
- 3: Acceptable baseline
- 4: Strong
- 5: Best-in-class

Weighted total score formula:

$$
\text{Total Score} = \sum_{i=1}^{n}(\text{Category Score}_i \times \text{Weight}_i)
$$

## Categories and Weights
| Category | Weight |
|---|---:|
| Entry and Authentication Clarity | 0.15 |
| First Value Path (<= 3 steps) | 0.20 |
| Runtime and Degraded State Communication | 0.15 |
| Session and Security Confidence | 0.15 |
| Onboarding Guidance and Progress Visibility | 0.20 |
| Recovery and Support Pathways | 0.15 |

## Audit Scorecard (Current Cycle)
| Role | Entry/Auth | First Value | Runtime/Degraded | Session/Security | Onboarding | Recovery/Support | Weighted Total |
|---|---:|---:|---:|---:|---:|---:|---:|
| Parent | 4 | 4 | 4 | 4 | 4 | 3 | 3.85 |
| Teacher | 4 | 4 | 3 | 3 | 4 | 3 | 3.55 |
| School | 4 | 4 | 3 | 3 | 4 | 3 | 3.55 |
| Library | 4 | 4 | 3 | 3 | 4 | 3 | 3.55 |

## Role-Level Standards (Must Pass)
- Parent:
  - Must expose child-link path in one tap from dashboard.
  - Must show session and trusted-device status in settings.
- Teacher:
  - Must create first task in <= 3 steps.
  - Must access wallet and withdrawal pathway clearly.
- School:
  - Must add first teacher and publish first post in <= 3 steps each.
  - Must access enrollments and students overview clearly.
- Library:
  - Must add first product and track first order in <= 3 steps each.
  - Must access finance tab and withdrawal flow clearly.

## Failing Conditions
A role fails parity if any of the following is true:
- Weighted total score < 3.25
- First Value Path score < 3
- Onboarding Guidance score < 3

## Review Cadence
- Weekly lightweight score refresh
- Monthly formal parity review with evidence links

## Evidence Links
- UX audit plan: docs/UX_FULL_AUDIT_REPORT_2026-03-22.md
- Smoke gate: tests/smoke/pipeline-smoke.test.ts
