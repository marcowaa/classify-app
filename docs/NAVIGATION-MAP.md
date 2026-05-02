# 🗺️ خريطة المسارات الشاملة - Classify App

> **تاريخ التحليل:** 19 مارس 2026 ✅  
> **الإصدار:** 3.0 (تحليل عميق شامل جداً)  
> **الحالة:** تحليل عميق + إحصائيات فعلية موثقة  
> **📖 للتفاصيل الكاملة:** انظر [DEEP-NAVIGATION-ANALYSIS.md](DEEP-NAVIGATION-ANALYSIS.md)

---

## 📊 إحصائيات دقيقة (موثقة من الكود)

| الفئة | العدد | التفاصيل |
|--------|------|---------|
| **صفحات Frontend** | 59 | مكونات React مختلفة |
| **نقاط API Backend** | 815 | موزعة على 25 ملف |
| **مسارات الخادم** | 25 | منظمة حسب المجال |
| **مسارات محمية** | 80+ | تحتاج JWT authentication |
| **مسارات عامة** | 35+ | متاحة بدون تحقق |
| **الأدوار المختلفة** | 5 | Parent, Child, Admin, School, Teacher |
| **جداول Database** | 169 | مع 120+ علاقة |
| **خدمات Biz Logic** | 23 | معالجة منطق معقد |
| **Hooks مخصصة** | 16 | إدارة حالة متقدمة |
| **مكونات React** | 159 | متوسط 2.7 لكل صفحة |

---

## 📈 توزيع الـ Endpoints حسب الملف

```
📊 توزيع الـ 815 Endpoint حسب الملف الرئيسي:

admin.ts           ░░░░░░░░░░░░░░░░░░░░░░░░░░  214 (26%)
parent.ts          ░░░░░░░░░░░░░░░░░░░░          161 (20%)
child.ts           ░░░░░░░░░░░░░░░░░░           130 (16%)
school.ts          ░░░░░                         63 (8%)
teacher.ts         ░░░░░                         61 (7%)
auth.ts            ░░░░                          51 (6%)
[19 ملف آخر]       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 135 (17%)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
المجموع: 815 endpoint في 25 ملف مسار
```

---

## 🏗️ البنية العامة للتطبيق

```
Classify App
│
├── 🌐 Frontend (React + Vite)
│   ├── client/src/
│   │   ├── pages/          (59 صفحة + 159 مكون)
│   │   ├── components/     (مكونات مشتركة)
│   │   ├── hooks/          (16 hook مخصص)
│   │   ├── contexts/       (Context API)
│   │   ├── lib/            (utilities)
│   │   └── App.tsx         (توجيه رئيسي)
│   │
│   └── المسارات:
│       ├── عام (Public)       → /, /download, /privacy, /terms
│       ├── مصادقة (Auth)      → /parent-auth, /child-link, /otp
│       ├── والد (Parent)      → /parent-dashboard, /parent-tasks
│       ├── طفل (Child)        → /child-games, /child-tasks
│       ├── ألعاب (Games)      → /child-games, /trial-games
│       ├── إدارة (Admin)      → /admin-dashboard
│       └── آخرى              → /settings, /notifications, /wallet
│
├── 🖥️ Backend (Node.js + Express)
│   ├── server/
│   │   ├── routes/         (25 ملف مسار)
│   │   ├── services/       (خدمات)
│   │   ├── middleware/     (تحقق وحماية)
│   │   ├── validators/     (التحقق من البيانات)
│   │   └── index.ts        (نقطة الدخول)
│   │
│   └── المسارات API:
│       ├── /api/auth/*          → تسجيل/دخول
│       ├── /api/parent/*        → مسارات الوالد
│       ├── /api/child/*         → مسارات الطفل
│       ├── /api/admin/*         → مسارات الإدارة
│       ├── /api/payments/*      → الدفع
│       ├── /api/store/*         → المتجر
│       ├── /api/teacher/*       → المعلمين
│       ├── /api/school/*        → المدارس
│       ├── /api/library/*       → المكتبات
│       └── /api/marketplace/*   → سوق المهام
│
└── 💾 Database (PostgreSQL + Drizzle ORM)
    ├── parents            (الآباء)
    ├── children           (الأطفال)
    ├── tasks              (المهام)
    ├── products           (المنتجات)
    ├── orders             (الطلبات)
    ├── wallets            (المحافظ)
    ├── notifications      (الإشعارات)
    └── مجموعات أخرى
```

---

## 🚦 خارطة المسارات الرئيسية

### 📍 الصفحة الرئيسية (Home Page)

```
/ (Home)
│
├── [Hero Section]
│   ├── Logo & Welcome
│   └── Call-to-Action
│
├── [Account Selection]
│   ├── 👨‍💼 Parent Button  → /parent-auth
│   └── 👧 Child Button   → /child-link
│
└── [Footer Links]
    ├── Privacy      → /privacy
    ├── Terms        → /terms
    ├── About        → /about
    └── Contact      → /contact
```

---

## 🔐 مسارات المصادقة (Authentication)

