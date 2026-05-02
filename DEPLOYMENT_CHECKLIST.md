# ✅ CLASSIFY - Development & Deployment Checklist
**Complete workflow verification guides**

---

## 🚀 Pre-Deployment Checklist

### 📋 Code Quality (Before Push)

- [ ] **Tests passing**
  ```bash
  npm test
  npm run build
  ```
  - ✅ No TypeScript errors
  - ✅ No console errors in build output
  - ✅ All test cases pass

- [ ] **Linting clean**
  ```bash
  npm run lint
  ```
  - ✅ No ESLint errors or warnings
  - ✅ Proper import ordering
  - ✅ No unused variables

- [ ] **Code review completed**
  - ✅ 2+ approvals on PR
  - ✅ Comments resolved
  - ✅ Conflicts merged

- [ ] **Commits are clean**
  - ✅ Meaningful commit messages
  - ✅ Atomic commits (one feature per commit)
  - ✅ No WIP or debug commits

### 🔐 Security Audit (Before Production)

- [ ] **Secrets checked**
  ```bash
  git log --all -S "PASSWORD\|API_KEY\|SECRET" --name-only
  ```
  - ✅ No passwords in code
  - ✅ No API keys exposed
  - ✅ All secrets in .env

- [ ] **Dependencies audited**
  ```bash
  npm audit
  ```
  - ✅ No critical vulnerabilities
  - ✅ High/Medium vulnerabilities patched
  - ✅ Outdated packages updated

- [ ] **SQL injection protected**
  - ✅ All queries via Drizzle ORM
  - ✅ No string interpolation in SQL
  - ✅ Input validation on all endpoints

- [ ] **XSS prevention**
  - ✅ HTML escaped in React
  - ✅ Content-Security-Policy headers set
  - ✅ No dangerouslySetInnerHTML usage

- [ ] **Authentication secure**
  - ✅ Passwords hashed with bcrypt
  - ✅ JWT tokens signed with secret
  - ✅ 2FA enabled for admins
  - ✅ Rate limiting on auth endpoints

### 📊 Database (Before Release)

- [ ] **Schema is current**
  ```bash
  npm run db:push
  ```
  - ✅ All migrations applied
  - ✅ Schema versions match code
  - ✅ Indexes created

- [ ] **Data integrity**
  - ✅ Foreign keys enforced
  - ✅ Unique constraints checked
  - ✅ NULL constraints verified

- [ ] **Backup created**
  ```bash
  # Via pgAdmin or CLI
  pg_dump $DATABASE_URL > backup-$(date +%s).sql
  ```
  - ✅ Latest backup stored safely
  - ✅ Restore tested
  - ✅ File permissions correct

### 🏗️ Infrastructure (Before Deploy)

- [ ] **Docker builds cleanly**
  ```bash
  docker-compose build
  ```
  - ✅ No build errors
  - ✅ No warnings
  - ✅ Image sizes reasonable

- [ ] **Docker Compose valid**
  ```bash
  docker-compose config
  ```
  - ✅ No YAML syntax errors
  - ✅ All services defined
  - ✅ Ports not conflicting

- [ ] **Environment configured**
  - ✅ .env file complete
  - ✅ All required variables set
  - ✅ Sensitive values from secure source

- [ ] **Notifications readiness gate passed**
  ```bash
  npm run check-notifications:strict
  ```
  - ✅ VAPID keys configured for web push
  - ✅ FCM credentials configured for mobile push
  - ✅ Android `google-services.json` present
  - ✅ iOS `GoogleService-Info.plist` present (for iOS builds)

- [ ] **SSL certificates valid**
  - ✅ Traefik cert resolver configured
  - ✅ Let's Encrypt email set
  - ✅ Domain DNS points to server

### 📝 Documentation (Before Release)

- [ ] **README updated**
  - ✅ Installation instructions clear
  - ✅ Configuration documented
  - ✅ Troubleshooting tips included

- [ ] **API documentation current**
  - [ ] All endpoints listed
  - [ ] Request/response examples shown
  - [ ] Error codes documented

- [ ] **Changelog updated**
  - [ ] New features listed
  - [ ] Bug fixes documented
  - [ ] Breaking changes noted

