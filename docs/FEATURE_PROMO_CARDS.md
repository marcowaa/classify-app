# Feature Promo Cards Map

This document defines the conversion-oriented feature cards shown to parent users.

## Goal
- Show random high-value feature cards during parent usage sessions.
- Clicking a card routes the parent to the relevant section.
- Mirror each card as a system notification when notification permission is granted.

## Feature List (Card -> Route)
- كن معلمًا وابدأ الربح -> /task-marketplace
- تحكم مالي كامل للأسرة -> /wallet
- نظام مهام يحفّز الانضباط -> /parent-tasks
- تقدم الطفل أمامك لحظة بلحظة -> /parent-dashboard
- كافئ الإنجاز بدل العقاب -> /parent-store
- لا تفوّت أي تحديث مهم -> /notifications
- تنظيم المواد بدون فوضى -> /subjects
- ربط الطفل في ثواني -> /child-link
- طلبات ومتجر في نفس النظام -> /parent-store
- ملف ولي الأمر باحتراف -> /parent-profile
- تعاون مع المدارس بسهولة -> /school/login
- فرص أكبر عبر المكتبات -> /library/login
- شبكة معلمين جاهزة -> /teacher/login
- إعدادات مرنة للأسرة -> /settings
- التعلم باللعب الحقيقي -> /child-games

## Trigger Behavior
- Random interval between 25s and 90s.
- Maximum 8 cards per browser session.
- Prioritizes cards with lower historical exposure.

## Storage Keys
- classify-feature-pulse-history
- classify-feature-pulse-session
