#!/usr/bin/env node
/* Notification readiness check for web push + mobile push (FCM). */
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();

try {
  const dotenv = require('dotenv');
  const envPath = path.join(root, '.env');
  const envProdPath = path.join(root, '.env.production');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
  if (fs.existsSync(envProdPath)) {
    dotenv.config({ path: envProdPath, override: false });
  }
} catch {
  // dotenv is optional for this check script.
}

function isSet(name) {
  const value = process.env[name];
  return Boolean(value && String(value).trim());
}

function isLikelyLinuxDeployPath(value) {
  if (!value) return false;
  return /^\/(srv|opt|etc|var)\//.test(String(value).trim());
}

function findFileRecursively(startDir, fileName, maxDepth = 6, depth = 0) {
  if (depth > maxDepth) return null;
  if (!fs.existsSync(startDir)) return null;

  const entries = fs.readdirSync(startDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(startDir, entry.name);
    if (entry.isFile() && entry.name === fileName) return fullPath;
    if (entry.isDirectory()) {
      const nested = findFileRecursively(fullPath, fileName, maxDepth, depth + 1);
      if (nested) return nested;
    }
  }

  return null;
}

function printSection(title) {
  console.log(`\n${title}`);
}

function statusLine(ok, label, details) {
  const icon = ok ? 'OK' : 'MISSING';
  console.log(`- [${icon}] ${label}${details ? `: ${details}` : ''}`);
}

function run() {
  const strict = process.argv.includes('--strict');
  const requireIos = process.argv.includes('--require-ios') || String(process.env.NOTIFICATIONS_REQUIRE_IOS || '').toLowerCase() === 'true';

  printSection('Notifications Readiness Check');
  console.log(`- Mode: ${strict ? 'strict' : 'warn-only'}`);
  console.log(`- iOS required: ${requireIos ? 'yes' : 'no (optional)'}`);

  const vapidReady = isSet('VAPID_PUBLIC_KEY') && isSet('VAPID_PRIVATE_KEY') && isSet('VAPID_SUBJECT');
  printSection('Web Push (VAPID)');
  statusLine(isSet('VAPID_PUBLIC_KEY'), 'VAPID_PUBLIC_KEY');
  statusLine(isSet('VAPID_PRIVATE_KEY'), 'VAPID_PRIVATE_KEY');
  statusLine(isSet('VAPID_SUBJECT'), 'VAPID_SUBJECT');

  const fcmLegacyReady = isSet('FCM_SERVER_KEY');
  const fcmProjectReady = isSet('FCM_PROJECT_ID') || isSet('FIREBASE_PROJECT_ID');
  const fcmInlineServiceAccountReady = isSet('FCM_SERVICE_ACCOUNT_JSON');
  const fcmCredentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const fcmCredentialsFileReady = Boolean(
    fcmCredentialsPath && fs.existsSync(path.isAbsolute(fcmCredentialsPath) ? fcmCredentialsPath : path.join(root, fcmCredentialsPath))
  );
  const fcmRemotePathConfigured = Boolean(
    process.platform === 'win32' &&
    fcmCredentialsPath &&
    !fcmCredentialsFileReady &&
    isLikelyLinuxDeployPath(fcmCredentialsPath)
  );
  const fcmV1Ready = fcmProjectReady && (fcmInlineServiceAccountReady || fcmCredentialsFileReady || fcmRemotePathConfigured);
  const fcmReady = fcmLegacyReady || fcmV1Ready;

  printSection('Mobile Push (FCM)');
  statusLine(fcmLegacyReady, 'FCM_SERVER_KEY (legacy fallback)');
  statusLine(fcmProjectReady, 'FCM_PROJECT_ID or FIREBASE_PROJECT_ID');
  statusLine(fcmInlineServiceAccountReady, 'FCM_SERVICE_ACCOUNT_JSON');
  statusLine(fcmCredentialsFileReady, 'GOOGLE_APPLICATION_CREDENTIALS file', fcmCredentialsPath || 'not set');
  statusLine(fcmRemotePathConfigured, 'GOOGLE_APPLICATION_CREDENTIALS remote deploy path (Windows local check)', fcmRemotePathConfigured ? fcmCredentialsPath : undefined);
  statusLine(fcmV1Ready, 'FCM v1 ready');

  const androidGoogleServices = path.join(root, 'android', 'app', 'google-services.json');
  const androidReady = fs.existsSync(androidGoogleServices);
  printSection('Android Native Setup');
  statusLine(androidReady, 'android/app/google-services.json', androidReady ? androidGoogleServices : 'missing');

  const iosRoot = path.join(root, 'ios');
  const iosPlist = findFileRecursively(iosRoot, 'GoogleService-Info.plist');
  const iosReady = Boolean(iosPlist);
  printSection('iOS Native Setup');
  statusLine(fs.existsSync(iosRoot), 'ios directory');
  statusLine(iosReady, 'GoogleService-Info.plist', iosPlist || 'missing');

  printSection('Summary');
  statusLine(vapidReady, 'Web push delivery ready');
  statusLine(fcmReady, 'Mobile push delivery ready');
  statusLine(androidReady, 'Android Firebase file ready');
  statusLine(requireIos ? iosReady : true, 'iOS Firebase file ready', requireIos ? undefined : 'optional unless --require-ios or NOTIFICATIONS_REQUIRE_IOS=true');

  const missing = [];
  if (!vapidReady) missing.push('VAPID');
  if (!fcmReady) missing.push('FCM');
  if (!androidReady) missing.push('ANDROID_GOOGLE_SERVICES');
  if (requireIos && !iosReady) missing.push('IOS_GOOGLE_SERVICE_INFO');

  if (missing.length === 0) {
    if (fcmRemotePathConfigured) {
      console.log('Note: FCM credentials path points to Linux deploy target and was accepted on Windows local strict check.');
    }
    console.log('\nAll notification channels are configured.');
    process.exit(0);
  }

  console.log(`\nMissing readiness items: ${missing.join(', ')}`);
  if (strict) {
    process.exit(1);
  }

  console.log('Continuing with warnings (use --strict to fail CI).');
  process.exit(0);
}

run();