---

## 🔄 Local Development Workflow

### ⚙️ Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/yourusername/classiv3.git
cd classiv3

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env with local values

# 4. Database setup
npm run db:push

# 5. Seed data (optional)
npm run db:seed

# 6. Start dev server
npm run dev

# 7. Verify health
curl http://localhost:5000/api/health
# Should respond: { status: "healthy" }
```

- ✅ Backend runs at http://localhost:5000
- ✅ Frontend runs at http://localhost:3000 (Vite dev server)
- ✅ Database connected
- ✅ Redis connected (if used)

### 🔄 Feature Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/add-new-feature

# 2. Make changes to code
# Edit files, test locally

# 3. Run linter
npm run lint
npm run lint --fix  # Auto-fix issues

# 4. Test changes
npm run test
npm run test:watch  # Continuous testing

# 5. Build to verify
npm run build
npm run build:backend

# 6. Commit changes
git add .
git commit -m "feat: add new feature - description"

# 7. Push to GitHub
git push origin feature/add-new-feature

# 8. Create Pull Request
# Go to GitHub and open PR

# 9. After review + approval, merge
git checkout main
git pull origin main
git merge feature/add-new-feature
git push origin main
```

### 🧪 Testing Workflow

```bash
# Unit Tests
npm run test

# Integration Tests
npm run test:integration

# E2E Tests
npm run test:e2e

# Coverage Report
npm run test:coverage

# Current Coverage:
# - Statements: 85%
# - Branches: 90%
# - Functions: 85%
# - Lines: 85%
```

---

## 🚢 Production Deployment

### ✅ Pre-Deployment Verification

```bash
# 1. Check all systems green
npm run check:all

# 2. Verify build output
ls -lh dist/
ls -lh dist/public/

# 3. Test Docker build
docker-compose build

# 4. Test health endpoints
docker-compose up -d
sleep 5
curl http://localhost:5000/api/health
curl http://localhost:5000/api/health/deep
```

- ✅ Build succeeds with no errors
- ✅ All files present in dist/
- ✅ Docker images build cleanly
- ✅ Health checks pass

### 🚀 Deploy to Production

#### Via Docker Compose (VPS)

```bash
# 1. Connect to VPS
ssh user@srv1118737.hstgr.cloud

# 2. Navigate to project
cd /home/classitest/projects/classiv3

# 3. Backup current state
git stash  # Save any uncommitted changes
docker-compose down

# 4. Pull latest code
git fetch origin
git checkout main
git pull origin main

# 5. Update environment if needed
# nano .env
# Update ADMIN_EMAIL, ADMIN_PASSWORD, etc.

# 6. Sync admin credentials
npm run admin:setup

# 7. Apply database migrations
npm run db:push

# 8. Build all containers
docker-compose build

# 9. Start all services
docker-compose up -d

# 10. Verify all running
docker-compose ps
# All containers should show "Up"

# 11. Check health
sleep 5
curl -i https://app.classify.app/api/health

# 12. Monitor logs
docker-compose logs -f classiv3-app classiv3-db

# 13. Verify monitoring tools
# Portainer: https://app.classify.app/portainer/
# Grafana: https://app.classify.app/grafana/
# pgAdmin: https://app.classify.app/pgadmin/
```

- ✅ All containers started
- ✅ Health endpoint responds 200
- ✅ Database migrations applied
- ✅ Monitoring UI accessible

#### Via Kubernetes (Future)

```bash
# 1. Build images and push to registry
docker build -t gcr.io/project/classiv3-app:latest .
docker push gcr.io/project/classiv3-app:latest

# 2. Update deployment manifests
# Update kubernetes/deployment.yaml with new image tag

# 3. Apply to cluster
kubectl apply -f kubernetes/

# 4. Verify deployment
kubectl get pods -w
kubectl get svc
kubectl logs -f deployment/classiv3-app

# 5. Check ingress
kubectl get ingress
curl https://classification.example.com/api/health
```

### 🔧 Post-Deployment Checks

