import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

describe("route governance contract", () => {
  it("keeps linked-child monetization guard defined", () => {
    const middleware = readFileSync(path.join(root, "server", "routes", "middleware.ts"), "utf8");

    expect(middleware).toContain("requireLinkedChildForParentMonetization");
    expect(middleware).toContain("PARENT_CHILD_MISMATCH");
  });

  it("applies linked-child guard on monetization-sensitive route groups", () => {
    const parentRoutes = readFileSync(path.join(root, "server", "routes", "parent.ts"), "utf8");
    const storeRoutes = readFileSync(path.join(root, "server", "routes", "store.ts"), "utf8");
    const marketplaceRoutes = readFileSync(path.join(root, "server", "routes", "marketplace.ts"), "utf8");

    expect(parentRoutes).toContain("requireLinkedChildForParentMonetization");
    expect(storeRoutes).toContain("requireLinkedChildForParentMonetization");
    expect(marketplaceRoutes).toContain("requireLinkedChildForParentMonetization");
  });

  it("preserves API success and error envelope helpers", () => {
    const apiResponse = readFileSync(path.join(root, "server", "utils", "apiResponse.ts"), "utf8");

    expect(apiResponse).toContain("successResponse");
    expect(apiResponse).toContain("errorResponse");
    expect(apiResponse).toContain("ErrorCode");
  });
});
