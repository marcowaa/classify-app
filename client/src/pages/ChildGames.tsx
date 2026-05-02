import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTheme } from "@/contexts/ThemeContext";
import { ChildNotificationBell } from "@/components/ChildNotificationBell";
import { useChildAuth } from "@/hooks/useChildAuth";
import { Gamepad2, Star, Bell, X, Trophy, Play, BookOpen, LogOut, Settings, User, Loader2, Share2, Link2, Sparkles } from "lucide-react";
import { ChildBottomNav } from "@/components/ChildBottomNav";
import { DynamicGameIframe, type DynamicGameIframeHandle } from "@/components/games/DynamicGameIframe";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useWakeLock } from "@/hooks/useWakeLock";

interface Game {
  id: string;
  title: string;
  description: string | null;
  embedUrl: string;
  thumbnailUrl: string | null;
  pointsPerPlay: number;
  isActive: boolean;
}

interface GameIframePolicy {
  allowedDomains: string[];
  allowExternalDomains: boolean;
  handshakeRequired: boolean;
  sandboxProfile: "strict-game";
}

interface GemTelemetryEvent {
  ts: number;
  gameId: string | null;
  event: string;
  sessionId: string | null;
  world: number | null;
  level: number | null;
  payload: Record<string, unknown>;
}

type GemTuneProfile = "balanced" | "performance" | "easy";

const GAME_PREVIEW_MEDIA: Record<string, { gif: string; poster: string; icon: string }> = {
  "/games/math-challenge.html": {
    gif: "/games/previews/math-challenge.gif",
    poster: "/games/previews/math-challenge.svg",
    icon: "🔢",
  },
  "/games/memory-match.html": {
    gif: "/games/previews/memory-match.gif",
    poster: "/games/previews/memory-match.svg",
    icon: "🧠",
  },
  "/games/gem-kingdom.html": {
    gif: "/games/previews/gem-kingdom.gif",
    poster: "/games/previews/gem-kingdom.svg",
    icon: "💎",
  },
  "/games/snake-3d.html": {
    gif: "/games/previews/snake-3d.gif",
    poster: "/games/previews/snake-3d.svg",
    icon: "🐍",
  },
  "/games/cat-kingdom.html": {
    gif: "/games/previews/cat-kingdom.gif",
    poster: "/games/previews/cat-kingdom.svg",
    icon: "🐱",
  },
  "/games/ice-kingdom.html": {
    gif: "/games/previews/ice-kingdom.gif",
    poster: "/games/previews/ice-kingdom.svg",
    icon: "❄️",
  },
};

const GrowthTree = lazy(async () => {
  const module = await import("@/components/GrowthTree");
  return { default: module.GrowthTree };
});

