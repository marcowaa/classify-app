export type CoverageTone = "none" | "excellent" | "medium" | "low";

export type CoverageStyles = {
  bar: string;
  badge: string;
};

export type TargetPreview = {
  targeted: number;
  eligible: number;
  skipped: number;
};

export const COVERAGE_STYLE_MAP: Record<CoverageTone, CoverageStyles> = {
  none: {
    bar: "bg-gray-400",
    badge: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
  excellent: {
    bar: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  medium: {
    bar: "bg-blue-500",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  low: {
    bar: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
};

export function computeTargetPreview<T extends { id: string }>(args: {
  selectedTarget: string;
  noChildValue: string;
  allChildrenValue: string;
  children: T[];
  isEligible: (child: T) => boolean;
}): TargetPreview {
  const { selectedTarget, noChildValue, allChildrenValue, children, isEligible } = args;

  if (selectedTarget === noChildValue) {
    return { targeted: 0, eligible: 0, skipped: 0 };
  }

  if (selectedTarget === allChildrenValue) {
    const targeted = children.length;
    const eligible = children.filter(isEligible).length;
    return { targeted, eligible, skipped: Math.max(0, targeted - eligible) };
  }

  const child = children.find((c) => c.id === selectedTarget);
  if (!child) {
    return { targeted: 0, eligible: 0, skipped: 0 };
  }

  const eligible = isEligible(child) ? 1 : 0;
  return {
    targeted: 1,
    eligible,
    skipped: eligible ? 0 : 1,
  };
}

export function computeCoveragePercent(preview: TargetPreview): number {
  if (preview.targeted <= 0) return 0;
  return Math.round((preview.eligible / preview.targeted) * 100);
}

export function computeCoverageTone(preview: TargetPreview, coveragePercent: number): CoverageTone {
  if (preview.targeted === 0) return "none";
  if (coveragePercent >= 100) return "excellent";
  if (coveragePercent >= 50) return "medium";
  return "low";
}
