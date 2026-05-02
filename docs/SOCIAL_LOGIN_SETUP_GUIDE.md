# دليل إعداد تسجيل الدخول الاجتماعي — Social Login Setup Guide

## 📋 نظرة عامة

يدعم تطبيق Classify تسجيل الدخول عبر **8 منصات** اجتماعية:
- Google | جوجل
- Facebook | فيسبوك
- Apple | آبل
- Twitter/X | تويتر
- GitHub | جيت هاب
- Microsoft | مايكروسوفت
- LinkedIn | لينكد إن
- Discord | ديسكورد

---

## 🔗 المسارات المطلوبة (Redirect URIs)

### الدومين الأساسي: `https://classi-fy.com`

| المنصة      | Redirect URI (أضفه في لوحة الأدمن + موقع المنصة)               |
|-------------|----------------------------------------------------------------|
| Google      | `https://classi-fy.com/api/auth/oauth/google/callback`         |
| Facebook    | `https://classi-fy.com/api/auth/oauth/facebook/callback`       |
| Apple       | `https://classi-fy.com/api/auth/oauth/apple/callback`          |
| Twitter/X   | `https://classi-fy.com/api/auth/oauth/twitter/callback`        |
| GitHub      | `https://classi-fy.com/api/auth/oauth/github/callback`         |
| Microsoft   | `https://classi-fy.com/api/auth/oauth/microsoft/callback`      |
| LinkedIn    | `https://classi-fy.com/api/auth/oauth/linkedin/callback`       |
| Discord     | `https://classi-fy.com/api/auth/oauth/discord/callback`        |

> ⚠️ **مهم:** المسار في الكود هو `/api/auth/oauth/{provider}/callback` وليس `/api/auth/callback/{provider}`
> تأكد من استخدام المسار الصحيح في كل من لوحة الأدمن وموقع المنصة.

---

## ⚙️ إعدادات لوحة الأدمن (لكل مزود)

### الحقول المطلوبة:

| الحقل              | الوصف                                                    | مثال                                                              |
|--------------------|----------------------------------------------------------|-------------------------------------------------------------------|
| الاسم (إنجليزي)    | اسم المزود بالإنجليزي                                    | Google                                                            |
| الاسم (عربي)       | اسم المزود بالعربي                                       | جوجل                                                              |
| Client ID          | معرف التطبيق من المنصة                                   | `980272148790-xxx.apps.googleusercontent.com`                     |
| Client Secret      | سر التطبيق من المنصة                                     | `GOCSPX-xxx`                                                      |
| Redirect URI       | مسار إعادة التوجيه                                       | `https://classi-fy.com/api/auth/oauth/google/callback`            |
| Scopes             | الصلاحيات المطلوبة                                       | `email,profile`                                                   |
| اسم الأيقونة       | اسم الأيقونة من Lucide                                   | Chrome                                                            |
| رابط الأيقونة      | رابط أيقونة مخصص (اختياري)                               | (اتركه فارغاً)                                                   |

---

## 📊 جدول الإعدادات الكاملة لجميع المنصات

### 1️⃣ Google (جوجل)

| الحقل              | القيمة                                                           |
|--------------------|------------------------------------------------------------------|
| الاسم (إنجليزي)    | Google                                                           |
| الاسم (عربي)       | جوجل                                                             |
| Client ID          | *(من Google Cloud Console)*                                      |
| Client Secret      | *(من Google Cloud Console)*                                      |
| Redirect URI       | `https://classi-fy.com/api/auth/oauth/google/callback`           |
| Scopes             | `email,profile`                                                  |
| اسم الأيقونة       | Chrome                                                           |

### 2️⃣ Facebook (فيسبوك)

| الحقل              | القيمة                                                           |
|--------------------|------------------------------------------------------------------|
| الاسم (إنجليزي)    | Facebook                                                         |
| الاسم (عربي)       | فيسبوك                                                           |
| Client ID          | *(App ID من Meta for Developers)*                                |
| Client Secret      | *(App Secret من Meta for Developers)*                            |
| Redirect URI       | `https://classi-fy.com/api/auth/oauth/facebook/callback`         |
| Scopes             | `email,public_profile`                                           |
| اسم الأيقونة       | Facebook                                                         |

### 3️⃣ Apple (آبل)

