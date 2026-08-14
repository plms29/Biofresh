-- BioFresh OS — initial schema
--
-- Lives entirely in its own `biofresh` schema so it shares this Supabase
-- project with other apps without touching their tables, RLS or `public`
-- schema objects.
--
-- Table shapes mirror src/types/index.ts closely: top-level columns for
-- anything filtered or sorted on, JSONB for nested structures (spec,
-- protocol steps, decision options, incidents). This keeps the store
-- migration a straight mapping instead of a relational redesign.
--
-- Security note: this MVP has no user authentication — roles are a UI
-- switcher, not a login. RLS below is intentionally permissive for the
-- anon key (read/write everything in this schema), which matches the
-- app's current security posture: localStorage today has zero access
-- control either. Anyone holding the anon key can read and write co-op
-- operational data. That is an acceptable tradeoff for an internal co-op
-- tool and is not a regression — but it is not appropriate for buyer- or
-- public-facing writes. Do not point anything outside internal staff
-- screens at this schema with the anon key.

create schema if not exists biofresh;

-- ---------- Co-op configuration (single row) ----------

create table biofresh.coop_config (
  id int primary key default 1,
  coop_name text not null,
  surplus_threshold_kg numeric not null,
  urgent_within_hours numeric not null,
  updated_at timestamptz not null default now(),
  constraint coop_config_singleton check (id = 1)
);

-- ---------- Orders ----------

create table biofresh.orders (
  id text primary key,
  buyer_name text not null,
  product text not null,
  qty_kg numeric not null,
  spec jsonb not null,
  due_date timestamptz not null,
  offer_price numeric,
  sales_channel text not null,
  source text not null,
  notes text,
  status text not null,
  spec_revisions int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_status_idx on biofresh.orders (status);
create index orders_due_date_idx on biofresh.orders (due_date);

-- ---------- Market signals ----------

create table biofresh.market_signals (
  id text primary key,
  market text not null,
  product text not null,
  grade text not null,
  qty_kg numeric not null,
  price numeric not null,
  valid_until timestamptz not null,
  source text not null,
  entered_by text not null,
  created_at timestamptz not null default now()
);
create index market_signals_product_grade_idx on biofresh.market_signals (product, grade);

-- ---------- Harvest orders ----------

create table biofresh.harvest_orders (
  id text primary key,
  product text not null,
  target_kg numeric not null,
  farm text not null,
  deadline timestamptz not null,
  order_id text references biofresh.orders (id) on delete set null,
  guide jsonb not null,
  status text not null,
  picked_kg numeric not null default 0,
  incidents jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index harvest_orders_status_idx on biofresh.harvest_orders (status);

-- ---------- Batches ----------

create table biofresh.batches (
  id text primary key, -- batch code, e.g. BF-2608-01
  harvest_order_id text references biofresh.harvest_orders (id) on delete set null,
  product text not null,
  origin text not null,
  harvested_at timestamptz not null,
  intake_at timestamptz,
  total_kg numeric not null default 0,
  status text not null,
  qc jsonb, -- QcResult: { gradeKg, notes, photos, confirmedAt, confirmedBy }
  protocol jsonb not null, -- ProtocolStep[]
  public_note text,
  outcome jsonb, -- BatchOutcome
  created_at timestamptz not null default now()
);
create index batches_status_idx on biofresh.batches (status);
create index batches_product_idx on biofresh.batches (product);

-- ---------- Allocations ----------

create table biofresh.allocations (
  id text primary key,
  batch_id text not null references biofresh.batches (id) on delete cascade,
  grade text not null,
  kg numeric not null,
  order_id text references biofresh.orders (id) on delete set null,
  channel text,
  label text not null,
  status text not null,
  created_at timestamptz not null default now(),
  created_by text not null
);
create index allocations_batch_idx on biofresh.allocations (batch_id);
create index allocations_order_idx on biofresh.allocations (order_id);

-- ---------- Decision cases ----------

create table biofresh.decision_cases (
  id text primary key,
  batch_id text not null references biofresh.batches (id) on delete cascade,
  grade text not null,
  unallocated_kg numeric not null,
  urgency text not null,
  action_deadline timestamptz not null,
  options jsonb not null, -- DecisionOption[]
  chosen_option_id text,
  decided_at timestamptz,
  decided_by text,
  tasks jsonb not null default '[]'::jsonb, -- DecisionTask[]
  created_at timestamptz not null default now()
);
create index decision_cases_batch_idx on biofresh.decision_cases (batch_id);

-- ---------- Activity log ----------

create table biofresh.activity (
  id text primary key,
  at timestamptz not null default now(),
  role text not null,
  actor text not null,
  text text not null
);
create index activity_at_idx on biofresh.activity (at desc);

-- ---------- Row Level Security ----------
-- See the note at the top of this file: permissive by design for this
-- MVP's no-auth model, scoped to the `biofresh` schema only.

alter table biofresh.coop_config enable row level security;
alter table biofresh.orders enable row level security;
alter table biofresh.market_signals enable row level security;
alter table biofresh.harvest_orders enable row level security;
alter table biofresh.batches enable row level security;
alter table biofresh.allocations enable row level security;
alter table biofresh.decision_cases enable row level security;
alter table biofresh.activity enable row level security;

create policy "anon full access" on biofresh.coop_config for all using (true) with check (true);
create policy "anon full access" on biofresh.orders for all using (true) with check (true);
create policy "anon full access" on biofresh.market_signals for all using (true) with check (true);
create policy "anon full access" on biofresh.harvest_orders for all using (true) with check (true);
create policy "anon full access" on biofresh.batches for all using (true) with check (true);
create policy "anon full access" on biofresh.allocations for all using (true) with check (true);
create policy "anon full access" on biofresh.decision_cases for all using (true) with check (true);
create policy "anon full access" on biofresh.activity for all using (true) with check (true);

-- ---------- Realtime ----------
-- Lets every open tab see writes from other tabs/devices without a manual refresh.

alter publication supabase_realtime add table biofresh.orders;
alter publication supabase_realtime add table biofresh.market_signals;
alter publication supabase_realtime add table biofresh.harvest_orders;
alter publication supabase_realtime add table biofresh.batches;
alter publication supabase_realtime add table biofresh.allocations;
alter publication supabase_realtime add table biofresh.decision_cases;
alter publication supabase_realtime add table biofresh.activity;

-- ---------- API exposure ----------
-- PostgREST only serves schemas listed in the project's "Exposed schemas"
-- setting (Settings -> API). After running this migration, add `biofresh`
-- there, or every request from the app will 404.
