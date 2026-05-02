# Classify — A/B Testing Plan for Google Play

## Overview
Google Play's built-in A/B testing (Play Store Experiments) allows us to test different versions of store listing assets to maximize conversion rate. This document defines our testing roadmap, hypotheses, and measurement framework.

---

## Testing Priority Matrix

| Test | Potential Impact | Effort | Priority |
|------|-----------------|--------|----------|
| App Icon A/B | Very High | Low | 🔴 P1 |
| Screenshot Order | High | Low | 🔴 P1 |
| Feature Graphic | High | Low | 🔴 P1 |
| Short Description Copy | Medium | Low | 🟡 P2 |
| Screenshot Design Variant | High | Medium | 🟡 P2 |
| App Name Variation | Medium | Low | 🟡 P2 |

---

## Experiment 1: App Icon A/B Test

### Hypothesis
A green tree-focused icon will outperform the purple gradient icon because:
- Green = nature/growth is instantly recognizable as educational
- More unique in a sea of purple/blue educational apps
- Tree visual communicates the app's core feature immediately

### Variants

**Variant A (Control) — Main Purple Icon**
- File: `app-icon/app-icon-512x512.html`
- Design: Deep purple gradient, large "C" lettermark with embedded tree, gold sparkles
- Rationale: Brand consistency with in-app purple theme

**Variant B — Tree Focus Green Icon**
- File: `app-icon/variants/icon-variant-c-tree-focus.html`
- Design: Dark forest green, full-size detailed tree SVG, "CLASSIFY" text at bottom
- Rationale: Feature-first, nature/growth messaging

**Variant C — Minimal Icon**
- File: `app-icon/variants/icon-variant-b-minimal.html`
- Design: Clean white background, purple circle with tree, minimal/modern
- Rationale: Stands out on white backgrounds, modern aesthetic

### Test Setup
- **Platform**: Google Play Store Experiments (Store Listing Experiments)
- **Traffic Split**: 34% / 33% / 33%
- **Minimum Duration**: 30 days (or 5,000 installs per variant)
- **Primary Metric**: Install conversion rate (store listing visits → installs)
- **Secondary Metric**: D7 retention (do different icons attract different quality users?)

### Success Criteria
- Statistical significance: 95% confidence
- Minimum lift to declare winner: +5% conversion rate improvement
- No significant negative impact on retention

---

## Experiment 2: Screenshot Order A/B Test

### Hypothesis
Leading with the Growth Tree feature will outperform leading with the Parent Dashboard because:
- The tree is emotionally engaging and visually distinctive
- Parents immediately want to understand "what makes this different"
- The tree visual has been our most-commented feature in beta testing

### Variants

**Variant A (Control) — Current Order**
1. phone-01-growth-tree.html
2. phone-02-parent-dashboard.html
3. phone-03-educational-games.html
4. phone-04-tasks-points.html
5. phone-05-teacher-marketplace.html

**Variant B — Parent-First Order**
1. phone-02-parent-dashboard.html
2. phone-01-growth-tree.html
3. phone-04-tasks-points.html
4. phone-03-educational-games.html
5. phone-06-rewards-wallet.html

**Variant C — Social Proof First**
1. phone-09-achievements-leaderboard.html (social proof)
2. phone-01-growth-tree.html
3. phone-02-parent-dashboard.html
4. phone-06-rewards-wallet.html
5. phone-03-educational-games.html

### Test Setup
- **Traffic Split**: 34% / 33% / 33%
- **Minimum Duration**: 21 days
- **Primary Metric**: Install conversion rate
- **Secondary Metric**: Scroll depth on store listing

---

## Experiment 3: Feature Graphic Copy A/B Test

### Hypothesis
A feature graphic with a direct question/challenge will outperform the current declarative headline because it creates curiosity and engagement.

### Variants

**Variant A (Control)**
- Main blue gradient feature graphic
- Headline: "علّم طفلك... بطريقة يحبها"

