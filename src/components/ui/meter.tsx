import { cn } from "@/lib/utils";

/** Simple ratio bar — used for picking progress and order fill. */
export function Meter({
  value,
  max = 100,
  tone = "leaf",
  className,
}: {
  value: number;
  max?: number;
  tone?: "leaf" | "sun" | "risk" | "sky";
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const bar = {
    leaf: "bg-leaf-500",
    sun: "bg-sun-500",
    risk: "bg-risk-500",
    sky: "bg-sky-500",
  }[tone];
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300 ease-[var(--ease-out)]",
          bar
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
