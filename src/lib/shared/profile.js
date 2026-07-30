// src/lib/shared/profile.js
// Shared "My Numbers" store — lets HouseMuch, DriveReady and RetireWell
// hand off their numbers to each other (RetireWell prefills) and to
// MyLedger (the holistic dashboard), so numbers aren't re-typed across
// tools. Client-side only (localStorage), never sent anywhere. Same
// pattern as src/lib/insure/scoreHistory.js, which already persists
// locally alongside a "No data stored" trust badge — the badges are
// about not sending data to a server, not about the browser never
// remembering anything.
//
// v2 adds the fuller per-module state (outstanding balances, rates,
// remaining tenure, current values) that MyLedger needs for net worth
// and TDSR — v1 only carried one-shot snapshot fields for the RetireWell
// prefill. migrateV1 upgrades old stored data into the v2 shape rather
// than discarding it.
//
// Named profiles (up to MAX_PROFILES) wrap this same per-module shape —
// each profile holds one full copy of it, so "Me" and "Joint with
// Alex" can hold entirely different numbers without either one
// overwriting the other. loadMyNumbers/saveXNumbers/clearXNumbers all
// operate on whichever profile is ACTIVE, so every existing call site
// across every tool keeps working unchanged — only the storage layer
// underneath it changed. A browser that has never seen profiles has its
// existing flat data migrated into a single profile named "My Numbers".

const STORAGE_KEY = 'ndtm_my_numbers_v1' // key name predates the v2 schema bump and the profiles wrapper; left as-is, the `version`/`schemaVersion` fields inside are what's versioned
export const MAX_PROFILES = 3
const DEFAULT_PROFILE_NAME = 'My Numbers'

const EMPTY = {
  version: 5,
  // { source: 'auto'|'manual', savedAt,
  //   outstandingBalance, rate, tenureRemaining, monthlyInstalment, propertyValue, cpfServicing,
  //   cashProceeds, totalCPFRefund, salePrice, saleDate }
  house: null,
  // { source, savedAt, loanOutstanding, rate, tenureRemaining, monthlyInstalment, carValue, carLabel, salary }
  drive: null,
  // { source, savedAt, salary, oaBalance, saBalance, maBalance, investmentBalance, monthlyContribution }
  retire: null,
  // { source, savedAt, monthlyPremium, score } — insurance premiums are a
  // real recurring obligation, so MyLedger counts them against income.
  insure: null,
  // { source, savedAt, monthlyTakeHome, annualTax, marginalRate, age } —
  // lets MyLedger use an exact after-tax take-home instead of a flat 80%.
  tax: null,
  // { source, savedAt, portfolioValue, monthlyContribution } — WhatETF's
  // DCA plan and (if the rebalance tool has been used) actual current
  // holdings, so MyLedger's net worth isn't missing money invested there.
  etf: null,
  // { source, savedAt, livingExpenses, monthlySurplus, trueSavingsRate,
  //   cashSavingsRate } — FlowState's measured monthly living spend.
  // MyLedger's own investment-capacity math used to assume this was
  // zero (take-home minus loans and insurance, nothing else); once
  // FlowState has run, MyLedger subtracts the real figure instead.
  flow: null,
}

function migrateV1(parsed) {
  return {
    version: 5,
    house: parsed.house ? {
      source: 'auto', savedAt: parsed.house.savedAt,
      cashProceeds: parsed.house.cashProceeds, totalCPFRefund: parsed.house.totalCPFRefund,
      salePrice: parsed.house.salePrice, saleDate: parsed.house.saleDate,
      outstandingBalance: null, rate: null, tenureRemaining: null, monthlyInstalment: null,
      propertyValue: parsed.house.salePrice ?? null, cpfServicing: null,
    } : null,
    drive: parsed.drive ? {
      source: 'auto', savedAt: parsed.drive.savedAt,
      monthlyInstalment: parsed.drive.monthlyCost, carLabel: parsed.drive.carLabel, salary: parsed.drive.salary,
      loanOutstanding: null, rate: null, tenureRemaining: null, carValue: null,
    } : null,
    retire: null, insure: null, tax: null, etf: null, flow: null,
  }
}

