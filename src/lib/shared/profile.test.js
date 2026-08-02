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
  saveInsureNumbers, saveTaxNumbers, saveEtfNumbers, saveFlowNumbers, saveFlowInputs, loadFlowInputs,
  saveToolInputs, loadToolInputs,
  clearHouseNumbers, clearDriveNumbers, clearRetireNumbers, clearEtfNumbers, clearFlowNumbers,
  listProfiles, createProfile, renameProfile, deleteProfile, setActiveProfile, getActiveProfileId,
  MAX_PROFILES,
} = await import('./profile.js')

test('loadMyNumbers returns empty v6 defaults when nothing stored', () => {
  const data = loadMyNumbers()
  assert.equal(data.version, 6)
  assert.equal(data.house, null)
  assert.equal(data.drive, null)
  assert.equal(data.retire, null)
  assert.equal(data.insure, null)
  assert.equal(data.tax, null)
  assert.equal(data.etf, null)
  assert.equal(data.flow, null)
  assert.equal(data.ledger, null)
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
  assert.equal(data.version, 6)
  assert.equal(data.house.cashProceeds, 500000)
  assert.equal(data.house.propertyValue, 1200000)
  assert.equal(data.house.outstandingBalance, null)
  assert.equal(data.drive.monthlyInstalment, 1500)
  assert.equal(data.drive.carLabel, 'Toyota Corolla')
  assert.equal(data.retire, null)
  assert.equal(data.etf, null)
  assert.equal(data.flow, null)
})

test('loadMyNumbers migrates a v2 record, preserving existing slots', () => {
  window.localStorage.setItem('ndtm_my_numbers_v1', JSON.stringify({
    version: 2,
    house: { outstandingBalance: 400000, monthlyInstalment: 2500, source: 'auto', savedAt: 1 },
    drive: null,
    retire: { salary: 7000, oaBalance: 80000, source: 'auto', savedAt: 2 },
  }))
  const data = loadMyNumbers()
  assert.equal(data.version, 6)
  assert.equal(data.house.outstandingBalance, 400000)
  assert.equal(data.retire.salary, 7000)
  assert.equal(data.insure, null)
  assert.equal(data.tax, null)
  assert.equal(data.etf, null)
  assert.equal(data.flow, null)
})

test('loadMyNumbers migrates a v3 record, preserving existing slots and adding etf', () => {
  window.localStorage.setItem('ndtm_my_numbers_v1', JSON.stringify({
    version: 3,
    house: null, drive: null, retire: null,
    insure: { monthlyPremium: 300, score: 60, source: 'auto', savedAt: 1 },
    tax: { monthlyTakeHome: 5000, source: 'auto', savedAt: 2 },
  }))
  const data = loadMyNumbers()
  assert.equal(data.version, 6)
  assert.equal(data.insure.monthlyPremium, 300)
  assert.equal(data.tax.monthlyTakeHome, 5000)
  assert.equal(data.etf, null)
  assert.equal(data.flow, null)
})

test('loadMyNumbers migrates a v4 record, preserving existing slots and adding flow', () => {
  window.localStorage.setItem('ndtm_my_numbers_v1', JSON.stringify({
    version: 4,
    house: null, drive: null, retire: null, insure: null, tax: null,
    etf: { portfolioValue: 25000, monthlyContribution: 800, source: 'auto', savedAt: 1 },
  }))
  const data = loadMyNumbers()
  assert.equal(data.version, 6)
  assert.equal(data.etf.portfolioValue, 25000)
  assert.equal(data.flow, null)
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

test('saveFlowNumbers round-trips independently', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  saveFlowNumbers({ livingExpenses: 3200, monthlySurplus: 1739, trueSavingsRate: 0.38, cashSavingsRate: 0.29 })
  const data = loadMyNumbers()
  assert.equal(data.flow.livingExpenses, 3200)
  assert.equal(data.flow.monthlySurplus, 1739)
  assert.equal(data.flow.trueSavingsRate, 0.38)
  assert.equal(data.flow.cashSavingsRate, 0.29)
  assert.equal(data.flow.source, 'auto')
  assert.equal(typeof data.flow.savedAt, 'number')
})

test('saveFlowInputs and saveFlowNumbers do not clobber each other', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  // Metrics saved first (as the auto-recompute effect does continuously)...
  saveFlowNumbers({ livingExpenses: 3200, monthlySurplus: 1739 })
  // ...then an explicit input save happens.
  saveFlowInputs({ age: '35', salary: '8000' })
  let data = loadMyNumbers()
  assert.equal(data.flow.livingExpenses, 3200, 'metrics survive an inputs save')
  assert.deepEqual(data.flow.inputs, { age: '35', salary: '8000' })

  // Now the auto-recompute effect fires again (as it does on every
  // render while the page is open) — the saved inputs must survive it.
  saveFlowNumbers({ livingExpenses: 4000, monthlySurplus: 1500 })
  data = loadMyNumbers()
  assert.equal(data.flow.livingExpenses, 4000, 'metrics still update normally')
  assert.deepEqual(data.flow.inputs, { age: '35', salary: '8000' }, 'inputs survive a later metrics save')
})

