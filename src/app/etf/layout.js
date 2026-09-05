import './etf.css'
import SWRegister from '@/components/etf/SWRegister'
import ProfileScope from '@/components/shared/ProfileScope'

export const metadata = {
  title: { default: 'WhatETF', template: '%s · WhatETF · nat does the math' },
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
  themeColor: '#17120f',
}

export default function EtfLayout({ children }) {
  return (
    <ProfileScope>
      <div className="v-etf">
        {children}
        <SWRegister />
      </div>
    </ProfileScope>
  )
}
