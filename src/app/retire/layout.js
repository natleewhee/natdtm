import ProfileScope from '@/components/shared/ProfileScope'
export const metadata = {
  title: { default: 'RetireWell', template: '%s · RetireWell · nat does the math' },
  description: 'Singapore retirement readiness calculator. Projects your CPF contributions and money-market investments, then checks them against a safe-withdrawal-rate target and a year-by-year depletion simulation.',
  keywords: ['Singapore retirement calculator', 'CPF projection calculator', 'safe withdrawal rate Singapore', 'FIRE calculator Singapore', 'CPF LIFE payout'],
  openGraph: {
    title: 'RetireWell — Singapore Retirement Readiness Calculator',
    description: 'Will you actually have enough? CPF projected properly, your investments stress-tested — not a rule of thumb.',
    siteName: 'RetireWell',
  },
}

export default function RetireLayout({ children }) {
  return <ProfileScope>{children}</ProfileScope>
}
