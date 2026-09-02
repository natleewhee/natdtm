// src/lib/ledger/calc.js
// MyLedger's aggregation engine: net worth, monthly obligations, TDSR
// across every debt (not just one loan at a time), and true investment
// capacity — the number that used to be a guess typed into RetireWell.
// Deliberately calls into the other verticals' own calc engines
// (calcRetirement from retire/calc.js, TDSR_LIMIT from drive/calc.js)
// rather than re-deriving their math, so a rate-table fix in one place
// stays the single source of truth. Pure functions — no React, no fetch.
// Covered by calc.test.js.
//
// Note: since the /ledger rebuild around the scenario engine
// (src/lib/ledger/scenario/*), `buildBaselineState`, `calcNetWorth` and
// `calcTDSR` are the only functions the page still calls. The house-module
// resolvers (`resolveHouseModule`, `calcHousePurchase`, `calcHouseUpgrade`)
// and the flat-contribution scenario drivers (`calcScenarioRetirement`,
// `compareScenarios`) are retained — still exported, still tested — as the
// documented prior art the segmented engine replaces and as a reference
// for `/ledger/the-math`. Remove them only with a deliberate cleanup pass.

import { calcRetirement } from '../retire/calc.js'
import { TDSR_LIMIT } from '../drive/calc.js'
import { calcMonthlyInstalment, calcBSD, calcNextPurchase, resolveSharePct } from '../house/calc.js'

