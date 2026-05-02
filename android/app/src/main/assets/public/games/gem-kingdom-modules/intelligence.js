/**
 * Gem Kingdom — intelligence.js
 * Dynamic Difficulty Adjustment (DDA) v2
 * Per-mechanic skill profiling, frustration/boredom detection, flow-state tuning
 *
 * Exports:
 *   getLevelAdjustment(progress, worldIdx, levelIdx)
 *   updateAfterLevel(progress, score, maxCombo, timeSec, movesLeft)
 */

// ===== SKILL DIMENSIONS (per-mechanic tracking) =====
const SKILLS = [
  'matching',    // Basic match-3 speed & accuracy
  'specials',    // Creating special gems
  'obstacles',   // Breaking obstacles efficiently
  'combos',      // Sustaining long combos
  'planning',    // Using moves efficiently (movesLeft)
  'speed',       // Completing levels quickly
  'boss',        // Boss damage efficiency
];

const DEFAULT_SKILL = () => ({
  rating: 50,       // 0-100 scale
  samples: 0,       // number of data points
  trend: 0,         // recent trend (-10 to +10)
  lastValues: [],   // last 5 raw scores for this skill
});

// ===== FLOW STATE DETECTION =====
const FLOW = {
  FRUSTRATION: -2,
  STRUGGLING: -1,
  NORMAL: 0,
  FLOW: 1,
  BOREDOM: 2,
};

function detectFlowState(progress) {
  const h = progress._dda || {};
  const streak = h.consecutiveFails || 0;
  const winStreak = h.consecutiveWins || 0;
  const avgMovesLeft = h.avgMovesLeftPct || 50;

  // Frustration: 3+ consecutive fails
  if (streak >= 3) return FLOW.FRUSTRATION;
  // Struggling: 2 consecutive fails
  if (streak >= 2) return FLOW.STRUGGLING;
  // Boredom: 3+ wins with lots of moves left
  if (winStreak >= 3 && avgMovesLeft > 60) return FLOW.BOREDOM;
  // Flow: winning with moderate challenge
  if (winStreak >= 1 && avgMovesLeft >= 10 && avgMovesLeft <= 45) return FLOW.FLOW;
  // Normal
  return FLOW.NORMAL;
}

// ===== LEVEL ADJUSTMENT CALCULATION =====

/**
 * Returns adjustments to apply for a given level based on player skill & history
 * @param {Object} progress - Player progress from loadProgress()
 * @param {number} worldIdx - World index (0-9)
 * @param {number} levelIdx - Level index (0-9)
 * @returns {Object} { extraMoves, scoreMultiplier, spawnBias, hintDelay, bossHPMult, message }
 */
export function getLevelAdjustment(progress, worldIdx, levelIdx) {
  const result = {
    extraMoves: 0,
    scoreMultiplier: 1.0,
    spawnBias: 0,        // -2 to +2  (negative = easier colors spawned)
    hintDelay: 5000,     // ms before hint appears
    bossHPMult: 1.0,     // boss HP multiplier
    message: null,       // optional encouragement
  };

  if (!progress) return result;

  const flowState = detectFlowState(progress);
  const dda = progress._dda || {};
  const skill = getOverallSkill(progress);
  const attempts = dda.levelAttempts?.[`${worldIdx}-${levelIdx}`] || 0;

  switch (flowState) {
    case FLOW.FRUSTRATION:
      // Maximum help
      result.extraMoves = Math.min(5 + attempts, 10);
      result.scoreMultiplier = 0.8;
      result.spawnBias = -2;
      result.hintDelay = 2000;
      result.bossHPMult = 0.7;
      result.message = 'encouragement_max';
      break;

    case FLOW.STRUGGLING:
      // Moderate help
      result.extraMoves = Math.min(3 + Math.floor(attempts / 2), 7);
      result.scoreMultiplier = 0.9;
      result.spawnBias = -1;
      result.hintDelay = 3000;
      result.bossHPMult = 0.85;
      result.message = 'encouragement';
      break;

    case FLOW.NORMAL:
      // No adjustment
      result.hintDelay = 5000;
      break;

    case FLOW.FLOW:
      // Slightly harder to maintain challenge
      result.spawnBias = 1;
      result.hintDelay = 8000;
      break;

    case FLOW.BOREDOM:
      // Increase challenge
      result.spawnBias = 2;
      result.hintDelay = 10000;
      result.bossHPMult = 1.15;
      result.message = 'challenge_up';
      break;
  }

  // Per-attempt ramp: after 3+ attempts on same level, give increasingly more help
  if (attempts >= 5) {
    result.extraMoves = Math.max(result.extraMoves, 5);
    result.spawnBias = Math.min(result.spawnBias, -1);
  } else if (attempts >= 3) {
    result.extraMoves = Math.max(result.extraMoves, 3);
  }

  // Skill-based fine-tuning
  if (skill < 30) {
    // Beginner: more forgiving
    result.hintDelay = Math.min(result.hintDelay, 3000);
    result.extraMoves = Math.max(result.extraMoves, 2);
  } else if (skill > 80) {
    // Expert: tougher
    result.hintDelay = Math.max(result.hintDelay, 8000);
    result.bossHPMult = Math.max(result.bossHPMult, 1.1);
  }

  return result;
}

