import type {
  ActivityEntry,
  Allocation,
  Batch,
  BuyerSpec,
  CaseOrigin,
  CoopConfig,
  DecisionCase,
  DecisionOption,
  DecisionTask,
  Farmer,
  Grade,
  HarvestIncident,
  HarvestOrder,
  MarketSignal,
  Order,
  PickingEntry,
  ProtocolStep,
  QcResult,
  SizeBand,
  SustainabilityOutcome,
  SustainabilityRecord,
} from "@/types";

/**
 * Row <-> domain-object mappers, one pair per table in the `biofresh` schema
 * (see supabase/migrations/0001_biofresh_init.sql). Columns are snake_case,
 * domain fields are camelCase; nested structures (spec, protocol, options,
 * incidents, qc, outcome, guide) round-trip through JSONB unchanged.
 */

// ---------- Co-op configuration ----------

export interface ConfigRow {
  id: number;
  coop_name: string;
  surplus_threshold_kg: number;
  urgent_within_hours: number;
}

export const configToRow = (c: CoopConfig): ConfigRow => ({
  id: 1,
  coop_name: c.coopName,
  surplus_threshold_kg: c.surplusThresholdKg,
  urgent_within_hours: c.urgentWithinHours,
});

export const configFromRow = (r: ConfigRow): CoopConfig => ({
  coopName: r.coop_name,
  surplusThresholdKg: r.surplus_threshold_kg,
  urgentWithinHours: r.urgent_within_hours,
});

// ---------- Orders ----------

export interface OrderRow {
  id: string;
  buyer_name: string;
  product: string;
  qty_kg: number;
  spec: BuyerSpec;
  due_date: string;
  offer_price: number | null;
  sales_channel: string;
  source: string;
  notes: string | null;
  status: string;
  spec_revisions: number;
  created_at: string;
  updated_at: string;
}

export const orderToRow = (o: Order): OrderRow => ({
  id: o.id,
  buyer_name: o.buyerName,
  product: o.product,
  qty_kg: o.qtyKg,
  spec: o.spec,
  due_date: o.dueDate,
  offer_price: o.offerPrice ?? null,
  sales_channel: o.salesChannel,
  source: o.source,
  notes: o.notes ?? null,
  status: o.status,
  spec_revisions: o.specRevisions,
  created_at: o.createdAt,
  updated_at: o.updatedAt,
});

