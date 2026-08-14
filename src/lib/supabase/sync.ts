import type {
  ActivityEntry,
  Allocation,
  Batch,
  CoopConfig,
  DecisionCase,
  Farmer,
  HarvestOrder,
  MarketSignal,
  Order,
  PickingEntry,
  SustainabilityRecord,
} from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "./client";
import * as M from "./mappers";

export interface Snapshot {
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

/**
 * Write order matters: `farmers` before `harvestOrders` before
 * `pickingEntries`, because a picking entry has foreign keys to both. The
 * per-key loops below iterate this object in insertion order.
 */
const TABLES = {
  orders: { toRow: M.orderToRow, fromRow: M.orderFromRow },
  signals: { toRow: M.signalToRow, fromRow: M.signalFromRow, table: "market_signals" },
  farmers: { toRow: M.farmerToRow, fromRow: M.farmerFromRow },
  harvestOrders: { toRow: M.harvestOrderToRow, fromRow: M.harvestOrderFromRow, table: "harvest_orders" },
  pickingEntries: { toRow: M.pickingEntryToRow, fromRow: M.pickingEntryFromRow, table: "picking_entries" },
  batches: { toRow: M.batchToRow, fromRow: M.batchFromRow },
  allocations: { toRow: M.allocationToRow, fromRow: M.allocationFromRow },
  cases: { toRow: M.decisionCaseToRow, fromRow: M.decisionCaseFromRow, table: "decision_cases" },
  sustainability: { toRow: M.sustainabilityToRow, fromRow: M.sustainabilityFromRow, table: "sustainability_records" },
} as const;

type CollectionKey = keyof typeof TABLES;

function tableName(key: CollectionKey): string {
  return (TABLES[key] as { table?: string }).table ?? key;
}

/**
 * Loads every table. Returns `null` for `config` when the co-op row hasn't
 * been created yet — the caller decides whether that means "first run,
 * seed it" or "something is misconfigured".
 */
export async function pullAll(): Promise<{
  config: CoopConfig | null;
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
}> {
  const supabase = getSupabase();
  const [
    configRes, ordersRes, signalsRes, farmersRes, harvestRes, pickingRes,
    batchesRes, allocRes, casesRes, sustainRes, activityRes,
  ] = await Promise.all([
      supabase.from("coop_config").select("*").eq("id", 1).maybeSingle(),
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("market_signals").select("*").order("created_at", { ascending: false }),
      supabase.from("farmers").select("*").order("name", { ascending: true }),
      supabase.from("harvest_orders").select("*").order("created_at", { ascending: false }),
      supabase.from("picking_entries").select("*").order("at", { ascending: false }),
      supabase.from("batches").select("*").order("created_at", { ascending: false }),
      supabase.from("allocations").select("*").order("created_at", { ascending: false }),
      supabase.from("decision_cases").select("*").order("created_at", { ascending: false }),
      supabase.from("sustainability_records").select("*").order("at", { ascending: false }),
      supabase.from("activity").select("*").order("at", { ascending: false }).limit(60),
    ]);

  for (const res of [
    configRes, ordersRes, signalsRes, farmersRes, harvestRes, pickingRes,
    batchesRes, allocRes, casesRes, sustainRes, activityRes,
  ]) {
    if (res.error) throw res.error;
  }

  return {
    config: configRes.data ? M.configFromRow(configRes.data) : null,
    orders: (ordersRes.data ?? []).map(M.orderFromRow),
    signals: (signalsRes.data ?? []).map(M.signalFromRow),
    farmers: (farmersRes.data ?? []).map(M.farmerFromRow),
    harvestOrders: (harvestRes.data ?? []).map(M.harvestOrderFromRow),
    pickingEntries: (pickingRes.data ?? []).map(M.pickingEntryFromRow),
    batches: (batchesRes.data ?? []).map(M.batchFromRow),
    allocations: (allocRes.data ?? []).map(M.allocationFromRow),
    cases: (casesRes.data ?? []).map(M.decisionCaseFromRow),
    sustainability: (sustainRes.data ?? []).map(M.sustainabilityFromRow),
    activity: (activityRes.data ?? []).map(M.activityFromRow),
  };
}

/** Bulk-writes a full snapshot — used once, the first time a co-op opens the app. */
export async function pushAll(snapshot: Snapshot): Promise<void> {
  const supabase = getSupabase();
  const { error: configError } = await supabase
    .from("coop_config")
    .upsert(M.configToRow(snapshot.config));
  if (configError) throw configError;

  for (const key of Object.keys(TABLES) as CollectionKey[]) {
    const toRow = TABLES[key].toRow as (x: unknown) => unknown;
    const rows = snapshot[key].map(toRow);
    if (rows.length === 0) continue;
    const { error } = await supabase.from(tableName(key)).upsert(rows);
    if (error) throw error;
  }

  if (snapshot.activity.length > 0) {
    const { error } = await supabase.from("activity").upsert(snapshot.activity.map(M.activityToRow));
    if (error) throw error;
  }
}

/** Deletes every row in every BioFresh table — used by "Reset data" once demo data is shared. */
export async function wipeAll(): Promise<void> {
  const supabase = getSupabase();
  // Children before parents, so foreign keys don't block the delete.
  const order = [
    "sustainability_records",
    "decision_cases",
    "allocations",
    "batches",
    "picking_entries",
    "harvest_orders",
    "farmers",
    "orders",
    "market_signals",
    "activity",
  ];
  for (const table of order) {
    const { error } = await supabase.from(table).delete().neq("id", "__never__");
    if (error) throw error;
  }
}

/**
 * Diffs two state slices by array identity (every action in the store
 * creates a new array/object reference when it changes something, and
 * reuses the old reference otherwise — see src/store/use-biofresh.ts). That
 * lets this stay a single generic pass instead of one write per action.
 */
export async function syncDiff(prev: Snapshot, next: Snapshot): Promise<void> {
  const supabase = getSupabase();
  if (next.config !== prev.config) {
    const { error } = await supabase.from("coop_config").upsert(M.configToRow(next.config));
    if (error) throw error;
  }

  for (const key of Object.keys(TABLES) as CollectionKey[]) {
    if (next[key] === prev[key]) continue;
    const toRow = TABLES[key].toRow as unknown as (x: WithId) => WithId;
    await syncCollection(tableName(key), prev[key] as unknown as WithId[], next[key] as unknown as WithId[], toRow);
  }

  // Activity is append-only remotely: the store truncates its local copy to
  // 60 entries for display, but that must never delete older history.
  if (next.activity !== prev.activity) {
    const prevIds = new Set(prev.activity.map((a) => a.id));
    const fresh = next.activity.filter((a) => !prevIds.has(a.id));
    if (fresh.length > 0) {
      const { error } = await supabase.from("activity").upsert(fresh.map(M.activityToRow));
      if (error) throw error;
    }
  }
}

type WithId = { id: string };

async function syncCollection<T extends WithId>(
  table: string,
  prevArr: T[],
  nextArr: T[],
  toRow: (x: T) => unknown
): Promise<void> {
  const supabase = getSupabase();
  const prevIds = new Set(prevArr.map((x) => x.id));
  const nextIds = new Set(nextArr.map((x) => x.id));
  const removed = [...prevIds].filter((id) => !nextIds.has(id));
  const prevById = new Map(prevArr.map((x) => [x.id, x]));
  const changed = nextArr.filter((x) => prevById.get(x.id) !== x);

  if (removed.length > 0) {
    const { error } = await supabase.from(table).delete().in("id", removed);
    if (error) throw error;
  }
  if (changed.length > 0) {
    const { error } = await supabase.from(table).upsert(changed.map(toRow));
    if (error) throw error;
  }
}

// ---------- Realtime ----------

type ChangeHandler = (
  key: CollectionKey,
  eventType: "INSERT" | "UPDATE" | "DELETE",
  row: Record<string, unknown>
) => void;

let channel: RealtimeChannel | null = null;

/**
 * Subscribes once to every BioFresh table so other open tabs/devices show up
 * without a manual refresh. Call the returned cleanup on unmount. Safe to
 * call more than once — a second call replaces the previous subscription
 * rather than stacking listeners.
 */
export function subscribeRealtime(onChange: ChangeHandler): () => void {
  const supabase = getSupabase();
  if (channel) supabase.removeChannel(channel);

  let c = supabase.channel("biofresh-sync");
  for (const key of Object.keys(TABLES) as CollectionKey[]) {
    c = c.on(
      "postgres_changes",
      { event: "*", schema: "biofresh", table: tableName(key) },
      (payload) => {
        const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as Record<
          string,
          unknown
        >;
        onChange(key, payload.eventType as "INSERT" | "UPDATE" | "DELETE", row);
      }
    );
  }
  channel = c.subscribe();

  return () => {
    if (channel) {
      getSupabase().removeChannel(channel);
      channel = null;
    }
  };
}

export { TABLES };
export type { CollectionKey };
