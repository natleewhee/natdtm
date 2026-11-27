// src/lib/shared/docs-consistency.test.ts
// Keeps README.md's tool list in step with the tool registry. The README
// used to describe three tools long after the app shipped eight — later
// consolidated to seven when FlowState was absorbed into MyLedger.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const README = readFileSync(new URL('../../../README.md', import.meta.url), 'utf8')
import { TOOLS } from './tools.ts'

// The tool routes come from the registry (src/lib/shared/tools.ts), which
// the home page renders; tools.test.ts guards that the home page does not
// grow a second hard-coded list.
const routes = TOOLS.map((t) => t.route)

test('the registry lists at least seven distinct tool routes', () => {
  assert.ok(routes.length >= 7, `registry has only ${routes.length} tools`)
  assert.equal(new Set(routes).size, routes.length)
})

test('README.md documents every tool route the home page links to', () => {
  const missing = [...new Set(routes)].filter((r) => !README.includes(`\`${r}\``))
  assert.deepEqual(missing, [], `README is missing tool routes: ${missing.join(', ')}`)
})

test('README.md and docs/architecture.md exist and are non-trivial', () => {
  assert.ok(README.length > 1500, 'README.md looks empty/stale')
  const arch = readFileSync(new URL('../../../docs/architecture.md', import.meta.url), 'utf8')
  assert.ok(arch.includes('My Numbers') && arch.includes('data pipeline'))
})