```
1️⃣ تسجيل الوالد (Parent Registration)
   /parent-auth (register tab)
   ↓
   [Input: الاسم، البريد، كلمة المرور، إلخ]
   ↓
   POST /api/auth/register
   ↓
   /otp (التحقق من OTP)
   ↓
   /parent-dashboard ✅

2️⃣ دخول الوالد (Parent Login)
   /parent-auth (login tab)
   ↓
   [Input: البريد/الهاتف، كلمة المرور]
   ↓
   POST /api/auth/login
   ↓
   /otp (التحقق من OTP) - إذا مفعل
   ↓
   /parent-dashboard ✅

3️⃣ ربط الطفل (Child Linking)
   /child-link
   ↓
   [Input: اسم الطفل، كود الربط]
   ↓
   POST /api/child/link
   ↓
   /child-games ✅

4️⃣ تسجيل دخول الطفل (Child Login)
   /child-link
   ↓
   [Quick Select من قائمة الأطفال]
   ↓
   POST /api/child/login
   ↓
   /child-games ✅

5️⃣ دخول الأدمن (Admin Login)
   /admin
   ↓
   [Input: البريد، كلمة المرور]
   ↓
   POST /api/admin/login
   ↓
   /admin-dashboard ✅
```

---

## 👨‍💼 مسارات الوالد (Parent Routes)

```
/parent-dashboard (لوحة الوالد الرئيسية)
│
├── 📊 Overview Tab
│   ├── Dashboard Stats
│   ├── Children Overview
│   ├── Quick Actions
│   └── Recent Activity
│
├── 👨‍👩‍👧‍👦 Children Tab
│   ├── Add Child → /parent-dashboard?tab=children&action=add
│   ├── Edit Child
│   ├── View Child Profile
│   ├── Show QR Code
│   └── Delete Child
│
├── 📝 Tasks Tab
│   ├── Browse Classy Tasks
│   ├── My Custom Tasks
│   ├── Public Marketplace Tasks
│   ├── Create New Task
│   ├── Edit Task
│   ├── Send/Schedule Task
│   └── View Scheduled Tasks
│
├── 🛒 Store Tab
│   ├── Browse Products
│   ├── Shop → /parent-store
│   ├── View Inventory → /parent-inventory
│   ├── View Orders
│   └── Checkout → /task-cart
│
├── 🤝 Referral Tab
│   ├── Show Referral Code
│   ├── Copy Code
│   ├── Share on Social
│   └── View Referral History
│
├── 📊 Reports Tab
│   ├── Select Child
│   ├── View Performance Graph
│   ├── View Tasks Completion
│   ├── View Points History
│   ├── View Time Spent
│   └── View Subjects Progress
│
└── Header Actions
    ├── Notifications → /notifications
    ├── Theme Toggle
    ├── Language Selector
    ├── Settings → /settings
    └── Logout
```

---

## 👧 مسارات الطفل (Child Routes)

```
/child-games (الصفحة الرئيسية للطفل)
│
├── [Navigation]
│   ├── Games        (current)
│   ├── Tasks        → /child-tasks
│   ├── Store        → /child-store
│   ├── Gifts        → /child-gifts
│   ├── Rewards      → /child-rewards
│   ├── Progress     → /child-progress
│   ├── Discover     → /child-discover
│   ├── Notifications → /child-notifications
│   ├── Settings     → /child-settings
│   └── Logout
│
├── 🎮 Games Section
│   ├── Display Available Games
│   ├── Play Game → /game-iframe
│   └── Track Completion
│
├── 🌱 Growth Tree
│   ├── Show Level Progress
│   ├── Display Milestones
│   └── Unlock Rewards
│
├── 📝 Pending Tasks Preview
│   └── Go to Tasks → /child-tasks
│
└── ⭐ Points Display
    └── Show Current Balance
```

---

## 🎮 مسارات الألعاب (Game Routes)

```
/child-games (الألعاب الرئيسية)
├── Cat Kingdom 🐱
├── Ice Kingdom ❄️
├── Gem Kingdom 💎
├── Memory Kingdom 🧠
├── Math Challenge 🔢
├── Fruit Adventure 🐍
└── [More Games...]

/trial-games (ألعاب تجريبية)
├── First Game Preview
├── Play Limited Version
└── Upgrade to Full Access

/match3 (لعبة Match-3)
└── Puzzle Gameplay

/memory-match (لعبة الذاكرة)
└── Memory Gameplay
```

---

## 🛒 مسارات المتجر (Store Routes)

### Marketplace

```
/parent-store (متجر الوالد)
├── Browse Products
├── Search & Filter
├── View Product Details
├── Add to Cart
├── Checkout → /task-cart
└── View Order History

/child-store (متجر الطفل)
├── Browse Products
├── View Using Points
├── Add to Cart
├── Redeem/Checkout
└── Confirm Purchase

/parent-inventory (مخزون الوالد)
├── View Owned Products
├── Assign to Child
├── Gift to Friend
└── Sell/Trade

/task-cart (سلة المهام/المنتجات)
├── Review Items
├── Update Quantities
├── Apply Coupon
├── Choose Payment Method
└── Checkout

/task-marketplace (سوق المهام)
├── Browse Available Tasks
├── Sort & Filter
├── View Task Details
└── Purchase for Use

/library-store (متجر المكتبة)
├── Browse Library Products
├── View Library Info
└── Purchase from Library

/subjects (المواد الدراسية)
├── View Available Subjects
├── Browse Subject Content
└── View Related Tasks
```

---

