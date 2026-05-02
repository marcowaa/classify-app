import { trackTrialFunnelEvent } from "./trialAnalytics";

const EXPLORATION_STEPS_KEY = "trialExplorationStepsV1";
const LINK_PROMPT_LAST_SHOWN_AT_KEY = "trialLinkPromptLastShownAtV1";
const DEFAULT_EXPECTED_STEPS = 10;
const PROMPT_COOLDOWN_MS = 2 * 60 * 1000;

const canUseStorage = (): boolean => {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
};

const readSteps = (): string[] => {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(EXPLORATION_STEPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => String(item || "").trim())
      .filter((item) => item.length > 0)
      .slice(0, 100);
  } catch {
    return [];
  }
};

const writeSteps = (steps: string[]) => {
  if (!canUseStorage()) return;
  localStorage.setItem(EXPLORATION_STEPS_KEY, JSON.stringify(steps.slice(0, 100)));
};

export const markTrialExplorationStep = (step: string) => {
  const normalizedStep = String(step || "").trim();
  if (!normalizedStep) return;

  const existing = readSteps();
  if (existing.includes(normalizedStep)) return;
  writeSteps([...existing, normalizedStep]);
};

export const markTrialRouteExploration = (routePath: string) => {
  const normalizedPath = String(routePath || "").trim().toLowerCase();
  if (!normalizedPath.startsWith("/")) return;

  const basePath = normalizedPath.split("?")[0].split("#")[0];
  markTrialExplorationStep(`route:${basePath}`);

  if (basePath.startsWith("/child-games")) markTrialExplorationStep("section:child-games");
  if (basePath.startsWith("/child-tasks")) markTrialExplorationStep("section:child-tasks");
  if (basePath.startsWith("/child-store")) markTrialExplorationStep("section:child-store");
  if (basePath.startsWith("/child-gifts")) markTrialExplorationStep("section:child-gifts");
  if (basePath.startsWith("/child-progress")) markTrialExplorationStep("section:child-progress");
  if (basePath.startsWith("/child-profile")) markTrialExplorationStep("section:child-profile");
  if (basePath.startsWith("/child-settings")) markTrialExplorationStep("section:child-settings");
  if (basePath.startsWith("/child-discover")) markTrialExplorationStep("section:child-discover");
  if (basePath.startsWith("/child-notifications")) markTrialExplorationStep("section:child-notifications");

  if (basePath.startsWith("/parent-dashboard")) markTrialExplorationStep("section:parent-dashboard");
  if (basePath.startsWith("/parent-store")) markTrialExplorationStep("section:parent-store");
  if (basePath.startsWith("/parent-inventory")) markTrialExplorationStep("section:parent-inventory");
  if (basePath.startsWith("/parent-profile")) markTrialExplorationStep("section:parent-profile");
  if (basePath.startsWith("/parent-tasks")) markTrialExplorationStep("section:parent-tasks");
  if (basePath.startsWith("/wallet")) markTrialExplorationStep("section:parent-wallet");
  if (basePath.startsWith("/notifications")) markTrialExplorationStep("section:parent-notifications");
  if (basePath.startsWith("/task-marketplace")) markTrialExplorationStep("section:parent-task-marketplace");
  if (basePath.startsWith("/task-cart")) markTrialExplorationStep("section:parent-task-cart");
  if (basePath.startsWith("/subjects")) markTrialExplorationStep("section:parent-subjects");
};

export const getTrialExplorationProgressPercent = (expectedSteps = DEFAULT_EXPECTED_STEPS): number => {
  const safeExpected = Math.max(1, Math.trunc(expectedSteps));
  const explored = readSteps().length;
  return Math.min(100, Math.round((explored / safeExpected) * 100));
};

const isPromptCoolingDown = (): boolean => {
  if (!canUseStorage()) return false;
  const raw = localStorage.getItem(LINK_PROMPT_LAST_SHOWN_AT_KEY);
  if (!raw) return false;
  const timestamp = Number(raw);
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp < PROMPT_COOLDOWN_MS;
};

export const markTrialLinkPromptShown = () => {
  if (!canUseStorage()) return;
  localStorage.setItem(LINK_PROMPT_LAST_SHOWN_AT_KEY, String(Date.now()));
  trackTrialFunnelEvent("TRIAL_EXPLORE_PROMPT_SHOWN", {
    exploreProgressPercent: getTrialExplorationProgressPercent(),
  });
};

export const shouldShowTrialLinkPrompt = (params: {
  isAuthenticated: boolean;
  thresholdPercent: number;
  expectedSteps?: number;
}): boolean => {
  if (params.isAuthenticated) return false;
  if (isPromptCoolingDown()) return false;

  const threshold = Math.min(100, Math.max(1, Math.trunc(Number(params.thresholdPercent) || 0)));
  const progress = getTrialExplorationProgressPercent(params.expectedSteps);
  return progress >= threshold;
};
