import { useEffect } from "react";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { Bell, X } from "lucide-react";

export function PushPromptToast() {
  const { supported, subscribe } = usePushNotifications();
  const isAuthed = !!localStorage.getItem("token");

  useEffect(() => {
    // Check permission directly since the hook state might be stale
    const currentPermission = typeof Notification !== "undefined" ? Notification.permission : "default";

    // Only prompt authenticated users on supported browsers who haven't granted/denied yet.
    if (!supported || currentPermission !== "default" || !isAuthed) return;

    const dismissed = localStorage.getItem("push_prompt_dismissed");
    if (dismissed) return;

    // Wait a few seconds so it doesn't immediately pop up on load
    const timer = setTimeout(() => {
      toast.custom(
        (t) => (
          <div className="bg-[hsl(var(--surface))] border border-border shadow-2xl p-4 sm:p-5 rounded-xl w-full max-w-sm flex gap-4 items-start relative pointer-events-auto">
            <button 
              onClick={() => {
                localStorage.setItem("push_prompt_dismissed", "true");
                toast.dismiss(t);
              }}
              className="absolute top-2 right-2 p-1.5 text-muted-foreground hover:bg-secondary rounded-full transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Bell className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0 pr-4">
              <h3 className="font-bold text-sm">Stay Updated</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-3 leading-relaxed">
                Turn on breaking news alerts to never miss an important story from Open Vaartha.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      await subscribe({ breaking: true, morning: true });
                      toast.success("Notifications enabled!");
                      localStorage.setItem("notify_breaking", "true");
                      localStorage.setItem("notify_morning", "true");
                      toast.dismiss(t);
                    } catch (err: any) {
                      toast.error(err.message || "Failed to enable notifications");
                    }
                  }}
                  className="bg-primary text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded hover:bg-primary/90 transition-colors"
                >
                  Enable
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem("push_prompt_dismissed", "true");
                    toast.dismiss(t);
                  }}
                  className="bg-secondary text-secondary-foreground text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded hover:bg-secondary/80 transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        ),
        { duration: Infinity, id: "push-prompt", position: "bottom-right" }
      );
    }, 4000);

    return () => clearTimeout(timer);
  }, [supported, isAuthed, subscribe]);

  return null;
}
