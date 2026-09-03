// src/lib/flow/calc.js
// FlowState's cashflow engine. Where MyLedger answers "what do I own and
// owe" (a balance-sheet snapshot), this answers "where does each dollar
// actually go" (a flow) — the two pipes a Singapore salary splits into
// (CPF and cash) and where each one lands. Deliberately calls into the
// other verticals' own engines (monthlyEmployeeCpf/calcTax from
// tax/calc.js, monthlyCpfContribution from retire/cpf.js) rather than
// re-deriving CPF/tax math, so a rate-table fix in one place stays the
// single source of truth. Pure functions — no React, no fetch. Covered
// by calc.test.js.

import { monthlyEmployeeCpf, calcTax } from '../tax/calc.js'
import { monthlyCpfContribution } from '../retire/cpf.js'

export { CPF_OW_CEILING, CPF_ANNUAL_CEILING } from '../retire/cpf.js'

// Fraction of gross salary treated as take-home when NEITHER TaxWise has
// been run NOR can be estimated (age missing) — last-resort fallback
// only, mirrors the flat assumption already used in drive/calc.js and
// ledger/calc.js.
export const TAKE_HOME_RATE = 0.80

// A rough, editable default for the Integrated Shield Plan premium most
// people pay straight out of MediSave — never touches cash, never shows
// up on a bank statement, and is exactly the kind of flow this tool
// exists to surface. Deliberately conservative; the UI exposes it as an
// editable field rather than a hidden constant.
export const DEFAULT_MA_HEALTH_PREMIUM = 150

// ─── CPF split ──────────────────────────────────────────────────────────

// Splits a monthly salary's CPF contribution into the employee half
// (deducted from pay) and the employer half (compensation, but never
// touches your bank account) — the total and OA/SA/MA allocation both
// come from retire/cpf.js's own age-banded, ceiling-capped table, so
// "employer" is simply what's left after subtracting the employee share
// tax/calc.js already computes for take-home purposes.
/**
 * Splits a monthly salary's CPF contribution into the employee half
 * (deducted from pay) and the employer half (compensation that never
 * touches your bank account) — the employer share is derived as
 * whatever's left after subtracting the employee share tax/calc.js
 * already computes.
 * @param {number} salary - Monthly salary in dollars.
 * @param {number} age - Age in years.
 * @returns {{employee: number, employer: number, total: number, oa: number, sa: number, ma: number}}
 *   The CPF split.
 */
export function monthlyCpfSplit(salary, age) {
  const total = monthlyCpfContribution(salary, age) // { total, oa, sa, ma }
  const employee = monthlyEmployeeCpf(salary, age)
  const employer = Math.max(0, total.total - employee)
  return { employee, employer, total: total.total, oa: total.oa, sa: total.sa, ma: total.ma }
}

// ─── Mortgage: cash vs CPF, interest vs principal ──────────────────────

// A mortgage instalment is really four different flows, not one expense
// line: CPF-funded interest (gone, but never touched your bank account),
// CPF-funded principal (equity, funded from CPF), cash-funded interest
// (gone, from your bank account), cash-funded principal (equity, from
// your bank account). `cpfServicing` is HouseMuch's own field for "how
// much of the instalment is paid from CPF-OA" — the split between CPF
// and cash is applied proportionally across the interest/principal
// split, since CPF isn't earmarked to pay one before the other.
/**
 * Splits a mortgage instalment into four flows: CPF-funded interest,
 * CPF-funded principal, cash-funded interest, cash-funded principal.
 * `cpfServicing` (how much of the instalment is paid from CPF-OA) is
 * applied proportionally across the interest/principal split, since CPF
 * isn't earmarked to pay one before the other.
 * @param {object} params - Mortgage inputs.
 * @param {number} params.outstandingBalance - Outstanding loan balance in dollars.
 * @param {number} params.rate - Annual mortgage rate as a percentage.
 * @param {number} params.monthlyInstalment - Monthly instalment in dollars.
 * @param {number} params.cpfServicing - Portion of the instalment paid from CPF-OA, in dollars.
 * @returns {{interest: number, principal: number, cpfInterest: number, cpfPrincipal: number, cashInterest: number, cashPrincipal: number, cashPortion: number}}
 *   The four-way payment split.
 */
