import {
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_STYLES,
  type NotificationPriority,
  type NotificationStyle,
} from "../../shared/notificationTypes";
import { isFeatureEnabled, resolveDecisionCanary } from "./featureFlags";

type DeliveryChannel = "in_app" | "web_push" | "mobile_push" | "email";
export type CampaignDeliveryStrength = "quiet" | "popup" | "strong";

export type CampaignDeliveryFrequencyPolicy = {
  cooldownMinutes: number;
  maxPerDay: number;
  sessionWindowMinutes: number;
  maxPerSessionWindow: number;
};

const CAMPAIGN_FREQUENCY_POLICY: Record<CampaignDeliveryStrength, CampaignDeliveryFrequencyPolicy> = {
  quiet: {
    cooldownMinutes: 120,
    maxPerDay: 3,
    sessionWindowMinutes: 180,
    maxPerSessionWindow: 2,
  },
  popup: {
    cooldownMinutes: 360,
    maxPerDay: 2,
    sessionWindowMinutes: 360,
    maxPerSessionWindow: 1,
  },
  strong: {
    cooldownMinutes: 720,
    maxPerDay: 1,
    sessionWindowMinutes: 720,
    maxPerSessionWindow: 1,
  },
};

export type CampaignDeliveryProfile = {
  style: NotificationStyle;
  priority: NotificationPriority;
  channels: DeliveryChannel[];
  soundAlert: boolean;
  strength: CampaignDeliveryStrength;
};

export function resolveCampaignFrequencyPolicy(strength: CampaignDeliveryStrength): CampaignDeliveryFrequencyPolicy {
  return CAMPAIGN_FREQUENCY_POLICY[strength] || CAMPAIGN_FREQUENCY_POLICY.quiet;
}

function normalizeCampaignPriority(raw: unknown): number {
  const parsed = Number.parseInt(String(raw ?? 0), 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(10, Math.max(0, parsed));
}

function resolveV1Profile(priority: number): CampaignDeliveryProfile {
  if (priority >= 8) {
    return {
      style: NOTIFICATION_STYLES.MODAL,
      priority: NOTIFICATION_PRIORITIES.URGENT,
      channels: ["in_app", "web_push", "mobile_push"],
      soundAlert: true,
      strength: "strong",
    };
  }

  if (priority >= 4) {
    return {
      style: NOTIFICATION_STYLES.TOAST,
      priority: NOTIFICATION_PRIORITIES.WARNING,
      channels: ["in_app", "web_push", "mobile_push"],
      soundAlert: true,
      strength: "popup",
    };
  }

  return {
    style: NOTIFICATION_STYLES.TOAST,
    priority: NOTIFICATION_PRIORITIES.NORMAL,
    channels: ["in_app"],
    soundAlert: false,
    strength: "quiet",
  };
}

function resolveV2Profile(priority: number): CampaignDeliveryProfile {
  if (priority >= 8) {
    return {
      style: NOTIFICATION_STYLES.MODAL,
      priority: NOTIFICATION_PRIORITIES.URGENT,
      channels: ["in_app", "web_push", "mobile_push", "email"],
      soundAlert: true,
      strength: "strong",
    };
  }

  if (priority >= 4) {
    return {
      style: NOTIFICATION_STYLES.BANNER,
      priority: NOTIFICATION_PRIORITIES.WARNING,
      channels: ["in_app", "web_push", "mobile_push"],
      soundAlert: true,
      strength: "popup",
    };
  }

  return {
    style: NOTIFICATION_STYLES.TOAST,
    priority: NOTIFICATION_PRIORITIES.NORMAL,
    channels: ["in_app"],
    soundAlert: false,
    strength: "quiet",
  };
}

export function resolveCampaignDeliveryDecision(input: {
  priorityRaw: unknown;
  actorId?: string | null;
  seed: string;
}) {
  const normalizedPriority = normalizeCampaignPriority(input.priorityRaw);
  const v1 = resolveV1Profile(normalizedPriority);
  const v2 = resolveV2Profile(normalizedPriority);

  const canary = resolveDecisionCanary({
    actorId: input.actorId,
    seed: input.seed,
  });

  const v2FlagEnabled = isFeatureEnabled("FF_DECISION_V2") && isFeatureEnabled("FF_CAMPAIGN_CHANNEL_ENVELOPE_V2");
  const useV2 = v2FlagEnabled && canary.enabled;
  const selected = useV2 ? v2 : v1;
  const frequencyPolicy = resolveCampaignFrequencyPolicy(selected.strength);

  const dualPathTelemetry = isFeatureEnabled("FF_ROUTE_DUAL_PATH_TELEMETRY");
  const differs =
    v1.style !== v2.style ||
    v1.priority !== v2.priority ||
    v1.soundAlert !== v2.soundAlert ||
    v1.channels.join(",") !== v2.channels.join(",");

  return {
    selected,
    normalizedPriority,
    pathVersion: useV2 ? "v2" : "v1",
    canary,
    dualPathTelemetry,
    differs,
    v1,
    v2,
    frequencyPolicy,
  };
}
