#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const PROFILE_PRESETS = {
  balanced: {
    NODE_CLUSTER_ENABLED: "true",
    WEB_CONCURRENCY: "4",
    DB_POOL_MAX: "50",
    DB_POOL_MIN: "5",
    DB_POOL_IDLE_TIMEOUT_MS: "30000",
    DB_POOL_CONNECT_TIMEOUT_MS: "10000",
  },
  "high-throughput": {
    NODE_CLUSTER_ENABLED: "true",
    WEB_CONCURRENCY: "6",
    DB_POOL_MAX: "70",
    DB_POOL_MIN: "8",
    DB_POOL_IDLE_TIMEOUT_MS: "30000",
    DB_POOL_CONNECT_TIMEOUT_MS: "10000",
  },
};

function printUsage() {
  console.log("Usage: node scripts/switch-capacity-profile.cjs <balanced|high-throughput> [env-file]");
  console.log("Example: node scripts/switch-capacity-profile.cjs balanced .env");
}

function setEnvValue(content, key, value) {
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(content)) {
    return content.replace(regex, `${key}=${value}`);
  }

  const endsWithNewline = content.endsWith("\n");
  return `${content}${endsWithNewline ? "" : "\n"}${key}=${value}\n`;
}

function run() {
  const profileArg = process.argv[2];
  const envFileArg = process.argv[3] || ".env";

  if (!profileArg || !PROFILE_PRESETS[profileArg]) {
    console.error("❌ Invalid or missing profile.");
    printUsage();
    process.exit(1);
  }

  const envFile = path.resolve(process.cwd(), envFileArg);
  if (!fs.existsSync(envFile)) {
    console.error(`❌ Env file not found: ${envFile}`);
    process.exit(1);
  }

  const selectedProfile = PROFILE_PRESETS[profileArg];
  const original = fs.readFileSync(envFile, "utf8");
  let updated = original;

  for (const [key, value] of Object.entries(selectedProfile)) {
    updated = setEnvValue(updated, key, value);
  }

  fs.writeFileSync(envFile, updated, "utf8");

  console.log(`✅ Capacity profile applied: ${profileArg}`);
  console.log(`📄 Updated file: ${envFileArg}`);
  for (const [key, value] of Object.entries(selectedProfile)) {
    console.log(`  - ${key}=${value}`);
  }
}

run();
