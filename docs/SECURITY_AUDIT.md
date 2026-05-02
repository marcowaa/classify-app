# Security Audit Log — Vulnerabilities & Fixes
<!-- synced: copilot-instructions.md on 2026-03-27 14:20 UTC -->

**Purpose**: Track security vulnerabilities, fixes applied, and security absolutes  
**Source of Authority**: `.github/copilot-instructions.md` Section "SECURITY ABSOLUTES"  
**Status**: 🟢 SYNCHRONIZED  
**Version**: 1.3  
**Last Updated**: 2026-03-27 14:20 UTC

---

## 🔴 CRITICAL VULNERABILITIES

### CVE-001: Game Scores Unvalidated
**Severity**: 🔴 CRITICAL  
**Discovery Date**: 2026-03-19  
**Component**: POST /api/child/complete-game  
**Issue**:
- Game iframe calculates score client-side
- NO HMAC signature verification
- Player can fake unlimited points
- Breaks entire rewards system

**Impact**:
- Children can reach max points in seconds
- Wallet drainage via point conversion
- Leaderboard meaningless
- Point-based purchases exploitable

**Fix Required**:
```typescript
// 1. Generate session on game start
GET /api/child/session/{gameId} → { sessionId, hmacKey, expiresAt }

// 2. Game sends signed score
const payload = JSON.stringify({ sessionId, score, timestamp: Date.now() });
const hmac = CryptoJS.HmacSHA256(payload, hmacKey).toString();
POST /api/child/complete-game → { payload, hmac }

// 3. Backend verifies
const expected = crypto.createHmac('sha256', sessionKey)
  .update(payload).digest('hex');
if (hmac !== expected) throw UnauthorizedError("Invalid score");
```

**Timeline**: URGENT — within 48 hours  
**Status**: ❌ NOT STARTED

---

### CVE-002: No Token Refresh Endpoint
**Severity**: 🔴 CRITICAL  
**Component**: Authentication system  
**Issue**:
- JWT tokens valid for 30 days with no rotation
- No logout mechanism (token still valid after "logout")
- Token theft = 30 days of full access
- No per-device session tracking

**Impact**:
- Mobile apps on shared devices: child uses parent account
- Lost phone: attacker has 30-day window
- Cannot revoke compromised tokens
- No "sign out all devices" feature

**Fix Required**:
```typescript
// 1. Change to short-lived access tokens
const accessToken = jwt.sign(payload, SECRET, { expiresIn: '15m' });
res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'Strict'
});

// 2. Implement refresh endpoint
POST /api/auth/refresh-token → Issue new access token

// 3. Token revocation on logout
POST /api/auth/logout → Add to redis blacklist
```

**Timeline**: URGENT — within 1 week  
**Status**: ❌ NOT STARTED

---

### CVE-003: Weak Crypto (Math.random())
**Severity**: 🔴 CRITICAL  
**Component**: OTP generation  
**Issue**:
- OTP/share-code generation previously depended on `Math.random()`
- Predictable output increased risk under repeated attempts

**Fix Applied (2026-03-27)**:
```typescript
// OTP generation (server/services/otpService.ts)
import crypto from 'crypto';
const otp = crypto.randomInt(0, 1000000).toString().padStart(6, '0');

// Child share code generation (server/routes/auth.ts)
const secureCode = crypto.randomInt(100000, 1000000).toString();
```

**Validation Evidence**:
- `npx tsc --noEmit` ✅
- `npm run build` ✅
- `npm run test -- --runInBand` ✅

**Status**: ✅ FIXED

---

### CVE-004: CORS Not Strict
**Severity**: 🔴 CRITICAL  
**Component**: Express middleware  
**Issue**:
- CORS set to `origin: '*'` or not validated
- Allows cross-site requests from any domain
- User logged in malicious website → can steal data, modify profiles

**Fix Applied (2026-03-27)**:
```typescript
const defaultCorsOrigins = process.env.NODE_ENV === "production"
  ? "https://classi-fy.com,https://www.classi-fy.com"
  : "*";
const corsOriginsSetting = process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS || defaultCorsOrigins;

if (process.env.NODE_ENV === "production" && allowAnyOrigin && !allowWildcardCorsInProduction) {
  throw new Error("Unsafe CORS configuration...");
}
```

**Operational Exception**:
- `ALLOW_WILDCARD_CORS_IN_PRODUCTION=true` is supported as an emergency override only.

**Timeline**: URGENT — within 24 hours  
**Status**: ✅ FIXED

---

## 🟡 HIGH PRIORITY VULNERABILITIES (Unfixed)

### CVE-005: No 2FA for Parents
**Severity**: 🟡 HIGH  
**Component**: Authentication system  
**Issue**:
- Parent email + password = full account access
- No second factor (OTP, TOTP, security key)
- Phishing attacks gain instant account access

**Impact**:
- All children's data exposed
- Family settings modified
- Funds withdrawn
- Account impersonation

**Fix**: Implement TOTP 2FA with speakeasy module

---

### CVE-006: No Device Fingerprinting
**Severity**: 🟡 HIGH  
**Component**: Session management  
**Issue**:
- No device/browser identification
- Token theft undetectable
- Attacker appears as legitimate user

**Fix**: Hash device fingerprint (UA + IP + language) + track in parentSessions

