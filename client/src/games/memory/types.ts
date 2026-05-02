/** Emoji symbols used as card faces */
export type CardSymbol = string;

/** Represents a single card in the memory game */
export interface MemoryCard {
  /** Unique card ID (0–15 for a 4×4 grid) */
  id: number;
  /** The symbol/emoji displayed on the card face */
  symbol: CardSymbol;
  /** Whether the card is currently face-up */
  isFlipped: boolean;
  /** Whether the card has been matched */
  isMatched: boolean;
}

/** The result object returned when the game completes */
export interface GameResult {
  /** Final score (0–100) */
  score: number;
  /** Maximum possible score */
  maxScore: number;
  /** Total game duration in seconds */
  duration: number;
  /** Total moves (a move = flipping 2 cards) */
  moves: number;
}

/** Current game state */
export type GameStatus = "idle" | "playing" | "complete";

/** Configuration for the memory game */
export interface GameConfig {
  /** Number of pairs (default 8 for 4×4) */
  pairs: number;
  /** Grid columns (default 4) */
  columns: number;
  /** Symbols pool to choose from */
  symbols: CardSymbol[];
}

/** Internal state used by the game hook */
export interface GameState {
  cards: MemoryCard[];
  status: GameStatus;
  moves: number;
  matchedPairs: number;
  startTime: number | null;
  duration: number;
  firstPick: number | null;
  secondPick: number | null;
  isChecking: boolean;
}
