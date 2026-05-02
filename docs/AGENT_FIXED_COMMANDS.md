# Agent Fixed Commands Profile

This file defines the default command profile used for routine code edits and verification in this repository.

## Scope

- Applies to normal development changes in backend, frontend, and shared code.
- Applies before commit/push unless a task explicitly asks for a different flow.

## Primary Validation Pipeline

Run these commands in order after making code changes:

1. TypeScript check

```powershell
npx tsc --noEmit
```

2. Production build

```powershell
npx vite build
```

3. Test suite

```powershell
npm run test -- --runInBand
```

4. Runtime health check (when database is available)

```powershell
node dist/index.js
curl.exe -s -i http://127.0.0.1:5000/api/health
```

Expected health response body:

```json
{"status":"ok"}
```

## VS Code Fixed Tasks

These tasks are now available in `.vscode/tasks.json` and are the preferred fixed workflow:

- Tracked template copy: `docs/AGENT_FIXED_TASKS_TEMPLATE.json`

1. `Agent Fixed: Validate Core`
2. `Agent Fixed: DB Up`
3. Start server (`node dist/index.js`) for runtime check
4. `Agent Fixed: Health Check`
5. `Agent Fixed: DB Down`

Core task components:

- `Agent Fixed: TypeScript Check`
- `Agent Fixed: Build Production`
- `Agent Fixed: Run Tests InBand`

## Database Helper (Local Docker)

Use only when runtime validation needs PostgreSQL on localhost:5434.

Start DB:

```powershell
docker compose up -d db
```

Check status:

```powershell
docker compose ps db
```

Stop DB after verification:

```powershell
docker compose stop db
```

## Package Scripts Reference

Core scripts from package.json:

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run db:push`
- `npm run test`
- `npm run android:release:publish` (builds APK/AAB, publishes latest + archive under `/apps`)

Android release publish (Linux server):

- Default: `npm run android:release:publish`
- Skip web build/sync: `npm run android:release:publish:skip-web`
- Manual args (bash script):
	- `bash ./scripts/publish-android-release.sh --version 2.2.0 --build-number 220 --version-code 220`
	- `bash ./scripts/publish-android-release.sh --use-keystore-fallback`

Windows-only variants remain available:

- `npm run android:release:publish:win`
- `npm run android:release:publish:skip-web:win`

Android release automation optional inputs:

- `-Version` and `-BuildNumber` arguments
- `-VersionCode` argument (or `ANDROID_VERSION_CODE` env)
- Signing override env vars (optional):
- Signing override env vars (required by default in publish script):
	- `ANDROID_KEYSTORE_PATH`
	- `ANDROID_KEYSTORE_PASSWORD`
	- `ANDROID_KEY_ALIAS`
	- `ANDROID_KEY_PASSWORD`

If signing env vars are missing, the script prompts for them interactively.
Use `-UseKeystoreFallback` only if you want to explicitly allow fallback to `android/keystore.properties`.

## Safety Rules For Daily Usage

- Prefer validation commands above for every code edit.
- Do not run credentialed push/auth helper tasks unless explicitly requested.
- Keep temporary runtime processes stopped after verification.
- If health check fails due to unavailable DB, start local DB service and retry.
