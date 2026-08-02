// src/lib/drive/tco.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { estimateRoadTax, estimateInsurance, guessBrandKey, estimateAnnualRunningCosts, PARKING_ANNUAL_ESTIMATE } from './tco.js'

test('estimateRoadTax climbs with OMV band', () => {
  const low = estimateRoadTax(15000, false)
  const high = estimateRoadTax(60000, false)
  assert.ok(high > low)
})

test('estimateRoadTax uses the (generally lower) EV schedule for a pure EV', () => {
  const ice = estimateRoadTax(25000, false)
  const ev = estimateRoadTax(25000, true)
  assert.ok(ev < ice)
})

test('estimateRoadTax treats a missing OMV as the cheapest band rather than throwing', () => {
  assert.equal(estimateRoadTax(null, false), estimateRoadTax(0, false))
})

test('estimateInsurance applies a small EV loading on top of the ICE base for the same OMV band', () => {
  const ice = estimateInsurance(25000, false)
  const ev = estimateInsurance(25000, true)
  assert.ok(ev > ice)
})

test('guessBrandKey matches a known brand from the car name', () => {
  assert.equal(guessBrandKey('Toyota Corolla Altis'), 'toyota')
  assert.equal(guessBrandKey('BMW 3 Series'), 'bmw')
})

test('guessBrandKey falls back to toyota for an unrecognized name', () => {
  assert.equal(guessBrandKey('Some Obscure Marque 9000'), 'toyota')
  assert.equal(guessBrandKey(''), 'toyota')
})

test('guessBrandKey matches "Range Rover" to the landrover tier, not the toyota fallback', () => {
  // "Range Rover Sport" contains neither "landrover" nor "land rover" as a
  // substring, so the generic key/label match alone misses it and used to
  // silently fall back to toyota (~5x cheaper annual service).
  assert.equal(guessBrandKey('Range Rover Sport'), 'landrover')
  assert.equal(guessBrandKey('Land Rover Defender'), 'landrover')
})

test('guessBrandKey matches Chery sub-brands Omoda and Jaecoo', () => {
  assert.equal(guessBrandKey('Omoda 5 EV'), 'omoda')
  assert.equal(guessBrandKey('Jaecoo 7'), 'jaecoo')
})

test('estimateAnnualRunningCosts sums road tax + insurance + maintenance + parking into total, and total/12 into monthly', () => {
  const car = { name: 'Toyota Corolla Altis', omv: 18000, type: 'Petrol', rateTier: 'toyota' }
  const result = estimateAnnualRunningCosts(car)
  assert.equal(result.parking, PARKING_ANNUAL_ESTIMATE)
  assert.equal(result.total, result.roadTax + result.insurance + result.maintenance + result.parking)
  assert.ok(Math.abs(result.monthly - result.total / 12) < 0.001)
})

test('estimateAnnualRunningCosts recognizes a pure EV via car.type and uses the EV road tax/insurance schedule', () => {
  const car = { name: 'BYD Dolphin', omv: 18000, type: 'Electric', rateTier: 'byd' }
  const result = estimateAnnualRunningCosts(car)
  assert.equal(result.roadTax, estimateRoadTax(18000, true))
})
