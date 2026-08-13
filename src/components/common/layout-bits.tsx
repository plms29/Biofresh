import * as React from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-semibold tracking-[0.14em] text-leaf-600 uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 font-heading text-2xl font-semibold sm:text-[1.7rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionTitle({
  icon: Icon,
  title,
  hint,
  actions,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
          {Icon ? <Icon className="size-4 text-leaf-600" /> : null}
          {title}
        </h2>
        {hint ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      {actions}
    </div>
  );
}

export function Kpi({
  label,
  value,
  sub,
  tone = "neutral",
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "neutral" | "leaf" | "sun" | "risk" | "sky";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const tones = {
    neutral: "bg-card ring-foreground/10 shadow-[var(--shadow-e1)]",
    leaf: "bg-leaf-50 ring-leaf-200",
    sun: "bg-sun-100 ring-sun-300/70",
    risk: "bg-risk-100 ring-risk-300/70",
    sky: "bg-sky-100 ring-sky-500/20",
  }[tone];
  const iconTone = {
    neutral: "text-muted-foreground",
    leaf: "text-leaf-600",
    sun: "text-sun-700",
    risk: "text-risk-700",
    sky: "text-sky-700",
  }[tone];
  return (
    <div className={cn("rounded-xl p-4 ring-1", tones)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        {Icon ? <Icon className={cn("size-4", iconTone)} /> : null}
      </div>
      <p className="tnum mt-2 font-heading text-[1.65rem] leading-none font-semibold tracking-tight">
        {value}
      </p>
      {sub ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{sub}</p>
      ) : null}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
      {Icon ? (
        <span className="mb-1 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </span>
      ) : null}
      <p className="font-heading font-medium">{title}</p>
      {hint ? (
        <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>
      ) : null}
      {action}
    </div>
  );
}

export function DataRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-xs tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className="tnum text-right text-sm font-medium">{children}</span>
    </div>
  );
}
