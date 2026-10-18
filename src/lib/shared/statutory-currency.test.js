// src/lib/shared/statutory-currency.test.js
// Currency gate for Singapore statutory constants. Fails CI when:
//   - the audit in docs/statutory-sources.md is more than ~3 months old,
//   - a known wrong value is still listed under "Open discrepancies",
//   - a "Scheduled changes" row has reached its effective date unapplied, or
//   - a new `*_AS_OF` marker is added to the engines without being recorded.
//
// Note: this checks that the *audit* is recent, not that each constant's
// underlying rate changed recently — BSD tiers, for example, are years
// old and still correct. That is also why the UI's per-dataset freshness
// windows (src/lib/shared/freshness.js) stay long: they age an `AS_OF`
// revision date, which is not the same as when someone last checked.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const REGISTER = new URL('../../../docs/statutory-sources.md', import.meta.url)
const LIB_DIR = new URL('../', import.meta.url)

// How long an audit stays valid. Singapore rates move at the Budget
// (mid-Feb), at the 1 Jan CPF/LTA effective dates and on occasional
// policy announcements (the PARF cut and the CPF senior-worker steps were
// each missed for months under the old once-a-year gate), so a re-audit is
// due every quarter. 100 days is a quarter plus a little grace so a
// quarterly cadence doesn't trip at the edge; leave it longer and CI goes red.
const MAX_AUDIT_AGE_DAYS = 100

function registerText() {
  return readFileSync(REGISTER, 'utf8')
}

// Every `export const <NAME>_AS_OF` anywhere under src/lib/ — recursive,
// so a marker added to a new file or a nested dir can't slip past the
// register-completeness check below.
function asOfMarkersInEngines() {
  const libRoot = fileURLToPath(LIB_DIR)
  const markers = []
  for (const ent of readdirSync(libRoot, { withFileTypes: true, recursive: true })) {
    if (!ent.isFile() || !ent.name.endsWith('.js') || ent.name.endsWith('.test.js')) continue
    const rel = `${ent.parentPath ?? ent.path}/${ent.name}`.replace(/\\/g, '/')
    const src = readFileSync(rel, 'utf8')
    for (const m of src.matchAll(/export const (\w*_AS_OF)\b/g)) {
      markers.push({ name: m[1], file: `src/lib/${rel.slice(rel.indexOf('/lib/') + 5)}` })
    }
  }
  return markers
}

test('statutory-sources.md carries a recent audit date', () => {
  const m = registerText().match(/\*\*Audit date:\s*(\d{4}-\d{2}-\d{2})\*\*/)
  assert.ok(m, 'register must have a **Audit date: YYYY-MM-DD** line')
  const ageDays = (Date.now() - new Date(m[1]).getTime()) / 86_400_000
  assert.ok(
    ageDays <= MAX_AUDIT_AGE_DAYS,
    `statutory audit is ${Math.round(ageDays)} days old (max ${MAX_AUDIT_AGE_DAYS}). ` +
      `Re-verify every source in docs/statutory-sources.md and update the Audit date.`,
  )
})

// The lines of a `## <heading>` section, up to the next `## ` heading.
function sectionLines(text, heading) {
  const lines = text.split('\n')
  const start = lines.findIndex((l) => new RegExp(`^##\\s+${heading}\\b`).test(l))
  if (start === -1) return null
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((l) => /^##\s/.test(l))
  return end === -1 ? rest : rest.slice(0, end)
}

test('every *_AS_OF marker in the engines is recorded in the register', () => {
  const text = registerText()
  const missing = asOfMarkersInEngines().filter(({ name }) => !text.includes(name))
  assert.deepEqual(
    missing,
    [],
    `these *_AS_OF markers are not in docs/statutory-sources.md: ` +
      missing.map((x) => `${x.name} (${x.file})`).join(', '),
  )
})

test('the register keeps an Open discrepancies section', () => {
  // Its presence (even empty) proves the audit ran and looked for
  // wrong values, rather than silently omitting the check.
  assert.match(registerText(), /##\s*Open discrepancies/)
})

test('no known wrong constant is left open', () => {
  // A known-wrong shipping value is a follow-up to do now, not a note to
  // leave: fix the value, then move the entry to "Resolved discrepancies".
  const lines = sectionLines(registerText(), 'Open discrepancies')
  assert.ok(lines, 'register must have an Open discrepancies section')
  const open = lines.filter((l) => /^\s*(\d+\.|[-*])\s+\S/.test(l))
  assert.deepEqual(
    open,
    [],
    `${open.length} open discrepanc${open.length === 1 ? 'y' : 'ies'} in docs/statutory-sources.md: ` +
      `fix the value(s), then move them to "Resolved discrepancies".`,
  )
})

test('no scheduled change is past its effective date and still pending', () => {
  const lines = sectionLines(registerText(), 'Scheduled changes')
  assert.ok(lines, 'register must have a Scheduled changes section')
  const rows = lines
    .map((l) => l.match(/^\|\s*(\d{4}-\d{2}-\d{2})\s*\|(.*)\|\s*(pending|applied)\s*\|\s*$/))
    .filter(Boolean)
  assert.ok(rows.length > 0, 'Scheduled changes must list at least one row (or its parser is out of step with the table)')
  const due = rows.filter(([, date, , status]) => status === 'pending' && new Date(date) <= new Date())
  assert.deepEqual(
    due.map(([, date, what]) => `${date}:${what.split('|')[0].trim().slice(0, 80)}`),
    [],
    'these changes have taken effect but are still pending in docs/statutory-sources.md: ' +
      'update the code and the register, then mark the row applied.',
  )
})

test('every Scheduled changes row ends in a recognised status', () => {
  // Guards the table format: a typo'd status (e.g. "done") would silently
  // exempt a row from the check above.
  const lines = sectionLines(registerText(), 'Scheduled changes')
  const dataRows = lines.filter((l) => /^\|\s*\d{4}-\d{2}-\d{2}\s*\|/.test(l))
  const parsed = dataRows.filter((l) => /\|\s*(pending|applied)\s*\|\s*$/.test(l))
  assert.equal(parsed.length, dataRows.length, 'every Scheduled changes row must end in "pending" or "applied"')
})
