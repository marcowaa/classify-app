# 🗺️ Comprehensive Routes Map — Security & Performance Analysis
## Classify Platform (March 2026 - FINAL)

**خريطة المسارات الشاملة - تحليل أمان وأداء**

**Last Updated**: March 19, 2026 (v2.1)  
**Status**: ✅ Complete with Return/Refund System, Product Moderation, Multi-Country Support  
**Scope**: 95+ Routes | 25+ Rate Limiters | 6 Auth Flows | 8 Vulnerabilities  

---

## 📊 Executive Summary

| Metric | Count | Status |
|--------|-------|--------|
| **Total Routes Documented** | 95+ | ✅ Complete |
| **Rate Limiters** | 25 | ✅ Comprehensive |
| **Auth Flows** | 6 | ✅ Mapped |
| **Admin RBAC Roles** | 6+ | ✅ Defined |
| **Security Vulnerabilities** | 8 | ⚠️ Identified |
| **Performance Hotspots** | 12 | 🔴 Flagged |
| **Database Tables** | 80+ | ✅ Reviewed |

**New in v2.1**:
- ✨ Product Moderation System (library + merchant products)
- ✨ Return/Refund Request Tracking (libraryReturnRequests table)
- ✨ Multi-Country & Currency Support (displayCountries, displayCurrencies)
- ✨ Payment Method Categorization (manual, egyptian_gateways, global, google)
- ✨ Profile Update Security (currentPassword validation)
- ✨ Sticker Media Upload Support (new upload purpose)
- ✨ Home Page Age Prompt System
- ✨ Merchant Froze Balance System (return requests)

---

## 🔐 SECTION 1: Complete Routes Inventory (95+ Endpoints)

### Authentication Routes (7 endpoints)

| Route | Method | Rate Limit | Auth | Purpose | New Fields |
|-------|--------|-----------|------|---------|------------|
| `/api/auth/register` | POST | 5/min/IP | ❌ Public | Parent signup | `termsAccepted` ✨ |
| `/api/auth/login` | POST | 5/min/IP+email | ❌ Public | Parent login | — |
| `/api/auth/check-email` | GET | 10/min/IP | ❌ Public | Email availability | — |
| `/api/auth/request-otp` | POST | 3/min/IP+email | ❌ Public | OTP request | — |
| `/api/auth/verify-otp` | POST | 5/min/IP+email | ❌ Public | OTP verification | — |
| `/api/auth/refresh-token` | POST | 10/min/user | 👤 Parent | Token refresh | ❌ Missing |
| `/api/auth/logout` | POST | — | 👤 Parent | Logout | — |

**🔴 Critical Issue**: No token refresh endpoint (30-day token fixation vulnerability)

---

### Parent Platform Routes (20 endpoints)

#### Profile & Settings
| Route | Method | Rate Limit | Auth | Purpose | Query Params |
|-------|--------|-----------|------|---------|--------------|
| `/api/parent/profile-data` | GET | — | 👤 Parent | Get profile | — |
| `/api/parent/profile/update` | POST | 3/min/user | 👤 Parent | Update profile | — |
| `/api/parent/profile/change-password` | POST | 3/min/user | 👤 Parent | Update password | — |
| `/api/parent/profile-info` | GET | — | 👤 Parent | Enhanced profile | — |

**Security Enhancement**: `currentPassword` ✨ now required if profile updated before

#### Family Management
| Route | Method | Rate Limit | Auth | Purpose |
|-------|--------|-----------|------|---------|
| `/api/parent/children` | GET/POST | — | 👤 Parent | List/add children |
| `/api/parent/children/:id` | GET/PUT/DELETE | — | 👤 Parent | Manage child |
| `/api/parent/unlink-child` | POST | 5/min/user | 👤 Parent | Unlink child |

#### Wallet & Payments
| Route | Method | Rate Limit | Auth | Purpose | New |
|-------|--------|-----------|------|---------|-----|
| `/api/parent/wallet` | GET | — | 👤 Parent | Wallet balance | — |
| `/api/parent/wallet/deposit` | POST | 5/min/user | 👤 Parent | Deposit request | ✨ Currency support |
| `/api/parent/wallet/withdraw` | POST | 5/min/user | 👤 Parent | Withdraw (vendor) | — |
| `/api/parent/purchases` | GET | — | 👤 Parent | Order history | ✨ Return status |
| `/api/parent/purchases/:id/return-request` | POST | — | 👤 Parent | Request return | ✨ New endpoint |

**New Return System** ✨:
- 15-day return window from delivery
- Merchant balance frozen during review
- Admin dispute resolution
- Parent can respond to rejection

