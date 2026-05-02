import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { Gamepad2, Star, Play, Lock, ArrowLeft, X, Loader2, LogIn } from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

const TRIAL_STORAGE_KEY = "classify_trial_games_played";

interface Game {
  id: string;
  title: string;
  description: string | null;
  embedUrl: string;
  thumbnailUrl: string | null;
  pointsPerPlay: number;
  isActive: boolean;
}

function getTriedGames(): string[] {
  try {
    const raw = localStorage.getItem(TRIAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function markGameAsTried(embedUrl: string) {
  const tried = getTriedGames();
  if (!tried.includes(embedUrl)) {
    tried.push(embedUrl);
    localStorage.setItem(TRIAL_STORAGE_KEY, JSON.stringify(tried));
  }
}

export const TrialGames = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [iframeLoading, setIframeLoading] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [triedGames, setTriedGames] = useState<string[]>(getTriedGames());
  const isRTL = i18n.language === "ar";

  const { data: games, isLoading } = useQuery<Game[]>({
    queryKey: ["trial-games"],
    queryFn: async () => {
      const res = await fetch("/api/games");
      const json = await res.json();
      return json?.data || json || [];
    },
  });

  // Check if all games are tried — redirect to login
  useEffect(() => {
    if (!games || games.length === 0) return;
    const allTried = games.every((g) => triedGames.includes(g.embedUrl));
    if (allTried) {
      navigate("/child-link");
    }
  }, [games, triedGames, navigate]);

  // Listen for GAME_COMPLETE from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin && e.origin !== "null") return;
      if (e.data?.type === "GAME_COMPLETE") {
        setGameCompleted(true);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const handlePlayGame = (game: Game) => {
    if (triedGames.includes(game.embedUrl)) return;
    setSelectedGame(game);
    setGameCompleted(false);
    setIframeLoading(true);
    setShowLoginPrompt(false);
  };

  const handleCloseGame = () => {
    if (selectedGame) {
      markGameAsTried(selectedGame.embedUrl);
      setTriedGames(getTriedGames());
    }
    setSelectedGame(null);
    setGameCompleted(false);
    setIframeLoading(false);
    setShowLoginPrompt(true);
  };

  const availableGames = games?.filter((g) => !triedGames.includes(g.embedUrl)) ?? [];
  const triedCount = games ? games.filter((g) => triedGames.includes(g.embedUrl)).length : 0;
  const hasMilestoneProgress = triedCount > 0;
  const cardBaseClass = "relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_16px_24px_rgba(4,23,42,0.25)] backdrop-blur-xl transition-all duration-200";
  const primaryButtonClass = "inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-cyan-400 to-teal-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_12px_22px_rgba(8,75,105,0.45)] transition-all duration-200 hover:brightness-105 active:translate-y-[1px]";

  return (
    <div
      className="relative min-h-screen overflow-hidden text-white"
      style={{
        background:
          "radial-gradient(1050px 560px at 95% -12%, rgba(6,182,212,0.28), transparent), radial-gradient(980px 520px at 8% 16%, rgba(20,184,166,0.22), transparent), linear-gradient(180deg, #061a2b 0%, #0a2740 50%, #061a2b 100%)",
      }}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            "radial-gradient(circle at 16% 24%, rgba(34,211,238,0.18) 0, rgba(34,211,238,0) 36%), radial-gradient(circle at 82% 76%, rgba(20,184,166,0.16) 0, rgba(20,184,166,0) 36%)",
        }}
      />

      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-cyan-100/20 bg-slate-950/70 backdrop-blur-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : navigate("/child-link")}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/25 bg-white/10 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_18px_rgba(3,20,38,0.28)] transition-all duration-200 hover:bg-white/15 active:translate-y-[1px]"
          >
            <ArrowLeft className={`w-5 h-5 ${isRTL ? "rotate-180" : ""}`} />
          </button>

          <div className="text-center min-w-0 px-2">
            <h1 className="text-lg sm:text-xl font-bold text-white flex items-center justify-center gap-2 truncate">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-white/30 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_14px_rgba(4,23,42,0.3)]">
                <Gamepad2 className="w-4 h-4" />
              </span>
              {t("trialGames.title")}
            </h1>
            <p className="text-white/70 text-xs mt-0.5">
              {t("trialGames.subtitle")}
            </p>
          </div>

          <button
            onClick={() => navigate("/child-link")}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-gradient-to-b from-cyan-400 to-teal-600 px-3 py-2 text-xs font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_16px_rgba(8,75,105,0.44)] transition-all duration-200 hover:brightness-105 active:translate-y-[1px]"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t("trialGames.login")}</span>
            <span className="sm:hidden">{t("trialGames.login")}</span>
          </button>
        </div>
      </div>

      {/* Trial info banner */}
      <div className="max-w-4xl mx-auto px-4 mt-4">
        <div className="rounded-2xl border border-cyan-200/30 bg-white/10 px-4 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_16px_24px_rgba(4,23,42,0.24)] backdrop-blur-xl">
          <p className="text-sm font-medium text-cyan-100">
            ⭐ {t("trialGames.info")}
          </p>
          {games && games.length > 0 && (
            <p className="text-xs mt-1 text-cyan-200/80">
              {t("trialGames.progress", { tried: triedCount, total: games.length })}
            </p>
          )}
          {hasMilestoneProgress && (
            <button
              onClick={() => navigate("/child-link")}
              className={`${primaryButtonClass} mt-3`}
            >
              <LogIn className="w-4 h-4" />
              {t("trialGames.loginPrompt.loginBtn")}
            </button>
          )}
        </div>
      </div>

      {/* Games grid */}
      <div className="max-w-4xl mx-auto px-4 py-6 pb-28 sm:pb-32">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-cyan-200" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
            {games?.map((game, index) => {
              const isTried = triedGames.includes(game.embedUrl);
              return (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={!isTried ? { y: -6, scale: 1.02 } : {}}
                  onClick={() => !isTried && handlePlayGame(game)}
                  className={`${cardBaseClass} ${isTried ? "opacity-65 cursor-not-allowed" : "cursor-pointer active:translate-y-[1px]"
                    }`}
                >
                  {/* Tried overlay */}
                  {isTried && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-black/45 backdrop-blur-[1px]">
                      <Lock className="w-8 h-8 text-white/80 mb-1" />
                      <p className="text-white text-xs font-bold">{t("trialGames.alreadyTried")}</p>
                    </div>
                  )}

                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-900/60">
                    {game.thumbnailUrl ? (
                      <img src={game.thumbnailUrl} alt={game.title} className="w-full h-full object-cover" />
                    ) : game.embedUrl === "/games/memory-match.html" ? (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                        <span className="text-5xl drop-shadow-lg">🧠</span>
                      </div>
                    ) : game.embedUrl === "/games/math-challenge.html" ? (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-green-500 to-emerald-500">
                        <span className="text-5xl drop-shadow-lg">🔢</span>
                      </div>
                    ) : game.embedUrl === "/games/gem-kingdom.html" ? (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                        <span className="text-5xl drop-shadow-lg">💎</span>
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Gamepad2 className="w-12 h-12 text-cyan-300" />
                      </div>
                    )}
                    {!isTried && (
                      <div className={`absolute top-2 ${isRTL ? "right-2" : "left-2"} flex items-center gap-1 rounded-full border border-white/30 bg-orange-500/90 px-2 py-0.5 text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_8px_12px_rgba(30,27,75,0.25)]`}>
                        <Star className="w-3 h-3" />
                        {t("trialGames.freePlay")}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-sm mb-1 truncate text-white">
                      {game.title}
                    </h3>
                    {game.description && (
                      <p className="text-xs mb-2 line-clamp-2 text-cyan-100/75">
                        {game.description}
                      </p>
                    )}
                    <div
                      className={`flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_10px_16px_rgba(3,20,38,0.25)] ${isTried
                        ? "border border-white/25 bg-white/15 text-white/75"
                        : "border border-cyan-200/35 bg-gradient-to-b from-cyan-500 to-teal-600 text-white"
                        }`}
                    >
                      {isTried ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          {t("trialGames.played")}
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          {t("trialGames.tryNow")}
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

      </div>

      {/* Sticky login CTA — always visible while scrolling */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-[#061a2b]/95 via-[#061a2b]/88 to-transparent px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate("/child-link")}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-b from-cyan-400 to-teal-600 px-8 py-4 text-lg font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_16px_24px_rgba(8,75,105,0.46)] transition-all duration-200 hover:brightness-105 active:translate-y-[1px]"
          >
            <LogIn className="w-6 h-6" />
            {t("trialGames.loginFull")}
          </button>
        </div>
      </div>

      {/* Game iframe modal */}
      {selectedGame && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/85">
          <div className="flex shrink-0 items-center justify-between border-b border-cyan-100/20 bg-slate-950/95 px-4 py-2 backdrop-blur-sm">
            <h3 className="text-lg font-bold truncate text-white">
              {selectedGame.title}
            </h3>
            <div className="flex items-center gap-3 shrink-0">
              <span className="rounded-full border border-white/25 bg-orange-500 px-3 py-1 text-sm font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_12px_rgba(30,27,75,0.25)]">
                {t("trialGames.trialMode")}
              </span>
              <button
                onClick={handleCloseGame}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/10 transition-all duration-200 hover:bg-white/15 active:translate-y-[1px]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="flex-1 bg-black relative min-h-0">
            {iframeLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="text-center">
                  <Loader2 className="mx-auto mb-2 h-10 w-10 animate-spin text-cyan-300" />
                  <p className="text-white/70 text-sm">{t("childGames.loadingGame")}</p>
                </div>
              </div>
            )}
            <iframe
              src={`${selectedGame.embedUrl}${selectedGame.embedUrl.includes("?") ? "&" : "?"}lang=${i18n.language}&trial=1`}
              className="w-full h-full border-0"
              allowFullScreen
              title={selectedGame.title}
              onLoad={() => setIframeLoading(false)}
            />
          </div>

          <div className="flex shrink-0 flex-col items-center gap-2 bg-slate-950/95 px-4 py-3">
            {gameCompleted ? (
              <div className="text-center">
                <p className="text-sm font-bold mb-2 text-emerald-300">
                  🎉 {t("trialGames.greatJob")}
                </p>
                <button
                  onClick={handleCloseGame}
                  className="mx-auto flex items-center gap-2 rounded-2xl bg-gradient-to-b from-cyan-400 to-teal-600 px-8 py-3 font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.36),0_12px_20px_rgba(8,75,105,0.44)] transition-all duration-200 hover:brightness-105 active:translate-y-[1px]"
                >
                  <LogIn className="w-5 h-5" />
                  {t("trialGames.loginToSave")}
                </button>
              </div>
            ) : (
              <p className="text-sm animate-pulse text-cyan-100/70">
                🎮 {t("trialGames.playing")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Login prompt overlay — shown after closing a trial game */}
      <AnimatePresence>
        {showLoginPrompt && !selectedGame && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowLoginPrompt(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 30 }}
              transition={{ type: "spring", damping: 20 }}
              className={`${isDark ? "bg-gray-900/95" : "bg-white/95"} w-full max-w-sm rounded-3xl border border-cyan-100/25 p-6 text-center shadow-[0_24px_50px_rgba(3,20,38,0.45)] backdrop-blur-xl`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-5xl mb-3">🌟</div>
              <h2 className={`text-xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                {t("trialGames.loginPrompt.title")}
              </h2>
              <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {t("trialGames.loginPrompt.message")}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/child-link")}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-cyan-400 to-teal-600 py-3 text-lg font-extrabold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_12px_22px_rgba(8,75,105,0.44)] transition-all duration-200 hover:brightness-105 active:translate-y-[1px]"
                >
                  <LogIn className="w-5 h-5" />
                  {t("trialGames.loginPrompt.loginBtn")}
                </button>
                {availableGames.length > 0 && (
                  <button
                    onClick={() => setShowLoginPrompt(false)}
                    className="w-full rounded-2xl border border-cyan-100/35 bg-white/10 py-3 text-sm font-bold text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_10px_18px_rgba(3,20,38,0.24)] transition-all duration-200 hover:bg-white/15 active:translate-y-[1px]"
                  >
                    {t("trialGames.loginPrompt.tryAnother", { count: availableGames.length })}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrialGames;
