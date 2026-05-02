# Classify Flutter — منصة تعليمية للأطفال مع رقابة أبوية

Kids Educational & Parental Control Platform — Flutter Mobile Client

## Prerequisites

- **Flutter SDK** 3.22+ (channel stable)
- **Dart SDK** 3.6+
- **Android Studio** or **VS Code** with Flutter extension
- **Xcode** 15+ (macOS only, for iOS builds)

## Setup

```bash
# 1. Navigate to the project
cd classify_flutter

# 2. Install Flutter dependencies
flutter pub get

# 3. Generate JSON serialization code
dart run build_runner build --delete-conflicting-outputs

# 4. Generate localizations (auto if flutter.generate: true in pubspec)
flutter gen-l10n

# 5. Run the app
flutter run
```

## Architecture

```
lib/
├── main.dart                        # Entry point
├── app.dart                         # MaterialApp.router setup
├── core/
│   ├── config/
│   │   ├── app_config.dart          # API base URL, constants
│   │   ├── routes.dart              # GoRouter with all routes
│   │   └── theme.dart               # Material 3 theme (light/dark)
│   ├── l10n/
│   │   ├── app_ar.arb               # Arabic translations
│   │   ├── app_en.arb               # English translations
│   │   └── generated/               # Auto-generated localizations
│   ├── network/
│   │   ├── api_client.dart          # Dio HTTP client
│   │   ├── api_response.dart        # ApiResponse<T> wrapper
│   │   └── auth_interceptor.dart    # JWT token interceptor
│   └── storage/
│       ├── secure_storage.dart      # Token storage (encrypted)
│       └── preferences.dart         # Locale, theme, onboarding prefs
├── data/
│   ├── models/                      # @JsonSerializable data classes
│   │   ├── parent.dart
│   │   ├── child.dart
│   │   ├── task.dart
│   │   ├── game.dart
│   │   ├── gift.dart
│   │   ├── product.dart
│   │   ├── growth_tree.dart
│   │   ├── notification_model.dart
│   │   └── auth_models.dart         # Login/Register/OTP request/response
│   └── repositories/
│       ├── auth_repository.dart     # /api/auth/* endpoints
│       ├── parent_repository.dart   # /api/family/*, /api/parent/*
│       └── child_repository.dart    # /api/child/* endpoints
├── domain/
│   └── providers/                   # Riverpod providers
│       ├── auth_provider.dart       # Central auth state + singletons
│       ├── locale_provider.dart     # Language switching
│       ├── theme_provider.dart      # Dark/light/system mode
│       ├── parent_provider.dart     # Parent data (children, tasks, etc.)
│       └── child_provider.dart      # Child data (games, tasks, etc.)
└── presentation/
    ├── screens/
    │   ├── splash_screen.dart
    │   ├── auth/                    # 6 auth screens
    │   ├── parent/                  # 6 parent screens (shell + 5 tabs)
    │   └── child/                   # 7 child screens (shell + 5 tabs + WebView)
    └── widgets/
        └── common_widgets.dart      # Reusable UI components
```

## Key Features

### Parent Flow
- Email/password login & registration with 2FA (OTP)
- Dashboard with children list, stats, unique link code
- Task creation and management per child
- Notifications (link requests, task completions, gifts)
- Profile settings (language, theme, password)

### Child Flow
- Link with parent using code + custom 4-digit PIN
- PIN-based login for returning children (saved accounts)
- Educational HTML5 games (loaded via WebView with JS bridge)
- Task answering with point rewards
- Gift viewing
- Growth tree progress visualization
- Colorful child-friendly UI

## Backend

This Flutter app connects to the same Express.js backend:
- **API Base**: `https://classi-fy.com/api/`
- **Auth**: JWT tokens (separate for parent/child/admin)
- **Response Format**: `{"success": true, "data": {...}}` / `{"success": false, "error": "CODE"}`

## Localization

- Arabic (RTL) — default
- English (LTR)
- ARB files in `lib/core/l10n/`
- Auto-generated via `flutter gen-l10n`

## State Management

- **Riverpod** for all state
- `StateNotifierProvider` for auth state
- `FutureProvider.autoDispose` for data fetching
- `ref.invalidate()` for manual refresh

## Theme

- Material 3 design system
- Primary: `#6B4D9D` (purple)
- Cairo font (Google Fonts fallback)
- Child navigation uses distinct colors per tab

## Build

```bash
# Android APK
flutter build apk --release

# Android App Bundle
flutter build appbundle --release

# iOS
flutter build ios --release
```

## Platform Setup (After flutter create)

When setting up platform folders, ensure:

### Android (`android/app/src/main/AndroidManifest.xml`)
- Internet permission: `<uses-permission android:name="android.permission.INTERNET"/>`
- Camera permission (for QR scanner)
- Deep links for `classi-fy.com`

### iOS (`ios/Runner/Info.plist`)
- Camera usage description (for QR scanner)
- Associated domains for deep links
- NSAppTransportSecurity for API calls

## License

Proprietary — Classify Platform
