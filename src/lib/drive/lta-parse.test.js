// src/lib/drive/lta-parse.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { deflateSync } from 'node:zlib'
import { readFileSync } from 'node:fs'
import {
  buildPriceMaps, matchToId, isLowCoverage, MIN_COVERAGE, getPdfNumbers, extractPdfText,
  parseLTARows,
} from './lta-parse.js'

const FIXTURE_PATH = new URL('./__fixtures__/lta-car-cost-update.pdf', import.meta.url)

// Builds a minimal synthetic PDF with one object whose content stream holds
// a BT...ET text block, optionally /FlateDecode-compressed the way every
// real-world PDF (LTA's included) actually ships. Good enough to exercise
// extractPdfText's parsing without needing a real PDF fixture on disk.
function makePdf(content, { compressed = false, arrayFilter = false } = {}) {
  const streamBytes = compressed ? deflateSync(Buffer.from(content)) : Buffer.from(content)
  const filter = compressed ? (arrayFilter ? '/Filter[/FlateDecode]' : '/Filter/FlateDecode') : ''
  return Buffer.concat([
    Buffer.from(`%PDF-1.4\n1 0 obj<</Length ${streamBytes.length}${filter}>>stream\n`),
    streamBytes,
    Buffer.from('\nendstream endobj\n'),
  ])
}

test('matchToId resolves a known LTA row name to its car id', () => {
  assert.equal(matchToId('BYD DOLPHIN STANDARD'), 'byddolphin')
  assert.equal(matchToId('some unrecognized car name'), null)
})

test('isLowCoverage flags a match count under MIN_COVERAGE', () => {
  assert.equal(isLowCoverage(MIN_COVERAGE - 1), true)
  assert.equal(isLowCoverage(MIN_COVERAGE), false)
})

test('buildPriceMaps keeps the cheapest trim per car', () => {
  const rows = [
    { name: 'BYD Dolphin Standard', sellingPrice: 120000, omv: 20000, vesAmount: 0 },
    { name: 'BYD Dolphin Premium', sellingPrice: 135000, omv: 22000, vesAmount: 0 },
  ]
  const { priceMap, omvMap } = buildPriceMaps(rows)
  assert.equal(priceMap.byddolphin, 120000)
  assert.equal(omvMap.byddolphin, 20000)
})

test('buildPriceMaps ignores rows that fail to match a known car', () => {
  const rows = [{ name: 'Totally Unknown Vehicle XYZ', sellingPrice: 99999, omv: 1000 }]
  const { priceMap } = buildPriceMaps(rows)
  assert.deepEqual(priceMap, {})
})

test('buildPriceMaps: a cheaper row missing OMV clears the previous (more expensive) trim\'s OMV instead of inheriting it — the exact mismatched-trim bug this exists to prevent', () => {
  const rows = [
    // Pricier trim seen FIRST, with an OMV.
    { name: 'BYD Dolphin Premium', sellingPrice: 135000, omv: 22000, vesAmount: 500 },
    // Cheaper trim seen SECOND, with no OMV/VES data on this row.
    { name: 'BYD Dolphin Standard', sellingPrice: 120000, omv: 0, vesAmount: 0 },
  ]
  const { priceMap, omvMap, vesMap } = buildPriceMaps(rows)
  assert.equal(priceMap.byddolphin, 120000, 'keeps the cheaper price')
  assert.equal(omvMap.byddolphin, undefined, 'does NOT keep the pricier trim\'s stale OMV paired with the cheaper price')
  assert.equal(vesMap.byddolphin, undefined, 'does NOT keep the pricier trim\'s stale VES paired with the cheaper price')
})

test('buildPriceMaps: order independence — same result whether the cheaper row is seen first or second', () => {
  const cheapFirst = [
    { name: 'BYD Dolphin Standard', sellingPrice: 120000, omv: 0, vesAmount: 0 },
    { name: 'BYD Dolphin Premium', sellingPrice: 135000, omv: 22000, vesAmount: 500 },
  ]
  const cheapSecond = [
    { name: 'BYD Dolphin Premium', sellingPrice: 135000, omv: 22000, vesAmount: 500 },
    { name: 'BYD Dolphin Standard', sellingPrice: 120000, omv: 0, vesAmount: 0 },
  ]
  assert.deepEqual(buildPriceMaps(cheapFirst), buildPriceMaps(cheapSecond))
})

