# دليل رفع Classify على Google Play Store

**التاريخ:** 21 مارس 2026  
**مراجعة تشغيلية نهائية:** 5 مايو 2026  
**القرار التنفيذي:** Google Play → جاهز للإرسال بعد gate نهائي، Apple App Store → لا يُرفع الآن

**نوع الحزمة:** Capacitor Android Wrapper (WebView)  
**ملف AAB:** `android/app/build/outputs/bundle/release/app-release.aab`  
**ملف APK:** `android/app/build/outputs/apk/release/app-release.apk`

---

## قاعدة إصدار حرجة

- ابنِ AAB/APK فقط إذا كنت تريد تضمين تغييرات Native Android نفسها.
- إذا كانت التغييرات Web/Backend فقط (مثل API، منطق السيرفر، واجهة React)، فلا حاجة لإصدار AAB/APK جديد.
- في حالة تغييرات Web/Backend فقط: نفّذ نشر السيرفر/الويب فقط، ثم اختبر التطبيق بعد النشر.
- لا تُرسل أي release قبل اجتياز gate التناسق الثلاثي واختبار مسار المراجع.

---

## معلومات التطبيق الحالية

| البند | القيمة |
|---|---|
| Package Name | `com.classi_fy.twa` |
| نوع الحزمة | Capacitor Android Wrapper (WebView) |
| Target SDK | 35 |
| Min SDK | 23 (Android 6.0+) |
| Privacy Policy | `https://classi-fy.com/privacy-policy` |
| Digital Asset Links | `https://classi-fy.com/.well-known/assetlinks.json` |
| Website URL | `https://classi-fy.com` |
| قرار iOS الحالي | No-Go حتى يتوفر سبب native واضح يتجاوز web experience |

### معلومات التوقيع (Upload Key)

| البند | القيمة |
|---|---|
| Keystore File | `twa-signing.keystore` (محلي فقط — لا يُرفع على Git) |
| Alias | `my-key-alias` |
| Password | `B1IgHsAYWaKR` |
| SHA256 Fingerprint | `20:BA:20:9F:08:C8:40:0A:BA:C2:A3:65:20:90:D5:BF:AD:B1:7F:71:C8:89:97:35:11:AF:6D:AA:63:E9:73:2D` |

---

## الخطوة 1: إنشاء التطبيق في Google Play Console

