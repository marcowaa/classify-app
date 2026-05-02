# 🎓 CLASSIFY — Beginner's Guide to Project Structure
**دليل المبتدئ لفهم بنية المشروع — الشرح بأبسط طريقة**

> هل أنت جديد تماماً على المشروع؟ ابدأ من هنا. سنشرح كل شيء كما لو أنك في روضة أطفال! 😊

---

## 🤔 المشروع بأبسط طريقة

### الفكرة الأساسية

تخيل معي **مدرسة حقيقية**:
```
المدرسة = Classify Platform
├─ الوالدين = Parents (يشرفون على الأطفال)
├─ الأطفال = Children (يحلون المهام)
├─ المعلمين = Teachers (يضعوا المهام)
├─ المدير = Admin (يدير كل شيء)
└─ المكتبة = Library (توفر موارد)
```

### ماذا يحدث يومياً؟

```
1. الوالد يفتح الموقع
   ↓
2. ينشئ مهام للطفل (مثلاً: "اقرأ 10 صفحات")
   ↓
3. الطفل يدخل تطبيقه
   ↓
4. يشوف المهام ويكملها
   ↓
5. يحصل على نقاط (مثل النجوم في المدرسة)
   ↓
6. يحول النقاط لجوائز من المتجر
   ↓
7. شجرته "تنمو" كلما إكمل أكتر!
```

---

## 📁 أين كل شيء؟ — Project Folders Made Simple

### الـ Main Folders

```
classiv3-main/                    ← المشروع الأساسي
│
├─ client/                        ← الجزء اللي يشوفه الناس في الموقع
│  └─ src/                        ← الكود الفعلي للموقع
│     ├─ pages/                   ← الصفحات (Home, Dashboard, etc)
│     ├─ components/              ← الأجزاء الصغيرة (زر، بطاقة، الخ)
│     ├─ i18n/                    ← الترجمة (عربي، إنجليزي)
│     └─ games/                   ← الألعاب
│
├─ server/                        ← الجزء الخفي (يشتغل على السيرفر)
│  ├─ routes/                     ← الـ APIs (الأوامر)
│  ├─ services/                   ← الخدمات (بريد، SMS، الخ)
│  └─ middleware/                 ← حراس الأمان
│
├─ shared/                        ← الأشياء المشتركة بين client و server
│  └─ schema.ts                   ← وصف قاعدة البيانات
│
└─ docs/                          ← التوثيق والشروحات
```

### كل folder يعني إيه؟

#### 🖥️ `client/src/pages/`
```
هذي أين كل الصفحات:
├─ Home.tsx               ← الصفحة الرئيسية (الصفحة الأولى اللي تشوفها)
├─ ParentAuth.tsx         ← تسجيل دخول الوالد
├─ ChildTasks.tsx         ← صفحة مهام الطفل
├─ ChildGarden.tsx        ← صفحة شجرة النمو
├─ AdminDashboard.tsx     ← صفحة الإدارة
└─ ... (50+ صفحة أخرى)

كل ما تنقر على رابط، تتحول إلى صفحة من هنا.
```

#### 🧩 `client/src/components/`
```
هذي أين الأجزاء الصغيرة:
├─ admin/                 ← مكونات الإدارة
├─ child/                 ← مكونات الطفل
├─ parent/                ← مكونات الوالد
├─ ui/                    ← أزرار، نماذج، الخ
├─ GrowthTree.tsx         ← شجرة النمو
├─ TaskCard.tsx           ← بطاقة المهمة الواحدة
└─ ... (100+ مكون)

مثلاً: زر "إكمل" في ChildTasks.tsx موجود هنا.
```

#### 🎮 `client/public/games/`
```
الألعاب موجودة هنا:
├─ cat-kingdom/          ← مملكة القطط (لعبة تعليمية)
├─ memory-game/          ← لعبة التذكر
└─ ... (ألعاب أخرى)

كل لعبة فيها:
  ├─ index.html          ← الصفحة الرئيسية
  ├─ styles.css          ← الألوان والتصميم
  ├─ game.js             ← كود اللعبة
  └─ i18n.js             ← الترجمة (25 لغة!)
```

