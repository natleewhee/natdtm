/**
 * House sale/purchase calculator tests
 * Run with: node calc.test.js — no framework, just assertions.
 */

import {
  calcMonthlyInstalment, calcOutstandingBalance, calcCPFAccruedInterest,
  calcSale, calcNextPurchase, yearsBetween,
} from './calc.js'
import { calcBSD, calcSSD } from './stampDuty.js'

let passed = 0
let failed = 0

function assert(label, condition) {
  if (condition) { console.log(`  ✓ ${label}`); passed++ }
  else { console.error(`  ✗ ${label}`); failed++ }
}

function approx(a, b, tol = 1) {
  return Math.abs(a - b) <= tol
}

// ─── Amortization ────────────────────────────────────────────────────────
// $500k loan, 2.6% p.a., 25yr — instalment should land near S$2,271/mo
// (checked against a standard mortgage calculator).
const instalment = calcMonthlyInstalment(500_000, 2.6, 25)
assert('Monthly instalment for $500k/2.6%/25yr ≈ S$2,271', approx(instalment, 2271, 5))

// After the full tenure, balance should be ~0
const balanceAtEnd = calcOutstandingBalance(500_000, 2.6, 25, 25 * 12)
assert('Outstanding balance at full tenure ≈ 0', approx(balanceAtEnd, 0, 1))

// Halfway through a 0%-rate loan, exactly half the principal remains
const balanceZeroRate = calcOutstandingBalance(240_000, 0, 20, 10 * 12)
assert('0% loan halfway through ≈ half of principal', approx(balanceZeroRate, 120_000, 1))

// Balance should strictly decrease month over month
const b1 = calcOutstandingBalance(500_000, 2.6, 25, 12)
const b2 = calcOutstandingBalance(500_000, 2.6, 25, 24)
assert('Outstanding balance decreases over time', b2 < b1)

// ─── CPF accrued interest ────────────────────────────────────────────────
const accrued5yr = calcCPFAccruedInterest(100_000, 5)
// 100k * (1.025^5 - 1) ≈ 13,140.80
assert('CPF accrued interest on $100k over 5yr ≈ S$13,141', approx(accrued5yr, 13_141, 5))
assert('No accrued interest with zero principal', calcCPFAccruedInterest(0, 5) === 0)
assert('No accrued interest with zero years held', calcCPFAccruedInterest(100_000, 0) === 0)

// ─── Stamp duty ──────────────────────────────────────────────────────────
// BSD on $1,000,000: 1%*180k + 2%*180k + 3%*640k = 1800+3600+19200 = 24,600
assert('BSD on $1,000,000 ≈ S$24,600', approx(calcBSD(1_000_000), 24_600, 1))
assert('BSD is 0 for non-positive price', calcBSD(0) === 0 && calcBSD(-5) === 0)

assert('SSD is 0 for HDB regardless of holding period', calcSSD(700_000, 0.5, 'hdb').amount === 0)
assert('SSD is 12% for private sold within 1 year', calcSSD(1_000_000, 0.5, 'private').rate === 0.12)
assert('SSD is 0% for private held over 3 years', calcSSD(1_000_000, 3.5, 'private').rate === 0)

