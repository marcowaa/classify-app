# 🌐 Real-time, Offline & Accessibility Capabilities Map

**Classify Platform — WebSocket Sync, Offline Mode & Accessibility by Route**

---

## 🔌 Real-time & WebSocket Capabilities

### WebSocket Routes (Real-time Updates)

| Route | Event Type | Updates | Latency | Fallback |
|---|---|---|---|---|
| `/parent-dashboard` | Child event | Score, progress | <100ms | Poll every 30s |
| `/notifications` | New notification | Count, bell icon | <50ms | Poll every 10s |
| `/child-games` | Score update | Live scoreboard | <100ms | Poll on complete |
| `/child-rewards` | Gift/coin add | Balance update | <50ms | Manual refresh |
| `/parent-tasks` | Task completion | Task status | <100ms | Manual refresh |

### WebSocket Implementation

#### Parent Dashboard (Real-time Score Updates)
```javascript
// Subscribe to child events
useEffect(() => {
  const ws = new WebSocket('wss://api.classify.app/socket');
  
  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: 'subscribe',
      channel: `parent:${parentId}:children`,
      token: parentToken
    }));
  };
  
  ws.onmessage = (event) => {
    const { type, data } = JSON.parse(event.data);
    
    switch(type) {
      case 'CHILD_SCORED':
        updateChildScore(data);           // Real-time update
        showNotification(data.message);   // UI feedback
        break;
      case 'TASK_COMPLETED':
        updateTaskStatus(data);
        break;
    }
  };
  
  return () => ws.close();
}, [parentId, parentToken]);
```

#### Child Games (Live Score Sync)
```javascript
// Match3 game score updates
const submitScore = async (finalScore) => {
  // Send to server
  const result = await api.post('/api/games/match3/score', {
    score: finalScore,
    duration: gameDuration,
    childId: childId
  });
  
  // WebSocket notifies other parent clients in real-time
  // ws sends: { type: 'CHILD_SCORED', childId, score: 1500, game: 'match3' }
};
```

### WebSocket Connection Management
```
Normal State:        Connected → Auto-reconnect on disconnect
Reconnect Strategy:  Exponential backoff (1s, 2s, 4s, 8s, max 30s)
Offline Detection:   Browser `online` event + connection timeout
Message Queue:       Buffer msgs while offline, send on reconnect
Heartbeat:           Ping every 30s to detect stale connections
```

---

## 📵 Offline Capabilities by Route

### Offline Support Matrix

| Route | Offline Support | Cached Data | Write Queue | Sync Strategy |
|---|---|---|---|---|
| `/` | ✅ Full | Static HTML | N/A | N/A |
| `/trial-games` | ✅ Full | Game logic | N/A | N/A |
| `/parent-dashboard` | ⚠️ Partial | Last snapshot | ❌ No | On reconnect |
| `/child-games` | ✅ Full | Game + config | ✅ Scores | On reconnect |
| `/child-store` | ⚠️ Partial | Last prices | ❌ No | On reconnect |
| `/task-marketplace` | ⚠️ Partial | Last listing | ❌ No | On reconnect |

### Service Worker Strategy

#### Cache-First Routes (Static, Instant Load)
```javascript
// Routes that should load instantly from cache
const CACHE_FIRST = [
  '/',
  '/trial-games',
  '/privacy-policy',
  '/terms',
  '/about',
  '/download'
];

// If offline, load from cache immediately
// On online, check for updates in background
```

#### Network-First Routes (Always Fresh)
```javascript
// Routes where fresh data is critical
const NETWORK_FIRST = [
  '/parent-dashboard',    // Need latest child data
  '/wallet',              // Need current balance
  '/parent-store',        // Need current prices
  '/task-marketplace'     // Need latest tasks
];

// Try network first, fallback to cache if offline
```

#### Stale-While-Revalidate Routes (Balance)
```javascript
// Routes where slightly stale data is acceptable
const STALE_WHILE_REVALIDATE = [
  '/parent-tasks',        // Stale tasks OK for 5min
  '/child-tasks',         // Stale tasks OK for 2min
  '/child-profile',       // Stale profile OK for 5min
  '/notifications'        // Stale notifs OK for 1min
];

// Load from cache immediately, update in background
```

### Offline Data Sync Queue

#### Example: Child Completes Task Offline
```javascript
// When child completes task (no internet)
const completeTask = async (taskId) => {
  try {
    // Try to submit
    await api.post('/api/tasks/complete', { taskId });
  } catch (err) {
    if (!navigator.onLine) {
      // Queue for later
      await db.offlineQueue.add({
        action: 'completeTask',
        taskId: taskId,
        timestamp: Date.now(),
        status: 'pending'
      });
      
      // Show user feedback
      showNotification('Saved. Will sync when online.');
    }
  }
};

// When back online
window.addEventListener('online', async () => {
  const queue = await db.offlineQueue.getAll();
  
  for (const item of queue) {
    try {
      switch(item.action) {
        case 'completeTask':
          await api.post('/api/tasks/complete', { taskId: item.taskId });
          await db.offlineQueue.remove(item.id);
          break;
      }
    } catch (err) {
      // Retry later
    }
  }
  
  // Refresh UI
  location.reload();
});
```

---

## ♿ Accessibility Compliance by Route

### WCAG 2.1 Level AA Audit Status

