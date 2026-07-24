// src/lib/house/stampDuty.js
// Singapore residential stamp duty schedules — public IRAS rates, revised
// periodically at the national Budget or via ad-hoc cooling measures. Each
// AS_OF date below is when the figures were last confirmed against IRAS;
// treat these as indicative and verify at go.gov.sg/bsdrates (or the
// equivalent current IRAS page) before relying on them for a real
// transaction — the same caveat this app already applies to Drive's
// COE/PARF constants.

export const BSD_AS_OF = '2023-02-15' // last residential BSD tier revision

// Buyer's Stamp Duty — tiered on purchase price / market value, whichever
// is higher. Same schedule for HDB and private residential property.
const BSD_TIERS = [
  { upTo: 180_000, rate: 0.01 },
  { upTo: 360_000, rate: 0.02 },
  { upTo: 1_000_000, rate: 0.03 },
  { upTo: 1_500_000, rate: 0.04 },
  { upTo: 3_000_000, rate: 0.05 },
  { upTo: Infinity, rate: 0.06 },
]

export function calcBSD(price) {
  const p = Number(price)
  if (!Number.isFinite(p) || p <= 0) return 0
  let duty = 0
  let lower = 0
  for (const tier of BSD_TIERS) {
    if (p <= lower) break
    const taxable = Math.min(p, tier.upTo) - lower
    duty += taxable * tier.rate
    lower = tier.upTo
  }
  return duty
}

export const ABSD_AS_OF = '2023-04-27' // last ABSD rate revision

// Reference table only — deliberately NOT wired into a computed number.
// Real ABSD eligibility depends on citizenship, entity structure, existing
// property count, and remission schemes (e.g. married couples buying
// jointly) that this calculator doesn't model. Shown next to a manual
// ABSD input so you can look up your bracket and type the amount in
// yourself.
export const ABSD_REFERENCE = [
  { profile: 'Singapore Citizen — 1st residential property', rate: '0%' },
  { profile: 'Singapore Citizen — 2nd residential property', rate: '20%' },
  { profile: 'Singapore Citizen — 3rd+ residential property', rate: '30%' },
  { profile: 'Permanent Resident — 1st residential property', rate: '5%' },
  { profile: 'Permanent Resident — 2nd+ residential property', rate: '30%' },
  { profile: 'Foreigner — any residential property', rate: '60%' },
  { profile: 'Entity (company / trustee)', rate: '65%' },
]

export const SSD_AS_OF = '2017-03-11' // current private-property SSD holding-period schedule

// Seller's Stamp Duty — private residential property only. HDB flats are
// governed by the Minimum Occupation Period instead (see HDB_MOP_YEARS
// below), not SSD, so this always returns 0 for HDB.
export function calcSSD(salePrice, yearsHeld, propertyType) {
  const p = Number(salePrice)
  if (propertyType !== 'private' || !Number.isFinite(p) || p <= 0 || !Number.isFinite(yearsHeld)) {
    return { rate: 0, amount: 0 }
  }
  let rate
  if (yearsHeld < 1) rate = 0.12
  else if (yearsHeld < 2) rate = 0.08
  else if (yearsHeld < 3) rate = 0.04
  else rate = 0
  return { rate, amount: p * rate }
}

// HDB flats can't legally be sold before this many years from purchase
// (the Minimum Occupation Period) — a legal gate, not a cost, so it's
// surfaced as a warning rather than folded into the money math.
export const HDB_MOP_YEARS = 5
