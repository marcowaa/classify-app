import { useCallback, useEffect, useRef } from "react";
import { PushNotifications } from "@capacitor/push-notifications";
import { useLocation } from "wouter";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import {
  emitNotificationPermissionRequired,
  hasNotificationPermissionBeenGranted,
  markNotificationPermissionGranted,
  NotificationPermissionReason,
  NotificationPermissionRole,
  onNotificationPermissionRequired,
} from "@/lib/notificationPermissionSignals";

const PROMPT_WINDOW_MS = 2 * 60 * 1000;

function resolveRoleFromTokens(): NotificationPermissionRole | null {
  if (typeof window === "undefined") return null;
  if (localStorage.getItem("childToken")) return "child";
  if (localStorage.getItem("teacherToken")) return "teacher";
  if (localStorage.getItem("token")) return "parent";
  return null;
}

function isNativeCapacitor(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as any)?.Capacitor?.isNativePlatform?.();
}

function getSettingsFallbackPath(role: NotificationPermissionRole): string {
  if (role === "child") return "/child-settings";
  if (role === "teacher") return "/teacher/dashboard";
  return "/settings";
}

export function useNotificationPermissionRecovery() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const lastPromptAtRef = useRef<number>(0);

  const isGrantedNow = useCallback(async (role: NotificationPermissionRole): Promise<boolean> => {
    if (isNativeCapacitor()) {
      try {
        const state = await PushNotifications.checkPermissions();
        const granted = state.receive === "granted";
        if (granted) {
          markNotificationPermissionGranted(role);
        }
        return granted;
      } catch {
        return false;
      }
    }

    if (typeof Notification === "undefined") {
      markNotificationPermissionGranted(role);
      return true;
    }

    const granted = Notification.permission === "granted";
    if (granted) {
      markNotificationPermissionGranted(role);
    }
    return granted;
  }, []);

  const openPermissionSettings = useCallback(
    async (role: NotificationPermissionRole) => {
      if (isNativeCapacitor()) {
        const appPlugin = (window as any)?.Capacitor?.Plugins?.App;
        if (typeof appPlugin?.openSettings === "function") {
          try {
            await appPlugin.openSettings();
            return;
          } catch {
          }
        }
      }

      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        try {
          const requested = await Notification.requestPermission();
          if (requested === "granted") {
            markNotificationPermissionGranted(role);
            toast({
              title: "تم تفعيل الإشعارات",
              description: "لن تظهر رسالة طلب الصلاحيات مرة أخرى.",
            });
            return;
          }
        } catch {
        }
      }

      navigate(getSettingsFallbackPath(role));
      toast({
        title: "فعّل صلاحيات الإشعارات",
        description: "من إعدادات التطبيق فعّل الإشعارات والسماح بالنشاط في الخلفية.",
      });
    },
    [navigate, toast]
  );

  const showPermissionPrompt = useCallback(
    (role: NotificationPermissionRole, reason: NotificationPermissionReason) => {
      if (hasNotificationPermissionBeenGranted(role)) return;

      const now = Date.now();
      if (now - lastPromptAtRef.current < PROMPT_WINDOW_MS) return;
      lastPromptAtRef.current = now;

      const description =
        reason === "registration_error" || reason === "subscription_error"
          ? "فشل التطبيق في تفعيل الإشعارات. اضغط قبول لفتح إعدادات الصلاحيات."
          : "لضمان وصول الإشعارات، فعّل صلاحيات الإشعارات والسماح بالنشاط في الخلفية.";

      toast({
        title: "صلاحيات الإشعارات مطلوبة",
        description,
        duration: 12000,
        action: (
          <ToastAction altText="قبول" onClick={() => openPermissionSettings(role)}>
            قبول
          </ToastAction>
        ),
      });
    },
    [openPermissionSettings, toast]
  );

  const initialCheck = useCallback(async () => {
    const role = resolveRoleFromTokens();
    if (!role) return;

    const granted = await isGrantedNow(role);
    if (!granted && !hasNotificationPermissionBeenGranted(role)) {
      emitNotificationPermissionRequired(role, "default");
    }
  }, [isGrantedNow]);

  useEffect(() => {
    const unsubscribe = onNotificationPermissionRequired((detail) => {
      showPermissionPrompt(detail.role, detail.reason);
    });

    const onFocus = () => {
      const role = resolveRoleFromTokens();
      if (!role) return;
      isGrantedNow(role).catch(() => undefined);
    };

    window.addEventListener("focus", onFocus);
    initialCheck().catch(() => undefined);

    return () => {
      unsubscribe();
      window.removeEventListener("focus", onFocus);
    };
  }, [initialCheck, isGrantedNow, showPermissionPrompt]);
}

export default useNotificationPermissionRecovery;
