# 🌳 شجرة التنقل التفصيلية الكاملة - Classify App

> **تاريخ التحليل:** 19 مارس 2026 ✅  
> **الإصدار:** 4.0 (محدث شامل عميق جداً)  
> **المرجع الأساسي:** [DEEP-NAVIGATION-ANALYSIS.md](DEEP-NAVIGATION-ANALYSIS.md) 📖  
> **ملاحظة:** خريطة كاملة فعلية لـ 815 endpoint و 59 صفحة

---

## 📊 إحصائيات فعلية من الكود (موثقة)

| العنصر | العدد | التفاصيل |
|--------|-------|---------|
| **صفحات React (Frontend)** | 59 | موزعة على 7 فئات رئيسية |
| **نقاط نهاية API (Backend)** | 815 | موزعة على 25 ملف مسار |
| **مسارات الخادم (Route Files)** | 25 | منظمة حسب المجال والدور |
| **المسارات المحمية بالمصادقة** | 80+ | تحتاج JWT token |
| **مسارات عامة (Public)** | 35+ | متاحة بدون تحقق |
| **جداول قاعدة البيانات** | 169 | مع 120+ علاقة |
| **الخدمات (Services)** | 23 | معالجة منطق الأعمال |

---

## 🗺️ خريطة المسارات الكاملة

### 🔹 ملفات المسارات على الخادم (Server Routes)

```
server/routes/
├── auth.ts                           ← مسارات المصادقة الأساسية
│   ├── POST /api/auth/check-email
│   ├── POST /api/auth/register
│   ├── POST /api/auth/login
│   ├── POST /api/auth/request-otp
│   ├── POST /api/auth/verify-otp
│   └── POST /api/auth/logout
│
├── parent.ts                         ← جميع مسارات الوالد
│   ├── GET /api/parent/profile
│   ├── PUT /api/parent/profile
│   ├── GET /api/parent/children
│   ├── POST /api/parent/children
│   ├── PUT /api/parent/children/:id
│   ├── DELETE /api/parent/children/:id
│   ├── POST /api/parent/tasks
│   ├── GET /api/parent/tasks
│   ├── PUT /api/parent/tasks/:id
│   └── DELETE /api/parent/tasks/:id
│
├── child.ts                          ← جميع مسارات الطفل
│   ├── POST /api/child/link
│   ├── POST /api/child/login
│   ├── POST /api/child/logout
│   ├── GET /api/child/profile
│   ├── PUT /api/child/profile
│   ├── GET /api/child/games
│   ├── POST /api/child/complete-game
│   ├── GET /api/child/tasks
│   ├── POST /api/child/answer-task
│   ├── GET /api/child/gifts
│   ├── GET /api/child/progress
│   └── GET /api/child/notifications
│
├── admin.ts                          ← لوحة تحكم المعالج
│   ├── POST /api/admin/login
│   ├── GET /api/admin/dashboard
│   ├── GET /api/admin/users
│   ├── GET /api/admin/reports
│   └── POST /api/admin/actions
│
├── admin.settings.ts                 ← إعدادات النظام
├── admin-activity.ts                 ← السجل النشاط
├── admin-analytics.ts                ← التحليلات
├── admin-gifts.ts                    ← إدارة الهدايا
├── admin-notification-settings.ts    ← إعدادات الإشعارات
│
├── payments.ts                       ← معالجة الدفع
│   ├── POST /api/payments/checkout
│   ├── POST /api/payments/webhook
│   ├── GET /api/payments/history
│   └── POST /api/payments/refund
│
├── store.ts                          ← متجر المنتجات
│   ├── GET /api/store/products
│   ├── GET /api/store/products/:id
│   ├── POST /api/store/purchase
│   └── GET /api/store/orders
│
├── teacher.ts                        ← مسارات معلمين
│   └── /api/teacher/*
│
├── school.ts                         ← مسارات المدارس
│   └── /api/school/*
│
├── library.ts                        ← مسارات المكتبات
│   └── /api/library/*
│
├── marketplace.ts                    ← سوق المهام
├── referrals.ts                      ← نظام الإحالات
├── follow.ts                         ← نظام المتابعة
├── ads.ts                            ← إدارة الإعلانات
├── trusted-devices.ts                ← الأجهزة الموثوقة
├── parent-linking.ts                 ← ربط الوالد بالطفل
├── media-uploads.ts                  ← تحميل الوسائط
├── symbols.ts                        ← الرموز والأيقونات
└── middleware.ts                     ← دوال التحقق والتحقق
```

---

## 🚀 صفحات React (Frontend Routes)

```
client/src/pages/ (60+ صفحة)

📍 المسارات الرئيسية (Public)
├── /                           → Home.tsx
├── /download                   → DownloadApp.tsx
├── /privacy                    → Privacy.tsx
├── /terms                      → Terms.tsx
├── /privacy-policy             → PrivacyPolicy.tsx
├── /accessibility              → AccessibilityPolicy.tsx
├── /cookie-policy              → CookiePolicy.tsx
├── /refund-policy              → RefundPolicy.tsx
├── /acceptable-use             → AcceptableUse.tsx
├── /legal                      → LegalCenter.tsx
├── /about                      → AboutUs.tsx
├── /contact                    → ContactUs.tsx
└── /auth/oauth-callback        → OAuthCallback.tsx

🔐 مسارات المصادقة (Auth)
├── /parent-auth                → ParentAuth.tsx (تسجيل/دخول الوالد)
├── /child-link                 → ChildLink.tsx (ربط الطفل)
├── /otp                        → OTPVerification.tsx (التحقق من OTP)
├── /forgot-password            → ForgotPassword.tsx (استعادة كلمة المرور)
├── /admin                      → AdminAuth.tsx (تسجيل دخول المعالج)
├── /school/login               → SchoolLogin.tsx (تسجيل دخول المدرسة)
├── /teacher/login              → TeacherLogin.tsx (تسجيل دخول المعلم)
└── /library/login              → LibraryLogin.tsx (تسجيل دخول المكتبة)

👨‍💼 صفحات الوالد (Parent)
├── /parent-dashboard           → ParentDashboard.tsx
├── /parent-profile             → ParentProfile.tsx
├── /parent-tasks               → ParentTasks.tsx
├── /parent-store               → ParentStore.tsx
├── /parent-inventory           → ParentInventory.tsx
├── /assign-task                → AssignTask.tsx
└── /wallet                     → Wallet.tsx

👧 صفحات الطفل (Child)
├── /child-games                → ChildGames.tsx
├── /child-store                → ChildStore.tsx
├── /child-gifts                → ChildGifts.tsx
├── /child-tasks                → ChildTasks.tsx
├── /child-progress             → ChildProgress.tsx
├── /child-rewards              → ChildRewards.tsx
├── /child-profile              → ChildProfile.tsx
├── /child-public-profile/:code → ChildPublicProfile.tsx
├── /child-settings             → ChildSettings.tsx
├── /child-discover             → ChildDiscover.tsx
└── /child-notifications        → ChildNotifications.tsx

🎮 صفحات الألعاب (Games)
├── /trial-games                → TrialGames.tsx
├── /child-games                → ChildGames.tsx (مع wrapper)
├── /match3                     → Match3Page.tsx
└── /memory-match               → MemoryMatchPage.tsx

📚 صفحات المتجر والمهام (Marketplace)
├── /task-marketplace           → TaskMarketplace.tsx
├── /task-cart                  → TaskCart.tsx
├── /subject-tasks              → SubjectTasks.tsx
├── /subjects                   → Subjects.tsx
└── /library-store              → LibraryStore.tsx

📊 صفحات الإدارة (Admin)
├── /admin-dashboard            → AdminDashboard.tsx
└── /admin/purchases            → AdminPurchasesTab.tsx

🏫 صفحات المدرسة والمعلم (School & Teacher)
├── /school/dashboard           → SchoolDashboard.tsx
├── /school/:id                 → SchoolProfile.tsx
├── /teacher/dashboard          → TeacherDashboard.tsx
├── /teacher/:id                → TeacherProfile.tsx
└── /library/:id                → LibraryProfile.tsx

⚙️ صفحات النظام (System)
├── /settings                   → Settings.tsx
├── /notifications              → Notifications.tsx
└── /delete-account             → AccountDeletion.tsx

❓ صفحات أخرى
└── /* (غير موجودة)            → not-found.tsx
```

---

## 🔐 مسارات المصادقة API (Authentication Routes)

### 📌 المسارات الأساسية (Core Auth)