// ─── Full sale waterfall ─────────────────────────────────────────────────
// A private property bought for $800k, sold for $1,000k five years later,
// no loan (paid in full cash+CPF) — should show a clean profit with no
// mortgage-interest cost dragging it down. Purchase fees are now BSD
// (auto-computed) + legal + agent, not a self-reported lump sum, and cash
// outlay is derived rather than given directly.
const cleanSale = calcSale({
  propertyType: 'private',
  purchasePrice: 800_000, purchaseDate: '2019-01-01',
  legalFeesAtPurchase: 1_000, agentFeesAtPurchase: 400, // + auto BSD(800k)=18,600 → 20,000 total, same as the old flat fixture
  cpfOutlay: 400_000,
  loanTaken: 0, mortgageRate: 0, loanTenure: 0,
  sunkCost: 0,
  salePrice: 1_000_000, saleDate: '2024-01-01',
  agentCommission: 20_000, legalFeesAtSale: 3_000,
})
// trueProfitLoss = (1,000,000 - 20,000 - 3,000 - ssd) - (800,000 + 20,000)
// yearsHeld = 5 exactly -> SSD tier is >3yr -> 0
assert('Clean sale: SSD is 0 after 3+ years held', cleanSale.ssd === 0)
assert('Clean sale: BSD auto-computed on $800k ≈ S$18,600', approx(cleanSale.bsdAtPurchase, 18_600, 1))
assert('Clean sale: purchase fees = BSD + legal + agent ≈ S$20,000', approx(cleanSale.purchaseFees, 20_000, 1))
assert('Clean sale: true profit ≈ S$157,000', approx(cleanSale.trueProfitLoss, 157_000, 500))
assert('Clean sale: flagged as a profit', cleanSale.isProfit === true)
assert('Clean sale: CPF refund ≥ CPF principal (accrued interest added)', cleanSale.totalCPFRefund > cleanSale.cpfPrincipalTotal)
// No loan and no cash/CPF given directly — cash outlay is derived as
// whatever wasn't covered by CPF: price + fees − loan − CPF.
assert('Clean sale: cash outlay derived ≈ price + fees − CPF', approx(cleanSale.cashOutlay, 800_000 + 20_000 - 400_000, 1))
assert('Clean sale (no loan): total outlay = purchase price + purchase fees', approx(cleanSale.totalOutlay, 820_000, 1))
assert('Clean sale: ROI on price ≈ 19.6%', approx(cleanSale.roiOnPrice * 100, 19.6, 0.5))

// ─── ROI with leverage ───────────────────────────────────────────────────
// Same purchase/sale prices and fees as the clean sale, but now $600k of
// the $800k purchase was a loan instead of cash+CPF — the same dollar
// profit should show a much bigger ROI on outlay than on price, since it's
// spread over a much smaller base of the buyer's own money.
const leveragedSale = calcSale({
  propertyType: 'private',
  purchasePrice: 800_000, purchaseDate: '2019-01-01',
  legalFeesAtPurchase: 1_000, agentFeesAtPurchase: 400,
  cpfOutlay: 100_000,
  loanTaken: 600_000, mortgageRate: 0, loanTenure: 25,
  salePrice: 1_000_000, saleDate: '2024-01-01',
  agentCommission: 20_000, legalFeesAtSale: 3_000,
})
assert('Leveraged sale: cash outlay derived ≈ price + fees − loan − CPF', approx(leveragedSale.cashOutlay, 800_000 + 20_000 - 600_000 - 100_000, 1))
assert('Leveraged sale: ROI on outlay is bigger than ROI on price', leveragedSale.roiOnOutlay > leveragedSale.roiOnPrice)
// Structural check independent of the exact fee numbers: the ratio between
// the two ROI figures is exactly the ratio between their two bases.
assert(
  'Leveraged sale: ROI ratio matches the inverse of the outlay/price ratio',
  approx(leveragedSale.roiOnOutlay / leveragedSale.roiOnPrice, leveragedSale.purchasePrice / leveragedSale.totalOutlay, 0.01),
)

// Edge cases: no purchase price → both ROI figures null, not NaN/Infinity.
const zeroPriceSale = calcSale({
  propertyType: 'private', purchaseDate: '2019-01-01',
  salePrice: 1_000_000, saleDate: '2024-01-01',
})
assert('No purchase price: ROI on price is null', zeroPriceSale.roiOnPrice === null)
assert('No purchase price: ROI on outlay is null (no fees, no loan/CPF → zero outlay)', zeroPriceSale.roiOnOutlay === null)

// If a purchase price is given but no loan/CPF, the full price + BSD is
// assumed to have come from cash — nothing else could explain it.
const allCashImplied = calcSale({
  propertyType: 'private', purchasePrice: 800_000, purchaseDate: '2019-01-01',
  salePrice: 1_000_000, saleDate: '2024-01-01',
})
assert('No loan/CPF given: cash outlay assumed to cover price + auto BSD', approx(allCashImplied.cashOutlay, 800_000 + 18_600, 1))
assert('cashOutlayUnclear is false for a sensible scenario', allCashImplied.cashOutlayUnclear === false)

// If loan + CPF entered add up to MORE than price + fees, the derived cash
// outlay goes negative — a signal the inputs don't add up, not a crash.
const impossibleSale = calcSale({
  propertyType: 'private', purchasePrice: 500_000, purchaseDate: '2019-01-01',
  loanTaken: 400_000, cpfOutlay: 200_000, // 600k > 500k price
  salePrice: 600_000, saleDate: '2024-01-01',
})
assert('Loan + CPF exceeding price + fees flags cashOutlayUnclear', impossibleSale.cashOutlayUnclear === true)
assert('cashInvested floors at 0 rather than going negative', impossibleSale.cashInvested === 0)

