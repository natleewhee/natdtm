// src/lib/ledger/summary.js
// The "Your money" summary on the home dashboard (super-app plan U8).
// Pure: takes the active profile's "My Numbers" data and returns the
// tiles to show. Every figure comes from MyLedger's own engine
// (buildBaselineState + calc*), so the home page and /ledger can never
// disagree about the same numbers.

import {
  buildBaselineState, calcNetWorth, calcTDSR, calcInvestmentCapacity, calcTakeHome, TDSR_LIMIT,
} from './calc.js'

/** After this many days a tile's figure is flagged as worth re-checking. */
export const STALE_AFTER_DAYS = 180

const DAY = 86_400_000

/**
 * "today", "yesterday", "12 days ago", "4 months ago", "over a year ago".
 * @param {number|null|undefined} savedAt - epoch ms
 * @param {number} [now]
 * @returns {string|null}
 */
export function relativeAge(savedAt, now = Date.now()) {
  if (!savedAt || !Number.isFinite(savedAt)) return null
  const days = Math.floor((now - savedAt) / DAY)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 45) return `${days} days ago`
  const months = Math.round(days / 30.4)
  if (months < 12) return `${months} months ago`
  return 'over a year ago'
}

function isStale(savedAt, now) {
  return !!savedAt && now - savedAt > STALE_AFTER_DAYS * DAY
}

function latest(...stamps) {
  const s = stamps.filter((x) => Number.isFinite(x))
  return s.length ? Math.max(...s) : null
}

/** Which tool slots hold synced numbers (not just saved form inputs). */
export function filledModules(myNumbers) {
  const d = myNumbers || {}
  const has = (slot) => !!d[slot] && Number.isFinite(d[slot].savedAt)
  return {
    insure: has('insure'), drive: has('drive'), etf: has('etf'), house: has('house'),
    retire: has('retire'), tax: has('tax'), flow: has('flow'),
  }
}

/**
 * @typedef {Object} Tile
 * @property {string} id
 * @property {string} label
 * @property {number|null} value     null → an "Add" tile
 * @property {'sgd'|'sgdMonthly'|'pct'|'score'} format
 * @property {string} sub            one plain line of context
 * @property {string} toolId         where the tile links (registry id)
 * @property {string|null} checked   relativeAge of the figure, or null
 * @property {boolean} stale
 * @property {'ok'|'warn'|null} tone
 */

/**
 * @param {object} myNumbers - loadMyNumbers() for the active profile
 * @param {number} [now]
 * @returns {{ hasData: boolean, filled: Record<string, boolean>, filledCount: number, tiles: Tile[] }}
 */
