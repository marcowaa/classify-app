#!/usr/bin/env bash
set -euo pipefail

VERSION=""
BUILD_NUMBER=""
VERSION_CODE=""
API_BASE="https://classi-fy.com"
SKIP_WEB_BUILD="false"
SKIP_ADMIN_UPLOAD="false"
USE_KEYSTORE_FALLBACK="true"
ALLOW_VERSION_REUSE="false"

LAST_RELEASE_VERSION=""
LAST_RELEASE_BUILD_NUMBER=""
LAST_RELEASE_VERSION_CODE=""

step() {
  echo "[android-release] $*"
}

ensure_file() {
  local p="$1"
  local label="$2"
  if [ ! -f "$p" ]; then
    echo "$label not found: $p" >&2
    exit 1
  fi
}

ensure_dir() {
  local p="$1"
  mkdir -p "$p"
}

is_windows_java_home_value() {
  local v="$1"
  [[ "$v" =~ ^[A-Za-z]:\\ ]] || [[ "$v" == *"\\"* ]]
}

ensure_linux_android_sdk_location() {
  if [ "$(uname -s 2>/dev/null || echo unknown)" != "Linux" ]; then
    return
  fi

  local local_props="$ANDROID_ROOT/local.properties"
  local sdk_dir=""

  if [ -f "$local_props" ]; then
    sdk_dir="$(grep -E '^sdk\.dir=' "$local_props" | head -n 1 | cut -d= -f2- || true)"
    if [ -n "$sdk_dir" ] && is_windows_java_home_value "$sdk_dir"; then
      step "Removing Windows sdk.dir from android/local.properties"
      sed -i '/^sdk\.dir=/d' "$local_props"
      sdk_dir=""
    fi
  fi

  if [ -z "$sdk_dir" ]; then
    local candidate
    for candidate in \
      "${ANDROID_SDK_ROOT:-}" \
      "${ANDROID_HOME:-}" \
      "$HOME/Android/Sdk" \
      "/root/Android/Sdk" \
      "/usr/lib/android-sdk" \
      "/opt/android-sdk" \
      "/usr/local/android-sdk"
    do
      [ -n "$candidate" ] || continue
      [ -d "$candidate" ] || continue
      if [ -d "$candidate/platforms" ] || [ -d "$candidate/build-tools" ]; then
        sdk_dir="$candidate"
        break
      fi
    done
  fi

  if [ -z "$sdk_dir" ]; then
    echo "Android SDK not found. Set ANDROID_SDK_ROOT or ANDROID_HOME, or create android/local.properties with sdk.dir=<path>." >&2
    exit 1
  fi

  export ANDROID_HOME="$sdk_dir"
  export ANDROID_SDK_ROOT="$sdk_dir"
  step "Using ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT"

  if [ -f "$local_props" ]; then
    if grep -qE '^sdk\.dir=' "$local_props"; then
      sed -i "s|^sdk\\.dir=.*$|sdk.dir=$sdk_dir|" "$local_props"
    else
      printf '\nsdk.dir=%s\n' "$sdk_dir" >> "$local_props"
    fi
  else
    printf 'sdk.dir=%s\n' "$sdk_dir" > "$local_props"
  fi
}

sanitize_linux_gradle_java_home() {
  # Linux server builds fail if org.gradle.java.home points to a Windows path.
  if [ "$(uname -s 2>/dev/null || echo unknown)" != "Linux" ]; then
    return
  fi

  local props
  for props in "$ANDROID_ROOT/gradle.properties" "$ANDROID_ROOT/local.properties"; do
    [ -f "$props" ] || continue
    local current
    current="$(grep -E '^org\.gradle\.java\.home=' "$props" | head -n 1 | cut -d= -f2- || true)"
    [ -n "$current" ] || continue
    if is_windows_java_home_value "$current"; then
      step "Removing Windows org.gradle.java.home from ${props#$ROOT_DIR/}"
      sed -i '/^org\.gradle\.java\.home=/d' "$props"
    fi
  done

  if [ -z "${JAVA_HOME:-}" ] && command -v java >/dev/null 2>&1; then
    local java_bin
    java_bin="$(readlink -f "$(command -v java)" 2>/dev/null || true)"
    if [ -n "$java_bin" ]; then
      export JAVA_HOME="$(dirname "$(dirname "$java_bin")")"
      step "Using JAVA_HOME=$JAVA_HOME"
    fi
  fi
}

