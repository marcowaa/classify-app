import { useState, useCallback, useEffect, useRef } from "react";
import type { GameState, GameResult } from "./types";
import { createDeck, buildResult } from "./memoryUtils";

const PAIRS = 8;
const FLIP_DELAY = 800; // ms before unmatched cards flip back

function initialState(): GameState {
  return {
    cards: createDeck(PAIRS),
    status: "idle",
    moves: 0,
    matchedPairs: 0,
    startTime: null,
    duration: 0,
    firstPick: null,
    secondPick: null,
    isChecking: false,
  };
}

export function useMemoryGame(onGameComplete?: (result: GameResult) => void) {
  const [state, setState] = useState<GameState>(initialState);
  const timerRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  // Duration timer
  useEffect(() => {
    if (state.status === "playing" && state.startTime) {
      timerRef.current = window.setInterval(() => {
        setState((s) => ({
          ...s,
          duration: Math.floor((Date.now() - (s.startTime ?? Date.now())) / 1000),
        }));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.status, state.startTime]);

  // Detect game completion
  useEffect(() => {
    if (state.matchedPairs === PAIRS && state.status === "playing" && !completedRef.current) {
      completedRef.current = true;
      if (timerRef.current) clearInterval(timerRef.current);

      const finalDuration = Math.floor((Date.now() - (state.startTime ?? Date.now())) / 1000);
      const result = buildResult(state.moves, finalDuration, PAIRS);

      setState((s) => ({ ...s, status: "complete", duration: finalDuration }));
      onGameComplete?.(result);
    }
  }, [state.matchedPairs, state.status, state.moves, state.startTime, onGameComplete]);

  const flipCard = useCallback((cardId: number) => {
    setState((prev) => {
      // Guard: can't flip during check, already flipped, or already matched
      if (prev.isChecking) return prev;
      const card = prev.cards[cardId];
      if (!card || card.isFlipped || card.isMatched) return prev;
      if (prev.status === "complete") return prev;

      // Start game on first flip
      const isFirstEver = prev.status === "idle";
      const startTime = isFirstEver ? Date.now() : prev.startTime;
      const status: GameState["status"] = isFirstEver ? "playing" : prev.status;

      const updatedCards = prev.cards.map((c) =>
        c.id === cardId ? { ...c, isFlipped: true } : c
      );

      // First pick
      if (prev.firstPick === null) {
        return {
          ...prev,
          cards: updatedCards,
          firstPick: cardId,
          status,
          startTime,
        };
      }

      // Second pick
      const firstCard = prev.cards[prev.firstPick];
      const secondCard = prev.cards[cardId];
      const isMatch = firstCard.symbol === secondCard.symbol;
      const newMoves = prev.moves + 1;

      if (isMatch) {
        const matchedCards = updatedCards.map((c) =>
          c.symbol === firstCard.symbol ? { ...c, isMatched: true, isFlipped: true } : c
        );
        return {
          ...prev,
          cards: matchedCards,
          moves: newMoves,
          matchedPairs: prev.matchedPairs + 1,
          firstPick: null,
          secondPick: null,
          isChecking: false,
          status,
          startTime,
        };
      }

      // No match — flip back after delay
      return {
        ...prev,
        cards: updatedCards,
        moves: newMoves,
        secondPick: cardId,
        isChecking: true,
        status,
        startTime,
      };
    });
  }, []);

  // Handle flip-back after mismatch
  useEffect(() => {
    if (!state.isChecking || state.firstPick === null || state.secondPick === null) return;

    const timeout = setTimeout(() => {
      setState((prev) => {
        const resetCards = prev.cards.map((c) => {
          if (c.id === prev.firstPick || c.id === prev.secondPick) {
            return { ...c, isFlipped: false };
          }
          return c;
        });
        return {
          ...prev,
          cards: resetCards,
          firstPick: null,
          secondPick: null,
          isChecking: false,
        };
      });
    }, FLIP_DELAY);

    return () => clearTimeout(timeout);
  }, [state.isChecking, state.firstPick, state.secondPick]);

  const restart = useCallback(() => {
    completedRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    setState(initialState());
  }, []);

  return {
    cards: state.cards,
    status: state.status,
    moves: state.moves,
    matchedPairs: state.matchedPairs,
    duration: state.duration,
    totalPairs: PAIRS,
    flipCard,
    restart,
  };
}
