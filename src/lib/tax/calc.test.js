// src/lib/tax/calc.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  taxOnChargeableIncome, marginalRate, earnedIncomeRelief,
  cpfEmployeeRateForAge, monthlyEmployeeCpf, annualEmployeeCpf,
  totalReliefs, reliefValue, calcTax,
  PERSONAL_RELIEF_CAP, SRS_CAP_CITIZEN_PR, SRS_CAP_FOREIGNER, RSTU_RELIEF_CAP_SELF,
} from './calc.js'
import { CPF_OW_CEILING } from '../retire/cpf.js'

function approx(a, b, eps = 0.01) {
  assert.ok(Math.abs(a - b) <= eps, `expected ${a} ≈ ${b}`)
}

// ─── Progressive tax ─────────────────────────────────────────────────────
// Cumulative figures below are the published IRAS bracket totals.

test('taxOnChargeableIncome is zero up to the $20k threshold', () => {
  approx(taxOnChargeableIncome(0), 0)
  approx(taxOnChargeableIncome(20_000), 0)
})

test('taxOnChargeableIncome matches published bracket totals', () => {
  approx(taxOnChargeableIncome(30_000), 200)      // 20k@0 + 10k@2%
  approx(taxOnChargeableIncome(40_000), 550)      // +10k@3.5%
  approx(taxOnChargeableIncome(80_000), 3_350)    // +40k@7%
  approx(taxOnChargeableIncome(120_000), 7_950)   // +40k@11.5%
  approx(taxOnChargeableIncome(160_000), 13_950)  // +40k@15%
  approx(taxOnChargeableIncome(200_000), 21_150)  // +40k@18%
  approx(taxOnChargeableIncome(240_000), 28_750)  // +40k@19%
  approx(taxOnChargeableIncome(280_000), 36_550)  // +40k@19.5%
  approx(taxOnChargeableIncome(320_000), 44_550)  // +40k@20%
  approx(taxOnChargeableIncome(500_000), 84_150)  // +180k@22%
  approx(taxOnChargeableIncome(1_000_000), 199_150) // +500k@23%
})

test('taxOnChargeableIncome taxes above $1m at the top rate', () => {
  approx(taxOnChargeableIncome(1_100_000), 199_150 + 100_000 * 0.24)
})

test('taxOnChargeableIncome interpolates within a band', () => {
  // $100k sits mid-way through the 11.5% band that starts at $80k.
  approx(taxOnChargeableIncome(100_000), 3_350 + 20_000 * 0.115)
})

test('marginalRate returns the rate on the next dollar', () => {
  assert.equal(marginalRate(15_000), 0)
  assert.equal(marginalRate(35_000), 0.035)
  assert.equal(marginalRate(100_000), 0.115)
  assert.equal(marginalRate(2_000_000), 0.24)
})

test('marginalRate at exactly a band boundary returns the rate on the band ABOVE, not the one that dollar was taxed in', () => {
  // At chargeableIncome === 20,000, that whole $20,000 is taxed at 0% —
  // but the next dollar earned (20,001) is taxed at 2%, so that's what
  // marginalRate must report.
  assert.equal(marginalRate(20_000), 0.02)
  assert.equal(marginalRate(30_000), 0.035)
  assert.equal(marginalRate(80_000), 0.115)
  assert.equal(marginalRate(320_000), 0.22)
})

// ─── Reliefs ─────────────────────────────────────────────────────────────

test('earnedIncomeRelief scales with age', () => {
  assert.equal(earnedIncomeRelief(30), 1_000)
  assert.equal(earnedIncomeRelief(54), 1_000)
  assert.equal(earnedIncomeRelief(55), 6_000)
  assert.equal(earnedIncomeRelief(59), 6_000)
  assert.equal(earnedIncomeRelief(60), 8_000)
  assert.equal(earnedIncomeRelief(70), 8_000)
})

test('cpfEmployeeRateForAge steps down through the age bands', () => {
  assert.equal(cpfEmployeeRateForAge(30), 0.20)
  assert.equal(cpfEmployeeRateForAge(58), 0.17)
  assert.equal(cpfEmployeeRateForAge(63), 0.115)
  assert.equal(cpfEmployeeRateForAge(68), 0.075)
  assert.equal(cpfEmployeeRateForAge(75), 0.05)
})

