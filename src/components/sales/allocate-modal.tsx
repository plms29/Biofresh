"use client";

import * as React from "react";
import {
  GRADE_LABEL,
  SALES_CHANNEL_LABEL,
  type Grade,
  type SalesChannel,
} from "@/types";
import { PRODUCTS } from "@/lib/domain/catalog";
import { batchLots } from "@/lib/domain/inventory";
import { kg, untilText } from "@/lib/domain/format";
import { useBio } from "@/store/use-biofresh";
import { useNow } from "@/hooks/use-client-state";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Select } from "@/components/ui/field";
import { GradeTag } from "@/components/common/badges";
import { useToast } from "@/components/ui/toast";

export interface AllocateTarget {
  /** Allocate to a specific order. */
  orderId?: string;
  /** Or allocate straight to a sales channel (clearing surplus). */
  channel?: SalesChannel;
  label: string;
  /** Restrict to the grade required by the order specification. */
  grade?: Grade;
  /** Kilograms still outstanding — used as the suggested amount. */
  suggestKg?: number;
  /** Pin the batch when opened from a batch screen. */
  batchId?: string;
}

/** Allocates kilograms from a graded sub-lot to an order or a sales channel. */
export function AllocateModal({
  onClose,
  target,
}: {
  onClose: () => void;
  target: AllocateTarget;
}) {
  const batches = useBio((s) => s.batches);
  const allocations = useBio((s) => s.allocations);
  const orders = useBio((s) => s.orders);
  const allocate = useBio((s) => s.allocate);
  const { toast } = useToast();
  const now = useNow();

  const order = target.orderId
    ? orders.find((o) => o.id === target.orderId)
    : undefined;

  const lots = React.useMemo(() => {
    const openBatches = batches.filter((b) => b.status !== "closed" && b.qc);
    return openBatches
      .flatMap((b) => batchLots(b, allocations))
      .filter((l) => l.availableKg > 0)
      .filter((l) => (target.grade ? l.grade === target.grade : true))
      .filter((l) => (order ? l.product === order.product : true))
      .filter((l) => (target.batchId ? l.batchId === target.batchId : true))
      .sort((a, b) => a.actionDeadline.localeCompare(b.actionDeadline));
  }, [batches, allocations, target, order]);

  // The modal is only mounted while open, so state is seeded from the first matching sub-lot.
  const firstLot = lots[0];
  const [lotKey, setLotKey] = React.useState(
    firstLot ? `${firstLot.batchId}|${firstLot.grade}` : ""
  );
  const [amount, setAmount] = React.useState(() => {
    if (!firstLot) return "";
    const suggested = target?.suggestKg
      ? Math.min(target.suggestKg, firstLot.availableKg)
      : firstLot.availableKg;
    return String(Math.round(suggested));
  });
  const [channel, setChannel] = React.useState<SalesChannel>(
    target?.channel ?? "wholesale"
  );
  const [error, setError] = React.useState<string | null>(null);

  const selected = lots.find((l) => `${l.batchId}|${l.grade}` === lotKey);

  const submit = () => {
    if (!selected) return setError("Select a sub-lot to allocate from.");
    const value = Number(amount);
    if (!value || value <= 0) return setError("Enter a quantity greater than 0 kg.");
    const res = allocate({
      batchId: selected.batchId,
      grade: selected.grade,
      kg: value,
      orderId: target.orderId,
      channel: target.orderId ? order?.salesChannel : channel,
      label: target.orderId
        ? target.label
        : `${target.label} — ${SALES_CHANNEL_LABEL[channel]}`,
    });
    if (!res.ok) return setError(res.message);
    toast(res.message);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Allocate stock"
      description={
        target.orderId
          ? `For order ${target.orderId} — ${target.label}`
          : target.label
      }
      footer={
        <>
          <Button variant="outline" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" onClick={submit} disabled={lots.length === 0}>
            Allocate
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? (
          <p className="rounded-lg bg-risk-100 px-3 py-2 text-sm text-risk-700">
            {error}
          </p>
        ) : null}

        {lots.length === 0 ? (
          <p className="rounded-lg bg-sun-100 px-3 py-2.5 text-sm text-sun-700">
            No matching sub-lot is available. Wait for the packhouse to confirm
            grading, or raise another harvest order.
          </p>
        ) : (
          <>
            <Field label="Available sub-lot">
              <Select value={lotKey} onChange={(e) => setLotKey(e.target.value)}>
                {lots.map((l) => (
                  <option
                    key={`${l.batchId}|${l.grade}`}
                    value={`${l.batchId}|${l.grade}`}
                  >
                    {l.batchId} · {GRADE_LABEL[l.grade]} ·{" "}
                    {PRODUCTS[l.product].label} · {l.availableKg} kg left
                  </option>
                ))}
              </Select>
            </Field>

            {selected ? (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-3.5 py-3 text-sm">
                <div>
                  <p className="font-medium">{selected.batchId}</p>
                  <p className="text-xs text-muted-foreground">
                    {selected.origin}
                  </p>
                </div>
                <div className="text-right">
                  <GradeTag grade={selected.grade} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    action deadline ·{" "}
                    {now ? untilText(selected.actionDeadline, now) : "—"}
                  </p>
                </div>
              </div>
            ) : null}

            <Field
              label="Quantity to allocate (kg)"
              hint={
                selected
                  ? `Up to ${kg(selected.availableKg)} available in this sub-lot.`
                  : undefined
              }
            >
              <Input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>

            {!target.orderId ? (
              <Field label="Sales channel">
                <Select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as SalesChannel)}
                >
                  {(Object.keys(SALES_CHANNEL_LABEL) as SalesChannel[]).map(
                    (c) => (
                      <option key={c} value={c}>
                        {SALES_CHANNEL_LABEL[c]}
                      </option>
                    )
                  )}
                </Select>
              </Field>
            ) : null}
          </>
        )}
      </div>
    </Modal>
  );
}