size_label() {
  local bytes="$1"
  if [ "$bytes" -ge 1073741824 ]; then
    awk -v b="$bytes" 'BEGIN { printf "%.1f GB", b/1073741824 }'
    return
  fi
  if [ "$bytes" -ge 1048576 ]; then
    awk -v b="$bytes" 'BEGIN { printf "%.1f MB", b/1048576 }'
    return
  fi
  if [ "$bytes" -ge 1024 ]; then
    awk -v b="$bytes" 'BEGIN { printf "%.1f KB", b/1024 }'
    return
  fi
  printf "%s B" "$bytes"
}

copy_artifact() {
  local src="$1"
  local dst="$2"
  local label="$3"
  cp -f "$src" "$dst"
  local bytes
  bytes="$(stat -c%s "$dst")"
  echo "  - $label: $dst ($(size_label "$bytes"))"
}

verify_aab_signed() {
  local aab_path="$1"

  if ! command -v jarsigner >/dev/null 2>&1; then
    echo "jarsigner is not available in PATH. Install JDK and ensure JAVA_HOME/bin is in PATH." >&2
    exit 1
  fi

  local verify_output
  verify_output="$(jarsigner -verify -verbose -certs "$aab_path" 2>&1 || true)"

  if echo "$verify_output" | grep -qi "jar is unsigned"; then
    echo "Generated AAB is unsigned. Configure CLASSIFY_SIGNING_* (or keystore.properties) before release build." >&2
    exit 1
  fi

  if ! echo "$verify_output" | grep -qi "jar verified"; then
    echo "AAB signature verification failed. jarsigner output:" >&2
    echo "$verify_output" >&2
    exit 1
  fi

  step "AAB signature verification passed"
}

compute_sha256() {
  local file_path="$1"

  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file_path" | awk '{print tolower($1)}'
    return 0
  fi

  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file_path" | awk '{print tolower($1)}'
    return 0
  fi

  echo "Unable to compute SHA256: sha256sum/shasum not available" >&2
  exit 1
}

assert_release_version_lock() {
  local version="$1"
  local build_number="$2"
  local version_code="$3"
  local release_tag="$4"

  if [ "$ALLOW_VERSION_REUSE" = "true" ]; then
    step "Version reuse guard bypass enabled"
    return
  fi

  if [[ "$LAST_RELEASE_VERSION_CODE" =~ ^[0-9]+$ ]] && [ "$version_code" -eq "$LAST_RELEASE_VERSION_CODE" ]; then
    echo "Release version lock violation: versionCode $version_code already exists in latest metadata. Use --allow-version-reuse only for explicit rollback/rebuild workflows." >&2
    exit 1
  fi

  if [ -n "$LAST_RELEASE_VERSION" ] && [ -n "$LAST_RELEASE_BUILD_NUMBER" ] && [ "$version" = "$LAST_RELEASE_VERSION" ] && [ "$build_number" = "$LAST_RELEASE_BUILD_NUMBER" ]; then
    echo "Release version lock violation: version/build pair $version/$build_number already exists in latest metadata. Use --allow-version-reuse only for explicit rollback/rebuild workflows." >&2
    exit 1
  fi

  local archive_meta_client="$ROOT_DIR/client/public/apps/archive/release-$release_tag.json"
  local archive_meta_dist="$ROOT_DIR/dist/public/apps/archive/release-$release_tag.json"
  if [ -f "$archive_meta_client" ] || [ -f "$archive_meta_dist" ]; then
    echo "Release version lock violation: archive metadata already exists for release tag $release_tag. Use --allow-version-reuse only for explicit rollback/rebuild workflows." >&2
    exit 1
  fi
}

