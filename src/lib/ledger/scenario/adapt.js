// src/lib/ledger/scenario/adapt.js
// Maps the shared "My Numbers" store (src/lib/shared/profile.js) into the
// baseState / retireAssumptions shapes runScenario (index.js) expects.
// Kept separate from the page so the mapping is unit-testable and shared
// by /ledger and the /ledger/preview slice. Pure — no React, no fetch.

import { buildBaselineState } from '../calc.js'
import { checkFreshness } from '../../shared/freshness.js'

const DEFAULT_MORTGAGE_RATE = 2.6
const DEFAULT_MORTGAGE_TENURE = 25
// How old a synced slot can be before the planner flags it. The other
// tools' numbers drift (a re-run RetireWell, a new HouseMuch sale), and a
// stale slot silently disagrees with what the planner shows.
export const SYNC_STALE_DAYS = 180

// myNumbers: the object loadMyNumbers() returns.
// overrides: { startingCash } — cash has no source tool, so it is a plain
//   user field on the surface.
export function buildScenarioBaseState(myNumbers, overrides = {}) {
  const b = buildBaselineState(myNumbers || {})
  const house = b.house
  return {
    startingOA: b.cpf?.oa || 0,
    startingSA: b.cpf?.sa || 0,
    startingMA: b.cpf?.ma || 0,
    investmentStart: b.investmentBalance || 0,
    startingCash: Math.max(0, Number(overrides.startingCash) || 0),
    property: house && (house.propertyValue || house.outstandingBalance)
      ? {
          value: house.propertyValue || 0,
          mortgagePrincipal: house.outstandingBalance || 0,
          mortgageRatePct: Number(myNumbers?.house?.rate) || DEFAULT_MORTGAGE_RATE,
          mortgageTenureYears: house.tenureRemaining != null ? Number(house.tenureRemaining) : DEFAULT_MORTGAGE_TENURE,
        }
      : null,
  }
}

// Merge the retire slot's synced figures with the surface's own
// assumption fields (already coerced to numbers by the caller).
export function buildRetireAssumptions(myNumbers, fields = {}) {
  const r = myNumbers?.retire || {}
  return {
    currentAge: fields.currentAge || 0,
    retirementAge: fields.retirementAge || 0,
    lifeExpectancy: fields.lifeExpectancy || 90,
    currentYear: fields.currentYear || new Date().getFullYear(),
    salary: fields.salary || r.salary || 0,
    annualBonus: fields.annualBonus || 0,
    salaryGrowthRate: fields.salaryGrowthRate || 0,
    investmentMonthly: fields.investmentMonthly ?? r.monthlyContribution ?? 0,
    rstuAmount: fields.rstuAmount || 0,
    rstuFrequency: fields.rstuFrequency || 'monthly',
    housingOaMonthly: fields.housingOaMonthly || 0,
    housingOaUntilAge: fields.housingOaUntilAge ?? null,
    swr: fields.swr || 0,
  }
}

// The reference living-expenses figure: FlowState's measured monthly
// spend when the profile carries one (> 0), else the user's own field.
export function resolveReference(myNumbers, userField) {
  const flow = Number(myNumbers?.flow?.livingExpenses) || 0
  if (flow > 0) return { reference: flow, source: 'flow' }
  const own = Number(userField) || 0
  return { reference: own, source: own > 0 ? 'user' : 'none' }
}

// Which synced slots are stale enough to warn about. Returns
// [{ slot, months }] for each of retire/house/drive whose savedAt is
// older than SYNC_STALE_DAYS (or unknown).
export function staleSyncedSlots(myNumbers, now = new Date()) {
  const out = []
  for (const slot of ['retire', 'house', 'drive']) {
    const savedAt = myNumbers?.[slot]?.savedAt
    if (savedAt == null) continue // slot never synced — nothing to be stale
    const iso = new Date(Number(savedAt)).toISOString().slice(0, 10)
    const { stale, months } = checkFreshness(iso, SYNC_STALE_DAYS, now)
    if (stale) out.push({ slot, months })
  }
  return out
}
