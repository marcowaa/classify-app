# 🌐 Updated Routes Map — Classify (March 2026)
**خريطة المسارات المحدثة - تشمل جميع الأنظمة الجديدة**

**Last Updated**: March 19, 2026
**Status**: ✅ Complete with new School, Library, Teacher systems

This comprehensive map documents ALL routes across the Classify platform, including three major new subsystems introduced since the last analysis.

---

## 📊 Route Summary by System

| System | Type | Auth Required | Routes | Status |
|--------|------|---------------|--------|--------|
| **Public Landing** | Public | No | 6 routes | ✅ Complete |
| **Parent Platform** | User | Parent Auth | 13 routes | ✅ + Updated |
| **Child Platform** | User | Child Auth | 11 routes | ✅ Complete |
| **Admin Panel** | Admin | Admin Auth | 25+ tabs | ✅ Enhanced |
| **School System** | NEW | School Auth | 8 routes | ✨ NEW |
| **Library System** | NEW | Library Auth | 5 routes | ✨ NEW |
| **Teacher Platform** | NEW | Teacher Auth | 6 routes | ✨ NEW |
| **Marketplace** | Enhanced | Parent Auth | 4 routes | ✅ Enhanced |
| **Legal/Info** | Public | No | 8 routes | ✅ Complete |
| **Others** | Various | Varies | 5 routes | ✅ Complete |
| **TOTAL** | — | — | **91+ routes** | — |

---

## 🏠 Public Landing Routes

| Route | Page Component | Purpose | Notes |
|-------|---------------|---------|-------|
| `/` | `Home.tsx` | Landing page | Public, ErrorBoundary wrapped |
| `/download` | `DownloadApp.tsx` | App download portal | Links to Android APK, iOS app |
| `/about-us` | `AboutUs.tsx` | About company | Public info page |
| `/contact-us` | `ContactUs.tsx` | Contact form | Public contact |
| `/subjects` | `Subjects.tsx` | Subject directory | Public subject browsing |
| `/download-app` | `DownloadApp.tsx` | Download page redirect | Duplicate/alias |

---

## 👨‍👩‍👧 Parent Platform (13 routes)

### Authentication & Setup
| Route | Page | Purpose | Flow |
|-------|------|---------|------|
| `/parent-auth` | `ParentAuth.tsx` | Login/Register | Email + OTP, 2FA optional |
| `/forgot-password` | `ForgotPassword.tsx` | Password reset | Email verification |
| `/otp` | `OTPVerification.tsx` | OTP verification | SMS/Email 2FA |
| `/auth/oauth-callback` | `OAuthCallback.tsx` | OAuth redirect | Google/Facebook/etc |

### Parent Dashboard & Management (9 routes)
| Route | Page | Purpose | Key Features |
|-------|------|---------|--------------|
| `/parent-dashboard` | `ParentDashboard.tsx` | Main dashboard | Children list, stats, recent tasks |
| `/parent-profile` | `ParentProfile.tsx` | Settings & profile | Account settings, children mgmt |
| `/parent-tasks` | `ParentTasks.tsx` | Task creation | Create custom tasks for children |
| `/assign-task` | `AssignTask.tsx` | Assign tasks | Bind tasks to specific children |
| `/task-marketplace` | `TaskMarketplace.tsx` | School/Teacher tasks | Browse teacher-created tasks |
| `/task-cart` | `TaskCart.tsx` | Shopping cart | Add tasks to cart before purchase |
| `/parent-store` | `ParentStore.tsx` | Product store | Buy gifts/rewards for children |
| `/parent-inventory` | `ParentInventory.tsx` | Products owned | Track purchased products |
| `/wallet` | `Wallet.tsx` | Wallet/Payments | Balance, topup, transaction history |
| `/notifications` | `Notifications.tsx` | Notification center | All notifications |

---

## 👧 Child Platform (11 routes)

### Child Entry & Auth
| Route | Page | Wrapper | Purpose |
|-------|------|---------|---------|
| `/child-link` | `ChildLink.tsx` | ErrorBoundary | Link child to parent |