## 📚 مسارات المدارس والمعلمين (School & Teacher)

```
/school/login (دخول المدرسة)
├── Admin Login
└── POST /api/school/login

/school/dashboard (لوحة المدرسة)
├── View School Stats
├── Manage Teachers
├── Manage Students
├── View Reports
└── Settings

/school/:id (ملف المدرسة)
├── Public School Profile
├── View Teachers
├── View Student Count
└── Contact Info

/teacher/login (دخول المعلم)
├── Email/Phone Login
└── POST /api/teacher/login

/teacher/dashboard (لوحة المعلم)
├── View Classes
├── View Students
├── Create Assignments
├── Grade Work
└── View Reports

/teacher/:id (ملف المعلم)
├── Public Teacher Profile
├── View Classes
├── View Subject Specialties
└── Contact Info

/library/login (دخول المكتبة)
├── Library Admin Login
└── POST /api/library/login

/library/dashboard (لوحة المكتبة)
├── Manage Products
├── View Sales
├── Manage Referrals
└── Settings

/library/:id (ملف المكتبة)
├── Public Library Profile
├── Browse Products
└── Contact Info
```

---

## ⚙️ مسارات الإدارة (Admin Routes)

```
/admin (دخول الأدمن)
├── Email/Password Login
└── POST /api/admin/login

/admin-dashboard (لوحة الأدمن)
├── 📊 Dashboard Tab
│   ├── Key Metrics
│   ├── Recent Activity
│   └── System Health
│
├── 💹 Profit System Tab
│   ├── View Earnings
│   ├── View Distributions
│   └── Manage Commissions
│
├── 👨 Parents Tab
│   ├── List All Parents
│   ├── Search/Filter
│   ├── View Parent Details
│   ├── Approve/Reject
│   └── Take Actions
│
├── 📚 Subjects Tab
│   ├── List Subjects
│   ├── Add Subject
│   ├── Edit Subject
│   └── Delete Subject
│
├── 📁 Categories Tab
│   ├── Manage Store Categories
│   ├── Add/Edit/Delete
│   └── Reorder Categories
│
├── ⭐ Symbols Tab
│   ├── Browse Symbol Library
│   ├── Upload Symbols
│   ├── Manage Collections
│   └── Category Management
│
├── 🛍️ Products Tab
│   ├── List All Products
│   ├── Add Product
│   ├── Edit Product
│   ├── Upload Images
│   └── Manage Inventory
│
├── 👥 Users Tab
│   ├── List All Children
│   ├── Search/Filter
│   ├── View User Profile
│   ├── Ban/Unban
│   └── View Activity
│
├── 💰 Wallets Tab
│   ├── View All Wallets
│   ├── Check Balances
│   ├── Process Refunds
│   └── View Transactions
│
├── 📦 Orders Tab
│   ├── List All Orders
│   ├── View Order Details
│   ├── Change Status
│   └── Track Shipment
│
├── 💳 Deposits Tab
│   ├── Review Pending
│   ├── Approve/Reject
│   ├── View History
│   └── Generate Reports
│
├── 💳 Payment Methods Tab
│   ├── Manage Methods
│   ├── Add/Remove
│   ├── View Balances
│   └── Settlement Info
│
├── 📈 Analytics Tab
│   ├── Revenue Charts
│   ├── User Statistics
│   ├── Product Performance
│   └── Export Reports
│
├── 📋 Activity Log Tab
│   ├── View All Activity
│   ├── Filter by Type
│   ├── Search Activity
│   └── Export Logs
│
├── 🔔 Notifications Tab
│   ├── Send Notifications
│   ├── View Sent History
│   ├── Manage Templates
│   └── Configure Settings
│
├── 🤝 Referrals Tab
│   ├── View All Referrals
│   ├── Manage Codes
│   ├── View Statistics
│   └── Process Payouts
│
├── 📢 Ads Tab
│   ├── Manage Ads
│   ├── Upload Ad Content
│   ├── Schedule Campaigns
│   └── View Analytics
│
├── 📖 Libraries Tab
│   ├── Manage Libraries
│   ├── Approve/Reject
│   ├── View Statistics
│   └── Manage Products
│
├── 🔐 Social Login Tab
│   ├── Configure Providers
│   ├── Add/Remove Providers
│   ├── View Settings
│   └── Test Integration
│
├── 📱 OTP Providers Tab
│   ├── Manage OTP Services
│   ├── Configure Services
│   ├── Check Status
│   └── View Statistics
│
├── 🔍 SEO Tab
│   ├── Meta Tags Management
│   ├── Sitemap Setting
│   ├── Robot.txt
│   └── Rich Snippets
│
├── 📞 Support Settings Tab
│   ├── Configure Support Channels
│   ├── Email Settings
│   ├── WhatsApp Integration
│   └── Response Templates
│
└── ⚙️ Settings Tab
    ├── General Settings
    ├── Email Configuration
    ├── SMS Configuration
    ├── Payment Gateway
    └── Security Settings
```

---

## 🔗 مسارات النظام (System Routes)

