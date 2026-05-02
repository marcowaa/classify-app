# خطة ترحيل Classify إلى Flutter — الخيار B: Hybrid
# Flutter Mobile + React Web (Admin + Public Pages)

**تاريخ الإنشاء:** 4 مارس 2026
**الحالة:** ⏳ في انتظار التأكيد
**المنهج:** Flutter للموبايل (Parent + Child) + الحفاظ على React Web (Admin + صفحات SEO العامة)

---

## 📊 ملخص تحليل المشروع الحالي

### الأرقام الفعلية (من الكود مباشرة)

| المكون | العدد |
|--------|-------|
| **صفحات Frontend** | 58 صفحة (.tsx) |
| **مكونات UI** | 140 مكون (.tsx) |
| **جداول قاعدة البيانات** | 149 جدول (schema.ts — 2,459 سطر) |
| **نقاط API (Endpoints)** | ~538 endpoint عبر 22 ملف route |
| **ملفات الترجمة** | 3 لغات (ar: 4,336 سطر, en: 4,337 سطر, pt) |
| **ألعاب HTML/iframe** | 7 ألعاب (math, memory, gem, snake-3d, cat, ice, chess) |
| **ألعاب React** | 2 (match3, memory) |
| **تبويبات Admin** | 34 تبويب |
| **خدمات Backend** | 10 خدمات |
| **ملفات Server** | 22 route + 10 services + middleware |

### البنية التقنية الحالية

```
Frontend: React 18.3 + Vite 6.4 + TypeScript 5.9
UI:       shadcn/ui (51 component) + Tailwind CSS + Framer Motion
State:    TanStack React Query v5
Router:   Wouter
i18n:     i18next (ar/en/pt) + RTL support
Auth:     JWT (localStorage) — parent/child/admin tokens
Backend:  Express.js 4.22 + Node 18+
ORM:      Drizzle 0.39 + PostgreSQL 15.7
Storage:  MinIO (S3-compatible)
Cache:    Redis
Payments: Stripe
Email:    Nodemailer (SMTP)
Push:     Web Push (VAPID) + FCM
Deploy:   Docker (5 containers) on Hostinger VPS
Mobile:   TWA (PWABuilder) — 2.76 MB AAB
Domain:   classi-fy.com
```

---

## 🏗️ الهيكل المستهدف (بعد الترحيل)

```
┌─────────────────────────────────────────────────────┐
│                    Backend (كما هو)                  │
│  Express.js + PostgreSQL + Redis + MinIO + Stripe   │
│  ≈538 API endpoints — لا تتغير                      │
└────────────────────┬────────────────────────────────┘
                     │ REST API
          ┌──────────┼──────────┐
          │          │          │
    ┌─────┴─────┐ ┌─┴────┐ ┌──┴──────────────┐
    │  Flutter   │ │ React│ │  React Web      │
    │  Mobile    │ │Admin │ │  Public Pages   │
    │  App       │ │Panel │ │  (SEO)          │
    │            │ │      │ │                 │
    │ • Parent   │ │ 34   │ │ • Home          │
    │ • Child    │ │ tabs │ │ • Privacy       │
    │ • Library  │ │      │ │ • Terms         │
    │ • School   │ │      │ │ • About         │
    │ • Teacher  │ │      │ │ • Contact       │
    │            │ │      │ │ • Download      │
    │ Android+iOS│ │ Web  │ │ • Legal pages   │
    └────────────┘ └──────┘ └─────────────────┘
```

---

## 🎯 ما الذي يُنقل وما الذي يبقى

### ✅ يُنقل إلى Flutter (Mobile App)

