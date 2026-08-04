// src/lib/drive/carCatalog.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dbRowToCar, carToDbRow } from './carCatalog.js'

const DB_ROW = {
  id: 'sealion7', name: 'BYD Sealion 7', short: 'Sealion 7', type: 'Electric SUV',
  price: 265388, omv: 37500, rate_tier: 'green', top5: true, rank: 1,
  description: "Singapore's #1 best-selling car.", ves: 22500, ves_band: 'A',
  subtotal_ex_coe: null,
}

const APP_CAR = {
  id: 'sealion7', name: 'BYD Sealion 7', short: 'Sealion 7', type: 'Electric SUV',
  price: 265388, omv: 37500, rateTier: 'green', top5: true, rank: 1,
  desc: "Singapore's #1 best-selling car.", ves: 22500, vesBand: 'A',
}

test('dbRowToCar: maps snake_case DB columns to the app\'s camelCase car shape', () => {
  const car = dbRowToCar(DB_ROW)
  assert.equal(car.rateTier, 'green')
  assert.equal(car.desc, "Singapore's #1 best-selling car.")
  assert.equal(car.vesBand, 'A')
  assert.equal(car.subtotalExCOE, undefined) // null in DB -> omitted, not null
})

test('dbRowToCar: does NOT include coe/loanCap — those are derived from omv, not stored', () => {
  const car = dbRowToCar(DB_ROW)
  assert.equal('coe' in car, false)
  assert.equal('loanCap' in car, false)
})

test('carToDbRow: round-trips back to the DB shape', () => {
  const row = carToDbRow(APP_CAR)
  assert.equal(row.rate_tier, 'green')
  assert.equal(row.description, "Singapore's #1 best-selling car.")
  assert.equal(row.ves_band, 'A')
  assert.equal(row.subtotal_ex_coe, null) // undefined in app shape -> null in DB, not omitted
})

test('carToDbRow: a Tesla with subtotalExCOE round-trips that field', () => {
  const tesla = { ...APP_CAR, id: 'model3', rateTier: 'tesla', subtotalExCOE: 150000 }
  const row = carToDbRow(tesla)
  assert.equal(row.subtotal_ex_coe, 150000)
  assert.equal(dbRowToCar(row).subtotalExCOE, 150000)
})

test('dbRowToCar -> carToDbRow round-trips without loss for a fully-populated row', () => {
  const roundTripped = carToDbRow(dbRowToCar(DB_ROW))
  assert.deepEqual(roundTripped, DB_ROW)
})
