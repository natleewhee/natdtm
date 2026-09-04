import './globals.css'
import Footer from '@/components/shared/Footer'
import ThemeBoot from '@/components/shared/ThemeBoot'

export const metadata = {
  metadataBase: new URL('https://natdtm.vercel.app'),
  title: { default: 'nat does the math — Singapore financial decision calculators', template: '%s · nat does the math' },
  description: 'Free calculators for the big Singapore financial decisions — insurance adequacy, car affordability, ETF investing, house profit/loss. Every number is shown, not just the verdict.',
  openGraph: {
    siteName: 'nat does the math',
    locale: 'en_SG',
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <ThemeBoot>
          <main>{children}</main>
          <Footer />
        </ThemeBoot>
      </body>
    </html>
  )
}
