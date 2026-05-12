#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Classify - Hostinger "smart" first-run (Docker + Traefik)
# ============================================================
# هدف السكربت:
# - يشتغل من أول مرة بمرونة ضد اختلافات env/interpolation
# - يولّد أسرار MinIO console basic auth + kuma/dozzle basic auth تلقائيًا
# - يضمن DATABASE_URL يكون db:5432 (مع URL-encoding للباسورد)
# - يعمل migrations (db:push) + admin:setup
# - يعمل Smoke test لـ /api/health من داخل app container
#
# ملاحظة:
# - لا يحاول يغيّر docker-compose.yml إلا لو كانت عندك المتطلبات الأساسية باينة.
# - لو عندك مشاكل إضافية في uptime-kuma (setgroups)، غالبًا تحتاج تعديل docker-compose.yml:
#   cap_add: [SETGID] داخل uptime-kuma service (موجود في نسخة repo الأحدث).

usage() {
  cat <<'EOF'
Usage: scripts/hostinger-smart-first-run.sh [options]

Options:
  --project-dir <path>                Project directory path (default: /opt/classify)
  --repo-url <url>                   Git repo URL (default: https://github.com/marcowaa/classify-app.git)
  --branch <name>                    Git branch (default: main)
  --compose-project-name <name>     Docker compose project name (default: classify_main)
  --skip-install                     Skip system package install/update
  --postgres-host-port <port>      Preferred host port for Postgres (default: 5434)
EOF
}

PROJECT_DIR="/opt/classify"
REPO_URL="https://github.com/marcowaa/classify-app.git"
BRANCH="main"
COMPOSE_PROJECT_NAME="classify_main"
POSTGRES_HOST_PORT_PREF="5434"
AUTO_INSTALL="true"

while [ $# -gt 0 ]; do
  case "$1" in
    --project-dir) PROJECT_DIR="$2"; shift 2 ;;
    --repo-url) REPO_URL="$2"; shift 2 ;;
    --branch) BRANCH="$2"; shift 2 ;;
    --compose-project-name) COMPOSE_PROJECT_NAME="$2"; shift 2 ;;
    --postgres-host-port) POSTGRES_HOST_PORT_PREF="$2"; shift 2 ;;
    --skip-install) AUTO_INSTALL="false"; shift 1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage; exit 1 ;;
  esac
done

log() { printf '[smart-first-run] %s\n' "$*"; }
warn() { printf '[smart-first-run] WARN: %s\n' "$*" >&2; }
die() { printf '[smart-first-run] ERROR: %s\n' "$*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing command: $1"
}

# --- Basic utilities ---
dedupe_env_file() {
  local env_file="$1"
  [ -f "$env_file" ] || return 0

  local tmp
  tmp="$(mktemp)"
  awk -F= '
    /^[A-Za-z_][A-Za-z0-9_]*=/ {
      k=$1
      v=$0
      last[k]=v
      next
    }
    { other[NR]=$0 }
    END {
      # Keep non-key lines in original order (best-effort)
      for (i=1;i<=NR;i++) {
        # No-op: awk NR includes only lines processed; we only want to print key lines + untouched comments
      }
      # Print all last[k] deterministically by first appearance order:
      # We recreate order by scanning once:
    }' "$env_file" > /dev/null 2>&1 || true

  # Simpler ordered dedupe: keep first occurrence order of keys, keep last value line.
  awk '
    /^[A-Za-z_][A-Za-z0-9_]*=/ {
      key=$1
      if (!(key in seen_order)) { order[++n]=key; seen_order[key]=1 }
      last[key]=$0
      next
    }
    /^[[:space:]]*#/ { print; next }
    /^[[:space:]]*$/ { print; next }
    { print }
    END {
      for (i=1;i<=n;i++) {
        k=order[i]
        if (k in last) print last[k]
      }
    }' "$env_file" > "$tmp"

  mv "$tmp" "$env_file"
}

