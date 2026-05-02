# 🗺️ Complete Navigation & Routing Reference

## 📌 Quick Links to Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| **[PAGE_RELATIONSHIP_MAP.md](PAGE_RELATIONSHIP_MAP.md)** | Complete route mapping & navigation flows | Developers, QA, Product |
| **[docs/NAVIGATION_MAP_SUMMARY.md](docs/NAVIGATION_MAP_SUMMARY.md)** | Executive summary & status report | Team leads, Architects |
| **[PAGE_NAVIGATION_LINKS.json](PAGE_NAVIGATION_LINKS.json)** | Machine-readable navigation edges | Automation tools, Analysis |
| **[scripts/extract-navigation.cjs](scripts/extract-navigation.cjs)** | Tool to regenerate navigation map | DevOps, Maintenance |

---

## 🚀 Quick Start for First-Time Readers

### 👨‍💻 I'm a Developer
1. **New to the project?** → Start with [PAGE_RELATIONSHIP_MAP.md - "Using This Map"](PAGE_RELATIONSHIP_MAP.md#using-this-map)
2. **Need to add a page?** → Check section ["Navigation Flow"](PAGE_RELATIONSHIP_MAP.md#navigation-patterns) 
3. **Fixing a broken link?** → Search [PAGE_RELATIONSHIP_MAP.md](PAGE_RELATIONSHIP_MAP.md) for the page name

### 🎨 I'm in Design/Product
1. **Design a new user journey?** → Use [Mermaid diagrams](PAGE_RELATIONSHIP_MAP.md#navigation-graph-mermaid) to map it
2. **Verify navigation consistency?** → Check [Navigation tables](PAGE_RELATIONSHIP_MAP.md#complete-navigation-links-extracted-from-source-code)
3. **Find similar pages?** → Use Ctrl+F in [PAGE_RELATIONSHIP_MAP.md](PAGE_RELATIONSHIP_MAP.md) to search

### 🧪 I'm in QA/Testing
1. **Test complete flows?** → Use ["Navigation Patterns"](PAGE_RELATIONSHIP_MAP.md#navigation-patterns) section
2. **Check for broken links?** → Run `node scripts/extract-navigation.cjs` and compare to [PAGE_NAVIGATION_LINKS.json](PAGE_NAVIGATION_LINKS.json)
3. **Verify regression?** → Confirm all tables match actual app routes

---

## 📊 Documentation Structure

### Level 1: Navigation Overview (You are here)
- Quick links
- Quick start by role
- Document index

### Level 2: Complete Mapping ([PAGE_RELATIONSHIP_MAP.md](PAGE_RELATIONSHIP_MAP.md))
- All routes organized by flow
- Navigation tables (80+ links)
- 3 Mermaid diagrams
- Implementation notes
- Usage guide
- FAQ

### Level 3: Technical Details ([docs/NAVIGATION_MAP_SUMMARY.md](docs/NAVIGATION_MAP_SUMMARY.md))
- What was done (summary)
- Coverage statistics
- Key insights
- Deliverables
- Verification checklist

### Level 4: Raw Data ([PAGE_NAVIGATION_LINKS.json](PAGE_NAVIGATION_LINKS.json))
- Machine-readable edges
- 53 files scanned
- All links extracted (JSON format)

### Level 5: Tools & Scripts ([scripts/extract-navigation.cjs](scripts/extract-navigation.cjs))
- Automated extractor
- Regenerates map on-demand
- Can be used in CI/CD

---

## 🔄 How to Keep This Updated

### When You Add/Change a Route
1. Change the code (add `navigate()` or `<Link>`)
2. Run the extractor:
   ```bash
   node scripts/extract-navigation.cjs
   ```
3. Check `PAGE_NAVIGATION_LINKS.json` for new edges
4. Update `PAGE_RELATIONSHIP_MAP.md` tables
5. Commit both documentation files

### Automated (Optional - Set Up Pre-Commit Hook)
```bash
# Add to .git/hooks/pre-commit
node scripts/extract-navigation.cjs
git add PAGE_NAVIGATION_LINKS.json PAGE_RELATIONSHIP_MAP.md
```

---

## 📋 Navigation at a Glance

### 🏠 Public Pages (No Auth Required)
- `/` — Home
- `/parent-auth` — Parent login/register
- `/child-link` — Child onboarding
- `/trial-games` — Demo games
- `/download` — Download app
- Legal/static pages (privacy, terms, etc.)

### 👨‍👩‍👧 Parent Flow (After Login)
```
/parent-dashboard → [
  /parent-tasks → /task-marketplace → /task-cart
  /parent-store
  /wallet
  /notifications
  /settings
  ... (9 more destinations)
]
```

### 🧒 Child Flow (After Linking)
```
/child-profile → [
  /child-games → [/match3, /memory-match]
  /child-tasks
  /child-store
  /child-rewards
  ... (5 more destinations)
]
```

### 🛠 Admin Flow
```
/admin (auth) → /admin-dashboard → /admin/purchases
```

---

## 🔍 Navigation Patterns (Most Common)

| User Type | Pattern | Routes |
|-----------|---------|--------|
| **New Parent** | Register → 2FA → Dashboard | `/parent-auth` → `/otp` → `/parent-dashboard` |
| **New Child** | Get code → Link → Enter → Home | `/child-link` → auto-redirect → `/child-tasks` |
| **Parent Shopping** | Dashboard → Tasks → Marketplace → Cart → Pay | `/parent-tasks` → `/task-marketplace` → `/task-cart` → `/wallet` |
| **Child Gaming** | Profile → Games → Play → Back | `/child-profile` → `/child-games` → `/match3` → back |
| **Checking Alerts** | Dashboard → Notifications → Jump to relevant page | `/notifications` → `/child-tasks` or `/child-gifts` |

---

## 📈 Site Map (ASCII)

```
classify.app/
├── / (Home)
│   ├── /parent-auth (Parent Login)
│   │   └── /otp (2FA)
│   │       └── /parent-dashboard (Parent Hub)
│   │           ├── /parent-tasks
│   │           │   ├── /task-marketplace
│   │           │   │   └── /task-cart
│   │           │   │       └── /wallet
│   │           │   └── /task-cart
│   │           ├── /parent-store
│   │           ├── /parent-inventory
│   │           ├── /wallet
│   │           ├── /notifications
│   │           ├── /parent-profile
│   │           ├── /settings
│   │           ├── /subjects
│   │           ├── /assign-task
│   │           └── [11+ more]
│   │
│   ├── /child-link (Child Onboarding)
│   │   └── /child-profile (Child Hub)
│   │       ├── /child-games
│   │       │   ├── /match3
│   │       │   └── /memory-match
│   │       ├── /child-tasks
│   │       ├── /child-store
│   │       ├── /child-rewards
│   │       ├── /child-progress
│   │       ├── /child-gifts
│   │       ├── /child-notifications
│   │       ├── /child-settings
│   │       ├── /child-discover
│   │       └── [more child routes]
│   │
│   ├── /trial-games (Demo Games)
│   ├── /download (App Download)
│   └── [Legal Pages: /privacy-policy, /terms, /about, /contact, etc.]
│
├── /admin (Admin Portal)
│   └── /admin-dashboard
│       └── /admin/purchases
│
└── [Institutional Routes: /teacher/*, /school/*, /library/*]
```

---

## ✅ Verification Checklist

Before assuming navigation is correct:

- [ ] All new `navigate()` calls are in the extraction output
- [ ] All new `<Link>` elements are in the extraction output
- [ ] `PAGE_RELATIONSHIP_MAP.md` tables match `PAGE_NAVIGATION_LINKS.json`
- [ ] Mermaid diagrams render without errors
- [ ] No circular redirects (e.g., A→B→A)
- [ ] All target routes exist (no 404s)
- [ ] Query params documented (e.g., `?tab=`, `?view=`)
- [ ] Auth guards are in place for protected routes
- [ ] Mobile/responsive navigation works

---

## 🚨 Common Issues & Fixes

| Issue | Cause | Solution |
|-------|-------|----------|
| "Page not in map" | Route added but not extracted | Run `node scripts/extract-navigation.cjs` |
| "Broken link - 404" | Target route doesn't exist | Check route definition in `App.tsx` |
| "Can't find page X" | Named differently in documentation | Search `PAGE_RELATIONSHIP_MAP.md` by component name |
| "Navigation pattern unclear" | Not documented | Check Mermaid diagrams or ask in "Using This Map" |

---

## 📞 Support

- **"Where is route X?"** → Search [PAGE_RELATIONSHIP_MAP.md](PAGE_RELATIONSHIP_MAP.md)
- **"How do I get from A to B?"** → Check the Mermaid flowcharts
- **"Is this flow correct?"** → Verify in "Navigation Patterns" table
- **"How to update the map?"** → See "How to Keep This Updated" section
- **"Something's broken"** → Check "Common Issues & Fixes" table

---

**Last Updated**: 2026-03-09  
**Total Routes Documented**: 50+  
**Total Navigation Links**: 80+  
**Files Scanned**: 53  
**Status**: ✅ Complete & Maintained
