// src/lib/drive/maintenance.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAINTENANCE_BY_BRAND, getAnnualMaintenance, getTotalMaintenance } from './maintenance.js'

test('getAnnualMaintenance year 1 is just the brand\'s base annual service, no age-repair loading', () => {
  assert.equal(getAnnualMaintenance('toyota', 1), MAINTENANCE_BY_BRAND.toyota.annualService)
})

test('getAnnualMaintenance adds age-related repair cost once a car crosses into an older bracket', () => {
  const year1 = getAnnualMaintenance('bmw', 1)
  const year4 = getAnnualMaintenance('bmw', 4)
  assert.ok(year4 > year1, 'a 4-year-old BMW should cost more to maintain than a 1-year-old one')
})

test('getAnnualMaintenance falls back to the toyota tier for an unknown brand key', () => {
  assert.equal(getAnnualMaintenance('not-a-real-brand', 1), getAnnualMaintenance('toyota', 1))
})

test('getAnnualMaintenance clamps ages beyond the repair table\'s range instead of throwing/going undefined', () => {
  const capped = getAnnualMaintenance('mercedes', 50)
  assert.ok(Number.isFinite(capped) && capped > 0)
})

test('getTotalMaintenance sums getAnnualMaintenance across the requested span', () => {
  const total = getTotalMaintenance('toyota', 1, 3)
  const expected = getAnnualMaintenance('toyota', 1) + getAnnualMaintenance('toyota', 2) + getAnnualMaintenance('toyota', 3)
  assert.equal(total, expected)
})

test('getTotalMaintenance over 0 years is 0', () => {
  assert.equal(getTotalMaintenance('toyota', 1, 0), 0)
})
