#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Classify - Hostinger VPS GitHub Update (Docker + DB + Admin)
# ============================================================
# What it does:
# - Ensure project exists under --project-dir and is git checkout
# - Pull latest changes from GitHub (origin/branch or specified remote url)
# - Patch .dockerignore exceptions (manage-admin/create-admin) to avoid MODULE_NOT_FOUND in admin:setup
# - Ensure traefik-gemj_default network exists
# - Ensure .env exists (bootstrap from example if missing; DOES NOT overwrite existing non-placeholder secrets)
# - Resolve POSTGRES_HOST_PORT conflict if needed (only updates env if placeholders/absent)
# - docker compose up -d --build (rebuilds app)
# - Run db migrations: npm run db:push
# - Run admin setup: npm run admin:setup (idempotent; updates password if exists)
# - Smoke test health endpoint inside container
#
# Notes:
# - Doesn't delete data.
# - Doesn't attempt SSL/cert renewal.
# - If you want SSL/cert orchestration, use scripts/vps-deploy.sh or your existing deploy process.

usage() {
  cat <<'EOF'
Usage: scripts/hostinger-update-github.sh [options]

Options:
  --project-dir <path>              Project directory path (default: /opt/classify)
  --repo-url <url>                 Repo URL (default: https://github.com/marcowaa/classify-app.git)
  --branch <name>                  Branch (default: main)
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

log() { printf '[update-github] %s\n' "$*"; }
warn() { printf '[update-github] WARN: %s\n' "$*" >&2; }
die() { printf '[update-github] ERROR: %s\n' "$*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing command: $1"
}

ensure_traefik_network() {
  local net="traefik-gemj_default"
  if ! docker network inspect "$net" >/dev/null 2>&1; then
    log "Creating docker network: $net"
    docker network create "$net" >/dev/null
  fi
}

generate_hex() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    die "openssl is required"
  fi
}

generate_base64_key() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 48 | tr -d '\n='
  else
    die "openssl is required"
  fi
}

is_placeholder_value() {
  case "$1" in
    ''|replace_*|change_me_*|YOUR_*|your_*|admin123|admin1234|undefined|null) return 0 ;;
    *) return 1 ;;
  esac
}

set_env_kv_if_missing_or_placeholder() {
  local key="$1"
  local new_value="$2"
  local env_file="$3"

  local current=""
  current="$(grep -E "^${key}=" "$env_file" 2>/dev/null | head -n1 | cut -d= -f2- || true)"

  if [ -z "$current" ] || is_placeholder_value "$current"; then
    if grep -qE "^${key}=" "$env_file" 2>/dev/null; then
      sed -i.bak -e "s|^${key}=.*|${key}=${new_value}|" "$env_file" && rm -f "${env_file}.bak" || true
    else
      printf '%s=%s\n' "$key" "$new_value" >> "$env_file"
    fi
  fi
}

set_env_kv_unless_present() {
  local key="$1"
  local new_value="$2"
  local env_file="$3"

  if ! grep -qE "^${key}=" "$env_file" 2>/dev/null; then
    printf '%s=%s\n' "$key" "$new_value" >> "$env_file"
  fi
}

port_in_use() {
  local p="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "[:.]$p\$" && return 0 || return 1
  elif command -v netstat >/dev/null 2>&1; then
    netstat -ltn 2>/dev/null | awk '{print $4}' | grep -Eq "[:.]$p\$" && return 0 || return 1
  else
    return 1
  fi
}

patch_dockerignore_for_admin_scripts() {
  local repo_dir="$1"
  local ignore_file="$repo_dir/.dockerignore"
  [ -f "$ignore_file" ] || die ".dockerignore not found: $ignore_file"

  if ! grep -qE '^!scripts/manage-admin\.js$' "$ignore_file"; then
    printf '\n!scripts/manage-admin.js\n' >> "$ignore_file"
    log "Patched .dockerignore: allowed scripts/manage-admin.js"
  fi
  if ! grep -qE '^!scripts/create-admin\.js$' "$ignore_file"; then
    printf '!scripts/create-admin.js\n' >> "$ignore_file"
    log "Patched .dockerignore: allowed scripts/create-admin.js"
  fi
}

