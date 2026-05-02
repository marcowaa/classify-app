// ===== Emoji Kingdom v3 — Boss Module =====
// Multi-boss per world, dynamic phases, health bar, attack mechanics

import { t } from './config.js';

// Boss config per type (visual only — ops come from world)
const BOSS_CATALOG = {
  // Forest bosses
  dragon_baby:     { emoji: '🐲', phases: 2, hp: 10, label: 'Baby Dragon' },
  slime_king:      { emoji: '🟢', phases: 2, hp: 10, label: 'Slime King' },
  flower_witch:    { emoji: '🌺', phases: 2, hp: 10, label: 'Flower Witch' },
  tree_giant:      { emoji: '🌳', phases: 3, hp: 12, label: 'Tree Giant' },
  mushroom_lord:   { emoji: '🍄', phases: 3, hp: 15, label: 'Mushroom Lord' },
  // Orchard bosses
  apple_worm:      { emoji: '🐛', phases: 2, hp: 10, label: 'Apple Worm' },
  veggie_monster:  { emoji: '🥦', phases: 2, hp: 12, label: 'Veggie Monster' },
  pie_boss:        { emoji: '🥧', phases: 3, hp: 12, label: 'Pie Boss' },
  juice_king:      { emoji: '🧃', phases: 3, hp: 14, label: 'Juice King' },
  harvest_dragon:  { emoji: '🐉', phases: 3, hp: 15, label: 'Harvest Dragon' },
  // Ocean bosses
  kraken:          { emoji: '🐙', phases: 3, hp: 12, label: 'Kraken' },
  shark_king:      { emoji: '🦈', phases: 2, hp: 12, label: 'Shark King' },
  storm_whale:     { emoji: '🐋', phases: 3, hp: 14, label: 'Storm Whale' },
  coral_golem:     { emoji: '🪸', phases: 3, hp: 14, label: 'Coral Golem' },
  ice_serpent:      { emoji: '🐍', phases: 3, hp: 15, label: 'Ice Serpent' },
  // Volcano bosses
  lava_dragon:     { emoji: '🐲', phases: 3, hp: 14, label: 'Lava Dragon' },
  fire_golem:      { emoji: '🔥', phases: 3, hp: 14, label: 'Fire Golem' },
  magma_worm:      { emoji: '🪱', phases: 2, hp: 12, label: 'Magma Worm' },
  ash_phoenix:     { emoji: '🦅', phases: 3, hp: 15, label: 'Ash Phoenix' },
  volcano_titan:   { emoji: '🌋', phases: 3, hp: 15, label: 'Volcano Titan' },
  // Electric bosses
  thunder_bot:     { emoji: '🤖', phases: 3, hp: 14, label: 'Thunder Bot' },
  circuit_snake:   { emoji: '🐍', phases: 2, hp: 12, label: 'Circuit Snake' },
  neon_golem:      { emoji: '💜', phases: 3, hp: 14, label: 'Neon Golem' },
  battery_king:    { emoji: '🔋', phases: 3, hp: 15, label: 'Battery King' },
  storm_mech:      { emoji: '⚡', phases: 3, hp: 15, label: 'Storm Mech' },
  // Castle bosses
  knight_boss:     { emoji: '🗡️', phases: 3, hp: 14, label: 'Dark Knight' },
  wizard_king:     { emoji: '🧙', phases: 3, hp: 14, label: 'Wizard King' },
  stone_guardian:  { emoji: '🗿', phases: 2, hp: 12, label: 'Stone Guardian' },
  ghost_lord:      { emoji: '👻', phases: 3, hp: 15, label: 'Ghost Lord' },
  castle_dragon:   { emoji: '🐉', phases: 3, hp: 15, label: 'Castle Dragon' },
  // Space bosses
  alien_emperor:   { emoji: '👽', phases: 3, hp: 14, label: 'Alien Emperor' },
  black_hole:      { emoji: '🕳️', phases: 3, hp: 15, label: 'Black Hole' },
  comet_dragon:    { emoji: '☄️', phases: 3, hp: 14, label: 'Comet Dragon' },
  nebula_giant:    { emoji: '🌌', phases: 3, hp: 15, label: 'Nebula Giant' },
  galaxy_lord:     { emoji: '🌟', phases: 3, hp: 15, label: 'Galaxy Lord' },
  // Puzzle bosses
  puzzle_master:   { emoji: '🧩', phases: 3, hp: 14, label: 'Puzzle Master' },
  riddle_sphinx:   { emoji: '🦁', phases: 3, hp: 14, label: 'Riddle Sphinx' },
  maze_minotaur:   { emoji: '🐂', phases: 3, hp: 15, label: 'Maze Minotaur' },
  logic_golem:     { emoji: '🤖', phases: 3, hp: 14, label: 'Logic Golem' },
  pattern_oracle:  { emoji: '🔮', phases: 3, hp: 15, label: 'Pattern Oracle' },
  // Geometry bosses
  triangle_titan:  { emoji: '🔺', phases: 3, hp: 14, label: 'Triangle Titan' },
  circle_sage:     { emoji: '⭕', phases: 3, hp: 14, label: 'Circle Sage' },
  cube_king:       { emoji: '🟦', phases: 3, hp: 15, label: 'Cube King' },
  prism_dragon:    { emoji: '💎', phases: 3, hp: 15, label: 'Prism Dragon' },
  architect_boss:  { emoji: '🏗️', phases: 3, hp: 15, label: 'The Architect' },
  // Algebra bosses
  equation_dragon: { emoji: '🐲', phases: 3, hp: 15, label: 'Equation Dragon' },
  variable_phantom:{ emoji: '👻', phases: 3, hp: 15, label: 'Variable Phantom' },
  formula_wizard:  { emoji: '🧙', phases: 3, hp: 15, label: 'Formula Wizard' },
  x_lord:          { emoji: '❌', phases: 3, hp: 15, label: 'X Lord' },
  math_emperor:    { emoji: '👑', phases: 3, hp: 15, label: 'Math Emperor' },
};

