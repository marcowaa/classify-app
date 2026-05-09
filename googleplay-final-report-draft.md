# Google Play — تقرير نهائي (مسودة إنتاجية) + خطة تنفيذ مُحكمة

> هذا التقرير مبني على فحص **الكود والملفات التي تم قراءتها في هذه الجلسة** فقط.  
> أي جزء “لم يتم التحقق منه بعد” تم وضعه بوضوح كـ **Verification Pending** حتى لا يحدث “ترقيع”.

## 0) Executive Summary (القرار)
- **Build/Signing + إصدار AAB وتهيئة Android (SDK=35)**: **Pass (Build Evidence متاح محليًا)** لأن:
  - binaries موجودة في `client/public/apps/`:
    - `classify-app-latest.apk`
    - `classify-googleplay-latest.aab`
  - `client/public/apps/latest-release.json` يحتوي `provenance.signedAabVerified=true` مع:
    - `releaseTag=v2026.04.19-b1776553474`
    - `version=2026.04.19`, `buildNumber=1776553474`, `versionCode=1776553474`
  - checksums موجودة في `client/public/apps/checksums-latest.txt`
- **Google Play Billing (Android) — تكامل end-to-end (Client + Plugin + Backend Verification)**: **قوي/موجود كمنطق** (تمت مراجعته من الكود)، لكن يلزم Evidence runtime من build/install فعلية داخل مسار Play testing.
- **Policy/Compliance — بند Ads**: **Blocking/High Risk** لأن التطبيق يحتوي على نظام “Ads” فعلي + Carousel + endpoints + watch/click + rewards للأطفال (قرار Ads يجب توثيقه/مواءمته مع Play Console questionnaire).

### Go/No-Go
- **No-Go للإرسال الآن** إلى أن يتم حل **Ads declaration vs الواقع** (مع Evidence من Play Console questionnaire).
- بعد حل Ads declaration: ننتقل مباشرة لـ Verification Pending items (Data Safety parity, App Access evidence, SKU types check, runtime checks).

---

## 1) System of Record (مصادر الحقيقة التي استندنا لها)
### 1.1 Android/Capacitor identifiers + signing & config
- `capacitor.config.json`
  - `appId`: `com.classi_fy.twa`
  - `overrideUserAgent`: `Classify-Android/2.1.0`
- `android/variables.gradle`
  - `minSdkVersion=23`, `compileSdkVersion=35`, `targetSdkVersion=35`
- `android/app/build.gradle`
  - `applicationId="com.classi_fy.twa"`
  - `versionCode/versionName` تُقرأ من env مع defaults
  - signing release مشروط بوجود keystore properties (good for “unsigned release prevention”)

### 1.2 Android manifest & permissions
- `android/app/src/main/AndroidManifest.xml`
  - permissions:
    - `INTERNET`, `ACCESS_NETWORK_STATE`, `CAMERA`, `POST_NOTIFICATIONS`, `VIBRATE`, `RECEIVE_BOOT_COMPLETED`
    - `com.android.vending.BILLING`

### 1.3 Google Play Billing implementation (native + backend verify)
- Client:
  - `client/src/lib/nativeGooglePlayBilling.ts`
    - Plugin `GooglePlayBilling`
    - `queryProducts(productIds)` + `purchaseProduct(productId, accountObfuscationId?)`
- UI flow:
  - `client/src/pages/Wallet.tsx`
    - يستعلم catalog من: `GET /api/parent/google-play/products`
    - يطلق purchase native ثم يرسل إلى:
      - `POST /api/parent/google-play/complete-purchase`
- Backend verification:
  - `server/services/payments/googlePlayBillingService.ts`
    - verifies purchase token using Google Android Publisher API
    - acknowledges consumables and consumes when `configuredProduct.consumable && consumptionStateLabel !== "consumed"`
  - `server/routes/parent.ts`
    - endpoint `/api/parent/google-play/complete-purchase`
    - credits wallet **only if** `purchaseStateLabel === "purchased"`
    - checks obfuscated account mapping
    - idempotency via `googlePlayPurchases` and unique purchase token logic

