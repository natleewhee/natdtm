// src/lib/retire/cpf.ts
// CPF contribution and interest rules used by the retirement projection.
// Contribution rates for ages above 55 are on a multi-year phase-in
// moving toward parity with the below-55 rate — they are raised in steps,
// most recently on 1 Jan 2026, with a further step announced for 1 Jan
// 2027 (tracked under "Scheduled changes" in docs/statutory-sources.md).
// Figures below are a good-faith snapshot, not pulled live from CPF Board
// — verify against the official CPF contribution rate tables before
// relying on this for real planning, the same way BSD/SSD/ABSD in
// HouseMuch carry an AS_OF date rather than being presented as
// permanently current.
// Verified against CPF Board in docs/statutory-sources.md.
export const CPF_RATES_AS_OF = '2026-01-01'

// Monthly Ordinary Wage ceiling — the salary CPF contributions are capped
// against. Raised on a phased schedule from $6,000 (pre-2023) to $8,000
// (from Jan 2026).
export const CPF_OW_CEILING = 8_000

// Total annual CPF wages (Ordinary + Additional/bonus) subject to
// contribution. Additional Wage (bonus/AWS) ceiling for the year =
// this minus the Ordinary Wages already subject to CPF that year — so
// a bonus is only partly (or not at all) CPF-able once your monthly
// salary alone has used up most of the annual ceiling.
export const CPF_ANNUAL_CEILING = 102_000

// Age bands as at the start of the contribution year. `oa`/`sa`/`ma` are
// each sub-account's share of SALARY (not of the total contribution); the
// three always sum to `total`. `employee` is the employee's own share,
// which is what comes off the payslip (TaxWise's take-home pay).
//
// From 55 the Special Account no longer exists: the `sa` share is credited
// to the Retirement Account (up to the Full Retirement Sum). The model
// keeps the `sa` key and treats that balance as the SA/RA pot.
//
// Rates come from CPF Board's contribution and allocation tables for
// 1 Jan 2026 and 1 Jan 2027; see CPF_RATE_SCHEDULE below and
// docs/statutory-sources.md.
//
// Boundaries are deliberately CONTIGUOUS (each band's minAge equals the
// previous band's maxAge, not maxAge+1) with no gap between them — a
// fractional age (this file is fed ages like `currentAge + monthsElapsed/12`
// by the retirement projection, so most ages ARE fractional) must always
// match exactly one band. contributionRatesForAge below relies on
// Array.prototype.find returning the FIRST match in ascending order, so
// an age sitting exactly on a boundary (e.g. 55, 60) lands in the lower
// (higher-rate) band, matching CPF Board's own "55 and below" / "above 55
// to 60" phrasing. Using non-contiguous bounds like 56/61/66/71 (the
// previous version) left (55,56), (60,61), (65,66), (70,71) matching
// NOTHING, silently falling through to the 71+ band for anyone in those
// gaps — a large, silent under-projection for exactly the age range
// (55+) this table exists to model precisely.
// Allocation by band, as % of wages, from CPF Board's "CPF Allocation
// Rates from 1 January 2026" and "... from 1 January 2027" tables
// (private sector / non-pensionable). Each band's OA/SA(RA)/MA shares are
// the official ratio of contribution × the total rate; `employee` is the
// employee's own share (wages > S$750/month), used by TaxWise for
// take-home pay. Below 55 the bands split by age (35 / 45 / 50 / 55):
//   ≤35  37% = OA 23   + SA 6    + MA 8     (ratios .6217/.1621/.2162)
//   35-45 37% = OA 21  + SA 7    + MA 9     (.5677/.1891/.2432)
//   45-50 37% = OA 19  + SA 8    + MA 10    (.5136/.2162/.2702)
//   50-55 37% = OA 15  + SA 11.5 + MA 10.5  (.4055/.3108/.2837)
// From 55 the `sa` share is the Retirement Account. 65-70 is OA 1 / RA 5 /
// MA 10.5 (.0607/.303/.6363); 70+ is OA 1 / RA 1 / MA 10.5.
const BELOW_55 = [
  { minAge: 0, maxAge: 35, total: 0.37, employee: 0.20, oa: 0.23, sa: 0.06, ma: 0.08 },
  { minAge: 35, maxAge: 45, total: 0.37, employee: 0.20, oa: 0.21, sa: 0.07, ma: 0.09 },
  { minAge: 45, maxAge: 50, total: 0.37, employee: 0.20, oa: 0.19, sa: 0.08, ma: 0.10 },
  { minAge: 50, maxAge: 55, total: 0.37, employee: 0.20, oa: 0.15, sa: 0.115, ma: 0.105 },
]
const ABOVE_65 = [
  { minAge: 65, maxAge: 70, total: 0.165, employee: 0.075, oa: 0.01, sa: 0.05, ma: 0.105 },
  { minAge: 70, maxAge: 999, total: 0.125, employee: 0.05, oa: 0.01, sa: 0.01, ma: 0.105 },
]

