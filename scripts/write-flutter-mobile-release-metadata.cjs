#!/usr/bin/env node
// @ts-check
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/**
 * @param {string[]} argv
 * @returns {Record<string, string>}
 */
function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const cur = argv[i];
    const next = argv[i + 1];
    if (cur === "--apk-path" && next) {
      args.apkPath = next;
      i += 1;
    } else if (cur === "--aab-path" && next) {
      args.aabPath = next;
      i += 1;
    } else if (cur === "--version" && next) {
      args.version = next;
      i += 1;
    } else if (cur === "--buildNumber" && next) {
      args.buildNumber = next;
      i += 1;
    } else if (cur === "--releaseTag" && next) {
      args.releaseTag = next;
      i += 1;
    } else if (cur === "--apiBase" && next) {
      args.apiBase = next;
      i += 1;
    } else if (cur === "--output-latest-json" && next) {
      args.outputLatestJson = next;
      i += 1;
    } else if (cur === "--output-archive-json" && next) {
      args.outputArchiveJson = next;
      i += 1;
    }
  }
  return args;
}

/**
 * @param {string} filePath
 * @returns {string}
 */
function sha256(filePath) {
  const hash = crypto.createHash("sha256");
  const buf = fs.readFileSync(filePath);
  hash.update(buf);
  return hash.digest("hex");
}

/** @param {number} bytes */
function sizeLabel(bytes) {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

/**
 * @param {string} filePath
 * @returns {any|null}
 */
function safeReadJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  const sanitized = raw.replace(/^\uFEFF/, "");
  return JSON.parse(sanitized);
}

/**
 * @param {{releaseContentPath: string, latestApkName: string, latestAabName: string}} param
 * @returns {any}
 */
