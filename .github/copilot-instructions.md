# Copilot / AI Agent Instructions — **STRICT MODE**

**Project:** Classify — Kids Educational & Parental Control Platform
**Stack:** Express.js (Node 18+), React + Vite, PostgreSQL 14+, Drizzle ORM
**Audience:** AI agents only (Human contributors may reference)
**Authority Level:** 🔴 MAXIMUM (Violations invalidate all output)

---

## ⛔ ZERO-TOLERANCE DIRECTIVE

This document is **LAW**, not guidance.

If any rule below is violated, the work is considered **FAILED**, even if the code "works".

### Absolute Prohibitions
ش
* ❌ NO assumptions
* ❌ NO guessing
* ❌ NO repeated explanations
* ❌ NO restating documentation in chat
* ❌ NO leaving test artifacts behind
* ❌ NO partial verification

### Mandatory Behavior

* ✅ Update documentation files instead of explaining
* ✅ Execute real tests
* ✅ Preserve test evidence temporarily
* ✅ Remove all test tools and artifacts after success
* ✅ Leave the repository in a **clean production state**

---

## 🧠 Cognitive Discipline Rules (ANTI-AI-HALLUCINATION)

The agent **MUST** operate under these constraints:

### 🔴 Mandatory File Reading Before ANY Response

**Before writing a single word in chat or code**, the agent MUST:

1. Enumerate the files relevant to the task
2. Open and READ them fully
3. Build an internal mental model from real code

**CRITICAL FILES BY DOMAIN:**

Authentication:
- `server/routes/auth.ts` - Auth endpoints & OTP logic
- `server/services/mailer.ts` - Email/OTP delivery

Family Structure:
- `shared/schema.ts` - parents, children, parentChild tables
- `server/routes/family.ts` - Family management endpoints

Notifications:
- `server/notificationHandlers.ts` - Gift event handlers
- `server/services/mailer.ts` - Notification templates

Payments:
- `server/routes/payments.ts` - Stripe webhook handling
- `shared/schema.ts` - Payment and transaction tables

Games (MUST READ for any game-related task):
- `docs/GAMES_MEMORY.md` - Complete game architecture, patterns, bugs, checklist
- `client/public/games/` - HTML/Vanilla JS games (iframe-based)
- `client/src/pages/ChildGames.tsx` - Game listing & iframe loader
- `server/routes/index.ts` - seedDefaultGames() function
- `server/routes/child.ts` - POST /api/child/complete-game endpoint

Internationalization (i18n):
- `client/public/games/cat-kingdom-modules/i18n.js` - 25-language translation file

If a file exists and is relevant but NOT read → **IMMEDIATE FAILURE**.

---

## 🌍 MANDATORY MULTI-LANGUAGE RULE (STANDING INSTRUCTION)

**ALL changes to any game** that contains an i18n/translation system **MUST** include translations for **ALL 25 supported languages** automatically — without being asked.

### Supported Languages (25):
`ar` (Arabic-RTL), `en` (English), `pt` (Portuguese), `es` (Spanish), `fr` (French), `de` (German), `it` (Italian), `ru` (Russian), `zh` (Chinese), `ja` (Japanese), `ko` (Korean), `hi` (Hindi), `tr` (Turkish), `nl` (Dutch), `sv` (Swedish), `pl` (Polish), `uk` (Ukrainian), `id` (Indonesian), `ms` (Malay), `th` (Thai), `vi` (Vietnamese), `fa` (Persian-RTL), `ur` (Urdu-RTL), `bn` (Bengali), `sw` (Swahili)

### Rules:
1. **Any new UI text** added to a game MUST be added to `i18n.js` in ALL 25 languages
2. **Any modified text** MUST be updated in ALL 25 languages
3. **Any new `t.key`** MUST have entries in ALL 25 language blocks in the `S` object
4. **Any new `L()` call** MUST provide at least `ar`, `en`, `pt` arguments
5. **RTL languages** (`ar`, `fa`, `ur`) MUST be tested for correct text direction
6. **Never add text in only one language** — this is a CRITICAL VIOLATION

### Verification:
After any i18n change, confirm ALL 25 language blocks have the new/modified key.

Failing to translate = **IMMEDIATE FAILURE**.

## 🌐 APP UI TRANSLATION RULE (NON-GAME)

**ALL text changes in the main web app UI** (React pages/components using `client/src/i18n/locales/*.json`) **MUST** be translated for **all supported app locales** in the same change.

