import React from "react";

// Tree growth stage names (matches schema/constants)
export const STAGE_NAMES = [
  "seed", "sprout", "sapling", "youngPlant", "bush",
  "smallTree", "growingTree", "mediumTree", "tallTree", "strongTree",
  "largeTree", "matureTree", "fruitTree", "grandTree", "ancientTree",
  "goldenTree", "crystalTree", "diamondTree", "legendaryTree", "cosmicTree",
];

// Color palette for each stage
export const STAGE_COLORS = [
  "#8B6914", "#6B8E23", "#228B22", "#32CD32", "#3CB371",
  "#2E8B57", "#20B2AA", "#008B8B", "#4682B4", "#4169E1",
  "#6A5ACD", "#8A2BE2", "#FF6347", "#FF4500", "#DAA520",
  "#FFD700", "#00CED1", "#E0E7FF", "#FF69B4", "#9400D3",
];

interface IconProps {
  size?: number;
  className?: string;
}

// Stage 1: Seed
function SeedIcon({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <ellipse cx="32" cy="44" rx="16" ry="6" fill="#8B6914" opacity="0.3" />
      <path d="M32 48c-4 0-7-2-7-5s3-8 7-12c4 4 7 9 7 12s-3 5-7 5z" fill="#8B6914" />
      <path d="M32 36c0 0-2-4-2-6s1-3 2-3 2 1 2 3-2 6-2 6z" fill="#A0782C" />
      <circle cx="32" cy="26" r="2" fill="#CDA94A" opacity="0.6" />
    </svg>
  );
}

// Stage 2: Sprout
function SproutIcon({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <ellipse cx="32" cy="52" rx="14" ry="4" fill="#6B8E23" opacity="0.3" />
      <rect x="31" y="36" width="2" height="16" rx="1" fill="#6B8E23" />
      <path d="M32 36c-6-2-10-8-8-12 3 2 7 6 8 12z" fill="#7CFC00" />
      <path d="M32 36c6-2 10-8 8-12-3 2-7 6-8 12z" fill="#90EE90" />
      <ellipse cx="32" cy="52" rx="8" ry="3" fill="#8B4513" opacity="0.4" />
    </svg>
  );
}

// Stage 3: Sapling
function SaplingIcon({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <ellipse cx="32" cy="54" rx="12" ry="4" fill="#228B22" opacity="0.25" />
      <rect x="30" y="32" width="4" height="22" rx="2" fill="#8B6E47" />
      <ellipse cx="32" cy="28" rx="10" ry="12" fill="#228B22" />
      <ellipse cx="28" cy="24" rx="6" ry="8" fill="#32CD32" opacity="0.4" />
      <circle cx="35" cy="20" r="2" fill="#90EE90" opacity="0.5" />
    </svg>
  );
}

// Stage 4: Young Plant
function YoungPlantIcon({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <ellipse cx="32" cy="54" rx="14" ry="4" fill="#32CD32" opacity="0.25" />
      <rect x="30" y="30" width="4" height="24" rx="2" fill="#7B5B3A" />
      <path d="M22 32c0-8 4-14 10-18 6 4 10 10 10 18-4 4-16 4-20 0z" fill="#32CD32" />
      <path d="M26 28c0-4 2-8 6-10 4 2 6 6 6 10-2 3-10 3-12 0z" fill="#50D050" opacity="0.5" />
      <path d="M20 42l-6-4c0 0 3-2 6-1v5z" fill="#228B22" opacity="0.7" />
      <path d="M44 42l6-4c0 0-3-2-6-1v5z" fill="#228B22" opacity="0.7" />
    </svg>
  );
}

// Stage 5: Bush
function BushIcon({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <ellipse cx="32" cy="54" rx="16" ry="4" fill="#3CB371" opacity="0.25" />
      <rect x="30" y="34" width="4" height="20" rx="2" fill="#6B4F36" />
      <ellipse cx="32" cy="30" rx="16" ry="14" fill="#3CB371" />
      <ellipse cx="24" cy="28" rx="8" ry="8" fill="#4DD88A" opacity="0.4" />
      <ellipse cx="40" cy="28" rx="8" ry="8" fill="#2E8B57" opacity="0.3" />
      <circle cx="28" cy="22" r="2" fill="#90EE90" opacity="0.5" />
      <circle cx="38" cy="24" r="1.5" fill="#90EE90" opacity="0.4" />
    </svg>
  );
}