test('cpfEmployeeRateForAge has no gap at fractional ages on any boundary (age field is free-text and accepts e.g. "55.5")', () => {
  assert.equal(cpfEmployeeRateForAge(55), 0.20, 'exactly 55 stays in the below-55 band')
  assert.equal(cpfEmployeeRateForAge(55.5), 0.17, '55.5 must not fall through to the 71+ band')
  assert.equal(cpfEmployeeRateForAge(60), 0.17)
  assert.equal(cpfEmployeeRateForAge(60.5), 0.115, '60.5 must not fall through to the 71+ band')
  assert.equal(cpfEmployeeRateForAge(65), 0.115)
  assert.equal(cpfEmployeeRateForAge(65.5), 0.075, '65.5 must not fall through to the 71+ band')
  assert.equal(cpfEmployeeRateForAge(70), 0.075)
  assert.equal(cpfEmployeeRateForAge(70.5), 0.05)
})

test('monthlyEmployeeCpf caps at the Ordinary Wage ceiling', () => {
  approx(monthlyEmployeeCpf(5_000, 30), 1_000)
  approx(monthlyEmployeeCpf(20_000, 30), CPF_OW_CEILING * 0.20)
})

test('annualEmployeeCpf respects the annual wage ceiling for bonus', () => {
  // Salary alone at the OW ceiling uses 96k of the 102k annual ceiling,
  // leaving only 6k of bonus CPF-able.
  const cpf = annualEmployeeCpf(CPF_OW_CEILING, 50_000, 30)
  approx(cpf, (96_000 + 6_000) * 0.20)
})

test('annualEmployeeCpf includes a fully CPF-able bonus for lower salaries', () => {
  const cpf = annualEmployeeCpf(3_000, 6_000, 30)
  approx(cpf, (36_000 + 6_000) * 0.20)
})

test('totalReliefs caps SRS at the citizen/PR limit', () => {
  const r = totalReliefs({ age: 40, monthlySalary: 0, srsContribution: 99_999 })
  assert.equal(r.breakdown.srs, SRS_CAP_CITIZEN_PR)
  assert.equal(r.srsCap, SRS_CAP_CITIZEN_PR)
})

test('totalReliefs uses the higher SRS cap for foreigners', () => {
  const r = totalReliefs({ age: 40, monthlySalary: 0, srsContribution: 99_999, isForeigner: true })
  assert.equal(r.breakdown.srs, SRS_CAP_FOREIGNER)
})

test('totalReliefs caps RSTU self and family separately', () => {
  const r = totalReliefs({ age: 40, monthlySalary: 0, rstuSelf: 20_000, rstuFamily: 20_000 })
  assert.equal(r.breakdown.rstuSelf, 8_000)
  assert.equal(r.breakdown.rstuFamily, 8_000)
})

test('totalReliefs applies the overall personal relief cap', () => {
  const r = totalReliefs({
    age: 40, monthlySalary: CPF_OW_CEILING, annualBonus: 0,
    srsContribution: 15_300, rstuSelf: 8_000, rstuFamily: 8_000,
    childCount: 4, parentReliefLivingWith: 2, otherReliefs: 30_000,
  })
  assert.ok(r.raw > PERSONAL_RELIEF_CAP)
  assert.equal(r.capped, PERSONAL_RELIEF_CAP)
  assert.equal(r.cappedOut, true)
})

test('totalReliefs does not cap when under the ceiling', () => {
  const r = totalReliefs({ age: 40, monthlySalary: 5_000 })
  assert.equal(r.cappedOut, false)
  assert.equal(r.capped, r.raw)
})

// ─── Relief value ────────────────────────────────────────────────────────

test('reliefValue prices $1,000 of relief at the marginal rate', () => {
  // Chargeable income of $100k sits in the 11.5% band, so $1,000 of
  // relief saves $115.
  const v = reliefValue(100_000, 20_000, 1_000)
  approx(v.saving, 115)
  assert.equal(v.blockedByCap, false)
})

