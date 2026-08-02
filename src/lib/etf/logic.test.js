// src/lib/etf/logic.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeTo100, generatePortfolio, encodePrefsToParams, decodePrefsFromParams,
  encodeComparePrefs, decodeComparePrefs, computeRebalance, ETFS,
} from './logic.js'

function approx(a, b, eps = 0.5) {
  assert.ok(Math.abs(a - b) <= eps, `expected ${a} ≈ ${b}`)
}
function sumPct(allocations) {
  return allocations.reduce((s, a) => s + a.percentage, 0)
}

// ─── normalizeTo100 ────────────────────────────────────────────────────────

test('normalizeTo100 leaves an already-100% allocation unchanged', () => {
  const a = [{ etf: ETFS.VWRA, percentage: 60 }, { etf: ETFS.CSPX, percentage: 40 }]
  normalizeTo100(a)
  approx(sumPct(a), 100, 0.001)
})

test('normalizeTo100 absorbs a rounding remainder into the largest holding', () => {
  const a = [{ etf: ETFS.VWRA, percentage: 33.34 }, { etf: ETFS.CSPX, percentage: 33.33 }, { etf: ETFS.EIMI, percentage: 33.33 }]
  normalizeTo100(a)
  approx(sumPct(a), 100, 0.001)
})

// ─── generatePortfolio ───────────────────────────────────────────────────

test('generatePortfolio: 1 ETF is 100% VWRA', () => {
  const p = generatePortfolio({ simplicity: '1 ETF', risk: 'Balanced', tilts: [] })
  assert.equal(p.allocations.length, 1)
  assert.equal(p.allocations[0].etf.ticker, 'VWRA')
  approx(sumPct(p.allocations), 100)
})

test('generatePortfolio: 2-3 ETFs sums to 100 across risk profiles', () => {
  for (const risk of ['Conservative', 'Balanced', 'Growth']) {
    const p = generatePortfolio({ simplicity: '2-3 ETFs', risk, tilts: [] })
    approx(sumPct(p.allocations), 100)
  }
})

test('generatePortfolio: 2-3 ETFs splits satellite weight across multiple tilts', () => {
  const p = generatePortfolio({ simplicity: '2-3 ETFs', risk: 'Balanced', tilts: ['Japan', 'China / Hong Kong'] })
  const jp = p.allocations.find(a => a.etf.ticker === 'VJPW')
  const cn = p.allocations.find(a => a.etf.ticker === 'HMCH')
  assert.ok(jp && jp.percentage > 0, 'Japan tilt should be present')
  assert.ok(cn && cn.percentage > 0, 'China tilt should be present')
  approx(sumPct(p.allocations), 100)
})

test('generatePortfolio: Precision (4-5 ETFs) sums to 100 across risk profiles', () => {
  for (const risk of ['Conservative', 'Balanced', 'Growth']) {
    const p = generatePortfolio({ simplicity: '4-5 ETFs', risk, tilts: [] })
    approx(sumPct(p.allocations), 100)
  }
})

test('generatePortfolio: Precision honors a single tilt (regression check)', () => {
  const p = generatePortfolio({ simplicity: '4-5 ETFs', risk: 'Balanced', tilts: ['Japan'] })
  const jp = p.allocations.find(a => a.etf.ticker === 'VJPW')
  assert.ok(jp && jp.percentage > 0, 'Japan tilt should be present')
  approx(sumPct(p.allocations), 100)
})

test('generatePortfolio: Precision honors a Japan/China tilt under a Growth risk profile too (otW must not be zero)', () => {
  // Growth's otW used to be 0, so the `otW > 0` gate below never ran and
  // a Japan/China tilt selection was silently dropped entirely for
  // Growth users, even though the identical selection worked fine under
  // Balanced/Conservative.
  const p = generatePortfolio({ simplicity: '4-5 ETFs', risk: 'Growth', tilts: ['Japan'] })
  const jp = p.allocations.find(a => a.etf.ticker === 'VJPW')
  assert.ok(jp && jp.percentage > 0, 'Japan tilt must not be dropped under a Growth risk profile')
  approx(sumPct(p.allocations), 100)
})

test('generatePortfolio: Precision splits its tilt slice across MULTIPLE selected tilts (bug fix)', () => {
  // Previously an if/else-if chain gave the whole "other tilt" slice to
  // only the first matched tilt (priority order Japan > China > US > EM),
  // silently dropping the rest with no indication in the UI.
  const p = generatePortfolio({ simplicity: '4-5 ETFs', risk: 'Balanced', tilts: ['China / Hong Kong', 'Japan'] })
  const jp = p.allocations.find(a => a.etf.ticker === 'VJPW')
  const cn = p.allocations.find(a => a.etf.ticker === 'HMCH')
  assert.ok(jp && jp.percentage > 0, 'Japan must not be dropped when China is also selected')
  assert.ok(cn && cn.percentage > 0, 'China must not be dropped when Japan is also selected')
  approx(jp.percentage, cn.percentage, 0.01) // split evenly between the two
  approx(sumPct(p.allocations), 100)
})

