import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

describe("onboarding route contract", () => {
  it("keeps critical frontend onboarding routes registered", () => {
    const appTsx = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");

    expect(appTsx).toContain('<Route path="/age-gate">');
    expect(appTsx).toContain('<Route path="/parent-auth">');
    expect(appTsx).toContain('<Route path="/trial-games">');
    expect(appTsx).toContain('<Route path="/child-games"');
  });

  it("keeps backend child-trial start endpoint available", () => {
    const authRoutes = readFileSync(path.join(root, "server", "routes", "auth.ts"), "utf8");

    expect(authRoutes).toContain('app.post("/api/auth/start-child-trial"');
    expect(authRoutes).toContain("CHILD_TRIAL");
  });
});
