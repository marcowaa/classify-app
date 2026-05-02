# 📱 Classify Flutter — توثيق المشروع الكامل

**آخر تحديث:** 2026-03-05
**الحالة:** ✅ يبني بنجاح (0 errors, 0 warnings, 0 infos)
**الإصدار:** 1.0.0+1

---

## 🔴 تعليمات للوكيل (AI Agent Prompt)

```
أنت تعمل على تطبيق Flutter اسمه Classify — منصة تعليمية للأطفال مع رقابة أبوية.

قبل أي تعديل:
1. اقرأ هذا الملف (PROJECT.md) كاملاً
2. اقرأ الملفات المتعلقة بمهمتك
3. لا تخمن — اقرأ الكود الفعلي
4. بعد أي تعديل شغّل: flutter analyze ثم flutter build apk --debug

القواعد:
- State Management: Riverpod 3 (Notifier pattern — ليس StateNotifier)
- Navigation: GoRouter 17 مع StatefulShellRoute
- Network: Dio مع AuthInterceptor يحقن JWT تلقائياً
- Models: json_serializable + freezed (يتطلب build_runner)
- الثيم: Material 3 مع خط Cairo عبر google_fonts
- اللغات: عربي (أساسي) + إنجليزي + برتغالي عبر flutter_localizations
- API URL: https://classi-fy.com/api/ (مُعرّف في lib/core/config/app_config.dart)
- صيغة API: { "success": true/false, "data": {...}, "error": "CODE", "message": "..." }
- الألعاب: HTML games تُحمّل في WebView من السيرفر
- التوكنات: تُخزّن في flutter_secure_storage (ليس SharedPreferences)

الأنماط المستخدمة:
- Provider: Riverpod 3 Notifier (ليس StateNotifier ولا ChangeNotifier)
  مثال: class AuthNotifier extends Notifier<AuthState> { ... }
         final provider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
- Repository Pattern: كل Repository يأخذ ApiClient ويُرجع ApiResponse<T>
- معمارية: Clean Architecture (data → domain → presentation)
```

---

## 📋 نظرة عامة

### ما هو Classify؟
منصة تعليمية للأطفال مع لوحة تحكم للوالدين. التطبيق يتصل بسيرفر موجود ومُشغّل (`https://classi-fy.com`).

### المستخدمون:
| النوع | الوصف | التوثيق |
|---|---|---|
| **والد (Parent)** | يسجّل حساب، يربط أطفاله، يُنشئ مهام، يُرسل هدايا، يراقب التقدم |
| **طفل (Child)** | يربط حسابه بالوالد عبر كود، يلعب ألعاب تعليمية، يحل مهام، يجمع نقاط |

### سير العمل:
```
┌─────────────────────────────────────────────────────────┐
│                     التطبيق (Flutter)                    │
│                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐   │
│  │ Splash   │ →  │ اختر     │ →  │ تسجيل دخول      │   │
│  │ Screen   │    │ والد/طفل │    │ parent / child   │   │
│  └──────────┘    └──────────┘    └──────────────────┘   │
│                                         │                │
│              ┌──────────────────────────┤                │
│              ↓                          ↓                │
│  ┌──────────────────┐    ┌──────────────────────┐       │
│  │  Parent Shell     │    │   Child Shell         │       │
│  │  ┌─────────────┐  │    │  ┌─────────────────┐  │       │
│  │  │ Dashboard   │  │    │  │ Games           │  │       │
│  │  │ Tasks       │  │    │  │ Tasks           │  │       │
│  │  │ Store       │  │    │  │ Gifts           │  │       │
│  │  │ Notif.      │  │    │  │ Progress        │  │       │
│  │  │ Profile     │  │    │  │ Profile         │  │       │
│  │  └─────────────┘  │    │  └─────────────────┘  │       │
│  └──────────────────┘    └──────────────────────┘       │
│              ↕ HTTP (Dio)        ↕ HTTP (Dio)            │
└─────────────────────────────────────────────────────────┘
                          ↕
              ┌──────────────────────┐
              │  Backend Server       │
              │  classi-fy.com        │
              │  Express.js + PG      │
              └──────────────────────┘
```