| القسم | الصفحات | الأولوية |
|-------|---------|----------|
| **تسجيل/دخول الوالد** | ParentAuth, OTPVerification, ForgotPassword | P0 |
| **ربط الطفل** | ChildLink (QR/code + PIN) | P0 |
| **لوحة الوالد** | ParentDashboard, Notifications, Settings | P0 |
| **إدارة الأطفال** | ChildrenList, ChildProfile, ChildGamesControl | P0 |
| **المهام** | ParentTasks, AssignTask, SubjectTasks, TaskMarketplace, TaskCart | P0 |
| **المتجر (والد)** | ParentStore, ParentInventory, Wallet | P1 |
| **الهدايا** | Gift sending/management | P1 |
| **ألعاب الطفل** | ChildGames (iframe → WebView) | P0 |
| **مهام الطفل** | ChildTasks, ChildProgress, ChildRewards | P0 |
| **متجر الطفل** | ChildStore, ChildGifts | P1 |
| **إشعارات الطفل** | ChildNotifications | P0 |
| **ملف الطفل** | ChildProfile, ChildDiscover, ChildSettings | P1 |
| **شجرة النمو** | GrowthTree + Watering | P1 |
| **التواصل الاجتماعي** | Posts, Friends, Follow | P2 |
| **المدارس** | SchoolLogin, SchoolDashboard, SchoolProfile | P2 |
| **المعلمين** | TeacherLogin, TeacherDashboard, TeacherProfile | P2 |
| **المكتبات** | LibraryLogin, LibraryDashboard, LibraryStore, LibraryProfile | P2 |
| **الجلسات المجدولة** | ScheduledSessions | P2 |
| **التسجيل بالمدارس** | SchoolEnrollment | P2 |

### 🔒 يبقى React Web (لا يُنقل)

| القسم | السبب |
|-------|-------|
| **Admin Dashboard (34 تبويب)** | الأدمن يستخدم الويب فقط — لا حاجة لموبايل |
| **صفحات SEO العامة** (Home, Privacy, Terms, About, Contact, Download, Legal, etc.) | تحتاج SSR/SSG لمحركات البحث |
| **لوحة إعلانات الأدمن** | ويب فقط |
| **تحليلات الأدمن** | ويب فقط |

---

## 📁 هيكل مشروع Flutter المقترح

