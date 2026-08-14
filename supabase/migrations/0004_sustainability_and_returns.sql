-- Sustainability records, and the origin of a decision case.
--
-- Two additions from the operations diagram:
--   1. A decision case can now be raised because the buyer sent stock back,
--      not only because it never sold. `origin` says which.
--   2. Where produce actually ended up is recorded rather than remembered, so
--      "how much did we keep out of the bin" is a query.
--
-- Run after 0003.

alter table biofresh.decision_cases
  add column if not exists origin text not null default 'surplus';

create table biofresh.sustainability_records (
  id text primary key,
  batch_id text not null references biofresh.batches (id) on delete cascade,
  product text not null,
  grade text not null,
  kg numeric not null check (kg > 0),
  outcome text not null check (outcome in ('sold', 'preserved', 'dried', 'processed', 'wasted')),
  note text not null default '',
  at timestamptz not null default now()
);
create index sustainability_batch_idx on biofresh.sustainability_records (batch_id);
create index sustainability_at_idx on biofresh.sustainability_records (at desc);

alter table biofresh.sustainability_records enable row level security;
create policy "anon full access" on biofresh.sustainability_records for all using (true) with check (true);

grant select, insert, update, delete on biofresh.sustainability_records to anon, authenticated;

alter publication supabase_realtime add table biofresh.sustainability_records;