---

## 🏗️ هيكل المشروع التفصيلي

```
appsflutter/
│
├── lib/                                # كود Dart الرئيسي
│   ├── main.dart                       # نقطة البداية — ProviderScope + runApp
│   ├── app.dart                        # MaterialApp.router + Theme + Locale + Router
│   │
│   ├── core/                           # البنية التحتية
│   │   ├── config/
│   │   │   ├── app_config.dart         # ⭐ ثوابت: API URL, timeouts, OTP length
│   │   │   ├── routes.dart             # ⭐ GoRouter + RoutePaths + redirect logic
│   │   │   └── theme.dart              # ⭐ AppColors + AppTheme (light/dark)
│   │   │
│   │   ├── network/
│   │   │   ├── api_client.dart         # Dio wrapper: get/post/put/delete + error handling
│   │   │   ├── api_response.dart       # ApiResponse<T> — الغلاف الموحد للردود
│   │   │   └── auth_interceptor.dart   # يحقن JWT تلقائياً حسب نوع المسار
│   │   │
│   │   ├── storage/
│   │   │   ├── secure_storage.dart     # FlutterSecureStorage: parent/child/admin tokens
│   │   │   └── preferences.dart        # SharedPreferences: locale, theme, onboarding
│   │   │
│   │   └── l10n/
│   │       ├── app_ar.arb              # ترجمة عربية (الأساسية)
│   │       ├── app_en.arb              # ترجمة إنجليزية
│   │       └── generated/              # ملفات مولّدة تلقائياً (flutter gen-l10n)
│   │           └── app_localizations.dart
│   │
│   ├── data/                           # طبقة البيانات
│   │   ├── models/                     # Data classes (json_serializable)
│   │   │   ├── auth_models.dart        # LoginRequest, RegisterRequest, AuthResponse...
│   │   │   ├── child.dart + .g.dart    # Child model (id, name, points, birthday...)
│   │   │   ├── game.dart + .g.dart     # Game model (id, name, url, pointsReward...)
│   │   │   ├── task.dart + .g.dart     # Task model (question, answers, status...)
│   │   │   ├── gift.dart + .g.dart     # Gift model
│   │   │   ├── growth_tree.dart        # GrowthTree model (stage, progress)
│   │   │   ├── notification_model.dart # NotificationModel
│   │   │   ├── parent.dart + .g.dart   # Parent model
│   │   │   └── product.dart + .g.dart  # Store product model
│   │   │
│   │   └── repositories/              # اتصال بالـ API
│   │       ├── auth_repository.dart    # register, login, verifyOtp, logout, linkChild...
│   │       ├── child_repository.dart   # getProfile, getGames, completeGame, getTasks...
│   │       └── parent_repository.dart  # getChildren, createTask, getNotifications...
│   │
│   ├── domain/                         # طبقة المنطق
│   │   └── providers/                  # Riverpod providers
│   │       ├── auth_provider.dart      # ⭐ AuthNotifier + AuthState + all singletons
│   │       ├── child_provider.dart     # child-specific data providers
│   │       ├── parent_provider.dart    # parent-specific data providers
│   │       ├── locale_provider.dart    # اللغة (ar/en/pt)
│   │       └── theme_provider.dart     # الثيم (light/dark/system)
│   │
│   └── presentation/                   # طبقة العرض
│       ├── screens/
│       │   ├── splash_screen.dart      # شاشة التحميل الأولية
│       │   │
│       │   ├── auth/                   # شاشات المصادقة
│       │   │   ├── account_type_screen.dart   # اختيار: والد أم طفل
│       │   │   ├── parent_auth_screen.dart     # تسجيل/دخول الوالد
│       │   │   ├── otp_screen.dart             # إدخال رمز OTP (6 أرقام)
│       │   │   ├── forgot_password_screen.dart # نسيت كلمة المرور
│       │   │   ├── child_link_screen.dart      # ربط الطفل بكود الوالد
│       │   │   └── child_pin_login_screen.dart # دخول الطفل بـ PIN (4 أرقام)
│       │   │
│       │   ├── parent/                 # شاشات الوالد (5 tabs)
│       │   │   ├── parent_shell.dart          # Bottom navigation wrapper
│       │   │   ├── dashboard_screen.dart      # لوحة التحكم + إحصائيات + أطفال
│       │   │   ├── tasks_screen.dart          # إدارة المهام لكل طفل
│       │   │   ├── store_screen.dart          # متجر الهدايا (قريباً)
│       │   │   ├── notifications_screen.dart  # الإشعارات
│       │   │   └── profile_screen.dart        # الملف الشخصي + إعدادات
│       │   │
│       │   └── child/                  # شاشات الطفل (5 tabs + game webview)
│       │       ├── child_shell.dart            # Bottom navigation wrapper
│       │       ├── games_screen.dart           # قائمة الألعاب التعليمية
│       │       ├── game_webview_screen.dart    # ⭐ تشغيل اللعبة في WebView
│       │       ├── child_tasks_screen.dart     # مهام الطفل
│       │       ├── gifts_screen.dart           # هدايا الطفل
│       │       ├── progress_screen.dart        # شجرة النمو + التقدم
│       │       └── child_profile_screen.dart   # ملف الطفل الشخصي
│       │
│       └── widgets/                    # عناصر مشتركة
│           └── common_widgets.dart     # EmptyState, ErrorState, LoadingState
│
├── android/                            # إعدادات Android
│   ├── app/
│   │   ├── build.gradle.kts           # ⭐ applicationId, minSdk, signing
│   │   └── src/main/
│   │       └── AndroidManifest.xml    # ⭐ اسم التطبيق + صلاحيات
│   ├── build.gradle                   # Gradle root config
│   └── gradle/                        # Gradle wrapper
│
├── ios/                                # إعدادات iOS
│   └── Runner/                        # Xcode project
│
├── assets/                             # ملفات ثابتة
│   ├── images/                        # صور التطبيق
│   └── icons/                         # أيقونات
│
├── test/                               # اختبارات
│
├── pubspec.yaml                        # ⭐ المكتبات + الإصدارات
├── l10n.yaml                           # إعدادات الترجمة
├── analysis_options.yaml               # قواعد lint
├── flutter_launcher_icons.yaml         # إعدادات أيقونة التطبيق
├── flutter_native_splash.yaml          # إعدادات شاشة البداية
├── BUILD_GUIDE.md                      # دليل البناء خطوة بخطوة
└── PROJECT.md                          # هذا الملف — التوثيق الكامل
```

