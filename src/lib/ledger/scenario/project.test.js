// src/lib/ledger/scenario/project.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { projectSegmented } from './project.js'
import { simulateAccumulation } from '../../retire/calc.js'

// Shared assumption block for the no-op-equivalence checks. Integer ages
// and an integer-multiple housing-until age keep the per-segment
// housingOaMonths split exact.
const BASE_ASSUMPTIONS = {
  currentAge: 40, retirementAge: 65, currentYear: 2026,
  salary: 7000, annualBonus: 14000, salaryGrowthRate: 3,
  investmentReturn: 4, investmentMonthly: 1500,
  rstuAmount: 3000, rstuFrequency: 'annual',
  housingOaMonthly: 900, housingOaUntilAge: 55,
}
const BASE_STATE = {
  startingOA: 90000, startingSA: 70000, startingMA: 35000,
  investmentStart: 55000, startingCash: 40000,
}

// The single unsplit run the segmented driver must reproduce for a no-op.
function unsplitReference(a = BASE_ASSUMPTIONS) {
  const months = Math.round((a.retirementAge - a.currentAge) * 12)
  return simulateAccumulation({
    currentAge: a.currentAge, retirementAge: a.retirementAge, currentYear: a.currentYear,
    salary: a.salary, salaryGrowthRate: a.salaryGrowthRate, annualBonus: a.annualBonus,
    startingOA: BASE_STATE.startingOA, startingSA: BASE_STATE.startingSA, startingMA: BASE_STATE.startingMA,
    housingOaMonthly: a.housingOaMonthly,
    housingOaMonths: a.housingOaUntilAge != null
      ? Math.max(0, Math.round((a.housingOaUntilAge - a.currentAge) * 12))
      : Infinity,
    rstuAmount: a.rstuAmount, rstuFrequency: a.rstuFrequency,
    investmentStart: BASE_STATE.investmentStart, investmentMonthly: a.investmentMonthly,
    investmentReturn: a.investmentReturn,
  })
  void months
}

function assertFinalsMatch(seg, ref, label, tol = 0.01) {
  assert.ok(Math.abs(seg.oaFinal - ref.oaFinal) <= tol, `${label}: oaFinal ${seg.oaFinal} vs ${ref.oaFinal}`)
  assert.ok(Math.abs(seg.saFinal - ref.saFinal) <= tol, `${label}: saFinal ${seg.saFinal} vs ${ref.saFinal}`)
  assert.ok(Math.abs(seg.maFinal - ref.maFinal) <= tol, `${label}: maFinal ${seg.maFinal} vs ${ref.maFinal}`)
  assert.ok(Math.abs(seg.investmentFinal - ref.investmentFinal) <= tol, `${label}: investmentFinal ${seg.investmentFinal} vs ${ref.investmentFinal}`)
}

// ─── No-op equivalence (U1's gate) ──────────────────────────────────────

test('a single no-op move reproduces one unsplit accumulation run to the cent', () => {
  const ref = unsplitReference()
  const seg = projectSegmented(BASE_STATE, [{ year: 10 }], BASE_ASSUMPTIONS)
  assertFinalsMatch(seg, ref, 'no-op at year 10')
  assert.equal(seg.cashFinal, BASE_STATE.startingCash) // cash held flat, untouched by a no-op
})

test('no-op equivalence holds with a boundary exactly at ages 55 and 65', () => {
  // retire at 70 so a year-25 (age 65) boundary sits inside the horizon.
  const a = { ...BASE_ASSUMPTIONS, retirementAge: 70 }
  const ref = unsplitReference(a)
  const seg = projectSegmented(BASE_STATE, [{ year: 15 }, { year: 25 }], a) // ages 55 and 65
  assertFinalsMatch(seg, ref, 'boundaries at 55 and 65')
})

test('no-op equivalence holds with boundaries AFTER the freezes (ages 57 and 67) — the KD1-refinement regression', () => {
  // Without carrying frozenFRS / frozenBHS across the boundary, the
  // post-55 / post-65 segments re-derive a higher prevailing sum and
  // these finals drift apart by a growing margin.
  const a = { ...BASE_ASSUMPTIONS, retirementAge: 75 }
  const ref = unsplitReference(a)
  const seg = projectSegmented(BASE_STATE, [{ year: 17 }, { year: 27 }], a) // ages 57 and 67
  assertFinalsMatch(seg, ref, 'boundaries at 57 and 67')
})

test('no-op equivalence holds with no housing drawdown and no bonus', () => {
  const a = { ...BASE_ASSUMPTIONS, housingOaMonthly: 0, housingOaUntilAge: null, annualBonus: 0 }
  const ref = unsplitReference(a)
  const seg = projectSegmented(BASE_STATE, [{ year: 4 }, { year: 12 }, { year: 20 }], a)
  assertFinalsMatch(seg, ref, 'plain no-op, three boundaries')
})

