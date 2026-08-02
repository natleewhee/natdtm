// src/lib/ledger/theme.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseMoney } from './theme.js'

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

test('parseMoney: empty string is 0', () => {
  assert.equal(parseMoney(''), 0)
})

test('parseMoney: null/undefined is 0', () => {
  assert.equal(parseMoney(null), 0)
  assert.equal(parseMoney(undefined), 0)
})

test('parseMoney: garbage-only input is 0, not NaN', () => {
  assert.equal(parseMoney('abc'), 0)
  assert.equal(parseMoney('$'), 0)
})