---

## ⚙️ التقنيات والمكتبات

### Runtime Stack
| التقنية | الإصدار | الاستخدام |
|---|---|---|
| Flutter | 3.41.3 | Framework |
| Dart | 3.11.1 | Language |
| flutter_riverpod | 3.2.1 | State Management (Notifier pattern) |
| go_router | 17.1.0 | Navigation + auth redirect |
| dio | 5.7.0 | HTTP client |
| flutter_secure_storage | 10.0.0 | JWT token storage |
| shared_preferences | 2.3.5 | Settings (locale, theme) |
| webview_flutter | 4.10.0 | HTML games in WebView |
| google_fonts | 8.0.2 | Cairo font (Arabic) |
| pin_code_fields | 9.1.0 | OTP + PIN input (MaterialPinField) |
| firebase_core | 4.5.0 | Firebase initialization |
| firebase_messaging | 16.1.2 | Push notifications |
| flutter_local_notifications | 20.1.0 | Local notifications |
| cached_network_image | 3.4.1 | Image caching |
| fl_chart | 1.1.1 | Charts |
| qr_flutter | 4.1.0 | QR code generation |
| mobile_scanner | 7.2.0 | QR code scanning |
| connectivity_plus | 7.0.0 | Network status |
| local_auth | 3.0.1 | Biometric auth |
| image_picker | 1.1.2 | Camera/gallery |
| image_cropper | 11.0.0 | Image cropping |

