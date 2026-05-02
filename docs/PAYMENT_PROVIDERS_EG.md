# Egypt Payment Providers Integration Map

## What was implemented

1. Dynamic provider fields in Admin payment methods form.
2. Provider adapter pattern in backend for redirect/callback flow.
3. Generic callback routes:
- `POST /api/payments/:provider/callback`
- `GET /api/payments/:provider/return`

## Implemented adapters (production wired)

1. `paysky`
- Type: Hosted checkout / API
- Required fields: `payskyMID`, `payskyTID`, `payskySecretKey`, `payskyCheckoutUrl`
- Checkout flow: redirect URL generated server-side
- Callback/return: generic provider routes

2. `paymob`
- Type: Hosted checkout / API
- Required fields: `paymobApiKey`, `paymobSecretKey`, `paymobIntegrationId`
- Optional fields: `paymobIframeId`, `paymobPublicKey`, `paymobCheckoutUrl`
- Checkout flow: redirect URL generated server-side
- Callback/return: generic provider routes

3. `fawry`
- Type: Hosted checkout / REST API
- Required fields: `fawryMerchantCode`, `fawrySecureKey`
- Optional fields: `fawryCallbackUrl`, `fawryCheckoutUrl`
- Checkout flow: redirect URL generated server-side
- Callback/return: generic provider routes

## Configured provider list in Admin UI

The following providers are available as selectable payment types and each one has dedicated fields in Admin:

- `paysky`
- `paymob`
- `fawry`
- `aman`
- `masary`
- `bee`
- `khales`
- `valu`
- `sympl`
- `forsa`
- `contact_nowpay`
- `meeza`
- `nbe_accept`
- `banque_misr_gateway`
- `cib_accept`
- `vodafone_cash`
- `orange_money`
- `etisalat_cash`
- `we_pay`
- `instapay`
- `mobile_wallet`
- `bank_transfer`
- `credit_card`
- `paypal`
- `stripe`
- `other`

## Provider field policy

The admin form shows only fields required by the selected provider.

- This behavior is in `client/src/components/admin/PaymentMethodsTab.tsx`.
- Field data is saved in `payment_methods.gateway_config` JSON.

## Environment fallback keys

Used if checkout URL is not set in `gateway_config`:

- `PAYSKY_CHECKOUT_URL`
- `PAYMOB_CHECKOUT_URL`
- `FAWRY_CHECKOUT_URL`

Base URL for callback/return URL generation:

- `PUBLIC_APP_URL` or
- `APP_BASE_URL` or
- `PUBLIC_BASE_URL`

## Callback/return format notes

All provider callbacks update purchase payment state:

- success -> `parent_purchases.payment_status = paid`
- failure -> `parent_purchases.payment_status = failed`

Then parent owned products are activated on paid status.

## Security hardening rules (implemented)

1. Callback state validation is strict and fail-closed.
- Callback must include signed `state` claims (`provider`, `methodId`, `parentId`).
- Provider in route must match provider in signed state.
- Purchase in callback must match purchase in signed state.

2. Callback signature verification is mandatory before any status transition.
- `POST /api/payments/:provider/callback` will reject unverified callbacks.
- No `paid` or `failed` transition is applied unless callback signature verification succeeds.
- Current verification:
	- `paysky`: provider HMAC verification.
	- other providers: configurable generic HMAC fallback via `callbackSecret`/`webhookSecret`/`secretKey`.

3. Callback is bound to real purchase ownership.
- Purchase parent must match `parentId` from signed state.
- `methodId` from signed state must exist and belong to the same provider.

4. Payment status transitions are idempotent and guarded.
- Only `pending -> paid` or `pending -> failed` transitions are allowed.
- Replayed callbacks do not re-apply side effects.

5. Browser return route does not mutate payment state.
- `GET /api/payments/:provider/return` is display-only redirect.
- Final status change is callback-driven after signature verification.

6. No library sale points on unpaid gateway orders.
- For external gateway flows, library sale activity points are not granted during checkout creation.
- Library sale points are granted only after payment is confirmed as `paid`.

## Recommended go-live checklist per provider

1. Confirm merchant credentials from provider onboarding email.
2. Configure checkout URL in Admin method config.
3. Register callback URL at provider side: `https://YOUR_DOMAIN/api/payments/<provider>/callback`.
4. Register return URL at provider side: `https://YOUR_DOMAIN/api/payments/<provider>/return`.
5. Run one sandbox payment then one production low-value payment.
6. Verify order status transitions to `paid` and product activation occurs.
