#!/usr/bin/env bash
set -euo pipefail

# Apply recommended runtime values on Hostinger VPS and redeploy app safely.
# Usage:
#   bash scripts/hostinger-apply-runtime-hardening.sh
# Optional:
#   PROJECT_DIR=/docker/classitest RESET_SMS_PROVIDER=true bash scripts/hostinger-apply-runtime-hardening.sh

PROJECT_DIR="${PROJECT_DIR:-/docker/classitest}"
RESET_SMS_PROVIDER="${RESET_SMS_PROVIDER:-false}"

if [[ ! -d "$PROJECT_DIR" ]]; then
  echo "ERROR: project directory not found: $PROJECT_DIR"
  exit 1
fi

cd "$PROJECT_DIR"

if [[ ! -f .env ]]; then
  echo "ERROR: .env not found in $PROJECT_DIR"
  exit 1
fi

backup_file=".env.backup.$(date +%Y%m%d-%H%M%S)"
cp .env "$backup_file"
echo "Backup created: $backup_file"

upsert_env() {
  local key="$1"
  local value="$2"

  if grep -qE "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${value}|" .env
  else
    echo "${key}=${value}" >> .env
  fi
}

# Runtime resilience and low-CPU VPS tuning
upsert_env NODE_CLUSTER_ENABLED false
upsert_env WEB_CONCURRENCY 1
upsert_env DB_PUSH_ON_BOOT false
upsert_env DB_POOL_MAX 20
upsert_env DB_POOL_MIN 2
upsert_env DB_POOL_IDLE_TIMEOUT_MS 30000
upsert_env DB_POOL_CONNECT_TIMEOUT_MS 10000
upsert_env STARTUP_RETRY_BASE_MS 3000
upsert_env STARTUP_RETRY_MAX_MS 30000

# SMS noise policy: keep informational unless SMS is mandatory
upsert_env SMS_OTP_REQUIRED false

# Optional explicit SMS disable at env level (only if requested)
if [[ "$RESET_SMS_PROVIDER" == "true" ]]; then
  upsert_env SMS_PROVIDER ""
  upsert_env SMS_API_KEY ""
fi

echo "Applied env keys:"
grep -E "^(NODE_CLUSTER_ENABLED|WEB_CONCURRENCY|DB_PUSH_ON_BOOT|DB_POOL_MAX|DB_POOL_MIN|DB_POOL_IDLE_TIMEOUT_MS|DB_POOL_CONNECT_TIMEOUT_MS|STARTUP_RETRY_BASE_MS|STARTUP_RETRY_MAX_MS|SMS_OTP_REQUIRED|SMS_PROVIDER|SMS_API_KEY)=" .env || true

echo "Validating compose file..."
docker compose config --quiet

echo "Rebuilding app image..."
docker compose build app

echo "Redeploying app container..."
docker compose up -d --force-recreate app

echo "Container status:"
docker compose ps

echo "Recent app logs:"
docker compose logs --tail 120 app

echo "Health check (local container endpoint):"
curl -s -i http://127.0.0.1:5000/api/health || true

echo "Done. If health check is not 200, inspect logs with: docker compose logs -f app db"