### Dev Dependencies (build-time only)
| التقنية | الاستخدام |
|---|---|
| build_runner | Code generation orchestrator |
| json_serializable | Model → JSON (generates .g.dart) |
| freezed | Immutable models (generates .freezed.dart) |
| riverpod_generator | Provider generation |
| mockito | Testing mocks |

---

## 🔌 واجهة API الكاملة

### الاتصال بالسيرفر
```
Base URL: https://classi-fy.com/api/
Auth: Bearer JWT token (يُحقن تلقائياً عبر AuthInterceptor)
Format: JSON
Response: { "success": true/false, "data": {...}, "error": "CODE", "message": "..." }
```

### نقاط النهاية (Endpoints)

#### المصادقة (auth_repository.dart)
| Method | Path | الوصف |
|---|---|---|
| POST | `/auth/register` | تسجيل والد جديد |
| POST | `/auth/login` | تسجيل دخول الوالد |
| POST | `/auth/request-otp` | طلب رمز OTP |
| POST | `/auth/verify-otp` | التحقق من OTP |
| POST | `/auth/logout` | تسجيل خروج |
| POST | `/auth/forgot-password` | نسيت كلمة المرور |
| GET | `/auth/me` | الملف الشخصي للوالد |
| POST | `/auth/child-link` | ربط طفل بكود الوالد |
| POST | `/auth/child-pin-login` | دخول الطفل بـ PIN |
| GET | `/auth/children` | قائمة أطفال الوالد (للربط) |

#### الطفل (child_repository.dart)
| Method | Path | الوصف |
|---|---|---|
| GET | `/child/profile` | ملف الطفل |
| PUT | `/child/profile` | تحديث ملف الطفل |
| GET | `/child/games` | قائمة الألعاب |
| POST | `/child/complete-game` | إكمال لعبة + نقاط |
| GET | `/child/tasks` | مهام الطفل |
| POST | `/child/tasks/:id/answer` | إرسال إجابة |
| GET | `/child/points` | نقاط الطفل |
| GET | `/child/gifts` | هدايا الطفل |
| GET | `/child/growth-tree` | شجرة النمو |
| GET | `/child/notifications` | إشعارات الطفل |

#### الوالد (parent_repository.dart)
| Method | Path | الوصف |
|---|---|---|
| GET | `/family/children` | قائمة الأطفال المرتبطين |
| POST | `/family/children` | إضافة طفل |
| PUT | `/family/children/:id` | تحديث طفل |
| DELETE | `/family/children/:id` | حذف طفل |
| GET | `/parent/tasks` | مهام الوالد |
| POST | `/parent/tasks` | إنشاء مهمة |
| DELETE | `/parent/tasks/:id` | حذف مهمة |
| GET | `/notifications` | الإشعارات |
| PUT | `/notifications/:id` | تعليم كمقروء |
| DELETE | `/notifications/:id` | حذف إشعار |
| PUT | `/parent/profile` | تحديث الملف الشخصي |
| GET | `/parent/wallet` | المحفظة |
| POST | `/gifts` | إرسال هدية |
| GET | `/gifts/:childId` | هدايا طفل محدد |
| GET | `/parent/dashboard-stats` | إحصائيات اللوحة |

---

## 🎨 نظام التصميم

### الألوان (AppColors)
```dart
// ألوان أساسية
primary:        #6B4D9D  (بنفسجي)
primaryLight:   #8B6FBF
primaryDark:    #4A3470
secondary:      #F59E0B  (ذهبي)

// ألوان الحالات
success:        #10B981  (أخضر)
error:          #EF4444  (أحمر)
warning:        #F59E0B  (برتقالي)
info:           #3B82F6  (أزرق)

// ألوان tabs الطفل
childGames:     #8B5CF6  (بنفسجي فاتح)
childTasks:     #3B82F6  (أزرق)
childGifts:     #EC4899  (وردي)
childProgress:  #F59E0B  (ذهبي)
childProfile:   #10B981  (أخضر)

// خلفيات
background:     #F8FAFC
surface:        #FFFFFF
textPrimary:    #1E293B
textSecondary:  #64748B
textHint:       #94A3B8
```

