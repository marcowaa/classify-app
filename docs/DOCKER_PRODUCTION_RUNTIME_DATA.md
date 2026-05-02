# Docker Production Runtime Data (Classify)

Date: 2026-03-14

## 1) Verified local production commands

```bash
npx tsc --noEmit
npx vite build
npm run test -- --runInBand
node dist/index.js
curl http://127.0.0.1:5000/api/health
```

Latest verification status:
- TypeScript: PASS (exit 0)
- Vite build: PASS (exit 0)
- Tests: PASS (7 suites, 54 tests)
- Health endpoint: {"status":"ok"}

Local development runtime check:

```bash
npm run dev
curl http://127.0.0.1:5000/api/health
```

- Dev runtime status: PASS (health returned {"status":"ok"})

## 2) App runtime contract

- Runtime entry: `node dist/index.js`
- Runtime port: `5000`
- Health endpoint: `/api/health`
- Required env mode: `NODE_ENV=production`

## 3) Docker image/runtime facts

From Dockerfile:
- Base runtime image: `node:20-alpine`
- Exposed port: `5000`
- Entrypoint command: `sh ./scripts/docker-entrypoint.sh`
- Container healthcheck:

```bash
curl -f http://localhost:5000/api/health
```

## 4) Compose production topology (current repository)

Main app service:
- Service name: `app`
- Internal app port: `5000`
- Depends on: `db`, `redis`, `minio`
- Networks: `classify-network`, `vex_vex-network`

Traefik labels on app include:
- HTTPS router for `classi-fy.com`
- Healthcheck path `/api/health`
- Service port mapping to `5000`

## 5) Minimum production env checklist

Required (compose currently enforces):
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `SESSION_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Recommended to set explicitly:
- `POSTGRES_DB`
- `CORS_ORIGIN`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`

## 6) Deployment runbook commands (Docker host)

```bash
# from repo root on server
cp .env.production .env

docker compose build app

docker compose up -d db redis minio

docker compose up -d app

docker compose ps

docker logs --tail 200 <app-container-name>

curl -i http://127.0.0.1:5000/api/health
```

## 7) Pre-go-live checks

```bash
docker compose ps
curl -I https://classi-fy.com/api/health
curl -I https://classi-fy.com/
```

Expected:
- app container is `healthy`
- `/api/health` returns HTTP 200
- root route returns non-404 response (redirect or app response depending on routing policy)
