import ProfileScope from '@/components/shared/ProfileScope'
export const metadata = {
  title: { default: 'FlowState', template: '%s · FlowState · nat does the math' },
  description: 'Singapore cashflow calculator. Splits your salary into CPF versus cash automatically, splits the mortgage into what CPF pays versus what leaves your bank, and finds the one month a year your account runs dry.',
  keywords: ['Singapore cashflow calculator', 'CPF cash split', 'take-home pay Singapore', 'monthly budget Singapore', 'savings rate calculator'],
  openGraph: {
    title: 'FlowState — Singapore Cashflow & Take-Home Calculator',
    description: 'Where your salary actually goes: CPF split from cash, mortgage split into CPF vs bank, and the month your account runs dry.',
    siteName: 'FlowState',
  },
}

export default function FlowLayout({ children }) {
  return <ProfileScope>{children}</ProfileScope>
}
