// Consolidates the five identical parseMoney suites that lived in
// src/lib/{house,ledger,retire,tax,flow}/theme.test.js.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SGD, SGDCompact, parseMoney, parseMoneyOrNull } from './money.ts'

test('parseMoney: plain digits', () => {
  assert.equal(parseMoney('900000'), 900000)
})

test('parseMoney: k/m shorthand', () => {
  assert.equal(parseMoney('900k'), 900000)
  assert.equal(parseMoney('1.2m'), 1200000)
})

test('parseMoney: comma-separated', () => {
  assert.equal(parseMoney('900,000'), 900000)
})

test('parseMoney: a leading $ sign does not collapse the value to 0', () => {
  assert.equal(parseMoney('$1,500,000'), 1500000)
})

test('parseMoney: an S$ prefix (the field\'s own decorative prefix, sometimes pasted along with the number)', () => {
  assert.equal(parseMoney('S$800k'), 800000)
})

test('parseMoney: space-separated thousands does not collapse to 1', () => {
  assert.equal(parseMoney('1 500 000'), 1500000)
})

test('parseMoney: empty, null, undefined and garbage are 0, not NaN', () => {
  for (const v of ['', null, undefined, 'abc', '$']) assert.equal(parseMoney(v), 0)
})

test('parseMoney: keeps cents (no rounding)', () => {
  assert.equal(parseMoney('1234.56'), 1234.56)
})

test('parseMoneyOrNull: same parsing, rounded, null for nothing typed', () => {
  assert.equal(parseMoneyOrNull('80k'), 80000)
  assert.equal(parseMoneyOrNull('1.2m'), 1200000)
  assert.equal(parseMoneyOrNull('1234.56'), 1235)
  assert.equal(parseMoneyOrNull('0'), 0)
  for (const v of ['', null, undefined, 'abc']) assert.equal(parseMoneyOrNull(v), null)
})

test('SGD formats rounded dollars and never prints NaN', () => {
  assert.equal(SGD(1234.5), 'S$1,235')
  assert.equal(SGD(0), 'S$0')
  assert.equal(SGD(undefined), 'S$0')
  assert.equal(SGD(NaN), 'S$0')
  assert.equal(SGD(-2500), 'S$-2,500')
})

test('SGDCompact', () => {
  assert.equal(SGDCompact(850_000), 'S$850k')
  assert.equal(SGDCompact(1_250_000), 'S$1.3m')
  assert.equal(SGDCompact(0), null)
  assert.equal(SGDCompact(-5), null)
})
