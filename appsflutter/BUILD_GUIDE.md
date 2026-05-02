# 🚀 دليل بناء تطبيق Classify Flutter — خطوة بخطوة

## 📋 المتطلبات الأساسية (لازم تنزلهم الأول)

### 1. Flutter SDK
```bash
# تحميل من: https://docs.flutter.dev/get-started/install
# أو لو على ويندوز ممكن تستخدم:
winget install Flutter.Flutter

# تأكد إنه شغال:
flutter --version
# المطلوب: Flutter 3.41+ / Dart 3.11+
```

### 2. Android Studio (لبناء تطبيق Android)
```
تحميل من: https://developer.android.com/studio
بعد التثبيت:
  → افتح Android Studio
  → Settings → Appearance & Behavior → System Settings → Android SDK
  → تأكد من تثبيت:
    ✅ Android SDK Platform 34 (أو أحدث)
    ✅ Android SDK Build-Tools
    ✅ Android SDK Command-line Tools
    ✅ Android SDK Platform-Tools
```

### 3. Xcode (لبناء تطبيق iOS — Mac فقط)
```
تحميل من Mac App Store
بعد التثبيت:
  → sudo xcode-select --switch /Applications/Xcode.app
  → sudo xcodebuild -runFirstLaunch
```

### 4. VS Code (اختياري لكن مريح)
```
Extensions المطلوبة:
  → Flutter
  → Dart
```

---

## 🏗️ الخطوة 1: تجهيز المشروع

```bash
# ادخل على مجلد المشروع
cd appsflutter

# تأكد إن Flutter شايف كل حاجة
flutter doctor
```

**لازم تشوف ✅ جنب:**
- Flutter (Channel stable)
- Android toolchain
- Chrome (اختياري)
- Android Studio
- Xcode (لو على Mac)

```bash
# نزّل كل المكتبات (dependencies)
flutter pub get

# ولّد الملفات المطلوبة (models, freezed, riverpod)
dart run build_runner build --delete-conflicting-outputs

# ولّد ملفات الترجمة
flutter gen-l10n
```

---

## 📱 الخطوة 2: تشغيل التطبيق في وضع التطوير (Debug)

### على محاكي Android (Emulator):
```bash
# افتح Android Studio → Device Manager → Create Device
# اختار أي جهاز (مثلاً Pixel 7) → نزّل صورة نظام → شغّل المحاكي

# بعدين شغّل التطبيق:
flutter run
```

### على جهاز Android حقيقي:
```
1. على الموبايل: Settings → About Phone → اضغط "Build Number" 7 مرات
2. ارجع → Developer Options → فعّل "USB Debugging"
3. وصّل الموبايل بالكمبيوتر عن طريق USB
4. وافق على رسالة "Allow USB debugging"
```
```bash
# تأكد إن الجهاز ظاهر:
flutter devices

# شغّل التطبيق:
flutter run
```

### على محاكي iOS (Mac فقط):
```bash
# افتح محاكي iPhone
open -a Simulator

# شغّل التطبيق:
flutter run
```

---

## ⚙️ الخطوة 3: تعديل إعدادات التطبيق قبل النشر

### 3.1 — تغيير Application ID (اسم الحزمة)

الـ Application ID الحالي: `com.classify.classify_flutter`

**لازم تغيره لاسم فريد خاص بيك.**

📄 ملف: `android/app/build.gradle.kts`
```kotlin
// السطر 25 — غيّر:
applicationId = "com.classify.classify_flutter"
// لـ:
applicationId = "com.classify.app"  // أو أي اسم تاني فريد
```

📄 ملف: `android/app/src/main/AndroidManifest.xml`
— مش محتاج تغيير، هو بيقرأ من build.gradle.kts تلقائيًا.

📄 ملف iOS: `ios/Runner.xcodeproj/project.pbxproj`
```
ابحث عن PRODUCT_BUNDLE_IDENTIFIER وغيّره:
PRODUCT_BUNDLE_IDENTIFIER = com.classify.app;
```

### 3.2 — تغيير اسم التطبيق

📄 Android: `android/app/src/main/AndroidManifest.xml`
```xml
<!-- السطر 7 — غيّر android:label -->
android:label="Classify"
```

📄 iOS: `ios/Runner/Info.plist`
```xml
<!-- ابحث عن CFBundleDisplayName وغيّره -->
<key>CFBundleDisplayName</key>
<string>Classify</string>
```

### 3.3 — تغيير أيقونة التطبيق

```bash
# ضع الأيقونة (1024x1024 PNG) في: assets/icons/app_icon.png
# الملف flutter_launcher_icons.yaml جاهز — بس شغّل:
dart run flutter_launcher_icons
```