1. اذهب إلى [Google Play Console](https://play.google.com/console)
2. اضغط **Create app**
3. املأ البيانات:
   - **App name:** Classify
   - **Default language:** العربية (Arabic)
   - **App or game:** App
   - **Free or paid:** Free
4. وافق على السياسات واضغط **Create**

---

## الخطوة 2: رفع ملف AAB

1. في القائمة الجانبية: **Release** → **Production**
2. اضغط **Create new release**
3. **App signing:** فعّل Play App Signing عند الطلب
4. ارفع ملف `Classify.aab`
5. **Release name:** 1.0.0-twa
6. **Release notes:** استخدم وصفًا مطابقًا لما هو موجود فعليًا في التطبيق. لا تذكر ميزات غير مثبتة.
7. لا تَعِد بـ "offline" إلا إذا كنت قد اختبرت ذلك فعليًا في النطاق المحدد.

---

## الخطوة 3: Store Listing

### مبادئ الصياغة الآمنة

- لا تذكر "COPPA compliant" أو "GDPR compliant" إلا إذا كانت هناك مراجعة امتثال مثبتة.
- لا تكتب "works offline" إلا إذا تم اختبار التجربة فعليًا وتأكدت من نطاقها.
- لا تضع "coming soon" أو وعود مستقبلية في الوصف الأساسي.
- اجعل الوصف مطابقًا حرفيًا لما يفعله التطبيق اليوم، لا لما يُفترض أن يفعله.

### Main store listing

**باللغة العربية**

| الحقل | المحتوى |
|---|---|
| App name | Classify |
| Short description | تطبيق تعليمي للأطفال مع أدوات متابعة أبوية وتجربة تعليمية تفاعلية |
| Full description | انظر أدناه |

**الوصف الكامل بالعربية**

```
Classify — منصة تعليمية تفاعلية للأطفال مع أدوات متابعة أبوية

🎓 تعليم ممتع وآمن
Classify منصة تعليمية تقدم تجربة منظمة للتعلم واللعب مع أدوات متابعة للأهل داخل التطبيق.

⭐ المميزات الرئيسية:

📚 التعليم التفاعلي
• ألعاب تعليمية متنوعة تغطي الرياضيات والذاكرة والتهجئة
• تتبع تقدم الطفل ومستواه داخل التطبيق
• مكافآت وإنجازات تحفيزية

👨‍👩‍👧‍👦 المتابعة الأبوية
• لوحة تحكم للأهل
• جدولة أوقات الاستخدام والجلسات
• إشعارات مرتبطة بنشاط الطفل
• التحكم في المحتوى المتاح

🔒 الأمان
• حسابات محمية
• قيود وصول واضحة داخل التطبيق
• لا يمكن للطفل تغيير إعدادات الأهل بدون صلاحية

🎮 الألعاب التعليمية
• Math Challenge
• Memory Match
• Spelling Bee

📱 مميزات إضافية
• يدعم العربية والإنجليزية
• تصميم واضح وسهل الاستخدام
• متوافق مع أحجام الشاشات المختلفة

ℹ️ ملاحظة: التطبيق مجاني بالكامل. يرجى مراجعة سياسة الخصوصية لمعرفة تفاصيل جمع البيانات واستخدامها.
```

**بالإنجليزية**

| الحقل | المحتوى |
|---|---|
| App name | Classify |
| Short description | Kids educational app with parental oversight tools and interactive learning experiences |
| Full description | انظر أدناه |

**Full description (English)**

```
Classify — Interactive Educational Platform for Kids with Parental Oversight Tools

🎓 Fun & Organized Learning
Classify provides a structured learning and play experience with tools for parents to monitor and manage activity inside the app.

⭐ Key Features:

📚 Interactive Learning
• Educational games covering math, memory, and spelling
• Track a child's progress and in-app activity
• Motivational rewards and achievements

👨‍👩‍👧‍👦 Parental Oversight
• Parent dashboard
• Usage and session scheduling
• Activity-related notifications
• Control over available content

🔒 Security
• Protected accounts
• Clear access restrictions inside the app
• Children cannot change parent settings without permission

🎮 Educational Games
• Math Challenge
• Memory Match
• Spelling Bee

📱 Additional Features
• Supports Arabic and English
• Clean and easy-to-use design
• Works across different screen sizes

ℹ️ Note: The app is free. Please review the Privacy Policy for details about data collection and usage.
```

---

## الخطوة 4: Content Rating

1. اذهب إلى **Policy** → **App content** → **Content rating**
2. اضغط **Start questionnaire**
3. **Category:** اختر **All Other App Types**
4. أجب بدقة حسب السلوك الفعلي للتطبيق
5. احفظ وطبّق النتيجة

---

## الخطوة 5: Target Audience & Content

هذا القسم حساس لأن التطبيق موجّه للأطفال.

- اختر الفئات العمرية المناسبة فقط
- لا تختار **Under 5** إلا إذا كان التطبيق مصممًا لهم فعلًا
- إذا كان التطبيق child-directed، التزم بما هو مثبت فعلًا داخل التطبيق
- لا تعتمد على claims قانونية غير موثقة
- لا تُفعّل Designed for Families إلا إذا كانت المتطلبات مكتملة فعلًا

---

## الخطوة 6: Data Safety

1. اذهب إلى **Policy** → **App content** → **Data safety**
2. املأ البيانات وفق ما يجمعه التطبيق فعلًا
3. أي نوع بيانات غير مؤكد يجب عدم وضعه كمجمع
4. أي claim عن التشفير أو الحذف يجب أن يكون قابلًا للإثبات

### مبدأ الحسم

- إن لم تكن واثقًا من نوع البيانات أو الغرض أو المشاركة، لا تضعه
- يجب أن يكون هذا القسم مطابقًا للكود والسياسات الفعلية، لا للوصف التسويقي

---

## الخطوة 7: App Access

1. اذهب إلى **Policy** → **App content** → **App access**
2. اختر **All or some functionality is restricted**
3. أضف حساب اختبار صالح
4. اكتب خطوات الدخول من 2 إلى 4 خطوات فقط
5. يجب أن يصل المراجع للميزة الأساسية خلال أقل من 60 ثانية

**مثال تعليمات مختصر:**
1. Login with the test credentials
2. Open the parent dashboard
3. Navigate to Children or Games
4. Review the main educational flow

---

## الخطوة 8: Privacy Policy

1. اذهب إلى **Policy** → **App content** → **Privacy policy**
2. أدخل الرابط: `https://classi-fy.com/privacy-policy`
3. احفظ

---

## الخطوة 9: إعدادات إضافية

- Ads declaration: **No**
- Government apps: **No**
- Financial features: **No**
- Health: **No**

---

## مرحلة الإرسال النهائية

### شروط الإرسال

أرسل فقط إذا كانت كل البنود التالية ✔️

- تطابق ثلاثي مكتمل بين Store listing وData Safety وPrivacy Policy
- permissions مبررة وواضحة
- App Access واضح وسريع
- المراجع يصل للميزة الأساسية خلال 60 ثانية
- لا توجد white screens
- fallback للشبكة موجود
- integrity محمي server-side
- لا توجد claims غير قابلة للإثبات

إذا أي نقطة ❌ → أوقف الإرسال وأصلحها أولًا.

---

## بعد الإرسال

### أول 24 ساعة
راقب:
- Crash logs
- Login failures
- API latency

### 48–72 ساعة
راقب:
- Policy warnings
- Review feedback

### لو حصل رفض
- اقرأ سبب الرفض حرفيًا
- صنّفه: Policy mismatch / Access issue / Technical issue
- أصلح السبب فقط
- أعد الإرسال بدون تغييرات عشوائية

---

## لماذا Apple App Store لا يُرفع الآن

القرار الحالي: **No-Go**.

السبب الأساسي:
- لم يثبت بعد سبب واضح لوجود التطبيق كتجربة native بدل موقع
- لا يوجد حتى الآن مبرر iOS قوي وسريع الإثبات
- الأفضل تأجيل الرفع حتى تتوفر قيمة native حقيقية قابلة للدفاع عنها

### Minimum readiness قبل أي محاولة iOS

لازم يتحقق على الأقل 2 من 4:
- feature تعمل بدون إنترنت جزئيًا
- بيانات محفوظة محليًا
- تجربة أسرع أو أنعم من الويب بوضوح
- feature لا يمكن تقديمها بسهولة عبر المتصفح

---

## ملاحظات مهمة

- الـ Keystore يجب أن يبقى محفوظًا محليًا فقط.
- Play App Signing سيوقّع التطبيق بمفتاح Google.
- Digital Asset Links يجب أن تظل متاحة دائمًا.
- لا تضع روابط خارجية غير مراقبة أو claims قانونية غير مثبتة.
- التطبيق الحالي يُعامل كمسار Google Play جاهز بعد gate نهائي، وليس كإعادة بناء للمنتج.

---

## الخلاصة التنفيذية

- Google Play → Submit بعد final gate
- Apple App Store → لا تُرفع الآن
- التركيز الحالي → تقليل أسباب الرفض، لا إعادة بناء المنتج
