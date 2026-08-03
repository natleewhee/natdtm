// src/lib/drive/coe-history.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseCoeResultToEntries, coerceDatastoreRecord, sortEntriesChronologically, mergeHistoryEntries,
} from './coe-history.js'

test('coerceDatastoreRecord: converts data.gov.sg\'s all-string CKAN fields to numbers', () => {
  const r = coerceDatastoreRecord({
    month: '2026-06', bidding_no: '1', vehicle_class: 'Category A',
    quota: '1234', bids_success: '1200', bids_received: '1500', premium: '105000',
  })
  assert.equal(r.month, '2026-06') // stays a string — it's a label, not a number
  assert.equal(r.bidding_no, 1)
  assert.equal(r.vehicle_class, 'Category A')
  assert.equal(r.quota, 1234)
  assert.equal(r.bids_success, 1200)
  assert.equal(r.premium, 105000)
})

test('parseCoeResultToEntries: pairs Cat A/Cat B rows for the same month+bidding_no', () => {
  const rows = [
    { month: '2026-06', bidding_no: 1, vehicle_class: 'Category A', quota: 1000, bids_success: 900, premium: 90000 },
    { month: '2026-06', bidding_no: 1, vehicle_class: 'Category B', quota: 800, bids_success: 700, premium: 130000 },
  ]
  const entries = parseCoeResultToEntries(rows)
  assert.equal(entries.length, 1)
  assert.equal(entries[0].month, '2026-06')
  assert.equal(entries[0].biddingNo, 1)
  assert.equal(entries[0].catA.premium, 90000)
  assert.equal(entries[0].catB.premium, 130000)
})

test('parseCoeResultToEntries: drops an exercise missing either Cat A or Cat B', () => {
  const rows = [
    { month: '2026-06', bidding_no: 1, vehicle_class: 'Category A', quota: 1000, bids_success: 900, premium: 90000 },
    // no Cat B row for this exercise
    { month: '2026-06', bidding_no: 1, vehicle_class: 'Category C', quota: 100, bids_success: 90, premium: 50000 },
  ]
  assert.deepEqual(parseCoeResultToEntries(rows), [])
})

test('parseCoeResultToEntries: ignores Category C/D/E rows entirely', () => {
  const rows = [
    { month: '2026-06', bidding_no: 1, vehicle_class: 'Category A', quota: 1000, bids_success: 900, premium: 90000 },
    { month: '2026-06', bidding_no: 1, vehicle_class: 'Category B', quota: 800, bids_success: 700, premium: 130000 },
    { month: '2026-06', bidding_no: 1, vehicle_class: 'Category C', quota: 100, bids_success: 90, premium: 50000 },
    { month: '2026-06', bidding_no: 1, vehicle_class: 'Category D', quota: 100, bids_success: 90, premium: 1000 },
    { month: '2026-06', bidding_no: 1, vehicle_class: 'Category E', quota: 100, bids_success: 90, premium: 150000 },
  ]
  const entries = parseCoeResultToEntries(rows)
  assert.equal(entries.length, 1) // only the A/B pair, not 5 separate entries
})

test('sortEntriesChronologically: oldest first, newest last (so .at(-1) is "latest")', () => {
  const entries = [
    { month: '2026-06', biddingNo: 2 },
    { month: '2026-05', biddingNo: 1 },
    { month: '2026-06', biddingNo: 1 },
  ]
  const sorted = sortEntriesChronologically(entries)
  assert.deepEqual(sorted.map(e => `${e.month}#${e.biddingNo}`), ['2026-05#1', '2026-06#1', '2026-06#2'])
})

test('sortEntriesChronologically: does not mutate the input array', () => {
  const entries = [{ month: '2026-06', biddingNo: 2 }, { month: '2026-05', biddingNo: 1 }]
  const before = [...entries]
  sortEntriesChronologically(entries)
  assert.deepEqual(entries, before)
})

test('mergeHistoryEntries: a fresh fetch overwrites a stale entry at the same (month, biddingNo)', () => {
  const existing = [{ month: '2026-06', biddingNo: 1, catA: { premium: 90000 }, catB: { premium: 100000 } }]
  const incoming = [{ month: '2026-06', biddingNo: 1, catA: { premium: 91000 }, catB: { premium: 101000 } }]
  const merged = mergeHistoryEntries(existing, incoming)
  assert.equal(merged.length, 1)
  assert.equal(merged[0].catA.premium, 91000) // incoming wins
})

test('mergeHistoryEntries: appends a genuinely new entry and keeps chronological order', () => {
  const existing = [{ month: '2026-05', biddingNo: 1, catA: {}, catB: {} }]
  const incoming = [{ month: '2026-06', biddingNo: 1, catA: {}, catB: {} }]
  const merged = mergeHistoryEntries(existing, incoming)
  assert.equal(merged.length, 2)
  assert.equal(merged[0].month, '2026-05')
  assert.equal(merged[1].month, '2026-06')
})
