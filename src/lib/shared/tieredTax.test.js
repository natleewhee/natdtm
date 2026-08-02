import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tieredTax } from './tieredTax.js'

function approx(a, b, eps = 0.5) {
  assert.ok(Math.abs(a - b) <= eps, `expected ${a} ≈ ${b}`)
}

const TIERS = [
  { upTo: 100, rate: 0.1 },
  { upTo: 200, rate: 0.2 },
  { upTo: Infinity, rate: 0.3 },
]

test('tieredTax: taxes only within the first tier when amount is below it', () => {
  approx(tieredTax(50, TIERS), 5)
})

test('tieredTax: taxes each slice at its own tier rate', () => {
  // 100 @ 10% + 50 @ 20% = 10 + 10 = 20
  approx(tieredTax(150, TIERS), 20)
})

test('tieredTax: taxes the excess above the last finite tier at the top rate', () => {
  // 100 @ 10% + 100 @ 20% + 50 @ 30% = 10 + 20 + 15 = 45
  approx(tieredTax(250, TIERS), 45)
})

test('tieredTax: zero or negative amount owes zero', () => {
  assert.equal(tieredTax(0, TIERS), 0)
  assert.equal(tieredTax(-100, TIERS), 0)
})

test('tieredTax: non-finite amount owes zero rather than throwing', () => {
  assert.equal(tieredTax(NaN, TIERS), 0)
  assert.equal(tieredTax(undefined, TIERS), 0)
})
