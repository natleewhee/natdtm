import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planOnboarding, applyOnboarding, DEFAULT_MORTGAGE } from './onboarding.js'
import { calcTax } from '../tax/calc.js'
import { monthlyPayment } from './loan.js'

const FULL = {
  age: '34', residency: 'citizen', monthlySalary: '8,000', annualBonus: '16000',
  cpfOA: '90000', cpfSA: '60000', cpfMA: '40000',
  home: 'hdb', homeValue: '650000', homeLoan: '300000', homeInstalment: '1400',
  car: 'own', carValue: '80000', carLoan: '50000', carInstalment: '1100',
  investments: '40000', monthlyInvesting: '1000', monthlySpend: '3000',
}

test('skipping everything writes nothing', () => {
  const p = planOnboarding({}, {})
  assert.deepEqual(p.modules, {})
  assert.deepEqual(p.inputs, {})
})

test('a full set of answers fills every relevant slot', () => {
  const { modules, inputs } = planOnboarding(FULL, {})
  assert.deepEqual(Object.keys(modules).sort(), ['drive', 'flow', 'house', 'retire', 'tax'])
  const t = calcTax({ monthlySalary: 8000, annualBonus: 16000, age: 34 })
  assert.equal(modules.tax.annualTax, t.tax)
  assert.equal(modules.tax.monthlyTakeHome, t.monthlyTakeHome)
  assert.equal(modules.tax.marginalRate, t.marginal)
  assert.equal(modules.retire.oaBalance, 90000)
  assert.equal(modules.retire.investmentBalance, 40000)
  assert.equal(modules.house.propertyType, 'hdb')
  assert.equal(modules.house.monthlyInstalment, 1400)
  assert.equal(modules.drive.monthlyInstalment, 1100)
  assert.equal(modules.drive.salary, 8000)
  assert.equal(modules.flow.livingExpenses, 3000)
  assert.equal(inputs.tax.monthlySalary, '8000')
  assert.equal(inputs.retire.currentAge, '34')
  assert.equal(inputs.retire.startingOA, '90000')
  assert.equal(inputs.drive.salaryRaw, '8000')
})

test('a missing mortgage instalment is estimated from the loan, and the assumption is reported', () => {
  const { modules, assumed } = planOnboarding({ home: 'private', homeLoan: '500000' }, {})
  assert.equal(modules.house.monthlyInstalment, Math.round(monthlyPayment(500000, DEFAULT_MORTGAGE.ratePct, DEFAULT_MORTGAGE.remainingYears)))
  assert.ok(assumed.some((s) => s.includes('mortgage')))
})

test('no home and no car write no house or drive slots', () => {
  const { modules } = planOnboarding({ home: 'none', car: 'none', monthlySalary: '5000' }, {})
  assert.equal(modules.house, undefined)
  assert.equal(modules.drive, undefined)
})

test('foreigners are taxed without citizen-only reliefs', () => {
  const c = planOnboarding({ monthlySalary: '12000', age: '40', residency: 'citizen' }, {}).modules.tax
  const f = planOnboarding({ monthlySalary: '12000', age: '40', residency: 'foreigner' }, {}).modules.tax
  assert.equal(c.annualTax, calcTax({ monthlySalary: 12000, age: 40 }).tax)
  assert.equal(f.annualTax, calcTax({ monthlySalary: 12000, age: 40, isForeigner: true }).tax)
})

test('existing synced numbers are kept; only answered fields change', () => {
  const existing = { house: { cashProceeds: 120000, totalCPFRefund: 80000, propertyValue: 1, savedAt: 1, inputs: { x: 1 } } }
  const { modules } = planOnboarding({ home: 'private', homeValue: '900000' }, existing)
  assert.equal(modules.house.cashProceeds, 120000)
  assert.equal(modules.house.totalCPFRefund, 80000)
  assert.equal(modules.house.propertyValue, 900000)
  assert.equal(modules.house.inputs, undefined)
  assert.equal(modules.house.savedAt, undefined)
})

test('a tool\'s typed inputs are never overwritten', () => {
  const existing = { tax: { inputs: { monthlySalary: '9500', srsContribution: '5000' } } }
  const { inputs } = planOnboarding({ monthlySalary: '8000', age: '34' }, existing)
  assert.equal(inputs.tax.monthlySalary, '9500')
  assert.equal(inputs.tax.srsContribution, '5000')
  assert.equal(inputs.tax.age, '34')
})

test('applyOnboarding performs every write and reports failure', () => {
  const calls = []
  const store = { saveModule: (t, v) => { calls.push(['m', t]); return true }, saveToolInputs: (t) => { calls.push(['i', t]); return t !== 'drive' } }
  const plan = planOnboarding(FULL, {})
  assert.equal(applyOnboarding(plan, store), false)
  assert.equal(calls.filter((c) => c[0] === 'm').length, 5)
  assert.ok(calls.some((c) => c[0] === 'i' && c[1] === 'tax'))
})
