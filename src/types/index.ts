// ============================================================
// BioFresh OS — MVP domain types
// Scope: the four information breakdowns + surplus decision support.
// Buyers are NOT users of the system (they only scan a QR to read
// the Process Passport).
// ============================================================

export type Role = "sales" | "field" | "packhouse" | "manager";

export const ROLE_META: Record<
  Role,
  { label: string; home: string; screen: string; short: string }
> = {
  sales: {
    label: "Sales",
    home: "/sales",
    screen: "Sales Desk",
    short: "Sales",
  },
  field: {
    label: "Field Supervisor",
    home: "/field",
    screen: "Today's Harvest",
    short: "Field",
  },
  packhouse: {
    label: "Packhouse / Quality Control",
    home: "/packhouse",
    screen: "Intake & Grading",
    short: "Packhouse",
  },
  manager: {
    label: "Manager / Co-op Director",
    home: "/manager",
    screen: "Operations Centre + Decision Room",
    short: "Manager",
  },
};

// ---------- Products & grades ----------

export type ProductKey =
  | "strawberry"
  | "dragon_fruit"
  | "mango"
  | "avocado"
  | "passion_fruit";

/**
 * Colour token used to mark a product across the interface.
 * Products are identified by a coloured mark plus their name — never by
 * an emoji, which renders differently on every platform and cannot be
 * themed or contrast-checked.
 */
export type ProductTone =
  | "crimson"
  | "magenta"
  | "amber"
  | "olive"
  | "violet";

export interface ProductMeta {
  key: ProductKey;
  label: string;
  /** Two-letter mark shown inside the coloured product chip. */
  code: string;
  tone: ProductTone;
  unit: "kg";
  /** Hours within which the batch must be acted on after QC (manually configured, not a forecast). */
  actionWindowHours: number;
  /** Internal reference price recorded by the co-op (VND/kg) per grade. */
  refPrice: Record<Grade, number>;
}

/** Quality grade entered by hand at the packhouse. */
export type Grade = "A" | "B" | "PROCESS" | "REJECT";

export const GRADE_LABEL: Record<Grade, string> = {
  A: "Grade A",
  B: "Grade B",
  PROCESS: "Processing",
  REJECT: "Reject",
};

/** Grades that can be sold fresh to buyers. */
export const SELLABLE_GRADES: Grade[] = ["A", "B"];

// ---------- Orders / buyer requests ----------

export type OrderChannel = "zalo" | "email" | "phone" | "pdf_excel" | "walk_in";

export const CHANNEL_LABEL: Record<OrderChannel, string> = {
  zalo: "Zalo",
  email: "Email",
  phone: "Phone",
  pdf_excel: "PDF / Excel",
  walk_in: "In person",
};

export type SalesChannel =
  | "supermarket"
  | "wholesale"
  | "export"
  | "processing"
  | "retail";

export const SALES_CHANNEL_LABEL: Record<SalesChannel, string> = {
  supermarket: "Supermarket",
  wholesale: "Wholesale market",
  export: "Export",
  processing: "Processing plant",
  retail: "Retail / shops",
};

/** Buyer specification — the single source for picking and grading guidance. */
export interface BuyerSpec {
  grade: Grade;
  /** Required diameter / size, in mm. */
  sizeMinMm?: number;
  sizeMaxMm?: number;
  /** Required colour / ripeness description. */
  colorNote?: string;
  /** Minimum sweetness (Brix) if the buyer asks for it. */
  brixMin?: number;
  /** Defects the buyer rejects. */
  rejectNotes?: string;
}

export type OrderStatus = "draft" | "confirmed" | "fulfilled" | "cancelled";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  draft: "Draft",
  confirmed: "Confirmed",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
};

export interface Order {
  id: string;
  buyerName: string;
  product: ProductKey;
  qtyKg: number;
  spec: BuyerSpec;
  dueDate: string; // ISO
  /** Offered price if known (VND/kg). */
  offerPrice?: number;
  salesChannel: SalesChannel;
  source: OrderChannel;
  notes?: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  /** Spec edit history, so field and packhouse notifications stay traceable. */
  specRevisions: number;
}

// ---------- Market signals ----------

export interface MarketSignal {
  id: string;
  market: string; // buyer or marketplace
  product: ProductKey;
  grade: Grade;
  qtyKg: number;
  price: number; // VND/kg
  validUntil: string; // ISO
  source: OrderChannel;
  enteredBy: string;
  createdAt: string;
}

// ---------- Harvest orders ----------

export type HarvestOrderStatus = "pending" | "in_progress" | "done";

export const HARVEST_STATUS_LABEL: Record<HarvestOrderStatus, string> = {
  pending: "Not started",
  in_progress: "Picking",
  done: "Finished",
};

/** Short, visual picking guide generated from the buyer specification. */
export interface PickingGuide {
  headline: string;
  colorHint: string;
  sizeHint: string;
  doList: string[];
  dontList: string[];
  /** Increments each time Sales edits the spec, so the field sees an "updated" flag. */
  revision: number;
}

export interface HarvestIncident {
  id: string;
  at: string;
  by: string;
  note: string;
}

export interface HarvestOrder {
  id: string;
  product: ProductKey;
  targetKg: number;
  farm: string;
  deadline: string; // ISO
  orderId?: string;
  guide: PickingGuide;
  status: HarvestOrderStatus;
  pickedKg: number;
  incidents: HarvestIncident[];
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
}

