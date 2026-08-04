// src/app/drive/api/coe-history/route.js
// Serves the COE bidding history that CoeHistoryChart and CoeTimingSignal
// render (previously a direct client-side fetch of the static
// public/data/coe-history.json file).
//
// Reads from the `coe_bidding_results` Postgres table (see
// supabase/migrations/0001_reference_data.sql) when Supabase is
// configured, and falls back to the bundled JSON snapshot otherwise.

import { getSupabaseReadClient } from '@/lib/shared/supabase'
import { dbRowToEntry, sortEntriesChronologically } from '@/lib/drive/coe-history'
import bundledHistory from '../../../../../public/data/coe-history.json'

export const runtime = 'edge'
export const revalidate = 3600

export async function GET() {
  const supabase = getSupabaseReadClient()

  if (!supabase) {
    return Response.json({
      source: 'bundled-json',
      detail: 'Supabase is not configured (SUPABASE_URL/SUPABASE_ANON_KEY missing) — serving the bundled snapshot.',
      history: bundledHistory.history,
      checkedAt: new Date().toISOString(),
    })
  }

  const { data, error } = await supabase
    .from('coe_bidding_results')
    .select('*')
    .order('month', { ascending: true })
    .order('bidding_no', { ascending: true })

  if (error) {
    console.error('coe-history Supabase query failed:', error.message)
    return Response.json({
      source: 'bundled-json',
      detail: `Supabase query failed (${error.message}) — serving the bundled snapshot.`,
      history: bundledHistory.history,
      checkedAt: new Date().toISOString(),
    })
  }

  if (!data || data.length === 0) {
    return Response.json({
      source: 'bundled-json',
      detail: 'Supabase returned zero rows — table likely not seeded yet. Serving the bundled snapshot.',
      history: bundledHistory.history,
      checkedAt: new Date().toISOString(),
    })
  }

  return Response.json({
    source: 'supabase',
    // Re-sorted client-side rather than trusting the query's .order() alone
    // to have been applied exactly as asked — same defensive posture as
    // sortEntriesChronologically's other caller in the COE live route.
    history: sortEntriesChronologically(data.map(dbRowToEntry)),
    checkedAt: new Date().toISOString(),
  })
}