clone_or_pull() {
  local dir="$1"
  local url="$2"
  local branch="$3"

  if [ ! -d "$dir" ]; then
    mkdir -p "$(dirname "$dir")"
    git clone --depth 1 --branch "$branch" "$url" "$dir"
    return
  fi

  cd "$dir"
  if [ -d ".git" ]; then
    # Ensure remote exists (best effort)
    git remote get-url origin >/dev/null 2>&1 || git remote add origin "$url" || true
    git fetch --all --prune
    git checkout "$branch" 2>/dev/null || git checkout -b "$branch" "origin/$branch" 2>/dev/null || true
    git pull --ff-only origin "$branch" || git pull origin "$branch" || true
  else
    die "Project dir exists but is not a git repo: $dir"
  fi
}

main() {
  require_cmd docker
  require_cmd git
  require_cmd bash

  if ! docker compose version >/dev/null 2>&1; then
    die "docker compose plugin is required"
  fi

  clone_or_pull "$PROJECT_DIR" "$REPO_URL" "$BRANCH"
  cd "$PROJECT_DIR"

  patch_dockerignore_for_admin_scripts "$PROJECT_DIR"
  ensure_traefik_network

  [ -f "$PROJECT_DIR/docker-compose.yml" ] || die "docker-compose.yml missing"

  if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
      log "Creating .env from .env.example"
      cp .env.example .env
    elif [ -f ".env.production.example" ]; then
      log "Creating .env from .env.production.example"
      cp .env.production.example .env
    else
      die "No .env.example found"
    fi
  fi

  # Ensure compose project name present
  set_env_kv_unless_present "COMPOSE_PROJECT_NAME" "$COMPOSE_PROJECT_NAME" ".env"

  # Ensure required secrets exist (only missing/placeholder)
  set_env_kv_unless_present "POSTGRES_USER" "classify" ".env"
  set_env_kv_if_missing_or_placeholder "POSTGRES_PASSWORD" "$(generate_base64_key)" ".env"
  set_env_kv_unless_present "POSTGRES_DB" "classify_db" ".env"
  set_env_kv_if_missing_or_placeholder "JWT_SECRET" "$(generate_base64_key)" ".env"
  set_env_kv_if_missing_or_placeholder "SESSION_SECRET" "$(generate_base64_key)" ".env"
  set_env_kv_unless_present "ADMIN_EMAIL" "admin@classify.app" ".env"
  set_env_kv_if_missing_or_placeholder "ADMIN_PASSWORD" "$(generate_base64_key)" ".env"
  set_env_kv_if_missing_or_placeholder "ADMIN_CREATION_SECRET" "$(generate_hex)" ".env"

  # Resolve host port if in conflict (best effort)
  local chosen_port="$POSTGRES_HOST_PORT_PREF"
  local current_port=""
  current_port="$(grep -E '^POSTGRES_HOST_PORT=' .env 2>/dev/null | head -n1 | cut -d= -f2- || true)"
  if [ -n "$current_port" ] && ! is_placeholder_value "$current_port"; then
    chosen_port="$current_port"
  fi

  if port_in_use "$chosen_port"; then
    warn "Host port $chosen_port already used. Trying alternatives..."
    chosen_port=""
    for p in 5435 5436 5437 5438 5439 5440; do
      if ! port_in_use "$p"; then
        chosen_port="$p"
        break
      fi
    done
    [ -n "$chosen_port" ] || die "Could not find free port for Postgres"
    # update env
    if grep -qE '^POSTGRES_HOST_PORT=' .env 2>/dev/null; then
      sed -i.bak -e "s/^POSTGRES_HOST_PORT=.*/POSTGRES_HOST_PORT=${chosen_port}/" .env && rm -f .env.bak || true
    else
      printf 'POSTGRES_HOST_PORT=%s\n' "$chosen_port" >> .env
    fi
  fi

  log "Rebuilding and starting stack (project: $COMPOSE_PROJECT_NAME)"
  docker compose -p "$COMPOSE_PROJECT_NAME" up -d --build

  log "Waiting a bit for containers..."
  sleep 10

  log "Running db migrations (db:push)"
  docker compose -p "$COMPOSE_PROJECT_NAME" exec -T app npm run db:push

  log "Running admin setup (admin:setup)"
  docker compose -p "$COMPOSE_PROJECT_NAME" exec -T app npm run admin:setup || {
    warn "admin:setup failed, dumping app logs tail"
    docker compose -p "$COMPOSE_PROJECT_NAME" logs --tail=80 app || true
    die "admin:setup failed"
  }

  log "Smoke test health endpoint inside container"
  docker compose -p "$COMPOSE_PROJECT_NAME" exec -T app sh -lc "curl -fsS http://localhost:5000/api/health >/dev/null"

  log "✅ Update completed successfully."
}

main "$@"
