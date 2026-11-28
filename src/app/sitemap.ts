import { SITE_URL } from '@/lib/shared/site'
import { sitemapRoutes } from '@/lib/shared/tools'

export default function sitemap() {
  const lastModified = new Date()
  return sitemapRoutes().map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified,
    changeFrequency: 'monthly',
    priority: r.priority,
  }))
}