export { TDSR_LIMIT, resolveSharePct }

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
  const { house, drive, retire, insure, tax, etf, flow } = myNumbers || {}
  return {
    salary: retire?.salary || drive?.salary || 0,
    // Exact after-tax take-home from TaxWise, when it's been run —
    // otherwise calcTakeHome falls back to the flat 80% approximation.
    monthlyTakeHome: tax?.monthlyTakeHome || 0,
    insurancePremium: insure?.monthlyPremium || 0,
    // FlowState's measured monthly living spend — see calcInvestmentCapacity
    // and buildCapacitySchedule below for how this replaces the old
    // implicit assumption that living expenses were zero.
    livingExpenses: flow?.livingExpenses || 0,
    house: house ? {
      outstandingBalance: house.outstandingBalance || 0,
      monthlyInstalment: house.monthlyInstalment || 0,
      propertyValue: house.propertyValue || 0,
      tenureRemaining: house.tenureRemaining ?? null,
      propertyType: house.propertyType || 'private',
      cashProceeds: house.cashProceeds || 0,
      totalCPFRefund: house.totalCPFRefund || 0,
      source: house.source || 'auto',
    } : null,
    car: drive ? {
      loanOutstanding: drive.loanOutstanding || 0,
      monthlyInstalment: drive.monthlyInstalment || 0,
      carValue: drive.carValue || 0,
      tenureRemaining: drive.tenureRemaining ?? null,
      source: drive.source || 'auto',
    } : null,
    cpf: {
      oa: retire?.oaBalance || 0,
      sa: retire?.saBalance || 0,
      ma: retire?.maBalance || 0,
    },
    // RetireWell's CPF-investment-scheme balance plus WhatETF's own
    // brokerage holdings (if the rebalance tool has been used) — two
    // different pots of invested money, so they add rather than override.
    investmentBalance: (retire?.investmentBalance || 0) + (etf?.portfolioValue || 0),
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
//
// house.yourSharePct (default 100) scales outstandingBalance,
// monthlyInstalment, AND propertyValue together, so a joint loan's
// equity contribution to net worth comes out as YOUR share of equity
// (your share of the asset minus your share of the debt), not your
// share of the debt against the full household asset. If this house
// module was auto-synced from a HouseMuch sale, its figures are
// already scaled there (see src/app/house/page.js) — yourSharePct here
// is for a scenario's own manually-entered or purchase/upgrade mortgage.
export function resolveHouseModule(house) {
  if (!house) return { resolved: null, cashImpact: 0, detail: null }

  const propertyType = house.propertyType || 'private'
  // resolveSharePct (not `Number(x) || 100`) clamps into [0,100] and
  // treats an explicit 0% as genuinely 0%, not "unset" — see its own
  // comment in house/calc.js for why the naive `||` version is a trap.
  const share = resolveSharePct(house.yourSharePct) / 100
  const scale = (resolved) => ({
    ...resolved,
    outstandingBalance: resolved.outstandingBalance * share,
    monthlyInstalment: resolved.monthlyInstalment * share,
    propertyValue: resolved.propertyValue * share,
  })

  if (house.mode === 'purchase') {
    const purchase = calcHousePurchase(house)
    return {
      resolved: scale({
        outstandingBalance: purchase.loanAmount, monthlyInstalment: purchase.monthlyInstalment,
        propertyValue: purchase.price, tenureRemaining: Number(house.tenureYears) || 25, propertyType,
      }),
      // Scaled by share, same as outstandingBalance/monthlyInstalment/
      // propertyValue above — cashNeeded is the FULL household cash
      // required, and a joint purchase means each owner only draws down
      // THEIR OWN cash savings for their own share of it. Leaving this
      // unscaled would credit you your share of the equity while
      // draining your full household's worth of cash, silently
      // understating net worth by the co-owner's share.
      cashImpact: -purchase.cashNeeded * share,
      detail: purchase,
    }
  }

  if (house.mode === 'upgrade') {
    const upgrade = calcHouseUpgrade(house)
    return {
      resolved: scale({
        outstandingBalance: upgrade.loanAmount, monthlyInstalment: upgrade.monthlyInstalment,
        propertyValue: upgrade.price, tenureRemaining: Number(house.tenureYears) || 25, propertyType,
      }),
      // Scaled by share — see the purchase-mode comment above. gap > 0:
      // shortfall draws (your share of) cash; gap < 0: leftover proceeds
      // top up (your share of) cash.
      cashImpact: -upgrade.gap * share,
      detail: upgrade,
    }
  }

  return {
    resolved: scale({
      outstandingBalance: house.outstandingBalance || 0,
      monthlyInstalment: house.monthlyInstalment || 0,
      propertyValue: house.propertyValue || 0,
      tenureRemaining: house.tenureRemaining ?? null,
      propertyType,
    }),
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

// Insurance premiums are a real monthly commitment but they are NOT a
// debt obligation, so they reduce what you can invest without counting
// toward TDSR or MSR — banks don't count them either.
export function calcMonthlyObligations(state) {
  const mortgage = state.house?.monthlyInstalment || 0
  const car = state.car?.monthlyInstalment || 0
  const insurance = state.insurancePremium || 0
  return {
    mortgage, car, insurance,
    debt: mortgage + car,          // what a bank counts
    total: mortgage + car + insurance, // what actually leaves your account
  }
}

// TDSR across every debt in the ledger, not just one loan at a time —
// the per-tool TDSR checks (e.g. DriveReady's) only ever see their own
// loan plus a flat "existing debt" figure the user has to remember to
// fill in; this sums the actual modules instead.
export function calcTDSR(state) {
  const obligations = calcMonthlyObligations(state).debt
  const salary = state.salary || 0
  const tdsr = salary > 0 ? obligations / salary : null
  const exceeded = tdsr != null && tdsr > TDSR_LIMIT
  return { obligations, tdsr, exceeded }
}

// Mortgage Servicing Ratio — 30% of gross monthly income, and unlike
// TDSR it counts ONLY the property loan. Applies to HDB flats and ECs
// bought from a developer, where it is very often the binding
// constraint rather than the 55% TDSR. Returns null for private
// property, where MSR simply doesn't apply.
export const MSR_LIMIT = 0.30

export function calcMSR(state) {
  if (state.house?.propertyType !== 'hdb') return { applicable: false, msr: null, exceeded: false }
  const mortgage = state.house?.monthlyInstalment || 0
  const salary = state.salary || 0
  const msr = salary > 0 ? mortgage / salary : null
  return { applicable: true, mortgage, msr, exceeded: msr != null && msr > MSR_LIMIT }
}

// Take-home pay. Prefers an exact after-tax figure from TaxWise when one
// has been computed (it accounts for the age-banded employee CPF share
// AND income tax); otherwise falls back to the flat 80%-of-gross
// approximation the rest of the suite uses, which is roughly right below
// 55 and increasingly wrong above it.
export function calcTakeHome(state) {
  if (state.monthlyTakeHome > 0) return { takeHome: state.monthlyTakeHome, exact: true }
  return { takeHome: (state.salary || 0) * TAKE_HOME_RATE, exact: false }
}

// Monthly capacity to invest, right now. Subtracts FlowState's measured
// living expenses when available — previously this implicitly assumed
// living costs were zero, overstating capacity by whatever someone
// actually spends on food, transport, utilities and everything else
// that isn't a loan or insurance premium.
export function calcInvestmentCapacity(state) {
  const { takeHome } = calcTakeHome(state)
  const obligations = calcMonthlyObligations(state).total
  const living = state.livingExpenses || 0
  return Math.max(0, takeHome - obligations - living)
}

// Capacity month by month over the accumulation period. Loans END —
// a 7-year car loan does not keep draining a 30-year projection — so
// each obligation drops out of the calculation once its remaining
// tenure is up, and capacity steps up accordingly. Insurance premiums
// and living expenses have no tenure and are assumed to continue
// throughout.
export function buildCapacitySchedule(state, months) {
  const { takeHome } = calcTakeHome(state)
  const insurance = state.insurancePremium || 0
  const living = state.livingExpenses || 0
  const houseMonths = state.house?.tenureRemaining != null
    ? Math.round(state.house.tenureRemaining * 12) : Infinity
  const carMonths = state.car?.tenureRemaining != null
    ? Math.round(state.car.tenureRemaining * 12) : Infinity
  const mortgage = state.house?.monthlyInstalment || 0
  const car = state.car?.monthlyInstalment || 0

  const schedule = []
  for (let m = 0; m < Math.max(0, months); m++) {
    const owed = (m < houseMonths ? mortgage : 0) + (m < carMonths ? car : 0) + insurance + living
    schedule.push(Math.max(0, takeHome - owed))
  }
  return schedule
}

// RetireWell's engine takes a single flat monthly contribution, but real
// capacity steps up as loans end. Rather than approximate with an
// average (which would misprice the compounding), this solves for the
// LEVEL contribution whose future value at retirement exactly equals
// that of the real, time-varying schedule — so the flat figure handed to
// RetireWell produces the same answer the varying one would.
export function levelEquivalentContribution(schedule, annualReturnPct) {
  const n = schedule.length
  if (n === 0) return 0
  const r = (Number(annualReturnPct) || 0) / 100 / 12
  if (r <= 0) return schedule.reduce((a, b) => a + b, 0) / n
  // Future value of the actual schedule, each contribution compounded
  // for however many months remain after it.
  let fv = 0
  for (let m = 0; m < n; m++) fv += schedule[m] * Math.pow(1 + r, n - m - 1)
  const annuityFactor = (Math.pow(1 + r, n) - 1) / r
  return annuityFactor > 0 ? fv / annuityFactor : 0
}

// Runs a ledger state through RetireWell's own accumulation/depletion
// engine, using the state's CPF/investment balances and salary as the
// starting point and the level-equivalent of this state's real,
// loan-tenure-aware capacity schedule as the monthly contribution.
export function calcScenarioRetirement(state, retireAssumptions) {
  const { currentAge = 0, retirementAge = 0, investmentReturn = 0 } = retireAssumptions
  const months = Math.max(0, Math.round((retirementAge - currentAge) * 12))
  const schedule = buildCapacitySchedule(state, months)
  const contribution = levelEquivalentContribution(schedule, investmentReturn)
  return calcRetirement({
    ...retireAssumptions,
    salary: state.salary || 0,
    startingOA: state.cpf?.oa || 0,
    startingSA: state.cpf?.sa || 0,
    startingMA: state.cpf?.ma || 0,
    investmentStart: state.investmentBalance || 0,
    investmentMonthly: contribution,
  })
}

// Runs every {label, state} scenario through the full stack and returns
// one row per scenario, ready for a side-by-side comparison table.
export function compareScenarios(scenarios, retireAssumptions) {
  const { currentAge = 0, retirementAge = 0, investmentReturn = 0 } = retireAssumptions
  const months = Math.max(0, Math.round((retirementAge - currentAge) * 12))
  return scenarios.map(({ label, state }) => {
    const netWorth = calcNetWorth(state)
    const obligations = calcMonthlyObligations(state)
    const tdsr = calcTDSR(state)
    const msr = calcMSR(state)
    const takeHome = calcTakeHome(state)
    const investmentCapacity = calcInvestmentCapacity(state)
    const schedule = buildCapacitySchedule(state, months)
    const levelCapacity = levelEquivalentContribution(schedule, investmentReturn)
    const finalCapacity = schedule.length ? schedule[schedule.length - 1] : investmentCapacity
    const retirement = calcScenarioRetirement(state, retireAssumptions)
    return {
      label, netWorth, obligations, tdsr, msr, takeHome,
      investmentCapacity, levelCapacity, finalCapacity, retirement,
    }
  })
}