```
/settings (الإعدادات العامة)
├── 👤 Profile Tab
│   ├── View Profile
│   ├── Edit Name
│   ├── Edit Email
│   ├── Edit Phone
│   └── Update Avatar
│
├── 🔐 Security Tab
│   ├── Change Password
│   ├── Two-Factor Auth
│   ├── Trusted Devices
│   └── Delete Account
│
├── 🎨 Appearance Tab
│   ├── Theme Toggle
│   ├── Language Selector
│   └── Font Size
│
└── 📞 Contact Tab
    ├── Phone Number
    ├── Email Address
    ├── WhatsApp Number
    └── Social Links

/wallet (المحفظة)
├── View Balance
├── Add Payment Method
├── Make Deposit
├── View History
└── Download Statements

/notifications (الإشعارات)
├── View All Notifications
├── Mark as Read
├── Filter by Type
├── Delete Notifications
└── Notification Settings

/privacy (سياسة الخصوصية)
├── Privacy Policy Text
└── Accept/Reject

/terms (شروط الاستخدام)
├── Terms of Service Text
└── Accept/Reject

/privacy-policy (تفاصيل الخصوصية)
└── Full Privacy Policy

/accessibility (إمكانية الوصول)
└── Accessibility Guidelines

/cookie-policy (سياسة الكوكيز)
└── Cookie Information

/refund-policy (سياسة الاسترجاع)
└── Refund Information

/acceptable-use (الاستخدام المقبول)
└── Usage Guidelines

/legal (المركز القانوني)
├── All Legal Documents
├── Privacy Policy
├── Terms of Service
├── Cookies Policy
├── Refund Policy
└── Acceptable Use Policy

/about (من نحن)
├── Company Information
├── Team
├── Mission & Vision
└── Contact Info

/contact (اتصل بنا)
├── Contact Form
├── Phone Number
├── Email Address
├── WhatsApp Link
└── Address

/delete-account (حذف الحساب)
├── Confirmation Message
├── Reason Selection
├── Password Confirmation
└── Delete Button

/download (تنزيل التطبيق)
├── iOS Link
├── Android Link
├── Web App
└── PWA Installation
```

---

## 📊 خريطة تدفق البيانات (Data Flow)

```
┌─────────────────────────────────────────┐
│     Frontend (React)                    │
│   • useState, useQuery, useMutation      │
│   • Wouter for routing                  │
│   • Tanstack Query for caching          │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│     API Layer                           │
│   • API hooks (/lib/api.ts)             │
│   • Error handling                      │
│   • Token management                    │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│     Backend (Express)                   │
│   • Routes (/server/routes/)            │
│   • Middleware (auth, validation)       │
│   • Services (business logic)           │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│     Database (PostgreSQL)               │
│   • Drizzle ORM                         │
│   • Migrations                          │
│   • Relationships                       │
└─────────────────────────────────────────┘
```

---

## 🔐 الأدوار والصلاحيات (Roles & Permissions)

```
1. Parent (الوالد)
   ✓ Create/edit/delete children
   ✓ Browse and create tasks
   ✓ Send tasks to children
   ✓ Purchase gifts
   ✓ View reports
   ✗ Can't access child games
   ✗ Can't modify admin settings

2. Child (الطفل)
   ✓ Play games
   ✓ Complete tasks
   ✓ Earn points
   ✓ Browse store
   ✓ Redeem rewards
   ✗ Can't create tasks
   ✗ Can't view other children's data

3. Admin (الإدارة)
   ✓ Manage all content
   ✓ View analytics
   ✓ Process payments
   ✓ Ban users
   ✓ Configure system
   ✗ Can't impersonate users (by default)

4. School (المدرسة)
   ✓ Manage teachers
   ✓ View class results
   ✓ Create assignments
   ✓ Export reports
   ✗ Can't access student personal data
   ✗ Can't modify system settings

5. Teacher (المعلم)
   ✓ Create assignments
   ✓ Grade work
   ✓ View class stats
   ✓ Communicate with students
   ✗ Can't modify curriculum
   ✗ Can't access other classes

6. Library (المكتبة)
   ✓ Sell products
   ✓ View sales analytics
   ✓ Manage referrals
   ✗ Can't access private user data
   ✗ Can't modify platform rules
```

---

## 📡 نقاط النهاية الرئيسية (Main Endpoints)

### Authentication API

```
POST /api/auth/check-email
POST /api/auth/register
POST /api/auth/login
POST /api/auth/request-otp
POST /api/auth/verify-otp
POST /api/auth/logout
POST /api/auth/refresh-token
GET  /api/auth/session
```

### Parent API

```
GET    /api/parent/profile
PUT    /api/parent/profile
GET    /api/parent/children
POST   /api/parent/children
PUT    /api/parent/children/:id
DELETE /api/parent/children/:id
POST   /api/parent/tasks
GET    /api/parent/tasks
PUT    /api/parent/tasks/:id
DELETE /api/parent/tasks/:id
GET    /api/parent/wallet
POST   /api/parent/wallet/deposit
GET    /api/parent/wallet/transactions
POST   /api/parent/wallet/refund
```

### Child API

```
POST   /api/child/link
POST   /api/child/login
POST   /api/child/logout
GET    /api/child/profile
PUT    /api/child/profile
GET    /api/child/games
POST   /api/child/complete-game
GET    /api/child/tasks
POST   /api/child/answer-task
GET    /api/child/gifts
POST   /api/child/redeem-reward
GET    /api/child/notifications
GET    /api/child/progress
GET    /api/child/inventory
POST   /api/child/follow
GET    /api/child/posts
POST   /api/child/posts
```

