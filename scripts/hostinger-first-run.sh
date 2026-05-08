#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Classify - Hostinger VPS First Run (Docker + Traefik)
# ============================================================
# What it does (idempotent):
# - Clone or reuse repo under --project-dir
# - Ensure dockerignore allows scripts/manage-admin.js + create-admin.js
# - Ensure traefik-gemj_default network exists
# - Create .env from .env.example if missing
# - Generate ONLY missing/placeholder secrets (no overwrite)
# - Resolve host port conflict for POSTGRES_HOST_PORT
# - docker compose up -d --build
# - Run migrations: npm run db:push
# - Run admin setup: npm run admin:setup
# - Smoke test health endpoint inside container
#
# Notes:
# - Does NOT delete any files.
# - Does NOT print secrets (except non-sensitive env values).

usage() {
  cat <<'EOF'
Usage: scripts/hostinger-first-run.sh [options]

Options:
  --project-dir <path>              Project directory path (default: /opt/classify)
  --repo-url <url>                 Git repo URL to clone (default: https://github.com/marcowaa/classify-app.git)
  --branch <name>                  Git branch (default: main)
  --compose-project-name <name>   Docker compose project name (default: classify_main)
  --postgres-host-port <port>    Preferred host port for Postgres (default: 5434)
EOF
}

PROJECT_DIR="/opt/classify"
REPO_URL="https://github.com/marcowaa/classify-app.git"
BRANCH="main"
COMPOSE_PROJECT_NAME="classify_main"
POSTGRES_HOST_PORT_PREF="5434"

while [ $# -gt 0 ]; do
  case "$1" in
    --project-dir) PROJECT_DIR="$2"; shift 2 ;;
    --repo-url) REPO_URL="$2"; shift 2 ;;
    --branch) BRANCH="$2"; shift 2 ;;
    --compose-project-name) COMPOSE_PROJECT_NAME="$2"; shift 2 ;;
    --postgres-host-port) POSTGRES_HOST_PORT_PREF="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage; exit 1 ;;
  esac
done

log() { printf '[first-run] %s\n' "$*"; }
warn() { printf '[first-run] WARN: %s\n' "$*" >&2; }
die() { printf '[first-run] ERROR: %s\n' "$*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing command: $1"
}

generate_hex() {
  # 64 hex chars
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    die "openssl is required to generate secrets"
  fi
}

generate_base64_key() {
  # ~44 base64 chars (no padding)
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 48 | tr -d '\n='
  else
    die "openssl is required to generate secrets"
  fi
}

is_placeholder_value() {
  # $1 value
  # Treat empty or common placeholders as "needs generation"
  case "$1" in
    ''|replace_*|change_me_*|YOUR_*|your_*|admin123|admin1234) return 0 ;;
    *) return 1 ;;
  esac
}

port_in_use() {
  # $1 port
  local p="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "[:.]$p\$" && return 0 || return 1
  elif command -v netstat >/dev/null 2>&1; then
    netstat -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "[:.]$p\$" && return 0 || return 1
  else
    # last resort: assume free
    return 1
  fi
}

set_env_kv_if_missing_or_placeholder() {
  # $1 key, $2 new_value, $3 env_file
  local key="$1"
  local new_value="$2"
  local env_file="$3"

  local current=""
  current="$(grep -E "^${key}=" "$env_file" 2>/dev/null | head -n1 | cut -d= -f2- || true)"

  if [ -z "$current" ] || is_placeholder_value "$current"; then
    # replace or add
    if grep -qE "^${key}=" "$env_file" 2>/dev/null; then
      # safe replace: key=... (single line)
      # shellcheck disable=SC2001
      sed -i.bak -e "s|^${key}=.*|${key}=${new_value}|" "$env_file" && rm -f "${env_file}.bak" || true
    else
      printf '%s=%s\n' "$key" "$new_value" >> "$env_file"
    fi
    return 0
  fi
  return 1
}

set_env_kv_unless_present() {
  # $1 key, $2 new_value, $3 env_file
  local key="$1"
  local new_value="$2"
  local env_file="$3"

  if ! grep -qE "^${key}=" "$env_file" 2>/dev/null; then
    printf '%s=%s\n' "$key" "$new_value" >> "$env_file"
  fi
}

patch_dockerignore_for_admin_scripts() {
  # $1 repo dir
  local repo_dir="$1"
  local ignore_file="$repo_dir/.dockerignore"
  [ -f "$ignore_file" ] || die ".dockerignore not found in repo: $repo_dir"

  # If scripts are excluded by default, we need exceptions to include these files in the image.
  # Order: append at end (Docker ignore supports later ! patterns).
  if ! grep -qE '^!scripts/manage-admin\.js$' "$ignore_file"; then
    printf '\n!scripts/manage-admin.js\n' >> "$ignore_file"
    log "Patched .dockerignore: allowed scripts/manage-admin.js"
  fi
  if ! grep -qE '^!scripts/create-admin\.js$' "$ignore_file"; then
    printf '!scripts/create-admin.js\n' >> "$ignore_file"
    log "Patched .dockerignore: allowed scripts/create-admin.js"
  fi
}

