// Static / SPA build config — used ONLY for Capacitor (native app) packaging.
//
//   npm run build:static
//
// Produces a fully client-rendered app shell at:
//   dist/client/index.html
// plus every JS/CSS/icon asset it needs, so the app boots with zero network
// access on a cold first launch.
//
// The hosted site keeps using vite.config.ts (`npm run build`, SSR) untouched.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    // SPA mode: prerender the app shell once at build time and serve it for
    // every route on the client. No server render is needed to display a page.
    spa: {
      enabled: true,
      maskPath: "/",
      prerender: { outputPath: "/index.html" },
    },
  },
  // No Nitro / Cloudflare server output — this target is a plain static bundle.
  nitro: false,
  vite: {
    plugins: [mcpPlugin()],
  },
});