export function summarise(myNumbers, now = Date.now()) {
  const d = myNumbers || {}
  const filled = filledModules(d)
  const filledCount = Object.values(filled).filter(Boolean).length
  const state = buildBaselineState(d)
  const tiles = []

  const tile = (t) => {
    const checked = relativeAge(t.savedAt, now)
    tiles.push({ tone: null, ...t, checked, stale: isStale(t.savedAt, now), savedAt: undefined })
  }

  // Net worth — anything with a balance contributes.
  const worthSources = ['house', 'drive', 'retire', 'etf'].filter((k) => filled[k])
  if (worthSources.length) {
    const nw = calcNetWorth(state)
    const parts = [
      nw.propertyEquity ? 'property' : null,
      nw.carEquity ? 'car' : null,
      nw.cpfTotal ? 'CPF' : null,
      nw.investmentBalance ? 'investments' : null,
    ].filter(Boolean)
    tile({
      id: 'netWorth', label: 'Net worth', value: nw.netWorth, format: 'sgd',
      sub: parts.length ? `From ${parts.join(', ')}` : 'Add balances to see this',
      toolId: 'ledger', savedAt: latest(...worthSources.map((k) => d[k].savedAt)),
    })
  } else {
    tile({ id: 'netWorth', label: 'Net worth', value: null, format: 'sgd', sub: 'Your home, car, CPF and investments in one number', toolId: 'retire', savedAt: null })
  }

  // Monthly capacity to invest — needs an income.
  if (state.salary > 0) {
    const { exact } = calcTakeHome(state)
    tile({
      id: 'capacity', label: 'Free to invest', value: calcInvestmentCapacity(state), format: 'sgdMonthly',
      sub: `${exact ? 'Take-home' : 'Est. take-home'} after ${state.livingExpenses ? 'loans, premiums and living costs' : 'loans and premiums'}`,
      toolId: 'ledger',
      savedAt: latest(d.retire?.savedAt, d.drive?.savedAt, d.tax?.savedAt, d.flow?.savedAt, d.insure?.savedAt),
    })
  }

  // Debt servicing — only meaningful once there is a loan and an income.
  const { tdsr, obligations } = calcTDSR(state)
  if (tdsr != null && obligations > 0) {
    tile({
      id: 'tdsr', label: 'Debt servicing (TDSR)', value: tdsr * 100, format: 'pct',
      sub: `Bank limit ${Math.round(TDSR_LIMIT * 100)}% of gross income`,
      toolId: 'ledger', tone: tdsr > TDSR_LIMIT ? 'warn' : 'ok',
      savedAt: latest(d.house?.savedAt, d.drive?.savedAt),
    })
  }

  // Insurance Score.
  if (filled.insure && d.insure.score != null) {
    tile({
      id: 'insure', label: 'Insurance Score', value: d.insure.score, format: 'score',
      sub: d.insure.monthlyPremium ? `Premiums S$${Math.round(d.insure.monthlyPremium).toLocaleString('en-SG')}/mo` : 'Critical illness, life/TPD and hospital cover',
      toolId: 'insure', savedAt: d.insure.savedAt,
    })
  } else {
    tile({ id: 'insure', label: 'Insurance Score', value: null, format: 'score', sub: 'See your cover gaps in dollars', toolId: 'insure', savedAt: null })
  }

  // Income tax.
  if (filled.tax) {
    tile({
      id: 'tax', label: 'Income tax this year', value: d.tax.annualTax, format: 'sgd',
      sub: d.tax.marginalRate ? `Marginal rate ${d.tax.marginalRate}%` : 'After reliefs',
      toolId: 'tax', savedAt: d.tax.savedAt,
    })
  } else {
    tile({ id: 'tax', label: 'Income tax this year', value: null, format: 'sgd', sub: 'What you owe and what each relief saves', toolId: 'tax', savedAt: null })
  }

  // Retirement: CPF balances + regular investing.
  if (filled.retire) {
    const cpf = (d.retire.oaBalance || 0) + (d.retire.saBalance || 0) + (d.retire.maBalance || 0)
    tile({
      id: 'retire', label: 'CPF balances', value: cpf, format: 'sgd',
      sub: d.retire.monthlyContribution ? `Plus S$${Math.round(d.retire.monthlyContribution).toLocaleString('en-SG')}/mo invested` : 'OA, SA and MA combined',
      toolId: 'retire', savedAt: d.retire.savedAt,
    })
  } else {
    tile({ id: 'retire', label: 'Retirement', value: null, format: 'sgd', sub: 'Will you actually have enough?', toolId: 'retire', savedAt: null })
  }

  return { hasData: filledCount > 0, filled, filledCount, tiles }
}

/**
 * Display string for a tile value.
 * @param {Tile} t
 */
export function formatTile(t) {
  if (t.value == null) return null
  const v = t.value
  switch (t.format) {
    case 'sgdMonthly': return `S$${Math.round(v).toLocaleString('en-SG')}/mo`
    case 'pct': return `${v.toFixed(1)}%`
    case 'score': return `${Math.round(v)}/100`
    default: return `${v < 0 ? '−' : ''}S$${Math.abs(Math.round(v)).toLocaleString('en-SG')}`
  }
}