### الخط
**Cairo** — يُحمّل ديناميكياً عبر `google_fonts` (لا يوجد ملفات خطوط مُجمّعة).

### الثيم
- Material 3 (`useMaterial3: true`)
- Light mode + Dark mode
- `ThemeMode` يُدار عبر `themeModeProvider` (Riverpod)

---

## 🔐 نظام المصادقة

### تدفق المصادقة
```
┌──────────────────────────────────────────────────────────┐
│                    Splash Screen                          │
│         checkAuthStatus() → يفحص التوكنات المخزنة        │
│                        │                                  │
│          ┌─────────────┼─────────────┐                   │
│          ↓             ↓             ↓                   │
│     لا يوجد       parent_token   child_token             │
│     توكن          موجود          موجود                   │
│          ↓             ↓             ↓                   │
│     AccountType   Parent          Child                  │
│     Screen        Dashboard       Games                  │
└──────────────────────────────────────────────────────────┘
```

### تخزين التوكنات
```dart
// في SecureStorageService (flutter_secure_storage):
parent_token  → JWT للوالد
child_token   → JWT للطفل
admin_token   → JWT للأدمن
active_user_type → "parent" | "child"
```

### حقن التوكن (AuthInterceptor)
```
المسار يبدأ بـ /child  → يُحقن child_token (أو parent_token fallback)
المسار يبدأ بـ /admin  → يُحقن admin_token (أو parent_token fallback)
أي مسار آخر          → يُحقن parent_token (أو child_token fallback)
```

### دخول الطفل
1. **ربط جديد:** الطفل يُدخل كود الوالد الفريد → `POST /auth/child-link`
2. **تسجيل دخول:** الطفل يختار اسمه + يُدخل PIN (4 أرقام) → `POST /auth/child-pin-login`

### 2FA (المصادقة الثنائية)
- إذا `twoFAEnabled == true` في رد تسجيل الدخول → التوجيه لشاشة OTP
- الوالد يُدخل 6 أرقام → `POST /auth/verify-otp`
- بعد النجاح يُخزّن التوكن ويدخل

---

## 🎮 نظام الألعاب

### كيف تعمل الألعاب
```
1. GET /api/child/games → يجلب قائمة الألعاب
2. اللعبة = صفحة HTML على السيرفر (game.url)
3. التطبيق يفتح WebView ← يُحمّل URL اللعبة
4. عند الانتهاء: POST /api/child/complete-game { gameId, score }
5. السيرفر يُرجع النقاط المكتسبة
```

### بنية اللعبة
```dart
Game {
  id, name, nameAr,           // الاسم بالعربي والإنجليزي
  url,                          // رابط اللعبة على السيرفر
  imageUrl,                     // صورة اللعبة
  pointsReward,                 // النقاط عند الإكمال
  category, minAge, maxAge,     // التصنيف والعمر
}
```

### شاشة اللعبة (GameWebViewScreen)
- تُحمّل اللعبة في `WebView` بملء الشاشة
- تعرض `LinearProgressIndicator` أثناء التحميل
- زر رجوع مع تأكيد

---

## 🧭 نظام التنقل (Routing)

### المسارات
```
/                           → SplashScreen
/account-type               → AccountTypeScreen (اختيار والد/طفل)
/parent-auth                → ParentAuthScreen (تسجيل/دخول)
/otp                        → OtpScreen (extras: email, parentId)
/forgot-password            → ForgotPasswordScreen
/child-link                 → ChildLinkScreen
/child-pin-login            → ChildPinLoginScreen (extras: childId, childName)

/parent/dashboard           → ParentDashboardScreen  ─┐
/parent/tasks               → ParentTasksScreen       │
/parent/store               → ParentStoreScreen       ├─ ParentShell (bottom nav)
/parent/notifications       → ParentNotificationsScreen│
/parent/profile             → ParentProfileScreen    ─┘

/child/games                → ChildGamesScreen     ─┐
/child/tasks                → ChildTasksScreen      │
/child/gifts                → ChildGiftsScreen      ├─ ChildShell (bottom nav)
/child/progress             → ChildProgressScreen   │
/child/profile              → ChildProfileScreen   ─┘

/child/game/:gameId         → GameWebViewScreen (خارج الـ shell — ملء الشاشة)
```

