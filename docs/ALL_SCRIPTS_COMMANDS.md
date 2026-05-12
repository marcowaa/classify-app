# دليل تشغيل كل السكربتات (ملف واحد)

هذا الملف يجمع كل سكربتات المشروع وأوامر تشغيلها في مكان واحد.

## تشغيل مباشر من ترمنال السيرفر Ubuntu

استخدم هذه البداية من نفس الشكل الذي أرسلته (`root@srv...`):

```bash
cd /docker/classify
npm ci
```

مهم: اكتب أمر `cd /docker/classify` فقط بدون أي نص إضافي بعده.

## 1) سكربتات npm من package.json

شغّلها من جذر المشروع:

```bash
npm run <script-name>
```

| Script | Command داخلي | الاستخدام |
|---|---|---|
| `dev` | `dotenv -v NODE_ENV=development -- tsx server/index.ts` | تشغيل التطوير |
| `build` | `vite build && esbuild ... --outdir=dist` | بناء الإنتاج |
| `start` | `NODE_ENV=production node dist/index.js` | تشغيل الإنتاج |
| `check-env` | `bash ./scripts/check_env.sh` | فحص env (ملاحظة: الملف غير موجود حاليًا) |
| `check-env-dynamic` | `node ./scripts/check_env_dynamic.cjs` | فحص env الديناميكي |
| `env:wizard` | `node ./scripts/env-production-wizard.cjs` | معالج تفاعلي كامل لملف `.env` |
| `env:wizard:prod` | `node ./scripts/env-production-wizard.cjs` | نفس السابق |
| `notifications:vapid` | `node ./scripts/generate_vapid_keys.cjs` | توليد مفاتيح VAPID |
| `notifications:vapid:write` | `node ./scripts/write_vapid_env.cjs --file=.env.production` | كتابة VAPID إلى `.env.production` |
| `notifications:vapid:write:dev` | `node ./scripts/write_vapid_env.cjs --file=.env` | كتابة VAPID إلى `.env` |
| `notifications:fcm:write` | `node ./scripts/write_fcm_env.cjs --file=.env.production` | كتابة FCM إلى `.env.production` |
| `notifications:fcm:write:dev` | `node ./scripts/write_fcm_env.cjs --file=.env` | كتابة FCM إلى `.env` |
| `check-notifications` | `node ./scripts/check_notifications_readiness.cjs` | فحص جاهزية الإشعارات |
| `check-notifications:strict` | `node ./scripts/check_notifications_readiness.cjs --strict` | فحص صارم للإشعارات |
| `check-notifications:strict:ios` | `node ./scripts/check_notifications_readiness.cjs --strict --require-ios` | فحص صارم مع iOS |
| `env:example` | `cp .env.example .env` | نسخ env مثال |
| `env:example:prod` | `cp .env.example .env.production` | نسخ env إنتاج |
| `env:profile:balanced` | `node ./scripts/switch-capacity-profile.cjs balanced .env` | بروفايل سعة متوازن |
| `env:profile:high` | `node ./scripts/switch-capacity-profile.cjs high-throughput .env` | بروفايل سعة مرتفع |
| `cap:sync` | `npx cap sync android` | مزامنة Capacitor Android |
| `cap:open` | `npx cap open android` | فتح مشروع Android Studio |
| `cap:doctor:prod` | `node ./scripts/capacitor-production-check.cjs --strict` | فحص إنتاج Capacitor |
| `cap:build` | `cross-env VITE_API_BASE=... npm run build && npx cap sync android` | بناء + مزامنة Capacitor |
| `cap:build:win` | `set VITE_API_BASE=...&& npm run build && npx cap sync android` | نسخة ويندوز فقط |
| `android:release:publish` | `bash ./scripts/publish-android-release.sh` | نشر Android release |
| `android:release:publish:skip-web` | `bash ./scripts/publish-android-release.sh --skip-web-build` | نشر Android بدون ويب |
| `android:release:publish:win` | `powershell -ExecutionPolicy Bypass -File ./scripts/publish-android-release.ps1` | نشر Android على ويندوز فقط |
| `android:release:publish:skip-web:win` | `powershell -ExecutionPolicy Bypass -File ./scripts/publish-android-release.ps1 -SkipWebBuild` | نشر Android ويندوز فقط بدون ويب |
| `prestart` | `npm run check-env-dynamic` | فحص قبل start |
| `check` | `tsc` | TypeScript check |
| `media:repair-urls:dry` | `node scripts/repair-object-urls.js` | فحص إصلاح روابط media (بدون تطبيق) |
| `media:repair-urls` | `node scripts/repair-object-urls.js --apply` | تطبيق إصلاح روابط media |
| `db:audit` | `node scripts/db-audit.cjs` | تدقيق قاعدة البيانات |
| `db:hardening` | `node scripts/db-apply-hardening.cjs` | تقوية DB |
| `db:push` | `drizzle-kit push` | دفع مخطط DB |
| `admin:setup` | `node scripts/manage-admin.js` | إعداد admin |
| `admin:reset` | `node scripts/manage-admin.js` | إعادة ضبط admin |
| `test` | `node --experimental-vm-modules ...jest.js --forceExit` | تشغيل الاختبارات |
| `test:critical-flow` | `node --experimental-vm-modules ...jest.js --runInBand ...` | اختبارات المسارات الحرجة |

