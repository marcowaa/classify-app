# 🔐 Enhanced Route Security & Access Control Map

**Classify Platform — Security Boundaries & Authorization Layers**

---

## 🛡️ Security Architecture Overview

### Authentication Layers
| Route Category | Auth Required | Token Type | Guard Mechanism |
|---|---|---|---|
| **Public** | ❌ No | None | Anonymous access |
| **Parent** | ✅ Yes | `parentToken` | JWT in localStorage |
| **Child** | ✅ Yes | `childToken` | JWT (read-only access) |
| **Admin** | ✅ Yes | `adminToken` | Session-based |
| **Institutional** | ✅ Yes | role-based | Teacher/School/Library tokens |

---

## 🟢 Public Routes (No Authentication Required)

These routes are accessible to anyone without login:

| Route | Component | Purpose | Wrapper | Security |
|---|---|---|---|---|
| `/` | Home | Landing page | ErrorBoundary | ✅ Safe |
| `/download` | DownloadApp | App downloads | ErrorBoundary | ✅ Safe |
| `/parent-auth` | ParentAuth | Parent login/register | ErrorBoundary | ✅ CSRF protected |
| `/auth/oauth-callback` | OAuthCallback | OAuth completion | ErrorBoundary | ✅ State verified |
| `/forgot-password` | ForgotPassword | Password recovery | ErrorBoundary | ✅ Rate limited |
| `/otp` | OTPVerification | 2FA verification | ErrorBoundary | ✅ Rate limited |
| `/trial-games` | TrialGames | Demo games (no token) | ErrorBoundary | ✅ No data stored |
| `/privacy` | Privacy | Basic privacy info | ErrorBoundary | ✅ Static |
| `/privacy-policy` | PrivacyPolicy | Detailed privacy | ErrorBoundary | ✅ Static |
| `/terms` | Terms | Terms & conditions | ErrorBoundary | ✅ Static |
| `/cookie-policy` | CookiePolicy | Cookie information | ErrorBoundary | ✅ Static |
| `/accessibility` | AccessibilityPolicy | Accessibility info | ErrorBoundary | ✅ Static |
| `/about` | AboutUs | About company | ErrorBoundary | ✅ Static |
| `/contact` | ContactUs | Contact form | ErrorBoundary | ✅ Rate limited |
| `/child-safety` | ChildSafety | Safety guidelines | ErrorBoundary | ✅ Static |
| `/refund-policy` | RefundPolicy | Refund terms | ErrorBoundary | ✅ Static |
| `/acceptable-use` | AcceptableUse | Usage policy | ErrorBoundary | ✅ Static |
| `/legal` | LegalCenter | Legal center hub | ErrorBoundary | ✅ Static |
| `/delete-account` | AccountDeletion | Account deletion | ErrorBoundary | ✅ Auth required for form |

---

## 🔵 Parent Routes (Requires `parentToken`)

These routes require successful parent authentication:

### Parent Auth Guard Pattern
```typescript
// Protected by:
// 1. localStorage.getItem('parentToken') check
// 2. JWT expiration validation
// 3. Parent ID scope verification
```

| Route | Component | Scope | Child Access | Data Access | Rate Limit |
|---|---|---|---|---|---|
| `/parent-dashboard` | ParentDashboard | Own children only | ❌ No | ✅ Full | Standard |
| `/parent-store` | ParentStore | Shop items | ❌ No | ✅ Full | Standard |
| `/parent-tasks` | ParentTasks | Own tasks | ❌ No | ✅ Create/Edit | Standard |
| `/parent-inventory` | ParentInventory | Own items | ❌ No | ✅ Full | Standard |
| `/wallet` | Wallet | Own wallet | ❌ No | ✅ Full (PII) | Standard |
| `/notifications` | Notifications | Own notifications | ❌ No | ✅ Full | Standard |
| `/subjects` | Subjects | Subject list | ❌ No | ✅ Read | Standard |
| `/settings` | Settings | Own preferences | ❌ No | ✅ Edit | Standard |
| `/parent-profile` | ParentProfile | Own profile | ❌ No | ✅ Full (PII) | Standard |
| `/assign-task` | AssignTask | Child assignment | ⚠️ Link required | ✅ Full | Standard |
| `/subject-tasks` | SubjectTasks | Subject tasks | ❌ No | ✅ Read | Standard |
| `/task-marketplace` | TaskMarketplace | Browse tasks | ❌ No | ✅ Read | Standard |
| `/task-cart` | TaskCart | Shopping cart | ❌ No | ✅ Full | Standard |
| `/admin/purchases` | AdminPurchasesTab | Own purchases | ❌ No | ✅ Read | Standard |

---

## 🟠 Child Routes (Requires `childToken` — Read-Only Access)

These routes require child linking and token. **Child tokens CANNOT modify parent data**:

### Child App Wrapper Architecture
```typescript
function ChildAppWrapper() {
  // 1. Validates childToken exists
  // 2. Validates token not expired
  // 3. Validates child-parent relationship
  // 4. Isolates child context (theme, auth, layout)
  // 5. Prevents navigation escape
}
```

| Route | Component | Wrapper | Operations | Data Access | Notes |
|---|---|---|---|---|---|
| `/child-link` | ChildLink | ErrorBoundary | Create token | Write (+new token) | Onboarding only |
| `/child-profile` | ChildProfile | ChildAppWrapper | Read only | Own profile | Hub page |
| `/child-games` | ChildGames | ChildAppWrapper | Play games | Scores (write) | Core feature |
| `/match3` | Match3Page | ChildAppWrapper | Play game | Score submission | Game instance |
| `/memory-match` | MemoryMatchPage | ChildAppWrapper | Play game | Score submission | Game instance |
| `/child-tasks` | ChildTasks | ChildAppWrapper | Read tasks | Complete (write) | Task list |
| `/child-store` | ChildStore | Conditional* | Use coins | Read only | *No wrapper if no token |
| `/child-rewards` | ChildRewards | ChildAppWrapper | View rewards | Read only | Reward display |
| `/child-progress` | ChildProgress | ChildAppWrapper | View stats | Read only | Progress tracking |
| `/child-gifts` | ChildGifts | ChildAppWrapper | View gifts | Acknowledge (write) | Gift notifications |
| `/child-notifications` | ChildNotifications | ChildAppWrapper | View alerts | Read + forward links | Multi-hub |
| `/child-settings` | ChildSettings | ChildAppWrapper | Change settings | Language, theme | Limited scope |
| `/child-discover` | ChildDiscover | ChildAppWrapper | Browse children | Read public profiles | Discovery feature |
| `/child-public-profile/:shareCode` | ChildPublicProfile | ErrorBoundary | View public profile | Read only | Via share link |

### Child Token Permissions (Strict)
```
✅ ALLOWED:
  - Read own profile
  - Play games & submit scores
  - View tasks (cannot assign)
  - View rewards/gifts
  - Change own settings

❌ FORBIDDEN:
  - Access parent data
  - Modify parent settings
  - Initiate payments
  - Access parent notifications
  - Unlink from parent
```

---

## 🟣 Admin Routes (Session-Based Auth)

Admin-only routes with elevated privileges:

| Route | Component | Permission | Operations | Audit |
|---|---|---|---|---|
| `/admin` | AdminAuth | Admin login | Authenticate | ✅ Logged |
| `/admin-dashboard` | AdminDashboard | Elevated | View all data | ✅ Logged |
| `/admin/purchases` | AdminPurchasesTab | Elevated | View transactions | ✅ Logged |

---

## 🟤 Institutional Routes (Role-Based)

School/Teacher/Library specific routes:

| Route | Component | Role | Permission | Auth Type |
|---|---|---|---|---|
| `/school/login` | SchoolLogin | School Admin | Create org | Session |
| `/school/dashboard` | SchoolDashboard | School Admin | Manage school | Session |
| `/school/:id` | SchoolProfile | Staff | View school | Public link |
| `/teacher/login` | TeacherLogin | Teacher | Create profile | Session |
| `/teacher/dashboard` | TeacherDashboard | Teacher | Manage classes | Session |
| `/teacher/:id` | TeacherProfile | Staff | View teacher | Public link |
| `/library/login` | LibraryLogin | Librarian | Create library | Session |
| `/library/dashboard` | LibraryDashboard | Librarian | Manage library | Session |
| `/library/:id` | LibraryProfile | Staff | View library | Public link |
| `/library-store` | LibraryStore | Librarian | Browse items | Session |

---

## 🔄 Special Routes & Redirects

### Conditional Routes (Token-Dependent)
| Route | Without Token | With Token | Logic |
|---|---|---|---|
| `/child-store` | Unprotected page | Wrapped + protected | Checks `childToken` at render |

### Redirect Routes
| From | To | Reason |
|---|---|---|
| `/register` | `/parent-auth` | Unified auth |
| `/create-task` | `/parent-tasks` | URL convenience |
| `/store/libraries` | `/library-store` | Legacy redirect |

### Dynamic Routes
| Route | Param | Usage | Auth Required |
|---|---|---|---|
| `/child-public-profile/:shareCode` | `shareCode` | Share child profile | ✅ Optional (public) |

---

## 🚨 Critical Security Patterns

### 1. Parent-Child Relationship Validation
```typescript
// REQUIRED before child data access:
const result = await db.query.parentChild.findFirst({
  where: and(
    eq(parentChild.parentId, req.user.id),
    eq(parentChild.childId, childId)
  )
});
if (!result) throw new UnauthorizedError();
```

### 2. Token Scope Enforcement
```typescript
// Parent tokens CANNOT access child endpoints
// Child tokens CANNOT access parent endpoints
// Admin tokens override (with audit logging)
```