ensure_traefik_network() {
  local net="traefik-gemj_default"
  if ! docker network inspect "$net" >/dev/null 2>&1; then
    log "Creating docker network: $net"
    docker network create "$net" >/dev/null
  else
    log "Docker network exists: $net"
  fi
}

clone_if_needed() {
  local dir="$1"
  local url="$2"
  local branch="$3"

  if [ ! -d "$dir" ]; then
    log "Cloning repo into $dir"
    mkdir -p "$(dirname "$dir")"
    git clone --depth 1 --branch "$branch" "$url" "$dir"
  else
    # reuse existing, but don't destroy local changes
    if [ ! -d "$dir/.git" ]; then
      warn "Directory exists but is not a git repo: $dir (will not clone)."
    fi
  fi
}

main() {
  require_cmd docker
  require_cmd git
  require_cmd bash

  if ! docker compose version >/dev/null 2>&1; then
    # allow legacy docker-compose
    require_cmd docker-compose
    die "docker compose plugin not available"
  fi

  clone_if_needed "$PROJECT_DIR" "$REPO_URL" "$BRANCH"
  cd "$PROJECT_DIR"

  patch_dockerignore_for_admin_scripts "$PROJECT_DIR"
  ensure_traefik_network

  # Ensure docker-compose is present
  [ -f "$PROJECT_DIR/docker-compose.yml" ] || die "docker-compose.yml not found in $PROJECT_DIR"

  # Ensure .env exists
  if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
      log "Creating .env from .env.example"
      cp .env.example .env
    elif [ -f ".env.production.example" ]; then
      log "Creating .env from .env.production.example"
      cp .env.production.example .env
    else
      die "No .env.example found to bootstrap secrets"
    fi
  fi

  # Ensure compose project name (used in traefik constraints + container names)
  # Also: user requested no duplication; we set only if placeholder/empty.
  set_env_kv_unless_present "COMPOSE_PROJECT_NAME" "$COMPOSE_PROJECT_NAME" ".env"

  # Required env vars for docker-compose.yml app/db:
  set_env_kv_unless_present "POSTGRES_USER" "classify" ".env"
  set_env_kv_if_missing_or_placeholder "POSTGRES_PASSWORD" "$(generate_base64_key)" ".env"
  set_env_kv_unless_present "POSTGRES_DB" "classify_db" ".env"

  set_env_kv_if_missing_or_placeholder "JWT_SECRET" "$(generate_base64_key)" ".env"
  set_env_kv_if_missing_or_placeholder "SESSION_SECRET" "$(generate_base64_key)" ".env"

  set_env_kv_unless_present "ADMIN_EMAIL" "admin@classify.app" ".env"
  set_env_kv_if_missing_or_placeholder "ADMIN_PASSWORD" "$(generate_base64_key)" ".env"
  set_env_kv_if_missing_or_placeholder "ADMIN_CREATION_SECRET" "$(generate_hex)" ".env"

  # Ensure Postgres host port is not conflicting with existing services.
  # docker-compose.yml maps: 127.0.0.1:$POSTGRES_HOST_PORT:5432
  local chosen_port="$POSTGRES_HOST_PORT_PREF"
  local current_port=""
  current_port="$(grep -E '^POSTGRES_HOST_PORT=' .env 2>/dev/null | head -n1 | cut -d= -f2- || true)"
  if [ -n "$current_port" ] && ! is_placeholder_value "$current_port"; then
    chosen_port="$current_port"
  fi

  if port_in_use "$chosen_port"; then
    warn "Host port $chosen_port is already in use. Trying next ports..."
    chosen_port=""
    for p in 5435 5436 5437 5438 5439 5440; do
      if ! port_in_use "$p"; then
        chosen_port="$p"
        break
      fi
    done
    [ -n "$chosen_port" ] || die "Could not find free port for Postgres (tried 5435-5440)"
  fi

  # Update env if needed
  if ! grep -qE '^POSTGRES_HOST_PORT=' .env 2>/dev/null; then
    printf 'POSTGRES_HOST_PORT=%s\n' "$chosen_port" >> .env
  else
    sed -i.bak -e "s/^POSTGRES_HOST_PORT=.*/POSTGRES_HOST_PORT=${chosen_port}/" .env && rm -f .env.bak || true
  fi

  # Compute final compose args
  local project="$COMPOSE_PROJECT_NAME"

  log "Starting docker compose stack (project: $project)"
  # rebuild all services to ensure patched dockerignore is reflected in app image
  docker compose -p "$project" up -d --build

  log "Waiting a bit for containers..."
  sleep 15

  log "Applying DB migrations (db:push)"
  docker compose -p "$project" exec -T app npm run db:push

  log "Running admin setup (admin:setup)"
  docker compose -p "$project" exec -T app npm run admin:setup || {
    warn "admin:setup failed. Dump last 80 lines of app logs:"
    docker compose -p "$project" logs --tail=80 app || true
    die "admin:setup failed"
  }

  log "Smoke test: curl health inside container"
  docker compose -p "$project" exec -T app sh -lc "curl -fsS http://localhost:5000/api/health >/dev/null"

  log "✅ First run completed successfully."
  log "Next: open your site via Traefik/SSL (depends on your DNS)."
}

main "$@"
