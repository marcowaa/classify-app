import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

describe("onboarding critical scenarios", () => {
  it("keeps child-trial direct bootstrap path in age gate", () => {
    const ageGate = readFileSync(path.join(root, "client", "src", "pages", "AgeGate.tsx"), "utf8");

    expect(ageGate).toContain('fetch("/api/auth/start-child-trial"');
    expect(ageGate).toContain('localStorage.setItem("childToken"');
    expect(ageGate).toContain('localStorage.setItem("trialChildToken"');
    expect(ageGate).toContain('redirectTo');
    expect(ageGate).toContain('"/child-games"');
  });

  it("keeps parent-trial redirect classification in age gate", () => {
    const ageGate = readFileSync(path.join(root, "client", "src", "pages", "AgeGate.tsx"), "utf8");

    expect(ageGate).toContain("classification=parent-trial");
    expect(ageGate).toContain("classification=child-trial");
    expect(ageGate).toContain("parentThresholdAge");
  });

  it("keeps purchase lock guard phrase for unlinked parent", () => {
    const middleware = readFileSync(path.join(root, "server", "routes", "middleware.ts"), "utf8");

    expect(middleware).toContain("Link at least one child before completing purchases");
    expect(middleware).toContain("PARENT_CHILD_MISMATCH");
  });
});
