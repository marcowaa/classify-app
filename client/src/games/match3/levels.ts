/* ─── Match-3 Royal Puzzle — Level Definitions ─── */
/* 5 Worlds × 10 Levels = 50 Levels                  */

import { GemType, type LevelData } from './types';

const G = GemType;
const BASIC  = [G.Ruby, G.Sapphire, G.Emerald, G.Amethyst];
const FIVE   = [G.Ruby, G.Sapphire, G.Emerald, G.Amethyst, G.Topaz];
const ALL    = [G.Ruby, G.Sapphire, G.Emerald, G.Amethyst, G.Topaz, G.Diamond];

/* ─── World Definitions ─── */
export interface WorldData {
  id: number;
  name: string;
  nameEn: string;
  emoji: string;
  color: string;        // gradient start
  colorEnd: string;     // gradient end
  bgEmoji: string[];    // floating background emojis for this world
}

export const WORLDS: WorldData[] = [
  { id: 1, name: 'وادي الياقوت',        nameEn: 'Ruby Valley',       emoji: '🏔️',  color: '#7f1d1d', colorEnd: '#991b1b', bgEmoji: ['💎', '❤️', '✨', '🏔️'] },
  { id: 2, name: 'بحيرة الزفير',        nameEn: 'Sapphire Lake',     emoji: '🌊',  color: '#1e3a5f', colorEnd: '#1e40af', bgEmoji: ['💎', '🌊', '🐟', '⭐'] },
  { id: 3, name: 'غابة الزمرد',          nameEn: 'Emerald Forest',    emoji: '🌲',  color: '#14532d', colorEnd: '#166534', bgEmoji: ['🍀', '🌲', '🌿', '✨'] },
  { id: 4, name: 'قصر الجمشت',          nameEn: 'Amethyst Palace',   emoji: '🏰',  color: '#4a1d96', colorEnd: '#6b21a8', bgEmoji: ['⭐', '🏰', '🔮', '👑'] },
  { id: 5, name: 'عرش الملك',           nameEn: 'Royal Throne',      emoji: '👑',  color: '#78350f', colorEnd: '#92400e', bgEmoji: ['👑', '🏆', '💎', '🌟'] },
];

