"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeftRight, ScrollText, Sprout, TriangleAlert } from "lucide-react";
import { GRADE_LABEL, type Batch } from "@/types";
import { useBio } from "@/store/use-biofresh";
import { kg } from "@/lib/domain/format";
import { comparePackout, correctiveTargetKg, openCorrectiveHarvest } from "@/lib/domain/packout";
import { PackoutVerdictTag } from "@/components/common/badges";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/**
 * The comparison the whole operating flow turns on: what this batch actually
 * graded out at, set against what the confirmed order requires.
 *
 * A shortage sends work straight back to the field as a corrective pick; a
 * surplus is what the Decision Room exists for; a match goes out for delivery.
 * Every figure here is read from the grading result, the order and the
 * allocations — nothing is estimated.
 */
export function PackoutPanel({
  batch,
  actions = true,
}: {
  batch: Batch;
  /** Set false on read-only views such as the batch record. */
  actions?: boolean;
}) {
  const orders = useBio((s) => s.orders);
  const harvestOrders = useBio((s) => s.harvestOrders);
  const allocations = useBio((s) => s.allocations);
  const raiseCorrectiveHarvest = useBio((s) => s.raiseCorrectiveHarvest);
  const { toast } = useToast();

  const comparison = comparePackout({ batch, orders, harvestOrders, allocations });
  if (!comparison) return null;

  const {
    order,
    verdict,
    requiredGrade,
    stillNeededKg,
    onSpecKg,
    shortfallKg,
    surplusKg,
    rejectKg,
  } = comparison;
  const corrective = openCorrectiveHarvest(batch.id, harvestOrders);

  return (
    <div className="rounded-xl bg-muted/50 px-3.5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <ArrowLeftRight className="size-3.5" />
          Packout against order {order.id}
        </p>
        <PackoutVerdictTag verdict={verdict} />
      </div>

      <dl className="mt-2.5 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">
            {order.buyerName} still needs
          </dt>
          <dd className="tnum font-medium">
            {kg(stillNeededKg)} {GRADE_LABEL[requiredGrade]}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">This batch graded on spec</dt>
          <dd className="tnum font-medium">{kg(onSpecKg)}</dd>
        </div>
        {shortfallKg > 0 ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Short by</dt>
            <dd className="tnum font-medium text-risk-700">{kg(shortfallKg)}</dd>
          </div>
        ) : null}
        {surplusKg > 0 ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">
              Does not fit this order
            </dt>
            <dd className="tnum font-medium text-sun-700">{kg(surplusKg)}</dd>
          </div>
        ) : null}
        {rejectKg > 0 ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Reject</dt>
            <dd className="tnum">{kg(rejectKg)}</dd>
          </div>
        ) : null}
      </dl>

      {verdict === "shortage" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-risk-100/70 px-3 py-2.5 text-sm text-risk-700 ring-1 ring-risk-300/60">
          <TriangleAlert className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">
            {corrective
              ? `Corrective harvest order ${corrective.id} is with the field for ${kg(
                  corrective.targetKg
                )}.`
              : `The order cannot be filled from this batch. Send it back to the field for a corrective pick of about ${kg(
                  correctiveTargetKg(shortfallKg)
                )}.`}
          </span>
          {actions && !corrective ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const res = raiseCorrectiveHarvest(batch.id);
                toast(res.message, res.ok ? "success" : "error");
              }}
            >
              <Sprout /> Send back for corrective harvesting
            </Button>
          ) : null}
          {corrective ? (
            <Button size="sm" variant="ghost" asChild>
              <Link href="/field">View in the field</Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      {verdict === "surplus" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-sun-100 px-3 py-2.5 text-sm text-sun-700">
          <ScrollText className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">
            The order is covered. {kg(surplusKg)} does not fit it and needs a
            decision before the action deadline.
          </span>
          {actions ? (
            <Button size="sm" variant="secondary" asChild>
              <Link href="/manager">Open the Decision Room</Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      {verdict === "match" ? (
        <p className="mt-3 rounded-lg bg-leaf-50 px-3 py-2.5 text-sm text-leaf-700 ring-1 ring-leaf-200">
          The batch meets the confirmed quantity and grade. Allocate it and send
          it for delivery.
        </p>
      ) : null}
    </div>
  );
}