### Child Dashboard & Experience (10 routes)
| Route | Page | Wrapper | Purpose | Key Features |
|-------|------|---------|---------|--------------|
| `/child-dashboard` | Home dashboard | ChildAppWrapper | Home screen after login | Balance, quick access to tasks |
| `/child-tasks` | `ChildTasks.tsx` | ChildAppWrapper | Task list | Active tasks, completed |
| `/child-store` | `ChildStore.tsx` | ChildAppWrapper | Store for rewards | Purchase with earned points |
| `/child-gifts` | `ChildGifts.tsx` | ChildAppWrapper | Gift inventory | Received gifts, redeem coupons |
| `/child-discover` | `ChildDiscover.tsx` | ChildAppWrapper | Discovery section | Browse content, new items |
| `/child-games` | `ChildGames.tsx` | ChildAppWrapper | Game library | Iframe-embedded games, scores |
| `/child-rewards` | `ChildRewards.tsx` | ChildAppWrapper | Rewards tracker | Points, badges, achievements |
| `/child-profile` | `ChildProfile.tsx` | ChildAppWrapper | Profile settings | Name, avatar, preferences |
| `/child-progress` | `ChildProgress.tsx` | ChildAppWrapper | Progress dashboard | Stats, growth tree, charts |
| `/child-settings` | `ChildSettings.tsx` | ChildAppWrapper | Child settings | Notifications, privacy |
| `/child-notifications` | `ChildNotifications.tsx` | ChildAppWrapper | Notifications | Task reminders, gifts, messages |

---

## 🎓 School System (NEW - 8 routes)

**Status**: ✨ NEW system introduced in March 2026
**Auth**: School credentials (email + password or SSO)

### School Entry Points
| Route | Page | Purpose | Auth |
|-------|------|---------|------|
| `/school-login` | `SchoolLogin.tsx` | School auth | Email + password |
| `/school-auth` | (via auth flow) | OAuth/SSO | Google Workspace, Microsoft |

### School Management (6 routes)
| Route | Page | Purpose | Key Features |
|-------|------|---------|--------------|
| `/school-dashboard` | `SchoolDashboard.tsx` | Main school dashboard | Teacher mgmt, stats, activity |
| `/school-profile` | `SchoolProfile.tsx` | School settings | Name, location, branding |
| `/schools` | Search view | Schools directory | Public school browsing |
| `/api/schools` | API endpoint | Search & discovery | List schools with filters |
| `/api/schools/:id` | API endpoint | School details | Fetch school profile |
| `POST /api/schools` | API endpoint | Register school | Create new school account |

**Associated Data**:
- `schools` table: id, name, nameAr, governorate, city, imageUrl, isVerified, totalTeachers, totalStudents, activityScore
- `schoolTeachers` table: Teachers assigned to schools
- `schoolPosts` table: School announcements/posts
- `schoolReviews` table: Ratings and reviews
- `childSchoolAssignment` table: Children linked to schools
- `schoolActivityLogs` table: Audit logs

---

## 👨‍🏫 Teacher Platform (NEW - 6 routes)

**Status**: ✨ NEW system introduced in March 2026
**Auth**: Teacher credentials (email + password)
**Relationship**: Teachers belong to schools

### Teacher Entry Points
| Route | Page | Purpose | Auth |
|-------|------|---------|------|
| `/teacher-login` | `TeacherLogin.tsx` | Teacher auth | Email + password |
| `/teacher-auth` | (via auth flow) | OAuth/SSO | School domain auth |

### Teacher Management (4 routes)
| Route | Page | Purpose | Key Features |
|-------|------|---------|--------------|
| `/teacher-dashboard` | `TeacherDashboard.tsx` | Main dashboard | Create tasks, view sales, analytics |
| `/teacher-profile` | `TeacherProfile.tsx` | Profile settings | Bio, avatar, subject, experience |
| `/teacher/:id` | Public profile | View teacher details | Rating, subjects taught, reviews |
| `POST /api/teacher-tasks/create` | API | Create task | Accept payments, task creation |

