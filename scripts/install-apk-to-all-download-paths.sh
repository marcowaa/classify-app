#!/usr/bin/env bash
set -euo pipefail

APK_PATH=""
RELEASE_TAG=""
NO_DIST="false"

usage() {
  cat <<'EOF'
Usage:
  bash scripts/install-apk-to-all-download-paths.sh --apk-path <path-to-apk> [--release-tag <tag>] [--no-dist]

What it copies:
  - client/public/apps/* (latest)
  - dist/public/apps/* (latest) unless --no-dist
  - archive paths from client/public/apps/latest-release.json (if present)
  - compatibility filenames for older routes:
      /apps/classify-app-latest.apk
      /apps/classify-app.apk
  - archive compatibility filenames:
      archive/classify-app-v${RELEASE_TAG}.apk (best-effort)
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --apk-path) APK_PATH="${2:-}"; shift 2 ;;
    --release-tag) RELEASE_TAG="${2:-}"; shift 2 ;;
    --no-dist) NO_DIST="true"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage; exit 1 ;;
  esac
done

if [ -z "$APK_PATH" ]; then
  echo "Missing --apk-path" >&2
  usage
  exit 1
fi

if [ ! -f "$APK_PATH" ]; then
  echo "APK not found: $APK_PATH" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLIENT_APPS_DIR="$ROOT_DIR/client/public/apps"
DIST_APPS_DIR="$ROOT_DIR/dist/public/apps"

mkdir -p "$CLIENT_APPS_DIR/archive"
if [ "$NO_DIST" != "true" ]; then
  mkdir -p "$DIST_APPS_DIR/archive"
fi

LATEST_CLASSI_FY="classi-fy-app-latest.apk"
LATEST_CLASSIFY_LATEST="classify-app-latest.apk"
LATEST_CLASSIFY="classify-app.apk"

copy_latest() {
  local src="$1"
  local dst_dir="$2"
  local dst1="$dst_dir/$LATEST_CLASSI_FY"
  local dst2="$dst_dir/$LATEST_CLASSIFY_LATEST"
  local dst3="$dst_dir/$LATEST_CLASSIFY"

  cp -f "$src" "$dst1"
  cp -f "$src" "$dst2"
  cp -f "$src" "$dst3"

  echo "Latest copied:"
  echo "  - $dst1"
  echo "  - $dst2"
  echo "  - $dst3"
}

# Read archiveUrl for the APK from latest-release.json, if present.
# Expected JSON structure from publish scripts:
#   files.apk.archiveUrl = "/apps/archive/<filename>.apk"
get_archive_filename_from_latest_release() {
  local json="$1"
  if [ ! -f "$json" ]; then
    echo ""
    return 0
  fi

  node -e '
const fs=require("fs");
const p=process.argv[1];
const raw=fs.readFileSync(p,"utf8");
const j=JSON.parse(raw);
const url=j?.files?.apk?.archiveUrl;
if(!url || typeof url!=="string") process.exit(0);
const name=url.split("/").filter(Boolean).pop();
process.stdout.write(name||"");
' "$json" 2>/dev/null || true
}

APK_BASENAME="$(basename "$APK_PATH")"
APK_SHA256="$(node -e "const c=require('crypto');const fs=require('fs');const b=fs.readFileSync(process.argv[1]);console.log(c.createHash('sha256').update(b).digest('hex'))" "$APK_PATH")"
APK_BYTES="$(stat -c%s "$APK_PATH" 2>/dev/null || wc -c < "$APK_PATH")"

echo "APK input:"
echo "  - path: $APK_PATH"
echo "  - name: $APK_BASENAME"
echo "  - sha256: $APK_SHA256"
echo "  - bytes: $APK_BYTES"

# Latest copies
copy_latest "$APK_PATH" "$CLIENT_APPS_DIR"
if [ "$NO_DIST" != "true" ]; then
  copy_latest "$APK_PATH" "$DIST_APPS_DIR"
fi

# Archive copies (best-effort)
LATEST_RELEASE_JSON="$CLIENT_APPS_DIR/latest-release.json"
ARCHIVE_APK_FILENAME="$(get_archive_filename_from_latest_release "$LATEST_RELEASE_JSON")"

# If release tag passed, derive a best-effort filename (fallback).
# Example from earlier metadata:
#   classi-fy-app-v2026.05.17-b1778983866.apk
derive_archive_filename_best_effort() {
  local tag="$1"
  # remove possible leading 'v'
  local t="$tag"
  t="${t#v}"
  echo "classi-fy-app-v${t}.apk"
}

if [ -z "$ARCHIVE_APK_FILENAME" ]; then
  if [ -n "$RELEASE_TAG" ]; then
    ARCHIVE_APK_FILENAME="$(derive_archive_filename_best_effort "$RELEASE_TAG")"
  else
    echo "Archive not updated: could not find files.apk.archiveUrl in latest-release.json and --release-tag not provided."
    exit 0
  fi
fi

# Archive compat filename: classify-app-<tag>.apk (best-effort)
# We'll replace prefix "classi-fy-app-" -> "classify-app-" and keep rest.
ARCHIVE_CLASSIFY_FILENAME="${ARCHIVE_APK_FILENAME/classi-fy-app-/classify-app-}"

CLIENT_ARCHIVE_DST1="$CLIENT_APPS_DIR/archive/$ARCHIVE_APK_FILENAME"
CLIENT_ARCHIVE_DST2="$CLIENT_APPS_DIR/archive/$ARCHIVE_CLASSIFY_FILENAME"

cp -f "$APK_PATH" "$CLIENT_ARCHIVE_DST1"
cp -f "$APK_PATH" "$CLIENT_ARCHIVE_DST2"

echo "Archive copied:"
echo "  - $CLIENT_ARCHIVE_DST1"
echo "  - $CLIENT_ARCHIVE_DST2"

if [ "$NO_DIST" != "true" ]; then
  DIST_ARCHIVE_DST1="$DIST_APPS_DIR/archive/$ARCHIVE_APK_FILENAME"
  DIST_ARCHIVE_DST2="$DIST_APPS_DIR/archive/$ARCHIVE_CLASSIFY_FILENAME"
  cp -f "$APK_PATH" "$DIST_ARCHIVE_DST1"
  cp -f "$APK_PATH" "$DIST_ARCHIVE_DST2"
  echo "Archive copied to dist:"
  echo "  - $DIST_ARCHIVE_DST1"
  echo "  - $DIST_ARCHIVE_DST2"
fi

echo "Done."