export function splitMortgagePayment({ outstandingBalance, rate, monthlyInstalment, cpfServicing }) {
  const balance = Math.max(0, Number(outstandingBalance) || 0)
  const r = Math.max(0, Number(rate) || 0) / 100 / 12
  const instalment = Math.max(0, Number(monthlyInstalment) || 0)
  const interest = Math.min(instalment, balance * r)
  const principal = Math.max(0, instalment - interest)

  const cpfPortion = Math.min(instalment, Math.max(0, Number(cpfServicing) || 0))
  const cpfShare = instalment > 0 ? cpfPortion / instalment : 0

  return {
    interest, principal,
    cpfInterest: interest * cpfShare,
    cpfPrincipal: principal * cpfShare,
    cashInterest: interest * (1 - cpfShare),
    cashPrincipal: principal * (1 - cpfShare),
    cashPortion: instalment - cpfPortion,
  }
}

// ─── Living expenses: three ways to answer a question nobody can recall ─

/**
 * "Quick" living expenses entry — a single number.
 * @param {*} amount - The entered amount.
 * @returns {number} A non-negative dollar amount.
 */
export function quickLivingExpenses(amount) {
  return Math.max(0, Number(amount) || 0)
}

/**
 * "Detailed" living expenses entry — named categories, summed.
 * @param {?Object<string, *>} categories - Category amounts, keyed by name.
 * @returns {number} Sum of all non-negative category amounts.
 */
export function detailedLivingExpenses(categories) {
  return Object.values(categories || {}).reduce((sum, v) => sum + Math.max(0, Number(v) || 0), 0)
}

// "Back-solve" — nobody remembers what they spend, but a bank balance
// twelve months ago and today pins it exactly: whatever came in and
// isn't in the account went somewhere. `monthlyNonLivingOutflow` is
// everything ELSE already accounted for (mortgage cash leg, car,
// insurance, invested) so it isn't double-subtracted from the balance
// delta, which reflects ALL outflows, not just food-and-shopping ones.
/**
 * "Back-solve" living expenses: derives the monthly figure from a bank
 * balance change over `months`, since whatever came in and isn't in the
 * account went somewhere. `monthlyNonLivingOutflow` is everything else
 * already accounted for (mortgage cash leg, car, insurance, invested) so
 * it isn't double-subtracted from the balance delta.
 * @param {object} params - Back-solve inputs.
 * @param {number} params.startBalance - Bank balance at the start of the period, in dollars.
 * @param {number} params.endBalance - Bank balance at the end of the period, in dollars.
 * @param {number} params.months - Number of months in the period (defaults to 12 if not positive).
 * @param {number} params.monthlyCashIncome - Monthly cash income, in dollars.
 * @param {number} params.monthlyNonLivingOutflow - Other known monthly cash outflows, in dollars.
 * @returns {number} Implied monthly living expenses, floored at 0.
 */
export function backSolveLivingExpenses({ startBalance, endBalance, months, monthlyCashIncome, monthlyNonLivingOutflow }) {
  const n = Math.max(1, Number(months) || 12)
  const delta = (Number(endBalance) || 0) - (Number(startBalance) || 0)
  const monthlyDelta = delta / n
  const impliedTotalOutflow = Math.max(0, (Number(monthlyCashIncome) || 0) - monthlyDelta)
  return Math.max(0, impliedTotalOutflow - Math.max(0, Number(monthlyNonLivingOutflow) || 0))
}

// The reconciliation gap: what a detailed/quick entry claims to spend
// vs. what the bank-balance math says actually left the account. A
// positive gap is money leaking to something un-named — usually the
// single most useful number the tool produces.
/**
 * The reconciliation gap: what a detailed/quick entry claims to spend
 * vs. what the bank-balance math says actually left the account. A
 * positive gap is money leaking to something un-named.
 * @param {number} claimedLivingExpenses - Self-reported monthly living expenses, in dollars.
 * @param {number} backSolvedLivingExpenses - Bank-balance-derived monthly living expenses, in dollars.
 * @returns {number} The gap in dollars, floored at 0.
 */
