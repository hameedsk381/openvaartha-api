import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One "see the rest of this section" link for every rail on the front page.
 * Same label type, same arrow, same 44px hit area everywhere, so the eye (and
 * the thumb) learn it once. Hidden rails previously used three different
 * styles and one of them disappeared on mobile entirely.
 */
export default function SectionLink({
  to,
  children,
  className,
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group inline-flex min-h-11 shrink-0 items-center gap-1 text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground hover:text-primary transition-colors press",
        className
      )}
    >
      {children}
      <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </Link>
  );
}
