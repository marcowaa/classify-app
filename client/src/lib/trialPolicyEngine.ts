export type TrialAccountState = "parent_trial" | "child_trial" | "linked" | "full";
export type TrialCapability = "view" | "use" | "purchase" | "manage";
export type TrialDecision = "allow" | "prompt" | "block";

export interface TrialAccessEvaluation {
  decision: TrialDecision;
  reason:
  | "MATRIX_ALLOW"
  | "MATRIX_PROMPT"
  | "MATRIX_BLOCK"
  | "PURCHASE_INTENT_AUTH_REQUIRED"
  | "CHILD_LINK_REQUIRED";
}

type Matrix = Record<TrialAccountState, Record<TrialCapability, TrialDecision>>;

const normalizeClassification = (value?: string | null): string =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[-\s]+/g, "_");

const ACCESS_MATRIX: Matrix = {
  parent_trial: {
    view: "allow",
    use: "allow",
    purchase: "prompt",
    manage: "block",
  },
  child_trial: {
    view: "allow",
    use: "allow",
    purchase: "prompt",
    manage: "block",
  },
  linked: {
    view: "allow",
    use: "allow",
    purchase: "allow",
    manage: "prompt",
  },
  full: {
    view: "allow",
    use: "allow",
    purchase: "allow",
    manage: "allow",
  },
};

export function inferTrialAccountState(params: {
  isParentMode: boolean;
  classification?: string | null;
  hasLinkedChildren?: boolean;
  hasLinkedParent?: boolean;
}): TrialAccountState {
  const classification = normalizeClassification(params.classification);

  if (params.isParentMode) {
    if (classification === "PARENT_TRIAL") return "parent_trial";
    if (classification.length > 0) return "full";
    if (params.hasLinkedChildren === false) return "parent_trial";
    return "full";
  }

  if (classification === "CHILD_TRIAL") return "child_trial";
  if (classification === "LINKED" || classification === "CHILD_LINKED") return "linked";
  if (classification === "FULL" || classification === "CHILD_FULL") return "full";
  if (params.hasLinkedParent === false) return "child_trial";
  if (params.hasLinkedParent === true) return "linked";
  return "child_trial";
}

export function evaluateTrialAccess(params: {
  accountState: TrialAccountState;
  capability: TrialCapability;
  isAuthenticated?: boolean;
  exploreProgressPercent?: number;
  exploreThresholdPercent?: number;
  purchaseIntentPromptEnabled?: boolean;
  requireLinkOnPurchase?: boolean;
}): TrialAccessEvaluation {
  const stateMatrix = ACCESS_MATRIX[params.accountState] || ACCESS_MATRIX.full;
  const matrixDecision = stateMatrix[params.capability] || "allow";

  if (params.capability === "purchase" && params.requireLinkOnPurchase && params.accountState === "child_trial") {
    return { decision: "prompt", reason: "CHILD_LINK_REQUIRED" };
  }

  if (params.capability === "purchase" && params.purchaseIntentPromptEnabled && !params.isAuthenticated) {
    return { decision: "prompt", reason: "PURCHASE_INTENT_AUTH_REQUIRED" };
  }

  if (matrixDecision === "prompt") return { decision: "prompt", reason: "MATRIX_PROMPT" };
  if (matrixDecision === "block") return { decision: "block", reason: "MATRIX_BLOCK" };
  return { decision: "allow", reason: "MATRIX_ALLOW" };
}
