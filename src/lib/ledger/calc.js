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
import { calcMonthlyInstalment, calcBSD, calcNextPurchase } from '../house/calc.js'

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
// cashProceeds/totalCPFRefund are carried through even though the
// resolved shape below doesn't use them directly — they're there so an
// "upgrading" scenario can default its sale figures from the last
// HouseMuch sale calculation instead of asking for them again. Cash
// savings has no source tool to sync from, so it always starts at zero
// and is manual-entry only.
export function buildBaselineState(myNumbers) {
  const { house, drive, retire } = myNumbers || {}
  return {
    salary: retire?.salary || drive?.salary || 0,
    house: house ? {
      outstandingBalance: house.outstandingBalance || 0,
      monthlyInstalment: house.monthlyInstalment || 0,
      propertyValue: house.propertyValue || 0,
      cashProceeds: house.cashProceeds || 0,
      totalCPFRefund: house.totalCPFRefund || 0,
      source: house.source || 'auto',
    } : null,
    car: drive ? {
      loanOutstanding: drive.loanOutstanding || 0,
      monthlyInstalment: drive.monthlyInstalment || 0,
      carValue: drive.carValue || 0,
      source: drive.source || 'auto',
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

// "Upgrading" — sell the current house, then use the sale proceeds plus
// CPF refund toward a new house — reusing HouseMuch's own NextPurchase
// engine (calcNextPurchase) rather than re-deriving the funds-required-
// vs-funds-available math. cashProceeds/totalCPFRefund are the outputs
// of a HouseMuch sale calculation (synced automatically if you've run
// one, editable either way). Cash and CPF are pooled together as "funds
// available" here, same simplification NextPurchase itself documents.
export function calcHouseUpgrade({
  cashProceeds = 0, totalCPFRefund = 0,
  price = 0, downpaymentPct = 25, rate = 0, tenureYears = 25, otherFees = 0, absd = 0,
}) {
  const p = Math.max(0, Number(price) || 0)
  const downPct = Math.max(0, Math.min(100, Number(downpaymentPct) || 0))
  const loanAmount = Math.max(0, p - p * (downPct / 100))
  const next = calcNextPurchase(
    { newPrice: p, newLoanAmount: loanAmount, newLoanTenure: tenureYears, newMortgageRate: rate, absd, otherFees },
    { cashProceeds: Number(cashProceeds) || 0, totalCPFRefund: Number(totalCPFRefund) || 0 },
  )
  return {
    price: p, loanAmount, monthlyInstalment: next.newMonthlyInstalment,
    bsd: next.bsd, downpayment: next.downpayment,
    cashProceeds: Number(cashProceeds) || 0, totalCPFRefund: Number(totalCPFRefund) || 0,
    fundsRequired: next.fundsRequired, fundsAvailable: next.fundsAvailable,
    gap: next.gap, surplus: next.surplus,
  }
}

// Resolves a scenario's house input — a plain existing-mortgage shape,
// a { mode: 'purchase', ... } shape, or a { mode: 'upgrade', ... } shape
// — into the { outstandingBalance, monthlyInstalment, propertyValue }
// shape every other function here expects, plus cashImpact: how much
// the choice adds to (positive) or draws from (negative) cash savings.
// A plain purchase only ever draws down cash; an upgrade can go either
// way depending on whether the old house's sale proceeds cover the new
// one.
export function resolveHouseModule(house) {
  if (!house) return { resolved: null, cashImpact: 0, detail: null }

  if (house.mode === 'purchase') {
    const purchase = calcHousePurchase(house)
    return {
      resolved: { outstandingBalance: purchase.loanAmount, monthlyInstalment: purchase.monthlyInstalment, propertyValue: purchase.price },
      cashImpact: -purchase.cashNeeded,
      detail: purchase,
    }
  }

  if (house.mode === 'upgrade') {
    const upgrade = calcHouseUpgrade(house)
    return {
      resolved: { outstandingBalance: upgrade.loanAmount, monthlyInstalment: upgrade.monthlyInstalment, propertyValue: upgrade.price },
      cashImpact: -upgrade.gap, // gap > 0: shortfall draws cash; gap < 0: leftover proceeds top it up
      detail: upgrade,
    }
  }

  return {
    resolved: {
      outstandingBalance: house.outstandingBalance || 0,
      monthlyInstalment: house.monthlyInstalment || 0,
      propertyValue: house.propertyValue || 0,
    },
    cashImpact: 0,
    detail: null,
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