### Payment API

```
POST /api/payments/checkout
POST /api/payments/webhook
GET  /api/payments/history
POST /api/payments/refund
```

### Store API

```
GET    /api/store/products
GET    /api/store/products/:id
POST   /api/store/purchase
GET    /api/store/orders
```

### Admin API

```
POST   /api/admin/login
GET    /api/admin/dashboard
GET    /api/admin/users
GET    /api/admin/reports
POST   /api/admin/actions
```

---

## 🔄 معلومات الحالة والتخزين المؤقت (State & Caching)

```
Frontend State Management:
├── React Context
│   ├── AuthContext (user, token, role)
│   ├── ThemeContext (dark/light mode)
│   └── LanguageContext (i18n)
│
├── Tanstack Query (for API caching)
│   ├── Parent data: stale time 5min
│   ├── Child data: stale time 3min
│   ├── Products: stale time 10min
│   └── User profile: stale time 1hour
│
└── Local Storage
    ├── Theme preference
    ├── Language preference
    ├── Cached tokens
    └── User preferences

Backend Caching:
├── Redis (if configured)
│   ├── Session tokens
│   ├── OTP codes
│   └── Rate limits
│
└── Database Indexes
    ├── user authentication
    ├── child-parent relations
    ├── task queries
    └── product searches
```

---

## 🚀 مسارات التطوير والإنتاج (Development & Production)

```
Development Environment
├── http://localhost:5000
├── Vite dev server
├── Hot Module Replacement
├── Console logs enabled
└── All features enabled

Production Environment
├── https://classify.app
├── Vite build output
├── Minified & optimized
├── Console logs disabled
├── Feature flags
└── Rate limiting enabled
```

---

## 📈 مؤشرات الأداء الرئيسية (KPIs)

```
يتم تتبعها بواسطة /api/admin/analytics:

User Metrics:
├── DAU (Daily Active Users)
├── MAU (Monthly Active Users)
├── Retention Rate
└── Conversion Rate

Financial Metrics:
├── Total Revenue
├── Average Order Value
├── Refund Rate
└── Payment Success Rate

Content Metrics:
├── Tasks Created
├── Games Played
├── Average Playtime
└── Completion Rate

Performance Metrics:
├── Page Load Time
├── API Response Time
├── Error Rate
└── Uptime %
```

---

**آخر تحديث:** 19 مارس 2026  
**من قبل:** GitHub Copilot  
**الحالة:** تم تحليله وتحديثه بالكامل ✅

                                    ┌─────────────────────────────────────────┐
                                    │         🏠 لوحة التحكم الرئيسية          │
                                    │          /parent-dashboard              │
                                    └────────────────────┬────────────────────┘
                                                         │
    ┌────────────────────────────────────────────────────┼────────────────────────────────────────────────────┐
    │                                                    │                                                    │
    │                         ┌──────────────────────────┴──────────────────────────┐                         │
    │                         │                                                      │                         │
    ▼                         ▼                                                      ▼                         ▼
┌─────────┐           ┌──────────────┐                                        ┌──────────────┐           ┌─────────┐
│ Header  │           │    Tabs      │                                        │ Quick Actions│           │ Cards   │
│ الهيدر   │           │   التبويبات   │                                        │ أزرار سريعة  │           │ البطاقات │
└────┬────┘           └──────┬───────┘                                        └──────┬───────┘           └────┬────┘
     │                       │                                                       │                        │
     ▼                       ▼                                                       ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              أزرار الهيدر (Header Buttons)                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

    🔔 [notifications]  →  /notifications (صفحة الإشعارات)
    ☀️ [theme-toggle]   →  تبديل الوضع الليلي/النهاري
    🌍 [language]       →  تغيير اللغة (عربي/إنجليزي)
    ⚙️ [settings]       →  /settings (صفحة الإعدادات)
    🚪 [logout]         →  / (تسجيل خروج → الصفحة الرئيسية)

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              التبويبات الرئيسية (Main Tabs)                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┬──────────────────┬──────────────────┬──────────────────┬──────────────────┬──────────────────┐
    │                  │                  │                  │                  │                  │                  │
    ▼                  ▼                  ▼                  ▼                  ▼                  ▼
