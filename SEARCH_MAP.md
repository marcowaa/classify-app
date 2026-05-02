# 🗺️ CLASSIFY — Search & Navigation Map
**خريطة البحث والملاحة السريعة — Quick Search & Navigation**

> استخدم Ctrl+F للبحث عن كلمة المفتاح بسرعة

---

## 🔍 ابحث عن كلمة المفتاح

### 🔐 **Authentication & Security**
```
كلمة المفتاح                  ملف                        السطر
═══════════════════════════════════════════════════════════════
تسجيل دخول                   server/routes/auth.ts      1-100
OTP إرسال                     server/services/mailer.ts  1-50
2FA                          server/routes/auth.ts      200-300
JWT Token                    server/routes/auth.ts      50-150
Password Hashing             server/routes/auth.ts      100-200
Social Login (OAuth)         server/routes/auth.ts      300-400
```

### 👨‍👩‍👧‍👦 **Family & Relationships**
```
الوالد Signup                 client/src/pages/ParentAuth.tsx
إنشاء طفل                    server/routes/family.ts
ربط الطفل                    client/src/pages/ChildLink.tsx
علاقة Parent-Child           shared/schema.ts (parentChild table)
الملف الشخصي                 client/src/pages/ParentProfile.tsx
```

### 📋 **Tasks Management**
```
إنشاء مهمة                    client/src/pages/ParentTasks.tsx
إكمال مهمة                    server/routes/child.ts (POST /complete-game)
عرض المهام                    client/src/pages/ChildTasks.tsx
جدول مهام                    shared/schema.ts (tasks table)
مهام مخصصة                    server/routes/tasks.ts
متجر المهام                  client/src/pages/TaskMarketplace.tsx
```

### 🎮 **Games System**
```
الألعاب المتاحة               client/public/games/
لعبة القطط                    client/public/games/cat-kingdom/
لعبة التذكر                   client/src/pages/MemoryMatchPage.tsx
إكمال اللعبة                 server/routes/child.ts
نقاط اللعبة                   shared/schema.ts (game_completions)
ترجمة الألعاب                client/public/games/*/i18n.js
```

### 🏆 **Rewards & Points**
```
نقاط المكافآت                shared/schema.ts (rewards table)
الجوائز المتاحة              client/src/pages/ChildRewards.tsx
إضافة جائزة                  server/routes/rewards.ts
محفظة النقاط                 client/src/pages/Wallet.tsx
شراء من المتجر              server/routes/store.ts
```

### 🌱 **Growth Tree**
```
شجرة النمو (Display)          client/src/pages/ChildGarden.tsx
مراحل الشجرة                  shared/schema.ts (growth_tree_stages)
ميكانيكا سقي الشجرة           client/src/components/GrowthTree.tsx
تحديث حالة الشجرة            server/routes/child.ts
الجوائز عند المراحل         server/giftUnlock.ts
```

### 💳 **Payments & Transactions**
```
Stripe Webhook               server/routes/payments.ts
معالجة الدفع                 server/routes/payments.ts
محفظة الوالد                 client/src/pages/Wallet.tsx
تحويل نقاط                   server/routes/wallet.ts
السحب                        server/routes/wallet.ts
```

### 📢 **Notifications**
```
الإشعارات الموجودة           client/src/pages/ChildNotifications.tsx
معالج الإشعارات             server/notificationHandlers.ts
الإشعارات المدفوعة          server/services/mailer.ts
إعدادات الإشعارات           server/routes/notifications.ts
متجر الإشعارات              shared/schema.ts (notifications table)
```

### 🏫 **Schools System**
```
تسجيل دخول المدرسة           client/src/pages/SchoolLogin.tsx
لوحة المدرسة                 client/src/pages/SchoolDashboard.tsx
إدارة المعلمين              server/routes/schools.ts
طلاب المدرسة                shared/schema.ts (school_students)
مهام المدرسة                server/routes/schools.ts
```

### 📚 **Libraries System**
```
تسجيل دخول المكتبة           client/src/pages/LibraryLogin.tsx
لوحة المكتبة                 client/src/pages/LibraryDashboard.tsx
متجر المكتبة                 client/src/pages/LibraryStore.tsx
المنتجات                     server/routes/library.ts
```

