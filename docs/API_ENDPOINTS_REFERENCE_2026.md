# 🔌 API Endpoints Reference — Classify (March 2026)
**خريطة نقاط النهاية (API Endpoints) الشاملة**

**Status**: ✅ Updated with School, Library, Teacher systems
**Last Updated**: March 19, 2026

Complete reference for all backend API endpoints organized by system.

---

## 📍 Base Configuration

- **Base URL**: `http://localhost:5000` (development)
- **API Version**: v1 (implicit)
- **Response Format**: JSON
- **Auth Header**: `Authorization: Bearer <token>`

---

## 🔐 Authentication Endpoints (`/api/auth`)

### Parent Authentication
```
POST   /api/auth/register              Register new parent account
POST   /api/auth/login                 Login with email + password
POST   /api/auth/request-otp           Request OTP code (SMS/Email)
POST   /api/auth/verify-otp            Verify OTP and complete 2FA
POST   /api/auth/logout                Logout (invalidate token)
POST   /api/auth/refresh               Refresh JWT token
```

### School Authentication (NEW)
```
POST   /api/auth/school/register       Register school account
POST   /api/auth/school/login          School login
POST   /api/auth/school/verify-email   Email verification for school
```

### Teacher Authentication (NEW)
```
POST   /api/auth/teacher/register      Register teacher account
POST   /api/auth/teacher/login         Teacher login
POST   /api/auth/teacher/join-school   Join school as teacher
```

### Library Authentication (NEW)
```
POST   /api/auth/library/register      Register library merchant
POST   /api/auth/library/login         Library login
POST   /api/auth/library/verify        Verify merchant account
```

### Social/OAuth Login
```
GET    /api/auth/oauth/:provider       Start OAuth flow (google/facebook)
GET    /api/auth/oauth/callback        OAuth redirect callback
```

---

## 👨‍👩‍👧 Family Management (`/api/family`)

```
GET    /api/family/children            List user's children
POST   /api/family/children            Add new child
PUT    /api/family/children/:id        Update child profile
DELETE /api/family/children/:id        Delete child
GET    /api/family/children/:id        Get child details
PUT    /api/family/children/:id/avatar Upload child avatar
```

---

## 📝 Tasks Management (`/api/tasks`)

### Parent Task Creation
```
POST   /api/tasks                      Create task locally
PUT    /api/tasks/:id                  Edit task
DELETE /api/tasks/:id                  Delete task
GET    /api/tasks                      List user's tasks
GET    /api/tasks/:id                  Get task details
POST   /api/tasks/:id/assign           Assign task to child
POST   /api/tasks/:id/complete         Mark task completed
```

### Task Marketplace
```
GET    /api/task-marketplace           List available tasks (teacher-created)
GET    /api/task-marketplace/search    Search tasks by title/subject
POST   /api/task-marketplace/filter    Filter by price/grade/subject
GET    /api/task-marketplace/:id       Get task details
POST   /api/task-cart/add              Add task to shopping cart
DELETE /api/task-cart/:id              Remove from cart
POST   /api/tasks/purchase             Bulk purchase from cart
```

### Child Task Tracking (Child App)
```
GET    /api/child/tasks                List tasks assigned to child
PUT    /api/child/tasks/:id/complete   Submit task completion
GET    /api/child/tasks/:id/details    Task full details
POST   /api/child/complete-game        Record game completion score
```

---

## 🎓 School System (`/api/schools`) — NEW

### School Management
```
POST   /api/schools                    Create school
GET    /api/schools                    List schools with filters
GET    /api/schools/:id                Get school profile
PUT    /api/schools/:id                Update school profile
DELETE /api/schools/:id                Delete school account
GET    /api/schools/:id/teachers       List teachers in school
GET    /api/schools/:id/stats          School statistics
POST   /api/schools/:id/verify         Request verification badge
```

### School Activity
```
GET    /api/schools/:id/activity       Activity log
GET    /api/schools/:id/students       List enrolled students
POST   /api/schools/:id/post           Create school post
GET    /api/schools/:id/posts          List school posts
```

### School Reviews
```
POST   /api/schools/:id/reviews        Submit school review
GET    /api/schools/:id/reviews        List reviews
GET    /api/schools/:id/rating         Get average rating
```