// v2 → v3 only adds the insure/tax slots; everything already stored
// stays exactly as it was.
function migrateV2(parsed) {
  return { ...parsed, version: 3, insure: parsed.insure ?? null, tax: parsed.tax ?? null }
}

// v3 → v4 only adds the etf slot.
function migrateV3(parsed) {
  return { ...parsed, version: 4, etf: parsed.etf ?? null }
}

// v4 → v5 only adds the flow slot.
function migrateV4(parsed) {
  return { ...parsed, version: 5, flow: parsed.flow ?? null }
}

// Migrates one profile's inner per-module data (the shape EMPTY
// describes) up to the current version — same logic that used to run
// directly against the raw localStorage payload, before profiles
// existed, so a single profile's `data` field is exactly what
// loadMyNumbers() used to return wholesale.
function migrateInnerData(parsed) {
  if (!parsed || typeof parsed !== 'object') return null
  if (parsed.version === 5) return parsed
  if (parsed.version === 4) return migrateV4(parsed)
  if (parsed.version === 3) return migrateV4(migrateV3(parsed))
  if (parsed.version === 2) return migrateV4(migrateV3(migrateV2(parsed)))
  if (parsed.version === 1) return migrateV1(parsed)
  return null
}

function newProfileId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function makeProfile(name, data) {
  const now = Date.now()
  return { id: newProfileId(), name: name || DEFAULT_PROFILE_NAME, createdAt: now, updatedAt: now, data: data || { ...EMPTY } }
}

function isWrapped(parsed) {
  return !!parsed && typeof parsed === 'object' && Array.isArray(parsed.profiles)
}

function saveStore(store) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // localStorage unavailable (private browsing, quota) — fail silently
  }
}

// Loads the raw wrapper { schemaVersion, activeProfileId, profiles }
// from localStorage, migrating a pre-profiles flat payload (or nothing
// at all) into a single default profile. Never returns an empty
// profiles array — there is always at least one profile to be active.
// Whenever it has to synthesize or migrate a store shape, it persists
// the result immediately (rather than only on the next write) — a
// read-only call like getActiveProfileId() must return the SAME id on
// every call, not mint a fresh, un-persisted profile each time.
function loadStore() {
  if (typeof window === 'undefined') return { schemaVersion: 1, activeProfileId: null, profiles: [makeProfile(DEFAULT_PROFILE_NAME)] }
  let parsed = null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    parsed = raw ? JSON.parse(raw) : null
  } catch {
    parsed = null
  }

  if (isWrapped(parsed)) {
    const profiles = parsed.profiles
      .map(p => ({
        id: p.id || newProfileId(),
        name: p.name || DEFAULT_PROFILE_NAME,
        createdAt: p.createdAt || Date.now(),
        updatedAt: p.updatedAt || Date.now(),
        data: { ...EMPTY, ...(migrateInnerData(p.data) || {}) },
      }))
      .slice(0, MAX_PROFILES)
    if (profiles.length === 0) profiles.push(makeProfile(DEFAULT_PROFILE_NAME))
    const activeProfileId = profiles.some(p => p.id === parsed.activeProfileId) ? parsed.activeProfileId : profiles[0].id
    const store = { schemaVersion: 1, activeProfileId, profiles }
    const changed = profiles.some((p, i) => p.id !== parsed.profiles[i]?.id) || activeProfileId !== parsed.activeProfileId
    if (changed) saveStore(store)
    return store
  }

  // Pre-profiles flat payload (or nothing/garbage) — migrate whatever's
  // there into a single starting profile rather than discarding it.
  const migrated = migrateInnerData(parsed)
  const profile = makeProfile(DEFAULT_PROFILE_NAME, migrated ? { ...EMPTY, ...migrated } : { ...EMPTY })
  const store = { schemaVersion: 1, activeProfileId: profile.id, profiles: [profile] }
  saveStore(store)
  return store
}

function getActiveProfile(store) {
  return store.profiles.find(p => p.id === store.activeProfileId) || store.profiles[0]
}

export function loadMyNumbers() {
  const store = loadStore()
  const active = getActiveProfile(store)
  return active ? { ...EMPTY, ...active.data } : { ...EMPTY }
}

