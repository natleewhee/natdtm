// src/lib/tax/calc.js
// Singapore resident income tax: chargeable income, progressive tax, and
// what each relief is actually worth in dollars saved. Also the exact
// employee-share CPF split, which is what determines take-home pay —
// the rest of the suite previously approximated this with a flat 80%.
// Pure functions — no React, no fetch. Covered by calc.test.js.
//
// Rates and relief caps below are a good-faith snapshot, not pulled live
// from IRAS. Verify against iras.gov.sg before relying on this for an
// actual filing — same posture as HouseMuch's stamp duty tables and
// RetireWell's CPF rates.

import { CPF_CONTRIBUTION_TABLE, CPF_OW_CEILING, CPF_ANNUAL_CEILING } from '../retire/cpf.js'

// Verified against IRAS in docs/statutory-sources.md (audited 2026-08-31).
export const TAX_RATES_AS_OF = '2026-01-01' // YA2024 onwards resident rate schedule

// Resident progressive rate schedule. `upTo` is the top of each band;
// `rate` applies only to the slice of chargeable income inside it.
export const TAX_BANDS = [
  { upTo: 20_000, rate: 0 },
  { upTo: 30_000, rate: 0.02 },
  { upTo: 40_000, rate: 0.035 },
  { upTo: 80_000, rate: 0.07 },
  { upTo: 120_000, rate: 0.115 },
  { upTo: 160_000, rate: 0.15 },
  { upTo: 200_000, rate: 0.18 },
  { upTo: 240_000, rate: 0.19 },
  { upTo: 280_000, rate: 0.195 },
  { upTo: 320_000, rate: 0.20 },
  { upTo: 500_000, rate: 0.22 },
  { upTo: 1_000_000, rate: 0.23 },
  { upTo: Infinity, rate: 0.24 },
]

// Total personal reliefs are capped at this figure — claiming more than
// this in total simply stops reducing chargeable income. Catches people
// who stack SRS + CPF + top-ups without realising the ceiling exists.
export const PERSONAL_RELIEF_CAP = 80_000

// Earned Income Relief, granted automatically, scaled by age at the end
// of the year before the Year of Assessment.
export const EARNED_INCOME_RELIEF = [
  { maxAge: 54, amount: 1_000 },
  { maxAge: 59, amount: 6_000 },
  { maxAge: 999, amount: 8_000 },
]

// Supplementary Retirement Scheme annual contribution cap.
export const SRS_CAP_CITIZEN_PR = 15_300
export const SRS_CAP_FOREIGNER = 35_700

// CPF Cash Top-Up relief (RSTU): up to $8,000 for your own account, plus
// up to $8,000 for family members' accounts.
export const RSTU_RELIEF_CAP_SELF = 8_000
export const RSTU_RELIEF_CAP_FAMILY = 8_000

// Course fees relief cap.
export const COURSE_FEES_CAP = 5_500

// Parent/handicapped-parent relief, per dependant.
export const PARENT_RELIEF_LIVING_WITH = 9_000
export const PARENT_RELIEF_NOT_LIVING_WITH = 5_500

// Qualifying Child Relief, per child.
export const CHILD_RELIEF = 4_000

// NSman relief. Key-appointment holders get the higher figure; whether
// you performed NS activity in the work year sets which column applies.
export const NSMAN_RELIEF = {
  none: 0,
  nonKeyInactive: 1_500,
  nonKeyActive: 3_000,
  keyInactive: 3_500,
  keyActive: 5_000,
}

/**
 * Looks up the automatic Earned Income Relief for a given age, scaled by
 * age band (as at the end of the year before the Year of Assessment).
 * @param {number} age - Age in years.
 * @returns {number} The relief amount in dollars.
 */
export function earnedIncomeRelief(age) {
  const a = Number(age) || 0
  const band = EARNED_INCOME_RELIEF.find(b => a <= b.maxAge) || EARNED_INCOME_RELIEF[EARNED_INCOME_RELIEF.length - 1]
  return band.amount
}

