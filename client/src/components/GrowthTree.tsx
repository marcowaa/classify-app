import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { TreePine, Sparkles, Droplets, ChevronDown, Lock, Check, Crown, Flame } from "lucide-react";
import { FaSeedling, FaTools, FaPalette, FaFire, FaGift } from "react-icons/fa";
import { TREE_STAGE_ICONS, STAGE_COLORS } from "./TreeStageIcons";

// ─── Interfaces ───────────────────────────────────────
interface GrowthTreeData {
  tree: {
    id: string;
    childId: string;
    currentStage: number;
    totalGrowthPoints: number;
    tasksCompleted: number;
    gamesPlayed: number;
    rewardsEarned: number;
    wateringsCount: number;
    lastGrowthAt: string | null;
    createdAt: string;
  };
  stages: { stage: number; name: string; minPoints: number }[];
  currentStageName: string;
  nextStageName: string | null;
  pointsToNextStage: number;
  progress: number;
  recentEvents: any[];
  stageIcons?: string[];
}

interface WateringInfo {
  wateringEnabled: boolean;
  wateringCostPoints: number;
  wateringGrowthPoints: number;
  maxWateringsPerDay: number;
  wateringsToday: number;
  remainingWateringsToday: number;
}

interface GardenToolConfig {
  costPoints: number;
  growthPoints: number;
}

interface GardenCatalogData {
  seeds: {
    id: string;
    labelEn?: string;
    labelAr?: string;
    type: "tree" | "flower";
    rarity: string;
    stages: number;
    descriptionEn?: string;
    descriptionAr?: string;
    isActive?: boolean;
  }[];
  tools: {
    water: GardenToolConfig;
    fertilizer: GardenToolConfig;
    pruner: GardenToolConfig;
    spray: GardenToolConfig;
  };
}

interface GardenSlotState {
  seedId: string;
  progressPoints: number;
  stage: number;
  totalStages: number;
  plantedAt: string;
  careCount: number;
}

interface GardenStateData {
  slots: Array<GardenSlotState | null>;
  beautyScore: number;
  insights?: {
    totalSlots: number;
    plantedCount: number;
    emptySlots: number;
    readyToHarvestCount: number;
    plotUsagePercent: number;
    averageCarePerPlant: number;
    recommendedAction: "harvest" | "plant" | "care";
  };
  economy?: {
    totalSpentPoints: number;
    totalHarvestPoints: number;
    netPoints: number;
    plantedCount: number;
    harvestedCount: number;
    toolUsesCount: number;
    lastActionAt: string | null;
  };
  updatedAt: string;
}

interface GardenDailyEventData {
  id: string;
  titleAr: string;
  titleEn: string;
  growthMultiplier: number;
  harvestMultiplier: number;
}

interface GardenDailyQuestData {
  id: "plant" | "care" | "harvest";
  titleAr: string;
  titleEn: string;
  target: number;
  progress: number;
  rewardPoints: number;
  claimed: boolean;
}

interface GardenDailyData {
  dayKey: string;
  event: GardenDailyEventData;
  quests: GardenDailyQuestData[];
  allCompleted: boolean;
  allClaimed: boolean;
  allRewardPoints: number;
}

interface GardenWeeklyQuestData {
  id: "plant" | "care" | "harvest";
  titleAr: string;
  titleEn: string;
  target: number;
  progress: number;
}

interface GardenWeeklyData {
  weekKey: string;
  quests: GardenWeeklyQuestData[];
  allCompleted: boolean;
  claimed: boolean;
  rewardPoints: number;
}

type GardenThemeId = "sunny" | "moonlight" | "rainbow" | "blossom";

const DEFAULT_GARDEN_SEEDS: GardenCatalogData["seeds"] = [
  { id: "olive", type: "tree", rarity: "common", stages: 50, labelAr: "زيتون", labelEn: "Olive", descriptionAr: "شجرة زيتون قوية تتحمل الطقس.", descriptionEn: "A resilient olive tree.", isActive: true },
  { id: "apple", type: "tree", rarity: "common", stages: 50, labelAr: "تفاح", labelEn: "Apple", descriptionAr: "شجرة تفاح بثمار موسمية.", descriptionEn: "A seasonal apple tree.", isActive: true },
  { id: "orange", type: "tree", rarity: "common", stages: 50, labelAr: "برتقال", labelEn: "Orange", descriptionAr: "شجرة حمضيات زاهية.", descriptionEn: "A bright citrus tree.", isActive: true },
  { id: "mango", type: "tree", rarity: "rare", stages: 50, labelAr: "مانجو", labelEn: "Mango", descriptionAr: "شجرة استوائية سريعة النمو.", descriptionEn: "A tropical fast-growing tree.", isActive: true },
  { id: "rose", type: "flower", rarity: "common", stages: 50, labelAr: "ورد", labelEn: "Rose", descriptionAr: "وردة عطرية جميلة.", descriptionEn: "A fragrant rose flower.", isActive: true },
  { id: "tulip", type: "flower", rarity: "common", stages: 50, labelAr: "توليب", labelEn: "Tulip", descriptionAr: "زهرة توليب ملونة.", descriptionEn: "A colorful tulip flower.", isActive: true },
  { id: "sunflower", type: "flower", rarity: "common", stages: 50, labelAr: "عباد الشمس", labelEn: "Sunflower", descriptionAr: "زهرة تتبع الشمس.", descriptionEn: "A flower that follows the sun.", isActive: true },
  { id: "lavender", type: "flower", rarity: "rare", stages: 50, labelAr: "لافندر", labelEn: "Lavender", descriptionAr: "زهرة بنفسجية هادئة.", descriptionEn: "A calm purple flower.", isActive: true },
];

const DEFAULT_GARDEN_TOOLS: GardenCatalogData["tools"] = {
  water: { costPoints: 10, growthPoints: 15 },
  fertilizer: { costPoints: 20, growthPoints: 35 },
  pruner: { costPoints: 15, growthPoints: 22 },
  spray: { costPoints: 12, growthPoints: 18 },
};

// ─── Biome System ─────────────────────────────────────
interface BiomeConfig {
  skyGradient: string;
  skyGradientDark: string;
  groundGradient: string;
  groundGradientDark: string;
  accentColor: string;
}

const BIOMES: BiomeConfig[] = [
  {
    skyGradient: "linear-gradient(180deg, #87CEEB 0%, #B0E0E6 40%, #E0F7FA 70%, #C8E6C9 100%)",
    skyGradientDark: "linear-gradient(180deg, #1a3a4a 0%, #1e3d3d 40%, #1b3326 70%, #0d2818 100%)",
    groundGradient: "linear-gradient(180deg, #7ed957 0%, #57c84d 32%, #3faa3b 70%, #2f8f2f 100%)",
    groundGradientDark: "linear-gradient(180deg, #2f8f2f 0%, #237a2a 35%, #1d6423 70%, #174f1c 100%)",
    accentColor: "#4CAF50",
  },
  {
    skyGradient: "linear-gradient(180deg, #FF8C00 0%, #FFB347 25%, #FFD700 50%, #87CEEB 80%, #228B22 100%)",
    skyGradientDark: "linear-gradient(180deg, #4a2800 0%, #3d2600 25%, #2d2200 50%, #1a2f1a 80%, #0d1f0d 100%)",
    groundGradient: "linear-gradient(180deg, #4caf50 0%, #3f9b46 35%, #2f8f3a 70%, #267d31 100%)",
    groundGradientDark: "linear-gradient(180deg, #267d31 0%, #216c2b 35%, #1a5a23 70%, #15491d 100%)",
    accentColor: "#FF8C00",
  },
  {
    skyGradient: "linear-gradient(180deg, #4B0082 0%, #6A0DAD 25%, #9370DB 50%, #DDA0DD 75%, #8FBC8F 100%)",
    skyGradientDark: "linear-gradient(180deg, #1a0033 0%, #2a0550 25%, #2d1854 50%, #2a1a2d 80%, #0d2818 100%)",
    groundGradient: "linear-gradient(180deg, #6aa84f 0%, #5f9f45 35%, #4f8f3a 70%, #3f7f30 100%)",
    groundGradientDark: "linear-gradient(180deg, #355f2a 0%, #2d5423 35%, #25471d 70%, #1d3917 100%)",
    accentColor: "#9370DB",
  },
  {
    skyGradient: "linear-gradient(180deg, #0B0033 0%, #1A0066 20%, #330099 40%, #6600CC 60%, #FFD700 90%, #DAA520 100%)",
    skyGradientDark: "linear-gradient(180deg, #050019 0%, #0D0033 20%, #1A004D 40%, #330066 60%, #4D3600 90%, #3D2A00 100%)",
    groundGradient: "linear-gradient(180deg, #5c9f3a 0%, #4f8a31 35%, #437529 70%, #356020 100%)",
    groundGradientDark: "linear-gradient(180deg, #2c4f1d 0%, #27441a 35%, #203815 70%, #192d11 100%)",
    accentColor: "#FFD700",
  },
  {
    skyGradient: "linear-gradient(180deg, #000011 0%, #0a0029 25%, #150050 50%, #3b0076 70%, #7b2ff0 90%, #9400D3 100%)",
    skyGradientDark: "linear-gradient(180deg, #000008 0%, #050015 25%, #0a0028 50%, #1d003b 70%, #3d1778 90%, #4a006a 100%)",
    groundGradient: "linear-gradient(180deg, #3a7f3a 0%, #2f6e33 35%, #245d2b 70%, #1b4b22 100%)",
    groundGradientDark: "linear-gradient(180deg, #1f4a26 0%, #1a3f21 35%, #14341b 70%, #0f2a15 100%)",
    accentColor: "#9400D3",
  },
];

function getBiome(stage: number): BiomeConfig {
  if (stage <= 4) return BIOMES[0];
  if (stage <= 8) return BIOMES[1];
  if (stage <= 12) return BIOMES[2];
  if (stage <= 16) return BIOMES[3];
  return BIOMES[4];
}

type SeasonKey = "spring" | "summer" | "autumn" | "winter";

interface SeasonScene {
  key: SeasonKey;
  label: string;
  sky: string;
  field: string;
  particle: string;
  accent: string;
}

function getSeasonScene(stage: number, isRTL: boolean): SeasonScene {
  const seasonIdx = ((Math.max(1, stage) - 1) % 4 + 4) % 4;
  const scenes: SeasonScene[] = [
    {
      key: "spring",
      label: isRTL ? "الربيع" : "Spring",
      sky: "linear-gradient(180deg, #b8ecff 0%, #d8f7ff 35%, #b8f08a 100%)",
      field: "linear-gradient(180deg, #8be14b 0%, #74cc3d 45%, #5fb134 100%)",
      particle: "🌸",
      accent: "#ec4899",
    },
    {
      key: "summer",
      label: isRTL ? "الصيف" : "Summer",
      sky: "linear-gradient(180deg, #7ed7ff 0%, #bcecff 40%, #7fd153 100%)",
      field: "linear-gradient(180deg, #77ca3f 0%, #61b533 48%, #4f9f2c 100%)",
      particle: "✨",
      accent: "#f59e0b",
    },
    {
      key: "autumn",
      label: isRTL ? "الخريف" : "Autumn",
      sky: "linear-gradient(180deg, #ffd8a1 0%, #ffe9c9 35%, #d8c06f 100%)",
      field: "linear-gradient(180deg, #7fb44c 0%, #6b993f 45%, #547a32 100%)",
      particle: "🍂",
      accent: "#f97316",
    },
    {
      key: "winter",
      label: isRTL ? "الشتاء" : "Winter",
      sky: "linear-gradient(180deg, #c3d8ee 0%, #e5edf7 35%, #b7d6b3 100%)",
      field: "linear-gradient(180deg, #7db48d 0%, #5f9f75 45%, #4d8661 100%)",
      particle: "❄️",
      accent: "#60a5fa",
    },
  ];

  return scenes[seasonIdx];
}