// ===== POST-LEVEL SKILL UPDATE =====

/**
 * Update DDA data after a level completion (win or lose)
 * @param {Object} progress - Player progress (will be mutated)
 * @param {number} score - Score achieved
 * @param {number} maxCombo - Highest combo chain
 * @param {number} timeSec - Time taken in seconds
 * @param {number} movesLeft - Remaining moves (0 if failed)
 * @param {Object} [extra] - Optional extra data: {won, worldIdx, levelIdx, specialsCreated, obstaclesCleared, bossHP}
 * @returns {Object} Updated progress
 */
export function updateAfterLevel(progress, score, maxCombo, timeSec, movesLeft, extra = {}) {
  if (!progress) return progress;

  // Init DDA tracking object
  if (!progress._dda) {
    progress._dda = {
      consecutiveFails: 0,
      consecutiveWins: 0,
      totalGames: 0,
      avgMovesLeftPct: 50,
      skills: {},
      levelAttempts: {},
      sessionScores: [],
      lastFlowState: FLOW.NORMAL,
    };
  }

  const dda = progress._dda;
  const won = extra.won !== undefined ? extra.won : movesLeft > 0;
  const levelKey = extra.worldIdx !== undefined ? `${extra.worldIdx}-${extra.levelIdx}` : null;

  // Track attempts per level
  if (levelKey) {
    dda.levelAttempts[levelKey] = (dda.levelAttempts[levelKey] || 0) + 1;
    if (won) {
      // Reset attempts on win (or cap to prevent stale data)
      dda.levelAttempts[levelKey] = 0;
    }
  }

  // Win/fail streaks
  if (won) {
    dda.consecutiveWins = (dda.consecutiveWins || 0) + 1;
    dda.consecutiveFails = 0;
  } else {
    dda.consecutiveFails = (dda.consecutiveFails || 0) + 1;
    dda.consecutiveWins = 0;
  }

  dda.totalGames = (dda.totalGames || 0) + 1;

  // Rolling average of moves left %
  const totalMoves = (movesLeft || 0) + (extra.movesUsed || 20);
  const movesLeftPct = totalMoves > 0 ? Math.round((movesLeft / totalMoves) * 100) : 0;
  dda.avgMovesLeftPct = Math.round(
    (dda.avgMovesLeftPct || 50) * 0.7 + movesLeftPct * 0.3
  );

  // Track session scores (last 10)
  dda.sessionScores = dda.sessionScores || [];
  dda.sessionScores.push(score);
  if (dda.sessionScores.length > 10) dda.sessionScores.shift();

  // Update skills
  updateSkill(dda, 'matching', won ? Math.min(score / 50, 100) : Math.min(score / 100, 40));
  updateSkill(dda, 'combos', Math.min(maxCombo * 15, 100));
  updateSkill(dda, 'speed', timeSec < 60 ? 90 : timeSec < 120 ? 70 : timeSec < 180 ? 50 : 30);
  updateSkill(dda, 'planning', movesLeftPct);

  if (extra.specialsCreated !== undefined) {
    updateSkill(dda, 'specials', Math.min(extra.specialsCreated * 10, 100));
  }
  if (extra.obstaclesCleared !== undefined) {
    updateSkill(dda, 'obstacles', Math.min(extra.obstaclesCleared * 5, 100));
  }
  if (extra.bossHP !== undefined) {
    updateSkill(dda, 'boss', extra.bossHP <= 0 ? 90 : 30);
  }

  // Flow state from this round
  dda.lastFlowState = detectFlowState(progress);

  return progress;
}

