import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  encodeTransfer, decodeTransfer, compactStore, buildTransferLink, describeTransfer,
  needsBackup, QR_MAX_URL_CHARS, BACKUP_NUDGE_DAYS,
} from './transfer.ts'

const store = (n = 1, fat = 0) => JSON.stringify({
  schemaVersion: 1, activeProfileId: 'p1',
  profiles: Array.from({ length: n }, (_, i) => ({
    id: `p${i + 1}`, name: i ? `Profile ${i + 1}` : 'Me', createdAt: 1, updatedAt: 2,
    data: {
      version: 7,
      tax: { monthlyTakeHome: 7600, annualTax: 6200, marginalRate: 11.5, age: 34, savedAt: 1, inputs: { monthlySalary: '9000', note: 'x'.repeat(fat) } },
      retire: { salary: 9000, oaBalance: 90000, saBalance: 60000, maBalance: 40000, savedAt: 1 },
      insureHistory: [{ score: 70, date: '2026-01-01' }],
    },
  })),
}, null, 2)

test('round trip: encode → decode gives back the same store', async () => {
  const json = compactStore(store(3))
  const frag = await encodeTransfer(json)
  assert.match(frag, /^v1\.[A-Za-z0-9_-]+$/)
  assert.equal(await decodeTransfer(`#${frag}`), json)
})

test('compression keeps a realistic three-profile store QR-sized', async () => {
  const { url, activeOnly, qrOk } = await buildTransferLink(store(3), 'https://natdtm.vercel.app')
  assert.equal(activeOnly, false)
  assert.equal(qrOk, true)
  assert.ok(url.length < QR_MAX_URL_CHARS, `url is ${url.length} chars`)
  assert.ok(url.startsWith('https://natdtm.vercel.app/import#v1.'))
})

test('too big for a QR code with every profile → falls back to the active one', async () => {
  // Random text does not compress, so it forces the size past the limit.
  const noisy = JSON.parse(store(3))
  for (const p of noisy.profiles) p.data.tax.inputs.note = Array.from({ length: 900 }, () => Math.random().toString(36)[2]).join('')
  const { url, activeOnly } = await buildTransferLink(JSON.stringify(noisy), 'https://x.test')
  assert.equal(activeOnly, true)
  const back = JSON.parse(await decodeTransfer(url.split('#')[1]))
  assert.equal(back.profiles.length, 1)
  assert.equal(back.profiles[0].id, 'p1')
})

test('damaged, foreign or newer links are rejected with a readable message', async () => {
  const frag = await encodeTransfer(compactStore(store(1)))
  await assert.rejects(decodeTransfer(frag.slice(0, -12)), /damaged or incomplete/)
  await assert.rejects(decodeTransfer('#hello'), /not a natdtm transfer link/)
  await assert.rejects(decodeTransfer('#v2.abc'), /newer version/)
  await assert.rejects(decodeTransfer(''), /not a natdtm transfer link/)
})

test('compactStore activeOnly keeps just the active profile', () => {
  const s = JSON.parse(compactStore(store(3), { activeOnly: true }))
  assert.equal(s.profiles.length, 1)
  assert.equal(s.activeProfileId, 'p1')
})

test('describeTransfer lists profiles and the tools that hold numbers', () => {
  assert.deepEqual(describeTransfer(store(2)), [
    { name: 'Me', tools: ['retire', 'tax'] },
    { name: 'Profile 2', tools: ['retire', 'tax'] },
  ])
})

test('backup nudge: only with data, and only when no backup in the window', () => {
  const now = Date.UTC(2026, 10, 25), DAY = 86_400_000
  assert.equal(needsBackup(false, now, null), false)
  assert.equal(needsBackup(true, now, null), true)
  assert.equal(needsBackup(true, now, now - 5 * DAY), false)
  assert.equal(needsBackup(true, now, now - (BACKUP_NUDGE_DAYS + 1) * DAY), true)
})
