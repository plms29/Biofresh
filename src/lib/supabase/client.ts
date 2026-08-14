import { createClient } from "@supabase/supabase-js";

/**
 * Browser client for the shared Supabase project. BioFresh lives in its own
 * `biofresh` schema (see supabase/migrations/0001_biofresh_init.sql) so it
 * does not collide with the other apps in the same project.
 *
 * No auth: this MVP has no login, so every request runs as `anon`. RLS on
 * the `biofresh` schema grants anon full read/write — see the migration
 * file for the tradeoff this accepts.
 *
 * Built lazily (not at module scope) so importing this file can never throw
 * during the client bundle's initial module evaluation — a throw at that
 * point takes the whole React tree down with it, silently, before hydration
 * even starts.
 */
function makeClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: "biofresh" } }
  );
}

let client: ReturnType<typeof makeClient> | null = null;

export function getSupabase(): ReturnType<typeof makeClient> {
  if (!client) client = makeClient();
  return client;
}
