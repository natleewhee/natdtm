import { test } from 'node:test'
import assert from 'node:assert/strict'
import { maskFigures, MASK, readPrivacy, setPrivacy } from './privacy.js'
import { summarise, formatTile } from '../ledger/summary.js'
import { buildInsights } from './insights.js'

const M = MASK

test('masks every figure shape the dashboard shows', () => {
  assert.equal(maskFigures('S$1,155,000'), `S$${M}`)
  assert.equal(maskFigures('−S$2,500'), `S$${M}`)
  assert.equal(maskFigures('S$4,050/mo'), `S$${M}/mo`)
  assert.equal(maskFigures('32.0%'), `${M}%`)
  assert.equal(maskFigures('72/100'), `${M}/100`)
  assert.equal(maskFigures('Premiums S$350/mo'), `Premiums S$${M}/mo`)
  assert.equal(maskFigures('Marginal rate 11.5%'), `Marginal rate ${M}%`)
  assert.equal(maskFigures('or S$1.2m and S$850k'), `or S$${M} and S$${M}`)
})

test('public rules stay readable: TDSR limit, SRS cap, per-S$1,000 unit', () => {
  assert.equal(maskFigures('Bank limit 55% of gross income'), 'Bank limit 55% of gross income')
  assert.equal(maskFigures('Each S$1,000 of SRS lowers your tax by about S$115'), `Each S$1,000 of SRS lowers your tax by about S$${M}`)
  assert.equal(maskFigures('up to S$15,300 a year'), 'up to S$15,300 a year')
  // …but a user figure that merely starts with those digits is masked.
  assert.equal(maskFigures('S$1,000,000 and 55.5% and S$15,3000'), `S$${M} and ${M}% and S$${M}`)
})

test('keeps words, ages and non-figures readable', () => {
  assert.equal(maskFigures('From property, car, CPF, investments'), 'From property, car, CPF, investments')
  assert.equal(maskFigures('It was last worked out 13 months ago.'), 'It was last worked out 13 months ago.')
  assert.equal(maskFigures('Re-run the 3-minute check'), 'Re-run the 3-minute check')
  assert.equal(maskFigures(null), null)
})

test('no digit of a real figure survives on a masked dashboard', () => {
  const now = Date.UTC(2026, 10, 25)
  const d = {
    house: { outstandingBalance: 400000, monthlyInstalment: 2000, propertyValue: 1200000, savedAt: now },
    retire: { salary: 10000, oaBalance: 120000, saBalance: 80000, maBalance: 50000, monthlyContribution: 800, savedAt: now },
    insure: { score: 72, monthlyPremium: 350, savedAt: now - 400 * 864e5 },
    tax: { annualTax: 6200, marginalRate: 11.5, monthlyTakeHome: 7600, savedAt: now },
  }
  const texts = [
    ...summarise(d, now).tiles.flatMap((t) => [formatTile(t), t.sub]),
    ...buildInsights(d, { now, limit: 10 }).flatMap((i) => [i.title, i.fact]),
  ].filter(Boolean).map(maskFigures)
  for (const t of texts) {
    // The only digits allowed are the "N months ago" age and fixed copy.
    const leftover = t.replace(/\b\d+ months? ago\b/g, '').replace(/3-minute|\/100|55%|S\$1,000|S\$15,300/g, '').match(/\d/)
    assert.equal(leftover, null, `figure left in: "${t}"`)
  }
})

test('the switch persists and defaults to off', () => {
  const store = new Map()
  global.window = {
    localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) },
    dispatchEvent: () => true,
  }
  assert.equal(readPrivacy(), false)
  setPrivacy(true)
  assert.equal(readPrivacy(), true)
  setPrivacy(false)
  assert.equal(readPrivacy(), false)
  delete global.window
})
