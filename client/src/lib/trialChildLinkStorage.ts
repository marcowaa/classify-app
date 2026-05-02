const TRIAL_CHILD_LINK_URL_KEY = "trialChildLinkUrl";
const TRIAL_CHILD_TOKEN_KEY = "trialChildToken";
const TRIAL_CHILD_SHARE_CODE_KEY = "trialChildShareCode";
const TRIAL_CHILD_QR_CODE_URL_KEY = "trialChildQrCodeUrl";
const TRIAL_CHILD_LINK_SAVED_AT_KEY = "trialChildLinkSavedAt";

const TEMP_LINK_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface TrialChildLinkData {
  trialChildLinkUrl?: string;
  trialChildToken?: string;
  shareCode?: string;
  trialChildQrCodeUrl?: string;
}

const getSafeString = (value: unknown): string => String(value || "").trim();

const hasAnyLinkData = (data: TrialChildLinkData): boolean => {
  return Boolean(data.trialChildLinkUrl || data.trialChildToken || data.shareCode || data.trialChildQrCodeUrl);
};

export const clearTrialChildLinkData = (): void => {
  localStorage.removeItem(TRIAL_CHILD_LINK_URL_KEY);
  localStorage.removeItem(TRIAL_CHILD_TOKEN_KEY);
  localStorage.removeItem(TRIAL_CHILD_SHARE_CODE_KEY);
  localStorage.removeItem(TRIAL_CHILD_QR_CODE_URL_KEY);
  localStorage.removeItem(TRIAL_CHILD_LINK_SAVED_AT_KEY);
};

export const saveTrialChildLinkData = (payload: TrialChildLinkData): void => {
  const data: TrialChildLinkData = {
    trialChildLinkUrl: getSafeString(payload.trialChildLinkUrl) || undefined,
    trialChildToken: getSafeString(payload.trialChildToken) || undefined,
    shareCode: getSafeString(payload.shareCode) || undefined,
    trialChildQrCodeUrl: getSafeString(payload.trialChildQrCodeUrl) || undefined,
  };

  if (!hasAnyLinkData(data)) {
    clearTrialChildLinkData();
    return;
  }

  if (data.trialChildLinkUrl) localStorage.setItem(TRIAL_CHILD_LINK_URL_KEY, data.trialChildLinkUrl);
  if (data.trialChildToken) localStorage.setItem(TRIAL_CHILD_TOKEN_KEY, data.trialChildToken);
  if (data.shareCode) localStorage.setItem(TRIAL_CHILD_SHARE_CODE_KEY, data.shareCode);
  if (data.trialChildQrCodeUrl) localStorage.setItem(TRIAL_CHILD_QR_CODE_URL_KEY, data.trialChildQrCodeUrl);
  localStorage.setItem(TRIAL_CHILD_LINK_SAVED_AT_KEY, String(Date.now()));
};

export const readTrialChildLinkData = (): TrialChildLinkData | null => {
  const savedAt = Number(localStorage.getItem(TRIAL_CHILD_LINK_SAVED_AT_KEY) || 0);
  if (Number.isFinite(savedAt) && savedAt > 0 && Date.now() - savedAt > TEMP_LINK_MAX_AGE_MS) {
    clearTrialChildLinkData();
    return null;
  }

  const data: TrialChildLinkData = {
    trialChildLinkUrl: getSafeString(localStorage.getItem(TRIAL_CHILD_LINK_URL_KEY)) || undefined,
    trialChildToken: getSafeString(localStorage.getItem(TRIAL_CHILD_TOKEN_KEY)) || undefined,
    shareCode: getSafeString(localStorage.getItem(TRIAL_CHILD_SHARE_CODE_KEY)) || undefined,
    trialChildQrCodeUrl: getSafeString(localStorage.getItem(TRIAL_CHILD_QR_CODE_URL_KEY)) || undefined,
  };

  if (!hasAnyLinkData(data)) return null;
  return data;
};