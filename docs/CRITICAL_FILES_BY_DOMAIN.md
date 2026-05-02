# Critical Files by Domain — Reference Inventory
<!-- synced: copilot-instructions.md on 2026-03-19 16:00 UTC -->

**Purpose**: Master registry of files agents MUST read for each domain  
**Status**: 🟢 SYNCHRONIZED with copilot-instructions.md  
**Version**: 1.0  
**Last Updated**: 2026-03-19 16:00 UTC

---

## 📚 File Inventory by Domain

### 🔐 Authentication Domain
**When**: User login, registration, 2FA, OTP, tokens  
**Read These Files**:
- `server/routes/auth.ts` — All authentication endpoints + OTP logic
- `server/services/mailer.ts` — Email/OTP delivery implementation
- `shared/schema.ts` — parents table, otpCodes table, parentSessions table
- `.env.example` — Environment variables for SMTP, JWT secrets

**Critical Functions**:
- Register parent account
- Login with email/password
- OTP generation & verification
- JWT token issuing
- 2FA setup (if enabled)

---

### 👨‍👩‍👧‍👦 Family Structure Domain
**When**: Add/remove child, manage family relationships, parent-child validation  
**Read These Files**:
- `shared/schema.ts` — parents, children, parentChild tables
- `server/routes/family.ts` — Family management endpoints
- `server/routes/parent.ts` — Parent-specific operations
- `server/routes/child.ts` — Child profile & activity

**Critical Operations**:
- Create parent-child relationship
- Validate parent ownership of child
- Manage child permissions
- Track family hierarchy

---

### 🎮 Game System Domain
**When**: Anything game-related (new game, game fix, score validation, leaderboard)  
**Read These Files** (IN ORDER):
1. `docs/GAMES_MEMORY.md` — **START HERE**: Complete game architecture, patterns, known bugs
2. `client/public/games/` — All game files (HTML + Vanilla JS, iframe-based)
3. `client/src/pages/ChildGames.tsx` — Game listing UI + iframe loader
4. `server/routes/index.ts` — seedDefaultGames() function
5. `server/routes/child.ts` — POST /api/child/complete-game endpoint

**Critical Content**:
- Game setup & iframe communication
- Score validation & rewards
- Leaderboard calculation
- Game history tracking

---

### 🔔 Notifications Domain
**When**: Send notifications, track events, create alerts  
**Read These Files**:
- `server/notificationHandlers.ts` — Event handlers + notification templates
- `server/services/mailer.ts` — Email template rendering
- `shared/schema.ts` — notifications table + notification_types table
- `server/routes/parent.ts` — Parent notification endpoints

**Critical Operations**:
- Gift received notification
- Reward earned notification
- Child activity alerts
- Important family events

---

### 💳 Payments Domain
**When**: Deposit, withdraw, purchase, refund, payment gateway integration  
**Read These Files**:
- `server/routes/payments.ts` — Payment gateway handling + webhooks
- `server/routes/store.ts` — Store checkout + order management
- `shared/schema.ts` — Payment-related tables (parentPurchases, transactions, wallets)
- `server/routes/parent.ts` — Wallet operations

**Critical Tables**:
- parentWallet (balance tracking)
- parentPurchases (transaction history)
- libraryOrders (order details)
- libraryReturnRequests (return disputes)
- libraryBalances (merchant earnings & frozen amounts)

---

### 🛍️ Store & Marketplace Domain
**When**: Add products, manage inventory, process orders, handle returns  
**Read These Files**:
- `server/routes/store.ts` — Store listing, checkout, product filtering
- `server/routes/library.ts` — Library merchant products
- `server/routes/admin.ts` — Product moderation, approval workflow
- `shared/schema.ts` — products, libraryProducts, libraryReturnRequests tables
- `docs/GAMES_MEMORY.md` — If storing game-related products

**Critical Operations**:
- Product creation & moderation
- Multi-country filtering (EG, SA, AE, etc.)
- Multi-currency support (EGP, SAR, AED, etc.)
- Return request handling
- Merchant balance management

---

### 🌍 Internationalization (i18n) Domain
**When**: Add UI text, modify labels, support new languages  
**Game i18n**:
- `client/public/games/cat-kingdom-modules/i18n.js` — 25-language translation file
- Supported: ar, en, pt, es, fr, de, it, ru, zh, ja, ko, hi, tr, nl, sv, pl, uk, id, ms, th, vi, fa, ur, bn, sw

