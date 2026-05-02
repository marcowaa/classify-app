# 📊 Data Flow & State Dependencies Map

**Classify Platform — Complete Data Relationships & State Transitions**

---

## 🔄 Core Data Model Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Database Core                        │
├─────────────────────────────────────────────────────────┤
│  parents                    ← Authentication root       │
│  ├─ children (via FK)      ← Parent owns children      │
│  ├─ parentChild (pivot)    ← Relationship mgmt         │
│  ├─ tasks (via FK)         ← Parent creates tasks      │
│  ├─ notifications (via FK) ← Parent receives alerts    │
│  ├─ wallet (1:1)           ← Payment data              │
│  └─ purchases (via FK)     ← Transaction history       │
│                                                         │
│  children                                              │
│  ├─ parentChild (pivot)    ← Links to parents          │
│  ├─ childScores (via FK)   ← Game scores               │
│  ├─ childProgress (1:1)    ← XP & levels              │
│  ├─ childRewards (via FK)  ← Coins & items             │
│  └─ tasks (via FK)         ← Assigned tasks            │
│                                                         │
│  tasks (marketplace)                                   │
│  ├─ taskAssignments (via FK) ← Child task links       │
│  └─ taskReviews (via FK)     ← Quality notes           │
│                                                         │
│  games                                                 │
│  ├─ childScores (via FK)   ← Scores per game          │
│  └─ screenshots (via FK)   ← Game evidence             │
└─────────────────────────────────────────────────────────┘
```

---

## 🔀 Major Data Flows

### 1. Parent Registration Flow
```
Step 1: /parent-auth (POST /api/auth/register)
├─ Input: email, password, name
├─ Validation: email unique, password strong
└─ Output: parentToken, refreshToken

Step 2: Create parent record
├─ INSERT INTO parents (email, passwordHash, name)
├─ Hash password with bcrypt
└─ Return: parentId, role='parent'

Step 3: Optional: Send welcome email
├─ Trigger: onSignupSuccess event
├─ Service: mailer.sendWelcomeEmail()
└─ Log: signup_success event

Result: Parent can now link children
```

### 2. Child Linking Flow
```
Step 1: /child-link (GET link code or POST new child)
├─ Input: childName, birthYear, parentCode
├─ Generate: 6-digit linkCode
└─ Store: linkCode with TTL=15min

Step 2: Child enters code
├─ POST /api/child/verify-link
├─ Validate: Code exists & not expired
└─ Validate: Code issued by parent

Step 3: Create parent-child relationship
├─ INSERT INTO parentChild (parentId, childId)
├─ Generate: childToken (read-only JWT)
└─ Return: childToken, childName

Step 4: Child profile initialized
├─ INSERT INTO childProgress (childId, level=1, xp=0)
├─ INSERT INTO childRewards (childId, coins=0)
└─ Enable: child routing

Result: Child can access /child-* routes
```

### 3. Task Assignment Flow
```
Step 1: Parent browses /task-marketplace
├─ Query: SELECT * FROM tasks
├─ Filter: category, difficulty
└─ Display: 50+ available tasks

Step 2: Parent adds to cart (/task-cart)
├─ Action: Add to localStorage cart
├─ Calculate: Total price in coins
└─ Display: Checkout form

Step 3: Parent completes purchase (/wallet)
├─ Trigger: Stripe payment modal
├─ Payment: Process via Stripe API
├─ On Success: Create transaction record
└─ On Success: Deduct coins from wallet

Step 4: POST /api/tasks/assign-to-child
├─ Input: taskId[], childId
├─ Validate: Parent owns child
├─ INSERT INTO taskAssignments (taskId, childId, assignedAt)
├─ Create notification: Task assigned
└─ Send email: Parent's task assigned

Step 5: Child sees task (/child-tasks)
├─ Query: SELECT * FROM tasks WHERE childId=?
├─ Filter: Incomplete tasks only
├─ Display: Task list with details
└─ Enable: Complete button

Step 6: Child completes task
├─ POST /api/child/complete-task
├─ Input: taskId, completionProof
├─ Update: completedAt, score
├─ Calculate: Coins earned (task.coinReward)
└─ Update: childRewards.coins += earned

Step 7: Parent sees completion (/parent-dashboard)
├─ Notification: Task completed
├─ Query: SELECT * FROM taskAssignments WHERE status='completed'
├─ Display: Completion summary
└─ Action: Review/verify completion

Result: Data flow: Parent → Market → Cart → Payment → Child → Completion → Parent
```

### 4. Game Score Flow
```
Step 1: Child plays game (/child-games → /match3)
├─ Load: Game instance in iframe
├─ Start: Game session tracking
├─ Player: Interacts with game UI

Step 2: Game ends (win/lose)
├─ Emit: gameEnd event with score
├─ Calculate: Points, stars, time
└─ Trigger: Score submission

