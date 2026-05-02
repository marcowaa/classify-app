# API Endpoints Reference — Complete Specification
<!-- synced: copilot-instructions.md on 2026-04-18 23:10 UTC -->

**Purpose**: Single source of truth for all API contracts  
**Source of Authority**: Actual code in server/routes/*  
**Status**: 🟢 SYNCHRONIZED with copilot-instructions.md  
**Version**: 2.5  
**Last Updated**: 2026-04-18 23:10 UTC

---

## 🔴 IMMUTABLE API CONTRACT

### Success Response Format
```json
{
  "success": true,
  "data": { /* response payload */ },
  "message": "Optional human-readable message"
}
```

### Error Response Format
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error description"
}
```

**VIOLATION**: Changing this format = CRITICAL FAILURE

---

## 📡 Standard Error Codes

| Code | Meaning | HTTP Status |
|------|---------|------------|
| `NOT_FOUND` | Resource doesn't exist | 404 |
| `UNAUTHORIZED` | Not authenticated or insufficient permissions | 401 |
| `FORBIDDEN` | Authenticated but access denied | 403 |
| `BAD_REQUEST` | Invalid input validation | 400 |
| `INTERNAL_SERVER_ERROR` | Server error | 500 |
| `PARENT_CHILD_MISMATCH` | Parent doesn't own this child | 403 |
| `OTP_EXPIRED` | OTP code expired or invalid | 400 |
| `RATE_LIMITED` | Too many requests | 429 |
| `CONFLICT` | Resource already exists | 409 |
| `UNPROCESSABLE_ENTITY` | Semantic validation failed | 422 |

---

## 🔑 Authentication Endpoints

---

## 📣 Admin Campaign Delivery Notes

### Priority-Driven Delivery Strength (Ads)
For campaign notifications created from admin ads endpoints, delivery behavior is derived from ad `priority`:

- `0-3` => `quiet`: in-app only, toast style, normal priority, no sound
- `4-7` => `popup`: in-app + web/mobile push, toast style, warning priority, sound enabled
- `8-10` => `strong`: in-app + web/mobile push, modal style, urgent priority, sound enabled

This mapping applies to:

- `POST /api/admin/ads` (live campaign broadcast when ad is active)
- `POST /api/admin/ads/test-send` (test broadcast)

`POST /api/admin/ads/test-send` response now includes:

```json
{
  "success": true,
  "data": {
    "sentParents": 5,
    "sentChildren": 5,
    "audience": "all",
    "priority": 8,
    "deliveryStrength": "strong",
    "channels": ["in_app", "web_push", "mobile_push"]
  }
}
```

---

## 🔑 Authentication Endpoints

### POST /api/auth/register
**Purpose**: Create new parent account  
**Rate Limit**: 5/min per IP  
**Auth**: ❌ Public

**Request**:
```json
{
  "email": "parent@example.com",
  "password": "SecurePassword123!",
  "name": "Parent Name",
  "phoneNumber": "+201234567890",
  "gender": "male" | "female",
  "governorate": "Cairo",
  "termsAccepted": true,
  "age": 17,
  "birthDate": "2009-05-22"
}
```

**Validation**:
- `email`: required, format email, unique across system
- `password`: required, min 8 chars, strong (uppercase + lowercase + number + symbol)
- `name`: required, string, 2-100 chars
- `phoneNumber`: required, E.164 format
- `gender`: required, enum ["male", "female"]
- `governorate`: optional, string
- `termsAccepted`: required, MUST be `true` (NEW in 2026-03-19)
- `age` OR `birthDate`: required for role classification by age policy

**Age Classification Behavior**:
- Reads parent threshold age from mobile app settings (`mobileApp.parentThresholdAge`)
- If `resolvedAge < threshold`: creates child trial account and returns `requiresChildFlow=true` with child trial payload
- If `resolvedAge >= threshold`: creates parent account normally

**Child Trial Response Example**:
```json
{
  "success": true,
  "data": {
    "requiresChildFlow": true,
    "redirectTo": "/child-games",
    "classification": "CHILD_TRIAL",
    "childTrial": {
      "childId": "uuid",
      "childName": "Kid Name",
      "shareCode": "ABCD2345",
      "childToken": "jwt...",
      "trialChildToken": "jwt...",
      "trialChildLinkUrl": "/parent-auth?mode=register&trialChildToken=..."
    }
  }
}
```