test('generatePortfolio: Precision tops up existing CSPX/EIMI slots for US/EM tilts rather than duplicating a line', () => {
  const base = generatePortfolio({ simplicity: '4-5 ETFs', risk: 'Balanced', tilts: [] })
  const baseUs = base.allocations.find(a => a.etf.ticker === 'CSPX').percentage
  const tilted = generatePortfolio({ simplicity: '4-5 ETFs', risk: 'Balanced', tilts: ['United States'] })
  const cspxEntries = tilted.allocations.filter(a => a.etf.ticker === 'CSPX')
  assert.equal(cspxEntries.length, 1, 'should top up the existing CSPX line, not add a second one')
  assert.ok(cspxEntries[0].percentage > baseUs)
  approx(sumPct(tilted.allocations), 100)
})

test('generatePortfolio: Precision with no tilts selected tops up the global core (VWRA)', () => {
  const p = generatePortfolio({ simplicity: '4-5 ETFs', risk: 'Balanced', tilts: [] })
  const vwra = p.allocations.find(a => a.etf.ticker === 'VWRA')
  assert.ok(vwra.percentage > 40) // base gW=40 + otW=5 topped up
  approx(sumPct(p.allocations), 100)
})

// ─── URL encode/decode round-trip ──────────────────────────────────────────

test('encodePrefsToParams / decodePrefsFromParams round-trips a full prefs object', () => {
  const prefs = { risk: 'Growth', simplicity: '4-5 ETFs', tilts: ['Japan', 'United States'], monthlyInvestment: '1500' }
  const decoded = decodePrefsFromParams(encodePrefsToParams(prefs))
  assert.deepEqual(decoded, prefs)
})

test('encodePrefsToParams / decodePrefsFromParams round-trips zero tilts', () => {
  const prefs = { risk: 'Conservative', simplicity: '1 ETF', tilts: [], monthlyInvestment: '' }
  const decoded = decodePrefsFromParams(encodePrefsToParams(prefs))
  assert.deepEqual(decoded.tilts, [])
  assert.equal(decoded.risk, 'Conservative')
})

test('decodePrefsFromParams returns null for missing/garbage params', () => {
  assert.equal(decodePrefsFromParams(new URLSearchParams()), null)
  assert.equal(decodePrefsFromParams(new URLSearchParams('r=zz&s=2')), null)
})

test('encodeComparePrefs / decodeComparePrefs round-trips two independent prefs objects', () => {
  const a = { risk: 'Balanced', simplicity: '2-3 ETFs', tilts: ['Emerging Markets'], monthlyInvestment: '500' }
  const b = { risk: 'Growth', simplicity: '4-5 ETFs', tilts: [], monthlyInvestment: '2000' }
  const decoded = decodeComparePrefs(encodeComparePrefs(a, b))
  assert.deepEqual(decoded.a, a)
  assert.deepEqual(decoded.b, b)
})

// ─── computeRebalance ──────────────────────────────────────────────────────

test('computeRebalance buys only underweight funds, proportional to their gap', () => {
  const allocations = [{ etf: ETFS.VWRA, percentage: 70 }, { etf: ETFS.CSPX, percentage: 30 }]
  const currentValues = { VWRA: 5000, CSPX: 5000 } // both equal, but target is 70/30
  const { rows } = computeRebalance(allocations, currentValues, 1000)
  const vwraRow = rows.find(r => r.ticker === 'VWRA')
  const cspxRow = rows.find(r => r.ticker === 'CSPX')
  assert.ok(vwraRow.buy > cspxRow.buy, 'VWRA is more underweight and should get more of the contribution')
  approx(vwraRow.buy + cspxRow.buy, 1000, 0.01)
})

test('computeRebalance never suggests buying a negative amount', () => {
  const allocations = [{ etf: ETFS.VWRA, percentage: 50 }, { etf: ETFS.CSPX, percentage: 50 }]
  const currentValues = { VWRA: 9000, CSPX: 1000 } // VWRA already way overweight
  const { rows } = computeRebalance(allocations, currentValues, 500)
  rows.forEach(r => assert.ok(r.buy >= 0, `${r.ticker} buy amount should never be negative`))
})

test('computeRebalance with zero gap (already at target) splits by target weight', () => {
  const allocations = [{ etf: ETFS.VWRA, percentage: 60 }, { etf: ETFS.CSPX, percentage: 40 }]
  const currentValues = { VWRA: 6000, CSPX: 4000 } // exactly at target already
  const { rows } = computeRebalance(allocations, currentValues, 1000)
  const vwraRow = rows.find(r => r.ticker === 'VWRA')
  approx(vwraRow.buy, 600, 1)
})
