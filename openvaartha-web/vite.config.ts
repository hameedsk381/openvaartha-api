import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "favicon.ico", "robots.txt"],
      manifest: {
        name: "Open Vaartha — South India's Authoritative News Platform",
        short_name: "Open Vaartha",
        description:
          "Immersive, high-speed regional dispatches from South India. Politics, Tech, Cinema, and Business.",
        theme_color: "#550000",
        background_color: "#f8f5f0",
        display: "standalone",
        display_override: ["window-controls-overlay", "minimal-ui"],
        orientation: "any",
        scope: "/",
        start_url: "/",
        id: "/",
        lang: "en",
        dir: "ltr",
        categories: ["news", "politics", "technology", "entertainment", "business"],
        icons: [
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
        shortcuts: [
          {
            name: "Trending",
            short_name: "Trending",
            description: "Trending stories",
            url: "/trending",
            icons: [{ src: "/icon.svg", sizes: "any" }],
          },
          {
            name: "Saved",
            short_name: "Saved",
            description: "Bookmarked articles",
            url: "/saved",
            icons: [{ src: "/icon.svg", sizes: "any" }],
          },
        ],
        screenshots: [],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/v1\//i,
            handler: "NetworkFirst",
            options: {
              cacheName: "openvaartha-api",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: /^https?:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
