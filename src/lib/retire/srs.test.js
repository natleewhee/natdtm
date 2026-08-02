// src/lib/retire/srs.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  projectSrsBalance, srsWithdrawalSchedule, srsWithdrawalTax, compareSrsWithdrawalPlans,
  SRS_WITHDRAWAL_TAXABLE_FRACTION, SRS_MAX_WITHDRAWAL_YEARS,
} from './srs.js'

function approx(a, b, eps = 0.5) {
  assert.ok(Math.abs(a - b) <= eps, `expected ${a} ≈ ${b}`)
}

test('projectSrsBalance: zero contribution and zero return leaves the balance unchanged', () => {
  const result = projectSrsBalance({ startBalance: 10000, monthlyContribution: 0, annualReturnPct: 0, yearsToRetirement: 10 })
  approx(result, 10000)
})

test('projectSrsBalance: compounds monthly contributions forward at the given return', () => {
  const withReturn = projectSrsBalance({ startBalance: 0, monthlyContribution: 500, annualReturnPct: 6, yearsToRetirement: 20 })
  const noReturn = projectSrsBalance({ startBalance: 0, monthlyContribution: 500, annualReturnPct: 0, yearsToRetirement: 20 })
  // 500/mo for 20 years with no growth = exactly 120,000; with growth it must be higher.
  approx(noReturn, 500 * 12 * 20)
  assert.ok(withReturn > noReturn)
})

test('projectSrsBalance: zero years to retirement returns the starting balance untouched', () => {
  assert.equal(projectSrsBalance({ startBalance: 5000, monthlyContribution: 1000, annualReturnPct: 5, yearsToRetirement: 0 }), 5000)
})

test('srsWithdrawalSchedule: splits the balance evenly across the requested years', () => {
  const schedule = srsWithdrawalSchedule(100000, 10)
  assert.equal(schedule.length, 10)
  schedule.forEach(row => approx(row.withdrawal, 10000))
  approx(schedule.reduce((s, r) => s + r.withdrawal, 0), 100000)
})

test('srsWithdrawalSchedule: only half of each withdrawal is taxable', () => {
  const schedule = srsWithdrawalSchedule(100000, 10)
  schedule.forEach(row => approx(row.taxableAmount, row.withdrawal * SRS_WITHDRAWAL_TAXABLE_FRACTION))
})

test('srsWithdrawalSchedule: caps at SRS_MAX_WITHDRAWAL_YEARS even if more is requested', () => {
  const schedule = srsWithdrawalSchedule(100000, 15)
  assert.equal(schedule.length, SRS_MAX_WITHDRAWAL_YEARS)
})

test('srsWithdrawalSchedule: defaults to SRS_MAX_WITHDRAWAL_YEARS if 0 or negative is requested', () => {
  assert.equal(srsWithdrawalSchedule(100000, 0).length, SRS_MAX_WITHDRAWAL_YEARS)
  assert.equal(srsWithdrawalSchedule(100000, -5).length, SRS_MAX_WITHDRAWAL_YEARS)
})

test('srsWithdrawalTax: zero when the taxable amount alone sits within the 0% band', () => {
  assert.equal(srsWithdrawalTax(15000, 0), 0)
})

test('srsWithdrawalTax: taxes only the slice ABOVE existing other taxable income (progressive stacking)', () => {
  // otherTaxableIncome already fills the entire 0% band (first $20,000);
  // stacking $5,000 of SRS withdrawal on top should be taxed at the 2% band.
  const tax = srsWithdrawalTax(5000, 20000)
  approx(tax, 5000 * 0.02)
})

test('srsWithdrawalTax: never returns negative even with zero/negative inputs', () => {
  assert.equal(srsWithdrawalTax(0, 0), 0)
  assert.equal(srsWithdrawalTax(-100, -100), 0)
})

test('compareSrsWithdrawalPlans: spreading over more years never increases total tax (progressive bands)', () => {
  // A large enough balance that a 1-year lump sum pushes well into higher
  // bands, so spreading it out should strictly reduce total tax paid.
  const plans = compareSrsWithdrawalPlans(400000, 0, [1, 5, 10])
  const byYears = Object.fromEntries(plans.map(p => [p.years, p.totalTax]))
  assert.ok(byYears[10] <= byYears[5])
  assert.ok(byYears[5] <= byYears[1])
  assert.ok(byYears[1] > byYears[10], 'a large lump sum should owe strictly more tax than spreading it over 10 years')
})

test('compareSrsWithdrawalPlans: a small balance owes zero tax regardless of years (honest, not a manufactured saving)', () => {
  const plans = compareSrsWithdrawalPlans(30000, 0, [1, 5, 10])
  plans.forEach(p => assert.equal(p.totalTax, 0, `${p.years}-year plan should owe nothing when even the lump sum's taxable half is well under the tax-free band`))
})

test('compareSrsWithdrawalPlans: annualWithdrawal reflects balance/years for each option', () => {
  const plans = compareSrsWithdrawalPlans(100000, 0, [1, 10])
  const byYears = Object.fromEntries(plans.map(p => [p.years, p.annualWithdrawal]))
  approx(byYears[1], 100000)
  approx(byYears[10], 10000)
})