export function reconciliationGap(claimedLivingExpenses, backSolvedLivingExpenses) {
  return Math.max(0, (Number(backSolvedLivingExpenses) || 0) - (Number(claimedLivingExpenses) || 0))
}

// ─── Monthly tax provision ──────────────────────────────────────────────

// Prefers an exact figure from TaxWise (accounts for age-banded CPF
// relief, all the reliefs actually claimed, and marginal-rate-correct
// tax) when available; otherwise estimates directly off salary and age
// via calcTax with zero reliefs — a closer estimate than a flat
// percentage, and clearly labeled as an estimate in the UI either way.
/**
 * Monthly tax provision. Prefers an exact figure from TaxWise
 * (`annualTax`, accounting for age-banded CPF relief and every relief
 * actually claimed) when available; otherwise estimates directly off
 * salary and age via calcTax with zero reliefs.
 * @param {{annualTax: ?number, salary: number, age: number}} params - Inputs.
 * @returns {{monthly: number, exact: boolean}} Monthly tax provision and whether it's the exact TaxWise figure.
 */
export function monthlyTaxProvision({ annualTax, salary, age }) {
  if (annualTax != null && annualTax >= 0) {
    return { monthly: annualTax / 12, exact: true }
  }
  if (!age || !salary) return { monthly: 0, exact: false }
  const est = calcTax({ monthlySalary: salary, age })
  return { monthly: est.tax / 12, exact: false }
}

// ─── One month's flow: nodes + links for the Sankey ────────────────────

// Fate buckets used to color the Sankey and compute the headline
// metrics: 'kept' (still yours, in some form), 'gone' (spent or paid
// away, never coming back), 'invested', or 'neutral' (a pass-through
// column, not a destination).
export const FATE = { KEPT: 'kept', GONE: 'gone', INVESTED: 'invested', NEUTRAL: 'neutral' }

// Which tool a figure came from, for the hover-to-explain UI. `tool` is
// a display name, `href` a link to that tool (null when the figure is
// computed here rather than synced, or purely user-entered).
export const SOURCE = {
  salary: { tool: 'RetireWell / DriveReady', href: '/retire' },
  age: { tool: 'TaxWise', href: '/tax' },
  cpf: { tool: 'CPF Board contribution tables (computed here)', href: null },
  tax: { tool: 'TaxWise', href: '/tax' },
  taxEstimated: { tool: 'estimated — run TaxWise for your exact figure', href: '/tax' },
  house: { tool: 'HouseMuch', href: '/house' },
  car: { tool: 'DriveReady', href: '/drive' },
  insure: { tool: 'InsureCheck', href: '/insure' },
  etf: { tool: 'WhatETF', href: '/etf' },
  living: { tool: 'entered on this page', href: null },
  maHealth: { tool: 'estimate — edit on this page', href: null },
}

// Builds the node/link graph for one typical month (no bonus — bonuses
// are lumpy and belong in the 12-month timeline, not a "typical month"
// snapshot). Every node carries a `source` key into SOURCE so the UI can
// show "from HouseMuch" etc. on hover. Returns null fields gracefully —
// a missing house/car/insurance/invest just omits those nodes.
/**
 * Builds the node/link graph for one typical month's cashflow (no
 * bonus — bonuses are lumpy and belong in the 12-month timeline, not a
 * "typical month" snapshot), tracing salary through CPF and cash into
 * every downstream commitment and surplus. Missing house/car/insurance/
 * invest inputs simply omit those nodes.
 * @param {object} state - Flow inputs: age, salary, annualTax, house, car,
 *   insurancePremium, maHealthPremium, investMonthly, livingExpenses.
 * @returns {{nodes: object, links: Array<object>, cash: number, cpf: object, tax: object, mortgage: (object|null), surplus: number}}
 *   The Sankey-ready flow graph plus headline figures.
 */