test('loadFlowInputs returns null when nothing has been saved', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  assert.equal(loadFlowInputs(), null)
})

test('saveFlowInputs / loadFlowInputs round-trips an arbitrary inputs object', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  const inputs = { age: '40', lumpyItems: [{ id: 'x', label: 'Road tax', amount: '500', type: 'expense' }] }
  saveFlowInputs(inputs)
  assert.deepEqual(loadFlowInputs(), inputs)
})

test('saveFlowInputs is scoped per profile, same as everything else', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  saveFlowInputs({ age: '35' })
  const other = createProfile('Other')
  assert.equal(loadFlowInputs(), null, 'a fresh profile has no saved inputs')
  saveFlowInputs({ age: '50' })
  setActiveProfile(other) // no-op, already active, but exercise the API
  assert.deepEqual(loadFlowInputs(), { age: '50' })
})

test('loadToolInputs returns null when nothing has been saved', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  assert.equal(loadToolInputs('house'), null)
})

test('saveToolInputs / loadToolInputs round-trips for every supported tool', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  for (const tool of ['house', 'drive', 'retire', 'insure', 'tax', 'etf', 'ledger']) {
    const inputs = { tool, purchasePrice: '900000' }
    saveToolInputs(tool, inputs)
    assert.deepEqual(loadToolInputs(tool), inputs, `${tool} round-trips`)
  }
})

test('saveToolInputs for an unsupported tool name is a no-op', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  saveToolInputs('notarealtool', { x: 1 })
  assert.equal(loadToolInputs('notarealtool'), null)
})

test('saveToolInputs(house) does not clobber saveHouseNumbers metrics, and vice versa', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  saveHouseNumbers({ cashProceeds: 500000, totalCPFRefund: 120000, salePrice: 1200000, saleDate: '2026-01-01' })
  saveToolInputs('house', { purchasePrice: '900000' })
  let data = loadMyNumbers()
  assert.equal(data.house.cashProceeds, 500000, 'metrics survive an inputs save')
  assert.deepEqual(data.house.inputs, { purchasePrice: '900000' })

  saveHouseNumbers({ cashProceeds: 600000, totalCPFRefund: 130000, salePrice: 1300000, saleDate: '2026-02-01' })
  data = loadMyNumbers()
  assert.equal(data.house.cashProceeds, 600000, 'metrics still update normally')
  assert.deepEqual(data.house.inputs, { purchasePrice: '900000' }, 'inputs survive a later metrics save')
})

test('saveToolInputs(etf) does not clobber saveEtfNumbers metrics, and vice versa', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  saveEtfNumbers({ portfolioValue: 25000, monthlyContribution: 800 })
  saveToolInputs('etf', { risk: 'Growth', simplicity: '4-5 ETFs', tilts: ['Japan'] })
  let data = loadMyNumbers()
  assert.equal(data.etf.portfolioValue, 25000, 'metrics survive an inputs save')
  assert.deepEqual(data.etf.inputs, { risk: 'Growth', simplicity: '4-5 ETFs', tilts: ['Japan'] })

  saveEtfNumbers({ portfolioValue: 30000, monthlyContribution: 900 })
  data = loadMyNumbers()
  assert.equal(data.etf.portfolioValue, 30000, 'metrics still update normally')
  assert.deepEqual(data.etf.inputs, { risk: 'Growth', simplicity: '4-5 ETFs', tilts: ['Japan'] }, 'inputs survive a later metrics save')
})

