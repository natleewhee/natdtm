// src/app/renew-or-replace/renew-math.js
// Pure calculation functions — no React, no UI.
// Designed for easy extraction to a standalone tool.
//
// KEY LTA RULES (source: onemotoring.lta.gov.sg/coe-renewal):
// 5-year renewal: pay 50% of PQP. For Cars (Cat A/B), can only be done ONCE.
//   After 5-year renewal expires, car MUST be deregistered — cannot renew again.
// 10-year renewal: pay 100% of PQP. Can be renewed repeatedly in 10-year blocks.

// ─── MAINTENANCE COSTS BY BRAND ──────────────────────────────────────────────
// Moved to src/lib/maintenance.js so it can be shared with the total-cost-of-
// ownership estimate on the main calculator (src/lib/tco.js) without
// reaching from src/lib into src/app.
import { MAINTENANCE_BY_BRAND, getAnnualMaintenance, getTotalMaintenance } from '@/lib/drive/maintenance.js'
export { MAINTENANCE_BY_BRAND, getAnnualMaintenance, getTotalMaintenance }

// ─── ARF / PARF ──────────────────────────────────────────────────────────────
// Imported from the shared calc engine (src/lib/calc.js) so this module
// stays in sync with page.js, coe-explained, and renew-or-replace instead of
// keeping its own copy. Previously this file duplicated the formulas locally
// and they had drifted out of sync with page.js's copy (which used the wrong
// PARF percentages) — see src/lib/calc.js for the corrected, tested version.
import { calcARF, parfPct, calcPARF, calcCOERebate } from '@/lib/drive/calc.js'
export { calcARF, parfPct, calcPARF, calcCOERebate }

// ─── CORE CALCULATION: annual cost ───────────────────────────────────────────
// Annual cost = (total money out − total money recovered) / years
// This is the single comparison number across all options.

function annualCost(totalOut, totalRecovered, years) {
  return (totalOut - totalRecovered) / years
}

// ─── OPTION 1 & 2: RENEW (5yr or 10yr) ──────────────────────────────────────
// inputs: {
//   carAge,          current age in years
//   monthsRemaining, COE months left
//   pqp,             current PQP for this car's category
//   omv,             car's OMV (for PARF calc)
//   ves,             VES rebate (for net ARF)
//   isEV,            for EEAI calc
//   brandKey,        for maintenance
//   renewYears,      5 or 10
//   customMaintenance  optional S$/yr override
// }
export function calcRenewOption(inputs) {
  const { carAge, monthsRemaining, pqp, omv, ves, isEV,
          brandKey, renewYears, customMaintenance } = inputs

  // LTA rule: 5yr = 50% PQP, 10yr = 100% PQP
  const renewalCost = renewYears === 5 ? pqp * 0.5 : pqp

  const endAge = carAge + renewYears

  // Scrap value given up now (by choosing to renew instead of scrap)
  const arf = calcARF(omv || 20000)
  const eeai = isEV ? Math.min(arf * 0.45, 7500) : 0
  const netArf = Math.max(0, arf - eeai)
  const parfNow = calcPARF(netArf, carAge)
  const coeRebateNow = calcCOERebate(pqp, monthsRemaining) // approx using current PQP
  const opportunityCost = parfNow + coeRebateNow

  // Maintenance over renewal period
  const maintenance = customMaintenance != null
    ? customMaintenance * renewYears
    : getTotalMaintenance(brandKey, carAge, renewYears)

  // Recovery at end of renewal period
  // 5yr: car must be deregistered → PARF at endAge (if <10), zero COE rebate
  // 10yr: car can renew again → PARF at endAge (if <10), zero COE rebate (fully used)
  const parfAtEnd = endAge <= 10 ? calcPARF(netArf, endAge) : 0
  // Zero COE rebate because the renewed COE will be fully consumed
  const recoveryAtEnd = parfAtEnd

  const totalCost = renewalCost + opportunityCost + maintenance - recoveryAtEnd
  const annual = annualCost(renewalCost + opportunityCost + maintenance, recoveryAtEnd, renewYears)

  // EV battery risk flag
  const isEvBrand = ['byd','tesla','xpeng','zeekr','gac','deepal','smart','mg'].includes(brandKey)
  const batteryRisk = isEvBrand && endAge >= 8

  // LTA warning for 5yr: cannot renew again
  const finalCoe = renewYears === 5

  return {
    type: 'renew',
    renewYears,
    renewalCost,
    opportunityCost,
    maintenance,
    recoveryAtEnd,
    totalCost,
    annual,
    endAge,
    batteryRisk,
    finalCoe,  // 5yr renewal = this is the last COE for this car
    breakdown: { renewalCost, opportunityCost, maintenance, recoveryAtEnd },
  }
}