**Response (Success 201)**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "parent": {
      "id": "uuid",
      "email": "parent@example.com",
      "name": "Parent Name",
      "createdAt": "2026-03-19T10:00:00Z"
    }
  },
  "message": "Account created successfully"
}
```

**Response (Error 400)**:
```json
{
  "success": false,
  "error": "BAD_REQUEST",
  "message": "termsAccepted must be true to create account"
}
```

**Side Effects**:
- Creates parent record in `parents` table
- Generates JWT token (30-day expiry) — ⚠️ SHOULD be 15-min access + refresh token
- Returns token in response (not in httpOnly cookie) — ⚠️ SECURITY ISSUE

---

### POST /api/auth/login
**Purpose**: Authenticate parent with email/password  
**Rate Limit**: 5/min per (email + IP)  
**Auth**: ❌ Public

**Request**:
```json
{
  "email": "parent@example.com",
  "password": "SecurePassword123!",
  "pinCode": "123456" // optional, if PIN enabled
}
```

**Response (Success, no 2FA 200)**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "parent": { /* parent object */ }
  }
}
```

**Response (Success, 2FA required 200)**:
```json
{
  "success": true,
  "data": {
    "requiresOTP": true,
    "sessionToken": "temp_session_uuid"
  },
  "message": "Please enter OTP code sent to your email"
}
```

**Response (Error, invalid credentials 401)**:
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Invalid email or password"
}
```

---

### POST /api/auth/request-otp
**Purpose**: Request OTP code for 2FA or password reset  
**Rate Limit**: 3/min per email  
**Auth**: ❌ Public

**Request**:
```json
{
  "email": "parent@example.com"
}
```

**Response (Success 201)**:
```json
{
  "success": true,
  "message": "OTP sent to your email",
  "data": { }
}
```

**Response (Error, rate limited 429)**:
```json
{
  "success": false,
  "error": "RATE_LIMITED",
  "message": "Maximum OTP requests reached. Try again later."
}
```

**Security Notes**:
- ⚠️ OTP code is 6 digits = 10^6 combinations (brute-forceable)
- ⚠️ Should use 6+ character random string (36^6 combinations)
- ⚠️ Email delay creates window for enumeration attacks

**Current Delivery Methods (Production)**:
- `email`
- `sms`
- `whatsapp` (phone-based OTP via active WhatsApp provider)

**Method Resolution**:
- `method=email` uses `email` field.
- `method=sms|whatsapp` uses `phoneNumber` field.
- Available methods per parent account are exposed by `GET /api/auth/otp-methods/:email`.

---

### POST /api/auth/verify-otp
**Purpose**: Verify OTP code and complete authentication  
**Rate Limit**: 5/min per email  
**Auth**: ❌ Public

**Request**:
```json
{
  "method": "email|sms|whatsapp",
  "email": "parent@example.com",
  "phoneNumber": "+201234567890",
  "code": "123456",
  "sessionToken": "temp_session_uuid" // optional, for 2FA flow
}
```

**Response (Success 200)**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "parent": { /* parent object */ }
  },
  "message": "OTP verified successfully"
}
```

