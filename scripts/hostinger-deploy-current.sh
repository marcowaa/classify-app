#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Classify - Hostinger Deploy Current (Server update + run + verify)
# ============================================================
# This is the single entrypoint you run when you want:
# 1) Pull latest code
# 2) Rebuild app container
# 3) Run db:push
# 4) Run admin:setup (idempotent)
# 5) Smoke test /api/health (inside container)

PROJECT_DIR="${PROJECT_DIR:-/opt/classify}"
REPO_URL="${REPO_URL:-https://github.com/marcowaa/classify-app.git}"
BRANCH="${BRANCH:-main}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-classify_main}"
POSTGRES_HOST_PORT="${POSTGRES_HOST_PORT:-5434}"

# Allow overriding via CLI:
#   --project-dir
#   --repo-url
#   --branch
#   --compose-project-name
#   --postgres-host-port
while [ $# -gt 0 ]; do
  case "$1" in
    --project-dir) PROJECT_DIR="$2"; shift 2 ;;
    --repo-url) REPO_URL="$2"; shift 2 ;;
    --branch) BRANCH="$2"; shift 2 ;;
    --compose-project-name) COMPOSE_PROJECT_NAME="$2"; shift 2 ;;
    --postgres-host-port) POSTGRES_HOST_PORT="$2"; shift 2 ;;
    -h|--help)
      echo "Usage:"
      echo "  PROJECT_DIR=/opt/classify REPO_URL=... BRANCH=main COMPOSE_PROJECT_NAME=classify_main POSTGRES_HOST_PORT=5434 bash scripts/hostinger-deploy-current.sh"
      echo "  or:"
      echo "  bash scripts/hostinger-deploy-current.sh --project-dir /opt/classify --branch main --compose-project-name classify_main"
      exit 0
      ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

if [[ ! -d "$PROJECT_DIR" ]]; then
  echo "ERROR: project directory not found: $PROJECT_DIR" >&2
  exit 1
fi

echo "[deploy-current] Deploying current server stack at: $PROJECT_DIR"
cd "$PROJECT_DIR"

chmod +x ./scripts/hostinger-update-github.sh || true

# Execute the real logic (existing, battle-tested)
./scripts/hostinger-update-github.sh \
  --project-dir "$PROJECT_DIR" \
  --repo-url "$REPO_URL" \
  --branch "$BRANCH" \
  --compose-project-name "$COMPOSE_PROJECT_NAME" \
  --postgres-host-port "$POSTGRES_HOST_PORT"

echo "[deploy-current] ✅ Done (deploy + smoke check succeeded)."
