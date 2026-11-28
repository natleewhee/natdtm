import { renderOgCard, OG_SIZE } from '@/components/shared/OgCard'
import { toolCountWord } from '@/lib/shared/tools'

export const size = OG_SIZE
export const contentType = 'image/png'
export const alt = 'nat does the math: Singapore money decisions, with the working shown'

export default function Image() {
  return renderOgCard({
    title: 'nat does the math',
    line: `${toolCountWord()} calculators for the big Singapore money decisions, with every number shown.`,
  })
}