// Default phase colors
const PHASE_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

export function createBossState(bossType, worldOps) {
  const catalog = BOSS_CATALOG[bossType] || { emoji: '🐲', phases: 3, hp: 15, label: 'Boss' };
  const numPhases = catalog.phases;
  const totalHP = catalog.hp;
  const qPerPhase = Math.ceil(totalHP / numPhases);

  // Build phases from world ops
  const phases = [];
  const ops = worldOps || ['add', 'sub'];
  for (let i = 0; i < numPhases; i++) {
    // Each phase gets progressively more ops
    const phaseOps = ops.slice(0, Math.min(i + 1, ops.length));
    if (phaseOps.length === 0) phaseOps.push(ops[0] || 'add');
    phases.push({
      name: i + 1,
      ops: phaseOps.length > 0 ? phaseOps : ['add'],
      questions: i === numPhases - 1 ? totalHP - qPerPhase * (numPhases - 1) : qPerPhase,
      color: PHASE_COLORS[i % PHASE_COLORS.length],
    });
  }

  return {
    active: true,
    bossType,
    totalHP,
    currentHP: totalHP,
    phase: 0,
    phaseQuestion: 0,
    playerHP: 5,
    emoji: catalog.emoji,
    label: catalog.label,
    defeated: false,
    phases,
  };
}

export function getPhases(boss) {
  return boss ? boss.phases : [];
}

export function getCurrentPhase(boss) {
  return boss.phases[Math.min(boss.phase, boss.phases.length - 1)];
}

export function getCurrentPhaseOps(boss) {
  return getCurrentPhase(boss).ops;
}

export function getBossPhaseLabel(boss) {
  return t('bossPhase').replace('{n}', boss.phase + 1);
}

export function hitBoss(boss) {
  boss.currentHP = Math.max(0, boss.currentHP - 1);
  boss.phaseQuestion++;
  const phase = getCurrentPhase(boss);
  if (boss.phaseQuestion >= phase.questions && boss.phase < boss.phases.length - 1) {
    boss.phase++;
    boss.phaseQuestion = 0;
  }
  if (boss.currentHP <= 0) boss.defeated = true;
  return { hit: true, defeated: boss.defeated, phaseChanged: boss.phaseQuestion === 0 };
}

export function bossAttack(boss) {
  boss.playerHP = Math.max(0, boss.playerHP - 1);
  return { playerHP: boss.playerHP, gameOver: boss.playerHP <= 0 };
}

export function getBossHPPercent(boss) {
  return (boss.currentHP / boss.totalHP) * 100;
}

export function getBossPhaseSegments(boss) {
  let used = boss.totalHP - boss.currentHP;
  return boss.phases.map((ph, i) => {
    const segHP = ph.questions;
    const segUsed = Math.min(used, segHP);
    used -= segUsed;
    return {
      total: segHP,
      remaining: segHP - segUsed,
      color: ph.color,
      active: i === boss.phase,
    };
  });
}

export function getBossEmoji(boss) {
  const pct = boss.currentHP / boss.totalHP;
  if (pct > 0.6) return boss.emoji;
  if (pct > 0.3) return '😤';
  if (pct > 0) return '🤕';
  return '💀';
}

export function isBossDefeated(boss) {
  return boss.defeated;
}
