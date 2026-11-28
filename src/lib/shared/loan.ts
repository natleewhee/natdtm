// src/lib/shared/loan.ts
// Time-value-of-money primitives shared by every engine: reducing-balance
// loans (HouseMuch, MyLedger property moves) and ordinary-annuity future
// value (RetireWell's gap solver, MyLedger's level-equivalent
// contribution). Pure functions; rates are per-period decimals unless the
// name says otherwise.
//
// Note: Singapore car loans are flat-rate, not reducing-balance, so
// DriveReady's instalment maths (src/lib/drive/calc.ts) deliberately does
// not use monthlyPayment().

/**
 * Standard reducing-balance monthly instalment: M = P·r(1+r)^n / ((1+r)^n − 1).
 * @param {number} principal - Loan principal in dollars.
 * @param {number} annualRatePct - Annual interest rate as a percentage (e.g. 3 for 3%).
 * @param {number} tenureYears - Loan tenure in years.
 * @returns {number} Monthly instalment in dollars (0 for a non-positive principal or tenure).
 */
export function monthlyPayment(principal: number, annualRatePct: number, tenureYears: number): number {
  const P = Number(principal), r = Number(annualRatePct) / 100 / 12, n = Number(tenureYears) * 12
  if (!Number.isFinite(P) || P <= 0 || !Number.isFinite(n) || n <= 0) return 0
  if (!Number.isFinite(r) || r <= 0) return P / n
  return P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

/**
 * Outstanding principal after `monthsElapsed` of a reducing-balance loan:
 * B(t) = P·[(1+r)^n − (1+r)^t] / [(1+r)^n − 1].
 * @param {number} principal - Loan principal in dollars.
 * @param {number} annualRatePct - Annual interest rate as a percentage.
 * @param {number} tenureYears - Loan tenure in years.
 * @param {number} monthsElapsed - Months since the loan started, clamped to [0, tenureYears*12].
 * @returns {number} Outstanding principal balance in dollars.
 */
export function balanceAfter(principal: number, annualRatePct: number, tenureYears: number, monthsElapsed: number): number {
  const P = Number(principal), r = Number(annualRatePct) / 100 / 12, n = Number(tenureYears) * 12
  if (!Number.isFinite(P) || P <= 0 || !Number.isFinite(n) || n <= 0) return 0
  const t = Math.min(Math.max(0, Number(monthsElapsed) || 0), n)
  if (!Number.isFinite(r) || r <= 0) return P * (1 - t / n)
  return P * (Math.pow(1 + r, n) - Math.pow(1 + r, t)) / (Math.pow(1 + r, n) - 1)
}

/**
 * Interest paid over the first `monthsElapsed` months of a reducing-balance
 * loan: instalments paid minus principal repaid.
 * @param {number} principal
 * @param {number} annualRatePct
 * @param {number} tenureYears
 * @param {number} monthsElapsed
 * @returns {number}
 */
export function interestPaid(principal: number, annualRatePct: number, tenureYears: number, monthsElapsed: number): number {
  const P = Number(principal)
  if (!Number.isFinite(P) || P <= 0) return 0
  const n = Number(tenureYears) * 12
  const t = Math.min(Math.max(0, Number(monthsElapsed) || 0), Number.isFinite(n) ? n : 0)
  const paid = monthlyPayment(P, annualRatePct, tenureYears) * t
  const repaid = P - balanceAfter(P, annualRatePct, tenureYears, t)
  return Math.max(0, paid - repaid)
}

/**
 * Future-value factor of an ordinary annuity: [(1+r)^n − 1] / r, i.e. the
 * value after `n` periods of paying 1 at the end of each period at
 * per-period rate `r`. Falls back to `n` when r ≤ 0 (no growth).
 * @param {number} r - Per-period rate as a decimal (e.g. 0.05/12).
 * @param {number} n - Number of periods.
 * @returns {number}
 */
export function fvAnnuityFactor(r: number, n: number): number {
  const N = Number(n)
  if (!Number.isFinite(N) || N <= 0) return 0
  const R = Number(r)
  if (!Number.isFinite(R) || R <= 0) return N
  return (Math.pow(1 + R, N) - 1) / R
}
