#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Classify - Refresh Mobile Artifacts (APK/AAB) on Server
# ============================================================
# Goals:
# - Remove old APK/AAB files from client/public/apps (latest + archive)
# - Pull latest artifacts from GitHub (git pull + git lfs pull)
# - Validate metadata: client/public/apps/latest-release.json + channel URLs + screenshots
# - Optionally rebuild + restart Docker app
#
# Safe properties:
# - Does NOT touch screenshots (/client/public/screenshots/*)
# - Does NOT touch unrelated metadata JSON except latest-release.json/release-content.json
#
# Usage (server):
#   scripts/refresh-mobile-artifacts.sh --project-dir /opt/classify --branch main --compose-project-name classify_main
#
usage() {
  cat <<'EOF'
Usage: scripts/refresh-mobile-artifacts.sh [options]

Options:
  --project-dir <path>              Project directory (default: /opt/classify)
  --branch <name>                  Git branch (default: main)
  --repo-url <url>                 Repo URL (default: origin from git, if missing uses current remote)
  --compose-project-name <name>   docker compose project name (default: classify_main)
  --skip-rebuild                   Skip rebuilding containers after refresh
  --skip-admin-setup              Skip npm run admin:setup (only rebuild health check)
EOF
}

PROJECT_DIR="/opt/classify"
BRANCH="main"
COMPOSE_PROJECT_NAME="classify_main"
REPO_URL=""
SKIP_REBUILD="false"
SKIP_ADMIN_SETUP="false"

while [ $# -gt 0 ]; do
  case "$1" in
    --project-dir) PROJECT_DIR="$2"; shift 2 ;;
    --branch) BRANCH="$2"; shift 2 ;;
    --compose-project-name) COMPOSE_PROJECT_NAME="$2"; shift 2 ;;
    --repo-url) REPO_URL="$2"; shift 2 ;;
    --skip-rebuild) SKIP_REBUILD="true"; shift ;;
    --skip-admin-setup) SKIP_ADMIN_SETUP="true"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage; exit 1 ;;
  esac
done

log() { printf '[mobile-refresh] %s\n' "$*"; }
warn() { printf '[mobile-refresh] WARN: %s\n' "$*" >&2; }
die() { printf '[mobile-refresh] ERROR: %s\n' "$*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing command: $1"
}

require_cmd git
require_cmd node
require_cmd bash

EFFECTIVE_PROJECT_DIR="$PROJECT_DIR"

# Prefer the directory that actually contains client/public/apps.
# Common Hostinger layout:
#   /srv/classify/current -> /srv/classify/releases/<version>
if [[ ! -d "$EFFECTIVE_PROJECT_DIR/client/public/apps" && -d "$EFFECTIVE_PROJECT_DIR/current/client/public/apps" ]]; then
  EFFECTIVE_PROJECT_DIR="$EFFECTIVE_PROJECT_DIR/current"
fi

# If git metadata isn't in the resolved dir but it is under current/, switch.
if [[ ! -d "$EFFECTIVE_PROJECT_DIR/.git" && -d "$PROJECT_DIR/current/.git" ]]; then
  EFFECTIVE_PROJECT_DIR="$PROJECT_DIR/current"
fi

cd "$EFFECTIVE_PROJECT_DIR"
PROJECT_DIR="$EFFECTIVE_PROJECT_DIR"

if [[ ! -d "$PROJECT_DIR/.git" ]]; then
  die "Project dir is not a git repo: $PROJECT_DIR"
fi

# Resolve repo url if not provided
if [[ -z "$REPO_URL" ]]; then
  REPO_URL="$(git remote get-url origin 2>/dev/null || true)"
fi
if [[ -z "$REPO_URL" ]]; then
  # no need to die; if we only pull existing origin it'll still work
  warn "Repo URL not resolved; will use current git remotes."
fi

# Ensure lfs exists
require_cmd git
if ! git lfs version >/dev/null 2>&1; then
  die "git-lfs is not installed (git lfs version failed). Install git-lfs first."
fi

log "Switching to branch: $BRANCH"
git fetch --all --prune
git checkout "$BRANCH" >/dev/null 2>&1 || git checkout -b "$BRANCH" "origin/$BRANCH" >/dev/null 2>&1
git pull --ff-only origin "$BRANCH" || git pull "$REPO_URL" "$BRANCH" || true

# Paths
APPS_DIR="client/public/apps"
ARCHIVE_DIR="$APPS_DIR/archive"

[[ -d "$APPS_DIR" ]] || die "Missing apps dir: $APPS_DIR"
[[ -d "$ARCHIVE_DIR" ]] || die "Missing archive dir: $ARCHIVE_DIR"

log "Removing old mobile artifacts (latest + archive)..."
# Binaries
rm -f "$APPS_DIR"/*.apk "$APPS_DIR"/*.aab 2>/dev/null || true
rm -f "$ARCHIVE_DIR"/*.apk "$ARCHIVE_DIR"/*.aab 2>/dev/null || true

# Metadata/tracking files (keep screenshots intact)
rm -f "$APPS_DIR/latest-release.json" "$APPS_DIR/release-content.json" 2>/dev/null || true
rm -f "$APPS_DIR/latest-provenance.json" "$APPS_DIR/checksums-latest.txt" 2>/dev/null || true
rm -f "$ARCHIVE_DIR"/release-*.json "$ARCHIVE_DIR"/provenance-*.json "$ARCHIVE_DIR"/checksums-*.txt 2>/dev/null || true

log "Pulling Git LFS mobile artifacts..."
git lfs install --local >/dev/null 2>&1 || true
git lfs pull --include="client/public/apps/*.apk,client/public/apps/*.aab,client/public/apps/archive/*.apk,client/public/apps/archive/*.aab"

log "Validating mobile release assets..."
node ./scripts/check-mobile-release-assets.cjs --strict

log "Validation passed."

if [[ "$SKIP_REBUILD" == "true" ]]; then
  log "Skipping rebuild (--skip-rebuild)."
  exit 0
fi

log "Rebuilding + restarting containers (compose project: $COMPOSE_PROJECT_NAME)..."
docker compose -p "$COMPOSE_PROJECT_NAME" -f docker-compose.yml up -d --build app

# Run db migrations & admin setup only if not explicitly skipped.
# Usually safe: db:push is idempotent, admin:setup just ensures admin row exists.
log "Running db migrations (db:push)..."
docker compose -p "$COMPOSE_PROJECT_NAME" -f docker-compose.yml exec -T app npm run db:push

if [[ "$SKIP_ADMIN_SETUP" == "true" ]]; then
  log "Skipping admin setup (--skip-admin-setup)."
else
  log "Running admin setup (admin:setup)..."
  docker compose -p "$COMPOSE_PROJECT_NAME" -f docker-compose.yml exec -T app npm run admin:setup || true
fi

log "Smoke test: /api/health inside container"
docker compose -p "$COMPOSE_PROJECT_NAME" -f docker-compose.yml exec -T app sh -lc "curl -fsS http://localhost:5000/api/health >/dev/null"

log "✅ Mobile artifacts refreshed successfully."