```javascript
// POST /api/auth/check-email
// غرض: التحقق من وجود بريد إلكتروني مسجل
// Body: { email: string }
// Response: { success: true, data: { exists: boolean } }

// POST /api/auth/register
// غرض: تسجيل حساب والد جديد
// Body: { 
//   email, password, name, phoneNumber?, gender, 
//   libraryReferralCode?, referralCode?, pin?, governorate? 
// }
// Response: { success: true, data: { parentId, email } }

// POST /api/auth/login
// غرض: تسجيل دخول الوالد
// Body: { email, password, deviceId?, phoneNumber? }
// Response: { 
//   success: true, 
//   data: { 
//     token, refreshToken, requiresOTP, parentId 
//   } 
// }

// POST /api/auth/request-otp
// غرض: طلب كود OTP
// Body: { method: 'email' | 'sms', destination: string }
// Response: { success: true, data: { expiresIn } }

// POST /api/auth/verify-otp
// غرض: التحقق من كود OTP
// Body: { code: string, destination: string, method: 'email' | 'sms' }
// Response: { success: true, data: { token, refreshToken } }

// POST /api/auth/logout
// غرض: تسجيل الخروج
// Headers: { Authorization: "Bearer token" }
// Response: { success: true }
```

---

## 👨‍💼 مسارات الوالد API (Parent Routes)

### 📌 إدارة الملف الشخصي

```javascript
// GET /api/parent/profile
// غرض: الحصول على ملف الوالد الشخصي
// Headers: { Authorization: "Bearer token" }
// Response: { success: true, data: { parent } }

// PUT /api/parent/profile
// غرض: تحديث الملف الشخصي
// Body: { name?, email?, phoneNumber?, avatar?, ... }
// Response: { success: true, data: { parent } }

// PUT /api/parent/profile/change-password
// غرض: تغيير كلمة المرور
// Body: { currentPassword, newPassword }
// Response: { success: true }

// DELETE /api/parent/profile
// غرض: حذف الحساب (مع جميع البيانات المرتبطة)
// Response: { success: true }
```

### 📌 إدارة الأطفال

```javascript
// GET /api/parent/children
// غرض: الحصول على قائمة الأطفال المرتبطين
// Response: { success: true, data: { children: [...] } }

// POST /api/parent/children
// غرض: إضافة طفل جديد
// Body: { name, age, gender, avatar?, ... }
// Response: { success: true, data: { childId, linkCode } }

// GET /api/parent/children/:id
// غرض: الحصول على تفاصيل طفل محدد
// Response: { success: true, data: { child } }

// PUT /api/parent/children/:id
// غرض: تحديث معلومات الطفل
// Body: { name?, age?, gender?, ... }
// Response: { success: true, data: { child } }

// DELETE /api/parent/children/:id
// غرض: حذف الطفل (مع جميع البيانات المرتبطة به)
// Response: { success: true }

// GET /api/parent/children/:id/progress
// غرض: الحصول على تقرير التقدم
// Response: { success: true, data: { progress } }

// GET /api/parent/children/:id/analytics
// غرض: الحصول على تحليلات الأداء
// Response: { success: true, data: { analytics } }
```

### 📌 إدارة المهام

```javascript
// POST /api/parent/tasks
// غرض: إنشاء مهمة جديدة
// Body: { title, description, reward, dueDate, childId, ... }
// Response: { success: true, data: { taskId } }

// GET /api/parent/tasks
// غرض: الحصول على جميع المهام
// Query: { childId?, status?, page? }
// Response: { success: true, data: { tasks } }

// GET /api/parent/tasks/:id
// غرض: الحصول على تفاصيل مهمة محددة
// Response: { success: true, data: { task } }

// PUT /api/parent/tasks/:id
// غرض: تحديث المهمة
// Body: { title?, description?, reward?, dueDate?, ... }
// Response: { success: true, data: { task } }

// DELETE /api/parent/tasks/:id
// غرض: حذف المهمة
// Response: { success: true }

// POST /api/parent/tasks/bulk-assign
// غرض: تعيين مهام متعددة للأطفال
// Body: { taskIds, childIds }
// Response: { success: true, data: { assigned: number } }
```

### 📌 المتجر والمحفظة

```javascript
// GET /api/parent/store/products
// غرض: الحصول على منتجات المتجر
// Response: { success: true, data: { products } }

// POST /api/parent/store/purchase
// غرض: شراء منتج
// Body: { productId, quantity }
// Response: { success: true, data: { orderId } }

// GET /api/parent/wallet
// غرض: الحصول على رصيد المحفظة
// Response: { success: true, data: { balance, currency } }

// POST /api/parent/wallet/deposit
// غرض: إضافة رصيد للمحفظة
// Body: { amount, method }
// Response: { success: true, data: { transactionId } }

// GET /api/parent/wallet/transactions
// غرض: الحصول على سجل المعاملات
// Response: { success: true, data: { transactions } }

// POST /api/parent/wallet/send-gift
// غرض: إرسال هدية مجانية للطفل
// Body: { childId, giftId }
// Response: { success: true, data: { giftId } }
```

---

## 👧 مسارات الطفل API (Child Routes)

### 📌 المصادقة والربط

```javascript
// POST /api/child/link
// غرض: ربط الطفل بالوالد باستخدام كود الربط
// Body: { linkCode }
// Response: { success: true, data: { childToken, childId } }

// POST /api/child/login
// غرض: تسجيل دخول الطفل برمز التحقق
// Body: { childId, verificationCode }
// Response: { success: true, data: { childToken } }

// POST /api/child/logout
// غرض: تسجيل خروج الطفل
// Headers: { Authorization: "Bearer childToken" }
// Response: { success: true }

// POST /api/child/login-request
// غرض: طلب تسجيل دخول (إشعار للوالد)
// Body: { deviceId, deviceName }
// Response: { success: true, data: { requestId } }
```

### 📌 الملف الشخصي والإعدادات

```javascript
// GET /api/child/profile
// غرض: الحصول على ملف الطفل
// Response: { success: true, data: { child } }

// PUT /api/child/profile
// غرض: تحديث الملف الشخصي
// Body: { name?, avatar?, bio?, ... }
// Response: { success: true, data: { child } }

// GET /api/child/settings
// غرض: الحصول على إعدادات الطفل
// Response: { success: true, data: { settings } }

// PUT /api/child/settings
// غرض: تحديث الإعدادات
// Body: { theme?, language?, notifications?, ... }
// Response: { success: true, data: { settings } }
```

### 📌 الألعاب والمهام

```javascript
// GET /api/child/games
// غرض: الحصول على قائمة الألعاب المتاحة
// Response: { success: true, data: { games } }

// POST /api/child/complete-game
// غرض: تسجيل إنجاز اللعبة
// Body: { gameId, score, duration, completedLevels? }
// Response: { success: true, data: { reward, achievement } }

// GET /api/child/games/history
// غرض: الحصول على سجل اللعب
// Response: { success: true, data: { history } }

// GET /api/child/tasks
// غرض: الحصول على المهام المعينة
// Query: { status?, page? }
// Response: { success: true, data: { tasks } }

// POST /api/child/answer-task
// غرض: إرسال إجابة للمهمة
// Body: { taskId, answer }
// Response: { success: true, data: { isCorrect, reward } }

// GET /api/child/progress
// غرض: الحصول على التقدم الكلي
// Response: { success: true, data: { xp, level, achievements } }
```

### 📌 الهدايا والمكافآت

```javascript
// GET /api/child/gifts
// غرض: الحصول على قائمة الهدايا
// Response: { success: true, data: { gifts } }

// GET /api/child/rewards
// غرض: الحصول على المكافآت المتاحة
// Response: { success: true, data: { rewards } }

// POST /api/child/redeem-reward
// غرض: استبدال مكافأة
// Body: { rewardId }
// Response: { success: true, data: { item } }

// GET /api/child/inventory
// غرض: الحصول على المخزون الشخصي
// Response: { success: true, data: { items } }
```

### 📌 الإشعارات والتفاعل الاجتماعي

```javascript
// GET /api/child/notifications
// غرض: الحصول على الإشعارات
// Response: { success: true, data: { notifications } }

// PUT /api/child/notifications/:id
// غرض: وضع علامة على الإشعار كمقروء
// Response: { success: true }

// GET /api/child/discover
// غرض: اكتشاف أطفال آخرين (للتفاعل الاجتماعي)
// Response: { success: true, data: { children } }

// POST /api/child/follow
// غرض: متابعة طفل آخر
// Body: { targetChildId }
// Response: { success: true }

// GET /api/child/posts
// غرض: الحصول على المنشورات الاجتماعية
// Response: { success: true, data: { posts } }

// POST /api/child/posts
// غرض: إنشاء منشور جديد
// Body: { content, image? }
// Response: { success: true, data: { postId } }
```

---

## 🏪 مسارات المتجر والدفع (Store & Payment Routes)

