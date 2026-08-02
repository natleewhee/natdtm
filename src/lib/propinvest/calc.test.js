// src/lib/propinvest/calc.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  calcAnnualPropertyTaxNonOwnerOccupied, calcInvestmentProperty, calcBSD, calcMonthlyInstalment,
} from './calc.js'

function approx(a, b, eps = 0.5) {
  assert.ok(Math.abs(a - b) <= eps, `expected ${a} ≈ ${b}`)
}

test('calcAnnualPropertyTaxNonOwnerOccupied: matches the tiered schedule for a mid-range AV', () => {
  // AV = 40,000: first 30,000 @ 12% + next 10,000 @ 20%
  const tax = calcAnnualPropertyTaxNonOwnerOccupied(40_000)
  approx(tax, 30_000 * 0.12 + 10_000 * 0.20)
})

test('calcAnnualPropertyTaxNonOwnerOccupied: zero or negative AV owes zero', () => {
  assert.equal(calcAnnualPropertyTaxNonOwnerOccupied(0), 0)
  assert.equal(calcAnnualPropertyTaxNonOwnerOccupied(-5000), 0)
})

test('calcAnnualPropertyTaxNonOwnerOccupied: taxes the excess above 60,000 at the top 36% rate', () => {
  const tax = calcAnnualPropertyTaxNonOwnerOccupied(80_000)
  const expected = 30_000 * 0.12 + 15_000 * 0.20 + 15_000 * 0.28 + 20_000 * 0.36
  approx(tax, expected)
})

test('calcInvestmentProperty: reuses HouseMuch\'s own calcBSD/calcMonthlyInstalment, not a reimplementation', () => {
  const price = 1_000_000
  const result = calcInvestmentProperty({ price, downpaymentPct: 25, rate: 3, tenureYears: 25 })
  approx(result.bsd, calcBSD(price))
  const loanAmount = price * 0.75
  approx(result.monthlyInstalment, calcMonthlyInstalment(loanAmount, 3, 25))
})

test('calcInvestmentProperty: upfrontCost sums downpayment + BSD + ABSD + other fees', () => {
  const result = calcInvestmentProperty({ price: 1_000_000, downpaymentPct: 25, rate: 3, tenureYears: 25, absd: 200_000, otherFees: 5_000 })
  approx(result.upfrontCost, result.downpayment + result.bsd + 200_000 + 5_000)
})

test('calcInvestmentProperty: vacancy assumption reduces effective monthly rent proportionally', () => {
  const noVacancy = calcInvestmentProperty({ price: 1_000_000, monthlyRent: 3000, vacancyMonthsPerYear: 0, agentCommissionMonths: 0 })
  const oneMonthVacancy = calcInvestmentProperty({ price: 1_000_000, monthlyRent: 3000, vacancyMonthsPerYear: 1, agentCommissionMonths: 0 })
  approx(noVacancy.effectiveMonthlyRent, 3000)
  approx(oneMonthVacancy.effectiveMonthlyRent, 3000 * 11 / 12)
})

test('calcInvestmentProperty: grossRentalYieldPct ignores vacancy/costs, netRentalYieldPct does not', () => {
  const result = calcInvestmentProperty({
    price: 1_000_000, monthlyRent: 3000, annualValue: 36000, maintenanceMonthly: 200,
    vacancyMonthsPerYear: 1, agentCommissionMonths: 0.5,
  })
  approx(result.grossRentalYieldPct, (3000 * 12 / 1_000_000) * 100)
  assert.ok(result.netRentalYieldPct < result.grossRentalYieldPct, 'net yield must be lower once costs/vacancy are counted')
})

test('calcInvestmentProperty: cashFlowPositive flag matches the sign of monthlyCashFlow', () => {
  const positive = calcInvestmentProperty({ price: 500_000, downpaymentPct: 50, rate: 2, tenureYears: 25, monthlyRent: 5000 })
  const negative = calcInvestmentProperty({ price: 2_000_000, downpaymentPct: 20, rate: 4, tenureYears: 25, monthlyRent: 1000 })
  assert.equal(positive.cashFlowPositive, positive.monthlyCashFlow >= 0)
  assert.equal(negative.cashFlowPositive, negative.monthlyCashFlow >= 0)
  assert.ok(positive.monthlyCashFlow > 0)
  assert.ok(negative.monthlyCashFlow < 0)
})

test('calcInvestmentProperty: at breakEvenMonthlyRent (with zero vacancy/commission), cash flow is exactly zero', () => {
  const base = calcInvestmentProperty({
    price: 1_000_000, downpaymentPct: 25, rate: 3, tenureYears: 25,
    annualValue: 36000, maintenanceMonthly: 250, agentCommissionMonths: 0, vacancyMonthsPerYear: 0,
  })
  const atBreakEven = calcInvestmentProperty({
    price: 1_000_000, downpaymentPct: 25, rate: 3, tenureYears: 25,
    annualValue: 36000, maintenanceMonthly: 250, agentCommissionMonths: 0, vacancyMonthsPerYear: 0,
    monthlyRent: base.breakEvenMonthlyRent,
  })
  approx(atBreakEven.monthlyCashFlow, 0)
})

test('calcInvestmentProperty: downpaymentPct clamps into [0,100]', () => {
  const over = calcInvestmentProperty({ price: 1_000_000, downpaymentPct: 150 })
  const under = calcInvestmentProperty({ price: 1_000_000, downpaymentPct: -20 })
  approx(over.downpayment, 1_000_000)
  approx(under.downpayment, 0)
})
