/* ─── Match-3 Royal Puzzle — Type Definitions ─── */

export enum GemType {
  Ruby = 0,
  Sapphire = 1,
  Emerald = 2,
  Amethyst = 3,
  Topaz = 4,
  Diamond = 5,
}

export const GEM_TYPE_COUNT = 6;

export enum SpecialType {
  None = 0,
  RocketH = 1,   // Clears entire row
  RocketV = 2,   // Clears entire column
  Bomb = 3,      // Clears 3×3 area
  Rainbow = 4,   // Clears all of one color
}

export interface Gem {
  id: number;
  type: GemType;
  special: SpecialType;
  row: number;
  col: number;
}

export interface Pos {
  row: number;
  col: number;
}

export interface MatchGroup {
  cells: Pos[];
  horizontal: boolean;
}

export interface LevelObjective {
  type: 'score' | 'collect';
  gemType?: GemType;
  target: number;
}

export interface LevelData {
  id: number;
  name: string;
  rows: number;
  cols: number;
  moves: number;
  objectives: LevelObjective[];
  stars: [number, number, number];
  gems: GemType[];
}

export interface SavedProgress {
  [levelId: number]: { stars: number; score: number };
}

/* ─── Visual / Animation Types ─── */

export interface GemVisual {
  x: number;
  y: number;
  scale: number;
  opacity: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface ScorePopup {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

/* ─── Gem Visual Styles ─── */

export const GEM_STYLES: Record<GemType, {
  bg: string; light: string; glow: string; darkBg: string; emoji: string;
  shape: 'diamond' | 'circle' | 'hex' | 'star' | 'square' | 'triangle';
}> = {
  [GemType.Ruby]:     { bg: '#FF1744', light: '#FF8A80', glow: 'rgba(255,23,68,0.9)',   darkBg: '#B71C1C', emoji: '❤️',  shape: 'diamond'  },
  [GemType.Sapphire]: { bg: '#2979FF', light: '#82B1FF', glow: 'rgba(41,121,255,0.9)',  darkBg: '#0D47A1', emoji: '💎',  shape: 'circle'   },
  [GemType.Emerald]:  { bg: '#00E676', light: '#B9F6CA', glow: 'rgba(0,230,118,0.9)',   darkBg: '#1B5E20', emoji: '🍀',  shape: 'hex'      },
  [GemType.Amethyst]: { bg: '#D500F9', light: '#EA80FC', glow: 'rgba(213,0,249,0.9)',   darkBg: '#6A1B9A', emoji: '⭐',  shape: 'star'     },
  [GemType.Topaz]:    { bg: '#FFAB00', light: '#FFE57F', glow: 'rgba(255,171,0,0.9)',   darkBg: '#E65100', emoji: '🔶',  shape: 'square'   },
  [GemType.Diamond]:  { bg: '#1DE9B6', light: '#A7FFEB', glow: 'rgba(29,233,182,0.9)',  darkBg: '#00695C', emoji: '🔷',  shape: 'triangle' },
};

export const SPECIAL_COLORS: Record<SpecialType, string> = {
  [SpecialType.None]: 'transparent',
  [SpecialType.RocketH]: '#FFD700',
  [SpecialType.RocketV]: '#FFD700',
  [SpecialType.Bomb]: '#FF6348',
  [SpecialType.Rainbow]: '#FFFFFF',
};
