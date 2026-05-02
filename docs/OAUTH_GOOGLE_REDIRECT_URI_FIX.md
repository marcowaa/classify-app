# Google OAuth Redirect URI Fix — Production Issue

**Last Updated:** 2026-03-26 02:24 UTC  
**Issue:** Google OAuth login failing with `invalid_grant` error  
**Root Cause:** Missing Google provider config in database OR redirect_uri mismatch  
**Status:** 🟡 IN PROGRESS - Provider inserted with correct URI, awaiting client_secret

## Current Status

### ✅ What Was Fixed
- Google provider record **inserted into database**
- Redirect URI now points to: `https://classi-fy.com/api/auth/oauth/google/callback` ✅

### ⏳ What Needs Verification
- Google OAuth client secret (currently empty - needs to be populated)
- Whether token exchange will succeed with correct redirect_uri
- End-to-end OAuth flow testing

---

### Error Evidence from Production Logs

```
[OAuth google] Token exchange — redirect_uri: https://classi-fy.com/auth/google/callback
[OAuth google] Token error: invalid_grant — Bad Request
```

### Root Cause

**Mismatch between what app sends and what Google expects:**

| Component | Current Value | Expected Value | Status |
|-----------|---------------|-----------------|--------|
| App sends | `https://classi-fy.com/auth/google/callback` | ❌ WRONG |
| Should be | `https://classi-fy.com/api/auth/oauth/google/callback` | ✅ CORRECT |
| Google Console | Must match `redirectUri` in database | Unknown | ⏳ TO VERIFY |

### Why `invalid_grant` Occurs

Google OAuth 2.0 token exchange rejects requests when:
1. Callback URL doesn't match Google OAuth app configuration
2. Authorization code was issued for different redirect URI
3. Client secret is invalid
4. Request contains malformed parameters

**Most likely cause here:** Database `socialLoginProviders` table has incorrect `redirectUri` value.

---

## Immediate Next Steps

### Step 0: Update Google Client Secret (CRITICAL)

**Your Google provider is now in the database, BUT the client_secret is currently EMPTY.**

You must update it with your actual Google OAuth credentials:

```bash
docker compose exec db psql -U classify -d classify_db -c \
  "UPDATE public.social_login_providers 
   SET client_secret = 'YOUR_ACTUAL_GOOGLE_CLIENT_SECRET_HERE'
   WHERE provider='google';"
```

**Where to find your credentials:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your project
3. Find your OAuth 2.0 Client ID (Web application)
4. Click it to view the secret
5. Copy the Client Secret value and replace `YOUR_ACTUAL_GOOGLE_CLIENT_SECRET_HERE` above

**Verification:**
```bash
docker compose exec db psql -U classify -d classify_db -c \
  "SELECT provider, client_id, client_secret, redirect_uri FROM public.social_login_providers WHERE provider='google';"
```

Expected output should show your actual client_secret (not empty).

---

## Problem Diagnosis

### Step 1: Check Current Redirect URI in Database

**Command:**
```bash
docker compose exec db psql -U classify -d classify_db -c \
  "SELECT provider, redirect_uri, is_active, client_id FROM public.social_login_providers WHERE provider='google';"
```

**Expected Output:**
```
 provider |                        redirect_uri                       | is_active |                          client_id
----------+----------------------------------------------------------+-----------+----------------------------------------------
 google   | https://classi-fy.com/api/auth/oauth/google/callback     | t         | 277976106301-f5lhgam1gbsg667rs60el88rhle651i3.apps.googleusercontent.com
```

**If output shows wrong URI:**
- Current: `https://classi-fy.com/auth/google/callback` (missing `/api/oauth`)
- **Action:** Proceed to Step 2

---

### Step 2: Update Redirect URI in Database

**Command:**
```bash
docker compose exec db psql -U classify -d classify_db -c \
  "UPDATE public.social_login_providers 
   SET redirect_uri = 'https://classi-fy.com/api/auth/oauth/google/callback'
   WHERE provider='google';"
```

**Verification:**
```bash
docker compose exec db psql -U classify -d classify_db -c \
  "SELECT provider, redirect_uri, is_active FROM public.social_login_providers WHERE provider='google';"
```

---

### Step 3: Verify Google OAuth Console Configuration

