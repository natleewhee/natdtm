// src/lib/ledger/scenario/solve.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { solveSustainableWithdrawal } from './solve.js'
import { calcRetirementTarget, simulateDepletion } from '../../retire/calc.js'

const BASE = {
  currentAge: 40, retirementAge: 65, lifeExpectancy: 90,
  inflationRate: 2.5, investmentReturn: 4,
}

// Independent "does it last?" oracle, mirroring the engine composition.
function lasts(w, portfolio, a = BASE) {
  const target = calcRetirementTarget(
    { ...a, desiredMonthlyWithdrawal: w },
    { investmentFinal: portfolio, oaFinal: 0, saFinal: 0, months: (a.retirementAge - a.currentAge) * 12 },
  )
  return simulateDepletion(
    { retirementAge: a.retirementAge, lifeExpectancy: a.lifeExpectancy, inflationRate: a.inflationRate, investmentReturn: a.investmentReturn },
    target.projectedPortfolio, target.inflatedMonthlyWithdrawal,
  ).lastsToLifeExpectancy
}

test('the solved withdrawal is the depletion crossing point', () => {
  const { monthly } = solveSustainableWithdrawal(1_500_000, BASE)
  assert.ok(monthly > 0)
  assert.ok(lasts(monthly, 1_500_000), `portfolio should last at the solved ${monthly}`)
  assert.ok(!lasts(monthly + 100, 1_500_000), `portfolio should NOT last at ${monthly + 100}`)
})

test('the exponential ceiling finds a draw above the old fixed 2x ceiling for a high-return bundle', () => {
  // equity 8%, inflation 0%, 25-year retirement — with the annuity factor
  // above 2 at this return/horizon, the truly sustainable draw exceeds
  // portfolio / (yearsInRetirement * 12) * 2, which the old fixed ceiling
  // capped it at. The exponential search must climb past that.
  const a = { currentAge: 40, retirementAge: 65, lifeExpectancy: 90, inflationRate: 0, investmentReturn: 8 }
  const portfolio = 1_200_000
  const oldFixedCeiling = (portfolio / ((a.lifeExpectancy - a.retirementAge) * 12)) * 2
  const { monthly } = solveSustainableWithdrawal(portfolio, a)
  assert.ok(monthly > oldFixedCeiling, `solved ${monthly} should exceed the old fixed ceiling ${oldFixedCeiling}`)
  assert.ok(lasts(monthly, portfolio, a), 'the solved value is a real crossing, not a cap')
  assert.ok(!lasts(monthly + 100, portfolio, a))
})

test('a larger portfolio yields a strictly larger sustainable withdrawal', () => {
  const small = solveSustainableWithdrawal(800_000, BASE).monthly
  const big = solveSustainableWithdrawal(1_600_000, BASE).monthly
  assert.ok(big > small, `${big} should exceed ${small}`)
})

test('residual cash raises the solved withdrawal', () => {
  const withoutCash = solveSustainableWithdrawal(1_000_000, BASE).monthly
  const withCash = solveSustainableWithdrawal(1_100_000, BASE).monthly
  assert.ok(withCash > withoutCash)
})

test('a higher inflation rate lowers the sustainable withdrawal for the same portfolio', () => {
  const lowInf = solveSustainableWithdrawal(1_200_000, { ...BASE, inflationRate: 1 }).monthly
  const highInf = solveSustainableWithdrawal(1_200_000, { ...BASE, inflationRate: 5 }).monthly
  assert.ok(highInf < lowInf, `${highInf} should be below ${lowInf}`)
})

test('swr does not affect the solved withdrawal — the solver keys off depletion, not the nest-egg target', () => {
  const a = solveSustainableWithdrawal(1_300_000, { ...BASE, swr: 3 }).monthly
  const b = solveSustainableWithdrawal(1_300_000, { ...BASE, swr: 10 }).monthly
  assert.equal(a, b)
})

test('a zero portfolio returns ~0 without looping', () => {
  const { monthly, tolerance } = solveSustainableWithdrawal(0, BASE)
  assert.equal(monthly, 0)
  assert.equal(tolerance, 25)
})

test('a non-positive drawdown horizon returns 0 instead of an astronomical figure or a hang', () => {
  // Plan-until age at (or below) retirement age: simulateDepletion never
  // draws down, so every withdrawal "lasts". Must be rejected, not
  // exponential-searched into ~1e17.
  for (const lifeExpectancy of [65, 64, 65.4]) {
    const { monthly } = solveSustainableWithdrawal(1_500_000, { ...BASE, retirementAge: 65, lifeExpectancy })
    assert.equal(monthly, 0, `lifeExpectancy ${lifeExpectancy} should solve to 0`)
  }
})

test('the returned value sits within tolerance of a hand-bisected crossing', () => {
  const portfolio = 1_000_000
  // Hand bisection to a tight bound.
  let lo = 0, hi = 100_000
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (lasts(mid, portfolio)) lo = mid
    else hi = mid
  }
  const trueCrossing = lo
  const { monthly, tolerance } = solveSustainableWithdrawal(portfolio, BASE)
  assert.ok(Math.abs(monthly - trueCrossing) <= tolerance, `${monthly} within ${tolerance} of ${trueCrossing}`)
})
