// src/lib/house/calc.js
// Single source of truth for the house sale/purchase math: mortgage
// amortization, CPF accrued-interest refund, the true profit/loss
// waterfall, and the "buying next" funds-gap check.
// Pure functions — no React, no fetch. Covered by calc.test.js.

import { calcBSD, calcSSD, HDB_MOP_YEARS } from './stampDuty.js'

export { calcBSD, calcSSD, HDB_MOP_YEARS }

const MS_PER_DAY = 86_400_000
const DAYS_PER_YEAR = 365.25

export function yearsBetween(startISO, endISO) {
  if (!startISO || !endISO) return 0
  const start = new Date(startISO).getTime()
  const end = new Date(endISO).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  return (end - start) / MS_PER_DAY / DAYS_PER_YEAR
}

// Standard reducing-balance monthly instalment: M = P·r(1+r)^n / ((1+r)^n − 1)
export function calcMonthlyInstalment(principal, annualRatePct, tenureYears) {
  const P = Number(principal), r = Number(annualRatePct) / 100 / 12, n = Number(tenureYears) * 12
  if (!Number.isFinite(P) || P <= 0 || !Number.isFinite(n) || n <= 0) return 0
  if (!Number.isFinite(r) || r <= 0) return P / n
  return P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

// Outstanding principal balance after `monthsElapsed` of a standard
// reducing-balance loan: B(t) = P·[(1+r)^n − (1+r)^t] / [(1+r)^n − 1]
export function calcOutstandingBalance(principal, annualRatePct, tenureYears, monthsElapsed) {
  const P = Number(principal), r = Number(annualRatePct) / 100 / 12, n = Number(tenureYears) * 12
  if (!Number.isFinite(P) || P <= 0 || !Number.isFinite(n) || n <= 0) return 0
  const t = Math.min(Math.max(0, Number(monthsElapsed) || 0), n)
  if (!Number.isFinite(r) || r <= 0) return P * (1 - t / n)
  return P * (Math.pow(1 + r, n) - Math.pow(1 + r, t)) / (Math.pow(1 + r, n) - 1)
}

// CPF principal used for a property must be refunded on sale together with
// the interest it would have earned had it stayed in the Ordinary Account
// — a flat 2.5% p.a., compounded over the actual holding period. This is
// an approximation: CPF Board computes it per-withdrawal from each
// withdrawal's own date, and the OA rate has occasionally differed from
// 2.5% historically — neither of which this calculator has the data to
// reproduce exactly. Log into your CPF account for the exact figure, and
// use the override field once you have it.
export const CPF_OA_RATE = 0.025

export function calcCPFAccruedInterest(cpfPrincipal, yearsHeld, rate = CPF_OA_RATE) {
  const P = Number(cpfPrincipal)
  if (!Number.isFinite(P) || P <= 0 || !Number.isFinite(yearsHeld) || yearsHeld <= 0) return 0
  return P * (Math.pow(1 + rate, yearsHeld) - 1)
}

// ─── Part A: selling the current house ──────────────────────────────────
// propertyType: 'hdb' | 'private'
export function calcSale(inputs) {
  const {
    propertyType,
    purchasePrice = 0, purchaseDate, purchaseFees = 0,
    cashOutlay = 0, cpfOutlay = 0, housingGrant = 0,
    loanTaken = 0, mortgageRate = 0, loanTenure = 0,
    sunkCost = 0,
    salePrice = 0, saleDate,
    agentCommission = 0, legalFeesAtSale = 0,
    outstandingBalanceOverride = null,
    cpfAccruedInterestOverride = null,
    ssdOverride = null,
  } = inputs

  const yearsHeld = yearsBetween(purchaseDate, saleDate)
  const monthsHeld = yearsHeld * 12

  const monthlyInstalment = calcMonthlyInstalment(loanTaken, mortgageRate, loanTenure)
  const outstandingBalanceComputed = calcOutstandingBalance(loanTaken, mortgageRate, loanTenure, monthsHeld)
  const outstandingBalance = outstandingBalanceOverride ?? outstandingBalanceComputed

  // Total interest paid to date = total instalments paid so far (at the
  // computed rate) minus principal actually repaid — using whichever
  // balance we're working with (computed, or your real one if overridden).
  const principalRepaid = Math.max(0, (Number(loanTaken) || 0) - outstandingBalance)
  const totalPaidToDate = monthlyInstalment * monthsHeld
  const totalInterestPaid = Math.max(0, totalPaidToDate - principalRepaid)

  const cpfPrincipalTotal = (Number(cpfOutlay) || 0) + (Number(housingGrant) || 0)
  const cpfAccruedInterestComputed = calcCPFAccruedInterest(cpfPrincipalTotal, yearsHeld)
  const cpfAccruedInterest = cpfAccruedInterestOverride ?? cpfAccruedInterestComputed
  const totalCPFRefund = cpfPrincipalTotal + cpfAccruedInterest

  const ssdComputed = propertyType === 'private' ? calcSSD(salePrice, yearsHeld, propertyType).amount : 0
  const ssd = ssdOverride ?? ssdComputed

  const sellingCosts = (Number(agentCommission) || 0) + (Number(legalFeesAtSale) || 0) + ssd

  const cashProceeds = (Number(salePrice) || 0) - outstandingBalance - sellingCosts - totalCPFRefund

  // True profit/loss is a property-economics number, independent of how
  // the purchase was financed. CPF principal isn't a cost here — it comes
  // back to you, just into CPF instead of your bank account. Financing
  // choice only changes how much of the gain is spendable cash vs locked
  // back in CPF, which is exactly why this number and cashProceeds below
  // are shown side by side rather than collapsed into one figure.
  const trueCostBasis = (Number(purchasePrice) || 0) + (Number(purchaseFees) || 0) + (Number(sunkCost) || 0) + totalInterestPaid
  const netSale = (Number(salePrice) || 0) - sellingCosts
  const trueProfitLoss = netSale - trueCostBasis

  const cashInvested = (Number(cashOutlay) || 0) + (Number(sunkCost) || 0)
  const cashOnCashReturn = cashInvested > 0 ? (cashProceeds - cashInvested) / cashInvested : null

  const mopOk = propertyType !== 'hdb' || yearsHeld >= HDB_MOP_YEARS

  return {
    propertyType, yearsHeld, monthsHeld,
    purchasePrice: Number(purchasePrice) || 0, purchaseFees: Number(purchaseFees) || 0, sunkCost: Number(sunkCost) || 0,
    salePrice: Number(salePrice) || 0, agentCommission: Number(agentCommission) || 0, legalFeesAtSale: Number(legalFeesAtSale) || 0,
    monthlyInstalment, outstandingBalanceComputed, outstandingBalance, totalInterestPaid,
    cpfPrincipalTotal, cpfAccruedInterestComputed, cpfAccruedInterest, totalCPFRefund,
    ssdComputed, ssd, sellingCosts,
    cashProceeds,
    trueCostBasis, netSale, trueProfitLoss, isProfit: trueProfitLoss >= 0,
    cashInvested, cashOnCashReturn,
    mopOk,
  }
}

// ─── Part B: buying the next place ──────────────────────────────────────
// Funds required is compared against funds available carried forward from
// a Part A `calcSale` result (cash proceeds + CPF refund), plus any extra
// cash/CPF you want to top up with. Cash and CPF are treated as
// interchangeable here for simplicity — in practice some costs may need
// to be cash-only depending on your CPF withdrawal limits, so treat the
// gap/surplus figure as indicative and confirm with your banker/lawyer.
export function calcNextPurchase(inputs, saleResult) {
  const {
    newPrice = 0, newLoanAmount = 0, newLoanTenure = 0, newMortgageRate = 0,
    absd = 0, otherFees = 0,
    extraCash = 0, extraCPF = 0,
  } = inputs

  const bsd = calcBSD(newPrice)
  const downpayment = Math.max(0, (Number(newPrice) || 0) - (Number(newLoanAmount) || 0))
  const fundsRequired = downpayment + bsd + (Number(absd) || 0) + (Number(otherFees) || 0)

  const fundsAvailable = (saleResult?.cashProceeds || 0) + (saleResult?.totalCPFRefund || 0)
    + (Number(extraCash) || 0) + (Number(extraCPF) || 0)

  const gap = fundsRequired - fundsAvailable
  const newMonthlyInstalment = calcMonthlyInstalment(newLoanAmount, newMortgageRate, newLoanTenure)

  return { bsd, downpayment, fundsRequired, fundsAvailable, gap, surplus: gap <= 0, newMonthlyInstalment }
}
