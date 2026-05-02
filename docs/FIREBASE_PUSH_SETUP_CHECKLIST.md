# Firebase Push Setup Checklist

Use this checklist to make `npm run check-notifications:strict` pass.

## 1) Generate Web Push VAPID Keys

Run one of these:

```bash
npm run notifications:vapid
npm run notifications:vapid:write
```

If you use `notifications:vapid`, copy output values into `.env.production`:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

## 2) Configure Firebase Project (FCM v1)

In Firebase Console:

1. Open Project Settings.
2. Confirm Project ID.
3. Go to Service Accounts.
4. Generate service account key (JSON).

Set one of these in `.env.production`:

- `FCM_PROJECT_ID` + `FCM_SERVICE_ACCOUNT_JSON` (single-line JSON)
- OR `FCM_PROJECT_ID` + `GOOGLE_APPLICATION_CREDENTIALS` path

Auto-write from service account JSON:

```bash
npm run notifications:fcm:write
```

Default lookup order is:

- `GOOGLE_APPLICATION_CREDENTIALS` (if set and file exists)
- `./secure/firebase-service-account.json`
- `./secure/service-account.json`
- `./service-account.json`

You can still run directly with a custom path:

```bash
node scripts/write_fcm_env.cjs --service-account=./path/to/your-service-account.json --file=.env.production
```

## 3) Android Native File

Ensure this file exists:

- `android/app/google-services.json`

## 4) iOS Native File (only if shipping iOS)

Ensure this file exists under iOS project:

- `GoogleService-Info.plist`

## 5) Run Strict Gate

```bash
npm run check-notifications:strict
```

If iOS push is required for this release, run:

```bash
npm run check-notifications:strict -- --require-ios
```

Expected:

- No `MISSING` items.
- Exit code `0`.

## 6) Final Verification

Run full pipeline:

```bash
npx tsc --noEmit
npm run build
npm run test -- --runInBand
npm run check-notifications:strict
```

Deploy only if all pass.
