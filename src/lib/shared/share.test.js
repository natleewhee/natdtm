import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildShareUrl, parseShare, SHARE_FIELDS, SHARE_FLAG } from './share.js'
import { NSMAN_RELIEF } from '../tax/calc.js'

const ORIGIN = 'https://natdtm.vercel.app'
const FORM = {
  age: '34', residency: 'citizen', monthlySalary: '8000', annualBonus: '16000', otherIncome: '',
  srsContribution: '5000', rstuSelf: '', rstuFamily: '', courseFees: '', nsmanStatus: 'keyActive',
  childCount: '0', parentLivingWith: '', parentNotLivingWith: '', otherReliefs: '',
}

test('a TaxWise share link carries only short, whitelisted input params', () => {
  const url = new URL(buildShareUrl('tax', FORM, ORIGIN))
  assert.equal(url.origin + url.pathname, `${ORIGIN}/tax`)
  assert.deepEqual([...url.searchParams.keys()].sort(), ['a', 'b', 'ns', 's', SHARE_FLAG, 'srs'].sort())
  assert.equal(url.searchParams.get('ns'), 'keyActive')
})

test('round trip: parseShare restores the form values', () => {
  const url = new URL(buildShareUrl('tax', FORM, ORIGIN))
  const back = parseShare('tax', url.searchParams)
  assert.deepEqual(back, { age: '34', monthlySalary: '8000', annualBonus: '16000', srsContribution: '5000', nsmanStatus: 'keyActive' })
})

test('nothing from the profile store can ride along', () => {
  const polluted = { ...FORM, savedAt: 123, inputs: { x: 1 }, version: 7, name: 'Me', insureHistory: [1], profileId: 'p1' }
  const url = buildShareUrl('tax', polluted, ORIGIN)
  for (const bad of ['savedAt', 'inputs', 'version', 'name', 'insureHistory', 'profile', 'p1', 'Me']) {
    assert.ok(!url.includes(bad), `${bad} leaked into ${url}`)
  }
})

test('crafted links can only inject numbers and known enum values', () => {
  const p = new URLSearchParams({ shared: '1', s: '<script>alert(1)</script>9000', r: 'martian', ns: 'keyActive', a: '-5', b: '1e99', o: '12,500', cf: '99999999999', zz: 'evil' })
  const back = parseShare('tax', p)
  assert.deepEqual(back, { nsmanStatus: 'keyActive', otherIncome: '12500' })
})

test('only links flagged as shares are read', () => {
  assert.equal(parseShare('tax', new URLSearchParams('s=9000')), null)
  assert.equal(parseShare('nope', new URLSearchParams('shared=1')), null)
  assert.equal(buildShareUrl('nope', FORM, ORIGIN), null)
})

test('the NSman enum follows the tax engine', () => {
  assert.deepEqual(SHARE_FIELDS.tax.ns.values, Object.keys(NSMAN_RELIEF))
})
