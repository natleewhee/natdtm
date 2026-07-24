// src/lib/calc.js
// Single source of truth for all cost calculations: ARF, PARF, COE rebate,
// government costs, depreciation, loan affordability.
// Pure functions — no React, no fetch. Covered by tests/calc.test.js.
//
// KEY LTA RULES:
// - ARF tiers effective Feb 2023: 100% on first $20k of OMV, 140% on next $20k,
//   190% on next $20k, 250% on next $20k, 320% above $80k.
// - PARF rebate (car deregistered at age ≤10yr): 75% of ARF at ≤5yr, stepping
//   down 5%/yr to 50% at 9–10yr, nil after 10yr. Capped at S$60,000 for cars
//   registered with COEs from the Feb 2023 second bidding onwards (Budget 2023).
// - COE rebate: unused months / 120 × COE paid.
// - EEAI (EV Early Adoption Incentive): 45% of ARF, capped at S$7,500,
//   pure EVs only.

import { C, RATE_TIERS } from './theme.js'

export { RATE_TIERS }

export const PARF_CAP = 60000

// MAS Total Debt Servicing Ratio: all monthly debt obligations (this loan's
// instalment plus any existing loans/credit facilities) capped at 55% of
// gross monthly income. This is a separate, harder constraint from the
// in-app 30%-of-take-home "comfort" verdict below — TDSR is what a bank
// actually checks before approving the loan, using gross income, not
// take-home, and counting every other debt obligation the borrower has.
export const TDSR_LIMIT = 0.55

// ─── COE FALLBACK CONSTANTS ──────────────────────────────────────────────────
// Updated manually after each LTA bidding (~2x/month).
// Used when the live DataMall fetch hasn't completed yet or fails.
// Source: 2026-07 1st bidding exercise, from a user-provided LTA export
// (public/data/coe-history.json has the full series). That export is
// month-level only, so COE_FALLBACK_AS_OF below is the 1st of that month as
// a placeholder, not the exact bidding date.
export const COE_FALLBACK = { catA: 129000, catB: 130889 }
// Date this fallback pair was last updated from an actual LTA bidding result.
// Bidding happens ~2x/month, so treat this as stale after ~45 days — the UI
// uses isCoeFallbackStale() to warn when the constant above hasn't been
// refreshed in a while, since a silently-stale hardcoded number is worse
// than an explicit warning.
export const COE_FALLBACK_AS_OF = '2026-07-01' // Jul 2026 1st bidding (day approximated — source data is month-level only)

export function isCoeFallbackStale(now = new Date()) {
  const ageDays = (now.getTime() - new Date(COE_FALLBACK_AS_OF).getTime()) / 86400000
  return ageDays > 45
}

export function calcARF(omv) {
  if (omv <= 20000) return omv
  if (omv <= 40000) return 20000 + (omv - 20000) * 1.4
  if (omv <= 60000) return 20000 + 20000 * 1.4 + (omv - 40000) * 1.9
  if (omv <= 80000) return 20000 + 20000 * 1.4 + 20000 * 1.9 + (omv - 60000) * 2.5
  return 20000 + 20000 * 1.4 + 20000 * 1.9 + 20000 * 2.5 + (omv - 80000) * 3.2
}

// PARF % by age at deregistration
export function parfPct(ageYears) {
  if (ageYears <= 5)  return 0.75
  if (ageYears <= 6)  return 0.70
  if (ageYears <= 7)  return 0.65
  if (ageYears <= 8)  return 0.60
  if (ageYears <= 9)  return 0.55
  if (ageYears <= 10) return 0.50
  return 0
}

export function calcPARF(netArf, ageYears) {
  return Math.min(netArf * parfPct(ageYears), PARF_CAP)
}

// COE rebate = unused months / 120 × COE paid
export function calcCOERebate(coePaid, monthsRemaining) {
  return Math.max(0, (monthsRemaining / 120) * coePaid)
}

export function isPureEV(car) {
  // EEAI applies to fully electric vehicles only — NOT hybrids, PHEVs, or e-Power
  // Tesla is always pure EV. Otherwise check the type field.
  return car.rateTier === 'tesla' || (car.type?.includes('Electric') ?? false)
}

export function calcNetARF(omv, ves, pureEV) {
  // Gross ARF → minus VES rebate/surcharge → minus EEAI for pure EVs only
  const grossArf = calcARF(omv || 0)
  const vesAmount = (ves ?? 0)
  const afterVES = Math.max(0, grossArf - vesAmount)
  const eeai = pureEV ? Math.min(afterVES * 0.45, 7500) : 0
  return { grossArf, vesAmount, eeai, netArf: Math.max(0, afterVES - eeai) }
}