```bash
# 1. Verify services
curl https://app.classify.app/api/health
# Response: { status: "healthy" }

curl https://app.classify.app/api/health/deep
# Check: database, redis, storage all "connected"

# 2. Check database
docker-compose exec classiv3-db psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT COUNT(*) FROM parents;"

# 3. Verify monitoring
docker-compose exec classiv3-app curl -s http://prometheus:9090/api/v1/targets | jq '.'

# 4. Test key workflows
# Via curl or Postman:
# - POST /api/auth/register
# - POST /api/auth/login
# - GET /api/family/children
# - POST /api/tasks

# 5. Monitor error logs
docker-compose logs --tail 100 classiv3-app | grep -i error

# 6. Check resource usage
docker stats --no-stream
# Verify: no container using >80% resources

# 7. SSL certificate check
curl -I https://app.classify.app
# Verify: SSL certificate valid, no warnings
```

✅ **All systems operational**

---

## 🚨 Incident Response

### 🔴 Critical Issue: App Not Starting

```bash
# 1. Check status
docker-compose ps
# Look for: "Exited" status

# 2. View error logs
docker-compose logs classiv3-app

# 3. Common issues:
# - Wrong database URL → Check .env
# - Port already in use → Check ports: lsof -i :5000
# - Out of memory → Check: free -h
# - Missing dependencies → npm install

# 4. Restore backup (if database issue)
docker-compose down
# Restore database from backup
docker-compose up -d
```

### 🟠 Warning: Slow Performance

```bash
# 1. Check database
docker-compose exec classiv3-db psql -U postgres
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
# Identify slow queries

# 2. Check Redis
docker-compose exec classiv3-redis redis-cli
MONITOR  # Watch all operations
INFO memory  # Check memory usage

# 3. Check app logs
docker-compose logs --tail 100 classiv3-app | grep slow

# 4. Scale up resources if needed
# Update docker-compose.yml:
# services:
#   classiv3-app:
#     deploy:
#       resources:
#         limits:
#           cpus: '2'
#           memory: 4G

docker-compose up -d
```

### 🟡 Warning: Disk Space Low

```bash
# 1. Check disk usage
df -h
# If <10% available: URGENT

# 2. Clean Docker data
docker system prune -a  # WARNING: Removes unused everything
# Or more selective:
docker image prune -a --filter "until=72h"

# 3. Clean logs
docker-compose logs | head -20M > /tmp/old-logs-backup
# Then configure log rotation in docker-compose.yml:
# logging:
#   driver: "json-file"
#   options:
#     max-size: "10m"
#     max-file: "3"

docker-compose restart

# 4. Clean old backups
ls -lht backups/ | tail -n +10 | awk '{print $NF}' | xargs rm
```

### 🔴 Critical: Database Connection Lost

```bash
# 1. Check with 
docker-compose exec classiv3-db pg_isready
# Should respond: "accepting connections"

# 2. If not responding:
docker-compose restart classiv3-db

# 3. If still failing:
docker-compose logs classiv3-db

# 4. If needed, restore from backup:
# Stop app (don't lose queries)
docker-compose stop classiv3-app

# Restore backup
docker-compose exec classiv3-db psql -U postgres < backup-*.sql

# Restart
docker-compose up -d
```

---

## 🔍 Monitoring & Alerts

### 📊 Key Metrics to Monitor

```
Performance Thresholds:
├─ API Response Time: < 500ms (p95)
├─ Database Query Time: < 100ms (p95)
├─ Redis Response Time: < 10ms (p95)
├─ Memory Usage: < 80% of limit
├─ CPU Usage: < 70% sustained
├─ Disk Usage: > 20% free space
├─ Error Rate: < 0.1%
├─ Uptime: > 99.9%
└─ DB Connection Pool: > 20% available

Alert Rules:
├─ IF response_time > 1000ms for 5min → Notify
├─ IF error_rate > 1% for 5min → Notify
├─ IF memory > 90% → Notify
├─ IF disk_free < 10% → Notify CRITICAL
├─ IF app_status = down for 1min → Notify CRITICAL
└─ IF ssl_cert expires < 30 days → Notify
```

### 🔔 Alert Channels

