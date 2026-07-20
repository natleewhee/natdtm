// src/lib/solve.js
// "What would make this affordable?" — reverse-solves concrete adjustments
// (extra downpayment, shorter/longer tenure) against the real calc() engine,
// rather than hand-derived formulas that can drift from it. calc() is used
// as the oracle for every search here so these suggestions can never
// contradict the numbers shown elsewhere on the page.

import { calc, calcCeiling } from './calc.js'

const MAX_TENURE = 7 // matches the tenure slider's range in the UI

// A result only counts as "actually fixed" if it clears both the in-app
// comfort ratio AND the bank's TDSR ceiling — a scenario that's comfortable
// by our 30% heuristic but still fails TDSR (because of existing debt)
// isn't a real fix, since a bank could reject it regardless.
const passes = (r, targetRatio) => r && r.canDown && r.ratio <= targetRatio && !r.tdsrExceeded

// Binary-search the minimum extra downpayment (on top of `down`) needed to
// bring the burden ratio to `targetRatio` (and clear TDSR) at the current
// tenure. `calcFn` defaults to the new-car calc() but must be swapped for
// calcUsed() (src/lib/used-car.js) when solving for a used car — calc()
// reads car.loanCap directly and would silently produce NaN for a used-car
// object, which derives loanCap internally instead. Returns:
//   0     — already at or under the target
//   null  — unachievable via downpayment alone, even at down = car.price
//   n > 0 — extra S$ needed, rounded up to the nearest dollar
export function solveExtraDownNeeded(salary, down, tenure, car, liveCOE, existingDebt = 0, targetRatio = 0.30, calcFn = calc) {
  const current = calcFn(salary, down, tenure, car, liveCOE, existingDebt)
  if (!current) return null
  if (passes(current, targetRatio)) return 0

  const atMaxDown = calcFn(salary, car.price, tenure, car, liveCOE, existingDebt)
  if (!passes(atMaxDown, targetRatio)) return null

  let lo = down, hi = car.price
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    const r = calcFn(salary, mid, tenure, car, liveCOE, existingDebt)
    if (passes(r, targetRatio)) hi = mid
    else lo = mid
  }
  return Math.max(0, Math.ceil(hi - down))
}

// Smallest tenure in [1, MAX_TENURE] that reaches `targetRatio` (and clears
// TDSR) at the current downpayment, or null if none of them do. See
// solveExtraDownNeeded's note on calcFn — for a used car this also
// implicitly respects the car's remaining-COE tenure cap, since calcUsed()
// clamps tenure internally and returns the clamped value in r.tenure.
export function solveMinTenureNeeded(salary, down, car, liveCOE, existingDebt = 0, targetRatio = 0.30, calcFn = calc) {
  for (let t = 1; t <= MAX_TENURE; t++) {
    const r = calcFn(salary, down, t, car, liveCOE, existingDebt)
    if (passes(r, targetRatio)) return t
  }
  return null
}

// Bundles every adjustment path for a non-"Affordable" result, plus the
// existing affordability ceiling (max price at current inputs) so the UI can
// point at "cars under S$X" without hardcoding any specific model names.
// The ceiling always uses the new-car calcCeiling() regardless of calcFn,
// since "cars under S$X" is inherently a new-car-shopping suggestion.
export function suggestAdjustments(salary, down, tenure, car, liveCOE, existingDebt = 0, calcFn = calc) {
  return {
    extraDown: solveExtraDownNeeded(salary, down, tenure, car, liveCOE, existingDebt, 0.30, calcFn),
    minTenure: solveMinTenureNeeded(salary, down, car, liveCOE, existingDebt, 0.30, calcFn),
    ceiling: calcCeiling(salary, down, tenure, existingDebt),
  }
}
