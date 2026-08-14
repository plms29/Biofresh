"use client";

import { Recycle } from "lucide-react";
import { SUSTAINABILITY_LABEL, type SustainabilityOutcome } from "@/types";
import { useBio } from "@/store/use-biofresh";
import { kg } from "@/lib/domain/format";
import { SectionTitle } from "@/components/common/layout-bits";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Where produce actually ended up. Every line is written by an action someone
 * took — a decision committed, a batch closed — so this is a record, not an
 * estimate. The headline number is the share that reached a person instead of
 * a bin, which is the whole point of the Decision Room.
 */

const ORDER: SustainabilityOutcome[] = [
  "sold",
  "preserved",
  "dried",
  "processed",
  "wasted",
];

const TONE: Record<SustainabilityOutcome, string> = {
  sold: "bg-leaf-500",
  preserved: "bg-leaf-300",
  dried: "bg-sun-300",
  processed: "bg-sky-500",
  wasted: "bg-risk-500",
};

export function SustainabilityPanel() {
  const records = useBio((s) => s.sustainability);

  const totals = ORDER.map((outcome) => ({
    outcome,
    kg: records
      .filter((r) => r.outcome === outcome)
      .reduce((sum, r) => sum + r.kg, 0),
  }));
  const all = totals.reduce((sum, t) => sum + t.kg, 0);
  const saved = all - (totals.find((t) => t.outcome === "wasted")?.kg ?? 0);
  const savedShare = all > 0 ? (saved / all) * 100 : 0;

  return (
    <Card>
      <CardHeader className="border-b">
        <SectionTitle
          icon={Recycle}
          title="Where the produce went"
          hint="Written when a decision is committed and when a batch closes — a record, not an estimate."
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {all === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing recorded yet. Close a batch or commit a decision and it will
            appear here.
          </p>
        ) : (
          <>
            <div>
              <p className="tnum font-heading text-2xl font-semibold">
                {Math.round(savedShare)}%
              </p>
              <p className="text-sm text-muted-foreground">
                of {kg(all)} reached a buyer or a processor instead of being lost
              </p>
            </div>

            {/* One bar, segmented by route. */}
            <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
              {totals
                .filter((t) => t.kg > 0)
                .map((t) => (
                  <span
                    key={t.outcome}
                    className={cn("block h-full", TONE[t.outcome])}
                    style={{ width: `${(t.kg / all) * 100}%` }}
                  />
                ))}
            </div>

            <ul className="flex flex-col gap-2">
              {totals
                .filter((t) => t.kg > 0)
                .map((t) => (
                  <li
                    key={t.outcome}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "size-2.5 shrink-0 rounded-full",
                          TONE[t.outcome]
                        )}
                      />
                      {SUSTAINABILITY_LABEL[t.outcome]}
                    </span>
                    <span className="tnum text-muted-foreground">
                      {kg(t.kg)}
                    </span>
                  </li>
                ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
