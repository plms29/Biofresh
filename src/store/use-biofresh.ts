"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  type Allocation,
  type Batch,
  type BatchOutcome,
  type BuyerSpec,
  type CoopConfig,
  type DecisionCase,
  type DecisionOption,
  type Grade,
  type HarvestOrder,
  type MarketSignal,
  type Order,
  type ProductKey,
  type ProtocolStepKey,
  type Role,
  type SalesChannel,
} from "@/types";
import { buildSeed } from "@/lib/seed";
import { buildPickingGuide } from "@/lib/domain/guide";
import { emptyProtocol, isProtocolComplete } from "@/lib/domain/protocol";
import { batchLots } from "@/lib/domain/inventory";
import { buildDecisionCase, tasksForOption } from "@/lib/domain/decisions";

/** The signed-in user for each role — the demo has no authentication. */
const ACTOR: Record<Role, string> = {
  sales: "Sales — Trang",
  field: "Field — Mr Hung",
  packhouse: "Packhouse — Nhung",
  manager: "Manager — Mr Dung",
};

export interface ActivityEntry {
  id: string;
  at: string;
  role: Role;
  actor: string;
  text: string;
}

interface State {
  seeded: boolean;
  role: Role;
  config: CoopConfig;
  orders: Order[];
  signals: MarketSignal[];
  harvestOrders: HarvestOrder[];
  batches: Batch[];
  allocations: Allocation[];
  cases: DecisionCase[];
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

  // Field
  startHarvest: (harvestOrderId: string) => void;
  updatePicked: (harvestOrderId: string, pickedKg: number) => void;
  reportIncident: (harvestOrderId: string, note: string) => void;
  finishHarvest: (harvestOrderId: string) => string;

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
  config: {
    coopName: "Da Lat Green Produce Co-operative",
    surplusThresholdKg: 80,
    urgentWithinHours: 12,
  },
  orders: [],
  signals: [],
  harvestOrders: [],
  batches: [],
  allocations: [],
  cases: [],
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

export const useBio = create<BioStore>()(
  persist(
    (set, get) => ({
      ...emptyState,

      ensureSeeded: () => {
        if (get().seeded) return;
        const seed = buildSeed(Date.now());
        set({
          ...seed,
          seeded: true,
          activity: [
            {
              id: uid("AC"),
              at: nowIso(),
              role: "manager",
              actor: ACTOR.manager,
              text: "Demonstration data created for the co-operative.",
            },
          ],
        });
      },

      resetDemo: () => {
        const seed = buildSeed(Date.now());
        set({
          ...emptyState,
          ...seed,
          seeded: true,
          role: get().role,
          activity: [
            {
              id: uid("AC"),
              at: nowIso(),
              role: get().role,
              actor: ACTOR[get().role],
              text: "Demonstration data reset.",
            },
          ],
        });
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
                    order.buyerName
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

      updatePicked: (harvestOrderId, pickedKg) => {
        set((s) => ({
          harvestOrders: s.harvestOrders.map((h) =>
            h.id === harvestOrderId
              ? {
                  ...h,
                  pickedKg: Math.max(0, pickedKg),
                  status: h.status === "pending" ? "in_progress" : h.status,
                  startedAt: h.startedAt ?? nowIso(),
                }
              : h
          ),
        }));
        log(
          set,
          "field",
          `Picked weight for harvest order ${harvestOrderId} updated: ${pickedKg} kg.`
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

      closeBatch: (batchId, outcome) => {
        set((s) => ({
          batches: s.batches.map((b) =>
            b.id === batchId
              ? {
                  ...b,
                  status: "closed",
                  outcome: { ...outcome, closedAt: nowIso() },
                }
              : b
          ),
        }));
        log(
          set,
          get().role,
          `Batch ${batchId} closed: the buyer accepted ${outcome.acceptedKg} kg and rejected ${outcome.rejectedKg} kg.`
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
            ...buildDecisionCase(lot, s.orders, s.signals, s.config, now),
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
    }),
    {
      name: "biofresh-os-mvp",
      version: 4,
      /**
       * Bumped when the stored shape or the seed content changes: v3 added
       * confidence to decision options, v4 moved the demonstration data to
       * English and dropped product emoji. Older data is discarded so
       * `ensureSeeded` loads a fresh set rather than rendering stale strings
       * or options that are missing fields.
       */
      migrate: () => ({ ...emptyState }),
    }
  )
);

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

export { ACTOR };
