import {
  type Allocation,
  type Batch,
  type CoopConfig,
  type DecisionCase,
  type Farmer,
  type HarvestOrder,
  type MarketSignal,
  type Order,
  type PickingEntry,
  type ProtocolStep,
  type ProtocolStepKey,
  type SustainabilityRecord,
} from "@/types";
import { buildPickingGuide } from "./domain/guide";
import { emptyProtocol, PROTOCOL_STEPS } from "./domain/protocol";

export interface SeedData {
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
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Demonstration data — generated relative to the moment the system is first opened. */
export function buildSeed(now: number): SeedData {
  const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();

  const config: CoopConfig = {
    coopName: "Da Lat Green Produce Co-operative",
    surplusThresholdKg: 80,
    urgentWithinHours: 12,
  };

  const orders: Order[] = [
    {
      id: "DH-1042",
      buyerName: "FreshMart Supermarket",
      product: "strawberry",
      qtyKg: 300,
      spec: {
        grade: "A",
        sizeMinMm: 28,
        sizeMaxMm: 40,
        colorNote: "Even red from shoulder to tip, calyx still green and fresh",
        brixMin: 9,
        rejectNotes: "bruised fruit, white mould spots, dried calyx",
      },
      dueDate: iso(2 * DAY),
      offerPrice: 168000,
      salesChannel: "supermarket",
      source: "zalo",
      notes: "Two deliveries of 150 kg each. Lidded 500 g punnets.",
      status: "confirmed",
      createdAt: iso(-5 * DAY),
      updatedAt: iso(-20 * HOUR),
      specRevisions: 1,
    },
    {
      id: "DH-1043",
      buyerName: "Mekong Fruits Export",
      product: "mango",
      qtyKg: 500,
      spec: {
        grade: "A",
        sizeMinMm: 90,
        colorNote: "Green skin just turning yellow, no sunburn",
        brixMin: 12,
        rejectNotes: "scarring over 2 cm, sap burn",
      },
      dueDate: iso(4 * DAY),
      offerPrice: 47000,
      salesChannel: "export",
      source: "email",
      notes: "Grading photographs required with every batch.",
      status: "confirmed",
      createdAt: iso(-3 * DAY),
      updatedAt: iso(-3 * DAY),
      specRevisions: 0,
    },
    {
      id: "DH-1044",
      buyerName: "Thu Duc Wholesale Depot — Mr Bay",
      product: "dragon_fruit",
      qtyKg: 800,
      spec: {
        grade: "B",
        sizeMinMm: 0,
        colorNote: "Slight colour variation allowed, bracts still fresh",
      },
      dueDate: iso(3 * DAY),
      offerPrice: 19500,
      salesChannel: "wholesale",
      source: "phone",
      notes: "Agreed by phone; final volume still to be confirmed.",
      status: "draft",
      createdAt: iso(-1 * DAY),
      updatedAt: iso(-1 * DAY),
      specRevisions: 0,
    },
    {
      id: "DH-1045",
      buyerName: "Organic Home Stores",
      product: "avocado",
      qtyKg: 200,
      spec: {
        grade: "A",
        sizeMinMm: 70,
        colorNote: "Glossy green skin, firm to the touch, not yet soft",
      },
      dueDate: iso(28 * HOUR),
      offerPrice: 60000,
      salesChannel: "retail",
      source: "zalo",
      status: "fulfilled",
      createdAt: iso(-2 * DAY),
      updatedAt: iso(-2 * DAY),
      specRevisions: 0,
    },
  ];

  const signals: MarketSignal[] = [
    {
      id: "TT-201",
      market: "GreenLine Supermarket",
      product: "strawberry",
      grade: "B",
      qtyKg: 120,
      price: 112000,
      validUntil: iso(2 * DAY),
      source: "zalo",
      enteredBy: "Sales — Trang",
      createdAt: iso(-6 * HOUR),
    },
    {
      id: "TT-202",
      market: "Binh Dien Wholesale Market",
      product: "dragon_fruit",
      grade: "B",
      qtyKg: 1000,
      price: 17500,
      validUntil: iso(1 * DAY),
      source: "phone",
      enteredBy: "Sales — Khoa",
      createdAt: iso(-10 * HOUR),
    },
    {
      id: "TT-203",
      market: "Vfruit Juice Plant",
      product: "mango",
      grade: "PROCESS",
      qtyKg: 2000,
      price: 12500,
      validUntil: iso(5 * DAY),
      source: "email",
      enteredBy: "Sales — Trang",
      createdAt: iso(-30 * HOUR),
    },
  ];

  // The picking team. Plots are the ones each person usually works, which is
  // what puts their own jobs at the top of their picking screen.
  const farmers: Farmer[] = [
    {
      id: "ND-01",
      name: "Nguyen Van Tuan",
      code: "TU",
      plots: ["Plot A1 — Tuan household", "Plot A2 — Tuan household"],
      active: true,
    },
    {
      id: "ND-02",
      name: "Tran Thi Lien",
      code: "LI",
      plots: ["Plot C1 — Lien household"],
      active: true,
    },
    {
      id: "ND-03",
      name: "Le Van Sau",
      code: "SA",
      plots: ["Plot C2 — Sau household"],
      active: true,
    },
    {
      id: "ND-04",
      name: "Pham Thi Thanh",
      code: "TH",
      plots: ["Plot B4 — Thanh household"],
      active: true,
    },
    {
      id: "ND-05",
      name: "Hoang Van Binh",
      code: "BI",
      plots: ["Plot D3 — Long Binh Co-op"],
      active: true,
    },
  ];

  const harvestOrders: HarvestOrder[] = [
    {
      id: "LTH-501",
      product: "strawberry",
      targetKg: 350,
      farm: "Plot A2 — Tuan household",
      deadline: iso(9 * HOUR),
      orderId: "DH-1042",
      guide: buildPickingGuide(
        "strawberry",
        orders[0].spec,
        1,
        "FreshMart Supermarket"
      ),
      status: "in_progress",
      pickedKg: 180,
      assignedFarmerIds: ["ND-01", "ND-04"],
      incidents: [
        {
          id: "SC-1",
          at: iso(-3 * HOUR),
          by: "Field — Mr Hung",
          note: "Light frost damage on the last row; fruit smaller than specification.",
        },
      ],
      createdAt: iso(-20 * HOUR),
      startedAt: iso(-6 * HOUR),
    },
    {
      id: "LTH-502",
      product: "mango",
      targetKg: 520,
      farm: "Plot C1 — Lien household",
      deadline: iso(2 * DAY),
      orderId: "DH-1043",
      guide: buildPickingGuide(
        "mango",
        orders[1].spec,
        0,
        "Mekong Fruits Export"
      ),
      status: "pending",
      pickedKg: 0,
      assignedFarmerIds: ["ND-02", "ND-03"],
      incidents: [],
      createdAt: iso(-8 * HOUR),
    },
    {
      id: "LTH-499",
      product: "strawberry",
      targetKg: 400,
      farm: "Plot A1 — Tuan household",
      deadline: iso(-30 * HOUR),
      orderId: "DH-1042",
      guide: buildPickingGuide("strawberry", orders[0].spec, 0),
      status: "done",
      pickedKg: 392,
      assignedFarmerIds: ["ND-01"],
      incidents: [],
      createdAt: iso(-3 * DAY),
      startedAt: iso(-2 * DAY),
      finishedAt: iso(-30 * HOUR),
    },
    {
      id: "LTH-498",
      product: "dragon_fruit",
      targetKg: 900,
      farm: "Plot D3 — Long Binh Co-op",
      deadline: iso(-3 * DAY),
      orderId: "DH-1044",
      guide: buildPickingGuide("dragon_fruit", orders[2].spec, 0),
      status: "done",
      pickedKg: 880,
      assignedFarmerIds: ["ND-05"],
      incidents: [],
      createdAt: iso(-3 * DAY),
      startedAt: iso(-4 * DAY),
      finishedAt: iso(-3 * DAY),
    },
  ];

  // Entries behind LTH-501's 180 kg: two pickers, three size bands, so the
  // supervisor screen has something real to show on first open.
  const pickingEntries: PickingEntry[] = [
    { id: "PE-01", harvestOrderId: "LTH-501", farmerId: "ND-01", product: "strawberry", band: "L", kg: 42, at: iso(-5 * HOUR) },
    { id: "PE-02", harvestOrderId: "LTH-501", farmerId: "ND-01", product: "strawberry", band: "M", kg: 35, at: iso(-4 * HOUR) },
    { id: "PE-03", harvestOrderId: "LTH-501", farmerId: "ND-04", product: "strawberry", band: "L", kg: 28, at: iso(-4 * HOUR) },
    { id: "PE-04", harvestOrderId: "LTH-501", farmerId: "ND-04", product: "strawberry", band: "M", kg: 51, at: iso(-2 * HOUR) },
    { id: "PE-05", harvestOrderId: "LTH-501", farmerId: "ND-01", product: "strawberry", band: "S", kg: 24, at: iso(-1 * HOUR) },
  ];

  const proto = (doneKeys: ProtocolStepKey[], base: number): ProtocolStep[] =>
    emptyProtocol().map((step, i) =>
      doneKeys.includes(step.key)
        ? {
            ...step,
            status: "done" as const,
            at: iso(base + i * 25 * 60_000),
            by: "Packhouse — Nhung",
          }
        : step
    );

  const batches: Batch[] = [
    {
      id: "BF-2608-01",
      harvestOrderId: "LTH-499",
      product: "strawberry",
      origin: "Plot A1 — Tuan household",
      harvestedAt: iso(-30 * HOUR),
      intakeAt: iso(-27 * HOUR),
      totalKg: 392,
      status: "qc_done",
      qc: {
        gradeKg: { A: 240, B: 96, PROCESS: 42, REJECT: 14 },
        notes: "Fruit from the outer rows was undersized and dropped to Grade B.",
        photos: [],
        confirmedAt: iso(-20 * HOUR),
        confirmedBy: "Quality Control — Nhung",
      },
      protocol: emptyProtocol(),
      createdAt: iso(-30 * HOUR),
    },
    {
      id: "BF-2608-02",
      harvestOrderId: "LTH-498",
      product: "dragon_fruit",
      origin: "Plot D3 — Long Binh Co-op",
      harvestedAt: iso(-3 * DAY),
      intakeAt: iso(-3 * DAY + 4 * HOUR),
      totalKg: 880,
      status: "processing",
      qc: {
        gradeKg: { A: 210, B: 540, PROCESS: 105, REJECT: 25 },
        notes: "Bracts slightly wilted after transport in the midday heat.",
        photos: [],
        confirmedAt: iso(-2 * DAY - 18 * HOUR),
        confirmedBy: "Quality Control — Nhung",
      },
      publicNote:
        "This batch was preserved under the BioFresh Field Protocol.",
      protocol: proto(["sort", "solution", "dip", "dry"], -20 * HOUR),
      createdAt: iso(-3 * DAY),
    },
    {
      id: "BF-2608-03",
      product: "mango",
      origin: "Plot C2 — Sau household",
      harvestedAt: iso(-5 * HOUR),
      totalKg: 310,
      status: "intake",
      protocol: emptyProtocol(),
      createdAt: iso(-5 * HOUR),
    },
    {
      id: "BF-2607-24",
      product: "avocado",
      origin: "Plot B4 — Thanh household",
      harvestedAt: iso(-9 * DAY),
      intakeAt: iso(-9 * DAY + 3 * HOUR),
      totalKg: 260,
      status: "closed",
      qc: {
        gradeKg: { A: 205, B: 40, PROCESS: 10, REJECT: 5 },
        notes: "Batch met the retail specification and was packed in 5 kg cartons.",
        photos: [],
        confirmedAt: iso(-8 * DAY - 20 * HOUR),
        confirmedBy: "Quality Control — Nhung",
      },
      publicNote:
        "All six steps of the BioFresh Field Protocol were completed before dispatch.",
      protocol: proto(
        PROTOCOL_STEPS.map((s) => s.key),
        -8 * DAY - 12 * HOUR
      ),
      outcome: {
        shippedKg: 205,
        acceptedKg: 199,
        rejectedKg: 6,
        actualRevenue: 199 * 58000,
        closedAt: iso(-6 * DAY),
      },
      createdAt: iso(-9 * DAY),
    },
  ];

  const allocations: Allocation[] = [
    {
      id: "PB-9001",
      batchId: "BF-2608-01",
      grade: "A",
      kg: 150,
      orderId: "DH-1042",
      channel: "supermarket",
      label: "FreshMart Supermarket — delivery 1",
      status: "confirmed",
      createdAt: iso(-19 * HOUR),
      createdBy: "Sales — Trang",
    },
    {
      id: "PB-9002",
      batchId: "BF-2608-02",
      grade: "B",
      kg: 400,
      orderId: "DH-1044",
      channel: "wholesale",
      label: "Thu Duc Wholesale Depot — Mr Bay",
      status: "planned",
      createdAt: iso(-2 * DAY),
      createdBy: "Sales — Khoa",
    },
    {
      id: "PB-8990",
      batchId: "BF-2607-24",
      grade: "A",
      kg: 205,
      orderId: "DH-1045",
      channel: "retail",
      label: "Organic Home — July order",
      status: "shipped",
      createdAt: iso(-8 * DAY),
      createdBy: "Sales — Trang",
    },
  ];

  const cases: DecisionCase[] = [];

  // One closed batch already has a history worth showing on the manager screen.
  const sustainability: SustainabilityRecord[] = [
    {
      id: "SR-01",
      batchId: "BF-2607-24",
      product: "avocado",
      grade: "A",
      kg: 205,
      outcome: "sold",
      note: "Accepted in full by the buyer on batch BF-2607-24.",
      at: iso(-4 * DAY),
    },
    {
      id: "SR-02",
      batchId: "BF-2607-24",
      product: "avocado",
      grade: "PROCESS",
      kg: 10,
      outcome: "processed",
      note: 'Surplus routed via "Send to processing".',
      at: iso(-4 * DAY),
    },
    {
      id: "SR-03",
      batchId: "BF-2607-24",
      product: "avocado",
      grade: "REJECT",
      kg: 5,
      outcome: "wasted",
      note: "Failed grading — no route available.",
      at: iso(-4 * DAY),
    },
  ];

  return {
    config,
    orders,
    signals,
    farmers,
    harvestOrders,
    pickingEntries,
    batches,
    allocations,
    cases,
    sustainability,
  };
}