#### 🔌 `server/routes/`
```
هذي حيث الأوامر (APIs):
├─ auth.ts               ← تسجيل الدخول والخروج
├─ tasks.ts              ← كل شيء عن المهام
├─ child.ts              ← الأوامر الخاصة بالطفل
├─ payments.ts           ← معالجة الدفع
├─ admin.ts              ← أوامر الإدارة
└─ ... (20+ ملف)

مثلاً: عندما تضغط "إكمل المهمة"، يرسل طلب لـ server/routes/child.ts
```

#### 📊 `shared/schema.ts`
```
هذا أين نوصف قاعدة البيانات:

مثلاً:
export const children = pgTable("children", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age"),
  parentId: varchar("parent_id").references(() => parents.id),
  // ... 20 أعمدة أخرى
});

يعني: كل طفل عند له:
  - id (رقم فريد)
  - name (الاسم)
  - age (العمر)
  - parentId (إشارة للوالد)
```

---

## 🔄 تدفق البيانات — How Data Flows

### مثال عملي: إكمال مهمة

```
1. الطفل يضغط "إكمل المهمة" ✓
   ↓ (يحدث في: client/src/pages/ChildTasks.tsx)

2. الموقع يرسل طلب إلى السيرفر
   ↓ (POST /api/child/complete-game)

3. السيرفر يستقبل الطلب
   ↓ (يحدث في: server/routes/child.ts)

4. السيرفر يفحص:
   ├─ هل الطفل فعلاً موجود؟
   ├─ هل المهمة موجودة؟
   └─ هل الوقت سليم؟
   ↓

5. إذا كل شيء تمام، السيرفر يحفظ البيانات
   ↓ (في قاعدة البيانات: shared/schema.ts)

6. السيرفر يرد برسالة نجاح
   ↓ (response: { success: true, points: 10 })

7. الموقع يحدث التصميم
   ├─ يضيف النقاط
   ├─ يظهر رسالة نجاح
   └─ وربما animation جميلة!
```

### مثال آخر: تسجيل دخول الوالد

```
1. الوالد يكتب البريد والكلمة السرية
   ↓

2. نقر "تسجيل الدخول"
   ↓

3. الموقع يرسل:
   POST /api/auth/login
   { email: "parent@email.com", password: "****" }
   ↓

4. السيرفر يفحص:
   ├─ هل البريد موجود؟ (يبحث في جدول parents)
   ├─ هل الكلمة السرية صحيحة؟ (bcrypt comparison)
   └─ هل الوالد ممنوع؟ (failed_login_attempts)
   ↓

5. إذا كل شيء تمام:
   ├─ يعطيك JWT token (بطاقة دخول)
   ├─ يحفظ بطاقتك في المتصفح
   └─ يحيلك للـ dashboard
   ↓

6. من الآن، كل طلبك فيه البطاقة
   (بدون ما تكتب البريد والكلمة السرية مرة أخرى)
```

---

## 🎯 أين أجد إجابتي؟

### "أنا أبحث عن [X]"

#### X = كيف يسجل الطفل دخول
```
اقرأ:
1. QUICK_REFERENCE.md  → "Child Login Flow"
2. ARCHITECTURE.md     → "Authentication"

في الكود:
1. client/src/pages/ParentAuth.tsx  ← الصفحة
2. server/routes/auth.ts             ← الـ API
```

#### X = كيف يكمل الطفل المهمة
```
اقرأ:
1. QUICK_REFERENCE.md  → "Task Completion"

في الكود:
1. client/src/pages/ChildTasks.tsx  ← الصفحة
2. server/routes/child.ts (POST /complete-game)  ← الـ API
3. shared/schema.ts (tasks, task_completions)    ← الجداول
```

#### X = أين الألعاب
```
اقرأ:
1. docs/GAMES_MEMORY.md

في الكود:
1. client/public/games/cat-kingdom/  ← اللعبة نفسها
2. client/src/pages/ChildGames.tsx   ← قائمة الألعاب
```

#### X = كيف يعمل المتجر
```
اقرأ:
1. QUICK_REFERENCE.md  → "Store System"

في الكود:
1. client/src/pages/ChildStore.tsx  ← الواجهة
2. server/routes/store.ts           ← الأوامر
3. shared/schema.ts (store_products)  ← البيانات
```

---

## 💻 التكنولوجيا بطريقة سهلة

### Frontend (الجزء اللي تشوفه)

