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
  getPdfNumbers, extractPdfText, parseLTARows, matchToId, isLowCoverage, MIN_COVERAGE,
} from '../src/lib/drive/lta-parse.js'

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

  const priceMap = {}
  const omvMap = {}
  const vesMap = {}
  for (const row of rows) {
    const id = matchToId(row.name)
    if (!id) continue
    if (!priceMap[id] || row.sellingPrice < priceMap[id]) {
      priceMap[id] = row.sellingPrice
      if (row.omv) omvMap[id] = row.omv
      if (row.vesAmount) vesMap[id] = row.vesAmount
    }
  }

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
