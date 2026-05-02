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