┌────────┐      ┌────────────┐      ┌────────────┐      ┌────────────┐      ┌────────────┐      ┌────────────┐
│Overview│      │  Children  │      │   Tasks    │      │   Store    │      │  Referral  │      │  Reports   │
│ نظرة   │      │  الأطفال    │      │  المهام    │      │  المتجر    │      │  الإحالات  │      │  التقارير  │
│ عامة   │      │            │      │            │      │            │      │            │      │            │
└───┬────┘      └─────┬──────┘      └─────┬──────┘      └─────┬──────┘      └─────┬──────┘      └─────┬──────┘
    │                 │                   │                   │                   │                   │
    ▼                 ▼                   ▼                   ▼                   ▼                   ▼

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 TAB: Overview (نظرة عامة)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    ┌─────────────────────────────────────────────────────────────────────────────────────────┐
    │                              بطاقة كود الربط (Link Code Card)                           │
    │                                                                                         │
    │   👁️ [toggle-code]    →   إظهار/إخفاء الكود                                             │
    │   📋 [copy-code]      →   نسخ الكود للحافظة                                              │
    │   📱 [show-qr]        →   عرض QR Code (Modal)                                           │
    └─────────────────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────────────────────────────┐
    │                              أزرار الإجراءات السريعة (Quick Actions)                    │
    │                                                                                         │
    │   ➕ [create-task]    →   /create-task (إنشاء مهمة جديدة)                                │
    │   🛒 [go-store]       →   /parent-store (المتجر)                                        │
    │   💰 [wallet]         →   /wallet (المحفظة)                                             │
    │   📚 [subjects]       →   /subjects (المواد الدراسية)                                   │
    └─────────────────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────────────────────────────┐
    │                              طلبات الشراء المعلقة (Pending Purchase Requests)           │
    │                                                                                         │
    │   ✅ [approve]        →   الموافقة على طلب الشراء                                       │
    │   ❌ [reject]         →   رفض طلب الشراء                                                │
    └─────────────────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────────────────────────────┐
    │                              آخر الإشعارات (Latest Notifications)                       │
    │                                                                                         │
    │   ➡️ [view-all]       →   /notifications (عرض كل الإشعارات)                             │
    └─────────────────────────────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 TAB: Children (الأطفال)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    ┌─────────────────────────────────────────────────────────────────────────────────────────┐
    │                              لكل بطاقة طفل (Per Child Card)                             │
    │                                                                                         │
    │   🎯 [send-task]      →   /assign-task (إرسال مهمة للطفل)                               │
    │   🎁 [inventory]      →   /parent-inventory (إدارة الهدايا)                             │
    └─────────────────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────────────────────────────┐
    │                              إذا لا يوجد أطفال (No Children State)                      │
    │                                                                                         │
    │   📱 [show-qr-empty]  →   عرض QR Code للربط                                             │
    └─────────────────────────────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 TAB: Tasks (المهام)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    ┌─────────────────────────────────────────────────────────────────────────────────────────┐
    │                              أزرار إدارة المهام (Task Management)                       │
    │                                                                                         │
    │   📖 [tasks-section]  →   /parent-tasks (قسم المهام الكامل)                             │
    │   ➕ [create-new]     →   /create-task (إنشاء مهمة جديدة)                               │
    └─────────────────────────────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 TAB: Store (المتجر)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    ┌─────────────────────────────────────────────────────────────────────────────────────────┐
    │                              أزرار المتجر (Store Actions)                               │
    │                                                                                         │
    │   🛒 [go-store]       →   /parent-store (تصفح المتجر)                                   │
    │   🛍️ [multi-store]    →   /parent-store-multi (المتجر المتعدد)                         │
    │   📦 [my-products]    →   /parent-inventory (منتجاتي)                                   │
    │   📋 [orders]         →   سجل الطلبات                                                  │
    └─────────────────────────────────────────────────────────────────────────────────────────┘

