# 🏗️ CLASSIFY - Architecture & System Design
**Complete System Architecture Guide**

---

## 📊 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Stripe API   │  │ Resend Email │  │   Twilio SMS │           │
│  │  (Payments)  │  │   (Mailer)   │  │  (SMS/OTP)   │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Google Auth  │  │Facebook Auth │  │ Apple Auth   │           │
│  │   (OAuth2)   │  │  (OAuth2)    │  │  (OAuth2)    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
            ↓                           ↓                    ↓
┌─────────────────────────────────────────────────────────────────┐
│                      CDN & STATIC FILES                          │
│          (Images, Videos, Documents hosted via S3/GCS)          │
└─────────────────────────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────────────────────────┐
│                      TRAEFIK REVERSE PROXY                       │
│                    (SSL/TLS Termination)                         │
│                    (Rate Limiting, Routing)                      │
├────────────┬──────────────────────────┬──────────────┬──────────┤
│ HTTPS:443  │  HTTP:80 (redirect)      │ WS:443       │ Health   │
│            │                          │ (WebSocket)  │ Check    │
└────────────┴──────────────────────────┴──────────────┴──────────┘
            ↓
┌─────────────────────────────────────────────────────────────────┐
│                     VITE DEV SERVER (Frontend)                   │
│                                                                   │
│     ┌─────────────────────────────────────────────────┐          │
│     │   React 18 + TypeScript + TailwindCSS           │          │
│     │   ├─ Parent Dashboard                           │          │
│     │   ├─ Child Application                          │          │
│     │   ├─ Admin Panel                                │          │
│     │   └─ Authentication Pages                       │          │
│     └─────────────────────────────────────────────────┘          │
│                                                                   │
│  JavaScript Bundled, Service Worker (PWA), Web Manifest         │
│                                                                   │
│  State Management: React Query + Context                        │
│  Internationalization: i18n (RTL + LTR)                         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
       ↓                       (CORS)                     ↓
       └───────────────────────────────────────────────────┘
                        |
                        ↓ (HTTP Requests)
                        |
