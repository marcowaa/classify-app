import type { MemoryCard, CardSymbol, GameResult } from "./types";

/**
 * Default symbol pool — kid-friendly educational emojis.
 * At least 8 needed for a 4×4 grid.
 */
export const DEFAULT_SYMBOLS: CardSymbol[] = [
  "🍎", "🐶", "🌟", "🎨",
  "🚀", "🌈", "🐱", "🎵",
  "🦋", "🌻", "🐠", "🎯",
  "🧩", "📚", "🔔", "🏆",
];

/**
 * Fisher-Yates shuffle — returns a new shuffled array.
 */
export function shuffle<T>(array: T[]): T[] {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Create and shuffle the card deck.
 * @param pairs Number of pairs (default 8)
 * @param pool  Symbol pool to pick from
 */
export function createDeck(pairs: number = 8, pool: CardSymbol[] = DEFAULT_SYMBOLS): MemoryCard[] {
  const chosen = shuffle(pool).slice(0, pairs);
  const doubled = [...chosen, ...chosen];
  const shuffled = shuffle(doubled);

  return shuffled.map((symbol, index) => ({
    id: index,
    symbol,
    isFlipped: false,
    isMatched: false,
  }));
}

/**
 * Calculate the final score.
 *
 * maxScore = 100
 * Perfect game (8 pairs) = 8 moves, ~16 seconds
 *
 * Deductions:
 *   - Each extra move beyond `pairs` costs 3 points (capped)
 *   - Each second beyond 30s costs 0.5 points (capped)
 *
 * Minimum score = 10
 */
export function calculateScore(moves: number, duration: number, pairs: number = 8): number {
  const MAX_SCORE = 100;
  const MIN_SCORE = 10;

  // Move penalty: perfect = `pairs` moves
  const extraMoves = Math.max(0, moves - pairs);
  const movePenalty = extraMoves * 3;

  // Time penalty: grace period 30s, then 0.5 per extra second
  const GRACE_SECONDS = 30;
  const extraSeconds = Math.max(0, duration - GRACE_SECONDS);
  const timePenalty = extraSeconds * 0.5;

  const score = Math.round(MAX_SCORE - movePenalty - timePenalty);
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, score));
}

/**
 * Build the result object sent on game completion.
 */
export function buildResult(moves: number, duration: number, pairs: number = 8): GameResult {
  return {
    score: calculateScore(moves, duration, pairs),
    maxScore: 100,
    duration,
    moves,
  };
}
