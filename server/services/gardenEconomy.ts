export type GardenToolKey = "water" | "fertilizer" | "pruner" | "spray";

export type GardenToolConfig = {
  costPoints: number;
  growthPoints: number;
};

export type GardenSlotLike = {
  stage: number;
  totalStages: number;
  careCount: number;
};

export type GardenSeedRewardLike = {
  rarity?: "common" | "rare";
  baseReward?: number;
  bonusPerCare?: number;
};

export type GardenEconomyLike = {
  totalSpentPoints: number;
  totalHarvestPoints: number;
  netPoints: number;
  plantedCount: number;
  harvestedCount: number;
  toolUsesCount: number;
  lastActionAt: string | null;
};

export type GardenStateLike = {
  slots: Array<GardenSlotLike | null>;
  economy: GardenEconomyLike;
};

export function applyGardenEconomyDelta(
  state: GardenStateLike,
  delta: {
    spent?: number;
    harvest?: number;
    planted?: number;
    harvested?: number;
    toolUse?: number;
  },
): void {
  const spent = Math.max(0, Number(delta.spent) || 0);
  const harvest = Math.max(0, Number(delta.harvest) || 0);
  const planted = Math.max(0, Number(delta.planted) || 0);
  const harvested = Math.max(0, Number(delta.harvested) || 0);
  const toolUse = Math.max(0, Number(delta.toolUse) || 0);

  state.economy.totalSpentPoints += spent;
  state.economy.totalHarvestPoints += harvest;
  state.economy.netPoints = state.economy.totalHarvestPoints - state.economy.totalSpentPoints;
  state.economy.plantedCount += planted;
  state.economy.harvestedCount += harvested;
  state.economy.toolUsesCount += toolUse;
  state.economy.lastActionAt = new Date().toISOString();
}

export function calculateGardenBeauty(slots: Array<GardenSlotLike | null>): number {
  const activeSlots = slots.filter(Boolean) as GardenSlotLike[];
  if (!activeSlots.length) return 0;
  const avgProgress = activeSlots.reduce((sum, slot) => {
    const slotProgress = (slot.stage / Math.max(1, slot.totalStages)) * 100;
    return sum + slotProgress;
  }, 0) / activeSlots.length;
  return Math.max(0, Math.min(100, Math.round(avgProgress)));
}

export function calculateHarvestReward(slot: GardenSlotLike, seed: GardenSeedRewardLike | undefined): number {
  const rarityBase = seed?.baseReward ?? (seed?.rarity === "rare" ? 70 : 45);
  const stageBonus = Math.max(0, Math.min(50, slot.totalStages * 2));
  const careBonusPerCare = seed?.bonusPerCare ?? 1;
  const careBonus = Math.max(0, Math.min(40, Math.floor(slot.careCount * careBonusPerCare)));
  return rarityBase + stageBonus + careBonus;
}

export function calculateGrowthPointsForTool(
  slot: GardenSlotLike,
  seed: GardenSeedRewardLike | undefined,
  toolConfig: GardenToolConfig,
  toolKey: GardenToolKey,
): number {
  const progressRatio = Math.max(0, Math.min(1, slot.stage / Math.max(1, slot.totalStages)));
  const rarityMultiplier = seed?.rarity === "rare" ? 1.1 : 1;
  const toolMultiplier = toolKey === "fertilizer" ? 1.18 : toolKey === "pruner" ? 1.05 : toolKey === "spray" ? 0.95 : 1;
  const earlyGrowthBoost = progressRatio < 0.35 ? 1.2 : progressRatio > 0.8 ? 0.86 : 1;
  const computed = Math.round(toolConfig.growthPoints * rarityMultiplier * toolMultiplier * earlyGrowthBoost);
  return Math.max(1, computed);
}

export function calculateSlotStageFromProgress(progressPoints: number, totalStages: number): number {
  const safeProgress = Math.max(0, Number(progressPoints) || 0);
  const safeTotalStages = Math.max(1, Number(totalStages) || 1);
  return Math.min(safeTotalStages, Math.max(1, Math.floor(safeProgress / 120) + 1));
}