```
classify_flutter/
├── android/
├── ios/
├── lib/
│   ├── main.dart
│   ├── app.dart                          # MaterialApp + Routes + Theme
│   │
│   ├── core/
│   │   ├── config/
│   │   │   ├── app_config.dart           # base URL, env vars
│   │   │   ├── routes.dart               # GoRouter route definitions
│   │   │   └── theme.dart                # AppTheme (light/dark, #6B4D9D)
│   │   ├── network/
│   │   │   ├── api_client.dart           # Dio HTTP client + interceptors
│   │   │   ├── api_response.dart         # ApiSuccess/ApiError models
│   │   │   └── auth_interceptor.dart     # JWT token injection
│   │   ├── storage/
│   │   │   ├── secure_storage.dart       # flutter_secure_storage (tokens)
│   │   │   └── preferences.dart          # SharedPreferences wrapper
│   │   ├── l10n/
│   │   │   ├── app_ar.arb                # Arabic translations (4,336 keys)
│   │   │   ├── app_en.arb                # English translations
│   │   │   ├── app_pt.arb                # Portuguese translations
│   │   │   └── l10n.dart                 # generated localization delegate
│   │   └── utils/
│   │       ├── validators.dart
│   │       ├── formatters.dart
│   │       └── extensions.dart
│   │
│   ├── data/
│   │   ├── models/                       # JSON → Dart models (from schema.ts)
│   │   │   ├── parent.dart
│   │   │   ├── child.dart
│   │   │   ├── task.dart
│   │   │   ├── product.dart
│   │   │   ├── order.dart
│   │   │   ├── notification.dart
│   │   │   ├── game.dart
│   │   │   ├── gift.dart
│   │   │   ├── growth_tree.dart
│   │   │   ├── school.dart
│   │   │   ├── teacher.dart
│   │   │   ├── library.dart
│   │   │   └── ...                       # ~30 model files
│   │   │
│   │   └── repositories/                 # API call logic
│   │       ├── auth_repository.dart       # 27 auth endpoints
│   │       ├── parent_repository.dart     # 87 parent endpoints
│   │       ├── child_repository.dart      # 80 child endpoints
│   │       ├── store_repository.dart      # 12 store endpoints
│   │       ├── library_repository.dart    # 35 library endpoints
│   │       ├── school_repository.dart     # 46 school endpoints
│   │       ├── teacher_repository.dart    # 37 teacher endpoints
│   │       ├── marketplace_repository.dart # 18 marketplace endpoints
│   │       ├── follow_repository.dart     # 13 follow endpoints
│   │       ├── referral_repository.dart   # 7 referral endpoints
│   │       ├── media_repository.dart      # 11 media endpoints
│   │       ├── ads_repository.dart        # 11 ads endpoints
│   │       ├── linking_repository.dart    # 8 linking endpoints
│   │       └── notification_repository.dart
│   │
│   ├── domain/
│   │   └── providers/                    # Riverpod state management
│   │       ├── auth_provider.dart
│   │       ├── parent_provider.dart
│   │       ├── child_provider.dart
│   │       ├── notification_provider.dart
│   │       ├── theme_provider.dart
│   │       ├── locale_provider.dart
│   │       └── ...
│   │
│   ├── presentation/
│   │   ├── widgets/                      # Reusable widgets
│   │   │   ├── common/
│   │   │   │   ├── app_button.dart
│   │   │   │   ├── app_text_field.dart
│   │   │   │   ├── loading_spinner.dart
│   │   │   │   ├── error_widget.dart
│   │   │   │   ├── empty_state.dart
│   │   │   │   ├── notification_bell.dart
│   │   │   │   └── image_cropper.dart
│   │   │   ├── parent/
│   │   │   │   ├── children_list.dart
│   │   │   │   ├── stats_cards.dart
│   │   │   │   ├── quick_actions.dart
│   │   │   │   └── child_games_control.dart
│   │   │   ├── child/
│   │   │   │   ├── bottom_nav.dart
│   │   │   │   ├── points_display.dart
│   │   │   │   ├── game_card.dart
│   │   │   │   ├── task_card.dart
│   │   │   │   └── gift_popup.dart
│   │   │   └── shared/
│   │   │       ├── otp_input.dart
│   │   │       ├── pin_entry.dart
│   │   │       ├── language_selector.dart
│   │   │       └── growth_tree.dart
│   │   │
│   │   └── screens/                      # Full screens
│   │       ├── auth/
│   │       │   ├── parent_auth_screen.dart
│   │       │   ├── child_link_screen.dart
│   │       │   ├── otp_screen.dart
│   │       │   └── forgot_password_screen.dart
│   │       ├── parent/
│   │       │   ├── dashboard_screen.dart
│   │       │   ├── store_screen.dart
│   │       │   ├── inventory_screen.dart
│   │       │   ├── wallet_screen.dart
│   │       │   ├── tasks_screen.dart
│   │       │   ├── assign_task_screen.dart
│   │       │   ├── notifications_screen.dart
│   │       │   ├── settings_screen.dart
│   │       │   ├── profile_screen.dart
│   │       │   └── task_marketplace_screen.dart
│   │       ├── child/
│   │       │   ├── games_screen.dart
│   │       │   ├── tasks_screen.dart
│   │       │   ├── store_screen.dart
│   │       │   ├── gifts_screen.dart
│   │       │   ├── progress_screen.dart
│   │       │   ├── rewards_screen.dart
│   │       │   ├── notifications_screen.dart
│   │       │   ├── profile_screen.dart
│   │       │   ├── settings_screen.dart
│   │       │   └── discover_screen.dart
│   │       ├── school/
│   │       │   ├── login_screen.dart
│   │       │   ├── dashboard_screen.dart
│   │       │   └── profile_screen.dart
│   │       ├── teacher/
│   │       │   ├── login_screen.dart
│   │       │   ├── dashboard_screen.dart
│   │       │   └── profile_screen.dart
│   │       └── library/
│   │           ├── login_screen.dart
│   │           ├── dashboard_screen.dart
│   │           ├── store_screen.dart
│   │           └── profile_screen.dart
│   │
│   └── games/
│       └── game_webview.dart             # WebView wrapper for HTML games
│
├── assets/
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── test/
│   ├── unit/
│   ├── widget/
│   └── integration/
│
├── pubspec.yaml
└── analysis_options.yaml
```

