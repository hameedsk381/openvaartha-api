import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!show) return null;

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
        <Download className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">Install Open Vaartha</p>
        <p className="text-xs text-muted-foreground">Get the app for a faster experience</p>
      </div>
      <button
        onClick={install}
        className="h-9 px-3 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors shrink-0 press"
      >
        Install
      </button>
      <button
        onClick={() => setShow(false)}
        className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0 press"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
