export const TRIAL_PURCHASE_INTENT_KEY = "trialChildPurchaseIntentV1";
export const TRIAL_PURCHASE_FLOW_STATE_KEY = "trialChildPurchaseFlowStateV1";

export type TrialPurchaseFlowState = "idle" | "captured" | "linking" | "linked" | "hydrated";

export interface TrialPurchaseIntentItem {
  productId: string;
  quantity: number;
  name?: string;
  nameAr?: string;
  image?: string;
  price?: string;
  pointsPrice?: number;
}

export interface TrialPurchaseIntentPayload {
  createdAt: number;
  items: TrialPurchaseIntentItem[];
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  if (typeof globalThis === "undefined") return null;
  const localStorageLike = (globalThis as any).localStorage as StorageLike | undefined;
  return localStorageLike || null;
}

export function setTrialPurchaseFlowState(state: TrialPurchaseFlowState, storage?: StorageLike): void {
  const targetStorage = getStorage(storage);
  if (!targetStorage) return;
  targetStorage.setItem(TRIAL_PURCHASE_FLOW_STATE_KEY, state);
}

export function getTrialPurchaseFlowState(storage?: StorageLike): TrialPurchaseFlowState {
  const targetStorage = getStorage(storage);
  if (!targetStorage) return "idle";
  const raw = String(targetStorage.getItem(TRIAL_PURCHASE_FLOW_STATE_KEY) || "").trim();
  if (raw === "captured" || raw === "linking" || raw === "linked" || raw === "hydrated") {
    return raw;
  }
  return "idle";
}

export function saveTrialPurchaseIntent(payload: TrialPurchaseIntentPayload, storage?: StorageLike): boolean {
  const targetStorage = getStorage(storage);
  if (!targetStorage) return false;

  try {
    targetStorage.setItem(TRIAL_PURCHASE_INTENT_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function readTrialPurchaseIntent(storage?: StorageLike): TrialPurchaseIntentPayload | null {
  const targetStorage = getStorage(storage);
  if (!targetStorage) return null;

  try {
    const raw = targetStorage.getItem(TRIAL_PURCHASE_INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return null;
    return {
      createdAt: Number(parsed.createdAt || Date.now()),
      items: parsed.items,
    };
  } catch {
    return null;
  }
}

export function clearTrialPurchaseIntent(storage?: StorageLike): void {
  const targetStorage = getStorage(storage);
  if (!targetStorage) return;
  targetStorage.removeItem(TRIAL_PURCHASE_INTENT_KEY);
}

export function shouldRedirectToTrialInvoice(options: {
  trialLinkSucceeded: boolean;
  storage?: StorageLike;
}): boolean {
  if (!options.trialLinkSucceeded) return false;

  const intent = readTrialPurchaseIntent(options.storage);
  if (!intent || intent.items.length === 0) return false;

  const state = getTrialPurchaseFlowState(options.storage);
  return state === "captured" || state === "linking" || state === "linked";
}