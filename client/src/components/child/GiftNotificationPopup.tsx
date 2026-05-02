import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface Gift {
  id: string;
  productName: string;
  productImage: string | null;
  pointsCost: number;
  status: "pending" | "delivered" | "acknowledged";
}

interface GiftNotificationPopupProps {
  gifts: Gift[];
  onAcknowledge: (giftId: string) => void;
  mode: "popup_strict" | "popup_soft" | "floating_bubble";
  repeatDelayMinutes?: number;
  onClose?: () => void;
}

/**
 * GiftNotificationPopup Component
 * يعرض إشعارات الهدايا بأنماط مختلفة:
 * - popup_strict: نافذة منبثقة لا يمكن إغلاقها إلا بعد الاعتراف
 * - popup_soft: بانر/إعلان يمكن إغلاقه (يعود بعد الفاصل الزمني)
 * - floating_bubble: دائرة عائمة (محاكاة Messenger)
 */
export const GiftNotificationPopup: React.FC<GiftNotificationPopupProps> = ({
  gifts,
  onAcknowledge,
  mode,
  repeatDelayMinutes = 5,
  onClose,
}) => {
  const [visibleGifts, setVisibleGifts] = useState<Gift[]>(gifts.filter((g) => g.status === "pending"));
  const [currentGiftIndex, setCurrentGiftIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [bubbleOpen, setBubbleOpen] = useState(false);

  const currentGift = visibleGifts[currentGiftIndex];

  useEffect(() => {
    const pending = gifts.filter((g) => g.status === "pending");
    setVisibleGifts(pending);
    setCurrentGiftIndex(0);
    setIsVisible(pending.length > 0);
    if (pending.length === 0) {
      setBubbleOpen(false);
    }
  }, [gifts]);

  // Popup Strict Mode: لا يمكن الإغلاق بدون الاعتراف
  const handleStrictAcknowledge = (giftId: string) => {
    onAcknowledge(giftId);
    const newGifts = visibleGifts.filter((g) => g.id !== giftId);
    setVisibleGifts(newGifts);

    if (newGifts.length > 0) {
      setCurrentGiftIndex(Math.min(currentGiftIndex, newGifts.length - 1));
    } else {
      setIsVisible(false);
      if (onClose) onClose();
    }
  };

  // Popup Soft Mode: يمكن الإغلاق، لكن يعود بعد الفاصل الزمني
  const handleSoftDismiss = (giftId: string) => {
    setIsVisible(false);

    setTimeout(() => {
      setIsVisible(true);
    }, (repeatDelayMinutes || 5) * 60 * 1000); // تحويل الدقائق إلى ميلي ثانية
  };

  const handleAcknowledge = (giftId: string) => {
    if (mode === "popup_soft") {
      handleSoftDismiss(giftId);
    } else {
      handleStrictAcknowledge(giftId);
    }
  };

  if (!currentGift || !isVisible) {
    return null;
  }

  // Popup Strict Mode - Full Screen Non-dismissible
  if (mode === "popup_strict") {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999] animate-fadeIn">
        <div className="bg-gradient-to-b from-amber-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl p-8 max-w-md transform transition-all">
          <div className="text-center">
            <div className="text-6xl mb-4">🎁</div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">يا لها من هدية!</h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
              حصلت على هدية من والديك!
            </p>

            {currentGift.productImage && (
              <div className="mb-6">
                <img
                  src={currentGift.productImage}
                  alt={currentGift.productName}
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 mb-6">
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {currentGift.productName}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {currentGift.pointsCost} نقطة
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleStrictAcknowledge(currentGift.id)}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 shadow-lg"
              >
                شكراً، فهمت! 👍
              </button>
            </div>

            {visibleGifts.length > 1 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                {currentGiftIndex + 1} من {visibleGifts.length}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Popup Soft Mode - Dismissible Banner
  if (mode === "popup_soft") {
    return (
      <div className="fixed top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 max-w-sm z-50 animate-slideIn border-l-4 border-amber-500">
        <div className="flex items-start gap-4">
          <div className="text-4xl flex-shrink-0">🎁</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">
              هدية جديدة!
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
              {currentGift.productName}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleAcknowledge(currentGift.id)}
                className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded font-semibold"
              >
                رؤية
              </button>
              <button
                onClick={() => setIsVisible(false)}
                className="text-xs bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white px-3 py-1 rounded"
              >
                لاحقاً
              </button>
            </div>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // Floating Bubble Mode - Always Visible
  if (mode === "floating_bubble") {
    return (
      <>
        {/* Floating Bubble */}
        <div
          className="fixed bottom-4 right-4 w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 rounded-full shadow-lg cursor-pointer flex items-center justify-center text-3xl transform transition-all hover:scale-110 z-40 animate-bounce"
          onClick={() => setBubbleOpen((prev) => !prev)}
        >
          🎁
          {visibleGifts.length > 0 && (
            <div className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {visibleGifts.length}
            </div>
          )}
        </div>

        {/* Expanded Bubble Content */}
        {bubbleOpen && (
          <div className="fixed bottom-24 right-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 max-w-xs z-40 animate-slideUp">
            <div className="text-center">
              <div className="text-5xl mb-3">🎁</div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                {currentGift.productName}
              </h4>

              {currentGift.productImage && (
                <img
                  src={currentGift.productImage}
                  alt={currentGift.productName}
                  className="w-full h-32 object-cover rounded mb-3"
                />
              )}

              <button
                onClick={() => {
                  handleAcknowledge(currentGift.id);
                  setBubbleOpen(false);
                }}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg transition-all"
              >
                قبول الهدية
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

// CSS Animations
const styles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

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

  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  .animate-fadeIn {
    animation: fadeIn 0.3s ease-in-out;
  }

  .animate-slideIn {
    animation: slideIn 0.3s ease-in-out;
  }

  .animate-slideUp {
    animation: slideUp 0.3s ease-in-out;
  }

  .animate-bounce {
    animation: bounce 2s infinite;
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

// Inject styles
if (typeof document !== "undefined") {
  const styleId = "gift-notification-popup-styles";
  if (!document.getElementById(styleId)) {
    const styleSheet = document.createElement("style");
    styleSheet.id = styleId;
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }
}

export default GiftNotificationPopup;
