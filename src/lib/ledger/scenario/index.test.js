// src/lib/ledger/scenario/index.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runScenario } from './index.js'
import { simulateAccumulation } from '../../retire/calc.js'
import { solveSustainableWithdrawal } from './solve.js'

const RETIRE = {
  currentAge: 40, retirementAge: 65, currentYear: 2026, lifeExpectancy: 90,
  salary: 8_000, annualBonus: 16_000, salaryGrowthRate: 3,
  investmentMonthly: 2_000, rstuAmount: 0, rstuFrequency: 'monthly',
  housingOaMonthly: 1_000, housingOaUntilAge: 55, swr: 3,
}
const BASE_STATE = {
  startingOA: 100_000, startingSA: 80_000, startingMA: 40_000,
  investmentStart: 60_000, startingCash: 250_000,
  property: { value: 900_000, mortgagePrincipal: 400_000, mortgageRatePct: 2.6, mortgageTenureYears: 20 },
}
const BUNDLES = {
  conservative: { equityReturn: 3, propertyAppreciation: 1, inflation: 3 },
  base: { equityReturn: 5, propertyAppreciation: 2.5, inflation: 2.5 },
  optimistic: { equityReturn: 7, propertyAppreciation: 4, inflation: 2 },
}
const SALE_INPUTS = {
  propertyType: 'private',
  purchasePrice: 800_000, purchaseDate: '2014-01-01',
  salePrice: 900_000, saleDate: '2026-01-01',
  loanTaken: 500_000, mortgageRate: 2.6, loanTenure: 25, cpfOutlay: 120_000,
}
const CAR = {
  id: 'sealion7', name: 'BYD Sealion 7', price: 265_388, omv: 37_500,
  coe: 'Cat B', loanCap: 60, rateTier: 'green', ves: 22_500,
}
const REFERENCE = 4_000

const baseline = () => runScenario(BASE_STATE, { label: 'Baseline', moves: [] }, BUNDLES, RETIRE, REFERENCE)

// ─── Baseline / regression ─────────────────────────────────────────────

test('a baseline scenario with no moves returns a three-value band and a verdict', () => {
  const r = baseline()
  assert.ok(r.band.conservative > 0 && r.band.base > 0 && r.band.optimistic > 0)
  assert.ok(r.band.optimistic > r.band.base && r.band.base > r.band.conservative, 'band widens with the bundle')
  assert.ok(['comfortably enough', 'tight', 'short'].includes(r.read))
})

test('R17 — the baseline band.base reconciles with a direct unsplit accumulation + solve', () => {
  const months = (RETIRE.retirementAge - RETIRE.currentAge) * 12
  const accum = simulateAccumulation({
    currentAge: RETIRE.currentAge, retirementAge: RETIRE.retirementAge, currentYear: RETIRE.currentYear,
    salary: RETIRE.salary, salaryGrowthRate: RETIRE.salaryGrowthRate, annualBonus: RETIRE.annualBonus,
    startingOA: BASE_STATE.startingOA, startingSA: BASE_STATE.startingSA, startingMA: BASE_STATE.startingMA,
    housingOaMonthly: RETIRE.housingOaMonthly,
    housingOaMonths: Math.round((RETIRE.housingOaUntilAge - RETIRE.currentAge) * 12),
    investmentStart: BASE_STATE.investmentStart, investmentMonthly: RETIRE.investmentMonthly,
    investmentReturn: BUNDLES.base.equityReturn,
  })
  void months
  const liquid = accum.oaFinal + accum.saFinal + accum.investmentFinal + BASE_STATE.startingCash
  const direct = solveSustainableWithdrawal(liquid, {
    currentAge: RETIRE.currentAge, retirementAge: RETIRE.retirementAge, lifeExpectancy: RETIRE.lifeExpectancy,
    inflationRate: BUNDLES.base.inflation, investmentReturn: BUNDLES.base.equityReturn,
  }).monthly
  const r = baseline()
  assert.ok(Math.abs(r.band.base - direct) <= 50, `planner ${r.band.base} vs direct ${direct}`)
})

