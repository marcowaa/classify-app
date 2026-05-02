import { isCapacitorNativePlatform } from "../../client/src/capacitor/hooks/useMobileControls";

describe("mobile controls helpers", () => {
  test("detects native platform when Capacitor flag exists", () => {
    const fakeWindow = {
      Capacitor: {
        isNativePlatform: () => true,
      },
    };

    expect(isCapacitorNativePlatform(fakeWindow)).toBe(true);
  });

  test("returns false for non-native environments", () => {
    expect(isCapacitorNativePlatform({})).toBe(false);
  });
});