```

---

## 👧 شجرة صفحات الطفل (Child Navigation Tree)

```

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                👧 CHILD GAMES (الصفحة الرئيسية للطفل)                                                       │
│                                                        /child-games                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────────────────────────────────┐
                                    │         🎮 صفحة الألعاب الرئيسية          │
                                    │            /child-games                 │
                                    └────────────────────┬────────────────────┘
                                                         │
                    ┌────────────────────────────────────┼────────────────────────────────────┐
                    │                                    │                                    │
                    ▼                                    ▼                                    ▼
           ┌────────────────┐                  ┌────────────────────┐              ┌────────────────────┐
           │   Header Bar   │                  │    Main Content    │              │    Growth Tree     │
           │  شريط التنقل    │                  │    المحتوى الرئيسي  │              │    شجرة النمو      │
           └───────┬────────┘                  └─────────┬──────────┘              └────────────────────┘
                   │                                     │
                   ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              أزرار الهيدر (Header Buttons)                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

    🌍 [language]           →   تغيير اللغة
    📱 [pwa-install]        →   تثبيت التطبيق
    🔔 [notifications]      →   /child-notifications (الإشعارات والمهام)
    🎁 [gifts]              →   /child-gifts (الهدايا)
    🛒 [store]              →   /child-store (المتجر)
    ⚙️ [settings]           →   /child-settings (الإعدادات)
    🚪 [logout]             →   / (تسجيل خروج → الصفحة الرئيسية)

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              بطاقات الألعاب (Game Cards)                                                │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

    ▶️ [play-game]          →   فتح اللعبة في Modal
    ✅ [complete-game]      →   إكمال اللعبة وكسب النقاط

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 صفحات الطفل الفرعية (Child Sub-Pages)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌────────────────────────────────────────────────────────────────────────────────────────────┐
│   📍 /child-notifications                                                                  │
│   الإشعارات والمهام المطلوبة                                                                │
│                                                                                            │
│   📌 المكونات:                                                                              │
│   • قائمة الإشعارات الجديدة                                                                  │
│   • المهام المطلوبة من الوالد                                                                │
│   • أحداث الهدايا                                                                           │
│                                                                                            │
│   🔙 [back]              →   /child-games                                                  │
└────────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────────┐
│   📍 /child-tasks                                                                          │
│   مهام الطفل                                                                               │
│                                                                                            │
│   📌 المكونات:                                                                              │
│   • قائمة المهام المعلقة                                                                    │
│   • قائمة المهام المكتملة                                                                   │
│   • حل المهمة (Modal)                                                                       │
│                                                                                            │
│   🔙 [back]              →   /child-games                                                  │
│   📝 [solve-task]        →   فتح Modal لحل المهمة                                           │
└────────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────────┐
│   📍 /child-gifts                                                                          │
│   هدايا الطفل                                                                              │
│                                                                                            │
│   📌 المكونات:                                                                              │
│   • الهدايا المتاحة                                                                         │
│   • الهدايا المفتوحة                                                                        │
│   • تقدم النقاط لفتح الهدايا                                                                │
│                                                                                            │
│   🔙 [back]              →   /child-games                                                  │
│   🎁 [claim-gift]        →   استلام الهدية                                                 │
└────────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────────┐
│   📍 /child-store                                                                          │
│   متجر الطفل                                                                               │
│                                                                                            │
│   📌 المكونات:                                                                              │
│   • تصفح المنتجات                                                                          │
│   • طلب شراء بالنقاط                                                                        │
│   • (يحتاج موافقة الوالد)                                                                   │
│                                                                                            │
│   🔙 [back]              →   /child-games                                                  │
│   🛒 [request-buy]       →   طلب شراء (ينتظر موافقة الوالد)                                 │
└────────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────────┐
│   📍 /child-rewards                                                                        │
│   مكافآت الطفل                                                                             │
│                                                                                            │
│   📌 المكونات:                                                                              │
│   • سجل النقاط المكتسبة                                                                     │
│   • الإنجازات                                                                              │
│                                                                                            │
│   🔙 [back]              →   /child-games                                                  │
└────────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────────┐
│   📍 /child-progress                                                                       │
│   تقدم الطفل                                                                               │
│                                                                                            │
│   📌 المكونات:                                                                              │
│   • إحصائيات الأداء                                                                         │
│   • تقدم شجرة النمو                                                                         │
│   • الأهداف                                                                                │
│                                                                                            │
│   🔙 [back]              →   /child-games                                                  │
└────────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────────┐
│   📍 /child-profile                                                                        │
│   الملف الشخصي للطفل                                                                       │
│                                                                                            │
│   📌 المكونات:                                                                              │
│   • تعديل الاسم                                                                             │
│   • تغيير الصورة الرمزية                                                                    │
│   • معلومات المدرسة                                                                         │
│   • الهوايات                                                                               │
│                                                                                            │
│   🔙 [back]              →   /child-games                                                  │
│   💾 [save]              →   حفظ التغييرات                                                 │
└────────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────────┐
│   📍 /child-settings                                                                       │
│   إعدادات الطفل                                                                            │
│                                                                                            │
│   📌 المكونات:                                                                              │
│   • تغيير اللغة                                                                             │
│   • الوضع الليلي/النهاري                                                                    │
│   • إعدادات الإشعارات                                                                       │
│                                                                                            │
│   🔙 [back]              →   /child-games                                                  │
└────────────────────────────────────────────────────────────────────────────────────────────┘

```

---

## 👨‍💼 شجرة صفحات المدير (Admin Navigation Tree)

```

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              👨‍💼 ADMIN DASHBOARD                                                                            │
│                                                /admin-dashboard                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

                         ┌─────────────────────────────────────────────────────────────┐
                         │                    🏢 لوحة تحكم المدير                        │
                         │                    /admin-dashboard                          │
                         └───────────────────────────────┬─────────────────────────────┘
                                                         │
                         ┌───────────────────────────────┴───────────────────────────────┐
                         │                                                               │
                         ▼                                                               ▼
                 ┌───────────────┐                                               ┌───────────────┐
                 │   Sidebar     │                                               │  Main Area    │
                 │  الشريط الجانبي │                                               │ المنطقة الرئيسية│
                 └───────┬───────┘                                               └───────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              تبويبات الشريط الجانبي (Sidebar Tabs) - 23 تبويب                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│   📊 dashboard         │ لوحة المعلومات    │ إحصائيات عامة، عدد المستخدمين، الإيرادات                                                        │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│   💹 profits           │ نظام الأرباح      │ تتبع العمولات والأرباح                                                                           │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│   👨‍👩‍👧‍👦 parents           │ إدارة الآباء      │ قائمة الآباء، تعديل، حذف                                                                      │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│   📚 subjects          │ المواد الدراسية    │ إضافة/تعديل المواد                                                                              │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│   📁 categories        │ فئات المتجر       │ إدارة تصنيفات المنتجات                                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│   ⭐ symbols           │ مكتبة الرموز      │ إدارة الرموز والأيقونات                                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│   🛍️ products          │ المنتجات          │ إضافة/تعديل/حذف منتجات                                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│   👥 users             │ الأطفال           │ قائمة الأطفال المسجلين                                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│   💰 wallets           │ المحافظ           │ إدارة محافظ الآباء                                                                              │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│   📦 orders            │ الطلبات           │ إدارة طلبات الشراء                                                                              │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│   💳 deposits          │ الإيداعات         │ إدارة عمليات الإيداع                                                                            │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│   💳 payment-methods   │ طرق الدفع         │ إعداد بوابات الدفع                                                                              │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│   📈 analytics         │ تحليلات المحفظة    │ رسوم بيانية وتقارير                                                                             │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│   📋 activity          │ سجل النشاط        │ تتبع جميع الإجراءات                                                                             │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│   🔔 notifications     │ الإشعارات         │ إرسال إشعارات جماعية                                                                            │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│   🤝 referrals         │ الإحالات          │ إدارة نظام الإحالات                                                                             │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│   📢 ads               │ الإعلانات         │ إدارة الإعلانات للآباء والأطفال                                                                 │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│   📖 libraries         │ المكتبات          │ إدارة التجار/المكتبات                                                                           │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│   🔐 social-login      │ تسجيل اجتماعي     │ إعداد Google, Facebook, etc.                                                                    │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│   📱 otp-providers     │ مزودي OTP         │ إعداد Email/SMS OTP                                                                             │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│   🔍 seo               │ إعدادات SEO       │ Meta tags, Open Graph, etc.                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│   📞 support           │ الدعم الفني       │ معلومات التواصل، الصيانة                                                                        │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│   ⚙️ settings          │ الإعدادات         │ إعدادات التطبيق العامة                                                                          │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│   🚪 logout            │ تسجيل خروج        │ → /admin (صفحة تسجيل الدخول)                                                                    │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

