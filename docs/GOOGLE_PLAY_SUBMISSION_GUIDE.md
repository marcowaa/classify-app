# دليل رفع Classify على Google Play Store

**التاريخ:** 21 مارس 2026
**نوع الحزمة:** Capacitor Android Wrapper (WebView)
**ملف AAB:** `android/app/build/outputs/bundle/release/app-release.aab`
**ملف APK:** `android/app/build/outputs/apk/release/app-release.apk`

## قاعدة إصدار حرجة (مهم جدا)

- ابنِ AAB/APK فقط إذا كنت تريد تضمين تغييرات Native Android نفسها.
- إذا كانت التغييرات Web/Backend فقط (مثل API، منطق السيرفر، واجهة React)، فلا حاجة لإصدار AAB/APK جديد.
- في حالة تغييرات Web/Backend فقط: نفّذ نشر السيرفر/الويب فقط، ثم اختبر التطبيق بعد النشر.

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
2. اضغط **"Create app"**
3. املأ البيانات:
   - **App name:** Classify
   - **Default language:** العربية (Arabic)
   - **App or game:** App
   - **Free or paid:** Free
4. وافق على السياسات واضغط **Create**

---

## الخطوة 2: رفع ملف AAB

1. في القائمة الجانبية: **Release** → **Production**
2. اضغط **"Create new release"**
3. **App signing:** Google Play سيطلب تفعيل Play App Signing — وافق
4. ارفع ملف `Classify.aab` (2.76 MB)
5. **Release name:** 1.0.0-twa
6. **Release notes (العربية):**
   ```
   Classify — منصة تعليمية آمنة للأطفال مع رقابة أبوية
   - ألعاب تعليمية تفاعلية (رياضيات، ذاكرة، تهجئة، شطرنج)
   - لوحة تحكم أبوية كاملة
   - جدولة وقت الشاشة والجلسات
   - نظام مهام ومكافآت تحفيزي
   - يدعم العربية والإنجليزية
   - يعمل بدون إنترنت
   ```
7. **Release notes (English):**
   ```
   Classify — Safe Educational Platform for Kids with Parental Controls
   - Interactive educational games (math, memory, spelling, chess)
   - Full parental control dashboard
   - Screen time scheduling & sessions
   - Tasks & rewards system
   - Arabic & English support
   - Works offline
   ```

---

## الخطوة 3: Store Listing (قائمة المتجر)

### Main store listing

**باللغة العربية:**

| الحقل | المحتوى |
|---|---|
| App name | Classify |
| Short description (80 حرف) | تطبيق تعليمي للأطفال مع رقابة أبوية ذكية وتحكم بوقت الشاشة وألعاب تعليمية تفاعلية |
| Full description | انظر أدناه |

**الوصف الكامل بالعربية (انسخه كاملاً):**

```
Classify — منصة تعليمية تفاعلية للأطفال مع رقابة أبوية كاملة

🎓 تعليم ممتع وآمن
Classify هي منصة تعليمية مصممة خصيصاً للأطفال مع إدارة أبوية شاملة. نوفر بيئة آمنة للتعلم واللعب مع أدوات متقدمة للأهل للمتابعة والتحكم.

⭐ المميزات الرئيسية:

📚 التعليم التفاعلي
• ألعاب تعليمية متنوعة تغطي الرياضيات والذاكرة والتهجئة
• تتبع تقدم الطفل ومستواه التعليمي
• مكافآت وإنجازات تحفيزية

👨‍👩‍👧‍👦 الرقابة الأبوية
• لوحة تحكم كاملة للأهل
• جدولة أوقات الاستخدام والجلسات
• إشعارات فورية بنشاط الطفل
• التحكم في المحتوى المتاح

🔒 الأمان
• حسابات محمية بالكامل
• تحقق ثنائي (2FA) للأهل
• لا يمكن للطفل تغيير الإعدادات بدون إذن
• متوافق مع COPPA وGDPR

🎮 الألعاب التعليمية
• Math Challenge - تحديات رياضية
• Memory Match - ألعاب الذاكرة
• Spelling Bee - تهجئة الكلمات
• المزيد من الألعاب قريباً

📱 مميزات إضافية
• يدعم العربية والإنجليزية
• يعمل بدون إنترنت (بعد التحميل الأول)
• إشعارات فورية
• تصميم جميل وسهل الاستخدام
• متوافق مع جميع أحجام الشاشات

ℹ️ ملاحظة: التطبيق مجاني بالكامل. بياناتكم محمية وفقاً لسياسة الخصوصية.
```

