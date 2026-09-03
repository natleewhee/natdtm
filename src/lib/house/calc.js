// src/lib/house/calc.js
// Single source of truth for the house sale/purchase math: mortgage
// amortization, CPF accrued-interest refund, the true profit/loss
// waterfall, and the "buying next" funds-gap check.
// Pure functions — no React, no fetch. Covered by calc.test.js.

import { calcBSD, calcSSD, HDB_MOP_YEARS } from './stampDuty.js'

export { calcBSD, calcSSD, HDB_MOP_YEARS }

const MS_PER_DAY = 86_400_000
const DAYS_PER_YEAR = 365.25
const SGT_OFFSET_MS = 8 * 3600 * 1000 // Singapore is fixed UTC+8, no DST

// Today's calendar date in Singapore time, not the server/runtime's own
// UTC date — `new Date().toISOString().slice(0,10)` is a day behind SGT
// between 00:00 and 08:00 SGT (that window is still "yesterday" in UTC),
// which would wrongly flip a same-day sale to saleIsInFuture and shift
// every "as of today" CPF/interest override anchor by a day right when
// someone opens this in the morning.
/**
 * Today's calendar date in Singapore time (fixed UTC+8, no DST), not the
 * server/runtime's own UTC date — avoids being a day behind SGT between
 * 00:00 and 08:00 SGT.
 * @param {number} [nowMs=Date.now()] - Current time in epoch milliseconds.
 * @returns {string} Today's date in Singapore time, as an ISO date string (YYYY-MM-DD).
 */
export function todaySGT(nowMs = Date.now()) {
  return new Date(nowMs + SGT_OFFSET_MS).toISOString().slice(0, 10)
}

/**
 * Years elapsed between two ISO dates, as a decimal.
 * @param {string} startISO - Start date, ISO format.
 * @param {string} endISO - End date, ISO format.
 * @returns {number} Years between the two dates, or 0 if either is missing/invalid or end is not after start.
 */
export function yearsBetween(startISO, endISO) {
  if (!startISO || !endISO) return 0
  const start = new Date(startISO).getTime()
  const end = new Date(endISO).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  return (end - start) / MS_PER_DAY / DAYS_PER_YEAR
}

/**
 * Standard reducing-balance monthly instalment: M = P·r(1+r)^n / ((1+r)^n − 1).
 * @param {number} principal - Loan principal in dollars.
 * @param {number} annualRatePct - Annual interest rate as a percentage (e.g. 3 for 3%).
 * @param {number} tenureYears - Loan tenure in years.
 * @returns {number} Monthly instalment in dollars.
 */
