'use client'

// src/app/drive/data-status/page.js
//
// "Is the LTA data actually working?" — one page that answers it plainly.
//
// DriveReady degrades gracefully when LTA data is unavailable (hardcoded COE
// constants, cars.json prices), which is good for users but means a broken
// AccountKey looks identical to a working one from the calculator. This page
// exists so the answer is one click away instead of a code read: it calls both
// routes and reports their `status`/`reason` codes verbatim.
//
// It never displays the AccountKey — the routes only ever return whether one
// is configured and whether LTA accepted it.

import { useEffect, useState } from 'react'
import ShellHeader from '@/components/shared/ShellHeader'
import { COE_FALLBACK, COE_FALLBACK_AS_OF } from '@/lib/drive/calc'
import { COE_ENDPOINT, CARS_ENDPOINT } from '@/lib/drive/endpoints'
import { C } from '@/lib/drive/theme'

// The site is permanently dark (see the header comment in globals.css —
// :root[data-theme='light'] is an exact copy of the dark values, so there is
// no light mode to degrade into). Colors come from the Drive palette rather
// than fresh literals so this page can't drift out of sync with the rest of
// the vertical, and so the small 12-13px label text keeps enough contrast.
const OK = C.greenText
const WARN = C.amberText
const BAD = C.redText
const LINE = C.border
const SUB = C.muted

function fmtSGD(n) {
  return typeof n === 'number' ? `S$${n.toLocaleString('en-SG')}` : '—'
}

function fmtWhen(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-SG', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Singapore',
    })
  } catch {
    return iso
  }
}

// Each status/reason code gets a verdict tone plus the actual next action,
// so the page says what to DO, not just that something is broken.
const COE_STATES = {
  live:           { tone: OK,   label: 'Working',        fix: null },
  no_key:         { tone: BAD,  label: 'No API key',     fix: 'Set LTA_API_KEY in your hosting environment variables. For the scheduled COE-history refresh, also add it as a GitHub Actions repository secret.' },
  auth_rejected:  { tone: BAD,  label: 'Key rejected',   fix: 'The key is set but LTA returned 401. Regenerate the AccountKey at datamall.lta.gov.sg and update the environment variable — then redeploy.' },
  auth_forbidden: { tone: BAD,  label: 'Key forbidden',  fix: 'LTA returned 403 — the key exists but is not entitled to the COEResult dataset. Check your DataMall subscription.' },
  rate_limited:   { tone: WARN, label: 'Rate limited',   fix: 'LTA returned 429. This usually clears on its own — retry in a few minutes.' },
  upstream_error: { tone: WARN, label: 'LTA error',      fix: 'See the note above this box — a 404 usually points at the endpoint or key formatting rather than a temporary outage, so it is worth reading before just retrying.' },
  no_results:     { tone: WARN, label: 'No Cat A/B rows',fix: 'The key worked, but the latest bidding exercise had no Category A/B rows. Usually resolves after the next bidding result publishes.' },
  network_error:  { tone: BAD,  label: 'Unreachable',    fix: 'Could not reach datamall2.mytransport.sg at all. Check outbound network access from your deployment.' },
}

const CARS_STATES = {
  lta_pdf:       { tone: OK,   label: 'Working',            fix: null },
  extract_failed:{ tone: BAD,  label: 'Cannot read PDF',    fix: 'The PDF downloaded but no text could be extracted — its content streams are compressed (/FlateDecode), which extractPdfText() in src/lib/drive/lta-parse.js does not handle. This needs an inflate step; it is a known bug, not a configuration problem.' },
  pdf_not_found: { tone: BAD,  label: 'PDF not found (404)',fix: 'Neither the current nor previous month\'s filename exists. getPdfNumbers() extrapolates from a hardcoded anchor (M032 = Feb 2026, +1/month) — if LTA skipped or renamed a release, the anchor needs correcting.' },
  http_error:    { tone: WARN, label: 'OneMotoring error',  fix: 'OneMotoring returned an unexpected status. Retry later.' },
  network_error: { tone: BAD,  label: 'Unreachable',        fix: 'Could not reach onemotoring.lta.gov.sg. Check outbound network access from your deployment.' },
  parse_thin:    { tone: WARN, label: 'Too few rows parsed',fix: 'Text extracted but almost no table rows matched — the PDF layout has likely changed and parseLTARows() needs updating.' },
  parse_error:   { tone: BAD,  label: 'Parser threw',       fix: 'Text extracted but parsing threw. See the detail below.' },
  unknown:       { tone: BAD,  label: 'Failed',             fix: null },
}