```bash
# 1. Slack Integration
# Configure in Grafana:
# Alerting → Notification channels
# Add Slack webhook URL
# Test: Send a test notification

# 2. Email Alerts
# Configure SMTP in .env:
# SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
# Alerts to: devops@classify.app

# 3. SMS Alerts (Critical only)
# Twilio integration for critical failures
# Alert to: +966501234567

# 4. Status Page
# UpdateLog/Status.io integration
# Public: status.classify.app
# Maintains uptime record
```

---

## 📋 Release Checklist

### 🎯 Before Release Tag

- [ ] **Version numbers updated**
  - [ ] package.json: version x.y.z
  - [ ] CHANGELOG.md: entry for x.y.z
  - [ ] docs/VERSION.md: updated

- [ ] **Changelog complete**
  - [ ] Features listed
  - [ ] Bug fixes documented
  - [ ] Breaking changes noted
  - [ ] Migration guide if needed

- [ ] **Tests passing**
  - [ ] `npm test` → all green
  - [ ] `npm run build` → no errors
  - [ ] docker build → succeeds

- [ ] **Documentation updated**
  - [ ] README.md current
  - [ ] API docs updated
  - [ ] Migration docs if needed

- [ ] **Final approval**
  - [ ] Tech lead approved
  - [ ] Product owner signed off
  - [ ] Security reviewed

### 🏷️ Create Release

```bash
# 1. Tag release
git tag -a v2.0.0 -m "Release v2.0.0: Add gift system"

# 2. Push tags
git push origin v2.0.0

# 3. GitHub generates release page
# (Optional: add release notes via web UI)

# 4. Build release artifacts
npm run build
docker build -t classiv3:v2.0.0 .

# 5. Push to registry
docker tag classiv3:v2.0.0 gcr.io/project/classiv3:v2.0.0
docker push gcr.io/project/classiv3:v2.0.0

# 6. Update main branch
git checkout main
git pull origin main
```

### ✅ Post-Release

- [ ] **Monitor for issues**
  - [ ] Error rate normal?
  - [ ] Response times acceptable?
  - [ ] No database migrations pending?
  - [ ] All services healthy?

- [ ] **User communication**
  - [ ] Release notes sent
  - [ ] Known issues documented
  - [ ] Support team notified

- [ ] **Archive maintenance**
  - [ ] Old docker images deleted
  - [ ] Old database backups compressed
  - [ ] Logs archived

---

## 🔒 Security Maintenance

### 📅 Monthly Tasks

- [ ] **Dependency updates**
  ```bash
  npm outdated
  npm update
  npm audit fix
  ```

- [ ] **Security audit**
  ```bash
  npm audit
  # Fix any high/critical vulnerabilities
  ```

- [ ] **Access review**
  - [ ] Remove inactive accounts
  - [ ] Rotate API keys
  - [ ] Review admin access logs

- [ ] **Backup verification**
  - [ ] Test database restore
  - [ ] Test file recovery
  - [ ] Verify backup integrity

### 🔐 Quarterly Tasks

- [ ] **Penetration testing**
  - [ ] Test authentication
  - [ ] Test authorization
  - [ ] Test input validation

- [ ] **SSL certificate renewal**
  - [ ] Check expiry: `echo | openssl s_client -servername app.classify.app -connect app.classify.app:443 2>/dev/null | openssl x509 -noout -dates`
  - [ ] Renew if < 30 days

- [ ] **Disaster recovery drill**
  - [ ] Practice full recovery
  - [ ] Time the process
  - [ ] Document any issues

---

## 📞 Support Contacts

```
Escalation Path:
├─ Level 1: On-call engineer
├─ Level 2: Team lead
├─ Level 3: CTO
└─ Level 4: Executive (if system down > 1 hour)

Contact List:
├─ Slack: #incidents
├─ PagerDuty: classify-on-call
├─ Email: devops@classify.app
└─ Phone: [Emergency number]

On-Call Schedule:
├─ Weekly rotation
├─ 24/7 coverage
├─ 30-minute response SLA
└─ 1-hour resolution SLA
```

---

**Last Updated:** January 2025  
**Version:** 1.0  
**Status:** ✅ Complete Deployment Documentation
