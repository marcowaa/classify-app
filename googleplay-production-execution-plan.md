# خطة تنفيذ Google Play (إنتاجية/منضبطة) + قالب تقرير نهائي
> الهدف: نسخة التطبيق تتبني صح، تتوقع صح، وتشتغل فعليًا بامتثال قوي + تقرير واضح عن المشاكل والاقتراحات **بدون ترقيع**.

## 0) تعريف “جاهزية الإطلاق”
اعتبر الإصدار جاهز للإرسال فقط إذا اجتاز Gates الأربعة التالية:
1. **Build Gate**: AAB موقّع وجاهز + Gradle/Capacitor settings صحيحة + versionCode/versionName صحيحين.
2. **Billing Gate (Android)**: Google Play Billing native يعمل فعليًا + backend يتحقق + entitlement يُمنح فقط عند PURCHASED + acknowledge/consume مضبوط.
3. **Policy Gate (Play Console)**: الإفصاحات (خصوصًا Ads/Monetization/Children/Data Safety/App Access/Refunds) مطابقة 1:1 للواقع.
4. **Runtime Gate**: تشغيل فعلـي داخلي (Internal/Closed track) + مراقبة crashes/billing/login/ads endpoints + لا White screens.

---

## 1) Todo / Gates Checklist (للإدارة خلال التنفيذ)
### Gate 1: Android build + signing + artifacts
- [ ] تأكيد package name / appId من `capacitor.config.json` و `android/app/build.gradle`
- [ ] تأكيد `minSdkVersion/targetSdkVersion` من `android/variables.gradle`
- [ ] تأكيد `versionCode/versionName` من `android/app/build.gradle`
- [ ] تأكيد signing config release لا يعمل إلا بالمفاتيح المطلوبة (keystore)
- [ ] توليد AAB + تحقق من التوقيع (unsigned = fail)
- [ ] تحقق من وجود artifact فعليًا في المسارات المتوقعة
- [ ] (اختياري) تشغيل `release:verify-mobile-assets` / فحص mobile assets readiness

**مخرجات هذه المرحلة**
- [ ] تقرير “Build Evidence” (commands + نتائج)
- [ ] SHA256 checksums للأرتيفاكت + provenance manifest

---

### Gate 2: Google Play Billing (native) — End-to-End
#### 2.1 تأكيد التكامل من العميل
- [ ] `client/src/lib/nativeGooglePlayBilling.ts` يعمل على Android فعليًا (Plugin present)
- [ ] `client/src/pages/Wallet.tsx`:
  - [ ] يستعلم catalog عبر `/api/parent/google-play/products`
  - [ ] يطلق native purchase عبر plugin
  - [ ] يرسل `purchaseToken/orderId/packageName` إلى backend endpoint `/api/parent/google-play/complete-purchase`

#### 2.2 تأكيد التكامل من السيرفر
- [ ] Backend endpoint:
  - [ ] يرفض غير native Android
  - [ ] يتحقق من purchase عبر Google Play Developer API قبل منح wallet
  - [ ] لا يضيف credit إلا عند `purchaseStateLabel === "purchased"`
  - [ ] يدير acknowledge/consume للـ consumable
  - [ ] يمنع duplicate credit عبر `googlePlayPurchases.purchaseToken` (idempotency)
- [ ] تأكيد `googlePlayBillingService.ts` يقرأ منتجات wallet catalog بشكل صحيح

#### 2.3 فحص SKU نوع المنتج
- [ ] التأكد أن المنتجات المستخدمة للـ wallet top-up هي **INAPP** فقط (لأن plugin يطلب `ProductType.INAPP`)
- [ ] لو يوجد اشتراكات (Subscriptions) داخل Google Play:
  - [ ] إما (أ) تمنعها من هذا المسار أو (ب) توسع plugin لدعم SUBSCRIPTION + منطق active entitlement
  - [ ] تحديث `queryProducts` و backend logic طبقًا لذلك

**مخرجات هذه المرحلة**
- [ ] “Billing Evidence”:
  - [ ] Purchase success flow
  - [ ] Acknowledge/consume observed
  - [ ] Wallet credited once (duplicate token test)

---

### Gate 3: Play Console Policy (Blocking/High risk)
#### 3.1 بند Ads (Blocking)
- [ ] قرار واضح: **هل تطبيقك يعرض Ads؟**
  - يوجد في الكود:
    - [x] UI Ads carousel (`SlidingAdsCarousel.tsx`)
    - [x] Backend ads endpoints (`server/routes/ads.ts`)
    - [x] click/view + watch/cooldown + pointsReward للأطفال
- [ ] بالتالي لازم مواءمة Play Console questionnaire:
  - [ ] إن كانت Ads: اجعل “Ads = Yes” + صِف نوعها بما يتوافق مع الاستبيان
  - [ ] إن لم تكن Ads: يجب تعديل السلوك/التسميات/الآليات بحيث لا تُقرأ كإعلانات (هذا غالبًا أكبر من مجرد تحديث نصوص)

> في هذه الجولة، بما أن “Ads” موجودة فعليًا، فالتوجه الإنتاجي: **اعتبرها Ads بشكل صريح** واطابق الإفصاحات بدل تحويلها ترقيع.

