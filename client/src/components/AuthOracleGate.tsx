import { ReactNode, useEffect, useState } from "react";
import { Redirect } from "wouter";
import { fetchAuthMe, wipeAllClientAuthState } from "@/lib/authOracle";
import { LoadingSpinner } from "@/components/LoadingSpinner";

type AuthOracleGateProps = {
    children: ReactNode;
    /**
     * If provided, auth.oracle must match this channel.
     * If omitted, any authenticated channel is accepted.
     */
    requiredChannel?: "parent" | "child" | "admin";
    /**
     * Redirect target for unauthenticated users.
     */
    redirectTo?: string;
};

export function AuthOracleGate({
    children,
    requiredChannel,
    redirectTo = "/age-gate",
}: AuthOracleGateProps) {
    const [status, setStatus] = useState<"loading" | "authed" | "unauth">("loading");

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            const me = await fetchAuthMe();
            if (cancelled) return;

            if (!me.authenticated) {
                wipeAllClientAuthState();
                setStatus("unauth");
                return;
            }

            if (requiredChannel && me.channel !== requiredChannel) {
                wipeAllClientAuthState();
                setStatus("unauth");
                return;
            }

            setStatus("authed");
        };

        run().catch(() => {
            wipeAllClientAuthState();
            if (!cancelled) setStatus("unauth");
        });

        return () => {
            cancelled = true;
        };
    }, [requiredChannel]);

    if (status === "loading") return <LoadingSpinner fullScreen />;
    if (status === "unauth") return <Redirect to={redirectTo} replace />;

    return <>{children}</>;
}
