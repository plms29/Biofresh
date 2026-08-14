-- Pickers and per-picker weighings.
--
-- Adds the layer below the Field Supervisor: the people who physically pick.
-- They are not system users — no login, no auth row — just a roster the
-- supervisor manages, plus one row per weighing at the plot.
--
-- Run after 0001 and 0002. Grants at the bottom repeat 0002 for these two new
-- tables, because `alter default privileges` in 0002 only covers tables
-- created by the same role that ran it.

create table biofresh.farmers (
  id text primary key,
  name text not null,
  code text not null,
  plots jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- The team put on a harvest order.
alter table biofresh.harvest_orders
  add column if not exists assigned_farmer_ids jsonb not null default '[]'::jsonb;

-- One weighing: this picker, this job, this size band, this many kg.
-- Kept as individual rows rather than a running total so a mistake can be
-- undone on its own and the supervisor can see who picked what.
create table biofresh.picking_entries (
  id text primary key,
  harvest_order_id text not null references biofresh.harvest_orders (id) on delete cascade,
  farmer_id text not null references biofresh.farmers (id) on delete restrict,
  product text not null,
  band text not null check (band in ('L', 'M', 'S')),
  kg numeric not null check (kg > 0),
  at timestamptz not null default now()
);
create index picking_entries_order_idx on biofresh.picking_entries (harvest_order_id);
create index picking_entries_farmer_idx on biofresh.picking_entries (farmer_id, at desc);

alter table biofresh.farmers enable row level security;
alter table biofresh.picking_entries enable row level security;

create policy "anon full access" on biofresh.farmers for all using (true) with check (true);
create policy "anon full access" on biofresh.picking_entries for all using (true) with check (true);

grant select, insert, update, delete on biofresh.farmers to anon, authenticated;
grant select, insert, update, delete on biofresh.picking_entries to anon, authenticated;

alter publication supabase_realtime add table biofresh.farmers;
alter publication supabase_realtime add table biofresh.picking_entries;