---

## 📦 مكتبات Flutter المقترحة

```yaml
dependencies:
  flutter:
    sdk: flutter
  flutter_localizations:
    sdk: flutter

  # State Management
  flutter_riverpod: ^2.6.1
  riverpod_annotation: ^2.6.1

  # Navigation
  go_router: ^14.8.1

  # Network
  dio: ^5.7.0
  retrofit: ^4.4.1               # Type-safe API client generation
  json_annotation: ^4.9.0

  # Storage
  flutter_secure_storage: ^9.2.4  # JWT tokens
  shared_preferences: ^2.3.5

  # UI
  flutter_svg: ^2.0.16
  cached_network_image: ^3.4.1
  shimmer: ^3.0.0
  animate_do: ^3.3.4              # Replaces Framer Motion
  flutter_staggered_grid_view: ^0.7.0

  # Push Notifications
  firebase_messaging: ^15.1.6
  flutter_local_notifications: ^18.0.1

  # WebView (for HTML games)
  webview_flutter: ^4.10.0

  # Camera & Image
  image_picker: ^1.1.2
  image_cropper: ^8.0.2

  # Charts (replaces Recharts)
  fl_chart: ^0.70.2

  # QR Code
  qr_flutter: ^4.1.0
  mobile_scanner: ^6.0.2          # QR scanner

  # Payments
  # Stripe handled via WebView or in-app-purchase

  # Biometric Auth
  local_auth: ^2.3.0

  # Connectivity
  connectivity_plus: ^6.1.1

  # Internationalization
  intl: ^0.19.0

dev_dependencies:
  build_runner: ^2.4.13
  json_serializable: ^6.8.0
  retrofit_generator: ^9.1.7
  riverpod_generator: ^2.6.4
  flutter_lints: ^5.0.0
  mockito: ^5.4.4
  flutter_test:
    sdk: flutter
  integration_test:
    sdk: flutter
```

---

## 🗓️ خطة التنفيذ — 6 مراحل (12 أسبوع / 3 أشهر)

### المرحلة 1: الأساس (الأسابيع 1-2) — Sprint 1

**الهدف:** مشروع Flutter يعمل مع auth كامل

