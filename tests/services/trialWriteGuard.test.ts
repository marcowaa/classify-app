import {
  isTrialSession,
  shouldBlockTrialWrite,
} from "../../client/src/lib/trialWriteGuard";

function createStorage(map: Record<string, string | null>) {
  return {
    getItem: (key: string) => map[key] ?? null,
  };
}

describe("trialWriteGuard", () => {
  it("detects parent trial session from classification", () => {
    const storage = createStorage({
      parentAccountClassification: "PARENT_TRIAL",
      token: "parent-token",
    });

    expect(isTrialSession(storage)).toBe(true);
  });

  it("does not classify child-only session as blocked trial", () => {
    const storage = createStorage({
      childToken: "child-token",
      token: null,
    });

    expect(isTrialSession(storage)).toBe(false);
  });

  it("does not detect non-trial parent session", () => {
    const storage = createStorage({
      parentAccountClassification: "STANDARD",
      token: "parent-token",
    });

    expect(isTrialSession(storage)).toBe(false);
  });

  it("blocks mutating API calls for parent trial session", () => {
    const storage = createStorage({
      parentAccountClassification: "PARENT_TRIAL",
      token: "parent-token",
    });

    expect(shouldBlockTrialWrite("POST", "/api/child/complete-game", storage)).toBe(true);
    expect(shouldBlockTrialWrite("DELETE", "/api/notifications/123", storage)).toBe(true);
  });

  it("allows mutating API calls for child trial session", () => {
    const storage = createStorage({
      childAccountClassification: "CHILD_TRIAL",
      childToken: "child-token",
      token: null,
    });

    expect(shouldBlockTrialWrite("POST", "/api/child/complete-game", storage)).toBe(false);
    expect(shouldBlockTrialWrite("DELETE", "/api/notifications/123", storage)).toBe(false);
  });

  it("allows read-only API calls for trial session", () => {
    const storage = createStorage({
      parentAccountClassification: "PARENT_TRIAL",
      token: "parent-token",
    });

    expect(shouldBlockTrialWrite("GET", "/api/parent/me", storage)).toBe(false);
  });

  it("allows auth/trial bootstrap writes", () => {
    const storage = createStorage({
      parentAccountClassification: "PARENT_TRIAL",
      token: "parent-token",
    });

    expect(shouldBlockTrialWrite("POST", "/api/auth/register", storage)).toBe(false);
    expect(shouldBlockTrialWrite("POST", "/api/auth/start-child-trial", storage)).toBe(false);
    expect(shouldBlockTrialWrite("POST", "/api/trial-analytics/explore", storage)).toBe(false);
  });
});
