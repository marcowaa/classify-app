# Classify - Production Deployment Guide (Hostinger VPS)

> **Optimized for Hostinger Docker Manager** - Fast updates with minimal downtime

This guide covers deploying Classify on Hostinger VPS with Docker + Traefik.

---

## 📦 Architecture Overview

```
Internet → Traefik (Port 80/443) → App Container (Port 5000)
                                 ↓
                          PostgreSQL + Redis
```

**Containers:**
- `<project>_app` - Express.js backend + React frontend (5000)
- `<project>_db` - PostgreSQL 15 (5432)
- `<project>_redis` - Redis 7.2 (6379)
- `<project>_traefik` - Reverse proxy (host ports from `.env`)

## Shared Server Isolation (No Conflict)

When your VPS already runs other Docker projects, always isolate this stack:

```bash
# .env (example)
COMPOSE_PROJECT_NAME=classify_prod
CLASSIFY_TRAEFIK_BIND_IP=127.0.0.1
TRAEFIK_HTTP_PORT=18080
TRAEFIK_HTTPS_PORT=18443
POSTGRES_HOST_PORT=5434
MINIO_API_PORT=9102
MINIO_CONSOLE_PORT=9101
```

Run with project isolation:

```bash
docker compose -p classify_prod up -d
```

Notes:
- Do not bind `80/443` unless this project owns those ports.
- If another Traefik/Nginx already owns `80/443`, keep this stack on custom ports and route externally.
- Keep `CLASSIFY_TRAEFIK_BIND_IP=127.0.0.1` on shared hosts so Classify Traefik is isolated from public interfaces.
- Avoid fixed `container_name`; Compose project naming already provides unique container names.

### Edge Traefik Integration (Shared Host, No Port Conflict)

Use this when another Traefik stack owns public `80/443` and Classify runs internally on `127.0.0.1:18080/18443`.

1. Connect the edge Traefik container to Classify network:

```bash
docker network connect classify_classify-network edge_traefik || true
```

2. Enable file provider on edge Traefik and mount a dynamic directory:

```text
--providers.file.directory=/etc/traefik/dynamic
--providers.file.watch=true
```

Example mount:

```text
/opt/edge/dynamic:/etc/traefik/dynamic:ro
```

3. Copy the template file from this repo to the mounted dynamic directory:

```bash
mkdir -p /opt/edge/dynamic
cp ops/traefik/edge-classify.dynamic.yml /opt/edge/dynamic/classify.yml
docker restart edge_traefik
```

4. Verify public routing:

```bash
curl -I https://classi-fy.com/
curl -I https://classi-fy.com/api/health
```

Expected:
- `/` returns 200 or 3xx depending on app route policy.
- `/api/health` returns 200.

---

## 🚀 Quick Start (First Deployment)

### 0. Automated First Run (Recommended)

From the repo directory on the VPS:

```bash
bash ./scripts/hostinger-first-run.sh \
   --project-dir /opt/classify \
   --repo-url https://github.com/your-org/your-repo.git \
   --branch main \
   --compose-project-name classify_main
```

Notes:
- Adjust `--repo-url` and `--branch` for your repo.
- The script creates `.env`, generates missing secrets, removes duplicate env keys, builds containers, runs migrations, and verifies health.

### 1. VPS Prerequisites

```bash
# SSH into your Hostinger VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Install Docker (if not installed)
curl -fsSL https://get.docker.com | sh

# Install Docker Compose plugin
apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

### 2. Clone Repository

```bash
# Navigate to project directory
cd /docker/classitest

# Clone repository (or pull latest if already exists)
git clone https://github.com/promnes/classitest.git .
# OR if already cloned:
git pull origin main
```

### 3. Configure Environment

```bash
# Copy example environment file
cp .env.production.example .env

# Generate secure secrets
echo "JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')"
echo "SESSION_SECRET=$(openssl rand -base64 64 | tr -d '\n')"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')"

# Edit .env file
nano .env
```

**Required Variables:**
```env
# Database
POSTGRES_USER=classify_user
POSTGRES_PASSWORD=<generated_password>
POSTGRES_DB=classify_db

