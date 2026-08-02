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
})

test('bandForAge: returns null past the last band', () => {
  assert.equal(bandForAge(19), null)
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

test('monthlySavingsPlan: zero return is just total ÷ months', () => {
  const plan = monthlySavingsPlan(120000, 10, 0)
  approx(plan, 120000 / 120)
})

test('monthlySavingsPlan: a positive return needs LESS saved per month than zero return', () => {
  const noReturn = monthlySavingsPlan(120000, 10, 0)
  const withReturn = monthlySavingsPlan(120000, 10, 5)
  assert.ok(withReturn < noReturn)
})

test('SUBSIDY_TIERS: low tier has strictly more subsidy than high tier', () => {
  assert.ok(SUBSIDY_TIERS.low.additionalSubsidy > SUBSIDY_TIERS.mid.additionalSubsidy)
  assert.ok(SUBSIDY_TIERS.mid.additionalSubsidy > SUBSIDY_TIERS.high.additionalSubsidy)
})
