"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  type ActivityEntry,
  type Allocation,
  type Batch,
  type BatchOutcome,
  type BuyerSpec,
  type CoopConfig,
  type DecisionCase,
  type DecisionOption,
  type Farmer,
  type Grade,
  type HarvestOrder,
  type MarketSignal,
  type Order,
  type PickingEntry,
  type ProductKey,
  type ProtocolStepKey,
  type Role,
  type SalesChannel,
  type SizeBand,
  type SustainabilityOutcome,
  type SustainabilityRecord,
} from "@/types";
import { buildSeed } from "@/lib/seed";
import { PRODUCTS } from "@/lib/domain/catalog";
import { buildPickingGuide } from "@/lib/domain/guide";
import { emptyProtocol, isProtocolComplete } from "@/lib/domain/protocol";
import { batchLots } from "@/lib/domain/inventory";
import {
  comparePackout,
  correctiveTargetKg,
  openCorrectiveHarvest,
} from "@/lib/domain/packout";
import { buildDecisionCase, tasksForOption } from "@/lib/domain/decisions";
import { backfillRoster } from "@/lib/domain/picking";
import * as M from "@/lib/supabase/mappers";
import type { Snapshot } from "@/lib/supabase/sync";
import { pullAll, pushAll, subscribeRealtime, syncDiff, wipeAll } from "@/lib/supabase/sync";

/** The signed-in user for each role — the demo has no authentication. */
const ACTOR: Record<Role, string> = {
  sales: "Sales — Trang",
  field: "Field — Mr Hung",
  packhouse: "Packhouse — Nhung",
  manager: "Manager — Mr Dung",
};

interface State {
  seeded: boolean;
  role: Role;
  /**
   * Which picker this device belongs to. Persisted locally so someone at the
   * plot taps their name once, not every time they open the picking screen.
   */
  activeFarmerId: string | null;
  config: CoopConfig;
  orders: Order[];
  signals: MarketSignal[];
  farmers: Farmer[];
  harvestOrders: HarvestOrder[];
  pickingEntries: PickingEntry[];
  batches: Batch[];
  allocations: Allocation[];
  cases: DecisionCase[];
  sustainability: SustainabilityRecord[];
  activity: ActivityEntry[];
}

export interface NewOrderInput {
  buyerName: string;
  product: ProductKey;
  qtyKg: number;
  spec: BuyerSpec;
  dueDate: string;
  offerPrice?: number;
  salesChannel: SalesChannel;
  source: Order["source"];
  notes?: string;
  status: "draft" | "confirmed";
  /** Also create a harvest order for this order straight away. */
  createHarvestOrder: boolean;
  farm?: string;
}

interface Actions {
  ensureSeeded: () => void;
  resetDemo: () => void;
  setRole: (role: Role) => void;

  // Sales
  addOrder: (input: NewOrderInput) => string;
  updateOrderSpec: (orderId: string, spec: BuyerSpec) => void;
  setOrderStatus: (orderId: string, status: Order["status"]) => void;
  addSignal: (
    input: Omit<MarketSignal, "id" | "createdAt" | "enteredBy">
  ) => void;
  allocate: (input: {
    batchId: string;
    grade: Grade;
    kg: number;
    orderId?: string;
    channel?: SalesChannel;
    label: string;
  }) => { ok: boolean; message: string };
  removeAllocation: (allocationId: string) => void;
  confirmAllocation: (allocationId: string) => void;

  /**
   * Raises a second pick against the order a short batch was harvested for.
   * Returns the new harvest order id, or an empty id with the reason it
   * could not be raised.
   */
  raiseCorrectiveHarvest: (
    batchId: string
  ) => { ok: boolean; message: string; harvestOrderId?: string };

  // Field
  startHarvest: (harvestOrderId: string) => void;
  reportIncident: (harvestOrderId: string, note: string) => void;
  finishHarvest: (harvestOrderId: string) => string;
  setAssignedFarmers: (harvestOrderId: string, farmerIds: string[]) => void;

  // Pickers
  setActiveFarmer: (farmerId: string | null) => void;
  addPickingEntry: (input: {
    harvestOrderId: string;
    farmerId: string;
    band: SizeBand;
    kg: number;
  }) => { ok: boolean; message: string };
  removePickingEntry: (entryId: string) => void;

  // Packhouse / Quality Control
  confirmIntake: (batchId: string, totalKg: number) => void;
  saveQc: (
    batchId: string,
    gradeKg: Record<Grade, number>,
    notes: string,
    photos: string[]
  ) => { ok: boolean; message: string };
  logProtocolStep: (
    batchId: string,
    step: ProtocolStepKey,
    note?: string
  ) => void;
  markProcessingDone: (batchId: string) => { ok: boolean; message: string };
  shipBatch: (batchId: string) => void;
  closeBatch: (
    batchId: string,
    outcome: Omit<BatchOutcome, "closedAt">
  ) => void;

