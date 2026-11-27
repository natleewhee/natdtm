// src/lib/tax/optimise.ts
// Reliefs optimiser: given some spare cash, how far can SRS and CPF cash
// top-ups cut this year's tax bill, in which order, and what does each
// dollar cost you in access? Pure functions on top of calc.js.
//
// Every relief here lowers chargeable income dollar for dollar, so they
// all save tax at the same marginal rate. What differs is where the money
// ends up and how long it is locked, which is why the fill order comes
// from the person's own priority rather than from the tax maths.
//
// Rules this encodes (verified against IRAS, see docs/statutory-sources.md):
// - SRS: up to SRS_CAP_CITIZEN_PR (or SRS_CAP_FOREIGNER) a year. Tax is
//   deferred, not removed: 50% of each withdrawal from the statutory
//   retirement age is taxable.
// - CPF Cash Top-up Relief: up to RSTU_RELIEF_CAP_SELF for top-ups to your
//   own SA/RA *and* MediSave combined (MediSave top-ups joined this relief
//   from 1 Jan 2022), plus RSTU_RELIEF_CAP_FAMILY for family members.
//   A MediSave top-up is also limited by the room left under the Basic
//   Healthcare Sum; an SA/RA top-up by the room left under the Full
//   Retirement Sum. Withdrawals are never taxed. A family top-up to a
//   spouse or sibling only counts if they earned FAMILY_INCOME_LIMIT or
//   less the year before (or have a disability); none for parents or
//   grandparents. MediSave top-ups that attract a Matched MediSave grant
//   lose the relief for top-ups made from 1 Jan 2026 (YA 2027).
// - Every relief together is capped at PERSONAL_RELIEF_CAP.

import {
  calcTax, TAX_BANDS, PERSONAL_RELIEF_CAP,
  RSTU_RELIEF_CAP_SELF, RSTU_RELIEF_CAP_FAMILY,
} from './calc.ts'

export const FAMILY_INCOME_LIMIT = 8_000

export type Lever = 'srs' | 'cpfMa' | 'cpfRa' | 'cpfFamily'
export type Priority = 'access' | 'taxFree'

export const LEVERS: Lever[] = ['srs', 'cpfMa', 'cpfRa', 'cpfFamily']

export const LEVER_INFO: Record<Lever, { label: string; destination: string; access: string; taxLater: boolean }> = {
  srs: {
    label: 'SRS contribution',
    destination: 'Your SRS account, which you can invest',
    access: 'Withdraw any time, but before the statutory retirement age a withdrawal is fully taxable plus a 5% penalty. From that age, 50% of each withdrawal is taxable.',
    taxLater: true,
  },
  cpfMa: {
    label: 'CPF top-up to your MediSave',
    destination: 'Your MediSave Account',
    access: 'Stays yours and pays for approved healthcare and MediShield Life or Integrated Shield premiums. Not withdrawable as cash. A top-up that earns a Matched MediSave grant gets no relief from YA 2027.',
    taxLater: false,
  },
  cpfRa: {
    label: 'CPF top-up to your SA/RA',
    destination: 'Your Special Account (or Retirement Account from 55)',
    access: 'Locked for retirement and paid out through CPF LIFE. It earns CPF interest and is never taxed.',
    taxLater: false,
  },
  cpfFamily: {
    label: 'CPF top-up for a family member',
    destination: "A parent's, grandparent's, spouse's or sibling's CPF",
    access: 'The money becomes theirs. For a spouse or sibling, the relief only counts if they earned S$8,000 or less last year (or have a disability).',
    taxLater: false,
  },
}

// Fill order for each priority. MediSave comes before SA/RA because it is
// the more usable of the two; a family top-up is always last because the
// money stops being yours.
export const PRIORITY_ORDER: Record<Priority, Lever[]> = {
  access: ['srs', 'cpfMa', 'cpfRa', 'cpfFamily'],
  taxFree: ['cpfMa', 'cpfRa', 'srs', 'cpfFamily'],
}

const pos = (v: unknown): number => Math.max(0, Number(v) || 0)
const roomOr = (v: unknown): number => (v === null || v === undefined || v === '' ? Infinity : pos(v))

/**
 * How much each lever can still take this year, before the shared
 * personal relief cap.
 * @param {object} taxInputs - Inputs accepted by calcTax.
 * @param {{maRoom?: number|null, raRoom?: number|null}} [rooms] - Room left
 *   under the Basic Healthcare Sum and the Full Retirement Sum; blank
 *   means "assume enough room".
 * @returns {{srs: number, cpfSelf: number, cpfMa: number, cpfRa: number, cpfFamily: number, capHeadroom: number}}
 */