### 👨‍🏫 **Teachers & Marketplace**
```
تسجيل دخول المعلم             client/src/pages/TeacherLogin.tsx
لوحة المعلم                  client/src/pages/TeacherDashboard.tsx
بيع المهام                   server/routes/teacher.ts
أرصدة المعلمين              shared/schema.ts (teacher_balances)
السحب                        server/routes/teacher.ts
```

### 🎭 **Social Features**
```
نظام الصداقات                server/routes/social.ts
طلبات الصداقة                shared/schema.ts (friendships)
المتابعة (Follow)            shared/schema.ts (follows)
الملف الشخصي العام           client/src/pages/ChildPublicProfile.tsx
اكتشف الأطفال               client/src/pages/ChildDiscover.tsx
البحث الموحد                 server/routes/search.ts
```

### 🛠️ **Admin Panel**
```
لوحة التحكم الإدارية         client/src/pages/AdminDashboard.tsx
مراجعة المنتجات              client/src/components/admin/MerchantProductsReviewTab.tsx
إدارة المستخدمين            server/routes/admin.ts
الإحصائيات                   server/routes/admin.ts
Logs والتقارير              server/routes/admin.ts
```

### 🌐 **Localization & i18n**
```
ملفات الترجمة (3 لغات)       client/src/i18n/locales/*.json
نظام الترجمة                 client/src/i18n/
ترجمة الألعاب               client/public/games/*/i18n.js
RTL Support                 client/src/index.css
```

### ⚙️ **Settings & Configuration**
```
إعدادات التطبيق              server/routes/settings.ts
إعدادات الإشعارات           shared/schema.ts (notification policies)
إعدادات المهام              shared/schema.ts (tasks_settings)
إعدادات المتجر              shared/schema.ts (store_settings)
```

---

## 📁 الملفات الأساسية حسب الوظيفة

### 🖥️ Frontend Files

#### الصفحات الرئيسية
| الملف | الوظيفة | الـ Route |
|------|--------|---------|
| Home.tsx | الصفحة الرئيسية | `/` |
| ParentAuth.tsx | تسجيل الوالد | `/parent-auth` |
| ChildLink.tsx | ربط الطفل | `/child-link` |
| ParentDashboard.tsx | لوحة الوالد | `/parent-dashboard` |
| ChildTasks.tsx | مهام الطفل | `/child-tasks` |
| ChildGarden.tsx | شجرة النمو | `/child-garden` |
| AdminDashboard.tsx | لوحة الإدارة | `/admin` |

#### المكونات المهمة
| الملف | الوظيفة | الاستخدام |
|------|--------|----------|
| ChildAppWrapper.tsx | Wrapper الطفل | يحيط بـ app الطفل |
| GrowthTree.tsx | شجرة النمو | عرض وتحديث الشجرة |
| TaskCard.tsx | بطاقة المهمة | عرض مهمة واحدة |
| GameFrame.tsx | إطار اللعبة | تشغيل الألعاب |
| NotificationBell.tsx | جرس الإشعارات | عرض الإشعارات |

### 🔌 Backend APIs

#### الـ Routes الرئيسية
| الملف | الـ Endpoints | الوظيفة |
|------|-------------|--------|
| auth.ts | POST /register, /login, /otp | التحقق والمصادقة |
| family.ts | GET/POST children, parent-child | إدارة الأسرة |
| tasks.ts | GET/POST/PUT tasks | إدارة المهام |
| child.ts | POST /complete-game, /rewards | عمليات الطفل |
| store.ts | GET products, POST purchases | متجر الجوائز |
| payments.ts | POST /webhook/stripe | معالجة الدفع |
| admin.ts | GET stats, users | لوحة الإدارة |

### 💾 Database

#### الجداول الأساسية
| الجدول | الوصف | العمود الرئيسي |
|--------|------|--------------|
| parents | قائمة الوالدين | id, email |
| children | قائمة الأطفال | id, name |
| parent_child | العلاقة | parentId, childId |
| tasks | المهام | id, title |
| rewards | الجوائز | id, points |
| notifications | الإشعارات | id, childId |
| growth_tree_stages | مراحل الشجرة | id, stage |

---

## 🎯 حالات الاستخدام الشائعة

### "أنا بدور على [X]"

