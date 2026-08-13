import {
  SELLABLE_GRADES,
  type Allocation,
  type Batch,
  type Grade,
  type Order,
  type ProductKey,
} from "@/types";
import { PRODUCTS } from "./catalog";

/** A sub-lot split out of the grading result, one per quality grade. */
export interface Lot {
  batchId: string;
  product: ProductKey;
  origin: string;
  grade: Grade;
  qcKg: number;
  allocatedKg: number;
  availableKg: number;
  qcAt: string;
  /** Action deadline = time of grading + the product's configured action window. */
  actionDeadline: string;
}

export function batchLots(batch: Batch, allocations: Allocation[]): Lot[] {
  if (!batch.qc) return [];
  const window = PRODUCTS[batch.product].actionWindowHours;
  const deadline = new Date(
    new Date(batch.qc.confirmedAt).getTime() + window * 3_600_000
  ).toISOString();

  return (Object.keys(batch.qc.gradeKg) as Grade[])
    .filter((g) => batch.qc!.gradeKg[g] > 0)
    .map((grade) => {
      const qcKg = batch.qc!.gradeKg[grade];
      const allocatedKg = allocations
        .filter((a) => a.batchId === batch.id && a.grade === grade)
        .reduce((s, a) => s + a.kg, 0);
      return {
        batchId: batch.id,
        product: batch.product,
        origin: batch.origin,
        grade,
        qcKg,
        allocatedKg,
        availableKg: Math.max(0, qcKg - allocatedKg),
        qcAt: batch.qc!.confirmedAt,
        actionDeadline: deadline,
      };
    });
}

export function allLots(batches: Batch[], allocations: Allocation[]): Lot[] {
  return batches.flatMap((b) => batchLots(b, allocations));
}

/** Sellable inventory (grades A/B only, from graded batches that are still open). */
export interface InventoryRow {
  product: ProductKey;
  grade: Grade;
  availableKg: number;
  qcKg: number;
  lots: Lot[];
}

export function sellableInventory(
  batches: Batch[],
  allocations: Allocation[]
): InventoryRow[] {
  const open = batches.filter((b) => b.status !== "closed" && b.qc);
  const lots = allLots(open, allocations).filter((l) =>
    SELLABLE_GRADES.includes(l.grade)
  );
  const map = new Map<string, InventoryRow>();
  for (const lot of lots) {
    const key = `${lot.product}:${lot.grade}`;
    const row =
      map.get(key) ??
      ({
        product: lot.product,
        grade: lot.grade,
        availableKg: 0,
        qcKg: 0,
        lots: [],
      } satisfies InventoryRow);
    row.availableKg += lot.availableKg;
    row.qcKg += lot.qcKg;
    row.lots.push(lot);
    map.set(key, row);
  }
  return [...map.values()].sort(
    (a, b) =>
      a.product.localeCompare(b.product) || a.grade.localeCompare(b.grade)
  );
}

export function availableFor(
  batches: Batch[],
  allocations: Allocation[],
  product: ProductKey,
  grade: Grade
): number {
  return sellableInventory(batches, allocations)
    .filter((r) => r.product === product && r.grade === grade)
    .reduce((s, r) => s + r.availableKg, 0);
}

/** Kilograms already allocated to a given order. */
export function allocatedForOrder(
  allocations: Allocation[],
  orderId: string
): number {
  return allocations
    .filter((a) => a.orderId === orderId)
    .reduce((s, a) => s + a.kg, 0);
}

export interface OrderCoverage {
  order: Order;
  allocatedKg: number;
  remainingKg: number;
  availableKg: number;
  /** Shortage: available inventory does not cover the remainder of a confirmed order. */
  shortageKg: number;
  overAllocatedKg: number;
}

export function orderCoverage(
  order: Order,
  batches: Batch[],
  allocations: Allocation[]
): OrderCoverage {
  const allocatedKg = allocatedForOrder(allocations, order.id);
  const remainingKg = Math.max(0, order.qtyKg - allocatedKg);
  const availableKg = availableFor(
    batches,
    allocations,
    order.product,
    order.spec.grade
  );
  return {
    order,
    allocatedKg,
    remainingKg,
    availableKg,
    shortageKg: Math.max(0, remainingKg - availableKg),
    overAllocatedKg: Math.max(0, allocatedKg - order.qtyKg),
  };
}

/** Graded weight that is still unallocated (processing grade included). */
export function unallocatedLots(
  batches: Batch[],
  allocations: Allocation[]
): Lot[] {
  return allLots(
    batches.filter((b) => b.status !== "closed" && b.qc),
    allocations
  ).filter((l) => l.grade !== "REJECT" && l.availableKg > 0);
}

/** Value at risk = unallocated kg x internal reference price. */
export function valueAtRisk(lots: Lot[]): number {
  return lots.reduce(
    (s, l) => s + l.availableKg * PRODUCTS[l.product].refPrice[l.grade],
    0
  );
}