## 2) سكربتات مباشرة داخل scripts/ (تشغيل يدوي)

> القاعدة العامة:
> - ملفات `.cjs` و`.js`: `node <path>`
> - ملفات `.ts`: `npx tsx <path>`
> - ملفات `.sh`: `bash <path>`
> - ملفات `.ps1`: تستخدم فقط لو كنت على ويندوز

### A) Node scripts

- `node ./scripts/add-translations.cjs`
- `node ./scripts/apply-i18n-replacements.cjs`
- `node ./scripts/audit-locales.cjs`
- `node ./scripts/build-all-locales.cjs`
- `node ./scripts/capacitor-production-check.cjs`
- `node ./scripts/check_env_dynamic.cjs`
- `node ./scripts/check_notifications_readiness.cjs`
- `node ./scripts/create-admin.js`
- `node ./scripts/db-apply-hardening.cjs`
- `node ./scripts/db-audit.cjs`
- `node ./scripts/env-production-wizard.cjs`
- `node ./scripts/extract-navigation.cjs`
- `node ./scripts/extract-navigation.js`
- `node ./scripts/generate-icons.cjs`
- `node ./scripts/generate_vapid_keys.cjs`
- `node ./scripts/i18n-migrate-all.cjs`
- `node ./scripts/i18n-replace-all.cjs`
- `node ./scripts/manage-admin.js`
- `node ./scripts/repair-object-urls.js`
- `node ./scripts/check-mobile-release-assets.cjs`
- `node ./scripts/switch-capacity-profile.cjs`
- `node ./scripts/write_fcm_env.cjs`
- `node ./scripts/write_vapid_env.cjs`

### B) TypeScript scripts

- `npx tsx ./scripts/seed-math-game.ts`
- `npx tsx ./scripts/seed-memory-game.ts`
- `npx tsx ./scripts/seed-symbols.ts`

### C) Bash scripts

- `bash ./scripts/deploy-fast.sh`
- `bash ./scripts/docker-entrypoint.sh`
- `bash ./scripts/hostinger-apply-runtime-hardening.sh`
- `bash ./scripts/publish-android-release.sh`
- `bash ./scripts/setup.sh`
- `bash ./scripts/start.sh`
- `bash ./scripts/vps-deploy.sh`

ملاحظة إنتاج مهمة:
- `deploy-fast.sh` يشغّل فحص إلزامي لسلامة ملفات الموبايل (`APK/AAB`) عبر `check-mobile-release-assets.cjs --strict` قبل البناء.
- للتجاوز الطارئ فقط: `ALLOW_MISSING_MOBILE_RELEASE_ASSETS=true bash ./scripts/deploy-fast.sh`

### E) تحديث ملفات الموبايل (APK/AAB) من GitHub على السيرفر

**الفكرة:**
- عند رفع Android APK/AAB الجديدة وتحديثها داخل الريبو (GitHub)، سكربت السيرفر يعمل:
  1) `git pull` + `git lfs pull` للـ binaries
  2) حذف الـ binaries القديمة (latest + archive)
  3) التحقق الصارم (`--strict`) من وجود/عدم كونها LFS pointers
  4) (اختياري) rebuild + restart للحاوية حتى تخدم روابط `/apps/*`

