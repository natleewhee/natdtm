// src/lib/drive/solve.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calc } from './calc.js'
import { solveExtraDownNeeded, solveMinTenureNeeded, suggestAdjustments } from './solve.js'

const CAR = { price: 200_000, omv: 40_000, coe: 'Cat A', loanCap: 70, rateTier: 'mass', ves: 0 }

test('solveExtraDownNeeded returns 0 when already comfortably affordable', () => {
  assert.equal(solveExtraDownNeeded(40_000, 100_000, 7, CAR), 0)
})

test('solveExtraDownNeeded returns a positive extra-down amount for a stretched scenario, and applying it actually clears the target ratio', () => {
  const salary = 4_000, down = 60_000, tenure = 5
  const before = calc(salary, down, tenure, CAR)
  assert.ok(before.ratio > 0.30, 'sanity check: this scenario really is over the 30% comfort ratio')

  const extra = solveExtraDownNeeded(salary, down, tenure, CAR)
  assert.ok(typeof extra === 'number' && extra >= 0)

  const after = calc(salary, down + extra, tenure, CAR)
  assert.ok(after.ratio <= 0.30 + 0.001, `adding the suggested extra down (${extra}) should bring the ratio to or under 30%, got ${after.ratio}`)
})

test('solveExtraDownNeeded returns null when even a 100% downpayment cannot fix it (e.g. salary is 0)', () => {
  assert.equal(solveExtraDownNeeded(0, 50_000, 5, CAR), null)
})

test('solveMinTenureNeeded finds a tenure within [1,7] that clears the target ratio, when one exists', () => {
  const t = solveMinTenureNeeded(20_000, 40_000, CAR)
  assert.ok(t === null || (t >= 1 && t <= 7))
  if (t !== null) {
    const r = calc(20_000, 40_000, t, CAR)
    assert.ok(r.ratio <= 0.30 + 0.001)
  }
})

test('solveMinTenureNeeded returns null when no tenure in range clears the target', () => {
  // Salary far too low for this car at any tenure up to 7 years.
  const t = solveMinTenureNeeded(1_000, 10_000, CAR)
  assert.equal(t, null)
})

test('suggestAdjustments bundles extraDown, minTenure, and ceiling together', () => {
  const result = suggestAdjustments(4_000, 60_000, 5, CAR)
  assert.ok('extraDown' in result)
  assert.ok('minTenure' in result)
  assert.ok('ceiling' in result)
})
