// src/app/api/coe/route.js
// Fetches latest COE premiums from LTA DataMall
// Cat A = OMV ≤ S$20,000 | Cat B = OMV > S$20,000
// LTA updates this after every bidding exercise (~2x per month)

export const runtime = 'edge'
export const revalidate = 3600 // cache for 1 hour

export async function GET() {
  const apiKey = process.env.LTA_API_KEY

  if (!apiKey) {
    return Response.json(
      { error: 'LTA_API_KEY not configured', catA: null, catB: null },
      { status: 500 }
    )
  }

  try {
    const res = await fetch(
      'https://datamall2.mytransport.sg/ltaodataservice/COEResult',
      {
        headers: {
          AccountKey: apiKey,
          accept: 'application/json',
        },
        // Edge runtime cache
        next: { revalidate: 3600 },
      }
    )

    if (!res.ok) {
      throw new Error(`LTA API returned ${res.status}`)
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
      throw new Error('Could not find Cat A or Cat B results')
    }

    return Response.json({
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
    })
  } catch (err) {
    console.error('COE fetch error:', err)
    return Response.json(
      { error: err.message, catA: null, catB: null },
      { status: 502 }
    )
  }
}