### Auth Redirect Logic
```dart
// في routerProvider:
if (!isLoggedIn && !isAuthRoute) → redirect to /account-type
if (isLoggedIn && isAuthRoute) → redirect to dashboard (parent/child)
```

---

## 🌍 نظام الترجمة

### اللغات المدعومة
| اللغة | ملف ARB | الحالة |
|---|---|---|
| العربية | `lib/core/l10n/app_ar.arb` | ✅ أساسية (template) |
| الإنجليزية | `lib/core/l10n/app_en.arb` | ✅ مدعومة |
| البرتغالية | (يُضاف) `app_pt.arb` | ⚠️ يحتاج إنشاء |

### كيفية الاستخدام
```dart
// في أي Widget:
final l10n = AppLocalizations.of(context)!;
Text(l10n.welcome)
Text(l10n.noTasks)
```

### إضافة ترجمة جديدة
```
1. أضف المفتاح في app_ar.arb
2. أضف المفتاح في app_en.arb
3. شغّل: flutter gen-l10n
```

### إعدادات l10n.yaml
```yaml
arb-dir: lib/core/l10n
template-arb-file: app_ar.arb
output-localization-file: app_localizations.dart
output-dir: lib/core/l10n/generated
```

---

## 📦 نماذج البيانات (Models)

### Child
```dart
Child {
  String id, name
  int totalPoints
  String? avatarUrl, pin, bio, shareCode, coverImageUrl
  String? shippingAddress, schoolName, academicGrade, governorate
  DateTime? birthday, createdAt
  List<String>? interests
  bool profilePublic, privacyAccepted
  // computed:
  bool hasPin     // pin != null && pin.isNotEmpty
  int age         // حساب العمر من birthday
}
```

### Game
```dart
Game {
  String id, name, url
  String? nameAr, description, descriptionAr, imageUrl, category
  int pointsReward, sortOrder
  int? minAge, maxAge
  bool isActive
  // methods:
  String displayName(locale)         // يُرجع nameAr للعربي أو name
  String displayDescription(locale)  // يُرجع descriptionAr للعربي أو description
}
```

### Task
```dart
Task {
  String id, question
  String? parentId, childId, imageUrl, status, childAnswer, correctAnswer
  String? subjectId, subjectName
  int points
  int? difficulty
  List<TaskAnswer>? answers
  DateTime? createdAt, completedAt
  // status values: "pending" | "completed" | "failed"
}
```

### AuthResponse
```dart
AuthResponse {
  String token, userId
  String? uniqueCode, name, email
  bool? hasPin, twoFAEnabled
}
```

---

## 🔧 Riverpod Providers

### Singleton Providers
```dart
secureStorageProvider    → SecureStorageService (FlutterSecureStorage)
preferencesProvider      → PreferencesService (SharedPreferences)
authInterceptorProvider  → AuthInterceptor (Dio interceptor)
apiClientProvider        → ApiClient (Dio wrapper)
```

### Repository Providers
```dart
authRepositoryProvider   → AuthRepository
parentRepositoryProvider → ParentRepository
childRepositoryProvider  → ChildRepository
```

### State Providers
```dart
authStateProvider        → NotifierProvider<AuthNotifier, AuthState>
localeProvider           → NotifierProvider<LocaleNotifier, Locale>
themeModeProvider        → NotifierProvider<ThemeModeNotifier, ThemeMode>
routerProvider           → Provider<GoRouter>
```

