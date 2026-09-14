import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.almadina.stitchingsuite",
  appName: "Almadina Stitching Suite",
  // Static/SPA output produced by `npm run build:static`.
  webDir: "capacitor-www",
  android: {
    // Keep navigation inside the app (no external browser chrome).
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      launchAutoHide: true,
      backgroundColor: "#f9fafb",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#3B82F6",
    },
  },
};

export default config;
