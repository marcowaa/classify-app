# شرح CI/CD Pipeline رقم #40 — ماذا تم بالفعل (حسب لقطة الشاشة)

## Summary
لقطة الشاشة تُظهر تشغيل **GitHub Actions** لخط **CI/CD Pipeline** بالرقم **#40** وقد انتهى بحالة **Success**. التشغيل كان **يدويًا** عبر `workflow_dispatch` (مذكور: *Manually triggered*) على الفرع **main**، ويظهر إجمالي زمن التنفيذ بحوالي **21m 55s**. كما تُشير الواجهة إلى إنشاء **4 Artifacts**.

## Architecture
واجهة GitHub Actions تعرض الـ workflow على شكل **DAG (شبكة مهام متفرعة/غير دائرية)**:
- توجد مهام تمهيدية/تحقق في البداية.
- ثم توجد مهمة/مهام ضمن **Matrix** (تعمل كتفرعات لبناء Flutter Wrapper بعدة أهداف/تكوينات).
- بعد نجاح البناء يتم **Deploy Mobile Artifacts** لنواتج البناء.
- أخيرًا يتم تنفيذ **Atomic Deployment** لتطبيق التغيير بشكل “متماسك” كدفعة واحدة (Atomic/All-or-Nothing).

## Directory Structure
لا تُظهر اللقطة بنية ملفات الريبو، فهي تعرض فقط **نتيجة تشغيل** الـ workflow في GitHub.

## Key Abstractions (كما تظهر في واجهة الـ workflow)
> هذه “عُبَر” للـ jobs/steps داخل الـ pipeline (وليست أسماء كود من مصدر المشروع).

### Verify Web App
- **Responsibility**: التأكد من جاهزية/سلامة تطبيق الويب قبل الانتقال للبناء والنشر.
- **Lifecycle**: تُنفّذ مبكرًا كـ gate قبل خطوات البناء التي تعتمد على الويب.

### Bump Version
- **Responsibility**: رفع/تحديث رقم الإصدار (غالبًا تحديث ملف إصدار أو متغير يستخدمه مسار البناء).
- **Lifecycle**: تقع بعد Verify Web App وقبل مرحلة البناء حتى تُستخدم النسخة الجديدة داخل artifacts.

### Matrix: Build Flutter Wrapper (apk / appbundle / web)
- **Responsibility**: بناء “Flutter Wrapper” بأكثر من هدف/تكوين داخل مسار تكراري.
- **Lifecycle**: تُنفّذ بعد Bump Version؛ وتجمع نتائج الفروع ضمن نفس job/مرحلة.

### Deploy Mobile Artifacts
- **Responsibility**: نشر/رفع نواتج البناء الخاصة بالهواتف (مثل APK/AppBundle) — أو نشر artifacts الناتجة من الـ Matrix إلى مكان وسيط/توزيع.
- **Lifecycle**: تأتي بعد اكتمال بناء الـ Matrix بنجاح.

### Atomic Deploy
- **Responsibility**: تنفيذ خطوة نشر/تحديث “ذرّي” بحيث يتم التفعيل/الربط النهائي بعد تجهيز كل artifacts المطلوبة.
- **Lifecycle**: آخر خطوة في السلسلة لضمان اكتمال العملية كدفعة واحدة.

## Data Flow (من لقطة الشاشة)
1. **Manually triggered** → يبدأ workflow على **main**.
2. **Verify Web App** يمر بنجاح ✅ كخطوة تحضيرية.
3. **Bump Version** يتم ✅ قبل البناء بحيث تُستخدم النسخة الجديدة في نواتج البناء.
4. **Matrix: Build Flutter Wrapper** يعمل (تظهر علامة 3 jobs completed داخل الـ Matrix في المخطط) ✅.
5. **Deploy Mobile Artifacts** ✅ لنشر نواتج الهاتف/الـ artifacts المنتجة.
6. **Atomic Deploy** ✅ كخطوة أخيرة لتفعيل/إتمام النشر بشكل متماسك.
7. النتيجة النهائية: Workflow **Success** وتظهر **4 Artifacts**.

## Non-Obvious Behaviors & Design Decisions (مما يمكن استنتاجه من شكل الـ UI)
- وجود **Atomic Deploy** يوحي أن النظام يحاول تجنب حالات “نشر جزئي”؛ أي أن التفعيل النهائي لا يتم إلا بعد تجهيز كل المستلزمات.
- استخدام **Matrix** لبناء Flutter Wrapper يعني أن الفريق يفضّل **التوازي** بدل البناء التسلسلي لكل منصة/تكوين، لتقليل وقت الـ pipeline.
- وضع **Bump Version** قبل البناء يضمن أن رقم الإصدار داخل الـ artifacts متوافق مع الإصدار المُرفوع في نفس run.

## Module Reference
لا يمكن تحديد ملفات source code من اللقطة فقط؛ فهي ليست واجهة كود بل واجهة GitHub Actions للـ workflow run.

## Suggested Reading Order (لمن يريد فهم pipeline فعليًا)
للبحث في الريبو عن تعريف هذا الـ workflow:
1. ملف الـ workflow الخاص بـ CI/CD (غالبًا تحت `.github/workflows/`) الذي يطابق رقم/اسم الـ pipeline.
2. تعريف `workflow_dispatch` والـ inputs إن وجدت.
3. قسم jobs/steps الخاصة بـ: Verify Web App + Bump Version + Matrix build + Deploy Mobile Artifacts + Atomic Deploy.

---

إذا أرسلت اسم ملف الـ workflow (مثلاً `ci.yml` أو `build-manual.yml`) أو فتحت نافذة “Workflow file” من GitHub Actions، أقدر بعدها أوصف بالضبط كيف تُنفذ كل step داخل الكود (بدون تخمين).