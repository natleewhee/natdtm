import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { TOOLS, TOOL_COUNT, toolCountWord, getTool, getToolByPath, sitemapRoutes } from './tools.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..')

test('registry: ids, routes and math routes are unique and well-formed', () => {
  const ids = TOOLS.map((t) => t.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.equal(new Set(TOOLS.map((t) => t.route)).size, TOOLS.length)
  for (const t of TOOLS) {
    assert.equal(t.route, `/${t.id}`, `${t.id} route`)
    assert.equal(t.mathRoute, `${t.route}/the-math`, `${t.id} mathRoute`)
    for (const k of ['name', 'label', 'eyebrow', 'desc', 'disclaimer']) {
      assert.ok(typeof t[k] === 'string' && t[k].length > 0, `${t.id}.${k}`)
    }
    assert.ok(t.disclaimer.startsWith(t.name), `${t.id} disclaimer names its tool`)
  }
})

test('registry: every landing and the-math route has a page on disk', () => {
  for (const t of TOOLS) {
    for (const route of [t.route, t.mathRoute, ...t.sitemap.map((s) => s.path)]) {
      assert.ok(existsSync(join(ROOT, 'src/app', route, 'page.js')), `missing page for ${route}`)
    }
  }
})

test('toolCountWord follows the registry', () => {
  assert.equal(TOOL_COUNT, 7)
  assert.equal(toolCountWord(), 'Seven')
  assert.equal(toolCountWord(12), '12')
})

test('getToolByPath matches a tool route tree and nothing else', () => {
  assert.equal(getToolByPath('/drive').id, 'drive')
  assert.equal(getToolByPath('/drive/renew-or-replace/the-math').id, 'drive')
  assert.equal(getToolByPath('/etf/portfolio').id, 'etf')
  assert.equal(getToolByPath('/'), null)
  assert.equal(getToolByPath('/lab/world'), null)
  assert.equal(getToolByPath('/drivex'), null)
  assert.equal(getToolByPath(undefined), null)
  assert.equal(getTool('tax').name, 'TaxWise')
  assert.equal(getTool('flow'), null)
})

test('sitemapRoutes covers home, every tool page and every extra route, once each', () => {
  const paths = sitemapRoutes().map((r) => r.path)
  assert.equal(paths[0], '/')
  assert.equal(new Set(paths).size, paths.length)
  for (const t of TOOLS) {
    assert.ok(paths.includes(t.route))
    assert.ok(paths.includes(t.mathRoute))
  }
  assert.equal(paths.length, 1 + TOOLS.length * 2 + TOOLS.reduce((n, t) => n + t.sitemap.length, 0))
})

test('no shell file hard-codes the tool list', () => {
  // These files must read the registry. A literal like "'/drive'" or
  // 'href="/tax/the-math"' in any of them means a second tool list has
  // crept back in.
  const SHELL = [
    'src/app/page.js',
    'src/app/sitemap.js',
    'src/components/shared/ShellHeader.js',
    'src/components/shared/Footer.js',
    'src/components/shared/TabBar.js',
    'src/app/manifest.js',
    'src/app/sw.js/route.js',
  ]
  const literal = new RegExp(`["'\`]/(${TOOLS.map((t) => t.id).join('|')})(/the-math)?["'\`]`)
  for (const f of SHELL) {
    const src = readFileSync(join(ROOT, f), 'utf8')
    assert.ok(!literal.test(src), `${f} hard-codes a tool route: ${src.match(literal)?.[0]}`)
  }
})
