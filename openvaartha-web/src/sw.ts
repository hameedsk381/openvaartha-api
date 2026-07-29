/// <reference lib="webworker" />
// Custom service worker (vite-plugin-pwa injectManifest mode) — needed
// because generateSW mode can't add custom push/notificationclick handlers.
// Precaching + runtime caching below replicate exactly what the previous
// generateSW `workbox` config did; only the push handlers are new.

import { precacheAndRoute, matchPrecache } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst, NetworkOnly } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { BackgroundSyncPlugin } from "workbox-background-sync";

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

const bgSyncPlugin = new BackgroundSyncPlugin("openvaartha-mutations", {
  maxRetentionTime: 24 * 60, // Retry for max of 24 Hours
});

// Cache GET requests to the API for offline reading
registerRoute(
  ({ url, request }) => /\/api\/v1\//i.test(url.href) && request.method === 'GET',
  new NetworkFirst({
    cacheName: "openvaartha-api",
    networkTimeoutSeconds: 5,
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 })],
  })
);

// Queue POST/PUT/DELETE requests for Background Sync if offline
registerRoute(
  ({ url, request }) => /\/api\/v1\//i.test(url.href) && ['POST', 'PUT', 'DELETE'].includes(request.method),
  new NetworkOnly({
    plugins: [bgSyncPlugin],
  })
);

registerRoute(
  ({ url }) => /^https:\/\/fonts\.googleapis\.com\//i.test(url.href),
  new CacheFirst({
    cacheName: "google-fonts",
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  })
);

// Page navigations: always try the network first — /article/* gets real
// per-request server-rendered HTML (title/meta/body shell) from the API, and
// a cache-first navigation route would silently serve the generic SPA shell
// instead, even while online. Only when the network genuinely fails (offline)
// do we fall back to the cached app shell, then the dedicated offline page.
const navigationHandler = new NetworkOnly();
registerRoute(
  new NavigationRoute(async (params) => {
    try {
      return await navigationHandler.handle(params);
    } catch {
      return (
        (await matchPrecache("/index.html")) ||
        (await matchPrecache("/offline.html")) ||
        Response.error()
      );
    }
  })
);

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
}

self.addEventListener("push", (event: PushEvent) => {
  let data: PushPayload = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    // Non-JSON payload — fall back to the defaults below.
  }

  const title = data.title || "Open Vaartha";
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body: data.body,
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        data: { url: data.url || "/" },
      }),
      ('setAppBadge' in navigator) ? (navigator as any).setAppBadge(1).catch(() => {}) : Promise.resolve()
    ])
  );
});

self.addEventListener("periodicsync", (event: any) => {
  if (event.tag === "fetch-latest-news") {
    event.waitUntil(
      fetch("/api/v1/articles")
        .then(res => {
          if (!res.ok) throw new Error("Failed to fetch latest news");
          const cachePromise = caches.open("openvaartha-api")
            .then(cache => cache.put("/api/v1/articles", res.clone()));
          
          const badgePromise = ('setAppBadge' in navigator) 
            ? (navigator as any).setAppBadge(1).catch(() => {}) 
            : Promise.resolve();
            
          return Promise.all([cachePromise, badgePromise]);
        })
        .catch(console.error)
    );
  }
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => new URL(c.url).pathname === url);
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});

self.skipWaiting();
