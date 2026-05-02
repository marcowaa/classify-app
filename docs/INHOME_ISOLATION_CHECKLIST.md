# In-home Isolation Checklist (No Conflict with Classify/Other Docker Projects)

## Goal
Run in-home as a fully isolated service while Classify stays connected only by HTTP API.

## Required Isolation Rules
1. Use a dedicated domain for in-home (recommended: `inhome.classi-fy.com`).
2. Use a separate Docker project name (recommended: `inhome`).
3. Use a separate database for in-home (separate Postgres container and volume).
4. Do not expose in-home DB on host ports used by other projects.
5. Do not run a second reverse proxy on `80/443` if `classitest-traefik-1` already owns them.

## Classify Side (this repository)
Set these values in `.env` for Classify:

- `INHOME_SHIPPING_ENABLED=true`
- `INHOME_SHIPPING_BASE_URL=https://inhome.classi-fy.com`
- `INHOME_SHIPPING_API_KEY=<inhome_api_key>`
- `INHOME_SHIPPING_WEBHOOK_SECRET=<shared_secret>`
- `INHOME_ALLOW_PRIVATE_HOSTS=false`

Notes:
- Production now rejects unsafe connector targets (localhost/private network/non-HTTPS).
- Classify does not read/write in-home database directly; integration is HTTP-only.
- in-home now appears as an optional shipping method in parent and library checkout.
- Classify syncs checkout to in-home only when the buyer explicitly selects the in-home method.

## In-home Side (separate stack)
Use a dedicated compose project name:

```bash
docker compose -p inhome up -d
```

Recommended in-home DB isolation:
- Container name pattern: `inhome-db`
- DB name: `inhome_db`
- DB user: `inhome_user`
- Dedicated volume: `inhome_postgres_data`
- Internal port only (`5432` in container), no host publish unless needed.

If host publish is required, use a unique host port not used by other projects (example `127.0.0.1:5444:5432`).

## Reverse Proxy / Domain Routing
Because `classitest-traefik-1` already binds `80/443`:
1. Reuse the same Traefik instance for in-home routing, OR
2. Host in-home on another VPS.

Do not start another Traefik/Nginx on the same host ports `80` or `443`.

## Conflict Matrix for Your Current Host
From your running projects:
- `classitest-traefik-1`: uses `80:80` and `443:443`.
- `classitest-db-1`: maps `5433:5432`.
- `ablox_postgres`: maps `5432:5432`.

Safe choices for in-home on same host:
- No direct host DB mapping, OR use `5444:5432`.
- No additional `80/443` binding.
- Unique Docker project name `inhome`.

## Verification Commands
Run on the Docker host:

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

Confirm:
- No second container binds `0.0.0.0:80` or `0.0.0.0:443`.
- No overlap on DB host ports with `5432`/`5433` unless intended.

Check Classify connector from admin API:

```bash
curl -sS https://classi-fy.com/api/admin/store/inhome-shipping-config
```

Check in-home webhook status endpoint:

```bash
curl -sS https://classi-fy.com/api/store/inhome/webhook
```

Expected webhook status response includes `method: "POST"`.
