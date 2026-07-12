import { useEffect, useState } from "react";
import { Share } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { Download } from "@/components/animate-ui/icons/download";
import { X } from "@/components/animate-ui/icons/x";

const DISMISS_KEY = "pwa_install_dismissed_at";
// Re-offer after a couple weeks rather than permanently hiding on one dismiss —
// people who say "not now" often install later once they trust the site more.
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

const recentlyDismissed = (): boolean => {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  return !Number.isNaN(dismissedAt) && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;
};

const isStandalone = (): boolean =>
  window.matchMedia("(display-mode: standalone)").matches ||
  // iOS Safari's own (non-standard) flag for "already added to home screen".
  (window.navigator as unknown as { standalone?: boolean }).standalone === true;

const isIOSSafari = (): boolean => {
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
  // Exclude Chrome/Firefox/etc. on iOS (they still use Safari's WebKit and
  // still lack beforeinstallprompt, but "Add to Home Screen" only lives in
  // Safari's own share sheet — other iOS browsers can't do it at all).
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIOS && isSafari;
};

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [iosInstructions, setIosInstructions] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    // iOS Safari never fires beforeinstallprompt — it's the only browser
    // where "Add to Home Screen" is possible but has no programmatic prompt,
    // so without this branch iOS users would never see any install UX at all.
    if (isIOSSafari()) {
      setIosInstructions(true);
      setShow(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const onInstalled = () => {
      setDeferredPrompt(null);
      setShow(false);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  };

  const install = () => {
    deferredPrompt?.prompt();
    deferredPrompt?.userChoice.then(() => {
      setDeferredPrompt(null);
      setShow(false);
    });
  };

  return (
    <div className="fixed bottom-20 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 p-4 rounded-xl bg-card border border-border shadow-xl flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
        {iosInstructions ? (
          <AnimatedIcon animationType="bounce" isActive>
            <Share className="h-5 w-5 text-white" />
          </AnimatedIcon>
        ) : (
          <Download className="h-5 w-5 text-white" animate loop />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">Install {BRAND.name}</p>
        <p className="text-xs text-muted-foreground">
          {iosInstructions
            ? "Tap Share, then \"Add to Home Screen\""
            : "Get the app for a faster experience"}
        </p>
      </div>
      {!iosInstructions && (
        <button
          onClick={install}
          className="h-9 px-3 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors shrink-0 press"
        >
          Install
        </button>
      )}
      <button
        onClick={dismiss}
        className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0 press"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" animateOnHover />
      </button>
    </div>
  );
}
