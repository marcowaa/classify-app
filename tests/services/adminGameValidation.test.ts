import { describe, expect, it } from "@jest/globals";
import {
  normalizeGameEmbedUrl,
  normalizeGamePayload,
  validateGamePayload,
} from "../../server/services/adminGameValidation";

describe("adminGameValidation", () => {
  it("normalizes internal and external embed urls", () => {
    expect(normalizeGameEmbedUrl("/games/test.html")).toBe("/games/test.html");
    expect(normalizeGameEmbedUrl(" https://example.com/play ")).toBe("https://example.com/play");
  });

  it("rejects unsupported protocols", () => {
    expect(normalizeGameEmbedUrl("javascript:alert(1)")).toBe("");
    expect(normalizeGameEmbedUrl("ftp://example.com/game")).toBe("");
  });

  it("validates normalized payload ranges and age constraints", () => {
    const payload = normalizeGamePayload({
      title: "Test Game",
      embedUrl: "/games/test.html",
      pointsPerPlay: 10,
      maxPlaysPerDay: 5,
      minAge: 6,
      maxAge: 12,
    });

    expect(validateGamePayload(payload)).toBeNull();

    const invalidAgePayload = { ...payload, minAge: 13, maxAge: 8 };
    expect(validateGamePayload(invalidAgePayload)).toBe("minAge cannot be greater than maxAge");

    const invalidPointsPayload = { ...payload, pointsPerPlay: 2001 };
    expect(validateGamePayload(invalidPointsPayload)).toBe("Points per play must be between 0 and 1000");
  });

  it("normalizes defaults for optional values", () => {
    const payload = normalizeGamePayload({
      title: "  My Game  ",
      embedUrl: "https://games.example.com/play",
    });

    expect(payload.title).toBe("My Game");
    expect(payload.category).toBe("general");
    expect(payload.pointsPerPlay).toBe(5);
    expect(payload.maxPlaysPerDay).toBe(0);
  });
});
