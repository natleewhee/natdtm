// src/lib/ledger/scenario/adapt.js
// Maps the shared "My Numbers" store (src/lib/shared/profile.js) into the
// baseState / retireAssumptions shapes runScenario (index.js) expects.
// Kept separate from the page so the mapping is unit-testable and shared
// by /ledger and the /ledger/preview slice. Pure — no React, no fetch.

import { buildBaselineState } from '../calc.js'
import { checkFreshness } from '../../shared/freshness.js'
import { parseMoney } from '../../shared/theme.js'

// The same money/number coercion the surface's inputs use (honours "k"/"m"
// shorthand, strips currency symbols). theme.js is pure constants + this
// helper — no React, no fetch — so a lib file can import it.
const num = parseMoney

// Fallbacks when the house slot carries a value/balance but no rate or
// remaining tenure (an older HouseMuch sync). 2.6% is a representative
// prevailing package rate; 25y is the standard maximum private-property
// loan tenure. The property wrapper only feeds the net-worth line and the
// asset-mix chart, never the withdrawal headline.
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
// [{ slot, months }] for each of retire/house/drive whose savedAt is a
// timestamp older than SYNC_STALE_DAYS. A slot with no savedAt, or a
// non-numeric one, is skipped rather than allowed to throw — this runs
// synchronously inside the page's mount effect, so a throw here would
// leave the whole planner un-restored.
export function staleSyncedSlots(myNumbers, now = new Date()) {
  const out = []
  for (const slot of ['retire', 'house', 'drive']) {
    const savedAt = Number(myNumbers?.[slot]?.savedAt)
    if (!Number.isFinite(savedAt) || savedAt <= 0) continue
    const iso = new Date(savedAt).toISOString().slice(0, 10)
    const { stale, months } = checkFreshness(iso, SYNC_STALE_DAYS, now)
    if (stale) out.push({ slot, months })
  }
  return out
}

// ─── surface → engine move mapping ────────────────────────────────────
// A move as edited on the /ledger surface (all string fields) → the
// { type, year, inputs } shape runScenario expects. buy-car needs its car
// object resolved from the catalogue and the household salary threaded in;
// the resolvers in moves.js own the remaining string→number coercion.

// Move / delta year validation for the MoveEditor and the recompute
// filter: a non-negative integer strictly inside [0, years-to-retirement).
export function yearError(year, retireYears) {
  if (year === '' || year == null) return 'Set a year'
  const n = Number(year)
  if (!Number.isInteger(n)) return 'Whole years only'
  if (n < 0) return 'Cannot be negative'
  if (retireYears > 0 && n >= retireYears) return `Before retirement (< ${retireYears})`
  return null
}

export function toEngineMove(move, carsById = {}, salary = 0) {
  const year = num(move.year)
  const i = move.inputs || {}
  switch (move.type) {
    case 'sell-property':
      return { type: move.type, year, inputs: {
        propertyType: i.propertyType || 'private',
        purchasePrice: num(i.purchasePrice), purchaseDate: i.purchaseDate || undefined,
        salePrice: num(i.salePrice), saleDate: i.saleDate || undefined,
        loanTaken: num(i.loanTaken), mortgageRate: num(i.mortgageRate), loanTenure: num(i.loanTenure),
        cpfOutlay: num(i.cpfOutlay),
      } }
    case 'buy-property':
      return { type: move.type, year, inputs: {
        newPrice: num(i.newPrice), newLoanAmount: num(i.newLoanAmount),
        newLoanTenure: num(i.newLoanTenure), newMortgageRate: num(i.newMortgageRate),
        absd: num(i.absd), otherFees: num(i.otherFees),
      } }
    case 'cash-to-investments':
      return { type: move.type, year, inputs: { amount: num(i.amount), direction: i.direction || 'in' } }
    case 'buy-car':
      return { type: move.type, year, inputs: {
        car: carsById[i.carId] || null, salary, down: num(i.down), tenure: num(i.tenure),
      } }
    case 'have-child':
      return { type: move.type, year, inputs: {
        annualCost: num(i.annualCost),
        supportYears: i.supportYears === '' || i.supportYears == null ? undefined : num(i.supportYears),
        lumpAmount: num(i.lumpAmount),
        lumpYear: i.lumpYear === '' || i.lumpYear == null ? undefined : num(i.lumpYear),
      } }
    default:
      return { type: move.type, year, inputs: {} }
  }
}
