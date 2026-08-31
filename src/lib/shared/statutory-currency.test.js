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

const REGISTER = new URL('../../../docs/statutory-sources.md', import.meta.url)
const LIB_DIR = new URL('../', import.meta.url)

// How long an audit stays valid. Singapore rates move at the annual
// Budget (Feb) plus occasional cooling measures, so ~13 months forces a
// re-verification pass every year without tripping on a normal cycle.
const MAX_AUDIT_AGE_DAYS = 400

function registerText() {
  return readFileSync(REGISTER, 'utf8')
}

// Every `export const <NAME>_AS_OF` across the engine modules.
function asOfMarkersInEngines() {
  const markers = []
  for (const tool of readdirSync(LIB_DIR, { withFileTypes: true })) {
    if (!tool.isDirectory()) continue
    const toolDir = new URL(`${tool.name}/`, LIB_DIR)
    let files
    try {
      files = readdirSync(toolDir)
    } catch {
      continue
    }
    for (const f of files) {
      if (!f.endsWith('.js') || f.endsWith('.test.js')) continue
      const src = readFileSync(new URL(f, toolDir), 'utf8')
      for (const m of src.matchAll(/export const (\w*_AS_OF)\b/g)) {
        markers.push({ name: m[1], file: `src/lib/${tool.name}/${f}` })
      }
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