```javascript
// GET /api/store/products
// غرض: الحصول على جميع المنتجات
// Query: { category?, sort?, page? }
// Response: { success: true, data: { products } }

// GET /api/store/products/:id
// غرض: الحصول على تفاصيل منتج
// Response: { success: true, data: { product } }

// POST /api/payments/checkout
// غرض: بدء عملية الدفع
// Body: { items, paymentMethod }
// Response: { success: true, data: { sessionId, clientSecret } }

// POST /api/payments/webhook
// غرض: استقبال تحديثات Stripe
// Body: { type, data }
// Response: { success: true }

// GET /api/payments/history
// غرض: الحصول على سجل الدفعات
// Response: { success: true, data: { payments } }

// POST /api/payments/refund
// غرض: طلب استرجاع المبلغ
// Body: { orderId, reason }
// Response: { success: true, data: { refundId } }
```

---

## 📚 مسارات المتجر والمكتبات (Library & Marketplace Routes)

```javascript
// GET /api/library
// غرض: الحصول على قائمة المكتبات
// Response: { success: true, data: { libraries } }

// GET /api/library/:id
// غرض: الحصول على تفاصيل المكتبة
// Response: { success: true, data: { library } }

// GET /api/marketplace/tasks
// غرض: الحصول على سوق المهام
// Response: { success: true, data: { tasks } }

// GET /api/school/list
// غرض: الحصول على قائمة المدارس
// Response: { success: true, data: { schools } }

// GET /api/teacher/list
// غرض: الحصول على قائمة المعلمين
// Response: { success: true, data: { teachers } }
```

---

## ⚙️ مسارات الإدارة (Admin Routes)

```javascript
// POST /api/admin/login
// غرض: تسجيل دخول المعالج
// Body: { email, password }
// Response: { success: true, data: { token } }

// GET /api/admin/dashboard
// غرض: بيانات لوحة التحكم
// Response: { success: true, data: { stats } }

// GET /api/admin/users
// غرض: قائمة المستخدمين
// Query: { type?, search?, page? }
// Response: { success: true, data: { users } }

// GET /api/admin/reports
// غرض: التقارير الشاملة
// Response: { success: true, data: { reports } }

// POST /api/admin/actions
// غرض: تنفيذ إجراءات إدارية
// Body: { action, targetId, reason }
// Response: { success: true }
```

│   │   │
│   │   └── [Forgot Password Link]
│   │       └── 🔗 onClick → navigate("/forgot-password")
│   │
│   └── [Tab: Register] - تسجيل جديد
│       │
│       ├── 📝 FORM FIELDS
│       │   ├── [Input: Name]
│       │   │   └── placeholder: "الاسم الكامل"
│       │   ├── [Input: Email]
│       │   │   └── placeholder: "البريد الإلكتروني"
│       │   ├── [Input: Phone] (اختياري)
│       │   │   └── placeholder: "رقم الهاتف"
│       │   ├── [Input: Password]
│       │   │   └── type: password
│       │   └── [Input: Confirm Password]
│       │
│       └── [Submit Button] - "إنشاء حساب"
│           └── عند النجاح → navigate("/otp")
│
└── 📌 SMS VERIFICATION MODAL (عند توفر SMS)
    ├── [OTPMethodSelector]
    │   ├── [Email Option] - "عبر البريد"
    │   └── [SMS Option] - "عبر الرسائل النصية"
    ├── [Phone Input] - إدخال رقم الهاتف
    ├── [OTP Input] - إدخال كود التحقق (6 أرقام)
    ├── [Verify Button] - "تحقق"
    └── [Cancel Button] - "إلغاء" → navigate("/otp")

```

---

## 📱 صفحة OTP (OTP.tsx)

```

/otp
│
├── 📌 OTP FORM
│   ├── [OTP Input] - 6 خانات للكود
│   │   └── autoFocus: true
│   ├── [Verify Button] - "تحقق من الكود"
│   │   └── عند النجاح → navigate("/parent-dashboard")
│   ├── [Resend Button] - "إعادة إرسال الكود"
│   │   └── disabled لمدة 60 ثانية
│   └── [Timer] - العد التنازلي للإعادة
│
└── 📌 ERROR STATE
    └── [Error Message] - رسالة الخطأ

```

---

## 👧 صفحة ربط الطفل (ChildLink.tsx)

```

/child-link
│
├── 📌 HEADER
│   ├── [Back Button] - "← رجوع"
│   │   └── 🔗 onClick → navigate("/")
│   ├── [LanguageSelector]
│   └── [PWAInstallButton]
│
├── 📌 SAVED CHILDREN (الأطفال المحفوظين)
│   │ (يظهر إذا كان هناك جلسات محفوظة)
│   │
│   └── لكل طفل محفوظ:
│       ├── [Child Avatar] - دائرة ملونة
│       ├── [Child Name]
│       ├── [Quick Login Button] - "دخول سريع"
│       │   └── 🔗 quickLoginMutation → navigate("/child-games")
│       └── [Remove Button] - حذف من المحفوظين
│
├── 📌 STEP: WELCOME (الترحيب)
│   ├── [Welcome Animation] - رسوم متحركة
│   ├── [Start Button] - "هيا نبدأ!"
│   │   └── 🔗 onClick → setStep("name_entry")
│   └── [Add New Child] - "إضافة طفل جديد"
│
├── 📌 STEP: NAME_ENTRY (إدخال الاسم)
│   │
│   ├── [Method Toggle]
│   │   ├── [Code Method] - "بالكود" (default)
│   │   └── [QR Method] - "بالـ QR"
│   │
│   ├── 📝 CODE METHOD
│   │   ├── [Input: Child Name]
│   │   │   └── placeholder: "اسم الطفل"
│   │   ├── [Input: Link Code]
│   │   │   └── placeholder: "كود الربط من الوالد"
│   │   ├── [Checkbox: Remember Device]
│   │   │   └── default: true
│   │   └── [Submit Button] - "ربط الحساب"
│   │       ├── عند النجاح → navigate("/child-games")
│   │       └── عند الخطأ → إظهار رسالة
│   │
│   └── 📝 QR METHOD
│       ├── [Scan QR Button] - "مسح QR بالكاميرا"
│       │   └── 🔗 onClick → فتح الكاميرا
│       ├── [Upload QR Button] - "رفع صورة QR"
│       │   └── 🔗 onClick → فتح file picker
│       ├── [Camera View] - عرض الكاميرا
│       │   ├── [video element] - بث الكاميرا
│       │   ├── [canvas element] - تحليل QR
│       │   └── [Close Camera] - "✕" إغلاق الكاميرا
│       └── [File Input] - input type="file"
│
├── 📌 STEP: WAITING_APPROVAL (انتظار الموافقة)
│   │ (عند طلب الدخول بالاسم فقط)
│   │
│   ├── [Waiting Animation] - ⏳ دائرة تحميل
│   ├── [Status Text] - "في انتظار موافقة الوالد..."
│   ├── [Polling] - تحقق كل 3 ثواني من حالة الطلب
│   │   ├── status === "approved" → navigate("/child-games")
│   │   ├── status === "rejected" → إظهار رفض
│   │   └── status === "expired" → إظهار انتهاء
│   └── [Cancel Button] - "إلغاء الطلب"
│       └── 🔗 onClick → setStep("name_entry")
│
└── 📌 STEP: NEW_LINK (ربط جديد)
    └── [Back to Welcome] → setStep("welcome")

```

---

## 👨‍💼 لوحة تحكم الوالد (ParentDashboard.tsx)

```