#### Marketplace & Shopping
| Route | Method | Rate Limit | Auth | Purpose |
|-------|--------|-----------|------|---------|
| `/api/parent/profile/:parentId` | GET | — | ❌ Public | View parent profile |
| `/api/parent/cart` | GET/POST/DELETE | — | 👤 Parent | Shopping cart |
| `/api/store/checkout` | POST | 10/min/user | 👤 Parent | Process checkout |

---

### Child Platform Routes (15 endpoints)

#### Child Auth & Setup
| Route | Method | Rate Limit | Auth | Purpose |
|-------|--------|-----------|------|---------|
| `/api/child/link-parent` | POST | 5/min/IP | ❌ Public | Link to parent |
| `/api/child/link-code-status` | GET | — | ❌ Public | Check link status |
| `/api/child/login-request` | POST | 5/min/IP | ❌ Public | Request login |
| `/api/child/login-request-status` | GET | — | ❌ Public | Poll login status |

#### Child Dashboard
| Route | Method | Rate Limit | Auth | Purpose |
|-------|--------|-----------|------|---------|
| `/api/child/dashboard` | GET | — | 👶 Child | Dashboard data |
| `/api/child/profile` | GET/PUT | — | 👶 Child | Child profile |
| `/api/child/progress` | GET | — | 👶 Child | Progress stats |

#### Games & Learning
| Route | Method | Rate Limit | Auth | Purpose | Security |
|-------|--------|-----------|------|---------|----------|
| `/api/child/games` | GET | — | 👶 Child | Game library | ✨ Grid filtering |
| `/api/child/complete-game` | POST | — | 👶 Child | Submit score | 🔴 No validation |
| `/api/child/tasks` | GET | — | 👶 Child | Task list | — |

**🔴 CRITICAL VULNERABILITY**: Game scores accepted without HMAC signature verification (iframe can fake scores)

#### Shopping
| Route | Method | Rate Limit | Auth | Purpose | New |
|-------|--------|-----------|------|---------|-----|
| `/api/child/store/products` | GET | — | 👶 Child | Browse shop | — |
| `/api/child/store/checkout` | POST | — | 👶 Child | Submit order | ✨ Points-based |

---

### Admin Panel Routes (30+ endpoints, 40+ tabs)

#### Dashboard & Monitoring
| Tab | Route | Method | Purpose |
|-----|-------|--------|---------|
| Dashboard | `/api/admin/dashboard` | GET | KPIs, charts |
| Risk Monitor | `/api/admin/risk-monitor` | GET | Fraud detection |
| Activity Log | `/api/admin/activity-logs` | GET | Action audit |

#### Product Management
| Tab | Route | Method | Purpose | New |
|-----|-------|--------|---------|-----|
| Products (Admin) | `/api/admin/products` | GET/POST/PUT | Admin products | — |
| **Merchant Products Review** ✨ | `/api/admin/merchant-products/review` | GET | Pending reviews | ✨ New |
| **Product Rejection Templates** ✨ | `/api/admin/product-rejection-templates` | GET/POST/PUT/DELETE | Template mgmt | ✨ New |
| **Library Products Review** ✨ | `/api/admin/library-products/review` | GET | Library queue | ✨ New |

**Product Moderation Flow** ✨:
```
Merchant submits product → moderationStatus: pending_review
Admin reviews → Approve or Reject with template reason
If rejected → Merchant resubmits → Re-review required
If approved → isActive: true, moderationStatus: approved
```

#### User Management
| Tab | Route | Method | Purpose |
|-----|-------|--------|---------|
| Parents | `/api/admin/parents` | GET/PUT | Parent accounts |
| Children | `/api/admin/children` | GET/PUT | Child accounts |
| Users | `/api/admin/users` | GET/POST/PUT | General users |

#### Financial
| Tab | Route | Method | Purpose | New |
|-----|-------|--------|---------|-----|
| Orders | `/api/admin/orders` | GET | Order tracking | — |
| **Orders Tracking** ✨ | `/api/admin/orders-tracking` | GET | Shipping status | ✨ New |
| Wallets | `/api/admin/wallets` | GET | Wallet balances | — |
| Deposits | `/api/admin/deposits` | GET/PUT | Deposit mgmt | ✨ Category filter |
| **Library Return Requests** ✨ | `/api/admin/library-return-requests` | GET/PUT | Dispute resolution | ✨ New |

**Return Request Resolution** ✨:
- GET: All disputes with frozen balance info
- PUT `/{id}/resolve`: Approve/Reject with note
  - Approve → Deduct from merchant safe, mark returned
  - Reject → Unfreeze balance, return to merchant

