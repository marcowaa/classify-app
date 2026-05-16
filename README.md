# Classify — Kids Educational & Parental Control Platform 📱🎓

<div dir="rtl">

**كلاسيفاي** — منصة عربية متكاملة للرقابة الأبوية والتعليم، تساعد الآباء في إدارة رحلة تعلم أبنائهم من خلال المهام التعليمية والألعاب والمكافآت وشجرة النمو ومتابعة المدارس والمعلمين.

</div>

---

## 🔢 Project Scale | حجم المشروع

| Metric | Count |
|--------|-------|
| Database Tables | **137** |
| API Endpoints | **533+** |
| Client Pages | **53** |
| Components | **130+** |
| Route Files | **24** |
| Translation Keys | **1,700+** (3 locales) |
| Schema Indexes | **27** |

---

## 📚 Documentation | التوثيق

| Document | Purpose |
|----------|---------|
| [COMPLETE_OVERVIEW.md](COMPLETE_OVERVIEW.md) | Navigation & learning paths — Start here |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | 50+ common tasks with examples |
| [FULL_PROJECT_ANALYSIS.md](FULL_PROJECT_ANALYSIS.md) | Deep analysis from source (137 tables, 53 pages) |
| [PROJECT_BLUEPRINT.md](PROJECT_BLUEPRINT.md) | Complete system reference (150+ endpoints) |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System diagrams & flows (20+ visuals) |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Hostinger VPS deployment guide (Docker) |
| [docs/DEPLOYMENT_OPTIMIZATION.md](docs/DEPLOYMENT_OPTIMIZATION.md) | Performance benchmarks & optimization |
| [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) | Master index & cross-references |

---

## ✨ Features | الميزات

### 🔐 Authentication | المصادقة
- Parent registration with email/phone
- Unified multi-role auth card on `/parent-auth` (Parent / Teacher / School / Library)
- Social Login (Google, Facebook, Apple) — Circular icon buttons
- OTP Providers (Email/SMS) — Admin configurable via Resend & Twilio
- OTP verification (6 digits, 5 min expiry)
- JWT sessions with bcrypt password hashing
- Trusted device remembering (skip OTP)
- Child PIN login with parent approval
- Two-Factor Authentication (2FA) for parents
- Rate limiting on auth flows

### 👨‍👩‍👧‍👦 Parent Dashboard | لوحة الوالدين
- Child linking via QR code or unique code
- Task management with subjects (Classify tasks + custom + public marketplace tasks)
- Scheduled tasks with cancel option
- Daily/Weekly/Monthly progress reports
- E-commerce store with categories and filters
- Library store integration
- Wallet system with deposits and transfers
- Referral program (points per active referral)
- Growth tree tracking for children
- Task marketplace — browse & purchase teacher-made tasks
- Task cart system
- Parent profile with social links
- Inventory & product assignment to children

### 👧 Child Interface | واجهة الأطفال
- Animated task completion with feedback (Framer Motion)
- Educational games with points system (fullscreen, i18n, responsive)
- 3D Growth tree visualization (20 stages) with watering mechanic & draggable water jug
- Collapsible growth tree component
- Gift unlocking based on milestones
- Store browsing and wishlist
- Notifications center with push notifications (Web Push)
- Annual report (خصار سنوي)
- **Child Showcase Profile** — tabbed profile (Showcase / Friends / Notifications / Edit)
- Cover image & avatar upload with cropping
- Share profile via share code
- **Friendship system** — send/accept/reject friend requests, suggestions engine
- **Follow system** — one-directional follow for children, schools, and teachers
- **Search & Discover** — unified search across children, schools, teachers with filter tabs
- Follower/following counts in profile
- Achievement badges system
- Interests & bio customization

### 🏫 Schools System | نظام المدارس
- School registration & dashboard
- Teacher management (hiring, profiles, subjects)
- School posts with comments, likes, polls
- School reviews & ratings
- Teacher task marketplace (sell educational tasks)
- Teacher balances & withdrawal requests
- Student & teacher assignment
- School referral system
- School activity logs & analytics

### 📚 Library System | نظام المكتبات
- Library registration & dashboard
- Library product catalog
- Library referral system & daily sales tracking
- Library orders & invoices
- Library posts, comments, likes, reviews
- Library balances & withdrawal requests