#### 3.2 بند Children / Families / Incentives
- [ ] مراجعة “Target Audience” والـ “App Content”:
  - [ ] أي محتوى/سلوك موجه للأطفال
  - [ ] هل reward بالـ points مرتبط بالـ ads؟ (مهم للسياسات)
- [ ] تعديل Store text/Experience claims إن لزم (لكن دون كذب على الواقع)

#### 3.3 بند Data Safety + Privacy Policy Alignment
- [ ] استخراج “فعليًا” ما الذي يتم جمعه:
  - [ ] auth/login بيانات
  - [ ] analytics/events
  - [ ] push subscriptions (web push + mobile push)
  - [ ] payments/billing tokens (ليست بيانات شخصيـة لكن التعامل حساس)
  - [ ] child data fields (birthday/age/group etc.)
- [ ] التأكد أن Data Safety form يطابق الواقع
- [ ] التأكد أن Privacy Policy يغطي:
  - [ ] الأطفال/الوالدين
  - [ ] الغرض من البيانات
  - [ ] المشاركة/المعالجة (تخزين/تحليل)
  - [ ] الاحتفاظ
  - [ ] الروابط/التفاصيل الخاصة بـ ads & incentives إذا موجودة

#### 3.4 App Access
- [ ] توفير حساب/خطوات مراجعين يمرّ للميزة الأساسية بسرعة (<60s)
- [ ] منع/تقييد الوصول غير اللازم
- [ ] التأكد من “fallback للشبكة” وعدم وجود white screen

#### 3.5 Refund/Billing Disclosures (Payments transparency)
- [ ] التأكد من أن صفحات داخل التطبيق (مثل RefundPolicy) تطابق واقع:
  - [ ] Google Play refunds تتم عبر Play مع سياسة Play
  - [ ] cancellation/subscription details إن وجدت
- [ ] إن كان التطبيق Free لكن يحتوي عمليات شراء داخل التطبيق: الإفصاح لازم يكون دقيق

**مخرجات هذه المرحلة**
- [ ] “Policy Evidence Pack”:
  - [ ] Screenshots/exports من Play Console
  - [ ] قائمة mismatch واضحة بين (Form/Policy text) و (Code behavior)

---

### Gate 4: Runtime validation — Internal/Closed track
- [ ] بناء Internal test release
- [ ] تدقيق:
  - [ ] login
  - [ ] child flow
  - [ ] parent flow
  - [ ] wallet top-up flow
  - [ ] ads watch/click flow
  - [ ] push permissions recovery
- [ ] مراقبة:
  - [ ] crashes
  - [ ] billing failures
  - [ ] ads endpoint errors
  - [ ] API latency/p95/p99 للـ purchase completion

**مخرجات هذه المرحلة**
- [ ] “Runtime Evidence” + جدول hotspots + remediation status

---

## 2) قالب التقرير النهائي (Final Report Template)
### 2.1 Executive Summary
- [ ] نتيجة Gates الأربعة
- [ ] هل الإصدار Go/No-Go للإرسال؟ ولماذا

### 2.2 System of Record (ما الذي تم فحصه)
- [ ] `capacitor.config.json`, `android/app/build.gradle`, `android/app/src/main/AndroidManifest.xml`
- [ ] Billing plugin: `GooglePlayBillingPlugin.java`, `MainActivity.java`
- [ ] Backend verify: `server/services/payments/googlePlayBillingService.ts`
- [ ] Billing endpoint: `server/routes/parent.ts` (complete-purchase)
- [ ] Ads presence: `client/src/components/SlidingAdsCarousel.tsx`, `server/routes/ads.ts`

### 2.3 Findings (مرتبة حسب الخطورة)
نفس النمط:
- **[Blocking]** عنوان المشكلة
  - دليل من الكود/الملف:
  - لماذا هذا يمنع الموافقة:
  - Fix (إجراء إنتاجي نهائي):
  - Risk after fix:
  - Verification step:
- **[High]** …
- **[Medium]** …
- **[Low]** …

### 2.4 Action Plan (Sprint/Phases)
- Phase A: “Blocking fixes only”
- Phase B: “High fixes”
- Phase C: “Policy parity + runtime stabilization”
- Phase D: “Submission checklist complete + Evidence pack”

### 2.5 Verification Checklist (قبل Submit)
- [ ] AAB signed verified
- [ ] Billing purchase flow tested
- [ ] Ads flow consistent with Ads declaration
- [ ] Data Safety + Privacy Policy aligned
- [ ] App Access instructions validated with reviewer test device/account
- [ ] Pre-launch report reviewed (if available)

---

## 3) ما الذي نبدأ به الآن (المرحلة الأولى: Blocking)
بناءً على الفحص الحالي:
1) **Ads: Blocking mismatch محتمل**  
   - يوجد ads system + watch/click + links  
   - إذن العمل الصحيح: مواءمة Play Console “Ads” بالإفصاحات (أو تعديل السلوك لو كان قراركم أنه ليس Ads).

2) **إن كانت هناك SKUs subscriptions**  
   - plugin يطلب INAPP فقط → لازم تأكيد SKU type في catalog.

> الخطوة التالية الإنتاجية: نحدّد قرار الفريق:
- هل سيتم اعتبار “ads” فعليًا Ads في Play Console؟  
- أم سيتم إعادة هندسة ads flow ليكون promotions داخلية غير إعلانية؟

(هذه ليست “مهمة ترقيع”؛ القرار يحدد مسار كامل.)
