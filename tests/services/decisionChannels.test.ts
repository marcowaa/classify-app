import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import path from "node:path";
import { resolveCampaignDeliveryDecision } from "../../server/services/decisionChannels";

const root = process.cwd();

describe("decisionChannels", () => {
  it("defaults to v1 when feature flags are off", () => {
    process.env.FF_DECISION_V2 = "false";
    process.env.FF_CAMPAIGN_CHANNEL_ENVELOPE_V2 = "false";
    process.env.FF_DECISION_CANARY_PERCENT = "100";

    const decision = resolveCampaignDeliveryDecision({
      priorityRaw: 9,
      actorId: "admin-1",
      seed: "campaign:alpha",
    });

    expect(decision.pathVersion).toBe("v1");
    expect(decision.selected.channels.includes("email")).toBe(false);
  });

  it("uses v2 when flags are enabled and canary matches", () => {
    process.env.FF_DECISION_V2 = "true";
    process.env.FF_CAMPAIGN_CHANNEL_ENVELOPE_V2 = "true";
    process.env.FF_DECISION_CANARY_PERCENT = "100";

    const decision = resolveCampaignDeliveryDecision({
      priorityRaw: 9,
      actorId: "admin-2",
      seed: "campaign:beta",
    });

    expect(decision.pathVersion).toBe("v2");
    expect(decision.selected.channels.includes("email")).toBe(true);
  });

  it("keeps parent route integration on unified decision helper", () => {
    const parentRoutes = readFileSync(path.join(root, "server", "routes", "parent.ts"), "utf8");

    expect(parentRoutes).toContain("createNotification({");
    expect(parentRoutes).not.toContain("resolveParentNotificationDecision");
  });

  it("keeps child route integration on unified decision helper", () => {
    const childRoutes = readFileSync(path.join(root, "server", "routes", "child.ts"), "utf8");

    expect(childRoutes).toContain("createNotification({");
    expect(childRoutes).not.toContain("resolveChildNotificationDecision");
  });

  it("keeps school route integration on unified decision helper", () => {
    const schoolRoutes = readFileSync(path.join(root, "server", "routes", "school.ts"), "utf8");

    expect(schoolRoutes).toContain("createNotification({");
    expect(schoolRoutes).not.toContain("resolveSchoolNotificationDecision");
  });

  it("keeps library route integration on unified decision helper", () => {
    const libraryRoutes = readFileSync(path.join(root, "server", "routes", "library.ts"), "utf8");

    expect(libraryRoutes).toContain("createNotification({");
    expect(libraryRoutes).not.toContain("resolveLibraryNotificationDecision");
  });

  it("keeps central notification layer integration on unified decision resolver", () => {
    const notificationsLayer = readFileSync(path.join(root, "server", "notifications.ts"), "utf8");

    expect(notificationsLayer).toContain("resolveCampaignDeliveryDecision");
    expect(notificationsLayer).toContain("decisionPathVersion");
  });
});
