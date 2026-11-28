import JsonLd from '@/components/shared/JsonLd'
import { mathArticleLd } from '@/lib/shared/structuredData'

export const metadata = {
  title: 'How we calculate your score',
  description: 'InsureCheck benchmarks your insurance coverage against CFP needs-analysis principles and Singapore financial planning guidelines. Here\'s exactly how.',
}

export default function HowItWorksLayout({ children }: { children?: any; }) {
  return (
    <>
      <JsonLd data={mathArticleLd('insure')} />
      {children}
    </>
  )
}
