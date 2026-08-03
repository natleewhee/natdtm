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

// Thrown with a `reason` code so the caller can distinguish "LTA moved the
// file" (a URL/anchor problem) from "we downloaded it but couldn't read the
// text out" (a parser problem) — these have completely different fixes, and
// collapsing both into one fallback is what made this undiagnosable.
class PdfError extends Error {
  constructor(reason, message, meta = {}) {
    super(message)
    this.reason = reason
    this.meta = meta
  }
}

async function fetchAndParse(pdfNum) {
  const url = `${LTA_BASE}/${pdfNum}-Car_Cost_Update.pdf`
  let res
  try {
    res = await fetch(url, {
      headers: { 'Accept': 'application/pdf,*/*' },
      signal: AbortSignal.timeout(20000),
    })
  } catch (err) {
    throw new PdfError('network_error', `Could not reach ${url}: ${err.message}`)
  }
  if (!res.ok) {
    throw new PdfError(
      res.status === 404 ? 'pdf_not_found' : 'http_error',
      `HTTP ${res.status} for ${url}`,
      { httpStatus: res.status }
    )
  }
  const buf = await res.arrayBuffer()
  const text = extractPdfText(buf)
  if (text.length < 500) {
    throw new PdfError(
      'extract_failed',
      `Downloaded ${buf.byteLength} bytes but only extracted ${text.length} characters of text. ` +
      'The PDF content streams are most likely compressed (/FlateDecode), which extractPdfText cannot read.',
      { bytes: buf.byteLength, chars: text.length }
    )
  }
  return text
}

export async function GET() {
  // LTA doesn't publish on a strict monthly cadence — trying only the
  // current+previous guess meant a normal publishing delay 404'd BOTH
  // attempts even with a correct anchor. getPdfNumbers() now returns
  // several months of candidates, newest first.
  const candidates = getPdfNumbers()

  let pdfText = ''
  let pdfUsed = ''
  let fetchError = ''
  let failReason = ''
  const attempts = []

  for (const pdfNum of candidates) {
    try {
      pdfText = await fetchAndParse(pdfNum)
      pdfUsed = pdfNum
      attempts.push({ pdf: pdfNum, ok: true })
      break
    } catch (err) {
      fetchError = err.message
      failReason = err.reason || 'unknown'
      attempts.push({ pdf: pdfNum, ok: false, reason: failReason, detail: err.message, ...err.meta })
      console.error(`LTA PDF ${pdfNum} failed [${failReason}]: ${err.message}`)
    }
  }

  if (!pdfText) {
    return Response.json({
      source: 'fallback',
      reason: failReason,
      scrapedAt: null,
      attempts,
      error: `LTA PDF unavailable: ${fetchError}`,
      prices: {},
    })
  }

  try {
    const rows = parseLTARows(pdfText)

    if (rows.length < 5) {
      return Response.json({
        source: 'fallback',
        reason: 'parse_thin',
        pdfUsed,
        attempts,
        scrapedAt: null,
        rowsFound: rows.length,
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
      reason: 'parse_error',
      pdfUsed,
      attempts,
      scrapedAt: null,
      error: err.message,
      prices: {},
    })
  }
}
