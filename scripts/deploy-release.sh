#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${1:-${DEPLOY_ROOT:-/opt/classify}}"
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

verify_apk_release_signing() {
  local apk_path="$1"

  if [[ ! -f "$apk_path" ]]; then
    log "APK signing verification: missing APK: $apk_path"
    exit 1
  fi

  if ! command -v apksigner >/dev/null 2>&1; then
    log "APK signing verification: apksigner not found on server runner PATH"
    exit 1
  fi

  local out
  out="$(apksigner verify --verbose --print-certs "$apk_path" 2>&1 || true)"
  log "APK apksigner verify output (truncated): $(echo "$out" | tail -n 30 | tr '\n' ' ' | sed 's/  */ /g')"

  # Reject debug keys
  if echo "$out" | grep -qiE "Android Debug|android debug|CN=Android Debug"; then
    log "APK signing verification failed: debug key detected"
    exit 1
  fi

  # Enforce v2/v3 = true
  if ! echo "$out" | grep -qiE "APK Signature Scheme v2.*: true"; then
    log "APK signing verification failed: v2 scheme not verified as true"
    exit 1
  fi

  if ! echo "$out" | grep -qiE "APK Signature Scheme v3.*: true"; then
    log "APK signing verification failed: v3 scheme not verified as true"
    exit 1
  fi

  log "APK signing verification passed: v2 & v3 (release keys)"
}