### Supported App Locales (10):
`ar`, `en`, `pt`, `es`, `fr`, `de`, `tr`, `ru`, `zh`, `hi`

### Rules:
1. Any new UI copy in app pages/components MUST use i18n keys (no hardcoded single-language UI text)
2. Every added/modified app i18n key MUST be present in all 10 locale JSON files
3. RTL rendering must be verified for Arabic (`ar`) after layout/text changes
4. A task is incomplete if any locale is missing the updated key(s)

The agent is **FORBIDDEN** from responding based on:

* Prior knowledge
* Similar projects
* Training data patterns

Only the current repository is authoritative.

---

### Evidence Enforcement Rules

1. If a file exists → **READ IT**
2. If behavior is unclear → **TRACE IT**
3. If a claim is made → **PROVE IT**
4. If proof is missing → **STOP**

Any output without evidence is invalid.

---

## 📚 AGENT INITIALIZATION PROTOCOL (MANDATORY)

**BEFORE EVERY CONVERSATION START**, the agent **MUST**:

### 1️⃣ Load Full Copilot Instructions
```
FILE: .github/copilot-instructions.md
ACTION: Read the ENTIRE file from start to finish
WHY: Rules change, this is the authoritative source
FREQUENCY: Every single session, no exceptions
```

### 2️⃣ Check Linked Documentation Files
```
Check if these files have been modified since last read:
- docs/GAMES_MEMORY.md (game system truth)
- docs/API_ENDPOINTS_REFERENCE.md (API contracts)
- docs/SECURITY_AUDIT.md (vulnerability tracking)
- docs/PERFORMANCE_HOTSPOTS.md (optimization guide)
```

### 3️⃣ Initialize Context
- Load ALL critical files per domain (see "CRITICAL FILES BY DOMAIN" section)
- Build mental model from actual code, not memory
- Verify assumptions against source code
- Do NOT rely on previous conversation state

**Failure to follow this protocol = IMMEDIATE FAILURE**

---

## 🔄 DOCUMENTATION SYNC SYSTEM

**Purpose**: Keep copilot-instructions and related docs always synchronized

### Files Linked to This Document

| Document | Purpose | Sync Trigger | Update Frequency |
|----------|---------|--------------|------------------|
| `docs/GAMES_MEMORY.md` | Game architecture truth | Any game system change | Real-time (same commit) |
| `docs/API_ENDPOINTS_REFERENCE.md` | Complete API spec | Any new/modified endpoint | Real-time |
| `docs/SECURITY_AUDIT.md` | Security vulnerabilities | Any security issue found | Real-time |
| `docs/PERFORMANCE_HOTSPOTS.md` | Performance issues | Optimization needed | Real-time |
| `docs/DATABASE_SCHEMA.md` | Schema changes | Schema migration | Real-time |
| `docs/RATE_LIMITING_MATRIX.md` | Rate limit configuration | Any limit change | Real-time |
| `docs/CRITICAL_FILES_BY_DOMAIN.md` | File inventory | Folder reorg/new domains | Weekly |
| `.github/AGENTS.md` | Agent profiles | Agent rules change | Real-time |
| `docs/DEPLOYMENT_CHECKLIST.md` | Deploy requirements | Process change | Real-time |
| `docs/_ai-temp/` | Test evidence (temp) | During testing | Ephemeral (auto-delete) |

### Sync Rules

#### Rule 1: Change Propagation
```
IF (change made in copilot-instructions.md)
  THEN (scan related files for affected sections)
  AND (update those sections in linked docs)
  AND (verify consistency across all files)
END IF
```

#### Rule 2: Real-time Verification
```
BEFORE any file is committed:
  1. Check if copilot-instructions.md prescribes this change
  2. If YES: verify linked docs updated too
  3. If NO: verify this change doesn't conflict with rules
  4. Validate all affected files in single commit
END BEFORE
```

#### Rule 3: Audit Trail
```
When updating linked documentation:
  1. Add timestamp of sync: "Last synced: 2026-03-19 15:45 UTC"
  2. Reference copilot-instructions.md section
  3. Include version number: v[major.minor]
  4. Link back to this file in preamble
END WHEN
```

### Synchronization Checklist (Use Before ANY Commit)

**If this file (copilot-instructions.md) is modified:**
- [ ] Check `docs/CRITICAL_FILES_BY_DOMAIN.md` - add/remove file references
- [ ] Check `docs/API_ENDPOINTS_REFERENCE.md` - update if API contract changed
- [ ] Check `.github/AGENTS.md` - update agent behavior rules
- [ ] Check `docs/SECURITY_AUDIT.md` - update if security rules changed
- [ ] Update "Last Updated" timestamp at bottom of THIS file