// ─── OPTION 3: BUY NEW ───────────────────────────────────────────────────────
// inputs: {
//   price,        total car price incl. COE
//   omv,          for PARF recovery calc
//   ves, isEV,    for net ARF
//   salary, downpayment, tenure, loanCap, rateTier
//   brandKey,     for maintenance
//   years,        comparison horizon (default 10 to match 10yr renew)
//   customMaintenance
// }
export function calcBuyNewOption(inputs) {
  const { price, omv, ves, isEV, salary, downpayment, tenure,
          loanCap, rateTier, brandKey, years = 10, customMaintenance } = inputs

  const RATES = { ice: 0.0260, green: 0.0208, tesla: 0.0168 }
  const rate = RATES[rateTier] || 0.0260
  const minDown = price * (1 - loanCap / 100)
  const actualDown = Math.max(downpayment || minDown, minDown)
  const loan = Math.min(price - actualDown, price * (loanCap / 100))
  const interest = loan * rate * tenure
  const monthly = (loan + interest) / (tenure * 12)
  const totalRepaid = actualDown + loan + interest

  // PARF + COE recovery at end of comparison horizon
  const arf = calcARF(omv || 20000)
  const eeai = isEV ? Math.min(arf * 0.45, 7500) : 0
  const netArf = Math.max(0, arf - eeai)
  const parfAtHorizon = calcPARF(netArf, years)
  // COE rebate: if years < 10, some COE months remain
  // Assume COE paid ≈ price - (omv + netArf + duty + regFee)
  const duty = (omv || 20000) * 0.308
  const estCOEPaid = Math.max(0, price - (omv || 20000) - netArf - duty - 350)
  const monthsRemainingAtHorizon = Math.max(0, 120 - years * 12)
  const coeRebateAtHorizon = calcCOERebate(estCOEPaid, monthsRemainingAtHorizon)
  const recoveryAtEnd = parfAtHorizon + coeRebateAtHorizon

  const maintenance = customMaintenance != null
    ? customMaintenance * years
    : getTotalMaintenance(brandKey, 0, years)

  const totalCost = totalRepaid + maintenance - recoveryAtEnd
  const annual = annualCost(totalRepaid + maintenance, recoveryAtEnd, years)

  const takeHome = (salary || 0) * 0.80
  const ratio = takeHome > 0 ? monthly / takeHome : null

  return {
    type: 'new',
    years,
    actualDown, loan, monthly, tenure,
    totalRepaid, maintenance, recoveryAtEnd, totalCost, annual,
    ratio, canAfford: ratio !== null ? ratio <= 0.30 : null,
    breakdown: { downpayment: actualDown, instalments: loan + interest, maintenance, recoveryAtEnd },
  }
}

