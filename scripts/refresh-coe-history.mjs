#!/usr/bin/env node
// scripts/refresh-coe-history.mjs
//
// Fetches the current COE bidding results from LTA DataMall and merges them
// into public/data/coe-history.json. LTA's COEResult endpoint only ever
// returns the current + previous bidding exercise (no historical range), so
// this file can't be backfilled — it only builds up going forward, one
// entry per scheduled run (see .github/workflows/refresh-data.yml).
//
// Requires LTA_API_KEY in the environment (a GitHub Actions repo secret
// when run in CI — see src/app/api/coe/route.js for the same requirement).
//
// Usage: LTA_API_KEY=... node scripts/refresh-coe-history.mjs

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { parseCoeResultToEntries, mergeHistoryEntries } from '../src/lib/drive/coe-history.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HISTORY_PATH = path.join(__dirname, '..', 'public', 'data', 'coe-history.json')

async function main() {
  const apiKey = process.env.LTA_API_KEY
  if (!apiKey) {
    console.error('LTA_API_KEY not set in the environment — cannot fetch from DataMall. Skipping.')
    process.exit(1)
  }

  const res = await fetch('https://datamall2.mytransport.sg/ltaodataservice/COEResult', {
    headers: { AccountKey: apiKey, accept: 'application/json' },
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) {
    console.error(`LTA DataMall returned HTTP ${res.status}`)
    process.exit(1)
  }

  const data = await res.json()
  const incoming = parseCoeResultToEntries(data?.value ?? [])
  if (incoming.length === 0) {
    console.error('No paired Cat A/Cat B results found in the DataMall response — nothing to merge.')
    process.exit(1)
  }

  const raw = await readFile(HISTORY_PATH, 'utf-8')
  const fileData = JSON.parse(raw)
  const before = fileData.history.length
  fileData.history = mergeHistoryEntries(fileData.history, incoming)
  fileData._meta.updated = new Date().toISOString().slice(0, 10)

  await writeFile(HISTORY_PATH, JSON.stringify(fileData, null, 2) + '\n', 'utf-8')
  console.log(`COE history: ${before} -> ${fileData.history.length} entries (fetched ${incoming.length} from this run).`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
