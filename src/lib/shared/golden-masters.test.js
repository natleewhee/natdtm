// src/lib/shared/golden-masters.test.js
// Cross-engine golden masters: computed figures checked against numbers
// an authority publishes, not against the code's own logic. Sources are
// listed in docs/statutory-sources.md. When a value here fails after a
// rate change, update the constant AND this expectation together.
//
// Per-engine tests already carry many of these (tax/calc.test.js's
// "published bracket totals", house/calc.test.js's BSD/SSD points). This
// file is the single place a reviewer can see the trust argument for the
// money math at a glance.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { taxOnChargeableIncome } from '../tax/calc.js'
import { calcBSD } from '../house/stampDuty.js'
import { monthlyCpfContribution } from '../retire/cpf.js'

const near = (a, b, tol = 0.5) => assert.ok(Math.abs(a - b) <= tol, `${a} !~= ${b}`)

// IRAS resident income tax — "gross tax payable" from the published rate
// table (YA2024 onwards). https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/tax-rates/individual-income-tax-rates
test('income tax matches IRAS published gross-tax-payable figures', () => {
  near(taxOnChargeableIncome(40_000), 550)
  near(taxOnChargeableIncome(80_000), 3_350)
  near(taxOnChargeableIncome(120_000), 7_950)
  near(taxOnChargeableIncome(160_000), 13_950)
  near(taxOnChargeableIncome(200_000), 21_150)
  near(taxOnChargeableIncome(320_000), 44_550) // 21150 + 40k@19 + 40k@19.5 + 40k@20
})

// Buyer's Stamp Duty — worked examples from IRAS's BSD page (residential,
// schedule from 15 Feb 2023). https://www.iras.gov.sg/taxes/stamp-duty/for-property/buying-or-acquiring-property/buyer's-stamp-duty-(bsd)
test('BSD matches IRAS worked examples', () => {
  near(calcBSD(1_000_000), 24_600)   // 1%*180k + 2%*180k + 3%*640k
  near(calcBSD(1_500_000), 44_600)   // + 4%*500k
  near(calcBSD(3_000_000), 119_600)  // + 5%*1.5M
})

// CPF monthly contribution, age below 55 (37% total — the band verified
// current for 2026 in docs/statutory-sources.md; the 55-60 and 60-65
// bands have open discrepancies and are deliberately not golden-mastered
// here). https://www.cpf.gov.sg/employer/employer-obligations/how-much-cpf-contributions-to-pay
test('CPF contribution, age 30, matches the 37% total and OA/SA/MA split', () => {
  const c = monthlyCpfContribution(5_000, 30)
  near(c.total, 1_850)  // 37% of 5,000
  near(c.oa, 1_150)     // 23%
  near(c.sa, 300)       // 6%
  near(c.ma, 400)       // 8%
})

test('CPF contribution is capped at the $8,000 Ordinary Wage ceiling', () => {
  const c = monthlyCpfContribution(10_000, 30)
  near(c.total, 2_960)  // 37% of 8,000, not of 10,000
})
