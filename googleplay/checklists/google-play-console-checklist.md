# Google Play Console — Complete Submission Checklist
## قائمة مراجعة شاملة لرفع Classify

> ✅ = مكتمل | ⬜ = معلّق | 🔴 = مطلوب قبل غيره

---

## المرحلة 0: التحضير الأولي

- [ ] 🔴 حساب Google Play Developer مفعّل ($25 رسوم تسجيل)
- [ ] 🔴 ملف AAB جاهز فعليًا (Binary حقيقي وليس Git LFS pointer فقط): `classify-googleplay-latest.aab`
- [ ] 🔴 Keystore موقّع: `classify-release.keystore` ✅ موجود
- [ ] 🔴 targetSdk = 35 أو أعلى (حسب متطلبات Google Play الحالية)
- [ ] 🔴 سياسة الخصوصية على الموقع تذكر بيانات الأطفال وCOPPA
- [ ] حسابات اختبارية للمراجعين جاهزة (راجع `policy/app-access-credentials.md`)
- [ ] تسجيل تطبيق جديد: Package name `com.classi_fy.twa`

---

## المرحلة 1: رفع التطبيق (Release)

- [ ] Upload AAB في Production track
- [ ] إضافة اسم الإصدار: `2.1.16`
- [ ] إضافة ملاحظات الإصدار العربية (راجع `release-notes/ar/`)
- [ ] إضافة ملاحظات الإصدار الإنجليزية (راجع `release-notes/en/`)
- [ ] مراجعة Pre-launch report (تقرير قبل الإطلاق)

---

## المرحلة 2: Main Store Listing — عربي

- [ ] اسم التطبيق: `Classify: تعليم وتحفيز الأطفال` (راجع `store-listing/ar/app-name.txt`)
- [ ] الوصف القصير (راجع `store-listing/ar/short-description.txt`)
- [ ] الوصف الطويل (راجع `store-listing/ar/full-description.txt`)
- [ ] رفع 8 لقطات هاتف (راجع `screenshots/phone/`)
- [ ] رفع 3 لقطات تابلت 7" (راجع `screenshots/tablet7/`)
- [ ] رفع 3 لقطات تابلت 10" (راجع `screenshots/tablet10/`)
- [ ] رفع Feature Graphic 1024×500 (راجع `feature-graphic/`)
- [ ] رفع أيقونة Hi-res 512×512 PNG

---

## المرحلة 3: Main Store Listing — إنجليزي

- [ ] أضف لغة English (en-US) للقائمة الرئيسية
- [ ] اسم التطبيق: `Classify: Kids Learning & Parental Control`
- [ ] الوصف القصير الإنجليزي
- [ ] الوصف الطويل الإنجليزي
- [ ] نفس لقطات الشاشة (أو لقطات بنصوص إنجليزية)

---

## المرحلة 4: App Content (Policy) — الترتيب مهم

**اتبع هذا الترتيب بالضبط:**

- [ ] 🔴 **Privacy Policy** → أضف رابط `https://classi-fy.com/privacy-policy`
- [ ] 🔴 **Ads** → "Does your app contain ads?" → **No**
- [ ] 🔴 **App Access** → أضف بيانات المراجعين (3 مجموعات)
- [ ] **Content Rating** → أكمل استبيان IARC (راجع `policy/content-rating-answers.md`)
- [ ] **Target Audience** → Ages 5-8 + Ages 9-12 + Adults (راجع `policy/target-audience.md`)
- [ ] **Data Safety** → أكمل النموذج (راجع `policy/data-safety-form.md`)
- [ ] **Families Policy** → Commit to Families Policy ✅ (اعرض الشارة)

---

## المرحلة 4.5: Payments Compliance (Google Play) — إلزامي قبل الإرسال

- [ ] 🔴 أي شراء **Digital goods / Digital services / Subscription** داخل التطبيق يستخدم Google Play Billing فقط
- [ ] 🔴 منع أي مسار دفع بديل (Wallet / External gateway) داخل Android للشراء الرقمي داخل التطبيق
- [ ] 🔴 تكامل BillingClient فعلي (ليس Hosted Checkout فقط)
- [ ] 🔴 التحقق من purchaseToken على الـ backend قبل منح الاستحقاق
- [ ] 🔴 منح الاستحقاق فقط عند الحالة `PURCHASED`
- [ ] 🔴 تنفيذ acknowledge/consume خلال المهلة المطلوبة (3 أيام)
- [ ] توثيق الاستثناءات الإقليمية رسميًا إذا طُبقت (مع مرجع policy واضح)

---

## المرحلة 5: Store Settings

- [ ] الفئة الرئيسية: **Education**
- [ ] الفئة الثانوية: **Parenting** (إذا متاحة)
- [ ] Tags (وسوم): Kids, Learning, Educational Games, Parental Control
- [ ] بريد الدعم: support@classi-fy.com
- [ ] الموقع الإلكتروني: https://classi-fy.com
- [ ] السعر: **Free**
- [ ] In-app purchases: **Yes** (Google Play Billing للدجيتال داخل Android)

---

## المرحلة 6: Custom Store Listings

- [ ] إنشاء CSL للخليج العربي (SA, UAE, QA, KW, BH, OM) → راجع `custom-listings/gulf-ar/`
- [ ] إنشاء CSL لشمال أفريقيا (EG, MA, DZ, TN, LY) → راجع `custom-listings/north-africa-ar/`

---

## المرحلة 7: النشر

- [ ] مراجعة كل الأقسام — يجب أن تكون جميعها ✅ خضراء
- [ ] اختر **Staged rollout**: ابدأ بـ **10%**
- [ ] أرسل للمراجعة
- [ ] مدة المراجعة: 3-7 أيام عادةً
- [ ] عند الموافقة: رفع إلى 20% → 50% → 100%

---

## المرحلة 8: ما بعد النشر (ASO مستمر)

- [ ] بعد أسبوع: راجع Acquisition Reports → أي كلمات بحث تجلب مستخدمين؟
- [ ] بعد أسبوعين: أطلق أول A/B test للأيقونة
- [ ] بعد شهر: راجع وحدّث الكلمات المفتاحية في الوصف
- [ ] بعد 50+ تقييم: تأكد التصنيف ≥ 4.2
- [ ] كل 4-6 أسابيع: حدّث الوصف بكلمات مفتاحية جديدة
- [ ] في الموسم الدراسي: حدّث Feature Graphic بتصميم موسمي