### 🛡️ Admin Panel | لوحة الإدارة
- User management (parents, children, admins)
- Product and category management
- Subjects and template tasks (CRUD)
- Social Login Providers management
- OTP Providers management (Email/SMS settings)
- Referral tracking and statistics
- Ads management (target parents/children/all)
- Libraries management with referral system
- Schools & teachers management
- Growth tree settings (per-stage icons, reordering, custom uploads)
- Children leaderboard by growth level/speed
- Profit system with commission tracking
- SEO settings with meta tags
- Support settings (email, phone, WhatsApp, Telegram)
- Activity logs and wallet analytics
- Gift management
- Notification settings & task notification settings
- Mobile app download controls (show/hide APK, Google Play AAB, and PWA ZIP buttons on home/download pages)

### 🌐 Internationalization | التدويل
- Arabic (RTL), English (LTR), Portuguese support
- 1,700+ translation keys across 3 locales
- Language preference persistence
- i18n integration with react-i18next

---

## 🎮 Game Purchase & Upload Guide | دليل شراء ورفع الألعاب

This section helps non-programmer teams buy games that can be uploaded to the admin panel with minimal friction.

### Recommended Game Types (Buy These)

| Type | Buy Priority | Upload Ease | Notes |
|------|--------------|-------------|-------|
| HTML5 self-contained package (`index.html` + assets) | Highest | Very Easy | Best fit for direct upload and iframe usage |
| Construct 3 HTML5 export | High | Easy | Usually clean export for web/mobile touch |
| Phaser HTML5 game | High | Easy | Great performance and flexible assets |
| Godot HTML5 export | Medium | Medium | Works well when export is complete and optimized |
| Unity WebGL export | Medium | Medium/Hard | Works, but can be heavy and needs stricter testing |

### Must-Have Purchase Requirements (Send to Seller)

| Requirement | Why It Matters |
|------------|----------------|
| Delivery as one ZIP package | Easy single upload and archive process |
| `index.html` in ZIP root | Fast detection and launch |
| All files included (JS/CSS/images/audio/fonts) | Prevent missing asset failures |
| Relative paths only (no absolute local paths) | Ensures portability across environments |
| No backend required (no Node/PHP/Python) | Admin upload should work without server setup |
| Mobile touch support + responsive UI | Required for kids usage on phones/tablets |
| Works inside iframe | Required by child game player architecture |
| No mandatory external API keys | Avoid runtime failures and vendor lock |
| Commercial use + redistribution rights | Legal safety for production usage |
| Source files + final build both delivered | Future edits and quick fixes |

### Avoid Buying These (High Risk for Direct Upload)

| Type | Risk |
|------|------|
| APK/EXE/SWF only (no HTML5 build) | Cannot run in web iframe flow |
| Games requiring backend services | Breaks "upload only" workflow |
| Multiplayer real-time server-dependent games | Operational complexity and infra cost |
| DRM-locked or domain-locked web games | May fail after migration/upload |
| Games blocked from iframe embedding | Won't open in child games screen |

### Ready-to-Send Seller Brief (English)

```text
I need an HTML5 game delivered as a ZIP package with index.html at the root.
The build must be fully self-contained (all assets included), mobile touch-friendly,
responsive, and compatible with iframe embedding.
No backend or server setup should be required.
Please include both source files and final production build.
Commercial use and redistribution rights are required.
```

### 10-Point Pre-Purchase Checklist

| # | Check | Pass/Fail |
|---|-------|-----------|
| 1 | HTML5 ZIP provided | ☐ |
| 2 | `index.html` at root | ☐ |
| 3 | Runs locally without backend | ☐ |
| 4 | Touch controls work on mobile | ☐ |
| 5 | Responsive on phone + tablet | ☐ |
| 6 | Opens correctly inside iframe | ☐ |
| 7 | No mandatory third-party API keys | ☐ |
| 8 | No missing assets/errors in console | ☐ |
| 9 | Commercial redistribution license included | ☐ |
| 10 | Source files delivered with final build | ☐ |

### Operational Note

"Upload-only for every game in the world" is not technically guaranteed. The target should be high compatibility for supported HTML5 exports through standard packaging and validation.

---

## 🛠️ Tech Stack | البنية التقنية

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui (Radix) |
| Animations | Framer Motion |
| State | TanStack Query v5 |
| Routing | Wouter |
| Backend | Express.js + TypeScript |
| Database | PostgreSQL 14+ + Drizzle ORM |
| Auth | JWT + bcrypt + Social OAuth |
| Email | Resend API |
| SMS | Twilio (configurable) |
| Mobile | Capacitor (iOS/Android) |
| Deploy | Docker + Nginx + Hostinger VPS |
| Build | Vite (frontend) + esbuild (backend) |

