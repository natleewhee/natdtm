// src/lib/retire/srs.js
// Supplementary Retirement Scheme: withdrawal-side modeling. The
// contribution-side optimization (how much tax a dollar into SRS saves
// right now, given your marginal rate and remaining relief headroom)
// already lives in TaxWise (src/lib/tax/calc.js's srsHeadroom/maxSrsSaving).
// This is the other half — once the money's in SRS, what withdrawing it
// actually costs in tax, and why spreading it out beats a lump sum.
//
// Pure functions, no React — covered by srs.test.js.

import { taxOnChargeableIncome } from '../tax/calc.js'

// Statutory figures below are verified against their authoritative source
// in docs/statutory-sources.md (audited 2026-08-31). SRS_RETIREMENT_AGE
// has a known open discrepancy recorded there.
export const SRS_AS_OF = '2026-01-01'

// The statutory retirement age effective at the time of your FIRST SRS
// contribution is what determines penalty-free withdrawal — it's locked
// in then, not whatever the prevailing age is when you actually withdraw.
// 63 is the current statutory retirement age (as of 2026) for anyone
// making their first contribution now; this is a snapshot assumption for
// anyone already contributing under an earlier (lower) locked-in age.
// NOTE: rises to 64 from 1 Jul 2026 — see docs/statutory-sources.md.
export const SRS_RETIREMENT_AGE = 63

// Withdrawals from/after the statutory retirement age are 50% tax-exempt
// — only half the amount withdrawn counts as chargeable income. Before
// that age, withdrawals are 100% taxable AND carry a 5% penalty.
export const SRS_WITHDRAWAL_TAXABLE_FRACTION = 0.5
export const SRS_EARLY_WITHDRAWAL_PENALTY_PCT = 5
export const SRS_MAX_WITHDRAWAL_YEARS = 10

// Projects an SRS account forward to retirement using the same flat
// monthly-compounding approach RetireWell's own investment projection
// uses (see simulateAccumulation's `investment` line in calc.js) — kept
// as a separate, additive function rather than folded into that
// simulation, since SRS has its own withdrawal rules entirely distinct
// from the general investment balance it currently models.
export function projectSrsBalance({ startBalance = 0, monthlyContribution = 0, annualReturnPct = 0, yearsToRetirement = 0 }) {
  const months = Math.max(0, Math.round((Number(yearsToRetirement) || 0) * 12))
  const monthlyReturn = (Number(annualReturnPct) || 0) / 100 / 12
  let balance = Math.max(0, Number(startBalance) || 0)
  const contribution = Math.max(0, Number(monthlyContribution) || 0)
  for (let m = 0; m < months; m++) {
    balance = balance * (1 + monthlyReturn) + contribution
  }
  return balance
}

// Splits a retirement-age SRS balance into `years` equal nominal
// withdrawals (no further growth assumed during the drawdown window —
// a conservative simplification, since real SRS funds can stay invested
// while being drawn down). Only half of each year's withdrawal is
// chargeable income.
export function srsWithdrawalSchedule(balanceAtRetirement, years = SRS_MAX_WITHDRAWAL_YEARS) {
  const requested = Math.round(Number(years)) || SRS_MAX_WITHDRAWAL_YEARS
  const n = requested <= 0 ? SRS_MAX_WITHDRAWAL_YEARS : Math.min(SRS_MAX_WITHDRAWAL_YEARS, requested)
  const balance = Math.max(0, Number(balanceAtRetirement) || 0)
  const withdrawal = balance / n
  const taxableAmount = withdrawal * SRS_WITHDRAWAL_TAXABLE_FRACTION
  return Array.from({ length: n }, (_, i) => ({ year: i + 1, withdrawal, taxableAmount }))
}

// Incremental tax a year's taxable SRS withdrawal adds on top of
// whatever else is chargeable that year (e.g. rental or part-time work
// income — CPF LIFE payouts themselves are not taxable in Singapore, so
// they never belong in `otherTaxableIncome`). Computed as the difference
// between chargeable-income tax with and without the withdrawal stacked
// on, since Singapore's bands are progressive — the withdrawal is taxed
// at whatever rate it lands on TOP of existing income, not from zero.
export function srsWithdrawalTax(taxableAmount, otherTaxableIncome = 0) {
  const other = Math.max(0, Number(otherTaxableIncome) || 0)
  const taxable = Math.max(0, Number(taxableAmount) || 0)
  const withIt = taxOnChargeableIncome(other + taxable)
  const withoutIt = taxOnChargeableIncome(other)
  return Math.max(0, withIt - withoutIt)
}

// The headline SRS-optimizer comparison: same total balance, same
// otherTaxableIncome each year, but spread over a different number of
// years — illustrates why spreading beats a lump sum. Singapore's tax
// bands are progressive, so halving each year's taxable slice (by
// doubling the years) more than halves the tax on it whenever the
// withdrawal pushes you into a higher bracket; if you already sit well
// within the 0% band even taken as a lump sum, spreading saves nothing
// (a genuine possibility this function is expected to surface honestly,
// not paper over with a manufactured saving).
export function compareSrsWithdrawalPlans(balanceAtRetirement, otherTaxableIncome = 0, yearOptions = [1, 5, 10]) {
  return yearOptions.map(years => {
    const schedule = srsWithdrawalSchedule(balanceAtRetirement, years)
    const totalTax = schedule.reduce((sum, row) => sum + srsWithdrawalTax(row.taxableAmount, otherTaxableIncome), 0)
    return { years: schedule.length, annualWithdrawal: schedule[0]?.withdrawal || 0, totalTax }
  })
}
