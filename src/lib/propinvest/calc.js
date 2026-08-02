// src/lib/propinvest/calc.js
// Investment Property Calculator — upfront cost, financing, and monthly
// rental cash flow for a Singapore residential property bought to rent
// out. Reuses HouseMuch's own engine functions (calcBSD, calcMonthlyInstalment)
// rather than duplicating that math — see src/lib/house/calc.js and
// src/lib/house/stampDuty.js. Pure functions, no React — covered by
// calc.test.js.

import { calcBSD } from '../house/stampDuty.js'
import { calcMonthlyInstalment } from '../house/calc.js'

export { calcBSD, calcMonthlyInstalment }

// Non-owner-occupied residential property tax — a separate, steeper
// progressive schedule from the owner-occupied one, since this tool is
// specifically for a property you don't live in. Tiered on Annual Value
// (AV), which IRAS publishes per property (roughly the estimated annual
// rent it could fetch) — not the purchase price and not the actual rent
// you charge. Effective from 1 Jan 2024; verify against IRAS before
// relying on this for a real purchase, same caveat as BSD/ABSD elsewhere
// in this app.
export const PROPERTY_TAX_NOO_AS_OF = '2024-01-01'
const PROPERTY_TAX_NOO_TIERS = [
  { upTo: 30_000, rate: 0.12 },
  { upTo: 45_000, rate: 0.20 },
  { upTo: 60_000, rate: 0.28 },
  { upTo: Infinity, rate: 0.36 },
]

export function calcAnnualPropertyTaxNonOwnerOccupied(annualValue) {
  const av = Number(annualValue)
  if (!Number.isFinite(av) || av <= 0) return 0
  let tax = 0
  let lower = 0
  for (const tier of PROPERTY_TAX_NOO_TIERS) {
    if (av <= lower) break
    const taxable = Math.min(av, tier.upTo) - lower
    tax += taxable * tier.rate
    lower = tier.upTo
  }
  return tax
}

// Full investment-property picture: what it costs to buy, what it costs
// to hold every month, and whether the rent covers that. ABSD is NOT
// computed (same reasoning as HouseMuch's next-purchase flow — it
// depends on citizenship/entity/existing-property-count facts this
// calculator doesn't collect) — pass in your own figure from the
// ABSD_REFERENCE table.
export function calcInvestmentProperty({
  price = 0, downpaymentPct = 25, rate = 0, tenureYears = 25,
  absd = 0, otherFees = 0,
  monthlyRent = 0, annualValue = 0, maintenanceMonthly = 0,
  vacancyMonthsPerYear = 1, agentCommissionMonths = 0.5,
}) {
  const p = Number(price) || 0
  const bsd = calcBSD(p)
  const downpayment = p * (Math.max(0, Math.min(100, Number(downpaymentPct) || 0)) / 100)
  const loanAmount = Math.max(0, p - downpayment)
  const monthlyInstalment = calcMonthlyInstalment(loanAmount, Number(rate) || 0, Number(tenureYears) || 25)
  const upfrontCost = downpayment + bsd + (Number(absd) || 0) + (Number(otherFees) || 0)

  const annualPropertyTax = calcAnnualPropertyTaxNonOwnerOccupied(annualValue)
  const monthlyPropertyTax = annualPropertyTax / 12

  // Rent isn't collected every month of the year — a vacancy assumption
  // between tenants is spread evenly across all 12 months rather than
  // shown as a cliff in whichever month it happens, since the point here
  // is a representative monthly cash flow, not a specific month's actual.
  const vacancy = Math.max(0, Math.min(12, Number(vacancyMonthsPerYear) || 0))
  const effectiveMonthlyRent = (Number(monthlyRent) || 0) * (12 - vacancy) / 12

  // Agent's commission (typically ~half a month's rent per year of lease
  // term in Singapore) is an annual cost, amortized monthly here for the
  // same "representative month" reasoning as vacancy above.
  const monthlyAgentCommission = (Number(monthlyRent) || 0) * (Number(agentCommissionMonths) || 0) / 12

  const monthlyOperatingCosts = monthlyPropertyTax + (Number(maintenanceMonthly) || 0) + monthlyAgentCommission
  const monthlyCashFlow = effectiveMonthlyRent - monthlyInstalment - monthlyOperatingCosts
  const annualCashFlow = monthlyCashFlow * 12

  const grossRentalYieldPct = p > 0 ? ((Number(monthlyRent) || 0) * 12 / p) * 100 : null
  const netRentalYieldPct = p > 0 ? ((effectiveMonthlyRent - monthlyOperatingCosts) * 12 / p) * 100 : null

  // The rent (before vacancy/commission drag) that would exactly cover
  // the instalment + operating costs — useful as a quick "is my asking
  // rent realistic" sanity check independent of the vacancy assumption.
  const breakEvenMonthlyRent = monthlyInstalment + monthlyOperatingCosts

  return {
    price: p, bsd, absd: Number(absd) || 0, otherFees: Number(otherFees) || 0,
    downpayment, loanAmount, monthlyInstalment, upfrontCost,
    annualPropertyTax, monthlyPropertyTax,
    effectiveMonthlyRent, monthlyAgentCommission, monthlyOperatingCosts,
    monthlyCashFlow, annualCashFlow,
    grossRentalYieldPct, netRentalYieldPct, breakEvenMonthlyRent,
    cashFlowPositive: monthlyCashFlow >= 0,
  }
}
