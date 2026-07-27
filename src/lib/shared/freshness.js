// src/lib/shared/freshness.js
// One staleness check for every hand-maintained dataset in the suite.
// Several tools carry an AS_OF constant for data that has to be updated
// by hand — COE premiums, ETF returns, broker fees — but only DriveReady
// ever checked whether that date had gone stale. A silently outdated
// number is worse than one labelled as outdated, so this generalizes
// DriveReady's isCoeFallbackStale into something every tool can use.

// How long each kind of data stays trustworthy before it should be
// flagged. These are judgement calls about how fast the underlying
// figure moves, not official guidance.
export const FRESHNESS_WINDOWS = {
  coe: 45,        // LTA bids twice a month — 45 days means a bid was missed
  marketData: 365, // annual return series: stale once a full year has passed
  fees: 550,      // broker commissions and fund TERs change slowly
  statutory: 1100, // tax rates, stamp duty, CPF rates: revised in Budgets, not often
}

export function daysSince(asOf, now = new Date()) {
  // Guard null/undefined explicitly: `new Date(null)` is the epoch, not
  // an invalid date, so a bare isFinite check would report ~57 years
  // elapsed instead of "unknown".
  if (asOf == null || asOf === '') return null
  const then = new Date(asOf).getTime()
  if (!Number.isFinite(then)) return null
  return (now.getTime() - then) / 86_400_000
}

// Returns { days, stale, months } for an ISO date (or a 'mid-2025'-style
// label, which is resolved to the middle of that year). `stale` is null
// when the date can't be parsed, so callers can tell "unknown" apart
// from "fine".
export function checkFreshness(asOf, windowDays = FRESHNESS_WINDOWS.marketData, now = new Date()) {
  const iso = normalizeAsOf(asOf)
  const days = daysSince(iso, now)
  if (days == null) return { days: null, months: null, stale: null }
  return {
    days: Math.floor(days),
    months: Math.floor(days / 30.44),
    stale: days > windowDays,
  }
}

// Some AS_OF constants in the suite are human labels rather than dates
// ('mid-2025', '2025-Q1'). Resolve those to a concrete date so they can
// still be checked rather than silently skipped.
export function normalizeAsOf(asOf) {
  if (!asOf) return null
  const s = String(asOf).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const mid = s.match(/^mid-(\d{4})$/i)
  if (mid) return `${mid[1]}-07-01`
  const early = s.match(/^early-(\d{4})$/i)
  if (early) return `${early[1]}-02-01`
  const late = s.match(/^late-(\d{4})$/i)
  if (late) return `${late[1]}-11-01`
  const q = s.match(/^(\d{4})[-\s]?Q([1-4])$/i)
  if (q) return `${q[1]}-${String((Number(q[2]) - 1) * 3 + 2).padStart(2, '0')}-01`
  const year = s.match(/^(\d{4})$/)
  if (year) return `${year[1]}-07-01`
  const parsed = new Date(s)
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : null
}

// Human phrasing for a staleness warning — keeps the wording consistent
// across tools instead of each one inventing its own.
export function freshnessLabel(asOf, windowDays, now = new Date()) {
  const { months, stale } = checkFreshness(asOf, windowDays, now)
  if (stale == null) return null
  if (!stale) return `Data as of ${asOf}`
  if (months >= 24) return `⚠ Data as of ${asOf} — over ${Math.floor(months / 12)} years old`
  if (months >= 2) return `⚠ Data as of ${asOf} — around ${months} months old`
  return `⚠ Data as of ${asOf} — may be outdated`
}