| الحقل              | القيمة                                                           |
|--------------------|------------------------------------------------------------------|
| الاسم (إنجليزي)    | Apple                                                            |
| الاسم (عربي)       | آبل                                                              |
| Client ID          | *(Service ID من Apple Developer)*                                |
| Client Secret      | *(JWT مُولّد من المفتاح الخاص)*                                  |
| Redirect URI       | `https://classi-fy.com/api/auth/oauth/apple/callback`            |
| Scopes             | `name,email`                                                     |
| اسم الأيقونة       | Apple                                                            |

### 4️⃣ Twitter/X (تويتر)

| الحقل              | القيمة                                                           |
|--------------------|------------------------------------------------------------------|
| الاسم (إنجليزي)    | Twitter                                                          |
| الاسم (عربي)       | تويتر                                                            |
| Client ID          | *(من Twitter Developer Portal)*                                  |
| Client Secret      | *(من Twitter Developer Portal)*                                  |
| Redirect URI       | `https://classi-fy.com/api/auth/oauth/twitter/callback`          |
| Scopes             | `tweet.read,users.read`                                          |
| اسم الأيقونة       | Twitter                                                          |

### 5️⃣ GitHub (جيت هاب)

| الحقل              | القيمة                                                           |
|--------------------|------------------------------------------------------------------|
| الاسم (إنجليزي)    | GitHub                                                           |
| الاسم (عربي)       | جيت هاب                                                         |
| Client ID          | *(من GitHub Developer Settings)*                                 |
| Client Secret      | *(من GitHub Developer Settings)*                                 |
| Redirect URI       | `https://classi-fy.com/api/auth/oauth/github/callback`           |
| Scopes             | `user:email`                                                     |
| اسم الأيقونة       | Github                                                           |

### 6️⃣ Microsoft (مايكروسوفت)

| الحقل              | القيمة                                                           |
|--------------------|------------------------------------------------------------------|
| الاسم (إنجليزي)    | Microsoft                                                        |
| الاسم (عربي)       | مايكروسوفت                                                      |
| Client ID          | *(من Azure AD / Entra ID)*                                       |
| Client Secret      | *(من Azure AD / Entra ID)*                                       |
| Redirect URI       | `https://classi-fy.com/api/auth/oauth/microsoft/callback`        |
| Scopes             | `openid,email,profile`                                           |
| اسم الأيقونة       | Monitor                                                          |

### 7️⃣ LinkedIn (لينكد إن)

| الحقل              | القيمة                                                           |
|--------------------|------------------------------------------------------------------|
| الاسم (إنجليزي)    | LinkedIn                                                         |
| الاسم (عربي)       | لينكد إن                                                        |
| Client ID          | *(من LinkedIn Developer Portal)*                                 |
| Client Secret      | *(من LinkedIn Developer Portal)*                                 |
| Redirect URI       | `https://classi-fy.com/api/auth/oauth/linkedin/callback`         |
| Scopes             | `r_emailaddress,r_liteprofile`                                   |
| اسم الأيقونة       | Linkedin                                                         |

### 8️⃣ Discord (ديسكورد)

| الحقل              | القيمة                                                           |
|--------------------|------------------------------------------------------------------|
| الاسم (إنجليزي)    | Discord                                                          |
| الاسم (عربي)       | ديسكورد                                                         |
| Client ID          | *(من Discord Developer Portal)*                                  |
| Client Secret      | *(من Discord Developer Portal)*                                  |
| Redirect URI       | `https://classi-fy.com/api/auth/oauth/discord/callback`          |
| Scopes             | `identify,email`                                                 |
| اسم الأيقونة       | MessageCircle                                                    |

---

## 🌐 طريقة الإعداد على موقع كل منصة

---

### 🔵 Google — إعداد OAuth 2.0

