"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  badge?: number;
  /** "risk" for counts that demand attention; "neutral" for plain totals. */
  badgeTone?: "risk" | "neutral";
}

/** Switches the content frame within a single page. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  className?: string;
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  /** Left/right arrows move between tabs, as a tablist is expected to. */
  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      className={cn(
        "flex w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1",
        className
      )}
    >
      {options.map((o, i) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onKeyDown={(e) => onKeyDown(e, i)}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-all duration-150 ease-[var(--ease-out)]",
              selected
                ? "bg-card text-foreground shadow-[var(--shadow-e2)]"
                : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
            )}
          >
            {o.label}
            {o.badge ? (
              <span
                className={cn(
                  "tnum rounded-full px-1.5 text-xs font-medium",
                  o.badgeTone === "risk"
                    ? "bg-risk-100 text-risk-700"
                    : selected
                      ? "bg-muted text-foreground/70"
                      : "bg-card/70 text-muted-foreground"
                )}
              >
                {o.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
