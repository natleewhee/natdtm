// src/lib/drive/endpoints.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { COE_ENDPOINT, CARS_ENDPOINT } from './endpoints.js'

// These routes live at src/app/drive/api/**, so their URLs are /drive/api/*.
// They were previously fetched as '/api/coe' and '/api/cars', which 404'd —
// and since a Next 404 returns HTML, the r.json() in each caller threw
// straight into a bare .catch(), so live LTA data silently never loaded and
// the calculator used its fallback constants forever.
test('endpoints are under /drive/api, matching the App Router route paths', () => {
  assert.equal(COE_ENDPOINT, '/drive/api/coe')
  assert.equal(CARS_ENDPOINT, '/drive/api/cars')
})

test('no caller hardcodes the old top-level /api/* paths', () => {
  const offenders = []

  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) { walk(full); continue }
      if (!/\.jsx?$/.test(entry.name)) continue
      const src = readFileSync(full, 'utf8')
      // Only flag an actual fetch of the bare path, so prose in comments
      // describing the old bug doesn't trip the guard.
      if (/fetch\(\s*['"`]\/api\/(coe|cars)\b/.test(src)) offenders.push(full)
    }
  }
  walk(join(process.cwd(), 'src'))

  assert.deepEqual(offenders, [], `these files fetch the non-existent /api/* path: ${offenders.join(', ')}`)
})
