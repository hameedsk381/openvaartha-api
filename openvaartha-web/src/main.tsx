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
