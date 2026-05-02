import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";
import { ArrowRight, ArrowLeft, Star } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ChildNotificationBell } from "@/components/ChildNotificationBell";
import { ChildBottomNav } from "@/components/ChildBottomNav";
import { motion } from "framer-motion";

// ─── Kid-friendly floating decorations ────────────────────────────────
function FloatingDecorations({ colors }: { colors: string[] }) {
  const shapes = [
    { emoji: "⭐", size: "w-6 h-6", pos: "top-20 left-[8%]", delay: 0, duration: 6 },
    { emoji: "✨", size: "w-5 h-5", pos: "top-32 right-[12%]", delay: 1.5, duration: 5 },
    { emoji: "💫", size: "w-7 h-7", pos: "top-48 left-[85%]", delay: 3, duration: 7 },
    { emoji: "🌟", size: "w-5 h-5", pos: "top-64 left-[5%]", delay: 2, duration: 4.5 },
    { emoji: "⭐", size: "w-4 h-4", pos: "top-80 right-[8%]", delay: 4, duration: 6.5 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {shapes.map((s, i) => (
        <motion.div
          key={i}
          className={`absolute ${s.pos} ${s.size} opacity-20 select-none`}
          animate={{
            y: [0, -15, 0, 10, 0],
            rotate: [0, 10, -10, 5, 0],
            scale: [1, 1.1, 0.95, 1.05, 1],
          }}
          transition={{
            duration: s.duration,
            repeat: Infinity,
            delay: s.delay,
            ease: "easeInOut",
          }}
        >
          <span className="text-2xl">{s.emoji}</span>
        </motion.div>
      ))}
      {/* Soft gradient blobs */}
      <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full ${colors[0] || "bg-purple-500/10"} blur-3xl`} />
      <div className={`absolute -bottom-20 -left-20 w-48 h-48 rounded-full ${colors[1] || "bg-pink-500/10"} blur-3xl`} />
    </div>
  );
}

// ─── Playful wave separator ────────────────────────────────────────────
function WaveSeparator({ isDark }: { isDark: boolean }) {
  return (
    <div className="w-full overflow-hidden leading-[0] -mt-1">
      <svg
        viewBox="0 0 1200 60"
        preserveAspectRatio="none"
        className="w-full h-4"
      >
        <path
          d="M0,30 C150,50 350,0 600,30 C850,60 1050,10 1200,30 L1200,60 L0,60 Z"
          fill={isDark ? "rgb(17, 24, 39)" : "rgb(249, 250, 251)"}
        />
      </svg>
    </div>
  );
}

// ─── Types ──────────────────────────────────────────────────────────────
interface ChildPageLayoutProps {
  children: ReactNode;
  /** Page title */
  title: string;
  /** Title emoji/icon shown before text */
  titleEmoji?: string;
  /** Header gradient — pick from theme presets */
  headerGradient?: "purple" | "orange" | "blue" | "green" | "pink" | "indigo";
  /** Show back button */
  showBack?: boolean;
  /** Show points badge */
  showPoints?: boolean;
  /** Show bottom navigation */
  showBottomNav?: boolean;
  /** Show decorations (floating stars etc) */
  showDecorations?: boolean;
  /** Extra header content (right side) */
  headerExtra?: ReactNode;
  /** Override back navigation target */
  backTo?: string;
  /** Active bottom nav tab */
  activeTab?: string;
}

// ─── Header gradient presets ────────────────────────────────────────────
const gradientPresets: Record<string, { header: string; bg: string; bgDark: string; blobs: string[] }> = {
  purple: {
    header: "from-purple-500 via-violet-500 to-indigo-500",
    bg: "from-violet-50 via-purple-50 to-fuchsia-50",
    bgDark: "from-gray-900 via-purple-950/30 to-gray-900",
    blobs: ["bg-purple-400/10", "bg-fuchsia-400/10"],
  },
  orange: {
    header: "from-orange-400 via-amber-500 to-yellow-500",
    bg: "from-amber-50 via-orange-50 to-yellow-50",
    bgDark: "from-gray-900 via-amber-950/20 to-gray-900",
    blobs: ["bg-orange-400/10", "bg-yellow-400/10"],
  },
  blue: {
    header: "from-blue-500 via-cyan-500 to-teal-400",
    bg: "from-blue-50 via-cyan-50 to-teal-50",
    bgDark: "from-gray-900 via-blue-950/20 to-gray-900",
    blobs: ["bg-blue-400/10", "bg-cyan-400/10"],
  },
  green: {
    header: "from-emerald-500 via-green-500 to-teal-500",
    bg: "from-emerald-50 via-green-50 to-teal-50",
    bgDark: "from-gray-900 via-green-950/20 to-gray-900",
    blobs: ["bg-green-400/10", "bg-emerald-400/10"],
  },
  pink: {
    header: "from-pink-500 via-rose-500 to-red-400",
    bg: "from-pink-50 via-rose-50 to-red-50",
    bgDark: "from-gray-900 via-pink-950/20 to-gray-900",
    blobs: ["bg-pink-400/10", "bg-rose-400/10"],
  },
  indigo: {
    header: "from-indigo-500 via-purple-500 to-violet-500",
    bg: "from-indigo-50 via-purple-50 to-violet-50",
    bgDark: "from-gray-900 via-indigo-950/20 to-gray-900",
    blobs: ["bg-indigo-400/10", "bg-violet-400/10"],
  },
};

export function ChildPageLayout({
  children,
  title,
  titleEmoji,
  headerGradient = "purple",
  showBack = true,
  showPoints = true,
  showBottomNav = true,
  showDecorations = true,
  headerExtra,
  backTo,
  activeTab,
}: ChildPageLayoutProps) {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const isRTL = i18n.language === "ar";
  const token = localStorage.getItem("childToken");

  const { data: childInfo } = useQuery({
    queryKey: ["child-info"],
    queryFn: async () => {
      const res = await fetch("/api/child/info", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      return json?.data || json;
    },
    enabled: !!token,
  });

  const preset = gradientPresets[headerGradient] || gradientPresets.purple;
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/child-games");
    }
  };

  return (
    <div
      className={`min-h-screen relative ${isDark ? `bg-gradient-to-br ${preset.bgDark}` : `bg-gradient-to-br ${preset.bg}`}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Floating decorations */}
      {showDecorations && <FloatingDecorations colors={preset.blobs} />}

      {/* ─── Sticky Header ─────────────────────────────────── */}
      <header className={`sticky top-0 z-50 bg-gradient-to-r ${preset.header} shadow-lg`}>
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Back + Title */}
            <div className="flex items-center gap-2.5">
              {showBack && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleBack}
                  className="p-2.5 hover:bg-white/15 rounded-2xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label={t("common.back")}
                >
                  <BackArrow className="w-5 h-5 text-white" />
                </motion.button>
              )}
              <div className="flex items-center gap-2">
                {titleEmoji && (
                  <span className="text-xl">{titleEmoji}</span>
                )}
                <h1 className="text-lg font-bold text-white truncate max-w-[180px] sm:max-w-none">
                  {title}
                </h1>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {headerExtra}
              <LanguageSelector />
              <ChildNotificationBell />
              {showPoints && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full"
                >
                  <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                  <span className="text-sm font-bold text-white">
                    {childInfo?.totalPoints || 0}
                  </span>
                </motion.div>
              )}
            </div>
          </div>
        </div>
        <WaveSeparator isDark={isDark} />
      </header>

      {/* ─── Main Content ──────────────────────────────────── */}
      <main className={`relative z-10 max-w-3xl mx-auto px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] ${showBottomNav ? "pb-[calc(8.25rem+env(safe-area-inset-bottom,0px))]" : "pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"}`}>
        {children}
      </main>

      {/* ─── Bottom Navigation ─────────────────────────────── */}
      {showBottomNav && <ChildBottomNav activeTab={activeTab} />}
    </div>
  );
}

