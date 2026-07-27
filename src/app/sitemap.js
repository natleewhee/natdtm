import { SITE_URL } from '@/lib/shared/site'

const ROUTES = [
  { path: '/', priority: 1 },
  { path: '/insure', priority: 0.9 },
  { path: '/insure/check', priority: 0.9 },
  { path: '/insure/the-math', priority: 0.8 },
  { path: '/drive', priority: 0.9 },
  { path: '/drive/coe-explained', priority: 0.7 },
  { path: '/drive/renew-or-replace', priority: 0.7 },
  { path: '/drive/the-math', priority: 0.8 },
  { path: '/etf', priority: 0.9 },
  { path: '/etf/preferences', priority: 0.9 },
  { path: '/etf/compare', priority: 0.6 },
  { path: '/etf/portfolio', priority: 0.6 },
  { path: '/etf/rebalance', priority: 0.6 },
  { path: '/etf/learn', priority: 0.7 },
  { path: '/etf/the-math', priority: 0.8 },
  { path: '/house', priority: 0.9 },
  { path: '/house/the-math', priority: 0.8 },
  { path: '/retire', priority: 0.9 },
  { path: '/retire/the-math', priority: 0.8 },
  { path: '/ledger', priority: 0.9 },
  { path: '/ledger/the-math', priority: 0.8 },
  { path: '/tax', priority: 0.9 },
  { path: '/tax/the-math', priority: 0.8 },
]

export default function sitemap() {
  const lastModified = new Date()
  return ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified,
    changeFrequency: 'monthly',
    priority: r.priority,
  }))
}
