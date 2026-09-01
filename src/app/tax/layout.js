import ProfileScope from '@/components/shared/ProfileScope'
export const metadata = {
  title: { default: 'TaxWise', template: '%s · TaxWise · nat does the math' },
  description: 'Singapore income tax calculator and relief optimizer. Works out what you owe IRAS, your marginal versus effective rate, and exactly what SRS contributions and CPF top-ups would save you in dollars.',
  keywords: ['Singapore income tax calculator', 'SRS tax relief calculator', 'CPF top-up tax relief', 'IRAS tax calculator', 'Singapore tax reliefs'],
  openGraph: {
    title: 'TaxWise — Singapore Income Tax & Relief Calculator',
    description: 'What do you actually owe IRAS? And what every relief is really worth — in dollars saved, not percentages.',
    siteName: 'TaxWise',
  },
}

export default function TaxLayout({ children }) {
  return <ProfileScope>{children}</ProfileScope>
}
