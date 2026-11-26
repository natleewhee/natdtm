import JsonLd from '@/components/shared/JsonLd'
import { mathArticleLd } from '@/lib/shared/structuredData'

export const metadata = {
  title: 'The Math · HouseMuch · nat does the math',
  description: 'How HouseMuch calculates true house profit/loss: mortgage amortization, CPF accrued interest, BSD, SSD, and the buying-next funds gap.',
}

export default function TheMathLayout({ children }) {
  return (
    <>
      <JsonLd data={mathArticleLd('house')} />
      {children}
    </>
  )
}