/parent-dashboard  [1104 سطر]
│
├── 📌 HEADER
│   │
│   ├── [Logo Section]
│   │   └── النص: "Classify" + "by proomnes"
│   │
│   ├── [Notifications Button] 🔔
│   │   ├── عند الضغط → فتح dropdown الإشعارات
│   │   ├── [Badge] - عدد الإشعارات غير المقروءة
│   │   └── [Notifications Dropdown]
│   │       ├── [Header] - "الإشعارات"
│   │       ├── [Notification Items]
│   │       │   ├── [Notification Icon]
│   │       │   ├── [Notification Text]
│   │       │   ├── [Notification Time]
│   │       │   └── [Mark Read Button]
│   │       └── [View All] → navigate("/parent/notifications")
│   │
│   ├── [Theme Toggle] 🌙/☀️
│   │   └── onClick → toggleTheme()
│   │
│   ├── [Language Selector] 🌍
│   │   ├── [Arabic] - العربية
│   │   └── [English]
│   │
│   ├── [Settings Button] ⚙️
│   │   └── 🔗 onClick → navigate("/settings")
│   │
│   └── [Logout Button] 🚪
│       └── onClick → logout() + navigate("/")
│
├── 📌 MAIN TABS (6 تبويبات رئيسية)
│   │
│   ├── ═══════════════════════════════════════════════════════════════════
│   ├── [TAB: Overview] 📊 "نظرة عامة" (default)
│   ├── ═══════════════════════════════════════════════════════════════════
│   │   │
│   │   ├── [Stats Cards]
│   │   │   ├── [Total Children Card]
│   │   │   │   └── عدد الأطفال المسجلين
│   │   │   ├── [Active Tasks Card]
│   │   │   │   └── المهام النشطة
│   │   │   ├── [Total Points Card]
│   │   │   │   └── إجمالي النقاط
│   │   │   └── [Wallet Balance Card]
│   │   │       └── رصيد المحفظة
│   │   │
│   │   ├── [Quick Actions Grid]
│   │   │   ├── [Create Task Button] ➕
│   │   │   │   └── 🔗 onClick → navigate("/parent/tasks")
│   │   │   ├── [Go to Store Button] 🛒
│   │   │   │   └── 🔗 onClick → navigate("/parent/store")
│   │   │   ├── [Wallet Button] 💰
│   │   │   │   └── 🔗 onClick → navigate("/wallet")
│   │   │   └── [Subjects Button] 📚
│   │   │       └── 🔗 onClick → navigate("/subjects")
│   │   │
│   │   ├── [Children Overview]
│   │   │   └── لكل طفل:
│   │   │       ├── [Avatar]
│   │   │       ├── [Name]
│   │   │       ├── [Points]
│   │   │       ├── [Tasks Progress]
│   │   │       └── [View Details] → setTab("children")
│   │   │
│   │   └── [Recent Activity]
│   │       └── آخر 5 أنشطة
│   │
│   ├── ═══════════════════════════════════════════════════════════════════
│   ├── [TAB: Children] 👨‍👩‍👧‍👦 "الأطفال"
│   ├── ═══════════════════════════════════════════════════════════════════
│   │   │
│   │   ├── [Add Child Button] ➕ "إضافة طفل"
│   │   │   └── onClick → setShowAddChildModal(true)
│   │   │
│   │   ├── [Children List]
│   │   │   └── لكل طفل (ChildCard):
│   │   │       │
│   │   │       ├── [Avatar/Image]
│   │   │       ├── [Name]
│   │   │       ├── [Age]
│   │   │       ├── [Points Balance] ⭐
│   │   │       ├── [Online Status] 🟢/🔴
│   │   │       │
│   │   │       ├── [Action Buttons]
│   │   │       │   ├── [Edit Button] ✏️
│   │   │       │   │   └── onClick → setShowEditChildModal(true)
│   │   │       │   ├── [View Tasks Button] 📝
│   │   │       │   │   └── onClick → navigate to tasks tab
│   │   │       │   ├── [Send Gift Button] 🎁
│   │   │       │   │   └── onClick → navigate("/parent/store")
│   │   │       │   ├── [Show QR Button] 📱
│   │   │       │   │   └── onClick → setShowQRModal(true)
│   │   │       │   └── [Delete Button] 🗑️
│   │   │       │       └── onClick → confirmDelete()
│   │   │       │
│   │   │       └── [Quick Stats]
│   │   │           ├── المهام المكتملة
│   │   │           ├── الوقت على التطبيق
│   │   │           └── آخر نشاط
│   │   │
│   │   └── 📌 ADD CHILD MODAL
│   │       │
│   │       ├── [Modal Header] - "إضافة طفل جديد"
│   │       ├── [Close Button] ✕
│   │       │
│   │       ├── 📝 FORM FIELDS
│   │       │   ├── [Input: Name] *
│   │       │   │   └── placeholder: "اسم الطفل"
│   │       │   ├── [Input: Age]
│   │       │   │   └── type: number, min: 3, max: 18
│   │       │   ├── [Select: Gender]
│   │       │   │   ├── [Option: Male] - ذكر
│   │       │   │   └── [Option: Female] - أنثى
│   │       │   ├── [Image Upload] - صورة الطفل
│   │       │   │   └── onClick → file picker
│   │       │   └── [Initial Points]
│   │       │       └── default: 0
│   │       │
│   │       ├── [Submit Button] - "إضافة"
│   │       │   └── onClick → addChildMutation.mutate()
│   │       └── [Cancel Button] - "إلغاء"
│   │           └── onClick → setShowAddChildModal(false)
│   │
│   ├── ═══════════════════════════════════════════════════════════════════
│   ├── [TAB: Tasks] 📝 "المهام"
│   ├── ═══════════════════════════════════════════════════════════════════
│   │   │
│   │   ├── [Go to Tasks Page Button]
│   │   │   └── 🔗 onClick → navigate("/parent/tasks")
│   │   │
│   │   ├── [Filter: By Child]
│   │   │   └── Select dropdown للأطفال
│   │   │
│   │   ├── [Filter: By Status]
│   │   │   ├── [All]
│   │   │   ├── [Pending]
│   │   │   └── [Completed]
│   │   │
│   │   └── [Tasks List]
│   │       └── لكل مهمة:
│   │           ├── [Subject Emoji]
│   │           ├── [Task Title]
│   │           ├── [Child Name]
│   │           ├── [Status Badge]
│   │           ├── [Points Reward]
│   │           └── [Created Date]
│   │
│   ├── ═══════════════════════════════════════════════════════════════════
│   ├── [TAB: Store] 🛒 "المتجر"
│   ├── ═══════════════════════════════════════════════════════════════════
│   │   │
│   │   ├── [Quick Buttons]
│   │   │   ├── [Shop Now Button] 🛍️
│   │   │   │   └── 🔗 onClick → navigate("/parent/store")
│   │   │   ├── [My Inventory Button] 📦
│   │   │   │   └── 🔗 onClick → navigate("/parent/inventory")
│   │   │   ├── [Cart Button] 🛒
│   │   │   │   └── 🔗 onClick → navigate("/parent/store") + open cart
│   │   │   └── [Orders Button] 📋
│   │   │       └── 🔗 onClick → navigate("/parent/orders")
│   │   │
│   │   └── [Recent Orders]
│   │       └── آخر 3 طلبات
│   │
│   ├── ═══════════════════════════════════════════════════════════════════
│   ├── [TAB: Referral] 🤝 "الإحالات"
│   ├── ═══════════════════════════════════════════════════════════════════
│   │   │
│   │   ├── [Referral Code Display]
│   │   │   ├── [Code Text] - الكود الخاص بك
│   │   │   └── [Copy Button] 📋
│   │   │       └── onClick → navigator.clipboard.write()
│   │   │
│   │   ├── [Share Buttons]
│   │   │   ├── [Share WhatsApp] 💬
│   │   │   ├── [Share Facebook] 📘
│   │   │   └── [Share Twitter] 🐦
│   │   │
│   │   ├── [Referral Stats]
│   │   │   ├── عدد الإحالات الناجحة
│   │   │   └── الأرباح من الإحالات
│   │   │
│   │   └── [Referral History]
│   │       └── قائمة المُحالين
│   │
│   ├── ═══════════════════════════════════════════════════════════════════
│   └── [TAB: Reports] 📊 "التقارير"
│       ═══════════════════════════════════════════════════════════════════
│       │
│       ├── [Filter: Select Child]
│       │
│       └── [ChildReportCard] - لكل طفل
│           ├── [Performance Graph]
│           ├── [Tasks Completion Rate]
│           ├── [Points History]
│           ├── [Time Spent]
│           └── [Subjects Progress]
│
└── 📌 QR CODE MODAL (نافذة كود QR)
    │
    ├── [Modal Header] - "كود QR للطفل: {childName}"
    ├── [QR Image] - صورة QR
    ├── [Link Code] - الكود النصي
    ├── [Copy Code Button]
    ├── [Download QR Button]
    └── [Close Button]

```

---

## 📝 صفحة المهام للوالد (ParentTasks.tsx)

```