#### X = "كيف يسجل الوالد دخول"
```
docs/                       ← ابحث هنا عن "authentication"
├─ QUICK_REFERENCE.md       ← شوف "Parent Registration"
└─ ARCHITECTURE.md          ← راجع "Auth Flow"

ملفات الكود:
server/routes/auth.ts       ← الـ API
server/services/mailer.ts   ← إرسال OTP
client/src/pages/ParentAuth.tsx  ← الـ UI
```

#### X = "أضيف مهمة جديدة"
```
ملفات مرجعية:
docs/QUICK_REFERENCE.md  ← "Create a Task" section

ملفات الكود:
client/src/pages/ParentTasks.tsx     ← الـ form
server/routes/tasks.ts              ← الـ API
shared/schema.ts                    ← الجدول (tasks table)
```

#### X = "نظام الألعاب"
```
ملفات مرجعية:
docs/GAMES_MEMORY.md              ← شامل عن الألعاب
docs/GAME_EVALUATIONS.md          ← تقييم الألعاب
docs/CAT_KINGDOM_IMPLEMENTATION.md ← لعبة القطط

ملفات الكود:
client/src/pages/ChildGames.tsx    ← قائمة الألعاب
client/public/games/               ← الألعاب نفسها
server/routes/child.ts             ← POST /complete-game
```

#### X = "أصحح bug في الإشعارات"
```
ملفات مرجعية:
docs/NOTIFICATIONS_DEVELOPMENT_REFERENCE.md

ملفات الكود:
server/notificationHandlers.ts     ← منطق الإشعارات
server/services/notifications.ts   ← service
shared/schema.ts                   ← notification tables
```

---

## 📞 طلبات تحديدة

### "أنا بدور على Endpoint معين"

#### مثال: "أين الـ endpoint الخاص بإكمال مهام؟"
```
دي في: server/routes/child.ts
الملف: POST /api/child/complete-game
الوصف: يسجل إكمال الطفل لمهمة أو لعبة
```

#### أين أجد كل الـ Endpoints؟
```
اقرأ: docs/PROJECT_BLUEPRINT.md
يحتوي على: قائمة كاملة بـ 533+ endpoint
```

---

## 🔧 دليل التعديل السريع

### "أبغا أعدل [شيء معين]"

#### أبغا أعدل **اللون الأزرق**
```
ملف واحد:
client/src/index.css

البحث عن: @apply rules للـ blue
أو استخدم: Tailwind `blue-500` classes
```

#### أبغا أعدل **نص الـ Button**
```
1. ملفات الترجمة:
   client/src/i18n/locales/ar.json    ← النص العربي
   client/src/i18n/locales/en.json    ← النص الإنجليزي

2. الـ Component:
   client/src/components/*/Button.tsx ← الـ code
```

#### أبغا أضيف **صفحة جديدة**
```
1. أنشئ الملف:
   client/src/pages/NewPage.tsx

2. أضفها للـ router:
   client/src/App.tsx (حسب البنية)

3. اختبر:
   npm run dev
```

#### أبغا أضيف **API جديد**
```
1. أنشئ الملف:
   server/routes/newFeature.ts

2. سجله في:
   server/index.ts (import وإضافة route)

3. اختبر:
   npm run dev
   curl -X GET http://localhost:5000/api/new-endpoint
```

---

## 💡 نصائح سريعة

### Quick Tips
```
🔍 تحتاج تسأل؟
  ├─ اقرأ QUICK_REFERENCE.md أولاً
  └─ شوف أمثلة موجودة في الكود

🐛 تحتاج تصلح bug؟
  ├─ اقرأ رسالة الخطأ كاملة
  ├─ ابحث عن "error code" في الدوك
  └─ تتبع الـ stack trace

✨ تحتاج تضيف ميزة؟
  ├─ شوف ميزة شبيهة موجودة
  ├─ ادرس كودها
  └─ اعمل شبيهها

🔄 قبل ما تcommit:
  ├─ npm run check (TypeScript)
  ├─ npm run build  (Production Build)
  └─ npm run test   (Unit Tests)
```

---

## 📊 إحصائيات سريعة

| المقياس | العدد |
|--------|------|
| جداول قاعدة البيانات | 137 |
| Endpoints | 533+ |
| الصفحات | 53 |
| المكونات | 130+ |
| ملفات Routes | 24 |
| مفاتيح الترجمة | 1,700+ |
| اختبارات | 50+ |

---

**آخر تحديث**: مارس 2026  
**استخدام البحث**: اضغط `Ctrl+F` في متصفحك