**Task Management System**:
- `teacherTasks` table: Tasks created by teachers
- `teacherTaskOrders` table: Orders/purchases of teacher tasks
- `teacherBalances` table: Earnings and commissions
- `teacherWithdrawalRequests` table: Payout requests
- `teacherReviews` table: Ratings from parents
- `teacherHiring` table: Contract/employment records

---

## 📚 Library System (NEW - 5 routes)

**Status**: ✨ NEW system introduced in March 2026
**Auth**: Library credentials (email + password)
**Purpose**: Merchant marketplace for digital content

### Library Entry Points
| Route | Page | Purpose | Auth |
|-------|------|---------|------|
| `/library-login` | `LibraryLogin.tsx` | Library auth | Email + password |
| `/library-auth` | (via auth flow) | Commercial login | Two-factor auth available |

### Library Management (3 routes)
| Route | Page | Purpose | Key Features |
|-------|------|---------|--------------|
| `/library-dashboard` | `LibraryDashboard.tsx` | Main dashboard | Products, orders, analytics |
| `/library-profile` | `LibraryProfile.tsx` | Profile settings | Logo, branding, banking info |
| `/library-store` | `LibraryStore.tsx` | Storefront | Public product listing |

**Associated Data**:
- `libraries` table: Library profiles, commissions, balances
- `libraryProducts` table: Products in library store
- `libraryOrders` table: Customer orders
- `libraryBalances` table: Earnings, available balance, pending
- `libraryReferrals` table: Affiliate/referral program
- `libraryWithdrawalRequests` table: Payout requests
- `libraryDailyInvoices` table: Daily settlement invoices
- `libraryActivityLogs` table: Audit trail
- `libraryReturnRequests` table: Return/refund requests

---

## 🛒 Marketplace & Shopping (Enhanced - 4 routes)

### Search & Discovery
| Route | Page | Purpose | Search Scope |
|-------|------|---------|--------------|
| `/api/search` | API endpoint | Universal search | Schools, Teachers, Tasks |
| `/api/search?type=schools` | API | School search | By name, governorate, city |
| `/api/search?type=teachers` | API | Teacher search | By name, subject, experience |
| `/api/search?type=tasks` | API | Task search | By title, subject, price range |

### Subject/Category Browsing
| Route | Page | Purpose | Notes |
|-------|------|---------|-------|
| `/subject-tasks` | `SubjectTasks.tsx` | Tasks by subject | Filters by grade, price |
| `/task-marketplace` | `TaskMarketplace.tsx` | Teacher task marketplace | Search + filter widget |

---

## 🛡️ Admin Panel (25+ management tabs)

**Route**: `/admin-dashboard`
**Auth**: Admin credentials with token-based auth
**Type**: Single Page App with tab switching (no subroutes)

