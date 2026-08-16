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

/**
 * Size band recorded in the field by the person picking. This is a different
 * axis from `Grade`: size is what a picker can judge by eye and hand at the
 * bush, grade is a quality call the packhouse makes later. One plot grows
 * several products, and one product comes off the plant in several sizes, so
 * pickers record both.
 */
export type SizeBand = "L" | "M" | "S";

export const SIZE_BAND_LABEL: Record<SizeBand, string> = {
  L: "Large",
  M: "Medium",
  S: "Small",
};

export interface SizeBandDef {
  key: SizeBand;
  /** Plain-language size cue, e.g. "35 mm and up" or "over 500 g". */
  hint: string;
  /** Set only for products a buyer specifies in millimetres, so the picking
   *  screen can mark which band matches the order. */
  minMm?: number;
  maxMm?: number;
}

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
  /** Largest first — the picking screen renders them in this order. */
  sizeBands: SizeBandDef[];
  /** Kilograms of dried product from one kilogram fresh. */
  dryYield: number;
  /** What a kilogram of the dried product fetches (VND/kg). */
  driedPrice: number;
}

// ---------- Pickers ----------

/**
 * Someone who physically picks. Not a system user: there is no login, no
 * password, no email. A picker taps their own name on a shared phone at the
 * plot, and the Field Supervisor manages the roster.
 */
export interface Farmer {
  id: string;
  name: string;
  /** Short code printed on crate labels and shown on the picking screen. */
  code: string;
  /** Plots this person usually works — used to sort their jobs first. */
  plots: string[];
  active: boolean;
}

/**
 * One weighing recorded at the plot: this picker, this harvest order, this
 * size band, this many kilograms. Kept as separate entries rather than a
 * running total so a mistake can be undone without recomputing anyone's day,
 * and so the supervisor can see who picked what.
 */
