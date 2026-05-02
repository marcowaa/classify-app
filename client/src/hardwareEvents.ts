// Capacitor hardware button event bridge.
// This module emits browser events that the React app can consume.

const isNativeCapacitor = !!(window as any)?.Capacitor?.isNativePlatform?.();

function getAppPlugin(): any {
  try {
    return (window as any)?.Capacitor?.Plugins?.App;
  } catch {
    return undefined;
  }
}

function emitBackButtonEvent(canGoBack: boolean) {
  window.dispatchEvent(
    new CustomEvent("classify:hardware-back-press", {
      detail: { canGoBack },
    })
  );
}

function registerBackButtonListener(): boolean {
  const appPlugin = getAppPlugin();
  if (!appPlugin || typeof appPlugin.addListener !== "function") {
    return false;
  }

  appPlugin.addListener("backButton", (event: any) => {
    emitBackButtonEvent(Boolean(event?.canGoBack));
  });

  return true;
}

if (isNativeCapacitor) {
  if (!registerBackButtonListener()) {
    // On some devices/plugins, App is injected shortly after startup.
    const interval = window.setInterval(() => {
      if (registerBackButtonListener()) {
        window.clearInterval(interval);
      }
    }, 400);

    window.setTimeout(() => {
      window.clearInterval(interval);
    }, 10_000);
  }
}
