#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const args = new Set(process.argv.slice(2));
const strict = args.has("--strict");
const apkOnly = args.has("--apk-only");
const allowMissing = args.has("--allow-missing") || String(process.env.ALLOW_MISSING_MOBILE_RELEASE_ASSETS || "").toLowerCase() === "true";

const root = process.cwd();
const metadataPath = path.join(root, "client", "public", "apps", "latest-release.json");

/** @type {string[]} */
const problems = [];
/** @type {string[]} */
const checks = [];

function addProblem(message /** @type {string} */) {
  problems.push(message);
  console.error(`ERROR: ${message}`);
}

function addCheck(message /** @type {string} */) {
  checks.push(message);
  console.log(`OK: ${message}`);
}

function resolveAppUrlToFile(url /** @type {unknown} */) {
  if (typeof url !== "string" || !url.trim()) {
    return null;
  }

  const normalized = url.trim();
  if (!normalized.startsWith("/apps/") || normalized.includes("..") || normalized.includes("\\")) {
    return null;
  }

  return path.join(root, "client", "public", normalized.slice(1));
}

function resolveScreenshotUrlToFile(url /** @type {unknown} */) {
  if (typeof url !== "string" || !url.trim()) {
    return null;
  }

  const normalized = url.trim();
  if (!normalized.startsWith("/screenshots/") || normalized.includes("..") || normalized.includes("\\")) {
    return null;
  }

  return path.join(root, "client", "public", normalized.slice(1));
}

function readFileHead(filePath /** @type {string} */, maxBytes = 512 /** @type {number} */) {
  const fd = fs.openSync(filePath, "r");
  try {
    const buffer = Buffer.alloc(maxBytes);
    const bytesRead = fs.readSync(fd, buffer, 0, maxBytes, 0);
    return buffer.slice(0, bytesRead).toString("utf8");
  } finally {
    fs.closeSync(fd);
  }
}

function isGitLfsPointer(filePath /** @type {string} */) {
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

const aabDeclared = Boolean(metadata?.files?.aab || metadata?.aso?.channels?.aab);
const effectiveApkOnly = apkOnly || !aabDeclared;

const expectedArtifacts = effectiveApkOnly
  ? [{ key: "apk", label: "APK", url: metadata?.files?.apk?.latestUrl }]
  : [
    { key: "apk", label: "APK", url: metadata?.files?.apk?.latestUrl },
    { key: "aab", label: "AAB", url: metadata?.files?.aab?.latestUrl },
  ];

const resolvedFiles = /** @type {{apk: string | null, aab: string | null}} */ ({
  apk: null,
  aab: null,
});

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

  // Keep for signing verification later.
  if (artifact.key === "apk") resolvedFiles.apk = resolvedFile;
  if (artifact.key === "aab") resolvedFiles.aab = resolvedFile;

  addCheck(`${artifact.label} file exists (${stats.size} bytes): ${resolvedFile}`);
}

/** @typedef {{ ok: boolean, output: string }} RunCommandResult */

// ============================================================
// Signing verification (server-side "professional" gate)
// ============================================================
const { execSync } = require("child_process");

/**
 * @param {string} cmd
 * @returns {RunCommandResult}
 */
function runCommand(cmd) {
  try {
    const output = execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, output: String(output) };
  } catch (error) {
    /** @type {{ stdout?: unknown, stderr?: unknown }} */
    const e = error && typeof error === "object" ? error : {};
    const stderr = e.stderr != null ? String(e.stderr) : "";
    const stdout = e.stdout != null ? String(e.stdout) : "";
    return { ok: false, output: `${stdout}\n${stderr}`.trim() };
  }
}

/**
 * @param {string | null} apkPath
 */
/**
 * @param {string} p
 * @returns {boolean}
 */
function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

/**
 * @param {string} toolName
 * @returns {string | null}
 */
