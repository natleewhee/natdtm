// src/lib/tco.js
// Rough estimates for the running costs that sit outside the loan/COE/PARF
// math in calc.js: insurance, road tax, and parking. These are the costs
// that make "true monthly cost" more than just "instalment + depreciation."
//
// IMPORTANT — these are estimates, not quotes:
// - Road tax in Singapore is actually computed from engine capacity (cc) for
//   ICE/hybrid cars, or power rating (kW) for pure EVs — LTA's precise
//   formula. We don't have cc/kW data for every car in cars.json, so this
//   approximates road tax by OMV band instead, which loosely tracks engine
//   size/power within a vehicle class but will be wrong for any specific
//   car. Always described as "~" in the UI, never presented as exact.
// - Insurance varies enormously by driver profile (age, NCD, claims history)
//   — this is a rough "typical comprehensive premium for this class of car"
//   figure, not a quote.
// - Parking is a flat estimate; actual cost depends heavily on location
//   (HDB season parking vs private/URA) and isn't really car-dependent.

import { MAINTENANCE_BY_BRAND, getAnnualMaintenance } from './maintenance.js'
import { isPureEV } from './calc.js'

// Annual season parking, a rough blended HDB/private average (S$/month × 12).
export const PARKING_ANNUAL_ESTIMATE = 1560

// Road tax bands by OMV — loosely mirrors LTA's tiered, superlinear schedule
// (bigger/more powerful cars pay disproportionately more). Pure EVs use a
// separate, generally lower schedule per LTA's revised EV road tax table.
const ROAD_TAX_BANDS_ICE = [
  { maxOmv: 20000, annual: 744 },   // ~1.3-1.6L compact
  { maxOmv: 35000, annual: 1164 },  // ~1.6-2.0L mid-size
  { maxOmv: 55000, annual: 2050 },  // ~2.0-3.0L / premium
  { maxOmv: Infinity, annual: 3600 }, // 3.0L+ / luxury-performance
]
const ROAD_TAX_BANDS_EV = [
  { maxOmv: 20000, annual: 700 },
  { maxOmv: 35000, annual: 1050 },
  { maxOmv: 55000, annual: 1700 },
  { maxOmv: Infinity, annual: 2800 },
]

export function estimateRoadTax(omv, pureEV) {
  const bands = pureEV ? ROAD_TAX_BANDS_EV : ROAD_TAX_BANDS_ICE
  return bands.find(b => (omv ?? 0) <= b.maxOmv).annual
}

// Insurance bands by OMV, with a small EV/performance loading — repair
// costs for EVs (battery, sensors, body panels) tend to run higher.
const INSURANCE_BANDS = [
  { maxOmv: 20000, annual: 1300 },
  { maxOmv: 35000, annual: 1800 },
  { maxOmv: 55000, annual: 2600 },
  { maxOmv: Infinity, annual: 4200 },
]

export function estimateInsurance(omv, pureEV) {
  const base = INSURANCE_BANDS.find(b => (omv ?? 0) <= b.maxOmv).annual
  return pureEV ? Math.round(base * 1.1) : base
}

// Sub-brand/model names that don't contain their parent brand's key or
// label as a substring, so the generic match below would miss them and
// silently fall back to the (much cheaper) 'toyota' tier — e.g. "Range
// Rover Sport" contains neither "landrover" nor "land rover".
const BRAND_ALIASES = {
  'range rover': 'landrover',
}

// Guess a maintenance brand key from a car's display name by matching
// against the known brands in MAINTENANCE_BY_BRAND (reusing the
// renew-or-replace tool's data rather than duplicating it) — falls back to
// the 'toyota' baseline tier if nothing matches, same fallback
// getAnnualMaintenance already uses for an unknown key.
export function guessBrandKey(carName) {
  const lower = (carName || '').toLowerCase()
  for (const alias of Object.keys(BRAND_ALIASES)) {
    if (lower.includes(alias)) return BRAND_ALIASES[alias]
  }
  for (const key of Object.keys(MAINTENANCE_BY_BRAND)) {
    const label = MAINTENANCE_BY_BRAND[key].label.toLowerCase()
    if (lower.includes(key) || lower.includes(label)) return key
  }
  return 'toyota'
}

// Full first-year running-cost estimate for a car, on top of the loan
// instalment and depreciation already covered by calc.js.
export function estimateAnnualRunningCosts(car) {
  const pureEV = isPureEV(car)
  const brandKey = guessBrandKey(car.name)
  const roadTax = estimateRoadTax(car.omv, pureEV)
  const insurance = estimateInsurance(car.omv, pureEV)
  const maintenance = getAnnualMaintenance(brandKey, 1)
  const total = roadTax + insurance + maintenance + PARKING_ANNUAL_ESTIMATE
  return {
    roadTax, insurance, maintenance, parking: PARKING_ANNUAL_ESTIMATE, total,
    monthly: total / 12,
    brandKey,
  }
}