test('R8 — the liquid base the solver sees excludes property equity', () => {
  const withProp = runScenario(BASE_STATE, { label: 'A', moves: [] }, BUNDLES, RETIRE, REFERENCE)
  const noProp = runScenario({ ...BASE_STATE, property: null }, { label: 'A', moves: [] }, BUNDLES, RETIRE, REFERENCE)
  assert.equal(withProp.liquidBaseAtRetirement, noProp.liquidBaseAtRetirement)
  assert.ok(withProp.assetMix.property > 0 && noProp.assetMix.property === 0)
  assert.ok(withProp.netWorthAtRetirement > noProp.netWorthAtRetirement, 'net worth still counts property equity')
})

// ─── Acceptance examples ───────────────────────────────────────────────

test('AE1 — sell + buy a bigger place + a car drops the base headline and shifts the mix toward property', () => {
  const moves = [
    { type: 'sell-property', year: 0, inputs: SALE_INPUTS },
    { type: 'buy-property', year: 0, inputs: { newPrice: 1_400_000, newLoanAmount: 900_000, newLoanTenure: 25, newMortgageRate: 3, absd: 0, otherFees: 6_000 } },
    { type: 'buy-car', year: 2, inputs: { car: CAR, salary: 12_000, down: 50_000, tenure: 7 } },
  ]
  const b = baseline()
  const s = runScenario(BASE_STATE, { label: 'Upgrade + car', moves }, BUNDLES, RETIRE, REFERENCE)
  assert.ok(s.band.base < b.band.base, `scenario ${s.band.base} should be below baseline ${b.band.base}`)
  assert.ok(s.assetMix.property > b.assetMix.property, 'more property equity than the baseline flat')
  assert.ok(s.assetMix.liquid < b.assetMix.liquid, 'lower contributions and a bigger mortgage leave less liquid')
})

test('AE2 — adding a year-8 upgrade steps the property value up and moves the headline', () => {
  const baseMoves = [{ type: 'buy-car', year: 1, inputs: { car: CAR, salary: 12_000, down: 40_000, tenure: 6 } }]
  const upgradeMoves = [
    ...baseMoves,
    { type: 'sell-property', year: 8, inputs: { ...SALE_INPUTS, saleDate: '2034-01-01', salePrice: 1_050_000 } },
    { type: 'buy-property', year: 8, inputs: { newPrice: 1_800_000, newLoanAmount: 1_200_000, newLoanTenure: 20, newMortgageRate: 3, absd: 0, otherFees: 6_000 } },
  ]
  const without = runScenario(BASE_STATE, { label: 'no upgrade', moves: baseMoves }, BUNDLES, RETIRE, REFERENCE)
  const withUpgrade = runScenario(BASE_STATE, { label: 'upgrade at 8', moves: upgradeMoves }, BUNDLES, RETIRE, REFERENCE)
  assert.ok(withUpgrade.assetMix.property > without.assetMix.property, 'the larger year-8 condo lifts property equity at retirement')
  assert.notEqual(withUpgrade.band.base, without.band.base)
})

test('AE3 — a year-4 child lowers the base headline; a reference above the conservative end reads short', () => {
  const childMoves = [{ type: 'have-child', year: 4, inputs: { annualCost: 24_000, lumpAmount: 80_000, lumpYear: 22 } }]
  const without = baseline()
  const withChild = runScenario(BASE_STATE, { label: 'child', moves: childMoves }, BUNDLES, RETIRE, REFERENCE)
  assert.ok(withChild.band.base < without.band.base, 'the child cost lowers the sustainable withdrawal')
  // Pick a reference between the conservative and base ends of the child scenario.
  const ref = (withChild.band.conservative + withChild.band.base) / 2
  const scored = runScenario(BASE_STATE, { label: 'child', moves: childMoves }, BUNDLES, RETIRE, ref)
  assert.equal(scored.read, 'short', 'conservative end below the reference forces short even with base above it')
})

