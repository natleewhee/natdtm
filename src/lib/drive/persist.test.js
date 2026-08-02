// src/lib/drive/persist.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  serializeToParams, deserializeFromParams, sanitizeState, deserializeFromJSON, mergeRestoredState,
} from './persist.js'

test('serializeToParams only sets params that differ from the default', () => {
  const params = serializeToParams({ salaryRaw: '', downRaw: '', existingDebtRaw: '', tenure: 7, mode: 'single', calculated: false })
  assert.equal(params.toString(), '')
})

test('serializeToParams -> deserializeFromParams round-trips a real set of inputs', () => {
  const state = { salaryRaw: '8000', downRaw: '50000', existingDebtRaw: '500', tenure: 5, mode: 'compare', carAId: 'car1', carBId: 'car2', customPriceA: '90000', customPriceB: '95000', calculated: true }
  const params = serializeToParams(state)
  const restored = deserializeFromParams(params)
  assert.equal(restored.salaryRaw, '8000')
  assert.equal(restored.downRaw, '50000')
  assert.equal(restored.existingDebtRaw, '500')
  assert.equal(restored.tenure, 5)
  assert.equal(restored.mode, 'compare')
  assert.equal(restored.carAId, 'car1')
  assert.equal(restored.carBId, 'car2')
  assert.equal(restored.customPriceA, '90000')
  assert.equal(restored.customPriceB, '95000')
  assert.equal(restored.calculated, true)
})

test('deserializeFromParams rejects a non-numeric salary/down/debt param instead of accepting garbage', () => {
  const params = new URLSearchParams('salary=not-a-number&down=50000')
  const restored = deserializeFromParams(params)
  assert.equal(restored.salaryRaw, undefined)
  assert.equal(restored.downRaw, '50000')
})

test('deserializeFromParams clamps tenure to [1,7], rejecting out-of-range values', () => {
  assert.equal(deserializeFromParams(new URLSearchParams('tenure=0')).tenure, undefined)
  assert.equal(deserializeFromParams(new URLSearchParams('tenure=8')).tenure, undefined)
  assert.equal(deserializeFromParams(new URLSearchParams('tenure=5')).tenure, 5)
})

test('sanitizeState whitelists known fields and drops unknown/malformed ones', () => {
  const out = sanitizeState({ salaryRaw: '8000', tenure: 5, mode: 'compare', extraJunkField: 'should be dropped', calculated: true })
  assert.deepEqual(out, { salaryRaw: '8000', tenure: 5, mode: 'compare', calculated: true })
})

test('sanitizeState rejects an out-of-range tenure and an invalid mode', () => {
  const out = sanitizeState({ tenure: 99, mode: 'not-a-real-mode' })
  assert.equal('tenure' in out, false)
  assert.equal('mode' in out, false)
})

test('sanitizeState on null/non-object input returns {}', () => {
  assert.deepEqual(sanitizeState(null), {})
  assert.deepEqual(sanitizeState('a string'), {})
})

test('deserializeFromJSON parses and sanitizes a JSON string (the legacy localStorage format)', () => {
  const raw = JSON.stringify({ salaryRaw: '8000', tenure: 5, mode: 'single', calculated: false })
  const out = deserializeFromJSON(raw)
  assert.equal(out.salaryRaw, '8000')
  assert.equal(out.tenure, 5)
})

test('deserializeFromJSON returns {} for malformed JSON instead of throwing', () => {
  assert.deepEqual(deserializeFromJSON('{not valid json'), {})
  assert.deepEqual(deserializeFromJSON(''), {})
  assert.deepEqual(deserializeFromJSON(null), {})
})

test('mergeRestoredState: URL values win over storage values for the same key', () => {
  const merged = mergeRestoredState({ salaryRaw: '5000', tenure: 5 }, { salaryRaw: '9000' })
  assert.equal(merged.salaryRaw, '9000', 'URL wins')
  assert.equal(merged.tenure, 5, 'storage value survives when the URL does not specify it')
})
