import * as React from "react";

import { cn } from "@/lib/utils";

interface SegmentedControlProps<T extends string> {
  options: readonly T[] | T[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  segmentClassName?: string;
}

/**
 * iOS-style segmented control — a rounded pill track with a single floating
 * active segment. Unlike components/ui/tabs.tsx (Radix Tabs, for genuine
 * tabbed content panels), this is a plain controlled value picker meant for
 * filter rows (category pills, status filters, etc).
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  segmentClassName,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-muted/70 p-1 overflow-x-auto no-scrollbar",
        className,
      )}
    >
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option)}
            className={cn(
              "shrink-0 h-8 px-4 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-[0.97]",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
              segmentClassName,
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
