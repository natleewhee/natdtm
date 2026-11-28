import { renderOgCard, tagline, OG_SIZE } from '@/components/shared/OgCard'
import { getTool } from '@/lib/shared/tools'

export const size = OG_SIZE
export const contentType = 'image/png'
export const alt = `${getTool('etf')!.name}: nat does the math`

export default function Image() {
  const t = getTool('etf')
  return renderOgCard({ title: t!.name, line: tagline(t!.desc) })
}
