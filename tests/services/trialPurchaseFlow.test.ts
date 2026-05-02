import { describe, expect, it } from "@jest/globals";
import {
  clearTrialPurchaseIntent,
  getTrialPurchaseFlowState,
  readTrialPurchaseIntent,
  saveTrialPurchaseIntent,
  setTrialPurchaseFlowState,
  shouldRedirectToTrialInvoice,
} from "../../client/src/lib/trialPurchaseFlow";

class MemoryStorage {
  private data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

describe("trialPurchaseFlow", () => {
  it("stores and reads trial purchase intent", () => {
    const storage = new MemoryStorage();

    const saved = saveTrialPurchaseIntent(
      {
        createdAt: 123,
        items: [{ productId: "p1", quantity: 2 }],
      },
      storage
    );

    expect(saved).toBe(true);
    const intent = readTrialPurchaseIntent(storage);
    expect(intent?.items.length).toBe(1);
    expect(intent?.items[0].productId).toBe("p1");
  });

  it("controls redirect eligibility by flow state", () => {
    const storage = new MemoryStorage();

    saveTrialPurchaseIntent(
      {
        createdAt: Date.now(),
        items: [{ productId: "p2", quantity: 1 }],
      },
      storage
    );

    setTrialPurchaseFlowState("captured", storage);
    expect(
      shouldRedirectToTrialInvoice({ trialLinkSucceeded: true, storage })
    ).toBe(true);

    setTrialPurchaseFlowState("hydrated", storage);
    expect(
      shouldRedirectToTrialInvoice({ trialLinkSucceeded: true, storage })
    ).toBe(false);

    expect(
      shouldRedirectToTrialInvoice({ trialLinkSucceeded: false, storage })
    ).toBe(false);
  });

  it("clears intent without changing state automatically", () => {
    const storage = new MemoryStorage();

    saveTrialPurchaseIntent(
      {
        createdAt: Date.now(),
        items: [{ productId: "p3", quantity: 1 }],
      },
      storage
    );
    setTrialPurchaseFlowState("linked", storage);

    clearTrialPurchaseIntent(storage);

    expect(readTrialPurchaseIntent(storage)).toBeNull();
    expect(getTrialPurchaseFlowState(storage)).toBe("linked");
  });
});
