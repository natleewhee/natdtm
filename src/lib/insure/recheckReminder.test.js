// src/lib/insure/recheckReminder.test.js
// downloadRecheckReminder itself is a deliberately-untested DOM/download
// side effect (Blob/URL/document aren't available under plain Node) —
// this covers buildRecheckIcs, the pure content-building logic it wraps.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildRecheckIcs } from './recheckReminder.js'

test('buildRecheckIcs targets exactly one year after `now`', () => {
  const now = new Date('2026-03-15T10:00:00Z')
  const ics = buildRecheckIcs(72, now)
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20270315'))
})

test('buildRecheckIcs includes the score in the description when given a number', () => {
  const ics = buildRecheckIcs(72, new Date('2026-03-15T10:00:00Z'))
  assert.ok(ics.includes('72/100'))
})

test('buildRecheckIcs omits a score line entirely when currentScore is not a number', () => {
  const ics = buildRecheckIcs(undefined, new Date('2026-03-15T10:00:00Z'))
  assert.ok(!ics.includes('/100'))
})

test('buildRecheckIcs produces a well-formed, parseable VCALENDAR/VEVENT block', () => {
  const ics = buildRecheckIcs(50, new Date('2026-03-15T10:00:00Z'))
  assert.ok(ics.startsWith('BEGIN:VCALENDAR'))
  assert.ok(ics.endsWith('END:VCALENDAR'))
  assert.ok(ics.includes('BEGIN:VEVENT'))
  assert.ok(ics.includes('END:VEVENT'))
  assert.ok(/UID:insurecheck-recheck-\d+@natdtm\.vercel\.app/.test(ics))
})

test('buildRecheckIcs produces a distinct UID each time `now` changes', () => {
  const a = buildRecheckIcs(50, new Date('2026-03-15T10:00:00Z'))
  const b = buildRecheckIcs(50, new Date('2026-03-16T10:00:00Z'))
  const uidOf = (ics) => ics.match(/UID:(\S+)/)[1]
  assert.notEqual(uidOf(a), uidOf(b))
})

test('buildRecheckIcs uses the SGT date, not the UTC date, near the UTC day boundary', () => {
  // 2026-03-16T00:30:00Z is 08:30 SGT on 2026-03-16 — same SGT day as UTC.
  // 2026-03-15T17:30:00Z is 01:30 SGT on 2026-03-16 — a day AHEAD of UTC.
  const ics = buildRecheckIcs(50, new Date('2026-03-15T17:30:00Z'))
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20270316'), 'target date should follow SGT (16th), not UTC (15th)')
})

test('buildRecheckIcs escapes RFC5545-significant characters in the description', () => {
  const ics = buildRecheckIcs(72, new Date('2026-03-15T10:00:00Z'))
  const descLine = ics.split('\r\n').find(l => l.startsWith('DESCRIPTION:'))
  // Real content contains a comma (after the score sentence's "and") —
  // confirm it's backslash-escaped as RFC5545 TEXT requires.
  assert.ok(descLine.includes('income\\, debt\\, and life events'))
})