build_release_content_json() {
  local release_content_file="$ROOT_DIR/client/public/apps/release-content.json"
  local latest_apk_name="$1"
  local latest_aab_name="$2"

  node -e '
const fs = require("fs");
const [filePath, latestApkName, latestAabName] = process.argv.slice(1);

const defaults = {
  copyKeys: {
    downloadTitle: "downloadApp",
    downloadDescription: "downloadAppDesc",
    screenshotsTitle: "downloadAppPage.screenshotsTitle",
    apkCta: "downloadAppPage.downloadApkCta",
    aabAriaLabel: "downloadAppPage.aabAriaLabel",
    pwaAriaLabel: "downloadAppPage.pwaZipAriaLabel"
  },
  listing: {
    storeShortDesc: "Safe kids learning app with family guidance",
    storeFullDesc: "Classify helps families build healthy learning habits through interactive educational activities, rewards, and family guidance tools.",
    playPromoText: "New seasonal activities and improved child progress insights."
  },
  screenshots: [
    "/screenshots/classify/classify-1.jpeg",
    "/screenshots/classify/classify-2.jpeg",
    "/screenshots/classify/classify-3.jpeg",
    "/screenshots/classify/classify-4.jpeg",
    "/screenshots/classify/classify-5.jpeg"
  ],
  channels: {
    apk: { label: "APK", latestUrl: `/apps/${latestApkName}` },
    aab: { label: "AAB", latestUrl: `/apps/${latestAabName}` },
    pwa: { label: "PWA", latestUrl: "/apps/classify-pwa-latest.zip" }
  }
};

const merged = JSON.parse(JSON.stringify(defaults));

if (fs.existsSync(filePath)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));

    if (parsed && typeof parsed === "object") {
      if (parsed.copyKeys && typeof parsed.copyKeys === "object") {
        for (const key of Object.keys(defaults.copyKeys)) {
          if (typeof parsed.copyKeys[key] === "string" && parsed.copyKeys[key].trim()) {
            merged.copyKeys[key] = parsed.copyKeys[key].trim();
          }
        }
      }

      if (parsed.listing && typeof parsed.listing === "object") {
        for (const key of Object.keys(defaults.listing)) {
          if (typeof parsed.listing[key] === "string" && parsed.listing[key].trim()) {
            merged.listing[key] = parsed.listing[key].trim();
          }
        }
      }

      if (Array.isArray(parsed.screenshots)) {
        const screenshots = parsed.screenshots.filter((item) => typeof item === "string" && item.trim());
        if (screenshots.length > 0) {
          merged.screenshots = screenshots;
        }
      }

      if (parsed.channels && typeof parsed.channels === "object") {
        for (const channel of Object.keys(defaults.channels)) {
          const channelValue = parsed.channels[channel];
          if (!channelValue || typeof channelValue !== "object") {
            continue;
          }
          if (typeof channelValue.label === "string" && channelValue.label.trim()) {
            merged.channels[channel].label = channelValue.label.trim();
          }
          if (typeof channelValue.latestUrl === "string" && channelValue.latestUrl.trim()) {
            merged.channels[channel].latestUrl = channelValue.latestUrl.trim();
          }
        }
      }
    }
  } catch {
    // Keep defaults if release-content file is invalid.
  }
}

process.stdout.write(JSON.stringify(merged));
' "$release_content_file" "$latest_apk_name" "$latest_aab_name"
}

is_tty() {
  [ -t 0 ] && [ -t 1 ]
}

prompt_secret() {
  local var_name="$1"
  local prompt_text="$2"
  local val=""
  read -r -s -p "$prompt_text: " val
  echo
  printf -v "$var_name" "%s" "$val"
}

resolve_abs_path() {
  local p="$1"
  if command -v realpath >/dev/null 2>&1; then
    realpath "$p" 2>/dev/null || return 1
    return 0
  fi
  if command -v readlink >/dev/null 2>&1; then
    readlink -f "$p" 2>/dev/null || return 1
    return 0
  fi
  return 1
}

read_release_meta_value() {
  local file_path="$1"
  local field_path="$2"
  if [ ! -f "$file_path" ]; then
    return 1
  fi

  if ! command -v node >/dev/null 2>&1; then
    return 1
  fi

  node -e '
const fs = require("fs");
const [filePath, fieldPath] = process.argv.slice(1);
const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
let cur = data;
for (const key of fieldPath.split(".")) {
  if (cur == null || !(key in cur)) {
    process.exit(2);
  }
  cur = cur[key];
}
if (cur == null) {
  process.exit(3);
}
process.stdout.write(String(cur));
' "$file_path" "$field_path" 2>/dev/null
}

load_previous_release_metadata() {
  local client_meta="$ROOT_DIR/client/public/apps/latest-release.json"
  local dist_meta="$ROOT_DIR/dist/public/apps/latest-release.json"
  local chosen=""

  if [ -f "$client_meta" ]; then
    chosen="$client_meta"
  elif [ -f "$dist_meta" ]; then
    chosen="$dist_meta"
  else
    return 0
  fi

  LAST_RELEASE_VERSION="$(read_release_meta_value "$chosen" "version" || true)"
  LAST_RELEASE_BUILD_NUMBER="$(read_release_meta_value "$chosen" "buildNumber" || true)"
  LAST_RELEASE_VERSION_CODE="$(read_release_meta_value "$chosen" "versionCode" || true)"

  if [ -n "$LAST_RELEASE_VERSION" ] || [ -n "$LAST_RELEASE_BUILD_NUMBER" ] || [ -n "$LAST_RELEASE_VERSION_CODE" ]; then
    step "Detected previous release metadata from ${chosen#$ROOT_DIR/}"
    [ -n "$LAST_RELEASE_VERSION" ] && step "Previous version=$LAST_RELEASE_VERSION"
    [ -n "$LAST_RELEASE_BUILD_NUMBER" ] && step "Previous buildNumber=$LAST_RELEASE_BUILD_NUMBER"
    [ -n "$LAST_RELEASE_VERSION_CODE" ] && step "Previous versionCode=$LAST_RELEASE_VERSION_CODE"
  fi
}