// Employee's own share of the CPF contribution, by age band. The
// contribution TABLE in retire/cpf.js models only the combined total
// (which is all that matters for what lands in CPF); take-home pay
// depends on the employee half specifically, so it lives here.
//
// Boundaries are deliberately CONTIGUOUS (see the matching comment on
// CPF_CONTRIBUTION_TABLE in retire/cpf.js) — a fractional age like 55.5
// typed into the age field must still match exactly one band, not fall
// through the gap between non-contiguous bounds (55,56) etc. into the
// 71+ band.
export const CPF_EMPLOYEE_SHARE = [
  { minAge: 0, maxAge: 55, rate: 0.20 },
  { minAge: 55, maxAge: 60, rate: 0.17 },
  { minAge: 60, maxAge: 65, rate: 0.115 },
  { minAge: 65, maxAge: 70, rate: 0.075 },
  { minAge: 70, maxAge: 999, rate: 0.05 },
]

/**
 * Employee's own share of the CPF contribution rate for a given age,
 * using contiguous age-band boundaries so a fractional age (e.g. 55.5)
 * always matches exactly one band.
 * @param {number} age - Age in years.
 * @returns {number} The employee CPF contribution rate (e.g. 0.20 for 20%).
 */
export function cpfEmployeeRateForAge(age) {
  const a = Number(age) || 0
  const band = CPF_EMPLOYEE_SHARE.find(b => a >= b.minAge && a <= b.maxAge)
    || CPF_EMPLOYEE_SHARE[CPF_EMPLOYEE_SHARE.length - 1]
  return band.rate
}

// Monthly employee CPF contribution, capped at the Ordinary Wage
// ceiling — this is what's actually deducted from a payslip.
/**
 * Monthly employee CPF contribution, capped at the Ordinary Wage
 * ceiling — this is what's actually deducted from a payslip.
 * @param {number} monthlySalary - Gross monthly salary in dollars.
 * @param {number} age - Age in years, used to pick the contribution rate.
 * @returns {number} Monthly employee CPF contribution in dollars.
 */
export function monthlyEmployeeCpf(monthlySalary, age) {
  const wage = Math.min(Math.max(0, Number(monthlySalary) || 0), CPF_OW_CEILING)
  return wage * cpfEmployeeRateForAge(age)
}

// Annual employee CPF contribution across salary and bonus, respecting
// both the monthly Ordinary Wage ceiling and the annual total ceiling —
// this is the figure that qualifies for CPF relief.
/**
 * Annual employee CPF contribution across salary and bonus, respecting
 * both the monthly Ordinary Wage ceiling and the annual total ceiling —
 * this is the figure that qualifies for CPF relief.
 * @param {number} monthlySalary - Gross monthly salary in dollars.
 * @param {number} annualBonus - Annual bonus in dollars.
 * @param {number} age - Age in years, used to pick the contribution rate.
 * @returns {number} Annual employee CPF contribution in dollars.
 */
export function annualEmployeeCpf(monthlySalary, annualBonus, age) {
  const rate = cpfEmployeeRateForAge(age)
  const ordinaryWages = Math.min(Math.max(0, Number(monthlySalary) || 0), CPF_OW_CEILING) * 12
  const awCeiling = Math.max(0, CPF_ANNUAL_CEILING - ordinaryWages)
  const bonusSubjectToCpf = Math.min(Math.max(0, Number(annualBonus) || 0), awCeiling)
  return (ordinaryWages + bonusSubjectToCpf) * rate
}

// Progressive tax on a chargeable income figure. Each band's rate
// applies only to the slice of income within it.
/**
 * Progressive tax on a chargeable income figure. Each band's rate
 * applies only to the slice of income within it.
 * @param {number} chargeableIncome - Chargeable income in dollars.
 * @returns {number} Total tax payable in dollars.
 */
export function taxOnChargeableIncome(chargeableIncome) {
  let remaining = Math.max(0, Number(chargeableIncome) || 0)
  let lower = 0
  let tax = 0
  for (const band of TAX_BANDS) {
    if (remaining <= lower) break
    const taxable = Math.min(remaining, band.upTo) - lower
    tax += taxable * band.rate
    lower = band.upTo
  }
  return tax
}

// The marginal rate that applies to the next dollar earned — this is
// what makes a relief worth what it's worth. Uses a strict `<` against
// each band's upper bound: at exactly a boundary (e.g. chargeableIncome
// === 20,000), that whole $20,000 is still taxed at the band below it,
// but the NEXT dollar earned (dollar 20,001) falls into the band above —
// `<=` would wrongly return the band-below's rate at every boundary.
/**
 * The marginal rate that applies to the next dollar earned. Uses a
 * strict `<` against each band's upper bound so a chargeable income
 * exactly at a boundary is still taxed at the band below it, while the
 * next dollar earned falls into the band above.
 * @param {number} chargeableIncome - Chargeable income in dollars.
 * @returns {number} The marginal tax rate (e.g. 0.15 for 15%).
 */
