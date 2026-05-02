# ⚠️ Error Handling & Recovery Strategy Map

**Classify Platform — Complete Error Scenarios, Recovery Chains & Fallback Strategies**

---

## 🛡️ Error Classification Framework

### Error Severity Levels

```
🔴 CRITICAL (User blocked, data loss risk)
   └─ Examples: Auth failure, payment failure, data corruption
   └─ Response: Immediate alert + clear recovery path

🟠 HIGH (Feature broken, workaround available)
   └─ Examples: Image upload fails, game save fails
   └─ Response: Retry option + fallback mode

🟡 MEDIUM (Degraded experience, non-blocking)
   └─ Examples: Slow load, missing optional data
   └─ Response: Graceful degradation + background retry

🟢 LOW (Notice only, no impact)
   └─ Examples: Analytics tracking fails, minor UI glitch
   └─ Response: Log for monitoring, no user action
```

---

## 🚨 Route-Specific Error Scenarios

### Authentication Routes (/parent-auth, /otp)

#### Scenario 1: Invalid Login Credentials
```
Error:           { error: 'INVALID_CREDENTIALS', message: 'Email or password incorrect' }
Severity:        🟡 MEDIUM
User Impact:     Cannot login
Recovery:        1. Show inline error
                 2. Suggest forgot password
                 3. Offer password reset link
Flow:
  [User enters wrong password]
    → [Submit fails]
    → [Show: "Invalid email or password"]
    → [Disable input, show retry]
    → [User clicks "Forgot Password?"]
    → [Redirect to /forgot-password]
```

#### Scenario 2: Account Locked (Rate Limiting)
```
Error:           { error: 'RATE_LIMITED', retryAfter: 900 }
Severity:        🟠 HIGH
User Impact:     Cannot login for 15 minutes
Recovery:        1. Show countdown timer
                 2. Offer account unlock link
                 3. Send unlock email
Flow:
  [5th failed attempt]
    → [Account temporarily locked]
    → [Show: "Too many attempts. Try again in 15:00"]
    → [Timer updates every second]
    → [User gets unlock email with link]
    → [Click link → Account unlocked]
    → [Can login again]
```

#### Scenario 3: OTP Expired
```
Error:           { error: 'OTP_EXPIRED', message: 'Code expired after 5 minutes' }
Severity:        🟡 MEDIUM
User Impact:     Cannot complete 2FA
Recovery:        1. Show expiration message
                 2. Offer "Request new code"
                 3. Send new OTP to email
Flow:
  [User enters OTP after 6 minutes]
    → [Validation fails: OTP expired]
    → [Show: "Code expired. Click to request new code"]
    → [User clicks "Request New"]
    → [New OTP sent to email]
    → [Show: "New code sent. Check email."]
    → [User enters new code]
    → [Proceeds to dashboard]
```

---

### Parent Dashboard Routes

#### Scenario 1: API Timeout on Dashboard Load
```
Error:           { error: 'TIMEOUT', endpoint: '/api/parent/profile', timeout: 3000 }
Severity:        🟡 MEDIUM
User Impact:     Dashboard shows loading state stuck
Recovery:        1. Timeout after 3s
                 2. Show skeleton + retry button
                 3. Continue loading in background
                 4. Fetch less data (fallback query)
Flow:
  [User visits /parent-dashboard]
    → [Fetch parent profile → TIMEOUT 3s]
    → [Show skeleton loaders]
    → [Display partial data from cache]
    → [Show "Some data failed to load" notice]
    → [User clicks Retry]
    → [Retry with simpler query]
    → [Dashboard loads]
```

#### Scenario 2: Network Disconnected
```
Error:           { error: 'NETWORK_ERROR', type: 'offline' }
Severity:        🟠 HIGH
User Impact:     Cannot refresh data
Recovery:        1. Detect offline
                 2. Show banner: "No internet connection"
                 3. Use cached data only
                 4. Queue writes for sync
Flow:
  [Network drops while on dashboard]
    → [API calls start failing]
    → [Show: "Your internet appears offline"]
    → [Display cached dashboard]
    → [Disable all write operations]
    → [Queue any attempted changes]
    → [Network returns]
    → [Show: "Back online! Syncing..."]
    → [Sync queued changes]
    → [Refresh data]
```

---

### Payment Routes (/wallet, /task-cart)

#### Scenario 1: Stripe Payment Failure
```
Error:           { error: 'PAYMENT_FAILED', stripeError: 'card_declined' }
Severity:        🔴 CRITICAL
User Impact:     Cannot complete purchase
Recovery:        1. Clear transaction lock
                 2. Show specific error (card declined, expired, etc.)
                 3. Suggest alternatives
                 4. Preserve cart
Flow:
  [User completes Stripe payment]
    → [Card declined by bank]
    → [Payment fails]
    → [Clear payment lock]
    → [Show: "Card was declined. Try another card."]
    → [User clicks "Try Different Card"]
    → [Cart preserved]
    → [Redirect to checkout]
    → [User enters new card]
    → [Payment succeeds]
```

#### Scenario 2: Duplicate Payment Prevention
```
Error:           { error: 'DUPLICATE_TRANSACTION', transactionId: '123' }
Severity:        🔴 CRITICAL
User Impact:     Payment succeeded but user sees error (idempotency check)
Recovery:        1. Detect duplicate
                 2. Return existing transaction result
                 3. Show success message
                 4. Avoid double-charging
Flow:
  [User clicks "Complete Purchase" twice rapidly]
    → [First payment starts]
    → [User impatient, clicks again]
    → [Second request before first completes]
    → [API detects potential duplicate]
    → [Returns: { success: true, transactionId: '123' }]
    → [Both requests see success]
    → [Charged only once]
    → [Show: "Purchase completed"]
```

