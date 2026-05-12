#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Classify - Hostinger VPS First Run (Docker + Traefik)
# ============================================================
# What it does (idempotent):
# - Analyze host environment (OS/CPU/RAM/disk + tool versions)
# - Install missing system prerequisites when possible
# - Clone or reuse repo under --project-dir
# - Ensure dockerignore allows scripts/manage-admin.js + create-admin.js
# - Ensure traefik-gemj_default network exists
# - Create .env from .env.example if missing
# - De-duplicate .env keys (no duplicates before build)
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
  --skip-install                   Skip system package install/update
  --full-upgrade                   Run apt-get upgrade during install
  --no-dedupe-env                  Do not de-duplicate .env keys
EOF
}

PROJECT_DIR="/opt/classify"
REPO_URL="https://github.com/marcowaa/classify-app.git"
BRANCH="main"
COMPOSE_PROJECT_NAME="classify_main"
POSTGRES_HOST_PORT_PREF="5434"
AUTO_INSTALL="true"
RUN_APT_UPGRADE="false"
AUTO_DEDUPE_ENV="true"

while [ $# -gt 0 ]; do
  case "$1" in
    --project-dir) PROJECT_DIR="$2"; shift 2 ;;
    --repo-url) REPO_URL="$2"; shift 2 ;;
    --branch) BRANCH="$2"; shift 2 ;;
    --compose-project-name) COMPOSE_PROJECT_NAME="$2"; shift 2 ;;
    --postgres-host-port) POSTGRES_HOST_PORT_PREF="$2"; shift 2 ;;
    --skip-install) AUTO_INSTALL="false"; shift 1 ;;
    --full-upgrade) RUN_APT_UPGRADE="true"; shift 1 ;;
    --no-dedupe-env) AUTO_DEDUPE_ENV="false"; shift 1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage; exit 1 ;;
  esac
done

log() { printf '[first-run] %s\n' "$*"; }
warn() { printf '[first-run] WARN: %s\n' "$*" >&2; }
die() { printf '[first-run] ERROR: %s\n' "$*" >&2; exit 1; }

run_as_root() {
  if [ "${EUID:-$(id -u)}" -eq 0 ]; then
    "$@"
    return
  fi
  if command -v sudo >/dev/null 2>&1; then
    sudo "$@"
    return
  fi
  die "Root privileges required for install steps"
}

detect_os() {
  OS_ID="unknown"
  OS_LIKE=""
  if [ -f /etc/os-release ]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    OS_ID="${ID:-unknown}"
    OS_LIKE="${ID_LIKE:-}"
  fi
}

is_debian_like() {
  case ",${OS_ID},${OS_LIKE}," in
    *,debian,*|*,ubuntu,*|*,raspbian,*) return 0 ;;
    *) return 1 ;;
  esac
}

analyze_environment() {
  detect_os
  log "Environment snapshot"
  log "- OS: ${OS_ID}${OS_LIKE:+ (like ${OS_LIKE})}"
  log "- Kernel: $(uname -r 2>/dev/null || echo unknown)"
  if command -v nproc >/dev/null 2>&1; then
    log "- CPU cores: $(nproc)"
  fi
  if command -v free >/dev/null 2>&1; then
    log "- Memory: $(free -m | awk '/Mem:/ {print $2 " MB"}')"
  fi
  if command -v df >/dev/null 2>&1; then
    log "- Disk: $(df -h / | awk 'NR==2 {print $4 " free of " $2}')"
  fi
  if command -v docker >/dev/null 2>&1; then
    log "- Docker: $(docker --version 2>/dev/null || true)"
  fi
  if command -v git >/dev/null 2>&1; then
    log "- Git: $(git --version 2>/dev/null || true)"
  fi
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing command: $1"
}