/**
 * CPF contribution and allocation rates by the calendar year they take
 * effect (1 January). Rates for a given year are the latest entry whose
 * `from` is not after it, so the 2027 senior-worker increase applies
 * automatically to wages from 1 Jan 2027, and RetireWell's projection
 * uses the right table for every future year it simulates.
 */
export const CPF_RATE_SCHEDULE = [
  {
    from: 2026,
    // 55-60: 34% (16 + 18) = OA 12 + RA 11.5 + MA 10.5  (.353/.3382/.3088)
    // 60-65: 25% (12.5 + 12.5) = OA 3.5 + RA 11 + MA 10.5  (.14/.44/.42)
    bands: [
      ...BELOW_55,
      { minAge: 55, maxAge: 60, total: 0.34, employee: 0.18, oa: 0.12, sa: 0.115, ma: 0.105 },
      { minAge: 60, maxAge: 65, total: 0.25, employee: 0.125, oa: 0.035, sa: 0.11, ma: 0.105 },
      ...ABOVE_65,
    ],
  },
  {
    from: 2027,
    // Final step of the senior-worker increases; the extra goes to the RA.
    // 55-60: 35.5% (16.5 + 19) = OA 12 + RA 13 + MA 10.5  (.3382/.3661/.2957)
    // 60-65: 26% (13 + 13) = OA 3.5 + RA 12 + MA 10.5    (.1347/.4615/.4038)
    bands: [
      ...BELOW_55,
      { minAge: 55, maxAge: 60, total: 0.355, employee: 0.19, oa: 0.12, sa: 0.13, ma: 0.105 },
      { minAge: 60, maxAge: 65, total: 0.26, employee: 0.13, oa: 0.035, sa: 0.12, ma: 0.105 },
      ...ABOVE_65,
    ],
  },
]

const thisYear = () => new Date().getFullYear()

/**
 * The band table in force in a calendar year (defaults to this year).
 * Years before the first entry use the first entry.
 * @param {number} [year]
 */
export function cpfBandsForYear(year: number = thisYear()) {
  const y = Number(year) || thisYear()
  let pick = CPF_RATE_SCHEDULE[0]
  for (const entry of CPF_RATE_SCHEDULE) if (entry.from <= y) pick = entry
  return pick.bands
}

// The table in force this year, for display on the-math pages.
export const CPF_CONTRIBUTION_TABLE = cpfBandsForYear()

/**
 * Looks up the age-banded CPF contribution rates (total + OA/SA/MA
 * allocation shares). Boundaries are contiguous so a fractional age
 * (e.g. currentAge + monthsElapsed/12) always matches exactly one band,
 * with an age exactly on a boundary landing in the lower, higher-rate band.
 * @param {number} age - Age in years (may be fractional).
 * @param {number} [year] - Calendar year whose rates apply (defaults to this year).
 * @returns {{minAge: number, maxAge: number, total: number, employee: number, oa: number, sa: number, ma: number}}
 *   The matching contribution band.
 */