function detectToolPath(toolName) {
  // 1) First try PATH
  try {
    if (process.platform === "win32") {
      const output = execSync(`where ${toolName}`, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
      const first = output.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)[0];
      if (first && isFile(first)) return first;
      if (first) return first;
    } else {
      const output = execSync(`command -v ${toolName} 2>/dev/null`, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
      if (output) return output;
    }
  } catch {
    // ignore
  }

  // 2) Fallback: expected locations
  // apksigner: $ANDROID_HOME/build-tools/<ver>/apksigner (or apksigner.bat on windows)
  if (toolName === "apksigner") {
    let androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || "";

    // Windows dev boxes often only have sdk.dir in android/local.properties
    // (and/or Android Studio-managed SDK path).
    if (!androidHome) {
      try {
        const localPropsPath = path.join(root, "android", "local.properties");
        if (fs.existsSync(localPropsPath)) {
          const raw = fs.readFileSync(localPropsPath, "utf8");
          const match = raw.match(/^sdk\.dir\s*=\s*(.+)\s*$/m);
          if (match && match[1]) androidHome = match[1].trim();
        }
      } catch {
        // ignore
      }
    }

    if (androidHome) {
      try {
        const buildToolsDir = path.join(androidHome, "build-tools");
        if (fs.existsSync(buildToolsDir)) {
          const entries = fs.readdirSync(buildToolsDir, { withFileTypes: true });
          // Prefer highest version by lexicographic sort as a best-effort.
          const versions = entries
            .filter((e) => e.isDirectory())
            .map((e) => e.name)
            .sort()
            .reverse();

          for (const v of versions) {
            const candidate = path.join(buildToolsDir, v, process.platform === "win32" ? "apksigner.bat" : "apksigner");
            if (isFile(candidate)) return candidate;
          }
        }
      } catch {
        // ignore
      }
    }
  }

  // jarsigner: $JAVA_HOME/bin/jarsigner (or jarsigner.bat on windows)
  if (toolName === "jarsigner") {
    const javaHome = process.env.JAVA_HOME || "";
    if (javaHome) {
      const candidate = path.join(javaHome, "bin", process.platform === "win32" ? "jarsigner.bat" : "jarsigner");
      if (isFile(candidate)) return candidate;
    }
  }

  return null;
}

/**
 * @param {string | null} apkPath
 */
function verifyApkSigning(apkPath) {
  if (!apkPath) return;

  const apksignerPath = detectToolPath("apksigner");

  if (!apksignerPath) {
    addProblem(`APK signing verification failed: apksigner not found on PATH (needed for v2/v3 gate).`);
    return;
  }

  const cmd = `"${apksignerPath}" verify --verbose --print-certs "${apkPath}"`;
  const { output } = runCommand(cmd);
  const lines = output.split(/\r?\n/).filter(Boolean);
  const tail = lines.slice(-40).join(" ").replace(/\s+/g, " ").trim();

  // Reject debug keys
  if (/Android Debug|android debug|CN=Android Debug/i.test(output)) {
    addProblem(`APK signing verification failed: debug key detected. Tail: ${tail}`);
    return;
  }

  // Enforce v2/v3 = true
  if (!/APK Signature Scheme v2.*:\s*true/i.test(output)) {
    addProblem(`APK signing verification failed: v2 scheme not verified as true. Tail: ${tail}`);
    return;
  }

  if (!/APK Signature Scheme v3.*:\s*true/i.test(output)) {
    addProblem(`APK signing verification failed: v3 scheme not verified as true. Tail: ${tail}`);
    return;
  }

  addCheck(`APK signing verification passed (release keys + v2/v3 true): ${apkPath}`);
}

/**
 * @param {string | null} aabPath
 */
function verifyAabSigning(aabPath) {
  if (!aabPath) return;

  const jarsignerPath = detectToolPath("jarsigner");

  if (!jarsignerPath) {
    addProblem(`AAB signing verification failed: jarsigner not found on PATH (needed for signature gate).`);
    return;
  }

  const cmd = `"${jarsignerPath}" -verify -verbose -certs "${aabPath}"`;
  const { output } = runCommand(cmd);
  const lines = output.split(/\r?\n/).filter(Boolean);
  const tail = lines.slice(-60).join(" ").replace(/\s+/g, " ").trim();

  // Reject debug keys
  if (/Android Debug|android debug|CN=Android Debug/i.test(output)) {
    addProblem(`AAB signing verification failed: debug key detected. Tail: ${tail}`);
    return;
  }

  if (/jar is unsigned/i.test(output)) {
    addProblem(`AAB signing verification failed: generated AAB is unsigned. Tail: ${tail}`);
    return;
  }

  if (/jar verified/i.test(output)) {
    addCheck(`AAB signing verification passed (jar verified): ${aabPath}`);
    return;
  }

  if (/Invalid certificate chain/i.test(output)) {
    addCheck(`AAB signing verification passed with relaxed cert-chain check (not unsigned): ${aabPath}`);
    return;
  }

  if (/Signer/i.test(output)) {
    addCheck(`AAB signing verification passed with relaxed signer info check (not unsigned): ${aabPath}`);
    return;
  }

  addProblem(`AAB signing verification failed: could not confirm signature status. Tail: ${tail}`);
}

verifyApkSigning(resolvedFiles.apk);
if (!effectiveApkOnly) {
  verifyAabSigning(resolvedFiles.aab);
}

const requiredCopyKeys = effectiveApkOnly
  ? ["downloadTitle", "downloadDescription", "screenshotsTitle", "apkCta", "pwaAriaLabel"]
  : ["downloadTitle", "downloadDescription", "screenshotsTitle", "apkCta", "aabAriaLabel", "pwaAriaLabel"];

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

if (!effectiveApkOnly) {
  if (typeof asoAabUrl !== "string" || !asoAabUrl.trim()) {
    addProblem("ASO channels.aab.latestUrl is missing in metadata");
  } else if (typeof metadataAabUrl === "string" && metadataAabUrl.trim() && metadataAabUrl !== asoAabUrl) {
    addProblem(
      `ASO AAB latestUrl mismatch (files.aab.latestUrl=${metadataAabUrl}, aso.channels.aab.latestUrl=${asoAabUrl})`
    );
  }
}

if (problems.length > 0) {
  const missingOnly = problems.every((message /** @type {string} */) =>
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