url_encode() {
  local value="$1"
  # Try python3 first (available on most VPS; safe for URL encoding)
  if command -v python3 >/dev/null 2>&1; then
    python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$value"
    return 0
  fi
  # Try jq
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$value" | jq -sRr @uri
    return 0
  fi
  die "Need python3 or jq for URL encoding"
}

build_database_url() {
  local user="$1"
  local pass="$2"
  local db="$3"
  local host="$4"
  local port="$5"

  local uenc penc denc
  uenc="$(url_encode "$user")"
  penc="$(url_encode "$pass")"
  denc="$(url_encode "$db")"

  printf 'postgresql://%s:%s@%s:%s/%s' "$uenc" "$penc" "$host" "$port" "$denc"
}

is_placeholder_value() {
  # $1 value
  local v="$1"
  case "$v" in
    ''|replace_*|change_me_*|YOUR_*|undefined|null) return 0 ;;
    *) return 1 ;;
  esac
}

set_env_line() {
  # key value env_file
  local key="$1"
  local value="$2"
  local env_file="$3"

  if grep -qE "^${key}=" "$env_file" 2>/dev/null; then
    # Replace entire line (single line values)
    sed -i.bak -e "s|^${key}=.*|${key}=${value}|" "$env_file" && rm -f "${env_file}.bak" || true
  else
    printf '%s=%s\n' "$key" "$value" >> "$env_file"
  fi
}

get_env_val() {
  local key="$1"
  local env_file="$2"
  grep -E "^${key}=" "$env_file" 2>/dev/null | head -n1 | cut -d= -f2-
}

# --- Ensure project exists (clone if needed) ---
ensure_project() {
  [ -d "$PROJECT_DIR" ] || {
    log "Cloning repo into $PROJECT_DIR"
    mkdir -p "$(dirname "$PROJECT_DIR")"
    git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$PROJECT_DIR"
  }
  [ -f "$PROJECT_DIR/docker-compose.yml" ] || die "docker-compose.yml not found in $PROJECT_DIR"
  [ -f "$PROJECT_DIR/scripts/hostinger-first-run.sh" ] || log "Note: hostinger-first-run.sh missing; continuing anyway."
}

ensure_env_file() {
  local env_file="$PROJECT_DIR/.env"
  if [ ! -f "$env_file" ]; then
    if [ -f "$PROJECT_DIR/.env.example" ]; then
      log "Creating .env from .env.example"
      cp "$PROJECT_DIR/.env.example" "$env_file"
    else
      die "No .env or .env.example found in $PROJECT_DIR"
    fi
  fi
}

# --- Generate basic auth hash (APR1) and escape $ for compose interpolation ---
generate_apr1_basic_auth_users() {
  # username password -> "username:hash" (hash escaped with $$)
  local username="$1"
  local password="$2"

  require_cmd openssl
  local salt hash esc
  salt="$(openssl rand -hex 6)"
  hash="$(openssl passwd -apr1 -salt "$salt" "$password")"

  # Escape '$' => '$$' to avoid docker-compose env interpolation issues
  esc="$(printf '%s' "$hash" | sed -e 's/\$/$$/g')"

  printf '%s:%s' "$username" "$esc"
}

