// src/lib/coe-history.js
// Pure helpers for building up COE bidding history. Originally written
// against LTA DataMall's COEResult endpoint (current + previous bidding
// exercise only, no historical range, and requiring an AccountKey).
//
// DataMall's COEResult endpoint turned out to be unreliable to authenticate
// against in practice (see route.js) — data.gov.sg mirrors the SAME LTA
// dataset ("COE Bidding Results / Prices", resource id
// d_69b3380ad7e51aff3a7dcc84eba52b8a) via CKAN's public datastore_search
// API, with NO key required, and with the FULL history back to 2010 rather
// than just the current + previous exercise. Both sources use the same
// field names (month, bidding_no, vehicle_class, quota, bids_success,
// premium), so parseCoeResultToEntries below works unchanged for either —
// only the fetch layer differs between route.js/refresh-coe-history.mjs.

// Turns a flat records array (one row per vehicle_class per bidding_no)
// into one entry per bidding exercise with both categories combined. Drops
// any exercise where we don't have both Cat A and Cat B.
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

// data.gov.sg's datastore_search returns every column as a string (CKAN
// declares them all "text" fields, even the numeric ones — visible in the
// dataset's own column listing on data.gov.sg). parseCoeResultToEntries's
// consumers (SGD formatting, sort comparisons) need real numbers, so this
// coerces a raw CKAN record into the same shape/types the DataMall JSON
// already provided natively.
export function coerceDatastoreRecord(r) {
  return {
    month: r.month,
    bidding_no: Number(r.bidding_no),
    vehicle_class: r.vehicle_class,
    quota: Number(r.quota),
    bids_success: Number(r.bids_success),
    premium: Number(r.premium),
  }
}

// Entries sort chronologically ascending (oldest first) — the latest
// bidding exercise is the LAST one, matching how mergeHistoryEntries
// already sorts its own output. Sorted client-side rather than trusting an
// unverified server-side `sort` query param, so a subtle syntax mismatch
// in that param can't silently return the wrong slice of history.
export function sortEntriesChronologically(entries) {
  return [...entries].sort((a, b) => {
    if (a.month !== b.month) return a.month < b.month ? -1 : 1
    return a.biddingNo - b.biddingNo
  })
}

// Merges freshly-fetched entries into the existing history, deduping by
// (month, biddingNo) — a fresh fetch overwrites a stale one at the same key
// (LTA occasionally revises figures shortly after a bidding closes) — then
// returns the list sorted chronologically.
export function mergeHistoryEntries(existing, incoming) {
  const key = e => `${e.month}|${e.biddingNo}`
  const map = new Map(existing.map(e => [key(e), e]))
  for (const e of incoming) map.set(key(e), e)
  return sortEntriesChronologically([...map.values()])
}

// ── coe_bidding_results table row <-> entry shape ──────────────────────────
// The Postgres table (see supabase/migrations/0001_reference_data.sql)
// already stores one row per (month, bidding_no) with both categories
// combined — the same shape parseCoeResultToEntries produces — so this is
// a flat rename, not a re-grouping. Kept here rather than duplicated in
// the API route and the refresh script, so both read the same mapping.

export function dbRowToEntry(row) {
  return {
    month: row.month,
    biddingNo: row.bidding_no,
    catA: { premium: row.cat_a_premium, quota: row.cat_a_quota, bids: row.cat_a_bids },
    catB: { premium: row.cat_b_premium, quota: row.cat_b_quota, bids: row.cat_b_bids },
    recordedAt: row.recorded_at,
  }
}

export function entryToDbRow(entry) {
  return {
    month: entry.month,
    bidding_no: entry.biddingNo,
    cat_a_premium: entry.catA.premium,
    cat_a_quota: entry.catA.quota,
    cat_a_bids: entry.catA.bids,
    cat_b_premium: entry.catB.premium,
    cat_b_quota: entry.catB.quota,
    cat_b_bids: entry.catB.bids,
  }
}
