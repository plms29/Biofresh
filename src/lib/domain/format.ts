/** Shared formatting. The interface is English; money stays in VND. */

const LOCALE = "en-GB";

export function vnd(value: number): string {
  return `${new Intl.NumberFormat(LOCALE, {
    maximumFractionDigits: 0,
  }).format(Math.round(value))} ₫`;
}

/** Compact money: 12.5M / 1.2B — used on metric tiles. */
export function vndShort(value: number): string {
  const v = Math.round(value);
  if (Math.abs(v) >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B ₫`;
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M ₫`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K ₫`;
  return `${v} ₫`;
}

export function kg(value: number): string {
  return `${new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 }).format(
    value
  )} kg`;
}

export function num(value: number): string {
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 }).format(
    value
  );
}

const DATE_TIME = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const DATE_ONLY = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const FULL = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function dt(iso?: string): string {
  if (!iso) return "—";
  return DATE_TIME.format(new Date(iso));
}

export function d(iso?: string): string {
  if (!iso) return "—";
  return DATE_ONLY.format(new Date(iso));
}

export function full(iso?: string): string {
  if (!iso) return "—";
  return FULL.format(new Date(iso));
}

/** "5h left" / "2h overdue" — measured against the `now` passed in to avoid SSR drift. */
export function untilText(iso: string, now: number): string {
  const diffMs = new Date(iso).getTime() - now;
  const abs = Math.abs(diffMs);
  const hours = Math.floor(abs / 3_600_000);
  const days = Math.floor(hours / 24);
  const body =
    days >= 1
      ? `${days}d${hours % 24 ? ` ${hours % 24}h` : ""}`
      : hours >= 1
        ? `${hours}h`
        : `${Math.max(1, Math.floor(abs / 60_000))}m`;
  return diffMs >= 0 ? `${body} left` : `${body} overdue`;
}

export function hoursUntil(iso: string, now: number): number {
  return (new Date(iso).getTime() - now) / 3_600_000;
}
