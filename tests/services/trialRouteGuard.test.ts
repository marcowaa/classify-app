import { decideTrialRouteRedirect } from "../../client/src/lib/trialRouteGuard";

describe("trialRouteGuard", () => {
  it("does not redirect parent trial from monetization surfaces", () => {
    const decision = decideTrialRouteRedirect({
      pathname: "/wallet",
      parentClassification: "PARENT_TRIAL",
      hasParentToken: true,
    });

    expect(decision).toBeNull();
  });

  it("does not redirect child trial from parent/admin surfaces", () => {
    const decision = decideTrialRouteRedirect({
      pathname: "/parent-dashboard",
      childClassification: "CHILD_TRIAL",
      hasChildToken: true,
      hasParentToken: false,
    });

    expect(decision).toBeNull();
  });

  it("does not redirect allowed auth/callback routes", () => {
    const decision = decideTrialRouteRedirect({
      pathname: "/auth/google/callback",
      parentClassification: "PARENT_TRIAL",
      hasParentToken: true,
    });

    expect(decision).toBeNull();
  });

  it("does not redirect normal parent accounts", () => {
    const decision = decideTrialRouteRedirect({
      pathname: "/wallet",
      parentClassification: "STANDARD",
      hasParentToken: true,
    });

    expect(decision).toBeNull();
  });

  it("keeps parent trial routes open for exploration", () => {
    const openRoutes = [
      "/",
      "/age-gate",
      "/parent-dashboard",
      "/parent-store",
      "/wallet",
      "/settings",
      "/privacy-policy",
      "/legal",
      "/parent-auth",
    ];

    for (const pathname of openRoutes) {
      const decision = decideTrialRouteRedirect({
        pathname,
        parentClassification: "PARENT_TRIAL",
        hasParentToken: true,
      });
      expect(decision).toBeNull();
    }
  });

  it("keeps child trial routes open for exploration", () => {
    const openRoutes = [
      "/child-link",
      "/trial-games",
      "/child-games",
      "/child-profile",
      "/child-public-profile/ABC123",
      "/match3",
      "/memory-match",
      "/parent-dashboard",
      "/store/libraries",
      "/legal",
    ];

    for (const pathname of openRoutes) {
      const decision = decideTrialRouteRedirect({
        pathname,
        childClassification: "CHILD_TRIAL",
        hasChildToken: true,
        hasParentToken: false,
      });
      expect(decision).toBeNull();
    }
  });

  it("does not redirect child trial even on admin/school/library routes", () => {
    const openRoutes = [
      "/parent-dashboard",
      "/parent-store",
      "/wallet",
      "/settings",
      "/admin",
      "/admin-dashboard",
      "/teacher/login",
      "/teacher/dashboard",
      "/school/login",
      "/school/dashboard",
      "/library/login",
      "/library/dashboard",
      "/library-store",
      "/store/libraries",
    ];

    for (const pathname of openRoutes) {
      const decision = decideTrialRouteRedirect({
        pathname,
        childClassification: "CHILD_TRIAL",
        hasChildToken: true,
        hasParentToken: false,
      });
      expect(decision).toBeNull();
    }
  });
});