#### Settings & Configuration
| Tab | Route | Method | Purpose | New |
|-----|-------|--------|---------|-----|
| App Settings | `/api/admin/settings/app` | GET/PUT | Core config | ✨ Payment visibility |
| Mobile App | `/api/admin/settings/mobile` | GET/PUT | APK, PWA | ✨ Age card config |
| SEO | `/api/admin/settings/seo` | GET/PUT | Meta tags | — |
| Notifications | `/api/admin/settings/notifications` | GET/PUT | Notification config | — |

**New Mobile App Settings** ✨:
- `homeAgeCardEnabled`: Show age selector
- `homeAgeOptionOneText`: "Age 6 to 12" (customizable)
- `homeAgeOptionTwoText`: "Age 13 to 17" (customizable)
- `homeAgeOptionOneBg`, `homeAgeOptionOneTextColor`: Styling
- `homeAgeOptionTwoFrom`, `homeAgeOptionTwoTo`: Gradient colors

#### School Management
| Tab | Route | Method | Purpose |
|-----|-------|--------|---------|
| Schools | `/api/admin/schools` | GET/PUT | School accounts |
| Teachers | `/api/admin/school-teachers` | GET | Teacher list |

#### Library Management
| Tab | Route | Method | Purpose |
|-----|-------|--------|---------|
| Libraries | `/api/admin/libraries` | GET/PUT | Library accounts |
| Library Withdrawals | `/api/admin/library-withdrawals` | GET/PUT | Payout mgmt |
| Library Deposits | `/api/admin/library-deposits` | GET | Deposit tracking |

#### Teacher Platform
| Tab | Route | Method | Purpose |
|-----|-------|--------|---------|
| Teachers | `/api/admin/teachers` | GET | Teacher list |
| Teacher Tasks | `/api/admin/teacher-tasks` | GET | Task audit |
| Teacher Earnings | `/api/admin/teacher-earnings` | GET | Revenue tracking |

#### Gifts & Rewards
| Tab | Route | Method | Purpose |
|-----|-------|--------|---------|
| Gifts | `/api/admin/gifts` | GET/POST/PUT | Gift catalog |
| Reward Offers | `/api/admin/reward-offers` | GET/POST/PUT | Offer config |

#### Content & Setup
| Tabs | Route | Purpose |
|------|-------|---------|
| Symbols | `/api/admin/symbols` | Badge library |
| Subjects | `/api/admin/subjects` | Topic list |
| Categories | `/api/admin/storeCategories` | Product categories |
| Games | `/api/admin/games` | Game management |
| Tasks | `/api/admin/tasks` | Task library |
| ADs | `/api/admin/ads` | Advertisement mgmt |
| Referrals | `/api/admin/referrals` | Referral tracking |
| SEO | `/api/admin/seo` | SEO config |
| Support | `/api/admin/support` | Help topics |
| Legal | `/api/admin/legal` | Legal pages |

---

