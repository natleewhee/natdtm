// src/lib/ledger/calc.js
// MyLedger's aggregation engine: net worth, monthly obligations, TDSR
// across every debt (not just one loan at a time), and true investment
// capacity — the number that used to be a guess typed into RetireWell.
// Deliberately calls into the other verticals' own calc engines
// (calcRetirement from retire/calc.js, TDSR_LIMIT from drive/calc.js)
// rather than re-deriving their math, so a rate-table fix in one place
// stays the single source of truth. Pure functions — no React, no fetch.
// Covered by calc.test.js.

import { calcRetirement } from '../retire/calc.js'
import { TDSR_LIMIT } from '../drive/calc.js'
import { calcMonthlyInstalment, calcBSD } from '../house/calc.js'

export { TDSR_LIMIT }

// Fraction of gross salary treated as take-home after CPF — mirrors the
// 80% assumption already used in drive/calc.js's affordability check.
export const TAKE_HOME_RATE = 0.80

// A "ledger state" is the shape every scenario is built from — this is
// the RESOLVED shape (see resolveHouseModule below for how a "buying a
// new house" input gets turned into this):
// {
//   salary,
//   house: { outstandingBalance, monthlyInstalment, propertyValue } | null,
//   car:   { loanOutstanding, monthlyInstalment, carValue } | null,
//   cpf:   { oa, sa, ma },
//   investmentBalance,
//   cashSavings,
// }

// Builds a baseline ledger state from the shared "My Numbers" store
// (see src/lib/shared/profile.js) — whatever HouseMuch/DriveReady/
// RetireWell last saved, filled to zero/null where a module is empty.
// Cash savings has no source tool to sync from, so it always starts at
// zero here and is manual-entry only.
export function buildBaselineState(myNumbers) {
  const { house, drive, retire } = myNumbers || {}
  return {
    salary: retire?.salary || drive?.salary || 0,
    house: house ? {
      outstandingBalance: house.outstandingBalance || 0,
      monthlyInstalment: house.monthlyInstalment || 0,
      propertyValue: house.propertyValue || 0,
    } : null,
    car: drive ? {
      loanOutstanding: drive.loanOutstanding || 0,
      monthlyInstalment: drive.monthlyInstalment || 0,
      carValue: drive.carValue || 0,
    } : null,
    cpf: {
      oa: retire?.oaBalance || 0,
      sa: retire?.saBalance || 0,
      ma: retire?.maBalance || 0,
    },
    investmentBalance: retire?.investmentBalance || 0,
    cashSavings: 0,
  }
}

// Turns a "buying a new house" input into the actual loan/instalment/BSD
// numbers, the same way HouseMuch's NextPurchase does — reducing-balance
// instalment on a fresh loan, BSD from the public schedule. downpaymentPct
// defaults to 25% (75% loan), the standard first-home-loan LTV ceiling.
export function calcHousePurchase({ price = 0, downpaymentPct = 25, rate = 0, tenureYears = 25, otherFees = 0 }) {
  const p = Math.max(0, Number(price) || 0)
  const downPct = Math.max(0, Math.min(100, Number(downpaymentPct) || 0))
  const downpaymentAmount = p * (downPct / 100)
  const loanAmount = Math.max(0, p - downpaymentAmount)
  const monthlyInstalment = calcMonthlyInstalment(loanAmount, rate, tenureYears)
  const bsd = calcBSD(p)
  const fees = Number(otherFees) || 0
  const cashNeeded = downpaymentAmount + bsd + fees
  return { price: p, downpaymentAmount, loanAmount, monthlyInstalment, bsd, otherFees: fees, cashNeeded }
}

// Resolves a scenario's house input (either a plain existing-mortgage
// shape, or a { mode: 'purchase', ...calcHousePurchase inputs } shape)
// into the { outstandingBalance, monthlyInstalment, propertyValue } shape
// every other function here expects, plus how much cash buying it would
// draw down.
export function resolveHouseModule(house) {
  if (!house) return { resolved: null, cashNeeded: 0, purchase: null }
  if (house.mode === 'purchase') {
    const purchase = calcHousePurchase(house)
    return {
      resolved: { outstandingBalance: purchase.loanAmount, monthlyInstalment: purchase.monthlyInstalment, propertyValue: purchase.price },
      cashNeeded: purchase.cashNeeded,
      purchase,
    }
  }
  return {
    resolved: {
      outstandingBalance: house.outstandingBalance || 0,
      monthlyInstalment: house.monthlyInstalment || 0,
      propertyValue: house.propertyValue || 0,
    },
    cashNeeded: 0,
    purchase: null,
  }
}

export function calcNetWorth(state) {
  const propertyEquity = state.house ? (state.house.propertyValue || 0) - (state.house.outstandingBalance || 0) : 0
  const carEquity = state.car ? (state.car.carValue || 0) - (state.car.loanOutstanding || 0) : 0
  const cpfTotal = (state.cpf?.oa || 0) + (state.cpf?.sa || 0) + (state.cpf?.ma || 0)
  const investmentBalance = state.investmentBalance || 0
  const cashSavings = state.cashSavings || 0
  const netWorth = propertyEquity + carEquity + cpfTotal + investmentBalance + cashSavings
  return { propertyEquity, carEquity, cpfTotal, investmentBalance, cashSavings, netWorth }
}

export function calcMonthlyObligations(state) {
  const mortgage = state.house?.monthlyInstalment || 0
  const car = state.car?.monthlyInstalment || 0
  return { mortgage, car, total: mortgage + car }
}

// TDSR across every debt in the ledger, not just one loan at a time —
// the per-tool TDSR checks (e.g. DriveReady's) only ever see their own
// loan plus a flat "existing debt" figure the user has to remember to
// fill in; this sums the actual modules instead.
export function calcTDSR(state) {
  const obligations = calcMonthlyObligations(state).total
  const salary = state.salary || 0
  const tdsr = salary > 0 ? obligations / salary : null
  const exceeded = tdsr != null && tdsr > TDSR_LIMIT
  return { obligations, tdsr, exceeded }
}

// What's actually left to invest each month, after take-home pay covers
// every known debt obligation — replaces the guess RetireWell's
// "monthly contribution" field used to require.
export function calcInvestmentCapacity(state) {
  const takeHome = (state.salary || 0) * TAKE_HOME_RATE
  const obligations = calcMonthlyObligations(state).total
  return Math.max(0, takeHome - obligations)
}

// Runs a ledger state through RetireWell's own accumulation/depletion
// engine, using the state's CPF/investment balances and salary as the
// starting point and this state's investment capacity (not a
// user-guessed figure) as the monthly contribution.
export function calcScenarioRetirement(state, retireAssumptions) {
  const capacity = calcInvestmentCapacity(state)
  return calcRetirement({
    ...retireAssumptions,
    salary: state.salary || 0,
    startingOA: state.cpf?.oa || 0,
    startingSA: state.cpf?.sa || 0,
    startingMA: state.cpf?.ma || 0,
    investmentStart: state.investmentBalance || 0,
    investmentMonthly: capacity,
  })
}

// Runs every {label, state} scenario through the full stack and returns
// one row per scenario, ready for a side-by-side comparison table.
export function compareScenarios(scenarios, retireAssumptions) {
  return scenarios.map(({ label, state }) => {
    const netWorth = calcNetWorth(state)
    const obligations = calcMonthlyObligations(state)
    const tdsr = calcTDSR(state)
    const investmentCapacity = calcInvestmentCapacity(state)
    const retirement = calcScenarioRetirement(state, retireAssumptions)
    return { label, netWorth, obligations, tdsr, investmentCapacity, retirement }
  })
}
