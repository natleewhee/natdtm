import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toolAppLd, mathArticleLd, breadcrumbLd, serialiseLd } from './structuredData.js'
import { TOOLS } from './tools.js'
import { SITE_URL } from './site.js'

test('every tool gets a WebApplication + breadcrumb, from the registry', () => {
  for (const t of TOOLS) {
    const [app, crumbs] = toolAppLd(t.id)
    assert.equal(app['@type'], 'WebApplication')
    assert.equal(app.name, t.name)
    assert.equal(app.url, `${SITE_URL}${t.route}`)
    assert.equal(app.offers.price, '0')
    assert.equal(crumbs.itemListElement.at(-1).item, `${SITE_URL}${t.route}`)
  }
})

test('every the-math page is a TechArticle about its tool, three crumbs deep', () => {
  for (const t of TOOLS) {
    const [article, crumbs] = mathArticleLd(t.id)
    assert.equal(article['@type'], 'TechArticle')
    assert.equal(article.url, `${SITE_URL}${t.mathRoute}`)
    assert.equal(article.about.name, t.name)
    assert.deepEqual(crumbs.itemListElement.map((i) => i.position), [1, 2, 3])
  }
})

test('unknown tools give nothing; no FAQ or review markup is ever emitted', () => {
  assert.equal(toolAppLd('flow'), null)
  const all = JSON.stringify(TOOLS.flatMap((t) => [toolAppLd(t.id), mathArticleLd(t.id)]))
  assert.ok(!/FAQPage|Review|AggregateRating/.test(all))
})

test('serialised JSON-LD cannot close its script tag', () => {
  const s = serialiseLd({ name: '</script><script>alert(1)</script>' })
  assert.ok(!s.includes('</script>'))
  assert.deepEqual(JSON.parse(s), { name: '</script><script>alert(1)</script>' })
  assert.equal(breadcrumbLd([{ name: 'Home', path: '/' }]).itemListElement[0].item, `${SITE_URL}/`)
})
