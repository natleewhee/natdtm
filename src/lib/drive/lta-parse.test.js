// src/lib/drive/lta-parse.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildPriceMaps, matchToId, isLowCoverage, MIN_COVERAGE } from './lta-parse.js'

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
