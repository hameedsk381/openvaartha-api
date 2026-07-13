import * as React from "react";
import { ChevronRight } from "@/components/animate-ui/icons/chevron-right";

import { cn } from "@/lib/utils";

/**
 * iOS Settings-style grouped inset list. Wrap related IOSListItems in one
 * IOSList per section — each group gets its own rounded card with hairline
 * dividers between rows, matching the native Settings app rather than a
 * plain bordered table.
 */
export function IOSList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-2xl bg-card overflow-hidden divide-y divide-border", className)}>
      {children}
    </div>
  );
}

interface IOSListItemProps {
  label: React.ReactNode;
  description?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  /** Shows a trailing chevron and presses like a nav row — pass onClick or an href-wrapping parent. */
  chevron?: boolean;
  onClick?: () => void;
  className?: string;
}

export function IOSListItem({ label, description, leading, trailing, chevron, onClick, className }: IOSListItemProps) {
  const clickable = !!onClick || chevron;
  const Component = clickable ? "button" : "div";

  return (
    <Component
      type={clickable ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 min-h-12 px-4 py-2.5 text-left transition-colors",
        clickable && "hover:bg-muted/40 active:bg-muted/60 press",
        className,
      )}
    >
      {leading && <span className="shrink-0 flex items-center justify-center">{leading}</span>}
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {description && <span className="block text-xs text-muted-foreground mt-0.5">{description}</span>}
      </span>
      {trailing && <span className="shrink-0 flex items-center text-sm text-muted-foreground">{trailing}</span>}
      {chevron && <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />}
    </Component>
  );
}
