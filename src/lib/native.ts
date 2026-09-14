/**
 * Native (Capacitor / Android) shell integration.
 *
 * Everything here is a no-op on the hosted website — the Capacitor plugins
 * report `isNativePlatform() === false` in a normal browser, so the online app
 * behaves exactly as before.
 */
import { Capacitor } from "@capacitor/core";

export function isNativeApp() {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

/**
 * Wires up native-only behaviour:
 *  - Android hardware back button navigates back inside the app and only
 *    exits when there is nowhere left to go (never a blank WebView).
 *  - Status bar styling.
 *  - Hides the splash screen once the UI is actually mounted.
 */
export function initNativeShell(): () => void {
  if (!isNativeApp()) return () => {};

  let disposed = false;
  const cleanups: Array<() => void> = [];

  void (async () => {
    try {
      const [{ App }, { SplashScreen }, { StatusBar, Style }] = await Promise.all([
        import("@capacitor/app"),
        import("@capacitor/splash-screen"),
        import("@capacitor/status-bar"),
      ]);
      if (disposed) return;

      const handle = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack || window.history.length > 1) {
          window.history.back();
        } else {
          void App.exitApp();
        }
      });
      cleanups.push(() => void handle.remove());

      try {
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: "#3B82F6" });
      } catch {
        /* status bar is not available on every device/API level */
      }

      await SplashScreen.hide();
    } catch {
      /* never let native wiring break the app */
    }
  })();

  return () => {
    disposed = true;
    cleanups.forEach((fn) => fn());
  };
}
