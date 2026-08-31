// src/lib/shared/docs-consistency.test.js
// Keeps README.md's tool list in step with the home page. The README
// used to describe three tools long after the app shipped eight.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const README = readFileSync(new URL('../../../README.md', import.meta.url), 'utf8')
const HOME = readFileSync(new URL('../../app/page.js', import.meta.url), 'utf8')

// The tool routes the home page links to.
const routes = [...HOME.matchAll(/href:\s*'(\/[a-z]+)'/g)].map((m) => m[1])

test('the home page links to eight distinct tool routes', () => {
  assert.equal(new Set(routes).size, 8, `expected 8 tool routes, got ${routes.join(', ')}`)
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
