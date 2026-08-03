// src/app/drive/api/coe/route.js
// Fetches latest COE premiums for the calculator.
// Cat A = OMV ≤ S$20,000 | Cat B = OMV > S$20,000
// LTA updates this after every bidding exercise (~2x per month)
//
// Source: data.gov.sg's mirror of LTA's own "COE Bidding Results / Prices"
// dataset, via CKAN's public datastore_search API. This REPLACES a direct
// call to LTA DataMall's COEResult endpoint (datamall2.mytransport.sg),
// which requires an AccountKey — in production that endpoint kept
// returning 404 even with a correctly-configured, correctly-formatted key,
// which a 404 (vs a clean 401/403 "your key is wrong") suggests was an
// endpoint/routing problem on LTA's side, not anything fixable here.
// data.gov.sg needs no key at all and mirrors the exact same underlying
// data, so it sidesteps that whole class of failure.
//
// Every response carries a machine-readable `status` so the UI (and the
// /drive/data-status page) can say WHY live data is missing rather than
// collapsing every failure into one silent fallback.

import { parseCoeResultToEntries, coerceDatastoreRecord, sortEntriesChronologically } from '@/lib/drive/coe-history'

export const runtime = 'edge'
export const revalidate = 3600 // cache for 1 hour

const DATASET_ID = 'd_69b3380ad7e51aff3a7dcc84eba52b8a'
// sort is CKAN's documented datastore_search parameter (comma-separated
// "field direction" pairs) — asking for the newest rows server-side rather
// than pulling the whole ~2,000-row/16-year dataset every request. Entries
// are still re-sorted client-side below (parseCoeResultToEntries doesn't
// assume order), so this is a performance choice, not a correctness one —
// EXCEPT that with only limit=20 rows requested, if `sort` were ever
// ignored we'd get an arbitrary 20-row slice (likely the oldest, from
// 2010, given how the rows were inserted) and our own sorting would just
// correctly order the wrong subset. The staleness check after parsing
// below exists specifically to catch that failure mode.
const ENDPOINT = `https://data.gov.sg/api/action/datastore_search?resource_id=${DATASET_ID}&limit=20&sort=${encodeURIComponent('month desc,bidding_no desc')}`
const STALE_AFTER_DAYS = 100 // COE bids ~2x/month; 100 days catches a broken sort, not just a slow month

export async function GET() {
  try {
    const res = await fetch(ENDPOINT, {
      headers: { accept: 'application/json' },
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      return Response.json(
        {
          status: 'upstream_error',
          httpStatus: res.status,
          detail: `data.gov.sg returned HTTP ${res.status} for the COE dataset.`,
          checkedAt: new Date().toISOString(),
          catA: null,
          catB: null,
        },
        { status: 502 }
      )
    }

    const data = await res.json()
    if (data?.success !== true) {
      return Response.json(
        {
          status: 'upstream_error',
          detail: `data.gov.sg responded but marked the request unsuccessful: ${data?.error?.message ?? 'no error message given'}.`,
          checkedAt: new Date().toISOString(),
          catA: null,
          catB: null,
        },
        { status: 502 }
      )
    }

    const rawRecords = data?.result?.records ?? []
    const records = rawRecords.map(coerceDatastoreRecord)
    const entries = sortEntriesChronologically(parseCoeResultToEntries(records))
    const latest = entries.at(-1)

    if (!latest) {
      return Response.json(
        {
          status: 'no_results',
          rowsReturned: rawRecords.length,
          detail: `data.gov.sg returned ${rawRecords.length} row(s), but none paired into a full Cat A/Cat B bidding exercise. The dataset may need a larger 'limit' if a bidding round is still incomplete.`,
          checkedAt: new Date().toISOString(),
          catA: null,
          catB: null,
        },
        { status: 502 }
      )
    }

    // month is "YYYY-MM" — parsed as the 1st of that month is close enough
    // to catch a genuinely broken sort (which would return 2010-era rows),
    // not to flag a normal COE bidding cadence.
    const latestMonthAgeDays = (Date.now() - new Date(`${latest.month}-01T00:00:00Z`).getTime()) / 86_400_000
    if (latestMonthAgeDays > STALE_AFTER_DAYS) {
      return Response.json(
        {
          status: 'stale_data',
          latestMonthFound: latest.month,
          detail: `The newest bidding exercise found was ${latest.month}, which is over ${STALE_AFTER_DAYS} days old — likely means the sort parameter isn't returning the most recent rows, not that LTA has genuinely gone quiet that long.`,
          checkedAt: new Date().toISOString(),
          catA: null,
          catB: null,
        },
        { status: 502 }
      )
    }

    return Response.json({
      status: 'live',
      catA: {
        premium: latest.catA.premium,
        quota:   latest.catA.quota,
        bids:    latest.catA.bids,
      },
      catB: {
        premium: latest.catB.premium,
        quota:   latest.catB.quota,
        bids:    latest.catB.bids,
      },
      month:     latest.month,
      biddingNo: latest.biddingNo,
      fetchedAt: new Date().toISOString(),
      checkedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('COE fetch error:', err)
    return Response.json(
      {
        status: 'network_error',
        detail: `Could not reach data.gov.sg: ${err.message}`,
        checkedAt: new Date().toISOString(),
        catA: null,
        catB: null,
      },
      { status: 502 }
    )
  }
}
