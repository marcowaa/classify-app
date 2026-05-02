# الدليل الشامل لضبط خدمات Classify في الإنتاج

تاريخ الإصدار: 2026-03-22
النطاق: تشغيل كل الخدمات بكفاءة في بيئة Production (تسجيل دخول + OTP + إشعارات + خدمات مساندة)

---

## 1) الهدف من هذا الملف

هذا الملف مصمم كمرجع تشغيل نهائي من الصفر حتى التشغيل الكامل، ويغطي:
- تجهيز السيرفر والبنية الأساسية
- ضبط المتغيرات السرية (Env)
- تفعيل OTP عبر Email وSMS
- تفعيل Push Notifications (Web + Mobile + OneSignal)
- أوامر التشغيل على السيرفر
- خطوات التحقق (Health + Readiness + Logs)
- روابط مباشرة للوحات المزودين

---

## 2) خريطة الخدمات في المشروع

الخدمات الأساسية:
- App (Node/Express)
- PostgreSQL
- Redis
- MinIO

الخدمات الوظيفية:
- تسجيل الدخول + OTP (Email/SMS)
- Web Push عبر VAPID
- Mobile Push عبر Firebase FCM
- OneSignal (اختياري/مدفوع حسب التفعيل من لوحة الأدمن)

ملفات مرجعية مهمة داخل المشروع:
- server/routes/auth.ts
- server/providers/otp/bootstrap.ts
- server/providers/otp/providerFactory.ts
- server/mailer.ts
- server/sms-otp.ts
- server/services/mobilePushService.ts
- server/services/oneSignalService.ts
- scripts/check_notifications_readiness.cjs
- docs/NOTIFICATIONS_DEVELOPMENT_REFERENCE.md
- docs/HOSTINGER_DOCKER_OPERATIONS_RUNBOOK.md
- docs/HOSTINGER_RUNTIME_APPLY_STEPS.md

---

## 3) روابط المزودين المباشرة (لوحات الإعداد)

### 3.1 Hostinger (VPS + DNS + Email)
- لوحة VPS: https://hpanel.hostinger.com/vps
- إدارة DNS: https://hpanel.hostinger.com/domains
- إدارة البريد: https://hpanel.hostinger.com/emails

### 3.2 Firebase (Auth + FCM)
استبدل PROJECT_ID بمعرف مشروعك:
- Authentication Providers:
  - https://console.firebase.google.com/project/PROJECT_ID/authentication/providers
- Project Settings (General / SHA fingerprints):
  - https://console.firebase.google.com/project/PROJECT_ID/settings/general
- Service Accounts (Admin SDK JSON):
  - https://console.firebase.google.com/project/PROJECT_ID/settings/serviceaccounts/adminsdk
- Cloud Messaging:
  - https://console.firebase.google.com/project/PROJECT_ID/cloudmessaging

### 3.3 OneSignal
- Apps Dashboard: https://dashboard.onesignal.com/apps
- مفاتيح التطبيق (App ID / REST API Key):
  - https://dashboard.onesignal.com

### 3.4 Twilio (لو SMS عبر Twilio)
- Console Home: https://console.twilio.com
- Account SID/Auth Token:
  - https://console.twilio.com/us1/account/keys-credentials/api-keys
- Phone Numbers:
  - https://console.twilio.com/us1/develop/phone-numbers/manage/incoming

### 3.5 Resend (لو Email عبر Resend)
- API Keys: https://resend.com/api-keys
- Domains: https://resend.com/domains

---

## 4) تجهيز السيرفر قبل أي ضبط خدمات

## 4.1 دخول السيرفر والتحديث

نفّذ:

```bash
cd /docker/classitest
pwd
ls -la
git fetch origin
git checkout main
git pull origin main
```

## 4.2 إنشاء ملف البيئة الإنتاجي

إذا غير موجود:

```bash
cp .env.production.example .env.production
```

## 4.3 تشغيل قاعدة البيانات والخدمات

```bash
docker compose up -d db redis minio
```

تحقق:

```bash
docker compose ps
docker compose logs --tail 120 db
```

## 4.4 تطبيق قاعدة البيانات

```bash
npm run db:push
```

---

## 5) ضبط المتغيرات الأساسية (Core Env)

حدّث في .env.production القيم التالية كحد أدنى:

