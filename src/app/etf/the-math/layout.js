import JsonLd from '@/components/shared/JsonLd'
import { mathArticleLd } from '@/lib/shared/structuredData'

export const metadata = {
  title: 'The Math — WhatETF — nat does the math',
  description: 'How WhatETF generates illustrative ETF allocations. UCITS rationale, withholding tax comparison, and allocation logic explained.',
}

export default function TheMathLayout({ children }) {
  return (
    <>
      <JsonLd data={mathArticleLd('etf')} />
      {children}
    </>
  )
}
