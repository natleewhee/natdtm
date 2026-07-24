import './legacy.css'
import SWRegister from '@/components/etf/SWRegister'

export const metadata = {
  title: { default: 'WhatETF', template: '%s · WhatETF · Nat Does The Math' },
  description: 'Build your ETF portfolio with confidence. Illustrative allocations for Singapore-based investors. UCITS, tax-efficient, DCA-ready.',
  keywords: ['ETF Singapore', 'UCITS ETF', 'VWRA', 'DCA Singapore', 'portfolio allocation'],
  openGraph: {
    title: 'WhatETF — ETF Portfolio Builder for Singaporeans',
    description: 'Explore illustrative ETF allocations optimized for Singapore investors. Tax-efficient UCITS ETFs, DCA-ready.',
    siteName: 'WhatETF',
  },
  manifest: '/etf/manifest.webmanifest',
}

export const viewport = {
  themeColor: '#0b1120',
}

export default function EtfLayout({ children }) {
  return (
    <div className="v-etf">
      {children}
      <SWRegister />
    </div>
  )
}
