const CAMPAIGN_ATTRIBUTION_KEY = "campaignAttribution";
const CAMPAIGN_ATTRIBUTION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface CampaignAttributionData {
  sourceAdId?: string;
  promoProductId?: string;
  savedAt: number;
}

const normalizeText = (value: unknown): string => String(value || "").trim();

export function clearCampaignAttribution(): void {
  localStorage.removeItem(CAMPAIGN_ATTRIBUTION_KEY);
}

export function saveCampaignAttribution(payload: {
  sourceAdId?: string | null;
  promoProductId?: string | null;
}): void {
  const sourceAdId = normalizeText(payload.sourceAdId);
  const promoProductId = normalizeText(payload.promoProductId);

  if (!sourceAdId && !promoProductId) {
    clearCampaignAttribution();
    return;
  }

  const data: CampaignAttributionData = {
    sourceAdId: sourceAdId || undefined,
    promoProductId: promoProductId || undefined,
    savedAt: Date.now(),
  };

  localStorage.setItem(CAMPAIGN_ATTRIBUTION_KEY, JSON.stringify(data));
}

export function readCampaignAttribution(): CampaignAttributionData | null {
  const raw = localStorage.getItem(CAMPAIGN_ATTRIBUTION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<CampaignAttributionData>;
    const savedAt = Number(parsed.savedAt || 0);
    if (!Number.isFinite(savedAt) || savedAt <= 0 || Date.now() - savedAt > CAMPAIGN_ATTRIBUTION_MAX_AGE_MS) {
      clearCampaignAttribution();
      return null;
    }

    const sourceAdId = normalizeText(parsed.sourceAdId);
    const promoProductId = normalizeText(parsed.promoProductId);
    if (!sourceAdId && !promoProductId) {
      clearCampaignAttribution();
      return null;
    }

    return {
      sourceAdId: sourceAdId || undefined,
      promoProductId: promoProductId || undefined,
      savedAt,
    };
  } catch {
    clearCampaignAttribution();
    return null;
  }
}