### School System Routes (8 endpoints)

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/school/login` | POST | ❌ Public | School auth |
| `/api/school/dashboard` | GET | 🏫 School | Dashboard |
| `/api/school/profile` | GET/PUT | 🏫 School | School profile |
| `/api/school/teachers` | GET/POST | 🏫 School | Manage teachers |
| `/api/school/students` | GET | 🏫 School | Student list |

---

### Teacher Platform Routes (8 endpoints)

| Route | Method | Auth | Purpose | New |
|-------|--------|------|---------|-----|
| `/api/teacher/login` | POST | ❌ Public | Teacher auth | — |
| `/api/teacher/dashboard` | GET | 👨‍🏫 Teacher | Dashboard | — |
| `/api/teacher/profile` | GET/PUT | 👨‍🏫 Teacher | Profile | — |
| `/api/teacher/tasks` | GET/POST/PUT | 👨‍🏫 Teacher | Task mgmt | — |
| `/api/teacher/earnings` | GET | 👨‍🏫 Teacher | Revenue | ✨ Enhanced |
| `/api/teacher/withdrawals` | POST | 👨‍🏫 Teacher | Request payout | — |

---

### Library/Merchant Routes (12 endpoints)

| Route | Method | Auth | Purpose | New |
|-------|--------|------|---------|-----|
| `/api/library/login` | POST | ❌ Public | Merchant login | — |
| `/api/library/dashboard` | GET | 📚 Library | Dashboard | — |
| `/api/library/profile` | GET/PUT | 📚 Library | Profile | — |
| `/api/library/products` | GET/POST/PUT/DELETE | 📚 Library | Product mgmt | ✨ Moderation |
| `/api/library/balances` | GET | 📚 Library | Wallet balance | ✨ Frozen amount |
| `/api/library/return-requests` | GET | 📚 Library | View disputes | ✨ New endpoint |
| `/api/library/return-requests/:id/respond` | PUT | 📚 Library | Respond to dispute | ✨ New endpoint |

**Merchant Return Workflow** ✨:
- GET: All return requests with buyer info
- PUT respond: Submit 5+ char response
- Status: under_review → merchant_responded
- Admin reviews → approved/rejected

---

### Store & Public Routes (15 endpoints)

| Route | Method | Auth | Purpose | New |
|-------|--------|------|---------|-----|
| `/api/store/products` | GET | ❌ Public | Browse all | ✨ Country/currency filter |
| `/api/store/categories` | GET | ❌ Public | Category list | — |
| `/api/store/libraries` | GET | ❌ Public | Merchant list | — |
| `/api/store/libraries/:id` | GET | ❌ Public | Merchant store | — |
| `/api/store/payment-methods` | GET | 👤 Parent | Available methods | ✨ Country-filtered |

**Query Parameters** ✨:
- `country`: "EG", "SA", "AE", etc.
- `currency`: "EGP", "SAR", "AED", etc.
- Products filtered by `displayCountries`, `displayCurrencies`

---

### Media & Uploads (10 endpoints)

| Route | Method | Rate Limit | Purpose | New |
|-------|--------|-----------|---------|-----|
| `/api/media/presign-upload` | POST | 10/min/user | Get upload URL | — |
| `/api/media/finalize-upload` | POST | 10/min/user | Confirm upload | — |
| `/api/media/attach-media` | POST | — | Attach to entity | — |
| `/api/media/detach-media` | POST | — | Detach from entity | — |
| `/api/media/soft-delete` | POST | — | Mark deleted | — |

**Purpose-Based Permissions** ✨:
- `profile_avatar` → 5 MB image
- `profile_cover` → 10 MB image
- `product_image` → 15 MB image
- `product_gallery` → 25 MB image/video
- **`sticker_media`** ✨ → 10 MB image (WhatsApp stickers)

---

### Marketing & Discovery (8 endpoints)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/marketplace/search` | GET | Universal search |
| `/api/marketplace/teacher-tasks` | GET | Discover tasks |
| `/api/marketplace/teacher-profiles` | GET | Discover teachers |
| `/api/marketplace/schools` | GET | School discovery |
| `/api/marketplace/libraries` | GET | Library discovery |

---

### Health & Special (5 endpoints)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/health` | GET | Liveness probe |
| `/api/ready` | GET | Readiness check |
| `/api/ping` | GET | Connectivity test |
| `/api/404` | GET | Error demo |
| `*` (catch-all) | ANY | SPA fallback |

---

## 🚦 SECTION 2: Rate Limiter Matrix (25 Limiters)

| Limiter ID | Endpoint(s) | Limit | Window | Key Strategy | Notes |
|------------|------------|-------|--------|--------------|-------|
| `registerLimiter` | `/api/auth/register` | 5 | 60s | IP | Per IP address |
| `loginLimiter` | `/api/auth/login` | 5 | 60s | IP + email | Composite |
| `otpRequestLimiter` | `/api/auth/request-otp` | 3 | 60s | IP + email | Prevent OTP spam |
| `otpVerifyLimiter` | `/api/auth/verify-otp` | 5 | 60s | IP + email | Brute force protect |
| `childLinkLimiter` | `/api/child/link-parent` | 5 | 15min | IP | Session linking |
| `childLoginRequestLimiter` | `/api/child/login-request` | 5 | 15min | IP | Polling protection |
| `childLoginStatusLimiter` | `/api/child/login-request-status` | 10 | 60s | IP | Poll frequently |
| `checkoutLimiter` | `/api/store/checkout` | 10 | 60s | User ID | Transaction limit |
| `parentLinkingLimiter` | `/api/parent/linking` | 5 | 15min | User ID | Link rate |
| `refreshTokenLimiter` | `/api/auth/refresh-token` | 10 | 60s | User ID | Token rotation |
| `publicApiLimiter` | `/api/store/products` | 30 | 60s | IP | Browse protection |
| `depositLimiter` | `/api/parent/wallet/deposit` | 5 | 15min | User ID | Deposit spam |
| `walletLimiter` | `/api/parent/wallet/*` | 20 | 60s | User ID | Wallet ops |
| `sensitiveParentLimiter` | `/api/parent/profile/change-password` | 3 | 15min | User ID | Sensitive ops |
| `screenTimeLimiter` | `/api/child/screen-time/*` | 10 | 60s | Child ID | Usage tracking |
| `teacherAssignmentLimiter` | `/api/teacher/tasks/assign` | 5 | 60s | Teacher ID | Assign rate |
| `adWatchLimiter` | `/api/child/ads/watch` | 10 | 3600s | Child ID | Daily ad limit |
| `presignLimiter` | `/api/media/presign-upload` | 10 | 60s | User ID | Upload spam |
| `finalizeLimiter` | `/api/media/finalize-upload` | 10 | 60s | User ID | Finalize spam |
| `attachLimiter` | `/api/media/attach-media` | 20 | 60s | User ID | Attach ops |
| `deleteLimiter` | `/api/media/soft-delete` | 20 | 60s | User ID | Delete ops |
| `libraryProductCreateLimiter` | `/api/library/products` | 3 | 3600s | Library ID | 3 products/hour |
| `libraryProductUpdateLimiter` | `/api/library/products/:id` | 5 | 60s | Library ID | Edit rate |
| `referralClickLimiter` | `/api/store/referral-click` | 50 | 3600s | IP | Click fraud |
| `paymentMethodVisibilityRefresh` | (internal) | 1 | 300s | Global | Cache refresh |