### 3.4 — تغيير Splash Screen

```bash
# ضع صورة السبلاش في: assets/images/splash_logo.png
# الملف flutter_native_splash.yaml جاهز — بس شغّل:
dart run flutter_native_splash:create
```

### 3.5 — ضبط رابط السيرفر (API)

📄 ملف: `lib/core/config/app_config.dart`
```dart
// السطر 6 — تأكد إن الرابط صح:
static const String baseUrl = 'https://classi-fy.com';
// لو عندك سيرفر تاني غيّره هنا
```

---

## 🔑 الخطوة 4: إعداد Firebase (للإشعارات)

### 4.1 — إنشاء مشروع Firebase
```
1. ادخل على: https://console.firebase.google.com
2. أنشئ مشروع جديد → "Classify"
3. Add App → اختار Android
4. Package name: com.classify.app (نفس الـ applicationId)
5. نزّل ملف google-services.json
6. حطّه في: android/app/google-services.json
```

### 4.2 — لـ iOS
```
1. في Firebase Console → Add App → iOS
2. Bundle ID: com.classify.app
3. نزّل GoogleService-Info.plist
4. حطّه في: ios/Runner/GoogleService-Info.plist
```

### 4.3 — تفعيل Cloud Messaging
```
في Firebase Console:
  → Engage → Cloud Messaging → Enable
```

> ⚠️ **ملحوظة:** لو مش محتاج إشعارات Push دلوقتي، ممكن تعلّق Firebase مؤقتًا:
> في `pubspec.yaml` علّق سطور `firebase_core` و `firebase_messaging`
> وفي `lib/main.dart` شيل أي `Firebase.initializeApp()`

---

## 🏗️ الخطوة 5: بناء ملف APK (Android)

### Debug APK (للتجربة):
```bash
flutter build apk --debug
# الملف هيكون في:
# build/app/outputs/flutter-apk/app-debug.apk
```

### Release APK (للنشر):
```bash
# 5.1 — أنشئ مفتاح توقيع (مرة واحدة بس):
keytool -genkey -v -keystore ~/classify-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias classify

# 5.2 — أنشئ ملف android/key.properties:
```

📄 أنشئ ملف: `android/key.properties`
```properties
storePassword=كلمة_السر_اللي_كتبتها
keyPassword=كلمة_السر_اللي_كتبتها
keyAlias=classify
storeFile=المسار/الكامل/classify-key.jks
```

📄 عدّل ملف: `android/app/build.gradle.kts` — أضف قبل `android {`:
```kotlin
import java.util.Properties
import java.io.FileInputStream

val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}
```

وداخل `android {` أضف:
```kotlin
signingConfigs {
    create("release") {
        keyAlias = keystoreProperties["keyAlias"] as String
        keyPassword = keystoreProperties["keyPassword"] as String
        storeFile = file(keystoreProperties["storeFile"] as String)
        storePassword = keystoreProperties["storePassword"] as String
    }
}

buildTypes {
    release {
        signingConfig = signingConfigs.getByName("release")
        isMinifyEnabled = true
        isShrinkResources = true
        proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
    }
}
```

```bash
# 5.3 — ابني ملف Release APK:
flutter build apk --release

# الملف هيكون في:
# build/app/outputs/flutter-apk/app-release.apk
```

### AAB (لرفعه على Google Play):
```bash
flutter build appbundle --release
# الملف هيكون في:
# build/app/outputs/bundle/release/app-release.aab
```

---

## 🍎 الخطوة 6: بناء تطبيق iOS (Mac فقط)

```bash
# 6.1 — نزّل المكتبات:
cd ios
pod install
cd ..

# 6.2 — ابني:
flutter build ios --release

# 6.3 — افتح في Xcode للتوقيع والرفع:
open ios/Runner.xcworkspace
```

في Xcode:
```
1. اختار Runner → Signing & Capabilities
2. حط Team (محتاج Apple Developer Account - $99/سنة)
3. Product → Archive
4. Distribute App → App Store Connect
```

---

## 🏪 الخطوة 7: رفع التطبيق على المتاجر

### Google Play Store:
```
1. ادخل: https://play.google.com/console
   (محتاج حساب: $25 مرة واحدة)
2. Create App → "Classify"
3. Production → Create Release
4. ارفع ملف AAB (مش APK)
5. املأ:
   → Store listing (اسم، وصف، صور)
   → Content rating questionnaire
   → Target audience: Children (مهم!)
   → Privacy policy URL
   → Data safety form
6. Submit for Review
```