---

## 👨‍🏫 Teacher Platform (`/api/teachers`) — NEW

### Teacher Accounts
```
POST   /api/teachers                   Create teacher account
GET    /api/teachers                   List teachers with filters
GET    /api/teachers/:id               Get teacher profile
PUT    /api/teachers/:id               Update profile
DELETE /api/teachers/:id               Deactivate account
POST   /api/teachers/:id/join-school   Assign to school
```

### Teacher Tasks (Task Creation & Sales)
```
POST   /api/teacher-tasks              Create task for sale
GET    /api/teacher-tasks              List created tasks
PUT    /api/teacher-tasks/:id          Edit task listing
DELETE /api/teacher-tasks/:id          Unpublish task
GET    /api/teacher-tasks/:id/orders   View task orders
POST   /api/teacher-tasks/:id/duplicate Duplicate existing task
```

### Teacher Earnings & Payouts
```
GET    /api/teachers/:id/balance       Get earnings balance
GET    /api/teachers/:id/transactions  Transaction history
POST   /api/teachers/:id/withdraw      Request payout
GET    /api/teachers/:id/withdrawals   List withdrawal requests
PUT    /api/teachers/:id/withdrawals/:wid Confirm withdrawal
```

### Teacher Reviews & Ratings
```
GET    /api/teachers/:id/reviews       Get teacher reviews
POST   /api/teachers/:id/reviews       Submit review
GET    /api/teachers/:id/rating        Average rating
```

---

## 📚 Library System (`/api/libraries`) — NEW

### Library Merchant Accounts
```
POST   /api/libraries                  Register library merchant
GET    /api/libraries                  List libraries
GET    /api/libraries/:id              Get library profile
PUT    /api/libraries/:id              Update library info
DELETE /api/libraries/:id              Deactivate account
```

### Library Product Management
```
POST   /api/libraries/:id/products     Add product to library
GET    /api/libraries/:id/products     List library products
PUT    /api/libraries/:id/products/:pid Update product
DELETE /api/libraries/:id/products/:pid Remove product
GET    /api/libraries/:id/products/:pid/details Product details
```

### Library Orders & Sales
```
GET    /api/libraries/:id/orders       List orders
GET    /api/libraries/:id/orders/:oid  Order details
PUT    /api/libraries/:id/orders/:oid  Update order status
POST   /api/libraries/:id/orders/:oid/ship Mark shipped
POST   /api/libraries/:id/orders/:oid/deliver Confirm delivery
```

### Library Financials
```
GET    /api/libraries/:id/balance      Available balance + pending
GET    /api/libraries/:id/invoices     Daily invoices
GET    /api/libraries/:id/sales        Sales analytics
POST   /api/libraries/:id/withdraw     Request payout
GET    /api/libraries/:id/withdrawals  Payout requests
```

### Library Returns & Refunds
```
POST   /api/libraries/:id/returns      File return request
GET    /api/libraries/:id/returns      List returns
PUT    /api/libraries/:id/returns/:rid Approve/reject return
```

---

## 🛒 Store & Marketplace (`/api/store`, `/api/marketplace`)

### Product Browsing
```
GET    /api/store/products             List all products
GET    /api/store/products/featured    Featured products
GET    /api/store/products/search      Search products
GET    /api/store/products/:id         Product details
GET    /api/store/categories           Product categories
GET    /api/store/categories/:id       Category details
```

### Universal Marketplace Search (NEW)
```
GET    /api/search                     Universal search (specify type)
GET    /api/search?type=schools        Search schools only
GET    /api/search?type=teachers       Search teachers only
GET    /api/search?type=tasks          Search tasks only
GET    /api/search?limit=10&offset=0   Pagination support
```

### Library Products in Store (NEW)
```
GET    /api/store/library-products     List library merchant products
GET    /api/store/library-products/search Search library products
GET    /api/store/library-products/:id Product from library
```

### Shopping Cart
```
POST   /api/cart/add                   Add item to cart
DELETE /api/cart/:id                   Remove item
PUT    /api/cart/:id/quantity          Update quantity
GET    /api/cart                       View cart
DELETE /api/cart                       Clear cart
POST   /api/cart/checkout              Initiate payment
```