### 1.4 Ads system — evidence of “Ads exist”
- `client/src/components/SlidingAdsCarousel.tsx`
  - UI carousel
  - fetches from: `/api/ads?audience=${audience}`
  - triggers:
    - `/api/ads/:id/view`
    - `/api/ads/:id/click`
- Backend ads:
  - `server/routes/ads.ts`
    - `/child/ads` + `/child/ads/:adId/watch` (reward + cooldown + daily cap)
    - `/parent/ads`
    - `/parent/ads/:adId/watch`
    - admin endpoints for creating ads

---

## 2) Findings — Problems & Fixes (مرتبة حسب الخطورة)

### [Blocking] Problem 1 — Ads declaration mismatch (Play Console vs actual behavior)
**Evidence**
- يوجد في التطبيق “Ads” فعلًا:
  - UI: `SlidingAdsCarousel` + watch/click tracking + external link opening
  - Backend: `server/routes/ads.ts` يعرّف watch/click/pointsReward للأطفال
- بينما توجد وثيقة project guide تشير لـ **Ads: No** كشرط (غير متأكد هل هي افتراضية/قديمة أم تمثل قرار الفريق).

**لماذا Blocking؟**
- في Google Play questionnaire، “Ads” إذا كانت غير صحيحة قد تؤدي إلى:
  - رفض قبل نشر
  - طلب تعديل policy/data safety/children sections
  - تراكم ملاحظات تمنع الموافقة

**Fix (إجراء إنتاجي نهائي — اختر مسار واحد)**
- المسار A (الأصح وفق الواقع):  
  1) في Play Console اجعل **Ads = Yes**  
  2) حدّد نوع الإعلان في الاستبيان بحسب الواقع (وأي reward incentives)  
  3) راجع “Families/Children” + “Data Safety” بما يتوافق مع نظام Ads/links/rewards
- المسار B (لو فريقكم لا يريد Ads):  
  1) أوقف/أزل flows التي تُقرأ كإعلانات:
     - إزالة Carousel + endpoints view/click/watch
     - إزالة `linkUrl` الخارجية من ads أو استبدالها بتجارب داخلية بدون incentive
  2) ثم عدّل Play Console إلى Ads = No

**Verification Pending**
- لا يمكن اعتبارها “محلولة” قبل Evidence من Play Console screenshot/exports:
  - قيمة Ads declaration
  - أي رد من Play Console pre-launch checks

---

### [High] Problem 2 — Rewarded ad behavior للأطفال (watch → pointsReward)
**Evidence**
- `server/routes/ads.ts`:
  - `pointsReward`, `watchDurationSeconds`
  - daily cap + cooldown + server-side completion validation
- UI Carousel يسهّل مشاهدة/ضغط.

**المخاطر**
- سياسات الأطفال + incentive mechanisms قد تُقرأ كـ “rewarded ads” أو “incentivized behavior”.
- حتى لو نقاط ليست “مال/subscription”، فالسلوك التحفيزي مع الأطفال حساس جدًا في المراجعة.

**Fix**
- اجعل وصف Store listing + Data Safety + App content دقيق:
  - هل هذه rewards “marketing/incentives”؟
  - هل يوجد روابط خارجية؟
- من الناحية المنتجية:
  - قلّل أو أوقف المكافآت إذا كانت تعتبر “rewarded ads”.
  - اجعل أي incentives داخل نموذج “progress rewards” للتعليم فقط، وليس نتيجة إعلان.

**Verification Pending**
- Pre-launch report + أي ملاحظات في “App content / Families / Ads & Promotions” بعد تحديث Play Console.

---

### [High] Problem 3 — فتح روابط خارجية من داخل Ads UI
**Evidence**
- `client/src/components/SlidingAdsCarousel.tsx`:
  - ما زال يعمل tracking:
    - `POST /api/ads/:id/view`
    - `POST /api/ads/:id/click`
  - لكن عندما `audience === "children"`:
    - يتم `return` قبل أي `window.open(...)` (أي لا يوجد outbound navigation للأطفال)
    - ويختفي indicator “view details” حتى لو `ad.linkUrl` موجود
- في `shared/schema.ts` جدول `ads` يحتوي `linkUrl`، و`/api/ads` يرجع `filteredAds` كما هي (بنفس الحقول).