verify_release_artifact_hashes() {
  local dir="$1"

  local apk="${dir}/app-release.apk"
  local aab="${dir}/app-release.aab"
  local apk_hash="${dir}/app-release.apk.sha256"
  local aab_hash="${dir}/app-release.aab.sha256"

  if [[ ! -f "$apk" ]]; then
    log "Artifact hash gate: missing APK: $apk"
    exit 1
  fi
  if [[ ! -f "$aab" ]]; then
    log "Artifact hash gate: missing AAB: $aab"
    exit 1
  fi

  # If per-artifact sha256 files are missing, fall back to the already-performed
  # `checksum_verify "$tmp_dir/checksums.sha256" "$tmp_dir"` earlier in main().
  if [[ ! -f "$apk_hash" || ! -f "$aab_hash" ]]; then
    log "Per-artifact sha256 files missing (${apk_hash} / ${aab_hash}); skipping per-artifact gate (checksums.sha256 already verified)."
    return 0
  fi

  (cd "$dir" && sha256sum -c "app-release.apk.sha256" "app-release.aab.sha256")

  log "Artifact hash gate passed (APK/AAB sha256)."
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
  local health_json_path="${DEPLOY_HEALTH_JSON_PATH:-/tmp/deploy-health.json}"

  local app_port="${DEPLOY_APP_PORT:-${PORT:-5000}}"
  local compose_project="${DEPLOY_COMPOSE_PROJECT_NAME:-${COMPOSE_PROJECT_NAME:-classify}}"
  local app_service="${DEPLOY_COMPOSE_SERVICE_NAME:-app}"

  docker_smoke_check() {
    # Runs health check from inside the running container network.
    # Important: run docker compose from the directory that has docker-compose*.yml.
    local compose_workdir="${DEPLOY_COMPOSE_WORKDIR:-$ROOT_DIR}"

    # 1) Try with explicit compose project (if it matches the running stack).
    (cd "$compose_workdir" && docker compose -p "$compose_project" exec -T "$app_service" sh -lc \
      "curl -fsS http://localhost:${app_port}/api/health" >"$health_json_path" 2>/dev/null) || true

    # 2) Try without -p (compose will use its default project name from directory).
    if [[ ! -s "$health_json_path" ]]; then
      (cd "$compose_workdir" && docker compose exec -T "$app_service" sh -lc \
        "curl -fsS http://localhost:${app_port}/api/health" >"$health_json_path" 2>/dev/null) || true
    fi

    # 3) Final fallback: docker exec the running container whose name matches the service.
    if [[ ! -s "$health_json_path" ]]; then
      local container_name
      container_name="$(docker ps --filter "name=${app_service}" --format "{{.Names}}" | head -n 1 || true)"
      if [[ -n "$container_name" ]]; then
        docker exec "$container_name" sh -lc \
          "curl -fsS http://localhost:${app_port}/api/health" >"$health_json_path" 2>/dev/null || true
      fi
    fi
  }

  for attempt in $(seq 1 12); do
    local code="000"

    # Try host curl first (works in docker-compose.http.yml where host port is published).
    if curl -fsS -o "$health_json_path" -w '%{http_code}' "$health_url" >/dev/null 2>&1; then
      code="200"
    else
      # Fall back to container-network curl.
      if docker_smoke_check; then
        code="200"
      fi
    fi

    if [[ "$code" == "200" ]]; then
      if [[ -n "$expected_version" ]] && command -v jq >/dev/null 2>&1; then
        # Current health response does NOT include a top-level `.version`;
        # keep version enforcement non-fatal by only checking it if present.
        local reported
        reported="$(jq -r '.version // empty' "$health_json_path" 2>/dev/null || true)"
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

sync_mobile_artifacts_to_container() {
  local release_dir="$1"
  local release_tag="$2"

  # Compose project name used on this VPS (default matches docker-compose.yml observation: classify_main).
  local compose_project="${DEPLOY_COMPOSE_PROJECT_NAME:-${COMPOSE_PROJECT_NAME:-classify_main}}"

  # Find running app container for the compose stack.
  local container_id
  container_id="$(docker compose -p "$compose_project" ps -q app 2>/dev/null || true)"
  if [[ -z "$container_id" ]]; then
    container_id="$(docker ps --filter "name=${compose_project}.*-app" --format "{{.ID}}" | head -n 1 || true)"
  fi
  if [[ -z "$container_id" ]]; then
    log "Mobile artifact sync: could not find running app container (compose_project=$compose_project)"
    return 1
  fi

  # CI deploy bundle contains the Flutter wrapper artifacts at release_dir root:
  # - app-release.apk
  # - app-release.aab
  local apk_src="${release_dir}/app-release.apk"
  local aab_src="${release_dir}/app-release.aab"

  if [[ ! -f "$apk_src" ]]; then
    log "Mobile artifact sync: missing APK source: $apk_src"
    return 1
  fi
  if [[ ! -f "$aab_src" ]]; then
    log "Mobile artifact sync: missing AAB source: $aab_src"
    return 1
  fi

  # Names expected by the frontend / links generator.
  local latest_apk_name="classify-app-latest.apk"
  local latest_aab_name="classify-googleplay-latest.aab"
  local versioned_apk_name="classify-app-${release_tag}.apk"
  local versioned_aab_name="classify-googleplay-${release_tag}.aab"

  # Ensure destination paths exist.
  docker exec "$container_id" sh -lc "mkdir -p /app/dist/public/apps/archive" >/dev/null 2>&1 || true

  # Retention requirement: keep ONLY the latest release artifacts on disk.
  # Remove all previous versioned archives before copying the new ones.
  docker exec "$container_id" sh -lc "rm -f /app/dist/public/apps/archive/classify-app-*.apk /app/dist/public/apps/archive/classify-googleplay-*.aab || true" >/dev/null 2>&1 || true

  # Copy latest + archived artifacts into the running container static folder.
  docker cp "$apk_src" "$container_id:/app/dist/public/apps/${latest_apk_name}"
  docker cp "$aab_src" "$container_id:/app/dist/public/apps/${latest_aab_name}"
  docker cp "$apk_src" "$container_id:/app/dist/public/apps/archive/${versioned_apk_name}"
  docker cp "$aab_src" "$container_id:/app/dist/public/apps/archive/${versioned_aab_name}"

  log "Mobile artifact sync complete: /apps/${latest_apk_name} and /apps/${latest_aab_name}"
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

  log "Verifying per-artifact sha256 hashes before activation"
  verify_release_artifact_hashes "$tmp_dir"

  log "Verifying APK signing (v2/v3) before activation"
  verify_apk_release_signing "$tmp_dir/app-release.apk"

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

  log "Syncing mobile artifacts into running container..."
  sync_mobile_artifacts_to_container "$release_dir" "$release_tag"

  if ! run_smoke_checks; then
    log "Smoke checks failed after activation, rolling back"
    rollback_release
    exit 1
  fi

  # Cleanup staged build + temporary copy only after successful activation.
  rm -rf "$tmp_dir" 2>/dev/null || true

  # Prune old release directories (keep only current + previous targets).
  local current_target previous_target
  current_target="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
  previous_target="$(readlink -f "$PREVIOUS_LINK" 2>/dev/null || true)"

  shopt -s nullglob 2>/dev/null || true
  for d in "$RELEASES_DIR"/*; do
    if [[ -d "$d" && "$d" != "$STAGING_DIR" && "$d" != "$current_target" && "$d" != "$previous_target" ]]; then
      log "Pruning old release dir: $d"
      rm -rf "$d"
    fi
  done

  # Clean staging directory contents after a successful activation.
  # Keep the staging directory itself so next release uploads have a stable target.
  if [[ -d "$STAGING_DIR" ]]; then
    log "Cleaning staging directory contents: $STAGING_DIR"
    rm -rf "$STAGING_DIR"/* 2>/dev/null || true
    rm -rf "$STAGING_DIR"/.[!.]* "$STAGING_DIR"/..?* 2>/dev/null || true
  fi

  log "Deployment completed successfully: $release_tag"
}

main "$@"
