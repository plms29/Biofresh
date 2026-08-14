-- Grants for the biofresh schema.
--
-- Custom schemas don't inherit the privileges Supabase wires up for `public`
-- automatically — RLS only controls which *rows* a role can see once it
-- already has SQL-level privilege to touch the table. Without these grants,
-- PostgreSQL denies the request before RLS is even evaluated (error 42501,
-- "permission denied for schema biofresh").

grant usage on schema biofresh to anon, authenticated;

grant select, insert, update, delete on all tables in schema biofresh to anon, authenticated;
grant usage on all sequences in schema biofresh to anon, authenticated;

-- Anything created later in this schema gets the same grants automatically.
alter default privileges in schema biofresh
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema biofresh
  grant usage on sequences to anon, authenticated;
