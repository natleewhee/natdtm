import JsonLd from '@/components/shared/JsonLd'
import { mathArticleLd } from '@/lib/shared/structuredData'

export const metadata = {
  title: 'The Math',
  description: 'How MyLedger works: every formula, rate and assumption behind the numbers.',
}

export default function TheMathLayout({ children }) {
  return (
    <>
      <JsonLd data={mathArticleLd('ledger')} />
      {children}
    </>
  )
}
