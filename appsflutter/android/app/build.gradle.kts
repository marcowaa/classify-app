import java.util.Properties
import org.gradle.api.GradleException

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (!keystorePropertiesFile.exists()) {
    throw GradleException(
        "Missing signing config file: ${keystorePropertiesFile}. " +
            "Create it (appsflutter/android/key.properties) with storeFile/storePassword/keyAlias/keyPassword."
    )
}
keystorePropertiesFile.inputStream().use { keystoreProperties.load(it) }

fun requiredKeystoreProperty(name: String): String =
    keystoreProperties.getProperty(name)
        ?.trim()
        ?.takeIf { it.isNotEmpty() }
        ?: throw GradleException("key.properties is missing required property: ${name}")

android {
    namespace = "com.classify.classify_flutter"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        isCoreLibraryDesugaringEnabled = true
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.classify.classify_flutter"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName

        // Limit ABIs to reduce native strip failures from plugins shipping extra architectures.
        ndk {
            abiFilters += setOf("arm64-v8a", "armeabi-v7a")
        }
    }

    signingConfigs {
        create("release") {
            val storeFilePath = requiredKeystoreProperty("storeFile")
            storeFile = file(storeFilePath)
            storePassword = requiredKeystoreProperty("storePassword")
            keyAlias = requiredKeystoreProperty("keyAlias")
            keyPassword = requiredKeystoreProperty("keyPassword")

            // Enforce v1/v2/v3 so `apksigner verify` is fully valid.
            enableV1Signing = true
            enableV2Signing = true
            enableV3Signing = true
        }
    }

    buildTypes {
        release {
            // Signed with release keystore (from appsflutter/android/key.properties).
            signingConfig = signingConfigs.getByName("release")

            // Avoid native debug symbol stripping failures that break AAB builds
            ndk {
                // Prevent AGP from failing during "strip debug symbols" for native libs on CI.
                // Full keeps debug symbols instead of trying to strip them.
                debugSymbolLevel = "FULL"
            }

            // Workaround for Flutter/AGP "failed to strip debug symbols from native libraries"
            // Keep debug symbols for native .so files in release to prevent the failing strip task.
            packaging {
                jniLibs {
                    keepDebugSymbols.add("**/*.so")
                }
            }
        }
    }
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}

flutter {
    source = "../.."
}