export function contributionRatesForAge(age: number, year?: number): {minAge: number, maxAge: number, total: number, employee: number, oa: number, sa: number, ma: number} {
  const bands = cpfBandsForYear(year)
  const band = bands.find(b => age >= b.minAge && age <= b.maxAge)
    || bands[bands.length - 1]
  return band
}

// Splits an already-capped wage base into OA/SA/MA using the age-banded
// allocation — shared by the monthly (OW-capped) and bonus (AW-capped)
// contribution calculations below.
/**
 * Splits an already-capped wage base into OA/SA/MA using the age-banded
 * allocation — shared by the monthly (OW-capped) and bonus (AW-capped)
 * contribution calculations.
 * @param {number} wageBase - The CPF-able wage base, already capped, in dollars.
 * @param {number} age - Age in years.
 * @param {number} [year] - Calendar year whose rates apply (defaults to this year).
 * @returns {{total: number, oa: number, sa: number, ma: number}} Dollar amounts per sub-account.
 */
export function splitContribution(wageBase: number, age: number, year?: number): {total: number, oa: number, sa: number, ma: number} {
  const wage = Math.max(0, Number(wageBase) || 0)
  const { total, oa, sa, ma } = contributionRatesForAge(age, year)
  return {
    total: wage * total,
    oa: wage * oa,
    sa: wage * sa,
    ma: wage * ma,
  }
}

// Monthly CPF contribution split, from monthly salary capped at the OW
// ceiling. Returns dollar amounts credited to each sub-account this month.
/**
 * Monthly CPF contribution split, from monthly salary capped at the OW
 * ceiling. Returns dollar amounts credited to each sub-account this month.
 * @param {number} salary - Monthly salary in dollars.
 * @param {number} age - Age in years.
 * @param {number} [year] - Calendar year whose rates apply (defaults to this year).
 * @returns {{total: number, oa: number, sa: number, ma: number}} Dollar amounts credited this month.
 */
export function monthlyCpfContribution(salary: number, age: number, year?: number): {total: number, oa: number, sa: number, ma: number} {
  const wage = Math.min(Math.max(0, Number(salary) || 0), CPF_OW_CEILING)
  return splitContribution(wage, age, year)
}

export const CPF_OA_RATE = 0.025
export const CPF_SA_RATE = 0.04
export const CPF_MA_RATE = 0.04

// Extra interest on top of the base rates above, applied to combined
// OA+SA+MA balances — long-stable CPF policy, not part of the phased
// contribution-rate changes above.
export const CPF_EXTRA_BELOW_55_RATE = 0.01
export const CPF_EXTRA_BELOW_55_CAP = 60_000
export const CPF_EXTRA_OA_CAP = 20_000 // at most this much of the extra-interest base can come from OA
export const CPF_EXTRA_55_TIER1_RATE = 0.02
export const CPF_EXTRA_55_TIER1_CAP = 30_000
export const CPF_EXTRA_55_TIER2_RATE = 0.01
export const CPF_EXTRA_55_TIER2_CAP = 30_000

// Extra interest earned this month on the OA/SA/MA balances, following
// the "OA counts first, up to $20k" allocation rule, tiered by age.
/**
 * Extra interest earned this month on the OA/SA/MA balances, following
 * the "OA counts first, up to $20k" allocation rule, tiered by age
 * (a single below-55 tier, or two tiers from age 55).
 * @param {{oa: number, sa: number, ma: number}} balances - Sub-account balances at the start of the month.
 * @param {number} age - Age in years.
 * @returns {{oa: number, sa: number, ma: number}} Extra interest earned this month, per sub-account.
 */