// Stage 6: Small Tree
function SmallTreeIcon({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <ellipse cx="32" cy="56" rx="14" ry="4" fill="#2E8B57" opacity="0.2" />
      <rect x="29" y="32" width="6" height="24" rx="3" fill="#6B4F36" />
      <path d="M32 8l-18 28h36L32 8z" fill="#2E8B57" />
      <path d="M32 14l-12 18h24L32 14z" fill="#3CB371" opacity="0.5" />
      <circle cx="26" cy="28" r="1.5" fill="#90EE90" opacity="0.4" />
      <circle cx="38" cy="30" r="1.5" fill="#90EE90" opacity="0.4" />
    </svg>
  );
}

// Stage 7: Growing Tree
function GrowingTreeIcon({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <ellipse cx="32" cy="56" rx="16" ry="4" fill="#20B2AA" opacity="0.2" />
      <rect x="28" y="30" width="8" height="26" rx="4" fill="#5D4129" />
      <path d="M16 34c0-12 7-22 16-28 9 6 16 16 16 28-6 6-26 6-32 0z" fill="#20B2AA" />
      <path d="M22 28c0-6 4-14 10-18 6 4 10 12 10 18-4 5-16 5-20 0z" fill="#5FD5C5" opacity="0.4" />
      <path d="M25 46l-8-2c0 0 2-3 6-3l2 5z" fill="#228B22" opacity="0.5" />
      <path d="M39 46l8-2c0 0-2-3-6-3l-2 5z" fill="#228B22" opacity="0.5" />
    </svg>
  );
}

// Stage 8: Medium Tree
function MediumTreeIcon({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <ellipse cx="32" cy="56" rx="18" ry="4" fill="#008B8B" opacity="0.2" />
      <rect x="27" y="28" width="10" height="28" rx="5" fill="#4A3520" />
      <ellipse cx="32" cy="24" rx="20" ry="18" fill="#008B8B" />
      <ellipse cx="26" cy="20" rx="10" ry="10" fill="#20B2AA" opacity="0.35" />
      <ellipse cx="40" cy="22" rx="8" ry="8" fill="#006D6D" opacity="0.3" />
      <path d="M22 40l-5-3 4-2 1 5z" fill="#228B57" opacity="0.5" />
      <path d="M42 40l5-3-4-2-1 5z" fill="#228B57" opacity="0.5" />
    </svg>
  );
}

// Stage 9: Tall Tree
function TallTreeIcon({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <ellipse cx="32" cy="58" rx="16" ry="3" fill="#4682B4" opacity="0.2" />
      <rect x="28" y="24" width="8" height="34" rx="4" fill="#3E2B17" />
      <ellipse cx="32" cy="20" rx="18" ry="16" fill="#4682B4" />
      <ellipse cx="32" cy="14" rx="12" ry="10" fill="#5E9ED6" opacity="0.4" />
      <circle cx="24" cy="18" r="2" fill="#87CEEB" opacity="0.4" />
      <circle cx="40" cy="16" r="1.5" fill="#87CEEB" opacity="0.3" />
      <path d="M24 44l-6-2c1-2 4-3 6-2v4z" fill="#2E6E9E" opacity="0.5" />
      <path d="M40 44l6-2c-1-2-4-3-6-2v4z" fill="#2E6E9E" opacity="0.5" />
    </svg>
  );
}

// Stage 10: Strong Tree
function StrongTreeIcon({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <ellipse cx="32" cy="58" rx="18" ry="3" fill="#4169E1" opacity="0.2" />
      <rect x="26" y="22" width="12" height="36" rx="6" fill="#3E2B17" />
      <path d="M18 38l-6 4 8-14-2 10z" fill="#4A3520" opacity="0.6" />
      <path d="M46 38l6 4-8-14 2 10z" fill="#4A3520" opacity="0.6" />
      <ellipse cx="32" cy="18" rx="20" ry="16" fill="#4169E1" />
      <ellipse cx="32" cy="14" rx="14" ry="10" fill="#5B82EE" opacity="0.4" />
      <circle cx="26" cy="12" r="2" fill="#93B3FF" opacity="0.5" />
      <circle cx="38" cy="14" r="2" fill="#93B3FF" opacity="0.3" />
    </svg>
  );
}