---

### Game Routes (/child-games, /match3)

#### Scenario 1: Game Canvas Crash
```
Error:           { error: 'CANVAS_ERROR', type: 'WebGL not supported' }
Severity:        🟠 HIGH
User Impact:     Game cannot launch
Recovery:        1. Catch canvas error
                 2. Show message: "Game cannot run on this device"
                 3. Show trial/lite version
                 4. Offer alternatives
Flow:
  [Child opens /match3]
    → [Game initializes canvas]
    → [WebGL initialization fails]
    → [Error caught in ErrorBoundary]
    → [Show: "This game needs a newer device"]
    → [Links to: Play other games, Trial game, Support]
    → [User clicks "Other Games"]
    → [Navigate to /child-games]
```

#### Scenario 2: Game Save Failed
```
Error:           { error: 'SAVE_FAILED', reason: 'localStorage full' }
Severity:        🟡 MEDIUM
User Impact:     Score might not persist
Recovery:        1. Show error during game
                 2. Try cloud backup
                 3. Clear old saves
                 4. Retry
Flow:
  [Child completes /match3 game with score 5000]
    → [Game tries to save score]
    → [localStorage.setItem() fails (full)]
    → [Show: "Saving score..."]
    → [Retry with cloud backup endpoint]
    → [Cloud save succeeds]
    → [Show: "Score saved!"]
    → [Score recorded]
```

---

## 🔄 Global Error Recovery Chains

### Error Boundary Chain (React)
```
┌─ Component Error ─────────────────────────────┐
│                                               │
│  [Render error in ChildGames component]       │
│           ↓                                   │
│  [ErrorBoundary catches error]                │
│           ↓                                   │
│  [Try: componentDidCatch()]                   │
│           ↓                                   │
│  [Fallback UI: "Something went wrong"]        │
│           ↓                                   │
│  [Show: Retry button + Report bug]            │
│           ↓                                   │
│  [User clicks Retry]                          │
│           ↓                                   │
│  [Reload component]                           │
│           ↓                                   │
│  [Success or: Redirect to /child-games]       │
└─────────────────────────────────────────────────┘
```

### API Error Chain
```
┌─ API Call Failure ─────────────────────────────────┐
│                                                   │
│  [POST /api/tasks/complete → 500 error]          │
│           ↓                                       │
│  [Catch error in try/catch]                       │
│           ↓                                       │
│  [Check status code]                              │
│           ├─ 401 (Unauthorized)                   │
│           │   └─ Clear token + redirect /login    │
│           │                                       │
│           ├─ 429 (Rate limited)                   │
│           │   └─ Show retry timer                 │
│           │                                       │
│           ├─ 5xx (Server error)                   │
│           │   └─ Retry with exponential backoff   │
│           │                                       │
│           └─ Network error                        │
│               └─ Queue for offline sync           │
│           ↓                                       │
│  [Retry if applicable]                            │
│           ↓                                       │
│  [Success or: User notification]                  │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Error Recovery SLA

### Recovery Time Objectives (RTOs)

| Error Type | Detect Time | Recovery Time | Total RTO | User Impact |
|---|---|---|---|---|
| Network offline | <100ms | On connection | 0-300s | Queued actions |
| API timeout | 3s | 5-10s retry | <15s | Retry prompt |
| Payment failed | <1s | Immediate | <1s | Clear message |
| Game crash | 0s | Instant | <500ms | Fallback UI |
| Auth expired | On request | 0s | <500ms | Redirect login |
| Database down | <5s | 30s-5min | <5min | Maintenance page |

---

## ✅ Error Testing Checklist

### For Each Route, Verify:
- [ ] Network timeout handled (3s threshold)
- [ ] 401 Unauthorized redirects to login
- [ ] 429 Rate limit shows retry countdown
- [ ] 5xx errors trigger retry with backoff
- [ ] Offline mode prevents writes
- [ ] Error boundaries catch crashes
- [ ] User gets clear error message
- [ ] Recovery option is obvious
- [ ] Logging sends error to monitoring
- [ ] Analytics tracks error occurrence

### Critical Path Tests

```javascript
describe('Error Recovery', () => {
  it('should recover from network timeout', () => {
    // Mock fetch to timeout after 3s
    // Verify retry button appears
    // Verify UX is not broken
  })
  
  it('should handle 401 and redirect', () => {
    // Mock API to return 401
    // Verify token cleared
    // Verify redirected to /parent-auth
    // Verify user sees "Session expired"
  })
  
  it('should queue offline writes', () => {
    // Simulate offline
    // User attempts to create task
    // Verify queued in localStorage
    // Go online
    // Verify queued task syncs
    // Verify success notification
  })
  
  it('should prevent duplicate payments', () => {
    // Click pay button twice rapidly
    // Verify only one charge
    // Verify both requests see success
  })
})
```

---

## 📈 Error Monitoring Dashboard

### Metrics to Track

```
Metric                  | Alert Threshold | Current | Status
────────────────────────┼─────────────────┼─────────┼────────
Error Rate (%)          | > 0.5%          | 0.3%    | 🟢 OK
Auth Failures/hour      | > 100           | 45      | 🟢 OK
Payment Failures (%)    | > 1%            | 0.2%    | 🟢 OK
API 5xx Errors/min      | > 10            | 2       | 🟢 OK
Offline Users (%)       | Monitor         | 12%     | 🟡 Investigate
Crash Rate (%)          | > 0.1%          | 0.05%   | 🟢 OK
Queue Depth (offline)   | > 1000 items    | 234     | 🟢 OK
```

### Error Budget
```
Total allowed errors: 99.9% uptime = 43 minutes/month of errors
Current month: 25 min used | 18 min remaining budget
```