// Writes into the ACTIVE profile's data — every saveXNumbers/
// clearXNumbers function below is unchanged from before profiles
// existed; only what this function does underneath them changed.
function save(data) {
  if (typeof window === 'undefined') return
  const store = loadStore()
  const idx = store.profiles.findIndex(p => p.id === store.activeProfileId)
  if (idx === -1) return
  store.profiles[idx] = { ...store.profiles[idx], data, updatedAt: Date.now() }
  saveStore(store)
}

// ─── Profile management ─────────────────────────────────────────────────

export function listProfiles() {
  const store = loadStore()
  return store.profiles.map(p => ({ id: p.id, name: p.name, updatedAt: p.updatedAt, isActive: p.id === store.activeProfileId }))
}

export function getActiveProfileId() {
  return loadStore().activeProfileId
}

// Creates a new empty profile (up to MAX_PROFILES) and makes it active.
// Returns the new profile's id, or null if already at the cap.
export function createProfile(name) {
  const store = loadStore()
  if (store.profiles.length >= MAX_PROFILES) return null
  const profile = makeProfile((name || '').trim() || `Profile ${store.profiles.length + 1}`)
  store.profiles.push(profile)
  store.activeProfileId = profile.id
  saveStore(store)
  return profile.id
}

export function renameProfile(id, name) {
  const trimmed = (name || '').trim()
  if (!trimmed) return
  const store = loadStore()
  const profile = store.profiles.find(p => p.id === id)
  if (!profile) return
  profile.name = trimmed
  saveStore(store)
}

// Deletes a profile — refuses to delete the last remaining one, since
// there must always be an active profile for every tool to read/write.
// If the deleted profile was active, switches to whichever is first.
// Returns false if the delete was refused.
export function deleteProfile(id) {
  const store = loadStore()
  if (store.profiles.length <= 1) return false
  store.profiles = store.profiles.filter(p => p.id !== id)
  if (store.activeProfileId === id) store.activeProfileId = store.profiles[0].id
  saveStore(store)
  return true
}

export function setActiveProfile(id) {
  const store = loadStore()
  if (!store.profiles.some(p => p.id === id)) return
  store.activeProfileId = id
  saveStore(store)
}

export function saveHouseNumbers({
  cashProceeds, totalCPFRefund, salePrice, saleDate,
  outstandingBalance, rate, tenureRemaining, monthlyInstalment, propertyValue, cpfServicing,
  propertyType, source = 'auto',
}) {
  const data = loadMyNumbers()
  data.house = {
    source,
    cashProceeds: Number(cashProceeds) || 0,
    totalCPFRefund: Number(totalCPFRefund) || 0,
    salePrice: Number(salePrice) || 0,
    saleDate: saleDate || null,
    outstandingBalance: outstandingBalance != null ? Number(outstandingBalance) || 0 : null,
    rate: rate != null ? Number(rate) || 0 : null,
    tenureRemaining: tenureRemaining != null ? Number(tenureRemaining) || 0 : null,
    monthlyInstalment: monthlyInstalment != null ? Number(monthlyInstalment) || 0 : null,
    propertyValue: propertyValue != null ? Number(propertyValue) || 0 : null,
    cpfServicing: cpfServicing != null ? Number(cpfServicing) || 0 : null,
    propertyType: propertyType || 'private',
    savedAt: Date.now(),
  }
  save(data)
}

export function saveDriveNumbers({
  monthlyInstalment, carLabel, salary,
  loanOutstanding, rate, tenureRemaining, carValue,
  source = 'auto',
}) {
  const data = loadMyNumbers()
  data.drive = {
    source,
    monthlyInstalment: Number(monthlyInstalment) || 0,
    carLabel: carLabel || null,
    salary: Number(salary) || 0,
    loanOutstanding: loanOutstanding != null ? Number(loanOutstanding) || 0 : null,
    rate: rate != null ? Number(rate) || 0 : null,
    tenureRemaining: tenureRemaining != null ? Number(tenureRemaining) || 0 : null,
    carValue: carValue != null ? Number(carValue) || 0 : null,
    savedAt: Date.now(),
  }
  save(data)
}

export function saveRetireNumbers({
  salary, oaBalance, saBalance, maBalance, investmentBalance, monthlyContribution,
  source = 'auto',
}) {
  const data = loadMyNumbers()
  data.retire = {
    source,
    salary: Number(salary) || 0,
    oaBalance: Number(oaBalance) || 0,
    saBalance: Number(saBalance) || 0,
    maBalance: Number(maBalance) || 0,
    investmentBalance: Number(investmentBalance) || 0,
    monthlyContribution: Number(monthlyContribution) || 0,
    savedAt: Date.now(),
  }
  save(data)
}