1. **ادخل:** [Google Cloud Console](https://console.cloud.google.com/)
2. **أنشئ مشروع جديد** أو اختر مشروع موجود
3. **اذهب إلى:** APIs & Services → Credentials
4. **أنشئ:** OAuth 2.0 Client ID → اختر **Web application**
5. **أضف في Authorized JavaScript origins:**
   ```
   https://classi-fy.com
   ```
6. **أضف في Authorized redirect URIs:**
   ```
   https://classi-fy.com/api/auth/oauth/google/callback
   ```
7. **انسخ** Client ID و Client Secret
8. **أضفهم في لوحة الأدمن** مع باقي الإعدادات
9. **تأكد** من تفعيل Google+ API أو People API في Library

> ⚠️ لا تضف "/" في نهاية JavaScript origins
> ⚠️ Redirect URI يجب أن يكون مطابق 100% (حروف كبيرة/صغيرة، https، لا مسافات)

---

### 🔵 Facebook — إعداد تطبيق Facebook Login

1. **ادخل:** [Meta for Developers](https://developers.facebook.com/)
2. **أنشئ تطبيق جديد** → اختر **Consumer** أو **Business**
3. **أضف منتج:** Facebook Login
4. **اذهب إلى:** Facebook Login → Settings
5. **أضف في Valid OAuth Redirect URIs:**
   ```
   https://classi-fy.com/api/auth/oauth/facebook/callback
   ```
6. **اذهب إلى:** Settings → Basic
7. **انسخ** App ID (= Client ID) و App Secret (= Client Secret)
8. **أضفهم في لوحة الأدمن**
9. **اجعل التطبيق Live** من Dashboard (مهم جداً!)

> ⚠️ التطبيق يجب أن يكون في وضع Live وليس Development
> ⚠️ قد تحتاج لإكمال App Review للحصول على صلاحيات إضافية

---

### 🔵 Apple — إعداد Sign in with Apple

1. **ادخل:** [Apple Developer](https://developer.apple.com/)
2. **اذهب إلى:** Certificates, Identifiers & Profiles
3. **أنشئ App ID** مع تفعيل "Sign in with Apple"
4. **أنشئ Service ID:**
   - Identifier: `com.classify.auth` (مثال)
   - أضف Website URL: `https://classi-fy.com`
   - أضف Return URL:
     ```
     https://classi-fy.com/api/auth/oauth/apple/callback
     ```
5. **أنشئ Key** مع تفعيل "Sign in with Apple"
6. **حمّل المفتاح الخاص** (.p8 file)
7. **Client ID** = Service ID
8. **Client Secret** = JWT مُولّد من المفتاح الخاص (يتطلب كود خاص لتوليده)

> ⚠️ Apple يتطلب عضوية مدفوعة ($99/سنة)
> ⚠️ Client Secret هو JWT يُجدد كل 6 أشهر
> ⚠️ Apple يرسل البيانات عبر POST (form_post) وليس GET

---

### 🔵 Twitter/X — إعداد OAuth 2.0

1. **ادخل:** [Twitter Developer Portal](https://developer.twitter.com/)
2. **أنشئ Project و App**
3. **اذهب إلى:** App Settings → User authentication settings → Set Up
4. **اختر:** OAuth 2.0
5. **أضف في Redirect URLs:**
   ```
   https://classi-fy.com/api/auth/oauth/twitter/callback
   ```
6. **أضف في Website URL:**
   ```
   https://classi-fy.com
   ```
7. **انسخ** Client ID و Client Secret
8. **أضفهم في لوحة الأدمن**

> ⚠️ Twitter يتطلب PKCE (code_challenge) — الكود يدعمه تلقائياً
> ⚠️ قد تحتاج Elevated access للحصول على email

---

### 🔵 GitHub — إعداد OAuth App

1. **ادخل:** [GitHub Developer Settings](https://github.com/settings/developers)
2. **أنشئ:** New OAuth App
3. **Application name:** Classify
4. **Homepage URL:**
   ```
   https://classi-fy.com
   ```
5. **Authorization callback URL:**
   ```
   https://classi-fy.com/api/auth/oauth/github/callback
   ```
6. **انسخ** Client ID
7. **ولّد** Client Secret وانسخه
8. **أضفهم في لوحة الأدمن**

> ⚠️ GitHub يسمح بـ callback URL واحد فقط لكل OAuth App
> ⚠️ Scope `user:email` مطلوب للحصول على الإيميل

---

### 🔵 Microsoft — إعداد Azure AD / Entra ID

1. **ادخل:** [Azure Portal](https://portal.azure.com/)
2. **اذهب إلى:** Azure Active Directory → App registrations
3. **أنشئ:** New registration
4. **Name:** Classify
5. **Supported account types:** Accounts in any organizational directory and personal Microsoft accounts
6. **Redirect URI:** اختر Web وأضف:
   ```
   https://classi-fy.com/api/auth/oauth/microsoft/callback
   ```
7. **اذهب إلى:** Certificates & secrets → New client secret
8. **انسخ** Application (client) ID و Secret value
9. **أضفهم في لوحة الأدمن**

> ⚠️ استخدم "common" endpoint للسماح بكل أنواع الحسابات
> ⚠️ Secret له تاريخ انتهاء (اختر أطول مدة متاحة)

---

### 🔵 LinkedIn — إعداد OAuth 2.0

1. **ادخل:** [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. **أنشئ:** Create App
3. **App name:** Classify
4. **Company:** (اختر أو أنشئ صفحة شركة)
5. **اذهب إلى:** Auth tab
6. **أضف في Authorized redirect URLs:**
   ```
   https://classi-fy.com/api/auth/oauth/linkedin/callback
   ```
7. **انسخ** Client ID و Client Secret
8. **أضفهم في لوحة الأدمن**
9. **تأكد** من تفعيل Products: "Sign In with LinkedIn using OpenID Connect"

> ⚠️ LinkedIn غيّر الـ API — استخدم OpenID Connect الجديد
> ⚠️ Scopes القديمة (r_liteprofile) قد لا تعمل، استخدم `openid,profile,email`

---

### 🔵 Discord — إعداد OAuth2

1. **ادخل:** [Discord Developer Portal](https://discord.com/developers/applications)
2. **أنشئ:** New Application
3. **Name:** Classify
4. **اذهب إلى:** OAuth2
5. **أضف في Redirects:**
   ```
   https://classi-fy.com/api/auth/oauth/discord/callback
   ```
6. **انسخ** Client ID و Client Secret
7. **أضفهم في لوحة الأدمن**

> ⚠️ Discord يتطلب تفعيل "Requires OAuth2 Code Grant" = OFF
> ⚠️ Scopes: `identify` (للاسم) + `email` (للإيميل)

---

## ✅ قائمة التحقق بعد الإعداد

لكل مزود، تأكد من:
- [ ] Client ID صحيح ومنسوخ بالكامل
- [ ] Client Secret صحيح ومنسوخ بالكامل
- [ ] Redirect URI مطابق 100% في المنصة ولوحة الأدمن
- [ ] Scopes مضبوطة بالصيغة المطلوبة
- [ ] المزود مُفعّل (isActive = true) في لوحة الأدمن
- [ ] التطبيق في وضع Live/Production على المنصة
- [ ] تجربة تسجيل الدخول ناجحة بدون أخطاء

---

## 🚨 أخطاء شائعة وحلولها

| الخطأ                         | السبب                                          | الحل                                              |
|-------------------------------|------------------------------------------------|---------------------------------------------------|
| `redirect_uri_mismatch`       | الـ URI في المنصة لا يطابق ما في الكود/الأدمن  | تأكد من تطابق المسار 100%                         |
| `invalid_client`              | Client ID أو Secret خاطئ                       | أعد نسخ القيم من المنصة                            |
| `access_denied`               | المستخدم رفض الإذن أو التطبيق في وضع Development | اجعل التطبيق Live                                 |
| `invalid_scope`               | الصلاحيات غير معتمدة                           | راجع الصلاحيات المدعومة لكل منصة                   |
| `API endpoint not found`      | المسار غير موجود في السيرفر                     | تأكد أن السيرفر يعمل وأن المسارات مُعرّفة          |

---

## 📝 ملاحظة أخيرة — المسار الصحيح

الكود يستخدم المسار التالي لإعادة التوجيه:
```
/api/auth/oauth/{provider}/callback
```

إذا لم تُدخل redirect URI في لوحة الأدمن، سيتم بناءه تلقائياً بهذا الشكل:
```
https://classi-fy.com/api/auth/oauth/google/callback
```

**لذلك:** في لوحة الأدمن ضع:
```
https://classi-fy.com/api/auth/oauth/google/callback
```
وليس:
```
https://classi-fy.com/api/auth/callback/google    ← خاطئ
https://classi-fy.com/api/auth/callback/provider   ← خاطئ
```

> **ملاحظة:** إذا تركت حقل Redirect URI فارغاً في لوحة الأدمن، سيتم بناء المسار تلقائياً بالشكل الصحيح.

---

*آخر تحديث: مارس 2026*
