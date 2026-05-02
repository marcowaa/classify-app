# 📑 CLASSIFY — Documentation Index & Navigation
**الفهرس الشامل — Master Documentation Index**

> هذا الملف هو دليلك للعثور على أي معلومة في التوثيق

---

## 🎯 اختر مستواك

### للمبتدئين تماماً (0-3 شهور)
```
ابدأ هنا:
1. ✅ BEGINNERS_GUIDE.md           ← اقرأ أولاً (شرح سهل جداً)
2. ✅ DOCUMENTATION_HUB.md         ← الملف الرئيسي
3. ✅ QUICK_REFERENCE.md           ← 50+ مهمة شائعة

ثم:
4. DESIGN_ANALYSIS.md             ← فهم التصميم
5. SEARCH_MAP.md                  ← كيف تبحث عن أي شيء
```

### للمتوسطين (3-6 شهور)
```
اقرأ:
1. ✅ DOCUMENTATION_HUB.md         ← Review
2. ✅ ARCHITECTURE.md              ← البنية الكاملة
3. ✅ PROJECT_BLUEPRINT.md         ← كل الـ endpoints
4. ✅ QUICK_REFERENCE.md           ← طلب سريع

ثم:
5. docs/GAMES_MEMORY.md           ← نظام الألعاب
6. docs/NOTIFICATIONS_*            ← الإشعارات
```

### للمتقدمين (6+ شهور)
```
اقرأ:
1. ✅ ARCHITECTURE.md              ← كامل
2. ✅ PROJECT_BLUEPRINT.md         ← كامل
3. ✅ docs/GAMES_MEMORY.md         ← كامل
4. ✅ server/routes/* التفاصيل

ثم:
5. غص في الكود والـ PRs
6. ساهم في الميزات الكبيرة
```

---

## 📚 جميع الملفات التوثيقية

### 🟢 ملفات توثيق رئيسية (يجب قراءتها)

| الملف | الحجم | الوقت | الوصف |
|------|------|------|------|
| **BEGINNERS_GUIDE.md** | 📄 | 20 دقيقة | شرح سهل جداً للمشروع (START HERE) |
| **DOCUMENTATION_HUB.md** | 📄📄 | 30 دقيقة | المركز الموحد وخريطة الطريق |
| **DESIGN_ANALYSIS.md** | 📄📄 | 25 دقيقة | تحليل شامل للتصميم والـ UI |
| **SEARCH_MAP.md** | 📄 | 15 دقيقة | خريطة البحث السريع |
| **ARCHITECTURE.md** | 📄📄📄 | 45 دقيقة | البنية الكاملة مع رسومات |
| **QUICK_REFERENCE.md** | 📄📄 | 30 دقيقة | 50+ مهمة وأمثلة فورية |
| **PROJECT_BLUEPRINT.md** | 📄📄📄 | 40 دقيقة | خريطة كاملة بـ 150+ endpoint |

### 🟡 ملفات اختيارية (حسب احتياجك)

| الملف | الموضوع | الأولوية |
|------|--------|---------|
| docs/GAMES_MEMORY.md | نظام الألعاب الكامل | عالية |
| docs/NOTIFICATIONS_* | الإشعارات | متوسطة |
| docs/PAYMENT_FLOWS.md | معالجة الدفع | متوسطة |
| docs/SOCIAL_LOGIN_SETUP_GUIDE.md | OAuth | متوسطة |
| docs/DEPLOYMENT.md | النشر على VPS | منخفضة |
| docs/DEPLOYMENT_OPTIMIZATION.md | الأداء | منخفضة |

### 🔴 ملفات متقدمة (للمطورين فقط)

| الملف | الموضوع | الأولوية |
|------|--------|---------|
| FULL_PROJECT_ANALYSIS.md | تحليل عميق جداً | منخفضة |
| FULL-NAVIGATION-TREE.md | شجرة التنقل | منخفضة |
| docs/GAME_EVALUATIONS.md | تقييم الألعاب | منخفضة |
| docs/GARDEN_SMART_PLAN.md | تطوير الحديقة | منخفضة |
| docs/GEM_TELEMETRY_SPRINT*.md | تتبع الأداء | منخفضة |

---

## 🗂️ الملفات مرتبة حسب الموضوع

### 🔐 Authentication & Security
```
📄 BEGINNERS_GUIDE.md           → شرح أساسي
📄 QUICK_REFERENCE.md           → مثال سريع: "User Login"
📄 ARCHITECTURE.md              → تفاصيل كاملة
📄 PROJECT_BLUEPRINT.md         → جميع endpoints المتعلقة
📁 server/routes/auth.ts        → الكود الفعلي
```

### 👨‍👩‍👧‍👦 Family & Relationships
```
📄 BEGINNERS_GUIDE.md           → الفكرة العامة
📄 QUICK_REFERENCE.md           → "Link Child" و "Create Account"
📄 PROJECT_BLUEPRINT.md         → /family/* endpoints
📁 server/routes/family.ts      → الكود
📁 shared/schema.ts             → parentChild table
```