main() {
  require_cmd docker
  require_cmd bash
  require_cmd git
  require_cmd openssl

  ensure_project

  # Run the existing first-run to ensure base prerequisites + stack up + admin/db bootstrap.
  # Then we patch env and force-recreate app.
  if [ "$AUTO_INSTALL" = "true" ]; then
    log "Running hostinger-first-run.sh (with install)"
    bash "$PROJECT_DIR/scripts/hostinger-first-run.sh" \
      --project-dir "$PROJECT_DIR" \
      --repo-url "$REPO_URL" \
      --branch "$BRANCH" \
      --compose-project-name "$COMPOSE_PROJECT_NAME" \
      --postgres-host-port "$POSTGRES_HOST_PORT_PREF"
  else
    log "Running hostinger-first-run.sh (--skip-install)"
    bash "$PROJECT_DIR/scripts/hostinger-first-run.sh" \
      --project-dir "$PROJECT_DIR" \
      --repo-url "$REPO_URL" \
      --branch "$BRANCH" \
      --compose-project-name "$COMPOSE_PROJECT_NAME" \
      --postgres-host-port "$POSTGRES_HOST_PORT_PREF" \
      --skip-install
  fi

  ensure_env_file
  dedupe_env_file "$PROJECT_DIR/.env"

  local env_file="$PROJECT_DIR/.env"

  # Ensure POSTGRES required keys exist (best-effort)
  local pg_user pg_pass pg_db
  pg_user="$(get_env_val "POSTGRES_USER" "$env_file")"
  pg_pass="$(get_env_val "POSTGRES_PASSWORD" "$env_file")"
  pg_db="$(get_env_val "POSTGRES_DB" "$env_file")"

  [ -n "$pg_user" ] || die "POSTGRES_USER missing/empty in .env"
  [ -n "$pg_pass" ] || die "POSTGRES_PASSWORD missing/empty in .env"
  [ -n "$pg_db" ] || pg_db="classify_db"

  # Force DATABASE_URL => db:5432 with URL encoding
  log "Patching DATABASE_URL to point to db:5432"
  local new_db_url
  new_db_url="$(build_database_url "$pg_user" "$pg_pass" "$pg_db" "db" "5432")"
  set_env_line "DATABASE_URL" "$new_db_url" "$env_file"

  # Ensure MinIO keys exist (best-effort: only if missing/placeholder)
  local minio_access minio_secret
  minio_access="$(get_env_val "MINIO_ACCESS_KEY" "$env_file")"
  minio_secret="$(get_env_val "MINIO_SECRET_KEY" "$env_file")"

  local mk_base64
  mk_base64() { openssl rand -base64 48 | tr -d '\n='; }

  if [ -z "$minio_access" ] || is_placeholder_value "$minio_access"; then
    set_env_line "MINIO_ACCESS_KEY" "$(mk_base64)" "$env_file"
  fi
  if [ -z "$minio_secret" ] || is_placeholder_value "$minio_secret"; then
    set_env_line "MINIO_SECRET_KEY" "$(mk_base64)" "$env_file"
  fi

  minio_secret="$(get_env_val "MINIO_SECRET_KEY" "$env_file")"
  [ -n "$minio_secret" ] || die "MINIO_SECRET_KEY missing after patch"

  # Create BASIC_AUTH users for MinIO console + kuma/dozzle
  local basic_users
  basic_users="$(generate_apr1_basic_auth_users "admin" "$minio_secret")"

  set_env_line "MINIO_CONSOLE_BASIC_AUTH_USERS" "$basic_users" "$env_file"
  set_env_line "KUMA_BASIC_AUTH_USERS" "$basic_users" "$env_file"
  set_env_line "DOZZLE_BASIC_AUTH_USERS" "$basic_users" "$env_file"

  # Force-recreate app to pick up new env
  log "Forcing app recreate to pick up env changes"
  docker compose -p "$COMPOSE_PROJECT_NAME" up -d --no-deps --force-recreate app

  # Migrations + admin setup
  log "Running migrations (db:push)"
  docker compose -p "$COMPOSE_PROJECT_NAME" exec -T app npm run db:push

  log "Running admin setup (admin:setup)"
  docker compose -p "$COMPOSE_PROJECT_NAME" exec -T app npm run admin:setup

  # Smoke test
  log "Smoke test: /api/health"
  docker compose -p "$COMPOSE_PROJECT_NAME" exec -T app sh -lc "curl -fsS http://localhost:5000/api/health >/dev/null"

  log "✅ smart-first-run completed successfully."
  log "Next: open your domain via Traefik/HTTPS (DNS/SSL dependent)."
}

main "$@"