// A loss scenario: bought high, sold low, with real mortgage interest cost
const lossSale = calcSale({
  propertyType: 'private',
  purchasePrice: 1_200_000, purchaseDate: '2022-01-01',
  legalFeesAtPurchase: 2_000, agentFeesAtPurchase: 1_000,
  cpfOutlay: 300_000,
  loanTaken: 900_000, mortgageRate: 3.5, loanTenure: 25,
  sunkCost: 50_000,
  salePrice: 1_100_000, saleDate: '2024-01-01',
  agentCommission: 22_000, legalFeesAtSale: 3_000,
})
assert('Loss sale: flagged as a loss', lossSale.isProfit === false)
assert('Loss sale: true profit is negative', lossSale.trueProfitLoss < 0)
assert('Loss sale: SSD applies (sold within 2-3yr band)', lossSale.ssd > 0)
assert('Loss sale: outstanding balance is less than loan taken', lossSale.outstandingBalance < 900_000)

// Overrides win over computed defaults
const overridden = calcSale({
  propertyType: 'private',
  purchasePrice: 800_000, purchaseDate: '2019-01-01',
  legalFeesAtPurchase: 1_000, agentFeesAtPurchase: 400,
  cpfOutlay: 400_000,
  loanTaken: 400_000, mortgageRate: 2.6, loanTenure: 25,
  salePrice: 1_000_000, saleDate: '2024-01-01',
  agentCommission: 20_000, legalFeesAtSale: 3_000,
  outstandingBalanceOverride: 350_000,
  cpfAccruedInterestOverride: 12_345,
  ssdOverride: 0,
})
assert('Outstanding balance override is respected', overridden.outstandingBalance === 350_000)
assert('CPF accrued interest override is respected', overridden.cpfAccruedInterest === 12_345)
assert('SSD override is respected', overridden.ssd === 0)

// CPF principal-to-refund override — decoupled from CPF used at purchase,
// for anyone servicing their monthly instalment via CPF OA so their
// refundable principal grows beyond what they put in at purchase.
const cpfServiced = calcSale({
  propertyType: 'private',
  purchasePrice: 480_000, purchaseDate: '2021-08-31',
  legalFeesAtPurchase: 3_000, agentFeesAtPurchase: 4_800,
  cpfOutlay: 130_000,
  loanTaken: 365_000, mortgageRate: 1.4, loanTenure: 30,
  salePrice: 700_000, saleDate: '2026-01-09',
  agentCommission: 14_000, legalFeesAtSale: 0,
  outstandingBalanceOverride: 293_000,
  cpfPrincipalOverride: 219_400,
  cpfAccruedInterestOverride: 22_400,
})
assert('cpfPrincipalAtPurchase reflects CPF used at purchase, unaffected by the refund override', cpfServiced.cpfPrincipalAtPurchase === 130_000)
assert('cpfPrincipalTotal (refund) uses the override, not CPF used at purchase', cpfServiced.cpfPrincipalTotal === 219_400)
assert('totalCPFRefund = overridden principal + overridden accrued interest', cpfServiced.totalCPFRefund === 219_400 + 22_400)
assert('cashOutlay still derives from CPF used at purchase, not the refund override', cpfServiced.cashOutlay === 480_000 + cpfServiced.purchaseFees - 365_000 - 130_000)
assert('totalOutlay (for ROI) still uses CPF used at purchase, not the refund override', cpfServiced.totalOutlay === Math.max(0, cpfServiced.cashOutlay) + 130_000)

// Without the override, cpfPrincipalTotal falls back to CPF used at purchase (old behavior)
const cpfNoOverride = calcSale({
  propertyType: 'private',
  purchasePrice: 480_000, purchaseDate: '2021-08-31',
  cpfOutlay: 130_000,
  loanTaken: 365_000, mortgageRate: 1.4, loanTenure: 30,
  salePrice: 700_000, saleDate: '2026-01-09',
})
assert('cpfPrincipalTotal defaults to cpfPrincipalAtPurchase when no override given', cpfNoOverride.cpfPrincipalTotal === cpfNoOverride.cpfPrincipalAtPurchase)