### Apple App Store:
```
1. ادخل: https://appstoreconnect.apple.com
   (محتاج Apple Developer Account: $99/سنة)
2. My Apps → + → New App
3. ارفع الـ Build من Xcode (الخطوة 6)
4. املأ:
   → App name, subtitle, description
   → Screenshots (6.7" + 5.5")
   → Age Rating: Made for Kids
   → Privacy Policy URL
5. Submit for Review
```

---

## 📁 هيكل الملفات المهمة

```
appsflutter/
├── lib/                          ← كود Dart الرئيسي
│   ├── main.dart                 ← نقطة بداية التطبيق
│   ├── app.dart                  ← MaterialApp + Router + Theme
│   ├── core/
│   │   ├── config/
│   │   │   ├── app_config.dart   ← ⭐ رابط السيرفر (API URL)
│   │   │   ├── routes.dart       ← مسارات الصفحات
│   │   │   └── theme.dart        ← ألوان وخطوط التطبيق
│   │   ├── network/
│   │   │   ├── api_client.dart   ← Dio HTTP client
│   │   │   └── auth_interceptor.dart
│   │   ├── l10n/                 ← ملفات الترجمة (عربي/إنجليزي)
│   │   └── storage/              ← تخزين آمن (tokens)
│   ├── data/
│   │   ├── models/               ← موديلات البيانات (User, Child, Game...)
│   │   └── repositories/         ← اتصال بالـ API
│   ├── domain/
│   │   └── providers/            ← Riverpod state management
│   └── presentation/
│       ├── screens/              ← كل الشاشات
│       │   ├── auth/             ← تسجيل دخول/تسجيل/OTP
│       │   ├── child/            ← شاشات الطفل (ألعاب، مهام، هدايا)
│       │   └── parent/           ← شاشات الوالد (لوحة التحكم)
│       └── widgets/              ← عناصر مشتركة
├── android/                      ← إعدادات Android
│   └── app/
│       ├── build.gradle.kts      ← ⭐ applicationId + signing
│       └── src/main/
│           └── AndroidManifest.xml ← ⭐ اسم التطبيق + صلاحيات
├── ios/                          ← إعدادات iOS
├── assets/                       ← صور وأيقونات
├── pubspec.yaml                  ← ⭐ المكتبات والإصدار
└── BUILD_GUIDE.md                ← هذا الملف
```

---

## ⚡ أوامر سريعة (Quick Reference)

| الأمر | الوظيفة |
|---|---|
| `flutter pub get` | تنزيل المكتبات |
| `dart run build_runner build --delete-conflicting-outputs` | توليد الكود (models/providers) |
| `flutter gen-l10n` | توليد ملفات الترجمة |
| `flutter analyze` | فحص الأخطاء |
| `flutter run` | تشغيل على الجهاز/المحاكي |
| `flutter run --release` | تشغيل بوضع الإنتاج |
| `flutter build apk --debug` | بناء APK تجريبي |
| `flutter build apk --release` | بناء APK إنتاجي |
| `flutter build appbundle --release` | بناء AAB لـ Google Play |
| `flutter build ios --release` | بناء iOS |
| `flutter clean` | مسح الملفات المؤقتة |
| `flutter doctor` | فحص البيئة |

---

## 🔧 حل المشاكل الشائعة

### المشكلة: `Gradle build failed`
```bash
cd android
./gradlew clean    # أو على ويندوز: gradlew.bat clean
cd ..
flutter clean
flutter pub get
flutter run
```

### المشكلة: `CocoaPods not installed` (iOS)
```bash
sudo gem install cocoapods
cd ios && pod install && cd ..
```

### المشكلة: `NDK not configured`
```
→ Android Studio → SDK Manager → SDK Tools
→ ✅ NDK (Side by side) → Apply
```

### المشكلة: `Unable to find bundled Java`
```bash
flutter config --jdk-dir="C:\Program Files\Android\Android Studio\jbr"
```

### المشكلة: `MinSdk too low`
```
في android/app/build.gradle.kts:
  minSdk = 21  # أو أعلى
```

---

## 🎯 ملخص الخطوات

```
1. ✅ نزّل Flutter SDK + Android Studio
2. ✅ شغّل flutter doctor وتأكد كل حاجة ✅
3. ✅ flutter pub get → نزّل المكتبات
4. ✅ dart run build_runner build → ولّد الكود
5. ✅ عدّل applicationId + اسم التطبيق + الأيقونة
6. ✅ (اختياري) جهّز Firebase للإشعارات
7. ✅ flutter run → جرّب على المحاكي أو الموبايل
8. ✅ flutter build appbundle --release → ابني للنشر
9. ✅ ارفع على Google Play / App Store
```

---

**المشروع جاهز — كل الشاشات والاتصال بالسيرفر مبرمج.**
**كل اللي محتاجه هو تنفيذ الخطوات دي وهيشتغل! 🚀**
