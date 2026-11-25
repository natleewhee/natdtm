// src/lib/shared/onboarding.js
// "Set up my numbers" (/start, super-app plan U9): turns six short
// answers into writes for every tool slot, so each calculator opens
// already filled in. Pure — planOnboarding() returns the writes and
// applyOnboarding() performs them through the profile store.
//
// Rules:
// - Every answer is optional; a skipped answer writes nothing.
// - Synced numbers (MODULE_SCHEMA slots) are merged onto what the slot
//   already holds, so a later tool run is never clobbered by blanks.
// - A tool's saved form inputs are only filled where that field is
//   still empty — onboarding never overwrites something typed in a tool.
// - Derived figures (take-home, tax, marginal rate) come from TaxWise's
//   own engine, not a second approximation.

import { calcTax } from '../tax/calc.js'
import { monthlyPayment } from './loan.js'

const n = (v) => {
  const x = Number(String(v ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(x) && String(v ?? '').trim() !== '' ? x : null
}

/**
 * @typedef {Object} OnboardingAnswers
 * @property {string|number} [age]
 * @property {'citizen'|'foreigner'} [residency]
 * @property {string|number} [monthlySalary]      gross, per month
 * @property {string|number} [annualBonus]
 * @property {string|number} [cpfOA]
 * @property {string|number} [cpfSA]
 * @property {string|number} [cpfMA]
 * @property {'none'|'hdb'|'private'} [home]
 * @property {string|number} [homeValue]
 * @property {string|number} [homeLoan]           outstanding
 * @property {string|number} [homeInstalment]     monthly; estimated if blank
 * @property {'none'|'own'} [car]
 * @property {string|number} [carValue]
 * @property {string|number} [carLoan]            outstanding
 * @property {string|number} [carInstalment]      monthly
 * @property {string|number} [investments]        current balance
 * @property {string|number} [monthlyInvesting]
 * @property {string|number} [monthlySpend]       living costs, excl. loans
 */

/** Assumed mortgage terms when only the outstanding loan is known. */
export const DEFAULT_MORTGAGE = { ratePct: 3, remainingYears: 25 }

/**
 * @param {OnboardingAnswers} a
 * @param {object} existing - loadMyNumbers() for the active profile
 * @returns {{ modules: Record<string, object>, inputs: Record<string, object>, assumed: string[] }}
 */
export function planOnboarding(a = {}, existing = {}) {
  const modules = {}
  const inputs = {}
  const assumed = []
  const age = n(a.age)
  const salary = n(a.monthlySalary)
  const bonus = n(a.annualBonus)
  const residency = a.residency === 'foreigner' ? 'foreigner' : 'citizen'

  const merge = (slot, values) => {
    const clean = Object.fromEntries(Object.entries(values).filter(([, v]) => v != null))
    if (Object.keys(clean).length === 0) return
    // Keep schema fields the slot already had, then layer the answers on.
    const prev = existing[slot] || {}
    const { inputs: _i, inputsSavedAt: _s, savedAt: _t, ...prevFields } = prev
    modules[slot] = { ...prevFields, ...clean, source: 'onboarding' }
  }
  const fillInputs = (tool, values) => {
    const prev = existing[tool]?.inputs || {}
    const add = {}
    for (const [k, v] of Object.entries(values)) {
      if (v == null || v === '') continue
      if (prev[k] == null || prev[k] === '') add[k] = v
    }
    if (Object.keys(add).length) inputs[tool] = { ...prev, ...add }
  }

  // Income → TaxWise (exact take-home, tax, marginal rate).
  if (salary != null && salary > 0) {
    const t = calcTax({ monthlySalary: salary, annualBonus: bonus || 0, age: age || 30, isForeigner: residency === 'foreigner' })
    if (age == null) assumed.push('age 30 for CPF and tax until you add your age')
    merge('tax', { monthlyTakeHome: t.monthlyTakeHome, annualTax: t.tax, marginalRate: t.marginal, age: age ?? undefined })
    fillInputs('tax', {
      age: age != null ? String(age) : null, residency,
      monthlySalary: String(salary), annualBonus: bonus != null ? String(bonus) : null,
    })
    fillInputs('drive', { salaryRaw: String(Math.round(salary)) })
  }

  // CPF + investments → RetireWell.
  const oa = n(a.cpfOA), sa = n(a.cpfSA), ma = n(a.cpfMA)
  const inv = n(a.investments), invMonthly = n(a.monthlyInvesting)
  if (salary != null || oa != null || sa != null || ma != null || inv != null || invMonthly != null) {
    merge('retire', {
      salary: salary ?? undefined, oaBalance: oa ?? undefined, saBalance: sa ?? undefined, maBalance: ma ?? undefined,
      investmentBalance: inv ?? undefined, monthlyContribution: invMonthly ?? undefined,
    })
    fillInputs('retire', {
      currentAge: age != null ? String(age) : null, salary: salary != null ? String(salary) : null,
      annualBonus: bonus != null ? String(bonus) : null,
      startingOA: oa != null ? String(oa) : null, startingSA: sa != null ? String(sa) : null, startingMA: ma != null ? String(ma) : null,
      investmentStart: inv != null ? String(inv) : null, investmentMonthly: invMonthly != null ? String(invMonthly) : null,
    })
  }

  // Home → HouseMuch / MyLedger's house slot.
  if (a.home === 'hdb' || a.home === 'private') {
    const loan = n(a.homeLoan)
    let instalment = n(a.homeInstalment)
    if (instalment == null && loan) {
      instalment = Math.round(monthlyPayment(loan, DEFAULT_MORTGAGE.ratePct, DEFAULT_MORTGAGE.remainingYears))
      assumed.push(`a ${DEFAULT_MORTGAGE.ratePct}% mortgage over ${DEFAULT_MORTGAGE.remainingYears} years for the home-loan instalment`)
    }
    merge('house', {
      propertyType: a.home, propertyValue: n(a.homeValue) ?? undefined,
      outstandingBalance: loan ?? undefined, monthlyInstalment: instalment ?? undefined,
    })
  }

  // Car → DriveReady / MyLedger's car slot.
  if (a.car === 'own') {
    merge('drive', {
      carValue: n(a.carValue) ?? undefined, loanOutstanding: n(a.carLoan) ?? undefined,
      monthlyInstalment: n(a.carInstalment) ?? undefined, salary: salary ?? undefined,
    })
  }

  // Spending → MyLedger's Capacity module (the 'flow' slot).
  const spend = n(a.monthlySpend)
  if (spend != null) merge('flow', { livingExpenses: spend })

  return { modules, inputs, assumed }
}

/**
 * Perform the planned writes through the profile store.
 * @param {{ modules: Record<string, object>, inputs: Record<string, object> }} plan
 * @param {{ saveModule: Function, saveToolInputs: Function }} store
 * @returns {boolean} true when every write landed
 */
export function applyOnboarding(plan, store) {
  let ok = true
  for (const [tool, values] of Object.entries(plan.modules)) ok = store.saveModule(tool, values) && ok
  for (const [tool, values] of Object.entries(plan.inputs)) ok = store.saveToolInputs(tool, values) && ok
  return ok
}