// ---------- Batches ----------

export type BatchStatus =
  | "planned"
  | "harvesting"
  | "intake"
  | "qc_done"
  | "decision"
  | "processing"
  | "shipped"
  | "closed";

export const BATCH_STATUS_LABEL: Record<BatchStatus, string> = {
  planned: "Planned",
  harvesting: "Harvesting",
  intake: "Received",
  qc_done: "Graded",
  decision: "Decision pending",
  processing: "Processing / Packing",
  shipped: "Shipped",
  closed: "Closed",
};

export const BATCH_STATUS_ORDER: BatchStatus[] = [
  "planned",
  "harvesting",
  "intake",
  "qc_done",
  "decision",
  "processing",
  "shipped",
  "closed",
];

/** Quality control / grading result — entered by hand at the packhouse. */
export interface QcResult {
  gradeKg: Record<Grade, number>;
  notes?: string;
  /** Photos as data URLs or file names (demo). */
  photos: string[];
  confirmedAt: string;
  confirmedBy: string;
}

/** The six steps of the BioFresh Field Protocol. */
export type ProtocolStepKey =
  | "sort"
  | "solution"
  | "dip"
  | "dry"
  | "pack"
  | "sync";

export interface ProtocolStep {
  key: ProtocolStepKey;
  status: "pending" | "done";
  at?: string;
  by?: string;
  note?: string;
}

export interface BatchOutcome {
  shippedKg: number;
  acceptedKg: number;
  rejectedKg: number;
  actualRevenue: number;
  closedAt: string;
}

export interface Batch {
  id: string; // batch code, e.g. BF-2608-01
  harvestOrderId?: string;
  product: ProductKey;
  origin: string; // plot / farm household / co-op
  harvestedAt: string;
  intakeAt?: string;
  totalKg: number;
  status: BatchStatus;
  qc?: QcResult;
  protocol: ProtocolStep[];
  /** Quality note the co-op chooses to publish on the Process Passport. */
  publicNote?: string;
  outcome?: BatchOutcome;
  createdAt: string;
}

// ---------- Allocations ----------

export type AllocationStatus = "planned" | "confirmed" | "shipped";

export const ALLOCATION_STATUS_LABEL: Record<AllocationStatus, string> = {
  planned: "Planned",
  confirmed: "Confirmed",
  shipped: "Shipped",
};

export interface Allocation {
  id: string;
  batchId: string;
  grade: Grade;
  kg: number;
  /** Allocated to an order, or to a sales channel when clearing surplus. */
  orderId?: string;
  channel?: SalesChannel;
  label: string;
  status: AllocationStatus;
  createdAt: string;
  createdBy: string;
}

// ---------- Surplus decision cases ----------

export type DecisionKind =
  | "sell_now"
  | "switch_channel"
  | "preserve"
  | "process"
  | "hold";

export const DECISION_LABEL: Record<DecisionKind, string> = {
  sell_now: "Sell now",
  switch_channel: "Switch channel",
  preserve: "Preserve (BioFresh Protocol)",
  process: "Send to processing",
  hold: "Hold for a better signal",
};

export type Urgency = "low" | "medium" | "high";

export const URGENCY_LABEL: Record<Urgency, string> = {
  low: "Normal",
  medium: "Watch",
  high: "Urgent",
};

export interface DecisionOption {
  id: string;
  kind: DecisionKind;
  label: string;
  detail: string;
  /** Expected net value (VND) = expected revenue − extra cost. */
  netValue: number;
  extraCost: number;
  /** Days until the cash is expected to land. */
  cashInDays: number;
  risk: Urgency;
  riskNote: string;
  /** Data source: orders / market signals / internal reference price. */
  basis: string;
  requiresProtocol: boolean;
  /**
   * How likely the option is to actually happen (0–1): is there a confirmed
   * buyer or not. Net value times this factor gives the expected value, which
   * stops "hold" from looking best simply because nobody has bid yet.
   */
  certainty: number;
  certaintyNote: string;
}

export interface DecisionTask {
  id: string;
  label: string;
  owner: Role;
  done: boolean;
}

export interface DecisionCase {
  id: string;
  batchId: string;
  grade: Grade;
  unallocatedKg: number;
  urgency: Urgency;
  /** Action deadline (internal configuration, not a forecasting model). */
  actionDeadline: string;
  options: DecisionOption[];
  chosenOptionId?: string;
  decidedAt?: string;
  decidedBy?: string;
  tasks: DecisionTask[];
  createdAt: string;
}

// ---------- Alerts ----------

export type AlertKind =
  | "order_shortage"
  | "surplus"
  | "batch_at_risk"
  | "spec_updated"
  | "protocol_incomplete";

export interface Alert {
  id: string;
  kind: AlertKind;
  severity: Urgency;
  title: string;
  detail: string;
  /** Roles that need to see this alert. */
  roles: Role[];
  href?: string;
}

// ---------- Co-op configuration ----------

export interface CoopConfig {
  coopName: string;
  /** Unallocated kg threshold that opens a decision case. */
  surplusThresholdKg: number;
  /** Hours before the action deadline at which a lot counts as urgent. */
  urgentWithinHours: number;
}
