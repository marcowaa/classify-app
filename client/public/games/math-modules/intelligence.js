// ===== Emoji Kingdom — Intelligence Module v2 =====
// Advanced DDA: per-type skill profiles, session adaptation,
// frustration/flow detection, weighted type selection

// ═══════════════════════════════════════════════════
//  1.  PER-TYPE SKILL PROFILES
// ═══════════════════════════════════════════════════
export function ensureTypeProfiles(sd) {
  if (!sd.typeProfiles) sd.typeProfiles = {};
  return sd.typeProfiles;
}

function _tp(sd, typeId) {
  const p = ensureTypeProfiles(sd);
  if (!p[typeId]) p[typeId] = { accuracy: 0.5, avgTime: 8, attempts: 0, streak: 0, lastSeen: 0 };
  return p[typeId];
}

/** Update per-type skill after each answer */
export function updateTypeSkill(sd, typeId, correct, responseTime) {
  const tp = _tp(sd, typeId);
  // Adaptive alpha: learns faster early, stabilises with experience
  const alpha = Math.max(0.15, 0.4 - tp.attempts * 0.008);
  tp.accuracy = tp.accuracy * (1 - alpha) + (correct ? 1 : 0) * alpha;
  tp.avgTime  = tp.avgTime * 0.7 + Math.min(responseTime, 30) * 0.3;
  tp.attempts++;
  tp.streak = correct ? tp.streak + 1 : 0;
  tp.lastSeen = Date.now();
  return tp;
}

/** Mastery score 0-100 for a single type */
export function getTypeMastery(sd, typeId) {
  const tp = _tp(sd, typeId);
  if (tp.attempts < 3) return 50; // default until enough data
  const acc  = tp.accuracy * 60;
  const spd  = Math.max(0, (12 - tp.avgTime) / 12) * 30;
  const exp  = Math.min(tp.attempts / 20, 1) * 10;
  return Math.round(acc + spd + exp);
}

// ═══════════════════════════════════════════════════
//  2.  SESSION PERFORMANCE TRACKER
// ═══════════════════════════════════════════════════
export function createSessionTracker() {
  return {
    window: [],         // sliding window of recent answers
    windowSize: 8,
    totalCorrect: 0,
    totalAnswered: 0,
    difficultyOffset: 0,   // –2 … +2 real-time knob
    frustrationLevel: 0,   // 0–1
    boredomLevel: 0,       // 0–1
    consecutiveWrong: 0,
    consecutiveRight: 0,
  };
}

/** Feed each answer into the session tracker */
export function updateSession(tracker, correct, responseTime, typeId) {
  tracker.window.push({ correct, time: responseTime, type: typeId });
  if (tracker.window.length > tracker.windowSize) tracker.window.shift();

  tracker.totalAnswered++;
  if (correct) {
    tracker.totalCorrect++;
    tracker.consecutiveRight++;
    tracker.consecutiveWrong = 0;
  } else {
    tracker.consecutiveWrong++;
    tracker.consecutiveRight = 0;
  }

  const wLen = tracker.window.length;
  const wCorr = tracker.window.filter(w => w.correct).length;
  const wRate = wLen > 0 ? wCorr / wLen : 0.5;
  const wAvgT = wLen > 0
    ? tracker.window.reduce((s, w) => s + w.time, 0) / wLen
    : 8;

  // — Frustration: low accuracy + slow + consecutive wrong
  let frust = 0;
  if (wRate < 0.4)                   frust += 0.4;
  if (tracker.consecutiveWrong >= 3) frust += 0.4;
  if (wAvgT > 12)                    frust += 0.2;
  tracker.frustrationLevel = Math.min(1, frust);

  // — Boredom: high accuracy + fast + consecutive right
  let bore = 0;
  if (wRate > 0.9 && wLen >= 5)      bore += 0.4;
  if (tracker.consecutiveRight >= 6) bore += 0.3;
  if (wAvgT < 3)                     bore += 0.3;
  tracker.boredomLevel = Math.min(1, bore);

  // — Difficulty offset (negative=easier, positive=harder)
  if (tracker.frustrationLevel > 0.5) {
    tracker.difficultyOffset = Math.max(-2, tracker.difficultyOffset - 0.5);
  } else if (tracker.boredomLevel > 0.5) {
    tracker.difficultyOffset = Math.min(2, tracker.difficultyOffset + 0.5);
  } else {
    tracker.difficultyOffset *= 0.8; // drift toward neutral
  }

  return tracker;
}

export function getSessionOffset(tr) { return tr ? tr.difficultyOffset : 0; }

export function isInFlowState(tr) {
  if (!tr || tr.window.length < 4) return false;
  const r = tr.window.filter(w => w.correct).length / tr.window.length;
  return r >= 0.6 && r <= 0.9 && tr.frustrationLevel < 0.3 && tr.boredomLevel < 0.3;
}

// ═══════════════════════════════════════════════════
//  3.  SMART / WEIGHTED TYPE SELECTION
// ═══════════════════════════════════════════════════
/**
 * Return an array of `count` types drawn from `availableTypes`,
 * weighted by Zone-of-Proximal-Development + staleness.
 * Weak types appear more often; mastered types less.
 */