| # | المهمة | التفاصيل | الأيام |
|---|--------|----------|--------|
| 1.1 | إنشاء مشروع Flutter | `flutter create classify_flutter` + هيكل الملفات | 0.5 |
| 1.2 | إعداد Theme | ألوان (#6B4D9D)، خطوط، Light/Dark mode | 0.5 |
| 1.3 | إعداد i18n | تحويل ar.json + en.json + pt.json → .arb + RTL support | 1 |
| 1.4 | API Client (Dio) | Base URL, interceptors, token refresh, error handling | 1 |
| 1.5 | Auth Models | Parent, Child, token types from schema.ts | 0.5 |
| 1.6 | Auth Repository | 27 endpoints (register, login, OTP, PIN, social, forgot) | 2 |
| 1.7 | Auth Screens | ParentAuth (login/register tabs), OTP, ForgotPassword | 2 |
| 1.8 | Token Management | Secure storage, auto-refresh, token type detection | 0.5 |
| 1.9 | Splash + Onboarding | SplashScreen with auto-login check | 0.5 |
| 1.10 | ChildLink Screen | QR scan + code entry + PIN login | 1.5 |

**المخرجات:** تطبيق يسجل دخول/خروج (والد + طفل) مع OTP و PIN

---

### المرحلة 2: Parent Core (الأسابيع 3-4) — Sprint 2

**الهدف:** لوحة الوالد كاملة مع إدارة الأطفال والمهام

| # | المهمة | التفاصيل | الأيام |
|---|--------|----------|--------|
| 2.1 | Parent Models | Children, Tasks, Products, Wallet, Notifications | 1 |
| 2.2 | Parent Repository | 87 endpoints | 2 |
| 2.3 | Parent Dashboard | Stats cards, children list, quick actions | 2 |
| 2.4 | Tasks Management | Create task, assign, view results, from template | 2 |
| 2.5 | Notifications | Notification list, unread badge, mark read | 1 |
| 2.6 | Settings & Profile | Update profile, change password, social links | 1 |
| 2.7 | Parent Navigation | Bottom tab bar (Dashboard, Tasks, Store, Notifications, Profile) | 0.5 |
| 2.8 | Pull-to-refresh | All lists with refresh indicator | 0.5 |

**المخرجات:** والد يدير أطفاله ومهامهم بالكامل

---

### المرحلة 3: Child Core (الأسابيع 5-6) — Sprint 3

**الهدف:** تجربة الطفل كاملة مع الألعاب

| # | المهمة | التفاصيل | الأيام |
|---|--------|----------|--------|
| 3.1 | Child Models | Tasks, Games, Gifts, Progress, GrowthTree | 1 |
| 3.2 | Child Repository | 80 endpoints | 2 |
| 3.3 | Games Screen | Game list + WebView wrapper for 7 HTML games | 2 |
| 3.4 | Tasks Screen | Pending tasks, submit answers, view results | 1.5 |
| 3.5 | Progress & Rewards | Points display, achievements, growth tree | 1.5 |
| 3.6 | Child Store | Browse products, request purchase from parent | 1 |
| 3.7 | Child Notifications | Notification list, gift popups, task alerts | 1 |
| 3.8 | Child Bottom Nav | games, tasks, gifts, progress, profile (5 tabs) | 0.5 |
| 3.9 | Child Profile | Profile view/edit, avatar, share code | 0.5 |

**المخرجات:** طفل يلعب ويحل مهام ويتقدم بالكامل

---

### المرحلة 4: Store + Payments (الأسابيع 7-8) — Sprint 4

**الهدف:** المتجر والمحفظة والهدايا

| # | المهمة | التفاصيل | الأيام |
|---|--------|----------|--------|
| 4.1 | Store Repository | 12 store + marketplace endpoints | 1 |
| 4.2 | Parent Store | Products grid, categories, cart checkout | 2 |
| 4.3 | Parent Wallet | Balance, deposits, payment methods, history | 1.5 |
| 4.4 | Parent Inventory | Owned products, assign to child | 1 |
| 4.5 | Gift System | Send gift, gift tracking, child gift popup | 1.5 |
| 4.6 | Stripe Integration | Payment WebView or in-app purchase bridge | 1.5 |
| 4.7 | Task Marketplace | Browse teacher tasks, buy, cart, favorites | 1.5 |

**المخرجات:** دورة شراء كاملة (والد يشتري → يهدي → طفل يستلم)

---

### المرحلة 5: Social + Extended (الأسابيع 9-10) — Sprint 5

**الهدف:** المدارس والمكتبات والتواصل الاجتماعي

| # | المهمة | التفاصيل | الأيام |
|---|--------|----------|--------|
| 5.1 | School Module | Login, dashboard, teachers, posts, polls, enrollment | 3 |
| 5.2 | Teacher Module | Login, dashboard, tasks, reviews, balance | 2 |
| 5.3 | Library Module | Login, dashboard, products, orders, balance | 2 |
| 5.4 | Social Features | Posts (child+parent), friends, follow, discover | 2 |
| 5.5 | Referral System | Code generation, sharing, tracking | 1 |

**المخرجات:** مؤسسات تعليمية + شبكة اجتماعية

---

### المرحلة 6: Polish + Release (الأسابيع 11-12) — Sprint 6

**الهدف:** جودة إنتاجية + رفع للمتاجر

| # | المهمة | التفاصيل | الأيام |
|---|--------|----------|--------|
| 6.1 | Push Notifications | Firebase Cloud Messaging + local notifications | 1.5 |
| 6.2 | Offline Support | Caching with Hive/Isar, offline indicators | 1 |
| 6.3 | Deep Links | Universal links (Android + iOS) for share codes | 1 |
| 6.4 | Performance | Lazy loading, image caching, list optimization | 1 |
| 6.5 | Testing | Unit tests + widget tests + integration tests | 2 |
| 6.6 | Ads System | Child ads, parent ads, watch tracking | 1 |
| 6.7 | Android Build | Signing, AAB, Play Store upload | 0.5 |
| 6.8 | iOS Build | Certificates, IPA, App Store upload | 1 |
| 6.9 | Final QA | Full regression test on both platforms | 1 |

**المخرجات:** تطبيق جاهز للإنتاج على Google Play + App Store

---

## ⚠️ تحديات تقنية وحلولها

### 1. الألعاب (7 HTML + 1 WASM + 2 React)

**المشكلة:** الألعاب مبنية بـ HTML/JS وتعمل في iframe
**الحل:** `webview_flutter` مع:  
- تحميل الألعاب من السيرفر (نفس URLs الحالية)
- JavaScript channels للتواصل (نقاط، إكمال اللعبة)
- Chess (Godot WASM) يحتاج COOP/COEP headers — يعمل في WebView

```dart
// مثال: Game WebView
WebViewWidget(
  controller: WebViewController()
    ..setJavaScriptMode(JavaScriptMode.unrestricted)
    ..loadRequest(Uri.parse('https://classi-fy.com/games/math-challenge.html'))
    ..addJavaScriptChannel('FlutterGameBridge', 
      onMessageReceived: (message) {
        // Handle game completion, score, etc.
        final data = jsonDecode(message.message);
        childRepository.completeGame(gameId: data['gameId'], score: data['score']);
      },
    ),
);
```

### 2. RTL + i18n

**المشكلة:** 4,336 مفتاح ترجمة + RTL كامل
**الحل:**  
- تحويل JSON → ARB (flutter_localizations)
- `Directionality` widget عند اللغة العربية
- Flutter يدعم RTL بشكل أصلي أفضل من الويب

### 3. Token Management

**المشكلة:** 3 أنواع tokens (parent, child, admin)
**الحل:**  
- `flutter_secure_storage` بدل localStorage
- `AuthInterceptor` في Dio يحقن Token تلقائياً حسب Route type
- Token refresh تلقائي عند 401

### 4. الإشعارات

**المشكلة:** SSE streams + Web Push + FCM
**الحل:**  
- Firebase Cloud Messaging (FCM) للموبايل (أصلي)
- لا حاجة لـ SSE في الموبايل — FCM يحل المشكلة
- `flutter_local_notifications` للإشعارات المحلية

### 5. الصور والميديا

**المشكلة:** MinIO uploads + image cropping + presigned URLs
**الحل:**  
- `image_picker` + `image_cropper` 
- Upload مباشر لـ MinIO via presigned URL
- `cached_network_image` للكاشينج

### 6. QR Code

**المشكلة:** QR generation + scanning لربط الطفل
**الحل:**  
- `qr_flutter` للعرض
- `mobile_scanner` للمسح (أسرع وأدق من الكاميرا في الويب)

---

## 🔄 خطة التعايش (React + Flutter يعملان معاً)

### أثناء التطوير:
1. **Backend واحد** — لا يتغير (Express.js يخدم الكل)
2. **React Web يبقى كما هو** — Admin + صفحات SEO
3. **Flutter يتصل بنفس API** — `https://classi-fy.com/api/*`
4. **TWA يُستبدل** — Flutter APK/AAB يحل محل TWA (2.76 MB → ~15-20 MB)

### بعد الإطلاق:
1. **Google Play:** Flutter AAB يحل محل TWA AAB
2. **App Store:** Flutter IPA (أخيراً!) — لا حاجة لـ Mac builds خارجية
3. **Web:** React يبقى للـ Admin + SEO pages + PWA fallback
4. **Deep Links:** `classi-fy.com` → يفتح Flutter app أو falls back للويب

---

## 📊 مقارنة قبل وبعد

| الجانب | الحالي (React TWA) | المستهدف (Flutter) |
|--------|--------------------|--------------------|
| **حجم APK** | 2.63 MB (TWA shell) | ~15-20 MB (native) |
| **أداء** | WebView rendering | Native rendering (60fps) |
| **iOS** | ❌ لا يوجد | ✅ native iOS app |
| **Offline** | Service Worker (محدود) | SQLite/Hive (كامل) |
| **Push** | Web Push (يحتاج browser) | FCM native (موثوق 100%) |
| **Camera/QR** | Browser API (بطيء) | Native (سريع ودقيق) |
| **Animations** | Framer Motion (JS thread) | Flutter engine (GPU) |
| **Deep Links** | PWA install required | Universal Links (Android + iOS) |
| **App Store** | TWA only (Google Play) | Google Play + App Store |
| **Admin** | ✅ React Web | ✅ يبقى React Web |
| **SEO** | ✅ SSR-ready | ✅ يبقى React Web |

---

## 💰 تقدير الجهد

| المرحلة | الأسابيع | المهام الرئيسية |
|---------|----------|-----------------|
| 1: الأساس + Auth | 2 | مشروع + theme + i18n + auth كامل |
| 2: Parent Core | 2 | Dashboard + tasks + notifications |
| 3: Child Core | 2 | Games + tasks + progress |
| 4: Store + Payments | 2 | Store + wallet + gifts + Stripe |
| 5: Social + Extended | 2 | Schools + teachers + libraries + social |
| 6: Polish + Release | 2 | Push + offline + testing + stores upload |
| **المجموع** | **12 أسبوع** | **~60 يوم عمل** |

---

## ✅ معايير النجاح (Definition of Done)

- [ ] تسجيل دخول/خروج يعمل (والد + طفل + PIN + OTP)
- [ ] لوحة الوالد تعرض كل البيانات بشكل صحيح
- [ ] الألعاب السبعة تعمل في WebView
- [ ] المهام تُرسل وتُحل وتُحسب النقاط
- [ ] المتجر والمحفظة يعملان
- [ ] الهدايا تُرسل وتُستلم
- [ ] الإشعارات تصل عبر FCM
- [ ] RTL يعمل بشكل كامل
- [ ] 3 لغات (ar/en/pt) تعمل
- [ ] Android APK/AAB مرفوع على Google Play
- [ ] iOS IPA مرفوع على App Store
- [ ] Admin Dashboard يعمل كما هو (React Web)
- [ ] صفحات SEO العامة تعمل كما هي

---

## 🚀 الخطوة التالية

**⏳ في انتظار تأكيدك للبدء في المرحلة 1**

عند التأكيد سأبدأ بـ:
1. إنشاء مشروع Flutter
2. إعداد الهيكل الأساسي
3. تحويل ملفات الترجمة
4. بناء API Client
5. تنفيذ شاشات Auth

---

**الحالة:** ⏳ في انتظار التأكيد
**آخر تحديث:** 4 مارس 2026