export function buildMonthlyFlow(state) {
  const {
    age = 0, salary = 0,
    annualTax = null, // exact, from TaxWise, if synced
    house = null, // { outstandingBalance, rate, monthlyInstalment, cpfServicing }
    car = null, // { monthlyInstalment }
    insurancePremium = 0,
    maHealthPremium = DEFAULT_MA_HEALTH_PREMIUM,
    investMonthly = 0,
    livingExpenses = 0,
  } = state || {}

  const cpf = monthlyCpfSplit(salary, age)
  const tax = monthlyTaxProvision({ annualTax, salary, age })
  const cash = Math.max(0, salary - cpf.employee - tax.monthly)

  const mortgage = house ? splitMortgagePayment(house) : null

  const oaSpentOnMortgage = mortgage ? mortgage.cpfInterest + mortgage.cpfPrincipal : 0
  const oaGrows = Math.max(0, cpf.oa - oaSpentOnMortgage)

  const maSpentOnHealth = Math.min(cpf.ma, Math.max(0, Number(maHealthPremium) || 0))
  const maGrows = Math.max(0, cpf.ma - maSpentOnHealth)

  const carInstalment = car ? Math.max(0, Number(car.monthlyInstalment) || 0) : 0
  const insurance = Math.max(0, Number(insurancePremium) || 0)
  const invest = Math.max(0, Number(investMonthly) || 0)
  const living = Math.max(0, Number(livingExpenses) || 0)

  const cashCommitted = (mortgage ? mortgage.cashInterest + mortgage.cashPrincipal : 0)
    + carInstalment + insurance + invest + living
  const surplus = cash - cashCommitted // can go negative — the UI should say so, not clamp it away

  const nodes = {
    salary: { label: 'Salary', fate: FATE.NEUTRAL, value: salary, source: 'salary' },
    employer: { label: 'Employer CPF', fate: FATE.NEUTRAL, value: cpf.employer, ghost: true, source: 'cpf', sub: 'never hits your bank' },
    cpfTotal: { label: 'To CPF', fate: FATE.NEUTRAL, value: cpf.total, source: 'cpf' },
    cashTotal: { label: 'Cash pay', fate: FATE.NEUTRAL, value: cash + tax.monthly, source: 'tax' },
    oa: { label: 'OA', fate: FATE.NEUTRAL, value: cpf.oa, source: 'cpf' },
    sa: { label: 'SA', fate: FATE.NEUTRAL, value: cpf.sa, source: 'cpf' },
    ma: { label: 'MediSave', fate: FATE.NEUTRAL, value: cpf.ma, source: 'cpf' },
    bank: { label: 'Bank account', fate: FATE.NEUTRAL, value: cash, source: 'tax' },

    oaGrow: { label: 'Your OA grows', fate: FATE.KEPT, value: oaGrows, source: 'cpf' },
    saLock: { label: 'SA — locked away', fate: FATE.KEPT, value: cpf.sa, source: 'cpf' },
    maGrow: { label: 'MediSave grows', fate: FATE.KEPT, value: maGrows, source: 'cpf' },
    maHealth: { label: 'Health insurance', fate: FATE.GONE, value: maSpentOnHealth, source: 'maHealth', sub: 'paid from MediSave' },
    taxNode: { label: 'Income tax', fate: FATE.GONE, value: tax.monthly, source: tax.exact ? 'tax' : 'taxEstimated', sub: tax.exact ? 'exact, from TaxWise' : 'estimated' },
    car: car ? { label: 'Car loan', fate: FATE.GONE, value: carInstalment, source: 'car' } : null,
    insurance: insurance > 0 ? { label: 'Life & CI cover', fate: FATE.GONE, value: insurance, source: 'insure' } : null,
    living: { label: 'Living expenses', fate: FATE.GONE, value: living, source: 'living' },
    invest: invest > 0 ? { label: 'Invested', fate: FATE.INVESTED, value: invest, source: 'etf' } : null,
    surplus: { label: 'Cash left over', fate: surplus >= 0 ? FATE.KEPT : FATE.GONE, value: surplus, source: 'living' },

    equity: mortgage ? { label: 'Into your equity', fate: FATE.KEPT, value: mortgage.principal, source: 'house', sub: 'mortgage principal' } : null,
    mortgageInterest: mortgage ? { label: 'Mortgage interest', fate: FATE.GONE, value: mortgage.interest, source: 'house' } : null,
  }

  // Tax is deducted before salary ever reaches the bank, so it's drawn
  // straight off `cashTotal` (pre-tax cash pool), not `bank` (the
  // post-tax figure that then funds every other cash expense).
  const links = [
    { from: 'salary', to: 'cpfTotal', value: cpf.employee },
    { from: 'employer', to: 'cpfTotal', value: cpf.employer },
    { from: 'salary', to: 'cashTotal', value: cash + tax.monthly },
    { from: 'cpfTotal', to: 'oa', value: cpf.oa },
    { from: 'cpfTotal', to: 'sa', value: cpf.sa },
    { from: 'cpfTotal', to: 'ma', value: cpf.ma },
    { from: 'cashTotal', to: 'taxNode', value: tax.monthly },
    { from: 'cashTotal', to: 'bank', value: cash },
    { from: 'sa', to: 'saLock', value: cpf.sa },
    { from: 'ma', to: 'maHealth', value: maSpentOnHealth },
    { from: 'ma', to: 'maGrow', value: maGrows },
  ]

  if (mortgage) {
    if (mortgage.cpfInterest > 0) links.push({ from: 'oa', to: 'mortgageInterest', value: mortgage.cpfInterest })
    if (mortgage.cpfPrincipal > 0) links.push({ from: 'oa', to: 'equity', value: mortgage.cpfPrincipal })
    if (mortgage.cashInterest > 0) links.push({ from: 'bank', to: 'mortgageInterest', value: mortgage.cashInterest })
    if (mortgage.cashPrincipal > 0) links.push({ from: 'bank', to: 'equity', value: mortgage.cashPrincipal })
  }
  if (oaGrows > 0) links.push({ from: 'oa', to: 'oaGrow', value: oaGrows })
  if (carInstalment > 0) links.push({ from: 'bank', to: 'car', value: carInstalment })
  if (insurance > 0) links.push({ from: 'bank', to: 'insurance', value: insurance })
  if (living > 0) links.push({ from: 'bank', to: 'living', value: living })
  if (invest > 0) links.push({ from: 'bank', to: 'invest', value: invest })
  // A negative surplus means cash committed exceeds cash in — there's no
  // "left over" flow to draw; the shortfall itself surfaces through the
  // metrics/copy layer instead of as a Sankey ribbon.
  if (surplus > 0) links.push({ from: 'bank', to: 'surplus', value: surplus })

  const cleanLinks = links.filter(l => l.value > 0)

  return { nodes, links: cleanLinks, cash, cpf, tax, mortgage, surplus }
}

