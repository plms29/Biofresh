"use client";

import { Check, Lock } from "lucide-react";
import type { Batch } from "@/types";
import { PROTOCOL_STEPS, isProtocolComplete } from "@/lib/domain/protocol";
import { dt } from "@/lib/domain/format";
import { useBio } from "@/store/use-biofresh";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/**
 * Logs the six steps of the BioFresh Field Protocol in order.
 * Rule: handling cannot be marked complete until all six steps are recorded.
 */
export function ProtocolTracker({
  batch,
  readOnly = false,
}: {
  batch: Batch;
  readOnly?: boolean;
}) {
  const logProtocolStep = useBio((s) => s.logProtocolStep);
  const { toast } = useToast();

  const firstPendingIndex = PROTOCOL_STEPS.findIndex(
    (def) => batch.protocol.find((p) => p.key === def.key)?.status !== "done"
  );
  const complete = isProtocolComplete(batch);

  return (
    <div className="flex flex-col gap-2">
      <ol className="flex flex-col gap-2">
        {PROTOCOL_STEPS.map((def, index) => {
          const step = batch.protocol.find((p) => p.key === def.key);
          const done = step?.status === "done";
          const isNext = index === firstPendingIndex;
          const locked = !done && !isNext;
          return (
            <li
              key={def.key}
              className={cn(
                "flex items-start gap-3 rounded-xl px-3.5 py-3 ring-1",
                done
                  ? "bg-leaf-50 ring-leaf-200"
                  : isNext
                    ? "bg-card ring-leaf-300"
                    : "bg-muted/40 ring-border"
              )}
            >
              <span
                className={cn(
                  "tnum mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  done
                    ? "bg-leaf-600 text-white"
                    : isNext
                      ? "bg-leaf-100 text-leaf-800 ring-1 ring-leaf-300"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {done ? <Check className="size-3.5" /> : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{def.label}</p>
                <p className="text-xs text-muted-foreground">
                  {done ? `${step?.by ?? ""} · ${dt(step?.at)}` : def.hint}
                </p>
              </div>
              {readOnly ? null : done ? null : (
                <Button
                  size="sm"
                  variant={isNext ? "default" : "ghost"}
                  disabled={locked}
                  onClick={() => {
                    logProtocolStep(batch.id, def.key);
                    toast(`Step "${def.label}" logged for batch ${batch.id}.`);
                  }}
                >
                  {locked ? <Lock className="size-3.5" /> : "Log step"}
                </Button>
              )}
            </li>
          );
        })}
      </ol>
      {!complete ? (
        <p className="text-xs text-muted-foreground">
          {6 - batch.protocol.filter((p) => p.status === "done").length} mandatory
          steps left. The Process Passport only reads “Complete” once all six are
          recorded.
        </p>
      ) : (
        <p className="text-xs font-medium text-leaf-700">
          All six steps recorded — this batch&rsquo;s Process Passport is now complete.
        </p>
      )}
    </div>
  );
}