test('reliefValue returns zero saving once the personal relief cap is reached', () => {
  const v = reliefValue(100_000, PERSONAL_RELIEF_CAP, 1_000)
  assert.equal(v.effective, 0)
  approx(v.saving, 0)
  assert.equal(v.blockedByCap, true)
})

test('reliefValue truncates to the remaining relief headroom', () => {
  const v = reliefValue(100_000, PERSONAL_RELIEF_CAP - 400, 1_000)
  assert.equal(v.effective, 400)
  approx(v.saving, 400 * 0.115)
})

test('reliefValue spanning a band boundary blends both rates', () => {
  // Chargeable income $80,500: the first $500 of relief comes off at
  // 11.5%, the next $500 at 7%.
  const v = reliefValue(80_500, 0, 1_000)
  approx(v.saving, 500 * 0.115 + 500 * 0.07)
})

test('reliefValue is zero for someone already below the tax threshold', () => {
  const v = reliefValue(15_000, 0, 1_000)
  approx(v.saving, 0)
})

// ─── Orchestrator ────────────────────────────────────────────────────────

test('calcTax computes chargeable income net of capped reliefs', () => {
  const r = calcTax({ monthlySalary: 6_000, annualBonus: 12_000, age: 35 })
  approx(r.employmentIncome, 84_000)
  const expectedCpf = (72_000 + 12_000) * 0.20
  approx(r.employeeCpf, expectedCpf)
  approx(r.reliefs.breakdown.cpf, expectedCpf)
  approx(r.reliefs.breakdown.earnedIncome, 1_000)
  approx(r.chargeableIncome, 84_000 - expectedCpf - 1_000)
  approx(r.tax, taxOnChargeableIncome(r.chargeableIncome))
})

test('calcTax take-home nets off both employee CPF and tax', () => {
  const r = calcTax({ monthlySalary: 6_000, age: 35 })
  approx(r.annualTakeHome, r.employmentIncome - r.employeeCpf - r.tax)
  approx(r.monthlyTakeHome, r.annualTakeHome / 12)
})

test('calcTax take-home is higher for an older worker on the same salary', () => {
  // Employee CPF share drops with age, so more of the same gross lands
  // in the pocket — the flat 80% assumption used elsewhere misses this.
  const young = calcTax({ monthlySalary: 6_000, age: 35 })
  const old = calcTax({ monthlySalary: 6_000, age: 68 })
  assert.ok(old.monthlyTakeHome > young.monthlyTakeHome)
})

test('calcTax reports SRS and RSTU headroom and what filling it would save', () => {
  const r = calcTax({ monthlySalary: 10_000, age: 40, srsContribution: 5_000, rstuSelf: 2_000 })
  approx(r.srsHeadroom, SRS_CAP_CITIZEN_PR - 5_000)
  approx(r.rstuHeadroom, RSTU_RELIEF_CAP_SELF - 2_000)
  assert.ok(r.maxSrsSaving.saving > 0)
  assert.ok(r.maxRstuSaving.saving > 0)
})

test('calcTax flags when SRS and RSTU headroom together would overrun the shared $80K cap', () => {
  const tight = calcTax({ monthlySalary: 10_000, age: 40, otherReliefs: 70_000 })
  assert.ok(tight.capHeadroomSharedBetweenSrsAndRstu, 'little cap headroom left, but SRS+RSTU individual caps still claim far more than that')
  assert.ok(tight.combinedCapHeadroom < tight.srsHeadroom + tight.rstuHeadroom)

  const roomy = calcTax({ monthlySalary: 10_000, age: 40 })
  assert.ok(!roomy.capHeadroomSharedBetweenSrsAndRstu, 'plenty of cap headroom left, no conflict between the two suggestions')
})

test('calcTax on a low income owes nothing and flags no relief benefit', () => {
  const r = calcTax({ monthlySalary: 1_500, age: 30 })
  approx(r.tax, 0)
  approx(r.nextThousand.saving, 0)
})

test('calcTax effective rate is below the marginal rate', () => {
  const r = calcTax({ monthlySalary: 15_000, age: 40 })
  assert.ok(r.effectiveRate < r.marginal)
  assert.ok(r.effectiveRate > 0)
})
