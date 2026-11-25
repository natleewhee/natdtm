import JsonLd from '@/components/shared/JsonLd'
import { mathArticleLd } from '@/lib/shared/structuredData'

export const metadata = {
  title: 'The Math — DriveReady — nat does the math',
  description: 'How DriveReady calculates your car affordability, loan costs, PARF, COE rebates, and true depreciation.',
}

export default function TheMathLayout({ children }) {
  return (
    <>
      <JsonLd data={mathArticleLd('drive')} />
      {children}
    </>
  )
}