### Data Providers (في child_provider.dart و parent_provider.dart)
```dart
// Child:
childProfileProvider     → FutureProvider<Child>
childGamesProvider       → FutureProvider<List<Game>>
childTasksProvider       → FutureProvider<List<Task>>
childGiftsProvider       → FutureProvider<List<Gift>>
childPointsProvider      → FutureProvider<int>
childGrowthTreeProvider  → FutureProvider<GrowthTree>

// Parent:
childrenListProvider          → FutureProvider<List<Child>>
parentTasksProvider(childId)  → FutureProvider.family<List<Task>, String>
parentNotificationsProvider   → FutureProvider<List<NotificationModel>>
parentDashboardStatsProvider  → FutureProvider<Map<String, dynamic>>
```

---

## 🛠️ أوامر البناء والتطوير

### الإعداد الأولي (مرة واحدة)
```bash
cd appsflutter
flutter pub get                                            # تنزيل المكتبات
dart run build_runner build --delete-conflicting-outputs   # توليد .g.dart + .freezed.dart
flutter gen-l10n                                           # توليد ملفات الترجمة
```

### التطوير اليومي
```bash
flutter analyze              # فحص الأخطاء (يجب أن يكون 0 issues)
flutter run                  # تشغيل على الجهاز/المحاكي
flutter run --release        # تشغيل بوضع الإنتاج
```

### البناء
```bash
flutter build apk --debug    # APK تجريبي
flutter build apk --release  # APK إنتاجي
flutter build appbundle      # AAB لـ Google Play
flutter build ios --release  # iOS (يحتاج Mac)
```

### بعد تعديل Models أو Providers
```bash
dart run build_runner build --delete-conflicting-outputs
```

### بعد تعديل ملفات الترجمة (.arb)
```bash
flutter gen-l10n
```

### تنظيف كامل
```bash
flutter clean
flutter pub get
dart run build_runner build --delete-conflicting-outputs
```

---

## 📱 إعدادات Android

### build.gradle.kts
```
applicationId: com.classify.classify_flutter
namespace:     com.classify.classify_flutter
compileSdk:    flutter.compileSdkVersion
minSdk:        flutter.minSdkVersion
targetSdk:     flutter.targetSdkVersion
Java:          17
Core Library Desugaring: enabled (desugar_jdk_libs:2.1.4)
```

### AndroidManifest.xml — الصلاحيات
```xml
INTERNET                 ← اتصال بالسيرفر
CAMERA                   ← تصوير الملف الشخصي
VIBRATE                  ← إشعارات
RECEIVE_BOOT_COMPLETED   ← إشعارات بعد إعادة التشغيل
```

### إعدادات إضافية
```
android:label = "Classify"
android:usesCleartextTraffic = true   ← للتطوير المحلي
```

---

## ⚠️ ملاحظات وتحذيرات مهمة

### 1. ملفات يجب تجديدها (Generated Files)
الملفات التالية مُولّدة تلقائياً — **لا تعدّلها يدوياً**:
- `*.g.dart` — من json_serializable
- `*.freezed.dart` — من freezed
- `lib/core/l10n/generated/*` — من flutter gen-l10n

### 2. التوكنات والأمان
- التوكنات تُخزّن في `flutter_secure_storage` (Keychain في iOS, EncryptedSharedPreferences في Android)
- لا تُخزّن أبداً في `SharedPreferences`
- `AuthInterceptor` يحقن التوكن تلقائياً — لا تمرر header يدوياً

### 3. pin_code_fields v9 API
الإصدار 9 غيّر الأسماء:
```dart
// ❌ قديم:
PinCodeTextField, PinTheme, AnimationType, PinCodeFieldShape
// ✅ جديد:
MaterialPinField, MaterialPinTheme, MaterialPinAnimation, MaterialPinShape
```

### 4. Riverpod v3 Pattern
```dart
// ❌ خطأ (v2 pattern):
class MyNotifier extends StateNotifier<MyState> { ... }
final provider = StateNotifierProvider<MyNotifier, MyState>((ref) => ...);

// ✅ صح (v3 pattern):
class MyNotifier extends Notifier<MyState> {
  @override
  MyState build() => MyState();
}
final provider = NotifierProvider<MyNotifier, MyState>(MyNotifier.new);
```

