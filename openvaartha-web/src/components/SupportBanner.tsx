import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, X } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "support-banner-dismissed";

/**
 * One-time dismissible "support independent journalism" banner. Shows once
 * (guarded by localStorage) at the top of the homepage feed.
 */
export default function SupportBanner({ className }: { className?: string }) {
  const [visible, setVisible] = useState(
    () => typeof window === "undefined" || !localStorage.getItem(STORAGE_KEY)
  );

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch { /* private mode — just hide this session */ }
    setVisible(false);
  };

  return (
    <div
      role="banner"
      className={cn(
        "flex items-center gap-3 px-4 sm:px-6 lg:px-10 py-3 border-b border-primary/15 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent",
        className
      )}
    >
      <Heart className="h-4 w-4 text-primary shrink-0 fill-current hidden sm:block" />
      <p className="flex-1 min-w-0 text-xs sm:text-sm text-foreground leading-snug">
        <span className="font-semibold">Independent journalism needs your support.</span>{" "}
        <span className="text-muted-foreground hidden sm:inline">
          {BRAND.name} is free and reader-funded — a small contribution keeps it that way.
        </span>
      </p>
      <Link
        to="/support"
        className="shrink-0 h-8 px-3 rounded-full inline-flex items-center gap-1 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors press"
      >
        Support us
      </Link>
      <button
        onClick={dismiss}
        aria-label="Dismiss support banner"
        className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors press"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
