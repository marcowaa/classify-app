export type TrialFunnelEventName =
  | "TRIAL_EXPLORE_PROMPT_SHOWN"
  | "TRIAL_PURCHASE_INTENT_CAPTURED"
  | "TRIAL_LINK_SUCCESS"
  | "TRIAL_LINK_FAILED";

const ENDPOINT = "/api/analytics/trial-event";

export function trackTrialFunnelEvent(eventName: TrialFunnelEventName, payload?: Record<string, any>) {
  if (typeof window === "undefined") return;

  const body = {
    eventName,
    actorType: localStorage.getItem("childToken") ? "child" : localStorage.getItem("token") ? "parent" : "guest",
    path: window.location.pathname,
    ...payload,
  };

  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {
    // Ignore analytics failures to keep UX uninterrupted.
  });
}
