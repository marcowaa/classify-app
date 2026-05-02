import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useMemoryGame } from "./useMemoryGame";
import type { GameResult, MemoryCard } from "./types";
import "./memoryGame.css";

interface MemoryGameProps {
  onGameComplete?: (result: GameResult) => void;
}

export function MemoryGame({ onGameComplete }: MemoryGameProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  const {
    cards,
    status,
    moves,
    matchedPairs,
    duration,
    totalPairs,
    flipCard,
    restart,
  } = useMemoryGame(onGameComplete);

  const handleCardClick = useCallback(
    (card: MemoryCard) => {
      if (status === "complete") return;
      flipCard(card.id);
    },
    [status, flipCard]
  );

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="memory-game-container"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header stats */}
      <div className="memory-header">
        <h1 className="memory-title">
          🧠 {t("memoryGame.title", "Memory Match")}
        </h1>
        <div className="memory-stats">
          <div className="memory-stat">
            <span className="memory-stat-label">{t("memoryGame.moves", "Moves")}</span>
            <span className="memory-stat-value">{moves}</span>
          </div>
          <div className="memory-stat">
            <span className="memory-stat-label">{t("memoryGame.pairs", "Pairs")}</span>
            <span className="memory-stat-value">{matchedPairs}/{totalPairs}</span>
          </div>
          <div className="memory-stat">
            <span className="memory-stat-label">{t("memoryGame.time", "Time")}</span>
            <span className="memory-stat-value">{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* Card grid */}
      <div className="memory-grid">
        {cards.map((card) => (
          <button
            key={card.id}
            className={`memory-card ${card.isFlipped || card.isMatched ? "flipped" : ""} ${card.isMatched ? "matched" : ""}`}
            onClick={() => handleCardClick(card)}
            disabled={card.isFlipped || card.isMatched || status === "complete"}
            aria-label={
              card.isFlipped || card.isMatched
                ? card.symbol
                : t("memoryGame.hiddenCard", "Hidden card")
            }
          >
            <div className="memory-card-inner">
              <div className="memory-card-front">
                <span className="memory-card-icon">❓</span>
              </div>
              <div className="memory-card-back">
                <span className="memory-card-symbol">{card.symbol}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Game complete overlay */}
      {status === "complete" && (
        <div className="memory-complete-overlay">
          <div className="memory-complete-card">
            <div className="memory-complete-emoji">🎉</div>
            <h2 className="memory-complete-title">
              {t("memoryGame.congratulations", "Congratulations!")}
            </h2>
            <p className="memory-complete-subtitle">
              {t("memoryGame.completedIn", "You completed in {{moves}} moves and {{time}}", {
                moves,
                time: formatTime(duration),
              })}
            </p>
            <div className="memory-complete-stats">
              <div className="memory-complete-stat">
                <span>🏆</span>
                <span>{t("memoryGame.moves", "Moves")}: {moves}</span>
              </div>
              <div className="memory-complete-stat">
                <span>⏱️</span>
                <span>{t("memoryGame.time", "Time")}: {formatTime(duration)}</span>
              </div>
            </div>
            <button
              className="memory-play-again-btn"
              onClick={restart}
            >
              🔄 {t("memoryGame.playAgain", "Play Again")}
            </button>
          </div>
        </div>
      )}

      {/* Idle start hint */}
      {status === "idle" && (
        <p className="memory-hint">
          {t("memoryGame.startHint", "Tap any card to begin!")}
        </p>
      )}
    </div>
  );
}