┌─────────────────────────────────────────────────────────────────┐
│                 EXPRESS.JS API SERVER (Backend)                  │
│                        (Node.js 18+)                             │
│                                                                   │
│  ┌────────────────────────────────────────────────────┐          │
│  │ MIDDLEWARE STACK                                   │          │
│  ├────────────────────────────────────────────────────┤          │
│  │ 1. CORS Handler                                   │          │
│  │ 2. Helmet (Security Headers)                      │          │
│  │ 3. Rate Limiter (IP-based)                        │          │
│  │ 4. Body Parser & Validator                        │          │
│  │ 5. JWT Verification (if authenticated)            │          │
│  │ 6. Authorization & Audit                          │          │
│  │ 7. Error Handler                                  │          │
│  └────────────────────────────────────────────────────┘          │
│                                                                   │
│  ┌────────────────────────────────────────────────────┐          │
│  │ ROUTES & CONTROLLERS                               │          │
│  ├────────────────────────────────────────────────────┤          │
│  │ /api/auth/*         - Authentication               │          │
│  │ /api/family/*       - Parent-child management      │          │
│  │ /api/tasks/*        - Task management              │          │
│  │ /api/store/*        - Products & orders            │          │
│  │ /api/gifts/*        - Gift system                  │          │
│  │ /api/notifications* - Notifications               │          │
│  │ /api/admin/*        - Admin panel                  │          │
│  │ /api/webhooks/*     - Stripe/External webhooks     │          │
│  │ /api/health         - System health check          │          │
│  └────────────────────────────────────────────────────┘          │
│                                                                   │
│  ┌────────────────────────────────────────────────────┐          │
│  │ SERVICES & LOGIC                                   │          │
│  ├────────────────────────────────────────────────────┤          │
│  │ AuthService    - JWT generation, password hashing│          │
│  │ MailerService  - Email/SMS delivery               │          │
│  │ PaymentService - Stripe integration               │          │
│  │ StorageService - File upload/download             │          │
│  │ CacheService   - Redis operations                 │          │
│  │ QueueService   - Background jobs                  │          │
│  └────────────────────────────────────────────────────┘          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
       ↓                    ↓                    ↓                  ↓
       |              |                    |                    |
┌─────────────┐  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│ PostgreSQL  │  │    Redis    │  │ Object Store │  │ Message Queue│
│  Database   │  │    Cache    │  │  (S3/GCS)    │  │ (Redis/Bull) │
├─────────────┤  ├─────────────┤  ├──────────────┤  ├──────────────┤
│             │  │             │  │              │  │              │
│ • Schema:   │  │ Sessions    │  │ Product imgs │  │ Email jobs   │
│   80+ tbl   │  │ Tokens      │  │ Task images  │  │ Payment      │
│ • 64 idx    │  │ User data   │  │ Avatar imgs  │  │  webhooks    │
│ • Triggers  │  │ Cache       │  │ Document     │  │ SMS delivery │
│ • Functions │  │             │  │              │  │ Cron jobs    │
│             │  │             │  │              │  │              │
│ Connection  │  │ Connection  │  │ Connection   │  │ Connection   │
│ pool: 20+   │  │ pool: 50+   │  │ SSL: yes     │  │ SSL: yes     │
└─────────────┘  └─────────────┘  └──────────────┘  └──────────────┘
   ↓                                                           
   (SQL queries via Drizzle ORM)
```

---

## 🔐 Authentication Flow Diagram

```
User Action
    │
    ▼
┌──────────────────┐
│ User clicks:     │
│ "Login" or       │
│ "Register"       │
└──────────────────┘
    │
    ├─ If Register:
    │   ├─ Email validation
    │   ├─ Password strength check
    │   ├─ Bcrypt hash (10 rounds)
    │   ├─ Create parent record
    │   └─ Auto-login
    │
    └─ If Login:
        ├─ Email lookup
        ├─ Password compare vs bcrypt hash
        │
        ├─ If password WRONG:
        │   ├─ Increment failed_login_attempts
        │   ├─ If attempts > 5:
        │   │   └─ Lock account for 30 min
        │   └─ Return 401
        │
        └─ If password CORRECT:
            ├─ Reset failed_login_attempts to 0
            ├─ Check if 2FA enabled:
            │
            ├─ If 2FA ENABLED:
            │   ├─ Generate 6-digit OTP
            │   ├─ Store with 5-min expiry
            │   ├─ Send via Email/SMS
            │   ├─ User receives OTP
            │   ├─ User submits OTP code
            │   │   ├─ If correct:
            │   │   │   ├─ Mark OTP as used
            │   │   │   ├─ Generate JWT (7 days)
            │   │   │   ├─ Generate Refresh Token (45 days)
            │   │   │   └─ Return tokens
            │   │   └─ If incorrect:
            │   │       ├─ Increment OTP attempts
            │   │       ├─ If attempts > 3: lock for 1 min
            │   │       └─ Return 401
            │   │
            │   └─ Optional: Trust this device
            │       ├─ Generate device hash
            │       ├─ Store trusted_devices record
            │       └─ Next login skips 2FA for 45 days
            │
            └─ If 2FA DISABLED:
                ├─ Generate JWT (7 days)
                ├─ Generate Refresh Token (45 days)
                └─ Return tokens

Tokens stored in frontend:
├─ JWT → localStorage (short-lived)
├─ Refresh Token → httpOnly cookie (secure)
└─ Device ID → localStorage

All API calls must include:
├─ Authorization: "Bearer <JWT>"
└─ Device-ID: "<device-id>"
```

---

## 📚 Task Lifecycle Diagram

```
┌──────────────────┐
│   Parent Action  │
│  "Create Task"   │
└──────────────────┘
        │
        ▼
    ┌─────────────────────────┐
    │ Select Child            │
    │ Enter Question          │
    │ Set Answers (multi)     │
    │ Set Points Reward       │
    │ Optional: Add image     │
    │ Optional: Set subject   │
    └─────────────────────────┘
        │
        ▼
    ┌─────────────────────────┐
    │ Validation              │
    │ - Question not empty    │
    │ - At least 2 answers    │
    │ - Exactly 1 correct     │
    │ - Points > 0            │
    │ - Child owned by parent │
    └─────────────────────────┘
        │
        ▼
    ┌─────────────────────────┐
    │ INSERT into tasks table │
    │ status = "pending"      │
    │ created_at = NOW()      │
    └─────────────────────────┘
        │
        ▼
    ┌─────────────────────────┐
    │ Send Notification       │
    │ to Child                │
    │ "New task: Question?"   │
    └─────────────────────────┘
        │
        ▼
    ┌─────────────────────────┐
    │ Child opens task        │
    │ Views question + image  │
    │ Selects answer          │
    │ Clicks "Submit"         │
    └─────────────────────────┘
        │
        ▼
    ┌─────────────────────────┐
    │ POST /api/tasks/submit  │
    │ Validation:             │
    │ - Child owns task       │
    │ - Answer is valid       │
    │ - Not already submitted │
    └─────────────────────────┘
        │
        ├─ If CORRECT:
        │   ├─ INSERT taskResult (isCorrect=true)
        │   ├─ UPDATE children.total_points += reward
        │   ├─ INSERT pointsHistory record
        │   ├─ Notification: "Correct! +10 points"
        │   ├─ Check for gift unlocks
        │   └─ Update growth tree
        │
        └─ If INCORRECT:
            ├─ INSERT taskResult (isCorrect=false)
            ├─ No points awarded
            ├─ Notification: "Try again!"
            └─ taskResult still created (for tracking)

Parent Dashboard shows:
├─ Completed tasks
├─ Points earned
├─ Attempts made
├─ Time taken to solve
└─ Trend over time
```

---

## 🎁 Gift System Workflow

```
┌──────────────────────────┐
│ Parent: "Send a gift"    │
├──────────────────────────┤
│ 1. Browse store products │
│ 2. Select product        │
│ 3. Set points threshold  │
│    (e.g., 1000 points)   │
│ 4. Optional: Add message │
│ 5. Click "Send Gift"     │
└──────────────────────────┘
        │
        ▼ POST /api/gifts
    ┌─────────────────────────┐
    │ Validation:             │
    │ - Parent owns child     │
    │ - Product exists       │
    │ - Threshold is valid   │
    └─────────────────────────┘
        │
        ▼
    ┌─────────────────────────┐
    │ INSERT gifts table      │
    │ status = "SENT"         │
    │ Child doesn't know yet  │
    │ (Hidden from child)     │
    └─────────────────────────┘
        │
        ▼ (Child earns points over time)
    
    PHASE 1: EARNING
    ├─ Child completes tasks
    ├─ Points accumulate: 100 → 500 → 900 → 999
    └─ Gift still hidden
    
    ┌─────────────────────────────────────┐
    │ Child reaches 1000 points!          │
    │ Backend runs automatic trigger:     │
    │ 1. Check all hidden gifts           │
    │ 2. Find gifts with threshold ≤ 1000│
    │ 3. UPDATE gift status = "UNLOCKED" │
    │ 4. Send notification: "🎁 Gift!"    │
    └─────────────────────────────────────┘
    
    PHASE 2: UNLOCKED
    ├─ Child views "Unlocked Gifts"
    ├─ Sees product image, name, message
    └─ Gift ready to open
    
    ┌──────────────────┐
    │ Child clicks:    │
    │ "Open Gift"      │
    └──────────────────┘
        │
        ▼ POST /api/gifts/:id/activate
    ┌─────────────────────────┐
    │ Validation:             │
    │ - Child owns gift       │
    │ - Gift is unlocked      │
    │ - Child has points      │
    └─────────────────────────┘
        │
        ▼
    ┌─────────────────────────┐
    │ TRANSACTION:            │
    │ 1. -X points from child │
    │ 2. +X points to parent  │
    │ 3. Update gift status   │
    │ 4. Grant access/send    │
    │ 5. Create entitlement   │
    │ 6. Log transaction      │
    │ 7. All or nothing       │
    └─────────────────────────┘
    
    PHASE 3: ACTIVATED
    ├─ Gift status = "ACTIVATED"
    ├─ Child: "You activated the gift!"
    ├─ If digital: Access immediately
    └─ If physical: Shipping request created
```

---

## 💳 Payment Processing Flow

```
┌─────────────────────────┐
│ Child wants to buy item │
│ "Exchange 500 points"   │
│ OR                      │
│ "Buy with card ($50)"   │
└─────────────────────────┘
        │
        ├─ If POINTS payment:
        │   │
        │   ├─ Check: Child has 500 points?
        │   ├─ YES → Continue
        │   └─ NO → "Insufficient points"
        │
        └─ If CURRENCY payment:
            │
            ├─ Create stripe checkout session
            ├─ Redirect to Stripe payment form
            └─ User enters card details
                │
                ├─ If payment fails:
                │   └─ Notification: "Payment failed"
                │
                └─ If payment succeeds:
                    └─ Stripe sends webhook

WEBHOOK HANDLING (Points):
    │
    ├─ POST /api/webhooks/stripe
    ├─ Verify signature with STRIPE_WEBHOOK_SECRET
    ├─ Extract transaction ID
    ├─ Check for idempotency (prevent duplicates)
    │
    ├─ Extract order details:
    │   ├─ orderId
    │   ├─ amount
    │   └─ customer email
    │
    ├─ Payment Confirmed:
    │   ├─ UPDATE orders.status = "PAID"
    │   ├─ INSERT INTO child_purchases
    │   ├─ UPDATE children.total_points -= amount
    │   ├─ INSERT INTO pointsHistory
    │   ├─ Update product stock (if physical)
    │   ├─ IF physical: Create shipping request
    │   ├─ IF digital: Grant immediate access
    │   └─ Send confirmation email
    │
    ├─ IF paymentStatus = failure:
    │   ├─ UPDATE orders.status = "FAILED"
    │   └─ Send error notification
    │
    └─ Return 200 (Webhook acknowledged)

Admin sees:
├─ Order created
├─ Payment status
├─ Transaction ID
├─ Amount
├─ Shipping status (if physical)
└─ Refund option
```

---

## 🏪 Database Schema Relationships

```
CORE STRUCTURE:

┌─────────────┐
│   parents   │ (Primary account holders)
├─────────────┤
│ id (PK)     │
│ email (UQ)  │
│ password    │
│ name        │
│ verified    │
│ 2FA enabled │
└──────┬──────┘
       │
       │ 1:N (One parent to many children)
       │
       ▼
┌──────────────────┐
│    children      │ (Owned by parent)
├──────────────────┤
│ id (PK)          │
│ name             │
│ totalPoints      │
│ birthday         │
│ created_at       │
└──────┬───────────┘
       │
       │ 1:N (One child has many tasks)
       │
       ▼
┌──────────────────────────┐
│        tasks             │ (Assigned to child)
├──────────────────────────┤
│ id (PK)                  │
│ parentId (FK)            │
│ childId (FK)             │
│ question: text           │
│ answers: JSON array      │
│ pointsReward: integer    │
│ status: pending/completed│
│ createdAt: timestamp     │
└──────┬───────────────────┘
       │
       │ 1:N (Child attempts multiple times)
       │
       ▼
┌──────────────────────────┐
│      taskResults         │ (Attempt record)
├──────────────────────────┤
│ id (PK)                  │
│ taskId (FK)              │
│ childId (FK)             │
│ selectedAnswerId         │
│ isCorrect: boolean       │
│ pointsEarned: integer    │
│ completedAt: timestamp   │
└──────────────────────────┘


PRODUCTS & ORDERS:

┌─────────────────────┐
│      products       │
├─────────────────────┤
│ id (PK)             │
│ name: text          │
│ pointsPrice: int    │
│ price: decimal      │
│ stock: integer      │
│ productType: enum   │
└──────┬──────────────┘
       │
       │ 1:N (Product in multiple orders)
       │
       ▼
┌──────────────────────────┐
│      orders              │
├──────────────────────────┤
│ id (PK)                  │
│ parentId (FK) → parents  │
│ childId (FK) → children  │ (Optional: null if parent buys)
│ productId (FK) → products│
│ status: PENDING/PAID     │
│ totalAmount: decimal     │
│ createdAt: timestamp     │
└──────┬───────────────────┘
       │
       │ 1:N (One order → multiple items via orderItems)
       │
       ▼
┌──────────────────────────┐
│      transactions        │
├──────────────────────────┤
│ id (PK)                  │
│ orderId (FK)             │
│ provider: stripe/local   │
│ status: completed/failed │
│ amount: decimal          │
│ verifiedAt: timestamp    │
└──────────────────────────┘


AUTH & SECURITY:

┌─────────────────────────┐
│       admins            │
├─────────────────────────┤
│ id (PK)                 │
│ email: text (UQ)        │
│ password: bcrypt        │
│ role: superadmin/mod    │
│ createdAt: timestamp    │
└──────┬──────────────────┘
       │
       │ 1:N (Admin performs actions)
       │
       ▼
┌──────────────────────────┐
│     activity_log         │
├──────────────────────────┤
│ id (PK)                  │
│ adminId (FK) → admins    │
│ action: CREATE/UPDATE    │
│ entity: PRODUCT/PARENT   │
│ entityId: target record  │
│ meta: JSON (details)     │
│ createdAt: timestamp     │
└──────────────────────────┘


NOTIFICATIONS & MESSAGING:

┌─────────────────────────┐
│     notifications       │
├─────────────────────────┤
│ id (PK)                 │
│ parentId (FK, nullable) │
│ childId (FK, nullable)  │
│ type: gift_unlocked     │
│ title: text             │
│ message: text           │
│ isRead: boolean         │
│ style: toast/modal      │
│ createdAt: timestamp    │
└─────────────────────────┘

INDEXES (Sample):
├─ UNIQUE(parents.email) - Fast login lookup
├─ (parent_id, child_id) - Fast family queries
├─ (child_id, created_at) - Reverse chronological
├─ (status, created_at) - Filtering + sorting
├─ GIN(answers) - JSON field search
└─ BRIN(created_at) - Timestamp range queries
```

---

## 🔄 Caching Strategy

```
┌──────────────────────────────────────┐
│      REDIS CACHE LAYERS              │
├──────────────────────────────────────┤

Layer 1: SESSION/AUTH
├─ Key: session:{sessionId}
├─ Value: { userId, role, exp }
├─ TTL: 7 days (JWT expiry)
├─ Use: Quick auth check
└─ Cache hit rate: 99%

Layer 2: USER DATA
├─ Key: user:{userId}:profile
├─ Value: { name, email, points, ... }
├─ TTL: 1 hour
├─ Use: Dashboard quick load
├─ Invalidate on: Profile update
└─ Cache hit rate: 95%

Layer 3: CHILDREN DATA
├─ Key: parent:{parentId}:children
├─ Value: [{ id, name, points, ... }]
├─ TTL: 30 minutes
├─ Use: List page
├─ Invalidate on: Child added/updated
└─ Cache hit rate: 90%

Layer 4: TASKS LIST
├─ Key: child:{childId}:tasks
├─ Value: [{ id, question, status, ... }]
├─ TTL: 10 minutes
├─ Use: Task list view
├─ Invalidate on: New task / task completed
└─ Cache hit rate: 85%

Layer 5: PRODUCTS
├─ Key: products:{categoryId}
├─ Value: [{ id, name, price, stock, ... }]
├─ TTL: 2 hours
├─ Use: Store listings
├─ Invalidate on: Product added/stock changed
└─ Cache hit rate: 99%

Layer 6: SETTINGS
├─ Key: settings:app
├─ Value: { pointsPerTask, dailyLimit, ... }
├─ TTL: 24 hours
├─ Use: Config everywhere
├─ Invalidate on: Admin setting change
└─ Cache hit rate: 100% (rarely changes)

CACHE INVALIDATION EVENTS:
├─ On parent profile update → Delete user:*:profile
├─ On child created → Delete parent:*:children
├─ On new task → Delete child:*:tasks
├─ On task completed → Delete child:*:tasks, user:*:profile
├─ On product stock change → Delete products:*
└─ On setting change → Delete settings:*

CACHE MISSES STRATEGY:
├─ 1st request: Queries database
├─ Sets cache with TTL
├─ 2nd+ requests: Served from cache
├─ On cache miss: 
│   ├─ Check database
│   ├─ Set cache
│   └─ Return to user
```

---

## 📈 Scaling Architecture

```
CURRENT SETUP (Single Server):
┌─────────────────────────────────┐
│     Single VPS (Hostinger)      │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ Docker Compose              │ │
│ │ ├─ App (Express)            │ │
│ │ ├─ DB (PostgreSQL)          │ │
│ │ ├─ Cache (Redis)            │ │
│ │ ├─ Reverse Proxy (Traefik)  │ │
│ │ └─ Monitoring (7 tools)     │ │
│ └─────────────────────────────┘ │
│                                  │
│ Supports: 1,000 - 5,000 users    │
│ Response time: 100-500ms         │
│ Storage: Scalable (60+ GB)       │
└─────────────────────────────────┘


FUTURE: MULTI-SERVER SETUP (Kubernetes):
┌────────────────────────────────────────────────┐
│         Kubernetes Cluster (GKE/EKS)           │
├────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ Load Balancer (Layer 4)                  │  │
│  │ ├─ Distribute traffic to multiple pods  │  │
│  │ └─ SSL termination                      │  │
│  └──────────────────────────────────────────┘  │
│           ↓                                     │
│  ┌──────────────────────────────────────────┐  │
│  │ App Deployment (Pods) - 3 replicas      │  │
│  │ ├─ Pod 1: Express + Node.js             │  │
│  │ ├─ Pod 2: Express + Node.js             │  │
│  │ └─ Pod 3: Express + Node.js             │  │
│  │                                         │  │
│  │ Supports: 10,000 - 100,000 users        │  │
│  │ Response time: 50-200ms                 │  │
│  │ Auto-scaling: 3-10 pods based on load   │  │
│  └──────────────────────────────────────────┘  │
│           ↓                                     │
│  ┌──────────────────────────────────────────┐  │
│  │ Managed DB (Cloud SQL / RDS)             │  │
│  │ ├─ Multi-zone replication                │  │
│  │ ├─ Automatic backups                    │  │
│  │ ├─ Read replicas for analytics          │  │
│  │ └─ Supports: 100,000+ concurrent        │  │
│  └──────────────────────────────────────────┘  │
│           ↓                                     │
│  ┌──────────────────────────────────────────┐  │
│  │ Redis Cluster                            │  │
│  │ ├─ Sharded cache (3 nodes minimum)       │  │
│  │ ├─ 10+ GB memory                        │  │
│  │ └─ 50,000 operations/sec                │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ Message Queue (Kafka / RabbitMQ)         │  │
│  │ ├─ Async email delivery                 │  │
│  │ ├─ Webhook processing                   │  │
│  │ └─ Background jobs                      │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ CDN (CloudFlare / CloudFront)            │  │
│  │ ├─ Global image distribution            │  │
│  │ ├─ HTML caching (1 hour TTL)           │  │
│  │ └─ DDoS protection                      │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ Observability Stack                      │  │
│  │ ├─ Prometheus (metrics)                 │  │
│  │ ├─ Jaeger (tracing)                     │  │
│  │ ├─ ELK Stack (logging)                  │  │
│  │ └─ Grafana (dashboards)                 │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
└────────────────────────────────────────────────┘
```

---

## 🔍 Error Handling & Recovery

```
┌─────────────────────────────────────────┐
│     ERROR HANDLING HIERARCHY             │
├─────────────────────────────────────────┤

LEVEL 1: INPUT VALIDATION
├─ Zod schema validation
├─ Type checking
├─ Range validation
└─ Return: 400 BAD_REQUEST

LEVEL 2: AUTHORIZATION
├─ JWT token verification
├─ Role-based access check
├─ Resource ownership validation
└─ Return: 401/403 UNAUTHORIZED

LEVEL 3: BUSINESS LOGIC
├─ Insufficient funds → Return 422
├─ Invalid state transition → Return 422
├─ Resource not found → Return 404
└─ Conflict detected → Return 409

LEVEL 4: DATABASE ERRORS
├─ Foreign key constraint → Return 409
├─ Unique constraint → Return 409 (Duplicate)
├─ Connection timeout → Retry with exponential backoff
└─ Transaction failure → Rollback all

LEVEL 5: EXTERNAL SERVICE FAILURES
├─ Stripe API down:
│   └─ Queue webhook for retry
├─ Email service down:
│   └─ Store in outbox, retry later
├─ SMS provider down:
│   └─ Fallback to email
└─ All failures logged & observable

LEVEL 6: UNHANDLED ERRORS
├─ Log full stack trace
├─ Alert admin via Slack/Email
├─ Return generic 500 error to user
├─ Note: Never expose internal details
└─ Track in error tracking (Sentry)

RECOVERY STRATEGIES:

Circuit Breaker Pattern:
├─ 3 failures → Open circuit
├─ 30 seconds wait → Half-open
├─ Success → Close circuit
└─ Application continues with degraded functionality

Retry Logic:
├─ Exponential backoff: 1s, 2s, 4s, 8s, ...
├─ Max retries: 3
├─ Only for idempotent operations
└─ Include request ID for deduplication

Fallback Values:
├─ Cache stale data vs DB error
├─ Use defaults for settings
├─ Graceful degradation
└─ Notify user of degraded service
```

---

**Last Updated:** January 2025  
**Version:** 1.0  
**Status:** ✅ Complete Architecture Documentation