// ===== SKILL HELPERS =====

function initSkills(dda) {
  if (!dda.skills) dda.skills = {};
  for (const dim of SKILLS) {
    if (!dda.skills[dim]) dda.skills[dim] = DEFAULT_SKILL();
  }
}

function updateSkill(dda, dimension, rawScore) {
  initSkills(dda);
  const s = dda.skills[dimension];
  if (!s) return;

  s.lastValues = s.lastValues || [];
  s.lastValues.push(rawScore);
  if (s.lastValues.length > 5) s.lastValues.shift();

  // Exponential moving average
  const alpha = s.samples < 3 ? 0.5 : 0.3;
  s.rating = Math.round(s.rating * (1 - alpha) + rawScore * alpha);
  s.rating = Math.max(0, Math.min(100, s.rating));
  s.samples++;

  // Trend: compare last 2 vs previous 2
  if (s.lastValues.length >= 4) {
    const recent = (s.lastValues[s.lastValues.length - 1] + s.lastValues[s.lastValues.length - 2]) / 2;
    const older = (s.lastValues[s.lastValues.length - 3] + s.lastValues[s.lastValues.length - 4]) / 2;
    s.trend = Math.round(Math.max(-10, Math.min(10, recent - older)));
  }
}

function getOverallSkill(progress) {
  const dda = progress._dda;
  if (!dda || !dda.skills) return 50;
  const ratings = Object.values(dda.skills).map(s => s.rating || 50);
  if (ratings.length === 0) return 50;
  return Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length);
}

// ===== ANALYTICS EXPORT =====

/**
 * Get detailed skill report for parent analytics / reports.js
 */
export function getSkillReport(progress) {
  const dda = progress?._dda;
  if (!dda) return null;

  initSkills(dda);
  const skills = {};
  for (const dim of SKILLS) {
    const s = dda.skills[dim] || DEFAULT_SKILL();
    skills[dim] = {
      rating: s.rating,
      trend: s.trend,
      samples: s.samples,
      level: s.rating >= 80 ? 'expert' : s.rating >= 60 ? 'advanced' : s.rating >= 40 ? 'intermediate' : s.rating >= 20 ? 'beginner' : 'novice',
    };
  }

  return {
    overall: getOverallSkill(progress),
    skills,
    flowState: dda.lastFlowState,
    totalGames: dda.totalGames || 0,
    consecutiveWins: dda.consecutiveWins || 0,
    consecutiveFails: dda.consecutiveFails || 0,
    sessionScores: [...(dda.sessionScores || [])],
  };
}

/**
 * Get encouragement messages based on flow state
 */