ensure_system_prereqs() {
  detect_os
  if ! is_debian_like; then
    die "Auto-install supports Debian/Ubuntu only (detected: ${OS_ID})"
  fi
  require_cmd apt-get

  log "Updating package index"
  run_as_root apt-get update -y
  if [ "$RUN_APT_UPGRADE" = "true" ]; then
    log "Upgrading installed packages"
    run_as_root DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
  fi

  log "Installing system prerequisites"
  run_as_root DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ca-certificates curl git openssl jq gnupg lsb-release iproute2 git-lfs

  if ! command -v docker >/dev/null 2>&1; then
    log "Installing Docker"
    require_cmd curl
    run_as_root sh -c "curl -fsSL https://get.docker.com | sh"
  fi

  if ! docker compose version >/dev/null 2>&1; then
    log "Installing docker compose plugin"
    run_as_root DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends docker-compose-plugin
  fi

  if command -v systemctl >/dev/null 2>&1; then
    run_as_root systemctl enable --now docker >/dev/null 2>&1 || true
  fi
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

urlencode() {
  local value="$1"
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$value" | jq -sRr @uri
    return 0
  fi
  if command -v python3 >/dev/null 2>&1; then
    printf '%s' "$value" | python3 - <<'PY'
import sys
from urllib.parse import quote

value = sys.stdin.read().strip()
print(quote(value, safe=""))
PY
    return 0
  fi
  warn "jq/python3 not found; DATABASE_URL may need manual URL encoding"
  printf '%s' "$value"
}

build_database_url() {
  local user="$1"
  local pass="$2"
  local db="$3"
  local host="${4:-db}"
  local port="${5:-5432}"
  local user_enc=""
  local pass_enc=""
  local db_enc=""

  user_enc="$(urlencode "$user")"
  pass_enc="$(urlencode "$pass")"
  db_enc="$(urlencode "$db")"

  printf 'postgresql://%s:%s@%s:%s/%s' "$user_enc" "$pass_enc" "$host" "$port" "$db_enc"
}

is_placeholder_value() {
  # $1 value
  # Treat empty or common placeholders as "needs generation"
  case "$1" in
    ''|replace_*|change_me_*|YOUR_*|your_*|admin123|admin1234|undefined|null) return 0 ;;
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

list_env_duplicate_keys() {
  # $1 env_file
  local env_file="$1"
  awk -F= '
    /^[A-Za-z_][A-Za-z0-9_]*=/ {
      key=$1
      count[key]++
      if (count[key] == 2) print key
    }
  ' "$env_file"
}

dedupe_env_file() {
  # $1 env_file
  local env_file="$1"
  local tmp=""

  if command -v mktemp >/dev/null 2>&1; then
    tmp="$(mktemp)"
  else
    tmp="${env_file}.dedupe.$$"
  fi

  awk -F= '
    {
      lines[NR] = $0
      if ($0 ~ /^[A-Za-z_][A-Za-z0-9_]*=/) {
        key = $1
        last[key] = NR
      }
    }
    END {
      for (i = 1; i <= NR; i++) {
        line = lines[i]
        if (line ~ /^[A-Za-z_][A-Za-z0-9_]*=/) {
          key = substr(line, 1, index(line, "=") - 1)
          if (i == last[key]) {
            print line
          }
        } else {
          print line
        }
      }
    }
  ' "$env_file" > "$tmp"

  mv "$tmp" "$env_file"
}

ensure_env_no_duplicates() {
  # $1 env_file
  local env_file="$1"
  local dups=""

  dups="$(list_env_duplicate_keys "$env_file" | tr '\n' ' ' | xargs echo || true)"
  if [ -n "$dups" ]; then
    if [ "$AUTO_DEDUPE_ENV" = "true" ]; then
      warn "Duplicate keys detected in .env. Cleaning: $dups"
      dedupe_env_file "$env_file"
    else
      die "Duplicate keys detected in .env: $dups"
    fi
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
  analyze_environment

  if [ "$AUTO_INSTALL" = "true" ]; then
    ensure_system_prereqs
  fi

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
  ensure_env_no_duplicates ".env"
  set_env_kv_unless_present "COMPOSE_PROJECT_NAME" "$COMPOSE_PROJECT_NAME" ".env"

  # Required env vars for docker-compose.yml app/db:
  set_env_kv_unless_present "POSTGRES_USER" "classify" ".env"
  set_env_kv_if_missing_or_placeholder "POSTGRES_PASSWORD" "$(generate_base64_key)" ".env"
  set_env_kv_unless_present "POSTGRES_DB" "classify_db" ".env"

  local pg_user=""
  local pg_pass=""
  local pg_db=""
  local db_url=""
  pg_user="$(grep -E '^POSTGRES_USER=' .env 2>/dev/null | head -n1 | cut -d= -f2- || true)"
  pg_pass="$(grep -E '^POSTGRES_PASSWORD=' .env 2>/dev/null | head -n1 | cut -d= -f2- || true)"
  pg_db="$(grep -E '^POSTGRES_DB=' .env 2>/dev/null | head -n1 | cut -d= -f2- || true)"
  if [ -n "$pg_user" ] && [ -n "$pg_pass" ] && [ -n "$pg_db" ]; then
    db_url="$(build_database_url "$pg_user" "$pg_pass" "$pg_db" "db" "5432")"
    set_env_kv_if_missing_or_placeholder "DATABASE_URL" "$db_url" ".env"
  else
    warn "DATABASE_URL not set because POSTGRES_* values are incomplete"
  fi

  set_env_kv_if_missing_or_placeholder "REDIS_URL" "redis://redis:6379" ".env"

  set_env_kv_if_missing_or_placeholder "APP_URL" "https://classi-fy.com" ".env"
  local app_url=""
  app_url="$(grep -E '^APP_URL=' .env 2>/dev/null | head -n1 | cut -d= -f2- || true)"
  if [ -n "$app_url" ]; then
    set_env_kv_if_missing_or_placeholder "PUBLIC_BASE_URL" "$app_url" ".env"
    set_env_kv_if_missing_or_placeholder "CORS_ORIGIN" "$app_url" ".env"
    set_env_kv_if_missing_or_placeholder "ALLOWED_ORIGINS" "$app_url" ".env"
  fi

  set_env_kv_if_missing_or_placeholder "NODE_ENV" "production" ".env"

  set_env_kv_if_missing_or_placeholder "JWT_SECRET" "$(generate_base64_key)" ".env"
  set_env_kv_if_missing_or_placeholder "SESSION_SECRET" "$(generate_base64_key)" ".env"

  set_env_kv_unless_present "ADMIN_EMAIL" "admin@classify.app" ".env"
  set_env_kv_if_missing_or_placeholder "ADMIN_PASSWORD" "$(generate_base64_key)" ".env"
  set_env_kv_if_missing_or_placeholder "ADMIN_PANEL_PASSWORD" "$(generate_base64_key)" ".env"
  set_env_kv_if_missing_or_placeholder "ADMIN_CREATION_SECRET" "$(generate_hex)" ".env"
  set_env_kv_if_missing_or_placeholder "MINIO_ACCESS_KEY" "$(generate_base64_key)" ".env"
  set_env_kv_if_missing_or_placeholder "MINIO_SECRET_KEY" "$(generate_base64_key)" ".env"

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

  ensure_env_no_duplicates ".env"

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
