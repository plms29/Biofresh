import {
  SIZE_BAND_LABEL,
  type BuyerSpec,
  type Farmer,
  type HarvestOrder,
  type PickingEntry,
  type ProductKey,
  type SizeBand,
  type SizeBandDef,
} from "@/types";
import { PRODUCTS } from "./catalog";

/** Total kilograms recorded against one harvest order. */
export function pickedTotal(
  harvestOrderId: string,
  entries: PickingEntry[]
): number {
  return entries
    .filter((e) => e.harvestOrderId === harvestOrderId)
    .reduce((sum, e) => sum + e.kg, 0);
}

/** Kilograms per size band for one harvest order, largest band first. */
export function pickedByBand(
  harvestOrderId: string,
  product: ProductKey,
  entries: PickingEntry[]
): { band: SizeBand; label: string; hint: string; kg: number }[] {
  const relevant = entries.filter((e) => e.harvestOrderId === harvestOrderId);
  return PRODUCTS[product].sizeBands.map((def) => ({
    band: def.key,
    label: SIZE_BAND_LABEL[def.key],
    hint: def.hint,
    kg: relevant
      .filter((e) => e.band === def.key)
      .reduce((sum, e) => sum + e.kg, 0),
  }));
}

export interface FarmerTally {
  farmer: Farmer;
  kg: number;
  entries: number;
  lastAt?: string;
}

/** Who picked how much on one harvest order, heaviest first. */
export function tallyByFarmer(
  harvestOrderId: string,
  entries: PickingEntry[],
  farmers: Farmer[]
): FarmerTally[] {
  const relevant = entries.filter((e) => e.harvestOrderId === harvestOrderId);
  return farmers
    .map((farmer) => {
      const mine = relevant.filter((e) => e.farmerId === farmer.id);
      return {
        farmer,
        kg: mine.reduce((sum, e) => sum + e.kg, 0),
        entries: mine.length,
        lastAt: mine.map((e) => e.at).sort().at(-1),
      };
    })
    .filter((t) => t.entries > 0)
    .sort((a, b) => b.kg - a.kg);
}

/** Everything one picker has recorded today, across every job they are on. */
export function farmerDayTotal(
  farmerId: string,
  entries: PickingEntry[],
  now: number
): number {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  return entries
    .filter(
      (e) =>
        e.farmerId === farmerId &&
        new Date(e.at).getTime() >= dayStart.getTime()
    )
    .reduce((sum, e) => sum + e.kg, 0);
}

/** The jobs a picker should see, their own plots first, nearest deadline first. */
export function jobsForFarmer(
  farmerId: string,
  harvestOrders: HarvestOrder[],
  farmers: Farmer[]
): HarvestOrder[] {
  const farmer = farmers.find((f) => f.id === farmerId);
  const plots = new Set(farmer?.plots ?? []);
  return harvestOrders
    .filter((h) => h.status !== "done" && h.assignedFarmerIds.includes(farmerId))
    .sort((a, b) => {
      const aMine = plots.has(a.farm) ? 0 : 1;
      const bMine = plots.has(b.farm) ? 0 : 1;
      return aMine - bMine || a.deadline.localeCompare(b.deadline);
    });
}

/**
 * Repairs a dataset that predates the pickers feature.
 *
 * The boot sequence treats "the co-op config row exists" as "this database is
 * already set up", which is right for transactional data but wrong for a
 * roster that was added later: a database seeded before pickers existed comes
 * back with zero farmers and no assignments, and the picking screen then shows
 * an empty "Who is picking?" list forever, with nothing in the UI able to fix
 * it.
 *
 * Restoring the roster is safe in a way that restoring orders or batches would
 * not be: farmers are reference data with stable ids, so re-adding them is
 * idempotent, and only harvest orders that carry *no* team are touched — a
 * team the supervisor actually chose is never overwritten.
 *
 * Assignments are recovered by id where the seed knows the same job, and
 * otherwise by matching the plot each picker works, so a co-op that has since
 * created its own harvest orders still gets a sensible team.
 */
export function backfillRoster(input: {
  remoteFarmers: Farmer[];
  remoteHarvestOrders: HarvestOrder[];
  seedFarmers: Farmer[];
  seedHarvestOrders: HarvestOrder[];
}): { farmers: Farmer[]; harvestOrders: HarvestOrder[]; changed: boolean } {
  const { remoteFarmers, remoteHarvestOrders, seedFarmers, seedHarvestOrders } =
    input;

  // A roster that already has people in it is the co-op's own — leave it be.
  if (remoteFarmers.length > 0) {
    return {
      farmers: remoteFarmers,
      harvestOrders: remoteHarvestOrders,
      changed: false,
    };
  }
  if (seedFarmers.length === 0) {
    return {
      farmers: remoteFarmers,
      harvestOrders: remoteHarvestOrders,
      changed: false,
    };
  }

  const seedById = new Map(seedHarvestOrders.map((h) => [h.id, h]));
  const validIds = new Set(seedFarmers.map((f) => f.id));

  const harvestOrders = remoteHarvestOrders.map((job) => {
    if (job.assignedFarmerIds.length > 0) return job;

    // Prefer the team the seed put on this exact job.
    const fromSeed = (seedById.get(job.id)?.assignedFarmerIds ?? []).filter(
      (id) => validIds.has(id)
    );
    const assignedFarmerIds =
      fromSeed.length > 0
        ? fromSeed
        : seedFarmers
            .filter((f) => f.active && f.plots.includes(job.farm))
            .map((f) => f.id);

    return assignedFarmerIds.length > 0 ? { ...job, assignedFarmerIds } : job;
  });

  return { farmers: seedFarmers, harvestOrders, changed: true };
}

/**
 * Whether a size band satisfies the buyer's size requirement. Returns
 * `undefined` when no comparison is possible — either the buyer set no size,
 * or this product is traded by weight and carries no millimetre ranges. The
 * picking screen shows a neutral band in that case rather than guessing.
 */
export function bandMatchesSpec(
  def: SizeBandDef,
  spec: BuyerSpec | undefined
): boolean | undefined {
  if (!spec) return undefined;
  if (spec.sizeMinMm === undefined && spec.sizeMaxMm === undefined) return undefined;
  if (def.minMm === undefined && def.maxMm === undefined) return undefined;

  // Treat an open end as unbounded on that side, then test for any overlap.
  const bandLow = def.minMm ?? 0;
  const bandHigh = def.maxMm ?? Number.POSITIVE_INFINITY;
  const wantLow = spec.sizeMinMm ?? 0;
  const wantHigh = spec.sizeMaxMm ?? Number.POSITIVE_INFINITY;
  return bandLow <= wantHigh && bandHigh >= wantLow;
}

/** The band the order is really asking for, when one can be identified. */
export function preferredBand(
  product: ProductKey,
  spec: BuyerSpec | undefined
): SizeBand | undefined {
  const matching = PRODUCTS[product].sizeBands.filter(
    (def) => bandMatchesSpec(def, spec) === true
  );
  return matching.length === 1 ? matching[0].key : undefined;
}
