# Hostinger Docker Operations Runbook

Date: 2026-03-22
Scope: Production operations for Classify on Hostinger Docker Manager

## 1) Confirmed Runtime Baseline

Environment source:
- Hostinger hPanel -> Docker Manager -> Compose project classify
- Screenshot-confirmed running containers:
  - classify-app-1
  - classify-db-1
  - classify-redis-1
  - classify-minio-1
  - classify-apprise-api-1
  - classify-dozzle-1
  - classify-uptime-kuma-1

Network and ports:
- App listens on internal port 5000
- Health endpoint: /api/health
- DB published as 5434:5432 on host (compose default)
- Internal app DB target is db:5432 (not host port)

## 2) Service Topology We Operate Against

Core path:
- app -> db
- app -> redis
- app -> minio

Auxiliary path:
- dozzle for logs
- uptime-kuma for monitoring
- apprise-api for notification relays

Ingress model:
- Traefik labels define host rules and TLS behavior for app and side services.

## 3) Critical Runtime Controls

App process and concurrency:
- NODE_CLUSTER_ENABLED
- WEB_CONCURRENCY

Healthcheck pressure tuning (important for 1 vCPU):
- APP_CONTAINER_HEALTHCHECK_INTERVAL (default: 45s)
- APP_CONTAINER_HEALTHCHECK_TIMEOUT (default: 8s)
- TRAEFIK_APP_HEALTHCHECK_INTERVAL (default: 45s)
- TRAEFIK_APP_HEALTHCHECK_TIMEOUT (default: 8s)
- TRAEFIK_CONTAINER_HEALTHCHECK_INTERVAL (default: 45s)
- TRAEFIK_CONTAINER_HEALTHCHECK_TIMEOUT (default: 5s)

Recommended low-CPU baseline:
- `NODE_CLUSTER_ENABLED=false`
- `WEB_CONCURRENCY=1`
- Keep healthcheck intervals >= 45s unless debugging an incident.

Database pool and stability:
- DB_POOL_MAX
- DB_POOL_MIN
- DB_POOL_IDLE_TIMEOUT_MS
- DB_POOL_CONNECT_TIMEOUT_MS

Startup schema behavior:
- DB_PUSH_ON_BOOT=false recommended by default
- Enable only for controlled maintenance windows

## 4) Normal Deploy Procedure (Hostinger Terminal)

1. Pull and rebuild app image only when code changed.
2. Keep db, redis, and minio running unless migration or infra maintenance is required.
3. Recreate app container and verify health endpoint.

Suggested command sequence:

- docker compose pull
- docker compose build app
- docker compose up -d --force-recreate app
- docker compose ps
- docker compose logs --tail 120 app
- curl -s -i http://127.0.0.1:5000/api/health

Success criteria:
- app is running and healthy
- /api/health returns HTTP 200
- no repeating connection reset loop in app logs

## 5) Incident Triage Procedure (DB Disconnect / Restart Loop)

Symptoms:
- app worker restarts after db restarts
- pg or pg-pool connection terminated/refused errors

Immediate response:
1. Confirm db container health first.
2. Confirm app health second.
3. Inspect app and db logs side by side for timestamp correlation.

Suggested command sequence:

- docker compose ps
- docker compose logs --tail 200 db
- docker compose logs --tail 200 app
- docker compose logs -f app

Expected post-fix behavior:
- transient DB disconnect logs may appear, but app process should not crash-loop
- startup retry/backoff should recover when DB becomes reachable

## 6) SMS OTP Operations Model (Important)

SMS availability is controlled by two gates:

Gate A: Runtime provider config (env)
- SMS_PROVIDER
- SMS_API_KEY
- provider-specific credentials

Gate B: Admin global toggle
- otpProviders table, provider=sms, isActive=true/false
- controlled via admin OTP providers UI/API

User-level gate:
- parent.smsEnabled and parent phone number presence