- NODE_ENV=production
- PORT=5000
- APP_URL=https://your-domain.com
- CORS_ORIGIN=https://your-domain.com
- ALLOWED_ORIGINS=https://your-domain.com
- PUBLIC_BASE_URL=https://your-domain.com
- DATABASE_URL=postgresql://...
- JWT_SECRET=قيمة قوية 64+ حرف
- SESSION_SECRET=قيمة قوية 64+ حرف
- DB_PUSH_ON_BOOT=false

توصية تشغيل مستقر:
- ابدأ بـ NODE_CLUSTER_ENABLED=false
- WEB_CONCURRENCY=1
- DB_POOL_MAX=20
- DB_POOL_MIN=2

بعد نجاح التشغيل واختبارات الضغط: ارفع تدريجيا.

---

## 6) ضبط تسجيل الدخول وOTP بالكامل

## 6.1 OTP عبر Email (المسار الموصى به كبداية)

اختر أحد الخيارين:

### خيار A: Resend
أضف:
- RESEND_API_KEY
- RESEND_FROM (اختياري)

### خيار B: SMTP
أضف:
- SMTP_HOST
- SMTP_PORT
- SMTP_SECURE
- SMTP_USER
- SMTP_PASSWORD
- SMTP_FROM

معلومة مهمة:
- منطق الإرسال موجود في server/mailer.ts
- Email OTP Provider يستخدم sendOtpEmail عبر server/providers/otp/EmailProvider.ts

## 6.2 OTP عبر SMS

أضف في env:
- SMS_PROVIDER (مثلا twilio)
- SMS_API_KEY
- المتغيرات الخاصة بالمزود (مثلا TWILIO_ACCOUNT_SID وTWILIO_FROM_NUMBER)

معلومة مهمة:
- sms-otp service يقرأ الإعداد من server/sms-otp.ts
- تفعيل SMS يتطلب شرطين معًا:
  1) بيانات مزود SMS موجودة في env
  2) مزود sms مفعّل من إعدادات OTP داخل النظام (otp_providers)

## 6.3 تحقق أن OTP providers مهيئة

المشروع يضمن bootstrap تلقائيًا عند الإقلاع:
- ensureOtpProviders في server/providers/otp/bootstrap.ts

الافتراضي:
- email: active
- sms: inactive

## 6.4 اختبار OTP عملي

```bash
npm run dev
```

ثم اختبر:
- تسجيل Parent من الواجهة
- Login يطلب OTP
- إدخال OTP من البريد

إذا فشل إرسال OTP:
1) راجع env البريد
2) راجع logs:

```bash
docker compose logs --tail 200 app
```

---

## 7) ضبط Firebase Phone Auth (Android) بشكل صحيح

هذه الخطوة ضرورية إذا ستستخدم Phone Auth على أندرويد.

## 7.1 تفعيل Phone Provider

اذهب إلى:
- https://console.firebase.google.com/project/PROJECT_ID/authentication/providers

فعّل Phone ثم Save.

## 7.2 إضافة SHA-1 وSHA-256 لتطبيق Android

اذهب إلى:
- https://console.firebase.google.com/project/PROJECT_ID/settings/general

داخل Android App:
- أضف SHA-1 release fingerprint
- أضف SHA-256 release fingerprint

بدون هذه الخطوة، Phone Auth على Android غالبًا سيفشل.

## 7.3 ملف google-services.json

حمّل الملف من Firebase وضعه هنا:
- android/app/google-services.json

ثم نفّذ:

```bash
npm run cap:sync
```

---

## 8) ضبط الإشعارات Web Push + Mobile Push

## 8.1 Web Push (VAPID)

توليد وكتابة المفاتيح في .env.production مباشرة:

```bash
npm run notifications:vapid:write
```

أو يدوي:

```bash
npm run notifications:vapid
```

ثم انسخ إلى:
- VAPID_PUBLIC_KEY
- VAPID_PRIVATE_KEY
- VAPID_SUBJECT

## 8.2 Mobile Push (FCM v1)

الطريقة الموصى بها:

1) حمّل Service Account JSON من:
- https://console.firebase.google.com/project/PROJECT_ID/settings/serviceaccounts/adminsdk

2) ضع الملف في أحد المسارات المدعومة مثل:
- ./secure/firebase-service-account.json

3) اكتب القيم تلقائيًا في .env.production:

```bash
npm run notifications:fcm:write
```

سيتم ضبط:
- FCM_PROJECT_ID
- FIREBASE_PROJECT_ID
- FCM_SERVICE_ACCOUNT_JSON

## 8.3 ملفات Native للموبايل

Android:
- android/app/google-services.json

iOS (إذا ستشحن iOS):
- GoogleService-Info.plist داخل ios/