/parent/tasks  [867 سطر]
│
├── 📌 HEADER
│   ├── [Back Button] ←
│   │   └── 🔗 onClick → navigate("/parent")
│   └── [Page Title] - "قسم المهام"
│
├── 📌 FILTER BAR
│   │
│   ├── [Select Subject] 📚
│   │   ├── [All Subjects]
│   │   └── [Subject Options] - من API
│   │
│   ├── [Scheduled Tasks Button] ⏰
│   │   └── onClick → setShowScheduledTasks(true)
│   │
│   └── [Create Task Button] ➕ "إنشاء مهمة جديدة"
│       └── onClick → setShowCreateDialog(true)
│
├── 📌 TASK TABS (3 تبويبات)
│   │
│   ├── [TAB: Classy Tasks] 📚 "مهام كلاسيفاي"
│   │   │ (مهام جاهزة من المنصة)
│   │   │
│   │   ├── [Subject Required Message]
│   │   │   └── "اختر مادة لعرض المهام"
│   │   │
│   │   └── [Task Cards]
│   │       └── لكل مهمة (TaskCard):
│   │           ├── [Title]
│   │           ├── [Question Preview]
│   │           ├── [Points Badge] ⭐
│   │           └── [Send Button] 📤
│   │               └── onClick → openSendDialog(task)
│   │
│   ├── [TAB: My Tasks] ⭐ "مهامي"
│   │   │ (مهام أنشأها الوالد)
│   │   │
│   │   ├── [Empty State]
│   │   │   └── [Create Task Button]
│   │   │
│   │   └── [Task Cards]
│   │       └── لكل مهمة (TaskCard):
│   │           ├── [Title]
│   │           ├── [Question Preview]
│   │           ├── [Points Badge]
│   │           ├── [Edit Button] ✏️
│   │           │   └── onClick → openEditDialog(task)
│   │           └── [Send Button] 📤
│   │
│   └── [TAB: Public Tasks] 👥 "مهام عامة"
│       │ (مهام من والدين آخرين)
│       │
│       ├── [Info Notice]
│       │   └── "استخدام المهام العامة يكلف نقاط"
│       │
│       └── [Task Cards]
│           └── لكل مهمة:
│               ├── [Title]
│               ├── [Question]
│               ├── [Points Reward]
│               ├── [Points Cost Badge] 🟠
│               ├── [Creator Name]
│               └── [Send Button]
│
├── 📌 CREATE TASK DIALOG (نافذة إنشاء مهمة)
│   │
│   ├── [Header] - "إنشاء مهمة جديدة"
│   ├── [Close Button] ✕
│   │
│   ├── 📝 FORM FIELDS
│   │   ├── [Select: Subject] *
│   │   │   └── اختيار المادة
│   │   ├── [Input: Points Reward]
│   │   │   └── default: 10
│   │   ├── [Input: Task Title]*
│   │   │   └── placeholder: "عنوان المهمة"
│   │   ├── [Textarea: Question] *
│   │   │   └── placeholder: "اكتب السؤال"
│   │   ├── [Answers Section]
│   │   │   ├── [Input: Answer 1] (الإجابة الصحيحة) ✅
│   │   │   ├── [Input: Answer 2]
│   │   │   ├── [Input: Answer 3]
│   │   │   └── [Input: Answer 4]
│   │   ├── [Switch: Public Share]
│   │   │   └── "شارك المهمة مع الآخرين"
│   │   └── [Input: Usage Cost] (إذا عامة)
│   │       └── default: 5
│   │
│   └── [Create Button] - "إنشاء المهمة"
│       └── onClick → createTaskMutation.mutate()
│
├── 📌 SEND TASK DIALOG (نافذة إرسال مهمة)
│   │
│   ├── [Header] - "إرسال للطفل"
│   ├── [Task Preview Card]
│   │
│   ├── [Select: Child]*
│   │   └── قائمة الأطفال
│   │
│   ├── [Switch: Schedule Mode]
│   │   └── "جدولة لوقت لاحق"
│   │
│   ├── [Schedule Fields] (إذا مفعل)
│   │   ├── [Input: Date]
│   │   │   └── type: date
│   │   └── [Input: Time]
│   │       └── type: time
│   │
│   └── [Send/Schedule Button]
│       ├── [Send Now] - "إرسال" 📤
│       └── [Schedule] - "جدولة" ⏰
│
├── 📌 SCHEDULED TASKS DIALOG (المهام المجدولة)
│   │
│   ├── [Header] - "المهام المجدولة"
│   ├── [Empty State] - "لا توجد مهام مجدولة"
│   │
│   └── [Scheduled Task Cards]
│       └── لكل مهمة مجدولة:
│           ├── [Task Title]
│           ├── [Child Name]
│           ├── [Scheduled Time]
│           ├── [Status Badge]
│           │   ├── pending - "معلق"
│           │   ├── sent - "تم الإرسال"
│           │   └── cancelled - "ملغى"
│           └── [Cancel Button] ✕ (إذا pending)
│
└── 📌 EDIT TASK DIALOG (تعديل مهمة)
    │
    ├── [Header] - "تعديل المهمة"
    ├── [Same fields as Create]
    └── [Save Button] - "حفظ التغييرات"

```

---

## 💰 صفحة المحفظة (Wallet.tsx)

```

/wallet  [315 سطر]
│
├── 📌 HEADER
│   ├── [Title] - "💰 المحفظة"
│   ├── [Subtitle] - "إدارة الأموال ووسائل الدفع"
│   ├── [Theme Toggle]
│   └── [Back Button] - "← رجوع"
│       └── 🔗 onClick → navigate("/parent-dashboard")
│
├── 📌 WALLET BALANCE CARD
│   │
│   ├── [Current Balance] - "$ {balance}"
│   ├── [Deposit Button] 💳 "إيداع أموال"
│   │   └── onClick → setShowDeposit(true)
│   │   └── disabled إذا لم يتم اختيار وسيلة دفع
│   │
│   └── [Stats]
│       ├── إجمالي الإيداع
│       └── إجمالي المصروف
│
├── 📌 PAYMENT METHODS SECTION
│   │
│   ├── [Section Header] - "💳 وسائل الدفع"
│   ├── [Add Method Button] - "+ إضافة وسيلة"
│   │   └── onClick → setShowAddPayment(true)
│   │
│   └── [Payment Methods Grid]
│       └── لكل وسيلة:
│           ├── [Type Icon + Name]
│           ├── [Account/Phone Number]
│           ├── [Default Badge] (إذا افتراضية)
│           ├── [Select Button] - للاختيار
│           └── [Delete Button] - "حذف"
│
├── 📌 ADD PAYMENT MODAL
│   │
│   ├── [Header] - "إضافة وسيلة دفع"
│   │
│   ├── [Select: Payment Type]
│   │   ├── 🏦 تحويل بنكي
│   │   ├── 📱 فودافون كاش
│   │   ├── 🟠 أورنج موني
│   │   ├── 🟣 اتصالات موني
│   │   ├── 💳 ويبت
│   │   ├── ⚡ إنستاباي
│   │   └── 🎫 فوري
│   │
│   ├── 📝 BANK TRANSFER FIELDS (إذا بنكي)
│   │   ├── [Input: Bank Name]
│   │   ├── [Input: Account Number]
│   │   └── [Input: Account Name]
│   │
│   ├── 📝 MOBILE WALLET FIELDS (غير ذلك)
│   │   └── [Input: Phone/Account Number]
│   │
│   ├── [Checkbox: Set as Default]
│   │
│   ├── [Add Button] - "إضافة"
│   └── [Cancel Button] - "إلغاء"
│
└── 📌 DEPOSIT MODAL
    │
    ├── [Header] - "إيداع أموال"
    ├── [Input: Amount]
    │   └── placeholder: "أدخل المبلغ"
    ├── [Selected Payment Info]
    ├── [Deposit Button] - "إيداع"
    └── [Cancel Button] - "إلغاء"

```

---

## ⚙️ صفحة الإعدادات (Settings.tsx)

```

/settings  [532 سطر]
│
├── 📌 HEADER
│   ├── [Title] - "⚙️ الإعدادات"
│   ├── [Theme Toggle]
│   ├── [Language Selector]
│   └── [Back Button]
│       └── 🔗 onClick → navigate("/parent-dashboard")
│
├── 📌 TABS (4 تبويبات)
│   │
│   ├── [TAB: Profile] 👤 "الملف الشخصي"
│   │   │
│   │   ├── [Error/Success Messages]
│   │   │
│   │   ├── 📝 FORM FIELDS
│   │   │   ├── [Input: Name]
│   │   │   │   └── value: profileData.name
│   │   │   ├── [Input: Email]
│   │   │   │   └── value: profileData.email
│   │   │   └── [Input: Phone]
│   │   │       └── placeholder: "01xxxxxxxxx"
│   │   │
│   │   └── [Save Button] 💾 "حفظ التغييرات"
│   │       └── onClick → updateProfileMutation.mutate()
│   │
│   ├── [TAB: Security] 🔐 "الأمان"
│   │   │
│   │   ├── [Change Password Section]
│   │   │   ├── [Input: Current Password]
│   │   │   ├── [Input: New Password]
│   │   │   ├── [Input: Confirm Password]
│   │   │   └── [Change Password Button] 🔐
│   │   │       └── onClick → changePasswordMutation.mutate()
│   │   │
│   │   └── [Delete Account Section] ⚠️
│   │       ├── [Warning Title] - "حذف الحساب"
│   │       ├── [Warning Description]
│   │       ├── [Input: Password to Confirm]
│   │       └── [Delete Account Button] 🗑️
│   │           └── onClick → deleteAccountMutation.mutate()
│   │
│   ├── [TAB: Appearance] 🎨 "المظهر"
│   │   │
│   │   └── [Theme Toggle Row]
│   │       ├── [Current Theme Icon] ☀️/🌙
│   │       ├── [Theme Name]
│   │       └── [Toggle Button]
│   │           └── onClick → toggleTheme()
│   │
│   └── [TAB: Contact] 📞 "تواصل معنا"
│       │
│       ├── [Privacy Policy Button]
│       │   └── 🔗 onClick → navigate("/privacy-policy")
│       │
│       └── [Contact Grid]
│           ├── [Phone Link] 📱
│           │   └── href: tel:{phone}
│           ├── [Email Link] 📧
│           │   └── href: mailto:{email}
│           ├── [WhatsApp Link] 💬
│           │   └── href: <https://wa.me/{number}>
│           ├── [Facebook Link] 📘
│           │   └── target: _blank
│           ├── [Instagram Link] 📸
│           │   └── target:_blank
│           ├── [Twitter Link] 🐦
│           │   └── target: _blank
│           └── [Address] 📍

