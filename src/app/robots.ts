import { SITE_URL } from '@/lib/shared/site'

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /insure/results and /insure/loading carry a user's just-computed
        // score in the URL/rendered output — kept out of the index, same as
        // the source app did.
        disallow: ['/insure/results', '/insure/loading'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