**App UI i18n**:
- `client/src/i18n/locales/*.json` — 10-language app UI translations
- Supported: ar, en, pt, es, fr, de, tr, ru, zh, hi

**Rules**:
- Game text: ALL 25 languages required
- App UI text: ALL 10 locales required
- No single-language text
- RTL testing required (ar, fa, ur)

---

### ⚙️ Admin Dashboard Domain
**When**: Admin features, moderation, configuration, analytics  
**Read These Files**:
- `server/routes/admin.ts` — All admin endpoints
- `client/src/pages/AdminDashboard.tsx` — Admin UI with tabs
- `docs/SECURITY_AUDIT.md` — Admin access control rules
- `shared/schema.ts` — Admin-specific tables (appSettings, adminAuditLogs)

**Critical Functions**:
- Product moderation (approve/reject products)
- Admin user management
- Settings configuration
- Analytics dashboards
- Support ticket management

---

### 🔒 Security Domain
**When**: Authentication, authorization, encryption, rate limiting, audit trails  
**Read These Files** (IN ORDER):
1. `.github/copilot-instructions.md` — Security absolutes (THIS FILE)
2. `docs/SECURITY_AUDIT.md` — Vulnerability tracking & fixes
3. `server/routes/auth.ts` — Auth security implementation
4. `server/middleware/authentication.ts` — JWT verification + role checking

**Critical Rules**:
- Parent-child ownership validation REQUIRED before any child operation
- Rate limiting on auth endpoints
- No secrets in logs
- Child tokens: read-only
- Cascade delete for parent-child relationships

---

### 📊 Performance & Database Domain
**When**: Performance issues, database optimization, N+1 queries, indexing  
**Read These Files**:
- `docs/PERFORMANCE_HOTSPOTS.md` — Known N+1 queries + index recommendations
- `shared/schema.ts` — Table definitions + existing indexes
- `drizzle.config.ts` — Database configuration
- Specific route files where performance issues occur

**Critical Concepts**:
- Batch queries to prevent N+1
- Index creation & validation
- Query optimization patterns
- Connection pooling

---

### 🚀 Deployment Domain
**When**: Build, deploy, environment setup, production configuration  
**Read These Files**:
- `vite.config.ts` — Frontend build configuration
- `server/index.ts` — Backend entry point + middleware
- `server/vite.ts` — Development server configuration
- `docker-compose.yml` — Local development environment
- `Dockerfile` — Production image
- `docs/DEPLOYMENT_CHECKLIST.md` — Pre-deployment requirements

**Critical Configuration**:
- Build output paths (dist/public for frontend)
- Runtime port (5000)
- Static asset serving
- SPA fallback rules
- CORS configuration

---

## 📋 File Access Patterns

### Pattern 1: Quick Lookup
**Time**: < 1 min  
**Use**: When you know exactly what you're looking for
```
Domain → Read 1-2 files → Find answer
```

### Pattern 2: Deep Dive (Required for Complex Tasks)
**Time**: 5-10 min  
**Use**: When behavior is unclear or you're making changes
```
1. Start with domain header files (architecture)
2. Read implementation files (actual code)
3. Check schema.ts for data structures
4. Verify against documentation
5. Cross-check rate limiting if needed
```

### Pattern 3: Verification (Before Every Commit)
**Time**: 3-5 min  
**Use**: Ensure your change doesn't violate rules
```
1. Identify affected domains
2. Re-read copilot-instructions relevant section
3. Check linked documentation files
4. Verify consistency
```

---

## 🔄 Sync Information

**Source**: `.github/copilot-instructions.md` → Section "CRITICAL FILES BY DOMAIN"  
**Maintained By**: Classify Engineering  
**Sync Frequency**: Real-time (when domains change)  
**Last Sync**: 2026-03-19 16:00 UTC  

**If you add a new domain:**
1. Update `.github/copilot-instructions.md`
2. Update this file to add new domain section
3. Link related files in same commit

---

**Version**: 1.0  
**Status**: 🟢 ACTIVE & SYNCHRONIZED  
**Next Review**: 2026-04-19 (30 days)
