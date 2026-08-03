// src/app/drive/api/coe/route.js
// Fetches latest COE premiums from LTA DataMall
// Cat A = OMV ≤ S$20,000 | Cat B = OMV > S$20,000
// LTA updates this after every bidding exercise (~2x per month)
//
// Every response carries a machine-readable `status` so the UI (and the
// /drive/data-status page) can say WHY live data is missing rather than
// collapsing "no key", "key rejected", and "LTA is down" into one silent
// fallback. The AccountKey itself is never echoed back — only whether one
// is configured.

export const runtime = 'edge'
export const revalidate = 3600 // cache for 1 hour

const ENDPOINT = 'https://datamall2.mytransport.sg/ltaodataservice/COEResult'

// LTA answers an unknown/expired AccountKey with 401, and a key that exists
// but isn't entitled to the dataset with 403. Both mean "your key is the
// problem", which is a different fix from "LTA is having a bad day".
function classifyHttp(status) {
  if (status === 401) return 'auth_rejected'
  if (status === 403) return 'auth_forbidden'
  if (status === 429) return 'rate_limited'
  return 'upstream_error'
}

export async function GET() {
  // Trimmed defensively: a stray trailing newline or wrapping quotes from
  // pasting the key into Vercel's env var UI is a common real-world
  // mistake, and it corrupts the AccountKey header silently — fetch()
  // doesn't reject a header value with a trailing \n, but some upstream
  // WAFs answer the resulting malformed request with a generic 404
  // instead of a clean 401, which reads as "wrong endpoint" rather than
  // "bad key" and sends whoever's debugging it in the wrong direction.
  const rawApiKey = process.env.LTA_API_KEY
  const apiKey = rawApiKey?.trim().replace(/^["']|["']$/g, '')

  if (!apiKey) {
    return Response.json(
      {
        status: 'no_key',
        keyConfigured: false,
        detail: 'LTA_API_KEY is not set in this environment. Set it in your hosting provider\'s environment variables (and as a GitHub Actions secret for the scheduled refresh).',
        checkedAt: new Date().toISOString(),
        catA: null,
        catB: null,
      },
      { status: 503 }
    )
  }

  try {
    const res = await fetch(ENDPOINT, {
      headers: {
        AccountKey: apiKey,
        accept: 'application/json',
      },
      // Edge runtime cache
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      const status = classifyHttp(res.status)
      const keyWasTrimmed = rawApiKey !== undefined && rawApiKey !== apiKey
      return Response.json(
        {
          status,
          keyConfigured: true,
          httpStatus: res.status,
          // Never the key itself — only whether we had to clean it up,
          // which is diagnostic evidence for a 404 specifically: LTA's
          // own auth failures come back as 401/403, so a 404 with a
          // correctly-formed request most likely means the ENDPOINT is
          // wrong, not the key. If the raw env var needed trimming, that
          // whitespace/quoting corruption is worth ruling out first.
          keyWasTrimmed,
          detail: status === 'auth_rejected' || status === 'auth_forbidden'
            ? `LTA rejected the AccountKey (HTTP ${res.status}). The key is set but not accepted — regenerate it at datamall.lta.gov.sg and update the environment variable.`
            : status === 'rate_limited'
              ? 'LTA is rate-limiting this AccountKey (HTTP 429). Try again shortly.'
              : status === 'upstream_error' && res.status === 404
                ? `LTA returned 404 Not Found for ${ENDPOINT} — a 404 (not 401/403) usually means the request never reached an auth check at all.${keyWasTrimmed ? ' Your LTA_API_KEY had leading/trailing whitespace or quotes that were stripped before this request — if that persists, re-paste the key with no surrounding characters.' : ' Since the key value itself was already clean, the more likely cause is that LTA moved or renamed this endpoint — worth checking the current API User Guide at datamall.lta.gov.sg.'}`
                : `LTA DataMall returned HTTP ${res.status}.`,
          checkedAt: new Date().toISOString(),
          catA: null,
          catB: null,
        },
        { status: 502 }
      )
    }

    const data = await res.json()
    const results = data?.value ?? []

    // LTA returns results for current + previous bidding exercise
    // bidding_no: 1 = most recent, 2 = previous
    // vehicle_class: "Category A", "Category B", "Category C", "Category D", "Category E"
    const latest = results.filter(r => r.bidding_no === 1)

    const catA = latest.find(r => r.vehicle_class === 'Category A')
    const catB = latest.find(r => r.vehicle_class === 'Category B')

    if (!catA || !catB) {
      // A 200 with no Cat A/B rows means the key WORKED — worth saying so,
      // since it's a completely different problem from an auth failure.
      return Response.json(
        {
          status: 'no_results',
          keyConfigured: true,
          keyAccepted: true,
          rowsReturned: results.length,
          detail: `LTA accepted the AccountKey and returned ${results.length} row(s), but no Category A/B entry for the latest bidding exercise.`,
          checkedAt: new Date().toISOString(),
          catA: null,
          catB: null,
        },
        { status: 502 }
      )
    }

    return Response.json({
      status: 'live',
      keyConfigured: true,
      keyAccepted: true,
      catA: {
        premium: catA.premium,
        quota:   catA.quota,
        bids:    catA.bids_success,
      },
      catB: {
        premium: catB.premium,
        quota:   catB.quota,
        bids:    catB.bids_success,
      },
      month:     catA.month,
      biddingNo: catA.bidding_no,
      fetchedAt: new Date().toISOString(),
      checkedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('COE fetch error:', err)
    return Response.json(
      {
        status: 'network_error',
        keyConfigured: true,
        detail: `Could not reach LTA DataMall: ${err.message}`,
        checkedAt: new Date().toISOString(),
        catA: null,
        catB: null,
      },
      { status: 502 }
    )
  }
}