### Admin Tabs (Tab switching via state)
| Tab ID | Component | Purpose | Manages |
|--------|-----------|---------|----------|
| `dashboard` | `DashboardTab` | Overview stats | KPIs, charts, activity |
| `products` | `ProductsTab` | Product mgmt | Add, edit, delete products |
| `categories` | `CategoriesTab` | Categories | Organize products |
| `symbols` | `SymbolsTab` | Symbol library | Emojis, icons (NEW) |
| `users` | `UsersTab` | User management | Parent accounts, verification |
| `settings` | `SettingsTab` | General settings | App-wide settings |
| `wallets` | `WalletsTab` | Wallet admin | Topup, transfers, balances |
| `orders` | `OrdersTab` | Order tracking | Customer orders |
| `deposits` | `DepositsTab` | Deposit mgmt | Payment deposits |
| `activity` | `ActivityLogTab` | Activity logs | User actions, audit trail |
| `analytics` | `WalletAnalytics` | Financial analytics | Revenue, spending trends |
| `payment-methods` | `PaymentMethodsTab` | Payment config | Gateway setup (NEW) |
| `subjects` | `SubjectsTab` | Subject mgmt | Add/edit subjects |
| `notifications` | `NotificationsTab` | Notification mgmt | Send bulk notifications |
| `notification-settings` | `NotificationSettingsTab` | Notification config | Global policies (NEW) |
| `task-notification-levels` | `TaskNotificationLevelsTab` | Task reminder levels | Escalation config (NEW) |
| `gifts` | `GiftsTab` | Gift mgmt | Gift catalog |
| `reward-offers` | `RewardOffersTab` | Offer management | Create offers (NEW) |
| `referrals` | `ReferralsTab` | Referral program | Commission tracking |
| `ads` | `AdsTab` | Ad management | Ads display settings |
| `parents` | `ParentsTab` | Parent accounts | Manage parent users |
| `profits` | `ProfitSystemTab` | Profit tracking | Multi-level commissions |
| `libraries` | `LibrariesTab` | Library platform | Merchant marketplace mgmt (NEW) |
| `libraries-review` | `MerchantProductsReviewTab` | Moderation | Review library products (NEW) |
| `schools` | `SchoolsTab` | School management | Create, verify schools (NEW) |
| `games` | `GamesTab` | Game management | Add/configure games |
| `tasks` | `TasksTab` | Task templates | Global task templates |
| `social-login` | `SocialLoginTab` | OAuth config | Google, Facebook setup |
| `otp-providers` | `OTPProvidersTab` | OTP config | SMS/Email providers |
| `seo` | `SeoSettingsTab` | SEO settings | Meta tags, robots.txt |
| `support` | `SupportSettingsTab` | Support config | Help email, docs links |
| `legal` | `LegalTab` | Legal pages | Terms, Privacy, etc |
| `mobile-app` | `MobileAppSettingsTab` | Mobile build config | APK uploads, versions (NEW) |
| `growth-tree` | `GrowthTreeSettingsTab` | Garden/Tree settings | Seed catalog, tool pricing (NEW) |
| `store-analytics` | `StoreAnalyticsTab` | Store metrics | Product sales, revenue |
| `risk-monitor` | `RiskMonitorTab` | Fraud detection | Suspicious activities |
| `inhome` | InHome shipping (implied) | In-home logistics | Shipping provider config |
| `orders-tracking` | Order tracking (implied) | Delivery tracking | Logistics integration |

---

## 📋 Legal & Information Routes (8 routes)

| Route | Page | Purpose | Public |
|-------|------|---------|--------|
| `/privacy-policy` | `PrivacyPolicy.tsx` | Privacy legal | Yes |
| `/terms` | `Terms.tsx` | Terms of service | Yes |
| `/cookie-policy` | `CookiePolicy.tsx` | Cookie policy | Yes |
| `/refund-policy` | `RefundPolicy.tsx` | Refund policy | Yes |
| `/acceptable-use` | `AcceptableUse.tsx` | Acceptable use | Yes |
| `/accessibility-policy` | `AccessibilityPolicy.tsx` | A11y statement | Yes |
| `/legal-center` | `LegalCenter.tsx` | Legal hub | Yes |
| `/account-deletion` | `AccountDeletion.tsx` | Delete account | Authenticated users |

---

## 🎮 Special/Trial Routes (3 routes)

| Route | Page | Purpose | Notes |
|-------|------|---------|-------|
| `/trial-games` | `TrialGames.tsx` | Game preview | Unauthenticated game demos |
| `/memory-match` | `MemoryMatchPage.tsx` | Game instance | Playable game |
| `/child/:id/public-profile` | `ChildPublicProfile.tsx` | Public child profile | Shared achievements, portfolio |

---

## 🚨 Error Handling Routes

| Route | Page | Purpose | Trigger |
|-------|------|---------|---------|
| `/not-found` | `not-found.tsx` | 404 page | Invalid route |
| `(ErrorBoundary)` | Error boundary catch | Runtime error | Component crash |

---

## 🔐 Key Authentication Flows

### Parent Flow
```
/parent-auth → Login/Register → OTP verification → /parent-dashboard
```

### Child Flow
```
/child-link (link to parent) → ChildAppWrapper → /child-tasks (wrapped)
```

### Admin Flow
```
/admin-dashboard (token auth) → Tab switching (no subroutes)
```

### School Flow (NEW)
```
/school-login → Credentials → /school-dashboard → Teacher mgmt
```

