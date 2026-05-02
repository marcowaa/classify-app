# Rate Limiting Matrix — Complete Configuration
<!-- synced: copilot-instructions.md on 2026-03-19 16:00 UTC -->

**Purpose**: Single source of truth for all rate limit configurations  
**Source**: `.github/copilot-instructions.md` → "SECURITY ABSOLUTES"  
**Status**: 🟢 SYNCHRONIZED  
**Version**: 1.0  
**Last Updated**: 2026-03-19 16:00 UTC

---

## 📊 Rate Limit Matrix

### Authentication Endpoints

| Endpoint | Method | Limit | Time Window | Key | Purpose |
|----------|--------|-------|-------------|-----|---------|
| `/api/auth/register` | POST | 10 | 1 hour | IP | Prevent mass account creation |
| `/api/auth/login` | POST | 5 | 1 minute | email + IP | Prevent brute force attacks |
| `/api/auth/request-otp` | POST | 3 | 1 minute | email | Prevent OTP enumeration |
| `/api/auth/verify-otp` | POST | 5 | 1 minute | email | Prevent OTP brute force |
| `/api/auth/refresh-token` | POST | 10 | 1 minute | user ID | Prevent token flooding |
| `/api/auth/logout` | POST | 5 | 1 minute | user ID | Prevent abuse |

**Environment Variables**:
```bash
AUTH_REGISTER_LIMIT_PER_HOUR=10
AUTH_LOGIN_LIMIT_PER_MINUTE=5
AUTH_OTP_REQUEST_LIMIT_PER_MINUTE=3
AUTH_OTP_VERIFY_LIMIT_PER_MINUTE=5
AUTH_REFRESH_TOKEN_LIMIT_PER_MINUTE=10
AUTH_LOGOUT_LIMIT_PER_MINUTE=5
```

---

### Family Management Endpoints

| Endpoint | Method | Limit | Time Window | Key | Purpose |
|----------|--------|-------|-------------|-----|---------|
| `/api/parent/profile-data` | GET | 10 | 1 minute | user ID | Prevent scraping |
| `/api/parent/profile/update` | POST | 3 | 1 minute | user ID | Prevent spam updates |
| `/api/parent/profile/change-password` | POST | 3 | 1 minute | user ID | Rate limit password changes |
| `/api/parent/children` | GET | 10 | 1 minute | user ID | Prevent scraping |
| `/api/parent/children` | POST | 10 | 1 hour | user ID | Prevent mass child creation |
| `/api/parent/children/:id` | PUT | 5 | 1 minute | user ID | Rate limit child updates |
| `/api/parent/children/:id` | DELETE | 5 | 1 hour | user ID | Prevent accidental deletes |

**Notes**:
- DELETE limited to 5/hour to force confirmation for destructive operations
- POST /children limited to 10/hour (system limit: max 10 children)

---

### Store & Checkout Endpoints

| Endpoint | Method | Limit | Time Window | Key | Purpose |
|----------|--------|-------|-------------|-----|---------|
| `/api/store/products` | GET | 30 | 1 minute | IP | Prevent catalog scraping |
| `/api/store/checkout` | POST | 10 | 1 minute | user ID | Prevent spam orders |
| `/api/parent/wallet/deposit` | POST | 5 | 1 minute | user ID | Spam protection |
| `/api/parent/wallet/withdraw` | POST | 5 | 1 minute | user ID | Spam protection |
| `/api/parent/purchases` | GET | 10 | 1 minute | user ID | Prevent scraping |
| `/api/parent/purchases/:id/return-request` | POST | 5 | 1 minute | user ID | Prevent spam returns |

---

### Admin Endpoints

| Endpoint | Method | Limit | Time Window | Key | Purpose |
|----------|--------|-------|-------------|-----|---------|
| `/api/admin/products` | POST | 20 | 1 hour | admin ID | Prevent product spam |
| `/api/admin/products/:id` | PUT | 20 | 1 hour | admin ID | Prevent spam edits |
| `/api/admin/products/:id` | DELETE | 10 | 1 hour | admin ID | Destructive operation |
| `/api/admin/library-products/review` | GET | 20 | 1 minute | admin ID | Admin query limit |
| `/api/admin/merchant-products/review` | GET | 20 | 1 minute | admin ID | Admin query limit |
| `/api/admin/library-return-requests` | GET | 30 | 1 minute | admin ID | Admin query limit |
| `/api/admin/library-return-requests/:id/resolve` | PUT | 20 | 1 minute | admin ID | Admin rate limit |