// Total-interest-paid override — a lump-sum prepayment (reflected via the
// outstanding-balance override) drags the computed interest figure toward
// zero, since the formula assumes all principal came from the modeled
// monthly instalment; the override lets the real figure win instead.
const lumpSumPrepaid = calcSale({
  propertyType: 'private',
  purchasePrice: 480_000, purchaseDate: '2021-08-31',
  cpfOutlay: 130_000,
  loanTaken: 365_000, mortgageRate: 1.4, loanTenure: 30,
  salePrice: 700_000, saleDate: '2026-01-09',
  outstandingBalanceOverride: 293_000, // well below the ~321k pure-amortization estimate
})
assert('A real balance far below the amortization schedule crushes computed interest paid toward 0', lumpSumPrepaid.totalInterestPaidComputed < 1000)
const lumpSumWithOverride = calcSale({
  propertyType: 'private',
  purchasePrice: 480_000, purchaseDate: '2021-08-31',
  cpfOutlay: 130_000,
  loanTaken: 365_000, mortgageRate: 1.4, loanTenure: 30,
  salePrice: 700_000, saleDate: '2026-01-09',
  outstandingBalanceOverride: 293_000,
  totalInterestPaidOverride: 15_600,
})
assert('Total-interest-paid override is respected', lumpSumWithOverride.totalInterestPaid === 15_600)
assert('Overriding interest paid changes trueCostBasis and true profit/loss', lumpSumWithOverride.trueProfitLoss !== lumpSumPrepaid.trueProfitLoss)

// Annualized ROI — should equal the CAGR identity, and be smaller in
// magnitude than the raw total ROI whenever held for more than a year.
const multiYearSale = calcSale({
  propertyType: 'private',
  purchasePrice: 500_000, purchaseDate: '2020-01-01',
  loanTaken: 350_000, mortgageRate: 2.0, loanTenure: 25,
  cpfOutlay: 100_000,
  salePrice: 700_000, saleDate: '2024-01-01', // 4 years held, clean profit
})
assert('annualizedRoiOnPrice matches the CAGR identity', approx(
  Math.pow(1 + multiYearSale.annualizedRoiOnPrice, multiYearSale.yearsHeld) - 1,
  multiYearSale.roiOnPrice, 0.001,
))
assert('annualizedRoiOnOutlay matches the CAGR identity', approx(
  Math.pow(1 + multiYearSale.annualizedRoiOnOutlay, multiYearSale.yearsHeld) - 1,
  multiYearSale.roiOnOutlay, 0.001,
))
assert('Annualized ROI is smaller than total ROI when held > 1 year and profitable', multiYearSale.annualizedRoiOnPrice < multiYearSale.roiOnPrice)
assert('annualizedRoiOnPrice is null when there is no purchase price', calcSale({ propertyType: 'private', salePrice: 100 }).annualizedRoiOnPrice === null)

// ─── Forward projection when the sale date is in the future ────────────
// Overrides are anchored at "today" (or the sale date, if it's already
// happened), not at some hypothetical future point you can't look up.
// When selling later than today, the calculator projects forward from
// your real today's-numbers to the sale date instead of reconstructing
// the whole purchase-to-sale history synthetically.
const projPurchaseDate = '2020-01-01'
const projToday = '2024-01-01'    // 4 years after purchase
const projSaleDate = '2026-01-01' // 2 years after "today" — a planned future sale
const projLoanTaken = 400_000, projRate = 2.0, projTenure = 25
const projOutstandingAsOf = 350_000 // real bank figure, checked today
const projCpfPrincipalAsOf = 200_000 // real CPF portal figure, checked today
const projCpfInterestAsOf = 15_000 // real CPF portal figure, checked today
const projInterestPaidAsOf = 50_000 // real bank interest statement, as of today

const projected = calcSale({
  propertyType: 'private',
  purchasePrice: 600_000, purchaseDate: projPurchaseDate,
  loanTaken: projLoanTaken, mortgageRate: projRate, loanTenure: projTenure,
  cpfOutlay: 150_000,
  salePrice: 750_000, saleDate: projSaleDate,
  outstandingBalanceOverride: projOutstandingAsOf,
  cpfPrincipalOverride: projCpfPrincipalAsOf,
  cpfAccruedInterestOverride: projCpfInterestAsOf,
  totalInterestPaidOverride: projInterestPaidAsOf,
  today: projToday,
})