**المخاطر**
- بدون guard، الروابط الخارجية للأطفال قد تؤدي لعدم تطابق مع Families/Ads policies.
- مع guard الحالي، الـ outbound navigation متوقف للأطفال لكن ما زال يلزم Evidence Runtime للتأكد على أجهزة حقيقية.

**Fix**
- ✅ For children path (الحل المنفّذ فعليًا):
  - Block outbound external navigation في الـ UI فقط لـ `audience="children"`
  - Keep analytics/tracking endpoints (view/click/share) شغّالة
  - Hide external “view details” affordance for children
- For parents/all path:
  - ترك السلوك كما هو (لأنه ليس path الأطفال)

**Verification Pending**
- في الكود الحالي داخل `client/src`:
  - `Home.tsx` يمرّر `audience="all"`
  - `Wallet.tsx` يمرّر `audience="parents"`
  - لم يتم العثور على أي تمرير/استخدام لـ `audience="children"` (لا كـ literal ولا عبر prop passing نصيًا)
- بالتالي: مسار الـ Ads للأطفال غير “wired” في الـ routes الحالية، لذا لا يلزم runtime evidence لمسار Home→Ads للأطفال في النسخة الحالية.
- مع ذلك: تم تنفيذ الـ guard داخل `SlidingAdsCarousel` لمنع `window.open` إذا تم تفعيل `audience="children"` لاحقًا، مع استمرار tracking عبر `POST /api/ads/:id/view` و`POST /api/ads/:id/click`.

---

### [High] Problem 4 — SKU/Product type alignment مع Billing plugin
**Evidence**
- Android plugin يفرض:
  - `queryProducts` يستخدم `ProductType.INAPP` فقط
- Backend complete-purchase يعامل المنتجات كـ wallet top-up مع flags `consumable`.

**الخطر**
- إن كان داخل Google Play product catalog توجد Subscriptions أو SKUs غير INAPP، فقد يحدث:
  - mismatch query أو purchase failure
  - أو policy mismatch (Data Safety/Payments claims)
  
**Fix**
- قبل الإرسال:
  - تأكيد أن جميع `googlePlayWalletProducts` في `appSettings` (أو ENV) هي INAPP + consumable/one-time sesuai
  - إن كان فيه subscriptions فعلًا: توسيع plugin + backend support (ProductType SUBSCRIPTION) أو تعطيلها من catalog للمسار الحالي.

**Verification Pending**
- مطلوب فحص catalog فعلي/قائمة productIds:
  - `googlePlayWalletProducts` setting value في DB/ENV

---

### [Medium] Problem 5 — “Ads: No” موجودة في guide كشرط (قابل أن يكون outdated)
**Evidence**
- `googleplay/checklists/google-play-console-checklist.md` يتضمن قسم Ads compliance مع شرط “Ads: No” ضمن “مرحلة 4 App Content”.
  
**Fix**
- تحديث الوثيقة/الـ checklist لتطابق قرار الفريق الواقعي (A أو B).
- عدم ترك guide يصنع false confidence.

**Verification Pending**
- مراجعة داخلية: هل الدليل تم إنشاؤه قبل ظهور نظام ads؟ أم هو خطأ؟

---

### [Medium] Problem 6 — Data Safety parity (لم يتم استخراج كل حقول جمع البيانات)
**Evidence**
- لدينا إشارات:
  - push subscriptions (web/mobile)
  - payments tokens (billing verification)
  - child profile fields (age/birthday etc.) تظهر في صفحات
  - ads watch history + points earn

**لكن**
- في هذه الجولة لم يتم استخراج “قائمة بيانات” نهائية من:
  - app analytics providers
  - exact payload for events
  - exact DB fields saved from Ads watch
  - how much personal data in/out for push/mobile

**Fix**
- استخراج Data Safety “مصادر البيانات” عبر:
  - endpoints التي تنشئ/تقرأ push subscription tokens
  - endpoints التي تكتب child profile snapshots
  - endpoints التي تكتب purchases/deposits notes
  - إن وجدت أي 3rd party SDKs للـ analytics: list + vendor.

