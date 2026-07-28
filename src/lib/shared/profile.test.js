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
  loadMyNumbers, saveHouseNumbers, saveDriveNumbers, saveRetireNumbers,
  saveInsureNumbers, saveTaxNumbers, saveEtfNumbers,
  clearHouseNumbers, clearDriveNumbers, clearRetireNumbers, clearEtfNumbers,
} = await import('./profile.js')

test('loadMyNumbers returns empty v4 defaults when nothing stored', () => {
  const data = loadMyNumbers()
  assert.equal(data.version, 4)
  assert.equal(data.house, null)
  assert.equal(data.drive, null)
  assert.equal(data.retire, null)
  assert.equal(data.insure, null)
  assert.equal(data.tax, null)
  assert.equal(data.etf, null)
})

test('loadMyNumbers safely ignores malformed JSON', () => {
  window.localStorage.setItem('ndtm_my_numbers_v1', 'not json{{{')
  const data = loadMyNumbers()
  assert.equal(data.house, null)
})

test('loadMyNumbers migrates a v1 record into the v3 shape', () => {
  window.localStorage.setItem('ndtm_my_numbers_v1', JSON.stringify({
    version: 1,
    house: { cashProceeds: 500000, totalCPFRefund: 120000, salePrice: 1200000, saleDate: '2026-06-01', savedAt: 123 },
    drive: { monthlyCost: 1500, carLabel: 'Toyota Corolla', salary: 6000, savedAt: 456 },
  }))
  const data = loadMyNumbers()
  assert.equal(data.version, 4)
  assert.equal(data.house.cashProceeds, 500000)
  assert.equal(data.house.propertyValue, 1200000)
  assert.equal(data.house.outstandingBalance, null)
  assert.equal(data.drive.monthlyInstalment, 1500)
  assert.equal(data.drive.carLabel, 'Toyota Corolla')
  assert.equal(data.retire, null)
  assert.equal(data.etf, null)
})

test('loadMyNumbers migrates a v2 record, preserving existing slots', () => {
  window.localStorage.setItem('ndtm_my_numbers_v1', JSON.stringify({
    version: 2,
    house: { outstandingBalance: 400000, monthlyInstalment: 2500, source: 'auto', savedAt: 1 },
    drive: null,
    retire: { salary: 7000, oaBalance: 80000, source: 'auto', savedAt: 2 },
  }))
  const data = loadMyNumbers()
  assert.equal(data.version, 4)
  assert.equal(data.house.outstandingBalance, 400000)
  assert.equal(data.retire.salary, 7000)
  assert.equal(data.insure, null)
  assert.equal(data.tax, null)
  assert.equal(data.etf, null)
})

test('loadMyNumbers migrates a v3 record, preserving existing slots and adding etf', () => {
  window.localStorage.setItem('ndtm_my_numbers_v1', JSON.stringify({
    version: 3,
    house: null, drive: null, retire: null,
    insure: { monthlyPremium: 300, score: 60, source: 'auto', savedAt: 1 },
    tax: { monthlyTakeHome: 5000, source: 'auto', savedAt: 2 },
  }))
  const data = loadMyNumbers()
  assert.equal(data.version, 4)
  assert.equal(data.insure.monthlyPremium, 300)
  assert.equal(data.tax.monthlyTakeHome, 5000)
  assert.equal(data.etf, null)
})

test('saveInsureNumbers and saveTaxNumbers round-trip independently', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  saveInsureNumbers({ monthlyPremium: 450, score: 72 })
  saveTaxNumbers({ monthlyTakeHome: 6200, annualTax: 4300, marginalRate: 0.115, age: 40 })
  const data = loadMyNumbers()
  assert.equal(data.insure.monthlyPremium, 450)
  assert.equal(data.insure.score, 72)
  assert.equal(data.tax.monthlyTakeHome, 6200)
  assert.equal(data.tax.marginalRate, 0.115)
  assert.equal(data.tax.age, 40)
})

test('saveEtfNumbers round-trips independently', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  saveEtfNumbers({ portfolioValue: 25000, monthlyContribution: 800 })
  const data = loadMyNumbers()
  assert.equal(data.etf.portfolioValue, 25000)
  assert.equal(data.etf.monthlyContribution, 800)
  assert.equal(data.etf.source, 'auto')
  assert.equal(typeof data.etf.savedAt, 'number')
})

test('loadMyNumbers ignores an unknown version', () => {
  window.localStorage.setItem('ndtm_my_numbers_v1', JSON.stringify({ version: 99, house: { salePrice: 1 } }))
  const data = loadMyNumbers()
  assert.equal(data.house, null)
})

test('saveHouseNumbers round-trips full v2 fields', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  saveHouseNumbers({
    cashProceeds: '500000', totalCPFRefund: 120000, salePrice: 1200000, saleDate: '2026-06-01',
    outstandingBalance: 400000, rate: 2.6, tenureRemaining: 18, monthlyInstalment: 2500, propertyValue: 1250000, cpfServicing: 1800,
  })
  const data = loadMyNumbers()
  assert.equal(data.house.cashProceeds, 500000)
  assert.equal(data.house.outstandingBalance, 400000)
  assert.equal(data.house.rate, 2.6)
  assert.equal(data.house.tenureRemaining, 18)
  assert.equal(data.house.monthlyInstalment, 2500)
  assert.equal(data.house.propertyValue, 1250000)
  assert.equal(data.house.cpfServicing, 1800)
  assert.equal(data.house.source, 'auto')
  assert.equal(typeof data.house.savedAt, 'number')
})

test('saveDriveNumbers round-trips and does not clobber house numbers', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  saveHouseNumbers({ cashProceeds: 100, totalCPFRefund: 50, salePrice: 900000, saleDate: '2026-01-01' })
  saveDriveNumbers({ monthlyInstalment: 1500, carLabel: 'Toyota Corolla', salary: 6000, loanOutstanding: 60000, rate: 2.8, tenureRemaining: 7, carValue: 90000 })
  const data = loadMyNumbers()
  assert.equal(data.drive.monthlyInstalment, 1500)
  assert.equal(data.drive.loanOutstanding, 60000)
  assert.equal(data.drive.carValue, 90000)
  assert.equal(data.house.cashProceeds, 100)
})

test('saveRetireNumbers round-trips', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  saveRetireNumbers({ salary: 7000, oaBalance: 80000, saBalance: 60000, maBalance: 40000, investmentBalance: 150000, monthlyContribution: 1000 })
  const data = loadMyNumbers()
  assert.equal(data.retire.salary, 7000)
  assert.equal(data.retire.oaBalance, 80000)
  assert.equal(data.retire.investmentBalance, 150000)
  assert.equal(data.retire.source, 'auto')
})

test('clear functions null out only their own slot', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  saveHouseNumbers({ cashProceeds: 1, totalCPFRefund: 1, salePrice: 1, saleDate: '2026-01-01' })
  saveDriveNumbers({ monthlyInstalment: 1, carLabel: 'x', salary: 1 })
  saveRetireNumbers({ salary: 1, oaBalance: 1, saBalance: 1, maBalance: 1, investmentBalance: 1, monthlyContribution: 1 })
  clearHouseNumbers()
  let data = loadMyNumbers()
  assert.equal(data.house, null)
  assert.notEqual(data.drive, null)
  assert.notEqual(data.retire, null)
  clearDriveNumbers()
  data = loadMyNumbers()
  assert.equal(data.drive, null)
  assert.notEqual(data.retire, null)
  clearRetireNumbers()
  data = loadMyNumbers()
  assert.equal(data.retire, null)
})
