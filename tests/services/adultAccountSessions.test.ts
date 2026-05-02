import {
  cacheAdultAccountSession,
  clearCachedAdultAccounts,
  getCachedAdultAccounts,
  switchToCachedAdultAccount,
} from "../../client/src/lib/adultAccountSessions";

type Store = Record<string, string>;

function createLocalStorageMock() {
  let store: Store = {};

  return {
    getItem: (key: string): string | null => (key in store ? store[key] : null),
    setItem: (key: string, value: string): void => {
      store[key] = String(value);
    },
    removeItem: (key: string): void => {
      delete store[key];
    },
    clear: (): void => {
      store = {};
    },
    key: (index: number): string | null => Object.keys(store)[index] ?? null,
    get length(): number {
      return Object.keys(store).length;
    },
    _dump: (): Store => ({ ...store }),
  };
}

describe("adultAccountSessions", () => {
  beforeEach(() => {
    const mock = createLocalStorageMock();
    Object.defineProperty(globalThis, "localStorage", {
      value: mock,
      configurable: true,
      writable: true,
    });
  });

  it("caches adult accounts and keeps latest entry first", () => {
    cacheAdultAccountSession({
      role: "parent",
      token: "parent-token-1",
      accountId: "p1",
      displayName: "Parent One",
    });

    cacheAdultAccountSession({
      role: "teacher",
      token: "teacher-token-1",
      accountId: "t1",
      displayName: "Teacher One",
      dataValue: JSON.stringify({ id: "t1", name: "Teacher One" }),
    });

    const cached = getCachedAdultAccounts();
    expect(cached).toHaveLength(2);
    expect(cached[0].role).toBe("teacher");
    expect(cached[0].accountId).toBe("t1");
    expect(cached[1].role).toBe("parent");
    expect(cached[1].accountId).toBe("p1");
  });

  it("updates existing cache entry for same role+account instead of duplicating", () => {
    cacheAdultAccountSession({
      role: "parent",
      token: "parent-token-old",
      accountId: "p1",
      displayName: "Parent One",
    });

    cacheAdultAccountSession({
      role: "parent",
      token: "parent-token-new",
      accountId: "p1",
      displayName: "Parent One Updated",
    });

    const cached = getCachedAdultAccounts();
    expect(cached).toHaveLength(1);
    expect(cached[0].token).toBe("parent-token-new");
    expect(cached[0].displayName).toBe("Parent One Updated");
  });

  it("switches to selected account and clears conflicting active sessions", () => {
    localStorage.setItem("token", "active-parent-token");
    localStorage.setItem("schoolToken", "active-school-token");
    localStorage.setItem("teacherToken", "active-teacher-token");
    localStorage.setItem("libraryToken", "active-library-token");
    localStorage.setItem("childToken", "active-child-token");

    cacheAdultAccountSession({
      role: "school",
      token: "school-token-target",
      accountId: "s10",
      displayName: "School Ten",
      dataValue: JSON.stringify({ id: "s10", name: "School Ten" }),
    });

    const targetId = getCachedAdultAccounts()[0].id;
    const route = switchToCachedAdultAccount(targetId);

    expect(route).toBe("/school/dashboard");
    expect(localStorage.getItem("schoolToken")).toBe("school-token-target");
    expect(localStorage.getItem("schoolData")).toBe(JSON.stringify({ id: "s10", name: "School Ten" }));

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("teacherToken")).toBeNull();
    expect(localStorage.getItem("libraryToken")).toBeNull();
    expect(localStorage.getItem("childToken")).toBeNull();
  });

  it("returns null for unknown cache id and does not mutate active session", () => {
    localStorage.setItem("token", "active-parent-token");

    const route = switchToCachedAdultAccount("missing-id");

    expect(route).toBeNull();
    expect(localStorage.getItem("token")).toBe("active-parent-token");
  });

  it("clears all cached accounts", () => {
    cacheAdultAccountSession({
      role: "parent",
      token: "parent-token-1",
      accountId: "p1",
      displayName: "Parent One",
    });

    expect(getCachedAdultAccounts()).toHaveLength(1);
    clearCachedAdultAccounts();
    expect(getCachedAdultAccounts()).toHaveLength(0);
  });
});
