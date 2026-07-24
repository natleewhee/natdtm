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
// mortgage-interest cost dragging it down.
const cleanSale = calcSale({
  propertyType: 'private',
  purchasePrice: 800_000, purchaseDate: '2019-01-01', purchaseFees: 20_000,
  cashOutlay: 400_000, cpfOutlay: 400_000,
  loanTaken: 0, mortgageRate: 0, loanTenure: 0,
  sunkCost: 0,
  salePrice: 1_000_000, saleDate: '2024-01-01',
  agentCommission: 20_000, legalFeesAtSale: 3_000,
})
// trueProfitLoss = (1,000,000 - 20,000 - 3,000 - ssd) - (800,000 + 20,000)
// yearsHeld = 5 exactly -> SSD tier is >3yr -> 0
assert('Clean sale: SSD is 0 after 3+ years held', cleanSale.ssd === 0)
assert('Clean sale: true profit ≈ S$157,000', approx(cleanSale.trueProfitLoss, 157_000, 500))
assert('Clean sale: flagged as a profit', cleanSale.isProfit === true)
assert('Clean sale: CPF refund ≥ CPF principal (accrued interest added)', cleanSale.totalCPFRefund > cleanSale.cpfPrincipalTotal)
// No loan here, so cash+CPF outlay equals the full purchase price — both
// ROI lenses land on the same figure.
assert('Clean sale (no loan): ROI on price ≈ ROI on outlay', approx(cleanSale.roiOnPrice, cleanSale.roiOnOutlay, 0.001))
assert('Clean sale: ROI on price ≈ 19.6%', approx(cleanSale.roiOnPrice * 100, 19.6, 0.5))

// ─── ROI with leverage ───────────────────────────────────────────────────
// Same purchase/sale prices as the clean sale, but now only $200k of the
// $800k purchase was the buyer's own cash+CPF (the rest was a loan) — the
// same dollar profit should show a much bigger ROI on outlay than on price.
const leveragedSale = calcSale({
  propertyType: 'private',
  purchasePrice: 800_000, purchaseDate: '2019-01-01', purchaseFees: 20_000,
  cashOutlay: 100_000, cpfOutlay: 100_000,
  loanTaken: 600_000, mortgageRate: 0, loanTenure: 25,
  salePrice: 1_000_000, saleDate: '2024-01-01',
  agentCommission: 20_000, legalFeesAtSale: 3_000,
})
assert('Leveraged sale: ROI on outlay is bigger than ROI on price', leveragedSale.roiOnOutlay > leveragedSale.roiOnPrice)
assert('Leveraged sale: ROI on outlay ≈ 4x ROI on price (200k outlay vs 800k price)', approx(leveragedSale.roiOnOutlay / leveragedSale.roiOnPrice, 4, 0.1))

// Edge cases: no purchase price / no outlay should not throw or divide by zero into Infinity
const noOutlaySale = calcSale({
  propertyType: 'private', purchasePrice: 800_000, purchaseDate: '2019-01-01',
  salePrice: 1_000_000, saleDate: '2024-01-01',
})
assert('No cash/CPF outlay: ROI on outlay is null, not Infinity/NaN', noOutlaySale.roiOnOutlay === null)
assert('Purchase price present: ROI on price is still a number', typeof noOutlaySale.roiOnPrice === 'number')

// A loss scenario: bought high, sold low, with real mortgage interest cost
const lossSale = calcSale({
  propertyType: 'private',
  purchasePrice: 1_200_000, purchaseDate: '2022-01-01', purchaseFees: 30_000,
  cashOutlay: 300_000, cpfOutlay: 300_000,
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
  purchasePrice: 800_000, purchaseDate: '2019-01-01', purchaseFees: 20_000,
  cashOutlay: 400_000, cpfOutlay: 400_000,
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

// HDB MOP gate
const beforeMop = calcSale({
  propertyType: 'hdb',
  purchasePrice: 500_000, purchaseDate: '2022-01-01', purchaseFees: 5_000,
  cashOutlay: 100_000, cpfOutlay: 100_000,
  loanTaken: 300_000, mortgageRate: 2.6, loanTenure: 25,
  salePrice: 600_000, saleDate: '2024-01-01', // only 2 years held
  agentCommission: 0, legalFeesAtSale: 3_000,
})
assert('HDB sold before 5yr MOP is flagged not-ok', beforeMop.mopOk === false)
const afterMop = calcSale({
  propertyType: 'hdb',
  purchasePrice: 500_000, purchaseDate: '2018-01-01', purchaseFees: 5_000,
  cashOutlay: 100_000, cpfOutlay: 100_000,
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

// ─── yearsBetween edge cases ─────────────────────────────────────────────
assert('yearsBetween returns 0 for missing dates', yearsBetween(null, '2024-01-01') === 0)
assert('yearsBetween returns 0 when end is before start', yearsBetween('2024-01-01', '2020-01-01') === 0)
assert('yearsBetween ~5 for a 5-year span', approx(yearsBetween('2019-01-01', '2024-01-01'), 5, 0.02))

// ---------------------------------------------------------------------------
console.log(`\n${'─'.repeat(40)}`)
console.log(`Results: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