Step 3: POST /api/games/:gameId/submit-score
├─ Input: gameId, score, timeSpent, proof
├─ Validate: childToken present
├─ Validate: Score reasonable (< 999,999)
├─ INSERT INTO childScores (childId, gameId, score)
├─ Calculate: XP earned (score/100)
└─ Update: childProgress.xp += xp

Step 4: Update progress/rewards
├─ Check: XP threshold for level up
├─ If levelUp: Notify parent
├─ Calculate: Coin bonus (level * 10)
├─ Update: childRewards.coins += bonus

Step 5: Parent sees stats (/parent-dashboard)
├─ Query: SELECT * FROM childScores WHERE childId=?
├─ Aggregate: Total score, avg, best
├─ Display: Progress chart
└─ Action: Share achievement

Result: Scores → XP → Levels → Rewards → Parent visibility
```

### 5. Notification Flow
```
Step 1: Trigger events
├─ Task assigned to child
├─ Task completed by child
├─ Gift sent by parent
├─ Achievement unlocked
└─ Level up reached

Step 2: POST /api/notifications/create
├─ Input: type, recipientId, data
├─ INSERT INTO notifications (recipientId, type, seen=false)
├─ If parent: Store in parentNotifications
├─ If child: Store in childNotifications
└─ Log: notification_created event

Step 3: Real-time push (OneSignal)
├─ Emit: NotificationSync event
├─ Send: Push to device app
├─ Log: push_sent event
└─ Return: Success/failure

Step 4: Parent sees /notifications
├─ Query: SELECT * FROM parentNotifications WHERE seen=false
├─ Display: Notification list
├─ Action: Mark as read
└─ Action: Click to navigate (deep link)

Step 5: Child sees /child-notifications
├─ Query: SELECT * FROM childNotifications
├─ Filter: By type (task, gift, reward)
├─ Display: Categorized alerts
├─ Action: Click → Navigate to relevant page

Result: Event → Database → Push → UI Display → User Action
```

---

## 🗂️ State Management Layers

### Layer 1: Backend State (Database)
```typescript
// Persistent, source of truth
parents
  ├─ parentId (PK)
  ├─ email (unique)
  ├─ passwordHash
  ├─ name
  ├─ twoFAEnabled
  ├─ lastLogin
  └─ createdAt

children
  ├─ childId (PK)
  ├─ name
  ├─ birthYear
  ├─ avatar
  └─ createdAt

parentChild (relationship)
  ├─ parentId (FK)
  ├─ childId (FK)
  ├─ linkedAt
  └─ permissions[]

tasks
  ├─ taskId (PK)
  ├─ parentId (FK)
  ├─ title
  ├─ description
  ├─ category
  ├─ coinReward
  └─ completionCriteria

childScores
  ├─ scoreId (PK)
  ├─ childId (FK)
  ├─ gameId (FK)
  ├─ score
  ├─ earnedAt
  └─ verified (for cheating detection)
```

### Layer 2: API Caching (React Query)
```typescript
// Temporary, reduces server load
useQuery('parents/{parentId}')
useQuery('children/{childId}')
useQuery('tasks/marketplace')
useQuery('childScores/{childId}')
useQuery('notifications/{userId}')

// Cache strategies:
// - staleTime: 5 minutes
// - cacheTime: 30 minutes
// - gcTime: 1 hour (for offline support)
```

### Layer 3: Local State (React useState)
```typescript
// Page-level, short-lived
- taskCartItems[] (before purchase)
- notificationFilter (selected type)
- gameInProgress (current game state)
- formData (during edit)

// Cache strategies:
// - Reset on unmount
// - Sync with parent on submit
```

### Layer 4: Browser Storage (localStorage)
```typescript
// Persistent client-side
localStorage.setItem('parentToken')
localStorage.setItem('childToken')
localStorage.setItem('userPreferences')
localStorage.setItem('draftTask')
localStorage.setItem('cartItems')

// Risk: Can be cleared by user, not synced
```

---

## 🔗 Cross-Route Data Dependencies

### Page A → Page B Data Flow

| From Page | To Page | Data Passed | Method | State |
|---|---|---|---|---|
| `/parent-dashboard` | `/parent-tasks` | childId (optional) | URL param | Query |
| `/parent-tasks` | `/task-marketplace` | category filter | URL query | Preserved |
| `/task-marketplace` | `/task-cart` | itemIds[] | localStorage | Local |
| `/task-cart` | `/wallet` | total price | localStorage | Local |
| `/wallet` | `/parent-inventory` | purchaseId | URL param | Sync |
| `/parent-dashboard` | `/assign-task` | childId | URL param | Query |
| `/assign-task` | `/parent-dashboard` | taskId | Redirect | Refresh |
| `/child-profile` | `/child-games` | childId (implicit) | Context | Implicit |
| `/child-games` | `/match3` | gameConfig | Context | Iframe data |
| `/match3` | `/child-games` | score data | Message event | Callback |
| `/child-tasks` | `/child-games` | taskId (optional) | URL param | Query |
| `/child-notifications` | Various | deepLink URL | Click handler | Navigate |
| `/notifications` | `/parent-dashboard` | childId | URL query | Redirect |

---

## ⚠️ Common Data Synchronization Issues

### Issue 1: Stale Parent Data
```
Problem:
  1. Parent opens /parent-dashboard
  2. Child completes task (childToken used)
  3. Parent refreshes manually
  
