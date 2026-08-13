"use client";

import Link from "next/link";
import { ArrowRight, BellRing, PackageX, ShieldAlert, Sprout, TriangleAlert } from "lucide-react";
import type { Alert, AlertKind } from "@/types";
import { cn } from "@/lib/utils";
import { EmptyState } from "./layout-bits";

const ICONS: Record<AlertKind, React.ComponentType<{ className?: string }>> = {
  order_shortage: PackageX,
  surplus: TriangleAlert,
  batch_at_risk: ShieldAlert,
  spec_updated: Sprout,
  protocol_incomplete: BellRing,
};

export function AlertList({
  alerts,
  emptyHint,
  limit,
}: {
  alerts: Alert[];
  emptyHint?: string;
  limit?: number;
}) {
  if (alerts.length === 0) {
    return (
      <EmptyState
        title="No alerts"
        hint={emptyHint ?? "Every order and batch is within safe limits."}
      />
    );
  }
  const shown = limit ? alerts.slice(0, limit) : alerts;
  return (
    <ul className="flex flex-col gap-2">
      {shown.map((a) => {
        const Icon = ICONS[a.kind];
        const tone =
          a.severity === "high"
            ? "bg-risk-100/70 ring-risk-300/60"
            : a.severity === "medium"
              ? "bg-sun-100/70 ring-sun-300/60"
              : "bg-leaf-50 ring-leaf-200";
        const iconTone =
          a.severity === "high"
            ? "text-risk-700"
            : a.severity === "medium"
              ? "text-sun-700"
              : "text-leaf-700";
        const body = (
          <div className={cn("flex items-start gap-3 rounded-xl px-3.5 py-3 ring-1", tone)}>
            <Icon className={cn("mt-0.5 size-4 shrink-0", iconTone)} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{a.title}</p>
              <p className="mt-0.5 text-sm text-foreground/70">{a.detail}</p>
            </div>
            {a.href ? (
              <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            ) : null}
          </div>
        );
        return (
          <li key={a.id}>
            {a.href ? (
              <Link href={a.href} className="block transition-opacity hover:opacity-80">
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        );
      })}
      {limit && alerts.length > limit ? (
        <li className="px-1 text-xs text-muted-foreground">
          and {alerts.length - limit} more alerts…
        </li>
      ) : null}
    </ul>
  );
}