# Security
JWT_SECRET=<generated_jwt_secret>
SESSION_SECRET=<generated_session_secret>

# Admin Account
ADMIN_EMAIL=admin@classi-fy.com
ADMIN_PASSWORD=<strong_password>

# Domain (for SSL)
APP_URL=https://classi-fy.com

# In-home shipping connector
INHOME_SHIPPING_ENABLED=true
INHOME_SHIPPING_BASE_URL=https://inhome.classi-fy.com
INHOME_SHIPPING_API_KEY=<inhome_api_key>
INHOME_SHIPPING_TIMEOUT_MS=5000
INHOME_SHIPPING_WEBHOOK_SECRET=<shared_secret>
INHOME_ALLOW_PRIVATE_HOSTS=false
PUBLIC_BASE_URL=https://classi-fy.com
```

In-home readiness notes:
- `inhome.classi-fy.com` must have a valid DNS record before enabling connector in production.
- Keep `INHOME_ALLOW_PRIVATE_HOSTS=false` in production.
- If DNS is not ready, keep connector disabled to avoid checkout sync failures.

### 4. Start Application

```bash
# Build and start all containers (isolated project name)
docker compose -p classify_prod up -d

# Check container status
docker compose -p classify_prod ps

# View logs
docker compose -p classify_prod logs -f app
```

### 5. Verify Deployment

```bash
# Check health endpoint
curl http://localhost:5000/api/health

# Should return: {"success": true, "message": "OK"}

# Check in-home webhook endpoint
curl -I https://classi-fy.com/api/store/inhome/webhook

# Check in-home DNS
nslookup inhome.classi-fy.com
```

**Access your app:**
- HTTP: `http://your-vps-ip`
- HTTPS (after DNS): `https://classi-fy.com`

---

## ⚡ Fast Updates (After First Deployment)

### Method 1: Quick Update (Recommended)

```bash
cd /docker/classitest

# Pull latest code and rebuild
./scripts/deploy-fast.sh

# Or specify branch
./scripts/deploy-fast.sh dev

# Environment changes only (no rebuild)
./scripts/deploy-fast.sh --no-build
```

**What it does:**
1. Pull latest code from GitHub
2. Rebuild app container with layer caching
3. Restart services with zero downtime
4. Verify health check
5. Show deployment status

### Method 2: Manual Update

```bash
cd /docker/classitest

# Pull latest code
```bash
# View all containers
docker compose ps

# View real-time logs
docker compose logs -f

# View app logs only
docker logs -f classify-app

# Check resource usage
docker stats

# Check container health
docker inspect classify-app | grep -A 10 "Health"
```

---

## 🔄 Database Management

### Apply Schema Changes

```bash
# After pulling new code with schema changes
docker compose exec app npm run db:push
```

### Backup Database

```bash
# Create backup
docker compose exec db pg_dump -U classify_user classify_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
cat backup_20250113_120000.sql | docker compose exec -T db psql -U classify_user classify_db
```

### Reset Database (⚠️ DATA LOSS)

```bash
# Stop containers
docker compose down

# Remove volumes
docker volume rm classitest_postgres_data

# Start fresh
docker compose up -d
```

---

## 🛡️ Security Best Practices

1. **Use Strong Secrets:**
   ```bash
   # Generate new secrets periodically
   openssl rand -base64 64
   ```

2. **Keep System Updated:**
   ```bash
   apt update && apt upgrade -y
   docker compose pull
   docker compose up -d
   ```

3. **Enable Firewall:**
   ```bash
   ufw allow 22/tcp    # SSH
   ufw allow 80/tcp    # HTTP
   ufw allow 443/tcp   # HTTPS
   ufw enable
   ```

4. **Review Logs Regularly:**
   ```bash
   docker compose logs --since 24h | grep -i error
   ```

---

## 📈 Performance Optimization

### Layer Caching Benefits

The optimized `Dockerfile` uses multi-stage builds:
- **Stage 1 (deps):** Cached unless `package.json` changes
- **Stage 2 (builder):** Cached unless source code changes
- **Stage 3 (runner):** Always fast (copies from previous stages)

**Result:** Updates take **~30 seconds** instead of **5+ minutes**

### Health Check Configuration

```yaml
# In docker-compose.yml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
  interval: 15s
  timeout: 10s
  retries: 5
  start_period: 60s
