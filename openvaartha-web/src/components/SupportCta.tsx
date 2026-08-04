import { Link } from "react-router-dom";
import { Heart, ArrowRight, HandCoins } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

interface SupportCtaProps {
  variant?: "card" | "footer";
  className?: string;
}

/**
 * "Support independent journalism" ask. When BRAND.supportUrl is configured the
 * button jumps straight to the payment link; otherwise it sends people to the
 * internal /support page.
 */
export default function SupportCta({ variant = "card", className }: SupportCtaProps) {
  const isFooter = variant === "footer";
  const external = BRAND.supportUrl.trim().length > 0;

  const button = (
    <span className={cn(
      "inline-flex items-center gap-1.5 h-10 rounded-xl px-4 text-sm font-semibold transition-all press",
      external
        ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
        : "bg-primary/10 text-primary hover:bg-primary/15"
    )}>
      <HandCoins className="h-4 w-4" />
      Support us
      {!external && <ArrowRight className="h-4 w-4" />}
    </span>
  );

  const body = (
    <div className={cn(
      "flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 rounded-2xl border p-5 sm:p-6",
      isFooter ? "border-border bg-[hsl(var(--surface))]" : "border-border bg-secondary/30"
    )}>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-primary shrink-0" />
          <span className="overline text-primary">Support independent journalism</span>
        </div>
        <h3 className={cn("font-display font-bold tracking-tight leading-snug", isFooter ? "text-base" : "text-lg")}>
          Keep {BRAND.name} free, open, and reader-funded.
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          A small contribution powers our reporting and keeps the platform ad-free for everyone.
        </p>
      </div>
      {external ? (
        <a
          href={BRAND.supportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0"
        >
          {button}
        </a>
      ) : (
        <Link to="/support" className="shrink-0">
          {button}
        </Link>
      )}
    </div>
  );

  return body;
}
