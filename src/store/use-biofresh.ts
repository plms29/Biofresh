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

/** Người dùng đang đăng nhập theo vai trò — bản demo không có xác thực. */
const ACTOR: Record<Role, string> = {
  sales: "Bán hàng — Trang",
  field: "Ngoài vườn — chú Hùng",
  packhouse: "Kho — Nhung",
  manager: "Quản lý — anh Dũng",
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
  /** Tạo luôn lệnh thu hoạch cho đơn này. */
  createHarvestOrder: boolean;
  farm?: string;
}

interface Actions {
  ensureSeeded: () => void;
  resetDemo: () => void;
  setRole: (role: Role) => void;

  // Bán hàng
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

  // Ngoài vườn
  startHarvest: (harvestOrderId: string) => void;
  updatePicked: (harvestOrderId: string, pickedKg: number) => void;
  reportIncident: (harvestOrderId: string, note: string) => void;
  finishHarvest: (harvestOrderId: string) => string;

  // Kho đóng gói / Kiểm soát chất lượng
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

  // Quản lý / Phòng quyết định
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
    coopName: "HTX Nông sản Đà Lạt Xanh",
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
              text: "Khởi tạo dữ liệu trình diễn cho HTX.",
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
              text: "Đặt lại dữ liệu trình diễn.",
            },
          ],
        });
      },

      setRole: (role) => set({ role }),

      // ---------------- Bán hàng ----------------

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
        log(set, "sales", `Nhập đơn ${id} — ${input.buyerName}, ${input.qtyKg} kg.`);

        if (input.createHarvestOrder) {
          const hoId = `LTH-${503 + get().harvestOrders.length}`;
          const ho: HarvestOrder = {
            id: hoId,
            product: input.product,
            targetKg: Math.round(input.qtyKg * 1.15),
            farm: input.farm?.trim() || "Chưa phân vườn",
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
            `Tạo lệnh thu hoạch ${hoId} (${ho.targetKg} kg mục tiêu) cho đơn ${id}.`
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
          // Tiêu chuẩn đổi -> mọi hướng dẫn hái liên quan tự cập nhật.
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
          `Cập nhật tiêu chuẩn đơn ${orderId} (lần ${revision}) — hướng dẫn hái đã đồng bộ.`
        );
      },

      setOrderStatus: (orderId, status) => {
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === orderId ? { ...o, status, updatedAt: nowIso() } : o
          ),
        }));
        log(set, "sales", `Đơn ${orderId} chuyển trạng thái ${status}.`);
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
          `Nhập tín hiệu thị trường ${signal.id} — ${signal.market}, ${signal.qtyKg} kg.`
        );
        get().refreshCases();
      },

      allocate: ({ batchId, grade, kg, orderId, channel, label }) => {
        const state = get();
        const batch = state.batches.find((b) => b.id === batchId);
        if (!batch?.qc)
          return { ok: false, message: "Lô chưa có kết quả kiểm soát chất lượng." };
        const lot = batchLots(batch, state.allocations).find(
          (l) => l.grade === grade
        );
        if (!lot) return { ok: false, message: "Lô con không tồn tại." };
        if (kg <= 0) return { ok: false, message: "Số kg phải lớn hơn 0." };
        if (kg > lot.availableKg)
          return {
            ok: false,
            message: `Chỉ còn ${lot.availableKg} kg khả dụng ở hạng này.`,
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
          `Phân bổ ${kg} kg ${grade} từ lô ${batchId} cho ${label}.`
        );
        get().refreshCases();
        return { ok: true, message: `Đã phân bổ ${kg} kg cho ${label}.` };
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
            `Bỏ phân bổ ${a.kg} kg ${a.grade} khỏi ${a.label}.`
          );
        get().refreshCases();
      },

      confirmAllocation: (allocationId) => {
        set((s) => ({
          allocations: s.allocations.map((a) =>
            a.id === allocationId ? { ...a, status: "confirmed" } : a
          ),
        }));
        log(set, get().role, `Xác nhận phương án bán cho phân bổ ${allocationId}.`);
      },

      // ---------------- Ngoài vườn ----------------

      startHarvest: (harvestOrderId) => {
        set((s) => ({
          harvestOrders: s.harvestOrders.map((h) =>
            h.id === harvestOrderId
              ? { ...h, status: "in_progress", startedAt: nowIso() }
              : h
          ),
        }));
        log(set, "field", `Bắt đầu lệnh thu hoạch ${harvestOrderId}.`);
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
          `Cập nhật sản lượng lệnh ${harvestOrderId}: ${pickedKg} kg.`
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
        log(set, "field", `Báo sự cố lệnh ${harvestOrderId}: ${note}`);
      },

      /** Kết thúc lệnh hái -> sinh lô hàng vật lý chờ kho đóng gói nhận. */
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
          `Kết thúc lệnh ${harvestOrderId}, chuyển ${ho.pickedKg} kg về kho — lô ${id}.`
        );
        return id;
      },

      // ---------------- Kho đóng gói / Kiểm soát chất lượng ----------------

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
        log(set, "packhouse", `Xác nhận nhập kho lô ${batchId}: ${totalKg} kg.`);
      },

      saveQc: (batchId, gradeKg, notes, photos) => {
        const batch = get().batches.find((b) => b.id === batchId);
        if (!batch) return { ok: false, message: "Không tìm thấy lô." };
        const sum = (Object.values(gradeKg) as number[]).reduce(
          (a, b) => a + b,
          0
        );
        if (sum <= 0)
          return { ok: false, message: "Nhập số kg cho ít nhất một hạng." };
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
              message: `Hạng ${grade} đã phân bổ ${kg} kg, không thể nhập thấp hơn.`,
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
          `Xác nhận phân loại lô ${batchId}: A ${gradeKg.A} · B ${gradeKg.B} · chế biến ${gradeKg.PROCESS} · loại ${gradeKg.REJECT} kg.`
        );
        get().refreshCases();
        return {
          ok: true,
          message: "Đã xác nhận kết quả kiểm soát chất lượng — tồn kho đã cập nhật.",
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
        log(set, get().role, `Ghi nhận bước quy trình "${step}" cho lô ${batchId}.`);
      },

      markProcessingDone: (batchId) => {
        const batch = get().batches.find((b) => b.id === batchId);
        if (!batch) return { ok: false, message: "Không tìm thấy lô." };
        if (!isProtocolComplete(batch))
          return {
            ok: false,
            message:
              "Chưa ghi đủ 6 bước Quy trình Thực địa BioFresh — không thể đánh dấu hoàn tất xử lý.",
          };
        set((s) => ({
          batches: s.batches.map((b) =>
            b.id === batchId ? { ...b, status: "processing" } : b
          ),
        }));
        log(set, "packhouse", `Hoàn tất xử lý/đóng gói lô ${batchId}.`);
        return { ok: true, message: "Đã hoàn tất xử lý — Hộ chiếu Quy trình đã mở." };
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
        log(set, get().role, `Xuất hàng lô ${batchId}.`);
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
          `Đóng lô ${batchId}: khách mua chấp nhận ${outcome.acceptedKg} kg, từ chối ${outcome.rejectedKg} kg.`
        );
      },

      // ---------------- Phòng quyết định ----------------

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
          `Mở ca quyết định cho ${batchId} · ${grade} (${lot.availableKg} kg chưa phân bổ).`
        );
      },

      /** Cập nhật lại các ca chưa quyết định theo tồn kho và tín hiệu mới nhất. */
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
          `Chốt phương án "${option.label}" cho ${kase.batchId} · ${kase.grade}.`
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
      version: 3,
      /**
       * Cấu trúc phương án quyết định đã đổi (thêm khả năng thực hiện).
       * Dữ liệu trình diễn cũ được bỏ đi để `ensureSeeded` nạp lại bộ mới,
       * tránh trường hợp phương án cũ thiếu trường và hiện ra số rỗng.
       */
      migrate: () => ({ ...emptyState }),
    }
  )
);

/** Ghi nhật ký hoạt động — hiển thị ở Trung tâm điều hành. */
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
 * Sau khi Quản lý chốt phương án, hệ thống tự tạo phân bổ tương ứng để
 * số kg chưa phân bổ không còn treo trong Phòng quyết định.
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
        ? "Giữ hàng đã bảo quản — chờ đơn"
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
