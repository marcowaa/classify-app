/**
 * Standalone page for Memory Match game.
 * Designed to be loaded inside an iframe by ChildGames.tsx.
 * Communicates results via window.parent.postMessage.
 */
import { useCallback } from "react";
import { MemoryGame } from "@/games/memory";
import type { GameResult } from "@/games/memory";

export function MemoryMatchPage() {
  const handleComplete = useCallback((result: GameResult) => {
    // Convert to the standard game completion format (score out of total)
    // score is 0-100, total is always 100
    window.parent.postMessage(
      {
        type: "GAME_COMPLETE",
        score: result.score,
        total: result.maxScore,
        timeElapsed: result.duration,
        moves: result.moves,
      },
      "*"
    );
  }, []);

  return <MemoryGame onGameComplete={handleComplete} />;
}

export default MemoryMatchPage;
