# Hostinger Runtime Apply Steps (Env + Redeploy + Smoke Checks)

Date: 2026-03-22
Scope: Apply runtime hardening values on Hostinger and verify service health.

Related runbook:
- docs/HOSTINGER_DOCKER_OPERATIONS_RUNBOOK.md

## 1) Open Hostinger VPS Terminal

Run:

```bash
cd /docker/classitest
pwd
ls -la
```

## 2) Pull latest main (contains runtime fixes)

```bash
git fetch origin
git checkout main
git pull origin main
```

## 3) Apply env values + redeploy app (automated)

```bash
bash scripts/hostinger-apply-runtime-hardening.sh
```

Optional (only if you want explicit SMS provider reset at env level):

```bash
RESET_SMS_PROVIDER=true bash scripts/hostinger-apply-runtime-hardening.sh
```

## 4) Manual smoke checks

```bash
docker compose ps

docker compose logs --tail 120 app

docker compose logs --tail 80 db

curl -s -i http://127.0.0.1:5000/api/health
curl -s -i https://classi-fy.com/api/health
```

Expected:
- app/db/redis/minio are running and healthy
- health endpoint returns HTTP 200
- no repeating crash loop in app logs

## 5) Verify SMS behavior from admin controls

Goal:
- SMS should appear/operate only when BOTH are true:
  1) SMS runtime provider is configured in env
  2) Admin OTP provider sms is active

Quick verification flow:
1. In admin panel, disable SMS provider.
2. Check login/OTP methods response excludes sms.
3. Re-enable SMS provider in admin and verify sms reappears only if env provider credentials exist.

## 6) Rollback (if needed)

If issues appear immediately after applying values:

```bash
cd /docker/classitest
ls -1t .env.backup.* | head -n 1
cp "$(ls -1t .env.backup.* | head -n 1)" .env
docker compose up -d --force-recreate app
docker compose logs --tail 120 app
curl -s -i http://127.0.0.1:5000/api/health
```

## 7) Atomic release deploy model

For versioned application releases, use the release scripts in `scripts/` rather than manual container restarts.

### Release state layout

```bash
/srv/classify/
├── current -> /srv/classify/releases/1.2.3+45
├── previous -> /srv/classify/releases/1.2.2+44
├── releases/
├── state/
└── incoming/release-bundle/
```

### Deploy sequence

1. GitHub Actions builds:
   - web build
   - Flutter APK
   - Flutter AAB
   - release manifest
   - checksums
2. Upload artifacts to the server into a temporary folder.
3. Run `scripts/deploy-release.sh`.
4. Verify checksum and health checks.
5. Switch `current` symlink only after all checks pass.
6. Move the old `current` to `previous`.
7. If any check fails, run `scripts/rollback-release.sh`.

### Conflict prevention rules

- Only one deploy can run at a time because the release script takes a lock file.
- Never deploy directly into `current`.
- Never overwrite a working release directory.
- Always stage into a temporary folder and verify checksum before activation.
- Never remove `previous` until the next release is healthy.

### Zero-downtime strategy

- Prepare the new release in a separate folder.
- Keep the live release active until validation succeeds.
- Flip the symlink in one atomic operation.
- Keep the old release available for immediate rollback.

### Health verification gate

Release activation is allowed only when all of these pass:

- build artifacts exist
- checksum verification succeeds
- health endpoint returns HTTP 200
- version reported by health endpoint matches the release manifest
- no missing files in the staged bundle

### Rollback command

```bash
bash scripts/rollback-release.sh
```

Rollback restores the `current` pointer to `previous` without deleting the failed release.

### Versioning rules

- Source of truth for web release version: `package.json`
- Source of truth for Flutter wrapper version: `appsflutter/pubspec.yaml`
- Semantic version increments by patch for each release
- Build number increments independently
- Release metadata is written to `release-manifest.json`

### Notes for operators

- The GitHub workflow must stay aligned with the deploy scripts.
- If the health endpoint changes, update the smoke checks in `scripts/deploy-release.sh`.
- If checksum file naming changes, update both the deploy and rollback scripts.