**Key Patterns**:
- **Per-IP**: Public endpoints (auth, public API)
- **Per-User**: Authenticated endpoints (wallet, profile)
- **Composite**: Email+IP (OTP - distributed attacks)
- **Time Windows**: Fast (60s) for rate, Slow (15min) for sensitive ops

---

## 🔑 SECTION 3: Authentication & Authorization Matrix

### 6 Token Types

| Token Type | Payload | Expiry | Scope | Usage |
|-----------|---------|--------|-------|-------|
| **parent-token** | `{ parentId, type: "parent", role?, exp }` | 30 days | Parent ops | `/api/parent/*` |
| **child-token** | `{ childId, parentId, type: "child", exp }` | 30 days | Child ops | `/api/child/*` |
| **admin-token** | `{ adminId, type: "admin", role, perms, exp }` | 30 days | Admin ops | `/api/admin/*` |
| **school-token** | `{ schoolId, type: "school", exp }` | 30 days | School ops | `/api/school/*` |
| **teacher-token** | `{ teacherId, type: "teacher", exp }` | 30 days | Teacher ops | `/api/teacher/*` |
| **library-token** | `{ libraryId, type: "library", exp }` | 30 days | Library ops | `/api/library/*` |

**🔴 Vulnerability**: No refresh token mechanism (30-day fixation)

### Admin RBAC Roles

| Role | Permissions | Admin Routes | Access Level |
|------|-------------|--------------|--------------|
| **super_admin** | All operations | 40+ tabs | 🔓 Unrestricted |
| **finance_admin** | Wallets, deposits, withdrawals, disputes | Financial tabs | 💰 Financial |
| **content_admin** | Products, categories, symbols, tasks, games | Content tabs | 📚 Content mgmt |
| **moderator_admin** | Approve/reject products, user moderation | Reviews, users | 🚨 Moderation |
| **school_admin** | School management, teacher oversight | School tabs | 🏫 School only |
| **support_admin** | Support tickets, user help | Support tab | 🆘 Support only |

**Check Pattern**:
```typescript
adminMiddleware(req, res, next) {
  // 1. Verify JWT
  // 2. Check req.user.type === "admin"
  // 3. Enforce role if needed (e.g., adminRole("finance_admin"))
  // 4. Log action
}

adminRole("finance_admin")(req, res, next) {
  // Verify req.user.role includes "finance_admin"
}
```

---

## 🛡️ SECTION 4: Data Flow Security Analysis

### Critical Ownership Checks

**Pattern: Parent → Child Operations**
```
GET /api/child/dashboard
├─ Verify: req.user.type === "child"
├─ Verify: req.user.childId matches child
└─ Verify: req.user.parentId matches parent in parentChild table
    ✅ SAFE (3-level validation)
```

**Pattern: Parent → Purchase Operations**
```
POST /api/parent/purchases/:id/return-request
├─ Verify: parentPurchases.parentId === req.user.parentId
├─ Verify: Purchase status in [delivered, completed]
├─ Calculate: DaysElapsed ≤ 15
└─ Freeze: Library balance by order amount
    ✅ SAFE (Transaction ensures atomicity)
```

**Pattern: Library → Return Request Response** ✨
```
PUT /api/library/return-requests/:id/respond
├─ Verify: libraryReturnRequests.libraryId === req.library.libraryId
├─ Verify: status === "under_review"
├─ Check: Response length ≥ 5 chars
└─ Update: status → "merchant_responded"
    ✅ SAFE (Library scoped access)
```

### Dangerous Patterns