**Response (Error 401)**:
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Invalid or expired OTP code"
}
```

---

### POST /api/auth/logout
**Purpose**: Invalidate user session  
**Rate Limit**: 5/min per user  
**Auth**: 👤 Parent (JWT required)

**Request**: No body required

**Response (Success 200)**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**⚠️ SECURITY ISSUE**: 
- Token remains valid until 30-day expiry
- No token revocation list
- Logout is NOOP, doesn't actually invalidate token

**Fix Required**: Implement redis-backed token revocation

---

### POST /api/auth/refresh-token ❌ NOT IMPLEMENTED
**Purpose**: Get new JWT token before expiry  
**Rate Limit**: 10/min per user  
**Auth**: 👤 Parent (refresh token in cookie)

**CRITICAL MISSING**: This endpoint is required for:
- Short-lived access tokens (15 min)
- Long-lived refresh tokens (30 days, httpOnly)
- Token rotation on each refresh
- Session tracking across devices

**Timeline**: Must implement within 2 weeks

---

## 👨‍👩‍👧‍👦 Family Management Endpoints

### GET /api/parent/profile-data
**Purpose**: Fetch parent profile + all children  
**Rate Limit**: 10/min/user  
**Auth**: 👤 Parent

**Response**:
```json
{
  "success": true,
  "data": {
    "parent": {
      "id": "uuid",
      "email": "parent@example.com",
      "name": "Parent Name",
      "phoneNumber": "+201234567890",
      "profileRequiresPassword": true,
      "createdAt": "2026-03-15T00:00:00Z"
    },
    "children": [
      {
        "id": "uuid",
        "firstName": "Child Name",
        "lastName": "Last",
        "dateOfBirth": "2015-01-01",
        "gender": "male",
        "avatarUrl": "https://...",
        "totalPoints": 1500
      }
    ],
    "stats": {
      "totalChildren": 1,
      "activeChildren": 1
    }
  }
}
```

---

## 💰 Parent Wallet & Google Play Top-up Endpoints

### GET /api/parent/wallet
**Purpose**: Get parent wallet balance summary  
**Auth**: 👤 Parent

**Response (no wallet row yet)**:
```json
{
  "success": true,
  "data": {
    "balance": 0,
    "totalDeposited": 0,
    "totalSpent": 0
  },
  "message": "Wallet retrieved"
}
```

### GET /api/parent/payment-methods
**Purpose**: List active admin-managed external top-up methods  
**Auth**: 👤 Parent

**Behavior Notes (2026-04-18)**:
- Country filtering remains enforced via shipping/request country
- Visibility categories remain enforced via `paymentMethodVisibility`
- Native Android app clients should use Google Play top-up path (below) for digital wallet top-ups

### GET /api/parent/google-play/products
**Purpose**: Return allowed Google Play wallet SKUs + account obfuscation token for native purchase flow  
**Auth**: 👤 Parent

**Response Example**:
```json
{
  "success": true,
  "data": {
    "packageName": "com.classi_fy.twa",
    "accountObfuscationId": "hex_hmac_value",
    "products": [
      {
        "productId": "wallet_5",
        "walletAmount": 5,
        "currency": "USD",
        "consumable": true,
        "displayName": "Wallet $5"
      }
    ]
  },
  "message": "Google Play products retrieved"
}
```

### POST /api/parent/google-play/complete-purchase
**Purpose**: Verify Play purchase token, enforce `PURCHASED` state, acknowledge/consume, then credit parent wallet atomically  
**Auth**: 👤 Parent  
**Rate Limit**: Uses deposit limiter

**Request**:
```json
{
  "productId": "wallet_5",
  "purchaseToken": "token_from_billing_client",
  "orderId": "optional_order_id",
  "packageName": "optional_package_name"
}
```

**Behavior Notes (2026-04-18)**:
- Native Android-only endpoint (`x-client-platform=android` or native Android user-agent)
- Verifies purchase token via Google Play Developer API before any credit
- Rejects non-`PURCHASED` states (e.g. `PENDING`)
- Verifies purchase attribution through obfuscated account id
- Performs acknowledge and (for consumables) consume before crediting
- Credits wallet + creates completed deposit history row in one DB transaction
- Idempotent on `purchaseToken` via `google_play_purchases` table

### POST /api/parent/deposit
**Purpose**: Submit external/manual top-up proof for admin review  
**Auth**: 👤 Parent

**Compliance Guard (2026-04-18)**:
- Native Android clients are rejected with `BAD_REQUEST` and must use Google Play Billing path (`/api/parent/google-play/complete-purchase`)

### GET /api/parent/deposits
**Purpose**: List parent deposit history (manual + auto-completed Google Play top-ups)  
**Auth**: 👤 Parent

---

## 🛍️ Store & Checkout Endpoints

### GET /api/store/payment-methods
**Purpose**: List parent checkout payment methods after country + policy filtering  
**Auth**: 👤 Parent

**Query Params**:
- `country` (optional)
- `platform` (optional: `android` | `ios` | `web`)
- `purchaseKind` (optional: `digital` | `subscription` | `mixed` | `physical` | `library`)

**Response Notes**:
- Response envelope remains `{ success, data }`
- Adds `meta` block with policy context:
  - `googlePlayEnforced`
  - `walletCheckoutEnabled`
  - `googlePlayMethodType`

### GET /api/store/checkout-policy
**Purpose**: Resolve effective checkout compliance policy for current platform/purchase context  
**Auth**: 👤 Parent

**Query Params**:
- `platform` (optional)
- `purchaseKind` (optional)

**Response Example**:
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "enforceAndroidDigitalPurchases": true,
    "googlePlayMethodType": "google_pay",
    "walletCheckoutEnabled": false,
    "pointsPerCurrencyUnit": 10,
    "defaultCurrency": "EGP",
    "childRequestInvoicesEnabled": true,
    "platform": "android",
    "purchaseKind": "digital",
    "googlePlayEnforced": true
  }
}
```

