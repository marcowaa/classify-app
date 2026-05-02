import { describe, expect, it } from "@jest/globals";
import {
  getTrialExplorationProgressPercent,
  markTrialRouteExploration,
  markTrialExplorationStep,
  shouldShowTrialLinkPrompt,
} from "../../client/src/lib/trialExperience";

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

  clear(): void {
    this.data.clear();
  }
}

describe("trialExperience", () => {
  it("tracks parent route exploration as unique steps", () => {
    const storage = new MemoryStorage();
    (globalThis as any).window = { localStorage: storage };
    (globalThis as any).localStorage = storage;

    markTrialRouteExploration("/parent-dashboard");
    markTrialRouteExploration("/parent-store?promo=1");
    markTrialRouteExploration("/parent-inventory");

    expect(getTrialExplorationProgressPercent(10)).toBe(60);
  });

  it("prompts after threshold is reached for unauthenticated users", () => {
    const storage = new MemoryStorage();
    (globalThis as any).window = { localStorage: storage };
    (globalThis as any).localStorage = storage;

    for (let i = 0; i < 3; i += 1) {
      markTrialExplorationStep(`step-${i}`);
    }

    expect(
      shouldShowTrialLinkPrompt({
        isAuthenticated: false,
        thresholdPercent: 30,
        expectedSteps: 10,
      })
    ).toBe(true);
  });

  it("never prompts for authenticated users", () => {
    const storage = new MemoryStorage();
    (globalThis as any).window = { localStorage: storage };
    (globalThis as any).localStorage = storage;

    markTrialExplorationStep("section:parent-store");
    markTrialExplorationStep("section:parent-dashboard");
    markTrialExplorationStep("section:parent-inventory");

    expect(
      shouldShowTrialLinkPrompt({
        isAuthenticated: true,
        thresholdPercent: 30,
        expectedSteps: 10,
      })
    ).toBe(false);
  });
});
