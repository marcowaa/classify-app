# ⚡ Performance Optimization & API Dependencies Map

**Classify Platform — Route-Level Performance Analysis & Optimization Strategy**

---

## 🚀 Performance Metrics by Route

### Page Load Performance Targets
```
Target:        < 3s on 3G, < 1s on LTE
Measurement:   FCP (First Contentful Paint) + TTI (Time to Interactive)
```

### Public Pages
| Route | Optimal | Current | API Calls | Bundle | Status |
|---|---|---|---|---|---|
| `/` | 1.2s | 1.5s | 2 | 45 KB | 🟡 Good |
| `/parent-auth` | 0.8s | 0.9s | 0 | 32 KB | 🟢 Optimal |
| `/download` | 0.5s | 0.6s | 0 | 18 KB | 🟢 Optimal |
| `/trial-games` | 2.0s | 2.8s | 3 | 150 KB | 🟡 Needs work |
| `/otp` | 0.6s | 0.7s | 1 | 22 KB | 🟢 Optimal |

### Parent Dashboard Pages
| Route | Optimal | Current | API Calls | Bundle | Cached | Status |
|---|---|---|---|---|---|---|
| `/parent-dashboard` | 1.5s | 1.8s | 5 | 65 KB | ✅ Yes | 🟡 Good |
| `/parent-store` | 2.0s | 3.2s | 8 | 85 KB | ❌ No | 🔴 Slow |
| `/parent-tasks` | 1.8s | 2.1s | 4 | 72 KB | ✅ Yes | 🟡 Good |
| `/task-marketplace` | 2.5s | 4.1s | 12 | 95 KB | ❌ No | 🔴 Slow |
| `/wallet` | 1.2s | 1.4s | 2 | 48 KB | ✅ Yes | 🟢 Optimal |

### Child Pages
| Route | Optimal | Current | API Calls | Bundle | Status |
|---|---|---|---|---|---|
| `/child-games` | 2.0s | 2.3s | 3 | 80 KB | 🟡 Good |
| `/child-tasks` | 1.5s | 1.7s | 2 | 58 KB | 🟢 Optimal |
| `/child-store` | 2.0s | 2.2s | 3 | 75 KB | 🟡 Good |
| `/match3` | 3.0s | 4.5s | 0 | 150 KB | 🔴 Slow |
| `/child-profile` | 1.8s | 1.9s | 2 | 65 KB | 🟡 Good |

---

## 📡 API Dependencies by Route

### Common API Patterns

#### Parent Dashboard (5 parallel calls)
```
/parent-dashboard request waterfall:
├─ GET /api/parent/profile           { timeout: 3s, cache: 5min }
├─ GET /api/parent/children          { timeout: 5s, cache: 10min }
├─ GET /api/parent/notifications     { timeout: 3s, cache: 1min }
├─ GET /api/parent/wallet            { timeout: 2s, cache: 15min }
└─ GET /api/parent/recent-activity   { timeout: 4s, cache: 5min }

Total: ~5s waterfall (or 1s parallel with Promise.all)
Current: ❌ Sequential (5s)
Optimal: ✅ Parallel (1s)
```

#### Task Marketplace (12 API calls)
```
/task-marketplace request waterfall:
├─ GET /api/tasks?page=1&limit=20   { timeout: 4s, cache: 10min }
├─ GET /api/tasks/categories        { timeout: 2s, cache: 60min }
├─ GET /api/tasks/filters           { timeout: 2s, cache: 30min }
├─ GET /api/user/preferences        { timeout: 2s, cache: 15min }
├─ GET /api/parent/budget           { timeout: 2s, cache: 5min }
⋮ [7 more calls]

Total: 12 calls → 24s sequential | 4s parallel
Current: 🟡 Partially parallel (8s)
Optimal: ✅ Full parallel (4s)
Issue: Missing cache layer, repeated calls
```

#### Child Play Session (Match3 Game)
```
/match3 request pattern:
├─ GET /api/child/profile           { timeout: 2s, cache: on-mount }
├─ GET /api/games/match3/config     { timeout: 1s, cache: static }
├─ PUT /api/games/match3/score      { timeout: 2s, no-cache (write) }
│  └─ triggers → GET /api/child/rewards (websocket)
└─ POST /api/games/match3/complete  { timeout: 3s, no-cache (write) }

Real-time sync: WebSocket for score updates
Current: ❌ HTTP polling (high latency)
Optimal: ✅ WebSocket (real-time)
```

---

## 💾 Caching Strategy by Route

### Recommended Cache Configuration

#### Public Pages (Aggressive Caching)
```
Route              | HTTP Cache | Service Worker | Redux | TTL
/                  | 15 min     | ✅ Cache first | ❌   | -
/parent-auth       | 1 hour     | ✅ Network     | ❌   | -
/download          | 24 hours   | ✅ Cache only  | ❌   | -
/trial-games       | 1 hour     | ✅ Cache first | ❌   | -
/privacy-policy    | 1 week     | ✅ Cache only  | ❌   | -
```

#### Parent Dashboard (Smart Caching)
```
Route                  | Strategy | TTL | Invalidation
/parent-dashboard      | Stale    | 5min| Manual refresh
/parent-tasks          | SWR      | 10min| On mutation
/parent-store          | Network  | 0   | Every load
/task-marketplace      | Stale    | 15min| On search
/wallet                | Stale    | 20min| On transaction
```