function Dot({ tone }) {
  return (
    <span aria-hidden="true" style={{
      display: 'inline-block', width: 9, height: 9, borderRadius: '50%',
      background: tone, marginRight: 8, flexShrink: 0,
    }} />
  )
}

function Card({ title, subtitle, tone, verdict, children }) {
  return (
    <section style={{ border: `1px solid ${LINE}`, borderRadius: 4, padding: '20px 22px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        <h2 style={{ fontFamily: 'var(--l-font-display)', fontWeight: 600, fontSize: 17, margin: 0 }}>{title}</h2>
        <span style={{ display: 'flex', alignItems: 'center', fontFamily: 'var(--l-font-mono)', fontSize: 12, fontWeight: 700, color: tone }}>
          <Dot tone={tone} />{verdict}
        </span>
      </div>
      <p style={{ fontSize: 12.5, color: SUB, margin: '0 0 14px' }}>{subtitle}</p>
      {children}
    </section>
  )
}

function Row({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '7px 0', borderTop: `1px solid ${LINE}`, fontSize: 13 }}>
      <span style={{ color: SUB }}>{label}</span>
      <span style={{ fontFamily: mono ? 'var(--l-font-mono)' : undefined, fontWeight: mono ? 700 : 400, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function FixNote({ text }) {
  if (!text) return null
  return (
    <p style={{
      fontSize: 12.5, lineHeight: 1.55, color: C.text, background: C.surface,
      border: `1px solid ${LINE}`, borderRadius: 4, padding: '10px 12px', margin: '14px 0 0',
    }}>
      <strong style={{ fontFamily: 'var(--l-font-mono)', fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: SUB, display: 'block', marginBottom: 4 }}>What to do</strong>
      {text}
    </p>
  )
}

export default function DataStatusPage() {
  const [coe, setCoe] = useState(null)
  const [cars, setCars] = useState(null)
  const [tick, setTick] = useState(0)

  // Derived, not stored — "still loading" is exactly "no result yet", so
  // there's no separate flag to set synchronously inside the effect. The
  // re-check button clears both results in its own handler, which puts this
  // back to true without an effect-body setState.
  const loading = coe === null || cars === null

  useEffect(() => {
    let cancelled = false

    // Both routes return a JSON body on every path, including their error
    // paths — so a non-2xx is still parsed rather than thrown away. That is
    // the whole point: the error body is the diagnosis.
    const grab = (url) =>
      fetch(url, { cache: 'no-store' })
        .then(r => r.json().catch(() => ({ status: 'network_error', reason: 'network_error', detail: `Non-JSON response (HTTP ${r.status})` })))
        .catch(err => ({ status: 'network_error', reason: 'network_error', detail: `Request failed: ${err.message}` }))

    Promise.all([grab(COE_ENDPOINT), grab(CARS_ENDPOINT)]).then(([c, k]) => {
      if (cancelled) return
      setCoe(c)
      setCars(k)
    })

    return () => { cancelled = true }
  }, [tick])

  const coeState = COE_STATES[coe?.status] ?? COE_STATES.network_error
  const carsReason = cars?.source === 'lta_pdf' ? 'lta_pdf' : (cars?.reason || 'unknown')
  let carsState = CARS_STATES[carsReason] ?? CARS_STATES.unknown
  const carsLive = cars?.source === 'lta_pdf'
  // A live parse that matched almost nothing is not "Working" — /drive
  // already shows an amber "this month's update looks incomplete" banner
  // for it, and a green tick here would contradict that banner.
  if (carsLive && cars?.lowCoverage) {
    carsState = {
      tone: WARN,
      label: 'Partial',
      fix: `Only ${cars.matchedCars} cars matched out of ${cars.rowsFound} parsed rows (below MIN_COVERAGE). The LTA PDF's model names have likely drifted — MATCH_TERMS in src/lib/drive/lta-parse.js needs updating.`,
    }
  }

  return (
    <>
      <ShellHeader title="Data status" breadcrumb="Drive" backHref="/drive" />
      <div className="shell-wrap" style={{ padding: '40px 24px 72px', maxWidth: 760 }}>
        <p style={{
          fontFamily: 'var(--l-font-mono)', fontSize: 11, letterSpacing: '.12em',
          textTransform: 'uppercase', color: SUB, margin: '0 0 12px',
        }}>
          LTA data health
        </p>
        <h1 style={{
          fontFamily: 'var(--l-font-display)', fontWeight: 600, fontSize: 'clamp(24px,3.2vw,32px)',
          lineHeight: 1.15, margin: '0 0 12px',
        }}>
          Is the LTA data feeding into the calculator?
        </h1>
        <p style={{ color: SUB, fontSize: 14.5, lineHeight: 1.6, margin: '0 0 28px', maxWidth: '62ch' }}>
          DriveReady keeps working when LTA is unreachable — it falls back to saved prices and
          hardcoded COE constants. That is good for visitors but hides breakage, so this page
          calls both LTA routes directly and reports exactly what came back. Your AccountKey is
          never shown here, only whether LTA accepted it.
        </p>

        {loading && <p style={{ fontSize: 14, color: SUB }}>Checking both feeds…</p>}

        {!loading && (
          <>
            <Card
              title="COE premiums — LTA DataMall API"
              subtitle="Needs the LTA_API_KEY AccountKey. Powers the live Cat A / Cat B premiums used in every calculation."
              tone={coeState.tone}
              verdict={coeState.label}
            >
              <Row label="AccountKey configured" value={coe?.keyConfigured ? 'Yes' : 'No'} mono />
              <Row label="Accepted by LTA" value={coe?.keyAccepted ? 'Yes' : (coe?.keyConfigured ? 'No' : '—')} mono />
              {coe?.httpStatus && <Row label="HTTP status from LTA" value={coe.httpStatus} mono />}
              {coe?.keyWasTrimmed && <Row label="Key had stray whitespace/quotes" value="Yes — stripped before sending" mono />}
              {coe?.status === 'live' ? (
                <>
                  <Row label="Cat A premium" value={fmtSGD(coe.catA?.premium)} mono />
                  <Row label="Cat B premium" value={fmtSGD(coe.catB?.premium)} mono />
                  <Row label="Bidding exercise" value={`${coe.month} · round ${coe.biddingNo}`} mono />
                </>
              ) : (
                <>
                  <Row label="Falling back to" value={`Cat A ${fmtSGD(COE_FALLBACK.catA)} · Cat B ${fmtSGD(COE_FALLBACK.catB)}`} mono />
                  <Row label="Fallback last updated" value={COE_FALLBACK_AS_OF} mono />
                </>
              )}
              <Row label="Checked" value={fmtWhen(coe?.checkedAt)} />
              {coe?.detail && <p style={{ fontSize: 12.5, color: SUB, margin: '12px 0 0', lineHeight: 1.55 }}>{coe.detail}</p>}
              <FixNote text={coeState.fix} />
            </Card>

            <Card
              title="Car prices — LTA Car Cost Update PDF"
              subtitle="A public PDF from OneMotoring. No API key involved. Powers the official selling prices per model."
              tone={carsState.tone}
              verdict={carsState.label}
            >
              <Row label="Source" value={carsLive ? 'Live LTA PDF' : 'Saved prices (cars.json)'} mono />
              {cars?.pdfUsed && <Row label="PDF used" value={cars.pdfUsed} mono />}
              {carsLive && (
                <>
                  <Row label="Rows parsed" value={cars.rowsFound} mono />
                  <Row label="Cars matched" value={`${cars.matchedCars}${cars.lowCoverage ? ' — low coverage' : ''}`} mono />
                  <Row label="Fetched" value={fmtWhen(cars.scrapedAt)} />
                </>
              )}
              {!carsLive && Array.isArray(cars?.attempts) && cars.attempts.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <p style={{ fontFamily: 'var(--l-font-mono)', fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: SUB, margin: '0 0 6px' }}>
                    Attempts
                  </p>
                  {cars.attempts.map((a) => (
                    <p key={a.pdf} style={{ fontSize: 12.5, color: SUB, margin: '0 0 5px', lineHeight: 1.5 }}>
                      <span style={{ fontFamily: 'var(--l-font-mono)', fontWeight: 700 }}>{a.pdf}</span>
                      {' — '}{a.ok ? 'ok' : `${a.reason}: ${a.detail}`}
                    </p>
                  ))}
                </div>
              )}
              <FixNote text={carsState.fix} />
            </Card>

            <button
              type="button"
              onClick={() => { setCoe(null); setCars(null); setTick(t => t + 1) }}
              style={{
                fontFamily: 'var(--l-font-mono)', fontSize: 12, letterSpacing: '.06em',
                textTransform: 'uppercase', padding: '10px 18px', borderRadius: 4,
                border: `1px solid ${LINE}`, background: C.surface, color: C.text, cursor: 'pointer',
              }}
            >
              Re-check now
            </button>
          </>
        )}
      </div>
    </>
  )
}