export function leverCapacity(taxInputs: Record<string, any>, rooms: {maRoom?: number|null, raRoom?: number|null} = {}): {srs: number, cpfSelf: number, cpfMa: number, cpfRa: number, cpfFamily: number, capHeadroom: number} {
  const base = calcTax(taxInputs)
  // Only citizens and PRs have CPF accounts to top up.
  const noCpf = !!taxInputs.isForeigner
  const cpfSelf = noCpf ? 0 : Math.max(0, RSTU_RELIEF_CAP_SELF - base.reliefs.breakdown.rstuSelf)
  return {
    srs: base.srsHeadroom,
    cpfSelf,
    cpfMa: Math.min(cpfSelf, roomOr(rooms.maRoom)),
    cpfRa: Math.min(cpfSelf, roomOr(rooms.raRoom)),
    cpfFamily: noCpf ? 0 : Math.max(0, RSTU_RELIEF_CAP_FAMILY - base.reliefs.breakdown.rstuFamily),
    capHeadroom: Math.max(0, PERSONAL_RELIEF_CAP - base.reliefs.raw),
  }
}

function withAllocation(taxInputs: Record<string, any>, alloc: Record<Lever, number>) {
  return {
    ...taxInputs,
    srsContribution: pos(taxInputs.srsContribution) + (alloc.srs || 0),
    rstuSelf: pos(taxInputs.rstuSelf) + (alloc.cpfMa || 0) + (alloc.cpfRa || 0),
    rstuFamily: pos(taxInputs.rstuFamily) + (alloc.cpfFamily || 0),
  }
}

/**
 * Splits a reduction in chargeable income into the tax bands it comes
 * out of, top band first. Shows why the first dollars save the most.
 * @param {number} chargeableIncome - Chargeable income before the reduction.
 * @param {number} amount - Total reduction in dollars.
 * @returns {{rate: number, amount: number, saving: number}[]}
 */
export function bandSlices(chargeableIncome: number, amount: number): {rate: number, amount: number, saving: number}[] {
  let top = pos(chargeableIncome)
  let left = Math.min(pos(amount), top)
  const out = []
  for (let i = TAX_BANDS.length - 1; i >= 0 && left > 0; i--) {
    const lower = i === 0 ? 0 : TAX_BANDS[i - 1].upTo
    if (top <= lower) continue
    const take = Math.min(left, top - lower)
    out.push({ rate: TAX_BANDS[i].rate, amount: take, saving: take * TAX_BANDS[i].rate })
    top -= take
    left -= take
  }
  return out
}

/**
 * Allocates spare cash across the chosen levers in priority order, up to
 * each lever's own limit and the shared personal relief cap, and prices
 * each step in tax saved.
 * @param {object} taxInputs - Inputs accepted by calcTax.
 * @param {object} options
 * @param {number} options.spare - Cash the person is willing to put away this year.
 * @param {'access'|'taxFree'} [options.priority='access'] - Fill order.
 * @param {Partial<Record<string, boolean>>} [options.levers] - Levers to use; all on by default.
 * @param {number|null} [options.maRoom] - Room under the Basic Healthcare Sum.
 * @param {number|null} [options.raRoom] - Room under the Full Retirement Sum.
 * @returns {object} steps, totals, the band slices and what limited the plan.
 */
export function optimiseReliefs(taxInputs: Record<string, any>, options: { spare?: number; priority?: Priority; levers?: Partial<Record<Lever, boolean>>; maRoom?: number | null; raRoom?: number | null } = {}) {
  const { spare = 0, priority = 'access', levers = {}, maRoom = null, raRoom = null } = options
  const base = calcTax(taxInputs)
  const cap = leverCapacity(taxInputs, { maRoom, raRoom })
  const order = PRIORITY_ORDER[priority] || PRIORITY_ORDER.access
  const enabled = (k: Lever) => levers[k] !== false

  let budget = Math.min(pos(spare), cap.capHeadroom)
  let selfLeft = cap.cpfSelf
  const alloc: Record<Lever, number> = { srs: 0, cpfMa: 0, cpfRa: 0, cpfFamily: 0 }
  const steps: Array<{ lever: Lever; amount: number; saving: number; label: string; destination: string; access: string; taxLater: boolean }> = []
  let prevTax = base.tax

  for (const k of order) {
    if (!enabled(k) || budget <= 0) continue
    let room = cap[k]
    if (k === 'cpfMa' || k === 'cpfRa') room = Math.min(room, selfLeft)
    const amount = Math.min(budget, room)
    if (amount <= 0) continue
    alloc[k] = amount
    if (k === 'cpfMa' || k === 'cpfRa') selfLeft -= amount
    budget -= amount
    const tax = calcTax(withAllocation(taxInputs, alloc)).tax
    steps.push({ lever: k, amount, saving: prevTax - tax, ...LEVER_INFO[k] })
    prevTax = tax
  }

  const used = steps.reduce((s, x) => s + x.amount, 0)
  const after = calcTax(withAllocation(taxInputs, alloc))
  const saving = base.tax - after.tax
  const unused = Math.max(0, pos(spare) - used)
  let limitedBy: 'reliefCap' | 'leverLimits' | null = null
  if (unused > 0) {
    limitedBy = cap.capHeadroom <= used ? 'reliefCap' : 'leverLimits'
  }

  return {
    baseTax: base.tax,
    newTax: after.tax,
    saving,
    used,
    unused,
    limitedBy,
    savingRate: used > 0 ? saving / used : 0,
    taxDeferredOnly: alloc.srs,
    steps,
    slices: bandSlices(base.chargeableIncome, used),
    marginalBefore: base.marginal,
    marginalAfter: after.marginal,
    capacity: cap,
  }
}
