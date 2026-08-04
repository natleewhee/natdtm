// src/lib/shared/supabase.js
//
// Stage 1 of introducing Postgres: reference data only (car catalog, COE
// history) — no auth, no user data. Two clients, matching the two trust
// levels these reference-data tables actually need:
//
// - getSupabaseReadClient(): anon key, used by API routes running in the
//   browser-facing request path. RLS on both tables allows SELECT to
//   anon/authenticated and denies everything else by default, so this
//   client physically cannot write even if calling code tried to.
// - getSupabaseWriteClient(): service_role key, bypasses RLS entirely.
//   Used ONLY by scripts/refresh-*.mjs, which run in GitHub Actions with
//   the key as a repo secret — never bundled into anything shipped to a
//   browser. Do not import this from anything under src/app or
//   src/components.
//
// Both return null (not throw) when their env vars are missing, so every
// caller degrades the same way the rest of this app already does for
// missing LTA config — see src/app/drive/api/coe/route.js's `no_key`
// status for the established pattern. A reference-data outage should
// never crash the calculator; it should fall back to the bundled JSON
// snapshot (see src/app/drive/api/car-catalog/route.js).

import { createClient } from '@supabase/supabase-js'

let readClient = null
let writeClient = null

export function getSupabaseReadClient() {
  if (readClient) return readClient
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  if (!url || !key) return null
  readClient = createClient(url, key, { auth: { persistSession: false } })
  return readClient
}

export function getSupabaseWriteClient() {
  if (writeClient) return writeClient
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  writeClient = createClient(url, key, { auth: { persistSession: false } })
  return writeClient
}
