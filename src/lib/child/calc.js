// src/lib/child/calc.js
// Children's Cost Planner — estimates the monthly and cumulative cost of
// raising a child in Singapore from now until they turn `planUntilAge`
// (default 18). Pure functions, no React — covered by calc.test.js.
//
// IMPORTANT — these are rough, clearly-estimated figures, not a quote.
// Actual cost varies enormously by lifestyle, number/type of enrichment
// classes, school (neighbourhood vs branded), and whether tuition is
// used at all. Figures are a good-faith 2026 snapshot of commonly-cited
// Singapore household spending, not pulled from any single official
// source — treat this as a planning starting point, not a budget.

import { levelEquivalentContribution } from '../ledger/calc.js'

// Age bands and their pre-subsidy monthly cost, split by category. Bands
// are inclusive of both ages (e.g. 'primary' covers ages 7 through 12).
// `subsidy` (only present on infant/preschool) holds the Basic Subsidy
// (working-mother rate) plus the income-tested Additional Subsidy cap for
// each income tier — infant care and childcare/preschool are genuinely
// different published ECDA figures, not just the same subsidy applied
// twice, so this lives per-band rather than as one flat rate reused
// across both.
export const AGE_BANDS = [
  {
    key: 'infant', label: 'Infant care (0–2)', minAge: 0, maxAge: 2,
    childcare: 1700, tuitionEnrichment: 0, dailyExpenses: 500, schoolFees: 0,
    subsidy: { basic: 600, additionalByTier: { high: 0, mid: 300, low: 710 } },
  },
  {
    key: 'preschool', label: 'Preschool / kindergarten (3–6)', minAge: 3, maxAge: 6,
    childcare: 1300, tuitionEnrichment: 150, dailyExpenses: 350, schoolFees: 0,
    subsidy: { basic: 300, additionalByTier: { high: 0, mid: 200, low: 467 } },
  },
  {
    key: 'primary', label: 'Primary school (7–12)', minAge: 7, maxAge: 12,
    childcare: 0, tuitionEnrichment: 400, dailyExpenses: 350, schoolFees: 50,
  },
  {
    key: 'secondary', label: 'Secondary school (13–16)', minAge: 13, maxAge: 16,
    childcare: 0, tuitionEnrichment: 500, dailyExpenses: 400, schoolFees: 60,
  },
  {
    key: 'postsecondary', label: 'JC / Poly (17–18)', minAge: 17, maxAge: 18,
    childcare: 0, tuitionEnrichment: 300, dailyExpenses: 450, schoolFees: 100,
  },
  // Local public university (NUS/NTU/SMU/SIT/SUTD/SUSS), MOE-subsidized
  // rate for a Singapore Citizen — the cheapest realistic path. Private
  // or overseas university costs multiples of this and isn't modeled;
  // schoolFees approximates a blended annual subsidized tuition fee
  // (~S$8,600/yr for most non-medicine courses) spread monthly.
  {
    key: 'university', label: 'University (19–22, local, subsidized)', minAge: 19, maxAge: 22,
    childcare: 0, tuitionEnrichment: 0, dailyExpenses: 500, schoolFees: 717,
  },
]

// Household-income tier labels — the Additional Subsidy CAP amounts
// themselves now live per-band (see AGE_BANDS above), since infant care
// and childcare/preschool have genuinely different published ECDA
// figures. This is still a simplified three-tier bucket rather than the
// real continuous sliding scale, which needs an exact gross monthly
// household income figure this tool doesn't collect.
export const SUBSIDY_TIERS = {
  high: { label: 'Above S$12,000/mo household income' },
  mid: { label: 'S$6,000–12,000/mo household income' },
  low: { label: 'Below S$6,000/mo household income' },
}

function subsidyForBand(band, tierKey, useSubsidy) {
  if (!useSubsidy || !band.subsidy) return 0
  const additional = band.subsidy.additionalByTier[tierKey] ?? band.subsidy.additionalByTier.high
  // Subsidy can't exceed the childcare fee itself — a near-zero childcare
  // bill (e.g. a stay-home parent, no centre) shouldn't produce a
  // negative "subsidised" cost.
  return Math.min(band.childcare, band.subsidy.basic + additional)
}

