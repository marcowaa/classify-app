أكيد — شرح “تستخدمهم إزاي” و“وظيفة كل خيار” للـ workflows الظاهرة عندك (حسب الملفات الموجودة في `.github/workflows/*` والـ deploy scripts في `scripts/`).

---

## 1) CI/CD Pipeline  — `.github/workflows/ci.yml`
**متى تستخدمه؟**
- عندك بناء يدوي/اختبار قبل الـ tags (لأنه **مش Tag-trigger**؛ شرطه الأساسي `workflow_dispatch`).

**بيعمل إيه؟**
- Web: `npm ci` + TypeScript check + Unit tests + build.
- Flutter wrapper (حسب inputs لو تشغيل يدوي):
  - APK (اختياري)
  - AAB (اختياري)
  - Web wrapper (اختياري)
- في حالة تشغيل deploy ضمن نفس الـ workflow: يستعمل سيرفر scripts الموجودة (لكن deploy نفسه عندك مرتبط بـ workflow_dispatch مش v*).

**ليه موجود؟**
- كمرحلة “تجهيز/تأكد” قبل ما تعمل إنتاج يعتمد على tags.

---

## 2) Manual Android Release (Signed AAB + …) — `.github/workflows/build-manual.yml`
**متى تستخدمه؟**
- لما تريد تبني **APK + AAB** يدويًا “مرة واحدة” (من زر workflow_dispatch) باستخدام signing secrets.

**بيعمل إيه؟**
- يكتب `appsflutter/android/key.properties` من secrets (keystore production فقط).
- يبني:
  - `flutter build apk --release`
  - `flutter build appbundle --release`
- يفحص إن artifacts موجودة ويرفعها كـ GitHub artifacts.

**ليه موجود؟**
- للـ pre-production / التجربة قبل اعتماد نظام tags للإنتاج.

---

## 3) Manual Mobile Artifacts Refresh — `.github/workflows/deploy-manual.yml`
**متى تستخدمه؟**
- لما يكون عندك APK/AAB معمول بالفعل على السيرفر (أو متوفر في repo مع LFS)، وتريد **تحديث السيرفر بدون rebuild**.

**بيعمل إيه؟**
- يعمل SSH للسيرفر ويشغّل:
  - `scripts/refresh-mobile-artifacts.sh`
- ده بيقوم بـ:
  - تنظيف ملفات latest/archive على السيرفر
  - `git lfs pull` لملفات الـ APK/AAB
  - Validation عبر `scripts/check-mobile-release-assets.cjs`
  - (اختياري) rebuild + restart containers

**ليه موجود؟**
- كـ “Sync-only”/maintenance workflow.

---

## 4) Production Release (Tags only) — `.github/workflows/release-on-tag.yml`  ✅
**وده أهم خيار لإنتاجك.**
**متى يستخدم؟**
- فقط عند `git push` لــ tags على شكل: `v*`  
  مثال: `v1.0.1`

**بيعمل إيه خطوة بخطوة؟**
1) **Tag gate / version match**
   - يقارن `TAG` (بدون v) مع `appsflutter/pubspec.yaml` versionName.
   - لو mismatch → يفشل.

2) **Build**
   - `flutter build apk --release`
   - `flutter build appbundle --release`

3) **Signing + Integrity checks قبل الديبلاي**
   - APK:
     - `apksigner verify` للتأكد من v2/v3
     - رفض debug keys تلقائيًا
   - AAB:
     - `jarsigner -verify` للتأكد أنه مش unsigned
   - إنشاء hash files:
     - `app-release.apk.sha256`
     - `app-release.aab.sha256`

4) **GitHub Release**
   - ينشئ GitHub Release على نفس `vX.Y.Z`
   - ويرفق APK/AAB

5) **SSH Deploy atomic**
   - يرفع `release-bundle/` إلى السيرفر في:
     - `/var/www/releases/staging/`
   - يشغّل:
     - `scripts/deploy-release.sh`
   - والـ atomic swap بيكون عبر symlinks:
     - `/var/www/app/current`
     - `/var/www/app/previous`

6) **Post-deploy gate**
   - فحص logs داخل السيرفر (grep) لـ:
     - `AndroidRuntime`
     - `FlutterError`

**ليه موجود؟**
- لأنه يحقق هدفك “one-tag production deployment system”:
  - Tag واحد = Release كاملة + Deploy بدون تدخل يدوي.

---

# Recommendation “إيه تختار إمتى؟”
- **قبل ما تعمل production tag** → استخدم `CI/CD Pipeline` أو `Manual Android Release`
- **تصحيح/refresh بدون rebuild** → استخدم `Manual Mobile Artifacts Refresh`
- **إنتاج فعلي (الهدف الأساسي)** → استخدم `Production Release (Tags only)` فقط ✅

---

## سؤال صغير عشان أظبط لك الاستخدام بدقة 100%
هل السيرفر عندكم فعلاً root deploy فيه `/var/www` (زي ما سكربتاتنا حالياً) ولا كان مستخدم سابقًا `/srv/classify`؟
- لو تبعتلي إجابة واحدة (أي مسار فعلي)، أقولك “الـ Production workflow” مضبوط 100% على سيرفرك ولا محتاج نغير `DEPLOY_ROOT` فقط.