### 3. Error Boundary Protection
```typescript
// ALL routes wrapped:
// - Catches React errors (prevents full crash)
// - Shows error UI instead of white screen
// - Logs to monitoring system
```

### 4. Rate Limiting on Auth
```
/parent-auth:       5 attempts / hour / IP
/otp:              10 attempts / hour / email
/forgot-password:   5 requests / hour / email
/contact:           3 requests / hour / IP
```

---

## 📊 Access Control Matrix

| Role | Public | Parent | Child | Admin | Institutional |
|---|---|---|---|---|---|
| **Anonymous** | ✅ Read | ❌ No | ❌ No | ❌ No | ❌ No |
| **Parent (Active)** | ✅ Read | ✅ Full | ⚠️ Token only | ❌ No | ❌ No |
| **Parent (Inactive)** | ✅ Read | ⚠️ Limited | ❌ No | ❌ No | ❌ No |
| **Child (Linked)** | ✅ Read | ❌ No | ✅ Limited | ❌ No | ❌ No |
| **Child (Unlinked)** | ✅ Read | ❌ No | ❌ No | ❌ No | ❌ No |
| **Admin** | ✅ Read | ✅ View | ✅ View | ✅ Full | ✅ Full |
| **Teacher** | ✅ Read | ❌ No | ⚠️ School only | ❌ No | ✅ Class data |
| **Librarian** | ✅ Read | ❌ No | ❌ No | ❌ No | ✅ Library data |

---

## 🔍 Data Flow Security (Parent → Child Example)

```
SCENARIO: Parent assigns task to child

1. Parent at /parent-dashboard
   └─ parentToken: valid & not expired ✅
   └─ Scope: own children only ✅

2. Parent navigates to /assign-task
   └─ verifyParentToken(req) ✅
   └─ verifyChildOwnership(parentId, childId) ✅

3. Parent submits task assignment
   └─ Creates Task record ✅
   └─ Sets: parentId, childId, dueDate ✅

4. Child receives notification
   └─ Task visible at /child-tasks
   └─ childToken validated ✅
   └─ Child can only SEE own tasks ✅
   └─ Child CANNOT modify task metadata ✅

5. Child completes task
   └─ POST /api/child/complete-task
   └─ Updates: completedAt, score
   └─ Parent sees completion in /parent-dashboard
```

---

## ⚠️ Attack Vectors & Mitigations

| Attack | Vector | Mitigation |
|---|---|---|
| **Token Injection** | Modify token in localStorage | JWT signature validation |
| **Scope Escalation** | Child tries to access parent data | Parent-child relationship check |
| **CSRF** | Cross-site fake requests | CSRF token validation |
| **Brute Force** | Many login attempts | Rate limiting + captcha |
| **Session Fixation** | Reuse old session | Token expiration (24h) |
| **SQL Injection** | Malicious input in queries | Parameterized queries (Drizzle ORM) |
| **XSS** | Script injection in data | React auto-escaping + sanitization |
| **Privilege Escalation** | User modifies token permissions | Server-side permission check always |

---

## 🔐 Token Lifespan & Expiration

| Token Type | Created | Expires | Refresh | Logout |
|---|---|---|---|---|
| `parentToken` | `/parent-auth` login | 24 hours | Auto-refresh | `/api/auth/logout` |
| `childToken` | `/child-link` onboarding | 30 days | Manual refresh | Delete from localStorage |
| `adminToken` | `/admin` session | 8 hours | Auto-refresh | Session end |
| `schoolToken` | `/school/login` | 24 hours | Auto-refresh | Logout |

---

## 📝 Audit & Logging

### Events Logged
- ✅ Login attempts (success & failure)
- ✅ Token generation/expiration
- ✅ Parent-child linking
- ✅ Child data access
- ✅ Payment transactions
- ✅ Admin dashboard access
- ✅ Account changes
- ✅ 2FA verification

### Log Format
```json
{
  "timestamp": "2026-03-19T10:30:00Z",
  "event": "child_task_completed",
  "userId": "parent-123",
  "childId": "child-456",
  "taskId": "task-789",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "status": "success"
}
```

---

## 🧪 Security Testing Checklist

- [ ] Parent cannot access other parent's children
- [ ] Child cannot modify task metadata
- [ ] Child token expires correctly
- [ ] Admin changes are audited
- [ ] Rate limiting works on auth endpoints
- [ ] CSRF protection active on mutations
- [ ] Error messages don't leak data
- [ ] Session fixation prevented
- [ ] XSS payloads neutralized
- [ ] SQL injection attempts blocked
- [ ] Token validation on every protected route
- [ ] Refresh token flow secure
- [ ] Logout clears all sessions

---

**Last Updated**: 2026-03-19  
**Security Review**: ✅ Current  
**Audit Logging**: ✅ Enabled  
**Rate Limiting**: ✅ Active  
**Token Validation**: ✅ Enforced