export function marginalRate(chargeableIncome) {
  const ci = Math.max(0, Number(chargeableIncome) || 0)
  for (const band of TAX_BANDS) {
    if (ci < band.upTo) return band.rate
  }
  return TAX_BANDS[TAX_BANDS.length - 1].rate
}

// Sums every relief the user claims, then applies the overall personal
// relief cap. Returns both the raw and capped totals so the UI can point
// out when someone is claiming past the ceiling for no benefit.
/**
 * Sums every relief the user claims, then applies the overall personal
 * relief cap. Returns both the raw and capped totals so the UI can point
 * out when someone is claiming past the ceiling for no benefit.
 * @param {object} inputs - Relief inputs (age, monthlySalary, annualBonus,
 *   srsContribution, rstuSelf, rstuFamily, courseFees, nsmanStatus,
 *   childCount, parentReliefLivingWith, parentReliefNotLivingWith,
 *   otherReliefs, isForeigner).
 * @returns {{breakdown: object, raw: number, capped: number, cappedOut: boolean, srsCap: number}}
 *   Per-relief breakdown, the raw sum, the sum capped at PERSONAL_RELIEF_CAP,
 *   whether the cap was exceeded, and the applicable SRS cap.
 */
export function totalReliefs(inputs) {
  const {
    age = 0, monthlySalary = 0, annualBonus = 0,
    srsContribution = 0, rstuSelf = 0, rstuFamily = 0,
    courseFees = 0, nsmanStatus = 'none',
    childCount = 0, parentReliefLivingWith = 0, parentReliefNotLivingWith = 0,
    otherReliefs = 0, isForeigner = false,
  } = inputs

  const earnedIncome = earnedIncomeRelief(age)
  const cpf = annualEmployeeCpf(monthlySalary, annualBonus, age)
  const srsCap = isForeigner ? SRS_CAP_FOREIGNER : SRS_CAP_CITIZEN_PR
  const srs = Math.min(Math.max(0, Number(srsContribution) || 0), srsCap)
  const rstuSelfClaimed = Math.min(Math.max(0, Number(rstuSelf) || 0), RSTU_RELIEF_CAP_SELF)
  const rstuFamilyClaimed = Math.min(Math.max(0, Number(rstuFamily) || 0), RSTU_RELIEF_CAP_FAMILY)
  const course = Math.min(Math.max(0, Number(courseFees) || 0), COURSE_FEES_CAP)
  const nsman = NSMAN_RELIEF[nsmanStatus] ?? 0
  const child = Math.max(0, Number(childCount) || 0) * CHILD_RELIEF
  const parent = Math.max(0, Number(parentReliefLivingWith) || 0) * PARENT_RELIEF_LIVING_WITH
    + Math.max(0, Number(parentReliefNotLivingWith) || 0) * PARENT_RELIEF_NOT_LIVING_WITH
  const other = Math.max(0, Number(otherReliefs) || 0)

  const breakdown = {
    earnedIncome, cpf, srs, rstuSelf: rstuSelfClaimed, rstuFamily: rstuFamilyClaimed,
    courseFees: course, nsman, child, parent, other,
  }
  const raw = Object.values(breakdown).reduce((a, b) => a + b, 0)
  const capped = Math.min(raw, PERSONAL_RELIEF_CAP)

  return { breakdown, raw, capped, cappedOut: raw > PERSONAL_RELIEF_CAP, srsCap }
}

// What one more dollar of a given relief actually saves — and what the
// next $1,000 would save. Marginal-rate-aware, and returns zero once the
// personal relief cap is already reached, since further reliefs then do
// nothing at all.
/**
 * What one more dollar of a given relief actually saves — and what the
 * next `extraAmount` would save. Marginal-rate-aware, and returns zero
 * once the personal relief cap is already reached, since further
 * reliefs then do nothing at all.
 * @param {number} chargeableIncome - Chargeable income before the extra relief, in dollars.
 * @param {number} reliefsRaw - Reliefs already claimed (uncapped), in dollars.
 * @param {number} [extraAmount=1000] - Additional relief amount to test, in dollars.
 * @returns {{effective: number, saving: number, blockedByCap: boolean}}
 *   The portion of extraAmount that actually fits under the cap, the tax
 *   saved by it, and whether the cap already blocks any further saving.
 */
