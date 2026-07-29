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

// "Quick" — a single number.
export function quickLivingExpenses(amount) {
  return Math.max(0, Number(amount) || 0)
}

// "Detailed" — named categories, summed.
export function detailedLivingExpenses(categories) {
  return Object.values(categories || {}).reduce((sum, v) => sum + Math.max(0, Number(v) || 0), 0)
}

// "Back-solve" — nobody remembers what they spend, but a bank balance
// twelve months ago and today pins it exactly: whatever came in and
// isn't in the account went somewhere. `monthlyNonLivingOutflow` is
// everything ELSE already accounted for (mortgage cash leg, car,
// insurance, invested) so it isn't double-subtracted from the balance
// delta, which reflects ALL outflows, not just food-and-shopping ones.
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
export function reconciliationGap(claimedLivingExpenses, backSolvedLivingExpenses) {
  return Math.max(0, (Number(backSolvedLivingExpenses) || 0) - (Number(claimedLivingExpenses) || 0))
}

// ─── Monthly tax provision ──────────────────────────────────────────────

// Prefers an exact figure from TaxWise (accounts for age-banded CPF
// relief, all the reliefs actually claimed, and marginal-rate-correct
// tax) when available; otherwise estimates directly off salary and age
// via calcTax with zero reliefs — a closer estimate than a flat
// percentage, and clearly labeled as an estimate in the UI either way.
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
export function trueSavingsRate(flow) {
  const { nodes } = flow
  const kept = Object.values(nodes).filter(n => n && n.fate === FATE.KEPT).reduce((s, n) => s + n.value, 0)
  const invested = Object.values(nodes).filter(n => n && n.fate === FATE.INVESTED).reduce((s, n) => s + n.value, 0)
  const totalComp = nodes.salary.value + nodes.employer.value
  return totalComp > 0 ? (kept + invested) / totalComp : 0
}

// Cash surplus ÷ cash that actually reached the bank — the number that
// matches lived experience, ignoring CPF and equity entirely.
export function cashSavingsRate(flow) {
  const cashIn = flow.cash
  return cashIn > 0 ? Math.max(0, flow.surplus) / cashIn : 0
}

// Committed CASH obligations (mortgage's cash leg + car + insurance) as a
// fraction of cash reaching the bank — deliberately excludes the CPF-
// funded leg of the mortgage, which is the whole point of FlowState:
// a naive "instalment ÷ take-home" figure overstates this ratio.
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
export function runwayMonths(flow, liquidSavings) {
  const { nodes, mortgage, surplus } = flow
  const cashMortgage = mortgage ? mortgage.cashInterest + mortgage.cashPrincipal : 0
  const car = nodes.car ? nodes.car.value : 0
  const insurance = nodes.insurance ? nodes.insurance.value : 0
  const living = nodes.living.value
  const burn = cashMortgage + car + insurance + living
  return burn > 0 ? Math.max(0, Number(liquidSavings) || 0) / burn : Infinity
}

// ─── Twelve-month timeline: the trough finder ──────────────────────────

// A lumpy annual item: { label, amount, month } (0-indexed, Jan=0), or a
// recurring one via { label, amount, everyMonth: true }. `taxMode`
// controls whether the tax bill lands as one lump in April ('lump') or
// spread evenly across all twelve months via GIRO ('giro') — the single
// highest-leverage lever the tool can show, since it changes nothing
// about the annual total, only its shape.
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
export function findTightestMonth(schedule) {
  if (!schedule || schedule.length === 0) return null
  const worst = schedule.reduce((min, row) => row.balance < min.balance ? row : min, schedule[0])
  return { month: worst.month, balance: worst.balance, shortfall: Math.max(0, -worst.balance) }
}

// What spreading the tax bill across GIRO instalments (instead of one
// lump) does to the trough — the concrete "move this one thing" fix.
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