assert('Future sale is detected as such', projected.saleIsInFuture === true)
assert('asOfDate is today, not the future sale date', projected.asOfDate === projToday)

const projMonthlyInstalment = calcMonthlyInstalment(projLoanTaken, projRate, projTenure)
const projRemainingTenure = projTenure - yearsBetween(projPurchaseDate, projToday)
const projMonthsAsOfToSale = yearsBetween(projToday, projSaleDate) * 12
const expectedBalanceAtSale = calcOutstandingBalance(projOutstandingAsOf, projRate, projRemainingTenure, projMonthsAsOfToSale)

assert('Outstanding balance at sale is projected forward from the as-of-today override, not used as-is', approx(projected.outstandingBalance, expectedBalanceAtSale, 1))
assert('Projected balance at a future sale is lower than the as-of-today figure (still amortizing)', projected.outstandingBalance < projOutstandingAsOf)

const expectedPrincipalRepaidRemaining = Math.max(0, projOutstandingAsOf - expectedBalanceAtSale)
const expectedInterestRemaining = Math.max(0, projMonthlyInstalment * projMonthsAsOfToSale - expectedPrincipalRepaidRemaining)
assert('Total interest paid = as-of-today override + projected remaining interest', approx(projected.totalInterestPaid, projInterestPaidAsOf + expectedInterestRemaining, 1))
assert('Total interest paid at a future sale exceeds the as-of-today figure', projected.totalInterestPaid > projInterestPaidAsOf)

// The remaining leg compounds on (principal + interest already accrued as
// of today), not on bare principal again — a true single continuous
// compounding period split into two legs, not two independent legs summed.
const expectedCpfInterestRemaining = calcCPFAccruedInterest(projCpfPrincipalAsOf + projCpfInterestAsOf, projMonthsAsOfToSale / 12)
assert('CPF accrued interest = as-of-today override + projected remaining compounding (on top of interest already accrued)', approx(projected.cpfAccruedInterest, projCpfInterestAsOf + expectedCpfInterestRemaining, 1))
// Confirms the fix actually changed behavior: strictly greater than the
// old (understating) additive-legs formula would have given.
const oldBuggyFormula = projCpfInterestAsOf + calcCPFAccruedInterest(projCpfPrincipalAsOf, projMonthsAsOfToSale / 12)
assert('Fixed compounding gives a higher (correct) figure than the old additive-legs formula', projected.cpfAccruedInterest > oldBuggyFormula)
assert('CPF principal stays flat from today to a future sale (no further top-ups modeled)', projected.cpfPrincipalTotal === projCpfPrincipalAsOf)

// If the sale date is today (or in the past), overrides apply directly —
// no forward projection, "as of" collapses to the sale date itself.
const sellingNow = calcSale({
  propertyType: 'private',
  purchasePrice: 600_000, purchaseDate: projPurchaseDate,
  loanTaken: projLoanTaken, mortgageRate: projRate, loanTenure: projTenure,
  cpfOutlay: 150_000,
  salePrice: 750_000, saleDate: projToday,
  outstandingBalanceOverride: projOutstandingAsOf,
  cpfPrincipalOverride: projCpfPrincipalAsOf,
  cpfAccruedInterestOverride: projCpfInterestAsOf,
  totalInterestPaidOverride: projInterestPaidAsOf,
  today: projToday,
})
assert('Selling on/before today is not treated as a future sale', sellingNow.saleIsInFuture === false)
assert('No projection: outstanding balance equals the as-of override exactly', sellingNow.outstandingBalance === projOutstandingAsOf)
assert('No projection: total interest paid equals the as-of override exactly', sellingNow.totalInterestPaid === projInterestPaidAsOf)
assert('No projection: CPF accrued interest equals the as-of override exactly', sellingNow.cpfAccruedInterest === projCpfInterestAsOf)

// Without any overrides, a future sale still resolves to the same number
// as computing the full purchase-to-sale span in one shot — the
// two-stage split shouldn't change the *unoverridden* estimate, only
// enable a better one when real as-of-today numbers are supplied.
const projNoOverride = calcSale({
  propertyType: 'private',
  purchasePrice: 600_000, purchaseDate: projPurchaseDate,
  loanTaken: projLoanTaken, mortgageRate: projRate, loanTenure: projTenure,
  cpfOutlay: 150_000,
  salePrice: 750_000, saleDate: projSaleDate,
  today: projToday,
})
const directFullSpan = calcOutstandingBalance(projLoanTaken, projRate, projTenure, yearsBetween(projPurchaseDate, projSaleDate) * 12)
assert('Unoverridden two-stage balance matches a direct full-span computation', approx(projNoOverride.outstandingBalance, directFullSpan, 1))