// Total comp kept in ANY form (CPF growth, equity, invested, cash
// surplus) divided by total comp (salary + employer CPF) — the "honest"
// savings rate the mockup leads with.
//
// The surplus node is handled explicitly rather than through the generic
// KEPT filter below: when surplus < 0 its fate flips to GONE (see
// buildMonthlyFlow), which would otherwise drop it from BOTH the kept
// and invested sums entirely — an overspending month contributes nothing
// to the numerator instead of actively subtracting from it, so someone
// $500/month underwater would show the same rate as someone at exact
// breakeven. Excluding it from the generic KEPT loop and adding its
// (possibly negative) value back in directly fixes that while leaving
// the positive-surplus case identical to before (it was already fully
// counted via the KEPT filter in that case).
/**
 * Total comp kept in ANY form (CPF growth, equity, invested, cash
 * surplus) divided by total comp (salary + employer CPF) — the "honest"
 * savings rate. The surplus node's value is added back directly
 * (possibly negative) rather than through the generic KEPT filter, so an
 * overspending month actively subtracts from the rate instead of simply
 * contributing zero.
 * @param {object} flow - The result of {@link buildMonthlyFlow}.
 * @returns {number} The true savings rate as a decimal (e.g. 0.35 for 35%).
 */
export function trueSavingsRate(flow) {
  const { nodes } = flow
  const kept = Object.values(nodes)
    .filter(n => n && n.fate === FATE.KEPT && n !== nodes.surplus)
    .reduce((s, n) => s + n.value, 0)
  const invested = Object.values(nodes).filter(n => n && n.fate === FATE.INVESTED).reduce((s, n) => s + n.value, 0)
  const totalComp = nodes.salary.value + nodes.employer.value
  return totalComp > 0 ? (kept + invested + nodes.surplus.value) / totalComp : 0
}