### 📋 Tasks Management
```
📄 QUICK_REFERENCE.md           → "Create Task", "Complete Task"
📄 ARCHITECTURE.md              → Tasks System
📄 PROJECT_BLUEPRINT.md         → /tasks/* endpoints
📁 client/src/pages/ChildTasks.tsx  → الواجهة
📁 server/routes/tasks.ts       → الـ API
```

### 🎮 Games
```
📄 DOCUMENTATION_HUB.md         → نظرة عامة
📄 DESIGN_ANALYSIS.md           → تحليل تصميم الألعاب
📄 docs/GAMES_MEMORY.md         → شامل جداً (أقرأ هذا!)
📄 docs/GAME_EVALUATIONS.md     → تقييم كل لعبة
📁 client/public/games/         → الألعاب نفسها
```

### 🏆 Rewards & Points
```
📄 QUICK_REFERENCE.md           → "Award Points", "Buy Rewards"
📄 ARCHITECTURE.md              → Rewards System
📄 PROJECT_BLUEPRINT.md         → /rewards/* endpoints
📁 server/routes/rewards.ts     → الـ API
📁 shared/schema.ts             → rewards table
```

### 🌱 Growth Tree
```
📄 DESIGN_ANALYSIS.md           → تصميم الشجرة
📄 docs/GARDEN_SMART_PLAN.md    → الخطة الكاملة
📄 PROJECT_BLUEPRINT.md         → /growth-tree/* endpoints
📁 client/src/pages/ChildGarden.tsx  → الواجهة
📁 client/src/components/GrowthTree.tsx  → المكون
```

### 💳 Payments
```
📄 docs/PAYMENT_FLOWS.md        ← أقرأ هذا
📄 docs/PAYMENT_PROVIDERS_EG.md ← معلومات مصر
📄 PROJECT_BLUEPRINT.md         → /payments/* endpoints
📁 server/routes/payments.ts    → الـ API
```

### 📢 Notifications
```
📄 docs/NOTIFICATIONS_DEVELOPMENT_REFERENCE.md  ← شامل
📄 PROJECT_BLUEPRINT.md         → /notifications/* endpoints
📁 server/notificationHandlers.ts               → المنطق
📁 server/services/notifications.ts             → الـ service
```

### 🏫 Schools System
```
📄 QUICK_REFERENCE.md           → نظرة عامة
📄 PROJECT_BLUEPRINT.md         → /schools/* endpoints
📁 server/routes/schools.ts     → الـ API
📁 client/src/pages/SchoolDashboard.tsx  → الواجهة
```

### 📚 Libraries System
```
📄 QUICK_REFERENCE.md           → نظرة عامة
📄 PROJECT_BLUEPRINT.md         → /libraries/* endpoints
📁 server/routes/library.ts     → الـ API
```

### 👨‍🏫 Teachers & Marketplace
```
📄 QUICK_REFERENCE.md           → نظرة عامة
📄 PROJECT_BLUEPRINT.md         → /teachers/* و /marketplace/* endpoints
📁 server/routes/teacher.ts     → الـ API
```

### 🎭 Social Features
```
📄 DOCUMENTATION_HUB.md         → نظرة عامة
📄 PROJECT_BLUEPRINT.md         → /social/* و /search/* endpoints
📁 server/routes/social.ts      → الـ API
```

### 🛠️ Admin Panel
```
📄 docs/ADMIN_CREDENTIALS.md    ← معلومات الدخول
📄 PROJECT_BLUEPRINT.md         → /admin/* endpoints
📁 client/src/pages/AdminDashboard.tsx  → الواجهة
📁 server/routes/admin.ts       → الـ API
```

### 🌐 Localization (i18n)
```
📄 BEGINNERS_GUIDE.md           → شرح الترجمة
📄 DESIGN_ANALYSIS.md           → الترجمة والتصميم
📁 client/src/i18n/locales/    → ملفات الترجمة (ar, en, pt)
📁 client/public/games/*/i18n.js  ← ترجمة الألعاب (25 لغة)
```

### 🚀 Deployment & DevOps
```
📄 docs/DEPLOYMENT.md           ← دليل الـ VPS
📄 docs/DEPLOYMENT_OPTIMIZATION.md  ← الأداء
📄 docs/DOCKER_PRODUCTION_RUNTIME_DATA.md  ← Docker
🐳 Dockerfile                   ← ملف Docker
📁 docker-compose.yml           ← orchestration
```

---

## 🔍 البحث السريع

### "أنا بدور على [X] بسرعة"