export function getEncouragement(progress) {
  const flow = detectFlowState(progress);
  const messages = {
    ar: {
      [FLOW.FRUSTRATION]: ['لا تستسلم! أنت تتحسن! 💪', 'كل فشل يقربك من النجاح! 🌟', 'جرب استراتيجية مختلفة! 🧠'],
      [FLOW.STRUGGLING]: ['أنت قريب من الفوز! ✨', 'ركز على الأهداف! 🎯', 'استخدم المعززات للمساعدة! 🔧'],
      [FLOW.NORMAL]: ['أحسنت! استمر! 👍', 'أداء رائع! 🌟'],
      [FLOW.FLOW]: ['أنت في قمة أدائك! 🔥', 'مذهل! استمر هكذا! ⚡'],
      [FLOW.BOREDOM]: ['جرب تحدي أصعب! 🏆', 'حاول الحصول على 3 نجوم! ⭐⭐⭐'],
    },
    en: {
      [FLOW.FRUSTRATION]: ["Don't give up! You're improving! 💪", 'Every fail brings you closer to success! 🌟', 'Try a different strategy! 🧠'],
      [FLOW.STRUGGLING]: ["You're close to winning! ✨", 'Focus on the objectives! 🎯', 'Use boosters for help! 🔧'],
      [FLOW.NORMAL]: ['Well done! Keep going! 👍', 'Great performance! 🌟'],
      [FLOW.FLOW]: ["You're at peak performance! 🔥", 'Amazing! Keep it up! ⚡'],
      [FLOW.BOREDOM]: ['Try a harder challenge! 🏆', 'Aim for 3 stars! ⭐⭐⭐'],
    },
    pt: {
      [FLOW.FRUSTRATION]: ['Não desista! Você está melhorando! 💪', 'Cada falha te aproxima do sucesso! 🌟', 'Tente uma estratégia diferente! 🧠'],
      [FLOW.STRUGGLING]: ['Você está perto de vencer! ✨', 'Foque nos objetivos! 🎯', 'Use reforços para ajudar! 🔧'],
      [FLOW.NORMAL]: ['Muito bem! Continue! 👍', 'Ótimo desempenho! 🌟'],
      [FLOW.FLOW]: ['Você está no auge! 🔥', 'Incrível! Continue assim! ⚡'],
      [FLOW.BOREDOM]: ['Tente um desafio mais difícil! 🏆', 'Mire nas 3 estrelas! ⭐⭐⭐'],
    },
    es: {
      [FLOW.FRUSTRATION]: ['¡No te rindas! ¡Estás mejorando! 💪', '¡Cada fallo te acerca al éxito! 🌟', '¡Prueba una estrategia diferente! 🧠'],
      [FLOW.STRUGGLING]: ['¡Estás cerca de ganar! ✨', '¡Concéntrate en los objetivos! 🎯', '¡Usa los potenciadores! 🔧'],
      [FLOW.NORMAL]: ['¡Bien hecho! ¡Sigue así! 👍', '¡Gran rendimiento! 🌟'],
      [FLOW.FLOW]: ['¡Estás en tu mejor momento! 🔥', '¡Increíble! ¡Sigue! ⚡'],
      [FLOW.BOREDOM]: ['¡Prueba un reto más difícil! 🏆', '¡Apunta a 3 estrellas! ⭐⭐⭐'],
    },
    fr: {
      [FLOW.FRUSTRATION]: ['N\'abandonne pas ! Tu t\'améliores ! 💪', 'Chaque échec te rapproche du succès ! 🌟', 'Essaie une stratégie différente ! 🧠'],
      [FLOW.STRUGGLING]: ['Tu es proche de gagner ! ✨', 'Concentre-toi sur les objectifs ! 🎯', 'Utilise les boosters ! 🔧'],
      [FLOW.NORMAL]: ['Bien joué ! Continue ! 👍', 'Super performance ! 🌟'],
      [FLOW.FLOW]: ['Tu es au sommet ! 🔥', 'Incroyable ! Continue ! ⚡'],
      [FLOW.BOREDOM]: ['Essaie un défi plus dur ! 🏆', 'Vise les 3 étoiles ! ⭐⭐⭐'],
    },
    de: {
      [FLOW.FRUSTRATION]: ['Gib nicht auf! Du wirst besser! 💪', 'Jeder Fehler bringt dich näher! 🌟', 'Versuch eine andere Strategie! 🧠'],
      [FLOW.STRUGGLING]: ['Du bist nah dran! ✨', 'Konzentriere dich auf die Ziele! 🎯', 'Nutze die Booster! 🔧'],
      [FLOW.NORMAL]: ['Gut gemacht! Weiter so! 👍', 'Tolle Leistung! 🌟'],
      [FLOW.FLOW]: ['Du bist in Topform! 🔥', 'Erstaunlich! Weiter so! ⚡'],
      [FLOW.BOREDOM]: ['Versuch eine härtere Herausforderung! 🏆', 'Ziel auf 3 Sterne! ⭐⭐⭐'],
    },
    it: {
      [FLOW.FRUSTRATION]: ['Non arrenderti! Stai migliorando! 💪', 'Ogni errore ti avvicina al successo! 🌟', 'Prova una strategia diversa! 🧠'],
      [FLOW.STRUGGLING]: ['Sei vicino alla vittoria! ✨', 'Concentrati sugli obiettivi! 🎯', 'Usa i potenziamenti! 🔧'],
      [FLOW.NORMAL]: ['Ben fatto! Continua! 👍', 'Ottima prestazione! 🌟'],
      [FLOW.FLOW]: ['Sei al massimo! 🔥', 'Incredibile! Vai avanti! ⚡'],
      [FLOW.BOREDOM]: ['Prova una sfida più difficile! 🏆', 'Punta a 3 stelle! ⭐⭐⭐'],
    },
    ru: {
      [FLOW.FRUSTRATION]: ['Не сдавайся! Ты улучшаешься! 💪', 'Каждая неудача приближает к успеху! 🌟', 'Попробуй другую стратегию! 🧠'],
      [FLOW.STRUGGLING]: ['Ты близок к победе! ✨', 'Сосредоточься на целях! 🎯', 'Используй бустеры! 🔧'],
      [FLOW.NORMAL]: ['Молодец! Продолжай! 👍', 'Отличный результат! 🌟'],
      [FLOW.FLOW]: ['Ты на пике! 🔥', 'Невероятно! Так держать! ⚡'],
      [FLOW.BOREDOM]: ['Попробуй сложнее! 🏆', 'Целься на 3 звезды! ⭐⭐⭐'],
    },
    zh: {
      [FLOW.FRUSTRATION]: ['别放弃！你在进步！💪', '每次失败都让你更近一步！🌟', '试试不同的策略！🧠'],
      [FLOW.STRUGGLING]: ['你快赢了！✨', '专注目标！🎯', '使用增强道具！🔧'],
      [FLOW.NORMAL]: ['干得好！继续！👍', '表现出色！🌟'],
      [FLOW.FLOW]: ['你状态正佳！🔥', '太棒了！继续！⚡'],
      [FLOW.BOREDOM]: ['试试更难的挑战！🏆', '争取3颗星！⭐⭐⭐'],
    },
    ja: {
      [FLOW.FRUSTRATION]: ['諦めないで！上達してるよ！💪', '失敗は成功の元！🌟', '別の戦略を試そう！🧠'],
      [FLOW.STRUGGLING]: ['もう少しで勝てる！✨', '目標に集中！🎯', 'ブースターを使おう！🔧'],
      [FLOW.NORMAL]: ['よくやった！続けよう！👍', '素晴らしい！🌟'],
      [FLOW.FLOW]: ['絶好調！🔥', 'すごい！その調子！⚡'],
      [FLOW.BOREDOM]: ['もっと難しい挑戦を！🏆', '星3つを目指そう！⭐⭐⭐'],
    },
    ko: {
      [FLOW.FRUSTRATION]: ['포기하지 마! 나아지고 있어! 💪', '실패는 성공의 어머니! 🌟', '다른 전략을 시도해봐! 🧠'],
      [FLOW.STRUGGLING]: ['거의 이겼어! ✨', '목표에 집중해! 🎯', '부스터를 사용해! 🔧'],
      [FLOW.NORMAL]: ['잘했어! 계속해! 👍', '훌륭한 실력! 🌟'],
      [FLOW.FLOW]: ['최고의 실력이야! 🔥', '대단해! 계속! ⚡'],
      [FLOW.BOREDOM]: ['더 어려운 도전을! 🏆', '별 3개를 노려봐! ⭐⭐⭐'],
    },
    hi: {
      [FLOW.FRUSTRATION]: ['हार मत मानो! तुम सुधर रहे हो! 💪', 'हर असफलता सफलता के करीब लाती है! 🌟', 'अलग रणनीति आज़माओ! 🧠'],
      [FLOW.STRUGGLING]: ['जीतने के करीब हो! ✨', 'लक्ष्य पर ध्यान दो! 🎯', 'बूस्टर इस्तेमाल करो! 🔧'],
      [FLOW.NORMAL]: ['शाबाश! जारी रखो! 👍', 'बढ़िया प्रदर्शन! 🌟'],
      [FLOW.FLOW]: ['शानदार प्रदर्शन! 🔥', 'अद्भुत! ऐसे ही चलो! ⚡'],
      [FLOW.BOREDOM]: ['कठिन चुनौती आज़माओ! 🏆', '3 तारे का लक्ष्य रखो! ⭐⭐⭐'],
    },
    tr: {
      [FLOW.FRUSTRATION]: ['Vazgeçme! Gelişiyorsun! 💪', 'Her başarısızlık seni yaklaştırır! 🌟', 'Farklı bir strateji dene! 🧠'],
      [FLOW.STRUGGLING]: ['Kazanmaya yakınsın! ✨', 'Hedeflere odaklan! 🎯', 'Güçlendiricileri kullan! 🔧'],
      [FLOW.NORMAL]: ['Aferin! Devam et! 👍', 'Harika performans! 🌟'],
      [FLOW.FLOW]: ['Zirvede performans! 🔥', 'İnanılmaz! Böyle devam! ⚡'],
      [FLOW.BOREDOM]: ['Daha zor bir meydan okuma dene! 🏆', '3 yıldızı hedefle! ⭐⭐⭐'],
    },
    nl: {
      [FLOW.FRUSTRATION]: ['Geef niet op! Je wordt beter! 💪', 'Elke fout brengt je dichterbij! 🌟', 'Probeer een andere strategie! 🧠'],
      [FLOW.STRUGGLING]: ['Je bent dichtbij winnen! ✨', 'Focus op de doelen! 🎯', 'Gebruik boosters! 🔧'],
      [FLOW.NORMAL]: ['Goed gedaan! Ga door! 👍', 'Geweldige prestatie! 🌟'],
      [FLOW.FLOW]: ['Je bent in topvorm! 🔥', 'Geweldig! Ga zo door! ⚡'],
      [FLOW.BOREDOM]: ['Probeer een moeilijkere uitdaging! 🏆', 'Mik op 3 sterren! ⭐⭐⭐'],
    },
    sv: {
      [FLOW.FRUSTRATION]: ['Ge inte upp! Du blir bättre! 💪', 'Varje misslyckande närmar dig! 🌟', 'Testa en annan strategi! 🧠'],
      [FLOW.STRUGGLING]: ['Du är nära att vinna! ✨', 'Fokusera på målen! 🎯', 'Använd boosters! 🔧'],
      [FLOW.NORMAL]: ['Bra gjort! Fortsätt! 👍', 'Fantastisk prestation! 🌟'],
      [FLOW.FLOW]: ['Du är i toppform! 🔥', 'Otroligt! Fortsätt! ⚡'],
      [FLOW.BOREDOM]: ['Testa en svårare utmaning! 🏆', 'Sikta på 3 stjärnor! ⭐⭐⭐'],
    },
    pl: {
      [FLOW.FRUSTRATION]: ['Nie poddawaj się! Robisz postępy! 💪', 'Każda porażka przybliża sukces! 🌟', 'Spróbuj innej strategii! 🧠'],
      [FLOW.STRUGGLING]: ['Jesteś blisko wygranej! ✨', 'Skup się na celach! 🎯', 'Użyj wzmocnień! 🔧'],
      [FLOW.NORMAL]: ['Dobrze! Kontynuuj! 👍', 'Świetny wynik! 🌟'],
      [FLOW.FLOW]: ['Jesteś w szczytowej formie! 🔥', 'Niesamowite! Tak trzymaj! ⚡'],
      [FLOW.BOREDOM]: ['Spróbuj trudniejszego wyzwania! 🏆', 'Celuj w 3 gwiazdki! ⭐⭐⭐'],
    },
    uk: {
      [FLOW.FRUSTRATION]: ['Не здавайся! Ти покращуєшся! 💪', 'Кожна невдача наближає до успіху! 🌟', 'Спробуй іншу стратегію! 🧠'],
      [FLOW.STRUGGLING]: ['Ти близько до перемоги! ✨', 'Зосередься на цілях! 🎯', 'Використай бустери! 🔧'],
      [FLOW.NORMAL]: ['Молодець! Продовжуй! 👍', 'Чудовий результат! 🌟'],
      [FLOW.FLOW]: ['Ти на піку! 🔥', 'Неймовірно! Так тримай! ⚡'],
      [FLOW.BOREDOM]: ['Спробуй складніше! 🏆', 'Ціль на 3 зірки! ⭐⭐⭐'],
    },
    id: {
      [FLOW.FRUSTRATION]: ['Jangan menyerah! Kamu berkembang! 💪', 'Setiap gagal mendekatkanmu! 🌟', 'Coba strategi berbeda! 🧠'],
      [FLOW.STRUGGLING]: ['Kamu hampir menang! ✨', 'Fokus pada tujuan! 🎯', 'Gunakan booster! 🔧'],
      [FLOW.NORMAL]: ['Bagus! Lanjutkan! 👍', 'Penampilan hebat! 🌟'],
      [FLOW.FLOW]: ['Kamu di puncak! 🔥', 'Luar biasa! Terus! ⚡'],
      [FLOW.BOREDOM]: ['Coba tantangan lebih sulit! 🏆', 'Bidik 3 bintang! ⭐⭐⭐'],
    },
    ms: {
      [FLOW.FRUSTRATION]: ['Jangan putus asa! Kamu semakin baik! 💪', 'Setiap kegagalan mendekatkan kejayaan! 🌟', 'Cuba strategi lain! 🧠'],
      [FLOW.STRUGGLING]: ['Hampir menang! ✨', 'Fokus pada matlamat! 🎯', 'Guna penggalak! 🔧'],
      [FLOW.NORMAL]: ['Bagus! Teruskan! 👍', 'Prestasi hebat! 🌟'],
      [FLOW.FLOW]: ['Kamu di puncak! 🔥', 'Luar biasa! Teruskan! ⚡'],
      [FLOW.BOREDOM]: ['Cuba cabaran lebih sukar! 🏆', 'Sasarkan 3 bintang! ⭐⭐⭐'],
    },
    th: {
      [FLOW.FRUSTRATION]: ['อย่ายอมแพ้! เจ้าเก่งขึ้นแล้ว! 💪', 'ทุกความผิดพลาดทำให้ใกล้ขึ้น! 🌟', 'ลองกลยุทธ์ใหม่! 🧠'],
      [FLOW.STRUGGLING]: ['ใกล้ชนะแล้ว! ✨', 'มุ่งเน้นเป้าหมาย! 🎯', 'ใช้บูสเตอร์! 🔧'],
      [FLOW.NORMAL]: ['เก่งมาก! ต่อไป! 👍', 'ผลงานยอดเยี่ยม! 🌟'],
      [FLOW.FLOW]: ['สุดยอด! 🔥', 'เหลือเชื่อ! ไปต่อ! ⚡'],
      [FLOW.BOREDOM]: ['ลองท้าทายยากขึ้น! 🏆', 'ตั้งเป้า 3 ดาว! ⭐⭐⭐'],
    },
    vi: {
      [FLOW.FRUSTRATION]: ['Đừng bỏ cuộc! Bạn đang tiến bộ! 💪', 'Mỗi thất bại đưa bạn gần hơn! 🌟', 'Thử chiến lược khác! 🧠'],
      [FLOW.STRUGGLING]: ['Gần thắng rồi! ✨', 'Tập trung vào mục tiêu! 🎯', 'Dùng vật phẩm hỗ trợ! 🔧'],
      [FLOW.NORMAL]: ['Giỏi lắm! Tiếp tục! 👍', 'Phong độ tuyệt vời! 🌟'],
      [FLOW.FLOW]: ['Đỉnh cao phong độ! 🔥', 'Tuyệt vời! Tiếp tục! ⚡'],
      [FLOW.BOREDOM]: ['Thử thách khó hơn đi! 🏆', 'Nhắm 3 sao! ⭐⭐⭐'],
    },
    fa: {
      [FLOW.FRUSTRATION]: ['تسلیم نشو! داری پیشرفت می‌کنی! 💪', 'هر شکست به موفقیت نزدیکت می‌کنه! 🌟', 'استراتژی دیگه‌ای امتحان کن! 🧠'],
      [FLOW.STRUGGLING]: ['نزدیک بردی! ✨', 'روی اهداف تمرکز کن! 🎯', 'از بوسترها استفاده کن! 🔧'],
      [FLOW.NORMAL]: ['آفرین! ادامه بده! 👍', 'عملکرد عالی! 🌟'],
      [FLOW.FLOW]: ['در اوج عملکردی! 🔥', 'شگفت‌انگیز! همینطور ادامه بده! ⚡'],
      [FLOW.BOREDOM]: ['چالش سخت‌تر رو امتحان کن! 🏆', 'هدفت ۳ ستاره باشه! ⭐⭐⭐'],
    },
    ur: {
      [FLOW.FRUSTRATION]: ['ہار مت مانو! تم بہتر ہو رہے ہو! 💪', 'ہر ناکامی کامیابی کے قریب لاتی ہے! 🌟', 'مختلف حکمت عملی آزماؤ! 🧠'],
      [FLOW.STRUGGLING]: ['تم جیتنے کے قریب ہو! ✨', 'مقاصد پر توجہ دو! 🎯', 'بوسٹر استعمال کرو! 🔧'],
      [FLOW.NORMAL]: ['شاباش! جاری رکھو! 👍', 'بہترین کارکردگی! 🌟'],
      [FLOW.FLOW]: ['بہترین فارم میں! 🔥', 'حیرت انگیز! اسی طرح جاری رکھو! ⚡'],
      [FLOW.BOREDOM]: ['مشکل چیلنج آزماؤ! 🏆', '3 ستارے کا ہدف رکھو! ⭐⭐⭐'],
    },
    bn: {
      [FLOW.FRUSTRATION]: ['হাল ছেড়ো না! উন্নতি হচ্ছে! 💪', 'প্রতিটি ব্যর্থতা সাফল্যের কাছে! 🌟', 'ভিন্ন কৌশল চেষ্টা করো! 🧠'],
      [FLOW.STRUGGLING]: ['জেতার কাছেই! ✨', 'লক্ষ্যে মনোযোগ দাও! 🎯', 'বুস্টার ব্যবহার করো! 🔧'],
      [FLOW.NORMAL]: ['সাবাশ! চালিয়ে যাও! 👍', 'দারুণ পারফরম্যান্স! 🌟'],
      [FLOW.FLOW]: ['তুমি শীর্ষে! 🔥', 'অসাধারণ! এভাবেই! ⚡'],
      [FLOW.BOREDOM]: ['কঠিন চ্যালেঞ্জ চেষ্টা করো! 🏆', '3 তারা লক্ষ্য করো! ⭐⭐⭐'],
    },
    sw: {
      [FLOW.FRUSTRATION]: ['Usikate tamaa! Unaboresheka! 💪', 'Kila kushindwa kunakusogelea! 🌟', 'Jaribu mkakati tofauti! 🧠'],
      [FLOW.STRUGGLING]: ['Uko karibu kushinda! ✨', 'Lenga malengo! 🎯', 'Tumia viboreshaji! 🔧'],
      [FLOW.NORMAL]: ['Vizuri! Endelea! 👍', 'Utendaji mzuri! 🌟'],
      [FLOW.FLOW]: ['Uko kwenye kilele! 🔥', 'Ajabu! Endelea! ⚡'],
      [FLOW.BOREDOM]: ['Jaribu changamoto ngumu! 🏆', 'Lenga nyota 3! ⭐⭐⭐'],
    },
  };

  const pool = messages[LANG]?.[flow] || messages.en?.[flow] || messages.en[FLOW.NORMAL];
  return pool[Math.floor(Math.random() * pool.length)];
}