**بالإنجليزية:**

| الحقل | المحتوى |
|---|---|
| App name | Classify |
| Short description | Kids educational app with parental controls, screen time management & learning games |
| Full description | انظر أدناه |

**Full description (English):**

```
Classify — Interactive Educational Platform for Kids with Full Parental Controls

🎓 Fun & Safe Learning
Classify is an educational platform designed specifically for children with comprehensive parental management. We provide a safe environment for learning and playing with advanced tools for parents to monitor and control.

⭐ Key Features:

📚 Interactive Learning
• Diverse educational games covering math, memory, and spelling
• Track your child's progress and educational level
• Motivational rewards and achievements

👨‍👩‍👧‍👦 Parental Controls
• Complete parent dashboard
• Schedule usage times and sessions
• Real-time notifications of child activity
• Control available content

🔒 Security
• Fully protected accounts
• Two-factor authentication (2FA) for parents
• Children cannot change settings without permission
• COPPA and GDPR compliant

🎮 Educational Games
• Math Challenge
• Memory Match
• Spelling Bee
• More games coming soon

📱 Additional Features
• Supports Arabic and English
• Works offline (after first load)
• Push notifications
• Beautiful, easy-to-use design
• Compatible with all screen sizes

ℹ️ Note: The app is completely free. Your data is protected according to our Privacy Policy.
```

### الوسائط المطلوبة

| النوع | المواصفات | العدد |
|---|---|---|
| Phone Screenshots | 1080x1920 أو 1440x2560 px (PNG/JPEG) | 4-8 صور |
| 7" Tablet Screenshots | 1080x1920 px (اختياري) | 1-8 صور |
| 10" Tablet Screenshots | 1920x1200 px (اختياري) | 1-8 صور |
| Feature Graphic | 1024x500 px (مطلوب) | 1 |
| App Icon (Hi-res) | 512x512 px (مطلوب) | 1 |

**نصائح للـ Screenshots:**
- صوّر شاشات: تسجيل الدخول، لوحة الأهل، ملف الطفل، الألعاب، الإعدادات
- استخدم هاتف حقيقي أو محاكي Android Studio
- تأكد الصور واضحة بدون بيانات حقيقية

---

## الخطوة 4: Content Rating (تصنيف المحتوى)

1. اذهب إلى **Policy** → **App content** → **Content rating**
2. اضغط **Start questionnaire**
3. **Email:** (أدخل بريدك)
4. **Category:** اختر **"All Other App Types"**
5. الإجابات:
   - Violence: **No**
   - Sexual content: **No**
   - Language: **No**
   - Controlled substances: **No**
   - User interaction: **Yes** (يوجد حسابات مستخدمين)
   - Users can share info: **No**
   - Users can communicate: **No**
   - Location sharing: **No**
   - Does the app share user's location: **No**
   - Does the app contain ads: **No**
   - Gambling: **No**
   - Does the app allow purchases: **No**
6. اضغط **Save** → **Calculate rating** → **Apply**

---

## الخطوة 5: Target Audience & Content (الجمهور المستهدف) ⚠️ مهم جداً

### هذا القسم حساس لأن التطبيق موجه للأطفال