test('AE4 — lowering the base bundle equity return lowers only band.base and can flip the verdict', () => {
  const lowered = { ...BUNDLES, base: { ...BUNDLES.base, equityReturn: 2 } }
  const before = baseline()
  const after = runScenario(BASE_STATE, { label: 'Baseline', moves: [] }, lowered, RETIRE, REFERENCE)
  assert.ok(after.band.base < before.band.base, 'a lower base return lowers the base headline')
  assert.equal(after.band.conservative, before.band.conservative, 'the conservative bundle is untouched')
  assert.equal(after.band.optimistic, before.band.optimistic, 'the optimistic bundle is untouched')
})

// ─── Verdict labelling (KTD8) ──────────────────────────────────────────

test('read is "no-reference" when the reference is zero or unset', () => {
  const r = runScenario(BASE_STATE, { label: 'A', moves: [] }, BUNDLES, RETIRE, 0)
  assert.equal(r.read, 'no-reference')
})

test('read boundaries map to the documented labels', () => {
  // Collapse the band to a point so the base-vs-reference ladder is
  // exercised without the conservative-end rule masking it.
  const flat = { equityReturn: 5, propertyAppreciation: 2.5, inflation: 2.5 }
  const flatBundles = { conservative: flat, base: flat, optimistic: flat }
  const run = (ref) => runScenario(BASE_STATE, { label: 'A', moves: [] }, flatBundles, RETIRE, ref).read
  const point = runScenario(BASE_STATE, { label: 'A', moves: [] }, flatBundles, RETIRE, 1).band.base
  assert.equal(run(point * 0.5), 'comfortably enough', 'reference well below the headline -> comfortably enough')
  assert.equal(run(point - 1), 'tight', 'reference just below the headline -> tight')
  assert.equal(run(point + 1), 'short', 'reference above the headline -> short')
  assert.equal(run(0), 'no-reference')
})

test('a band.conservative below the reference forces short even when band.base clears it', () => {
  const r = baseline()
  // reference between the conservative and base ends of the wide bundle band.
  const ref = (r.band.conservative + r.band.base) / 2
  assert.ok(r.band.base > ref && r.band.conservative < ref)
  assert.equal(runScenario(BASE_STATE, { label: 'A', moves: [] }, BUNDLES, RETIRE, ref).read, 'short')
})

// ─── Perf ──────────────────────────────────────────────────────────────

test('a full 9-run recompute (baseline + 2 scenarios x 3 bundles) is well under budget', () => {
  const scenarioA = { label: 'A', moves: [{ type: 'buy-car', year: 2, inputs: { car: CAR, salary: 12_000, down: 45_000, tenure: 7 } }] }
  const scenarioB = { label: 'B', moves: [
    { type: 'sell-property', year: 3, inputs: { ...SALE_INPUTS, saleDate: '2029-01-01' } },
    { type: 'buy-property', year: 3, inputs: { newPrice: 1_500_000, newLoanAmount: 1_000_000, newLoanTenure: 25, newMortgageRate: 3, absd: 0, otherFees: 5_000 } },
    { type: 'have-child', year: 5, inputs: { annualCost: 18_000 } },
  ] }
  const t0 = performance.now()
  runScenario(BASE_STATE, { label: 'Baseline', moves: [] }, BUNDLES, RETIRE, REFERENCE)
  runScenario(BASE_STATE, scenarioA, BUNDLES, RETIRE, REFERENCE)
  runScenario(BASE_STATE, scenarioB, BUNDLES, RETIRE, REFERENCE)
  const elapsed = performance.now() - t0
  console.log(`    9-run recompute: ${elapsed.toFixed(2)}ms`)
  assert.ok(elapsed < 150, `9-run recompute took ${elapsed.toFixed(1)}ms (generous CI ceiling 150ms; desktop target <16ms)`)
})
