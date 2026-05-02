/**
 * Memory Kingdom — Reports Module
 * Generates structured progress reports for parent postMessage
 */
import { progress, ddaV2, streakData, gameStats, xpData, prestigeData, wallet } from './core.js';
import { WORLDS, LEVELS, getTotalStars } from './worlds.js';
import { t, MECH } from './config.js';

// ===== COGNITIVE DIMENSIONS =====
function computeCognitiveDimensions() {
  const skills = ddaV2.mechSkills || {};
  const spatialMemory = Math.round((skills.moving || 50) * 0.4 + (skills.mirror || 50) * 0.3 + (skills.classic || 50) * 0.3);
  const workingMemory = Math.round((skills.chain || 50) * 0.35 + (skills.triple || 50) * 0.3 + (skills.masked || 50) * 0.35);
  const focusAttn = Math.round((skills.bomb || 50) * 0.3 + (skills.fog || 50) * 0.3 + (skills.boss || 50) * 0.4);

  const mechEntries = Object.entries(skills).filter(([k, v]) => v !== 50 || (gameStats.mechsPlayed || []).includes(k));
  const avgSkill = mechEntries.length > 0
    ? Math.round(mechEntries.reduce((s, [, v]) => s + v, 0) / mechEntries.length) : 50;

  const adaptability = Math.round(Math.min(100, ((gameStats.mechsPlayed || []).length / 10) * 60 + avgSkill * 0.4));
  const speed = ddaV2.avgResponseMs > 0
    ? Math.round(Math.min(100, Math.max(10, 100 - (ddaV2.avgResponseMs - 1000) / 60))) : 50;
  const persistence = Math.round(Math.min(100, (streakData.best || 0) * 8 + (gameStats.gamesPlayed || 0) * 0.5));

  return [
    { key: 'spatial',      label: 'Spatial Memory',    value: spatialMemory },
    { key: 'working',      label: 'Working Memory',    value: workingMemory },
    { key: 'focus',        label: 'Focus & Attention', value: focusAttn },
    { key: 'adaptability', label: 'Adaptability',      value: adaptability },
    { key: 'speed',        label: 'Processing Speed',  value: speed },
    { key: 'persistence',  label: 'Persistence',       value: persistence },
  ];
}

// ===== OVERVIEW =====
function getOverviewReport() {
  const totalStarsVal = getTotalStars(progress);
  const completedLevels = Object.keys(progress.stars).filter(k => progress.stars[k] >= 1).length;
  const perfectLevels = Object.values(progress.stars).filter(s => s >= 3).length;
  const worldsDone = WORLDS.filter((_, i) => progress.worldsBeaten[i]).length;
  const endlessLevelsCleared = Object.keys(progress.stars || {}).filter(k => Number(k) >= 100 && (progress.stars[k] || 0) >= 1).length;

  return {
    completedLevels,
    totalLevels: LEVELS.length,
    totalStars: totalStarsVal,
    maxStars: LEVELS.length * 3,
    perfectLevels,
    worldsCompleted: worldsDone,
    totalWorlds: 10,
    endlessLevelsCleared,
    gamesPlayed: gameStats.gamesPlayed || 0,
    coins: wallet.coins || 0,
    xpLevel: xpData.level || 1,
    prestigeLevel: prestigeData.level || 0,
  };
}

function getLaneProgress() {
  const laneStats = progress.laneStats || {};
  const result = {};
  Object.entries(laneStats).forEach(([laneKey, lane]) => {
    result[laneKey] = {
      cleared: lane?.cleared || 0,
      bestStars: lane?.bestStars || 0,
      rewardTiersReached: Object.keys(lane?.rewardTiers || {}).map(Number).sort((a, b) => a - b),
    };
  });
  return result;
}

// ===== MECHANIC SKILLS =====
function getMechanicSkills() {
  const skills = ddaV2.mechSkills || {};
  const result = {};
  for (const [mech, val] of Object.entries(skills)) {
    if (val !== 50 || (gameStats.mechsPlayed || []).includes(mech)) {
      result[mech] = val;
    }
  }
  return result;
}

// ===== SESSION DATA =====
function getSessionData() {
  return {
    avgResponseMs: ddaV2.avgResponseMs || 0,
    fastestTime: gameStats.fastestTime < 9999 ? gameStats.fastestTime : null,
    bestStreak: streakData.best || 0,
    currentStreak: streakData.current || 0,
    perfectLevels: Object.values(progress.stars).filter(s => s >= 3).length,
    powerUpsUsed: gameStats.puUsed || 0,
  };
}

// ===== STRENGTHS & WEAKNESSES =====
function getStrengthWeakness(dims) {
  const sorted = [...dims].sort((a, b) => b.value - a.value);
  return {
    strengths: sorted.slice(0, 2).map(d => ({ key: d.key, label: d.label, value: d.value })),
    growthAreas: sorted.slice(-2).reverse().map(d => ({ key: d.key, label: d.label, value: d.value })),
  };
}

// ===== GRADE ESTIMATION =====
function estimateGradeLevel(dims) {
  const avg = Math.round(dims.reduce((s, d) => s + d.value, 0) / dims.length);
  const speed = dims.find(d => d.key === 'speed')?.value || 50;
  const working = dims.find(d => d.key === 'working')?.value || 50;

  // composite: cognitive average + speed + working memory bonus
  const composite = avg * 0.5 + speed * 0.25 + working * 0.25;

  if (composite >= 85) return { grade: '5+', label: 'Advanced', confidence: 'high' };
  if (composite >= 72) return { grade: '4-5', label: 'Grade 4-5', confidence: 'medium' };
  if (composite >= 58) return { grade: '3-4', label: 'Grade 3-4', confidence: 'medium' };
  if (composite >= 42) return { grade: '2-3', label: 'Grade 2-3', confidence: 'medium' };
  if (composite >= 28) return { grade: '1-2', label: 'Grade 1-2', confidence: 'medium' };
  return { grade: 'K-1', label: 'Kindergarten-1st', confidence: 'low' };
}

// ===== RECOMMENDATIONS =====
function getRecommendations(dims) {
  const recs = [];
  const dimMap = {};
  dims.forEach(d => { dimMap[d.key] = d.value; });

  if ((dimMap.focus || 50) < 50) recs.push('🎯 Practice fog & bomb levels to improve focus');
  if ((dimMap.spatial || 50) < 50) recs.push('🗺️ Try moving & mirror levels for spatial skills');
  if ((dimMap.working || 50) < 50) recs.push('🧠 Chain & triple levels strengthen working memory');
  if ((dimMap.speed || 50) < 50) recs.push('⚡ Timed levels help increase processing speed');
  if ((dimMap.persistence || 50) < 50) recs.push('💪 Play daily to build consistency');
  if ((dimMap.adaptability || 50) < 50) recs.push('🔄 Try different mechanics to improve adaptability');
  if (recs.length === 0) recs.push('🌟 Excellent performance! Keep exploring new worlds!');
  return recs;
}

// ===== FULL REPORT =====
export function generateFullReport() {
  const dims = computeCognitiveDimensions();
  const overview = getOverviewReport();
  const sw = getStrengthWeakness(dims);

  return {
    type: 'MEMORY_PROGRESS_REPORT',
    timestamp: Date.now(),
    overview,
    laneProgress: getLaneProgress(),
    cognitiveDimensions: dims,
    mechanicSkills: getMechanicSkills(),
    sessionData: getSessionData(),
    strengths: sw.strengths,
    growthAreas: sw.growthAreas,
    gradeEstimate: estimateGradeLevel(dims),
    recommendations: getRecommendations(dims),
  };
}