```

---

## 🎮 صفحة ألعاب الطفل (ChildGames.tsx)

```

/child-games  [383 سطر]
│
├── 📌 HEADER
│   │
│   ├── [Language Selector] 🌍
│   │
│   ├── [PWA Install Button] 📲
│   │   └── يظهر إذا التطبيق غير مثبت
│   │
│   ├── [Notifications Button] 🔔
│   │   ├── [Badge] - عدد الإشعارات
│   │   └── 🔗 onClick → navigate("/child-notifications")
│   │
│   ├── [Gifts Button] 🎁
│   │   └── 🔗 onClick → navigate("/child-gifts")
│   │
│   ├── [Store Button] 🛒
│   │   └── 🔗 onClick → navigate("/child-store")
│   │
│   ├── [Settings Button] ⚙️
│   │   └── 🔗 onClick → navigate("/child-settings")
│   │
│   └── [Logout Button] 🚪
│       └── onClick → logout + navigate("/")
│
├── 📌 POINTS DISPLAY
│   ├── [Star Icon] ⭐
│   └── [Points Count] - "{totalPoints}"
│
├── 📌 GROWTH TREE SECTION
│   │
│   └── [GrowthTree Component]
│       ├── [Tree Animation]
│       ├── [Level Indicator]
│       └── [Progress Bar]
│
├── 📌 TASKS PREVIEW
│   │
│   ├── [Pending Tasks Card]
│   │   ├── [Task Count]
│   │   └── [Go to Tasks Button]
│   │       └── 🔗 onClick → navigate("/child-tasks")
│   │
│   └── [Quick Task Preview]
│       └── آخر مهمة معلقة
│
├── 📌 GAMES SECTION
│   │
│   ├── [Section Title] - "الألعاب"
│   │
│   └── [Games Grid]
│       └── لكل لعبة (Game Card):
│           ├── [Game Image]
│           ├── [Game Name]
│           ├── [Points Per Play]
│           ├── [Play Button] 🎮
│           │   └── onClick → setSelectedGame(game)
│           └── [Locked Badge] (إذا مقفلة)
│
├── 📌 GAME MODAL (عند اختيار لعبة)
│   │
│   ├── [Modal Overlay]
│   ├── [Game Content Area]
│   │
│   ├── [Close Button] ✕
│   │   └── onClick → setSelectedGame(null)
│   │
│   └── [Complete Button] ✓ "انتهيت"
│       └── onClick → completeGameMutation.mutate()
│
└── 📌 REWARD ANIMATION (AnimatePresence)
    │ (يظهر عند اكتمال لعبة/مهمة)
    │
    ├── [Confetti Animation]
    ├── [Points Earned] ⭐ "+{points}"
    └── [Auto Hide] - بعد 2.5 ثانية

```

---

## 🛒 متجر الطفل (ChildStore.tsx)

```

/child-store  [910 سطر]
│
├── 📌 HEADER
│   │
│   ├── [Back Button] ←
│   │   └── 🔗 onClick → navigate("/child-games")
│   │
│   ├── [Logo] - "كلاسيفاي ستور" ✨
│   │
│   ├── [Search Input] 🔍
│   │   └── placeholder: "ابحث..."
│   │
│   ├── [Points Display] (على الشاشات الكبيرة)
│   │   └── ⭐ {totalPoints}
│   │
│   ├── [Notifications Button] 🔔
│   │   └── 🔗 onClick → navigate("/child-notifications")
│   │
│   └── [Cart Button] 🛒
│       ├── [Badge] - عدد العناصر
│       └── onClick → setShowCart(true)
│
├── 📌 CATEGORY BAR
│   │
│   ├── [All Button] - "الكل"
│   │   └── onClick → setSelectedCategory(null)
│   │
│   ├── [Library Button] 📖 - "المكتبات"
│   │   └── onClick → setShowLibraryOnly(true)
│   │
│   └── [Category Buttons]
│       └── لكل فئة:
│           ├── [Category Icon]
│           ├── [Category Name]
│           └── onClick → setSelectedCategory(id)
│
├── 📌 FILTER BAR
│   │
│   ├── [Feature Icons] (شاشات كبيرة)
│   │   ├── 🚚 توصيل سريع
│   │   ├── 🛡️ ضمان الجودة
│   │   └── ⏰ دعم 24/7
│   │
│   ├── [Sort Select]
│   │   ├── الأكثر مبيعاً
│   │   ├── النقاط: الأقل
│   │   ├── النقاط: الأعلى
│   │   ├── الأحدث
│   │   └── التقييم
│   │
│   └── [View Mode Toggle]
│       ├── [Grid View] 🔲
│       └── [List View] 📋
│
├── 📌 FEATURED PRODUCTS SECTION
│   │ (يظهر إذا لا يوجد فلتر)
│   │
│   ├── [Section Title] - "المنتجات المميزة" ✨
│   │
│   └── [Products Grid]
│       └── لكل منتج:
│           ├── [Product Image]
│           ├── [Available Badge] ✓ (إذا يكفي الرصيد)
│           ├── [Discount Badge] -X%
│           ├── [Library Badge] (إذا من مكتبة)
│           ├── [Brand Name]
│           ├── [Product Name]
│           ├── [Stars Rating] ⭐⭐⭐⭐⭐
│           ├── [Points Price]
│           ├── [Original Price] (مشطوب)
│           └── [Add to Cart Button] ➕
│
├── 📌 ALL PRODUCTS SECTION
│   │
│   ├── [Section Title] - "{categoryName}" أو "جميع المنتجات"
│   ├── [Product Count] - "{count} منتج"
│   │
│   ├── [Loading State]
│   │   └── Skeleton cards
│   │
│   ├── [Empty State]
│   │   ├── [Package Icon] 📦
│   │   └── "لا توجد منتجات"
│   │
│   └── [Products Grid/List]
│       └── نفس تفاصيل المنتج المميز
│
├── 📌 CART MODAL
│   │
│   ├── [Header] - "🛒 سلة التسوق"
│   ├── [Close Button] ✕
│   │
│   ├── [Cart Items]
│   │   └── لكل عنصر:
│   │       ├── [Product Image]
│   │       ├── [Product Name]
│   │       ├── [Quantity Controls]
│   │       │   ├── [Decrease Button] ➖
│   │       │   ├── [Quantity Display]
│   │       │   └── [Increase Button] ➕
│   │       ├── [Item Total]
│   │       └── [Remove Button] ✕
│   │
│   ├── [Cart Total]
│   │   ├── "المجموع: {total} نقطة"
│   │   └── [Afford Status] - ✓ أو ✕
│   │
│   ├── [Checkout Button] - "طلب الشراء"
│   │   └── onClick → setShowCheckout(true)
│   │   └── disabled إذا لا يكفي الرصيد
│   │
│   └── [Continue Shopping Button]
│
├── 📌 CHECKOUT MODAL
│   │
│   ├── [Header] - "تأكيد الطلب"
│   ├── [Order Summary]
│   ├── [Total Points]
│   ├── [Confirm Button] - "تأكيد الطلب"
│   │   └── onClick → checkoutMutation.mutate()
│   └── [Cancel Button]
│
└── 📌 PRODUCT DETAIL MODAL
    │ (عند الضغط على منتج)
    │
    ├── [Product Image Large]
    ├── [Product Name]
    ├── [Description]
    ├── [Rating]
    ├── [Price]
    ├── [Stock Status]
    ├── [Add to Cart Button]
    └── [Close Button]

```

---

## 📱 إعدادات الطفل (ChildSettings.tsx)

```

