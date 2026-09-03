// Generic progressive/tiered-rate accumulator — the same shape used by
// Buyer's Stamp Duty (house/stampDuty.js), non-owner-occupied property
// tax (propinvest/calc.js), and Singapore's income tax bands, all of
// which apply a different rate to each successive slice of an amount.
// `tiers` is an ascending list of { upTo, rate }, where each tier's rate
// applies only to the portion of `amount` between the previous tier's
// upTo and this one's.
/**
 * Generic progressive/tiered-rate accumulator, applying each tier's rate
 * only to the slice of `amount` within that tier — the same shape used
 * by Buyer's Stamp Duty, non-owner-occupied property tax, and Singapore
 * income tax bands.
 * @param {number} amount - The amount to tax.
 * @param {Array<{upTo: number, rate: number}>} tiers - Ascending tiers; each rate applies to the portion
 *   of `amount` between the previous tier's `upTo` and this one's.
 * @returns {number} Total tax across all tiers.
 */
export function tieredTax(amount, tiers) {
  const a = Number(amount)
  if (!Number.isFinite(a) || a <= 0) return 0
  let tax = 0
  let lower = 0
  for (const tier of tiers) {
    if (a <= lower) break
    const taxable = Math.min(a, tier.upTo) - lower
    tax += taxable * tier.rate
    lower = tier.upTo
  }
  return tax
}