// Stage 11: Large Tree
function LargeTreeIcon({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <ellipse cx="32" cy="58" rx="20" ry="3" fill="#6A5ACD" opacity="0.2" />
      <rect x="26" y="20" width="12" height="38" rx="6" fill="#3E2B17" />
      <path d="M20 42l-8 4 6-16-2 12z" fill="#4A3520" opacity="0.5" />
      <path d="M44 42l8 4-6-16 2 12z" fill="#4A3520" opacity="0.5" />
      <ellipse cx="32" cy="18" rx="22" ry="16" fill="#6A5ACD" />
      <ellipse cx="26" cy="14" rx="10" ry="8" fill="#8B7BE8" opacity="0.4" />
      <ellipse cx="40" cy="16" rx="8" ry="6" fill="#5041A0" opacity="0.3" />
      <circle cx="22" cy="12" r="2" fill="#B8AAFF" opacity="0.5" />
      <circle cx="42" cy="10" r="1.5" fill="#B8AAFF" opacity="0.4" />
    </svg>
  );
}

// Stage 12: Mature Tree
function MatureTreeIcon({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <ellipse cx="32" cy="58" rx="20" ry="3" fill="#8A2BE2" opacity="0.2" />
      <rect x="26" y="20" width="12" height="38" rx="6" fill="#2D1B0E" />
      <path d="M18 40l-10 6 8-20v14z" fill="#3E2B17" opacity="0.5" />
      <path d="M46 40l10 6-8-20v14z" fill="#3E2B17" opacity="0.5" />
      <ellipse cx="32" cy="16" rx="24" ry="16" fill="#8A2BE2" />
      <ellipse cx="28" cy="12" rx="12" ry="8" fill="#A855F7" opacity="0.4" />
      <ellipse cx="40" cy="14" rx="10" ry="6" fill="#6D28D9" opacity="0.3" />
      <circle cx="20" cy="10" r="2.5" fill="#D8B4FE" opacity="0.5" />
      <circle cx="44" cy="8" r="2" fill="#D8B4FE" opacity="0.4" />
      <circle cx="32" cy="6" r="1.5" fill="#F0E0FF" opacity="0.6" />
    </svg>
  );
}

// Stage 13: Fruit Tree
function FruitTreeIcon({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <ellipse cx="32" cy="58" rx="20" ry="3" fill="#FF6347" opacity="0.2" />
      <rect x="26" y="20" width="12" height="38" rx="6" fill="#3E2B17" />
      <path d="M18 40l-8 4 6-16v12z" fill="#4A3520" opacity="0.5" />
      <path d="M46 40l8 4-6-16v12z" fill="#4A3520" opacity="0.5" />
      <ellipse cx="32" cy="16" rx="22" ry="16" fill="#228B22" />
      <ellipse cx="26" cy="12" rx="12" ry="8" fill="#32CD32" opacity="0.3" />
      {/* Fruits */}
      <circle cx="22" cy="18" r="3" fill="#FF6347" />
      <circle cx="42" cy="16" r="3" fill="#FF4500" />
      <circle cx="32" cy="10" r="3" fill="#FF6347" />
      <circle cx="28" cy="24" r="2.5" fill="#FF4500" opacity="0.8" />
      <circle cx="38" cy="22" r="2.5" fill="#FF6347" opacity="0.8" />
      <circle cx="22" cy="18" r="1" fill="#FFB4A2" opacity="0.6" />
      <circle cx="42" cy="16" r="1" fill="#FFB4A2" opacity="0.6" />
    </svg>
  );
}

// Stage 14: Grand Tree
function GrandTreeIcon({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <ellipse cx="32" cy="58" rx="22" ry="3" fill="#FF4500" opacity="0.2" />
      <rect x="24" y="18" width="16" height="40" rx="8" fill="#2D1B0E" />
      <path d="M16 38l-10 8 8-22v14z" fill="#3E2B17" opacity="0.5" />
      <path d="M48 38l10 8-8-22v14z" fill="#3E2B17" opacity="0.5" />
      <ellipse cx="32" cy="14" rx="26" ry="16" fill="#FF4500" opacity="0.9" />
      <ellipse cx="28" cy="10" rx="14" ry="8" fill="#FF6D3D" opacity="0.4" />
      <ellipse cx="40" cy="12" rx="10" ry="6" fill="#CC3700" opacity="0.3" />
      {/* Crown */}
      <path d="M30 2l2-2 2 2-1 2h-2l-1-2z" fill="#FFD700" opacity="0.8" />
      <circle cx="32" cy="4" r="1" fill="#FFD700" opacity="0.6" />
    </svg>
  );
}

