# Classify — ASO & KPI Tracking Dashboard

## Overview
This document defines all key metrics, tracking frequency, targets, and data sources for Classify's Google Play performance monitoring.

---

## 📊 Primary KPI Dashboard

### Install & Growth Metrics

| Metric | Weekly Target | Monthly Target | Data Source |
|--------|--------------|----------------|-------------|
| New Installs (Organic) | 500+ | 2,000+ | Play Console |
| New Installs (Paid) | 1,000+ | 4,000+ | Google UAC |
| Total Active Users (MAU) | — | 10,000+ | Firebase |
| Daily Active Users (DAU) | 1,000+ | — | Firebase |
| DAU/MAU Ratio | 15%+ | — | Calculated |

### Store Listing Performance

| Metric | Target | Frequency | Data Source |
|--------|--------|-----------|-------------|
| Store Listing Conversion Rate | > 25% | Weekly | Play Console |
| Store Listing Visits | 10,000+ | Weekly | Play Console |
| Install Rate (From Browse) | > 12% | Weekly | Play Console |
| Icon Click-Through Rate | > 8% | Weekly | Play Console |

### Retention Metrics

| Metric | Target | Frequency | Data Source |
|--------|--------|-----------|-------------|
| Day 1 Retention (D1) | > 45% | Weekly | Firebase/Adjust |
| Day 7 Retention (D7) | > 25% | Weekly | Firebase/Adjust |
| Day 30 Retention (D30) | > 15% | Monthly | Firebase/Adjust |
| Average Session Length | > 12 min | Weekly | Firebase |
| Sessions per DAU | > 2.5 | Weekly | Firebase |

### Quality Metrics

| Metric | Target | Frequency | Data Source |
|--------|--------|-----------|-------------|
| App Rating | > 4.5 ⭐ | Weekly | Play Console |
| Rating Count | +200/month | Monthly | Play Console |
| Crash Rate | < 0.5% | Daily | Play Console / Crashlytics |
| ANR Rate | < 0.2% | Daily | Play Console |
| Review Response Rate | 100% | Daily | Play Console |
| Avg Response Time | < 4h (1★), < 24h (rest) | Daily | Manual |

---

## 🔑 ASO Keyword Tracking

### Primary Keywords (Arabic) — Track Weekly

| Keyword | Current Rank | Target Rank | Volume | Competition |
|---------|-------------|-------------|--------|-------------|
| تطبيق تعليمي للأطفال | — | Top 3 | High | Medium |
| رقابة أبوية | — | Top 5 | High | Low |
| تعليم اطفال | — | Top 3 | High | Medium |
| مهام منزلية أطفال | — | Top 3 | Medium | Low |
| ألعاب تعليمية | — | Top 5 | High | High |
| تطبيق أطفال بدون إعلانات | — | Top 3 | Medium | Low |
| تحفيز الأطفال على الدراسة | — | Top 3 | Medium | Low |
| مكافآت أطفال | — | Top 5 | Medium | Low |
| شجرة النمو | — | Top 1 | Low | Low |
| تتبع مهام الأطفال | — | Top 3 | Medium | Low |

### Secondary Keywords (English) — Track Monthly

| Keyword | Current Rank | Target Rank | Notes |
|---------|-------------|-------------|-------|
| kids learning app | — | Top 10 | High competition |
| parental control kids | — | Top 10 | Medium |
| educational games children | — | Top 15 | High competition |
| children homework tracker | — | Top 5 | Low competition |
| reward system for kids | — | Top 5 | Low competition |
| arabic learning app kids | — | Top 3 | Niche |

### French Keywords (Maghreb) — Track Monthly

| Keyword | Current Rank | Target Rank | Notes |
|---------|-------------|-------------|-------|
| application éducative enfants | — | Top 10 | Medium |
| contrôle parental enfants | — | Top 10 | Medium |
| jeux éducatifs enfants | — | Top 15 | High |
| apprentissage enfant maghreb | — | Top 3 | Low competition |

---

## 📈 Weekly Tracking Template