### Orders
```
POST   /api/orders                     Create order
GET    /api/orders                     List user orders
GET    /api/orders/:id                 Order details
PUT    /api/orders/:id/status          Update order status
POST   /api/orders/:id/cancel          Cancel order
GET    /api/orders/:id/tracking        Shipment tracking
```

---

## 💳 Payments & Wallet (`/api/payments`, `/api/wallet`)

### Payment Processing
```
POST   /api/payments/create            Initialize payment
GET    /api/payments/:id/status        Check payment status
POST   /api/payments/callback          Payment gateway callback
POST   /api/payments/verify            Verify payment manually
```

### Wallet Management
```
GET    /api/wallet                     Get user wallet balance
POST   /api/wallet/topup               Add funds to wallet
GET    /api/wallet/transactions        Transaction history
POST   /api/wallet/transfer            Transfer between users
GET    /api/wallet/breakdown           Balance breakdown (earned/purchased)
```

### Payment Methods
```
GET    /api/payment-methods            List available payment methods
POST   /api/payment-methods            Add new payment method
PUT    /api/payment-methods/:id        Update payment method
DELETE /api/payment-methods/:id        Remove payment method
```

---

## 🎁 Gifts & Rewards (`/api/gifts`, `/api/rewards`)

### Gift Management
```
POST   /api/gifts                      Send gift to child
GET    /api/gifts                      List received gifts
GET    /api/gifts/:id                  Gift details
POST   /api/gifts/:id/redeem           Redeem gift coupon
```

### Rewards & Points
```
GET    /api/rewards/balance            Get points balance
GET    /api/rewards/history            Points transaction history
POST   /api/rewards/claim              Claim achievement reward
GET    /api/rewards/achievements       List earned achievements
```

### Reward Offers (NEW)
```
GET    /api/reward-offers              List active offers
GET    /api/reward-offers/:id          Offer details
POST   /api/reward-offers/:id/redeem   Use reward offer
```

---

## 📢 Notifications (`/api/notifications`)

```
GET    /api/notifications              List notifications
PUT    /api/notifications/:id/read     Mark as read
DELETE /api/notifications/:id          Delete notification
DELETE /api/notifications              Clear all
POST   /api/notifications/preferences  Set notification preferences
GET    /api/notifications/settings     Get notification settings
```

### Admin Notifications (Bulk)
```
POST   /api/admin/notifications/send   Send bulk notification
GET    /api/admin/notifications/history Notification history
```

---

## 🎮 Games (`/api/games`)

```
GET    /api/games                      List all games
GET    /api/games/:id                  Game details + embed URL
POST   /api/games/:id/start            Record game start
POST   /api/games/:id/score            Submit game score
GET    /api/games/:id/leaderboard      Top scores
GET    /api/child/games                Child's assigned games
POST   /api/child/games/:id/play       Log game play session
```

---

## 👤 User Profiles

### Parent Profile
```
GET    /api/parent/profile             Current user profile
PUT    /api/parent/profile             Update profile
POST   /api/parent/avatar              Upload avatar
PUT    /api/parent/settings            Update settings
```

### Child Profile
```
GET    /api/child/profile              Child profile
PUT    /api/child/profile              Update child profile
POST   /api/child/avatar               Upload avatar
GET    /api/:childId/public-profile    Public profile (shareable)
```

### Admin Profile
```
GET    /api/admin/profile              Admin profile
PUT    /api/admin/profile              Update admin profile
```

---

## 👮 Admin Management (`/api/admin`)

### Dashboard & Monitoring
```
GET    /api/admin/dashboard            Dashboard stats
GET    /api/admin/analytics            Financial analytics
GET    /api/admin/activity-log         Activity log (audit)
```

### User Management
```
GET    /api/admin/parents              List parent accounts
GET    /api/admin/parents/:id          Parent details
PUT    /api/admin/parents/:id/status   Enable/disable account
DELETE /api/admin/parents/:id          Delete parent account
```

### Product Management
```
POST   /api/admin/products             Add product
GET    /api/admin/products             List products
PUT    /api/admin/products/:id         Edit product
DELETE /api/admin/products/:id         Delete product
GET    /api/admin/products/:id/sales   Product sales data
```

