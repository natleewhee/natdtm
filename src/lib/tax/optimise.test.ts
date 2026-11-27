import { test } from 'node:test'
import assert from 'node:assert/strict'
import { optimiseReliefs, leverCapacity, bandSlices, FAMILY_INCOME_LIMIT } from './optimise.ts'
import { calcTax, SRS_CAP_CITIZEN_PR, RSTU_RELIEF_CAP_SELF, RSTU_RELIEF_CAP_FAMILY, PERSONAL_RELIEF_CAP } from './calc.ts'

const approx = (a: number, b: number, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`)
const BASE = { age: 34, monthlySalary: 10_000, annualBonus: 20_000 }

test('fills SRS first for the access priority, then MediSave, then SA/RA', () => {
  const r = optimiseReliefs(BASE, { spare: 20_000, priority: 'access' })
  assert.deepEqual(r.steps.map((s: any) => [s.lever, s.amount]), [
    ['srs', SRS_CAP_CITIZEN_PR],
    ['cpfMa', 20_000 - SRS_CAP_CITIZEN_PR],
  ])
  assert.equal(r.used, 20_000)
  assert.equal(r.unused, 0)
})

test('the tax-free priority uses CPF before SRS', () => {
  const r = optimiseReliefs(BASE, { spare: 10_000, priority: 'taxFree' })
  assert.deepEqual(r.steps.map((s: any) => s.lever), ['cpfMa', 'srs'])
  assert.equal(r.steps[0].amount, RSTU_RELIEF_CAP_SELF)
  assert.equal(r.taxDeferredOnly, 2_000)
})

test('MediSave and SA/RA share one S$8,000 self cap', () => {
  const r = optimiseReliefs(BASE, { spare: 50_000, priority: 'taxFree', maRoom: 3_000, levers: { srs: false, cpfFamily: false } })
  const ma = r.steps.find((s: any) => s.lever === 'cpfMa')!.amount
  const ra = r.steps.find((s: any) => s.lever === 'cpfRa')!.amount
  assert.equal(ma, 3_000)
  assert.equal(ma + ra, RSTU_RELIEF_CAP_SELF)
  assert.equal(r.limitedBy, 'leverLimits')
})

test('existing claims reduce the room left on each lever', () => {
  const cap = leverCapacity({ ...BASE, srsContribution: 5_000, rstuSelf: 3_000, rstuFamily: 8_000 })
  assert.equal(cap.srs, SRS_CAP_CITIZEN_PR - 5_000)
  assert.equal(cap.cpfSelf, RSTU_RELIEF_CAP_SELF - 3_000)
  assert.equal(cap.cpfFamily, 0)
})

test('per-step savings add up to the total and match calcTax', () => {
  const r = optimiseReliefs(BASE, { spare: 31_300 })
  approx(r.steps.reduce((s: number, x: any) => s + x.saving, 0), r.saving)
  const direct = calcTax({ ...BASE, srsContribution: SRS_CAP_CITIZEN_PR, rstuSelf: RSTU_RELIEF_CAP_SELF, rstuFamily: RSTU_RELIEF_CAP_FAMILY })
  approx(r.newTax, direct.tax)
})

test('stops at the personal relief cap', () => {
  const plain = { age: 40, monthlySalary: 8_000 }
  const rich = { ...plain, otherReliefs: PERSONAL_RELIEF_CAP - 10_000 - calcTax(plain).reliefs.raw }
  const r = optimiseReliefs(rich, { spare: 30_000 })
  assert.equal(r.used, 10_000)
  assert.equal(r.limitedBy, 'reliefCap')
})

test('nothing to save when there is no tax', () => {
  const r = optimiseReliefs({ age: 30, monthlySalary: 1_500 }, { spare: 10_000 })
  assert.equal(r.baseTax, 0)
  assert.equal(r.saving, 0)
})

test('bandSlices takes the top band first and sums to the saving', () => {
  const ci = calcTax(BASE).chargeableIncome
  const slices = bandSlices(ci, 30_000)
  assert.ok(slices[0].rate >= slices[slices.length - 1].rate)
  approx(slices.reduce((s: number, x: any) => s + x.amount, 0), 30_000)
  const s = optimiseReliefs(BASE, { spare: 30_000 })
  approx(slices.reduce((t: number, x: any) => t + x.saving, 0), s.saving)
})

test('the family income limit is S$8,000 (from YA 2025)', () => {
  assert.equal(FAMILY_INCOME_LIMIT, 8_000)
})

test('foreigners get SRS only, at the higher cap', () => {
  const r = optimiseReliefs({ ...BASE, isForeigner: true }, { spare: 50_000 })
  assert.deepEqual(r.steps.map((s: any) => s.lever), ['srs'])
  assert.equal(r.capacity.cpfSelf, 0)
})
