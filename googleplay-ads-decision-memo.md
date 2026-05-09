# Google Play “Ads = Yes” vs “Ads = No” — مسار قرار موثّق (Evidence-based)

> الهدف: قبل أي تعديل كود أو الإفصاحات، نحدد بشكل **مستند على سلوك التطبيق الفعلي** هل Google Play سيرى ما يحدث في التطبيق على أنه “Ads/Advertisements/Promotions” أم لا.

## 1) ما الذي وجدناه في الكود (System of Record)
### A) يوجد “Ads experience” فعلًا
- **Frontend**: `client/src/components/SlidingAdsCarousel.tsx`
  - يعرض شريحة إعلانية/برومو (title/content + image)
  - يرسل tracking:
    - `POST /api/ads/:id/view`
    - `POST /api/ads/:id/click`
  - إذا كان هناك `linkUrl` يقوم بفتح رابط خارجي: `window.open(...)`

- **Backend**: `server/routes/ads.ts`
  - Child:
    - `GET /child/ads` (قائمة إعلانات نشطة)
    - `POST /child/ads/:adId/watch`:
      - يوجد `pointsReward`
      - يوجد `watchDurationSeconds`
      - يوجد cooldown + daily cap
  - Parent:
    - `GET /parent/ads`
    - `POST /parent/ads/:adId/watch`
  - Admin endpoints لإدارة الإعلانات

**استنتاج تقني:** التطبيق يتضمن نظام “إعلانات/بروموشن” وليس مجرد “محتوى” عادي.

### B) يوجد “incentivized behavior” للأطفال مرتبط بالـ ads
- في `POST /child/ads/:adId/watch` يوجد:
  - `pointsEarned` مرتبط بإكمال مدة مشاهدة
  - `applyPointsDelta` لتفعيل reward عند completion
  - daily cap على نقاط الإعلانات

**استنتاج تقني:** هذا غالبًا سيُقرأ في Google Play على أنه “incentive/promoted content” ضمن فئة الإعلانات/الترويج، خصوصًا لأنه موجّه للأطفال.

---

## 2) تعريف القرار: كيف نحسم Ads=Yes vs Ads=No؟
### القرار الصحيح ليس “على مزاج الفريق”، بل على “كيف Play سيصنف التجربة”.

نعتمد قاعدة عملية:
- إذا كانت Play Console ستصنف التجربة كـ **Advertisements / Promotions / Sponsored content / Rewarded prompts** ⇒ **Ads = Yes**
- إذا كانت التجربة لا تحتوي أي “ads/promo/incentive” بالمعنى الذي يطلبه Play questionnaire ⇒ **Ads = No**

---

## 3) شجرة قرار (Decision Tree) — استخدمها بالترتيب
### Step 1 — هل يوجد tracking يثبت أن التجربة “إعلانية/ترويجية”؟
- يوجد tracking view/click من خلال endpoints `/api/ads/:id/view` و `/api/ads/:id/click`
  - ✅ **إذن يميل إلى Ads = Yes**

### Step 2 — هل يوجد reward مرتبط بمشاهدة/تفاعل؟
- يوجد `pointsReward` + `watchDurationSeconds` + `applyPointsDelta` لِـ child ads
  - ✅ **إذن يميل بقوة إلى Ads = Yes** (خصوصًا للأطفال)

### Step 3 — هل يوجد روابط خارجية من داخل التجربة؟
- يوجد `linkUrl` وفتح خارجي `window.open(...)`
  - ✅ **إذن يعزز Ads = Yes** (ومخاطر إضافية في Children)

### Step 4 — هل نقدر نبرر أنها “ليست Ads” ولكن “promotions داخلية تعليمية” بدون incentive وبسلوك مختلف؟
- بما أن المسار الحالي يدعم:
  - ad carousel + click/view tracking
  - reward points من watch
  - روابط خارجية
- فهذا “عمليًا” لا يمكن اعتباره محتوى تعليمي عادي **بنفس تجربة المستخدم**.

✅ **بناءً على Step 1–3، المسار الأكثر اتساقًا مع الواقع هو: Ads = Yes**.

---

## 4) المسارين المتاحين (Two Approved Paths)
### المسار A (Recommended by evidence): Ads = Yes
**متى تختار المسار A؟**
- عندما تريد الاحتفاظ بالتجربة الحالية (ads carousel + watch/click tracking + reward points + possible external links).

**العمل المطلوب:**
1) في Play Console:
   - اجعل **Ads = Yes**
   - حدّد type بدقة (حسب ما يطلبه النموذج: rewarded/promotional etc.)
2) مواءمة:
   - App Content / Families / Data Safety
   - فقرات Store listing (لا claims مضللة)
3) راجع الأطفال:
   - قلّل/ثبّت أي incentives إن كانت تُقرأ كـ rewarded ads.

**مزايا المسار A:**
- أقل هندسة
- أقل “mismatch” بين الواقع والإفصاحات
- يخفض خطر الرفض بسبب misrepresentation.

---

### المسار B: Ads = No عبر إعادة هندسة experience (Refactor)
**متى تختار المسار B؟**
- فقط إذا الفريق قرر أن تجربة “ads/watching/click reward for kids” لا تريدها كتصنيف إعلاني.

**العمل المطلوب (غير ترقيع؛ تغيير سلوكي جذري):**
1) إزالة tracking/callbacks الخاصة بـ ads:
   - إلغاء view/click endpoints من UI أو عدم استدعائها
2) إزالة reward points المرتبطة بـ watch:
   - إيقاف `applyPointsDelta` ضمن ad watch path
3) إزالة/تقييد external links ضمن هذه الـ UI:
   - استبدال `window.open(linkUrl)` بروابط داخلية أو بدون روابط
4) إعادة تسمية الـ tables/flows logic إن لزم ليتطابق مع policy.

**مزايا المسار B:**
- إذا طبّقتها بالكامل، يمكن إعلان Ads = No بثقة أعلى
**لكن**: المسار B “يتطلب هندسة حقيقية” وهو أكبر كلفة.

---

## 5) القرار النهائي المؤقت (Pending Play Console validation)
استنادًا إلى الأدلة الموجودة في الكود:
- Carousel + click/view tracking
- reward points linked to watch duration
- external link opening
=> **الاستنتاج: Ads = Yes هو الأصدق مع الواقع**.

لكن يجب “تثبيت القرار” عبر Play Console questionnaire response:
- إذا نموذج Play Console يطلب تصنيفًا مختلفًا (مثلاً rewarded/promo) سجّل ذلك بدقة.

---

## 6) Evidence Checklist قبل أي Submit
للمسار A (Ads=Yes):
- [ ] Ads declaration = Yes في Play Console
- [ ] App Content → Children: وصف سلوك ads/promotions مع توجيه واضح
- [ ] Data Safety: أي incentives/rewards/push/analytics مذكورة بدقة
- [ ] Ensure Store listing لا تقول “No ads” أو ادعاءات مضللة

للمسار B:
- [ ] إزالة/تعطيل reward points المرتبط بالـ ad watch
- [ ] إزالة click/view tracking الخاصة بالإعلانات أو استبدالها بتجربة غير ترويجية
- [ ] إزالة external link opening
- [ ] تحقق Dev + QA أن التجربة لم تعد “ads” فعليًا