compute_next_version_from_previous() {
  local prev="$1"
  if [[ "$prev" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
    local major="${BASH_REMATCH[1]}"
    local minor="${BASH_REMATCH[2]}"
    local patch="${BASH_REMATCH[3]}"
    echo "${major}.${minor}.$((patch + 1))"
    return 0
  fi

  if [[ "$prev" =~ ^([0-9]+)\.([0-9]+)$ ]]; then
    local major_minor="${BASH_REMATCH[0]}"
    echo "${major_minor}.1"
    return 0
  fi

  if [[ "$prev" =~ ^[0-9]+$ ]]; then
    echo "$((prev + 1))"
    return 0
  fi

  return 1
}

try_load_signing_from_keystore_properties() {
  local props_file="$ROOT_DIR/android/keystore.properties"
  [ -f "$props_file" ] || return 1

  local store_file store_password key_alias key_password
  store_file="$(grep -E '^storeFile=' "$props_file" | head -n 1 | cut -d= -f2- || true)"
  store_password="$(grep -E '^storePassword=' "$props_file" | head -n 1 | cut -d= -f2- || true)"
  key_alias="$(grep -E '^keyAlias=' "$props_file" | head -n 1 | cut -d= -f2- || true)"
  key_password="$(grep -E '^keyPassword=' "$props_file" | head -n 1 | cut -d= -f2- || true)"

  [ -n "$store_file" ] || return 1
  [ -n "$store_password" ] || return 1
  [ -n "$key_alias" ] || return 1
  [ -n "$key_password" ] || return 1

  if [ -z "${ANDROID_KEYSTORE_PATH:-}" ]; then
    if [[ "$store_file" = /* ]]; then
      export ANDROID_KEYSTORE_PATH="$store_file"
    else
      local from_app_dir="$ROOT_DIR/android/app/$store_file"
      export ANDROID_KEYSTORE_PATH="$(resolve_abs_path "$from_app_dir" || echo "$from_app_dir")"
    fi
  fi

  [ -n "${ANDROID_KEYSTORE_PASSWORD:-}" ] || export ANDROID_KEYSTORE_PASSWORD="$store_password"
  [ -n "${ANDROID_KEY_ALIAS:-}" ] || export ANDROID_KEY_ALIAS="$key_alias"
  [ -n "${ANDROID_KEY_PASSWORD:-}" ] || export ANDROID_KEY_PASSWORD="$key_password"

  return 0
}

ensure_signing_env() {
  local missing=()

  [ -n "${ANDROID_KEYSTORE_PATH:-}" ] || missing+=("ANDROID_KEYSTORE_PATH")
  [ -n "${ANDROID_KEYSTORE_PASSWORD:-}" ] || missing+=("ANDROID_KEYSTORE_PASSWORD")
  [ -n "${ANDROID_KEY_ALIAS:-}" ] || missing+=("ANDROID_KEY_ALIAS")
  [ -n "${ANDROID_KEY_PASSWORD:-}" ] || missing+=("ANDROID_KEY_PASSWORD")

  if [ "${#missing[@]}" -gt 0 ] && try_load_signing_from_keystore_properties; then
    missing=()
    [ -n "${ANDROID_KEYSTORE_PATH:-}" ] || missing+=("ANDROID_KEYSTORE_PATH")
    [ -n "${ANDROID_KEYSTORE_PASSWORD:-}" ] || missing+=("ANDROID_KEYSTORE_PASSWORD")
    [ -n "${ANDROID_KEY_ALIAS:-}" ] || missing+=("ANDROID_KEY_ALIAS")
    [ -n "${ANDROID_KEY_PASSWORD:-}" ] || missing+=("ANDROID_KEY_PASSWORD")
    if [ "${#missing[@]}" -eq 0 ]; then
      step "Loaded signing credentials from android/keystore.properties"
    fi
  fi

  if [ "${#missing[@]}" -eq 0 ]; then
    return
  fi

  if [ "$USE_KEYSTORE_FALLBACK" = "true" ]; then
    step "Signing env vars missing (${missing[*]}). Falling back to keystore.properties"
    return
  fi

  step "Dynamic signing is required. Missing vars: ${missing[*]}"

  if is_tty; then
    local key
    for key in "${missing[@]}"; do
      case "$key" in
        ANDROID_KEYSTORE_PASSWORD|ANDROID_KEY_PASSWORD)
          local secret
          prompt_secret secret "$key"
          export "$key=$secret"
          ;;
        *)
          local plain
          read -r -p "$key: " plain
          export "$key=$plain"
          ;;
      esac
    done
  fi

  [ -n "${ANDROID_KEYSTORE_PATH:-}" ] || {
    echo "Missing required signing env vars. Set ANDROID_KEYSTORE_PATH or use --use-keystore-fallback" >&2
    exit 1
  }
  [ -n "${ANDROID_KEYSTORE_PASSWORD:-}" ] || {
    echo "Missing required signing env vars. Set ANDROID_KEYSTORE_PASSWORD or use --use-keystore-fallback" >&2
    exit 1
  }
  [ -n "${ANDROID_KEY_ALIAS:-}" ] || {
    echo "Missing required signing env vars. Set ANDROID_KEY_ALIAS or use --use-keystore-fallback" >&2
    exit 1
  }
  [ -n "${ANDROID_KEY_PASSWORD:-}" ] || {
    echo "Missing required signing env vars. Set ANDROID_KEY_PASSWORD or use --use-keystore-fallback" >&2
    exit 1
  }
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --version|-v)
      VERSION="${2:-}"
      shift 2
      ;;
    --build-number|-b)
      BUILD_NUMBER="${2:-}"
      shift 2
      ;;
    --version-code|-c)
      VERSION_CODE="${2:-}"
      shift 2
      ;;
    --api-base)
      API_BASE="${2:-}"
      shift 2
      ;;
    --skip-web-build)
      SKIP_WEB_BUILD="true"
      shift
      ;;
    --skip-admin-upload)
      SKIP_ADMIN_UPLOAD="true"
      shift
      ;;
    --use-keystore-fallback)
      USE_KEYSTORE_FALLBACK="true"
      shift
      ;;
    --allow-version-reuse)
      ALLOW_VERSION_REUSE="true"
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ANDROID_ROOT="$ROOT_DIR/android"
GRADLE_WRAPPER="$ANDROID_ROOT/gradlew"
ensure_file "$GRADLE_WRAPPER" "Gradle wrapper"

# CI/workflows sometimes lose executable bit on gradlew; fix deterministically.
if [ ! -x "$GRADLE_WRAPPER" ]; then
  chmod +x "$GRADLE_WRAPPER"
fi

load_previous_release_metadata

if [ -z "$VERSION" ]; then
  if [ -n "${ANDROID_APP_VERSION:-}" ]; then
    VERSION="$ANDROID_APP_VERSION"
  elif [ -n "$LAST_RELEASE_VERSION" ]; then
    VERSION="$(compute_next_version_from_previous "$LAST_RELEASE_VERSION" || true)"
  fi
  if [ -z "$VERSION" ]; then
    VERSION="$(date +%Y.%m.%d)"
  fi
fi

if [ -z "$BUILD_NUMBER" ]; then
  if [ -n "${ANDROID_APP_BUILD_NUMBER:-}" ]; then
    BUILD_NUMBER="$ANDROID_APP_BUILD_NUMBER"
  elif [[ "$LAST_RELEASE_BUILD_NUMBER" =~ ^[0-9]+$ ]]; then
    BUILD_NUMBER="$((LAST_RELEASE_BUILD_NUMBER + 1))"
  elif [[ "$LAST_RELEASE_VERSION_CODE" =~ ^[0-9]+$ ]]; then
    BUILD_NUMBER="$((LAST_RELEASE_VERSION_CODE + 1))"
  else
    BUILD_NUMBER="$(date +%s)"
  fi
fi

if [[ ! "$VERSION" =~ ^[0-9A-Za-z._-]+$ ]]; then
  echo "Version contains unsupported characters: $VERSION" >&2
  exit 1
fi

if [[ ! "$BUILD_NUMBER" =~ ^[0-9A-Za-z._-]+$ ]]; then
  echo "BuildNumber contains unsupported characters: $BUILD_NUMBER" >&2
  exit 1
fi

if [ -z "$VERSION_CODE" ]; then
  if [[ -n "${ANDROID_VERSION_CODE:-}" && "$ANDROID_VERSION_CODE" =~ ^[0-9]+$ ]]; then
    VERSION_CODE="$ANDROID_VERSION_CODE"
  elif [[ "$LAST_RELEASE_VERSION_CODE" =~ ^[0-9]+$ ]]; then
    VERSION_CODE="$((LAST_RELEASE_VERSION_CODE + 1))"
  elif [[ "$LAST_RELEASE_BUILD_NUMBER" =~ ^[0-9]+$ ]]; then
    VERSION_CODE="$((LAST_RELEASE_BUILD_NUMBER + 1))"
  elif [[ "$BUILD_NUMBER" =~ ^[0-9]+$ ]]; then
    VERSION_CODE="$BUILD_NUMBER"
  else
    VERSION_CODE="$(date +%s)"
  fi
fi

if ! [[ "$VERSION_CODE" =~ ^[0-9]+$ ]] || [ "$VERSION_CODE" -le 0 ]; then
  echo "VersionCode must be a positive integer" >&2
  exit 1
fi

if [ "$VERSION_CODE" -gt 2147483647 ]; then
  VERSION_CODE="2147483647"
fi

RELEASE_TAG="v${VERSION}-b${BUILD_NUMBER}"

assert_release_version_lock "$VERSION" "$BUILD_NUMBER" "$VERSION_CODE" "$RELEASE_TAG"

CLIENT_APPS_DIR="$ROOT_DIR/client/public/apps"
DIST_APPS_DIR="$ROOT_DIR/dist/public/apps"
CLIENT_ARCHIVE_DIR="$CLIENT_APPS_DIR/archive"
DIST_ARCHIVE_DIR="$DIST_APPS_DIR/archive"

ensure_dir "$CLIENT_APPS_DIR"
ensure_dir "$DIST_APPS_DIR"
ensure_dir "$CLIENT_ARCHIVE_DIR"
ensure_dir "$DIST_ARCHIVE_DIR"

step "Release tag: $RELEASE_TAG"
step "Android versionName=$VERSION versionCode=$VERSION_CODE"

ensure_signing_env

if [ "$SKIP_WEB_BUILD" != "true" ]; then
  step "Building web app + Capacitor sync (VITE_API_BASE=$API_BASE)"
  VITE_API_BASE="$API_BASE" npm run build

  DIST_PUBLIC_DIR="$ROOT_DIR/dist/public"
  DIST_APPS_TEMP_BACKUP="$DIST_PUBLIC_DIR/apps.mobile-build-backup"
  APPS_MOVED_FOR_MOBILE_SYNC="false"

  if [ -d "$DIST_APPS_TEMP_BACKUP" ]; then
    rm -rf "$DIST_APPS_TEMP_BACKUP"
  fi

  if [ -d "$DIST_APPS_DIR" ]; then
    step "Temporarily excluding dist/public/apps from Capacitor assets to keep mobile package slim"
    mv "$DIST_APPS_DIR" "$DIST_APPS_TEMP_BACKUP"
    APPS_MOVED_FOR_MOBILE_SYNC="true"
  fi

  cleanup_mobile_apps_backup() {
    if [ "$APPS_MOVED_FOR_MOBILE_SYNC" = "true" ] && [ -d "$DIST_APPS_TEMP_BACKUP" ]; then
      rm -rf "$DIST_APPS_DIR"
      mv "$DIST_APPS_TEMP_BACKUP" "$DIST_APPS_DIR"
      step "Restored dist/public/apps after Capacitor sync"
    fi
  }

  trap cleanup_mobile_apps_backup EXIT

  npx cap sync android

  step "Running strict Capacitor production checks"
  node ./scripts/capacitor-production-check.cjs --strict

  cleanup_mobile_apps_backup
  trap - EXIT
else
  step "SkipWebBuild enabled - skipping web build and cap sync"
fi

step "Building Android release artifacts (APK + AAB)"
cd "$ANDROID_ROOT"

sanitize_linux_gradle_java_home
ensure_linux_android_sdk_location

GRADLE_PROPS=(
  "-PCLASSIFY_VERSION_NAME=$VERSION"
  "-PCLASSIFY_VERSION_CODE=$VERSION_CODE"
)

if [ -n "${ANDROID_KEYSTORE_PATH:-}" ] && [ -n "${ANDROID_KEYSTORE_PASSWORD:-}" ] && [ -n "${ANDROID_KEY_ALIAS:-}" ] && [ -n "${ANDROID_KEY_PASSWORD:-}" ]; then
  step "Using signing credentials from environment"
  GRADLE_PROPS+=("-PCLASSIFY_SIGNING_STORE_FILE=$ANDROID_KEYSTORE_PATH")
  GRADLE_PROPS+=("-PCLASSIFY_SIGNING_STORE_PASSWORD=$ANDROID_KEYSTORE_PASSWORD")
  GRADLE_PROPS+=("-PCLASSIFY_SIGNING_KEY_ALIAS=$ANDROID_KEY_ALIAS")
  GRADLE_PROPS+=("-PCLASSIFY_SIGNING_KEY_PASSWORD=$ANDROID_KEY_PASSWORD")
else
  step "Using existing Android signing configuration (keystore.properties)"
fi

bash ./gradlew clean
bash ./gradlew assembleRelease "${GRADLE_PROPS[@]}"
bash ./gradlew bundleRelease "${GRADLE_PROPS[@]}"

cd "$ROOT_DIR"

APK_SOURCE="$ANDROID_ROOT/app/build/outputs/apk/release/app-release.apk"
AAB_SOURCE="$ANDROID_ROOT/app/build/outputs/bundle/release/app-release.aab"

ensure_file "$APK_SOURCE" "APK output"
ensure_file "$AAB_SOURCE" "AAB output"
verify_aab_signed "$AAB_SOURCE"

LATEST_APK_NAME="classify-app-latest.apk"
LATEST_AAB_NAME="classify-googleplay-latest.aab"
VERSIONED_APK_NAME="classify-app-${RELEASE_TAG}.apk"
VERSIONED_AAB_NAME="classify-googleplay-${RELEASE_TAG}.aab"

step "Publishing artifacts to apps/ and apps/archive"

copy_artifact "$APK_SOURCE" "$CLIENT_APPS_DIR/$LATEST_APK_NAME" "latest APK"
copy_artifact "$AAB_SOURCE" "$CLIENT_APPS_DIR/$LATEST_AAB_NAME" "latest AAB"
copy_artifact "$APK_SOURCE" "$DIST_APPS_DIR/$LATEST_APK_NAME" "latest APK"
copy_artifact "$AAB_SOURCE" "$DIST_APPS_DIR/$LATEST_AAB_NAME" "latest AAB"

copy_artifact "$APK_SOURCE" "$CLIENT_ARCHIVE_DIR/$VERSIONED_APK_NAME" "versioned APK"
copy_artifact "$AAB_SOURCE" "$CLIENT_ARCHIVE_DIR/$VERSIONED_AAB_NAME" "versioned AAB"
copy_artifact "$APK_SOURCE" "$DIST_ARCHIVE_DIR/$VERSIONED_APK_NAME" "versioned APK"
copy_artifact "$AAB_SOURCE" "$DIST_ARCHIVE_DIR/$VERSIONED_AAB_NAME" "versioned AAB"

APK_BYTES="$(stat -c%s "$CLIENT_APPS_DIR/$LATEST_APK_NAME")"
AAB_BYTES="$(stat -c%s "$CLIENT_APPS_DIR/$LATEST_AAB_NAME")"
APK_SHA256="$(compute_sha256 "$CLIENT_APPS_DIR/$LATEST_APK_NAME")"
AAB_SHA256="$(compute_sha256 "$CLIENT_APPS_DIR/$LATEST_AAB_NAME")"

GENERATED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
GIT_COMMIT="$(git -C "$ROOT_DIR" rev-parse HEAD 2>/dev/null || echo unknown)"
GIT_BRANCH="$(git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"

METADATA_FILE_CLIENT="$CLIENT_APPS_DIR/latest-release.json"
METADATA_FILE_CLIENT_ARCHIVE="$CLIENT_ARCHIVE_DIR/release-$RELEASE_TAG.json"
METADATA_FILE_DIST="$DIST_APPS_DIR/latest-release.json"
METADATA_FILE_DIST_ARCHIVE="$DIST_ARCHIVE_DIR/release-$RELEASE_TAG.json"

ASO_JSON="$(build_release_content_json "$LATEST_APK_NAME" "$LATEST_AAB_NAME")"

cat > "$METADATA_FILE_CLIENT" <<EOF
{
  "releaseTag": "$RELEASE_TAG",
  "version": "$VERSION",
  "buildNumber": "$BUILD_NUMBER",
  "versionCode": $VERSION_CODE,
  "generatedAt": "$GENERATED_AT",
  "apiBase": "$API_BASE",
  "provenance": {
    "scriptPath": "scripts/publish-android-release.sh",
    "gitCommit": "$GIT_COMMIT",
    "gitBranch": "$GIT_BRANCH",
    "signedAabVerified": true,
    "versionReuseBypass": $ALLOW_VERSION_REUSE,
    "generatedAt": "$GENERATED_AT"
  },
  "aso": $ASO_JSON,
  "files": {
    "apk": {
      "latestUrl": "/apps/$LATEST_APK_NAME",
      "archiveUrl": "/apps/archive/$VERSIONED_APK_NAME",
      "bytes": $APK_BYTES,
      "size": "$(size_label "$APK_BYTES")",
      "sha256": "$APK_SHA256",
      "name": "$LATEST_APK_NAME"
    },
    "aab": {
      "latestUrl": "/apps/$LATEST_AAB_NAME",
      "archiveUrl": "/apps/archive/$VERSIONED_AAB_NAME",
      "bytes": $AAB_BYTES,
      "size": "$(size_label "$AAB_BYTES")",
      "sha256": "$AAB_SHA256",
      "name": "$LATEST_AAB_NAME"
    }
  }
}
EOF

cat > "$CLIENT_APPS_DIR/latest-provenance.json" <<EOF
{
  "releaseTag": "$RELEASE_TAG",
  "scriptPath": "scripts/publish-android-release.sh",
  "gitCommit": "$GIT_COMMIT",
  "gitBranch": "$GIT_BRANCH",
  "signedAabVerified": true,
  "versionReuseBypass": $ALLOW_VERSION_REUSE,
  "generatedAt": "$GENERATED_AT"
}
EOF

cp -f "$CLIENT_APPS_DIR/latest-provenance.json" "$CLIENT_ARCHIVE_DIR/provenance-$RELEASE_TAG.json"
cp -f "$CLIENT_APPS_DIR/latest-provenance.json" "$DIST_APPS_DIR/latest-provenance.json"
cp -f "$CLIENT_APPS_DIR/latest-provenance.json" "$DIST_ARCHIVE_DIR/provenance-$RELEASE_TAG.json"

printf "%s  %s\n%s  %s\n" "$APK_SHA256" "$LATEST_APK_NAME" "$AAB_SHA256" "$LATEST_AAB_NAME" > "$CLIENT_APPS_DIR/checksums-latest.txt"
printf "%s  %s\n%s  %s\n" "$APK_SHA256" "$VERSIONED_APK_NAME" "$AAB_SHA256" "$VERSIONED_AAB_NAME" > "$CLIENT_ARCHIVE_DIR/checksums-$RELEASE_TAG.txt"
cp -f "$CLIENT_APPS_DIR/checksums-latest.txt" "$DIST_APPS_DIR/checksums-latest.txt"
cp -f "$CLIENT_ARCHIVE_DIR/checksums-$RELEASE_TAG.txt" "$DIST_ARCHIVE_DIR/checksums-$RELEASE_TAG.txt"

cp -f "$METADATA_FILE_CLIENT" "$METADATA_FILE_CLIENT_ARCHIVE"
cp -f "$METADATA_FILE_CLIENT" "$METADATA_FILE_DIST"
cp -f "$METADATA_FILE_CLIENT" "$METADATA_FILE_DIST_ARCHIVE"

if [ "$SKIP_ADMIN_UPLOAD" != "true" ] && [ -n "${CLASSIFY_ADMIN_TOKEN:-}" ]; then
  ADMIN_API_BASE="${CLASSIFY_API_BASE:-$API_BASE}"
  REGISTER_ENDPOINT="${ADMIN_API_BASE%/}/api/admin/mobile-apk-builds/register"
  LEGACY_UPLOAD_ENDPOINT="${ADMIN_API_BASE%/}/api/admin/mobile-apk-builds/upload"
  step "Registering latest APK in admin builds API: $REGISTER_ENDPOINT"
  ADMIN_NOTES="Automated publish ($RELEASE_TAG) | AAB: /apps/$LATEST_AAB_NAME | AAB archive: /apps/archive/$VERSIONED_AAB_NAME"
  if ! curl -fsS -X POST "$REGISTER_ENDPOINT" \
      -H "Authorization: Bearer $CLASSIFY_ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      --data-binary "{\"version\":\"$VERSION\",\"buildNumber\":\"$BUILD_NUMBER\",\"notes\":\"$ADMIN_NOTES\",\"activateNow\":true,\"fileUrl\":\"/apps/$LATEST_APK_NAME\",\"fileName\":\"$LATEST_APK_NAME\",\"fileSizeBytes\":$APK_BYTES,\"mimeType\":\"application/vnd.android.package-archive\"}" >/dev/null; then
    step "Admin register endpoint failed; trying legacy upload endpoint"
    if ! curl -fsS -X POST "$LEGACY_UPLOAD_ENDPOINT" \
      -H "Authorization: Bearer $CLASSIFY_ADMIN_TOKEN" \
      -F "version=$VERSION" \
      -F "buildNumber=$BUILD_NUMBER" \
      -F "notes=$ADMIN_NOTES" \
      -F "activateNow=true" \
      -F "apkFile=@$CLIENT_APPS_DIR/$LATEST_APK_NAME" >/dev/null; then
      step "Admin registration/upload failed (warning only)"
    fi
  fi
else
  step "Skipping admin API upload (set CLASSIFY_ADMIN_TOKEN to enable)"
fi

step "Done. Download links now point to:"
echo "  - /apps/$LATEST_APK_NAME"
echo "  - /apps/$LATEST_AAB_NAME"
echo "  - archive: /apps/archive/$VERSIONED_APK_NAME"
echo "  - archive: /apps/archive/$VERSIONED_AAB_NAME"
