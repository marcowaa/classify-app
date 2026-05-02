import crypto from "node:crypto";

export type FeatureFlagName =
  | "FF_DECISION_V2"
  | "FF_PARENT_MONETIZATION_STRICT"
  | "FF_ONBOARDING_ROUTE_MATRIX_AUDIT"
  | "FF_CAMPAIGN_CHANNEL_ENVELOPE_V2"
  | "FF_ROUTE_DUAL_PATH_TELEMETRY";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function readBoolean(name: FeatureFlagName, defaultValue: boolean): boolean {
  const raw = String(process.env[name] ?? "").trim().toLowerCase();
  if (!raw) return defaultValue;
  return TRUE_VALUES.has(raw);
}

function readInteger(name: string, defaultValue: number, min: number, max: number): number {
  const parsed = Number.parseInt(String(process.env[name] ?? ""), 10);
  if (!Number.isFinite(parsed)) return defaultValue;
  return Math.max(min, Math.min(max, parsed));
}

function readList(name: string): string[] {
  return String(process.env[name] ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function stableBucket(seed: string): number {
  const digest = crypto.createHash("sha256").update(seed).digest("hex");
  const prefix = digest.slice(0, 8);
  const value = Number.parseInt(prefix, 16);
  return value % 100;
}

export function isFeatureEnabled(name: FeatureFlagName): boolean {
  switch (name) {
    case "FF_DECISION_V2":
      return readBoolean(name, false);
    case "FF_PARENT_MONETIZATION_STRICT":
      return readBoolean(name, true);
    case "FF_ONBOARDING_ROUTE_MATRIX_AUDIT":
      return readBoolean(name, false);
    case "FF_CAMPAIGN_CHANNEL_ENVELOPE_V2":
      return readBoolean(name, false);
    case "FF_ROUTE_DUAL_PATH_TELEMETRY":
      return readBoolean(name, true);
    default:
      return false;
  }
}

export function resolveDecisionCanary(input: { actorId?: string | null; seed: string }) {
  const percent = readInteger("FF_DECISION_CANARY_PERCENT", 0, 0, 100);
  const allowList = readList("FF_DECISION_CANARY_ADMINS");
  const actorId = String(input.actorId || "").trim();
  const inAllowList = actorId.length > 0 && allowList.includes(actorId);
  const bucket = stableBucket(`${actorId || "anon"}:${input.seed}`);
  const byPercent = bucket < percent;

  return {
    percent,
    bucket,
    inAllowList,
    enabled: inAllowList || byPercent,
  };
}