---

### CVE-007: No Central Audit Log
**Severity**: 🟡 HIGH  
**Component**: Logging system  
**Issue**:
- Audit logs scattered (parentAuditLogs, childActivityLogs, etc.)
- No unified forensics trail
- GDPR/COPPA compliance violations
- Fraud investigation impossible

**Fix**: Create centralAuditLog table with all actions

---

### CVE-008: N+1 Query Performance
**Severity**: 🟡 HIGH  
**Component**: Admin dashboard  
**Issue**:
- 40+ tabs each running independent queries
- N+1 for fetching related entities
- Dashboard slow + unresponsive

**Fix**: Batch queries, create indexes, use JOINs

---

## ✅ SECURITY ABSOLUTES (ENFORCED)

### Parent-Child Ownership Validation
**Rule**: ALWAYS validate parent owns child before any operation

**Pattern**:
```typescript
const parentChild = await db.query.parentChild.findFirst({
  where: and(
    eq(parentChild.parentId, req.user.id),
    eq(parentChild.childId, childId)
  )
});
if (!parentChild) throw new UnauthorizedError("Not authorized");
// Only then proceed with operation
```

**Enforcement**: Required on ALL child-related endpoints:
- GET /api/child/profile/:id
- PUT /api/child/:id
- POST /api/child/complete-game
- etc.

**Status**: ✅ IMPLEMENTED

---

### Rate Limiting on Auth
**Rules**:
- OTP requests: 5 per hour per email
- Login attempts: 5 per minute per (email + IP)
- Register: 10 per hour per IP

**Status**: ✅ PARTIALLY IMPLEMENTED (otp working, login/register need verification)

---

### No Secrets in Logs
**Rules**:
- ❌ Never log JWT tokens
- ❌ Never log passwords (even hashed)
- ❌ Never log OTP codes in production
- ✅ OTP codes OK in dev-only logs
- ✅ SMTP errors can show recipient, not message
- ✅ Database connection string only in errors if dev

**Status**: ✅ MOSTLY ENFORCED

---

### Child Token Permissions
**Rule**: Child tokens have READ + ACK only, NO WRITE

**Endpoints child can use**:
- ✅ GET /api/child/profile
- ✅ GET /api/child/tasks
- ✅ POST /api/child/task/{id}/acknowledge (read state)
- ✅ POST /api/child/complete-game (score submission)

**Endpoints child CANNOT use**:
- ❌ PUT /api/child/:id (profile modification)
- ❌ DELETE /api/child/account
- ❌ PUT /api/child/wallet (balance modification)

**Status**: ✅ MOSTLY ENFORCED (need audit of child routes)

---

### 2FA Enforcement
**Rule**: If `twoFAEnabled == true`, OTP required on login

**Current State**:
- ✅ Flag exists (parents.twoFAEnabled)
- ✅ OTP request implemented
- ⚠️ Login flow checks flag but enforces optional

**Required Fix**: Make 2FA mandatory if flag set

**Status**: ⚠️ PARTIALLY IMPLEMENTED

---

### Cascade Delete on Parent-Child
**Rule**: Deleting parent or child must cascade delete relationship

**Schema**: 
```typescript
onDelete: "cascade" on parentChild.parentId and parentChild.childId
```

**Affected Tables**:
- parentChild → parents
- parentChild → children
- childInfo → children
- taskResults → children

**Status**: ✅ MUST VERIFY IN shared/schema.ts

---

## 📊 Vulnerability Summary

| ID | Title | Severity | Status | Timeline |
|----|-------|----------|--------|----------|
| CVE-001 | Game scores unvalidated | 🔴 CRITICAL | ❌ Unfixed | 48 hrs |
| CVE-002 | No token refresh | 🔴 CRITICAL | ❌ Unfixed | 1 week |
| CVE-003 | Weak crypto (Math.random) | 🔴 CRITICAL | ✅ Fixed (2026-03-27) | Completed |
| CVE-004 | CORS not strict | 🔴 CRITICAL | ✅ Fixed (2026-03-27) | Completed |
| CVE-005 | No 2FA for parents | 🟡 HIGH | ❌ Unfixed | 2 weeks |
| CVE-006 | No device fingerprinting | 🟡 HIGH | ❌ Unfixed | 1 week |
| CVE-007 | No central audit log | 🟡 HIGH | ❌ Unfixed | 1 week |
| CVE-008 | N+1 query performance | 🟡 HIGH | ❌ Unfixed | 2 weeks |

---

## 🔄 Sync Information

**Source**: `.github/copilot-instructions.md` → Section "SECURITY ABSOLUTES"  
**Maintained By**: Classify Engineering  
**Sync Frequency**: Real-time (when vulnerabilities discovered/fixed)  
**Last Sync**: 2026-03-27 14:20 UTC

**When fixing a vulnerability**:
1. Update this file: Mark as ✅ Fixed + date
2. Move from CRITICAL/HIGH to ✅ SECURITY ABSOLUTES (if applicable)
3. Add commit reference
4. Update Last Updated timestamp

---

**Version**: 1.3  
**Status**: 🟡 VULNERABILITIES DETECTED  
**Priority Action**: Fix CVE-001 within 48 hours  
**Next Review**: 2026-03-21 (security sprint review)