## 8.4 فحص الجاهزية الصارم

```bash
npm run check-notifications:strict
```

وإذا iOS مطلوب:

```bash
npm run check-notifications:strict -- --require-ios
```

---

## 9) ضبط OneSignal (اختياري لكنه مهم للحملات)

المشروع يقرأ App ID وREST API Key من paid services config:
- السيرفر: server/services/oneSignalService.ts
- الواجهة: client/src/lib/oneSignalBridge.ts

خطوات الضبط:
1) أنشئ App في OneSignal
2) خذ القيم:
   - App ID
   - REST API Key
3) من لوحة الأدمن في المشروع:
   - افتح إعدادات الخدمات المدفوعة
   - service: onesignal_push
   - mode = active
   - enabled = true
   - settings.appId = القيمة
   - settings.restApiKey = القيمة

Endpoint الإعداد (للتكامل API):
- GET /api/admin/paid-services-config
- PUT /api/admin/paid-services-config

---

## 10) أوامر التشغيل الإنتاجي على السيرفر (ترتيب تنفيذي)

## 10.1 نشر وتشغيل

```bash
cd /docker/classitest
git fetch origin
git checkout main
git pull origin main

docker compose pull
docker compose build app
docker compose up -d db redis minio
docker compose up -d --force-recreate app
```

## 10.2 فحوصات أساسية بعد التشغيل

```bash
docker compose ps
docker compose logs --tail 120 app
docker compose logs --tail 80 db
```

تحقق API health:

```bash
curl -s -i http://127.0.0.1:5000/api/health
curl -s -i https://your-domain.com/api/health
```

المتوقع: HTTP 200 و body فيه status ok.

---

## 11) اختبار كامل لكل الخدمات (Production Validation)

نفّذ من داخل المشروع:

```bash
npx tsc --noEmit
npm run build
npm run test -- --runInBand
npm run check-notifications:strict
```

اختبار وظيفي يدوي:
1) Login Parent + OTP Email
2) تجربة SMS OTP (لو مفعّل)
3) إشعار in-app
4) Web Push من متصفح
5) Mobile Push على جهاز Android فعلي

---

## 12) Troubleshooting سريع

## 12.1 OTP لا يصل بالبريد

- افحص SMTP/RESEND env
- افحص logs app
- تأكد DNS/SPF/DKIM للدومين البريدي

## 12.2 SMS لا يظهر كخيار

- تأكد SMS_PROVIDER وSMS_API_KEY
- تأكد otp provider sms مفعّل من النظام
- راجع server/sms-otp.ts (isEnabled)

## 12.3 Mobile Push لا يعمل

- تأكد check-notifications:strict يمر
- تأكد google-services.json موجود
- تأكد FCM v1 env مضبوط
- تأكد token التسجيل محفوظ في النظام

## 12.4 Phone Auth Android يفشل

- راجع SHA-1/SHA-256 في Firebase
- راجع package name مطابق Android app
- راجع Phone provider enabled

---

## 13) ضبط الأداء والكفاءة

1) ابدأ بإعدادات محافظة
2) فعّل worker profile = medium
3) راقب الاستهلاك والـ queue
4) ارفع concurrency تدريجيًا
5) لا تفعّل DB_PUSH_ON_BOOT في التشغيل العادي

---

## 14) أمان وتشغيل آمن

- لا تخزن مفاتيح حقيقية في Git
- استخدم secret manager أو env آمنة
- rotate للمفاتيح بشكل دوري (SMTP/FCM/OneSignal/Twilio)
- راقب logs يوميًا
- فعّل تنبيهات uptime

---

## 15) نسخة أوامر جاهزة (Copy/Paste Runbook)

```bash
cd /docker/classitest
git fetch origin
git checkout main
git pull origin main

cp .env.production.example .env.production
# عدّل env.production بالقيم الحقيقية

npm run db:push
npm run notifications:vapid:write
npm run notifications:fcm:write
npm run check-notifications:strict

docker compose up -d db redis minio
docker compose up -d --force-recreate app

docker compose ps
docker compose logs --tail 120 app
curl -s -i http://127.0.0.1:5000/api/health
```

---

## 16) ملاحظات نهائية

- هذا الدليل مبني على السكربتات الموجودة فعليًا في المشروع.
- في حال اختلاف بيئة السيرفر، عدّل المسارات فقط مع الحفاظ على نفس الترتيب.
- الأفضل تنفيذ الخطوات بنفس التسلسل حتى لا تتداخل مشاكل OTP وPush مع بعض.