```
WEEK: [DD/MM/YYYY – DD/MM/YYYY]
Reported by: [Name]

═══════════════════════════════════
📥 INSTALLS
Organic installs:        _____ (vs. last week: _____)
Paid installs:           _____ (vs. last week: _____)
Total new installs:      _____ (vs. last week: _____)
Uninstalls:              _____
Net new users:           _____

═══════════════════════════════════
🏪 STORE LISTING
Store visits:            _____
Conversion rate:         _____%  (target: >25%)
Top traffic source:      _____

═══════════════════════════════════
📱 ENGAGEMENT
DAU:                     _____
MAU:                     _____
DAU/MAU:                 _____%  (target: >15%)
Avg session length:      _____ min
Sessions/user/day:       _____

═══════════════════════════════════
⭐ QUALITY
Rating:                  _____ ⭐
New reviews:             _____
Reviews responded:       _____  / _____  (100% target)
Crash rate:              _____%  (target: <0.5%)
ANR rate:                _____%  (target: <0.2%)

═══════════════════════════════════
🔑 KEYWORD RANKINGS (top 5)
1. تطبيق تعليمي للأطفال:   Rank _____
2. رقابة أبوية:             Rank _____
3. تعليم اطفال:             Rank _____
4. ألعاب تعليمية:           Rank _____
5. تطبيق أطفال بدون إعلانات: Rank _____

═══════════════════════════════════
💰 REVENUE (if applicable)
Premium subscriptions:   _____
Revenue:                 _____
MRR:                     _____

═══════════════════════════════════
🔴 ISSUES THIS WEEK
1.
2.
3.

🟢 WINS THIS WEEK
1.
2.
3.

📋 NEXT WEEK PRIORITIES
1.
2.
3.
```

---

## 📅 Monthly ASO Audit Checklist

```
MONTH: [Month Year]

STORE LISTING REVIEW:
□ Refresh screenshots if CTR < 20%
□ Test new feature graphic if CTR declining
□ Update short description with trending keywords
□ Check competitor listings for new opportunities
□ Review which screenshots have highest engagement

KEYWORD REVIEW:
□ Export full keyword ranking report
□ Identify top 5 ranking improvements
□ Identify top 5 ranking drops — investigate
□ Add new keywords discovered from user reviews
□ Remove underperforming keywords from metadata

COMPETITOR ANALYSIS:
□ Check top 3 competitors' new screenshots
□ Review competitor descriptions for new keywords
□ Check competitor ratings vs. ours
□ Note any new competitor features worth watching

TECHNICAL ASO:
□ Check Android vitals (crashes, ANRs, battery, startup)
□ Verify app size is optimized
□ Check update frequency (aim for at least 1/month)
□ Review Play Console alerts and badges

REVIEW ANALYSIS:
□ Categorize reviews by theme (feature requests, bugs, praise)
□ Identify top 3 feature requests from users
□ Share insights with product team
□ Celebrate positive review themes on social media
```

---

## 🏆 Quarterly Business Review (QBR) Metrics

| KPI | Q1 2026 | Q2 2026 | Q3 2026 | Q4 2026 |
|-----|---------|---------|---------|---------|
| Total Installs (cumulative) | — | 10,000 | 35,000 | 80,000 |
| MAU | — | 4,000 | 18,000 | 45,000 |
| App Rating | — | 4.5+ | 4.6+ | 4.7+ |
| Organic % | — | 35% | 50% | 65% |
| D30 Retention | — | 15% | 20% | 25% |
| Countries (organic top) | — | SA, UAE, EG | +DZ, MA | +TR |

---

## 🛠 Tools & Data Sources

| Tool | Purpose | Cost |
|------|---------|------|
| Google Play Console | Primary store analytics | Free |
| Firebase Analytics | In-app behavior | Free |
| Google UAC Dashboard | Paid campaign metrics | Free |
| Crashlytics (Firebase) | Crash reporting | Free |
| AppFollow / Sensor Tower | Keyword tracking | $99/mo |
| Adjust / AppsFlyer | Attribution tracking | $200/mo |
| Meta Ads Manager | Facebook/Instagram campaigns | Free |

---

## 📊 A/B Test Results Tracker

### Ongoing Tests

| Test | Variant A | Variant B | Start Date | Status | Winner |
|------|-----------|-----------|------------|--------|--------|
| App Icon | Main purple icon | Tree-focus green icon | — | Pending | — |
| Screenshot Order | Growth tree first | Parent dashboard first | — | Pending | — |
| Feature Graphic | Main blue | Ramadan seasonal | — | Seasonal | — |

### Completed Tests

*(Will be filled in as tests complete)*

---

*Classify ASO Team | KPI Tracking Document v1.0 | April 2026*