export function saveInsureNumbers({ monthlyPremium, score, source = 'auto' }) {
  const data = loadMyNumbers()
  data.insure = {
    source,
    monthlyPremium: Number(monthlyPremium) || 0,
    score: score != null ? Number(score) || 0 : null,
    savedAt: Date.now(),
  }
  save(data)
}

export function saveTaxNumbers({ monthlyTakeHome, annualTax, marginalRate, age, source = 'auto' }) {
  const data = loadMyNumbers()
  data.tax = {
    source,
    monthlyTakeHome: Number(monthlyTakeHome) || 0,
    annualTax: Number(annualTax) || 0,
    marginalRate: Number(marginalRate) || 0,
    age: Number(age) || 0,
    savedAt: Date.now(),
  }
  save(data)
}

// The portfolio page (DCA plan) and rebalance page (actual holdings) each
// know only their own half of this slot, so merge with whatever the other
// page last saved instead of clobbering it with a default 0.
export function saveEtfNumbers({ portfolioValue, monthlyContribution, source = 'auto' }) {
  const data = loadMyNumbers()
  const existing = data.etf || {}
  data.etf = {
    source,
    portfolioValue: portfolioValue != null ? Number(portfolioValue) || 0 : (existing.portfolioValue ?? 0),
    monthlyContribution: monthlyContribution != null ? Number(monthlyContribution) || 0 : (existing.monthlyContribution ?? 0),
    savedAt: Date.now(),
  }
  save(data)
}

export function clearEtfNumbers() {
  const data = loadMyNumbers()
  data.etf = null
  save(data)
}

// Auto-recomputed metrics (called continuously while FlowState is open,
// not just on an explicit save) — merges onto whatever's already in the
// flow slot so it never clobbers a saved `inputs` blob written by
// saveFlowInputs below.
export function saveFlowNumbers({ livingExpenses, monthlySurplus, trueSavingsRate, cashSavingsRate, source = 'auto' }) {
  const data = loadMyNumbers()
  const existing = data.flow || {}
  data.flow = {
    ...existing,
    source,
    livingExpenses: Number(livingExpenses) || 0,
    monthlySurplus: monthlySurplus != null ? Number(monthlySurplus) || 0 : null,
    trueSavingsRate: trueSavingsRate != null ? Number(trueSavingsRate) || 0 : null,
    cashSavingsRate: cashSavingsRate != null ? Number(cashSavingsRate) || 0 : null,
    savedAt: Date.now(),
  }
  save(data)
}

export function clearFlowNumbers() {
  const data = loadMyNumbers()
  data.flow = null
  save(data)
}

// FlowState's own raw form inputs (every field on the page — age,
// mortgage, insurance, living-expense mode, lumpy items, all of it) —
// distinct from the auto-recomputed metrics above, which other tools
// (MyLedger) actually consume. Nothing else reads this; it exists so
// "Save" on the FlowState page can restore exactly what you typed,
// scoped to whichever profile is active, the next time you open it.
// Written only on an explicit save, never automatically — merges onto
// the flow slot so it doesn't clobber the metrics saveFlowNumbers keeps
// current in the background.
export function saveFlowInputs(inputs) {
  const data = loadMyNumbers()
  const existing = data.flow || {}
  data.flow = {
    ...existing,
    inputs,
    inputsSavedAt: Date.now(),
  }
  save(data)
}

export function loadFlowInputs() {
  const data = loadMyNumbers()
  return data.flow?.inputs || null
}

export function clearInsureNumbers() {
  const data = loadMyNumbers()
  data.insure = null
  save(data)
}

export function clearTaxNumbers() {
  const data = loadMyNumbers()
  data.tax = null
  save(data)
}

export function clearHouseNumbers() {
  const data = loadMyNumbers()
  data.house = null
  save(data)
}

export function clearDriveNumbers() {
  const data = loadMyNumbers()
  data.drive = null
  save(data)
}

export function clearRetireNumbers() {
  const data = loadMyNumbers()
  data.retire = null
  save(data)
}