export function calcMonthlyInstalment(principal, annualRatePct, tenureYears) {
  const P = Number(principal), r = Number(annualRatePct) / 100 / 12, n = Number(tenureYears) * 12
  if (!Number.isFinite(P) || P <= 0 || !Number.isFinite(n) || n <= 0) return 0
  if (!Number.isFinite(r) || r <= 0) return P / n
  return P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

/**
 * Outstanding principal balance after `monthsElapsed` of a standard
 * reducing-balance loan: B(t) = P·[(1+r)^n − (1+r)^t] / [(1+r)^n − 1].
 * @param {number} principal - Loan principal in dollars.
 * @param {number} annualRatePct - Annual interest rate as a percentage.
 * @param {number} tenureYears - Loan tenure in years.
 * @param {number} monthsElapsed - Months elapsed since the loan started, clamped to [0, tenureYears*12].
 * @returns {number} Outstanding principal balance in dollars.
 */
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

/**
 * Interest a CPF principal used for property would have earned had it
 * stayed in the Ordinary Account, compounded over the holding period.
 * An approximation — CPF Board computes this per-withdrawal from each
 * withdrawal's own date; use the override field for the exact CPF figure.
 * @param {number} cpfPrincipal - CPF principal used, in dollars.
 * @param {number} yearsHeld - Years the principal has been outstanding.
 * @param {number} [rate=CPF_OA_RATE] - Annual interest rate (decimal, e.g. 0.025).
 * @returns {number} Accrued interest in dollars.
 */
export function calcCPFAccruedInterest(cpfPrincipal, yearsHeld, rate = CPF_OA_RATE) {
  const P = Number(cpfPrincipal)
  if (!Number.isFinite(P) || P <= 0 || !Number.isFinite(yearsHeld) || yearsHeld <= 0) return 0
  return P * (Math.pow(1 + rate, yearsHeld) - 1)
}

// Resolves a joint-loan share input to a percentage in [0, 100],
// defaulting to 100 (sole ownership) only when nothing usable was
// passed in. `Number(0) || 100` — the naive version of this — is a
// classic falsy-coercion trap: entering exactly 0% would silently
// become 100%, crediting a co-borrower with zero stake in the full
// household profit/loss instead of none. Also clamps > 100 / negative
// entries, since nothing upstream validates the input field.
/**
 * Resolves a joint-loan share input to a percentage in [0, 100],
 * defaulting to 100 (sole ownership) only when nothing usable was
 * passed in — an explicit 0 is preserved rather than falling back
 * (avoids the classic `Number(0) || 100` falsy-coercion trap).
 * @param {*} pct - The share percentage input.
 * @returns {number} A percentage clamped to [0, 100], defaulting to 100 if unusable.
 */
export function resolveSharePct(pct) {
  const n = Number(pct)
  if (!Number.isFinite(n)) return 100
  return Math.min(100, Math.max(0, n))
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
/**
 * Full house-sale waterfall: purchase fees, mortgage amortization
 * projected to the sale date, CPF principal + accrued interest refund
 * (per owner), stamp duty, cash proceeds, and true profit/loss (a
 * property-economics figure independent of financing) plus ROI on price
 * and on outlay, both point and annualized. Cash outlay at purchase is
 * derived, not asked for, as purchase price + fees − loan − CPF used.
 * Supports a two-owner joint purchase/sale, splitting outputs by
 * ownership share (or, for cash proceeds, optionally by each owner's
 * actual cash outlay).
 * @param {object} inputs - Sale inputs: propertyType, purchasePrice, purchaseDate,
 *   legalFeesAtPurchase, agentFeesAtPurchase, cpfOutlay, loanTaken, mortgageRate,
 *   loanTenure, sunkCost, salePrice, saleDate, agentCommission, legalFeesAtSale,
 *   various *Override fields, today, yourSharePct, personBCpfOutlay and its
 *   overrides, and cashProceedsSplitMode ('share' | 'outlay').
 * @returns {object} The full sale breakdown — costs, CPF refunds, true
 *   profit/loss, ROI figures, MOP eligibility, and per-owner (personA/personB) splits.
 */
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
    today = todaySGT(),
    // For a joint loan: what fraction of the property (and its loan) is
    // yours. Everything above stays a full-household calculation — BSD,
    // SSD, and mortgage amortization all need the real, whole-property
    // figures to be correct — this only scales the handful of "what does
    // this mean for ME" outputs below. `cpfOutlay` (and its overrides
    // above) is YOUR own CPF only — CPF withdrawals are tracked per
    // person, never a household total to be split by share.
    yourSharePct = 100,
    // A second owner's own CPF, entered the same way as yours — 0 by
    // default, so a solo sale or a simple-%-share joint sale (no second
    // person's CPF known/entered) behaves exactly as before. When this
    // person's own CPF is used, it counts toward the household's true
    // total CPF refund (see the personCpf() calls below) instead of
    // being silently missed the way a single cpfOutlay field would.
    personBCpfOutlay = 0,
    personBCpfPrincipalOverride = null,
    personBCpfAccruedInterestOverride = null,
    // How to split the CASH proceeds (below, after CPF has already been
    // refunded to each owner's own CPF account off the top) between the
    // two owners. 'share' (default) splits by ownership share, same as
    // every other joint figure. 'outlay' instead splits by how much cash
    // each owner actually put in at purchase — useful when the share on
    // paper doesn't match who fronted the money.
    cashProceedsSplitMode = 'share',
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
  //
  // Computed once per person (identical math, different principal/
  // overrides) and summed for the household — a second owner's own CPF
  // must count toward the true total refund, not be silently dropped the
  // way a single household-wide field would drop it.
  function personCpf(principalAtPurchase, principalOverride, interestOverride) {
    const principalAsOfComputed = principalAtPurchase
    const principalAsOf = principalOverride ?? principalAsOfComputed
    const accruedAsOfComputed = calcCPFAccruedInterest(principalAsOf, monthsPurchaseToAsOf / 12)
    const accruedAsOf = interestOverride ?? accruedAsOfComputed
    // The remaining leg compounds on top of principal + interest ALREADY
    // accrued as of today, not on bare principal again — otherwise the
    // two legs just sum linearly and understate the true compound total
    // (the cross term P·leg1·leg2 gets dropped). E.g. 10yr then 2yr more
    // at 2.5%: summing the legs separately understates accrued interest
    // by ~4% versus compounding one continuous period.
    const accruedRemaining = calcCPFAccruedInterest(principalAsOf + accruedAsOf, monthsAsOfToSale / 12)
    const accrued = accruedAsOf + accruedRemaining
    return {
      principalAtPurchase, principalComputed: principalAsOfComputed, principal: principalAsOf,
      accruedComputed: accruedAsOfComputed, accrued, totalRefund: principalAsOf + accrued,
    }
  }

  const personACpf = personCpf(Number(cpfOutlay) || 0, cpfPrincipalOverride, cpfAccruedInterestOverride)
  const personBCpf = personCpf(Number(personBCpfOutlay) || 0, personBCpfPrincipalOverride, personBCpfAccruedInterestOverride)

  const cpfPrincipalAtPurchase = personACpf.principalAtPurchase + personBCpf.principalAtPurchase
  const cpfPrincipalComputed = personACpf.principalComputed + personBCpf.principalComputed
  const cpfPrincipalTotal = personACpf.principal + personBCpf.principal
  const cpfAccruedInterestComputed = personACpf.accruedComputed + personBCpf.accruedComputed
  const cpfAccruedInterest = personACpf.accrued + personBCpf.accrued
  const totalCPFRefund = personACpf.totalRefund + personBCpf.totalRefund

  const ssdComputed = propertyType === 'private' ? calcSSD(salePrice, yearsHeld, propertyType, purchaseDate).amount : 0
  const ssd = ssdOverride ?? ssdComputed

  const sellingCosts = (Number(agentCommission) || 0) + (Number(legalFeesAtSale) || 0) + ssd

  const cashProceeds = (Number(salePrice) || 0) - outstandingBalance - sellingCosts - totalCPFRefund

  // Derived, not asked for — whatever wasn't covered by the loan or CPF
  // (either owner's) must have been cash. Can go negative if the loan +
  // CPF you entered add up to more than the price + fees, which usually
  // means one of those figures was mistyped — surfaced to the UI via
  // cashOutlayUnclear.
  const cashOutlay = (Number(purchasePrice) || 0) + purchaseFees - (Number(loanTaken) || 0) - cpfPrincipalAtPurchase
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
  // Both owners' CPF, not just yours — cashOutlay above already subtracted
  // the full household cpfPrincipalAtPurchase (both owners' CPF), so
  // adding back only your own cpfOutlay here would leave a co-owner's CPF
  // permanently missing from the denominator, understating totalOutlay
  // and inflating roiOnOutlay.
  const totalOutlay = Math.max(0, cashOutlay) + cpfPrincipalAtPurchase
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

  // Per-owner figures — most of the household numbers above scale cleanly
  // by ownership share, since they never touch CPF: trueProfitLoss,
  // outstandingBalance, and monthlyInstalment are pure property/loan
  // economics. cashOutlay (at purchase) is each owner's own real
  // contribution — their share of the joint purchase cost minus their
  // own CPF used, since that's literally how a joint purchase gets paid
  // for. cashProceeds (at sale) is different: CPF is refunded to each
  // owner's own CPF account off the top, at the household level, BEFORE
  // the remaining cash is split — so the already-net household
  // `cashProceeds` (CPF fully removed) is what actually gets divided
  // between the owners, not a per-owner "my share minus my own CPF"
  // figure (which would double-subtract CPF unevenly and leave the
  // owner who used less CPF with a disproportionate cash windfall).
  const share = resolveSharePct(yourSharePct) / 100
  const personBShare = 1 - share

  const jointPurchaseBase = (Number(purchasePrice) || 0) + purchaseFees - (Number(loanTaken) || 0) // no CPF in this slice

  function ownerFigures(ownerShare, ownerCpfOutlay) {
    const cashOutlayForOwner = jointPurchaseBase * ownerShare - ownerCpfOutlay
    return {
      cashOutlay: cashOutlayForOwner,
      cashInvested: Math.max(0, cashOutlayForOwner) + (Number(sunkCost) || 0) * ownerShare,
      trueProfitLoss: trueProfitLoss * ownerShare,
      outstandingBalance: outstandingBalance * ownerShare,
      monthlyInstalment: monthlyInstalment * ownerShare,
    }
  }

  const personAFigures = ownerFigures(share, Number(cpfOutlay) || 0)
  const personBFigures = ownerFigures(personBShare, Number(personBCpfOutlay) || 0)

  // Cash-proceeds split: by ownership share (default), or by each
  // owner's own cash outlay at purchase — falling back to share if
  // outlay data is missing/non-positive (e.g. cashOutlayUnclear).
  const outlayTotal = Math.max(0, personAFigures.cashOutlay) + Math.max(0, personBFigures.cashOutlay)
  const outlayShareA = outlayTotal > 0 ? Math.max(0, personAFigures.cashOutlay) / outlayTotal : share
  const proceedsShareA = cashProceedsSplitMode === 'outlay' ? outlayShareA : share
  const proceedsShareB = 1 - proceedsShareA

  const personA = { ...personAFigures, cashProceeds: cashProceeds * proceedsShareA }
  const personB = { ...personBFigures, cashProceeds: cashProceeds * proceedsShareB }

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
    // "your"/personA are the SAME owner — kept as two names so every
    // existing caller (FlowState/MyLedger sync, this file's own tests)
    // that already reads yourCashProceeds/yourSharePct/etc keeps working
    // unchanged, while the new two-person UI can read the same numbers
    // under person-labeled names for symmetry with personB below.
    yourSharePct: resolveSharePct(yourSharePct),
    yourCashProceeds: personA.cashProceeds, yourCashInvested: personA.cashInvested, yourTrueProfitLoss: personA.trueProfitLoss,
    yourOutstandingBalance: personA.outstandingBalance, yourMonthlyInstalment: personA.monthlyInstalment,
    personACpfOutlay: Number(cpfOutlay) || 0,
    personACpfPrincipalAtPurchase: personACpf.principalAtPurchase, personACpfPrincipalComputed: personACpf.principalComputed,
    personACpfPrincipal: personACpf.principal,
    personACpfAccruedInterestComputed: personACpf.accruedComputed, personACpfAccruedInterest: personACpf.accrued,
    personATotalCPFRefund: personACpf.totalRefund,
    personACashProceeds: personA.cashProceeds, personACashOutlay: personA.cashOutlay, personACashInvested: personA.cashInvested,
    personATrueProfitLoss: personA.trueProfitLoss, personAOutstandingBalance: personA.outstandingBalance, personAMonthlyInstalment: personA.monthlyInstalment,
    personBSharePct: resolveSharePct(100 - resolveSharePct(yourSharePct)),
    personBCpfOutlay: Number(personBCpfOutlay) || 0,
    personBCpfPrincipalAtPurchase: personBCpf.principalAtPurchase, personBCpfPrincipalComputed: personBCpf.principalComputed,
    personBCpfPrincipal: personBCpf.principal,
    personBCpfAccruedInterestComputed: personBCpf.accruedComputed, personBCpfAccruedInterest: personBCpf.accrued,
    personBTotalCPFRefund: personBCpf.totalRefund,
    personBCashProceeds: personB.cashProceeds, personBCashOutlay: personB.cashOutlay, personBCashInvested: personB.cashInvested,
    personBTrueProfitLoss: personB.trueProfitLoss, personBOutstandingBalance: personB.outstandingBalance, personBMonthlyInstalment: personB.monthlyInstalment,
    cashProceedsSplitMode: cashProceedsSplitMode === 'outlay' ? 'outlay' : 'share',
    personACashOutlaySharePct: outlayShareA * 100,
  }
}

// ─── Part B: buying the next place ──────────────────────────────────────
// Funds required is compared against funds available carried forward from
// a Part A `calcSale` result (cash proceeds + CPF refund), plus any extra
// cash/CPF you want to top up with. Cash and CPF are treated as
// interchangeable here for simplicity — in practice some costs may need
// to be cash-only depending on your CPF withdrawal limits, so treat the
// gap/surplus figure as indicative and confirm with your banker/lawyer.
/**
 * Funds-gap check for buying the next property: compares funds required
 * (downpayment + BSD + ABSD + other fees) against funds available
 * (carried forward from a Part A calcSale result's cash proceeds + CPF
 * refund, plus any extra cash/CPF top-up). Cash and CPF are treated as
 * interchangeable here for simplicity.
 * @param {object} inputs - newPrice, newLoanAmount, newLoanTenure, newMortgageRate,
 *   absd, otherFees, extraCash, extraCPF.
 * @param {?object} saleResult - The result of {@link calcSale}, or null/undefined.
 * @returns {{bsd: number, downpayment: number, fundsRequired: number, fundsAvailable: number, gap: number, surplus: boolean, newMonthlyInstalment: number}}
 *   The funds-gap breakdown.
 */
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