export function monthlyExtraInterest(balances: {oa: number, sa: number, ma: number}, age: number): {oa: number, sa: number, ma: number} {
  const oa = Number(balances.oa) || 0, sa = Number(balances.sa) || 0, ma = Number(balances.ma) || 0
  const oaForExtra = Math.min(oa, CPF_EXTRA_OA_CAP)
  const remainderForExtra = sa + ma

  function tieredExtra(capTotal: number) {
    const oaPortion = Math.min(oaForExtra, capTotal)
    const remainingCap = Math.max(0, capTotal - oaPortion)
    const otherPortion = Math.min(remainderForExtra, remainingCap)
    // Split "otherPortion" back across SA/MA proportionally for bookkeeping.
    const otherTotal = sa + ma
    const saShare = otherTotal > 0 ? otherPortion * (sa / otherTotal) : 0
    const maShare = otherTotal > 0 ? otherPortion * (ma / otherTotal) : 0
    return { oaBase: oaPortion, saBase: saShare, maBase: maShare }
  }

  if (age < 55) {
    const { oaBase, saBase, maBase } = tieredExtra(CPF_EXTRA_BELOW_55_CAP)
    const rate = CPF_EXTRA_BELOW_55_RATE / 12
    return { oa: oaBase * rate, sa: saBase * rate, ma: maBase * rate }
  }

  const tier1 = tieredExtra(CPF_EXTRA_55_TIER1_CAP)
  const tier1Rate = CPF_EXTRA_55_TIER1_RATE / 12
  const usedOa = tier1.oaBase, usedSa = tier1.saBase, usedMa = tier1.maBase

  const oaForExtra2 = Math.max(0, oaForExtra - usedOa)
  const saForExtra2 = Math.max(0, sa - usedSa)
  const maForExtra2 = Math.max(0, ma - usedMa)
  const remainderForExtra2 = saForExtra2 + maForExtra2
  function tieredExtra2(capTotal: number) {
    const oaPortion = Math.min(oaForExtra2, capTotal)
    const remainingCap = Math.max(0, capTotal - oaPortion)
    const otherPortion = Math.min(remainderForExtra2, remainingCap)
    const otherTotal = saForExtra2 + maForExtra2
    const saShare = otherTotal > 0 ? otherPortion * (saForExtra2 / otherTotal) : 0
    const maShare = otherTotal > 0 ? otherPortion * (maForExtra2 / otherTotal) : 0
    return { oaBase: oaPortion, saBase: saShare, maBase: maShare }
  }
  const tier2 = tieredExtra2(CPF_EXTRA_55_TIER2_CAP)
  const tier2Rate = CPF_EXTRA_55_TIER2_RATE / 12

  return {
    oa: tier1.oaBase * tier1Rate + tier2.oaBase * tier2Rate,
    sa: tier1.saBase * tier1Rate + tier2.saBase * tier2Rate,
    ma: tier1.maBase * tier1Rate + tier2.maBase * tier2Rate,
  }
}

// Monthly interest credited to each sub-account: base rate + extra
// interest tier for the month, on the balances at the start of the month.
/**
 * Monthly interest credited to each sub-account: base rate + extra
 * interest tier for the month, on the balances at the start of the month.
 * @param {{oa: number, sa: number, ma: number}} balances - Sub-account balances at the start of the month.
 * @param {number} age - Age in years.
 * @returns {{oa: number, sa: number, ma: number}} Total interest credited this month, per sub-account.
 */
export function monthlyCpfInterest(balances: {oa: number, sa: number, ma: number}, age: number): {oa: number, sa: number, ma: number} {
  const extra = monthlyExtraInterest(balances, age)
  return {
    oa: (Number(balances.oa) || 0) * (CPF_OA_RATE / 12) + extra.oa,
    sa: (Number(balances.sa) || 0) * (CPF_SA_RATE / 12) + extra.sa,
    ma: (Number(balances.ma) || 0) * (CPF_MA_RATE / 12) + extra.ma,
  }
}

// Retirement Sum Topping-Up (RSTU): voluntary cash top-ups go straight
// into SA (or RA, from 55) rather than being split across accounts, and
// are only accepted up to the prevailing Full Retirement Sum (FRS) — CPF
// rejects (returns) any top-up beyond that. The FRS itself rises each
// year on a pre-announced schedule (~3.5% p.a. historically), which
// matters a lot over a multi-decade projection — modeled here as a
// steady growth rate off a labeled base year rather than frozen at
// today's figure.
export const CPF_FRS_BASE = 220_400
export const CPF_FRS_BASE_YEAR = 2026
export const CPF_FRS_GROWTH_RATE = 0.035