export function getCOEPremium(car, liveCOEPremium) {
  // Use live DataMall value if available, else use hardcoded fallback
  if (liveCOEPremium !== null && liveCOEPremium !== undefined) return liveCOEPremium
  return car.coe === 'Cat A' ? COE_FALLBACK.catA : COE_FALLBACK.catB
}

export function calcGovtCosts(car, liveCOEPremium = null) {
  const pureEV = isPureEV(car)
  const ves = car.ves ?? 0
  const { grossArf, vesAmount, eeai, netArf } = calcNetARF(car.omv, ves, pureEV)
  const duty = car.omv * 0.308
  const regFee = 350
  const coe = getCOEPremium(car, liveCOEPremium)
  return { grossArf, vesAmount, eeai, netArf, duty, regFee, coe,
           total: car.omv + netArf + duty + regFee + coe }
}

const SGD = n => `S$${Math.round(n).toLocaleString('en-SG')}`

export function calcPriceGap(car, liveCOEPremium = null) {
  const isTesla = car.rateTier === 'tesla'
  const govtCosts = calcGovtCosts(car, liveCOEPremium)

  if (isTesla && car.subtotalExCOE) {
    // Tesla's vehicle subtotal (ex-COE) is their published price incl. GST.
    // It does NOT include excise duty, ARF, VES, EEAI — those are listed separately.
    // So we show it as a fraction of total car price, not as a "margin".
    const subtotalPct = (car.subtotalExCOE / car.price) * 100
    const govtPct = 100 - subtotalPct
    return {
      gap: car.subtotalExCOE, gapPct: subtotalPct, isTesla: true, govtCosts,
      label: 'Tesla vehicle price (ex-govt costs)',
      sublabel: `Tesla sells direct at a fixed global price. Vehicle subtotal ${SGD(car.subtotalExCOE)} (${subtotalPct.toFixed(0)}% of total price) — the remaining ${govtPct.toFixed(0)}% is ARF, COE, duty, and registration.`,
      isSubtotal: true,
    }
  }

  // Standard distributor margin calculation.
  //
  // When the listed price is BELOW total known government costs, the margin
  // can't be estimated — it would clamp to a misleading S$0. That happens
  // because our seeded sticker prices were captured when COE was lower than
  // the ~S$129-131k figure subtracted here, so price − govtCosts goes
  // negative. Rather than show a false S$0, flag it as not-estimable and
  // point the user at the price field (a real dealer quote at today's COE
  // makes the estimate work).
  const rawGap = car.price - govtCosts.total
  const unreliable = rawGap <= 0
  const gap = Math.max(0, rawGap)
  const gapPct = (gap / car.price) * 100
  return {
    gap, gapPct, unreliable, isTesla, govtCosts,
    label: isTesla ? 'Est. price above govt costs' : 'Est. distributor margin',
    sublabel: unreliable
      ? `This car's seeded price predates the current ${SGD(govtCosts.coe)} ${car.coe} COE, so a margin can't be estimated from it — enter your actual dealer quote above to see it.`
      : isTesla
      ? 'Tesla sells direct — no local distributor. Calculated from car price minus all known government costs.'
      : 'Estimated as car price minus OMV, ARF (net of EEAI for EVs), excise duty, GST, COE, and registration fee.',
  }
}

export function calcDepr(car, y, liveCOEPremium = null) {
  const pureEV = isPureEV(car)
  const ves = car.ves ?? 0
  const { grossArf, netArf, eeai } = calcNetARF(car.omv, ves, pureEV)
  const coe = getCOEPremium(car, liveCOEPremium)
  const parf = calcPARF(netArf, y)
  const coeR = calcCOERebate(coe, Math.max(0, 120 - y * 12))
  const paper = parf + coeR
  const totalDepr = car.price - paper
  // Safety: if any value is NaN (e.g. missing car fields), return zeroed object
  if (isNaN(totalDepr) || isNaN(parf) || isNaN(coeR)) {
    return { grossArf:0, netArf:0, eeai:0, coePaid:0, parf:0, coeRebate:0, paperValue:0,
             totalDepr:car.price||0, annualDepr:(car.price||0)/y, monthlyDepr:(car.price||0)/y/12 }
  }
  return { grossArf, netArf, eeai, coePaid:coe, parf, coeRebate:coeR, paperValue:paper,
           totalDepr, annualDepr:totalDepr/y, monthlyDepr:totalDepr/y/12 }
}