export function reliefValue(chargeableIncome, reliefsRaw, extraAmount = 1_000) {
  const headroom = Math.max(0, PERSONAL_RELIEF_CAP - reliefsRaw)
  const effective = Math.min(Math.max(0, Number(extraAmount) || 0), headroom)
  const ci = Math.max(0, Number(chargeableIncome) || 0)
  const saving = taxOnChargeableIncome(ci) - taxOnChargeableIncome(Math.max(0, ci - effective))
  return { effective, saving, blockedByCap: headroom <= 0 }
}

// ─── Orchestrator ─────────────────────────────────────────────────────────
/**
 * Orchestrates the full tax calculation: employment income, capped
 * reliefs, chargeable income, tax and effective/marginal rates, a
 * smoothed monthly take-home figure, and what the next $1,000 into SRS
 * or an RSTU top-up would save (flagging when the SRS and RSTU headroom
 * suggestions would compete for the same shared relief-cap headroom).
 * @param {object} inputs - Tax inputs, including monthlySalary, annualBonus,
 *   otherIncome, age, and every field accepted by {@link totalReliefs}.
 * @returns {object} The full tax breakdown: employmentIncome, reliefs,
 *   chargeableIncome, tax, marginal, effectiveRate, employeeCpf,
 *   annualTakeHome, monthlyTakeHome, nextThousand, srsHeadroom,
 *   rstuHeadroom, maxSrsSaving, maxRstuSaving, combinedCapHeadroom,
 *   capHeadroomSharedBetweenSrsAndRstu.
 */
export function calcTax(inputs) {
  const {
    monthlySalary = 0, annualBonus = 0, otherIncome = 0, age = 0,
  } = inputs

  const employmentIncome = (Math.max(0, Number(monthlySalary) || 0) * 12)
    + Math.max(0, Number(annualBonus) || 0)
    + Math.max(0, Number(otherIncome) || 0)

  const reliefs = totalReliefs(inputs)
  const chargeableIncome = Math.max(0, employmentIncome - reliefs.capped)
  const tax = taxOnChargeableIncome(chargeableIncome)
  const marginal = marginalRate(chargeableIncome)
  const effectiveRate = employmentIncome > 0 ? tax / employmentIncome : 0

  // Take-home: gross pay less the employee's own CPF share and income
  // tax. Tax is spread evenly across 12 months for a monthly figure —
  // IRAS bills annually (or via GIRO instalments), so this is a
  // smoothed view, not a payslip line.
  const employeeCpf = annualEmployeeCpf(monthlySalary, annualBonus, age)
  const annualTakeHome = Math.max(0, employmentIncome - employeeCpf - tax)
  const monthlyTakeHome = annualTakeHome / 12

  // What the next $1,000 into SRS or a CPF top-up would save, given
  // this person's marginal rate and remaining relief headroom.
  const nextThousand = reliefValue(chargeableIncome, reliefs.raw, 1_000)
  const srsHeadroom = Math.max(0, reliefs.srsCap - reliefs.breakdown.srs)
  const rstuHeadroom = Math.max(0, RSTU_RELIEF_CAP_SELF - reliefs.breakdown.rstuSelf)
  const maxSrsSaving = reliefValue(chargeableIncome, reliefs.raw, srsHeadroom)
  const maxRstuSaving = reliefValue(chargeableIncome, reliefs.raw, rstuHeadroom)

  // Each "max saving" above is computed as if it alone had the full
  // remaining $80K cap headroom to itself — true in isolation, but if
  // someone follows BOTH suggestions they're competing for the same
  // shared headroom, so the two savings shown side by side don't simply
  // add. Flag it whenever their individual headroom claims combined
  // would overrun what's actually left under the cap.
  const combinedCapHeadroom = Math.max(0, PERSONAL_RELIEF_CAP - reliefs.raw)
  const capHeadroomSharedBetweenSrsAndRstu = (srsHeadroom + rstuHeadroom) > combinedCapHeadroom

  return {
    employmentIncome, reliefs, chargeableIncome, tax, marginal, effectiveRate,
    employeeCpf, annualTakeHome, monthlyTakeHome,
    nextThousand, srsHeadroom, rstuHeadroom, maxSrsSaving, maxRstuSaving,
    combinedCapHeadroom, capHeadroomSharedBetweenSrsAndRstu,
  }
}
