// src/lib/shared/structuredData.js
// schema.org JSON-LD for search engines (super-app plan U12), built from
// the tool registry so names, routes and descriptions never drift. Pure
// data; rendered by components/shared/JsonLd.js.
//
// Only facts the site actually states are described: each tool is a free
// web application, and each the-math page is a methodology article for
// it. No FAQ or review markup, since the site has neither.

import { SITE_URL } from './site.js'
import { getTool } from './tools.js'

const SITE_NAME = 'nat does the math'

export function breadcrumbLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem', position: i + 1, name: it.name, item: `${SITE_URL}${it.path}`,
    })),
  }
}

/** WebApplication for a tool's landing page. */
export function toolAppLd(toolId) {
  const t = getTool(toolId)
  if (!t) return null
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: t.name,
      url: `${SITE_URL}${t.route}`,
      description: t.desc,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'SGD' },
      publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    },
    breadcrumbLd([{ name: 'Home', path: '/' }, { name: t.name, path: t.route }]),
  ]
}

/** TechArticle for a tool's the-math (methodology) page. */
export function mathArticleLd(toolId) {
  const t = getTool(toolId)
  if (!t) return null
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: `How ${t.name} works: the math`,
      url: `${SITE_URL}${t.mathRoute}`,
      about: { '@type': 'WebApplication', name: t.name, url: `${SITE_URL}${t.route}` },
      inLanguage: 'en-SG',
      isAccessibleForFree: true,
      publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    },
    breadcrumbLd([
      { name: 'Home', path: '/' },
      { name: t.name, path: t.route },
      { name: 'The math', path: t.mathRoute },
    ]),
  ]
}

/** Serialise for a <script> tag; escapes '<' so content cannot close it. */
export function serialiseLd(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