```
React = مكتبة تعرف كيف ترسم الموقع
TypeScript = JavaScript + فحص أخطاء (قبل ما توقع بك)
Tailwind = نظام ألوان وتصاميم جاهزة

مثال React component:
┌─────────────────────────────────────┐
│ export function TaskCard() {        │
│   return (                          │
│     <div className="green">         │ ← Tailwind colors
│       <h2>اسم المهمة</h2>          │
│       <button>إكمل</button>         │
│     </div>                          │
│   );                                │
│ }                                   │
└─────────────────────────────────────┘
```

### Backend (الجزء الخفي)

```
Node.js = إطار عمل JavaScript للسيرفر
Express.js = نظام يحول الطلب لعمل معين
PostgreSQL = قاعدة بيانات (حفظ البيانات)
Drizzle ORM = كتابة SQL بطريقة آمنة

مثال API endpoint:
┌──────────────────────────────────────┐
│ app.post("/api/tasks", (req, res) => {│
│   // Save task to database           │
│   // Return success message         │
│ });                                  │
└──────────────────────────────────────┘
```

---

## 🚀 الخطوات الأولى للمبتدئ

### أسبوع واحد: تعلم الأساسيات

```
اليوم 1-2: اقرأ التوثيق
├─ هذا الملف (Beginner's Guide)
├─ DOCUMENTATION_HUB.md
└─ DESIGN_ANALYSIS.md

اليوم 3: شغل المشروع محلياً
├─ npm install
├─ npm run dev
└─ افتح http://localhost:5173

اليوم 4-5: استعرض الصفحات
├─ اضغط على الروابط
├─ جرب كـ والد (signup + login)
└─ جرب كـ طفل

اليوم 6-7: ادرس کود صفحة واحدة
├─ اختر صفحة (مثل Home.tsx)
├─ اقرأ الـ code سطر سطر
├─ ابحث عن الأماكن الصعبة
└─ اسأل ChatGPT عنها
```

### الأسبوع الثاني والثالث: تغييرات بسيطة

```
جرب:
1. غير لون زر واحد
   ├─ ابحث عن className="bg-blue-500"
   └─ غيّره إلى bg-red-500

2. غير نص في الترجمة
   ├─ افتح client/src/i18n/locales/ar.json
   └─ ابحث عن "welcome" وغيره

3. أضف صفحة جديدة بسيطة
   ├─ انسخ Home.tsx
   └─ طورها حسب احتياجك
```

---

## 📚 الملفات الموصى بها حسب المستوى

### 🟢 للمبتدئين جداً (Start Here)
1. هذا الملف (Beginner's Guide)
2. DOCUMENTATION_HUB.md
3. DESIGN_ANALYSIS.md

### 🟡 للمتوسطين (Next Level)
1. QUICK_REFERENCE.md
2. ARCHITECTURE_SIMPLE.md (لو موجود)
3. أي ملف routes معين (مثل auth.ts)

### 🔴 للمتقدمين (Go Deep)
1. ARCHITECTURE.md
2. PROJECT_BLUEPRINT.md
3. كل ملفات /server و /shared

---

## 🎉 الخلاصة

| المفهوم | الشرح البسيط |
|--------|-----------|
| Frontend | الجزء اللي تشوفه (المواقع والتطبيقات) |
| Backend | الجزء الخفي (السيرفر والأوامر) |
| Database | مستودع البيانات (الملفات المحفوظة) |
| API | الجسر بين Frontend و Backend |
| Component | قطعة صغيرة من الموقع (زر، بطاقة، الخ) |
| Page | صفحة كاملة |
| Routing | نظام الروابط وتنقل الصفحات |

---

## ❓ أسئلة شائعة

### س: كيف أبدأ البرمجة على المشروع؟
**ج:** 
1. اقرأ هذا الملف
2. اشتغل `npm run dev`
3. ادرس صفحة واحدة
4. غيّر شيء بسيط
5. زود التعقيد تدريجياً

### س: أين أجد الأخطاء؟
**ج:** 
1. في terminal عند تشغيلك
2. في console المتصفح (F12)
3. راجع رسالة الخطأ سطر سطر

### س: كيف أختبر تغييري؟
**ج:** 
1. احفظ الملف
2. الموقع يحدّث نفسه تلقائياً (hot reload)
3. الشاشة تتغير مباشرة

### س: كيف أرفع تغييراتي؟
**ج:** 
```bash
git add .
git commit -m "وصف التغيير"
git push
```

---

**هل تحتاج شرح أكثر؟** اقرأ الملفات الأخرى أو اسأل في قسم التعليقات!

**آخر تحديث**: مارس 2026
