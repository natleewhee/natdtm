import './legacy.css'

export const metadata = {
  title: { default: 'DriveReady', template: '%s · DriveReady · nat does the math' },
  description: 'Singapore car affordability calculator. Know your true monthly cost before you commit.',
  keywords: ['Singapore car loan', 'car affordability', 'COE calculator', 'car depreciation Singapore'],
  openGraph: {
    title: 'DriveReady — Car Affordability Calculator',
    description: 'Know exactly what a car will cost you every month. 100+ SG models, true depreciation, green loan rates.',
    siteName: 'DriveReady',
  },
}

export default function DriveLayout({ children }) {
  return <div className="v-drive">{children}</div>
}