### POST /api/store/checkout
**Purpose**: Create purchase order  
**Rate Limit**: 10/min/user  
**Auth**: 👤 Parent

**Request**:
```json
{
  "items": [
    { "productId": "uuid", "quantity": 2 }
  ],
  "paymentMethodId": "uuid",
  "shippingAddress": {
    "name": "Full Name",
    "line1": "Street Address",
    "city": "Cairo",
    "state": "Cairo",
    "postalCode": "12345",
    "country": "EG"
  },
  "currency": "EGP",
  "country": "EG",
  "platform": "android",
  "purchaseKind": "digital",
  "referralCode": "optional",
  "idempotencyKey": "uuid",
  "sourceAdId": "optional-ad-id-for-campaign-attribution"
}
```

**NEW Fields (2026-03-19)**:
- `currency`: Select checkout currency (EGP, SAR, AED, etc.)
- `country`: Multi-country support (EG, SA, AE, etc.)
- Product moderation check: Only `moderationStatus == "approved"` products

**Behavior Notes (2026-03-20)**:
- Checkout is blocked if parent has no linked children (`parent_child` count = 0)
- Returns `403` with error `PARENT_CHILD_MISMATCH` and message: `Link at least one child before completing purchases`
- The same linked-child guard is enforced for these monetization routes:
  - `POST /api/parent/cart/checkout`
- Legacy parent store checkout routes were retired on 2026-04-18 and now return `410`:
  - `POST /api/parent/store/checkout`
  - `POST /api/parent/store/purchase`
  - `POST /api/parent/store/checkout/preview`
  - `POST /api/parent/store/checkout/confirm`
  - `GET /api/parent/store/orders`
  - `GET /api/parent/store/orders/:orderId`
- If first-product discount is enabled in trial policy and parent has no prior paid purchases:
  - Discount is applied server-side on the first cart item
  - Success response includes:
    - `discount.type = "first_product"`
    - `discount.percent`
    - `discount.amount`
- Google Play compliance is enforced for Android digital/subscription checkouts when enabled in app settings:
  - Wallet checkout is blocked if policy disables wallet
  - Non-Google payment methods are rejected for enforced Android digital flows
- Physical and library-product checkouts are explicitly classified as non-digital (`purchaseKind = physical`) and are not forced into Google Play Billing paths.
- Non-wallet checkout requires an `idempotencyKey` (header `Idempotency-Key`/`X-Idempotency-Key` or body `idempotencyKey`) with 12-128 safe characters.

---

## 📣 Ads & Campaign Endpoints

### POST /api/admin/ads/test-send
**Purpose**: Send a test ad/campaign notification without saving an ad record  
**Rate Limit**: Admin only (protected route)  
**Auth**: 👑 Admin (JWT required)

**Request**:
```json
{
  "title": "خصم 30% على باقة الرياضيات",
  "content": "العرض متاح اليوم فقط",
  "imageUrl": "https://example.com/banner.jpg",
  "linkUrl": "/child-store?promoProductId=uuid&promoDiscount=30",
  "targetAudience": "children",
  "sampleSize": 5
}
```

**Validation**:
- `title`: required, non-empty string
- `content`: required, non-empty string
- `targetAudience`: optional, defaults to `all` (`all` | `parents` | `children`)
- `sampleSize`: optional, clamped to 1..20 (applied per audience segment)

**Response (Success 200)**:
```json
{
  "success": true,
  "data": {
    "sentParents": 0,
    "sentChildren": 5,
    "audience": "children",
    "sampleSize": 5
  },
  "message": "Test campaign sent"
}
```

### GET /api/admin/ads/analytics
**Purpose**: Fetch campaign analytics summary across ads, audiences, and promo-linked products  
**Rate Limit**: Admin only (protected route)  
**Auth**: 👑 Admin (JWT required)

**Query Parameters**:
- `rangeDays` (optional): analytics window in days, min 1 max 365, default `30`

**Attribution Source**:
- Conversion metrics are computed from `ad_conversions` rows captured during checkout when `sourceAdId` is provided.

