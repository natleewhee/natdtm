#!/usr/bin/env node
// scripts/refresh-coe-history.mjs
//
// Fetches the current COE bidding results and merges them into
// public/data/coe-history.json.
//
// Source: data.gov.sg's mirror of LTA's own "COE Bidding Results / Prices"
// dataset (resource_id d_69b3380ad7e51aff3a7dcc84eba52b8a), via CKAN's
// public datastore_search API — no API key required. This replaces a
// direct call to LTA DataMall's COEResult endpoint (which needed an
// AccountKey and, in production, kept 404ing even with a correctly
// configured one — see src/app/drive/api/coe/route.js for the same
// migration and its reasoning).
//
// Unlike DataMall's COEResult (current + previous exercise only), this
// dataset holds the FULL history back to 2010 — this script only pulls the
// last 20 rows to build up incrementally as before, but a proper one-time
// backfill of the whole dataset is now possible and is a reasonable future
// enhancement, not attempted here to keep this change to a fix rather than
// a new feature.
//
// Also upserts the same incoming entries into Supabase's
// `coe_bidding_results` table (see supabase/migrations/0001_reference_data.sql)
// when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set — a dual write.
// The JSON file stays the source of truth; Supabase is a read-optimized
// mirror that src/app/drive/api/coe-history serves from when configured.
// Skipped (not failed) when Supabase env vars are absent.
//
// Usage: node scripts/refresh-coe-history.mjs (no env vars required for
// the data.gov.sg fetch itself; Supabase env vars are optional)

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  parseCoeResultToEntries, coerceDatastoreRecord, mergeHistoryEntries, entryToDbRow,
} from '../src/lib/drive/coe-history.js'
import { getSupabaseWriteClient } from '../src/lib/shared/supabase.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HISTORY_PATH = path.join(__dirname, '..', 'public', 'data', 'coe-history.json')
const DATASET_ID = 'd_69b3380ad7e51aff3a7dcc84eba52b8a'
const ENDPOINT = `https://data.gov.sg/api/action/datastore_search?resource_id=${DATASET_ID}&limit=20&sort=${encodeURIComponent('month desc,bidding_no desc')}`

async function main() {
  const res = await fetch(ENDPOINT, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) {
    console.error(`data.gov.sg returned HTTP ${res.status}`)
    process.exit(1)
  }

  const data = await res.json()
  if (data?.success !== true) {
    console.error(`data.gov.sg marked the request unsuccessful: ${data?.error?.message ?? 'no error message given'}`)
    process.exit(1)
  }

  const records = (data?.result?.records ?? []).map(coerceDatastoreRecord)
  const incoming = parseCoeResultToEntries(records)
  if (incoming.length === 0) {
    console.error('No paired Cat A/Cat B results found in the data.gov.sg response — nothing to merge.')
    process.exit(1)
  }

  const raw = await readFile(HISTORY_PATH, 'utf-8')
  const fileData = JSON.parse(raw)
  const before = fileData.history.length
  fileData.history = mergeHistoryEntries(fileData.history, incoming)
  fileData._meta.updated = new Date().toISOString().slice(0, 10)

  await writeFile(HISTORY_PATH, JSON.stringify(fileData, null, 2) + '\n', 'utf-8')
  console.log(`COE history: ${before} -> ${fileData.history.length} entries (fetched ${incoming.length} from this run).`)

  const supabase = getSupabaseWriteClient()
  if (!supabase) {
    console.log('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set — skipping the Supabase mirror write.')
    return
  }
  const { error } = await supabase
    .from('coe_bidding_results')
    .upsert(incoming.map(entryToDbRow), { onConflict: 'month,bidding_no' })
  if (error) {
    // Non-fatal: the JSON file above is already written and is the real
    // source of truth.
    console.error(`Supabase upsert failed (JSON file was still written successfully): ${error.message}`)
    return
  }
  console.log(`Upserted ${incoming.length} bidding exercises into Supabase.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
