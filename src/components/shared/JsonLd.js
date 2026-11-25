import { serialiseLd } from '@/lib/shared/structuredData'

// Server component: one schema.org JSON-LD block. `data` may be an
// object or an array of objects (rendered as one array, which search
// engines accept).
export default function JsonLd({ data }) {
  if (!data) return null
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialiseLd(data) }} />
}