// Cash surplus ÷ cash that actually reached the bank — the number that
// matches lived experience, ignoring CPF and equity entirely.
/**
 * Cash surplus ÷ cash that actually reached the bank — the number that
 * matches lived experience, ignoring CPF and equity entirely.
 * @param {object} flow - The result of {@link buildMonthlyFlow}.
 * @returns {number} The cash savings rate as a decimal.
 */
export function cashSavingsRate(flow) {
  const cashIn = flow.cash
  return cashIn > 0 ? Math.max(0, flow.surplus) / cashIn : 0
}

// Committed CASH obligations (mortgage's cash leg + car + insurance) as a
// fraction of cash reaching the bank — deliberately excludes the CPF-
// funded leg of the mortgage, which is the whole point of FlowState:
// a naive "instalment ÷ take-home" figure overstates this ratio.
/**
 * Committed CASH obligations (mortgage's cash leg + car + insurance) as a
 * fraction of cash reaching the bank — deliberately excludes the
 * CPF-funded leg of the mortgage, which a naive "instalment ÷ take-home"
 * figure would wrongly include.
 * @param {object} flow - The result of {@link buildMonthlyFlow}.
 * @returns {number} The fixed cost ratio as a decimal.
 */
export function fixedCostRatio(flow) {
  const { nodes, mortgage } = flow
  const cashMortgage = mortgage ? mortgage.cashInterest + mortgage.cashPrincipal : 0
  const car = nodes.car ? nodes.car.value : 0
  const insurance = nodes.insurance ? nodes.insurance.value : 0
  const fixed = cashMortgage + car + insurance
  return flow.cash > 0 ? fixed / flow.cash : 0
}

// Months of runway: liquid cash savings ÷ total monthly cash burn
// (everything that left the bank this month, excluding what was
// invested — investments aren't instantly liquid the way a savings
// account is, so counting them would overstate how long you can coast).
/**
 * Months of runway: liquid cash savings ÷ total monthly cash burn
 * (everything that left the bank this month, excluding what was
 * invested — investments aren't instantly liquid).
 * @param {object} flow - The result of {@link buildMonthlyFlow}.
 * @param {number} liquidSavings - Liquid cash savings, in dollars.
 * @returns {number} Months of runway, or Infinity if burn is 0.
 */
export function runwayMonths(flow, liquidSavings) {
  const { nodes, mortgage, surplus } = flow
  const cashMortgage = mortgage ? mortgage.cashInterest + mortgage.cashPrincipal : 0
  const car = nodes.car ? nodes.car.value : 0
  const insurance = nodes.insurance ? nodes.insurance.value : 0
  const living = nodes.living.value
  const burn = cashMortgage + car + insurance + living
  return burn > 0 ? Math.max(0, Number(liquidSavings) || 0) / burn : Infinity
}

// Default emergency-fund target, in months of burn. 6 is the usual
// personal-finance rule of thumb for a single income earner in Singapore;
// exposed as a param (not hardcoded into the function below) so a future
// UI could let someone dial it up/down for their own risk tolerance (e.g.
// dual income households often target less, freelancers more).
export const DEFAULT_EMERGENCY_FUND_MONTHS = 6