// HDB MOP gate
const beforeMop = calcSale({
  propertyType: 'hdb',
  purchasePrice: 500_000, purchaseDate: '2022-01-01', legalFeesAtPurchase: 500,
  cpfOutlay: 100_000,
  loanTaken: 300_000, mortgageRate: 2.6, loanTenure: 25,
  salePrice: 600_000, saleDate: '2024-01-01', // only 2 years held
  agentCommission: 0, legalFeesAtSale: 3_000,
})
assert('HDB sold before 5yr MOP is flagged not-ok', beforeMop.mopOk === false)
const afterMop = calcSale({
  propertyType: 'hdb',
  purchasePrice: 500_000, purchaseDate: '2018-01-01', legalFeesAtPurchase: 500,
  cpfOutlay: 100_000,
  loanTaken: 300_000, mortgageRate: 2.6, loanTenure: 25,
  salePrice: 600_000, saleDate: '2024-01-01', // 6 years held
  agentCommission: 0, legalFeesAtSale: 3_000,
})
assert('HDB sold after 5yr MOP is flagged ok', afterMop.mopOk === true)

// ─── Next-purchase gap check ─────────────────────────────────────────────
const gapCheck = calcNextPurchase(
  { newPrice: 1_500_000, newLoanAmount: 900_000, newLoanTenure: 25, newMortgageRate: 2.8, absd: 0, otherFees: 5_000 },
  { cashProceeds: 200_000, totalCPFRefund: 150_000 },
)
// downpayment = 600k, bsd on 1.5m = 1%*180k+2%*180k+3%*640k+4%*(1.5m-1m) = 1800+3600+19200+20000=44,600
assert('Next purchase: BSD on $1.5m ≈ S$44,600', approx(gapCheck.bsd, 44_600, 1))
assert('Next purchase: funds required = downpayment + bsd + fees', approx(gapCheck.fundsRequired, 600_000 + 44_600 + 5_000, 1))
assert('Next purchase: funds available = cash + CPF carried forward', gapCheck.fundsAvailable === 350_000)
assert('Next purchase: gap is positive (shortfall) when required > available', gapCheck.gap > 0)
assert('Next purchase: not marked surplus when there is a shortfall', gapCheck.surplus === false)

const surplusCheck = calcNextPurchase(
  { newPrice: 500_000, newLoanAmount: 400_000, newLoanTenure: 25, newMortgageRate: 2.8, absd: 0, otherFees: 2_000 },
  { cashProceeds: 200_000, totalCPFRefund: 150_000 },
)
assert('Next purchase: surplus flagged when available > required', surplusCheck.surplus === true)