  // Manager / Decision Room
  openCase: (batchId: string, grade: Grade) => void;
  refreshCases: () => void;
  chooseOption: (caseId: string, optionId: string) => void;
  toggleTask: (caseId: string, taskId: string) => void;
  setConfig: (config: Partial<CoopConfig>) => void;
}

export type BioStore = State & Actions;

const emptyState: State = {
  seeded: false,
  role: "sales",
  activeFarmerId: null,
  config: {
    coopName: "Da Lat Green Produce Co-operative",
    surplusThresholdKg: 80,
    urgentWithinHours: 12,
  },
  orders: [],
  signals: [],
  farmers: [],
  harvestOrders: [],
  pickingEntries: [],
  batches: [],
  allocations: [],
  cases: [],
  sustainability: [],
  activity: [],
};

let counter = 0;
function uid(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36).slice(-4)}${counter}`;
}

function nowIso() {
  return new Date().toISOString();
}

function batchCode(existing: Batch[]): string {
  const d = new Date();
  const stamp = `${String(d.getFullYear()).slice(2)}${String(
    d.getMonth() + 1
  ).padStart(2, "0")}`;
  const n = existing.length + 12;
  return `BF-${stamp}-${String(n).padStart(2, "0")}`;
}

let realtimeStarted = false;

export const useBio = create<BioStore>()(
  persist(
    (rawSet, get) => {
      /**
       * Every action below calls `set`, exactly as before Supabase existed.
       * This wrapper is the only thing that changed: after the state update
       * runs, it diffs the previous and next slices (by reference — every
       * action already creates a new array/object only where something
       * changed) and pushes just that diff to Supabase. Action bodies never
       * needed to know storage moved from localStorage to a shared database.
       *
       * Realtime merges (see below) call `rawSet` directly, never this
       * wrapper — routing an incoming remote change back through `set` would
       * immediately re-upload it, echoing forever between two open tabs.
       */
      const set: typeof rawSet = (partial, replace) => {
        const prev = get();
        // @ts-expect-error — zustand's setter has two overloads; we forward whichever was called.
        rawSet(partial, replace);
        const next = get();
        void syncDiff(prev, next).catch((err) => {
          console.error("BioFresh: failed to sync a change to Supabase", err);
        });
      };

      return {
        ...emptyState,

        ensureSeeded: () => {
          if (get().seeded) return;
          // Set the guard before the async work starts, so a second caller
          // (e.g. two components mounting in the same tick) doesn't race in.
          rawSet(() => ({ seeded: true }));

          void (async () => {
            try {
              const remote = await pullAll();
              if (remote.config) {
                // The co-op already has shared data — adopt it as-is. Using
                // rawSet (not the syncing `set`) so we don't immediately
                // upload back the exact rows we just downloaded.
                const config = remote.config;

                // Except for one case: a database created before pickers
                // existed comes back with an empty roster, and because
                // `config` is present nothing would ever seed one — the
                // picking screen would stay permanently empty. Restore the
                // roster (and only the assignments nobody has set) and
                // publish just that repair.
                const seed = buildSeed(Date.now());
                const repair = backfillRoster({
                  remoteFarmers: remote.farmers,
                  remoteHarvestOrders: remote.harvestOrders,
                  seedFarmers: seed.farmers,
                  seedHarvestOrders: seed.harvestOrders,
                });

                rawSet(() => ({
                  ...remote,
                  farmers: repair.farmers,
                  harvestOrders: repair.harvestOrders,
                  config,
                  seeded: true,
                }));

                if (repair.changed) {
                  try {
                    await syncDiff(
                      { ...remote, config } as Snapshot,
                      {
                        ...remote,
                        config,
                        farmers: repair.farmers,
                        harvestOrders: repair.harvestOrders,
                      } as Snapshot
                    );
                  } catch (err) {
                    console.error(
                      "BioFresh: could not publish the restored picking roster",
                      err
                    );
                  }
                }
              } else {
                // First time this co-op has opened the app: seed locally,
                // then publish the whole snapshot so every other device sees
                // the same starting point.
                const seed = buildSeed(Date.now());
                const activity: ActivityEntry[] = [
                  {
                    id: uid("AC"),
                    at: nowIso(),
                    role: "manager",
                    actor: ACTOR.manager,
                    text: "Demonstration data created for the co-operative.",
                  },
                ];
                rawSet(() => ({ ...seed, activity, seeded: true }));
                await pushAll({ ...seed, activity });
              }
              startRealtime(rawSet, get);
            } catch (err) {
              console.error(
                "BioFresh: could not reach Supabase, falling back to a local-only demo",
                err
              );
              const seed = buildSeed(Date.now());
              rawSet(() => ({ ...seed, seeded: true }));
            }
          })();
        },

        resetDemo: () => {
          void (async () => {
            try {
              await wipeAll();
            } catch (err) {
              console.error("BioFresh: failed to clear shared data before reset", err);
            }
            const seed = buildSeed(Date.now());
            const activity: ActivityEntry[] = [
              {
                id: uid("AC"),
                at: nowIso(),
                role: get().role,
                actor: ACTOR[get().role],
                text: "Demonstration data reset.",
              },
            ];
            rawSet(() => ({ ...emptyState, ...seed, activity, seeded: true, role: get().role }));
            try {
              await pushAll({ ...seed, activity });
            } catch (err) {
              console.error("BioFresh: failed to publish the reset dataset", err);
            }
          })();
        },

        setRole: (role) => set({ role }),

        // ---------------- Sales ----------------

        addOrder: (input) => {
          const id = `DH-${1046 + get().orders.length}`;
          const order: Order = {
            id,
            buyerName: input.buyerName,
            product: input.product,
            qtyKg: input.qtyKg,
            spec: input.spec,
            dueDate: input.dueDate,
            offerPrice: input.offerPrice,
            salesChannel: input.salesChannel,
            source: input.source,
            notes: input.notes,
            status: input.status,
            createdAt: nowIso(),
            updatedAt: nowIso(),
            specRevisions: 0,
          };
          set((s) => ({ orders: [order, ...s.orders] }));
          log(
            set,
            "sales",
            `Order ${id} entered — ${input.buyerName}, ${input.qtyKg} kg.`
          );

          if (input.createHarvestOrder) {
            const hoId = `LTH-${503 + get().harvestOrders.length}`;
            const ho: HarvestOrder = {
              id: hoId,
              product: input.product,
              targetKg: Math.round(input.qtyKg * 1.15),
              farm: input.farm?.trim() || "No plot assigned",
              deadline: input.dueDate,
              orderId: id,
              guide: buildPickingGuide(
                input.product,
                input.spec,
                0,
                input.buyerName
              ),
              status: "pending",
              pickedKg: 0,
              // Sales raises the job; the Field Supervisor puts a team on it.
              assignedFarmerIds: [],
              incidents: [],
              createdAt: nowIso(),
            };
            set((s) => ({ harvestOrders: [ho, ...s.harvestOrders] }));
            log(
              set,
              "sales",
              `Harvest order ${hoId} created (target ${ho.targetKg} kg) for order ${id}.`
            );
          }
          return id;
        },

        updateOrderSpec: (orderId, spec) => {
          const order = get().orders.find((o) => o.id === orderId);
          if (!order) return;
          const revision = order.specRevisions + 1;
          set((s) => ({
            orders: s.orders.map((o) =>
              o.id === orderId
                ? { ...o, spec, specRevisions: revision, updatedAt: nowIso() }
                : o
            ),
            // Specification changed -> every related picking guide updates itself.
            harvestOrders: s.harvestOrders.map((h) =>
              h.orderId === orderId && h.status !== "done"
                ? {
                    ...h,
                    guide: buildPickingGuide(
                      h.product,
                      spec,
                      revision,
                      order.buyerName,
                      // A re-pick keeps its reason across every spec revision.
                      h.guide.corrective
                    ),
                  }
                : h
            ),
          }));
          log(
            set,
            "sales",
            `Specification for order ${orderId} updated (revision ${revision}) — picking guide synced.`
          );
        },

        setOrderStatus: (orderId, status) => {
          set((s) => ({
            orders: s.orders.map((o) =>
              o.id === orderId ? { ...o, status, updatedAt: nowIso() } : o
            ),
          }));
          log(set, "sales", `Order ${orderId} moved to status ${status}.`);
        },

        addSignal: (input) => {
          const signal: MarketSignal = {
            ...input,
            id: `TT-${204 + get().signals.length}`,
            enteredBy: ACTOR[get().role],
            createdAt: nowIso(),
          };
          set((s) => ({ signals: [signal, ...s.signals] }));
          log(
            set,
            "sales",
            `Market signal ${signal.id} entered — ${signal.market}, ${signal.qtyKg} kg.`
          );
          get().refreshCases();
        },

        allocate: ({ batchId, grade, kg, orderId, channel, label }) => {
          const state = get();
          const batch = state.batches.find((b) => b.id === batchId);
          if (!batch?.qc)
            return { ok: false, message: "This batch has not been graded yet." };
          const lot = batchLots(batch, state.allocations).find(
            (l) => l.grade === grade
          );
          if (!lot) return { ok: false, message: "That sub-lot does not exist." };
          if (kg <= 0) return { ok: false, message: "The weight must be above 0 kg." };
          if (kg > lot.availableKg)
            return {
              ok: false,
              message: `Only ${lot.availableKg} kg is still available in this grade.`,
            };

          const allocation: Allocation = {
            id: uid("PB"),
            batchId,
            grade,
            kg,
            orderId,
            channel,
            label,
            status: "planned",
            createdAt: nowIso(),
            createdBy: ACTOR[state.role],
          };
          set((s) => ({ allocations: [allocation, ...s.allocations] }));
          log(
            set,
            state.role,
            `Allocated ${kg} kg of ${grade} from batch ${batchId} to ${label}.`
          );
          get().refreshCases();
          return { ok: true, message: `Allocated ${kg} kg to ${label}.` };
        },

        removeAllocation: (allocationId) => {
          const a = get().allocations.find((x) => x.id === allocationId);
          set((s) => ({
            allocations: s.allocations.filter((x) => x.id !== allocationId),
          }));
          if (a)
            log(
              set,
              get().role,
              `Removed the allocation of ${a.kg} kg of ${a.grade} from ${a.label}.`
            );
          get().refreshCases();
        },

        confirmAllocation: (allocationId) => {
          set((s) => ({
            allocations: s.allocations.map((a) =>
              a.id === allocationId ? { ...a, status: "confirmed" } : a
            ),
          }));
          log(set, get().role, `Allocation ${allocationId} confirmed for sale.`);
        },

        /**
         * The packhouse graded a batch below what its confirmed order needs.
         * Rather than let the shortage sit as a warning, the work goes back to
         * the field as a fresh harvest order against the same order and the
         * same team, carrying the reason it was raised.
         */
        raiseCorrectiveHarvest: (batchId) => {
          const state = get();
          const batch = state.batches.find((b) => b.id === batchId);
          if (!batch) return { ok: false, message: "Batch not found." };

          const existing = openCorrectiveHarvest(batchId, state.harvestOrders);
          if (existing)
            return {
              ok: false,
              message: `Corrective harvest order ${existing.id} is already open for this batch.`,
            };

          const comparison = comparePackout({
            batch,
            orders: state.orders,
            harvestOrders: state.harvestOrders,
            allocations: state.allocations,
          });
          if (!comparison || comparison.verdict !== "shortage")
            return {
              ok: false,
              message:
                "This batch is not short of its confirmed order, so there is nothing to re-pick.",
            };

          const { order, shortfallKg } = comparison;
          const source = state.harvestOrders.find(
            (h) => h.id === batch.harvestOrderId
          );
          const id = `LTH-${503 + state.harvestOrders.length}`;
          const ho: HarvestOrder = {
            id,
            product: batch.product,
            targetKg: correctiveTargetKg(shortfallKg),
            farm: source?.farm ?? batch.origin,
            deadline: order.dueDate,
            orderId: order.id,
            guide: buildPickingGuide(
              batch.product,
              order.spec,
              order.specRevisions,
              order.buyerName,
              { batchId, shortfallKg, raisedAt: nowIso() }
            ),
            status: "pending",
            pickedKg: 0,
            // Same team as the original pick — they know the plot and the spec.
            assignedFarmerIds: source?.assignedFarmerIds ?? [],
            incidents: [],
            createdAt: nowIso(),
          };

          set((s) => ({ harvestOrders: [ho, ...s.harvestOrders] }));
          log(
            set,
            get().role,
            `Batch ${batchId} graded ${shortfallKg} kg short of order ${order.id} — corrective harvest order ${id} sent back to the field.`
          );
          return {
            ok: true,
            message: `Corrective harvest order ${id} raised for ${correctiveTargetKg(
              shortfallKg
            )} kg.`,
            harvestOrderId: id,
          };
        },

        // ---------------- Field ----------------

        startHarvest: (harvestOrderId) => {
          set((s) => ({
            harvestOrders: s.harvestOrders.map((h) =>
              h.id === harvestOrderId
                ? { ...h, status: "in_progress", startedAt: nowIso() }
                : h
            ),
          }));
          log(set, "field", `Harvest order ${harvestOrderId} started.`);
        },

        setAssignedFarmers: (harvestOrderId, farmerIds) => {
          set((s) => ({
            harvestOrders: s.harvestOrders.map((h) =>
              h.id === harvestOrderId ? { ...h, assignedFarmerIds: farmerIds } : h
            ),
          }));
          const names = get()
            .farmers.filter((f) => farmerIds.includes(f.id))
            .map((f) => f.name);
          log(
            set,
            "field",
            `Team on ${harvestOrderId}: ${names.length > 0 ? names.join(", ") : "nobody assigned"}.`
          );
        },

        // ---------------- Pickers ----------------

        setActiveFarmer: (farmerId) => set({ activeFarmerId: farmerId }),

        /**
         * Records one weighing at the plot. The harvest order's `pickedKg` is
         * recomputed from every entry rather than incremented, so the total can
         * never drift away from the per-picker detail behind it.
         */
        addPickingEntry: ({ harvestOrderId, farmerId, band, kg }) => {
          const state = get();
          const ho = state.harvestOrders.find((h) => h.id === harvestOrderId);
          if (!ho) return { ok: false, message: "That job no longer exists." };
          if (ho.status === "done")
            return {
              ok: false,
              message: "This job has already gone to the packhouse.",
            };
          if (!(kg > 0)) return { ok: false, message: "Enter a weight above 0 kg." };

          const farmer = state.farmers.find((f) => f.id === farmerId);
          const entry: PickingEntry = {
            id: uid("PE"),
            harvestOrderId,
            farmerId,
            product: ho.product,
            band,
            kg,
            at: nowIso(),
          };
          const entries = [entry, ...state.pickingEntries];
          const total = entries
            .filter((e) => e.harvestOrderId === harvestOrderId)
            .reduce((sum, e) => sum + e.kg, 0);

          set((s) => ({
            pickingEntries: entries,
            harvestOrders: s.harvestOrders.map((h) =>
              h.id === harvestOrderId
                ? {
                    ...h,
                    pickedKg: total,
                    status: h.status === "pending" ? "in_progress" : h.status,
                    startedAt: h.startedAt ?? nowIso(),
                  }
                : h
            ),
          }));
          log(
            set,
            "field",
            `${farmer?.name ?? farmerId} recorded ${kg} kg of ${band} on ${harvestOrderId}.`
          );
          return { ok: true, message: `Recorded ${kg} kg.` };
        },

        removePickingEntry: (entryId) => {
          const state = get();
          const entry = state.pickingEntries.find((e) => e.id === entryId);
          if (!entry) return;
          const entries = state.pickingEntries.filter((e) => e.id !== entryId);
          const total = entries
            .filter((e) => e.harvestOrderId === entry.harvestOrderId)
            .reduce((sum, e) => sum + e.kg, 0);

          set((s) => ({
            pickingEntries: entries,
            harvestOrders: s.harvestOrders.map((h) =>
              h.id === entry.harvestOrderId ? { ...h, pickedKg: total } : h
            ),
          }));
          log(
            set,
            "field",
            `Removed a ${entry.kg} kg entry from ${entry.harvestOrderId}.`
          );
        },

        reportIncident: (harvestOrderId, note) => {
          set((s) => ({
            harvestOrders: s.harvestOrders.map((h) =>
              h.id === harvestOrderId
                ? {
                    ...h,
                    incidents: [
                      {
                        id: uid("SC"),
                        at: nowIso(),
                        by: ACTOR.field,
                        note,
                      },
                      ...h.incidents,
                    ],
                  }
                : h
            ),
          }));
          log(
            set,
            "field",
            `Incident reported on harvest order ${harvestOrderId}: ${note}`
          );
        },

        /** Finishing a harvest order creates the physical batch awaiting packhouse intake. */
        finishHarvest: (harvestOrderId) => {
          const ho = get().harvestOrders.find((h) => h.id === harvestOrderId);
          if (!ho) return "";
          const id = batchCode(get().batches);
          const batch: Batch = {
            id,
            harvestOrderId,
            product: ho.product,
            origin: ho.farm,
            harvestedAt: nowIso(),
            totalKg: ho.pickedKg,
            status: "harvesting",
            protocol: emptyProtocol(),
            createdAt: nowIso(),
          };
          set((s) => ({
            batches: [batch, ...s.batches],
            harvestOrders: s.harvestOrders.map((h) =>
              h.id === harvestOrderId
                ? { ...h, status: "done", finishedAt: nowIso() }
                : h
            ),
          }));
          log(
            set,
            "field",
            `Harvest order ${harvestOrderId} finished; ${ho.pickedKg} kg sent to the packhouse as batch ${id}.`
          );
          return id;
        },

        // ---------------- Packhouse / Quality Control ----------------

        confirmIntake: (batchId, totalKg) => {
          set((s) => ({
            batches: s.batches.map((b) =>
              b.id === batchId
                ? {
                    ...b,
                    totalKg,
                    intakeAt: nowIso(),
                    status: b.status === "harvesting" || b.status === "planned"
                      ? "intake"
                      : b.status,
                  }
                : b
            ),
          }));
          log(set, "packhouse", `Intake confirmed for batch ${batchId}: ${totalKg} kg.`);
        },

        saveQc: (batchId, gradeKg, notes, photos) => {
          const batch = get().batches.find((b) => b.id === batchId);
          if (!batch) return { ok: false, message: "Batch not found." };
          const sum = (Object.values(gradeKg) as number[]).reduce(
            (a, b) => a + b,
            0
          );
          if (sum <= 0)
            return { ok: false, message: "Enter a weight for at least one grade." };
          const allocated = get()
            .allocations.filter((a) => a.batchId === batchId)
            .reduce<Record<string, number>>((acc, a) => {
              acc[a.grade] = (acc[a.grade] ?? 0) + a.kg;
              return acc;
            }, {});
          for (const [grade, kg] of Object.entries(allocated)) {
            if ((gradeKg[grade as Grade] ?? 0) < kg)
              return {
                ok: false,
                message: `Grade ${grade} already has ${kg} kg allocated, so a lower figure cannot be entered.`,
              };
          }

          set((s) => ({
            batches: s.batches.map((b) =>
              b.id === batchId
                ? {
                    ...b,
                    totalKg: sum,
                    intakeAt: b.intakeAt ?? nowIso(),
                    status: "qc_done",
                    qc: {
                      gradeKg,
                      notes,
                      photos,
                      confirmedAt: nowIso(),
                      confirmedBy: ACTOR.packhouse,
                    },
                  }
                : b
            ),
          }));
          log(
            set,
            "packhouse",
            `Grading confirmed for batch ${batchId}: A ${gradeKg.A} · B ${gradeKg.B} · processing ${gradeKg.PROCESS} · reject ${gradeKg.REJECT} kg.`
          );
          get().refreshCases();
          return {
            ok: true,
            message: "Grading confirmed — sellable inventory updated.",
          };
        },

        logProtocolStep: (batchId, step, note) => {
          set((s) => ({
            batches: s.batches.map((b) =>
              b.id === batchId
                ? {
                    ...b,
                    status:
                      b.status === "qc_done" || b.status === "decision"
                        ? "processing"
                        : b.status,
                    protocol: b.protocol.map((p) =>
                      p.key === step
                        ? {
                            ...p,
                            status: "done",
                            at: nowIso(),
                            by: ACTOR[get().role],
                            note,
                          }
                        : p
                    ),
                  }
                : b
            ),
          }));
          log(
            set,
            get().role,
            `Protocol step "${step}" recorded for batch ${batchId}.`
          );
        },

        markProcessingDone: (batchId) => {
          const batch = get().batches.find((b) => b.id === batchId);
          if (!batch) return { ok: false, message: "Batch not found." };
          if (!isProtocolComplete(batch))
            return {
              ok: false,
              message:
                "Not all six steps of the BioFresh Field Protocol have been recorded, so processing cannot be marked complete.",
            };
          set((s) => ({
            batches: s.batches.map((b) =>
              b.id === batchId ? { ...b, status: "processing" } : b
            ),
          }));
          log(
            set,
            "packhouse",
            `Processing and packing complete for batch ${batchId}.`
          );
          return {
            ok: true,
            message: "Processing complete — the Process Passport is now live.",
          };
        },

        shipBatch: (batchId) => {
          set((s) => ({
            batches: s.batches.map((b) =>
              b.id === batchId ? { ...b, status: "shipped" } : b
            ),
            allocations: s.allocations.map((a) =>
              a.batchId === batchId ? { ...a, status: "shipped" } : a
            ),
          }));
          log(set, get().role, `Batch ${batchId} shipped.`);
        },

        /**
         * Records the real delivery result. Anything the buyer sent back does
         * not simply vanish into a number: the shipped allocations are unwound
         * by that amount so the kilograms are unallocated stock again, a
         * decision case is opened against them, and the batch goes back to
         * `decision` rather than `closed`. Rejected produce is exactly the
         * surplus this product exists to catch, so it re-enters the same loop.
         */
        closeBatch: (batchId, outcome) => {
          const state = get();
          const batch = state.batches.find((b) => b.id === batchId);
          if (!batch) return;
          const returned = Math.max(0, outcome.rejectedKg);

          if (returned <= 0) {
            set((s) => ({
              batches: s.batches.map((b) =>
                b.id === batchId
                  ? { ...b, status: "closed", outcome: { ...outcome, closedAt: nowIso() } }
                  : b
              ),
            }));
            recordSustainability(set, {
              batchId,
              product: batch.product,
              grade: "A",
              kg: outcome.acceptedKg,
              outcome: "sold",
              note: `Accepted in full by the buyer on batch ${batchId}.`,
            });
            log(
              set,
              get().role,
              `Batch ${batchId} closed: the buyer accepted ${outcome.acceptedKg} kg with nothing returned.`
            );
            return;
          }

          // Give the returned kilograms back to the sub-lots they shipped from,
          // largest allocation first, so the freed stock lands where it came from.
          let left = returned;
          const shipped = state.allocations
            .filter((a) => a.batchId === batchId && a.status === "shipped")
            .sort((a, b) => b.kg - a.kg);
          const shrunk = new Map<string, number>();
          for (const alloc of shipped) {
            if (left <= 0) break;
            const take = Math.min(alloc.kg, left);
            shrunk.set(alloc.id, alloc.kg - take);
            left -= take;
          }
          const returnedGrade = shipped[0]?.grade ?? "A";

          set((s) => ({
            batches: s.batches.map((b) =>
              b.id === batchId
                ? { ...b, status: "decision", outcome: { ...outcome, closedAt: nowIso() } }
                : b
            ),
            allocations: s.allocations
              .map((a) =>
                shrunk.has(a.id) ? { ...a, kg: shrunk.get(a.id)! } : a
              )
              .filter((a) => a.kg > 0),
          }));

          // Rebuild the lot against the freed stock and open a case on it.
          const after = get();
          const freshBatch = after.batches.find((b) => b.id === batchId);
          const lot = freshBatch
            ? batchLots(freshBatch, after.allocations).find(
                (l) => l.grade === returnedGrade
              )
            : undefined;
          if (lot && lot.availableKg > 0) {
            const built = buildDecisionCase(
              lot,
              after.orders,
              after.signals,
              after.config,
              Date.now(),
              "buyer_rejection"
            );
            set((st) => ({
              cases: [built, ...st.cases.filter((c) => c.id !== built.id)],
            }));
          }

          recordSustainability(set, {
            batchId,
            product: batch.product,
            grade: returnedGrade,
            kg: outcome.acceptedKg,
            outcome: "sold",
            note: `Accepted by the buyer on batch ${batchId}.`,
          });
          log(
            set,
            get().role,
            `Batch ${batchId}: the buyer accepted ${outcome.acceptedKg} kg and returned ${returned} kg — a decision case is open on the returned stock.`
          );
        },

        // ---------------- Decision Room ----------------

        openCase: (batchId, grade) => {
          const s = get();
          const batch = s.batches.find((b) => b.id === batchId);
          if (!batch?.qc) return;
          const lot = batchLots(batch, s.allocations).find((l) => l.grade === grade);
          if (!lot || lot.availableKg <= 0) return;
          const built = buildDecisionCase(
            lot,
            s.orders,
            s.signals,
            s.config,
            Date.now()
          );
          set((st) => ({
            cases: [built, ...st.cases.filter((c) => c.id !== built.id)],
            batches: st.batches.map((b) =>
              b.id === batchId && b.status === "qc_done"
                ? { ...b, status: "decision" }
                : b
            ),
          }));
          log(
            set,
            "manager",
            `Decision case opened for ${batchId} · ${grade} (${lot.availableKg} kg unallocated).`
          );
        },

        /** Rebuilds any undecided case against the latest inventory and market signals. */
        refreshCases: () => {
          const s = get();
          const now = Date.now();
          const next: DecisionCase[] = [];
          for (const c of s.cases) {
            if (c.chosenOptionId) {
              next.push(c);
              continue;
            }
            const batch = s.batches.find((b) => b.id === c.batchId);
            if (!batch?.qc) continue;
            const lot = batchLots(batch, s.allocations).find(
              (l) => l.grade === c.grade
            );
            if (!lot || lot.availableKg <= 0) continue;
            next.push({
              // Rebuild the numbers, but keep why the case was opened and when.
              ...buildDecisionCase(lot, s.orders, s.signals, s.config, now, c.origin),
              createdAt: c.createdAt,
            });
          }
          set({ cases: next });
        },

        chooseOption: (caseId, optionId) => {
          const s = get();
          const kase = s.cases.find((c) => c.id === caseId);
          if (!kase) return;
          const option = kase.options.find((o) => o.id === optionId);
          if (!option) return;
          const lot = {
            batchId: kase.batchId,
            availableKg: kase.unallocatedKg,
          };
          set((st) => ({
            cases: st.cases.map((c) =>
              c.id === caseId
                ? {
                    ...c,
                    chosenOptionId: optionId,
                    decidedAt: nowIso(),
                    decidedBy: ACTOR.manager,
                    tasks: tasksForOption(option, lot),
                  }
                : c
            ),
          }));
          applyDecision(set, get, kase.batchId, kase.grade, option);

          // Committing a decision is the moment this volume stops being at
          // risk, so that is when it earns a line in the sustainability record.
          const batch = s.batches.find((b) => b.id === kase.batchId);
          if (batch && option.kind !== "hold") {
            recordSustainability(set, {
              batchId: kase.batchId,
              product: batch.product,
              grade: kase.grade,
              kg:
                option.kind === "dry"
                  ? kase.unallocatedKg * PRODUCTS[batch.product].dryYield
                  : kase.unallocatedKg,
              outcome: OUTCOME_FOR_DECISION[option.kind],
              note:
                kase.origin === "buyer_rejection"
                  ? `Returned by the buyer, then routed via "${option.label}".`
                  : `Surplus routed via "${option.label}".`,
            });
          }

          log(
            set,
            "manager",
            `Option "${option.label}" chosen for ${kase.batchId} · ${kase.grade}.`
          );
        },

        toggleTask: (caseId, taskId) => {
          set((s) => ({
            cases: s.cases.map((c) =>
              c.id === caseId
                ? {
                    ...c,
                    tasks: c.tasks.map((t) =>
                      t.id === taskId ? { ...t, done: !t.done } : t
                    ),
                  }
                : c
            ),
          }));
        },

        setConfig: (config) => {
          set((s) => ({ config: { ...s.config, ...config } }));
          get().refreshCases();
        },
      };
    },
    {
      name: "biofresh-os-role",
      version: 2,
      /**
       * Only device identity is kept in localStorage: which role this browser
       * is working as, and which picker owns the phone. Every shared table
       * lives in Supabase and is (re)loaded on each visit by `ensureSeeded`,
       * so there is nothing to migrate from the old
       * dataset-in-localStorage versions (1–4).
       */
      partialize: (s) =>
        ({ role: s.role, activeFarmerId: s.activeFarmerId }) as BioStore,
    }
  )
);

/**
 * Appends one line to the record of where produce actually ended up. Written
 * whenever a decision is committed and whenever a batch closes, so "how much
 * did we keep out of the bin" is answerable from data rather than memory.
 */
function recordSustainability(
  set: (fn: (s: State) => Partial<State>) => void,
  input: Omit<SustainabilityRecord, "id" | "at">
) {
  if (input.kg <= 0) return;
  set((s) => ({
    sustainability: [
      { ...input, id: uid("SR"), at: nowIso() },
      ...s.sustainability,
    ],
  }));
}

/** Which sustainability bucket a chosen decision option lands in. */
const OUTCOME_FOR_DECISION: Record<DecisionOption["kind"], SustainabilityOutcome> = {
  sell_now: "sold",
  switch_channel: "sold",
  preserve: "preserved",
  dry: "dried",
  process: "processed",
  hold: "sold",
};

/** Writes an activity log entry — shown in the Operations Centre. */
function log(
  set: (fn: (s: State) => Partial<State>) => void,
  role: Role,
  text: string
) {
  set((s) => ({
    activity: [
      { id: uid("AC"), at: nowIso(), role, actor: ACTOR[role], text },
      ...s.activity,
    ].slice(0, 60),
  }));
}

/**
 * Once the Manager commits to an option, the system creates the matching allocation
 * so the unallocated kilograms no longer sit open in the Decision Room.
 */
function applyDecision(
  set: (fn: (s: State) => Partial<State>) => void,
  get: () => BioStore,
  batchId: string,
  grade: Grade,
  option: DecisionOption
) {
  if (option.kind === "hold") return;
  const state = get();
  const batch = state.batches.find((b) => b.id === batchId);
  if (!batch?.qc) return;
  const lot = batchLots(batch, state.allocations).find((l) => l.grade === grade);
  if (!lot || lot.availableKg <= 0) return;

  const channel: SalesChannel =
    option.kind === "process"
      ? "processing"
      : option.kind === "switch_channel"
        ? "wholesale"
        : "wholesale";

  const allocation: Allocation = {
    id: uid("PB"),
    batchId,
    grade,
    kg: lot.availableKg,
    channel: option.kind === "preserve" ? undefined : channel,
    label:
      option.kind === "preserve"
        ? "Preserved stock — awaiting an order"
        : option.label,
    status: "planned",
    createdAt: nowIso(),
    createdBy: ACTOR.manager,
  };
  set((s) => ({
    allocations: [allocation, ...s.allocations],
    batches: s.batches.map((b) =>
      b.id === batchId
        ? {
            ...b,
            status: option.requiresProtocol ? "processing" : b.status,
          }
        : b
    ),
  }));
}

/**
 * Merges a change that arrived from another tab/device. Always uses
 * `rawSet` — never the syncing `set` — so an incoming remote row is never
 * immediately re-uploaded back to where it came from.
 */
function startRealtime(
  rawSet: (fn: (s: State) => Partial<State>) => void,
  get: () => BioStore
) {
  if (realtimeStarted) return;
  realtimeStarted = true;

  subscribeRealtime((key, eventType, row) => {
    const merge = <T extends { id: string }>(arr: T[], mapped: T): T[] => {
      if (eventType === "DELETE") return arr.filter((x) => x.id !== mapped.id);
      const idx = arr.findIndex((x) => x.id === mapped.id);
      if (idx === -1) return [mapped, ...arr];
      const next = arr.slice();
      next[idx] = mapped;
      return next;
    };

    switch (key) {
      case "orders":
        rawSet((s) => ({ orders: merge(s.orders, M.orderFromRow(row as never)) }));
        return;
      case "signals":
        rawSet((s) => ({ signals: merge(s.signals, M.signalFromRow(row as never)) }));
        return;
      case "farmers":
        rawSet((s) => ({ farmers: merge(s.farmers, M.farmerFromRow(row as never)) }));
        return;
      case "harvestOrders":
        rawSet((s) => ({
          harvestOrders: merge(s.harvestOrders, M.harvestOrderFromRow(row as never)),
        }));
        return;
      case "pickingEntries":
        rawSet((s) => ({
          pickingEntries: merge(s.pickingEntries, M.pickingEntryFromRow(row as never)),
        }));
        return;
      case "batches":
        rawSet((s) => ({ batches: merge(s.batches, M.batchFromRow(row as never)) }));
        get().refreshCases();
        return;
      case "allocations":
        rawSet((s) => ({
          allocations: merge(s.allocations, M.allocationFromRow(row as never)),
        }));
        return;
      case "cases":
        rawSet((s) => ({ cases: merge(s.cases, M.decisionCaseFromRow(row as never)) }));
        return;
      case "sustainability":
        rawSet((s) => ({
          sustainability: merge(
            s.sustainability,
            M.sustainabilityFromRow(row as never)
          ),
        }));
        return;
    }
  });
}

export { ACTOR };
export type { ActivityEntry };
