#!/usr/bin/env bash
set -euo pipefail+

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
APK_ONLY="false"

while [ $# -gt 0 ]; do
  case "$1" in
    --project-dir) PROJECT_DIR="$2"; shift 2 ;;
    --branch) BRANCH="$2"; shift 2 ;;
    --compose-project-name) COMPOSE_PROJECT_NAME="$2"; shift 2 ;;
    --repo-url) REPO_URL="$2"; shift 2 ;;
    --skip-rebuild) SKIP_REBUILD="true"; shift ;;
    --skip-admin-setup) SKIP_ADMIN_SETUP="true"; shift ;;
    --apk-only) APK_ONLY="true"; shift ;;
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
mkdir -p "$ARCHIVE_DIR"

log "Removing old mobile artifacts (latest + archive)..."
# Binaries only (keep metadata json so strict validation has latest-release.json)
if [[ "$APK_ONLY" == "true" ]]; then
  # APK-only mode: remove APKs + AABs so we don't accidentally copy old AABs into dist/public.
  rm -f "$APPS_DIR"/*.apk 2>/dev/null || true
  rm -f "$APPS_DIR"/*.aab 2>/dev/null || true
  rm -f "$ARCHIVE_DIR"/*.apk 2>/dev/null || true
  rm -f "$ARCHIVE_DIR"/*.aab 2>/dev/null || true
else
  rm -f "$APPS_DIR"/*.apk "$APPS_DIR"/*.aab 2>/dev/null || true
  rm -f "$ARCHIVE_DIR"/*.apk "$ARCHIVE_DIR"/*.aab 2>/dev/null || true
fi

# Note: we intentionally do NOT delete metadata here.
# latest-release.json + archive release-*.json are expected to be present after git pull,
# and are required by check-mobile-release-assets.cjs --strict.

log "Pulling Git LFS mobile artifacts..."
git lfs install --local >/dev/null 2>&1 || true
if [[ "$APK_ONLY" == "true" ]]; then
  git lfs pull --include="client/public/apps/*.apk"
else
  git lfs pull --include="client/public/apps/*.apk,client/public/apps/*.aab,client/public/apps/archive/*.apk,client/public/apps/archive/*.aab"
fi

# Prune archive: keep only the latest archived APK/AAB for current releaseTag.
# (We still keep latest fixed-name files as well.)
release_tag="$(
  node -e "const m=require(process.argv[1]); console.log(m.releaseTag||'')" "$APPS_DIR/latest-release.json" 2>/dev/null || true
)"

if [[ "$APK_ONLY" == "true" ]]; then
  log "Removing archive artifacts for APK-only releases..."
  rm -f "$ARCHIVE_DIR"/* 2>/dev/null || true
else
  if [[ -n "$release_tag" ]]; then
    keep_apk="classify-app-${release_tag}.apk"
    keep_aab="classify-googleplay-${release_tag}.aab"

    log "Pruning archive binaries (keeping: $keep_apk and $keep_aab)..."

    for f in "$ARCHIVE_DIR"/classify-app-*.apk; do
      [[ -e "$f" ]] || continue
      if [[ "$(basename "$f")" != "$keep_apk" ]]; then rm -f "$f" 2>/dev/null || true; fi
    done

    for f in "$ARCHIVE_DIR"/classify-googleplay-*.aab; do
      [[ -e "$f" ]] || continue
      if [[ "$(basename "$f")" != "$keep_aab" ]]; then rm -f "$f" 2>/dev/null || true; fi
    done
  else
    warn "Could not resolve releaseTag from $APPS_DIR/latest-release.json; skipping archive pruning."
  fi
fi

log "Validating mobile release assets..."
if [[ "$APK_ONLY" == "true" ]]; then
  node ./scripts/check-mobile-release-assets.cjs --strict --apk-only
else
  node ./scripts/check-mobile-release-assets.cjs --strict
fi

log "Validation passed."

sync_mobile_artifacts_to_container() {
  local container_id
  container_id="$(docker compose -p "$COMPOSE_PROJECT_NAME" ps -q app 2>/dev/null || true)"
  if [[ -z "$container_id" ]]; then
    # Fallback: match app container by name pattern
    container_id="$(docker ps --filter "name=${COMPOSE_PROJECT_NAME}.*-app" --format "{{.ID}}" | head -n 1 || true)"
  fi

  if [[ -z "$container_id" ]]; then
    die "Could not find running app container to sync static /apps/* files."
  fi

  # Determine current releaseTag for archive naming (optional, but useful for checks).
  local release_tag
  release_tag="$(
    node -e "const m=require(process.argv[1]); process.stdout.write(String(m.releaseTag||''))" "$APPS_DIR/latest-release.json" 2>/dev/null || true
  )"

  local dst_base="/app/dist/public/apps"
  local dst_archive="${dst_base}/archive"

  log "Syncing mobile artifacts into container ($container_id): ${dst_base} (releaseTag=${release_tag:-unknown})"
  docker exec "$container_id" sh -lc "mkdir -p '$dst_base' '$dst_archive' >/dev/null 2>&1 || true"

  # Copy metadata + latest binaries + (pruned) archive binaries + checksums into dist/public.
  # Pruning already ensured we only keep latest + current release archive.
  docker cp "${APPS_DIR}/." "$container_id:$dst_base/"

  # Verification from inside container
  if [[ "$APK_ONLY" == "true" ]]; then
    docker exec "$container_id" sh -lc "
      set -euo pipefail;
      curl -fsS -o /dev/null -w 'APK_STATUS=%{http_code}\n' http://localhost:5000/apps/classify-app-latest.apk;
    " >/dev/null 2>&1 || {
      docker exec "$container_id" sh -lc "
        echo '--- container static diagnostics ---';
        ls -la '${dst_base}' '${dst_archive}' 2>/dev/null || true;
        echo 'APK:'; curl -i -m 10 http://localhost:5000/apps/classify-app-latest.apk | tail -n 5 || true;
      " || true
      die \"Static sync verification failed: APK not returning 200 inside container.\"
    }
  else
    docker exec "$container_id" sh -lc "
      set -euo pipefail;
      curl -fsS -o /dev/null -w 'APK_STATUS=%{http_code}\n' http://localhost:5000/apps/classify-app-latest.apk;
      curl -fsS -o /dev/null -w 'AAB_STATUS=%{http_code}\n' http://localhost:5000/apps/classify-googleplay-latest.aab;
    " >/dev/null 2>&1 || {
      # If curl -fsS fails, do a more verbose check
      docker exec "$container_id" sh -lc "
        echo '--- container static diagnostics ---';
        ls -la '${dst_base}' '${dst_archive}' 2>/dev/null || true;
        echo 'APK:'; curl -i -m 10 http://localhost:5000/apps/classify-app-latest.apk | tail -n 5 || true;
        echo 'AAB:'; curl -i -m 10 http://localhost:5000/apps/classify-googleplay-latest.aab | tail -n 5 || true;
      " || true
      die \"Static sync verification failed: /apps/* not returning 200 inside container.\"
    }
  fi

  log "Container sync OK: /apps/* latest files are reachable."
}

sync_mobile_artifacts_to_container

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
