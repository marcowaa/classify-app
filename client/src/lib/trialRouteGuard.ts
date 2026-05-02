export type TrialRouteGuardInput = {
  pathname: string;
  parentClassification?: string | null;
  childClassification?: string | null;
  hasParentToken?: boolean;
  hasChildToken?: boolean;
};

export type TrialRouteGuardDecision = {
  redirectPath: string;
  notice: "complete-account" | "link-parent";
  fromPath: string;
} | null;

export function decideTrialRouteRedirect(input: TrialRouteGuardInput): TrialRouteGuardDecision {
  void input;
  // Trial users can explore all routes. Data-persisting actions are gated in the API layer.
  return null;
}