/child-settings  [355 سطر]
│
├── 📌 HEADER
│   ├── [Back Button] ←
│   │   └── 🔗 onClick → navigate("/child-games")
│   ├── [Settings Icon] ⚙️
│   └── [Title] - "الإعدادات"
│
├── 📌 LANGUAGE & APPEARANCE CARD 🌐
│   │
│   ├── [Title] - "اللغة والمظهر"
│   ├── [Description]
│   │
│   ├── [Language Row]
│   │   ├── [Globe Icon] 🌐
│   │   ├── [Label] - "اللغة"
│   │   └── [Select: Language]
│   │       ├── العربية
│   │       └── English
│   │
│   └── [Theme Row]
│       ├── [Theme Icon] ☀️/🌙
│       ├── [Label] - "المظهر"
│       └── [Select: Theme]
│           ├── فاتح
│           └── داكن
│
├── 📌 NOTIFICATIONS CARD 🔔
│   │
│   ├── [Title] - "الإشعارات"
│   ├── [Description]
│   │
│   ├── [Notifications Row]
│   │   ├── [Bell Icon]
│   │   ├── [Label] - "الإشعارات"
│   │   └── [Switch]
│   │
│   └── [Sounds Row]
│       ├── [Volume Icon]
│       ├── [Label] - "الأصوات"
│       └── [Switch]
│
├── 📌 PRIVACY CARD 🛡️
│   │
│   ├── [Title] - "الخصوصية"
│   ├── [Description]
│   │
│   ├── [Online Status Row]
│   │   ├── [Eye Icon]
│   │   ├── [Label] - "إظهار حالة الاتصال"
│   │   └── [Switch]
│   │
│   └── [Show Progress Row]
│       ├── [Check Icon]
│       ├── [Label] - "إظهار تقدمي للوالدين"
│       └── [Switch]
│
├── 📌 TRUSTED DEVICES CARD 📱
│   │
│   ├── [Title] - "الأجهزة الموثوقة"
│   ├── [Description]
│   │
│   └── [Devices List]
│       └── لكل جهاز:
│           ├── [Device Icon]
│           ├── [Device Name]
│           ├── [Last Used Date]
│           ├── [Current Device Badge] (إذا الجهاز الحالي)
│           └── [Remove Button] 🗑️ (إذا ليس الحالي)
│
└── 📌 FOOTER
    └── [Welcome Message] - "مرحباً {childName}"

```

---

## 🔔 إشعارات الطفل (ChildNotifications.tsx)

```

/child-notifications  [353 سطر]
│
├── 📌 HEADER
│   ├── [Notifications Icon] 🔔
│   ├── [Title] - "الإشعارات"
│   ├── [Unread Badge] - "{count} جديد"
│   ├── [Points Display] ⭐
│   └── [Back Button] - "رجوع"
│       └── 🔗 onClick → navigate("/child-games")
│
├── 📌 MANDATORY TASK MODAL
│   │ (يظهر إذا هناك مهمة إجبارية)
│   │
│   └── [MandatoryTaskModal Component]
│
├── 📌 LOADING STATE
│   └── [Spinner]
│
├── 📌 EMPTY STATE
│   └── "لا توجد إشعارات"
│
└── 📌 NOTIFICATIONS LIST
    └── لكل إشعار:
        │
        ├── [Notification Card]
        │   │
        │   ├── [Icon] (حسب النوع)
        │   │   ├── points_earned → ⭐
        │   │   ├── reward_unlocked → 🏆
        │   │   ├── product_assigned → 🎁
        │   │   ├── task_reminder → ⏰
        │   │   ├── achievement → 🏆
        │   │   ├── daily_challenge → 🎯
        │   │   ├── goal_progress → 🎯
        │   │   └── gift_assigned → 🎁
        │   │
        │   ├── [Title]
        │   ├── [Message]
        │   ├── [Time Ago]
        │   ├── [Unread Indicator] (إذا غير مقروء)
        │   │
        │   └── [Action Button] (حسب النوع)
        │       ├── gift_assigned → navigate("/child-gifts")
        │       ├── task_reminder → navigate("/child-tasks")
        │       └── daily_challenge → navigate("/child-games")
        │
        └── [Resolve Button] (للإشعارات التي تتطلب إجراء)

```

---

## 📝 مهام الطفل (ChildTasks.tsx)

```

/child-tasks  [304 سطر]
│
├── 📌 HEADER
│   ├── [Back Button] ←
│   │   └── 🔗 onClick → navigate("/child-games")
│   └── [Points Display] ⭐ {points}
│
├── 📌 PAGE TITLE
│   └── [Title] - "📖 مهامي"
│
├── 📌 EMPTY STATE
│   │ (إذا لا توجد مهام)
│   │
│   ├── [Trophy Icon] 🏆
│   ├── "لا توجد مهام حالياً"
│   └── "عندما يرسل لك والدك مهمة ستظهر هنا"
│
├── 📌 PENDING TASKS SECTION
│   │
│   ├── [Section Title] ⏰ "مهام معلقة ({count})"
│   │
│   └── [Tasks Grid]
│       └── لكل مهمة:
│           │
│           ├── [Task Card] (animated)
│           │   ├── [Subject Emoji]
│           │   ├── [Subject Name]
│           │   ├── [Question Text]
│           │   ├── [Points Reward Badge] ⭐ +{points}
│           │   └── onClick → setSelectedTask(task)
│
├── 📌 COMPLETED TASKS SECTION
│   │
│   ├── [Section Title] ✓ "مهام مكتملة ({count})"
│   │
│   └── [Tasks List]
│       └── لكل مهمة:
│           ├── [Checkmark] ✓
│           └── [Question Text]
│
├── 📌 TASK MODAL (عند اختيار مهمة)
│   │
│   ├── [Modal Overlay]
│   │   └── onClick → setSelectedTask(null)
│   │
│   ├── [Modal Content]
│   │   ├── [Subject + Title]
│   │   ├── [Question]
│   │   │
│   │   ├── [Answers Grid]
│   │   │   └── لكل إجابة:
│   │   │       ├── [Answer Button]
│   │   │       │   └── onClick → setSelectedAnswer(index)
│   │   │       └── [Selected State] (border color change)
│   │   │
│   │   └── [Submit Button] - "تأكيد الإجابة"
│   │       └── onClick → submitAnswerMutation.mutate()
│   │       └── disabled إذا لم يتم اختيار إجابة
│   │
│   └── [Close Button] ✕
│
└── 📌 RESULT MODAL (بعد الإجابة)
    │
    ├── [Correct State] ✓
    │   ├── [Success Animation]
    │   ├── "إجابة صحيحة!"
    │   └── "⭐ +{points}"
    │
    └── [Wrong State] ✕
        ├── [Failure Animation]
        └── "إجابة خاطئة"

```

---

## 🎁 هدايا الطفل (ChildGifts.tsx)

```

/child-gifts  [274 سطر]
│
├── 📌 HEADER
│   ├── [Title] - "🎁 هداياي"
│   ├── [Subtitle] - "اجمع النقاط واحصل على الهدايا"
│   │
│   ├── [Points Display] ⭐ {currentPoints}
│   │
│   ├── [Notifications Button] 🔔
│   │   └── 🔗 onClick → navigate("/child-notifications")
│   │
│   └── [Back Button]
│       └── 🔗 onClick → navigate("/child-games")
│
├── 📌 PROGRESS INFO CARD
│   ├── [Balance Title] - "🎯 رصيدك الحالي"
│   ├── [Description] - "العب واكسب المزيد"
│   │
│   └── [Action Buttons]
│       ├── [Play Button] 🎮 "العب"
│       │   └── 🔗 onClick → navigate("/child-games")
│       └── [Tasks Button] 📝 "المهام"
│           └── 🔗 onClick → navigate("/child-tasks")
│
├── 📌 LOADING STATE
│   └── [Spinner]
│
├── 📌 EMPTY STATE
│   ├── [Gift Icon] 🎁
│   ├── "لا توجد هدايا متاحة"
│   └── "انتظر هدايا من والديك"
│
└── 📌 GIFTS GRID
    └── لكل هدية:
        │
        ├── [Gift Card]
        │   │
        │   ├── [Gift Image]
        │   │   └── fallback: 🎁
        │   │
        │   ├── [Available Badge] ✓ (إذا يكفي الرصيد)
        │   │
        │   ├── [Gift Name]
        │   ├── [Description]
        │   │
        │   ├── [Progress Section]
        │   │   ├── [Points Price] ⭐ {pointsPrice}
        │   │   ├── [Needed Points] (إذا لا يكفي)
        │   │   └── [Progress Bar]
        │   │
        │   └── [Redeem Button]
        │       ├── enabled → "استبدال" 🎁
        │       └── disabled → "تحتاج المزيد من النقاط"
        │
        └── [Redeem Modal] (عند الضغط)
            ├── [Gift Image]
            ├── [Gift Name]
            ├── [Confirm Text]
            ├── [Confirm Button] - "تأكيد الاستبدال"
            │   └── onClick → redeemMutation.mutate()
            └── [Cancel Button]