1. اذهب إلى **Policy** → **App content** → **Target audience and content**
2. **Target age groups:** اختر:
   - ✅ Ages 6-8
   - ✅ Ages 9-12
   - ✅ Ages 13-15
   - ✅ Ages 16-17
   - ✅ Ages 18+
   > ⚠️ لا تختار "Under 5" إلا إذا كان التطبيق مصمم لهم فعلاً

3. **Is this app primarily child-directed?** → **Yes**
4. **Does the app appeal primarily to children?** → **Yes, but it's also for parents**
5. سيُطلب منك الانضمام لبرنامج **Designed for Families** — وافق

### متطلبات Designed for Families:
- ✅ لا إعلانات (التطبيق خالي من الإعلانات)
- ✅ سياسة خصوصية موجودة
- ✅ يتوافق مع COPPA
- ✅ المحتوى مناسب للأطفال
- ✅ لا روابط خارجية بدون بوابة أبوية

---

## الخطوة 6: Data Safety (سلامة البيانات)

1. اذهب إلى **Policy** → **App content** → **Data safety**
2. اضغط **Start**

### Overview:
- **Does your app collect or share any required user data types?** → **Yes**
- **Is all user data encrypted in transit?** → **Yes**
- **Do you provide a way for users to request that their data is deleted?** → **Yes**

### Data types:

| نوع البيانات | يتم جمعه؟ | يتم مشاركته؟ | الغرض |
|---|---|---|---|
| Email address | ✅ نعم | ❌ لا | Account management |
| Name | ✅ نعم | ❌ لا | Account management, personalization |
| User IDs | ✅ نعم | ❌ لا | Account management |
| App interactions | ✅ نعم | ❌ لا | Analytics |
| Other user-generated content | ✅ نعم | ❌ لا | App functionality |
| Photos/Videos | ✅ نعم | ❌ لا | Profile picture (optional) |

### لكل نوع بيانات:
- **Is this data collected, shared, or both?** → **Collected**
- **Is this data processed ephemerally?** → **No**
- **Is this data required or optional?** → Email: **Required**, Name: **Required**, Photos: **Optional**
- **Purpose:** → **App functionality, Account management**

3. اضغط **Save** → **Submit**

---

## الخطوة 7: App Access (الوصول للتطبيق)

لأن التطبيق يتطلب تسجيل دخول، يجب توفير بيانات اختبار لفريق مراجعة Google:

1. اذهب إلى **Policy** → **App content** → **App access**
2. اختر **"All or some functionality is restricted"**
3. اضغط **"Add new instructions"**
4. **Name:** Test Parent Account
5. أنشئ حساب اختبار على `https://classi-fy.com` وأدخل:
   - **Username/Email:** (بريد الاختبار)
   - **Password:** (كلمة المرور)
6. **Instructions:**
   ```
   1. Login with the test credentials above
   2. You will see the parent dashboard
   3. Navigate to "Children" to see child management
   4. Navigate to "Games" to see educational games
   5. The app supports Arabic and English languages
   ```

---

## الخطوة 8: Privacy Policy (سياسة الخصوصية)

1. اذهب إلى **Policy** → **App content** → **Privacy policy**
2. أدخل الرابط: `https://classi-fy.com/privacy-policy`
3. اضغط **Save**

---

## الخطوة 9: إعدادات إضافية

### Ads declaration:
- **Does your app contain ads?** → **No**

### Government apps:
- **Is this a government app?** → **No**

### Financial features:
- **Does this app provide financial features?** → **No**

### Health:
- **Is this a health app?** → **No**

---

## الخطوة 10: المراجعة والنشر

1. تأكد أن كل الأقسام مكتملة (علامة ✅ خضراء بجانب كل قسم)
2. ارجع إلى **Release** → **Production**
3. اضغط **"Review release"**
4. إذا لا يوجد أخطاء، اضغط **"Start rollout to Production"**

### مدة المراجعة:
- **أول مرة:** 3-7 أيام عمل (أحياناً حتى 14 يوم)
- **التحديثات اللاحقة:** 1-3 أيام عمل