### 5. Firebase (غير مفعّل حالياً)
Firebase مُضاف في `pubspec.yaml` لكن **لم يُهيّأ بعد**. لتفعيله:
1. أنشئ مشروع في Firebase Console
2. أضف `google-services.json` في `android/app/`
3. أضف `GoogleService-Info.plist` في `ios/Runner/`
4. أضف `Firebase.initializeApp()` في `main.dart`

### 6. المتجر (Store)
شاشة المتجر (`store_screen.dart`) هي placeholder تعرض "قريباً". المنطق غير مُنفّذ بعد.

---

## 🗂️ خريطة الملفات حسب المهمة

### عاوز تغيّر رابط السيرفر؟
→ `lib/core/config/app_config.dart` — سطر 6 (`baseUrl`)

### عاوز تضيف شاشة جديدة؟
1. أنشئ الملف في `lib/presentation/screens/[parent|child]/`
2. أضف المسار في `lib/core/config/routes.dart` (RoutePaths + GoRoute)
3. لو محتاج بيانات: أضف method في Repository + Provider

### عاوز تضيف model جديد؟
1. أنشئ الملف في `lib/data/models/`
2. أضف `@JsonSerializable()` + `part 'filename.g.dart'`
3. شغّل: `dart run build_runner build --delete-conflicting-outputs`

### عاوز تضيف endpoint جديد؟
1. أضف الـ method في الـ Repository المناسب
2. أنشئ/عدّل Provider في `lib/domain/providers/`
3. استخدم `ref.watch(provider)` في الشاشة

### عاوز تضيف ترجمة؟
1. أضف المفتاح في `lib/core/l10n/app_ar.arb` و `app_en.arb`
2. شغّل: `flutter gen-l10n`
3. استخدم: `AppLocalizations.of(context)!.myKey`

### عاوز تغيّر الألوان؟
→ `lib/core/config/theme.dart` — class `AppColors`

### عاوز تغيّر اسم التطبيق؟
→ Android: `android/app/src/main/AndroidManifest.xml` → `android:label`
→ iOS: `ios/Runner/Info.plist` → `CFBundleDisplayName`

### عاوز تغيّر أيقونة التطبيق؟
→ حط صورة 1024x1024 في `assets/icons/app_icon.png`
→ شغّل: `dart run flutter_launcher_icons`

---

## 🔄 العلاقة بين المشروع الأصلي والـ Flutter

```
classiv3-main/                    ← المشروع الأصلي (لا تعدّله)
├── server/                       ← Backend (Express.js) — السيرفر المُشغّل
├── client/                       ← Frontend (React + Vite) — الموقع
├── shared/schema.ts              ← قاعدة البيانات (Drizzle ORM)
└── appsflutter/                  ← ⭐ هذا المجلد — تطبيق الموبايل
    └── (يتصل بالسيرفر عبر API فقط)
```

**السيرفر شغّال على:** `https://classi-fy.com`
**VPS:** Hostinger Ubuntu + Docker
**التطبيق يتصل بالسيرفر عبر:** Dio HTTP → `https://classi-fy.com/api/*`

**لا يوجد أي shared code بين Flutter و React** — التطبيق مستقل تماماً ويعتمد فقط على الـ API.

---

## ✅ قائمة التحقق قبل الإصدار

- [ ] `flutter analyze` → No issues found
- [ ] `flutter build apk --debug` → BUILD SUCCESSFUL
- [ ] تغيير `applicationId` لاسم فريد
- [ ] إضافة أيقونة التطبيق
- [ ] إضافة splash screen
- [ ] تفعيل Firebase (إشعارات)
- [ ] إنشاء مفتاح التوقيع (signing key)
- [ ] `flutter build appbundle --release` → BUILD SUCCESSFUL
- [ ] اختبار كل شاشة يدوياً
- [ ] رفع على Google Play Console

---

**الحالة النهائية:** المشروع جاهز للبناء والتطوير. كل البنية التحتية والشاشات والاتصال بالسيرفر مُنفّذ.
