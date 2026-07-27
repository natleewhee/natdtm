// src/lib/shared/profile.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'

// Minimal in-memory localStorage shim so this module can be tested under
// plain node (no jsdom/browser) — mirrors the shape the module expects.
function makeStorage() {
  const store = new Map()
  return {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
  }
}

global.window = { localStorage: makeStorage() }

const {
  loadMyNumbers, saveHouseNumbers, saveDriveNumbers, clearHouseNumbers, clearDriveNumbers,
} = await import('./profile.js')

test('loadMyNumbers returns empty defaults when nothing stored', () => {
  const data = loadMyNumbers()
  assert.equal(data.version, 1)
  assert.equal(data.house, null)
  assert.equal(data.drive, null)
})

test('loadMyNumbers safely ignores malformed JSON', () => {
  window.localStorage.setItem('ndtm_my_numbers_v1', 'not json{{{')
  const data = loadMyNumbers()
  assert.equal(data.house, null)
  assert.equal(data.drive, null)
})

test('loadMyNumbers ignores a mismatched version', () => {
  window.localStorage.setItem('ndtm_my_numbers_v1', JSON.stringify({ version: 2, house: { salePrice: 1 } }))
  const data = loadMyNumbers()
  assert.equal(data.house, null)
})

test('saveHouseNumbers round-trips and coerces numbers', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  saveHouseNumbers({ cashProceeds: '500000', totalCPFRefund: 120000, salePrice: 1200000, saleDate: '2026-06-01' })
  const data = loadMyNumbers()
  assert.equal(data.house.cashProceeds, 500000)
  assert.equal(data.house.totalCPFRefund, 120000)
  assert.equal(data.house.salePrice, 1200000)
  assert.equal(data.house.saleDate, '2026-06-01')
  assert.equal(typeof data.house.savedAt, 'number')
})

test('saveDriveNumbers round-trips and does not clobber house numbers', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  saveHouseNumbers({ cashProceeds: 100, totalCPFRefund: 50, salePrice: 900000, saleDate: '2026-01-01' })
  saveDriveNumbers({ monthlyCost: 1500, carLabel: 'Toyota Corolla', salary: 6000 })
  const data = loadMyNumbers()
  assert.equal(data.drive.monthlyCost, 1500)
  assert.equal(data.drive.carLabel, 'Toyota Corolla')
  assert.equal(data.drive.salary, 6000)
  assert.equal(data.house.cashProceeds, 100)
})

test('clearHouseNumbers and clearDriveNumbers null out only their own slot', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  saveHouseNumbers({ cashProceeds: 1, totalCPFRefund: 1, salePrice: 1, saleDate: '2026-01-01' })
  saveDriveNumbers({ monthlyCost: 1, carLabel: 'x', salary: 1 })
  clearHouseNumbers()
  let data = loadMyNumbers()
  assert.equal(data.house, null)
  assert.notEqual(data.drive, null)
  clearDriveNumbers()
  data = loadMyNumbers()
  assert.equal(data.drive, null)
})
