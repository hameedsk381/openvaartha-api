import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Register the service worker and, because registerType is "autoUpdate",
// auto-reload the app the moment a freshly deployed build's service worker
// activates. Without this, the installed PWA keeps running the previous
// bundle from its precache forever (stale UI, old bug fixes never arrive).
registerSW({ immediate: true });

// No-op if VITE_SENTRY_DSN is unset — every Sentry.captureException call
// elsewhere in the app (e.g. ErrorBoundary) is safe to call unconditionally.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  });
}

createRoot(document.getElementById("root")!).render(<App />);

// Recovery from stale-build chunk errors. After a deploy the new assets dist/
// cleans up old chunk files (their hashed filenames change). A tab that was
// already open — or a service-worker-preloaded page — can still reference a now
// deleted chunk and throw "error loading dynamically imported module". The PWA
// auto-update handles the next load, but this catches the in-session failure and
// does a single hard reload to grab the freshly deployed index+chunks.
(function installChunkReloadGuard() {
  let reloaded = false;
  const isChunkLoadFailure = (msg: string) =>
    /Failed to fetch dynamically imported module|error loading dynamically imported module/i.test(msg);

  const recover = () => {
    if (reloaded) return;
    reloaded = true;
    // Best effort: clear the stale precache so the reload picks up new assets.
    try {
      navigator.serviceWorker?.getRegistrations().then((regs) =>
        regs.forEach((r) => r.update())
      );
    } catch { /* ignore */ }
    window.location.reload();
  };

  window.addEventListener("error", (e) => {
    if (e.message && isChunkLoadFailure(e.message)) recover();
  });
  window.addEventListener("unhandledrejection", (e) => {
    const msg = e.reason && (e.reason.message || String(e.reason));
    if (typeof msg === "string" && isChunkLoadFailure(msg)) recover();
  });
})();