// Net monthly cost for a single band, after subsidy (infant/preschool
// only) is deducted from the childcare line.
export function monthlyCostForBand(band, tierKey = 'high', useSubsidy = true) {
  const subsidy = subsidyForBand(band, tierKey, useSubsidy)
  const netChildcare = Math.max(0, band.childcare - subsidy)
  const total = netChildcare + band.tuitionEnrichment + band.dailyExpenses + band.schoolFees
  return { childcare: netChildcare, subsidy, tuitionEnrichment: band.tuitionEnrichment, dailyExpenses: band.dailyExpenses, schoolFees: band.schoolFees, total }
}

// Which band a given age falls into — null if past the last band (22+).
export function bandForAge(age) {
  return AGE_BANDS.find(b => age >= b.minAge && age <= b.maxAge) || null
}

// Full projection from the child's current age to `planUntilAge`
// (inclusive), broken down year by year and band by band. Each row is
// one year of the child's life; months remaining in the final partial
// year of a band are handled at whole-year granularity (a deliberate
// simplification — this plans in years, not months).
export function projectChildCost({ currentAge = 0, planUntilAge = 18, incomeTier = 'high', useSubsidy = true, numberOfChildren = 1 }) {
  const startAge = Math.max(0, Math.round(Number(currentAge) || 0))
  const endAge = Math.max(startAge, Math.round(Number(planUntilAge) || 18))
  const children = Math.max(1, Math.round(Number(numberOfChildren) || 1))

  const years = []
  for (let age = startAge; age <= endAge; age++) {
    const band = bandForAge(age)
    if (!band) continue
    const monthly = monthlyCostForBand(band, incomeTier, useSubsidy)
    years.push({ age, bandKey: band.key, bandLabel: band.label, monthly, annual: monthly.total * 12 })
  }

  const totalPerChild = years.reduce((sum, y) => sum + y.annual, 0)
  const totalAllChildren = totalPerChild * children

  // Category subtotals (per child) across the whole horizon, so the UI
  // can show "where the money goes" without re-summing years itself.
  const categoryTotals = years.reduce((acc, y) => {
    acc.childcare += y.monthly.childcare * 12
    acc.tuitionEnrichment += y.monthly.tuitionEnrichment * 12
    acc.dailyExpenses += y.monthly.dailyExpenses * 12
    acc.schoolFees += y.monthly.schoolFees * 12
    acc.subsidySaved += y.monthly.subsidy * 12
    return acc
  }, { childcare: 0, tuitionEnrichment: 0, dailyExpenses: 0, schoolFees: 0, subsidySaved: 0 })

  const currentBand = bandForAge(startAge)
  const currentMonthly = currentBand ? monthlyCostForBand(currentBand, incomeTier, useSubsidy).total : 0

  return {
    startAge, endAge, children, years,
    totalPerChild, totalAllChildren,
    categoryTotals,
    currentMonthly, currentMonthlyAllChildren: currentMonthly * children,
    averageMonthlyPerChild: years.length > 0 ? totalPerChild / (years.length * 12) : 0,
  }
}

// The level monthly amount you'd need to set aside to fund the ACTUAL
// pay-as-you-go cost stream from `projectChildCost`'s `years[]` — NOT the
// amount that accumulates to the total as a single lump sum at the end.
// Child costs are an outflow you pay every month starting now, so money
// you haven't spent yet keeps earning your assumed return right up until
// the month it's needed, but money already spent in year 1 can't keep
// compounding for the following 17 years the way a naive "solve for the
// payment whose future value equals the total" calculation would assume
// — that naive version understates the required monthly figure by a wide
// margin (verified: ~40% at a 3% return over an 18-year horizon).
//
// Reuses MyLedger's levelEquivalentContribution (src/lib/ledger/calc.js),
// which solves exactly this problem for RetireWell's own time-varying
// investment-capacity schedule: the level monthly value whose future
// value at the end of the horizon equals the future value of the real,
// varying schedule — outflows compound the same way inflows do.
export function monthlySavingsPlan(years, annualReturnPct = 0) {
  const monthlySchedule = years.flatMap(y => Array(12).fill(y.monthly.total))
  return levelEquivalentContribution(monthlySchedule, annualReturnPct)
}
