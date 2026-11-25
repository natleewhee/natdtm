import { renderOgCard, tagline, OG_SIZE } from '@/components/shared/OgCard'
import { getTool } from '@/lib/shared/tools'

export const size = OG_SIZE
export const contentType = 'image/png'
export const alt = `${getTool('tax').name}: nat does the math`

export default function Image() {
  const t = getTool('tax')
  return renderOgCard({ title: t.name, line: tagline(t.desc) })
}