```

---

## 📖 شجرة صفحات المكتبة (Library Navigation Tree)

```

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              📖 LIBRARY SYSTEM                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────────────────┐
                                    │   /library/login        │
                                    │   تسجيل دخول المكتبة     │
                                    └────────────┬────────────┘
                                                 │
                                                 ▼
                                    ┌─────────────────────────┐
                                    │   /library/dashboard    │
                                    │   لوحة تحكم المكتبة      │
                                    └────────────┬────────────┘
                                                 │
                    ┌────────────────────────────┼────────────────────────────┐
                    │                            │                            │
                    ▼                            ▼                            ▼
          ┌─────────────────┐        ┌─────────────────┐          ┌─────────────────┐
          │   إدارة المنتجات  │        │    الإحالات     │          │   المبيعات      │
          │   (Add/Edit)    │        │   (Referrals)   │          │   (Sales)       │
          └─────────────────┘        └─────────────────┘          └─────────────────┘


                                    ┌─────────────────────────┐
                                    │   /library-store        │
                                    │   عرض منتجات المكتبة     │
                                    │   (للعملاء)              │
                                    └─────────────────────────┘

```

---

## 📋 صفحات عامة (Public/Utility Pages)

```

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              📋 UTILITY PAGES                                                                               │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

    /privacy              →   سياسة الخصوصية (ملخص)
    /privacy-policy       →   سياسة الخصوصية (كاملة)
    /terms                →   شروط الاستخدام
    /accessibility        →   سياسة إمكانية الوصول
    /settings             →   إعدادات المستخدم (للوالد)
    /forgot-password      →   استعادة كلمة المرور
    /otp                  →   التحقق من OTP

```

---

## 🔄 ملخص التدفقات الرئيسية (Flow Summary)

```

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              📊 NAVIGATION STATISTICS                                                                       │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

    📍 إجمالي المسارات (Routes):           32+ صفحة
    👨‍💼 صفحات الوالد:                        8 صفحات
    👧 صفحات الطفل:                         9 صفحات
    👨‍💼 تبويبات المدير:                      23 تبويب
    📖 صفحات المكتبة:                       3 صفحات
    📋 صفحات عامة:                          6 صفحات

┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                              🔀 MAIN USER FLOWS                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

    📌 تدفق الوالد الجديد:
    / → /parent-auth → (Register) → /otp → /parent-dashboard

    📌 تدفق تسجيل دخول الوالد:
    / → /parent-auth → (Login) → /otp → /parent-dashboard

    📌 تدفق ربط الطفل:
    / → /child-link → (Enter Code) → /child-games

    📌 تدفق إنشاء مهمة:
    /parent-dashboard → /create-task → /assign-task → (Select Child) → Done

    📌 تدفق حل المهمة (الطفل):
    /child-games → /child-tasks → (Select Task) → (Solve) → +Points

    📌 تدفق الشراء:
    /parent-dashboard → /parent-store → (Add to Cart) → Checkout → Done

    📌 تدفق إرسال هدية:
    /parent-dashboard → /parent-inventory → (Select Product) → (Select Child) → (Set Points) → Send Gift

```

---

## 🔗 روابط مهمة للمرجع الشامل

| الملف | الوصف | الاستخدام |
|------|-------|---------|
| **[DEEP-NAVIGATION-ANALYSIS.md](DEEP-NAVIGATION-ANALYSIS.md)** | 📖 تحليل عميق شامل جداً | للتفاصيل الكاملة: 815 endpoint، 59 صفحة، 169 جدول، 23 خدمة |
| **[FULL-NAVIGATION-TREE.md](FULL-NAVIGATION-TREE.md)** | 🌳 شجرة المسارات الكاملة | قائمة تفصيلية بجميع المسارات |
| **ARCHITECTURE.md** | 🏗️ معمارية التطبيق | القرارات المعمارية والنمط |

---

> **ملاحظة:** هذه الخريطة تُحدث تلقائياً عند إضافة صفحات أو مسارات جديدة.  
> **آخر تحديث:** 19 مارس 2026 ✅
