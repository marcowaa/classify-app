# Google OAuth Client ID Setup Guide
## إنشاء Google OAuth Client ID — الدليل الكامل

**Last Updated:** 2026-03-26  
**Project:** Classify — Kids Educational Platform  
**Status:** ✅ Complete Setup Instructions

---

## Overview

This guide provides **step-by-step instructions** for creating a Google OAuth Client ID for the Classify application. Each platform (Web, Android, iOS) requires its own Client ID.

### Critical Callback URL for This Project
```
https://classi-fy.com/api/auth/oauth/google/callback
```

**Development URL:**
```
http://localhost:5000/api/auth/oauth/google/callback
```

---

## Part 1: إعداد مشروع Google Cloud — Set Up Google Cloud Project

### الخطوة الأولى — Step 1: Create a New Google Cloud Project

1. **Navigate to Google Cloud Console:**
   - Go to [console.cloud.google.com](https://console.cloud.google.com/)
   - Sign in with your Google account

2. **Create a New Project:**
   - Click the **"Select a Project"** dropdown at the top-left
   - Click **"NEW PROJECT"**
   - Enter the Project Name: `Classify OAuth`
   - Click **"CREATE"**

3. **Wait for Project Creation:**
   - The project will be created within 1-2 minutes
   - Once complete, the console will automatically switch to the new project

---

## Part 2: تفعيل Google+ API — Enable Google+ API

### الخطوة الثانية — Step 2: Enable Required APIs

1. **Navigate to APIs & Services:**
   - In the left sidebar, click **"APIs & Services"** → **"Library"**
   - Alternatively, search for "APIs & Services" in the search bar at the top

2. **Enable Google+ API:**
   - Search for **"Google+ API"** in the search box
   - **Note:** You may see "Google Identity Services API" — that's also acceptable
   - Click on **"Google+ API"** from the results
   - Click the **"ENABLE"** button

3. **Alternative: Enable "Google Identity Service API":**
   - Search for **"Google Identity Services API"**
   - Click **"ENABLE"** if this appears instead

---

## Part 3: إنشاء OAuth Consent Screen — Create OAuth Consent Screen

### الخطوة الثالثة — Step 3: Configure OAuth Consent Screen

1. **Navigate to OAuth Consent Screen:**
   - In the left sidebar, click **"APIs & Services"** → **"OAuth consent screen"**

2. **Select User Type:**
   - Select **"External"** (for external users/public app)
   - Click **"CREATE"**

3. **Fill in App Information:**
   ```
   App name: Classify
   User support email: your-email@gmail.com
   Developer contact information:
   - Email addresses: your-email@gmail.com
   ```

4. **Add Scopes (if prompted):**
   - Click **"ADD OR REMOVE SCOPES"**
   - Select scopes:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
   - Click **"UPDATE"**

5. **Complete All Sections:**
   - Review each section (App information, Scopes, OAuth clients, Summary)
   - Click **"SAVE AND CONTINUE"** for each section
   - On the final screen, click **"BACK TO DASHBOARD"**

---

## Part 4: إنشاء OAuth Client ID — Create OAuth 2.0 Credentials

### الخطوة الرابعة — Step 4: Create OAuth 2.0 Client ID (Web)

1. **Navigate to Credentials:**
   - In the left sidebar, click **"APIs & Services"** → **"Credentials"**

2. **Create New Credentials:**
   - Click **"+ CREATE CREDENTIALS"** at the top
   - Select **"OAuth client ID"**

3. **Select Application Type:**
   - From the dropdown, select **"Web application"**

4. **Configure Web Application Settings:**

   **Name:**
   ```
   Classify Web App
   ```

   **Authorized JavaScript Origins:**
   ```
   https://classi-fy.com
   http://localhost:5000
   http://127.0.0.1:5000
   ```

   **Authorized Redirect URIs:** ⚠️ **CRITICAL — MUST BE EXACT**
   ```
   https://classi-fy.com/api/auth/oauth/google/callback
   http://localhost:5000/api/auth/oauth/google/callback
   http://127.0.0.1:5000/api/auth/oauth/google/callback
   ```

5. **Create the Credential:**
   - Click **"CREATE"**
   - A modal will appear with your credentials

---

## Part 5: نسخ البيانات — Copy Your Credentials

### الخطوة الخامسة — Step 5: Retrieve Client ID and Secret

1. **In the Credentials Modal, You Will See:**
   ```
   Client ID: [YOUR_CLIENT_ID].apps.googleusercontent.com
   Client Secret: [YOUR_CLIENT_SECRET]
   ```

2. **Copy Both Values:**
   - Click the copy icon next to **Client ID**
   - Click the copy icon next to **Client Secret**
   - Save them securely (password manager recommended)

3. **Keep This Modal Open** — You'll need these values to update your app

---

## Part 6: تحديث التطبيق — Update Application with Credentials

### Option A: Development Environment (`.env` File)

1. **Update your `.env` file in the project root:**
   ```env
   GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
   GOOGLE_OAUTH_REDIRECT_URI=http://localhost:5000/api/auth/oauth/google/callback
   ```

2. **Restart the development server:**
   ```bash
   npm run dev
   ```

### Option C: Native Android Google Sign-In (Capacitor)

1. **Create Android OAuth Client in Google Cloud Console:**
   - APIs & Services -> Credentials -> Create credentials -> OAuth client ID
   - Application type: **Android**
   - Package name: `com.classi_fy.twa`
   - SHA-1: use your release keystore fingerprint (and debug fingerprint for local testing)

2. **Save Android Client ID in environment:**
   ```env
   GOOGLE_ANDROID_CLIENT_ID=YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com
   ```

3. **Sync native plugins after pulling latest code:**
   ```bash
   npm install
   npx cap sync android
   ```

4. **Runtime behavior:**
   - On native Android, Google button uses Native SDK first.
   - On web (or if native call fails), app falls back to standard web OAuth redirect.
   - Backend endpoint: `POST /api/auth/oauth/google/native` verifies `idToken` with Google.

5. **Verify backend native config endpoint:**
   ```bash
   curl -s https://classi-fy.com/api/auth/oauth/google/native-config
   ```
   Expected: success response containing `clientId`.

### Option B: Production Database Update

1. **Connect to production database:**
   ```bash
   docker compose exec db psql -U classify -d classify_db
   ```

2. **Insert/Update Google Provider Configuration:**
   ```sql
   INSERT INTO public.social_login_providers 
   (provider, client_id, client_secret, redirect_uri, is_active, created_at)
   VALUES (
     'google',
     'YOUR_CLIENT_ID.apps.googleusercontent.com',
     'YOUR_CLIENT_SECRET',
     'https://classi-fy.com/api/auth/oauth/google/callback',
     true,
     NOW()
   )
   ON CONFLICT (provider) DO UPDATE SET
     client_id = 'YOUR_CLIENT_ID.apps.googleusercontent.com',
     client_secret = 'YOUR_CLIENT_SECRET',
     redirect_uri = 'https://classi-fy.com/api/auth/oauth/google/callback',
     is_active = true;
   ```

3. **Verify the Update:**
   ```bash
   SELECT provider, client_id, redirect_uri, is_active 
   FROM public.social_login_providers 
   WHERE provider = 'google';
   ```

   Expected output:
   ```
   provider |           client_id           |                  redirect_uri                  | is_active
   ----------+-------------------------------+------------------------------------------------+-----------
   google   | YOUR_ID.apps.googleusercontent.com | https://classi-fy.com/api/auth/oauth/google/callback | t
   ```

---

## Part 7: التحقق — Verify Setup

### الخطوة السابعة — Step 7: Test Your OAuth Configuration

1. **Development Testing:**
   ```bash
   npm run dev
   # Navigate to http://localhost:5000/parent-auth
   # Click "Sign in with Google"
   # You should be redirected to Google login
   ```

2. **Production Testing (After Deployment):**
   - Navigate to `https://classi-fy.com/parent-auth`
   - Click "Sign in with Google"
   - Verify your email works correctly

3. **Check Logs for Errors:**
   - If login fails, check backend logs:
     ```bash
     docker compose logs -f server
     ```
   - Look for messages like:
     ```
     [OAuth google] Token exchange — redirect_uri: ...
     ```

---

## Part 8: للمنصات الأخرى — For Other Platforms

### Setting Up OAuth for Android

1. **In Google Cloud Console, create another OAuth Client ID:**
   - Go to **Credentials** → **+ CREATE CREDENTIALS** → **OAuth client ID**
   - Select **Android**
   - Provide your app's package name: `com.classify`
   - Provide your app's signature (from your keystore file)

2. **The Android app will use the same backend** (`https://classi-fy.com/api/auth/oauth/google/callback`)
   - But you'll need a separate Client ID in Google Console
   - The Android app will exchange the token with your backend

### Setting Up OAuth for iOS

1. **Similar process:**
   - Create another OAuth Client ID for **iOS**
   - Provide bundle ID: `com.classify`
   - Provide Team ID and other required certificates

---

## Troubleshooting

### ❌ Error: `invalid_grant` (Most Common)

**Cause:** Redirect URI mismatch

**Solution:**
- Verify in Google Console that your **Authorized Redirect URIs** exactly match:
  ```
  https://classi-fy.com/api/auth/oauth/google/callback
  ```
- Verify in database that `redirect_uri` column matches Google Console

### ❌ Error: `redirect_uri_mismatch`

**Cause:** Your app is sending a different redirect URI than what Google expects

**Solution:**
```bash
# Check what your server is sending:
docker compose logs -f server | grep "redirect_uri"
# Output should show: https://classi-fy.com/api/auth/oauth/google/callback
```

### ❌ Error: `invalid_client`

**Cause:** Client ID or Client Secret is incorrect or missing

**Solution:**
1. Verify credentials in `.env` or database
2. Check for extra spaces or typos
3. Re-copy credentials from Google Console

### ❌ No "Sign in with Google" Button

**Cause:** Provider not enabled in database or frontend not configured

**Solution:**
```bash
# Verify provider is active:
docker compose exec db psql -U classify -d classify_db -c \
"SELECT * FROM public.social_login_providers WHERE provider='google' AND is_active=true;"
```

---

## Security Best Practices ⚠️

1. **Never commit Client Secret to Git:**
   ```bash
   # Add to .gitignore:
   .env
   .env.local
   .env.production.local
   ```

2. **Use Environment Variables in Production:**
   - Store Client Secret in Docker secrets or environment variables
   - Never hardcode in code

3. **Rotate Credentials Regularly:**
   - Every 90 days, regenerate Client Secret in Google Console
   - Update in your application immediately

4. **Restrict API Access:**
   - In Google Cloud Console, restrict which IPs/domains can use this credential
   - Under **OAuth 2.0 Client IDs**, click your credential and set restrictions

---

## Reference Links

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Classify GitHub OAuth Implementation](../../server/routes/auth.ts) — See `case "google"` for token exchange logic

---

## Checklist ✅

Before deploying, ensure:

- [ ] Google Cloud Project created
- [ ] Google+ API enabled
- [ ] OAuth Consent Screen configured (External type)
- [ ] OAuth Client ID created (Web application)
- [ ] Client ID copied and saved securely
- [ ] Client Secret copied and saved securely
- [ ] Authorized Redirect URIs added (including production URL)
- [ ] `.env` updated with credentials (development)
- [ ] Database updated with credentials (production)
- [ ] Backend logs show correct redirect_uri
- [ ] Development testing passed (http://localhost:5000)
- [ ] Production testing passed (https://classi-fy.com)

---

## Next Steps

1. ✅ **For Development:** Update `.env` and test locally
2. ✅ **For Production:** Update database and deploy
3. ✅ **For Mobile Apps:** Create separate Android/iOS Client IDs
4. ✅ **Monitor:** Check logs for any OAuth errors post-deployment

Questions? Check the [OAUTH_GOOGLE_REDIRECT_URI_FIX.md](./OAUTH_GOOGLE_REDIRECT_URI_FIX.md) for production troubleshooting.

---

**Document Version:** v1.0  
**Last Verified:** 2026-03-26  
**Maintained By:** Classify Development Team
