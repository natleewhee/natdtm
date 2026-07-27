// src/lib/shared/freshness.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeAsOf, daysSince, checkFreshness, freshnessLabel, FRESHNESS_WINDOWS,
} from './freshness.js'

const NOW = new Date('2026-07-27T00:00:00Z')

test('normalizeAsOf passes ISO dates straight through', () => {
  assert.equal(normalizeAsOf('2026-01-01'), '2026-01-01')
})

test('normalizeAsOf resolves human labels used across the suite', () => {
  assert.equal(normalizeAsOf('mid-2025'), '2025-07-01')
  assert.equal(normalizeAsOf('early-2024'), '2024-02-01')
  assert.equal(normalizeAsOf('late-2023'), '2023-11-01')
  assert.equal(normalizeAsOf('2025-Q1'), '2025-02-01')
  assert.equal(normalizeAsOf('2024'), '2024-07-01')
})

test('normalizeAsOf returns null for junk', () => {
  assert.equal(normalizeAsOf(''), null)
  assert.equal(normalizeAsOf(null), null)
  assert.equal(normalizeAsOf('not a date at all'), null)
})

test('daysSince measures elapsed days', () => {
  assert.equal(Math.round(daysSince('2026-07-17', NOW)), 10)
})

test('checkFreshness flags COE data older than the bidding window', () => {
  const fresh = checkFreshness('2026-07-01', FRESHNESS_WINDOWS.coe, NOW)
  assert.equal(fresh.stale, false)
  const stale = checkFreshness('2026-01-01', FRESHNESS_WINDOWS.coe, NOW)
  assert.equal(stale.stale, true)
})

test('checkFreshness flags the ETF mid-2025 dataset as stale today', () => {
  // This is the real case that prompted the helper: WhatETF's returns,
  // broker fees and benchmarks are all labelled mid-2025.
  const r = checkFreshness('mid-2025', FRESHNESS_WINDOWS.marketData, NOW)
  assert.equal(r.stale, true)
  assert.ok(r.months >= 12, `expected 12+ months, got ${r.months}`)
})

test('checkFreshness does not flag statutory rates that are merely a year old', () => {
  const r = checkFreshness('2026-01-01', FRESHNESS_WINDOWS.statutory, NOW)
  assert.equal(r.stale, false)
})

test('checkFreshness returns null staleness for an unparseable date', () => {
  const r = checkFreshness('sometime', FRESHNESS_WINDOWS.marketData, NOW)
  assert.equal(r.stale, null)
  assert.equal(r.days, null)
})

test('freshnessLabel reads plainly when fresh and warns when not', () => {
  assert.equal(freshnessLabel('2026-07-01', FRESHNESS_WINDOWS.coe, NOW), 'Data as of 2026-07-01')
  const warn = freshnessLabel('mid-2025', FRESHNESS_WINDOWS.marketData, NOW)
  assert.match(warn, /^⚠/)
  assert.match(warn, /months old/)
})

test('freshnessLabel switches to years for very old data', () => {
  const warn = freshnessLabel('2023-01-01', FRESHNESS_WINDOWS.marketData, NOW)
  assert.match(warn, /years old/)
})