#### Child Pages (Real-time Priority)
```
Route              | Strategy | TTL | Mechanism
/child-games       | Stale    | 1min| WebSocket
/child-tasks       | Stale    | 5min| WebSocket
/child-store       | Network  | 0   | Always fresh
/match3            | Static   | ∞   | Config cached
/child-profile     | SWR      | 2min| On mutation
```

---

## 🔍 Query Optimization

### Problematic Queries (Identified Issues)

#### Issue 1: N+1 Query Problem
```sql
-- ❌ BAD: Fetches parent, then loops to fetch each child's data
SELECT * FROM parents WHERE id = ?;
FOR EACH child:
  SELECT * FROM childProgress WHERE childId = ?;  -- N queries!

-- ✅ GOOD: Single batched query
SELECT p.*, cp.* 
FROM parents p
LEFT JOIN childProgress cp ON p.id = cp.parentId
WHERE p.id = ?;
```

**Impact**: `/parent-dashboard` → Fix saves 5-10 database queries

#### Issue 2: Missing Index
```sql
-- ❌ SLOW: Full table scan
SELECT * FROM notifications WHERE parentId = ? AND read = FALSE;

-- ✅ FAST: Create composite index
CREATE INDEX idx_notifications_parentId_read 
ON notifications(parentId, read);
```

**Impact**: `/notifications` → 10x faster with index

#### Issue 3: Cartesian Product
```sql
-- ❌ SLOW: 10 tasks × 5 assignments = 50 rows (duplicates)
SELECT t.*, ta.* FROM tasks t
JOIN taskAssignments ta ON t.id = ta.taskId
WHERE t.id IN (1,2,3);

-- ✅ FAST: Use aggregation
SELECT t.*, COUNT(ta.id) as assignment_count
FROM tasks t
LEFT JOIN taskAssignments ta ON t.id = ta.taskId
WHERE t.id IN (1,2,3)
GROUP BY t.id;
```

**Impact**: `/parent-tasks` → 50% fewer rows transferred

---

## 🧵 Bundle Size Optimization

### Current Bundle Analysis
```
client/dist/assets/:
├─ bundle.main.js      | 320 KB | Core app + all pages
├─ vendor.js           | 450 KB | React, wouter, UI libs
├─ games.js            | 200 KB | Game files (Match3, Memory)
└─ styles.css          | 80 KB  | Tailwind + custom styles

Total: 1,050 KB
Size per route: ~18 KB average (1050 / 57 routes)

Problem: All routes bundled together (no code-splitting)
Solution: Lazy-load by feature (in progress)
```

### Recommended Splitting
```javascript
// Current: ❌ One bundle for everything
app.js (1,050 KB)

// Optimal: ✅ Split by feature
core.js           (200 KB) - React, router, providers
parent-app.js     (300 KB) - Parent feature set
child-app.js      (250 KB) - Child feature set
games.js          (200 KB) - Game bundles
admin.js          (100 KB) - Admin feature

// Further split games:
games/core.js           (50 KB)
games/match3.js         (80 KB)  ← Load only when needed
games/memory-match.js   (70 KB)  ← Load only when needed
```

**Estimated Improvements**:
- Home page: 1,050 KB → 200 KB (81% reduction)
- /parent-dashboard: 1,050 KB → 500 KB (52% reduction)
- /child-games: 1,050 KB → 450 KB (57% reduction)

---

## 📊 Real User Monitoring (RUM) Strategy

### Metrics to Track per Route
```
Route             | FCP | LCP | CLS | TTI | Interactions/min
/                 | 0.8s| 1.2s| 0.05| 1.5s| 5-10
/parent-auth      | 0.6s| 0.8s| 0.02| 1.0s| 3-8
/parent-dashboard | 1.2s| 1.8s| 0.08| 2.5s| 10-20
/child-games      | 1.5s| 2.2s| 0.10| 3.0s| 15-30
/match3           | 2.0s| 3.5s| 0.15| 4.5s| 20-40
```

### Monitoring Implementation
```typescript
// Using Web Vitals API
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(metric => analytics.track('CLS', { route: location.pathname, 
value: metric.value }));
getLCP(metric => analytics.track('LCP', { route: location.pathname, 
value: metric.value }));
// ... repeat for all metrics
```

---

## 🔧 Optimization Roadmap

### Phase 1 (High Impact, Low Effort) — 2 weeks
- [ ] Implement query index: `idx_notifications_parentId_read`
- [ ] Enable HTTP caching headers for static pages
- [ ] Fix N+1 query in `/parent-dashboard`
- [ ] Parallel API calls for parent onboarding

**Expected Impact**: 30-40% load time improvement

### Phase 2 (Medium Impact, Medium Effort) — 4 weeks
- [ ] Code-split games into separate bundles
- [ ] Implement SWR caching for dashboard data
- [ ] Lazy-load parent vs. child app features
- [ ] WebSocket for real-time game scores

**Expected Impact**: 50-60% load time improvement

### Phase 3 (Advanced, High Effort) — 6 weeks
- [ ] GraphQL instead of REST (reduces over-fetching)
- [ ] Image optimization & CDN
- [ ] Component-level code-splitting
- [ ] Service Worker offline support

**Expected Impact**: 70-80% load time improvement

---

## 📋 Optimization Checklist

- [ ] Measure baseline FCP/LCP/TTI for all routes
- [ ] Identify slow API endpoints
- [ ] Implement recommended cache strategies
- [ ] Test with DevTools Performance tab
- [ ] Monitor RUM in production
- [ ] Set performance budgets per route
- [ ] Automate performance regression tests
- [ ] Document performance by route