Operational meaning:
- If admin disables sms provider globally, SMS OTP endpoints should stop offering SMS even if env credentials exist.
- If env credentials missing, SMS remains unavailable even when admin toggle is active.

Noise control:
- SMS_OTP_REQUIRED=false keeps missing-provider message informational.
- Set SMS_OTP_REQUIRED=true only when SMS is mandatory and must alert loudly.

## 7) Stripe Webhook Log Message Policy

Message:
- Stripe webhook not configured; skipping ...

Interpretation:
- informational only, not a crash condition
- treat as expected unless Stripe payments are intended to be active

## 8) Safe DB Maintenance Window Procedure

Before DB restart:
1. Confirm current app health.
2. Pause risky write operations if possible.
3. Avoid running schema push automatically unless explicitly planned.

During restart:
1. Restart db service only.
2. Watch db logs until healthy.
3. Watch app logs for automatic recovery.

After restart:
1. Verify /api/health.
2. Verify a read endpoint and one authenticated endpoint.
3. Confirm no worker crash loops.

## 9) No-Auto-Migration Policy

Default production policy:
- Keep DB_PUSH_ON_BOOT=false
- Run schema push as a dedicated controlled action, not every app boot

When schema change is required:
1. Announce maintenance window.
2. Run migration job once.
3. Redeploy app.
4. Validate key endpoints.

## 10) Operational Checklist

Each deploy or incident close must confirm:
- app healthy
- db healthy
- redis healthy
- minio healthy
- no repeating fatal errors in app logs for 10 minutes
- /api/health returns 200 consistently
- SMS behavior matches intended admin and env state

## 11) Evidence Sources for This Runbook

- docker-compose.yml
- scripts/docker-entrypoint.sh
- Hostinger Docker Manager screenshot (2026-03-22)
- Current server resilience and SMS gating updates in backend routes and storage

## 12) Alerting Baseline (Prometheus)

Configured rules file:
- `monitoring/alert_rules.yml`

Current baseline alerts:
- `ClassifyAppDown` (critical, 2m)
- `RedisExporterDown` (high, 5m)
- `PostgresExporterDown` (high, 5m)
- `HostCpuHigh` (high, 10m)
- `HostMemoryLow` (high, 10m)

Quick validation after monitoring deploy:
- `docker compose -f monitoring/docker-compose.monitoring.yml up -d`
- Open Prometheus UI and verify loaded rules under `/rules`
- Confirm `up{job="classify-app"}` target is reachable

## 13) Alert Response Workflow

On any critical/high alert:
1. Confirm active alert in Prometheus (firing state, labels, duration).
2. Correlate with app logs (`docker compose logs --tail 200 app`).
3. Correlate with infra logs (`db`, `redis`, `nginx` where relevant).
4. Validate customer impact via `/api/health` and one authenticated endpoint.
5. Apply least-risk mitigation first (restart impacted service only).

Escalation policy:
- `critical`: immediate on-call action.
- `high`: action within same operational window.

## 14) Recovery Playbooks

Postgres unavailable:
1. `docker compose ps` and `docker compose logs --tail 200 db`
2. Restart db only: `docker compose restart db`
3. Verify app recovers automatically from retry/backoff
4. Validate `/api/health` returns 200

Redis unavailable:
1. `docker compose logs --tail 200 redis`
2. Restart redis only: `docker compose restart redis`
3. Confirm degraded-to-healthy transition in `/api/health` checks

App down:
1. `docker compose logs --tail 300 app`
2. Recreate app container only: `docker compose up -d --force-recreate app`
3. Validate health and key API endpoint

## 15) Incident Closure and Postmortem

Closure checklist:
- Alert resolved and stable for at least 15 minutes
- No recurring fatal error in logs
- Health endpoint consistently healthy
- Customer-facing path verified

Postmortem template:
- Use `docs/INCIDENT_POSTMORTEM_TEMPLATE.md`
- Record timeline, impact, root cause, and follow-up actions within 24 hours