#### 1) على جهازك: جهّز وارفع أحدث APK/AAB إلى GitHub
انسخ الـ binaries (النهائية الموقعة) إلى هذه المسارات داخل الريبو وادفعها على فرع `main`:

- أحدث APK (Latest):
  - `client/public/apps/classify-app-latest.apk`
- أحدث AAB (Latest):
  - `client/public/apps/classify-googleplay-latest.aab`

- أحدث APK (Archive بتاريخ الإصدار/الـ tag):
  - `client/public/apps/archive/classify-app-<releaseTag>.apk`
- أحدث AAB (Archive بتاريخ الإصدار/الـ tag):
  - `client/public/apps/archive/classify-googleplay-<releaseTag>.aab`

> ملاحظة: سكربتات التحقق/الواجهات في الموقع تربط روابط التحميل بـ:
> - `/apps/classify-app-latest.apk`
> - `/apps/classify-googleplay-latest.aab`

#### 2) على السيرفر: شغّل Refresh (يستبدل القديم بالجديد)
نفّذ من داخل السيرفر (Linux/Ubuntu):

```bash
bash ./scripts/hostinger-refresh-mobile-apps.sh \
  --project-dir /opt/classify \
  --branch main \
  --compose-project-name classify_main \
  --skip-admin-setup \
  --apk-only
```

#### 3) تحقق يدوي قبل/بعد التشغيل (مستحسن)
```bash
node ./scripts/check-mobile-release-assets.cjs --strict
```

**بوابة التحقق (`--strict`) تشمل:**
- وجود `client/public/apps/latest-release.json`
- التأكد أن الـ APK/AAB **ليسوا** Git LFS pointers (لازم يكونوا binaries حقيقية)
- تحقق توقيع الـ APK عبر `apksigner` (v2/v3 = true + رفض debug key)
- تحقق توقيع الـ AAB عبر `jarsigner` (رفض unsigned + رفض debug key / قبول relax في بعض حالات chain)

> إذا فشل التحقق لأن `apksigner`/`jarsigner` غير موجودين على PATH، لازم تثبيت أدوات التوقيع على بيئة السيرفر/الدخول لهم داخل الـ PATH أو جعلها متاحة للمستخدم اللي يشغّل السكربت.

### E) ملاحظات “Git push / LFS DNS” (لو ظهرت نفس أخطاء اللقطة)

لو واجهت أخطاء مثل:
- `fatal: unable to access ... Could not resolve host: github.com`
- `lookup lfs.github.com: no such host`

فده غالبًا مشكلة DNS/Proxy على جهازك (حتى لو كان `lfs.github.com` يشتغل عندك أحيانًا). جرّب:
- تأكد من DNS/VPN أو proxy لو عندك
- أعد تشغيل الشبكة/المحول
- إذا تستخدم proxy: اضبط `HTTP_PROXY` و `HTTPS_PROXY` (وأحيانًا `NO_PROXY`) ثم أعد المحاولة

### F) PowerShell scripts

- Windows only: `powershell -ExecutionPolicy Bypass -File ./scripts/publish-android-release.ps1`

## 3) سكربتات جذر المشروع (Root)

- `bash ./deploy.sh`

## 4) أسرع أوامر عملية (Production)

- إعداد `.env` بشكل تفاعلي كامل:

```bash
npm run env:wizard
```

- فحص `.env` بعد الإعداد:

```bash
npm run check-env-dynamic
```

- فحص الإشعارات للإنتاج:

```bash
npm run check-notifications:strict
```

- بناء وتشغيل إنتاج:

```bash
npm run build
npm run start
```

- بايبلاين كامل مناسب لسيرفرك (Ubuntu):

```bash
cd /docker/classify
npm ci
npm run env:wizard
npm run check-env-dynamic
npm run check-notifications:strict
npm run build
npm run test
npm run start
```

## 5) ملاحظات مهمة

- سكربت `check-env` يشير إلى `scripts/check_env.sh` لكنه غير موجود حاليًا في المشروع.
- على Ubuntu تجاهل أوامر `:win` واستخدم أوامر Linux/Bash فقط.
- لبعض السكربتات باراميترات إضافية؛ استخدم `--help` إن كان مدعومًا في السكربت.
