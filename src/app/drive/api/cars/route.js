// src/app/api/cars/route.js
//
// Fetches the LTA Car Cost Update PDF (published monthly, government source).
// Extracts official selling prices from authorised distributors.
// Never blocked. No auth. Updates monthly.
//
// Coverage: ~80-90 of our 145 cars. Rest fall back to cars.json prices.
// Cache: 24hr Vercel edge cache.
//
// Parsing logic lives in src/lib/lta-parse.js (pure, unit-tested) — this
// file only owns the fetch/orchestration.

import { getPdfNumbers, extractPdfText, parseLTARows, buildPriceMaps, isLowCoverage } from '@/lib/drive/lta-parse'

export const runtime = 'edge'
export const revalidate = 86400

const LTA_BASE = 'https://onemotoring.lta.gov.sg/content/dam/onemotoring/Buying/Car_Cost_Update'

async function fetchAndParse(pdfNum) {
  const url = `${LTA_BASE}/${pdfNum}-Car_Cost_Update.pdf`
  const res = await fetch(url, {
    headers: { 'Accept': 'application/pdf,*/*' },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buf = await res.arrayBuffer()
  const text = extractPdfText(buf)
  if (text.length < 500) throw new Error('PDF text extraction too short')
  return text
}

export async function GET() {
  const [curPdf, prevPdf] = getPdfNumbers()

  let pdfText = ''
  let pdfUsed = ''
  let fetchError = ''

  for (const pdfNum of [curPdf, prevPdf]) {
    try {
      pdfText = await fetchAndParse(pdfNum)
      pdfUsed = pdfNum
      break
    } catch (err) {
      fetchError = err.message
      console.error(`LTA PDF ${pdfNum} failed: ${err.message}`)
    }
  }

  if (!pdfText) {
    return Response.json({
      source: 'fallback',
      scrapedAt: null,
      error: `LTA PDF unavailable: ${fetchError}`,
      prices: {},
    })
  }

  try {
    const rows = parseLTARows(pdfText)

    if (rows.length < 5) {
      return Response.json({
        source: 'fallback',
        scrapedAt: null,
        error: `PDF parsed but only ${rows.length} rows — parser may need update`,
        prices: {},
        debug: pdfText.slice(0, 500),
      })
    }

    // Build price map — keep LOWEST price per car ID (cheapest trim).
    // See buildPriceMaps in lib/drive/lta-parse.js for why omv/ves reset
    // whenever the cheapest-price row changes.
    const { priceMap, omvMap, vesMap } = buildPriceMaps(rows)

    const matchedCars = Object.keys(priceMap).length
    const lowCoverage = isLowCoverage(matchedCars)
    if (lowCoverage) {
      console.error(`LTA PDF ${pdfUsed} matched only ${matchedCars}/${rows.length} rows — MATCH_TERMS may need updating`)
    }

    return Response.json({
      source: 'lta_pdf',
      pdfUsed,
      scrapedAt: new Date().toISOString(),
      rowsFound: rows.length,
      matchedCars,
      coverage: rows.length > 0 ? matchedCars / rows.length : 0,
      lowCoverage,
      prices: priceMap,
      omv: omvMap,
      ves: vesMap,
    })

  } catch (err) {
    return Response.json({
      source: 'fallback',
      scrapedAt: null,
      error: err.message,
      prices: {},
    })
  }
}