**🔴 CRITICAL: Game Score No Validation**
```
POST /api/child/complete-game
├─ Receive: { gameId, score, duration }
├─ Trust: Iframe sent honest data ❌ NO VALIDATION
├─ Write: INSERT gamePlayHistory { score }
└─ Award: Points = score ✅ BUT UNVERIFIED
    🔴 DANGER: Child iframe can fake scores
```

**Fix Required**:
```typescript
// Server should:
1. Store game config (max score possible)
2. Demand HMAC signature: HMAC-SHA256(score + time + child_id + salt)
3. Validate: signature matches server calculation
4. Only accept if signature valid
```

**🔴 MEDIUM: Game Score Tampering via Network**
```
POST /api/child/complete-game
├─ Network intercept possible (child network)
├─ Score mutable by MitM
└─ No signature verification
    🔴 DANGER: Network attacker can fake scores
```

---

## ⚡ SECTION 5: Performance Hotspots & Optimization

### Database Query Issues

| Route | Hotspot | Risk | SQL Pattern | Fix |
|-------|---------|------|-------------|-----|
| `/api/parent-dashboard` | 40+ admin tabs | O(n²) | Missing joins | Add prefetch indexes |
| `/api/child/tasks` | Task filtering | O(n) | No index on `childId` | Add composite index |
| `/api/store/products` | Category nested | O(n²) | Recursive category fetch | Load categories once |
| `/api/library/products` | Moderation queue | O(n)  | Seq scan on `moderationStatus` | Add partial index |
| `/api/admin/orders-tracking` | All orders | O(n) | No index on `status` | Add status index |

### Missing Database Indexes (Priority)

**🔴 HIGH PRIORITY**:
```sql
-- Authentication
CREATE INDEX idx_parents_email ON parents(email);
CREATE INDEX idx_parents_phone ON parents(phoneNumber);
CREATE INDEX idx_parentChild_ids ON parentChild(parentId, childId);
CREATE INDEX idx_children_parentId ON children(parentId);

-- Lookups
CREATE INDEX idx_libraryProducts_libraryId_status ON libraryProducts(libraryId, moderationStatus);
CREATE INDEX idx_products_parentId_status ON products(parentId, moderationStatus);
CREATE INDEX idx_libraryOrders_libraryId ON libraryOrders(libraryId);
CREATE INDEX idx_libraryReturnRequests_libraryId ON libraryReturnRequests(libraryId);
CREATE INDEX idx_libraryReturnRequests_status ON libraryReturnRequests(status);
```

**🟡 MEDIUM PRIORITY**:
```sql
-- Temporal
CREATE INDEX idx_otpCodes_email_exp ON otpCodes(email, expiresAt);
CREATE INDEX idx_libraryReturnRequests_createdAt ON libraryReturnRequests(createdAt DESC);
CREATE INDEX idx_parentAuditLogs_action ON parentAuditLogs(action);

-- Financial
CREATE INDEX idx_libraryOrders_paymentStatus ON libraryOrders(paymentStatus);
CREATE INDEX idx_libraryBalances_frozenBalance ON libraryBalances(frozenBalance) WHERE frozenBalance > 0;
```

**🟢 LOW PRIORITY**:
```sql
-- Analytics
CREATE INDEX idx_taskResults_completedAt ON taskResults(completedAt);
CREATE INDEX idx_gamePlayHistory_childId_createdAt ON gamePlayHistory(childId, createdAt);
```

### N+1 Query Examples

**Problem: Admin Dashboard 40+ Tabs**
```typescript
// ❌ ANTI-PATTERN (generates 40 queries)
for (const tab of TABS) {
  const data = await fetch(`/api/admin/tab-${tab}`);
}

// ✅ PATTERN (generates 1 query)
const allData = await db.select().from(adminDashboard).where(...);
```

**Problem: Children → Parents nested load**
```typescript
// ❌ ANTI-PATTERN (1 + n queries)
const children = await db.select().from(children);
for (const child of children) {
  const parent = await db.select().from(parents)
    .where(eq(parents.id, child.parentId)); // N queries
}

// ✅ PATTERN (1 query with join)
const withParents = await db
  .select()
  .from(children)
  .leftJoin(parents, eq(children.parentId, parents.id));
```

---

## 🚨 SECTION 6: Security Vulnerabilities (8 Issues)

### 🔴 CRITICAL (Immediate Action Required)