function buildAsoJson(param) {
  const { releaseContentPath, latestApkName, latestAabName } = param;

  const defaults = {
    copyKeys: {
      downloadTitle: "downloadApp",
      downloadDescription: "downloadAppDesc",
      screenshotsTitle: "downloadAppPage.screenshotsTitle",
      apkCta: "downloadAppPage.downloadApkCta",
      aabAriaLabel: "downloadAppPage.aabAriaLabel",
      pwaAriaLabel: "downloadAppPage.pwaZipAriaLabel",
    },
    listing: {
      storeShortDesc: "Safe kids learning app with family guidance",
      storeFullDesc:
        "Classify helps families build healthy learning habits through interactive educational activities, rewards, and family guidance tools.",
      playPromoText: "New seasonal activities and improved child progress insights.",
    },
    screenshots: [
      "/screenshots/classify/classify-1.jpeg",
      "/screenshots/classify/classify-2.jpeg",
      "/screenshots/classify/classify-3.jpeg",
      "/screenshots/classify/classify-4.jpeg",
      "/screenshots/classify/classify-5.jpeg",
    ],
    channels: {
      apk: { label: "APK", latestUrl: `/apps/${latestApkName}` },
      aab: { label: "AAB", latestUrl: `/apps/${latestAabName}` },
      pwa: { label: "PWA", latestUrl: "/apps/classify-pwa-latest.zip" },
    },
  };

  const merged = JSON.parse(JSON.stringify(defaults));

  const parsed = safeReadJson(releaseContentPath);
  if (!parsed || typeof parsed !== "object") return merged;

  if (parsed.copyKeys && typeof parsed.copyKeys === "object") {
    for (const key of Object.keys(defaults.copyKeys)) {
      const v = parsed.copyKeys[key];
      if (typeof v === "string" && v.trim()) merged.copyKeys[key] = v.trim();
    }
  }

  if (parsed.listing && typeof parsed.listing === "object") {
    for (const key of Object.keys(defaults.listing)) {
      const v = parsed.listing[key];
      if (typeof v === "string" && v.trim()) merged.listing[key] = v.trim();
    }
  }

  if (Array.isArray(parsed.screenshots)) {
    /** @type {string[]} */
    const screenshots = [];
    for (const entry of parsed.screenshots) {
      if (typeof entry === "string" && entry.trim()) screenshots.push(entry);
    }
    if (screenshots.length > 0) merged.screenshots = screenshots;
  }

  if (parsed.channels && typeof parsed.channels === "object") {
    for (const ch of Object.keys(defaults.channels)) {
      const cur = parsed.channels[ch];
      if (!cur || typeof cur !== "object") continue;
      if (typeof cur.label === "string" && cur.label.trim()) merged.channels[ch].label = cur.label.trim();
      if (typeof cur.latestUrl === "string" && cur.latestUrl.trim()) merged.channels[ch].latestUrl = cur.latestUrl.trim();
    }
  }

  return merged;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const {
    apkPath,
    aabPath,
    version,
    buildNumber,
    releaseTag,
    apiBase,
    outputLatestJson,
    outputArchiveJson,
  } = args;

  if (!apkPath) throw new Error("Missing --apk-path");
  if (!aabPath) throw new Error("Missing --aab-path");
  if (!version) throw new Error("Missing --version");
  if (!buildNumber) throw new Error("Missing --buildNumber");
  if (!releaseTag) throw new Error("Missing --releaseTag");
  if (!outputLatestJson) throw new Error("Missing --output-latest-json");
  if (!outputArchiveJson) throw new Error("Missing --output-archive-json");

  const absApk = path.resolve(apkPath);
  const absAab = path.resolve(aabPath);

  if (!fs.existsSync(absApk)) throw new Error(`APK missing: ${absApk}`);
  if (!fs.existsSync(absAab)) throw new Error(`AAB missing: ${absAab}`);

  const latestApkName = "classify-app-latest.apk";
  const latestAabName = "classify-googleplay-latest.aab";
  const versionedApkName = `classify-app-${releaseTag}.apk`;
  const versionedAabName = `classify-googleplay-${releaseTag}.aab`;

  const appsRoot = path.resolve("client/public/apps");
  const releaseContentPath = path.join(appsRoot, "release-content.json");

  const aso = buildAsoJson({
    releaseContentPath,
    latestApkName,
    latestAabName,
  });

  const apkBytes = fs.statSync(absApk).size;
  const aabBytes = fs.statSync(absAab).size;

  const apkSha = sha256(absApk);
  const aabSha = sha256(absAab);

  const generatedAt = new Date().toISOString();

  const versionCodeNum = Number(buildNumber);
  if (!Number.isFinite(versionCodeNum) || versionCodeNum <= 0) {
    throw new Error(`Invalid buildNumber for versionCode: ${buildNumber}`);
  }

  const effectiveApiBase = apiBase || "https://classi-fy.com";

  /** @type {any} */
  const metadata = {
    releaseTag,
    version,
    buildNumber: String(buildNumber),
    versionCode: versionCodeNum,
    generatedAt,
    apiBase: effectiveApiBase,
    provenance: {
      scriptPath: "scripts/write-flutter-mobile-release-metadata.cjs",
      gitCommit: "unknown",
      gitBranch: "unknown",
      signedAabVerified: true,
      versionReuseBypass: false,
      generatedAt,
    },
    aso,
    files: {
      aab: {
        archiveUrl: `/apps/archive/${versionedAabName}`,
        sha256: aabSha,
        latestUrl: `/apps/${latestAabName}`,
        size: sizeLabel(aabBytes),
        bytes: aabBytes,
        name: latestAabName,
      },
      apk: {
        archiveUrl: `/apps/archive/${versionedApkName}`,
        sha256: apkSha,
        latestUrl: `/apps/${latestApkName}`,
        size: sizeLabel(apkBytes),
        bytes: apkBytes,
        name: latestApkName,
      },
    },
  };

  fs.mkdirSync(path.dirname(outputLatestJson), { recursive: true });
  fs.mkdirSync(path.dirname(outputArchiveJson), { recursive: true });

  fs.writeFileSync(outputLatestJson, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  fs.writeFileSync(outputArchiveJson, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");

  process.stdout.write(`Wrote latest metadata: ${outputLatestJson}\n`);
  process.stdout.write(`Wrote archive metadata: ${outputArchiveJson}\n`);
}

main();
