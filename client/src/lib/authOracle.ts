export type AuthMeResponse = {
    authenticated: boolean;
    channel: "parent" | "child" | "admin" | "none" | string;
    parentId?: string | null;
    childId?: string | null;
    tokenType?: "bearer" | "cookie" | string;
    issuedAt?: string | null;
    expiresInSeconds?: number;
};

const AUTH_ME_ENDPOINT = "/api/auth/me";

function resolveLegacyTokenForMe(): string | null {
    // Legacy transport only (used only for oracle retry when cookie-first fails).
    const childToken = localStorage.getItem("childToken");
    if (childToken) return childToken;

    const parentToken = localStorage.getItem("token");
    if (parentToken) return parentToken;

    const adminToken = localStorage.getItem("adminToken");
    if (adminToken) return adminToken;

    return null;
}

export async function fetchAuthMe(): Promise<AuthMeResponse> {
    try {
        // Phase 1 (cookie-first): do NOT attach Authorization header.
        const res1 = await fetch(AUTH_ME_ENDPOINT, {
            method: "GET",
            credentials: "include",
            headers: {
                Accept: "application/json",
            },
        });

        if (res1.ok) {
            const json1 = (await res1.json()) as Partial<AuthMeResponse>;
            if (json1?.authenticated === true) {
                return {
                    authenticated: true,
                    channel: (json1.channel || "none") as AuthMeResponse["channel"],
                    parentId: json1.parentId ?? null,
                    childId: json1.childId ?? null,
                    tokenType: json1.tokenType,
                    issuedAt: json1.issuedAt ?? null,
                    expiresInSeconds: json1.expiresInSeconds ?? 0,
                };
            }
        }

        // Phase 2 (legacy retry only): attach legacy token for oracle verification.
        const legacyToken = resolveLegacyTokenForMe();
        if (!legacyToken) return { authenticated: false, channel: "none" };

        const res2 = await fetch(AUTH_ME_ENDPOINT, {
            method: "GET",
            credentials: "include",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${legacyToken}`,
            },
        });

        if (!res2.ok) return { authenticated: false, channel: "none" };

        const json2 = (await res2.json()) as Partial<AuthMeResponse>;
        if (json2?.authenticated !== true) return { authenticated: false, channel: "none" };

        return {
            authenticated: true,
            channel: (json2.channel || "none") as AuthMeResponse["channel"],
            parentId: json2.parentId ?? null,
            childId: json2.childId ?? null,
            tokenType: json2.tokenType,
            issuedAt: json2.issuedAt ?? null,
            expiresInSeconds: json2.expiresInSeconds ?? 0,
        };
    } catch {
        return { authenticated: false, channel: "none" };
    }
}

export function wipeAllClientAuthState(): void {
    try {
        // Primary auth transport tokens
        localStorage.removeItem("token");
        localStorage.removeItem("childToken");
        localStorage.removeItem("adminToken");
        localStorage.removeItem("teacherToken");

        // Child identity / onboarding / refresh artifacts
        localStorage.removeItem("childId");
        localStorage.removeItem("childRefreshToken");
        localStorage.removeItem("rememberedChild");

        // Family / link transport
        localStorage.removeItem("familyCode");
        localStorage.removeItem("deviceId");
        localStorage.removeItem("deviceTrusted");

        // Misc auth-related identifiers used by the UI
        localStorage.removeItem("userId");
        localStorage.removeItem("oauth_return_to");
    } catch {
        // Ignore storage failures (e.g., private mode / blocked storage).
    }
}