**Response (Success 200)**:
```json
{
  "success": true,
  "data": {
    "totals": {
      "adsCount": 14,
      "totalViews": 12400,
      "totalClicks": 1210,
      "totalEstimatedConversions": 140,
      "ctrPercent": 9.76
    },
    "rangeDays": 30,
    "windowStart": "2026-02-19T12:00:00.000Z",
    "byAudience": [
      {
        "audience": "children",
        "adsCount": 8,
        "views": 8200,
        "clicks": 860,
        "ctrPercent": 10.49,
        "estimatedConversions": 95
      }
    ],
    "topCampaignProducts": [
      {
        "productId": "uuid",
        "productName": "Math Bundle",
        "campaignAds": 3,
        "estimatedConversions": 28,
        "estimatedUnits": 39,
        "estimatedRevenue": 3120.5
      }
    ]
  }
}
```

---

## 💳 Return Request Endpoints (NEW 2026-03-19)

### POST /api/parent/purchases/:id/return-request
**Purpose**: Parent initiates return for purchase  
**Rate Limit**: 5/min/user  
**Auth**: 👤 Parent

**Request**:
```json
{
  "reason": "Item damaged",
  "details": "Arrived with broken screen"
}
```

**Response (Success 201)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "req_uuid",
      "libraryOrderId": "order_uuid",
      "status": "under_review",
      "freezeAmount": "150.00",
      "freezeSource": "pending",
      "eligibleUntil": "2026-04-19T00:00:00Z",
      "createdAt": "2026-03-19T10:00:00Z"
    }
  ],
  "message": "Return request submitted and merchant balance frozen"
}
```

**Validation**:
- Purchase must be delivered (status = "delivered")
- Within 15-day window from deliveredAt
- No open return request exists for this order

---

### PUT /api/admin/library-return-requests/:id/resolve
**Purpose**: Admin issues final decision on return  
**Rate Limit**: 10/min/admin  
**Auth**: 👥 Admin

**Request**:
```json
{
  "decision": "approve" | "reject",
  "note": "Admin reasoning (internal)"
}
```

**Approve Flow**:
- frozenBalance -= freezeAmount (release freeze)
- Keep deductions from pending/available (permanent)
- order.status = "returned"

**Reject Flow**:
- frozenBalance -= freezeAmount
- Restore to original bucket (pending/available)
- order.status = "delivered"

---

## 📊 Admin Endpoints

### GET /api/admin/settings/age-policy
**Purpose**: Fetch age policy configuration for account classification  
**Auth**: 👥 Admin

**Response**:
```json
{
  "success": true,
  "data": {
    "parentThresholdAge": 13
  }
}
```

### PUT /api/admin/settings/age-policy
**Purpose**: Update age policy threshold and sync mobile app threshold  
**Auth**: 👥 Admin

**Request**:
```json
{
  "parentThresholdAge": 13
}
```

### GET /api/admin/settings/trial-policy
**Purpose**: Fetch trial policy defaults  
**Auth**: 👥 Admin

**Response**:
```json
{
  "success": true,
  "data": {
    "trialExpiryDays": 30,
    "explorePromptPercent": 30,
    "purchaseIntentPromptEnabled": true,
    "showSocialLoginButtons": true,
    "firstProductDiscountEnabled": true,
    "firstProductDiscountPercent": 15
  }
}
```

### PUT /api/admin/settings/trial-policy
**Purpose**: Update trial policy defaults  
**Auth**: 👥 Admin

**Request**:
```json
{
  "trialExpiryDays": 30,
  "explorePromptPercent": 30,
  "purchaseIntentPromptEnabled": true,
  "showSocialLoginButtons": true,
  "firstProductDiscountEnabled": true,
  "firstProductDiscountPercent": 15
}
```

### POST /api/auth/link-trial-child
**Purpose**: Link trial child to authenticated parent after successful parent signup/login  
**Auth**: 👨 Parent token

**Request**:
```json
{
  "trialChildToken": "jwt..."
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "linked": true,
    "childId": "uuid",
    "childName": "Kid Name"
  }
}
```

### POST /api/child/store/purchase-request
**Purpose**: Create child purchase request for parent approval  
**Auth**: 🧒 Child token

**Special Trial Behavior (No linked parent):**
- Returns success envelope with `requiresParentLink=true`
- Includes `parentLink` payload containing:
  - `shareCode`
  - `trialChildToken`
  - `trialChildLinkUrl`

This allows the app to redirect to parent registration and auto-link after successful parent auth.

### GET /api/child/store/purchase-requests
**Purpose**: List child purchase requests with current decision state  
**Auth**: 🧒 Child token

**Response Notes**:
- Includes `status` (`pending` | `approved` | `rejected`)
- Includes `orderId` when parent approved and order was created
- Includes `decidedAt` and optional `rejectionReason`

### POST /api/parent/purchase-requests/:id/decision
**Purpose**: Parent approves/rejects child purchase requests  
**Auth**: 👤 Parent

**Request**:
```json
{
  "decision": "approve",
  "rejectionReason": "optional when rejected"
}
```

**Response Notes (approve)**:
- Creates `orders` record for child fulfillment flow
- When `googlePlayMonetizationPolicy.childRequestInvoicesEnabled = true`, also creates parent invoice records:
  - `parentPurchases` (invoice header)
  - `parentPurchaseItems` (invoice lines)
- Success payload includes:
  - `orderId`
  - `invoiceId` (nullable)
  - `invoiceNumber` (nullable)

### GET /api/child/store/orders/:orderId
**Purpose**: Get approved order details visible to the child (order tracking dialog)  
**Auth**: 🧒 Child token

**Security Rule**:
- Endpoint returns data only if this `orderId` is linked to an approved purchase request for the authenticated child.

**Response Example**:
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "uuid",
      "status": "paid",
      "shippingStatus": "processing"
    },
    "items": [
      {
        "productId": "uuid",
        "quantity": 1,
        "unitAmount": "120.00",
        "product": {
          "id": "uuid",
          "name": "Notebook",
          "nameAr": "دفتر",
          "image": "https://..."
        }
      }
    ]
  }
}
```