**If you modify ANY linked documentation file:**
- [ ] Verify these changes are consistent with copilot-instructions.md
- [ ] Add sync audit line: `<!-- synced: [filename] on [date] -->`
- [ ] Check if this means copilot-instructions.md needs updating
- [ ] If YES: make that change in same commit

### Example Sync Scenario

**Scenario**: Add new authentication method (Passkey)

```
Step 1: Update copilot-instructions.md
  └─ Add "Passkey" to Critical Security Absolutes section
  └─ Add /api/auth/passkey-register and /api/auth/passkey-verify to API endpoints list
  └─ Add validation requirement for passkey verification

Step 2: Update linked files SAME COMMIT:
  ├─ docs/API_ENDPOINTS_REFERENCE.md
  │  └─ Add complete Passkey authentication section with:
  │     ├─ /api/auth/passkey-register (POST)
  │     ├─ /api/auth/passkey-verify (POST)
  │     ├─ /api/auth/passkey-challenge (GET)
  │     └─ Validation rules + error codes
  │
  ├─ docs/SECURITY_AUDIT.md
  │  └─ Add "Passkey authentication" to approved methods
  │  └─ Note verification requirements
  │
  ├─ docs/RATE_LIMITING_MATRIX.md
  │  └─ Add rate limits for passkey endpoints
  │  └─ (if different from password auth)
  │
  └─ .github/AGENTS.md
     └─ Update agent instructions if passkey affects validation logic

Step 3: Verify consistency
  ├─ All 3 docs reference same endpoints
  ├─ Error codes match across all references
  ├─ Rate limits are consistent
  └─ Security validations align

Step 4: Commit message format
  feat: Add Passkey authentication method
  
  - Update copilot-instructions.md: Add passkey security absolutes
  - Update docs/API_ENDPOINTS_REFERENCE.md: Add 3 new endpoints
  - Update docs/SECURITY_AUDIT.md: Add passkey to approved methods
  - Update docs/RATE_LIMITING_MATRIX.md: Add passkey rate limits
  - Update .github/AGENTS.md: Update passkey validation logic
  
  Sync: All linked documentation updated in single commit
```

### Broken Sync Detection

**Red flags indicating sync failure:**
```
❌ Endpoint listed in copilot-instructions but not in API_ENDPOINTS_REFERENCE
❌ Security rule in copilot-instructions conflicts with SECURITY_AUDIT
❌ Rate limit in this file doesn't match RATE_LIMITING_MATRIX
❌ File path changed but CRITICAL_FILES_BY_DOMAIN not updated
❌ Last Updated timestamp older than 2 weeks
```

**If sync broken:**
1. Stop work immediately
2. Identify which files are out of sync
3. Create new commit to fix sync
4. Verify all files updated together

---

## 📁 SINGLE SOURCE OF TRUTH

| Domain        | Authority             |
| ------------- | --------------------- |
| Code behavior | Source code           |
| API format    | Existing responses    |
| DB structure  | `shared/schema.ts`    |
| Build output  | Real `dist/` contents |
| Runtime       | `node dist/index.js`  |
| Email/OTP     | `server/services/mailer.ts` |
| Notifications | `server/notificationHandlers.ts` |
| Auth routes   | `server/routes/auth.ts` |
| Parent-child  | `shared/schema.ts` (parentChild table) |

Chat text is **NOT** a source of truth.

---

## 📡 API CONTRACT (IMMUTABLE)

### Success Response

```json
{ "success": true, "data": {}, "message": "Optional" }
```

### Error Response

```json
{ "success": false, "error": "ERROR_CODE", "message": "Human readable" }
```

### Common Error Codes
- `NOT_FOUND` - Resource doesn't exist
- `UNAUTHORIZED` - User not authenticated or permission denied
- `BAD_REQUEST` - Invalid input
- `INTERNAL_SERVER_ERROR` - Server error
- `PARENT_CHILD_MISMATCH` - Parent doesn't own this child
- `OTP_EXPIRED` - OTP code expired or invalid
- `RATE_LIMITED` - Too many requests

### API Endpoints (Confirm in server/routes/*)

