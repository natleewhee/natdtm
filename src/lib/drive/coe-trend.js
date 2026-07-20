// src/lib/coe-trend.js
// Descriptive statistics over COE bidding history — NOT a forecast. COE
// premiums are driven by quota releases and bidder demand, neither of which
// this app has any way to predict. What it CAN do honestly is describe
// where today's premium sits relative to its own recent history: is it
// running above or below the last few bidding exercises, and where does it
// rank against everything ever recorded. That's context a buyer can use to
// calibrate their own judgment, not a signal telling them when to buy.

export function computeCoeTrend(history, category = 'catA', recentN = 6) {
  if (!Array.isArray(history) || history.length === 0) return null
  const values = history
    .map(e => e?.[category]?.premium)
    .filter(v => typeof v === 'number' && Number.isFinite(v))
  if (values.length === 0) return null

  const latest = values[values.length - 1]
  // Average of the N exercises immediately BEFORE the latest one — comparing
  // latest against a window that excludes itself, so a single new data
  // point can't trivially match "its own average."
  const priorWindow = values.slice(Math.max(0, values.length - 1 - recentN), values.length - 1)
  const recentAvg = priorWindow.length > 0
    ? priorWindow.reduce((a, b) => a + b, 0) / priorWindow.length
    : latest

  const pctDiff = recentAvg > 0 ? ((latest - recentAvg) / recentAvg) * 100 : 0
  const direction = Math.abs(pctDiff) < 3 ? 'flat' : pctDiff > 0 ? 'above' : 'below'

  const sorted = [...values].sort((a, b) => a - b)
  const rank = sorted.filter(v => v <= latest).length
  const percentile = Math.round((rank / sorted.length) * 100)

  return {
    latest, recentAvg, pctDiff, direction, recentN: priorWindow.length,
    percentile,
    historicalMin: sorted[0], historicalMax: sorted[sorted.length - 1],
    sampleSize: values.length,
  }
}
