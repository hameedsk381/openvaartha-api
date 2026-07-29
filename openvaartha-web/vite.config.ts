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
        // Only manually chunk vendors that are actually used on eagerly-loaded
        // (reader-facing) routes. A named manualChunk gets `modulepreload`ed
        // from the entry HTML, so naming a lazy-only vendor here (e.g. the
        // 1.5MB @mdxeditor, or recharts) drags it onto the homepage's critical
        // path. Those are left unnamed so Vite auto-splits them into the async
        // chunk of whichever lazy route imports them.
        manualChunks(id) {
          if (id.includes("node_modules") && id.includes("lucide-react")) {
            return "vendor-lucide";
          }
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // injectManifest (a custom src/sw.ts, precompiled by Vite) instead of
      // generateSW's fully auto-generated worker — needed for the push /
      // notificationclick handlers generateSW has no hook for.
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      includeAssets: ["robots.txt", "logo.jpg", "og-image.png", "icon-maroon.png", "icon-white.png"],
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
          {
            // White mark on a solid maroon field with Android-safe-zone
            // padding — survives circle/squircle/teardrop launcher masks
            // without the "D" getting clipped (unlike a tight-cropped icon).
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "Trending",
            short_name: "Trending",
            description: "Trending stories",
            url: "/trending",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
          {
            name: "Saved",
            short_name: "Saved",
            description: "Bookmarked articles",
            url: "/portal/saved",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }],
          },
        ],
        share_target: {
          action: "/search",
          method: "GET",
          params: {
            title: "q",
            text: "q",
            url: "q"
          }
        },
        screenshots: [],
      },
      // Precache config + runtime caching rules live in src/sw.ts now (the
      // `workbox` option only applies to generateSW mode). Same 700KB ceiling
      // and glob pattern as before — the ~1MB admin markdown-editor chunk
      // still deliberately falls above it so it isn't background-downloaded
      // onto every reader's device, only fetched on demand.
      injectManifest: {
        maximumFileSizeToCacheInBytes: 700000,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
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
