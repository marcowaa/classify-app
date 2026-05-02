#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const args = new Set(process.argv.slice(2));
const strict = args.has("--strict");
const allowMissing = args.has("--allow-missing") || String(process.env.ALLOW_MISSING_MOBILE_RELEASE_ASSETS || "").toLowerCase() === "true";

const root = process.cwd();
const metadataPath = path.join(root, "client", "public", "apps", "latest-release.json");

const problems = [];
const checks = [];

function addProblem(message) {
  problems.push(message);
  console.error(`ERROR: ${message}`);
}

function addCheck(message) {
  checks.push(message);
  console.log(`OK: ${message}`);
}

function resolveAppUrlToFile(url) {
  if (typeof url !== "string" || !url.trim()) {
    return null;
  }

  const normalized = url.trim();
  if (!normalized.startsWith("/apps/") || normalized.includes("..") || normalized.includes("\\")) {
    return null;
  }

  return path.join(root, "client", "public", normalized.slice(1));
}

function resolveScreenshotUrlToFile(url) {
  if (typeof url !== "string" || !url.trim()) {
    return null;
  }

  const normalized = url.trim();
  if (!normalized.startsWith("/screenshots/") || normalized.includes("..") || normalized.includes("\\")) {
    return null;
  }

  return path.join(root, "client", "public", normalized.slice(1));
}

function readFileHead(filePath, maxBytes = 512) {
  const fd = fs.openSync(filePath, "r");
  try {
    const buffer = Buffer.alloc(maxBytes);
    const bytesRead = fs.readSync(fd, buffer, 0, maxBytes, 0);
    return buffer.slice(0, bytesRead).toString("utf8");
  } finally {
    fs.closeSync(fd);
  }
}

function isGitLfsPointer(filePath) {
  try {
    const head = readFileHead(filePath, 512);
    return (
      head.startsWith("version https://git-lfs.github.com/spec/v1") &&
      /oid sha256:[0-9a-f]{64}/.test(head) &&
      /\nsize \d+/.test(head)
    );
  } catch {
    return false;
  }
}

if (!fs.existsSync(metadataPath)) {
  addProblem(`Missing metadata file: ${metadataPath}`);
} else {
  addCheck(`Metadata exists: ${metadataPath}`);
}

let metadata = null;
if (fs.existsSync(metadataPath)) {
  try {
    const raw = fs.readFileSync(metadataPath, "utf8");
    const sanitized = raw.replace(/^\uFEFF/, "");
    metadata = JSON.parse(sanitized);
  } catch (error) {
    addProblem(`Invalid JSON in latest-release.json: ${error.message}`);
  }
}

const expectedArtifacts = [
  { key: "apk", label: "APK", url: metadata?.files?.apk?.latestUrl },
  { key: "aab", label: "AAB", url: metadata?.files?.aab?.latestUrl },
];

for (const artifact of expectedArtifacts) {
  if (typeof artifact.url !== "string" || !artifact.url.trim()) {
    addProblem(`${artifact.label} latestUrl is missing in metadata`);
    continue;
  }

  const resolvedFile = resolveAppUrlToFile(artifact.url);
  if (!resolvedFile) {
    addProblem(`${artifact.label} latestUrl must start with /apps/: ${artifact.url}`);
    continue;
  }

  if (!fs.existsSync(resolvedFile)) {
    addProblem(`${artifact.label} file not found: ${resolvedFile}`);
    continue;
  }

  const stats = fs.statSync(resolvedFile);
  if (!stats.isFile()) {
    addProblem(`${artifact.label} path is not a file: ${resolvedFile}`);
    continue;
  }

  if (stats.size <= 0) {
    addProblem(`${artifact.label} file is empty: ${resolvedFile}`);
    continue;
  }

  if (isGitLfsPointer(resolvedFile)) {
    addProblem(
      `${artifact.label} file is a Git LFS pointer (not a real binary): ${resolvedFile}. Run git lfs pull before deployment.`
    );
    continue;
  }

  addCheck(`${artifact.label} file exists (${stats.size} bytes): ${resolvedFile}`);
}

const requiredCopyKeys = [
  "downloadTitle",
  "downloadDescription",
  "screenshotsTitle",
  "apkCta",
  "aabAriaLabel",
  "pwaAriaLabel",
];

for (const key of requiredCopyKeys) {
  const value = metadata?.aso?.copyKeys?.[key];
  if (typeof value !== "string" || !value.trim()) {
    addProblem(`ASO copyKeys.${key} is missing in metadata`);
  }
}

const screenshotList = metadata?.aso?.screenshots;
if (!Array.isArray(screenshotList) || screenshotList.length === 0) {
  addProblem("ASO screenshots list is missing in metadata");
} else {
  screenshotList.forEach((entry, index) => {
    if (typeof entry !== "string" || !entry.trim()) {
      addProblem(`ASO screenshot at index ${index} is invalid`);
      return;
    }

    const resolvedScreenshot = resolveScreenshotUrlToFile(entry);
    if (!resolvedScreenshot) {
      addProblem(`ASO screenshot path must start with /screenshots/: ${entry}`);
      return;
    }

    if (!fs.existsSync(resolvedScreenshot)) {
      addProblem(`ASO screenshot file not found: ${resolvedScreenshot}`);
      return;
    }

    const stats = fs.statSync(resolvedScreenshot);
    if (!stats.isFile() || stats.size <= 0) {
      addProblem(`ASO screenshot is invalid or empty: ${resolvedScreenshot}`);
      return;
    }

    addCheck(`ASO screenshot exists (${stats.size} bytes): ${resolvedScreenshot}`);
  });
}

const metadataApkUrl = metadata?.files?.apk?.latestUrl;
const metadataAabUrl = metadata?.files?.aab?.latestUrl;
const asoApkUrl = metadata?.aso?.channels?.apk?.latestUrl;
const asoAabUrl = metadata?.aso?.channels?.aab?.latestUrl;

if (typeof asoApkUrl !== "string" || !asoApkUrl.trim()) {
  addProblem("ASO channels.apk.latestUrl is missing in metadata");
} else if (typeof metadataApkUrl === "string" && metadataApkUrl.trim() && metadataApkUrl !== asoApkUrl) {
  addProblem(`ASO APK latestUrl mismatch (files.apk.latestUrl=${metadataApkUrl}, aso.channels.apk.latestUrl=${asoApkUrl})`);
}

if (typeof asoAabUrl !== "string" || !asoAabUrl.trim()) {
  addProblem("ASO channels.aab.latestUrl is missing in metadata");
} else if (typeof metadataAabUrl === "string" && metadataAabUrl.trim() && metadataAabUrl !== asoAabUrl) {
  addProblem(`ASO AAB latestUrl mismatch (files.aab.latestUrl=${metadataAabUrl}, aso.channels.aab.latestUrl=${asoAabUrl})`);
}

if (problems.length > 0) {
  const missingOnly = problems.every((message) =>
    message.includes("file not found") ||
    message.includes("latestUrl is missing") ||
    message.includes("Missing metadata file")
  );

  if (allowMissing && missingOnly) {
    console.warn("\nWARN: Missing mobile release artifacts were allowed by override.");
    process.exit(0);
  }

  console.error(`\nRelease asset check finished with ${problems.length} issue(s).`);
  if (strict) {
    process.exit(1);
  }
  process.exit(0);
}

console.log("\nRelease asset check passed with no issues.");
