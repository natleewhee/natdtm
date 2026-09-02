// src/lib/ledger/scenario/moves.js
// Move -> segment-start-state delta, via the tool that already owns each
// decision (KTD5). Every resolver returns the same delta shape; the
// orchestrator (index.js) folds same-year deltas together and hands the
// timeline to projectSegmented.
//
// Delta shape:
//   { cashDelta, cpfOaDelta, investmentLumpDelta, monthlyContributionDelta,
//     payoff: { year, monthlyContributionDelta } | null,
//     datedExtras: [{ year, cashDelta?, investmentLumpDelta?, monthlyContributionDelta? }],
//     propertyChange, mortgageChange, warning }
//
// Cash outflows only reduce investable capacity — a car's accounting
// depreciation is NOT a contribution cut (it is a paper loss, and the car
// is outside the liquid base per KD3). Pure — no React, no fetch.

import { calcSale, calcNextPurchase } from '../../house/calc.js'
import { calc as calcCarLoan } from '../../drive/calc.js'
import { estimateAnnualRunningCosts } from '../../drive/tco.js'

function emptyDelta() {
  return {
    cashDelta: 0, cpfOaDelta: 0, investmentLumpDelta: 0, monthlyContributionDelta: 0,
    payoff: null, datedExtras: [],
    propertyChange: null, mortgageChange: null, warning: null,
  }
}

function isIsoDate(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)
}

// ─── sell a property ───────────────────────────────────────────────────
// move.inputs is the sale-input group, passed straight to calcSale:
// { propertyType, purchasePrice, purchaseDate, salePrice, saleDate,
//   loanTaken, mortgageRate, loanTenure, cpfOutlay, agentCommission?,
//   legalFeesAtSale?, outstandingBalanceOverride?, cpfPrincipalOverride? }
function resolveSell(move) {
  const d = emptyDelta()
  const inp = move.inputs || {}
  // calcSale needs both dates to compute the holding period; without them
  // yearsHeld collapses to 0 and the full first-year SSD (12-16%) fires.
  if (!isIsoDate(inp.purchaseDate) || !isIsoDate(inp.saleDate)) {
    d.warning = 'sale-inputs-incomplete'
    return d
  }
  const sale = calcSale(inp)
  d.cashDelta += sale.cashProceeds
  d.cpfOaDelta += sale.totalCPFRefund
  // The mortgage instalment this property was costing is freed for investing.
  d.monthlyContributionDelta += sale.monthlyInstalment || 0
  d.propertyChange = { type: 'removed' }
  d.mortgageChange = { type: 'cleared' }
  // Carried so a same-year buy can draw on them.
  d.saleProceeds = { cashProceeds: sale.cashProceeds, totalCPFRefund: sale.totalCPFRefund }
  return d
}

// ─── buy a property ────────────────────────────────────────────────────
// move.inputs: { newPrice, newLoanAmount, newLoanTenure, newMortgageRate,
//   absd, otherFees }. context.saleProceeds (from a same-year sell) funds it.
function resolveBuy(move, context) {
  const d = emptyDelta()
  const inp = move.inputs || {}
  const proceeds = context?.saleProceeds || { cashProceeds: 0, totalCPFRefund: 0 }
  const next = calcNextPurchase(
    {
      newPrice: inp.newPrice, newLoanAmount: inp.newLoanAmount,
      newLoanTenure: inp.newLoanTenure, newMortgageRate: inp.newMortgageRate,
      absd: inp.absd, otherFees: inp.otherFees,
    },
    { cashProceeds: proceeds.cashProceeds, totalCPFRefund: proceeds.totalCPFRefund },
  )
  // CPF can fund the downpayment and stamp duties (not legal/other fees).
  // Spend the refund from exactly one place: credit it to OA on the sell,
  // then subtract what the purchase actually consumes back out of OA.
  const cpfEligible = (next.downpayment || 0) + (next.bsd || 0) + (Number(inp.absd) || 0)
  const cpfApplied = Math.max(0, Math.min(proceeds.totalCPFRefund || 0, cpfEligible, next.fundsRequired || 0))
  d.cashDelta -= Math.max(0, (next.fundsRequired || 0) - cpfApplied)
  d.cpfOaDelta -= cpfApplied
  d.monthlyContributionDelta -= next.newMonthlyInstalment || 0
  d.mortgageChange = {
    type: 'set',
    principal: Number(inp.newLoanAmount) || 0,
    ratePct: Number(inp.newMortgageRate) || 0,
    tenureYears: Number(inp.newLoanTenure) || 0,
  }
  d.propertyChange = { type: 'set', value: Number(inp.newPrice) || 0 }
  return d
}

// ─── move cash into / out of investments ───────────────────────────────
// move.inputs: { amount, direction: 'in' | 'out' }
function resolveCash(move) {
  const d = emptyDelta()
  const inp = move.inputs || {}
  const amount = Math.max(0, Number(inp.amount) || 0)
  if (inp.direction === 'out') {
    d.investmentLumpDelta -= amount
    d.cashDelta += amount
  } else {
    d.investmentLumpDelta += amount
    d.cashDelta -= amount
  }
  return d
}

// ─── buy / change a car ────────────────────────────────────────────────
// move.inputs: { car, salary, down, tenure, liveCOE?, existingDebt? }
function resolveCar(move) {
  const d = emptyDelta()
  const inp = move.inputs || {}
  const loan = calcCarLoan(inp.salary, inp.down, inp.tenure, inp.car, inp.liveCOE ?? null, inp.existingDebt ?? 0)
  if (!loan) {
    d.warning = 'car-inputs-incomplete'
    return d
  }
  const running = estimateAnnualRunningCosts(inp.car).monthly || 0
  // Instalment + running costs are real cash outflows; depreciation is not.
  d.monthlyContributionDelta -= (loan.monthly + running)
  // The down payment leaves cash at the move year.
  d.cashDelta -= Math.max(0, Number(inp.down) || 0)
  // When the loan is paid off its instalment (not the running cost) is freed.
  const tenure = Number(inp.tenure) || 0
  if (tenure > 0) {
    d.payoff = { year: (Number(move.year) || 0) + tenure, monthlyContributionDelta: loan.monthly }
  }
  return d
}

// ─── have a child ──────────────────────────────────────────────────────
// move.inputs: { annualCost, lumpAmount?, lumpYear? }
function resolveChild(move) {
  const d = emptyDelta()
  const inp = move.inputs || {}
  const annual = Math.max(0, Number(inp.annualCost) || 0)
  d.monthlyContributionDelta -= Math.round(annual / 12)
  const lump = Math.max(0, Number(inp.lumpAmount) || 0)
  const lumpYear = Number(inp.lumpYear)
  if (lump > 0 && Number.isFinite(lumpYear)) {
    d.datedExtras.push({ year: lumpYear, cashDelta: -lump })
  }
  return d
}

const RESOLVERS = {
  'sell-property': resolveSell,
  'buy-property': resolveBuy,
  'cash-to-investments': resolveCash,
  'buy-car': resolveCar,
  'have-child': resolveChild,
}

// An "upgrade" is not a move type — it is a sell-property + buy-property
// pair the orchestrator/UI groups at one year (KTD6).
export function resolveMove(move, context) {
  const resolver = RESOLVERS[move?.type]
  if (!resolver) return { ...emptyDelta(), warning: 'unknown-move-type' }
  return resolver(move, context)
}
