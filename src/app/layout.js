import './globals.css'
import Footer from '@/components/shared/Footer'

export const metadata = {
  metadataBase: new URL('https://coah.vercel.app'),
  title: { default: 'nat does the math — Singapore financial decision calculators', template: '%s · nat does the math' },
  description: 'Free calculators for the big Singapore financial decisions — insurance adequacy, car affordability, ETF investing. Every number is shown, not just the verdict.',
  openGraph: {
    siteName: 'nat does the math',
    locale: 'en_SG',
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light">
      <body>
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
