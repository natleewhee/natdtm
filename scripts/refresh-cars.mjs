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
// Usage: node scripts/refresh-cars.mjs

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  getPdfNumbers, extractPdfText, parseLTARows, buildPriceMaps, isLowCoverage, MIN_COVERAGE,
} from '../src/lib/drive/lta-parse.js'
import { omvToLtv } from '../src/lib/drive/calc.js'

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
  const [curPdf, prevPdf] = getPdfNumbers()

  let pdfText = ''
  let pdfUsed = ''
  const errors = []
  for (const pdfNum of [curPdf, prevPdf]) {
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
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