**Authentication**:
- `POST /api/auth/register` - Create parent account
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/request-otp` - Request OTP code
- `POST /api/auth/verify-otp` - Verify OTP and complete 2FA
- `POST /api/auth/logout` - Logout

**Family Management**:
- `GET /api/family/children` - List user's children
- `POST /api/family/children` - Add new child
- `PUT /api/family/children/:id` - Update child
- `DELETE /api/family/children/:id` - Delete child

**Notifications**:
- `GET /api/notifications` - List notifications
- `PUT /api/notifications/:id` - Mark read
- `DELETE /api/notifications/:id` - Delete

**Gifts/Rewards**:
- `POST /api/gifts` - Send gift to child
- `GET /api/gifts/:childId` - Get child's gifts

**Health**:
- `GET /api/health` - Health check (returns 200 if ok)

Changing this format is a **CRITICAL VIOLATION**.

---

## 🧪 MANDATORY MULTI-PHASE VERIFICATION PIPELINE

### 🔹 Phase 0 — Repository Intelligence Scan (REQUIRED)

**Objective:** Understand reality, not intention.

Steps (ALL REQUIRED):

* Read:

  * `server/index.ts`
  * `server/vite.ts`
  * `vite.config.ts`
  * `shared/schema.ts`
  * Deployment files (Docker / PM2 / VPS)
* Identify and record:

  * Backend entry
  * Frontend build output
  * Static serving strategy
  * Runtime port

📌 Output MUST be written to:

```
/docs/_ai-temp/phase0-scan.md
```

---

### 🔹 Phase 1 — Controlled Change Implementation

Rules:

* Touch **only** files required for the task
* No refactors unless explicitly authorized
* No duplicated logic
* No explanatory comments beyond necessity

If documentation is affected → **UPDATE THE DOC FILE**, do not explain in chat.

---

### 🔹 Phase 2 — Instrumented Testing (REQUIRED)

The agent MUST:

* Create **temporary** test instruments
* Use:

  * curl
  * node scripts
  * DB queries (via Drizzle only)

All results MUST be recorded verbatim in:

```
/docs/_ai-temp/phase2-test-results.md
```

Examples:

```bash
curl -i http://127.0.0.1:5000/api/health
node dist/index.js
```

Screenshots, guesses, or summaries are NOT allowed.

---

### 🔹 Phase 3 — Cross-Dependency Validation

The agent MUST confirm:

* No existing endpoint behavior changed
* No auth scope escalation
* No static asset regression

Evidence MUST be appended to:

```
/docs/_ai-temp/phase3-regression-check.md
```

---

### 🔹 Phase 4 — Cleanup & Evidence Destruction

After ALL phases succeed:

The agent MUST:

* Delete `/docs/_ai-temp/`
* Remove:

  * test routes
  * debug logs
  * temp scripts
* Confirm repository state equals **pure production**

Failure to clean = **FAILURE**

---

## 🗂️ TEMPORARY EVIDENCE RULE

* Test evidence is **mandatory**
* Evidence lifespan: **ONLY during active task**
* Evidence is used as internal reference ONLY
* Evidence MUST be destroyed at completion

Persistent test artifacts are forbidden.

---

## 🔐 SECURITY ABSOLUTES

* Child tokens: **read / ack only** (no write permissions)
* Parent-child ownership ALWAYS validated before any child operation:
  ```typescript
  // Pattern: Check parentId === req.user.id before accessing child
  const parentChild = await db.query.parentChild.findFirst({
    where: and(
      eq(parentChild.parentId, req.user.id),
      eq(parentChild.childId, childId)
    )
  });
  if (!parentChild) throw new UnauthorizedError("Not authorized");
  ```
* Parent-child deletion: Cascade delete configured in schema (onDelete: "cascade")
* Rate limiting REQUIRED on auth flows:
  - OTP requests: 5 per hour per email (env: OTP_RATE_LIMIT_PER_HOUR)
  - Login attempts: Standard express-rate-limit on /api/auth/login
  - Register: Rate limited per IP
* No secrets in logs or responses:
  - ✅ OTP codes returned in development only
  - ✅ JWT tokens not logged
  - ✅ Passwords never logged
  - ✅ SMTP credentials only in errors for debugging
* SMS/Email verification:
  - SMS: Track smsVerified flag in parents table
  - Email: Implicit (email used as username = verified)
* 2FA enforcement:
  - twoFAEnabled flag in parents table
  - OTP required on login if enabled

Any relaxation requires explicit written authorization.

---

## 🧱 BUILD vs RUNTIME LAW (NON-NEGOTIABLE)

* Build tools (Vite, TS, esbuild) = DEV ONLY
* Production runtime:

```bash
node dist/index.js
```

If build tools are required at runtime → **CRITICAL FAILURE**.

---

## 🚀 DEPLOYMENT INVARIANTS

### Build & Runtime
* Frontend build: `vite build` → `dist/public/`
* Backend build: `esbuild` → `dist/index.js` (esm format, node platform)
* Production runtime: `NODE_ENV=production node dist/index.js`
* Port: 5000 (via `process.env.PORT`)

### Static Asset Serving (Express)
* Static directory: `path.resolve(process.cwd(), "dist", "public")`
* Served by middleware in `server/index.ts` (development) or via Nginx (production)

### SPA Fallback Rules
* SPA fallback MUST NOT intercept:
  * `/api/*` - All API routes
  * `/assets/*` - Built assets
  * `/sw.js` - Service worker
  * `/manifest.json` - PWA manifest
* Fallback configured in: `server/vite.ts` (development) or Nginx (production)

### Security Headers (Helmet)
* CSP: defaults false, custom directives configured
* Cross-origin: cross-origin policy enabled
* Trust proxy: 1 (for Nginx behind)

### CORS Configuration
* Access-Control-Allow-Origin: `*` (currently open)
* Allowed methods: GET, POST, PUT, DELETE, OPTIONS
* Allowed headers: Content-Type, Authorization

---

## 🧾 FAILURE HANDLING

If ANY phase fails:

* STOP execution
* Do NOT attempt workaround
* Report:

  * File
  * Line
  * Exact failure output

Silently continuing is forbidden.

---

## 🚦 MANDATORY TEST GATE (EVERY CHANGE)

Every code modification — no matter how small — **MUST** pass the full test pipeline before it is considered complete.

### Pipeline (ALL steps required, in order):

1. **TypeScript Check:** `npx tsc --noEmit` — MUST exit 0 (pre-existing server errors in `child.ts`/`parent.ts` are allowed)
2. **Vite Build:** `npx vite build` — MUST succeed with no errors
3. **Unit Tests:** `npm run test` — ALL tests MUST pass
4. **Health Check:** `curl http://localhost:5000/api/health` — MUST return `{"status":"ok"}`

### Decision Rule:

* ✅ **ALL pass** → Change is **APPROVED** → Commit
* ❌ **ANY fails** → Change is **REJECTED** → Fix immediately, re-run full pipeline
* 🔄 **Repeat** until all 4 steps pass — no exceptions

### Prohibitions:

* ❌ NO committing without running the pipeline
* ❌ NO skipping steps ("it's just a typo" is not an excuse)
* ❌ NO partial pipeline (running only build but not tests)
* ❌ NO marking task complete if any step failed

Violating this gate invalidates the entire change.

---

## 🏁 FINAL COMPLETION CHECKLIST (ALL REQUIRED)

* [ ] **Test gate passed** (TypeScript + Build + Tests + Health)
* [ ] App boots via `node dist/index.js`
* [ ] Health endpoint returns 200: `GET /api/health`
* [ ] All assets return 200: `GET /index.html`, `GET /assets/*`
* [ ] No temp files exist: Check `/docs/_ai-temp/` is empty/deleted
* [ ] No debug code remains: No console.log (except structured logging)
* [ ] Docs updated if behavior changed
* [ ] API contract verified: `{"success": true/false, "data": {...}, "error": "CODE"}`
* [ ] Parent-child relationships validated on protected endpoints
* [ ] OTP delivery tested (if modified)
* [ ] Database migrations applied: `npm run db:push`
* [ ] Rate limiting active on auth endpoints
* [ ] SMTP credentials verified (if email modified)

Only then may the task be declared **COMPLETE**.

---

## 📋 QUICK SYNC STATUS

**This Document Status**: ✅ ACTIVE & ENFORCED  
**Linked Files Count**: 8 documentation files + temp directory  
**Sync Health**: 🟢 SYNCHRONIZED  
**Last Full Audit**: 2026-03-19  

**Next Actions for Agents**:
1. ✅ Read this file COMPLETELY on every session start
2. ✅ Check linked documentation dates
3. ✅ Verify consistency with actual source code
4. ✅ Update linked docs when making changes

---

**Mode:** STRICT / ZERO-HALLUCINATION  
**Authority Level**: 🔴 MAXIMUM (Violations invalidate all output)  
**Maintained By:** Classify Engineering  
**Last Updated:** 2026-03-19 16:00 UTC  
**Status**: 🟢 Current & Enforced
