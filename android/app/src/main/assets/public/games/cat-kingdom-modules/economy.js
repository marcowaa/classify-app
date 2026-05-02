/* ═══════════════════════════════════════════════════════════════
   Cat Kingdom — Economy / Power-ups Module
   Enhanced shop with consumable power-ups
   Pattern: matches gem-kingdom-modules/economy.js
   ═══════════════════════════════════════════════════════════════ */

import { LANG, L } from './i18n.js';

const ECON_KEY = 'catk_economy';

/* ══════════════════════════════
   Power-up Definitions
   ══════════════════════════════ */
export const POWERUPS = {
  hint: {
    id: 'hint',
    emoji: '💡',
    name: () => L('تلميح', 'Hint', 'Dica'),
    desc: () => L('يزيل إجابتين خاطئتين', 'Removes 2 wrong answers', 'Remove 2 respostas erradas'),
    cost: 30,
    maxStack: 10,
  },
  freeze: {
    id: 'freeze',
    emoji: '❄️',
    name: () => L('تجميد الوقت', 'Freeze Time', 'Congelar Tempo'),
    desc: () => L('يوقف المؤقت 10 ثوانٍ', 'Stops timer for 10 seconds', 'Para o cronômetro por 10 segundos'),
    cost: 50,
    maxStack: 5,
  },
  extraLife: {
    id: 'extraLife',
    emoji: '❤️',
    name: () => L('حياة إضافية', 'Extra Life', 'Vida Extra'),
    desc: () => L('يحفظك من خسارة حياة', 'Saves you from losing a life', 'Salva de perder uma vida'),
    cost: 60,
    maxStack: 5,
  },
  doubleScore: {
    id: 'doubleScore',
    emoji: '✨',
    name: () => L('نقاط مضاعفة', 'Double Score', 'Pontuação Dupla'),
    desc: () => L('يضاعف نقاط المستوى التالي', 'Doubles next level\'s score', 'Dobra a pontuação do próximo nível'),
    cost: 80,
    maxStack: 3,
  },
  shield: {
    id: 'shield',
    emoji: '🛡️',
    name: () => L('درع', 'Shield', 'Escudo'),
    desc: () => L('يحمي من أول خطأ', 'Protects from first mistake', 'Protege do primeiro erro'),
    cost: 40,
    maxStack: 5,
  },
};

/* ══════════════════════════════
   State Management
   ══════════════════════════════ */
function defaultEcon() {
  return {
    inventory: {},      // { powerupId: count }
    totalSpent: 0,
    totalPurchases: 0,
    activePowerups: [], // power-ups active for current level
  };
}

export function loadEconomy() {
  try {
    const raw = localStorage.getItem(ECON_KEY);
    if (raw) return { ...defaultEcon(), ...JSON.parse(raw) };
  } catch (e) {}
  return defaultEcon();
}

export function saveEconomy(econ) {
  try { localStorage.setItem(ECON_KEY, JSON.stringify(econ)); } catch (e) {}
}

/* ══════════════════════════════
   Purchase Power-up
   Returns { success, message, balance }
   ══════════════════════════════ */
export function buyPowerup(econ, powerupId, getCoins, spendCoins) {
  const pu = POWERUPS[powerupId];
  if (!pu) return { success: false, message: L('غير موجود', 'Not found', 'Não encontrado') };

  const coins = getCoins();
  if (coins < pu.cost) {
    return {
      success: false,
      message: L(
        `تحتاج ${pu.cost} عملة (عندك ${coins})`,
        `Need ${pu.cost} coins (you have ${coins})`,
        `Precisa de ${pu.cost} moedas (tem ${coins})`
      ),
    };
  }

  const current = econ.inventory[powerupId] || 0;
  if (current >= pu.maxStack) {
    return {
      success: false,
      message: L(
        `الحد الأقصى ${pu.maxStack}!`,
        `Max ${pu.maxStack} owned!`,
        `Máximo ${pu.maxStack}!`
      ),
    };
  }

  spendCoins(pu.cost);
  econ.inventory[powerupId] = current + 1;
  econ.totalSpent += pu.cost;
  econ.totalPurchases++;
  saveEconomy(econ);

  return {
    success: true,
    message: L(
      `اشتريت ${pu.emoji} ${pu.name()}!`,
      `Bought ${pu.emoji} ${pu.name()}!`,
      `Comprou ${pu.emoji} ${pu.name()}!`
    ),
    balance: getCoins(),
    count: econ.inventory[powerupId],
  };
}

/* ══════════════════════════════
   Use Power-up
   ══════════════════════════════ */
export function usePowerup(econ, powerupId) {
  const count = econ.inventory[powerupId] || 0;
  if (count <= 0) return false;

  econ.inventory[powerupId] = count - 1;
  if (!econ.activePowerups.includes(powerupId)) {
    econ.activePowerups.push(powerupId);
  }
  saveEconomy(econ);
  return true;
}

/**
 * Check if a power-up is active for current level
 */
export function isPowerupActive(econ, powerupId) {
  return econ.activePowerups.includes(powerupId);
}

/**
 * Clear active power-ups (call after level ends)
 */
export function clearActivePowerups(econ) {
  econ.activePowerups = [];
  saveEconomy(econ);
}

/**
 * Get count of owned power-up
 */
export function getPowerupCount(econ, powerupId) {
  return econ.inventory[powerupId] || 0;
}

/* ══════════════════════════════
   Apply Hint: removes 2 wrong answers
   Returns array of option indices to hide
   ══════════════════════════════ */
export function applyHint(options, correctIndex) {
  const wrongIndices = [];
  for (let i = 0; i < options.length; i++) {
    if (i !== correctIndex) wrongIndices.push(i);
  }
  // Shuffle and take 2
  for (let i = wrongIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [wrongIndices[i], wrongIndices[j]] = [wrongIndices[j], wrongIndices[i]];
  }
  return wrongIndices.slice(0, Math.min(2, wrongIndices.length));
}

/* ══════════════════════════════
   Shop items list for rendering
   ══════════════════════════════ */
export function getShopItems(econ) {
  return Object.values(POWERUPS).map(pu => ({
    id: pu.id,
    emoji: pu.emoji,
    name: pu.name(),
    desc: pu.desc(),
    cost: pu.cost,
    owned: econ.inventory[pu.id] || 0,
    maxStack: pu.maxStack,
    canBuy: (econ.inventory[pu.id] || 0) < pu.maxStack,
  }));
}

/* ══════════════════════════════
   Get active power-ups info for HUD display
   ══════════════════════════════ */
export function getActivePowerupsDisplay(econ) {
  return econ.activePowerups
    .filter(id => POWERUPS[id])
    .map(id => ({
      id,
      emoji: POWERUPS[id].emoji,
      name: POWERUPS[id].name(),
    }));
}
