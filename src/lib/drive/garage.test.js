// src/lib/drive/garage.test.js
// loadGarage/saveGarage are deliberately untested IO wrappers (see the
// file's own header comment) — this covers the pure list-manipulation
// functions around them.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeGarageEntry, addEntry, removeEntry, renameEntry, defaultEntryName, MAX_GARAGE_ENTRIES } from './garage.js'

test('makeGarageEntry defaults to "Untitled scenario" when no name given', () => {
  const entry = makeGarageEntry({ inputs: { salary: '10000' } })
  assert.equal(entry.name, 'Untitled scenario')
  assert.equal(typeof entry.id, 'string')
  assert.ok(entry.id.length > 0)
})

test('makeGarageEntry keeps a provided name and inputs/summary', () => {
  const entry = makeGarageEntry({ name: 'My Toyota', inputs: { salary: '10000' }, summary: { monthly: 500 } })
  assert.equal(entry.name, 'My Toyota')
  assert.deepEqual(entry.inputs, { salary: '10000' })
  assert.deepEqual(entry.summary, { monthly: 500 })
})

test('addEntry prepends the new entry (most recent first)', () => {
  const existing = [{ id: 'old' }]
  const result = addEntry(existing, { id: 'new' })
  assert.equal(result[0].id, 'new')
  assert.equal(result[1].id, 'old')
})

test('addEntry caps the list at MAX_GARAGE_ENTRIES, dropping the oldest', () => {
  const full = Array.from({ length: MAX_GARAGE_ENTRIES }, (_, i) => ({ id: `e${i}` }))
  const result = addEntry(full, { id: 'newest' })
  assert.equal(result.length, MAX_GARAGE_ENTRIES)
  assert.equal(result[0].id, 'newest')
  assert.ok(!result.some(e => e.id === `e${MAX_GARAGE_ENTRIES - 1}`), 'the oldest entry should have been dropped')
})

test('removeEntry removes only the matching id', () => {
  const entries = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  const result = removeEntry(entries, 'b')
  assert.deepEqual(result.map(e => e.id), ['a', 'c'])
})

test('renameEntry renames only the matching entry, leaving others untouched', () => {
  const entries = [{ id: 'a', name: 'Old A' }, { id: 'b', name: 'Old B' }]
  const result = renameEntry(entries, 'a', 'New A')
  assert.equal(result.find(e => e.id === 'a').name, 'New A')
  assert.equal(result.find(e => e.id === 'b').name, 'Old B')
})

test('defaultEntryName: two cars -> "A vs B"', () => {
  assert.equal(defaultEntryName('Toyota Corolla', 'Honda Civic'), 'Toyota Corolla vs Honda Civic')
})

test('defaultEntryName: one car -> just that car\'s name', () => {
  assert.equal(defaultEntryName('Toyota Corolla', null), 'Toyota Corolla')
})

test('defaultEntryName: no cars -> "Untitled scenario"', () => {
  assert.equal(defaultEntryName(null, null), 'Untitled scenario')
})
