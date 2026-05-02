import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import path from "node:path";
import { decideTrialRouteRedirect } from "../../client/src/lib/trialRouteGuard";
import { resolveSessionChannel } from "../../client/src/lib/sessionPriority";

const root = process.cwd();

describe("pipeline smoke", () => {
  it("keeps degraded runtime UX guard wired to health endpoint", () => {
    const offlineGuard = readFileSync(path.join(root, "client", "src", "components", "OfflineGuard.tsx"), "utf8");

    expect(offlineGuard).toContain("/api/health");
    expect(offlineGuard).toContain("Degraded mode banner");
  });

  it("keeps parent-trial journey exploratory without forced redirects", () => {
    const decision = decideTrialRouteRedirect({
      pathname: "/wallet",
      parentClassification: "PARENT_TRIAL",
      hasParentToken: true,
    });

    expect(decision).toBeNull();
  });

  it("keeps child-trial journey exploratory without forced redirects", () => {
    const decision = decideTrialRouteRedirect({
      pathname: "/parent-dashboard",
      childClassification: "CHILD_TRIAL",
      hasChildToken: true,
      hasParentToken: false,
    });

    expect(decision).toBeNull();
  });

  it("keeps session channel priority deterministic", () => {
    const storage = {
      getItem: (key: string) => {
        const map: Record<string, string | null> = {
          childToken: "child-session-token",
          token: "parent-session-token",
          familyCode: "ABCD-1234",
        };
        return map[key] ?? null;
      },
    };

    expect(resolveSessionChannel(storage)).toBe("child");
  });

  it("keeps role parity scorecard artifact for all primary roles", () => {
    const scorecard = readFileSync(path.join(root, "docs", "UX_ROLE_PARITY_SCORECARD.md"), "utf8");

    expect(scorecard).toContain("Parent");
    expect(scorecard).toContain("Teacher");
    expect(scorecard).toContain("School");
    expect(scorecard).toContain("Library");
  });

  it("keeps structured usability cycle artifact with persona and locale matrix", () => {
    const cycles = readFileSync(path.join(root, "docs", "UX_USABILITY_TEST_CYCLES.md"), "utf8");

    expect(cycles).toContain("Parent");
    expect(cycles).toContain("Teacher");
    expect(cycles).toContain("School");
    expect(cycles).toContain("Library");
    expect(cycles).toContain("ar");
    expect(cycles).toContain("en");
    expect(cycles).toContain("zh");
  });
});