**Variant B — Question-based**
- Same visual design but different copy
- Headline: "هل يكره طفلك الدراسة؟ Classify يغيّر ذلك"

**Variant C — Benefit-first**
- Headline: "90% من الأطفال يكملون مهامهم مع Classify"

### Test Setup
- **Traffic Split**: 34% / 33% / 33%
- **Minimum Duration**: 14 days (feature graphic gets more impressions)
- **Primary Metric**: Store listing visit-to-install conversion
- **Secondary Metric**: Feature graphic click-through rate (where trackable)

---

## Experiment 4: Short Description A/B Test

### Hypothesis
Emoji-heavy descriptions with numbers will outperform descriptive text because:
- Emojis catch the eye in search results
- Numbers (1200+, 5 profiles) add credibility quickly

### Variants

**Variant A (Current)**
> علّم طفلك بمهام وألعاب 🌳 رقابة أبوية كاملة + شجرة نمو + مكافآت حقيقية

**Variant B — Numbers-forward**
> 🌳 1200+ مهمة تعليمية • ألعاب بدون إعلانات • رقابة أبوية ذكية • مكافآت حقيقية

**Variant C — Problem/Solution**
> هل طفلك لا يحب الدراسة؟ 🌳 Classify يحوّل التعلم إلى مغامرة — مهام + ألعاب + شجرة نمو

### Test Setup
- **Traffic Split**: 34% / 33% / 33%
- **Minimum Duration**: 21 days
- **Primary Metric**: Install conversion from search results

---

## Measurement Framework

### How to Track Results

1. **Google Play Store Experiments** (built-in)
   - Go to: Play Console → Store presence → Store listing experiments
   - Set variants, traffic split, and tracking duration
   - Play will calculate statistical significance automatically

2. **Firebase + Adjust Attribution**
   - Tag each variant with a campaign parameter
   - Track post-install behavior by variant
   - Compare D1, D7, D30 retention by variant

3. **Weekly Review Process**
   ```
   □ Check experiment dashboard every Monday
   □ Log results in this document
   □ Flag if any variant is performing significantly worse (pause early)
   □ Don't end tests early due to "looking good" — wait for significance
   □ Share results with team in weekly ASO meeting
   ```

---

## Results Log

### Icon Test Results
| Date | Variant | Conversion Rate | Confidence | Status |
|------|---------|----------------|------------|--------|
| TBD | A (Purple) | — | — | Running |
| TBD | B (Green Tree) | — | — | Running |
| TBD | C (Minimal) | — | — | Running |

### Screenshot Order Results
| Date | Variant | Conversion Rate | Confidence | Status |
|------|---------|----------------|------------|--------|
| TBD | A (Tree first) | — | — | Planned |
| TBD | B (Parent first) | — | — | Planned |
| TBD | C (Social proof first) | — | — | Planned |

---

## Best Practices Reminders

1. **Run one experiment at a time** on the same element (don't test icon + screenshots simultaneously — confounds results)
2. **Wait for 95% statistical confidence** before declaring a winner
3. **Minimum 1,000 installs per variant** before making any decisions
4. **Document everything** — winning variants, margins, dates
5. **Implement winners immediately** — don't leave a proven winner idle
6. **Iterate** — the winning variant from test 1 becomes the control for test 2

---

## Seasonal Override Plan

When seasonal events occur, pause experiments and run seasonal assets:

| Season | Duration | Action |
|--------|----------|--------|
| Ramadan | 2 weeks pre + during | Switch to Ramadan feature graphic |
| Eid Al-Fitr | 3 days | Special icon frame (if supported) |
| Back to School | August–September | Switch to B2S feature graphic |
| National Day (SA/UAE) | 1 week | Consider national colors overlay |

Resume experiments after seasonal period ends.

---

*Classify ASO Team | A/B Testing Playbook v1.0 | April 2026*
