// src/lib/ledger/scenario/moves.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveMove } from './moves.js'
import { calcSale, calcNextPurchase } from '../../house/calc.js'
import { calc as calcCarLoan } from '../../drive/calc.js'
import { estimateAnnualRunningCosts } from '../../drive/tco.js'

const SALE_INPUTS = {
  propertyType: 'private',
  purchasePrice: 800_000, purchaseDate: '2016-01-01',
  salePrice: 1_200_000, saleDate: '2026-01-01',
  loanTaken: 600_000, mortgageRate: 2.5, loanTenure: 25,
  cpfOutlay: 150_000,
}

const CAR = {
  id: 'sealion7', name: 'BYD Sealion 7', price: 265_388, omv: 37_500,
  coe: 'Cat B', loanCap: 60, rateTier: 'green', ves: 22_500,
}

// ─── cash <-> investments ──────────────────────────────────────────────

test('cash-to-investments moves the amount from cash into the investment lump', () => {
  const d = resolveMove({ type: 'cash-to-investments', year: 0, inputs: { amount: 150_000, direction: 'in' } })
  assert.equal(d.investmentLumpDelta, 150_000)
  assert.equal(d.cashDelta, -150_000)
})

test('cash-to-investments direction "out" reverses the flow', () => {
  const d = resolveMove({ type: 'cash-to-investments', year: 3, inputs: { amount: 40_000, direction: 'out' } })
  assert.equal(d.investmentLumpDelta, -40_000)
  assert.equal(d.cashDelta, 40_000)
})

// ─── sell a property ───────────────────────────────────────────────────

test('sell-property mirrors calcSale: proceeds to cash, CPF refund to OA, instalment freed', () => {
  const d = resolveMove({ type: 'sell-property', year: 0, inputs: SALE_INPUTS })
  const sale = calcSale(SALE_INPUTS)
  assert.equal(d.cashDelta, sale.cashProceeds)
  assert.equal(d.cpfOaDelta, sale.totalCPFRefund)
  assert.equal(d.monthlyContributionDelta, sale.monthlyInstalment)
  assert.equal(d.propertyChange.type, 'removed')
})

test('sell-property with a missing purchase date warns instead of firing full first-year SSD', () => {
  const d = resolveMove({ type: 'sell-property', year: 0, inputs: { ...SALE_INPUTS, purchaseDate: undefined } })
  assert.equal(d.warning, 'sale-inputs-incomplete')
  assert.equal(d.cashDelta, 0)
  assert.equal(d.cpfOaDelta, 0)
})

// ─── buy a property ────────────────────────────────────────────────────

test('buy-property with no same-year sell draws entirely from cash and carries the new loan', () => {
  const inputs = { newPrice: 1_500_000, newLoanAmount: 1_050_000, newLoanTenure: 25, newMortgageRate: 3, absd: 300_000, otherFees: 5_000 }
  const d = resolveMove({ type: 'buy-property', year: 0, inputs })
  const next = calcNextPurchase(inputs, { cashProceeds: 0, totalCPFRefund: 0 })
  assert.equal(d.cpfOaDelta, 0) // nothing to apply
  assert.equal(d.cashDelta, -next.fundsRequired)
  assert.equal(d.mortgageChange.principal, 1_050_000)
  assert.equal(d.monthlyContributionDelta, -next.newMonthlyInstalment)
})

test('an upgrade (sell + buy at one year) spends the CPF refund from exactly one place', () => {
  const sell = resolveMove({ type: 'sell-property', year: 5, inputs: SALE_INPUTS })
  const buyInputs = { newPrice: 1_600_000, newLoanAmount: 1_120_000, newLoanTenure: 25, newMortgageRate: 3, absd: 0, otherFees: 4_000 }
  const buy = resolveMove({ type: 'buy-property', year: 5, inputs: buyInputs }, { saleProceeds: sell.saleProceeds })
  // Net OA delta = refund credited on the sell, minus what the purchase consumed.
  const netCpfOa = sell.cpfOaDelta + buy.cpfOaDelta
  assert.ok(buy.cpfOaDelta < 0, 'the purchase consumes some CPF')
  assert.ok(netCpfOa >= 0 && netCpfOa < sell.cpfOaDelta,
    `net OA delta ${netCpfOa} is the refund minus what was spent, never the full refund again`)
})

// ─── buy / change a car ────────────────────────────────────────────────

test('buy-car cuts the contribution by instalment + running costs only (no depreciation) and debits the down payment', () => {
  const inputs = { car: CAR, salary: 12_000, down: 50_000, tenure: 7 }
  const d = resolveMove({ type: 'buy-car', year: 2, inputs })
  const loan = calcCarLoan(12_000, 50_000, 7, CAR, null, 0)
  const running = estimateAnnualRunningCosts(CAR).monthly
  assert.ok(Math.abs(d.monthlyContributionDelta - -(loan.monthly + running)) < 0.01)
  // The depreciation term must NOT be in there.
  assert.ok(Math.abs(d.monthlyContributionDelta) < (loan.monthly + running + loan.deprAtTenure.monthlyDepr) - 1,
    'depreciation is not folded into the contribution cut')
  assert.equal(d.cashDelta, -50_000)
  assert.equal(d.payoff.year, 2 + 7)
  assert.ok(Math.abs(d.payoff.monthlyContributionDelta - loan.monthly) < 0.01, 'payoff frees the instalment, not the running cost')
})

test('buy-car with a zero down payment warns and produces an all-zero delta (no free car)', () => {
  const d = resolveMove({ type: 'buy-car', year: 1, inputs: { car: CAR, salary: 12_000, down: 0, tenure: 5 } })
  assert.equal(d.warning, 'car-inputs-incomplete')
  assert.equal(d.monthlyContributionDelta, 0)
  assert.equal(d.cashDelta, 0)
  assert.equal(d.payoff, null)
})

// ─── have a child ──────────────────────────────────────────────────────

test('have-child cuts the monthly contribution and emits a dated education lump', () => {
  const d = resolveMove({ type: 'have-child', year: 4, inputs: { annualCost: 18_000, lumpAmount: 60_000, lumpYear: 21 } })
  assert.equal(d.monthlyContributionDelta, -1_500)
  assert.deepEqual(d.datedExtras, [{ year: 21, cashDelta: -60_000 }])
})

test('have-child with no lump emits no dated extras', () => {
  const d = resolveMove({ type: 'have-child', year: 4, inputs: { annualCost: 12_000 } })
  assert.equal(d.monthlyContributionDelta, -1_000)
  assert.deepEqual(d.datedExtras, [])
})

// ─── unknown ───────────────────────────────────────────────────────────

test('an unknown move type is a warned all-zero delta, not a throw', () => {
  const d = resolveMove({ type: 'teleport', year: 2, inputs: {} })
  assert.equal(d.warning, 'unknown-move-type')
  assert.equal(d.monthlyContributionDelta, 0)
})
