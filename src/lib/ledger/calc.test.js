// src/lib/ledger/calc.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildBaselineState, calcNetWorth, calcMonthlyObligations, calcTDSR,
  calcInvestmentCapacity, calcScenarioRetirement, compareScenarios, TDSR_LIMIT,
  calcHousePurchase, calcHouseUpgrade, resolveHouseModule,
  calcMSR, MSR_LIMIT, calcTakeHome, buildCapacitySchedule, levelEquivalentContribution,
} from './calc.js'
import { calcMonthlyInstalment, calcBSD, calcNextPurchase } from '../house/calc.js'

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
  assert.equal(state.house.source, 'auto')
  assert.equal(state.car.loanOutstanding, 60000)
  assert.equal(state.cpf.oa, 80000)
  assert.equal(state.investmentBalance, 150000)
})

test('buildBaselineState reads livingExpenses from the FlowState slot', () => {
  const synced = buildBaselineState({ flow: { livingExpenses: 3200 } })
  assert.equal(synced.livingExpenses, 3200)
  const unsynced = buildBaselineState({})
  assert.equal(unsynced.livingExpenses, 0)
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

test('calcNetWorth includes cash savings', () => {
  const state = { salary: 0, house: null, car: null, cpf: { oa: 0, sa: 0, ma: 0 }, investmentBalance: 0, cashSavings: 50000 }
  const nw = calcNetWorth(state)
  assert.equal(nw.cashSavings, 50000)
  assert.equal(nw.netWorth, 50000)
})

test('calcHousePurchase derives loan/instalment/BSD from price and downpayment %', () => {
  const p = calcHousePurchase({ price: 1000000, downpaymentPct: 25, rate: 2.6, tenureYears: 25 })
  approx(p.downpaymentAmount, 250000)
  approx(p.loanAmount, 750000)
  approx(p.monthlyInstalment, calcMonthlyInstalment(750000, 2.6, 25))
  approx(p.bsd, calcBSD(1000000))
  approx(p.cashNeeded, 250000 + calcBSD(1000000))
})

test('calcHousePurchase defaults to a 75% loan (25% down)', () => {
  const p = calcHousePurchase({ price: 800000, rate: 2.6, tenureYears: 25 })
  approx(p.loanAmount, 600000)
})

test('resolveHouseModule passes through an existing-mortgage shape unchanged', () => {
  const { resolved, cashImpact, detail } = resolveHouseModule({ outstandingBalance: 400000, monthlyInstalment: 2500, propertyValue: 1200000 })
  assert.equal(resolved.outstandingBalance, 400000)
  assert.equal(cashImpact, 0)
  assert.equal(detail, null)
})

test('resolveHouseModule computes a purchase-mode house into the resolved shape', () => {
  const { resolved, cashImpact, detail } = resolveHouseModule({ mode: 'purchase', price: 1000000, downpaymentPct: 25, rate: 2.6, tenureYears: 25 })
  assert.equal(resolved.propertyValue, 1000000)
  approx(resolved.outstandingBalance, 750000)
  approx(resolved.monthlyInstalment, calcMonthlyInstalment(750000, 2.6, 25))
  assert.ok(cashImpact < 0) // a plain purchase only ever draws down cash
  assert.ok(detail != null)
})

// ─── Joint loan share (yourSharePct) ──────────────────────────────────────

test('resolveHouseModule defaults to a 100% (sole) share', () => {
  const { resolved } = resolveHouseModule({ outstandingBalance: 400000, monthlyInstalment: 2500, propertyValue: 1200000 })
  approx(resolved.outstandingBalance, 400000)
  approx(resolved.monthlyInstalment, 2500)
  approx(resolved.propertyValue, 1200000)
})

test('resolveHouseModule scales an existing mortgage by yourSharePct', () => {
  const { resolved } = resolveHouseModule({ outstandingBalance: 400000, monthlyInstalment: 2500, propertyValue: 1200000, yourSharePct: 50 })
  approx(resolved.outstandingBalance, 200000)
  approx(resolved.monthlyInstalment, 1250)
  approx(resolved.propertyValue, 600000)
})

test('a joint-loan scenario nets the same equity fraction as a sole-loan one', () => {
  // 50% of (1.2m − 400k) should equal (600k − 200k) — scaling asset and
  // liability together preserves your true equity share, rather than
  // scaling only the liability and inflating apparent net worth.
  const sole = resolveHouseModule({ outstandingBalance: 400000, monthlyInstalment: 2500, propertyValue: 1200000 })
  const joint = resolveHouseModule({ outstandingBalance: 400000, monthlyInstalment: 2500, propertyValue: 1200000, yourSharePct: 50 })
  const soleEquity = sole.resolved.propertyValue - sole.resolved.outstandingBalance
  const jointEquity = joint.resolved.propertyValue - joint.resolved.outstandingBalance
  approx(jointEquity, soleEquity * 0.5)
})

test('resolveHouseModule: an explicit 0% share is genuinely 0%, not silently coerced to 100% (falsy-coercion trap)', () => {
  const { resolved } = resolveHouseModule({ outstandingBalance: 400000, monthlyInstalment: 2500, propertyValue: 1200000, yourSharePct: 0 })
  approx(resolved.outstandingBalance, 0)
  approx(resolved.monthlyInstalment, 0)
  approx(resolved.propertyValue, 0)
})

test('resolveHouseModule clamps a share above 100% down to 100%, not leaving it unclamped', () => {
  const { resolved } = resolveHouseModule({ outstandingBalance: 400000, monthlyInstalment: 2500, propertyValue: 1200000, yourSharePct: 150 })
  approx(resolved.outstandingBalance, 400000)
  approx(resolved.monthlyInstalment, 2500)
  approx(resolved.propertyValue, 1200000)
})

test('resolveHouseModule clamps a negative share up to 0%, not leaving it negative', () => {
  const { resolved } = resolveHouseModule({ outstandingBalance: 400000, monthlyInstalment: 2500, propertyValue: 1200000, yourSharePct: -20 })
  approx(resolved.outstandingBalance, 0)
  approx(resolved.monthlyInstalment, 0)
  approx(resolved.propertyValue, 0)
})

test('resolveHouseModule scales a purchase-mode house by yourSharePct too', () => {
  const full = resolveHouseModule({ mode: 'purchase', price: 1000000, downpaymentPct: 25, rate: 2.6, tenureYears: 25 })
  const half = resolveHouseModule({ mode: 'purchase', price: 1000000, downpaymentPct: 25, rate: 2.6, tenureYears: 25, yourSharePct: 50 })
  approx(half.resolved.propertyValue, full.resolved.propertyValue * 0.5)
  approx(half.resolved.outstandingBalance, full.resolved.outstandingBalance * 0.5)
  approx(half.resolved.monthlyInstalment, full.resolved.monthlyInstalment * 0.5)
  // cashImpact (what you actually pay upfront) is NOT scaled — the
  // downpayment/BSD/fees required from cash savings stay the real,
  // full amount regardless of ownership split.
  approx(half.cashImpact, full.cashImpact)
})

test('resolveHouseModule handles a null house', () => {
  const { resolved, cashImpact, detail } = resolveHouseModule(null)
  assert.equal(resolved, null)
  assert.equal(cashImpact, 0)
  assert.equal(detail, null)
})

test('calcHouseUpgrade matches HouseMuch\'s own calcNextPurchase math', () => {
  const u = calcHouseUpgrade({
    cashProceeds: 500000, totalCPFRefund: 150000,
    price: 1500000, downpaymentPct: 25, rate: 2.6, tenureYears: 25, otherFees: 5000,
  })
  const loanAmount = 1500000 * 0.75
  const expected = calcNextPurchase(
    { newPrice: 1500000, newLoanAmount: loanAmount, newLoanTenure: 25, newMortgageRate: 2.6, absd: 0, otherFees: 5000 },
    { cashProceeds: 500000, totalCPFRefund: 150000 },
  )
  approx(u.loanAmount, loanAmount)
  approx(u.monthlyInstalment, expected.newMonthlyInstalment)
  approx(u.bsd, expected.bsd)
  approx(u.gap, expected.gap)
  assert.equal(u.surplus, expected.surplus)
})

test('resolveHouseModule on an upgrade with enough proceeds returns a positive cashImpact (surplus)', () => {
  const { resolved, cashImpact, detail } = resolveHouseModule({
    mode: 'upgrade', cashProceeds: 2000000, totalCPFRefund: 200000,
    price: 1000000, downpaymentPct: 25, rate: 2.6, tenureYears: 25,
  })
  assert.equal(resolved.propertyValue, 1000000)
  assert.ok(detail.surplus)
  assert.ok(cashImpact > 0) // leftover proceeds top up cash savings
})

test('resolveHouseModule on an upgrade with insufficient proceeds returns a negative cashImpact (shortfall)', () => {
  const { cashImpact, detail } = resolveHouseModule({
    mode: 'upgrade', cashProceeds: 100000, totalCPFRefund: 50000,
    price: 2000000, downpaymentPct: 25, rate: 2.6, tenureYears: 25,
  })
  assert.ok(!detail.surplus)
  assert.ok(cashImpact < 0) // shortfall draws from cash savings
})

test('calcMonthlyObligations sums mortgage + car instalments', () => {
  const state = { house: { monthlyInstalment: 2500 }, car: { monthlyInstalment: 1200 } }
  const o = calcMonthlyObligations(state)
  assert.equal(o.mortgage, 2500)
  assert.equal(o.car, 1200)
  assert.equal(o.debt, 3700)
  assert.equal(o.total, 3700)
})

test('calcMonthlyObligations separates insurance from debt', () => {
  const state = { house: { monthlyInstalment: 2500 }, car: { monthlyInstalment: 1200 }, insurancePremium: 500 }
  const o = calcMonthlyObligations(state)
  assert.equal(o.insurance, 500)
  assert.equal(o.debt, 3700)   // what a bank counts
  assert.equal(o.total, 4200)  // what actually leaves your account
})

test('calcTDSR excludes insurance premiums, since banks do too', () => {
  const withoutIns = calcTDSR({ salary: 10_000, house: { monthlyInstalment: 3000 }, car: null })
  const withIns = calcTDSR({ salary: 10_000, house: { monthlyInstalment: 3000 }, car: null, insurancePremium: 800 })
  approx(withIns.tdsr, withoutIns.tdsr)
})

test('calcInvestmentCapacity does subtract insurance premiums', () => {
  const state = { salary: 10_000, house: { monthlyInstalment: 3000 }, car: null, insurancePremium: 800 }
  approx(calcInvestmentCapacity(state), 10_000 * 0.8 - 3000 - 800)
})

test('calcInvestmentCapacity subtracts FlowState-measured living expenses once synced', () => {
  const state = { salary: 8000, house: { monthlyInstalment: 1815 }, car: null, insurancePremium: 280, livingExpenses: 3200 }
  approx(calcInvestmentCapacity(state), 8000 * 0.8 - 1815 - 280 - 3200)
})

test('calcInvestmentCapacity is unchanged when FlowState has never run (no livingExpenses field)', () => {
  const withField = { salary: 8000, house: { monthlyInstalment: 1815 }, car: null, insurancePremium: 280, livingExpenses: 0 }
  const withoutField = { salary: 8000, house: { monthlyInstalment: 1815 }, car: null, insurancePremium: 280 }
  approx(calcInvestmentCapacity(withField), calcInvestmentCapacity(withoutField))
})

test('calcTDSR and calcMSR exclude living expenses, since banks do too', () => {
  const withoutLiving = calcTDSR({ salary: 10_000, house: { monthlyInstalment: 3000 }, car: null })
  const withLiving = calcTDSR({ salary: 10_000, house: { monthlyInstalment: 3000 }, car: null, livingExpenses: 3200 })
  approx(withLiving.tdsr, withoutLiving.tdsr)
})

// ─── MSR ─────────────────────────────────────────────────────────────────

test('calcMSR does not apply to private property', () => {
  const m = calcMSR({ salary: 10_000, house: { monthlyInstalment: 4000, propertyType: 'private' } })
  assert.equal(m.applicable, false)
  assert.equal(m.msr, null)
  assert.equal(m.exceeded, false)
})

test('calcMSR flags an HDB loan above 30% of gross income', () => {
  const m = calcMSR({ salary: 10_000, house: { monthlyInstalment: 3500, propertyType: 'hdb' } })
  assert.equal(m.applicable, true)
  approx(m.msr, 0.35)
  assert.equal(m.exceeded, true)
})

test('calcMSR counts only the property loan, not the car', () => {
  const m = calcMSR({ salary: 10_000, house: { monthlyInstalment: 2500, propertyType: 'hdb' }, car: { monthlyInstalment: 2000 } })
  approx(m.msr, 0.25)
  assert.equal(m.exceeded, false)
})

test('MSR can bind where TDSR passes — the case the suite used to miss', () => {
  // 32% MSR but only 32% TDSR: a bank rejects this HDB loan even though
  // it is comfortably inside the 55% TDSR limit.
  const state = { salary: 10_000, house: { monthlyInstalment: 3200, propertyType: 'hdb' }, car: null }
  assert.equal(calcTDSR(state).exceeded, false)
  assert.equal(calcMSR(state).exceeded, true)
  assert.ok(MSR_LIMIT < TDSR_LIMIT)
})

// ─── Take-home ───────────────────────────────────────────────────────────

test('calcTakeHome falls back to 80% of gross when TaxWise has not run', () => {
  const t = calcTakeHome({ salary: 10_000 })
  approx(t.takeHome, 8_000)
  assert.equal(t.exact, false)
})

test('calcTakeHome prefers an exact TaxWise figure when present', () => {
  const t = calcTakeHome({ salary: 10_000, monthlyTakeHome: 7_240 })
  approx(t.takeHome, 7_240)
  assert.equal(t.exact, true)
})

// ─── Time-phased capacity ────────────────────────────────────────────────

test('buildCapacitySchedule steps capacity up when a loan ends', () => {
  const state = {
    salary: 10_000,
    house: { monthlyInstalment: 2000, tenureRemaining: 10 },
    car: { monthlyInstalment: 1000, tenureRemaining: 5 },
  }
  const schedule = buildCapacitySchedule(state, 12 * 20)
  approx(schedule[0], 8000 - 3000)            // both loans running
  approx(schedule[12 * 5], 8000 - 2000)       // car paid off
  approx(schedule[12 * 10], 8000)             // mortgage paid off too
})

test('buildCapacitySchedule treats a null tenure as running forever', () => {
  const state = { salary: 10_000, house: { monthlyInstalment: 2000, tenureRemaining: null }, car: null }
  const schedule = buildCapacitySchedule(state, 12 * 30)
  approx(schedule[schedule.length - 1], 6000)
})

test('buildCapacitySchedule keeps insurance running for the whole period', () => {
  const state = { salary: 10_000, insurancePremium: 500, car: { monthlyInstalment: 1000, tenureRemaining: 3 } }
  const schedule = buildCapacitySchedule(state, 12 * 10)
  approx(schedule[0], 8000 - 1500)
  approx(schedule[schedule.length - 1], 8000 - 500) // car gone, insurance stays
})

test('buildCapacitySchedule keeps living expenses running for the whole period too, like insurance', () => {
  const state = { salary: 10_000, livingExpenses: 3000, car: { monthlyInstalment: 1000, tenureRemaining: 3 } }
  const schedule = buildCapacitySchedule(state, 12 * 10)
  approx(schedule[0], 8000 - 4000)
  approx(schedule[schedule.length - 1], 8000 - 3000) // car gone, living expenses stay
})

test('levelEquivalentContribution matches the flat case exactly', () => {
  const flat = new Array(120).fill(1000)
  approx(levelEquivalentContribution(flat, 3), 1000, 0.5)
})

test('levelEquivalentContribution of a rising schedule sits between its endpoints', () => {
  const state = { salary: 10_000, car: { monthlyInstalment: 2000, tenureRemaining: 5 } }
  const schedule = buildCapacitySchedule(state, 12 * 20)
  const level = levelEquivalentContribution(schedule, 3)
  assert.ok(level > schedule[0], 'above the constrained early years')
  assert.ok(level < schedule[schedule.length - 1], 'below the unconstrained later years')
})

test('levelEquivalentContribution handles a zero return without dividing by zero', () => {
  const schedule = [1000, 2000, 3000]
  approx(levelEquivalentContribution(schedule, 0), 2000)
})

test('a car loan that ends beats one that never does — the time-phasing fix', () => {
  // Same instalment, but a 7-year tenure rather than an open-ended one.
  const base = { salary: 10_000, cpf: { oa: 0, sa: 0, ma: 0 }, investmentBalance: 0, house: null }
  const assumptions = {
    currentAge: 35, retirementAge: 65, lifeExpectancy: 90,
    desiredMonthlyWithdrawal: 3000, inflationRate: 2.5, swr: 3, investmentReturn: 4,
  }
  const ending = calcScenarioRetirement({ ...base, car: { monthlyInstalment: 1500, tenureRemaining: 7 } }, assumptions)
  const forever = calcScenarioRetirement({ ...base, car: { monthlyInstalment: 1500, tenureRemaining: null } }, assumptions)
  assert.ok(
    ending.target.projectedPortfolio > forever.target.projectedPortfolio,
    'a loan that ends should leave more invested by retirement',
  )
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