---

## أسباب الرفض الشائعة (تجنبها)

| السبب | الحل |
|---|---|
| سياسة خصوصية مفقودة | ✅ موجودة: `classi-fy.com/privacy-policy` |
| لا يوجد بيانات اختبار | ✅ أنشئ حساب اختبار (الخطوة 7) |
| محتوى أطفال بدون COPPA | ✅ التطبيق متوافق مع COPPA |
| عدم اكتمال Data Safety | ✅ اتبع الخطوة 6 بدقة |
| Screenshots ناقصة | ⚠️ حضّر 4-8 screenshots حقيقية |
| Feature Graphic مفقودة | ⚠️ صمم صورة 1024x500 |
| التطبيق WebView فقط | ✅ TWA — ليس WebView. يستخدم Chrome مباشرة مع Digital Asset Links |
| TWA URL Bar ظاهر | ✅ تم إعداد assetlinks.json لإخفاء URL Bar |
| إعلانات بدون إعلان | ✅ لا يوجد إعلانات |

---

## بعد القبول

### لتحديث التطبيق لاحقاً:

بما أن التطبيق TWA، لا تحتاج لبناء AAB جديد إلا في حالة تغيير الإعدادات الأصلية.
كل تحديثات الواجهة والسيرفر تظهر فوراً بدون تحديث في Play Store.

**متى تحتاج AAB جديد:**
- تغيير Package Name
- تغيير URL المستهدف
- تحديث TWA settings
- تغيير أيقونة التطبيق

**لإعادة بناء TWA AAB:**
1. اذهب إلى [PWABuilder](https://pwabuilder.com)
2. أدخل URL: `https://classi-fy.com`
3. اختر Android → Download
4. وقّع باستخدام `twa-signing.keystore`

### تحديث Digital Asset Links:
بعد تفعيل Play App Signing، Google سيعطيك SHA256 جديد.
يجب إضافته في: `client/public/.well-known/assetlinks.json`

يمكنك إضافة أكثر من fingerprint:
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.classi_fy.twa",
      "sha256_cert_fingerprints": [
        "20:BA:20:9F:08:C8:40:0A:BA:C2:A3:65:20:90:D5:BF:AD:B1:7F:71:C8:89:97:35:11:AF:6D:AA:63:E9:73:2D",
        "GOOGLE_PLAY_SIGNING_KEY_SHA256_HERE"
      ]
    }
  }
]
```

---

## ملاحظات مهمة

⚠️ **الـ Keystore:** ملف `twa-signing.keystore` محفوظ محلياً فقط (gitignored). احتفظ بنسخة احتياطية آمنة. فقدانه = لا يمكن تحديث التطبيق.

⚠️ **Play App Signing:** Google Play سيوقّع التطبيق بمفتاحه الخاص. المفتاح اللي عندك يسمى "Upload Key".

⚠️ **Push Notifications:** التطبيق TWA يدعم Web Push Notifications مباشرة بدون Firebase. الإشعارات تعمل عبر Service Worker.

⚠️ **الناحية التقنية:** التطبيق TWA (Trusted Web Activity) — يستخدم Chrome مباشرة وليس WebView. كل المحتوى يأتي من `https://classi-fy.com`. التحديثات تظهر فوراً بدون رفع AAB جديد. الحجم صغير (2.76 MB) لأنه لا يحتوي على محرك عرض مدمج.

⚠️ **Digital Asset Links:** يجب أن يكون ملف `assetlinks.json` متاحاً على `https://classi-fy.com/.well-known/assetlinks.json` دائماً. بدونه يظهر URL Bar في التطبيق.

⚠️ **الـ Keystore القديم (Capacitor):** ملف `classify-release.keystore` كان للنسخة القديمة (Capacitor). لم يعد مستخدماً. التطبيق الجديد يستخدم `twa-signing.keystore` فقط.
