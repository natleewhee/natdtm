// src/lib/ledger/scenario/adapt.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildScenarioBaseState, buildRetireAssumptions, resolveReference, staleSyncedSlots, SYNC_STALE_DAYS,
} from './adapt.js'

const MY_NUMBERS = {
  retire: { salary: 8000, oaBalance: 100_000, saBalance: 80_000, maBalance: 40_000, investmentBalance: 60_000, monthlyContribution: 2000, savedAt: Date.now() },
  house: { propertyValue: 900_000, outstandingBalance: 400_000, rate: 2.8, tenureRemaining: 18, savedAt: Date.now() },
  flow: { livingExpenses: 3800 },
}

test('buildScenarioBaseState maps CPF, investments, and the property from the store', () => {
  const s = buildScenarioBaseState(MY_NUMBERS, { startingCash: 200_000 })
  assert.equal(s.startingOA, 100_000)
  assert.equal(s.startingSA, 80_000)
  assert.equal(s.investmentStart, 60_000)
  assert.equal(s.startingCash, 200_000)
  assert.deepEqual(s.property, { value: 900_000, mortgagePrincipal: 400_000, mortgageRatePct: 2.8, mortgageTenureYears: 18 })
})

test('buildScenarioBaseState yields a null property when no house slot is set', () => {
  const s = buildScenarioBaseState({ retire: MY_NUMBERS.retire }, {})
  assert.equal(s.property, null)
  assert.equal(s.startingCash, 0)
})

test('buildRetireAssumptions prefers surface fields but falls back to the retire slot', () => {
  const a = buildRetireAssumptions(MY_NUMBERS, { currentAge: 42, retirementAge: 65, lifeExpectancy: 92, swr: 3 })
  assert.equal(a.currentAge, 42)
  assert.equal(a.salary, 8000) // from the slot
  assert.equal(a.investmentMonthly, 2000) // from the slot
  const b = buildRetireAssumptions(MY_NUMBERS, { salary: 9500, investmentMonthly: 3000 })
  assert.equal(b.salary, 9500)
  assert.equal(b.investmentMonthly, 3000)
})

test('resolveReference uses FlowState living expenses when present, else the user field', () => {
  assert.deepEqual(resolveReference(MY_NUMBERS, 5000), { reference: 3800, source: 'flow' })
  assert.deepEqual(resolveReference({ flow: { livingExpenses: 0 } }, 4200), { reference: 4200, source: 'user' })
  assert.deepEqual(resolveReference({}, 0), { reference: 0, source: 'none' })
})

test('staleSyncedSlots flags a slot older than the window and ignores an unsynced one', () => {
  const old = Date.now() - (SYNC_STALE_DAYS + 30) * 86_400_000
  const flagged = staleSyncedSlots({
    retire: { savedAt: old },
    house: { savedAt: Date.now() },
    // drive: never synced
  })
  assert.equal(flagged.length, 1)
  assert.equal(flagged[0].slot, 'retire')
  assert.ok(flagged[0].months >= 6)
})

test('staleSyncedSlots is empty when everything synced is recent', () => {
  assert.deepEqual(staleSyncedSlots(MY_NUMBERS), [])
})
