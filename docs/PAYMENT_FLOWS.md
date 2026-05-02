# Payment Flow Documentation — Classify Platform

**Updated:** After payment visibility & performance improvements  
**Source of truth:** Source code analysis

---

## Architecture Overview

```
┌─────────────────────────────────────┐
│         Admin Panel                  │
│  PaymentMethodsTab.tsx               │
│  DepositsTab.tsx                     │
│  WalletsTab.tsx                      │
├─────────────────────────────────────┤
│  POST /api/admin/payment-methods     │  ← Create payment method
│  PUT  /api/admin/payment-methods/:id │  ← Update payment method
│  DEL  /api/admin/payment-methods/:id │  ← Delete/deactivate
│  GET  /api/admin/deposits            │  ← View all deposits
│  PUT  /api/admin/deposits/:id        │  ← Approve/Reject deposit
│  GET  /api/admin/wallets             │  ← View all wallets
└─────────────────┬───────────────────┘
                  │
    Payment Methods (parentId=NULL, isActive=true)
                  │
┌─────────────────┴───────────────────┐
│         User (Parent) Side           │
│  Wallet.tsx (/wallet)                │
│  Home.tsx (/) — public section       │
│  ParentStore.tsx                     │
├─────────────────────────────────────┤
│  GET  /api/public/payment-methods    │  ← PUBLIC (no auth) ★ NEW
│  GET  /api/parent/payment-methods    │  ← Auth required
│  GET  /api/store/payment-methods     │  ← Auth required (store)
│  POST /api/parent/deposit            │  ← Create deposit request
│  GET  /api/parent/deposits           │  ← View deposit history
│  GET  /api/parent/wallet             │  ← View wallet balance
└─────────────────────────────────────┘
```

---

## Flow 1: Admin Creates Payment Method

1. Admin navigates to **PaymentMethodsTab** in admin dashboard
2. Clicks **"إضافة وسيلة دفع"** (Add Payment Method)
3. Fills form: type, accountNumber, accountName, bankName, phoneNumber
4. **Valid types:** `bank_transfer`, `vodafone_cash`, `orange_money`, `etisalat_cash`, `we_pay`, `instapay`, `fawry`, `mobile_wallet`, `credit_card`, `other`
5. `POST /api/admin/payment-methods` creates with `parentId: null` (global)
6. Method immediately visible to all parents AND public visitors

### Delete Safety:
- If deposits reference the method → **soft-delete** (deactivates only)
- If no deposits reference it → **hard-delete**

---

## Flow 2: User Sees Payment Methods

### Before Login (Public — NEW):
1. Home page (`/`) fetches `GET /api/public/payment-methods`
2. Displays payment methods section below hero area
3. Shows: type, bank name, account number, account name, phone
4. No sensitive data exposed (only admin-created methods)

### After Login (Authenticated):
1. **Wallet page** (`/wallet`) fetches `GET /api/parent/payment-methods`
2. **Store checkout** fetches `GET /api/store/payment-methods`
3. Both return same data (admin-created, active methods)

---

## Flow 3: User Deposits Money

```
User → Choose Method → Enter Amount → Confirm
  ↓
POST /api/parent/deposit
  ↓
Validation:
  ✓ paymentMethodId exists & is admin-created & active
  ✓ amount > 0 and <= 100,000
  ✓ max 5 pending deposits per parent (rate limit)
  ↓
Creates deposit (status: "pending")
  ↓
Sends admin notification (priority: urgent, sound: true)
  - "محمد طلب إيداع $500 عبر تحويل بنكي"
```

### Step by Step (User):
1. Navigate to `/wallet`
2. Click **"💳 إيداع أموال"**
3. **Step 1:** Select payment method from available options
4. **Step 2:** View payment details (account number, bank, etc.)
5. Transfer money externally (bank app, vodafone cash, etc.)
6. Enter transferred amount + optional notes
7. Click **"✅ تأكيد الإيداع"**
8. System creates pending deposit + notifies admin
9. User sees deposit in history as **"قيد المراجعة"**

---

## Flow 4: Admin Reviews Deposit

```
Admin sees notification → Opens DepositsTab → Reviews deposit
  ↓
PUT /api/admin/deposits/:id  { status: "completed" | "cancelled" }
  ↓
If "completed":
  ✓ Adds amount to parent's wallet (parentWallet.balance + amount)
  ✓ Updates totalDeposited
  ✓ Sends notification: "✅ تم قبول الإيداع"
  ✓ Sets reviewedAt + completedAt
  ↓
If "cancelled":
  ✓ Sends notification: "❌ تم رفض الإيداع" + reason
  ✓ Sets reviewedAt only
  ✓ No balance change
```

### Idempotency:
- Already-completed deposits cannot be re-completed (returns 400)

---

## Flow 5: Stripe Checkout (Alternative)

For product purchases via store:

```
Parent → Store → Checkout → Stripe Session
  ↓
Webhook: checkout.session.completed
  ↓
fulfillOrder():
  - wallet_topup items → walletTransfer DEPOSIT
  - other items → entitlements
  ↓
Webhook deduplication via webhookEvents.dedupeKey
```

---

## Wallet Systems

### parentWallet (Active — Manual Deposits):
- **Table:** `parent_wallet`
- **Used by:** Deposit flow, admin point adjustments
- **Fields:** balance, totalDeposited, totalSpent
- **Managed by:** Admin deposit approval + direct adjustments

### wallets (Phase 2 — Stripe/Store):
- **Table:** `wallets`
- **Used by:** Stripe checkout, store purchases
- **Fields:** balance, currency (USD), status (active/frozen)
- **Managed by:** `ensureWallet()` + `recalcWalletBalance()`
- **Shared utility:** `server/utils/walletHelper.ts`

---

## Database Tables (Payment Related)

| Table | Key Fields | Purpose |
|-------|-----------|---------|
| `payment_settings` | paymentEnabled, gateway | Global on/off |
| `payment_methods` | parentId (null=global), type, accountNumber, isActive | Payment options |
| `deposits` | parentId, paymentMethodId, amount, status | Deposit requests |
| `parent_wallet` | parentId (unique), balance, totalDeposited, totalSpent | Simple wallet |
| `wallets` | parentId (unique), balance, currency, status | Phase 2 wallet |
| `wallet_transfers` | walletId, type, amount, reason | Transfer log |
| `store_orders` | parentId, status, totalAmount, stripeSessionId | Store orders |
| `transactions` | orderId, providerRef, idempotencyKey | Stripe transactions |

---

## Performance Improvements Applied

1. **`/api/settings` (public):** 6 sequential DB queries → `Promise.all()` (parallel)
2. **`/api/admin/settings`:** 8 sequential queries → `Promise.all()` (parallel)
3. **`/api/admin/deposits`:** Added `?status=pending&page=1&limit=50` filtering + pagination
4. **`/api/admin/wallets`:** Parallel queries + select only needed parent fields
5. **`ensureWallet()` + `recalcWalletBalance()`:** Deduplicated into shared `walletHelper.ts`
6. **`/api/public/payment-methods`:** New endpoint, no auth overhead

---

## Security Notes

- Public endpoint returns only: id, type, accountName, bankName, accountNumber, phoneNumber, isDefault
- No internal IDs or sensitive admin data exposed
- Deposit creation validates: method ownership (admin-created), active status, amount limits
- Rate limit: max 5 pending deposits per parent
- Admin deposit approval is idempotent (can't double-approve)
