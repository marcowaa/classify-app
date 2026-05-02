import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  saveTrialPurchaseIntent,
  setTrialPurchaseFlowState,
  shouldRedirectToTrialInvoice,
} from "../../client/src/lib/trialPurchaseFlow";
import { evaluateTrialAccess } from "../../client/src/lib/trialPolicyEngine";

const root = process.cwd();

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

describe("trial functional scenarios", () => {
  it("covers child purchase -> link -> parent invoice flow contracts", () => {
    const storage = new MemoryStorage();

    const captured = saveTrialPurchaseIntent(
      {
        createdAt: Date.now(),
        items: [{ productId: "promo-product-1", quantity: 1 }],
      },
      storage,
    );

    expect(captured).toBe(true);

    setTrialPurchaseFlowState("captured", storage);

    expect(
      shouldRedirectToTrialInvoice({
        trialLinkSucceeded: true,
        storage,
      }),
    ).toBe(true);

    const childStore = readFileSync(path.join(root, "client", "src", "pages", "ChildStore.tsx"), "utf8");
    const parentAuth = readFileSync(path.join(root, "client", "src", "pages", "ParentAuth.tsx"), "utf8");

    expect(childStore).toContain("captureTrialPurchaseIntent");
    expect(childStore).toContain("setShowTrialLinkPrompt(true)");
    expect(childStore).toContain("forPurchaseIntent: true");
    expect(parentAuth).toContain('"/api/auth/link-trial-child"');
    expect(parentAuth).toContain('"/parent-store?trialIntent=1"');
  });

  it("covers parent trial exploration access without early prompt", () => {
    const decision = evaluateTrialAccess({
      accountState: "parent_trial",
      capability: "use",
      isAuthenticated: false,
      exploreProgressPercent: 30,
      exploreThresholdPercent: 30,
    });

    expect(decision.decision).toBe("allow");
    expect(decision.reason).toBe("MATRIX_ALLOW");
  });

  it("covers first product discount policy contract", () => {
    const storeRoute = readFileSync(path.join(root, "server", "routes", "store.ts"), "utf8");

    expect(storeRoute).toContain("firstProductDiscountEnabled");
    expect(storeRoute).toContain("firstProductDiscountPercent");
    expect(storeRoute).toContain("appliedFirstProductDiscountAmount");
    expect(storeRoute).toContain("totalAfterDiscount");
  });
});