test('buildPriceMaps: a cheaper row that DOES have its own OMV correctly overwrites the pricier trim\'s OMV', () => {
  const rows = [
    { name: 'BYD Dolphin Premium', sellingPrice: 135000, omv: 22000, vesAmount: 500 },
    { name: 'BYD Dolphin Standard', sellingPrice: 120000, omv: 19000, vesAmount: 300 },
  ]
  const { omvMap, vesMap } = buildPriceMaps(rows)
  assert.equal(omvMap.byddolphin, 19000)
  assert.equal(vesMap.byddolphin, 300)
})

// ─── getPdfNumbers ─────────────────────────────────────────────────────────
// Anchor confirmed against the real, live file:
// onemotoring.lta.gov.sg/.../Car_Cost_Update/M032-Car_Cost_Update.pdf = June
// 2026. The anchor was previously set to Feb 2026 (four months early), which
// meant /drive/api/cars guessed M038/M037 in August 2026 when the real files
// were M034/M033 — every fetch 404'd, every month, regardless of anything
// else being correct.
//
// Fixing the anchor alone was still not enough: as confirmed live in
// August 2026, M032 (June) is STILL the latest published file — LTA is
// running ~2 months behind a strict monthly cadence, so a naive
// current+previous guess (M034/M033) 404s on both even with the anchor
// right. getPdfNumbers() now returns several months of candidates so a
// normal publishing delay can't 404 every attempt at once.

test('getPdfNumbers: newest candidate is M032 for June 2026, the confirmed real anchor', () => {
  const candidates = getPdfNumbers(new Date('2026-06-15T00:00:00Z'))
  assert.equal(candidates[0], 'M032')
  assert.equal(candidates[1], 'M031')
})

test('getPdfNumbers: August 2026 newest guess is M034, not the pre-fix M038', () => {
  const candidates = getPdfNumbers(new Date('2026-08-03T00:00:00Z'))
  assert.equal(candidates[0], 'M034')
  assert.equal(candidates[1], 'M033')
})

test('getPdfNumbers: looks back far enough to still include the real M032 from an August "now"', () => {
  // This is the case that actually broke in production: the anchor was
  // correct but a 2-candidate guess didn't reach back to the still-latest
  // June file.
  const candidates = getPdfNumbers(new Date('2026-08-03T00:00:00Z'))
  assert.ok(candidates.includes('M032'), `expected M032 among ${candidates.join(', ')}`)
})

test('getPdfNumbers: rolls forward a full year correctly', () => {
  const candidates = getPdfNumbers(new Date('2027-06-15T00:00:00Z'))
  assert.equal(candidates[0], 'M044') // 12 months after the June 2026 anchor
})

// ─── extractPdfText ──────────────────────────────────────────────────────
// This function had ZERO test coverage before this — the exact gap that
// let a real bug (inability to read /FlateDecode-compressed PDFs, which is
// how essentially every real-world PDF is encoded, LTA's included) ship
// silently: every parse-level test fed it pre-extracted plain text, so the
// one function that actually touches PDF bytes was never exercised.

const SAMPLE_ROW = '41 BYD ATTO 3 EXTENDED RANGE A 100 E 64 A 28519 8784 31927 -22500 -7500 350 106320 39580 145900 - 246388 - 100488'

test('extractPdfText: reads an uncompressed content stream (pre-existing behavior)', () => {
  const pdf = makePdf(`BT (${SAMPLE_ROW}) Tj ET`, { compressed: false })
  const text = extractPdfText(pdf)
  assert.ok(text.includes(SAMPLE_ROW), `expected row text in: ${text}`)
})

test('extractPdfText: reads a /FlateDecode-compressed content stream', () => {
  const pdf = makePdf(`BT (${SAMPLE_ROW}) Tj ET`, { compressed: true })
  const text = extractPdfText(pdf)
  assert.ok(text.includes(SAMPLE_ROW), `expected row text in: ${text}`)
})