#### للمبتدئ
```
❓ X = "كيف المشروع يشتغل؟"
✅ اقرأ: BEGINNERS_GUIDE.md

❓ X = "أين [feature]؟"
✅ استخدم: SEARCH_MAP.md → ابحث عن keyword

❓ X = "مثال سريع عن [موضوع]"
✅ اقرأ: QUICK_REFERENCE.md
```

#### للمتوسط
```
❓ X = "أين endpoint معين؟"
✅ اقرأ: PROJECT_BLUEPRINT.md → ابحث بـ Ctrl+F

❓ X = "كيف الـ [feature] تتفاعل مع [feature أخرى]؟"
✅ اقرأ: ARCHITECTURE.md

❓ X = "أريد أتعلم عن [موضوع] كاملاً"
✅ اقرأ: docs/[SUBJECT]_*.md
```

#### للمتقدم
```
❓ X = "أين المشاكل المعروفة؟"
✅ شوف: GitHub Issues + docs/GEM_TELEMETRY_*.md

❓ X = "كيف أحسّن الأداء؟"
✅ اقرأ: docs/DEPLOYMENT_OPTIMIZATION.md

❓ X = "أين تتقاطع الأنظمة؟"
✅ ادرس: ARCHITECTURE.md الكامل + source code
```

---

## 📊 الإحصائيات

| المقياس | العدد | الملف |
|--------|------|------|
| جداول DB | 137 | shared/schema.ts |
| Endpoints | 533+ | PROJECT_BLUEPRINT.md |
| صفحات | 53 | ARCHITECTURE.md |
| مكونات | 130+ | client/src/components/ |
| ملفات Routes | 24 | server/routes/ |
| مفاتيح ترجمة | 1,700+ | client/src/i18n/ |
| لغات الألعاب | 25 | client/public/games/*/i18n.js |

---

## 🎯 Checklists

### قبل أن تبدأ العمل
- [ ] اقرأ BEGINNERS_GUIDE.md (1 ساعة)
- [ ] شغّل `npm run dev` (5 دقائق)
- [ ] افحص Home page (10 دقائق)
- [ ] جرّب functionality واحدة (20 دقيقة)

### قبل أن تكتب كود
- [ ] اقرأ QUICK_REFERENCE.md (الموضوع اللي تشتغل عليه)
- [ ] ابحث عن مثال موجود (10 دقائق)
- [ ] ادرس آخر code شبيه (30 دقيقة)
- [ ] اطلب clarification إذا لزم (ما تخمّن)

### قبل أن تommit
- [ ] اختبر الـ code محلياً (npm run dev)
- [ ] شغّل الاختبارات (npm run test)
- [ ] تفحص الأخطاء (npm run check)
- [ ] اقرأ الـ diff قبل الـ push

---

## 💡 نصائح ذهبية

1. **ابدأ من الصغير**: لا تحاول فهم كل شيء دفعة واحدة
2. **اتبع الأمثلة**: ابحث عن code شبيه وادرسه
3. **اسأل الأسئلة**: ما تتردد تسأل (في Comments أو Issues)
4. **اكتب الـ Comments**: لو شفت كود غير واضح، أضف comment تشرحه
5. **ساهم في الـ Docs**: لو حسّنت ملف دوك، ارفعه

---

## 🆘 تحتاج مساعدة؟

| الحالة | الحل |
|--------|------|
| "لا أفهم المشروع" | اقرأ BEGINNERS_GUIDE.md |
| "إيش معنى كلمة [technical]" | ابحث في GLOSSARY.md (إذا موجود) |
| "أين [feature]؟" | استخدم SEARCH_MAP.md |
| "أنا بدور على [code]" | ابحث في QUICK_REFERENCE.md |
| "أريد مثال" | شوف PROJECT_BLUEPRINT.md |
| "Bug أنا لقيته" | افتح GitHub Issue |

---

## 📈 مسار التعلم الموصى به

```
أسبوع 1:
├─ اقرأ BEGINNERS_GUIDE.md
├─ شغّل المشروع
└─ افهم التدفق

أسبوع 2:
├─ ادرس ملف component واحد
├─ ادرس ملف route واحد
└─ جرّب تغييرات صغيرة

أسبوع 3-4:
├─ أقرأ ARCHITECTURE.md
├─ تعلّم نظام واحد كاملاً
└─ أضف ميزة صغيرة

الشهر الثاني+:
├─ أقرأ PROJECT_BLUEPRINT.md
├─ اعمل على ميزات أكبر
└─ ساهم في الـ codebase
```

---

## 📞 جهات الاتصال والموارد

| المورد | الرابط |
|--------|--------|
| Repository | https://github.com/marcowaa/classify |
| Issues | https://github.com/marcowaa/classify/issues |
| Discussions | https://github.com/marcowaa/classify/discussions |
| Docs | `/docs` folder |

---

**آخر تحديث**: مارس 2026  
**الإصدار**: 2.0.1  
**صيانة**: منتظمة (على الأقل أسبوعياً)
