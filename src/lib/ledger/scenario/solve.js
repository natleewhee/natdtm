// src/lib/ledger/scenario/solve.js
// Sustainable-withdrawal solver for the scenario planner. RetireWell
// exposes no sustainable-withdrawal figure — simulateDepletion only
// answers the yes/no question "does this portfolio outlast life
// expectancy at this withdrawal?" — so the headline is found by
// bisecting that boolean.
//
// The upper bound is NOT a fixed multiple of portfolio / months: for a
// high-return bundle the truly sustainable draw runs well above that, and
// a fixed ceiling would silently pin the Optimistic band low. Instead the
// ceiling is found by exponential search — double it until the portfolio
// can no longer sustain it — then bisect. Pure — no React, no fetch.

import { calcRetirementTarget, simulateDepletion } from '../../retire/calc.js'

const TOLERANCE = 25 // dollars per month
const MAX_DOUBLINGS = 40

// liquidBase: the combined liquid figure at retirement — CPF OA + SA +
//   investments + residual cash. Property equity is never part of it (KD3).
// retireAssumptions: { currentAge, retirementAge, lifeExpectancy,
//   inflationRate, investmentReturn } (swr is accepted but does not
//   affect the result — the solver keys off depletion, not the nest-egg
//   target).
export function solveSustainableWithdrawal(liquidBase, retireAssumptions = {}) {
  const {
    currentAge = 0, retirementAge = 0, lifeExpectancy = 90,
    inflationRate = 0, investmentReturn = 0, swr = 0,
  } = retireAssumptions

  const portfolio = Math.max(0, Number(liquidBase) || 0)
  if (portfolio <= 0) return { monthly: 0, tolerance: TOLERANCE }

  // A non-positive drawdown horizon (plan-until age at or below retirement
  // age) makes simulateDepletion's loop never run, so every withdrawal
  // "lasts" and the exponential search below would run away to a
  // meaningless ceiling. Reject it rather than emit an astronomical figure.
  const horizonYears = Math.round(lifeExpectancy - retirementAge)
  if (horizonYears < 1) return { monthly: 0, tolerance: TOLERANCE }

  const yearsInRetirement = horizonYears
  const monthsToRetirement = Math.max(0, Math.round((retirementAge - currentAge) * 12))
  const accumulation = { investmentFinal: portfolio, oaFinal: 0, saFinal: 0, months: monthsToRetirement }

  // Does the portfolio outlast life expectancy at monthly withdrawal `w`
  // (stated in today's dollars — the engine inflates it to the retirement
  // year and escalates it through the drawdown)?
  const lasts = (w) => {
    const target = calcRetirementTarget(
      { currentAge, retirementAge, desiredMonthlyWithdrawal: w, inflationRate, investmentReturn, swr },
      accumulation,
    )
    const depletion = simulateDepletion(
      { retirementAge, lifeExpectancy, inflationRate, investmentReturn },
      target.projectedPortfolio,
      target.inflatedMonthlyWithdrawal,
    )
    return depletion.lastsToLifeExpectancy
  }

  // Exponential search for a ceiling the portfolio cannot sustain.
  let hi = portfolio / (yearsInRetirement * 12)
  if (!(hi > 0)) hi = 1
  let doublings = 0
  while (doublings < MAX_DOUBLINGS && lasts(hi)) {
    hi *= 2
    doublings++
  }
  // If even 2^40x the seed still "lasts", the depletion model isn't
  // constraining the draw (a degenerate horizon slipped past the guard
  // above, or a pathological rate combination). Don't bisect toward a
  // meaningless ceiling — report zero so the UI shows no usable figure.
  if (lasts(hi)) return { monthly: 0, tolerance: TOLERANCE }

  // Bisect [0, hi] — withdrawing $0 always lasts, so 0 is a valid floor.
  let lo = 0
  while (hi - lo > TOLERANCE) {
    const mid = (lo + hi) / 2
    if (lasts(mid)) lo = mid
    else hi = mid
  }

  return { monthly: lo, tolerance: TOLERANCE }
}
