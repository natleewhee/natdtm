// Pure ICS-content builder, split out from the DOM/download side effects
// below so the date math and content formatting are unit-testable without
// a browser environment (Blob/URL/document aren't available under plain
// Node). `now` is injectable so tests don't depend on the real clock.
export function buildRecheckIcs(currentScore, now = new Date()) {
  const target = new Date(now)
  target.setFullYear(target.getFullYear() + 1)

  const toIcsDate = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const toIcsDateOnly = (d) => d.toISOString().slice(0, 10).replace(/-/g, '')

  const uid = `insurecheck-recheck-${now.getTime()}@coah.sg`
  const scoreLine = typeof currentScore === 'number' ? `Your score on ${now.toLocaleDateString('en-SG')} was ${currentScore}/100. ` : ''

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Coah//InsureCheck//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toIcsDate(now)}`,
    `DTSTART;VALUE=DATE:${toIcsDateOnly(target)}`,
    'SUMMARY:Re-check your Insurance Score',
    `DESCRIPTION:${scoreLine}Coverage needs change with income, debt, and life events — take a fresh check at coah.vercel.app/insure.`,
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