// ─── Reusable animated section wrapper ──────────────────────────────────
export function ChildSection({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Kid-friendly card wrapper ──────────────────────────────────────────
export function KidCard({
  children,
  className = "",
  onClick,
  hoverable = true,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}) {
  const { isDark } = useTheme();
  const Component = onClick ? motion.button : motion.div;

  return (
    <Component
      whileHover={hoverable ? { y: -3, scale: 1.01 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={`w-full text-start rounded-2xl border-0 shadow-lg overflow-hidden transition-shadow
        ${isDark ? "bg-gray-800/90 hover:shadow-purple-500/10" : "bg-white hover:shadow-lg"}
        ${onClick ? "cursor-pointer" : ""}
        ${className}`}
    >
      {children}
    </Component>
  );
}

// ─── Kid-friendly empty state ───────────────────────────────────────────
export function KidEmptyState({
  emoji = "🎈",
  title,
  description,
  actionLabel,
  onAction,
}: {
  emoji?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { isDark } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`text-center py-12 px-6 rounded-3xl ${isDark ? "bg-gray-800/50" : "bg-white/60"} backdrop-blur-sm`}
    >
      <motion.span
        className="text-6xl block mb-4"
        animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
      >
        {emoji}
      </motion.span>
      <h3 className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
        {title}
      </h3>
      {description && (
        <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onAction}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-2xl shadow-lg"
        >
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  );
}

// ─── Kid-friendly loading spinner ───────────────────────────────────────
export function KidLoading({ message }: { message?: string }) {
  const { isDark } = useTheme();

  return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? "bg-gray-900" : "bg-gradient-to-br from-purple-50 to-pink-50"}`}>
      <motion.div
        className="flex flex-col items-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-full border-4 border-purple-200 border-t-purple-500"
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex gap-1"
        >
          {["🌟", "⭐", "💫"].map((e, i) => (
            <motion.span
              key={i}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
              className="text-xl"
            >
              {e}
            </motion.span>
          ))}
        </motion.div>
        {message && (
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-purple-400"}`}>
            {message}
          </p>
        )}
      </motion.div>
    </div>
  );
}