// How much liquid cash you'd need sitting in the bank to cover
// `targetMonths` of the SAME monthly cash burn runwayMonths already
// computes (cash mortgage leg + car + insurance + living expenses) —
// and the gap between that target and what's actually there today.
// targetAmount is null when burn is 0 (nothing to insure against).
/**
 * How much liquid cash you'd need to cover `targetMonths` of the same
 * monthly cash burn {@link runwayMonths} computes, and the gap between
 * that target and what's actually there today.
 * @param {object} flow - The result of {@link buildMonthlyFlow}.
 * @param {number} liquidSavings - Current liquid cash savings, in dollars.
 * @param {number} [targetMonths=DEFAULT_EMERGENCY_FUND_MONTHS] - Target months of burn to cover.
 * @returns {{burn: number, targetAmount: (number|null), current: number, gap: number, monthsToClose: null}}
 *   `targetAmount` is null when burn is 0 (nothing to insure against).
 */
export function emergencyFundTarget(flow, liquidSavings, targetMonths = DEFAULT_EMERGENCY_FUND_MONTHS) {
  const { nodes, mortgage } = flow
  const cashMortgage = mortgage ? mortgage.cashInterest + mortgage.cashPrincipal : 0
  const car = nodes.car ? nodes.car.value : 0
  const insurance = nodes.insurance ? nodes.insurance.value : 0
  const living = nodes.living.value
  const burn = cashMortgage + car + insurance + living
  const current = Math.max(0, Number(liquidSavings) || 0)
  if (burn <= 0) return { burn: 0, targetAmount: null, current, gap: 0, monthsToClose: null }
  const targetAmount = burn * targetMonths
  const gap = Math.max(0, targetAmount - current)
  return { burn, targetAmount, current, gap, monthsToClose: null }
}

// Given a monthly amount you can realistically set aside toward the
// emergency fund gap, how many months until the fund is fully topped up.
// Kept separate from emergencyFundTarget so the UI can recompute this
// live as someone adjusts a "how much can I set aside" slider without
// re-deriving the burn/target/gap figures each time.
/**
 * Given a monthly amount set aside toward the emergency fund gap, how
 * many months until the fund is fully topped up. Kept separate from
 * {@link emergencyFundTarget} so the UI can recompute this live as
 * someone adjusts a contribution slider.
 * @param {number} gap - The remaining emergency fund gap, in dollars.
 * @param {number} monthlyContribution - Monthly amount set aside, in dollars.
 * @returns {number} Months to close the gap; 0 if already closed, Infinity if contribution is not positive.
 */
export function monthsToCloseEmergencyFundGap(gap, monthlyContribution) {
  const contribution = Number(monthlyContribution) || 0
  if (gap <= 0) return 0
  if (contribution <= 0) return Infinity
  return Math.ceil(gap / contribution)
}

// ─── Twelve-month timeline: the trough finder ──────────────────────────

// A lumpy annual item: { label, amount, month } (0-indexed, Jan=0), or a
// recurring one via { label, amount, everyMonth: true }. `taxMode`
// controls whether the tax bill lands as one lump in April ('lump') or
// spread evenly across all twelve months via GIRO ('giro') — the single
// highest-leverage lever the tool can show, since it changes nothing
// about the annual total, only its shape.
/**
 * Builds a twelve-month running-balance schedule from a base monthly
 * surplus, an annual tax bill (landing as one lump on `taxDueMonth`, or
 * spread evenly via GIRO per `taxMode`), and any lumpy or recurring
 * annual items.
 * @param {object} params - Schedule inputs.
 * @param {number} params.baseMonthlySurplus - Baseline monthly surplus before tax/lumpy items, in dollars.
 * @param {number} params.annualTax - Annual tax bill, in dollars.
 * @param {string} [params.taxMode='lump'] - 'lump' (all in taxDueMonth) or 'giro' (spread across 12 months).
 * @param {number} [params.taxDueMonth=3] - 0-indexed month the lump tax bill lands in (default April).
 * @param {Array<{label: string, amount: number, month?: number, everyMonth?: boolean}>} [params.lumpyItems=[]] - Annual or recurring items.
 * @param {number} [params.startBalance=0] - Starting bank balance, in dollars.
 * @returns {Array<{month: number, net: number, balance: number, tax: number, lumpy: number}>} The twelve-month schedule.
 */