test('extractPdfText: reads the array-form filter, /Filter[/FlateDecode]', () => {
  const pdf = makePdf(`BT (${SAMPLE_ROW}) Tj ET`, { compressed: true, arrayFilter: true })
  const text = extractPdfText(pdf)
  assert.ok(text.includes(SAMPLE_ROW), `expected row text in: ${text}`)
})

test('extractPdfText: concatenates text from multiple compressed objects in one document', () => {
  const rows = Array.from({ length: 10 }, (_, i) => `BT (ROW ${i} ${SAMPLE_ROW}) Tj ET`)
  const objs = rows.map((r, i) => makePdf(r, { compressed: true }).toString('latin1'))
  const pdf = Buffer.from(objs.join(''), 'latin1')
  const text = extractPdfText(pdf)
  for (let i = 0; i < 10; i++) assert.ok(text.includes(`ROW ${i} ${SAMPLE_ROW}`), `missing row ${i}`)
})

test('extractPdfText: a stream chained through an unsupported filter is skipped, not thrown', () => {
  // Garbage bytes under a /Filter dict this parser doesn't recognise as
  // plain FlateDecode (e.g. a real ASCII85Decode-then-FlateDecode chain)
  // must not crash the whole extraction — it should just contribute
  // nothing from that stream.
  const garbage = Buffer.from([1, 2, 3, 4, 5, 250, 251, 252])
  const pdf = Buffer.concat([
    Buffer.from(`%PDF-1.4\n1 0 obj<</Length ${garbage.length}/Filter[/ASCII85Decode/FlateDecode]>>stream\n`),
    garbage,
    Buffer.from('\nendstream endobj\n'),
  ])
  assert.doesNotThrow(() => extractPdfText(pdf))
})

test('extractPdfText: an empty/garbage buffer returns without throwing', () => {
  assert.doesNotThrow(() => extractPdfText(Buffer.from('not a pdf at all')))
})

// ─── committed PDF fixture ───────────────────────────────────────────────
// Exercises the full chain — extractPdfText -> parseLTARows -> buildPriceMaps
// -> isLowCoverage — against a /FlateDecode-compressed PDF on disk, the way
// the real OneMotoring Car Cost Update ships. The fixture is synthetic
// (see src/lib/drive/__fixtures__/lta-car-cost-update.pdf's generator note):
// real LTA PDFs are not clearly licensed for redistribution and are revised
// fortnightly, so assertions check structure and coverage, never a price.

test('fixture PDF: extracts and parses to well over the coverage floor', () => {
  const buf = readFileSync(FIXTURE_PATH)
  const text = extractPdfText(buf)
  assert.ok(text.length > 500, 'inflated text should be substantial')

  const rows = parseLTARows(text)
  assert.ok(rows.length >= MIN_COVERAGE, `expected >= ${MIN_COVERAGE} parsed rows, got ${rows.length}`)

  const first = rows[0]
  assert.equal(typeof first.name, 'string')
  assert.ok(first.name.length >= 3)
  assert.ok(Number.isFinite(first.sellingPrice) && first.sellingPrice >= 80000)
  assert.ok(first.omv === null || (first.omv >= 5000 && first.omv <= 200000))

  const { priceMap } = buildPriceMaps(rows)
  const matched = Object.keys(priceMap).length
  assert.ok(matched >= MIN_COVERAGE, `expected >= ${MIN_COVERAGE} matched cars, got ${matched}`)
  assert.equal(isLowCoverage(matched), false)
})

test('fixture PDF: a truncated copy trips isLowCoverage', () => {
  const buf = readFileSync(FIXTURE_PATH)
  const truncated = buf.subarray(0, Math.floor(buf.length * 0.35))
  const matched = Object.keys(buildPriceMaps(parseLTARows(extractPdfText(truncated))).priceMap).length
  assert.ok(matched < MIN_COVERAGE)
  assert.equal(isLowCoverage(matched), true)
})

test('fixture PDF: the plain (uncompressed) scan alone yields almost nothing', () => {
  // Proves the /FlateDecode inflation path is what does the work here —
  // strip the zlib stream to raw bytes and the BT/ET scan finds no rows.
  const buf = readFileSync(FIXTURE_PATH)
  const rawish = extractPdfText(buf.subarray(0, buf.indexOf(Buffer.from('stream\n')) + 7))
  assert.ok(parseLTARows(rawish).length < MIN_COVERAGE)
})