// ─── OPTION 4: BUY USED ──────────────────────────────────────────────────────
// inputs: {
//   price,           asking price of used car
//   carAge,          age of used car in years
//   monthsRemaining, COE months left on used car
//   mileage,         km (affects maintenance tier)
//   omv,             for PARF recovery calc
//   brandKey,
//   customMaintenance
// }
export function calcBuyUsedOption(inputs) {
  const { price, carAge, monthsRemaining, mileage, omv, brandKey, customMaintenance } = inputs

  const usefulYears = monthsRemaining / 12

  // Can you renew after? Only if car will be ≤10yr old at COE expiry
  // Used car age + remaining years ≤ 10 → possible to get PARF at expiry
  const ageAtExpiry = carAge + usefulYears
  const canGetPARF = ageAtExpiry <= 10

  const arf = calcARF(omv || 20000)
  const netArf = arf  // used cars typically have no EEAI left to worry about
  const parfAtExpiry = canGetPARF ? calcPARF(netArf, ageAtExpiry) : 0
  // COE fully used at expiry → no rebate
  const recoveryAtEnd = parfAtExpiry

  // Mileage penalty on maintenance: high mileage cars cost more to maintain
  const mileageFactor = mileage > 100000 ? 1.4 : mileage > 60000 ? 1.2 : 1.0
  const baseMaint = customMaintenance != null
    ? customMaintenance * usefulYears
    : getTotalMaintenance(brandKey, carAge, Math.ceil(usefulYears))
  const maintenance = baseMaint * mileageFactor

  const totalCost = price + maintenance - recoveryAtEnd
  const annual = usefulYears > 0 ? annualCost(price + maintenance, recoveryAtEnd, usefulYears) : 0

  // Cost per remaining COE year — the clearest metric for used car value
  const costPerCOEYear = usefulYears > 0 ? price / usefulYears : 0

  return {
    type: 'used',
    usefulYears: Math.round(usefulYears * 10) / 10,
    ageAtExpiry: Math.round(ageAtExpiry * 10) / 10,
    canGetPARF,
    maintenance,
    mileageFactor,
    recoveryAtEnd,
    totalCost,
    annual,
    costPerCOEYear,
    breakdown: { purchasePrice: price, maintenance, recoveryAtEnd },
  }
}

// ─── VERDICT ─────────────────────────────────────────────────────────────────
// Compare all options by annual cost and produce a directional assessment.
export function getVerdict(options) {
  // Sort by annual cost ascending
  const sorted = [...options].sort((a, b) => a.annual - b.annual)
  const cheapest = sorted[0]
  const second = sorted[1]

  const diff = second.annual - cheapest.annual
  const pctDearer = second.annual > 0 ? ((second.annual - cheapest.annual) / cheapest.annual * 100) : 0

  const labels = { renew5: 'Renewing 5 years', renew10: 'Renewing 10 years', new: 'Buying new', used: 'Buying used' }
  const cheapestLabel = cheapest.typeLabel || labels[cheapest.type + (cheapest.renewYears || '')]

  let headline, rationale, caveats = []

  if (pctDearer < 5) {
    headline = 'The options are roughly equal'
    rationale = `All options cost within 5% of each other per year. The decision comes down to personal preference — peace of mind from a new car, or keeping a familiar vehicle.`
  } else if (pctDearer < 20) {
    headline = `${cheapestLabel} appears slightly cheaper`
    rationale = `${cheapestLabel} costs roughly ${fmtSGD(diff)}/year less — a meaningful difference but not dramatic. Other factors like reliability, warranty, and your financial situation matter here.`
  } else {
    headline = `${cheapestLabel} is meaningfully cheaper`
    rationale = `${cheapestLabel} costs roughly ${fmtSGD(diff)}/year less — a ${pctDearer.toFixed(0)}% difference that's hard to ignore from a purely financial standpoint.`
  }

  // Specific caveats
  for (const opt of options) {
    if (opt.type === 'renew' && opt.renewYears === 5 && opt.finalCoe) {
      caveats.push(`After the 5-year renewal, your car must be deregistered — budget for a replacement car at that point. This cost is not included above.`)
    }
    if (opt.batteryRisk) {
      caveats.push(`EV battery replacement risk: your car will be ${opt.endAge} years old at end of renewal. Battery replacement can cost S$15,000–30,000.`)
    }
    if (opt.type === 'new' && opt.ratio !== null && opt.ratio > 0.30) {
      caveats.push(`New car monthly instalment (${fmtSGD(opt.monthly)}/mo) exceeds 30% of take-home pay — may strain your budget.`)
    }
    if (opt.type === 'used' && opt.mileageFactor > 1) {
      caveats.push(`High mileage on the used car adds estimated maintenance costs.`)
    }
  }

  return { headline, rationale, caveats, cheapest, sorted, pctDearer, diff }
}

function fmtSGD(n) {
  return `S$${Math.round(Math.abs(n)).toLocaleString('en-SG')}`
}