**Verification Pending**
- مقارنة نهائية Data Safety questionnaire مع الحقيقة.

---

## 3) Action Plan (Production Plan — بدون ترقيع)

### Phase A0 — Build/Signing Evidence (artifact production evidence)
- [x] تم توفير Evidence بدون تشغيل CI من هنا عبر artifacts الموجودة محليًا في:
  - `client/public/apps/classify-app-latest.apk`
  - `client/public/apps/classify-googleplay-latest.aab`
- [x] `client/public/apps/latest-release.json` يؤكد:
  - `provenance.signedAabVerified=true`
  - `releaseTag=v2026.04.19-b1776553474`
  - `version=2026.04.19`, `buildNumber=1776553474`, `versionCode=1776553474`
- [x] SHA256 من `client/public/apps/checksums-latest.txt`:
  - APK: `4c5480022e98add803a384fe0b94855d9a12a7cc16832f634d808803d8bddb88`
  - AAB: `7bbfee454a048b121fde8bc7e767c02cac0834b40921d9b704b71076ed898da7`
- [x] تحقق توقيع الـ APK (static):
  - تم تشغيل `jarsigner -verify -verbose -certs client\public\apps\classify-app-latest.apk` وظهر: `jar verified`
  - مع Warning: `self-signed` / `Invalid certificate chain (PKIX path building failed)` (غالبًا عدم توفّر trust chain محليًا، وليس دليلًا على عدم صحة توقيع الـ APK)
- [x] مواصفات Release Keystore المستخدمة (مذكورة من فريق التوقيع):
  - Keystore path: `/opt/classify/signing/classify-release.jks`
  - Key alias / global alias: `classify-release`
  - Algorithm: `RSA 4096`
  - Signature scheme: `SHA256withRSA`
  - Validity: `10 سنوات`
  - Fingerprints:
    - SHA-1: `442E46F141BBF7010F1EDEC57A0D73103F332C01`
    - SHA-256: `35B11E7ABA0D9C71BFD49002219BD55725BC95076B1FBEA411CDCD5CB9E97055`

### Phase A — Blocking Fixes (Ads)
1) قرار المنتج:
   - **Ads = Yes** (المسار A) أم **إعادة هندسة experience** (المسار B)
2) تعديل Play Console questionnaire وفق القرار.
3) تحديث store listing + App content claims ليتطابق مع الواقع:
   - Children + incentives + external links.

**Deliverable**
- Evidence pack من Play Console: screenshot/exports لقيم Ads declaration + App content fields.

---

### Phase B — High Fixes (SKU/Product types + Purchase behavior)
1) تأكيد catalog:
   - هل كل منتجات wallet INAPP؟
2) اختبار Purchase:
   - Purchase success
   - duplicate token double-click test
   - confirm wallet credited once
3) verify:
   - acknowledge/consume flow لو consumable

**Deliverable**
- Billing evidence log + manual test matrix.

---

### Phase C — Medium Fixes (Data Safety & runtime)
1) مطابقة Data Safety form مع actual data flows.
2) runtime smoke tests للـ:
   - login
   - ads carousel
   - ads watch rewards
   - wallet top-up
   - push permission recovery

**Deliverable**
- “Runtime Evidence” + list of endpoints used + observed behavior.

---

### Phase D — Submission Gate
1) بناء/توليد release:
   - signed AAB
   - SHA256 + jarsigner verification
2) Pre-launch report review.
3) Submit to internal/closed:
   - track crashes/billing/ads

---

## 4) Verification Checklist (قبل ضغط Submit)
- [ ] AAB signed + jarsigner verify + checksums proven
- [ ] Ads declaration in Play Console مطابق للواقع (A أو B)
- [ ] Children content + incentives + external links claims مطابق
- [ ] Wallet catalog SKUs كلها INAPP (أو plugin/logic موسّع للـ SUBSCRIPTION)
- [ ] Purchase flow tested end-to-end on internal device
- [ ] Data Safety + Privacy Policy alignment نهائي
- [ ] App Access steps تمنح reviewer الدخول للميزة الأساسية < 60s
- [ ] No obvious crashes/white screens in internal track
