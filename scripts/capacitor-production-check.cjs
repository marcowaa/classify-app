#!/usr/bin/env node
// @ts-nocheck

const fs = require("node:fs");
const path = require("node:path");

const args = new Set(process.argv.slice(2));
const strict = args.has("--strict");

const root = process.cwd();

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

const capConfigPath = path.join(root, "capacitor.config.json");
const capConfig = readJson(capConfigPath);
expect(!!capConfig, "Missing or invalid capacitor.config.json");

if (capConfig) {
  expect(capConfig.appId === "com.classi_fy.twa", "Unexpected appId in capacitor config");
  expect(capConfig.webDir === "dist/public", "webDir must be dist/public for release assets");

  const server = capConfig.server || {};
  if (server.url) {
    expect(typeof server.url === "string" && server.url.startsWith("https://"), "server.url must be HTTPS");
  }
  expect(server.cleartext === false, "server.cleartext must be false");

  const android = capConfig.android || {};
  expect(android.allowMixedContent === false, "android.allowMixedContent must be false");
  expect(android.webContentsDebuggingEnabled === false, "android.webContentsDebuggingEnabled must be false");
}

const distIndexPath = path.join(root, "dist", "public", "index.html");
if (!fs.existsSync(distIndexPath)) {
  const message = "dist/public/index.html not found. Run npm run build before publishing android release.";
  if (strict) {
    fail(message);
  } else {
    warn(message);
  }
}

const manifestPath = path.join(root, "android", "app", "src", "main", "AndroidManifest.xml");
const manifest = readText(manifestPath);
expect(manifest.length > 0, "Missing AndroidManifest.xml");
if (manifest) {
  expect(manifest.includes('android:allowBackup="false"'), "AndroidManifest must set allowBackup=false");
  expect(manifest.includes('android:usesCleartextTraffic="false"'), "AndroidManifest must set usesCleartextTraffic=false");
  expect(manifest.includes('android:networkSecurityConfig="@xml/network_security_config"'), "AndroidManifest must reference network_security_config");
}

const networkConfigPath = path.join(root, "android", "app", "src", "main", "res", "xml", "network_security_config.xml");
const networkConfig = readText(networkConfigPath);
expect(networkConfig.length > 0, "Missing network_security_config.xml");
if (networkConfig) {
  expect(networkConfig.includes('cleartextTrafficPermitted="false"'), "Network security config must deny cleartext traffic");
}

const gradlePath = path.join(root, "android", "app", "build.gradle");
const gradle = readText(gradlePath);
expect(gradle.length > 0, "Missing android/app/build.gradle");
if (gradle) {
  expect(gradle.includes("minifyEnabled true"), "Release build must enable minifyEnabled");
  expect(gradle.includes("shrinkResources true"), "Release build must enable shrinkResources");
  expect(gradle.includes("debuggable false"), "Release build must disable debuggable");
  expect(gradle.includes("jniDebuggable false"), "Release build must disable jniDebuggable");
}

const releaseApkPath = path.join(root, "android", "app", "build", "outputs", "apk", "release", "app-release.apk");
if (!fs.existsSync(releaseApkPath)) {
  warn("No release APK found yet. Build with publish script to verify signed artifacts.");
} else {
  const stats = fs.statSync(releaseApkPath);
  if (stats.size < 1024 * 1024) {
    fail("Release APK size looks invalid (<1MB). Check Android release build output.");
  }
}

if (warnings.length > 0) {
  console.log("[capacitor-prod-check] Warnings:");
  for (const message of warnings) {
    console.log(` - ${message}`);
  }
}

if (failures.length > 0) {
  console.error("[capacitor-prod-check] Failed checks:");
  for (const message of failures) {
    console.error(` - ${message}`);
  }
  process.exit(1);
}

console.log("[capacitor-prod-check] All production checks passed.");
