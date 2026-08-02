// src/lib/child/calc.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  AGE_BANDS, SUBSIDY_TIERS, bandForAge, monthlyCostForBand, projectChildCost, monthlySavingsPlan,
} from './calc.js'

function approx(a, b, eps = 0.5) {
  assert.ok(Math.abs(a - b) <= eps, `expected ${a} ≈ ${b}`)
}

test('bandForAge: returns the correct band for boundary ages', () => {
  assert.equal(bandForAge(0).key, 'infant')
  assert.equal(bandForAge(2).key, 'infant')
  assert.equal(bandForAge(3).key, 'preschool')
  assert.equal(bandForAge(6).key, 'preschool')
  assert.equal(bandForAge(7).key, 'primary')
  assert.equal(bandForAge(12).key, 'primary')
  assert.equal(bandForAge(13).key, 'secondary')
  assert.equal(bandForAge(16).key, 'secondary')
  assert.equal(bandForAge(17).key, 'postsecondary')
  assert.equal(bandForAge(18).key, 'postsecondary')
  assert.equal(bandForAge(19).key, 'university')
  assert.equal(bandForAge(22).key, 'university')
})

test('bandForAge: returns null past the last band', () => {
  assert.equal(bandForAge(23), null)
})

test('monthlyCostForBand: subsidy only applies to infant/preschool bands', () => {
  const infant = AGE_BANDS.find(b => b.key === 'infant')
  const primary = AGE_BANDS.find(b => b.key === 'primary')
  const infantCost = monthlyCostForBand(infant, 'low', true)
  const primaryCost = monthlyCostForBand(primary, 'low', true)
  assert.ok(infantCost.subsidy > 0, 'infant band should get a subsidy')
  assert.equal(primaryCost.subsidy, 0, 'primary band should never get a childcare subsidy')
})

test('monthlyCostForBand: subsidy never exceeds the childcare fee (no negative cost)', () => {
  const infant = AGE_BANDS.find(b => b.key === 'infant')
  const cost = monthlyCostForBand({ ...infant, childcare: 100 }, 'low', true)
  assert.equal(cost.childcare, 0)
  assert.ok(cost.total >= 0)
})

test('monthlyCostForBand: useSubsidy=false ignores the subsidy entirely', () => {
  const infant = AGE_BANDS.find(b => b.key === 'infant')
  const withSubsidy = monthlyCostForBand(infant, 'low', true)
  const withoutSubsidy = monthlyCostForBand(infant, 'low', false)
  assert.equal(withoutSubsidy.subsidy, 0)
  assert.ok(withoutSubsidy.total > withSubsidy.total)
})

test('monthlyCostForBand: higher-income tier gets less subsidy than lower-income tier', () => {
  const infant = AGE_BANDS.find(b => b.key === 'infant')
  const high = monthlyCostForBand(infant, 'high', true)
  const low = monthlyCostForBand(infant, 'low', true)
  assert.ok(low.subsidy > high.subsidy)
  assert.ok(low.total < high.total)
})

test('projectChildCost: spans every year from currentAge to planUntilAge inclusive', () => {
  const result = projectChildCost({ currentAge: 0, planUntilAge: 18 })
  assert.equal(result.years.length, 19)
  assert.equal(result.years[0].age, 0)
  assert.equal(result.years[18].age, 18)
})

test('projectChildCost: starting mid-childhood only projects the remaining years', () => {
  const result = projectChildCost({ currentAge: 10, planUntilAge: 18 })
  assert.equal(result.years.length, 9)
  assert.equal(result.years[0].age, 10)
})

test('projectChildCost: totalAllChildren scales linearly with numberOfChildren', () => {
  const one = projectChildCost({ currentAge: 0, planUntilAge: 18, numberOfChildren: 1 })
  const two = projectChildCost({ currentAge: 0, planUntilAge: 18, numberOfChildren: 2 })
  approx(two.totalAllChildren, one.totalAllChildren * 2)
  approx(two.totalPerChild, one.totalPerChild)
})

test('projectChildCost: categoryTotals sum to totalPerChild', () => {
  const result = projectChildCost({ currentAge: 0, planUntilAge: 18 })
  const sum = result.categoryTotals.childcare + result.categoryTotals.tuitionEnrichment
    + result.categoryTotals.dailyExpenses + result.categoryTotals.schoolFees
  approx(sum, result.totalPerChild)
})

test('projectChildCost: subsidy reduces the total versus no subsidy', () => {
  const withSubsidy = projectChildCost({ currentAge: 0, planUntilAge: 18, incomeTier: 'low', useSubsidy: true })
  const withoutSubsidy = projectChildCost({ currentAge: 0, planUntilAge: 18, incomeTier: 'low', useSubsidy: false })
  assert.ok(withSubsidy.totalPerChild < withoutSubsidy.totalPerChild)
  assert.ok(withSubsidy.categoryTotals.subsidySaved > 0)
})

