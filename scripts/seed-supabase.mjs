#!/usr/bin/env node
// scripts/seed-supabase.mjs
//
// One-time seed: pushes the FULL bundled snapshots (public/data/cars.json,
// public/data/coe-history.json — 145 cars, 391 COE bidding exercises as of
// writing) into Supabase. Run this once after applying
// supabase/migrations/0001_reference_data.sql, before the tables have any
// data in them.
//
// This is deliberately separate from scripts/refresh-cars.mjs and
// scripts/refresh-coe-history.mjs, which only upsert INCREMENTAL data
// (this month's matched cars from a live PDF fetch, the last 20 COE rows)
// — neither one is meant to backfill the full catalog/history, so relying
// on them for the initial seed would leave most rows missing.
//
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-supabase.mjs

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { carToDbRow } from '../src/lib/drive/carCatalog.js'
import { entryToDbRow } from '../src/lib/drive/coe-history.js'
import { getSupabaseWriteClient } from '../src/lib/shared/supabase.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function main() {
  const supabase = getSupabaseWriteClient()
  if (!supabase) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set to seed. Aborting.')
    process.exit(1)
  }

  const carsRaw = await readFile(path.join(__dirname, '..', 'public', 'data', 'cars.json'), 'utf-8')
  const cars = JSON.parse(carsRaw).cars
  const { error: carsError } = await supabase.from('cars').upsert(cars.map(carToDbRow), { onConflict: 'id' })
  if (carsError) {
    console.error(`Seeding cars failed: ${carsError.message}`)
    process.exit(1)
  }
  console.log(`Seeded ${cars.length} cars.`)

  const historyRaw = await readFile(path.join(__dirname, '..', 'public', 'data', 'coe-history.json'), 'utf-8')
  const history = JSON.parse(historyRaw).history
  const { error: historyError } = await supabase
    .from('coe_bidding_results')
    .upsert(history.map(entryToDbRow), { onConflict: 'month,bidding_no' })
  if (historyError) {
    console.error(`Seeding coe_bidding_results failed: ${historyError.message}`)
    process.exit(1)
  }
  console.log(`Seeded ${history.length} COE bidding exercises.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