function FarmCardBackground({ isDark, stage, isRTL, rich = true }: { isDark: boolean; stage: number; isRTL: boolean; rich?: boolean }) {
  const season = getSeasonScene(stage, isRTL);
  const particleRand = useMemo(() => seededRandom(stage * 37 + 17), [stage]);
  const plotTiles = [
    { x: 12, y: 20 }, { x: 32, y: 18 }, { x: 52, y: 20 }, { x: 72, y: 18 },
    { x: 8, y: 33 }, { x: 28, y: 31 }, { x: 48, y: 33 }, { x: 68, y: 31 }, { x: 84, y: 33 },
    { x: 12, y: 46 }, { x: 34, y: 44 }, { x: 56, y: 46 }, { x: 78, y: 44 },
    { x: 16, y: 60 }, { x: 38, y: 58 }, { x: 60, y: 60 }, { x: 82, y: 58 },
    { x: 22, y: 74 }, { x: 46, y: 72 }, { x: 70, y: 74 },
  ];

  const plotDecor = ["🌱", "🌿", "🍀", "🌾", "🪴", "🌼"];
  const cornerFlowers = ["🌼", "🌸", "🌻", "🪻"];

  const particles = useMemo(() => {
    const count = rich
      ? (season.key === "winter" ? 28 : season.key === "summer" ? 16 : 22)
      : (season.key === "winter" ? 10 : 8);
    return Array.from({ length: count }, (_, idx) => ({
      id: idx,
      x: 5 + particleRand() * 90,
      y: -8 - particleRand() * 30,
      drift: -18 + particleRand() * 36,
      duration: 6 + particleRand() * 8,
      delay: particleRand() * 4,
      size: 10 + particleRand() * 8,
    }));
  }, [particleRand, rich, season.key]);

  const visiblePlots = rich ? plotTiles : plotTiles.slice(0, 12);

  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? "linear-gradient(180deg, #204a2f 0%, #1f5b2f 35%, #1b4528 100%)"
            : season.sky,
        }}
      />

      <motion.div
        className="absolute inset-[-10%]"
        animate={rich ? { x: [-12, 14, -8], y: [-6, 6, -4], scale: [1.08, 1.12, 1.08] } : undefined}
        transition={rich ? { duration: 26, repeat: Infinity, ease: "easeInOut" } : undefined}
      >
        <div
          className="absolute inset-0"
          style={{
            background: isDark
              ? "linear-gradient(180deg, #2c6c3a 0%, #245d33 45%, #1f4d2c 100%)"
              : season.field,
          }}
        />

        <div
          className="absolute inset-0 opacity-45"
          style={{
            backgroundImage: isDark
              ? "linear-gradient(45deg, rgba(140,230,120,0.2) 25%, transparent 25%, transparent 75%, rgba(140,230,120,0.2) 75%, rgba(140,230,120,0.2)), linear-gradient(45deg, rgba(86,170,70,0.16) 25%, transparent 25%, transparent 75%, rgba(86,170,70,0.16) 75%, rgba(86,170,70,0.16))"
              : "linear-gradient(45deg, rgba(220,255,180,0.34) 25%, transparent 25%, transparent 75%, rgba(220,255,180,0.34) 75%, rgba(220,255,180,0.34)), linear-gradient(45deg, rgba(154,228,99,0.28) 25%, transparent 25%, transparent 75%, rgba(154,228,99,0.28) 75%, rgba(154,228,99,0.28))",
            backgroundSize: "64px 64px",
            backgroundPosition: "0 0, 32px 32px",
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 45%, rgba(0,0,0,0.18) 100%)",
          }}
        />

        {visiblePlots.map((plot, idx) => (
          <motion.div
            key={`farm-plot-${idx}`}
            className="absolute"
            animate={rich ? { y: [0, idx % 2 === 0 ? -1.5 : -0.5, 0] } : undefined}
            transition={rich ? { duration: 3.6 + (idx % 4) * 0.4, repeat: Infinity, ease: "easeInOut" } : undefined}
            style={{
              left: `${plot.x}%`,
              top: `${plot.y}%`,
              width: 74,
              height: 46,
              transform: `perspective(260px) rotateX(28deg) skewX(-16deg)`,
              borderRadius: 9,
              background: isDark
                ? "linear-gradient(180deg, rgba(132,86,43,0.9) 0%, rgba(98,62,30,0.95) 58%, rgba(74,47,23,0.98) 100%)"
                : "linear-gradient(180deg, rgba(205,139,76,0.96) 0%, rgba(156,97,51,0.95) 58%, rgba(116,71,38,0.98) 100%)",
              boxShadow: isDark
                ? "inset 0 1px 0 rgba(255,255,255,0.14), 0 10px 18px rgba(0,0,0,0.35)"
                : "inset 0 1px 0 rgba(255,255,255,0.28), 0 10px 18px rgba(66,44,22,0.32)",
            }}
          >
            <div
              className="absolute inset-[-4px] rounded-[11px]"
              style={{
                background: isDark
                  ? "linear-gradient(180deg, rgba(20,44,24,0.65), rgba(17,34,20,0.8))"
                  : "linear-gradient(180deg, rgba(95,170,66,0.4), rgba(72,133,53,0.55))",
                boxShadow: isDark
                  ? "inset 0 3px 8px rgba(0,0,0,0.55), inset 0 -2px 3px rgba(255,255,255,0.04)"
                  : "inset 0 3px 7px rgba(36,80,28,0.35), inset 0 -2px 4px rgba(255,255,255,0.3)",
              }}
            />
            <div
              className="absolute inset-x-1 top-0.5 h-1.5 rounded-full"
              style={{
                background: isDark
                  ? "linear-gradient(180deg, rgba(255,255,255,0.2), rgba(255,255,255,0.03))"
                  : "linear-gradient(180deg, rgba(255,255,255,0.45), rgba(255,255,255,0.08))",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.16), rgba(0,0,0,0.16) 2px, transparent 2px, transparent 7px)",
                opacity: isDark ? 0.48 : 0.34,
                borderRadius: 9,
              }}
            />
            <div className="absolute inset-x-2 bottom-1 h-2 rounded-sm opacity-35"
              style={{
                backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.2), rgba(0,0,0,0.2) 1px, transparent 1px, transparent 4px)",
              }}
            />
            <div className="absolute left-1/2 -translate-x-1/2 -top-3 text-base" style={{ transform: "translateX(-50%) skewX(16deg)" }}>
              {plotDecor[idx % plotDecor.length]}
            </div>
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-amber-800/55" />
            <div className="absolute -right-1 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-amber-800/55" />
          </motion.div>
        ))}
      </motion.div>

      <div
        className="absolute inset-x-0 bottom-0 h-[28%]"
        style={{
          background: isDark
            ? "linear-gradient(180deg, rgba(8,25,14,0) 0%, rgba(11,28,16,0.55) 55%, rgba(7,18,10,0.72) 100%)"
            : "linear-gradient(180deg, rgba(91,176,59,0) 0%, rgba(72,143,47,0.28) 55%, rgba(59,122,40,0.38) 100%)",
        }}
      />

      {rich && cornerFlowers.map((flower, idx) => (
        <motion.div
          key={`corner-flower-${idx}`}
          className="absolute text-lg"
          style={{
            left: idx % 2 === 0 ? `${3 + idx * 8}%` : undefined,
            right: idx % 2 !== 0 ? `${3 + idx * 8}%` : undefined,
            bottom: `${3 + (idx % 2) * 3}%`,
            opacity: isDark ? 0.55 : 0.82,
          }}
          animate={{ y: [0, -3, 0], rotate: [0, idx % 2 === 0 ? -4 : 4, 0] }}
          transition={{ duration: 3 + idx * 0.4, repeat: Infinity, ease: "easeInOut" }}
        >
          {flower}
        </motion.div>
      ))}

      {rich && season.key === "summer" && (
        <motion.div
          className="absolute right-8 top-10 w-16 h-16 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(255,226,120,0.95) 0%, rgba(255,184,43,0.75) 45%, rgba(255,184,43,0) 70%)",
            boxShadow: "0 0 42px rgba(251,191,36,0.58)",
          }}
          animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.88, 1, 0.88] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {rich && season.key === "winter" && (
        <motion.div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(226,239,255,0.1) 0%, rgba(226,239,255,0.24) 100%)" }}
          animate={{ opacity: [0.35, 0.52, 0.35] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {particles.map((particle) => (
        <motion.div
          key={`season-particle-${particle.id}`}
          className="absolute"
          initial={{ x: `${particle.x}%`, y: `${particle.y}%`, opacity: 0 }}
          animate={{
            x: `calc(${particle.x}% + ${particle.drift}px)`,
            y: "110%",
            opacity: season.key === "summer" ? [0, 0.55, 0] : [0, 0.9, 0],
            rotate: season.key === "winter" ? [0, 180, 360] : [-25, 18, -10],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            fontSize: `${particle.size}px`,
            color: season.accent,
            textShadow: "0 1px 2px rgba(0,0,0,0.2)",
          }}
        >
          {season.particle}
        </motion.div>
      ))}

      {rich && (
        <motion.div
          className="absolute left-[-20%] bottom-[20%] text-6xl"
          animate={{ x: [0, 260, 520], y: [0, -6, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
        >
          ☁️
        </motion.div>
      )}

      {rich && (
        <motion.div
          className="absolute right-[-15%] top-[23%] text-4xl"
          animate={{ x: [0, -220, -430], y: [0, 4, 0], opacity: [0, 0.75, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        >
          🐝
        </motion.div>
      )}
    </div>
  );
}

function getLocalDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getConsecutiveDaysFrom(startDate: Date, daySet: Set<string>): number {
  const cursor = new Date(startDate);
  let streak = 0;

  while (daySet.has(getLocalDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

// ─── Seeded Random (stable particles per render) ──────
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ─── Rain/Watering Animation ──────────────────────────
function WaterAnimation({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {/* Rain cloud */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: "5%" }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <svg width="80" height="30" viewBox="0 0 80 30">
          <ellipse cx="40" cy="15" rx="35" ry="12" fill="rgba(100,149,237,0.6)" />
          <ellipse cx="25" cy="12" rx="18" ry="10" fill="rgba(120,160,240,0.5)" />
          <ellipse cx="55" cy="12" rx="18" ry="10" fill="rgba(120,160,240,0.5)" />
        </svg>
      </motion.div>

      {/* Rain drops */}
      {Array.from({ length: 20 }, (_, i) => (
        <motion.div
          key={`rain-${i}`}
          className="absolute rounded-full"
          style={{
            left: `${25 + Math.random() * 50}%`,
            top: "15%",
            width: 2,
            height: 8,
            background: "linear-gradient(180deg, rgba(100,149,237,0.8), rgba(100,149,237,0.2))",
            borderRadius: 4,
          }}
          animate={{
            y: [0, 250],
            opacity: [0.8, 0],
          }}
          transition={{
            duration: 0.8 + Math.random() * 0.5,
            repeat: 3,
            delay: i * 0.08,
            ease: "easeIn",
          }}
        />
      ))}
    </div>
  );
}

// ─── Journey Map (Winding Path) ───────────────────────
function JourneyMap({
  stages,
  currentStage,
  stageIcons,
  isDark,
  isRTL,
  t,
  selectedStage,
  onSelectStage,
}: {
  stages: { stage: number; name: string; minPoints: number }[];
  currentStage: number;
  stageIcons: string[];
  isDark: boolean;
  isRTL: boolean;
  t: (key: string) => string;
  selectedStage: number | null;
  onSelectStage: (s: number | null) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const totalStages = stages.length;

  // Auto-scroll to current stage
  useEffect(() => {
    if (scrollRef.current) {
      const currentNode = scrollRef.current.querySelector(`[data-stage="${currentStage}"]`);
      if (currentNode) {
        currentNode.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentStage]);

  const biomeNames = ["springField", "bloomingForest", "magicMountain", "mythicalLand", "cosmicSpace"];
  const biomeLabels: Record<string, { en: string; ar: string }> = {
    springField: { en: "Spring Field", ar: "حقل الربيع" },
    bloomingForest: { en: "Blooming Forest", ar: "الغابة المزهرة" },
    magicMountain: { en: "Magic Mountain", ar: "الجبل السحري" },
    mythicalLand: { en: "Mythical Land", ar: "أرض الأساطير" },
    cosmicSpace: { en: "Cosmic Space", ar: "الفضاء الكوني" },
  };

  return (
    <div className="px-4 pb-3">
      <div
        ref={scrollRef}
        className="relative overflow-y-auto max-h-[300px] py-4 scrollbar-thin"
        style={{ scrollbarWidth: "thin" }}
      >
        <div className="relative flex flex-col items-center gap-0">
          {stages.map((stage, i) => {
            const unlocked = stage.stage <= currentStage;
            const isCurrent = stage.stage === currentStage;
            const isSelected = selectedStage === stage.stage;
            const color = STAGE_COLORS[i] || "#4CAF50";
            const StageIcon = TREE_STAGE_ICONS[i];
            const customIcon = stageIcons[i] && stageIcons[i].startsWith("/uploads/") ? stageIcons[i] : null;
            const x = (i % 2 === 0) ? -40 : 40;
            const biomeStart = i % 4 === 0;
            const biomeIdx = Math.floor(i / 4);
            const stageKey = `tree${stage.name.charAt(0).toUpperCase() + stage.name.slice(1)}`;

            return (
              <div key={stage.stage} data-stage={stage.stage} className="relative w-full flex flex-col items-center">
                {/* Biome divider */}
                {biomeStart && (
                  <motion.div
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    className={`w-[85%] mb-3 mt-1 py-1.5 px-3 rounded-full text-center text-[10px] font-bold tracking-wide ${isDark ? "bg-gray-700/50 text-gray-300" : "bg-gray-100 text-gray-600"
                      }`}
                    style={{
                      borderLeft: `3px solid ${BIOMES[biomeIdx]?.accentColor || "#4CAF50"}`,
                      borderRight: `3px solid ${BIOMES[biomeIdx]?.accentColor || "#4CAF50"}`,
                    }}
                  >
                    {isRTL
                      ? biomeLabels[biomeNames[biomeIdx]]?.ar || biomeNames[biomeIdx]
                      : biomeLabels[biomeNames[biomeIdx]]?.en || biomeNames[biomeIdx]}
                  </motion.div>
                )}

                {/* Connecting line to next */}
                {i < totalStages - 1 && (
                  <div className="absolute left-1/2 -translate-x-1/2 w-[2px] h-[calc(100%)]" style={{ top: 44 }}>
                    <div
                      className="w-full h-full"
                      style={{
                        background: unlocked
                          ? `linear-gradient(180deg, ${color}, ${STAGE_COLORS[i + 1] || color})`
                          : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                      }}
                    />
                    {/* Energy flow on path */}
                    {unlocked && (
                      <motion.div
                        className="absolute top-0 left-0 w-full rounded-full"
                        style={{
                          height: 8,
                          background: `radial-gradient(circle, ${color}cc, transparent)`,
                        }}
                        animate={{ top: ["0%", "100%"] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.15, ease: "linear" }}
                      />
                    )}
                  </div>
                )}

                {/* Stage node */}
                <div
                  className="relative flex items-center gap-3 py-2 z-10"
                  style={{ transform: `translateX(${x}px)` }}
                >
                  <motion.button
                    onClick={() => onSelectStage(isSelected ? null : stage.stage)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    className="relative rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      width: isCurrent ? 48 : 38,
                      height: isCurrent ? 48 : 38,
                      background: unlocked
                        ? `radial-gradient(circle at 35% 35%, ${color}ee, ${color}88)`
                        : isDark ? "rgba(60,60,80,0.6)" : "rgba(200,200,215,0.6)",
                      boxShadow: isCurrent
                        ? `0 0 20px ${color}66, 0 0 40px ${color}33`
                        : unlocked
                          ? `0 0 8px ${color}44`
                          : "none",
                      border: isCurrent
                        ? `2.5px solid ${color}`
                        : unlocked
                          ? `1.5px solid ${color}55`
                          : `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                      opacity: unlocked ? 1 : 0.4,
                    }}
                  >
                    {customIcon ? (
                      <img src={customIcon} alt="" className="rounded-full" style={{ width: isCurrent ? 32 : 24, height: isCurrent ? 32 : 24 }} />
                    ) : StageIcon ? (
                      <StageIcon size={isCurrent ? 32 : 24} />
                    ) : null}

                    {/* Lock icon for locked stages */}
                    {!unlocked && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
                        <Lock className="w-3.5 h-3.5 text-white/70" />
                      </div>
                    )}

                    {/* Pulsing ring for current */}
                    {isCurrent && (
                      <motion.div
                        className="absolute inset-[-5px] rounded-full border-2"
                        style={{ borderColor: color }}
                        animate={{ scale: [1, 1.3, 1], opacity: [0.7, 0, 0.7] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}

                    {/* Check for completed */}
                    {unlocked && !isCurrent && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </motion.button>

                  {/* Stage label */}
                  <div className={`min-w-0 ${isCurrent ? "" : ""}`}>
                    <p className={`text-xs font-bold truncate max-w-[120px] ${isCurrent
                      ? isDark ? "text-white" : "text-gray-900"
                      : unlocked
                        ? isDark ? "text-gray-300" : "text-gray-700"
                        : isDark ? "text-gray-600" : "text-gray-400"
                      }`}>
                      {t(stageKey)}
                    </p>
                    <p className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                      {isCurrent
                        ? isRTL ? "⭐ أنت هنا" : "⭐ You are here"
                        : unlocked
                          ? isRTL ? "✅ مفتوحة" : "✅ Unlocked"
                          : `🔒 ${stage.minPoints} ${t("points")}`}
                    </p>
                  </div>
                </div>

                {/* Selected stage detail popup */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`w-[80%] rounded-xl p-3 mb-2 text-center overflow-hidden ${isDark ? "bg-gray-800/90 border border-gray-600" : "bg-white/90 border border-gray-200"
                        }`}
                      style={{ backdropFilter: "blur(8px)" }}
                    >
                      <p className={`text-xs font-bold mb-1 ${isDark ? "text-white" : "text-gray-800"}`}>
                        {isRTL ? `المرحلة ${stage.stage} من ${totalStages}` : `Stage ${stage.stage} of ${totalStages}`}
                      </p>
                      <div
                        className="inline-block px-3 py-1 rounded-full text-[11px] font-bold text-white"
                        style={{ background: unlocked ? color : isDark ? "#4a5568" : "#a0aec0" }}
                      >
                        {unlocked
                          ? isRTL ? "✅ أكملت هذه المرحلة" : "✅ Completed"
                          : `🔒 ${stage.minPoints} ${t("points")} ${isRTL ? "مطلوبة" : "required"}`}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Celebration Overlay ──────────────────────────────
function CelebrationOverlay({
  show,
  stageName,
  stageNumber,
  color,
  isRTL,
  isBiomeChange,
  onDone,
}: {
  show: boolean;
  stageName: string;
  stageNumber: number;
  color: string;
  isRTL: boolean;
  isBiomeChange: boolean;
  onDone: () => void;
}) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onDone, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, onDone]);

  if (!show) return null;

  const confettiColors = ["#FFD700", "#FF6347", "#00CED1", "#FF69B4", "#7B68EE", "#32CD32", "#FF8C00"];

  return (
    <motion.div
      className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40 rounded-2xl" />

      {/* Confetti */}
      {Array.from({ length: isBiomeChange ? 40 : 20 }, (_, i) => (
        <motion.div
          key={`conf-${i}`}
          className="absolute rounded-sm"
          style={{
            left: `${Math.random() * 100}%`,
            top: "-5%",
            width: 6 + Math.random() * 6,
            height: 6 + Math.random() * 6,
            background: confettiColors[i % confettiColors.length],
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          }}
          animate={{
            y: [0, 500],
            x: [(Math.random() - 0.5) * 150],
            rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
            opacity: [1, 0],
          }}
          transition={{
            duration: 2.5 + Math.random() * 1.5,
            delay: Math.random() * 0.5,
            ease: "easeIn",
          }}
        />
      ))}

      {/* Center message */}
      <motion.div
        className="relative z-10 text-center px-8 py-6 rounded-3xl"
        style={{
          background: `radial-gradient(circle, ${color}dd, ${color}99)`,
          boxShadow: `0 0 60px ${color}66`,
        }}
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", damping: 12, stiffness: 200 }}
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: 2 }}
        >
          {isBiomeChange ? (
            <Crown className="w-12 h-12 mx-auto mb-2 text-white" />
          ) : (
            <Sparkles className="w-10 h-10 mx-auto mb-2 text-white" />
          )}
        </motion.div>
        <h3 className="text-xl font-black text-white mb-1">
          {isRTL ? "🎉 مبروك!" : "🎉 Level Up!"}
        </h3>
        <p className="text-white/90 font-semibold text-sm">
          {isRTL
            ? `وصلت إلى ${stageName}!`
            : `You reached ${stageName}!`}
        </p>
        {isBiomeChange && (
          <p className="text-white/75 text-xs mt-1">
            {isRTL ? "🌍 عالم جديد مفتوح!" : "🌍 New world unlocked!"}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Main GrowthTree Component ────────────────────────
export function GrowthTree() {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const token = localStorage.getItem("childToken");
  const isRTL = i18n.language === "ar";

  const [isExpanded, setIsExpanded] = useState(false);
  const [showWaterAnim, setShowWaterAnim] = useState(false);
  const [waterMessage, setWaterMessage] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationStage, setCelebrationStage] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"tree" | "journey">("tree");
  const [milestoneBurst, setMilestoneBurst] = useState<number | null>(null);
  const [selectedSeed, setSelectedSeed] = useState<string | null>(null);
  const [selectedPlot, setSelectedPlot] = useState<number | null>(null);
  const [seedCategory, setSeedCategory] = useState<"all" | "tree" | "flower">("all");
  const [hoveredSeed, setHoveredSeed] = useState<string | null>(null);
  const [showGardenRewardsRibbon, setShowGardenRewardsRibbon] = useState(false);
  const [openGardenPanel, setOpenGardenPanel] = useState<"seed" | "tools" | "themes" | "streak" | "daily" | "weekly" | null>(null);
  const [harvestBurst, setHarvestBurst] = useState<{ slotIndex: number; reward: number; id: number } | null>(null);
  const [harvestingSlotIndex, setHarvestingSlotIndex] = useState<number | null>(null);
  const [dragItem, setDragItem] = useState<
    | { kind: "seed"; seedId: string; label: string; icon: string }
    | { kind: "tool"; toolKey: "water" | "fertilizer" | "pruner" | "spray"; label: string; icon: string }
    | { kind: "theme"; themeId: GardenThemeId; label: string; icon: string }
    | null
  >(null);
  const [dragPointer, setDragPointer] = useState<{ x: number; y: number } | null>(null);
  const [hoveredDropPlot, setHoveredDropPlot] = useState<number | null>(null);
  const [plotThemes, setPlotThemes] = useState<Array<GardenThemeId | null>>([null, null, null, null]);
  const [lowMotionMode, setLowMotionMode] = useState(false);
  const [richSceneReady, setRichSceneReady] = useState(false);
  const dragRafRef = useRef<number | null>(null);
  const dragPendingPointRef = useRef<{ x: number; y: number } | null>(null);
  const prevStageRef = useRef<number>(0);
  const milestoneRef = useRef<number>(0);
  const milestoneInitRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const nav = window.navigator as Navigator & { deviceMemory?: number };
    const lowCpu = (nav.hardwareConcurrency ?? 8) <= 4;
    const lowMem = (nav.deviceMemory ?? 8) <= 4;

    const updateMotionMode = () => {
      setLowMotionMode(media.matches || lowCpu || lowMem);
    };

    updateMotionMode();

    if (media.addEventListener) {
      media.addEventListener("change", updateMotionMode);
      return () => media.removeEventListener("change", updateMotionMode);
    }

    media.addListener(updateMotionMode);
    return () => media.removeListener(updateMotionMode);
  }, []);

  useEffect(() => {
    if (!isExpanded) {
      setRichSceneReady(false);
      return;
    }
    if (lowMotionMode) {
      setRichSceneReady(false);
      return;
    }
    const timer = window.setTimeout(() => setRichSceneReady(true), 160);
    return () => window.clearTimeout(timer);
  }, [isExpanded, activeTab, lowMotionMode]);

  const handleToggleExpanded = useCallback(() => {
    setIsExpanded((prev) => {
      const next = !prev;
      // Keep all garden panels closed as the default state whenever the card is opened.
      if (next) {
        setOpenGardenPanel(null);
        setShowGardenRewardsRibbon(false);
      } else {
        setOpenGardenPanel(null);
        setDragItem(null);
        setHoveredDropPlot(null);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!harvestBurst) return;
    const timer = window.setTimeout(() => {
      setHarvestBurst((current) => (current?.id === harvestBurst.id ? null : current));
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [harvestBurst]);

  useEffect(() => {
    if (!dragItem) {
      setDragPointer(null);
      dragPendingPointRef.current = null;
      if (dragRafRef.current !== null) {
        window.cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
      return;
    }
    const onPointerMove = (event: PointerEvent) => {
      dragPendingPointRef.current = { x: event.clientX, y: event.clientY };
      if (dragRafRef.current !== null) return;

      dragRafRef.current = window.requestAnimationFrame(() => {
        dragRafRef.current = null;
        if (!dragPendingPointRef.current) return;
        setDragPointer(dragPendingPointRef.current);
      });
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDragItem(null);
      }
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("keydown", onEscape);
      if (dragRafRef.current !== null) {
        window.cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
    };
  }, [dragItem]);

  // ─── Data Queries ─────────────────────────────────
  const { data, isLoading, error } = useQuery<{ success: boolean; data: GrowthTreeData }>({
    queryKey: ["growth-tree"],
    queryFn: async () => {
      const res = await fetch("/api/child/growth-tree", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch growth tree");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: wateringData } = useQuery<{ success: boolean; data: WateringInfo }>({
    queryKey: ["watering-info"],
    queryFn: async () => {
      const res = await fetch("/api/child/watering-info", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch watering info");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: gardenCatalogData } = useQuery<{ success: boolean; data: GardenCatalogData }>({
    queryKey: ["garden-catalog"],
    queryFn: async () => {
      const res = await fetch("/api/child/garden-catalog", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch garden catalog");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: gardenStateData } = useQuery<{ success: boolean; data: GardenStateData }>({
    queryKey: ["garden-state"],
    queryFn: async () => {
      const res = await fetch("/api/child/garden-state", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch garden state");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: gardenDailyData } = useQuery<{ success: boolean; data: GardenDailyData }>({
    queryKey: ["garden-daily"],
    queryFn: async () => {
      const res = await fetch("/api/child/garden-daily", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch garden daily");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: gardenWeeklyData } = useQuery<{ success: boolean; data: GardenWeeklyData }>({
    queryKey: ["garden-weekly"],
    queryFn: async () => {
      const res = await fetch("/api/child/garden-weekly", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch garden weekly");
      return res.json();
    },
    enabled: !!token,
  });

  const dragDropSlots = gardenStateData?.data?.slots;
  const totalGardenPlots = Math.max(1, dragDropSlots?.length || 12);

  useEffect(() => {
    setPlotThemes((current) => {
      const next = [...current.slice(0, totalGardenPlots)];
      while (next.length < totalGardenPlots) next.push(null);
      return next;
    });

    setSelectedPlot((current) => {
      if (current === null) return null;
      return current < totalGardenPlots ? current : totalGardenPlots - 1;
    });
  }, [totalGardenPlots]);

  const wateringInfo = wateringData?.data;
  const canWater = wateringInfo?.wateringEnabled && (wateringInfo?.remainingWateringsToday || 0) > 0;

  const wateringStatusMessage = !wateringInfo?.wateringEnabled
    ? t("wateringLockedByAdmin")
    : (wateringInfo?.remainingWateringsToday || 0) <= 0
      ? t("wateringRefillTomorrow")
      : null;

  const growthStreak = useMemo(() => {
    const events = data?.data?.recentEvents || [];
    const daySet = new Set<string>();

    for (const event of events) {
      const raw = event?.occurredAt || event?.createdAt || event?.updatedAt;
      if (!raw) continue;
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) continue;
      daySet.add(getLocalDayKey(date));
    }

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const hasToday = daySet.has(getLocalDayKey(today));
    const hasYesterday = daySet.has(getLocalDayKey(yesterday));
    const streak = hasToday
      ? getConsecutiveDaysFrom(today, daySet)
      : hasYesterday
        ? getConsecutiveDaysFrom(yesterday, daySet)
        : 0;

    return {
      days: streak,
      isAtRisk: !hasToday && hasYesterday,
      hasToday,
    };
  }, [data?.data?.recentEvents]);

  const waterMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/child/water-tree", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to water tree");
      }
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["growth-tree"] });
      queryClient.invalidateQueries({ queryKey: ["watering-info"] });
      queryClient.invalidateQueries({ queryKey: ["child-profile"] });
      setShowWaterAnim(true);
      const pts = result.data?.growthPointsEarned || 0;
      setWaterMessage(`+${pts} ${t("growthPoints")} 🌱`);
      setTimeout(() => {
        setShowWaterAnim(false);
        setWaterMessage(null);
      }, 3000);
    },
    onError: (err: Error) => {
      const msg = err.message || "";
      if (msg.includes("Not enough points")) {
        setWaterMessage(t("wateringNeedPoints", { cost: wateringInfo?.wateringCostPoints || 0 }));
      } else if (msg.includes("Maximum daily waterings")) {
        setWaterMessage(t("wateringRefillTomorrow"));
      } else {
        setWaterMessage(t("wateringTryAgain"));
      }
      setTimeout(() => setWaterMessage(null), 2500);
    },
  });

  const toolMutation = useMutation({
    mutationFn: async ({ toolKey, slotIndex }: { toolKey: "water" | "fertilizer" | "pruner" | "spray"; slotIndex: number }) => {
      const res = await fetch("/api/child/use-garden-tool", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ toolKey, slotIndex }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.message || "Failed to use tool");
      }
      return payload;
    },
    onSuccess: (payload) => {
      queryClient.invalidateQueries({ queryKey: ["growth-tree"] });
      queryClient.invalidateQueries({ queryKey: ["child-profile"] });
      queryClient.invalidateQueries({ queryKey: ["garden-state"] });
      queryClient.invalidateQueries({ queryKey: ["garden-daily"] });
      queryClient.invalidateQueries({ queryKey: ["garden-weekly"] });
      setDragItem((current) => (current?.kind === "tool" ? null : current));
      const gained = payload?.data?.growthPointsEarned || 0;
      setWaterMessage(`+${gained} ${t("growthPoints")} 🌿`);
      setTimeout(() => setWaterMessage(null), 2200);
    },
    onError: (err: Error) => {
      setWaterMessage(err.message || t("error"));
      setTimeout(() => setWaterMessage(null), 2200);
    },
  });

  const plantMutation = useMutation({
    mutationFn: async ({ slotIndex, seedId }: { slotIndex: number; seedId: string }) => {
      const res = await fetch("/api/child/plant-seed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ slotIndex, seedId }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.message || "Failed to plant seed");
      }
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["garden-state"] });
      queryClient.invalidateQueries({ queryKey: ["garden-daily"] });
      queryClient.invalidateQueries({ queryKey: ["garden-weekly"] });
      setDragItem((current) => (current?.kind === "seed" ? null : current));
      setWaterMessage(t("wateringSuccess"));
      setTimeout(() => setWaterMessage(null), 2000);
    },
    onError: (err: Error) => {
      setWaterMessage(err.message || t("error"));
      setTimeout(() => setWaterMessage(null), 2200);
    },
  });

  const harvestMutation = useMutation({
    mutationFn: async (slotIndex: number) => {
      const res = await fetch("/api/child/harvest-garden-slot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ slotIndex }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.message || "Failed to harvest plant");
      }
      return payload;
    },
    onSuccess: (payload) => {
      queryClient.invalidateQueries({ queryKey: ["garden-state"] });
      queryClient.invalidateQueries({ queryKey: ["child-profile"] });
      queryClient.invalidateQueries({ queryKey: ["garden-daily"] });
      queryClient.invalidateQueries({ queryKey: ["garden-weekly"] });
      const reward = payload?.data?.rewardPoints || 0;
      const harvestedSlotIndex = Number(payload?.data?.slotIndex);
      setHarvestingSlotIndex(null);
      if (Number.isInteger(harvestedSlotIndex) && harvestedSlotIndex >= 0 && harvestedSlotIndex < totalGardenPlots) {
        setHarvestBurst({
          slotIndex: harvestedSlotIndex,
          reward,
          id: Date.now(),
        });
      }
      setWaterMessage(t("gardenHarvestSuccess", { points: reward }));
      setTimeout(() => setWaterMessage(null), 2200);
    },
    onError: (err: Error) => {
      setHarvestingSlotIndex(null);
      setWaterMessage(err.message || t("error"));
      setTimeout(() => setWaterMessage(null), 2200);
    },
  });

  const claimGardenDailyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/child/garden-daily/claim-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.message || "Failed to claim daily reward");
      }
      return payload;
    },
    onSuccess: (payload) => {
      queryClient.invalidateQueries({ queryKey: ["garden-daily"] });
      queryClient.invalidateQueries({ queryKey: ["child-profile"] });
      const gained = payload?.data?.rewardPoints || 0;
      setWaterMessage(`+${gained} ${t("points")} 🎁`);
      setTimeout(() => setWaterMessage(null), 2200);
    },
    onError: (err: Error) => {
      setWaterMessage(err.message || t("error"));
      setTimeout(() => setWaterMessage(null), 2200);
    },
  });

  const claimGardenWeeklyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/child/garden-weekly/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.message || "Failed to claim weekly reward");
      }
      return payload;
    },
    onSuccess: (payload) => {
      queryClient.invalidateQueries({ queryKey: ["garden-weekly"] });
      queryClient.invalidateQueries({ queryKey: ["child-profile"] });
      const gained = payload?.data?.rewardPoints || 0;
      setWaterMessage(`+${gained} ${t("points")} 🏆`);
      setTimeout(() => setWaterMessage(null), 2200);
    },
    onError: (err: Error) => {
      setWaterMessage(err.message || t("error"));
      setTimeout(() => setWaterMessage(null), 2200);
    },
  });

  const pickGardenItem = useCallback((item: NonNullable<typeof dragItem>, event?: { clientX: number; clientY: number }) => {
    if (event) {
      setDragPointer({ x: event.clientX, y: event.clientY });
    }
    setDragItem(item);
    setOpenGardenPanel(null);
  }, []);

  const themeCatalog: Array<{ id: GardenThemeId; icon: string; label: string; glow: string }> = [
    { id: "sunny", icon: "☀️", label: t("lightTheme"), glow: isDark ? "rgba(251,191,36,0.5)" : "rgba(245,158,11,0.45)" },
    { id: "moonlight", icon: "🌙", label: t("darkTheme"), glow: isDark ? "rgba(96,165,250,0.45)" : "rgba(59,130,246,0.35)" },
    { id: "rainbow", icon: "🌈", label: `${t("theme")} 🌈`, glow: "rgba(168,85,247,0.35)" },
    { id: "blossom", icon: "🌸", label: `${t("theme")} 🌸`, glow: "rgba(236,72,153,0.35)" },
  ];

  const resolveThemeMeta = (themeId: GardenThemeId | null) => {
    if (!themeId) return null;
    return themeCatalog.find((theme) => theme.id === themeId) || null;
  };

  const handleDropOnPlot = useCallback((slot: GardenSlotState | null, slotIndex: number) => {
    if (!dragItem) return false;

    if (dragItem.kind === "theme") {
      setPlotThemes((current) => {
        const next = [...current];
        next[slotIndex] = dragItem.themeId;
        return next;
      });
      setSelectedPlot(slotIndex);
      setWaterMessage(t("themeChanged"));
      setTimeout(() => setWaterMessage(null), 1500);
      setDragItem(null);
      return true;
    }

    if (dragItem.kind === "seed") {
      if (slot) {
        setWaterMessage(isRTL ? "هذا الحوض مزروع بالفعل" : "This plot is already planted");
        setTimeout(() => setWaterMessage(null), 1500);
        return true;
      }
      setSelectedSeed(dragItem.seedId);
      plantMutation.mutate({ slotIndex, seedId: dragItem.seedId });
      return true;
    }

    if (!slot) {
      setWaterMessage(t("gardenSelectPlotFirst"));
      setTimeout(() => setWaterMessage(null), 1500);
      return true;
    }

    setSelectedPlot(slotIndex);
    toolMutation.mutate({ toolKey: dragItem.toolKey, slotIndex });
    return true;
  }, [dragItem, isRTL, plantMutation, t, toolMutation]);

  useEffect(() => {
    if (!dragItem) {
      setHoveredDropPlot(null);
      return;
    }
    const onPointerUp = () => {
      if (hoveredDropPlot === null) return;
      const slot = dragDropSlots?.[hoveredDropPlot] || null;
      const handled = handleDropOnPlot(slot, hoveredDropPlot);
      if (handled) {
        setHoveredDropPlot(null);
      }
    };
    window.addEventListener("pointerup", onPointerUp);
    return () => window.removeEventListener("pointerup", onPointerUp);
  }, [dragItem, hoveredDropPlot, dragDropSlots, handleDropOnPlot]);

  // ─── Level-up Detection ───────────────────────────
  useEffect(() => {
    if (!data?.data) return;
    const cs = data.data.tree.currentStage;
    if (prevStageRef.current > 0 && cs > prevStageRef.current) {
      setCelebrationStage(cs);
      setShowCelebration(true);
    }
    prevStageRef.current = cs;
  }, [data?.data?.tree.currentStage]);

  // ─── Micro milestone detection (every 10%) ────────
  useEffect(() => {
    if (!data?.data) return;

    const p = Math.max(0, Math.min(100, Math.floor(data.data.progress || 0)));
    const milestone = Math.floor(p / 10) * 10;

    if (!milestoneInitRef.current) {
      milestoneRef.current = milestone;
      milestoneInitRef.current = true;
      return;
    }

    if (milestone < milestoneRef.current) {
      milestoneRef.current = milestone;
      return;
    }

    if (milestone >= 10 && milestone > milestoneRef.current) {
      milestoneRef.current = milestone;
      setMilestoneBurst(milestone);
      const timer = setTimeout(() => setMilestoneBurst(null), 1800);
      return () => clearTimeout(timer);
    }
  }, [data?.data?.progress, data?.data?.tree.currentStage]);

  // ─── Loading / Error ──────────────────────────────
  if (isLoading) {
    return (
      <div className={`rounded-3xl p-6 ${isDark ? "bg-gray-800" : "bg-white"} shadow-xl animate-pulse`}>
        <div className="h-[120px] bg-gray-300 dark:bg-gray-700 rounded-xl" />
      </div>
    );
  }

  if (error || !data?.data) return null;

  const { tree, stages, currentStageName, progress } = data.data;
  const currentStage = tree.currentStage;
  const totalStages = stages.length || 20;
  const stageIcons: string[] = data.data.stageIcons || [];

  const stageKey = `tree${currentStageName.charAt(0).toUpperCase() + currentStageName.slice(1)}`;

  const currentStageIdx = currentStage - 1;
  const currentStageColor = STAGE_COLORS[currentStageIdx] || "#4CAF50";
  const biome = getBiome(currentStage);
  const currentSeason = getSeasonScene(currentStage, isRTL);
  const gardenCatalog = gardenCatalogData?.data;
  const gardenState = gardenStateData?.data;
  const gardenDaily = gardenDailyData?.data;
  const gardenWeekly = gardenWeeklyData?.data;
  const toolPrices = gardenCatalog?.tools || DEFAULT_GARDEN_TOOLS;
  const plantedSlots = (gardenState?.slots && gardenState.slots.length > 0)
    ? gardenState.slots
    : Array.from({ length: totalGardenPlots }, () => null);
  const gardenInsights = gardenState?.insights;
  const gardenEconomy = gardenState?.economy || {
    totalSpentPoints: 0,
    totalHarvestPoints: 0,
    netPoints: 0,
    plantedCount: 0,
    harvestedCount: 0,
    toolUsesCount: 0,
    lastActionAt: null,
  };
  const seedNameMap: Record<string, { ar: string; en: string }> = {
    olive: { ar: "زيتون", en: "Olive" },
    apple: { ar: "تفاح", en: "Apple" },
    orange: { ar: "برتقال", en: "Orange" },
    mango: { ar: "مانجو", en: "Mango" },
    pomegranate: { ar: "رمان", en: "Pomegranate" },
    rose: { ar: "ورد جوري", en: "Rose" },
    tulip: { ar: "توليب", en: "Tulip" },
    sunflower: { ar: "عباد الشمس", en: "Sunflower" },
    lavender: { ar: "لافندر", en: "Lavender" },
    jasmine: { ar: "ياسمين", en: "Jasmine" },
  };

  const resolveSeedLabel = (seedId: string) => {
    const catalogSeed = gardenCatalog?.seeds?.find((item) => item.id === seedId);
    if (catalogSeed) {
      const preferred = isRTL ? catalogSeed.labelAr : catalogSeed.labelEn;
      const fallbackCatalog = isRTL ? catalogSeed.labelEn : catalogSeed.labelAr;
      if (preferred && preferred.trim()) return preferred;
      if (fallbackCatalog && fallbackCatalog.trim()) return fallbackCatalog;
    }
    const label = seedNameMap[seedId];
    if (!label) return seedId;
    return isRTL ? label.ar : label.en;
  };

  const resolveSeedDescription = (seedId: string) => {
    const seed = gardenCatalog?.seeds?.find((item) => item.id === seedId);
    if (!seed) return "";
    return isRTL ? (seed.descriptionAr || seed.descriptionEn || "") : (seed.descriptionEn || seed.descriptionAr || "");
  };

  const resolveSlotEmoji = (slot: GardenSlotState | null) => {
    if (!slot) return "🟫";
    const seed = gardenCatalog?.seeds?.find((item) => item.id === slot.seedId);
    const ratio = slot.totalStages > 0 ? slot.stage / slot.totalStages : 0;
    if (seed?.type === "flower") {
      if (ratio >= 1) return "🌸";
      if (ratio >= 0.66) return "🌷";
      if (ratio >= 0.33) return "🌱";
      return "🪴";
    }
    if (ratio >= 1) return "🌳";
    if (ratio >= 0.66) return "🌲";
    if (ratio >= 0.33) return "🌿";
    return "🌱";
  };

  const seedEvolutionMap: Record<string, string[]> = {
    olive: ["🌰", "🌱", "🌱", "🌿", "🌿", "🌿", "🌳", "🌳", "🌳", "🫒"],
    apple: ["🌰", "🌱", "🌱", "🌿", "🌿", "🌿", "🌳", "🌳", "🌳", "🍎"],
    orange: ["🌰", "🌱", "🌱", "🌿", "🌿", "🌿", "🌳", "🌳", "🌳", "🍊"],
    mango: ["🌰", "🌱", "🌱", "🌿", "🌿", "🌴", "🌴", "🌳", "🌳", "🥭"],
    pomegranate: ["🌰", "🌱", "🌱", "🌿", "🌿", "🌿", "🌳", "🌳", "🌳", "🍎"],
    rose: ["🫘", "🌱", "🌱", "🌿", "🌿", "🌷", "🌷", "🌹", "🌹", "🌹"],
    tulip: ["🫘", "🌱", "🌱", "🌿", "🌿", "🌷", "🌷", "🌷", "🌷", "🌷"],
    sunflower: ["🫘", "🌱", "🌱", "🌿", "🌿", "🌻", "🌻", "🌻", "🌻", "🌻"],
    lavender: ["🫘", "🌱", "🌱", "🌿", "🌿", "💜", "💜", "🪻", "🪻", "🪻"],
    jasmine: ["🫘", "🌱", "🌱", "🌿", "🌿", "🤍", "🌼", "🌼", "🌼", "🌼"],
  };

  const getSlotVisualStage50 = (slot: GardenSlotState | null) => {
    if (!slot || slot.totalStages <= 0) return 0;
    const normalized = Math.max(0, Math.min(1, slot.stage / slot.totalStages));
    return Math.max(1, Math.min(50, Math.round(normalized * 50)));
  };

  const getSlotVisualLevel100 = (slot: GardenSlotState | null) => {
    if (!slot || slot.totalStages <= 0) return 0;
    const normalized = Math.max(0, Math.min(1, slot.stage / slot.totalStages));
    return Math.max(1, Math.min(100, Math.round(normalized * 100)));
  };

  const resolveSeedStageVisual = (seedId: string, visualStage50: number) => {
    const evolution = seedEvolutionMap[seedId] || ["🌰", "🌱", "🌱", "🌿", "🌿", "🌿", "🌳", "🌳", "🌳", "🌸"];
    const normalized = Math.max(1, Math.min(50, visualStage50));
    const idx = Math.max(0, Math.min(9, Math.floor((normalized - 1) / 5)));
    return evolution[idx] || evolution[evolution.length - 1];
  };

  const availableSeeds = ((gardenCatalog?.seeds && gardenCatalog.seeds.length > 0) ? gardenCatalog.seeds : DEFAULT_GARDEN_SEEDS).filter((seed) => seed.isActive !== false);
  const visibleSeeds = availableSeeds.filter((seed) =>
    seedCategory === "all" ? true : seed.type === seedCategory
  );
  const focusedSeedId = hoveredSeed || selectedSeed || visibleSeeds[0]?.id || null;
  const focusedSeed = availableSeeds.find((seed) => seed.id === focusedSeedId) || null;

  const focusedSlot = plantedSlots.find((slot) => slot?.seedId === focusedSeedId) || null;
  const focusedVisual50 = getSlotVisualStage50(focusedSlot || null);
  const focusedVisual100 = getSlotVisualLevel100(focusedSlot || null);
  const readyToHarvestCount = gardenInsights?.readyToHarvestCount ?? plantedSlots.filter((slot) => slot && slot.stage >= slot.totalStages).length;
  const emptyPlotCount = gardenInsights?.emptySlots ?? plantedSlots.filter((slot) => !slot).length;
  const plotUsagePercent = gardenInsights?.plotUsagePercent ?? Math.round(((plantedSlots.length - emptyPlotCount) / Math.max(1, plantedSlots.length)) * 100);
  const averageCarePerPlant = gardenInsights?.averageCarePerPlant ?? 0;
  const smartActionLabel = gardenInsights?.recommendedAction === "harvest"
    ? t("gardenHarvest")
    : gardenInsights?.recommendedAction === "plant"
      ? t("gardenSelectSeed")
      : readyToHarvestCount > 0
        ? t("gardenHarvest")
        : emptyPlotCount > 0
          ? t("gardenSelectSeed")
          : canWater
            ? t("gardenToolWater")
            : t("gardenCareHint");
  const dailyCompletedCount = gardenDaily?.quests?.filter((quest) => quest.progress >= quest.target).length || 0;
  const dailyQuestCount = gardenDaily?.quests?.length || 0;
  const dailyEventTitle = gardenDaily
    ? (isRTL ? gardenDaily.event.titleAr : gardenDaily.event.titleEn)
    : "";
  const weeklyCompletedCount = gardenWeekly?.quests?.filter((quest) => quest.progress >= quest.target).length || 0;
  const weeklyQuestCount = gardenWeekly?.quests?.length || 0;

  const streakGoal = 7;
  const streakProgress = Math.min(100, Math.round((growthStreak.days / streakGoal) * 100));

  const isCelebrationBiomeChange = celebrationStage > 0 && celebrationStage % 4 === 1 && celebrationStage > 1;
  const celebrationColor = STAGE_COLORS[celebrationStage - 1] || "#4CAF50";
  const celebrationName = celebrationStage > 0 && stages[celebrationStage - 1]
    ? t(`tree${stages[celebrationStage - 1].name.charAt(0).toUpperCase() + stages[celebrationStage - 1].name.slice(1)}`)
    : "";

  return (
    <div className={`rounded-[30px] overflow-hidden shadow-[0_22px_48px_rgba(0,0,0,0.24)] border ${isDark ? "border-emerald-700/40" : "border-emerald-200/70"} ring-1 ${isDark ? "ring-white/5" : "ring-white/70"} relative`}>
      {/* ====== COLLAPSED STATE ====== */}
      <div
        className={`cursor-pointer select-none transition-all ${!isExpanded ? "px-4 py-3.5" : "px-4 pt-3 pb-0"
          }`}
        style={{
          background: !isExpanded
            ? isDark
              ? `linear-gradient(135deg, rgba(20,30,20,0.95), rgba(15,25,15,0.95))`
              : `linear-gradient(135deg, rgba(240,253,244,0.98), rgba(236,253,245,0.98))`
            : "transparent",
        }}
        onClick={handleToggleExpanded}
      >
        {!isExpanded ? (
          <div className="flex items-center gap-3">
            {/* Mini tree scene (collapsed) */}
            <div className="relative flex-shrink-0 w-[56px] h-[56px] rounded-2xl overflow-hidden">
              <div
                className="absolute inset-0"
                style={{ background: isDark ? biome.skyGradientDark : biome.skyGradient }}
              />
              <div
                className="absolute bottom-0 left-0 right-0 h-[35%]"
                style={{ background: isDark ? biome.groundGradientDark : biome.groundGradient }}
              />
              {/* Mini tree */}
              <div className="absolute inset-0 flex items-end justify-center pb-[30%]">
                <div className="relative">
                  <div style={{ width: 3, height: 14 + currentStage, background: isDark ? "#6D4C41" : "#5D4037", borderRadius: 2, margin: "0 auto" }} />
                  <motion.div
                    className="absolute bottom-[70%] left-1/2 -translate-x-1/2 rounded-full"
                    style={{
                      width: 12 + currentStage * 1.5,
                      height: 10 + currentStage * 1.2,
                      background: `radial-gradient(circle, ${currentStageColor}ee, ${currentStageColor}77)`,
                    }}
                    animate={{ scaleX: [1, 1.05, 0.95, 1] }}
                    transition={{ duration: 4, repeat: Infinity }}
                  />
                </div>
              </div>
              {/* Level badge */}
              <div
                className="absolute top-0.5 right-0.5 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8px] font-black text-white"
                style={{ background: currentStageColor, boxShadow: `0 0 6px ${currentStageColor}88` }}
              >
                {currentStage}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <TreePine className="w-4 h-4 text-green-500 flex-shrink-0" />
                <h2 className={`text-sm font-bold truncate ${isDark ? "text-white" : "text-gray-800"}`}>
                  {t("garden")}
                </h2>
              </div>
              <p className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {t("treeLevel")} {currentStage}/{totalStages} · {t(stageKey)}
              </p>

              {/* Progress bar */}
              <div className="mt-1.5 flex items-center gap-2">
                <div className={`flex-1 h-2 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-200"} overflow-hidden`}>
                  <motion.div
                    className="h-full rounded-full relative overflow-hidden"
                    style={{
                      width: `${Math.min(100, progress)}%`,
                      background: `linear-gradient(90deg, ${currentStageColor}99, ${currentStageColor})`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, progress)}%` }}
                    transition={{ duration: 1 }}
                  >
                    <motion.div
                      className="absolute inset-0"
                      style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)" }}
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                  </motion.div>
                </div>
                <span className={`text-[10px] font-bold flex-shrink-0 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  {Math.round(progress)}%
                </span>
              </div>

              {/* Watering indicator */}
              {wateringInfo?.wateringEnabled && (
                <div className="flex items-center gap-1 mt-1">
                  {Array.from({ length: wateringInfo.maxWateringsPerDay }, (_, i) => (
                    <Droplets
                      key={i}
                      className={`w-3 h-3 ${i < wateringInfo.remainingWateringsToday ? "text-blue-400" : isDark ? "text-gray-600" : "text-gray-300"}`}
                    />
                  ))}
                </div>
              )}

              <div className="mt-1.5 flex items-center gap-1.5">
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${isDark ? "bg-orange-900/25 text-orange-200" : "bg-orange-100 text-orange-700"}`}>
                  <Flame className="w-3 h-3" />
                  <span className="text-[10px] font-bold">{growthStreak.days}</span>
                </div>
                <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDark ? "bg-gray-700" : "bg-gray-200"}`}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #fb923c, #f97316)" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${streakProgress}%` }}
                    transition={{ duration: 0.7 }}
                  />
                </div>
              </div>
            </div>

            {/* Expand arrow */}
            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <ChevronDown className={`w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
            </motion.div>
          </div>
        ) : (
          /* Expanded header */
          <div className="relative z-20 flex justify-start">
            <div className="flex items-center">
              <motion.div animate={{ rotate: 180 }} transition={{ duration: 0.3 }}>
                <ChevronDown className={`w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
              </motion.div>
            </div>
          </div>
        )}
      </div>

      {/* ====== EXPANDED CONTENT ====== */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            {/* ── Tree View Tab ── */}
            {activeTab === "tree" && (
              <div className="relative" style={{ minHeight: 640 }}>
                <FarmCardBackground isDark={isDark} stage={currentStage} isRTL={isRTL} rich={!lowMotionMode && richSceneReady} />

                <div className="absolute top-0 left-0 right-0 z-40 px-2 pt-2">
                  <div
                    className="rounded-2xl px-1.5 py-0.5 bg-transparent border border-transparent"
                    style={{ backdropFilter: "blur(0px)" }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/60 text-white flex items-center justify-center shadow-sm">🌿</span>
                        <p className={`text-[10px] font-black truncate ${isDark ? "text-emerald-100" : "text-emerald-900"}`}>
                          {isRTL ? "الحديقة" : "Garden"}
                        </p>
                        <span className={`text-[8px] font-extrabold whitespace-nowrap ${isDark ? "text-emerald-100/90" : "text-emerald-900/85"}`}>
                          {currentSeason.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title={isRTL ? "الشجرة" : "Tree"}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTab("tree");
                          }}
                          className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors shadow-sm ${isDark
                            ? "bg-emerald-700/95 border-emerald-400 text-white"
                            : "bg-emerald-500/95 border-emerald-300 text-white"
                            }`}
                        >
                          <TreePine className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title={isRTL ? "الرحلة" : "Journey"}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTab("journey");
                          }}
                          className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors shadow-sm ${isDark
                            ? "bg-gray-900/55 border-gray-500 text-gray-300"
                            : "bg-white/18 border-white/30 text-cyan-700"
                            }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top controls row */}
                <div className={`absolute top-10 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 rounded-2xl border px-2.5 py-2 ${isDark
                  ? "bg-emerald-950/62 border-emerald-700/60 shadow-[0_10px_26px_rgba(0,0,0,0.35)]"
                  : "bg-white/86 border-emerald-300/90 shadow-[0_10px_24px_rgba(28,118,76,0.22)]"
                  }`}
                  style={{ backdropFilter: "blur(8px)" }}>
                  <button
                    type="button"
                    title={t("gardenSelectSeed")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSeedCategory("all");
                      setOpenGardenPanel((prev) => (prev === "seed" ? null : "seed"));
                      const firstSeed = visibleSeeds[0]?.id || availableSeeds[0]?.id || null;
                      if (firstSeed) setSelectedSeed(firstSeed);
                    }}
                    className={`group relative w-11 h-11 sm:w-10 sm:h-10 rounded-2xl border-2 flex items-center justify-center transition-all duration-200 ${openGardenPanel === "seed"
                      ? isDark
                        ? "bg-gradient-to-br from-emerald-500/95 to-lime-500/90 border-lime-200 text-white scale-105 shadow-[0_8px_18px_rgba(16,185,129,0.45)]"
                        : "bg-gradient-to-br from-emerald-300 to-lime-300 border-emerald-500 text-emerald-900 scale-105 shadow-[0_8px_18px_rgba(52,211,153,0.4)]"
                      : isDark
                        ? "bg-emerald-900/72 border-emerald-700 text-emerald-100 hover:bg-emerald-800/90 hover:scale-105"
                        : "bg-gradient-to-br from-white to-emerald-50 border-emerald-300 text-emerald-700 hover:from-emerald-50 hover:to-lime-50 hover:scale-105"
                      }`}
                  >
                    <FaSeedling className="w-[18px] h-[18px] sm:w-4 sm:h-4" />
                    <span className="absolute -top-1 -right-1 text-[11px] leading-none">🌱</span>
                  </button>
                  <button
                    type="button"
                    title={t("gardenTools")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenGardenPanel((prev) => (prev === "tools" ? null : "tools"));
                      setSelectedPlot((prev) => (prev === null ? 0 : prev));
                    }}
                    className={`group relative w-11 h-11 sm:w-10 sm:h-10 rounded-2xl border-2 flex items-center justify-center transition-all duration-200 ${openGardenPanel === "tools"
                      ? isDark
                        ? "bg-gradient-to-br from-cyan-500/95 to-sky-500/92 border-cyan-100 text-white scale-105 shadow-[0_8px_18px_rgba(14,165,233,0.45)]"
                        : "bg-gradient-to-br from-cyan-200 to-sky-300 border-cyan-500 text-cyan-900 scale-105 shadow-[0_8px_18px_rgba(56,189,248,0.38)]"
                      : isDark
                        ? "bg-cyan-900/72 border-cyan-700 text-cyan-100 hover:bg-cyan-800/90 hover:scale-105"
                        : "bg-gradient-to-br from-white to-cyan-50 border-cyan-300 text-cyan-700 hover:from-cyan-50 hover:to-sky-50 hover:scale-105"
                      }`}
                  >
                    <FaTools className="w-[18px] h-[18px] sm:w-4 sm:h-4" />
                    <span className="absolute -top-1 -right-1 text-[11px] leading-none">🛠️</span>
                  </button>
                  <button
                    type="button"
                    title={t("theme")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenGardenPanel((prev) => (prev === "themes" ? null : "themes"));
                    }}
                    className={`group relative w-11 h-11 sm:w-10 sm:h-10 rounded-2xl border-2 flex items-center justify-center transition-all duration-200 ${openGardenPanel === "themes"
                      ? isDark
                        ? "bg-gradient-to-br from-violet-500/95 to-fuchsia-500/90 border-violet-100 text-white scale-105 shadow-[0_8px_18px_rgba(168,85,247,0.45)]"
                        : "bg-gradient-to-br from-violet-200 to-fuchsia-200 border-violet-500 text-violet-900 scale-105 shadow-[0_8px_18px_rgba(167,139,250,0.4)]"
                      : isDark
                        ? "bg-violet-900/72 border-violet-700 text-violet-100 hover:bg-violet-800/90 hover:scale-105"
                        : "bg-gradient-to-br from-white to-violet-50 border-violet-300 text-violet-700 hover:from-violet-50 hover:to-fuchsia-50 hover:scale-105"
                      }`}
                  >
                    <FaPalette className="w-[18px] h-[18px] sm:w-4 sm:h-4" />
                    <span className="absolute -top-1 -right-1 text-[11px] leading-none">🎨</span>
                  </button>
                  <button
                    type="button"
                    title={t("streakTitle")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenGardenPanel((prev) => (prev === "streak" ? null : "streak"));
                    }}
                    className={`group relative w-11 h-11 sm:w-10 sm:h-10 rounded-2xl border-2 flex items-center justify-center transition-all duration-200 ${openGardenPanel === "streak"
                      ? isDark
                        ? "bg-gradient-to-br from-orange-500/95 to-amber-500/92 border-orange-100 text-white scale-105 shadow-[0_8px_18px_rgba(249,115,22,0.45)]"
                        : "bg-gradient-to-br from-orange-200 to-amber-200 border-orange-500 text-orange-900 scale-105 shadow-[0_8px_18px_rgba(251,146,60,0.4)]"
                      : isDark
                        ? "bg-orange-900/72 border-orange-700 text-orange-100 hover:bg-orange-800/90 hover:scale-105"
                        : "bg-gradient-to-br from-white to-orange-50 border-orange-300 text-orange-700 hover:from-orange-50 hover:to-amber-50 hover:scale-105"
                      }`}
                  >
                    <FaFire className="w-[18px] h-[18px] sm:w-4 sm:h-4" />
                    <span className="absolute -top-1 -right-1 text-[11px] leading-none">🔥</span>
                  </button>
                  <button
                    type="button"
                    title={t("today")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenGardenPanel((prev) => (prev === "daily" ? null : "daily"));
                    }}
                    className={`group relative w-11 h-11 sm:w-10 sm:h-10 rounded-2xl border-2 flex items-center justify-center transition-all duration-200 ${openGardenPanel === "daily"
                      ? isDark
                        ? "bg-gradient-to-br from-indigo-500/95 to-blue-500/92 border-indigo-100 text-white scale-105 shadow-[0_8px_18px_rgba(99,102,241,0.45)]"
                        : "bg-gradient-to-br from-indigo-200 to-blue-200 border-indigo-500 text-indigo-900 scale-105 shadow-[0_8px_18px_rgba(99,102,241,0.35)]"
                      : isDark
                        ? "bg-indigo-900/72 border-indigo-700 text-indigo-100 hover:bg-indigo-800/90 hover:scale-105"
                        : "bg-gradient-to-br from-white to-indigo-50 border-indigo-300 text-indigo-700 hover:from-indigo-50 hover:to-blue-50 hover:scale-105"
                      }`}
                  >
                    <Sparkles className="w-[18px] h-[18px] sm:w-4 sm:h-4" />
                    <span className="absolute -top-1 -right-1 text-[11px] leading-none">📆</span>
                  </button>
                  <button
                    type="button"
                    title={t("weekly")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenGardenPanel((prev) => (prev === "weekly" ? null : "weekly"));
                    }}
                    className={`group relative w-11 h-11 sm:w-10 sm:h-10 rounded-2xl border-2 flex items-center justify-center transition-all duration-200 ${openGardenPanel === "weekly"
                      ? isDark
                        ? "bg-gradient-to-br from-cyan-500/95 to-teal-500/92 border-cyan-100 text-white scale-105 shadow-[0_8px_18px_rgba(6,182,212,0.45)]"
                        : "bg-gradient-to-br from-cyan-200 to-teal-200 border-cyan-500 text-cyan-900 scale-105 shadow-[0_8px_18px_rgba(6,182,212,0.35)]"
                      : isDark
                        ? "bg-cyan-900/72 border-cyan-700 text-cyan-100 hover:bg-cyan-800/90 hover:scale-105"
                        : "bg-gradient-to-br from-white to-cyan-50 border-cyan-300 text-cyan-700 hover:from-cyan-50 hover:to-teal-50 hover:scale-105"
                      }`}
                  >
                    <Crown className="w-[18px] h-[18px] sm:w-4 sm:h-4" />
                    <span className="absolute -top-1 -right-1 text-[11px] leading-none">🏆</span>
                  </button>
                  <button
                    type="button"
                    title={t("rewards")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowGardenRewardsRibbon((prev) => !prev);
                    }}
                    className={`group relative w-11 h-11 sm:w-10 sm:h-10 rounded-2xl border-2 flex items-center justify-center transition-all duration-200 ${showGardenRewardsRibbon
                      ? isDark
                        ? "bg-gradient-to-br from-amber-500/95 to-yellow-500/92 border-amber-100 text-white scale-105 shadow-[0_8px_18px_rgba(245,158,11,0.48)]"
                        : "bg-gradient-to-br from-amber-200 to-yellow-200 border-amber-500 text-amber-900 scale-105 shadow-[0_8px_18px_rgba(251,191,36,0.4)]"
                      : isDark
                        ? "bg-amber-900/72 border-amber-700 text-amber-100 hover:bg-amber-800/90 hover:scale-105"
                        : "bg-gradient-to-br from-white to-amber-50 border-amber-300 text-amber-700 hover:from-amber-50 hover:to-yellow-50 hover:scale-105"
                      }`}
                  >
                    <FaGift className="w-[18px] h-[18px] sm:w-4 sm:h-4" />
                    <span className="absolute -top-1 -right-1 text-[11px] leading-none">🎁</span>
                  </button>
                </div>

                <div
                  className={`absolute top-[5.25rem] left-3 right-3 z-30 rounded-2xl border px-3 py-2 ${isDark
                      ? "bg-emerald-950/68 border-emerald-700/55 text-emerald-100"
                      : "bg-white/88 border-emerald-300/80 text-emerald-900"
                    }`}
                  style={{ backdropFilter: "blur(9px)" }}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] font-bold">
                    <div className={`rounded-lg px-2 py-1 ${isDark ? "bg-emerald-900/55" : "bg-emerald-50"}`}>
                      🌱 {t("gardenPlots")}: {gardenInsights?.plantedCount ?? plantedSlots.filter(Boolean).length}/{gardenInsights?.totalSlots ?? plantedSlots.length}
                    </div>
                    <div className={`rounded-lg px-2 py-1 ${isDark ? "bg-emerald-900/55" : "bg-emerald-50"}`}>
                      🧺 {t("gardenHarvest")}: {readyToHarvestCount}
                    </div>
                    <div className={`rounded-lg px-2 py-1 ${isDark ? "bg-emerald-900/55" : "bg-emerald-50"}`}>
                      🛠️ {t("gardenCareHint")}: {averageCarePerPlant}
                    </div>
                    <div className={`rounded-lg px-2 py-1 ${isDark ? "bg-emerald-900/55" : "bg-emerald-50"}`}>
                      🤖 {smartActionLabel}
                    </div>
                  </div>
                  <div className={`mt-2 h-1.5 rounded-full overflow-hidden ${isDark ? "bg-emerald-900/60" : "bg-emerald-100"}`}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg, #22c55e, #14b8a6)" }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(0, Math.min(100, plotUsagePercent))}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {showGardenRewardsRibbon && (
                    <motion.div
                      initial={{ opacity: 0, y: -14, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.98 }}
                      className={`absolute top-20 left-11 right-11 z-30 rounded-xl border px-3 py-2 ${isDark ? "bg-amber-900/85 border-amber-700 text-amber-100" : "bg-white/95 border-amber-300 text-amber-800"
                        }`}
                      style={{ backdropFilter: "blur(8px)" }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[11px] font-extrabold">{isRTL ? "مكافآت الحديقة" : "Garden Rewards"}</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowGardenRewardsRibbon(false);
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? "bg-amber-800/70" : "bg-amber-100"}`}
                        >
                          {isRTL ? "إغلاق" : "Close"}
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 text-[10px] font-bold">
                        <div className={`rounded-lg px-2 py-1 ${isDark ? "bg-amber-800/60" : "bg-amber-50"}`}>
                          🌿 {isRTL ? "جمال" : "Beauty"}: {gardenState?.beautyScore ?? 0}%
                        </div>
                        <div className={`rounded-lg px-2 py-1 ${isDark ? "bg-amber-800/60" : "bg-amber-50"}`}>
                          🧺 {isRTL ? "جاهز للحصاد" : "Harvest Ready"}: {readyToHarvestCount}
                        </div>
                        <div className={`rounded-lg px-2 py-1 ${isDark ? "bg-amber-800/60" : "bg-amber-50"}`}>
                          🔥 {isRTL ? "سلسلة" : "Streak"}: {growthStreak.days}
                        </div>
                        <div className={`rounded-lg px-2 py-1 ${isDark ? "bg-amber-800/60" : "bg-amber-50"}`}>
                          🤖 {isRTL ? "اقتراح" : "Smart"}: {smartActionLabel}
                        </div>
                        <div className={`rounded-lg px-2 py-1 ${isDark ? "bg-amber-800/60" : "bg-amber-50"}`}>
                          📆 {t("today")}: {dailyCompletedCount}/{dailyQuestCount}
                        </div>
                        <div className={`rounded-lg px-2 py-1 ${isDark ? "bg-amber-800/60" : "bg-amber-50"}`}>
                          🏆 {t("weekly")}: {weeklyCompletedCount}/{weeklyQuestCount}
                        </div>
                        <div className={`rounded-lg px-2 py-1 ${isDark ? "bg-amber-800/60" : "bg-amber-50"}`}>
                          💸 {gardenEconomy.totalSpentPoints} {t("points")}
                        </div>
                        <div className={`rounded-lg px-2 py-1 ${isDark ? "bg-amber-800/60" : "bg-amber-50"}`}>
                          💰 {gardenEconomy.totalHarvestPoints} {t("points")}
                        </div>
                        <div className={`rounded-lg px-2 py-1 ${isDark ? "bg-amber-800/60" : "bg-amber-50"}`}>
                          📈 {gardenEconomy.netPoints} {t("points")}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Water animation */}
                <AnimatePresence>
                  {showWaterAnim && <WaterAnimation active={showWaterAnim} />}
                </AnimatePresence>

                {/* Water message overlay */}
                <AnimatePresence>
                  {waterMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="absolute left-1/2 top-[35%] -translate-x-1/2 z-40 px-4 py-2 rounded-2xl bg-blue-500/90 text-white font-bold text-sm shadow-2xl pointer-events-none"
                      style={{ backdropFilter: "blur(4px)" }}
                    >
                      {waterMessage}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Micro reward unlock burst */}
                <AnimatePresence>
                  {milestoneBurst !== null && milestoneBurst >= 10 && milestoneBurst < 100 && (
                    <motion.div
                      initial={{ opacity: 0, y: 18, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -14, scale: 0.94 }}
                      className="absolute left-1/2 top-[22%] -translate-x-1/2 z-40 px-3.5 py-2 rounded-2xl bg-emerald-500/95 text-white font-bold text-xs shadow-2xl pointer-events-none"
                      style={{ backdropFilter: "blur(4px)" }}
                    >
                      {t("microRewardUnlocked", { percent: milestoneBurst })}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Redesigned Garden Control Panel */}
                <div className="absolute bottom-0 left-0 right-0 z-20">
                  <div className={`mx-3 mb-3 px-4 py-3 rounded-2xl ${isDark ? "bg-gray-900/52 border border-gray-700/45" : "bg-white/55 border border-emerald-200/70"
                    }`} style={{ backdropFilter: "blur(12px)" }}>
                    {openGardenPanel === "seed" && (
                      <div className={`mb-2.5 p-2.5 rounded-xl border ${isDark ? "bg-emerald-900/20 border-emerald-700/40" : "bg-emerald-50 border-emerald-200"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className={`text-[11px] font-bold ${isDark ? "text-emerald-200" : "text-emerald-700"}`}>{t("gardenSelectSeed")}</p>
                          <span className={`text-[10px] ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>{t("gardenPlots")}: {plantedSlots.filter(Boolean).length}/{plantedSlots.length}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 mb-2">
                          {([
                            { key: "all", label: isRTL ? "الكل" : "All" },
                            { key: "tree", label: isRTL ? "أشجار" : "Trees" },
                            { key: "flower", label: isRTL ? "ورود" : "Flowers" },
                          ] as const).map((category) => (
                            <button
                              key={category.key}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSeedCategory(category.key);
                              }}
                              className={`rounded-lg px-2 py-1.5 text-[10px] font-bold border transition-colors ${seedCategory === category.key
                                ? isDark
                                  ? "bg-emerald-700/50 border-emerald-400 text-emerald-100"
                                  : "bg-emerald-200 border-emerald-400 text-emerald-800"
                                : isDark
                                  ? "bg-gray-800 border-gray-600 text-gray-300"
                                  : "bg-white border-emerald-200 text-emerald-700"
                                }`}
                            >
                              {category.label}
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 max-h-[118px] overflow-y-auto pr-0.5">
                          {visibleSeeds.map((seed) => {
                            const active = selectedSeed === seed.id;
                            const seedSlot = plantedSlots.find((slot) => slot?.seedId === seed.id) || null;
                            const seedVisual = resolveSeedStageVisual(seed.id, getSlotVisualStage50(seedSlot));
                            return (
                              <button
                                key={seed.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSeed(seed.id);
                                  pickGardenItem({
                                    kind: "seed",
                                    seedId: seed.id,
                                    label: resolveSeedLabel(seed.id),
                                    icon: seedVisual,
                                  }, e);
                                }}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.effectAllowed = "move";
                                  e.dataTransfer.setData("text/plain", `seed:${seed.id}`);
                                  setSelectedSeed(seed.id);
                                  pickGardenItem({
                                    kind: "seed",
                                    seedId: seed.id,
                                    label: resolveSeedLabel(seed.id),
                                    icon: seedVisual,
                                  }, e);
                                }}
                                onMouseEnter={() => setHoveredSeed(seed.id)}
                                onMouseLeave={() => setHoveredSeed((prev) => (prev === seed.id ? null : prev))}
                                className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold border transition-colors text-start ${active
                                  ? isDark
                                    ? "bg-emerald-700/50 border-emerald-400 text-emerald-100"
                                    : "bg-emerald-200 border-emerald-400 text-emerald-800"
                                  : isDark
                                    ? "bg-gray-800 border-gray-600 text-gray-300"
                                    : "bg-white border-emerald-200 text-emerald-700"
                                  }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="truncate">{resolveSeedLabel(seed.id)}</span>
                                  <span className="text-sm leading-none">{seedVisual}</span>
                                </div>
                                <div className="opacity-80 mt-0.5">{seed.stages} {isRTL ? "مرحلة أصلية" : "base"}</div>
                              </button>
                            );
                          })}
                        </div>

                        <div className={`mt-2 rounded-lg p-2 border ${isDark ? "bg-gray-900/45 border-emerald-700/40" : "bg-white/80 border-emerald-200"}`}>
                          <div className="flex items-center justify-between">
                            <p className={`text-[10px] font-bold ${isDark ? "text-emerald-200" : "text-emerald-700"}`}>
                              {focusedSeed ? `${t("gardenSeedInfo")}: ${resolveSeedLabel(focusedSeed.id)}` : t("gardenCareHint")}
                            </p>
                            {focusedSeed && (
                              <span className="text-lg leading-none">
                                {resolveSeedStageVisual(focusedSeed.id, Math.max(1, focusedVisual50 || 1))}
                              </span>
                            )}
                          </div>
                          {focusedSeed && (
                            <>
                              <p className={`text-[10px] mt-0.5 ${isDark ? "text-emerald-100" : "text-emerald-700"}`}>
                                {resolveSeedDescription(focusedSeed.id) || t("gardenCareHint")}
                              </p>
                            </>
                          )}
                        </div>

                        <div className={`mt-2 rounded-xl border px-2.5 py-2 relative overflow-hidden ${isDark ? "bg-emerald-950/62 border-emerald-700/55" : "bg-gradient-to-b from-lime-200/95 via-green-300/95 to-emerald-300/95 border-green-500/85"
                          }`}>
                          <div className="absolute inset-0 pointer-events-none">
                            <div
                              className="absolute inset-0 opacity-35"
                              style={{
                                backgroundImage: isDark
                                  ? "linear-gradient(45deg, rgba(16,90,40,0.45) 25%, transparent 25%, transparent 75%, rgba(16,90,40,0.45) 75%, rgba(16,90,40,0.45)), linear-gradient(45deg, rgba(30,120,55,0.35) 25%, transparent 25%, transparent 75%, rgba(30,120,55,0.35) 75%, rgba(30,120,55,0.35))"
                                  : "linear-gradient(45deg, rgba(120,210,75,0.45) 25%, transparent 25%, transparent 75%, rgba(120,210,75,0.45) 75%, rgba(120,210,75,0.45)), linear-gradient(45deg, rgba(88,185,64,0.35) 25%, transparent 25%, transparent 75%, rgba(88,185,64,0.35) 75%, rgba(88,185,64,0.35))",
                                backgroundSize: "30px 30px",
                                backgroundPosition: "0 0, 15px 15px",
                              }}
                            />
                          </div>

                          <div className="relative z-10 flex items-center justify-between mb-1.5">
                            <p className={`text-[10px] font-extrabold ${isDark ? "text-emerald-200" : "text-emerald-800"}`}>
                              {isRTL ? "مساحة الزراعة" : "Planting Ground"}
                            </p>
                            <span className={`text-[9px] ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
                              {selectedSeed ? `${isRTL ? "البذرة" : "Seed"}: ${resolveSeedLabel(selectedSeed)}` : (isRTL ? "اختر بذرة" : "Pick a seed")}
                            </span>
                          </div>
                          <div
                            className="relative z-10 grid gap-2"
                            style={{ gridTemplateColumns: `repeat(${Math.min(4, plantedSlots.length)}, minmax(0, 1fr))` }}
                          >
                            {plantedSlots.map((slot, idx) => (
                              <div key={idx} className="space-y-1">
                                <motion.button
                                  type="button"
                                  onDragOver={(e) => {
                                    if (!dragItem) return;
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = "move";
                                    setHoveredDropPlot((prev) => (prev === idx ? prev : idx));
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDropOnPlot(slot, idx);
                                  }}
                                  onMouseEnter={() => {
                                    if (dragItem) {
                                      setHoveredDropPlot((prev) => (prev === idx ? prev : idx));
                                    }
                                  }}
                                  onMouseLeave={() => {
                                    if (dragItem && hoveredDropPlot === idx) setHoveredDropPlot(null);
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (handleDropOnPlot(slot, idx)) return;
                                    setSelectedPlot(idx);
                                    if (slot) return;
                                    if (!selectedSeed || plantMutation.isPending) return;
                                    plantMutation.mutate({ slotIndex: idx, seedId: selectedSeed });
                                  }}
                                  whileTap={{ scale: 0.97 }}
                                  className={`relative h-[88px] w-full overflow-hidden rounded-xl border px-1.5 pb-1.5 pt-1.5 text-[10px] font-semibold transition-all ${slot
                                    ? isDark
                                      ? "border-amber-700/90 text-emerald-100 shadow-[0_10px_18px_rgba(0,0,0,0.28)]"
                                      : "border-emerald-500/70 text-emerald-700 shadow-[0_10px_16px_rgba(35,84,41,0.2)]"
                                    : isDark
                                      ? "border-amber-800 text-emerald-300 shadow-[0_8px_14px_rgba(0,0,0,0.25)]"
                                      : "border-amber-500/80 text-emerald-700 shadow-[0_8px_14px_rgba(72,43,20,0.2)]"
                                    } ${selectedPlot === idx ? (isDark ? "ring-2 ring-emerald-400 ring-offset-1 ring-offset-emerald-950/70" : "ring-2 ring-emerald-600 ring-offset-1 ring-offset-lime-200/90") : ""} ${dragItem ? (isDark ? "hover:ring-2 hover:ring-cyan-300" : "hover:ring-2 hover:ring-cyan-500") : ""} ${hoveredDropPlot === idx ? (isDark ? "ring-2 ring-cyan-300" : "ring-2 ring-cyan-500") : ""} ${plotThemes[idx] ? (isDark ? "ring-2 ring-violet-300/75" : "ring-2 ring-violet-500/70") : ""}`}
                                  style={{
                                    background: slot
                                      ? isDark
                                        ? "linear-gradient(180deg, rgba(122,82,36,0.9) 0%, rgba(89,57,28,0.96) 62%, rgba(64,41,22,0.98) 100%)"
                                        : "linear-gradient(180deg, rgba(234,195,131,0.94) 0%, rgba(176,116,60,0.94) 58%, rgba(128,79,42,0.98) 100%)"
                                      : isDark
                                        ? "linear-gradient(180deg, rgba(108,74,39,0.72) 0%, rgba(74,49,28,0.9) 100%)"
                                        : "linear-gradient(180deg, rgba(236,197,133,0.88) 0%, rgba(176,118,62,0.9) 100%)",
                                  }}
                                >
                                  {resolveThemeMeta(plotThemes[idx]) && (
                                    <div
                                      className="pointer-events-none absolute inset-0"
                                      style={{
                                        background: `radial-gradient(circle at 22% 20%, ${resolveThemeMeta(plotThemes[idx])?.glow || "transparent"} 0%, rgba(255,255,255,0) 62%)`,
                                      }}
                                    />
                                  )}
                                  <AnimatePresence>
                                    {harvestBurst?.slotIndex === idx && (
                                      <>
                                        <motion.div
                                          initial={{ opacity: 0, scale: 0.6 }}
                                          animate={{ opacity: [0, 1, 0], scale: [0.6, 1.1, 1.35] }}
                                          exit={{ opacity: 0 }}
                                          transition={{ duration: 1.05, ease: "easeOut" }}
                                          className="pointer-events-none absolute inset-1 rounded-xl"
                                          style={{ background: "radial-gradient(circle, rgba(250,204,21,0.45) 0%, rgba(250,204,21,0.08) 45%, rgba(250,204,21,0) 72%)" }}
                                        />
                                        <motion.div
                                          initial={{ opacity: 0, y: 8, scale: 0.85 }}
                                          animate={{ opacity: [0, 1, 1, 0], y: [8, -2, -20, -34], scale: [0.85, 1, 1, 1.06] }}
                                          exit={{ opacity: 0 }}
                                          transition={{ duration: 1.1, ease: "easeOut" }}
                                          className={`pointer-events-none absolute left-1/2 top-1 z-20 -translate-x-1/2 rounded-full px-2 py-0.5 text-[9px] font-extrabold shadow-md ${isDark ? "bg-emerald-300 text-emerald-950" : "bg-emerald-600 text-white"
                                            }`}
                                        >
                                          +{harvestBurst.reward}
                                        </motion.div>
                                      </>
                                    )}
                                  </AnimatePresence>
                                  <div
                                    className="pointer-events-none absolute inset-x-1.5 top-1 h-2 rounded-full"
                                    style={{
                                      background: isDark
                                        ? "linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.03))"
                                        : "linear-gradient(180deg, rgba(255,255,255,0.45), rgba(255,255,255,0.08))",
                                    }}
                                  />
                                  <div
                                    className="pointer-events-none absolute inset-x-1.5 bottom-1.5 h-3 rounded-sm opacity-35"
                                    style={{
                                      backgroundImage:
                                        "repeating-linear-gradient(0deg, rgba(0,0,0,0.24), rgba(0,0,0,0.24) 1px, transparent 1px, transparent 5px)",
                                    }}
                                  />
                                  {slot ? (
                                    <div className="relative z-10 flex h-full flex-col items-center justify-between">
                                      {slot.stage >= slot.totalStages && (
                                        <motion.div
                                          className={`absolute -top-1 -right-1 rounded-full px-1.5 py-0.5 text-[8px] font-extrabold shadow-md ${isDark
                                            ? "bg-amber-400 text-amber-950"
                                            : "bg-amber-500 text-white"
                                            }`}
                                          animate={{ scale: [1, 1.08, 1], y: [0, -1, 0] }}
                                          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                                        >
                                          {isRTL ? "جاهز" : "Ready"}
                                        </motion.div>
                                      )}
                                      {resolveThemeMeta(plotThemes[idx]) && (
                                        <div className="absolute -top-1 -left-1 rounded-full px-1.5 py-0.5 text-[8px] font-extrabold bg-violet-500/90 text-white shadow-sm">
                                          {resolveThemeMeta(plotThemes[idx])?.icon}
                                        </div>
                                      )}
                                      <motion.div
                                        className="text-xl leading-none drop-shadow-sm"
                                        animate={harvestingSlotIndex === idx
                                          ? { scale: [1, 1.16, 0.9, 1.08, 0.92], rotate: [0, -8, 7, -5, 0], y: [0, -3, 2, -2, 0] }
                                          : dragItem && hoveredDropPlot === idx
                                            ? { scale: [1, 1.08, 1], y: [0, -1, 0] }
                                            : { scale: 1, rotate: 0, y: 0 }}
                                        transition={{ duration: 0.32, ease: "easeInOut" }}
                                      >
                                        {resolveSeedStageVisual(slot.seedId, getSlotVisualStage50(slot))}
                                      </motion.div>
                                      <div className="w-full text-center">
                                        <div className="truncate text-[10px] font-bold">{resolveSeedLabel(slot.seedId)}</div>
                                        <div className={`mt-1 h-1.5 w-full overflow-hidden rounded-full ${isDark ? "bg-black/35" : "bg-black/15"}`}>
                                          <motion.div
                                            className="h-full rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${getSlotVisualLevel100(slot)}%` }}
                                            transition={{ duration: 0.45, ease: "easeOut" }}
                                            style={{ background: "linear-gradient(90deg, #34d399, #22c55e, #84cc16)" }}
                                          />
                                        </div>
                                        <div className="mt-0.5 text-[9px] font-semibold opacity-90">{getSlotVisualLevel100(slot)}/100</div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
                                      <div className="text-lg leading-none opacity-90">{resolveThemeMeta(plotThemes[idx])?.icon || "🟫"}</div>
                                      <div className="mt-1 text-[9px] font-bold opacity-90">{t("gardenEmptySlot")}</div>
                                    </div>
                                  )}
                                </motion.button>
                                {slot && slot.stage >= slot.totalStages && (
                                  <motion.button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (harvestMutation.isPending) return;
                                      if (harvestingSlotIndex !== null) return;
                                      setHarvestingSlotIndex(idx);
                                      window.setTimeout(() => {
                                        harvestMutation.mutate(idx);
                                      }, 180);
                                    }}
                                    whileTap={{ scale: 0.96 }}
                                    whileHover={{ scale: 1.02 }}
                                    className={`w-full rounded-md border px-1.5 py-1 text-[10px] font-extrabold transition-all ${isDark
                                      ? "bg-gradient-to-b from-amber-500/80 to-amber-700/80 border-amber-300 text-amber-50 shadow-[0_5px_10px_rgba(0,0,0,0.35)] hover:from-amber-400/90 hover:to-amber-600/90"
                                      : "bg-gradient-to-b from-amber-300 to-amber-500 border-amber-400 text-amber-950 shadow-[0_5px_10px_rgba(137,84,16,0.3)] hover:from-amber-200 hover:to-amber-400"
                                      }`}
                                    disabled={harvestMutation.isPending || harvestingSlotIndex !== null}
                                  >
                                    <span className="inline-flex items-center gap-1">
                                      <motion.span
                                        animate={harvestingSlotIndex === idx ? { rotate: [0, -12, 10, -6, 0], y: [0, -2, 1, -1, 0] } : { rotate: 0, y: 0 }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                      >
                                        🧺
                                      </motion.span>
                                      <span>{t("gardenHarvest")}</span>
                                    </span>
                                  </motion.button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {openGardenPanel === "tools" && (
                      <div className={`mb-2.5 p-2.5 rounded-xl border ${isDark ? "bg-cyan-900/20 border-cyan-700/40" : "bg-cyan-50 border-cyan-200"}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className={`text-[11px] font-bold ${isDark ? "text-cyan-200" : "text-cyan-700"}`}>{t("gardenTools")}</p>
                          <span className={`text-[10px] ${isDark ? "text-cyan-300" : "text-cyan-700"}`}>{t("gardenBeauty")}: {gardenState?.beautyScore ?? 0}%</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-2">
                          {([
                            { key: "water", icon: "💧", label: t("gardenToolWater") },
                            { key: "fertilizer", icon: "🧪", label: t("gardenToolFertilizer") },
                            { key: "pruner", icon: "✂️", label: t("gardenToolPruner") },
                            { key: "spray", icon: "🌫️", label: t("gardenToolSpray") },
                          ] as const).map((tool) => (
                            <button
                              key={tool.key}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (toolMutation.isPending) return;
                                pickGardenItem({
                                  kind: "tool",
                                  toolKey: tool.key,
                                  label: tool.label,
                                  icon: tool.icon,
                                }, e);
                              }}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.effectAllowed = "move";
                                e.dataTransfer.setData("text/plain", `tool:${tool.key}`);
                                pickGardenItem({
                                  kind: "tool",
                                  toolKey: tool.key,
                                  label: tool.label,
                                  icon: tool.icon,
                                }, e);
                              }}
                              className={`px-2.5 py-2 rounded-lg text-[11px] font-semibold border transition-colors ${isDark ? "bg-cyan-800/30 border-cyan-700 text-cyan-100 hover:bg-cyan-700/40" : "bg-white border-cyan-200 text-cyan-700 hover:bg-cyan-100"
                                }`}
                            >
                              <span className="inline-flex items-center gap-1">{tool.icon} {tool.label}</span>
                              <span className="block text-[10px] opacity-80 mt-0.5">
                                -{toolPrices?.[tool.key]?.costPoints ?? 0} / +{toolPrices?.[tool.key]?.growthPoints ?? 0} {t("points")}
                              </span>
                            </button>
                          ))}
                        </div>

                        {wateringInfo?.wateringEnabled && (
                          <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}>
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: wateringInfo.maxWateringsPerDay }, (_, i) => (
                                <Droplets
                                  key={i}
                                  className={`w-3.5 h-3.5 ${i < wateringInfo.remainingWateringsToday ? "text-blue-400" : isDark ? "text-gray-600" : "text-gray-300"}`}
                                />
                              ))}
                            </div>
                            <div className="flex-1" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (canWater && !waterMutation.isPending) waterMutation.mutate();
                              }}
                              disabled={!canWater || waterMutation.isPending}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${canWater
                                ? "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25 active:scale-95"
                                : isDark ? "bg-gray-700 text-gray-500" : "bg-gray-200 text-gray-400"
                                }`}
                            >
                              <Droplets className="w-3.5 h-3.5" />
                              {waterMutation.isPending ? "..." : t("waterNow")}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {openGardenPanel === "themes" && (
                      <div className={`mb-2.5 p-2.5 rounded-xl border ${isDark ? "bg-violet-900/20 border-violet-700/40" : "bg-violet-50 border-violet-200"}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className={`text-[11px] font-bold ${isDark ? "text-violet-200" : "text-violet-700"}`}>{t("theme")}</p>
                          <span className={`text-[10px] ${isDark ? "text-violet-300" : "text-violet-700"}`}>{t("gardenPlots")}: {plantedSlots.length}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {themeCatalog.map((themeItem) => (
                            <button
                              key={themeItem.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                pickGardenItem({
                                  kind: "theme",
                                  themeId: themeItem.id,
                                  label: themeItem.label,
                                  icon: themeItem.icon,
                                }, e);
                              }}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.effectAllowed = "move";
                                e.dataTransfer.setData("text/plain", `theme:${themeItem.id}`);
                                pickGardenItem({
                                  kind: "theme",
                                  themeId: themeItem.id,
                                  label: themeItem.label,
                                  icon: themeItem.icon,
                                }, e);
                              }}
                              className={`px-2.5 py-2 rounded-lg text-[11px] font-semibold border transition-colors text-start ${isDark ? "bg-violet-800/30 border-violet-700 text-violet-100 hover:bg-violet-700/40" : "bg-white border-violet-200 text-violet-700 hover:bg-violet-100"
                                }`}
                            >
                              <span className="inline-flex items-center gap-1.5">
                                <span className="text-sm leading-none">{themeItem.icon}</span>
                                <span>{themeItem.label}</span>
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {openGardenPanel === "daily" && (
                      <div className={`mb-2.5 p-2.5 rounded-xl border ${isDark ? "bg-indigo-900/20 border-indigo-700/40" : "bg-indigo-50 border-indigo-200"}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className={`text-[11px] font-bold flex items-center gap-1 ${isDark ? "text-indigo-200" : "text-indigo-700"}`}>
                            <Sparkles className="w-3.5 h-3.5" />
                            {t("today")}
                          </p>
                          <span className={`text-[10px] font-semibold ${isDark ? "text-indigo-300" : "text-indigo-700"}`}>
                            {dailyCompletedCount}/{dailyQuestCount} {t("completed")}
                          </span>
                        </div>

                        {gardenDaily ? (
                          <>
                            <div className={`mb-2 rounded-lg px-2 py-1.5 text-[10px] font-semibold ${isDark ? "bg-indigo-800/30 text-indigo-100" : "bg-white text-indigo-700 border border-indigo-100"}`}>
                              {dailyEventTitle} · x{gardenDaily.event.growthMultiplier.toFixed(2)} growth · x{gardenDaily.event.harvestMultiplier.toFixed(2)} harvest
                            </div>

                            <div className="space-y-1.5">
                              {gardenDaily.quests.map((quest) => {
                                const done = quest.progress >= quest.target;
                                const questTitle = isRTL ? quest.titleAr : quest.titleEn;
                                return (
                                  <div
                                    key={quest.id}
                                    className={`rounded-lg border px-2 py-1.5 text-[10px] ${isDark ? "bg-indigo-900/28 border-indigo-700/55 text-indigo-100" : "bg-white border-indigo-100 text-indigo-700"}`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-bold truncate">{questTitle}</span>
                                      <span className={`font-extrabold ${done ? (isDark ? "text-lime-300" : "text-emerald-700") : ""}`}>
                                        {Math.min(quest.progress, quest.target)}/{quest.target}
                                      </span>
                                    </div>
                                    <div className={`mt-1 h-1.5 rounded-full overflow-hidden ${isDark ? "bg-gray-700" : "bg-indigo-100"}`}>
                                      <motion.div
                                        className="h-full rounded-full"
                                        style={{ background: "linear-gradient(90deg, #6366f1, #3b82f6)" }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, Math.round((Math.min(quest.progress, quest.target) / quest.target) * 100))}%` }}
                                        transition={{ duration: 0.5 }}
                                      />
                                    </div>
                                    <div className="mt-1 font-semibold opacity-90">+{quest.rewardPoints} {t("points")}</div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (claimGardenDailyMutation.isPending || !gardenDaily.allCompleted || gardenDaily.allClaimed) return;
                                  claimGardenDailyMutation.mutate();
                                }}
                                disabled={claimGardenDailyMutation.isPending || !gardenDaily.allCompleted || gardenDaily.allClaimed}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${gardenDaily.allCompleted && !gardenDaily.allClaimed
                                  ? "bg-indigo-500 hover:bg-indigo-600 text-white"
                                  : isDark
                                    ? "bg-gray-700 text-gray-400"
                                    : "bg-gray-200 text-gray-500"
                                  }`}
                              >
                                {claimGardenDailyMutation.isPending
                                  ? "..."
                                  : gardenDaily.allClaimed
                                    ? t("completed")
                                    : `${t("redeemReward")} +${gardenDaily.allRewardPoints}`}
                              </button>
                              <span className={`text-[10px] ${isDark ? "text-indigo-200" : "text-indigo-700"}`}>
                                {t("rewards")}: +{gardenDaily.allRewardPoints} {t("points")}
                              </span>
                            </div>
                          </>
                        ) : (
                          <p className={`text-[10px] ${isDark ? "text-indigo-200" : "text-indigo-700"}`}>...</p>
                        )}
                      </div>
                    )}

                    {openGardenPanel === "weekly" && (
                      <div className={`mb-2.5 p-2.5 rounded-xl border ${isDark ? "bg-cyan-900/20 border-cyan-700/40" : "bg-cyan-50 border-cyan-200"}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className={`text-[11px] font-bold flex items-center gap-1 ${isDark ? "text-cyan-200" : "text-cyan-700"}`}>
                            <Crown className="w-3.5 h-3.5" />
                            {t("weekly")}
                          </p>
                          <span className={`text-[10px] font-semibold ${isDark ? "text-cyan-300" : "text-cyan-700"}`}>
                            {weeklyCompletedCount}/{weeklyQuestCount} {t("completed")}
                          </span>
                        </div>

                        {gardenWeekly ? (
                          <>
                            <div className="space-y-1.5">
                              {gardenWeekly.quests.map((quest) => {
                                const done = quest.progress >= quest.target;
                                const questTitle = isRTL ? quest.titleAr : quest.titleEn;
                                return (
                                  <div
                                    key={quest.id}
                                    className={`rounded-lg border px-2 py-1.5 text-[10px] ${isDark ? "bg-cyan-900/28 border-cyan-700/55 text-cyan-100" : "bg-white border-cyan-100 text-cyan-700"}`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-bold truncate">{questTitle}</span>
                                      <span className={`font-extrabold ${done ? (isDark ? "text-lime-300" : "text-emerald-700") : ""}`}>
                                        {Math.min(quest.progress, quest.target)}/{quest.target}
                                      </span>
                                    </div>
                                    <div className={`mt-1 h-1.5 rounded-full overflow-hidden ${isDark ? "bg-gray-700" : "bg-cyan-100"}`}>
                                      <motion.div
                                        className="h-full rounded-full"
                                        style={{ background: "linear-gradient(90deg, #06b6d4, #14b8a6)" }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, Math.round((Math.min(quest.progress, quest.target) / quest.target) * 100))}%` }}
                                        transition={{ duration: 0.5 }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (claimGardenWeeklyMutation.isPending || !gardenWeekly.allCompleted || gardenWeekly.claimed) return;
                                  claimGardenWeeklyMutation.mutate();
                                }}
                                disabled={claimGardenWeeklyMutation.isPending || !gardenWeekly.allCompleted || gardenWeekly.claimed}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${gardenWeekly.allCompleted && !gardenWeekly.claimed
                                  ? "bg-cyan-500 hover:bg-cyan-600 text-white"
                                  : isDark
                                    ? "bg-gray-700 text-gray-400"
                                    : "bg-gray-200 text-gray-500"
                                  }`}
                              >
                                {claimGardenWeeklyMutation.isPending
                                  ? "..."
                                  : gardenWeekly.claimed
                                    ? t("completed")
                                    : `${t("redeemReward")} +${gardenWeekly.rewardPoints}`}
                              </button>
                              <span className={`text-[10px] ${isDark ? "text-cyan-200" : "text-cyan-700"}`}>
                                {t("rewards")}: +{gardenWeekly.rewardPoints} {t("points")}
                              </span>
                            </div>
                          </>
                        ) : (
                          <p className={`text-[10px] ${isDark ? "text-cyan-200" : "text-cyan-700"}`}>...</p>
                        )}
                      </div>
                    )}

                    <AnimatePresence>
                      {dragItem && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.16 }}
                          className={`pointer-events-none fixed z-[220] rounded-full border px-3 py-1.5 text-[11px] font-extrabold shadow-2xl ${isDark ? "bg-gray-900/95 border-cyan-500 text-cyan-100" : "bg-white/95 border-cyan-400 text-cyan-700"
                            }`}
                          style={{
                            left: `${(dragPointer?.x || 100) + 14}px`,
                            top: `${(dragPointer?.y || 100) - 10}px`,
                            backdropFilter: "blur(6px)",
                          }}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <span className="text-sm leading-none">{dragItem.icon}</span>
                            <span>{dragItem.label}</span>
                            <span className={`text-[9px] font-bold ${isDark ? "text-cyan-300" : "text-cyan-600"}`}>
                              {isRTL ? "إفلات في الحوض" : "Drop on plot"}
                            </span>
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {openGardenPanel === "streak" && (
                      <div className={`mb-2.5 p-2.5 rounded-xl border ${isDark ? "bg-orange-900/20 border-orange-700/40" : "bg-orange-50 border-orange-200"}`}>
                        <div className="flex items-center justify-between mb-1">
                          <p className={`text-[11px] font-bold flex items-center gap-1 ${isDark ? "text-orange-200" : "text-orange-700"}`}>
                            <Flame className="w-3.5 h-3.5" />
                            {t("streakTitle")}
                          </p>
                          <span className={`text-[10px] font-semibold ${isDark ? "text-orange-300" : "text-orange-700"}`}>
                            {t("streakDays", { days: growthStreak.days })}
                          </span>
                        </div>
                        <p className={`text-[10px] ${isDark ? "text-orange-100" : "text-orange-700"}`}>
                          {growthStreak.days <= 0
                            ? t("streakStartHint")
                            : growthStreak.isAtRisk
                              ? t("streakAtRiskHint", { days: growthStreak.days })
                              : t("streakActiveHint", { days: growthStreak.days })}
                        </p>
                        <div className={`mt-1.5 h-1.5 rounded-full overflow-hidden ${isDark ? "bg-gray-700" : "bg-orange-100"}`}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: "linear-gradient(90deg, #fb923c, #f97316)" }}
                            initial={{ width: 0 }}
                            animate={{ width: `${streakProgress}%` }}
                            transition={{ duration: 0.8 }}
                          />
                        </div>
                      </div>
                    )}

                    {!canWater && wateringInfo?.wateringEnabled && (
                      <div className={`mt-2 px-2.5 py-2 rounded-xl text-[11px] ${isDark ? "bg-amber-900/20 text-amber-300 border border-amber-700/40" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                        <p className="font-semibold">{wateringStatusMessage || t("wateringTryGamesHint")}</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate("/child-games");
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${isDark ? "bg-amber-700/40 text-amber-100 hover:bg-amber-700/60" : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                              }`}
                          >
                            {t("wateringActionPlayGame")}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate("/child-tasks");
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${isDark ? "bg-lime-700/40 text-lime-100 hover:bg-lime-700/60" : "bg-lime-100 text-lime-700 hover:bg-lime-200"
                              }`}
                          >
                            {t("wateringActionDoTask")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Journey Map Tab ── */}
            {activeTab === "journey" && (
              <div className="relative" style={{ minHeight: 640 }}>
                <FarmCardBackground isDark={isDark} stage={currentStage} isRTL={isRTL} rich={!lowMotionMode && richSceneReady} />
                <div className="absolute top-0 left-0 right-0 z-40 px-2 pt-2">
                  <div
                    className="rounded-2xl px-1.5 py-0.5 bg-transparent border border-transparent"
                    style={{ backdropFilter: "blur(0px)" }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/60 text-white flex items-center justify-center shadow-sm">🌿</span>
                        <p className={`text-[10px] font-black truncate ${isDark ? "text-emerald-100" : "text-emerald-900"}`}>
                          {isRTL ? "الحديقة" : "Garden"}
                        </p>
                        <span className={`text-[8px] font-extrabold whitespace-nowrap ${isDark ? "text-emerald-100/90" : "text-emerald-900/85"}`}>
                          {currentSeason.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title={isRTL ? "الشجرة" : "Tree"}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTab("tree");
                          }}
                          className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors shadow-sm ${isDark
                            ? "bg-gray-900/55 border-gray-500 text-gray-300"
                            : "bg-white/18 border-white/30 text-emerald-700"
                            }`}
                        >
                          <TreePine className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title={isRTL ? "الرحلة" : "Journey"}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTab("journey");
                          }}
                          className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors shadow-sm ${isDark
                            ? "bg-cyan-700/95 border-cyan-500 text-white"
                            : "bg-cyan-500/95 border-cyan-300 text-white"
                            }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative z-20 pt-14 pb-2">
                  <JourneyMap
                    stages={stages}
                    currentStage={currentStage}
                    stageIcons={stageIcons}
                    isDark={isDark}
                    isRTL={isRTL}
                    t={t}
                    selectedStage={selectedStage}
                    onSelectStage={setSelectedStage}
                  />
                </div>
              </div>
            )}

            {/* ── Celebration Overlay ── */}
            <AnimatePresence>
              {showCelebration && (
                <CelebrationOverlay
                  show={showCelebration}
                  stageName={celebrationName}
                  stageNumber={celebrationStage}
                  color={celebrationColor}
                  isRTL={isRTL}
                  isBiomeChange={isCelebrationBiomeChange}
                  onDone={() => setShowCelebration(false)}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
