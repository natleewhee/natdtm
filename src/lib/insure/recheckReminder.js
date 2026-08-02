// Pure ICS-content builder, split out from the DOM/download side effects
// below so the date math and content formatting are unit-testable without
// a browser environment (Blob/URL/document aren't available under plain
// Node). `now` is injectable so tests don't depend on the real clock.
export function buildRecheckIcs(currentScore, now = new Date()) {
  // Singapore is a fixed UTC+8 — reading the target date via toISOString()
  // (UTC) would show yesterday's date for any SGT time between midnight
  // and 8am, the same date-boundary bug todaySGT() (house/calc.js) fixes.
  const sgtDateOnly = (d) => new Date(d.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10)
  const [ty, tm, td] = sgtDateOnly(now).split('-').map(Number)
  const targetDateOnly = `${ty + 1}${String(tm).padStart(2, '0')}${String(td).padStart(2, '0')}`

  const toIcsDate = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  // RFC 5545 §3.3.11: backslash, comma, semicolon and newline are
  // meaningful TEXT-value delimiters and must be backslash-escaped, or a
  // score/description containing one would corrupt the .ics structure.
  const escapeIcsText = (s) => String(s).replace(/\\/g, '\\\\').replace(/[,;]/g, '\\$&').replace(/\r?\n/g, '\\n')

  const uid = `insurecheck-recheck-${now.getTime()}@coah.sg`
  const scoreLine = typeof currentScore === 'number' ? `Your score on ${now.toLocaleDateString('en-SG')} was ${currentScore}/100. ` : ''
  const description = escapeIcsText(`${scoreLine}Coverage needs change with income, debt, and life events — take a fresh check at coah.vercel.app/insure.`)

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Coah//InsureCheck//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toIcsDate(now)}`,
    `DTSTART;VALUE=DATE:${targetDateOnly}`,
    'SUMMARY:Re-check your Insurance Score',
    `DESCRIPTION:${description}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

/**
 * Generates and downloads a single-event .ics file reminding the user to
 * re-check their Insurance Score in 12 months. Entirely client-side — no
 * backend, no email, matches the "nothing leaves your device" posture.
 * @param {number} currentScore
 */
export function downloadRecheckReminder(currentScore) {
  const ics = buildRecheckIcs(currentScore)

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'insurecheck-recheck-reminder.ics'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
