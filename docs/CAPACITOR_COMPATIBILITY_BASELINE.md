# Capacitor Compatibility Baseline (Phase 1)

Status: active baseline for Classify mobile runtime.

## Official Support Matrix

- Capacitor runtime: 7.x
- Android minimum SDK: 23 (Android 6.0)
- Android target SDK: 35
- iOS runtime: Capacitor iOS 7.x (project target remains controlled by Xcode project settings)

## Practical Notes

- Android 5.x is not currently supported because `minSdkVersion=23` in Android build configuration.
- Any request for Android 5.x must be treated as a dedicated migration task with plugin compatibility and full regression testing.
- Guidance written for Capacitor 6 should not be mixed into this repository without explicit migration notes.

## Current Source of Truth

- Android SDK bounds: `android/variables.gradle`
- Capacitor runtime dependencies: `package.json`
- Capacitor app config: `capacitor.config.json`

## Phase 1 Exit Criteria (Completed)

- Support matrix documented and aligned with repository runtime values.
- Capacitor major version mismatch risk documented.
- Android minimum SDK gap explicitly recorded.
