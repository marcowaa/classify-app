import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

describe("regression critical flows", () => {
  it("preserves auth routing and post-auth redirect contracts", () => {
    const appTsx = readFileSync(path.join(root, "client", "src", "App.tsx"), "utf8");
    const parentAuth = readFileSync(path.join(root, "client", "src", "pages", "ParentAuth.tsx"), "utf8");
    const parentDashboard = readFileSync(path.join(root, "client", "src", "pages", "ParentDashboard.tsx"), "utf8");

    expect(appTsx).toContain('<Route path="/age-gate">');
    expect(appTsx).toContain('<Route path="/parent-auth">');
    expect(parentAuth).toContain('"/parent-store?trialIntent=1"');
    expect(parentAuth).toContain('localStorage.getItem("postAuthRedirect")');
    expect(parentDashboard).toContain('navigate("/age-gate")');
  });

  it("preserves checkout pricing after discount in server flow", () => {
    const storeRoutes = readFileSync(path.join(root, "server", "routes", "store.ts"), "utf8");

    expect(storeRoutes).toContain("firstProductDiscountEnabled");
    expect(storeRoutes).toContain("firstProductDiscountPercent");
    expect(storeRoutes).toContain("appliedFirstProductDiscountAmount");
    expect(storeRoutes).toContain("totalAfterDiscount");
    expect(storeRoutes).toContain("balance: sql`${parentWallet.balance} - ${totalAfterDiscount}`");
    expect(storeRoutes).toContain("totalAmount: totalAfterDiscount.toFixed(2)");
  });

  it("preserves notification display rules for silent windows and channel mapping", () => {
    const notificationCenter = readFileSync(path.join(root, "client", "src", "components", "notifications", "NotificationCenter.tsx"), "utf8");
    const randomAdPopup = readFileSync(path.join(root, "client", "src", "components", "RandomAdPopup.tsx"), "utf8");

    expect(notificationCenter).toContain("silentWindowActive");
    expect(notificationCenter).toContain('n.style === "toast" || n.style === "banner"');
    expect(notificationCenter).toContain('n.style === "modal" || n.style === "fullscreen"');
    expect(randomAdPopup).toContain("isSensitiveWindow");
    expect(randomAdPopup).toContain('sessionStorage.getItem("classify-child-silent-window") === "1"');
  });
});