### GET /api/admin/library-products/review
**Purpose**: List products pending moderation  
**Auth**: 👥 Admin

**Query Params**:
```
?status=pending_review | approved | rejected
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "product_uuid",
      "title": "Product Name",
      "libraryId": "lib_uuid",
      "libraryName": "Library Name",
      "moderationStatus": "pending_review",
      "submittedAt": "2026-03-18T15:00:00Z"
    }
  ]
}
```

### GET /api/admin/referrals/overview
**Purpose**: Unified referral metrics across parents, libraries, schools, teachers, and child link visits  
**Auth**: 👥 Admin

**Response**:
```json
{
  "success": true,
  "data": {
    "parents": { "total": 120, "converted": 44 },
    "libraries": { "total": 340, "converted": 79 },
    "schools": { "total": 180, "converted": 51 },
    "teachers": { "total": 96, "converted": 23 },
    "children": { "totalVisits": 1400 }
  }
}
```

### GET /api/admin/referrals/schools
**Purpose**: Detailed school referral rows + enrolled conversions  
**Auth**: 👥 Admin

### GET /api/admin/referrals/teachers
**Purpose**: Detailed teacher referral rows + hired/purchased conversions  
**Auth**: 👥 Admin

### GET /api/admin/referrals/children
**Purpose**: Child public share-link visit analytics  
**Auth**: 👥 Admin

### POST /api/store/schools/:id/referral-click
**Purpose**: Record school referral-link click (guest or authenticated)  
**Auth**: Optional

### POST /api/store/teachers/:id/referral-click
**Purpose**: Record teacher referral-link click (guest or authenticated)  
**Auth**: Optional

### GET /api/store/teachers/by-referral/:code
**Purpose**: Resolve teacher profile by referral code  
**Auth**: Public

---

## 📋 Documentation Status

| Endpoint Category | Count | Status |
|------------------|-------|--------|
| Authentication | 6 | ⚠️ 1 missing (refresh) |
| Family Management | 8 | ✅ Complete |
| Store & Checkout | 5 | ✅ Complete (updated) |
| Return Requests | 3 | ✨ NEW (2026-03-19) |
| Admin | 20+ | ✅ Referral analytics expanded |
| Total | 45+ | 🟡 In Progress |

---

## 🔄 Sync Information

**Source**: `.github/copilot-instructions.md` → Section "API CONTRACT"  
**Maintained By**: Classify Engineering  
**Sync Frequency**: Real-time (when endpoints change)  
**Last Sync**: 2026-04-18 21:40 UTC  

**Before committing any endpoint changes**:
1. Update this file with new endpoint spec
2. Add to corresponding section (Auth, Store, Admin, etc.)
3. Include rate limit, auth, request/response contracts
4. Update sync date

---

**Version**: 2.4  
**Status**: 🟢 ACTIVE & SYNCHRONIZED  
**Critical Issues**: 1 missing endpoint (refresh), 1 NOOP (logout)  
**Next Review**: 2026-04-19 (30 days)
