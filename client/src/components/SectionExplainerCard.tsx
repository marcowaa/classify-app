import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface SectionExplainerCardProps {
  id: string;
  icon: string;
  title: string;
  description?: string;
  onDismiss: (id: string) => void;
  onAutoHide?: (id: string) => void;
  onAction?: (id: string) => void;
  isDark?: boolean;
  tone?: "parent" | "child";
  autoHideMs?: number;
}

export function SectionExplainerCard({
  id,
  icon,
  title,
  description,
  onDismiss,
  onAutoHide,
  onAction,
  isDark = false,
  tone = "parent",
  autoHideMs = 1500,
}: SectionExplainerCardProps): JSX.Element | null {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const autoHideTriggeredRef = useRef(false);

  useEffect(() => {
    setIsVisible(true);
    setProgress(100);
    autoHideTriggeredRef.current = false;
  }, [id]);

  useEffect(() => {
    if (autoHideMs <= 0) return;

    let rafId = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const ratio = Math.max(0, 1 - elapsed / autoHideMs);
      setProgress(ratio * 100);

      if (ratio <= 0) {
        if (!autoHideTriggeredRef.current) {
          autoHideTriggeredRef.current = true;
          setIsVisible(false);
          onAutoHide?.(id);
        }
        return;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [autoHideMs, id, onAutoHide]);

  if (!isVisible) {
    return null;
  }

  const parentClasses = isDark
    ? "bg-slate-900/70 border-slate-700/70"
    : "bg-white/80 border-indigo-100";

  const childClasses = isDark
    ? "border-amber-900/40 bg-gradient-to-br from-amber-900/20 to-orange-900/10"
    : "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50";

  const progressTrackClass = isDark ? "bg-white/10" : "bg-black/10";
  const progressBarClass = tone === "child" ? "bg-amber-500" : "bg-indigo-500";

  return (
    <div className={`pointer-events-auto relative overflow-hidden rounded-2xl border p-3 sm:p-4 shadow-lg backdrop-blur-sm ${tone === "child" ? childClasses : parentClasses}`}>
      <button
        type="button"
        className="absolute top-2 end-2 h-6 w-6 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center"
        onClick={() => {
          setIsVisible(false);
          onDismiss(id);
        }}
        aria-label={title}
      >
        <X className="w-3.5 h-3.5 text-gray-500" />
      </button>
      <button
        type="button"
        className="w-full text-start flex items-start gap-2 sm:gap-3 pe-6"
        onClick={() => onAction?.(id)}
      >
        <span className="text-lg sm:text-xl leading-none">{icon}</span>
        <div>
          <p className={`text-sm font-bold ${tone === "child" ? "text-gray-900 dark:text-gray-100" : (isDark ? "text-gray-100" : "text-gray-900")}`}>{title}</p>
          {description && (
            <p className={`text-xs sm:text-sm mt-1 leading-relaxed ${tone === "child" ? "text-gray-600 dark:text-gray-300" : (isDark ? "text-gray-300" : "text-gray-600")}`}>
              {description}
            </p>
          )}
        </div>
      </button>

      <div className={`absolute inset-x-0 bottom-0 h-1 ${progressTrackClass}`}>
        <div
          className={`h-full ${progressBarClass}`}
          style={{ width: `${Math.max(0, progress)}%` }}
        />
      </div>
    </div>
  );
}
