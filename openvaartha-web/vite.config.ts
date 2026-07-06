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
    // Dev-only convenience: proxy API/feed calls to production so local UI
    // work has real content to render against. Never affects `vite build`.
    proxy: {
      "/api": { target: "https://openvaartha.com", changeOrigin: true, secure: true },
      "/sitemap.xml": { target: "https://openvaartha.com", changeOrigin: true, secure: true },
    },
    hmr: {
      overlay: false,
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("lucide-react")) {
              return "vendor-lucide";
            }
            if (
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("react-router") ||
              id.includes("scheduler")
            ) {
              return "vendor-react";
            }
            if (id.includes("@tanstack") || id.includes("query-core")) {
              return "vendor-query";
            }
            if (id.includes("@mdxeditor")) {
              return "vendor-mdx";
            }
            if (id.includes("recharts") || id.includes("d3")) {
              return "vendor-charts";
            }
            return "vendor-lib"; // remaining third party dependencies
          }
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "robots.txt", "logo.jpg"],
      manifest: {
        name: "Open Vaartha — An Open News Platform, Built by Gen Z",
        short_name: "Open Vaartha",
        description:
          "Open Vaartha is an independent, youth-led news initiative — open journalism built by Gen Z, for a freer internet.",
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
        maximumFileSizeToCacheInBytes: 5000000, // Increase cache size limit to 5 MB
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
