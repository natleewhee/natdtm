#!/usr/bin/env node
// scripts/refresh-cars.mjs
//
// Offline counterpart to src/app/api/cars/route.js: fetches the current LTA
// Car Cost Update PDF, parses it with the same shared helpers, and merges
// matched prices/OMV/VES into public/data/cars.json on disk.
//
// Intended to run on a schedule via .github/workflows/refresh-data.yml,
// which opens a PR with the resulting diff for human review rather than
// committing directly — a bad parse should be visible and revertable, not
// silently deployed.
//
// Also upserts the same updated rows into Supabase's `cars` table (see
// supabase/migrations/0001_reference_data.sql) when SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are set — a dual write, not a cutover. The
// JSON file stays the source of truth and the PR-review safety net;
// Supabase is a read-optimized mirror that src/app/drive/api/car-catalog
// serves from when configured, falling back to this same JSON file when
// it isn't. Skipped (not failed) when Supabase env vars are absent, same
// as scripts/refresh-coe-history.mjs's own COE-history write.
//
// Usage: node scripts/refresh-cars.mjs

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  getPdfNumbers, extractPdfText, parseLTARows, buildPriceMaps, isLowCoverage, MIN_COVERAGE,
} from '../src/lib/drive/lta-parse.js'
import { omvToLtv } from '../src/lib/drive/calc.js'
import { carToDbRow } from '../src/lib/drive/carCatalog.js'
import { getSupabaseWriteClient } from '../src/lib/shared/supabase.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CARS_JSON_PATH = path.join(__dirname, '..', 'public', 'data', 'cars.json')
const LTA_BASE = 'https://onemotoring.lta.gov.sg/content/dam/onemotoring/Buying/Car_Cost_Update'

async function fetchAndParse(pdfNum) {
  const url = `${LTA_BASE}/${pdfNum}-Car_Cost_Update.pdf`
  const res = await fetch(url, {
    headers: { Accept: 'application/pdf,*/*' },
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${pdfNum}`)
  const buf = await res.arrayBuffer()
  const text = extractPdfText(buf)
  if (text.length < 500) throw new Error(`PDF text extraction too short for ${pdfNum}`)
  return text
}

async function main() {
  // LTA doesn't publish on a strict monthly cadence — getPdfNumbers()
  // returns several months of candidates, newest first, so a normal
  // publishing delay doesn't 404 every attempt.
  const candidates = getPdfNumbers()

  let pdfText = ''
  let pdfUsed = ''
  const errors = []
  for (const pdfNum of candidates) {
    try {
      pdfText = await fetchAndParse(pdfNum)
      pdfUsed = pdfNum
      break
    } catch (err) {
      errors.push(`${pdfNum}: ${err.message}`)
    }
  }

  if (!pdfText) {
    console.error('Could not fetch any LTA PDF:\n' + errors.join('\n'))
    process.exit(1)
  }

  const rows = parseLTARows(pdfText)
  if (rows.length < 5) {
    console.error(`Parsed only ${rows.length} rows from ${pdfUsed} — parser likely needs an update. Aborting without writing.`)
    process.exit(1)
  }

  // Shared with the live /drive/api/cars route rather than hand-rolled here:
  // buildPriceMaps DELETES a car's omv/ves entry whenever a cheaper trim
  // becomes the matched row for that car and that trim has no OMV/VES of
  // its own — a hand-rolled version that skips the delete leaves the
  // PREVIOUS (more expensive) trim's OMV attached to the new cheapest
  // price, which is how cars.json ended up with loanCap/coe fields that
  // disagreed with their own omv (see omvToLtv's comment in calc.js).
  const { priceMap, omvMap, vesMap } = buildPriceMaps(rows)

  const matchedCars = Object.keys(priceMap).length
  console.log(`Parsed ${pdfUsed}: ${rows.length} rows, matched ${matchedCars} cars (${((matchedCars / rows.length) * 100).toFixed(0)}% coverage).`)

  if (isLowCoverage(matchedCars)) {
    console.error(`Matched only ${matchedCars} cars — below the ${MIN_COVERAGE}-car sanity threshold. This usually means MATCH_TERMS in src/lib/lta-parse.js needs updating for new model names. Aborting without writing cars.json.`)
    process.exit(1)
  }

  const raw = await readFile(CARS_JSON_PATH, 'utf-8')
  const data = JSON.parse(raw)

  let updatedCount = 0
  for (const car of data.cars) {
    let changed = false
    if (priceMap[car.id] && priceMap[car.id] !== car.price) {
      car.price = priceMap[car.id]
      changed = true
    }
    if (omvMap[car.id] && omvMap[car.id] !== car.omv) {
      car.omv = omvMap[car.id]
      changed = true
    }
    if (vesMap[car.id] !== undefined && vesMap[car.id] !== car.ves) {
      car.ves = vesMap[car.id]
      changed = true
    }
    // loanCap/coe are DERIVED from omv, not independently editable — an
    // omv update that crosses the S$20,000 Cat A/B threshold without this
    // is exactly how cars.json ended up with a loanCap that disagreed
    // with the car's own omv (some cars over-lent by 10 percentage
    // points as a result). Recomputed on every run, not just when omv
    // changed, so a car whose fields already drifted apart self-heals
    // the next time this script runs rather than staying wrong forever.
    const ltv = omvToLtv(car.omv)
    if (car.loanCap !== ltv.loanCap || car.coe !== ltv.coe) {
      car.loanCap = ltv.loanCap
      car.coe = ltv.coe
      changed = true
    }
    if (changed) updatedCount++
  }

  data._meta = {
    ...data._meta,
    updated: new Date().toISOString().slice(0, 10),
    count: data.cars.length,
    note: `${data._meta?.note?.split(' Prices updated from')[0] ?? ''} Prices updated from LTA ${pdfUsed} where available.`.trim(),
  }

  await writeFile(CARS_JSON_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8')
  console.log(`Updated ${updatedCount} of ${data.cars.length} cars in ${CARS_JSON_PATH}.`)

  const supabase = getSupabaseWriteClient()
  if (!supabase) {
    console.log('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set — skipping the Supabase mirror write.')
    return
  }
  const { error } = await supabase.from('cars').upsert(data.cars.map(carToDbRow), { onConflict: 'id' })
  if (error) {
    // Non-fatal: the JSON file above is already written and is the real
    // source of truth. A failed mirror write means car-catalog/route.js
    // falls back to that JSON (or a stale Supabase row) until the next run.
    console.error(`Supabase upsert failed (JSON file was still written successfully): ${error.message}`)
    return
  }
  console.log(`Upserted ${data.cars.length} cars into Supabase.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