### Category Management
```
POST   /api/admin/categories           Create category
GET    /api/admin/categories           List categories
PUT    /api/admin/categories/:id       Update category
DELETE /api/admin/categories/:id       Delete category
```

### Symbols/Emojis (NEW)
```
POST   /api/admin/symbols              Add symbol
GET    /api/admin/symbols              List symbols
PUT    /api/admin/symbols/:id          Update symbol
DELETE /api/admin/symbols/:id          Remove symbol
GET    /api/admin/symbols             Get by category
```

### Settings Management (NEW)
```
GET    /api/admin/settings             Get all settings
PUT    /api/admin/settings/:key        Update setting
GET    /api/admin/settings/:key        Get specific setting
PUT    /api/admin/app-settings         Update app-wide settings
```

### Task Notification Policies (NEW)
```
GET    /api/admin/notifications/policies       Global notification policy
PUT    /api/admin/notifications/policies       Update global policy
GET    /api/admin/notifications/child-policies List child overrides
POST   /api/admin/notifications/child-policies Create override
```

### Growth Tree/Garden (NEW)
```
GET    /api/admin/growth-trees         Garden seed catalog
PUT    /api/admin/growth-trees         Update seed pricing
POST   /api/admin/growth-trees/seeds   Add new seed type
```

### Mobile App Management (NEW)
```
POST   /api/admin/mobile-app/apk       Upload APK build
GET    /api/admin/mobile-app/builds    List app builds
PUT    /api/admin/mobile-app/builds/:id Update build info
GET    /api/mobile-app/latest          Download latest APK
```

### School Management (NEW)
```
GET    /api/admin/schools              List schools
PUT    /api/admin/schools/:id/status   Verify/reject school
POST   /api/admin/schools/:id/teachers Manage school teachers
```

### Library Merchant Review (NEW)
```
GET    /api/admin/libraries/products   Products for review
PUT    /api/admin/libraries/products/:pid Review product
POST   /api/admin/libraries/products/:pid/approve Approve product
POST   /api/admin/libraries/products/:pid/reject Reject product
```

### Order Management
```
GET    /api/admin/orders               All orders
PUT    /api/admin/orders/:id           Update order status
```

### Financial Management
```
GET    /api/admin/wallets              Wallet analytics
GET    /api/admin/payments             Payment analytics
GET    /api/admin/payouts              Payout requests
```

---

## 🔒 Security Specifications

### Authentication Token Types
- `parent-token`: JWT with scope `parent`
- `child-token`: JWT with scope `child` (read-only)
- `admin-token`: JWT with scope `admin`
- `teacher-token`: JWT with scope `teacher` (NEW)
- `library-token`: JWT with scope `library` (NEW)
- `school-token`: JWT with scope `school` (NEW)

### Rate Limiting
```
/api/auth/login             5 attempts / 15 minutes per IP
/api/auth/request-otp       5 requests / 1 hour per email
/api/payments/callback      No limit (trusted webhook)
/api/search                 100 requests / 1 minute per parent
/api/store/products         No limit (public)
```

---

## 📊 Error Response Format

All errors return this structure:
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable message"
}
```

### Common Error Codes
- `UNAUTHORIZED` — No token or invalid token
- `FORBIDDEN` — Token valid but insufficient permissions
- `NOT_FOUND` — Resource doesn't exist
- `BAD_REQUEST` — Invalid input data
- `PARENT_CHILD_MISMATCH` — Parent doesn't own this child
- `OTP_EXPIRED` — OTP code expired or invalid
- `RATE_LIMITED` — Too many requests
- `PAYMENT_FAILED` — Payment processing error
- `INTERNAL_SERVER_ERROR` — Server error

---

## 🔄 Webhook Endpoints (Receive Only)

```
POST   /api/webhooks/stripe           Stripe payment callback
POST   /api/webhooks/sms              SMS provider callback
POST   /api/webhooks/email            Email provider callback
POST   /api/webhooks/inHome           In-Home logistics updates
```

---

## 📈 Status & Monitoring

```
GET    /api/health                    Server health check
GET    /api/health/db                 Database connectivity
GET    /api/version                   Current API version
GET    /api/status                    Platform status page
```

---

**Document Status**: ✅ COMPLETE
**Total Endpoints**: 150+
**Last Updated**: March 19, 2026
