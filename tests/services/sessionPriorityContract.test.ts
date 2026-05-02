import { describe, expect, it } from "@jest/globals";
import { resolveSessionChannel } from "../../client/src/lib/sessionPriority";

class MemoryStorage {
  private map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

describe("session priority contract", () => {
  it("resolves child before parent and family pin", () => {
    const storage = new MemoryStorage();
    storage.setItem("token", "parent-token");
    storage.setItem("childToken", "child-token");
    storage.setItem("familyCode", "FAMILY123");

    expect(resolveSessionChannel(storage)).toBe("child");
  });

  it("resolves parent before family pin", () => {
    const storage = new MemoryStorage();
    storage.setItem("token", "parent-token");
    storage.setItem("familyCode", "FAMILY123");

    expect(resolveSessionChannel(storage)).toBe("parent");
  });

  it("returns none when no session keys are present", () => {
    const storage = new MemoryStorage();
    expect(resolveSessionChannel(storage)).toBe("none");
  });
});
