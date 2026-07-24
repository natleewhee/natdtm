import './globals.css'
import Footer from '@/components/shared/Footer'

export const metadata = {
  metadataBase: new URL('https://coah.vercel.app'),
  title: { default: 'Nat Does The Math — Singapore financial decision calculators', template: '%s · Nat Does The Math' },
  description: 'Free calculators for the big Singapore financial decisions — insurance adequacy, car affordability, ETF investing. Every number is shown, not just the verdict.',
  openGraph: {
    siteName: 'Nat Does The Math',
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
