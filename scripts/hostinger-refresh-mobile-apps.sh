#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Classify - Hostinger Refresh Mobile Apps (APK/AAB only)
# ============================================================
# Single purpose:
# - Pull updated repo content from GitHub (main)
# - git lfs pull for APK/AAB binaries (so they are real binaries, not pointers)
# - Overwrite latest APK/AAB + versioned archive + generate metadata
# - Delete old APK/AAB + old archive/versioned metadata
# - Rebuild + restart app container so /apps/* static files reflect the new repo state
# - Validate assets strictly + smoke test /api/health inside container
#
# This script delegates the actual logic to:
#   scripts/refresh-mobile-artifacts.sh
#
# Default behavior avoids admin setup (to keep password/secrets stable):
#   --skip-admin-setup

PROJECT_DIR="${PROJECT_DIR:-/opt/classify}"
BRANCH="${BRANCH:-main}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-classify_main}"
COMPOSE_PROJECT_NAME_SET="false"
SKIP_ADMIN_SETUP="${SKIP_ADMIN_SETUP:-true}"

while [ $# -gt 0 ]; do
  case "$1" in
    --project-dir) PROJECT_DIR="$2"; shift 2 ;;
    --branch) BRANCH="$2"; shift 2 ;;
    --compose-project-name) COMPOSE_PROJECT_NAME="$2"; COMPOSE_PROJECT_NAME_SET="true"; shift 2 ;;
    --skip-admin-setup) SKIP_ADMIN_SETUP="true"; shift 1 ;;
    --no-skip-admin-setup) SKIP_ADMIN_SETUP="false"; shift 1 ;;
    -h|--help)
      echo "Usage:"
      echo "  PROJECT_DIR=/opt/classify BRANCH=main COMPOSE_PROJECT_NAME=classify_main bash scripts/hostinger-refresh-mobile-apps.sh"
      echo "  Defaults: SKIP_ADMIN_SETUP=true"
      exit 0
      ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

if [[ ! -d "$PROJECT_DIR" ]]; then
  echo "ERROR: project directory not found: $PROJECT_DIR" >&2
  exit 1
fi

is_placeholder_value() {
  case "$1" in
    ''|replace_*|change_me_*|YOUR_*|your_*|admin123|admin1234|undefined|null) return 0 ;;
    *) return 1 ;;
  esac
}

cd "$PROJECT_DIR"

# If caller didn't explicitly pass COMPOSE_PROJECT_NAME, prefer what is in .env.
if [[ "$COMPOSE_PROJECT_NAME_SET" == "false" && -f ".env" ]]; then
  local_env_compose="$(
    grep -E '^COMPOSE_PROJECT_NAME=' .env 2>/dev/null | head -n1 | cut -d= -f2- || true
  )"
  if [ -n "$local_env_compose" ] && ! is_placeholder_value "$local_env_compose"; then
    COMPOSE_PROJECT_NAME="$local_env_compose"
  fi
fi

chmod +x ./scripts/refresh-mobile-artifacts.sh || true

args=(
  "--project-dir" "$PROJECT_DIR"
  "--branch" "$BRANCH"
  "--compose-project-name" "$COMPOSE_PROJECT_NAME"
)

if [[ "$SKIP_ADMIN_SETUP" == "true" ]]; then
  args+=("--skip-admin-setup")
fi

# Rebuild is NOT skipped (we need the Docker image to serve updated /apps/* static files).
./scripts/refresh-mobile-artifacts.sh "${args[@]}"

echo "[refresh-mobile-apps] ✅ Mobile artifacts refreshed + validated successfully."
