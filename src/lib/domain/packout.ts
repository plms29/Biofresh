import {
  type Allocation,
  type Batch,
  type Grade,
  type HarvestOrder,
  type Order,
} from "@/types";

/**
 * The three ways a graded batch can land against the order it was picked for.
 * This is the pivot of the operating flow: everything downstream — delivery,
 * a corrective pick, or the Decision Room — hangs off which one comes out.
 */
export type PackoutVerdict = "shortage" | "match" | "surplus";

export const PACKOUT_VERDICT_LABEL: Record<PackoutVerdict, string> = {
  shortage: "Shortage",
  match: "Match",
  surplus: "Surplus",
};

export interface PackoutComparison {
  batchId: string;
  order: Order;
  verdict: PackoutVerdict;
  /** Grade the buyer confirmed. */
  requiredGrade: Grade;
  /** What the order still needs once other batches allocated to it are counted. */
  stillNeededKg: number;
  /** Graded weight in this batch that meets the confirmed grade. */
  onSpecKg: number;
  /** Of that, the part this batch can actually put against the order. */
  towardsOrderKg: number;
  /** Required grade the batch could not supply — drives a corrective pick. */
  shortfallKg: number;
  /**
   * Sellable and processing weight this order cannot take: other grades, plus
   * anything on-spec above what the order still needed.
   */
  surplusKg: number;
  /** Not sellable at all — counted separately so it never reads as surplus. */
  rejectKg: number;
}

/**
 * Compares the actual packout of one graded batch against the confirmed order
 * it was harvested for.
 *
 * Returns `null` when there is nothing to compare — the batch has not been
 * graded, was not raised against an order, or that order is no longer
 * confirmed. Purely a read over existing records: it computes nothing that is
 * not already in the grading result, the order and the allocations.
 */
export function comparePackout(input: {
  batch: Batch;
  orders: Order[];
  harvestOrders: HarvestOrder[];
  allocations: Allocation[];
}): PackoutComparison | null {
  const { batch, orders, harvestOrders, allocations } = input;
  if (!batch.qc) return null;

  const harvestOrder = harvestOrders.find((h) => h.id === batch.harvestOrderId);
  const orderId = harvestOrder?.orderId;
  if (!orderId) return null;

  const order = orders.find((o) => o.id === orderId);
  if (!order || order.status === "cancelled") return null;

  const requiredGrade = order.spec.grade;

  // Kilograms other batches have already committed to this order. Only those
  // count as covered — weight allocated from this batch is what we are judging.
  const coveredElsewhereKg = allocations
    .filter((a) => a.orderId === order.id && a.batchId !== batch.id)
    .reduce((s, a) => s + a.kg, 0);
  const stillNeededKg = Math.max(0, order.qtyKg - coveredElsewhereKg);

  const onSpecKg = batch.qc.gradeKg[requiredGrade] ?? 0;
  const towardsOrderKg = Math.min(onSpecKg, stillNeededKg);
  const shortfallKg = Math.max(0, stillNeededKg - onSpecKg);

  const rejectKg = batch.qc.gradeKg.REJECT ?? 0;
  const usableKg = (Object.keys(batch.qc.gradeKg) as Grade[])
    .filter((g) => g !== "REJECT")
    .reduce((s, g) => s + (batch.qc!.gradeKg[g] ?? 0), 0);
  const surplusKg = Math.max(0, usableKg - towardsOrderKg);

  const verdict: PackoutVerdict =
    shortfallKg > 0 ? "shortage" : surplusKg > 0 ? "surplus" : "match";

  return {
    batchId: batch.id,
    order,
    verdict,
    requiredGrade,
    stillNeededKg,
    onSpecKg,
    towardsOrderKg,
    shortfallKg,
    surplusKg,
    rejectKg,
  };
}

/**
 * How much to ask the field for on a corrective pick. The same 15% allowance
 * Sales adds when raising the original harvest order, because a second pick
 * loses fruit to grading exactly like the first one did.
 */
export function correctiveTargetKg(shortfallKg: number): number {
  return Math.max(1, Math.round(shortfallKg * 1.15));
}

/** A corrective pick already open against this batch, if there is one. */
export function openCorrectiveHarvest(
  batchId: string,
  harvestOrders: HarvestOrder[]
): HarvestOrder | undefined {
  return harvestOrders.find(
    (h) => h.guide.corrective?.batchId === batchId && h.status !== "done"
  );
}