// Stage 15: Ancient Tree
function AncientTreeIcon({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <ellipse cx="32" cy="58" rx="22" ry="3" fill="#DAA520" opacity="0.2" />
      <path d="M24 58c0 0-2-20-4-28 2-2 6-4 12-4s10 2 12 4c-2 8-4 28-4 28H24z" fill="#2D1B0E" />
      <path d="M14 36l-8 10 6-22v12z" fill="#3E2B17" opacity="0.5" />
      <path d="M50 36l8 10-6-22v12z" fill="#3E2B17" opacity="0.5" />
      <ellipse cx="32" cy="14" rx="26" ry="18" fill="#DAA520" />
      <ellipse cx="28" cy="10" rx="14" ry="10" fill="#E8C44A" opacity="0.4" />
      <ellipse cx="40" cy="12" rx="10" ry="8" fill="#B8860B" opacity="0.3" />
      <circle cx="20" cy="16" r="2" fill="#FFE66D" opacity="0.5" />
      <circle cx="44" cy="14" r="2" fill="#FFE66D" opacity="0.4" />
      {/* Glow */}
      <circle cx="32" cy="14" r="12" fill="#FFD700" opacity="0.1" />
    </svg>
  );
}

// Stage 16: Golden Tree
function GoldenTreeIcon({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <ellipse cx="32" cy="58" rx="22" ry="3" fill="#FFD700" opacity="0.3" />
      <rect x="24" y="18" width="16" height="40" rx="8" fill="#B8860B" />
      <path d="M14 36l-8 8 6-20v12z" fill="#996515" opacity="0.5" />
      <path d="M50 36l8 8-6-20v12z" fill="#996515" opacity="0.5" />
      <ellipse cx="32" cy="14" rx="26" ry="18" fill="#FFD700" />
      <ellipse cx="28" cy="10" rx="14" ry="10" fill="#FFE66D" opacity="0.5" />
      <ellipse cx="40" cy="12" rx="10" ry="8" fill="#DAA520" opacity="0.3" />
      {/* Sparkles */}
      <circle cx="20" cy="8" r="2" fill="#FFF8DC" opacity="0.8" />
      <circle cx="44" cy="6" r="1.5" fill="#FFF8DC" opacity="0.7" />
      <circle cx="32" cy="4" r="2" fill="#FFF8DC" opacity="0.9" />
      <circle cx="16" cy="18" r="1.5" fill="#FFFACD" opacity="0.6" />
      <circle cx="48" cy="16" r="1.5" fill="#FFFACD" opacity="0.5" />
      {/* Golden glow */}
      <ellipse cx="32" cy="14" rx="28" ry="20" fill="#FFD700" opacity="0.08" />
    </svg>
  );
}

// Stage 17: Crystal Tree
function CrystalTreeIcon({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <ellipse cx="32" cy="58" rx="22" ry="3" fill="#00CED1" opacity="0.3" />
      <rect x="26" y="20" width="12" height="38" rx="6" fill="#006B6B" />
      <path d="M16 38l-8 6 6-18v12z" fill="#008080" opacity="0.4" />
      <path d="M48 38l8 6-6-18v12z" fill="#008080" opacity="0.4" />
      <ellipse cx="32" cy="16" rx="24" ry="18" fill="#00CED1" />
      <ellipse cx="28" cy="12" rx="12" ry="10" fill="#40E0D0" opacity="0.4" />
      <ellipse cx="40" cy="14" rx="10" ry="8" fill="#008B8B" opacity="0.3" />
      {/* Crystal facets */}
      <polygon points="32,2 28,10 36,10" fill="#E0FFFF" opacity="0.7" />
      <polygon points="20,8 18,16 24,12" fill="#AFEEEE" opacity="0.5" />
      <polygon points="44,8 46,16 40,12" fill="#AFEEEE" opacity="0.5" />
      <circle cx="32" cy="10" r="3" fill="#E0FFFF" opacity="0.4" />
    </svg>
  );
}

// Stage 18: Diamond Tree
function DiamondTreeIcon({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <ellipse cx="32" cy="58" rx="22" ry="3" fill="#E0E7FF" opacity="0.3" />
      <rect x="26" y="20" width="12" height="38" rx="6" fill="#9CA3AF" />
      <path d="M16 38l-8 6 6-18v12z" fill="#6B7280" opacity="0.4" />
      <path d="M48 38l8 6-6-18v12z" fill="#6B7280" opacity="0.4" />
      <ellipse cx="32" cy="16" rx="24" ry="18" fill="#C7D2FE" />
      <ellipse cx="28" cy="12" rx="12" ry="10" fill="#E0E7FF" opacity="0.5" />
      <ellipse cx="40" cy="14" rx="10" ry="8" fill="#A5B4FC" opacity="0.3" />
      {/* Diamond shapes */}
      <polygon points="32,2 28,8 32,14 36,8" fill="#F0F0FF" opacity="0.8" />
      <polygon points="20,8 18,14 22,14" fill="#E8ECFF" opacity="0.6" />
      <polygon points="44,6 42,12 46,12" fill="#E8ECFF" opacity="0.6" />
      <circle cx="32" cy="8" r="2" fill="white" opacity="0.6" />
      {/* Shimmer */}
      <ellipse cx="32" cy="14" rx="28" ry="20" fill="white" opacity="0.06" />
    </svg>
  );
}

