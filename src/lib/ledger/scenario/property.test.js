// src/lib/ledger/scenario/property.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { projectProperty, propertyValueAt, propertyAtYear } from './property.js'
import { calcOutstandingBalance } from '../../house/calc.js'

test('value at year 10 with 3% appreciation matches the closed form', () => {
  const rows = projectProperty({ value: 1_000_000 }, 3, 10)
  assert.ok(Math.abs(rows[10].value - 1_000_000 * Math.pow(1.03, 10)) < 1)
  assert.equal(rows.length, 11) // years 0..10 inclusive
})

test('a fully-paid property (no mortgage) has zero outstanding every year and equity == value', () => {
  const rows = projectProperty({ value: 800_000 }, 2, 5)
  for (const row of rows) {
    assert.equal(row.outstanding, 0)
    assert.equal(row.equity, row.value)
  }
})

test('outstanding at the loan tenure end is zero and equity is the appreciated value', () => {
  const property = { value: 1_200_000, mortgagePrincipal: 600_000, mortgageRatePct: 3, mortgageTenureYears: 10 }
  const rows = projectProperty(property, 3, 10)
  assert.ok(rows[10].outstanding < 1, `outstanding at tenure end should be ~0, got ${rows[10].outstanding}`)
  assert.ok(Math.abs(rows[10].equity - rows[10].value) < 1)
  // Mid-loan the balance is still substantial.
  assert.ok(rows[5].outstanding > 0 && rows[5].outstanding < 600_000)
})

test('outstanding matches calcOutstandingBalance at the same month index', () => {
  const property = { value: 1_000_000, mortgagePrincipal: 500_000, mortgageRatePct: 2.6, mortgageTenureYears: 25 }
  const rows = projectProperty(property, 2, 8)
  assert.equal(rows[8].outstanding, calcOutstandingBalance(500_000, 2.6, 25, 96))
})

test('zero years returns just the starting row unchanged', () => {
  const rows = projectProperty({ value: 900_000, mortgagePrincipal: 400_000, mortgageRatePct: 3, mortgageTenureYears: 20 }, 4, 0)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].value, 900_000)
  assert.equal(rows[0].outstanding, calcOutstandingBalance(400_000, 3, 20, 0))
})

test('propertyValueAt floors a negative year at 0', () => {
  assert.equal(propertyValueAt(500_000, 3, -5), 500_000)
})

test('propertyAtYear returns the single row at the requested year', () => {
  const property = { value: 1_000_000, mortgagePrincipal: 500_000, mortgageRatePct: 3, mortgageTenureYears: 25 }
  const row = propertyAtYear(property, 3, 12)
  assert.equal(row.year, 12)
  assert.ok(Math.abs(row.value - 1_000_000 * Math.pow(1.03, 12)) < 1)
})