export function buildTwelveMonthSchedule({ baseMonthlySurplus, annualTax, taxMode = 'lump', taxDueMonth = 3, lumpyItems = [], startBalance = 0 }) {
  const months = 12
  const base = Number(baseMonthlySurplus) || 0
  const tax = Math.max(0, Number(annualTax) || 0)

  const taxByMonth = new Array(months).fill(0)
  if (taxMode === 'giro') {
    for (let m = 0; m < months; m++) taxByMonth[m] = tax / months
  } else if (tax > 0) {
    taxByMonth[Math.min(months - 1, Math.max(0, Number(taxDueMonth) || 0))] = tax
  }

  const lumpyByMonth = new Array(months).fill(0)
  ;(lumpyItems || []).forEach(item => {
    const amt = Number(item.amount) || 0
    if (item.everyMonth) {
      for (let m = 0; m < months; m++) lumpyByMonth[m] += amt
    } else {
      const m = Math.min(months - 1, Math.max(0, Number(item.month) || 0))
      lumpyByMonth[m] += amt
    }
  })

  let running = Number(startBalance) || 0
  const schedule = []
  for (let m = 0; m < months; m++) {
    const net = base - taxByMonth[m] + lumpyByMonth[m]
    running += net
    schedule.push({ month: m, net, balance: running, tax: taxByMonth[m], lumpy: lumpyByMonth[m] })
  }
  return schedule
}

// The month with the lowest running balance, and how far underwater (if
// at all) — the single sentence FlowState exists to produce.
/**
 * The month with the lowest running balance, and how far underwater (if
 * at all) — the single sentence FlowState exists to produce.
 * @param {Array<{month: number, balance: number}>} schedule - A twelve-month schedule (see {@link buildTwelveMonthSchedule}).
 * @returns {?{month: number, balance: number, shortfall: number}} The tightest month, or null if the schedule is empty.
 */
export function findTightestMonth(schedule) {
  if (!schedule || schedule.length === 0) return null
  const worst = schedule.reduce((min, row) => row.balance < min.balance ? row : min, schedule[0])
  return { month: worst.month, balance: worst.balance, shortfall: Math.max(0, -worst.balance) }
}

// What spreading the tax bill across GIRO instalments (instead of one
// lump) does to the trough — the concrete "move this one thing" fix.
/**
 * Compares paying the tax bill as one lump vs. spread across GIRO
 * instalments, and what that does to the tightest-month trough — the
 * concrete "move this one thing" fix. Both schedules end the year at the
 * same balance; GIRO only reshapes the year's shape, not the total.
 * @param {object} params - Same inputs as {@link buildTwelveMonthSchedule} (minus taxMode).
 * @returns {{lump: Array<object>, giro: Array<object>, lumpTrough: object, giroTrough: object, yearEndLump: number, yearEndGiro: number}}
 *   Both schedules, their troughs, and year-end balances.
 */
export function compareGiroToLump({ baseMonthlySurplus, annualTax, taxDueMonth = 3, lumpyItems = [], startBalance = 0 }) {
  const lump = buildTwelveMonthSchedule({ baseMonthlySurplus, annualTax, taxMode: 'lump', taxDueMonth, lumpyItems, startBalance })
  const giro = buildTwelveMonthSchedule({ baseMonthlySurplus, annualTax, taxMode: 'giro', lumpyItems, startBalance })
  return {
    lump, giro,
    lumpTrough: findTightestMonth(lump),
    giroTrough: findTightestMonth(giro),
    // Both end the year identically — GIRO only reshapes the SHAPE of the
    // year, not the total. Asserted in calc.test.js.
    yearEndLump: lump[lump.length - 1].balance,
    yearEndGiro: giro[giro.length - 1].balance,
  }
}
