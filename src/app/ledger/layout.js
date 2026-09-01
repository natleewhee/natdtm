import ProfileScope from '@/components/shared/ProfileScope'
export const metadata = {
  title: { default: 'MyLedger', template: '%s · MyLedger · nat does the math' },
  description: 'Your whole Singapore financial picture in one place — net worth, total debt servicing ratio across every loan, and what a car or a house upgrade would do to your retirement. Compare up to three scenarios side by side.',
  keywords: ['Singapore net worth calculator', 'TDSR calculator Singapore', 'financial scenario planner', 'house upgrade calculator Singapore', 'personal balance sheet Singapore'],
  openGraph: {
    title: 'MyLedger — Net Worth, TDSR and Retirement Together',
    description: 'One picture for your mortgage, car, and CPF — plus what a big decision does to all three at once.',
    siteName: 'MyLedger',
  },
}

export default function LedgerLayout({ children }) {
  return <ProfileScope>{children}</ProfileScope>
}