**Required settings in [Google OAuth Console](https://console.cloud.google.com/apis/credentials):**

1. **Authorized JavaScript origins** (for login button):
   ```
   https://classi-fy.com
   ```

2. **Authorized redirect URIs** (for token exchange):
   ```
   https://classi-fy.com/api/auth/oauth/google/callback
   ```

3. **Copy credentials** from Google Console:
   - Client ID: `[your-client-id].apps.googleusercontent.com`
   - Client Secret: `[your-client-secret]`
   - Update database if different:
     ```bash
     docker compose exec db psql -U classify -d classify_db -c \
       "UPDATE public.social_login_providers 
        SET client_id = 'YOUR_NEW_CLIENT_ID', 
            client_secret = 'YOUR_NEW_CLIENT_SECRET'
        WHERE provider='google';"
     ```

---

### Step 4: Test OAuth Endpoint (No Browser Required)

**Check if provider is active:**
```bash
curl -s https://classi-fy.com/api/auth/social-providers | jq '.data | map(select(.provider=="google"))'
```

**Expected response:**
```json
[
  {
    "provider": "google",
    "displayName": "Google",
    "displayNameAr": "جوجل",
    "isActive": true,
    "sortOrder": 1
  }
]
```

**Check if OAuth endpoint responds:**
```bash
curl -i https://classi-fy.com/api/auth/oauth/google
```

**Expected response:**
```
HTTP/2 302
Location: https://accounts.google.com/o/oauth2/v2/auth?client_id=...
```

---

### Step 5: End-to-End Browser Test

1. **Open web app:**
   ```
   https://classi-fy.com/
   ```

2. **Click "Login with Google" button** (should be visible on login page)

3. **You should be redirected to Google consent screen:**
   - If redirected → OAuth initiation works ✅
   - If error → Check that Google provider is `isActive: true` in database

4. **After granting permission:**
   - Browser redirects to: `https://classi-fy.com/api/auth/oauth/google/callback?code=...&state=...`
   - If you see error page → Token exchange failed (check logs for `invalid_grant`)
   - If logged in → Success ✅

5. **Check production logs for errors:**
   ```bash
   docker compose logs app --tail=50 | grep -i "oauth\|token error"
   ```

---

## Quick Reference: Full Diagnostic Script

**Save as `/tmp/oauth-diagnose.sh` on server:**

```bash
#!/bin/bash
set -e

echo "═══════════════════════════════════════════════════════════"
echo "  Google OAuth Diagnostic Report"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check 1: Database configuration
echo "[1/5] Checking database configuration..."
docker compose exec db psql -U classify -d classify_db -c \
  "SELECT provider, redirect_uri, is_active, client_id FROM public.social_login_providers WHERE provider='google';" \
  || echo "❌ Failed to query database"

echo ""

# Check 2: Health endpoint
echo "[2/5] Checking health endpoint..."
curl -s -i https://classi-fy.com/api/health | head -1

echo ""

# Check 3: Social providers list
echo "[3/5] Checking active providers..."
curl -s https://classi-fy.com/api/auth/social-providers | jq '.data[] | {provider, isActive}' 2>/dev/null \
  || echo "❌ Failed to fetch providers"

echo ""

# Check 4: OAuth endpoint response (should redirect)
echo "[4/5] Testing OAuth endpoint..."
curl -s -i https://classi-fy.com/api/auth/oauth/google | head -5

echo ""

# Check 5: Recent logs
echo "[5/5] Recent OAuth-related logs..."
docker compose logs app --tail=20 | grep -i "oauth\|token" || echo "ℹ️ No recent OAuth activity"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Run this script regularly to monitor OAuth health"
echo "═══════════════════════════════════════════════════════════"
```

**Run it:**
```bash
chmod +x /tmp/oauth-diagnose.sh
/tmp/oauth-diagnose.sh
```

---

## Prevention: Configuration Checklist

- [ ] Database `social_login_providers.redirect_uri` = `https://classi-fy.com/api/auth/oauth/google/callback`
- [ ] Database `social_login_providers.is_active` = `true` for google provider
- [ ] Database `social_login_providers.client_id` matches Google Console
- [ ] Database `social_login_providers.client_secret` matches Google Console
- [ ] Google Console: Authorized Origins = `https://classi-fy.com`
- [ ] Google Console: Authorized Redirect URIs = `https://classi-fy.com/api/auth/oauth/google/callback`
- [ ] Environment variable `APP_URL` = `https://classi-fy.com` (if used by app)
- [ ] Production server running latest build (redeploy if in doubt)

---

## Related Code References

**Server-side OAuth implementation:**
- [server/routes/auth.ts](../server/routes/auth.ts#L3720) - OAuth endpoint definitions
- [shared/schema.ts](../shared/schema.ts#L1861) - socialLoginProviders table schema

**Frontend OAuth integration:**
- [client/src/pages/LoginPage.tsx](../client/src/pages/LoginPage.tsx) - Login UI with Google button
- [ChildGames.tsx](../client/src/pages/ChildGames.tsx#L50) - OAuth provider detection

---

## Troubleshooting Decision Tree

```
Does "Login with Google" button appear on page?
├─ YES → Click it
│   └─ Redirected to Google consent screen?
│       ├─ YES → After granting permission...
│       │   └─ Logged in successfully? → ✅ WORKING
│       │   └─ Error page? → Check logs for "invalid_grant"
│       │       └─ Fix redirect URI (see Step 2)
│       └─ NO → Google provider not active in database
│           └─ Set isActive=true (see Step 2)
└─ NO → Check if google provider in database
    └─ Add/Enable google provider
        └─ Restart app: docker compose restart app
```

---

## Next Steps If Issue Persists

1. **Clear browser cache/cookies:**
   ```bash
   # In browser: Cmd+Shift+Del (Mac) or Ctrl+Shift+Del (Windows)
   # Delete: Cookies, Cache, Logout from all Google accounts
   ```

2. **Check Google Cloud credentials:**
   - Verify Client ID format: `{number}.apps.googleusercontent.com`
   - Verify Client Secret is not empty
   - Check that OAuth consent screen is configured (Status: In Production or Testing)

3. **Inspect full OAuth callback error:**
   ```bash
   docker compose logs app -f | grep -A5 "Token exchange"
   ```

4. **Enable debug logging (if available):**
   ```bash
   docker compose set-env app DEBUG=classify:oauth
   docker compose restart app
   ```

5. **Contact support with:**
   - Output from diagnostic script
   - Error message from browser console
   - Error message from server logs
   - Google Client ID (last 4 characters only)

---

**Last synced:** 2026-03-26 | **Status:** 🔴 CRITICAL | **Action:** Immediate fix required