```

---

## 👨‍💼 لوحة تحكم الأدمن (AdminDashboard.tsx)

```

/admin-dashboard  [150 سطر + 23 tab component]
│
├── 📌 SIDEBAR
│   │
│   ├── [Toggle Button] ☰/✕
│   │   └── onClick → setSidebarOpen(!sidebarOpen)
│   │
│   ├── [Logo] (إذا مفتوح) - "لوحة التحكم"
│   │
│   ├── [Navigation Tabs] (23 تبويب)
│   │   │
│   │   ├── 📊 [Dashboard] - "لوحة القيادة"
│   │   ├── 💹 [Profits] - "نظام الأرباح"
│   │   ├── 👨‍👩‍👧‍👦 [Parents] - "إدارة الأولياء"
│   │   ├── 📚 [Subjects] - "المواد الدراسية"
│   │   ├── 📁 [Categories] - "فئات المتجر"
│   │   ├── ⭐ [Symbols] - "مكتبة الرموز"
│   │   ├── 🛍️ [Products] - "المنتجات"
│   │   ├── 👥 [Users] - "الأطفال"
│   │   ├── 💰 [Wallets] - "المحافظ"
│   │   ├── 📦 [Orders] - "الطلبات"
│   │   ├── 💳 [Deposits] - "الإيداعات"
│   │   ├── 💳 [Payment Methods] - "طرق الدفع"
│   │   ├── 📈 [Analytics] - "تحليلات المحفظة"
│   │   ├── 📋 [Activity] - "سجل النشاط"
│   │   ├── 🔔 [Notifications] - "الإشعارات"
│   │   ├── 🤝 [Referrals] - "الإحالات"
│   │   ├── 📢 [Ads] - "الإعلانات"
│   │   ├── 📖 [Libraries] - "المكتبات"
│   │   ├── 🔐 [Social Login] - "تسجيل اجتماعي"
│   │   ├── 📱 [OTP Providers] - "مزودي OTP"
│   │   ├── 🔍 [SEO] - "إعدادات SEO"
│   │   ├── 📞 [Support] - "إعدادات الدعم"
│   │   └── ⚙️ [Settings] - "الإعدادات"
│   │
│   └── [Logout Button] 🚪
│       └── onClick → handleLogout()
│
├── 📌 HEADER
│   ├── [Language Selector]
│   └── [Theme Toggle] ☀️/🌙
│
└── 📌 MAIN CONTENT
    │
    └── يعرض المكون المناسب حسب activeTab:
        │
        ├── dashboard → <AdminDashboardTab />
        ├── profits → <ProfitSystemTab />
        ├── parents → <ParentsTab />
        ├── subjects → <SubjectsTab />
        ├── categories → <CategoriesTab />
        ├── symbols → <SymbolsTab />
        ├── products → <ProductsTab />
        ├── users → <UsersTab />
        ├── wallets → <WalletsTab />
        ├── orders → <OrdersTab />
        ├── deposits → <DepositsTab />
        ├── payment-methods → <PaymentMethodsTab />
        ├── analytics → <WalletAnalytics />
        ├── activity → <ActivityLogTab />
        ├── notifications → <NotificationsTab />
        ├── referrals → <ReferralsTab />
        ├── ads → <AdsTab />
        ├── libraries → <LibrariesTab />
        ├── social-login → <SocialLoginTab />
        ├── otp-providers → <OTPProvidersTab />
        ├── seo → <SeoSettingsTab />
        ├── support → <SupportSettingsTab />
        └── settings → <SettingsTab />

```

---

## 📍 خريطة المسارات الكاملة (App.tsx)

```

/ ─────────────────────────── Home
├── /parent-auth ────────────── ParentAuth (تسجيل/دخول الوالد)
├── /otp ────────────────────── OTP (التحقق من الكود)
├── /forgot-password ────────── ForgotPassword (نسيت كلمة المرور)
├── /reset-password ─────────── ResetPassword (إعادة تعيين)
│
├── /parent-dashboard ───────── ParentDashboard (لوحة الوالد)
├── /parent ─────────────────── ParentDashboard (اختصار)
├── /parent/tasks ───────────── ParentTasks (إدارة المهام)
├── /parent/store ───────────── ParentStore (المتجر)
├── /parent/orders ──────────── ParentOrders (الطلبات)
├── /parent/inventory ───────── ParentInventory (المخزون)
├── /parent/notifications ───── ParentNotifications
│
├── /wallet ─────────────────── Wallet (المحفظة)
├── /settings ───────────────── Settings (الإعدادات)
├── /subjects ───────────────── SubjectsPage (المواد)
│
├── /child-link ─────────────── ChildLink (ربط الطفل)
├── /child-games ────────────── ChildGames (الألعاب) *ملفوف بـ ChildAppWrapper
├── /child-tasks ────────────── ChildTasks (المهام) *
├── /child-gifts ────────────── ChildGifts (الهدايا) *
├── /child-store ────────────── ChildStore (المتجر) *
├── /child-settings ─────────── ChildSettings (الإعدادات) *
├── /child-notifications ────── ChildNotifications (الإشعارات) *
│
├── /admin ──────────────────── AdminLogin (دخول الأدمن)
├── /admin-dashboard ────────── AdminDashboard (لوحة الأدمن)
│
├── /privacy ────────────────── PrivacyPolicy
├── /terms ──────────────────── TermsOfService
├── /privacy-policy ─────────── PrivacyPolicy
└── /* ──────────────────────── NotFound (404)

```

---

## 📊 ملخص العناصر التفاعلية

| الصفحة | الأزرار | النوافذ | الحقول | التبويبات |
|--------|---------|---------|--------|-----------|
| Home | 6 | 0 | 0 | 0 |
| ParentAuth | 12 | 1 | 8 | 2 |
| ParentDashboard | 35+ | 3 | 15+ | 6 |
| ParentTasks | 25+ | 4 | 12+ | 3 |
| Wallet | 15 | 2 | 8 | 0 |
| Settings | 12 | 0 | 6 | 4 |
| ChildLink | 10 | 0 | 4 | 0 |
| ChildGames | 12 | 2 | 0 | 0 |
| ChildStore | 30+ | 3 | 2 | 0 |
| ChildSettings | 8 | 0 | 0 | 0 |
| ChildTasks | 8 | 2 | 0 | 0 |
| ChildGifts | 6 | 1 | 0 | 0 |
| AdminDashboard | 25 | varies | varies | 23 |

---

## 🔗 العلاقات بين الصفحات

```

                    ┌─────────────────────────────────────┐
                    │              🏠 HOME                 │
                    └─────────────────┬───────────────────┘
                                      │
           ┌──────────────────────────┼──────────────────────────┐
           │                          │                          │
           ▼                          ▼                          ▼
    ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
    │ Parent Auth  │          │  Child Link  │          │    Admin     │
    └──────┬───────┘          └──────┬───────┘          └──────┬───────┘
           │                          │                          │
           ▼                          ▼                          ▼
    ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
    │     OTP      │          │ Child Games  │──────────│    Admin     │
    └──────┬───────┘          └──────┬───────┘          │  Dashboard   │
           │                          │                  └──────────────┘
           ▼                          │
    ┌──────────────┐          ┌───────┼───────┐
    │   Parent     │          │       │       │
    │  Dashboard   │◄─────────┤  ┌────┴────┐  │
    └──────┬───────┘          │  │ Tasks   │  │
           │                  │  │ Store   │  │
    ┌──────┼──────┐           │  │ Gifts   │  │
    │      │      │           │  │Settings │  │
    ▼      ▼      ▼           │  │Notifs   │  │
  Tasks  Store  Wallet        │  └─────────┘  │
  Settings                    └───────────────┘

```

---

## 🔗 المراجع المهمة

| الملف | الوصف | الاستخدام |
|------|-------|---------|
| **[DEEP-NAVIGATION-ANALYSIS.md](DEEP-NAVIGATION-ANALYSIS.md)** | 📖 تحليل عميق شامل جداً | للتفاصيل الكاملة والإحصائيات الكاملة |
| **[NAVIGATION-MAP.md](NAVIGATION-MAP.md)** | 🗺️ خريطة المسارات | نظرة عامة سريعة على البنية |
| **ARCHITECTURE.md** | 🏗️ معمارية التطبيق | القرارات والأنماط المعمارية |

---

**تم التحليل بواسطة:** GitHub Copilot  
**تاريخ:** 19 مارس 2026  
**آخر تحديث:** 19 مارس 2026 ✅