export interface PickingEntry {
  id: string;
  harvestOrderId: string;
  farmerId: string;
  product: ProductKey;
  band: SizeBand;
  kg: number;
  at: string;
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

/**
 * Why a harvest order exists as a second pick against an order that already
 * has a batch: the packhouse graded that batch and it came up short of the
 * confirmed order, so the work goes straight back to the field.
 *
 * This lives inside `PickingGuide` rather than on `HarvestOrder` on purpose.
 * The guide is stored as a single JSONB column and passes through the mappers
 * untouched, so recording the reason here needs no migration and works on
 * databases that predate the feature. It is also genuinely picking guidance:
 * the field team needs to know they are making up a specific shortfall.
 */
export interface CorrectiveHarvest {
  /** The batch whose grading result fell short. */
  batchId: string;
  /** Kilograms of the required grade the batch was missing. */
  shortfallKg: number;
  raisedAt: string;
}

/** Short, visual picking guide generated from the buyer specification. */
export interface PickingGuide {
  headline: string;
  colorHint: string;
  sizeHint: string;
  doList: string[];
  dontList: string[];
  /** Increments each time Sales edits the spec, so the field sees an "updated" flag. */
  revision: number;
  /** Set only on a re-pick raised to cover a shortage found at the packhouse. */
  corrective?: CorrectiveHarvest;
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
  /** Sum of every PickingEntry on this order — recomputed on each entry, never
   *  edited directly, so the total and the per-picker detail can't drift apart. */
  pickedKg: number;
  /** The team the Field Supervisor put on this job. */
  assignedFarmerIds: string[];
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
  | "dry"
  | "process"
  | "hold";

export const DECISION_LABEL: Record<DecisionKind, string> = {
  sell_now: "Sell now",
  switch_channel: "Switch channel",
  preserve: "Preserve (BioFresh Protocol)",
  dry: "Dry it",
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
  /**
   * Extra handling the co-op has to do itself before this option pays: steps a
   * person records, not money. 0 means the lot leaves exactly as it stands.
   * Together with `shelfDaysAfter` this is what the feasibility criterion reads.
   *
   * Optional because decision cases stored before the four criteria shipped
   * carry options without it — `feasibilityProfile` in
   * `lib/domain/decisions.ts` fills a per-kind default rather than rendering a
   * blank cell.
   */
  workSteps?: number;
  /**
   * How many days the produce stays sellable once the action is done. 0 means
   * the option commits the lot now; dried stock keeps for months.
   */
  shelfDaysAfter?: number;
  /** Plain reason behind those two figures, shown under Explain. */
  feasibilityNote?: string;
}

/**
 * The four things a Manager weighs one option by, straight off the operations
 * diagram. Every one is read from figures the option already carries — none of
 * them introduces a new business number.
 */
export type CriterionKey = "profit" | "cash" | "risk" | "feasibility";

export const CRITERION_LABEL: Record<CriterionKey, string> = {
  profit: "Profit",
  cash: "Cash flow",
  risk: "Risk",
  feasibility: "Feasibility",
};

/**
 * Which criterion the Manager is ranking by right now. `balanced` is the
 * co-op's own objective (`riskAdjustedValue`); the others tilt the ranking
 * towards one criterion without ever hiding the other three.
 */
export type DecisionPriority = "balanced" | CriterionKey;

export const PRIORITY_LABEL: Record<DecisionPriority, string> = {
  balanced: "Balanced",
  profit: "Profit first",
  cash: "Cash first",
  risk: "Safety first",
  feasibility: "Feasibility first",
};

export interface DecisionTask {
  id: string;
  label: string;
  owner: Role;
  done: boolean;
}

/** Why a decision case was opened. */
export type CaseOrigin = "surplus" | "buyer_rejection";

export const CASE_ORIGIN_LABEL: Record<CaseOrigin, string> = {
  surplus: "Unsold surplus",
  buyer_rejection: "Returned by the buyer",
};

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
  /** Surplus that never sold, or stock the buyer sent back after delivery. */
  origin: CaseOrigin;
}

// ---------- Decision Room assistant ----------

/**
 * What the Gemini assistant returns for one decision case.
 *
 * The assistant never invents figures. Every number in the Decision Room is
 * computed by `lib/domain/decisions.ts` from orders, market signals and the
 * internal reference price; the assistant only reads those options and argues
 * about them. `recommendedOptionId` must be one of the options it was given —
 * anything else is rejected by the API route.
 */
export interface AdvisorVerdict {
  recommendedOptionId: string;
  /** Why this option, in the manager's language. */
  reasoning: string;
  /** What could go wrong with the recommendation. */
  watchOut: string;
  /** What demand looks like from the open orders and live signals it was shown. */
  demandOutlook: string;
  /** Model's own confidence in the call, 0–1. */
  confidence: number;
  /** Set when the assistant disagrees with the rule-based pick. */
  disagreesWithRules: boolean;
}

// ---------- Sustainability ----------

export type SustainabilityOutcome = "sold" | "preserved" | "dried" | "processed" | "wasted";

export const SUSTAINABILITY_LABEL: Record<SustainabilityOutcome, string> = {
  sold: "Sold fresh",
  preserved: "Preserved and sold later",
  dried: "Dried",
  processed: "Sent to processing",
  wasted: "Lost",
};

/**
 * One line in the co-op's record of where produce actually ended up. Written
 * when a decision is committed and when a batch closes, so "how much did we
 * keep out of the bin this month" is a query rather than a guess.
 */
export interface SustainabilityRecord {
  id: string;
  batchId: string;
  product: ProductKey;
  grade: Grade;
  kg: number;
  outcome: SustainabilityOutcome;
  /** Free-text trace of what caused this line. */
  note: string;
  at: string;
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

// ---------- Activity log ----------

/** One entry in the Operations Centre activity feed. */
export interface ActivityEntry {
  id: string;
  at: string;
  role: Role;
  actor: string;
  text: string;
}

// ---------- Co-op configuration ----------

export interface CoopConfig {
  coopName: string;
  /** Unallocated kg threshold that opens a decision case. */
  surplusThresholdKg: number;
  /** Hours before the action deadline at which a lot counts as urgent. */
  urgentWithinHours: number;
}