/**
 * The Full Retirement Sum for a given year, grown from the labeled base
 * year at CPF_FRS_GROWTH_RATE p.a. rather than frozen at today's figure —
 * this is the ceiling RSTU top-ups are accepted against.
 * @param {number} year - Calendar year.
 * @returns {number} The prevailing FRS in dollars.
 */
export function prevailingFRS(year: number): number {
  const yearsFromBase = Math.max(0, year - CPF_FRS_BASE_YEAR)
  return CPF_FRS_BASE * Math.pow(1 + CPF_FRS_GROWTH_RATE, yearsFromBase)
}

// Basic Healthcare Sum (BHS): the cap on MediSave. Contributions that
// would push MA above the prevailing BHS are redirected to SA instead
// (or RA, from 55 — standing in as SA here, same simplification as
// elsewhere in this file). BHS is revised most years on an announced
// schedule — historical figures (2017 $52,000 → 2026 $79,000) fit a
// steady ~4.75% p.a. growth curve within ~0.7% at every point, used here
// rather than a frozen figure.
//
// Crucially, BHS only keeps rising for members under 65 — once you turn
// 65, YOUR Basic Healthcare Sum is fixed for life at whatever the
// prevailing figure was that year (a "cohort" figure), even as the
// prevailing figure keeps climbing for everyone younger. See
// calc.js's simulateAccumulation for where that freeze is applied.
export const CPF_BHS_BASE = 79_000
export const CPF_BHS_BASE_YEAR = 2026
export const CPF_BHS_GROWTH_RATE = 0.0475

/**
 * The Basic Healthcare Sum (MediSave cap) for a given year, grown from
 * the labeled base year at CPF_BHS_GROWTH_RATE p.a. Note: a member's own
 * BHS freezes at whatever the prevailing figure was the year they turned
 * 65 (see creditWithMaOverflow / calc.js's simulateAccumulation) even as
 * this prevailing figure keeps rising for everyone younger.
 * @param {number} year - Calendar year.
 * @returns {number} The prevailing BHS in dollars.
 */
export function prevailingBHS(year: number): number {
  const yearsFromBase = Math.max(0, year - CPF_BHS_BASE_YEAR)
  return CPF_BHS_BASE * Math.pow(1 + CPF_BHS_GROWTH_RATE, yearsFromBase)
}

// Credits a contribution split {oa, sa, ma} onto running balances,
// redirecting any MA portion that would exceed the given BHS cap into SA
// instead — mutates and returns the balances object. Takes the cap as a
// dollar figure (not a year) so the caller can pass either the current
// prevailing BHS or a member's frozen cohort figure once they've turned 65.
/**
 * Credits a contribution split {oa, sa, ma} onto running balances,
 * redirecting any MA portion that would exceed the given BHS cap into SA
 * instead. Mutates and returns the balances object. Takes the cap as a
 * dollar figure (not a year) so the caller can pass either the current
 * prevailing BHS or a member's frozen cohort figure once they've turned 65.
 * @param {{oa: number, sa: number, ma: number}} balances - Running balances, mutated in place.
 * @param {{oa: number, sa: number, ma: number}} contrib - Contribution split to credit.
 * @param {number} bhs - The MediSave cap to apply, in dollars.
 * @returns {{oa: number, sa: number, ma: number}} The same, mutated balances object.
 */
export function creditWithMaOverflow(balances: {oa: number, sa: number, ma: number}, contrib: {oa: number, sa: number, ma: number}, bhs: number): {oa: number, sa: number, ma: number} {
  const room = Math.max(0, bhs - balances.ma)
  const maCredited = Math.min(contrib.ma, room)
  const overflow = contrib.ma - maCredited
  balances.oa += contrib.oa
  balances.sa += contrib.sa + overflow
  balances.ma += maCredited
  return balances
}
