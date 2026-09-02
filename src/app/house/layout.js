import ProfileScope from '@/components/shared/ProfileScope'
export const metadata = {
  title: { default: 'HouseMuch', template: '%s · HouseMuch · nat does the math' },
  description: 'Singapore house sale/purchase profit-loss calculator. See your true return after CPF refund, mortgage interest, and stamp duties — not just sale price minus purchase price.',
  keywords: ['Singapore property profit calculator', 'CPF accrued interest', 'HDB resale profit', 'Seller Stamp Duty calculator', 'BSD calculator Singapore'],
  openGraph: {
    title: 'HouseMuch — True House Profit/Loss Calculator',
    description: 'What did your house really make you? CPF refund, mortgage interest, and stamp duties accounted for — not just sale price minus purchase price.',
    siteName: 'HouseMuch',
  },
}

export default function HouseLayout({ children }) {
  return <ProfileScope>{children}</ProfileScope>
}