test('saveToolInputs is scoped per profile, same as saveFlowInputs', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  saveToolInputs('drive', { carLabel: 'Toyota Corolla' })
  const other = createProfile('Other')
  assert.equal(loadToolInputs('drive'), null, 'a fresh profile has no saved inputs')
  saveToolInputs('drive', { carLabel: 'Honda Civic' })
  setActiveProfile(other)
  assert.deepEqual(loadToolInputs('drive'), { carLabel: 'Honda Civic' })
})

test('clearFlowNumbers nulls only the flow slot', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  saveFlowNumbers({ livingExpenses: 3200 })
  saveEtfNumbers({ portfolioValue: 25000, monthlyContribution: 800 })
  clearFlowNumbers()
  const data = loadMyNumbers()
  assert.equal(data.flow, null)
  assert.notEqual(data.etf, null)
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

// ─── Named profiles ─────────────────────────────────────────────────────

test('a fresh browser starts with a single default profile that is active', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  const profiles = listProfiles()
  assert.equal(profiles.length, 1)
  assert.equal(profiles[0].name, 'My Numbers')
  assert.equal(profiles[0].isActive, true)
  assert.equal(getActiveProfileId(), profiles[0].id)
})

test('an old flat (pre-profiles) payload migrates into a single "My Numbers" profile, data intact', () => {
  window.localStorage.setItem('ndtm_my_numbers_v1', JSON.stringify({
    version: 3,
    house: { outstandingBalance: 400000, source: 'auto', savedAt: 1 },
    drive: null, retire: null,
    insure: { monthlyPremium: 300, source: 'auto', savedAt: 2 },
    tax: null,
  }))
  const profiles = listProfiles()
  assert.equal(profiles.length, 1)
  assert.equal(profiles[0].name, 'My Numbers')
  const data = loadMyNumbers()
  assert.equal(data.house.outstandingBalance, 400000)
  assert.equal(data.insure.monthlyPremium, 300)
  assert.equal(data.version, 6)
})

test('createProfile adds a new empty profile and makes it active', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  saveHouseNumbers({ cashProceeds: 1, totalCPFRefund: 1, salePrice: 1, saleDate: '2026-01-01' })
  const newId = createProfile('Joint with Alex')
  assert.notEqual(newId, null)
  assert.equal(getActiveProfileId(), newId)
  // the new profile starts empty — it does NOT inherit the old profile's house data
  const data = loadMyNumbers()
  assert.equal(data.house, null)
  const profiles = listProfiles()
  assert.equal(profiles.length, 2)
  assert.equal(profiles.find(p => p.id === newId).name, 'Joint with Alex')
})

test('each profile holds independent data — switching does not leak numbers across profiles', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  const profileA = getActiveProfileId()
  saveHouseNumbers({ cashProceeds: 100, totalCPFRefund: 1, salePrice: 1, saleDate: '2026-01-01' })

  const profileB = createProfile('Profile B')
  saveHouseNumbers({ cashProceeds: 200, totalCPFRefund: 1, salePrice: 1, saleDate: '2026-01-01' })
  assert.equal(loadMyNumbers().house.cashProceeds, 200)

  setActiveProfile(profileA)
  assert.equal(loadMyNumbers().house.cashProceeds, 100)

  setActiveProfile(profileB)
  assert.equal(loadMyNumbers().house.cashProceeds, 200)
})

test('createProfile refuses beyond MAX_PROFILES', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  assert.equal(MAX_PROFILES, 3)
  createProfile('Second')
  const third = createProfile('Third')
  assert.notEqual(third, null)
  const fourth = createProfile('Fourth')
  assert.equal(fourth, null)
  assert.equal(listProfiles().length, 3)
})