---

## 📂 Project Structure | هيكل المشروع

```
classify/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── components/        # 130+ reusable UI components
│   │   │   ├── ui/            # shadcn components
│   │   │   ├── admin/         # Admin-specific components
│   │   │   ├── child/         # Child-specific components
│   │   │   ├── parent/        # Parent-specific components
│   │   │   └── ...
│   │   ├── pages/             # 53 page components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── contexts/          # React contexts (Theme, etc.)
│   │   ├── i18n/
│   │   │   └── locales/       # ar.json, en.json, pt.json
│   │   └── lib/               # Utility functions
│   └── public/                # Static assets
├── server/                    # Backend Express application
│   ├── routes/                # 24 API route files
│   │   ├── admin.ts           # Admin endpoints (166)
│   │   ├── child.ts           # Child endpoints (70)
│   │   ├── parent.ts          # Parent endpoints (63)
│   │   ├── school.ts          # School endpoints (40)
│   │   ├── teacher.ts         # Teacher endpoints (37)
│   │   ├── library.ts         # Library endpoints (35)
│   │   ├── auth.ts            # Auth endpoints (27)
│   │   ├── marketplace.ts     # Marketplace endpoints (18)
│   │   ├── follow.ts          # Follow system endpoints (13)
│   │   └── ...                # 15 more route modules
│   ├── services/              # Business logic services
│   ├── utils/                 # Helper utilities & rate limiters
│   └── ...
├── shared/
│   └── schema.ts              # Drizzle ORM schema (137 tables, 27 indexes)
├── migrations/                # Database migrations
├── nginx/                     # Nginx configuration
├── android/                   # Android project (Capacitor)
├── ios/                       # iOS project (Capacitor)
├── scripts/                   # Admin setup, deploy, env scripts
├── monitoring/                # Monitoring configuration
├── Dockerfile                 # Multi-stage Docker build (3-stage)
├── docker-compose.yml         # Docker Compose with nginx
├── deploy.sh                  # Deployment script for VPS
└── .env.example               # Environment template
```

---

## 🚀 Quick Start | البداية السريعة

### Development | التطوير

```bash
# Install dependencies
npm install

# Run development server (port 5000)
npm run dev

# Push database schema
npm run db:push

# Setup admin account
npm run admin:setup
```

### Production | الإنتاج

```bash
# Build for production
npm run build

# Start production server
NODE_ENV=production node dist/index.js
```

---

## 🐳 Docker Deployment | النشر عبر Docker

### Prerequisites
- Docker 20+
- Docker Compose 2+
- Ubuntu 24.04 LTS (Hostinger VPS recommended)

### Quick Deploy

```bash
# 1. Clone
git clone https://github.com/promnes/classitest.git
cd classitest

# 2. Configure
cp .env.example .env
nano .env

# 3. Start
docker compose up -d
```

### Fast Updates

```bash
# Quick update from main branch
./scripts/deploy-fast.sh

# Update from specific branch
./scripts/deploy-fast.sh dev

# Environment changes only (no rebuild)
./scripts/deploy-fast.sh --no-build
```

**Performance:**
- Code updates: **~30 seconds** (90% faster)
- Environment changes: **~5 seconds** (96% faster)
- Image size: **~150MB** (62% smaller)

### Docker Commands

```bash
docker compose up -d --build    # Build & start
docker compose logs -f app      # View logs
docker compose down             # Stop all
docker compose restart app      # Restart app
docker compose exec app npm run db:push  # DB migrations
```

---

## 🔑 Environment Variables | متغيرات البيئة

### Required

```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
RESEND_API_KEY=re_your_resend_api_key
```

### Optional

```env
# SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1234567890

# Social Login
GOOGLE_CLIENT_ID=xxx
FACEBOOK_APP_ID=xxx
APPLE_CLIENT_ID=xxx

# Cluster Mode
NODE_CLUSTER_ENABLED=true
WEB_CONCURRENCY=4
DB_POOL_MAX=50
```

---

## 🔌 API Overview | نقاط النهاية

### Public
- `GET /api/health` — Health check
- `GET /api/auth/social-providers` — Active social login providers

---

## 🌍 SEO & Crawlers | السيو والزواحف

- Canonical public auth entry is `/parent-auth`.
- Legacy role login pages (`/teacher-login`, `/school-login`, `/library-login`) are not listed in sitemap and are blocked from crawler indexing in `robots.txt`.
- Public crawler files are maintained in:
	- `client/public/sitemap.xml`
	- `client/public/robots.txt`
	- `client/public/llms.txt`
