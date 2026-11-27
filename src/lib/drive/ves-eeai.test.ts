// VES bands and EEAI caps, checked against LTA OneMotoring "Tax structure"
// (VES for cars registered 1 Jan 2026 - 31 Dec 2027; EEAI caps by date).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { vesForBand, VES_SCHEDULE, eeaiCapFor, calcEEAI, calcGovtCosts } from './calc.ts'

test('VES 2026: EV rebate S$22,500; surcharges S$7,500 / S$22,500 / S$35,000', () => {
  const d = '2026-06-01'
  assert.deepEqual(['A', 'B', 'C1', 'C2', 'C3'].map((b) => vesForBand(b, d)), [22_500, 0, -7_500, -22_500, -35_000])
})

test('VES 2027 applies from 1 Jan 2027: rebate S$20,000; surcharges S$15,000 / S$30,000 / S$45,000', () => {
  assert.deepEqual(['A', 'B', 'C1', 'C2', 'C3'].map((b) => vesForBand(b, '2027-01-01')), [20_000, 0, -15_000, -30_000, -45_000])
  assert.equal(vesForBand('C1', '2026-12-31T23:00:00+08:00'), -7_500)
  assert.equal(vesForBand('A', '2029-05-01'), 20_000) // latest known table until LTA announces more
  assert.equal(vesForBand('Z', '2026-06-01'), null)
  assert.deepEqual(VES_SCHEDULE.map((e) => e.from), ['2026-01-01', '2027-01-01'])
})

test('EEAI cap follows the registration date', () => {
  assert.equal(eeaiCapFor('2020-12-31'), 0)
  assert.equal(eeaiCapFor('2022-06-01'), 20_000)
  assert.equal(eeaiCapFor('2025-06-01'), 15_000)
  assert.equal(eeaiCapFor('2026-06-01'), 7_500)
  assert.equal(calcEEAI(100_000, '2023-03-01'), 20_000)
  assert.equal(calcEEAI(100_000, '2027-01-01'), 0) // ceased
})

test('every car in cars.json has a band whose 2026 VES matches its stored value', () => {
  const { cars } = JSON.parse(readFileSync(new URL('../../../public/data/cars.json', import.meta.url), 'utf8'))
  for (const c of cars) {
    assert.ok(['A', 'B', 'C1', 'C2', 'C3'].includes(c.vesBand), `${c.id} band ${c.vesBand}`)
    assert.equal(c.ves, vesForBand(c.vesBand, '2026-06-01'), `${c.id}: stored VES ${c.ves} vs band ${c.vesBand}`)
  }
})

test('government costs use the band, so a C2 car carries the S$22,500 surcharge', () => {
  const car = { omv: 60_000, ves: -15_000, vesBand: 'C2', coe: 'Cat B', rateTier: 'ice', type: 'SUV · Petrol' }
  const g = calcGovtCosts(car, 100_000)
  assert.ok(g.vesAmount === -22_500 || g.vesAmount === -30_000, `vesAmount ${g.vesAmount}`)
})
