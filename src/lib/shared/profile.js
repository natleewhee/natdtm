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

const STORAGE_KEY = 'ndtm_my_numbers_v1' // key name predates the v2 schema bump; left as-is, the `version` field inside is what's versioned

const EMPTY = {
  version: 4,
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
}

function migrateV1(parsed) {
  return {
    version: 4,
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
    retire: null, insure: null, tax: null, etf: null,
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

function safeParse(raw) {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (parsed.version === 4) return parsed
    if (parsed.version === 3) return migrateV3(parsed)
    if (parsed.version === 2) return migrateV3(migrateV2(parsed))
    if (parsed.version === 1) return migrateV1(parsed)
    return null
  } catch {
    return null
  }
}

export function loadMyNumbers() {
  if (typeof window === 'undefined') return { ...EMPTY }
  const parsed = safeParse(window.localStorage.getItem(STORAGE_KEY))
  return parsed ? { ...EMPTY, ...parsed } : { ...EMPTY }
}

function save(data) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage unavailable (private browsing, quota) — fail silently
  }
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