export const LEVELS: LevelData[] = [
  /* ═══ World 1: وادي الياقوت (Ruby Valley) — Levels 1-10 ═══ */
  {
    id: 1, name: 'البداية الملكية',
    rows: 8, cols: 8, moves: 28,
    objectives: [{ type: 'score', target: 600 }],
    stars: [600, 1200, 2400], gems: BASIC,
  },
  {
    id: 2, name: 'أول ثلاثية',
    rows: 8, cols: 8, moves: 25,
    objectives: [{ type: 'collect', gemType: G.Ruby, target: 10 }],
    stars: [800, 1600, 3200], gems: BASIC,
  },
  {
    id: 3, name: 'وهج الياقوت',
    rows: 8, cols: 8, moves: 24,
    objectives: [{ type: 'score', target: 1000 }],
    stars: [1000, 2000, 4000], gems: BASIC,
  },
  {
    id: 4, name: 'مسار الجواهر',
    rows: 8, cols: 8, moves: 22,
    objectives: [{ type: 'collect', gemType: G.Sapphire, target: 12 }],
    stars: [1200, 2400, 4800], gems: BASIC,
  },
  {
    id: 5, name: 'شلال الأحمر',
    rows: 8, cols: 8, moves: 22,
    objectives: [{ type: 'collect', gemType: G.Ruby, target: 15 }],
    stars: [1400, 2800, 5200], gems: BASIC,
  },
  {
    id: 6, name: 'كهف التوأم',
    rows: 8, cols: 8, moves: 20,
    objectives: [
      { type: 'collect', gemType: G.Ruby, target: 8 },
      { type: 'collect', gemType: G.Emerald, target: 8 },
    ],
    stars: [1600, 3200, 6000], gems: BASIC,
  },
  {
    id: 7, name: 'طريق النجوم',
    rows: 8, cols: 8, moves: 20,
    objectives: [{ type: 'score', target: 2000 }],
    stars: [2000, 4000, 7000], gems: BASIC,
  },
  {
    id: 8, name: 'حارس الياقوت',
    rows: 8, cols: 8, moves: 18,
    objectives: [{ type: 'collect', gemType: G.Amethyst, target: 14 }],
    stars: [2200, 4400, 8000], gems: BASIC,
  },
  {
    id: 9, name: 'عاصفة الوادي',
    rows: 8, cols: 8, moves: 18,
    objectives: [
      { type: 'score', target: 2500 },
      { type: 'collect', gemType: G.Ruby, target: 10 },
    ],
    stars: [2500, 5000, 9000], gems: BASIC,
  },
  {
    id: 10, name: 'ملك الوادي',
    rows: 8, cols: 8, moves: 16,
    objectives: [
      { type: 'score', target: 3000 },
      { type: 'collect', gemType: G.Ruby, target: 15 },
    ],
    stars: [3000, 6000, 10000], gems: BASIC,
  },

  /* ═══ World 2: بحيرة الزفير (Sapphire Lake) — Levels 11-20 ═══ */
  {
    id: 11, name: 'شاطئ الزفير',
    rows: 8, cols: 8, moves: 25,
    objectives: [{ type: 'score', target: 1500 }],
    stars: [1500, 3000, 5500], gems: FIVE,
  },
  {
    id: 12, name: 'أمواج الخمسة',
    rows: 8, cols: 8, moves: 24,
    objectives: [{ type: 'collect', gemType: G.Topaz, target: 12 }],
    stars: [1800, 3600, 6500], gems: FIVE,
  },
  {
    id: 13, name: 'لؤلؤ البحر',
    rows: 8, cols: 8, moves: 22,
    objectives: [{ type: 'collect', gemType: G.Sapphire, target: 18 }],
    stars: [2000, 4000, 7500], gems: FIVE,
  },
  {
    id: 14, name: 'دوامة البحيرة',
    rows: 8, cols: 8, moves: 22,
    objectives: [{ type: 'score', target: 2500 }],
    stars: [2500, 5000, 8500], gems: FIVE,
  },
  {
    id: 15, name: 'جزيرة التوباز',
    rows: 8, cols: 8, moves: 20,
    objectives: [
      { type: 'collect', gemType: G.Topaz, target: 12 },
      { type: 'collect', gemType: G.Sapphire, target: 12 },
    ],
    stars: [2800, 5600, 9500], gems: FIVE,
  },
  {
    id: 16, name: 'عمق الماء',
    rows: 8, cols: 8, moves: 20,
    objectives: [
      { type: 'score', target: 3000 },
      { type: 'collect', gemType: G.Emerald, target: 12 },
    ],
    stars: [3000, 6000, 10500], gems: FIVE,
  },
  {
    id: 17, name: 'حوريات الزفير',
    rows: 8, cols: 8, moves: 18,
    objectives: [{ type: 'score', target: 3500 }],
    stars: [3500, 7000, 12000], gems: FIVE,
  },
  {
    id: 18, name: 'منارة القمر',
    rows: 8, cols: 8, moves: 18,
    objectives: [
      { type: 'collect', gemType: G.Ruby, target: 15 },
      { type: 'collect', gemType: G.Sapphire, target: 15 },
    ],
    stars: [4000, 8000, 13000], gems: FIVE,
  },
  {
    id: 19, name: 'تسونامي الجواهر',
    rows: 8, cols: 8, moves: 16,
    objectives: [{ type: 'score', target: 4500 }],
    stars: [4500, 9000, 15000], gems: FIVE,
  },
  {
    id: 20, name: 'ملكة البحيرة',
    rows: 8, cols: 8, moves: 15,
    objectives: [
      { type: 'score', target: 5000 },
      { type: 'collect', gemType: G.Sapphire, target: 20 },
    ],
    stars: [5000, 10000, 17000], gems: FIVE,
  },

  /* ═══ World 3: غابة الزمرد (Emerald Forest) — Levels 21-30 ═══ */
  {
    id: 21, name: 'بوابة الغابة',
    rows: 8, cols: 8, moves: 24,
    objectives: [{ type: 'score', target: 2500 }],
    stars: [2500, 5000, 9000], gems: ALL,
  },
  {
    id: 22, name: 'ستة ألوان',
    rows: 8, cols: 8, moves: 22,
    objectives: [{ type: 'collect', gemType: G.Diamond, target: 12 }],
    stars: [3000, 6000, 10000], gems: ALL,
  },
  {
    id: 23, name: 'أشجار الزمرد',
    rows: 8, cols: 8, moves: 22,
    objectives: [{ type: 'collect', gemType: G.Emerald, target: 20 }],
    stars: [3500, 7000, 12000], gems: ALL,
  },
  {
    id: 24, name: 'نهر الجواهر',
    rows: 8, cols: 8, moves: 20,
    objectives: [
      { type: 'collect', gemType: G.Diamond, target: 10 },
      { type: 'collect', gemType: G.Emerald, target: 10 },
    ],
    stars: [4000, 8000, 13000], gems: ALL,
  },
  {
    id: 25, name: 'وحش الغابة',
    rows: 8, cols: 8, moves: 20,
    objectives: [{ type: 'score', target: 5000 }],
    stars: [5000, 10000, 16000], gems: ALL,
  },
  {
    id: 26, name: 'كنز المتاهة',
    rows: 8, cols: 8, moves: 18,
    objectives: [
      { type: 'score', target: 4000 },
      { type: 'collect', gemType: G.Topaz, target: 15 },
    ],
    stars: [5500, 11000, 18000], gems: ALL,
  },
  {
    id: 27, name: 'زهور الماس',
    rows: 8, cols: 8, moves: 18,
    objectives: [{ type: 'collect', gemType: G.Diamond, target: 22 }],
    stars: [6000, 12000, 20000], gems: ALL,
  },
  {
    id: 28, name: 'عاصفة الغابة',
    rows: 8, cols: 8, moves: 16,
    objectives: [
      { type: 'collect', gemType: G.Ruby, target: 15 },
      { type: 'collect', gemType: G.Sapphire, target: 15 },
      { type: 'collect', gemType: G.Emerald, target: 15 },
    ],
    stars: [7000, 14000, 22000], gems: ALL,
  },
  {
    id: 29, name: 'شجرة الحياة',
    rows: 8, cols: 8, moves: 15,
    objectives: [{ type: 'score', target: 8000 }],
    stars: [8000, 16000, 25000], gems: ALL,
  },
  {
    id: 30, name: 'حارس الغابة',
    rows: 8, cols: 8, moves: 14,
    objectives: [
      { type: 'score', target: 7000 },
      { type: 'collect', gemType: G.Emerald, target: 25 },
    ],
    stars: [9000, 18000, 28000], gems: ALL,
  },

  /* ═══ World 4: قصر الجمشت (Amethyst Palace) — Levels 31-40 ═══ */
  {
    id: 31, name: 'بوابة القصر',
    rows: 8, cols: 8, moves: 22,
    objectives: [{ type: 'score', target: 5000 }],
    stars: [5000, 10000, 18000], gems: ALL,
  },
  {
    id: 32, name: 'قاعة البنفسج',
    rows: 8, cols: 8, moves: 20,
    objectives: [{ type: 'collect', gemType: G.Amethyst, target: 22 }],
    stars: [5500, 11000, 20000], gems: ALL,
  },
  {
    id: 33, name: 'مرآة السحر',
    rows: 8, cols: 8, moves: 20,
    objectives: [
      { type: 'collect', gemType: G.Amethyst, target: 15 },
      { type: 'collect', gemType: G.Diamond, target: 15 },
    ],
    stars: [6000, 12000, 22000], gems: ALL,
  },
  {
    id: 34, name: 'حديقة القصر',
    rows: 8, cols: 8, moves: 18,
    objectives: [{ type: 'score', target: 7000 }],
    stars: [7000, 14000, 24000], gems: ALL,
  },
  {
    id: 35, name: 'أبراج الكريستال',
    rows: 8, cols: 8, moves: 18,
    objectives: [
      { type: 'collect', gemType: G.Topaz, target: 18 },
      { type: 'collect', gemType: G.Amethyst, target: 18 },
    ],
    stars: [8000, 16000, 26000], gems: ALL,
  },
  {
    id: 36, name: 'المكتبة السرية',
    rows: 8, cols: 8, moves: 16,
    objectives: [{ type: 'score', target: 8000 }],
    stars: [8000, 16000, 28000], gems: ALL,
  },
  {
    id: 37, name: 'ممر الأشباح',
    rows: 8, cols: 8, moves: 16,
    objectives: [
      { type: 'score', target: 6000 },
      { type: 'collect', gemType: G.Ruby, target: 20 },
    ],
    stars: [9000, 18000, 30000], gems: ALL,
  },
  {
    id: 38, name: 'تاج الأميرة',
    rows: 8, cols: 8, moves: 15,
    objectives: [
      { type: 'collect', gemType: G.Diamond, target: 20 },
      { type: 'collect', gemType: G.Amethyst, target: 20 },
    ],
    stars: [10000, 20000, 32000], gems: ALL,
  },
  {
    id: 39, name: 'معركة السحرة',
    rows: 8, cols: 8, moves: 14,
    objectives: [{ type: 'score', target: 10000 }],
    stars: [10000, 20000, 35000], gems: ALL,
  },
  {
    id: 40, name: 'ملكة القصر',
    rows: 8, cols: 8, moves: 14,
    objectives: [
      { type: 'score', target: 10000 },
      { type: 'collect', gemType: G.Amethyst, target: 25 },
      { type: 'collect', gemType: G.Ruby, target: 15 },
    ],
    stars: [12000, 24000, 38000], gems: ALL,
  },

  /* ═══ World 5: عرش الملك (Royal Throne) — Levels 41-50 ═══ */
  {
    id: 41, name: 'درب العرش',
    rows: 8, cols: 8, moves: 20,
    objectives: [{ type: 'score', target: 8000 }],
    stars: [8000, 16000, 28000], gems: ALL,
  },
  {
    id: 42, name: 'غرفة الكنوز',
    rows: 8, cols: 8, moves: 18,
    objectives: [
      { type: 'collect', gemType: G.Topaz, target: 20 },
      { type: 'collect', gemType: G.Diamond, target: 20 },
    ],
    stars: [9000, 18000, 30000], gems: ALL,
  },
  {
    id: 43, name: 'حراس البلاط',
    rows: 8, cols: 8, moves: 18,
    objectives: [{ type: 'score', target: 10000 }],
    stars: [10000, 20000, 34000], gems: ALL,
  },
  {
    id: 44, name: 'سيف الملك',
    rows: 8, cols: 8, moves: 16,
    objectives: [
      { type: 'collect', gemType: G.Ruby, target: 25 },
      { type: 'collect', gemType: G.Sapphire, target: 25 },
    ],
    stars: [11000, 22000, 36000], gems: ALL,
  },
  {
    id: 45, name: 'الدرع الذهبي',
    rows: 8, cols: 8, moves: 16,
    objectives: [{ type: 'score', target: 12000 }],
    stars: [12000, 24000, 38000], gems: ALL,
  },
  {
    id: 46, name: 'تنين الكنز',
    rows: 8, cols: 8, moves: 15,
    objectives: [
      { type: 'score', target: 10000 },
      { type: 'collect', gemType: G.Emerald, target: 20 },
      { type: 'collect', gemType: G.Amethyst, target: 20 },
    ],
    stars: [13000, 26000, 42000], gems: ALL,
  },
  {
    id: 47, name: 'وزير الماس',
    rows: 8, cols: 8, moves: 14,
    objectives: [{ type: 'collect', gemType: G.Diamond, target: 30 }],
    stars: [14000, 28000, 44000], gems: ALL,
  },
  {
    id: 48, name: 'عاصفة ملكية',
    rows: 8, cols: 8, moves: 14,
    objectives: [{ type: 'score', target: 15000 }],
    stars: [15000, 30000, 48000], gems: ALL,
  },
  {
    id: 49, name: 'التتويج',
    rows: 8, cols: 8, moves: 13,
    objectives: [
      { type: 'score', target: 12000 },
      { type: 'collect', gemType: G.Topaz, target: 25 },
      { type: 'collect', gemType: G.Amethyst, target: 25 },
    ],
    stars: [16000, 32000, 50000], gems: ALL,
  },
  {
    id: 50, name: 'التاج الأسطوري',
    rows: 8, cols: 8, moves: 12,
    objectives: [
      { type: 'score', target: 15000 },
      { type: 'collect', gemType: G.Ruby, target: 20 },
      { type: 'collect', gemType: G.Sapphire, target: 20 },
      { type: 'collect', gemType: G.Diamond, target: 20 },
    ],
    stars: [18000, 36000, 55000], gems: ALL,
  },
];

/* ─── Helper: get world for a level ─── */
export function getWorldForLevel(levelId: number): WorldData {
  const worldIndex = Math.min(Math.floor((levelId - 1) / 10), WORLDS.length - 1);
  return WORLDS[worldIndex];
}

/* ─── Helper: get levels for a world ─── */
export function getLevelsForWorld(worldId: number): LevelData[] {
  const start = (worldId - 1) * 10 + 1;
  return LEVELS.filter(l => l.id >= start && l.id < start + 10);
}
