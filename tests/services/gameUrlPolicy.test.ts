import { describe, expect, it } from "@jest/globals";
import { getGameIframePolicy, isGameUrlAllowed } from "../../server/services/gameUrlPolicy";

describe("gameUrlPolicy", () => {
  it("allows relative game urls", () => {
    const policy = {
      allowedDomains: [],
      allowExternalDomains: true,
      handshakeRequired: true,
      sandboxProfile: "strict-game" as const,
    };

    expect(isGameUrlAllowed("/games/math-challenge.html", policy)).toBe(true);
  });

  it("blocks external urls when disabled", () => {
    const policy = {
      allowedDomains: [],
      allowExternalDomains: false,
      handshakeRequired: true,
      sandboxProfile: "strict-game" as const,
    };

    expect(isGameUrlAllowed("https://games.example.com/play.html", policy)).toBe(false);
  });

  it("enforces allow-list when configured", () => {
    const policy = {
      allowedDomains: ["games.example.com"],
      allowExternalDomains: true,
      handshakeRequired: true,
      sandboxProfile: "strict-game" as const,
    };

    expect(isGameUrlAllowed("https://games.example.com/play.html", policy)).toBe(true);
    expect(isGameUrlAllowed("https://evil.example.com/play.html", policy)).toBe(false);
  });

  it("builds policy from environment", () => {
    const oldDomains = process.env.GAME_IFRAME_ALLOWED_DOMAINS;
    const oldExternal = process.env.GAME_IFRAME_EXTERNAL_ENABLED;

    process.env.GAME_IFRAME_ALLOWED_DOMAINS = "a.example.com,b.example.com";
    process.env.GAME_IFRAME_EXTERNAL_ENABLED = "1";

    const policy = getGameIframePolicy();
    expect(policy.allowedDomains).toEqual(["a.example.com", "b.example.com"]);
    expect(policy.allowExternalDomains).toBe(true);

    process.env.GAME_IFRAME_ALLOWED_DOMAINS = oldDomains;
    process.env.GAME_IFRAME_EXTERNAL_ENABLED = oldExternal;
  });
});
