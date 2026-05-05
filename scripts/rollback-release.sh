#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${1:-${DEPLOY_ROOT:-/srv/classify}}"
STATE_DIR="$ROOT_DIR/state"
CURRENT_LINK="$ROOT_DIR/current"
PREVIOUS_LINK="$ROOT_DIR/previous"
LOCK_FILE="$ROOT_DIR/.deploy.lock"
LOG_FILE="$ROOT_DIR/logs/deploy.log"

mkdir -p "$ROOT_DIR/logs" "$STATE_DIR"

log() {
  printf '[%s] %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*" | tee -a "$LOG_FILE"
}

main() {
  exec 9>"$LOCK_FILE"
  if ! flock -n 9; then
    log "Another deployment is already running"
    exit 1
  fi

  if [[ ! -L "$PREVIOUS_LINK" ]]; then
    log "No previous release available"
    exit 1
  fi

  local rollback_target
  rollback_target="$(readlink -f "$PREVIOUS_LINK")"

  if [[ -z "$rollback_target" || ! -d "$rollback_target" ]]; then
    log "Previous release path is invalid: $rollback_target"
    exit 1
  fi

  if [[ -L "$CURRENT_LINK" ]]; then
    local current_target
    current_target="$(readlink -f "$CURRENT_LINK")"
    ln -sfn "$current_target" "$PREVIOUS_LINK"
  fi

  ln -sfn "$rollback_target" "$CURRENT_LINK"

  printf '%s\n' "$rollback_target" > "$STATE_DIR/current_release_path"
  printf '%s\n' "$(basename "$rollback_target")" > "$STATE_DIR/current_version"
  printf '%s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" > "$STATE_DIR/last_rollback_at"

  log "Rollback completed to $rollback_target"
}

main "$@"
