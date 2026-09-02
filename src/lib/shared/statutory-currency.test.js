// src/lib/shared/statutory-currency.test.js
// Currency gate for Singapore statutory constants. Fails CI when the
// audit in docs/statutory-sources.md goes stale or when a new `*_AS_OF`
// marker is added to the engines without being recorded there.
//
// Note: this checks that the *audit* is recent, not that each constant's
// underlying rate changed recently — BSD tiers, for example, are years
// old and still correct. "Wrong value" findings live in the register's
// "Open discrepancies" section, not here (fixing a value is a product
// decision, not a test failure).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const REGISTER = new URL('../../../docs/statutory-sources.md', import.meta.url)
const LIB_DIR = new URL('../', import.meta.url)

// How long an audit stays valid. Singapore rates move at the annual
// Budget (mid-Feb) plus occasional cooling measures, so 365 days forces
// a re-verification pass every year. Do the re-audit in Budget season
// (Feb–Mar) and this never trips; leave it and CI goes red one year on.
const MAX_AUDIT_AGE_DAYS = 365

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
