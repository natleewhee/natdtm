// src/lib/insure/scoreHistory.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'

function makeStorage(): any {
  const store = new Map()
  return {
    getItem: (k: any) => (store.has(k) ? store.get(k) : null),
    setItem: (k: any, v: any) => store.set(k, String(v)),
    removeItem: (k: any) => store.delete(k),
  }
}
;(globalThis as any).window = { localStorage: makeStorage() }

const { appendScoreHistory, loadScoreHistory, clearScoreHistory } = await import('./scoreHistory.ts')

test('loadScoreHistory returns [] when nothing has been saved', () => {
  window.localStorage = makeStorage()
  assert.deepEqual(loadScoreHistory(), [])
})

test('appendScoreHistory / loadScoreHistory round-trips a score with a date', () => {
  window.localStorage = makeStorage()
  appendScoreHistory(72)
  const history = loadScoreHistory()
  assert.equal(history.length, 1)
  assert.equal(history[0].score, 72)
  assert.equal(typeof history[0].date, 'string')
})

test('appendScoreHistory ignores non-numeric or NaN scores instead of corrupting history', () => {
  window.localStorage = makeStorage()
  appendScoreHistory(('not a number' as any))
  appendScoreHistory(NaN)
  assert.deepEqual(loadScoreHistory(), [])
})

test('appendScoreHistory keeps entries in append order (oldest-first)', () => {
  window.localStorage = makeStorage()
  appendScoreHistory(50)
  appendScoreHistory(60)
  appendScoreHistory(70)
  const history = loadScoreHistory()
  assert.deepEqual(history.map(h => h.score), [50, 60, 70])
})

test('appendScoreHistory caps at MAX_ENTRIES (24), dropping the oldest', () => {
  window.localStorage = makeStorage()
  for (let i = 0; i < 30; i++) appendScoreHistory(i)
  const history = loadScoreHistory()
  assert.equal(history.length, 24)
  assert.equal(history[0].score, 6, 'the oldest 6 entries (0-5) should have been dropped')
  assert.equal(history[23].score, 29)
})

test('clearScoreHistory empties the history', () => {
  window.localStorage = makeStorage()
  appendScoreHistory(50)
  clearScoreHistory()
  assert.deepEqual(loadScoreHistory(), [])
})

test('loadScoreHistory returns [] when the store is malformed JSON instead of throwing', () => {
  window.localStorage = makeStorage()
  window.localStorage.setItem('ndtm_my_numbers_v1', '{not valid json')
  assert.deepEqual(loadScoreHistory(), [])
})

test('a legacy iga_score_history key is adopted into the profile, not lost', () => {
  window.localStorage = makeStorage()
  window.localStorage.setItem('iga_score_history', JSON.stringify([{ score: 41, date: '2025-11-01' }]))
  assert.deepEqual(loadScoreHistory().map(h => h.score), [41])
  appendScoreHistory(58)
  assert.deepEqual(loadScoreHistory().map(h => h.score), [41, 58])
  assert.equal(window.localStorage.getItem('iga_score_history'), null)
})

test('a legacy key holding a non-array is ignored', () => {
  window.localStorage = makeStorage()
  window.localStorage.setItem('iga_score_history', JSON.stringify({ not: 'an array' }))
  assert.deepEqual(loadScoreHistory(), [])
})
