import { useEffect, useMemo, useRef, useState } from "react";

type HardwareBackDetail = {
  canGoBack?: boolean;
};

type UseMobileControlsOptions = {
  onBackPress?: (canGoBack: boolean) => void;
  onAppStateChange?: (isActive: boolean) => void;
  onNetworkChange?: (isOnline: boolean, connectionType?: string) => void;
  onKeyboardShow?: (keyboardHeight: number | null) => void;
  onKeyboardHide?: () => void;
};

type UseMobileControlsResult = {
  isNative: boolean;
  isOnline: boolean;
  isAppActive: boolean;
  vibrateSelection: () => void;
};

export const isCapacitorNativePlatform = (targetWindow: any): boolean => {
  try {
    return Boolean(targetWindow?.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
};

const getCapacitorPlugins = (): any => {
  try {
    return (window as any)?.Capacitor?.Plugins;
  } catch {
    return undefined;
  }
};

export function useMobileControls(options: UseMobileControlsOptions = {}): UseMobileControlsResult {
  const optionsRef = useRef<UseMobileControlsOptions>(options);
  optionsRef.current = options;

  const isNative = useMemo(() => {
    return isCapacitorNativePlatform(window as any);
  }, []);

  const [isOnline, setIsOnline] = useState<boolean>(() => {
    try {
      return typeof navigator !== "undefined" ? navigator.onLine : true;
    } catch {
      return true;
    }
  });
  const [isAppActive, setIsAppActive] = useState<boolean>(true);

  useEffect(() => {
    const onHardwareBack = (event: Event) => {
      const detail = (event as CustomEvent<HardwareBackDetail>).detail;
      optionsRef.current.onBackPress?.(Boolean(detail?.canGoBack));
    };

    window.addEventListener("classify:hardware-back-press", onHardwareBack as EventListener);

    const plugins = getCapacitorPlugins();
    const keyboardPlugin = plugins?.Keyboard;
    const appPlugin = plugins?.App;
    const networkPlugin = plugins?.Network;

    const onOnline = () => {
      setIsOnline(true);
      optionsRef.current.onNetworkChange?.(true, "browser-online");
    };

    const onOffline = () => {
      setIsOnline(false);
      optionsRef.current.onNetworkChange?.(false, "browser-offline");
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const appStateListener =
      typeof appPlugin?.addListener === "function"
        ? appPlugin.addListener("appStateChange", (state: { isActive?: boolean }) => {
          const active = Boolean(state?.isActive);
          setIsAppActive(active);
          optionsRef.current.onAppStateChange?.(active);
        })
        : null;

    const networkListener =
      typeof networkPlugin?.addListener === "function"
        ? networkPlugin.addListener("networkStatusChange", (status: { connected?: boolean; connectionType?: string }) => {
          const online = Boolean(status?.connected);
          setIsOnline(online);
          optionsRef.current.onNetworkChange?.(online, status?.connectionType);
        })
        : null;

    if (typeof networkPlugin?.getStatus === "function") {
      networkPlugin
        .getStatus()
        .then((status: { connected?: boolean; connectionType?: string }) => {
          const online = Boolean(status?.connected);
          setIsOnline(online);
          optionsRef.current.onNetworkChange?.(online, status?.connectionType);
        })
        .catch(() => undefined);
    }

    const keyboardShowListener =
      typeof keyboardPlugin?.addListener === "function"
        ? keyboardPlugin.addListener("keyboardWillShow", (info: { keyboardHeight?: number }) => {
          const height = typeof info?.keyboardHeight === "number" ? info.keyboardHeight : null;
          optionsRef.current.onKeyboardShow?.(height);
        })
        : null;

    const keyboardHideListener =
      typeof keyboardPlugin?.addListener === "function"
        ? keyboardPlugin.addListener("keyboardWillHide", () => {
          optionsRef.current.onKeyboardHide?.();
        })
        : null;

    return () => {
      window.removeEventListener("classify:hardware-back-press", onHardwareBack as EventListener);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);

      try {
        appStateListener?.remove?.();
      } catch {
      }

      try {
        networkListener?.remove?.();
      } catch {
      }

      try {
        keyboardShowListener?.remove?.();
      } catch {
      }

      try {
        keyboardHideListener?.remove?.();
      } catch {
      }
    };
  }, []);

  const vibrateSelection = () => {
    try {
      const hapticsPlugin = getCapacitorPlugins()?.Haptics;
      if (typeof hapticsPlugin?.selectionStart === "function" && typeof hapticsPlugin?.selectionEnd === "function") {
        hapticsPlugin.selectionStart();
        hapticsPlugin.selectionEnd();
        return;
      }
    } catch {
    }

    try {
      navigator.vibrate?.(20);
    } catch {
    }
  };

  return {
    isNative,
    isOnline,
    isAppActive,
    vibrateSelection,
  };
}
