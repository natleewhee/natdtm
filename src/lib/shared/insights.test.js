import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildInsights, RULES } from './insights.js'

const NOW = Date.UTC(2026, 10, 25)
const DAY = 86_400_000

const base = {
  retire: { salary: 10_000, savedAt: NOW },
  house: { monthlyInstalment: 2_000, outstandingBalance: 400_000, propertyValue: 1e6, savedAt: NOW },
  drive: { monthlyInstalment: 1_200, salary: 10_000, savedAt: NOW },
  tax: { marginalRate: 11.5, annualTax: 6_000, monthlyTakeHome: 7_500, savedAt: NOW },
  insure: { score: 70, monthlyPremium: 300, savedAt: NOW - 400 * DAY },
}
const ids = (xs) => xs.map((x) => x.id)

test('an empty profile produces no insights', () => {
  assert.deepEqual(buildInsights({}, { now: NOW }), [])
})

test('TDSR headroom is the bank limit minus current repayments', () => {
  const [tdsr] = buildInsights({ retire: base.retire, house: base.house, drive: base.drive }, { now: NOW, limit: 5 }).filter((i) => i.id === 'tdsr-headroom')
  // 55% × 10,000 − (2,000 + 1,200) = 2,300
  assert.equal(tdsr.title, 'S$2,300/mo of TDSR room left')
  assert.match(tdsr.fact, /32% of gross income/)
})

test('TDSR over the limit says so instead of a headroom figure', () => {
  const d = { retire: base.retire, house: { ...base.house, monthlyInstalment: 6_000 } }
  const [tdsr] = buildInsights(d, { now: NOW })
  assert.equal(tdsr.id, 'tdsr-headroom')
  assert.match(tdsr.title, /60% of your gross income/)
  assert.equal(tdsr.priority, 90)
})

test('SRS saving per S$1,000 follows the marginal rate', () => {
  const [srs] = buildInsights({ tax: base.tax }, { now: NOW })
  assert.equal(srs.id, 'srs-per-thousand')
  assert.equal(srs.title, 'Each S$1,000 of SRS lowers your tax by about S$115')
  assert.match(srs.fact, /S\$15,300/)
})

test('insurance re-check appears only after a year', () => {
  assert.ok(ids(buildInsights({ insure: base.insure }, { now: NOW })).includes('insurance-recheck'))
  assert.ok(!ids(buildInsights({ insure: { ...base.insure, savedAt: NOW - 100 * DAY } }, { now: NOW })).includes('insurance-recheck'))
})

test('living-costs note appears with an income and no spending, and goes once spending exists', () => {
  assert.ok(ids(buildInsights({ retire: base.retire }, { now: NOW })).includes('living-costs-missing'))
  assert.ok(!ids(buildInsights({ retire: base.retire, flow: { livingExpenses: 3000, savedAt: NOW } }, { now: NOW })).includes('living-costs-missing'))
})

test('at most three, highest priority first', () => {
  const xs = buildInsights(base, { now: NOW })
  assert.equal(xs.length, 3)
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i - 1].priority >= xs[i].priority)
  assert.deepEqual(ids(xs), ['insurance-recheck', 'srs-per-thousand', 'living-costs-missing'])
})

test('insight copy states arithmetic, never advice or products (KD3)', () => {
  const ADVICE = /\b(you should|we recommend|recommend|consider buying|buy|sign up|best (fund|policy|plan)|switch to|open an account)\b/i
  const PRODUCTS = /\b(DBS|OCBC|UOB|POSB|AIA|Prudential|Great Eastern|Endowus|Syfe|StashAway|Tiger|IBKR|Moomoo)\b/
  const fixtures = [
    base,
    { ...base, house: { ...base.house, monthlyInstalment: 6_000 } },
    { retire: base.retire },
  ]
  for (const f of fixtures) {
    for (const i of buildInsights(f, { now: NOW, limit: RULES.length })) {
      for (const text of [i.title, i.fact, i.linkLabel]) {
        assert.ok(!ADVICE.test(text), `${i.id}: advice wording in "${text}"`)
        assert.ok(!PRODUCTS.test(text), `${i.id}: product name in "${text}"`)
      }
      assert.ok(i.href.startsWith('/'), `${i.id} links to the working`)
    }
  }
})
