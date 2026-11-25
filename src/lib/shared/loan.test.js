import { test } from 'node:test'
import assert from 'node:assert/strict'
import { monthlyPayment, balanceAfter, interestPaid, fvAnnuityFactor } from './loan.js'

// Characterisation oracles: verbatim copies of the formulas that lived in
// house/calc.js, ledger/calc.js and retire/calc.js before they were
// consolidated here (super-app plan, U3 / KTD1). loan.js must agree with
// them to the cent on a grid of inputs.
const legacy = {
  houseInstalment(P, ratePct, years) {
    const r = ratePct / 100 / 12, n = years * 12
    if (P <= 0 || n <= 0) return 0
    if (r <= 0) return P / n
    return P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  },
  houseBalance(P, ratePct, years, t) {
    const r = ratePct / 100 / 12, n = years * 12
    if (P <= 0 || n <= 0) return 0
    t = Math.min(Math.max(0, t), n)
    if (r <= 0) return P * (1 - t / n)
    return P * (Math.pow(1 + r, n) - Math.pow(1 + r, t)) / (Math.pow(1 + r, n) - 1)
  },
  ledgerAnnuityFactor: (r, n) => (Math.pow(1 + r, n) - 1) / r,
  retireFvFactor: (r, n) => (Math.pow(1 + r, n) - 1) / r,
}

const PRINCIPALS = [0, 1, 50_000, 380_000, 1_250_000, 4_800_000]
const RATES = [0, 0.5, 2.6, 3.75, 4.2, 8]
const TENURES = [1, 5, 25, 30, 35]
const cents = (x) => Math.round(x * 100)

test('monthlyPayment agrees with the legacy HouseMuch instalment on the grid', () => {
  for (const P of PRINCIPALS) for (const r of RATES) for (const y of TENURES) {
    assert.equal(cents(monthlyPayment(P, r, y)), cents(legacy.houseInstalment(P, r, y)), `P=${P} r=${r} y=${y}`)
  }
})

test('balanceAfter agrees with the legacy HouseMuch balance on the grid', () => {
  for (const P of PRINCIPALS) for (const r of RATES) for (const y of TENURES) {
    for (const t of [0, 1, 12, 60, y * 6, y * 12, y * 12 + 24, -5]) {
      assert.equal(cents(balanceAfter(P, r, y, t)), cents(legacy.houseBalance(P, r, y, t)), `P=${P} r=${r} y=${y} t=${t}`)
    }
  }
})

test('fvAnnuityFactor agrees with the legacy ledger and retire factors for r > 0', () => {
  for (const annual of [0.5, 3, 5, 7, 12]) for (const n of [1, 12, 120, 360, 480]) {
    const r = annual / 100 / 12
    assert.equal(cents(fvAnnuityFactor(r, n)), cents(legacy.ledgerAnnuityFactor(r, n)))
    assert.equal(cents(fvAnnuityFactor(r, n)), cents(legacy.retireFvFactor(r, n)))
  }
})

test('edge cases: zero rate, zero tenure, junk input', () => {
  assert.equal(monthlyPayment(120_000, 0, 10), 1000)
  assert.equal(monthlyPayment(120_000, 3, 0), 0)
  assert.equal(monthlyPayment(NaN, 3, 25), 0)
  assert.equal(monthlyPayment('500000', '3', '25'), monthlyPayment(500_000, 3, 25))
  assert.equal(balanceAfter(120_000, 0, 10, 60), 60_000)
  assert.equal(balanceAfter(120_000, 3, 10, 120), 0)
  assert.equal(fvAnnuityFactor(0, 24), 24)
  assert.equal(fvAnnuityFactor(0.01, 0), 0)
})

test('a fully repaid loan has zero balance and interest equal to total paid minus principal', () => {
  const P = 500_000, r = 3, y = 25
  assert.ok(Math.abs(balanceAfter(P, r, y, y * 12)) < 1e-6)
  const total = monthlyPayment(P, r, y) * y * 12
  assert.equal(cents(interestPaid(P, r, y, y * 12)), cents(total - P))
  assert.ok(interestPaid(P, r, y, 0) < 1e-6)
  assert.ok(interestPaid(P, 0, y, 60) < 1e-6)
})

test('known value: S$500k at 3% over 25 years is S$2,371.06 a month', () => {
  assert.equal(monthlyPayment(500_000, 3, 25).toFixed(2), '2371.06')
})
