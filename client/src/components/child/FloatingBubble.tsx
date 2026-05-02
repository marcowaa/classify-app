import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18next from "i18next";

interface FloatingBubbleProps {
  pendingCount: number;
  onOpen?: () => void;
  onClose?: () => void;
  position?: "bottom-right" | "bottom-left";
  allowOverlay?: boolean;
}

/**
 * FloatingBubble Component
 * دائرة عائمة (شبيهة بـ Messenger) تعرض عدد الهدايا/المهام المعلقة
 * يمكنها أن تطلب صلاحيات Overlay من النظام
 */
export const FloatingBubble: React.FC<FloatingBubbleProps> = ({
  pendingCount,
  onOpen,
  onClose,
  position = "bottom-right",
  allowOverlay = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOverlayPermission, setHasOverlayPermission] = useState(false);

  useEffect(() => {
    // Check for overlay permission if required
    if (allowOverlay && typeof window !== "undefined") {
      checkOverlayPermission();
    }
  }, [allowOverlay]);

  const checkOverlayPermission = async () => {
    try {
      // في بيئة PWA أو React Native WebView
      if ("permissions" in navigator) {
        const result = await (navigator as any).permissions.query({
          name: "display_over_other_apps",
        });
        setHasOverlayPermission(result.state === "granted");
      }
    } catch (error) {
      console.log("Overlay permission not available");
    }
  };

  const requestOverlayPermission = async () => {
    try {
      if ("permissions" in navigator && "request" in (navigator as any).permissions) {
        const result = await (navigator as any).permissions.request({
          name: "display_over_other_apps",
        });
        if (result.state === "granted") {
          setHasOverlayPermission(true);
        }
      }
    } catch (error) {
      console.log("Could not request overlay permission:", error);
    }
  };

  const toggleBubble = () => {
    setIsOpen(!isOpen);
    if (!isOpen && onOpen) {
      onOpen();
    } else if (isOpen && onClose) {
      onClose();
    }
  };

  const positionClass = position === "bottom-left" ? "left-4" : "right-4";

  if (pendingCount === 0 && !isOpen) {
    return null;
  }

  return (
    <>
      {/* Floating Bubble Button */}
      <div
        className={`fixed bottom-4 ${positionClass} w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full shadow-2xl cursor-pointer flex items-center justify-center text-3xl font-bold transform transition-all hover:scale-110 z-40 animate-pulse`}
        onClick={toggleBubble}
        role="button"
        tabIndex={0}
        aria-label={`${pendingCount} pending gifts or tasks`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            toggleBubble();
          }
        }}
      >
        {/* Bubble Content */}
        <div className="relative">
          <span className="text-2xl">🎁</span>

          {/* Badge Count */}
          {pendingCount > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-lg">
              {pendingCount > 99 ? "99+" : pendingCount}
            </div>
          )}
        </div>

        {/* Pulsing Ring Animation */}
        <div className="absolute inset-0 rounded-full border-2 border-white opacity-50 animate-pulse"></div>
      </div>

      {/* Expanded Panel */}
      {isOpen && (
        <div
          className={`fixed bottom-24 ${positionClass} bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-xs z-40 overflow-hidden animate-slideUp`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">{i18next.t("floatingBubble.giftsAndTasks")}</h3>
              <button
                onClick={toggleBubble}
                className="text-white hover:bg-white/20 p-1 rounded-lg transition-all"
                aria-label="Close bubble"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-purple-100 mt-1">
              {pendingCount} عنصر{pendingCount !== 1 ? "ات" : ""} معلق{pendingCount !== 1 ? "ة" : ""}
            </p>
          </div>

          {/* Content */}
          <div className="p-4">
            {pendingCount > 0 ? (
              <div className="space-y-3">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-amber-600">🎁</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">جديد</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600">{pendingCount}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">معلق</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <button className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm">
                    عرض الهدايا 🎁
                  </button>
                  <button className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm">
                    عرض المهام ✅
                  </button>
                </div>

                {/* Overlay Permission */}
                {allowOverlay && !hasOverlayPermission && (
                  <button
                    onClick={requestOverlayPermission}
                    className="w-full text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 p-2 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all"
                  >
                    📱 تفعيل إظهار الإشعارات على الشاشة
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-3xl mb-2">✨</p>
                <p className="text-gray-600 dark:text-gray-400">لا توجد عناصر معلقة</p>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="bg-gray-50 dark:bg-gray-700/50 p-3 text-xs text-gray-600 dark:text-gray-400 text-center">
            سيتم إغلاق الفقاعة تلقائياً خلال 30 ثانية
          </div>
        </div>
      )}

      {/* Auto-close timer */}
      {isOpen && (
        <AutoCloseTimer
          duration={30}
          onTimeout={() => {
            setIsOpen(false);
            if (onClose) onClose();
          }}
        />
      )}
    </>
  );
};

/**
 * Auto-close timer component
 */
interface AutoCloseTimerProps {
  duration: number; // seconds
  onTimeout: () => void;
}

const AutoCloseTimer: React.FC<AutoCloseTimerProps> = ({ duration, onTimeout }) => {
  useEffect(() => {
    const timer = setTimeout(onTimeout, duration * 1000);
    return () => clearTimeout(timer);
  }, [duration, onTimeout]);

  return null;
};

// CSS Animations
const styles = `
  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  .animate-slideUp {
    animation: slideUp 0.3s ease-in-out;
  }

  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
`;

// Inject styles
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default FloatingBubble;
