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

// Age bands and their pre-subsidy monthly cost, split by category. Bands
// are inclusive of both ages (e.g. 'primary' covers ages 7 through 12).
export const AGE_BANDS = [
  {
    key: 'infant', label: 'Infant care (0–2)', minAge: 0, maxAge: 2,
    childcare: 1700, tuitionEnrichment: 0, dailyExpenses: 500, schoolFees: 0,
  },
  {
    key: 'preschool', label: 'Preschool / kindergarten (3–6)', minAge: 3, maxAge: 6,
    childcare: 1300, tuitionEnrichment: 150, dailyExpenses: 350, schoolFees: 0,
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
]

// Childcare/infant-care subsidy (MSF/ECDA) applies only to the infant and
// preschool bands, only when the centre is ECDA-registered, and only when
// `useSubsidy` is on. The basic subsidy is a flat $300/mo (working mother)
// regardless of income; income-tested Additional Subsidy stacks on top for
// lower-income households, up to a cap that varies by tier. Modeled as
// three simplified tiers rather than the real sliding-scale schedule,
// since that needs an exact gross monthly household income figure this
// tool doesn't collect.
export const SUBSIDY_TIERS = {
  high: { label: 'Above S$12,000/mo household income', basicSubsidy: 300, additionalSubsidy: 0 },
  mid: { label: 'S$6,000–12,000/mo household income', basicSubsidy: 300, additionalSubsidy: 200 },
  low: { label: 'Below S$6,000/mo household income', basicSubsidy: 300, additionalSubsidy: 467 },
}

function subsidyForBand(band, tierKey, useSubsidy) {
  if (!useSubsidy) return 0
  if (band.key !== 'infant' && band.key !== 'preschool') return 0
  const tier = SUBSIDY_TIERS[tierKey] || SUBSIDY_TIERS.high
  // Subsidy can't exceed the childcare fee itself — a near-zero childcare
  // bill (e.g. a stay-home parent, no centre) shouldn't produce a
  // negative "subsidised" cost.
  return Math.min(band.childcare, tier.basicSubsidy + tier.additionalSubsidy)
}

// Net monthly cost for a single band, after subsidy (infant/preschool
// only) is deducted from the childcare line.
export function monthlyCostForBand(band, tierKey = 'high', useSubsidy = true) {
  const subsidy = subsidyForBand(band, tierKey, useSubsidy)
  const netChildcare = Math.max(0, band.childcare - subsidy)
  const total = netChildcare + band.tuitionEnrichment + band.dailyExpenses + band.schoolFees
  return { childcare: netChildcare, subsidy, tuitionEnrichment: band.tuitionEnrichment, dailyExpenses: band.dailyExpenses, schoolFees: band.schoolFees, total }
}

// Which band a given age falls into — null if past the last band (18+).
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

// How much you'd need to set aside monthly, starting now, invested at
// `annualReturnPct`, to have `totalAllChildren` saved up by the time the
// LAST year in the projection ends — a level-savings-plan framing, same
// spirit as RetireWell's "extra monthly needed to close the gap".
export function monthlySavingsPlan(totalAllChildren, years, annualReturnPct = 0) {
  const months = Math.max(1, Math.round((Number(years) || 0) * 12))
  const total = Math.max(0, Number(totalAllChildren) || 0)
  const monthlyReturn = (Number(annualReturnPct) || 0) / 100 / 12
  if (monthlyReturn <= 0) return total / months
  const annuityFactor = (Math.pow(1 + monthlyReturn, months) - 1) / monthlyReturn
  return total / annuityFactor
}