```

---

## 📝 Deployment Checklist

### Before First Deployment
- [ ] VPS provisioned with Ubuntu 24.04
- [ ] Docker + Docker Compose installed
- [ ] DNS A record pointing to VPS IP
- [ ] `.env` file configured with all secrets
- [ ] Ports 80, 443, 22 open in firewall

### For Every Update
- [ ] Code tested locally
- [ ] Database schema changes noted
- [ ] Environment variables updated (if needed)
- [ ] Backup created (if major changes)
- [ ] Deployment script executed: `./scripts/deploy-fast.sh`
- [ ] Health check verified: `curl http://localhost:5000/api/health`
- [ ] Logs checked: `docker logs classify-app --tail=50`

---

## 🆘 Emergency Rollback

```bash
cd /docker/classitest

# Option 1: Rollback to previous commit
git log --oneline -10  # Find previous commit hash
git checkout <commit_hash>
./scripts/deploy-fast.sh

# Option 2: Rollback to specific tag/branch
git checkout main  # or v1.0.0
./scripts/deploy-fast.sh

# Option 3: Restore from backup
docker compose down
docker volume rm classitest_postgres_data
docker compose up -d
# Then restore database backup
```

---

## 📞 Support

- **Documentation:** `/docs/`
- **Health Check:** `http://your-vps-ip:5000/api/health`
- **Logs:** `docker compose logs -f`
- **Container Status:** `docker compose ps`

---

## 🎯 Next Steps After Deployment

1. **Configure Domain SSL:**
   - Ensure DNS points to VPS
   - Traefik auto-generates Let's Encrypt certificates
   - Monitor: `docker logs classify-traefik`

2. **Setup Monitoring:**
   - Enable Portainer (optional): Port 9000
   - Configure log rotation
   - Setup uptime monitoring

3. **Configure Email/SMS:**
   - Add SMTP credentials or Resend API key
   - Add Twilio credentials for SMS OTP
   - Test OTP delivery

4. **Optimize Performance:**
   - Monitor with `docker stats`
   - Adjust resource limits in `docker-compose.yml`
   - Enable Redis caching

---

**Updated for Hostinger Docker Manager compatibility**
*Last updated: 2025-01-13*

1) Copy the production template:

```bash
cp .env.production.example .env
```

2) Generate secrets (run on the server):

```bash
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')"
echo "JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')"
echo "SESSION_SECRET=$(openssl rand -base64 64 | tr -d '\n')"
echo "ADMIN_PASSWORD=$(openssl rand -base64 24 | tr -d '\n')"
```

3) Edit `.env` and set **all required values**:

```dotenv
POSTGRES_USER=classify_user
POSTGRES_PASSWORD=PASTE_GENERATED_32_CHAR_SECRET
POSTGRES_DB=classify_db

JWT_SECRET=PASTE_GENERATED_64_CHAR_SECRET
SESSION_SECRET=PASTE_GENERATED_64_CHAR_SECRET

ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=PASTE_GENERATED_16_CHAR_SECRET

APP_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com
```

4) Optional providers (only if used):

```dotenv
SMTP_HOST=smtp.mail.hostinger.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=YOUR_EMAIL_PASSWORD
SMTP_FROM=Classify <noreply@yourdomain.com>

RESEND_API_KEY=

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_FROM_NUMBER=
SMS_PROVIDER=twilio
SMS_API_KEY=

STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
```

5) Final check before start:

```bash
grep -E "^(POSTGRES_PASSWORD|JWT_SECRET|SESSION_SECRET|ADMIN_EMAIL|ADMIN_PASSWORD|APP_URL|CORS_ORIGIN)=" .env
```