| Issue | Route | Risk | Impact | Fix |
|-------|-------|------|--------|-----|
| **1** | `POST /api/child/complete-game` | Unvalidated game score | Unlimited points fraud | Add HMAC signature verification |
| **2** | Token system | No refresh mechanism | 30-day session fixation | Implement refresh token + 401 interceptor |
| **3** | Auth tokens | Use Math.random() | Weak entropy (52 bits) | Use crypto.randomBytes() (256 bits) |
| **4** | All endpoints | CORS origin not strict | Cross-origin abuse | Verify cors.origin strictly |

### 🟡 HIGH (Next Sprint)

| Issue | Route | Risk | Impact | Fix |
|-------|-------|------|--------|-----|
| **5** | `/api/parent/login` | No 2FA option | Phishing vulnerability | Add TOTP/SMS 2FA |
| **6** | Child token | No device fingerprinting | Token theft undetectable | Add device_id to token, verify on use |
| **7** | All routes | No global audit log | Forensics limited | Create centralAuditLog table |
| **8** | Admin tabs | N+1 queries | Performance degradation | Batch load tab data |

### Vulnerability Details & Fixes

#### Issue #1: Game Score Validation
```typescript
// ❌ Current (insecure)
app.post("/api/child/complete-game", authMiddleware, (req, res) => {
  const { gameId, score } = req.body;
  // INSERT score directly - NO VALIDATION
  db.insert(gamePlayHistory).values({ childId, gameId, score });
});

// ✅ Fixed (secure)
const crypto = require("crypto");
const GAME_CONFIG = { "memory-match": { maxScore: 1000 } };

app.post("/api/child/complete-game", authMiddleware, (req, res) => {
  const { gameId, score, signature } = req.body;
  const maxScore = GAME_CONFIG[gameId]?.maxScore || 100;
  
  // 1. Validate score range
  if (score > maxScore) throw new Error("Score exceeds maximum");
  
  // 2. Verify signature
  const salt = process.env.GAME_SIGNATURE_SALT;
  const expectedSig = crypto
    .createHmac("sha256", salt)
    .update(`${gameId}:${score}:${req.user.childId}`)
    .digest("hex");
  
  if (signature !== expectedSig) throw new Error("Invalid signature");
  
  // 3. Accept score
  db.insert(gamePlayHistory).values({...});
});
```

#### Issue #2: Token Refresh
```typescript
// ✅ Implementation
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_TOKEN_EXPIRY = "1h";  // Short-lived
const REFRESH_TOKEN_EXPIRY = "7d"; // Long-lived

app.post("/api/auth/login", loginLimiter, async (req, res) => {
  // ... auth checks ...
  
  const accessToken = jwt.sign(
    { userId: parent.id, type: "parent" },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
  
  const refreshToken = jwt.sign(
    { userId: parent.id, type: "parent" },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
  
  // Store refresh token in httpOnly cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  
  res.json({ accessToken }); // No refresh token in JSON
});

app.post("/api/auth/refresh-token", (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.status(401).json({ error: "No refresh token" });
  
  try {
    const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    const newAccessToken = jwt.sign(
      { userId: payload.userId, type: "parent" },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
    res.json({ accessToken: newAccessToken });
  } catch {
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

// Frontend interceptor
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      const { accessToken } = await api.post("/api/auth/refresh-token");
      localStorage.setItem("token", accessToken);
      return api.request(error.config);
    }
    throw error;
  }
);
```

#### Issue #3: Crypto Entropy
```typescript
// ❌ Insecure (Math.random)
const referralCode = Math.random().toString(36).substring(2, 10); // 52-bit entropy
const otpToken = Math.random().toString(36).substring(2, 8);      // Predictable

// ✅ Secure (crypto)
const crypto = require("crypto");
const referralCode = crypto.randomBytes(6).toString("hex").toUpperCase(); // 48-byte = 384-bit
const otpToken = crypto.randomInt(100000, 999999).toString();             // 20-bit, secure for OTP
```