---

### Game Endpoints

| Endpoint | Method | Limit | Time Window | Key | Purpose |
|----------|--------|-------|-------------|-----|---------|
| `/api/child/complete-game` | POST | 100 | 1 day | child ID | Prevent XP farming |
| `/api/child/games` | GET | 20 | 1 minute | child ID | Prevent scraping |

**Notes**:
- 100/day = ~10 games per hour (reasonable)
- ⚠️ INCOMPLETE: No signature validation on score yet (CVE-001)

---

### Library Merchant Endpoints

| Endpoint | Method | Limit | Time Window | Key | Purpose |
|----------|--------|-------|-------------|-----|---------|
| `/api/library/products` | POST | 50 | 1 day | merchant ID | Prevent product spam |
| `/api/library/products/:id` | PUT | 50 | 1 day | merchant ID | Prevent spam edits |
| `/api/library/return-requests` | GET | 20 | 1 minute | merchant ID | Query limit |
| `/api/library/return-requests/:id/respond` | PUT | 50 | 1 day | merchant ID | Response rate limit |

---

## 🔧 Implementation Status

### Implemented (✅)
- Authentication endpoints (login, register, OTP)
- Basic user-level limits

### Partially Implemented (⚠️)
- Some endpoints missing rate limit headers
- No Redis integration verified
- No distributed rate limiting (single-instance only)

### Not Implemented (❌)  
- Token refresh endpoint (doesn't exist yet)
- Game scoring rate limit (no signature = not trustworthy)
- Admin endpoints (new moderation tabs not rate limited)
- Return request limits (new endpoints)

---

## 📋 Rate Limit Response Format

### Standard Response Headers (Implement on ALL limited endpoints)

```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1710855600
```

### Rate Limited Response (429)

```json
{
  "success": false,
  "error": "RATE_LIMITED",
  "message": "Too many requests. Try again in 60 seconds.",
  "data": {
    "retryAfter": 60,
    "reset": "2026-03-19T16:30:00Z"
  }
}
```

---

## 🔄 Sync Information

**Source**: `.github/copilot-instructions.md` → "RATE LIMITING REQUIRED ON AUTH FLOWS"  
**Maintained By**: Classify Engineering  
**Sync Frequency**: When rate limits change  
**Last Sync**: 2026-03-19 16:00 UTC

**When updating rate limits**:
1. Update this file with new limit + time window
2. Add to environment variables section
3. Implement in code
4. Test with load testing tools
5. Update `Last Updated` timestamp

---

## 🧪 Testing Rate Limits

### Manual Test (cURL)

```bash
# Test login rate limit (5/min)
for i in {1..6}; do
  echo "Attempt $i:"
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -w "\nStatus: %{http_code}\nRateLimit: %{header{x-ratelimit-remaining}}\n\n"
  sleep 1
done
```

### Automated Test (Jest)

```typescript
describe('Rate Limiting', () => {
  it('should rate limit login after 5 attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' })
        .expect(401);
    }
    
    // 6th attempt should be rate limited
    await request(app).post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'wrong' })
      .expect(429)
      .expect((res) => {
        expect(res.body.error).toBe('RATE_LIMITED');
      });
  });
});
```

---

## 📊 Performance Impact

### Rate Limiting Library: express-rate-limit

```typescript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  keyGenerator: (req) => `${req.body.email}:${req.ip}`,
  message: 'Too many login attempts',
  store: new RedisStore({ client: redis }) // For production
});

app.post('/api/auth/login', loginLimiter, authController.login);
```

### Resource Usage

- **Memory** (per limit): ~10 KB per endpoint
- **Redis** (if distributed): 1 entry per (user + window)
- **Latency**: +2-5ms per request (Redis lookup)

---

**Version**: 1.0  
**Status**: 🟡 PARTIALLY IMPLEMENTED  
**Missing**: Token refresh, game scoring, admin endpoints, return requests  
**Next Review**: 2026-04-19 (30 days)