export function weightedTypeSelection(sd, availableTypes, count) {
  if (!availableTypes || availableTypes.length === 0) return Array(count).fill('classic');
  if (availableTypes.length === 1) return Array(count).fill(availableTypes[0]);

  const profiles = ensureTypeProfiles(sd);

  // Build weight per type
  const items = availableTypes.map(tid => {
    const mastery = getTypeMastery(sd, tid);
    const tp = profiles[tid] || {};
    const hoursAgo = Math.min((Date.now() - (tp.lastSeen || 0)) / 3.6e6, 5);

    // ZPD curve: sweet-spot ~30-65 mastery
    let zpd;
    if      (mastery < 20) zpd = 0.6;   // too hard → moderate
    else if (mastery < 40) zpd = 1.2;   // challenging → high
    else if (mastery < 65) zpd = 1.0;   // sweet spot
    else if (mastery < 85) zpd = 0.7;   // getting easy
    else                   zpd = 0.5;   // mastered

    return { tid, weight: zpd * (1 + hoursAgo * 0.1) };
  });

  const total = items.reduce((s, i) => s + i.weight, 0);
  items.forEach(i => i.prob = i.weight / total);

  // Weighted draw with variety guard (no 3-in-a-row)
  const result = [];
  for (let n = 0; n < count; n++) {
    let pick, att = 0;
    do {
      let r = Math.random();
      for (const it of items) { r -= it.prob; if (r <= 0) { pick = it.tid; break; } }
      if (!pick) pick = items[items.length - 1].tid;
      att++;
    } while (att < 10 && result.length >= 2 && result.at(-1) === pick && result.at(-2) === pick);
    result.push(pick);
  }
  return result;
}

// ═══════════════════════════════════════════════════
//  4.  ORIGINAL / GLOBAL SKILL (backwards-compatible)
// ═══════════════════════════════════════════════════
export function updateSkillData(sd, correct, responseTime) {
  sd.accuracyRate = sd.accuracyRate * 0.7 + (correct ? 1 : 0) * 0.3;
  sd.avgResponseTime = sd.avgResponseTime * 0.7 + Math.min(responseTime, 30) * 0.3;
  return sd;
}

export function updateSkillAfterLevel(sd, accuracy, avgTime, highStreak, totalQ) {
  const accScore    = Math.min(accuracy, 1) * 50;
  const timeScore   = Math.max(0, (15 - avgTime) / 15) * 30;
  const streakScore = Math.min(highStreak / totalQ, 1) * 20;
  const cur = accScore + timeScore + streakScore;
  sd.smoothedSkill = (sd.smoothedSkill || 50) * 0.7 + cur * 0.3;
  if (highStreak > (sd.highestStreak || 0)) sd.highestStreak = highStreak;
  sd.totalGamesPlayed = (sd.totalGamesPlayed || 0) + 1;
  return sd;
}

export function getSmoothedSkill(sd) {
  return sd.smoothedSkill || 50;
}

// ═══════════════════════════════════════════════════
//  5.  ENHANCED DIFFICULTY FUNCTIONS
// ═══════════════════════════════════════════════════
/** Range adjustment now factors in session offset */
export function adjustRange(baseRange, smoothedSkill, sessionOffset) {
  const off = sessionOffset || 0;
  const factor = 0.7 + (smoothedSkill / 100) * 0.6 + off * 0.1;
  return Math.max(3, Math.round(baseRange * Math.max(0.4, Math.min(1.6, factor))));
}

/** Timer adjustment with session offset */
export function adjustTimer(baseTimer, smoothedSkill, sessionOffset) {
  if (baseTimer <= 0) return 0;
  const off = sessionOffset || 0;
  const adj = Math.round((smoothedSkill - 50) / 25) + Math.round(off);
  return Math.max(6, baseTimer - adj);
}

/** Per-question difficulty tier — now session-aware */
export function getQuestionDifficulty(qIndex, totalQ, isBoss, sessionTracker) {
  const pct = qIndex / totalQ;
  const rand = Math.random();
  const sOff = sessionTracker ? sessionTracker.difficultyOffset : 0;

  if (isBoss) {
    const ease = Math.max(0, -sOff * 0.1);
    if (rand < 0.2 + ease) return 'easy';
    if (rand < 0.6 + ease * 0.5) return 'medium';
    return 'hard';
  }

  let hardChance = 0.1 + pct * 0.2 + sOff * 0.05;
  let easyChance = 0.5 - pct * 0.2 - sOff * 0.05;
  hardChance = Math.max(0.05, Math.min(0.5, hardChance));
  easyChance = Math.max(0.1, Math.min(0.6, easyChance));

  if (rand < easyChance) return 'easy';
  if (rand < easyChance + (1 - easyChance - hardChance)) return 'medium';
  return 'hard';
}

export function getDifficultyRange(baseRange, difficulty) {
  switch (difficulty) {
    case 'easy':   return Math.max(2, Math.round(baseRange * 0.4));
    case 'medium': return Math.max(3, Math.round(baseRange * 0.7));
    case 'hard':   return baseRange;
    default:       return baseRange;
  }
}

// ═══════════════════════════════════════════════════
//  6.  FLOW STATE CONTROLLER
// ═══════════════════════════════════════════════════
export function getTransitionDelay(responseTime) {
  if (responseTime < 3) return 600;
  if (responseTime < 6) return 900;
  if (responseTime < 10) return 1100;
  return 1400;
}
