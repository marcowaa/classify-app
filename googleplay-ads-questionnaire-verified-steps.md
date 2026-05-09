# خطوات موثّقة للتحقق من Play Console Ads questionnaire قبل قرار Ads=Yes / Ads=No

> هدف الوثيقة: نراجع **محتوى/سلوك التطبيق الفعلي** مقابل **أسئلة Play Console** الخاصة بـ Ads & Monetization & Children، قبل تثبيت القرار.
>
> ملاحظة: واجهة Google Play Console قد تتغير، لكن منطق الأسئلة ومسارات التحقق عادة ثابت. استخدم هذه القائمة كـ “دليل تشغيل” (Runbook).

## 0) تجهيز قبل الدخول (حتى لا تضيع وقت)
1. افتح مشروع التطبيق في **Play Console**.
2. حضّر قائمة “Evidence” من الكود:
   - `client/src/components/SlidingAdsCarousel.tsx` (عرض/Carousel + click/view + linkUrl خارجي)
   - `server/routes/ads.ts` (endpoints + watch/cooldown + pointsReward + external link/contents حسب ad data)
   - (اختياري) سكرين من “Wallet” يظهر catalog + Purchase flow (لأن Monetization page قد تشير لمحتوى مدفوع)
3. حضّر “منطق تجربة المستخدم” باختصار:
   - هل المستخدم يشاهد شريحة “إعلانية/بروموشن”؟
   - هل يوجد “reward/payout” عند التفاعل؟
   - هل يوجد “linkUrl خارجية”؟

## 1) الوصول لشاشة الأسئلة الصحيحة
1. ادخل على **Play Console → App content** (أو **Store listing → App content** حسب الواجهة).
2. ابحث عن قسم **Ads / Monetization / Data Safety / App content questionnaires**.
3. ابدأ بالمسار الذي يظهر فيه سؤال Ads أولًا (عادة يكون ضمن App content أو Data safety/monetization flow).

> قاعدة: لا تبدأ بإجابات نهائية قبل ما تتأكد من:
> - هل توجد **صور/روابط/تفاعل** من نوع Ads
> - وهل يوجد **reward** مرتبط بتصرف المستخدم تجاه هذا المحتوى

## 2) “سؤال Ads” الأساسي — كيف تحسم
### 2.1 ابحث عن سؤال مشابه لـ:
- “Does your app contain ads?”
- أو “Is your app free but includes advertisements/promotions?”
- أو تصنيفات مثل: Ads / Sponsored content / Promotional content / Rewarded ads (إذا موجودة)

### 2.2 حسم بناءً على دليل التطبيق
استخدم هذا المنطق داخل Play Console عند اختيار الإجابة:

**إذا التطبيق يعرض carousel من “إعلانات/بروموشن” ويعمل: view/click tracking + links خارجية + (للأطفال) reward عند completion**
→ اجابة **Ads = Yes** هي الأكثر اتساقًا.

**إذا التطبيق يحتوي فقط محتوى تعليمي عادي بدون أي سلوك إعلاني (لا click/view tracking كـ ads ولا external links ضمن ads ولا reward مرتبط بمشاهدة)**
→ يمكن أن يكون Ads = No.

> في حالتكم، الدليل من الكود يشير بوضوح لوجود:
> - Carousel ads
> - endpoints view/click/watch
> - نقاط reward مرتبطة بمشاهدة للأطفال
> - linkUrl خارجية من الـ ads

## 3) تفاصيل Ads المتقدمة (إن وُجدت) — راقب هذه الحقول بالذات
داخل نفس “Ads” أو “Monetization/Promotions” النموذج، ابحث عن أسئلة مثل:
1. **Sponsored / Promotional content**
2. **Rewarded content/ads** (حتى لو ليست “Ad SDK” رسمية—Play قد يصنفها كسلوك reward/promotions)
3. **User engagement incentives** / “rewards for watching ads” / “incentivized behavior”
4. **External links** من داخل المحتوى الترويجي (إن كان السؤال موجودًا)

### ما الذي يجب أن تكون إجابتكم عليه؟
- إذا يوجد “watch → pointsReward” (للأطفال) → اعتبرواها “rewarded/promotional/incentivized” في النموذج.
- إذا يوجد “linkUrl” داخل الإعلان/البروموشن → لا تُخفوا وجود الروابط.

## 4) Children / Families — تأكيد إضافي لازم بعد Ads
بعد تثبيت Ads، انتقل مباشرة إلى:
1. **App Content → Target Audience / Children**
2. أو **Families policy / Children content** (حسب ما يظهر)

مطلوب منك داخل هذا القسم:
- هل الـ ads content موجّه للأطفال؟
- هل يوجد incentives/rewards مرتبطة بالمحتوى؟

> لأن التطبيق موجّه للأطفال (حسب store guide)، أي reward/points مرتبطة بمشاهدة Ads ترتفع أهميتها في أسئلة “Children content”.

## 5) Data Safety — ماذا نراجع تحديدًا بعد Ads
ارجع لصفحة **Data safety** (أو “Data safety” tab) وراجع:
1. هل توجد **بيانات** مرتبطة بالمحتوى الإعلاني؟
2. هل توجد **Analytics/Tracking**؟
3. هل توجد **Push notifications**؟
4. هل توجد **Device identifiers / account mapping**؟
5. هل توجد أي حقول child-specific (birthday/age/age group)؟

> لمطابقة صارمة: استخدم “مصادر البيانات” من الكود:
> - push subscription endpoints
> - child profile snapshots
> - ads watch history handling

## 6) “App Access” — لا تقلل منه
حتى لو Ads قرارهم مضبوط، Play Console قد يمنع الإرسال لو:
- reviewer لا يستطيع الوصول للميزة الأساسية خلال وقت معقول.

تحقق:
- اجعل “App Access” steps تؤدي خلال <60s إلى تجربة أساسية:
  - login
  - الوصول للواجهة الرئيسية
  - (اختياري) صفحة ads/parent dashboard لو هي ميزة أساسية عندكم

## 7) Evidence Checklist (استخدمها عند انتهاء الإجابة)
قبل أن تحفظ الإجابات النهائية داخل Play Console:
- [ ] Ads؟ الإجابة متسقة مع: carousel + view/click tracking + watch + reward + external links
- [ ] أي “rewarded/promotions” تم تحديده في النموذج إن وُجد
- [ ] Children/Target Audience يتعامل بوضوح مع طبيعة المحتوى الترويجي
- [ ] Data Safety لا يحتوي claim يخالف الواقع
- [ ] App Access جاهز لمراجعين (test accounts + steps قصيرة)

## 8) ماذا لو اتضح أن Play Console يتطلب Ads=No؟
استخدم قاعدة: **لا تغيّر إجابة Ads لتتوافق مع رغبة داخلية دون تغيير تجربة التطبيق**.
إذا Play أجبركم على Ads=No (أو رفض بسبب misrepresentation):
- إما:
  - Ads = Yes (ونُطابق الإفصاحات)
- أو:
  - Ads = No عبر refactor سلوكي حقيقي:
    - إيقاف view/click/watch endpoints المرتبطة بالـ ads experience
    - إزالة reward points من مسار مشاهدة ads للأطفال
    - إلغاء external links من داخل تجربة “إعلان/بروموشن”
  - ثم إعادة Data Safety/App content مرة أخرى