test('a year-0 no-op move collapses the first segment and still matches', () => {
  const ref = unsplitReference()
  const seg = projectSegmented(BASE_STATE, [{ year: 0 }], BASE_ASSUMPTIONS)
  assertFinalsMatch(seg, ref, 'no-op at year 0')
  assert.equal(seg.segments[0].startYear, 0)
})

// ─── Move effects ──────────────────────────────────────────────────────

test('a cash lump into investments raises investmentFinal by ~FV of the lump and drops cashFinal', () => {
  const ref = projectSegmented(BASE_STATE, [{ year: 3 }], BASE_ASSUMPTIONS)
  const withLump = projectSegmented(
    BASE_STATE,
    [{ year: 3, investmentLump: 150000, cash: -150000 }],
    BASE_ASSUMPTIONS,
  )
  const r = BASE_ASSUMPTIONS.investmentReturn / 100
  const yearsCompounding = BASE_ASSUMPTIONS.retirementAge - BASE_ASSUMPTIONS.currentAge - 3
  const expectedGain = 150000 * Math.pow(1 + r, yearsCompounding)
  assert.ok(
    Math.abs((withLump.investmentFinal - ref.investmentFinal) - expectedGain) < expectedGain * 0.02,
    `lump gain ${withLump.investmentFinal - ref.investmentFinal} vs ~${expectedGain}`,
  )
  assert.equal(withLump.cashFinal, BASE_STATE.startingCash - 150000)
})

test('a contribution drop lowers investmentFinal by ~FV of the monthly difference', () => {
  const ref = projectSegmented(BASE_STATE, [{ year: 5 }], BASE_ASSUMPTIONS)
  const withDrop = projectSegmented(
    BASE_STATE,
    [{ year: 5, monthlyContribution: -800 }], // 1500 -> 700 from year 5
    BASE_ASSUMPTIONS,
  )
  assert.ok(withDrop.investmentFinal < ref.investmentFinal, 'a lower contribution yields a lower balance')
  const r = BASE_ASSUMPTIONS.investmentReturn / 100 / 12
  const monthsLeft = (BASE_ASSUMPTIONS.retirementAge - BASE_ASSUMPTIONS.currentAge - 5) * 12
  const fvOfDiff = 800 * ((Math.pow(1 + r, monthsLeft) - 1) / r)
  assert.ok(
    Math.abs((ref.investmentFinal - withDrop.investmentFinal) - fvOfDiff) < fvOfDiff * 0.02,
    `drop ${ref.investmentFinal - withDrop.investmentFinal} vs ~${fvOfDiff}`,
  )
})

test('a financed car adds a loan-payoff boundary that steps the contribution back up', () => {
  // buy-car at year 2: -1200/mo (instalment + running); loan ends year 9,
  // freeing +900/mo of instalment back (running cost of 300 continues).
  const moves = [{
    year: 2, monthlyContribution: -1200,
    payoff: { year: 9, monthlyContribution: 900 },
  }]
  const withPayoff = projectSegmented(BASE_STATE, moves, BASE_ASSUMPTIONS)
  // Same purchase but pretend the loan never ends (no payoff step-up).
  const noPayoff = projectSegmented(
    BASE_STATE,
    [{ year: 2, monthlyContribution: -1200 }],
    BASE_ASSUMPTIONS,
  )
  assert.ok(
    withPayoff.investmentFinal > noPayoff.investmentFinal,
    'freeing the instalment at payoff leaves a higher balance than draining it the whole horizon',
  )
  assert.ok(
    withPayoff.segments.some((s) => s.startYear === 9),
    'a segment boundary exists at the loan-payoff year',
  )
})

// ─── Normalisation ─────────────────────────────────────────────────────

test('moves are sorted, fractional years truncated, and past-retirement moves dropped', () => {
  const ref = projectSegmented(BASE_STATE, [{ year: 5, monthlyContribution: -200 }], BASE_ASSUMPTIONS)
  const messy = projectSegmented(
    BASE_STATE,
    [
      { year: 99, monthlyContribution: -5000 }, // past retirement (25y horizon) -> dropped
      { year: 5.7, monthlyContribution: -200 }, // -> year 5
    ],
    BASE_ASSUMPTIONS,
  )
  assertFinalsMatch(messy, ref, 'normalised messy input')
})

test('a negative move year floors at 0', () => {
  const atZero = projectSegmented(BASE_STATE, [{ year: 0, investmentLump: 10000, cash: -10000 }], BASE_ASSUMPTIONS)
  const negative = projectSegmented(BASE_STATE, [{ year: -3, investmentLump: 10000, cash: -10000 }], BASE_ASSUMPTIONS)
  assertFinalsMatch(negative, atZero, 'negative year == year 0')
})

test('the segment trace covers the whole horizon in order', () => {
  const seg = projectSegmented(BASE_STATE, [{ year: 6 }, { year: 14 }], BASE_ASSUMPTIONS)
  assert.equal(seg.segments[0].startYear, 0)
  assert.equal(seg.segments[seg.segments.length - 1].endYear, 25)
  for (let i = 1; i < seg.segments.length; i++) {
    assert.equal(seg.segments[i].startYear, seg.segments[i - 1].endYear)
  }
})