export const ChildGames = (): JSX.Element => {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const { logout, isLoggingOut, handleAuthError } = useChildAuth();
  const { toast } = useToast();
  const token = localStorage.getItem("childToken");
  const queryClient = useQueryClient();
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showReward, setShowReward] = useState<{ points: number; total: number } | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [gameResult, setGameResult] = useState<{ score: number; total: number } | null>(null);
  const [iframeLoading, setIframeLoading] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [gameShared, setGameShared] = useState(false);
  const [sharedGameData, setSharedGameData] = useState<{ gameName: string; score: number; stars: number } | null>(null);
  const [telemetryVersion, setTelemetryVersion] = useState(0);
  const [insightsCollapsed, setInsightsCollapsed] = useState(true);
  const [dismissedGameHints, setDismissedGameHints] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem("childGamesSectionHints");
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });
  const [ultraClarity, setUltraClarity] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("child_games_ultra_clarity");
      if (saved === null) return false; // default OFF to avoid visual softening on some devices
      return saved === "1";
    } catch {
      return false;
    }
  });
  const [gemTuneProfile, setGemTuneProfile] = useState<GemTuneProfile>(() => {
    try {
      const saved = localStorage.getItem("child_games_gem_tune_profile");
      if (saved === "performance" || saved === "easy" || saved === "balanced") return saved;
      return "balanced";
    } catch {
      return "balanced";
    }
  });
  const gameIframeRef = useRef<HTMLIFrameElement | null>(null);
  const dynamicGameFrameRef = useRef<DynamicGameIframeHandle | null>(null);

  // Keep screen awake while playing a game
  useWakeLock(!!selectedGame);

  // Refs for stable access in postMessage handler
  const selectedGameRef = useRef<Game | null>(null);
  useEffect(() => { selectedGameRef.current = selectedGame; }, [selectedGame]);
  const langRef = useRef(i18n.language);
  useEffect(() => { langRef.current = i18n.language; }, [i18n.language]);

  const { data: games, isLoading } = useQuery<Game[]>({
    queryKey: ["games"],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch("/api/games", { headers });
      const json = await res.json();
      return json?.data || json || [];
    },
    refetchInterval: 60000,
  });

  const { data: gameIframePolicy } = useQuery<GameIframePolicy>({
    queryKey: ["games-policy"],
    queryFn: async () => {
      const res = await fetch("/api/games/policy");
      const json = await res.json();
      return json?.data || json;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: childInfo, isLoading: isChildInfoLoading } = useQuery({
    queryKey: ["child-info"],
    queryFn: async () => {
      const res = await fetch("/api/child/info", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        handleAuthError();
        throw new Error("Unauthorized");
      }
      if (!res.ok) {
        throw new Error("Failed to load child info");
      }
      const json = await res.json();
      return json?.data || json;
    },
    enabled: !!token,
    refetchInterval: token ? 60000 : false,
  });

  // Listen for game completion & share messages from iframe (origin-validated)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      // Validate origin: only accept messages from our own domain
      const allowedOrigin = window.location.origin;
      if (e.origin !== allowedOrigin && e.origin !== 'null') return;
      if (e.data?.type === 'GAME_COMPLETE' && typeof e.data.score === 'number') {
        const score = Math.max(0, Math.min(e.data.score, 10000)); // clamp
        const total = Math.max(1, Math.min(e.data.total || 10, 10000));
        setGameResult({ score, total });
      }

      if (e.data?.type === 'GAME_TELEMETRY' && e.data?.game === 'gem') {
        try {
          const key = 'child_games_telemetry_buffer';
          const raw = sessionStorage.getItem(key);
          const prev = raw ? JSON.parse(raw) : [];
          const event = {
            ts: Date.now(),
            gameId: selectedGameRef.current?.id || null,
            event: e.data.event || 'unknown',
            sessionId: e.data.sessionId || null,
            world: e.data.world || null,
            level: e.data.level || null,
            payload: e.data.payload || {},
          };

          const next = [...prev, event].slice(-300);
          sessionStorage.setItem(key, JSON.stringify(next));
          setTelemetryVersion((v) => v + 1);
        } catch {
          // Ignore telemetry buffering issues.
        }
      }

      // Handle achievement sharing to child profile — rich game card post (share once per session)
      if (e.data?.type === 'SHARE_ACHIEVEMENT' && token) {
        const { game, level, score, stars, world } = e.data;
        const currentGame = selectedGameRef.current;
        if (!currentGame) return;

        (async () => {
          try {
            // Check if this game result was already shared in this session
            const postsRes = await fetch("/api/child/posts", {
              headers: { Authorization: `Bearer ${token}` },
            });
            let previousScore: number | null = null;
            let alreadySharedThisGame = false;
            if (postsRes.ok) {
              const postsJson = await postsRes.json();
              const posts = postsJson.data || postsJson || [];
              for (const p of posts) {
                if (p.content?.startsWith('###GAME_SHARE###')) {
                  try {
                    const jsonStr = p.content.replace('###GAME_SHARE###', '').replace('###END_GAME_SHARE###', '');
                    const shareData = JSON.parse(jsonStr);
                    if (shareData.gameUrl === currentGame.embedUrl) {
                      // Found existing share for this game — update score tracking but don't re-post
                      if (shareData.score === (score || 0)) {
                        alreadySharedThisGame = true;
                      }
                      if (previousScore === null) previousScore = shareData.score;
                      break;
                    }
                  } catch { }
                }
              }
            }

            if (alreadySharedThisGame) {
              // Already shared this exact result — just show social sharing buttons
              const isAr = langRef.current === 'ar';
              setGameShared(true);
              setSharedGameData({ gameName: currentGame.title, score: score || 0, stars: stars || 0 });
              toast({
                title: isAr ? '📱 شارك إنجازك!' : '📱 Share your achievement!',
                description: isAr ? 'تم النشر مسبقاً — استخدم أزرار المشاركة أدناه' : 'Already posted — use share buttons below',
              });
              return;
            }

            // Determine game emoji
            const gameEmoji = currentGame.embedUrl.includes('memory') ? '🧠' :
              currentGame.embedUrl.includes('math') ? '🔢' : '🎮';

            // Generate motivational text
            const isAr = langRef.current === 'ar';
            let motivationalText = '';
            if ((stars || 0) >= 3) motivationalText = isAr ? 'ممتاز! أداء رائع! 🏆' : 'Excellent! Amazing performance! 🏆';
            else if ((stars || 0) >= 2) motivationalText = isAr ? 'عمل رائع! استمر! 🎉' : 'Great job! Keep going! 🎉';
            else if ((stars || 0) >= 1) motivationalText = isAr ? 'جيد! حاول مرة أخرى للأفضل 💪' : 'Good! Try again for better! 💪';
            else motivationalText = isAr ? 'لا تستسلم! حاول مرة أخرى 💪' : "Don't give up! Try again! 💪";

            // Build rich post content
            const gameShareData = {
              gameId: currentGame.id,
              gameName: currentGame.title,
              gameEmoji,
              gameUrl: currentGame.embedUrl,
              thumbnailUrl: currentGame.thumbnailUrl,
              score: score || 0,
              stars: stars || 0,
              level: level || 1,
              world: world || 1,
              previousScore,
              motivationalText,
            };

            const content = `###GAME_SHARE###${JSON.stringify(gameShareData)}###END_GAME_SHARE###`;

            await fetch("/api/child/posts", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ content, mediaUrls: [], mediaTypes: [] }),
            });

            // Track that we shared this game
            setGameShared(true);
            setSharedGameData({ gameName: currentGame.title, score: score || 0, stars: stars || 0 });

            // Show success toast
            toast({
              title: isAr ? '✅ تم النشر!' : '✅ Posted!',
              description: isAr ? 'تم مشاركة إنجازك — شاركه مع أصدقائك!' : 'Achievement shared — share it with friends!',
            });
          } catch { }
        })();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [token, toast]);

  const completeGameMutation = useMutation({
    mutationFn: async ({ gameId, score, totalQuestions }: { gameId: string; score?: number; totalQuestions?: number }) => {
      const res = await fetch("/api/child/complete-game", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ gameId, score, totalQuestions }),
      });
      if (!res.ok) {
        throw new Error("Failed to complete game");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["child-info"] });
      const d = data?.data || data;
      setShowReward({ points: d.pointsEarned, total: d.newTotalPoints });
      setSelectedGame(null);
      setGameResult(null);
      setMutationError(null);
      setTimeout(() => setShowReward(null), 3000);
    },
    onError: (error: Error) => {
      const msg = error.message || "";
      if (msg.includes("Daily play limit")) {
        setMutationError(t("childGames.dailyLimitReached"));
      } else {
        setMutationError(t("childGames.errorTryAgain"));
      }
      setTimeout(() => setMutationError(null), 4000);
    },
  });

  // Close game modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedGame) {
        setSelectedGame(null);
        setGameResult(null);
        setMutationError(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedGame]);

  // Auto-play game from URL params (from shared game post play button)
  useEffect(() => {
    if (!games || games.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const autoPlayUrl = params.get('autoPlay');
    if (autoPlayUrl) {
      const game = games.find(g => g.embedUrl === autoPlayUrl || g.embedUrl.includes(autoPlayUrl));
      if (game) {
        setSelectedGame(game);
        setGameResult(null);
        setMutationError(null);
        setIframeLoading(true);
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [games]);

  if (!token || isChildInfoLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-gray-900" : "bg-gray-100"}`}>
        <div className="text-center">
          <Loader2 className={`w-10 h-10 animate-spin mx-auto mb-3 ${isDark ? "text-purple-300" : "text-purple-600"}`} />
          <p className={isDark ? "text-gray-300" : "text-gray-600"}>{t("childGames.checking")}</p>
        </div>
      </div>
    );
  }

  const handlePlayGame = (game: Game) => {
    setSelectedGame(game);
    setGameResult(null);
    setMutationError(null);
    setIframeLoading(true);
    setGameShared(false);
    setSharedGameData(null);
  };

  const prewarmGameConnection = useCallback((embedUrl: string) => {
    const parsed = (() => {
      try {
        return new URL(embedUrl, window.location.origin);
      } catch {
        return null;
      }
    })();
    if (!parsed) return;
    if (parsed.origin === window.location.origin) return;

    const host = parsed.origin;
    const key = `preconnect:${host}`;
    if (document.querySelector(`link[data-prewarm='${key}']`)) return;

    const preconnect = document.createElement("link");
    preconnect.rel = "preconnect";
    preconnect.href = host;
    preconnect.crossOrigin = "anonymous";
    preconnect.setAttribute("data-prewarm", key);
    document.head.appendChild(preconnect);

    const dnsPrefetch = document.createElement("link");
    dnsPrefetch.rel = "dns-prefetch";
    dnsPrefetch.href = host;
    dnsPrefetch.setAttribute("data-prewarm", `${key}:dns`);
    document.head.appendChild(dnsPrefetch);
  }, []);

  const applyGameClarityEnhancements = useCallback(() => {
    const iframe = gameIframeRef.current;
    if (!iframe) return;

    iframe.style.filter = "none";
    iframe.style.transform = "none";
    iframe.style.backfaceVisibility = "visible";

    // Same-origin only: all local HTML games are same-origin, external embeds are skipped safely.
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;

      const STYLE_ID = "classify-game-clarity-style";
      if (!doc.getElementById(STYLE_ID)) {
        const style = doc.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
          html, body {
            text-rendering: geometricPrecision;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          canvas, img, svg, video {
            image-rendering: auto;
            shape-rendering: geometricPrecision;
          }

          :root[data-clarity='ultra'] {
            --classify-clarity-ultra: 1;
          }

          :root[data-clarity='ultra'] canvas,
          :root[data-clarity='ultra'] img,
          :root[data-clarity='ultra'] svg,
          :root[data-clarity='ultra'] video {
            image-rendering: -webkit-optimize-contrast;
          }
        `;
        (doc.head || doc.documentElement).appendChild(style);
      }

      doc.documentElement.setAttribute("data-clarity", ultraClarity ? "ultra" : "normal");
    } catch {
      // Cross-origin iframe; cannot access content.
    }
  }, [ultraClarity]);

  const buildGameSrc = useCallback((embedUrl: string, language: string) => {
    const rawValue = String(embedUrl || "").trim();
    if (!rawValue) return rawValue;

    let normalizedBase = rawValue;

    try {
      const parsed = new URL(rawValue, window.location.origin);
      const firstPartyHosts = new Set([
        window.location.hostname.toLowerCase(),
        "classi-fy.com",
        "www.classi-fy.com",
        "localhost",
        "127.0.0.1",
      ]);

      if (parsed.pathname.startsWith("/games/") && firstPartyHosts.has(parsed.hostname.toLowerCase())) {
        normalizedBase = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      normalizedBase = rawValue;
    }

    const url = new URL(normalizedBase, window.location.origin);
    url.searchParams.set("lang", language);
    url.searchParams.set("quality", "high");

    const isGem = url.pathname.includes("gem-kingdom");
    if (isGem) {
      url.searchParams.set("tune", gemTuneProfile);
    }

    return `${url.pathname}${url.search}${url.hash}`;
  }, [gemTuneProfile]);

  useEffect(() => {
    try {
      localStorage.setItem("child_games_ultra_clarity", ultraClarity ? "1" : "0");
    } catch {
      // Ignore storage quota/security issues.
    }
  }, [ultraClarity]);

  useEffect(() => {
    try {
      localStorage.setItem("child_games_gem_tune_profile", gemTuneProfile);
    } catch {
      // Ignore storage quota/security issues.
    }
  }, [gemTuneProfile]);

  useEffect(() => {
    if (!selectedGame || iframeLoading) return;
    applyGameClarityEnhancements();
  }, [selectedGame, iframeLoading, applyGameClarityEnhancements]);

  // Apply clarity CSS filter when toggle changes (no iframe reload)
  useEffect(() => {
    if (!selectedGame || iframeLoading) return;
    applyGameClarityEnhancements();
  }, [ultraClarity]);

  const handleCompleteGame = () => {
    if (selectedGame && gameResult) {
      completeGameMutation.mutate({
        gameId: selectedGame.id,
        score: gameResult.score,
        totalQuestions: gameResult.total,
      });
    }
  };

  const isRTL = i18n.language === 'ar';
  const isGemGameOpen = !!selectedGame?.embedUrl?.includes("gem-kingdom");
  const gamesList = Array.isArray(games) ? games : [];
  const filteredGames = gamesList;

  const gemTelemetryInsights = useMemo(() => {
    if (!isGemGameOpen) return null;

    try {
      const raw = sessionStorage.getItem("child_games_telemetry_buffer");
      const buffer: GemTelemetryEvent[] = raw ? JSON.parse(raw) : [];
      const forCurrentGame = buffer.filter(
        (evt) => evt && evt.event && (evt.gameId === selectedGame?.id || evt.gameId === null)
      );
      if (!forCurrentGame.length) return null;

      const latestSessionId = [...forCurrentGame].reverse().find((evt) => evt.event === "session_started")?.sessionId || null;
      const sessionEvents = latestSessionId
        ? forCurrentGame.filter((evt) => evt.sessionId === latestSessionId)
        : forCurrentGame.slice(-150);

      const levelStarted = sessionEvents.filter((evt) => evt.event === "level_started").length;
      const levelCompletedEvents = sessionEvents.filter((evt) => evt.event === "level_completed");
      const levelCompleted = levelCompletedEvents.length;
      const levelWon = levelCompletedEvents.filter((evt) => evt.payload?.won === true).length;
      const levelAbandoned = sessionEvents.filter((evt) => evt.event === "level_abandoned").length;
      const tutorialStarted = sessionEvents.filter((evt) => evt.event === "tutorial_started").length;
      const tutorialCompleted = sessionEvents.filter((evt) => evt.event === "tutorial_completed").length;
      const storyShown = sessionEvents.filter((evt) => evt.event === "story_dialog_shown").length;
      const storyClosed = sessionEvents.filter((evt) => evt.event === "story_dialog_closed").length;
      const moduleLoadFailed = sessionEvents.filter((evt) => evt.event === "module_load_failed").length;
      const gameReady = sessionEvents.find((evt) => evt.event === "game_ready");
      const startupMsRaw = Number(gameReady?.payload?.initMs);
      const startupMs = Number.isFinite(startupMsRaw) && startupMsRaw >= 0 ? Math.round(startupMsRaw) : null;

      const qosHeartbeats = sessionEvents.filter((evt) => evt.event === "qos_heartbeat");
      const qosSummaries = sessionEvents.filter((evt) => evt.event === "level_qos_summary");
      const reducedEffectsEvents = sessionEvents.filter((evt) => evt.event === "qos_effects_reduced");

      const heartbeatDrops = qosHeartbeats
        .map((evt) => Number(evt.payload?.frameDropsWindow))
        .filter((value) => Number.isFinite(value) && value >= 0) as number[];
      const heartbeatLongFrames = qosHeartbeats
        .map((evt) => Number(evt.payload?.longFramesWindow))
        .filter((value) => Number.isFinite(value) && value >= 0) as number[];

      const summaryFrameDrops = qosSummaries
        .map((evt) => Number(evt.payload?.totalFrameDrops))
        .filter((value) => Number.isFinite(value) && value >= 0) as number[];
      const summaryLongFrames = qosSummaries
        .map((evt) => Number(evt.payload?.totalLongFrames))
        .filter((value) => Number.isFinite(value) && value >= 0) as number[];

      const avgFrameDropsWindow = heartbeatDrops.length
        ? Math.round((heartbeatDrops.reduce((sum, value) => sum + value, 0) / heartbeatDrops.length) * 10) / 10
        : null;
      const avgLongFramesWindow = heartbeatLongFrames.length
        ? Math.round((heartbeatLongFrames.reduce((sum, value) => sum + value, 0) / heartbeatLongFrames.length) * 10) / 10
        : null;
      const avgLevelFrameDrops = summaryFrameDrops.length
        ? Math.round((summaryFrameDrops.reduce((sum, value) => sum + value, 0) / summaryFrameDrops.length) * 10) / 10
        : null;
      const avgLevelLongFrames = summaryLongFrames.length
        ? Math.round((summaryLongFrames.reduce((sum, value) => sum + value, 0) / summaryLongFrames.length) * 10) / 10
        : null;

      const elapsedValues = levelCompletedEvents
        .map((evt) => Number(evt.payload?.elapsedSec))
        .filter((value) => Number.isFinite(value) && value > 0) as number[];
      const avgLevelSec = elapsedValues.length
        ? Math.round((elapsedValues.reduce((sum, value) => sum + value, 0) / elapsedValues.length) * 10) / 10
        : null;

      return {
        sessionId: latestSessionId,
        sampleSize: sessionEvents.length,
        levelStarted,
        levelCompleted,
        levelWon,
        levelAbandoned,
        completionRate: levelStarted > 0 ? Math.round((levelCompleted / levelStarted) * 100) : null,
        winRate: levelCompleted > 0 ? Math.round((levelWon / levelCompleted) * 100) : null,
        abandonRate: levelStarted > 0 ? Math.round((levelAbandoned / levelStarted) * 100) : null,
        tutorialStarted,
        tutorialCompleted,
        storyShown,
        storyClosed,
        moduleLoadFailed,
        avgLevelSec,
        startupMs,
        qosHeartbeatCount: qosHeartbeats.length,
        qosSummaryCount: qosSummaries.length,
        qosReducedEffectsCount: reducedEffectsEvents.length,
        avgFrameDropsWindow,
        avgLongFramesWindow,
        avgLevelFrameDrops,
        avgLevelLongFrames,
      };
    } catch {
      return null;
    }
  }, [isGemGameOpen, selectedGame?.id, telemetryVersion]);

  const gemAdaptiveBaseline = useMemo(() => {
    const defaults = {
      enabled: false,
      sampleCount: 0,
      abandonWarn: 35,
      completionLow: 55,
      winLow: 45,
      startupWarnMs: 3000,
      frameDropsWarn: 25,
      longFramesWarn: 8,
    };

    if (!isGemGameOpen) return defaults;

    try {
      const raw = localStorage.getItem("child_games_gem_session_health_history");
      const history = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(history)) return defaults;

      const sameTune = history.filter((entry: any) => entry?.tune === gemTuneProfile);
      const scoped = (sameTune.length >= 5 ? sameTune : history).slice(-20);
      if (scoped.length < 5) return defaults;

      const percentile = (values: number[], p: number) => {
        if (!values.length) return null;
        const sorted = [...values].sort((a, b) => a - b);
        const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * (sorted.length - 1))));
        return sorted[idx];
      };

      const abandons = scoped.map((x: any) => Number(x?.abandonRate)).filter((v: number) => Number.isFinite(v) && v >= 0);
      const completions = scoped.map((x: any) => Number(x?.completionRate)).filter((v: number) => Number.isFinite(v) && v >= 0);
      const wins = scoped.map((x: any) => Number(x?.winRate)).filter((v: number) => Number.isFinite(v) && v >= 0);
      const startups = scoped.map((x: any) => Number(x?.startupMs)).filter((v: number) => Number.isFinite(v) && v > 0);
      const frameDrops = scoped.map((x: any) => Number(x?.avgLevelFrameDrops)).filter((v: number) => Number.isFinite(v) && v >= 0);
      const longFrames = scoped.map((x: any) => Number(x?.avgLongFramesWindow)).filter((v: number) => Number.isFinite(v) && v >= 0);

      const abandonP75 = percentile(abandons, 75);
      const completionP25 = percentile(completions, 25);
      const winP25 = percentile(wins, 25);
      const startupP75 = percentile(startups, 75);
      const frameDropsP75 = percentile(frameDrops, 75);
      const longFramesP75 = percentile(longFrames, 75);

      return {
        enabled: true,
        sampleCount: scoped.length,
        abandonWarn: abandonP75 !== null ? Math.max(20, Math.min(55, Math.round(abandonP75 + 8))) : defaults.abandonWarn,
        completionLow: completionP25 !== null ? Math.max(35, Math.min(75, Math.round(completionP25 - 8))) : defaults.completionLow,
        winLow: winP25 !== null ? Math.max(30, Math.min(70, Math.round(winP25 - 8))) : defaults.winLow,
        startupWarnMs: startupP75 !== null ? Math.max(1800, Math.min(5000, Math.round(startupP75 + 500))) : defaults.startupWarnMs,
        frameDropsWarn: frameDropsP75 !== null ? Math.max(10, Math.min(60, Math.round(frameDropsP75 + 6))) : defaults.frameDropsWarn,
        longFramesWarn: longFramesP75 !== null ? Math.max(4, Math.min(20, Math.round(longFramesP75 + 3))) : defaults.longFramesWarn,
      };
    } catch {
      return defaults;
    }
  }, [isGemGameOpen, gemTuneProfile, telemetryVersion]);

  const gemAdaptiveWeights = useMemo(() => {
    const defaults = {
      enabled: false,
      module: 1,
      abandon: 1,
      completion: 1,
      win: 1,
      startup: 1,
      qos: 1,
      tutorial: 1,
    };

    if (!isGemGameOpen) return defaults;

    const byTune = {
      balanced: { ...defaults, enabled: true },
      performance: { ...defaults, enabled: true, completion: 0.85, win: 0.85, startup: 1.1, qos: 1.2, tutorial: 0.8 },
      easy: { ...defaults, enabled: true, abandon: 1.1, completion: 1.2, win: 1.15, startup: 0.8, qos: 0.8 },
    } as const;

    const active = { ...byTune[gemTuneProfile] };

    try {
      const raw = localStorage.getItem("child_games_gem_session_health_history");
      const history = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(history) || history.length < 5) return active;

      const sameTune = history.filter((entry: any) => entry?.tune === gemTuneProfile);
      const scoped = (sameTune.length >= 5 ? sameTune : history).slice(-20);
      if (scoped.length < 5) return active;

      const avg = (values: number[]) => values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : 0;

      const avgCompletion = avg(scoped.map((x: any) => Number(x?.completionRate)).filter((v: number) => Number.isFinite(v) && v >= 0));
      const avgWin = avg(scoped.map((x: any) => Number(x?.winRate)).filter((v: number) => Number.isFinite(v) && v >= 0));
      const avgFrameDrops = avg(scoped.map((x: any) => Number(x?.avgLevelFrameDrops)).filter((v: number) => Number.isFinite(v) && v >= 0));
      const avgLongFrames = avg(scoped.map((x: any) => Number(x?.avgLongFramesWindow)).filter((v: number) => Number.isFinite(v) && v >= 0));

      // If performance is poor across history, prioritize completion/win penalties.
      if (avgCompletion > 0 && avgCompletion < 50) active.completion = Math.min(1.35, active.completion + 0.15);
      if (avgWin > 0 && avgWin < 40) active.win = Math.min(1.3, active.win + 0.15);

      // If device appears consistently constrained, soften QoS/startup penalties to avoid over-penalization.
      const deviceConstrained = avgFrameDrops > gemAdaptiveBaseline.frameDropsWarn * 1.2 || avgLongFrames > gemAdaptiveBaseline.longFramesWarn * 1.2;
      if (deviceConstrained) {
        active.qos = Math.max(0.65, active.qos - 0.2);
        active.startup = Math.max(0.7, active.startup - 0.15);
      }
    } catch {
      // Keep tune defaults.
    }

    return active;
  }, [isGemGameOpen, gemTuneProfile, gemAdaptiveBaseline.frameDropsWarn, gemAdaptiveBaseline.longFramesWarn, telemetryVersion]);

  const gemSessionHealth = useMemo(() => {
    if (!isGemGameOpen || !gemTelemetryInsights) return null;

    const alerts: Array<{ severity: "critical" | "warning" | "info"; label: string }> = [];
    const recommendations: string[] = [];
    const penaltyBreakdown: Array<{ key: string; label: string; base: number; weight: number; applied: number; value: string }> = [];
    let score = 100;
    const penalize = (key: string, label: string, base: number, weight: number, value: string) => {
      const penalty = Math.max(1, Math.round(base * weight));
      score -= penalty;
      penaltyBreakdown.push({ key, label, base, weight, applied: penalty, value });
    };

    if (gemTelemetryInsights.moduleLoadFailed > 0) {
      alerts.push({
        severity: "critical",
        label: isRTL
          ? `فشل تحميل وحدات: ${gemTelemetryInsights.moduleLoadFailed}`
          : `Module load failures: ${gemTelemetryInsights.moduleLoadFailed}`,
      });
      recommendations.push(
        isRTL
          ? "تحقق من استقرار تحميل الملفات داخل iframe قبل بدء الجلسة."
          : "Validate module loading stability in the iframe before starting gameplay."
      );
      penalize(
        "module",
        isRTL ? "فشل تحميل الوحدات" : "Module Load Failure",
        30,
        gemAdaptiveWeights.module,
        `${gemTelemetryInsights.moduleLoadFailed}`
      );
    }

    if ((gemTelemetryInsights.abandonRate ?? 0) >= gemAdaptiveBaseline.abandonWarn) {
      alerts.push({
        severity: "warning",
        label: isRTL
          ? `تخلي مرتفع: ${gemTelemetryInsights.abandonRate}%`
          : `High abandon rate: ${gemTelemetryInsights.abandonRate}%`,
      });
      recommendations.push(
        isRTL
          ? "قلل الحمل في أول 30 ثانية (نصوص أقل، انتقالات أخف، تعليمات أوضح)."
          : "Reduce first-30s friction (lighter transitions, clearer first actions, less cognitive load)."
      );
      penalize(
        "abandon",
        isRTL ? "معدل التخلي" : "Abandon Rate",
        18,
        gemAdaptiveWeights.abandon,
        `${gemTelemetryInsights.abandonRate ?? "-"}%`
      );
    }

    if ((gemTelemetryInsights.completionRate ?? 100) < gemAdaptiveBaseline.completionLow && gemTelemetryInsights.levelStarted >= 3) {
      alerts.push({
        severity: "warning",
        label: isRTL
          ? `إكمال منخفض: ${gemTelemetryInsights.completionRate}%`
          : `Low completion rate: ${gemTelemetryInsights.completionRate}%`,
      });
      recommendations.push(
        isRTL
          ? "اضبط صعوبة أول المراحل تدريجيًا وارفع المساعدة السياقية."
          : "Smooth early difficulty ramp and add contextual guidance during first levels."
      );
      penalize(
        "completion",
        isRTL ? "معدل الإكمال" : "Completion Rate",
        14,
        gemAdaptiveWeights.completion,
        `${gemTelemetryInsights.completionRate ?? "-"}%`
      );
    }

    if ((gemTelemetryInsights.winRate ?? 100) < gemAdaptiveBaseline.winLow && gemTelemetryInsights.levelCompleted >= 3) {
      alerts.push({
        severity: "warning",
        label: isRTL
          ? `فوز منخفض: ${gemTelemetryInsights.winRate}%`
          : `Low win rate: ${gemTelemetryInsights.winRate}%`,
      });
      recommendations.push(
        isRTL
          ? "راجع توازن الأهداف مقابل عدد الحركات في المراحل المبكرة."
          : "Rebalance objectives versus available moves in early levels."
      );
      penalize(
        "win",
        isRTL ? "معدل الفوز" : "Win Rate",
        12,
        gemAdaptiveWeights.win,
        `${gemTelemetryInsights.winRate ?? "-"}%`
      );
    }

    if ((gemTelemetryInsights.startupMs ?? 0) > gemAdaptiveBaseline.startupWarnMs) {
      alerts.push({
        severity: "warning",
        label: isRTL
          ? `بدء بطيء: ${gemTelemetryInsights.startupMs}ms`
          : `Slow startup: ${gemTelemetryInsights.startupMs}ms`,
      });
      recommendations.push(
        isRTL
          ? "قلل التهيئة المتزامنة عند الإقلاع وانقل غير الضروري لما بعد أول شاشة."
          : "Reduce synchronous startup work and defer non-critical setup after first screen render."
      );
      penalize(
        "startup",
        isRTL ? "زمن البدء" : "Startup Latency",
        10,
        gemAdaptiveWeights.startup,
        `${gemTelemetryInsights.startupMs ?? "-"}ms`
      );
    }

    if ((gemTelemetryInsights.avgLevelFrameDrops ?? 0) > gemAdaptiveBaseline.frameDropsWarn || (gemTelemetryInsights.avgLongFramesWindow ?? 0) > gemAdaptiveBaseline.longFramesWarn) {
      alerts.push({
        severity: "warning",
        label: isRTL
          ? "ضغط أداء أثناء اللعب"
          : "Performance pressure detected",
      });
      recommendations.push(
        isRTL
          ? "قلل كثافة المؤثرات البصرية في الكومبوهات العالية على الأجهزة الضعيفة."
          : "Lower combo VFX density on lower-tier devices to preserve frame stability."
      );
      penalize(
        "qos",
        isRTL ? "ضغط الأداء" : "Performance Pressure",
        10,
        gemAdaptiveWeights.qos,
        `${gemTelemetryInsights.avgLevelFrameDrops ?? "-"}/${gemTelemetryInsights.avgLongFramesWindow ?? "-"}`
      );
    }

    if (gemTelemetryInsights.qosReducedEffectsCount > 0) {
      alerts.push({
        severity: "info",
        label: isRTL
          ? `تم تفعيل وضع خفيف ${gemTelemetryInsights.qosReducedEffectsCount} مرة`
          : `Reduced effects triggered ${gemTelemetryInsights.qosReducedEffectsCount}x`,
      });
      penalize(
        "qos_reduced",
        isRTL ? "وضع خفيف مفعل" : "Reduced Effects Triggered",
        4,
        gemAdaptiveWeights.qos,
        `${gemTelemetryInsights.qosReducedEffectsCount}`
      );
    }

    if (gemTelemetryInsights.tutorialStarted > gemTelemetryInsights.tutorialCompleted) {
      alerts.push({
        severity: "info",
        label: isRTL ? "تسرب في إكمال الدليل" : "Tutorial completion drop-off",
      });
      recommendations.push(
        isRTL
          ? "اختصر خطوات الدليل الأولى واجعل الإجراء الأول تفاعليًا خلال 5 ثوانٍ."
          : "Compress tutorial opening and force a meaningful action within the first 5 seconds."
      );
      penalize(
        "tutorial",
        isRTL ? "تسرب الدليل" : "Tutorial Drop-off",
        6,
        gemAdaptiveWeights.tutorial,
        `${gemTelemetryInsights.tutorialStarted}/${gemTelemetryInsights.tutorialCompleted}`
      );
    }

    let priorityInsight: string | null = null;
    let priorityInsightMeta: { key: string; shownAt: number; variantIndex: number; cooldownMs: number; tune: GemTuneProfile } | null = null;
    try {
      const raw = localStorage.getItem("child_games_gem_session_health_history");
      const history = raw ? JSON.parse(raw) : [];
      if (Array.isArray(history) && history.length > 0) {
        const recent = history.slice(-10);
        const counts = new Map<string, number>();
        for (const session of recent) {
          const penalties = Array.isArray(session?.topPenalties) ? session.topPenalties : [];
          for (const item of penalties) {
            const key = String(item?.key || "unknown");
            counts.set(key, (counts.get(key) || 0) + 1);
          }
        }

        let topKey = "";
        let topCount = 0;
        for (const [key, count] of counts.entries()) {
          if (count > topCount) {
            topKey = key;
            topCount = count;
          }
        }

        if (topCount >= 3) {
          const variantsByKey: Record<string, string[]> = isRTL
            ? {
              module: [
                "الأولوية: أصلح استقرار تحميل الوحدات لأنه السبب الأكثر تكرارًا.",
                "نصيحة تنفيذية: عالج أعطال تحميل الوحدات أولًا قبل أي تحسين آخر.",
              ],
              abandon: [
                "الأولوية: قلل التخلي بتحسين أول 30 ثانية ومسار البداية.",
                "نصيحة تنفيذية: اجعل أول تفاعل أسهل وأوضح لتقليل التخلي المبكر.",
              ],
              completion: [
                "الأولوية: ارفع الإكمال عبر تبسيط أهداف المراحل الأولى.",
                "نصيحة تنفيذية: قلل تعقيد المرحلة المبكرة لرفع معدل الإكمال.",
              ],
              win: [
                "الأولوية: عاير صعوبة البداية لتحسين معدل الفوز.",
                "نصيحة تنفيذية: زِد توازن فرص الفوز في أول المستويات.",
              ],
              startup: [
                "الأولوية: خفف تهيئة البداية لتقليل زمن الإقلاع.",
                "نصيحة تنفيذية: أجّل الأعمال غير الحرجة بعد أول عرض للشاشة.",
              ],
              qos: [
                "الأولوية: خفف الحمل الرسومي لأن مشاكل الأداء تتكرر.",
                "نصيحة تنفيذية: قلل كثافة المؤثرات الثقيلة في الأجهزة الأبطأ.",
              ],
              qos_reduced: [
                "الأولوية: راقب أسباب تفعيل الوضع الخفيف وقلل المؤثرات المكلفة.",
                "نصيحة تنفيذية: استهدف المشاهد التي تفعل reduced-effects باستمرار.",
              ],
              tutorial: [
                "الأولوية: اختصر الدليل الأولي لأنه مصدر تسرب متكرر.",
                "نصيحة تنفيذية: اجعل الدليل قصيرًا مع خطوة تفاعلية مبكرة.",
              ],
            }
            : {
              module: [
                "Priority: stabilize module loading; it is the most recurring cause.",
                "Execution tip: fix module-load failures before deeper tuning work.",
              ],
              abandon: [
                "Priority: reduce abandonment by improving first-30s onboarding flow.",
                "Execution tip: make the first interaction easier and clearer to prevent early exits.",
              ],
              completion: [
                "Priority: improve completion by simplifying early-level objectives.",
                "Execution tip: lower early-level complexity to lift completion.",
              ],
              win: [
                "Priority: rebalance early difficulty to improve win rate.",
                "Execution tip: tune opening levels for healthier win odds.",
              ],
              startup: [
                "Priority: reduce startup work to lower launch latency.",
                "Execution tip: defer non-critical setup until after first paint.",
              ],
              qos: [
                "Priority: reduce rendering pressure; performance degradation is recurring.",
                "Execution tip: lower heavy visual-effect density on constrained devices.",
              ],
              qos_reduced: [
                "Priority: inspect reduced-effects triggers and remove expensive effects.",
                "Execution tip: target the scenes that repeatedly trigger reduced-effects mode.",
              ],
              tutorial: [
                "Priority: shorten tutorial opening; repeated drop-off is detected.",
                "Execution tip: compress tutorial and force meaningful action earlier.",
              ],
            };

          const fallback = isRTL
            ? "الأولوية: السبب الأكثر تكرارًا يحتاج معالجة مباشرة."
            : "Priority: address the most recurring degradation cause first.";

          const variants = variantsByKey[topKey] || [fallback];
          const now = Date.now();
          const cooldownByTune: Record<GemTuneProfile, number> = {
            easy: 20 * 60 * 1000,
            balanced: 35 * 60 * 1000,
            performance: 55 * 60 * 1000,
          };
          const baseCooldownMs = cooldownByTune[gemTuneProfile];

          // Adaptive cooldown: longer when one cause dominates, shorter when causes are volatile.
          const sessionTopKeys: string[] = [];
          for (const session of recent) {
            const penalties = Array.isArray(session?.topPenalties) ? session.topPenalties : [];
            if (penalties.length > 0) {
              const top = penalties[0];
              sessionTopKeys.push(String(top?.key || "unknown"));
            }
          }
          const uniqueTopKeys = new Set(sessionTopKeys).size;
          const dominance = recent.length > 0 ? topCount / recent.length : 0;

          let adaptiveCooldownMs = baseCooldownMs;
          if (dominance >= 0.6) {
            adaptiveCooldownMs += 15 * 60 * 1000;
          } else if (dominance <= 0.35 || uniqueTopKeys >= 4) {
            adaptiveCooldownMs -= 10 * 60 * 1000;
          }

          const cooldownMs = Math.max(10 * 60 * 1000, Math.min(90 * 60 * 1000, adaptiveCooldownMs));
          const stateKey = "child_games_gem_priority_insight_state";

          let lastState: { key?: string; shownAt?: number; variantIndex?: number; cooldownMs?: number; tune?: GemTuneProfile } = {};
          try {
            const stateRaw = localStorage.getItem(stateKey);
            lastState = stateRaw ? JSON.parse(stateRaw) : {};
          } catch {
            lastState = {};
          }

          const isSameKey = lastState?.key === topKey;
          const effectiveCooldownMs = isSameKey ? Number(lastState?.cooldownMs || cooldownMs) : cooldownMs;
          const withinCooldown = isSameKey && Number(lastState?.shownAt || 0) > 0 && (now - Number(lastState.shownAt)) < effectiveCooldownMs;

          if (!withinCooldown) {
            const nextVariantIndex = isSameKey
              ? (Number(lastState?.variantIndex || 0) + 1) % variants.length
              : 0;
            priorityInsight = variants[nextVariantIndex] || fallback;
            priorityInsightMeta = {
              key: topKey,
              shownAt: now,
              variantIndex: nextVariantIndex,
              cooldownMs,
              tune: gemTuneProfile,
            };
          }
        }
      }
    } catch {
      // Ignore malformed history.
    }

    if (priorityInsight && !recommendations.includes(priorityInsight)) {
      recommendations.unshift(priorityInsight);
    }

    if (recommendations.length === 0) {
      recommendations.push(
        isRTL
          ? "الجلسة مستقرة. استمر في جمع بيانات أكثر قبل أي تعديل كبير."
          : "Session health is stable. Keep collecting more samples before major tuning changes."
      );
    }

    const qualityScore = Math.max(0, Math.min(100, score));
    const topPenalties = [...penaltyBreakdown]
      .sort((a, b) => b.applied - a.applied)
      .slice(0, 3);
    return { qualityScore, alerts, recommendations, topPenalties, priorityInsight, priorityInsightMeta };
  }, [isGemGameOpen, gemTelemetryInsights, isRTL, gemAdaptiveBaseline, gemAdaptiveWeights, gemTuneProfile]);

  useEffect(() => {
    if (!isGemGameOpen || !gemSessionHealth || !gemTelemetryInsights?.sessionId) return;
    try {
      const key = "child_games_gem_session_health_history";
      const raw = localStorage.getItem(key);
      const prev = raw ? JSON.parse(raw) : [];
      const sessionId = gemTelemetryInsights.sessionId;
      const nextEntry = {
        sessionId,
        ts: Date.now(),
        qualityScore: gemSessionHealth.qualityScore,
        completionRate: gemTelemetryInsights.completionRate,
        winRate: gemTelemetryInsights.winRate,
        abandonRate: gemTelemetryInsights.abandonRate,
        startupMs: gemTelemetryInsights.startupMs,
        avgLevelFrameDrops: gemTelemetryInsights.avgLevelFrameDrops,
        avgLongFramesWindow: gemTelemetryInsights.avgLongFramesWindow,
        topPenalties: gemSessionHealth.topPenalties.map((p) => ({ key: p.key, label: p.label, applied: p.applied })),
        tune: gemTuneProfile,
      };

      const withoutCurrent = Array.isArray(prev)
        ? prev.filter((entry: any) => entry?.sessionId !== sessionId)
        : [];
      const next = [...withoutCurrent, nextEntry].slice(-20);
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Ignore storage issues.
    }
  }, [isGemGameOpen, gemSessionHealth, gemTelemetryInsights?.sessionId, gemTelemetryInsights?.completionRate, gemTelemetryInsights?.winRate, gemTelemetryInsights?.abandonRate, gemTelemetryInsights?.startupMs, gemTelemetryInsights?.avgLevelFrameDrops, gemTelemetryInsights?.avgLongFramesWindow, gemTuneProfile]);

  useEffect(() => {
    const meta = gemSessionHealth?.priorityInsightMeta;
    if (!meta) return;
    try {
      localStorage.setItem("child_games_gem_priority_insight_state", JSON.stringify(meta));
    } catch {
      // Ignore storage issues.
    }
  }, [gemSessionHealth?.priorityInsightMeta]);

  const gemHealthTrend = useMemo(() => {
    if (!isGemGameOpen) return [] as Array<{ ts: number; qualityScore: number; tune: GemTuneProfile }>;
    try {
      const raw = localStorage.getItem("child_games_gem_session_health_history");
      const history = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(history)) return [];
      return history
        .map((entry: any) => ({
          ts: Number(entry?.ts) || 0,
          qualityScore: Number(entry?.qualityScore) || 0,
          tune: (entry?.tune === "performance" || entry?.tune === "easy" || entry?.tune === "balanced") ? entry.tune : "balanced",
        }))
        .filter((entry: { ts: number; qualityScore: number; tune: GemTuneProfile }) => entry.ts > 0)
        .slice(-10);
    } catch {
      return [];
    }
  }, [isGemGameOpen, telemetryVersion, gemSessionHealth?.qualityScore]);

  const gemPenaltyTrend = useMemo(() => {
    if (!isGemGameOpen) return [] as Array<{ key: string; label: string; count: number }>;
    try {
      const raw = localStorage.getItem("child_games_gem_session_health_history");
      const history = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(history)) return [];

      const recent = history.slice(-10);
      const map = new Map<string, { label: string; count: number }>();

      for (const session of recent) {
        const penalties = Array.isArray(session?.topPenalties) ? session.topPenalties : [];
        for (const item of penalties) {
          const key = String(item?.key || "unknown");
          const label = String(item?.label || key);
          const prev = map.get(key);
          if (prev) prev.count += 1;
          else map.set(key, { label, count: 1 });
        }
      }

      return [...map.entries()]
        .map(([key, data]) => ({ key, label: data.label, count: data.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
    } catch {
      return [];
    }
  }, [isGemGameOpen, telemetryVersion, gemSessionHealth?.qualityScore]);

  const thumbnailVisualStyle = ultraClarity
    ? {
      filter: "contrast(1.2) saturate(1.12) brightness(1.04)",
      imageRendering: "auto" as const,
      transform: "translateZ(0)",
    }
    : {
      filter: "contrast(1.06) saturate(1.04)",
      imageRendering: "auto" as const,
      transform: "translateZ(0)",
    };

  const gameSectionHints = useMemo(() => ([
    {
      id: "games-play",
      icon: "🎮",
      title: isRTL ? "ابدأ اللعب بسرعة" : "Start Playing Fast",
      description: isRTL
        ? "اختر لعبة واضغط عليها للبدء فورًا، ويمكنك الرجوع في أي وقت بدون فقد التقدم."
        : "Pick a game and jump in instantly, then return any time without losing progress.",
    },
    {
      id: "games-points",
      icon: "⭐",
      title: isRTL ? "اجمع النقاط بذكاء" : "Earn Points Smartly",
      description: isRTL
        ? "الألعاب المختلفة تعطي نقاطًا متفاوتة، جرّب أكثر من لعبة لرفع مستواك بسرعة."
        : "Different games award different points, mix games to level up faster.",
    },
    {
      id: "games-share",
      icon: "📣",
      title: isRTL ? "شارك إنجازاتك" : "Share Your Wins",
      description: isRTL
        ? "بعد إنهاء اللعبة يمكنك مشاركة إنجازك مع عائلتك وأصدقائك بسهولة."
        : "After finishing a game, share your achievement with family and friends.",
    },
  ]), [isRTL]);

  const visibleGameHints = useMemo(() => gameSectionHints.filter((hint) => !dismissedGameHints[hint.id]), [gameSectionHints, dismissedGameHints]);

  const dismissGameHint = useCallback((id: string) => {
    setDismissedGameHints((prev) => {
      const next = { ...prev, [id]: true };
      localStorage.setItem("childGamesSectionHints", JSON.stringify(next));
      return next;
    });
  }, []);

  const getFallbackPreviewClasses = (embedUrl: string) => {
    if (embedUrl === "/games/memory-match.html") {
      return "bg-gradient-to-br from-indigo-700 via-blue-700 to-cyan-600";
    }
    if (embedUrl === "/games/math-challenge.html") {
      return "bg-gradient-to-br from-teal-700 via-cyan-700 to-sky-600";
    }
    if (embedUrl === "/games/gem-kingdom.html") {
      return "bg-gradient-to-br from-blue-800 via-indigo-700 to-violet-700";
    }
    return "bg-gradient-to-br from-blue-700 via-indigo-700 to-sky-700";
  };

  const getGamePreviewMedia = (embedUrl: string) => {
    return GAME_PREVIEW_MEDIA[embedUrl] || null;
  };

  return (
    <div className={`relative min-h-screen overflow-x-hidden ${isDark ? "bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900" : "bg-gradient-to-br from-sky-100 via-indigo-100 to-violet-100"} pt-[max(0.35rem,env(safe-area-inset-top,0px))] pb-[calc(10rem+env(safe-area-inset-bottom,0px))]`} dir={isRTL ? "rtl" : "ltr"}>
      <div className={`pointer-events-none absolute -top-20 ${isRTL ? "-left-20" : "-right-20"} h-72 w-72 rounded-full blur-3xl ${isDark ? "bg-cyan-700/25" : "bg-sky-300/40"}`} />
      <div className={`pointer-events-none absolute top-[28rem] ${isRTL ? "-right-20" : "-left-20"} h-80 w-80 rounded-full blur-3xl ${isDark ? "bg-indigo-700/20" : "bg-violet-300/35"}`} />
      <div
        className={`pointer-events-none absolute inset-x-[-10%] top-[8.25rem] h-[54vh] ${isDark ? "opacity-30" : "opacity-45"}`}
        style={{
          backgroundImage: isDark
            ? "repeating-linear-gradient(90deg, rgba(147,197,253,0.22) 0px, rgba(147,197,253,0.22) 1px, transparent 1px, transparent 42px), repeating-linear-gradient(0deg, rgba(147,197,253,0.17) 0px, rgba(147,197,253,0.17) 1px, transparent 1px, transparent 42px)"
            : "repeating-linear-gradient(90deg, rgba(67,56,202,0.2) 0px, rgba(67,56,202,0.2) 1px, transparent 1px, transparent 42px), repeating-linear-gradient(0deg, rgba(99,102,241,0.16) 0px, rgba(99,102,241,0.16) 1px, transparent 1px, transparent 42px)",
          transform: "perspective(980px) rotateX(66deg) translateY(26px)",
          transformOrigin: "center top",
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0) 100%)",
        }}
      />
      <motion.div
        className={`pointer-events-none absolute top-[10rem] ${isRTL ? "right-6" : "left-6"} h-24 w-24 rounded-3xl ${isDark ? "bg-cyan-500/15" : "bg-cyan-300/35"}`}
        animate={{ y: [0, -10, 0], rotate: [0, 8, -6, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={`pointer-events-none absolute top-[13rem] ${isRTL ? "left-8" : "right-8"} h-20 w-20 rounded-[1.75rem] ${isDark ? "bg-fuchsia-500/15" : "bg-fuchsia-300/32"}`}
        animate={{ y: [0, 12, 0], rotate: [0, -10, 8, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />


      {/* ─── Sticky Header ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-indigo-700 via-blue-700 to-cyan-700 shadow-lg">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Avatar + Greeting */}
            <div className="flex items-center gap-3">
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="cursor-pointer"
                onClick={() => navigate("/child-profile")}
                role="button"
                tabIndex={0}
                aria-label="Go to profile"
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate("/child-profile"); } }}
              >
                <Avatar className={`w-11 h-11 border-2 ${isDark ? "border-purple-300" : "border-white/70"} shadow-lg ring-2 ring-yellow-400/50`}>
                  <AvatarImage src={childInfo?.avatarUrl || undefined} className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white text-base font-bold">
                    {childInfo?.name?.charAt(0) || "؟"}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white leading-tight">
                  {t("childGames.greeting", { name: childInfo?.name || "" })} 👋
                </h1>
                <div className="flex items-center gap-1.5">
                  <motion.div
                    className="flex items-center gap-1 bg-yellow-500/30 px-2 py-0.5 rounded-full"
                    whileHover={{ scale: 1.05 }}
                  >
                    <Star className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                    <span className="text-xs font-bold text-yellow-100">{childInfo?.totalPoints || 0}</span>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Right: Compact Actions */}
            <div className="flex items-center gap-1.5">
              <LanguageSelector />
              <ChildNotificationBell />
              <PWAInstallButton
                variant="outline"
                size="sm"
                showText={false}
                className="bg-white/15 hover:bg-white/25 text-white border-0 rounded-xl px-2.5 py-2.5 min-h-[40px] min-w-[40px]"
              />
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => navigate("/child-settings")}
                className="p-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl transition-all min-h-[40px] min-w-[40px] flex items-center justify-center"
                data-testid="button-child-settings"
                aria-label={t("childNav.settings")}
              >
                <Settings className="w-4.5 h-4.5" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => setShowLogoutConfirm(true)}
                className="p-2.5 bg-red-500/20 hover:bg-red-500/40 text-red-200 rounded-xl transition-all min-h-[40px] min-w-[40px] flex items-center justify-center"
                data-testid="button-child-logout"
                disabled={isLoggingOut}
                aria-label={t("logoutTitle")}
              >
                <LogOut className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </div>
        {/* Wave separator */}
        <div className="w-full overflow-hidden leading-[0] -mb-[1px]">
          <svg viewBox="0 0 1200 40" preserveAspectRatio="none" className="w-full h-3">
            <path d="M0,20 C200,35 400,5 600,20 C800,35 1000,5 1200,20 L1200,40 L0,40 Z" fill={isDark ? "rgb(30, 15, 60)" : "rgb(147, 114, 210)"} fillOpacity="0.3" />
          </svg>
        </div>
      </header>

      {visibleGameHints.length > 0 && (
        <section className="max-w-6xl mx-auto px-3 sm:px-4 mt-3 mb-2 grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 relative z-20">
          {visibleGameHints.map((hint) => (
            <div key={hint.id} className={`${isDark ? "bg-slate-900/85 border-slate-700/70" : "bg-white/85 border-indigo-100"} border rounded-2xl p-3 sm:p-4 backdrop-blur-sm relative`}>
              <button
                type="button"
                className="absolute top-2 end-2 h-6 w-6 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center"
                onClick={() => dismissGameHint(hint.id)}
                aria-label={hint.title}
              >
                <X className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <div className="flex items-start gap-2 sm:gap-3 pe-6">
                <span className="text-lg sm:text-xl leading-none">{hint.icon}</span>
                <div>
                  <p className={`text-sm font-bold ${isDark ? "text-gray-100" : "text-gray-900"}`}>{hint.title}</p>
                  <p className={`text-xs sm:text-sm mt-1 leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>{hint.description}</p>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-2xl p-6 max-w-sm w-full text-center`}
            >
              <LogOut className={`w-16 h-16 mx-auto mb-4 ${isDark ? "text-red-400" : "text-red-500"}`} />
              <h2 className={`text-xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                {t("logoutTitle")}
              </h2>
              <p className={`mb-6 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                {t("logoutConfirmMessage")}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className={`flex-1 px-4 py-3 ${isDark ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-200 hover:bg-gray-300"} font-bold rounded-xl transition-all`}
                  data-testid="button-cancel-logout"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={() => logout()}
                  disabled={isLoggingOut}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                  data-testid="button-confirm-logout"
                >
                  {isLoggingOut ? t("loggingOutProgress") : t("confirmLogout")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Growth Tree Section */}
      <div className="max-w-6xl mx-auto mb-6 relative z-10">
        <Suspense
          fallback={
            <div className={`${isDark ? "bg-gray-900/55 border border-gray-700/60" : "bg-white/35 border border-white/45"} rounded-2xl h-44 animate-pulse`} />
          }
        >
          <GrowthTree />
        </Suspense>
      </div>

      <div className="h-4" />

      {isLoading ? (
        <div className="flex flex-col justify-center items-center h-40 gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="w-10 h-10 text-white/70" />
          </motion.div>
          <p className="text-white/60 text-sm animate-pulse">{isRTL ? 'جاري تحميل الألعاب...' : 'Loading games...'}</p>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-3 sm:px-4 pb-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 relative z-10">
          {filteredGames.map((game, index) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: index * 0.06, type: 'spring', stiffness: 200 }}
              whileHover={{ y: -6, scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handlePlayGame(game)}
              onMouseEnter={() => prewarmGameConnection(game.embedUrl)}
              className={`${isDark ? "bg-gray-900/95 border border-gray-600/70" : "bg-white/98 border border-indigo-100"} rounded-2xl overflow-hidden shadow-2xl hover:shadow-[0_20px_40px_rgba(0,0,0,0.25)] cursor-pointer backdrop-blur-sm group`}
              data-testid={`game-card-${game.id}`}
            >
              <div className={`aspect-[4/3] ${isDark ? "bg-slate-800" : "bg-indigo-100"} flex items-center justify-center relative overflow-hidden ring-1 ring-black/10`}>
                {(getGamePreviewMedia(game.embedUrl)?.gif || game.thumbnailUrl || getGamePreviewMedia(game.embedUrl)?.poster) ? (
                  <img
                    src={getGamePreviewMedia(game.embedUrl)?.gif || game.thumbnailUrl || getGamePreviewMedia(game.embedUrl)?.poster || ""}
                    alt={game.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    style={thumbnailVisualStyle}
                    loading="lazy"
                    onError={(e) => {
                      const media = getGamePreviewMedia(game.embedUrl);
                      if (!media?.poster) return;
                      const target = e.currentTarget;
                      if (!target.src.endsWith(media.poster)) {
                        target.src = media.poster;
                      }
                    }}
                  />
                ) : game.embedUrl === "/games/memory-match.html" ? (
                  <div className={`w-full h-full ${getFallbackPreviewClasses(game.embedUrl)} flex items-center justify-center`}>
                    <motion.span className="text-5xl drop-shadow-lg" animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity }}>🧠</motion.span>
                  </div>
                ) : game.embedUrl === "/games/math-challenge.html" ? (
                  <div className={`w-full h-full ${getFallbackPreviewClasses(game.embedUrl)} flex items-center justify-center`}>
                    <motion.span className="text-5xl drop-shadow-lg" animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}>🔢</motion.span>
                  </div>
                ) : game.embedUrl === "/games/gem-kingdom.html" ? (
                  <div className={`w-full h-full ${getFallbackPreviewClasses(game.embedUrl)} flex items-center justify-center`}>
                    <motion.span className="text-5xl drop-shadow-lg" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }}>💎</motion.span>
                  </div>
                ) : (
                  <div className={`w-full h-full ${getFallbackPreviewClasses(game.embedUrl)} flex items-center justify-center`}>
                    <Gamepad2 className="w-12 h-12 text-white" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/25 to-transparent" />
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="inline-block max-w-full rounded-lg bg-black/65 px-2 py-1">
                    <p className="truncate text-[11px] font-extrabold tracking-wide text-white">
                      {game.title}
                    </p>
                  </div>
                </div>
                {/* Points Badge */}
                <motion.div
                  className="absolute top-2 ltr:left-2 rtl:right-2 bg-yellow-500 text-white px-2.5 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1 shadow-lg border border-yellow-300/80"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <Star className="w-3 h-3 fill-white" />
                  +{game.pointsPerPlay}
                </motion.div>
                {getGamePreviewMedia(game.embedUrl)?.gif && (
                  <div className="absolute top-2 ltr:right-2 rtl:left-2 bg-black/55 text-white px-2 py-1 rounded-lg text-[10px] font-black tracking-wide border border-white/30 shadow-sm">
                    🎞️
                  </div>
                )}
                {/* Play overlay on hover */}
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/35 transition-all duration-300 flex items-center justify-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  >
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xl border-2 border-purple-200">
                      <Play className="w-6 h-6 text-purple-600 fill-purple-600 ml-0.5" />
                    </div>
                  </motion.div>
                </div>
              </div>
              <div className="p-3.5">
                <h3 className={`font-extrabold text-sm mb-1 truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                  {game.title}
                </h3>
                {game.description && (
                  <p className={`text-xs mb-2.5 line-clamp-2 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                    {game.description}
                  </p>
                )}
                <div
                  className="w-full px-3 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-md border border-indigo-300/60 group-hover:from-blue-700 group-hover:to-indigo-700 transition-all"
                >
                  <Play className="w-3.5 h-3.5" />
                  {t("playNow")}
                </div>
              </div>
            </motion.div>
          ))}

          {filteredGames.length === 0 && (
            <div className="col-span-full text-center py-16">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Gamepad2 className="w-20 h-20 mx-auto mb-4 text-white/40" />
              </motion.div>
              <p className="text-white text-xl font-bold mb-1">{t("noGamesAvailable")}</p>
              <p className="text-white/60 text-sm">{t("gamesComingSoon")}</p>
            </div>
          )}
        </div>
      )}

      {selectedGame && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-[2px] flex flex-col z-[80]">
          <div className={`flex items-center justify-between px-3 sm:px-4 pt-[calc(0.4rem+env(safe-area-inset-top,0px))] pb-2 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border-b shrink-0`}>
            <h3 className={`text-lg font-bold truncate ${isDark ? "text-white" : "text-gray-800"}`}>
              {selectedGame.title}
            </h3>
            <div className="flex items-center gap-3 shrink-0">
              <span className="px-3 py-1 bg-yellow-500 text-white rounded-full text-sm font-bold flex items-center gap-1">
                <Star className="w-4 h-4" />
                +{selectedGame.pointsPerPlay} {t("pointsEarned")}
              </span>
              <button
                onClick={() => setUltraClarity((prev) => !prev)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${ultraClarity ? "bg-cyan-500 text-white border-cyan-300" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600"}`}
                data-testid="button-ultra-clarity"
                title={isRTL ? "وضع الوضوح الفائق" : "Ultra Clarity Mode"}
              >
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  {isRTL ? "وضوح فائق" : "Ultra Clarity"}
                  {ultraClarity ? " ON" : " OFF"}
                </span>
              </button>
              <button
                onClick={() => { setSelectedGame(null); setGameResult(null); setMutationError(null); }}
                className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all"
                data-testid="button-close-game"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          <div className="flex-1 bg-black relative min-h-0">
            <DynamicGameIframe
              ref={dynamicGameFrameRef}
              src={buildGameSrc(selectedGame.embedUrl, i18n.language)}
              title={selectedGame.title}
              className="relative w-full h-full min-h-0"
              iframeClassName="w-full h-full border-0"
              loadingLabel={t("childGames.loadingGame")}
              fallbackLabel={t("childGames.errorTryAgain")}
              retryLabel={isRTL ? "إعادة المحاولة" : "Retry"}
              loadTimeoutMs={20000}
              sandbox="allow-scripts allow-same-origin allow-popups"
              allowedDomains={gameIframePolicy?.allowedDomains || []}
              waitForReadyMessage={!!gameIframePolicy?.handshakeRequired}
              readyMessageType="GAME_READY"
              onIframeRef={(iframe) => {
                gameIframeRef.current = iframe;
              }}
              onLoadingChange={(loading) => {
                setIframeLoading(loading);
              }}
              onLoad={() => {
                setIframeLoading(false);
                applyGameClarityEnhancements();
              }}
              onError={(reason) => {
                setIframeLoading(false);
                if (reason === "domain-blocked" || reason === "domain-circuit-open") {
                  setMutationError(isRTL ? "مصدر اللعبة غير مسموح أو متوقف مؤقتًا" : "Game host is blocked or temporarily unavailable");
                } else if (reason === "load-timeout") {
                  setMutationError(isRTL ? "انتهت مهلة تحميل اللعبة" : "Game loading timed out");
                } else {
                  setMutationError(t("childGames.errorTryAgain"));
                }
              }}
            />
          </div>
          <div className={`px-3 sm:px-4 pt-2 pb-[calc(0.85rem+env(safe-area-inset-bottom,0px))] flex flex-col items-center gap-2 shrink-0 ${isDark ? "bg-gray-800" : "bg-white"}`}>
            {mutationError && (
              <div className="w-full px-4 py-2 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl text-center">
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">{mutationError}</p>
              </div>
            )}
            {isGemGameOpen && gemTelemetryInsights && (
              <div className={`w-full px-3 py-2 rounded-xl border ${isDark ? "bg-gray-900/70 border-gray-700" : "bg-slate-50 border-slate-200"}`}>
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-bold ${isDark ? "text-cyan-300" : "text-cyan-700"}`}>
                    {isRTL ? "Gem Insights (جلسة حالية)" : "Gem Insights (Current Session)"}
                  </p>
                  <span className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    {isRTL ? `احداث: ${gemTelemetryInsights.sampleSize}` : `events: ${gemTelemetryInsights.sampleSize}`}
                  </span>
                  <button
                    onClick={() => setInsightsCollapsed((prev) => !prev)}
                    className={`text-[11px] px-2 py-0.5 rounded-full border ${isDark ? "bg-gray-700 text-cyan-300 border-gray-600" : "bg-cyan-100 text-cyan-700 border-cyan-200"}`}
                  >
                    {insightsCollapsed ? (isRTL ? "▼ عرض" : "▼ Show") : (isRTL ? "▲ إخفاء" : "▲ Hide")}
                  </button>
                </div>
                {!insightsCollapsed && (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mt-2">
                      <div className={`rounded-lg px-2 py-1.5 ${isDark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-700"}`}>
                        {isRTL ? "بدء المراحل" : "Levels Started"}: {gemTelemetryInsights.levelStarted}
                      </div>
                      <div className={`rounded-lg px-2 py-1.5 ${isDark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-700"}`}>
                        {isRTL ? "اكتمال المراحل" : "Levels Completed"}: {gemTelemetryInsights.levelCompleted}
                      </div>
                      <div className={`rounded-lg px-2 py-1.5 ${isDark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-700"}`}>
                        {isRTL ? "معدل الاكمال" : "Completion Rate"}: {gemTelemetryInsights.completionRate ?? "-"}{gemTelemetryInsights.completionRate !== null ? "%" : ""}
                      </div>
                      <div className={`rounded-lg px-2 py-1.5 ${isDark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-700"}`}>
                        {isRTL ? "معدل الفوز" : "Win Rate"}: {gemTelemetryInsights.winRate ?? "-"}{gemTelemetryInsights.winRate !== null ? "%" : ""}
                      </div>
                      <div className={`rounded-lg px-2 py-1.5 ${isDark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-700"}`}>
                        {isRTL ? "دروس بدأت/اكتملت" : "Tutorial Start/Done"}: {gemTelemetryInsights.tutorialStarted}/{gemTelemetryInsights.tutorialCompleted}
                      </div>
                      <div className={`rounded-lg px-2 py-1.5 ${isDark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-700"}`}>
                        {isRTL ? "القصة عرض/إغلاق" : "Story Show/Close"}: {gemTelemetryInsights.storyShown}/{gemTelemetryInsights.storyClosed}
                      </div>
                      <div className={`rounded-lg px-2 py-1.5 ${isDark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-700"}`}>
                        {isRTL ? "زمن المرحلة المتوسط" : "Avg Level Time"}: {gemTelemetryInsights.avgLevelSec ?? "-"}{gemTelemetryInsights.avgLevelSec !== null ? (isRTL ? "ث" : "s") : ""}
                      </div>
                      <div className={`rounded-lg px-2 py-1.5 ${gemTelemetryInsights.moduleLoadFailed > 0 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : isDark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-700"}`}>
                        {isRTL ? "اخفاق تحميل الوحدات" : "Module Load Fail"}: {gemTelemetryInsights.moduleLoadFailed}
                      </div>
                      <div className={`rounded-lg px-2 py-1.5 ${isDark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-700"}`}>
                        {isRTL ? "معدل التخلي" : "Abandon Rate"}: {gemTelemetryInsights.abandonRate ?? "-"}{gemTelemetryInsights.abandonRate !== null ? "%" : ""}
                      </div>
                      <div className={`rounded-lg px-2 py-1.5 ${isDark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-700"}`}>
                        {isRTL ? "بدء اللعبة" : "Startup"}: {gemTelemetryInsights.startupMs ?? "-"}{gemTelemetryInsights.startupMs !== null ? "ms" : ""}
                      </div>
                      <div className={`rounded-lg px-2 py-1.5 ${isDark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-700"}`}>
                        {isRTL ? "متوسط تباطؤ القلب" : "Avg Heartbeat Drops"}: {gemTelemetryInsights.avgFrameDropsWindow ?? "-"}
                      </div>
                      <div className={`rounded-lg px-2 py-1.5 ${isDark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-700"}`}>
                        {isRTL ? "متوسط الإطارات الطويلة" : "Avg Heartbeat Long"}: {gemTelemetryInsights.avgLongFramesWindow ?? "-"}
                      </div>
                      <div className={`rounded-lg px-2 py-1.5 ${isDark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-700"}`}>
                        {isRTL ? "سقوط الإطارات/مستوى" : "Drops Per Level"}: {gemTelemetryInsights.avgLevelFrameDrops ?? "-"}
                      </div>
                      <div className={`rounded-lg px-2 py-1.5 ${isDark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-700"}`}>
                        {isRTL ? "إطارات طويلة/مستوى" : "Long Frames/Level"}: {gemTelemetryInsights.avgLevelLongFrames ?? "-"}
                      </div>
                      <div className={`rounded-lg px-2 py-1.5 ${gemTelemetryInsights.qosReducedEffectsCount > 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" : isDark ? "bg-gray-800 text-gray-200" : "bg-white text-gray-700"}`}>
                        {isRTL ? "تخفيض التأثيرات" : "Effects Reduced"}: {gemTelemetryInsights.qosReducedEffectsCount}
                      </div>
                    </div>

                    {gemSessionHealth && (
                      <div className={`mt-3 rounded-lg border px-2.5 py-2 ${isDark ? "border-cyan-700/50 bg-cyan-900/20" : "border-cyan-200 bg-cyan-50"}`}>
                        <div className="mb-2">
                          <p className={`text-[11px] font-semibold mb-1 ${isDark ? "text-cyan-200" : "text-cyan-800"}`}>
                            {isRTL ? "تطبيق نمط ضبط مباشر" : "Apply Live Tuning Profile"}
                          </p>
                          <p className={`text-[10px] mb-1 ${isDark ? "text-cyan-300/80" : "text-cyan-700/80"}`}>
                            {gemAdaptiveBaseline.enabled
                              ? (isRTL
                                ? `Adaptive Thresholds ON (${gemAdaptiveBaseline.sampleCount} جلسات)`
                                : `Adaptive Thresholds ON (${gemAdaptiveBaseline.sampleCount} sessions)`)
                              : (isRTL ? "Adaptive Thresholds OFF (بيانات غير كافية)" : "Adaptive Thresholds OFF (insufficient history)")}
                          </p>
                          {gemAdaptiveBaseline.enabled && (
                            <p className={`text-[10px] mb-1 ${isDark ? "text-cyan-300/70" : "text-cyan-700/70"}`}>
                              {isRTL
                                ? `QoS حدود: Drops>${gemAdaptiveBaseline.frameDropsWarn} | Long>${gemAdaptiveBaseline.longFramesWarn}`
                                : `QoS limits: Drops>${gemAdaptiveBaseline.frameDropsWarn} | Long>${gemAdaptiveBaseline.longFramesWarn}`}
                            </p>
                          )}
                          <p className={`text-[10px] mb-1 ${isDark ? "text-cyan-300/65" : "text-cyan-700/65"}`}>
                            {isRTL
                              ? `Adaptive Weights: ${gemAdaptiveWeights.enabled ? "ON" : "OFF"}`
                              : `Adaptive Weights: ${gemAdaptiveWeights.enabled ? "ON" : "OFF"}`}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => setGemTuneProfile("balanced")}
                              className={`text-[11px] px-2 py-1 rounded-full border ${gemTuneProfile === "balanced" ? "bg-indigo-500 text-white border-indigo-300" : "bg-white/80 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600"}`}
                            >
                              {isRTL ? "متوازن" : "Balanced"}
                            </button>
                            <button
                              onClick={() => setGemTuneProfile("performance")}
                              className={`text-[11px] px-2 py-1 rounded-full border ${gemTuneProfile === "performance" ? "bg-amber-500 text-white border-amber-300" : "bg-white/80 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600"}`}
                            >
                              {isRTL ? "أداء" : "Performance"}
                            </button>
                            <button
                              onClick={() => setGemTuneProfile("easy")}
                              className={`text-[11px] px-2 py-1 rounded-full border ${gemTuneProfile === "easy" ? "bg-emerald-500 text-white border-emerald-300" : "bg-white/80 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600"}`}
                            >
                              {isRTL ? "أسهل" : "Easy"}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 mb-2">
                          <p className={`text-xs font-bold ${isDark ? "text-cyan-200" : "text-cyan-800"}`}>
                            {isRTL ? "Session Health" : "Session Health"}
                          </p>
                          <span
                            className={`text-xs font-bold px-2 py-1 rounded-full ${gemSessionHealth.qualityScore >= 80 ? "bg-emerald-500 text-white" : gemSessionHealth.qualityScore >= 60 ? "bg-amber-500 text-white" : "bg-rose-500 text-white"}`}
                          >
                            {isRTL ? `جودة ${gemSessionHealth.qualityScore}/100` : `Quality ${gemSessionHealth.qualityScore}/100`}
                          </span>
                        </div>

                        {gemSessionHealth.alerts.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {gemSessionHealth.alerts.map((alert, idx) => (
                              <span
                                key={`${alert.label}-${idx}`}
                                className={`text-[11px] px-2 py-1 rounded-full border ${alert.severity === "critical" ? "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700" : alert.severity === "warning" ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700" : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600"}`}
                              >
                                {alert.label}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="space-y-1">
                          {gemSessionHealth.recommendations.slice(0, 3).map((rec, idx) => (
                            <p key={`${rec}-${idx}`} className={`text-[11px] ${isDark ? "text-cyan-100" : "text-cyan-900"}`}>
                              {`${idx + 1}. ${rec}`}
                            </p>
                          ))}
                        </div>

                        {gemSessionHealth.priorityInsight && (
                          <div className={`mt-2 rounded-md border px-2 py-1.5 ${isDark ? "border-amber-700/40 bg-amber-950/25" : "border-amber-200 bg-amber-50/80"}`}>
                            <p className={`text-[10px] font-semibold ${isDark ? "text-amber-200" : "text-amber-800"}`}>
                              {isRTL ? "أولوية التحسين" : "Priority Insight"}
                            </p>
                            <p className={`text-[10px] ${isDark ? "text-amber-100" : "text-amber-900"}`}>
                              {gemSessionHealth.priorityInsight}
                            </p>
                            {gemSessionHealth.priorityInsightMeta && (
                              <p className={`text-[10px] mt-0.5 ${isDark ? "text-amber-200/80" : "text-amber-800/80"}`}>
                                {isRTL
                                  ? `Cooldown: ${Math.round(gemSessionHealth.priorityInsightMeta.cooldownMs / 60000)} دقيقة (${gemSessionHealth.priorityInsightMeta.tune})`
                                  : `Cooldown: ${Math.round(gemSessionHealth.priorityInsightMeta.cooldownMs / 60000)} min (${gemSessionHealth.priorityInsightMeta.tune})`}
                              </p>
                            )}
                          </div>
                        )}

                        {gemSessionHealth.topPenalties.length > 0 && (
                          <div className={`mt-2 rounded-md border px-2 py-1.5 ${isDark ? "border-cyan-700/40 bg-cyan-950/30" : "border-cyan-200 bg-white/70"}`}>
                            <p className={`text-[11px] font-semibold mb-1 ${isDark ? "text-cyan-200" : "text-cyan-800"}`}>
                              {isRTL ? "أكبر أسباب خفض الدرجة" : "Top Score Deductions"}
                            </p>
                            <div className="space-y-1">
                              {gemSessionHealth.topPenalties.map((item, idx) => (
                                <p key={`${item.key}-${idx}`} className={`text-[10px] ${isDark ? "text-cyan-100" : "text-cyan-900"}`}>
                                  {`${idx + 1}. ${item.label}: -${item.applied} (w=${item.weight.toFixed(2)}, v=${item.value})`}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        {gemPenaltyTrend.length > 0 && (
                          <div className={`mt-2 rounded-md border px-2 py-1.5 ${isDark ? "border-violet-700/40 bg-violet-950/25" : "border-violet-200 bg-violet-50/70"}`}>
                            <p className={`text-[11px] font-semibold mb-1 ${isDark ? "text-violet-200" : "text-violet-800"}`}>
                              {isRTL ? "الأسباب المتكررة (آخر 10 جلسات)" : "Recurring Causes (Last 10 Sessions)"}
                            </p>
                            <div className="space-y-1">
                              {gemPenaltyTrend.map((item, idx) => (
                                <p key={`${item.key}-${idx}`} className={`text-[10px] ${isDark ? "text-violet-100" : "text-violet-900"}`}>
                                  {`${idx + 1}. ${item.label}: ${item.count}x`}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        {gemHealthTrend.length > 1 && (
                          <div className="mt-2">
                            <p className={`text-[11px] font-semibold mb-1 ${isDark ? "text-cyan-200" : "text-cyan-800"}`}>
                              {isRTL ? "اتجاه الجودة عبر الجلسات" : "Quality Trend Across Sessions"}
                            </p>
                            <div className="flex items-end gap-1 h-14 rounded-md px-2 py-1 bg-black/10 dark:bg-white/5">
                              {gemHealthTrend.map((point, idx) => {
                                const h = Math.max(10, Math.min(52, Math.round((point.qualityScore / 100) * 52)));
                                const tone = point.qualityScore >= 80
                                  ? "bg-emerald-400"
                                  : point.qualityScore >= 60
                                    ? "bg-amber-400"
                                    : "bg-rose-400";
                                return (
                                  <div
                                    key={`${point.ts}-${idx}`}
                                    className={`w-3 rounded-sm ${tone}`}
                                    style={{ height: `${h}px` }}
                                    title={`${isRTL ? "جودة" : "Quality"}: ${point.qualityScore} | ${point.tune}`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            {gameResult ? (
              <>
                <p className={`text-sm font-semibold ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                  🎯 {t("childGames.yourScore", { score: gameResult.score, total: gameResult.total })}
                </p>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <button
                    onClick={handleCompleteGame}
                    disabled={completeGameMutation.isPending}
                    className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl flex items-center gap-2 disabled:opacity-50 transition-all"
                    data-testid="button-complete-game"
                  >
                    {completeGameMutation.isPending ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <Trophy className="w-5 h-5" />
                        {t("finishedGame")}
                      </>
                    )}
                  </button>
                </div>
                {/* Social sharing buttons */}
                {gameShared && sharedGameData && (
                  <div className="w-full mt-2">
                    <p className={`text-xs text-center mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      <Share2 className="w-3.5 h-3.5 inline-block ltr:mr-1 rtl:ml-1" />
                      {t("childGames.shareOnSocial")}
                    </p>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      {/* WhatsApp */}
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`🎮 ${sharedGameData.gameName} — ${t("childGames.scored")} ${sharedGameData.score} ${"⭐".repeat(sharedGameData.stars)} ${window.location.origin}/child-games`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 0C5.373 0 0 5.373 0 12c0 2.12.553 4.11 1.518 5.84L0 24l6.336-1.652A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.892 0-3.684-.516-5.253-1.485l-.377-.224-3.91 1.02 1.04-3.794-.246-.392A9.778 9.778 0 012.182 12c0-5.423 4.395-9.818 9.818-9.818S21.818 6.577 21.818 12s-4.395 9.818-9.818 9.818z" /></svg>
                        WhatsApp
                      </a>
                      {/* Facebook */}
                      <a
                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}&quote=${encodeURIComponent(`🎮 ${sharedGameData.gameName} — ${sharedGameData.score} ${"⭐".repeat(sharedGameData.stars)}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                        Facebook
                      </a>
                      {/* Twitter/X */}
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🎮 ${sharedGameData.gameName} — ${t("childGames.scored")} ${sharedGameData.score} ${"⭐".repeat(sharedGameData.stars)}`)}&url=${encodeURIComponent(window.location.origin)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                        X
                      </a>
                      {/* Copy Link */}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/child-games`);
                          toast({
                            title: isRTL ? '📋 تم نسخ الرابط!' : '📋 Link copied!',
                          });
                        }}
                        className={`px-3 py-2 ${isDark ? "bg-gray-600 hover:bg-gray-500" : "bg-gray-500 hover:bg-gray-600"} text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors`}
                      >
                        <Link2 className="w-4 h-4" />
                        {isRTL ? 'نسخ' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className={`text-sm animate-pulse ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                🎮 {t("childGames.completeForPoints")}
              </p>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showReward && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: "spring", damping: 15 }}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-8 rounded-3xl shadow-2xl"
            >
              <div className="text-center">
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: 2 }}
                >
                  <Trophy className="w-16 h-16 mx-auto mb-4" />
                </motion.div>
                <h2 className="text-3xl font-bold mb-2">{t("wellDone")}</h2>
                <motion.p
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-xl"
                >
                  {t("earnedPoints", { points: showReward.points })}
                </motion.p>
                <p className="text-lg opacity-90">{t("totalPoints", { total: showReward.total })}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      {!selectedGame && <ChildBottomNav activeTab="games" />}
    </div>
  );
};
