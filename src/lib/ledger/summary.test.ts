import { test } from 'node:test'
import assert from 'node:assert/strict'
import { summarise, relativeAge, formatTile, filledModules, STALE_AFTER_DAYS } from './summary.ts'
import { buildBaselineState, calcNetWorth, calcInvestmentCapacity, calcTDSR } from './calc.ts'

const NOW = Date.UTC(2026, 10, 25)
const DAY = 86_400_000

const FIXTURE = {
  version: 7,
  house: { outstandingBalance: 400_000, monthlyInstalment: 2_000, propertyValue: 1_200_000, propertyType: 'private', savedAt: NOW - 10 * DAY },
  drive: { monthlyInstalment: 1_200, salary: 9_000, loanOutstanding: 60_000, carValue: 90_000, savedAt: NOW - 3 * DAY },
  retire: { salary: 10_000, oaBalance: 120_000, saBalance: 80_000, maBalance: 50_000, investmentBalance: 30_000, monthlyContribution: 800, savedAt: NOW - 200 * DAY },
  insure: { monthlyPremium: 350, score: 72, savedAt: NOW - DAY },
  tax: { monthlyTakeHome: 7_600, annualTax: 6_200, marginalRate: 11.5, age: 34, savedAt: NOW },
  etf: { portfolioValue: 45_000, monthlyContribution: 1_000, savedAt: NOW - 30 * DAY },
  flow: null, ledger: null, insureHistory: null,
}

const byId = (s: any) => Object.fromEntries(s.tiles.map((t: any) => [t.id, t]))

test('an empty profile has no data and only "Add" tiles', () => {
  const s = summarise({ version: 7 }, NOW)
  assert.equal(s.hasData, false)
  assert.equal(s.filledCount, 0)
  assert.ok(s.tiles.length >= 4)
  for (const t of s.tiles) assert.equal(t.value, null, t.id)
  assert.deepEqual(s.tiles.map((t) => t.id), ['netWorth', 'insure', 'tax', 'retire'])
})

test('tiles agree with MyLedger\'s engine for the same profile', () => {
  const s = byId(summarise(FIXTURE, NOW))
  const state = buildBaselineState(FIXTURE)
  assert.equal(s.netWorth.value, calcNetWorth(state).netWorth)
  assert.equal(s.capacity.value, calcInvestmentCapacity(state))
  assert.equal(s.tdsr.value, calcTDSR(state).tdsr! * 100)
  assert.equal(s.insure.value, 72)
  assert.equal(s.tax.value, 6_200)
  assert.equal(s.retire.value, 250_000)
})

test('known values for the fixture', () => {
  const s = byId(summarise(FIXTURE, NOW))
  // 800k property equity + 30k car equity + 250k CPF + 75k invested
  assert.equal(s.netWorth.value, 1_155_000)
  // 7,600 take-home − 2,000 − 1,200 − 350 = 4,050
  assert.equal(s.capacity.value, 4_050)
  // (2,000 + 1,200) / 10,000 salary
  assert.equal(s.tdsr.value.toFixed(1), '32.0')
  assert.equal(s.tdsr.tone, 'ok')
  assert.equal(s.netWorth.sub, 'From property, car, CPF, investments')
})

test('freshness: each tile carries its newest contributing stamp; old figures are stale', () => {
  const s = byId(summarise(FIXTURE, NOW))
  assert.equal(s.tax.checked, 'today')
  assert.equal(s.insure.checked, 'yesterday')
  assert.equal(s.netWorth.checked, '3 days ago')
  assert.equal(s.retire.checked, '7 months ago')
  assert.equal(s.retire.stale, true)
  assert.equal(s.tax.stale, false)
})

test('TDSR over the bank limit is flagged', () => {
  const s = byId(summarise({ ...FIXTURE, house: { ...FIXTURE.house, monthlyInstalment: 5_000 } }, NOW))
  assert.equal(s.tdsr.tone, 'warn')
})

test('no TDSR tile without a loan; no capacity tile without an income', () => {
  const noLoans = byId(summarise({ version: 7, retire: { ...FIXTURE.retire } }, NOW))
  assert.equal(noLoans.tdsr, undefined)
  assert.ok(noLoans.capacity)
  const noIncome = byId(summarise({ version: 7, etf: { portfolioValue: 1000, savedAt: NOW } }, NOW))
  assert.equal(noIncome.capacity, undefined)
  assert.equal(noIncome.netWorth.value, 1000)
})

test('saved form inputs alone do not count as filled', () => {
  assert.equal(filledModules({ tax: { inputs: { salary: 1 } } }).tax, false)
  assert.equal(summarise({ tax: { inputs: { salary: 1 } } }, NOW).hasData, false)
})

test('relativeAge and formatTile', () => {
  assert.equal(relativeAge(null, NOW), null)
  assert.equal(relativeAge(NOW - 44 * DAY, NOW), '44 days ago')
  assert.equal(relativeAge(NOW - 400 * DAY, NOW), 'over a year ago')
  assert.ok(STALE_AFTER_DAYS > 90)
  assert.equal(formatTile(({ value: -2500.4, format: 'sgd' } as any)), '−S$2,500')
  assert.equal(formatTile(({ value: 4050, format: 'sgdMonthly' } as any)), 'S$4,050/mo')
  assert.equal(formatTile(({ value: 32, format: 'pct' } as any)), '32.0%')
  assert.equal(formatTile(({ value: 71.6, format: 'score' } as any)), '72/100')
  assert.equal(formatTile(({ value: null, format: 'sgd' } as any)), null)
})
