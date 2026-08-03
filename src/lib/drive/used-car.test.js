// src/lib/drive/used-car.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcUsed, calcUsedDepr } from './used-car.js'
import { TDSR_LIMIT } from './calc.js'

function approx(a, b, eps = 0.5) {
  assert.ok(Math.abs(a - b) <= eps, `expected ${a} ≈ ${b}`)
}

const USED_CAR = {
  id: 'used-test', name: 'Used Test', short: 'Used',
  price: 80_000, omv: 25_000, ageNow: 5, monthsRemaining: 60, rateTier: 'ice', ves: 0,
}

// ─── Tenure clamped by remaining COE ──────────────────────────────────────

test('calcUsed clamps loan tenure to whatever COE remains', () => {
  const shortCoe = { ...USED_CAR, monthsRemaining: 18 } // 1.5 years left
  const r = calcUsed(10_000, 30_000, 7, shortCoe)
  assert.equal(r.tenure, 1) // floor(18/12)
  assert.equal(r.requestedTenure, 7)
  assert.equal(r.maxTenureFromCoe, 1)
  assert.equal(r.tenureClamped, true)
})

test('calcUsed does not clamp when requested tenure already fits the COE', () => {
  const r = calcUsed(10_000, 30_000, 5, USED_CAR) // 60 months = 5 years remaining
  assert.equal(r.tenure, 5)
  assert.equal(r.tenureClamped, false)
})

test('calcUsed still caps at the 7-year UI maximum even with ample COE left', () => {
  const longCoe = { ...USED_CAR, monthsRemaining: 200 }
  const r = calcUsed(10_000, 30_000, 10, longCoe)
  assert.equal(r.tenure, 7)
  assert.equal(r.tenureClamped, true)
  assert.equal(r.maxTenureFromCoe, 16)
})

test('a clamped tenure changes the actual monthly instalment (not just a display label)', () => {
  const shortCoe = { ...USED_CAR, monthsRemaining: 18 }
  const clamped = calcUsed(10_000, 30_000, 7, shortCoe)
  const unclamped = calcUsed(10_000, 30_000, 1, shortCoe)
  // Same effective tenure (1yr) whether requested directly or clamped down
  // from 7 — confirms the loan math itself uses the clamped tenure, not
  // the originally requested one.
  approx(clamped.monthly, unclamped.monthly, 1)
  assert.equal(clamped.coo.length, 1)
})

// ─── Loan-to-value cap by OMV band ─────────────────────────────────────────

test('calcUsed uses a 70% loan cap and Cat A for OMV at or under $20k', () => {
  const r = calcUsed(10_000, 10_000, 5, { ...USED_CAR, omv: 20_000, price: 60_000 })
  approx(r.maxLoan, 60_000 * 0.70)
  assert.equal(r.car.coe, 'Cat A')
})

test('calcUsed uses a 60% loan cap and Cat B for OMV above $20k', () => {
  const r = calcUsed(10_000, 10_000, 5, { ...USED_CAR, omv: 25_000, price: 60_000 })
  approx(r.maxLoan, 60_000 * 0.60)
  assert.equal(r.car.coe, 'Cat B')
})

// ─── Guard clauses ─────────────────────────────────────────────────────────

test('calcUsed rejects a car with no COE months remaining', () => {
  assert.equal(calcUsed(10_000, 30_000, 5, { ...USED_CAR, monthsRemaining: 0 }), null)
})

test('calcUsed rejects invalid salary/down/tenure the same way calc() does', () => {
  assert.equal(calcUsed(0, 30_000, 5, USED_CAR), null)
  assert.equal(calcUsed(10_000, 0, 5, USED_CAR), null)
  assert.equal(calcUsed(10_000, 30_000, 0, USED_CAR), null)
})

// ─── TDSR / verdict, mirroring calc()'s new-car behavior ──────────────────

test('calcUsed computes TDSR against gross salary, counting existing debt', () => {
  const r = calcUsed(10_000, 30_000, 5, USED_CAR, null, 2_000)
  approx(r.tdsr, (2_000 + r.monthly) / 10_000)
  assert.equal(r.tdsrExceeded, r.tdsr > TDSR_LIMIT)
})

test('calcUsed flags insufficient downpayment', () => {
  const r = calcUsed(10_000, 5_000, 5, USED_CAR)
  assert.equal(r.canDown, false)
  assert.equal(r.verdict, 'Insufficient Downpayment')
})

// ─── Depreciation ────────────────────────────────────────────────────────

test('calcUsedDepr stops PARF once total age (ageNow + years held) exceeds 10', () => {
  const oldCar = { ...USED_CAR, ageNow: 9, omv: 25_000 }
  const d = calcUsedDepr(oldCar, 2, 100_000) // ageAtY = 11
  approx(d.parf, 0)
})

test('calcUsedDepr grants PARF while total age is still within 10 years', () => {
  const car = { ...USED_CAR, ageNow: 3, omv: 25_000 }
  const d = calcUsedDepr(car, 2, 100_000) // ageAtY = 5
  assert.ok(d.parf > 0)
})

test('calcUsedDepr COE rebate reflects the car\'s actual remaining months, not a fresh 120', () => {
  const car = { ...USED_CAR, monthsRemaining: 36 } // 3 years left
  const d0 = calcUsedDepr(car, 0, 120_000)
  approx(d0.coeRebate, (36 / 120) * 120_000)
})

// ─── minDown float-precision (regression) ─────────────────────────────────
// price * (1 - loanCap/100) can evaluate to e.g. 30000.000000000004 instead
// of exactly 30000. A downpayment of exactly the true minimum then read as
// insufficient with a shortfall that displayed as "S$0" — the same bug
// calc()'s own minDown was fixed away from; used-car.js had reintroduced it.

test('calcUsed: a downpayment of exactly the float-imprecise minimum is not rejected', () => {
  const car = { ...USED_CAR, price: 100_000, omv: 19_000 } // Cat A, 70% cap -> minDown = 30000
  const r = calcUsed(8_000, 30_000, 5, car)
  assert.equal(r.canDown, true)
  assert.notEqual(r.verdict, 'Insufficient Downpayment')
  assert.equal(r.shortfall, 0)
})

test('omvToLtv drives calcUsed\'s loanCap the same way it drives calc()\'s', () => {
  const catB = { ...USED_CAR, omv: 25_000 } // > 20000 -> Cat B, 60%
  const r = calcUsed(8_000, 40_000, 5, catB)
  assert.equal(r.car.loanCap, 60)
  assert.equal(r.car.coe, 'Cat B')
})
