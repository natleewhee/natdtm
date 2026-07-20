// src/lib/coe-history.js
// Pure helpers for building up COE bidding history from repeated calls to
// LTA DataMall's COEResult endpoint, which only ever returns the current +
// previous bidding exercise (no historical range) — so a local history file
// has to be built by merging in new results over time. Used by
// scripts/refresh-coe-history.mjs.

// Turns DataMall's flat `value` array (one row per vehicle_class per
// bidding_no) into one entry per bidding exercise with both categories
// combined. Drops any exercise where we don't have both Cat A and Cat B.
export function parseCoeResultToEntries(rawResults, now = new Date()) {
  const byKey = new Map()
  for (const r of rawResults) {
    if (r.vehicle_class !== 'Category A' && r.vehicle_class !== 'Category B') continue
    const key = `${r.month}|${r.bidding_no}`
    const entry = byKey.get(key) || {
      month: r.month, biddingNo: r.bidding_no, catA: null, catB: null,
      recordedAt: now.toISOString(),
    }
    const catField = r.vehicle_class === 'Category A' ? 'catA' : 'catB'
    entry[catField] = { premium: r.premium, quota: r.quota, bids: r.bids_success }
    byKey.set(key, entry)
  }
  return [...byKey.values()].filter(e => e.catA && e.catB)
}

// Merges freshly-fetched entries into the existing history, deduping by
// (month, biddingNo) — a fresh fetch overwrites a stale one at the same key
// (LTA occasionally revises figures shortly after a bidding closes) — then
// returns the list sorted chronologically.
export function mergeHistoryEntries(existing, incoming) {
  const key = e => `${e.month}|${e.biddingNo}`
  const map = new Map(existing.map(e => [key(e), e]))
  for (const e of incoming) map.set(key(e), e)
  return [...map.values()].sort((a, b) => {
    if (a.month !== b.month) return a.month < b.month ? -1 : 1
    return a.biddingNo - b.biddingNo
  })
}