test('a store with more than MAX_PROFILES (e.g. hand-edited, or a lowered cap) gets truncated AND the truncation is persisted back to localStorage', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  const makeRawProfile = (id, name) => ({ id, name, createdAt: 1, updatedAt: 1, data: { version: 6, house: null, drive: null, retire: null, insure: null, tax: null, etf: null, flow: null, ledger: null } })
  const rawStore = {
    schemaVersion: 1,
    activeProfileId: 'p1',
    profiles: [makeRawProfile('p1', 'One'), makeRawProfile('p2', 'Two'), makeRawProfile('p3', 'Three'), makeRawProfile('p4', 'Four')],
  }
  window.localStorage.setItem('ndtm_my_numbers_v1', JSON.stringify(rawStore))

  // Triggers loadStore() internally, which should truncate to MAX_PROFILES...
  const profiles = listProfiles()
  assert.equal(profiles.length, MAX_PROFILES, 'in-memory result is truncated')

  // ...AND persist that truncation back to localStorage, not just return
  // a truncated view while leaving the 4th profile sitting in storage.
  const persisted = JSON.parse(window.localStorage.getItem('ndtm_my_numbers_v1'))
  assert.equal(persisted.profiles.length, MAX_PROFILES, 'truncation is written back to localStorage, not just held in memory')
  assert.deepEqual(persisted.profiles.map(p => p.id), ['p1', 'p2', 'p3'])
})

test('a stale activeProfileId pointing at a truncated-away profile falls back to the first surviving profile, and that fallback is persisted', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  const makeRawProfile = (id, name) => ({ id, name, createdAt: 1, updatedAt: 1, data: { version: 6, house: null, drive: null, retire: null, insure: null, tax: null, etf: null, flow: null, ledger: null } })
  const rawStore = {
    schemaVersion: 1,
    activeProfileId: 'p4', // points at the profile that will be truncated away
    profiles: [makeRawProfile('p1', 'One'), makeRawProfile('p2', 'Two'), makeRawProfile('p3', 'Three'), makeRawProfile('p4', 'Four')],
  }
  window.localStorage.setItem('ndtm_my_numbers_v1', JSON.stringify(rawStore))

  assert.equal(getActiveProfileId(), 'p1', 'falls back to the first surviving profile')
  const persisted = JSON.parse(window.localStorage.getItem('ndtm_my_numbers_v1'))
  assert.equal(persisted.activeProfileId, 'p1', 'the fallback is persisted, not just returned in memory')
})

test('renameProfile updates the name without touching data or other profiles', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  const id = getActiveProfileId()
  saveHouseNumbers({ cashProceeds: 500, totalCPFRefund: 1, salePrice: 1, saleDate: '2026-01-01' })
  renameProfile(id, 'Retirement plan')
  assert.equal(listProfiles().find(p => p.id === id).name, 'Retirement plan')
  assert.equal(loadMyNumbers().house.cashProceeds, 500)
})

test('renameProfile ignores a blank name', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  const id = getActiveProfileId()
  const originalName = listProfiles()[0].name
  renameProfile(id, '   ')
  assert.equal(listProfiles().find(p => p.id === id).name, originalName)
})

test('deleteProfile refuses to delete the last remaining profile', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  const id = getActiveProfileId()
  const deleted = deleteProfile(id)
  assert.equal(deleted, false)
  assert.equal(listProfiles().length, 1)
})

test('deleting the active profile switches to another one and its own data survives', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  const profileA = getActiveProfileId()
  saveHouseNumbers({ cashProceeds: 111, totalCPFRefund: 1, salePrice: 1, saleDate: '2026-01-01' })
  const profileB = createProfile('B')
  saveHouseNumbers({ cashProceeds: 222, totalCPFRefund: 1, salePrice: 1, saleDate: '2026-01-01' })

  const deleted = deleteProfile(profileB)
  assert.equal(deleted, true)
  assert.equal(getActiveProfileId(), profileA)
  assert.equal(loadMyNumbers().house.cashProceeds, 111)
  assert.equal(listProfiles().length, 1)
})

test('deleting a non-active profile leaves the active one untouched', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  const profileA = getActiveProfileId()
  saveHouseNumbers({ cashProceeds: 111, totalCPFRefund: 1, salePrice: 1, saleDate: '2026-01-01' })
  const profileB = createProfile('B')
  setActiveProfile(profileA)

  deleteProfile(profileB)
  assert.equal(getActiveProfileId(), profileA)
  assert.equal(loadMyNumbers().house.cashProceeds, 111)
})

test('setActiveProfile ignores an unknown id', () => {
  window.localStorage.removeItem('ndtm_my_numbers_v1')
  const original = getActiveProfileId()
  setActiveProfile('not-a-real-id')
  assert.equal(getActiveProfileId(), original)
})