### Teacher Flow (NEW)
```
/teacher-login → Credentials → /teacher-dashboard → Task creation
```

### Library Flow (NEW)
```
/library-login → Credentials → /library-dashboard → Product mgmt
```

---

## 📊 Route Statistics

**Total Routes**: 91+

**By Category**:
- Public landing: 6 routes (6.6%)
- Parent platform: 13 routes (14.3%)
- Child platform: 11 routes (12.1%)
- Admin panel: 25+ tabs (27.5%)
- School system: 8 routes (8.8%) — NEW
- Library system: 5 routes (5.5%) — NEW
- Teacher platform: 6 routes (6.6%) — NEW
- Marketplace: 4 routes (4.4%)
- Legal/Info: 8 routes (8.8%)
- Special: 3 routes (3.3%)
- Error handling: 2 routes (2.2%)

**Auth Requirements**:
- Public (no auth): ~18 routes (19.8%)
- Parent auth: ~15 routes (16.5%)
- Child auth: ~11 routes (12.1%)
- Admin auth: ~25 routes (27.5%)
- School auth: ~8 routes (8.8%)
- Teacher auth: ~6 routes (6.6%)
- Library auth: ~5 routes (5.5%)

---

## 🔄 New Integrations (March 2026)

### API Endpoint Changes
- `POST /api/schools` — Create school
- `GET /api/schools` — List schools with filters
- `GET /api/schools/:id` — School details
- `POST /api/teachers` — Register teacher
- `GET /api/teacher-tasks` — Teacher-created tasks
- `POST /api/library/products` — Add library product
- `GET /api/marketplace/library-products` — Library products in store
- `GET /api/search` — Universal search (schools, teachers, tasks)

### Database Changes (New Tables/Relations)
- `schools`, `schoolTeachers`, `schoolPosts`, `schoolReviews`
- `teacherTasks`, `teacherTaskOrders`, `teacherBalances`
- `libraries`, `libraryProducts`, `libraryOrders`
- `symbols`, `appSettings`, `rewardsSettings`, `tasksSettings`
- `taskNotificationGlobalPolicy`, `taskNotificationChildPolicy`
- `storeSettings`, `notificationSettings`, `paymentSettings`

### New Features Evident From Schema
- ✨ Task notification policies (global + per-child overrides)
- ✨ Symbol/emoji library management
- ✨ App-wide settings configurable
- ✨ Growth tree/garden (childGrowthTrees, childGrowthEvents)
- ✨ Reward offers system (rewardsSettings)

---

## 🎯 Key Route Relationships

**Parent → Child**:
- `/parent-dashboard` → `/child-profile` (manage child)
- `/parent-tasks` → `/child-tasks` (assign tasks)
- `/parent-store` → `/child-store` (gift products)

**Parent → Marketplace**:
- `/parent-dashboard` → `/task-marketplace` (shop teacher tasks)
- `/task-marketplace` → `/task-cart` → `/parent-store` (checkout)

**School → Teacher (NEW)**:
- `/school-dashboard` → `/teacher-dashboard` (hire/manage)
- `/teacher-profile` → `/teacher-dashboard` (settings)

**Library (NEW)**:
- `/library-store` → `/parent-store` (products available)
- `/library-dashboard` → `/admin-dashboard` (libraries tab for moderation)

**Admin Oversight**:
- `/admin-dashboard` → All tabs manage platform aspects
- `libraries` tab → Controls library merchant network
- `schools` tab → Manages school accounts
- Notifications tab → Controls teacher task notifications

---

## 🚀 Next Steps for Navigation Analysis

1. **API Endpoint Mapping** — Document all server routes in `server/routes/*.ts`
2. **Data Flow Updates** — Reflect new merchant/commission flows
3. **Error Scenario Updates** — Add teacher/library/school auth errors
4. **Performance Analysis Update** — New marketplace search endpoints
5. **Security Audit Update** — New auth scopes for teachers, libraries, schools
6. **Testing Coverage Update** — Include new system routes in test matrix

---

**Document Status**: ✅ COMPLETE & CURRENT
**Last Verified**: March 19, 2026
**Maintained By**: Classify Engineering