### 4) Build & Run
- Build images
- Start services with HTTPS compose

### 5) SSL
- Issue certificates with certbot
- Install certs in nginx/ssl
- Enable auto-renew

### 6) Database
- Ensure DB container is healthy
- Run migrations: npm run db:push
- Verify admin exists

### 7) Verify
- Health: /api/health
- Static: /index.html, /assets/*, /manifest.json, /sw.js
- Auth + OTP smoke flow

### 8) Hardening
- Change default passwords
- Set CORS_ORIGIN
- Enable firewall
- Set backups and log monitoring
---

## Production Setup (HTTPS with SSL)

### Step 1: Install Certbot

```bash
apt update
apt install certbot -y
```

### Step 2: Get SSL Certificate

```bash
# Stop any running containers
docker compose down

# Get certificate (replace yourdomain.com)
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Create SSL directory and copy certificates
mkdir -p nginx/ssl
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
chmod 600 nginx/ssl/*.pem
```

### Step 3: Start with HTTPS

```bash
# Use the main docker-compose.yml (includes SSL)
docker compose up -d
```

### Step 4: Auto-Renew SSL

```bash
# Add to crontab
crontab -e

# Add this line:
0 3 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/yourdomain.com/*.pem /path/to/classify/nginx/ssl/ && docker compose restart nginx
```

---

## Environment Variables Reference

### Required (docker compose will fail without these)

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_USER` | Database username | `classify_user` |
| `POSTGRES_PASSWORD` | Database password (32+ chars) | `openssl rand -base64 32` |
| `JWT_SECRET` | JWT signing key (64+ chars) | `openssl rand -base64 64` |
| `SESSION_SECRET` | Session encryption key (64+ chars) | `openssl rand -base64 64` |
| `ADMIN_EMAIL` | Admin login email | `admin@yourdomain.com` |
| `ADMIN_PASSWORD` | Admin login password (16+ chars) | `openssl rand -base64 24` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `RESEND_API_KEY` | Resend API key (email) | - |
| `RESEND_FROM` | Resend from address | - |
| `SMTP_HOST` | Email server | - |
| `SMTP_PORT` | Email port | `587` |
| `SMTP_USER` | Email username | - |
| `SMTP_PASSWORD` | Email password | - |
| `CORS_ORIGIN` | Allowed origins | `*` |
| `LOG_LEVEL` | Log verbosity | `info` |
| `OTP_ALERT_THRESHOLD` | OTP alert threshold per minute | `15` |
| `SMS_PROVIDER` | SMS provider | `twilio` |
| `SMS_API_KEY` | SMS API key | - |
| `TWILIO_FROM_NUMBER` | Twilio phone number | - |

### CORS configuration

- `CORS_ORIGIN` accepts a comma-separated allowlist (e.g. `https://app.example.com,https://admin.example.com`).
- In development, unknown `/api/*` routes return the JSON 404 contract instead of the SPA to match production behavior.

---

## Getting Test Credentials (Gmail SMTP + SMS)

### Gmail SMTP (App Password)
1. Enable 2‑Step Verification on your Google Account.
2. Create an App Password for “Mail”.
3. Use these values in your `.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM="Classify <your@gmail.com>"
```

### SMS (Twilio Test Credentials)
1. Create a Twilio account.
2. Use **Test** Account SID/Auth Token from the Twilio console.
3. Use a Twilio **Test** phone number.
4. Set these values in your `.env`:

```
SMS_PROVIDER=twilio
SMS_API_KEY=your_twilio_auth_token
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+10000000000
```

---

## Common Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f app
docker compose logs -f nginx
docker compose logs -f db

# Restart a service
docker compose restart app

# Rebuild after code changes
docker compose build --no-cache
docker compose up -d

# Enter container shell
docker compose exec app sh
docker compose exec db psql -U classify_user -d classify_db

# Check database
docker compose exec db psql -U classify_user -d classify_db -c "SELECT * FROM admins LIMIT 1;"

# Full reset (WARNING: destroys data)
docker compose down -v
docker compose up -d
```

---

## Troubleshooting

### App not starting

```bash
# Check logs
docker compose logs app

# Common issues:
# - DATABASE_URL incorrect
# - JWT_SECRET not set
# - Port 5000 already in use
```

### Database connection failed

```bash
# Check if database is running
docker compose ps db

# Test connection
docker compose exec db pg_isready -U classify_user -d classify_db

# Check logs
docker compose logs db
```

### Nginx not responding

```bash
# Check nginx status
docker compose ps nginx

# Test config
docker compose exec nginx nginx -t

# Check logs
docker compose logs nginx
```

### SSL certificate issues

```bash
# Verify certificate files exist
ls -la nginx/ssl/

# Check file permissions
chmod 600 nginx/ssl/*.pem

# Test nginx config
docker compose exec nginx nginx -t
```

---

## Backup & Restore

### Backup Database

```bash
# Create backup
docker compose exec db pg_dump -U classify_user classify_db > backup_$(date +%Y%m%d).sql

# With compression
docker compose exec db pg_dump -U classify_user classify_db | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Restore Database

```bash
# From SQL file
cat backup.sql | docker compose exec -T db psql -U classify_user -d classify_db

# From compressed file
gunzip -c backup.sql.gz | docker compose exec -T db psql -U classify_user -d classify_db
```

### Backup Volumes

```bash
# Backup all data
docker run --rm -v classify_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
docker run --rm -v classify_app_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads_backup.tar.gz /data
```

---

## Performance Tuning

### Recommended profile (validated)

Set these values in `.env` (already wired into `docker-compose.yml`):

```env
NODE_CLUSTER_ENABLED=true
WEB_CONCURRENCY=4
DB_POOL_MAX=50
DB_POOL_MIN=5
DB_POOL_IDLE_TIMEOUT_MS=30000
DB_POOL_CONNECT_TIMEOUT_MS=10000
```

### High-throughput profile (optional)

Use this profile only after confirming stable CPU, memory, and PostgreSQL headroom:

```env
NODE_CLUSTER_ENABLED=true
WEB_CONCURRENCY=6
DB_POOL_MAX=70
DB_POOL_MIN=8
DB_POOL_IDLE_TIMEOUT_MS=30000
DB_POOL_CONNECT_TIMEOUT_MS=10000
```

Switching rule:

- Start with the recommended profile.
- Move to high-throughput only if P95/P99 stay stable and error rate remains near zero under load.

Container memory profile:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
  
  db:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

### Benchmark snapshot (current environment)

- Mixed workload (80/20 read/write): ~6.7k ops/s
- Sustained write benchmark: ~13.7k ops/s
- Error rate during benchmark: 0%

### Safe scaling steps

1. Increase `WEB_CONCURRENCY` by +1 and observe CPU, latency (P95/P99), and error rate.
2. Increase `DB_POOL_MAX` in small steps while keeping PostgreSQL below `max_connections` safety margin.
3. Keep changes if latency remains stable and error rate stays near zero.

### PostgreSQL tuning

Create `postgresql.conf`:

```bash
# Add to db service volumes:
# - ./postgresql.conf:/etc/postgresql/postgresql.conf

# postgresql.conf contents:
shared_buffers = 256MB
work_mem = 16MB
maintenance_work_mem = 128MB
effective_cache_size = 768MB
```

---

## Security Checklist

- [ ] Change default passwords
- [ ] Use SSL/HTTPS
- [ ] Set proper CORS_ORIGIN
- [ ] Enable firewall (ufw)
- [ ] Regular backups
- [ ] Keep Docker images updated
- [ ] Monitor logs for suspicious activity

```bash
# Basic firewall setup
ufw allow ssh
ufw allow http
ufw allow https
ufw enable
```

---

## Support

For issues:
1. Check logs: `docker compose logs -f`
2. Verify environment variables
3. Test health endpoint: `curl http://localhost:5000/api/health`
4. Check this documentation

---

*Last updated: January 2026*
