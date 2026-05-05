#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${1:-${DEPLOY_ROOT:-/srv/classify}}"
STAGING_DIR="${2:-$ROOT_DIR/incoming/release-bundle}"
RELEASES_DIR="$ROOT_DIR/releases"
STATE_DIR="$ROOT_DIR/state"
CURRENT_LINK="$ROOT_DIR/current"
PREVIOUS_LINK="$ROOT_DIR/previous"
LOCK_FILE="$ROOT_DIR/.deploy.lock"
LOG_FILE="$ROOT_DIR/logs/deploy.log"

mkdir -p "$RELEASES_DIR" "$STATE_DIR" "$ROOT_DIR/logs"

log() {
  printf '[%s] %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*" | tee -a "$LOG_FILE"
}

require_file() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    log "Missing required file: $file"
    exit 1
  fi
}

checksum_verify() {
  local checksum_file="$1"
  local target_dir="$2"

  if [[ ! -f "$checksum_file" ]]; then
    log "Checksum file not found: $checksum_file"
    exit 1
  fi

  (cd "$target_dir" && sha256sum -c "$checksum_file")
}

update_release_state() {
  local release_dir="$1"
  local version="$2"
  local build_number="$3"
  local previous_release="${4:-}"

  printf '%s\n' "$version" > "$STATE_DIR/current_version"
  printf '%s\n' "$build_number" > "$STATE_DIR/current_build_number"
  if [[ -n "$previous_release" ]]; then
    printf '%s\n' "$previous_release" > "$STATE_DIR/previous_version"
  fi
  printf '%s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" > "$STATE_DIR/last_deploy_at"
  printf '%s\n' "$release_dir" > "$STATE_DIR/current_release_path"
}

run_smoke_checks() {
  local health_url="${DEPLOY_HEALTH_URL:-http://127.0.0.1:5000/api/health}"
  local expected_version="${DEPLOY_EXPECTED_VERSION:-}"

  for attempt in $(seq 1 12); do
    local code
    code="$(curl -fsS -o /tmp/deploy-health.json -w '%{http_code}' "$health_url" || true)"
    if [[ "$code" == "200" ]]; then
      if [[ -n "$expected_version" ]] && command -v jq >/dev/null 2>&1; then
        local reported
        reported="$(jq -r '.version // empty' /tmp/deploy-health.json 2>/dev/null || true)"
        if [[ -n "$reported" && "$reported" != "$expected_version" ]]; then
          log "Health endpoint version mismatch: expected=$expected_version reported=$reported"
          return 1
        fi
      fi
      return 0
    fi
    sleep 5
  done

  log "Health check failed after retries"
  return 1
}

activate_release() {
  local release_dir="$1"
  local version="$2"
  local build_number="$3"
  local previous_release=""

  if [[ -L "$CURRENT_LINK" ]]; then
    previous_release="$(readlink -f "$CURRENT_LINK")"
  fi

  ln -sfn "$release_dir" "$CURRENT_LINK"
  if [[ -n "$previous_release" ]]; then
    ln -sfn "$previous_release" "$PREVIOUS_LINK"
  fi

  update_release_state "$release_dir" "$version" "$build_number" "$previous_release"
}

rollback_release() {
  local rollback_target
  if [[ -L "$PREVIOUS_LINK" ]]; then
    rollback_target="$(readlink -f "$PREVIOUS_LINK")"
  else
    rollback_target=""
  fi

  if [[ -z "$rollback_target" || ! -d "$rollback_target" ]]; then
    log "Rollback target unavailable"
    exit 1
  fi

  ln -sfn "$rollback_target" "$CURRENT_LINK"
  update_release_state "$rollback_target" "$(basename "$rollback_target")" "$(cat "$STATE_DIR/current_build_number" 2>/dev/null || echo 0)" "$rollback_target"
  log "Rolled back to $rollback_target"
}

main() {
  if [[ ! -d "$STAGING_DIR" ]]; then
    log "Staging directory not found: $STAGING_DIR"
    exit 1
  fi

  exec 9>"$LOCK_FILE"
  if ! flock -n 9; then
    log "Another deployment is already running"
    exit 1
  fi

  local release_manifest="$STAGING_DIR/release-manifest.json"
  local checksum_file="$STAGING_DIR/checksums.sha256"

  require_file "$release_manifest"
  require_file "$checksum_file"

  local version build_number release_tag release_dir tmp_dir
  version="$(node -e "const m=require('$release_manifest'); console.log(m.version)")"
  build_number="$(node -e "const m=require('$release_manifest'); console.log(m.buildNumber)")"
  release_tag="$(node -e "const m=require('$release_manifest'); console.log(m.releaseTag)")"

  release_dir="$RELEASES_DIR/${version}+${build_number}"
  tmp_dir="$ROOT_DIR/.staging/${version}+${build_number}"

  mkdir -p "$(dirname "$tmp_dir")"
  rm -rf "$tmp_dir"
  cp -a "$STAGING_DIR" "$tmp_dir"

  log "Verifying checksum for $release_tag"
  checksum_verify "$tmp_dir/checksums.sha256" "$tmp_dir"

  log "Running smoke checks against staged release"
  DEPLOY_EXPECTED_VERSION="$version" run_smoke_checks

  if [[ -d "$release_dir" ]]; then
    log "Release already exists: $release_dir"
  else
    mkdir -p "$release_dir"
    cp -a "$tmp_dir/." "$release_dir/"
  fi

  log "Activating release $release_tag"
  activate_release "$release_dir" "$version" "$build_number"

  if ! run_smoke_checks; then
    log "Smoke checks failed after activation, rolling back"
    rollback_release
    exit 1
  fi

  log "Deployment completed successfully: $release_tag"
}

main "$@"