test('projectChildCost: numberOfChildren floors at 1 even if given 0 or negative', () => {
  assert.equal(projectChildCost({ currentAge: 0, planUntilAge: 5, numberOfChildren: 0 }).children, 1)
  assert.equal(projectChildCost({ currentAge: 0, planUntilAge: 5, numberOfChildren: -3 }).children, 1)
})

test('projectChildCost: planUntilAge up to 22 actually adds cost, not just a relabeled total (regression)', () => {
  // Previously AGE_BANDS stopped at 18, so a planUntilAge of 22 silently
  // produced the byte-identical total to planUntilAge of 18 while still
  // claiming to cover the extended horizon.
  const to18 = projectChildCost({ currentAge: 0, planUntilAge: 18 })
  const to22 = projectChildCost({ currentAge: 0, planUntilAge: 22 })
  assert.equal(to22.years.length, 23)
  assert.ok(to22.totalPerChild > to18.totalPerChild, 'extending to 22 must add real university-year cost')
})

test('projectChildCost: a currentAge past every band returns an empty projection, not a fabricated total', () => {
  const result = projectChildCost({ currentAge: 25, planUntilAge: 30 })
  assert.equal(result.years.length, 0)
  assert.equal(result.totalAllChildren, 0)
})

test('monthlySavingsPlan: matches averageMonthlyPerChild when the assumed return is zero', () => {
  const projection = projectChildCost({ currentAge: 0, planUntilAge: 18 })
  const plan = monthlySavingsPlan(projection.years, 0)
  approx(plan, projection.averageMonthlyPerChild, 1)
})

test('monthlySavingsPlan: needs MORE saved per month than a naive lump-sum accumulation would suggest (regression)', () => {
  // Regression for the bug where this solved for the payment that
  // accumulates the TOTAL as a future lump sum, instead of funding the
  // real pay-as-you-go outflow stream — which understated the required
  // monthly figure by a wide margin at a positive assumed return.
  const projection = projectChildCost({ currentAge: 0, planUntilAge: 18 })
  const correct = monthlySavingsPlan(projection.years, 3)
  const naiveLumpSum = (() => {
    const months = projection.years.length * 12
    const r = 0.03 / 12
    const annuityFactor = (Math.pow(1 + r, months) - 1) / r
    return projection.totalPerChild / annuityFactor
  })()
  assert.ok(correct > naiveLumpSum, `correct plan (${correct}) must exceed the naive lump-sum figure (${naiveLumpSum})`)
})

test('monthlySavingsPlan: satisfies its own definition — level monthly deposits, earning the assumed return, exactly fund the real cost stream to zero', () => {
  // Direct simulation of the recursion the formula solves:
  // bal(m+1) = bal(m)·(1+r) + deposit − expense(m). If the level deposit
  // is right, the running balance should land within a cent of zero
  // after the last month's expense — never negative along the way (this
  // schedule happens not to go negative; a front-loaded-enough schedule
  // legitimately could, which is a real limitation of a single level
  // deposit, not a bug in the formula).
  const projection = projectChildCost({ currentAge: 0, planUntilAge: 18 })
  const monthlySchedule = projection.years.flatMap(y => Array(12).fill(y.monthly.total))
  const annualReturnPct = 3
  const deposit = monthlySavingsPlan(projection.years, annualReturnPct)
  const monthlyReturn = annualReturnPct / 100 / 12
  let balance = 0
  for (const expense of monthlySchedule) balance = balance * (1 + monthlyReturn) + deposit - expense
  approx(balance, 0, 1)
})

test('monthlySavingsPlan: a back-loaded cost stream needs LESS saved per month at a positive return (the classic accumulation case)', () => {
  // Confirms the formula still gives the intuitive answer when costs are
  // concentrated at the end, unlike the real (front/back-mixed) child-cost
  // schedule above, where a positive return does NOT reliably reduce the
  // required deposit — that's a genuine property of THIS front-loaded
  // schedule (infant care costs more per month than primary school), not
  // a bug: money needed almost immediately for early years can't benefit
  // from compounding the way a single future lump sum would.
  const backLoadedYears = [...Array(17).fill(0), 100_000 / 12].map(monthly => ({ monthly: { total: monthly } }))
  const noReturn = monthlySavingsPlan(backLoadedYears, 0)
  const withReturn = monthlySavingsPlan(backLoadedYears, 5)
  assert.ok(withReturn < noReturn)
})

test('SUBSIDY_TIERS: infant Basic Subsidy is the real $600, not the childcare/preschool $300 (regression)', () => {
  const infant = AGE_BANDS.find(b => b.key === 'infant')
  const preschool = AGE_BANDS.find(b => b.key === 'preschool')
  assert.equal(infant.subsidy.basic, 600)
  assert.equal(preschool.subsidy.basic, 300)
})

test('AGE_BANDS: low-income tier has strictly more Additional Subsidy than high-income tier, for both infant and preschool', () => {
  for (const key of ['infant', 'preschool']) {
    const band = AGE_BANDS.find(b => b.key === key)
    assert.ok(band.subsidy.additionalByTier.low > band.subsidy.additionalByTier.mid)
    assert.ok(band.subsidy.additionalByTier.mid > band.subsidy.additionalByTier.high)
  }
})
