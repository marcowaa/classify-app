/* ═══════════════════════════════════════════════════════════════
   Cat Kingdom — Shared Utilities
   Date helpers & common functions
   ═══════════════════════════════════════════════════════════════ */

/**
 * Get today's date as 'YYYY-MM-DD'
 */
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Get yesterday's date as 'YYYY-MM-DD'
 */
export function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Wrong answers persistent storage for Smart Practice (C7) */
const WRONG_KEY = 'catk_wrong_history';

export function loadWrongHistory() {
  try {
    const raw = localStorage.getItem(WRONG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

export function saveWrongHistory(history) {
  try {
    // Keep last 100
    const trimmed = history.slice(-100);
    localStorage.setItem(WRONG_KEY, JSON.stringify(trimmed));
  } catch (e) {}
}

export function addWrongAnswer(entry) {
  const history = loadWrongHistory();
  history.push({ ...entry, date: new Date().toISOString() });
  saveWrongHistory(history);
}