- Google Play and web distribution artifacts are available from public download flow:
	- Android APK
- Google Play AAB (`/apps/classi-fy-googleplay-latest.aab`)
- PWA ZIP (`/apps/classi-fy-pwa-latest.zip`)
- `GET /api/auth/otp-providers` — Active OTP providers

### Authentication
- `POST /api/auth/register` — Parent registration
- `POST /api/auth/login` — Parent login
- `POST /api/auth/send-otp` — Send OTP
- `POST /api/auth/verify-otp` — Verify OTP
- `POST /api/auth/logout` — Logout

### Child (70 endpoints)
- `GET /api/child/showcase` — Child showcase profile
- `GET /api/child/search?q=&type=` — Search children, schools, teachers
- `GET /api/child/discover` — Popular/trending entities
- `POST /api/child/follow` — Follow child/school/teacher
- `DELETE /api/child/follow` — Unfollow
- `GET /api/child/following` — Who I follow
- `GET /api/child/followers` — My followers
- `GET /api/child/follow-counts` — Follower/following counts
- `POST /api/child/friends/request` — Send friend request
- `GET /api/child/friends` — My friends list
- `GET /api/child/growth-tree` — Growth tree data
- `POST /api/child/water-tree` — Water the tree
- ... and 50+ more

### Parent (63 endpoints)
- `GET /api/parent/children` — List children
- `POST /api/parent/tasks` — Create task
- `GET /api/parent/wallet` — Wallet balance
- ... and 60+ more

### Admin (166 endpoints)
- Full platform management, analytics, settings

### School & Teacher (77 endpoints)
- School/teacher dashboards, posts, tasks, finances

### Library (35 endpoints)
- Library dashboard, products, referrals, finances

---

## 🧪 Test Tokens

```js
// Parent token (browser console on parent dashboard)
localStorage.getItem("token")

// Child token (browser console on child interface)
localStorage.getItem("childToken")
```

```bash
# Get child profile with token
curl -H "Authorization: Bearer <childToken>" http://127.0.0.1:5000/api/child/profile
```

---

## 👤 Admin Access

```
URL: /admin
```

```bash
# Setup or reset admin credentials
npm run admin:setup
```

Configure `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` before running setup. See [docs/ADMIN_CREDENTIALS.md](docs/ADMIN_CREDENTIALS.md) for details.

---

## 📈 Performance

### Docker Build
- 3-stage multi-stage build with aggressive layer caching
- First build: ~6 minutes | Code updates: ~30s | Env changes: ~5s

### Database
- 27 optimized indexes (unique + composite)
- Connection pooling with configurable pool size
- Mixed workload: **~6.7k ops/s** | Write throughput: **~13.7k ops/s**

### Caching
- TanStack Query with 5-minute staleTime
- Compression middleware | Static asset caching via Nginx
- Docker BuildKit caching for faster rebuilds

### Scalability
- Node.js cluster mode (configurable workers)
- Docker resource limits | Zero-downtime rolling updates

### Capacity Profiles

```bash
npm run env:profile:balanced    # Balanced (recommended)
npm run env:profile:high        # High-throughput
```

---

## 🔒 SSL Setup

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --webroot -w /var/www/certbot -d your-domain.com
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/
docker compose restart nginx
```

---

## 📊 Monitoring

```bash
curl http://localhost:5000/api/health   # Health check
docker compose ps                       # Container status
docker compose logs -f app              # App logs
```

| Tool | URL | Purpose |
|------|-----|---------|
| Portainer | `localhost:9000` | Docker management |
| pgAdmin | `localhost:5050` | Database management |
| Redis Commander | `localhost:8081` | Redis monitoring |
| Prometheus | `localhost:9090` | Metrics collection |
| Grafana | `localhost:3000` | Visual dashboards |
| Mailhog | `localhost:8025` | Email/OTP testing |

---

## 💾 Backup

```bash
# Backup database
docker compose exec db pg_dump -U classify classify > backup.sql

# Restore database
docker compose exec -T db psql -U classify classify < backup.sql
```

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

Copyright (c) 2026 Marco Abdallh
All Rights Reserved.

This software and its source code are the exclusive property of Marco Abdallh.
No permission is granted to use, copy, modify, merge, publish, distribute,
sublicense, or sell copies of this software, in whole or in part.

Unauthorized use of this software in any form is strictly prohibited.

---

<div dir="rtl">

**صُنع بـ ❤️ للآباء والأطفال والمدارس والمعلمين**

</div>
