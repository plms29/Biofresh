"use client";

import { cn } from "@/lib/utils";

/** Chuyển khung nội dung trong cùng một trang. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; badge?: number }[];
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1",
        className
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
            value === o.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
          {o.badge ? (
            <span className="tnum ml-1.5 rounded-full bg-risk-100 px-1.5 text-xs text-risk-700">
              {o.badge}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
