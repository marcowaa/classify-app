import { describe, expect, it, beforeEach, jest } from "@jest/globals";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

const mockStorage: { db: any } = { db: null };

jest.unstable_mockModule("../../server/storage", () => ({
  storage: mockStorage,
}));

const { requireLinkedChildForParentMonetization } = await import("../../server/routes/middleware");

function createRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

function createDbReturning(rows: any[]) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => rows,
        }),
      }),
    }),
  };
}

describe("requireLinkedChildForParentMonetization", () => {
  beforeEach(() => {
    mockStorage.db = createDbReturning([{ childId: "child-1" }]);
  });

  it("allows parent with linked child", async () => {
    const req: any = {
      user: { type: "parent", userId: "parent-1" },
    };
    const res = createRes();
    const next = jest.fn();

    await requireLinkedChildForParentMonetization(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeNull();
  });

  it("rejects when token is not parent", async () => {
    const req: any = {
      user: { type: "child", userId: "child-1" },
    };
    const res = createRes();
    const next = jest.fn();

    await requireLinkedChildForParentMonetization(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({
      success: false,
      error: "UNAUTHORIZED",
    });
  });

  it("rejects when parent has no linked children", async () => {
    mockStorage.db = createDbReturning([]);

    const req: any = {
      user: { type: "parent", userId: "parent-2" },
    };
    const res = createRes();
    const next = jest.fn();

    await requireLinkedChildForParentMonetization(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({
      success: false,
      error: "PARENT_CHILD_MISMATCH",
    });
  });

  it("returns 500 on db failure", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });

    mockStorage.db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => {
              throw new Error("db failed");
            },
          }),
        }),
      }),
    };

    const req: any = {
      user: { type: "parent", userId: "parent-3" },
    };
    const res = createRes();
    const next = jest.fn();

    await requireLinkedChildForParentMonetization(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
    expect(res.statusCode).toBe(500);
    expect(res.body).toMatchObject({
      success: false,
      error: "INTERNAL_SERVER_ERROR",
    });

    consoleSpy.mockRestore();
  });
});