| Route | Color | Labels | Focus | ARIA | Keyboard | Screen Reader | Status |
|---|---|---|---|---|---|---|---|
| `/` | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | 🟢 AA |
| `/parent-auth` | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | ✅ Pass | ⚠️ Partial | 🟡 AA- |
| `/parent-dashboard` | ✅ Pass | ✅ Pass | ⚠️ Weak | ⚠️ Missing | ✅ Pass | ⚠️ Partial | 🟡 AA- |
| `/child-games` | ✅ Pass | ✅ Pass | ⚠️ Weak | ✅ Pass | ❌ No | ✅ Pass | 🟡 A |
| `/match3` | ⚠️ Warning | ✅ Pass | ⚠️ Weak | ⚠️ Missing | ⚠️ Partial | ❌ No | 🔴 None |
| `/admin-dashboard` | ✅ Pass | ✅ Pass | ⚠️ Weak | ✅ Pass | ✅ Pass | ⚠️ Partial | 🟡 AA- |

### Accessibility Issues by Category

#### Color Contrast Issues
```
❌ /match3 game board: Lime green (#00FF00) on white = 1.1:1 (need 4.5:1)
❌ /task-marketplace: Gray text (#999999) on light gray bg = 3.2:1 (need 4.5:1)
❌ /child-store: Disabled buttons too faint
```

#### Missing Form Labels
```
❌ /parent-auth: Search input no label (only placeholder)
❌ /parent-tasks: Filter inputs lack associated labels
❌ /wallet: Amount input lacks label
```

#### Focus Management
```
❌ /child-games: No visible focus indicator on buttons
❌ /parent-dashboard: Focus trap not working in modals
❌ /admin-dashboard: Tab order illogical
```

### Screen Reader Compatibility

#### Issues Requiring Fixes
```
❌ /parent-dashboard:
   └─ Charts not described (no alt text)
   └─ Dynamic updates not announced
   └─ Table headers missing scope
   
❌ /child-games:
   └─ Game instructions not accessible
   └─ Score updates not announced
   └─ Game buttons lack aria-label
   
❌ /match3:
   └─ No accessible alternative (game is canvas-based)
   └─ Instructions not available to screen readers
```

### Keyboard Navigation (Tab Order)

#### Current Issues
```
❌ /parent-store: Cannot navigate modal with keyboard
❌ /child-store: Add to cart button not reachable
❌ /admin-dashboard: Toggle buttons need proper ARIA
```

#### Required Fixes
```javascript
// Example: Fix modal keyboard navigation
useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Tab') {
      // Keep focus inside modal
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };
  
  modal.addEventListener('keydown', handleKeyDown);
  return () => modal.removeEventListener('keydown', handleKeyDown);
}, []);
```

---

## 🌍 Internationalization & Locale Switching

### Locale Support by Route

| Route | AR | EN | PT | ES | FR | DE | TR | RU | ZH | HI | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 Full |
| `/parent-auth` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 Full |
| `/parent-dashboard` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ Partial | ⚠️ Partial | 🟡 90% |
| `/child-games` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 Full |
| `/match3` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟢 Full |

### RTL (Right-to-Left) Support

#### RTL Locales
- ✅ Arabic (ar)
- ✅ Persian (fa)
- ✅ Urdu (ur)
- ✅ Hebrew (he)

#### Current RTL Issues
```
⚠️ /parent-dashboard: Layout direction correct, but:
   └─ Charts still left-aligned (should mirror)
   └─ Timeline shows LTR order

⚠️ /task-marketplace: Grid items not reordered
⚠️ /match3 game: Game board not mirrored
```

### Multi-language Locale Switching

#### Implementation
```javascript
// User can switch locale at runtime
const changeLocale = (newLocale) => {
  localStorage.setItem('locale', newLocale);
  i18n.changeLanguage(newLocale);
  
  // For RTL languages, update document direction
  if (['ar', 'fa', 'ur', 'he'].includes(newLocale)) {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = newLocale;
  } else {
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = newLocale;
  }
  
  // Refresh to apply all changes
  // (Or use Suspense for smooth transition)
};
```

---

## 📋 Accessibility & Offline Roadmap

### Phase 1: Fix Critical Issues (4 weeks)
- [ ] Fix color contrast on game boards
- [ ] Add form labels to all inputs
- [ ] Implement focus management in modals
- [ ] Add ARIA live regions for notifications
- **Priority**: Game pages (ch accessibility issue)

### Phase 2: Full WCAG 2.1 AA Compliance (6 weeks)
- [ ] Test with screen readers (NVDA, JAWS)
- [ ] Fix all keyboard navigation
- [ ] Add alt text to all images/charts
- [ ] Implement skip links
- **Testing**: Full accessibility audit

### Phase 3: Advanced Features (8 weeks)
- [ ] Offline-first mode with Service Worker
- [ ] Real-time sync queue for all writes
- [ ] Predictive caching for common routes
- [ ] Background sync for offline actions
- **Testing**: Offline scenarios, sync conflicts

---

## 📊 Compliance Dashboard

```
Metric                 | Target | Current | Status
───────────────────────┼────────┼─────────┼────────
WCAG 2.1 Compliance    | 100%   | 75%     | 🟡
Offline Support        | 80%    | 40%     | 🔴
WebSocket Coverage     | 70%    | 50%     | 🟡
RTL Support Quality    | 100%   | 85%     | 🟡
Mobile A11y            | 100%   | 70%     | 🟡
Screen Reader Support  | 100%   | 65%     | 🔴
```
