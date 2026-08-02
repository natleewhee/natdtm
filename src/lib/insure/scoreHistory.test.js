// src/lib/insure/scoreHistory.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'

function makeStorage() {
  const store = new Map()
  return {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
  }
}
global.localStorage = makeStorage()

const { appendScoreHistory, loadScoreHistory, clearScoreHistory } = await import('./scoreHistory.js')

test('loadScoreHistory returns [] when nothing has been saved', () => {
  global.localStorage = makeStorage()
  assert.deepEqual(loadScoreHistory(), [])
})

test('appendScoreHistory / loadScoreHistory round-trips a score with a date', () => {
  global.localStorage = makeStorage()
  appendScoreHistory(72)
  const history = loadScoreHistory()
  assert.equal(history.length, 1)
  assert.equal(history[0].score, 72)
  assert.equal(typeof history[0].date, 'string')
})

test('appendScoreHistory ignores non-numeric or NaN scores instead of corrupting history', () => {
  global.localStorage = makeStorage()
  appendScoreHistory('not a number')
  appendScoreHistory(NaN)
  assert.deepEqual(loadScoreHistory(), [])
})

test('appendScoreHistory keeps entries in append order (oldest-first)', () => {
  global.localStorage = makeStorage()
  appendScoreHistory(50)
  appendScoreHistory(60)
  appendScoreHistory(70)
  const history = loadScoreHistory()
  assert.deepEqual(history.map(h => h.score), [50, 60, 70])
})

test('appendScoreHistory caps at MAX_ENTRIES (24), dropping the oldest', () => {
  global.localStorage = makeStorage()
  for (let i = 0; i < 30; i++) appendScoreHistory(i)
  const history = loadScoreHistory()
  assert.equal(history.length, 24)
  assert.equal(history[0].score, 6, 'the oldest 6 entries (0-5) should have been dropped')
  assert.equal(history[23].score, 29)
})

test('clearScoreHistory empties the history', () => {
  global.localStorage = makeStorage()
  appendScoreHistory(50)
  clearScoreHistory()
  assert.deepEqual(loadScoreHistory(), [])
})

test('loadScoreHistory returns [] for malformed JSON instead of throwing', () => {
  global.localStorage = makeStorage()
  global.localStorage.setItem('iga_score_history', '{not valid json')
  assert.deepEqual(loadScoreHistory(), [])
})

test('loadScoreHistory returns [] when the stored value is valid JSON but not an array', () => {
  global.localStorage = makeStorage()
  global.localStorage.setItem('iga_score_history', JSON.stringify({ not: 'an array' }))
  assert.deepEqual(loadScoreHistory(), [])
})