// ─── Joint loan share ─────────────────────────────────────────────────────
const soloShare = calcSale({
  propertyType: 'private',
  purchasePrice: 900_000, purchaseDate: '2018-01-15',
  cpfOutlay: 150_000, loanTaken: 650_000, mortgageRate: 2.6, loanTenure: 25,
  salePrice: 1_300_000, saleDate: '2026-06-01',
})
const jointShare = calcSale({
  propertyType: 'private',
  purchasePrice: 900_000, purchaseDate: '2018-01-15',
  cpfOutlay: 150_000, loanTaken: 650_000, mortgageRate: 2.6, loanTenure: 25,
  salePrice: 1_300_000, saleDate: '2026-06-01',
  yourSharePct: 50,
})
assert('Default yourSharePct is 100', soloShare.yourSharePct === 100)
assert('yourCashProceeds at 100% share equals cashProceeds', approx(soloShare.yourCashProceeds, soloShare.cashProceeds, 0.01))
assert('yourCashInvested at 100% share equals cashInvested', approx(soloShare.yourCashInvested, soloShare.cashInvested, 0.01))
assert('yourSharePct is recorded', jointShare.yourSharePct === 50)
// cashProceeds/cashInvested are MIXED figures (joint components minus an
// already-personal, unscaled CPF component) — halving them naively would
// double-discount your own CPF. The correct 50% figure is: half of the
// joint-only slice, minus the FULL (unscaled) CPF refund/outlay.
const expectedYourCashProceeds = 0.5 * (jointShare.salePrice - jointShare.outstandingBalance - jointShare.sellingCosts) - jointShare.totalCPFRefund
const expectedYourCashOutlay = 0.5 * (jointShare.purchasePrice + jointShare.purchaseFees - jointShare.loanTaken) - jointShare.cpfOutlay
const expectedYourCashInvested = Math.max(0, expectedYourCashOutlay) + 0.5 * jointShare.sunkCost
assert('yourCashProceeds at 50% share correctly avoids double-discounting CPF', approx(jointShare.yourCashProceeds, expectedYourCashProceeds, 0.01))
assert('yourCashInvested at 50% share correctly avoids double-discounting CPF', approx(jointShare.yourCashInvested, expectedYourCashInvested, 0.01))
assert('yourCashProceeds at 50% share is NOT simply half of household cashProceeds (that would double-discount CPF)', !approx(jointShare.yourCashProceeds, jointShare.cashProceeds / 2, 1))
assert('yourTrueProfitLoss at 50% share is half of household trueProfitLoss (no CPF involved)', approx(jointShare.yourTrueProfitLoss, jointShare.trueProfitLoss / 2, 0.01))
assert('yourOutstandingBalance at 50% share is half of household outstandingBalance', approx(jointShare.yourOutstandingBalance, jointShare.outstandingBalance / 2, 0.01))
assert('yourMonthlyInstalment at 50% share is half of household monthlyInstalment', approx(jointShare.yourMonthlyInstalment, jointShare.monthlyInstalment / 2, 0.01))

// ─── Joint loan share edge cases ─────────────────────────────────────────
const zeroShareInputs = {
  propertyType: 'private',
  purchasePrice: 900_000, purchaseDate: '2018-01-15',
  cpfOutlay: 150_000, loanTaken: 650_000, mortgageRate: 2.6, loanTenure: 25,
  salePrice: 1_300_000, saleDate: '2026-06-01',
}
const zeroShare = calcSale({ ...zeroShareInputs, yourSharePct: 0 })
assert('yourSharePct of exactly 0 is NOT coerced to 100 (falsy-coercion trap)', zeroShare.yourSharePct === 0)
assert('yourTrueProfitLoss at 0% share is 0', approx(zeroShare.yourTrueProfitLoss, 0, 0.01))
assert('yourOutstandingBalance at 0% share is 0', approx(zeroShare.yourOutstandingBalance, 0, 0.01))
assert('yourCashProceeds at 0% share is -totalCPFRefund (none of the joint proceeds, but still your own CPF)', approx(zeroShare.yourCashProceeds, -zeroShare.totalCPFRefund, 0.01))

const overShare = calcSale({ ...zeroShareInputs, yourSharePct: 150 })
assert('yourSharePct above 100 is clamped to 100', overShare.yourSharePct === 100)
assert('Clamped 150% share behaves identically to 100% share', approx(overShare.yourTrueProfitLoss, soloShare.trueProfitLoss, 0.01))

const negativeShare = calcSale({ ...zeroShareInputs, yourSharePct: -20 })
assert('Negative yourSharePct is clamped to 0', negativeShare.yourSharePct === 0)
assert('Household (unscaled) figures are identical regardless of share', approx(soloShare.cashProceeds, jointShare.cashProceeds, 0.01))
assert('totalCPFRefund is NOT scaled by share — CPF withdrawals are already personal', approx(soloShare.totalCPFRefund, jointShare.totalCPFRefund, 0.01))
assert('cashOnCashReturn ratio is unaffected by share (both terms scale together)', approx(soloShare.cashOnCashReturn, jointShare.cashOnCashReturn, 0.0001))

// ─── yearsBetween edge cases ─────────────────────────────────────────────
assert('yearsBetween returns 0 for missing dates', yearsBetween(null, '2024-01-01') === 0)
assert('yearsBetween returns 0 when end is before start', yearsBetween('2024-01-01', '2020-01-01') === 0)
assert('yearsBetween ~5 for a 5-year span', approx(yearsBetween('2019-01-01', '2024-01-01'), 5, 0.02))

// ---------------------------------------------------------------------------
console.log(`\n${'─'.repeat(40)}`)
console.log(`Results: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
