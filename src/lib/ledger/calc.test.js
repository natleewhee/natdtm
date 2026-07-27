// src/lib/ledger/calc.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildBaselineState, calcNetWorth, calcMonthlyObligations, calcTDSR,
  calcInvestmentCapacity, calcScenarioRetirement, compareScenarios, TDSR_LIMIT,
} from './calc.js'

function approx(a, b, eps = 0.01) {
  assert.ok(Math.abs(a - b) <= eps, `expected ${a} ≈ ${b}`)
}

test('buildBaselineState fills from a full My Numbers snapshot', () => {
  const state = buildBaselineState({
    house: { outstandingBalance: 400000, monthlyInstalment: 2500, propertyValue: 1200000 },
    drive: { salary: 6000, loanOutstanding: 60000, monthlyInstalment: 1200, carValue: 90000 },
    retire: { salary: 7000, oaBalance: 80000, saBalance: 60000, maBalance: 40000, investmentBalance: 150000 },
  })
  assert.equal(state.salary, 7000) // retire salary wins over drive salary
  assert.equal(state.house.outstandingBalance, 400000)
  assert.equal(state.car.loanOutstanding, 60000)
  assert.equal(state.cpf.oa, 80000)
  assert.equal(state.investmentBalance, 150000)
})

test('buildBaselineState handles empty/missing modules', () => {
  const state = buildBaselineState({})
  assert.equal(state.salary, 0)
  assert.equal(state.house, null)
  assert.equal(state.car, null)
  assert.deepEqual(state.cpf, { oa: 0, sa: 0, ma: 0 })
})

test('calcNetWorth sums equity across house, car, CPF, investments', () => {
  const state = {
    salary: 0,
    house: { outstandingBalance: 400000, monthlyInstalment: 0, propertyValue: 1200000 },
    car: { loanOutstanding: 60000, monthlyInstalment: 0, carValue: 90000 },
    cpf: { oa: 80000, sa: 60000, ma: 40000 },
    investmentBalance: 150000,
  }
  const nw = calcNetWorth(state)
  approx(nw.propertyEquity, 800000)
  approx(nw.carEquity, 30000)
  approx(nw.cpfTotal, 180000)
  approx(nw.netWorth, 800000 + 30000 + 180000 + 150000)
})

test('calcNetWorth treats a null module as zero equity', () => {
  const state = { salary: 0, house: null, car: null, cpf: { oa: 0, sa: 0, ma: 0 }, investmentBalance: 0 }
  const nw = calcNetWorth(state)
  assert.equal(nw.netWorth, 0)
})

test('calcMonthlyObligations sums mortgage + car instalments', () => {
  const state = { house: { monthlyInstalment: 2500 }, car: { monthlyInstalment: 1200 } }
  const o = calcMonthlyObligations(state)
  assert.equal(o.mortgage, 2500)
  assert.equal(o.car, 1200)
  assert.equal(o.total, 3700)
})

test('calcTDSR flags when obligations exceed the shared TDSR limit', () => {
  const state = { salary: 5000, house: { monthlyInstalment: 2000 }, car: { monthlyInstalment: 1000 } }
  const t = calcTDSR(state)
  approx(t.tdsr, 3000 / 5000)
  assert.equal(t.exceeded, (3000 / 5000) > TDSR_LIMIT)
})

test('calcTDSR returns null tdsr when salary is zero', () => {
  const t = calcTDSR({ salary: 0, house: null, car: null })
  assert.equal(t.tdsr, null)
  assert.equal(t.exceeded, false)
})

test('calcInvestmentCapacity is take-home minus obligations, floored at zero', () => {
  const state = { salary: 8000, house: { monthlyInstalment: 2500 }, car: { monthlyInstalment: 1000 } }
  const capacity = calcInvestmentCapacity(state)
  approx(capacity, 8000 * 0.8 - 3500)
})

test('calcInvestmentCapacity floors at zero when obligations exceed take-home', () => {
  const state = { salary: 3000, house: { monthlyInstalment: 2000 }, car: { monthlyInstalment: 1500 } }
  const capacity = calcInvestmentCapacity(state)
  assert.equal(capacity, 0)
})

test('calcScenarioRetirement feeds investment capacity into the RetireWell engine', () => {
  const state = {
    salary: 8000, house: { monthlyInstalment: 2500 }, car: null,
    cpf: { oa: 50000, sa: 40000, ma: 30000 }, investmentBalance: 100000,
  }
  const result = calcScenarioRetirement(state, {
    currentAge: 40, retirementAge: 65, lifeExpectancy: 90,
    desiredMonthlyWithdrawal: 3000, inflationRate: 2.5, swr: 3, investmentReturn: 3,
  })
  assert.ok(result.accumulation.investmentFinal > 100000)
  assert.equal(result.target.desiredMonthlyWithdrawal, 3000)
})

test('compareScenarios returns one row per scenario with consistent shape', () => {
  const baseline = { salary: 8000, house: { monthlyInstalment: 2500, outstandingBalance: 400000, propertyValue: 1200000 }, car: null, cpf: { oa: 50000, sa: 40000, ma: 30000 }, investmentBalance: 100000 }
  const withCar = { ...baseline, car: { monthlyInstalment: 1200, loanOutstanding: 60000, carValue: 90000 } }
  const rows = compareScenarios(
    [{ label: 'Baseline', state: baseline }, { label: 'Buy a car', state: withCar }],
    { currentAge: 40, retirementAge: 65, lifeExpectancy: 90, desiredMonthlyWithdrawal: 3000, inflationRate: 2.5, swr: 3, investmentReturn: 3 },
  )
  assert.equal(rows.length, 2)
  assert.equal(rows[0].label, 'Baseline')
  assert.equal(rows[1].label, 'Buy a car')
  // Buying a car raises obligations and lowers investment capacity, so
  // the projected retirement portfolio should come out lower.
  assert.ok(rows[1].investmentCapacity < rows[0].investmentCapacity)
  assert.ok(rows[1].retirement.target.projectedPortfolio < rows[0].retirement.target.projectedPortfolio)
})