Solution:
  - Real-time subscription: WebSocket or polling
  - React Query: setQueryData() invalidation
  - Notification trigger: Parent sees new score immediately
```

### Issue 2: Cart Persistence Across Sessions
```
Problem:
  1. Add items to /task-cart
  2. Close browser
  3. Reopen: Cart empty
  
Solution:
  - localStorage persists cart across sessions
  - POST /api/tasks/save-draft-cart
  - On login: Restore cart from server
```

### Issue 3: Orphaned Child Scores
```
Problem:
  1. Child plays game (score = 1000)
  2. Parent unllinks child
  3. Score still exists in DB
  
Solution:
  - ON DELETE CASCADE: deletions cascade
  - Soft delete: Mark as deleted, preserve history
  - Audit trail: Log unlink events
```

### Issue 4: Concurrent Gift Sends
```
Problem:
  1. Parent sends coin gift
  2. Another parent sends gift simultaneously
  3. Race condition in wallet update
  
Solution:
  - Database transactions: ACID guarantees
  - Optimistic locking: Version field
  - Queue system: Process gifts sequentially
```

---

## 🎯 Data Consistency Checks

### Invariants (Must Always Be True)

```typescript
// 1. Parent-Child relationship valid
For each (parentId, childId) in parentChild:
  ✅ parents[parentId] exists
  ✅ children[childId] exists

// 2. Child scores belong to linked children
For each score in childScores:
  ✅ (score.childId) linked to this child
  ✅ game[score.gameId].allowedAges contains child.age

// 3. Wallet balance never negative
For each wallet in wallets:
  ✅ wallet.balance >= 0

// 4. No duplicate parent-child links
For each (parentId, childId) pair:
  ✅ count(*) = 1 (no duplicates)

// 5. Notifications have valid recipients
For each notification:
  ✅ parents[recipient.parentId] OR children[recipient.childId] exists
```

### Consistency Maintenance
- [ ] Database constraints enforce invariants
- [ ] Triggers validate on every write
- [ ] Daily audit job checks violations
- [ ] Alerting: Notify ops if violations found
- [ ] Recovery: Quarantine suspect records

---

## 📈 Data Access Patterns

### Most Frequent Queries
1. **Get child scores**: O(1) with proper indexing
2. **List parent's children**: O(n log n) sorted
3. **Get notifications**: O(1) with cursor pagination
4. **Browse marketplace**: O(n) with filtering
5. **Calculate wallet balance**: O(1) cached

### Indexes (Database Optimization)
```sql
CREATE INDEX idx_parentChild_parentId ON parentChild(parentId);
CREATE INDEX idx_parentChild_childId ON parentChild(childId);
CREATE INDEX idx_childScores_childId ON childScores(childId);
CREATE INDEX idx_childScores_createdAt ON childScores(createdAt DESC);
CREATE INDEX idx_notifications_userId ON notifications(userId);
CREATE INDEX idx_tasks_parentId ON tasks(parentId);
CREATE UNIQUE INDEX idx_tasks_parentId_title ON tasks(parentId, title);
```

---

## 🔐 Data Privacy Rules

| Data Type | Parent Access | Child Access | Admin Access |
|---|---|---|---|
| Other parent's children | ❌ No | N/A | ✅ View only |
| Own children data | ✅ Full | N/A | ✅ View only |
| Own child's scores | ✅ Full | ✅ Own only | ✅ View only |
| Own wallet/payment | ✅ Full | ❌ No | ✅ View only |
| Other's wallet | ❌ No | ❌ No | ✅ View only (admin) |
| Child's profile data | ✅ Own parent | ✅ Full | ✅ View only |
| Child's public profile | ✅ Link viewer | ✅ Link viewer | ✅ Full |

---

## 📊 Data Volume Estimates

| Entity | Growth Rate | Estimated Count (1M users) |
|---|---|---|
| Parents | +10k/day | 200k |
| Children | +15k/day | 500k |
| Tasks | +1k/day | 50k |
| Child Scores | +5M/day | 1.2B |
| Notifications | +2M/day | 50M/month |
| Transactions | +100k/day | 3M/month |

### Storage Calculations
```
Parents:        200k × 500B = 100 MB
Children:       500k × 400B = 200 MB
Tasks:          50k × 1KB = 50 MB
Child Scores:   1.2B × 200B = 240 GB
Notifications:  50M × 300B = 15 GB
Transactions:   3M × 2KB = 6 GB
─────────────────────────────────
TOTAL: ~277 GB (uncompressed, 2 years data)
```

---

**Last Updated**: 2026-03-19  
**Data Model Version**: 2.1  
**Consistency Checks**: ✅ Daily  
**Backup Strategy**: ✅ Hourly  
**Disaster Recovery**: ✅ Tested