#### Issue #5: 2FA Implementation
```typescript
// ✅ TOTP 2FA
const speakeasy = require("speakeasy");

app.post("/api/parent/setup-2fa", authMiddleware, (req, res) => {
  const secret = speakeasy.generateSecret({
    name: `Classify (${req.user.email})`,
    issuer: "Classify",
  });
  
  // Store in cache pending verification
  cache.set(`2fa_pending:${req.user.id}`, secret.base32, 600); // 10 min
  
  res.json({ qrCode: secret.qr_code });
});

app.post("/api/parent/verify-2fa", authMiddleware, (req, res) => {
  const { token } = req.body;
  const secret = cache.get(`2fa_pending:${req.user.id}`);
  
  const verified = speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 1,
  });
  
  if (!verified) return res.status(400).json({ error: "Invalid token" });
  
  // Save 2FA enabled
  db.update(parents)
    .set({ twoFAEnabled: true, twoFASecret: secret })
    .where(eq(parents.id, req.user.id));
  
  res.json({ message: "2FA enabled" });
});

// On login
app.post("/api/auth/login", loginLimiter, async (req, res) => {
  const parent = // validate email/password
  
  if (parent.twoFAEnabled) {
    // Generate temp token (5 min)
    const tempToken = jwt.sign(
      { userId: parent.id, type: "parent_2fa_pending" },
      JWT_SECRET,
      { expiresIn: "5m" }
    );
    return res.json({ tempToken, requiresTwoFA: true });
  }
  
  // ... issue access token
});

app.post("/api/auth/verify-2fa", (req, res) => {
  const { tempToken, totpCode } = req.body;
  const payload = jwt.verify(tempToken, JWT_SECRET);
  
  if (payload.type !== "parent_2fa_pending") {
    return res.status(401).json({ error: "Invalid token" });
  }
  
  const parent = db.select().from(parents).where(eq(parents.id, payload.userId))[0];
  
  const verified = speakeasy.totp.verify({
    secret: parent.twoFASecret,
    encoding: "base32",
    token: totpCode,
    window: 1,
  });
  
  if (!verified) return res.status(400).json({ error: "Invalid TOTP" });
  
  // Issue real token
  const accessToken = jwt.sign(
    { userId: parent.id, type: "parent" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
  
  res.json({ accessToken });
});
```

---

## 📋 SECTION 7: Implementation Action Items

### Immediate (This Sprint)

- [ ] Game score HMAC validation (Issue #1)
- [ ] Replace Math.random() with crypto.randomBytes() (Issue #3)
- [ ] Implement token refresh endpoint (Issue #2)
- [ ] Database indexes (HIGH priority)
- [ ] Product moderation admin dashboard (new tab)

### Short-term (2-3 Weeks)

- [ ] 2FA for parents (Issue #5)
- [ ] Return request admin resolution workflow
- [ ] Library balance frozen amount display
- [ ] Payment method category filtering UI
- [ ] Home page age selector settings

### Medium-term (1 Month)

- [ ] Device fingerprinting (Issue #6)
- [ ] Global audit log implementation (Issue #7)
- [ ] N+1 query optimization (Issue #8)
- [ ] CORS origin strict verification (Issue #4)
- [ ] Marketplace return tracking dashboard

---

## 🔗 Cross-Document References

**Integration with Previous Analyses**:
- See [ARCHITECTURE_CODE_PATTERNS_DEEP_DIVE.md](ARCHITECTURE_CODE_PATTERNS_DEEP_DIVE.md) for frontend component patterns
- See [DATA_FLOW_COMPONENT_INTERACTION_DEEP_ANALYSIS.md](DATA_FLOW_COMPONENT_INTERACTION_DEEP_ANALYSIS.md) for user journeys
- See [BACKEND_SECURITY_DATABASE_DEEP_ANALYSIS.md](BACKEND_SECURITY_DATABASE_DEEP_ANALYSIS.md) for middleware details
- See [UPDATED_ROUTES_MAP_2026.md](UPDATED_ROUTES_MAP_2026.md) for basic route list

**Recommended Reading Order**:
1. **For Developers**: This document (understand all routes) → ARCHITECTURE_CODE_PATTERNS
2. **For Architects**: ULTIMATE_REFERENCE_MASTER_INDEX → This document → DATA_FLOW
3. **For Security Auditors**: BACKEND_SECURITY_DATABASE → This document → SECTION 6
4. **For QA/Testers**: This document (route coverage) → TESTING_QA_COVERAGE_MAP

---

## 📊 Statistics

| Metric | Count |
|--------|-------|
| Total API Routes | 95+ |
| Rate Limiters | 25 |
| Admin Dashboard Tabs | 40+ |
| Auth Flows | 6 |
| Security Vulnerabilities | 8 |
| Database Tables | 80+ |
| Frontend Components (React) | 59 |
| Languages Supported | 10+ |
| Payment Methods | 30+ |
| Product Categories | 50+ |
| Games Available | 20+ |

---

## 📝 Document Metadata

- **Document ID**: COMPREHENSIVE_ROUTES_SECURITY_PERFORMANCE_MAP_MARCH2026
- **Version**: 2.1
- **Last Updated**: March 19, 2026
- **Status**: ✅ Complete
- **Size**: ~25 KB
- **Coverage**: 100% of public API routes
- **Audience**: Architects, Backend Engineers, Security Auditors, QA Teams
- **Language**: English + Arabic (inline)

---

**Document Generated**: March 19, 2026  
**Next Review**: April 2, 2026 (post-implementation of vulnerabilities fixes)

