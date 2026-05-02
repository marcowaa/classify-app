// client/src/components/notifications/NotificationToast.tsx
// Toast notification (auto-dismiss after 5 seconds)

import { useEffect } from "react";
import { useTranslation } from "react-i18next";

type NotificationSoundConfig = {
  soundEnabled: boolean;
  soundChoice: string;
  customSoundUrl?: string | null;
};

const DEFAULT_SOUND_URL = "/sounds/notification.mp3";
let notificationSoundConfigCache: NotificationSoundConfig | null = null;
let notificationSoundConfigPromise: Promise<NotificationSoundConfig> | null = null;

async function getNotificationSoundConfig(): Promise<NotificationSoundConfig> {
  if (notificationSoundConfigCache) {
    return notificationSoundConfigCache;
  }

  if (!notificationSoundConfigPromise) {
    notificationSoundConfigPromise = fetch("/api/notification-sound")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("NOTIFICATION_SOUND_FETCH_FAILED");
        }
        const json = await res.json();
        const data = json?.data || {};
        return {
          soundEnabled: data.soundEnabled !== false,
          soundChoice: typeof data.soundChoice === "string" ? data.soundChoice : "default",
          customSoundUrl:
            typeof data.customSoundUrl === "string" && data.customSoundUrl.trim().length > 0
              ? data.customSoundUrl
              : null,
        } as NotificationSoundConfig;
      })
      .catch(() => ({ soundEnabled: true, soundChoice: "default", customSoundUrl: null }));
  }

  const loaded = await notificationSoundConfigPromise;
  notificationSoundConfigCache = loaded;
  notificationSoundConfigPromise = null;
  return loaded;
}

interface NotificationToastProps {
  id: string;
  title: string;
  message: string;
  onDismiss: (id: string) => void;
  soundAlert?: boolean;
  type?: "gift_unlocked" | "gift_activated";
  actionLabel?: string;
  onAction?: (id: string) => void;
}

export function NotificationToast({
  id,
  title,
  message,
  onDismiss,
  soundAlert = false,
  type = "gift_activated",
  actionLabel,
  onAction,
}: NotificationToastProps) {
  const { t } = useTranslation();
  useEffect(() => {
    let cancelled = false;

    const playNotificationSound = async () => {
      if (!soundAlert) return;

      try {
        const config = await getNotificationSoundConfig();
        if (cancelled || config.soundEnabled === false) return;

        const soundUrl =
          config.soundChoice === "custom" && config.customSoundUrl
            ? config.customSoundUrl
            : DEFAULT_SOUND_URL;

        const audio = new Audio(soundUrl);
        audio.volume = 0.7;
        await audio.play().catch(() => undefined);
      } catch {
        // no-op: keep notifications functional even if audio asset is missing
      }
    };

    void playNotificationSound();

    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => onDismiss(id), 5000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id, onDismiss, soundAlert]);

  // Color coding by notification type
  const bgColor =
    type === "gift_unlocked"
      ? "bg-blue-500"
      : type === "gift_activated"
        ? "bg-green-500"
        : "bg-gray-500";

  return (
    <div
      className={`${bgColor} text-white rounded-lg shadow-lg p-4 max-w-sm animate-fade-in`}
      role="alert"
      aria-live="polite"
    >
      <h3 className="font-bold text-lg mb-1">{title}</h3>
      <p className="text-sm">{message}</p>
      <div className="mt-2 flex justify-between items-center">
        <span className="text-xs opacity-75">{t("notificationToast.autoClose")}</span>
        <div className="flex items-center gap-2">
          {onAction && actionLabel ? (
            <button
              onClick={() => onAction(id)}
              className="text-xs font-semibold bg-white/20 hover:bg-white/30 px-2 py-1 rounded"
            >
              {actionLabel}
            </button>
          ) : null}
          <button
            onClick={() => onDismiss(id)}
            className="text-lg opacity-75 hover:opacity-100"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