export const orderFromRow = (r: OrderRow): Order => ({
  id: r.id,
  buyerName: r.buyer_name,
  product: r.product as Order["product"],
  qtyKg: r.qty_kg,
  spec: r.spec,
  dueDate: r.due_date,
  offerPrice: r.offer_price ?? undefined,
  salesChannel: r.sales_channel as Order["salesChannel"],
  source: r.source as Order["source"],
  notes: r.notes ?? undefined,
  status: r.status as Order["status"],
  specRevisions: r.spec_revisions,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

// ---------- Market signals ----------

export interface SignalRow {
  id: string;
  market: string;
  product: string;
  grade: string;
  qty_kg: number;
  price: number;
  valid_until: string;
  source: string;
  entered_by: string;
  created_at: string;
}

export const signalToRow = (s: MarketSignal): SignalRow => ({
  id: s.id,
  market: s.market,
  product: s.product,
  grade: s.grade,
  qty_kg: s.qtyKg,
  price: s.price,
  valid_until: s.validUntil,
  source: s.source,
  entered_by: s.enteredBy,
  created_at: s.createdAt,
});

export const signalFromRow = (r: SignalRow): MarketSignal => ({
  id: r.id,
  market: r.market,
  product: r.product as MarketSignal["product"],
  grade: r.grade as Grade,
  qtyKg: r.qty_kg,
  price: r.price,
  validUntil: r.valid_until,
  source: r.source as MarketSignal["source"],
  enteredBy: r.entered_by,
  createdAt: r.created_at,
});

// ---------- Harvest orders ----------

export interface HarvestOrderRow {
  id: string;
  product: string;
  target_kg: number;
  farm: string;
  deadline: string;
  order_id: string | null;
  guide: HarvestOrder["guide"];
  status: string;
  picked_kg: number;
  assigned_farmer_ids: string[];
  incidents: HarvestIncident[];
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export const harvestOrderToRow = (h: HarvestOrder): HarvestOrderRow => ({
  id: h.id,
  product: h.product,
  target_kg: h.targetKg,
  farm: h.farm,
  deadline: h.deadline,
  order_id: h.orderId ?? null,
  guide: h.guide,
  status: h.status,
  picked_kg: h.pickedKg,
  assigned_farmer_ids: h.assignedFarmerIds,
  incidents: h.incidents,
  created_at: h.createdAt,
  started_at: h.startedAt ?? null,
  finished_at: h.finishedAt ?? null,
});

export const harvestOrderFromRow = (r: HarvestOrderRow): HarvestOrder => ({
  id: r.id,
  product: r.product as HarvestOrder["product"],
  targetKg: r.target_kg,
  farm: r.farm,
  deadline: r.deadline,
  orderId: r.order_id ?? undefined,
  guide: r.guide,
  status: r.status as HarvestOrder["status"],
  pickedKg: r.picked_kg,
  // Older rows predate the column; default rather than crash the whole load.
  assignedFarmerIds: r.assigned_farmer_ids ?? [],
  incidents: r.incidents,
  createdAt: r.created_at,
  startedAt: r.started_at ?? undefined,
  finishedAt: r.finished_at ?? undefined,
});

// ---------- Pickers ----------

export interface FarmerRow {
  id: string;
  name: string;
  code: string;
  plots: string[];
  active: boolean;
}

export const farmerToRow = (f: Farmer): FarmerRow => ({
  id: f.id,
  name: f.name,
  code: f.code,
  plots: f.plots,
  active: f.active,
});

export const farmerFromRow = (r: FarmerRow): Farmer => ({
  id: r.id,
  name: r.name,
  code: r.code,
  plots: r.plots ?? [],
  active: r.active,
});

export interface PickingEntryRow {
  id: string;
  harvest_order_id: string;
  farmer_id: string;
  product: string;
  band: string;
  kg: number;
  at: string;
}

export const pickingEntryToRow = (e: PickingEntry): PickingEntryRow => ({
  id: e.id,
  harvest_order_id: e.harvestOrderId,
  farmer_id: e.farmerId,
  product: e.product,
  band: e.band,
  kg: e.kg,
  at: e.at,
});

export const pickingEntryFromRow = (r: PickingEntryRow): PickingEntry => ({
  id: r.id,
  harvestOrderId: r.harvest_order_id,
  farmerId: r.farmer_id,
  product: r.product as PickingEntry["product"],
  band: r.band as SizeBand,
  kg: r.kg,
  at: r.at,
});

// ---------- Batches ----------

export interface BatchRow {
  id: string;
  harvest_order_id: string | null;
  product: string;
  origin: string;
  harvested_at: string;
  intake_at: string | null;
  total_kg: number;
  status: string;
  qc: QcResult | null;
  protocol: ProtocolStep[];
  public_note: string | null;
  outcome: Batch["outcome"] | null;
  created_at: string;
}

export const batchToRow = (b: Batch): BatchRow => ({
  id: b.id,
  harvest_order_id: b.harvestOrderId ?? null,
  product: b.product,
  origin: b.origin,
  harvested_at: b.harvestedAt,
  intake_at: b.intakeAt ?? null,
  total_kg: b.totalKg,
  status: b.status,
  qc: b.qc ?? null,
  protocol: b.protocol,
  public_note: b.publicNote ?? null,
  outcome: b.outcome ?? null,
  created_at: b.createdAt,
});

export const batchFromRow = (r: BatchRow): Batch => ({
  id: r.id,
  harvestOrderId: r.harvest_order_id ?? undefined,
  product: r.product as Batch["product"],
  origin: r.origin,
  harvestedAt: r.harvested_at,
  intakeAt: r.intake_at ?? undefined,
  totalKg: r.total_kg,
  status: r.status as Batch["status"],
  qc: r.qc ?? undefined,
  protocol: r.protocol,
  publicNote: r.public_note ?? undefined,
  outcome: r.outcome ?? undefined,
  createdAt: r.created_at,
});

// ---------- Allocations ----------

export interface AllocationRow {
  id: string;
  batch_id: string;
  grade: string;
  kg: number;
  order_id: string | null;
  channel: string | null;
  label: string;
  status: string;
  created_at: string;
  created_by: string;
}

export const allocationToRow = (a: Allocation): AllocationRow => ({
  id: a.id,
  batch_id: a.batchId,
  grade: a.grade,
  kg: a.kg,
  order_id: a.orderId ?? null,
  channel: a.channel ?? null,
  label: a.label,
  status: a.status,
  created_at: a.createdAt,
  created_by: a.createdBy,
});

export const allocationFromRow = (r: AllocationRow): Allocation => ({
  id: r.id,
  batchId: r.batch_id,
  grade: r.grade as Grade,
  kg: r.kg,
  orderId: r.order_id ?? undefined,
  channel: (r.channel as Allocation["channel"]) ?? undefined,
  label: r.label,
  status: r.status as Allocation["status"],
  createdAt: r.created_at,
  createdBy: r.created_by,
});

// ---------- Decision cases ----------

export interface DecisionCaseRow {
  id: string;
  batch_id: string;
  grade: string;
  unallocated_kg: number;
  urgency: string;
  action_deadline: string;
  options: DecisionOption[];
  chosen_option_id: string | null;
  decided_at: string | null;
  decided_by: string | null;
  tasks: DecisionTask[];
  created_at: string;
  origin: string;
}

export const decisionCaseToRow = (c: DecisionCase): DecisionCaseRow => ({
  id: c.id,
  batch_id: c.batchId,
  grade: c.grade,
  unallocated_kg: c.unallocatedKg,
  urgency: c.urgency,
  action_deadline: c.actionDeadline,
  options: c.options,
  chosen_option_id: c.chosenOptionId ?? null,
  decided_at: c.decidedAt ?? null,
  decided_by: c.decidedBy ?? null,
  tasks: c.tasks,
  created_at: c.createdAt,
  origin: c.origin,
});

export const decisionCaseFromRow = (r: DecisionCaseRow): DecisionCase => ({
  id: r.id,
  batchId: r.batch_id,
  grade: r.grade as Grade,
  unallocatedKg: r.unallocated_kg,
  urgency: r.urgency as DecisionCase["urgency"],
  actionDeadline: r.action_deadline,
  options: r.options,
  chosenOptionId: r.chosen_option_id ?? undefined,
  decidedAt: r.decided_at ?? undefined,
  decidedBy: r.decided_by ?? undefined,
  tasks: r.tasks,
  createdAt: r.created_at,
  // Rows written before the column existed were all plain surplus.
  origin: (r.origin as CaseOrigin) ?? "surplus",
});

// ---------- Sustainability ----------

export interface SustainabilityRow {
  id: string;
  batch_id: string;
  product: string;
  grade: string;
  kg: number;
  outcome: string;
  note: string;
  at: string;
}

export const sustainabilityToRow = (s: SustainabilityRecord): SustainabilityRow => ({
  id: s.id,
  batch_id: s.batchId,
  product: s.product,
  grade: s.grade,
  kg: s.kg,
  outcome: s.outcome,
  note: s.note,
  at: s.at,
});

export const sustainabilityFromRow = (r: SustainabilityRow): SustainabilityRecord => ({
  id: r.id,
  batchId: r.batch_id,
  product: r.product as SustainabilityRecord["product"],
  grade: r.grade as Grade,
  kg: r.kg,
  outcome: r.outcome as SustainabilityOutcome,
  note: r.note ?? "",
  at: r.at,
});

// ---------- Activity log ----------

export interface ActivityRow {
  id: string;
  at: string;
  role: string;
  actor: string;
  text: string;
}

export const activityToRow = (a: ActivityEntry): ActivityRow => ({
  id: a.id,
  at: a.at,
  role: a.role,
  actor: a.actor,
  text: a.text,
});

export const activityFromRow = (r: ActivityRow): ActivityEntry => ({
  id: r.id,
  at: r.at,
  role: r.role as ActivityEntry["role"],
  actor: r.actor,
  text: r.text,
});
