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
//
// Cash outlay at purchase is NOT taken as an input — it's derived. If you
// know your purchase price, loan taken, and CPF principal used (all
// things you can look up exactly, e.g. from your CPF statement and loan
// offer letter), your cash outlay is whatever made up the rest:
//   cash outlay = (purchase price + purchase fees) − loan taken − CPF used
// This also means BSD at purchase is computed from the public schedule
// rather than asked for — only legal and agent fees (which aren't
// government-set) are self-reported.
export function calcSale(inputs) {
  const {
    propertyType,
    purchasePrice = 0, purchaseDate,
    legalFeesAtPurchase = 0, agentFeesAtPurchase = 0,
    cpfOutlay = 0,
    loanTaken = 0, mortgageRate = 0, loanTenure = 0,
    sunkCost = 0,
    salePrice = 0, saleDate,
    agentCommission = 0, legalFeesAtSale = 0,
    outstandingBalanceOverride = null,
    totalInterestPaidOverride = null,
    cpfPrincipalOverride = null,
    cpfAccruedInterestOverride = null,
    ssdOverride = null,
    today = new Date().toISOString().slice(0, 10),
    // For a joint loan: what fraction of the property (and its loan) is
    // yours. Everything above stays a full-household calculation — BSD,
    // SSD, and mortgage amortization all need the real, whole-property
    // figures to be correct — this only scales the handful of "what does
    // this mean for ME" outputs below. CPF principal is NOT scaled: CPF
    // withdrawals are tracked per person, so cpfOutlay is assumed to
    // already be your own contribution, not a household total.
    yourSharePct = 100,
  } = inputs

  const yearsHeld = yearsBetween(purchaseDate, saleDate)
  const monthsHeld = yearsHeld * 12

  const bsdAtPurchase = calcBSD(purchasePrice)
  const purchaseFees = bsdAtPurchase + (Number(legalFeesAtPurchase) || 0) + (Number(agentFeesAtPurchase) || 0)

  // Every override below is anchored at "today" (or at sale, if the sale
  // already happened) rather than at some hypothetical future sale date —
  // because "today" is the one point in the loan's life you can actually
  // check (banking app, CPF portal), no matter how long ago you bought.
  // If you're selling later than today, the calculator projects forward
  // from your real today's-numbers to your sale date — a short, clean
  // window — instead of reconstructing the entire purchase-to-sale
  // history synthetically, which is exactly what breaks whenever reality
  // (a lump-sum repayment, CPF top-ups) deviated from a plain schedule.
  const saleIsInFuture = !!(saleDate && today < saleDate)
  const asOfDate = saleIsInFuture ? today : saleDate
  const monthsPurchaseToAsOf = yearsBetween(purchaseDate, asOfDate) * 12
  const monthsAsOfToSale = saleIsInFuture ? yearsBetween(asOfDate, saleDate) * 12 : 0
  const remainingTenureYears = Math.max(0, (Number(loanTenure) || 0) - yearsBetween(purchaseDate, asOfDate))

  const monthlyInstalment = calcMonthlyInstalment(loanTaken, mortgageRate, loanTenure)
  const outstandingBalanceAsOfComputed = calcOutstandingBalance(loanTaken, mortgageRate, loanTenure, monthsPurchaseToAsOf)
  const outstandingBalanceAsOf = outstandingBalanceOverride ?? outstandingBalanceAsOfComputed
  const outstandingBalanceComputed = outstandingBalanceAsOfComputed
  const outstandingBalance = monthsAsOfToSale > 0
    ? calcOutstandingBalance(outstandingBalanceAsOf, mortgageRate, remainingTenureYears, monthsAsOfToSale)
    : outstandingBalanceAsOf

  // Interest paid so far (up to today, or up to sale if already sold) plus
  // — only when selling later — a clean forward-projected slice for the
  // remaining months. Same "every dollar of principal came from the
  // regular instalment" assumption as before, but now scoped to a much
  // shorter window on each side of the override, so a historical
  // prepayment (baked into your real "as of today" balance) no longer
  // corrupts a projection that only has to cover the future.
  const principalRepaidToAsOf = Math.max(0, (Number(loanTaken) || 0) - outstandingBalanceAsOf)
  const totalPaidToAsOf = monthlyInstalment * monthsPurchaseToAsOf
  const totalInterestPaidAsOfComputed = Math.max(0, totalPaidToAsOf - principalRepaidToAsOf)
  const totalInterestPaidComputed = totalInterestPaidAsOfComputed
  const totalInterestPaidAsOf = totalInterestPaidOverride ?? totalInterestPaidAsOfComputed
  const principalRepaidRemaining = Math.max(0, outstandingBalanceAsOf - outstandingBalance)
  const totalPaidRemaining = monthlyInstalment * monthsAsOfToSale
  const interestPaidRemaining = Math.max(0, totalPaidRemaining - principalRepaidRemaining)
  const totalInterestPaid = totalInterestPaidAsOf + interestPaidRemaining

  // CPF used at purchase (down payment) and CPF principal owed back on
  // sale are only the same number if all your CPF went in as a single
  // lump sum at purchase. If you service your monthly mortgage instalment
  // via CPF OA — the common case — the refundable principal keeps growing
  // every month after purchase, so it needs its own override anchored at
  // today, same reasoning as the loan balance above. Forward from today
  // to a future sale date, the principal is assumed to stay flat (no
  // further CPF top-ups modeled) — only its accrued interest keeps
  // compounding — so check back closer to your actual sale for a tighter
  // number if you're still servicing via CPF.
  const cpfPrincipalAtPurchase = Number(cpfOutlay) || 0
  const cpfPrincipalAsOfComputed = cpfPrincipalAtPurchase
  const cpfPrincipalComputed = cpfPrincipalAsOfComputed
  const cpfPrincipalAsOf = cpfPrincipalOverride ?? cpfPrincipalAsOfComputed
  const cpfPrincipalTotal = cpfPrincipalAsOf
  const cpfAccruedInterestAsOfComputed = calcCPFAccruedInterest(cpfPrincipalAsOf, monthsPurchaseToAsOf / 12)
  const cpfAccruedInterestComputed = cpfAccruedInterestAsOfComputed
  const cpfAccruedInterestAsOf = cpfAccruedInterestOverride ?? cpfAccruedInterestAsOfComputed
  const cpfAccruedInterestRemaining = calcCPFAccruedInterest(cpfPrincipalAsOf, monthsAsOfToSale / 12)
  const cpfAccruedInterest = cpfAccruedInterestAsOf + cpfAccruedInterestRemaining
  const totalCPFRefund = cpfPrincipalTotal + cpfAccruedInterest

  const ssdComputed = propertyType === 'private' ? calcSSD(salePrice, yearsHeld, propertyType).amount : 0
  const ssd = ssdOverride ?? ssdComputed

  const sellingCosts = (Number(agentCommission) || 0) + (Number(legalFeesAtSale) || 0) + ssd

  const cashProceeds = (Number(salePrice) || 0) - outstandingBalance - sellingCosts - totalCPFRefund

  // Derived, not asked for — whatever wasn't covered by the loan or CPF
  // must have been cash. Can go negative if the loan + CPF you entered
  // add up to more than the price + fees, which usually means one of
  // those figures was mistyped — surfaced to the UI via cashOutlayUnclear.
  const cashOutlay = (Number(purchasePrice) || 0) + purchaseFees - (Number(loanTaken) || 0) - (Number(cpfOutlay) || 0)
  const cashOutlayUnclear = cashOutlay < 0

  // True profit/loss is a property-economics number, independent of how
  // the purchase was financed. CPF principal isn't a cost here — it comes
  // back to you, just into CPF instead of your bank account. Financing
  // choice only changes how much of the gain is spendable cash vs locked
  // back in CPF, which is exactly why this number and cashProceeds below
  // are shown side by side rather than collapsed into one figure.
  const trueCostBasis = (Number(purchasePrice) || 0) + purchaseFees + (Number(sunkCost) || 0) + totalInterestPaid
  const netSale = (Number(salePrice) || 0) - sellingCosts
  const trueProfitLoss = netSale - trueCostBasis

  const cashInvested = Math.max(0, cashOutlay) + (Number(sunkCost) || 0)
  const cashOnCashReturn = cashInvested > 0 ? (cashProceeds - cashInvested) / cashInvested : null

  // Two different ROI lenses on the same true profit/loss figure:
  // - against the purchase price, the classic "how much did the property
  //   itself appreciate" number
  // - against what you actually put in (cash + CPF), which is usually a
  //   much bigger % because the loan portion means your own capital was
  //   leveraged — the same profit spread over a smaller base
  const totalOutlay = Math.max(0, cashOutlay) + (Number(cpfOutlay) || 0)
  const roiOnPrice = purchasePrice > 0 ? trueProfitLoss / purchasePrice : null
  const roiOnOutlay = totalOutlay > 0 ? trueProfitLoss / totalOutlay : null

  // Annualized (CAGR-style): (1 + total ROI)^(1/years held) − 1. Only
  // defined when held for a positive stretch of time and the total return
  // isn't a wipeout beyond −100% (which has no real-valued root here).
  const annualize = roi => (roi != null && yearsHeld > 0 && 1 + roi > 0)
    ? Math.pow(1 + roi, 1 / yearsHeld) - 1
    : null
  const annualizedRoiOnPrice = annualize(roiOnPrice)
  const annualizedRoiOnOutlay = annualize(roiOnOutlay)

  const mopOk = propertyType !== 'hdb' || yearsHeld >= HDB_MOP_YEARS

  // "Your share" figures — the household numbers above, scaled by your
  // ownership share. cashOnCashReturn is a ratio of two figures both
  // scaled by the same factor, so it's identical either way and isn't
  // duplicated here.
  const share = (Number(yourSharePct) || 100) / 100
  const yourCashProceeds = cashProceeds * share
  const yourCashInvested = cashInvested * share
  const yourTrueProfitLoss = trueProfitLoss * share
  const yourOutstandingBalance = outstandingBalance * share
  const yourMonthlyInstalment = monthlyInstalment * share

  return {
    propertyType, yearsHeld, monthsHeld,
    purchasePrice: Number(purchasePrice) || 0,
    bsdAtPurchase, legalFeesAtPurchase: Number(legalFeesAtPurchase) || 0, agentFeesAtPurchase: Number(agentFeesAtPurchase) || 0,
    purchaseFees, sunkCost: Number(sunkCost) || 0,
    loanTaken: Number(loanTaken) || 0, cpfOutlay: Number(cpfOutlay) || 0,
    cashOutlay, cashOutlayUnclear,
    salePrice: Number(salePrice) || 0, agentCommission: Number(agentCommission) || 0, legalFeesAtSale: Number(legalFeesAtSale) || 0,
    saleIsInFuture, asOfDate, monthsAsOfToSale,
    monthlyInstalment, outstandingBalanceComputed, outstandingBalance,
    totalInterestPaidComputed, totalInterestPaid,
    cpfPrincipalAtPurchase, cpfPrincipalComputed, cpfPrincipalTotal,
    cpfAccruedInterestComputed, cpfAccruedInterest, totalCPFRefund,
    ssdComputed, ssd, sellingCosts,
    cashProceeds,
    trueCostBasis, netSale, trueProfitLoss, isProfit: trueProfitLoss >= 0,
    cashInvested, cashOnCashReturn,
    totalOutlay, roiOnPrice, roiOnOutlay, annualizedRoiOnPrice, annualizedRoiOnOutlay,
    mopOk,
    yourSharePct: Number(yourSharePct) || 100,
    yourCashProceeds, yourCashInvested, yourTrueProfitLoss,
    yourOutstandingBalance, yourMonthlyInstalment,
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