export function calc(salary, down, tenure, car, liveCOE = null, existingDebt = 0) {
  // Coerce and validate inputs — reject non-numeric, non-positive, or absurd values
  salary = Number(salary)
  down   = Number(down)
  tenure = Number(tenure)
  existingDebt = Number(existingDebt)
  if (!Number.isFinite(existingDebt) || existingDebt < 0) existingDebt = 0
  if (!car || !Number.isFinite(salary) || !Number.isFinite(down) || !Number.isFinite(tenure)) return null
  if (salary <= 0 || down <= 0 || tenure < 1 || tenure > 10) return null
  if (!Number.isFinite(car.price) || car.price <= 0) return null

  const tier = RATE_TIERS.find(t => t.id === car.rateTier) ?? RATE_TIERS[0]
  const maxLoan = car.price * (car.loanCap / 100)
  const minDown = car.price * (1 - car.loanCap / 100)
  const canDown = down >= minDown
  const loan = canDown ? Math.min(Math.max(0, car.price - down), maxLoan) : maxLoan
  const reqDown = minDown
  const months = tenure * 12
  const interest = loan * tier.rate * tenure
  const repay = loan + interest
  const monthly = repay / months
  const takeHome = salary * 0.80
  const ratio = monthly / takeHome
  const saving = loan * 0.026 * tenure - interest
  const liveCOEPremium = liveCOE ? (car.coe === 'Cat A' ? liveCOE.catA : liveCOE.catB) : null
  const deprAtTenure = calcDepr(car, tenure, liveCOEPremium)
  const totalCoo = (canDown ? down : reqDown) + repay
  const extraDown = canDown ? Math.max(0, down - reqDown) : 0
  // Generate a point for every year 1..tenure for the ownership curve
  const allYears = Array.from({length: tenure}, (_, i) => i + 1)
  const coo = allYears.map(y => {
    const d = calcDepr(car, y, liveCOEPremium)
    const lp = monthly * y * 12
    const ip = (interest / months) * y * 12
    const du = canDown ? down : reqDown
    const cashOut = du + lp
    const paperValue = d.paperValue
    const sunkCost = cashOut - paperValue  // true money gone (can be negative early on)
    return { year:y, cashOut, downUsed:du, loanPaid:lp, interestPaid:ip,
             principalPaid:lp-ip, paperValue, parfNow:d.parf,
             coeRebateNow:d.coeRebate, sunkCost }
  })
  let verdict, vc, vcText, vbg, vborder
  if (!canDown)         { verdict='Insufficient Downpayment'; vc=C.red;    vcText=C.redText;   vbg=C.redBg;    vborder=C.red }
  else if (ratio<=0.30) { verdict='Affordable';               vc=C.green;  vcText=C.greenText; vbg=C.greenBg;  vborder=C.green }
  else if (ratio<=0.45) { verdict='Stretch';                  vc=C.amber;  vcText=C.amberText; vbg=C.amberBg;  vborder=C.amber }
  else                  { verdict='Out of Range';              vc=C.red;    vcText=C.redText;   vbg=C.redBg;    vborder=C.red }

  // TDSR uses GROSS monthly income (salary), not the 80%-take-home figure
  // the comfort verdict above is based on — and counts existing debt
  // obligations on top of this loan's own instalment.
  const tdsr = (existingDebt + monthly) / salary
  const tdsrExceeded = tdsr > TDSR_LIMIT

  return { car, tier, loan, maxLoan, reqDown, canDown, extraDown,
           shortfall:Math.max(0, reqDown-down),
           monthly, interest, repay, takeHome, ratio, months,
           verdict, vc, vcText, vbg, vborder,
           saving, coo, totalCoo, lcPct:car.loanCap/100, deprAtTenure,
           liveCOE: liveCOE !== null, liveCOEPremium,
           salary, down, tenure, existingDebt, tdsr, tdsrExceeded }
}

export function calcCeiling(salary, down, tenure, existingDebt = 0) {
  salary = Number(salary); down = Number(down); tenure = Number(tenure)
  existingDebt = Number(existingDebt)
  if (!Number.isFinite(existingDebt) || existingDebt < 0) existingDebt = 0
  if (!salary || salary <= 0 || !tenure || tenure < 1) return null
  const takeHome = salary * 0.80
  const maxMonthlyComfort = takeHome * 0.30
  const maxMonthlyTdsr = Math.max(0, salary * TDSR_LIMIT - existingDebt)
  const maxMonthly = Math.min(maxMonthlyComfort, maxMonthlyTdsr)
  const tdsrBinding = maxMonthlyTdsr < maxMonthlyComfort
  const months = tenure * 12
  const rate = 0.0208
  const maxLoan = maxMonthly * months / (1 + rate * tenure)
  const affordA = Math.min(maxLoan / 0.70, down > 0 ? down / 0.30 : maxLoan / 0.70)
  const affordB = Math.min(maxLoan / 0.60, down > 0 ? down / 0.40 : maxLoan / 0.60)
  return { catA:Math.floor(affordA/1000)*1000, catB:Math.floor(affordB/1000)*1000,
           takeHome, maxMonthly, maxMonthlyComfort, maxMonthlyTdsr, tdsrBinding }
}