// Stage 19: Legendary Tree
function LegendaryTreeIcon({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <ellipse cx="32" cy="58" rx="22" ry="3" fill="#FF69B4" opacity="0.3" />
      <rect x="26" y="20" width="12" height="38" rx="6" fill="#8B1A5A" />
      <path d="M16 36l-10 8 8-20v12z" fill="#6B1548" opacity="0.5" />
      <path d="M48 36l10 8-8-20v12z" fill="#6B1548" opacity="0.5" />
      <ellipse cx="32" cy="14" rx="26" ry="18" fill="#FF69B4" />
      <ellipse cx="28" cy="10" rx="14" ry="10" fill="#FF8DC7" opacity="0.4" />
      <ellipse cx="40" cy="12" rx="10" ry="8" fill="#DB2777" opacity="0.3" />
      {/* Fire/Aura */}
      <path d="M32 0c-2 4-6 6-6 10s4 4 6 2c2 2 6 2 6-2s-4-6-6-10z" fill="#FF69B4" opacity="0.6" />
      <circle cx="20" cy="6" r="2" fill="#FFB6D9" opacity="0.5" />
      <circle cx="44" cy="4" r="2" fill="#FFB6D9" opacity="0.5" />
      <circle cx="32" cy="2" r="1.5" fill="#FFF0F5" opacity="0.7" />
      {/* Glow */}
      <ellipse cx="32" cy="14" rx="30" ry="22" fill="#FF69B4" opacity="0.06" />
    </svg>
  );
}

// Stage 20: Cosmic Tree
function CosmicTreeIcon({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <ellipse cx="32" cy="58" rx="22" ry="3" fill="#9400D3" opacity="0.3" />
      <rect x="26" y="18" width="12" height="40" rx="6" fill="#4C1D95" />
      <path d="M14 34l-10 10 8-24v14z" fill="#3B0764" opacity="0.5" />
      <path d="M50 34l10 10-8-24v14z" fill="#3B0764" opacity="0.5" />
      <ellipse cx="32" cy="14" rx="28" ry="18" fill="#9400D3" />
      <ellipse cx="28" cy="10" rx="14" ry="10" fill="#A855F7" opacity="0.4" />
      <ellipse cx="40" cy="12" rx="10" ry="8" fill="#6D28D9" opacity="0.3" />
      {/* Stars/Cosmic */}
      <circle cx="16" cy="6" r="2" fill="#E9D5FF" opacity="0.8" />
      <circle cx="48" cy="4" r="2" fill="#E9D5FF" opacity="0.7" />
      <circle cx="32" cy="2" r="2.5" fill="#F3E8FF" opacity="0.9" />
      <circle cx="22" cy="16" r="1.5" fill="#DDD6FE" opacity="0.6" />
      <circle cx="42" cy="14" r="1.5" fill="#DDD6FE" opacity="0.5" />
      <circle cx="32" cy="8" r="1" fill="white" opacity="0.8" />
      <circle cx="26" cy="4" r="1" fill="#F5F3FF" opacity="0.6" />
      <circle cx="38" cy="2" r="1" fill="#F5F3FF" opacity="0.5" />
      {/* Outer glow */}
      <ellipse cx="32" cy="14" rx="32" ry="22" fill="#9400D3" opacity="0.05" />
      <ellipse cx="32" cy="14" rx="28" ry="20" fill="#7C3AED" opacity="0.08" />
    </svg>
  );
}

// Export all icons as array indexed by stage (0-19)
export const TREE_STAGE_ICONS: React.FC<IconProps>[] = [
  SeedIcon,
  SproutIcon,
  SaplingIcon,
  YoungPlantIcon,
  BushIcon,
  SmallTreeIcon,
  GrowingTreeIcon,
  MediumTreeIcon,
  TallTreeIcon,
  StrongTreeIcon,
  LargeTreeIcon,
  MatureTreeIcon,
  FruitTreeIcon,
  GrandTreeIcon,
  AncientTreeIcon,
  GoldenTreeIcon,
  CrystalTreeIcon,
  DiamondTreeIcon,
  LegendaryTreeIcon,
  CosmicTreeIcon,
];
