// src/lib/retire/cpf.js
// CPF contribution and interest rules used by the retirement projection.
// Contribution rates for ages above 55 are on a multi-year phase-in
// (announced through Budget 2023) moving toward parity with the below-55
// rate by around 2030 — they are revised periodically. Figures below are
// a good-faith snapshot, not pulled live from CPF Board — verify against
// the official CPF contribution rate tables before relying on this for
// real planning, the same way BSD/SSD/ABSD in HouseMuch carry an AS_OF
// date rather than being presented as permanently current.
export const CPF_RATES_AS_OF = '2026-01-01'

// Monthly Ordinary Wage ceiling — the salary CPF contributions are capped
// against. Raised on a phased schedule from $6,000 (pre-2023) to $8,000
// (from Jan 2026). Bonuses/AWS are excluded entirely — this calculator
// only asks for base salary.
export const CPF_OW_CEILING = 8_000

// Age bands as at the start of the contribution year. `alloc` is the
// share of the TOTAL contribution (not of salary) credited to each
// sub-account; the three always sum to `total`. Employer/employee split
// isn't modeled since it doesn't change what lands in CPF, only how much
// hits your paycheck first.
export const CPF_CONTRIBUTION_TABLE = [
  { minAge: 0, maxAge: 55, total: 0.37, oa: 0.23, sa: 0.06, ma: 0.08 },
  { minAge: 56, maxAge: 60, total: 0.325, oa: 0.15, sa: 0.055, ma: 0.12 },
  { minAge: 61, maxAge: 65, total: 0.235, oa: 0.085, sa: 0.02, ma: 0.13 },
  { minAge: 66, maxAge: 70, total: 0.165, oa: 0.035, sa: 0.025, ma: 0.105 },
  { minAge: 71, maxAge: 999, total: 0.125, oa: 0.01, sa: 0.01, ma: 0.105 },
]

export function contributionRatesForAge(age) {
  const band = CPF_CONTRIBUTION_TABLE.find(b => age >= b.minAge && age <= b.maxAge)
    || CPF_CONTRIBUTION_TABLE[CPF_CONTRIBUTION_TABLE.length - 1]
  return band
}

// Monthly CPF contribution split, from monthly salary capped at the OW
// ceiling. Returns dollar amounts credited to each sub-account this month.
export function monthlyCpfContribution(salary, age) {
  const wage = Math.min(Math.max(0, Number(salary) || 0), CPF_OW_CEILING)
  const { total, oa, sa, ma } = contributionRatesForAge(age)
  const contribution = wage * total
  return {
    total: contribution,
    oa: wage * oa,
    sa: wage * sa,
    ma: wage * ma,
  }
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
export function monthlyExtraInterest(balances, age) {
  const oa = Number(balances.oa) || 0, sa = Number(balances.sa) || 0, ma = Number(balances.ma) || 0
  const oaForExtra = Math.min(oa, CPF_EXTRA_OA_CAP)
  const remainderForExtra = sa + ma

  function tieredExtra(capTotal) {
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
  function tieredExtra2(capTotal) {
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
export function monthlyCpfInterest(balances, age) {
  const extra = monthlyExtraInterest(balances, age)
  return {
    oa: (Number(balances.oa) || 0) * (CPF_OA_RATE / 12) + extra.oa,
    sa: (Number(balances.sa) || 0) * (CPF_SA_RATE / 12) + extra.sa,
    ma: (Number(balances.ma) || 0) * (CPF_MA_RATE / 12) + extra.ma,
  }
}
